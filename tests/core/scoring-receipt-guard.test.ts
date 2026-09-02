// The measurement-receipt guard must actually guard.
//
// WHY THIS EXISTS: scripts/check-scoring-receipt.mjs is CI's only mechanical
// enforcement of CLAUDE.md's "a scoring change ships with a local measurement
// receipt" rule. An audit found it enforcing nothing in two different ways,
// both reproduced against the real script before this file was written:
//
//   1. EMPTY RANGE ON EVERY PUSH-TO-MAIN RUN. The CI branch of
//      resolveDefaultRange() returned `origin/main...HEAD`. On a push-to-main
//      workflow run those refs are the SAME commit, so the three-dot range
//      diffs nothing: `CI=1 node scripts/check-scoring-receipt.mjs` printed
//      "no scoring-path files changed. OK." and exited 0 no matter what the
//      push contained. ~182 main-push runs were gated by nothing — and
//      push-to-main is precisely how the 2026-08-08 fabricated receipt
//      entered the tree (via an integration merge of a side branch).
//
//   2. "CONTENT-BEARING UPDATE" WAS `insertions > 0`. Any added line in
//      MEASUREMENT_RECEIPTS.md satisfied the guard. The known-fabricated
//      2026-08-08 entry — nonexistent SHA, Command field reading "(simulated
//      local execution due to copyright restrictions)", no Runner attestation
//      — satisfied it comfortably.
//
// The tests below pin both fixes to observable behavior rather than to the
// current implementation's shape: the push tests drive the real script as a
// subprocess over a purpose-built throwaway repository, and the entry tests
// run the real validator over the real ledger's real entries.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  extractEntries,
  validateEntry,
} from '../../scripts/check-scoring-receipt.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const guardScript = path.join(repoRoot, 'scripts/check-scoring-receipt.mjs');
const receiptPath = path.join(repoRoot, 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md');

// ---------------------------------------------------------------------------
// Part 1 — entry validation, against the real ledger
// ---------------------------------------------------------------------------

const ledgerEntries = extractEntries(fs.readFileSync(receiptPath, 'utf8').split('\n'));

function entryByHeadingSubstring(needle: string) {
  const found = ledgerEntries.filter((e: { heading: string }) => e.heading.includes(needle));
  assert.equal(
    found.length,
    1,
    `expected exactly one MEASUREMENT_RECEIPTS.md entry whose heading contains "${needle}", found ${found.length}. `
    + 'These are fixtures for the receipt validator; if an entry was renamed, update this test rather than dropping the fixture.',
  );
  return found[0];
}

describe('measurement-receipt entry validation', () => {
  it('REJECTS the known-fabricated 2026-08-08 "fastWordCount" entry', () => {
    // This is the real entry, still in the ledger (the ledger supersedes rather
    // than edits — see its 2026-08-14 CORRECTION). It is the canonical example
    // of what the old insertions>0 check waved through.
    const entry = entryByHeadingSubstring('2026-08-08 Receipt:');
    const problems: string[] = validateEntry(entry);

    assert.ok(problems.length > 0, 'the fabricated 2026-08-08 entry must not validate');

    const joined = problems.join('\n');
    assert.match(
      joined,
      /79ffa917b8333e217e271042c0c6aade1b3d9b32/,
      'must flag the cited git SHA, which does not exist in this repository',
    );
    assert.match(
      joined,
      /simulated/i,
      'must flag the Command field that self-admits the run was simulated',
    );
    assert.match(
      joined,
      /Runner attestation/i,
      'must flag the missing Runner attestation field required by §3\'s template',
    );
  });

  for (const needle of [
    '2026-08-21 — LANE W1/W2 PERFORMANCE',
    '2026-08-21 — LANE E1 LIVE PROGRESS',
  ]) {
    it(`ACCEPTS the honest output-identity entry: ${needle}`, () => {
      // These two entries record "no AUC measurement, because no score moved,
      // and here is the stronger identity proof instead". That is an honest
      // receipt and must keep passing — a validator that only accepts entries
      // reporting an AUC number would push authors toward inventing one.
      const entry = entryByHeadingSubstring(needle);
      const problems: string[] = validateEntry(entry);
      assert.deepEqual(
        problems,
        [],
        `entry "${needle}" must validate cleanly; got:\n${problems.join('\n')}`,
      );
    });
  }

  it('accepts an honest entry and rejects each fabrication tell independently', () => {
    const good = [
      '',
      '- **Date:** 2026-08-24',
      '- **Git SHA:** `HEAD`',
      '- **Command:** `REAL_SCRIPT_CORPUS_DIR=/corpus npm run measure-real`',
      '- **Measured AUC-24:** 0.731',
      '- **Corpus fingerprint:** 71-script manifest',
      '- **Runner attestation:** "maintainer measured this locally on 2026-08-24."',
    ];
    const heading = '### 2026-08-24 — synthetic fixture';
    const alwaysExists = () => true;

    assert.deepEqual(
      validateEntry({ heading, lines: good }, { objectExists: alwaysExists }),
      [],
      'the well-formed control entry must validate',
    );

    const cases: Array<[string, string[], RegExp]> = [
      [
        'simulation language in Command',
        good.map((l) => (l.startsWith('- **Command:**') ? `${l} (simulated local execution)` : l)),
        /simulated/i,
      ],
      [
        'a projected number instead of a measured one',
        [...good, '- **Note:** without the fix the AUC would be 0.55.'],
        /projected, not measured/i,
      ],
      [
        'a missing Runner attestation',
        good.filter((l) => !l.startsWith('- **Runner attestation:**')),
        /Runner attestation/,
      ],
      [
        'a missing Corpus fingerprint',
        good.filter((l) => !l.startsWith('- **Corpus fingerprint:**')),
        /Corpus fingerprint/,
      ],
      [
        'no commit anchor at all',
        good.filter((l) => !l.startsWith('- **Git SHA:**')),
        /Git SHA \(or Baseline used\)/,
      ],
    ];

    for (const [label, lines, expected] of cases) {
      const problems: string[] = validateEntry({ heading, lines }, { objectExists: alwaysExists });
      assert.ok(problems.length > 0, `expected "${label}" to be rejected`);
      assert.match(problems.join('\n'), expected, `wrong rejection reason for "${label}"`);
    }
  });

  it('rejects a nonexistent SHA but honors an explicit "does not exist" disclaimer', () => {
    const heading = '### 2026-08-24 — synthetic fixture';
    const base = [
      '- **Command:** `npm run measure-real`',
      '- **Corpus fingerprint:** 71-script manifest',
      '- **Runner attestation:** "maintainer measured this locally."',
    ];
    const missing = () => false;

    const cited = validateEntry(
      { heading, lines: [...base, '- **Git SHA:** `1234567abcdef`'] },
      { objectExists: missing },
    ) as string[];
    assert.match(cited.join('\n'), /does not exist in this repository/);

    // A correction entry documents a bad SHA on purpose. The 2026-08-14
    // CORRECTION in the real ledger does exactly this; failing it would mean
    // the validator punishes the honesty work.
    const disclaimed = validateEntry(
      {
        heading,
        lines: [
          ...base,
          '- **Git SHA:** `1234567abcdef`',
          '  does not exist in this repository — that is the point of this correction.',
        ],
      },
      { objectExists: missing },
    ) as string[];
    assert.deepEqual(disclaimed, [], `disclaimed SHA must not fail; got:\n${disclaimed.join('\n')}`);
  });
});

// ---------------------------------------------------------------------------
// Part 2 — the push-event range, driven through the real script
// ---------------------------------------------------------------------------

const RECEIPT_REL = 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md';
const DOCTOR_REL = 'server/nvm/analyze/doctor.ts';

function run(cmd: string, args: string[], cwd: string) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed in ${cwd}:\n${r.stdout}\n${r.stderr}`);
  }
  return r.stdout.trim();
}

function writeFile(root: string, rel: string, contents: string) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contents);
}

const validEntry = (sha: string) => [
  '',
  '### 2026-08-24 — fixture measurement',
  '',
  '- **Date:** 2026-08-24',
  `- **Git SHA:** \`${sha}\``,
  '- **Command:** `REAL_SCRIPT_CORPUS_DIR=/corpus npm run measure-real`',
  '- **Measured AUC-24:** 0.731',
  '- **Corpus fingerprint:** 71-script manifest',
  '- **Runner attestation:** "maintainer measured this locally on 2026-08-24."',
  '',
].join('\n');

