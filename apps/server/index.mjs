import http from "node:http";
import { platformService } from "./platform-service.mjs";
import { raceService } from "./race-service.mjs";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { resolve } from "node:path";
import { connectStore } from "./mongo.mjs";
import { createSiteHandler } from "./site.mjs";
import { fileURLToPath } from "node:url";
import {
  newFight,
  advanceFight,
  actFight,
  CHALLENGES,
} from "../../packages/shared/src/combat.ts";

export function createGameService({
  store,
  clock = () => Date.now(),
  secure = process.env.NODE_ENV === "production",
  webOrigin = process.env.WEB_ORIGIN,
} = {}) {
  if (!store) throw new Error("A database store is required");
  const limits = new Map();
  const races = raceService(store);
  const festival = platformService(store);
  const publicUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    coins: u.coins,
    level: u.level,
    wins: u.wins,
  });
  function finish(u, f) {
    if (f.status === "won" && !f.paid) {
      u.coins += f.reward;
      u.wins++;
      u.ledger = [
        ...(u.ledger ?? []),
        {
          id: f.id,
          kind: "challenge_reward",
          level: f.level,
          coins: f.reward,
          at: clock(),
        },
      ];
      u.level = Math.min(3, Math.max(u.level, f.level + 1));
      f.paid = true;
    }
    return f;
  }
  const digest = (s) => createHash("sha256").update(s).digest("hex");
  const handler = async (req, res) => {
    const send = (code, data) => {
      res.writeHead(code, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const now = clock();
      for (const [key, l] of limits) if (l.until < now) limits.delete(key);
      const path = new URL(req.url, "http://localhost").pathname;
      if (req.method !== "GET") {
        const origin = req.headers.origin;
        if (
          origin &&
          ![
            webOrigin,
            ...(secure
              ? []
              : [
                  "http://localhost:5173",
                  "http://127.0.0.1:5173",
                  `http://${req.headers.host}`,
                ]),
          ]
            .filter(Boolean)
            .includes(origin)
        )
          return send(403, { error: "Origin not allowed" });
        if (!req.headers["content-type"]?.startsWith("application/json"))
          return send(415, { error: "JSON required" });
      }
      // Heroku appends the connecting client's IP on the right. Only trust this
      // header when running behind its router, never on a directly exposed server.
      const forwarded = process.env.DYNO
        ? req.headers["x-forwarded-for"]?.split(",").at(-1)?.trim()
        : null;
      const ip = forwarded || req.socket.remoteAddress;
      const bucket = path.includes("/auth/") ? `auth:${ip}` : `api:${ip}`;
      const limit = limits.get(bucket) ?? { count: 0, until: now + 60000 };
      limit.count++;
      limits.set(bucket, limit);
      if (
        limit.count >
        (bucket.startsWith("auth:")
          ? 30
          : ["/api/races/action", "/api/festival/action"].includes(path)
            ? 3000
            : 1500)
      )
        return send(429, { error: "Too many requests. Try again shortly." });
      let body = {};
      if (req.method === "POST") {
        let raw = "";
        for await (const part of req) {
          raw += part;
          if (raw.length > 8192)
            return send(413, { error: "Request too large" });
        }
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          return send(400, { error: "Invalid JSON" });
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          return send(400, { error: "Invalid request" });
      }
      const token = (req.headers.cookie ?? "")
        .split(";")
        .map((x) => x.trim())
        .find((x) => x.startsWith("nh_session="))
        ?.slice(11);
      const session = token ? await store.session(digest(token), now) : null;
      const user = session ? await store.user(session.id) : null;
      if (path === "/api/health") {
        await store.ping();
        return send(200, { ok: true });
      }
      if (path === "/api/me" && req.method === "GET")
        return send(200, {
          user: user ? publicUser(user) : null,
          fight: user ? (user.fight ?? null) : null,
        });
      if (
        (path === "/api/auth/register" || path === "/api/auth/login") &&
        req.method === "POST"
      ) {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const password = typeof body.password === "string" ? body.password : "";
        if (
          !/^[a-zA-Z0-9_]{3,20}$/.test(name) ||
          password.length < 10 ||
          password.length > 128
        )
          return send(400, {
            error:
              "Use a 3–20 character username (letters, digits, underscores) and a 10–128 character password.",
          });
        let u = await store.userByName(name);
        if (path.endsWith("register")) {
          const email =
            typeof body.email === "string"
              ? body.email.trim().toLowerCase()
              : "";
          if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return send(400, { error: "Enter a valid email address." });
          if (u) return send(409, { error: "That username is taken." });
          const salt = randomBytes(16).toString("hex");
          u = {
            id: randomBytes(16).toString("hex"),
            name,
            email,
            salt,
            hash: scryptSync(password, salt, 64).toString("hex"),
            coins: 0,
            level: 0,
            wins: 0,
            ledger: [],
          };
          if (!(await store.createUser(u)))
            return send(409, {
              error: "That username or email is already registered.",
            });
        } else {
          const hash = scryptSync(
            password,
            u?.salt ?? "missing-account-salt",
            64,
          );
          if (!u || !timingSafeEqual(hash, Buffer.from(u.hash, "hex")))
            return send(401, { error: "Username or password is incorrect." });
        }
        const secret = randomBytes(32).toString("hex");
        await store.putSession(digest(secret), u.id, now + 7 * 86400000);
        res.setHeader(
          "Set-Cookie",
          `nh_session=${secret}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure ? "; Secure" : ""}`,
        );
        return send(200, {
          user: publicUser(u),
          fight: u.fight ?? null,
        });
      }
      if (!user)
        return send(401, { error: "Sign in to join the shared city." });
      if (await festival({ path, method: req.method, body, user, now, send }))
        return;
      if (await races({ path, method: req.method, body, user, now, send }))
        return;
      if (path === "/api/auth/logout" && req.method === "POST") {
        await store.deleteSession(digest(token));
        await store.deletePresence(user.id);
        res.setHeader(
          "Set-Cookie",
          "nh_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        return send(200, { ok: true });
      }
      if (path === "/api/presence" && req.method === "POST") {
        const { x, z, yaw, view, avatar } = body;
        if (
          ![x, z, yaw].every(Number.isFinite) ||
          Math.abs(x) > 100000 ||
          Math.abs(z) > 100000 ||
          !["home", "city", "interior"].includes(view) ||
          !["emerald", "gold", "coral"].includes(avatar)
        )
          return send(400, { error: "Invalid position" });
        return send(
          200,
          await store.publishPresence(
            { id: user.id, name: user.name, x, z, yaw, view, avatar },
            now,
          ),
        );
      }

      if (path === "/api/fight/start" && req.method === "POST") {
        if (
          !Number.isInteger(body.level) ||
          body.level < 0 ||
          body.level > user.level ||
          body.level >= CHALLENGES.length
        )
          return send(403, {
            error: "Win the earlier challenge to unlock this level.",
          });
        const prior = user.fight;
        if (prior?.status === "active")
          return send(409, {
            error: "Finish or leave your current challenge first.",
          });
        const f = {
          ...newFight(body.level, now / 1000),
          id: randomBytes(16).toString("hex"),
        };
        user.fight = f;
        if (!(await store.saveUser(user)))
          return send(409, {
            error: "Your challenge changed in another request. Try again.",
          });
        return send(200, { fight: f, user: publicUser(user) });
      }
      if (path.startsWith("/api/fight/") && req.method === "POST") {
        const old = user.fight;
        if (!old) return send(404, { error: "No active challenge" });
        let f;
        if (path.endsWith("/action")) {
          if (!["jab", "kick", "block", "dodge"].includes(body.action))
            return send(400, { error: "Unknown action" });
          f = actFight(old, body.action, now / 1000);
        } else if (path.endsWith("/state")) f = advanceFight(old, now / 1000);
        else if (path.endsWith("/leave"))
          f =
            old.status === "active"
              ? {
                  ...old,
                  status: "fled",
                  message: "Challenge left. No coins awarded.",
                }
              : old;
        else return send(404, { error: "Not found" });
        finish(user, f);
        user.fight = f;
        if (!(await store.saveUser(user)))
          return send(409, {
            error: "Your challenge changed in another request. Try again.",
          });
        return send(200, { fight: f, user: publicUser(user) });
      }
      return send(404, { error: "Not found" });
    } catch (e) {
      console.error("Game service request failed:", e.message);
      if (!res.headersSent)
        send(500, {
          error: "The server could not save this action. Please try again.",
        });
    }
  };
  return { handler };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let store;
  try {
    const secure = process.env.NODE_ENV === "production";
    if (
      secure &&
      (!process.env.WEB_ORIGIN ||
        new URL(process.env.WEB_ORIGIN).protocol !== "https:" ||
        new URL(process.env.WEB_ORIGIN).origin !== process.env.WEB_ORIGIN)
    ) {
      throw new Error(
        "Production requires WEB_ORIGIN with your exact HTTPS origin.",
      );
    }
    store = await connectStore();
    const { handler } = createGameService({ store });
    const server = http.createServer(createSiteHandler(handler));
    const port = Number(process.env.PORT ?? 3001);
    server.listen(port, process.env.HOST ?? "0.0.0.0", () =>
      console.log(`Naija Hustle listening on port ${port}`),
    );
    let closing = false;
    const shutdown = () => {
      if (closing) return;
      closing = true;
      const timeout = setTimeout(() => process.exit(1), 10000);
      timeout.unref();
      server.close(async () => {
        await store.close();
        clearTimeout(timeout);
      });
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch {
    if (store) await store.close();
    console.error(
      "Startup failed. Check MONGODB_URI, database access and WEB_ORIGIN (HTTPS in production).",
    );
    process.exitCode = 1;
  }
}
