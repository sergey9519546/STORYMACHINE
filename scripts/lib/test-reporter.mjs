// scripts/lib/test-reporter.mjs — which node:test reporter `npm test` asks for.
//
// WHY THIS EXISTS (2026-09-18, the move from Node 22 to Node 24). CI runs
// `npm test 2>&1 | tee test-output.tap` (ci.yml and release.yml, "Run
// tests"), then scripts/tap-failures.mjs pulls the `not ok` lines out of that
// file ("Print test failure summary") and the file is uploaded as the
// `test-output-tap` artifact. scripts/run-tests.mjs never named a reporter; it
// relied on node:test's default, which through Node 22 is `tap` whenever
// stdout is not a TTY. Node 23 made `spec` the default everywhere. Measured on
// Node 24.21.0 with stdout piped: a failing test prints `✖ fails`, the stream
// carries no `TAP version 13` and no `not ok` line, and tap-failures.mjs
// answers "no `not ok` lines found in the TAP stream — nothing to report" for
// a run that failed. The job still goes red, because the exit code is
// untouched, but its failure summary says nothing failed and the artifact
// named TAP is not TAP.
//
// So TAP is requested explicitly when stdout is not a TTY, and nothing is
// requested when it is. That is the choice Node 22 made on its own: a terminal
// keeps the readable spec output and a pipe gets TAP, on every Node version
// package.json's engines admit. tests/scripts/test-reporter.test.ts pins both
// directions and shows the unpinned default losing the failure on this Node.

/**
 * @param {boolean | undefined} isTTY `process.stdout.isTTY` of the process
 *   whose stdout the test runner will inherit.
 * @returns {string[]} flags to put after `--test`.
 */
export function testReporterFlags(isTTY) {
  return isTTY ? [] : ['--test-reporter=tap'];
}
