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
  getTiming,
  launchChromium,
  pickFreePort,
  shutdown,
  waitForDomQuiet,
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

// The honest draft-rank line the panel must render for the built-in sample
// instead of ranking a demo among the writer's own drafts (B-6, 2026-09-05).
// Kept verbatim here so a copy edit that quietly drops the line fails this
// gate rather than passing unnoticed.
const SAMPLE_NOT_RANKED = 'The sample is not ranked against your drafts';

let serverProc = null;
let browser = null;
const genuineErrors = [];

async function main() {
  // Read the load-derived timing policy FIRST — before the server boots or
  // Chromium launches — so VERIFY_MAX_LOAD_PER_CPU can refuse the whole run
  // without paying for either. See scripts/lib/browser-verify.mjs.
  const timing = getTiming({ logPrefix: 'smoke' });

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

  // B-4/B-5/B-6 golden-path provenance guards (2026-09-05). Every POST to the
  // doctor's streaming route is counted here, before the first click, because
  // the two defects this gate now blocks are both invisible in the rendered
  // report: the sample used to be analysed TWICE (a second, unflagged run
  // fired from CoverageSummary's effect once `doctorAutoSample` flipped
  // false), and that second run's report carried `isSample: false` — which
  // planted the demo in the writer's real Draft History and unlocked
  // "Verify my rewrite" on a script that is not theirs. Counting requests and
  // reading localStorage is the only way to see either from the outside.
  const doctorStreamPosts = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/scriptide/doctor/stream')) {
      doctorStreamPosts.push(req.url());
    }
  });

  console.log(`[smoke] loading ${BASE} ...`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });

  // StartScreen → "Try sample coverage"
  const sampleCta = await page.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta.click({ timeout: timing.ms(15000) });
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

  // 4. The golden path continues into the full report — the door 100% of
  // first-time writers use. Everything below is asserted on THAT panel.
  const fullReport = page.getByRole('button', { name: 'Full report', exact: true }).first();
  await fullReport.click({ timeout: timing.ms(15000) });
  await page.waitForSelector('[role="dialog"]', { timeout: timing.ms(15000) });
  // Returns the body whether or not the line appears; 4c below reports its absence.
  await waitForRenderedText(page, SAMPLE_NOT_RANKED, { timeoutMs: 20000 });
  await waitForDomQuiet(page, { quietMs: 400, timeoutMs: timing.ms(8000) });
  const panelText = (await page.textContent('body')) ?? '';

  // Every provenance assertion below is COLLECTED rather than thrown one at a
  // time: these failures share one root cause (a second, unflagged run of the
  // sample), and whoever debugs a red gate needs to see all of them in one
  // run, not peel them off one build at a time.
  const problems = [];

  // 4a. The demo must never be written into the writer's own Draft History.
  const storedHistory = await page.evaluate(() => {
    try {
      return localStorage.getItem('sm_doctor_history_v1');
    } catch {
      return 'ERR';
    }
  });
  const historyEntries = (() => {
    if (!storedHistory || storedHistory === 'ERR') return [];
    try {
      const parsed = JSON.parse(storedHistory);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  if (historyEntries.length !== 0) {
    problems.push(
      `the built-in sample was recorded into Draft History (sm_doctor_history_v1 holds ${historyEntries.length}: `
      + `${historyEntries.map((e) => `${e && e.title}@${e && e.health}`).join(', ')}) - it is a demo, not the writer's draft`,
    );
  } else {
    console.log('[smoke] Draft History is empty after the sample golden path (sm_doctor_history_v1 unset).');
  }

  // 4b. One analysis, not two.
  if (doctorStreamPosts.length !== 1) {
    problems.push(
      `the sample was analysed ${doctorStreamPosts.length} time(s) on the golden path; exactly 1 POST `
      + '/api/scriptide/doctor/stream is expected (a second run re-pays the whole 14-pass analysis and '
      + "overwrites the report's sample provenance)",
    );
  } else {
    console.log('[smoke] exactly one POST /api/scriptide/doctor/stream on the golden path.');
  }

  // 4c. The sample is never ranked among the writer's own drafts, and says so
  // rather than silently omitting the line.
  if (!panelText.includes(SAMPLE_NOT_RANKED)) {
    problems.push(`the sample report does not carry the honest draft-rank line ("${SAMPLE_NOT_RANKED}")`);
  }
  if (/Rank among your drafts:/.test(panelText)) {
    problems.push("the sample report ranks the demo among the writer's own drafts");
  }
  if (panelText.includes(SAMPLE_NOT_RANKED) && !/Rank among your drafts:/.test(panelText)) {
    console.log(`[smoke] draft-rank line on the sample: "${SAMPLE_NOT_RANKED}".`);
  }

  // 4d. "Verify my rewrite" is withheld on the sample from THIS entry point
  // too (the panel-loaded sample already withheld it; the threaded one did
  // not, because the guard read `uploadedFile`, which is null here).
  const verifyBtn = page.getByRole('button', { name: /verify my rewrite/i }).first();
  if ((await verifyBtn.count()) > 0) {
    if (!(await verifyBtn.isDisabled())) {
      problems.push('"Verify my rewrite" is offered on the built-in sample (StartScreen entry point)');
    } else if (!/built-in sample script, not your draft/.test(panelText)) {
      problems.push('"Verify my rewrite" is withheld on the sample without saying why');
    } else {
      console.log('[smoke] "Verify my rewrite" is withheld on the sample, with a reason.');
    }
  }

  if (problems.length > 0) {
    throw new Error(`${problems.length} golden-path provenance failure(s):\n  - ` + problems.join('\n  - '));
  }

  // 5. Console-error gate.
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
