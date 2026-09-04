#!/usr/bin/env node
// verify-e4-local-safety-net.mjs — live-browser proof for Phase E4 (local-
// first safety net: IndexedDB-backed autosave, the "delete everything"
// control, and the #privacy page). The shared boot/launch/console-capture
// machinery and the PASS/FAIL summary live in scripts/lib/browser-verify.mjs
// — change them there, not here.
//
// THIS RUNS IN CI (2026-09-02), like the rest of the browser battery:
// `playwright` is a pinned devDependency and the `browser` job in
// .github/workflows/ci.yml provisions Chromium before running the suites.
// PW_CHROMIUM_PATH stays an override for a browser provisioned outside
// Playwright's cache (this container):
//
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-e4-local-safety-net.mjs
//
// Exit codes: 0 = every assertion passed. 1 = at least one failed.

import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  bootKeylessServer,
  createRecorder,
  launchChromium,
  pickFreePort,
  shutdown,
} from './lib/browser-verify.mjs';

const REPO = process.cwd();

// Point the booted server's two on-disk session stores at throwaway
// directories, so section 4 below can actually LOOK at them — the whole
// deletion promise is about bytes on disk, and asserting on the repo's own
// data/ directory would mix this run's artifacts with a developer's real
// sessions. bootKeylessServer spawns with the parent env, so setting these
// before the boot is what the child inherits.
const STORE_ROOT = mkdtempSync(join(tmpdir(), 'e4-stores-'));
process.env.SESSION_DB_DIR = join(STORE_ROOT, 'sessions');
process.env.SESSION_BACKUP_DIR = join(STORE_ROOT, 'backups');

/** Every file under `dir` whose bytes contain `needle`. */
function filesContaining(dir, needle) {
  const hits = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      try { if (readFileSync(p).includes(needle)) hits.push(`${p} (${statSync(p).size}b)`); } catch { /* unreadable */ }
    }
  };
  walk(dir);
  return hits;
}

