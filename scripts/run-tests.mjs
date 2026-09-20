import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { runTestBatches, toTestArgs } from './lib/test-batches.mjs';
import { testReporterFlags } from './lib/test-reporter.mjs';

// Keep the suite boundary explicit: experimental engine/V5 test trees are not
// part of the current P0 research gate. Passing literal glob strings to Node's
// test runner runs zero tests on Windows, so discover the intended files here
// and pass concrete paths directly to Node — repo-relative, glob-free, and in
// more than one spawn once one command line would be too long for Windows
// (scripts/lib/test-batches.mjs says why each of those holds).
//
// WHY THE COVERAGE CHECK BELOW EXISTS: this list is what `npm test` means, and
// a test file that is not under one of these roots does not run — silently. An
// audit found tests/critics/ (critics-engine.test.ts, covering
// server/critics/critics-engine.ts behind the live POST /api/critics/evaluate
// and /api/critics/export routes) and server/nvm/kernel/event-store.test.ts
// (32 tests over the live kernel closure that server/engine/Stage.ts imports)
// had never been run by `npm test` at all, because nobody noticed the roots
// list had stopped matching the tree. "0 failures" over a suite that quietly
// omits directories is the same failure mode as a gate that cannot fail. So
// every *.test.ts in the repository must now be either COLLECTED or listed in
// NOT_RUN with a reason; a new one that is neither fails the run instead of
// disappearing from it.
const TEST_ROOTS = [
  'evals/scoring',
  'server/nvm/analyze',
  'server/nvm/proof',
  'tests/collab',
  'tests/core',
  'tests/critics',
  'tests/e2e',
  'tests/nvm',
  'tests/passes',
  'tests/routes',
  'tests/scripts',
  'tests/security',
];

// Individual files that belong to the suite but sit in a directory that is
// otherwise quarantined (see NOT_RUN).
const TEST_FILES = [
  // server/nvm/kernel/ is NOT fully dead: server/engine/Stage.ts imports live
  // runtime values from event-store.ts. Its own test file therefore covers
  // shipped code and belongs in the suite, even though its siblings do not.
  'server/nvm/kernel/event-store.test.ts',
];

// Test files that deliberately do NOT run, each with the reason. This is not a
// convenience list — anything added here is being excluded from the meaning of
// "npm test passes", so the reason has to survive review.
const NOT_RUN = [
  {
    file: 'tests/story-vector.test.ts',
    reason:
      'Intentionally emptied by the 2026-08-03 audit fix; its real assertions were moved into the '
      + 'suites that do run. tsconfig.json excludes it.',
  },
  // The other seven entries this list carried until 2026-09-20 named test
  // files belonging to the v5.0 "narrative OS" experiment (server/nvm/
  // __tests__/{compatibility,smoke,v5-integration}.test.ts, server/nvm/kernel/
  // __tests__/{integration,trinity-gate-integration}.test.ts, server/nvm/
  // kernel/adapters/type-enrichment.test.ts) plus tests/apdl.test.ts, which
  // targeted the removed server/planning/**. All seven were deleted with the
  // closure they tested — see docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md
  // Proposal B2 and docs/audits/2026-09-20-dead-weight-b1-b2/README.md. Their
  // entries had to go with them: the staleUnrun check below fails the run on a
  // NOT_RUN entry whose file no longer exists.
];

// Directories the coverage sweep never descends into.
const SWEEP_SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'output', 'data', '.claude', 'coverage', '.playwright-cli',
]);
// The sweep walks the whole repository (minus the skip list above) rather than
// a second list of roots — a second list would be a second thing to forget to
// update, which is the bug this check exists to catch.

const REPO_ROOT = resolve(import.meta.dirname, '..');

function collectTestFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectTestFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.test.ts')) files.push(path);
  }
  return files;
}

function sweepTestFiles(directory) {
  const files = [];
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SWEEP_SKIP_DIRS.has(entry.name)) continue;
      files.push(...sweepTestFiles(join(directory, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

const testFiles = [
  ...TEST_ROOTS.flatMap((root) => collectTestFiles(resolve(REPO_ROOT, root))),
  ...TEST_FILES.map((f) => resolve(REPO_ROOT, f)),
].sort();

if (testFiles.length === 0) {
  throw new Error('Test discovery found no files; refusing a false-green test run.');
}

for (const file of TEST_FILES) {
  const abs = resolve(REPO_ROOT, file);
  if (!statSync(abs, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`TEST_FILES names ${file}, which does not exist. Fix the list rather than leaving a dead entry.`);
  }
}

// --- Coverage check: nothing may be silently unrun -------------------------
const collected = new Set(testFiles.map((f) => relative(REPO_ROOT, f).replace(/\\/g, '/')));
const declaredUnrun = new Map(NOT_RUN.map((e) => [e.file, e.reason]));
const onDisk = sweepTestFiles(REPO_ROOT).map((f) => relative(REPO_ROOT, f).replace(/\\/g, '/'));

const unaccounted = onDisk.filter((f) => !collected.has(f) && !declaredUnrun.has(f));
if (unaccounted.length > 0) {
  throw new Error(
    [
      'Test files exist that this run neither executes nor declares as deliberately unrun:',
      ...unaccounted.map((f) => `  - ${f}`),
      '',
      'A test nobody runs is worse than no test: it reads as coverage and provides none.',
      'Either add its directory to TEST_ROOTS (or the file to TEST_FILES) in scripts/run-tests.mjs,',
      'or add it to NOT_RUN there with the reason it must not run.',
    ].join('\n'),
  );
}

const staleUnrun = NOT_RUN.filter((e) => !onDisk.includes(e.file));
if (staleUnrun.length > 0) {
  throw new Error(
    [
      'NOT_RUN in scripts/run-tests.mjs names files that no longer exist:',
      ...staleUnrun.map((e) => `  - ${e.file}`),
      'Remove the stale entries — a quarantine list that no longer matches the tree is not being read.',
    ].join('\n'),
  );
}

console.log(`Running ${testFiles.length} test files.`);
if (NOT_RUN.length > 0) {
  console.log(`Deliberately NOT run (${NOT_RUN.length}, see scripts/run-tests.mjs NOT_RUN for reasons):`);
  for (const e of NOT_RUN) console.log(`  - ${e.file}`);
}
// The reporter is named, not left to node:test's default: Node 23+ defaults to
// `spec` even when piped, and CI's failure summary reads this output as TAP.
// scripts/lib/test-reporter.mjs has the measurement.
process.exitCode = runTestBatches({
  command: process.execPath,
  flags: ['--experimental-strip-types', '--test', ...testReporterFlags(process.stdout.isTTY)],
  files: toTestArgs(REPO_ROOT, testFiles),
  cwd: REPO_ROOT,
});
