import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ChildServer {
  baseUrl: string;
  waitForRotationPause: () => Promise<void>;
  releaseRotation: () => void;
  close: () => Promise<void>;
}

const isChild = process.env.STORYMACHINE_ROTATION_CHILD === '1';

if (isChild) {
  const sessionDir = process.env.SESSION_DB_DIR;
  if (!sessionDir) throw new Error('SESSION_DB_DIR is required for the rotation child');

  const failTarget = process.env.STORYMACHINE_TEST_FAIL_ROTATION_TARGET;
  const publishRaceTarget = process.env.STORYMACHINE_TEST_PUBLISH_RACE_TARGET;
  if (failTarget || publishRaceTarget) {
    const failTargetPath = failTarget ? path.join(sessionDir, `${failTarget}.db`) : undefined;
    const raceTargetPath = publishRaceTarget ? path.join(sessionDir, `${publishRaceTarget}.db`) : undefined;
    const originalRename = fs.renameSync.bind(fs);
    fs.renameSync = ((oldPath: fs.PathLike, newPath: fs.PathLike) => {
      const resolvedNewPath = path.resolve(String(newPath));
      if (failTargetPath && resolvedNewPath === path.resolve(failTargetPath)) {
        const error = new Error('injected publication failure') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        throw error;
      }
      if (raceTargetPath && resolvedNewPath === path.resolve(raceTargetPath)) {
        // Create a real target at the final publication boundary, after the
        // production preflight check. Windows rename is no-clobber already, so
        // remove it immediately before rename to emulate POSIX rename's atomic
        // replacement semantics and expose code that relies on check+rename.
        fs.writeFileSync(raceTargetPath, 'EXTERNAL TARGET CREATED AT PUBLISH');
        fs.unlinkSync(raceTargetPath);
      }
      return originalRename(oldPath, newPath);
    }) as typeof fs.renameSync;

    const originalLink = fs.linkSync.bind(fs);
    fs.linkSync = ((existingPath: fs.PathLike, newPath: fs.PathLike) => {
      const resolvedNewPath = path.resolve(String(newPath));
      if (failTargetPath && resolvedNewPath === path.resolve(failTargetPath)) {
        const error = new Error('injected publication failure') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        throw error;
      }
      if (raceTargetPath && resolvedNewPath === path.resolve(raceTargetPath)) {
        // A hard-link publication primitive must observe EEXIST and preserve
        // this target rather than replacing it.
        fs.writeFileSync(raceTargetPath, 'EXTERNAL TARGET CREATED AT PUBLISH');
      }
      return originalLink(existingPath, newPath);
    }) as typeof fs.linkSync;
  }

  const cleanupFailure = process.env.STORYMACHINE_TEST_CLEANUP_FAILURE;
  if (cleanupFailure) {
    const { oldId, newId } = JSON.parse(cleanupFailure) as { oldId: string; newId: string };
    const blocked = new Set([
      path.resolve(path.join(sessionDir, `${oldId}.db`)),
      path.resolve(path.join(sessionDir, `${newId}.db`)),
    ]);
    const originalUnlink = fs.unlinkSync.bind(fs);
    fs.unlinkSync = ((file: fs.PathLike) => {
      if (blocked.has(path.resolve(String(file)))) {
        const error = new Error('injected candidate cleanup failure') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        throw error;
      }
      return originalUnlink(file);
    }) as typeof fs.unlinkSync;
  }

  const quarantineRenameFailure = process.env.STORYMACHINE_TEST_QUARANTINE_RENAME_FAILURE;
  if (quarantineRenameFailure) {
    const candidatePath = path.resolve(path.join(sessionDir, `${quarantineRenameFailure}.db`));
    const quarantinePrefix = path.resolve(path.join(sessionDir, `.${quarantineRenameFailure}.failed-rotation-`));
    const originalRename = fs.renameSync.bind(fs);
    fs.renameSync = ((oldPath: fs.PathLike, newPath: fs.PathLike) => {
      if (
        path.resolve(String(oldPath)) === candidatePath
        && path.resolve(String(newPath)).startsWith(quarantinePrefix)
      ) {
        const error = new Error('injected quarantine rename failure') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        throw error;
      }
      return originalRename(oldPath, newPath);
    }) as typeof fs.renameSync;
  }

  const hiddenMarkerId = process.env.STORYMACHINE_TEST_HIDE_MARKER_FROM_EXISTS;
  if (hiddenMarkerId) {
    const hiddenMarkerPath = path.resolve(path.join(sessionDir, `.${hiddenMarkerId}.rotation-deny`));
    const originalExists = fs.existsSync.bind(fs);
    fs.existsSync = ((candidate: fs.PathLike) => {
      if (path.resolve(String(candidate)) === hiddenMarkerPath) return false;
      return originalExists(candidate);
    }) as typeof fs.existsSync;
  }

  let releaseBackup: (() => void) | undefined;
  if (process.env.STORYMACHINE_TEST_PAUSE_ROTATION === '1') {
    const { Stage } = await import('../../server/engine/Stage.ts');
    const originalBackupTo = Stage.prototype.backupTo;
    Stage.prototype.backupTo = async function pausedBackup(destination: string): Promise<void> {
      process.send?.({ type: 'backup-entered' });
      await new Promise<void>(resolve => { releaseBackup = resolve; });
      await originalBackupTo.call(this, destination);
    };
  }

  const { createApp } = await import('../../server/app.ts');
  const app = await createApp({ serveStatic: false });
  const server = app.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('child server did not bind a TCP port');
    process.send?.({ type: 'ready', port: address.port });
  });

  process.on('message', async message => {
    if (message === 'release-backup') {
      releaseBackup?.();
      releaseBackup = undefined;
      return;
    }
    if (message !== 'close') return;
    releaseBackup?.();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    const { sessions } = await import('../../server/lib/session-store.ts');
    for (const session of sessions.values()) session.stage.close();
    sessions.clear();
    process.send?.({ type: 'closed' });
    process.disconnect?.();
  });
} else {
  const roots: string[] = [];

  after(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  });

  async function startChildServer(
    sessionDir: string,
    options: {
      failPublishTarget?: string;
      pauseRotation?: boolean;
      publishRaceTarget?: string;
      cleanupFailure?: { oldId: string; newId: string };
      quarantineRenameFailure?: string;
      hideMarkerFromExists?: string;
    } = {},
  ): Promise<ChildServer> {
    const child = spawn(process.execPath, [
      '--experimental-strip-types',
      fileURLToPath(import.meta.url),
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SESSION_DB_DIR: sessionDir,
        STORYMACHINE_ROTATION_CHILD: '1',
        ...(options.failPublishTarget
          ? { STORYMACHINE_TEST_FAIL_ROTATION_TARGET: options.failPublishTarget }
          : {}),
        ...(options.pauseRotation ? { STORYMACHINE_TEST_PAUSE_ROTATION: '1' } : {}),
        ...(options.publishRaceTarget
          ? { STORYMACHINE_TEST_PUBLISH_RACE_TARGET: options.publishRaceTarget }
          : {}),
        ...(options.cleanupFailure
          ? { STORYMACHINE_TEST_CLEANUP_FAILURE: JSON.stringify(options.cleanupFailure) }
          : {}),
        ...(options.quarantineRenameFailure
          ? { STORYMACHINE_TEST_QUARANTINE_RENAME_FAILURE: options.quarantineRenameFailure }
          : {}),
        ...(options.hideMarkerFromExists
          ? { STORYMACHINE_TEST_HIDE_MARKER_FROM_EXISTS: options.hideMarkerFromExists }
          : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
    });

    let diagnostics = '';
    child.stdout?.on('data', chunk => { diagnostics += chunk.toString(); });
    child.stderr?.on('data', chunk => { diagnostics += chunk.toString(); });

    const ready = await waitForMessage(child, 'ready', diagnostics);
    return {
      baseUrl: `http://127.0.0.1:${ready.port}`,
      waitForRotationPause: async () => {
        await waitForMessage(child, 'backup-entered', diagnostics);
      },
      releaseRotation: () => { child.send('release-backup'); },
      close: async () => {
        if (child.exitCode !== null) return;
        child.send('close');
        await waitForMessage(child, 'closed', diagnostics);
        await new Promise<void>((resolve, reject) => {
          child.once('exit', code => code === 0 ? resolve() : reject(new Error(`child exited ${code}\n${diagnostics}`)));
          child.once('error', reject);
        });
      },
    };
  }

  function waitForMessage(
    child: ChildProcess,
    type: 'ready' | 'closed' | 'backup-entered',
    diagnostics: string,
  ): Promise<{ type: string; port?: number }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`timed out waiting for child ${type}\n${diagnostics}`));
      }, 15_000);
      const onMessage = (message: unknown) => {
        if (!message || typeof message !== 'object' || (message as { type?: unknown }).type !== type) return;
        cleanup();
        resolve(message as { type: string; port?: number });
      };
      const onExit = (code: number | null) => {
        cleanup();
        reject(new Error(`child exited ${code} before ${type}\n${diagnostics}`));
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        clearTimeout(timeout);
        child.off('message', onMessage);
        child.off('exit', onExit);
        child.off('error', onError);
      };
      child.on('message', onMessage);
      child.on('exit', onExit);
      child.on('error', onError);
    });
  }

  function makeSessionDir(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storymachine-session-rotation-'));
    roots.push(root);
    const sessionDir = path.join(root, 'sessions');
    fs.mkdirSync(sessionDir, { recursive: true });
    return sessionDir;
  }

  async function saveMarker(baseUrl: string, sessionId: string, marker: string): Promise<void> {
    const response = await fetch(`${baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        scriptText: marker,
        snapshots: [],
        characters: [],
        researchNotes: [],
        isDarkMode: false,
      }),
    });
    assert.equal(response.status, 200);
  }

  async function loadMarker(baseUrl: string, sessionId: string): Promise<{ status: string; scriptText: string }> {
    const response = await fetch(`${baseUrl}/api/scriptide/load?sessionId=${sessionId}`);
    assert.equal(response.status, 200);
    return await response.json() as { status: string; scriptText: string };
  }

  async function rotate(baseUrl: string, oldSessionId: string, newSessionId: string): Promise<Response> {
    return fetch(`${baseUrl}/api/session/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': oldSessionId },
      body: JSON.stringify({ newSessionId }),
    });
  }

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
}
