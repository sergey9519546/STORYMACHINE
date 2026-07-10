// R2 — session backup mechanism. Exercises server/lib/backup.ts's
// backupSessions() against real temp SQLite files (via better-sqlite3, the
// same driver session-store.ts uses), asserting the online-backup snapshots
// are valid, openable dbs with matching content, and that the documented
// no-op / skip-and-continue edge cases behave per spec. Timestamp is always
// injected (`now`) — no Date.now() inside assertions, per the guarantee's
// determinism requirement.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';

import { backupSessions } from '../../server/lib/backup.ts';

const FIXED_NOW = Date.parse('2026-07-10T12:00:00.000Z');

let tmpRoot: string;

function mkTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(tmpRoot, prefix));
}

function createSessionDb(dir: string, name: string, rows: string[]): void {
  const db = new Database(path.join(dir, name));
  db.exec('CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT)');
  const insert = db.prepare('INSERT INTO kv (k, v) VALUES (?, ?)');
  rows.forEach((v, i) => insert.run(`key${i}`, v));
  db.close();
}

function readAllValues(dbPath: string): string[] {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  const rows = db.prepare('SELECT v FROM kv ORDER BY k').all() as { v: string }[];
  db.close();
  return rows.map((r) => r.v);
}

before(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-backup-test-'));
});

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('backupSessions', () => {
  it('backs up real session dbs via the online backup API with matching content (fire)', async () => {
    const sessionDbDir = mkTempDir('sessions-');
    const backupRootDir = mkTempDir('backups-');

    createSessionDb(sessionDbDir, 'alice.db', ['hello', 'world']);
    createSessionDb(sessionDbDir, 'bob.db', ['scene-1', 'scene-2', 'scene-3']);

    const summary = await backupSessions({ sessionDbDir, backupRootDir, now: FIXED_NOW });

    assert.equal(summary.noop, false);
    assert.equal(summary.backedUp, 2);
    assert.equal(summary.skipped, 0);
    assert.ok(summary.destDir);
    assert.ok(fs.existsSync(summary.destDir!));

    const aliceBackup = path.join(summary.destDir!, 'alice.db');
    const bobBackup = path.join(summary.destDir!, 'bob.db');
    assert.ok(fs.existsSync(aliceBackup));
    assert.ok(fs.existsSync(bobBackup));

    assert.deepEqual(readAllValues(aliceBackup), ['hello', 'world']);
    assert.deepEqual(readAllValues(bobBackup), ['scene-1', 'scene-2', 'scene-3']);
  });

  it('produces a deterministic timestamped dir name from the injected `now` (fire)', async () => {
    const sessionDbDir = mkTempDir('sessions-');
    const backupRootDir = mkTempDir('backups-');
    createSessionDb(sessionDbDir, 'one.db', ['x']);

    const summary = await backupSessions({ sessionDbDir, backupRootDir, now: FIXED_NOW });

    const expectedLabel = new Date(FIXED_NOW).toISOString().replace(/[:.]/g, '-');
    assert.equal(path.basename(summary.destDir!), expectedLabel);
  });

  it('is a clean no-op when SESSION_DB_DIR is :memory: (no-fire)', async () => {
    const backupRootDir = mkTempDir('backups-');
    const summary = await backupSessions({ sessionDbDir: ':memory:', backupRootDir, now: FIXED_NOW });

    assert.equal(summary.noop, true);
    assert.equal(summary.backedUp, 0);
    assert.equal(summary.skipped, 0);
    assert.equal(summary.destDir, null);
    // Nothing should have been created under backupRootDir.
    assert.deepEqual(fs.readdirSync(backupRootDir), []);
  });

  it('is a clean no-op when the session dir is missing (no-fire)', async () => {
    const backupRootDir = mkTempDir('backups-');
    const missingDir = path.join(tmpRoot, 'does-not-exist-' + Math.random().toString(36).slice(2));

    const summary = await backupSessions({ sessionDbDir: missingDir, backupRootDir, now: FIXED_NOW });

    assert.equal(summary.noop, true);
    assert.equal(summary.backedUp, 0);
    assert.equal(summary.destDir, null);
  });

  it('is a clean no-op when the session dir is empty (no-fire)', async () => {
    const sessionDbDir = mkTempDir('sessions-');
    const backupRootDir = mkTempDir('backups-');

    const summary = await backupSessions({ sessionDbDir, backupRootDir, now: FIXED_NOW });

    assert.equal(summary.noop, true);
    assert.equal(summary.backedUp, 0);
    assert.equal(summary.destDir, null);
  });

  it('skips a corrupt db and continues backing up the rest (fire — skip path)', async () => {
    const sessionDbDir = mkTempDir('sessions-');
    const backupRootDir = mkTempDir('backups-');

    createSessionDb(sessionDbDir, 'good.db', ['fine']);
    // A file that ends in .db but is not a valid SQLite database.
    fs.writeFileSync(path.join(sessionDbDir, 'corrupt.db'), 'not a real sqlite file at all');

    const summary = await backupSessions({ sessionDbDir, backupRootDir, now: FIXED_NOW });

    assert.equal(summary.noop, false);
    assert.equal(summary.backedUp, 1);
    assert.equal(summary.skipped, 1);
    assert.deepEqual(summary.skippedFiles, ['corrupt.db']);
    assert.ok(fs.existsSync(path.join(summary.destDir!, 'good.db')));
    assert.ok(!fs.existsSync(path.join(summary.destDir!, 'corrupt.db')));
  });

  it('ignores non-.db files in the session dir (no-fire for those files)', async () => {
    const sessionDbDir = mkTempDir('sessions-');
    const backupRootDir = mkTempDir('backups-');

    createSessionDb(sessionDbDir, 'real.db', ['v']);
    fs.writeFileSync(path.join(sessionDbDir, 'real.db-wal'), 'wal-ish bytes');
    fs.writeFileSync(path.join(sessionDbDir, 'notes.txt'), 'irrelevant');

    const summary = await backupSessions({ sessionDbDir, backupRootDir, now: FIXED_NOW });

    assert.equal(summary.backedUp, 1);
    assert.equal(summary.skipped, 0);
    const destFiles = fs.readdirSync(summary.destDir!);
    assert.deepEqual(destFiles, ['real.db']);
  });
});
