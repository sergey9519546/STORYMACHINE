#!/usr/bin/env node
// smoke-p0-live-flow.mjs — P0 live-flow smoke check (referenced by RUN_DEMO.md).
//
// WHY: P0_OPERATING_KIT.md's pre-session checklist requires "confirm the
// sample loads correctly" before every LIVE-FLOW session. The prior
// certification (PHASE_TRACKER.md "Browser DOM smoke") used a throwaway
// Playwright harness under .playwright-cli/. This makes that check
// repeatable: boot the server keyless on an isolated port, drive the exact
// flow a moderator would (StartScreen → "Try sample coverage" → report),
// and exit 0 only if the deterministic report renders with the expected
// verdict/health and ZERO genuine browser console errors.
//
// This is P0-enablement tooling, not engine code: it boots the existing
// server and clicks the existing UI. It adds no routes, rules, or scoring.
//
// Prereqs: Node ≥ 22.6; Playwright + Chromium available (system-wide
// `playwright` 1.61.1 works; if browser binaries are missing run
// `npx playwright install chromium`). Run from the repo root:
//   node scripts/smoke-p0-live-flow.mjs
//
// Exit codes: 0 = live flow certified; 1 = a real problem (do not field a
// live session on this — fall back to the static report exposure mode).

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

const REPO = process.cwd();
const ISOLATED_PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${ISOLATED_PORT}`;

// Expected deterministic facts for "The Second Key" (regenerate-verified;
// must match docs/user-validation/P0_QUICK_START.md provenance).
const EXPECT = { verdict: 'CONSIDER', health: 69, minScenes: 14 };

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

let serverProc = null;
let browser = null;
const genuineErrors = [];

async function main() {
  // 1. Boot the server keyless (no GEMINI_API_KEY) on the isolated port.
  console.log(`[smoke] booting keyless server on port ${ISOLATED_PORT}...`);
  serverProc = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd: REPO,
    env: { ...process.env, PORT: String(ISOLATED_PORT), GEMINI_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let booted = false;
  const bootTimeout = new Promise((_, rej) => setTimeout(() => rej(new Error('server boot timeout (30s)')), 30000));
  const bootReady = new Promise((resolve) => {
    let buf = '';
    serverProc.stdout.on('data', (d) => { buf += d; if (buf.includes('server_started')) { booted = true; resolve(); } });
    serverProc.stderr.on('data', (d) => { buf += d; if (buf.includes('server_started')) { booted = true; resolve(); } });
  });
  try {
    await Promise.race([bootReady, bootTimeout]);
  } catch (e) {
    throw new Error(`server did not report server_started: ${e.message}`);
  }
  if (!booted) throw new Error('server started without emitting server_started');
  console.log('[smoke] server booted (keyless).');

  // 2. Drive the live flow with headless Chromium.
  // Playwright is a system/global install (not a project dep) — resolve its
  // path from the project node_modules, then the npm global root. On Windows
  // the absolute path must be a file:// URL (pathToFileURL) for the ESM loader.
  const { existsSync } = await import('node:fs');
  const { execSync } = await import('node:child_process');
  const { pathToFileURL } = await import('node:url');
  const { fileURLToPath } = await import('node:url');
  const candidatePaths = [
    fileURLToPath(new URL('../node_modules/playwright/index.mjs', import.meta.url)),
    fileURLToPath(new URL('../node_modules/playwright/index.js', import.meta.url)),
  ];
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    candidatePaths.push(`${globalRoot}/playwright/index.mjs`, `${globalRoot}/playwright/index.js`);
  } catch {}
  const pwPath = candidatePaths.find((p) => p && existsSync(p));
  if (!pwPath) throw new Error('Playwright not found — install it (`npm i -g playwright` + `npx playwright install chromium`).');
  const pw = await import(pathToFileURL(pwPath).href);
  // CJS interop: named exports may land on .default for index.js.
  const chromium = pw.chromium ?? pw.default?.chromium;
  if (!chromium) throw new Error('Playwright imported but `chromium` export not found.');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    const t = msg.type();
    const txt = msg.text();
    // Dev-only HMR/WebSocket noise (Vite, never in prod) and the documented
    // keyless 503 on the opt-in AI Director path are NOT genuine errors.
    const isHmr = /vite|hmr|websocket|24678/i.test(txt) || t === 'warning';
    const isKeyless503 = /503|analyze-script|model key|Failed to fetch/i.test(txt) && /analyze-script|503|key/i.test(txt);
    if ((t === 'error') && !isHmr && !isKeyless503) genuineErrors.push(txt);
  });
  page.on('pageerror', (err) => {
    // Dev-only HMR WebSocket noise (Vite; never present in a prod build) —
    // the tracker's certification explicitly classifies this as non-genuine.
    if (/websocket|ws:\/\//i.test(err.message)) return;
    genuineErrors.push(`pageerror: ${err.message}`);
  });

  console.log(`[smoke] loading ${BASE} ...`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // StartScreen → "Try sample coverage"
  const sampleCta = await page.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta.click({ timeout: 15000 });
  console.log('[smoke] clicked "Try sample coverage"; waiting for report...');

  // Wait for the deterministic coverage route to populate the report.
  await page.waitForResponse((r) => /\/api\/scriptide\/doctor/.test(r.url()) && r.status() === 200, { timeout: 30000 });
  await page.waitForSelector(/CONSIDER|RECOMMEND|PASS/, { timeout: 15000 }).catch(() => {});

  // 3. Assert the report rendered with expected verdict + health.
  const body = await page.textContent('body');
  const okVerdict = body.includes(EXPECT.verdict);
  const okHealth = body.includes(String(EXPECT.health));
  if (!okVerdict) throw new Error(`report did not render verdict "${EXPECT.verdict}"`);
  if (!okHealth) throw new Error(`report did not render health ~${EXPECT.health}`);
  console.log(`[smoke] report rendered: verdict=${EXPECT.verdict}, health~${EXPECT.health}.`);

  // 4. Console-error gate.
  if (genuineErrors.length > 0) {
    throw new Error(`${genuineErrors.length} genuine console error(s):\n  - ` + genuineErrors.slice(0, 5).join('\n  - '));
  }

  console.log('[smoke] PASS — live flow certified (keyless, zero genuine console errors).');
  console.log(`[smoke] commit: ${await gitSha()}`);
}

function gitSha() {
  return new Promise((resolve) => {
    const g = spawn('git', ['rev-parse', 'HEAD'], { cwd: REPO, stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    g.stdout.on('data', (d) => { out += d; });
    g.on('close', () => resolve(out.trim()));
  });
}

async function teardown() {
  try { if (browser) await browser.close(); } catch {}
  try { if (serverProc) { serverProc.kill('SIGTERM'); await sleep(800); if (!serverProc.killed) serverProc.kill('SIGKILL'); } } catch {}
}

try {
  await main();
  await teardown();
  process.exit(0);
} catch (e) {
  console.error(`[smoke] FAIL — ${e.message}`);
  if (genuineErrors.length) console.error('[smoke] genuine errors captured:', genuineErrors);
  await teardown();
  process.exit(1);
}
