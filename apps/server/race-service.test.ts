import { describe, it, expect } from "vitest";
import { raceService } from "./race-service.mjs";
import { memoryStore } from "./test-store.mjs";
import {
  DEFAULT_OPTIONS,
  advance,
  fire,
  racer,
  obstacles,
  type Match,
} from "../../packages/shared/src/race-match";
import { track, tangent } from "../../packages/shared/src/racing";
async function setup() {
  const store = memoryStore();
  for (const id of ["Ada", "Bisi", "Chidi", "Dayo", "Efe"])
    await store.createUser({ id, name: id, coins: 0, wins: 0, ledger: [] });
  const handler = raceService(store);
  let now = 100000;
  async function call(path: string, body?: any, id = "Ada") {
    let code = 0,
      data: any;
    await handler({
      path: "/api/races" + path,
      method: body === undefined ? "GET" : "POST",
      body: body ?? {},
      user: await store.user(id),
      now,
      send: (c: number, d: any) => {
        code = c;
        data = d;
      },
    });
    return { code, data };
  }
  return {
    store,
    call,
    tick: (ms: number) => {
      now += ms;
    },
    now: () => now,
  };
}
describe("crew challenges", () => {
  it("finds usernames without leaking account details and supports four-player acceptance", async () => {
    const h = await setup();
    const found = await h.call("/players", { query: "Bi" });
    expect(found.data.players).toEqual([{ id: "Bisi", name: "Bisi" }]);
    const c = await h.call("/create", {
      invitees: ["Bisi", "Chidi", "Dayo"],
      options: DEFAULT_OPTIONS,
    });
    expect(c.code).toBe(200);
    const id = c.data.match.id;
    expect((await h.call("/action", { id, action: "poll" }, "Efe")).code).toBe(
      404,
    );
    expect((await h.call("/action", { id, action: "start" })).code).toBe(409);
    for (const name of ["Bisi", "Chidi", "Dayo"])
      expect(
        (
          await h.call(
            "/action",
            { id, action: "accept", weapon: "shield" },
            name,
          )
        ).code,
      ).toBe(200);
    expect(
      (await h.call("/action", { id, action: "start" }, "Bisi")).code,
    ).toBe(409);
    const start = await h.call("/action", { id, action: "start" });
    expect(start.data.match.players).toHaveLength(4);
    expect(start.data.match.players[1].weapon).toBe("shield");
    expect(start.data.match.starts).toBe(h.now() + 3000);
  });
  it("rejects forged settings, self-invites, duplicate invitees and driving input", async () => {
    const h = await setup();
    for (const invitees of [["Ada"], ["Bisi", "Bisi"], ["missing"]])
      expect(
        (await h.call("/create", { invitees, options: DEFAULT_OPTIONS })).code,
      ).toBe(400);
    expect(
      (
        await h.call("/create", {
          invitees: ["Bisi"],
          options: { ...DEFAULT_OPTIONS, laps: 0 },
        })
      ).code,
    ).toBe(400);
    const c = await h.call("/create", {
      invitees: ["Bisi"],
      options: DEFAULT_OPTIONS,
    });
    const id = c.data.match.id;
    await h.call("/action", { id, action: "accept" }, "Bisi");
    await h.call("/action", { id, action: "start" });
    h.tick(3100);
    expect(
      (
        await h.call("/action", {
          id,
          action: "input",
          input: { throttle: 100, steer: 0, brake: false, boost: false },
        })
      ).code,
    ).toBe(400);
    expect(
      (await h.call("/action", { id, action: "win", coins: 9999 })).code,
    ).toBe(409);
    expect((await h.store.user("Ada")).coins).toBe(0);
  });
  it("pays a server-verified winner once even with concurrent result polling", async () => {
    const h = await setup();
    const c = await h.call("/create", {
      invitees: ["Bisi"],
      options: DEFAULT_OPTIONS,
    });
    const id = c.data.match.id;
    await h.call("/action", { id, action: "accept" }, "Bisi");
    await h.call("/action", { id, action: "start" });
    h.tick(3100);
    const m = await h.store.race(id);
    m.waiting = false;
    m.players[0].checkpoint = 12;
    Object.assign(m.players[0].vehicle, track(0));
    m.players.forEach((p: any) => (p.lastInput = h.now()));
    await h.store.saveRace(m);
    await Promise.all([
      h.call("/action", { id, action: "poll" }),
      h.call("/action", { id, action: "poll" }, "Bisi"),
    ]);
    await h.call("/action", { id, action: "poll" });
    const winner = await h.store.user("Ada");
    expect(winner.coins).toBe(50);
    expect(winner.wins).toBe(1);
    expect(winner.ledger).toHaveLength(1);
    expect((await h.store.user("Bisi")).coins).toBe(0);
  });
  it("declines, expires and cancels abandoned matches without paying", async () => {
    const h = await setup();
    const c = await h.call("/create", {
      invitees: ["Bisi", "Chidi"],
      options: DEFAULT_OPTIONS,
    });
    const id = c.data.match.id;
    await h.call("/action", { id, action: "decline" }, "Chidi");
    expect(
      (await h.call("/action", { id, action: "poll" }, "Chidi")).code,
    ).toBe(404);
    await h.call("/action", { id, action: "accept" }, "Bisi");
    await h.call("/action", { id, action: "start" });
    h.tick(64000);
    const result = await h.call("/action", {
      id,
      action: "input",
      input: { throttle: 0, steer: 0, brake: false, boost: false },
    });
    expect(result.data.match.status).toBe("cancelled");
    expect((await h.store.user("Ada")).coins).toBe(0);
    h.tick(1800000);
    expect((await h.call("/action", { id, action: "poll" })).code).toBe(410);
  });
});
function match(): Match {
  const players = [racer("a", "Ada", "pulse"), racer("b", "Bisi", "shield", 1)];
  players.forEach((p) => {
    p.accepted = true;
    p.lastInput = 1000;
  });
  return {
    id: "test",
    host: "a",
    options: DEFAULT_OPTIONS,
    players,
    status: "active",
    created: 0,
    updated: 1000,
    starts: 0,
    time: 1,
    winner: null,
    shots: [],
    cleared: [],
    revision: 0,
  };
}
describe("authoritative race mechanics", () => {
  it("requires ordered checkpoints before crediting a lap", () => {
    const m = match();
    Object.assign(m.players[0].vehicle, track(0));
    advance(m, 1100);
    expect(m.players[0].lap).toBe(0);
    for (let i = 1; i <= 12; i++) {
      Object.assign(m.players[0].vehicle, track((i / 12) * Math.PI * 2));
      m.players.forEach((p) => (p.lastInput = 1100 + i * 100));
      advance(m, 1100 + i * 100);
    }
    expect(m.players[0].lap).toBe(1);
    expect(m.winner).toBe("a");
  });
  it("enforces cooldowns and a shield blocks projectile damage", () => {
    const m = match(),
      a = m.players[0],
      b = m.players[1];
    Object.assign(a.vehicle, track(0));
    a.vehicle.yaw = tangent(0);
    b.vehicle.x = a.vehicle.x + Math.sin(a.vehicle.yaw) * 3.3;
    b.vehicle.z = a.vehicle.z + Math.cos(a.vehicle.yaw) * 3.3;
    fire(m, b);
    fire(m, a);
    fire(m, a);
    expect(m.shots).toHaveLength(1);
    expect(b.shield).toBe(3);
    advance(m, 1010);
    expect(m.shots).toHaveLength(0);
    expect(b.stun).toBe(0);
    expect(a.score).toBe(0);
  });
  it("a tied battle finishes without a reward", () => {
    const m = match();
    m.options = { ...DEFAULT_OPTIONS, mode: "battle" };
    m.players.forEach((p) => (p.lastInput = 90000));
    advance(m, 90000);
    expect(m.status).toBe("finished");
    expect(m.winner).toBe(null);
  });
});

