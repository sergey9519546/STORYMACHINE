// Session rotation: rollback quarantine and durable denial when cleanup
// itself fails.
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
  it('quarantines a published candidate when rollback cannot unlink it', async () => {
    const sessionDir = makeSessionDir();
    const oldId = 'cleanup-failure-old';
    const newId = 'cleanup-failure-new';
    const server = await startChildServer(sessionDir, {
      cleanupFailure: { oldId, newId },
    });
    try {
      await saveMarker(server.baseUrl, oldId, 'ROLLBACK AUTHORITY');
      const response = await rotate(server.baseUrl, oldId, newId);
      assert.equal(response.status, 503);
      assert.equal(fs.existsSync(path.join(sessionDir, `${newId}.db`)), false);
      assert.ok(
        fs.readdirSync(sessionDir).some(file => file.startsWith(`.${newId}.failed-rotation-`)),
        'the valid but unremovable candidate must be moved outside the session-id namespace',
      );
      const old = await loadMarker(server.baseUrl, oldId);
      assert.equal(old.scriptText, 'ROLLBACK AUTHORITY');
      const replacement = await loadMarker(server.baseUrl, newId);
      assert.notEqual(replacement.scriptText, 'ROLLBACK AUTHORITY');
    } finally {
      await server.close();
    }
  });

  it('durably denies the replacement after cleanup and quarantine both fail', async () => {
    const sessionDir = makeSessionDir();
    const oldId = 'durable-deny-old';
    const newId = 'durable-deny-new';
    const unrelatedPath = path.join(sessionDir, 'unrelated-operator-file.txt');
    fs.writeFileSync(unrelatedPath, 'DO NOT DELETE');
    let server = await startChildServer(sessionDir, {
      cleanupFailure: { oldId, newId },
      quarantineRenameFailure: newId,
    });
    try {
      await saveMarker(server.baseUrl, oldId, 'DURABLE OLD AUTHORITY');
      assert.equal((await rotate(server.baseUrl, oldId, newId)).status, 503);
      assert.equal(fs.existsSync(path.join(sessionDir, `${newId}.db`)), true);
      assert.equal(fs.existsSync(path.join(sessionDir, `.${newId}.rotation-deny`)), true);
    } finally {
      await server.close();
    }

    server = await startChildServer(sessionDir);
    try {
      const old = await loadMarker(server.baseUrl, oldId);
      assert.equal(old.scriptText, 'DURABLE OLD AUTHORITY');
      const replacement = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${newId}`);
      assert.equal(replacement.status, 409);
      assert.match((await replacement.json() as { error: string }).error, /authoritative session ID/i);
      assert.equal(fs.readFileSync(unrelatedPath, 'utf8'), 'DO NOT DELETE');
    } finally {
      await server.close();
    }
  });

  it('detects a dangling durable marker without following its target after restart', async () => {
    const sessionDir = makeSessionDir();
    const oldId = 'dangling-marker-old';
    const newId = 'dangling-marker-new';
    const markerPath = path.join(sessionDir, `.${newId}.rotation-deny`);
    let server = await startChildServer(sessionDir, {
      cleanupFailure: { oldId, newId },
      quarantineRenameFailure: newId,
    });
    try {
      await saveMarker(server.baseUrl, oldId, 'DANGLING MARKER OLD AUTHORITY');
      assert.equal((await rotate(server.baseUrl, oldId, newId)).status, 503);
    } finally {
      await server.close();
    }

    fs.unlinkSync(markerPath);
    let hideMarkerFromExists: string | undefined;
    try {
      fs.symlinkSync(path.join(sessionDir, 'missing-marker-target'), markerPath, 'file');
      assert.equal(fs.lstatSync(markerPath).isSymbolicLink(), true);
      assert.equal(fs.existsSync(markerPath), false, 'fixture must be a dangling symlink');
    } catch {
      // Windows without Developer Mode/admin rights cannot create symlinks.
      // Keep a real directory entry and inject only existsSync's incorrect
      // follow behavior; lstatSync remains the real no-follow observation.
      try { fs.unlinkSync(markerPath); } catch { /* absent */ }
      fs.writeFileSync(markerPath, 'marker hidden from existsSync');
      hideMarkerFromExists = newId;
    }

    server = await startChildServer(sessionDir, { hideMarkerFromExists });
    try {
      const replacement = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${newId}`);
      assert.equal(replacement.status, 409);
      const old = await loadMarker(server.baseUrl, oldId);
      assert.equal(old.scriptText, 'DANGLING MARKER OLD AUTHORITY');
    } finally {
      await server.close();
    }
  });

  it('retires a stale marker only after candidate artifacts are absent', async () => {
    const sessionDir = makeSessionDir();
    const sessionId = 'stale-marker-session';
    const markerPath = path.join(sessionDir, `.${sessionId}.rotation-deny`);
    const externalTarget = path.join(path.dirname(sessionDir), 'external-marker-target.txt');
    fs.writeFileSync(externalTarget, 'EXTERNAL FILE MUST SURVIVE');
    try {
      fs.symlinkSync(externalTarget, markerPath, 'file');
    } catch {
      fs.writeFileSync(markerPath, 'stale marker');
    }
    assert.equal(fs.existsSync(path.join(sessionDir, `${sessionId}.db`)), false);

    const server = await startChildServer(sessionDir);
    try {
      const response = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sessionId}`);
      assert.equal(response.status, 200);
      assert.equal((await response.json() as { status: string }).status, 'empty');
      assert.equal(fs.existsSync(markerPath), false);
      assert.equal(fs.readFileSync(externalTarget, 'utf8'), 'EXTERNAL FILE MUST SURVIVE');
    } finally {
      await server.close();
    }
  });
});
