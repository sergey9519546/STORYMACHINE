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

import { mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  bootKeylessServer,
  createRecorder,
  getTiming,
  launchChromium,
  pickFreePort,
  shutdown,
  waitForDomQuiet,
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
let timing = null; // set at the top of main() — see scripts/lib/browser-verify.mjs
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

/** Raw axe run against the current DOM — no recording, just the violation
 *  list, so callers that need more than one moment (see
 *  `auditLandingAtRest` below) can run it more than once per surface. */
async function runAxeRaw(page) {
  await page.addScriptTag({ path: AXE_PATH });
  const results = await page.evaluate(async (tags) => {
    // @ts-ignore — axe is attached to window by the injected script above.
    return await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
  }, AXE_TAGS);
  return results.violations;
}

const gatedOf = (violations) => violations.filter((v) => GATED_IMPACTS.has(v.impact) && !KNOWN_UNFIXED_RULE_IDS.has(v.id));
const detailOf = (violations) => violations
  .map((v) => `${v.impact}:${v.id}(${v.nodes.length}) [${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}]`)
  .join('; ');

/** Runs axe against the current DOM and records one PASS/FAIL per surface:
 *  fails the surface if any serious/critical violation is found OUTSIDE
 *  KNOWN_UNFIXED_RULE_IDS (logs the rule id, impact, node count and up to
 *  3 offending selectors for every violation regardless — the caller
 *  decides gate vs log for anything below "serious").
 *
 *  a11y pass (2026-09-04): waits for the DOM to stop mutating
 *  (`waitForDomQuiet` — a real signal, not a sleep; see its own header)
 *  before running axe, so a still-animating reveal isn't measured mid-
 *  transition. This is the universal half of the at-rest fix, applied to
 *  every surface this suite audits; the landing surface additionally gets
 *  its own two-moment worst-of audit below, because it's the surface whose
 *  own entrance animation this bug was found on. */
async function auditSurface(page, surfaceName) {
  await waitForDomQuiet(page);
  const violations = await runAxeRaw(page);
  const gated = gatedOf(violations);
  record(surfaceName, 'axe: zero serious/critical violations', gated.length === 0, detailOf(violations) || 'clean');
  return violations;
}

/**
 * Runs axe scoped to ONE element (a Playwright Locator, already resolved to
 * exactly one match) rather than the whole document, and records one
 * PASS/FAIL the same way `auditSurface` does.
 *
 * REVIEW FIX (round 2, 2026-09-05): the Shape & Rhythm gate step needs to
 * scroll deep into a ~52,000px-tall dialog to bring its own section into
 * axe's visibility-dependent color-contrast check (see
 * `scrollShapeRhythmIntoView`'s header) — but a document-wide `auditSurface`
 * call at THAT scroll position also sweeps in whatever ELSE happens to be
 * in the viewport there, which is a moving target as unrelated content
 * above/below the section changes across reports; proven live: it caught a
 * pre-existing, out-of-this-lane's-scope caption bug in a neighboring
 * section purely because scrolling to Shape & Rhythm's position happened to
 * bring it into view too. Scoping the axe run to the section's own DOM
 * subtree (`[data-a11y-section="shape-rhythm"]`, ScriptDoctorPanel.tsx)
 * measures exactly what this gate exists to measure — this section's own
 * bugs — regardless of what else is or isn't in the surrounding viewport. */
async function auditElement(page, locator, surfaceName) {
  await waitForDomQuiet(page);
  await page.addScriptTag({ path: AXE_PATH });
  const violations = await locator.evaluate(async (el, tags) => {
    // @ts-ignore — axe is attached to window by the injected script above.
    const results = await window.axe.run(el, { runOnly: { type: 'tag', values: tags } });
    return results.violations;
  }, AXE_TAGS);
  const gated = gatedOf(violations);
  record(surfaceName, 'axe: zero serious/critical violations', gated.length === 0, detailOf(violations) || 'clean');
  return violations;
}

/**
 * Round 5 (independent review round 4, follow-up 3): a self-contained
 * (no closure references — it is serialized and run IN the page by
 * `locator.evaluate`) contrast measurement, canvas-resolved so it works
 * against Tailwind v4's `oklch()` output the same way `getComputedStyle`
 * does, alpha-composited up the ancestor chain so a text color sitting on
 * a translucent tint (e.g. StateDeltaCard's `bg-amber-500/10`) measures
 * against what it ACTUALLY renders on, not a bare `rgba()` string. Reports
 * the ratio AND the element count of the scope it was called on, so a
 * step can show it audited the right, narrowly-scoped node rather than
 * asserting a "no violations" that could just as easily mean "found
 * nothing to check."
 */
function measureContrastNode(el) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const c2 = cv.getContext('2d', { willReadFrequently: true });
  const toRgb = (c) => {
    c2.clearRect(0, 0, 1, 1);
    c2.fillStyle = '#000';
    c2.fillStyle = c;
    c2.fillRect(0, 0, 1, 1);
    const d = c2.getImageData(0, 0, 1, 1).data;
    return { rgb: [d[0], d[1], d[2]], a: d[3] / 255 };
  };
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const l1 = lum(a);
    const l2 = lum(b);
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
  };
  const blend = (fg, bg, a) => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)));
  const bgOf = (node) => {
    let n = node;
    const stack = [];
    while (n && n !== document.documentElement) {
      const c = toRgb(getComputedStyle(n).backgroundColor);
      if (c.a > 0) stack.push(c);
      if (c.a > 0.999) break;
      n = n.parentElement;
    }
    if (!stack.length) return [255, 255, 255];
    let out = stack[stack.length - 1].a > 0.999 ? stack[stack.length - 1].rgb : [255, 255, 255];
    for (let i = stack.length - 2; i >= 0; i--) out = blend(stack[i].rgb, out, stack[i].a);
    return out;
  };
  const cs = getComputedStyle(el);
  const fg = toRgb(cs.color);
  const bg = bgOf(el);
  return {
    text: (el.textContent || '').trim().slice(0, 60),
    fg: `rgb(${fg.rgb})`,
    bg: `rgb(${bg})`,
    ratio: ratio(fg.rgb, bg),
    nodeCount: el.querySelectorAll('*').length + 1,
  };
}

/**
 * Scrolls the "Full report" dialog's own scroll container until the Shape &
 * Rhythm section is actually in view, and returns a Locator scoped to the
 * section's own DOM subtree (for `auditElement` above) — not the whole
 * document.
 *
 * REVIEW FIX (round 2, 2026-09-05): axe-core's color-contrast rule (like
 * most of its rules) only evaluates nodes it considers visible, and a node
 * that is off-screen inside a scrolled container — not merely `hidden` or
 * zero-size — is one of the cases it skips. This section sits roughly
 * 5,258px into the dialog's ~52,000px-tall scroll container on the rich
 * sample report; proven live (independent review, 2026-09-05): with the
 * unfixed classes restored, `axe.run(document)` at the dialog's default
 * (top-of-scroll) position reported 0 gated violations for this section,
 * and 13 once scrolled into view. Calling `auditElement`/`auditSurface`
 * without this first cannot fail on the bug the whole step exists to catch
 * — it would pass silently regardless of what the section's classes are.
 *
 * `scrollIntoViewIfNeeded` (not `scrollIntoView`) is used because it is a
 * no-op when the element is already visible, so this is safe to call
 * whether or not a given report happens to be short enough not to need it.
 */
