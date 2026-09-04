#!/usr/bin/env node
// verify-production-build.mjs — the ONE suite that boots the app the way a
// self-hoster actually runs it and drives it end to end.
//
// THE GAP THIS CLOSES: every other browser suite in this repo (and every
// route-level test) boots server/app.ts with NODE_ENV unset, so it always
// takes the Vite-dev-middleware branch. The Dockerfile, docker-compose.yml,
// and release.yml's published image all run the OTHER branch: `npm run
// build` then the server serving the static `dist/` it produced, with
// NODE_ENV=production — different static serving, different Cache-Control,
// different compression, and a Content-Security-Policy header that literally
// does not exist in dev (see server/app.ts's own CSP comment). Nothing in
// this repo had ever exercised that branch before this suite existed.
//
// WHAT THIS SPAWNS, AND WHY IT IS NOT bootKeylessServer(): every other
// suite's boot (scripts/lib/browser-verify.mjs) runs `node
// --experimental-strip-types server.ts` — a deliberate shortcut for THOSE
// suites, which only care about dev-mode behavior. The Dockerfile's actual
// CMD is `npx tsx server.ts`; this suite spawns the repo's own installed
// node_modules/.bin/tsx directly (what `npx tsx` resolves to locally, with
// no network hop) so it is proving the REAL deploy command, not a
// same-semantics stand-in. bootKeylessServer is still used for the ONE
// dev-mode instance this suite boots for comparison (section 6) — that half
// deliberately wants the same dev-mode boot every other suite already
// trusts.
//
// SCOPE (mirrors the task brief section by section):
//   1. npm run build, then boot production exactly like the Dockerfile CMD.
//   2. HTTP-level production behavior: headers, compression, caching,
//      the /assets/ 404 boundary, the SPA fallback.
//   3. Attacks: path traversal under /assets/, a 10MB POST to the doctor
//      route, Accept-Encoding tricks, X-Powered-By.
//   4. Bundle size report (flags any JS chunk over 500KB).
//   5. Dev vs. prod: the SAME script through both server modes must produce
//      a byte-identical doctor report (minus analyzedAt).
//   6. The real writer journey, driven by Chromium, against the PRODUCTION
//      server specifically: land -> paste the sample -> analyze -> read the
//      report -> jump to a line -> export (Fountain/FDX/PDF/coverage
//      letter) -> Settings -> Session -> Delete Everything -> reload.
//
// Exit codes: 0 = every assertion passed. 1 = at least one failed.

import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  bootKeylessServer,
  createRecorder,
  getTiming,
  launchChromium,
  shutdown,
  waitForRenderedText,
  wireConsoleCapture,
} from './lib/browser-verify.mjs';
import { keylessBrowserServerEnv as buildKeylessEnv } from './lib/keyless-browser-certification.mjs';

const REPO = process.cwd();

// Read the load-derived timing policy FIRST — before `npm run build`, before
// either server boots, before Chromium launches — so VERIFY_MAX_LOAD_PER_CPU
// can refuse the whole (expensive: it runs a real production build) run
// without paying for any of it. See scripts/lib/browser-verify.mjs.
const timing = getTiming({ logPrefix: 'verify:production' });

const OUT_DIR = join(REPO, 'scripts', 'output');
mkdirSync(OUT_DIR, { recursive: true });

const { record, printSummary } = createRecorder({ grouped: true, groupKey: 'phase' });

/** An ephemeral free port on loopback (same recipe as browser-verify.mjs's
 *  pickFreePort — duplicated rather than imported so this file's own two
 *  extra instances (dev-comparison server, plus the prod one) don't have to
 *  round-trip through that helper's default port-per-call assumption). */
function pickFreePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/** A minimal raw-HTTP client with NO automatic decompression, redirect
 *  following, or Accept-Encoding injection — every header-level assertion
 *  below (Content-Encoding, Cache-Control, the exact bytes on the wire) needs
 *  to see precisely what the server sent, which `fetch`'s automatic gzip/br
 *  transparent-decoding would hide.
 *
 *  `path` is sent as the LITERAL request-line target, byte for byte — it is
 *  deliberately NOT passed through `new URL(path, baseUrl)` first. The
 *  WHATWG URL constructor collapses `..` dot-segments itself (the same
 *  normalization curl applies by default, which is what silently turned the
 *  first version of this suite's traversal probes into harmless requests for
 *  `/.env` — measured, not assumed: see the FAIL this comment replaces in the
 *  suite's own history). A path-traversal probe HAS to reach the server with
 *  its `..` segments intact for the assertion to mean anything. */
