import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AVATARS, NPCS, boardBus, finishJourney } from "@naija-hustle/shared";
import { usePlayerStore } from "../../stores/playerStore";
import {
  useWorldStore,
  type CameraAction,
  type WorldView,
} from "../../stores/worldStore";
import { clearTouchInput, touchInput } from "../input";
import { ModelKit } from "./models";
import { buildHome } from "./home";
import { buildCity } from "./city";
import { mergeStatic } from "./mergeStatic";
import { Districts, centralDoors, districtAt, type Door } from "./districts";
import { BusRoute, stops } from "./bus";
import { Traffic, overlaps } from "./traffic";
import { Presence } from "./presence";
import { buildArena } from "./arena";
import { useSessionStore } from "../../stores/sessionStore";
import { CHALLENGES } from "../../../../../packages/shared/src/combat";
import { canOccupy } from "./collision";
export class GameWorld {
  private readonly kit = new ModelKit();
  private readonly sunlight = new THREE.DirectionalLight("#fff0d0", 3);
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.OrthographicCamera(
    -10,
    10,
    10,
    -10,
    0.1,
    250,
  );
  private readonly controls: OrbitControls;
  private readonly home = buildHome(this.kit);
  private readonly city = buildCity(this.kit);
  private readonly player = this.kit.person(
    this.scene,
    AVATARS[usePlayerStore.getState().progress.avatar],
    0,
    0,
  );
  private readonly districts = new Districts();
  private readonly streetCamera = new THREE.PerspectiveCamera(72, 1, 0.05, 220);
  private readonly interior = new THREE.Group();
  private readonly homeWalls = new THREE.Group();
  private readonly interiorWalls = new THREE.Group();
  private readonly bus = new THREE.Group();
  private readonly route = new BusRoute();
  private readonly traffic = new Traffic();
  private readonly arena = buildArena(this.kit);
  private readonly fightCamera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  private fightPosition: THREE.Vector3 | null = null;
  private presence: Presence;
  private readonly pedestrians: {
    model: ReturnType<ModelKit["person"]>;
    x: number;
    z: number;
    phase: number;
  }[] = [];
  private trafficTime = 0;
  private enemyColor: number = 0xb56b43;
  private fightSnapshot = 0;
  private fightReceived = 0;
  private nearbyChallenge: number | null = null;
  private readonly challengePoints = [
    { x: 18.7, z: 26 },
    { x: -5, z: 30 },
    { x: 43, z: 14 },
    { x: 18, z: -11 },
  ];
  private cityPosition = new THREE.Vector3(24, 0, 18);
  private door: Door | undefined;
  private yaw = Math.PI;
  private pitch = 0;
  private dragging = false;
  private get activeCamera() {
    if (useSessionStore.getState().fight) return this.fightCamera;
    return useWorldStore.getState().street ? this.streetCamera : this.camera;
  }
  private readonly keys = new Set<string>();
  private readonly markers: HTMLDivElement[] = [];
  private readonly resizeObserver: ResizeObserver;
  private readonly unsubscribers: (() => void)[] = [];
  private view: WorldView = "home";
  private target: THREE.Vector3 | null = null;
  private lastTime = 0;
  private walkTime = 0;
  private lastMarkerTime = 0;
  private pointerStart = { x: 0, y: 0 };
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly raycaster = new THREE.Raycaster();
  private readonly move = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();
  private disposed = false;
  constructor(private host: HTMLDivElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "3D world. Drag to rotate, scroll to zoom, click the ground to walk.",
    );
    host.appendChild(this.renderer.domElement);
    mergeStatic(this.home.root, this.kit, [this.home.fan]);
    mergeStatic(this.city.root, this.kit, [
      ...this.city.traffic,
      ...this.city.signals.map((s) => s.root),
      ...this.city.npcs.map((n) => n.model.group),
    ]);
    this.scene.add(
      this.home.root,
      this.city.root,
      this.districts.root,
      this.interior,
    );
    this.arena.root.visible = false;
    this.scene.add(this.arena.root);
    this.fightCamera.position.set(6, 4.4, 8);
    this.fightCamera.lookAt(0, 1, 0);
    this.presence = new Presence(() => ({
      x: this.player.group.position.x,
      z: this.player.group.position.z,
      yaw: this.player.group.rotation.y,
      view: useSessionStore.getState().fight ? "interior" : this.view,
      avatar: usePlayerStore.getState().progress.avatar,
    }));
    this.scene.add(this.presence.root);
    for (let i = 0; i < 18; i++) {
      const x = 4 + (i % 9) * 5.3,
        z = i < 9 ? 14.1 : 22.2;
      const model = this.kit.person(
        this.city.root,
        [0xd9a154, 0x748ca0, 0xb88177, 0x6a9b83][i % 4],
        x,
        z,
        1.05,
      );
      if (i % 3 === 0)
        this.kit.box(model.arms[0], 0xbd9b60, 0, -0.65, 0, 0.28, 0.3, 0.25);
      this.pedestrians.push({ model, x, z, phase: i * 0.7 });
    }
    this.challengePoints.forEach((point, i) => {
      const model = this.kit.person(
        this.city.root,
        CHALLENGES[i].color,
        point.x,
        point.z,
        1.2,
      );
      this.kit.text(
        model.group,
        `LEVEL ${i + 1} · CHALLENGE`,
        0,
        2.4,
        0,
        3.5,
        "#fff2c9",
        "#875b35",
      );
    });
    this.districts.update(24, 18);
    this.kit.box(this.city.root, 0xa9b393, 24, -0.19, 12.5, 80, 0.2, 57);
    this.kit.box(this.city.root, 0xa9b393, 24, -0.19, 57.25, 80, 0.2, 13.5);
    this.kit.box(this.city.root, 0x666d69, 24, -0.01, 12.5, 7, 0.08, 57);
    this.kit.box(this.city.root, 0x666d69, 24, 0.12, 57.25, 7, 0.08, 13.5);
    this.kit.box(this.city.root, 0x666d69, 24, -0.01, 18, 80, 0.08, 6);
    for (const door of centralDoors)
      this.kit.text(
        this.city.root,
        `${door.name} · E`,
        door.x,
        2.5,
        door.z,
        4.5,
      );
    this.kit.box(this.interior, 0xd8c6a6, 0, -0.1, 0, 12, 0.2, 10);
    this.kit.box(this.interior, 0xd7bc8e, 0, 1.7, -5, 12, 3.4, 0.2);
    this.kit.box(this.interior, 0xd7bc8e, -6, 1.7, 0, 0.2, 3.4, 10);
    this.kit.box(this.interior, 0x866744, 0, 0.7, -2, 6, 1.4, 1.2);
    this.kit.text(
      this.interior,
      "Reception · services coming later",
      0,
      2.3,
      -4.8,
      7,
    );
    this.kit.text(this.interior, "EXIT · E", 0, 2.6, 4.7, 2).rotation.y =
      Math.PI;
    this.home.root.add(this.homeWalls);
    this.interior.add(this.interiorWalls);
    for (const [root, x, z, height] of [
      [this.homeWalls, 6.25, 5.2, 3.8],
      [this.interiorWalls, 6, 5, 3.4],
    ] as const) {
      this.kit.box(root, 0xd7bc8e, x, height / 2, 0, 0.2, height, z * 2);
      this.kit.box(root, 0xd7bc8e, 0, height / 2, z, x * 2, height, 0.2);
      this.kit.box(root, 0xf0e4cf, 0, height, 0, x * 2, 0.15, z * 2);
    }
    this.kit.box(this.interiorWalls, 0x705037, 0, 1.1, 4.87, 1.6, 2.2, 0.12);
    this.kit.plant(this.interior, 4, -3, 1.6);
    this.kit.box(this.interior, 0x668775, 4, 0.45, 1, 1.5, 0.9, 1.5);
    this.city.root.add(this.bus);
    this.kit.box(this.bus, 0xe5b82e, 0, 0.65, 0, 3.8, 1, 1.8);
    this.kit.box(this.bus, 0xe5b82e, 0, 2.2, 0, 3.8, 0.18, 1.8);
    for (const x of [-1.7, 0, 1.7])
      for (const z of [-0.85, 0.85])
        this.kit.box(this.bus, 0xe5b82e, x, 1.6, z, 0.12, 1.2, 0.12);
    for (const x of [-1.2, 1.2])
      for (const z of [-0.9, 0.9])
        this.kit.ball(this.bus, 0x292c2b, x, 0.4, z, 0.7, 0.7, 0.22);
    this.kit.text(this.bus, "DANFO · BOARD ₦200", 0, 2.7, 0, 3);
    for (const stop of stops) {
      this.kit.tube(this.city.root, 0x345d47, stop.x, 1.5, stop.z + 3, 0.12, 3);
      this.kit.text(
        this.city.root,
        stop.name + " · BUS",
        stop.x,
        3.2,
        stop.z + 3,
        3,
      );
    }
    this.scene.add(new THREE.HemisphereLight("#fff6df", "#8b9d91", 2.0));
    const sun = this.sunlight;
    sun.position.set(-12, 30, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    sun.shadow.camera.far = 110;
    sun.shadow.normalBias = 0.045;
    sun.shadow.bias = -0.0002;
    sun.target.position.set(12, 0, 12);
    this.scene.add(sun, sun.target);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minPolarAngle = 0.28;
    this.controls.maxPolarAngle = 1.25;
    this.controls.minZoom = 0.65;
    this.controls.maxZoom = 2.5;
    this.controls.enablePan = true;
    this.controls.maxTargetRadius = Infinity;
    for (const npc of NPCS) {
      const marker = document.createElement("div");
      marker.className = "world-marker";
      const dot = document.createElement("span");
      dot.textContent = npc.id === "mama" ? "!" : "⌂";
      const label = document.createElement("b");
      label.textContent = npc.name;
      marker.append(dot, label);
      host.append(marker);
      this.markers.push(marker);
    }
    this.setView(useWorldStore.getState().view);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(host);
    this.resize();
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.clearInput);
    document.addEventListener("visibilitychange", this.clearInput);
    window.addEventListener("naija:camera", this.cameraAction);
    window.addEventListener("naija:interact", this.interact);
    this.renderer.domElement.addEventListener("pointermove", this.pointerMove);
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.pointerUp);
    this.renderer.domElement.addEventListener("pointercancel", this.clearInput);
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.unsubscribers.push(
      useWorldStore.subscribe((state, old) => {
        if (state.view !== old.view) this.setView(state.view);
        if (state.panel !== old.panel) this.clearInput();
        if (state.street !== old.street) {
          this.controls.enabled = !state.street;
          this.clearInput();
        }
      }),
    );
    this.unsubscribers.push(
      usePlayerStore.subscribe((state, old) => {
        if (state.progress.avatar !== old.progress.avatar) {
          this.player.group.traverse((o) => {
            if (
              o instanceof THREE.Mesh &&
              o.material === this.kit.material(AVATARS[old.progress.avatar])
            )
              o.material = this.kit.material(AVATARS[state.progress.avatar]);
          });
        }
        if (state.progress.name !== old.progress.name) {
          this.route.riding = false;
          this.route.x = 29;
          this.route.z = 19.3;
          this.route.stop = 0;
          this.route.dwell = 8;
          this.cityPosition.set(24, 0, 18);
          useWorldStore.setState({ riding: false, busInfo: "" });
          this.clearInput();
          this.setView(useWorldStore.getState().view);
        }
      }),
    );
    useWorldStore.setState({ ready: true });
    this.renderer.setAnimationLoop(this.frame);
  }
  private contextLost = (event: Event) => {
    event.preventDefault();
    useWorldStore.setState({ ready: false });
    window.dispatchEvent(new Event("naija:render-error"));
  };
  private clearInput = () => {
    this.dragging = false;
    this.keys.clear();
    clearTouchInput();
    this.target = null;
  };
  private keyDown = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLElement &&
      (e.target.matches("input,textarea,select") || e.target.isContentEditable)
    )
      return;
    if (useWorldStore.getState().panel || useSessionStore.getState().fight)
      return;
    const key = e.key.toLowerCase();
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "e",
      ].includes(key)
    ) {
      e.preventDefault();
      this.keys.add(key);
    }
    if (key === "e" && !e.repeat) this.interact();
  };
  private keyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };
  private pointerDown = (e: PointerEvent) => {
    this.pointerStart = { x: e.clientX, y: e.clientY };
    this.dragging = true;
    if (useWorldStore.getState().street)
      this.renderer.domElement.setPointerCapture(e.pointerId);
  };
  private pointerMove = (e: PointerEvent) => {
    if (
      !this.dragging ||
      !useWorldStore.getState().street ||
      useWorldStore.getState().panel
    )
      return;
    this.yaw -= (e.clientX - this.pointerStart.x) * 0.005;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - (e.clientY - this.pointerStart.y) * 0.005,
      -1.15,
      1.15,
    );
    this.pointerStart = { x: e.clientX, y: e.clientY };
  };
  private pointerUp = (e: PointerEvent) => {
    this.dragging = false;
    if (
      useWorldStore.getState().street ||
      this.route.riding ||
      useSessionStore.getState().fight
    )
      return;
    if (
      e.button !== 0 ||
      Math.hypot(
        e.clientX - this.pointerStart.x,
        e.clientY - this.pointerStart.y,
      ) > 6 ||
      !usePlayerStore.getState().progress.name ||
      useWorldStore.getState().panel
    )
      return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const point = new THREE.Vector3();
    if (
      this.raycaster.ray.intersectPlane(this.plane, point) &&
      this.canMove(point.x, point.z)
    )
      this.target = point;
  };
  private setView(view: WorldView) {
    if (this.view === "city")
      this.cityPosition.copy(this.player.group.position);
    this.view = view;
    this.yaw = view === "city" ? Math.PI : 0;
    this.pitch = 0;
    this.clearInput();
    this.home.root.visible = view === "home";
    this.city.root.visible = view === "city";
    this.districts.root.visible = view === "city";
    this.interior.visible = view === "interior";
    this.scene.background = new THREE.Color(
      view !== "city" ? "#e8e5d9" : "#a4c8cd",
    );
    this.scene.fog = new THREE.Fog(
      view !== "city" ? "#e8e5d9" : "#a4c8cd",
      65,
      115,
    );
    this.player.group.position.copy(
      view === "city" ? this.cityPosition : new THREE.Vector3(-0.9, 0, 3.5),
    );
    this.player.group.rotation.y = 0.25;
    usePlayerStore.setState({ nearby: null });
    this.resetCamera();
    this.resize();
  }
  private resetCamera() {
    const home = this.view !== "city";
    this.controls.target.set(
      home ? 0 : this.player.group.position.x,
      home ? 0.3 : 0,
      home ? 0 : this.player.group.position.z,
    );
    this.camera.position
      .copy(this.controls.target)
      .add(new THREE.Vector3(home ? 13 : 28, home ? 13 : 36, home ? 16 : 34));
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
  private resize = () => {
    if (!this.renderer) return;
    const width = this.host.clientWidth,
      height = this.host.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    const span =
      this.view !== "city"
        ? Math.max(15.7, 17 / aspect)
        : Math.max(36, 44 / aspect);
    this.camera.left = (-span * aspect) / 2;
    this.camera.right = (span * aspect) / 2;
    this.camera.top = span / 2;
    this.camera.bottom = -span / 2;
    this.camera.updateProjectionMatrix();
    this.fightCamera.aspect = aspect;
    this.fightCamera.updateProjectionMatrix();
    this.streetCamera.aspect = aspect;
    this.streetCamera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    // Resizing clears the drawing buffer; redraw before the next browser paint.
    this.renderer.render(this.scene, this.activeCamera);
  };
  private cameraAction = (event: Event) => {
    if (useSessionStore.getState().fight) return;
    const action = (event as CustomEvent<CameraAction>).detail;
    if (useWorldStore.getState().street) {
      if (action === "rotate") this.yaw += Math.PI / 4;
      else if (action === "center") {
        this.pitch = 0;
        this.yaw = Math.PI;
      } else {
        this.streetCamera.fov = THREE.MathUtils.clamp(
          this.streetCamera.fov + (action === "in" ? -5 : 5),
          45,
          90,
        );
        this.streetCamera.updateProjectionMatrix();
      }
      return;
    }
    if (action === "center") this.resetCamera();
    else if (action === "rotate") {
      const offset = this.camera.position.clone().sub(this.controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
    } else {
      this.camera.zoom = THREE.MathUtils.clamp(
        this.camera.zoom * (action === "in" ? 1.2 : 1 / 1.2),
        0.65,
        2.5,
      );
      this.camera.updateProjectionMatrix();
    }
  };
  private canMove(x: number, z: number) {
    const home = this.view !== "city";
    if (
      !home &&
      x > -16 &&
      x < 64 &&
      z > 41 &&
      z < 50.5 &&
      (x < 22.3 || x > 25.7)
    )
      return false;
    return canOccupy(
      x,
      z,
      home
        ? this.view === "home"
          ? this.home.obstacles
          : [{ x: 0, z: -2, width: 6, depth: 1.2 }]
        : [...this.city.obstacles, ...this.districts.obstacles],
      home
        ? { minX: -5.7, maxX: 5.7, minZ: -4.7, maxZ: 4.7 }
        : { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity },
    );
  }

  private frame = (time: number) => {
    if (this.disposed) return;
    const delta = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    if (this.renderFight()) return;
    this.presence.root.visible = this.view === "city";
    this.presence.update(
      delta,
      this.player.group.position.x,
      this.player.group.position.z,
      this.activeCamera,
    );
    this.move.set(0, 0, 0);
    if (
      usePlayerStore.getState().progress.name &&
      !useWorldStore.getState().panel &&
      !this.route.riding
    ) {
      const x =
        Number(
          this.keys.has("d") || this.keys.has("arrowright") || touchInput.right,
        ) -
        Number(
          this.keys.has("a") || this.keys.has("arrowleft") || touchInput.left,
        );
      const y =
        Number(
          this.keys.has("w") || this.keys.has("arrowup") || touchInput.up,
        ) -
        Number(
          this.keys.has("s") || this.keys.has("arrowdown") || touchInput.down,
        );
      if (x || y) {
        this.target = null;
        this.activeCamera.getWorldDirection(this.forward);
        this.forward.y = 0;
        this.forward.normalize();
        this.right.crossVectors(this.forward, new THREE.Vector3(0, 1, 0));
        this.move
          .copy(this.forward)
          .multiplyScalar(y)
          .addScaledVector(this.right, x)
          .normalize();
      } else if (this.target) {
        this.move.copy(this.target).sub(this.player.group.position);
        this.move.y = 0;
        if (this.move.length() < 0.13) {
          this.target = null;
          this.move.set(0, 0, 0);
        } else this.move.normalize();
      }
    }
    const player = this.player.group;
    const before = player.position.clone();
    const step = (this.view === "city" ? 6.2 : 2.7) * delta;
    if (this.canMove(player.position.x + this.move.x * step, player.position.z))
      player.position.x += this.move.x * step;
    if (this.canMove(player.position.x, player.position.z + this.move.z * step))
      player.position.z += this.move.z * step;
    if (this.view === "city") {
      const bx = this.route.x,
        bz = this.route.z;
      if (!useWorldStore.getState().panel && !document.hidden) {
        this.trafficTime += delta;
        this.route.update(
          delta,
          (x, z, vertical) =>
            !this.traffic.bodies().some((body) =>
              overlaps(
                {
                  x,
                  z,
                  width: vertical ? 1.8 : 3.8,
                  depth: vertical ? 3.8 : 1.8,
                },
                body,
                0.15,
              ),
            ),
        );
        const vertical =
          Math.abs(this.route.z - bz) > 0.001
            ? true
            : Math.abs(this.route.x - bx) > 0.001
              ? false
              : Math.abs(Math.sin(this.bus.rotation.y)) > 0.5;
        this.traffic.update(delta, this.trafficTime, {
          x: this.route.x,
          z: this.route.z,
          width: vertical ? 1.8 : 3.8,
          depth: vertical ? 3.8 : 1.8,
        });
      }
      if (this.route.riding && this.route.stop === 2 && this.route.dwell > 0) {
        const p = usePlayerStore.getState().progress,
          next = finishJourney(p);
        if (next !== p)
          usePlayerStore.setState({
            progress: next,
            notice:
              "North Estate reached! ₦300 travel bonus and 5 reputation earned. Your next chapter will be building a business.",
          });
      }
      this.bus.position.set(this.route.x, 0, this.route.z);
      if (Math.hypot(this.route.x - bx, this.route.z - bz) > 0.001)
        this.bus.rotation.y = -Math.atan2(this.route.z - bz, this.route.x - bx);
      if (this.route.riding) player.position.set(this.route.x, 0, this.route.z);
      this.districts.update(player.position.x, player.position.z);
      this.door = this.districts.doors.find(
        (d) =>
          Math.hypot(d.x - player.position.x, d.z - player.position.z) < 1.9,
      );
      const challenge = this.challengePoints.findIndex(
        (p) =>
          Math.hypot(p.x - player.position.x, p.z - player.position.z) < 2.4,
      );
      this.nearbyChallenge = challenge < 0 ? null : challenge;
      const c = districtAt(player.position.x, player.position.z);
      const location =
        !c.x && !c.z ? "Balogun quarter" : `Mainland district ${c.x}, ${c.z}`;
      const interaction = this.route.riding
        ? this.route.dwell > 0
          ? "Get off danfo"
          : ""
        : this.nearbyChallenge !== null
          ? `Challenge · ${CHALLENGES[this.nearbyChallenge].name}`
          : this.door
            ? `Enter ${this.door.name}`
            : Math.hypot(
                  player.position.x - this.route.x,
                  player.position.z - this.route.z,
                ) < 3
              ? "Board danfo · ₦200"
              : "";
      const busInfo = this.route.riding
        ? this.route.dwell > 0
          ? `${stops[this.route.stop].name} · leaving in ${Math.ceil(this.route.dwell)}s`
          : `Next stop: ${stops[(this.route.stop + 1) % stops.length].name}`
        : "";
      const state = useWorldStore.getState();
      if (
        state.location !== location ||
        state.interaction !== interaction ||
        state.busInfo !== busInfo
      )
        useWorldStore.setState({ location, interaction, busInfo });
    } else {
      const exit =
        this.view === "interior"
          ? Math.hypot(player.position.x, player.position.z - 4) < 2
          : Math.hypot(player.position.x + 5.2, player.position.z - 2.5) < 2;
      const interaction = exit ? "Exit to street" : "";
      if (useWorldStore.getState().interaction !== interaction)
        useWorldStore.setState({ interaction });
    }
    const walking = before.distanceToSquared(player.position) > 0.000001;
    if (walking) {
      player.rotation.y = Math.atan2(this.move.x, this.move.z);
      this.walkTime += delta * 10;
    } else if (this.target && this.move.lengthSq() > 0) this.target = null;
    this.player.legs.forEach(
      (leg, i) =>
        (leg.rotation.x = walking
          ? Math.sin(this.walkTime + i * Math.PI) * 0.52
          : 0),
    );
    this.player.arms.forEach(
      (arm, i) =>
        (arm.rotation.x = walking
          ? Math.sin(this.walkTime + i * Math.PI) * -0.38
          : 0),
    );
    this.home.fan.rotation.z = time * 0.006;
    for (const s of this.city.signals) {
      const phase = this.trafficTime % 16;
      s.green.visible = s.axis === "x" ? phase < 10 : phase >= 11 && phase < 15;
      s.amber.visible =
        s.axis === "x" ? phase >= 10 && phase < 11 : phase >= 15;
      s.red.visible = !s.green.visible && !s.amber.visible;
    }
    this.city.traffic.forEach((car, i) => {
      const p = this.traffic.positions[i];
      car.position.x = p.x;
      car.position.z = p.z;
      car.rotation.y = i % 3 === 2 ? Math.PI / 2 : i % 3 === 1 ? Math.PI : 0;
    });
    for (const [i, p] of this.pedestrians.entries()) {
      p.model.group.position.x = p.x + Math.sin(time * 0.00025 + p.phase) * 1.3;
      p.model.group.position.z = p.z;
      p.model.group.rotation.y =
        Math.cos(time * 0.00025 + p.phase) > 0 ? Math.PI / 2 : -Math.PI / 2;
      p.model.legs.forEach(
        (leg, j) =>
          (leg.rotation.x = Math.sin(time * 0.004 + i + j * Math.PI) * 0.35),
      );
      p.model.arms.forEach(
        (arm, j) =>
          (arm.rotation.x = Math.sin(time * 0.004 + i + j * Math.PI) * -0.25),
      );
    }
    if (this.view === "city") {
      const npc = NPCS.find(
        (n) =>
          Math.hypot(
            player.position.x - n.x / 25,
            player.position.z - n.y / 25,
          ) <
          78 / 25,
      );
      if ((npc?.id ?? null) !== usePlayerStore.getState().nearby)
        usePlayerStore.setState({ nearby: npc?.id ?? null });
      // Track the player only when walking out of the comfortable viewing area.
      this.projected.copy(player.position).project(this.camera);
      if (
        (walking || this.route.riding) &&
        (Math.abs(this.projected.x) > 0.66 || Math.abs(this.projected.y) > 0.6)
      ) {
        const offset = player.position
          .clone()
          .sub(this.controls.target)
          .multiplyScalar(delta * 2);
        offset.y = 0;
        this.controls.target.add(offset);
        this.camera.position.add(offset);
      }
    }
    this.controls.update();
    this.homeWalls.visible = this.interiorWalls.visible =
      useWorldStore.getState().street;
    this.player.group.visible =
      !useWorldStore.getState().street && !this.route.riding;
    this.sunlight.position.set(
      player.position.x - 24,
      30,
      player.position.z + 3,
    );
    this.sunlight.target.position.copy(player.position);
    this.streetCamera.position
      .copy(player.position)
      .add(new THREE.Vector3(0, this.route.riding ? 1.65 : 1.6, 0));
    this.streetCamera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    if (time - this.lastMarkerTime > 40) {
      this.lastMarkerTime = time;
      this.markers.forEach((marker, i) => {
        const n = NPCS[i];
        this.projected.set(n.x / 25, 2.8, n.y / 25).project(this.activeCamera);
        marker.hidden =
          this.view !== "city" ||
          this.projected.z > 1 ||
          this.projected.z < -1 ||
          Math.abs(this.projected.x) > 1 ||
          Math.abs(this.projected.y) > 1;
        marker.style.transform = `translate(-50%, -100%) translate(${(this.projected.x * 0.5 + 0.5) * this.host.clientWidth}px,${(-this.projected.y * 0.5 + 0.5) * this.host.clientHeight}px)`;
        marker.classList.toggle(
          "objective",
          usePlayerStore.getState().progress.mission === "active"
            ? n.id === "tunde"
            : usePlayerStore.getState().progress.mission === "available" &&
                n.id === "mama",
        );
      });
    }
    this.renderer.render(this.scene, this.activeCamera);
  };
  private interact = () => {
    if (
      !usePlayerStore.getState().progress.name ||
      useWorldStore.getState().panel ||
      useSessionStore.getState().fight
    )
      return;
    if (this.route.riding) {
      if (this.route.dwell <= 0) return;
      this.route.riding = false;
      this.player.group.position.z += 3;
      useWorldStore.setState({ riding: false, busInfo: "" });
      this.clearInput();
      return;
    }
    if (this.view !== "city") {
      if (useWorldStore.getState().interaction)
        useWorldStore.getState().setView("city");
      return;
    }
    if (this.nearbyChallenge !== null) {
      const session = useSessionStore.getState(),
        level = this.nearbyChallenge;
      if (level > (session.user?.level ?? session.practiceLevel)) {
        usePlayerStore.setState({
          notice: `Win level ${level} before facing this opponent.`,
        });
        return;
      }
      void session.startFight(level);
      return;
    }
    if (this.door) {
      useWorldStore.setState({ location: this.door.name });
      useWorldStore
        .getState()
        .setView(this.door.name === "Your apartment" ? "home" : "interior");
      return;
    }
    if (
      Math.hypot(
        this.player.group.position.x - this.route.x,
        this.player.group.position.z - this.route.z,
      ) < 3
    ) {
      const p = usePlayerStore.getState().progress;
      if (p.cash < 200) {
        usePlayerStore.setState({
          notice: "The danfo fare is ₦200. Complete a delivery to earn cash.",
        });
        return;
      }
      usePlayerStore.setState({
        progress: boardBus(p),
        notice:
          "Fare paid. Press E or Get off at a stop. Each stop waits eight seconds.",
      });
      this.route.riding = true;
      this.route.dwell = 8;
      this.clearInput();
      useWorldStore.setState({ riding: true });
      return;
    }
    usePlayerStore.getState().interact();
  };
  private renderFight() {
    const fight = useSessionStore.getState().fight;
    if (!fight) {
      if (this.fightPosition) {
        this.player.group.position.copy(this.fightPosition);
        this.fightPosition = null;
        this.player.group.scale.setScalar(1);
        this.player.group.rotation.z = 0;
        this.home.root.visible = this.view === "home";
        this.interior.visible = this.view === "interior";
        this.arena.root.visible = false;
        this.city.root.visible = this.view === "city";
        this.districts.root.visible = this.view === "city";
        this.controls.enabled = !useWorldStore.getState().street;
        this.resetCamera();
      }
      return false;
    }
    if (!this.fightPosition) {
      this.fightPosition = this.player.group.position.clone();
      this.clearInput();
      this.controls.enabled = false;
    }
    this.home.root.visible =
      this.city.root.visible =
      this.districts.root.visible =
      this.interior.visible =
      this.presence.root.visible =
        false;
    this.arena.root.visible = true;
    this.player.group.visible = true;
    this.markers.forEach((m) => (m.hidden = true));
    if (this.fightSnapshot !== fight.updatedAt) {
      this.fightSnapshot = fight.updatedAt;
      this.fightReceived = performance.now();
    }
    const p = this.player,
      e = this.arena.enemy,
      now =
        fight.updatedAt +
        Math.min(0.3, (performance.now() - this.fightReceived) / 1000);
    const pulse = Math.max(0, 1 - (now - fight.lastActionAt) / 0.45),
      enemyPulse = Math.max(0, 1 - (now - fight.enemyHitAt) / 0.45);
    p.group.scale.setScalar(1.35);
    p.group.position.set(-1.35 + pulse * 0.4, 0, 0);
    p.group.rotation.set(0, Math.PI / 2, fight.status === "lost" ? -0.6 : 0);
    e.group.position.set(1.35 - enemyPulse * 0.4, 0, 0);
    e.group.rotation.set(0, -Math.PI / 2, fight.status === "won" ? 0.9 : 0);
    e.group.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material === this.kit.material(this.enemyColor)
      )
        o.material = this.kit.material(CHALLENGES[fight.level].color);
    });
    this.enemyColor = CHALLENGES[fight.level].color;
    p.arms.forEach((arm, i) => {
      arm.rotation.x = -0.4;
      arm.rotation.z = 0;
      if (fight.lastAction === "jab" && i === 0) arm.rotation.x -= pulse * 1.5;
      if (fight.lastAction === "block") {
        arm.rotation.x -= pulse;
        arm.rotation.z = (i ? 1 : -1) * pulse * 0.4;
      }
    });
    p.legs.forEach(
      (leg, i) =>
        (leg.rotation.x =
          fight.lastAction === "kick" && i === 1 ? -pulse * 1.5 : 0),
    );
    if (fight.lastAction === "dodge") p.group.position.z = pulse * 0.8;
    e.arms.forEach(
      (arm, i) =>
        (arm.rotation.x =
          -0.4 -
          (i === 0 ? enemyPulse * 1.5 : 0) -
          (fight.status === "active" && fight.nextAttack - now < 0.85
            ? 0.65
            : 0)),
    );
    this.arena.hit.visible =
      pulse > 0.3 &&
      (fight.lastAction === "jab" || fight.lastAction === "kick");
    this.arena.hit.scale.setScalar(0.25 + pulse * 0.3);
    this.sunlight.position.set(-10, 20, 8);
    this.sunlight.target.position.set(0, 0, 0);
    const portrait = this.fightCamera.aspect < 0.8;
    this.fightCamera.position.set(6, portrait ? 5.5 : 4.4, portrait ? 10 : 8);
    this.fightCamera.lookAt(0, portrait ? -0.6 : 1, 0);
    this.renderer.render(this.scene, this.fightCamera);
    return true;
  }
  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.unsubscribers.forEach((fn) => fn());
    this.controls.dispose();
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.clearInput);
    document.removeEventListener("visibilitychange", this.clearInput);
    window.removeEventListener("naija:camera", this.cameraAction);
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.pointerDown,
    );
    this.renderer.domElement.removeEventListener("pointerup", this.pointerUp);
    this.renderer.domElement.removeEventListener(
      "pointercancel",
      this.clearInput,
    );
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.markers.forEach((m) => m.remove());
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => {
          if (m instanceof THREE.MeshBasicMaterial && m.map) {
            m.map.dispose();
            m.dispose();
          }
        });
      }
      if (o instanceof THREE.DirectionalLight) o.shadow.dispose();
    });
    this.presence.dispose();
    this.districts.dispose();
    window.removeEventListener("naija:interact", this.interact);
    this.renderer.domElement.removeEventListener(
      "pointermove",
      this.pointerMove,
    );
    this.kit.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.clearInput();
    usePlayerStore.setState({ nearby: null });
    useWorldStore.setState({ ready: false });
  }
}
