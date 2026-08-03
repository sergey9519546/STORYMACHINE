// Question-latency deduction — P1, 2026-08-03, THE #1 SCREENED RECOMMENDATION.
//
// ── What this is ─────────────────────────────────────────────────────────
// docs/p1-benchmark/STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md screened five
// order-sensitive signal candidates and concluded that candidate 5,
// question-answer latency, is the ONLY one that is order-sensitive BY
// CONSTRUCTION rather than merely statistically: `detectQuestionLatency`
// (fountain-analyzer.ts) forward-matches each raised dialogue question
// against later lines in whatever scene order it is given, so reordering
// scenes can convert a resolved question into an unresolved one. That
// mechanism is already implemented and already consumed — but only through
// three ordinary-issue rules in server/nvm/revision/passes/payoff.ts
// (~6612-6710: UNANSWERED_QUESTION_FLOOD, INSTANT_GRATIFICATION_PATTERN,
// DEAD_QUESTION_ZONE) that feed `bySeverity` and then `densityPenalty` — the
// channel the doctor's own instrumentation measures at AUC ~0.076, where a
// handful of extra `major` issues dissolve among hundreds at feature scale.
//
// This module computes the SAME underlying statistic (document-wide
// unresolved-question rate) as a bounded, document-level deduction
// candidate, shaped like doctor.ts's `arcIncoherenceDeduction` /
// `dialogueDegradationDeduction`: a feature-scale scene-count floor, a
// minimum-question-count gate, a reference point below which the deduction
// is zero, a linear ramp above it, and a hard cap.
//
// ── What this is NOT ─────────────────────────────────────────────────────
// - NOT wired into health, verdict, grade, or any other user-visible output.
//   `computeQuestionLatencyDeduction` is exported and computed but nothing
//   in server/nvm/analyze/doctor.ts (or any other production path) calls it.
// - NOT measured on the 761-script real-writing corpus. The screen doc above
//   measured candidate 5 on only 26 in-repo scripts and found it
//   UNDERPOWERED, not refuted: only 8/26 scripts raised even one substantive
//   dialogue question (calibration samples run 300-360 words). This file's
//   own probe (scripts/probe-question-latency-deduction.mjs) extends that to
//   the 30 in-repo scripts (adding the 4 structural-form-experiment
//   fixtures) and remains honestly underpowered for the same reason.
// - NOT a wiring decision. Whether to route payoff.ts's three question-
//   latency rules through this deduction instead of (or in addition to)
//   their current ordinary-issue path requires the maintainer's local
//   `measure-auc-split.mjs --with-question-latency-deduction` run against
//   the real corpus, holding the AUC-24 ratchet in
//   tests/core/real-script-corpus.test.ts (>= 0.622, ONE combined
//   shuffle+drop degradation) as the floor it must not regress below. See
//   CLAUDE.md's "Which floor, exactly" section for why that number, and only
//   that number, is the relevant gate for this change.
//
// ── Field contract this reads ────────────────────────────────────────────
// questionsRaised / questionsResolved / questionsResolvedSameScene /
// questionsUnresolved are documented optional on ScreenplaySceneRecord
// (memory.ts ~line 98): populated only by fountain-analyzer.ts's
// detectQuestionLatency (the ops-derived path has no raw dialogue text to
// lex-match against). Per that doc comment's own precedent, absence is
// treated as 0 for every field here (`?? 0`), matching every other optional
// per-scene channel in this codebase (relationshipShifts, powerHolder,
// speakingCharacterCount).
//
// By detectQuestionLatency's own construction, every question raised is
// either matched somewhere (resolved) or never matched (unresolved) — there
// is no third outcome — so document-wide raised === resolved + unresolved
// exactly. This module does not rely on that identity (it computes
// unresolvedRate directly off questionsUnresolved/questionsRaised, not by
// subtracting resolved from raised), but the identity is worth stating
// because it is why a resolvedRate-based formula and an unresolvedRate-based
// formula would be equivalent in effect, and this module picks the latter
// because "rate of loose threads" is the more direct read of the failure
// mode described in the screen doc.

import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';

export interface QuestionLatencyDeductionResult {
  /** Document-wide substantive dialogue questions raised (sum across all records). */
  raised: number;
  /** Document-wide questions resolved anywhere, any latency (sum across all records). */
  resolved: number;
  /** questionsUnresolved-sum / raised, or null when raised === 0 (rate undefined, not zero —
   *  a script with no questions has no unresolved-question PROBLEM, but reporting 0 here would
   *  make "no questions asked" and "every question answered" indistinguishable in the returned
   *  stats, even though only the latter is a real signal). */
  unresolvedRate: number | null;
  /** The bounded deduction candidate, 0 when any gate fails or the rate is at/below reference. */
  deduction: number;
  /** True only when BOTH gates passed (feature-scale scene count AND minimum question count) —
   *  i.e. the deduction reflects a genuine rate computation rather than being forced to 0 by a
   *  floor. A gated=false, deduction=0 result means "not enough material to trust a verdict
   *  either way," not "this script's questions are healthy." */
  gated: boolean;
}

