#!/usr/bin/env node
// Browser proof for the 2026-08-24 leftover-polish pass — the three claims
// that can only be settled in a real browser:
//
//   A. Coverage's "Jump to line" now HIGHLIGHTS the finding's lines
//      (FountainEditorHandle.highlightRange), the same way the full doctor
//      panel's finding clicks already did, instead of only moving the cursor.
//   B. The Settings tab strip follows the WAI-ARIA tabs keyboard pattern:
//      one Tab stop for the whole strip, Left/Right/Home/End move focus and
//      selection, aria-selected follows. Since Decision #3 (2026-09-03,
//      docs/DECISION_LOG.md) the strip has two shapes — 3 tabs on the default
//      surface (the five AI-provider tabs went behind Labs with the rest of
//      the generative surface) and 8 with Labs on — so B walks the pattern on
//      the default strip and then, using the real in-panel Labs toggle,
//      re-walks it on the grown one. The pattern is now asserted on both,
//      which is strictly more than the pre-decision single walk covered.
//   C. The findings delta is quiet when an edit only shifts line numbers.
//      Measured, not asserted: both doctor runs' reports are captured off the
//      wire, the churn the OLD identity (raw `pass::rule::location`) would
//      have reported is computed from them here, and it is compared against
//      what the panel actually shows on screen.
//
// Runs the real server (keyless) and drives real Chromium via Playwright. The
// shared boot/launch/console-capture machinery and the PASS/FAIL summary live
// in scripts/lib/browser-verify.mjs — change them there, not here. Screenshots
// land in output/playwright/ui-polish/ (gitignored).
//
// THIS RUNS IN CI (2026-09-02), like the rest of the browser battery:
// `playwright` is a pinned devDependency and the `browser` job in
// .github/workflows/ci.yml provisions Chromium before running the suites.
// PW_CHROMIUM_PATH stays an override for a browser provisioned outside
// Playwright's cache (this container):
//
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-ui-polish-affordances.mjs
//
// Exit code 0 only when every assertion passed.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  bootKeylessServer,
  createRecorder,
  getTiming,
  launchChromium,
  pickFreePort,
  shutdown,
} from './lib/browser-verify.mjs';

const REPO = process.cwd();
const SHOTS = join(REPO, 'output', 'playwright', 'ui-polish');
mkdirSync(SHOTS, { recursive: true });

const PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${PORT}`;
let serverProc = null;
let browser = null;

// Read the load-derived timing policy FIRST — before the server boots or
// Chromium launches — so VERIFY_MAX_LOAD_PER_CPU can refuse the whole run
// without paying for either. See scripts/lib/browser-verify.mjs.
const timing = getTiming();

const { record, printSummary } = createRecorder({ grouped: true, groupKey: 'phase' });

/** Pull the final `doctor_result` report out of a captured SSE body. */
function reportFromSse(body) {
  let found = null;
  for (const frame of body.split('\n\n')) {
    const line = frame.split('\n').find((l) => l.startsWith('data: '));
    if (!line) continue;
    try {
      const payload = JSON.parse(line.slice(6));
      if (payload.type === 'doctor_result') found = payload.report;
    } catch { /* keep-alive or partial frame */ }
  }
  return found;
}

/** The identity this pass REPLACED: pass, rule, and the raw location string. */
function rawIdentities(report) {
  const seen = new Map();
  const ids = new Set();
  for (const p of report.passes) {
    for (const issue of p.issues) {
      const base = `${p.pass}::${issue.rule}::${issue.location}`;
      const nth = (seen.get(base) ?? 0) + 1;
      seen.set(base, nth);
      ids.add(nth === 1 ? base : `${base}#${nth}`);
    }
  }
  return ids;
}

