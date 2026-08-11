import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = process.cwd();
const SESSION_STORE_URL = pathToFileURL(path.join(ROOT, 'server/lib/session-store.ts')).href;
const COLLAB_SERVER_URL = pathToFileURL(path.join(ROOT, 'server/collab/yjs-server.ts')).href;

interface ImportRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

function importWithEnv(
  moduleUrl: string,
  exportedName: string,
  envName: string,
  value: string | undefined,
): ImportRun {
  const env: NodeJS.ProcessEnv = { ...process.env, SESSION_DB_DIR: ':memory:' };
  if (value === undefined) delete env[envName];
  else env[envName] = value;

  const code = `const mod = await import(${JSON.stringify(moduleUrl)}); process.stdout.write(String(mod[${JSON.stringify(exportedName)}]));`;
  return spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--input-type=module', '--eval', code],
    { cwd: ROOT, env, encoding: 'utf8' },
  );
}

function assertImportValue(
  moduleUrl: string,
  exportedName: string,
  envName: string,
  value: string | undefined,
  expected: number,
): void {
  const run = importWithEnv(moduleUrl, exportedName, envName, value);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, String(expected));
}

function assertImportFailure(
  moduleUrl: string,
  exportedName: string,
  envName: string,
  value: string,
  expectedMessage: string,
): void {
  const run = importWithEnv(moduleUrl, exportedName, envName, value);
  assert.notEqual(run.status, 0, `expected ${envName}=${value} to fail module import`);
  const output = `${run.stdout}\n${run.stderr}`;
  assert.match(output, new RegExp(expectedMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

describe('runtime limits — canonical Fountain ceiling', () => {
  it('exports the one backend MAX_FOUNTAIN_CHARS value', async () => {
    const limits = await import('../../server/lib/runtime-limits.ts').catch(() => ({}));
    assert.equal((limits as { MAX_FOUNTAIN_CHARS?: number }).MAX_FOUNTAIN_CHARS, 900_000);
  });
});

describe('runtime limits — import-time environment parsing', () => {
  it('defaults SESSION_FILE_TTL_HOURS to 168 and accepts a valid bounded integer', () => {
    assertImportValue(SESSION_STORE_URL, 'SESSION_FILE_TTL_HOURS', 'SESSION_FILE_TTL_HOURS', undefined, 168);
    assertImportValue(SESSION_STORE_URL, 'SESSION_FILE_TTL_HOURS', 'SESSION_FILE_TTL_HOURS', '', 168);
    assertImportValue(SESSION_STORE_URL, 'SESSION_FILE_TTL_HOURS', 'SESSION_FILE_TTL_HOURS', '720', 720);
  });

  it('rejects invalid SESSION_FILE_TTL_HOURS values without echoing raw input', () => {
    const expected = 'SESSION_FILE_TTL_HOURS must be an integer between 1 and 8760';
    for (const value of ['0', '-1', '1.5', 'abc', '8761', '9007199254740993']) {
      assertImportFailure(SESSION_STORE_URL, 'SESSION_FILE_TTL_HOURS', 'SESSION_FILE_TTL_HOURS', value, expected);
    }
    const secretValue = 'not-a-number-SENSITIVE';
    const run = importWithEnv(SESSION_STORE_URL, 'SESSION_FILE_TTL_HOURS', 'SESSION_FILE_TTL_HOURS', secretValue);
    assert.notEqual(run.status, 0);
    assert.doesNotMatch(`${run.stdout}\n${run.stderr}`, /not-a-number-SENSITIVE/);
  });

  it('defaults COLLAB_MAX_ROOMS to 200 and accepts a valid bounded integer', () => {
    assertImportValue(COLLAB_SERVER_URL, 'COLLAB_MAX_ROOMS', 'COLLAB_MAX_ROOMS', undefined, 200);
    assertImportValue(COLLAB_SERVER_URL, 'COLLAB_MAX_ROOMS', 'COLLAB_MAX_ROOMS', '', 200);
    assertImportValue(COLLAB_SERVER_URL, 'COLLAB_MAX_ROOMS', 'COLLAB_MAX_ROOMS', '350', 350);
  });

  it('rejects invalid COLLAB_MAX_ROOMS values without echoing raw input', () => {
    const expected = 'COLLAB_MAX_ROOMS must be an integer between 1 and 1000';
    for (const value of ['0', '-1', '1.5', 'abc', '1001', '9007199254740993']) {
      assertImportFailure(COLLAB_SERVER_URL, 'COLLAB_MAX_ROOMS', 'COLLAB_MAX_ROOMS', value, expected);
    }
    const secretValue = 'not-a-number-SENSITIVE';
    const run = importWithEnv(COLLAB_SERVER_URL, 'COLLAB_MAX_ROOMS', 'COLLAB_MAX_ROOMS', secretValue);
    assert.notEqual(run.status, 0);
    assert.doesNotMatch(`${run.stdout}\n${run.stderr}`, /not-a-number-SENSITIVE/);
  });
});
