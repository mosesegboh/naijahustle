import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { connectStore } from "./mongo.mjs";
import { memoryStore } from "./test-store.mjs";
import { Readable } from "node:stream";
import { createGameService } from "./index.mjs";
async function harness(mongo = false) {
  const dbName = "naija_test_" + randomUUID().replaceAll("-", "");
  let store = mongo
    ? await connectStore(process.env.MONGODB_TEST_URI, dbName)
    : memoryStore();
  let now = Date.now();
  let service = createGameService({ store, clock: () => now, secure: false });
  const request = async (
    path: string,
    body?: unknown,
    cookie = "",
    origin = "http://localhost:5173",
  ) => {
    const req = Readable.from(
      body === undefined ? [] : [JSON.stringify(body)],
    ) as any;
    Object.assign(req, {
      url: "/api/" + path,
      method: body === undefined ? "GET" : "POST",
      headers: {
        cookie,
        origin,
        host: "localhost:5173",
        "content-type": "application/json",
      },
      socket: { remoteAddress: "test" },
    });
    let status = 0;
    const headers: Record<string, string> = {};
    let data: any;
    await service.handler(req, {
      headersSent: false,
      setHeader: (k: string, v: string) => (headers[k] = v),
      writeHead: (code: number, h: any) => {
        status = code;
        Object.assign(headers, h);
      },
      end: (raw: string) => (data = JSON.parse(raw)),
    });
    return {
      status,
      data,
      cookie: headers["Set-Cookie"]?.split(";")[0],
      headers,
    };
  };
  return {
    request,
    get store() {
      return store;
    },
    restart: async () => {
      if (mongo) {
        await store.close();
        store = await connectStore(process.env.MONGODB_TEST_URI, dbName);
      }
      service = createGameService({ store, clock: () => now, secure: false });
    },
    tick: (ms: number) => (now += ms),
    cleanup: async () => {
      await store.close();
      if (mongo) {
        const client = new MongoClient(process.env.MONGODB_TEST_URI!);
        try {
          await client.connect();
          await client.db(dbName).dropDatabase();
        } finally {
          await client.close();
        }
      }
    },
  };
}
describe.each(process.env.MONGODB_TEST_URI ? [false, true] : [false])(
  "account and shared city service (MongoDB: %s)",
  (mongo) => {
    it("hashes passwords, issues HttpOnly sessions and rejects wrong credentials and origins", async () => {
      const h = await harness(mongo);
      try {
        const r = await h.request("auth/register", {
          name: "Ada",
          email: "Ada@example.com",
          password: "a-long-password",
        });
        expect(r.status).toBe(200);
        expect(r.headers["Set-Cookie"]).toContain("HttpOnly");
        expect(JSON.stringify(await h.store.userByName("Ada"))).not.toContain(
          "a-long-password",
        );
        expect(
          (await h.request("me", undefined, r.cookie)).data.user.name,
        ).toBe("Ada");
        expect(
          (
            await h.request("auth/login", {
              name: "Ada",
              email: "Ada@example.com",
              password: "not-the-password",
            })
          ).status,
        ).toBe(401);
        expect(
          (
            await h.request("auth/register", {
              name: "ada",
              email: "ada@example.com",
              password: "a-long-password",
            })
          ).status,
        ).toBe(409);
        expect(
          (
            await h.request(
              "auth/logout",
              {},
              r.cookie,
              "https://hostile.example",
            )
          ).status,
        ).toBe(403);
        await h.request("auth/logout", {}, r.cookie);
        expect(
          (await h.request("me", undefined, r.cookie)).data.user,
        ).toBeNull();
      } finally {
        await h.cleanup();
      }
    });
    it("requires valid unique emails and keeps legacy accounts usable", async () => {
      const h = await harness(mongo);
      try {
        for (const email of [undefined, "bad-email", "a b@example.com"]) {
          expect(
            (
              await h.request("auth/register", {
                name: "Ada",
                email,
                password: "a-long-password",
              })
            ).status,
          ).toBe(400);
        }
        const registered = await h.request("auth/register", {
          name: "Ada",
          email: "  ADA@Example.com  ",
          password: "a-long-password",
        });
        expect(registered.status).toBe(200);
        expect(registered.data.user.email).toBe("ada@example.com");
        const duplicate = await h.request("auth/register", {
          name: "Different",
          email: "ADA@example.com",
          password: "a-long-password",
        });
        expect(duplicate.status).toBe(409);
        const original = await h.store.userByName("Ada");
        expect(
          await h.store.createUser({
            ...original,
            _id: undefined,
            id: "legacy-one",
            name: "LegacyOne",
            email: undefined,
            emailKey: undefined,
          }),
        ).toBe(true);
        expect(
          await h.store.createUser({
            ...original,
            _id: undefined,
            id: "legacy-two",
            name: "LegacyTwo",
            email: undefined,
            emailKey: undefined,
          }),
        ).toBe(true);
        const login = await h.request("auth/login", {
          name: "LegacyOne",
          password: "a-long-password",
        });
        expect(login.status).toBe(200);
        await h.restart();
        expect(
          (await h.request("me", undefined, registered.cookie)).data.user.email,
        ).toBe("ada@example.com");
      } finally {
        await h.cleanup();
      }
    });
    it("shares authenticated positions and removes stale players", async () => {
      const h = await harness(mongo);
      try {
        const a = await h.request("auth/register", {
            name: "Ada",
            email: "Ada@example.com",
            password: "a-long-password",
          }),
          b = await h.request("auth/register", {
            name: "Tunde",
            email: "Tunde@example.com",
            password: "a-long-password",
          });
        const pos = { x: 24, z: 18, yaw: 0, view: "city", avatar: "emerald" };
        expect((await h.request("presence", pos)).status).toBe(401);
        await h.request("presence", pos, a.cookie);
        const r = await h.request("presence", pos, b.cookie);
        expect(r.data.players[0].name).toBe("Ada");
        expect(r.data.online).toBe(2);
        h.tick(13000);
        expect(
          (await h.request("presence", pos, b.cookie)).data.players,
        ).toHaveLength(0);
        expect(
          (await h.request("presence", { ...pos, x: "bad" }, b.cookie)).status,
        ).toBe(400);
      } finally {
        await h.cleanup();
      }
    });
    it("validates fights on the server and records each victory exactly once", async () => {
      const h = await harness(mongo);
      try {
        const a = await h.request("auth/register", {
          name: "Ada",
          email: "Ada@example.com",
          password: "a-long-password",
        });
        expect(
          (await h.request("fight/start", { level: 3 }, a.cookie)).status,
        ).toBe(403);
        await h.request("fight/start", { level: 0 }, a.cookie);
        expect(
          (await h.request("fight/start", { level: 0 }, a.cookie)).status,
        ).toBe(409);
        for (let i = 0; i < 8; i++) {
          await h.request(
            "fight/action",
            { action: "jab", reward: 999999, damage: 99999 },
            a.cookie,
          );
          h.tick(800);
        }
        const r = await h.request("fight/state", {}, a.cookie);
        expect(r.data.fight.status).toBe("won");
        expect(r.data.user.coins).toBe(25);
        expect(r.data.user.level).toBe(1);
        await h.request("fight/state", {}, a.cookie);
        await h.request("fight/leave", {}, a.cookie);
        const saved = await h.store.userByName("Ada");
        expect(saved.coins).toBe(25);
        expect(saved.ledger).toHaveLength(1);
        expect(saved.ledger[0].coins).toBe(25);
      } finally {
        await h.cleanup();
      }
    });
    it("keeps sessions and fights across service restarts, and enforces expiry", async () => {
      const h = await harness(mongo);
      try {
        const a = await h.request("auth/register", {
          name: "Ada",
          email: "Ada@example.com",
          password: "a-long-password",
        });
        const started = await h.request("fight/start", { level: 0 }, a.cookie);
        await h.restart();
        const resumed = await h.request("me", undefined, a.cookie);
        expect(resumed.data.user.name).toBe("Ada");
        expect(resumed.data.fight.id).toBe(started.data.fight.id);
        h.tick(7 * 86400000);
        expect(
          (await h.request("me", undefined, a.cookie)).data.user,
        ).toBeNull();
      } finally {
        await h.cleanup();
      }
    });
    it("pays once when winning actions arrive concurrently", async () => {
      const h = await harness(mongo);
      try {
        const a = await h.request("auth/register", {
          name: "Ada",
          email: "Ada@example.com",
          password: "a-long-password",
        });
        await h.request("fight/start", { level: 0 }, a.cookie);
        for (let i = 0; i < 5; i++) {
          await h.request("fight/action", { action: "jab" }, a.cookie);
          h.tick(800);
        }
        const results = await Promise.all(
          Array.from({ length: 5 }, () =>
            h.request("fight/action", { action: "jab" }, a.cookie),
          ),
        );
        expect(results.some((r) => r.status === 200)).toBe(true);
        expect(results.every((r) => r.status === 200 || r.status === 409)).toBe(
          true,
        );
        const saved = await h.store.userByName("Ada");
        expect(saved.coins).toBe(25);
        expect(saved.wins).toBe(1);
        expect(saved.ledger).toHaveLength(1);
        expect(saved.fight.paid).toBe(true);
        await h.restart();
        expect(
          (await h.request("me", undefined, a.cookie)).data.user.coins,
        ).toBe(25);
      } finally {
        await h.cleanup();
      }
    });
    it("rejects stale account writes and simultaneous duplicate names", async () => {
      const h = await harness(mongo);
      try {
        const results = await Promise.all(
          ["Ada", "ada"].map((name) =>
            h.request("auth/register", {
              name,
              email: `${name}@example.com`,
              password: "a-long-password",
            }),
          ),
        );
        expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
        const first = await h.store.userByName("ada"),
          stale = await h.store.userByName("ada");
        first.coins = 10;
        expect(await h.store.saveUser(first)).toBe(true);
        stale.coins = 99;
        expect(await h.store.saveUser(stale)).toBe(false);
        expect((await h.store.userByName("ada")).coins).toBe(10);
      } finally {
        await h.cleanup();
      }
    });
  },
);
