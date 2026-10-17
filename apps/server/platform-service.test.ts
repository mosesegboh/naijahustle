import { describe, expect, it } from "vitest";
import { platformService } from "./platform-service.mjs";
import { raceService } from "./race-service.mjs";
import { memoryStore } from "./test-store.mjs";
import {
  advanceFestival,
  runner,
  reward,
  type FestivalMatch,
} from "../../packages/shared/src/platform";
async function setup() {
  const store = memoryStore();
  for (const id of ["Ada", "Bisi", "Chidi", "Dayo", "Efe"])
    await store.createUser({ id, name: id, coins: 0, wins: 0, ledger: [] });
  const handler = platformService(store);
  let now = 100000;
  async function call(path: string, body?: any, id = "Ada") {
    let code = 0,
      data: any;
    await handler({
      path: "/api/festival" + path,
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
describe("Festival Rush invitations and rewards", () => {
  it("requires consent, host start, membership and isolates kart endpoints", async () => {
    const h = await setup();
    const { data } = await h.call("/create", {
      invitees: ["Bisi", "Chidi", "Dayo"],
    });
    const id = data.match.id;
    expect((await h.call("/action", { id, action: "start" })).code).toBe(409);
    expect((await h.call("/action", { id, action: "poll" }, "Efe")).code).toBe(
      404,
    );
    for (const user of ["Bisi", "Chidi", "Dayo"])
      expect(
        (await h.call("/action", { id, action: "accept" }, user)).code,
      ).toBe(200);
    expect(
      (await h.call("/action", { id, action: "start" }, "Bisi")).code,
    ).toBe(409);
    expect(
      (await h.call("/action", { id, action: "start" })).data.match.waiting,
    ).toBe(true);
    const race = raceService(h.store);
    let code = 0;
    let list: any;
    await race({
      path: "/api/races/action",
      method: "POST",
      body: { id, action: "poll" },
      user: await h.store.user("Ada"),
      now: h.now(),
      send: (c: number) => {
        code = c;
      },
    });
    expect(code).toBe(404);
    await race({
      path: "/api/races",
      method: "GET",
      body: {},
      user: await h.store.user("Ada"),
      now: h.now(),
      send: (_: number, d: any) => {
        list = d;
      },
    });
    expect(list.matches).toEqual([]);
  });
  it("waits for each player, starts a countdown and rejects forged movement/rewards", async () => {
    const h = await setup();
    const { data } = await h.call("/create", { invitees: ["Bisi"] });
    const id = data.match.id;
    await h.call("/action", { id, action: "accept" }, "Bisi");
    await h.call("/action", { id, action: "start" });
    expect(
      (
        await h.call("/action", {
          id,
          action: "input",
          input: { move: 999, jump: false },
        })
      ).code,
    ).toBe(400);
    await h.call("/action", {
      id,
      action: "input",
      input: { move: 1, jump: false },
      coins: 99999,
      finished: 1,
    });
    expect(
      (await h.call("/action", { id, action: "poll" })).data.match.waiting,
    ).toBe(true);
    await h.call(
      "/action",
      { id, action: "input", input: { move: 0, jump: false } },
      "Bisi",
    );
    const ready = await h.call("/action", { id, action: "poll" });
    expect(ready.data.match.starts).toBe(h.now() + 3000);
    expect(ready.data.match.players[0].x).toBe(80);
    h.tick(3200);
    const moving = await h.call("/action", {
      id,
      action: "input",
      input: { move: 1, jump: false },
    });
    expect(moving.data.match.players[0].collected).toEqual([]);
    h.tick(100);
    expect(
      (await h.call("/action", { id, action: "poll" })).data.match.players[0].x,
    ).toBeGreaterThan(80);
    expect((await h.store.user("Ada")).coins).toBe(0);
  });
  it("credits every finisher and the winner bonus exactly once under concurrent requests", async () => {
    const h = await setup();
    const { data } = await h.call("/create", { invitees: ["Bisi", "Chidi"] });
    const m = data.match;
    m.status = "finished";
    m.winner = "Ada";
    m.players[0].finished = h.now();
    m.players[0].collected = [1, 2, 3];
    m.players[1].finished = h.now() + 100;
    m.players[1].collected = [1, 2];
    m.players[2].collected = [1, 2, 3];
    await h.store.saveRace(m);
    await Promise.all(
      Array.from({ length: 5 }, () =>
        h.call("/action", { id: m.id, action: "poll" }),
      ),
    );
    expect((await h.store.user("Ada")).coins).toBe(43);
    expect((await h.store.user("Bisi")).coins).toBe(12);
    expect((await h.store.user("Chidi")).coins).toBe(0);
    expect((await h.store.user("Ada")).ledger).toHaveLength(1);
    const reload = await h.call("");
    expect(reload.data.matches[0].paid.sort()).toEqual(["Ada", "Bisi"]);
  });
  it("does not pay abandoned players or award a winner bonus for a tie", async () => {
    const h = await setup();
    const { data } = await h.call("/create", { invitees: ["Bisi"] });
    const m = data.match;
    m.status = "finished";
    m.winner = "tie";
    m.players.forEach((p: any) => (p.finished = h.now()));
    m.players[1].left = true;
    await h.store.saveRace(m);
    await h.call("");
    expect((await h.store.user("Ada")).coins).toBe(10);
    expect((await h.store.user("Bisi")).coins).toBe(0);
  });
});
function scene(): FestivalMatch {
  return {
    id: "test",
    game: "festival",
    host: "Ada",
    players: [runner("Ada", "Ada")],
    status: "active",
    created: 0,
    updated: 0,
    starts: 0,
    waiting: false,
    winner: null,
    revision: 0,
  };
}
describe("platform simulation", () => {
  it("lands on walkways, respawns at saved flags, bounds movement and expires stale inputs", () => {
    const m = scene(),
      p = m.players[0];
    p.x = 680;
    p.y = 590;
    p.checkpoint = 1;
    advanceFestival(m, 100);
    expect(p.x).toBe(1150);
    expect(p.falls).toBe(1);
    p.input.move = 1;
    p.lastInput = 100;
    advanceFestival(m, 200);
    expect(p.x).toBeGreaterThan(1150);
    const x = p.x;
    advanceFestival(m, 5000);
    expect(p.x).toBe(x);
  });
  it("requires all checkpoint flags and finishes on timeout without unearned payouts", () => {
    const m = scene();
    m.players[0].x = 3560;
    advanceFestival(m, 100);
    expect(m.players[0].finished).toBeNull();
    advanceFestival(m, 151000);
    expect(m.status).toBe("finished");
    expect(reward(m, m.players[0])).toBe(0);
  });
  it("cancels a lobby that never becomes ready and practice never pays", () => {
    const m = scene();
    m.waiting = true;
    advanceFestival(m, 31000);
    expect(m.status).toBe("cancelled");
    m.status = "finished";
    m.practice = true;
    m.players[0].finished = 2000;
    expect(reward(m, m.players[0])).toBe(0);
  });
});

it("the complete course is traversable by running and jumping", () => {
  const m = scene(),
    p = m.players[0];
  for (let step = 1; step < 9000 && m.status === "active"; step++) {
    const now = (step * 1000) / 60;
    p.input = { move: 1, jump: false };
    p.lastInput = now;
    p.jumpQueued = p.grounded;
    advanceFestival(m, now);
  }
  expect(m.status).toBe("finished");
  expect(p.checkpoint).toBe(3);
  expect(p.finished).not.toBeNull();
  expect(p.collected.length).toBeGreaterThan(0);
  expect(m.winner).toBe(p.id);
});

it("buffers a jump tapped shortly before landing without allowing midair repeat jumps", () => {
  const m = scene(),
    p = m.players[0];
  p.y = 438;
  p.vy = 120;
  p.grounded = false;
  p.jumpQueued = true;
  p.lastInput = 100;
  advanceFestival(m, 17);
  advanceFestival(m, 34);
  expect(p.vy).toBeLessThan(0);
  expect(p.y).toBeLessThan(440);
  p.jumpQueued = true;
  const vy = p.vy;
  advanceFestival(m, 51);
  expect(p.vy).toBeGreaterThan(vy);
});
