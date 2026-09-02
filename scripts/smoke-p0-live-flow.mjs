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
// THIS RUNS IN CI (2026-09-02). `playwright` is a pinned devDependency and
// the `browser` job in .github/workflows/ci.yml runs
// `npx playwright install --with-deps chromium` before `npm run verify:browser`,
// so this suite gates every push and blocks `publish` in release.yml. It was
// previously described as un-CI-able; that was a self-imposed limitation, and
// it cost real rot (the SSE migration broke the report wait in three suites
// and nobody noticed for days because nothing ran them).
//
// Prereqs: Node >= 22.6; `npm ci` (brings Playwright) plus a Chromium binary
// — `npx playwright install chromium`, or point PW_CHROMIUM_PATH at a browser
// provisioned outside Playwright's cache (this container:
// /opt/pw-browsers/chromium). Run from the repo root:
//   node scripts/smoke-p0-live-flow.mjs
//
// The shared boot/launch/console-capture/report-wait machinery lives in
// scripts/lib/browser-verify.mjs — change it there, not here.
//
// Exit codes: 0 = live flow certified; 1 = a real problem (do not field a
// live session on this — fall back to the static report exposure mode).

import { spawn } from 'node:child_process';
import {
  bootKeylessServer,
  launchChromium,
  pickFreePort,
  shutdown,
  waitForRenderedText,
  wireConsoleCapture,
} from './lib/browser-verify.mjs';

const REPO = process.cwd();
const ISOLATED_PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${ISOLATED_PORT}`;

// Expected deterministic facts for "Dead Frequency" (regenerate-verified;
// must match docs/user-validation/P0_QUICK_START.md provenance). Re-locked
// 2026-08-04 for the stimulus swap ("The Second Key" -> "Dead Frequency",
// see src/lib/sample-script.ts's header) — measured health is 78.3, and the
// live-flow UI rounds it to an integer for display, hence 78 here (the same
// rounding relationship the prior EXPECT.health: 69 had to the old exported
// 68.9).
const EXPECT = { verdict: 'CONSIDER', health: 78, minScenes: 12 };

let serverProc = null;
let browser = null;
const genuineErrors = [];

async function main() {
  // 1. Boot the server keyless on the isolated port, neutralizing inherited
  // provider configuration as well as Gemini's direct environment key.
  serverProc = await bootKeylessServer({
    repo: REPO,
    port: ISOLATED_PORT,
    baseUrl: BASE,
    logPrefix: 'smoke',
  });

  // 2. Drive the live flow with headless Chromium.
  browser = await launchChromium();
  const page = await browser.newPage();
  wireConsoleCapture(page, genuineErrors);

  console.log(`[smoke] loading ${BASE} ...`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // StartScreen → "Try sample coverage"
  const sampleCta = await page.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta.click({ timeout: 15000 });
  console.log('[smoke] clicked "Try sample coverage"; waiting for report...');

  // Wait for the report to RENDER, not for the route to answer — see
  // waitForRenderedText's comment in scripts/lib/browser-verify.mjs for the
  // SSE race this exists to defeat.
  const body = await waitForRenderedText(page, EXPECT.verdict);

  // 3. Assert the report rendered with expected verdict + health.
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

const teardown = () => shutdown({ browser, serverProc, graceMs: 800 });

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
