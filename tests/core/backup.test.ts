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

import {
  backupSessions, createVerifiedBackup, pruneAllSessionResetBackups, pruneSessionResetBackups,
} from '../../server/lib/backup.ts';
import { SIMULATION_RESET_TABLES, Stage } from '../../server/engine/Stage.ts';

const FIXED_NOW = Date.parse('2026-07-10T12:00:00.000Z');
const EXPECTED_STAGE_TABLES = [
  'Action_Log', 'Beat_Traces', 'Belief_Edges', 'Character_State', 'Characters',
  'Drama_Positions', 'Dramatic_Pressure', 'Event_Cards', 'Event_Propositions',
  'Ghost_Commits', 'Goal_Mutations', 'Illusion_State', 'Knowledge_Ledger',
  'Llm_Cache', 'Locations', 'Persuasion_Log', 'Reveal_Plans', 'ScriptIDE_State',
  'Self_Play_Corpus', 'Stakes', 'Story_Commits',
] as const;
const EXPECTED_SIMULATION_RESET_TABLES = EXPECTED_STAGE_TABLES
  .filter((table) => table !== 'Illusion_State' && table !== 'ScriptIDE_State')
  .sort();

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

describe('verified Stage backup and simulation-only reset', () => {
  it('backs up the live WAL handle and publishes only a verified recovery artifact', async () => {
    const dbPath = path.join(mkTempDir('live-wal-'), 'session.db');
    const destinationDir = mkTempDir('verified-');
    const destination = path.join(destinationDir, 'session.db');
    const stage = new Stage(dbPath);
    try {
      stage.addLocation({ location_id: 'room', name: 'Room', description: 'A room.', adjacent_locations: [] });
      stage.addAgent({
        char_id: 'hero', name: 'Hero', public_mask: 'calm', hidden_motive: 'escape',
        knowledge_vector: [], suspicion_score: 0, current_location_id: 'room', is_alive: true,
      });
      stage.recordAction('hero', { action_type: 'WAIT', content: 'Latest committed event', target: null }, 'room');
      stage.saveScriptIDEState('wal-session', {
        scriptText: 'INT. ROOM - NIGHT\n\nLatest editor draft.', snapshots: [], characters: [],
        researchNotes: [], isDarkMode: false,
      });
      assert.ok(fs.existsSync(`${dbPath}-wal`) && fs.statSync(`${dbPath}-wal`).size > 0,
        'fixture must retain an active WAL');

      await createVerifiedBackup(stage, destination);

      assert.deepEqual(fs.readdirSync(destinationDir), ['session.db'],
        'temporary and sidecar files must not remain beside the published recovery artifact');
      const backup = new Database(destination, { readonly: true, fileMustExist: true });
      try {
        assert.equal(backup.pragma('quick_check', { simple: true }), 'ok');
        assert.equal(backup.pragma('user_version', { simple: true }), stage.getSchemaVersion());
        assert.equal((backup.prepare('SELECT content FROM Action_Log').get() as { content: string }).content,
          'Latest committed event');
        assert.equal((backup.prepare('SELECT script_text FROM ScriptIDE_State').get() as { script_text: string }).script_text,
          'INT. ROOM - NIGHT\n\nLatest editor draft.');
      } finally {
        backup.close();
      }
    } finally {
      stage.close();
    }
  });

  it('never replaces a pre-existing recovery artifact or sidecar', async () => {
    const stage = new Stage(':memory:');
    const destination = path.join(mkTempDir('existing-'), 'backup.db');
    fs.writeFileSync(destination, 'irreplaceable prior backup');
    fs.writeFileSync(`${destination}-wal`, 'irreplaceable sidecar');
    try {
      await assert.rejects(createVerifiedBackup(stage, destination), /Refusing to replace/);
      assert.equal(fs.readFileSync(destination, 'utf8'), 'irreplaceable prior backup');
      assert.equal(fs.readFileSync(`${destination}-wal`, 'utf8'), 'irreplaceable sidecar');
    } finally {
      stage.close();
    }
  });

  it('clears every declared simulation authority transactionally while preserving author project/configuration', () => {
    const dbPath = path.join(mkTempDir('reset-'), 'session.db');
    new Stage(dbPath).close();

    const seed = new Database(dbPath);
    seed.pragma('foreign_keys = ON');
    seed.exec(`
      INSERT INTO Locations VALUES ('room','Room','desc','[]');
      INSERT INTO Characters VALUES ('hero','Hero','mask','motive');
      INSERT INTO Character_State (char_id,current_location_id,beliefs_json,theory_of_mind_json,defense_mechanisms_json)
        VALUES ('hero','room','[]','{}','[]');
      INSERT INTO Knowledge_Ledger VALUES ('knowledge','hero','fact',1);
      INSERT INTO Action_Log VALUES ('action',1,'hero','room','WAIT',NULL,'event',0);
      UPDATE Illusion_State
        SET phase='Climax', planted_elements_json='["seed"]', pending_recontextualization_json='["payoff"]',
            outline_json='[{"phase":"Setup","turn_start":1,"turn_end":3,"goal":"Preserve this beat","constraint":"none","avoid":"nothing"}]',
            config_json='{"story_theme":"Mercy costs","story_genre":"drama","tension_accumulator":9,"tension_history":[3,9]}';
      INSERT INTO Event_Cards VALUES ('event','hero','WAIT','event','room',1);
      INSERT INTO Event_Propositions VALUES ('prop','event','fact',0,'hero',1);
      INSERT INTO Belief_Edges VALUES ('edge','a','b','supports','hero','event',1,0.5);
      INSERT INTO Goal_Mutations (mutation_id,char_id,turn_index,trigger_event_id,mutation_type,description)
        VALUES ('mutation','hero',1,'event','replace','changed');
      INSERT INTO Dramatic_Pressure (pressure_id,target_char_id,trigger_event_id,pressure_type,intensity,bias_hint,expires_at_turn,applied)
        VALUES ('pressure','hero','event','ESCALATE',70,'bias',3,0);
      INSERT INTO Beat_Traces VALUES ('beat',1,'room','event','setup','[]','[]','summary','hint',NULL);
      INSERT INTO Persuasion_Log (id,agent_id,target_id,strategy,turn,success) VALUES ('persuasion','hero','hero','appeal',1,1);
      INSERT INTO Stakes (id,char_id,category,description,magnitude,is_active) VALUES ('stake','hero','life','survive',80,1);
      INSERT INTO Story_Commits VALUES ('commit',NULL,1,'[]','{}',0,1);
      INSERT INTO Ghost_Commits VALUES ('ghost',NULL,1,'{}','failed_proof',1);
      INSERT INTO Reveal_Plans VALUES ('reveal','setup','reveal','[]',1,1);
      INSERT INTO Drama_Positions VALUES ('position','option','hero','position',1,50,0.9,45,0,1,1);
      INSERT INTO ScriptIDE_State VALUES ('project','DRAFT','[]','[]','[]',1,123);
      INSERT INTO Llm_Cache VALUES ('cache','model','hash','response',123);
      INSERT INTO Self_Play_Corpus VALUES ('run','scenario',1,1,1,1,'{}',123);
    `);
    const preservedProjectBefore = JSON.stringify(seed.prepare('SELECT * FROM ScriptIDE_State ORDER BY rowid').all());
    seed.close();

    const stage = new Stage(dbPath);
    try {
      stage.resetSimulationState();
      const illusion = stage.getIllusionState();
      assert.equal(illusion.phase, 'Setup');
      assert.deepEqual(illusion.planted_elements, []);
      assert.deepEqual(illusion.pending_recontextualization, []);
      assert.equal(illusion.total_turns, 0);
      assert.deepEqual(illusion.outline, [{
        phase: 'Setup', turn_start: 1, turn_end: 3, goal: 'Preserve this beat', constraint: 'none', avoid: 'nothing',
      }]);
      assert.equal(illusion.story_theme, 'Mercy costs');
      assert.equal(illusion.story_genre, 'drama');
      assert.deepEqual(stage.getDirectorTensionState(), { accumulator: 50, history: [] });
    } finally {
      stage.close();
    }

    const verify = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const actualTables = (verify.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all() as Array<{ name: string }>).map(({ name }) => name);
      assert.deepEqual(actualTables, [...EXPECTED_STAGE_TABLES].sort(),
        'schema changes must explicitly classify each new authority before reset can ship');
      assert.deepEqual([...SIMULATION_RESET_TABLES].sort(), EXPECTED_SIMULATION_RESET_TABLES,
        'the reset manifest must clear every non-project Stage authority');
      for (const table of SIMULATION_RESET_TABLES) {
        assert.equal((verify.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count, 0, table);
      }
      assert.equal(JSON.stringify(verify.prepare('SELECT * FROM ScriptIDE_State ORDER BY rowid').all()), preservedProjectBefore);
    } finally {
      verify.close();
    }
  });

  it('rolls every simulation deletion back when SQLite rejects one table mutation', () => {
    const dbPath = path.join(mkTempDir('rollback-'), 'session.db');
    const stage = new Stage(dbPath);
    stage.addLocation({ location_id: 'room', name: 'Room', description: '', adjacent_locations: [] });
    stage.addAgent({
      char_id: 'hero', name: 'Hero', public_mask: 'mask', hidden_motive: 'motive', knowledge_vector: [],
      suspicion_score: 0, current_location_id: 'room', is_alive: true,
    });
    stage.recordAction('hero', { action_type: 'WAIT', content: 'must survive rollback', target: null }, 'room');

    const triggerDb = new Database(dbPath);
    triggerDb.exec(`CREATE TRIGGER abort_reset BEFORE DELETE ON Characters BEGIN SELECT RAISE(ABORT, 'forced reset failure'); END;`);
    triggerDb.close();
    try {
      assert.throws(() => stage.resetSimulationState(), /forced reset failure/);
      assert.equal(stage.getFullLedger().length, 1, 'earlier table deletions must roll back');
      assert.equal(stage.getAllAgents().length, 1);
      assert.equal(stage.getAllLocations().length, 1);
    } finally {
      stage.close();
    }
  });
});

