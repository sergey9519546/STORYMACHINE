// test-reporter.test.ts — `npm test` keeps printing TAP when piped, on every
// Node version, because CI's failure summary reads that output as TAP.
//
// scripts/lib/test-reporter.mjs has the full story. In short: CI tees
// `npm test` into test-output.tap and scripts/tap-failures.mjs pulls the
// `not ok` lines out of it. Through Node 22 that worked because node:test's
// non-TTY default reporter was TAP; Node 23 made `spec` the default
// everywhere, so on Node 24 a red run's summary read "no `not ok` lines found"
// until run-tests.mjs named the reporter itself.
//
// Each spawn below scrubs NODE_TEST_CONTEXT. This file itself runs under
// `node --test`, which sets that variable, and a nested `node --test` that
// inherits it switches to the V8-serialized protocol instead of any reporter
// (the same trap scripts/report-unverified-gates.mjs documents at
// runSuiteDefault).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { testReporterFlags } from '../../scripts/lib/test-reporter.mjs';
import { extractFailures } from '../../scripts/tap-failures.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const NODE_MAJOR = Number(process.versions.node.split('.')[0]);
const FAILING_TEST_NAME = 'a test that fails on purpose';

let scratch = '';
let fixture = '';

before(() => {
  scratch = mkdtempSync(path.join(tmpdir(), 'test-reporter-'));
  fixture = path.join(scratch, 'fixture.test.mjs');
  writeFileSync(
    fixture,
    [
      "import { test } from 'node:test';",
      "test('a test that passes', () => {});",
      `test('${FAILING_TEST_NAME}', () => { throw new Error('boom'); });`,
      '',
    ].join('\n'),
  );
});

after(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/** Run the fixture the way run-tests.mjs does, with stdout piped as it is under CI's `tee`. */
function runPiped(flags: string[]): { status: number | null; output: string } {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--test', ...flags, fixture], {
    encoding: 'utf8',
    env,
    timeout: 60_000,
  });
  if (result.error) throw result.error;
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

describe('testReporterFlags — the reporter `npm test` names', () => {
  it('asks for TAP when stdout is not a terminal (a pipe, a file, CI\'s `tee`)', () => {
    assert.deepEqual(testReporterFlags(false), ['--test-reporter=tap']);
    assert.deepEqual(testReporterFlags(undefined), ['--test-reporter=tap'], '`process.stdout.isTTY` is undefined, not false, on a pipe');
  });

  it('asks for nothing on a terminal, so a person still gets node:test\'s readable default', () => {
    assert.deepEqual(testReporterFlags(true), []);
  });
});

describe('piped `npm test` output stays parseable by scripts/tap-failures.mjs', () => {
  it('with the flags run-tests.mjs passes, a failing test reaches the CI failure summary', () => {
    const { status, output } = runPiped(testReporterFlags(false));
    assert.equal(status, 1, `the fixture has one failing test, so the run must exit 1; output:\n${output}`);
    assert.match(output, /^TAP version 13$/m, 'piped output must be a TAP stream');
    const failures = extractFailures(output);
    assert.deepEqual(
      failures.map((f) => f.name),
      [FAILING_TEST_NAME],
      `tap-failures.mjs must name exactly the one failing test; output:\n${output}`,
    );
    assert.match(failures[0].location, /fixture\.test\.mjs/);
  });

  it('WITHOUT the flags, this Node loses the failure — the regression the flags prevent', { skip: NODE_MAJOR < 23 ? `Node ${process.versions.node} still defaults to TAP when piped, so the unpinned run would pass this check trivially` : false }, () => {
    // The unfixed input, shown to fail. A red run whose summary says nothing
    // failed is what CI would print on Node 24 without testReporterFlags.
    const { status, output } = runPiped([]);
    assert.equal(status, 1, 'the run still fails — the exit code was never the problem');
    assert.doesNotMatch(output, /^TAP version 13$/m, `Node ${process.versions.node}'s piped default is no longer TAP`);
    assert.equal(
      extractFailures(output).length,
      0,
      'if the unpinned default found the failure, this Node went back to a TAP default and the flag is redundant (harmless) — update scripts/lib/test-reporter.mjs\'s header',
    );
  });
});

describe('scripts/run-tests.mjs actually passes the flags', () => {
  it('its live (non-comment) spawn arguments include testReporterFlags(process.stdout.isTTY)', () => {
    const live = readFileSync(path.join(REPO_ROOT, 'scripts/run-tests.mjs'), 'utf8')
      .split(/\r?\n/)
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n');
    assert.match(
      live,
      /'--test'\s*,\s*\.\.\.testReporterFlags\(process\.stdout\.isTTY\)/,
      'run-tests.mjs must put ...testReporterFlags(process.stdout.isTTY) right after --test, or CI\'s TAP summary goes blind on Node 23+',
    );
  });
});
