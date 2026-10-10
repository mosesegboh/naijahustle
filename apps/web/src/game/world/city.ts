import * as THREE from "three";
import { BUILDINGS, NPCS } from "@naija-hustle/shared";
import { ModelKit } from "./models";
export const CITY_SCALE = 25;
export function buildCity(kit: ModelKit) {
  const root = new THREE.Group();
  const box = kit.box.bind(kit, root);
  const signals: {
    root: THREE.Group;
    red: THREE.Mesh;
    amber: THREE.Mesh;
    green: THREE.Mesh;
    axis: string;
  }[] = [];
  const solidBuildings: {
    x: number;
    z: number;
    width: number;
    depth: number;
  }[] = [];
  box("#73b9c2", 23, -0.45, 20, 130, 0.4, 105);
  box("#b4c99a", 23, -0.19, 15, 75, 0.42, 52);
  box("#c8c7a6", 23, -0.02, 40.5, 75, 0.14, 1.1);
  // Main avenues, pavements and crossing markings.
  for (const [x, z, w, d] of [
    [24, 17, 6.5, 49],
    [22, 18, 73, 5.6],
    [22, -2, 73, 3.8],
    [22, 35.5, 73, 3.8],
    [-7, 16, 3.6, 49],
    [53, 16, 3.6, 49],
  ]) {
    box("#dfe0cb", x, 0.08, z, w + 1.2, 0.16, d + 1.2);
    box("#6a7877", x, 0.18, z, w, 0.06, d);
  }
  for (let x = -12; x < 59; x += 2.1)
    if (Math.abs(x - 24) > 4) box("#dbe1ca", x, 0.222, 18, 0.8, 0.012, 0.08);
  for (let z = -8; z < 42; z += 2.2)
    if (Math.abs(z - 18) > 3) box("#dbe1ca", 24, 0.222, z, 0.08, 0.012, 0.8);
  for (let i = 0; i < 7; i++) {
    box("#f4efdb", 20.2, 0.226, 15.8 + i * 0.64, 0.7, 0.018, 0.32);
    box("#f4efdb", 27.8, 0.226, 15.8 + i * 0.64, 0.7, 0.018, 0.32);
  }
  function building(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    color: string,
    roof = "#547c70",
  ) {
    solidBuildings.push({ x, z, width: w, depth: d });
    box("#d8d3bb", x, 0.16, z, w + 0.7, 0.2, d + 0.7);
    box(color, x, h / 2 + 0.25, z, w, h, d);
    box(roof, x, h + 0.33, z, w + 0.2, 0.22, d + 0.2);
    // Roof parapets and water tanks are true geometry.
    box("#e9e0ca", x, h + 0.51, z - d / 2, w, 0.21, 0.1);
    box("#e9e0ca", x - w / 2, h + 0.51, z, 0.1, 0.21, d);
    for (let row = 0; row < Math.max(1, Math.floor(h / 1.05)); row++)
      for (let col = 0; col < Math.max(1, Math.floor(w / 0.9)); col++) {
        const wx = x - w / 2 + 0.5 + col * 0.85;
        if (wx < x + w / 2 - 0.2) {
          box(
            "#3d6266",
            wx,
            0.9 + row * 1.0,
            z + d / 2 + 0.012,
            0.43,
            0.56,
            0.025,
          );
          box(
            "#ccd5bc",
            wx,
            0.6 + row * 1.0,
            z + d / 2 + 0.04,
            0.51,
            0.06,
            0.09,
          );
        }
      }
    box("#345e59", x, 0.78, z + d / 2 + 0.03, 0.55, 1.05, 0.05);
  }
  // Street furniture, zebra crossings and signal poles frame the active junction.
  for (const x of [19, 29])
    for (const z of [13, 23]) {
      kit.tube(root, 0x46554d, x, 1.8, z, 0.09, 3.6);
      box("#303e38", x, 3.25, z, 0.42, 0.95, 0.35);
      const lights = new THREE.Group();
      root.add(lights);
      signals.push({
        root: lights,
        axis: x === 19 ? "x" : "z",
        red: kit.ball(lights, 0xdc785a, x, 3.5, z + 0.2, 0.14),
        amber: kit.ball(lights, 0xd8b55d, x, 3.25, z + 0.2, 0.14),
        green: kit.ball(lights, 0x70a578, x, 3, z + 0.2, 0.14),
      });
    }
  for (const x of [5, 13, 36, 44]) {
    box("#826349", x, 0.6, 22.8, 1.8, 0.15, 0.5);
    box("#617965", x, 1, 23, 1.8, 0.7, 0.12);
    kit.tube(root, 0x507064, x + 1.5, 0.45, 23, 0.25, 0.9);
  }
  // Four interactive district blocks retain the existing gameplay footprints.
  building(8, 7.4, 5.6, 3.5, 2.1, "#e5c487", "#759f82");
  kit.text(root, "BALOGUN MARKET", 8, 2.1, 9.18, 4.7, "#31584c");
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 5; i++) {
      const x = 4.2 + i * 2.55,
        z = 11.2 - row * 2.8;
      box("#ae855e", x, 0.72, z, 1.95, 1.2, 1.9);
      box(
        ["#cd7755", "#e0b94f", "#6e9b83", "#659ba9", "#d68c64"][i],
        x,
        1.52,
        z + 0.2,
        2.2,
        0.16,
        2.25,
      );
      for (let k = 0; k < 3; k++)
        kit.ball(
          root,
          ["#d9a640", "#ba684a", "#74975d"][k],
          x - 0.55 + k * 0.5,
          1.08,
          z + 1,
          0.18,
        );
    }
  building(38, 7.5, 5.7, 4, 3.4, "#dbded2", "#506d7a");
  building(33.8, 6, 2.2, 2.5, 1.8, "#d7d8c8");
  kit.text(root, "COMMUNITY POLICE", 38, 2.72, 9.52, 4.8, "#355265");
  kit.tube(root, "#7d928a", 41.2, 2.0, 9, 0.045, 3.8);
  box("#279660", 41.4, 3.5, 9, 0.5, 0.5, 0.035);
  box("#f4efdb", 41.6, 3.5, 9, 0.18, 0.5, 0.04);
  building(8, 27.4, 4.3, 4.2, 6.2, "#c8d4c7", "#477575");
  building(12.1, 29.1, 2.8, 3, 3.5, "#e6d3af", "#72938b");
  kit.text(root, "HUSTLE BANK", 8, 2.7, 29.52, 3.8);
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 3; i++) {
      building(
        34.2 + i * 3.5,
        25.4 + row * 4.35,
        2.65,
        3.45,
        1.9,
        ["#e7c098", "#ced8b3", "#ebd4aa"][i],
        ["#a0644e", "#6f8b78", "#be8f61"][i],
      );
    }
  kit.text(root, "THE COMPOUND", 37.7, 2.5, 31.57, 4.2);
  // Neighbouring streets establish scale and a city beyond the first mission.
  for (let i = 0; i < 9; i++) {
    const x = -3 + i * 6.1;
    if (Math.abs(x - 24) < 6) continue;
    building(
      x,
      -7.1,
      3.6,
      3.9,
      2 + (i % 3) * 1.6,
      ["#d6c7ac", "#d5dcbf", "#e8c59e"][i % 3],
    );
    if (i % 2 === 0)
      kit.tube(root, "#526667", x + 0.8, 3.2 + (i % 3) * 1.6, -7.6, 0.43, 0.8);
  }
  for (let i = 0; i < 5; i++) {
    if (i === 2 || i === 3) continue;
    building(-12, 1 + i * 7, 4.7, 4.5, 2.4 + (i % 3), "#e4d1b0", "#7e9279");
    building(59, 1 + i * 7, 4.7, 4.5, 3.4 + (i % 3), "#c9d5bf", "#688c8a");
  }
  // Waterfront promenade, boats and far shore.
  for (let i = 0; i < 25; i++) {
    if (i >= 11 && i <= 13) continue;
    box("#d8dfcd", -12 + i * 3, 0.9, 39.7, 0.11, 1.7, 0.11);
    if (i < 24) box("#d8dfcd", -10.5 + i * 3, 1.6, 39.7, 3, 0.09, 0.08);
  }
  box("#aec199", 22, -0.2, 58, 80, 0.6, 15);
  box("#b9bfa5", 24, 0.15, 48, 4, 0.5, 19);
  for (let i = 0; i < 6; i++) {
    if (i === 3) continue;
    building(-5 + i * 10, 57, 4.6, 4.8, 2.8, "#ddd2b5");
    kit.tree(root, 1 + i * 10, 54, 1.4, true);
  }
  for (const [x, z] of [
    [5, 45],
    [42, 49],
  ]) {
    const boat = box("#f1e5c9", x, 0.12, z, 2.7, 0.55, 0.9);
    boat.rotation.y = 0.2;
    box("#cd7b54", x, 0.49, z, 1.2, 0.25, 0.8);
  }
  // Trees, palms, benches, planter beds and lampposts.
  for (const [x, z] of [
    [2, 2],
    [17, 4],
    [18, 11],
    [30, 2],
    [45, 12],
    [17, 24],
    [3, 33],
    [45, 33],
    [29, 32],
    [-3, 24],
    [49, 24],
    [8, 38],
    [18, 38],
    [34, 38],
    [45, 38],
  ])
    kit.tree(root, x, z, 1 + (Math.abs(x) % 3) * 0.15, z > 35);
  for (const [x, z] of [
    [18, 29],
    [46, 5],
    [-3, 8],
  ]) {
    box("#719462", x, 0.17, z, 3.5, 0.2, 4.5);
    for (let j = 0; j < 3; j++) kit.tree(root, x - 1 + j, z - 1 + j * 0.8, 0.8);
  }
  for (const x of [1, 13, 34, 46]) {
    box("#956e4c", x, 0.5, 38, 1.6, 0.12, 0.48);
    box("#956e4c", x, 0.87, 38.25, 1.6, 0.7, 0.1);
    for (const dx of [-0.6, 0.6])
      box("#536555", x + dx, 0.25, 38, 0.1, 0.5, 0.4);
  }
  for (const x of [1, 17, 31, 47])
    for (const z of [14, 22]) {
      kit.tube(root, "#6f7c6b", x, 1.55, z, 0.045, 3);
      box("#f0e3b4", x, 3.07, z, 0.4, 0.16, 0.3);
    }
  const traffic: THREE.Group[] = [];
  function car(x: number, z: number, color: string, bus = false) {
    const g = new THREE.Group();
    root.add(g);
    g.position.set(x, 0.28, z);
    kit.box(g, color, 0, 0.45, 0, bus ? 2.3 : 1.7, 0.7, 0.95);
    kit.box(g, color, 0, 0.96, 0, bus ? 1.8 : 1.0, 0.4, 0.84);
    kit.box(g, "#496970", 0.1, 1.03, 0.43, bus ? 1.5 : 0.7, 0.25, 0.025);
    for (const dx of [-0.58, 0.58])
      for (const dz of [-0.46, 0.46]) {
        const wheel = kit.tube(g, "#35403c", dx, 0.18, dz, 0.22, 0.15);
        wheel.rotation.x = Math.PI / 2;
      }
    if (bus) kit.box(g, "#42473d", 0, 0.55, 0.487, 2.3, 0.08, 0.03);
    return g;
  }
  traffic.push(
    car(7, 19.4, "#e9b83f", true),
    car(37, 16.5, "#ecdfbf"),
    car(24.9, 4, "#779ba1"),
    car(-10, 19.3, "#aa765c"),
    car(58, 16.5, "#617a91"),
    car(22.3, 5, "#b8a56c"),
  );
  for (const x of [35, 38, 41]) car(x, 11.8, "#4b6c88");
  const npcs = NPCS.map((n) => {
    const person = kit.person(root, n.color, n.x / 25, n.y / 25, 1);
    person.group.rotation.y = -0.3;
    return { id: n.id, model: person };
  });
  const obstacles = BUILDINGS.map((b) => ({
    x: b.x / 25,
    z: b.y / 25,
    width: b.width / 25,
    depth: b.height / 25,
  }));
  obstacles.push(...solidBuildings);
  return { root, obstacles, npcs, traffic, signals };
}
