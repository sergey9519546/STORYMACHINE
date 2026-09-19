// THE SPAWN `npm test` MAKES — pinned, because the one it replaced could not
// start on a Windows checkout under a long path.
//
// ── Why this exists (2026-09-18) ────────────────────────────────────────────
//
// scripts/run-tests.mjs passed all 352 collected files to ONE `node --test` as
// absolute paths. Under `C:\Users\<name>\OneDrive\Documents\...\STORYMACHINE`
// that command line was 49,356 characters against Windows' 32,766, and
// `npm test` died with `spawnSync ... ENAMETOOLONG` before running anything.
// scripts/lib/test-batches.mjs is the fix; its header has the numbers. This
// file pins the properties that make it a fix:
//
//   1. the length calculation is Windows' own: 32,766 spawns and 32,767 is
//      ENAMETOOLONG, for every quoting class (measured, on Windows only);
//   2. file arguments are repo-relative, forward-slashed, and glob-free — and
//      the glob refusal is needed, because `node --test` reads a plain path
//      as a pattern (demonstrated below, so the guard's premise stays tested);
//   3. batches partition the files in order, each within the budget, in as
//      few spawns as possible, and a failing batch fails the run without
//      stopping the others;
//   4. the wiring is real: run with its spawn intercepted, run-tests.mjs asks
//      for `cwd` = the repository root, repo-relative files that all exist,
//      every collected file exactly once, and command lines within budget.
//      Against the old runner this fails on `cwd` and on absolute paths, on
//      every platform — it does not need a long path, or Windows, to fail.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  COMMAND_LINE_BUDGET,
  WINDOWS_MAX_COMMAND_LINE,
  commandLineLength,
  planTestBatches,
  runTestBatches,
  toTestArgs,
  windowsQuotedLength,
} from '../../scripts/lib/test-batches.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const FLAGS = ['--experimental-strip-types', '--test'];
const NODE = 'C:\\Program Files\\nodejs\\node.exe';

/** The environment for a nested `node` that must not think it is a node:test
 *  child of this run (see scripts/report-unverified-gates.mjs's runSuiteDefault). */
