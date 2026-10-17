import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { positionNameplate } from "./nameplate";

describe("player username projection", () => {
  const camera = new PerspectiveCamera(60, 1, 0.1, 100);
  camera.updateMatrixWorld();
  function label() {
    return { hidden: true, style: { transform: "" } } as HTMLElement;
  }
  it("anchors the bubble to a visible head position", () => {
    const element = label();
    positionNameplate(element, new Vector3(0, 0, -5), camera, 800, 800, true);
    expect(element.hidden).toBe(false);
    expect(element.style.transform).toContain("translate(400px, 400px)");
  });
  it("hides labels when disabled, behind the camera, or off screen", () => {
    for (const [anchor, enabled] of [
      [new Vector3(0, 0, -5), false],
      [new Vector3(0, 0, 5), true],
      [new Vector3(100, 0, -5), true],
    ] as const) {
      const element = label();
      positionNameplate(element, anchor, camera, 800, 800, enabled);
      expect(element.hidden).toBe(true);
    }
  });
});