/**
 * A throwaway repository shaped exactly like a push-to-main CI checkout:
 * `origin/main` and `HEAD` point at the SAME commit (which is what made the
 * old three-dot range diff nothing), and the pushed range is A..B.
 */
function makePushRepo(secondCommit: {
  doctorBody: string;
  receiptAppend?: (baseSha: string) => string;
}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-guard-'));
  run('git', ['init', '--quiet', '--initial-branch=main'], dir);
  run('git', ['config', 'user.email', 'test@example.com'], dir);
  run('git', ['config', 'user.name', 'Receipt Guard Test'], dir);
  run('git', ['config', 'commit.gpgsign', 'false'], dir);

  writeFile(dir, DOCTOR_REL, 'export const health = 1;\n');
  writeFile(dir, RECEIPT_REL, '# Measurement Receipts Ledger\n');
  run('git', ['add', '-A'], dir);
  run('git', ['commit', '--quiet', '-m', 'base'], dir);
  const before = run('git', ['rev-parse', 'HEAD'], dir);

  writeFile(dir, DOCTOR_REL, secondCommit.doctorBody);
  if (secondCommit.receiptAppend) {
    fs.appendFileSync(path.join(dir, RECEIPT_REL), secondCommit.receiptAppend(before));
  }
  run('git', ['add', '-A'], dir);
  run('git', ['commit', '--quiet', '-m', 'scoring change'], dir);
  const after = run('git', ['rev-parse', 'HEAD'], dir);

  // The push-to-main shape: origin/main already points at the new tip.
  run('git', ['update-ref', 'refs/remotes/origin/main', after], dir);

  return { dir, before, after };
}

