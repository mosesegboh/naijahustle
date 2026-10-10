import { describe, expect, it } from "vitest";
import { initialProgress, interact, parseProgress } from "./index";
describe("delivery mission", () => {
  it("requires pickup before delivery and pays exactly once", () => {
    const start = { ...initialProgress, name: "Ada" };
    expect(interact(start, "tunde")).toEqual(start);
    const active = interact(start, "mama");
    expect(active.mission).toBe("active");
    expect(interact(active, "mama")).toEqual(active);
    const done = interact(active, "tunde");
    expect(done).toMatchObject({
      mission: "completed",
      cash: 6500,
      energy: 90,
      reputation: 10,
    });
    expect(interact(done, "tunde")).toEqual(done);
    expect(start.cash).toBe(5000);
  });
  it("rejects corrupted saves and drops unknown fields", () => {
    expect(parseProgress(null)).toBeNull();
    expect(parseProgress({ ...initialProgress, cash: -1 })).toBeNull();
    expect(parseProgress({ ...initialProgress, energy: 101 })).toBeNull();
    expect(parseProgress({ ...initialProgress, mission: "paid" })).toBeNull();
    expect(parseProgress({ ...initialProgress, avatar: "unknown" })).toBeNull();
    expect(parseProgress({ ...initialProgress, cash: Infinity })).toBeNull();
    expect(parseProgress({ ...initialProgress, admin: true })).toEqual(
      initialProgress,
    );
  });
});
