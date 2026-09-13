// `npm run owner:measure`, END TO END, ON A MACHINE WITH NO CORPUS.
//
// The command's whole point is a run only the owner can do: the corpus is
// local-only and copyright-restricted, so nothing in CI can measure it. That
// is not a reason for the SCRIPT to be unverified. `--corpus-fixture=public`
// swaps in the 32 distributable screenplays this repository already commits
// (20 CC0 in data/screenplays + the 12 blind-pair fixtures) as a throwaway
// corpus with a throwaway manifest, and everything else — the plan, the
// pre-flight, the detached worktrees, `measure-real`, the three-scan receipt
// conversion, the gate's own verification, the commit, the real
// check-scoring-receipt CLI, the manifest re-lock and `lock-auc24` — is the
// real code path on real git objects.
//
// IT RUNS IN A CLONE, NEVER IN THIS CHECKOUT. The pipeline commits, moves a
// branch ref and rewrites tests/fixtures/real-corpus-manifest.json; doing that
// to the repository running the test would be a test with a blast radius. The
// clone is `--shared` (objects by reference, nothing copied), its `origin` is
// pointed at itself so the tip verification has a remote to check, and the
// scripts under test are copied in from THIS working tree so the test exercises
// the code as it stands, not as it was last committed.
//
// WHAT IS DELIBERATELY NOT SIMULATED: a real-corpus AUC-24 number. Every
// number below comes from the actual doctor running on scripts committed to
// this repository. The owner's run on real text is the one step no test
// performs.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  FIXTURE_MARKER, MEASURE_REAL_LEGACY_ID, classifyLayout, detectMeasureRealRecipe,
  moveBranchRef, parseMeasureReal, recipeComparison, redact, resolveOutDir,
} from '../../scripts/owner-measure.mjs';
import { AUC24_DEGRADATION_ID } from '../../scripts/lib/auc.ts';

const REPO = path.resolve(import.meta.dirname, '../..');
const FIXTURE_BRANCH = 'scoring/fixture-e2e';

/** The files the clone must take from the WORKING tree, not from its HEAD. */
const UNDER_TEST = [
  'scripts/owner-measure.mjs',
  'scripts/check-scoring-receipt.mjs',
  'scripts/lib/owner-measure-plan.mjs',
  'scripts/lib/receipt-conversion.mjs',
  'scripts/lib/manifest-relock.mjs',
  'scripts/lib/score-corpus-rows.mjs',
  'scripts/lib/verify-receipt-range.mjs',
  'scripts/lib/auc.ts',
];

