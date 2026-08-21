#!/usr/bin/env node
// verify-e5-command-palette.mjs — live-browser proof for Phase E5 (keyboard
// map + command palette; a11y sweep). Boot/teardown pattern (keyless server,
// resolve Playwright from node_modules or the npm global root) is lifted
// from scripts/verify-p2-p3-surfaces.mjs / verify-e4-local-safety-net.mjs —
// read either first if this one needs changing.
//
// THIS IS A MANUALLY-RUN VERIFICATION SCRIPT, NOT A CI TEST — same reasoning
// as those two (no browser provisioned in CI).
//
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-e5-command-palette.mjs
//
// Exit codes: 0 = every assertion passed. 1 = at least one failed.

import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { assertKeylessAiConfig, keylessBrowserServerEnv } from './lib/keyless-browser-certification.mjs';

const REPO = process.cwd();
const OUT_DIR = `${REPO}/scripts/output`;
mkdirSync(OUT_DIR, { recursive: true });

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
const results = [];

function record(assertion, pass, detail) {
  results.push({ assertion, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${assertion}${detail ? ' — ' + detail : ''}`);
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
  if (!pwPath) throw new Error('Playwright not found.');
  const pw = await import(pathToFileURL(pwPath).href);
  const chromium = pw.chromium ?? pw.default?.chromium;
  if (!chromium) throw new Error('Playwright imported but `chromium` export not found.');
  return chromium.launch({
    headless: true,
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  });
}

const isMac = process.platform === 'darwin';
const MOD = isMac ? 'Meta' : 'Control';

async function main() {
  await bootServer();
  browser = await launchBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  // ══════════════════════════════════════════════════════════════════════
  // 1) Entrance — Tab-order walk + screenshot.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 1) Entrance: Tab-order walk ===');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.getByRole('button', { name: /start fresh/i }).first().waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${OUT_DIR}/e5-entrance.png`, fullPage: false });

  // Click somewhere neutral first so focus starts from a known place (the
  // very first Tab from <body> is browser-dependent), then walk forward.
  await page.locator('body').click({ position: { x: 2, y: 2 } }).catch(() => {});
  const tabStops = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      return {
        tag: el.tagName,
        role: el.getAttribute('role'),
        label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 40) || null,
        visible: !!(el.offsetParent || el === document.documentElement),
      };
    });
    tabStops.push(info);
  }
  const reachedRealControls = tabStops.filter((s) => s && s.visible).length;
  record(
    'Entrance: Tab reaches at least 6 distinct, visible focusable controls in the first 12 presses',
    reachedRealControls >= 6,
    `stops=${JSON.stringify(tabStops)}`,
  );
  const noStrandedFocus = tabStops.every((s) => s === null || s.visible);
  record('Entrance: Tab never lands on a hidden/off-screen element', noStrandedFocus);

  // ══════════════════════════════════════════════════════════════════════
  // 2) Into the editor; open the command palette with Cmd/Ctrl+K.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 2) Command palette: open, filter, run a real action ===');
  await page.getByRole('button', { name: /start fresh/i }).first().click();
  await page.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Write', exact: true }).first().click();
  const editor = page.locator('.cm-content').first();
  await editor.waitFor({ timeout: 10000 });
  // Type a line first — some palette actions (export, snapshot) are
  // disabled on an empty draft, and this exercises a real Tab-out-of-editor
  // too (Tab is documented as unbound, not intercepted).
  await editor.focus();
  await page.keyboard.type('INT. VERIFY ROOM - DAY\n\nE5 command palette browser proof.', { delay: 5 });

  const editorFocusedBeforePalette = await page.evaluate(() => document.activeElement?.className?.includes('cm-') ?? false);
  record('Before Cmd/Ctrl+K: focus is in the editor (a real starting point to restore to later)', editorFocusedBeforePalette);

  await page.keyboard.press(`${MOD}+k`);
  const paletteDialog = page.getByRole('dialog', { name: 'Command palette' });
  await paletteDialog.waitFor({ timeout: 5000 }).then(() => record('Cmd/Ctrl+K opens the command palette (role="dialog")', true))
    .catch((e) => record('Cmd/Ctrl+K opens the command palette (role="dialog")', false, e.message));

  const paletteInputFocused = await page.evaluate(() => document.activeElement?.getAttribute('role') === 'combobox');
  record('Palette input has focus immediately on open', paletteInputFocused);

  await page.screenshot({ path: `${OUT_DIR}/e5-palette-open.png` });

  // Type to filter down to the real "Open Ship" action.
  await page.keyboard.type('ship', { delay: 20 });
  await page.waitForTimeout(150);
  const shipOption = page.getByRole('option', { name: /open ship/i }).first();
  const shipOptionVisible = await shipOption.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  record('Typing "ship" filters the palette down to "Open Ship (export & versions)"', shipOptionVisible);

  const filteredCount = await page.getByRole('option').count();
  record('Filtering narrows the visible option list (not showing every action)', filteredCount > 0 && filteredCount <= 3, `count=${filteredCount}`);

  await page.screenshot({ path: `${OUT_DIR}/e5-palette-filtered.png` });

  // Enter runs the SAME handler the Ship task-tab button calls.
  await page.keyboard.press('Enter');
  const shipPanelOpened = await page.locator('[aria-labelledby="ship-panel-title"]').waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
  record('Enter on the highlighted action runs it for real: the Ship panel opens', shipPanelOpened);

  const paletteClosedAfterRun = await paletteDialog.count().then((n) => n === 0);
  record('The palette itself closes after running an action', paletteClosedAfterRun);

  await page.screenshot({ path: `${OUT_DIR}/e5-ship-panel-from-palette.png` });

  // Close Ship (back to Write) before the next check.
  await page.getByRole('button', { name: /close ship panel/i }).click();
  await page.waitForTimeout(200);

  // ══════════════════════════════════════════════════════════════════════
  // 3) Escape restores focus to where the writer was.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 3) Escape restores focus ===');
  await editor.focus();
  await page.waitForTimeout(100);
  await page.keyboard.press(`${MOD}+k`);
  await paletteDialog.waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
  // CommandPalette exits via AnimatePresence (0.14s fade/scale) — the
  // <dialog> node stays mounted for that long even after React state
  // flips paletteOpen false, so an immediate .count() check would
  // (falsely) still see it. Same margin used after every other
  // exit-animated close below.
  await page.waitForTimeout(400);
  const paletteClosedOnEscape = await paletteDialog.count().then((n) => n === 0);
  record('Escape closes the command palette', paletteClosedOnEscape);
  const focusRestoredToEditor = await page.evaluate(() => document.activeElement?.className?.includes('cm-') ?? false);
  record('Escape restores focus to the editor (where the writer was before Cmd/Ctrl+K)', focusRestoredToEditor);

  // ══════════════════════════════════════════════════════════════════════
  // 4) Keyboard shortcuts panel still opens (Ctrl+/) and is itself a real
  //    dialog now (regression guard — E5 added role="dialog" + focus trap
  //    to a component that had neither before).
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 4) Keyboard shortcuts panel ===');
  await page.keyboard.press(`${MOD}+/`);
  const shortcutDialog = page.getByRole('dialog', { name: /keyboard shortcuts/i });
  const shortcutDialogOpened = await shortcutDialog.waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
  record('Cmd/Ctrl+/ opens the Keyboard Shortcuts panel as a real dialog', shortcutDialogOpened);
  const mentionsPalette = await page.getByText(/open the command palette/i).count();
  record('The shortcuts panel documents Cmd/Ctrl+K (the palette itself)', mentionsPalette > 0);
  await page.screenshot({ path: `${OUT_DIR}/e5-shortcuts-panel.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const shortcutDialogClosedOnEscape = await shortcutDialog.count().then((n) => n === 0);
  record('Escape closes the Keyboard Shortcuts panel (E5 fix — it had no Escape handling before this pass)', shortcutDialogClosedOnEscape);

  // ══════════════════════════════════════════════════════════════════════
  // 5) Settings panel is now a real dialog with a focus trap.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 5) Settings panel dialog semantics ===');
  const overflowBtn = page.getByRole('button', { name: 'More tools' }).first();
  await overflowBtn.click();
  const menu = page.getByRole('menu').first();
  await menu.waitFor({ timeout: 5000 });
  await menu.getByRole('menuitem', { name: /labs & settings|labs is on/i }).first().click();
  const settingsDialog = page.getByRole('dialog', { name: /settings/i });
  const settingsOpened = await settingsDialog.waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
  record('Settings opens as role="dialog" aria-modal="true"', settingsOpened);
  await page.screenshot({ path: `${OUT_DIR}/e5-settings-panel.png` });

  // Tab-cycle a large number of times and confirm focus never leaves the dialog.
  let stayedInDialog = true;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      return dialog ? dialog.contains(document.activeElement) : false;
    });
    if (!inside) { stayedInDialog = false; break; }
  }
  record('Settings dialog traps Tab — 25 presses never escape it', stayedInDialog);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const settingsClosedOnEscape = await settingsDialog.count().then((n) => n === 0);
  record('Escape closes the Settings dialog', settingsClosedOnEscape);

  await context.close();

  const failed = results.filter((r) => !r.pass);
  console.log('\n' + '='.repeat(72));
  console.log(`[verify] ${results.length - failed.length}/${results.length} assertions passed.`);
  console.log('='.repeat(72));
  return failed.length === 0;
}

let allPassed = false;
try {
  allPassed = await main();
} catch (e) {
  console.error('[verify] FATAL:', e.stack || e.message);
} finally {
  try { if (browser) await browser.close(); } catch {}
  try { if (serverProc) serverProc.kill(); } catch {}
}
process.exit(allPassed ? 0 : 1);
