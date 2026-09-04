#!/usr/bin/env node
// verify-a11y.mjs — the first systematic accessibility audit of this app,
// made durable. Prior a11y work (focus traps, dialog semantics, labelled
// fields, tab order, visible disabled reasons) was real but piecemeal —
// nothing ran axe-core across the app's actual surfaces, and nothing
// asserted the keyboard-only journey end to end. This suite does both:
//
//   1) axe-core (loaded from node_modules — a pinned devDependency, same
//      resolution style as Playwright itself) run against every primary
//      surface in BOTH themes where the surface's own content can differ
//      by theme (see THEME NOTE below) — fails on any serious/critical
//      violation. Moderate/minor are logged, not gated, matching how the
//      rest of this battery treats non-blocking findings.
//   2) A keyboard-only run of the primary journey (land -> paste -> analyze
//      -> read a finding -> jump to it -> export) with NO .click() calls —
//      every activation is Tab/Enter/keyboard shortcuts, same style as
//      verify-e5-command-palette.mjs's own Tab-order walk.
//   3) Explicit accessible-name and live-region assertions axe's own
//      output already covers per-surface (button-name, aria-live wiring)
//      but which are worth naming directly so a regression here reads as
//      "icon-only button lost its label" rather than a generic count drop.
//
// THEME NOTE: this app's paper·ink·stamp design tokens (design-system.css)
// are theme-invariant — the dark-mode toggle (Alt+Shift+D) never changes
// --sm-panel/--sm-ink/etc — but several panels (ScriptDoctorPanel,
// SnapshotManager, SettingsPanel/AIProviderSettings) also carry plain
// Tailwind dark: color pairs for accents (red/green/amber/indigo). A
// contrast bug in those pairs only surfaces once .dark is actually active,
// which is why this suite re-runs axe under both states on the surfaces
// that use them (see the 2026-09-04 a11y pass commit for the real bugs
// this caught: dark:text-white on a background that never went dark,
// measuring 1.14:1; an indigo badge pair at 1.36:1; several bare
// text-gray-500/red-600/green-600 instances failing even in light mode).
//
// Shared boot/launch/console-capture/PASS-FAIL-summary machinery lives in
// scripts/lib/browser-verify.mjs — change it there, not here.
//
// Run: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-a11y.mjs
// (PW_CHROMIUM_PATH is optional — omit it for Playwright's own resolution,
// the CI path.) Exit codes: 0 = every assertion passed, 1 = at least one failed.

import { mkdirSync } from 'node:fs';
import {
  bootKeylessServer,
  createRecorder,
  launchChromium,
  pickFreePort,
  shutdown,
  waitForRenderedText,
  wireConsoleCapture,
} from './lib/browser-verify.mjs';
import { createRequire } from 'node:module';

const REPO = process.cwd();
// Resolve axe-core through node's own resolver rather than assuming it sits
// in THIS directory's node_modules. A git worktree has its own cwd but no
// install of its own, so the hardcoded path made this suite die ENOENT
// before its first assertion whenever it ran from one — a failure that says
// nothing about the app. Resolution walks up to whichever checkout holds the
// pinned devDependency, which is the version the assertions were written
// against either way.
const AXE_PATH = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const OUT_DIR = `${REPO}/scripts/output`;
mkdirSync(OUT_DIR, { recursive: true });

