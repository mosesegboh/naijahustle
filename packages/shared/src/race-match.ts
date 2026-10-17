import {
  drive,
  nearest,
  newVehicle,
  track,
  tangent,
  TAU,
  type Vehicle,
  type DriveInput,
} from "./racing.ts";
export const MODES = ["circuit", "battle", "obstacle"] as const;
export type RaceMode = (typeof MODES)[number];
export type Weapon = "pulse" | "oil" | "shield";
export interface Options {
  mode: RaceMode;
  laps: number;
  difficulty: "rookie" | "pro";
  weapon: Weapon;
}
export const DEFAULT_OPTIONS: Options = {
  mode: "circuit",
  laps: 1,
  difficulty: "rookie",
  weapon: "pulse",
};
export function validOptions(v: any): v is Options {
  return (
    v &&
    MODES.includes(v.mode) &&
    [1, 2, 3].includes(v.laps) &&
    ["rookie", "pro"].includes(v.difficulty) &&
    ["pulse", "oil", "shield"].includes(v.weapon)
  );
}
export const sectors = [
  "Festival gate",
  "Market chicane",
  "Lagoon bend",
  "Bridge approach",
  "Neon mile",
  "Home straight",
];
export function obstacles(options: Options) {
  return Array.from(
    { length: options.difficulty === "pro" ? 18 : 10 },
    (_, i) => {
      const t =
          (0.08 + (i / (options.difficulty === "pro" ? 18 : 10)) * 0.86) * TAU,
        p = track(t),
        a = tangent(t),
        offset = ((i % 3) - 1) * 4;
      return {
        id: i,
        x: p.x + Math.cos(a) * offset,
        z: p.z - Math.sin(a) * offset,
        kind:
          i % 4 === 0 || (options.mode === "circuit" && i % 4 === 3)
            ? "boost"
            : i % 4 === 1
              ? "target"
              : "barrier",
        radius: 1.35,
      };
    },
  );
}
export interface Racer {
  id: string;
  name: string;
  accepted: boolean;
  ready?: boolean;
  vehicle: Vehicle;
  input: DriveInput;
  lastInput: number;
  checkpoint: number;
  lap: number;
  score: number;
  cooldown: number;
  shield: number;
  stun: number;
  weapon: Weapon;
  finished: boolean;
}
export interface Shot {
  owner: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
  kind: "pulse" | "oil";
}
export interface Match {
  id: string;
  host: string;
  options: Options;
  players: Racer[];
  status: "lobby" | "active" | "finished" | "cancelled";
  created: number;
  updated: number;
  starts: number;
  time: number;
  winner: string | null;
  shots: Shot[];
  cleared: number[];
  revision: number;
  practice?: boolean;
  waiting?: boolean;
}
export function racer(
  id: string,
  name: string,
  weapon: Weapon,
  index = 0,
): Racer {
  const vehicle = newVehicle();
  vehicle.z += (index % 2 === 0 ? -1 : 1) * 2;
  vehicle.x -= Math.floor(index / 2) * 3;
  return {
    id,
    name,
    accepted: false,
    vehicle,
    input: { throttle: 0, steer: 0, brake: false, boost: false },
    lastInput: 0,
    checkpoint: 1,
    lap: 0,
    score: 0,
    cooldown: 0,
    shield: 0,
    stun: 0,
    weapon,
    finished: false,
  };
}
export function fire(m: Match, p: Racer) {
  if (m.status !== "active" || m.time < 0 || p.cooldown > 0 || p.finished)
    return;
  p.cooldown = p.weapon === "shield" ? 8 : p.weapon === "oil" ? 5 : 1.2;
  if (p.weapon === "shield") {
    p.shield = 3;
    return;
  }
  const s = p.weapon === "oil" ? -2 : 2;
  const x = Math.sin(p.vehicle.yaw),
    z = Math.cos(p.vehicle.yaw);
  m.shots.push({
    owner: p.id,
    x: p.vehicle.x + x * s,
    z: p.vehicle.z + z * s,
    vx: p.weapon === "oil" ? 0 : x * 48,
    vz: p.weapon === "oil" ? 0 : z * 48,
    life: p.weapon === "oil" ? 8 : 2,
    kind: p.weapon,
  });
}
export function advance(m: Match, now: number) {
  if (m.status !== "active") return;
  if (m.waiting) {
    m.updated = now;
    if (m.players.filter((p) => p.accepted).every((p) => p.ready)) {
      m.waiting = false;
      m.starts = now + 3000;
    } else if (now - m.starts > 60000) {
      m.status = "cancelled";
      m.winner = null;
    }
    return;
  }
  const end = Math.max(m.updated, now);
  let remaining = Math.min(0.25, (end - m.updated) / 1000);
  m.updated = end;
  if (now < m.starts) return;
  if (m.time < 0) m.time = 0;
  if (!m.practice) m.time = (end - m.starts) / 1000;
  if (!m.practice) {
    for (const p of m.players)
      if (now - Math.max(m.starts, p.lastInput) > 20000) p.accepted = false;
    if (m.players.filter((p) => p.accepted).length < 2) {
      m.status = "cancelled";
      m.winner = null;
      return;
    }
  }
  const objects = obstacles(m.options);
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 60);
    remaining -= dt;
    if (m.practice) m.time += dt;
    for (const p of m.players) {
      if (!p.accepted || p.finished) continue;
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.shield = Math.max(0, p.shield - dt);
      p.stun = Math.max(0, p.stun - dt);
      const input =
        now - p.lastInput > 750 || p.stun > 0
          ? { throttle: 0, steer: 0, brake: true, boost: false }
          : p.input;
      drive(p.vehicle, input, dt);
      for (const o of objects) {
        if (
          o.kind === "target" ||
          Math.hypot(p.vehicle.x - o.x, p.vehicle.z - o.z) > o.radius + 1
        )
          continue;
        if (o.kind === "boost") {
          p.vehicle.boost = Math.max(p.vehicle.boost, 0.6);
          continue;
        }
        const dx = p.vehicle.x - o.x,
          dz = p.vehicle.z - o.z,
          d = Math.hypot(dx, dz) || 1;
        p.vehicle.x = o.x + (dx / d) * (o.radius + 1.02);
        p.vehicle.z = o.z + (dz / d) * (o.radius + 1.02);
        p.vehicle.speed *= 0.35;
      }
      const n = nearest(p.vehicle.x, p.vehicle.z);
      const gate = track((p.checkpoint / 12) * TAU);
      if (
        n.distance < 9 &&
        Math.hypot(p.vehicle.x - gate.x, p.vehicle.z - gate.z) < 9
      ) {
        p.checkpoint++;
        if (p.checkpoint > 12) {
          p.checkpoint = 1;
          p.lap++;
          p.score += 10;
          if (m.options.mode !== "battle" && p.lap >= m.options.laps) {
            p.finished = true;
            if (!m.winner) m.winner = p.id;
          }
        }
      }
    }
    for (let i = 0; i < m.players.length; i++)
      for (let j = i + 1; j < m.players.length; j++) {
        const a = m.players[i],
          b = m.players[j];
        if (!a.accepted || !b.accepted) continue;
        const dx = b.vehicle.x - a.vehicle.x,
          dz = b.vehicle.z - a.vehicle.z,
          d = Math.hypot(dx, dz);
        if (d < 2.3 && d > 0.001) {
          const push = (2.3 - d) / 2;
          a.vehicle.x -= (dx / d) * push;
          a.vehicle.z -= (dz / d) * push;
          b.vehicle.x += (dx / d) * push;
          b.vehicle.z += (dz / d) * push;
          a.vehicle.speed *= 0.9;
          b.vehicle.speed *= 0.9;
        }
      }
    for (const s of m.shots) {
      s.x += s.vx * dt;
      s.z += s.vz * dt;
      s.life -= dt;
      const owner = m.players.find((p) => p.id === s.owner)!;
      for (const p of m.players) {
        if (p.id === s.owner || !p.accepted || s.life <= 0) continue;
        if (Math.hypot(p.vehicle.x - s.x, p.vehicle.z - s.z) < 2) {
          s.life = 0;
          if (p.shield <= 0) {
            p.stun = 1;
            p.vehicle.speed *= 0.3;
            owner.score += 3;
          }
        }
      }
      for (const o of objects) {
        if (o.kind !== "target" || m.cleared.includes(o.id) || s.life <= 0)
          continue;
        if (Math.hypot(o.x - s.x, o.z - s.z) < 2) {
          m.cleared.push(o.id);
          owner.score += 5;
          s.life = 0;
        }
      }
    }
    m.shots = m.shots.filter((s) => s.life > 0);
  }
  if (m.options.mode === "battle" && m.time >= 90) {
    const ranked = m.players
      .filter((p) => p.accepted)
      .sort((a, b) => b.score - a.score);
    m.winner =
      ranked[0].score > 0 && ranked[0].score !== (ranked[1]?.score ?? -1)
        ? ranked[0].id
        : null;
    m.status = "finished";
  }
  if (m.winner || m.time >= 300) m.status = "finished";
}
