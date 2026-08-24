#!/usr/bin/env node
// verify-e4-local-safety-net.mjs — live-browser proof for Phase E4 (local-
// first safety net: IndexedDB-backed autosave, the "delete everything"
// control, and the #privacy page). Boot/teardown pattern (keyless server,
// resolve Playwright from node_modules or the npm global root) is lifted
// from scripts/verify-p2-p3-surfaces.mjs — read that file first if this one
// needs changing.
//
// THIS IS A MANUALLY-RUN VERIFICATION SCRIPT, NOT A CI TEST — same reasoning
// as verify-p2-p3-surfaces.mjs (no browser provisioned in CI).
//
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-e4-local-safety-net.mjs
//
// Exit codes: 0 = every assertion passed. 1 = at least one failed.

import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
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

async function getOverflowMenuItem(page, namePattern) {
  const btn = page.getByRole('button', { name: 'More tools' }).first();
  await btn.click();
  const menu = page.getByRole('menu').first();
  await menu.waitFor({ timeout: 5000 });
  const item = menu.getByRole('menuitem', { name: namePattern }).first();
  await item.waitFor({ timeout: 5000 });
  return item;
}

const DRAFT_TEXT = 'INT. SAFE HOUSE - NIGHT\n\nA line only this browser has ever seen — E4 local safety net proof.';

async function main() {
  await bootServer();
  browser = await launchBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  // ══════════════════════════════════════════════════════════════════════
  // 1) Type a draft, reload, confirm it is restored (IndexedDB mirror +
  //    localStorage both feed the mount-time restore path).
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 1) autosave -> reload -> restored ===');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.getByRole('button', { name: /start fresh/i }).first().click();
  await page.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Write', exact: true }).first().click();

  const editor = page.locator('.cm-content').first();
  await editor.waitFor({ timeout: 10000 });
  // An empty draft shows a centered "the page is yours" coach card
  // (ScriptIDE.tsx) that is deliberately pointer-events-auto so a writer can
  // interact with it — it visually covers the middle of .cm-content, so a
  // plain center click there hits the card, not CodeMirror. .focus() moves
  // DOM focus straight to the contenteditable regardless of what is drawn on
  // top, which is what a real writer's first keystroke does too (the coach
  // card has no focusable control of its own to steal focus first).
  await editor.focus();
  await page.keyboard.type(DRAFT_TEXT, { delay: 5 });

  const typedTextCheck = await editor.innerText();
  record('DEBUG: editor contains typed text immediately after typing', typedTextCheck.includes('E4 local safety net proof'), JSON.stringify(typedTextCheck.slice(0, 200)));

  // Debounced local write is 500ms (ScriptIDE.tsx); give real margin for the
  // IndexedDB mirror write (also async) to land too.
  await sleep(1500);

  const idbSnapshotBeforeReload = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const req = indexedDB.open('storymachine_scriptide_v1', 1);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction('draft', 'readonly');
          const getReq = tx.objectStore('draft').get('current');
          getReq.onsuccess = () => resolve(getReq.result ?? null);
          getReq.onerror = () => resolve(null);
        } catch { resolve(null); }
      };
      req.onerror = () => resolve(null);
    });
  });
  const idbHasDraft = !!idbSnapshotBeforeReload && idbSnapshotBeforeReload.scriptText === DRAFT_TEXT;
  record('IndexedDB mirror holds the typed draft before reload', idbHasDraft, idbHasDraft ? '' : `got: ${JSON.stringify(idbSnapshotBeforeReload)}`);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('.cm-content').first().waitFor({ timeout: 15000 });
  await sleep(300); // let the mount-time restore effects settle
  const restoredText = await page.locator('.cm-content').first().innerText();
  const restored = restoredText.includes('A line only this browser has ever seen');
  record('Draft survives a reload (localStorage + IndexedDB mirror)', restored, restored ? '' : `editor text: ${JSON.stringify(restoredText.slice(0, 120))}`);

  // ══════════════════════════════════════════════════════════════════════
  // 2) Delete everything -> reload -> clean slate.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 2) delete-everything -> reload -> clean slate ===');
  const settingsItem = await getOverflowMenuItem(page, /labs & settings|labs is on/i);
  await settingsItem.click();
  // E5's a11y pass gave the Settings tab strip real ARIA tablist semantics,
  // so the tabs are role="tab" now, not buttons — this selector went stale
  // between E4 landing and E5 landing the same day, and nobody re-ran this
  // proof on the merged tree until 2026-08-24.
  await page.getByRole('tab', { name: 'Session', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Everything', exact: true }).first().click();
  await page.getByRole('button', { name: /yes, delete everything/i }).click();

  // The control itself reloads the page after a short delay — wait for that
  // navigation rather than reloading manually, so this exercises the REAL
  // control's own reload, not a substitute.
  await page.waitForURL(BASE + '/', { timeout: 10000 }).catch(() => {});
  await sleep(1000);

  const idbSnapshotAfterDelete = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const req = indexedDB.open('storymachine_scriptide_v1', 1);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction('draft', 'readonly');
          const getReq = tx.objectStore('draft').get('current');
          getReq.onsuccess = () => resolve(getReq.result ?? null);
          getReq.onerror = () => resolve(null);
        } catch { resolve(null); }
      };
      req.onerror = () => resolve(null);
    });
  });
  record('IndexedDB draft record is gone after delete-everything', idbSnapshotAfterDelete === null, `got: ${JSON.stringify(idbSnapshotAfterDelete)}`);

  // Not literally zero keys: a fresh page load re-mints a session id
  // (src/lib/session.ts's getSessionId(), called by main.tsx's fetch
  // wrapper on the very first /api/ call) the instant the app boots again —
  // exactly the documented tradeoff in src/lib/scriptide-wipe.ts's own doc
  // comment. The real assertion is that the DRAFT key specifically is gone
  // and nothing else besides that fresh session id survived.
  const localStorageAfter = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      out[k] = localStorage.getItem(k);
    }
    return out;
  });
  const draftKeyGone = !('scriptide_draft_v1' in localStorageAfter);
  const onlySessionIdSurvived = Object.keys(localStorageAfter).every((k) => k === 'sm_session_id_v1');
  record(
    'localStorage has no draft after delete-everything (only a freshly-minted session id may remain)',
    draftKeyGone && onlySessionIdSurvived,
    `keys=${JSON.stringify(Object.keys(localStorageAfter))}`,
  );

  // Land on the entrance (StartScreen), not the editor with a stale draft —
  // the clean-slate proof.
  const startScreenBack = await page.getByRole('button', { name: /try sample coverage/i }).first()
    .waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
  record('App shows the entrance (StartScreen) after delete-everything + reload — not a leftover draft', startScreenBack);

  if (startScreenBack) {
    await page.getByRole('button', { name: /start fresh/i }).first().click();
    await page.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Write', exact: true }).first().click();
    const editorTextAfterDelete = await page.locator('.cm-content').first().innerText();
    const isClean = !editorTextAfterDelete.includes('A line only this browser has ever seen');
    record('Re-opened editor has NO trace of the deleted draft', isClean, `editor text: ${JSON.stringify(editorTextAfterDelete.slice(0, 120))}`);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3) Screenshot the privacy page.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 3) #privacy page screenshot ===');
  await page.goto(`${BASE}#privacy`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.getByRole('heading', { name: /^privacy$/i }).waitFor({ timeout: 10000 });
  const screenshotPath = `${REPO}/scripts/output/e4-privacy-page.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  record('#privacy page screenshot captured', existsSync(screenshotPath), screenshotPath);

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
