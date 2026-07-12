// Integrity Rate — OWNE O2, Wave Program v2 (root-cause / defect bookkeeping
// aggregator). Deterministic, no LLM.
//
// The OWNE consistency family (assertion-containment.ts, typed-promises.ts,
// mystery-fairness.ts, well-made-surprise.ts) each judge ONE dimension of
// story integrity in isolation. This module does not re-derive any of that
// logic: it rolls the sibling detectors' ALREADY-COMPUTED verdicts into a
// single 0..1 "Integrity Rate" score for regression tracking across a wave
// program — one number a caller can watch move (or refuse to move) release
// over release.
//
// Weighting (documented, not implicit): four integrity dimensions, each
// worth exactly ONE check in the pass/fail tally, so integrityRate is
// simply passedChecks / totalChecks:
//   1. assertion containment  — pass iff `assertionContained === true`
//   2. promise-keeping        — pass iff `promisesTotal === 0` (nothing
//      planted, vacuously fine) OR `promisesKept / promisesTotal === 1`
//      (every planted promise was paid off; partial credit is NOT given a
//      passing check — a single unkept promise fails this dimension, same
//      "no partial credit for a broken discipline" stance typed-promises.ts
//      itself takes with its unplanted-payoff penalty)
//   3. mystery fairness       — pass iff `mysteryFair === true`
//   4. surprise economy       — pass iff `cheapSurprises === 0` (any cheap/
//      unearned surprise fails this dimension regardless of how many
//      well-made surprises also occurred — an earned surprise elsewhere
//      does not cancel out an unearned one)
//
// A dimension is EXCLUDED from the tally (not counted in totalChecks) when
// the caller signals "nothing to check" for it — see isDimensionApplicable
// below. This mirrors the sibling modules' UNKNOWN-on-nothing-to-assess
// discipline: an inapplicable dimension is not a passing OR a failing
// check, it simply isn't a check.
//
// support (SupportState, per server/nvm/proof/surfacing.ts's open-world
// contract):
//   - any HARD failure (assertion contradiction, unfair mystery, or a
//     cheap surprise) → CONTRADICTED. These three are treated as hard
//     failures because their sibling modules themselves report
//     support: 'CONTRADICTED' for the equivalent condition.
//   - no hard failures AND at least one applicable dimension, and the
//     promise dimension (if applicable) also passed → ENTAILED — the
//     aggregate positively establishes "no known integrity failure",
//     exactly mirroring the closed-world ENTAILED reasoning in
//     assertion-containment.ts (the aggregate is a closed-world check
//     over the caller-supplied sub-reports, not an absence-of-evidence
//     claim).
//   - nothing applicable at all (zero checks) → UNKNOWN — there is
//     nothing for the aggregate to entail or contradict.

import type { SupportState } from '../proof/surfacing.ts';

/** Typed input carrying the essential verdict booleans/counts already
 *  computed by the sibling OWNE detectors. Callers pass through the fields
 *  they have; a dimension whose fields are entirely absent/undefined is
 *  treated as inapplicable (excluded from the tally, see guards below). */
export interface IntegrityRateInput {
  /** From assessAssertionContainment(...).contained. Undefined → dimension
   *  not checked (e.g. no assertion ledger was built for this script). */
  assertionContained?: boolean;
  /** From assessTypedPromises(...).kept.length. Dropped (treated as 0) if
   *  negative or non-finite. */
  promisesKept?: number;
  /** From assessTypedPromises(...) — kept.length + unkept.length (planted
   *  count). Dropped (treated as 0) if negative or non-finite. */
  promisesTotal?: number;
  /** From assessMysteryFairness(...).fair. Undefined → dimension not
   *  checked (e.g. the script has no mystery to evaluate). */
  mysteryFair?: boolean;
  /** From assessWellMadeSurprise(...) — count of surprises judged cheap /
   *  unearned. Dropped (treated as 0) if negative or non-finite. */
  cheapSurprises?: number;
  /** From assessWellMadeSurprise(...) — count of surprises judged
   *  well-made / earned. Informational only (not part of the pass/fail
   *  tally — see module header: an earned surprise does not offset a
   *  cheap one), but validated the same way (negative/non-finite → 0)
   *  so callers get a consistent, clamped echo if they read it back. */
  wellMadeSurprises?: number;
}

