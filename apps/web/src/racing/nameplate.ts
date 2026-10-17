import * as THREE from "three";

// Reusable for each authenticated racer when remote racers are connected.
export function positionNameplate(
  element: HTMLElement,
  anchor: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
  enabled: boolean,
) {
  const point = anchor.clone().project(camera);
  const visible =
    enabled &&
    point.z >= -1 &&
    point.z <= 1 &&
    Math.abs(point.x) < 0.96 &&
    Math.abs(point.y) < 0.96;
  element.hidden = !visible;
  if (visible)
    element.style.transform = `translate(${(point.x * 0.5 + 0.5) * width}px, ${(-point.y * 0.5 + 0.5) * height}px) translate(-50%, -100%)`;
}
export const NAMEPLATE_PREFERENCE = "naija-hustle:show-player-names";
export function readNameplatePreference() {
  try {
    return localStorage.getItem(NAMEPLATE_PREFERENCE) !== "off";
  } catch {
    return true;
  }
}
