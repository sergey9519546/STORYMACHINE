// GENERATED FILE — do not edit by hand. Run `npm run generate-p0-sample`.
//
// The start screen's Coverage card, as data (2026-09-12, adversarial audit
// finding #6). Every number here comes from one run of the doctor on
// src/lib/sample-script.ts — the same script "See it on the sample" analyses —
// so the first numbers a stranger sees are the numbers that button produces.
// Before this file existed the card held hardcoded literals (HEALTH 76,
// COUNTS 3 · 38 · 159) that the sample had not produced for some time.
//
// tests/core/sample-coverage-facts.test.ts fails when these values drift from
// a fresh run, so the card cannot silently go stale again.

export interface SampleCoverageFacts {
  /** Title of the sample script these numbers describe. */
  title: string;
  /** The verdict, verbatim (e.g. "CONSIDER"). */
  verdict: string;
  /** Health as the panel shows it — Math.round(report.health). */
  health: number;
  /** Health unrounded, so the drift guard catches a sub-point move. */
  healthExact: number;
  grade: string;
  sceneCount: number;
  critical: number;
  major: number;
  minor: number;
  /** The top priority's own location string — not a hand-written summary. */
  nextFixLocation: string;
  /** The rule that produced it, for the card's title attribute. */
  nextFixRule: string;
  /** "None" keyless; "Deep read" when a report carries an LLM block. */
  llmJudge: string;
  /** The sample's contentHash — the same receipt the report publishes. */
  contentHash: string;
}

export const SAMPLE_COVERAGE_FACTS: SampleCoverageFacts = {
  title: "Dead Frequency",
  verdict: "CONSIDER",
  health: 78,
  healthExact: 78.3,
  grade: "strong",
  sceneCount: 12,
  critical: 2,
  major: 32,
  minor: 139,
  nextFixLocation: "Scene 9 (climax peak)",
  nextFixRule: "PROTAGONIST_PASSIVITY_CLIMAX",
  llmJudge: "None",
  contentHash: "09e8b0381f1fc862619630b5684458bbec6f2c7910d4c0aee7a77ec2c1ec7cb0",
};
