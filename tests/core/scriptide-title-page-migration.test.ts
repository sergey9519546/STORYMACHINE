// Retrospective finding #12 — ScriptIDE_State had no column for the writer's
// Title Page (title/author/contact), so a save->restore round trip could not
// carry it no matter how the client behaved. The fix is one new rung on the
// existing sequential user_version ladder (server/engine/Stage.ts's
// runMigrations): v13 -> v14 adds a nullable `title_page_json` column.
//
// This file exercises the MIGRATION MECHANISM itself — a database frozen at
// the previous user_version upgrades cleanly and gains the column, and a
// brand-new database gets it immediately — using the real production
// constructor throughout, never a hand-rolled schema copy that could drift
// from the actual ladder. The full save/backup/restore/load round trip
// through the public Stage API (including a real online backup and destroy)
// is covered separately by tests/core/backup-restore-drill.test.ts, which
// this change also extended to include a title page. The route-layer round
// trip (POST /api/scriptide/save -> GET /api/scriptide/load) and the zod
// rejection of an oversized/invalid title page are covered in
// tests/routes/scriptide.test.ts.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { Stage } from '../../server/engine/Stage.ts';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-titlepage-migration-'));

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Raw, Stage-independent read of ScriptIDE_State's live column set — proves
 *  the column really exists on disk, not merely that Stage's TypeScript
 *  types say it should. */
function scriptIDEStateColumns(dbPath: string): string[] {
  const raw = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    return (raw.prepare('PRAGMA table_info(ScriptIDE_State)').all() as Array<{ name: string }>)
      .map((row) => row.name);
  } finally {
    raw.close();
  }
}

describe('ScriptIDE_State migration — title_page_json column (retrospective #12)', () => {
  it('a fresh database gets the title_page_json column immediately, at the latest schema version', () => {
    const freshPath = path.join(tmpDir, 'fresh.db');
    const stage = new Stage(freshPath);
    let version: number;
    try {
      version = stage.getSchemaVersion();
    } finally {
      stage.close();
    }
    assert.ok(version >= 14, `expected the migration ladder to reach at least v14, got v${version}`);
    assert.ok(
      scriptIDEStateColumns(freshPath).includes('title_page_json'),
      'a freshly created ScriptIDE_State table must already include title_page_json',
    );
  });

  it('a database frozen at the previous user_version upgrades cleanly and gains the column', () => {
    const upgradePath = path.join(tmpDir, 'upgrade.db');

    // Build a REAL, fully-migrated database through the actual production
    // constructor, and save one real pre-migration row through the actual
    // production save path — proves data survives the downgrade/re-upgrade
    // round trip below, not just that the column appears.
    const seedStage = new Stage(upgradePath);
    let latestVersion: number;
    try {
      latestVersion = seedStage.getSchemaVersion();
      seedStage.saveScriptIDEState('pre-migration-session', {
        scriptText: 'INT. LEGACY DRAFT - DAY\n\nSaved before title_page_json existed.',
        snapshots: [{ id: 'snap-1', name: 'v1' }],
        characters: [{ id: 'char-1', name: 'ADA' }],
        researchNotes: [],
        isDarkMode: true,
        titlePage: null,
      });
    } finally {
      seedStage.close();
    }

    // Roll back EXACTLY the one migration under test — drop the column and
    // step user_version back one — to simulate "a database frozen at the
    // previous user_version", the real thing every existing session's .db
    // file on disk looks like before it is next opened by upgraded code.
    const raw = new Database(upgradePath);
    try {
      raw.exec('ALTER TABLE ScriptIDE_State DROP COLUMN title_page_json');
      raw.pragma(`user_version = ${latestVersion - 1}`);
    } finally {
      raw.close();
    }
    assert.ok(
      !scriptIDEStateColumns(upgradePath).includes('title_page_json'),
      'test setup sanity check: the column must actually be gone before the upgrade under test runs',
    );

    const upgraded = new Stage(upgradePath);
    try {
      assert.equal(
        upgraded.getSchemaVersion(),
        latestVersion,
        'reopening a v(latest-1) database must run the ladder back up to the latest version',
      );
      const preExisting = upgraded.loadScriptIDEState('pre-migration-session');
      assert.equal(
        preExisting?.scriptText,
        'INT. LEGACY DRAFT - DAY\n\nSaved before title_page_json existed.',
        'pre-migration data must survive the upgrade untouched',
      );
      assert.deepEqual(preExisting?.snapshots, [{ id: 'snap-1', name: 'v1' }]);
      assert.deepEqual(preExisting?.characters, [{ id: 'char-1', name: 'ADA' }]);
      assert.equal(preExisting?.isDarkMode, true);
      assert.equal(
        preExisting?.titlePage,
        null,
        'a row that predates this column has no title page — NULL, not a backfilled empty object',
      );
    } finally {
      upgraded.close();
    }
    assert.ok(
      scriptIDEStateColumns(upgradePath).includes('title_page_json'),
      'title_page_json must exist on disk after the upgrade runs',
    );
  });

  it('re-running the migration ladder against an already-current database is a no-op (idempotent reopen)', () => {
    const idempotentPath = path.join(tmpDir, 'idempotent.db');
    const first = new Stage(idempotentPath);
    const firstVersion = first.getSchemaVersion();
    first.close();

    // A second, independent open of the same already-migrated file must not
    // error (e.g. on a duplicate ADD COLUMN) and must leave the version and
    // column exactly as they were.
    const second = new Stage(idempotentPath);
    let secondVersion: number;
    try {
      secondVersion = second.getSchemaVersion();
    } finally {
      second.close();
    }
    assert.equal(secondVersion, firstVersion);
    assert.ok(scriptIDEStateColumns(idempotentPath).includes('title_page_json'));
  });

  it('a title page saved after the upgrade round-trips through the new column via the public Stage API', () => {
    const roundtripPath = path.join(tmpDir, 'post-upgrade-roundtrip.db');
    const stage = new Stage(roundtripPath);
    try {
      const titlePage = { title: 'AFTER THE UPGRADE', author: 'Migrator', contact: 'm@example.com' };
      stage.saveScriptIDEState('s', {
        scriptText: 'x', snapshots: [], characters: [], researchNotes: [], isDarkMode: false, titlePage,
      });
      assert.deepEqual(stage.loadScriptIDEState('s')?.titlePage, titlePage);
    } finally {
      stage.close();
    }
  });
});
