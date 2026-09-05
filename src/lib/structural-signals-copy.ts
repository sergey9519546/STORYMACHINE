// Shared label for ScriptDoctorReport.structuralSignals.actionSentenceCvOverall
// (sd/mean of action-sentence lengths, document-wide — server/nvm/analyze/
// structural-signals.ts). Advisory-only, never wired into health/grade/
// verdict/any priority — see that module's own header.
//
// Review round-2 finding (2026-09-05, layout/reachability lane): the SAME
// number, from the SAME field, was named three different ways across the
// three surfaces that render it:
//   - "Action-prose variation"   (src/components/scriptide/ScriptDoctorPanel.tsx,
//                                  both the scored and the one-scene-unscored
//                                  Shape & Rhythm sections, and the
//                                  fix-and-verify receipt's structural strip)
//   - "action-sentence variation" (server/lib/coverage-html.ts's exported
//                                  report, both the scored summary line and
//                                  the one-scene-unscored notice)
//   - "the sentence-length variation across the draft's action lines"
//                                 (server/lib/coverage-letter.ts's prose,
//                                  both branches)
// The NUMBER agreed everywhere (LANE_STANDARD §2's actual requirement); only
// the label drifted. One label, here, for all three to import — server files
// in this codebase already import directly from src/lib (see
// server/lib/coverage-html.ts's own imports of percentile-copy.ts and
// draft-rank-copy.ts), so this is an established pattern, not a new one.
//
// Pure, no I/O, no randomness — safe to import from both the browser bundle
// and the server. Checked NOT reachable from server/nvm/analyze/doctor.ts's
// import graph (doctor.ts computes the number; it never imports how any
// surface labels it), so a change here never touches the scoring path.
//
// Tested for actual cross-surface agreement by tests/core/
// shape-rhythm-panel-copy.test.ts, tests/core/coverage-html.test.ts, and
// tests/core/coverage-letter.test.ts — each imports this constant rather
// than a copy of the string, so a future edit that types a fourth wording
// directly into one surface fails there instead of silently drifting again.

/** Title-case, matching how the panel's stat-row label already renders on
 *  screen (its `uppercase` Tailwind class transforms this visually in the
 *  two labelled-stat-row sites; the fix-and-verify receipt's inline strip
 *  has no such class and shows this exact casing literally). */
export const ACTION_PROSE_VARIATION_LABEL = 'Action-prose variation';

/** Lowercase form for the two inline, comma/middot-separated summary lines
 *  (coverage-html.ts's scored-section `summary` array and its one-scene
 *  notice) — both already list every OTHER reading in lowercase ("scene-
 *  length variation", "mean talk/action swing", "talk/action range", …), so
 *  this derives from the one canonical string rather than being typed a
 *  second time. */
export const ACTION_PROSE_VARIATION_LABEL_LOWER = ACTION_PROSE_VARIATION_LABEL.toLowerCase();
