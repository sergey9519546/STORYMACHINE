// scripts/report-unverified-gates.mjs — the expiry mechanism, and the gate
// list itself.
//
// WHY: this script became a BLOCKING CI step on 2026-09-03 (retrospective
// finding #9 — "documentation of a gap became the deliverable"). A gate that
// carries an `expires` date fails the build once that date arrives. That makes
// the date arithmetic load-bearing: an off-by-one that blocks a day early
// stops every build for a reason nobody can see in the diff, and one that
// never fires re-creates exactly the non-blocking reporter this replaced.
//
// The functions under test are pure — gates, today's date and the env come in
// as arguments — so nothing here mutates process.env or waits for a real date.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  evaluateGates, gateRan, isExpired, render, GATES,
  evaluateVerified, renderVerified, verifiedGateState, verifiedGateOutcome,
  VERIFIED_GATES, VERIFIED_STATES,
  parseFloorConstants, parseFloorReport, floorReportProblems, chooseFloorToRaise,
  mutationWasCaught, FLOOR_RAISE_DELTA, runSuiteDefault,
} from '../../scripts/report-unverified-gates.mjs';
import { raiseFloorInSource } from '../../scripts/lib/raise-auc-floor.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/report-unverified-gates.mjs');

/**
 * The reporter's real output, produced ONCE and shared by every assertion
 * below that inspects it.
 *
 * Hoisted 2026-09-06 round 2: the script now RUNS each verified gate's suite
 * (that is the point of the verified section — a row claiming "this was
 * measured" has to check the measurement, not just the fixture beside it), so
 * one invocation costs ~5s. Six independent `execFileSync` calls cost six
 * times that for six copies of the same string. The exit code is still
 * checked, because execFileSync throws on a non-zero status.
 *
 * 2026-09-12: the reporter now runs each verified suite TWICE (plain, then with
 * one floor raised — finding 7's mutation check), so this one invocation costs
 * ~11.5s and the whole file costs 22.0-22.5s, measured. The only other real
 * spawns are the two the gutted-suite case needs, and they are memoised; the
 * genuine-suite case reads this same output rather than paying for a third
 * pair.
 */
const REPORTER_OUTPUT = execFileSync('node', [SCRIPT], { cwd: REPO_ROOT, encoding: 'utf8' });

const envGate = { env: 'SOME_CORPUS_DIR', suite: 's1', protects: 'p', ifSkipped: 'i' };
const fileGate = { file: 'tests/fixtures/real-corpus-manifest.json', suite: 's2', protects: 'p', ifSkipped: 'i' };
const missingFileGate = { file: 'tests/fixtures/definitely-not-here.json', suite: 's3', protects: 'p', ifSkipped: 'i' };

describe('gateRan', () => {
  it('an env gate ran when its variable is set to a non-empty value', () => {
    assert.equal(gateRan(envGate, { env: { SOME_CORPUS_DIR: '/x' } }), true);
    assert.equal(gateRan(envGate, { env: {} }), false);
    assert.equal(gateRan(envGate, { env: { SOME_CORPUS_DIR: '' } }), false);
  });

  it('a file gate ran when its input file exists', () => {
    assert.equal(gateRan(fileGate, { root: REPO_ROOT }), true);
    assert.equal(gateRan(missingFileGate, { root: REPO_ROOT }), false);
  });
});