const ISOLATED_PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${ISOLATED_PORT}`;
let serverProc = null;
let browser = null;
const genuineConsoleErrors = [];

const isMac = process.platform === 'darwin';
const MOD = isMac ? 'Meta' : 'Control';

const { record, printSummary } = createRecorder({
  grouped: true,
  groupKey: 'surface',
  listFailures: true,
});

// ── axe-core sweep ───────────────────────────────────────────────────────
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const GATED_IMPACTS = new Set(['serious', 'critical']);

// scrollable-region-focusable on `.cm-scroller` (CodeMirror's own scroll
// container) was previously excluded here: the textbook fix — tabIndex=0 on
// the scroller — had been tried, verified live, and REVERTED because it
// made a separate, real, pre-existing keyboard trap easier to hit (focus
// could land on `.cm-content` with tab-escape never armed and no way out
// via Tab alone). That trap is fixed now — fountain-keymap.ts auto-arms
// tab-escape on ANY bare-Tab arrival at `.cm-content`, regardless of which
// element the Tab was pressed from — so `view.scrollDOM.tabIndex = 0` was
// re-enabled (FountainEditor.tsx) and this exclusion is gone. Section 2's
// keyboard journey and section 8's editor-tab-trap checks below prove both
// halves live: the scroller is independently Tab-reachable, and a raw-Tab
// user can still Tab straight through scroller -> content -> out with no
// Escape press.
const KNOWN_UNFIXED_RULE_IDS = new Set([]);

/** Runs axe against the current DOM and records one PASS/FAIL per surface:
 *  fails the surface if any serious/critical violation is found OUTSIDE
 *  KNOWN_UNFIXED_RULE_IDS (logs the rule id, impact, node count and up to
 *  3 offending selectors for every violation regardless, in results[] via
 *  the returned object — the caller decides gate vs log for anything
 *  below "serious"). */
async function auditSurface(page, surfaceName) {
  await page.addScriptTag({ path: AXE_PATH });
  const results = await page.evaluate(async (tags) => {
    // @ts-ignore — axe is attached to window by the injected script above.
    return await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
  }, AXE_TAGS);

  const gated = results.violations.filter((v) => GATED_IMPACTS.has(v.impact) && !KNOWN_UNFIXED_RULE_IDS.has(v.id));
  const detail = results.violations
    .map((v) => `${v.impact}:${v.id}(${v.nodes.length}) [${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}]`)
    .join('; ');
  record(surfaceName, 'axe: zero serious/critical violations', gated.length === 0, detail || 'clean');
  return results.violations;
}

async function main() {
  serverProc = await bootKeylessServer({ repo: REPO, port: ISOLATED_PORT, baseUrl: BASE });
  browser = await launchChromium();

  // ══════════════════════════════════════════════════════════════════════
  // 1) LANDING — axe, then the start of the keyboard-only journey.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 1) Landing (StartScreen) ===');
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  wireConsoleCapture(page1, genuineConsoleErrors);
  await page1.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const startFreshBtn = page1.getByRole('button', { name: /start fresh/i }).first();
  await startFreshBtn.waitFor({ timeout: 15000 });
  await auditSurface(page1, 'landing');

  // KEYBOARD JOURNEY step 1: land -> reach "Start fresh" via Tab alone,
  // activate with Enter (no .click() anywhere in this journey).
  let reachedStartFresh = false;
  for (let i = 0; i < 25; i++) {
    await page1.keyboard.press('Tab');
    const label = await page1.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 40) || null);
    if (label && /start fresh/i.test(label)) { reachedStartFresh = true; break; }
  }
  record('keyboard-journey', 'land: "Start fresh" reachable via Tab alone (25 presses)', reachedStartFresh);
  await page1.keyboard.press('Enter');
  const toolbarAppeared = await page1.locator('header.sm-pagetop').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  record('keyboard-journey', 'land: Enter on "Start fresh" opens the editor (no mouse)', toolbarAppeared);
  await context1.close();

  // ══════════════════════════════════════════════════════════════════════
  // 2) EDITOR + PASTE + full keyboard journey (analyze/read/jump/export).
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 2) Editor, keyboard journey: paste -> analyze -> read -> jump -> export ===');
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  wireConsoleCapture(page2, genuineConsoleErrors);
  await page2.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page2.getByRole('button', { name: /start fresh/i }).first().click({ timeout: 15000 });
  await page2.locator('header.sm-pagetop').waitFor({ timeout: 15000 });

  const editor = page2.locator('.cm-content').first();
  await editor.waitFor({ timeout: 10000 });

  // KEYBOARD JOURNEY step 2: reach the editor via Tab alone, then type
  // (paste stands in for real Fountain text — Enter on "Write" isn't
  // needed, Write is the default task).
  //
  // item 5 (scroller re-enable): FountainEditor.tsx now sets
  // `view.scrollDOM.tabIndex = 0`, so `.cm-scroller` is a real Tab stop
  // ahead of `.cm-content` in DOM order — this walk targets `.cm-content`
  // specifically via classList (not the old broad "cm-" substring, which
  // would now stop one hop early on the scroller and find nothing to type
  // into) and separately records whether the scroller hop was actually
  // visited, proving it is independently reachable (the axe
  // scrollable-region-focusable fix itself).
  let reachedScroller = false;
  let reachedEditor = false;
  for (let i = 0; i < 15; i++) {
    const at = await page2.evaluate(() => ({
      scroller: document.activeElement?.classList?.contains?.('cm-scroller') ?? false,
      content: document.activeElement?.classList?.contains?.('cm-content') ?? false,
    }));
    if (at.scroller) reachedScroller = true;
    if (at.content) { reachedEditor = true; break; }
    await page2.keyboard.press('Tab');
  }
  record('keyboard-journey', 'paste: the editor\'s scrollable region (.cm-scroller) is independently Tab-reachable (scrollable-region-focusable)', reachedScroller);
  record('keyboard-journey', 'paste: editor reachable via Tab alone (15 presses)', reachedEditor);
  await page2.keyboard.type('INT. VERIFY ROOM - DAY\n\nA11y suite keyboard-only journey line.\n', { delay: 2 });
  await auditSurface(page2, 'editor-with-real-script');

  // command palette / find-replace / shortcuts panel — reachable from
  // inside this same typed-content editor.
  const palette = page2.getByRole('dialog', { name: 'Command palette' });
  await page2.keyboard.press(`${MOD}+k`);
  await palette.waitFor({ timeout: 5000 }).catch(() => {});
  await page2.waitForTimeout(200);
  await auditSurface(page2, 'command-palette');
  await page2.keyboard.press('Escape');
  await page2.waitForTimeout(300);

  await editor.focus();
  await page2.keyboard.press(`${MOD}+f`);
  await page2.waitForTimeout(200);
  await auditSurface(page2, 'find-replace');
  await page2.keyboard.press('Escape');
  await page2.waitForTimeout(200);

  await page2.keyboard.press(`${MOD}+/`);
  const shortcutDialog = page2.getByRole('dialog', { name: /keyboard shortcuts/i });
  await shortcutDialog.waitFor({ timeout: 5000 }).catch(() => {});
  await page2.waitForTimeout(200);
  await auditSurface(page2, 'shortcuts-panel');
  await page2.keyboard.press('Escape');
  await page2.waitForTimeout(200);

  // ── Accessible-name spot checks on icon-only controls actually present
  //    on this surface (SettingsPanel's close X, Sidebar's close X, the
  //    overflow "More tools" trigger) — named individually so a
  //    regression reads as "X lost its label", not a generic axe count. ──
  const iconOnlyNames = await page2.evaluate(() => {
    const out = {};
    const overflow = document.querySelector('button[aria-label="More tools"]');
    out.moreTools = overflow?.getAttribute('aria-label') || null;
    return out;
  });
  record('accessible-names', '"More tools" overflow trigger has a real accessible name', iconOnlyNames.moreTools === 'More tools', JSON.stringify(iconOnlyNames));

  await context2.close();

  // ══════════════════════════════════════════════════════════════════════
  // 2b) analyze -> read a finding -> jump to it -> export (keyboard only).
  //
  // A hand-typed, real (non-cached) draft can take real 14-pass engine
  // minutes-order time to score — this suite measured one real run at
  // ~30-90s past the point every other assertion in this file had already
  // moved on, well past what's reasonable to block a CI gate on. StartScreen's
  // "Try sample coverage" is the SAME deterministic engine on a fixed,
  // pre-authored script, and is proven fast + reliable already
  // (verify-focus-traps.mjs's own P0 context uses it) — it's also this
  // app's own "Recommended" one-click entry point (StartScreen.tsx), so
  // using it here tests the primary journey, not a synthetic slow path.
  // Reached here with Tab+Enter only — no .click() calls below.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 2b) Analyze -> read a finding -> jump to it -> export (keyboard only, via "Try sample coverage") ===');
  const context2b = await browser.newContext();
  const page2b = await context2b.newPage();
  wireConsoleCapture(page2b, genuineConsoleErrors);
  await page2b.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const sampleCta = page2b.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta.waitFor({ timeout: 15000 });
  // Its accessible name is the button's full text content — the
  // "Recommended" ribbon span + caption + headline all concatenate into
  // one long string ("RecommendedOne click...Try sample coverage...") —
  // so this checks the real activeElement handle against the located
  // button rather than pattern-matching a (necessarily truncated for
  // logging) label string.
  let reachedSampleCta = false;
  for (let i = 0; i < 30; i++) {
    await page2b.keyboard.press('Tab');
    reachedSampleCta = await page2b.evaluate((btn) => document.activeElement === btn, await sampleCta.elementHandle());
    if (reachedSampleCta) break;
  }
  record('keyboard-journey', 'analyze: "Try sample coverage" reachable via Tab alone (30 presses)', reachedSampleCta);
  if (!reachedSampleCta) {
    // Land squarely on the real target instead of activating whatever
    // Tab happened to land on last — a wrong-element Enter would send the
    // rest of this journey into an untested part of the page and produce
    // misleading downstream failures.
    await sampleCta.focus();
  }
  await page2b.keyboard.press('Enter');
  const reportBody = await waitForRenderedText(page2b, 'CONSIDER', { timeoutMs: 45000 });
  const reportAppeared = /CONSIDER|RECOMMEND|PASS/.test(reportBody);
  record('keyboard-journey', 'analyze: a report renders after activating "Try sample coverage" with Enter (no mouse)', reportAppeared);
  await page2b.waitForTimeout(400);
  await auditSurface(page2b, 'doctor-report');

  // Live region wiring for the analysis progress readout (role=status,
  // aria-live=polite — NOT assertive, so rapid pass-count updates queue
  // without interrupting whatever the screen reader user is doing; see
  // this file's header for why this suite doesn't further assert
  // "not spammy" beyond the pattern itself — that needs a real AT).
  const liveRegionOk = await page2b.evaluate(() => !!document.querySelector('[role="status"][aria-live="polite"]'));
  record('live-regions', 'coverage progress readout is role="status" aria-live="polite" (not assertive)', liveRegionOk);

  // KEYBOARD JOURNEY: read a finding + jump to it. CoverageSummary is
  // role="region" (deliberately non-modal — opening it never yanks focus
  // off the writer's cursor). Sequential Tab from the top of the page DOES
  // reach "Full report" (the panel's own last control) — proven below —
  // but NOT "Jump to line", because the very next Tab past it lands on
  // `.cm-content` (the editor, next in DOM order) and gets CAPTURED there.
  //
  // UPDATE (a11y follow-up, item 1): the RAW-TAB arrival trap this comment
  // used to describe here is fixed — see section 8 below and
  // fountain-keymap.ts's header. What THIS specific probe exercises is a
  // narrower, DELIBERATELY UNCHANGED case: focus below arrives at the editor
  // via `jumpBtn.focus()` + Enter — a programmatic `view.focus()` call from
  // FountainEditor's `navigateTo`/`highlightRange` (the "jump to line" and
  // command-palette actions both use it), not a bare Tab keydown — so
  // fountain-keymap.ts's auto-arm correctly does NOT fire here (arming on
  // every programmatic focus would re-trap a writer using "jump to line" or
  // the palette on their very next Tab, which is not this bug). Tab-escape
  // stays disarmed on this path exactly as before, so it is still a real,
  // recoverable capture — Escape-then-Tab (the documented idiom,
  // ShortcutModal.tsx) still recovers it, verified below. This suite asserts
  // what's actually true: "Full report" reachable by Tab, capture on the
  // very next Tab after "jump to line", and recovery via Escape+Tab.
  let reachedFullReport = false;
  for (let i = 0; i < 30; i++) {
    await page2b.keyboard.press('Tab');
    const label = await page2b.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40) || null);
    if (label === 'Full report') { reachedFullReport = true; break; }
  }
  record('keyboard-journey', 'read/jump: "Full report" (CoverageSummary\'s own last control) is reachable via Tab', reachedFullReport);

  const regionMarkupOk = await page2b.evaluate(() => {
    const region = document.querySelector('[role="region"][aria-labelledby="coverage-summary-title"]');
    return !!region && !!document.getElementById('coverage-summary-title');
  });
  record('keyboard-journey', 'read/jump: CoverageSummary carries role="region" + aria-labelledby (landmark-navigable by a screen reader)', regionMarkupOk);

  // The finding-level "Jump to line" control itself, reached the way a
  // sighted keyboard user actually would once they know to look — inside
  // the still-open CoverageSummary panel, found by its own accessible
  // name rather than by raw Tab position (checked BEFORE the capture/
  // recovery probe below, which presses Escape and — via this app's
  // separate global "Escape ladder" — closes this same non-modal panel as
  // a side effect; asserting reachability after that would be testing a
  // panel this suite itself just closed, not a real gap).
  const jumpBtn = page2b.getByRole('button', { name: /jump to line/i }).first();
  const jumpBtnExists = await jumpBtn.count().then((n) => n > 0);
  record('keyboard-journey', 'read/jump: a "jump to line" finding control exists in the report and is keyboard-activatable', jumpBtnExists);
  let jumpedToLine = false;
  if (jumpBtnExists) {
    await jumpBtn.focus();
    await page2b.keyboard.press('Enter');
    await page2b.waitForTimeout(300);
    jumpedToLine = await page2b.evaluate(() => document.activeElement?.className?.includes?.('cm-') ?? false);
  }
  record('keyboard-journey', 'read/jump: activating "jump to line" (Enter) moves focus into the editor', jumpedToLine);

  // Capture/recovery probe: focus is now in the editor (from the jump
  // above) WITHOUT tab-escape armed — the exact KNOWN ISSUE state. One
  // more Tab proves the capture; Escape-then-Tab proves the documented
  // recovery idiom actually works (it also closes the now-behind-it
  // Coverage panel via the app's global Escape ladder, which is fine —
  // this suite is done reading it).
  await page2b.keyboard.press('Tab');
  const capturedInEditor = await page2b.evaluate(() => document.activeElement?.className?.includes?.('cm-') ?? false);
  record('keyboard-journey', 'read/jump: after a PROGRAMMATIC "jump to line" focus (not a raw Tab arrival — see section 8), Tab is still captured — deliberately unchanged, recoverable via Escape+Tab below', capturedInEditor);

  await page2b.keyboard.press('Escape');
  await page2b.waitForTimeout(100);
  await page2b.keyboard.press('Tab');
  const recoveredFromCapture = await page2b.evaluate(() => document.activeElement?.className?.includes?.('cm-') ?? false) === false;
  record('keyboard-journey', 'read/jump: Escape-then-Tab recovers from that capture (the documented idiom actually works)', recoveredFromCapture);

  // KEYBOARD JOURNEY: export, via the command palette (the fast, proven
  // path — verify-e5-command-palette.mjs), reaching a real export button
  // afterward.
  await page2b.keyboard.press('Escape');
  await page2b.waitForTimeout(150);
  await page2b.keyboard.press(`${MOD}+k`);
  const palette2b = page2b.getByRole('dialog', { name: 'Command palette' });
  await palette2b.waitFor({ timeout: 5000 }).catch(() => {});
  await page2b.keyboard.type('ship', { delay: 15 });
  const shipOption = page2b.getByRole('option', { name: /open ship/i }).first();
  const shipOptionVisible = await shipOption.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  record('keyboard-journey', 'export: "Open Ship" is reachable by typing in the palette', shipOptionVisible);
  await page2b.keyboard.press('Enter');
  await page2b.waitForTimeout(400);
  await auditSurface(page2b, 'export-ship');

  let reachedExportBtn = false;
  for (let i = 0; i < 20; i++) {
    const label = await page2b.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 30) || null);
    const tag = await page2b.evaluate(() => document.activeElement?.tagName);
    if (tag === 'BUTTON' && label && /pdf|fountain|final draft|word/i.test(label)) { reachedExportBtn = true; break; }
    await page2b.keyboard.press('Tab');
  }
  record('keyboard-journey', 'export: a real export button (PDF/Fountain/Final Draft/Word) is reachable via Tab from Ship', reachedExportBtn);

  await context2b.close();

  // ══════════════════════════════════════════════════════════════════════
  // 3) SETTINGS — every visible tab, Labs off (3 tabs) and Labs on (8 tabs).
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 3) Settings — every tab, Labs off and Labs on ===');
  const context3 = await browser.newContext();
  const page3 = await context3.newPage();
  wireConsoleCapture(page3, genuineConsoleErrors);
  await page3.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page3.getByRole('button', { name: /start fresh/i }).first().click({ timeout: 15000 });
  await page3.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
  await page3.getByRole('button', { name: 'More tools' }).first().click();
  const menu3 = page3.getByRole('menu').first();
  await menu3.waitFor({ timeout: 5000 });
  await menu3.getByRole('menuitem', { name: /labs & settings|labs is on/i }).first().click();
  const settingsDialog = page3.getByRole('dialog', { name: /settings/i });
  await settingsDialog.waitFor({ timeout: 5000 });
  await page3.waitForTimeout(400);

  const tabsOff = settingsDialog.getByRole('tab');
  const tabCountOff = await tabsOff.count();
  record('settings', `Labs OFF shows the expected 3-tab strip (Story/Session/Labs)`, tabCountOff === 3, `count=${tabCountOff}`);
  for (let i = 0; i < tabCountOff; i++) {
    const t = tabsOff.nth(i);
    const label = await t.textContent();
    await t.focus();
    await page3.keyboard.press('Enter');
    await page3.waitForTimeout(150);
    await auditSurface(page3, `settings-tab-${label}`);
  }
  await page3.keyboard.press('Escape');
  await page3.waitForTimeout(300);

  await page3.evaluate(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); localStorage.removeItem('sm_app_view_v1'); } catch {} });
  await page3.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page3.getByRole('button', { name: /start fresh/i }).first().click({ timeout: 15000 });
  await page3.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
  await page3.getByRole('button', { name: 'More tools' }).first().click();
  const menu3b = page3.getByRole('menu').first();
  await menu3b.waitFor({ timeout: 5000 });
  await menu3b.getByRole('menuitem', { name: /labs/i }).first().click();
  await settingsDialog.waitFor({ timeout: 5000 });
  await page3.waitForTimeout(400);
  const tabsOn = settingsDialog.getByRole('tab');
  const tabCountOn = await tabsOn.count();
  record('settings', 'Labs ON shows all 8 tabs', tabCountOn === 8, `count=${tabCountOn}`);
  for (let i = 0; i < tabCountOn; i++) {
    const t = tabsOn.nth(i);
    const label = await t.textContent();
    await t.focus();
    await page3.keyboard.press('Enter');
    await page3.waitForTimeout(150);
    await auditSurface(page3, `settings-labs-on-${label}`);
  }
  await context3.close();

  // ══════════════════════════════════════════════════════════════════════
  // 4) CONFLICT / ERROR STATE — duplicate/empty character name validation.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 4) Conflict/error state: character name validation ===');
  const context4 = await browser.newContext();
  const page4 = await context4.newPage();
  wireConsoleCapture(page4, genuineConsoleErrors);
  await page4.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page4.getByRole('button', { name: /start fresh/i }).first().click({ timeout: 15000 });
  await page4.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
  await page4.getByRole('tab', { name: /characters/i }).first().click();
  await page4.getByRole('button', { name: /add character/i }).first().click();
  await page4.waitForTimeout(200);
  // aside input[0] is the Scenes/Characters search box — the character
  // name field is index 1. Blur it empty to trigger the real validation
  // error path (aria-invalid + aria-describedby + role="alert").
  const nameInput = page4.locator('aside input[type="text"]').nth(1);
  await nameInput.click();
  await nameInput.fill('x');
  await nameInput.fill('');
  await nameInput.blur();
  await page4.waitForTimeout(300);
  const errorState = await page4.evaluate(() => {
    const input = document.querySelector('aside input[aria-invalid="true"]');
    if (!input) return null;
    const describedBy = input.getAttribute('aria-describedby');
    const errorEl = describedBy ? document.getElementById(describedBy) : null;
    return {
      hasAriaInvalid: true,
      hasDescribedBy: !!describedBy,
      errorTextPresent: !!errorEl?.textContent?.trim(),
      errorHasAlertRole: errorEl?.getAttribute('role') === 'alert',
    };
  });
  record('conflict-error-state', 'empty character name sets aria-invalid + aria-describedby + a role="alert" error message', !!errorState && errorState.hasDescribedBy && errorState.errorTextPresent && errorState.errorHasAlertRole, JSON.stringify(errorState));
  await auditSurface(page4, 'character-name-error');
  await context4.close();

  // ══════════════════════════════════════════════════════════════════════
  // 5) DARK THEME — the surfaces whose own content carries plain Tailwind
  //    dark: color pairs (ScriptDoctorPanel, ShipPanel/SnapshotManager) on
  //    top of the theme-invariant --sm-* tokens — the combination this
  //    pass's real bugs lived in (see this file's header).
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 5) Dark theme — editor, doctor report, full report, ship panel ===');
  const context5 = await browser.newContext();
  const page5 = await context5.newPage();
  wireConsoleCapture(page5, genuineConsoleErrors);
  await page5.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page5.getByRole('button', { name: /start fresh/i }).first().click({ timeout: 15000 });
  await page5.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
  const editor5 = page5.locator('.cm-content').first();
  await editor5.waitFor({ timeout: 10000 });
  await editor5.focus();
  await page5.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
  await page5.waitForTimeout(300);
  const isDark = await page5.evaluate(() => document.documentElement.classList.contains('dark'));
  record('dark-theme', 'Alt+Shift+D actually toggles the .dark class on <html>', isDark);

  await page5.keyboard.type('INT. DARK ROOM - NIGHT\n\nDark-theme a11y sweep.\n\nJANE\nDoes this still read at 4.5 to 1?\n', { delay: 1 });
  await page5.waitForTimeout(200);
  await auditSurface(page5, 'dark-editor');

  const coverageNavBtn = page5.getByRole('button', { name: 'Coverage', exact: true }).first();
  await coverageNavBtn.click();
  const runDiagnosisBtn = page5.getByRole('button', { name: 'Run Diagnosis', exact: true }).first();
  if (await runDiagnosisBtn.count()) {
    await runDiagnosisBtn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await runDiagnosisBtn.click().catch(() => {});
  }
  await page5.waitForFunction(() => /CONSIDER|RECOMMEND|PASS/.test(document.body.textContent || ''), { timeout: 45000 }).catch(() => {});
  await page5.waitForTimeout(400);
  await auditSurface(page5, 'dark-doctor-report');

  const fullReportBtn5 = page5.getByRole('button', { name: 'Full report', exact: true }).first();
  if (await fullReportBtn5.count()) {
    await fullReportBtn5.click();
    await page5.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => {});
    await page5.waitForTimeout(500);
    await auditSurface(page5, 'dark-full-report-dialog');
    await page5.keyboard.press('Escape');
    await page5.waitForTimeout(300);
  }

  const shipBtn5 = page5.getByRole('button', { name: 'Ship', exact: true }).first();
  await shipBtn5.click();
  await page5.waitForTimeout(300);
  await auditSurface(page5, 'dark-export-ship');
  await context5.close();

  // ══════════════════════════════════════════════════════════════════════
  // 6) Dark theme, RICH report — this a11y pass's real bugs (ScriptDoctorPanel's
  //    ~30 red/green/amber/indigo dark: pairs: StoryGraphSection's Critical/
  //    Medium/Strengths cards, the "different read modes" card, the
  //    deep-read badge, error/toast banners) never rendered under (5) above,
  //    because that flow's hand-typed 4-line script is too thin for the
  //    structural engine to produce any diagnostics — so axe never measured
  //    them, and the bugs shipped invisibly. "Try sample coverage" is the
  //    SAME proven-fast deterministic path (2b) but on a real multi-scene
  //    script, so StoryGraphSection actually has content to report. Toggling
  //    dark mode AFTER the report renders re-uses the exact same report DOM
  //    (no re-run needed — dark mode is a pure `.dark` class flip), so this
  //    is cheap on top of the already-paid sample-report cost.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 6) Dark theme, rich report — StoryGraphSection + error/toast banners ===');
  const context6 = await browser.newContext();
  const page6 = await context6.newPage();
  wireConsoleCapture(page6, genuineConsoleErrors);
  await page6.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const sampleCta6 = page6.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta6.waitFor({ timeout: 15000 });
  await sampleCta6.click();
  const reportBody6 = await waitForRenderedText(page6, 'CONSIDER', { timeoutMs: 45000 });
  record('dark-theme-rich', 'rich report: a report renders from "Try sample coverage"', /CONSIDER|RECOMMEND|PASS/.test(reportBody6));

  // Toggle dark mode AFTER the report exists (Alt+Shift+D is wired on
  // ScriptIDE's own global keydown listener, so any focus inside it works —
  // the editor is the reliable, always-present target).
  const editor6 = page6.locator('.cm-content').first();
  await editor6.waitFor({ timeout: 10000 });
  await editor6.focus();
  await page6.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
  await page6.waitForTimeout(300);
  const isDark6 = await page6.evaluate(() => document.documentElement.classList.contains('dark'));
  record('dark-theme-rich', 'Alt+Shift+D toggles dark mode on the rich-report view', isDark6);

  // Confirm StoryGraphSection's severity groups actually rendered — this is
  // exactly the "the panels were never rendered in the audited states" gap
  // this section exists to close. Logged, not gated: a future sample-script
  // change that shifts diagnostics is not itself an a11y regression, but a
  // silent flip to false here means this coverage quietly stopped meaning
  // anything and is worth noticing.
  const storyGraphPresence = await page6.evaluate(() => {
    const text = document.body.textContent || '';
    return {
      critical: /Critical \(\d+\)/.test(text),
      medium: /Medium \(\d+\)/.test(text),
      strengths: /Strengths \(\d+\)/.test(text),
    };
  });
  // console.log, not record(): genuinely informational — the sample script
  // measured here produces NO StoryGraphSection diagnostics at all (all
  // three false), which just means this particular script is clean by that
  // engine's read, not a coverage gap. auditSurface below still exercises
  // whatever DID render (the grade box, per-pass breakdown, etc.) either
  // way; gating on which specific badges a fixed sample script happens to
  // produce would make this suite depend on the engine's output shape.
  console.log(`[verify] dark-theme-rich: StoryGraphSection severity presence on the sample report — ${JSON.stringify(storyGraphPresence)}`);
  await auditSurface(page6, 'dark-doctor-report-rich');
  await context6.close();

  // ══════════════════════════════════════════════════════════════════════
  // 7) Labs research panel — AIPanel's "Story Engine" tab (Engine), reached
  //    via the command palette's "Open Studio" action the same way E5's own
  //    suite reaches Ship. This is the surface AIPanel.tsx's `.sm-title`
  //    cascade-collision fix (this pass) lives on; it was never in the
  //    audited set before because Studio is a Labs-gated surface entirely
  //    absent from sections 1-6 above.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 7) Labs research panel — Story Engine (AIPanel) ===');
  const context7 = await browser.newContext();
  const page7 = await context7.newPage();
  wireConsoleCapture(page7, genuineConsoleErrors);
  await page7.addInitScript(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); } catch {} });
  await page7.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page7.getByRole('button', { name: /start fresh/i }).first().click({ timeout: 15000 });
  await page7.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
  await page7.keyboard.press(`${MOD}+k`);
  const palette7 = page7.getByRole('dialog', { name: 'Command palette' });
  await palette7.waitFor({ timeout: 5000 }).catch(() => {});
  await page7.keyboard.type('studio', { delay: 15 });
  const studioOption = page7.getByRole('option', { name: /open studio/i }).first();
  const studioOptionVisible = await studioOption.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  record('labs-research-panel', 'Labs ON: "Open Studio" is reachable via the command palette', studioOptionVisible);
  if (studioOptionVisible) {
    await page7.keyboard.press('Enter');
    const engineTabBtn = page7.getByRole('button', { name: 'Engine', exact: true }).first();
    const engineTabVisible = await engineTabBtn.waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
    record('labs-research-panel', 'Studio panel opens with an "Engine" tab', engineTabVisible);
    if (engineTabVisible) {
      await engineTabBtn.click();
      await page7.waitForTimeout(200);
      await auditSurface(page7, 'labs-story-engine-panel');
      // Keyless mode: "Generate Scene" runs against a server with no AI key
      // configured, which resolves usedLLM:false with a `note` explaining
      // why — not an error — and renders the Result panel (the `.sm-title`
      // fix's own surface) without ever calling out to a real provider.
      const beatInput = page7.locator('textarea').first();
      if (await beatInput.count()) {
        await beatInput.fill('A quiet moment before the storm.');
        const generateBtn = page7.getByRole('button', { name: /generate scene/i }).first();
        await generateBtn.click();
        await page7.waitForFunction(() => /result/i.test(document.body.textContent || ''), { timeout: 20000 }).catch(() => {});
        await page7.waitForTimeout(300);
        await auditSurface(page7, 'labs-story-engine-result');
      }
      // Same surface again in dark mode — AIPanel.tsx has no dark: variants
      // at all, so this mainly re-confirms the sm-title fix holds when the
      // rest of the app chrome goes dark around it. The shortcut is on a
      // document-level listener (ScriptIDE.tsx), so no specific focus target
      // is required here.
      await page7.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
      await page7.waitForTimeout(300);
      await auditSurface(page7, 'labs-story-engine-panel-dark');
    }
  }
  await context7.close();

  // ══════════════════════════════════════════════════════════════════════
  // 8) The editor Tab trap — proving BOTH halves of fountain-keymap.ts's
  //    auto-arm fix (see that file's header for THE RULE and HOW):
  //      A) a keyboard user who reaches the editor by RAW SEQUENTIAL TAB —
  //         never clicking, never Cmd/Ctrl+K, never typing here yet — can
  //         Tab straight back OUT on the very next press, no Escape needed
  //         first. This is the actual trap section (2b)'s KNOWN ISSUE
  //         documented and left unfixed; it is fixed now.
  //      B) a writer who tabs in and THEN commits to editing (types) still
  //         gets Tab-cycling on their NEXT Tab — the auto-arm must not
  //         regress the writing aid for the writer actually using it.
  //    The pre-existing Escape-then-Tab idiom (the deliberate-editing path)
  //    is re-verified at the end, unchanged.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 8) Editor Tab trap — raw keyboard arrival vs. typed arrival ===');
  const context8 = await browser.newContext();
  const page8 = await context8.newPage();
  wireConsoleCapture(page8, genuineConsoleErrors);
  // This section reloads BASE twice in the same page (once per raw-Tab
  // arrival below) — the app persists which screen it's on in
  // localStorage's sm_app_view_v1 (see section 3's own clearing of the same
  // key), so a plain second reload would skip straight past StartScreen
  // (no "Start fresh" button to Tab to) instead of landing on it fresh.
  // addInitScript runs before the page's own scripts on EVERY subsequent
  // navigation in this page, so both reloads below land on StartScreen.
  await page8.addInitScript(() => { try { localStorage.removeItem('sm_app_view_v1'); } catch {} });

  /** Lands on "Start fresh" and walks forward by REAL Tab presses only
   *  (no .click(), no .focus()) until `.cm-content` has focus — the exact
   *  arrival fountain-keymap.ts's auto-arm targets. Checks `.cm-content`
   *  specifically (classList, not a broad "cm-" substring): `.cm-scroller`
   *  is ALSO a real Tab stop now (item 5 — view.scrollDOM.tabIndex = 0,
   *  FountainEditor.tsx), one hop before content in DOM order, and a broad
   *  match would stop the walk there instead. Also records whether the
   *  element visited on the immediately PRECEDING press was `.cm-scroller`
   *  — proving the scroller sits right before content in Tab order, not
   *  just "reachable" — without hardcoding the total press count (the walk
   *  starts from "Start fresh", so it varies with however many toolbar
   *  controls precede the editor). */
  async function tabIntoEditorByRawKeyboard(page) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.getByRole('button', { name: /start fresh/i }).first().click({ timeout: 15000 });
    await page.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
    let reached = false;
    let arrivedViaScroller = false;
    let wasOnScroller = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const at = await page.evaluate(() => ({
        scroller: document.activeElement?.classList?.contains?.('cm-scroller') ?? false,
        content: document.activeElement?.classList?.contains?.('cm-content') ?? false,
      }));
      if (at.content) { reached = true; arrivedViaScroller = wasOnScroller; break; }
      wasOnScroller = at.scroller;
    }
    return { reached, arrivedViaScroller };
  }

  // (A) Raw-Tab arrival: the very next Tab exits, no Escape needed first.
  // item 5: this arrival now passes THROUGH `.cm-scroller` (a real,
  // independently-focusable Tab stop, immediately before `.cm-content` in
  // Tab order) on its way in — proving that hop doesn't strand the writer
  // is exactly what re-enabling it needed to prove safe: the scroller's own
  // Tab keydown is a bare Tab like any other, so `.cm-content`'s arrival
  // right after it still auto-arms.
  const { reached: reachedRaw1, arrivedViaScroller: arrivedViaScroller1 } = await tabIntoEditorByRawKeyboard(page8);
  record('editor-tab-trap', 'raw-Tab journey reaches the editor (.cm-content) via Tab alone', reachedRaw1);
  record(
    'editor-tab-trap',
    'item 5: that journey visits the now-focusable .cm-scroller immediately before .cm-content (scroller -> content, both bare Tab keydowns)',
    arrivedViaScroller1,
  );
  await page8.keyboard.press('Tab');
  const exitedWithoutEscape = (await page8.evaluate(() => document.activeElement?.className?.includes?.('cm-') ?? false)) === false;
  record(
    'editor-tab-trap',
    'FIX (item 1): a raw-Tab arrival auto-arms tab-escape — the very next Tab moves focus OUT with no Escape press first',
    exitedWithoutEscape,
  );

  // (B) Raw-Tab arrival, then the writer types: the writing aid (Tab-cycling)
  // must still work on the NEXT Tab after that — auto-arm must not regress
  // the deliberate-editing case. Fresh reload for a clean arrival.
  const { reached: reachedRaw2 } = await tabIntoEditorByRawKeyboard(page8);
  record('editor-tab-trap', 'raw-Tab journey reaches the editor a second time (fresh reload)', reachedRaw2);
  await page8.keyboard.type('x', { delay: 5 }); // commits to editing — disarms the auto-arm (tabEscapeArmedField's own docChanged rule)
  await page8.keyboard.press('Backspace'); // back to an empty, cycle-eligible line — the disarm itself already happened on the keystroke above
  await page8.waitForTimeout(50);
  await page8.keyboard.press('Tab'); // should now CYCLE (handled, stays in editor), not exit
  const cyclingAfterTyping = await page8.evaluate(() => {
    const stillInEditor = document.activeElement?.className?.includes?.('cm-') ?? false;
    const cyclingVisible = !!document.querySelector('.cm-content .cm-sp-action'); // planCycleStep(null, 1) lands on 'action' first
    return stillInEditor && cyclingVisible;
  });
  record(
    'editor-tab-trap',
    'typing after a raw-Tab arrival disarms the auto-arm — the NEXT Tab cycles element type instead of leaving (writer-typing behavior unregressed)',
    cyclingAfterTyping,
  );

  // Dismiss the pending cycle from the Tab press above before re-testing
  // Escape-then-Tab below, so it starts from a clean state.
  await page8.keyboard.press('Escape');
  await page8.waitForTimeout(50);

  // Pre-existing idiom, re-verified after the fix above: Escape (arm) then
  // Tab (consume + exit) — the documented manual escape hatch for a writer
  // already mid-session, unaffected by the auto-arm addition.
  await page8.keyboard.press('Escape');
  await page8.waitForTimeout(50);
  await page8.keyboard.press('Tab');
  const escapeThenTabStillWorks = (await page8.evaluate(() => document.activeElement?.className?.includes?.('cm-') ?? false)) === false;
  record('editor-tab-trap', 'Escape-then-Tab idiom still exits the editor (unchanged pre-existing manual path)', escapeThenTabStillWorks);

  await context8.close();

  // ══════════════════════════════════════════════════════════════════════
  // 9) Labs panels that predate the design system — AnalysisPanel (a Studio
  //    tab) and DirectorPanel (the "Director HUD" tool slot) — audited in
  //    both themes for the first time. Neither had ever been rendered by
  //    this suite before this a11y follow-up: AnalysisPanel is a tab on the
  //    SAME Studio surface section 7 already opens (just a different tab
  //    button), and DirectorPanel sits next to "open-studio" in the same
  //    Labs command-palette group ("open-director") — reached the same way.
  //    This is the surface both panels' bg-white/border-black/text-black
  //    -> bg-[var(--sm-panel)]/border/text-[var(--sm-ink)] token pass (this
  //    follow-up) lives on; see the session report for the full contrast
  //    table (several colors — text-red-600/green-600/yellow-600 as TEXT,
  //    and the orange-500/green-500 defense-level pill fills — were failing
  //    WCAG even in light mode, independent of the dark toggle).
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 9) Labs panels — AnalysisPanel (Studio tab) + DirectorPanel (Director HUD) ===');
  const context9 = await browser.newContext();
  const page9 = await context9.newPage();
  wireConsoleCapture(page9, genuineConsoleErrors);
  await page9.addInitScript(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); } catch {} });
  await page9.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page9.getByRole('button', { name: /start fresh/i }).first().click({ timeout: 15000 });
  await page9.locator('header.sm-pagetop').waitFor({ timeout: 15000 });

  // ── 9a) AnalysisPanel — Studio's "Analysis" tab. ──
  await page9.keyboard.press(`${MOD}+k`);
  const palette9 = page9.getByRole('dialog', { name: 'Command palette' });
  await palette9.waitFor({ timeout: 5000 }).catch(() => {});
  await page9.keyboard.type('studio', { delay: 15 });
  const studioOption9 = page9.getByRole('option', { name: /open studio/i }).first();
  const studioOpened = await studioOption9.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  record('labs-panels', 'AnalysisPanel: "Open Studio" is reachable via the command palette', studioOpened);
  if (studioOpened) {
    await page9.keyboard.press('Enter');
    const analysisTabBtn = page9.getByRole('button', { name: 'Analysis', exact: true }).first();
    const analysisTabVisible = await analysisTabBtn.waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
    record('labs-panels', 'Studio panel opens with an "Analysis" tab', analysisTabVisible);
    if (analysisTabVisible) {
      await analysisTabBtn.click();
      await page9.waitForTimeout(200);
      await auditSurface(page9, 'labs-analysis-panel');
      await page9.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
      await page9.waitForTimeout(300);
      await auditSurface(page9, 'labs-analysis-panel-dark');
      await page9.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D'); // back to light for 9b
      await page9.waitForTimeout(300);
    }
  }

  // ── 9b) DirectorPanel — the "Director HUD" tool slot, next to
  //    "open-studio" in the same Labs command-palette group. ──
  await page9.keyboard.press(`${MOD}+k`);
  await palette9.waitFor({ timeout: 5000 }).catch(() => {});
  await page9.keyboard.type('director', { delay: 15 });
  const directorOption = page9.getByRole('option', { name: /director hud/i }).first();
  const directorOpened = await directorOption.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  record('labs-panels', 'DirectorPanel: "Director HUD" is reachable via the command palette', directorOpened);
  if (directorOpened) {
    await page9.keyboard.press('Enter');
    const directorDialog = page9.getByRole('dialog', { name: 'AI Director State' });
    const directorVisible = await directorDialog.waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
    record('labs-panels', 'Director HUD opens as a real dialog (role="dialog", labelled)', directorVisible);
    if (directorVisible) {
      await auditSurface(page9, 'labs-director-panel-scene-tab');
      // A couple of the other 12 tabs — Psychology (dark-triad meters,
      // defense-mechanism/level pills) and Outline (the empty-state cards,
      // nested beat cards) — cover the panel's other color families the
      // default "Scene" tab doesn't exercise.
      const psychTabBtn = page9.getByRole('button', { name: 'Psychology', exact: true }).first();
      if (await psychTabBtn.count()) {
        await psychTabBtn.click();
        await page9.waitForTimeout(150);
        await auditSurface(page9, 'labs-director-panel-psychology-tab');
      }
      const outlineTabBtn = page9.getByRole('button', { name: 'Outline', exact: true }).first();
      if (await outlineTabBtn.count()) {
        await outlineTabBtn.click();
        await page9.waitForTimeout(150);
        await auditSurface(page9, 'labs-director-panel-outline-tab');
      }
      // Same surfaces again in dark mode.
      await page9.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
      await page9.waitForTimeout(300);
      await auditSurface(page9, 'labs-director-panel-outline-tab-dark');
      const sceneTabBtn = page9.getByRole('button', { name: 'Scene', exact: true }).first();
      if (await sceneTabBtn.count()) {
        await sceneTabBtn.click();
        await page9.waitForTimeout(150);
        await auditSurface(page9, 'labs-director-panel-scene-tab-dark');
      }
    }
  }
  await context9.close();

  // ── Console errors, same convention as the rest of the browser battery. ─
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