function sh(cmd: string, args: string[], opts: Record<string, unknown> = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function git(repo: string, args: string[]) {
  const res = sh('git', ['-C', repo, ...args]);
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

const REPORT_BRANCH = 'scoring/fixture-report';

/** A corpus-shape probe the fixture branch carries and its BASE does not — the
 *  shape of the real thing (`scripts/probe-corpus-shape.ts` exists on the three
 *  adversarial-stack branches and on neither `main` nor
 *  `scoring/feature-length-defects`). It prints a CSV of corpus filenames,
 *  which is exactly why its output must reach the local run directory and
 *  never stdout. */
const FIXTURE_PROBE = `// fixture corpus-shape probe (tests/scripts/owner-measure-e2e.test.ts)
import { readdirSync } from 'node:fs';
const dir = process.env.REAL_SCRIPT_CORPUS_DIR ?? '';
if (!dir) {
  console.log('\\n[SKIP] REAL_SCRIPT_CORPUS_DIR not set');
  process.exit(0);
}
console.log('file,words,@cue,>tr');
for (const f of readdirSync(dir).sort()) console.log(\`\${f},0,0,0\`);
process.exit(0);
`;

/** The PENDING ledger entry the fixture branch files — the input the three-scan
 *  conversion exists for, written to trip all three scans at once. */
function pendingEntry(): string {
  return [
    '',
    '### 2026-09-13 — FIXTURE E2E: a scoring-path change with no measurement (PENDING OWNER MEASUREMENT — no real-corpus run happened)',
    '',
    '**Branch:** `scoring/fixture-e2e`, one commit. **This is a scoring-path change',
    'and its AUC-24 is not known.**',
    '',
    '- **Command:** `npm run benchmark:public`. **`npm run measure-real` was NOT among',
    '  them** — see the attestation below.',
    '- **Corpus fingerprint:** none for AUC-24 — no private corpus was read.',
    '- **Git SHA:** measured at each commit of `scoring/fixture-e2e` in turn.',
    '- **Measured AUC-24:** **PENDING** — the private corpus is not present in this',
    '  environment, so this branch has no AUC-24 number and claims none.',
    '- **Runner attestation:** I ran every command listed above myself, in this',
    '  worktree, in the foreground, and read each one\'s output.',
    '',
    '  The AUC-24 for this range has',
    '  not been run and is the owner\'s step; this entry\'s own heading says so.',
    '',
  ].join('\n');
}

let tmp = '';
let clone = '';
let outDir = '';
let baseSha = '';
let fixtureTip = '';
let reportTip = '';
let run: { status: number | null; stdout: string; stderr: string } = { status: null, stdout: '', stderr: '' };
let dryRun: { status: number | null; stdout: string; stderr: string } = { status: null, stdout: '', stderr: '' };
let manifestBefore: Array<{ file: string }> = [];

describe('owner:measure end to end, on the committed public corpus', () => {
  before(async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'owner-measure-e2e-'));
    clone = path.join(tmp, 'clone');
    outDir = path.join(tmp, 'out');

    // --shared: object storage by reference. Nothing is copied, and nothing
    // this test does can reach back into the source repository's refs.
    assert.equal(sh('git', ['clone', '--quiet', '--shared', REPO, clone]).status, 0, 'clone failed');
    git(clone, ['remote', 'set-url', 'origin', clone]);
    git(clone, ['config', 'user.email', 'fixture@example.invalid']);
    git(clone, ['config', 'user.name', 'owner-measure fixture']);
    // node_modules is not cloned; every tool on these trees needs it.
    sh('ln', ['-s', path.join(REPO, 'node_modules'), path.join(clone, 'node_modules')]);
    for (const rel of UNDER_TEST) copyFileSync(path.join(REPO, rel), path.join(clone, rel));

    // The operator's explicit "this checkout is disposable" marker. Fixture
    // mode refuses without it, and refuses to run against the repository the
    // script itself lives in (round-1 review, F5).
    writeFileSync(path.join(clone, '.owner-measure-throwaway'), 'owner-measure e2e fixture\n', 'utf8');

    baseSha = git(clone, ['rev-parse', 'HEAD']);

    // The fixture branch: one scoring-path change and one PENDING receipt
    // entry, built in its own worktree so the clone's checkout never stands on
    // the branch the run commits to (which the pre-flight refuses).
    const build = path.join(tmp, 'build');
    git(clone, ['worktree', 'add', '--quiet', '-b', FIXTURE_BRANCH, build, baseSha]);
    const doctor = path.join(build, 'server/nvm/analyze/doctor.ts');
    // A REAL one-line scoring change, not a comment (round-1 review §4c): the
    // scarcity scale moves every script's health, so the branch's AUC-24
    // differs from the baseline's and the manifest re-lock actually moves
    // fields. A comment-only touch made both numbers identical and printed
    // "0 field(s) moved", which exercised neither path.
    const doctorSrc = readFileSync(doctor, 'utf8');
    assert.ok(doctorSrc.includes('const SCARCITY_SCALE = 140;'), 'the fixture needs this constant to still exist');
    writeFileSync(doctor, doctorSrc.replace('const SCARCITY_SCALE = 140;', 'const SCARCITY_SCALE = 152;'), 'utf8');
    writeFileSync(path.join(build, 'scripts/probe-corpus-shape.ts'), FIXTURE_PROBE, 'utf8');
    const receipt = path.join(build, 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md');
    writeFileSync(receipt, readFileSync(receipt, 'utf8') + pendingEntry(), 'utf8');
    git(clone, ['-C', build, 'add', '-A']);
    git(clone, ['-C', build, 'commit', '--quiet', '-m', 'fixture: a scoring-path change and its PENDING ledger row']);
    fixtureTip = git(clone, ['rev-parse', FIXTURE_BRANCH]);
    git(clone, ['worktree', 'remove', '--force', build]);
    git(clone, ['push', '--quiet', 'origin', FIXTURE_BRANCH]);

    // A SECOND branch, measured by a `report` step: measured and written down,
    // never accepted (round-1 review, F3).
    const build2 = path.join(tmp, 'build-report');
    git(clone, ['worktree', 'add', '--quiet', '-b', REPORT_BRANCH, build2, baseSha]);
    const doctor2 = path.join(build2, 'server/nvm/analyze/doctor.ts');
    writeFileSync(doctor2, readFileSync(doctor2, 'utf8').replace('const SCARCITY_SCALE = 140;', 'const SCARCITY_SCALE = 133;'), 'utf8');
    const receipt2 = path.join(build2, 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md');
    writeFileSync(receipt2, readFileSync(receipt2, 'utf8')
      + pendingEntry().replace(/FIXTURE E2E/g, 'FIXTURE REPORT').replace(/scoring\/fixture-e2e/g, REPORT_BRANCH), 'utf8');
    git(clone, ['-C', build2, 'add', '-A']);
    git(clone, ['-C', build2, 'commit', '--quiet', '-m', 'fixture: a second scoring-path change, for a report-gate step']);
    reportTip = git(clone, ['rev-parse', REPORT_BRANCH]);
    git(clone, ['worktree', 'remove', '--force', build2]);
    git(clone, ['push', '--quiet', 'origin', REPORT_BRANCH]);

    // The plan and the note it must agree with, both throwaway.
    const notePath = 'docs/brain/Owner/Owner - Fixture E2E.md';
    writeFileSync(path.join(clone, notePath), [
      '# Fixture note', '',
      '| branch | tip | what it is |',
      '| --- | --- | --- |',
      `| \`${FIXTURE_BRANCH}\` | \`${fixtureTip.slice(0, 8)}\` | the throwaway branch this test measures |`,
      `| \`${REPORT_BRANCH}\` | \`${reportTip.slice(0, 8)}\` | the throwaway branch measured by a report step |`,
      '',
    ].join('\n'), 'utf8');
    writeFileSync(path.join(clone, 'fixture-plan.json'), `${JSON.stringify({
      schemaVersion: 1,
      updated: '2026-09-13',
      note: notePath,
      remote: 'origin',
      baseline: { ref: git(clone, ['rev-parse', '--abbrev-ref', 'HEAD']), reason: 'the fixture baseline, measured first' },
      steps: [
        {
          id: 'fixture', branch: FIXTURE_BRANCH, tip: fixtureTip, base: baseSha,
          when: 'always', gate: 'accept-reject',
          reason: 'the one throwaway step this fixture accepts',
          receiptRanges: [`${baseSha}..HEAD`],
          // The branch carries a probe its base does not — one side RUNS and one
          // side is SKIPPED, which is what the Command field has to say.
          probe: { base: baseSha, sourceRef: null, reason: 'the fixture probe exists on the branch only' },
        },
        {
          id: 'report-only', branch: REPORT_BRANCH, tip: reportTip, base: baseSha,
          when: 'always', gate: 'report',
          reason: 'measured and reported; never accepted, never re-locked, never the lock tip',
          receiptRanges: [`${baseSha}..HEAD`],
          probe: null,
        },
      ],
      lock: { command: 'npm run lock-auc24', artifact: 'tests/fixtures/auc24-table.json', reason: 'the deadline is the table' },
    }, null, 2)}\n`, 'utf8');

    manifestBefore = JSON.parse(readFileSync(path.join(clone, 'tests/fixtures/real-corpus-manifest.json'), 'utf8'));

    const env = { ...process.env };
    delete env.REAL_SCRIPT_CORPUS_DIR;
    // --dry-run FIRST, on the untouched fixture branch: it must print every
    // edit and leave the branch, the manifest and the table exactly as they
    // were. Running it after the real pass would prove nothing.
    // Run the WORKING TREE's script against the clone: the code under test is
    // this checkout's, and `--repo-root` differs from the script's own
    // repository, which is what fixture mode requires.
    dryRun = sh(process.execPath, [
      '--experimental-strip-types', path.join(REPO, 'scripts/owner-measure.mjs'),
      '--corpus-fixture=public',
      `--plan-file=${path.join(clone, 'fixture-plan.json')}`,
      `--repo-root=${clone}`,
      `--out-dir=${path.join(tmp, 'out-dry')}`,
      '--accept-all', '--dry-run',
    ], { cwd: clone, env });

    run = sh(process.execPath, [
      '--experimental-strip-types', path.join(REPO, 'scripts/owner-measure.mjs'),
      '--corpus-fixture=public',
      `--plan-file=${path.join(clone, 'fixture-plan.json')}`,
      `--repo-root=${clone}`,
      `--out-dir=${outDir}`,
      '--accept-all',
      // The trees survive the run so this file can inspect what was staged in
      // them; the whole temp directory goes away in `after`.
      '--keep-trees',
    ], { cwd: clone, env });
  });

  after(() => {
    if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
  });

  it('exits 0', () => {
    assert.equal(run.status, 0, `exit ${run.status}\n--- stdout ---\n${run.stdout.slice(-6000)}\n--- stderr ---\n${run.stderr.slice(-4000)}`);
  });

  it('prints the plan, the step and the reason before doing anything', () => {
    assert.match(run.stdout, /OWNER MEASUREMENT PLAN/);
    assert.match(run.stdout, /the one throwaway step this fixture accepts/);
    assert.ok(
      run.stdout.indexOf('OWNER MEASUREMENT PLAN') < run.stdout.indexOf('PRE-FLIGHT'),
      'the plan is printed before the pre-flight runs',
    );
  });

  it('measures the BASELINE first, then the branch, and prints both against the floor', () => {
    assert.ok(run.stdout.indexOf('BASELINE') < run.stdout.indexOf('STEP fixture'), 'baseline first');
    assert.match(run.stdout, /AUC-24 reported :\s+[0-9]\.\d{4}\s+\(recipe `[^`]+`\)/);
    assert.match(run.stdout, /vs AUC24_FLOOR\s+:\s+0\.622/);
  });

  it('labels each number with the recipe that produced it, and says they differ', () => {
    // Round 1 printed "BOTH numbers are on recipe shuffle-drop/v2" while
    // measure-real was computing its own legacy split (review F1).
    assert.doesNotMatch(run.stdout, /BOTH numbers are on recipe/);
    assert.match(run.stdout, /AUC-24 reported :\s+[0-9.]+\s+\(recipe `shuffle-drop\/legacy-int-ext-split`\)/);
    assert.match(run.stdout, /THESE TWO NUMBERS ARE ON DIFFERENT RECIPES AND ARE NOT COMPARABLE/);
    assert.match(run.stdout, /the table `lock-auc24` WRITES is/);
    assert.match(run.stdout, /AUC24_FLOOR was written for/);
    assert.match(run.stdout, /same recipe, same run, so this one IS a comparison/);
  });

  it('the branch and the baseline are DIFFERENT numbers — the comparison is not degenerate', () => {
    const nums = [...run.stdout.matchAll(/AUC-24 reported :\s+([0-9.]+)/g)].map((m) => Number(m[1]));
    const vsBaseline = /vs baseline\s+:\s+([0-9.]+) \(([+-][0-9.]+)\)/.exec(run.stdout);
    assert.ok(nums.length >= 1);
    assert.ok(vsBaseline, 'the run must print the branch against the baseline');
    assert.notEqual(Number(vsBaseline![2]), 0, 'a comment-only fixture made this always 0.0000');
  });

  it('converts the PENDING entry and verifies 0 problems with the gate\'s own functions', () => {
    assert.match(run.stdout, /1 PENDING entry converted by the three-scan recipe/);
    // The ledger already carries pending-looking entries from merged history
    // that the CLI never validates; the run must leave them alone and say so.
    assert.match(run.stdout, /pending-looking entr(y|ies) outside this range left untouched/);
    assert.match(run.stdout, /0 problems \(gate's own validateEntry\)/);
  });

  it('the REAL check-scoring-receipt CLI exits 0 on the committed tree', () => {
    assert.match(run.stdout, /gate CLI\s+: check-scoring-receipt .*— exit 0/);
    const tip = git(clone, ['rev-parse', FIXTURE_BRANCH]);
    assert.notEqual(tip, fixtureTip, 'the branch ref should have moved to the conversion commit');
    const res = sh(process.execPath, [path.join(clone, 'scripts/check-scoring-receipt.mjs'), `${baseSha}..${tip}`], { cwd: clone });
    assert.equal(res.status, 0, `${res.stdout}\n${res.stderr}`);
    assert.match(res.stdout, /gained a well-formed new entry/);
  });

  it('the committed entry carries the measured number, the fingerprint and the runner', () => {
    const tip = git(clone, ['rev-parse', FIXTURE_BRANCH]);
    const receipt = git(clone, ['show', `${tip}:docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`]);
    const entry = receipt.slice(receipt.indexOf('### 2026-09-13 — FIXTURE E2E'));
    assert.match(entry, /MEASURED 2026-\d\d-\d\d — AUC-24 [0-9]\.\d{4}/);
    assert.match(entry, /corpus identity \(sha256 over the manifest's/);
    assert.match(entry, /`sha256:[0-9a-f]{16}`/);
    assert.match(entry, /I ran the command above myself on \d{4}-\d\d-\d\d, on my own machine/);
    assert.doesNotMatch(entry.split('\n').slice(0, 1)[0], /PENDING/);
  });

  it('the commit message and the receipt carry no screenplay title, path or text', () => {
    // SCOPE, deliberately: the MANIFEST legitimately carries a `file` per row —
    // that is what a manifest is, and the committed 72-row one has done so
    // since it existed. What must stay clean is the commit message and the
    // receipt entry, which are the artifacts this run WRITES.
    const tip = git(clone, ['rev-parse', FIXTURE_BRANCH]);
    const message = git(clone, ['show', '--no-patch', '--format=%B', tip]);
    const receiptDiff = git(clone, ['show', tip, '--', 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md']);
    const names = readdirSync(path.join(REPO, 'data/screenplays'))
      .filter((f) => f.endsWith('.fountain')).map((f) => f.replace('.fountain', ''));
    for (const name of names) {
      assert.ok(!message.includes(name), `the commit message names ${name}`);
      assert.ok(!receiptDiff.includes(name), `the receipt entry names ${name}`);
    }
    assert.ok(!message.includes(outDir), 'the commit message names the local output directory');
    assert.ok(!receiptDiff.includes(outDir), 'the receipt names the local output directory');
    assert.match(message, /No corpus path, title or filename is in this commit/);
  });

  it('the report-gate step is measured and NOT accepted', () => {
    // Round 1 initialised `decision` to 'accepted' and only let an
    // accept-reject gate change it, so a report step re-locked the 72-row
    // manifest, became the lock tip and satisfied every downstream
    // `if-accepted:` — after printing that it took no decision (review F3).
    assert.match(run.stdout, /STEP report-only — MEASURING/);
    assert.match(run.stdout, /this step REPORTS/);
    assert.match(run.stdout, /decision        : reported/);
    assert.match(run.stdout, /not re-locked — the re-lock follows acceptance, and this step was reported/);
    const relocks = [...run.stdout.matchAll(/manifest re-lock:/g)].length;
    assert.equal(relocks, 1, 'exactly one step was accepted, so exactly one re-lock');
  });

  it('and its manifest is the throwaway one, un-re-locked, while the accepted branch\'s moved', () => {
    const reportManifest = git(clone, ['show', `${git(clone, ['rev-parse', REPORT_BRANCH])}:tests/fixtures/real-corpus-manifest.json`]);
    const acceptedManifest = git(clone, ['show', `${git(clone, ['rev-parse', FIXTURE_BRANCH])}:tests/fixtures/real-corpus-manifest.json`]);
    assert.notEqual(reportManifest, acceptedManifest, 'the accepted branch was re-locked and the reported one was not');
  });

  it('the lock tip is the ACCEPTED step, never the reported one', () => {
    assert.match(run.stdout, new RegExp(`LOCK — tests/fixtures/auc24-table\\.json on ${FIXTURE_BRANCH}`));
    assert.doesNotMatch(run.stdout, new RegExp(`LOCK — .* on ${REPORT_BRANCH}`));
  });

  it('the Command field of the committed receipt says what the probe actually did', () => {
    const tip = git(clone, ['rev-parse', FIXTURE_BRANCH]);
    const receipt = git(clone, ['show', `${tip}:docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`]);
    const entry = receipt.slice(receipt.indexOf('### 2026-09-13 — FIXTURE E2E'));
    assert.match(entry, /on the branch tree RAN/);
    assert.match(entry, /on the base tree was SKIPPED/);
    // and the step with no probe says so rather than claiming one ran
    const reportReceipt = git(clone, ['show', `${git(clone, ['rev-parse', REPORT_BRANCH])}:docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`]);
    const reportEntry = reportReceipt.slice(reportReceipt.indexOf('### 2026-09-13 — FIXTURE REPORT'));
    assert.match(reportEntry, /no corpus-shape probe \(the measurement plan records none for this step\)/);
    assert.doesNotMatch(reportEntry, /probe-corpus-shape/);
  });

  it('the receipt names the recipe that produced its number, not the one lock-auc24 uses', () => {
    const tip = git(clone, ['rev-parse', FIXTURE_BRANCH]);
    const receipt = git(clone, ['show', `${tip}:docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`]);
    const entry = receipt.slice(receipt.indexOf('### 2026-09-13 — FIXTURE E2E'));
    assert.match(entry, /recipe `shuffle-drop\/legacy-int-ext-split`/);
    assert.match(entry, /IT IS NOT THE RECIPE `lock-auc24` WRITES/);
  });

  it('the converted entry tells one story: fields above, as-filed prose below', () => {
    const tip = git(clone, ['rev-parse', FIXTURE_BRANCH]);
    const receipt = git(clone, ['show', `${tip}:docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`]);
    const lines = receipt.slice(receipt.indexOf('### 2026-09-13 — FIXTURE E2E')).split('\n');
    const boundary = lines.findIndex((l) => l.startsWith('#### As filed, before this measurement'));
    assert.ok(boundary > 0);
    const stale = lines.findIndex((l) => /and its AUC-24 is not known/.test(l));
    if (stale !== -1) assert.ok(stale > boundary, 'a pending assertion survived above the boundary');
    for (const label of ['Command', 'Measured AUC-24', 'Runner attestation']) {
      assert.ok(lines.findIndex((l) => l.startsWith(`- **${label}:**`)) < boundary);
    }
  });

  it('re-locks the manifest IN PLACE, order preserved, only on acceptance', () => {
    const moved = /manifest re-lock: (\d+) rows mapped IN PLACE, order preserved — (\d+) field\(s\) moved/.exec(run.stdout);
    assert.ok(moved, 'the accepted step must print its re-lock');
    assert.equal(Number(moved![1]), 32);
    assert.ok(Number(moved![2]) > 0, 'a comment-only fixture moved 0 fields and exercised nothing');
    const tip = git(clone, ['rev-parse', FIXTURE_BRANCH]);
    const after = JSON.parse(git(clone, ['show', `${tip}:tests/fixtures/real-corpus-manifest.json`]));
    assert.equal(after.length, 32, 'the throwaway manifest is the 32 committed scripts');
    assert.notDeepEqual(after.map((r: { file: string }) => r.file), manifestBefore.map((r) => r.file));
    // The re-lock wrote the SAME array it was given, row for row.
    const written = JSON.parse(readFileSync(path.join(outDir, 'fixture.manifest-rows.json'), 'utf8'));
    assert.deepEqual(written.map((r: { index: number }) => r.index), after.map((_: unknown, i: number) => i));
  });

  it('locks the AUC-24 table on the accepted tip and stages it', () => {
    assert.match(run.stdout, /locked\s+: tests\/fixtures\/auc24-table\.json \(measured [0-9.]+\), staged/);
    assert.match(run.stdout, /the FIRST AUC-24 this segmentation has ever produced/);
    const staged = git(clone, ['-C', path.join(outDir, 'trees/fixture'), 'diff', '--cached', '--name-only']);
    assert.ok(staged.includes('tests/fixtures/auc24-table.json'), `staged: ${staged}`);
  });

  it('--dry-run exits 0, prints every edit as a diff, and writes NOTHING', () => {
    assert.equal(dryRun.status, 0, `exit ${dryRun.status}\n${dryRun.stdout.slice(-4000)}\n${dryRun.stderr.slice(-2000)}`);
    assert.match(dryRun.stdout, /@@ one \(heading\)/);
    assert.match(dryRun.stdout, /@@ field \*\*Runner attestation\*\*/);
    assert.match(dryRun.stdout, /^\s+\+ /m);
    assert.match(dryRun.stdout, /^\s+- /m);
    assert.match(dryRun.stdout, /the receipt was restored; nothing was written or committed/);
    assert.match(dryRun.stdout, /the manifest was NOT written/);
    assert.match(dryRun.stdout, /lock-auc24 not run/);
    assert.match(dryRun.stdout, /nothing was written, nothing was committed, no ref moved/);
  });

  it('--dry-run left the branch, the receipt and the table exactly as they were', () => {
    // Asserted against the state the REAL run then started from: the tip the
    // fixture branch had before either run.
    assert.match(dryRun.stdout, /1 PENDING entry converted by the three-scan recipe/);
    assert.ok(!existsSync(path.join(clone, 'tests/fixtures/auc24-table.json')), 'the dry run wrote the table');
  });

  it('prints what to commit and push next, and the voice-bound caveat where it applies', () => {
    assert.match(run.stdout, /WHAT YOU COMMIT AND PUSH NEXT/);
    assert.match(run.stdout, /git push origin scoring\/fixture-e2e/);
    assert.match(run.stdout, /1,500,000 voice-eligible-weight bound/);
    assert.match(run.stdout, /675,000/);
  });

  it('does not push without --push', () => {
    assert.match(run.stdout, /push\s+: skipped \(--push is off by default/);
    assert.equal(
      git(clone, ['rev-parse', `refs/remotes/origin/${FIXTURE_BRANCH}`]), fixtureTip,
      'the remote tip must be untouched when --push was not given',
    );
  });

  it('writes every local artifact OUTSIDE the repository, and says they index the corpus', () => {
    assert.match(run.stdout, /must not be pasted anywhere|never paste them anywhere/);
    const files = readdirSync(outDir);
    for (const expected of ['baseline.measure-real.log', 'fixture.measure-real.log', 'lock-auc24.log', 'verify-corpus-layout.log', 'fixture.probe-branch.csv']) {
      assert.ok(files.includes(expected), `the run wrote no ${expected} (got ${files.join(', ')})`);
    }
    const tracked = sh('git', ['-C', clone, 'status', '--porcelain=v1', '--untracked-files=all']).stdout;
    assert.ok(!tracked.includes('.measure-real.log'), 'a measurement log landed inside the repository');
  });

  it('never prints a corpus script name to stdout', () => {
    const names = readdirSync(path.join(REPO, 'data/screenplays'))
      .filter((f) => f.endsWith('.fountain')).map((f) => f.replace('.fountain', ''));
    const offenders = names.filter((n) => run.stdout.includes(n));
    assert.deepEqual(offenders, [], `stdout named ${offenders.join(', ')}`);
  });
});

describe('a REJECTED step: nothing re-locked, the table locked on the baseline', () => {
  // The other half of the gate, driven end to end by answering the prompt with
  // "n" on stdin — no --accept-all, no flag that shortcuts the decision.
  let dir = '';
  let repo = '';
  let res: { status: number | null; stdout: string; stderr: string } = { status: null, stdout: '', stderr: '' };

  before(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'owner-measure-reject-'));
    repo = path.join(dir, 'clone');
    assert.equal(sh('git', ['clone', '--quiet', '--shared', REPO, repo]).status, 0);
    git(repo, ['remote', 'set-url', 'origin', repo]);
    git(repo, ['config', 'user.email', 'fixture@example.invalid']);
    git(repo, ['config', 'user.name', 'owner-measure fixture']);
    sh('ln', ['-s', path.join(REPO, 'node_modules'), path.join(repo, 'node_modules')]);
    writeFileSync(path.join(repo, FIXTURE_MARKER), 'throwaway\n', 'utf8');
    const base = git(repo, ['rev-parse', 'HEAD']);
    const build = path.join(dir, 'build');
    const branch = 'scoring/fixture-reject';
    git(repo, ['worktree', 'add', '--quiet', '-b', branch, build, base]);
    const doctor = path.join(build, 'server/nvm/analyze/doctor.ts');
    writeFileSync(doctor, readFileSync(doctor, 'utf8').replace('const SCARCITY_SCALE = 140;', 'const SCARCITY_SCALE = 161;'), 'utf8');
    const receipt = path.join(build, 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md');
    writeFileSync(receipt, readFileSync(receipt, 'utf8') + pendingEntry().replace(/FIXTURE E2E/g, 'FIXTURE REJECT'), 'utf8');
    git(repo, ['-C', build, 'add', '-A']);
    git(repo, ['-C', build, 'commit', '--quiet', '-m', 'fixture: a scoring change the owner will reject']);
    const tip = git(repo, ['rev-parse', branch]);
    git(repo, ['worktree', 'remove', '--force', build]);
    git(repo, ['push', '--quiet', 'origin', branch]);

    const notePath = 'docs/brain/Owner/Owner - Fixture Reject.md';
    writeFileSync(path.join(repo, notePath), [
      '| branch | tip | what |', '| --- | --- | --- |',
      `| \`${branch}\` | \`${tip.slice(0, 8)}\` | rejected in this fixture |`, '',
    ].join('\n'), 'utf8');
    writeFileSync(path.join(repo, 'reject-plan.json'), `${JSON.stringify({
      schemaVersion: 1, updated: '2026-09-13', note: notePath, remote: 'origin',
      baseline: { ref: git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']), reason: 'the baseline' },
      steps: [{
        id: 'reject-me', branch, tip, base, when: 'always', gate: 'accept-reject',
        reason: 'the step this fixture rejects at the prompt',
        receiptRanges: [`${base}..HEAD`], probe: null,
      }],
      lock: { command: 'npm run lock-auc24', artifact: 'tests/fixtures/auc24-table.json', reason: 'the table' },
    }, null, 2)}\n`, 'utf8');

    const env = { ...process.env };
    delete env.REAL_SCRIPT_CORPUS_DIR;
    res = sh(process.execPath, [
      '--experimental-strip-types', path.join(REPO, 'scripts/owner-measure.mjs'),
      '--corpus-fixture=public', `--plan-file=${path.join(repo, 'reject-plan.json')}`,
      `--repo-root=${repo}`, `--out-dir=${path.join(dir, 'out')}`, '--keep-trees',
    ], { cwd: repo, env, input: 'n\n' });
  });

  after(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  it('exits 0 and records the rejection', () => {
    assert.equal(res.status, 0, `${res.stdout.slice(-3000)}\n${res.stderr.slice(-2000)}`);
    assert.match(res.stdout, /accept reject-me \(AUC-24 [0-9.]+ vs baseline [0-9.]+\)\? \[y\/N\]/);
    assert.match(res.stdout, /decision        : rejected/);
  });

  it('does not re-lock the manifest', () => {
    assert.doesNotMatch(res.stdout, /manifest re-lock:/);
    assert.match(res.stdout, /not re-locked — the re-lock follows acceptance, and this step was rejected/);
  });

  it('still writes the receipt, because the measurement happened', () => {
    assert.match(res.stdout, /1 PENDING entry converted by the three-scan recipe/);
    assert.match(res.stdout, /gate CLI        : check-scoring-receipt .*— exit 0/);
  });

  it('locks the table on the BASELINE, and says why', () => {
    assert.match(res.stdout, /nothing was accepted, so this table is locked on the baseline/);
    assert.match(res.stdout, /the TABLE, not the branches/);
  });
});

describe('the refusals, each shown firing', () => {
  function runCli(args: string[], env: Record<string, string | undefined> = {}) {
    const merged = { ...process.env, ...env };
    if (env.REAL_SCRIPT_CORPUS_DIR === undefined) delete merged.REAL_SCRIPT_CORPUS_DIR;
    return sh(process.execPath, ['--experimental-strip-types', path.join(REPO, 'scripts/owner-measure.mjs'), ...args], {
      cwd: REPO, env: merged,
    });
  }

  it('refuses with no REAL_SCRIPT_CORPUS_DIR — exit 1, and NOTHING is written', () => {
    // Checked against the FILESYSTEM, not against the sentence. Round 1
    // created the output directory before the first check ran, so the claim
    // "Nothing was written" was false and this test — which only matched the
    // string — could not fail (review F7).
    const out = path.join(mkdtempSync(path.join(tmpdir(), 'owner-measure-refusal-')), 'out');
    assert.ok(!existsSync(out));
    const res = runCli([`--out-dir=${out}`, '--accept-all']);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /REAL_SCRIPT_CORPUS_DIR is not set — refusing to run/);
    assert.match(res.stderr, /Nothing was written/);
    assert.ok(!existsSync(out), `the refusal created ${out}`);
    rmSync(path.dirname(out), { recursive: true, force: true });
  });

  it('--corpus-fixture=public refuses without an explicit --repo-root', () => {
    const res = runCli(['--corpus-fixture=public', `--out-dir=${path.join(tmpdir(), 'owner-measure-fixture-refusal')}`]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /requires an explicit --repo-root/);
  });

  it('--corpus-fixture=public refuses to run against the repository it lives in', () => {
    const res = runCli(['--corpus-fixture=public', `--repo-root=${REPO}`, `--out-dir=${path.join(tmpdir(), 'owner-measure-fixture-refusal')}`]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /the repository this script lives in/);
  });

  it('--corpus-fixture=public refuses a checkout that is not marked as a throwaway', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'owner-measure-unmarked-'));
    try {
      assert.equal(sh('git', ['clone', '--quiet', '--shared', REPO, path.join(dir, 'clone')]).status, 0);
      assert.ok(!existsSync(path.join(dir, 'clone', FIXTURE_MARKER)));
      const res = runCli(['--corpus-fixture=public', `--repo-root=${path.join(dir, 'clone')}`, `--out-dir=${path.join(dir, 'out')}`]);
      assert.equal(res.status, 1);
      assert.match(res.stderr, /is not marked as a throwaway/);
      assert.match(res.stderr, new RegExp(FIXTURE_MARKER.replace('.', '\\.')));
      // and it passes once the marker exists (the guard is a guard, not a wall)
      writeFileSync(path.join(dir, 'clone', FIXTURE_MARKER), 'throwaway\n', 'utf8');
      const res2 = runCli(['--corpus-fixture=public', `--repo-root=${path.join(dir, 'clone')}`, `--out-dir=${path.join(dir, 'out')}`, '--plan']);
      assert.equal(res2.status, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses a corpus path that is not a directory', () => {
    const res = runCli(
      [`--out-dir=${path.join(tmpdir(), 'owner-measure-refusal')}`, '--accept-all'],
      { REAL_SCRIPT_CORPUS_DIR: path.join(tmpdir(), 'no-such-corpus-dir-owner-measure') },
    );
    assert.equal(res.status, 1);
    assert.match(res.stderr, /which is not a directory/);
  });

  it('rejects an unknown argument with the usage exit code', () => {
    const res = runCli(['--measure-everything']);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /unknown argument/);
  });

  it('--plan prints and exits without touching anything', () => {
    const res = runCli(['--plan']);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /OWNER MEASUREMENT PLAN/);
    assert.doesNotMatch(res.stdout, /PRE-FLIGHT/);
  });
});

