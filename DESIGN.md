# Palmera Bay — design notes

An original top-down 2D open-world crime game. Nothing in it comes from
Rockstar's GTA series or any other commercial game: the city, the people, the
cars, the names and the story are all invented for this entry.

## The city

Palmera Bay is a fictional sun-soaked coastal city, 3600×2600 px, built on a
seeded road grid: seven avenues, six streets, blocks of pastel-roofed
buildings, Flamingo Park with a pond, and a beach along the southern edge
where the bay begins. Generation is seeded, so the same seed always builds
the same city — the screenshots are reproducible.

Named places (all fictional): Rico's Garage (the hideout), Sunset Spray
Shop, Marlin Docks, The Coral Hotel, Palmera Bay Bank, Bay Clinic,
Flamingo Park.

## The story

Rico Vega, a driver-for-hire, owes $5,000 to the fixer Marla Quinn. Three
jobs pay it off, in order, each started at the garage with E:

1. **Wheels for Hire** ($500) — steal any car and deliver it to the Sunset
   Spray Shop so it can't be traced.
2. **The Courier** ($1,200) — pick up a package at the Marlin Docks and
   deliver it to The Coral Hotel within 150 seconds; a rival tips off the
   cops halfway there.
3. **The Vault Job** ($3,000) — hold inside the bank vault for 6 seconds,
   then lose a 3-star wanted level and get back to the garage.

Clearing the debt shows the ending screen; free roam continues afterwards.

## Systems

- **On foot and by car** — WASD to walk (Shift to run), E to enter a car.
  Parked cars are boosted, moving traffic cars are carjacked (the driver
  bails and runs). Driving is W/S accelerate and brake, A/D steering,
  Space handbrake, with building and car collisions.
- **Traffic and pedestrians** — 12 traffic cars follow the road grid from
  intersection to intersection and slow for the car ahead; ~26 pedestrians
  stroll the sidewalks, cross at intersections, and flee from speeding cars
  and gunfire.
- **Wanted level** — 0 to 5 stars. Stealing, carjacking, running someone
  over, shooting a bystander or dropping an officer raises it. Police
  cruisers spawn on the roads and chase, ramming Rico's car; at 3 stars and
  up, foot officers get out and shoot. Heat decays after lying low with no
  police nearby, and the garage clears it entirely when no police are close.
- **Combat** — mouse-aimed pistol (24 rounds, R reloads), F to punch.
  Police bullets hurt Rico; his health regenerates after 8 seconds out of
  harm's way. Wasted or busted wakes him at the Bay Clinic, 10% lighter.
- **HUD and minimap** — cash and remaining debt, wanted stars, objective
  banner, health and ammo, speed and car model while driving, a live
  minimap (roads, mission marker, police dots, Rico), and a crosshair.
- **Save** — localStorage autosaves progress (cash, debt, missions done,
  position, car) every 20 seconds and on mission completion; the title
  screen offers Continue or New Game.
- **Sound** — everything is synthesised with WebAudio: engine hum that
  follows speed, a bass groove, siren tones, gunshots, punches, crashes,
  pickups and a mission-complete jingle. No audio files, no network.

## Files

- `game/index.html` — canvas shell, loads `src/main.js`.
- `game/src/main.js` — bootstrap, game loop, screen state machine, save
  wiring, CDP test hooks (`window.__gameState`).
- `game/src/config.js` — world size, palette, tuning, places, mission defs.
- `game/src/utils.js` — math, seeded RNG, circle-vs-rect collision.
- `game/src/city.js` — seeded city generation, road helpers.
- `game/src/input.js` — keyboard and mouse state.
- `game/src/audio.js` — WebAudio synthesis (SFX + music).
- `game/src/vehicles.js` — car physics, traffic AI, parked cars, collisions.
- `game/src/pedestrians.js` — pedestrian AI, car-vs-ped hits, wanted adds.
- `game/src/police.js` — wanted decay, cruiser chase AI, foot officers.
- `game/src/combat.js` — bullets, pistol, punches, hurting the player.
- `game/src/missions.js` — the three jobs, objectives, markers, rewards.
- `game/src/player.js` — Rico on foot and in a car, stealing, respawn.
- `game/src/save.js` — localStorage save / load / clear.
- `game/src/render.js` — world, HUD, minimap, menu screens.
- `game/src/shots.js` — deterministic `?shot=` scenes for the screenshots.
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes
  `dossier.json` with the kit's vendored `vendor/makefun-game.ts`; it refuses
  to hand in an entry with no `game/index.html` or no screenshot (the first
  screenshot is the cover image).
- `serve.ts` — a tiny Node-stdlib static server for local play
  (`node serve.ts`, http://localhost:8080); the game also opens straight
  from disk over `file://`, no server needed.
- `screenshots/` — the four cover images, regenerated with `?shot=` + seed 7.

## Verification

Played for real in headless Chromium (Playwright, `file://`, 1280×720,
zero console errors): title → Enter → steal a parked car → drive with
W/S → shoot with the mouse → pause and resume; a full mission-1 loop
(take the job at the garage, steal, deliver to the spray shop) lands the
$500 reward, cuts the debt and writes the localStorage save, and shooting
on foot drops the ammo count and flies a bullet. The wanted shot stages
a 3-star chase with cruisers closing in. `main.ts` was run twice with two
different `MAKEFUN_OUTPUT_DIR` values and the two `dossier.json` outputs
are byte-identical; the dossier was also rebuilt from `/output` with the
vendored library and compared byte-for-byte.

## Screenshots

`?shot=start|drive|wanted|mission` stages a real scene by playing the
actual rules forward from a fresh world with a road-following autopilot:
the title over a living city, Rico driving through traffic, a 3-star
police chase, and the courier mission in progress.