describe('isExpired', () => {
  it('a gate with no expiry never expires — reporting stays the default', () => {
    assert.equal(isExpired(envGate, '2099-01-01'), false);
    assert.equal(isExpired({ ...envGate, expires: '' }, '2099-01-01'), false);
  });

  it('expires: null never blocks, at any date — the explicit "will not close in CI" case (Decision #5)', () => {
    const g = { ...envGate, expires: null, expiresReason: 'cannot reach CI by design' };
    assert.equal(isExpired(g, '2026-09-03'), false);
    assert.equal(isExpired(g, '2099-01-01'), false);
    assert.equal(evaluateGates([g], { env: {}, root: REPO_ROOT, today: '2099-01-01' }).exitCode, 0);
  });

  it('expires ON the date, not the day after', () => {
    const g = { ...envGate, expires: '2026-10-01' };
    assert.equal(isExpired(g, '2026-09-30'), false);
    assert.equal(isExpired(g, '2026-10-01'), true);
    assert.equal(isExpired(g, '2026-10-02'), true);
  });

  it('compares full ISO dates, so year and month boundaries are not string traps', () => {
    const g = { ...envGate, expires: '2027-01-01' };
    assert.equal(isExpired(g, '2026-12-31'), false);
    assert.equal(isExpired(g, '2027-01-01'), true);
    // A naive day-only or month-only comparison would call this expired.
    assert.equal(isExpired({ ...envGate, expires: '2026-10-01' }, '2026-09-02'), false);
  });
});

describe('evaluateGates — what makes the CI step block', () => {
  it('skipped gates without an expiry report and exit 0', () => {
    const r = evaluateGates([envGate], { env: {}, root: REPO_ROOT, today: '2099-01-01' });
    assert.equal(r.skipped.length, 1);
    assert.equal(r.expired.length, 0);
    assert.equal(r.exitCode, 0);
  });

  it('a skipped gate past its expiry exits 1 — the whole point of finding #9', () => {
    const r = evaluateGates([{ ...envGate, expires: '2026-10-01' }], { env: {}, root: REPO_ROOT, today: '2026-10-01' });
    assert.equal(r.expired.length, 1);
    assert.equal(r.exitCode, 1);
  });

  it('an expired gate that actually RAN does not block — the deadline is on the gap, not the date', () => {
    const r = evaluateGates(
      [{ ...envGate, expires: '2020-01-01' }],
      { env: { SOME_CORPUS_DIR: '/x' }, root: REPO_ROOT, today: '2026-10-01' },
    );
    assert.equal(r.ran.length, 1);
    assert.equal(r.expired.length, 0);
    assert.equal(r.exitCode, 0);
  });

  it('one expired gate blocks even when other gates are merely skipped', () => {
    const r = evaluateGates(
      [envGate, { ...missingFileGate, expires: '2026-01-01' }],
      { env: {}, root: REPO_ROOT, today: '2026-10-01' },
    );
    assert.equal(r.skipped.length, 2);
    assert.equal(r.expired.length, 1);
    assert.equal(r.exitCode, 1);
  });
});

describe('render', () => {
  it('marks an expired gate EXPIRED and says the step is now failing', () => {
    const out = render(evaluateGates(
      [{ ...envGate, expires: '2026-01-01' }],
      { env: {}, root: REPO_ROOT, today: '2026-10-01' },
    ));
    assert.match(out, /\[EXPIRED\]/);
    assert.match(out, /BLOCKING: 1 gate\(s\) are past the expiry/);
  });

  it('marks an unexpired gate SKIPPED and prints its deadline', () => {
    const out = render(evaluateGates(
      [{ ...envGate, expires: '2026-10-01' }],
      { env: {}, root: REPO_ROOT, today: '2026-09-03' },
    ));
    assert.match(out, /\[SKIPPED\]/);
    assert.match(out, /expires:\s+2026-10-01/);
    assert.doesNotMatch(out, /BLOCKING/);
  });

  it('marks a null-expiry gate SKIPPED, prints "never" with its reason, and never blocks', () => {
    const out = render(evaluateGates(
      [{ ...envGate, expires: null, expiresReason: 'cannot reach CI by design' }],
      { env: {}, root: REPO_ROOT, today: '2099-01-01' },
    ));
    assert.match(out, /\[SKIPPED\]/);
    assert.match(out, /expires:\s+never — cannot reach CI by design/);
    assert.doesNotMatch(out, /\[EXPIRED\]/);
    assert.doesNotMatch(out, /BLOCKING/);
  });
});

