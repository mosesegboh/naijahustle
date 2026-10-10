import * as THREE from "three";
import { ModelKit } from "./models";
import { AVATARS } from "@naija-hustle/shared";
import { api, useSessionStore, type Peer } from "../../stores/sessionStore";
export class Presence {
  readonly root = new THREE.Group();
  private people = new Map<
    string,
    {
      kit: ModelKit;
      model: ReturnType<ModelKit["person"]>;
      peer: Peer;
      label: THREE.Mesh;
    }
  >();
  private timer = 0;
  private busy = false;
  private disposed = false;
  private elapsed = 0;
  constructor(private position: () => Record<string, unknown>) {
    this.timer = window.setInterval(() => void this.sync(), 500);
  }
  private async sync() {
    const state = useSessionStore.getState();
    if (this.disposed || this.busy || !state.user || document.hidden) return;
    this.busy = true;
    const id = state.user.id;
    try {
      const d = await api("presence", this.position());
      if (!this.disposed && useSessionStore.getState().user?.id === id)
        useSessionStore.setState({
          peers: d.players,
          online: d.online,
          connected: true,
        });
    } catch {
      if (!this.disposed)
        useSessionStore.setState({ connected: false, peers: [], online: 0 });
    } finally {
      this.busy = false;
    }
  }
  update(dt: number, x: number, z: number, camera: THREE.Camera) {
    this.elapsed += dt;
    const peers = useSessionStore
        .getState()
        .peers.filter((p) => Math.hypot(p.x - x, p.z - z) < 100)
        .slice(0, 32),
      ids = new Set(peers.map((p) => p.id));
    for (const [id, p] of this.people)
      if (!ids.has(id)) {
        this.remove(p);
        this.people.delete(id);
      }
    for (const peer of peers) {
      let p = this.people.get(peer.id);
      if (!p) {
        const kit = new ModelKit(),
          model = kit.person(
            this.root,
            AVATARS[peer.avatar],
            peer.x,
            peer.z,
            1.15,
          );
        const label = kit.text(
          model.group,
          peer.name,
          0,
          2.25,
          0,
          2.4,
          "#ffffff",
          "#287458",
        );
        p = { kit, model, peer, label };
        this.people.set(peer.id, p);
      }
      p.peer = peer;
      const moving =
        Math.hypot(
          p.model.group.position.x - peer.x,
          p.model.group.position.z - peer.z,
        ) > 0.06;
      p.model.group.position.lerp(
        new THREE.Vector3(peer.x, 0, peer.z),
        Math.min(1, dt * 10),
      );
      p.model.group.rotation.y = peer.yaw;
      p.label.quaternion.copy(
        p.model.group
          .getWorldQuaternion(new THREE.Quaternion())
          .invert()
          .multiply(camera.quaternion),
      );
      p.model.legs.forEach(
        (leg, i) =>
          (leg.rotation.x = moving
            ? Math.sin(this.elapsed * 10 + i * Math.PI) * 0.5
            : 0),
      );
    }
  }
  private remove(p: { kit: ModelKit; model: ReturnType<ModelKit["person"]> }) {
    p.model.group.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshBasicMaterial
      ) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
    p.model.group.removeFromParent();
    p.kit.dispose();
  }
  dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    for (const p of this.people.values()) this.remove(p);
    this.people.clear();
  }
}
