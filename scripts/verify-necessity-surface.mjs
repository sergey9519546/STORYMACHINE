#!/usr/bin/env node
// verify-necessity-surface.mjs — live-browser proof for the Necessity
// Certificate's writer-facing surface: the four questions on an outline beat
// in the Director HUD (src/components/DirectorPanel.tsx, Outline tab).
//
// The shared boot/launch/console-capture machinery and the PASS/FAIL summary
// live in scripts/lib/browser-verify.mjs — change them there, not here. Every
// wait goes through timing.ms() (the load-derived policy in that module).
//
// WHAT IT PROVES, as a writer would experience it:
//   1. the four questions render, are keyboard reachable, and are labelled;
//   2. the honest copy is on screen — "checks that you answered, not whether
//      the answers are good" — wherever the writer types the answers;
//   3. the keyless form check reports a SKIPPED question with a per-field
//      reason, and reports all four answered once the writer answers;
//   4. the answers survive Save → reload (the round trip through
//      POST/GET /api/outline; the client schema strips unknown keys, so this
//      is the assertion that the certificate is not silently destroyed);
//   5. both themes and a 375px viewport render it without clipping.
//
// The Director HUD is Labs-gated and this script does not change that: it
// enables Labs in localStorage exactly the way scripts/verify-a11y.mjs §9
// already does, then reaches the panel through the command palette.
//
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-necessity-surface.mjs
//
// Exit codes: 0 = every assertion passed. 1 = at least one failed.

import { mkdirSync } from 'node:fs';
import {
  bootKeylessServer,
  createRecorder,
  getTiming,
  launchChromium,
  pickFreePort,
  shutdown,
  wireConsoleCapture,
} from './lib/browser-verify.mjs';

const REPO = process.cwd();
const OUT_DIR = `${REPO}/scripts/output`;
mkdirSync(OUT_DIR, { recursive: true });

const ISOLATED_PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${ISOLATED_PORT}`;

let serverProc = null;
let browser = null;
let timing = null;

const { record, printSummary } = createRecorder();
const consoleErrors = [];

const isMac = process.platform === 'darwin';
const MOD = isMac ? 'Meta' : 'Control';

// Four answers that pass the form check, and one that does not.
const ANSWERS = {
  whyNow: 'The vault time-lock releases for eleven minutes at dawn and never again this week.',
  whyHere: 'The loading bay is the only room without a camera covering the east door.',
  whyThem: 'Only Mara knows the override phrase, and only Deke can carry the crate alone.',
  forcingFunction: 'The freight manifest is audited at noon, so the crate must be gone before it.',
};
const PLACEHOLDER = 'because the plot needs it';

async function openOutlineTab(page) {
  await page.addInitScript(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); } catch { /* private mode */ } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  // A second tab in the same browser context restores the session from local
  // state and lands straight on the editor — the start screen is only there on
  // a first visit, so clicking it is conditional rather than assumed.
  const startFresh = page.getByRole('button', { name: /start fresh/i }).first();
  const onStartScreen = await startFresh.waitFor({ timeout: timing.ms(6000) }).then(() => true).catch(() => false);
  if (onStartScreen) await startFresh.click({ timeout: timing.ms(15000) });
  await page.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });

  await page.keyboard.press(`${MOD}+k`);
  await page.getByRole('dialog', { name: 'Command palette' }).waitFor({ timeout: timing.ms(5000) }).catch(() => {});
  await page.keyboard.type('director', { delay: 15 });
  await page.getByRole('option', { name: /director hud/i }).first().waitFor({ timeout: timing.ms(5000) });
  await page.keyboard.press('Enter');
  await page.getByRole('dialog', { name: 'AI Director State' }).waitFor({ timeout: timing.ms(10000) });
  await page.getByRole('button', { name: 'Outline', exact: true }).first().click();
  await page.waitForTimeout(timing.ms(200));
}

function fieldBox(page, field) {
  return page.locator(`#beat-0-necessity-${field}`);
}

