// MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT is tied to the measurement it came from.
//
// WHAT THIS GUARDS. The bound (server/lib/validation.ts) is not a policy number
// somebody chose; it is "the largest cast whose worst-case analysis still costs
// less than half the per-analysis budget", and the only thing that can answer
// that is a stopwatch. Twice now the number has moved without the measurement
// moving with it in a checkable way:
//
//   * 2026-09-12 round 1 raised it to 1,500,000 by bracketing FIXTURE WEIGHTS
//     and never measured the shape that ceiling admits (223 speakers, 27.3s —
//     91% of the budget). An independent reviewer caught it.
//   * 2026-09-12 round 2 fixed that by measuring, but recorded the timings as
//     "this box" and "the reviewer's box". Neither box was the one that
//     enforces the bound. On 2026-09-13 the first GitHub Actions run since
//     2026-09-02 measured the same shape at 19,713ms of CPU against a 15,000ms
//     target and failed (run 34736306670 attempt 2, main @ 996e27a0).
//
// Both failures have the same shape: prose carried the derivation, so nothing
// recomputed it. This file makes the derivation executable. The committed
// calibration table (tests/fixtures/voice-bound-derivation.json, produced by
// `npm run measure-voice-bound -- --json=…` on a real machine and, for the row
// that counts, by .github/workflows/calibrate-voice-bound.yml on the runner) is
// re-derived here with the SAME function the calibration script uses
// (deriveCast, scripts/lib/voice-bound.ts), and the constant must equal the
// answer. Editing the constant without a fresh table fails. Re-locking a table
// from a machine that is not the enforcing one fails. Changing the analysis
// budget under a stale table fails.
//
// This is the arrangement the public-benchmark floors already have with their
// run (scripts/lib/auc.ts + tests/fixtures/), for the same reason.
//
// NOT scoring-path: validation.ts sits outside doctor.ts's import graph, and
// this file only reads a fixture.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT,
  MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT,
} from '../../server/lib/validation.ts';
import { DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS } from '../../server/lib/doctor-budget.ts';
import {
  deriveCast,
  maxAdmittedWordsPerSpeaker,
  DERIVATION_MARGIN_FRACTION,
  DERIVATION_SHAPE,
  type VoiceBoundRow,
} from '../../scripts/lib/voice-bound.ts';
import type { MachineFingerprint } from '../../scripts/lib/machine-fingerprint.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = path.join(REPO_ROOT, 'tests/fixtures/voice-bound-derivation.json');

interface DerivationFixture {
  readonly generatedAt: string;
  readonly machine: MachineFingerprint;
  readonly budgetMs: number;
  readonly marginFraction: number;
  readonly primaryCondition: string;
  readonly repeats: number;
  readonly conditions: Record<string, VoiceBoundRow[]>;
  readonly derivation: {
    readonly shape: string;
    readonly targetMs: number;
    readonly ceilingMs: number;
    readonly marginFraction: number;
    readonly derivedCast: number | null;
    readonly derivedCpuMsMax: number | null;
  };
}

const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as DerivationFixture;
const primaryRows = fixture.conditions[fixture.primaryCondition] ?? [];

