import type { CSSProperties } from "react";
export type IconName =
  | "home"
  | "city"
  | "briefcase"
  | "user"
  | "arrow"
  | "close"
  | "sun"
  | "energy"
  | "heart"
  | "coin"
  | "star"
  | "rotate"
  | "locate"
  | "help"
  | "plus"
  | "minus"
  | "check"
  | "leaf";
const paths: Record<IconName, string> = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Zm6 11v-8h6v8",
  city: "M3 21V8h6v13M9 21V3h7v18M16 21V11h5v10M1 21h22M12 7h1M12 11h1M12 15h1M5 12h1M18 15h1",
  briefcase: "M8 7V4h8v3M3 7h18v13H3V7Zm0 5 9 3 9-3M10 13v4h4v-4",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  arrow: "M5 12h14M13 6l6 6-6 6",
  close: "m6 6 12 12M6 18 18 6",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1",
  energy: "m13 2-9 12h7l-1 8 10-13h-8l1-7",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  coin: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 16V8l6 8V8M7 10h10M7 14h10",
  star: "m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1-6.2L3 9.6l6.2-.9L12 3",
  rotate: "M20 7v5h-5M20 12a8 8 0 1 0-2.3 5.7",
  locate:
    "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v3M12 19v3M2 12h3M19 12h3M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  help: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  check: "m5 12 4 4L19 6",
  leaf: "M20 3C9 2 3 6 4 13c1 7 11 8 14 1 2-4 2-8 2-11ZM6 18l9-10",
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
