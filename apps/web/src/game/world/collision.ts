import type { Obstacle } from "./models";
export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
export function canOccupy(
  x: number,
  z: number,
  obstacles: Obstacle[],
  bounds: Bounds,
  radius = 0.24,
) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    x < bounds.minX ||
    x > bounds.maxX ||
    z < bounds.minZ ||
    z > bounds.maxZ
  )
    return false;
  return !obstacles.some(
    (o) =>
      Math.abs(x - o.x) < o.width / 2 + radius &&
      Math.abs(z - o.z) < o.depth / 2 + radius,
  );
}
