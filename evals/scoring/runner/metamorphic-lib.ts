// Pure helpers for the Phase B metamorphic runner. Kept free of top-level I/O
// so unit tests can import classification without running the doctor.
import type { MetamorphicCase, MetamorphicResult } from '../contracts/scoring-eval-case.ts';
import { HARD_CASE_IDS, KNOWN_FAILING_CASE_IDS } from './metamorphic-cases.ts';

export { HARD_CASE_IDS, KNOWN_FAILING_CASE_IDS } from './metamorphic-cases.ts';

export function check(c: MetamorphicCase, base: number, variant: number): { passed: boolean; reason: string } {
  const d = variant - base;
  switch (c.expect.kind) {
    case 'unchanged':     return { passed: Math.abs(d) <= c.expect.epsilon, reason: `|Δ|=${Math.abs(d).toFixed(2)} ≤ ${c.expect.epsilon}?` };
    case 'not_increase':  return { passed: d <= c.expect.epsilon, reason: `Δ=${d.toFixed(2)} ≤ ${c.expect.epsilon}?` };
    case 'not_decrease':  return { passed: d >= -c.expect.epsilon, reason: `Δ=${d.toFixed(2)} ≥ ${-c.expect.epsilon}?` };
    case 'decrease':      return { passed: d <= -c.expect.minDrop, reason: `Δ=${d.toFixed(2)} ≤ ${-c.expect.minDrop}?` };
  }
}

/** Exit code for a run: nonzero iff any HARD invariant broke. */
export function exitCodeForResults(results: MetamorphicResult[]): number {
  return classifyResults(results).hardFailures.length > 0 ? 1 : 0;
}

/** Classify results into hard failures vs known-failing witnesses. Pure, testable.
 *
 *  `knownFailing` defaults to the live roster, which is currently EMPTY: lane
 *  R5 promoted empty_verbosity — the only case ever held there — to hard on
 *  2026-09-03 (docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md). It is a
 *  parameter so the known-failing branch stays directly testable while the
 *  roster is empty, rather than going unexercised until the next time some
 *  defect has to be held. */
export function classifyResults(results: MetamorphicResult[], knownFailing: ReadonlySet<string> = KNOWN_FAILING_CASE_IDS): {
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
    if (knownFailing.has(r.id)) {
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
