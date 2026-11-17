// Palmera Bay — a tiny static server for local play. Node standard
// library only. Serves game/ on http://localhost:8080 (or --port N).
// Anything outside game/ is refused: the resolved path must stay under
// the game directory, so `..` segments and URL-encoded traversals 404.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, normalize, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(join(here, 'game'));
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

let port = 8080;
const portFlag = process.argv.indexOf('--port');
if (portFlag >= 0 && process.argv[portFlag + 1]) {
  const n = parseInt(process.argv[portFlag + 1], 10);
  if (Number.isSafeInteger(n) && n > 0 && n < 65536) port = n;
}

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const resolved = resolve(join(gameDir, normalize(rel)));
    if (resolved !== gameDir && !resolved.startsWith(gameDir + sep)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    if (!existsSync(resolved) || !statSync(resolved).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    const body = readFileSync(resolved);
    res.writeHead(200, { 'content-type': MIME[extname(resolved)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Palmera Bay serving game/ on http://localhost:${port}`);
});