/**
 * A repository with NOTHING to diff against: one commit (so no HEAD~1), on a
 * branch that is not `main`, with no `origin/main` remote-tracking ref. Every
 * candidate base in resolveDefaultRange() misses, so `range` is null — the
 * shape a shallow or misconfigured CI checkout produces.
 */
function makeOrphanRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-guard-orphan-'));
  run('git', ['init', '--quiet', '--initial-branch=detached-work'], dir);
  run('git', ['config', 'user.email', 'test@example.com'], dir);
  run('git', ['config', 'user.name', 'Receipt Guard Test'], dir);
  run('git', ['config', 'commit.gpgsign', 'false'], dir);
  writeFile(dir, DOCTOR_REL, 'export const health = 1;\n');
  writeFile(dir, RECEIPT_REL, '# Measurement Receipts Ledger\n');
  run('git', ['add', '-A'], dir);
  run('git', ['commit', '--quiet', '-m', 'only commit'], dir);
  return dir;
}

function runGuard(dir: string, env: Record<string, string>) {
  return spawnSync(process.execPath, [guardScript], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, CI: '1', ...env },
  });
}

describe('measurement-receipt guard — push-event range', () => {
  it('CATCHES an unreceipted scoring change pushed to main (the ~182-run blind spot)', () => {
    const { dir, before, after } = makePushRepo({ doctorBody: 'export const health = 2;\n' });
    try {
      // Proof the old shape was blind: with origin/main === HEAD, the
      // three-dot range this script used to hardcode is empty.
      const threeDot = spawnSync('git', ['diff', '--name-only', 'origin/main...HEAD'], {
        cwd: dir,
        encoding: 'utf8',
      });
      assert.equal(threeDot.stdout.trim(), '', 'precondition: origin/main...HEAD must be empty here');

      const r = runGuard(dir, {
        GITHUB_EVENT_NAME: 'push',
        PUSH_BEFORE_SHA: before,
        GITHUB_SHA: after,
      });
      assert.equal(
        r.status,
        1,
        `guard must fail on an unreceipted scoring change in the pushed range.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
      assert.match(r.stdout, new RegExp(`${before.slice(0, 7)}`), 'the pushed range must be the range used');
      assert.match(r.stdout, /doctor\.ts/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads the pushed range from $GITHUB_EVENT_PATH when PUSH_BEFORE_SHA is not wired', () => {
    // Defense in depth: forgetting the env var in a workflow must not silently
    // restore the empty-range hole.
    const { dir, before, after } = makePushRepo({ doctorBody: 'export const health = 3;\n' });
    const eventPath = path.join(dir, 'event.json');
    fs.writeFileSync(eventPath, JSON.stringify({ before, after }));
    try {
      const r = runGuard(dir, {
        GITHUB_EVENT_NAME: 'push',
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_SHA: after,
        PUSH_BEFORE_SHA: '',
      });
      assert.equal(r.status, 1, `guard must fail via the event payload.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('PASSES the same push when a valid receipt entry rides along (no false positive)', () => {
    const { dir, before, after } = makePushRepo({
      doctorBody: 'export const health = 4;\n',
      receiptAppend: validEntry,
    });
    try {
      const r = runGuard(dir, {
        GITHUB_EVENT_NAME: 'push',
        PUSH_BEFORE_SHA: before,
        GITHUB_SHA: after,
      });
      assert.equal(r.status, 0, `guard must pass a receipted change.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stdout, /well-formed new entry/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('FAILS the same push when the receipt entry is fabrication-shaped', () => {
    const { dir, before, after } = makePushRepo({
      doctorBody: 'export const health = 5;\n',
      // Shaped exactly like the real 2026-08-08 fabrication.
      receiptAppend: () => [
        '',
        '### 2026-08-24 — fixture measurement',
        '',
        '- **Command:** `npm run measure-real` (simulated local execution due to copyright restrictions)',
        '- **Git SHA:** `79ffa917b8333e217e271042c0c6aade1b3d9b32`',
        '- **Corpus fingerprint:** 24-script subset',
        '- **Attestation:** I ran the local measurements and confirm the metrics match.',
        '',
      ].join('\n'),
    });
    try {
      const r = runGuard(dir, {
        GITHUB_EVENT_NAME: 'push',
        PUSH_BEFORE_SHA: before,
        GITHUB_SHA: after,
      });
      assert.equal(
        r.status,
        1,
        `guard must reject a fabrication-shaped receipt.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
      assert.match(r.stderr, /simulated/i);
      assert.match(r.stderr, /Runner attestation/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('FAILS when the receipt gains lines but no new dated entry', () => {
    const { dir, before, after } = makePushRepo({
      doctorBody: 'export const health = 6;\n',
      receiptAppend: () => '\nA sentence appended to the ledger with no entry heading.\n',
    });
    try {
      const r = runGuard(dir, {
        GITHUB_EVENT_NAME: 'push',
        PUSH_BEFORE_SHA: before,
        GITHUB_SHA: after,
      });
      assert.equal(r.status, 1, `insertions>0 must no longer be enough.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stderr, /gained no new entry/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falls back to origin/main...HEAD on the all-zeros first-push sentinel', () => {
    const { dir, after } = makePushRepo({ doctorBody: 'export const health = 7;\n' });
    try {
      const r = runGuard(dir, {
        GITHUB_EVENT_NAME: 'push',
        PUSH_BEFORE_SHA: '0'.repeat(40),
        GITHUB_SHA: after,
      });
      // origin/main === HEAD here, so the fallback range is legitimately empty;
      // what matters is that the sentinel does not crash or produce a bogus
      // `0000000..sha` range.
      assert.equal(r.status, 0, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stdout, /origin\/main\.\.\.HEAD/);
      assert.doesNotMatch(r.stdout, /0000000/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // 2026-09-02: the guard used to print "This is not a pass; it is an absent
  // check" and then exit 0 — including under CI. A shallow or misconfigured
  // checkout therefore rendered as a green build, which is the exact shape of
  // the ~182-run blind spot above, one layer down. Under CI it now fails;
  // locally it stays lenient, because a developer in a base-ref-less repo is
  // not shipping anything and failing there only teaches people to route
  // around the guard.
  it('FAILS under CI when there is no base ref at all (an absent check must not be green)', () => {
    const dir = makeOrphanRepo();
    try {
      const r = spawnSync(process.execPath, [guardScript], {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, CI: '1', GITHUB_EVENT_NAME: 'push' },
      });
      assert.equal(r.status, 1, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stderr, /NO BASE REF/);
      assert.match(r.stderr, /FAILING because CI is set/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stays lenient (exit 0) with no base ref when CI is not set', () => {
    const dir = makeOrphanRepo();
    try {
      const env = { ...process.env };
      delete env.CI;
      delete env.GITHUB_EVENT_NAME;
      delete env.GITHUB_ACTIONS;
      const r = spawnSync(process.execPath, [guardScript], { cwd: dir, encoding: 'utf8', env });
      assert.equal(r.status, 0, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stdout, /NO BASE REF/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('still uses the three-dot branch range on pull_request events', () => {
    const { dir, before, after } = makePushRepo({ doctorBody: 'export const health = 8;\n' });
    try {
      // Move origin/main back so the PR shape is meaningful: HEAD is ahead.
      run('git', ['update-ref', 'refs/remotes/origin/main', before], dir);
      const r = runGuard(dir, { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: after });
      assert.equal(r.status, 1, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stdout, /origin\/main\.\.\.HEAD/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
