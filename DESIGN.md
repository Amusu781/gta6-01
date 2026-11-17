# Palmera Bay — design

An original top-down 2D open-world crime game. Rico Vega, a driver-for-hire,
owes $5,000 to Marla Quinn, a fixer in the bay-side city of Palmera Bay. He
works the debt off one job at a time. Nothing in it comes from Rockstar's
GTA series or any other commercial game: the city, the characters, the cars,
the story, the art and the sounds are all made here.

## The city

A 3600×2700 grid city: six vertical and four horizontal roads, blocks of
buildings between them, and a bay along the east edge with a wooden pier.
Landmarks: Marla's Garage (where jobs start), Spray & Go (where stolen cars
get delivered), the Old Pier (a courier drop-off), and the crew corner.

## Systems

- **On foot and by car.** Walk the sidewalks, or press E beside a parked car
  to steal it. Driving is W/S throttle with A/D steering; E gets out again.
- **Traffic and pedestrians.** Eight traffic cars cruise the road grid and
  fourteen pedestrians walk the sidewalks; both react to gunfire and police.
- **Wanted level (0–3 stars).** Stealing a car or shooting a cop raises it.
  Police spawn and chase, ramming the player. Out of sight for 25 seconds
  and the heat drops a star.
- **Missions and story.** Three story jobs — Wheels (steal a car, deliver it
  to Spray & Go, $500), Courier Run (a package to the Old Pier in 90 seconds,
  $700), Getaway (pick up the crew, then lose the cops, $900) — then
  repeatable fares. Every job pays cash and cuts the debt.
- **Combat.** Mouse or Space shoots toward the cursor; 24 rounds, refilled at
  the garage. Cop cars take three hits. Getting rammed hurts; at zero health
  Rico is busted, loses $100, and wakes up at the garage.
- **HUD and minimap.** Cash, debt, health, ammo, wanted stars, the current
  objective, and a live minimap with roads, the player, police and the
  mission marker.
- **Save.** Cash, debt, completed jobs, ammo and health persist in
  localStorage (`palmera-bay-save-v1`); the title screen offers Continue.
- **Sound.** Everything is synthesized with WebAudio: engine hum, gunshots,
  a two-tone siren, payment blips. M mutes.

## Controls

Enter start/continue · WASD/arrows move and drive · E interact, steal a car,
get out · Mouse/Space shoot · P pause · M mute · R restart.

## Files

- `game/index.html` — the page; loads `src/main.js` as a module.
- `game/src/config.js` — tuning, places, palette.
- `game/src/random.js` — seeded RNG (deterministic shots) and geometry.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — WebAudio synth sounds.
- `game/src/city.js` — road grid, buildings, collision.
- `game/src/actors.js` — player, pedestrians, traffic, police, bullets.
- `game/src/missions.js` — the three story jobs and fares.
- `game/src/render.js` — canvas drawing, HUD, minimap, menus.
- `game/src/shots.js` — deterministic screenshot staging (`?shot=`).
- `game/src/save.js` — localStorage persistence.
- `game/src/main.js` — the loop, the state machine, debug hooks.
- `main.ts` — copies `game/` and `screenshots/` to the output directory and
  writes `dossier.json` with `buildDossier`.
- `serve.ts` — a small static server for local play (`node serve.ts`).

## Verification

- `main.ts` run twice with different `MAKEFUN_OUTPUT_DIR` values writes a
  byte-identical `dossier.json`.
- The game is driven over CDP: title → Enter → play; E at the garage takes
  the Wheels job; stealing the Palm Runner raises wanted 0→1 and spawns
  police; the full mission loop pays $500 (cash $120→$620, debt
  $5,000→$4,500); the save lands in localStorage; zero console errors.
- `serve.ts` returns 200 for `/` and game files, 404 for missing files and
  for raw and URL-encoded path traversal.