/** Feature-scale floor: below this scene count, the deduction is always 0. Mirrors
 *  doctor.ts's ARC_DED_MIN_SCENES (arcIncoherenceDeduction) exactly, on the same
 *  reasoning: all 20 band-labeled calibration-corpus samples (server/nvm/analyze/
 *  calibration/corpus.ts) and all 6 discrimination-pairs fixtures run well under 15
 *  scenes, so this floor keeps both suites byte-identical to this module's absence —
 *  no calibration/discrimination re-lock is needed by adding this file. (The 4
 *  structural-form-experiment fixtures are NOT guaranteed to clear this floor — two of
 *  the four run 16 scenes — but that suite carries no locked score, only order-
 *  sensitivity probes, so a nonzero deduction there is not a compatibility break.) */
function minScenesFloor(): number {
  return 15;
}

/** Minimum document-wide questions raised before the rate is trusted. Reuses the exact
 *  threshold payoff.ts's own UNANSWERED_QUESTION_FLOOD rule (Wave 1182,
 *  ~line 6612) already established for "enough questions that a resolution rate means
 *  something" — below it, a 2-question script going 1/2 unresolved would read as a
 *  catastrophic 50% rate off a single missed thread, which is exactly the "two-question
 *  script swinging the deduction" failure mode this gate exists to block. */
function minRaisedFloor(): number {
  return 6;
}

/** unresolvedRate at/below this value costs nothing — some fraction of dialogue
 *  questions going unanswered is normal, even deliberate (a mystery's core question, a
 *  running gag, a rhetorical beat never meant to resolve). Chosen below payoff.ts's own
 *  UNANSWERED_QUESTION_FLOOD firing point (resolutionRate <= 0.15, i.e. unresolvedRate
 *  >= 0.85) on purpose: that rule's threshold was tuned for "fire a discrete major
 *  issue only in the most extreme case," which is exactly the kind of all-or-nothing
 *  cliff this re-routing exists to replace with a continuous, order-sensitive ramp that
 *  can move well before a script reaches that extreme. */
function referenceRate(): number {
  return 0.25;
}

/** Points of deduction per unit of unresolvedRate above the reference. Chosen so the
 *  ramp reaches exactly the cap (see below) at unresolvedRate = 1.0 (every raised
 *  question permanently unresolved) — CAP / (1 - REF) = 15 / 0.75 = 20 — rather than an
 *  arbitrary steeper or shallower slope: the worst-case document-wide rate maps to
 *  exactly the worst-case deduction, with no headroom wasted and no need for the cap to
 *  bind before the formula's own natural ceiling. */
function rateSlope(): number {
  return 20;
}

/** Hard cap, same order of magnitude as the other bounded structural deductions
 *  (arcIncoherenceDeduction's cap is 15, dialogueDegradationDeduction's is 18) so this
 *  candidate — if ever wired — could not alone move health further than the existing
 *  structural channels already can. */
function deductionCap(): number {
  return 15;
}

/** Document-level, bounded deduction candidate from the existing question-answer
 *  latency channel (questionsRaised / questionsResolved / questionsResolvedSameScene /
 *  questionsUnresolved — see this file's header for the field contract). UNWIRED: see
 *  header for the full disclaimer. Every constant is function-local per CLAUDE.md's
 *  doctor.ts<->reference.ts temporal-dead-zone gotcha, even though this module has no
 *  circular import today — the discipline is cheap insurance against the same class of
 *  bug if this file ever grows one. */
export function computeQuestionLatencyDeduction(
  records: ScreenplaySceneRecord[],
): QuestionLatencyDeductionResult {
  const MIN_SCENES = minScenesFloor();
  const MIN_RAISED = minRaisedFloor();
  const REF_RATE = referenceRate();
  const SLOPE = rateSlope();
  const CAP = deductionCap();

  let raised = 0;
  let resolved = 0;
  let unresolved = 0;
  for (const r of records) {
    raised += r.questionsRaised ?? 0;
    resolved += r.questionsResolved ?? 0;
    unresolved += r.questionsUnresolved ?? 0;
  }

  const unresolvedRate = raised > 0 ? unresolved / raised : null;

  const sceneGatePassed = records.length >= MIN_SCENES;
  const questionGatePassed = raised >= MIN_RAISED;
  const gated = sceneGatePassed && questionGatePassed;

  let deduction = 0;
  if (gated && unresolvedRate !== null) {
    deduction = Math.min(CAP, SLOPE * Math.max(0, unresolvedRate - REF_RATE));
  }

  return { raised, resolved, unresolvedRate, deduction, gated };
}
