import { useEffect, useRef, useState } from "react";
import { api } from "../stores/sessionStore";
export type Placement = "dashboard" | "racing" | "festival";
type Creative = {
  id: string;
  title: string;
  description: string;
  url: string;
  theme: string;
  expiresAt: number;
};
export function usePlacement(placement: Placement) {
  const [ads, setAds] = useState<Creative[]>([]);
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const active = ads.filter((a) => a.expiresAt > Date.now());
  const ad = active[tick % Math.max(1, active.length)];
  useEffect(() => {
    let disposed = false;
    const load = () =>
      void api("commerce/placements/" + placement)
        .then((d) => {
          if (!disposed) setAds(d.ads);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [placement]);
  useEffect(() => {
    const timer = setInterval(() => setTick((i) => i + 1), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!ad || !ref.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    const schedule = () => {
      clearTimeout(timer);
      if (visible && document.visibilityState === "visible")
        timer = setTimeout(() => {
          if (ad.expiresAt > Date.now())
            void api("commerce/impression", { id: ad.id, placement }).catch(
              () => {},
            );
        }, 1000);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        schedule();
      },
      { threshold: 0.5 },
    );
    observer.observe(ref.current);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [ad?.id, ad?.expiresAt, placement]);
  return { ad, ref };
}
