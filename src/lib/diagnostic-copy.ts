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
