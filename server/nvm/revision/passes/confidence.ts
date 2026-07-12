// Confidence-tier × determinism contract — W1 (research intake 2026-07-11).
//
// Ports the Reference Engine 0.2.0 finding contract (docs/canonical/
// STORYMACHINE_RESEARCH_AND_MATH.md §D.3) onto the revision-pass RevisionIssue
// stream, and encodes NORTH_STAR's central law as a typed invariant instead of
// a convention:
//
//   "Hard blockers may assert only encoded facts. Soft diagnostics must not
//    impersonate proof. A lexical/model-assisted detector cannot become a
//    blocker until a confirmed structured extraction supplies the fact."
//
// Three orthogonal axes, exactly as the reference engine keeps them:
//   • severity      — how consequential the issue is IF true (already on RevisionIssue).
//   • determinism   — HOW the finding was derived (its epistemic basis).
//   • confidenceTier — HOW STRONGLY current evidence supports it.
//
// INERT BY DEFAULT. Nothing here changes any produced score until a rule opts
// in by carrying `determinism`/`confidenceTier`. `weightedIssues()` with no
// options reproduces doctor.ts's legacy `4·crit + 1.5·major + 0.5·minor`
// exactly (see confidence.test.ts "legacy-exact"), so the calibration corpus
// and discrimination harness cannot regress on landing. The tier-aware path is
// the measured follow-up gated on a corpus run (EXECUTION_PLAN W2).

import type { RevisionIssue } from './types.ts';

/** How a finding was derived. Only `deterministic`/`structured_only` findings
 *  may hard-block (D.3): they stand on encoded state, not on prose pattern. */
export type Determinism = 'deterministic' | 'structured_only' | 'heuristic';

/** How strongly current evidence supports the finding (D.3 / TRACE §17.2). */
export type ConfidenceTier = 'strong_evidence' | 'worth_a_look' | 'pattern_to_watch';

/** What the finding is permitted to DO in the report (D.3 gate_default). */
export type Gate = 'hard_blocker' | 'soft_rank' | 'positive_signal';

/** Legacy severity → health weight, unchanged from doctor.ts's
 *  computeRawCraftScore (`weightedIssues = 4·critical + 1.5·major + 0.5·minor`).
 *  Single source of truth so the tier-aware and legacy paths provably agree
 *  when no tier is present. */
export const SEVERITY_WEIGHT: Record<RevisionIssue['severity'], number> = {
  critical: 4,
  major: 1.5,
  minor: 0.5,
};

/** Tier → multiplier on the severity weight. `strong_evidence` is 1.0 so a
 *  structured finding keeps full legacy weight; heuristic guesses are
 *  discounted so style-minor false positives stop out-voting the good half
 *  (EXECUTION_PLAN §5.2). INITIAL ENGINEERING SETTINGS — must be calibrated on
 *  the real corpus before the tier-aware path is switched on in doctor.ts
 *  (measure-before-threshold, NORTH_STAR §1). */
export const TIER_MULTIPLIER: Record<ConfidenceTier, number> = {
  strong_evidence: 1.0,
  worth_a_look: 0.7,
  pattern_to_watch: 0.4,
};

/** Undefined tier ⇒ 1.0 (exact legacy behavior). */
export function tierMultiplier(tier?: ConfidenceTier): number {
  return tier ? TIER_MULTIPLIER[tier] : 1.0;
}

/** The gate a finding is permitted, given its determinism. Heuristic findings
 *  can never hard-block (they are soft_rank); structured/deterministic may.
 *  Positive-signal is orthogonal and set explicitly, not inferred here. */
export function gateForDeterminism(determinism: Determinism): Gate {
  return determinism === 'heuristic' ? 'soft_rank' : 'hard_blocker';
}

/** THE INVARIANT (D.3). A heuristic finding may not be `critical` — critical is
 *  the health formula's hard-block weight (4×), reserved for findings that
 *  stand on encoded facts. Returns true when the pairing is legal. */