try {
  serverProc = await bootKeylessServer({ repo: REPO, port: PORT, baseUrl: BASE });
  browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  // Every streamed doctor response, in order — used by proof C.
  const doctorReports = [];
  page.on('response', async (res) => {
    if (!/\/api\/scriptide\/doctor\/stream$/.test(res.url())) return;
    try {
      const report = reportFromSse(await res.text());
      if (report) doctorReports.push(report);
    } catch { /* body already gone; the assertion below reports the shortfall */ }
  });

  // ── A. Coverage "Jump to line" highlights ────────────────────────────────
  console.log('\n=== A — Coverage "Jump to line" flashes the lines ===');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });

  await page.getByRole('button', { name: /try sample coverage/i }).first().click({ timeout: timing.ms(15000) });
  await page.waitForFunction(() => /RECOMMEND|CONSIDER|PASS/.test(document.body.innerText), { timeout: timing.ms(40000) });
  await page.screenshot({ path: join(SHOTS, 'A1-coverage-summary.png'), fullPage: false });

  const jumpBtn = page.getByRole('button', { name: /jump to line \d+/i }).first();
  const jumpCount = await jumpBtn.count();
  record('A', 'Coverage renders a "Jump to line" button for the sample', jumpCount > 0, `count=${jumpCount}`);

  const flashBefore = await page.locator('.cm-sm-finding-flash').count();
  record('A', 'no finding highlight is painted before the click', flashBefore === 0, `count=${flashBefore}`);

  if (jumpCount > 0) {
    await jumpBtn.click();
    // The decoration is removed after its 2.2s fade (FountainEditor.tsx), so
    // look immediately.
    const flashed = await page
      .waitForSelector('.cm-sm-finding-flash', { timeout: timing.ms(2000) })
      .then(() => true)
      .catch(() => false);
    record('A', 'clicking it paints the highlightRange decoration in the editor', flashed, '.cm-sm-finding-flash present');
    await page.screenshot({ path: join(SHOTS, 'A2-jump-highlight.png'), fullPage: false });

    const spanLines = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.cm-sm-finding-flash'));
      return nodes.map((n) => n.textContent?.slice(0, 60) ?? '').filter(Boolean);
    });
    record('A', 'the decoration covers real script text (a span, not an empty range)', spanLines.length > 0, JSON.stringify(spanLines).slice(0, 200));
  }

  // ── C. The delta is quiet after an upstream edit ─────────────────────────
  // Done before B because it continues from the same coverage run.
  console.log('\n=== C — findings delta after an edit that only shifts line numbers ===');
  await page.getByRole('button', { name: 'Full report', exact: true }).first().click({ timeout: timing.ms(15000) });
  await page.waitForSelector('[role="dialog"]', { timeout: timing.ms(15000) });
  await page.screenshot({ path: join(SHOTS, 'C1-full-report.png'), fullPage: false });

  // Edit an EARLY scene, with the doctor panel still open (it is a 640px
  // right-hand drawer, so the editor stays reachable).
  const editor = page.locator('.cm-content').first();
  await editor.click({ position: { x: 40, y: 60 } });
  await page.keyboard.press('Control+Home');
  // Walk into the first scene's body, past the opening slugline.
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Home');
  await page.keyboard.type('He pours the last of the coffee and sets the pot down hard.\n');
  await page.screenshot({ path: join(SHOTS, 'C2-early-edit.png'), fullPage: false });

  await page.getByRole('button', { name: /re-run diagnosis/i }).first().click();
  // Locator-based wait, not document.body.innerText: the delta line sits
  // inside the doctor drawer, and innerText did not reliably reflect it
  // while the drawer was mid-animation.
  const deltaLine = page
    .locator('[role="dialog"] p')
    .filter({ hasText: /since your last run|No change in findings/ })
    .first();
  const deltaAppeared = await deltaLine
    .waitFor({ state: 'attached', timeout: timing.ms(90000) })
    .then(() => true)
    .catch(() => false);
  if (!deltaAppeared) await page.screenshot({ path: join(SHOTS, 'C-debug-no-delta.png'), fullPage: false });
  await page.screenshot({ path: join(SHOTS, 'C3-delta.png'), fullPage: false });

  const deltaText = deltaAppeared ? ((await deltaLine.textContent()) ?? '').trim() : '';
  record('C', 'the panel shows a findings delta after the re-run', deltaText.length > 0, JSON.stringify(deltaText));

  const shownCleared = Number(/(\d+) finding/.exec(deltaText)?.[1] ?? 0);
  const shownAdded = Number(/(\d+) new/.exec(deltaText)?.[1] ?? 0);
  const shownChurn = shownCleared + shownAdded;

  record('C', 'both doctor runs were captured off the wire', doctorReports.length >= 2, `captured=${doctorReports.length}`);
  if (doctorReports.length >= 2) {
    const before = doctorReports[doctorReports.length - 2];
    const after = doctorReports[doctorReports.length - 1];
    const a = rawIdentities(before);
    const b = rawIdentities(after);
    let rawCleared = 0; for (const id of a) if (!b.has(id)) rawCleared++;
    let rawAdded = 0; for (const id of b) if (!a.has(id)) rawAdded++;
    const rawChurn = rawCleared + rawAdded;

    // The findings that moved ONLY because the line numbers moved: same pass
    // and rule, a line-shaped location, gone from `after` at the old number.
    const drifted = [...a].filter((id) => !b.has(id) && /::Lines?\s+\d+/.test(id));
    record('C', 'the edit really did drift line-anchored findings', drifted.length > 0,
      `drifted=${drifted.length} e.g. ${JSON.stringify(drifted.slice(0, 3))}`);
    record('C', 'the shown delta is quieter than the raw-location identity would have been',
      shownChurn < rawChurn,
      `raw cleared+new=${rawCleared}+${rawAdded}=${rawChurn} · shown=${shownCleared}+${shownAdded}=${shownChurn}`);

    // The untouched later findings specifically: every drifted one must be
    // absent from what the writer is told changed.
    record('C', 'the drifted findings are not what the panel is reporting as changed',
      shownChurn <= rawChurn - drifted.length,
      `drifted=${drifted.length} rawChurn=${rawChurn} shown=${shownChurn}`);
  }

  // ── B. Settings tab strip keyboard pattern ───────────────────────────────
  console.log('\n=== B — Settings tab strip: one Tab stop, arrows move ===');
  await page.keyboard.press('Escape'); // close the doctor panel
  await page.waitForTimeout(timing.ms(500));
  // Same path a writer takes: Toolbar overflow ("More tools") → "Labs &
  // Settings". Selector convention lifted from
  // scripts/verify-p2-p3-surfaces.mjs's getOverflowMenuItemLabels.
  await page.getByRole('button', { name: 'More tools' }).first().click({ timeout: timing.ms(15000) });
  const menu = page.getByRole('menu').first();
  await menu.waitFor({ timeout: timing.ms(10000) });
  await menu.getByRole('menuitem', { name: /labs/i }).first().click({ timeout: timing.ms(10000) });
  const tablist = page.locator('[role="tablist"][aria-label="Settings sections"]');
  await tablist.waitFor({ timeout: timing.ms(15000) });
  await page.screenshot({ path: join(SHOTS, 'B1-settings-open.png'), fullPage: false });

  // Scoped to the Settings tablist specifically: Sidebar.tsx's own
  // Scenes/Characters switcher (2026-09-04 a11y pass) is now ALSO a real
  // role="tab" pair (one active, roving-tabindex=0, aria-selected="true"
  // by default) — an unscoped querySelectorAll would double-count both
  // the "exactly one" roving-tabindex and "exactly one" aria-selected
  // checks below.
  const tabState = () => page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tablist"][aria-label="Settings sections"] [role="tab"]'));
    return {
      active: document.activeElement?.id ?? null,
      tabIndexes: tabs.map((t) => `${t.id}:${t.getAttribute('tabindex')}`),
      selected: tabs.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.id),
    };
  });

  const initial = await tabState();
  record('B', 'exactly one tab is in the Tab order (roving tabindex)',
    initial.tabIndexes.filter((s) => s.endsWith(':0')).length === 1,
    JSON.stringify(initial.tabIndexes));
  record('B', 'exactly one tab is aria-selected', initial.selected.length === 1, JSON.stringify(initial.selected));

  // Decision #3 (2026-09-03): the DEFAULT strip is Story / Session / Labs —
  // the five AI-provider tabs (Providers, Text LLM, Image, TTS, Embeddings)
  // exist only to point a generative feature at a provider, and moved behind
  // Labs with the rest of that surface. verify-p2-p3-surfaces.mjs owns the
  // "which tabs are here" claim; this block owns the KEYBOARD pattern over
  // whichever tabs are here, so the expected ids below moved with the strip.
  record('B', 'the default strip is exactly Story / Session / Labs (Decision #3)',
    JSON.stringify(initial.tabIndexes.map((s) => s.split(':')[0])) ===
      JSON.stringify(['settings-tab-story', 'settings-tab-session', 'settings-tab-labs']),
    JSON.stringify(initial.tabIndexes));

  // Tab from the dialog's close button must land on the selected tab, and one
  // more Tab must leave the strip entirely — the point of the pattern.
  await page.getByRole('button', { name: /close settings/i }).first().focus();
  await page.keyboard.press('Tab');
  const afterFirstTab = await tabState();
  record('B', 'Tab enters the strip at the selected tab',
    afterFirstTab.active === 'settings-tab-story', `activeElement=${afterFirstTab.active}`);
  await page.keyboard.press('Tab');
  const afterSecondTab = await page.evaluate(() => document.activeElement?.id ?? document.activeElement?.tagName ?? null);
  record('B', 'the next Tab leaves the strip instead of visiting the remaining tabs',
    !/^settings-tab-/.test(String(afterSecondTab)), `activeElement=${afterSecondTab}`);

  // Arrow keys.
  await page.locator('#settings-tab-story').focus();
  await page.keyboard.press('ArrowRight');
  const right = await tabState();
  record('B', 'ArrowRight moves focus AND selection to the next tab',
    right.active === 'settings-tab-session' && right.selected[0] === 'settings-tab-session',
    JSON.stringify(right));
  await page.screenshot({ path: join(SHOTS, 'B2-arrow-right.png'), fullPage: false });

  await page.keyboard.press('ArrowLeft');
  const left = await tabState();
  record('B', 'ArrowLeft moves back', left.active === 'settings-tab-story' && left.selected[0] === 'settings-tab-story', JSON.stringify(left));

  await page.keyboard.press('ArrowLeft');
  const wrapped = await tabState();
  record('B', 'ArrowLeft from the first tab wraps to the last', wrapped.active === 'settings-tab-labs', JSON.stringify(wrapped.active));

  await page.keyboard.press('Home');
  const home = await tabState();
  record('B', 'Home jumps to the first tab', home.active === 'settings-tab-story', JSON.stringify(home.active));

  await page.keyboard.press('End');
  const end = await tabState();
  record('B', 'End jumps to the last tab', end.active === 'settings-tab-labs', JSON.stringify(end.active));
  await page.screenshot({ path: join(SHOTS, 'B3-end-key.png'), fullPage: false });

  // Scoped to the Settings dialog specifically: Sidebar.tsx's own
  // Scenes/Characters switcher (2026-09-04 a11y pass) is now ALSO a real
  // role="tablist"/"tab"/"tabpanel" set (Scenes starts aria-selected="true"
  // by default), so an unscoped querySelector can resolve to Sidebar's
  // (which sits earlier in the DOM) instead of Settings' own.
  const panelShown = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    const active = dialog?.querySelector('[role="tab"][aria-selected="true"]');
    const panel = dialog?.querySelector('[role="tabpanel"]');
    return { activeTab: active?.id ?? null, panelId: panel?.id ?? null };
  });
  record('B', 'the visible tabpanel follows the selected tab',
    panelShown.activeTab === 'settings-tab-labs' && panelShown.panelId === 'settings-panel-labs',
    JSON.stringify(panelShown));

  // ── B, part two (Decision #3) — the same pattern over the GROWN strip. End
  // left us on the Labs tab, whose toggle is the real, writer-facing way to
  // bring the five provider tabs back; flipping it must re-render the strip in
  // place, and the keyboard pattern must still hold across all eight. This is
  // the eight-tab walk the pre-decision version of this block did — kept
  // rather than dropped, it just needs the toggle now to reach that strip. ──
  await page.locator('#labs-toggle').check();
  await page.waitForTimeout(timing.ms(250));
  const grown = await tabState();
  record('B', 'flipping the in-panel Labs toggle grows the strip back to all eight tabs',
    grown.tabIndexes.length === 8, JSON.stringify(grown.tabIndexes));
  record('B', 'still exactly one tab in the Tab order after the strip grows',
    grown.tabIndexes.filter((s) => s.endsWith(':0')).length === 1, JSON.stringify(grown.tabIndexes));
  record('B', 'the selection survives the strip growing (still Labs)',
    grown.selected.length === 1 && grown.selected[0] === 'settings-tab-labs', JSON.stringify(grown.selected));

  await page.locator('#settings-tab-providers').focus();
  await page.keyboard.press('ArrowRight');
  const grownRight = await tabState();
  record('B', 'ArrowRight moves Providers -> Text LLM on the grown strip',
    grownRight.active === 'settings-tab-llm' && grownRight.selected[0] === 'settings-tab-llm',
    JSON.stringify(grownRight));

  await page.keyboard.press('Home');
  const grownHome = await tabState();
  record('B', 'Home jumps to Providers on the grown strip',
    grownHome.active === 'settings-tab-providers', JSON.stringify(grownHome.active));

  await page.keyboard.press('End');
  const grownEnd = await tabState();
  record('B', 'End jumps to Labs on the grown strip',
    grownEnd.active === 'settings-tab-labs', JSON.stringify(grownEnd.active));

  await page.keyboard.press('ArrowRight');
  const grownWrap = await tabState();
  record('B', 'ArrowRight from the last tab wraps to Providers on the grown strip',
    grownWrap.active === 'settings-tab-providers', JSON.stringify(grownWrap.active));
} catch (err) {
  record('harness', 'the proof run completed without throwing', false, String(err && err.stack ? err.stack : err));
} finally {
  await shutdown({ browser, serverProc });
}

const allPassed = printSummary({ extraLines: [`[verify] screenshots: ${SHOTS}`] });
process.exit(allPassed ? 0 : 1);
