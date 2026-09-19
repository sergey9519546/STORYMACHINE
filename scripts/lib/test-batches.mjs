// HOW `npm test` HANDS ITS FILES TO `node --test` — repo-relative, glob-free,
// and split across spawns once one command line would be too long.
//
// ── Why this exists (2026-09-18) ────────────────────────────────────────────
// scripts/run-tests.mjs used to spawn ONE `node --test` with every collected
// file as an ABSOLUTE path. Windows caps a process command line at 32,766
// characters (CreateProcessW's 32,767 including the terminating NUL — measured,
// see tests/scripts/run-tests-spawn.test.ts), and under a checkout such as
// `C:\Users\<name>\OneDrive\Documents\...\STORYMACHINE` the 98-character root,
// repeated once per file, made that command line 49,356 characters for the
// 352 files collected on 2026-09-18. The spawn failed with `ENAMETOOLONG`
// before a single test ran. Three fixes live here:
//
//   1. REPO-RELATIVE PATHS, spawned with `cwd` at the repository root, so the
//      checkout's location no longer multiplies into the command line. The
//      same 352 files make a 13,804-character command line this way.
//
//   2. BATCHING ABOVE A BUDGET. Relative paths alone are not enough headroom:
//      the tracked test files under the roots went 127 → 206 → 350 between
//      2026-07-15, 08-15 and 09-18 — about 5,000-6,000 characters of command
//      line a month at the latest rate, which reaches the Windows ceiling in
//      three to four months and this budget in about two. So files are
//      packed, in their sorted order, into as few spawns as keep each command
//      line within COMMAND_LINE_BUDGET. Below the budget that is exactly one
//      spawn — the same single `node --test <every file>` run, and the same
//      output, as before. The budget applies on every platform, not only
//      Windows, so CI exercises the same batch shape a Windows checkout gets
//      and the split is decided by the suite, never by the OS. Splitting does
//      not change the load any one test sees: `node --test` already runs each
//      file in its own child process, at most (available parallelism - 1) at
//      a time, and that cap is the same inside every batch.
//
//   3. NO GLOB CHARACTERS IN A FILE ARGUMENT. `node --test` reads every
//      positional argument as a glob PATTERN, even a plain file path: asked
//      for `sub/a[1].test.ts` it runs `sub/a1.test.ts` and silently skips the
//      file that was named (reproduced in the test). A collected file whose
//      path contains a glob character would therefore run something else, or
//      nothing, while run-tests.mjs's coverage check reports it collected.
//      Such a file is refused, loudly, instead. With absolute paths the whole
//      checkout path was part of every pattern too; relative paths also take
//      that out of play.
//
// Every batch runs even after one fails, so a run still reports every failure,
// and the exit code is non-zero if any batch failed. CI tees the combined
// output into one TAP file; scripts/tap-failures.mjs reads only `not ok` lines
// and their diagnostics, so several TAP documents in one file are fine.

import { spawnSync } from 'node:child_process';
import { isAbsolute, relative } from 'node:path';

/** The longest command line CreateProcessW accepts, in UTF-16 code units,
 *  excluding the terminating NUL. `commandLineLength` of 32,766 spawns and of
 *  32,767 fails with ENAMETOOLONG (pinned on Windows by the test). */
export const WINDOWS_MAX_COMMAND_LINE = 32_766;

/** The per-spawn ceiling the planner packs to. Deliberately well under
 *  WINDOWS_MAX_COMMAND_LINE: the calculation below is exact for what this
 *  module passes, and the margin is for what it cannot see coming. */
export const COMMAND_LINE_BUDGET = 24_000;

/** Characters that make a `node --test` argument a glob pattern rather than a
 *  literal path. Deliberately broad (`]`, `}`, `)` and a non-leading `!` are
 *  harmless on their own); a false refusal costs a rename, a miss costs a
 *  silently unrun file. */
const GLOB_CHARACTERS = /[*?[\]{}()!]/;

/**
 * Length of `arg` once libuv has quoted it for a Windows command line — a port
 * of `quote_cmd_arg` in libuv's src/win/process.c. Arguments without a space,
 * tab or double quote go through verbatim; otherwise the argument is wrapped in
 * quotes, each embedded quote gains a backslash, and backslashes are doubled
 * where they precede a quote (including the closing one).
 * @param {string} arg
 * @returns {number}
 */
