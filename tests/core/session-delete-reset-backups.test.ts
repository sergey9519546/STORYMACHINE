// "Delete Everything" vs. the automatic reset-backup directory
// (server/lib/session-store.ts's destroySession).
//
// THE BUG THIS LOCKS DOWN. POST /api/reset (server/routes/game.ts) takes a
// verified SQLite online backup of the WHOLE session — script text, snapshots,
// characters, research notes, title page — into
// SESSION_BACKUP_DIR/<sessionId>/ before it clears the simulation aggregate,
// and keeps up to SESSION_RESET_BACKUP_KEEP copies for
// SESSION_RESET_BACKUP_TTL_HOURS (7 days by default). destroySession() used to
// unlink only the LIVE database, so a writer who had ever hit Reset and then
// hit "Delete Everything" left a complete, readable copy of their script on
// the server's disk for the rest of that retention window. Reproduced in a
// live browser run before the fix: a 249KB .db under the backup root still
// contained the marker string, the title page and both snapshots after the
// deletion reported success.
//
// Like tests/core/session-eviction.test.ts, this file runs its own
// PERSIST_SESSIONS-mode store against fresh temp directories — SESSION_DB_DIR
// and SESSION_BACKUP_DIR are module-level consts in session-store.ts, read
// once at load, so both must be set before its first import. Node's test
// runner isolates each *.test.ts file in its own process, so these env writes
// cannot bleed into another file.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-delete-backups-'));
const dbDir = path.join(tmpRoot, 'sessions');
const backupDir = path.join(tmpRoot, 'backups');
fs.mkdirSync(dbDir, { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });
process.env.SESSION_DB_DIR = dbDir;
process.env.SESSION_BACKUP_DIR = backupDir;

const {
  sessions, getOrCreateSession, destroySession, dbPathFor,
  PERSIST_SESSIONS, SESSION_BACKUP_DIR,
} = await import('../../server/lib/session-store.ts');
const { createVerifiedBackup } = await import('../../server/lib/backup.ts');

after(() => {
  for (const [, s] of sessions) { try { s.stage.close(); } catch { /* already closed */ } }
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

const MARKER = 'RESETBACKUPMARKER42';

describe('destroySession — the reset-backup directory is part of "delete everything"', () => {
  it('this file is exercising real PERSIST-mode file storage, not :memory:', () => {
    assert.equal(PERSIST_SESSIONS, true);
    assert.equal(SESSION_BACKUP_DIR, backupDir);
  });

  it('deletes the session\'s reset backups, and their content is really gone from disk', async () => {
    const sessionId = 'reset-backup-drill';
    const session = getOrCreateSession(sessionId);
    session.stage.saveScriptIDEState(sessionId, {
      scriptText: `INT. VAULT - NIGHT\n\n${MARKER} is written on the wall.\n`,
      snapshots: [], characters: [], researchNotes: [], isDarkMode: false,
      titlePage: { title: `THE ${MARKER} AFFAIR`, author: 'A. Writer', contact: '' },
    });

    // The exact artifact POST /api/reset publishes, via the exact helper it
    // calls — not a hand-written placeholder file.
    const sessionBackupDir = path.join(SESSION_BACKUP_DIR, sessionId);
    const backupFile = path.join(sessionBackupDir, `${Date.now()}-drill.db`);
    await createVerifiedBackup(session.stage, backupFile);
    assert.ok(fs.existsSync(backupFile), 'the reset backup must exist before the delete');
    assert.ok(
      fs.readFileSync(backupFile).includes(MARKER),
      'precondition: the backup really does contain the writer\'s script text',
    );

    destroySession(sessionId);

    assert.ok(!fs.existsSync(dbPathFor(sessionId)), 'the live database must be gone');
    assert.ok(!fs.existsSync(backupFile), 'the reset backup file must be gone');
    assert.ok(!fs.existsSync(sessionBackupDir), 'the session\'s whole backup directory must be gone');

    // Belt and braces: nothing anywhere under the backup root still holds it.
    const survivors: string[] = [];
    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (fs.readFileSync(p).includes(MARKER)) survivors.push(p);
      }
    };
    walk(SESSION_BACKUP_DIR);
    assert.deepEqual(survivors, [], 'no file under the backup root may still contain the deleted script');
  });

  it('never touches another session\'s backups', async () => {
    const mine = 'purge-mine';
    const theirs = 'purge-theirs';
    const mineSession = getOrCreateSession(mine);
    const theirsSession = getOrCreateSession(theirs);
    const mineFile = path.join(SESSION_BACKUP_DIR, mine, 'a.db');
    const theirsFile = path.join(SESSION_BACKUP_DIR, theirs, 'a.db');
    await createVerifiedBackup(mineSession.stage, mineFile);
    await createVerifiedBackup(theirsSession.stage, theirsFile);

    destroySession(mine);

    assert.ok(!fs.existsSync(mineFile), 'the deleted session\'s backup is gone');
    assert.ok(fs.existsSync(theirsFile), 'an unrelated session\'s backup is untouched');
  });

  it('is idempotent and never throws for a session that has no backups at all', () => {
    assert.doesNotThrow(() => destroySession('never-existed-anywhere'));
    assert.doesNotThrow(() => destroySession('never-existed-anywhere'));
  });

  it('refuses to escape the backup root even if handed a traversing id', () => {
    // sessionId(req) validates the id's shape long before this point, so this
    // is defence in depth on the one operation in session-store.ts where a
    // traversal would be catastrophic rather than merely wrong.
    const outsider = path.join(tmpRoot, 'outside-the-backup-root.db');
    fs.writeFileSync(outsider, MARKER);
    assert.doesNotThrow(() => destroySession('..'));
    assert.doesNotThrow(() => destroySession(path.join('..', '..')));
    assert.ok(fs.existsSync(outsider), 'a traversing id must not delete anything outside the backup root');
    assert.ok(fs.existsSync(backupDir), 'the backup root itself must survive');
  });
});
