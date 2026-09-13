#!/usr/bin/env node
// test-ci-env.mjs — replicate the GitHub Actions runner's environment for
// `npm test` and run it (or specific files) under it.
//
// WHY THIS EXISTS: 2026-09-13, the full suite was green on the sandbox
// (14,000 tests, 0 failures, three independent runs) and RED on the GitHub
// runner on exactly two files, every push to main since CI resumed —
//   tests/core/scoring-receipt-guard.test.ts ("FAILS under CI when there is
//     no base ref at all")
//   tests/scripts/report-unverified-gates.test.ts ("the real gate list")
// Both were environment leaks: a test (or the script under test) built a
// child process's env with `{ ...process.env, ...overrides }` or a bare
// `execFileSync(cmd, args, { cwd })` with no `env` at all, so it silently
// inherited whatever GitHub Actions sets AMBIENTLY for every step of the
// job that runs `npm test` — GITHUB_EVENT_NAME, GITHUB_SHA, GITHUB_EVENT_PATH
// (always set), plus RUN_E2E and GIT_SHA (set by ci.yml specifically for the
// "Run tests" step, `.github/workflows/ci.yml`'s "Run tests" step env: block).
// Neither leak reproduced on this sandbox, because the sandbox's own
// process.env carries none of those — so "0 failures locally" proved nothing
// about the runner. Full writeup, both root causes, and the fix:
// docs/audits/2026-09-13-ci-green/ci-env-lane-report.md.
//
// WHAT THIS DOES: replicates the runner's env by ADDITION AND SUBTRACTION,
// not addition alone (round-2 review finding 3 — addition-only left
// GEMINI_API_KEY/REAL_SCRIPT_CORPUS_DIR/HONESTY_AUDIT_REPO/GITHUB_TOKEN
// leaking through from whatever shell ran this tool, none of which the real
// "Run tests" step carries). It sets every GITHUB_*/RUNNER_*/CI env var
// Actions sets on a push to main (see the list below, matched against a real
// ci.yml run) plus the "Run tests" step's own RUN_E2E/GIT_SHA, points
// GITHUB_EVENT_PATH at a real push-shaped event.json built from this repo's
// own last two commits, DELETES every var the real step does not carry
// (DELETE_FROM_RUNNER_ENV below, each with its own reason), and then runs
// the suite exactly as `npm test` does (scripts/run-tests.mjs, which
// inherits this process's env) — or, with file arguments, runs just those
// files via `node --experimental-strip-types --test <files>`, the same way
// `npm test` invokes them, so a lane can check the one file it touched in
// seconds instead of paying for the full suite.
//
// WHAT THIS DELIBERATELY DOES NOT DO: detach HEAD or run from a scratch
// clone. actions/checkout does leave HEAD detached at the pushed SHA with
// `origin/main` present — full fidelity for a NEW class of bug would clone
// to a temp dir and detach there (that is how this class was first
// reproduced; see the audit doc's repro transcript) — but doing that IN
// PLACE on a lane's own working tree would detach the lane's real checkout,
// which is destructive to a session mid-edit. Neither bug this tool exists
// to catch depended on detached-vs-branch HEAD (grep for
// `abbrev-ref` in scripts/ and tests/ if you need to confirm that is still
// true before trusting a green run here over one more difference). If a
// FUTURE failure is suspected to depend on checkout topology specifically,
// reproduce it the way the audit did: a fresh `git clone` of this repo to a
// scratch dir, `git checkout --detach origin/main` there, then run this same
// env battery inside that clone.
//
// USAGE:
//   npm run test:ci-env                      # full suite, replicated env
//   npm run test:ci-env -- tests/core/x.test.ts tests/scripts/y.test.ts
//
// Exit code is the child's — this is a drop-in "is it actually green" check,
// not a report.

