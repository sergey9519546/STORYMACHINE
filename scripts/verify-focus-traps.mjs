#!/usr/bin/env node
// verify-focus-traps.mjs — live-DOM verification of useModalFocusTrap.
//
// WHY THIS EXISTS: two prior agents reported "live DOM focus behavior cannot
// be verified — no jsdom/browser harness." That's wrong for this container:
// Chromium is provisioned at /opt/pw-browsers/chromium and Playwright is
// installed in node_modules. This script drives a real headless browser
// through the exact keyboard interactions a screen-reader/keyboard-only user
// would perform, against dialogs wired with `src/lib/use-modal-focus-trap.ts`
// (ScriptDoctorPanel, WhatIfPanel, RoomPanel) — and it is what actually found
// two real, live bugs that every prior source-read review missed (see the
// commit history / doc comments in use-modal-focus-trap.ts and App.tsx).
//
// THIS IS A MANUALLY-RUN VERIFICATION SCRIPT, NOT A CI TEST. CI has no
// browser provisioned (no Chromium, no PW_CHROMIUM_PATH), so this is not
// wired into `npm test` and must not be. Run it by hand after touching
// use-modal-focus-trap.ts or any dialog that calls it.
//
// Prereqs: Node >= 22.6; the `playwright` package in node_modules (installed
// --no-save, matches scripts/smoke-p0-live-flow.mjs's proven pattern); a
// working Chromium binary. In THIS container that binary lives at
// /opt/pw-browsers/chromium, so run:
//
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-focus-traps.mjs
//
// (PW_CHROMIUM_PATH is optional elsewhere — omit it to let Playwright resolve
// its own pinned browser build.)
//
// Boot/teardown pattern (keyless server on an isolated free port, resolve
// Playwright from node_modules or the npm global root) is lifted directly
// from scripts/smoke-p0-live-flow.mjs — read that file first if this one
// needs changing.
//
// Exit codes: 0 = every assertion passed. 1 = at least one failed (see the
// per-assertion PASS/FAIL log above the summary for which, and why).

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { assertKeylessAiConfig, keylessBrowserServerEnv } from './lib/keyless-browser-certification.mjs';

const REPO = process.cwd();

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

const ISOLATED_PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${ISOLATED_PORT}`;

let serverProc = null;
let browser = null;
const results = []; // { dialog, assertion, pass, detail }
const genuineConsoleErrors = [];

function record(dialog, assertion, pass, detail) {
  results.push({ dialog, assertion, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${dialog} :: ${assertion}${detail ? ' — ' + detail : ''}`);
}

async function bootServer() {
  console.log(`[verify] booting keyless server on port ${ISOLATED_PORT}...`);
  serverProc = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd: REPO,
    env: keylessBrowserServerEnv(process.env, ISOLATED_PORT),
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
  await assertKeylessAiConfig(BASE);
  console.log('[verify] server booted (keyless).');
}

async function launchBrowser() {
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
  const chromium = pw.chromium ?? pw.default?.chromium;
  if (!chromium) throw new Error('Playwright imported but `chromium` export not found.');
  return chromium.launch({
    headless: true,
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  });
}

