import { create } from "zustand";
export type WorldView = "home" | "city" | "interior";
export type CameraAction = "in" | "out" | "rotate" | "center";
interface WorldState {
  view: WorldView;
  panel: "mission" | "profile" | "help" | "social" | null;
  ready: boolean;
  combat: boolean;
  street: boolean;
  interaction: string;
  location: string;
  riding: boolean;
  busInfo: string;
  setView: (view: WorldView) => void;
  setPanel: (panel: WorldState["panel"]) => void;
}
export const useWorldStore = create<WorldState>((set) => ({
  view: "home",
  panel: null,
  ready: false,
  combat: false,
  street: false,
  interaction: "",
  location: "Balogun quarter",
  riding: false,
  busInfo: "",
  setView: (view) => {
    if (!useWorldStore.getState().riding && !useWorldStore.getState().combat)
      set({ view, panel: null });
  },
  setPanel: (panel) => set({ panel }),
}));
export function controlCamera(action: CameraAction) {
  window.dispatchEvent(new CustomEvent("naija:camera", { detail: action }));
}

export function interactWorld() {
  window.dispatchEvent(new Event("naija:interact"));
}
