// Session rotation: concurrency barriers while a rotation is in flight.
//
// Split out of the original single-file session-rotation-persistence suite —
// see tests/routes/rotation-child-server.ts for the shared harness and the
// full split rationale, and session-rotation-persistence.test.ts for the
// sibling-file list. Every assertion and test name below is unchanged from
// the original file.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadMarker, makeSessionDir, rotate, saveMarker, startChildServer } from './rotation-child-server.ts';

describe('persistent session rotation', () => {
  it('refuses later reads and mutations while rotation owns the old Stage lifecycle', async () => {
    const sessionDir = makeSessionDir();
    const oldId = 'lifecycle-barrier-old';
    const newId = 'lifecycle-barrier-new';
    const server = await startChildServer(sessionDir, { pauseRotation: true });
    try {
      await saveMarker(server.baseUrl, oldId, 'BEFORE ROTATION');
      const rotation = rotate(server.baseUrl, oldId, newId);
      await server.waitForRotationPause();

      const read = fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${oldId}`);
      const mutation = fetch(`${server.baseUrl}/api/scriptide/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: oldId,
          scriptText: 'MUST NOT RUN ON THE ROTATING STAGE',
          snapshots: [],
          characters: [],
          researchNotes: [],
          isDarkMode: false,
        }),
      });

      const [readResponse, mutationResponse] = await Promise.race([
        Promise.all([read, mutation]),
        new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('later requests waited instead of receiving a retryable response')), 2_000)),
      ]);
      assert.equal(readResponse.status, 409);
      assert.equal(mutationResponse.status, 409);

      server.releaseRotation();
      assert.equal((await rotation).status, 200);
    } finally {
      server.releaseRotation();
      await server.close();
    }
  });

  it('does not delete a target artifact that appears while the backup is running', async () => {
    const sessionDir = makeSessionDir();
    const oldId = 'target-race-old';
    const newId = 'target-race-new';
    const targetPath = path.join(sessionDir, `${newId}.db`);
    const server = await startChildServer(sessionDir, { pauseRotation: true });
    try {
      await saveMarker(server.baseUrl, oldId, 'OLD REMAINS');
      const rotation = rotate(server.baseUrl, oldId, newId);
      await server.waitForRotationPause();
      fs.writeFileSync(targetPath, 'EXTERNAL TARGET ARTIFACT');
      server.releaseRotation();

      assert.equal((await rotation).status, 503);
      assert.equal(fs.readFileSync(targetPath, 'utf8'), 'EXTERNAL TARGET ARTIFACT');
      const old = await loadMarker(server.baseUrl, oldId);
      assert.equal(old.scriptText, 'OLD REMAINS');
    } finally {
      server.releaseRotation();
      await server.close();
    }
  });

  it('cannot clobber a target created at the final publication boundary', async () => {
    const sessionDir = makeSessionDir();
    const oldId = 'publish-toctou-old';
    const newId = 'publish-toctou-new';
    const targetPath = path.join(sessionDir, `${newId}.db`);
    const server = await startChildServer(sessionDir, { publishRaceTarget: newId });
    try {
      await saveMarker(server.baseUrl, oldId, 'OLD AUTHORITY');
      const response = await rotate(server.baseUrl, oldId, newId);
      assert.equal(response.status, 503);
      assert.equal(fs.readFileSync(targetPath, 'utf8'), 'EXTERNAL TARGET CREATED AT PUBLISH');
      const old = await loadMarker(server.baseUrl, oldId);
      assert.equal(old.scriptText, 'OLD AUTHORITY');
    } finally {
      await server.close();
    }
  });
});
