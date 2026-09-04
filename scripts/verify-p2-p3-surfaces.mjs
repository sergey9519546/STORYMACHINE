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

const REPO = process.cwd();

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
  const verdictRendered = await pageA
    .waitForFunction(() => /RECOMMEND|CONSIDER|PASS/.test(document.body.innerText), { timeout: timing.ms(30000) })
    .then(() => true)
    .catch(() => false);
  record('P3', 'Sample coverage produces a rendered verdict (Doctor reachable end to end)', verdictRendered, 'checked CoverageSummary body for a verdict word');

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
  const rootCauseHeadingOff = await pageA.getByText(/contributing note/i).count();
  record(
    'P2-generative',
    'Script Doctor: root-cause findings still render with Labs OFF (deterministic content untouched)',
    rootCauseHeadingOff >= 1,
    `contributing-note disclosures=${rootCauseHeadingOff}`,
  );

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
    .waitForFunction(() => /RECOMMEND|CONSIDER|PASS/.test(document.body.innerText), { timeout: timing.ms(30000) })
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
      }
    }
  }

  await contextB.close();

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