function wireConsoleCapture(page) {
  page.on('console', (msg) => {
    const t = msg.type();
    const txt = msg.text();
    // Same dev-only/keyless-503 noise filter as smoke-p0-live-flow.mjs.
    const isHmr = /vite|hmr|websocket|24678/i.test(txt) || t === 'warning';
    const isKeyless503 = /503|analyze-script|model key|Failed to fetch/i.test(txt) && /analyze-script|503|key/i.test(txt);
    if (t === 'error' && !isHmr && !isKeyless503) genuineConsoleErrors.push(txt);
  });
  page.on('pageerror', (err) => {
    if (/websocket|ws:\/\//i.test(err.message)) return;
    genuineConsoleErrors.push(`pageerror: ${err.message}`);
  });
}

// ── Shared DOM probes (mirror the hook's own logic so we're testing the
// hook's CONTRACT, not re-deriving our own notion of "focusable"). ──────────
const FOCUSABLE_SELECTOR_JS = `
  const sel = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
`;

async function getFocusables(page) {
  return page.evaluate(`(() => {
    ${FOCUSABLE_SELECTOR_JS}
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return [];
    return Array.from(dlg.querySelectorAll(sel))
      .filter(el => el.offsetParent !== null)
      .map(el => (el.getAttribute('aria-label') || el.textContent || el.tagName || '').trim().slice(0, 60));
  })()`);
}

async function focusNth(page, index) {
  await page.evaluate(`(() => {
    ${FOCUSABLE_SELECTOR_JS}
    const dlg = document.querySelector('[role="dialog"]');
    const els = Array.from(dlg.querySelectorAll(sel)).filter(el => el.offsetParent !== null);
    const target = ${index} < 0 ? els[els.length + ${index}] : els[${index}];
    target.focus();
  })()`);
}

async function activeElementInfo(page) {
  return page.evaluate(`(() => {
    const dlg = document.querySelector('[role="dialog"]');
    const el = document.activeElement;
    return {
      dialogPresent: !!dlg,
      insideDialog: !!dlg && !!el && dlg.contains(el),
      isDialogItself: el === dlg,
      desc: el ? (el.getAttribute('aria-label') || el.textContent || el.tagName || '').trim().slice(0, 60) : null,
    };
  })()`);
}

/**
 * Runs the four focus-trap assertions against whatever `[role="dialog"]` is
 * currently open, using `restoreTriggerHandle` (an ElementHandle to the
 * control expected to regain focus on close) for a precise identity check —
 * not a text-match, which could pass on a same-looking-but-different node.
 */
async function verifyDialog(page, { name, restoreTriggerHandle, closeDialog }) {
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  // Let framer-motion enter animations and the hook's own effect settle —
  // ScriptDoctorPanel's spring exit alone takes ~600ms; give entry the same
  // headroom rather than tuning per-dialog constants.
  await page.waitForTimeout(400);

  // 1. INITIAL FOCUS
  const initial = await activeElementInfo(page);
  record(name, 'INITIAL FOCUS is inside the dialog', initial.insideDialog, `activeElement=${initial.desc}`);

  const focusables = await getFocusables(page);
  if (focusables.length < 1) {
    record(name, 'TRAP FORWARD (skipped: 0 focusable elements)', false, 'cannot test wraparound with no focusable descendants');
    record(name, 'TRAP BACKWARD (skipped: 0 focusable elements)', false, 'cannot test wraparound with no focusable descendants');
  } else {
    // 2. TRAP FORWARD: focus last, Tab -> first (or same element if only one).
    await focusNth(page, -1);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(150);
    const fwd = await activeElementInfo(page);
    const fwdOk = fwd.insideDialog && fwd.desc === focusables[0];
    record(name, 'TRAP FORWARD wraps last -> first', fwdOk, `got="${fwd.desc}" expected="${focusables[0]}"`);

    // 3. TRAP BACKWARD: focus first, Shift+Tab -> last.
    await focusNth(page, 0);
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(150);
    const bwd = await activeElementInfo(page);
    const bwdOk = bwd.insideDialog && bwd.desc === focusables[focusables.length - 1];
    record(name, 'TRAP BACKWARD wraps first -> last', bwdOk, `got="${bwd.desc}" expected="${focusables[focusables.length - 1]}"`);
  }

  // 4. RESTORE
  await closeDialog();
  // ScriptDoctorPanel's framer-motion exit spring needs real time to finish
  // before React actually unmounts it and the hook's cleanup runs.
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(150);
  let restoreOk = false;
  let restoreDetail = '';
  if (restoreTriggerHandle) {
    restoreOk = await page.evaluate((trigger) => trigger === document.activeElement, restoreTriggerHandle);
    restoreDetail = restoreOk ? 'activeElement === the trigger element' : 'activeElement !== the trigger element';
    if (!restoreOk) {
      const after = await activeElementInfo(page);
      restoreDetail += ` (got activeElement="${after.desc}")`;
    }
  } else {
    restoreDetail = 'no trigger handle provided';
  }
  record(name, 'RESTORE focus returns to the triggering control', restoreOk, restoreDetail);
}

async function main() {
  await bootServer();
  browser = await launchBrowser();

  // ── Context 1: ScriptDoctorPanel — the P0-critical dialog. ───────────────
  // StartScreen -> "Try sample coverage" -> CoverageSummary -> "Full report".
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    wireConsoleCapture(page);

    console.log('\n=== ScriptDoctorPanel (StartScreen -> Try sample coverage -> Full report) ===');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const sampleCta = page.getByRole('button', { name: /try sample coverage/i }).first();
    await sampleCta.click({ timeout: 15000 });
    await page.waitForResponse((r) => /\/api\/scriptide\/doctor/.test(r.url()) && r.status() === 200, { timeout: 30000 });
    await page.waitForTimeout(400);

    // Smoke basics (assertion 5): the deterministic report actually rendered.
    const bodyText = await page.textContent('body');
    record('ScriptDoctorPanel', 'SMOKE: coverage summary renders CONSIDER', bodyText.includes('CONSIDER'), 'checked page body for "CONSIDER"');

    const fullReportBtn = page.getByRole('button', { name: 'Full report', exact: true }).first();
    const triggerHandle = await fullReportBtn.elementHandle();
    await fullReportBtn.click();

    await verifyDialog(page, {
      name: 'ScriptDoctorPanel',
      restoreTriggerHandle: triggerHandle,
      closeDialog: async () => page.keyboard.press('Escape'),
    });

    await context.close();
  }

  // ── Context 2: StoryMachine dialogs reachable via the "Inspect" menu. ────
  // Labs must be on for StoryMachine to be reachable at all (ROADMAP P2);
  // both WhatIfPanel and RoomPanel open without an AI key ("deterministic,
  // no AI key required" per RoomPanel's own copy).
  {
    const context = await browser.newContext();
    await context.addInitScript(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); } catch {} });
    const page = await context.newPage();
    wireConsoleCapture(page);

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const advancedBtn = page.getByRole('button', { name: /advanced: simulation/i }).first();
    await advancedBtn.waitFor({ timeout: 15000 });
    await advancedBtn.click();

    const inspectBtn = page.getByRole('button', { name: /^inspect$/i }).first();
    await inspectBtn.waitFor({ timeout: 15000 });
    // The "Inspect" button itself is the correct RESTORE target for every
    // dialog opened from its dropdown: the specific menu item unmounts (the
    // menu closes) in the same click that opens the dialog, but "Inspect"
    // stays mounted throughout. See use-modal-focus-trap.ts's focusHistory
    // tracker doc comment for why this is what actually gets restored to.
    const inspectHandle = await inspectBtn.elementHandle();

    for (const { menuLabel, dialogName } of [
      { menuLabel: 'What-if', dialogName: 'WhatIfPanel' },
      { menuLabel: "Writers' room", dialogName: 'RoomPanel' },
    ]) {
      console.log(`\n=== ${dialogName} (StoryMachine -> Inspect -> ${menuLabel}) ===`);
      await inspectBtn.click();
      const menuItem = page.getByRole('menuitem', { name: menuLabel, exact: true }).first();
      await menuItem.waitFor({ timeout: 10000 });
      await menuItem.click();

      await verifyDialog(page, {
        name: dialogName,
        restoreTriggerHandle: inspectHandle,
        closeDialog: async () => page.keyboard.press('Escape'),
      });
    }

    await context.close();
  }

  if (genuineConsoleErrors.length > 0) {
    record('(global)', 'ZERO genuine browser console errors', false, `${genuineConsoleErrors.length} found: ${genuineConsoleErrors.slice(0, 5).join(' | ')}`);
  } else {
    record('(global)', 'ZERO genuine browser console errors', true, '');
  }
}

async function teardown() {
  try { if (browser) await browser.close(); } catch {}
  try {
    if (serverProc) {
      serverProc.kill('SIGTERM');
      await sleep(800);
      if (!serverProc.killed) serverProc.kill('SIGKILL');
    }
  } catch {}
}

function printSummary() {
  const failed = results.filter((r) => !r.pass);
  console.log('\n' + '='.repeat(72));
  console.log(`[verify] ${results.length - failed.length}/${results.length} assertions passed.`);
  if (failed.length > 0) {
    console.log('[verify] FAILED assertions:');
    for (const f of failed) console.log(`  - ${f.dialog} :: ${f.assertion}${f.detail ? ' — ' + f.detail : ''}`);
  }
  console.log('='.repeat(72));
  return failed.length === 0;
}

try {
  await main();
  await teardown();
  const allPassed = printSummary();
  process.exit(allPassed ? 0 : 1);
} catch (e) {
  console.error(`[verify] FATAL — ${e.stack || e.message}`);
  printSummary();
  await teardown();
  process.exit(1);
}
