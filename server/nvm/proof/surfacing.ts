// Surfacing criterion — the Pre-Flight finding-gate (ULTRAPLAN Phase 2 keystone).
//
// Every candidate defect passes through ONE deterministic release gate before it
// can surface. This replaces ad-hoc per-rule severity and is the systematic cure
// for the false-positive floods measured on produced films (INTENTION_INVISIBLE
// ~127×/film; a lexical cluster on 100% of films — docs/scoring/
// COVERAGE_GAP_ANALYSIS). Deterministic, no LLM: models may PROPOSE the inputs
// (necessity, support, alternatives) but this code decides release.
//
// Pre-Flight §4.4 criterion. A finding is eligible to surface iff:
//   N(p,e) ≥ τ_N  AND  [ S = CONTRADICTED  OR  (S = UNKNOWN ∧ C(p) ≥ τ_C) ]
//   AND  A(p,e) < τ_A  AND  V = 1
// Thresholds are per-subtype: a knowledge-path violation ≠ an emotional-
// motivation judgment.

/** Open-world support state of a proposed precondition against the ledger. */
export type SupportState =
  | 'ENTAILED'        // representation establishes p
  | 'CONTRADICTED'    // representation establishes ¬p
  | 'UNKNOWN'         // neither — first-class; absence is NOT a negative fact
  | 'AMBIGUOUS'       // multiple incompatible readings — suppress
  | 'EXTRACTION_ERROR';

/** Dependency provenance (Pre-Flight §4.3). Only the hard classes are eligible
 *  for routine high-confidence release; a soft narrative expectation is never a
 *  plot hole on its own. */
export type DependencyClass =
  | 'explicit_script_rule'
  | 'established_world_rule'
  | 'hard_physical_constraint'
  | 'epistemic_requirement'
  | 'access_or_possession_requirement'
  | 'temporal_requirement'
  | 'soft_narrative_expectation';

const HARD_CLASSES: ReadonlySet<DependencyClass> = new Set([
  'explicit_script_rule', 'established_world_rule', 'hard_physical_constraint',
  'epistemic_requirement', 'access_or_possession_requirement', 'temporal_requirement',
]);

export function isRoutinelyReleasable(dep: DependencyClass): boolean {
  return HARD_CLASSES.has(dep);
}

/** Per-subtype thresholds. τ_N necessity floor; τ_C search-completeness floor
 *  (only gates UNKNOWN); τ_A best-alternative ceiling. */
export interface SurfacingThresholds { tauN: number; tauC: number; tauA: number; }

/** Conservative defaults; real values are calibrated against human labels
 *  (Phase G) per subtype. Documented as engineering settings, not truths. */
export const DEFAULT_THRESHOLDS: Readonly<Record<string, SurfacingThresholds>> = {
  knowledge_path: { tauN: 0.6, tauC: 0.7, tauA: 0.4 },
  object_custody: { tauN: 0.6, tauC: 0.7, tauA: 0.4 },
  temporal:       { tauN: 0.6, tauC: 0.7, tauA: 0.4 },
  causal_gap:     { tauN: 0.7, tauC: 0.8, tauA: 0.35 },
  default:        { tauN: 0.65, tauC: 0.75, tauA: 0.4 },
};

export function thresholdsFor(subtype: string): SurfacingThresholds {
  return DEFAULT_THRESHOLDS[subtype] ?? DEFAULT_THRESHOLDS.default;
}

export interface SurfacingInput {
  subtype: string;
  dependencyClass: DependencyClass;
  necessity: number;            // N(p,e) ∈ [0,1] — how required p is for e
  support: SupportState;        // S(p,L_t)
  searchCompleteness: number;   // C(p) ∈ [0,1] — how thorough the support search was
  alternativeStrength: number;  // A(p,e) ∈ [0,1] — strength of best innocent explanation
  evidencePasses: boolean;      // V — subtype evidence contract passed (spans, etc.)
}

export type ExternalVerdict = 'PASS' | 'FAIL' | 'SUPPRESSED';

export interface SurfacingDecision {
  surface: boolean;
  externalVerdict: ExternalVerdict;   // internal multi-state → user-facing binary
  reason: string;                     // deterministic explanation of the gate
}

/** The single release gate. Pure + deterministic. */
export function shouldSurface(input: SurfacingInput, thresholds = thresholdsFor(input.subtype)): SurfacingDecision {
  const { tauN, tauC, tauA } = thresholds;
  const suppressed = (reason: string): SurfacingDecision => ({ surface: false, externalVerdict: 'SUPPRESSED', reason });

  if (input.support === 'AMBIGUOUS') return suppressed('ambiguous support — suppressed');
  if (input.support === 'EXTRACTION_ERROR') return suppressed('extraction error — suppressed and logged');
  if (input.support === 'ENTAILED') return { surface: false, externalVerdict: 'PASS', reason: 'precondition entailed — supported' };

  // Only CONTRADICTED or UNKNOWN remain.
  if (input.necessity < tauN) return suppressed(`necessity ${input.necessity.toFixed(2)} < τ_N ${tauN}`);
  if (!isRoutinelyReleasable(input.dependencyClass) && input.support === 'UNKNOWN')
    return suppressed(`soft dependency (${input.dependencyClass}) absent — not a plot hole`);
  if (input.support === 'UNKNOWN' && input.searchCompleteness < tauC)
    return suppressed(`unknown support with incomplete search (C ${input.searchCompleteness.toFixed(2)} < τ_C ${tauC}) — open-world abstain`);
  if (input.alternativeStrength >= tauA)
    return suppressed(`strong innocent explanation (A ${input.alternativeStrength.toFixed(2)} ≥ τ_A ${tauA}) — adversarial acquittal`);
  if (!input.evidencePasses) return suppressed('evidence contract failed — no flag without evidence');

  const verdict: ExternalVerdict = input.support === 'CONTRADICTED' ? 'FAIL' : 'FAIL';
  const kind = input.support === 'CONTRADICTED' ? 'contradiction' : 'unsupported-necessary';
  return { surface: true, externalVerdict: verdict, reason: `${kind}: N≥τ_N, A<τ_A, evidence ✓ (subtype ${input.subtype})` };
}
