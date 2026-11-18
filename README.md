# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Amusu781/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Amusu781/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**PALMERA BAY** — an original top-down open-world crime game. Rico Vega, a driver-for-hire, owes $5,000 to the fixer Marla Quinn. Steal cars, lose the cops, run the jobs, pay the debt. A 3600×2700 port city with a bay and a pier, traffic and pedestrians, a wanted level with police who chase and ram, three story missions plus taxi fares, combat, a HUD with a minimap, and a save that persists between sessions. Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Or open `game/index.html` directly in a browser. No build step, no network requests — the game is plain static files under `game/`.

## Controls

- **WASD / Arrow keys** — move on foot, drive when in a car
- **E** — steal / enter / exit a car
- **Mouse click / Space** — shoot toward the cursor (on foot)
- **P** — pause
- **M** — mute
- **R** — restart after being busted

## How it works

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with `buildDossier` from `vendor/makefun-game.ts`. Check it locally with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=8a2dzbnc&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
