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
// THIS IS A MANUALLY-RUN VERIFICATION SCRIPT, NOT A CI TEST — CI has no
// browser provisioned (no Chromium, no PW_CHROMIUM_PATH), so this is
// deliberately not wired into `npm test`. Run it by hand after touching
// feature-flags.ts, Toolbar.tsx, App.tsx's hash-routing/Labs gating, the
// export/verify routes, or the events instrumentation.
//
// Boot/teardown pattern (keyless server on an isolated free port, resolve
// Playwright from node_modules or the npm global root, the same genuine-
// console-error noise filter) is lifted directly from
// scripts/verify-focus-traps.mjs — read that file first if this one needs
// changing. It is also the origin of the exact StartScreen -> "Try sample
// coverage" -> CoverageSummary -> "Full report" flow reused below.
//
// Prereqs: Node >= 22.6; the `playwright` package in node_modules; a working
// Chromium binary. In this container that binary lives at
// /opt/pw-browsers/chromium, so run:
//
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-p2-p3-surfaces.mjs
//
// (PW_CHROMIUM_PATH is optional elsewhere — omit it to let Playwright
// resolve its own pinned browser build.)
//
// Exit codes: 0 = every assertion passed. 1 = at least one failed (see the
// per-assertion PASS/FAIL log above the summary for which, and why).

import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
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
const results = []; // { phase, assertion, pass, detail }
const genuineConsoleErrors = [];

