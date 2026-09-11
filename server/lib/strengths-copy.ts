// The title and caption for the section that lists checks which did not fire —
// one wording for the exported coverage HTML, the coverage letter, and the
// in-app panel.
//
// ── Why the framing changed (2026-09-11, producer-tier discovery #8) ─────────
//
// THE DEFECT, as reported: "the overall score and the five dimension scores
// contradict each other in the same paragraph". A report can open with
// "overall score 84/100" and, four lines down, show a dimension at 0/100 — and
// directly below that sat a section headed "What's Working" listing earned
// strengths, which reads as the report ARGUING that the draft is working.
//
// It is not an argument. server/nvm/analyze/doctor.ts's buildStrengths emits one
// entry per CHECK THAT DID NOT FIRE: "No scene runs over its length budget" is
// the absence of a finding, not praise, and a list of absences cannot offset a
// dimension score.
//
// ── What is fixed here, and what is NOT ─────────────────────────────────────
//
// The CONTRADICTION itself lives in buildPlainSummary and buildStrengths, both
// in doctor.ts — the scoring path. This lane stops at that seam by instruction:
// the fix is on the scoring/feature-length-defects branch (commit efc1899d) and
// needs the owner's measurement before it can land. plainSummary is therefore
// still interpolated verbatim by every renderer, byte for byte.
//
// What is fixed on main is the FRAMING: the section is titled what the list
// actually is, and carries one line saying so. Every entry is kept — nothing is
// dropped, reordered or reworded. The caption renders BELOW the decline line (the
// verdict sentence that opens plainSummary), so every byte above it is unchanged.

/** The section's title. "Checks That Found Nothing" — a description of the list,
 *  not a verdict on the draft. */
export const STRENGTHS_SECTION_TITLE = 'Checks That Found Nothing';

/** One line, immediately under the title, saying what the entries are and what
 *  they are not. The second clause is the load-bearing one: without it a reader
 *  holding a report whose dimensions disagree with its overall score has no way
 *  to know this list is not the tie-breaker. */
export const STRENGTHS_SECTION_CAPTION =
  'Each line below is a check that did not fire — the absence of a finding, not a '
  + 'judgment that the draft is working. These do not offset the dimension scores above.';