describe('the SKIP trap, reproduced against the real measure-real', () => {
  // The owner note names this: `lock-auc24` refuses and exits 1, while
  // `measure-real` prints a SKIP banner and exits ZERO — so a mistyped
  // variable looks like success. Rather than assert that against a
  // hand-written banner, this reproduces the real one and then shows the
  // parser refusing it.
  let skipRun: { status: number | null; stdout: string } = { status: null, stdout: '' };
  before(() => {
    const env = { ...process.env };
    delete env.REAL_SCRIPT_CORPUS_DIR;
    skipRun = sh(process.execPath, ['--experimental-strip-types', 'scripts/measure-real-script-discrimination.ts'], { cwd: REPO, env });
  });

  it('measure-real really does exit 0 with a SKIP banner', () => {
    assert.equal(skipRun.status, 0, 'if this ever becomes non-zero the trap is gone and this test should say so');
    assert.match(skipRun.stdout, /\[SKIP\] REAL_SCRIPT_CORPUS_DIR not set/);
  });

  it('parseMeasureReal treats that exit-0 output as a FAILURE', () => {
    assert.throws(() => parseMeasureReal(skipRun.stdout, skipRun.status ?? 0), (err: unknown) => {
      assert.match((err as Error).message, /measured NOTHING/);
      return true;
    });
  });

  it('and it refuses output with no AUC at all, rather than reporting nothing', () => {
    assert.throws(() => parseMeasureReal('eligible scripts     : 24\n', 0), /no shuffle-drop AUC/);
  });

  it('reads the numbers out of a real measure-real report', () => {
    const parsed = parseMeasureReal([
      'eligible scripts     : 73 (*.fountain.txt, >= 50 lines)',
      'below floor (< 80)  : 2 / 73  — SEE MANIFEST NOTE',
      '  shuffle-drop',
      '    AUC                  : 0.731',
      '  act-swap   ',
      '    AUC                  : 0.812',
      'mismatches            : 0',
    ].join('\n'), 0);
    assert.equal(parsed.shuffleDropAuc, 0.731);
    assert.equal(parsed.actSwapAuc, 0.812);
    assert.equal(parsed.scripts, 73);
    assert.equal(parsed.mismatches, 0);
    assert.equal(parsed.belowFloor, 2);
  });
});