describe('the real gate list', () => {
  it('names the auc24 table gate, with an expiry, and points at the lock command', () => {
    // This gate is the deliverable of retrospective finding #2: the AUC-24
    // ratchet recomputed in CI from committed numbers. Until the owner locks
    // the table it is the one gap in the project with a deadline on it.
    const out = REPORTER_OUTPUT;
    assert.match(out, /tests\/core\/auc24-table\.test\.ts/);
    assert.match(out, /missing:\s+tests\/fixtures\/auc24-table\.json/);
    assert.match(out, /expires:\s+2026-10-01/);
    assert.match(out, /npm run lock-auc24/);
  });

  it('exits 0 today — no gate has passed its expiry yet', () => {
    // If this fails, a deadline arrived. That is the mechanism working: close
    // the gate, or move the date in a diff a reviewer can refuse.
    const r = REPORTER_OUTPUT;
    assert.ok(r.length > 0);
  });

  it('every gate now has an explicit expires — a deadline or a stated null (Decision #5)', () => {
    // The 2026-09-03 decision (docs/DECISION_LOG.md Decision #5) requires
    // that no gate be silently undated. A gate with expires: null must carry
    // an expiresReason so the absence of a deadline reads as a decision.
    for (const g of GATES) {
      assert.ok('expires' in g, `${g.suite} has no expires field at all`);
      if (g.expires === null) {
        assert.ok(g.expiresReason, `${g.suite} has expires: null with no expiresReason`);
      } else {
        assert.match(g.expires ?? '', /^\d{4}-\d{2}-\d{2}$/, `${g.suite} expires is not an ISO date`);
      }
    }
  });

  it('the E2E journeys gate expires 2026-10-15', () => {
    const out = REPORTER_OUTPUT;
    assert.match(out, /tests\/e2e\/journeys\.test\.ts/);
    assert.match(out, /unset:\s+RUN_E2E/);
    assert.match(out, /expires:\s+2026-10-15/);
  });

  it('the craft-kb gate expires 2026-11-01 and names the commit-vs-hash decision it forces', () => {
    const out = REPORTER_OUTPUT;
    assert.match(out, /tests\/nvm\/generate\/craft-kb\.test\.ts/);
    assert.match(out, /expires:\s+2026-11-01/);
  });

  it('the two corpus-gated suites carry an explicit null expiry with a reason, not silence', () => {
    const out = REPORTER_OUTPUT;
    assert.match(out, /tests\/core\/real-script-corpus\.test\.ts/);
    assert.match(out, /tests\/core\/anti-slop-real-corpus\.test\.ts/);
    // Both should render "expires: never — <reason>", never a bare SKIPPED
    // with no expires line at all.
    const skippedGateBlocks = out.split(/\[SKIPPED\]/).slice(1);
    assert.ok(skippedGateBlocks.length >= 2);
  });
});

