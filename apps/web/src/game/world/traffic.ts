export interface Vehicle {
  x: number;
  z: number;
  width: number;
  depth: number;
}
export function overlaps(a: Vehicle, b: Vehicle, gap = 0.35) {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap &&
    Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + gap
  );
}
export const LANES = [
  { axis: "x", lane: 19.3, min: -12, max: 60, speed: 3.2 },
  { axis: "x", lane: 16.5, min: -12, max: 60, speed: -3 },
  { axis: "z", lane: 22.3, min: -12, max: 36, speed: -2.7 },
] as const;
export class Traffic {
  positions = [
    { x: 3, z: 19.3 },
    { x: 46, z: 16.5 },
    { x: 22.3, z: 32 },
    { x: -10, z: 19.3 },
    { x: 58, z: 16.5 },
    { x: 22.3, z: 5 },
  ];
  bodies() {
    return this.positions.map((p, i) => ({
      ...p,
      width: i % 3 === 2 ? 1 : 2.4,
      depth: i % 3 === 2 ? 2 : 1,
    }));
  }
  update(dt: number, time: number, bus: Vehicle, pedestrians: Vehicle[] = []) {
    const bodies = this.bodies();
    for (let i = 0; i < this.positions.length; i++) {
      const lane = LANES[i % 3],
        old = this.positions[i],
        next = { ...old };
      next[lane.axis] += lane.speed * Math.min(dt, 0.05);
      // Signals protect the central junction; vehicles already in it may clear it.
      const center = lane.axis === "x" ? 24 : 18;
      const phase = time % 16;
      const red = lane.axis === "x" ? phase >= 10 : phase < 11 || phase >= 15;
      const entering =
        lane.speed > 0
          ? old[lane.axis] < center - 4 && next[lane.axis] >= center - 4
          : old[lane.axis] > center + 4 && next[lane.axis] <= center + 4;
      const busAtJunction =
        Math.abs(bus.x - 24) < 4 && Math.abs(bus.z - 18) < 6;
      if ((red || (i % 3 === 2 && busAtJunction)) && entering) continue;
      if (next[lane.axis] > lane.max) next[lane.axis] = lane.min;
      if (next[lane.axis] < lane.min) next[lane.axis] = lane.max;
      const body = { ...bodies[i], ...next };
      if (
        [...bodies.filter((_, j) => j !== i), ...pedestrians].some((b) =>
          overlaps(body, b, 0.7),
        ) ||
        overlaps(body, bus, 0.15)
      )
        continue;
      this.positions[i] = next;
      bodies[i] = body;
    }
  }
}
