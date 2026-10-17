import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { api } from "../stores/sessionStore";
import {
  advance,
  fire,
  racer,
  obstacles,
  DEFAULT_OPTIONS,
  type Match,
  type Options,
} from "../../../../packages/shared/src/race-match";
import { buildCourse } from "./course";
import { loadKart } from "./assets";
import { buildEnvironment } from "./environment";
import { newVehicle, track, TAU, type DriveInput } from "./physics";
import "./racing.css";
import { Gamepad } from "./Gamepad";
import {
  positionNameplate,
  readNameplatePreference,
  NAMEPLATE_PREFERENCE,
} from "./nameplate";
const route = Array.from({ length: 100 }, (_, i) => {
  const p = track((i / 99) * TAU);
  return `${p.x + 85},${p.z + 65}`;
}).join(" ");
export default function RacingChallenge({
  name,
  userId,
  options = DEFAULT_OPTIONS,
  match,
  onExit,
}: {
  name: string;
  userId: string;
  options?: Options;
  match?: Match;
  onExit: () => void;
}) {
  const [eventState, setEventState] = useState<Match | null>(match ?? null);
  const [networkError, setNetworkError] = useState("");
  const eventRef = useRef<Match | null>(match ?? null),
    fireRef = useRef(false),
    inputRef = useRef<DriveInput>({
      throttle: 0,
      steer: 0,
      brake: false,
      boost: false,
    });
  const self = eventState?.players.find((p) => p.id === userId);
  async function exitGame() {
    if (match && eventRef.current?.status === "active") {
      try {
        await api("races/action", { id: match.id, action: "leave" });
      } catch (e) {
        // A disconnected player expires on the server; never trap the player here.
        setNetworkError((e as Error).message);
      }
    }
    onExit();
  }
  const [showNames, setShowNames] = useState(readNameplatePreference);
  const namesRef = useRef(showNames),
    nameplate = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null),
    controls = useRef<DriveInput>({
      throttle: 0,
      steer: 0,
      brake: false,
      boost: false,
    });
  const modeRef = useRef<"inspect" | "drive">("inspect"),
    resetRef = useRef(false),
    paintRef = useRef(0xf4b92c),
    qualityRef = useRef("high");
  const [mode, setMode] = useState<"inspect" | "drive">("inspect"),
    [status, setStatus] = useState("Loading character, kart and circuit…"),
    [error, setError] = useState(""),
    [paint, setPaint] = useState(0xf4b92c),
    [quality, setQuality] = useState("high"),
    [version, setVersion] = useState(0);
  const [stats, setStats] = useState({
    speed: 0,
    distance: 0,
    charge: 1,
    x: 0,
    z: 48,
    fps: 0,
    offroad: false,
  });
  const [controlSettings, setControlSettings] = useState(false);
  const [controlVersion, setControlVersion] = useState(0);
  const switchMode = (m: "inspect" | "drive") => {
    setControlVersion((v) => v + 1);
    inputRef.current = { throttle: 0, steer: 0, brake: false, boost: false };
    modeRef.current = m;
    setMode(m);
    mount.current?.querySelector("canvas")?.focus({ preventScroll: true });
    controls.current = { throttle: 0, steer: 0, brake: false, boost: false };
  };
  useEffect(() => {
    const host = mount.current!;
    let disposed = false,
      frame = 0,
      renderer: THREE.WebGLRenderer | undefined;
    let cleanup = () => {};
    setError("");
    setStatus("Loading character, kart and circuit…");
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !matchMedia("(pointer: coarse)").matches,
        alpha: false,
        powerPreference: "high-performance",
      });
      const context = renderer.getContext();
      const debug = context.getExtension("WEBGL_debug_renderer_info");
      const software =
        debug &&
        /swiftshader|llvmpipe|software/i.test(
          context.getParameter(debug.UNMASKED_RENDERER_WEBGL),
        );
      if (
        software ||
        innerWidth < 600 ||
        matchMedia("(pointer: coarse)").matches
      ) {
        qualityRef.current = "low";
        setQuality("low");
      }
      renderer.setPixelRatio(
        qualityRef.current === "low" ? 0.85 : Math.min(devicePixelRatio, 1.5),
      );
      renderer.shadowMap.enabled = qualityRef.current === "high";
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute(
        "aria-label",
        "Interactive 3D kart and Lagos waterfront circuit",
      );
      renderer.domElement.tabIndex = 0;
      host.append(renderer.domElement);
      const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 700);
      const world = buildEnvironment(scene, renderer),
        orbit = new OrbitControls(camera, renderer.domElement);
      orbit.enableDamping = true;
      orbit.minDistance = 4;
      orbit.maxDistance = 18;
      orbit.maxPolarAngle = Math.PI * 0.47;
      orbit.minPolarAngle = 0.3;
      orbit.autoRotate = true;
      orbit.autoRotateSpeed = 0.4;
      orbit.enablePan = false;
      let sceneReady = false;
      const vehicle = newVehicle();
      const course = buildCourse(scene, options, userId);
      if (!match) {
        const player = racer(userId, name, options.weapon);
        player.accepted = true;
        eventRef.current = {
          id: "practice",
          host: userId,
          options,
          players: [player],
          status: "active",
          created: Date.now(),
          updated: Date.now(),
          starts: 0,
          time: 0,
          winner: null,
          shots: [],
          cleared: [],
          revision: 0,
          practice: true,
        };
      }
      const remoteKarts = new Map<
          string,
          Awaited<ReturnType<typeof loadKart>>
        >(),
        remoteLabels = new Map<string, HTMLDivElement>();
      let networkTimer: ReturnType<typeof setTimeout> | undefined;
      const synchronize = async () => {
        if (disposed || !match) return;
        const fireRequested = fireRef.current;
        fireRef.current = false;
        try {
          const result = await api("races/action", {
            id: match.id,
            action: eventRef.current?.status === "active" ? "input" : "poll",
            input: inputRef.current,
            fire: fireRequested,
            ready: sceneReady,
          });
          if (!disposed) {
            eventRef.current = result.match;
            setEventState(result.match);
            setNetworkError("");
          }
        } catch (e) {
          if (!disposed) setNetworkError((e as Error).message);
        } finally {
          if (!disposed) networkTimer = setTimeout(synchronize, 150);
        }
      };
      if (match) void synchronize();
      const inspectionScale = () =>
        Math.max(1, Math.min(1.7, host.clientHeight / host.clientWidth));
      camera.position.set(
        vehicle.x + 4.8 * inspectionScale(),
        1.3 + 1.3 * inspectionScale(),
        vehicle.z + 4 * inspectionScale(),
      );
      orbit.target.set(vehicle.x, 1.15, vehicle.z);
      const keys = new Set<string>();
      let kart: Awaited<ReturnType<typeof loadKart>> | undefined;
      let last = performance.now(),
        elapsed = 0,
        frames = 0,
        report = 0,
        qualityApplied = "";
      const resize = () => {
        const { width, height } = host.getBoundingClientRect();
        renderer!.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();
      const clear = () => {
        keys.clear();
        setControlVersion((v) => v + 1);
        inputRef.current = {
          throttle: 0,
          steer: 0,
          brake: false,
          boost: false,
        };
        controls.current = {
          throttle: 0,
          steer: 0,
          brake: false,
          boost: false,
        };
      };
      const key = (event: KeyboardEvent) => {
        if (
          ["INPUT", "SELECT"].includes((event.target as HTMLElement)?.tagName)
        )
          return;
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
            event.code,
          )
        )
          event.preventDefault();
        if (event.type === "keydown") {
          keys.add(event.code);
          if (event.code === "KeyR" && !match) resetRef.current = true;
          if (event.code === "Space" && !event.repeat) fireRef.current = true;
          if (event.code === "Escape" && !match) switchMode("inspect");
        } else keys.delete(event.code);
      };
      window.addEventListener("keydown", key);
      window.addEventListener("keyup", key);
      window.addEventListener("blur", clear);
      document.addEventListener("visibilitychange", clear);
      const lost = (e: Event) => {
        e.preventDefault();
        setError(
          "The 3D graphics context was interrupted. Try reloading the scene.",
        );
      };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      const resources = (root: THREE.Object3D) => {
        const textures = new Set<THREE.Texture>();
        root.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            for (const mat of Array.isArray(obj.material)
              ? obj.material
              : [obj.material]) {
              for (const value of Object.values(mat))
                if (value instanceof THREE.Texture) textures.add(value);
              mat.dispose();
            }
          } else if (obj instanceof THREE.Line) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
        });
        for (const t of textures) t.dispose();
      };
      void loadKart(
        match?.players.find((p) => p.id === userId)?.weapon ?? options.weapon,
      )
        .then((loaded) => {
          if (disposed) {
            resources(loaded.root);
            return;
          }
          kart = loaded;
          scene.add(kart.root);
          if (match) {
            switchMode("drive");
            for (const [i, p] of match.players.entries()) {
              if (p.id === userId) continue;
              void loadKart(p.weapon)
                .then((remote) => {
                  if (disposed) {
                    resources(remote.root);
                    return;
                  }
                  remote.paint.color.setHex(
                    [0x19ae97, 0xe66a88, 0x659aed, 0xffc145][i % 4],
                  );
                  remote.root.position.set(p.vehicle.x, 0.06, p.vehicle.z);
                  remote.root.rotation.y = p.vehicle.yaw;
                  scene.add(remote.root);
                  remoteKarts.set(p.id, remote);
                  const label = document.createElement("div");
                  label.className = "race-remote-name";
                  label.textContent = p.name;
                  label.hidden = true;
                  host.append(label);
                  remoteLabels.set(p.id, label);
                })
                .catch(() => {
                  if (!disposed)
                    setNetworkError(
                      "A rival model could not load. Reopen the race to retry.",
                    );
                });
            }
          }
          setStatus("");
        })
        .catch(() => {
          if (!disposed)
            setError(
              "The character or kart could not load. Check your connection and retry.",
            );
        });
      function render(now: number) {
        if (disposed) return;
        if (qualityRef.current === "low" && now - last < 1000 / 30) {
          frame = requestAnimationFrame(render);
          return;
        }
        const wallDelta = (now - last) / 1000;
        const dt = Math.min(0.05, wallDelta);
        last = now;
        if (qualityApplied !== qualityRef.current) {
          qualityApplied = qualityRef.current;
          renderer!.setPixelRatio(
            qualityApplied === "high" ? Math.min(devicePixelRatio, 1.5) : 0.75,
          );
          renderer!.shadowMap.enabled = qualityApplied === "high";
          resize();
        }
        if (resetRef.current) {
          Object.assign(vehicle, newVehicle());
          if (!match && eventRef.current) {
            const m = eventRef.current;
            const player = racer(userId, name, options.weapon);
            player.accepted = true;
            m.players = [player];
            m.time = 0;
            m.winner = null;
            m.shots = [];
            m.cleared = [];
            m.status = "active";
            m.updated = Date.now();
          }
          resetRef.current = false;
          clear();
          orbit.target.set(vehicle.x, 1.15, vehicle.z);
          camera.position.set(
            vehicle.x + 4.8 * inspectionScale(),
            1.3 + 1.3 * inspectionScale(),
            vehicle.z + 4 * inspectionScale(),
          );
        }
        if (kart) {
          if (modeRef.current === "drive" && !document.hidden) {
            const touch = controls.current;
            const input: DriveInput = {
              throttle:
                keys.has("KeyW") || keys.has("ArrowUp")
                  ? 1
                  : keys.has("KeyS") || keys.has("ArrowDown")
                    ? -1
                    : touch.throttle,
              steer:
                keys.has("KeyA") || keys.has("ArrowLeft")
                  ? 1
                  : keys.has("KeyD") || keys.has("ArrowRight")
                    ? -1
                    : touch.steer,
              brake:
                keys.has("ShiftLeft") || keys.has("ShiftRight") || touch.brake,
              boost: keys.has("KeyE") || touch.boost,
            };
            inputRef.current = input;
            const m = eventRef.current;
            if (m) {
              const local = m.players.find((p) => p.id === userId)!;
              if (!match) {
                local.input = input;
                local.lastInput = Date.now();
                m.updated = Date.now() - Math.min(100, wallDelta * 1000);
                advance(m, Date.now());
                if (fireRef.current) {
                  fire(m, local);
                  fireRef.current = false;
                }
                Object.assign(vehicle, local.vehicle);
              } else {
                const v = local.vehicle;
                vehicle.x = THREE.MathUtils.lerp(
                  vehicle.x,
                  v.x,
                  1 - Math.exp(-dt * 18),
                );
                vehicle.z = THREE.MathUtils.lerp(
                  vehicle.z,
                  v.z,
                  1 - Math.exp(-dt * 18),
                );
                vehicle.yaw +=
                  Math.atan2(
                    Math.sin(v.yaw - vehicle.yaw),
                    Math.cos(v.yaw - vehicle.yaw),
                  ) *
                  (1 - Math.exp(-dt * 18));
                vehicle.speed = v.speed;
                vehicle.steer = v.steer;
                vehicle.charge = v.charge;
                vehicle.boost = v.boost;
                vehicle.distance = v.distance;
                vehicle.offroad = v.offroad;
              }
            }
          }
          kart.root.position.set(vehicle.x, 0.06, vehicle.z);
          kart.root.rotation.y = vehicle.yaw;
          kart.root.rotation.z = THREE.MathUtils.lerp(
            kart.root.rotation.z,
            -vehicle.steer * Math.min(Math.abs(vehicle.speed) / 28, 1) * 0.045,
            1 - Math.exp(-dt * 8),
          );
          kart.paint.color.setHex(paintRef.current);
          kart.steering.rotation.z = -vehicle.steer * 0.35;
          for (const wheel of kart.frontWheels)
            wheel.rotation.y = vehicle.steer * 0.4;
          // Wheel mesh geometry rotates around each imported wheel's local axle.
          for (const wheel of kart.allWheels)
            wheel.rotation.x += (vehicle.speed * dt) / 1.05;
          if (kart.head)
            kart.head.rotation.z = THREE.MathUtils.lerp(
              kart.head.rotation.z,
              vehicle.steer * 0.035,
              1 - Math.exp(-dt * 5),
            );
          if (modeRef.current === "inspect") {
            vehicle.speed = 0;
            orbit.enabled = true;
            orbit.target.lerp(
              new THREE.Vector3(vehicle.x, 1.3, vehicle.z),
              0.1,
            );
            orbit.update();
          } else {
            orbit.enabled = false;
            const distance = 7.5 + Math.abs(vehicle.speed) * 0.025;
            const desired = new THREE.Vector3(
              vehicle.x - Math.sin(vehicle.yaw) * distance,
              3.8,
              vehicle.z - Math.cos(vehicle.yaw) * distance,
            );
            camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
            camera.lookAt(
              vehicle.x + Math.sin(vehicle.yaw) * 3,
              1.1,
              vehicle.z + Math.cos(vehicle.yaw) * 3,
            );
            camera.fov = THREE.MathUtils.lerp(
              camera.fov,
              vehicle.boost > 0 ? 57 : 47,
              dt * 3,
            );
            camera.updateProjectionMatrix();
          }
          world.sun.position.set(vehicle.x - 40, 65, vehicle.z + 35);
          world.sun.target.position.set(vehicle.x, 0, vehicle.z);
          world.sun.target.updateMatrixWorld();
        }
        if (kart) {
          const event = eventRef.current;
          if (event) {
            course.update(event, dt);
            for (const p of event.players) {
              const remote = remoteKarts.get(p.id);
              if (!remote) continue;
              remote.root.visible = p.accepted;
              const v = p.vehicle;
              remote.root.position.lerp(
                new THREE.Vector3(v.x, 0.06, v.z),
                1 - Math.exp(-dt * 14),
              );
              remote.root.rotation.y +=
                Math.atan2(
                  Math.sin(v.yaw - remote.root.rotation.y),
                  Math.cos(v.yaw - remote.root.rotation.y),
                ) *
                (1 - Math.exp(-dt * 14));
              for (const wheel of remote.allWheels)
                wheel.rotation.x += (v.speed * dt) / 1.05;
            }
          }
          renderer!.render(scene, camera);
          sceneReady = true;
          if (event)
            for (const p of event.players) {
              const remote = remoteKarts.get(p.id),
                label = remoteLabels.get(p.id);
              if (remote && label) {
                const anchor =
                  remote.head?.getWorldPosition(new THREE.Vector3()) ??
                  remote.root.position.clone();
                anchor.y += 0.65;
                positionNameplate(
                  label,
                  anchor,
                  camera,
                  host.clientWidth,
                  host.clientHeight,
                  namesRef.current && p.accepted,
                );
              }
            }

          const anchor =
            kart.head?.getWorldPosition(new THREE.Vector3()) ??
            new THREE.Vector3(vehicle.x, 1.7, vehicle.z);
          anchor.y += 0.65;
          if (nameplate.current)
            positionNameplate(
              nameplate.current,
              anchor,
              camera,
              host.clientWidth,
              host.clientHeight,
              namesRef.current,
            );
          if (
            world.water.material instanceof THREE.MeshPhysicalMaterial &&
            world.water.material.normalMap
          )
            world.water.material.normalMap.offset.x += dt * 0.008;
        }
        elapsed += wallDelta;
        frames++;
        report += wallDelta;
        if (report > 0.15) {
          if (!match && eventRef.current)
            setEventState(structuredClone(eventRef.current));
          setStats({
            speed: Math.abs(vehicle.speed) * 3.6,
            distance: vehicle.distance,
            charge: vehicle.charge,
            x: vehicle.x,
            z: vehicle.z,
            fps: Math.round(frames / Math.max(elapsed, 0.01)),
            offroad: vehicle.offroad,
          });
          report = 0;
          if (elapsed > 1) {
            elapsed = 0;
            frames = 0;
          }
        }
        frame = requestAnimationFrame(render);
      }
      frame = requestAnimationFrame(render);
      cleanup = () => {
        clearTimeout(networkTimer);
        for (const label of remoteLabels.values()) label.remove();
        observer.disconnect();
        window.removeEventListener("keydown", key);
        window.removeEventListener("keyup", key);
        window.removeEventListener("blur", clear);
        document.removeEventListener("visibilitychange", clear);
        renderer!.domElement.removeEventListener("webglcontextlost", lost);
        orbit.dispose();
        resources(scene);
        world.env.dispose();
        world.sun.shadow.dispose();
        renderer!.dispose();
        renderer!.forceContextLoss();
        renderer!.domElement.remove();
      };
    } catch {
      setError(
        "This browser could not start WebGL. Enable hardware acceleration or try another browser.",
      );
      renderer?.dispose();
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [version]);
  return (
    <main
      className={`race-page ${mode === "drive" ? "race-driving" : ""} ${controlSettings ? "race-settings-open" : ""}`}
      aria-label="Street Kings racing challenge"
    >
      {mode === "drive" && (
        <button
          className="race-pad-settings"
          aria-expanded={controlSettings}
          onClick={() => setControlSettings((v) => !v)}
        >
          ⚙ Settings
        </button>
      )}
      <div ref={mount} className="race-view" />
      <div
        ref={nameplate}
        className="race-nameplate"
        hidden
        role="note"
        aria-label={`Player username: ${name}`}
      >
        <i aria-hidden="true" />
        <strong>{name}</strong>
        <span>YOU</span>
      </div>
      <header className="race-top">
        <button onClick={() => void exitGame()}>← Dashboard</button>
        <div className="race-title">
          <span>NAIJA HUSTLE / CHALLENGES</span>
          <h1>
            STREET KINGS<span>MARINA CIRCUIT</span>
          </h1>
        </div>
        <div className="race-player">
          <i />
          {name}
          <small>{match ? "CREW MATCH" : "PRACTICE"}</small>
        </div>
      </header>
      <div className="race-mode">
        <button
          disabled={!!match}
          aria-pressed={mode === "inspect"}
          onClick={() => switchMode("inspect")}
        >
          ◎ Inspect kart
        </button>
        <button
          aria-pressed={mode === "drive"}
          disabled={!!status || !!error}
          onClick={() => switchMode("drive")}
        >
          ↗ Drive circuit
        </button>
      </div>
      {mode === "inspect" && !status && !error && (
        <section className="race-intro">
          <span className="race-kicker">01 / REAL-TIME 3D</span>
          <h2>
            Meet your
            <br />
            <em>street machine.</em>
          </h2>
          <p>
            A first look at Street Kings inside the game. Rotate the camera,
            choose a colour, then take a lap around the waterfront.
          </p>
          <button className="race-start" onClick={() => switchMode("drive")}>
            Take a test drive <span>→</span>
          </button>
          <small>Drag to orbit · Scroll / pinch to zoom</small>
        </section>
      )}
      <aside className="race-options">
        {mode === "drive" && !match && (
          <button className="race-reset" onClick={() => switchMode("inspect")}>
            Inspect kart
          </button>
        )}
        <label className="race-name-toggle">
          <input
            type="checkbox"
            checked={showNames}
            onChange={(e) => {
              const value = e.target.checked;
              namesRef.current = value;
              setShowNames(value);
              if (nameplate.current && !value) nameplate.current.hidden = true;
              try {
                localStorage.setItem(
                  NAMEPLATE_PREFERENCE,
                  value ? "on" : "off",
                );
              } catch {
                /* Viewing preference still works without browser storage. */
              }
            }}
          />{" "}
          Show player names
        </label>
        <label>BODY COLOUR</label>
        <div className="race-swatches">
          {[
            [0xf4b92c, "Danfo gold"],
            [0x147c59, "Naija green"],
            [0xed7156, "Coral"],
            [0x257baf, "Atlantic blue"],
          ].map(([color, label]) => (
            <button
              key={color}
              title={String(label)}
              aria-label={String(label)}
              aria-pressed={paint === color}
              style={{
                background: "#" + Number(color).toString(16).padStart(6, "0"),
              }}
              onClick={() => {
                paintRef.current = Number(color);
                setPaint(Number(color));
              }}
            />
          ))}
        </div>
        <label htmlFor="race-quality">GRAPHICS</label>
        <select
          id="race-quality"
          value={quality}
          onChange={(e) => {
            qualityRef.current = e.target.value;
            setQuality(e.target.value);
          }}
        >
          <option value="high">High · shadows</option>
          <option value="low">Light · performance</option>
        </select>
        <button
          disabled={!!match}
          className="race-reset"
          onClick={() => (resetRef.current = true)}
        >
          ↺ Reset kart <kbd>R</kbd>
        </button>
      </aside>
      {mode === "drive" && eventState && (
        <aside className="race-event-hud" aria-label="Match status">
          <strong>
            {options.mode.toUpperCase()} · {match ? "CREW MATCH" : "PRACTICE"}
          </strong>
          <p>
            {eventState.time < 0
              ? eventState.waiting
                ? "Waiting for all drivers…"
                : "Get ready…"
              : `${Math.max(0, Math.floor(options.mode === "battle" ? 90 - eventState.time : eventState.time))}s · Lap ${Math.min((self?.lap ?? 0) + 1, options.laps)}/${options.laps} · Gate ${self?.checkpoint ?? 1}/12 · Score ${self?.score ?? 0}`}
          </p>
          {eventState.players.map((p) => (
            <div className="race-rank" key={p.id}>
              <span>
                {p.name}
                {!p.accepted ? " · left" : ""}
              </span>
              <b>
                {options.mode === "battle"
                  ? p.score
                  : `${p.lap}/${options.laps} laps`}
              </b>
            </div>
          ))}
          <button
            disabled={
              !!self?.cooldown ||
              eventState.status !== "active" ||
              eventState.time < 0
            }
            onClick={() => {
              fireRef.current = true;
              mount.current
                ?.querySelector("canvas")
                ?.focus({ preventScroll: true });
            }}
          >
            {(self?.weapon ?? options.weapon).toUpperCase()}{" "}
            {self?.cooldown ? `${self.cooldown.toFixed(1)}s` : "· SPACE / TAP"}
          </button>
          <p>◆ +5 target · hit +3 · cyan pads boost</p>
          {networkError && <p role="alert">{networkError}</p>}
        </aside>
      )}
      {eventState &&
        (["finished", "cancelled"].includes(eventState.status) ||
          self?.accepted === false) && (
          <div
            className="race-result"
            role="dialog"
            aria-modal="true"
            aria-label="Match result"
          >
            <div>
              <span>LAGOS AFTERGLOW</span>
              <h2>
                {self?.accepted === false
                  ? "You left the race"
                  : eventState.status === "cancelled"
                    ? "Match cancelled"
                    : eventState.winner === userId
                      ? "You won!"
                      : eventState.winner
                        ? `${eventState.players.find((p) => p.id === eventState.winner)?.name} wins`
                        : "Time’s up · draw"}
              </h2>
              <p>
                {match && eventState.winner
                  ? "Winner earns 50 in-game coins."
                  : "Practice and cancelled or drawn matches award no coins."}
              </p>
              <p>
                Your score: {self?.score ?? 0} · Laps: {self?.lap ?? 0}
              </p>
              <button onClick={() => void exitGame()}>Back to your crew</button>
            </div>
          </div>
        )}
      {mode === "drive" && (
        <>
          <div className="race-speed">
            <strong>{Math.round(stats.speed)}</strong>
            <span>KM/H</span>
            <div className="race-boost">
              <i style={{ width: `${stats.charge * 100}%` }} />
            </div>
            <small>
              {stats.offroad ? "OFF ROAD · SLOW DOWN" : "BOOST · E"}
            </small>
          </div>
          <div className="race-map">
            <svg viewBox="0 0 170 130" aria-label="Circuit map">
              <polyline
                points={route}
                fill="none"
                stroke="#bed6be"
                strokeWidth="8"
              />
              <polyline
                points={route}
                fill="none"
                stroke="#354e43"
                strokeWidth="5"
              />
              {obstacles(options).map((o) => (
                <circle
                  key={o.id}
                  cx={o.x + 85}
                  cy={o.z + 65}
                  r={o.kind === "target" ? 2 : 1.7}
                  fill={
                    o.kind === "boost"
                      ? "#58f0ca"
                      : o.kind === "target"
                        ? "#ffe77c"
                        : "#ee7597"
                  }
                />
              ))}
              {eventState?.players
                .filter((p) => p.id !== userId && p.accepted)
                .map((p) => (
                  <circle
                    key={p.id}
                    cx={p.vehicle.x + 85}
                    cy={p.vehicle.z + 65}
                    r="3"
                    fill="#b89cfa"
                  />
                ))}
              <circle
                cx={stats.x + 85}
                cy={stats.z + 65}
                r="4"
                fill="#f7c648"
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            <span>{Math.round(stats.distance)} m driven</span>
          </div>
          <Gamepad
            key={controlVersion}
            onInput={(input) => {
              controls.current = input;
            }}
            onFire={() => {
              fireRef.current = true;
            }}
            fireDisabled={
              !!self?.cooldown ||
              eventState?.status !== "active" ||
              (eventState?.time ?? -1) < 0
            }
            weapon={options.weapon}
          />
        </>
      )}
      <footer className="race-bottom">
        <span>
          {mode === "inspect"
            ? "LAGOS AFTERGLOW / CHOOSE YOUR CHALLENGE"
            : "WASD / ARROWS · DRIVE    SHIFT · DRIFT    E · BOOST    R · RESET"}
        </span>
        <span>{stats.fps} FPS · LIVE WEBGL</span>
        <small>
          {match
            ? "Crew match · server-verified results · 50 coins to the winner"
            : "Solo practice · no coin rewards · invite friends from the dashboard"}
        </small>
      </footer>
      {(status || error) && (
        <div className="race-loading" role={error ? "alert" : "status"}>
          <h2>
            {error ? "Unable to open the circuit" : "Opening Marina Circuit"}
          </h2>
          <p>{error || status}</p>
          {error && (
            <button onClick={() => setVersion((v) => v + 1)}>
              Retry loading
            </button>
          )}
          <button onClick={() => void exitGame()}>Back to dashboard</button>
        </div>
      )}
    </main>
  );
}
