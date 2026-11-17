# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Amusu781/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Amusu781/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

PALMERA BAY — an original top-down open-world crime game. Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

Rico Vega owes $5,000 to Marla Quinn. Steal cars, run her jobs, dodge the Palmera Bay PD, and clear the debt — across a living city with traffic, pedestrians, a wanted level, missions, combat, a minimap and a save.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Or open `game/index.html` directly in desktop Chrome.

## Controls

Enter start/continue · WASD/arrows move and drive · E interact, steal a car, get out · Mouse/Space shoot · P pause · M mute · R restart.

## How it is built

Static files under `game/` (no build step, no network requests, WebAudio synth sounds only). `main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`. MIT licensed.

---

<sub>Entered on [make.fun](https://make.fun/?ref=8a2dzbnc&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