describe('the stale-tip stop', () => {
  // In its OWN clone, for the same reason the end-to-end suite uses one: the
  // pre-flight refuses a dirty working tree BEFORE it checks any tip, so
  // running this against the developer's own checkout would pass or fail
  // depending on whether they had an edit open.
  let dir = '';
  let repo = '';
  let res: { status: number | null; stdout: string; stderr: string } = { status: null, stdout: '', stderr: '' };

  before(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'owner-measure-stale-'));
    repo = path.join(dir, 'clone');
    assert.equal(sh('git', ['clone', '--quiet', '--shared', REPO, repo]).status, 0, 'clone failed');
    git(repo, ['remote', 'set-url', 'origin', repo]);
    git(repo, ['config', 'user.email', 'fixture@example.invalid']);
    git(repo, ['config', 'user.name', 'owner-measure fixture']);
    for (const rel of UNDER_TEST) copyFileSync(path.join(REPO, rel), path.join(repo, rel));

    const real = git(repo, ['rev-parse', 'HEAD']);
    // A tip nobody has: the real SHA with its last hex digit rolled.
    const wrong = `${real.slice(0, 39)}${real.endsWith('0') ? '1' : '0'}`;
    const branch = 'scoring/stale-fixture';
    git(repo, ['branch', branch, real]);
    git(repo, ['push', '--quiet', 'origin', branch]);

    const notePath = 'docs/brain/Owner/Owner - Stale Fixture.md';
    writeFileSync(path.join(repo, notePath), [
      '| branch | tip | what |', '| --- | --- | --- |',
      `| \`${branch}\` | \`${wrong.slice(0, 8)}\` | stale on purpose |`, '',
    ].join('\n'), 'utf8');
    writeFileSync(path.join(repo, 'stale-plan.json'), `${JSON.stringify({
      schemaVersion: 1, updated: '2026-09-13', note: notePath, remote: 'origin',
      baseline: { ref: git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']), reason: 'baseline' },
      steps: [{
        id: 'stale', branch, tip: wrong, base: real, when: 'always',
        gate: 'report', reason: 'a step whose recorded tip is wrong',
        receiptRanges: [`${real}..HEAD`], probe: null,
      }],
      lock: { command: 'npm run lock-auc24', artifact: 'tests/fixtures/auc24-table.json', reason: 'the table' },
    }, null, 2)}\n`, 'utf8');
    // Committed, because the pre-flight refuses a dirty tree first — and this
    // test is about the tip check, not that one.
    git(repo, ['add', '-A']);
    git(repo, ['commit', '--quiet', '-m', 'fixture: a plan whose recorded tip is stale']);

    const corpus = path.join(dir, 'corpus');
    mkdirSync(corpus, { recursive: true });
    res = sh(process.execPath, [
      '--experimental-strip-types', path.join(repo, 'scripts/owner-measure.mjs'),
      `--plan-file=${path.join(repo, 'stale-plan.json')}`, `--repo-root=${repo}`,
      `--out-dir=${path.join(dir, 'out')}`, '--accept-all',
    ], { cwd: repo, env: { ...process.env, REAL_SCRIPT_CORPUS_DIR: corpus } });
  });

  after(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  it('STOPS with the diff, exit 1, before measuring anything', () => {
    assert.equal(res.status, 1, res.stdout.slice(-2000));
    assert.match(res.stderr, /recorded branch tip\(s\) do not match origin/);
    assert.match(res.stderr, /THE RECORD IS THE AUTHORITY/);
    assert.match(res.stderr, /Nothing was measured and nothing was written/);
  });

  it('names both SHAs so the reader can see which way the drift went', () => {
    assert.match(res.stderr, /scoring\/stale-fixture: recorded [0-9a-f]{8}, origin has [0-9a-f]{8}/);
  });

  it('did not reach the measurement', () => {
    assert.doesNotMatch(res.stdout, /BASELINE —/);
  });
});

