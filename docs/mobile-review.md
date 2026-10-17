# Mobile controls and scenery review

## Changes

- Racing Drive and weapon actions activate on pointer-down, including while another finger steers. Keyboard/assistive activation remains supported without duplicate clicks.
- Separate 2×2 action buttons, larger steering targets, pressed states and safe-area spacing. The mobile racing footer is hidden while driving so it cannot clutter the buttons.
- Brake now actively decelerates when throttle is released. Holding Shift with throttle still supports drifting.
- Platform jumps have a 160 ms landing buffer and 100 ms edge grace period. A buffered jump cannot create repeated airborne jumps.
- Solo platform input is applied before the simulation step, preventing slow frames from making held input stale.
- Both pads clear on orientation changes, focus loss and visibility changes; pointer capture handles finger release outside the original target.
- Coarse-pointer racing devices start on Light graphics in either orientation, without antialiasing; Light targets 30 FPS. This is a rendering target, not a measured physical-device guarantee.
- Festival scenery has layered clouds, roof trim, shaded facades, planters and clearer platform edges. The racing circuit has batched roadside planting, lanterns and clouds.

## Reproducible checks

`npm run build` and `npm test` validate the build and simulation/service tests.
`tests/gamepad.spec.ts` covers simultaneous touch input, cancellation, Drive,
Brake, Shoot, Boost and loss of focus. Full-scene checks use
`scripts/mobile-review.mjs` with isolated in-memory accounts, never the real
MongoDB database. Run with Node 22 and `--experimental-strip-types` after building.

Environment options:

- `REVIEW_ENGINE=webkit` uses an installed Playwright WebKit browser.
- `REVIEW_LOCAL_BROWSER=1` uses an installed Playwright Chromium browser.
- Otherwise Chromium attaches to `CHROME_CDP` (default port 9224).
- `REVIEW_PROFILE=iphone` or `android` selects a viewport; omitting runs both.
- `REVIEW_OUTPUT` selects screenshot storage.
- `REVIEW_PAUSE_RACE=1` is explicitly an input/layout-only diagnostic that pauses
  the race render loop. It must not be reported as a full racing gameplay pass.

These are desktop browser engines with mobile viewport/touch emulation, not
physical phones or the actual iOS/Android Chrome applications. Thermal behaviour,
real GPU performance, iOS edge gestures and network quality still need testing on
real devices. The software-rendered host Chrome runs initially stalled; use the
matching Playwright browser image for reproducible engine checks.

## Results, 17 October 2026

- Build passed; 50 gameplay/service tests passed, one separate Mongo integration test skipped.
- Twelve Chromium control checks across iPhone/Android portrait and landscape dimensions passed, including simultaneous fingers and pointer cancellation.
- WebKit native-touch pad checks passed in portrait and landscape (Drive, single weapon activation, Brake, rotation reset).
- Full WebKit iPhone-sized and full Chromium Android-sized runs passed for both games: practice movement, touch input, visible/unobstructed controls and screenshots. These successful runs did **not** use the paused-render diagnostic.
- Review screenshots are in `docs/previews/mobile-review/`. A final cosmetic correction hides the racing help footer on phones and moves landscape inspection into Settings.
