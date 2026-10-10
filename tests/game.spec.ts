import { expect, test, type Page } from "@playwright/test";
import { OrthographicCamera, Vector3 } from "three";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const url = process.env.TEST_BUILD
  ? pathToFileURL(resolve("apps/web/dist/index.html")).href
  : "/";
async function setup(page: Page) {
  await page.goto(url);
  await page.getByLabel("What should we call you?").fill("Ada");
  await page.getByRole("button", { name: "coral", exact: true }).click();
  await page.getByRole("button", { name: "Enter the neighbourhood" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".render-error")).toHaveCount(0);
}
// Project a ground destination into the default city camera for an actual pointer click.
async function walkTo(page: Page, x: number, z: number) {
  const canvas = await page.locator("canvas").boundingBox();
  if (!canvas) throw new Error("Canvas missing");
  const aspect = canvas.width / canvas.height,
    span = Math.max(36, 44 / aspect);
  const camera = new OrthographicCamera(
    (-span * aspect) / 2,
    (span * aspect) / 2,
    span / 2,
    -span / 2,
    0.1,
    250,
  );
  camera.position.set(52, 36, 52);
  camera.lookAt(24, 0, 18);
  camera.updateMatrixWorld();
  const point = new Vector3(x, 0, z).project(camera);
  await page.mouse.click(
    canvas.x + (point.x * 0.5 + 0.5) * canvas.width,
    canvas.y + (-point.y * 0.5 + 0.5) * canvas.height,
  );
}
test("3D home, city delivery, one-time reward and save", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await expect(page.getByText("Your apartment · Mainland")).toBeVisible();
  await page
    .getByRole("button", { name: "Rotate camera", exact: true })
    .click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("home.png") });
  await page.getByRole("button", { name: "City", exact: true }).click();
  await expect(page.getByText("Balogun quarter")).toBeVisible();
  await walkTo(page, 16.4, 17);
  await expect(
    page.getByRole("button", { name: "Talk to Mama Bisi" }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Talk to Mama Bisi" }).click();
  await expect(page.getByRole("status")).toContainText("take this parcel");
  if (testInfo.project.name === "mobile") {
    const box = await page
      .getByRole("button", { name: "Move down", exact: true })
      .boundingBox();
    if (!box) throw new Error("Missing touch control");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(500);
    await page.mouse.up();
  } else {
    await page.keyboard.down("s");
    await page.waitForTimeout(500);
    await page.keyboard.up("s");
  }
  await expect(
    page.getByRole("button", { name: "Talk to Mama Bisi" }),
  ).toHaveCount(0);
  await walkTo(page, 32.2, 18);
  await page.waitForTimeout(3300);
  await walkTo(page, 32.2, 21);
  await expect(page.getByRole("button", { name: "Talk to Tunde" })).toBeVisible(
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: "Talk to Tunde" }).click();
  await expect(page.locator(".wallet")).toContainText("₦6,500");
  await page.getByRole("button", { name: "Talk to Tunde" }).click();
  await expect(page.locator(".wallet")).toContainText("₦6,500");
  await page.screenshot({ path: testInfo.outputPath("city.png") });
  await page.getByRole("button", { name: "Hustles", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.reload();
  await expect(page.locator(".wallet")).toContainText("₦6,500");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("help and profile panels work without leaving the world", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toContainText("Look around");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Ada");
  await expect(page.getByRole("dialog")).toContainText("₦5,000");
  await page.getByRole("button", { name: "Close panel" }).click();
});
test("corrupt save recovers to setup", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() =>
    localStorage.setItem("naija-hustle:v1", "not-json"),
  );
  await page.reload();
  await expect(page.getByLabel("What should we call you?")).toBeVisible();
});

test("street camera switches without replacing the world", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Street view", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "City", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Street view", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("marked building enters and returns to its street entrance", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "City", exact: true }).click();
  await walkTo(page, 9.6, 13.8);
  await page
    .getByRole("button", { name: /Enter Balogun Market/ })
    .click({ timeout: 15000 });
  await expect(page.locator("main")).toHaveClass(/interior/);
  await page.getByRole("button", { name: "Street view", exact: true }).click();
  await page.getByRole("button", { name: /Head into the city/ }).click();
  await expect(
    page.getByRole("button", { name: /Enter Balogun Market/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Overview", exact: true }),
  ).toBeVisible();
});

test("danfo charges once and only allows alighting at a stop", async ({
  page,
}) => {
  test.setTimeout(45000);
  await setup(page);
  await page.getByRole("button", { name: "City", exact: true }).click();
  await walkTo(page, 27.5, 19.3);
  await page
    .getByRole("button", { name: /Board danfo/ })
    .click({ timeout: 15000 });
  await expect(page.locator(".wallet")).toContainText("₦4,800");
  await expect(
    page.getByRole("button", { name: "Home", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".ride-info")).toContainText(
    "Next stop: East Junction",
    { timeout: 15000 },
  );
  await page.keyboard.press("e");
  await expect(page.locator(".ride-info")).toBeVisible();
  await expect(page.getByRole("button", { name: /Get off danfo/ })).toBeVisible(
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /Get off danfo/ }).click();
  await expect(page.locator(".ride-info")).toHaveCount(0);
  await expect(page.locator(".wallet")).toContainText("₦4,800");
  await expect(
    page.getByRole("button", { name: "Home", exact: true }),
  ).toBeEnabled();
});

test("guest combat has a close arena, working attacks and no account coin award", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "✦ Challenges", exact: true }).click();
  await expect(page.locator(".challenge-list button").nth(1)).toBeDisabled();
  await page.locator(".challenge-list button").first().click();
  await expect(
    page.getByRole("region", { name: "Combat challenge" }),
  ).toBeVisible();
  await page.locator(".fight-actions button").first().click();
  await expect(page.locator(".combat-bars progress").nth(1)).toHaveAttribute(
    "value",
    "58",
  );
  await expect(page.locator(".coin-balance")).toContainText("0 coins");
  await page
    .getByRole("button", { name: "Leave challenge", exact: true })
    .click();
  await expect(page.locator(".combat-hud")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Street view", exact: true }),
  ).toBeVisible();
});