export function isSeverityLegal(
  severity: RevisionIssue['severity'],
  determinism: Determinism,
): boolean {
  return !(determinism === 'heuristic' && severity === 'critical');
}

/** Fail-closed guard for pass authors: throws if a heuristic rule emits a
 *  critical finding. Deterministic and side-effect-free. */
export function assertSeverityLegal(issue: RevisionIssue): void {
  if (issue.determinism && !isSeverityLegal(issue.severity, issue.determinism)) {
    throw new Error(
      `gate violation: heuristic rule '${issue.rule}' emitted a critical finding — ` +
        `a lexical/heuristic detector cannot hard-block (NORTH_STAR; D.3). ` +
        `Downgrade to 'major' or supply a structured extraction.`,
    );
  }
}

// ── Determinism classifier ──────────────────────────────────────────────────
// Unknown rules default to `structured_only` (full weight) so the classifier
// NEVER silently discounts a rule we haven't reviewed — down-weighting is
// opt-in, matching the inert-by-default contract.

/** Explicit per-rule determinism. Extend as rules are reviewed on the corpus. */
export const RULE_DETERMINISM: Record<string, Determinism> = {
  // §5.2 named worst offenders — lexical/statistical, must not hard-block.
  TALKING_HEADS: 'heuristic',
  OPENING_SCENE_UNDERWEIGHT: 'heuristic',
};

/** Morphology of the lexical/statistical rule families (ACTION_*_FLOOD,
 *  *_MONOTONE, *_DESERT, *_UNIFORMITY, …). These read prose surface, not
 *  encoded state, so they are heuristic by construction. */
const HEURISTIC_RULE_PATTERN =
  /_(FLOOD|MONOTONE|MONOTONY|DESERT|UNIFORMITY|OVERLOAD|BREVITY|POLYSYNDETON|EXPLETIVE|ADVERB|PRONOUN|PUNCTUATION|CADENCE|OPENER)\b|(FLOOD|MONOTONE|MONOTONY|DESERT|UNIFORMITY|OVERLOAD|BREVITY)$/;

/** Best-effort determinism for a rule string: explicit registry first, then
 *  lexical-family morphology, else `structured_only` (conservative full weight). */
export function inferDeterminism(rule: string): Determinism {
  if (rule in RULE_DETERMINISM) return RULE_DETERMINISM[rule];
  if (HEURISTIC_RULE_PATTERN.test(rule)) return 'heuristic';
  return 'structured_only';
}

/** Default tier implied by determinism, for rules that carry determinism but no
 *  explicit tier. Only consulted on the tier-aware path. */
export function defaultTierFor(determinism: Determinism): ConfidenceTier {
  switch (determinism) {
    case 'deterministic':
      return 'strong_evidence';
    case 'structured_only':
      return 'worth_a_look';
    case 'heuristic':
      return 'pattern_to_watch';
  }
}

export interface WeightOptions {
  /** When true, multiply each issue's severity weight by its tier multiplier
   *  (falling back to determinism→defaultTier when a tier is absent but a
   *  determinism is present). When false/omitted, returns the legacy sum
   *  IDENTICALLY. */
  tierAware?: boolean;
}

/** The weighted-issue total behind the doctor's craft penalty. With no options,
 *  equals `4·critical + 1.5·major + 0.5·minor` exactly (legacy). With
 *  { tierAware: true }, discounts heuristic/low-confidence findings. NOTE: the
 *  tier-aware path returns a raw float that can carry IEEE-754 error
 *  (0.5·0.4·19 = 3.8000000000000003); rounding stays doctor.ts's job and tests
 *  compare with an epsilon. The legacy (no-tier) path is exact. */
export function weightedIssues(issues: readonly RevisionIssue[], opts: WeightOptions = {}): number {
  let total = 0;
  for (const issue of issues) {
    const base = SEVERITY_WEIGHT[issue.severity];
    if (!opts.tierAware) {
      total += base;
      continue;
    }
    const tier =
      issue.confidenceTier ??
      (issue.determinism ? defaultTierFor(issue.determinism) : undefined);
    total += base * tierMultiplier(tier);
  }
  return total;
}
