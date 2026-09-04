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
// THIS RUNS IN CI (2026-09-02). It used to say the opposite — "not a CI test,
// CI has no browser provisioned" — and that was a self-imposed limitation, not
// a fact: an ubuntu-latest runner installs Chromium in one step. The cost of
// the old claim was real rot (an ARIA role change broke a selector here and
// nobody noticed for days, because nothing ran it). `playwright` is now a
// pinned devDependency and the `browser` job in .github/workflows/ci.yml runs
// `npx playwright install --with-deps chromium` before `npm run verify:browser`,
// so this suite gates every push and blocks `publish` in release.yml. Run it
// by hand too, after touching use-modal-focus-trap.ts or any dialog that
// calls it.
//
// Prereqs: Node >= 22.6; `npm ci` (brings Playwright) and a Chromium binary —
// `npx playwright install chromium`, which is what CI does. In THIS container
// a browser is already provisioned outside Playwright's cache, so run:
//
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-focus-traps.mjs
//
// (PW_CHROMIUM_PATH is optional — omit it to let Playwright resolve its own
// pinned browser build, which is the CI path.)
//
// Boot/launch/console-capture/report-wait and the PASS/FAIL summary all live
// in scripts/lib/browser-verify.mjs — change them there, not here.
//
// Exit codes: 0 = every assertion passed. 1 = at least one failed (see the
// per-assertion PASS/FAIL log above the summary for which, and why).

import {
  bootKeylessServer,
  createRecorder,
  getTiming,
  launchChromium,
  pickFreePort,
  shutdown,
  waitForRenderedText,
  wireConsoleCapture,
} from './lib/browser-verify.mjs';

const REPO = process.cwd();

const ISOLATED_PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${ISOLATED_PORT}`;

let serverProc = null;
let browser = null;
let timing = null; // set at the top of main() — see scripts/lib/browser-verify.mjs
const genuineConsoleErrors = [];

// { dialog, assertion, pass, detail }
const { record, printSummary } = createRecorder({
  grouped: true,
  groupKey: 'dialog',
  listFailures: true,
});

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
  await page.waitForSelector('[role="dialog"]', { timeout: timing.ms(10000) });
  // Let framer-motion enter animations and the hook's own effect settle —
  // ScriptDoctorPanel's spring exit alone takes ~600ms; give entry the same
  // headroom rather than tuning per-dialog constants.
  await page.waitForTimeout(timing.ms(400));

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
    await page.waitForTimeout(timing.ms(150));
    const fwd = await activeElementInfo(page);
    const fwdOk = fwd.insideDialog && fwd.desc === focusables[0];
    record(name, 'TRAP FORWARD wraps last -> first', fwdOk, `got="${fwd.desc}" expected="${focusables[0]}"`);

    // 3. TRAP BACKWARD: focus first, Shift+Tab -> last.
    await focusNth(page, 0);
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(timing.ms(150));
    const bwd = await activeElementInfo(page);
    const bwdOk = bwd.insideDialog && bwd.desc === focusables[focusables.length - 1];
    record(name, 'TRAP BACKWARD wraps first -> last', bwdOk, `got="${bwd.desc}" expected="${focusables[focusables.length - 1]}"`);
  }

  // 4. RESTORE
  await closeDialog();
  // ScriptDoctorPanel's framer-motion exit spring needs real time to finish
  // before React actually unmounts it and the hook's cleanup runs.
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: timing.ms(3000) }).catch(() => {});
  await page.waitForTimeout(timing.ms(150));
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
  // Read the load-derived timing policy FIRST — before the server boots or
  // Chromium launches — so VERIFY_MAX_LOAD_PER_CPU can refuse the whole run
  // without paying for either. See scripts/lib/browser-verify.mjs.
  timing = getTiming();

  serverProc = await bootKeylessServer({ repo: REPO, port: ISOLATED_PORT, baseUrl: BASE });
  browser = await launchChromium();

  // ── Context 1: ScriptDoctorPanel — the P0-critical dialog. ───────────────
  // StartScreen -> "Try sample coverage" -> CoverageSummary -> "Full report".
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    wireConsoleCapture(page, genuineConsoleErrors);

    console.log('\n=== ScriptDoctorPanel (StartScreen -> Try sample coverage -> Full report) ===');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });

    const sampleCta = page.getByRole('button', { name: /try sample coverage/i }).first();
    await sampleCta.click({ timeout: timing.ms(15000) });
    // The coverage card streams over SSE (/api/scriptide/doctor/stream), whose
    // 200 arrives at connection-open — before the report exists. The shared
    // helper polls the rendered text against a real deadline; it was the third
    // copy of this wait and the third fix of the same race, which is why it
    // now lives in scripts/lib/browser-verify.mjs exactly once.
    const bodyText = await waitForRenderedText(page, 'CONSIDER');

    // Smoke basics (assertion 5): the deterministic report actually rendered.
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
    wireConsoleCapture(page, genuineConsoleErrors);

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
    const advancedBtn = page.getByRole('button', { name: /advanced: simulation/i }).first();
    await advancedBtn.waitFor({ timeout: timing.ms(15000) });
    await advancedBtn.click();

    const inspectBtn = page.getByRole('button', { name: /^inspect$/i }).first();
    await inspectBtn.waitFor({ timeout: timing.ms(15000) });
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
      await menuItem.waitFor({ timeout: timing.ms(10000) });
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

const teardown = () => shutdown({ browser, serverProc, graceMs: 800 });

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
