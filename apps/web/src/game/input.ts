export const touchInput = { up: false, down: false, left: false, right: false };
export function clearTouchInput() {
  for (const key of Object.keys(touchInput) as (keyof typeof touchInput)[])
    touchInput[key] = false;
}
