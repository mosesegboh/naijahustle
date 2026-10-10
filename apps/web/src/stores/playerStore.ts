import { create } from "zustand";
import {
  initialProgress,
  interact,
  parseProgress,
  type Progress,
  type Avatar,
  type NpcId,
} from "@naija-hustle/shared";
const SAVE_KEY = "naija-hustle:v1";
function load(): Progress {
  try {
    return (
      parseProgress(JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null")) ?? {
        ...initialProgress,
      }
    );
  } catch {
    return { ...initialProgress };
  }
}
interface State {
  progress: Progress;
  nearby: NpcId | null;
  notice: string;
  saveError: boolean;
  start: (name: string, avatar: Avatar) => void;
  interact: () => void;
  reset: () => void;
}
export const usePlayerStore = create<State>((set, get) => ({
  progress: load(),
  nearby: null,
  notice: "Find Mama Bisi by the market to begin your first hustle.",
  saveError: false,
  start: (name, avatar) => {
    if (name.trim())
      set({
        progress: {
          ...initialProgress,
          name: name.trim().slice(0, 24),
          avatar,
        },
      });
  },
  interact: () => {
    const { nearby, progress } = get();
    if (!nearby || !progress.name) return;
    const next = interact(progress, nearby);
    const notice =
      next.mission !== progress.mission
        ? next.mission === "active"
          ? "Mama Bisi: Abeg, take this parcel to Tunde by the compound. He will pay you ₦1,500."
          : "Tunde: Correct! Thank you for the delivery. ₦1,500 and 10 reputation earned. Try the danfo east of the crossroads: ride to North Estate for your next chapter."
        : nearby === "mama"
          ? progress.mission === "completed"
            ? "Mama Bisi: Well done! More hustles are coming soon."
            : "Mama Bisi: Tunde is southeast, by the compound. Follow the roads."
          : progress.mission === "completed"
            ? "Tunde: You don deliver am. Thanks again!"
            : "Tunde: Mama Bisi at the market might have a job for you.";
    set({ progress: next, notice });
  },
  reset: () =>
    set({
      progress: { ...initialProgress },
      nearby: null,
      notice: "Find Mama Bisi by the market to begin your first hustle.",
    }),
}));
usePlayerStore.subscribe((state, previous) => {
  if (state.progress === previous.progress) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state.progress));
    if (state.saveError) usePlayerStore.setState({ saveError: false });
  } catch {
    if (!state.saveError) usePlayerStore.setState({ saveError: true });
  }
});
