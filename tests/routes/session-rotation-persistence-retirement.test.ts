// Session rotation: in-process quarantine retirement (no restart).
//
// Isolated into its own file on purpose: this single test was measured at
// ~20.7s — the slowest subtest in the original, unsplit
// session-rotation-persistence.test.ts and the biggest single contributor to
// that file being the suite's wall-clock tail. Giving it a file of its own
// lets node:test schedule it in parallel with every other split sibling
// (and with the rest of the suite) instead of serially behind them. See
// tests/routes/rotation-child-server.ts for the shared harness and the full
// split rationale, and session-rotation-persistence.test.ts for the
// sibling-file list. The assertion and test name below are unchanged from
// the original file.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadMarker, makeSessionDir, rotate, saveMarker, startChildServer } from './rotation-child-server.ts';

describe('persistent session rotation', () => {
  it('retires the in-memory quarantine after candidate cleanup without a restart', async () => {
    const sessionDir = makeSessionDir();
    const oldId = 'same-process-cleanup-old';
    const newId = 'same-process-cleanup-new';
    const markerPath = path.join(sessionDir, `.${newId}.rotation-deny`);
    const server = await startChildServer(sessionDir, {
      cleanupFailure: { oldId, newId },
      quarantineRenameFailure: newId,
    });
    try {
      await saveMarker(server.baseUrl, oldId, 'SAME PROCESS OLD AUTHORITY');
      assert.equal((await rotate(server.baseUrl, oldId, newId)).status, 503);

      const denied = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${newId}`);
      assert.equal(denied.status, 409, 'candidate presence must keep the quarantine active');

      const candidateBase = path.join(sessionDir, `${newId}.db`);
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        try { fs.unlinkSync(candidateBase + suffix); } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }

      const released = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${newId}`);
      assert.equal(released.status, 200);
      assert.equal((await released.json() as { status: string }).status, 'empty');
      assert.equal(fs.existsSync(markerPath), false);
      const old = await loadMarker(server.baseUrl, oldId);
      assert.equal(old.scriptText, 'SAME PROCESS OLD AUTHORITY');
    } finally {
      await server.close();
    }
  });
});
