export const CHALLENGES = [
  {
    name: "Street tough",
    place: "Market courtyard",
    health: 70,
    damage: 9,
    interval: 2.5,
    reward: 25,
    color: 0xb56b43,
  },
  {
    name: "Tout enforcer",
    place: "Motor park",
    health: 100,
    damage: 13,
    interval: 2.1,
    reward: 45,
    color: 0x9d5c85,
  },
  {
    name: "Corrupt patrol officer",
    place: "Checkpoint",
    health: 135,
    damage: 17,
    interval: 1.8,
    reward: 70,
    color: 0x40576b,
  },
  {
    name: "Rogue squad leader",
    place: "SARS-style checkpoint",
    health: 170,
    damage: 21,
    interval: 1.5,
    reward: 100,
    color: 0x353943,
  },
] as const;
export type FightAction = "jab" | "kick" | "block" | "dodge";
export interface Fight {
  level: number;
  hp: number;
  enemyHp: number;
  stamina: number;
  status: "active" | "won" | "lost" | "fled";
  nextAttack: number;
  readyAt: number;
  defenseUntil: number;
  defense: string;
  updatedAt: number;
  lastAction: string;
  lastActionAt: number;
  enemyHitAt: number;
  message: string;
  reward: number;
}
export function newFight(level: number, now: number): Fight {
  if (!Number.isInteger(level) || level < 0 || level >= CHALLENGES.length)
    throw new Error("Unknown challenge");
  return {
    level,
    hp: 100,
    enemyHp: CHALLENGES[level].health,
    stamina: 100,
    status: "active",
    nextAttack: now + 2.5,
    readyAt: now,
    defenseUntil: 0,
    defense: "",
    updatedAt: now,
    lastAction: "",
    lastActionAt: 0,
    enemyHitAt: 0,
    message: "Watch the attack cue. Block or dodge before the hit.",
    reward: 0,
  };
}
export function advanceFight(fight: Fight, now: number): Fight {
  if (fight.status !== "active" || now < fight.updatedAt) return fight;
  const f = { ...fight },
    enemy = CHALLENGES[f.level];
  f.stamina = Math.min(100, f.stamina + (now - f.updatedAt) * 13);
  f.updatedAt = now;
  while (f.nextAttack <= now && f.hp > 0) {
    const protectedHit = f.defenseUntil >= f.nextAttack;
    const damage = protectedHit
      ? f.defense === "dodge"
        ? 0
        : Math.ceil(enemy.damage * 0.2)
      : enemy.damage;
    f.hp = Math.max(0, f.hp - damage);
    f.enemyHitAt = f.nextAttack;
    f.message =
      damage === 0
        ? "Dodged! Counterattack now."
        : protectedHit
          ? "Blocked. Keep your guard up."
          : "Hit! Watch the wind-up before the next strike.";
    f.nextAttack += enemy.interval;
  }
  if (f.hp === 0) {
    f.status = "lost";
    f.message = "Defeated. Recover and try again — no coins lost.";
  }
  return f;
}
export function actFight(
  fight: Fight,
  action: FightAction,
  now: number,
): Fight {
  const f = advanceFight(fight, now);
  if (
    f.status !== "active" ||
    now < f.readyAt ||
    !["jab", "kick", "block", "dodge"].includes(action)
  )
    return f;
  const cost = { jab: 10, kick: 24, block: 12, dodge: 22 }[action];
  if (f.stamina < cost)
    return { ...f, message: "Catch your breath — stamina is recovering." };
  const next = {
    ...f,
    stamina: f.stamina - cost,
    lastAction: action,
    lastActionAt: now,
    readyAt: now + (action === "kick" ? 0.85 : 0.45),
  };
  if (action === "block" || action === "dodge") {
    next.defense = action;
    next.defenseUntil = now + 0.85;
    next.message = action === "block" ? "Guard up" : "Quick step";
  } else {
    const guarded = f.level >= 2 && f.nextAttack - now < 0.85;
    const damage = guarded
      ? action === "jab"
        ? 4
        : 12
      : action === "jab"
        ? 12
        : 23;
    next.enemyHp = Math.max(0, next.enemyHp - damage);
    next.message = guarded
      ? "Glancing hit — their guard is up. Counter after the strike."
      : action === "jab"
        ? "Jab landed"
        : "Kick landed";
  }
  if (next.enemyHp === 0) {
    next.status = "won";
    next.reward = CHALLENGES[next.level].reward;
    next.message = "Challenge won!";
  }
  return next;
}
