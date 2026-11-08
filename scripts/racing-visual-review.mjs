// Isolated browser review: in-memory accounts, no provider requests or real charges.
import http from "node:http";
import { mkdir } from "node:fs/promises";
import { chromium, webkit, expect } from "@playwright/test";
import { createGameService } from "../apps/server/index.mjs";
import { createSiteHandler } from "../apps/server/site.mjs";
import { memoryStore } from "../apps/server/test-store.mjs";
const store = memoryStore();
const server = http.createServer(
  createSiteHandler(createGameService({ store, secure: false }).handler),
);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const engine = process.env.REVIEW_ENGINE || "webkit";
const phone = process.env.REVIEW_PROFILE === "phone";
const browser = await (engine === "chromium" ? chromium : webkit).launch({
  headless: true,
  ...(engine === "chromium"
    ? {
        args: [
          "--no-sandbox",
          "--enable-unsafe-swiftshader",
          "--use-angle=swiftshader",
        ],
      }
    : {}),
});
try {
  const context = await browser.newContext({
    viewport: phone
      ? { width: 390, height: 844 }
      : { width: 1298, height: 760 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const r = await context.request.post(base + "/api/auth/register", {
    data: {
      name: "VisualReviewer",
      email: "review@example.test",
      password: "review-password-123",
    },
  });
  if (!r.ok()) throw new Error("Fixture registration failed");
  await page.goto(base);
  await page.getByRole("button", { name: "Open Street Kings" }).click();
  await expect(page.locator(".race-page")).toBeVisible({ timeout: 120000 });
  await expect(page.locator(".race-loading")).toBeHidden({ timeout: 120000 });
  await expect(page.getByRole("button", { name: "Drive circuit" })).toBeEnabled(
    { timeout: 120000 },
  );
  await mkdir("/tmp/naija-visual-review", { recursive: true });
  await page.screenshot({
    path: `/tmp/naija-visual-review/kart-${phone ? "mobile" : "desktop"}.png`,
    timeout: 120000,
  });
  await page.getByRole("button", { name: "Drive circuit" }).click();
  await expect(page.locator(".race-driving")).toBeVisible({ timeout: 120000 });
  expect(errors).toEqual([]);
  console.log(
    "PASS: loaded refined kart and environment, profile screenshot, no page errors",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