/** Named failure reasons, one per integrity dimension that can fail. */
export type IntegrityFailure =
  | 'assertion-contradiction'
  | 'unkept-promises'
  | 'unfair-mystery'
  | 'cheap-surprise';

export interface IntegrityRateResult {
  /** passedChecks / totalChecks, clamped to [0, 1]. 0 when totalChecks is 0
   *  (nothing was applicable) — see `support` for how to distinguish that
   *  from a genuine 0% pass rate. */
  integrityRate: number;
  passedChecks: number;
  totalChecks: number;
  failures: IntegrityFailure[];
  support: SupportState;
}

/** Guard: coerce a possibly-absent count to a non-negative finite integer
 *  contribution, dropping (→ 0) anything negative, non-finite, or NaN. */
function safeCount(n: number | undefined): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Aggregate the sibling OWNE integrity detectors' verdicts into a single
 * Integrity Rate.
 *
 * Guards:
 *  - Null/undefined/non-object input → treated as an all-inapplicable
 *    input (every dimension excluded) → UNKNOWN, rate 0, totalChecks 0.
 *  - Each dimension is applicable independently; a caller may supply any
 *    subset of fields. Boolean fields (`assertionContained`,
 *    `mysteryFair`) are only treated as present when they are literally
 *    `true` or `false` — anything else (including `undefined`) excludes
 *    that dimension.
 *  - The promise dimension is applicable when EITHER `promisesKept` or
 *    `promisesTotal` is a valid (post-guard) number; a script with zero
 *    planted promises (`promisesTotal === 0`) is a vacuous PASS for this
 *    dimension, not "inapplicable" — the sibling module's own "nothing
 *    planted, nothing to keep" stance.
 *  - The surprise dimension is applicable when EITHER `cheapSurprises` or
 *    `wellMadeSurprises` is present as a valid number; zero cheap
 *    surprises is a PASS.
 *  - Counts are clamped via safeCount (negative/non-finite → 0); ratios
 *    are computed only from clamped counts so the result is always a
 *    finite value in [0, 1].
 */
export function computeIntegrityRate(
  input: IntegrityRateInput | null | undefined,
): IntegrityRateResult {
  const safe: IntegrityRateInput = input && typeof input === 'object' ? input : {};

  let totalChecks = 0;
  let passedChecks = 0;
  const failures: IntegrityFailure[] = [];
  let hardFailure = false;

  // 1. Assertion containment.
  if (safe.assertionContained === true || safe.assertionContained === false) {
    totalChecks += 1;
    if (safe.assertionContained) {
      passedChecks += 1;
    } else {
      failures.push('assertion-contradiction');
      hardFailure = true;
    }
  }

  // 2. Promise-keeping.
  const hasPromiseInput =
    (typeof safe.promisesKept === 'number' && Number.isFinite(safe.promisesKept)) ||
    (typeof safe.promisesTotal === 'number' && Number.isFinite(safe.promisesTotal));
  if (hasPromiseInput) {
    const kept = safeCount(safe.promisesKept);
    const total = safeCount(safe.promisesTotal);
    totalChecks += 1;
    // Vacuous pass: nothing planted → nothing unkept. Otherwise require
    // EVERY planted promise kept (no partial credit) — clamp kept to at
    // most total so a malformed kept > total input can't exceed 1.0.
    const clampedKept = Math.min(kept, total);
    const allKept = total === 0 || clampedKept >= total;
    if (allKept) {
      passedChecks += 1;
    } else {
      failures.push('unkept-promises');
      // Unkept promises are a soft failure (matches typed-promises.ts's own
      // UNKNOWN-not-CONTRADICTED stance for a merely-unkept plant with no
      // unplanted payoff) — does not by itself force CONTRADICTED support.
    }
  }

  // 3. Mystery fairness.
  if (safe.mysteryFair === true || safe.mysteryFair === false) {
    totalChecks += 1;
    if (safe.mysteryFair) {
      passedChecks += 1;
    } else {
      failures.push('unfair-mystery');
      hardFailure = true;
    }
  }

  // 4. Surprise economy.
  const hasSurpriseInput =
    (typeof safe.cheapSurprises === 'number' && Number.isFinite(safe.cheapSurprises)) ||
    (typeof safe.wellMadeSurprises === 'number' && Number.isFinite(safe.wellMadeSurprises));
  if (hasSurpriseInput) {
    const cheap = safeCount(safe.cheapSurprises);
    totalChecks += 1;
    if (cheap === 0) {
      passedChecks += 1;
    } else {
      failures.push('cheap-surprise');
      hardFailure = true;
    }
  }

  if (totalChecks === 0) {
    return { integrityRate: 0, passedChecks: 0, totalChecks: 0, failures: [], support: 'UNKNOWN' };
  }

  const rawRate = passedChecks / totalChecks;
  const integrityRate = Math.max(0, Math.min(1, rawRate));

  let support: SupportState;
  if (hardFailure) {
    support = 'CONTRADICTED';
  } else if (failures.length === 0 && passedChecks === totalChecks) {
    support = 'ENTAILED';
  } else {
    // Soft failure(s) only (e.g. unkept promises with no hard failure) —
    // does not positively establish integrity, but is not a hard
    // contradiction either.
    support = 'UNKNOWN';
  }

  return { integrityRate, passedChecks, totalChecks, failures, support };
}

