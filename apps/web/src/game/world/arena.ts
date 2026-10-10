import * as THREE from "three";
import { ModelKit } from "./models";
export function buildArena(kit: ModelKit) {
  const root = new THREE.Group();
  kit.box(root, 0xcab38d, 0, -0.15, 0, 20, 0.3, 16);
  kit.box(root, 0xa88e68, 0, -0.02, 0, 9, 0.1, 7);
  for (const x of [-4.5, 4.5])
    for (const z of [-3.5, 3.5]) kit.tube(root, 0x64765b, x, 0.7, z, 0.1, 1.4);
  for (const z of [-3.5, 3.5])
    kit.box(root, 0xe3d5ae, 0, 0.7, z, 9, 0.08, 0.08);
  kit.text(root, "MAINLAND CHALLENGE COURT", 0, 3, -5, 8, "#f6ebd2", "#355b4b");
  kit.box(root, 0xb19b7f, 0, 1.5, -6, 20, 3, 0.3);
  for (const x of [-7, -5, 5, 7]) {
    kit.person(
      root,
      [0xc88362, 0x748e96, 0xcbaf65, 0x73956a][Math.abs(x) % 4],
      x,
      -4,
      1.1,
    );
    kit.plant(root, x, 4, 1.4);
  }
  const enemy = kit.person(root, 0xb56b43, 1.5, 0, 1.35);
  const hit = kit.ball(root, 0xffd264, 1.5, 1.3, 0, 0.45);
  hit.visible = false;
  return { root, enemy, hit };
}
