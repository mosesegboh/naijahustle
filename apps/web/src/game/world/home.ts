import * as THREE from "three";
import { ModelKit, type Obstacle } from "./models";
export function buildHome(kit: ModelKit) {
  const root = new THREE.Group();
  const obstacles: Obstacle[] = [];
  const box = kit.box.bind(kit, root);
  // Open-front, cutaway apartment: actual walls, furniture and cast shadows.
  box("#d0b99a", 0, -0.22, 0, 13, 0.45, 11);
  box("#9b7651", 0, -0.04, 0, 12.7, 0.16, 10.7);
  for (let x = 0; x < 12; x++)
    for (let z = 0; z < 10; z++)
      box(
        (x + z) % 2 ? "#c49971" : "#cfaa82",
        x - 5.5,
        0.06,
        z - 4.5,
        0.99,
        0.08,
        0.99,
      );
  box("#e5cfab", 0, 1.9, -5.2, 12.7, 3.8, 0.2);
  box("#d9bd91", -6.25, 1.9, 0, 0.2, 3.8, 10.6);
  box("#e8dac2", 0, 0.25, -5.03, 12.5, 0.25, 0.08);
  box("#ecdec7", -6.1, 0.25, 0, 0.08, 0.25, 10.5);
  // Window, blue sky and mullions on the back wall.
  box("#f5ecda", 3.1, 2.25, -5.02, 3.55, 1.95, 0.14);
  box("#9fc4c7", 3.1, 2.25, -4.93, 3.22, 1.63, 0.04);
  for (let i = 0; i < 5; i++)
    box("#f2ead7", 1.5 + i * 0.8, 2.25, -4.87, 0.055, 1.7, 0.1);
  box("#f2ead7", 3.1, 2.25, -4.84, 3.3, 0.06, 0.12);
  box("#f3e8d2", 3.1, 1.23, -4.85, 3.7, 0.14, 0.43);
  // Soft linen curtains.
  for (const x of [1.12, 4.98])
    for (let i = 0; i < 4; i++)
      box(
        i % 2 ? "#739b88" : "#8fae99",
        x + i * 0.12,
        2.2,
        -4.68,
        0.13,
        2.25,
        0.16,
      );
  // Entry door in left wall.
  box("#e7d5b5", -6.08, 1.47, 2.5, 0.1, 2.95, 1.55);
  box("#637e70", -5.99, 1.43, 2.5, 0.12, 2.78, 1.35);
  kit.ball(root, "#d9ae61", -5.88, 1.32, 2.03, 0.065);
  box("#537969", -4.68, 0.14, 2.5, 1.8, 0.035, 1.4);
  // Bed frame and layered bedding.
  box("#895f45", -4, 0.35, -2.7, 2.5, 0.45, 3.9);
  box("#956c4c", -4, 0.9, -4.65, 2.6, 1.65, 0.2);
  box("#f9f1df", -4, 0.65, -2.7, 2.42, 0.35, 3.75);
  box("#648d7d", -4, 0.86, -2.1, 2.46, 0.1, 2.55);
  box("#80a393", -4, 0.925, -3.19, 2.46, 0.05, 0.38);
  for (const x of [-4.57, -3.43])
    box("#f5ead7", x, 0.94, -4.05, 0.95, 0.23, 0.68);
  obstacles.push({ x: -4, z: -2.7, width: 2.6, depth: 4 });
  // Bedside table, book and warm lamp.
  box("#a57751", -2.05, 0.43, -4.05, 0.95, 0.86, 0.9);
  box("#d7b17a", -2.05, 0.86, -4.05, 1.05, 0.09, 1);
  box("#eee2c8", -2.05, 0.6, -3.58, 0.65, 0.04, 0.04);
  kit.tube(root, "#f3dfac", -2.05, 1.18, -4.05, 0.065, 0.55);
  kit.mesh(root, kit.cone, "#f7dfab", -2.05, 1.48, -4.05, 0.32, 0.45, 0.32);
  // Framed Nigerian-inspired geometric art.
  box("#976a43", -3.95, 2.55, -5.01, 1.55, 0.99, 0.09);
  box("#f5dfba", -3.95, 2.55, -4.95, 1.38, 0.83, 0.035);
  kit.ball(root, "#c98248", -4.17, 2.59, -4.92, 0.25, 0.3, 0.02);
  box("#597b65", -3.75, 2.39, -4.91, 0.35, 0.39, 0.035);
  // Kitchen counter, cabinetry, hob and sink.
  for (let i = 0; i < 3; i++) {
    box("#6d897a", -0.35 + i * 0.95, 0.48, -4.48, 0.89, 0.96, 1.05);
    box("#d9bd83", -0.35 + i * 0.95, 0.72, -3.93, 0.28, 0.035, 0.04);
  }
  box("#e9e0cc", 0.6, 1.01, -4.45, 2.95, 0.12, 1.15);
  box("#3e4b43", -0.2, 1.08, -4.42, 0.75, 0.025, 0.72);
  for (const x of [-0.4, 0])
    kit.tube(root, "#1f2c28", x, 1.1, -4.42, 0.13, 0.025);
  box("#9daea4", 1.28, 1.09, -4.43, 0.75, 0.03, 0.6);
  kit.tube(root, "#b4c4b9", 1.3, 1.24, -4.75, 0.035, 0.38);
  obstacles.push({ x: 0.6, z: -4.45, width: 3, depth: 1.2 });
  // Dining table on a woven rug.
  box("#cfb781", 1.15, 0.13, 1.05, 4.35, 0.045, 3.8);
  for (let i = 0; i < 12; i++)
    box("#b49e6e", 1.15, 0.16, -0.75 + i * 0.32, 4.25, 0.006, 0.018);
  kit.tube(root, "#93623f", 1.15, 0.72, 1.05, 0.22, 1.25);
  kit.tube(root, "#b78c5b", 1.15, 1.32, 1.05, 1.05, 0.16);
  kit.tube(root, "#e6ddbf", 1.52, 1.42, 1, 0.24, 0.025);
  kit.tube(root, "#cc8a4c", 0.85, 1.52, 0.9, 0.09, 0.24);
  obstacles.push({ x: 1.15, z: 1.05, width: 2.1, depth: 2.1 });
  for (const z of [-0.65, 2.8]) {
    box("#986f4d", 1.15, 0.65, z, 0.78, 0.12, 0.75);
    box("#ba8c59", 1.15, 1.18, z + (z < 0 ? -0.35 : 0.35), 0.79, 1.0, 0.1);
    for (const dx of [-0.28, 0.28])
      for (const dz of [-0.26, 0.26])
        box("#805a3b", 1.15 + dx, 0.31, z + dz, 0.09, 0.62, 0.09);
    obstacles.push({ x: 1.15, z, width: 0.9, depth: 0.85 });
  }
  // Sofa and little coffee table.
  box("#d59866", 4.83, 0.51, -1.85, 1.3, 0.7, 2.65);
  box("#be8055", 5.38, 1.02, -1.85, 0.25, 1.35, 2.8);
  for (const z of [-3.12, -0.58])
    box("#d79e6d", 4.82, 0.89, z, 1.35, 0.38, 0.24);
  for (const z of [-2.5, -1.25]) box("#e4b888", 4.69, 0.9, z, 1.1, 0.2, 1.08);
  obstacles.push({ x: 4.85, z: -1.85, width: 1.5, depth: 2.8 });
  kit.plant(root, 5.2, 4, 1.6);
  kit.plant(root, 5.35, -4.4, 1.1);
  // Fan: cage, rotating blades and stand.
  kit.tube(root, "#44564c", -4.75, 0.14, 0.15, 0.37, 0.12);
  kit.tube(root, "#64776a", -4.75, 0.82, 0.15, 0.045, 1.4);
  const fan = new THREE.Group();
  fan.position.set(-4.75, 1.65, 0.15);
  root.add(fan);
  const cage = new THREE.Mesh(
    kit.geometry(new THREE.TorusGeometry(0.42, 0.025, 6, 24)),
    kit.material("#526a5c"),
  );
  fan.add(cage);
  const blades = new THREE.Group();
  fan.add(blades);
  for (let i = 0; i < 3; i++) {
    const blade = kit.box(blades, "#7a9783", 0, 0.19, 0, 0.13, 0.4, 0.035);
    blade.rotation.z = (i * Math.PI * 2) / 3;
    blade.position.set(
      Math.sin((i * Math.PI * 2) / 3) * 0.18,
      Math.cos((i * Math.PI * 2) / 3) * 0.18,
      0,
    );
  }
  kit.ball(fan, "#bf9a57", 0, 0, 0.04, 0.09);
  // A floor lamp and a shoe rack bring the space to life.
  kit.tube(root, "#566255", 4.1, 0.15, 4.15, 0.27, 0.12);
  kit.tube(root, "#566255", 4.1, 1.15, 4.15, 0.045, 2);
  kit.mesh(root, kit.cone, "#f6dfb0", 4.1, 2.2, 4.15, 0.46, 0.6, 0.46);
  box("#946e4b", -4.8, 0.25, 4.4, 1.5, 0.12, 0.6);
  for (const x of [-5.35, -4.25]) box("#805a3f", x, 0.22, 4.4, 0.09, 0.45, 0.6);
  for (let i = 0; i < 3; i++)
    box("#414b42", -5.25 + i * 0.42, 0.38, 4.4, 0.25, 0.15, 0.45);
  return { root, obstacles, fan: blades };
}
