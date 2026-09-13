#!/usr/bin/env node
// vite-dev-probe.mjs — one Vite dev-middleware server, booted the way
// `server/app.ts` boots one, with nothing else in the process.
//
// This is the worker half of scripts/verify-vite-cache-isolation.mjs. It
// exists as its own file rather than as a `node -e` string so that the thing
// under test is READABLE and so that the call it makes can be diffed against
// the call `server/app.ts` makes:
//
//   server/app.ts:  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
//   here:           const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
//
// Same options, same absence of an explicit `root` (so Vite resolves it from
// `process.cwd()`) and same absence of an explicit `configFile` (so Vite finds
// `vite.config.ts` next to that root). Which means the cache directory this
// probe uses is decided by exactly the code path the product uses. Express is
// not part of that path — `appType: 'spa'` puts the html-fallback and
// index.html middlewares inside `vite.middlewares`, so a bare `http` server is
// enough to serve `/`, and leaving Express out keeps this probe a measurement
// of Vite and not of the app.
//
// Usage (cwd decides which tree is served):
//   node scripts/lib/vite-dev-probe.mjs --port=<n>
//
// Writes ONE line of JSON to stdout when it is listening:
//   {"ready":true,"port":5173,"cacheDir":"…","cacheDirReal":"…","root":"…"}
// `cacheDirReal` is the realpath — two different path STRINGS that resolve to
// one physical directory (which is precisely what a symlinked `node_modules`
// produces) must not read as two caches.

import { createServer as createHttpServer } from 'node:http';
import { mkdirSync, realpathSync } from 'node:fs';
import process from 'node:process';

const portArg = process.argv.slice(2).find((a) => a.startsWith('--port='));
const port = Number(portArg?.slice('--port='.length));
if (!Number.isInteger(port) || port <= 0) {
  console.error('vite-dev-probe: --port=<n> is required');
  process.exit(2);
}

const { createServer } = await import('vite');
const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });

// Vite creates `cacheDir` lazily (on the first optimizer write), and the
// realpath of a directory that does not exist yet is not knowable. Create it
// now so the identity reported below is the identity of a real directory.
const cacheDir = vite.config.cacheDir;
mkdirSync(cacheDir, { recursive: true });

const http = createHttpServer((req, res) => vite.middlewares(req, res));
http.listen(port, '127.0.0.1', () => {
  process.stdout.write(`${JSON.stringify({
    ready: true,
    port,
    root: vite.config.root,
    cacheDir,
    cacheDirReal: realpathSync(cacheDir),
  })}\n`);
});

const close = () => {
  http.close();
  vite.close().finally(() => process.exit(0));
};
process.on('SIGTERM', close);
process.on('SIGINT', close);
