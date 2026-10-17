import { expect, test, type Page } from "@playwright/test";
const player = {
  id: "test-player",
  name: "LagosLegend",
  email: "player@example.com",
  coins: 125,
  wins: 3,
  level: 1,
};
async function setup(page: Page, signedIn = false) {
  let authenticated = signedIn;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    let status = 200;
    if (path === "/api/me") body = { user: authenticated ? player : null };
    if (path === "/api/auth/register") {
      const data = route.request().postDataJSON();
      expect(data).toEqual({
        name: "LagosLegend",
        email: "player@example.com",
        password: "strong-password",
      });
      authenticated = true;
      body = { user: player };
    }
    if (path === "/api/auth/login") {
      if (route.request().postDataJSON().password === "strong-password") {
        authenticated = true;
        body = { user: player };
      } else {
        status = 401;
        body = { error: "Username or password is incorrect." };
      }
    }
    if (path === "/api/auth/logout") authenticated = false;
    await route.fulfill({ status, json: body });
  });
  await page.goto("/");
}
test("registration opens dashboard, survives reload and signs out", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await expect(
    page.getByRole("heading", { name: "Join the hustle." }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("signup.png"),
    fullPage: true,
  });
  await page.getByLabel("Username", { exact: false }).fill("LagosLegend");
  await page.getByLabel("Email address").fill("player@example.com");
  await page.getByLabel("Password", { exact: true }).fill("strong-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Create my player" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, LagosLegend." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome, LagosLegend." }),
  ).toBeVisible();
  await expect(
    page.getByText("Street Kings: crew matches ready"),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("dashboard.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "My profile" }).click();
  await expect(
    page.getByText("player@example.com", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to the playground" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Join the hustle." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Email address")).toBeVisible();
  expect(errors).toEqual([]);
});
test("login errors are recoverable and email is only required for registration", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Email address")).toHaveCount(0);
  await page.getByLabel("Username", { exact: false }).fill("LagosLegend");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Username or password is incorrect.",
  );
  await page.getByLabel("Password", { exact: true }).fill("strong-password");
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, LagosLegend." }),
  ).toBeVisible();
});

test("Street Kings loads real models and supports driving and returning to the dashboard", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await setup(page, true);
  await page.getByRole("button", { name: "Open Street Kings" }).click();
  await expect(
    page.getByRole("button", { name: "Take a test drive" }),
  ).toBeVisible({ timeout: 45000 });
  await expect(page.locator(".race-view canvas")).toBeVisible();
  const names = page.getByLabel("Show player names");
  const bubble = page.getByRole("note", {
    name: "Player username: LagosLegend",
  });
  await expect(bubble).toBeVisible();
  await names.uncheck();
  await expect(bubble).toBeHidden();
  await names.check();
  await expect(bubble).toBeVisible();
  await page.getByRole("button", { name: "Naija green", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Naija green", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Take a test drive" }).click();
  if (info.project.name === "mobile") {
    const go = await page
      .getByRole("button", { name: "Drive", exact: true })
      .boundingBox();
    if (!go) throw new Error("Touch throttle missing");
    await page.mouse.move(go.x + go.width / 2, go.y + go.height / 2);
    await page.mouse.click(go.x + go.width / 2, go.y + go.height / 2);
    await page.waitForFunction(
      () =>
        parseInt(document.querySelector(".race-map span")?.textContent ?? "0") >
        1,
      {},
      { timeout: 45000 },
    );
    await page.getByRole("button", { name: "Drive", exact: true }).click();
  } else {
    await page.locator("canvas").focus();
    await page.keyboard.down("w");
    await page.waitForFunction(
      () =>
        parseInt(document.querySelector(".race-map span")?.textContent ?? "0") >
        1,
      {},
      { timeout: 45000 },
    );
    await page.keyboard.up("w");
  }
  await expect(page.locator(".race-map span")).not.toHaveText("0 m driven");
  await page.getByRole("button", { name: "Reset kart" }).click();
  await expect(page.locator(".race-map span")).toHaveText("0 m driven");
  await page.getByRole("button", { name: "Dashboard", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, LagosLegend." }),
  ).toBeVisible();
});
