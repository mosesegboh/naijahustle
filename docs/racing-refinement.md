# Street Kings visual refinement

The driver's cap is fitted to the posed, skinned head bounds instead of an arbitrary bone offset. The oversized head scaling and high-frequency clothing shader have been removed. The original rig, seating pose and controls remain in use.

The kart retains the licensed Kenney body with shorter exhaust geometry, smoother rubber tyre profiles, alloy rims and hubs, smaller headlamps, and less reflective paint. Exhaust resizing operates on complete connected components and preserves authored body normals; a regression test reads the real GLB asset. Facades now use subtle plaster texture, varied window styles, shutters, pitched roofs with seams, side windows, utility boxes and foundation courses. Spectators have rounded limbs, separate clothing, shoes and simple facial details. These are refinements to the game's stylised arcade art, not a photorealistic asset replacement.

High graphics automatically falls back to Light after three consecutive measured one-second windows below 24 FPS while the tab is visible. Light uses the existing lower render resolution and disabled real-time shadows. This is a fallback, not a guarantee of a particular frame rate.

Validation uses the production build, existing handling/nameplate tests and `scripts/racing-visual-review.mjs` with isolated in-memory accounts. Set `REVIEW_ENGINE=chromium` and optionally `REVIEW_PROFILE=phone` with the installed Playwright browser image. It captures actual browser-rendered screenshots and checks scene loading, entry into driving mode and browser/shader errors. Software-rendered desktop browser tests do not measure physical phone performance. An initial capture attempt timed out during desktop-to-phone resizing; the reviewer now starts each profile at its target size.
