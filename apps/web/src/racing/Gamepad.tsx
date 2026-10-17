import { useEffect, useRef, useState } from "react";
import type { DriveInput } from "./physics";

export function Gamepad({
  onInput,
  onFire,
  fireDisabled,
  weapon,
}: {
  onInput: (input: DriveInput) => void;
  onFire: () => void;
  fireDisabled: boolean;
  weapon: string;
}) {
  const [driving, setDriving] = useState(false);
  const drive = useRef(false);
  const held = useRef(new Map<number, string>());
  const [pressed, setPressed] = useState<string[]>([]);
  const callback = useRef(onInput);
  callback.current = onInput;
  const publish = () => {
    const values = [...held.current.values()];
    setPressed(values);
    callback.current({
      throttle: drive.current && !values.includes("brake") ? 1 : 0,
      steer: Number(values.includes("left")) - Number(values.includes("right")),
      brake: values.includes("brake"),
      boost: values.includes("boost"),
    });
  };
  useEffect(() => {
    const reset = () => {
      drive.current = false;
      held.current.clear();
      setDriving(false);
      setPressed([]);
      callback.current({ throttle: 0, steer: 0, brake: false, boost: false });
    };
    window.addEventListener("blur", reset);
    window.addEventListener("orientationchange", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      window.removeEventListener("blur", reset);
      window.removeEventListener("orientationchange", reset);
      document.removeEventListener("visibilitychange", reset);
      callback.current({ throttle: 0, steer: 0, brake: false, boost: false });
    };
  }, []);
  const release = (id: number) => {
    held.current.delete(id);
    publish();
  };
  const hold = (action: string) => ({
    "data-held": pressed.includes(action),
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      held.current.set(event.pointerId, action);
      if (action === "brake") {
        drive.current = false;
        setDriving(false);
      }
      publish();
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) =>
      release(event.pointerId),
    onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) =>
      release(event.pointerId),
    onLostPointerCapture: (event: React.PointerEvent<HTMLButtonElement>) =>
      release(event.pointerId),
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.code !== "Space" && event.code !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      held.current.set(
        action === "left"
          ? -1
          : action === "right"
            ? -2
            : action === "brake"
              ? -3
              : -4,
        action,
      );
      if (action === "brake") {
        drive.current = false;
        setDriving(false);
      }
      publish();
    },
    onKeyUp: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.code !== "Space" && event.code !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      for (const [id, value] of held.current)
        if (id < 0 && value === action) held.current.delete(id);
      publish();
    },
    onBlur: () => {
      for (const [id, value] of held.current)
        if (id < 0 && value === action) held.current.delete(id);
      publish();
    },
  });
  return (
    <div
      className="race-gamepad"
      aria-label="Driving controls"
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (["Space", "Enter"].includes(e.code)) e.stopPropagation();
      }}
      onKeyUp={(e) => {
        if (["Space", "Enter"].includes(e.code)) e.stopPropagation();
      }}
    >
      <div className="race-steering">
        <span>HOLD TO STEER</span>
        <div>
          <button aria-label="Steer left" {...hold("left")}>
            ◀
          </button>
          <button aria-label="Steer right" {...hold("right")}>
            ▶
          </button>
        </div>
        <small>Tap Drive, then steer</small>
      </div>
      <div className="race-action-pad">
        <button
          className="pad-drive"
          aria-label="Drive"
          aria-pressed={driving}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            drive.current = !drive.current;
            setDriving(drive.current);
            publish();
          }}
          onClick={(event) => {
            if (event.detail !== 0) return;
            drive.current = !drive.current;
            setDriving(drive.current);
            publish();
          }}
        >
          <b>▲</b>
          {driving ? "DRIVE ON" : "DRIVE"}
        </button>
        <button className="pad-brake" {...hold("brake")}>
          <b>■</b>BRAKE
        </button>
        <button
          className="pad-shoot"
          disabled={fireDisabled}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            onFire();
          }}
          onClick={(event) => {
            if (event.detail === 0) onFire();
          }}
        >
          <b>⊕</b>
          {weapon === "shield" ? "SHIELD" : weapon === "oil" ? "TRAP" : "SHOOT"}
        </button>
        <button className="pad-boost" {...hold("boost")}>
          <b>ϟ</b>BOOST
        </button>
      </div>
    </div>
  );
}