it("recovers a saved result whose reward write was interrupted", async () => {
  const h = await setup();
  const c = await h.call("/create", {
    invitees: ["Bisi"],
    options: DEFAULT_OPTIONS,
  });
  const m = c.data.match;
  m.status = "finished";
  m.winner = "Ada";
  await h.store.saveRace(m);
  await h.call("");
  await h.call("");
  expect((await h.store.user("Ada")).coins).toBe(50);
});
it("waits for every driver to load before the shared countdown", () => {
  const m = match();
  m.waiting = true;
  m.time = -1;
  m.players[0].ready = true;
  advance(m, 1200);
  expect(m.waiting).toBe(true);
  expect(m.time).toBe(-1);
  m.players[1].ready = true;
  advance(m, 1400);
  expect(m.waiting).toBe(false);
  expect(m.starts).toBe(4400);
  advance(m, 4300);
  expect(m.time).toBe(-1);
  m.players.forEach((p) => (p.lastInput = 4500));
  advance(m, 4500);
  expect(m.time).toBeCloseTo(0.1);
});

it("a pulse hit stuns an unshielded rival and awards the attacker points", () => {
  const m = match(),
    a = m.players[0],
    b = m.players[1];
  Object.assign(a.vehicle, track(0));
  a.vehicle.yaw = tangent(0);
  b.vehicle.x = a.vehicle.x + Math.sin(a.vehicle.yaw) * 3.3;
  b.vehicle.z = a.vehicle.z + Math.cos(a.vehicle.yaw) * 3.3;
  fire(m, a);
  advance(m, 1010);
  expect(m.shots).toHaveLength(0);
  expect(b.stun).toBeGreaterThan(0);
  expect(a.score).toBe(3);
});
it("solid obstacles push the kart clear and reduce its speed", () => {
  const m = match(),
    p = m.players[0],
    o = obstacles(m.options).find((o) => o.kind === "barrier")!;
  p.vehicle.x = o.x + 0.1;
  p.vehicle.z = o.z;
  p.vehicle.speed = 10;
  advance(m, 1010);
  expect(Math.hypot(p.vehicle.x - o.x, p.vehicle.z - o.z)).toBeGreaterThan(
    o.radius + 1,
  );
  expect(p.vehicle.speed).toBeLessThan(4);
});
