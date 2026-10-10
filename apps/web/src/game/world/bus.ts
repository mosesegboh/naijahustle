export const stops = [
  { name: "Balogun Market", x: 29, z: 19.3 },
  { name: "East Junction", x: 104, z: 19.3 },
  { name: "North Estate", x: 104, z: -61 },
  { name: "Yaba Gate", x: 24, z: -61 },
];
export class BusRoute {
  x = stops[0].x;
  z = stops[0].z;
  stop = 0;
  dwell = 8;
  riding = false;
  private corner = false;
  update(
    dt: number,
    canEnter: (x: number, z: number, vertical: boolean) => boolean = () => true,
  ) {
    if (!this.riding) return;
    if (this.dwell > 0) {
      this.dwell = Math.max(0, this.dwell - dt);
      return;
    }
    const next = (this.stop + 1) % stops.length;
    const dest =
      this.stop === 3 && !this.corner ? { x: 24, z: 19.3 } : stops[next];
    const dx = dest.x - this.x,
      dz = dest.z - this.z,
      d = Math.hypot(dx, dz),
      step = 12 * dt;
    const candidateX = d <= step ? dest.x : this.x + (dx / d) * step;
    const candidateZ = d <= step ? dest.z : this.z + (dz / d) * step;
    if (!canEnter(candidateX, candidateZ, Math.abs(dz) > 0.001)) return;
    if (d <= step) {
      this.x = dest.x;
      this.z = dest.z;
      if (this.stop === 3 && !this.corner) this.corner = true;
      else {
        this.stop = next;
        this.dwell = 8;
        this.corner = false;
      }
    } else {
      this.x += (dx / d) * step;
      this.z += (dz / d) * step;
    }
  }
}
