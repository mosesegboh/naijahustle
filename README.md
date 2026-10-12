# Naija Hustle

A browser-first **3D** Nigerian life adventure built with React, TypeScript, Three.js and Zustand. The original [design conversation](https://chatgpt.com/share/6ac92be7-3b80-83ed-8314-0471b184f144) supplied the gameplay foundation; the user's visual references established the newer 3D direction.

Live game: https://naija-hustle-72a844a10d13.herokuapp.com/

Production deploys automatically from `master` after GitHub CI passes. See [deployment details](docs/deployment.md).

## Run

```sh
nvm use
npm ci
cp .env.example .env
docker compose up -d mongo
npm run dev
```

Requires Node 22.12+ (22.x), MongoDB and a browser with WebGL 2 enabled. Open the address printed by Vite, normally http://localhost:5173. If upgrading from the previous Phaser version, stop/restart Vite after installing dependencies and refresh the page. Existing local profiles and mission progress are retained.

## Explore

- **Home:** a furnished cutaway apartment with a bed, kitchen, dining area, sofa, plants and an animated fan.
- **City:** a 3D Lagos neighbourhood with market stalls, buildings, palms, traffic and a waterfront.
- **Hustles:** your delivery objective and mission progress.
- **Profile:** cash, health, energy and reputation.

Use WASD, arrows or the touch pad to walk. Click an open ground spot to walk directly to it (this is direct movement, not automatic route planning around obstacles). Drag to rotate the camera; scroll/pinch to zoom; right-drag/two-finger drag to pan. The crosshair resets the camera.

Open **City**, find Mama Bisi's marker by the market, then press **E** or **Talk** to accept a parcel. Deliver it to Tunde near the compound for **₦1,500 virtual cash + 10 reputation**, paid once. Profile and mission progress save locally; street position is remembered when entering/exiting interiors, while position and camera reset on reload.

## Development

```sh
npm run typecheck
npm test
npm run build
npm run preview
npm run test:browser
npm run format:check
```

Browser tests use `/bin/google-chrome`; override `CHROME_PATH` if needed. To exercise the production files without a web server, first build and then run `TEST_BUILD=1 npm run test:browser` on Linux/macOS. Test-only Chrome flags enable software WebGL and local module access.

## Structure

- `apps/web/src/game/world`: Three.js lifecycle, original procedural models, apartment/city scenes, scenery batching and collisions.
- `apps/web/src/components`: interface icons and touch controls.
- `apps/web/src/stores`: game progress, local persistence and interface/camera state.
- `packages/shared/src`: reusable mission rules, world definitions and save validation.
- `tests`: desktop/mobile browser flows.
- `docs`: architecture, limitations and validation notes.

Cash in the local exploration wallet is fictional. Accounts and server-validated challenge coins are available; conversion and withdrawals are not enabled. See [architecture and roadmap](docs/architecture.md) and [validation](docs/validation.md).

### Opening story and exploration

You arrive with ₦5,000 and a small apartment. The long-term story is **from one room to your own business**. Two opening chapters are playable:

1. Find Mama Bisi outside Balogun Market, collect her parcel, and deliver it to Tunde by the compound. Earn ₦1,500 and 10 reputation.
2. Board the marked danfo east of the central crossroads. After completing the delivery, reach North Estate for a one-time ₦300 bonus and 5 reputation.

Use WASD, arrow keys, or the touch pad to move. Overview also supports clicking open ground. **Street view** switches to an eye-level perspective; drag to look around and use movement controls to walk. Switch back with **Overview**.

Approach an **ENTER · E** marker and press **E** or the action button to enter. The apartment is furnished; other buildings currently have a basic reception interior. Exit near the door or use **Head into the city** to return to your arrival position. Shop transactions and banking services are future increments.

Approach the marked danfo and press **E** to board for ₦200. Its loop is Balogun Market → East Junction → North Estate → Yaba Gate → Balogun Market. Press **E** or **Get off danfo** during an eight-second stop to alight. The route pauses while a panel is open. The bus waits at the last stop after you get off; Home/City shortcuts are disabled aboard.

Neighbourhoods generate deterministically as you move, with connected roads, buildings, entrances, trees and streetlights. A surrounding 3×3 set of districts remains loaded; distant generated districts are disposed and rebuilt when revisited. The original central district remains loaded. The waterfront is crossed using the central bridge. Progress and chapter rewards are saved locally; position, camera mode and bus position reset on reload.

## Challenges, accounts and the shared city

Restart with `npm run dev` after this update. It now starts **both** Vite (5173) and the account service (3001). If you run the web app separately, use `npm run dev:web` and `npm run dev:server` in two terminals. Both launch methods use MongoDB configured by `MONGODB_URI` and `MONGODB_DB` in the root `.env`.

Open **Challenges**, or approach a marked level opponent and press **E**. Four fictional adult opponents unlock in order: street tough, tout enforcer, corrupt patrol officer, and a rogue squad leader at a SARS-style checkpoint. Victories award 25, 45, 70 and 100 coins respectively. The separate challenge court uses larger characters and a close camera. **J** jabs, **K** kicks, **L** blocks, and **Space** dodges; touch buttons provide the same actions. Watch the incoming-strike cue and recover stamina between attacks. Leaving or losing awards no coins and removes no coins.

Guests can practise and unlock practice levels during the session. **Join online** creates an account or signs in. Only authenticated, server-validated victories earn account coins. Passwords are salted and scrypt-hashed, sessions use HttpOnly/SameSite cookies, and each rewarded victory has a persisted ledger entry. Local guest stats are never imported into account coin balances. Account coins are separate from the existing device-local virtual-naira wallet.

Two players connected to the **same MongoDB-backed application** can see each other's city avatars and usernames. Presence updates every 500 ms, remote movement is interpolated, and disconnected avatars expire after 12 seconds. Apartments/interiors and challenge courts are private. This is shared presence, not PvP or a fully synchronized simulation: traffic and NPCs still run locally in each browser.

Coin conversion, an administrator-set exchange rate, account virtual-cash transactions and eventual real-money withdrawals are **not enabled** in this increment. Those require the next economy/admin implementation. Current account coins cannot be withdrawn or transferred.

Traffic now follows separate lanes, junction signals and clearance checks. The playable danfo participates in the same overlap checks, and cars queue behind it. This is collision avoidance, not a crash/damage simulation. Walking pedestrians, shopping bags, challenge opponents, benches, signals, balconies, awnings and roof utilities make the central area more active and generated buildings more detailed.

### Server deployment notes

MongoDB persists accounts, sessions, active fights, challenge coins and reward history. Online presence also uses MongoDB with expiry. Fight state and rewards save atomically with revision checks, preventing duplicate coin awards from concurrent requests. Existing browser exploration saves remain unchanged.

The production Node entrypoint serves the web build and API from one origin. Heroku startup, environment configuration, GitHub deployment, direct local deployment and Ubuntu setup are covered in [the deployment guide](docs/deployment.md). Run `npm run build` then `npm start` for a local production-build preview. Real-money withdrawals and conversion remain disabled.
