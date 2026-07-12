// Phase B — machine-readable eval contracts (adapted to the RUNNABLE engine
// surface: a Fountain script scored by runScriptDoctor). The directive's
// candidate-transition form is retained as an aspiration for the converge side
// (Phase C+); this file types what we can execute and measure TODAY.

/** A metamorphic case: transform a base script, assert the DIRECTION the score
 *  must move — the label is known even when an absolute score is not (§14). */
export interface MetamorphicCase {
  id: string;
  category: 'invariance' | 'sensitivity';
  description: string;
  /** pure text transform of a base Fountain script */
  transform: (base: string) => string;
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
