export const WORLD = { width: 1200, height: 900, spawn: { x: 600, y: 450 } };
export const AVATARS = {
  emerald: 0x54e0a0,
  gold: 0xffcf67,
  coral: 0xff927b,
} as const;
export type Avatar = keyof typeof AVATARS;
export type Mission = "available" | "active" | "completed";
export type NpcId = "mama" | "tunde";
export interface Progress {
  name: string;
  avatar: Avatar;
  cash: number;
  energy: number;
  health: number;
  reputation: number;
  tokens: number;
  mission: Mission;
  journeyCompleted: boolean;
}
export const initialProgress: Progress = {
  name: "",
  avatar: "emerald",
  cash: 5000,
  energy: 100,
  health: 100,
  reputation: 0,
  tokens: 0,
  mission: "available",
  journeyCompleted: false,
};
export const NPCS = [
  {
    id: "mama" as const,
    name: "Mama Bisi",
    role: "Market trader",
    x: 410,
    y: 360,
    color: 0xf6c367,
  },
  {
    id: "tunde" as const,
    name: "Tunde",
    role: "Neighbour",
    x: 805,
    y: 580,
    color: 0x9cb9ef,
  },
];
export const BUILDINGS = [
  {
    x: 240,
    y: 205,
    width: 330,
    height: 200,
    color: 0xc38350,
    name: "BALOGUN MARKET",
  },
  {
    x: 950,
    y: 205,
    width: 280,
    height: 190,
    color: 0x617d8b,
    name: "POLICE STATION",
  },
  {
    x: 240,
    y: 700,
    width: 290,
    height: 190,
    color: 0x5c9181,
    name: "COMMUNITY BANK",
  },
  {
    x: 955,
    y: 710,
    width: 290,
    height: 190,
    color: 0xb68c71,
    name: "THE COMPOUND",
  },
];
export function interact(progress: Progress, npc: NpcId): Progress {
  if (npc === "mama" && progress.mission === "available")
    return { ...progress, mission: "active" };
  if (npc === "tunde" && progress.mission === "active")
    return {
      ...progress,
      mission: "completed",
      cash: progress.cash + 1500,
      reputation: progress.reputation + 10,
      energy: Math.max(0, progress.energy - 10),
    };
  return progress;
}
// Local saves are untrusted. Keep only known fields and reject malformed values.
export function parseProgress(value: unknown): Progress | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (
    p.journeyCompleted !== undefined &&
    typeof p.journeyCompleted !== "boolean"
  )
    return null;
  if (
    typeof p.name !== "string" ||
    p.name.trim().length > 24 ||
    !Object.keys(AVATARS).includes(String(p.avatar)) ||
    !["available", "active", "completed"].includes(String(p.mission))
  )
    return null;
  for (const key of ["cash", "energy", "health", "reputation", "tokens"])
    if (
      typeof p[key] !== "number" ||
      !Number.isSafeInteger(p[key]) ||
      (p[key] as number) < 0
    )
      return null;
  if ((p.energy as number) > 100 || (p.health as number) > 100) return null;
  return {
    name: p.name.trim(),
    avatar: p.avatar as Avatar,
    cash: p.cash as number,
    energy: p.energy as number,
    health: p.health as number,
    reputation: p.reputation as number,
    tokens: p.tokens as number,
    mission: p.mission as Mission,
    journeyCompleted: p.journeyCompleted === true,
  };
}

export function boardBus(progress: Progress): Progress {
  return progress.cash >= 200
    ? { ...progress, cash: progress.cash - 200 }
    : progress;
}
export function finishJourney(progress: Progress): Progress {
  return progress.mission === "completed" && !progress.journeyCompleted
    ? {
        ...progress,
        journeyCompleted: true,
        cash: progress.cash + 300,
        reputation: progress.reputation + 5,
      }
    : progress;
}
