// Adversarial-Acquittal pass (ULTRAPLAN backlog Phase 2, line 58: "search
// strongest innocent explanation before release").
//
// Before a candidate finding is allowed to surface as FAIL, the engine must
// actively search the set of considered innocent explanations for the
// strongest one that is CONSISTENT with the observed evidence. If that
// explanation is strong enough, the finding is acquitted: its residual
// support is upgraded so the downstream release gate (`shouldSurface` in
// `./surfacing.ts`) will suppress it rather than surface it.
//
// This module is deliberately independent of `surfacing.ts`'s internal
// alternativeStrength/tauA mechanism (which acquits any UNKNOWN or
// CONTRADICTED finding whose A(p,e) crosses tauA). Acquittal here is a
// distinct, explicit adversarial search over NAMED candidate explanations,
// each independently scored and evidence-checked, producing an auditable
// "why this flag survived its strongest rebuttal" trail. `surfaceAfterAcquittal`
// composes the two: acquit first, then delegate whatever survives to the
// existing release gate.
//
// Pure, deterministic, no LLM calls, no I/O.

import { shouldSurface, type SupportState, type SurfacingDecision, type SurfacingInput } from './surfacing.ts';

/** Strength at/above which the strongest innocent explanation is considered
 *  sufficient to exonerate an UNKNOWN finding. Documented engineering
 *  setting (not a calibrated truth) — mirrors the conservative posture of
 *  `DEFAULT_THRESHOLDS` in surfacing.ts. */
export const ACQUITTAL_STRENGTH_THRESHOLD = 0.5;

/** A single candidate innocent explanation considered during the adversarial
 *  search. `strength` is a deterministic score in [0,1] describing how well
 *  the explanation accounts for the observed situation; `consistentWithEvidence`
 *  records whether the explanation actually fits the evidence on record — an
 *  explanation that contradicts the evidence cannot exonerate anything, no
 *  matter how strong its raw score. */
export interface InnocentExplanation {
  label: string;
  strength: number;               // ∈ [0,1]
  consistentWithEvidence: boolean;
}

export interface AcquittalInput {
  /** Current support state of the candidate finding, prior to acquittal. */
  support: SupportState;
  /** The full set of innocent explanations considered during the search.
   *  May be empty — an empty search finds nothing and acquits nothing. */
  explanations: readonly InnocentExplanation[];
  /** Strength threshold to apply; defaults to ACQUITTAL_STRENGTH_THRESHOLD. */
  threshold?: number;
}

export interface AcquittalResult {
  acquitted: boolean;
  strongestInnocent: { label: string; strength: number } | null;
  residualSupport: SupportState;
  reason: string;
}

function isValidExplanation(e: InnocentExplanation): boolean {
  return (
    typeof e.label === 'string' && e.label.length > 0 &&
    typeof e.strength === 'number' && Number.isFinite(e.strength) &&
    e.strength >= 0 && e.strength <= 1 &&
    typeof e.consistentWithEvidence === 'boolean'
  );
}

/**
 * Search the considered innocent explanations for the strongest one that is
 * consistent with the observed evidence, and decide whether it is strong
 * enough to acquit the finding.
 *
 * Rules:
 *  - Explanations flagged `consistentWithEvidence: false` are ignored
 *    entirely when computing the strongest candidate — an alternative story
 *    that the evidence itself rules out cannot exonerate anything.
 *  - A CONTRADICTED finding is NEVER acquitted, regardless of how strong an
 *    innocent explanation is found. Direct contradiction (the representation
 *    affirmatively establishes ¬p) is a stronger epistemic fact than any
 *    alternative story about p; an innocent explanation can rebut absence of
 *    evidence, it cannot out-argue evidence of the negation. Acquitting a
 *    CONTRADICTED finding would let the search-for-innocence step override
 *    ground truth, defeating the whole point of the proof-first gate.
 *  - Only UNKNOWN findings are eligible: acquittal converts "we found no
 *    entailment AND no acceptable rebuttal" into "we found no entailment BUT
 *    the best rebuttal is strong enough to stand in for one."
 *  - When acquitted, residualSupport becomes 'ENTAILED' so that composing
 *    with `shouldSurface` (via `surfaceAfterAcquittal`) suppresses the
 *    finding through the ENTAILED → PASS path.
 */
export function adversarialAcquittal(input: AcquittalInput): AcquittalResult {
  const threshold = input.threshold ?? ACQUITTAL_STRENGTH_THRESHOLD;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new RangeError(`adversarialAcquittal: threshold must be in [0,1], got ${threshold}`);
  }

  const consistent = (input.explanations ?? []).filter(isValidExplanation).filter((e) => e.consistentWithEvidence);

  let strongest: InnocentExplanation | null = null;
  for (const e of consistent) {
    if (strongest === null || e.strength > strongest.strength) strongest = e;
  }

  const strongestInnocent = strongest ? { label: strongest.label, strength: strongest.strength } : null;

  if (input.support === 'CONTRADICTED') {
    return {
      acquitted: false,
      strongestInnocent,
      residualSupport: input.support,
      reason: 'CONTRADICTED findings are never acquitted — direct contradiction outranks any innocent explanation',
    };
  }

  if (input.support !== 'UNKNOWN') {
    return {
      acquitted: false,
      strongestInnocent,
      residualSupport: input.support,
      reason: `acquittal only applies to UNKNOWN findings (got ${input.support}) — no search performed`,
    };
  }

  if (!strongest || strongest.strength < threshold) {
    return {
      acquitted: false,
      strongestInnocent,
      residualSupport: input.support,
      reason: strongest
        ? `strongest innocent explanation "${strongest.label}" (${strongest.strength.toFixed(2)}) < threshold ${threshold.toFixed(2)} — not acquitted`
        : 'no consistent innocent explanation found — not acquitted',
    };
  }

  return {
    acquitted: true,
    strongestInnocent,
    residualSupport: 'ENTAILED',
    reason: `acquitted — innocent explanation "${strongest.label}" (${strongest.strength.toFixed(2)}) ≥ threshold ${threshold.toFixed(2)} beats the finding`,
  };
}

/**
 * Compose the adversarial-acquittal search with the existing release gate:
 * run acquittal first; if the finding is acquitted, short-circuit with a
 * suppressed/PASS decision carrying the acquittal reason. Otherwise delegate
 * the (possibly unchanged) support state to `shouldSurface`.
 */
export function surfaceAfterAcquittal(
  surfacingInput: SurfacingInput,
  explanations: readonly InnocentExplanation[],
  threshold?: number,
): SurfacingDecision {
  const acquittal = adversarialAcquittal({ support: surfacingInput.support, explanations, threshold });

  if (acquittal.acquitted) {
    return {
      surface: false,
      externalVerdict: 'PASS',
      reason: `adversarial acquittal: ${acquittal.reason}`,
    };
  }

  return shouldSurface({ ...surfacingInput, support: acquittal.residualSupport });
}
