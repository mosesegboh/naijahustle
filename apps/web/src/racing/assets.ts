import * as THREE from "three";
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
    metalness: 0.25,
    roughness: 0.34,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
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
        vec3 originalPaint = texture2D(map, vMapUv).rgb;
        if (originalPaint.g > originalPaint.r * 1.15 && originalPaint.g > originalPaint.b * 1.01) {
          diffuseColor.rgb = diffuse * (.7 + originalPaint.g * .3);
        } else {
          diffuseColor.rgb = originalPaint * .3;
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
  driver.scale.setScalar(1.12);
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
      if (y > 0.51 && y < 0.79 && Math.abs(point.x) < 0.06) c = white;
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
    fabric.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "attribute vec2 outfitUV; varying vec2 vOutfitUV;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvOutfitUV = outfitUV;",
      );
      shader.fragmentShader =
        "varying vec2 vOutfitUV;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        if (diffuseColor.g > diffuseColor.r * 1.8 && diffuseColor.g > diffuseColor.b * 1.1 && abs(vOutfitUV.x) > .12) {
          vec2 tile = fract(vOutfitUV * 15.0);
          float diamond = abs(tile.x - .5) + abs(tile.y - .5);
          float band = step(.28, diamond) * (1.0 - step(.37, diamond));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.92,.46,.045), band * .85);
        }
      `,
      );
    };
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
    head.scale.multiplyScalar(1.25);
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.148,
        24,
        16,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.47,
      ),
      new THREE.MeshPhysicalMaterial({
        color: 0x088e83,
        roughness: 0.32,
        clearcoat: 0.6,
      }),
    );
    helmet.position.set(0, 0.175, 0);
    helmet.castShadow = true;
    head.add(helmet);
    const helmetStripe = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.149,
        16,
        16,
        Math.PI * 1.46,
        0.24,
        0,
        Math.PI * 0.47,
      ),
      new THREE.MeshStandardMaterial({ color: 0xffe5a0, roughness: 0.35 }),
    );
    helmetStripe.position.copy(helmet.position);
    head.add(helmetStripe);
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
