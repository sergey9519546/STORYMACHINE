import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import Database from 'better-sqlite3';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storymachine-reset-route-'));
const sessionDir = path.join(root, 'sessions');
const backupDir = path.join(root, 'recovery');
fs.mkdirSync(sessionDir, { recursive: true });
process.env.SESSION_DB_DIR = sessionDir;
process.env.SESSION_BACKUP_DIR = backupDir;

function deferred<T>(): { promise: Promise<T>; resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void } {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('routes/game — persistent simulation reset', () => {
  let baseUrl: string;
  let server: import('node:http').Server;

  before(async () => {
    const { createApp } = await import('../../server/app.ts');
    const app = await createApp({ serveStatic: false });
    server = await new Promise(resolve => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    const { sessions } = await import('../../server/lib/session-store.ts');
    for (const session of sessions.values()) session.stage.close();
    sessions.clear();
    fs.rmSync(root, { recursive: true, force: true });
  });

  async function initialize(sid: string): Promise<void> {
    const res = await fetch(`${baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        nodes: [{ location_id: 'room', name: 'Room', description: 'A persistent room', adjacent_locations: [] }],
        agents: [{ char_id: 'hero', name: 'Hero', public_mask: 'calm', hidden_motive: 'escape', knowledge_vector: [], current_location_id: 'room' }],
      }),
    });
    assert.equal(res.status, 200);
  }

  it('backs up active-WAL project state before resetting only the simulation', async () => {
    const sid = 'persistent-wal-session';
    await initialize(sid);
    const save = await fetch(`${baseUrl}/api/scriptide/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, scriptText: 'LATEST WAL DRAFT', snapshots: [], characters: [], researchNotes: [], isDarkMode: false }),
    });
    assert.equal(save.status, 200);

    const { sessions } = await import('../../server/lib/session-store.ts');
    const session = sessions.get(sid);
    assert.ok(session);
    const stageBeforeReset = session.stage;
    const orchestratorBeforeReset = session.orchestrator;
    session.stage.recordAction('hero', { action_type: 'WAIT', content: 'LATEST WAL EVENT', target: null }, 'room');
    const dbPath = path.join(sessionDir, `${sid}.db`);
    assert.ok(fs.existsSync(`${dbPath}-wal`) && fs.statSync(`${dbPath}-wal`).size > 0,
      'route fixture must retain an active WAL');

    const reset = await fetch(`${baseUrl}/api/reset`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }),
    });
    assert.equal(reset.status, 200);
    assert.equal((await reset.json()).backupCreated, true);

    const artifacts = fs.readdirSync(path.join(backupDir, sid));
    assert.equal(artifacts.length, 1);
    assert.match(artifacts[0], /^\d+-[0-9a-f-]{36}\.db$/);
    const backup = new Database(path.join(backupDir, sid, artifacts[0]), { readonly: true, fileMustExist: true });
    try {
      assert.equal(backup.pragma('quick_check', { simple: true }), 'ok');
      assert.equal((backup.prepare('SELECT content FROM Action_Log').get() as { content: string }).content, 'LATEST WAL EVENT');
      assert.equal((backup.prepare('SELECT script_text FROM ScriptIDE_State').get() as { script_text: string }).script_text, 'LATEST WAL DRAFT');
    } finally {
      backup.close();
    }
    assert.equal(session.stage.getFullLedger().length, 0);
    assert.equal(session.stage.loadScriptIDEState(sid)?.scriptText, 'LATEST WAL DRAFT');
    assert.equal(session.stage, stageBeforeReset, 'reset must retain the live Stage handle');
    assert.notEqual(session.orchestrator, orchestratorBeforeReset, 'reset must replace the in-memory Orchestrator');
  });

  it('serializes later initialization and editor saves behind a reset backup', async () => {
    const sid = 'serialized-reset-session';
    await initialize(sid);
    const { sessions } = await import('../../server/lib/session-store.ts');
    const session = sessions.get(sid);
    assert.ok(session);

    const originalBackupTo = session.stage.backupTo.bind(session.stage);
    const originalAddLocation = session.stage.addLocation.bind(session.stage);
    const backupEntered = deferred<void>();
    const releaseBackup = deferred<void>();
    let addLocationStarted = false;
    session.stage.backupTo = async (destination: string) => {
      backupEntered.resolve();
      await releaseBackup.promise;
      await originalBackupTo(destination);
    };
    session.stage.addLocation = (location) => {
      addLocationStarted = true;
      return originalAddLocation(location);
    };

    const reset = fetch(`${baseUrl}/api/reset`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }),
    });
    let init: Promise<Response> | undefined;
    const originalRun = session.commands.run.bind(session.commands);
    try {
      await backupEntered.promise;

      const initAdmitted = deferred<void>();
      session.commands.run = ((operation: () => unknown) => {
        initAdmitted.resolve();
        return originalRun(operation);
      }) as typeof session.commands.run;
      init = fetch(`${baseUrl}/api/init`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          nodes: [{ location_id: 'after-reset', name: 'After reset', description: 'Queued setup', adjacent_locations: [] }],
          agents: [{ char_id: 'after-reset-hero', name: 'Hero', public_mask: 'calm', hidden_motive: 'escape', knowledge_vector: [], current_location_id: 'after-reset' }],
        }),
      });
      await initAdmitted.promise;
      assert.equal(addLocationStarted, false, 'later init must not begin while reset is awaiting its backup');

      releaseBackup.resolve();
      assert.equal((await reset).status, 200);
      assert.equal((await init).status, 200);
      assert.equal(session.stage.getAllLocations()[0]?.location_id, 'after-reset');
      assert.equal(session.stage.getAllAgents()[0]?.char_id, 'after-reset-hero');
    } finally {
      releaseBackup.resolve();
      await Promise.allSettled([reset, ...(init ? [init] : [])]);
      session.commands.run = originalRun as typeof session.commands.run;
      session.stage.backupTo = originalBackupTo;
      session.stage.addLocation = originalAddLocation;
    }

    const originalSecondBackup = session.stage.backupTo.bind(session.stage);
    const secondBackupEntered = deferred<void>();
    const releaseSecondBackup = deferred<void>();
    let saveStarted = false;
    const originalSave = session.stage.saveScriptIDEState.bind(session.stage);
    session.stage.backupTo = async (destination: string) => {
      secondBackupEntered.resolve();
      await releaseSecondBackup.promise;
      await originalSecondBackup(destination);
    };
    session.stage.saveScriptIDEState = (...args) => {
      saveStarted = true;
      return originalSave(...args);
    };

    const secondReset = fetch(`${baseUrl}/api/reset`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }),
    });
    const originalSecondRun = session.commands.run.bind(session.commands);
    let save: Promise<Response> | undefined;
    try {
      await secondBackupEntered.promise;

      const saveAdmitted = deferred<void>();
      session.commands.run = ((operation: () => unknown) => {
        saveAdmitted.resolve();
        return originalSecondRun(operation);
      }) as typeof session.commands.run;
      save = fetch(`${baseUrl}/api/scriptide/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          scriptText: 'POST-RESET DRAFT',
          snapshots: [{ id: 'snapshot', text: 'POST-RESET SNAPSHOT' }],
          characters: [{ name: 'Writer character' }],
          researchNotes: [{ id: 'note', content: 'POST-RESET NOTE' }],
          isDarkMode: true,
        }),
      });
      await saveAdmitted.promise;
      assert.equal(saveStarted, false, 'later editor save must not begin while reset is awaiting its backup');

      releaseSecondBackup.resolve();
      assert.equal((await secondReset).status, 200);
      assert.equal((await save).status, 200);
      assert.deepEqual(session.stage.loadScriptIDEState(sid), {
        scriptText: 'POST-RESET DRAFT',
        snapshots: [{ id: 'snapshot', text: 'POST-RESET SNAPSHOT' }],
        characters: [{ name: 'Writer character' }],
        researchNotes: [{ id: 'note', content: 'POST-RESET NOTE' }],
        isDarkMode: true,
        updatedAt: session.stage.loadScriptIDEState(sid)?.updatedAt,
      });
    } finally {
      releaseSecondBackup.resolve();
      await Promise.allSettled([secondReset, ...(save ? [save] : [])]);
      session.commands.run = originalSecondRun as typeof session.commands.run;
      session.stage.backupTo = originalSecondBackup;
      session.stage.saveScriptIDEState = originalSave;
    }
  });

  it('returns 503 without mutation when the recovery root cannot be created', async () => {
    fs.rmSync(backupDir, { recursive: true, force: true });
    fs.writeFileSync(backupDir, 'blocks recovery directory creation');
    const sid = 'persistent-backup-failure';
    await initialize(sid);
    const { sessions } = await import('../../server/lib/session-store.ts');
    const session = sessions.get(sid);
    assert.ok(session);
    await fetch(`${baseUrl}/api/scriptide/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, scriptText: 'DRAFT MUST SURVIVE', snapshots: [], characters: [], researchNotes: [], isDarkMode: false }),
    });
    session.stage.recordAction('hero', { action_type: 'WAIT', content: 'MUST SURVIVE', target: null }, 'room');
    const stageBeforeReset = session.stage;
    const orchestratorBeforeReset = session.orchestrator;

    const reset = await fetch(`${baseUrl}/api/reset`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }),
    });
    assert.equal(reset.status, 503);
    assert.equal(session.stage, stageBeforeReset);
    assert.equal(session.orchestrator, orchestratorBeforeReset);
    assert.equal(session.stage.getFullLedger()[0]?.content, 'MUST SURVIVE');
    assert.equal(session.stage.getAllAgents()[0]?.char_id, 'hero');
    assert.equal(session.stage.getAllLocations()[0]?.location_id, 'room');
    assert.equal(session.stage.loadScriptIDEState(sid)?.scriptText, 'DRAFT MUST SURVIVE');
  });

  it('rejects an unknown reset-body field before creating a recovery artifact', async () => {
    const sid = 'strict-reset-body';
    await initialize(sid);
    const res = await fetch(`${baseUrl}/api/reset`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, typo: true }),
    });
    assert.equal(res.status, 400);
    const { sessions } = await import('../../server/lib/session-store.ts');
    assert.equal(sessions.get(sid)?.stage.getAllAgents()[0]?.char_id, 'hero');
  });
});
