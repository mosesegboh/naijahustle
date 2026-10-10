import { create } from "zustand";
import {
  actFight,
  advanceFight,
  newFight,
  type Fight,
  type FightAction,
} from "../../../../packages/shared/src/combat";
interface User {
  id: string;
  name: string;
  coins: number;
  level: number;
  wins: number;
}
export interface Peer {
  id: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  view: string;
  avatar: "emerald" | "gold" | "coral";
}
export async function api(path: string, body?: unknown) {
  const response = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json().catch(() => ({
    error: "Game server unavailable. Start the server to sign in.",
  }));
  if (response.status === 401 && !path.startsWith("auth/"))
    useSessionStore.setState({
      user: null,
      fight: null,
      peers: [],
      online: 0,
      error: "Your session ended. Sign in again.",
    });
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
interface SessionState {
  user: User | null;
  connected: boolean;
  error: string;
  busy: boolean;
  peers: Peer[];
  online: number;
  fight: Fight | null;
  practice: boolean;
  practiceLevel: number;
  restore: () => Promise<void>;
  auth: (mode: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  startFight: (level: number) => Promise<void>;
  action: (action: FightAction) => Promise<void>;
  tick: () => Promise<void>;
  leaveFight: () => Promise<void>;
  dismissFight: () => void;
}
let fightRequest = false;
export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  connected: false,
  error: "",
  busy: false,
  peers: [],
  online: 0,
  fight: null,
  practice: true,
  practiceLevel: 0,
  restore: async () => {
    try {
      const data = await api("me");
      set({
        user: data.user,
        connected: true,
        fight: data.user
          ? data.fight?.status === "active"
            ? data.fight
            : null
          : get().fight,
        practice: data.user ? false : get().practice,
      });
    } catch {
      set({ connected: false });
    }
  },
  auth: async (mode, name, password) => {
    if (get().busy) return;
    set({ busy: true, error: "" });
    try {
      const data = await api("auth/" + mode, { name, password });
      set({
        user: data.user,
        connected: true,
        fight: data.fight?.status === "active" ? data.fight : null,
        practice: false,
      });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ busy: false });
    }
  },
  logout: async () => {
    try {
      await api("auth/logout", {});
      set({ user: null, peers: [], online: 0, fight: null, error: "" });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  startFight: async (level) => {
    if (get().busy || get().fight?.status === "active") return;
    set({ busy: true, error: "" });
    try {
      if (get().user) {
        const d = await api("fight/start", { level });
        set({ fight: d.fight, user: d.user, practice: false });
      } else {
        if (level > get().practiceLevel)
          throw new Error("Complete the previous practice level first.");
        set({ fight: newFight(level, Date.now() / 1000), practice: true });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ busy: false });
    }
  },
  action: async (action) => {
    const { fight, practice } = get();
    if (!fight || fight.status !== "active" || fightRequest) return;
    if (practice) {
      const f = actFight(fight, action, Date.now() / 1000);
      set({
        fight: f,
        practiceLevel:
          f.status === "won"
            ? Math.max(get().practiceLevel, Math.min(3, f.level + 1))
            : get().practiceLevel,
      });
      return;
    }
    fightRequest = true;
    try {
      const d = await api("fight/action", { action });
      set({ fight: d.fight, user: d.user, error: "" });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      fightRequest = false;
    }
  },
  tick: async () => {
    const { fight, practice } = get();
    if (!fight || fight.status !== "active" || fightRequest) return;
    if (practice) {
      set({ fight: advanceFight(fight, Date.now() / 1000) });
      return;
    }
    fightRequest = true;
    try {
      const d = await api("fight/state", {});
      set({ fight: d.fight, user: d.user, error: "" });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      fightRequest = false;
    }
  },
  leaveFight: async () => {
    if (get().practice) {
      set({ fight: null });
      return;
    }
    if (fightRequest) return;
    fightRequest = true;
    try {
      const d = await api("fight/leave", {});
      set({ fight: null, user: d.user });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      fightRequest = false;
    }
  },
  dismissFight: () => {
    if (get().fight?.status !== "active") set({ fight: null });
  },
}));
