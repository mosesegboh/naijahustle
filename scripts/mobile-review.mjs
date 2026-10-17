// Run after npm run build, using Node 22 --experimental-strip-types.
// Uses disposable in-memory accounts; never touches the configured MongoDB.
import http from "node:http";
import { mkdir } from "node:fs/promises";
import { chromium, webkit, expect } from "@playwright/test";
import { createGameService } from "../apps/server/index.mjs";
import { createSiteHandler } from "../apps/server/site.mjs";
import { memoryStore } from "../apps/server/test-store.mjs";
const engine = process.env.REVIEW_ENGINE || "chromium";
const server = http.createServer(
  createSiteHandler(
    createGameService({ store: memoryStore(), secure: false }).handler,
  ),
);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser =
  engine === "webkit"
    ? await webkit.launch({ headless: true })
    : process.env.REVIEW_LOCAL_BROWSER === "1"
      ? await chromium.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-gpu",
            "--use-gl=angle",
            "--enable-unsafe-swiftshader",
            "--use-angle=swiftshader",
          ],
        })
      : await chromium.connectOverCDP(
          process.env.CHROME_CDP || "http://127.0.0.1:9224",
        );
const output = process.env.REVIEW_OUTPUT || "/tmp/naija-mobile-review";
await mkdir(output, { recursive: true });
try {
  for (const profile of [
    { name: "iphone", width: 390, height: 844 },
    { name: "android", width: 412, height: 915 },
  ].filter(
    (profile) =>
      !process.env.REVIEW_PROFILE ||
      profile.name === process.env.REVIEW_PROFILE,
  )) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 1,
    });
    if (process.env.REVIEW_PAUSE_RACE === "1") {
      await context.addInitScript(() => {
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (callback) =>
          raf(function tick(time) {
            if (document.querySelector(".race-page")) raf(tick);
            else callback(time);
          });
      });
    }
    try {
      const response = await context.request.post(base + "/api/auth/register", {
        data: {
          name: engine + profile.name,
          email: engine + profile.name + "@example.test",
          password: "ReviewPassword123!",
        },
      });
      if (!response.ok()) throw new Error(await response.text());
      context.setDefaultTimeout(60000);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await page.getByRole("button", { name: "Open Festival Rush" }).click();
      await page.getByRole("button", { name: "Try solo practice" }).click();
      await expect(page.locator(".festival-countdown")).toBeHidden({
        timeout: 30000,
      });
      // Native touch tap plus held keyboard input exercises the same merged input.
      await page.keyboard.down("d");
      await page.getByRole("button", { name: "JUMP" }).tap();
      await page.waitForTimeout(350);
      await page.keyboard.up("d");
      await expect(
        page.locator(".festival-progress progress"),
      ).not.toHaveAttribute("value", "80");
      for (const landscape of [false, true]) {
        if (landscape)
          await page.setViewportSize({
            width: profile.height,
            height: profile.width,
          });
        await page.waitForTimeout(150);
        for (const name of ["Move left", "Move right", "JUMP"]) {
          const button = page.getByRole("button", {
            name,
            exact: name !== "JUMP",
          });
          const r = await button.boundingBox();
          const viewport = page.viewportSize();
          if (
            !r ||
            r.x < 0 ||
            r.y < 0 ||
            r.x + r.width > viewport.width + 1 ||
            r.y + r.height > viewport.height + 1
          )
            throw new Error("Offscreen " + name);
          if (
            !(await button.evaluate((el) => {
              const r = el.getBoundingClientRect();
              return el.contains(
                document.elementFromPoint(
                  r.x + r.width / 2,
                  r.y + r.height / 2,
                ),
              );
            }))
          )
            throw new Error("Covered " + name);
        }
        await page.screenshot({
          path: `${output}/${engine}-${profile.name}-festival-${landscape ? "landscape" : "portrait"}.png`,
        });
      }
      await page.getByRole("button", { name: "Leave run" }).click();
      await page
        .getByRole("button", { name: "Dashboard", exact: false })
        .click();
      if (
        engine === "chromium" ||
        (await page.evaluate(
          () => !!document.createElement("canvas").getContext("webgl2"),
        ))
      ) {
        await page.setViewportSize({
          width: profile.width,
          height: profile.height,
        });
        await page.getByRole("button", { name: "Open Street Kings" }).click();
        await expect(page.locator(".race-page")).toBeVisible({
          timeout: 60000,
        });
        await expect(page.locator(".race-loading")).toBeHidden({
          timeout: 120000,
        });
        await page
          .getByRole("button", { name: "Take a test drive" })
          .click({ timeout: 120000 });
        const drive = page.getByRole("button", { name: "Drive", exact: true });
        await drive.tap();
        await expect(drive).toHaveAttribute("aria-pressed", "true");
        if (process.env.REVIEW_PAUSE_RACE !== "1")
          await expect
            .poll(
              async () =>
                parseInt(await page.locator(".race-map span").innerText()),
              { timeout: 45000 },
            )
            .toBeGreaterThan(1);
        await page.getByRole("button", { name: "BRAKE", exact: false }).tap();
        await expect(drive).toHaveAttribute("aria-pressed", "false");
        for (const landscape of [false, true]) {
          if (landscape)
            await page.setViewportSize({
              width: profile.height,
              height: profile.width,
            });
          await page.waitForTimeout(500);
          for (const b of await page.locator(".race-gamepad button").all()) {
            const r = await b.boundingBox(),
              v = page.viewportSize();
            if (
              !r ||
              r.x < 0 ||
              r.y < 0 ||
              r.x + r.width > v.width + 1 ||
              r.y + r.height > v.height + 1
            )
              throw new Error("Racing control offscreen");
            if (
              !(await b.evaluate((el) => {
                const r = el.getBoundingClientRect();
                return el.contains(
                  document.elementFromPoint(
                    r.x + r.width / 2,
                    r.y + r.height / 2,
                  ),
                );
              }))
            )
              throw new Error("Racing control covered");
          }
          await page.screenshot({
            path: `${output}/${engine}-${profile.name}-racing-${landscape ? "landscape" : "portrait"}.png`,
          });
        }
      }
      if (errors.length) throw new Error(errors.join(";"));
      console.log(
        "PASS",
        engine,
        profile.name,
        "portrait/landscape, input, visible unobstructed controls, no page errors",
        process.env.REVIEW_PAUSE_RACE === "1"
          ? "Racer GPU paused: input/layout check only"
          : "",
      );
    } catch (e) {
      for (const page of context.pages()) {
        console.log((await page.locator("body").innerText()).slice(-2500));
        await page
          .screenshot({
            path: `${output}/${engine}-${profile.name}-failure.png`,
          })
          .catch(() => {});
      }
      throw e;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
