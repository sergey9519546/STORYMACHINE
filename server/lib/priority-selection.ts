// ONE selection of "the things to fix first", for every surface that prints
// them — the producer tier, the coverage letter, the exported coverage HTML
// and the in-app Script Doctor panel.
//
// ── Why this exists (2026-09-12, adversarial finding #8) ────────────────────
//
// src/lib/priorities-copy.ts was written 2026-09-11 so that the list has ONE
// heading everywhere. It does. What nobody checked was what goes UNDER that
// heading, and the coverage letter printed the same heading twice over two
// different lists:
//
//   server/lib/reader-tier.ts     suppressContradictoryFindings(topPriorities).slice(0, 3)
//   server/lib/coverage-letter.ts [...anchored, ...unanchored].slice(0, 3)
//   server/lib/coverage-html.ts   suppressContradictoryFindings(topPriorities)
//   ScriptDoctorPanel.tsx         report.topPriorities            <- no filter at all
//
// MEASURED on data/screenplays/runoff.fountain, one exported letter, one
// contentHash (tests/core/priority-selection-one-list.test.ts re-measures it):
//
//   page one  1 CRITICAL — Conflict layer
//             2 MAJOR — Scene 5 (midpoint) — p. 3
//             3 MAJOR — Overall structure
//   the body  1 MAJOR — Scene 5 (midpoint)
//             2 MAJOR — End of Act 1 (Scene ~3)
//             3 MAJOR — End of Act 2 (Scene ~7)
//
// The only CRITICAL finding in the report is on page one and absent from the
// body's "3 things to fix first". A writer working from the back of the letter
// never touches it — and the same letter therefore disagrees with the coverage
// HTML exported from the same hash, which led with the CRITICAL.
//
// The letter's re-sort was `[...anchored, ...unanchored]` — location-anchored
// findings first, no contradiction filter — which is exactly what demoted the
// document-anchored CRITICAL ("Conflict layer") below three scene-anchored
// MAJORs. It is gone rather than moved here: the canonical order IS severity
// first (server/nvm/analyze/prioritize.ts builds it that way and the panel, the
// tier and the HTML all render it), so applying an anchored-first re-sort in
// this one function would push the same CRITICAL down on every surface instead
// of one. Nothing is lost by removing it — the letter body now renders the
// WHOLE list, so every finding the re-sort used to lift into the top three is
// still printed, in the order the engine ranked it. This mirrors the same
// file's 2026-09-11 removal of its local `severityRank()` for the same reason.
//
// Pure: no I/O, no clock, no randomness, and — like src/lib/priorities-copy.ts
// — safe in the browser bundle. Its one dependency
// (server/nvm/analyze/prioritize.ts) imports nothing but types.
//
// NOT on the scoring path: this decides what a rendered document SHOWS out of
// a list the doctor already produced and ranked. It cannot change a health, a
// verdict, a dimension or an issue count. Verified by
// `node scripts/check-scoring-receipt.mjs`.

import { suppressContradictoryFindings } from '../nvm/analyze/prioritize.ts';
import type { ScriptDoctorReport } from '../nvm/analyze/types.ts';

/** The element type of `ScriptDoctorReport['topPriorities']` — a RevisionIssue
 *  tagged with the pass that raised it. Named so the three call sites and their
 *  tests can say what they hold without re-spelling the intersection. */
export type PriorityIssue = ScriptDoctorReport['topPriorities'][number];

/**
 * THE list, in THE order: the report's own top priorities with the
 * contradictory-pair suppression applied, and nothing else done to them.
 *
 * `suppressContradictoryFindings` is order-preserving and one-directional (see
 * its own header), so this is the engine's ranking minus the losing half of any
 * fired contradiction — never a re-rank. A surface renders a PREFIX of this
 * list; it never renders a different list.
 *
 * Tolerates `undefined` because `ScriptDoctorReport['topPriorities']` is
 * optional on reconstructed report shapes (scripts/generate-p0-sample-report.ts
 * builds one by hand) and three of the four call sites already had to write
 * `?? []` themselves.
 */
export function orderedPriorities(
  topPriorities: readonly PriorityIssue[] | undefined,
): PriorityIssue[] {
  return suppressContradictoryFindings([...(topPriorities ?? [])]);
}

/**
 * The first `count` of that list — what a summary-length surface leads with.
 *
 * Takes the raw report field rather than an already-ordered array so a caller
 * cannot slice first and suppress second, which is a different list whenever a
 * suppressed finding sits inside the slice: the tier would then lead with two
 * findings and a hole. A non-finite or negative count yields an empty list
 * rather than throwing — a reading order is not the place to fail a report.
 */
export function leadingPriorities(
  topPriorities: readonly PriorityIssue[] | undefined,
  count: number,
): PriorityIssue[] {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return orderedPriorities(topPriorities).slice(0, n);
}
