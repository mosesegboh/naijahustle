import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

let script: string;
let css: string;
test.beforeAll(async () => {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {Gamepad} from './apps/web/src/racing/Gamepad'; createRoot(document.getElementById('root')).render(<Gamepad weapon="pulse" fireDisabled={false} onFire={() => document.getElementById('shots').textContent = 'fired'} onInput={input => document.getElementById('input').textContent = JSON.stringify(input)} />);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
  });
  script = bundle.outputFiles[0].text;
  css = await readFile(resolve("apps/web/src/racing/racing.css"), "utf8");
});
test("drive toggle, steering, brake, weapon and focus reset", async ({
  page,
}) => {
  await page.setContent(
    '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><pre id="input"></pre><div id="shots"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: script });
  const drive = page.getByRole("button", { name: "Drive", exact: true });
  await drive.click();
  await expect(drive).toHaveAttribute("aria-pressed", "true");
  const left = await page
    .getByRole("button", { name: "Steer left" })
    .boundingBox();
  if (!left) throw new Error("Missing steering");
  await page.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
  await page.mouse.down();
  await expect(page.locator("#input")).toHaveText(
    '{"throttle":1,"steer":1,"brake":false,"boost":false}',
  );
  await page.mouse.up();
  await expect(page.locator("#input")).toHaveText(
    '{"throttle":1,"steer":0,"brake":false,"boost":false}',
  );
  await page.getByRole("button", { name: "SHOOT" }).click();
  await expect(page.locator("#shots")).toHaveText("fired");
  await page.getByRole("button", { name: "BRAKE" }).click();
  await expect(drive).toHaveAttribute("aria-pressed", "false");
  await drive.click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(drive).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#input")).toHaveText(
    '{"throttle":0,"steer":0,"brake":false,"boost":false}',
  );
});
test("independent fingers can steer and boost while driving", async ({
  page,
  context,
}) => {
  await page.setContent(
    '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><pre id="input"></pre><div id="shots"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: script });
  await page.getByRole("button", { name: "Drive", exact: true }).click();
  const left = await page
    .getByRole("button", { name: "Steer left" })
    .boundingBox();
  const boost = await page.getByRole("button", { name: "BOOST" }).boundingBox();
  if (!left || !boost) throw new Error("Missing gamepad");
  const cdp = await context.newCDPSession(page);
  const steering = {
    x: left.x + left.width / 2,
    y: left.y + left.height / 2,
    id: 1,
  };
  const boosting = {
    x: boost.x + boost.width / 2,
    y: boost.y + boost.height / 2,
    id: 2,
  };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [steering],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [steering, boosting],
  });
  await expect(page.locator("#input")).toHaveText(
    '{"throttle":1,"steer":1,"brake":false,"boost":true}',
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [boosting],
  });
  await expect(page.locator("#input")).toHaveText(
    '{"throttle":1,"steer":1,"brake":false,"boost":false}',
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator("#input")).toHaveText(
    '{"throttle":1,"steer":0,"brake":false,"boost":false}',
  );
});

test("touch-down actions work while another finger steers, without double toggles", async ({
  page,
  context,
}) => {
  await page.setContent(
    '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><pre id="input"></pre><div id="shots"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: script });
  const cdp = await context.newCDPSession(page);
  const center = async (name: string, id: number) => {
    const r = await page
      .getByRole("button", { name, exact: true })
      .boundingBox();
    if (!r) throw new Error(name);
    return { id, x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
  const left = await center("Steer left", 1),
    drive = await center("Drive", 2),
    shoot = await center("⊕ SHOOT", 3);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [left],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [left, drive],
  });
  await expect(
    page.getByRole("button", { name: "Drive", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [drive],
  });
  await expect(
    page.getByRole("button", { name: "Drive", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [left, shoot],
  });
  await expect(page.locator("#shots")).toHaveText("fired");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator("#input")).toHaveText(
    '{"throttle":1,"steer":0,"brake":false,"boost":false}',
  );
});
