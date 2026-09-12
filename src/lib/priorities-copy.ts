// One heading for "the things to fix first", across every surface that shows
// them — and a heading that does not promise a count it cannot deliver.
//
// ── Why this exists (2026-09-11, producer-tier discovery #11) ────────────────
//
// Three surfaces named the same list three ways:
//
//   server/lib/coverage-html.ts      <h2>Top Priorities</h2>
//   server/lib/coverage-letter.ts    ## Priorities to Address First
//   ScriptDoctorPanel.tsx            Top Priorities
//
// and the producer tier needed a fourth. Worse than the inconsistency: all three
// are PLURAL regardless of how many items follow. A draft with exactly one
// priority — which the inert 1-scene draft in this repository has — rendered a
// plural heading over a single item, promising a list and delivering a line.
//
// This module is the one place that decides the wording. Pure, no I/O, safe in
// both the browser bundle and the server (src/lib/*-copy.ts is the established
// home for cross-surface copy — see percentile-copy.ts, draft-rank-copy.ts,
// structural-signals-copy.ts, all imported by server renderers).

/**
 * The heading for a priorities list of exactly `count` items.
 *
 *   0 -> 'Nothing urgent surfaced'   (a true statement, not an empty list)
 *   1 -> 'Fix this first'            (NO number, NO plural — one item)
 *   n -> 'The 3 things to fix first' (the count, because it is known and true)
 *
 * The singular form deliberately carries no numeral either: "Fix this 1 first"
 * is worse English than the plural it replaces, and "this" already says one.
 *
 * A negative count is treated as zero rather than throwing — a heading is not
 * the place to fail a report.
 */
export function prioritiesHeadingFor(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (n === 0) return 'Nothing urgent surfaced';
  if (n === 1) return 'Fix this first';
  return `The ${n} things to fix first`;
}

/** The same heading in the ALL-CAPS form the plain-text coverage letter uses for
 *  its section headings. Kept here rather than left to each caller's own
 *  `.toUpperCase()` so the letter's two renderers (markdown and text) cannot
 *  diverge on it. */
export function prioritiesHeadingUpper(count: number): string {
  return prioritiesHeadingFor(count).toUpperCase();
}

/**
 * The inverse: the count a priorities heading STATES, or `null` for a string that
 * is not one of these headings.
 *
 * ── Why an inverse exists (2026-09-12, BUG-1) ───────────────────────────────
 *
 * The producer tier's heading is a number on the page a producer is told to trust
 * — "The 3 things to fix first" — and until now nothing could check it: a hand
 * edit to "The 9 things to fix first" printed VERIFIED at exit 0. The offline
 * verifier (scripts/verify-report.mjs) has to read that count back out of the
 * rendered document to cross-check it against the verify block's claim, and the
 * only safe place for that regex is HERE, beside the formatter it inverts, with a
 * round-trip test over every count (tests/core/artifact-claims.test.ts). A regex
 * in the CLI is how the 2026-09-11 verdict-stamp scrape silently stopped firing
 * when the markup it was pinned to changed.
 *
 * Case-insensitive because the plain-text coverage letter prints the same heading
 * through `prioritiesHeadingUpper`.
 */
export function prioritiesCountFromHeading(heading: string): number | null {
  const trimmed = heading.trim();
  if (/^nothing urgent surfaced$/i.test(trimmed)) return 0;
  if (/^fix this first$/i.test(trimmed)) return 1;
  const m = trimmed.match(/^the (\d+) things to fix first$/i);
  return m ? Number(m[1]) : null;
}