async function main() {
  timing = getTiming();
  serverProc = await bootKeylessServer({ repo: REPO, port: ISOLATED_PORT, baseUrl: BASE });
  browser = await launchChromium();
  const context = await browser.newContext();
  const page = await context.newPage();
  wireConsoleCapture(page, consoleErrors);

  // ══════════════════════════════════════════════════════════════════════
  // 1) The four questions render on a beat, labelled and honest.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 1) The four questions on an outline beat ===');
  await openOutlineTab(page);
  await page.getByRole('button', { name: /\+ add beat/i }).first().click();
  await page.waitForTimeout(timing.ms(150));

  for (const field of ['whyNow', 'whyHere', 'whyThem', 'forcingFunction']) {
    const visible = await fieldBox(page, field).isVisible().catch(() => false);
    record(`Outline beat renders the "${field}" question`, visible);
  }

  const honestCopy = await page.getByText(/checks that you answered/i).first().isVisible().catch(() => false);
  record('The surface says what the check does NOT do (answered, not good)', honestCopy);
  const noScoreClaim = await page.evaluate(() => {
    const legend = Array.from(document.querySelectorAll('fieldset'))
      .find(f => /necessity/i.test(f.querySelector('legend')?.textContent ?? ''));
    return legend ? !/\b(score|scored|grade|rating)\b/i.test(legend.textContent ?? '') : false;
  });
  record('The necessity block never claims to score or grade an answer', noScoreClaim);

  await page.screenshot({ path: `${OUT_DIR}/necessity-outline-light.png`, fullPage: false });

  // ══════════════════════════════════════════════════════════════════════
  // 2) Keyboard: every box and the check button are reachable by Tab.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 2) Keyboard reachability ===');
  await fieldBox(page, 'whyNow').focus();
  const reached = [];
  for (let i = 0; i < 6; i++) {
    const id = await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.trim().slice(0, 20) || null);
    reached.push(id);
    await page.keyboard.press('Tab');
  }
  const tabbedThroughAllFour = ['whyNow', 'whyHere', 'whyThem', 'forcingFunction']
    .every(f => reached.includes(`beat-0-necessity-${f}`));
  record('Tab walks from the first question through all four', tabbedThroughAllFour, `stops=${JSON.stringify(reached)}`);
  const reachedCheckButton = reached.some(r => typeof r === 'string' && /check answers/i.test(r));
  record('Tab reaches the "Check answers" button after the four boxes', reachedCheckButton, `stops=${JSON.stringify(reached)}`);

  // ══════════════════════════════════════════════════════════════════════
  // 3) The keyless form check: a skipped question, then an answered one.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 3) The form check, keyless ===');
  await fieldBox(page, 'whyNow').fill(ANSWERS.whyNow);
  await fieldBox(page, 'whyHere').fill(ANSWERS.whyHere);
  await fieldBox(page, 'whyThem').fill(ANSWERS.whyThem);
  await fieldBox(page, 'forcingFunction').fill(PLACEHOLDER);
  await page.getByRole('button', { name: /check answers/i }).first().click();

  const sawUnanswered = await page.getByText(/1 unanswered/i).first()
    .waitFor({ timeout: timing.ms(6000) }).then(() => true).catch(() => false);
  record('A placeholder answer is reported as unanswered', sawUnanswered);
  // The reason text says what the rule MEASURED. It must not say the answer
  // is "made only of placeholder or filler text" — false in exactly the case
  // the rule used to over-fire on (round-1 review, finding 1).
  const sawReason = await page.getByText(/no words left/i).first().isVisible().catch(() => false);
  record('The writer is told WHY, per field, in words about the text', sawReason);
  const overclaims = await page.getByText(/made only of placeholder/i).first().isVisible().catch(() => false);
  record('The reason text does not assert the answer is nothing but filler', !overclaims);
  const describedBy = await fieldBox(page, 'forcingFunction').getAttribute('aria-describedby');
  record('The failing box points at its reason via aria-describedby', describedBy === 'beat-0-necessity-forcingFunction-reason', `got=${describedBy}`);
  await page.screenshot({ path: `${OUT_DIR}/necessity-check-failed.png`, fullPage: false });

  // The three real answers are NOT second-guessed.
  const otherReasons = await page.locator('p[id$="-reason"]').count();
  record('Only the unanswered question is flagged (no judgement of the other three)', otherReasons === 1, `reason paragraphs=${otherReasons}`);

  await fieldBox(page, 'forcingFunction').fill(ANSWERS.forcingFunction);
  const verdictClearedOnEdit = await page.getByText(/1 unanswered/i).first()
    .waitFor({ state: 'detached', timeout: timing.ms(4000) }).then(() => true).catch(() => false);
  record('Editing an answer clears the stale verdict rather than leaving a lie on screen', verdictClearedOnEdit);

  await page.getByRole('button', { name: /check answers/i }).first().click();
  const sawAllFour = await page.getByText(/all four answered/i).first()
    .waitFor({ timeout: timing.ms(6000) }).then(() => true).catch(() => false);
  record('Four well-formed answers report "All four answered"', sawAllFour);

  // ══════════════════════════════════════════════════════════════════════
  // 4) Save → reload: the certificate survives the round trip.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 4) Save and reload ===');
  await page.getByRole('button', { name: /save to engine/i }).first().click();
  await page.getByText(/saved ✓/i).first().waitFor({ timeout: timing.ms(6000) }).catch(() => {});

  const page2 = await context.newPage();
  wireConsoleCapture(page2, consoleErrors);
  await openOutlineTab(page2);
  const reloaded = await fieldBox(page2, 'whyNow').inputValue().catch(() => '');
  record('The answers come back after a reload (the round trip does not strip them)', reloaded === ANSWERS.whyNow, `got=${JSON.stringify(reloaded.slice(0, 60))}`);
  const reloadedForcing = await fieldBox(page2, 'forcingFunction').inputValue().catch(() => '');
  record('All four come back, not just the first', reloadedForcing === ANSWERS.forcingFunction);
  await page2.close();

  // ══════════════════════════════════════════════════════════════════════
  // 5) Dark theme and 375px.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 5) Dark theme + 375px ===');
  await page.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
  await page.waitForTimeout(timing.ms(400));
  const darkVisible = await fieldBox(page, 'whyNow').isVisible().catch(() => false);
  record('The four questions render in dark theme', darkVisible);
  await page.screenshot({ path: `${OUT_DIR}/necessity-outline-dark.png`, fullPage: false });

  await page.setViewportSize({ width: 375, height: 820 });
  await page.waitForTimeout(timing.ms(300));
  const narrowFits = await page.evaluate(() => {
    const box = document.querySelector('#beat-0-necessity-whyNow');
    if (!box) return false;
    const rect = box.getBoundingClientRect();
    return rect.width > 0 && rect.left >= -1 && rect.right <= window.innerWidth + 1;
  });
  record('At 375px the answer boxes fit the viewport without horizontal overflow', narrowFits);
  const buttonVisibleNarrow = await page.getByRole('button', { name: /check answers/i }).first().isVisible().catch(() => false);
  record('At 375px the "Check answers" button is still reachable', buttonVisibleNarrow);
  await page.screenshot({ path: `${OUT_DIR}/necessity-outline-375.png`, fullPage: false });

  record('No genuine console errors during the run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  await context.close();
  return printSummary();
}

let allPassed = false;
try {
  allPassed = await main();
} catch (e) {
  console.error('[verify] FATAL:', e.stack || e.message);
} finally {
  await shutdown({ browser, serverProc });
}
process.exit(allPassed ? 0 : 1);
