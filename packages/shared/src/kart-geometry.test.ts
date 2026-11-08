import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
import * as THREE from "three";
import { refineKartGeometry } from "../../../apps/web/src/racing/refineKartGeometry";
it("reshapes exactly two complete exhausts without changing body positions or authored body normals", () => {
  const file = readFileSync(
    new URL(
      "../../../apps/web/public/models/racing/kart-oopi.glb",
      import.meta.url,
    ),
  );
  const length = file.readUInt32LE(12),
    json = JSON.parse(file.subarray(20, 20 + length).toString());
  const blob = file.subarray(28 + length),
    mesh = json.meshes[0].primitives[0];
  function attribute(id: number) {
    const a = json.accessors[id],
      v = json.bufferViews[a.bufferView],
      size = a.type === "VEC3" ? 3 : 1;
    const bytes = a.componentType === 5126 || a.componentType === 5125 ? 4 : 2;
    const values = [];
    for (let i = 0; i < a.count; i++)
      for (let k = 0; k < size; k++) {
        const offset =
          (v.byteOffset || 0) +
          (a.byteOffset || 0) +
          i * (v.byteStride || bytes * size) +
          k * bytes;
        values.push(
          a.componentType === 5126
            ? blob.readFloatLE(offset)
            : bytes === 4
              ? blob.readUInt32LE(offset)
              : blob.readUInt16LE(offset),
        );
      }
    return new THREE.BufferAttribute(
      a.componentType === 5126
        ? new Float32Array(values)
        : new Uint32Array(values),
      size,
    );
  }
  const g = new THREE.BufferGeometry()
    .setAttribute("position", attribute(mesh.attributes.POSITION))
    .setAttribute("normal", attribute(mesh.attributes.NORMAL));
  g.setIndex(attribute(mesh.indices));
  const before = g.getAttribute("position").clone(),
    normals = g.getAttribute("normal").clone();
  expect(refineKartGeometry(g)).toBe(2);
  const after = g.getAttribute("position"),
    afterNormals = g.getAttribute("normal");
  let changed = 0,
    untouched = 0;
  for (let i = 0; i < after.count; i++) {
    if (after.getX(i) !== before.getX(i) || after.getY(i) !== before.getY(i)) {
      changed++;
      expect(after.getY(i)).toBeLessThan(0.51);
      expect(
        Math.hypot(
          afterNormals.getX(i),
          afterNormals.getY(i),
          afterNormals.getZ(i),
        ),
      ).toBeCloseTo(1, 5);
    } else {
      untouched++;
    }
    if (before.getZ(i) >= 0) {
      expect([after.getX(i), after.getY(i), after.getZ(i)]).toEqual([
        before.getX(i),
        before.getY(i),
        before.getZ(i),
      ]);
      expect([
        afterNormals.getX(i),
        afterNormals.getY(i),
        afterNormals.getZ(i),
      ]).toEqual([normals.getX(i), normals.getY(i), normals.getZ(i)]);
    }
    expect(after.getZ(i)).toBe(before.getZ(i));
  }
  expect(changed).toBeGreaterThanOrEqual(300);
  expect(changed).toBeLessThanOrEqual(320);
  expect(untouched).toBeGreaterThan(500);
  g.dispose();
});