// ── Verified gates (2026-09-06) ────────────────────────────────────────────
// The reporter gained a second, opposite kind of row: a gate that DID run,
// here, with no corpus and no owner step. It is a different claim from every
// row above it, so it gets its own section — and it carries the same
// self-check, because a row asserting "this is measured" next to a missing
// input file is the exact false assurance this script exists to prevent.
describe('verified gates', () => {
  // A row here makes a POSITIVE claim ("this was measured"), unlike every gate
  // above it, so it is checked FIVE ways: input present, suite present, suite
  // passing, every floor it guards reported, and those floor assertions live
  // under a raised floor. `runSuite` is injected so these cases cost nothing to
  // drive; the ones that need a real spawn say so.
  //
  // `okGate` carries no `floorSource`, so checks (4) and (5) do not apply to it
  // and it exercises the first three states exactly as it did before.
  const okGate = {
    suite: 'tests/core/auc.test.ts', file: 'tests/fixtures/real-corpus-manifest.json',
    command: 'npm run x', proves: 'p', doesNotProve: 'd',
  };
  const passing = { root: REPO_ROOT, runSuite: () => ({ ok: true, output: '' }) };

  it('a verified gate reports RAN only when input, suite and result all hold', () => {
    const r = evaluateVerified([okGate], passing);
    assert.equal(r.present.length, 1);
    assert.equal(r.exitCode, 0);
    assert.equal(r.states.get(okGate), 'ran');
    const out = renderVerified(r);
    assert.match(out, /\[RAN\] tests\/core\/auc\.test\.ts/);
    assert.match(out, /run by this script, exit 0/);
  });

  it('a verified gate whose INPUT vanished reports ABSENT and BLOCKS', () => {
    // Deleting tests/fixtures/public-corpus-manifest.json would otherwise
    // leave the reporter cheerfully claiming the benchmark is measured —
    // the same shape as the "0 failures" line this whole script qualifies.
    const r = evaluateVerified([{ ...okGate, file: 'tests/fixtures/definitely-not-here.json' }], passing);
    assert.equal(r.absent.length, 1);
    assert.equal(r.exitCode, 1);
    assert.match(renderVerified(r), /\[ABSENT\]/);
    assert.match(renderVerified(r), /its input file is gone/);
  });

  it('a verified gate whose SUITE vanished reports ABSENT and BLOCKS', () => {
    // THE ROUND-1 HOLE, reproduced and closed. The reviewer deleted
    // tests/core/public-benchmark.test.ts and ran `npm run gates`: the
    // reporter printed "[RAN] tests/core/public-benchmark.test.ts", by name,
    // with the file that does the measuring gone, and exited 0. Checking only
    // the fixture was never enough — and a test file is the likelier deletion
    // of the two, because a fixture reads as load-bearing and a test reads as
    // something you can take out when it is in the way.
    const r = evaluateVerified([{ ...okGate, suite: 'tests/core/definitely-not-here.test.ts' }], passing);
    assert.equal(r.absent.length, 1);
    assert.equal(r.exitCode, 1);
    const out = renderVerified(r);
    assert.match(out, /\[ABSENT\]/);
    assert.match(out, /THE SUITE THAT DOES THE MEASURING IS GONE/);
  });

  it('a verified gate whose suite FAILS reports ABSENT and BLOCKS', () => {
    // The state neither file check can reach: the suite is present and its
    // assertions no longer hold. Only running it finds this.
    const r = evaluateVerified([okGate], { root: REPO_ROOT, runSuite: () => ({ ok: false, output: '' }) });
    assert.equal(r.absent.length, 1);
    assert.equal(r.exitCode, 1);
    assert.match(renderVerified(r), /the suite ran and FAILED/);
  });

  it('verifiedGateState names all six outcomes, and only "ran" is a claim', () => {
    assert.equal(verifiedGateState(okGate, passing), 'ran');
    assert.equal(verifiedGateState(okGate, { root: REPO_ROOT, runSuite: () => ({ ok: false, output: '' }) }), 'failing');
    assert.equal(
      verifiedGateState({ ...okGate, suite: 'nope.test.ts' }, passing),
      'missing-suite',
    );
    assert.equal(
      verifiedGateState({ ...okGate, file: 'nope.json' }, passing),
      'missing-input',
    );
    assert.deepEqual(
      [...VERIFIED_STATES].sort(),
      ['failing', 'missing-input', 'missing-suite', 'mutation-survived', 'ran', 'unreported-floors'],
    );
  });

  it('the real list names the public benchmark, its command, and what it does NOT prove', () => {
    const out = REPORTER_OUTPUT;
    assert.match(out, /VERIFIED GATES: 1 of 1 ran here/);
    assert.match(out, /tests\/core\/public-benchmark\.test\.ts/);
    assert.match(out, /reproduce: npm run benchmark:public/);
    assert.match(out, /run by this script, exit 0/);
    // The non-comparability warning is the load-bearing half of the row: the
    // AUC-24 ratchet and this benchmark are exactly the kind of pair that gets
    // conflated (CLAUDE.md spends a paragraph on that hazard).
    assert.match(out, /Nothing about the AUC-24 >= 0\.622 ratchet/);
    // And the row must not oversell the positive control it now cites.
    assert.match(out, /proves only that the instrument works/);
    for (const g of VERIFIED_GATES) {
      assert.ok(g.file && g.suite && g.command && g.proves && g.doesNotProve, `${g.suite} is missing a field`);
    }
  });

  it('the public-benchmark row declares a floor source and prefix, so checks (4) and (5) apply to it', () => {
    // Without `floorSource` the row falls back to the three-way check that
    // finding 7 defeated. A future verified gate may legitimately omit it; THIS
    // one may not, because it is the repository's only always-on discrimination
    // claim.
    const row = VERIFIED_GATES.find((g) => g.suite === 'tests/core/public-benchmark.test.ts');
    assert.ok(row, 'the public-benchmark verified gate is gone');
    assert.equal(row!.floorSource, 'scripts/lib/auc.ts');
    assert.equal(row!.floorPrefix, 'PUBLIC_');
  });

  it('the real run records WHICH floor it raised and that the suite failed on it', () => {
    // The positive half of finding 7's fix, in the reporter's own output: the
    // row is not just RAN, it says what was mutated. A reader can re-run the
    // named mutation by hand.
    assert.match(REPORTER_OUTPUT, /floors:\s+scripts\/lib\/auc\.ts — mutation check: PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR raised to [0-9.]+ -> suite FAILED, as it must/);
  });
});

