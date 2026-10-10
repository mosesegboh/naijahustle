import { touchInput } from "../game/input";
export function TouchControls() {
  return (
    <div className="dpad" aria-label="Movement controls">
      {(["up", "left", "down", "right"] as const).map((direction, i) => (
        <button
          key={direction}
          className={direction}
          aria-label={`Move ${direction}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            touchInput[direction] = true;
          }}
          onPointerUp={() => (touchInput[direction] = false)}
          onPointerCancel={() => (touchInput[direction] = false)}
          onLostPointerCapture={() => (touchInput[direction] = false)}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter")
              touchInput[direction] = true;
          }}
          onKeyUp={() => (touchInput[direction] = false)}
          onBlur={() => (touchInput[direction] = false)}
        >
          {["↑", "←", "↓", "→"][i]}
        </button>
      ))}
    </div>
  );
}
