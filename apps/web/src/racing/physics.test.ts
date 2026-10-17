import { describe, it, expect } from "vitest";
import { drive, newVehicle, nearest, ROAD_WIDTH } from "./physics";
const forward = { throttle: 1, steer: 0, brake: false, boost: false };
describe("test-drive handling", () => {
  it("accelerates gradually, coasts down and respects the road boundary", () => {
    const v = newVehicle();
    for (let i = 0; i < 40; i++) drive(v, forward, 1 / 60);
    expect(v.speed).toBeGreaterThan(5);
    expect(v.distance).toBeGreaterThan(1);
    const speed = v.speed;
    for (let i = 0; i < 30; i++) drive(v, { ...forward, throttle: 0 }, 1 / 60);
    expect(v.speed).toBeLessThan(speed);
    for (let i = 0; i < 1000; i++) drive(v, forward, 1 / 60);
    expect(nearest(v.x, v.z).distance).toBeLessThanOrEqual(
      ROAD_WIDTH / 2 + 2.1,
    );
  });
  it("consumes boost charge once and bounds elapsed time after a suspended tab", () => {
    const v = newVehicle();
    drive(v, { ...forward, boost: true }, 1 / 60);
    expect(v.boost).toBeGreaterThan(1);
    expect(v.charge).toBe(0);
    drive(v, { ...forward, boost: true }, 1 / 60);
    expect(v.charge).toBeLessThan(0.01);
    const distance = v.distance;
    drive(v, forward, 100);
    expect(v.distance - distance).toBeLessThan(3);
  });
  it("steers in both directions and resets to the same starting grid", () => {
    const a = newVehicle(),
      b = newVehicle();
    for (let i = 0; i < 50; i++) {
      drive(a, { ...forward, steer: 1 }, 1 / 60);
      drive(b, { ...forward, steer: -1 }, 1 / 60);
    }
    expect(a.yaw).toBeGreaterThan(b.yaw);
    expect(newVehicle().speed).toBe(0);
    expect(newVehicle().distance).toBe(0);
  });
});

it("the brake stops faster than coasting and cannot reverse the kart", () => {
  const braking = newVehicle(),
    coasting = newVehicle();
  braking.speed = coasting.speed = 20;
  for (let i = 0; i < 40; i++) {
    drive(
      braking,
      { throttle: 0, steer: 0, brake: true, boost: false },
      1 / 60,
    );
    drive(
      coasting,
      { throttle: 0, steer: 0, brake: false, boost: false },
      1 / 60,
    );
  }
  expect(braking.speed).toBe(0);
  expect(coasting.speed).toBeGreaterThan(0);
});
