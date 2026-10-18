// Isolated browser review: in-memory accounts, no provider requests or real charges.
import http from "node:http";
import { mkdir } from "node:fs/promises";
import { chromium, webkit, expect } from "@playwright/test";
import { createGameService } from "../apps/server/index.mjs";
import { createSiteHandler } from "../apps/server/site.mjs";
import { memoryStore } from "../apps/server/test-store.mjs";
const server = http.createServer(
  createSiteHandler(
    createGameService({ store: memoryStore(), secure: false }).handler,
  ),
);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const engine = process.env.REVIEW_ENGINE || "webkit";
const browser = await (engine === "chromium" ? chromium : webkit).launch({
  headless: true,
  ...(engine === "chromium" ? { args: ["--no-sandbox"] } : {}),
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const r = await context.request.post(base + "/api/auth/register", {
    data: {
      name: "AdReviewer",
      email: "review@example.test",
      password: "review-password-123",
    },
  });
  const { user } = await r.json();
  process.env.ADMIN_USER_IDS = user.id;
  await page.goto(base);
  await page
    .getByRole("link", { name: "Advertise here. Open the advertising desk." })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your rewards. Your reach." }),
  ).toBeVisible();
  await page.getByLabel("Headline").fill("Eko Coffee Club");
  await page
    .getByLabel("Website", { exact: true })
    .fill("https://coffee.example");
  await page
    .getByLabel("Your message")
    .fill("Meet your neighbourhood coffee makers.");
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(
    page.getByRole("button", { name: "Approve", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("approved · 0 impressions")).toBeVisible();
  await page.getByLabel("Draft naira per coin").fill("0.10");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(
    page.getByText("Settings saved. Cash redemption remains disabled."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cash withdrawals unavailable" }),
  ).toBeDisabled();
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 2,
    )
  )
    throw new Error("Mobile horizontal overflow");
  await mkdir("/tmp/naija-commerce-review", { recursive: true });
  await page.screenshot({
    path: "/tmp/naija-commerce-review/wallet-iphone.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  console.log(
    "PASS " +
      engine +
      " mobile advertising submission, admin review, draft rate, disabled payouts, no overflow or page errors",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
