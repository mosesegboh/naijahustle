import * as THREE from "three";
// Shared geometry/materials keep these original, procedural models inexpensive.
export class ModelKit {
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private geometries: THREE.BufferGeometry[] = [];
  readonly cube = this.geometry(new THREE.BoxGeometry(1, 1, 1));
  readonly sphere = this.geometry(new THREE.SphereGeometry(1, 10, 8));
  readonly cylinder = this.geometry(new THREE.CylinderGeometry(1, 1, 1, 12));
  readonly cone = this.geometry(new THREE.ConeGeometry(1, 1, 7));
  geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }
  material(color: THREE.ColorRepresentation) {
    const key = String(color);
    let m = this.materials.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      this.materials.set(key, m);
    }
    return m;
  }
  mesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    color: THREE.ColorRepresentation,
    x: number,
    y: number,
    z: number,
    w = 1,
    h = 1,
    d = 1,
  ) {
    const mesh = new THREE.Mesh(geometry, this.material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  box(
    parent: THREE.Object3D,
    color: THREE.ColorRepresentation,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    return this.mesh(parent, this.cube, color, x, y, z, w, h, d);
  }
  ball(
    parent: THREE.Object3D,
    color: THREE.ColorRepresentation,
    x: number,
    y: number,
    z: number,
    w: number,
    h = w,
    d = w,
  ) {
    return this.mesh(parent, this.sphere, color, x, y, z, w, h, d);
  }
  tube(
    parent: THREE.Object3D,
    color: THREE.ColorRepresentation,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
  ) {
    return this.mesh(parent, this.cylinder, color, x, y, z, r, h, r);
  }
  text(
    parent: THREE.Object3D,
    text: string,
    x: number,
    y: number,
    z: number,
    width: number,
    color = "#33483e",
    background = "#f6f2df",
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = color;
    ctx.font = "bold 34px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 49, 490);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(
      this.geometry(new THREE.PlaneGeometry(width, (width * 96) / 512)),
      material,
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  plant(parent: THREE.Object3D, x: number, z: number, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    parent.add(group);
    this.tube(group, "#b77550", 0, 0.25, 0, 0.25, 0.5);
    for (let i = 0; i < 7; i++) {
      const leaf = this.ball(
        group,
        i % 2 ? "#47785e" : "#659265",
        Math.sin(i) * 0.22,
        0.65 + Math.cos(i) * 0.1,
        Math.cos(i) * 0.2,
        0.11,
        0.48,
        0.1,
      );
      leaf.rotation.z = Math.sin(i) * 0.5;
    }
    return group;
  }
  tree(parent: THREE.Object3D, x: number, z: number, scale = 1, palm = false) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    parent.add(g);
    this.tube(g, "#84674a", 0, 1.05, 0, 0.12, 2.1);
    if (palm) {
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7;
        const leaf = this.ball(
          g,
          i % 2 ? "#3d7959" : "#579364",
          Math.sin(a) * 0.55,
          2.05,
          Math.cos(a) * 0.55,
          0.3,
          0.13,
          1.05,
        );
        leaf.rotation.y = a;
        leaf.rotation.z = 0.2;
      }
    } else {
      this.mesh(g, this.cone, "#5c865b", 0, 1.8, 0, 0.95, 1.5, 0.95);
      this.mesh(g, this.cone, "#78a06b", 0, 2.3, 0, 0.7, 1.2, 0.7);
    }
    return g;
  }
  person(
    parent: THREE.Object3D,
    color: THREE.ColorRepresentation,
    x: number,
    z: number,
    scale = 1,
  ) {
    const g = new THREE.Group();
    parent.add(g);
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    const legs = [new THREE.Group(), new THREE.Group()];
    for (let i = 0; i < 2; i++) {
      g.add(legs[i]);
      legs[i].position.set(i ? 0.14 : -0.14, 0.62, 0);
      this.box(legs[i], "#29394b", 0, -0.26, 0, 0.22, 0.55, 0.24);
      this.box(legs[i], "#393029", 0, -0.56, 0.07, 0.24, 0.12, 0.39);
    }
    this.box(g, color, 0, 0.93, 0, 0.59, 0.64, 0.32);
    const arms = [new THREE.Group(), new THREE.Group()];
    for (let i = 0; i < 2; i++) {
      g.add(arms[i]);
      arms[i].position.set(i ? 0.37 : -0.37, 1.13, 0);
      this.box(arms[i], color, 0, -0.13, 0, 0.18, 0.31, 0.25);
      this.box(arms[i], "#805337", 0, -0.38, 0, 0.15, 0.29, 0.18);
    }
    this.tube(g, "#805337", 0, 1.36, 0, 0.09, 0.2);
    this.ball(g, "#885c40", 0, 1.56, 0, 0.23, 0.27, 0.22);
    this.ball(g, "#28251f", 0, 1.73, -0.025, 0.235, 0.14, 0.225);
    for (const dx of [-0.085, 0.085])
      this.ball(g, "#242522", dx, 1.58, 0.205, 0.022);
    return { group: g, legs, arms };
  }
  dispose() {
    this.materials.forEach((m) => m.dispose());
    this.geometries.forEach((g) => g.dispose());
  }
}
export type PersonModel = ReturnType<ModelKit["person"]>;
export interface Obstacle {
  x: number;
  z: number;
  width: number;
  depth: number;
}
