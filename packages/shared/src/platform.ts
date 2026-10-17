export const WORLD = 3700;
export const FINISH = 3550;
export const DURATION = 150;
export const checkpoints = [80, 1150, 2320, 3380];
export const platforms = [
  [0, 440, 650],
  [760, 440, 540],
  [1410, 440, 500],
  [2020, 440, 590],
  [2720, 440, 980],
  [320, 350, 160],
  [580, 310, 230],
  [980, 345, 160],
  [1230, 335, 220],
  [1660, 350, 160],
  [1840, 310, 230],
  [2200, 350, 170],
  [2520, 325, 240],
  [2920, 340, 180],
  [3180, 300, 180],
];
export const coins = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: 210 + i * 165,
  y: 390,
}));
export const hazards = [520, 1050, 1570, 2260, 2880, 3270];
export function hazardX(x: number, time: number) {
  return x + Math.sin(time * 1.5 + x) * 65;
}
export type PlatformInput = { move: number; jump: boolean };
export type Runner = {
  id: string;
  name: string;
  accepted: boolean;
  ready: boolean;
  left: boolean;
  x: number;
  y: number;
  vy: number;
  grounded: boolean;
  checkpoint: number;
  collected: number[];
  finished: number | null;
  input: PlatformInput;
  jumpQueued: boolean;
  jumpBuffer?: number;
  coyote?: number;
  lastInput: number;
  immunity: number;
  falls: number;
};
export type FestivalMatch = {
  id: string;
  game: "festival";
  host: string;
  players: Runner[];
  status: "lobby" | "active" | "finished" | "cancelled";
  created: number;
  updated: number;
  starts: number;
  waiting: boolean;
  winner: string | null;
  revision: number;
  practice?: boolean;
  paid?: string[];
};
export function runner(id: string, name: string): Runner {
  return {
    id,
    name,
    accepted: false,
    ready: false,
    left: false,
    x: 80,
    y: 440,
    vy: 0,
    grounded: true,
    checkpoint: 0,
    collected: [],
    finished: null,
    input: { move: 0, jump: false },
    jumpQueued: false,
    lastInput: 0,
    immunity: 0,
    falls: 0,
  };
}
export function reward(m: FestivalMatch, p: Runner) {
  if (m.practice || m.status !== "finished" || p.finished === null || p.left)
    return 0;
  return 10 + Math.min(20, p.collected.length) + (m.winner === p.id ? 30 : 0);
}
export function advanceFestival(m: FestivalMatch, now: number) {
  if (m.status !== "active") return;
  if (m.waiting) {
    if (m.players.every((p) => p.ready || p.left)) {
      m.waiting = false;
      m.starts = now + 3000;
      m.updated = now;
    } else if (now - m.updated > 30000) m.status = "cancelled";
    return;
  }
  if (now < m.starts) {
    m.updated = now;
    return;
  }
  const until = Math.min(now, m.starts + DURATION * 1000);
  let elapsed = Math.min(
    0.3,
    Math.max(0, (until - Math.max(m.updated, m.starts)) / 1000),
  );
  const time = (until - m.starts) / 1000;
  while (elapsed > 0) {
    const dt = Math.min(1 / 60, elapsed);
    elapsed -= dt;
    for (const p of m.players) {
      if (p.left || p.finished !== null) continue;
      if (now - p.lastInput > 600) {
        p.input = { move: 0, jump: false };
        p.jumpQueued = false;
        p.jumpBuffer = 0;
      }
      p.coyote = p.grounded ? 0.1 : Math.max(0, (p.coyote ?? 0) - dt);
      p.jumpBuffer = p.jumpQueued
        ? 0.16
        : Math.max(0, (p.jumpBuffer ?? 0) - dt);
      if (p.jumpBuffer > 0 && (p.grounded || p.coyote > 0)) {
        p.vy = -590;
        p.jumpBuffer = 0;
        p.coyote = 0;
        p.grounded = false;
      }
      p.jumpQueued = false;
      p.x = Math.max(20, Math.min(WORLD - 20, p.x + p.input.move * 230 * dt));
      const oldY = p.y;
      p.vy += 1450 * dt;
      p.y += p.vy * dt;
      p.grounded = false;
      for (const [x, y, w] of platforms) {
        if (
          p.vy >= 0 &&
          oldY <= y &&
          p.y >= y &&
          p.x + 12 > x &&
          p.x - 12 < x + w
        ) {
          p.y = y;
          p.vy = 0;
          p.grounded = true;
          break;
        }
      }
      if (
        p.y > 580 ||
        (time > p.immunity &&
          hazards.some(
            (x) =>
              Math.abs(p.x - hazardX(x, time)) < 27 && p.y > 405 && p.y < 466,
          ))
      ) {
        p.x = checkpoints[p.checkpoint];
        p.y = 440;
        p.vy = 0;
        p.immunity = time + 2;
        p.falls++;
      }
      if (
        p.checkpoint < 3 &&
        Math.abs(p.x - checkpoints[p.checkpoint + 1]) < 75 &&
        p.y <= 460
      )
        p.checkpoint++;
      for (const c of coins)
        if (
          !p.collected.includes(c.id) &&
          Math.abs(p.x - c.x) < 25 &&
          Math.abs(p.y - 25 - c.y) < 42
        )
          p.collected.push(c.id);
      if (p.x >= FINISH && p.checkpoint === 3 && p.grounded) p.finished = until;
    }
    if (!m.winner) {
      const arrived = m.players.filter((p) => p.finished !== null && !p.left);
      if (arrived.length)
        m.winner = arrived.length === 1 ? arrived[0].id : "tie";
    }
  }
  m.updated = now;
  if (
    now >= m.starts + DURATION * 1000 ||
    m.players.every((p) => p.left || p.finished !== null)
  )
    m.status = "finished";
}
