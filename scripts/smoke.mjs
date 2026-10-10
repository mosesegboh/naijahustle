import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { MongoClient } from "mongodb";

// Uses its own disposable database, never the application's configured database.
const uri = process.env.MONGODB_TEST_URI;
assert(uri, "Set MONGODB_TEST_URI to a development MongoDB server");
const name = "naija_test_" + randomUUID().replaceAll("-", "");
const port = process.env.SMOKE_PORT ?? "3101";
const base = `http://127.0.0.1:${port}`;
let child;
async function start() {
  child = spawn(
    process.execPath,
    ["--experimental-strip-types", "apps/server/index.mjs"],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        WEB_ORIGIN: "https://game.example",
        MONGODB_URI: uri,
        MONGODB_DB: name,
        PORT: port,
        HOST: "127.0.0.1",
      },
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error("Server exited during startup");
    try {
      if (
        (
          await fetch(base + "/api/health", {
            signal: AbortSignal.timeout(1000),
          })
        ).ok
      )
        return;
    } catch {}
    await delay(200);
  }
  throw new Error("Server readiness timed out");
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await exited;
}
const post = (path, body, cookie = "", origin = "https://game.example") =>
  fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
try {
  await start();
  const page = await fetch(base);
  assert.equal(page.status, 200);
  const html = await page.text();
  const asset = html.match(/src="([^\"]+\.js)"/)?.[1];
  assert(asset, "Built page must reference its JavaScript bundle");
  const js = await fetch(new URL(asset, base));
  assert.equal(js.status, 200);
  assert.match(js.headers.get("content-type"), /javascript/);
  const auth = await post("/api/auth/register", {
    name: "SmokePlayer",
    password: randomUUID(),
  });
  assert.equal(auth.status, 200);
  const header = auth.headers.get("set-cookie");
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  const cookie = header.split(";")[0];
  assert.equal(
    (await post("/api/fight/start", { level: 0 }, cookie)).status,
    200,
  );
  await stop();
  await start();
  const resumed = await (
    await fetch(base + "/api/me", { headers: { Cookie: cookie } })
  ).json();
  assert.equal(resumed.user.name, "SmokePlayer");
  assert.equal(resumed.fight.level, 0);
  assert.equal(
    (await post("/api/auth/logout", {}, cookie, "https://other.example"))
      .status,
    403,
  );
  assert.equal((await post("/api/auth/logout", {}, cookie)).status, 200);
  assert.equal(
    (
      await (
        await fetch(base + "/api/me", { headers: { Cookie: cookie } })
      ).json()
    ).user,
    null,
  );
  console.log(
    "Production HTTP smoke passed: assets, secure sessions, restart persistence, origin checks and logout.",
  );
} finally {
  await stop();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client.db(name).dropDatabase();
  } finally {
    await client.close();
  }
}
