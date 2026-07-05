// Script Doctor — calibration percentile math (Deliverable 2 of the
// calibration feature). Pure, dependency-free number-crunching so it's
// trivially unit-testable without ever running the 14-pass pipeline: feed it
// a sorted array and a value, get a 0-100 rank and a plain-language gloss.
//
// Consumed by doctor.ts's aggregateReport, which ranks a report's health (and
// each dimension's score) against calibration/reference.ts's reference
// corpus distribution to populate ScriptDoctorReport.healthPercentile and
// DimensionScore.percentile/percentileDescriptor (types.ts).

/**
 * 0-100 rank of `value` against `sortedAscending` — "the percentage of the
 * reference distribution at or below value."
 *
 * Definition (the standard "mean rank" / midpoint convention, which is the
 * defensible choice when the distribution can contain duplicate scores):
 * for N samples, count how many are strictly below `value` (call it `below`)
 * and how many equal `value` (call it `at`). The percentile is the midpoint
 * of the value's tie-block:
 *   percentile = 100 * (below + at / 2) / N
 * This is the same rank convention as "mean percentile rank" used by most
 * standardized-test score reports — a value at the exact minimum of the
 * distribution lands near (not at) 0, a value at the exact maximum lands
 * near (not at) 100, and a value equal to every sample (a degenerate
 * single-valued distribution) lands at exactly 50 — neither flattering nor
 * damning when there's no spread to compare against.
 *
 * Clamped to [0, 100] and rounded to the nearest integer for a clean
 * "stronger than N% of the reference set" sentence.
 *
 * Empty distribution -> 50 (neutral midpoint): with zero reference samples
 * there is nothing to rank against, so neither a flattering nor a damning
 * number is defensible. 50 reads as "uncalibrated / no opinion" rather than
 * fabricating a rank from nothing — the caller (doctor.ts) additionally
 * treats an empty distribution as "calibration unavailable" and leaves the
 * percentile fields undefined entirely rather than emitting this neutral 50,
 * but percentileRank itself stays total (never throws) so it's safe to call
 * directly in tests and from any other future caller.
 */
export function percentileRank(value: number, sortedAscending: number[]): number {
  const n = sortedAscending.length;
  if (n === 0) return 50;

  let below = 0;
  let at = 0;
  // Linear scan rather than a binary search: reference corpora are small
  // (tens of samples, per calibration/corpus.ts), so O(n) is imperceptible
  // and the code stays trivially correct — no off-by-one risk from a
  // hand-rolled binary search over a "first index >=" boundary.
  for (const sample of sortedAscending) {
    if (sample < value) below++;
    else if (sample === value) at++;
  }

  const raw = (100 * (below + at / 2)) / n;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Plain-language gloss of a percentile for `subject` (e.g. "health" or a
 * dimension label like "Dialogue & Voice"). Every wording explicitly names
 * "the reference set" rather than implying a claim this feature can't back —
 * see calibration/reference.ts's header comment: this is a small, curated,
 * originally-authored corpus, not "all produced screenplays ever written."
 *
 * Banding (deliberately coarse, not exposing the raw integer twice):
 *   >= 90 -> "in the top 10%"
 *   >= 75 -> "stronger than N% of the reference set" (explicit strong band)
 *   >= 25 -> "stronger than N% of the reference set" (the broad middle)
 *   >= 10 -> "in the bottom quartile"
 *   <  10 -> "in the bottom 10%"
 * The 75/25 boundaries intentionally reuse the same "stronger than N%"
 * sentence shape as the broad middle band — only the two tails (top/bottom
 * 10%) get a distinct superlative phrase, since "stronger than 93% of the
 * reference set" already communicates "top decile" without needing a second,
 * redundant clause.
 */
export function percentileDescriptor(pct: number, subject: string): string {
  const clamped = Math.round(Math.max(0, Math.min(100, pct)));

  if (clamped >= 90) {
    return `${subject} is in the top 10% of the reference set.`;
  }
  if (clamped < 10) {
    return `${subject} is in the bottom 10% of the reference set.`;
  }
  if (clamped < 25) {
    return `${subject} is in the bottom quartile of the reference set.`;
  }
  return `${subject} is stronger than ${clamped}% of the reference set.`;
}
