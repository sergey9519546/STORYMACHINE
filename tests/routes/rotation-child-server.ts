// Shared harness for the session-rotation persistence tests: boots a REAL
// child-process server (a full `tsx server.ts`-equivalent boot via
// server/app.ts's createApp(), not an in-process handler call) so restart
// behavior — the thing this suite actually verifies — is exercised for real.
//
// Extracted from a single test file (originally
// tests/routes/session-rotation-persistence.test.ts) that called
// startChildServer() 17 times, serialized within one node:test file/process.
// node:test parallelizes ACROSS files, not within one, so 17 serial ~1-20s
// subprocess boots in one file made it the suite's wall-clock tail (one
// subtest alone took ~20.7s). Splitting the `describe`/`it` blocks into
// sibling files (see session-rotation-persistence*.test.ts) lets node:test
// run them as separate processes in parallel; this module is what makes that
// possible without duplicating the child-process bootstrap or the fault-
// injection wiring, which must stay byte-identical across every caller.
//
// THIS MODULE IS ALSO THE SPAWN TARGET. `startChildServer` spawns
// `fileURLToPath(import.meta.url)` — that resolves to THIS file regardless of
// which sibling test file called it, so every split file's children run the
// exact same bootstrap. It is intentionally not named `*.test.ts`, so
// scripts/run-tests.mjs's discovery (which only collects `*.test.ts`) never
// tries to run it as a standalone suite — same convention as
// tests/routes/helpers.ts.
import { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ChildServer {
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
}

// ── Parent/test-side helpers ────────────────────────────────────────────────
// Defined unconditionally (definitions have no side effects until called) so
// they are always valid named exports; only actually invoked from the
// !isChild side. `roots` and the `after()` cleanup are likewise harmless if
// this module is ever evaluated in child mode — makeSessionDir() is simply
// never called there.
const roots: string[] = [];

if (!isChild) {
  after(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  });
}

export async function startChildServer(
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

export function makeSessionDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storymachine-session-rotation-'));
  roots.push(root);
  const sessionDir = path.join(root, 'sessions');
  fs.mkdirSync(sessionDir, { recursive: true });
  return sessionDir;
}

export async function saveMarker(baseUrl: string, sessionId: string, marker: string): Promise<void> {
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

export async function loadMarker(baseUrl: string, sessionId: string): Promise<{ status: string; scriptText: string }> {
  const response = await fetch(`${baseUrl}/api/scriptide/load?sessionId=${sessionId}`);
  assert.equal(response.status, 200);
  return await response.json() as { status: string; scriptText: string };
}

export async function rotate(baseUrl: string, oldSessionId: string, newSessionId: string): Promise<Response> {
  return fetch(`${baseUrl}/api/session/rotate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': oldSessionId },
    body: JSON.stringify({ newSessionId }),
  });
}