const ISOLATED_PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${ISOLATED_PORT}`;

let serverProc = null;
let browser = null;

const { record, printSummary } = createRecorder();

/**
 * Confirm the "Delete Everything" dialog and wait for the wipe's OWN
 * navigation to actually happen.
 *
 * The control reloads itself 1200ms after the wipe finishes, so that the
 * result line stays readable (SettingsPanel.tsx). Waiting a fixed ~1s and then
 * reading the stores races that timer: the read lands BEFORE the page has
 * reloaded and reports the pre-delete state, which is exactly how this suite
 * failed under battery load while passing when run alone. `waitForURL` cannot
 * carry the wait either — the post-wipe URL is usually identical to the
 * current one, so it resolves instantly without a navigation having occurred.
 * Subscribing to the main frame's navigation BEFORE the click is the only
 * observation that is actually tied to the reload.
 */
async function confirmDeleteAndWaitForReload(page) {
  const navigated = page
    .waitForEvent('framenavigated', { predicate: (frame) => frame === page.mainFrame(), timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  await page.getByRole('button', { name: /yes, delete everything/i }).click();
  const didNavigate = await navigated;
  // The reloaded app re-mints a session id on its first /api/ call and
  // re-renders; give those mount-time effects room to settle before any store
  // is read, so a "clean" reading cannot be an artifact of reading too early.
  await page.locator('body').waitFor({ timeout: 10000 }).catch(() => {});
  await sleep(1200);
  return didNavigate;
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
  serverProc = await bootKeylessServer({ repo: REPO, port: ISOLATED_PORT, baseUrl: BASE });
  browser = await launchChromium();
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

  // The control itself reloads the page after a short delay — wait for that
  // navigation rather than reloading manually, so this exercises the REAL
  // control's own reload, not a substitute.
  const deleteReloaded = await confirmDeleteAndWaitForReload(page);
  record('Delete-everything performed its own reload (the control, not the test, navigated)', deleteReloaded);

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
  // comment. The real assertion is that the DRAFT key specifically is gone and
  // that whatever the reload re-minted holds no writer state — see the
  // clean-boot value check below.
  const localStorageAfter = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      out[k] = localStorage.getItem(k);
    }
    return out;
  });
  const draftKeyGone = !('scriptide_draft_v1' in localStorageAfter);
  // "Only a freshly-minted session id" was true when this assertion was
  // written and is one key short now: App.tsx persists WHICH SCREEN the app is
  // on in a mount-time effect, so the reload re-mints `sm_app_view_v1` on the
  // way back up, exactly like `sm_session_id_v1`. Both are re-created by a
  // clean boot AFTER the wipe rather than surviving it, so the honest form of
  // this check is not a key allowlist — it is that every surviving key holds a
  // CLEAN-BOOT value: an opaque new session id, or a view marker that says
  // "no config, not in the editor". A view marker carrying a real config would
  // be leftover writer state and would (correctly) fail here.
  const CLEAN_BOOT_VALUES = {
    sm_session_id_v1: (v) => typeof v === 'string' && v.length > 0,
    sm_app_view_v1: (v) => {
      try {
        const parsed = JSON.parse(v);
        return parsed?.config === null && parsed?.showStoryMachine === false;
      } catch { return false; }
    },
  };
  const survivorsAreCleanBoot = Object.entries(localStorageAfter)
    .every(([k, v]) => CLEAN_BOOT_VALUES[k]?.(v) === true);
  record(
    'localStorage has no draft after delete-everything (only freshly-minted, content-free clean-boot keys may remain)',
    draftKeyGone && survivorsAreCleanBoot,
    `entries=${JSON.stringify(localStorageAfter)}`,
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

  // ══════════════════════════════════════════════════════════════════════
  // 4) THE FULL STORE SWEEP (2026-09-04 privacy re-verification).
  //
  // Sections 1-3 verify the two stores that existed when E4 landed. Four
  // more places the writer's draft lives appeared afterwards: a title page
  // column and per-snapshot health/verdict on the server row, an in-memory
  // collaboration registry whose Y.Doc holds the draft text, and the
  // doctor's report cache. This section drives all of them in ONE writer
  // journey and then searches every store BY ENUMERATION — IndexedDB
  // databases are listed, not assumed by name — for a marker string that
  // appears nowhere else.
  //
  // A fresh browser context so the assertions above keep testing exactly the
  // sequence they were written for.
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n=== 4) every store, one marker, one delete ===');
  const MARKER = 'E4SWEEPMARKER';
  const MARKED_SCRIPT = [
    `Title: THE ${MARKER} AFFAIR`,
    `Author: ${MARKER} Writer`,
    '',
    `INT. ${MARKER} WAREHOUSE - NIGHT`,
    '',
    `A cold room. ${MARKER} is painted on the wall.`,
    '',
    `DET ${MARKER}`,
    `This is the ${MARKER} line.`,
    '',
    `EXT. ${MARKER} STREET - DAY`,
    '',
    `Rain, and ${MARKER} again.`,
    '',
    `DET ${MARKER}`,
    `Another ${MARKER} line.`,
  ].join('\n');

  const sweepContext = await browser.newContext();
  const sweep = await sweepContext.newPage();
  await sweep.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sweep.getByRole('button', { name: /start fresh/i }).first().click();
  await sweep.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
  await sweep.getByRole('button', { name: 'Write', exact: true }).first().click();
  const sweepEditor = sweep.locator('.cm-content').first();
  await sweepEditor.waitFor({ timeout: 10000 });
  await sweepEditor.focus();
  await sweep.keyboard.type(MARKED_SCRIPT, { delay: 1 });
  await sleep(1500);

  // Drive the rest through the app's OWN fetch surface, from inside the page,
  // so every request carries the same session id the editor is autosaving
  // under — these are the real routes the panels call.
  const journey = await sweep.evaluate(async ({ script, marker }) => {
    const sessionId = localStorage.getItem('sm_session_id_v1');
    const headers = { 'Content-Type': 'application/json', 'X-Session-Id': sessionId };
    const out = { sessionId };
    const post = async (path, body) => {
      const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
      return { status: res.status, json: await res.json().catch(() => null) };
    };
    out.doctor = (await post('/api/scriptide/doctor', { fountain: script })).status;
    out.save = (await post('/api/scriptide/save', {
      scriptText: script,
      titlePage: { title: `THE ${marker} AFFAIR`, author: `${marker} Writer`, contact: `${marker}@example.com` },
      snapshots: [
        { id: 's1', name: `Snapshot one ${marker}`, text: script, date: new Date().toISOString(),
          health: 41, verdict: 'PASS', sceneCount: 2, analyzedAt: Date.now() },
        { id: 's2', name: `Snapshot two ${marker}`, text: script, date: new Date().toISOString(),
          health: 44, verdict: 'CONSIDER', sceneCount: 2, analyzedAt: Date.now() },
      ],
      characters: [{ name: `DET ${marker}`, notes: 'lead' }],
      researchNotes: [{ text: `research ${marker}` }],
      isDarkMode: false,
      expectedUpdatedAt: null,
    })).status;
    out.letter = (await post('/api/export/coverage-letter', {
      fountain: script, title: `THE ${marker} AFFAIR`, author: `${marker} Writer`,
    })).status;
    const room = await post('/api/collab/rooms', {});
    out.room = room.status;
    out.roomId = room.json?.roomId ?? null;
    out.tokenBefore = out.roomId ? (await post('/api/collab/token', { roomId: out.roomId })).status : null;
    // POST /api/reset publishes a verified SQLite copy of the WHOLE session
    // into the reset-backup root before it clears the simulation aggregate.
    // Exercised here on purpose: until 2026-09-04 that copy outlived
    // "Delete Everything" by up to a week.
    const reset = await post('/api/reset', {});
    out.reset = reset.status;
    out.backupCreated = reset.json?.backupCreated ?? null;
    return out;
  }, { script: MARKED_SCRIPT, marker: MARKER });

  record(
    'Sweep journey ran for real (doctor, save, coverage letter, collab room all answered 200)',
    journey.doctor === 200 && journey.save === 200 && journey.letter === 200
      && journey.room === 200 && journey.tokenBefore === 200,
    JSON.stringify(journey),
  );

  const serverHadIt = await fetch(`${BASE}/api/scriptide/load?sessionId=${journey.sessionId}`)
    .then(r => r.text()).catch(() => '');
  record(
    'Precondition: the server row really holds the marked script, title page and both snapshots',
    serverHadIt.includes(MARKER) && serverHadIt.includes('Snapshot two'),
    `len=${serverHadIt.length}`,
  );

  const dbHitsBefore = filesContaining(process.env.SESSION_DB_DIR, MARKER);
  const backupHitsBefore = filesContaining(process.env.SESSION_BACKUP_DIR, MARKER);
  record(
    'Precondition: the marked script really is on disk in BOTH the session database and a reset backup',
    dbHitsBefore.length > 0 && backupHitsBefore.length > 0,
    `db=${JSON.stringify(dbHitsBefore)} backups=${JSON.stringify(backupHitsBefore)} reset=${journey.reset}/${journey.backupCreated}`,
  );

  // The delete, through the real control.
  const sweepSettings = await getOverflowMenuItem(sweep, /labs & settings|labs is on/i);
  await sweepSettings.click();
  await sweep.getByRole('tab', { name: 'Session', exact: true }).click();
  await sweep.getByRole('button', { name: 'Delete Everything', exact: true }).first().click();
  const sweepReloaded = await confirmDeleteAndWaitForReload(sweep);
  record('Sweep: delete-everything performed its own reload before any store was read', sweepReloaded);

  // ── localStorage: enumerated, not sampled ───────────────────────────────
  const sweepLocal = await sweep.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) out[localStorage.key(i)] = localStorage.getItem(localStorage.key(i));
    return out;
  });
  record(
    'No localStorage value anywhere holds the marker after delete-everything',
    !JSON.stringify(sweepLocal).includes(MARKER),
    `keys=${JSON.stringify(Object.keys(sweepLocal))}`,
  );

  // ── sessionStorage ──────────────────────────────────────────────────────
  const sweepSession = await sweep.evaluate(() => {
    const out = {};
    for (let i = 0; i < sessionStorage.length; i++) out[sessionStorage.key(i)] = sessionStorage.getItem(sessionStorage.key(i));
    return out;
  });
  record(
    'No sessionStorage value holds the marker after delete-everything',
    !JSON.stringify(sweepSession).includes(MARKER),
    `keys=${JSON.stringify(Object.keys(sweepSession))}`,
  );

  // ── IndexedDB: every database, every object store, by ENUMERATION ───────
  // Section 2 above checks the one database this build is known to create.
  // This check does not assume the name: it lists what the origin actually
  // holds, so a future store added without a matching wipe step fails here.
  const idbDump = await sweep.evaluate(async () => {
    if (typeof indexedDB.databases !== 'function') return { unsupported: true };
    const names = (await indexedDB.databases()).map(d => d.name).filter(Boolean);
    const dump = {};
    for (const name of names) {
      dump[name] = await new Promise((resolve) => {
        const req = indexedDB.open(name);
        req.onsuccess = () => {
          const db = req.result;
          const stores = [...db.objectStoreNames];
          if (stores.length === 0) { db.close(); resolve({ stores: [], rows: [] }); return; }
          try {
            const tx = db.transaction(stores, 'readonly');
            const rows = [];
            let left = stores.length;
            for (const s of stores) {
              const r = tx.objectStore(s).getAll();
              const done = () => { if (--left === 0) { db.close(); resolve({ stores, rows }); } };
              r.onsuccess = () => { rows.push([s, r.result]); done(); };
              r.onerror = done;
            }
          } catch { db.close(); resolve({ stores, rows: [], error: true }); }
        };
        req.onerror = () => resolve({ error: true });
      });
    }
    return { names, dump };
  });
  record(
    'IndexedDB: no database on this origin holds the marker after delete-everything (enumerated, not assumed)',
    !idbDump.unsupported && !JSON.stringify(idbDump).includes(MARKER),
    `databases=${JSON.stringify(idbDump.names ?? idbDump)}`,
  );

  // ── The server session row ──────────────────────────────────────────────
  const serverAfter = await fetch(`${BASE}/api/scriptide/load?sessionId=${journey.sessionId}`)
    .then(r => r.text()).catch(() => '');
  record(
    'The server session row (script, title page, snapshots) is empty after delete-everything',
    !serverAfter.includes(MARKER),
    serverAfter.slice(0, 200),
  );

  // ── Both on-disk stores, byte-searched ──────────────────────────────────
  // The live database was always unlinked here. The reset-backup directory
  // was NOT until 2026-09-04: a writer who had ever hit Reset left a complete,
  // readable copy of their script on the server for the rest of the retention
  // window (5 copies / 7 days by default). Measured, not assumed — this reads
  // the actual bytes.
  const dbHitsAfter = filesContaining(process.env.SESSION_DB_DIR, MARKER);
  record(
    'No file under the session database root still contains the deleted script',
    dbHitsAfter.length === 0,
    JSON.stringify(dbHitsAfter),
  );
  const backupHitsAfter = filesContaining(process.env.SESSION_BACKUP_DIR, MARKER);
  record(
    'No file under the reset-backup root still contains the deleted script',
    backupHitsAfter.length === 0,
    JSON.stringify(backupHitsAfter),
  );

  // ── The in-memory collaboration registry ────────────────────────────────
  // A room minted by this session used to stay joinable for its whole 24h TTL
  // after the writer deleted everything — and its Y.Doc kept the draft in
  // process memory. Same identical refusal as an id that was never minted.
  const tokenAfter = journey.roomId
    ? await fetch(`${BASE}/api/collab/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': journey.sessionId },
      body: JSON.stringify({ roomId: journey.roomId }),
    }).then(r => r.status).catch(() => -1)
    : -1;
  record(
    'The collaboration room this session created is no longer joinable after delete-everything',
    tokenAfter === 404,
    `POST /api/collab/token -> ${tokenAfter} (404 expected; 200 means the room and its Y.Doc survived)`,
  );

  // ── The URL itself ──────────────────────────────────────────────────────
  record(
    'The post-delete URL carries no collaboration room id (a reload must not rejoin the deleted room)',
    !sweep.url().includes('collab='),
    sweep.url(),
  );

  // ── Nothing writer-identifiable reached /metrics ────────────────────────
  const metricsBody = await fetch(`${BASE}/metrics`).then(r => r.text()).catch(() => '');
  record(
    'GET /metrics carries none of the writer\'s words',
    metricsBody.length > 0 && !metricsBody.includes(MARKER),
    `len=${metricsBody.length}`,
  );

  // ── A plain refresh, not a delete, must still keep the draft ────────────
  // The other half of the promise: this is a SAFETY net, so "cleared" must
  // not be the answer to an ordinary reload.
  const refreshContext = await browser.newContext();
  const refresh = await refreshContext.newPage();
  await refresh.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await refresh.getByRole('button', { name: /start fresh/i }).first().click();
  await refresh.locator('header.sm-pagetop').waitFor({ timeout: 15000 });
  await refresh.getByRole('button', { name: 'Write', exact: true }).first().click();
  const refreshEditor = refresh.locator('.cm-content').first();
  await refreshEditor.waitFor({ timeout: 10000 });
  await refreshEditor.focus();
  await refresh.keyboard.type(`INT. ${MARKER} ROOM - DAY\n\nA line a refresh must not destroy.`, { delay: 2 });
  await sleep(1500);
  await refresh.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await refresh.locator('.cm-content').first().waitFor({ timeout: 15000 });
  await sleep(500);
  const afterRefresh = await refresh.locator('.cm-content').first().innerText();
  record(
    'A plain refresh (not a delete) still restores the draft — the safety net is a net, not a shredder',
    afterRefresh.includes('A line a refresh must not destroy'),
    JSON.stringify(afterRefresh.slice(0, 120)),
  );
  await refreshContext.close();
  await sweepContext.close();

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
