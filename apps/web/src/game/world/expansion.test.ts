import { describe, expect, it, vi } from "vitest";
import { Districts, districtAt, lots } from "./districts";
import { BusRoute, stops } from "./bus";
import {
  boardBus,
  finishJourney,
  initialProgress,
  parseProgress,
} from "@naija-hustle/shared";
import { canOccupy } from "./collision";
const bounds = {
  minX: -Infinity,
  maxX: Infinity,
  minZ: -Infinity,
  maxZ: Infinity,
};
describe("connected districts", () => {
  it("unloads distant districts and disposes their render resources", () => {
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillRect() {}, fillText() {} }),
      }),
    });
    const districts = new Districts();
    try {
      districts.update(24, 18);
      expect(districts.root.children).toHaveLength(8);
      const removed = districts.root.children[0];
      let disposed = 0;
      removed.traverse((object) => {
        if ("geometry" in object)
          (object.geometry as import("three").BufferGeometry).addEventListener(
            "dispose",
            () => disposed++,
          );
      });
      districts.update(824, -782);
      expect(districts.root.children).toHaveLength(9);
      expect(removed.parent).toBeNull();
      expect(disposed).toBeGreaterThan(0);
      districts.update(24, 18);
      expect(districts.root.children).toHaveLength(8);
    } finally {
      districts.dispose();
      vi.unstubAllGlobals();
    }
    expect(districts.root.children).toHaveLength(0);
  }, 30000);
  it("handles negative coordinates and returns stable building layouts", () => {
    expect(districtAt(-17, 64)).toEqual({ x: -1, z: 1 });
    expect(lots(-4, 5)).toEqual(lots(-4, 5));
  });
  it("keeps roads and entrance approaches free across district boundaries", () => {
    for (let cx = -2; cx <= 2; cx++)
      for (let cz = -2; cz <= 2; cz++) {
        const buildings = lots(cx, cz);
        for (let n = -16; n < 64; n++) {
          expect(canOccupy(cx * 80 + 24, cz * 80 + n, buildings, bounds)).toBe(
            true,
          );
          expect(canOccupy(cx * 80 + n, cz * 80 + 18, buildings, bounds)).toBe(
            true,
          );
        }
        for (const b of buildings)
          expect(canOccupy(b.x, b.z + 5.2, buildings, bounds)).toBe(true);
      }
  });
});
describe("danfo journey", () => {
  it("waits without passengers and visits every stop before returning", () => {
    const bus = new BusRoute();
    bus.update(5);
    expect(bus.dwell).toBe(8);
    bus.riding = true;
    const arrivals: number[] = [];
    let previous = 0;
    for (let i = 0; i < 4000; i++) {
      bus.update(0.05);
      if (bus.stop !== previous) {
        arrivals.push(bus.stop);
        previous = bus.stop;
        if (arrivals.length === 4) break;
      }
    }
    expect(arrivals).toEqual([1, 2, 3, 0]);
    expect(bus.x).toBe(stops[0].x);
    expect(bus.z).toBe(stops[0].z);
    expect(bus.dwell).toBe(8);
  });
  it("charges affordable fares and pays the chapter reward only once after delivery", () => {
    expect(boardBus({ ...initialProgress, cash: 199 }).cash).toBe(199);
    expect(boardBus({ ...initialProgress, cash: 200 }).cash).toBe(0);
    expect(finishJourney(initialProgress)).toBe(initialProgress);
    const done = finishJourney({ ...initialProgress, mission: "completed" });
    expect(done.cash).toBe(5300);
    expect(done.reputation).toBe(5);
    expect(finishJourney(done)).toBe(done);
  });
  it("migrates old saves and rejects invalid chapter flags", () => {
    const { journeyCompleted: _, ...old } = initialProgress;
    expect(parseProgress(old)?.journeyCompleted).toBe(false);
    expect(parseProgress({ ...old, journeyCompleted: "yes" })).toBeNull();
  });
});
