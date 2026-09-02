// S1 (docs/PATH_TO_EXCELLENCE.md Phase S) — the restore drill. "A backup that
// has never been restored is not a backup": this exercises the FULL real
// lifecycle end to end — create a session with real content through the same
// primitives every route uses, take a real online backup
// (server/lib/backup.ts's backupSessions(), the exact logic `npm run backup`
// runs), destroy the session through the exact production primitive
// (destroySession(), the same one POST /api/session/delete calls), restore
// from the backup snapshot (the new restoreSession(), server/lib/backup.ts),
// then reopen the session through getOrCreateSession() and prove the content
// round-trips byte-exact.
//
// PERSIST-mode, real files, isolated in its own process (Node's test runner
// gives every *.test.ts file its own process by default — see
// tests/core/session-eviction.test.ts's identical rationale) so SESSION_DB_DIR
// can point at a fresh temp directory before session-store.ts's first import.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-restore-drill-'));
process.env.SESSION_DB_DIR = tmpDir;

const {
  getOrCreateSession, destroySession, dbPathFor, sessions, PERSIST_SESSIONS,
} = await import('../../server/lib/session-store.ts');
const { backupSessions, restoreSession } = await import('../../server/lib/backup.ts');

let backupRootDir: string;

before(() => {
  backupRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-restore-drill-backups-'));
});

after(() => {
  for (const [, s] of sessions) { try { s.stage.close(); } catch { /* already closed */ } }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(backupRootDir, { recursive: true, force: true });
});

describe('S1 restore drill — real backup, real destroy, real restore, byte-exact round trip', () => {
  it('this test file is exercising real PERSIST-mode file storage, not :memory:', () => {
    assert.equal(PERSIST_SESSIONS, true);
  });

  it('a session with real content survives destroySession() + restoreSession() byte-exact', async () => {
    const sessionId = 'restore-drill-session';
    const session = getOrCreateSession(sessionId);

    session.stage.addLocation({
      location_id: 'room', name: 'Room', description: 'A quiet room before the drill.', adjacent_locations: [],
    });
    session.stage.addAgent({
      char_id: 'hero', name: 'Hero', public_mask: 'calm', hidden_motive: 'escape',
      knowledge_vector: [], suspicion_score: 0, current_location_id: 'room', is_alive: true,
    });
    session.stage.recordAction(
      'hero', { action_type: 'WAIT', content: 'The moment before the restore drill', target: null }, 'room',
    );
    const draftScript = 'INT. ROOM - NIGHT\n\nA draft that must survive the round trip byte-exact.\n';
    // Retrospective finding #12: the title page (Labs-only form) previously
    // had no server-side column at all, so this exact drill restored a
    // session that structurally could not hold it. Included here so the
    // drill actually covers the finding, not just scriptText.
    const draftTitlePage = { title: 'THE RESTORE DRILL', author: 'A. Writer', contact: 'writer@example.com' };
    session.stage.saveScriptIDEState(sessionId, {
      scriptText: draftScript, snapshots: [], characters: [], researchNotes: [], isDarkMode: false,
      titlePage: draftTitlePage,
    });

    // ── Real backup — the exact logic `npm run backup` runs ────────────────
    const summary = await backupSessions({ sessionDbDir: tmpDir, backupRootDir, now: Date.now() });
    assert.equal(summary.noop, false);
    assert.equal(summary.backedUp, 1);
    assert.equal(summary.skipped, 0);
    const snapshotFile = path.join(summary.destDir!, `${sessionId}.db`);
    assert.ok(fs.existsSync(snapshotFile), 'backup snapshot file must exist on disk');
    const snapshotBytes = fs.readFileSync(snapshotFile);

    // ── Real destroy — the exact primitive POST /api/session/delete calls ──
    const dbPath = dbPathFor(sessionId);
    destroySession(sessionId);
    assert.ok(!sessions.has(sessionId), 'destroySession must drop the session from memory');
    assert.ok(!fs.existsSync(dbPath), 'destroySession must actually unlink the live db file — the session is truly gone');

    // ── Real restore ─────────────────────────────────────────────────────
    const { destination } = restoreSession({ snapshotFile, sessionDbDir: tmpDir, sessionId });
    assert.equal(destination, dbPath, 'restore must publish back under the original session id\'s canonical path');
    assert.ok(fs.existsSync(destination));

    const restoredBytes = fs.readFileSync(destination);
    assert.ok(
      snapshotBytes.equals(restoredBytes),
      'the restored database file must be byte-identical to the backup snapshot it was restored from',
    );

    // ── Reopen through the SAME lifecycle primitive every route uses and
    // prove every piece of content actually round-tripped, not just the
    // raw bytes on disk. ────────────────────────────────────────────────
    const restored = getOrCreateSession(sessionId);
    const locations = restored.stage.getAllLocations();
    assert.equal(locations.length, 1);
    assert.equal(locations[0].name, 'Room');
    assert.equal(locations[0].description, 'A quiet room before the drill.');

    const agents = restored.stage.getAllAgents();
    assert.equal(agents.length, 1);
    assert.equal(agents[0].char_id, 'hero');
    assert.equal(agents[0].hidden_motive, 'escape');

    const ledger = restored.stage.getFullLedger();
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].content, 'The moment before the restore drill');

    const scriptIDE = restored.stage.loadScriptIDEState(sessionId);
    assert.equal(scriptIDE?.scriptText, draftScript, 'the editor draft must round-trip byte-exact, not just approximately');
    assert.deepEqual(
      scriptIDE?.titlePage,
      draftTitlePage,
      'the title page (title/author/contact) must round-trip byte-exact, not be structurally unable to persist (finding #12)',
    );
  });

  it('restoreSession() refuses to restore over a session that is still live (no-clobber)', async () => {
    const sessionId = 'restore-drill-live-guard';
    const session = getOrCreateSession(sessionId);
    session.stage.addLocation({ location_id: 'r', name: 'R', description: '', adjacent_locations: [] });

    const summary = await backupSessions({ sessionDbDir: tmpDir, backupRootDir, now: Date.now() });
    const snapshotFile = path.join(summary.destDir!, `${sessionId}.db`);
    assert.ok(fs.existsSync(snapshotFile));

    // Session was never destroyed — its db file is still live on disk.
    assert.throws(
      () => restoreSession({ snapshotFile, sessionDbDir: tmpDir, sessionId }),
      /Refusing to restore over an existing session database/,
    );
  });

  it('restoreSession() throws a clear error for a missing snapshot file', () => {
    assert.throws(
      () => restoreSession({
        snapshotFile: path.join(backupRootDir, 'does-not-exist.db'),
        sessionDbDir: tmpDir,
        sessionId: 'whatever',
      }),
      /Backup snapshot not found/,
    );
  });
});
