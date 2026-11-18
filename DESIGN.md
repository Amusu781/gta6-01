# Palmera Bay — design notes

An original top-down 2D open-world crime game. Nothing in it comes from
Rockstar or any commercial game: the city, the people, the story and the
sounds are all invented here.

## Story

Rico Vega is a driver-for-hire in Palmera Bay, a port city of straight roads,
a bay on its east edge and a pier that smells of fish and diesel. He owes
$5,000 to Marla Quinn, the fixer who owns half the harbour. Every job pays
the debt down. When the debt hits zero, Rico is free — the game keeps going
with taxi fares after that.

## The city

A 3600×2700 grid: six vertical roads, four horizontal roads, sidewalks,
buildings packed into the blocks, a bay along the east edge and a wooden
pier sticking out into it. The Spray & Go shop sits in the south-east.
Everything is generated from one seed, so the same seed rebuilds the same
city — the screenshots use seed 7.

## Systems

- **On foot and by car.** Walk with WASD or arrows. Press E beside a parked
  car to steal it (the cops notice), E again to get out. Cars accelerate,
  brake and steer; walls scrub speed.
- **Traffic and pedestrians.** Eight traffic cars loop the road grid.
  Fourteen pedestrians stroll the sidewalks and scatter when shots are
  fired.
- **Wanted level, 0–3.** Stealing a car or firing a shot raises it. Police
  Interceptors spawn, chase and ram. Twenty-five quiet seconds drops a
  star. Lose all three and the heat is off.
- **Missions.** Three story jobs — Wheels (steal a car, deliver it to
  Spray & Go, $500), Courier Run (pier pickup, 90 seconds to the north
  docks, $700), Getaway (lose a two-star wanted level, then reach the
  garage, $900) — then repeatable taxi fares. Each completed job refills
  ammo and writes a save.
- **Combat.** Mouse click or Space fires toward the cursor. 24 rounds.
  Bullets spin police cars out and spark off buildings.
- **HUD and minimap.** Cash, debt, health bar, ammo, wanted stars and the
  current objective across the top; a live minimap (roads, bay, player,
  police, objective marker) in the corner. Title, pause and busted
  screens. P pauses, M mutes, R restarts after a bust.
- **Save.** Cash, debt and finished jobs persist in localStorage under
  `palmera-bay-save-v1`, written on every job completion.

## Sound

All sound is synthesised with the Web Audio API — an engine hum that
follows speed, a two-tone siren, a noise-burst gunshot, cash and pickup
blips. No audio files, no network requests, nothing loaded from outside
the game's own files.

## Files

- `game/src/config.js` — constants and the palette
- `game/src/random.js` — seeded RNG (mulberry32)
- `game/src/input.js` — keyboard and mouse state
- `game/src/audio.js` — Web Audio synth effects
- `game/src/city.js` — city generation and collision
- `game/src/actors.js` — player, pedestrians, traffic, police
- `game/src/missions.js` — the job state machine
- `game/src/render.js` — canvas drawing, HUD, minimap, overlays
- `game/src/shots.js` — screenshot scene poses (?shot=…)
- `game/src/save.js` — localStorage save / load
- `game/src/main.js` — boot, loop, screen states, test hooks
- `main.ts` — copies game/ + screenshots/ to /output, writes dossier.json
- `serve.ts` — local static server for playtesting
