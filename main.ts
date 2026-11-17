// Palmera Bay — the entrypoint the grader runs. It copies game/ and
// screenshots/ from this repository into the output directory and writes
// /output/dossier.json with buildDossier from the kit's library.
// Node 22, standard library only. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
if (!existsSync(gameDir)) throw new Error('main.ts: no game/ directory beside main.ts');
if (!existsSync(shotsDir)) throw new Error('main.ts: no screenshots/ directory beside main.ts');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`wrote ${join(out, 'dossier.json')} (${dossier.length} bytes)`);
