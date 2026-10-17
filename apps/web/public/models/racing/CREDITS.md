# Street Kings test-drive assets

Models are bundled locally; gameplay does not fetch external assets.

- `kart-oopi.glb`: Kenney, **Car Kit 3.1**, CC0. Downloaded from the author's [Car Kit page](https://kenney.nl/assets/car-kit), archive `https://kenney.nl/media/pages/assets/car-kit/1a312ec241-1775131960/kenney_car-kit.zip`. Original licence: `LICENSE-car-kit.txt`. The original mascot is hidden at runtime; the authored kart receives gold/green paint and articulated wheels.
- `driver.glb`: Quaternius, **Universal Base Characters — Standard**, Superhero Male, CC0. [Author and licence](https://quaternius.com/packs/universalbasecharacters.html). GLB packaging sourced from [programasweights/avatar](https://github.com/programasweights/avatar/blob/main/ASSETS.md), `public/assets/character.glb`. Geometry, skin weights and skeleton originate with Quaternius; this packaging omits source textures. Original licence: `LICENSE-driver.txt`. Runtime changes add vertex-coloured racing gear, a brown skin tone, exaggerated head proportions and a seated skeletal pose. This is a styled base character, not a bespoke finished Nigerian caricature or a selfie-generated likeness.

The environment, handling and UI are project-authored. This milestone uses Three.js, which is already installed in Naija Hustle. It is a single-player graphics and driving evaluation; no multiplayer, weapon combat, race rewards or photo-to-avatar service is enabled.
