// Palmera Bay — hand-in program for the make.fun "Make GTA 6" bounty.
//
// Copies the game/ and screenshots/ folders that sit beside this file
// into the output directory, then builds the dossier from the output
// directory with the vendored make.fun library and writes it as
// dossier.json. Node 22, standard library only, no network access.
//
// Usage: node main.ts [output-dir]
//   The output directory is the first command-line argument, else the
//   MAKEFUN_OUTPUT_DIR environment variable, else /output.
//
// The output directory itself is never deleted. The grader mounts it as
// a volume on a read-only filesystem and runs as an unprivileged user,
// so removing the directory itself fails with permission denied. Only
// the directory's previous contents are cleared, entry by entry, and
// the directory is left standing.

import { buildDossier } from './vendor/makefun-game.ts';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(
  process.argv[2] || process.env.MAKEFUN_OUTPUT_DIR || '/output',
);

/** Remove every entry inside a directory, leaving the directory itself. */
function emptyDirectory(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    rmSync(join(dir, entry.name), { recursive: true, force: true });
  }
}

/** Copy a folder and everything under it to a fresh destination. */
function copyFolder(from, to) {
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
emptyDirectory(outputDir);

const gameFrom = join(repoRoot, 'game');
const shotsFrom = join(repoRoot, 'screenshots');
if (!existsSync(gameFrom)) {
  throw new Error('game/ is missing from the repository');
}
if (!existsSync(shotsFrom)) {
  throw new Error('screenshots/ is missing from the repository');
}

copyFolder(gameFrom, join(outputDir, 'game'));
copyFolder(shotsFrom, join(outputDir, 'screenshots'));

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(dossierPath, dossier);
console.log(`Palmera Bay: wrote ${dossierPath} (${dossier.length} bytes)`);
