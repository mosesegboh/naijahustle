# Architecture and roadmap

## Rendering direction

The original chat selected Phaser for a 2D prototype. On 9 October 2026 the user supplied Lagos Life screenshots and explicitly requested actual 3D. Three.js now replaces Phaser. React manages floating menus and HUD; Three.js manages meshes, lighting, camera, animation and spatial interactions. Zustand connects the two without rendering React on every animation frame.

The apartment, reception interior and city are distinct scene groups inside one renderer. Entering a building remembers the city position and returns there on exit. All art is original procedural geometry; no reference-game assets are copied. The avatar has animated limb groups. Ambient traffic uses lane movement, junction signals and vehicle clearance; the marked danfo follows a playable four-stop route. Furniture and district footprints block movement.

`GameWorld` owns input, camera and render lifecycle. `ModelKit` owns shared geometry/materials. `home.ts` and `city.ts` construct scenery; `mergeStatic` batches static meshes by material to reduce draw calls. Characters, vehicles and fan blades stay independently animated. Dispose removes input listeners, observers, DOM markers, GPU resources and the animation loop. A visible error message handles unavailable/lost WebGL contexts.

An orthographic camera uses OrbitControls for orbit/pan/zoom. An optional perspective camera follows the player at eye level, with drag-to-look yaw/pitch and camera-relative movement. Interior front walls and ceilings appear in street view while preserving the cutaway overview. Keyboard movement is camera-relative. Ground clicks select a direct destination; collision sliding prevents movement through objects, but no pathfinding around a block is implemented. Responsive camera framing, capped pixel ratio and static geometry batching keep the first version manageable on smaller devices. Low-end phone performance still needs real-device testing.

## Progress and authority

The shared package contains pure mission transitions and save validation. The delivery remains ordered and pays once. The North Estate arrival reward requires delivery completion and pays once. Older saves default the optional journeyCompleted field to false. Local schema/key version 1 is unchanged, so previous profiles remain compatible. Local state is untrusted and must never authorize real payouts. A Node HTTP account service now validates challenge actions and persists once-only coin rewards with ledger entries. Password hashes use scrypt, sessions are HttpOnly cookies, and account coins never import guest balances. MongoDB now supplies persistent account/session storage; a full account economy remains future work.

## Next milestones

1. Expand character art and animation; add audio/settings and device performance budgets.
2. Add reusable jobs, inventory, NPC conversations, food/rest and business progression.
3. Add the Wahala engine, fictional police pursuit and meaningful consequences/recovery.
4. Extend the account service with account-backed transactions, admin exchange settings and account recovery. Withdrawal processing remains future work.
5. Build more cities, PWA/mobile packaging, monitoring and release infrastructure.

## Current limits

Two opening chapters: one non-repeatable delivery and a rewarded first ride to North Estate. A deterministic district streamer maintains a 3×3 neighbourhood around the player, disposes distant GPU resources, and recreates districts on return. The original central district stays loaded. Marked buildings open a shared basic reception interior; the apartment has its furnished room. Home furniture remains scenery. Shop transactions, banking and business progression are not implemented. The marked bus waits when empty, charges ₦200 per boarding, and supports alighting only at timed stops. Four staged combat opponents have attack/defense rules. Shared avatar presence and accounts are implemented; pursuit AI, PvP, withdrawals, real-money prizes and automatic route planning are not. Camera and avatar location are session-only; profile/stats/mission are stored locally.

## Shared presence and combat

`apps/server` owns password authentication, session expiry, live positions, active fights, coin balances and reward ledgers. Request-handler tests run without a network listener. Development starts both processes through `scripts/dev.mjs`; Vite proxies `/api`. MongoDB persists accounts, sessions, presence and unfinished fights. Session and presence TTL indexes clean up expired documents; reads enforce expiry immediately. A revision filter makes fight state, balance and reward-ledger updates atomic. Production serves the web build and API together through the Node server; see [deployment](deployment.md).

The browser polls presence at 500 ms and active fights at 200 ms. Authenticated actions use server time and validated cooldowns, stamina, defense windows and unlock levels. Each completed fight can award its reward once. Guests use the same pure combat rules for practice and cannot earn account coins. Network failures never switch a paid fight to local validation. A dedicated arena camera enlarges characters and animates attacks, guards, dodges and impacts; the previous world position is restored on exit.

Shared presence currently synchronizes avatar positions and names, not NPCs, vehicles, combat spectators, physical collisions between users or world transactions. Coin conversion, admin exchange-rate controls and real-money withdrawals are disabled. Existing delivery cash remains device-local and separate from account coins.
