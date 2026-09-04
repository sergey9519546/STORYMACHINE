// Session rotation: publication and basic request-shape validation.
//
// This file is one of four siblings split out of a single file that called
// startChildServer() (a real child-process `tsx server.ts`-equivalent boot)
// 17 times serialized in one node:test file/process — node:test parallelizes
// ACROSS files, not within one, so that file was the suite's wall-clock tail.
// See tests/routes/rotation-child-server.ts for the shared harness and the
// full split rationale. Siblings:
//   - session-rotation-persistence-barriers.test.ts   (concurrency barriers)
//   - session-rotation-persistence-quarantine.test.ts (rollback quarantine / durable denial)
//   - session-rotation-persistence-retirement.test.ts (in-process quarantine retirement — the ~20.7s outlier)
// Every assertion and test name below is unchanged from the original file.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadMarker, makeSessionDir, rotate, saveMarker, startChildServer } from './rotation-child-server.ts';

describe('persistent session rotation', () => {
  it('publishes a restart-verifiable database under only the replacement id', async () => {
    const sessionDir = makeSessionDir();
    const oldId = 'old-session-id';
    const newId = 'new-session-id';
    const marker = 'ROTATION MARKER SURVIVES RESTART';
    let server = await startChildServer(sessionDir);
    try {
      await saveMarker(server.baseUrl, oldId, marker);
      const response = await rotate(server.baseUrl, oldId, newId);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        status: 'ok',
        oldSessionId: oldId,
        newSessionId: newId,
      });
    } finally {
      await server.close();
    }

    assert.equal(fs.existsSync(path.join(sessionDir, `${oldId}.db`)), false);
    assert.equal(fs.existsSync(path.join(sessionDir, `${newId}.db`)), true);

    server = await startChildServer(sessionDir);
    try {
      const restored = await loadMarker(server.baseUrl, newId);
      assert.equal(restored.status, 'ok');
      assert.equal(restored.scriptText, marker);
      assert.equal((await loadMarker(server.baseUrl, oldId)).status, 'empty');
    } finally {
      await server.close();
    }
  });

  it('fails closed when database publication fails and preserves the old authority across restart', async () => {
    const sessionDir = makeSessionDir();
    const oldId = 'publish-failure-old';
    const newId = 'publish-failure-new';
    const marker = 'OLD AUTHORITY MUST SURVIVE';
    let server = await startChildServer(sessionDir, { failPublishTarget: newId });
    try {
      await saveMarker(server.baseUrl, oldId, marker);
      const response = await rotate(server.baseUrl, oldId, newId);
      assert.equal(response.status, 503);
      assert.match((await response.json() as { error: string }).error, /retry/i);
      const intact = await loadMarker(server.baseUrl, oldId);
      assert.equal(intact.status, 'ok');
      assert.equal(intact.scriptText, marker);
      assert.equal(fs.existsSync(path.join(sessionDir, `${newId}.db`)), false);
    } finally {
      await server.close();
    }

    server = await startChildServer(sessionDir);
    try {
      const restored = await loadMarker(server.baseUrl, oldId);
      assert.equal(restored.status, 'ok');
      assert.equal(restored.scriptText, marker);
    } finally {
      await server.close();
    }
  });

  it('rejects an unloaded target with any existing SQLite artifact', async () => {
    const sessionDir = makeSessionDir();
    const oldId = 'collision-source';
    const targetId = 'collision-target';
    const sourceMarker = 'SOURCE REMAINS AUTHORITATIVE';
    const targetMarker = 'EXISTING TARGET MUST NOT BE OVERWRITTEN';
    let server = await startChildServer(sessionDir);
    try {
      await saveMarker(server.baseUrl, targetId, targetMarker);
    } finally {
      await server.close();
    }

    server = await startChildServer(sessionDir);
    try {
      await saveMarker(server.baseUrl, oldId, sourceMarker);
      const response = await rotate(server.baseUrl, oldId, targetId);
      assert.equal(response.status, 400);
      assert.match((await response.json() as { error: string }).error, /already.*use/i);
      const source = await loadMarker(server.baseUrl, oldId);
      const target = await loadMarker(server.baseUrl, targetId);
      assert.equal(source.status, 'ok');
      assert.equal(source.scriptText, sourceMarker);
      assert.equal(target.status, 'ok');
      assert.equal(target.scriptText, targetMarker);
    } finally {
      await server.close();
    }
  });

  it('rejects a requested replacement id that is not already in canonical form', async () => {
    const sessionDir = makeSessionDir();
    const server = await startChildServer(sessionDir);
    try {
      await saveMarker(server.baseUrl, 'invalid-target-old', 'INTACT');
      const response = await rotate(server.baseUrl, 'invalid-target-old', ' padded-target-id ');
      assert.equal(response.status, 400);
      assert.match((await response.json() as { error: string }).error, /newSessionId/);
      const intact = await loadMarker(server.baseUrl, 'invalid-target-old');
      assert.equal(intact.scriptText, 'INTACT');
    } finally {
      await server.close();
    }
  });
});
