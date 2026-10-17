import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { track, tangent, TAU, ROAD_WIDTH } from "./physics";
export function buildEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
) {
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 64 });
  scene.environment = env.texture;
  scene.environmentIntensity = 0.65;
  room.dispose();
  pmrem.dispose();
  scene.background = new THREE.Color("#91d6f0");
  scene.fog = new THREE.Fog("#91d6f0", 170, 420);
  scene.add(new THREE.HemisphereLight(0xd6efff, 0xd1ae73, 1.3));
  const sun = new THREE.DirectionalLight(0xffedc5, 3.3);
  sun.position.set(-40, 65, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -32;
  sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 32;
  sun.shadow.camera.bottom = -32;
  sun.shadow.camera.far = 170;
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.00015;
  scene.add(sun, sun.target);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: number, roughness = 0.8) => {
    const key = `${color}:${roughness}`;
    if (!materials.has(key))
      materials.set(key, new THREE.MeshStandardMaterial({ color, roughness }));
    return materials.get(key)!;
  };
  const sand = material(0xf1d297),
    pavement = material(0xe0bd96),
    green = material(0x76b558),
    dark = material(0x293c3c),
    white = material(0xf6ecce);
  function box(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = scene,
  ) {
    const radius = Math.min(0.25, Math.min(w, h, d) * 0.2);
    const geometry =
      Math.min(w, h, d) > 0.18
        ? new RoundedBoxGeometry(w, h, d, 2, radius)
        : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function ovalGround(x: number, z: number, y: number, mat: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 128), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(x, z, 1);
    mesh.position.y = y;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  ovalGround(153, 108, -0.3, sand);
  ovalGround(135, 88, -0.11, material(0x8bc779));
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1100, 1100),
    new THREE.MeshPhysicalMaterial({
      color: 0x168ca8,
      roughness: 0.32,
      metalness: 0.18,
      clearcoat: 0.8,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.65;
  const waveCanvas = document.createElement("canvas");
  waveCanvas.width = waveCanvas.height = 128;
  const waveContext = waveCanvas.getContext("2d")!;
  const waveData = waveContext.createImageData(128, 128);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      waveData.data[i] = 128 + Math.sin(((x + y) * Math.PI) / 16) * 18;
      waveData.data[i + 1] = 128 + Math.cos((y * Math.PI) / 16) * 18;
      waveData.data[i + 2] = 250;
      waveData.data[i + 3] = 255;
    }
  waveContext.putImageData(waveData, 0, 0);
  const normal = new THREE.CanvasTexture(waveCanvas);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(160, 160);
  water.material.normalMap = normal;
  water.material.normalScale.set(0.25, 0.25);
  scene.add(water);
  function ribbon(width: number, y: number, mat: THREE.Material, offset = 0) {
    const vertices = [],
      uvs = [],
      indices = [];
    for (let i = 0; i <= 360; i++) {
      const t = (i / 360) * TAU,
        p = track(t),
        a = tangent(t);
      for (const side of [-1, 1]) {
        vertices.push(
          p.x + Math.cos(a) * ((width / 2) * side + offset),
          y,
          p.z - Math.sin(a) * ((width / 2) * side + offset),
        );
        uvs.push(side === 1 ? 1 : 0, i / 6);
      }
    }
    for (let i = 0; i < 360; i++) {
      const n = i * 2;
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    scene.add(m);
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3f4c60";
  ctx.fillRect(0, 0, 128, 128);
  let seed = 17;
  for (let i = 0; i < 5000; i++) {
    seed = (seed * 16807) % 2147483647;
    const x = seed % 128;
    seed = (seed * 16807) % 2147483647;
    ctx.fillStyle = i % 2 ? "#465268" : "#394659";
    ctx.fillRect(x, seed % 128, 1, 1);
  }
  const asphalt = new THREE.CanvasTexture(canvas);
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.repeat.set(4, 1);
  asphalt.colorSpace = THREE.SRGBColorSpace;
  asphalt.anisotropy = 8;
  ribbon(ROAD_WIDTH + 5, -0.08, pavement);
  ribbon(
    ROAD_WIDTH,
    0.015,
    new THREE.MeshStandardMaterial({
      map: asphalt,
      roughness: 0.94,
      side: THREE.DoubleSide,
    }),
  );
  // Continuous curved shoulders replace disconnected block kerbs.
  for (const side of [-1, 1]) {
    ribbon(0.65, 0.08, material(0x21b7a6), side * (ROAD_WIDTH / 2 + 0.32));
    ribbon(0.12, 0.09, white, side * (ROAD_WIDTH / 2 - 0.15));
    ribbon(0.18, 0.085, material(0xffcd50), side * (ROAD_WIDTH / 2 + 1));
  }
  for (let i = 0; i < 120; i++) {
    const t = (i / 120) * TAU,
      p = track(t),
      a = tangent(t);
    if (i % 3 === 0) {
      const line = box(0.13, 0.015, 1.6, white, p.x, 0.04, p.z);
      line.rotation.y = a;
    }
  }
  // A grassy central island, keeping track silhouettes readable from the chase camera.
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(34, 35, 0.5, 64),
    green,
  );
  island.scale.set(1.3, 1, 0.8);
  island.position.y = -0.12;
  island.receiveShadow = true;
  scene.add(island);
  function sign(
    text: string,
    sub: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    yaw = 0,
  ) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#123e38";
    g.fillRect(0, 0, 1024, 256);
    g.fillStyle = "#edc24f";
    g.fillRect(0, 0, 16, 256);
    g.font = "900 76px Arial";
    g.fillText(text, 45, 111);
    g.fillStyle = "#f6e9c8";
    g.font = "28px Arial";
    g.fillText(sub, 49, 178);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.2),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.65 }),
    );
    m.position.set(x, y, z);
    m.rotation.y = yaw;
    scene.add(m);
    return m;
  }
  const gate = new THREE.Group();
  gate.position.set(0, 0, 48);
  gate.rotation.y = tangent(0);
  scene.add(gate);
  box(0.45, 7, 0.45, dark, -9, 3.5, 0, gate);
  box(0.45, 7, 0.45, dark, 9, 3.5, 0, gate);
  box(18, 1.9, 0.55, dark, 0, 7, 0, gate);
  const start = sign(
    "EKO / STREET KINGS",
    "MARINA CIRCUIT     •     NAIJA HUSTLE",
    17,
    1.7,
    0,
    0,
    0,
  );
  gate.add(start);
  start.position.set(0, 7, 0.31);
  for (let row = 0; row < 2; row++)
    for (let c = 0; c < 16; c++) {
      const tile = box(
        1,
        0.025,
        0.7,
        (c + row) % 2 ? dark : white,
        c - 7.5,
        0.055,
        row * 0.7,
        gate,
      );
      tile.castShadow = false;
    }
  const colors = [0xf17c64, 0xfac74d, 0x20bba8, 0x9b80d2, 0x5cb8e6, 0xf5a767];
  function arch(
    w: number,
    h: number,
    depth: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
  ) {
    const shape = new THREE.Shape(),
      r = w / 2;
    shape.moveTo(-r, 0);
    shape.lineTo(r, 0);
    shape.lineTo(r, h - r);
    shape.absarc(0, h - r, r, 0, Math.PI, false);
    shape.lineTo(-r, 0);
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.035,
        bevelThickness: 0.025,
        curveSegments: 14,
      }),
      mat,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function foliage(
    x: number,
    y: number,
    z: number,
    r: number,
    mat: THREE.Material,
    parent: THREE.Object3D = scene,
  ) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat);
    m.position.set(x, y, z);
    m.scale.set(1, 0.8, 0.85);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  for (let i = 0; i < 16; i++) {
    const t = 0.18 + (i / 16) * TAU,
      p = track(t),
      yaw = tangent(t);
    const group = new THREE.Group();
    group.position.set(p.x + Math.cos(yaw) * 25, 0, p.z - Math.sin(yaw) * 25);
    // Front doors and balconies face the track rather than the coastline.
    group.rotation.y = yaw - Math.PI / 2;
    scene.add(group);
    const h = 7 + (i % 4) * 2.3,
      w = 8 + (i % 3),
      facade = material(colors[i % colors.length]);
    box(w, h, 7, facade, 0, h / 2, 0, group);
    box(w + 0.5, 0.38, 7.5, white, 0, h, 0, group);
    box(w + 0.35, 0.2, 7.3, material(0xffdc95), 0, 3.3, 0, group);
    if (i % 3 === 0) {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(w * 0.42, 24, 12, 0, TAU, 0, Math.PI / 2),
        material(0xd6654e),
      );
      dome.position.set(0, h + 0.2, 0);
      dome.scale.y = 0.45;
      dome.castShadow = true;
      group.add(dome);
    } else {
      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.48, w * 0.58, 0.85, 4),
        material(i % 2 ? 0xcb6959 : 0x3c8f9b),
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.y = h + 0.55;
      roof.scale.z = 0.8;
      group.add(roof);
    }
    for (let floor = 0; floor < Math.floor(h / 3); floor++)
      for (let column = 0; column < 3; column++) {
        const xx = -w * 0.31 + column * w * 0.31,
          yy = 0.8 + floor * 2.8;
        arch(1.65, 2, 0.08, white, xx, yy, 3.51, group);
        arch(
          1.35,
          1.73,
          0.09,
          material(0x28566f, 0.3),
          xx,
          yy + 0.12,
          3.62,
          group,
        );
        box(0.06, 1.3, 0.07, white, xx, yy + 0.83, 3.77, group);
        if (floor > 0) {
          box(1.95, 0.16, 0.85, white, xx, yy - 0.12, 3.95, group);
          box(1.95, 0.09, 0.07, dark, xx, yy + 0.65, 4.35, group);
          for (let k = 0; k < 5; k++)
            box(
              0.055,
              0.7,
              0.055,
              dark,
              xx - 0.8 + k * 0.4,
              yy + 0.29,
              4.35,
              group,
            );
          box(0.65, 0.22, 0.28, material(0xcb7053), xx, yy + 0.07, 4.03, group);
          for (let k = 0; k < 3; k++) {
            foliage(
              xx - 0.23 + k * 0.23,
              yy + 0.28,
              4.03,
              0.23,
              material(0x258663),
              group,
            );
            foliage(
              xx - 0.23 + k * 0.23,
              yy + 0.42,
              4.05,
              0.09,
              material(i % 2 ? 0xffc843 : 0xed639c),
              group,
            );
          }
        }
      }
    for (let stripe = 0; stripe < 10; stripe++) {
      const canopy = box(
        w / 10,
        0.12,
        1.8,
        stripe % 2 ? white : material(colors[(i + 2) % colors.length]),
        -w / 2 + ((stripe + 0.5) * w) / 10,
        2.8,
        4.15,
        group,
      );
      canopy.rotation.x = 0.16;
      box(
        w / 10,
        0.35,
        0.1,
        stripe % 2 ? white : material(colors[(i + 2) % colors.length]),
        -w / 2 + ((stripe + 0.5) * w) / 10,
        2.45,
        5,
        group,
      );
    }
    const board = sign(
      ["MAMA BISI’S", "EKO AUTO", "SUYA SPOT", "MARINA STORES"][i % 4],
      "LAGOS • GOOD VIBES ONLY",
      w - 0.5,
      1,
      0,
      0,
      0,
    );
    group.add(board);
    board.position.set(0, 3.55, 3.75);
    for (const side of [-1, 1]) {
      box(
        0.8,
        0.8,
        0.8,
        material(0xd57c59),
        side * (w / 2 + 0.6),
        0.4,
        4,
        group,
      );
      foliage(side * (w / 2 + 0.6), 1.2, 4, 0.85, material(0x368c64), group);
    }
  }
  function palm(x: number, z: number, size: number) {
    const top = new THREE.Vector3(x + 0.45 * size, 7 * size, z);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0, z),
      new THREE.Vector3(x - 0.12, 3.5 * size, z),
      top,
    ]);
    const trunk = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 12, 0.2 * size, 10, false),
      material(0xad8354),
    );
    trunk.castShadow = true;
    scene.add(trunk);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU,
        vertices = [],
        uv = [],
        indices = [];
      for (let j = 0; j <= 14; j++) {
        const t = j / 14,
          len = 3.4 * size * t,
          width = Math.sin(Math.PI * t) * 0.55 * size;
        for (const side of [-1, 1]) {
          vertices.push(
            top.x + Math.sin(a) * len + Math.cos(a) * width * side,
            top.y +
              Math.sin(t * Math.PI) * 0.9 * size -
              t * 1.25 * size -
              Math.abs(width) * 0.1,
            top.z + Math.cos(a) * len - Math.sin(a) * width * side,
          );
          uv.push((side + 1) / 2, t);
        }
      }
      for (let j = 0; j < 14; j++) {
        let n = j * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(indices);
      g.computeVertexNormals();
      const mat = material(k % 2 ? 0x31a367 : 0x65bc57);
      mat.side = THREE.DoubleSide;
      const leaf = new THREE.Mesh(g, mat);
      leaf.castShadow = true;
      scene.add(leaf);
    }
    for (let k = 0; k < 3; k++)
      foliage(
        top.x + Math.cos(k * 2) * 0.2,
        top.y - 0.2,
        top.z + Math.sin(k * 2) * 0.2,
        0.22,
        material(0xa48749),
      );
  }
  for (let i = 0; i < 25; i++) {
    const t = (i / 25) * TAU,
      p = track(t),
      a = tangent(t);
    palm(p.x + Math.cos(a) * 15, p.z - Math.sin(a) * 15, 0.85 + (i % 3) * 0.1);
  }
  for (let i = 0; i < 50; i++) {
    const t = (i / 50) * TAU,
      p = track(t),
      a = tangent(t);
    foliage(
      p.x - Math.cos(a) * 13,
      0.5,
      p.z + Math.sin(a) * 13,
      0.9,
      material(i % 2 ? 0x40955e : 0x57b574),
    );
  }
  // Colourful pennants over the starting straight, outside the driving clearance.
  for (const t of [0.3, 0.62]) {
    const p = track(t),
      a = tangent(t),
      points = [];
    for (let i = 0; i <= 20; i++) {
      const offset = -11 + i * 1.1,
        y = 7.5 - Math.sin((i / 20) * Math.PI) * 1.1;
      const x = p.x + Math.cos(a) * offset,
        z = p.z - Math.sin(a) * offset;
      points.push(new THREE.Vector3(x, y, z));
      if (i > 0 && i < 20) {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [
              x,
              y,
              z,
              x + Math.cos(a) * 0.7,
              y,
              z - Math.sin(a) * 0.7,
              x + Math.cos(a) * 0.35,
              y - 0.85,
              z - Math.sin(a) * 0.35,
            ],
            3,
          ),
        );
        g.computeVertexNormals();
        const m = material(colors[i % colors.length]);
        m.side = THREE.DoubleSide;
        scene.add(new THREE.Mesh(g, m));
      }
    }
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0x5e6e6c }),
      ),
    );
    for (const side of [-1, 1])
      box(
        0.18,
        7.5,
        0.18,
        white,
        p.x + Math.cos(a) * 11 * side,
        3.75,
        p.z - Math.sin(a) * 11 * side,
      );
  }
  // Lagoon-side skyline and a cable bridge provide depth beyond the driving circuit.
  for (let i = 0; i < 22; i++) {
    const h = 12 + ((i * 17) % 28);
    box(
      6,
      h,
      7,
      material(i % 2 ? 0x8caeb4 : 0xa9bec1),
      -125 + i * 12,
      h / 2,
      -145 - (i % 3) * 8,
    );
  }
  box(210, 1, 7, material(0x929e9e), 0, 5, -113);
  for (const x of [-45, 45]) {
    box(1.2, 37, 1.2, white, x, 20, -113);
    for (let i = 1; i < 7; i++)
      for (const side of [-1, 1]) {
        const a = new THREE.Vector3(x, 36, -113),
          b = new THREE.Vector3(x + side * i * 5, 5.5, -113);
        const g = new THREE.BufferGeometry().setFromPoints([a, b]);
        scene.add(
          new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xe7eadf })),
        );
      }
  }
  sign("THIS IS LAGOS.", "YOUR WORLD. YOUR HUSTLE.", 14, 3, -8, 5, 15);
  // Low-cost trackside flower beds and lamps, batched with the scenery.
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * TAU,
      p = track(t),
      a = tangent(t);
    const x = p.x + Math.cos(a) * (ROAD_WIDTH / 2 + 4);
    const z = p.z - Math.sin(a) * (ROAD_WIDTH / 2 + 4);
    box(2.4, 0.5, 1.1, material(0xe1ad7e), x, 0.25, z);
    for (let j = 0; j < 3; j++) {
      foliage(x + (j - 1) * 0.6, 0.75, z, 0.42, green);
      foliage(
        x + (j - 1) * 0.6,
        1.02,
        z,
        0.18,
        material([0xffcc54, 0xf485a5, 0xe8d5ff][i % 3]),
      );
    }
    if (i % 3 === 0) {
      box(0.14, 4.8, 0.14, dark, x + 1.6, 2.4, z);
      box(0.8, 0.1, 0.1, dark, x + 1.25, 4.8, z);
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 8, 6),
        material(0xffdf96),
      );
      lantern.position.set(x + 0.9, 4.6, z);
      scene.add(lantern);
    }
  }
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xf7f4eb });
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 6),
        cloudMaterial,
      );
      cloud.position.set(-110 + i * 45 + j * 5, 55 + (i % 2) * 9, -140);
      cloud.scale.set(8, 2.5 + (j % 2), 4);
      scene.add(cloud);
    }
  }
  // Batch static scenery by material to keep browser draw-call cost small.
  scene.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  scene.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object !== water &&
      !Array.isArray(object.material)
    ) {
      const group = batches.get(object.material) ?? [];
      group.push(object);
      batches.set(object.material, group);
    }
  });
  for (const [mat, meshes] of batches) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((m) => {
      const g = m.geometry.index
        ? m.geometry.toNonIndexed()
        : m.geometry.clone();
      // Untextured pennants need UVs too so every batch has compatible attributes.
      if (!g.getAttribute("uv"))
        g.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(
            new Float32Array(g.getAttribute("position").count * 2),
            2,
          ),
        );
      return g.applyMatrix4(m.matrixWorld);
    });
    const merged = mergeGeometries(geometries);
    for (const g of geometries) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    for (const original of meshes) {
      original.removeFromParent();
      original.geometry.dispose();
    }
    scene.add(mesh);
  }
  return { sun, env, water };
}
