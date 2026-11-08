import { refineKartGeometry } from "./refineKartGeometry";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function loadKart(weapon: "pulse" | "oil" | "shield" = "pulse") {
  const loader = new GLTFLoader();
  const [kartAsset, driverAsset] = await Promise.all([
    loader.loadAsync("/models/racing/kart-oopi.glb"),
    loader.loadAsync("/models/racing/driver.glb"),
  ]);
  const root = new THREE.Group(),
    model = kartAsset.scene;
  model.getObjectByName("character")?.removeFromParent();
  model.scale.setScalar(2.2);
  root.add(model);
  const gadgetMaterial = new THREE.MeshStandardMaterial({
    color: 0x22444c,
    metalness: 0.6,
    roughness: 0.35,
  });
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: weapon === "shield" ? 0x62caff : 0xffd765,
    emissive: weapon === "shield" ? 0x1267b2 : 0x956400,
    emissiveIntensity: 0.5,
  });
  for (const side of [-1, 1]) {
    const gadget = new THREE.Group();
    gadget.position.set(side * 0.65, 0.67, weapon === "oil" ? -0.9 : 0.75);
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.18, 0.5, 12),
      gadgetMaterial,
    );
    housing.rotation.x = Math.PI / 2;
    gadget.add(housing);
    const tip = new THREE.Mesh(
      weapon === "shield"
        ? new THREE.SphereGeometry(0.16, 12, 8)
        : new THREE.TorusGeometry(0.12, 0.035, 6, 16),
      glowMaterial,
    );
    tip.position.z = weapon === "oil" ? -0.25 : 0.25;
    gadget.add(tip);
    root.add(gadget);
  }
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xf4b92c,
    metalness: 0.12,
    roughness: 0.48,
    clearcoat: 0.45,
    clearcoatRoughness: 0.3,
  });
  // Retain the authored wheel geometry and the kart's UV detail; give its body lacquered paint.
  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      let wheel = false;
      for (
        let parent: THREE.Object3D | null = obj;
        parent && parent !== model;
        parent = parent.parent
      )
        if (parent.name.includes("wheel")) wheel = true;
      if (!wheel) {
        if (!paint.map)
          paint.map = (obj.material as THREE.MeshStandardMaterial).map;
        obj.material = paint;
      } else {
        const m = (obj.material as THREE.MeshStandardMaterial).clone();
        m.roughness = 0.66;
        obj.material = m;
      }
    }
  });
  paint.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #include <map_fragment>
      #ifdef USE_MAP
        vec3 originalPaint = sampledDiffuseColor.rgb;
        if (originalPaint.g > originalPaint.r * 1.15 && originalPaint.g > originalPaint.b * 1.01) {
          diffuseColor.rgb = diffuse * (.7 + originalPaint.g * .3);
        } else {
          diffuseColor.rgb = mix(vec3(.065,.075,.085), originalPaint * .38, .6);
        }
      #endif
    `,
    );
  };
  const steering = new THREE.Group();
  const steeringMaterial = new THREE.MeshStandardMaterial({
    color: 0x172528,
    roughness: 0.5,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.035, 8, 32),
    steeringMaterial,
  );
  steering.add(ring);
  const spoke = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.035, 0.035),
    steeringMaterial,
  );
  steering.add(spoke);
  steering.position.set(0, 1.05, 0.48);
  steering.rotation.x = -0.45;
  root.add(steering);
  const driver = driverAsset.scene;
  driver.scale.setScalar(1.06);
  root.add(driver);
  driver.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(driver),
    height = bounds.max.y - bounds.min.y;
  driver.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    if (obj.name === "Eyes") {
      obj.material = new THREE.MeshPhysicalMaterial({
        color: 0x1a100b,
        roughness: 0.2,
      });
      return;
    }
    if (obj.name === "Eyebrows") {
      obj.material = new THREE.MeshStandardMaterial({ color: 0x15110f });
      return;
    }
    const pos = obj.geometry.getAttribute("position"),
      colors = [],
      outfitUV = [];
    const skin = new THREE.Color("#875038"),
      green = new THREE.Color("#078c74"),
      gold = new THREE.Color("#ffc64f"),
      pants = new THREE.Color("#14272a"),
      white = new THREE.Color("#e7e5d9");
    for (let i = 0; i < pos.count; i++) {
      const point = new THREE.Vector3()
        .fromBufferAttribute(pos, i)
        .applyMatrix4(obj.matrixWorld);
      const y = (point.y - bounds.min.y) / height;
      let boneName = "";
      if (obj instanceof THREE.SkinnedMesh) {
        const joints = obj.geometry.getAttribute("skinIndex"),
          weights = obj.geometry.getAttribute("skinWeight");
        let best = -1;
        for (let k = 0; k < 4; k++)
          if (weights.getComponent(i, k) > best) {
            best = weights.getComponent(i, k);
            boneName =
              obj.skeleton.bones[joints.getComponent(i, k)]?.name ?? "";
          }
      }
      const isSkin = /head|neck/i.test(boneName);
      let c = isSkin ? skin : y < 0.46 ? pants : green;
      if (/hand|index|middle|ring|pinky|thumb/i.test(boneName)) c = pants;
      if (y > 0.46 && y < 0.51) c = gold;
      if (y > 0.51 && y < 0.79 && Math.abs(point.x) < 0.025) c = white;
      colors.push(c.r, c.g, c.b);
      outfitUV.push(point.x, point.y);
    }
    obj.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );
    obj.geometry.setAttribute(
      "outfitUV",
      new THREE.Float32BufferAttribute(outfitUV, 2),
    );
    const fabric = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.02,
    });
    obj.material = fabric;
  });
  // Pose the authored skeleton in world space so the driver sits and holds the wheel.
  function aim(name: string, childName: string, target: THREE.Vector3) {
    driver.updateMatrixWorld(true);
    const bone = driver.getObjectByName(name),
      child = driver.getObjectByName(childName);
    if (!bone || !child) return;
    const from = bone.getWorldPosition(new THREE.Vector3()),
      to = child.getWorldPosition(new THREE.Vector3());
    const change = new THREE.Quaternion().setFromUnitVectors(
      to.sub(from).normalize(),
      target.clone().sub(from).normalize(),
    );
    const world = bone.getWorldQuaternion(new THREE.Quaternion());
    const parent = bone
      .parent!.getWorldQuaternion(new THREE.Quaternion())
      .invert();
    bone.quaternion.copy(parent.multiply(change.multiply(world)));
    driver.updateMatrixWorld(true);
  }
  const pelvis = driver.getObjectByName("pelvis")!;
  const hip = pelvis.getWorldPosition(new THREE.Vector3());
  driver.position.add(new THREE.Vector3(0, 0.7, -0.17).sub(hip));
  driver.updateMatrixWorld(true);
  for (const side of ["l", "r"]) {
    const sign = side === "l" ? 1 : -1;
    aim(
      "thigh_" + side,
      "calf_" + side,
      new THREE.Vector3(sign * 0.3, 0.66, 0.4),
    );
    aim(
      "calf_" + side,
      "foot_" + side,
      new THREE.Vector3(sign * 0.32, 0.24, 0.7),
    );
    aim(
      "upperarm_" + side,
      "lowerarm_" + side,
      new THREE.Vector3(sign * 0.4, 1.1, 0.08),
    );
    aim(
      "lowerarm_" + side,
      "hand_" + side,
      new THREE.Vector3(sign * 0.24, 1.07, 0.48),
    );
  }
  const head = driver.getObjectByName("Head");
  if (head) {
    // Fit the cap to the posed mesh, not a guessed offset in the bone's local axes.
    driver.updateMatrixWorld(true);
    const headBounds = new THREE.Box3();
    driver.traverse((object) => {
      if (
        !(object instanceof THREE.SkinnedMesh) ||
        object.name !== "SuperHero_Male"
      )
        return;
      object.skeleton.update();
      const positions = object.geometry.getAttribute("position"),
        joints = object.geometry.getAttribute("skinIndex"),
        weights = object.geometry.getAttribute("skinWeight");
      for (let i = 0; i < positions.count; i++) {
        let weight = 0;
        for (let k = 0; k < 4; k++)
          if (
            /^head$/i.test(
              object.skeleton.bones[joints.getComponent(i, k)]?.name || "",
            )
          )
            weight += weights.getComponent(i, k);
        if (weight < 0.7) continue;
        const point = new THREE.Vector3().fromBufferAttribute(positions, i);
        object.applyBoneTransform(i, point);
        object.localToWorld(point);
        headBounds.expandByPoint(point);
      }
    });
    if (!headBounds.isEmpty()) {
      const size = headBounds.getSize(new THREE.Vector3()),
        center = headBounds.getCenter(new THREE.Vector3());
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        new THREE.MeshStandardMaterial({ color: 0x173b38, roughness: 0.85 }),
      );
      cap.scale.set(size.x * 0.54, size.y * 0.23, size.z * 0.54);
      cap.position.set(center.x, headBounds.max.y - size.y * 0.16, center.z);
      root.add(cap);
      head.attach(cap);
      cap.castShadow = true;
      const brim = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 8),
        cap.material,
      );
      brim.scale.set(size.x * 0.58, 0.014, size.z * 0.4);
      brim.position.set(
        center.x,
        headBounds.max.y - size.y * 0.16,
        headBounds.max.z - 0.01,
      );
      root.add(brim);
      head.attach(brim);
    }
  }
  // Turned rubber tyres and alloy hubs replace the chunky atlas-coloured wheels.
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x20252a,
    roughness: 0.94,
  });
  const alloy = new THREE.MeshStandardMaterial({
    color: 0xb1bac1,
    metalness: 0.72,
    roughness: 0.35,
  });
  model.traverse((wheel) => {
    if (!(wheel instanceof THREE.Mesh) || !wheel.name.startsWith("wheel-"))
      return;
    const side = wheel.name.endsWith("left") ? 1 : -1;
    const profile = [
      new THREE.Vector2(0.125, -0.105),
      new THREE.Vector2(0.18, -0.1),
      new THREE.Vector2(0.205, -0.075),
      new THREE.Vector2(0.211, -0.045),
      new THREE.Vector2(0.211, 0.045),
      new THREE.Vector2(0.205, 0.075),
      new THREE.Vector2(0.18, 0.1),
      new THREE.Vector2(0.125, 0.105),
    ];
    wheel.geometry.dispose();
    wheel.geometry = new THREE.LatheGeometry(profile, 32)
      .rotateZ(Math.PI / 2)
      .translate(side * 0.105, 0, 0);
    wheel.material = rubber;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.125, 0.018, 6, 24),
      alloy,
    );
    rim.rotation.y = Math.PI / 2;
    rim.position.x = side * 0.211;
    wheel.add(rim);
    const hub: THREE.Mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.047, 0.047, 0.035, 16),
      alloy,
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.x = side * 0.208;
    wheel.add(hub);
    hub.updateMatrix();
    const hubParts: THREE.BufferGeometry[] = [
      hub.geometry.clone().applyMatrix4(hub.matrix),
    ];
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      hubParts.push(
        new THREE.BoxGeometry(0.016, 0.1, 0.022)
          .rotateX(angle)
          .translate(
            side * 0.208,
            Math.cos(angle) * 0.073,
            Math.sin(angle) * 0.073,
          ),
      );
    }
    const combined = mergeGeometries(hubParts);
    if (combined) {
      hub.geometry.dispose();
      hub.geometry = combined;
      hub.position.set(0, 0, 0);
      hub.rotation.set(0, 0, 0);
    }
    for (const geometry of hubParts) geometry.dispose();
  });
  // glTF can wrap a named body in a Group when that node also has children.
  model.traverse((shell) => {
    if (!(shell instanceof THREE.Mesh) || shell.material !== paint) return;
    refineKartGeometry(shell.geometry);
  });
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff3c6,
    emissive: 0xffd885,
    emissiveIntensity: 0.25,
    roughness: 0.28,
  });
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 8),
      lampMaterial,
    );
    lamp.scale.set(1, 0.55, 0.4);
    lamp.position.set(side * 0.57, 0.55, 1.52);
    root.add(lamp);
  }
  const frontWheels = [
    model.getObjectByName("wheel-front-left"),
    model.getObjectByName("wheel-front-right"),
  ].filter(Boolean) as THREE.Object3D[];
  const allWheels = [
    "wheel-front-left",
    "wheel-front-right",
    "wheel-back-left",
    "wheel-back-right",
  ]
    .map((n) => model.getObjectByName(n))
    .filter(Boolean) as THREE.Object3D[];
  return { root, driver, paint, frontWheels, allWheels, head, steering };
}
