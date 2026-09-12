#!/usr/bin/env node
// verify-p2-p3-surfaces.mjs — live-browser re-validation of the ROADMAP P2
// ("collapse the surface to Doctor + Editor") and P3 ("shareable,
// third-party-verifiable coverage report") DONE claims, plus a live check of
// the P4-prep events instrumentation. Requested by docs/PATH_TO_DONE.md task
// 6 ("Re-verify P2/P3 against the current tree") after this week's heavy
// churn: the 1-based scene migration, the ultrareview merge (42 files), the
// architecture-deepening merge (42 more), the a11y focus-trap restructuring
// of ScriptIDE's modals, and CoverageSummary changes. Nobody had re-run a
// browser check against the post-churn tree before this script.
//
// THIS RUNS IN CI (2026-09-02). The header used to assert the opposite — "not
// a CI test, CI has no browser provisioned" — which was a self-imposed
// limitation rather than a fact, and it cost real rot: the SSE migration broke
// this suite's report wait and nobody noticed for days because nothing ran it.
// `playwright` is now a pinned devDependency and the `browser` job in
// .github/workflows/ci.yml runs `npx playwright install --with-deps chromium`
// before `npm run verify:browser`, so these 141 assertions gate every push and
// block `publish` in release.yml. Run it by hand too, after touching
// feature-flags.ts, Toolbar.tsx, App.tsx's hash-routing/Labs gating, the
// export/verify routes, or the events instrumentation.
//
// DECISION #3 (2026-09-03, docs/DECISION_LOG.md) added the "P2-generative"
// phase below: the generative half of the product (Fix with AI, Deep read,
// Fix & verify, auto-analysis, the AI-provider Settings tabs) is now gated by
// the SAME Labs flag as OASIS, so this script — the machine-checked statement
// of what the default surface is — asserts both directions for it too.
//
// Boot/launch/console-capture/report-wait and the PASS/FAIL summary live in
// scripts/lib/browser-verify.mjs — change them there, not here. This file is
// the origin of the exact StartScreen -> "Try sample coverage" ->
// CoverageSummary -> "Full report" flow reused by the other suites.
//
// Prereqs: Node >= 22.6; `npm ci` (brings Playwright) and a Chromium binary —
// `npx playwright install chromium`, which is what CI does. In this container
// a browser is already provisioned outside Playwright's cache, so run:
//
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-p2-p3-surfaces.mjs
//
// (PW_CHROMIUM_PATH is optional — omit it to let Playwright resolve its own
// pinned browser build, which is the CI path.)
//
// Exit codes: 0 = every assertion passed. 1 = at least one failed (see the
// per-assertion PASS/FAIL log above the summary for which, and why).

import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  bootKeylessServer,
  createRecorder,
  getTiming,
  launchChromium,
  pickFreePort,
  shutdown,
  wireConsoleCapture,
} from './lib/browser-verify.mjs';
// Shared draft-rank copy (src/lib/draft-rank-copy.ts) — imported here so this
// browser gate's expected text is DERIVED from the same helpers the panel,
// the coverage letter, and the exported coverage HTML all call, not a
// hand-typed literal of its own. This is exactly the gap the 2026-09-05
// migration closed in coverage-html.ts itself: a hardcoded regex here would
// happily keep matching the OLD "your own saved drafts of this script" /
// "your next save" wording forever, even after every renderer moved on —
// this gate would never notice the drift it exists to catch.
import { draftRankDenominatorLabel, draftRankNextOpportunityLabel, draftRankSentence } from '../src/lib/draft-rank-copy.ts';
// Same reasoning for the jump affordance's accessible name: it has ONE
// implementation (src/lib/finding-jump.ts) and this gate matches whatever that
// module names it, rather than a literal that stops matching on a rename.
import { JUMP_CONTROL_NAME_RE, ROOT_CAUSE_EXPANDER_NAME_RE } from '../src/lib/finding-jump.ts';
// 2026-09-11: the percentile's comparability gate and the priorities heading, both
// imported for the same reason every other shared helper in this list is — a
// literal here would keep matching wording the product has moved off, and this
// gate would never notice the drift it exists to catch. See
// src/lib/percentile-copy.ts and src/lib/priorities-copy.ts.
import { percentileIsComparable, notComparableSentence } from '../src/lib/percentile-copy.ts';
import { prioritiesHeadingFor } from '../src/lib/priorities-copy.ts';
// SnapshotManager.tsx's per-snapshot badge ranks against a NARROWER set than
// the panel/letter/HTML above (snapshotDraftRanks calls computeDraftRank with
// an empty history array — saved Versions only, never Draft History runs),
// hence the 'saved' scope rather than the default 'union' one.
const savedScopeDraftRankNoun = draftRankDenominatorLabel('saved');

const REPO = process.cwd();

// A 12-scene Final Draft export, used only to put ScriptDoctorPanel into an
// FDX-SOURCED report state — the one state in which the panel's base text
// (report.source.convertedFountain) and the browser's own copy of the upload
// (raw XML) are different representations of the same script. Built here
// rather than read from disk so the suite stays self-contained, and shaped
// like a real export (XML prolog + <FinalDraft> root) because that is what
// ScriptDoctorPanel's handleFileSelected sniffs on.
const FDX_PROBE_XML = (() => {
  const paras = [];
  for (let i = 1; i <= 12; i++) {
    paras.push(`  <Paragraph Type="Scene Heading"><Text>INT. ROOM ${i} - DAY</Text></Paragraph>`);
    paras.push('  <Paragraph Type="Action"><Text>MARA crosses to the window and looks out at the rain for a long moment.</Text></Paragraph>');
    paras.push('  <Paragraph Type="Character"><Text>MARA</Text></Paragraph>');
    paras.push('  <Paragraph Type="Dialogue"><Text>We are running out of time, and everyone in this building knows it.</Text></Paragraph>');
    paras.push('  <Paragraph Type="Character"><Text>IVO</Text></Paragraph>');
    paras.push('  <Paragraph Type="Dialogue"><Text>Then we move tonight, before the shift changes over.</Text></Paragraph>');
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<FinalDraft DocumentType="Script" Template="No" Version="1">\n<Content>\n${paras.join('\n')}\n</Content>\n</FinalDraft>\n`;
})();

// Cmd on macOS, Ctrl elsewhere — same convention as
// scripts/verify-e5-command-palette.mjs, which owns the palette's own proof.
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

// A tiny, valid Fountain file used only to put ScriptDoctorPanel back into its
// IDLE state on demand. Uploading a script is the one deterministic route to
// that state once a report is on screen (handleFileSelected sets status
// 'idle' and clears the report), and idle is where the "Deep read" toggle
// lives — so this is how both contexts below check that control from the same
// starting point instead of racing a Re-run/Cancel.
const IDLE_PROBE_FOUNTAIN = `Title: Idle Probe

INT. PROBE ROOM - DAY

A short scene, only ever used to return the panel to its idle state.

ANA
We are checking a checkbox, not a script.
`;

/**
 * Types `text` into the focused element WITHOUT handing React a drain gap
 * between keystrokes — the difference between a browser step that can fail on
 * the unfixed tree and one that cannot.
 *
 * `page.keyboard.type()` awaits a CDP round-trip PER KEY. That round-trip is
 * an idle gap, and an idle gap is exactly what React's nested-update counter
 * needs to reset: `commitRootImpl` only increments it when a commit ends with
 * pending sync/default lanes, so one drained frame anywhere in the burst puts
 * the counter back to zero. Feature-length defect #1 is a ratchet of ~1 per
 * keystroke against a limit of 50, so an awaited burst reproduces it only when
 * the machine is loaded enough to lose the race — measured 5/5, 4/5 and 2/3
 * under load but 0/5 idle, which is why round 1 of this lane wrongly recorded
 * the defect as "load-dependent" and this step as un-fail-first.
 *
 * Dispatching the same keys through `Input.dispatchKeyEvent` and awaiting the
 * promises ONCE at the end removes the per-key gap. Measured on this box, two
 * builds differing by one line (ScriptIDE.tsx's `saveStatus` declaration):
 * unfixed 3/3 threw React #185, fixed 0/3 with zero errors of any kind.
 *
 * `timing.ms()` still governs every WAIT in this phase; there is deliberately
 * no wait inside the burst, because the absence of one is the instrument.
 */
async function typeWithoutDrainGaps(page, text) {
  const cdp = await page.context().newCDPSession(page);
  const pending = [];
  for (const ch of text) {
    if (ch === '\n') {
      pending.push(cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 }));
      pending.push(cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }));
    } else {
      pending.push(cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch }));
      pending.push(cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }));
    }
  }
  await Promise.all(pending);
  await cdp.detach().catch(() => {});
}

/** Uploads IDLE_PROBE_FOUNTAIN through ScriptDoctorPanel's real file input
 *  (the hidden <input type="file"> behind its "Upload" trigger), which is the
 *  panel's own supported way back to the idle state. */
async function returnDoctorPanelToIdle(page) {
  await page.setInputFiles('input[aria-label^="Upload script file"]', {
    name: 'idle-probe.fountain',
    mimeType: 'text/plain',
    buffer: Buffer.from(IDLE_PROBE_FOUNTAIN, 'utf8'),
  });
  // handleFileSelected is async (file.text()); wait for the idle state's own
  // "Run Diagnosis" button rather than a bare sleep.
  await page
    .getByRole('button', { name: 'Run Diagnosis', exact: true })
    .first()
    .waitFor({ state: 'visible', timeout: timing.ms(10000) });
}

/** The Settings dialog's tab labels, in strip order. Opened the same way a
 *  writer opens it: Toolbar overflow -> "Labs & Settings". */
async function openSettingsTabLabels(page) {
  await page.getByRole('button', { name: 'More tools' }).first().click();
  const menu = page.getByRole('menu').first();
  await menu.waitFor({ timeout: timing.ms(10000) });
  await menu.getByRole('menuitem', { name: /labs/i }).first().click();
  const tablist = page.locator('[role="tablist"][aria-label="Settings sections"]');
  await tablist.waitFor({ timeout: timing.ms(15000) });
  // Scoped to this tablist specifically: Sidebar.tsx's own Scenes/
  // Characters switcher (2026-09-04 a11y pass) is now ALSO a real
  // role="tab" pair, always present underneath this dialog — an unscoped
  // getByRole('tab') would mix its labels in too (harmless for the
  // .includes() checks this feeds today, but scoped is still correct).
  const labels = await tablist.getByRole('tab').allTextContents();
  return labels.map((t) => t.trim());
}

const ISOLATED_PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${ISOLATED_PORT}`;

let serverProc = null;
let browser = null;
let timing = null; // set at the top of main() — see scripts/lib/browser-verify.mjs
// NOTE (2026-09-12): `page.waitForFunction(fn, arg, options)` takes its options
// THIRD. Every call in this file passed `{ timeout }` in the ARG position, so
// six waits that read as 30 s / 120 s / 180 s budgets all ran on Playwright's
// 30 s default — which is why the feature-length "coverage completes on a
// 231-scene draft" wait (~a 2-3 minute analysis under load) failed as
// `Timeout 30000ms exceeded` in 2 of 6 runs of this suite while passing in the
// other 4. Every call now passes `undefined` as the arg, so the budget written
// beside it is the budget that applies.
const genuineConsoleErrors = [];

// { phase, assertion, pass, detail }
const { record, printSummary } = createRecorder({
  grouped: true,
  groupKey: 'phase',
  listFailures: true,
});

// ── Sample script text (used to drive the verify loop with the SAME text
// the exported report was generated from). src/lib/sample-script.ts is
// plain JS wrapped in TS module syntax (verified: only two top-level
// `export const` declarations, no other TS-only syntax), so it's evaluated
// directly here instead of pulling in a TS loader just for two constants. ──
function loadSampleScript() {
  const raw = readFileSync(join(REPO, 'src/lib/sample-script.ts'), 'utf8');
  const asJs = raw.replace(/^export const/gm, 'const');
  // eslint-disable-next-line no-new-func
  const fn = new Function(`${asJs}\nreturn { title, fountain };`);
  return fn();
}

// ── Static cross-check (no browser): every component under src/components
// is either reachable on the default (no-Labs) path by design, reachable
// only behind the Labs flag, or unreachable from App.tsx altogether (dead
// UI). This is a plain import-graph BFS from App.tsx, with StoryMachine.tsx
// as the sole Labs-gated edge — App.tsx's own effectiveShowStoryMachine
// check (labsEnabled && showStoryMachine) is the only way to reach it, and
// every one of the ~38 research panels lives exclusively inside
// StoryMachine.tsx (verified separately by grep before this script was
// written), so "imported only via StoryMachine.tsx" is an accurate proxy
// for "gated by the Labs flag" here. ──────────────────────────────────────
const COMPONENTS_DIR = join(REPO, 'src/components');

function listComponentFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listComponentFiles(full, base));
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) out.push(relative(base, full));
  }
  return out;
}

function extractImports(fileRelPath) {
  const full = join(COMPONENTS_DIR, fileRelPath);
  const src = readFileSync(full, 'utf8');
  const specs = [];
  // Both static `from "./X"` AND dynamic `lazy(() => import("./X"))` —
  // ScriptIDE.tsx and StoryMachine.tsx code-split most of their own panels
  // (see the `const AIPanel = lazy(() => import("./AIPanel"));` pattern),
  // so a from-only regex undercounts the graph and misreports every
  // lazy-loaded default-surface panel as dead.
  const patterns = [/from\s+["']([^"']+)["']/g, /import\(\s*["']([^"']+)["']\s*\)/g];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src))) specs.push(m[1]);
  }
  return specs;
}

/** Resolve a relative import spec (e.g. "./DirectorPanel", "../lib/x") to a
 *  components-dir-relative .tsx/.ts path, or null if it points outside
 *  src/components (libs, node_modules, etc. — irrelevant to this graph). */
function resolveImport(fromFileRel, spec) {
  if (!spec.startsWith('.')) return null;
  const fromDir = join(COMPONENTS_DIR, fromFileRel, '..');
  const target = join(fromDir, spec);
  const relTarget = relative(COMPONENTS_DIR, target);
  if (relTarget.startsWith('..')) return null; // escapes src/components (e.g. ../lib/*)
  for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    const candidate = relTarget.endsWith(ext) ? relTarget : relTarget + ext;
    if (existsSync(join(COMPONENTS_DIR, candidate))) return candidate;
  }
  return null;
}

