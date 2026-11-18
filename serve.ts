// Palmera Bay — local development server. Serves game/ over HTTP so the
// game can be played in a desktop browser at http://localhost:8080.
// Node 22, standard library only. Refuses path traversal, including
// URL-encoded forms of it.
//
// Usage: node serve.ts [--port 8080]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), 'game');
const portIndex = process.argv.indexOf('--port');
const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) || 8080 : 8080;

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

const server = createServer(async (req, res) => {
  try {
    const rawPath = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    let rel = normalize(rawPath).replace(/^[/\\]+/, '');
    if (rel === '') rel = 'index.html';
    const file = resolve(root, rel);
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Palmera Bay serving game/ at http://localhost:${port}/`);
});
