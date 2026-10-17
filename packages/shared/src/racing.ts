export const TAU = Math.PI * 2;
export const ROAD_WIDTH = 16;
export function track(t: number) {
  return {
    x: Math.sin(t) * 68 + Math.sin(t * 3) * 5 + Math.sin(t * 5) * 5,
    z: Math.cos(t) * 48 + Math.sin(t * 2) * 6,
  };
}
export function tangent(t: number) {
  const a = track(t),
    b = track(t + 0.001);
  return Math.atan2(b.x - a.x, b.z - a.z);
}
export function nearest(x: number, z: number) {
  let distance = Infinity,
    t = 0;
  for (let i = 0; i < 360; i++) {
    const p = track((i / 360) * TAU),
      d = Math.hypot(x - p.x, z - p.z);
    if (d < distance) {
      distance = d;
      t = (i / 360) * TAU;
    }
  }
  return { distance, t };
}
export interface DriveInput {
  throttle: number;
  steer: number;
  brake: boolean;
  boost: boolean;
}
export interface Vehicle {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  charge: number;
  boost: number;
  distance: number;
  offroad: boolean;
  steer: number;
}
export function newVehicle(): Vehicle {
  const p = track(0);
  return {
    ...p,
    yaw: tangent(0),
    speed: 0,
    charge: 1,
    boost: 0,
    distance: 0,
    offroad: false,
    steer: 0,
  };
}
export function drive(v: Vehicle, input: DriveInput, dt: number) {
  dt = Math.min(0.05, Math.max(0, dt));
  const before = nearest(v.x, v.z);
  v.offroad = before.distance > ROAD_WIDTH / 2;
  v.steer += (input.steer - v.steer) * Math.min(1, dt * 7);
  v.charge = Math.min(
    1,
    v.charge +
      dt *
        (input.brake && Math.abs(v.steer) > 0.3 && v.speed > 12 ? 0.25 : 0.045),
  );
  if (input.boost && v.charge >= 1) {
    v.boost = 1.8;
    v.charge = 0;
  }
  v.boost = Math.max(0, v.boost - dt);
  const max = v.offroad ? 10 : v.boost > 0 ? 42 : 28;
  v.speed += input.throttle * 16 * dt;
  v.speed *= Math.exp(
    -(input.throttle === 0 ? 1.7 : input.brake ? 1.0 : 0.23) * dt,
  );
  // Brake with released throttle must stop faster than ordinary coasting.
  if (input.brake && input.throttle === 0) {
    v.speed = Math.sign(v.speed) * Math.max(0, Math.abs(v.speed) - 30 * dt);
  }
  v.speed = Math.max(-8, Math.min(max, v.speed));
  v.yaw +=
    v.steer *
    (input.brake ? 1.95 : 1.35) *
    Math.min(1, Math.abs(v.speed) / 7) *
    (v.speed < 0 ? -1 : 1) *
    dt;
  const x = v.x,
    z = v.z;
  v.x += Math.sin(v.yaw) * v.speed * dt;
  v.z += Math.cos(v.yaw) * v.speed * dt;
  const n = nearest(v.x, v.z);
  if (n.distance > ROAD_WIDTH / 2 + 2) {
    const p = track(n.t),
      dx = v.x - p.x,
      dz = v.z - p.z,
      d = Math.hypot(dx, dz);
    v.x = p.x + (dx / d) * (ROAD_WIDTH / 2 + 2);
    v.z = p.z + (dz / d) * (ROAD_WIDTH / 2 + 2);
    v.speed *= 0.5;
  }
  v.distance += Math.hypot(v.x - x, v.z - z);
}
