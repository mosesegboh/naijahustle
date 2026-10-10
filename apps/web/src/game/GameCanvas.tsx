import { useEffect, useRef, useState } from "react";
import { GameWorld } from "./world/GameWorld";
export default function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    let world: GameWorld | undefined;
    const onError = () => setError(true);
    window.addEventListener("naija:render-error", onError);
    try {
      world = new GameWorld(ref.current);
    } catch (error) {
      console.error("Unable to start the 3D renderer", error);
      setError(true);
    }
    return () => {
      window.removeEventListener("naija:render-error", onError);
      world?.dispose();
    };
  }, []);
  return (
    <>
      <div
        ref={ref}
        className="game-canvas"
        role="region"
        aria-label="Interactive 3D neighbourhood"
      />
      {error && (
        <div className="render-error">
          <h2>The 3D world could not open.</h2>
          <p>
            Enable hardware acceleration or try a browser with WebGL 2 support.
          </p>
          <button onClick={() => window.location.reload()}>Try again</button>
        </div>
      )}
    </>
  );
}