function rawRequest(baseUrl, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const { hostname, port } = new URL(baseUrl);
    const req = http.request(
      {
        hostname,
        port,
        path,
        method,
        headers,
        // This suite deliberately sends a 10MB body (attack test 3.2) — the
        // default header-parsing timeout is fine, but give the socket real
        // headroom for that one large write/response round trip.
        timeout: timing.ms(30000),
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        }));
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    if (body !== undefined) req.write(body);
    req.end();
  });
}

/** gunzip/brotli-decode a raw response body per its Content-Encoding, so
 *  compressed-vs-uncompressed comparisons can assert on decoded CONTENT, not
 *  just headers. */
async function decodeBody(res) {
  const enc = res.headers['content-encoding'];
  const { gunzipSync, brotliDecompressSync } = await import('node:zlib');
  if (enc === 'gzip') return gunzipSync(res.body);
  if (enc === 'br') return brotliDecompressSync(res.body);
  return res.body;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — build, then boot production exactly like the Dockerfile CMD.
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== 1) npm run build ===');
const buildStart = Date.now();
execFileSync('npm', ['run', 'build'], { cwd: REPO, stdio: 'inherit' });
const buildMs = Date.now() - buildStart;
console.log(`[verify:production] build finished in ${buildMs}ms`);

const TSX_BIN = join(REPO, 'node_modules', '.bin', 'tsx');
if (!existsSync(TSX_BIN)) {
  console.error(`[verify:production] FATAL: ${TSX_BIN} not found — \`npm ci\` should have installed it (tsx is a devDependency; the Dockerfile's own CMD depends on the same local install, see its "deps" stage comment).`);
  process.exit(1);
}

const PROD_STORE = mkdtempSync(join(tmpdir(), 'verify-prod-sessions-'));
const PROD_PORT = await pickFreePort();
const PROD_BASE = `http://127.0.0.1:${PROD_PORT}`;

// A real VERSION/GIT_SHA pair — exactly what release.yml's --build-arg pair
// would inject — so the /health identity check below has something concrete
// to verify instead of falling back to "dev"/"unknown", which would pass
// trivially whether or not the plumbing actually works.
let gitSha = 'unknown';
try { gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim(); } catch { /* not a git checkout — fall back below */ }
const FAKE_VERSION = '0.0.0-verify-production';

let prodProc = null;
let browser = null;

async function bootProduction() {
  console.log(`\n[verify:production] booting PRODUCTION server (tsx, NODE_ENV=production) on port ${PROD_PORT}...`);
  const env = {
    ...buildKeylessEnv(process.env, PROD_PORT),
    NODE_ENV: 'production',
    SESSION_DB_DIR: PROD_STORE,
    VERSION: FAKE_VERSION,
    GIT_SHA: gitSha,
  };
  const proc = spawn(TSX_BIN, ['server.ts'], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], env });
  let booted = false;
  const bootReady = new Promise((resolve) => {
    let buf = '';
    const sniff = (d) => { buf += d; if (buf.includes('server_started')) { booted = true; resolve(); } };
    proc.stdout.on('data', sniff);
    proc.stderr.on('data', sniff);
  });
  await Promise.race([
    bootReady,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`production server boot timeout (${timing.ms(30000)}ms)`)), timing.ms(30000))),
  ]);
  if (!booted) throw new Error('production server exited without emitting server_started');
  return proc;
}