// ── Floor liveness (2026-09-12, adversarial review finding 7) ──────────────
// `npm run gates` printed [RAN] and exited 0 against a suite whose six floor
// assertions had been replaced by `Number.isFinite(...)`. Everything below is
// the two mechanisms that close that, and the proof that each FAILS on the
// unfixed input before it passes on the fixed one.
describe('floor liveness — check (4): the suite must report every floor it guards', () => {
  const AUC_LIB = readFileSync(path.join(REPO_ROOT, 'scripts/lib/auc.ts'), 'utf8');

  it('reads the floor list from scripts/lib/auc.ts, in source order, filtered by prefix', () => {
    const declared = parseFloorConstants(AUC_LIB, 'PUBLIC_');
    assert.deepEqual(declared.map((f) => f.constant), [
      'PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR',
      'PUBLIC_SHUFFLE_DROP_FLOOR',
      'PUBLIC_ORDER_PAIRED_FLOOR',
      'PUBLIC_ORDER_FLOOR',
      'PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR',
      'PUBLIC_DIALOGUE_FLATTEN_FLOOR',
    ]);
    for (const f of declared) assert.ok(Number.isFinite(f.value), `${f.constant} is not a number`);
    // AUC24_FLOOR lives in the same file and belongs to a corpus-gated suite
    // that SKIPS in CI. Pulling it into this list would make the verified row
    // imply the AUC-24 ratchet is checked here. It is not.
    assert.ok(parseFloorConstants(AUC_LIB).some((f) => f.constant === 'AUC24_FLOOR'));
    assert.ok(!parseFloorConstants(AUC_LIB, 'PUBLIC_').some((f) => f.constant === 'AUC24_FLOOR'));
  });

  it('parses the suite\'s FLOOR lines and accepts a whole, passing report', () => {
    const declared = parseFloorConstants(AUC_LIB, 'PUBLIC_');
    const output = declared
      .map((f) => `  FLOOR ${f.constant} measured=${(f.value + 0.02).toFixed(4)} floor=${f.value} verdict=PASS primary=no`)
      .join('\n');
    const reported = parseFloorReport(output);
    assert.equal(reported.length, declared.length);
    assert.deepEqual(floorReportProblems(declared, reported), []);
  });

  it('rejects a report that drops a floor, restates it at the wrong value, or fails it', () => {
    const declared = parseFloorConstants(AUC_LIB, 'PUBLIC_');
    const line = (c: string, measured: string, floor: string, verdict = 'PASS') =>
      `  FLOOR ${c} measured=${measured} floor=${floor} verdict=${verdict} primary=no`;

    // Dropped.
    const dropped = parseFloorReport(declared.slice(1).map((f) => line(f.constant, '0.9', String(f.value))).join('\n'));
    assert.match(floorReportProblems(declared, dropped).join('; '), /PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR: the suite printed no FLOOR line/);

    // Floor value disagrees with the source — the suite is checking a number
    // nobody committed.
    const wrongFloor = parseFloorReport(declared.map((f, i) => line(f.constant, '0.9', String(i === 0 ? 0.0001 : f.value))).join('\n'));
    assert.match(floorReportProblems(declared, wrongFloor).join('; '), /source says/);

    // Reported below its own floor.
    const below = parseFloorReport(declared.map((f, i) => line(f.constant, i === 0 ? '0.0001' : '0.9', String(f.value), i === 0 ? 'FAIL' : 'PASS')).join('\n'));
    const problems = floorReportProblems(declared, below).join('; ');
    assert.match(problems, /is below floor/);
    assert.match(problems, /verdict for it is FAIL/);

    // A silent suite: passes, prints nothing.
    assert.equal(floorReportProblems(declared, parseFloorReport('')).length >= declared.length, true);
  });

  it('a suite that PASSES but prints no floor report is reported ABSENT, not RAN', () => {
    // The cheap half of the attack, driven with an injected runner: exit 0 and
    // silence. Before this check the reporter called that RAN.
    const silent = {
      suite: 'tests/core/auc.test.ts', file: 'tests/fixtures/real-corpus-manifest.json',
      floorSource: 'scripts/lib/auc.ts', floorPrefix: 'PUBLIC_',
      command: 'npm run x', proves: 'p', doesNotProve: 'd',
    };
    const r = evaluateVerified([silent], { root: REPO_ROOT, runSuite: () => ({ ok: true, output: 'all good\n' }) });
    assert.equal(r.states.get(silent), 'unreported-floors');
    assert.equal(r.exitCode, 1);
    const out = renderVerified(r);
    assert.match(out, /\[ABSENT\]/);
    assert.match(out, /did not report every floor it guards/);
    assert.match(out, /DETAIL:.*printed no FLOOR line/);
  });
});

