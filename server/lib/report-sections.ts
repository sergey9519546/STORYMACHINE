// The exported coverage report's section titles, and the ONE way one section
// refers to another.
//
// ── Why this exists (2026-09-12, adversarial finding #16) ───────────────────
//
// The exported report told its reader to read a section that no longer exists:
//
//   "The 16 findings below cluster the detailed issue list by where they land
//    in the script — read after Top Priorities, alongside the full appendix."
//
// The 2026-09-11 heading consolidation (src/lib/priorities-copy.ts) renamed
// that section. A real export of data/screenplays/runoff.fountain contains
// "The 3 things to fix first" (the tier), "The 10 things to fix first" (the
// full list) and NO "Top Priorities" heading at all — the only occurrence of
// that phrase in the whole document is the cross-reference pointing at it.
// `grep -c "Top Priorities" RUNOFF.coverage.html` -> 1.
//
// ── The rule ────────────────────────────────────────────────────────────────
//
// A heading and a reference to that heading are the SAME string, from here.
// Two consequences, and the second is the one that makes this a guard rather
// than a tidy-up:
//
//   1. Renaming a section renames every reference to it, because there is one
//      place to rename.
//   2. A cross-reference is rendered as `<span class="xref">…</span>`, so the
//      claim "every reference resolves" is CHECKABLE by machine rather than by
//      reading: tests/core/report-cross-references.test.ts extracts every
//      `.xref` from a rendered document and requires each one to name a heading
//      that same document rendered. A reference to a section that was not
//      rendered — because it was renamed, or because that section is
//      conditional and absent for this report — fails there.
//
// The priorities heading is deliberately NOT a constant here: its text states
// a COUNT ("The 10 things to fix first") and comes from
// src/lib/priorities-copy.ts's prioritiesHeadingFor, so a reference to it is
// interpolated from the same function that printed it, with the same count.
//
// Pure, no I/O. NOT on the scoring path.

/**
 * Every fixed section title the exported coverage HTML renders, in document
 * order. The priorities section is absent by design (see the header).
 *
 * `checksThatFoundNothing` and `strengthsCaption` are not re-spelled here —
 * they come from server/lib/strengths-copy.ts, which the coverage letter and
 * the in-app panel also read, and a second copy of that title in this file
 * would be exactly the defect this module exists to prevent.
 */
export const REPORT_SECTION = {
  craftDimensions: 'Craft Dimensions',
  structuralAnalysis: 'Structural Analysis',
  sceneHeatmap: 'Scene Heatmap',
  structuralSignals: 'Structural Signals (new, unwired diagnostics)',
  rootCauses: 'Root Causes',
  recurringIssueClusters: 'Recurring Issue Clusters',
  fullPassAppendix: 'Full Pass Appendix',
} as const;

export type ReportSectionTitle = (typeof REPORT_SECTION)[keyof typeof REPORT_SECTION];

/**
 * A cross-reference to another section of the SAME document, marked so it can
 * be checked.
 *
 * `escape` is passed in rather than imported: server/lib/coverage-html.ts owns
 * the one `escapeHtml` this document is rendered with (the XSS guard its own
 * tests pin), and importing a second escaper here would be a second
 * implementation of the thing that must have exactly one.
 *
 * The rendered span carries the title as its TEXT, so the checker reads what
 * the reader reads — not an id attribute that could point at the right section
 * while the visible words point at a renamed one, which is the failure mode
 * this whole module is about.
 */
export function sectionXrefHtml(title: string, escape: (s: string) => string): string {
  return `<span class="xref">${escape(title)}</span>`;
}

/** Every `.xref` a rendered document contains, as the titles they name, in
 *  document order. The inverse of `sectionXrefHtml`, kept beside it so the two
 *  cannot drift — the same formatter/parser-live-together discipline
 *  server/lib/artifact-claims.ts records. Exported for the test and for any
 *  future checker; the renderer never calls it. */
export function xrefTitlesIn(html: string): string[] {
  return [...html.matchAll(/<span class="xref">([\s\S]*?)<\/span>/g)].map(m => m[1]);
}

/** Every `<h2>` the document rendered, as plain heading text with any trailing
 *  badge span removed (server/lib/coverage-html.ts's Structural Analysis
 *  heading carries the diagnostic badge inside its own `<h2>`). */
export function headingTitlesIn(html: string): string[] {
  return [...html.matchAll(/<h2>([\s\S]*?)<\/h2>/g)]
    .map(m => m[1].replace(/<span[^>]*>[\s\S]*?<\/span>/g, '').trim());
}