describe('MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT is derived from a committed measurement', () => {
  it('the table was measured on the machine that ENFORCES the bound (a GitHub Actions runner), not on a developer box', () => {
    // The whole 2026-09-13 finding in one assertion. A table locked from a fast
    // laptop would satisfy every other check in this file and still leave the
    // CI assertion failing, which is exactly what happened.
    assert.equal(
      fixture.machine.ci,
      'github-actions',
      `tests/fixtures/voice-bound-derivation.json was locked on "${fixture.machine.ci}" (${fixture.machine.cpu}). `
      + 'The bound has to hold on the slowest machine that enforces it, and that machine is the CI runner — '
      + 're-lock from .github/workflows/calibrate-voice-bound.yml',
    );
    assert.ok(fixture.machine.cpu.length > 0, 'the table must name the CPU it was measured on');
    assert.ok(fixture.machine.runId, 'the table must carry GITHUB_RUN_ID so its log can be re-read');
  });

  it('the table was locked against the budget this tree enforces', () => {
    assert.equal(
      fixture.budgetMs,
      DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS,
      'the calibration table was measured against a different DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS than this tree uses — '
      + 'the derivation targets half the budget, so a budget change invalidates the table',
    );
    assert.equal(
      fixture.marginFraction,
      DERIVATION_MARGIN_FRACTION,
      'the table was locked against a different safety margin than scripts/lib/voice-bound.ts now applies',
    );
  });

  it('the constant equals the cast the table derives — re-computed here, not trusted', () => {
    assert.ok(primaryRows.length > 0, `the table has no rows for its primary condition "${fixture.primaryCondition}"`);
    const derived = deriveCast(primaryRows, DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS);
    assert.notEqual(derived.derivedCast, null, 'no swept cast cleared the target — the sweep needs to go lower');
    assert.equal(
      MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT,
      derived.derivedCast,
      `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT is ${MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT}, but the committed calibration table `
      + `(${fixture.machine.cpu}, run ${fixture.machine.runId ?? '?'}, ${fixture.generatedAt}) derives ${derived.derivedCast} `
      + `(worst CPU sample ${derived.derivedCpuMsMax}ms against a ${derived.ceilingMs}ms ceiling). `
      + 'Either the constant was edited without a new measurement, or a new measurement was locked without moving the constant',
    );
  });

  it('the table\'s own recorded derivation agrees with re-deriving it (the file is self-consistent)', () => {
    const derived = deriveCast(primaryRows, fixture.budgetMs, fixture.marginFraction);
    assert.deepEqual(
      { cast: fixture.derivation.derivedCast, shape: fixture.derivation.shape, ceilingMs: fixture.derivation.ceilingMs },
      { cast: derived.derivedCast, shape: derived.shape, ceilingMs: derived.ceilingMs },
      'the derivation block stored in the table does not match what its own rows derive — the file was hand-edited',
    );
  });

  it('the sweep actually BRACKETED the boundary: some swept cast above the derived one exceeds the ceiling', () => {
    // Without this, "largest swept cast that clears the ceiling" could just mean
    // "the top of the grid" — a derivation bounded by how far somebody bothered
    // to sweep rather than by cost. The 2026-09-12 round-1 derivation failed in
    // precisely that way (it swept casts up to 60 on the cheap shape and never
    // measured what its ceiling admitted).
    const derived = deriveCast(primaryRows, DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS);
    const above = primaryRows
      .filter((r) => r.shape === DERIVATION_SHAPE && r.n > (derived.derivedCast ?? 0))
      .sort((a, b) => a.n - b.n);
    assert.ok(
      above.length > 0,
      `the sweep stopped at ${derived.derivedCast}, the derived cast — nothing above it was measured, so the bound is `
      + 'bounded by the grid, not by cost. Re-run the calibration with a higher --max-admitted',
    );
    assert.ok(
      above[0]!.cpuMsMax > derived.ceilingMs,
      `the next swept cast up (N=${above[0]!.n}) also clears the ${derived.ceilingMs}ms ceiling at ${above[0]!.cpuMsMax}ms — `
      + 'the derivation is grid-limited, not cost-limited',
    );
  });

  it('every derivation-shape row at or below the derived cast clears the ceiling (the bound admits nothing unmeasured or too slow)', () => {
    const derived = deriveCast(primaryRows, DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS);
    const admitted = primaryRows.filter((r) => r.shape === DERIVATION_SHAPE && r.n <= (derived.derivedCast ?? 0));
    assert.ok(admitted.length >= 2, 'the sweep must measure more than one admitted cast');
    for (const row of admitted) {
      assert.ok(
        row.cpuMsMax <= derived.ceilingMs,
        `${DERIVATION_SHAPE} N=${row.n} is admitted by the bound but measured ${row.cpuMsMax}ms of CPU, over the ${derived.ceilingMs}ms ceiling`,
      );
      assert.equal(
        row.pooledWords,
        row.n * maxAdmittedWordsPerSpeaker(row.n, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT),
        `${DERIVATION_SHAPE} N=${row.n} measured ${row.pooledWords} pooled words, but the heaviest document the weight bound `
        + `admits at that cast carries ${row.n * maxAdmittedWordsPerSpeaker(row.n, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT)} — `
        + 'the table was measured against a different weight bound than this tree enforces',
      );
    }
  });

  it('the realistic feature-scale ensembles the bound exists to keep serving are still ADMITTED by it, at their measured weights', () => {
    // Adversarial finding 10 was not "the bound is too high", it was "an
    // ordinary 20-character ensemble gets no score". A re-derivation that
    // rejects a routine heist/courtroom/war-film cast has traded one regression
    // for the other, so the table's own measured weights for those casts are
    // checked against the bound here rather than left to prose.
    const realistic = primaryRows.filter((r) => r.shape === 'probe-cast' && r.n <= 40);
    assert.ok(realistic.length >= 3, 'the calibration must sweep the realistic 20/30/40-cast ensembles');
    for (const row of realistic) {
      assert.ok(
        row.weight <= MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT,
        `a realistic ${row.n}-cast feature measures weight ${row.weight} on the runner, above the ${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT} bound — `
        + 'this re-derivation would reject an ordinary ensemble, which is the regression adversarial finding 10 opened',
      );
    }
  });
});