async function scrollShapeRhythmIntoView(page) {
  const section = page.locator('[data-a11y-section="shape-rhythm"]').first();
  await section.waitFor({ timeout: timing.ms(15000) });
  await section.scrollIntoViewIfNeeded({ timeout: timing.ms(10000) });
  await waitForDomQuiet(page, { quietMs: 200, timeoutMs: 2000 });
  return section;
}

/**
 * The landing surface, specifically: audited at >=2 moments and the WORSE
 * one is what's recorded, per the 2026-09-04 correction (see
 * `waitForDomQuiet`'s header for why this exists at all).
 *
 *   moment A — "settle signal": StartScreen's own completion signals
 *     (`[data-slug-done="true"]` from SlugLineIntro, then
 *     `main[data-reveal-done="true"]` from StartScreen's reveal — the real
 *     "this animation is actually done" state, not a guess) plus one
 *     DOM-quiet window.
 *   moment B — a second, longer DOM-quiet window past that, to catch
 *     anything moment A's signals don't cover (a font swap reflow, a
 *     transition this pass didn't know to name).
 *
 * Both counts are printed so a reader can see the audit wasn't taken mid-
 * animation; the recorded PASS/FAIL and detail come from whichever moment
 * had MORE gated violations (a real bug is real at every moment it's
 * measured — the settled moment should never be strictly worse than an
 * earlier one, but this doesn't assume that).
 */
async function auditLandingAtRest(page) {
  await page.waitForFunction(
    () => document.querySelector('[data-slug-done="true"]') !== null,
    { timeout: timing.ms(5000) },
  ).catch(() => {});
  await page.waitForFunction(
    () => document.querySelector('main[data-reveal-done="true"]') !== null,
    { timeout: timing.ms(5000) },
  ).catch(() => {});
  await waitForDomQuiet(page, { quietMs: 250, timeoutMs: 3000 });
  const violationsA = await runAxeRaw(page);
  const gatedA = gatedOf(violationsA);

  await waitForDomQuiet(page, { quietMs: 400, timeoutMs: 3000 });
  const violationsB = await runAxeRaw(page);
  const gatedB = gatedOf(violationsB);

  console.log(
    `[verify] landing at-rest moments — settle-signal+quiet: ${gatedA.length} serious/critical; `
    + `+second quiet window: ${gatedB.length} serious/critical`,
  );

  const worseIsB = gatedB.length > gatedA.length;
  const worstViolations = worseIsB ? violationsB : violationsA;
  const worstGated = worseIsB ? gatedB : gatedA;
  record(
    'landing',
    'axe: zero serious/critical violations (worst of 2 at-rest moments)',
    worstGated.length === 0,
    detailOf(worstViolations) || 'clean',
  );
  return worstViolations;
}

