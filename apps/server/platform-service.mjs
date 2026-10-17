import { randomUUID } from "node:crypto";
import {
  runner,
  reward,
  advanceFestival,
} from "../../packages/shared/src/platform.ts";
export function platformService(store) {
  async function settle(m, now) {
    if (m.status !== "finished") return;
    m.paid = [];
    for (const p of m.players) {
      const amount = reward(m, p);
      if (!amount) continue;
      for (let i = 0; i < 5; i++) {
        const u = await store.user(p.id);
        if (!u) break;
        if (u.ledger?.some((e) => e.id === m.id)) {
          m.paid.push(p.id);
          break;
        }
        u.coins += amount;
        if (m.winner === p.id) u.wins++;
        u.ledger = [
          ...(u.ledger ?? []),
          { id: m.id, kind: "festival_reward", coins: amount, at: now },
        ];
        if (await store.saveUser(u)) {
          m.paid.push(p.id);
          break;
        }
      }
    }
  }
  return async ({ path, method, body, user, now, send }) => {
    if (!path.startsWith("/api/festival")) return false;
    const reply = (code, data) => {
      send(code, data);
      return true;
    };
    if (path === "/api/festival" && method === "GET") {
      const matches = (await store.racesFor(user.id, now)).filter(
        (m) => m.game === "festival",
      );
      for (let i = 0; i < matches.length; i++) {
        let m = matches[i];
        if (m.status === "active") {
          advanceFestival(m, now);
          if (!(await store.saveRace(m))) m = await store.race(m.id);
          matches[i] = m;
        }
        await settle(m, now);
      }
      return reply(200, { matches });
    }
    if (path === "/api/festival/create" && method === "POST") {
      const ids = body.invitees;
      if (
        !Array.isArray(ids) ||
        ids.length < 1 ||
        ids.length > 3 ||
        ids.some((id) => typeof id !== "string" || id === user.id) ||
        new Set(ids).size !== ids.length
      )
        return reply(400, { error: "Invite 1–3 different players." });
      const open = await store.racesFor(user.id, now);
      if (
        open.filter(
          (m) => m.host === user.id && ["lobby", "active"].includes(m.status),
        ).length >= 3
      )
        return reply(409, {
          error: "Finish or cancel an existing challenge first.",
        });
      const invited = await Promise.all(ids.map((id) => store.user(id)));
      if (invited.some((p) => !p))
        return reply(400, { error: "Player not found." });
      const m = {
        id: randomUUID(),
        game: "festival",
        host: user.id,
        players: [user, ...invited].map((p) => runner(p.id, p.name)),
        status: "lobby",
        created: now,
        updated: now,
        starts: 0,
        waiting: false,
        winner: null,
        revision: 0,
      };
      m.players[0].accepted = true;
      await store.createRace(m);
      return reply(200, { match: m });
    }
    if (
      path !== "/api/festival/action" ||
      method !== "POST" ||
      typeof body.id !== "string"
    )
      return reply(400, { error: "Invalid festival action." });
    if (
      body.action === "input" &&
      (!body.input ||
        !Number.isFinite(body.input.move) ||
        Math.abs(body.input.move) > 1 ||
        typeof body.input.jump !== "boolean")
    )
      return reply(400, { error: "Invalid movement." });
    for (let retry = 0; retry < 5; retry++) {
      const m = await store.race(body.id);
      if (
        !m ||
        m.game !== "festival" ||
        !m.players.some((p) => p.id === user.id)
      )
        return reply(404, { error: "Invitation not found." });
      if (now - m.created > 1800000)
        return reply(410, { error: "Challenge expired." });
      advanceFestival(m, now);
      const p = m.players.find((p) => p.id === user.id);
      if (body.action === "accept" && m.status === "lobby") p.accepted = true;
      else if (body.action === "decline" && m.status === "lobby") {
        if (m.host === user.id) m.status = "cancelled";
        else m.players = m.players.filter((p) => p.id !== user.id);
      } else if (
        body.action === "start" &&
        m.status === "lobby" &&
        m.host === user.id
      ) {
        if (m.players.length < 2 || !m.players.every((p) => p.accepted))
          return reply(409, {
            error:
              "Every invited player must accept or decline first; at least two must play.",
          });
        for (const player of m.players)
          if (
            (await store.racesFor(player.id, now)).some(
              (v) => v.id !== m.id && v.status === "active",
            )
          )
            return reply(409, {
              error: `${player.name} is already playing another match.`,
            });
        m.status = "active";
        m.waiting = true;
        m.updated = now;
      } else if (body.action === "input" && m.status === "active" && !p.left) {
        p.ready = true;
        p.jumpQueued ||= body.input.jump && !p.input.jump;
        p.input = { move: body.input.move, jump: body.input.jump };
        p.lastInput = now;
      } else if (body.action === "leave" && m.status === "active") {
        p.left = true;
        p.input = { move: 0, jump: false };
        if (m.players.every((p) => p.left)) m.status = "cancelled";
      } else if (!["poll", "input", "leave"].includes(body.action))
        return reply(409, { error: "Action unavailable." });
      if (!(await store.saveRace(m))) continue;
      await settle(m, now);
      return reply(200, { match: m, serverTime: now });
    }
    return reply(409, { error: "Match changed. Try again." });
  };
}
