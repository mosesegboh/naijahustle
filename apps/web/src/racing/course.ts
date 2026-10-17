import * as THREE from "three";
import { track, tangent, TAU } from "./physics";
import {
  obstacles,
  type Match,
  type Options,
} from "../../../../packages/shared/src/race-match";
export function buildCourse(
  scene: THREE.Scene,
  options: Options,
  userId: string,
) {
  const group = new THREE.Group();
  scene.add(group);
  const targets = new Map<number, THREE.Object3D>();
  const gold = new THREE.MeshStandardMaterial({
      color: 0xffcc45,
      roughness: 0.4,
    }),
    red = new THREE.MeshStandardMaterial({ color: 0xef6073 }),
    white = new THREE.MeshStandardMaterial({ color: 0xfff5d4 }),
    teal = new THREE.MeshStandardMaterial({
      color: 0x4bf6bb,
      emissive: 0x168b68,
      emissiveIntensity: 0.5,
    });
  for (const o of obstacles(options)) {
    const g = new THREE.Group();
    g.position.set(o.x, 0, o.z);
    group.add(g);
    if (o.kind === "target") {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.14, 8, 24),
        gold,
      );
      ring.position.y = 1.9;
      g.add(ring);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), teal);
      core.position.y = 1.9;
      g.add(core);
      targets.set(o.id, g);
    } else if (o.kind === "boost") {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.6, 0.06, 24),
        teal,
      );
      pad.position.y = 0.13;
      g.add(pad);
      for (let i = 0; i < 3; i++) {
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 0.55, 3),
          white,
        );
        arrow.rotation.x = Math.PI / 2;
        arrow.position.set((i - 1) * 0.6, 0.2, 0);
        g.add(arrow);
      }
    } else {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 1, 1.5, 16),
        red,
      );
      barrel.position.y = 0.75;
      barrel.castShadow = true;
      g.add(barrel);
      for (const y of [0.35, 1.1]) {
        const stripe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.91, 0.96, 0.17, 16),
          white,
        );
        stripe.position.y = y;
        g.add(stripe);
      }
    }
  }
  const shotGeometry = new THREE.SphereGeometry(0.22, 8, 6),
    oilGeometry = new THREE.CylinderGeometry(1.1, 1.1, 0.06, 20),
    oilMat = new THREE.MeshStandardMaterial({
      color: 0x28233d,
      metalness: 0.7,
      roughness: 0.15,
    });
  const nextGate = new THREE.Mesh(
    new THREE.TorusGeometry(7, 0.1, 6, 24, Math.PI),
    new THREE.MeshBasicMaterial({
      color: 0xd0fc85,
      transparent: true,
      opacity: 0.55,
    }),
  );
  group.add(nextGate);
  const shots: THREE.Mesh[] = [];
  const shields = new Map<string, THREE.Mesh>();
  const shieldGeometry = new THREE.SphereGeometry(1.9, 16, 12),
    shieldMat = new THREE.MeshBasicMaterial({
      color: 0x64d5ff,
      transparent: true,
      opacity: 0.2,
      wireframe: true,
    });
  return {
    update(m: Match, dt: number) {
      const player = m.players.find((p) => p.id === userId);
      if (player) {
        const t = (player.checkpoint / 12) * TAU,
          p = track(t);
        nextGate.position.set(p.x, 0.2, p.z);
        nextGate.rotation.y = tangent(t);
      }

      for (const [id, g] of targets) {
        g.visible = !m.cleared.includes(id);
        g.rotation.y += dt;
      }
      for (let i = 0; i < m.shots.length; i++) {
        const s = m.shots[i];
        let mesh = shots[i];
        if (!mesh) {
          mesh = new THREE.Mesh(shotGeometry, gold);
          shots.push(mesh);
          group.add(mesh);
        }
        mesh.visible = true;
        mesh.geometry = s.kind === "oil" ? oilGeometry : shotGeometry;
        mesh.material = s.kind === "oil" ? oilMat : gold;
        mesh.position.set(s.x, s.kind === "oil" ? 0.16 : 1, s.z);
      }
      for (let i = m.shots.length; i < shots.length; i++)
        shots[i].visible = false;
      for (const p of m.players) {
        let mesh = shields.get(p.id);
        if (!mesh) {
          mesh = new THREE.Mesh(shieldGeometry, shieldMat);
          shields.set(p.id, mesh);
          group.add(mesh);
        }
        mesh.visible = p.shield > 0;
        mesh.position.set(p.vehicle.x, 1, p.vehicle.z);
      }
    },
  };
}