function record(phase, assertion, pass, detail) {
  results.push({ phase, assertion, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${phase} :: ${assertion}${detail ? ' — ' + detail : ''}`);
}

// ── Server / browser boot-teardown (lifted from verify-focus-traps.mjs) ─────

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
    // Same dev-only/keyless-503 noise filter as smoke-p0-live-flow.mjs /
    // verify-focus-traps.mjs.
    const isHmr = /vite|hmr|websocket|24678/i.test(txt) || t === 'warning';
    const isKeyless503 = /503|analyze-script|model key|Failed to fetch/i.test(txt) && /analyze-script|503|key/i.test(txt);
    if (t === 'error' && !isHmr && !isKeyless503) genuineConsoleErrors.push(txt);
  });
  page.on('pageerror', (err) => {
    if (/websocket|ws:\/\//i.test(err.message)) return;
    genuineConsoleErrors.push(`pageerror: ${err.message}`);
  });
}

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
  await menu.waitFor({ timeout: 5000 });
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
  const { fountain: sampleFountain, title: sampleTitle } = loadSampleScript();
  console.log(`[verify] loaded sample script "${sampleTitle}" (${sampleFountain.length} chars) for the verify loop.`);

  const staticResult = staticCrossCheck();

  await bootServer();
  browser = await launchBrowser();

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
  wireConsoleCapture(pageA);

  console.log('\n=== P2 — DEFAULT SURFACE (Labs OFF, fresh profile) ===');
  await pageA.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const sampleCta = pageA.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta.waitFor({ timeout: 15000 });
  record('P2', 'StartScreen offers the sample-coverage CTA', true, '"Try sample coverage" button found');

  const advancedSimBtnOff = pageA.getByRole('button', { name: /advanced: simulation/i });
  const advancedSimCountOff = await advancedSimBtnOff.count();
  record('P2', 'StartScreen "Advanced: Simulation" (Labs-gated) is ABSENT with Labs OFF', advancedSimCountOff === 0, `found ${advancedSimCountOff} matching button(s)`);

  // ── Toolbar / overflow gating + the Ship-task bypass check, using a
  // blank draft so no doctor call is needed yet. ──────────────────────────
  const startFreshBtn = pageA.getByRole('button', { name: /start fresh/i }).first();
  await startFreshBtn.click();
  const toolbarHeader = pageA.locator('header.sm-pagetop');
  await toolbarHeader.waitFor({ timeout: 15000 });

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
  await pageA.waitForSelector('[aria-labelledby="ship-panel-title"]', { timeout: 10000 });
  await pageA.waitForTimeout(200);
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
  await pageA.waitForTimeout(150);

  // ══════════════════════════════════════════════════════════════════════
  // P3 — THE VERIFY LOOP, still Labs OFF (verify is deliberately outside
  // the Labs gate — see VerifyReport.tsx's own header comment).
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== P3 — sample coverage -> export -> #verify round-trip ===');

  // Clean slate so the sample flow starts from StartScreen again (the
  // "Start fresh" draft above persisted a config into localStorage).
  await pageA.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  await pageA.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });

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
  await Promise.all([
    pageA.waitForResponse((r) => /\/api\/scriptide\/doctor/.test(r.url()) && r.status() === 200, { timeout: 30000 }),
    sampleCta2.click({ timeout: 15000 }),
  ]);
  await pageA.waitForTimeout(400);

  const bodyTextAfterSample = await pageA.textContent('body');
  const verdictRendered = /RECOMMEND|CONSIDER|PASS/.test(bodyTextAfterSample);
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
  await pageA.waitForSelector('[role="dialog"]', { timeout: 10000 });

  const exportBtn = pageA.getByRole('button', { name: 'Export coverage report as an HTML document', exact: true }).first();
  const runDiagnosisBtnW4 = pageA.getByRole('button', { name: 'Run Diagnosis', exact: true }).first();
  const exportVisibleImmediately = await exportBtn
    .waitFor({ state: 'visible', timeout: 5000 })
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
  await pageA.waitForTimeout(400);


  const [download] = await Promise.all([
    pageA.waitForEvent('download', { timeout: 20000 }),
    exportBtn.click(),
  ]);
  const downloadPath = await download.path();
  const exportedHtml = downloadPath ? readFileSync(downloadPath, 'utf8') : '';
  record('P3', 'Export coverage report downloads an HTML file', exportedHtml.length > 0, `${exportedHtml.length} bytes, filename=${download.suggestedFilename()}`);

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
  await pageA.waitForTimeout(200);
  await pageA.goto(`${BASE}#verify`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await pageA.getByRole('heading', { name: /verify a report/i }).waitFor({ timeout: 10000 });

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
      pageA.waitForResponse((r) => /\/api\/export\/verify$/.test(r.url()), { timeout: 20000 }),
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

  await contextA.close();

  // ══════════════════════════════════════════════════════════════════════
  // CONTEXT B — fresh profile, Labs ON. Proves the gate is the flag, not
  // dead code: the same surfaces that were absent above must now appear.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== P2 — Labs ON: gated surface APPEARS ===');
  const contextB = await browser.newContext();
  await contextB.addInitScript(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); } catch {} });
  const pageB = await contextB.newPage();
  wireConsoleCapture(pageB);

  await pageB.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // StartScreen's hero wraps in `inert={!isIntroResolved || undefined}`
  // until its intro animation resolves — the button exists in the DOM
  // immediately but Playwright must wait for it to become genuinely
  // actionable rather than checking isVisible() on the very next tick.
  const advancedSimBtnOn = pageB.getByRole('button', { name: /advanced: simulation/i }).first();
  const advancedSimVisibleOn = await advancedSimBtnOn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  record('P2', 'StartScreen "Advanced: Simulation" APPEARS with Labs ON', advancedSimVisibleOn, advancedSimVisibleOn ? '' : 'button not found/visible with Labs ON');

  if (advancedSimVisibleOn) {
    await advancedSimBtnOn.click();
    await pageB.waitForTimeout(600);
    const smBodyText = await pageB.textContent('body').catch(() => '');
    const reachedStoryMachine = /Story Machine/i.test(smBodyText) && /Agents/i.test(smBodyText);
    record('P2', 'Clicking through reaches the OASIS/simulation surface (agent-roster jargon present)', reachedStoryMachine, 'checked body text for "Story Machine" + "Agents"');
  }

  // Fresh page (same context) to check Toolbar gating with Labs ON.
  await pageB.evaluate(() => { try { localStorage.setItem('sm_labs_enabled', 'true'); localStorage.removeItem('sm_app_view_v1'); } catch {} });
  await pageB.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const startFreshBtnOn = pageB.getByRole('button', { name: /start fresh/i }).first();
  await startFreshBtnOn.waitFor({ timeout: 15000 });
  await startFreshBtnOn.click();
  await pageB.locator('header.sm-pagetop').waitFor({ timeout: 15000 });

  const overflowLabelsOn = await getOverflowMenuItemLabels(pageB);
  const hasStudioOn = overflowLabelsOn.some((l) => /studio/i.test(l));
  const hasDirectorOn = overflowLabelsOn.some(isDirectorHudLabel);
  const hasSlateOn = overflowLabelsOn.some((l) => /slate/i.test(l));
  const hasSimulateOn = overflowLabelsOn.some((l) => /open simulate/i.test(l));
  record('P2', 'Toolbar overflow: "Open Studio" APPEARS with Labs ON', hasStudioOn, `items=${JSON.stringify(overflowLabelsOn)}`);
  record('P2', 'Toolbar overflow: "Director HUD" APPEARS with Labs ON', hasDirectorOn, `items=${JSON.stringify(overflowLabelsOn)}`);
  record('P2', 'Toolbar overflow: "Slate compare" APPEARS with Labs ON', hasSlateOn, `items=${JSON.stringify(overflowLabelsOn)}`);
  record('P2', 'Toolbar overflow: "Open Simulate" APPEARS with Labs ON', hasSimulateOn, `items=${JSON.stringify(overflowLabelsOn)}`);

  // Same Ship toolbar row check as CONTEXT A, mirrored for Labs ON — proves the
  // gate is the Labs flag (onOpenStoryMachine truthiness), not dead/removed code.
  const shipTaskBtnOn = pageB.getByRole('button', { name: 'Ship', exact: true }).first();
  await shipTaskBtnOn.click();
  await pageB.waitForTimeout(300);
  const simulateBtnOn = pageB.getByRole('button', { name: 'Simulate', exact: true }).first();
  const simulateVisibleOn = await simulateBtnOn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  record(
    'P2',
    'Ship toolbar row: "Simulate" button (reachable equivalent) APPEARS with Labs ON',
    simulateVisibleOn,
    simulateVisibleOn ? '' : 'button not found/visible on Ship toolbar row with Labs ON',
  );

  const persistentSimOn = pageB.getByRole('button', { name: 'Simulate in Story Machine', exact: true }).first();
  const persistentSimVisibleOn = await persistentSimOn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  record(
    'P2',
    'Persistent Toolbar: "Simulate in Story Machine" control APPEARS with Labs ON',
    persistentSimVisibleOn,
    persistentSimVisibleOn ? '' : 'control not found/visible in persistent Toolbar with Labs ON',
  );

  // W6, mirrored for Labs ON: Ship must show the SAME writer-facing
  // ShipPanel — zero research-chrome tab bar — regardless of the Labs flag.
  // Ship is not a Labs surface; only Studio (below) is.
  await pageB.waitForSelector('[aria-labelledby="ship-panel-title"]', { timeout: 10000 });
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
  await pageB.waitForTimeout(200);
  const moreBtnOn = pageB.getByRole('button', { name: 'More tools' }).first();
  await moreBtnOn.click();
  const openStudioItem = pageB.getByRole('menuitem', { name: /open studio/i });
  const openStudioCountOn = await openStudioItem.count();
  record('P2-W6', 'Toolbar overflow "Open Studio" (Labs ON) is present and clickable', openStudioCountOn === 1, `count=${openStudioCountOn}`);
  if (openStudioCountOn === 1) {
    await openStudioItem.click();
    await pageB.waitForTimeout(400);
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

  await contextB.close();

  if (genuineConsoleErrors.length > 0) {
    record('(global)', 'ZERO genuine browser console errors', false, `${genuineConsoleErrors.length} found: ${genuineConsoleErrors.slice(0, 5).join(' | ')}`);
  } else {
    record('(global)', 'ZERO genuine browser console errors', true, '');
  }

  return staticResult;
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
    for (const f of failed) console.log(`  - ${f.phase} :: ${f.assertion}${f.detail ? ' — ' + f.detail : ''}`);
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