describe('reset-backup retention', () => {
  const generatedName = (timestamp: number, suffix: string) =>
    `${timestamp}-00000000-0000-4000-8000-${suffix.padStart(12, '0')}.db`;

  it('prunes only generated artifacts by age/count and retains operator files', () => {
    const directory = mkTempDir('reset-retention-');
    const fresh = generatedName(FIXED_NOW - 10, '1');
    const secondFresh = generatedName(FIXED_NOW - 20, '2');
    const expired = generatedName(FIXED_NOW - 30, '3');
    for (const name of [fresh, secondFresh, expired]) fs.writeFileSync(path.join(directory, name), name);
    fs.writeFileSync(path.join(directory, `${expired}-wal`), 'sidecar');
    fs.writeFileSync(path.join(directory, 'operator-kept.db'), 'do not touch');
    fs.writeFileSync(path.join(directory, 'notes.txt'), 'do not touch');
    fs.utimesSync(path.join(directory, fresh), new Date(FIXED_NOW - 10), new Date(FIXED_NOW - 10));
    fs.utimesSync(path.join(directory, secondFresh), new Date(FIXED_NOW - 20), new Date(FIXED_NOW - 20));
    fs.utimesSync(path.join(directory, expired), new Date(FIXED_NOW - 10_000), new Date(FIXED_NOW - 10_000));

    const summary = pruneSessionResetBackups(directory, { keep: 2, maxAgeMs: 1_000, now: FIXED_NOW });

    assert.deepEqual(summary.removed, [expired]);
    assert.deepEqual(summary.retained, [fresh, secondFresh]);
    assert.ok(!fs.existsSync(path.join(directory, expired)) && !fs.existsSync(path.join(directory, `${expired}-wal`)));
    assert.equal(fs.readFileSync(path.join(directory, 'operator-kept.db'), 'utf8'), 'do not touch');
    assert.equal(fs.readFileSync(path.join(directory, 'notes.txt'), 'utf8'), 'do not touch');
  });

  it('keeps one existing recovery artifact during pre-publish cleanup even when it is expired', () => {
    const directory = mkTempDir('reset-prepublish-');
    const expired = generatedName(FIXED_NOW - 10_000, '4');
    fs.writeFileSync(path.join(directory, expired), expired);
    fs.utimesSync(path.join(directory, expired), new Date(FIXED_NOW - 10_000), new Date(FIXED_NOW - 10_000));

    const summary = pruneSessionResetBackups(directory, {
      keep: 1, minimumRetained: 1, maxAgeMs: 1_000, now: FIXED_NOW,
    });

    assert.deepEqual(summary.removed, []);
    assert.deepEqual(summary.retained, [expired]);
  });

  it('never prunes the recovery artifact named in a just-issued receipt when timestamps tie', () => {
    const directory = mkTempDir('reset-protected-receipt-');
    const older = generatedName(FIXED_NOW, '6');
    const receiptArtifact = generatedName(FIXED_NOW, '5');
    // Give the older file the lexically later name. Before receipt protection,
    // a coarse filesystem mtime could retain it and delete the new artifact.
    for (const name of [older, receiptArtifact]) {
      fs.writeFileSync(path.join(directory, name), name);
      fs.utimesSync(path.join(directory, name), new Date(FIXED_NOW), new Date(FIXED_NOW));
    }

    const summary = pruneSessionResetBackups(directory, {
      keep: 1, maxAgeMs: 1_000, now: FIXED_NOW, protectedNames: [receiptArtifact],
    });

    assert.deepEqual(summary.retained, [receiptArtifact]);
    assert.deepEqual(summary.removed, [older]);
    assert.ok(fs.existsSync(path.join(directory, receiptArtifact)));
    assert.ok(!fs.existsSync(path.join(directory, older)));
  });

  it('sweeps only safe session directories under the reset-backup root', () => {
    const root = mkTempDir('reset-root-');
    const safeSession = path.join(root, 'safe-session');
    const unsafeDirectory = path.join(root, 'not a session id');
    fs.mkdirSync(safeSession);
    fs.mkdirSync(unsafeDirectory);
    const expired = generatedName(FIXED_NOW - 10_000, '5');
    fs.writeFileSync(path.join(safeSession, expired), expired);
    fs.writeFileSync(path.join(unsafeDirectory, expired), 'operator-owned path');
    fs.utimesSync(path.join(safeSession, expired), new Date(FIXED_NOW - 10_000), new Date(FIXED_NOW - 10_000));
    fs.utimesSync(path.join(unsafeDirectory, expired), new Date(FIXED_NOW - 10_000), new Date(FIXED_NOW - 10_000));

    const summary = pruneAllSessionResetBackups(root, { keep: 1, maxAgeMs: 1_000, now: FIXED_NOW });

    assert.deepEqual(summary.removed, [path.join('safe-session', expired)]);
    assert.ok(!fs.existsSync(path.join(safeSession, expired)));
    assert.equal(fs.readFileSync(path.join(unsafeDirectory, expired), 'utf8'), 'operator-owned path');
  });
});