function buildReachableSet(startFiles, { excludeEdge } = {}) {
  const seen = new Set();
  const queue = [...startFiles];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (seen.has(cur)) continue;
    if (!existsSync(join(COMPONENTS_DIR, cur))) continue;
    seen.add(cur);
    for (const spec of extractImports(cur)) {
      const resolved = resolveImport(cur, spec);
      if (!resolved) continue;
      if (excludeEdge && excludeEdge(cur, resolved)) continue;
      if (!seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

function staticCrossCheck() {
  console.log('\n=== STATIC CROSS-CHECK: src/components/** reachability ===');
  const allFiles = listComponentFiles(COMPONENTS_DIR);

  // App.tsx lives one level up from src/components — read it directly for
  // its own local component imports (StartScreen/ScriptIDE/StoryMachine/
  // DesignPreview/VerifyReport), which is the actual root of this graph.
  const appTsx = readFileSync(join(REPO, 'src/App.tsx'), 'utf8');
  // App.tsx's own component imports are a mix of static `from "./components/X"`
  // and (for every code-split view) `lazy(() => import('./components/X'))` —
  // both forms must be walked or every lazy-loaded root (StartScreen,
  // ScriptIDE, StoryMachine, DesignPreview, VerifyReport — i.e. everything)
  // is missed and the whole tree reads as dead.
  const appImportSpecs = [
    ...[...appTsx.matchAll(/from\s+["'](\.\/components\/[^"']+)["']/g)].map((m) => m[1]),
    ...[...appTsx.matchAll(/import\(\s*["'](\.\/components\/[^"']+)["']\s*\)/g)].map((m) => m[1]),
  ];
  const appRoots = appImportSpecs
    .map((spec) => spec.replace(/^\.\/components\//, ''))
    .map((rel) => (existsSync(join(COMPONENTS_DIR, rel + '.tsx')) ? rel + '.tsx' : rel + '.ts'))
    .filter((rel) => existsSync(join(COMPONENTS_DIR, rel)));

  // App.tsx's App.tsx-level import of StoryMachine.tsx is itself the only
  // Labs-gated edge (its render is behind effectiveShowStoryMachine). The
  // default-reachable BFS must therefore both (a) never seed StoryMachine.tsx
  // as a root, since App.tsx statically imports it as one of its own lazy
  // roots, and (b) never cross INTO it from any other file, or every one of
  // its exclusively-imported children reads as default-reachable too.
  const defaultRoots = appRoots.filter((f) => f !== 'StoryMachine.tsx');
  const isStoryMachineEdge = (from, to) => to === 'StoryMachine.tsx';

  const defaultReachable = buildReachableSet(defaultRoots, { excludeEdge: isStoryMachineEdge });
  const allReachable = buildReachableSet(appRoots, {});
  const labsOnlyViaStoryMachine = new Set([...allReachable].filter((f) => !defaultReachable.has(f)));
  const deadFiles = new Set(allFiles.filter((f) => !allReachable.has(f)));

  // Components that ARE in defaultReachable purely by import-graph terms
  // (ScriptIDE.tsx imports them directly) but are additionally gated at
  // RUNTIME by a labsEnabled check before the user can ever open them —
  // confirmed by direct source read (Toolbar.tsx's `labsEnabled &&`
  // wrapped OverflowItems for Studio/Director/Slate; App.tsx's
  // `onOpenStoryMachine={labsEnabled ? ... : undefined}`). These are
  // correctly gated PROVIDED no other unguarded path reaches them — see
  // the live-browser Ship-task check for the one exception found.
  const runtimeGatedInDefaultReachable = new Set(['scriptide/Toolbar.tsx' /* the gate mechanism itself, not a panel */]);

  // Known-quarantined dead components (2026-08-08 prototype quarantine, commit
  // 1664d08 era): their entry points were deliberately retired but the files
  // were preserved per the keep-as-reference moratorium. Listed BY NAME so the
  // dead-UI tripwire stays armed for anything new — an unlisted unreachable
  // component still FAILS this script. Owner decision (delete vs. revive) is
  // pending; remove entries here only alongside that decision.
  const knownQuarantinedDead = new Set([
    'oasis/BeliefDriftGraph.tsx',
    'oasis/ReplayInspector.tsx',
    'oasis/SecretsMatrix.tsx',
    'oasis/SimulationSandbox.tsx',
  ]);

  for (const f of allFiles.sort()) {
    if (deadFiles.has(f) && knownQuarantinedDead.has(f)) {
      record('P2-static', `${f} unreachable — known-quarantined (2026-08-08), owner decision pending`, true, 'deliberately orphaned prototype, preserved per moratorium; not a new leak');
    } else if (deadFiles.has(f)) {
      record('P2-static', `${f} reachable from App.tsx`, false, 'UNREACHABLE — not imported (directly or transitively) from App.tsx at all; dead UI worth reporting');
    } else if (labsOnlyViaStoryMachine.has(f)) {
      record('P2-static', `${f} reachable only via Labs-gated StoryMachine.tsx`, true, 'imported exclusively through StoryMachine.tsx, itself gated by App.tsx\'s effectiveShowStoryMachine');
    } else {
      record('P2-static', `${f} reachable on default (no-Labs) path`, true, 'imported outside StoryMachine.tsx — must be legitimate Doctor+Editor chrome, not confirmed research/OASIS content');
    }
  }

  return { defaultReachable, labsOnlyViaStoryMachine, deadFiles, allFiles };
}

// ── Playwright helpers ───────────────────────────────────────────────────

async function getOverflowMenuItemLabels(page) {
  const btn = page.getByRole('button', { name: 'More tools' }).first();
  await btn.click();
  const menu = page.getByRole('menu').first();
  await menu.waitFor({ timeout: timing.ms(5000) });
  const items = await menu.getByRole('menuitem').allTextContents();
  await page.keyboard.press('Escape'); // close it back up
  return items.map((s) => s.trim());
}

// W6: detects the PRODUCTION/ANALYSIS/ENGINE/CODEX research-shell tab bar.
// Requires ALL FOUR words present, not any single one — "Analysis" alone is
// ambiguous with the persistent Toolbar's own unrelated "No AI key ·
// analysis ok" banner (ScriptIDE.tsx), which a naive any-of match (and an
// earlier version of this check) false-positived on. Only the actual tab
// bar renders all four together as siblings, so requiring the full set is
// both a false-positive fix and a MORE specific regression tripwire.
function hasResearchShellChrome(bodyText) {
  return ['Production', 'Analysis', 'Engine', 'Codex'].every((w) => new RegExp(`\\b${w}\\b`, 'i').test(bodyText));
}

async function main() {
  // Read the load-derived timing policy FIRST — before the server boots or
  // Chromium launches — so VERIFY_MAX_LOAD_PER_CPU can refuse the whole run
  // without paying for either. See scripts/lib/browser-verify.mjs.
  timing = getTiming();

  const { fountain: sampleFountain, title: sampleTitle } = loadSampleScript();
  console.log(`[verify] loaded sample script "${sampleTitle}" (${sampleFountain.length} chars) for the verify loop.`);

  const staticResult = staticCrossCheck();

  serverProc = await bootKeylessServer({ repo: REPO, port: ISOLATED_PORT, baseUrl: BASE });
  browser = await launchChromium();

  // Baseline events snapshot straight off server boot — before ANY browser
  // action. This is the "null-before-first-run" case the P4-prep
  // instructions ask for.
  const baselineSummaryRes = await fetch(`${BASE}/api/events/summary`);
  const baselineSummary = await baselineSummaryRes.json();
  record(
    'P4-instrumentation',
    'GET /api/events/summary is null/zero before any Doctor run',
    baselineSummary.exportRate === null &&
      baselineSummary.avgTimeToFirstReportMs === null &&
      Object.values(baselineSummary.counts).every((n) => n === 0),
    `counts=${JSON.stringify(baselineSummary.counts)} exportRate=${baselineSummary.exportRate} avgTimeToFirstReportMs=${baselineSummary.avgTimeToFirstReportMs}`,
  );

  // ══════════════════════════════════════════════════════════════════════
  // CONTEXT A — fresh profile, Labs OFF (default surface).
  // ══════════════════════════════════════════════════════════════════════
  const contextA = await browser.newContext({ acceptDownloads: true });
  const pageA = await contextA.newPage();
  wireConsoleCapture(pageA, genuineConsoleErrors);

  console.log('\n=== P2 — DEFAULT SURFACE (Labs OFF, fresh profile) ===');
  await pageA.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });

  const sampleCta = pageA.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta.waitFor({ timeout: timing.ms(15000) });
  record('P2', 'StartScreen offers the sample-coverage CTA', true, '"Try sample coverage" button found');

  // ── Finding #6 (2026-09-12): the start screen's Coverage card showed
  // hardcoded literals (HEALTH 76, COUNTS 3 · 38 · 159) beside "See it on the
  // sample", and the sample returns 78 and 2 · 32 · 139. The card now renders
  // from src/lib/sample-coverage-facts.ts, a build-time artifact. The floor for
  // this assertion is the SERVER's own answer for the sample's exact bytes — not
  // the artifact, which would only prove the card agrees with its own input.
  const sampleDoctorRes = await fetch(`${BASE}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fountain: sampleFountain, title: sampleTitle }),
  });
  const sampleReport = await sampleDoctorRes.json();
  const startCardText = await pageA.evaluate(() => {
    const heading = [...document.querySelectorAll('h2')].find((h) => h.id === 'coverage-heading');
    const section = heading?.closest('section');
    return section ? section.innerText.replace(/\s+/g, ' ') : null;
  });
  const expectedHealth = String(Math.round(sampleReport.health));
  const expectedCounts = `${sampleReport.bySeverity.critical} · ${sampleReport.bySeverity.major} · ${sampleReport.bySeverity.minor}`;
  const expectedNext = sampleReport.topPriorities?.[0]?.location ?? '';
  record(
    'P2-startcard',
    'the start screen\'s Coverage card states the health the sample actually returns',
    startCardText !== null && startCardText.includes(expectedHealth),
    `serverHealth=${expectedHealth} card=${JSON.stringify((startCardText ?? '').slice(0, 220))}`,
  );
  record(
    'P2-startcard',
    'its critical · major · minor counts are the sample\'s own',
    startCardText !== null && startCardText.includes(expectedCounts),
    `serverCounts=${JSON.stringify(expectedCounts)}`,
  );
  record(
    'P2-startcard',
    'its "Next" cell names the sample\'s real top priority, not a hand-written phrase',
    startCardText !== null && expectedNext.length > 0 && startCardText.includes(expectedNext),
    `serverTopPriorityLocation=${JSON.stringify(expectedNext)}`,
  );
  record(
    'P2-startcard',
    'the card is labelled as the sample\'s own reading, so a visitor knows what they are looking at',
    startCardText !== null && /The sample's own numbers/i.test(startCardText),
    startCardText === null ? 'coverage section not found' : '',
  );
  const staleStartCardLiterals = ['3 · 38 · 159', 'Climax engagement'].filter(
    (lit) => startCardText !== null && startCardText.includes(lit),
  );
  record(
    'P2-startcard',
    'none of the superseded hardcoded values survives on the front door',
    staleStartCardLiterals.length === 0,
    `stillPresent=${JSON.stringify(staleStartCardLiterals)}`,
  );

  const advancedSimBtnOff = pageA.getByRole('button', { name: /advanced: simulation/i });
  const advancedSimCountOff = await advancedSimBtnOff.count();
  record('P2', 'StartScreen "Advanced: Simulation" (Labs-gated) is ABSENT with Labs OFF', advancedSimCountOff === 0, `found ${advancedSimCountOff} matching button(s)`);

  // ── Toolbar / overflow gating + the Ship-task bypass check, using a
  // blank draft so no doctor call is needed yet. ──────────────────────────
  const startFreshBtn = pageA.getByRole('button', { name: /start fresh/i }).first();
  await startFreshBtn.click();
  const toolbarHeader = pageA.locator('header.sm-pagetop');
  await toolbarHeader.waitFor({ timeout: timing.ms(15000) });

  const overflowLabelsOff = await getOverflowMenuItemLabels(pageA);
  // "director" alone also matches the unrelated, never-gated "Director
  // layer on/off" toggle (directorsLayer prop) — the Labs-gated item is
  // specifically "Director HUD" / "Close Director", so exclude "layer".
  const isDirectorHudLabel = (l) => /director/i.test(l) && !/layer/i.test(l);
  const hasStudioOff = overflowLabelsOff.some((l) => /studio/i.test(l));
  const hasDirectorOff = overflowLabelsOff.some(isDirectorHudLabel);
  const hasSlateOff = overflowLabelsOff.some((l) => /slate/i.test(l));
  const hasSimulateOff = overflowLabelsOff.some((l) => /open simulate/i.test(l));
  record('P2', 'Toolbar overflow: "Open Studio" ABSENT with Labs OFF', !hasStudioOff, `items=${JSON.stringify(overflowLabelsOff)}`);
  record('P2', 'Toolbar overflow: "Director HUD" ABSENT with Labs OFF', !hasDirectorOff, `items=${JSON.stringify(overflowLabelsOff)}`);
  record('P2', 'Toolbar overflow: "Slate compare" ABSENT with Labs OFF', !hasSlateOff, `items=${JSON.stringify(overflowLabelsOff)}`);
  record('P2', 'Toolbar overflow: "Open Simulate" ABSENT with Labs OFF', !hasSimulateOff, `items=${JSON.stringify(overflowLabelsOff)}`);
  record('P2', 'Toolbar overflow: "Labs & Settings" reachable (so a writer can turn Labs on)', overflowLabelsOff.some((l) => /labs/i.test(l)), `items=${JSON.stringify(overflowLabelsOff)}`);

  // ── Decision #3 (2026-09-03) — auto-analysis toggles POST
  // /api/analyze-script, an aiLimiter route that runs an LLM pass plus image
  // and audio generation on every typing pause. It sat in this menu, one
  // click from the default surface, with nothing anywhere asserting that what
  // it produced was any good. It is now Labs-gated like Studio/Director/Slate.
  const hasAutoAnalysisOff = overflowLabelsOff.some((l) => /auto-analysis/i.test(l));
  record(
    'P2-generative',
    'Toolbar overflow: "Auto-analysis" (POST /api/analyze-script) ABSENT with Labs OFF',
    !hasAutoAnalysisOff,
    `items=${JSON.stringify(overflowLabelsOff)}`,
  );

  // W6 (docs/PATH_TO_EXCELLENCE.md Phase W): the always-visible "Ship" task
  // tab used to bypass the Labs gate by mounting toolSlot="studio" (the
  // PRODUCTION/ANALYSIS/ENGINE/CODEX research shell) just to show a
  // snapshots list — exactly the "Ship/Studio Labs-gate bypass" the
  // 2026-08-04 addendum above ACCEPTED as a known-open item pending a real
  // fix. This block asserts that leak is now CLOSED (not merely
  // re-decided): Ship opens its own writer-facing ShipPanel
  // (toolSlot="ship" — exports, snapshots/versions, verify-report pointer,
  // paper·ink·stamp chrome, zero research tab bar); the research shell moved
  // exclusively behind toolSlot="studio", reachable only through the still
  // Labs-gated Toolbar overflow "Open Studio" item exercised in CONTEXT B
  // below. See docs/p1-benchmark/SURFACE_REVALIDATION_2026-08-04.md's
  // 2026-08-21 addendum for the closure record.
  const shipTaskBtn = pageA.getByRole('button', { name: 'Ship', exact: true }).first();
  await shipTaskBtn.click();
  await pageA.waitForSelector('[aria-labelledby="ship-panel-title"]', { timeout: timing.ms(10000) });
  await pageA.waitForTimeout(timing.ms(200));
  const shipBodyTextOff = await pageA.locator('body').innerText();
  const shipHasResearchChromeOff = hasResearchShellChrome(shipBodyTextOff);
  record(
    'P2-W6',
    'Ship tab (Labs OFF) shows NO research-chrome tab bar — Production/Analysis/Engine/Codex not ALL present together (the leak this component closes)',
    !shipHasResearchChromeOff,
    shipHasResearchChromeOff
      ? 'Production/Analysis/Engine/Codex all found together on the Ship tab — the old studio-shell leak has returned'
      : 'research-shell tab-bar text not found (as a full set) on the Ship tab',
  );
  const shipExportLabels = ['PDF', 'Fountain', 'Final Draft', 'Word'];
  const shipExportCounts = await Promise.all(
    shipExportLabels.map((label) => pageA.getByRole('button', { name: new RegExp(`^${label}`, 'i') }).count()),
  );
  record(
    'P2-W6',
    'Ship tab (Labs OFF): all four export actions (PDF/Fountain/Final Draft/Word) reachable from ShipPanel',
    shipExportCounts.every((n) => n >= 1),
    `counts=${JSON.stringify(Object.fromEntries(shipExportLabels.map((l, i) => [l, shipExportCounts[i]])))}`,
  );
  const shipSnapshotsHeadingOff = await pageA.getByText('Script Snapshots', { exact: true }).count();
  record(
    'P2-W6',
    'Ship tab (Labs OFF): snapshots/versions list reachable ("Script Snapshots")',
    shipSnapshotsHeadingOff >= 1,
    `count=${shipSnapshotsHeadingOff}`,
  );
  const shipVerifyLinkOff = await pageA.getByRole('link', { name: /verify a report/i }).count();
  record(
    'P2-W6',
    'Ship tab (Labs OFF): independent-verification pointer reachable ("Verify a report" -> #verify, same route as StartScreen\'s own link)',
    shipVerifyLinkOff >= 1,
    `count=${shipVerifyLinkOff}`,
  );
  // Closes the flagged item from docs/p1-benchmark/SURFACE_REVALIDATION_2026-08-04.md
  // ("Ship-tab toolbar row also has a 'Simulate' button ... Labs-agnostic path to
  // the same simulate action that otherwise requires Labs ON"): the Ship task tab
  // is already open from the assertions above, so check its action-strip row (NOT
  // the persistent top Toolbar, whose own Simulate control carries a distinct
  // "Simulate in Story Machine" aria-label and isn't the flagged element) for the
  // exact-text "Simulate" button now that it's gated behind onOpenStoryMachine.
  const simulateBtnOff = pageA.getByRole('button', { name: 'Simulate', exact: true });
  const simulateCountOff = await simulateBtnOff.count();
  record(
    'P2',
    'Ship toolbar row: "Simulate" button ABSENT with Labs OFF (closes SURFACE_REVALIDATION_2026-08-04.md flagged item)',
    simulateCountOff === 0,
    `found ${simulateCountOff} matching button(s) on the Ship toolbar row`,
  );

  // The persistent top Toolbar's own Simulate control (distinct element,
  // aria-label "Simulate in Story Machine") was the adjacent finding logged
  // when the Ship-row button was gated. It is hidden — not merely disabled —
  // when Labs is off, because ScriptIDE withholds onSimulateScript entirely.
  const persistentSimOff = pageA.getByRole('button', { name: 'Simulate in Story Machine', exact: true });
  const persistentSimCountOff = await persistentSimOff.count();
  record(
    'P2',
    'Persistent Toolbar: "Simulate in Story Machine" control ABSENT with Labs OFF (adjacent finding closed)',
    persistentSimCountOff === 0,
    `found ${persistentSimCountOff} matching control(s) in the persistent Toolbar`,
  );

  await pageA.getByRole('button', { name: 'Write', exact: true }).first().click();
  await pageA.waitForTimeout(timing.ms(150));

  // ── Decision #3, second entry point: the command palette. E5's rule is that
  // every palette row dispatches through the same callback a visible control
  // calls — so a gated control whose palette row survived would be a real
  // bypass, not a cosmetic one. ────────────────────────────────────────────
  const editorA = pageA.locator('.cm-content').first();
  await editorA.waitFor({ timeout: timing.ms(10000) });
  await editorA.focus();
  await pageA.keyboard.press(`${MOD}+k`);
  const paletteA = pageA.getByRole('dialog', { name: 'Command palette' });
  const paletteOpenedA = await paletteA.waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
  record('P2-generative', 'Command palette opens on the default surface (Cmd/Ctrl+K)', paletteOpenedA, '');
  if (paletteOpenedA) {
    await pageA.keyboard.type('analysis', { delay: 10 });
    await pageA.waitForTimeout(timing.ms(200));
    const autoAnalysisRowsOff = await pageA.getByRole('option', { name: /auto-analysis/i }).count();
    record(
      'P2-generative',
      'Command palette omits the auto-analysis command with Labs OFF',
      autoAnalysisRowsOff === 0,
      `matching option rows=${autoAnalysisRowsOff}`,
    );
    // The palette must still be USEFUL — this is a gate, not a lobotomy.
    await pageA.keyboard.press('Control+a');
    await pageA.keyboard.type('coverage', { delay: 10 });
    await pageA.waitForTimeout(timing.ms(200));
    const doctorRowOff = await pageA.getByRole('option', { name: /diagnose this draft/i }).count();
    record(
      'P2-generative',
      'Command palette still offers the deterministic Doctor command with Labs OFF',
      doctorRowOff >= 1,
      `matching option rows=${doctorRowOff}`,
    );
    await pageA.keyboard.press('Escape');
    await pageA.waitForTimeout(timing.ms(150));
  }

  // ── Decision #3, third entry point: Settings' five AI-provider tabs
  // (Providers / Text LLM / Image / TTS / Embeddings). They exist only to
  // point a generative feature at an endpoint, a model and an API key, and
  // with the generative surface demoted there is nothing on the default
  // surface that can consume any of them — so an API-key form on the keyless
  // front door would invite a writer to paste a secret into a deployment that
  // will not use it. Hidden, not shown-and-inert. Session (Delete Everything)
  // and Labs (the way back) must survive, and do: the strip goes 8 -> 3. ───
  const settingsTabsOff = await openSettingsTabLabels(pageA);
  const AI_PROVIDER_TABS = ['Providers', 'Text LLM', 'Image', 'TTS', 'Embeddings'];
  const leakedProviderTabs = AI_PROVIDER_TABS.filter((t) => settingsTabsOff.includes(t));
  record(
    'P2-generative',
    'Settings: all five AI-provider tabs (Providers/Text LLM/Image/TTS/Embeddings) ABSENT with Labs OFF',
    leakedProviderTabs.length === 0,
    `tabs=${JSON.stringify(settingsTabsOff)} leaked=${JSON.stringify(leakedProviderTabs)}`,
  );
  record(
    'P2-generative',
    'Settings: "Session" STILL reachable with Labs OFF (the only route to Delete Everything)',
    settingsTabsOff.includes('Session'),
    `tabs=${JSON.stringify(settingsTabsOff)}`,
  );
  record(
    'P2-generative',
    'Settings: "Labs" STILL reachable with Labs OFF (the only route back to the generative half)',
    settingsTabsOff.includes('Labs'),
    `tabs=${JSON.stringify(settingsTabsOff)}`,
  );
  await pageA.getByRole('tab', { name: 'Labs', exact: true }).click();
  await pageA.waitForTimeout(timing.ms(200));
  // Scoped to the Settings dialog specifically: Sidebar.tsx's own
  // Scenes/Characters switcher (2026-09-04 a11y pass) is now ALSO a real
  // role="tablist"/tab"/"tabpanel" set, so an unscoped `[role="tabpanel"]`
  // match can resolve to Sidebar's (which sits earlier in the DOM) instead
  // of Settings' own.
  const labsPanelTextOff = await pageA.getByRole('dialog', { name: /settings/i }).locator('[role="tabpanel"]').first().innerText();
  record(
    'P2-generative',
    'Settings -> Labs says, in one line, where the generative features went',
    /Generative features live in Labs/i.test(labsPanelTextOff),
    `panel text=${JSON.stringify(labsPanelTextOff.slice(0, 240))}`,
  );
  await pageA.getByRole('button', { name: /close settings/i }).first().click();
  await pageA.waitForTimeout(timing.ms(200));

  // ══════════════════════════════════════════════════════════════════════
  // P3 — THE VERIFY LOOP, still Labs OFF (verify is deliberately outside
  // the Labs gate — see VerifyReport.tsx's own header comment).
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== P3 — sample coverage -> export -> #verify round-trip ===');

  // Clean slate so the sample flow starts from StartScreen again (the
  // "Start fresh" draft above persisted a config into localStorage).
  await pageA.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  await pageA.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });

  const summaryBeforeP3Res = await fetch(`${BASE}/api/events/summary`);
  const summaryBeforeP3 = await summaryBeforeP3Res.json();

  const eventPosts = [];
  pageA.on('request', (req) => {
    if (req.method() === 'POST' && /\/api\/events$/.test(req.url())) {
      try {
        const body = JSON.parse(req.postData() ?? '{}');
        eventPosts.push(body.name);
      } catch { /* ignore unparseable */ }
    }
  });

  const sampleCta2 = pageA.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta2.click({ timeout: timing.ms(15000) });
  // Phase E exit-gate punch list, P2: CoverageSummary now streams its
  // progress from POST /api/scriptide/doctor/stream (src/lib/doctor-
  // stream.ts) instead of awaiting one JSON response from the plain
  // /doctor route. An SSE response's HTTP headers (and 200 status) arrive
  // as soon as the connection opens — long before the 14-pass analysis
  // actually finishes streaming its result — so waiting on that response
  // event (the old strategy here) raced ahead of the render and always
  // caught the still-loading state. Poll for the rendered verdict itself,
  // which is the thing this assertion actually cares about, with a
  // timeout budget generous enough for a real run (matches the old
  // waitForResponse's 30s allowance).
  //
  // 2026-09-05: this wait used to poll `document.body.innerText` for
  // /RECOMMEND|CONSIDER|PASS/ across the WHOLE page, and innerText reflects
  // CSS text-transform — so the loading line "Running pass 1 of 14…", rendered
  // uppercase, satisfied it. The suite then clicked "Full report" DURING the
  // sample run, unmounting CoverageSummary mid-flight (its own `stale` guard
  // then correctly refuses to install the sample or hand the report up), and
  // asserted the hydration contract against a panel that had nothing to
  // hydrate from. Wait for the summary's OWN "Full report" button instead —
  // it renders only once a report is on screen — and read the verdict from
  // the summary panel alone, where no progress copy lives. Caught by driving
  // it: [debug] "verdict-wait matched line: RUNNING PASS 1 OF 14…".
  const summaryPanel = pageA.locator('aside[role="region"]');
  const summaryFullReportBtn = summaryPanel.getByRole('button', { name: 'Full report', exact: true }).first();
  const summaryReportRendered = await summaryFullReportBtn
    .waitFor({ state: 'visible', timeout: timing.ms(30000) })
    .then(() => true)
    .catch(() => false);
  const summaryText = summaryReportRendered ? await summaryPanel.first().innerText() : '';
  const verdictRendered = summaryReportRendered && /RECOMMEND|CONSIDER|PASS/.test(summaryText);
  record('P3', 'Sample coverage produces a rendered verdict (Doctor reachable end to end)', verdictRendered, `summary panel verdict text present=${verdictRendered}`);

  const fullReportBtn = pageA.getByRole('button', { name: 'Full report', exact: true }).first();
  // W4 (docs/PATH_TO_EXCELLENCE.md Phase W): "Full report" used to unmount
  // CoverageSummary and cold-mount ScriptDoctorPanel with autoLoadSample=
  // false — landing on an idle "Run Diagnosis" prompt even though
  // CoverageSummary had ALREADY computed a full report against this exact
  // sample text, forcing the writer to re-pay the whole 14-pass diagnosis.
  // The fix threads that report through ScriptIDE.tsx (ThreadedCoverageReport,
  // src/lib/coverage-staleness.ts) as ScriptDoctorPanel's `initialReport`
  // prop, so the panel hydrates straight into its success state at mount —
  // no second /api/scriptide/doctor call, no "Run Diagnosis" click needed.
  // Assert BOTH directions: the redundant call/click must be gone, and the
  // Export button (which only ever renders once a real report is on screen)
  // must already be there without it.
  let secondDoctorCallSeen = false;
  const onSecondDoctorCall = (req) => {
    if (/\/api\/scriptide\/doctor(?!\/)/.test(req.url())) secondDoctorCallSeen = true;
  };
  pageA.on('request', onSecondDoctorCall);
  await fullReportBtn.click();
  await pageA.waitForSelector('[role="dialog"]', { timeout: timing.ms(10000) });

  const exportBtn = pageA.getByRole('button', { name: 'Export coverage report as an HTML document', exact: true }).first();
  const runDiagnosisBtnW4 = pageA.getByRole('button', { name: 'Run Diagnosis', exact: true }).first();
  const exportVisibleImmediately = await exportBtn
    .waitFor({ state: 'visible', timeout: timing.ms(5000) })
    .then(() => true)
    .catch(() => false);
  const idleRunDiagnosisVisible = await runDiagnosisBtnW4.isVisible().catch(() => false);
  pageA.off('request', onSecondDoctorCall);
  record(
    'P3-W4',
    'Full report hydrates the already-computed report immediately — no idle "Run Diagnosis" cold-mount',
    exportVisibleImmediately && !idleRunDiagnosisVisible && !secondDoctorCallSeen,
    `exportVisibleImmediately=${exportVisibleImmediately} idleRunDiagnosisVisible=${idleRunDiagnosisVisible} secondDoctorCallSeen=${secondDoctorCallSeen}`,
  );
  await pageA.waitForTimeout(timing.ms(400));

  const [download] = await Promise.all([
    pageA.waitForEvent('download', { timeout: timing.ms(20000) }),
    exportBtn.click(),
  ]);
  const downloadPath = await download.path();
  const exportedHtml = downloadPath ? readFileSync(downloadPath, 'utf8') : '';
  record('P3', 'Export coverage report downloads an HTML file', exportedHtml.length > 0, `${exportedHtml.length} bytes, filename=${download.suggestedFilename()}`);

  // ══════════════════════════════════════════════════════════════════════
  // B-8 (2026-09-05, docs/audits mistake hunt) — a real 375px pointer click
  // on "Full report" used to have no guarantee of landing on the button at
  // all: at 375px the panel's content can exceed the viewport, and nothing
  // kept the button from ending up past the fold or behind whatever the
  // scrollable body's last-painted content was — a plain `visible`/`enabled`
  // assertion (which every other "Full report" check in this suite makes,
  // at desktop width) can never catch that, only a REAL click through the
  // real pointer path, with no `force`, at the narrow viewport can. Own
  // browser context + fresh profile so pageA's already-hydrated Doctor
  // panel above is untouched.
  const context375 = await browser.newContext({ viewport: { width: 375, height: 720 } });
  const page375 = await context375.newPage();
  wireConsoleCapture(page375, genuineConsoleErrors);
  await page375.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await page375.getByRole('button', { name: /try sample coverage/i }).first().click({ timeout: timing.ms(15000) });
  const summaryPanel375 = page375.locator('aside[role="region"]');
  const fullReportBtn375 = summaryPanel375.getByRole('button', { name: 'Full report', exact: true }).first();
  await fullReportBtn375.waitFor({ state: 'visible', timeout: timing.ms(30000) });
  // The hit-test itself: what a real tap at the button's own center actually
  // lands on, BEFORE Playwright's own click() does anything (no scrollIntoView,
  // no actionability wait) — this is the exact measurement the mistake hunt
  // made (`document.elementFromPoint`), reproduced live rather than inferred
  // from visibility.
  const rect375 = await fullReportBtn375.boundingBox();
  const hit375 = rect375
    ? await page375.evaluate(
        ([x, y]) => {
          const el = document.elementFromPoint(x, y);
          return el ? { tag: el.tagName, isFullReportBtn: el.textContent?.trim() === 'Full report' && el.tagName === 'BUTTON' } : null;
        },
        [rect375.x + rect375.width / 2, rect375.y + rect375.height / 2],
      )
    : null;
  record(
    'P3-mobile',
    'at 375px, a real tap at the "Full report" button\'s own center hits the button itself (not overlapping content)',
    !!hit375?.isFullReportBtn,
    `rect=${JSON.stringify(rect375)} hit=${JSON.stringify(hit375)}`,
  );

  // Round-3 review, non-blocking item 1 (2026-09-05): the STATUS BAR's OWN
  // "Open full report" toggle (ScriptIDE.tsx, distinct from the panel's own
  // sticky-footer button above) sits directly underneath the coverage
  // `aside` at 375px, which is `h-dvh w-full` — genuinely edge-to-edge over
  // the ENTIRE viewport at this width (measured: its own header paints over
  // this button's whole row, all the way to y=0), so a real, non-force
  // click here could never reach it. That part matches "the panel's own
  // controls are the route" and costs nothing on its own. The actual defect
  // was narrower: this control had NO focus trap protecting it (the aside
  // is `role="region"`, not a modal), so keyboard Tab could still land a
  // writer on a button they cannot see, sitting behind an opaque
  // full-screen panel — reachable by keyboard, not by pointer, an
  // inconsistency neither input mode should have. Fixed by removing it
  // from BOTH paths at once (`max-sm:!hidden`) rather than making the
  // pointer path succeed — raising this button's stacking above the aside
  // was tried and rejected: it renders a stray "FULL REPORT" pill floating
  // over the verdict paragraph's own text, on top of the correct one
  // already visible in the sticky footer a few lines below it (kept as a
  // screenshot in the round-3 report) — a worse, more confusing state than
  // the one being fixed. Both halves are asserted: the real click still
  // legitimately cannot reach it (unchanged, and correctly so), and it is
  // no longer part of the accessibility tree at all while covered — no
  // reachable-by-keyboard-only phantom control remains.
  const toolbarToggle375 = page375.getByRole('button', { name: 'Open full report' });
  const toolbarToggle375Count = await toolbarToggle375.count();
  let toolbarToggle375Clicked = false;
  if (toolbarToggle375Count > 0) {
    try {
      await toolbarToggle375.first().click({ timeout: timing.ms(5000) });
      toolbarToggle375Clicked = true;
    } catch { /* expected: recorded below */ }
  }
  record(
    'P3-mobile',
    'at 375px, the STATUS BAR\'s own "Open full report" toggle is removed from the accessibility tree entirely while the coverage panel covers it (no phantom keyboard-reachable control behind an opaque full-screen panel)',
    toolbarToggle375Count === 0 && !toolbarToggle375Clicked,
    `count=${toolbarToggle375Count} clicked=${toolbarToggle375Clicked}`,
  );

  let dialog375Opened = false;
  try {
    await fullReportBtn375.click({ timeout: timing.ms(10000) });
    await page375.waitForSelector('[role="dialog"]', { timeout: timing.ms(10000) });
    dialog375Opened = true;
  } catch { /* recorded as false below */ }
  record('P3-mobile', 'at 375px, a real (non-force) pointer click on "Full report" opens the full Doctor report', dialog375Opened);
  await context375.close();

  // 2026-09-04 (honesty-audit matrix fix) — the exported coverage HTML
  // (server/lib/coverage-html.ts) previously carried NO percentile or
  // draft-rank line at all (no `percentile` token anywhere in that file).
  // Both are additive and gated on data being present; a fresh sample report
  // always carries a healthPercentile, and ScriptDoctorPanel.tsx always
  // computes a draftRank (computeDraftRank returns {rank:1,of:1} even with
  // zero saved snapshots — never null for a finite health), so both must
  // render on this exact download.
  // 2026-09-11 (producer-tier discovery #12): the expected sentence is now
  // DERIVED from the shared gated helper rather than pinned as a regex here, for
  // exactly the reason the draft-rank assertion below already derives its own. A
  // percentile is a band ONLY when the draft sits inside the calibration
  // reference set's scene/word bounds; outside them every surface states
  // "not comparable", and the sample this gate exports (12 scenes, 1,831 words)
  // is outside them. A hardcoded band regex here would have failed the moment the
  // product stopped overclaiming, which is backwards.
  //
  // The expectation is derived from the DOCUMENT'S OWN stated size: the producer
  // tier prints "N scenes · M words", percentileIsComparable decides from that
  // pair whether a band is a meaningful reading, and whichever of the two shared
  // sentences that implies is what must appear. So this assertion checks the
  // export's internal consistency as well as its copy, and it keeps working
  // whichever side of the bounds the sample lands on.
  // The tier's length line renders the separator as a literal U+00B7 (it goes
  // through escapeHtml, which does not entity-encode it), so match both forms
  // rather than assuming either.
  const exportedSizes = /([\d,]+) scenes? (?:&middot;|\u00b7) ([\d,]+) words?/.exec(exportedHtml);
  const exportedSceneCount = exportedSizes ? Number(exportedSizes[1].replace(/,/g, '')) : null;
  const exportedWordCount = exportedSizes ? Number(exportedSizes[2].replace(/,/g, '')) : null;
  const expectComparable = percentileIsComparable(exportedSceneCount, exportedWordCount);
  const bandFormRe = /Health percentile: (?:top|bottom) \d+% within a 20-sample, hand-authored synthetic reference set/;
  const exportedHtmlHasPercentileLine = expectComparable
    ? bandFormRe.test(exportedHtml)
    : exportedHtml.includes(notComparableSentence());
  record(
    'P3',
    'Exported coverage HTML carries the health-percentile line (same shared, gated copy as the panel)',
    exportedSizes !== null && exportedHtmlHasPercentileLine,
    `scenes=${exportedSceneCount} words=${exportedWordCount} comparable=${expectComparable}`,
  );
  // And the other form must be ABSENT — a document that carried both would be
  // stating two readings of one number, which is the defect this gate now covers.
  record(
    'P3',
    'and NOT the other form — one reading of the percentile, not two',
    expectComparable
      ? !exportedHtml.includes(notComparableSentence())
      : !bandFormRe.test(exportedHtml),
  );
  // The rank sentence is built from the SHARED copy helpers
  // (src/lib/draft-rank-copy.ts), never a literal in this file — the browser
  // gate must move with the copy, not pin an older version of it.
  const reEscape = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rankedDraftRankLineRe = new RegExp(
    `Rank among your drafts: (?:tied )?\\w+ of \\d+ ${reEscape(draftRankDenominatorLabel())} \\(by health\\)`,
  );
  const firstDraftRankLineRe = new RegExp(
    `First saved draft — rank among your drafts appears after ${reEscape(draftRankNextOpportunityLabel())}`,
  );
  // 2026-09-05 (B-6): this download is of the built-in SAMPLE (the golden
  // path threads it in from StartScreen). A demo is not one of the writer's
  // drafts, so it carries no rank — not the ranked sentence, and not the
  // "first saved draft" one either, which would have been a plain falsehood
  // about a script the writer did not write. The rank line's own coverage
  // moved to the WRITER's draft, further down this section (search
  // "P3-provenance"), where it is a true claim — and both places test the
  // same two shared-copy regexes built above.
  const draftRankClaimOnSampleExport =
    rankedDraftRankLineRe.test(exportedHtml)
    || firstDraftRankLineRe.test(exportedHtml)
    || /Rank among your drafts/.test(exportedHtml)
    || /First saved draft/.test(exportedHtml);
  record(
    'P3',
    'Exported coverage HTML of the SAMPLE makes no draft-rank claim (it is not the writer\'s draft)',
    !draftRankClaimOnSampleExport,
    draftRankClaimOnSampleExport ? 'a draft-rank sentence appears in a sample-sourced export' : '',
  );

  // "Coverage letter" (POST /api/export/coverage-letter) — the connected-
  // prose sibling of Export report above, added to ScriptDoctorPanel.tsx
  // beside Export report / Breakdown CSV / Pitch kit. Same toolbar, same
  // complete report already on screen: assert the action is reachable
  // (visible and enabled — the route 422s on an incomplete analysis, so this
  // is the one state where it must NOT be disabled) and that clicking it
  // actually produces a downloadable Markdown file carrying the letter's own
  // sections, not just that a button with the right label exists.
  const coverageLetterBtn = pageA
    .getByRole('button', { name: 'Export a connected-prose coverage letter as Markdown', exact: true })
    .first();
  const coverageLetterVisible = await coverageLetterBtn.isVisible().catch(() => false);
  const coverageLetterEnabled = coverageLetterVisible && await coverageLetterBtn.isEnabled().catch(() => false);
  record(
    'P3',
    'Coverage letter export action is reachable (visible and enabled) on a complete report',
    coverageLetterVisible && coverageLetterEnabled,
    `visible=${coverageLetterVisible} enabled=${coverageLetterEnabled}`,
  );

  const [letterDownload] = await Promise.all([
    pageA.waitForEvent('download', { timeout: timing.ms(20000) }),
    coverageLetterBtn.click(),
  ]);
  const letterDownloadPath = await letterDownload.path();
  const letterMarkdown = letterDownloadPath ? readFileSync(letterDownloadPath, 'utf8') : '';
  record(
    'P3',
    'Coverage letter export downloads a Markdown file with the expected sections',
    letterMarkdown.includes('## How to Read This Report') && /-coverage-letter\.md$/.test(letterDownload.suggestedFilename()),
    `${letterMarkdown.length} bytes, filename=${letterDownload.suggestedFilename()}`,
  );

  // ── Finding #9 (2026-09-12), presentation half: ONE number in the report may
  // be presented as the health of the draft. On the sample the panel stated
  // three — HEALTH 78 in the header, "Health score: 35/100" in Story Structure
  // Analysis, and "Graph Health 37/100 −9hp" in Structural Analysis, the last in
  // the header's own "hp" unit, in stamp red, with no caption.
  // server/nvm/analyze/types.ts:403-405 says those panels are diagnostics that
  // are NOT part of health/verdict. The panel is still open on the same complete
  // sample report the exports above used.
  const diagnosticLabelCount = await pageA.locator('[data-diagnostic-not-health]').count();
  record(
    'P3-onehealth',
    'every diagnostic score in the report carries a visible "diagnostic — not part of Health" label',
    diagnosticLabelCount >= 2,
    `labelled slots rendered=${diagnosticLabelCount}`,
  );
  const diagnosticLabelText = await pageA
    .locator('[data-diagnostic-not-health]')
    .evaluateAll((els) => els.map((el) => el.textContent.replace(/\s+/g, ' ').trim()));
  record(
    'P3-onehealth',
    'each label actually says it is not part of Health (an empty marker would pass the count above)',
    diagnosticLabelText.length > 0 && diagnosticLabelText.every((t) => /not part of (the )?Health/i.test(t)),
    `labels=${JSON.stringify(diagnosticLabelText.slice(0, 4))}`,
  );
  const healthWordings = await pageA.evaluate(() => {
    const text = document.body.innerText;
    return {
      // The mid-report diagnostic must no longer borrow the header's own two
      // words for a number that is not the document's health.
      bareHealthScoreLine: (text.match(/(?<![A-Za-z])Health score: \d+\/100/g) ?? []).length,
      graphHealthScoreLine: (text.match(/Graph health score: \d+\/100/gi) ?? []).length,
      graphHealthRow: (text.match(/Graph Health\s*\n?\s*\d+\/100/gi) ?? []).length,
    };
  });
  record(
    'P3-onehealth',
    'the Story Structure diagnostic is named "Graph health score", not "Health score" (the words the header uses for the one real number)',
    healthWordings.bareHealthScoreLine === 0 && healthWordings.graphHealthScoreLine >= 1,
    JSON.stringify(healthWordings),
  );

  // ── Findings #4 and #14 (2026-09-12): the Craft Dimensions badges. The panel
  // rendered the UNGATED band for each dimension while the headline percentile
  // 227 lines above went through the gate, so the same scrolling document said
  // "not comparable" and "TOP 10%" about the same reference set — and
  // percentileBand(20) says "top 80%", which reads as praise on a bottom-quartile
  // dimension. The sample is 12 scenes / ~1,830 words, outside the reference set's
  // 9–10 scene / 256–337 word bounds, so every badge here must withhold.
  const dimensionBadges = await pageA
    .locator('[data-dimension-percentile-badge]')
    .evaluateAll((els) => els.map((el) => el.textContent.replace(/\s+/g, ' ').trim()));
  const dimensionCaption = await pageA
    .locator('[data-dimension-percentile-caption]')
    .first()
    .textContent()
    .then((t) => (t ?? '').replace(/\s+/g, ' ').trim())
    .catch(() => '');
  record(
    'P3-dimbadge',
    'the Craft Dimensions section renders its five badges through the shared gated copy',
    dimensionBadges.length === 5,
    `badges=${JSON.stringify(dimensionBadges)}`,
  );
  record(
    'P3-dimbadge',
    'every dimension badge agrees with the headline: "not comparable" on a draft outside the reference set\'s bounds',
    dimensionBadges.length > 0 && dimensionBadges.every((t) => /not comparable/i.test(t)),
    `badges=${JSON.stringify(dimensionBadges)}`,
  );
  record(
    'P3-dimbadge',
    'no badge reads as praise ("top N%") on a draft the gate excludes',
    dimensionBadges.every((t) => !/top \d+%/i.test(t)),
    `badges=${JSON.stringify(dimensionBadges)}`,
  );
  record(
    'P3-dimbadge',
    'the section caption does not promise a comparison the badges withhold',
    /^No percentile badges/i.test(dimensionCaption),
    `caption=${JSON.stringify(dimensionCaption.slice(0, 200))}`,
  );
  const dimensionBadgeTooltips = await pageA
    .locator('[data-dimension-percentile-badge]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('title') ?? ''));
  record(
    'P3-dimbadge',
    'each withheld badge explains WHY in its tooltip, and states no exact rank',
    dimensionBadgeTooltips.length > 0
      && dimensionBadgeTooltips.every((t) => /no percentile/i.test(t) && !/Exact rank/i.test(t)),
    `tooltip[0]=${JSON.stringify((dimensionBadgeTooltips[0] ?? '').slice(0, 220))}`,
  );

  // ── Shape & Rhythm (2026-09-04) — server/nvm/analyze/structural-signals.ts
  // surfaced, advisory-only, in ScriptDoctorPanel.tsx. The panel is still
  // open on the same complete sample report the export checks above just
  // used. Proves: the section renders on the sample script, and clicking a
  // scene bar moves the editor — same `.cm-sm-finding-flash` proof proof A
  // in verify-ui-polish-affordances.mjs uses for "Jump to line". ──────────
  const shapeRhythmHeading = pageA.getByRole('button', { name: /Shape & Rhythm/i }).first();
  const shapeRhythmVisible = await shapeRhythmHeading.isVisible().catch(() => false);
  record('P3-shape-rhythm', 'Script Doctor renders a "Shape & Rhythm" section on the sample script', shapeRhythmVisible);

  if (shapeRhythmVisible) {
    const notPartOfScoreCount = await pageA.getByText(/not part of the score/i).count();
    record('P3-shape-rhythm', 'the section labels its readings "not part of the score"', notPartOfScoreCount >= 1, `matches=${notPartOfScoreCount}`);

    const talkSwingCount = await pageA.getByText(/Talk\/action swing/i).count();
    const actionVariationCount = await pageA.getByText(/Action-prose variation/i).count();
    record(
      'P3-shape-rhythm',
      'both document aggregates (talk/action swing, action-prose variation) render',
      talkSwingCount >= 1 && actionVariationCount >= 1,
      `talkSwing=${talkSwingCount} actionVariation=${actionVariationCount}`,
    );

    const sceneGroup = pageA.getByRole('group', { name: /Per-scene shape and rhythm readings/i }).first();
    const sceneBar = sceneGroup.locator('button[title*="—"]').first();
    const sceneBarCount = await sceneBar.count();
    record('P3-shape-rhythm', 'the per-scene strip renders at least one scene bar', sceneBarCount > 0, `count=${sceneBarCount}`);

    if (sceneBarCount > 0) {
      const flashBeforeShapeClick = await pageA.locator('.cm-sm-finding-flash').count();
      await sceneBar.click();
      const flashedFromSceneBar = await pageA
        .waitForSelector('.cm-sm-finding-flash', { timeout: timing.ms(2000) })
        .then(() => true)
        .catch(() => false);
      record(
        'P3-shape-rhythm',
        'clicking a scene bar moves the editor (paints the same highlightRange decoration "Jump to line" uses)',
        flashedFromSceneBar,
        `flashBefore=${flashBeforeShapeClick} flashedAfterClick=${flashedFromSceneBar}`,
      );
    }
  }

  // ── Decision #3, inside Script Doctor itself. The panel is open on a real,
  // complete report — the exact state where "Fix & verify" (POST
  // /api/scriptide/fix, an LLM rewrite) renders under each root cause. With
  // Labs OFF the whole fixState is withheld, so no button renders at all —
  // hide, don't disable, the same rule the Toolbar's Simulate control follows.
  // Deliberately AFTER the export above: this block changes the panel's active
  // source, and the export needed the sample report intact. ────────────────
  const fixVerifyCountOff = await pageA.getByRole('button', { name: /fix & verify/i }).count();
  record(
    'P2-generative',
    'Script Doctor: "Fix & verify" (POST /api/scriptide/fix) ABSENT on a complete report with Labs OFF',
    fixVerifyCountOff === 0,
    `found ${fixVerifyCountOff} button(s)`,
  );
  // The deterministic half of the same card must survive — this is a gate on
  // generation, not on the report.
  // (2026-09-06, item #10) The disclosure used to be named "Show the N
  // contributing notes" while the card headline above it said "N issues" — two
  // words for two different counts on one card. It now says "Show the N rules
  // behind them" and the headline states both numbers; this gate matches the
  // shared label helper rather than a literal, so the next rename moves it too.
  const rootCauseHeadingOff = await pageA.getByRole('button', { name: ROOT_CAUSE_EXPANDER_NAME_RE }).count();
  record(
    'P2-generative',
    'Script Doctor: root-cause findings still render with Labs OFF (deterministic content untouched)',
    rootCauseHeadingOff >= 1,
    `member-rule disclosures=${rootCauseHeadingOff}`,
  );


  // ── "Verify my rewrite" (2026-09-04) — the DETERMINISTIC half of
  // fix-and-verify, which must survive the Labs gate that hides the
  // generative half. Decision #3's own rationale is about unevaluated LLM
  // OUTPUT sitting next to a measured score; this control produces none (see
  // that decision's 2026-09-04 amendment). The adversarial audit that
  // prompted it found the fix receipt's entire render path unreachable on a
  // keyless deploy — which is every deploy this suite boots — so the proof
  // has to be an end-to-end one: edit the draft, click, get a receipt with
  // real numbers in it. Same page, same complete sample report, Labs OFF. ──
  // ── Provenance at the SECOND entry point (B-5/B-6, 2026-09-05) ──────────
  // Everything above ran against the report threaded in from StartScreen's
  // "Try sample coverage" — the built-in DEMO, not the writer's draft. Two
  // things must hold in that state, and neither did before this fix: the rank
  // line must not rank a demo among the writer's own drafts (it ranked it,
  // and the demo's 78 took first place from real work), and "Verify my
  // rewrite" must be withheld with a reason (it was OFFERED here, because the
  // guard read `uploadedFile`, which is null on the threaded path — the panel-
  // loaded sample one click away withheld it correctly all along).
  const sampleNotRankedCount = await pageA
    .getByText('The sample is not ranked against your drafts', { exact: false })
    .count();
  record(
    'P3-provenance',
    'the threaded SAMPLE report says plainly that it is not ranked among the writer\'s drafts',
    sampleNotRankedCount >= 1,
    `matches=${sampleNotRankedCount}`,
  );
  const rankedClaimOnSample = await pageA.getByText(/Rank among your drafts:/).count();
  record(
    'P3-provenance',
    'the threaded SAMPLE report never ranks the demo among the writer\'s own drafts',
    rankedClaimOnSample === 0,
    `"Rank among your drafts:" matches=${rankedClaimOnSample}`,
  );

  const verifyOnSample = pageA.getByRole('button', { name: 'Verify my rewrite', exact: true }).first();
  const verifyOnSampleVisible = await verifyOnSample.isVisible().catch(() => false);
  const verifyOnSampleDisabled = verifyOnSampleVisible
    ? await verifyOnSample.isDisabled().catch(() => false)
    : false;
  const sampleWithholdReasons = await pageA.getByText(/built-in sample script, not your draft/).count();
  record(
    'P3-provenance',
    '"Verify my rewrite" is withheld — visibly, and with a reason — on the sample reached from StartScreen',
    verifyOnSampleVisible && verifyOnSampleDisabled && sampleWithholdReasons >= 1,
    `visible=${verifyOnSampleVisible} disabled=${verifyOnSampleDisabled} reasons=${sampleWithholdReasons}`,
  );

  // The sample's text IS the editor draft by now (the golden path installs it),
  // so re-running the diagnosis from the panel produces a report of the
  // WRITER's own draft — the provenance every assertion below this point
  // needs, and the one where a draft rank is a true claim.
  const rerunBtn = pageA.getByRole('button', { name: 'Re-run diagnosis', exact: true }).first();
  await rerunBtn.click({ timeout: timing.ms(15000) });
  const rerunLanded = await pageA
    .waitForFunction(
      () => {
        const t = document.body.innerText;
        return !t.includes('The sample is not ranked against your drafts')
          && /Rank among your drafts|First saved draft/.test(t);
      },
      undefined,
      { timeout: timing.ms(120000) },
    )
    .then(() => true)
    .catch(() => false);
  record(
    'P3-provenance',
    'Re-run diagnosis on the editor draft produces a report of the WRITER\'s own draft (the rank line returns)',
    rerunLanded,
    rerunLanded ? '' : 'no draft-rank line after re-running the diagnosis on the editor draft',
  );

  // …and THAT report's export carries the draft-rank line (the coverage the
  // sample-export assertion above deliberately gave up).
  const [draftDownload] = await Promise.all([
    pageA.waitForEvent('download', { timeout: timing.ms(20000) }),
    exportBtn.click(),
  ]);
  const draftDownloadPath = await draftDownload.path();
  const draftExportedHtml = draftDownloadPath ? readFileSync(draftDownloadPath, 'utf8') : '';
  const draftExportHasRankLine =
    rankedDraftRankLineRe.test(draftExportedHtml) || firstDraftRankLineRe.test(draftExportedHtml);
  record(
    'P3-provenance',
    'Exported coverage HTML of the WRITER\'s own draft carries the draft-rank line',
    draftExportHasRankLine,
    `${draftExportedHtml.length} bytes, filename=${draftDownload.suggestedFilename()}`,
  );

  const verifyBtn = pageA.getByRole('button', { name: 'Verify my rewrite', exact: true }).first();
  const verifyVisibleOff = await verifyBtn.isVisible().catch(() => false);
  record(
    'P2-generative',
    '"Verify my rewrite" (deterministic, no LLM) IS present on a complete report with Labs OFF',
    verifyVisibleOff,
    `visible=${verifyVisibleOff}`,
  );

  if (verifyVisibleOff) {
    // Edit the draft the way a writer would — in the editor, which sits to
    // the left of the Script Doctor drawer and stays interactive while it is
    // open (the same editor the Shape & Rhythm scene-bar click above drives).
    // A whole new scene is a change the deterministic doctor is guaranteed to
    // read differently: scene count is the dominant term in the health
    // formula (CLAUDE.md's AUC note), so this cannot produce a coincidental
    // zero delta the way a cosmetic word swap might.
    const editorForVerify = pageA.locator('.cm-content').first();
    await editorForVerify.focus();
    await pageA.keyboard.press('Control+End');
    await pageA.keyboard.type('\n\nINT. UNUSED STOREROOM - NIGHT\n\nA single chair faces a wall.\n');

    // The caption that says the draft is unchanged must be gone now — proof
    // the panel is reading LIVE editor text, not the report's frozen copy.
    const unchangedCaptionCount = await pageA.getByText(/Your draft is unchanged since this report/i).count();
    record(
      'P2-generative',
      'the verify affordance reads LIVE editor text (the "draft is unchanged" caption clears after an edit)',
      unchangedCaptionCount === 0,
      `captions=${unchangedCaptionCount}`,
    );

    await verifyBtn.click({ timeout: timing.ms(15000) });

    // Two full 14-pass analyses server-side (baseline + candidate), on the
    // pooled doctor — generous, and scaled by the suite's load policy.
    const receipt = pageA.locator('[data-fix-receipt="writer"]').first();
    const receiptRendered = await receipt
      .waitFor({ state: 'visible', timeout: timing.ms(60000) })
      .then(() => true)
      .catch(() => false);
    record(
      'P2-generative',
      'clicking "Verify my rewrite" renders a writer-verified receipt (POST /api/scriptide/fix, usedLLM false)',
      receiptRendered,
      receiptRendered ? '' : 'no [data-fix-receipt="writer"] card appeared',
    );

    if (receiptRendered) {
      const receiptText = await receipt.innerText();
      // One decimal on each endpoint since 2026-09-05 (B-7): the card used to
      // print whole numbers beside a one-decimal delta chip ("Health 65 → 66"
      // next to "+1.5" for a real 64.6 → 66.1), so the arithmetic a reader can
      // do on screen did not close. `\d+(?:\.\d+)?` accepts either shape —
      // this assertion is about the delta being REAL, not about its format.
      const healthPair = /Health\s+(\d+(?:\.\d+)?)\s*→\s*(\d+(?:\.\d+)?)/.exec(receiptText);
      const movedHealth = !!healthPair && healthPair[1] !== healthPair[2];
      record(
        'P2-generative',
        'the receipt reports a real measured health delta (before → after, and they differ)',
        movedHealth,
        healthPair ? `${healthPair[1]} -> ${healthPair[2]}` : 'no "Health N → M" line in the receipt',
      );

      // Case-insensitive: both headings render through a text-transform:
      // uppercase class, and innerText honours that.
      const hasDeltaLists = /Cleared \(\d+\)/i.test(receiptText) && /Introduced \(\d+\)/i.test(receiptText);
      record(
        'P2-generative',
        'the receipt shows cleared AND introduced findings at equal prominence',
        hasDeltaLists,
        hasDeltaLists ? '' : receiptText.replace(/\s+/g, ' ').slice(0, 400),
      );

      const labelsDescriptive = /not part of the score/i.test(receiptText);
      record(
        'P2-generative',
        'the receipt\'s shape-&-rhythm aggregates carry the same "not part of the score" label used elsewhere',
        labelsDescriptive,
        labelsDescriptive ? '' : 'no descriptive-aggregate label in the receipt',
      );

      const noAiClaim = /No AI was used/i.test(receiptText);
      record(
        'P2-generative',
        'the receipt says plainly that no AI produced it',
        noAiClaim,
        noAiClaim ? '' : 'missing the "No AI was used" attribution',
      );
    }
  }


  // ── The FDX hole, as a standing guard (review finding, 2026-09-04). The
  // first version of "Verify my rewrite" took its candidate from the panel's
  // ACTIVE text, which for a non-PDF upload is the file's own content — so an
  // .fdx-sourced report sent raw Final Draft XML as `candidateFountain` and
  // got back a full, confident receipt ("Health 64 → 0 · Cleared 120 ·
  // Introduced 6") for a rewrite the writer never made. The base is the
  // CONVERTED Fountain, so the two sides had no representation in common. The
  // predicate is now "the candidate is the editor's own draft", which is why
  // this asserts BOTH halves: the control is still visible (it explains
  // itself rather than vanishing) and it is disabled, and nothing is POSTed.
  // Source-level review missed this once already; only driving an upload
  // catches it. ────────────────────────────────────────────────────────────
  const fdxFixPosts = [];
  const onFdxFixPost = (req) => {
    if (req.method() === 'POST' && /\/api\/scriptide\/fix$/.test(req.url())) fdxFixPosts.push(req.url());
  };
  pageA.on('request', onFdxFixPost);
  await pageA.setInputFiles('input[aria-label^="Upload script file"]', {
    name: 'twelve-scenes.fdx',
    mimeType: 'application/xml',
    buffer: Buffer.from(FDX_PROBE_XML, 'utf8'),
  });
  const fdxRunBtn = pageA.getByRole('button', { name: 'Run Diagnosis', exact: true }).first();
  await fdxRunBtn.waitFor({ state: 'visible', timeout: timing.ms(15000) });
  await fdxRunBtn.click();
  // Wait for the REPORT, not for a verdict word — "Running 14 passes…" contains
  // "PASS". The Export button only renders once a real report is on screen.
  const fdxReportRendered = await pageA
    .getByRole('button', { name: 'Export coverage report as an HTML document', exact: true })
    .first()
    .waitFor({ state: 'visible', timeout: timing.ms(60000) })
    .then(() => true)
    .catch(() => false);
  record('P2-generative', 'an uploaded .fdx produces a complete report (the state the hole lived in)', fdxReportRendered);

  if (fdxReportRendered) {
    const fdxVerifyBtn = pageA.getByRole('button', { name: 'Verify my rewrite', exact: true }).first();
    const fdxVerifyPresent = (await fdxVerifyBtn.count()) > 0;
    const fdxVerifyEnabled = fdxVerifyPresent && (await fdxVerifyBtn.isEnabled().catch(() => false));
    record(
      'P2-generative',
      'on an FDX-sourced report "Verify my rewrite" is WITHHELD (present, disabled) — the browser holds no Fountain rewrite to compare',
      fdxVerifyPresent && !fdxVerifyEnabled,
      `present=${fdxVerifyPresent} enabled=${fdxVerifyEnabled}`,
    );

    // The disabled state must explain itself and name the way back — the
    // "Load converted Fountain into editor" control that is on this very
    // screen. A withheld control with no reason is the failure mode this
    // project's own hide-don't-disable rule exists to avoid.
    const fdxReasonShown = await pageA.getByText(/Load converted Fountain into editor.*run the diagnosis again/i).count();
    const loadConvertedPresent = await pageA
      .getByRole('button', { name: 'Load the converted Fountain text into the script editor', exact: true })
      .count();
    record(
      'P2-generative',
      'the withheld state names the recovery path, and that control is actually on screen',
      fdxReasonShown >= 1 && loadConvertedPresent >= 1,
      `reason=${fdxReasonShown} loadConvertedButtons=${loadConvertedPresent}`,
    );

    record(
      'P2-generative',
      'no POST /api/scriptide/fix is attempted from the FDX state',
      fdxFixPosts.length === 0,
      `posts=${fdxFixPosts.length}`,
    );
  }
  pageA.off('request', onFdxFixPost);

  await returnDoctorPanelToIdle(pageA);
  const deepReadCountOff = await pageA.getByText(/Deep read \(AI reads each scene/i).count();
  record(
    'P2-generative',
    'Script Doctor idle state: "Deep read" toggle (POST /api/scriptide/doctor/deep) ABSENT with Labs OFF',
    deepReadCountOff === 0,
    `found ${deepReadCountOff} matching label(s)`,
  );
  const runDiagnosisIdleOff = await pageA.getByRole('button', { name: 'Run Diagnosis', exact: true }).count();
  record(
    'P2-generative',
    'Script Doctor idle state: the deterministic "Run Diagnosis" front door is still there with Labs OFF',
    runDiagnosisIdleOff >= 1,
    `found ${runDiagnosisIdleOff} button(s)`,
  );

  // ── The SAMPLE state, beside the FDX guard above and for the same reason
  // one axis over (review finding, 2026-09-05). The built-in sample is stored
  // as an uploadedFile with format "fountain" and provenance "sample", so a
  // format-only reason told the writer to "clear the upload" while the chip
  // above said "Sample script" — withholding correct, sentence wrong. The
  // panel is idle here with the probe upload active, which is the state whose
  // "Try a sample" button loads the sample and diagnoses it in one click.
  // ──────────────────────────────────────────────────────────────────────
  const sampleFixPosts = [];
  const onSampleFixPost = (req) => {
    if (req.method() === 'POST' && /\/api\/scriptide\/fix$/.test(req.url())) sampleFixPosts.push(req.url());
  };
  pageA.on('request', onSampleFixPost);
  await pageA
    .getByRole('button', { name: /Load a built-in sample screenplay and run a diagnosis/i })
    .first()
    .click({ timeout: timing.ms(15000) });
  const sampleReportRendered = await pageA
    .getByRole('button', { name: 'Export coverage report as an HTML document', exact: true })
    .first()
    .waitFor({ state: 'visible', timeout: timing.ms(60000) })
    .then(() => true)
    .catch(() => false);
  record('P2-generative', '"Try a sample" produces a complete, sample-provenance report', sampleReportRendered);

  if (sampleReportRendered) {
    const sampleVerifyBtn = pageA.getByRole('button', { name: 'Verify my rewrite', exact: true }).first();
    const samplePresent = (await sampleVerifyBtn.count()) > 0;
    const sampleEnabled = samplePresent && (await sampleVerifyBtn.isEnabled().catch(() => false));
    record(
      'P2-generative',
      'on the SAMPLE report "Verify my rewrite" is WITHHELD (present, disabled) — the report is not the writer\'s draft',
      samplePresent && !sampleEnabled,
      `present=${samplePresent} enabled=${sampleEnabled}`,
    );

    // The reason must name the SAMPLE, matching the chip above it — not call
    // it "an uploaded file" and send the writer looking for an upload to clear.
    const sampleReasonNamesSample = await pageA
      .getByText(/built-in sample script, not your draft.*Dismiss the sample/i)
      .count();
    const uploadWordingLeaked = await pageA.getByText(/This report came from an uploaded file/i).count();
    record(
      'P2-generative',
      'the withheld reason names the sample (and does not call it an uploaded file)',
      sampleReasonNamesSample >= 1 && uploadWordingLeaked === 0,
      `namesSample=${sampleReasonNamesSample} uploadWordingLeaked=${uploadWordingLeaked}`,
    );

    record(
      'P2-generative',
      'no POST /api/scriptide/fix is attempted from the sample state',
      sampleFixPosts.length === 0,
      `posts=${sampleFixPosts.length}`,
    );
  }
  pageA.off('request', onSampleFixPost);

  const hashMatch = exportedHtml.match(/Script-text hash \(SHA-256, full\)<\/dt><dd><code>([0-9a-f]{64})<\/code>/);
  const healthMatch = exportedHtml.match(/<dt>Health<\/dt><dd><code>([\d.]+)<\/code>/);
  const verdictMatch = exportedHtml.match(/<dt>Verdict<\/dt><dd><code>([A-Z]+)<\/code>/);
  const issuesMatch = exportedHtml.match(/<dt>Total issues<\/dt><dd><code>(\d+)<\/code>/);
  const verifyBlockOk = !!(hashMatch && healthMatch && issuesMatch);
  record(
    'P3',
    'Exported report carries a full 64-hex verify block (contentHash + health/verdict/totalIssues)',
    verifyBlockOk,
    verifyBlockOk
      ? `hash=${hashMatch[1].slice(0, 12)}… health=${healthMatch[1]} verdict=${verdictMatch?.[1] ?? '(none)'} totalIssues=${issuesMatch[1]}`
      : 'one or more verify-block fields not found in the exported HTML',
  );

  const claimedHash = hashMatch?.[1];
  const claimedHealth = healthMatch?.[1];
  const claimedVerdict = verdictMatch?.[1];
  const claimedIssues = issuesMatch?.[1];

  // 2026-09-04 review (REVISE item 4): the earlier "Ship -> Versions shows
  // each snapshot's rank" assertion (P2-whatif, further below) is reachable
  // ONLY through the What-If promote flow, whose undo snapshot is always
  // unscored — so that assertion always hits the `of <= 1` branch and can
  // never distinguish a real cross-snapshot rank from a degenerate
  // always-{rank:1,of:1} implementation. This is the STRICT counterpart,
  // reachable from the sample-coverage context this dialog is already open
  // in: close the report dialog, open Ship -> Versions, save the SAME
  // script twice (no edits between saves, so both snapshots share the exact
  // same health — a genuine tie), and assert the exact "Ranks 1st of 2 by
  // health among your saved drafts of this script" text renders
  // (computeDraftRank's documented tie rule: an exact tie shares the better
  // rank).
  await pageA.keyboard.press('Escape');
  await pageA.waitForTimeout(timing.ms(200));

  const shipTabP3 = pageA.getByRole('button', { name: /^Ship$/ }).first();
  const shipReachableP3 = await shipTabP3.waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);
  if (shipReachableP3) {
    await shipTabP3.click();
    const saveVersionBtn = pageA.getByRole('button', { name: 'Save new script version snapshot', exact: true }).first();
    for (let i = 0; i < 2; i++) {
      // eslint-disable-next-line no-await-in-loop
      const saveBtnVisible = await saveVersionBtn.waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);
      if (!saveBtnVisible) break;
      // eslint-disable-next-line no-await-in-loop
      await saveVersionBtn.click();
      const nameInput = pageA.getByLabel('Snapshot version name', { exact: true }).first();
      // eslint-disable-next-line no-await-in-loop
      await nameInput.waitFor({ state: 'visible', timeout: timing.ms(5000) });
      // Enter confirms the snapshot (SnapshotManager.tsx's onKeyDown), same
      // as clicking the modal's own "Save" button — avoids an ambiguous
      // "Save" text-selector elsewhere on the page.
      // eslint-disable-next-line no-await-in-loop
      await nameInput.press('Enter');
      // eslint-disable-next-line no-await-in-loop
      await nameInput.waitFor({ state: 'hidden', timeout: timing.ms(5000) }).catch(() => {});
    }
    // 2026-09-05 review fix (client-hunter B-12): the same script saved
    // TWICE with no edit between saves is a genuine dead heat — both saved
    // records share the exact same health — so computeDraftRank's tie rule
    // (src/lib/snapshot-trend.ts) sets `tied: true`, and the badge now
    // correctly prefixes "tied " (draftRankSentence's fix for the bug this
    // exact scenario used to hide: before the fix, this assertion's own
    // hardcoded "Ranks 1st of 2..." literal — with no "tied" — happened to
    // match the OLD, broken, always-untied rendering, so this gate could
    // never have caught the bug it exists to catch). Derived from the
    // shared helper, not a literal, so a future wording or tie-rule change
    // moves both sides together.
    const expectedStrictRankText = draftRankSentence({ rank: 1, of: 2, tied: true }, 'saved');
    const strictRankVisible = await pageA.getByText(expectedStrictRankText)
      .first().waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);
    record(
      'P3',
      `Ship -> Versions shows a REAL cross-snapshot rank ("${expectedStrictRankText}") after saving two versions of the same script`,
      strictRankVisible,
      strictRankVisible ? '' : `expected exact "${expectedStrictRankText}" text not found after saving two versions`,
    );
  } else {
    record(
      'P3',
      'Ship -> Versions shows a REAL cross-snapshot rank after saving two versions of the same script',
      false,
      'Ship tab not reachable in the sample-coverage context',
    );
  }

  // Close the dialog, navigate to #verify.
  await pageA.keyboard.press('Escape');
  await pageA.waitForTimeout(timing.ms(200));
  await pageA.goto(`${BASE}#verify`, { waitUntil: 'domcontentloaded', timeout: timing.ms(15000) });
  await pageA.getByRole('heading', { name: /verify a report/i }).waitFor({ timeout: timing.ms(10000) });

  async function runVerify(scriptText) {
    await pageA.getByLabel('Original script text', { exact: true }).fill(scriptText);
    // The hash/health/totalIssues inputs are unlabeled <input> siblings of a
    // <span class="sm-slug"> caption rather than a <label>, so target by
    // placeholder (each is unique on the page) instead of accessible name.
    await pageA.getByPlaceholder('e19e6cc2…').fill(claimedHash ?? '');
    if (claimedHealth) await pageA.getByPlaceholder('72.5').fill(claimedHealth);
    if (claimedVerdict) await pageA.locator('select').selectOption(claimedVerdict);
    if (claimedIssues) await pageA.getByPlaceholder('38').fill(claimedIssues);

    const verifyBtn = pageA.getByRole('button', { name: /^verify$/i }).first();
    const [resp] = await Promise.all([
      pageA.waitForResponse((r) => /\/api\/export\/verify$/.test(r.url()), { timeout: timing.ms(20000) }),
      verifyBtn.click(),
    ]);
    return resp.json();
  }

  // 2026-09-12 (BUG-1, round 2): this form posts only the values a recipient TYPES
  // IN — it never sees the document, so it cannot do the body-versus-block check
  // the offline command does. The page has to say so, or it silently checks less
  // than the tool can. Driven in the browser because a sentence that is only in the
  // source is not a sentence a verifier reads.
  const scopeNoteOk = await pageA
    .getByText(/This form checks the values you type in\./)
    .first().isVisible().catch(() => false);
  record(
    'P3',
    '#verify states what its form cannot check, and names the command that can (npm run verify-report)',
    scopeNoteOk,
    scopeNoteOk ? '' : 'the form-scope sentence was not visible on #verify',
  );
  const scopeNoteNamesCommand = await pageA
    .getByText(/npm run verify-report/).first().isVisible().catch(() => false);
  record(
    'P3',
    '#verify names the offline command in the same note',
    scopeNoteNamesCommand,
    scopeNoteNamesCommand ? '' : 'npm run verify-report was not visible on #verify',
  );

  const positiveResult = await runVerify(sampleFountain);
  record(
    'P3',
    'Re-derived numbers MATCH the export\'s claims exactly (same script text)',
    positiveResult.verified === true && (positiveResult.mismatches ?? []).length === 0,
    `verified=${positiveResult.verified} mismatches=${JSON.stringify(positiveResult.mismatches)} recomputed=${JSON.stringify(positiveResult.recomputed)}`,
  );
  const positiveUiOk = await pageA.getByText('Verified', { exact: true }).first().isVisible().catch(() => false);
  record('P3', 'UI reflects the match ("Verified" heading shown)', positiveUiOk, positiveUiOk ? '' : '"Verified" heading not found in DOM');

  // Negative test: alter one character of the pasted script, keep the same
  // claimed hash/health/verdict/totalIssues, and confirm the route reports
  // a MISMATCH (not a silent pass-through).
  const alteredFountain = sampleFountain.slice(0, 120) + 'X' + sampleFountain.slice(120);
  const negativeResult = await runVerify(alteredFountain);
  const negativeCorrectlyFlagged =
    negativeResult.verified === false &&
    Array.isArray(negativeResult.mismatches) &&
    negativeResult.mismatches.some((m) => m.field === 'contentHash');
  record(
    'P3',
    'Altering one character of the pasted script produces a MISMATCH, not a false positive',
    negativeCorrectlyFlagged,
    `verified=${negativeResult.verified} mismatches=${JSON.stringify(negativeResult.mismatches)}`,
  );
  const negativeUiOk = await pageA.getByText('Does not match', { exact: true }).first().isVisible().catch(() => false);
  record('P3', 'UI reflects the mismatch ("Does not match" heading shown)', negativeUiOk, negativeUiOk ? '' : '"Does not match" heading not found in DOM');

  // ══════════════════════════════════════════════════════════════════════
  // P4-PREP — events vocabulary fired during flows above.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== P4-prep — events instrumentation ===');
  await sleep(200); // let the fire-and-forget POSTs land server-side
  const summaryAfterP3Res = await fetch(`${BASE}/api/events/summary`);
  const summaryAfterP3 = await summaryAfterP3Res.json();

  const doctorRunMoved = summaryAfterP3.counts.doctor_run > summaryBeforeP3.counts.doctor_run;
  const exportReportMoved = summaryAfterP3.counts.export_report > summaryBeforeP3.counts.export_report;
  const verifyRunMoved = summaryAfterP3.counts.verify_run >= summaryBeforeP3.counts.verify_run + 2; // positive + negative
  const firstReportMoved = summaryAfterP3.counts.first_report > summaryBeforeP3.counts.first_report;

  record('P4-instrumentation', 'doctor_run counter moved during the sample-coverage flow', doctorRunMoved, `before=${summaryBeforeP3.counts.doctor_run} after=${summaryAfterP3.counts.doctor_run}`);
  record('P4-instrumentation', 'export_report counter moved on the successful export download', exportReportMoved, `before=${summaryBeforeP3.counts.export_report} after=${summaryAfterP3.counts.export_report}`);
  record('P4-instrumentation', 'verify_run counter moved (+2: positive and negative verify calls)', verifyRunMoved, `before=${summaryBeforeP3.counts.verify_run} after=${summaryAfterP3.counts.verify_run}`);
  record('P4-instrumentation', 'first_report counter moved (first Doctor run of this browser session)', firstReportMoved, `before=${summaryBeforeP3.counts.first_report} after=${summaryAfterP3.counts.first_report}`);
  record(
    'P4-instrumentation',
    'exportRate is non-null and reflects the export after the first Doctor run',
    summaryAfterP3.exportRate !== null,
    `exportRate=${summaryAfterP3.exportRate} avgTimeToFirstReportMs=${summaryAfterP3.avgTimeToFirstReportMs}`,
  );
  const namesSeen = new Set(eventPosts);
  record(
    'P4-instrumentation',
    'Network observation: POST /api/events fired for doctor_run/export_report/first_report/verify_run',
    ['doctor_run', 'export_report', 'first_report', 'verify_run'].every((n) => namesSeen.has(n)),
    `event names observed on the wire: ${JSON.stringify([...namesSeen])}`,
  );

  // ══════════════════════════════════════════════════════════════════════
  // E4-PREP — the #privacy hash route (PrivacyPage.tsx) renders and states
  // all four claims. Read-only: this deliberately does NOT exercise the
  // Delete Everything control itself (that would reload the page mid-script
  // and is a destructive action against a session other later assertions in
  // this same context don't need) — the destructive flow gets its own
  // dedicated browser-proof run, not this shared surface-completeness walk.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== E4-prep — #privacy page reachable and states all four claims ===');
  await pageA.goto(`${BASE}#privacy`, { waitUntil: 'domcontentloaded', timeout: timing.ms(15000) });
  const privacyHeadingOk = await pageA.getByRole('heading', { name: /^privacy$/i })
    .waitFor({ timeout: timing.ms(10000) }).then(() => true).catch(() => false);
  record('E4', '#privacy route renders the Privacy page', privacyHeadingOk, privacyHeadingOk ? '' : '"Privacy" heading not found');

  for (const sectionName of [
    'What stays in this browser',
    'What the server stores',
    'What leaves this deployment',
    'Deleting it',
  ]) {
    const sectionOk = await pageA.getByRole('heading', { name: sectionName }).first()
      .isVisible().catch(() => false);
    record('E4', `#privacy states "${sectionName}"`, sectionOk, sectionOk ? '' : `heading not found: ${sectionName}`);
  }

  await contextA.close();

  // ══════════════════════════════════════════════════════════════════════
  // CONTEXT B — fresh profile, Labs ON. Proves the gate is the flag, not
  // dead code: the same surfaces that were absent above must now appear.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== P2 — Labs ON: gated surface APPEARS ===');
  const contextB = await browser.newContext();
  await contextB.addInitScript(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); } catch {} });
  const pageB = await contextB.newPage();
  wireConsoleCapture(pageB, genuineConsoleErrors);

  await pageB.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });

  // StartScreen's hero wraps in `inert={!isIntroResolved || undefined}`
  // until its intro animation resolves — the button exists in the DOM
  // immediately but Playwright must wait for it to become genuinely
  // actionable rather than checking isVisible() on the very next tick.
  const advancedSimBtnOn = pageB.getByRole('button', { name: /advanced: simulation/i }).first();
  const advancedSimVisibleOn = await advancedSimBtnOn.waitFor({ state: 'visible', timeout: timing.ms(15000) }).then(() => true).catch(() => false);
  record('P2', 'StartScreen "Advanced: Simulation" APPEARS with Labs ON', advancedSimVisibleOn, advancedSimVisibleOn ? '' : 'button not found/visible with Labs ON');

  if (advancedSimVisibleOn) {
    await advancedSimBtnOn.click();
    await pageB.waitForTimeout(timing.ms(600));
    const smBodyText = await pageB.textContent('body').catch(() => '');
    const reachedStoryMachine = /Story Machine/i.test(smBodyText) && /Agents/i.test(smBodyText);
    record('P2', 'Clicking through reaches the OASIS/simulation surface (agent-roster jargon present)', reachedStoryMachine, 'checked body text for "Story Machine" + "Agents"');
  }

  // Fresh page (same context) to check Toolbar gating with Labs ON.
  await pageB.evaluate(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); localStorage.removeItem('sm_app_view_v1'); } catch {} });
  await pageB.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const startFreshBtnOn = pageB.getByRole('button', { name: /start fresh/i }).first();
  await startFreshBtnOn.waitFor({ timeout: timing.ms(15000) });
  await startFreshBtnOn.click();
  await pageB.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(15000) });

  const overflowLabelsOn = await getOverflowMenuItemLabels(pageB);
  const hasStudioOn = overflowLabelsOn.some((l) => /studio/i.test(l));
  const hasDirectorOn = overflowLabelsOn.some(isDirectorHudLabel);
  const hasSlateOn = overflowLabelsOn.some((l) => /slate/i.test(l));
  const hasSimulateOn = overflowLabelsOn.some((l) => /open simulate/i.test(l));
  record('P2', 'Toolbar overflow: "Open Studio" APPEARS with Labs ON', hasStudioOn, `items=${JSON.stringify(overflowLabelsOn)}`);
  record('P2', 'Toolbar overflow: "Director HUD" APPEARS with Labs ON', hasDirectorOn, `items=${JSON.stringify(overflowLabelsOn)}`);
  record('P2', 'Toolbar overflow: "Slate compare" APPEARS with Labs ON', hasSlateOn, `items=${JSON.stringify(overflowLabelsOn)}`);
  record('P2', 'Toolbar overflow: "Open Simulate" APPEARS with Labs ON', hasSimulateOn, `items=${JSON.stringify(overflowLabelsOn)}`);

  // 2026-09-05 (owner-rule follow-up) — SlatePanel's Percentile column used
  // to state its "20-sample, hand-authored synthetic reference set"
  // denominator ONLY in a title= tooltip. Drive the panel end to end (open
  // it, add two tiny scripts, rank) and assert the shared
  // slatePercentileCaption() (src/lib/percentile-copy.ts) now renders as
  // VISIBLE text, not just a tooltip.
  if (hasSlateOn) {
    await pageB.getByRole('button', { name: 'More tools' }).first().click();
    const overflowMenu = pageB.getByRole('menu').first();
    await overflowMenu.waitFor({ timeout: timing.ms(5000) });
    await overflowMenu.getByRole('menuitem', { name: /slate/i }).first().click();

    const slateDialog = pageB.getByRole('dialog', { name: /slate/i }).first();
    const slateDialogVisible = await slateDialog.waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);

    let slateCaptionVisible = false;
    if (slateDialogVisible) {
      const fileInput = pageB.getByLabel('Add scripts to the slate (.fountain or .txt)', { exact: true });
      await fileInput.setInputFiles([
        { name: 'script-a.fountain', mimeType: 'text/plain', buffer: Buffer.from('INT. ROOM - DAY\n\nA person waits.\n\nBOB\nHello.\n') },
        { name: 'script-b.fountain', mimeType: 'text/plain', buffer: Buffer.from('INT. OFFICE - NIGHT\n\nA desk. A phone rings.\n\nALICE\nHi.\n') },
      ]);
      // handleFilesSelected reads each File asynchronously (file.text()) before
      // setFiles runs, so the "Rank slate" button stays disabled for a beat
      // after setInputFiles resolves — wait for the file-count heading to show
      // both accepted files rather than racing the button's enabled state.
      await pageB.getByText('Scripts (2/20)', { exact: true }).first().waitFor({ timeout: timing.ms(10000) });

      // B-13 (2026-09-05 mistake hunt): adding the SAME script content again
      // (ac3ec262's file-input fix means a repeat filename is no longer
      // silently a no-op) used to add a second row sharing the first's
      // contentHash, producing four genuine React "two children with the
      // same key" console errors and a duplicated ranked row. Dedupe at the
      // door with a visible note is the fix — assert BOTH halves: the
      // script count does NOT grow, and the note appears.
      await fileInput.setInputFiles([
        { name: 'script-a-again.fountain', mimeType: 'text/plain', buffer: Buffer.from('INT. ROOM - DAY\n\nA person waits.\n\nBOB\nHello.\n') },
      ]);
      const dedupeNoteVisible = await slateDialog
        .getByText(/already in this slate/i)
        .first()
        .waitFor({ state: 'visible', timeout: timing.ms(5000) })
        .then(() => true)
        .catch(() => false);
      const scriptCountStayedAtTwo = await pageB
        .getByText('Scripts (2/20)', { exact: true })
        .first()
        .isVisible()
        .catch(() => false);
      record(
        'P2-slate',
        'B-13: submitting a byte-identical script again is dedup\'d with a visible "already in this slate" note, not silently ranked twice',
        dedupeNoteVisible && scriptCountStayedAtTwo,
        `dedupeNoteVisible=${dedupeNoteVisible} scriptCountStayedAtTwo=${scriptCountStayedAtTwo}`,
      );

      const rankBtn = slateDialog.getByRole('button', { name: 'Rank slate', exact: true }).first();
      await rankBtn.waitFor({ state: 'visible', timeout: timing.ms(5000) });
      await rankBtn.click();
      slateCaptionVisible = await slateDialog
        .getByText(/Percentile ranks each script's health against a 20-sample, hand-authored synthetic reference set/i)
        .first()
        .waitFor({ state: 'visible', timeout: timing.ms(20000) })
        .then(() => true)
        .catch(() => false);
      // B-13: exactly 2 ranked rows, never 3 — the dedup'd resubmission
      // above must never reach the ranking request at all.
      const rankedRowCount = await slateDialog.locator('tbody tr').count();
      record(
        'P2-slate',
        'B-13: the ranked table has exactly 2 rows after the dedup\'d resubmission (never 3)',
        rankedRowCount === 2,
        `rankedRowCount=${rankedRowCount}`,
      );
      // Close via the panel's own visible "X" button rather than Escape —
      // measured live: the drawer stayed mounted and kept intercepting
      // pointer events for the section below (the "Ship" click) even after
      // pressing Escape and waiting for a hidden state, so the explicit
      // close control is the reliable path.
      await pageB.getByRole('button', { name: 'Close Slate panel', exact: true }).first().click();
      await slateDialog.waitFor({ state: 'hidden', timeout: timing.ms(10000) }).catch(() => {});
    }
    record(
      'P2-slate',
      'SlatePanel renders the Percentile column\'s denominator as visible caption text (not tooltip-only) after ranking',
      slateCaptionVisible,
      slateCaptionVisible ? '' : (slateDialogVisible ? 'caption text not found after ranking' : 'Slate panel dialog did not open'),
    );
  }

  // Decision #3, mirrored: the generative controls must come BACK with Labs
  // ON. This is the half that proves the change is a gate and not a deletion.
  const hasAutoAnalysisOn = overflowLabelsOn.some((l) => /auto-analysis/i.test(l));
  record(
    'P2-generative',
    'Toolbar overflow: "Auto-analysis" APPEARS with Labs ON',
    hasAutoAnalysisOn,
    `items=${JSON.stringify(overflowLabelsOn)}`,
  );

  // Same Ship toolbar row check as CONTEXT A, mirrored for Labs ON — proves the
  // gate is the Labs flag (onOpenStoryMachine truthiness), not dead/removed code.
  const shipTaskBtnOn = pageB.getByRole('button', { name: 'Ship', exact: true }).first();
  await shipTaskBtnOn.click();
  await pageB.waitForTimeout(timing.ms(300));
  const simulateBtnOn = pageB.getByRole('button', { name: 'Simulate', exact: true }).first();
  const simulateVisibleOn = await simulateBtnOn.waitFor({ state: 'visible', timeout: timing.ms(5000) }).then(() => true).catch(() => false);
  record(
    'P2',
    'Ship toolbar row: "Simulate" button (reachable equivalent) APPEARS with Labs ON',
    simulateVisibleOn,
    simulateVisibleOn ? '' : 'button not found/visible on Ship toolbar row with Labs ON',
  );

  const persistentSimOn = pageB.getByRole('button', { name: 'Simulate in Story Machine', exact: true }).first();
  const persistentSimVisibleOn = await persistentSimOn.waitFor({ state: 'visible', timeout: timing.ms(5000) }).then(() => true).catch(() => false);
  record(
    'P2',
    'Persistent Toolbar: "Simulate in Story Machine" control APPEARS with Labs ON',
    persistentSimVisibleOn,
    persistentSimVisibleOn ? '' : 'control not found/visible in persistent Toolbar with Labs ON',
  );

  // W6, mirrored for Labs ON: Ship must show the SAME writer-facing
  // ShipPanel — zero research-chrome tab bar — regardless of the Labs flag.
  // Ship is not a Labs surface; only Studio (below) is.
  await pageB.waitForSelector('[aria-labelledby="ship-panel-title"]', { timeout: timing.ms(10000) });
  const shipBodyTextOn = await pageB.locator('body').innerText();
  const shipHasResearchChromeOn = hasResearchShellChrome(shipBodyTextOn);
  record(
    'P2-W6',
    'Ship tab (Labs ON) ALSO shows NO research-chrome tab bar — Ship stays the plain writer container regardless of the Labs flag',
    !shipHasResearchChromeOn,
    shipHasResearchChromeOn
      ? 'Production/Analysis/Engine/Codex all found together on the Ship tab with Labs ON — Ship must never mount the research shell, Labs flag or not'
      : 'research-shell tab-bar text not found (as a full set) on the Ship tab with Labs ON',
  );

  // W6: the research shell (toolSlot="studio") must still be genuinely
  // reachable with Labs ON — proving it was gated, not deleted (deletion
  // moratorium). Close the Ship drawer first: like Coverage/Director/Slate,
  // it's a z-50 fixed overlay that sits above the z-20 header while open,
  // so the toolbar's own overflow button is behind it until closed.
  await pageB.getByRole('button', { name: 'Close ship panel' }).click();
  await pageB.waitForTimeout(timing.ms(200));
  const moreBtnOn = pageB.getByRole('button', { name: 'More tools' }).first();
  await moreBtnOn.click();
  const openStudioItem = pageB.getByRole('menuitem', { name: /open studio/i });
  const openStudioCountOn = await openStudioItem.count();
  record('P2-W6', 'Toolbar overflow "Open Studio" (Labs ON) is present and clickable', openStudioCountOn === 1, `count=${openStudioCountOn}`);
  if (openStudioCountOn === 1) {
    await openStudioItem.click();
    await pageB.waitForTimeout(timing.ms(400));
    const studioBodyTextOn = await pageB.locator('body').innerText();
    const studioShellReachable = hasResearchShellChrome(studioBodyTextOn);
    record(
      'P2-W6',
      'Research shell (toolSlot="studio") genuinely reachable with Labs ON via Toolbar overflow "Open Studio" — gated, not deleted (deletion moratorium)',
      studioShellReachable,
      studioShellReachable
        ? 'Production/Analysis/Codex tab-bar text found after clicking "Open Studio"'
        : 'research-shell tab-bar text NOT found after clicking "Open Studio" — the shell may have been deleted rather than gated',
    );

    // Area-6 note (2026-09-05 mistake hunt): the mobile-only close button
    // (`button[aria-label="Close studio panel"]`, `md:hidden` in
    // ScriptIDE.tsx) was hit-testing OVER the rightmost group tabs at this
    // page's own default 1280px viewport — `.sm-btn` (design-system.css)
    // sets `display: inline-flex` UNLAYERED, which beats a plain `md:hidden`
    // (layered, inside Tailwind's `utilities` @layer) regardless of source
    // order or specificity, so the "mobile-only" button never actually
    // hid above the `md` breakpoint. Drive every group tab with a REAL
    // click (no `force`) — a `visible`/`enabled` assertion cannot catch an
    // overlapping sibling stealing the pointer event; only a real click's
    // own actionability check can.
    if (studioShellReachable) {
      const groupTabLabels = ['Production', 'Analysis', 'Engine', 'Codex', 'Research', 'Title', 'Versions'];
      const tabResults = [];
      for (const label of groupTabLabels) {
        const tab = pageB.getByRole('button', { name: label, exact: true }).first();
        if ((await tab.count()) === 0) { tabResults.push(`${label}: NOT FOUND`); continue; }
        try {
          await tab.click({ timeout: timing.ms(5000) });
          tabResults.push(`${label}: ok`);
        } catch (e) {
          tabResults.push(`${label}: FAILED (${e.message.split('\n')[0]})`);
        }
      }
      const allTabsClicked = tabResults.every((r) => r.endsWith(': ok'));
      record(
        'P2-W6',
        'every Studio group tab accepts a real (non-force) pointer click at this browser\'s default 1280px viewport — none is covered by the mobile-only "Close studio panel" button',
        allTabsClicked,
        tabResults.join('; '),
      );
      const closeStudioBtnDisplay = await pageB.evaluate(() => {
        const el = document.querySelector('button[aria-label="Close studio panel"]');
        return el ? getComputedStyle(el).display : null;
      });
      record(
        'P2-W6',
        '"Close studio panel" (mobile-only) computes display:none at this desktop viewport',
        closeStudioBtnDisplay === 'none',
        `computed display=${closeStudioBtnDisplay}`,
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Decision #3, CONTEXT B mirror — every control CONTEXT A found absent must
  // be present and working here, from the same starting points.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== P2-generative — Labs ON: the generative surface APPEARS ===');

  // Close the studio shell opened just above, back to the editor.
  await pageB.keyboard.press('Escape');
  await pageB.waitForTimeout(timing.ms(300));
  await pageB.getByRole('button', { name: 'Write', exact: true }).first().click();
  await pageB.waitForTimeout(timing.ms(200));

  const editorB = pageB.locator('.cm-content').first();
  await editorB.waitFor({ timeout: timing.ms(10000) });
  await editorB.focus();
  await pageB.keyboard.press(`${MOD}+k`);
  const paletteB = pageB.getByRole('dialog', { name: 'Command palette' });
  const paletteOpenedB = await paletteB.waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
  if (paletteOpenedB) {
    await pageB.keyboard.type('analysis', { delay: 10 });
    await pageB.waitForTimeout(timing.ms(200));
    const autoAnalysisRowsOn = await pageB.getByRole('option', { name: /auto-analysis/i }).count();
    record(
      'P2-generative',
      'Command palette OFFERS the auto-analysis command with Labs ON',
      autoAnalysisRowsOn >= 1,
      `matching option rows=${autoAnalysisRowsOn}`,
    );
    await pageB.keyboard.press('Escape');
    await pageB.waitForTimeout(timing.ms(150));
  } else {
    record('P2-generative', 'Command palette OFFERS the auto-analysis command with Labs ON', false, 'palette did not open');
  }

  const settingsTabsOn = await openSettingsTabLabels(pageB);
  const missingProviderTabs = AI_PROVIDER_TABS.filter((t) => !settingsTabsOn.includes(t));
  record(
    'P2-generative',
    'Settings: all five AI-provider tabs APPEAR with Labs ON',
    missingProviderTabs.length === 0,
    `tabs=${JSON.stringify(settingsTabsOn)} missing=${JSON.stringify(missingProviderTabs)}`,
  );
  record(
    'P2-generative',
    'Settings: Session and Labs are still in the strip with Labs ON (nothing was traded away)',
    settingsTabsOn.includes('Session') && settingsTabsOn.includes('Labs'),
    `tabs=${JSON.stringify(settingsTabsOn)}`,
  );
  await pageB.getByRole('button', { name: /close settings/i }).first().click();
  await pageB.waitForTimeout(timing.ms(200));

  // Same sample-coverage flow CONTEXT A ran, so the two Script Doctor
  // assertions below start from a byte-identical report. localStorage.clear()
  // is safe here: contextB's addInitScript re-sets sm_labs_enabled on the very
  // next navigation, before any app code runs.
  await pageB.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  await pageB.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const labsStillOn = await pageB.evaluate(() => localStorage.getItem('sm_labs_enabled'));
  record('P2-generative', 'Labs flag survives the reset (the ON context is genuinely ON)', labsStillOn === 'true', `sm_labs_enabled=${labsStillOn}`);

  await pageB.getByRole('button', { name: /try sample coverage/i }).first().click({ timeout: timing.ms(15000) });
  const verdictRenderedB = await pageB
    .waitForFunction(() => /RECOMMEND|CONSIDER|PASS/.test(document.body.innerText), undefined, { timeout: timing.ms(30000) })
    .then(() => true)
    .catch(() => false);
  record('P2-generative', 'Sample coverage still produces a verdict with Labs ON', verdictRenderedB, '');
  await pageB.getByRole('button', { name: 'Full report', exact: true }).first().click();
  await pageB.waitForSelector('[role="dialog"]', { timeout: timing.ms(10000) });
  await pageB.waitForTimeout(timing.ms(500));

  const fixVerifyCountOn = await pageB.getByRole('button', { name: /fix & verify/i }).count();
  record(
    'P2-generative',
    'Script Doctor: "Fix & verify" APPEARS on the same complete report with Labs ON',
    fixVerifyCountOn >= 1,
    `found ${fixVerifyCountOn} button(s)`,
  );

  await returnDoctorPanelToIdle(pageB);
  const deepReadCountOn = await pageB.getByText(/Deep read \(AI reads each scene/i).count();
  record(
    'P2-generative',
    'Script Doctor idle state: "Deep read" toggle APPEARS with Labs ON',
    deepReadCountOn >= 1,
    `found ${deepReadCountOn} matching label(s)`,
  );

  // ══════════════════════════════════════════════════════════════════════
  // P2-whatif — the What-If Lab's Script Doctor readout and "Promote this
  // branch" (2026-09-04). Same Labs-ON context: this is a Labs surface, and
  // the two claims here are exactly the ones a source read cannot settle —
  // that a BRANCH actually renders a Doctor VERDICT (branches are StoryOps,
  // which carry no text at all until server/nvm/whatif/materialize.ts compiles
  // them into Fountain), and that promoting one really lands in the editor's
  // own snapshot list rather than merely claiming to.
  //
  // The session is seeded through the SAME keyless POST /api/nvm/inject-ops
  // route tests/routes/nvm-whatif-doctor.test.ts uses. It is issued from
  // INSIDE the page so it rides src/main.tsx's fetch wrapper and therefore
  // lands on the very session the panel is about to read — no session id is
  // constructed here.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== P2-whatif — What-If Lab x Script Doctor ===');

  await pageB.evaluate(() => { try { localStorage.removeItem('sm_app_view_v1'); } catch {} });
  await pageB.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });

  const seedOk = await pageB.evaluate(async () => {
    const scenes = [
      { sceneIdx: 0, ops: [
        { op: 'ADD_FACT', fact: { factId: 'wf1', subject: 'door', predicate: 'is', object: 'locked', addedAtTurn: 0, validFrom: 0, validTo: null } },
        { op: 'RAISE_CLOCK', clockId: 'bomb', amount: 40 },
        { op: 'SEED_CLUE', clueId: 'key-under-mat', carrier: 'object' },
      ] },
      { sceneIdx: 1, ops: [
        { op: 'UPDATE_BELIEF', charId: 'mara', belief: { proposition: 'the key is gone', confidence: 0.8 } },
        { op: 'SHIFT_RELATIONSHIP', pair: ['mara', 'ivo'], delta: { dimension: 'trust', amount: -0.4, reason: 'she caught him lying' } },
      ] },
    ];
    for (const scene of scenes) {
      const res = await fetch('/api/nvm/inject-ops', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scene),
      });
      if (!res.ok) return false;
    }
    return true;
  });
  record('P2-whatif', 'Session seeds with real StoryCommits via the keyless inject-ops route', seedOk, seedOk ? '' : 'inject-ops did not return 200');

  const advancedSimForLab = pageB.getByRole('button', { name: /advanced: simulation/i }).first();
  await advancedSimForLab.waitFor({ state: 'visible', timeout: timing.ms(15000) });
  await advancedSimForLab.click();

  const inspectBtn = pageB.getByRole('button', { name: /^inspect$/i }).first();
  await inspectBtn.waitFor({ timeout: timing.ms(15000) });
  await inspectBtn.click();
  const whatIfItem = pageB.getByRole('menuitem', { name: 'What-if', exact: true }).first();
  await whatIfItem.waitFor({ timeout: timing.ms(10000) });
  await whatIfItem.click();

  const labDialog = pageB.getByRole('dialog').first();
  await labDialog.waitFor({ timeout: timing.ms(15000) });

  // Pick the seeded clock op as the intervention target, then Explore.
  const clockTarget = labDialog.getByRole('button', { name: /remove: clock bomb/i }).first();
  const clockTargetVisible = await clockTarget.waitFor({ state: 'visible', timeout: timing.ms(15000) }).then(() => true).catch(() => false);
  record('P2-whatif', 'Intervention picker lists the seeded clock op', clockTargetVisible, clockTargetVisible ? '' : 'no "remove: clock bomb" target rendered');

  let verdictShown = false;
  let descriptiveLabelShown = false;
  let deltaShown = false;
  let promotedSnapshotNames = [];
  let editorHoldsPromotedText = false;

  if (clockTargetVisible) {
    await clockTarget.click();
    await labDialog.getByRole('button', { name: /^Explore$/ }).first().click();
    await labDialog.getByText(/#1 . best/).first().waitFor({ timeout: timing.ms(20000) });

    // BEFORE: with no doctor run, a branch card carries composite/tension/
    // quality only — no health, no verdict, no grade anywhere in the dialog.
    const preScoreText = (await labDialog.textContent()) || '';
    const noVerdictBefore = !/\b(RECOMMEND|CONSIDER)\b/.test(preScoreText);
    record('P2-whatif', 'Before scoring, a branch shows no Doctor verdict (branches are ops, not text)', noVerdictBefore, noVerdictBefore ? '' : 'a verdict token was already present');

    await labDialog.getByRole('button', { name: /Score with Script Doctor/i }).first().click();

    // AFTER: the branch card renders the doctor's own verdict for the script
    // that branch was compiled into.
    const verdictLocator = labDialog.getByText(/^(RECOMMEND|CONSIDER|PASS)$/).first();
    verdictShown = await verdictLocator.waitFor({ state: 'visible', timeout: timing.ms(60000) }).then(() => true).catch(() => false);
    record('P2-whatif', 'After scoring, a branch renders a Script Doctor VERDICT', verdictShown, verdictShown ? '' : 'no RECOMMEND/CONSIDER/PASS token appeared in the Lab dialog');

    const postScoreText = (await labDialog.textContent()) || '';
    descriptiveLabelShown = /descriptive, not part of the score/i.test(postScoreText)
      && /Talk\/action swing/i.test(postScoreText)
      && /Action-prose variation/i.test(postScoreText);
    record('P2-whatif', 'The two structural aggregates carry the Shape & Rhythm "descriptive, not part of the score" labelling', descriptiveLabelShown, descriptiveLabelShown ? '' : 'aggregate labels missing from the scored dialog');

    // 2026-09-05 (owner-rule follow-up) — the What-If Lab used to be the one
    // scored surface with no percentile reading at all. DoctorReadout now
    // renders it beside health via the SAME shared compactPercentileNote()
    // every other surface uses (src/lib/percentile-copy.ts), so this must
    // appear in the scored dialog's text alongside the verdict.
    const whatIfPercentileShown = /hand-authored synthetic reference set/i.test(postScoreText);
    record('P2-whatif', 'A scored branch shows its health percentile beside health, via the shared compactPercentileNote()', whatIfPercentileShown, whatIfPercentileShown ? '' : 'no "hand-authored synthetic reference set" text found in the scored dialog');

    deltaShown = /vs base/.test(postScoreText);
    record('P2-whatif', 'A scored branch shows its health delta against the base draft', deltaShown, deltaShown ? '' : 'no "vs base" delta rendered');

    // ── Promote ───────────────────────────────────────────────────────────
    const promoteBtn = labDialog.getByRole('button', { name: /Promote this branch/i }).first();
    const promoteVisible = await promoteBtn.waitFor({ state: 'visible', timeout: timing.ms(20000) }).then(() => true).catch(() => false);
    record('P2-whatif', '"Promote this branch" is offered once the branch has a materialised script', promoteVisible, promoteVisible ? '' : 'promote control not rendered');

    if (promoteVisible) {
      await promoteBtn.click();
      await pageB.getByRole('button', { name: /Yes, promote/i }).first().click();

      // Promote closes StoryMachine and lands the writer in the editor.
      await pageB.locator('header.sm-pagetop').waitFor({ timeout: timing.ms(20000) });

      // The persisted draft envelope is the authoritative record of what the
      // editor's own snapshot mechanism actually saved — read it rather than
      // trusting the panel's "Promoted" confirmation.
      const draftState = await pageB.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('scriptide_draft_v1') || 'null'); } catch { return null; }
      });
      promotedSnapshotNames = (draftState?.snapshots ?? []).map((s) => s?.name);
      const promotedCount = promotedSnapshotNames.filter((n) => /^What-If branch #/.test(n || '')).length;
      const undoCount = promotedSnapshotNames.filter((n) => /^Before What-If branch #/.test(n || '')).length;
      record('P2-whatif', 'Promote creates a SNAPSHOT of the branch through the editor\'s own snapshot mechanism', promotedCount === 1, `snapshots=${JSON.stringify(promotedSnapshotNames)}`);
      record('P2-whatif', 'Promote snapshots the PREVIOUS draft first (the undo path)', undoCount === 1, `snapshots=${JSON.stringify(promotedSnapshotNames)}`);
      // EXACTLY one pair, not two: React 18 StrictMode double-invokes effects in
      // development and the first cut of the promote effect duplicated the pair
      // (measured here). ScriptIDE.tsx's appliedPromotionRef guard is what makes
      // this assertion hold — counting, not merely existence, is the point.
      record('P2-whatif', 'Promote applies exactly ONCE (no duplicated snapshot pair)', promotedCount === 1 && undoCount === 1, `promoted=${promotedCount} undo=${undoCount}`);

      const promotedSnapshot = (draftState?.snapshots ?? []).find((s) => /^What-If branch #/.test(s?.name || ''));
      const carriesScore = promotedSnapshot
        && typeof promotedSnapshot.health === 'number'
        && typeof promotedSnapshot.meanAbsDialogueShareDelta === 'number'
        && typeof promotedSnapshot.actionSentenceCvOverall === 'number';
      record('P2-whatif', 'The promoted snapshot carries health + the two descriptive aggregates, like every other scored snapshot', !!carriesScore, `snapshot=${JSON.stringify(promotedSnapshot ?? null)}`);

      // 2026-09-04 review (REVISE item 5) — the promoted snapshot must ALSO
      // carry healthPercentile now, closing the asymmetry the review found:
      // before this, a manually saved snapshot showed a percentile line in
      // the SAME Versions list a promoted one never could.
      const promotedCarriesPercentile = promotedSnapshot && typeof promotedSnapshot.healthPercentile === 'number';
      record(
        'P2-whatif',
        'The promoted snapshot ALSO carries healthPercentile — no asymmetry with manually saved snapshots in the same Versions list',
        !!promotedCarriesPercentile,
        `healthPercentile=${promotedSnapshot?.healthPercentile}`,
      );

      editorHoldsPromotedText = typeof draftState?.scriptText === 'string'
        && draftState.scriptText === promotedSnapshot?.text;
      record('P2-whatif', 'The editor draft IS the promoted branch\'s script', editorHoldsPromotedText, editorHoldsPromotedText ? '' : 'editor text does not match the promoted snapshot');

      // And it is visible where a writer would look for it: Ship -> Versions.
      const shipTab = pageB.getByRole('button', { name: /^Ship$/ }).first();
      const shipReachable = await shipTab.waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);
      if (shipReachable) {
        await shipTab.click();
        const nameVisible = await pageB.getByText(/What-If branch #1/).first()
          .waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);
        record('P2-whatif', 'The promoted snapshot is listed in Ship -> Versions', nameVisible, nameVisible ? '' : 'promoted snapshot name not visible in the Ship panel');

        // 2026-09-04 (honesty-audit matrix fix) — the Versions list previously
        // showed health/verdict/delta per snapshot but never a RANK among the
        // writer's own OTHER saved drafts (snapshotDraftRanks, reusing the
        // same computeDraftRank the panel/exports already use). The promote
        // flow just created two snapshots (promoted + undo), but the undo
        // snapshot only carries a health value when a fresh report already
        // matched the PRE-promotion text (ScriptIDE.tsx's own "never
        // fabricated" rule) — so either a real cross-snapshot rank ("1st of
        // 2") or the honest single-scored-snapshot copy ("Only saved draft
        // with a health score so far") is a correct outcome here; either one
        // proves the SAME computeDraftRank-backed line reached this panel.
        const rankVisible = await pageB.getByText(new RegExp(
          `Ranks (1st|2nd|3rd|\\d+th) of \\d+ by health among your ${reEscape(savedScopeDraftRankNoun)}|Only saved draft with a health score so far`,
        )).first().waitFor({ state: 'visible', timeout: timing.ms(10000) }).then(() => true).catch(() => false);
        record('P2-whatif', 'Ship -> Versions shows each snapshot\'s rank among the writer\'s other saved drafts', rankVisible, rankVisible ? '' : 'no "Ranks N of M by health" / "Only saved draft" text found');
      }
    }
  }

  await contextB.close();

  // ══════════════════════════════════════════════════════════════════════
  // CONTEXT E — "Coverage outdated -> Re-run coverage" RE-RUNS COVERAGE
  // (2026-09-12 adversarial audit, finding #3).
  //
  // THE DEFECT. The action strip's "Re-run coverage" button called
  // `handleTaskChange("coverage")`. The banner is reachable while the active
  // task is ALREADY `coverage`, so the click switched nothing, issued no
  // request — and `handleTaskChange` additionally cleared the stale flag, so
  // the warning that the verdict on screen described text the writer had since
  // edited was dismissed by a click that re-ran nothing. The panel header's
  // circular-arrow control worked; two controls, one name, one inert.
  //
  // FAIL-FIRST, by construction: this phase counts
  // `/api/scriptide/doctor/stream` POSTs in the window that begins when the
  // banner is clicked. On the unfixed build that count is 0 and the banner
  // disappears anyway. A 9-scene draft is used deliberately — the defect is
  // length-independent and a feature-length re-run would cost minutes.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== P2-rerun — the outdated banner issues a real run ===');
  const contextE = await browser.newContext();
  const pageE = await contextE.newPage();
  wireConsoleCapture(pageE, genuineConsoleErrors);

  const doctorStreamPosts = [];
  pageE.on('request', (r) => {
    if (r.method() === 'POST' && /\/api\/scriptide\/doctor\/stream$/.test(r.url())) {
      doctorStreamPosts.push(r.url());
    }
  });

  const rerunFixturePath = join(REPO, 'data/screenplays/runoff.fountain');
  await pageE.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const [rerunChooser] = await Promise.all([
    pageE.waitForEvent('filechooser', { timeout: timing.ms(20000) }),
    pageE.getByText(/OPEN MY SCRIPT/i).first().click(),
  ]);
  await rerunChooser.setFiles(rerunFixturePath);
  await pageE.locator('.cm-content').first().waitFor({ timeout: timing.ms(30000) });
  await pageE.waitForTimeout(timing.ms(1200));

  await pageE.getByRole('button', { name: /^COVERAGE$/i }).first().click();
  const runBtnE = pageE.getByRole('button', { name: 'Run coverage', exact: true }).first();
  if (await runBtnE.isVisible().catch(() => false)) {
    await runBtnE.click({ timeout: timing.ms(20000) }).catch(() => {});
  }
  await pageE.waitForFunction(() => /HEALTH/.test(document.body.innerText), undefined, { timeout: timing.ms(120000) });
  await pageE.waitForTimeout(timing.ms(800));
  const healthBefore = await pageE.evaluate(() => {
    const m = document.body.innerText.match(/Health\s+([\d.]+)/i);
    return m ? m[1] : null;
  });
  record(
    'P2-rerun',
    'a first coverage run lands on the 9-scene draft (an empty run makes every assertion below vacuous)',
    healthBefore !== null && doctorStreamPosts.length >= 1,
    `health=${healthBefore} doctorStreamPosts=${doctorStreamPosts.length}`,
  );

  // Edit the draft so the report on screen is genuinely outdated.
  await pageE.locator('.cm-content').first().click();
  await pageE.keyboard.press('Control+End');
  await typeWithoutDrainGaps(
    pageE,
    '\n\nINT. ANOTHER ROOM - DAY\n\nThe tally sheet is gone.\n\nCLERK\nSomebody took it.\n',
  );
  await pageE.waitForTimeout(timing.ms(1500));

  // The banner's button is the one with a TEXT label; the panel header's
  // circular-arrow control carries the same accessible name via aria-label and
  // no text, so filter on rendered text to be sure this phase drives the
  // banner and not the control that already worked.
  const bannerVisible = await pageE
    .locator('button', { hasText: /^Re-run coverage$/ })
    .first()
    .waitFor({ state: 'visible', timeout: timing.ms(15000) })
    .then(() => true)
    .catch(() => false);
  record(
    'P2-rerun',
    'editing after a run raises the "Coverage outdated" banner with a text-labelled "Re-run coverage" button',
    bannerVisible,
    bannerVisible ? '' : 'no text-labelled "Re-run coverage" button after the edit',
  );

  let postsAfterClick = 0;
  let healthAfter = null;
  let bannerStillVisible = null;
  if (bannerVisible) {
    const postsBeforeClick = doctorStreamPosts.length;
    await pageE.locator('button', { hasText: /^Re-run coverage$/ }).first().click({ timeout: timing.ms(15000) });
    // A run is a request plus a result: wait for the request to be counted,
    // then for the panel to settle on a report again.
    await pageE
      .waitForFunction(
        () => !/Re-running coverage/i.test(document.body.innerText) && /HEALTH/.test(document.body.innerText),
        undefined,
        { timeout: timing.ms(120000) },
      )
      .catch(() => {});
    await pageE.waitForTimeout(timing.ms(800));
    postsAfterClick = doctorStreamPosts.length - postsBeforeClick;
    healthAfter = await pageE.evaluate(() => {
      const m = document.body.innerText.match(/Health\s+([\d.]+)/i);
      return m ? m[1] : null;
    });
    bannerStillVisible = await pageE
      .locator('button', { hasText: /^Re-run coverage$/ })
      .first()
      .isVisible()
      .catch(() => false);
  }
  record(
    'P2-rerun',
    'clicking the banner\'s "Re-run coverage" issues a REAL doctor request (0 on the unfixed build)',
    postsAfterClick >= 1,
    `doctor/stream POSTs attributable to the click=${postsAfterClick}`,
  );
  record(
    'P2-rerun',
    'the verdict the panel shows is recomputed for the edited draft (the number moves)',
    healthAfter !== null && healthAfter !== healthBefore,
    `before=${healthBefore} after=${healthAfter}`,
  );
  record(
    'P2-rerun',
    'the "Coverage outdated" banner is retired by the COMPLETED run, not by the click',
    bannerStillVisible === false && postsAfterClick >= 1,
    `bannerAfter=${bannerStillVisible} postsAfterClick=${postsAfterClick}`,
  );

  await contextE.close();

  // ══════════════════════════════════════════════════════════════════════
  // CONTEXT F — the compact "this isn't Fountain" card (2026-09-12, finding #15).
  //
  // POST /api/scriptide/doctor answers a heading-less paste with BOTH a `reason`
  // and a `hint`; the compact Coverage card rendered only the reason, under the
  // heading "Coverage failed", beside RETRY and USE SAMPLE. The full
  // ScriptDoctorPanel has always rendered the hint — but the compact card is the
  // surface a first-time visitor lands on, and the visitor it most often catches
  // is someone who pasted a draft out of Word or a PDF.
  //
  // Both fixtures are typed into the editor rather than uploaded, because typing
  // is what a paste is.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== P2-format — the compact "not a screenplay" card ===');
  const contextF = await browser.newContext();
  const pageF = await contextF.newPage();
  wireConsoleCapture(pageF, genuineConsoleErrors);
  await pageF.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await pageF.getByRole('button', { name: /start fresh/i }).first().click({ timeout: timing.ms(15000) });
  await pageF.locator('.cm-content').first().waitFor({ timeout: timing.ms(20000) });

  // The server's own answer for these bytes is the floor for what the card must
  // say — not a literal copied out of the route.
  const titleOnlyPaste = 'Title: The Second Key\nAuthor: A. Writer\nDraft date: 2026-09-12\n';
  const formatAnswerRes = await fetch(`${BASE}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fountain: titleOnlyPaste, title: 'The Second Key' }),
  });
  const formatAnswer = await formatAnswerRes.json();
  record(
    'P2-format',
    'the route really answers this paste with a reason AND a hint (an answer with no hint makes the card assertions vacuous)',
    formatAnswer.formatUnrecognized === true
      && typeof formatAnswer.reason === 'string' && formatAnswer.reason.length > 0
      && typeof formatAnswer.hint === 'string' && formatAnswer.hint.length > 0,
    `formatUnrecognized=${formatAnswer.formatUnrecognized} reasonLen=${(formatAnswer.reason ?? '').length} hintLen=${(formatAnswer.hint ?? '').length}`,
  );

  // focus(), not click(): on a blank draft the editor's own "type FADE IN:"
  // placeholder overlay sits above .cm-content and intercepts pointer events
  // (pointer-events-none on the wrapper, but not on the <pre> inside it). The
  // affordance under test here is the error card, not the editor's hit area, so
  // focusing is the honest way in rather than a force click.
  await pageF.locator('.cm-content').first().focus();
  await typeWithoutDrainGaps(pageF, titleOnlyPaste);
  await pageF.waitForTimeout(timing.ms(800));
  await pageF.getByRole('button', { name: /^COVERAGE$/i }).first().click();
  const runBtnF = pageF.getByRole('button', { name: 'Run coverage', exact: true }).first();
  if (await runBtnF.isVisible().catch(() => false)) {
    await runBtnF.click({ timeout: timing.ms(20000) });
  }
  const notAScreenplayVisible = await pageF
    .getByText('Not a screenplay', { exact: true })
    .first()
    .waitFor({ state: 'visible', timeout: timing.ms(60000) })
    .then(() => true)
    .catch(() => false);
  record(
    'P2-format',
    'the compact card calls it "Not a screenplay" rather than "Coverage failed" (the request succeeded — the route returns 200)',
    notAScreenplayVisible,
    notAScreenplayVisible ? '' : 'no "Not a screenplay" heading on the compact card',
  );
  const cardText = await pageF.evaluate(() => {
    const el = document.querySelector('[role="alert"]');
    return el ? el.textContent.replace(/\s+/g, ' ') : null;
  });
  const hintOnCard = await pageF.locator('[data-format-hint]').count();
  record(
    'P2-format',
    'it shows the server\'s HINT, not only the reason (the half that says what to do)',
    hintOnCard >= 1 && cardText !== null && cardText.includes(formatAnswer.hint.replace(/\s+/g, ' ')),
    `hintNodes=${hintOnCard} card=${JSON.stringify((cardText ?? '').slice(0, 260))}`,
  );
  const pdfBtn = pageF.getByRole('button', { name: 'Paste from PDF?', exact: true }).first();
  const pdfBtnVisible = await pdfBtn.isVisible().catch(() => false);
  record(
    'P2-format',
    'it offers the relevant third affordance, "Paste from PDF?", beside Retry and Use sample',
    pdfBtnVisible,
    pdfBtnVisible ? '' : '"Paste from PDF?" not offered',
  );
  if (pdfBtnVisible) {
    await pdfBtn.click({ timeout: timing.ms(10000) });
    await pageF.waitForTimeout(timing.ms(1200));
    const honestOutcome = await pageF.evaluate(() => {
      const t = document.body.innerText;
      return /Nothing to re-space/i.test(t) || /still no scene headings/i.test(t);
    });
    const stillOffered = await pageF
      .getByRole('button', { name: 'Paste from PDF?', exact: true })
      .count();
    record(
      'P2-format',
      'clicking it produces an honest outcome and is not re-offered as a button that changes nothing',
      honestOutcome && stillOffered === 0,
      `honestOutcome=${honestOutcome} buttonStillOffered=${stillOffered}`,
    );
  }

  // NOTE ON WHAT THIS AFFORDANCE CAN AND CANNOT DO, written here because it is
  // the thing a future reader of this phase will want: `hasSceneHeading`
  // (server/routes/scriptide.ts) tests each line TRIMMED, and
  // `normalizeScreenplay` re-spaces blocks without ever inventing a slugline — so
  // from THIS state the repair can honestly only report that it did not help, and
  // the one instruction that would fix it ("Add one, such as INT. KITCHEN - DAY") is the outcome
  // that matters. A double-spaced paste that DOES carry sluglines never reaches
  // this card at all: the route recognises it and the doctor analyses it. That
  // complementary claim is asserted in
  // tests/core/coverage-format-unrecognized-card.test.ts — against
  // `normalizeScreenplay` and the route's own exported `hasSceneHeading`, not
  // over HTTP, because a fourth doctor POST from this phase trips the route's
  // gameLimiter (measured: status 429, "Too many requests, please slow down",
  // twice in a row) and a rate-limited request proves nothing about the card.
  await contextF.close();

  // ══════════════════════════════════════════════════════════════════════
  // CONTEXT C — FEATURE LENGTH (2026-09-06).
  //
  // Everything above this line runs on 12-scene input, which is how four
  // feature-length defects shipped unseen (see
  // tests/fixtures/feature-length/README.md). This phase drives the same
  // Doctor + Editor loop on the committed 231-scene fixture and asserts the
  // three things that were only ever false at that length:
  //
  //   1. typing a new scene AFTER a coverage run does not throw React error
  //      #185 ("Maximum update depth exceeded") out of the CodeMirror update
  //      listener — the loop is explained in
  //      tests/core/scriptide-render-loop-guard.test.ts.
  //
  //      THIS STEP IS FAIL-FIRST (corrected round 2, 2026-09-07). Round 1
  //      recorded it as un-fail-first and blamed machine load; the real
  //      variable is KEY DELIVERY. `page.keyboard.type()` awaits a CDP
  //      round-trip per key and that round-trip is the drain gap that resets
  //      React's counter, so an awaited burst reproduced the defect only
  //      under load (5/5, 4/5, 2/3 busy; 0/5 idle). The burst below goes
  //      through typeWithoutDrainGaps() (non-awaited
  //      Input.dispatchKeyEvent — see its doc comment), and against two
  //      builds differing by one line the whole phase measures **3/3 loop
  //      errors unfixed, 0/3 fixed**.
  //
  //      tests/core/scriptide-render-loop-guard.test.ts is KEPT alongside it
  //      and is not redundant: that guard is a source-level grep for one hook
  //      on one line, so it pins the convention but could never catch the
  //      same ratchet arriving through a different setter. This step could.
  //   2. the report offers a jump control for (at least) every finding the
  //      server resolved to a span, not the ONE the panel used to render;
  //   3. an honestly unlocatable finding says so, and a real jump from a
  //      priority row actually moves the editor.
  // ══════════════════════════════════════════════════════════════════════
  const featureFixturePath = join(REPO, 'tests/fixtures/feature-length/assembled-feature.fountain');
  const featureFixtureText = readFileSync(featureFixturePath, 'utf8');
  const featureFixtureScenes = (featureFixtureText.match(/^(INT\.|EXT\.|INT\/EXT|EXT\/INT|I\/E)/gm) || []).length;
  record(
    'P2-featurelen',
    'the committed fixture really is feature length (a silently shrunken fixture would keep every gate green while testing nothing)',
    featureFixtureScenes >= 140 && featureFixtureText.length > 50_000,
    `scenes=${featureFixtureScenes} bytes=${featureFixtureText.length}`,
  );

  const contextC = await browser.newContext();
  const pageC = await contextC.newPage();
  const featurePageErrors = [];
  pageC.on('pageerror', (e) => featurePageErrors.push(String(e && e.message ? e.message : e).slice(0, 300)));
  wireConsoleCapture(pageC, genuineConsoleErrors);
  // A second, phase-local console sink: wireConsoleCapture's list is asserted
  // globally at the end of this suite, but this phase needs to attribute an
  // error to THIS interaction (the loop surfaced as a console error thrown
  // out of CodeMirror's update listener, not as a page error).
  const featureConsoleErrors = [];
  pageC.on('console', (m) => { if (m.type() === 'error') featureConsoleErrors.push(m.text().slice(0, 300)); });

  await pageC.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const [featureChooser] = await Promise.all([
    pageC.waitForEvent('filechooser', { timeout: timing.ms(20000) }),
    pageC.getByText(/OPEN MY SCRIPT/i).first().click(),
  ]);
  await featureChooser.setFiles(featureFixturePath);
  await pageC.locator('.cm-content').first().waitFor({ timeout: timing.ms(30000) });
  await pageC.waitForTimeout(timing.ms(2500));

  await pageC.getByRole('button', { name: /^COVERAGE$/i }).first().click();
  // EXACT name, not /run coverage/i (2026-09-12): that regex also matches the
  // action strip's "Re-run coverage" banner button, which is a DIFFERENT control
  // on a different element. Opening Coverage already starts a run on mount, so
  // this button exists only in the brief idle window before that run begins —
  // click it when it is there, and otherwise just wait for the run that is
  // already in flight.
  const runBtnC = pageC.getByRole('button', { name: 'Run coverage', exact: true }).first();
  if (await runBtnC.isVisible().catch(() => false)) {
    await runBtnC.click({ timeout: timing.ms(20000) }).catch(() => {});
  }
  await pageC.waitForFunction(() => /HEALTH/.test(document.body.innerText), undefined, { timeout: timing.ms(180000) });
  await pageC.waitForTimeout(timing.ms(1500));
  record(
    'P2-featurelen',
    'coverage completes on a 231-scene draft and renders a report',
    /HEALTH/.test(await pageC.evaluate(() => document.body.innerText)),
    '',
  );

  // ── 1. The render loop (discovery item #1, BLOCKER) ────────────────────
  const scenesBeforeEdit = await pageC.evaluate(() => {
    const m = document.body.innerText.match(/SCENE INDEX\s*\n\s*(\d+)/);
    return m ? Number(m[1]) : null;
  });
  featureConsoleErrors.length = 0;
  featurePageErrors.length = 0;
  await pageC.locator('.cm-content').first().click();
  await pageC.keyboard.press('Control+End');
  await pageC.waitForTimeout(timing.ms(200));
  await typeWithoutDrainGaps(
    pageC,
    "\n\nINT. HARGROVE & PYLE - MARGUERITE'S OFFICE - NIGHT\n\nMarguerite burns the transfer papers.\n\nMARGUERITE\nIt was never the papers. It was me.\n",
  );
  await pageC.waitForTimeout(timing.ms(3000));
  const scenesAfterEdit = await pageC.evaluate(() => {
    const m = document.body.innerText.match(/SCENE INDEX\s*\n\s*(\d+)/);
    return m ? Number(m[1]) : null;
  });
  const loopErrors = [...featureConsoleErrors, ...featurePageErrors].filter((e) =>
    /Maximum update depth|error #185/i.test(e),
  );
  record(
    'P2-featurelen',
    'typing a new scene into the feature draft AFTER a coverage run throws no update-depth loop (React #185)',
    loopErrors.length === 0,
    loopErrors.length === 0 ? '' : `${loopErrors.length} loop error(s): ${loopErrors.slice(0, 2).join(' | ')}`,
  );
  record(
    'P2-featurelen',
    'zero page/console errors of ANY kind from that edit',
    featureConsoleErrors.length === 0 && featurePageErrors.length === 0,
    `console=${JSON.stringify(featureConsoleErrors.slice(0, 3))} page=${JSON.stringify(featurePageErrors.slice(0, 3))}`,
  );
  record(
    'P2-featurelen',
    'the edit actually landed — the scene count advanced',
    typeof scenesBeforeEdit === 'number' && typeof scenesAfterEdit === 'number' && scenesAfterEdit === scenesBeforeEdit + 1,
    `before=${scenesBeforeEdit} after=${scenesAfterEdit}`,
  );

  // ── 2 & 3. One jump affordance for every finding (item #9) ─────────────
  // The edit deliberately invalidated the report on screen: G0-02's
  // handoff guard (ScriptDoctorPanel's initialReportHydratedRef effect)
  // correctly refuses to hydrate "Full report" from a report that predates
  // the writer's current draft, so the edited page cannot also be the page
  // that inspects a full report. The persisted draft is checked here — the
  // edit had to survive autosave at 114 KB — and the jump/count assertions
  // move to their own page below, on an UNEDITED load, where the rendered
  // control count can be checked against the server's own answer for the
  // exact same bytes.
  const editedDraftText = await pageC.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('scriptide_draft_v1') || 'null')?.scriptText ?? null; } catch { return null; }
  });
  record(
    'P2-featurelen',
    'the persisted draft holds the whole edited feature (the edit survived autosave at 114 KB)',
    typeof editedDraftText === 'string' && editedDraftText.length > featureFixtureText.length,
    `persisted=${typeof editedDraftText === 'string' ? editedDraftText.length : null} fixture=${featureFixtureText.length}`,
  );
  await contextC.close();

  // ── 2 & 3, on a clean load of the SAME fixture ─────────────────────────
  // The floor for the rendered-control count comes from the SERVER's own
  // answer for exactly these bytes, not a hand-picked constant that would
  // keep passing after a regression.
  const featureDoctorRes = await fetch(`${BASE}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fountain: featureFixtureText, title: 'THE LONG WAY DOWN' }),
  });
  const featureReport = await featureDoctorRes.json();
  const featureAnchoredLocations = new Set(
    (featureReport.locatedIssues ?? [])
      .filter((l) => l.startLine !== undefined && l.endLine !== undefined)
      .map((l) => l.issue.location),
  );
  const featurePassIssues = (featureReport.passes ?? []).flatMap((p) => p.issues);
  // Every per-pass issue row whose prose location the server resolved — the
  // floor the panel must meet (measured 554 of 899 on this fixture, 2026-09-06,
  // against the ONE control the panel rendered before this change).
  const expectedJumpFloor = featurePassIssues.filter((i) => featureAnchoredLocations.has(i.location)).length;
  record(
    'P2-featurelen',
    'the analysed draft really produces findings with resolvable spans (an empty run is not a pass)',
    featureReport.sceneCount >= 140 && featurePassIssues.length > 100 && expectedJumpFloor > 100,
    `sceneCount=${featureReport.sceneCount} passIssues=${featurePassIssues.length} locatedWithSpan=${expectedJumpFloor} rootCauses=${(featureReport.rootCauses ?? []).length}`,
  );

  const contextD = await browser.newContext();
  const pageD = await contextD.newPage();
  wireConsoleCapture(pageD, genuineConsoleErrors);
  await pageD.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  const [featureChooserD] = await Promise.all([
    pageD.waitForEvent('filechooser', { timeout: timing.ms(20000) }),
    pageD.getByText(/OPEN MY SCRIPT/i).first().click(),
  ]);
  await featureChooserD.setFiles(featureFixturePath);
  await pageD.locator('.cm-content').first().waitFor({ timeout: timing.ms(30000) });
  await pageD.waitForTimeout(timing.ms(2500));
  await pageD.getByRole('button', { name: /^COVERAGE$/i }).first().click();
  // Exact name — see pageC's note above.
  const runBtnD = pageD.getByRole('button', { name: 'Run coverage', exact: true }).first();
  if (await runBtnD.isVisible().catch(() => false)) {
    await runBtnD.click({ timeout: timing.ms(20000) }).catch(() => {});
  }
  await pageD.waitForFunction(() => /HEALTH/.test(document.body.innerText), undefined, { timeout: timing.ms(180000) });
  await pageD.waitForTimeout(timing.ms(1500));

  // ── Finding #5 (2026-09-12): the COMPACT card's "next fix" must not invent
  // a line for a whole-draft priority. This fixture's top priority is
  // NO_REVERSALS_LONG_STORY at "Conflict layer", which the server resolves to
  // the 'document' tier; the card used to borrow the first root cause's member
  // envelope and render "JUMP TO LINE 137", flashing 87.9% of the 2,928-line
  // file. Driven here on the compact panel, before "Full report" replaces it.
  const coverageAside = pageD.getByRole('region', { name: /coverage/i }).first();
  const nextFixNoLocation = await coverageAside.locator('[data-no-location]').count();
  const strayLineJump = await coverageAside
    .getByRole('button', { name: /^Jump to line 137$/ })
    .count();
  record(
    'P2-featurelen',
    'finding #5: the "next fix" card shows an honest "no location" note for the whole-draft top priority (it used to say "JUMP TO LINE 137")',
    nextFixNoLocation >= 1 && strayLineJump === 0,
    `noLocationNotes=${nextFixNoLocation} strayLine137Jumps=${strayLineJump}`,
  );
  const attributedNote = coverageAside.getByText(/A located note from .+ — a different finding:/);
  const attributedVisible = await attributedNote
    .first()
    .waitFor({ state: 'visible', timeout: timing.ms(10000) })
    .then(() => true)
    .catch(() => false);
  record(
    'P2-featurelen',
    'finding #5: the root cause\'s own located note is still offered, attributed to THAT finding rather than relabelled as the priority\'s',
    attributedVisible,
    attributedVisible ? '' : 'no attributed "A located note from …" row beside the no-location note',
  );
  if (attributedVisible) {
    const attributedJump = coverageAside.getByRole('button', { name: JUMP_CONTROL_NAME_RE }).last();
    const attributedName = await attributedJump.getAttribute('aria-label');
    await attributedJump.click({ timeout: timing.ms(10000) });
    await pageD.waitForTimeout(timing.ms(800));
    const attributedLanded = await pageD.evaluate(() => document.querySelectorAll('.cm-sm-finding-flash').length);
    record(
      'P2-featurelen',
      'finding #5: that attributed jump really moves the editor (the capability is kept, only its label changed)',
      attributedLanded > 0,
      `name=${JSON.stringify(attributedName)} flashed=${attributedLanded}`,
    );
  }

  await pageD.getByRole('button', { name: /full report/i }).first().click({ timeout: timing.ms(20000) });
  // 2026-09-11: the heading is derived from prioritiesHeadingFor (the ONE shared
  // implementation, src/lib/priorities-copy.ts), not the literal "Top Priorities"
  // this gate used to pin. The panel's heading now states the count, so a literal
  // here would stop matching anything the panel renders — and this assertion,
  // whose job is to prove the report hydrated at all, would fail for the wrong
  // reason. Matches whatever count the panel shows.
  const prioritiesHeadingRe = new RegExp(
    `^(?:${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => reEscape(prioritiesHeadingFor(n))).join('|')})$`,
    'i',
  );
  const fullReportOpened = await pageD.getByRole('heading', { name: prioritiesHeadingRe }).first()
    .waitFor({ timeout: timing.ms(60000) })
    .then(() => true)
    .catch(() => false);
  record(
    'P2-featurelen',
    'the full report opens on the feature draft (not the outdated-handoff state)',
    fullReportOpened,
    fullReportOpened ? '' : 'no priorities heading — the panel did not hydrate a report',
  );
  await pageD.waitForTimeout(timing.ms(2000));
  const jumpControlCount = await pageD.getByRole('button', { name: JUMP_CONTROL_NAME_RE }).count();
  record(
    'P2-featurelen',
    `the full report renders a jump control for at least every finding the server anchored (>= ${expectedJumpFloor})`,
    jumpControlCount >= expectedJumpFloor,
    `rendered=${jumpControlCount} serverAnchoredPassIssues=${expectedJumpFloor}`,
  );
  const noLocationCount = await pageD.locator('[data-no-location]').count();
  record(
    'P2-featurelen',
    'honestly unlocatable findings render a "no location" note with a reason, instead of nothing',
    noLocationCount > 0,
    `no-location notes=${noLocationCount}`,
  );
  // Every note, not the first one: the reason must be in the screen reader's
  // reading order on all of them (role="note" + aria-label), and the tab-stop
  // split the component documents (`focusable` — 374 -> 29 on the fixture) must
  // be real in the DOM: exactly the notes flagged focusable carry tabindex="0",
  // and none of the others does. A single-element probe could not see either.
  const noLocationCensus = await pageD.locator('[data-no-location]').evaluateAll((els) => {
    let withReason = 0;
    let focusable = 0;
    let focusableWithoutTabstop = 0;
    let unfocusableWithTabstop = 0;
    let notNote = 0;
    for (const el of els) {
      const title = el.getAttribute('title') || '';
      const label = el.getAttribute('aria-label');
      if (/No location —/.test(title) && label === title) withReason += 1;
      if (el.getAttribute('role') !== 'note') notNote += 1;
      const isFocusable = el.hasAttribute('data-no-location-focusable');
      const tabstop = el.getAttribute('tabindex') === '0';
      if (isFocusable) {
        focusable += 1;
        if (!tabstop) focusableWithoutTabstop += 1;
      } else if (tabstop) {
        unfocusableWithTabstop += 1;
      }
    }
    return { total: els.length, withReason, notNote, focusable, focusableWithoutTabstop, unfocusableWithTabstop };
  });
  record(
    'P2-featurelen',
    'every "no location" note carries the honest reason in the reading order (role=note, aria-label = title)',
    noLocationCensus.total > 0
      && noLocationCensus.withReason === noLocationCensus.total
      && noLocationCensus.notNote === 0,
    `notes=${noLocationCensus.total} withReason=${noLocationCensus.withReason} notRoleNote=${noLocationCensus.notNote}`,
  );
  record(
    'P2-featurelen',
    'the act-on notes are keyboard-reachable and the rest are reading-order only (the documented tab-stop split holds in the DOM)',
    noLocationCensus.focusable > 0
      && noLocationCensus.focusableWithoutTabstop === 0
      && noLocationCensus.unfocusableWithTabstop === 0
      && noLocationCensus.focusable < noLocationCensus.total,
    `focusable=${noLocationCensus.focusable} of ${noLocationCensus.total}; focusableWithoutTabstop=${noLocationCensus.focusableWithoutTabstop} unfocusableWithTabstop=${noLocationCensus.unfocusableWithTabstop}`,
  );

  // Expanding a root cause reveals its contributing rules — each of which now
  // carries its own control (they had none at all before this change).
  const jumpsBeforeExpand = jumpControlCount;
  const expander = pageD.getByRole('button', { name: ROOT_CAUSE_EXPANDER_NAME_RE }).first();
  const expanderExists = (await expander.count()) > 0;
  record('P2-featurelen', 'a root cause offers its "Show the N rules behind them" expander', expanderExists, '');
  if (expanderExists) {
    await expander.click();
    await pageD.waitForTimeout(timing.ms(600));
    const jumpsAfterExpand = await pageD.getByRole('button', { name: JUMP_CONTROL_NAME_RE }).count();
    record(
      'P2-featurelen',
      'expanding a root cause adds a jump control per contributing rule (they had none before 2026-09-06)',
      jumpsAfterExpand > jumpsBeforeExpand,
      `before=${jumpsBeforeExpand} after=${jumpsAfterExpand}`,
    );
  }

  // Item #10 — the headline count and the expander count must never
  // contradict each other on the same card.
  // Read each card's own machine-readable counts and check the RENDERED
  // sentences against them — the headline must state the issue count (and
  // both counts when they differ), and the expander must state the rule
  // count, using the word that matches what it lists.
  const countAgreement = await pageD.evaluate(() => {
    const out = [];
    for (const meta of document.querySelectorAll('[data-rootcause-issues]')) {
      const issues = Number(meta.getAttribute('data-rootcause-issues'));
      const rules = Number(meta.getAttribute('data-rootcause-rules'));
      const metaText = (meta.textContent || '').replace(/\s+/g, ' ').trim();
      const card = meta.parentElement;
      let expanderText = null;
      for (const btn of card ? card.querySelectorAll('button') : []) {
        const t = (btn.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^Show the \d+ rules? behind (them|it)$/.test(t)) { expanderText = t; break; }
      }
      const issueWord = issues === 1 ? 'issue' : 'issues';
      const ruleWord = rules === 1 ? 'rule' : 'rules';
      out.push({
        issues,
        rules,
        metaText,
        expanderText,
        headlineStatesIssues: metaText.toLowerCase().startsWith(`${issues} ${issueWord}`),
        headlineStatesBothWhenTheyDiffer:
          issues === rules || metaText.toLowerCase().includes(`from ${rules} ${ruleWord}`),
        expanderStatesRules: expanderText === null || expanderText === `Show the ${rules} ${ruleWord} behind ${issues === 1 ? 'it' : 'them'}`,
        expanderSaysNotes: expanderText !== null && /notes?\b/i.test(expanderText),
      });
    }
    return out;
  });
  const disagreeing = countAgreement.filter(
    (c) => !c.headlineStatesIssues || !c.headlineStatesBothWhenTheyDiffer || !c.expanderStatesRules || c.expanderSaysNotes,
  );
  record(
    'P2-featurelen',
    'every root-cause card\'s headline count and expander count agree (item #10: the card used to say "N issues" over "the M contributing notes")',
    countAgreement.length > 0 && disagreeing.length === 0,
    `cards=${countAgreement.length} disagreeing=${disagreeing.length} ${JSON.stringify(disagreeing.slice(0, 2))}`,
  );
  const bothNumbersShown = countAgreement.filter((c) => c.issues !== c.rules);
  record(
    'P2-featurelen',
    'where the two counts differ the card states BOTH (e.g. "15 issues from 10 rules")',
    bothNumbersShown.length > 0,
    `cards stating both=${bothNumbersShown.length} of ${countAgreement.length}`,
  );

  // ── A DRIVEN jump from priority #3 ─────────────────────────────────────
  // Priority #3 is the first top priority on this fixture that the server
  // resolves to a span (#1 and #2 are honestly document-tier), so it is the
  // exact row the discovery said a writer could not act on.
  // Same shared heading as above — located by the panel's own rendered text for
  // whatever count it shows, never the retired "Top Priorities" literal.
  const renderedPrioritiesHeading = await pageD.getByRole('heading', { name: prioritiesHeadingRe })
    .first().innerText();
  const priorityCards = pageD.locator(
    `h3:has-text("${renderedPrioritiesHeading.replace(/"/g, '\\"')}") + div > div`,
  );
  const thirdPriorityJump = priorityCards.nth(2).getByRole('button', { name: JUMP_CONTROL_NAME_RE }).first();
  const thirdJumpExists = (await thirdPriorityJump.count()) > 0;
  record('P2-featurelen', 'top priority #3 carries a jump control (it did not before 2026-09-06)', thirdJumpExists, '');
  if (thirdJumpExists) {
    const jumpName = await thirdPriorityJump.getAttribute('aria-label');
    await thirdPriorityJump.click();
    await pageD.waitForTimeout(timing.ms(800));
    const landed = await pageD.evaluate(() => ({
      flashed: document.querySelectorAll('.cm-sm-finding-flash').length,
      focused: document.activeElement?.className?.includes?.('cm-') ?? false,
    }));
    record(
      'P2-featurelen',
      'clicking priority #3\'s jump moves the editor to the finding (same highlightRange the Coverage jump uses)',
      landed.flashed > 0 || landed.focused,
      `name=${JSON.stringify(jumpName)} flashed=${landed.flashed} editorFocused=${landed.focused}`,
    );
  }

  await contextD.close();

  // ══════════════════════════════════════════════════════════════════════
  // CONTEXT G — NO DEAD CONTROLS on the keyless default start screen
  // (2026-09-12, finding #10).
  //
  // Its own context, and LAST in the suite, for a measured reason: the audit
  // below reloads `/` once per button, and each load makes several API calls.
  // Run inside context A it put ~50 requests into the same 60-second window as
  // the feature-length doctor run, and the route's gameLimiter (120/min/IP,
  // server/lib/session-store.ts) answered 429 — a rate-limited request proves
  // nothing about a button. A fresh context also gives exactly what this gate
  // needs: no `sm_labs_enabled`, so Labs is OFF by default.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== P2-deadcontrols — every button on the default start screen does something ===');
  const contextG = await browser.newContext();
  const pageG = await contextG.newPage();
  wireConsoleCapture(pageG, genuineConsoleErrors);
  await pageG.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await pageG.getByRole('button', { name: /try sample coverage/i }).first()
    .waitFor({ timeout: timing.ms(15000) });

  // ── Finding #10 (2026-09-12): NO DEAD CONTROLS on the default start screen.
  //
  // "Open simulation" and "Simulate" called `onOpenStoryMachine?.()`. With Labs
  // off App.tsx passes that prop as undefined, so the optional call is a no-op:
  // two normal, enabled, focusable buttons that produced no navigation and no
  // state change, beside a full-width OASIS hero and a numbered workflow
  // describing a Labs-only feature as part of the core loop. NORTH_STAR §1 —
  // hide, don't disable.
  //
  // This walks EVERY visible, enabled button on the fresh default screen and
  // requires each to either navigate, change the page, or be honestly disabled
  // with a reason. Each click is taken on a RELOADED page so one button's
  // navigation cannot hide the next one's inertness.
  const startScreenButtonNames = await pageG.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter((b) => !b.disabled && b.offsetParent !== null)
      .map((b) => (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim())
      .filter((n) => n.length > 0),
  );
  record(
    'P2-deadcontrols',
    'the default start screen really does render buttons to audit',
    startScreenButtonNames.length >= 3,
    `buttons=${JSON.stringify(startScreenButtonNames)}`,
  );
  const inertStartScreenButtons = [];
  for (const name of startScreenButtonNames) {
    await pageG.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
    await pageG.getByRole('button', { name: /try sample coverage/i }).first()
      .waitFor({ timeout: timing.ms(15000) });
    const before = await pageG.evaluate(() => ({
      url: location.href,
      text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 4000),
    }));
    const target = pageG.getByRole('button', { name, exact: true }).first();
    const clickable = await target.isVisible().catch(() => false);
    if (!clickable) continue;
    await target.click({ timeout: timing.ms(10000) }).catch(() => {});
    await pageG.waitForTimeout(timing.ms(900));
    const after = await pageG.evaluate(() => ({
      url: location.href,
      text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 4000),
    }));
    if (after.url === before.url && after.text === before.text) inertStartScreenButtons.push(name);
  }
  record(
    'P2-deadcontrols',
    'every visible, enabled button on the keyless default start screen produces a navigation or a state change',
    inertStartScreenButtons.length === 0,
    `inert=${JSON.stringify(inertStartScreenButtons)} audited=${startScreenButtonNames.length}`,
  );
  const oasisSectionOff = await pageG.locator('[aria-labelledby="oasis-heading"]').count();
  const simulateJargonOff = await pageG.evaluate(() => {
    const t = document.body.innerText;
    return {
      storyMachineSimulate: /Story Machine Simulate/i.test(t),
      simulateIfNeeded: /Simulate if needed/i.test(t),
      railStep: /Export · simulate/i.test(t),
    };
  });
  record(
    'P2-deadcontrols',
    'the Labs-only OASIS section does not render at all with Labs OFF (hide, don\'t disable)',
    oasisSectionOff === 0
      && !simulateJargonOff.storyMachineSimulate
      && !simulateJargonOff.simulateIfNeeded
      && !simulateJargonOff.railStep,
    `oasisSections=${oasisSectionOff} jargon=${JSON.stringify(simulateJargonOff)}`,
  );


  await contextG.close();

  if (genuineConsoleErrors.length > 0) {
    record('(global)', 'ZERO genuine browser console errors', false, `${genuineConsoleErrors.length} found: ${genuineConsoleErrors.slice(0, 5).join(' | ')}`);
  } else {
    record('(global)', 'ZERO genuine browser console errors', true, '');
  }

  return staticResult;
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