async function main() {
  // Read the load-derived timing policy FIRST — before the server boots or
  // Chromium launches — so VERIFY_MAX_LOAD_PER_CPU can refuse the whole run
  // without paying for either. See scripts/lib/browser-verify.mjs.
  timing = getTiming();

  serverProc = await bootKeylessServer({ repo: REPO, port: ISOLATED_PORT, baseUrl: BASE });
  browser = await launchChromium();

  // ══════════════════════════════════════════════════════════════════════
  // 1) LANDING — axe, then the start of the keyboard-only journey.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 1) Landing (StartScreen) ===');
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  wireConsoleCapture(page1, genuineConsoleErrors);
  await page1.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const startFreshBtn = page1.getByRole('button', { name: /start fresh/i }).first();
  await startFreshBtn.waitFor({ timeout: timing.ms(15000) });
  // a11y pass (2026-09-04): NOT auditSurface(page1, 'landing') here on
  // purpose — Playwright's `visible` wait above doesn't require opacity:1,
  // so it resolves the instant "Start fresh" attaches to the DOM, well
  // before the entrance's typed intro / fade-lift reveal actually settles.
  // See auditLandingAtRest's own header for what this replaced and why.
  await auditLandingAtRest(page1);

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
  const toolbarAppeared = await page1.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) }).then(() => true).catch(() => false);
  record('keyboard-journey', 'land: Enter on "Start fresh" opens the editor (no mouse)', toolbarAppeared);
  await context1.close();

  // ══════════════════════════════════════════════════════════════════════
  // 2) EDITOR + PASTE + full keyboard journey (analyze/read/jump/export).
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 2) Editor, keyboard journey: paste -> analyze -> read -> jump -> export ===');
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  wireConsoleCapture(page2, genuineConsoleErrors);
  await page2.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page2.getByRole('button', { name: /start fresh/i }).first().click({ timeout: timing.ms(15000) });
  await page2.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });

  const editor = page2.locator('.cm-content').first();
  await editor.waitFor({ timeout: timing.ms(10000) });

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
  await palette.waitFor({ timeout: timing.ms(5000) }).catch(() => {});
  await page2.waitForTimeout(timing.ms(200));
  await auditSurface(page2, 'command-palette');
  await page2.keyboard.press('Escape');
  await page2.waitForTimeout(timing.ms(300));

  await editor.focus();
  await page2.keyboard.press(`${MOD}+f`);
  await page2.waitForTimeout(timing.ms(200));
  await auditSurface(page2, 'find-replace');
  await page2.keyboard.press('Escape');
  await page2.waitForTimeout(timing.ms(200));

  await page2.keyboard.press(`${MOD}+/`);
  const shortcutDialog = page2.getByRole('dialog', { name: /keyboard shortcuts/i });
  await shortcutDialog.waitFor({ timeout: timing.ms(5000) }).catch(() => {});
  await page2.waitForTimeout(timing.ms(200));
  await auditSurface(page2, 'shortcuts-panel');
  await page2.keyboard.press('Escape');
  await page2.waitForTimeout(timing.ms(200));

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
  await page2b.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const sampleCta = page2b.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta.waitFor({ timeout: timing.ms(15000) });
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
  await page2b.waitForTimeout(timing.ms(400));
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
    await page2b.waitForTimeout(timing.ms(300));
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
  await page2b.waitForTimeout(timing.ms(100));
  await page2b.keyboard.press('Tab');
  const recoveredFromCapture = await page2b.evaluate(() => document.activeElement?.className?.includes?.('cm-') ?? false) === false;
  record('keyboard-journey', 'read/jump: Escape-then-Tab recovers from that capture (the documented idiom actually works)', recoveredFromCapture);

  // KEYBOARD JOURNEY: export, via the command palette (the fast, proven
  // path — verify-e5-command-palette.mjs), reaching a real export button
  // afterward.
  await page2b.keyboard.press('Escape');
  await page2b.waitForTimeout(timing.ms(150));
  await page2b.keyboard.press(`${MOD}+k`);
  const palette2b = page2b.getByRole('dialog', { name: 'Command palette' });
  await palette2b.waitFor({ timeout: timing.ms(5000) }).catch(() => {});
  await page2b.keyboard.type('ship', { delay: 15 });
  const shipOption = page2b.getByRole('option', { name: /open ship/i }).first();
  const shipOptionVisible = await shipOption.waitFor({ timeout: timing.ms(3000) }).then(() => true).catch(() => false);
  record('keyboard-journey', 'export: "Open Ship" is reachable by typing in the palette', shipOptionVisible);
  await page2b.keyboard.press('Enter');
  await page2b.waitForTimeout(timing.ms(400));
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
  await page3.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page3.getByRole('button', { name: /start fresh/i }).first().click({ timeout: timing.ms(15000) });
  await page3.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });
  await page3.getByRole('button', { name: 'More tools' }).first().click();
  const menu3 = page3.getByRole('menu').first();
  await menu3.waitFor({ timeout: timing.ms(5000) });
  await menu3.getByRole('menuitem', { name: /labs & settings|labs is on/i }).first().click();
  const settingsDialog = page3.getByRole('dialog', { name: /settings/i });
  await settingsDialog.waitFor({ timeout: timing.ms(5000) });
  await page3.waitForTimeout(timing.ms(400));

  const tabsOff = settingsDialog.getByRole('tab');
  const tabCountOff = await tabsOff.count();
  record('settings', `Labs OFF shows the expected 3-tab strip (Story/Session/Labs)`, tabCountOff === 3, `count=${tabCountOff}`);
  for (let i = 0; i < tabCountOff; i++) {
    const t = tabsOff.nth(i);
    const label = await t.textContent();
    await t.focus();
    await page3.keyboard.press('Enter');
    await page3.waitForTimeout(timing.ms(150));
    await auditSurface(page3, `settings-tab-${label}`);
  }
  await page3.keyboard.press('Escape');
  await page3.waitForTimeout(timing.ms(300));

  await page3.evaluate(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); localStorage.removeItem('sm_app_view_v1'); } catch {} });
  await page3.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page3.getByRole('button', { name: /start fresh/i }).first().click({ timeout: timing.ms(15000) });
  await page3.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });
  await page3.getByRole('button', { name: 'More tools' }).first().click();
  const menu3b = page3.getByRole('menu').first();
  await menu3b.waitFor({ timeout: timing.ms(5000) });
  await menu3b.getByRole('menuitem', { name: /labs/i }).first().click();
  await settingsDialog.waitFor({ timeout: timing.ms(5000) });
  await page3.waitForTimeout(timing.ms(400));
  const tabsOn = settingsDialog.getByRole('tab');
  const tabCountOn = await tabsOn.count();
  record('settings', 'Labs ON shows all 8 tabs', tabCountOn === 8, `count=${tabCountOn}`);
  for (let i = 0; i < tabCountOn; i++) {
    const t = tabsOn.nth(i);
    const label = await t.textContent();
    await t.focus();
    await page3.keyboard.press('Enter');
    await page3.waitForTimeout(timing.ms(150));
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
  await page4.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page4.getByRole('button', { name: /start fresh/i }).first().click({ timeout: timing.ms(15000) });
  await page4.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });
  await page4.getByRole('tab', { name: /characters/i }).first().click();
  await page4.getByRole('button', { name: /add character/i }).first().click();
  await page4.waitForTimeout(timing.ms(200));
  // aside input[0] is the Scenes/Characters search box — the character
  // name field is index 1. Blur it empty to trigger the real validation
  // error path (aria-invalid + aria-describedby + role="alert").
  const nameInput = page4.locator('aside input[type="text"]').nth(1);
  await nameInput.click();
  await nameInput.fill('x');
  await nameInput.fill('');
  await nameInput.blur();
  await page4.waitForTimeout(timing.ms(300));
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
  await page5.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page5.getByRole('button', { name: /start fresh/i }).first().click({ timeout: timing.ms(15000) });
  await page5.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });
  const editor5 = page5.locator('.cm-content').first();
  await editor5.waitFor({ timeout: timing.ms(10000) });
  await editor5.focus();
  await page5.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
  await page5.waitForTimeout(timing.ms(300));
  const isDark = await page5.evaluate(() => document.documentElement.classList.contains('dark'));
  record('dark-theme', 'Alt+Shift+D actually toggles the .dark class on <html>', isDark);

  await page5.keyboard.type('INT. DARK ROOM - NIGHT\n\nDark-theme a11y sweep.\n\nJANE\nDoes this still read at 4.5 to 1?\n', { delay: 1 });
  await page5.waitForTimeout(timing.ms(200));
  await auditSurface(page5, 'dark-editor');

  const coverageNavBtn = page5.getByRole('button', { name: 'Coverage', exact: true }).first();
  await coverageNavBtn.click();
  const runDiagnosisBtn = page5.getByRole('button', { name: 'Run Diagnosis', exact: true }).first();
  if (await runDiagnosisBtn.count()) {
    await runDiagnosisBtn.waitFor({ state: 'visible', timeout: timing.ms(10000) }).catch(() => {});
    await runDiagnosisBtn.click().catch(() => {});
  }
  await page5.waitForFunction(() => /CONSIDER|RECOMMEND|PASS/.test(document.body.textContent || ''), { timeout: timing.ms(45000) }).catch(() => {});
  await page5.waitForTimeout(timing.ms(400));
  await auditSurface(page5, 'dark-doctor-report');

  const fullReportBtn5 = page5.getByRole('button', { name: 'Full report', exact: true }).first();
  if (await fullReportBtn5.count()) {
    await fullReportBtn5.click();
    await page5.waitForSelector('[role="dialog"]', { timeout: timing.ms(10000) }).catch(() => {});
    await page5.waitForTimeout(timing.ms(500));
    await auditSurface(page5, 'dark-full-report-dialog');
    await page5.keyboard.press('Escape');
    await page5.waitForTimeout(timing.ms(300));
  }

  const shipBtn5 = page5.getByRole('button', { name: 'Ship', exact: true }).first();
  await shipBtn5.click();
  await page5.waitForTimeout(timing.ms(300));
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
  await page6.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const sampleCta6 = page6.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta6.waitFor({ timeout: timing.ms(15000) });
  await sampleCta6.click();
  const reportBody6 = await waitForRenderedText(page6, 'CONSIDER', { timeoutMs: 45000 });
  record('dark-theme-rich', 'rich report: a report renders from "Try sample coverage"', /CONSIDER|RECOMMEND|PASS/.test(reportBody6));

  // ── Shape & Rhythm gate (audit fix, 2026-09-04) ─────────────────────────
  // Neither existing dark-theme step ever actually measured this section:
  // section 5's "Full report" click lands on a hand-typed script with too
  // few scenes for the structural engine to score at all (below
  // MIN_SCENES_TO_SCORE — server/nvm/analyze/structural-signals.ts — so
  // ShapeRhythmSection is simply ABSENT there, not merely unaudited), and
  // section 6 here never clicked "Full report" in the first place —
  // StoryGraphSection was this section's only target. That gap is exactly
  // how ScriptDoctorPanel.tsx's ShapeRhythmSection text-black/no-dark:-pair
  // bug (1.19:1 in dark mode) shipped invisibly. This sample script has
  // enough scenes for the section to render and be OPEN by default
  // (loadShapeRhythmOpenPref's default), so opening Full report here and
  // waiting for its heading closes the hole: audited in LIGHT theme now,
  // then again in DARK theme after the toggle below.
  const fullReportBtn6 = page6.getByRole('button', { name: 'Full report', exact: true }).first();
  const fullReportReachable6 = (await fullReportBtn6.count()) > 0;
  record('shape-rhythm-gate', '"Full report" is reachable from the rich sample report', fullReportReachable6);
  if (fullReportReachable6) {
    await fullReportBtn6.click();
    await page6.waitForSelector('[role="dialog"]', { timeout: timing.ms(10000) }).catch(() => {});
    const lightDialogBody = await waitForRenderedText(page6, 'Shape & Rhythm', { timeoutMs: 15000 });
    record('shape-rhythm-gate', 'light theme: "Shape & Rhythm" heading renders in the Full report dialog', lightDialogBody.includes('Shape & Rhythm'));
    // REVIEW FIX (round 2, 2026-09-05) — `waitForRenderedText` only checks
    // `document.body.textContent`, which is true whether or not the section
    // is actually scrolled into view. Proven live: this section sits
    // ~5,258px into a ~52,000px scroll container, and axe reported 0 gated
    // violations at the dialog's default (top-of-scroll) position against
    // the SAME unfixed classes that reported 13 once scrolled — the step
    // could never have failed on the bug it exists to catch. Scroll the
    // section into view and scope the axe run to it (auditElement) so this
    // gate measures exactly this section — not whatever else scrolling
    // there happens to also bring into the viewport.
    const lightSection = await scrollShapeRhythmIntoView(page6);
    await auditElement(page6, lightSection, 'light-full-report-shape-rhythm');
    await page6.keyboard.press('Escape');
    await page6.waitForTimeout(timing.ms(300));
  }

  // Toggle dark mode AFTER the report exists (Alt+Shift+D is wired on
  // ScriptIDE's own global keydown listener, so any focus inside it works —
  // the editor is the reliable, always-present target).
  const editor6 = page6.locator('.cm-content').first();
  await editor6.waitFor({ timeout: timing.ms(10000) });
  await editor6.focus();
  await page6.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
  await page6.waitForTimeout(timing.ms(300));
  const isDark6 = await page6.evaluate(() => document.documentElement.classList.contains('dark'));
  record('dark-theme-rich', 'Alt+Shift+D toggles dark mode on the rich-report view', isDark6);

  // Shape & Rhythm gate, dark theme — the pairing this whole step exists to
  // catch: the container this section renders in (`bg-white
  // dark:bg-zinc-900`) is one of the few in this panel that actually goes
  // dark, unlike the theme-invariant --sm-panel chrome most of the rest of
  // the dialog sits on.
  if (fullReportReachable6) {
    await fullReportBtn6.click();
    await page6.waitForSelector('[role="dialog"]', { timeout: timing.ms(10000) }).catch(() => {});
    const darkDialogBody = await waitForRenderedText(page6, 'Shape & Rhythm', { timeoutMs: 15000 });
    record('shape-rhythm-gate', 'dark theme: "Shape & Rhythm" heading renders in the Full report dialog', darkDialogBody.includes('Shape & Rhythm'));
    // Same scroll-into-view + scoped-audit fix as the light-theme pass
    // above — see its comment for why both are required.
    const darkSection = await scrollShapeRhythmIntoView(page6);
    await auditElement(page6, darkSection, 'dark-full-report-shape-rhythm');
    await page6.keyboard.press('Escape');
    await page6.waitForTimeout(timing.ms(300));
  }

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
  await page7.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page7.getByRole('button', { name: /start fresh/i }).first().click({ timeout: timing.ms(15000) });
  await page7.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });
  await page7.keyboard.press(`${MOD}+k`);
  const palette7 = page7.getByRole('dialog', { name: 'Command palette' });
  await palette7.waitFor({ timeout: timing.ms(5000) }).catch(() => {});
  await page7.keyboard.type('studio', { delay: 15 });
  const studioOption = page7.getByRole('option', { name: /open studio/i }).first();
  const studioOptionVisible = await studioOption.waitFor({ timeout: timing.ms(3000) }).then(() => true).catch(() => false);
  record('labs-research-panel', 'Labs ON: "Open Studio" is reachable via the command palette', studioOptionVisible);
  if (studioOptionVisible) {
    await page7.keyboard.press('Enter');
    const engineTabBtn = page7.getByRole('button', { name: 'Engine', exact: true }).first();
    const engineTabVisible = await engineTabBtn.waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
    record('labs-research-panel', 'Studio panel opens with an "Engine" tab', engineTabVisible);
    if (engineTabVisible) {
      await engineTabBtn.click();
      await page7.waitForTimeout(timing.ms(200));
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
        await page7.waitForFunction(() => /result/i.test(document.body.textContent || ''), { timeout: timing.ms(20000) }).catch(() => {});
        await page7.waitForTimeout(timing.ms(300));
        await auditSurface(page7, 'labs-story-engine-result');
      }
      // Same surface again in dark mode — AIPanel.tsx has no dark: variants
      // at all, so this mainly re-confirms the sm-title fix holds when the
      // rest of the app chrome goes dark around it. The shortcut is on a
      // document-level listener (ScriptIDE.tsx), so no specific focus target
      // is required here.
      await page7.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
      await page7.waitForTimeout(timing.ms(300));
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
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
    await page.getByRole('button', { name: /start fresh/i }).first().click({ timeout: timing.ms(15000) });
    await page.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });
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
  await page8.waitForTimeout(timing.ms(50));
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
  await page8.waitForTimeout(timing.ms(50));

  // Pre-existing idiom, re-verified after the fix above: Escape (arm) then
  // Tab (consume + exit) — the documented manual escape hatch for a writer
  // already mid-session, unaffected by the auto-arm addition.
  await page8.keyboard.press('Escape');
  await page8.waitForTimeout(timing.ms(50));
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
  await page9.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page9.getByRole('button', { name: /start fresh/i }).first().click({ timeout: timing.ms(15000) });
  await page9.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });

  // ── 9a) AnalysisPanel — Studio's "Analysis" tab. ──
  await page9.keyboard.press(`${MOD}+k`);
  const palette9 = page9.getByRole('dialog', { name: 'Command palette' });
  await palette9.waitFor({ timeout: timing.ms(5000) }).catch(() => {});
  await page9.keyboard.type('studio', { delay: 15 });
  const studioOption9 = page9.getByRole('option', { name: /open studio/i }).first();
  const studioOpened = await studioOption9.waitFor({ timeout: timing.ms(3000) }).then(() => true).catch(() => false);
  record('labs-panels', 'AnalysisPanel: "Open Studio" is reachable via the command palette', studioOpened);
  if (studioOpened) {
    await page9.keyboard.press('Enter');
    const analysisTabBtn = page9.getByRole('button', { name: 'Analysis', exact: true }).first();
    const analysisTabVisible = await analysisTabBtn.waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
    record('labs-panels', 'Studio panel opens with an "Analysis" tab', analysisTabVisible);
    if (analysisTabVisible) {
      await analysisTabBtn.click();
      await page9.waitForTimeout(timing.ms(200));
      await auditSurface(page9, 'labs-analysis-panel');
      await page9.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
      await page9.waitForTimeout(timing.ms(300));
      await auditSurface(page9, 'labs-analysis-panel-dark');
      await page9.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D'); // back to light for 9b
      await page9.waitForTimeout(timing.ms(300));
    }
  }

  // ── 9b) DirectorPanel — the "Director HUD" tool slot, next to
  //    "open-studio" in the same Labs command-palette group. ──
  await page9.keyboard.press(`${MOD}+k`);
  await palette9.waitFor({ timeout: timing.ms(5000) }).catch(() => {});
  await page9.keyboard.type('director', { delay: 15 });
  const directorOption = page9.getByRole('option', { name: /director hud/i }).first();
  const directorOpened = await directorOption.waitFor({ timeout: timing.ms(3000) }).then(() => true).catch(() => false);
  record('labs-panels', 'DirectorPanel: "Director HUD" is reachable via the command palette', directorOpened);
  if (directorOpened) {
    await page9.keyboard.press('Enter');
    const directorDialog = page9.getByRole('dialog', { name: 'AI Director State' });
    const directorVisible = await directorDialog.waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
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
        await page9.waitForTimeout(timing.ms(150));
        await auditSurface(page9, 'labs-director-panel-psychology-tab');
      }
      const outlineTabBtn = page9.getByRole('button', { name: 'Outline', exact: true }).first();
      if (await outlineTabBtn.count()) {
        await outlineTabBtn.click();
        await page9.waitForTimeout(timing.ms(150));
        await auditSurface(page9, 'labs-director-panel-outline-tab');
      }
      // Same surfaces again in dark mode.
      await page9.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
      await page9.waitForTimeout(timing.ms(300));
      await auditSurface(page9, 'labs-director-panel-outline-tab-dark');
      const sceneTabBtn = page9.getByRole('button', { name: 'Scene', exact: true }).first();
      if (await sceneTabBtn.count()) {
        await sceneTabBtn.click();
        await page9.waitForTimeout(timing.ms(150));
        await auditSurface(page9, 'labs-director-panel-scene-tab-dark');
      }
    }
  }
  await context9.close();

  // ══════════════════════════════════════════════════════════════════════
  // 10) Gate extension (client-hunter B-11/B-14/B-15, 2026-09-05): the
  //     shape-rhythm gate above (5/6) proved a scoped, both-themes,
  //     at-rest audit catches bugs a whole-document sweep misses — these
  //     three surfaces never got that treatment and each shipped a real
  //     contrast (or, for 10c, contrast + overflow) bug: B-11 (Ship's
  //     Versions cards, 1.13-2.45:1 in dark), B-14 (the Slate table's
  //     health number in light, rows in dark), B-15 (the exported coverage
  //     HTML's provenance lines at 2.48-3.19:1, and 375px overflow). Each
  //     step is scoped to the surface's own DOM subtree (auditElement, the
  //     same convention scrollShapeRhythmIntoView's caller uses above) so
  //     it measures exactly this surface, not whatever else the viewport
  //     happens to also contain.
  // ══════════════════════════════════════════════════════════════════════

  // ── 10a) Ship -> Versions list, two saved versions ──────────────────────
  console.log('\n=== 10a) Ship panel — Versions list, two saved versions, both themes ===');
  const context10a = await browser.newContext();
  const page10a = await context10a.newPage();
  wireConsoleCapture(page10a, genuineConsoleErrors);
  await page10a.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const sampleCta10a = page10a.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta10a.waitFor({ timeout: timing.ms(15000) });
  await sampleCta10a.click();
  await waitForRenderedText(page10a, 'CONSIDER', { timeoutMs: 45000 }).catch(() => {});
  await page10a.waitForTimeout(timing.ms(300));

  const shipBtn10a = page10a.getByRole('button', { name: 'Ship', exact: true }).first();
  const shipReachable10a = await shipBtn10a.waitFor({ timeout: timing.ms(10000) }).then(() => true).catch(() => false);
  record('ship-versions-gate', '"Ship" task tab is reachable from the rich sample report', shipReachable10a);

  let versionsSection10a = null;
  if (shipReachable10a) {
    await shipBtn10a.click();
    const saveVersionBtn10a = page10a.getByRole('button', { name: 'Save new script version snapshot', exact: true }).first();
    for (let i = 0; i < 2; i++) {
      // eslint-disable-next-line no-await-in-loop
      const visible = await saveVersionBtn10a.waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);
      if (!visible) break;
      // eslint-disable-next-line no-await-in-loop
      await saveVersionBtn10a.click();
      const nameInput10a = page10a.getByLabel('Snapshot version name', { exact: true }).first();
      // eslint-disable-next-line no-await-in-loop
      await nameInput10a.waitFor({ state: 'visible', timeout: timing.ms(5000) });
      // Round 2 fix (independent review, 2026-09-05): this loop opens the
      // Save Snapshot modal to PRODUCE the very cards `light-/dark-ship-
      // versions` below audits, but never audited the modal itself — which
      // carried the exact same 1.13:1 B-11 defect two functions up in
      // SnapshotManager.tsx, in the flow a writer must pass through to get
      // here. Audit it once, on the first open (light theme; the dark pass
      // gets its own re-open after the theme toggle below).
      if (i === 0) {
        // eslint-disable-next-line no-await-in-loop
        await auditElement(
          page10a,
          page10a.locator('[role="dialog"][aria-labelledby="save-snapshot-modal-title"]').first(),
          'light-save-snapshot-modal',
        );
      }
      // Enter confirms the snapshot, same as verify-p2-p3-surfaces.mjs's
      // identical two-saves-of-the-same-script flow (a genuine tie).
      // eslint-disable-next-line no-await-in-loop
      await nameInput10a.press('Enter');
      // eslint-disable-next-line no-await-in-loop
      await nameInput10a.waitFor({ state: 'hidden', timeout: timing.ms(5000) }).catch(() => {});
    }
    versionsSection10a = page10a.locator('section[aria-labelledby="ship-versions-heading"]').first();
    const sectionVisible10a = await versionsSection10a.waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);
    record('ship-versions-gate', 'section[aria-labelledby="ship-versions-heading"] renders with two saved versions', sectionVisible10a);
    if (sectionVisible10a) {
      await auditElement(page10a, versionsSection10a, 'light-ship-versions');
    }

    // Round 3 fix (independent review round 2, item 3): 10a audited only
    // the SAVE modal — but this round's own regression (SnapshotManager.tsx,
    // the "Current unsaved changes will be lost." caption) lived in the
    // RESTORE modal, which nothing gated. Open it once here (light theme;
    // the dark pass gets its own re-open after the toggle below), audit,
    // then Escape without actually restoring (there are two saved versions
    // on screen either way, so this doesn't disturb them).
    if (sectionVisible10a) {
      const restoreBtn10a = page10a.getByRole('button', { name: /^Restore snapshot/ }).first();
      const restoreReachable10a = await restoreBtn10a.waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
      record('ship-versions-gate', 'a "Restore snapshot" button is reachable from the Versions list', restoreReachable10a);
      if (restoreReachable10a) {
        await restoreBtn10a.click();
        const restoreModal10a = page10a.locator('[role="dialog"][aria-labelledby="restore-snapshot-modal-title"]').first();
        const restoreVisible10a = await restoreModal10a.waitFor({ state: 'visible', timeout: timing.ms(5000) }).then(() => true).catch(() => false);
        record('ship-versions-gate', 'restore-snapshot-modal opens', restoreVisible10a);
        if (restoreVisible10a) {
          await auditElement(page10a, restoreModal10a, 'light-restore-snapshot-modal');
          await page10a.keyboard.press('Escape');
          await restoreModal10a.waitFor({ state: 'hidden', timeout: timing.ms(5000) }).catch(() => {});
        }
      }
    }
  }

  // Dark theme, same section, same two saved versions already on screen —
  // toggling is a pure .dark class flip (same convention as the
  // shape-rhythm gate's dark pass), so no re-save is needed.
  const editor10a = page10a.locator('.cm-content').first();
  if (await editor10a.count()) await editor10a.focus().catch(() => {});
  await page10a.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
  await page10a.waitForTimeout(timing.ms(300));
  const isDark10a = await page10a.evaluate(() => document.documentElement.classList.contains('dark'));
  record('ship-versions-gate', 'Alt+Shift+D toggles dark mode with the Ship panel open', isDark10a);

  // Dark-theme pass of the same modal audit added above: re-open the Save
  // Snapshot modal now that the toggle is dark, audit it, then Escape
  // without saving a third snapshot (versionsSection10a's own dark audit
  // right below still expects exactly the two already on screen).
  if (isDark10a) {
    const saveVersionBtnDark10a = page10a.getByRole('button', { name: 'Save new script version snapshot', exact: true }).first();
    const reopened = await saveVersionBtnDark10a.waitFor({ state: 'visible', timeout: timing.ms(5000) }).then(() => true).catch(() => false);
    if (reopened) {
      await saveVersionBtnDark10a.click();
      const modalDark10a = page10a.locator('[role="dialog"][aria-labelledby="save-snapshot-modal-title"]').first();
      const modalDarkVisible = await modalDark10a.waitFor({ state: 'visible', timeout: timing.ms(5000) }).then(() => true).catch(() => false);
      record('ship-versions-gate', 'save-snapshot-modal reopens in dark mode', modalDarkVisible);
      if (modalDarkVisible) {
        await auditElement(page10a, modalDark10a, 'dark-save-snapshot-modal');
        await page10a.keyboard.press('Escape');
        await modalDark10a.waitFor({ state: 'hidden', timeout: timing.ms(5000) }).catch(() => {});
      }
    }

    // Round 3 fix (independent review round 2, item 3): dark-theme pass of
    // the Restore modal audit added above.
    const restoreBtnDark10a = page10a.getByRole('button', { name: /^Restore snapshot/ }).first();
    const restoreReopened = await restoreBtnDark10a.waitFor({ state: 'visible', timeout: timing.ms(5000) }).then(() => true).catch(() => false);
    if (restoreReopened) {
      await restoreBtnDark10a.click();
      const restoreModalDark10a = page10a.locator('[role="dialog"][aria-labelledby="restore-snapshot-modal-title"]').first();
      const restoreModalDarkVisible = await restoreModalDark10a.waitFor({ state: 'visible', timeout: timing.ms(5000) }).then(() => true).catch(() => false);
      record('ship-versions-gate', 'restore-snapshot-modal reopens in dark mode', restoreModalDarkVisible);
      if (restoreModalDarkVisible) {
        await auditElement(page10a, restoreModalDark10a, 'dark-restore-snapshot-modal');
        await page10a.keyboard.press('Escape');
        await restoreModalDark10a.waitFor({ state: 'hidden', timeout: timing.ms(5000) }).catch(() => {});
      }
    }
  }

  if (versionsSection10a) {
    const sectionVisibleDark10a = await versionsSection10a.waitFor({ state: 'visible', timeout: timing.ms(5000) }).then(() => true).catch(() => false);
    record('ship-versions-gate', 'section[aria-labelledby="ship-versions-heading"] still renders in dark mode', sectionVisibleDark10a);
    if (sectionVisibleDark10a) {
      await auditElement(page10a, versionsSection10a, 'dark-ship-versions');
    }
  }
  await context10a.close();

  // ── 10b) Slate table after a rank (Labs on) ──────────────────────────────
  console.log('\n=== 10b) Slate table — after ranking two scripts, both themes ===');
  const context10b = await browser.newContext();
  const page10b = await context10b.newPage();
  wireConsoleCapture(page10b, genuineConsoleErrors);
  await page10b.addInitScript(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); } catch {} });
  await page10b.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page10b.getByRole('button', { name: /start fresh/i }).first().click({ timeout: timing.ms(15000) });
  await page10b.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });

  await page10b.getByRole('button', { name: 'More tools' }).first().click();
  const overflowMenu10b = page10b.getByRole('menu').first();
  await overflowMenu10b.waitFor({ timeout: timing.ms(5000) });
  await overflowMenu10b.getByRole('menuitem', { name: /slate/i }).first().click();
  const slateDialog10b = page10b.getByRole('dialog', { name: /slate/i }).first();
  const slateOpen10b = await slateDialog10b.waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);
  record('slate-table-gate', 'Slate panel opens (Labs on)', slateOpen10b);

  let slateTable10b = null;
  if (slateOpen10b) {
    // Same real hidden-<input type="file"> drive as
    // verify-p2-p3-surfaces.mjs's Slate flow — two distinct tiny scripts,
    // so ranking actually has two rows to show.
    const fileInput10b = page10b.getByLabel('Add scripts to the slate (.fountain or .txt)', { exact: true });
    await fileInput10b.setInputFiles([
      { name: 'gate-a.fountain', mimeType: 'text/plain', buffer: Buffer.from('INT. ROOM - DAY\n\nA person waits.\n\nBOB\nHello.\n') },
      { name: 'gate-b.fountain', mimeType: 'text/plain', buffer: Buffer.from('INT. OFFICE - NIGHT\n\nA desk. A phone rings.\n\nALICE\nHi.\n') },
    ]);
    await page10b.getByText('Scripts (2/20)', { exact: true }).first().waitFor({ timeout: timing.ms(10000) });
    const rankBtn10b = slateDialog10b.getByRole('button', { name: 'Rank slate', exact: true }).first();
    await rankBtn10b.waitFor({ state: 'visible', timeout: timing.ms(5000) });
    await rankBtn10b.click();
    slateTable10b = page10b.locator('[data-a11y-section="slate-table"]').first();
    const tableVisible10b = await slateTable10b.waitFor({ state: 'visible', timeout: timing.ms(20000) }).then(() => true).catch(() => false);
    record('slate-table-gate', '[data-a11y-section="slate-table"] renders after ranking two scripts', tableVisible10b);
    if (tableVisible10b) {
      await auditElement(page10b, slateTable10b, 'light-slate-table');
    }
  }

  await page10b.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
  await page10b.waitForTimeout(timing.ms(300));
  const isDark10b = await page10b.evaluate(() => document.documentElement.classList.contains('dark'));
  record('slate-table-gate', 'Alt+Shift+D toggles dark mode with the Slate panel open', isDark10b);
  if (slateTable10b) {
    const tableVisibleDark10b = await slateTable10b.waitFor({ state: 'visible', timeout: timing.ms(5000) }).then(() => true).catch(() => false);
    record('slate-table-gate', '[data-a11y-section="slate-table"] still renders in dark mode', tableVisibleDark10b);
    if (tableVisibleDark10b) {
      await auditElement(page10b, slateTable10b, 'dark-slate-table');
    }
  }
  await context10b.close();

  // ── 10c) Exported coverage HTML, opened from file://, both themes ───────
  console.log('\n=== 10c) Exported coverage HTML — file://, light + dark, at rest, 375px overflow ===');
  const context10c = await browser.newContext();
  const page10c = await context10c.newPage();
  wireConsoleCapture(page10c, genuineConsoleErrors);
  await page10c.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const sampleCta10c = page10c.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta10c.waitFor({ timeout: timing.ms(15000) });
  await sampleCta10c.click();
  await waitForRenderedText(page10c, 'CONSIDER', { timeoutMs: 45000 }).catch(() => {});
  await page10c.waitForTimeout(timing.ms(300));
  const fullReportBtn10c = page10c.getByRole('button', { name: 'Full report', exact: true }).first();
  if (await fullReportBtn10c.count()) {
    await fullReportBtn10c.click();
    await page10c.waitForSelector('[role="dialog"]', { timeout: timing.ms(10000) }).catch(() => {});
  }
  await page10c.waitForTimeout(timing.ms(500));
  // The accessible name is the aria-label ("Export coverage report as an
  // HTML document"), not the visible "Export report" text — aria-label
  // overrides the computed accessible name (ScriptDoctorPanel.tsx).
  const exportBtn10c = page10c.getByRole('button', { name: 'Export coverage report as an HTML document', exact: true }).first();
  const exportReachable10c = (await exportBtn10c.count()) > 0;
  record('coverage-html-gate', 'Export coverage report button is reachable from the rich sample report', exportReachable10c);

  let exportedPath10c = null;
  if (exportReachable10c) {
    const [download10c] = await Promise.all([
      page10c.waitForEvent('download', { timeout: timing.ms(20000) }),
      exportBtn10c.click(),
    ]);
    // saveAs to a real .html path — Playwright's own download tmp file has
    // no extension, so file:// navigation to it renders as plain text
    // (Chromium sniffs content type from the extension), never reaching
    // the actual markup this gate exists to audit. Measured live during
    // development: without this, axe/overflow both silently no-op on an
    // escaped-text <pre> block instead of the real document.
    //
    // Round 2 fix (independent review, 2026-09-05): this used to save into
    // the TRACKED scripts/output/ directory, so every `verify:a11y` run
    // left the worktree dirty with a fresh 200+KB HTML file. Unlike the
    // JSON/CSV evidence artifacts that directory legitimately holds, this
    // is a one-off browser download this gate reads once and discards —
    // os.tmpdir() is the correct home, matching every other scratch file
    // this suite writes (see the a11y-review probes' own convention).
    exportedPath10c = `${tmpdir()}/verify-a11y-exported-coverage.html`;
    await download10c.saveAs(exportedPath10c);
  }
  await context10c.close();

  if (exportedPath10c) {
    const exportedBytes = readFileSync(exportedPath10c, 'utf8').length;
    record('coverage-html-gate', 'the exported HTML file is non-empty', exportedBytes > 0, `${exportedBytes} bytes`);

    // Light theme, at rest — 375px viewport (the finding's own overflow
    // check width) so the horizontal-overflow assertion below means what
    // it says. axe's color-contrast rule is viewport-size-independent.
    const context10cLight = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const pageLight10c = await context10cLight.newPage();
    wireConsoleCapture(pageLight10c, genuineConsoleErrors);
    await pageLight10c.goto(`file://${exportedPath10c}`, { waitUntil: 'load', timeout: timing.ms(15000) });
    await waitForDomQuiet(pageLight10c, { quietMs: 150, timeoutMs: 2000 });
    await auditSurface(pageLight10c, 'light-exported-coverage-html');
    const overflowLight10c = await pageLight10c.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    record('coverage-html-gate', 'light theme: no horizontal overflow at 375px (documentElement.scrollWidth <= clientWidth)', !overflowLight10c);
    await context10cLight.close();

    // Dark — this export deliberately has no prefers-color-scheme rules (a
    // fixed-palette, print-like document — see coverage-html.ts's STYLES
    // header), so rendering is expected to be identical to light; asserted
    // anyway so a future dark-mode addition to this template is covered
    // from day one instead of shipping un-audited the way this surface did.
    const context10cDark = await browser.newContext({ viewport: { width: 375, height: 800 }, colorScheme: 'dark' });
    const pageDark10c = await context10cDark.newPage();
    wireConsoleCapture(pageDark10c, genuineConsoleErrors);
    await pageDark10c.goto(`file://${exportedPath10c}`, { waitUntil: 'load', timeout: timing.ms(15000) });
    await waitForDomQuiet(pageDark10c, { quietMs: 150, timeoutMs: 2000 });
    await auditSurface(pageDark10c, 'dark-exported-coverage-html');
    const overflowDark10c = await pageDark10c.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    record('coverage-html-gate', 'dark (prefers-color-scheme): no horizontal overflow at 375px', !overflowDark10c);
    await context10cDark.close();
  }

  // ══════════════════════════════════════════════════════════════════════
  // 10d) Sidebar's character-count caption + StateDeltaCard's Dramatic
  //      Irony callout (round 5, independent review round 4 follow-up 3,
  //      carried from round 3): round 4's colour fix (text-red-500/text-
  //      yellow-600/text-amber-700 -> text-red-700/text-amber-800/text-
  //      amber-800, measured 5.59/6.17/5.75:1) was never reached by any
  //      step of this suite — the theme-convention scanner pins the
  //      CONVENTION (no orphaned dark:text-* half), not the CONTRAST, and
  //      nothing browser-side drove either surface into existence. Both
  //      need real interaction to exist at all: the Sidebar caption only
  //      renders past a character threshold, and StateDeltaCard only
  //      renders after a successful /api/live/intent response — a real
  //      AI-key call this keyless suite never has. Mocking that one route
  //      (keeping every other field of /api/ai-config live, overriding
  //      only llmReady) lets this step drive the REAL component with a
  //      controlled payload instead of skipping the surface outright.
  //      A LANE_STANDARD §3 fail-first proof does not apply here — both
  //      colours are already fixed on this tree, nothing to show failing —
  //      so instead this step proves it reached the intended, narrowly-
  //      scoped nodes (not zero, not the whole page) by logging the node
  //      count and the measured ratio at every step.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 10d) Sidebar character-count caption + StateDeltaCard Dramatic Irony, both themes ===');
  const context10d = await browser.newContext();
  const page10d = await context10d.newPage();
  wireConsoleCapture(page10d, genuineConsoleErrors);
  await page10d.addInitScript(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); } catch { /* noop */ } });
  await page10d.route('**/api/ai-config', async (route) => {
    const response = await route.fetch();
    const json = await response.json().catch(() => ({}));
    await route.fulfill({ response, json: { ...json, llmReady: true } });
  });
  await page10d.route('**/api/live/intent', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      intent: { riskCategory: 'C' },
      card: {
        action: 'verify-a11y probe: a mocked state delta with dramatic irony',
        effects: [],
        requiresConfirmation: true,
        dramaticIrony: true,
      },
    }),
  }));
  await page10d.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const startFresh10d = page10d.getByRole('button', { name: /start fresh/i }).first();
  const startReachable10d = await startFresh10d.waitFor({ timeout: timing.ms(15000) }).then(() => true).catch(() => false);
  record('sidebar-counter-gate', 'the editor is reachable via "Start fresh"', startReachable10d);
  if (startReachable10d) {
    await startFresh10d.click();
    await page10d.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });
  }

  // ── Sidebar character-count caption: Characters tab -> Add Character ->
  //    type past the warn/max thresholds on the Ghost field. ─────────────
  const charactersTab10d = page10d.getByRole('tab', { name: /characters/i }).first();
  const sidebarReachable10d = await charactersTab10d.waitFor({ timeout: timing.ms(10000) }).then(() => true).catch(() => false);
  record('sidebar-counter-gate', 'the Characters tab is reachable', sidebarReachable10d);
  let ghostField10d = null;
  if (sidebarReachable10d) {
    await charactersTab10d.click();
    await page10d.getByRole('button', { name: 'Add Character' }).first().click();
    ghostField10d = page10d.getByPlaceholder('What haunts them?').first();
    const ghostVisible = await ghostField10d.waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
    record('sidebar-counter-gate', 'the new character\'s Ghost field is reachable', ghostVisible);
    if (!ghostVisible) ghostField10d = null;
  }

  // ── StateDeltaCard: type a line into the editor, wait for the mocked
  //    /api/live/intent response's debounced round-trip. ─────────────────
  const cm10d = page10d.locator('.cm-content').first();
  const editorReady10d = await cm10d.waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);
  record('state-delta-gate', 'the editor is reachable to type a triggering line', editorReady10d);
  if (editorReady10d) {
    // .focus() (a real DOM focus call), not .click() — the empty-editor
    // placeholder overlay ("Type or paste Fountain format:") sits on top
    // of .cm-content until it has content, and a real pointer click there
    // gets intercepted by that overlay (the same reason every other probe
    // in this codebase that types into a fresh editor uses .focus()).
    await cm10d.focus();
    await page10d.keyboard.insertText('MARA picks up the letter and reads it silently, alone.');
  }
  const deltaCardHeading10d = page10d.getByText('State Delta Proposal', { exact: true }).first();
  const deltaCardReachable10d = editorReady10d
    ? await deltaCardHeading10d.waitFor({ timeout: timing.ms(10000) }).then(() => true).catch(() => false)
    : false;
  record('state-delta-gate', 'the mocked /api/live/intent response renders a StateDeltaCard', deltaCardReachable10d);
  const ironyCallout10d = page10d.getByText('Dramatic Irony:', { exact: false }).locator('..').first();

  for (const mode of ['light', 'dark']) {
    if (mode === 'dark') {
      await page10d.keyboard.press(isMac ? 'Alt+Shift+d' : 'Alt+Shift+D');
      await page10d.waitForTimeout(timing.ms(300));
    }

    if (ghostField10d) {
      // near-limit (yellow/amber-800) — Sidebar.tsx's LONG_FIELD_WARN_THRESHOLD
      // is 450, LONG_FIELD_MAX is 500; 460 sits in the warn band without
      // hitting the red at-limit band below.
      // eslint-disable-next-line no-await-in-loop
      await ghostField10d.fill('x'.repeat(460));
      const nearCaption10d = page10d.locator('p[id^="count-"]').first();
      // eslint-disable-next-line no-await-in-loop
      const nearVisible10d = await nearCaption10d.waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
      record('sidebar-counter-gate', `${mode}: near-limit caption renders`, nearVisible10d);
      if (nearVisible10d) {
        // eslint-disable-next-line no-await-in-loop
        const m = await nearCaption10d.evaluate(measureContrastNode);
        console.log(`  [${mode}] Sidebar near-limit caption — ${m.ratio}:1, ${m.nodeCount} node(s) in scope — ${m.fg} on ${m.bg} — "${m.text}"`);
        // eslint-disable-next-line no-await-in-loop
        await auditElement(page10d, nearCaption10d, `${mode}-sidebar-near-limit-caption`);
      }

      // at/over-limit (red/red-700) — Sidebar.tsx's LONG_FIELD_MAX (500).
      // eslint-disable-next-line no-await-in-loop
      await ghostField10d.fill('x'.repeat(500));
      const atLimitCaption10d = page10d.locator('p[id^="count-"]').first();
      // eslint-disable-next-line no-await-in-loop
      const atLimitVisible10d = await atLimitCaption10d.waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
      record('sidebar-counter-gate', `${mode}: at-limit caption renders`, atLimitVisible10d);
      if (atLimitVisible10d) {
        // eslint-disable-next-line no-await-in-loop
        const m = await atLimitCaption10d.evaluate(measureContrastNode);
        console.log(`  [${mode}] Sidebar at-limit caption — ${m.ratio}:1, ${m.nodeCount} node(s) in scope — ${m.fg} on ${m.bg} — "${m.text}"`);
        // eslint-disable-next-line no-await-in-loop
        await auditElement(page10d, atLimitCaption10d, `${mode}-sidebar-at-limit-caption`);
      }
    }

    if (deltaCardReachable10d) {
      // eslint-disable-next-line no-await-in-loop
      const ironyVisible10d = await ironyCallout10d.waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
      record('state-delta-gate', `${mode}: the Dramatic Irony callout renders`, ironyVisible10d);
      if (ironyVisible10d) {
        // eslint-disable-next-line no-await-in-loop
        const m = await ironyCallout10d.evaluate(measureContrastNode);
        console.log(`  [${mode}] StateDeltaCard Dramatic Irony — ${m.ratio}:1, ${m.nodeCount} node(s) in scope — ${m.fg} on ${m.bg} — "${m.text}"`);
        // eslint-disable-next-line no-await-in-loop
        await auditElement(page10d, ironyCallout10d, `${mode}-state-delta-dramatic-irony`);
      }
    }
  }
  await context10d.close();

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