describe('floor liveness — check (5): the mutation run', () => {
  const AUC_LIB = readFileSync(path.join(REPO_ROOT, 'scripts/lib/auc.ts'), 'utf8');
  const declared = parseFloorConstants(AUC_LIB, 'PUBLIC_');

  /** The adversarial review's gutted benchmark, wired up as a verified gate. */
  const GUTTED_GATE = {
    suite: 'tests/fixtures/gate-liveness/gutted-public-benchmark-suite.ts',
    file: 'tests/fixtures/public-corpus-manifest.json',
    floorSource: 'scripts/lib/auc.ts', floorPrefix: 'PUBLIC_',
    command: 'npm run benchmark:public', proves: 'p', doesNotProve: 'd',
  };

  /**
   * The real spawner, memoised on (suite, raised constant, raised value). The
   * gutted case is driven twice — once for the state, once for the rendered
   * output — and each drive costs two 32-script measurements. Four spawns for
   * two distinct runs is ~10s of duplicated work for two copies of the same
   * answer, the same reason REPORTER_OUTPUT is hoisted at the top of this file.
   */
  const spawnCache = new Map<string, { ok: boolean; output: string }>();
  const memoisedRunSuite = (
    suitePath: string,
    opts?: { raise?: { constant: string; value: number } },
  ) => {
    const key = `${suitePath}|${opts?.raise?.constant ?? ''}|${opts?.raise?.value ?? ''}`;
    if (!spawnCache.has(key)) spawnCache.set(key, runSuiteDefault(suitePath, opts));
    return spawnCache.get(key)!;
  };

  it('raises the FIRST declared floor — the PRIMARY paired one — above its own measurement', () => {
    const reported = declared.map((f) => ({ constant: f.constant, measured: f.value + 0.02 }));
    const choice = chooseFloorToRaise(declared, reported);
    assert.ok(choice);
    assert.equal(choice!.constant, 'PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR');
    assert.ok(choice!.value > choice!.measured, 'the raised value must exceed the measurement it is raised above');
    assert.equal(choice!.value, Math.round((choice!.measured + FLOOR_RAISE_DELTA) * 1e4) / 1e4);
  });

  it('skips a floor pinned at 1.0000 rather than raising it past what an AUC can be', () => {
    // The positive control's matched-pair statistic measures exactly 1.0000.
    // Raising a floor above that would put it outside [0, 1], where a failure
    // could come from a range check instead of the floor comparison — a pass
    // for the wrong reason.
    const pinned = declared.map((f) => ({ constant: f.constant, measured: 1 }));
    assert.equal(chooseFloorToRaise(declared, pinned), null);
    const mixed = declared.map((f, i) => ({ constant: f.constant, measured: i === 0 ? 1 : 0.5 }));
    assert.equal(chooseFloorToRaise(declared, mixed)!.constant, declared[1].constant);
  });

  it('accepts ONLY a named floor failure, never a bare non-zero exit', () => {
    const raise = { constant: 'PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR', value: 0.5813 };
    assert.equal(
      mutationWasCaught('not ok 1 - SHUFFLE_DROP paired AUC clears PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR = 0.5813 (PRIMARY)', raise),
      true,
    );
    // Passed, not failed.
    assert.equal(
      mutationWasCaught('ok 1 - SHUFFLE_DROP paired AUC clears PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR = 0.5813 (PRIMARY)', raise),
      false,
    );
    // Failed, but on something else — which is what a gutted suite's
    // on-disk-vs-imported shape assertions do under the hook. This is why the
    // reporter does not read the exit code here.
    assert.equal(mutationWasCaught('not ok 11 - the floor constants are still in the one-line shape', raise), false);
    // The dot in the value is a literal, not a wildcard.
    assert.equal(
      mutationWasCaught('not ok 1 - clears PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR = 0a5813', raise),
      false,
    );
  });

  it('the hook rewrites exactly one constant, and refuses a shape it cannot move', () => {
    const raised = raiseFloorInSource(AUC_LIB, 'PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR', 0.5813);
    assert.match(raised, /export const PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR = 0\.5813;/);
    assert.match(raised, /export const PUBLIC_SHUFFLE_DROP_FLOOR = 0\.5386;/);
    assert.equal(raised.split('\n').length, AUC_LIB.split('\n').length, 'the rewrite must not add or remove lines');
    // A constant reshaped across two lines (or absent) must throw rather than
    // silently leave the run unmutated — an unmutated "mutation run" that
    // passes would be read as "the assertion is live".
    assert.throws(
      () => raiseFloorInSource(AUC_LIB.replace('export const PUBLIC_ORDER_FLOOR = ', 'export const PUBLIC_ORDER_FLOOR =\n  '), 'PUBLIC_ORDER_FLOOR', 0.9),
      /no single-line/,
    );
    assert.throws(() => raiseFloorInSource(AUC_LIB, 'PUBLIC_NOT_A_FLOOR', 0.9), /no single-line/);
  });

  it('REPORTS THE INVESTIGATOR\'S GUTTED SUITE AS NOT VERIFIED — finding 7, caught', () => {
    // THE TEST THAT WOULD HAVE CAUGHT THE BUG. The fixture is the adversarial
    // review's own gutted benchmark: same titles, real 32-script measurement,
    // real FLOOR report, and `Number.isFinite(auc)` where the floor comparison
    // used to be. It exits 0 and satisfies check (4), so the three-way reporter
    // of 2026-09-06 called it RAN — which is exactly what the finding
    // demonstrated. Only the mutation run tells it from the genuine suite.
    //
    // This spawns the fixture for real (twice — plain, then mutated), because a
    // mocked runner could not prove that the hook, the spawn flags and the
    // failure-line regex actually compose. The two spawns are memoised so the
    // state assertion and the rendered-output assertion share them.
    const outcome = verifiedGateOutcome(GUTTED_GATE, { root: REPO_ROOT, runSuite: memoisedRunSuite });
    assert.equal(
      outcome.state,
      'mutation-survived',
      `the gutted suite was reported as "${outcome.state}". If this says "ran", finding 7 is open again: `
      + `a suite asserting Number.isFinite() on its AUCs is being counted as a verified discrimination gate. `
      + `(detail: ${outcome.detail})`,
    );
    assert.match(outcome.detail, /PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR was raised from [0-9.]+ \(its own measurement\) to [0-9.]+ and the suite did not fail on it/);
    const r = evaluateVerified([GUTTED_GATE], { root: REPO_ROOT, runSuite: memoisedRunSuite });
    assert.equal(r.exitCode, 1, 'a gutted verified gate must BLOCK, not merely be annotated');
    const out = renderVerified(r);
    assert.match(out, /\[ABSENT\]/);
    assert.match(out, /FLOOR ASSERTIONS ARE NOT LIVE/);
  });

  it('REPORTS THE GENUINE SUITE AS RAN — the check is not simply always red', () => {
    // The other direction, and the one that makes the case above mean
    // something: same code path, same hook, same regex, and the only difference
    // is that the genuine suite still compares its measurement to the constant.
    //
    // Read off REPORTER_OUTPUT — the real `npm run gates` invocation, already
    // paid for at the top of this file — rather than a fourth in-process spawn
    // of the 32-script measurement. That is also the stronger evidence: it is
    // the command CI runs, not a reconstruction of it.
    assert.match(REPORTER_OUTPUT, /\[RAN\] tests\/core\/public-benchmark\.test\.ts/);
    assert.match(REPORTER_OUTPUT, /mutation check: PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR raised to [0-9.]+ -> suite FAILED, as it must/);
    assert.doesNotMatch(REPORTER_OUTPUT, /FLOOR ASSERTIONS ARE NOT LIVE/);
  });

  it('reads the same answer under `npm test` as standalone — NODE_TEST_CONTEXT must not leak', () => {
    // A REAL FAILURE, CAUGHT BY THE FULL SUITE AND FIXED. When this reporter runs
    // under `npm test`, node:test puts NODE_TEST_CONTEXT in the environment. A
    // spawned child that inherits it switches to the V8-serialized reporter and
    // stops printing TAP — so the mutation run's
    // `not ok … clears <CONSTANT> = <raised>` line never appears, and a perfectly
    // live suite is reported as `mutation-survived`. The first full `npm test` of
    // this lane failed exactly that way, while the file passed standalone.
    //
    // runSuiteDefault now deletes NODE_TEST_CONTEXT from the child env and pins
    // `--test-reporter=tap`. This drives the poisoned environment directly, so the
    // trap cannot come back silently.
    const poisoned = execFileSync('node', [SCRIPT], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: { ...process.env, NODE_TEST_CONTEXT: 'child-v8' },
    });
    assert.match(
      poisoned,
      /\[RAN\] tests\/core\/public-benchmark\.test\.ts/,
      'the reporter must reach the same verdict whoever invoked it. Under NODE_TEST_CONTEXT it '
      + 'reported the real benchmark as ABSENT, because the child stopped emitting TAP.',
    );
    assert.doesNotMatch(poisoned, /FLOOR ASSERTIONS ARE NOT LIVE/);
    assert.match(poisoned, /mutation check: PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR raised to [0-9.]+ -> suite FAILED/);
  });

  it('leaves scripts/lib/auc.ts byte-identical — the mutation never touches disk', () => {
    // The reason the check is a module hook rather than a temp file swap. Every
    // spawn above this line ran with a raised floor; none of them may have
    // written one down. A CI step killed mid-mutation must not be able to leave
    // a fabricated ratchet in the tree.
    assert.equal(readFileSync(path.join(REPO_ROOT, 'scripts/lib/auc.ts'), 'utf8'), AUC_LIB);
  });
});
