#!/usr/bin/env node
// Browser proof for the 2026-08-24 leftover-polish pass — the three claims
// that can only be settled in a real browser:
//
//   A. Coverage's "Jump to line" now HIGHLIGHTS the finding's lines
//      (FountainEditorHandle.highlightRange), the same way the full doctor
//      panel's finding clicks already did, instead of only moving the cursor.
//   B. The Settings tab strip follows the WAI-ARIA tabs keyboard pattern:
//      one Tab stop for the whole strip, Left/Right/Home/End move focus and
//      selection, aria-selected follows.
//   C. The findings delta is quiet when an edit only shifts line numbers.
//      Measured, not asserted: both doctor runs' reports are captured off the
//      wire, the churn the OLD identity (raw `pass::rule::location`) would
//      have reported is computed from them here, and it is compared against
//      what the panel actually shows on screen.
//
// Runs the real server (keyless) and drives real Chromium via Playwright,
// following scripts/verify-p2-p3-surfaces.mjs's boot/launch/console-capture
// structure. Screenshots land in output/playwright/ui-polish/ (gitignored).
//
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-ui-polish-affordances.mjs
//
// Exit code 0 only when every assertion passed.

import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { assertKeylessAiConfig, keylessBrowserServerEnv } from './lib/keyless-browser-certification.mjs';

const REPO = process.cwd();
const SHOTS = join(REPO, 'output', 'playwright', 'ui-polish');
mkdirSync(SHOTS, { recursive: true });

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

const PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${PORT}`;
let serverProc = null;
let browser = null;
const results = [];

function record(phase, assertion, pass, detail) {
  results.push({ phase, assertion, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${phase} :: ${assertion}${detail ? ' — ' + detail : ''}`);
}

async function bootServer() {
  console.log(`[verify] booting keyless server on port ${PORT}...`);
  serverProc = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd: REPO,
    env: keylessBrowserServerEnv(process.env, PORT),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let booted = false;
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('server boot timeout (30s)')), 30000));
  const ready = new Promise((resolve) => {
    let buf = '';
    const sniff = (d) => { buf += d; if (buf.includes('server_started')) { booted = true; resolve(); } };
    serverProc.stdout.on('data', sniff);
    serverProc.stderr.on('data', sniff);
  });
  await Promise.race([ready, timeout]);
  if (!booted) throw new Error('server started without emitting server_started');
  await assertKeylessAiConfig(BASE);
  console.log('[verify] server booted (keyless).');
}

async function launchBrowser() {
  const candidates = [
    fileURLToPath(new URL('../node_modules/playwright/index.mjs', import.meta.url)),
    fileURLToPath(new URL('../node_modules/playwright/index.js', import.meta.url)),
  ];
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    candidates.push(`${globalRoot}/playwright/index.mjs`, `${globalRoot}/playwright/index.js`);
  } catch {}
  const pwPath = candidates.find((p) => p && existsSync(p));
  if (!pwPath) throw new Error('Playwright not found.');
  const pw = await import(pathToFileURL(pwPath).href);
  const chromium = pw.chromium ?? pw.default?.chromium;
  return chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM_PATH || undefined });
}

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
  await bootServer();
  browser = await launchBrowser();
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
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });

  await page.getByRole('button', { name: /try sample coverage/i }).first().click({ timeout: 15000 });
  await page.waitForFunction(() => /RECOMMEND|CONSIDER|PASS/.test(document.body.innerText), { timeout: 40000 });
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
      .waitForSelector('.cm-sm-finding-flash', { timeout: 2000 })
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
  await page.getByRole('button', { name: 'Full report', exact: true }).first().click({ timeout: 15000 });
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
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
    .waitFor({ state: 'attached', timeout: 90000 })
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
  await page.waitForTimeout(500);
  // Same path a writer takes: Toolbar overflow ("More tools") → "Labs &
  // Settings". Selector convention lifted from
  // scripts/verify-p2-p3-surfaces.mjs's getOverflowMenuItemLabels.
  await page.getByRole('button', { name: 'More tools' }).first().click({ timeout: 15000 });
  const menu = page.getByRole('menu').first();
  await menu.waitFor({ timeout: 10000 });
  await menu.getByRole('menuitem', { name: /labs/i }).first().click({ timeout: 10000 });
  const tablist = page.locator('[role="tablist"][aria-label="Settings sections"]');
  await tablist.waitFor({ timeout: 15000 });
  await page.screenshot({ path: join(SHOTS, 'B1-settings-open.png'), fullPage: false });

  const tabState = () => page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
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

  // Tab from the dialog's close button must land on the selected tab, and one
  // more Tab must leave the strip entirely — the point of the pattern.
  await page.getByRole('button', { name: /close settings/i }).first().focus();
  await page.keyboard.press('Tab');
  const afterFirstTab = await tabState();
  record('B', 'Tab enters the strip at the selected tab',
    afterFirstTab.active === 'settings-tab-providers', `activeElement=${afterFirstTab.active}`);
  await page.keyboard.press('Tab');
  const afterSecondTab = await page.evaluate(() => document.activeElement?.id ?? document.activeElement?.tagName ?? null);
  record('B', 'the next Tab leaves the strip instead of visiting the other seven tabs',
    !/^settings-tab-/.test(String(afterSecondTab)), `activeElement=${afterSecondTab}`);

  // Arrow keys.
  await page.locator('#settings-tab-providers').focus();
  await page.keyboard.press('ArrowRight');
  const right = await tabState();
  record('B', 'ArrowRight moves focus AND selection to the next tab',
    right.active === 'settings-tab-llm' && right.selected[0] === 'settings-tab-llm',
    JSON.stringify(right));
  await page.screenshot({ path: join(SHOTS, 'B2-arrow-right.png'), fullPage: false });

  await page.keyboard.press('ArrowLeft');
  const left = await tabState();
  record('B', 'ArrowLeft moves back', left.active === 'settings-tab-providers' && left.selected[0] === 'settings-tab-providers', JSON.stringify(left));

  await page.keyboard.press('ArrowLeft');
  const wrapped = await tabState();
  record('B', 'ArrowLeft from the first tab wraps to the last', wrapped.active === 'settings-tab-labs', JSON.stringify(wrapped.active));

  await page.keyboard.press('Home');
  const home = await tabState();
  record('B', 'Home jumps to the first tab', home.active === 'settings-tab-providers', JSON.stringify(home.active));

  await page.keyboard.press('End');
  const end = await tabState();
  record('B', 'End jumps to the last tab', end.active === 'settings-tab-labs', JSON.stringify(end.active));
  await page.screenshot({ path: join(SHOTS, 'B3-end-key.png'), fullPage: false });

  const panelShown = await page.evaluate(() => {
    const active = document.querySelector('[role="tab"][aria-selected="true"]');
    const panel = document.querySelector('[role="tabpanel"]');
    return { activeTab: active?.id ?? null, panelId: panel?.id ?? null };
  });
  record('B', 'the visible tabpanel follows the selected tab',
    panelShown.activeTab === 'settings-tab-labs' && panelShown.panelId === 'settings-panel-labs',
    JSON.stringify(panelShown));
} catch (err) {
  record('harness', 'the proof run completed without throwing', false, String(err && err.stack ? err.stack : err));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (serverProc) serverProc.kill('SIGTERM');
}

const failed = results.filter((r) => !r.pass);
console.log('\n' + '='.repeat(72));
console.log(`[verify] ${results.length - failed.length}/${results.length} assertions passed.`);
console.log(`[verify] screenshots: ${SHOTS}`);
console.log('='.repeat(72));
process.exit(failed.length === 0 ? 0 : 1);
