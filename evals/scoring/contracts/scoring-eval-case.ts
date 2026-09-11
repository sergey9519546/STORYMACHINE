// Phase B — machine-readable eval contracts (adapted to the RUNNABLE engine
// surface: a Fountain script scored by runScriptDoctor). The directive's
// candidate-transition form is retained as an aspiration for the converge side
// (Phase C+); this file types what we can execute and measure TODAY.

/** A metamorphic case: transform a base script, assert the DIRECTION the score
 *  must move — the label is known even when an absolute score is not (§14). */
export interface MetamorphicCase {
  id: string;
  category: 'invariance' | 'sensitivity';
  disposition: 'hard' | 'known-failing';
  description: string;
  /** pure text transform of a base Fountain script */
  transform: (base: string) => string;
  /** OPTIONAL comparison-point override. A case with `parts` is not a
   *  transform of the shared base script at all: the baseline it must not
   *  beat is the MAXIMUM health over the texts this returns, and `transform`
   *  ignores its `base` argument and builds the variant from the same parts.
   *  Added for `stapled_shorts` (2026-09-07), whose claim — "a concatenation
   *  of unrelated scripts must not outscore the best script in it" — is a
   *  statement about a script set, not about one document's edit history,
   *  and therefore has no single base script to transform. Every other case
   *  leaves this undefined and reads the shared base exactly as before. */
  parts?: () => string[];
  /** OPTIONAL variant-set override. A case with `variants` is not judged on
   *  ONE transformed document: the variant health it is held to is the
   *  MAXIMUM health over every text this returns, so the assertion is about
   *  the whole set rather than one arrangement. Added 2026-09-11 for
   *  `stapled_shorts`, whose claim — "no ordering of these twelve parts may
   *  outscore the best part" — is a statement about every ordering, and whose
   *  first version pinned one favourable arrangement: the independent review
   *  measured 6 of 12 random orderings of the same twelve parts still
   *  outscoring the best part while the shipped alphabetical order passed by
   *  2.0, i.e. a margin smaller than the 3.4-point order-sensitivity of the
   *  construction itself. `transform` still returns the CANONICAL member of
   *  the set (it is what gets printed), and every other case leaves this
   *  undefined and is judged on `transform` exactly as before. */
  variants?: () => string[];
  /** required movement of health (and optionally a named dimension) */
  expect:
    | { kind: 'unchanged'; epsilon: number }            // invariance
    | { kind: 'not_increase'; epsilon: number }         // must not go up (e.g. empty verbosity)
    | { kind: 'decrease'; minDrop: number }             // must go down (structural damage)
    | { kind: 'not_decrease'; epsilon: number };
  dimension?: string;                                    // optional: assert on a dimension not just health
  provenance: { author: string; created: string; note?: string };
}

/** Blinded human preference label (Phase G input; not produced by code). */
export interface HumanPreferenceLabel {
  evaluatorId: string;
  pairId: string;
  candidateA: string;
  candidateB: string;
  preference: 'A' | 'B' | 'tie';
  confidence: number;                 // 0..1
  rubricBreakdown: Record<string, number>;
  evaluatorRole: 'professional_writer' | 'story_reader' | 'owner';
  notes?: string;
}

export interface MetamorphicResult {
  id: string; category: string;
  baseHealth: number; variantHealth: number; delta: number;
  baseDim?: number; variantDim?: number;
  passed: boolean; reason: string;
}
