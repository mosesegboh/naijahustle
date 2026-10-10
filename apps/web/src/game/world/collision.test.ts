import { expect, it } from "vitest";
import { canOccupy } from "./collision";
const bounds = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };
const furniture = [{ x: 5, z: 5, width: 2, depth: 2 }];
it("keeps the player footprint out of furniture and inside the world", () => {
  expect(canOccupy(5, 5, furniture, bounds)).toBe(false);
  expect(canOccupy(3.8, 5, furniture, bounds)).toBe(false);
  expect(canOccupy(3.7, 5, furniture, bounds)).toBe(true);
  expect(canOccupy(5, 3.7, furniture, bounds)).toBe(true);
  expect(canOccupy(-0.1, 5, furniture, bounds)).toBe(false);
  expect(canOccupy(5, 10.1, furniture, bounds)).toBe(false);
  expect(canOccupy(NaN, 5, furniture, bounds)).toBe(false);
});
