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
  fountainShapeRejectionReason,
} from '../../server/lib/validation.ts';
import { DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS } from '../../server/lib/doctor-budget.ts';
import {
  deriveCast,
  maxAdmittedWordsPerSpeaker,
  VOICE_BOUND_SHAPES,
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
  readonly guardEvaluatedAgainst?: { readonly weight: number; readonly distinct: number };
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

  // A grid-limited derivation is only honest while the swept shape cannot reach
  // the ceiling at all. Above this fraction of the ceiling, the sweep has to
  // bracket the boundary instead of stopping at the top of the grid.
  //
  // WHY 0.25, and why a fraction rather than "always bracket". Run 35542413222
  // (the first sweep taken after the 2026-09-07/09-20 Burrows's-Delta hoists)
  // measured the derivation shape at 10.1% of the ceiling at its most expensive
  // swept cast and 6.2% at its cheapest, on a bound of 1,500,000 — everything
  // the two bounds admit is an order of magnitude under the line. 0.25 is ~2.5x
  // the worst of those, so the 20% machine-to-machine spread
  // DERIVATION_MARGIN_FRACTION documents cannot trip it, while the pre-hoist
  // regime — where the same shape read 11,848 ms at N=80 and 13,836 ms at
  // N=100, 99% and 115% of this ceiling (run 34740951649) — is far outside it
  // and would demand a bracketing sweep, as it should.
  const GRID_LIMITED_MAX_FRACTION_OF_CEILING = 0.25;

  it('the derivation is not silently GRID-LIMITED: the sweep BRACKETS the boundary, or the shape provably cannot reach the ceiling', () => {
    // Without this, "largest swept cast that clears the ceiling" could just mean
    // "the top of the grid" — a derivation bounded by how far somebody bothered
    // to sweep rather than by cost. The 2026-09-12 round-1 derivation failed in
    // precisely that way (it swept casts up to 60 on the cheap shape and never
    // measured what its ceiling admitted).
    //
    // 2026-09-20: the bracketing form alone became UNSATISFIABLE, and that is a
    // finding about the engine rather than about the sweep. On the max-admitted
    // shape the weight bound fixes the DOCUMENT, not the cast: at bound W a cast
    // of N carries N x floor(W / N²) ≈ W / N pooled words, so the document gets
    // LIGHTER as the cast grows, and since the hoists made the O(distinct²) pass
    // ~44-56x cheaper, document size — not pair count — now dominates. The
    // runner's own table is monotone the wrong way for bracketing (loaded
    // cpuMsMax 1,210 ms at N=50 falling to 746 ms at N=100), and a local probe
    // across every cast the weight bound can admit at all (N=50…223, where
    // 30 x 223² = 1,491,870 is the last one under the bound) reads 810, 650,
    // 485, 451, 476, 510 ms — no cast anywhere near the 12,000 ms ceiling. There
    // is no cost boundary left on this shape to bracket, so a sweep cannot
    // produce one, and "re-run with a higher --max-admitted" would be advice
    // that cannot be followed.
    //
    // So the assertion keeps its intent and splits on the measurement: if any
    // swept cast above the derived one exists, it must exceed the ceiling
    // (unchanged). If none does, the derivation IS the top of the grid, and that
    // is only acceptable when the table itself shows the shape cannot reach the
    // ceiling — cost not trending upward across the grid, and every swept row
    // far under the line. The moment cost starts mattering again, the bracketing
    // requirement returns on its own.
    const derived = deriveCast(primaryRows, DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS);
    const swept = primaryRows
      .filter((r) => r.shape === DERIVATION_SHAPE)
      .slice()
      .sort((a, b) => a.n - b.n);
    const above = swept.filter((r) => r.n > (derived.derivedCast ?? 0));

    if (above.length > 0) {
      assert.ok(
        above[0]!.cpuMsMax > derived.ceilingMs,
        `the next swept cast up (N=${above[0]!.n}) also clears the ${derived.ceilingMs}ms ceiling at ${above[0]!.cpuMsMax}ms — `
        + 'the derivation is grid-limited, not cost-limited',
      );
      return;
    }

    // Grid-limited branch. Everything below has to hold for that to be honest.
    assert.ok(swept.length >= 3, 'a grid-limited derivation needs a grid: sweep at least three casts of the derivation shape');
    assert.equal(
      derived.derivedCast,
      swept[swept.length - 1]!.n,
      'no row above the derived cast was swept, so the derived cast must BE the top of the grid — otherwise the table is inconsistent',
    );
    const cheapestAtTop = swept[swept.length - 1]!.cpuMsMax;
    const costAtBottom = swept[0]!.cpuMsMax;
    assert.ok(
      cheapestAtTop <= costAtBottom,
      `the sweep stopped at ${derived.derivedCast} with nothing above it measured, and cost RISES across the grid `
      + `(N=${swept[0]!.n} ${costAtBottom}ms -> N=${swept[swept.length - 1]!.n} ${cheapestAtTop}ms) — a higher cast could cross the `
      + `${derived.ceilingMs}ms ceiling, so this derivation is bounded by the grid rather than by cost. `
      + 'Re-run the calibration with a higher --max-admitted',
    );
    const worst = swept.reduce((a, b) => (b.cpuMsMax > a.cpuMsMax ? b : a));
    const allowed = derived.ceilingMs * GRID_LIMITED_MAX_FRACTION_OF_CEILING;
    assert.ok(
      worst.cpuMsMax <= allowed,
      `the sweep stopped at ${derived.derivedCast} with nothing above it measured, and the worst swept row `
      + `(N=${worst.n}, ${worst.cpuMsMax}ms) is ${((worst.cpuMsMax / derived.ceilingMs) * 100).toFixed(1)}% of the `
      + `${derived.ceilingMs}ms ceiling — past the ${(GRID_LIMITED_MAX_FRACTION_OF_CEILING * 100).toFixed(0)}% at which a `
      + 'top-of-grid derivation stops being safe. Re-run the calibration with a higher --max-admitted so the boundary is BRACKETED',
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

  it('the table\'s guard column is the verdict THIS tree gives, not the one the sweep\'s tree gave', () => {
    // 2026-09-13 review, finding 6. The lock run carried a provisional cast
    // bound of 65, so the column it printed read REJECT for max-admitted N=70,
    // 75 and 80 — including the row this constant is derived from, which made
    // the committed table say the derived boundary was rejected by the guard.
    // `--lock-from` re-evaluates the column against the tree that ships it; this
    // is the check that the re-evaluation actually happened and stays true. The
    // guard is a pure function of the text and costs no analysis run.
    assert.deepEqual(
      fixture.guardEvaluatedAgainst,
      { weight: MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT, distinct: MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT },
      'the table records the bound values its guard column was evaluated against, and they are not this tree\'s — '
      + 're-run `npm run measure-voice-bound -- --lock-from=tests/fixtures/voice-bound-derivation.json`',
    );
    for (const row of primaryRows) {
      const build = VOICE_BOUND_SHAPES[row.shape];
      assert.ok(build, `the table carries an unknown shape "${row.shape}"`);
      const expected = fountainShapeRejectionReason(build(row.n, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT)) === null
        ? 'ACCEPT'
        : 'REJECT';
      assert.equal(
        row.guard,
        expected,
        `${row.shape} N=${row.n}: the table says ${row.guard}, this tree's guard says ${expected}`,
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
