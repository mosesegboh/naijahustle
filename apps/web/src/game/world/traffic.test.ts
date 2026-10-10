import { it, expect } from "vitest";
import { Traffic, overlaps } from "./traffic";
it("keeps moving cars apart and queues behind a stopped bus", () => {
  const traffic = new Traffic(),
    bus = { x: 29, z: 19.3, width: 3.8, depth: 1.8 };
  let collision = false;
  for (let i = 0; i < 5000; i++) {
    traffic.update(0.05, i * 0.05, bus);
    const cars = traffic.bodies();
    for (let a = 0; a < cars.length; a++) {
      collision ||= overlaps(cars[a], bus, 0);
      for (let b = a + 1; b < cars.length; b++)
        collision ||= overlaps(cars[a], cars[b], 0);
    }
  }
  expect(collision).toBe(false);
  expect(traffic.positions[0].x).toBeLessThan(29);
});

import { BusRoute } from "./bus";
it("keeps the rideable bus clear of traffic through a complete route", () => {
  const traffic = new Traffic(),
    bus = new BusRoute();
  bus.riding = true;
  let vertical = false,
    collision = false;
  const visited = new Set<number>();
  let departed = false,
    returned = false;
  for (let i = 0; i < 8000; i++) {
    const x = bus.x,
      z = bus.z;
    bus.update(
      0.05,
      (nx, nz, v) =>
        !traffic
          .bodies()
          .some((c) =>
            overlaps(
              { x: nx, z: nz, width: v ? 1.8 : 3.8, depth: v ? 3.8 : 1.8 },
              c,
              0.15,
            ),
          ),
    );
    if (Math.abs(bus.z - z) > 0.001) vertical = true;
    else if (Math.abs(bus.x - x) > 0.001) vertical = false;
    const body = {
      x: bus.x,
      z: bus.z,
      width: vertical ? 1.8 : 3.8,
      depth: vertical ? 3.8 : 1.8,
    };
    traffic.update(0.05, i * 0.05, body);
    if (bus.stop !== 0) departed = true;
    if (departed && bus.stop === 0) returned = true;
    visited.add(bus.stop);
    collision ||= traffic.bodies().some((c) => overlaps(c, body, 0));
  }
  expect(collision).toBe(false);
  expect([...visited].sort()).toEqual([0, 1, 2, 3]);
  expect(returned).toBe(true);
});
