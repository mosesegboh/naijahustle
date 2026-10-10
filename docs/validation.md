# 3D revision validation

Checked on 10 October 2026 with Node 22.21.1.

- TypeScript and production build: passed.
- Unit tests: 19 passed, covering mission ordering, once-only rewards, fare affordability, old-save migration, collision clearance, deterministic district layouts, clear roads/entrances, district resource disposal, the complete bus loop, combat cooldowns/defense, hashed authentication, presence expiry, account reward ledgers and traffic clearance.
- Code formatted with Prettier.
- Direct headless Chrome checks rendered the furnished apartment and city using WebGL 2 without captured application errors. Checked desktop (1440 × 1000) and portrait apartment layout (390 × 844). Software WebGL and disabled GPU compositing were needed for reliable captures in this environment.
- Playwright flows were updated for home/city switching, camera controls, projected ground-click movement, keyboard/touch input, delivery rewards, panels and persistence. These could not run here: Chrome launched by the test runner was denied a socket operation by the sandbox and exited before any test interaction. Run `npm run test:browser` locally. A built-file alternative is documented in the README.

The Three.js vendor chunk is approximately 481 KB (121 KB gzip), down from the previous Phaser bundle. Static scenery is batched by material; pixel ratio is capped at 1.6. Real low-end Android/iPhone performance and touch gestures still require device testing.

Local schema key version 1 remains unchanged. Existing saves receive journeyCompleted: false when read; no reset is required. Position, bus state and camera mode remain session-only.

Preview captures are in `docs/previews/`. Models are original procedural geometry, not extracted reference-game artwork.

## Exploration increment

Standalone Chrome rendered the city overview and eye-level street view without captured application errors. A scripted ground-click and interaction check successfully entered Balogun Market. The final interior refinement adds enclosed walls/ceiling in street view and starts the camera facing the reception desk. Playwright now also covers camera switching, entering/exiting a marked building, bus fares, disabled travel shortcuts during rides, and alighting only at stops. The full Playwright suite remains unexecuted because its Chrome process exits with a sandbox socket denial before any test runs.

Building interiors currently share a basic reception room; business transactions are deliberately left for the next gameplay increment. Generated neighbourhoods use deterministic variations rather than a hand-authored recreation of Lagos. Hardware/mobile performance and touch gestures still need testing on real devices.

## Combat and shared-city increment

The production build and TypeScript checks pass. Standalone Chrome rendered the challenge arena and HUD, entered guest practice through the challenge selector, and verified that a jab changed the opponent health from 70 to 58 without captured application errors. The larger characters and close camera were visually inspected at 1440 × 1000 and 390 × 844. The narrow-screen check prompted a separate camera framing that keeps fighters above the combat controls.

Authentication, logout, origin rejection, password hashing, shared presence, stale-player expiry, level restrictions and exactly-once coin awards pass request-handler tests. The sandbox rejects listening on port 3001 (`listen EPERM`), so a live two-browser account/presence session could not be exercised here. Run `npm run dev` outside the sandbox and sign in to separate accounts in two browser profiles connected to the same service.

Traffic tests simulate six cars alongside the full playable bus route and verify no vehicle overlap. Road signals and queued traffic are simplified avoidance logic, not crash physics. Real device performance and live network latency remain to be evaluated.

## MongoDB and deployment preparation — 2026-10-10

The 23 local tests passed, plus six database-backed variants against MongoDB 7 in Docker. These cover password hashing, case-insensitive username uniqueness, expiring presence, saved sessions and fights after reconnecting, stale-write rejection, and concurrent victory requests awarding coins once. The production TypeScript/Vite build and formatting check passed.

The production HTTP smoke test also passed in Docker: it served the built HTML and JavaScript, issued a Secure/HttpOnly session, restarted the actual Node server, restored the authenticated account and fight, rejected a foreign origin, and revoked the session on logout. This is an HTTP integration test, not a two-browser UI test. GitHub Actions runs MongoDB integration tests, the build, the HTTP smoke test and formatting. Heroku deployment requires hosted database credentials and an app configured as described in [deployment](deployment.md); no live Heroku deployment was performed during this validation.