// ---------------------------------------------------------------------------
// Golden fixtures.
// ---------------------------------------------------------------------------

/**
 * TAVERN_LETTER_FIXTURE — a small, well-formed hand-authored story:
 * a planted letter (a chekhov_object-style promise) is discovered early
 * and its contents are fairly, non-contradictorily revealed in a tavern
 * scene later. All four integrity dimensions pass cleanly:
 *   - assertionContained: no unacknowledged contradiction was found by the
 *     assertion ledger (e.g. "the letter is sealed" never flips polarity
 *     without an owned reversal).
 *   - promisesKept === promisesTotal === 1: the letter (planted when found)
 *     is paid off (read aloud/revealed) later in the tavern.
 *   - mysteryFair: true — the mystery of the letter's contents was fairly
 *     clued (the audience could plausibly have guessed, no critical clue
 *     was concealed).
 *   - cheapSurprises: 0, wellMadeSurprises: 1 — the tavern reveal itself is
 *     the one well-made surprise: it recontextualizes earlier scenes
 *     rather than coming from nowhere.
 * Expected result: integrityRate === 1.0, support === 'ENTAILED', no
 * failures.
 */
export const TAVERN_LETTER_FIXTURE: Readonly<IntegrityRateInput> = Object.freeze({
  assertionContained: true,
  promisesKept: 1,
  promisesTotal: 1,
  mysteryFair: true,
  cheapSurprises: 0,
  wellMadeSurprises: 1,
});

/**
 * TAVERN_LETTER_FIXTURE_BROKEN — the deliberately-broken variant of the
 * same small story: the letter's contents are revealed as a bald
 * unearned twist (a cheap surprise — no plant recontextualized) AND a
 * second, unrelated promise (a stated goal made earlier in the story) is
 * never paid off. Assertion containment and mystery fairness remain
 * intact in this variant so the test can isolate the two broken
 * dimensions.
 * Expected result: integrityRate === 0.5 (2 of 4 dimensions pass:
 * assertion containment + mystery fairness; promise-keeping and surprise
 * economy fail), support === 'CONTRADICTED' (cheap surprise is a hard
 * failure), failures === ['unkept-promises', 'cheap-surprise'] in
 * evaluation order.
 */
export const TAVERN_LETTER_FIXTURE_BROKEN: Readonly<IntegrityRateInput> = Object.freeze({
  assertionContained: true,
  promisesKept: 1,
  promisesTotal: 2,
  mysteryFair: true,
  cheapSurprises: 1,
  wellMadeSurprises: 0,
});