let allPassed = false;
try {
  prodProc = await bootProduction();

  // ── /health reports the injected build identity ────────────────────────
  const health = await rawRequest(PROD_BASE, '/health');
  let healthJson = null;
  try { healthJson = JSON.parse(health.body.toString('utf8')); } catch { /* asserted below */ }
  record('boot', '/health answers 200 with a parseable JSON body', health.status === 200 && healthJson !== null, `status=${health.status}`);
  record('boot', '/health.version echoes the injected VERSION (release.yml\'s --build-arg path)', healthJson?.version === FAKE_VERSION, `got ${JSON.stringify(healthJson?.version)}`);
  record('boot', '/health.commit echoes the injected GIT_SHA', healthJson?.commit === gitSha, `got ${JSON.stringify(healthJson?.commit)}`);

  // ═════════════════════════════════════════════════════════════════════
  // SECTION 2 — headers, compression, caching, the /assets/ 404 boundary.
  // ═════════════════════════════════════════════════════════════════════
  console.log('\n=== 2) production-only response shape ===');

  // ── Security headers (CSP only exists under NODE_ENV=production) ───────
  const root = await rawRequest(PROD_BASE, '/');
  const csp = root.headers['content-security-policy'] ?? '';
  record('headers', 'Content-Security-Policy is present (production-only per server/app.ts)', csp.length > 0, csp);
  for (const directive of [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:", "font-src 'self'", "connect-src 'self'",
    "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'",
  ]) {
    record('headers', `CSP contains "${directive}"`, csp.includes(directive));
  }
  record('headers', 'X-Content-Type-Options: nosniff', root.headers['x-content-type-options'] === 'nosniff');
  record('headers', 'X-Frame-Options: DENY', root.headers['x-frame-options'] === 'DENY');
  record('headers', 'Referrer-Policy: no-referrer', root.headers['referrer-policy'] === 'no-referrer');
  record('headers', 'Cross-Origin-Opener-Policy: same-origin', root.headers['cross-origin-opener-policy'] === 'same-origin');
  record('headers', 'Cross-Origin-Resource-Policy: same-origin', root.headers['cross-origin-resource-policy'] === 'same-origin');
  record('headers', 'Permissions-Policy present', typeof root.headers['permissions-policy'] === 'string' && root.headers['permissions-policy'].length > 0);
  record('headers', 'Strict-Transport-Security present', typeof root.headers['strict-transport-security'] === 'string');
  record('headers', 'X-Powered-By is absent (app.disable(\'x-powered-by\'))', root.headers['x-powered-by'] === undefined);

  // Resolve a real hashed asset from the build we just produced, rather than
  // hardcoding a filename that will go stale the next time any component
  // changes (every dist/assets/*.js filename is content-hashed by Vite).
  const distDir = join(REPO, 'dist');
  const assetsDir = join(distDir, 'assets');
  const assetFiles = readdirSync(assetsDir);
  const mainJsAsset = assetFiles.find((f) => f.startsWith('index-') && f.endsWith('.js'));
  record('boot', 'a hashed main JS bundle exists under dist/assets/', !!mainJsAsset, mainJsAsset ?? '(none found)');
  const assetPath = `/assets/${mainJsAsset}`;
  const rawAssetBytes = readFileSync(join(assetsDir, mainJsAsset));

  // ── Compression ──────────────────────────────────────────────────────────
  const gz = await rawRequest(PROD_BASE, assetPath, { headers: { 'Accept-Encoding': 'gzip' } });
  record('compression', 'gzip is negotiated for a JS asset (Content-Encoding: gzip)', gz.headers['content-encoding'] === 'gzip', JSON.stringify(gz.headers['content-encoding']));
  record('compression', 'gzip response carries Vary: Accept-Encoding', /accept-encoding/i.test(gz.headers.vary ?? ''));
  const gzDecoded = await decodeBody(gz);
  record('compression', 'gzip payload decodes back to the exact bundle bytes', Buffer.compare(gzDecoded, rawAssetBytes) === 0, `decoded ${gzDecoded.length}b vs source ${rawAssetBytes.length}b`);
  record('compression', 'gzip actually shrank the bundle on the wire', gz.body.length < rawAssetBytes.length, `wire=${gz.body.length}b raw=${rawAssetBytes.length}b`);

  const br = await rawRequest(PROD_BASE, assetPath, { headers: { 'Accept-Encoding': 'br' } });
  record('compression', 'brotli is negotiated when the client prefers it (Content-Encoding: br)', br.headers['content-encoding'] === 'br', JSON.stringify(br.headers['content-encoding']));
  const brDecoded = await decodeBody(br);
  record('compression', 'brotli payload decodes back to the exact bundle bytes', Buffer.compare(brDecoded, rawAssetBytes) === 0);

  const identity = await rawRequest(PROD_BASE, assetPath, {});
  record('compression', 'no Accept-Encoding -> served uncompressed (identity), not silently gzipped', identity.headers['content-encoding'] === undefined);
  record('compression', 'identity response Content-Length matches the real file size', Number(identity.headers['content-length']) === rawAssetBytes.length);

  // Accept-Encoding tricks: q=0 refusals and a nonsense token must never 5xx.
  const refuseAll = await rawRequest(PROD_BASE, assetPath, { headers: { 'Accept-Encoding': 'br;q=0, gzip;q=0, *;q=0' } });
  record('attack', 'Accept-Encoding refusing every encoding (q=0) does not crash the server', refuseAll.status < 500, `status=${refuseAll.status} encoding=${refuseAll.headers['content-encoding']}`);
  const nonsenseEncoding = await rawRequest(PROD_BASE, assetPath, { headers: { 'Accept-Encoding': 'not-a-real-encoding-xyz' } });
  record('attack', 'a nonsense Accept-Encoding token falls back safely (no 5xx)', nonsenseEncoding.status < 500, `status=${nonsenseEncoding.status}`);

  // SSE must NEVER be compressed — buffering breaks live progress.
  const smallFountain = 'INT. ROOM - DAY\n\nA short beat.\n\nPERSON\nOne line.\n';
  const sseReq = await rawRequest(PROD_BASE, '/api/scriptide/doctor/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'gzip, br' },
    body: JSON.stringify({ fountain: smallFountain }),
  });
  record('compression', 'the SSE doctor stream is never compressed (Content-Type: text/event-stream, no Content-Encoding)',
    (sseReq.headers['content-type'] ?? '').startsWith('text/event-stream') && sseReq.headers['content-encoding'] === undefined,
    JSON.stringify({ contentType: sseReq.headers['content-type'], contentEncoding: sseReq.headers['content-encoding'] }));

  // A small JSON API response legitimately stays uncompressed (below
  // compression's default 1kb threshold) — assert it still answers cleanly,
  // not that it's compressed.
  const healthGz = await rawRequest(PROD_BASE, '/health', { headers: { 'Accept-Encoding': 'gzip' } });
  record('compression', 'a small JSON response under the compression threshold still answers 200', healthGz.status === 200);

  // ── Caching: hashed assets vs index.html vs unhashed static files ──────
  const assetCache = identity.headers['cache-control'] ?? '';
  record('caching', 'a hashed asset gets a long, immutable Cache-Control', /max-age=31536000/.test(assetCache) && /immutable/.test(assetCache), assetCache);

  const indexAtRoot = await rawRequest(PROD_BASE, '/');
  const indexAtDeepLink = await rawRequest(PROD_BASE, '/some/deep/route');
  record('caching', 'index.html served at "/" carries Cache-Control: no-cache', indexAtRoot.headers['cache-control'] === 'no-cache', indexAtRoot.headers['cache-control']);
  record('caching', 'index.html served via the SPA fallback (a deep link) ALSO carries no-cache — same file, same header no matter which URL asked for it', indexAtDeepLink.headers['cache-control'] === 'no-cache', indexAtDeepLink.headers['cache-control']);
  record('caching', 'index.html is never given the assets\' immutable cache', indexAtRoot.headers['cache-control'] !== assetCache);

  const favicon = await rawRequest(PROD_BASE, '/favicon.svg');
  record('caching', 'an unhashed static file (favicon.svg) does NOT get the hashed-asset immutable cache (its filename never changes on content change)', favicon.status === 200 && !/immutable/.test(favicon.headers['cache-control'] ?? ''), favicon.headers['cache-control']);

  // ── The SPA fallback itself ─────────────────────────────────────────────
  record('spa-fallback', 'a deep link (/some/deep/route) returns 200 with the app shell, not a 404', indexAtDeepLink.status === 200 && indexAtDeepLink.body.toString('utf8').includes('<div id="root">'));
  const collabDeepLink = await rawRequest(PROD_BASE, '/?collab=x');
  record('spa-fallback', '/?collab=x resolves to the app shell (client-side reads the query param)', collabDeepLink.status === 200 && collabDeepLink.body.toString('utf8').includes('<div id="root">'));

  // ── The /assets/ 404 boundary — a miss must be a REAL 404 ───────────────
  const missingAsset = await rawRequest(PROD_BASE, '/assets/does-not-exist-abc123.js');
  let missingAssetJson = null;
  try { missingAssetJson = JSON.parse(missingAsset.body.toString('utf8')); } catch { /* asserted below */ }
  record('assets-404', 'a nonexistent /assets/ file is a real 404 JSON response, not the SPA fallback', missingAsset.status === 404 && missingAssetJson?.error === 'Not found', `status=${missingAsset.status} body=${missingAsset.body.toString('utf8').slice(0, 80)}`);

  // ═════════════════════════════════════════════════════════════════════
  // SECTION 3 — attacks: path traversal, an oversized POST.
  // ═════════════════════════════════════════════════════════════════════
  console.log('\n=== 3) attacking the static server and the doctor route ===');

  const traversalProbes = [
    '/assets/../../.env',
    '/assets/..%2f..%2f.env',
    '/assets/%2e%2e%2f%2e%2e%2f.env',
    '/assets/..%252f..%252f.env',
    '/assets/....//....//.env',
  ];
  for (const probe of traversalProbes) {
    // --path-as-is-equivalent: this is a raw http.request over the literal
    // path string, so (unlike curl's default) nothing here silently collapses
    // the dot-segments before the bytes leave the process.
    const res = await rawRequest(PROD_BASE, probe);
    const bodyText = res.body.toString('utf8');
    const leaked = bodyText.includes('GEMINI_API_KEY') || bodyText.includes('SESSION_DB_DIR') || /^OPENROUTER_API_KEY=/m.test(bodyText);
    record('attack', `path traversal "${probe}" never leaks .env content`, !leaked, `status=${res.status} len=${bodyText.length}`);
    record('attack', `path traversal "${probe}" is a 404, not the SPA fallback (it's still under /assets/)`, res.status === 404, `status=${res.status}`);
  }

  // A 10MB POST to the doctor route — must be rejected by the body limit,
  // not crash the process. express.json({ limit: '1mb' }) in server/app.ts
  // is what should fire here, before the route or zod ever sees the body.
  const bigBody = JSON.stringify({ fountain: 'A'.repeat(10 * 1024 * 1024) });
  const bigPost = await rawRequest(PROD_BASE, '/api/scriptide/doctor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(bigBody)) },
    body: bigBody,
  });
  record('attack', 'a 10MB POST to the doctor route is rejected with 413, not a crash', bigPost.status === 413, `status=${bigPost.status} body=${bigPost.body.toString('utf8').slice(0, 120)}`);
  const healthAfterBigPost = await rawRequest(PROD_BASE, '/health');
  record('attack', 'the server is still alive and answering after the oversized POST', healthAfterBigPost.status === 200);

  // ═════════════════════════════════════════════════════════════════════
  // SECTION 4 — bundle size report.
  // ═════════════════════════════════════════════════════════════════════
  console.log('\n=== 4) bundle sizes ===');
  const SIZE_FLAG_BYTES = 500 * 1024;
  const jsChunks = assetFiles.filter((f) => f.endsWith('.js')).map((f) => {
    const raw = statSync(join(assetsDir, f));
    const bytes = readFileSync(join(assetsDir, f));
    const gz = gzipSync(bytes, { level: 9 });
    return { file: f, rawBytes: raw.size, gzipBytes: gz.length };
  }).sort((a, b) => b.rawBytes - a.rawBytes);
  console.log('[verify:production] JS chunk sizes (raw / gzip):');
  for (const c of jsChunks) {
    const flag = c.rawBytes > SIZE_FLAG_BYTES ? '  <-- over 500KB' : '';
    console.log(`  ${c.file}: ${(c.rawBytes / 1024).toFixed(1)}KB / ${(c.gzipBytes / 1024).toFixed(1)}KB gzip${flag}`);
  }
  const oversized = jsChunks.filter((c) => c.rawBytes > SIZE_FLAG_BYTES);
  // Hard cap (was a report-only flag): once every chunk fit under 500KB raw
  // (lazy-loading the ScriptIDE side panels + a manualChunks split for the
  // eager CodeMirror editor stack — see vite.config.ts), there was no more
  // reason to let a future regression back over the line pass silently.
  record('bundle-sizes', `every JS chunk stays under the 500KB raw cap (${oversized.length} chunk(s) over — see log above for names/sizes)`, oversized.length === 0, oversized.map((c) => `${c.file}=${(c.rawBytes / 1024).toFixed(0)}KB`).join(', ') || 'none over 500KB');
  const totalRaw = jsChunks.reduce((s, c) => s + c.rawBytes, 0);
  const totalGzip = jsChunks.reduce((s, c) => s + c.gzipBytes, 0);
  console.log(`[verify:production] total JS: ${(totalRaw / 1024).toFixed(1)}KB raw, ${(totalGzip / 1024).toFixed(1)}KB gzip`);

  // ═════════════════════════════════════════════════════════════════════
  // SECTION 5 — dev vs. prod: the doctor's report must be byte-identical.
  // ═════════════════════════════════════════════════════════════════════
  console.log('\n=== 5) dev vs. production: doctor report identity ===');
  const devPort = await pickFreePort();
  const devBase = `http://127.0.0.1:${devPort}`;
  // A dedicated scratch dir, exactly like the production instance above —
  // bootKeylessServer's default env sets no SESSION_DB_DIR of its own, and
  // the server's own default (./data/sessions, relative to cwd) is the
  // repo's REAL session store. Omitting this the first time this suite ran
  // wrote a live data/sessions/ directory into the working tree — this
  // extraEnv is what stops that from happening again.
  const DEV_STORE = mkdtempSync(join(tmpdir(), 'verify-dev-sessions-'));
  let devProc = null;
  try {
    devProc = await bootKeylessServer({
      repo: REPO, port: devPort, baseUrl: devBase, logPrefix: 'verify-dev',
      // GIT_SHA must match the production instance's: ScriptDoctorReport's
      // `provenance.engineCommit` (doctor.ts) reads it straight from
      // server/lib/build-info.ts, so leaving it unset here would make dev
      // report "dev" while production reports the real SHA I injected above —
      // a difference in THIS SUITE's env, not a real dev-vs-production
      // scoring divergence, and it would otherwise fail the identity check
      // below for a completely uninteresting reason (measured: it did, on
      // the first run of this suite).
      extraEnv: { SESSION_DB_DIR: DEV_STORE, GIT_SHA: gitSha },
    });

    const comparisonScript = [
      'Title: Identity Check',
      'Author: verify-production-build',
      '',
      'INT. CONTROL ROOM - NIGHT',
      '',
      'A bank of monitors. LARSEN watches a signal degrade.',
      '',
      'LARSEN',
      'We lost the uplink again.',
      '',
      'TECH',
      'Same window as last time. Ninety seconds and it comes back.',
      '',
      'LARSEN',
      "It won't. Not this time.",
      '',
      'EXT. RELAY TOWER - CONTINUOUS',
      '',
      'Rain sheets across a dish antenna. A warning light blinks out.',
      '',
      'INT. CONTROL ROOM - LATER',
      '',
      'The signal is gone. LARSEN stares at a dead monitor.',
      '',
      'LARSEN (CONT\'D)',
      'Get me the backup line. Now.',
    ].join('\n');

    const doctorBody = JSON.stringify({ fountain: comparisonScript });
    const [prodDoctor, devDoctor] = await Promise.all([
      rawRequest(PROD_BASE, '/api/scriptide/doctor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: doctorBody }),
      rawRequest(devBase, '/api/scriptide/doctor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: doctorBody }),
    ]);
    record('dev-vs-prod', 'both servers answered 200 to the identical doctor request', prodDoctor.status === 200 && devDoctor.status === 200, `prod=${prodDoctor.status} dev=${devDoctor.status}`);

    let prodJson = null;
    let devJson = null;
    try { prodJson = JSON.parse(prodDoctor.body.toString('utf8')); } catch { /* asserted below */ }
    try { devJson = JSON.parse(devDoctor.body.toString('utf8')); } catch { /* asserted below */ }
    record('dev-vs-prod', 'both responses parse as JSON', prodJson !== null && devJson !== null);

    if (prodJson && devJson) {
      const strip = (obj) => {
        const clone = JSON.parse(JSON.stringify(obj));
        delete clone.analyzedAt;
        return clone;
      };
      const prodStripped = strip(prodJson);
      const devStripped = strip(devJson);
      const identical = JSON.stringify(prodStripped) === JSON.stringify(devStripped);
      let firstDiffKey = '';
      if (!identical) {
        const keys = new Set([...Object.keys(prodStripped), ...Object.keys(devStripped)]);
        for (const k of keys) {
          if (JSON.stringify(prodStripped[k]) !== JSON.stringify(devStripped[k])) { firstDiffKey = k; break; }
        }
      }
      record('dev-vs-prod', 'the doctor report is byte-identical between dev and production (excluding analyzedAt) — a production-only scoring difference here would be a real bug', identical, identical ? '' : `first differing top-level key: "${firstDiffKey}"`);
      record('dev-vs-prod', 'analyzedAt really was present and excluded (not accidentally identical because both are missing it)', typeof prodJson.analyzedAt === 'number' && typeof devJson.analyzedAt === 'number');
    }
  } finally {
    if (devProc) { try { devProc.kill('SIGTERM'); await sleep(400); if (!devProc.killed) devProc.kill('SIGKILL'); } catch { /* already gone */ } }
  }

  // ═════════════════════════════════════════════════════════════════════
  // SECTION 6 — the real writer journey, driven by Chromium, against
  // production specifically.
  // ═════════════════════════════════════════════════════════════════════
  console.log('\n=== 6) full writer journey against the PRODUCTION server ===');
  browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();

  const genuineErrors = [];
  wireConsoleCapture(page, genuineErrors);

  const failedAssetResponses = [];
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/assets/') && res.status() >= 400) failedAssetResponses.push(`${res.status()} ${url}`);
  });

  // land -> paste the sample -> analyze
  await page.goto(PROD_BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page.getByRole('button', { name: /try sample coverage/i }).first().click({ timeout: timing.ms(15000) });
  // NOT a bare /RECOMMEND|CONSIDER|PASS/ poll — the doctor's OWN live-progress
  // UI renders "RUNNING PASS 1 OF 14…" while streaming (ScriptDoctorPanel.tsx),
  // and that literal "PASS" is a false-positive match for the regex a plain
  // verdict-pattern poll would use: measured directly (this suite's own first
  // run) — a poll against that pattern resolved in 19ms, still on the
  // "0 scenes yet" interim screen, days before the real verdict ever
  // rendered. Same family of race as the one waitForRenderedText's own
  // comment documents for the SSE 200-at-connection-open case, just with a
  // regex too eager instead of a response too early. "Try sample coverage"
  // always loads the one locked sample (src/lib/sample-script.ts, "Dead
  // Frequency") that smoke-p0-live-flow.mjs already pins to verdict CONSIDER
  // / health 78 — reusing that exact literal needle here sidesteps the
  // false-positive entirely instead of trying to out-clever the regex.
  const reportBody = await waitForRenderedText(page, 'CONSIDER', { timeoutMs: 45000 });
  record('journey', 'land -> "Try sample coverage" -> analyze -> the verdict renders (CONSIDER, the locked sample\'s known verdict)', reportBody.includes('CONSIDER'), reportBody.slice(0, 200));
  await page.screenshot({ path: join(OUT_DIR, 'production-coverage-report.png') }).catch(() => {});

  // read the report -> jump to a line
  const jumpBtn = page.getByRole('button', { name: /jump to line \d+/i }).first();
  const hasJump = await jumpBtn.count() > 0;
  record('journey', 'the report renders a "Jump to line" affordance', hasJump);
  if (hasJump) {
    await jumpBtn.click();
    const flashed = await page.waitForSelector('.cm-sm-finding-flash', { timeout: timing.ms(2000) }).then(() => true).catch(() => false);
    record('journey', 'clicking it highlights the finding\'s lines in the editor', flashed);
  }

  // export: coverage letter (server round trip, POST /api/export/coverage-letter).
  // The Coverage-letter button lives in ScriptDoctorPanel (the fuller
  // slide-in "Script Doctor" dialog with Upload/Export/Breakdown/Pitch kit),
  // NOT in CoverageSummary (the lighter verdict+jump-to-line view "Try sample
  // coverage" lands on) — measured directly (this suite's own run: zero
  // matches for "coverage letter" among every button's text content while on
  // CoverageSummary). CoverageSummary's own "Full report" button is what
  // threads the already-computed report into ScriptDoctorPanel (see
  // ScriptIDE.tsx's "W4" comment) — click it first to reach the real button.
  const fullReportBtn = page.getByRole('button', { name: 'Full report', exact: true }).first();
  await fullReportBtn.click({ timeout: timing.ms(10000) }).catch(() => {});
  const coverageLetterBtn = page.getByRole('button', { name: /export a connected-prose coverage letter/i }).first();
  await coverageLetterBtn.waitFor({ timeout: timing.ms(10000) }).catch(() => {});
  if (await coverageLetterBtn.count() > 0) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: timing.ms(15000) }).catch(() => null),
      coverageLetterBtn.click(),
    ]);
    record('journey', 'export: Coverage letter downloads a file', download !== null, download?.suggestedFilename());
  } else {
    record('journey', 'export: Coverage letter button present (report may still be incomplete)', false, 'button not found');
  }
  // Close the Script Doctor drawer (role="dialog") before the Write tab
  // click below — its own close control, not a raw Escape keypress, so this
  // exercises the real UI affordance rather than relying on the modal's
  // keydown handler.
  await page.getByRole('button', { name: 'Close Script Doctor panel', exact: true }).click({ timeout: timing.ms(5000) }).catch(() => {});

  // export: Fountain / FDX / PDF, from the Write tab's Export menu — client-
  // side blob downloads, so this specifically proves the PRODUCTION bundle's
  // dynamic import() chunks (fdx.ts, pdf.ts) load correctly under the real
  // hashed asset URLs and the real script-src 'self' CSP, not just in dev.
  const writeTab = page.getByRole('button', { name: 'Write', exact: true }).first();
  if (await writeTab.count() > 0) {
    await writeTab.click();
    await page.locator('.cm-content').first().waitFor({ timeout: timing.ms(10000) }).catch(() => {});
    const exportMenuBtn = page.getByRole('button', { name: 'Export', exact: true }).first();
    for (const label of ['Fountain', 'Final Draft', 'PDF']) {
      await exportMenuBtn.click();
      const item = page.getByRole('menuitem', { name: label, exact: true }).first();
      const itemVisible = await item.count() > 0;
      if (!itemVisible) { record('journey', `export: ${label} menu item present`, false); continue; }
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: timing.ms(15000) }).catch(() => null),
        item.click(),
      ]);
      record('journey', `export: ${label} downloads a file (production bundle's dynamic import resolved)`, download !== null, download?.suggestedFilename());
    }
  } else {
    record('journey', 'Write tab reachable for Fountain/FDX/PDF export', false);
  }

  // Settings -> Session -> Delete Everything -> reload.
  const overflowBtn = page.getByRole('button', { name: 'More tools' }).first();
  if (await overflowBtn.count() > 0) {
    await overflowBtn.click();
    const menu = page.getByRole('menu').first();
    await menu.waitFor({ timeout: timing.ms(5000) }).catch(() => {});
    const settingsItem = menu.getByRole('menuitem', { name: /labs & settings|labs is on/i }).first();
    if (await settingsItem.count() > 0) {
      await settingsItem.click();
      const sessionTab = page.getByRole('tab', { name: 'Session', exact: true });
      await sessionTab.click({ timeout: timing.ms(5000) }).catch(() => {});
      const deleteBtn = page.getByRole('button', { name: 'Delete Everything', exact: true }).first();
      const deleteVisible = await deleteBtn.count() > 0;
      record('journey', 'Settings -> Session -> Delete Everything control is reachable', deleteVisible);
      if (deleteVisible) {
        const navigated = page
          .waitForEvent('framenavigated', { predicate: (frame) => frame === page.mainFrame(), timeout: timing.ms(20000) })
          .then(() => true).catch(() => false);
        await deleteBtn.click();
        await page.getByRole('button', { name: /yes, delete everything/i }).click({ timeout: timing.ms(5000) }).catch(() => {});
        const didNavigate = await navigated;
        record('journey', 'Delete Everything performs its own reload', didNavigate);
        await sleep(1000);
        const backAtEntrance = await page.getByRole('button', { name: /try sample coverage/i }).first()
          .waitFor({ timeout: timing.ms(10000) }).then(() => true).catch(() => false);
        record('journey', 'after Delete Everything + reload, the app shows the entrance (clean slate), not a leftover draft', backAtEntrance);
      }
    } else {
      record('journey', 'Settings menu item reachable from the overflow menu', false);
    }
  } else {
    record('journey', '"More tools" overflow control reachable', false);
  }

  record('journey', 'zero genuine browser console errors across the whole journey', genuineErrors.length === 0, genuineErrors.slice(0, 5).join(' | '));
  record('journey', 'no 404 (or worse) for any /assets/ request during the whole journey', failedAssetResponses.length === 0, failedAssetResponses.slice(0, 5).join(' | '));

  await context.close();

  allPassed = printSummary({
    extraLines: [
      `build: ${buildMs}ms`,
      `bundle: ${jsChunks.length} JS chunks, ${(totalRaw / 1024).toFixed(0)}KB raw / ${(totalGzip / 1024).toFixed(0)}KB gzip total`,
      `oversized (>500KB raw): ${oversized.map((c) => c.file).join(', ') || 'none'}`,
    ],
  });
} catch (e) {
  console.error('[verify:production] FATAL:', e.stack || e.message);
} finally {
  await shutdown({ browser, serverProc: prodProc, graceMs: 800 });
}
process.exit(allPassed ? 0 : 1);