function childEnv(extra: Record<string, string> = {}) {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

describe('windowsQuotedLength / commandLineLength — libuv\'s quoting, character for character', () => {
  it('passes a plain argument through and wraps a spaced one in quotes', () => {
    assert.equal(windowsQuotedLength('tests/core/a.test.ts'), 20);
    assert.equal(windowsQuotedLength('a b'), 5);
    assert.equal(windowsQuotedLength(''), 2, 'libuv writes an empty argument as ""');
    // Spaces AND backslashes, but no quote and no trailing backslash: only the
    // two wrapping quotes are added.
    assert.equal(windowsQuotedLength(NODE), NODE.length + 2);
  });

  it('escapes embedded quotes and doubles only the backslashes that precede a quote', () => {
    // a\ "b\  →  "a\ \"b\\"  — the inner backslash precedes a space (kept
    // single), the quote gains one, the trailing backslash precedes the
    // closing quote (doubled).
    assert.equal(windowsQuotedLength('a\\ "b\\'), '"a\\ \\"b\\\\"'.length);
  });

  it('joins the quoted arguments with one space each', () => {
    assert.equal(commandLineLength([NODE, '--test', 'a b']), (NODE.length + 2) + 1 + 6 + 1 + 5);
    assert.equal(commandLineLength([]), 0);
  });

  it('is the limit Windows actually enforces: 32,766 spawns, 32,767 is ENAMETOOLONG', {
    skip: process.platform !== 'win32' && 'CreateProcessW\'s command-line limit only exists on Windows',
  }, () => {
    // One case per quoting branch, so a drift in any of them moves the edge.
    for (const extra of [[], ['a b'], ['a\\ "b\\'], ['C:\\dir with space\\x.test.ts']]) {
      const base = [process.execPath, '-e', '0', ...extra];
      const at = (length: number) => {
        const argv = [...base, 'x'.repeat(length - commandLineLength(base) - 1)];
        assert.equal(commandLineLength(argv), length);
        return spawnSync(argv[0], argv.slice(1));
      };
      const fits = at(WINDOWS_MAX_COMMAND_LINE);
      assert.equal(fits.error, undefined, `${JSON.stringify(extra)}: a ${WINDOWS_MAX_COMMAND_LINE}-character command line must spawn`);
      assert.equal(fits.status, 0);
      const over = at(WINDOWS_MAX_COMMAND_LINE + 1);
      assert.equal((over.error as NodeJS.ErrnoException | undefined)?.code, 'ENAMETOOLONG',
        `${JSON.stringify(extra)}: one character more must be refused — if it is not, WINDOWS_MAX_COMMAND_LINE is stale`);
    }
  });
});

describe('toTestArgs — what each collected file becomes on the command line', () => {
  const root = path.resolve(tmpdir(), 'a checkout', 'under a long', 'OneDrive path', 'STORYMACHINE');

  it('makes every file repo-relative with forward slashes, however long the root', () => {
    const files = [path.join(root, 'tests', 'core', 'a.test.ts'), path.join(root, 'server', 'nvm', 'analyze', 'b.test.ts')];
    assert.deepEqual(toTestArgs(root, files), ['tests/core/a.test.ts', 'server/nvm/analyze/b.test.ts']);
  });

  it('refuses a path with a glob character, naming the file', () => {
    for (const name of ['a[1].test.ts', 'a*.test.ts', 'a?.test.ts', 'a{1,2}.test.ts', 'a!(b).test.ts']) {
      assert.throws(
        () => toTestArgs(root, [path.join(root, 'tests', name)]),
        (err: Error) => err.message.includes(`tests/${name}`) && /glob/.test(err.message),
        `${name} must be refused`,
      );
    }
  });

  it('refuses a file outside the repository root', () => {
    assert.throws(() => toTestArgs(root, [path.resolve(root, '..', 'elsewhere.test.ts')]), /not inside/);
  });

  it('refuses glob characters because `node --test` really does read a file path as a pattern', () => {
    // The premise of the refusal above, kept runnable: asked for the literal
    // file `sub/a[1].test.ts`, node:test runs `sub/a1.test.ts` instead and
    // never runs the one named. If this ever fails, node:test has started
    // reading file arguments literally and the glob refusal can be relaxed.
    const dir = mkdtempSync(path.join(tmpdir(), 'run-tests-glob-'));
    try {
      mkdirSync(path.join(dir, 'sub'));
      writeFileSync(path.join(dir, 'sub', 'a[1].test.ts'), "import { test } from 'node:test'; test('the-file-that-was-named', () => {});\n");
      writeFileSync(path.join(dir, 'sub', 'a1.test.ts'), "import { test } from 'node:test'; test('a-different-file', () => {});\n");
      const run = spawnSync(process.execPath, [...FLAGS, '--test-reporter=tap', 'sub/a[1].test.ts'], {
        cwd: dir, encoding: 'utf8', env: childEnv(), timeout: 60_000,
      });
      assert.match(run.stdout, /^ok \d+ - a-different-file$/m, run.stdout + run.stderr);
      assert.doesNotMatch(run.stdout, /the-file-that-was-named/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('planTestBatches — as few in-budget spawns as the files need, in order', () => {
  const files = Array.from({ length: 40 }, (_, i) => `tests/core/file-${String(i).padStart(2, '0')}.test.ts`);
  const fixed = commandLineLength([NODE, ...FLAGS]);
  const cost = 1 + files[0].length; // every name here is the same length

  it('keeps one spawn while the whole command line fits', () => {
    const batches = planTestBatches({ command: NODE, flags: FLAGS, files });
    assert.deepEqual(batches, [files]);
  });

  it('splits into contiguous in-budget batches that hold every file exactly once, in order', () => {
    const budget = fixed + cost * 7 + 3; // room for 7 files, not 8
    const batches = planTestBatches({ command: NODE, flags: FLAGS, files, budget });
    assert.deepEqual(batches.flat(), files, 'the batches must be a partition of the files, order kept');
    assert.deepEqual(batches.map((b) => b.length), [7, 7, 7, 7, 7, 5]);
    for (const batch of batches) {
      assert.ok(commandLineLength([NODE, ...FLAGS, ...batch]) <= budget);
    }
    assert.equal(batches.length, Math.ceil(files.length / 7), 'no more spawns than the budget forces');
  });

  it('refuses an empty run, a file that cannot fit alone, and a budget over the Windows limit', () => {
    assert.throws(() => planTestBatches({ command: NODE, flags: FLAGS, files: [] }), /false-green/);
    assert.throws(() => planTestBatches({ command: NODE, flags: FLAGS, files, budget: fixed + cost - 1 }), /alone/);
    assert.throws(() => planTestBatches({ command: NODE, flags: FLAGS, files, budget: WINDOWS_MAX_COMMAND_LINE + 1 }), RangeError);
    assert.ok(COMMAND_LINE_BUDGET <= WINDOWS_MAX_COMMAND_LINE);
  });
});

describe('runTestBatches — every batch runs, and any failure fails the run', () => {
  const files = ['tests/a.test.ts', 'tests/b.test.ts', 'tests/c.test.ts'];
  const budget = commandLineLength([NODE, ...FLAGS, files[0]]); // one file per spawn

  function fakeSpawn(results: Array<{ status: number | null; signal?: NodeJS.Signals | null; error?: Error }>) {
    const calls: Array<{ command: string; args: string[]; options: { stdio: 'inherit'; cwd: string } }> = [];
    const spawn = (command: string, args: string[], options: { stdio: 'inherit'; cwd: string }) => {
      calls.push({ command, args, options });
      return results[calls.length - 1];
    };
    return { calls, spawn };
  }

  it('makes exactly the old single spawn when everything fits, with cwd and inherited stdio', () => {
    const { calls, spawn } = fakeSpawn([{ status: 0 }]);
    const lines: string[] = [];
    const code = runTestBatches({ command: NODE, flags: FLAGS, files, cwd: '/repo', spawn, log: (l) => lines.push(l) });
    assert.equal(code, 0);
    assert.deepEqual(calls, [{ command: NODE, args: [...FLAGS, ...files], options: { stdio: 'inherit', cwd: '/repo' } }]);
    assert.deepEqual(lines, [], 'a single spawn prints nothing extra — the output is the run\'s own');
  });

  it('runs the batches after a failing one, and returns the failure', () => {
    const { calls, spawn } = fakeSpawn([{ status: 0 }, { status: 1 }, { status: 0 }]);
    const lines: string[] = [];
    const code = runTestBatches({ command: NODE, flags: FLAGS, files, cwd: '/repo', budget, spawn, log: (l) => lines.push(l) });
    assert.equal(code, 1);
    assert.deepEqual(calls.map((c) => c.args.slice(FLAGS.length)), [[files[0]], [files[1]], [files[2]]]);
    assert.match(lines.join('\n'), /1\/3 exit 0, 2\/3 exit 1, 3\/3 exit 0 — FAILED/);
  });

  it('returns 0 only when every batch passed', () => {
    const { spawn } = fakeSpawn([{ status: 0 }, { status: 0 }, { status: 0 }]);
    assert.equal(runTestBatches({ command: NODE, flags: FLAGS, files, cwd: '/repo', budget, spawn, log: () => {} }), 0);
  });

  it('counts a batch that exited with no status as a failure', () => {
    const { spawn } = fakeSpawn([{ status: 0 }, { status: null }, { status: 0 }]);
    assert.equal(runTestBatches({ command: NODE, flags: FLAGS, files, cwd: '/repo', budget, spawn, log: () => {} }), 1);
  });

  it('stops at a batch killed by a signal, and says what it did not start', () => {
    const { calls, spawn } = fakeSpawn([{ status: null, signal: 'SIGINT' }, { status: 0 }, { status: 0 }]);
    const lines: string[] = [];
    const code = runTestBatches({ command: NODE, flags: FLAGS, files, cwd: '/repo', budget, spawn, log: (l) => lines.push(l) });
    assert.equal(code, 1);
    assert.equal(calls.length, 1);
    assert.match(lines.join('\n'), /killed by SIGINT; not starting the remaining 2/);
  });

  it('throws when a spawn cannot start at all, rather than reporting a status', () => {
    const failure = Object.assign(new Error('spawnSync node ENAMETOOLONG'), { code: 'ENAMETOOLONG' });
    const { spawn } = fakeSpawn([{ status: null, error: failure }]);
    assert.throws(() => runTestBatches({ command: NODE, flags: FLAGS, files, cwd: '/repo', spawn, log: () => {} }), /ENAMETOOLONG/);
  });
});

describe('scripts/run-tests.mjs — the spawn it actually makes', () => {
  const CAPTURE_ENV = 'RUN_TESTS_SPAWN_CAPTURE';

  it('spawns node --test from the repository root with repo-relative, in-budget file lists covering every collected file once', {
    // Inside a run this test started, do not start another.
    skip: process.env[CAPTURE_ENV] !== undefined && 'nested inside a captured run',
  }, () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'run-tests-spawn-'));
    try {
      const capture = path.join(dir, 'spawns.jsonl');
      const preload = path.join(dir, 'intercept.mjs');
      // Replace child_process.spawnSync — the ESM binding run-tests.mjs and
      // test-batches.mjs import included — with a recorder that runs nothing.
      // Every other launcher throws, so a runner that moved to one of them
      // fails here instead of starting the real suite inside this test. If the
      // replacement did not take, exit before run-tests.mjs is even loaded.
      writeFileSync(preload, `
        import { createRequire, syncBuiltinESMExports } from 'node:module';
        import { appendFileSync } from 'node:fs';
        const cp = createRequire(import.meta.url)('node:child_process');
        const recorder = (command, args, options) => {
          appendFileSync(process.env.${CAPTURE_ENV}, JSON.stringify({ command, args, cwd: options?.cwd ?? null }) + '\\n');
          return { status: 0, signal: null, pid: 0, output: [null, null, null], stdout: null, stderr: null };
        };
        cp.spawnSync = recorder;
        for (const name of ['spawn', 'fork', 'exec', 'execFile', 'execSync', 'execFileSync']) {
          cp[name] = () => { throw new Error('run-tests.mjs launched the suite via child_process.' + name + '; update tests/scripts/run-tests-spawn.test.ts to intercept it'); };
        }
        syncBuiltinESMExports();
        if ((await import('node:child_process')).spawnSync !== recorder) {
          process.stderr.write('intercept did not reach the ESM binding; refusing to run the real suite\\n');
          process.exit(97);
        }
      `);
      const run = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, 'scripts/run-tests.mjs'], {
        cwd: REPO, encoding: 'utf8', env: childEnv({ [CAPTURE_ENV]: capture }), timeout: 120_000,
      });
      assert.equal(run.status, 0, run.stdout + run.stderr);
      const collected = Number(/^Running (\d+) test files\.$/m.exec(run.stdout)?.[1]);
      assert.ok(collected > 0, `run-tests.mjs did not report its file count:\n${run.stdout}`);

      const spawns = readFileSync(capture, 'utf8').trim().split('\n')
        .map((line) => JSON.parse(line) as { command: string; args: string[]; cwd: string | null });
      assert.ok(spawns.length >= 1);
      const seen: string[] = [];
      for (const [i, s] of spawns.entries()) {
        assert.equal(s.command, process.execPath, `spawn ${i + 1}: the same node that ran the runner`);
        assert.equal(s.cwd, REPO, `spawn ${i + 1}: cwd must be the repository root, or repo-relative paths resolve against the caller's directory`);
        assert.deepEqual(s.args.slice(0, FLAGS.length), FLAGS, `spawn ${i + 1}`);
        const length = commandLineLength([s.command, ...s.args]);
        assert.ok(length <= COMMAND_LINE_BUDGET, `spawn ${i + 1}: ${length}-character command line, over the ${COMMAND_LINE_BUDGET} budget`);
        seen.push(...s.args.slice(FLAGS.length));
      }
      const absolute = seen.filter((f) => path.isAbsolute(f) || f.includes('\\'));
      assert.deepEqual(absolute.slice(0, 3), [], `${absolute.length} file argument(s) are not repo-relative with forward slashes — an absolute path puts the checkout's own path on the command line once per file`);
      const missing = seen.filter((f) => !existsSync(path.join(REPO, f)));
      assert.deepEqual(missing, [], 'every file argument must exist relative to the repository root');
      assert.equal(new Set(seen).size, seen.length, 'no file may run twice');
      assert.equal(seen.length, collected, 'every collected file must be in exactly one spawn');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
