import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { ModelKit } from "./models";
// Batch scenery by material; keep characters, traffic and fan blades independently animated.
export function mergeStatic(
  root: THREE.Group,
  kit: ModelKit,
  animated: THREE.Object3D[],
) {
  root.updateMatrixWorld(true);
  const excluded = new Set<THREE.Object3D>();
  animated.forEach((o) => o.traverse((child) => excluded.add(child)));
  const batches = new Map<
    THREE.Material,
    { geometry: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }
  >();
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      excluded.has(object) ||
      Array.isArray(object.material) ||
      !(object.material instanceof THREE.MeshStandardMaterial)
    )
      return;
    let batch = batches.get(object.material);
    if (!batch) {
      batch = { geometry: [], meshes: [] };
      batches.set(object.material, batch);
    }
    batch.geometry.push(
      object.geometry.clone().applyMatrix4(object.matrixWorld),
    );
    batch.meshes.push(object);
  });
  batches.forEach((batch, material) => {
    const geometry = mergeGeometries(batch.geometry);
    batch.geometry.forEach((g) => g.dispose());
    if (!geometry) return;
    const mesh = new THREE.Mesh(kit.geometry(geometry), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    batch.meshes.forEach((original) => original.removeFromParent());
    root.add(mesh);
  });
}
