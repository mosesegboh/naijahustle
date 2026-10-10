import * as THREE from "three";
import { ModelKit, type Obstacle } from "./models";
import { mergeStatic } from "./mergeStatic";
export interface Door {
  name: string;
  x: number;
  z: number;
}
export const centralDoors: Door[] = [
  { name: "Balogun Market", x: 9.6, z: 13.8 },
  { name: "Mainland Bank", x: 8, z: 33.2 },
  { name: "Police reception", x: 38, z: 13 },
  { name: "Your apartment", x: 38, z: 33.5 },
];
export function districtAt(x: number, z: number) {
  return { x: Math.floor((x + 16) / 80), z: Math.floor((z + 16) / 80) };
}
export function lots(cx: number, cz: number) {
  return [-7, 8, 42, 56].flatMap((x, i) =>
    [-7, 6, 39, 55].map((z, j) => ({
      x: cx * 80 + x,
      z: cz * 80 + z,
      width: 9,
      depth: 8,
      height: 3 + Math.abs((cx * 31 + cz * 17 + i * 7 + j * 3) % 7),
    })),
  );
}
function dispose(root: THREE.Group, kit: ModelKit) {
  root.traverse((o) => {
    if (
      o instanceof THREE.Mesh &&
      o.material instanceof THREE.MeshBasicMaterial
    ) {
      o.material.map?.dispose();
      o.material.dispose();
    }
  });
  root.removeFromParent();
  kit.dispose();
}
export class Districts {
  readonly root = new THREE.Group();
  private chunks = new Map<
    string,
    { root: THREE.Group; kit: ModelKit; obstacles: Obstacle[]; doors: Door[] }
  >();
  update(x: number, z: number) {
    const c = districtAt(x, z),
      keep = new Set<string>();
    for (let cx = c.x - 1; cx <= c.x + 1; cx++)
      for (let cz = c.z - 1; cz <= c.z + 1; cz++) {
        if (!cx && !cz) continue;
        const key = `${cx},${cz}`;
        keep.add(key);
        if (this.chunks.has(key)) continue;
        const kit = new ModelKit(),
          root = new THREE.Group(),
          ox = cx * 80,
          oz = cz * 80;
        kit.box(root, 0xa9b393, ox + 24, -0.18, oz + 24, 80, 0.3, 80);
        kit.box(root, 0x666d69, ox + 24, 0, oz + 24, 7, 0.08, 80);
        kit.box(root, 0x666d69, ox + 24, 0, oz + 18, 80, 0.08, 6);
        const obstacles = lots(cx, cz),
          doors: Door[] = [];
        obstacles.forEach((lot, i) => {
          const { x, z, width, depth, height } = lot;
          kit.box(
            root,
            [0xd1a777, 0xbec7b7, 0xe3cfa3, 0xbb917b][i % 4],
            x,
            height / 2,
            z,
            width,
            height,
            depth,
          );
          kit.box(
            root,
            0x59635b,
            x,
            height + 0.12,
            z,
            width + 0.5,
            0.24,
            depth + 0.5,
          );
          kit.box(root, 0x41372f, x, 1.1, z + 4.04, 1.2, 2.2, 0.1);
          for (const dx of [-3, 3])
            kit.box(root, 0x799caa, x + dx, 1.8, z + 4.08, 1.6, 1.4, 0.12);
          // Balconies, shaded shopfronts, roof utilities and upper windows.
          for (let y = 3.4; y < height - 0.3; y += 1.7)
            for (const dx of [-3, 0, 3]) {
              kit.box(root, 0x577d83, x + dx, y, z + 4.09, 1.5, 1, 0.12);
              kit.box(
                root,
                0xe9ddbd,
                x + dx,
                y - 0.6,
                z + 4.28,
                1.8,
                0.12,
                0.5,
              );
            }
          if (i % 4 === 0) {
            kit.box(root, 0x477d65, x, 2.65, z + 4.7, 6, 0.18, 1.5);
            for (const dx of [-2.8, 2.8])
              kit.tube(root, 0x65573e, x + dx, 1.3, z + 5.3, 0.07, 2.6);
            kit.box(root, 0xbf8c52, x + 2, 0.5, z + 4.8, 1.4, 1, 0.8);
          }
          kit.tube(root, 0x4f6157, x + 2, height + 0.8, z - 1, 0.75, 1.3);
          kit.box(
            root,
            0x354e60,
            x - 1.7,
            height + 0.35,
            z - 1,
            2.3,
            0.15,
            1.6,
          );
          kit.plant(root, x - 3, z + 4.8, 0.8);
          const door = {
            name: `${["Corner shop", "Neighbourhood office", "Community hall", "Family home"][i % 4]} ${cx}:${cz}/${i + 1}`,
            x,
            z: z + 5.2,
          };
          doors.push(door);
          kit.text(root, "ENTER · E", x, 2.8, z + 4.2, 3);
        });
        for (let n = 0; n < 6; n++) {
          const z = oz - 10 + n * 13;
          kit.tube(root, 0x4a5148, ox + 29, 2.5, z, 0.1, 5);
          kit.box(root, 0xffe6a6, ox + 29, 5, z, 0.8, 0.2, 0.5);
          kit.tree(root, ox + 18, z, 0.8);
          kit.box(root, 0xe3d6a3, ox + 24, 0.06, z, 0.15, 0.02, 3);
        }
        mergeStatic(root, kit, []);
        this.root.add(root);
        this.chunks.set(key, { root, kit, obstacles, doors });
      }
    for (const [key, chunk] of this.chunks)
      if (!keep.has(key)) {
        dispose(chunk.root, chunk.kit);
        this.chunks.delete(key);
      }
  }
  get obstacles() {
    return [...this.chunks.values()].flatMap((c) => c.obstacles);
  }
  get doors() {
    return [
      ...centralDoors,
      ...[...this.chunks.values()].flatMap((c) => c.doors),
    ];
  }
  dispose() {
    for (const c of this.chunks.values()) dispose(c.root, c.kit);
    this.chunks.clear();
  }
}