export function windowsQuotedLength(arg) {
  if (arg === '') return 2;
  if (!/[ \t"]/.test(arg)) return arg.length;
  if (!/["\\]/.test(arg)) return arg.length + 2;
  let extra = 2;
  let quoteFollows = true; // the closing quote
  for (let i = arg.length - 1; i >= 0; i--) {
    const ch = arg[i];
    if (ch === '\\' && quoteFollows) {
      extra += 1;
    } else if (ch === '"') {
      extra += 1;
      quoteFollows = true;
    } else {
      quoteFollows = false;
    }
  }
  return arg.length + extra;
}

/**
 * The Windows command line `spawn(argv[0], argv.slice(1))` produces: each
 * argument quoted as libuv quotes it, joined by single spaces.
 * @param {readonly string[]} argv the executable first, then its arguments
 * @returns {number}
 */
export function commandLineLength(argv) {
  let total = argv.length > 0 ? argv.length - 1 : 0;
  for (const arg of argv) total += windowsQuotedLength(arg);
  return total;
}

/**
 * Collected test files as the arguments `node --test` should get: relative to
 * `repoRoot` (which the spawn uses as its cwd), with forward slashes on every
 * platform. Throws for a file outside `repoRoot` and for any path containing a
 * glob character — see (3) in the header.
 * @param {string} repoRoot
 * @param {readonly string[]} files absolute paths
 * @returns {string[]}
 */
export function toTestArgs(repoRoot, files) {
  return files.map((file) => {
    const rel = relative(repoRoot, file).replace(/\\/g, '/');
    if (rel === '' || rel === '..' || rel.startsWith('../') || isAbsolute(rel)) {
      throw new Error(`${file} is not inside ${repoRoot}; run-tests.mjs only runs files under the repository root.`);
    }
    if (GLOB_CHARACTERS.test(rel)) {
      throw new Error(
        [
          `${rel} contains a glob character (one of * ? [ ] { } ( ) !).`,
          '`node --test` reads every file argument as a glob pattern, so this file would run something else, or',
          'nothing, while the coverage check counted it as collected. Rename it; see scripts/lib/test-batches.mjs.',
        ].join('\n'),
      );
    }
    return rel;
  });
}

/**
 * Pack `files`, in order, into as few batches as keep every spawn's command
 * line (`command`, then `flags`, then the batch) within `budget`. Greedy
 * next-fit is optimal here: batches are contiguous runs of an ordered list.
 * @param {{ command: string, flags: readonly string[], files: readonly string[], budget?: number }} plan
 * @returns {string[][]}
 */
export function planTestBatches({ command, flags, files, budget = COMMAND_LINE_BUDGET }) {
  if (budget > WINDOWS_MAX_COMMAND_LINE) {
    throw new RangeError(`A ${budget}-character budget is over the ${WINDOWS_MAX_COMMAND_LINE}-character Windows limit it exists to respect.`);
  }
  if (files.length === 0) {
    throw new Error('No test files to run; refusing a false-green test run.');
  }
  const fixed = commandLineLength([command, ...flags]);
  /** @type {string[][]} */
  const batches = [];
  /** @type {string[]} */
  let current = [];
  let used = fixed;
  for (const file of files) {
    const cost = 1 + windowsQuotedLength(file); // separating space + the argument
    if (fixed + cost > budget) {
      throw new Error(`${file} alone makes a ${fixed + cost}-character command line, over the ${budget}-character budget.`);
    }
    if (current.length > 0 && used + cost > budget) {
      batches.push(current);
      current = [];
      used = fixed;
    }
    current.push(file);
    used += cost;
  }
  batches.push(current);
  return batches;
}

/**
 * Run `files` under `command flags...`, in as many spawns as the budget needs,
 * with stdio inherited and `cwd` as given. Returns the exit code for the whole
 * run: the first non-zero batch status, else 0. Every batch runs even after a
 * failing one; a batch killed by a signal stops the run (nothing else is
 * started, and that is said). A spawn that cannot start at all throws.
 * @param {{
 *   command: string,
 *   flags: readonly string[],
 *   files: readonly string[],
 *   cwd: string,
 *   budget?: number,
 *   spawn?: (command: string, args: string[], options: { stdio: 'inherit', cwd: string }) => { status: number | null, signal?: NodeJS.Signals | null, error?: Error },
 *   log?: (line: string) => void,
 * }} run
 * @returns {number}
 */
export function runTestBatches({ command, flags, files, cwd, budget = COMMAND_LINE_BUDGET, spawn = spawnSync, log = console.log }) {
  const batches = planTestBatches({ command, flags, files, budget });
  const many = batches.length > 1;
  if (many) {
    log(`Split into ${batches.length} spawns so no command line exceeds ${budget} characters (see scripts/lib/test-batches.mjs).`);
  }
  /** @type {number[]} */
  const statuses = [];
  for (const [i, batch] of batches.entries()) {
    if (many) log(`\n=== Batch ${i + 1}/${batches.length}: ${batch.length} files, ${batch[0]} … ${batch[batch.length - 1]} ===`);
    const result = spawn(command, [...flags, ...batch], { stdio: 'inherit', cwd });
    if (result.error) throw result.error;
    if (result.signal) {
      const left = batches.length - i - 1;
      log(`Batch ${i + 1}/${batches.length} was killed by ${result.signal}${left > 0 ? `; not starting the remaining ${left}` : ''}.`);
      return 1;
    }
    statuses.push(result.status ?? 1);
  }
  const code = statuses.find((status) => status !== 0) ?? 0;
  if (many) {
    log(`\nBatches: ${statuses.map((status, i) => `${i + 1}/${batches.length} exit ${status}`).join(', ')} — ${code === 0 ? 'all passed' : 'FAILED'}.`);
  }
  return code;
}
