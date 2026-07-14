// Pure helpers for the Phase B metamorphic runner. Kept free of top-level I/O
// so unit tests can import classification without running the doctor.
import type { MetamorphicCase, MetamorphicResult } from '../contracts/scoring-eval-case.ts';

/** Cases whose failure is a real regression — CI hard-fails on these. */
export const HARD_CASE_IDS = new Set([
  'identity',
  'whitespace_reflow',
  'rename_character',
  'scene_shuffle',
  'scene_reverse',
  'scene_dup_padding',
]);

/**
 * Cases that are expected to fail under the current formula. They remain
 * runnable witnesses so the defect cannot be forgotten, but they do not fail
 * the process until a dedicated re-calibration wave flips them to HARD.
 */
export const KNOWN_FAILING_CASE_IDS = new Set([
  'empty_verbosity',
]);

export function check(c: MetamorphicCase, base: number, variant: number): { passed: boolean; reason: string } {
  const d = variant - base;
  switch (c.expect.kind) {
    case 'unchanged':     return { passed: Math.abs(d) <= c.expect.epsilon, reason: `|Δ|=${Math.abs(d).toFixed(2)} ≤ ${c.expect.epsilon}?` };
    case 'not_increase':  return { passed: d <= c.expect.epsilon, reason: `Δ=${d.toFixed(2)} ≤ ${c.expect.epsilon}?` };
    case 'not_decrease':  return { passed: d >= -c.expect.epsilon, reason: `Δ=${d.toFixed(2)} ≥ ${-c.expect.epsilon}?` };
    case 'decrease':      return { passed: d <= -c.expect.minDrop, reason: `Δ=${d.toFixed(2)} ≤ ${-c.expect.minDrop}?` };
  }
}

/** Classify results into hard failures vs known-failing witnesses. Pure, testable. */
export function classifyResults(results: MetamorphicResult[]): {
  hardFailures: MetamorphicResult[];
  knownFailures: MetamorphicResult[];
  unexpectedPasses: MetamorphicResult[];
  hardPasses: number;
} {
  const hardFailures: MetamorphicResult[] = [];
  const knownFailures: MetamorphicResult[] = [];
  const unexpectedPasses: MetamorphicResult[] = [];
  let hardPasses = 0;
  for (const r of results) {
    if (KNOWN_FAILING_CASE_IDS.has(r.id)) {
      if (r.passed) unexpectedPasses.push(r);
      else knownFailures.push(r);
    } else if (HARD_CASE_IDS.has(r.id)) {
      if (r.passed) hardPasses++;
      else hardFailures.push(r);
    } else if (!r.passed) {
      // Unknown case ids are treated as hard so a future addition cannot silently soft-fail.
      hardFailures.push(r);
    } else {
      hardPasses++;
    }
  }
  return { hardFailures, knownFailures, unexpectedPasses, hardPasses };
}
