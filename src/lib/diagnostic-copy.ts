// One label for "this number is a diagnostic, not the health of your draft".
//
// ── Why this exists (2026-09-12, adversarial finding #9) ────────────────────
//
// On the product's own demo script one report stated three different health
// numbers. The header said HEALTH 78 (the doctor's verdict). The "Story
// Structure Analysis" card said "Health score: 35/100". The "Structural
// Analysis" card said "Graph Health 37/100 −9hp" — the deduction printed in the
// same "hp" unit as the headline, in stamp red, with no caption. A reader had no
// way to know which number was the health of their draft, or that 9 points had
// not in fact been taken off anything.
//
// `server/nvm/analyze/types.ts` already says what those panels are. Verbatim,
// from the `graphHealth` field's own doc comment: "`graphDeduction` is a
// potential 0–15 point value, NOT part of health/verdict until repaired graph
// extraction passes real-writing calibration." The panels were right to exist
// and wrong to be unlabelled.
//
// This module is the single label, so the two sites that render a diagnostic
// score cannot say it two ways — the same one-implementation rule
// src/lib/percentile-copy.ts's header records for the percentile copy, after
// that copy was found living as four independent hand-copies. The repo already
// had the right precedent for the WORDING two sections above the graph card:
// "SHAPE & RHYTHM · DESCRIPTIVE — NOT PART OF THE SCORE".
//
// Pure, no I/O — safe to import from the browser bundle and from a server
// renderer. It is NOT reachable from server/nvm/analyze/doctor.ts and must stay
// that way: it is presentation copy, and nothing here may ever feed a score.

/** The short badge, for a section header or beside a number. Rendered in the
 *  panel's caption tier, never as a heading. */
export const DIAGNOSTIC_NOT_IN_HEALTH_LABEL = 'Diagnostic — not part of Health';

/** The sentence form, for a caption under a card that carries such a number.
 *  `subject` names the number the reader is looking at, so the caption cannot be
 *  read as applying to the headline health above it. */
export function diagnosticNotInHealthSentence(subject: string): string {
  return `${subject} is a diagnostic reading of the story graph. It is not part of `
    + 'the Health score or the verdict above, and nothing here has been added to or '
    + 'subtracted from them.';
}

/** The one number on the report that IS the health of the document, named so a
 *  reader of a diagnostic caption knows where to look instead. */
export const THE_ONE_HEALTH_NUMBER = 'the Health score in the header';

// ── A deduction the engine computed and did NOT take ────────────────────────
//
// 2026-09-12, adversarial finding #11. The panel rendered the graph diagnostic
// as `37/100 −9hp`, the `−9hp` in stamp red, in the same "hp" unit as the
// headline health, with no caption. `server/nvm/analyze/types.ts:403-405` says
// what that number is, verbatim: "`graphDeduction` is a potential 0-15 point
// value, NOT part of health/verdict until repaired graph extraction passes
// real-writing calibration." The exported coverage HTML was worse — it labelled
// the row "→ Health deduction" and printed "−9", which is a sentence claiming
// nine points came off the health above it.
//
// A minus sign in front of a points figure means one thing to every reader:
// this was taken off. So the figure is never rendered signed. The label states
// the conditional, the value states the magnitude and the fact that it is not
// applied, and the caption above (diagnosticNotInHealthSentence) states what
// the whole card is. One implementation, because the defect was two surfaces
// each inventing their own rendering of the same field.
//
// NOT a removal: the number itself still renders on both surfaces, and the
// findings under it are untouched. What changed is that it no longer reads as
// arithmetic that has already happened.

/** The row label for an unapplied deduction. Conditional by construction —
 *  "would", not "did" — so the label alone cannot be misread. */
export const UNAPPLIED_DEDUCTION_LABEL = 'Would deduct if enabled';

/**
 * The row VALUE for an unapplied deduction: `up to 9 pts — not applied`.
 *
 * Never signed, and never in the headline's "hp" unit. `Math.max(0, …)` because
 * a potential deduction is a magnitude: a negative arrival would otherwise
 * render "up to -3 pts", reintroducing the minus sign this function exists to
 * remove. A non-finite value degrades to 0 rather than printing "up to NaN pts".
 */
export function unappliedDeductionReading(points: number): string {
  const n = Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0;
  return `up to ${n} pt${n === 1 ? '' : 's'} — not applied`;
}

/** Label and value as one string, for a surface with a single text slot (the
 *  panel's value cell, where the label and the reading share one line). */
export function unappliedDeductionLine(points: number): string {
  return `${UNAPPLIED_DEDUCTION_LABEL}: ${unappliedDeductionReading(points)}`;
}
