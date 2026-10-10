import { describe, it, expect } from "vitest";
import { newFight, actFight, advanceFight } from "./combat";
describe("challenge rules", () => {
  it("enforces cooldowns and stamina instead of rewarding button spam", () => {
    const start = newFight(0, 100);
    const hit = actFight(start, "kick", 100);
    expect(hit.enemyHp).toBe(47);
    expect(actFight(hit, "kick", 100.1).enemyHp).toBe(47);
    expect(actFight({ ...hit, stamina: 0 }, "kick", 101).enemyHp).toBe(47);
  });
  it("blocks or dodges only inside the defense window", () => {
    const start = newFight(0, 100);
    expect(advanceFight(start, 102.6).hp).toBe(91);
    expect(advanceFight(actFight(start, "block", 102), 102.6).hp).toBe(98);
    expect(advanceFight(actFight(start, "dodge", 102), 102.6).hp).toBe(100);
    expect(advanceFight(actFight(start, "dodge", 100), 102.6).hp).toBe(91);
  });
  it("cannot skip enemy attacks by leaving the tab idle", () => {
    expect(advanceFight(newFight(3, 100), 150).status).toBe("lost");
  });
  it("finishes once and rejects invalid levels", () => {
    let f = newFight(0, 100);
    for (let i = 0; i < 6; i++) f = actFight(f, "jab", 100 + i * 0.8);
    expect(f.status).toBe("won");
    expect(f.reward).toBe(25);
    expect(actFight(f, "kick", 110)).toBe(f);
    expect(() => newFight(-1, 0)).toThrow();
  });
});

it("advanced opponents guard their wind-up and expose a counter window", () => {
  const guarded = actFight(newFight(3, 100), "jab", 102);
  const open = actFight(newFight(3, 100), "jab", 100);
  expect(guarded.enemyHp).toBe(166);
  expect(open.enemyHp).toBe(158);
});