describe('the output directory can never be inside the repository', () => {
  it('refuses a path under the repo root', () => {
    assert.throws(
      () => resolveOutDir(REPO, { override: path.join(REPO, 'scripts/output'), date: '2026-09-13' }),
      /is inside the repository/,
    );
  });
  it('refuses the repo root itself', () => {
    assert.throws(() => resolveOutDir(REPO, { override: REPO, date: '2026-09-13' }), /is inside the repository/);
  });
  it('accepts an XDG state path, and a home fallback', () => {
    const xdg = resolveOutDir(REPO, { date: '2026-09-13', env: { XDG_STATE_HOME: '/var/state' }, home: '/home/o' });
    assert.equal(xdg, path.join('/var/state/storymachine/owner-measure/2026-09-13'));
    const home = resolveOutDir(REPO, { date: '2026-09-13', env: {}, home: '/home/o' });
    assert.equal(home, path.join('/home/o/.storymachine/owner-measure/2026-09-13'));
  });
});

describe('which recipe produced which number', () => {
  // Round 1 stamped `shuffle-drop/v2` — the id `lock-auc24` uses — onto the
  // number `measure-real` computes with its own pre-2026-09-12 split, in
  // stdout AND in a permanent receipt (review F1). The id is now DERIVED from
  // the source of the script that prints the number, so the label cannot be
  // wrong and cannot go stale.
  function treeWith(source: string): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'owner-measure-recipe-'));
    mkdirSync(path.join(dir, 'scripts'), { recursive: true });
    writeFileSync(path.join(dir, 'scripts/measure-real-script-discrimination.ts'), source, 'utf8');
    return dir;
  }

  it('reads the LEGACY split off the source, and it is not the locked recipe', () => {
    const dir = treeWith("function splitScenes(t) {\n  const parts = t.split(/^(?=INT\\.|EXT\\.)/mi);\n}\n");
    try {
      const r = detectMeasureRealRecipe(dir);
      assert.equal(r.id, MEASURE_REAL_LEGACY_ID);
      assert.equal(r.migrated, false);
      assert.notEqual(r.id, AUC24_DEGRADATION_ID);
      assert.match(r.evidence, /:2 still splits scenes/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('reads a MIGRATED script as the locked recipe, so the label fixes itself', () => {
    const dir = treeWith("import { shuffleDropDegrade } from './lib/auc.ts';\n");
    try {
      const r = detectMeasureRealRecipe(dir);
      assert.equal(r.id, AUC24_DEGRADATION_ID);
      assert.equal(r.migrated, true);
      assert.equal(recipeComparison(r, AUC24_DEGRADATION_ID).same, true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('says UNKNOWN rather than guessing when it recognises neither', () => {
    const dir = treeWith('// a rewritten script that does neither\n');
    try {
      const r = detectMeasureRealRecipe(dir);
      assert.equal(r.id, 'shuffle-drop/unknown');
      assert.match(r.evidence, /recipe unknown/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('THE INVARIANT: the two labels are never equal while the two recipes differ', () => {
    // Read against the REAL repository. While
    // measure-real-script-discrimination.ts carries its own split, the label
    // this command prints and writes MUST NOT be AUC24_DEGRADATION_ID. The day
    // someone migrates that script, `migrated` flips and the two ids agree —
    // and this assertion keeps holding, from the other side.
    const real = detectMeasureRealRecipe(REPO);
    const src = readFileSync(path.join(REPO, 'scripts/measure-real-script-discrimination.ts'), 'utf8');
    const carriesLegacySplit = /\.split\(\/\^\(\?=INT\\\.\|EXT\\\.\)\/mi\)/.test(src);
    if (carriesLegacySplit) {
      assert.notEqual(real.id, AUC24_DEGRADATION_ID, 'a legacy-recipe number must never be labelled with the locked recipe id');
      assert.equal(real.migrated, false);
      assert.equal(recipeComparison(real, AUC24_DEGRADATION_ID).same, false);
    } else {
      assert.equal(real.id, AUC24_DEGRADATION_ID);
      assert.equal(recipeComparison(real, AUC24_DEGRADATION_ID).same, true);
    }
  });

  it('the printed comparison says, in words, that the two are not comparable', () => {
    const different = recipeComparison({ id: MEASURE_REAL_LEGACY_ID, migrated: false, evidence: 'x' }, AUC24_DEGRADATION_ID);
    assert.equal(different.same, false);
    assert.ok(different.lines.some((l: string) => /NOT COMPARABLE/.test(l)));
    assert.ok(different.lines.some((l: string) => /0\.731 of 2026-07-11/.test(l)));
    const same = recipeComparison({ id: AUC24_DEGRADATION_ID, migrated: true, evidence: 'y' }, AUC24_DEGRADATION_ID);
    assert.ok(same.lines.some((l: string) => /the same statistic/.test(l)));
  });
});

describe('classifyLayout forgives two NAMED checks, not a phrase', () => {
  const split = { ok: false, label: 'split manifest is migrated schema (id + contentHash present)' };
  const manifest = { ok: false, label: 'real-corpus-manifest is migrated schema (id + contentHash present)' };
  const other = { ok: false, label: 'content hash matches for every present file (60/72)' };

  it('a clean run is ok and not pre-migration', () => {
    const v = classifyLayout(0, [{ ok: true, label: 'corpus dir set and readable' }]);
    assert.deepEqual([v.ok, v.preMigration], [true, false]);
  });
  it('the two known pre-migration failures are forgiven, and named', () => {
    const v = classifyLayout(1, [{ ok: true, label: 'corpus dir set and readable' }, split, manifest]);
    assert.deepEqual([v.ok, v.preMigration], [true, true]);
  });
  it('any OTHER failing check stops the run — including one about the corpus', () => {
    // Round 1 matched /migrated schema/i, which forgives whatever the next
    // check with that phrase is called (review F8).
    const v = classifyLayout(1, [split, other]);
    assert.equal(v.ok, false);
    assert.ok(v.failing.some((c: { label: string }) => c.label === other.label));
  });
  it('a check whose label merely CONTAINS the phrase is not forgiven', () => {
    const lookalike = { ok: false, label: 'partition counts are migrated schema counts' };
    assert.equal(classifyLayout(1, [lookalike]).ok, false);
  });
});

describe('the branch ref moves only by compare-and-swap', () => {
  it('moves the ref when the old value is what the run measured, and REFUSES when it is not', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'owner-measure-swap-'));
    try {
      assert.equal(sh('git', ['init', '--quiet', dir]).status, 0);
      git(dir, ['config', 'user.email', 'f@example.invalid']);
      git(dir, ['config', 'user.name', 'fixture']);
      writeFileSync(path.join(dir, 'a.txt'), 'one\n', 'utf8');
      git(dir, ['add', '-A']);
      git(dir, ['commit', '--quiet', '-m', 'one']);
      const first = git(dir, ['rev-parse', 'HEAD']);
      writeFileSync(path.join(dir, 'a.txt'), 'two\n', 'utf8');
      git(dir, ['commit', '--quiet', '-am', 'two']);
      const second = git(dir, ['rev-parse', 'HEAD']);
      git(dir, ['branch', 'scoring/swap', first]);
      const ctx = { repoRoot: dir, corpusDir: null };

      // The old value is wrong: REFUSED, and the ref does not move.
      assert.throws(() => moveBranchRef(ctx, 'scoring/swap', second, second), (err: unknown) => {
        assert.match((err as Error).message, /was NOT moved: its old value is no longer/);
        return true;
      });
      assert.equal(git(dir, ['rev-parse', 'scoring/swap']), first, 'the ref moved despite the refusal');

      // The old value is right: it moves.
      assert.equal(moveBranchRef(ctx, 'scoring/swap', second, first), second);
      assert.equal(git(dir, ['rev-parse', 'scoring/swap']), second);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('redaction', () => {
  it('replaces the corpus directory wherever it appears', () => {
    const line = 'mismatch: /corpora/real/Some Title.fountain.txt — health 74';
    assert.equal(redact(line, '/corpora/real'), 'mismatch: <corpus>/Some Title.fountain.txt — health 74');
  });
  it('leaves a line alone when there is no corpus dir to redact', () => {
    assert.equal(redact('AUC 0.731', null), 'AUC 0.731');
  });
});