import { spawnSync } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function resolveRef(rev) {
  try {
    return git(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`]);
  } catch {
    return null;
  }
}

const after = git(['rev-parse', 'HEAD']);
const before = resolveRef('HEAD~1') ?? '0'.repeat(40); // all-zeros: this commit created the ref
// This tool never detaches HEAD itself (see the header), so `branch` is
// normally a real branch name. A detached checkout (or a failed lookup) has
// no branch name to report; fall back to `main`, since a push event's
// GITHUB_REF is always `refs/heads/<something>` and this tool otherwise
// simulates a push to main — never the raw commit SHA Actions never puts
// there (round-2 review finding 6).
let branch;
try {
  branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
} catch {
  branch = 'HEAD';
}
const refName = `refs/heads/${branch === 'HEAD' ? 'main' : branch}`;

const scratch = mkdtempSync(path.join(tmpdir(), 'ci-env-repro-'));
const eventPath = path.join(scratch, 'event.json');
writeFileSync(
  eventPath,
  JSON.stringify({
    before,
    after,
    ref: refName,
    repository: { full_name: 'sergey9519546/STORYMACHINE' },
  }),
);
const runnerTemp = path.join(scratch, 'runner-temp');
mkdirSync(runnerTemp, { recursive: true });

// Every GITHUB_* variable Actions sets on a push to main, per the CI-env
// lane brief (docs/audits/2026-09-13-ci-green/ci-env-lane-report.md item 1),
// plus the "Run tests" step's own step-level env (ci.yml: RUN_E2E, GIT_SHA —
// these do NOT persist to later steps in the real job, only within "Run
// tests" itself, which is exactly the step whose ambient env this class of
// bug leaks out of).
const ciEnv = {
  ...process.env,
  GITHUB_ACTIONS: 'true',
  CI: 'true',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_SHA: after,
  GITHUB_REF: refName.startsWith('refs/') ? refName : `refs/heads/${refName}`,
  GITHUB_REF_NAME: refName.replace(/^refs\/heads\//, ''),
  GITHUB_REF_TYPE: 'branch',
  GITHUB_REPOSITORY: 'sergey9519546/STORYMACHINE',
  GITHUB_WORKFLOW: 'CI',
  GITHUB_RUN_ID: '999999999',
  GITHUB_RUN_NUMBER: '1',
  GITHUB_ACTOR: 'github-actions',
  GITHUB_WORKSPACE: REPO_ROOT,
  GITHUB_EVENT_PATH: eventPath,
  RUNNER_OS: 'Linux',
  RUNNER_TEMP: runnerTemp,
  TZ: 'UTC',
  LANG: 'C.UTF-8',
  // "Run tests" step env (ci.yml) — the actual leak source for both bugs
  // this tool was written to catch.
  RUN_E2E: '1',
  GIT_SHA: after,
};
// The runner's "Run tests" step is defined as much by what it does NOT
// carry as by what it does (round-2 review finding 3: replicating by
// addition alone left every one of these leaking through from whatever
// shell this tool happens to run in, so a green run here proved less than
// the tool's own name claimed). Each is deleted, with the reason it is
// absent on the real runner:
const DELETE_FROM_RUNNER_ENV = {
  PUSH_BEFORE_SHA:
    'wired only into the separate "Report unverified gates" / '
    + 'check-scoring-receipt CI steps, never into "Run tests" — leaving it '
    + 'unset here is what makes the runner\'s real leak (GITHUB_EVENT_PATH, '
    + 'not PUSH_BEFORE_SHA) reproducible.',
  GEMINI_API_KEY:
    'ci.yml omits it deliberately for the "Run tests" step — the product\'s '
    + 'official keyless analysis-only mode is what CI must prove. A developer '
    + 'with a key in their shell runs a strictly different, untested posture '
    + 'if this leaks through.',
  REAL_SCRIPT_CORPUS_DIR:
    'set nowhere in .github/ (CLAUDE.md is explicit — this is why the AUC-24 '
    + 'live-measurement suite has never run in CI). On the owner\'s own '
    + 'machine — the one machine where this IS set, and the machine most '
    + 'likely to run this tool before a push — leaving it in would run the '
    + 'real-corpus suite under a "CI" label that never runs it for real.',
  HONESTY_AUDIT_REPO:
    'set only on ci.yml\'s dedicated "Honesty string audit" step, not on '
    + '"Run tests" — leaving it in makes the repo-metadata lane of a spawned '
    + 'honesty-audit run under a label that never carries it.',
  GITHUB_TOKEN:
    'set ambiently in interactive/agent shells (this very sandbox included) '
    + 'but only wired into ci.yml\'s honesty-audit step, not "Run tests" — '
    + 'leaking it through here is one env var away from a spawned test '
    + 'hitting the network under a label that claims no such credential.',
  GH_TOKEN: 'the gh-cli equivalent of GITHUB_TOKEN above; same reason.',
};
const removed = Object.keys(DELETE_FROM_RUNNER_ENV).filter((k) => k in process.env);
for (const key of Object.keys(DELETE_FROM_RUNNER_ENV)) delete ciEnv[key];

const fileArgs = process.argv.slice(2);

console.log(`test:ci-env — replicating the GitHub Actions push-to-main runner env`);
console.log(`  before=${before.slice(0, 12)} after=${after.slice(0, 12)} ref=${refName}`);
console.log(`  event payload: ${eventPath}`);
if (removed.length > 0) {
  console.log(`  removed from the caller's env (the runner does not carry these): ${removed.join(', ')}`);
}
console.log(fileArgs.length > 0 ? `  running ${fileArgs.length} file(s)` : '  running the full suite (scripts/run-tests.mjs)');
console.log('');

let result;
try {
  result = fileArgs.length > 0
    ? spawnSync(process.execPath, ['--experimental-strip-types', '--test', ...fileArgs], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env: ciEnv,
      })
    : spawnSync(process.execPath, ['scripts/run-tests.mjs'], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env: ciEnv,
      });
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (result.error) throw result.error;
process.exit(result.status ?? 1);
