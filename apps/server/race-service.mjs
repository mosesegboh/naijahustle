import { randomUUID } from "node:crypto";
import {
  advance,
  fire,
  racer,
  validOptions,
} from "../../packages/shared/src/race-match.ts";
export function raceService(store) {
  async function settle(m, now) {
    if (m.status === "finished" && m.winner) {
      for (let i = 0; i < 5; i++) {
        const winner = await store.user(m.winner);
        if (winner.ledger?.some((e) => e.id === m.id)) break;
        winner.coins += 50;
        winner.wins++;
        winner.ledger = [
          ...(winner.ledger ?? []),
          { id: m.id, kind: "race_reward", coins: 50, at: now },
        ];
        if (await store.saveUser(winner)) break;
      }
    }
  }
  return async ({ path, method, body, user, now, send }) => {
    if (!path.startsWith("/api/races")) return false;
    const reply = (code, data) => {
      send(code, data);
      return true;
    };
    if (path === "/api/races/players" && method === "POST") {
      const query = String(body.query ?? "").trim();
      if (!/^[a-zA-Z0-9_]{0,20}$/.test(query))
        return reply(400, { error: "Use a username to search." });
      return reply(200, { players: await store.findPlayers(query, user.id) });
    }
    if (path === "/api/races" && method === "GET") {
      const matches = (await store.racesFor(user.id, now)).filter(
        (m) => m.game !== "festival",
      );
      for (const m of matches) await settle(m, now);
      return reply(200, { matches });
    }
    if (path === "/api/races/create" && method === "POST") {
      if (
        !validOptions(body.options) ||
        !Array.isArray(body.invitees) ||
        body.invitees.length < 1 ||
        body.invitees.length > 3 ||
        new Set(body.invitees).size !== body.invitees.length ||
        body.invitees.includes(user.id)
      )
        return reply(400, {
          error: "Choose 1–3 other players and valid match settings.",
        });
      const existing = await store.racesFor(user.id, now);
      if (
        existing.filter(
          (m) => m.host === user.id && ["lobby", "active"].includes(m.status),
        ).length >= 3
      )
        return reply(409, {
          error: "Finish or cancel an existing invitation first.",
        });
      const invited = await Promise.all(
        body.invitees.map((id) =>
          typeof id === "string" ? store.user(id) : null,
        ),
      );
      if (invited.some((p) => !p))
        return reply(400, { error: "A selected player no longer exists." });
      const players = [
        racer(user.id, user.name, body.options.weapon),
        ...invited.map((p, i) =>
          racer(p.id, p.name, body.options.weapon, i + 1),
        ),
      ];
      players[0].accepted = true;
      const match = {
        id: randomUUID(),
        host: user.id,
        options: body.options,
        players,
        status: "lobby",
        created: now,
        updated: now,
        starts: 0,
        time: -1,
        winner: null,
        shots: [],
        cleared: [],
        revision: 0,
      };
      await store.createRace(match);
      return reply(200, { match });
    }
    if (path !== "/api/races/action" || method !== "POST")
      return reply(404, { error: "Unknown challenge action." });
    if (typeof body.id !== "string")
      return reply(400, { error: "Missing match." });
    for (let retry = 0; retry < 5; retry++) {
      const m = await store.race(body.id);
      if (
        !m ||
        m.game === "festival" ||
        !m.players.some((p) => p.id === user.id)
      )
        return reply(404, { error: "Invitation not found." });
      if (now - m.created > 1800000)
        return reply(410, { error: "This challenge has expired." });
      const p = m.players.find((p) => p.id === user.id);
      advance(m, now);
      if (body.action === "accept" && m.status === "lobby") {
        p.accepted = true;
        if (["pulse", "oil", "shield"].includes(body.weapon))
          p.weapon = body.weapon;
      } else if (body.action === "decline" && m.status === "lobby") {
        if (m.host === user.id) m.status = "cancelled";
        else m.players = m.players.filter((p) => p.id !== user.id);
      } else if (
        body.action === "start" &&
        m.host === user.id &&
        m.status === "lobby"
      ) {
        if (m.players.filter((p) => p.accepted).length < 2)
          return reply(409, { error: "At least two players must accept." });
        for (const player of m.players.filter((p) => p.accepted)) {
          const other = await store.racesFor(player.id, now);
          if (other.some((v) => v.id !== m.id && v.status === "active"))
            return reply(409, {
              error: `${player.name} already has an active match. Finish or leave it first.`,
            });
        }
        m.players = m.players.filter((p) => p.accepted);
        m.status = "active";
        m.waiting = true;
        m.players.forEach((p) => (p.ready = false));
        m.starts = now + 3000;
        m.updated = now;
      } else if (
        body.action === "input" &&
        m.status === "active" &&
        p.accepted
      ) {
        const v = body.input;
        if (
          !v ||
          ![v.throttle, v.steer].every(
            (n) => Number.isFinite(n) && Math.abs(n) <= 1,
          ) ||
          typeof v.brake !== "boolean" ||
          typeof v.boost !== "boolean"
        )
          return reply(400, { error: "Invalid driving input." });
        p.input = {
          throttle: v.throttle,
          steer: v.steer,
          brake: v.brake,
          boost: v.boost,
        };
        p.lastInput = now;
        if (body.ready === true) p.ready = true;
        if (body.fire === true && now >= m.starts) fire(m, p);
      } else if (body.action === "input" && !p.accepted) {
        // Return the snapshot so disconnected clients can leave cleanly.
      } else if (
        ["input", "leave"].includes(body.action) &&
        ["finished", "cancelled"].includes(m.status)
      ) {
      } else if (body.action === "leave" && m.status === "active") {
        p.accepted = false;
        p.input = { throttle: 0, steer: 0, brake: true, boost: false };
        if (m.players.filter((p) => p.accepted).length < 2) {
          m.status = "cancelled";
          m.winner = null;
        }
      } else if (body.action !== "poll")
        return reply(409, { error: "That action is not available now." });
      if (!(await store.saveRace(m))) continue;
      await settle(m, now);
      return reply(200, { match: m, serverTime: now });
    }
    return reply(409, { error: "Match updated. Please retry." });
  };
}
