import * as THREE from "three";

/** Reshape complete exhaust components, preserving authored seams and normals. */
export function refineKartGeometry(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const parents = Array.from({ length: positions.count }, (_, i) => i);
  function root(i: number): number {
    while (parents[i] !== i) {
      parents[i] = parents[parents[i]];
      i = parents[i];
    }
    return i;
  }
  const join = (a: number, b: number) => {
    parents[root(a)] = root(b);
  };
  const seams = new Map<string, number>();
  for (let i = 0; i < positions.count; i++) {
    const key = [positions.getX(i), positions.getY(i), positions.getZ(i)]
      .map((v) => Math.round(v * 100000))
      .join(":");
    const prior = seams.get(key);
    if (prior !== undefined) join(i, prior);
    seams.set(key, i);
  }
  const indices = geometry.index;
  const count = indices?.count ?? positions.count;
  for (let i = 0; i < count; i += 3) {
    const a = indices ? indices.getX(i) : i;
    join(a, indices ? indices.getX(i + 1) : i + 1);
    join(a, indices ? indices.getX(i + 2) : i + 2);
  }
  const parts = new Map<number, number[]>();
  for (let i = 0; i < positions.count; i++) {
    const id = root(i);
    const part = parts.get(id) ?? [];
    part.push(i);
    parts.set(id, part);
  }
  let refined = 0;
  for (const part of parts.values()) {
    const bounds = new THREE.Box3();
    for (const i of part)
      bounds.expandByPoint(
        new THREE.Vector3().fromBufferAttribute(positions, i),
      );
    // The two separate rear exhausts in the licensed Kenney kart, not its bodywork.
    if (
      bounds.max.y < 0.6 ||
      bounds.min.z > -0.5 ||
      bounds.max.x - bounds.min.x > 0.25 ||
      !(bounds.min.x > 0.1 || bounds.max.x < -0.1)
    )
      continue;
    const center = (bounds.min.x + bounds.max.x) / 2;
    for (const i of part) {
      positions.setX(i, center + (positions.getX(i) - center) * 0.85);
      positions.setY(
        i,
        bounds.min.y + (positions.getY(i) - bounds.min.y) * 0.65,
      );
      if (normals) {
        const normal = new THREE.Vector3(
          normals.getX(i) / 0.85,
          normals.getY(i) / 0.65,
          normals.getZ(i),
        ).normalize();
        normals.setXYZ(i, normal.x, normal.y, normal.z);
      }
    }
    refined++;
  }
  positions.needsUpdate = true;
  if (normals) normals.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return refined;
}
