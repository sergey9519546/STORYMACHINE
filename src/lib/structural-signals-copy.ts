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

// ─── Signal-value precision (2026-09-06, docs/audits/2026-09-06-mistake-
// search/findings/B-client.md B-7 + the follow-on "signal precision" pass
// the provenance review deferred) ───────────────────────────────────────
//
// The PROBLEM: `meanAbsDialogueShareDelta` and `actionSentenceCvOverall`
// were printed with a bare `.toFixed(2)` at every call site across six
// surfaces — the panel's Shape & Rhythm strip and its fix-and-verify receipt
// (ScriptDoctorPanel.tsx), the exported coverage HTML and letter
// (server/lib/coverage-html.ts, coverage-letter.ts), the What-If Lab /
// Versions draft trend (WhatIfPanel.tsx, SnapshotManager.tsx's
// ShapeRhythmTrendLine), and the Slate triage table (SlatePanel.tsx,
// server/lib/slate.ts). Two distinct failures follow from a FIXED
// 2-decimal floor: a genuinely nonzero reading below 0.005 prints as "0.00"
// (indistinguishable from an actual zero), and two genuinely different
// readings that are close enough to tie at 2 decimals (e.g. 0.5 vs 0.5001)
// print as identical numbers with no signal that a comparison even
// happened — silently implying "no change" for a real, if small, one.
//
// INPUT CONTRACT (2026-09-06 review, round 1, follow-up 3): both fields are
// rounded to 4 decimal places AT THE SOURCE before this module ever sees
// them — server/nvm/analyze/structural-signals.ts:503
// (`meanAbsDialogueShareDelta: r4(mean(absDeltas))`) and :514
// (`actionSentenceCvOverall: r4(cv(allActionSentenceLens))`), where `r4()`
// is `Number.isFinite(n) ? Math.round(n * 10_000) / 10_000 : 0`
// (structural-signals.ts:192). The 4-decimal CEILING below is "total
// fidelity" ONLY because of this precondition — every value either of
// these functions is ever called with, in this codebase, is an exact
// multiple of 0.0001 (or exactly 0). Pinned from the source side by
// tests/core/structural-signal-precision-consistency.test.ts's "r4() input
// contract" block, which calls the real `computeStructuralSignals()` and
// asserts both aggregates land on the 0.0001 grid. Feed either function an
// UNROUNDED number from outside that contract (a raw computed mean, a
// value read from some future sixth source) and the ceiling stops being a
// fidelity guarantee: `0.00001` and `0.00002` both round to `"0.0000"` and
// would render `"0.0000 (no measured change)"` — a false claim about two
// genuinely different numbers, not merely an imprecise one. Do not call
// either export with anything but an `r4()`-rounded (or exactly
// hand-authored 4-dp) reading.
//
// The FIX, mirrored from how the health delta already prints (before/after
// at the delta's own precision, not a fixed one — see FixStructuralSignalsStrip's
// 2026-09-05 comment, superseded by this module): `formatSignalValue`
// widens a single reading past the 2-decimal floor only far enough to stop
// showing a truly nonzero value as "0.00" (never below the floor, never
// past the ceiling). `formatSignalDelta` does the same for a before/after
// pair, ALSO widening when the two values still tie at a given precision
// despite being genuinely different numbers — so "0.5 -> 0.5001" earns the
// full 4 decimals it needs to show as a change at all, while "0.10 -> 0.12"
// (already legible at the floor) stays at 2. Two values that are EXACTLY
// equal (not merely tied after rounding) render an explicit "(no measured
// change)" instead of a bare repeated number, so a reader never has to
// guess whether an unchanged-looking pair was actually compared.
//
// DELIBERATE DEVIATION FROM THE BRIEF'S WORDING (2026-09-06 review, round 1,
// follow-up 2): the brief that commissioned this module asked for "the
// fewest decimals at which before and after differ". Applied literally to
// this module's own motivating example, `0.0042 -> 0.0254`, that rule
// returns 2 — the two values ALREADY read as different strings at 2
// decimals ("0.00" vs "0.03") — which re-ships the exact bug the brief was
// written to fix (a genuinely nonzero 0.0042 still displays as "0.00", and
// the implied delta of +0.03 overstates the true +0.0212 by 42%). What
// `deltaPrecision` actually implements is a strict superset: the fewest
// decimals at which (a) NEITHER genuinely-nonzero value displays as zero
// AND (b) the two are not tied — `hidesNonzeroAsZero` below is precondition
// (a); the literal brief text only ever tested (b). This is why
// `0.0042 -> 0.0254` renders `"0.004 -> 0.025"` rather than `"0.00 ->
// 0.03"`.
//
// ONE implementation, imported by all six surfaces — never a seventh
// hand-typed `.toFixed(2)` on either aggregate, including through a
// renamed local alias (checked by the same consistency test's whole-tree
// guard). Pure, no I/O, no randomness, and NOT reachable from
// server/nvm/analyze/doctor.ts's import graph (this module only formats
// numbers doctor.ts already computed; it never feeds back into scoring) —
// presentation only, like the label above. Tested for cross-surface
// agreement by tests/core/structural-signal-precision-consistency.test.ts.

/** Never show fewer than 2 decimals (today's existing floor, so an
 *  already-legible pair like 0.10 -> 0.12 renders exactly as it always
 *  has) and never more than 4 (the source's own `r4()` rounding
 *  resolution — beyond this, both values are shown with total fidelity, so
 *  there is nothing left to widen for). */
export const SIGNAL_VALUE_FLOOR_PRECISION = 2;
export const SIGNAL_VALUE_CEILING_PRECISION = 4;

/** True when rounding `value` to `precision` decimals would display a
 *  genuinely nonzero reading as exactly zero — the "0.0042 renders as
 *  0.00" failure mode, evaluated at one candidate precision. */
function hidesNonzeroAsZero(value: number, precision: number): boolean {
  return value !== 0 && Number(value.toFixed(precision)) === 0;
}

/** A single structural-signal reading, at the fewest decimals (from the
 *  floor) that stop it displaying as zero when it isn't one. `opts.precision`
 *  sets the starting point (defaults to the floor); it is still clamped to
 *  [floor, ceiling] and still widened past that if it would hide a nonzero
 *  value, so a caller can never accidentally request a MISLEADING low
 *  precision, only a lower one that happens to already be safe. */
export function formatSignalValue(value: number, opts?: { precision?: number }): string {
  let precision = Math.max(
    SIGNAL_VALUE_FLOOR_PRECISION,
    Math.min(SIGNAL_VALUE_CEILING_PRECISION, opts?.precision ?? SIGNAL_VALUE_FLOOR_PRECISION),
  );
  while (precision < SIGNAL_VALUE_CEILING_PRECISION && hidesNonzeroAsZero(value, precision)) {
    precision += 1;
  }
  return value.toFixed(precision);
}

/** The fewest decimals (from the floor, up to the ceiling) at which
 *  `before` and `after` are both faithfully nonzero (when they genuinely
 *  are) AND visibly different from each other (when they genuinely are).
 *  Falls back to the ceiling when even full source-rounding precision
 *  cannot separate them — the "no measured change" case formatSignalDelta
 *  renders explicitly rather than silently. */
function deltaPrecision(before: number, after: number): number {
  for (let p = SIGNAL_VALUE_FLOOR_PRECISION; p < SIGNAL_VALUE_CEILING_PRECISION; p++) {
    const stillTied = before !== after && before.toFixed(p) === after.toFixed(p);
    if (!hidesNonzeroAsZero(before, p) && !hidesNonzeroAsZero(after, p) && !stillTied) return p;
  }
  return SIGNAL_VALUE_CEILING_PRECISION;
}

/** No live call site sends `formatSignalDelta` anything but two required,
 *  finite numbers today (checked across all six importers, 2026-09-06
 *  review round 1, follow-up 4) — but this is a shared module now, six
 *  importers deep, and a shared formatter should not be one stale
 *  localStorage snapshot or one future caller's optional field away from
 *  throwing a blank panel. `true` only for a value this module can safely
 *  hand to `.toFixed()`. */
function isReadableSignal(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** The shared "nothing to show" rendering for a reading this module was
 *  asked to format but cannot (missing, `null`, or non-finite) — the same
 *  em-dash convention SlatePanel.tsx/server/lib/slate.ts already use for an
 *  unscored row, rather than a distinct sentinel this module would be
 *  introducing on its own. */
const SIGNAL_UNREADABLE_TEXT = '—';

/** THE one before/after rendering for a structural-signal aggregate, for
 *  every surface that shows one: `"<before> -> <after>"` at the precision
 *  the pair needs to read honestly, or `"<before> (no measured change)"`
 *  when the two are equal at that precision (exactly equal, or tied even
 *  at the ceiling). `after` missing, `null`, or non-finite (no
 *  candidate/comparison to show) falls back to the single-value rendering
 *  of `before` — and `before` is guarded the SAME way, symmetrically,
 *  falling back to the single-value rendering of `after`: a shared
 *  formatter must never throw on a caller's missing reading just because
 *  it arrived on the side this module happened to write first. Both
 *  missing/invalid renders the shared unreadable-signal text, never a
 *  crash. */
export function formatSignalDelta(
  before: number | null | undefined,
  after: number | null | undefined,
): string {
  const b = isReadableSignal(before) ? before : undefined;
  const a = isReadableSignal(after) ? after : undefined;
  if (b === undefined && a === undefined) return SIGNAL_UNREADABLE_TEXT;
  if (b === undefined) return formatSignalValue(a as number);
  if (a === undefined) return formatSignalValue(b);
  const precision = deltaPrecision(b, a);
  const beforeText = b.toFixed(precision);
  const afterText = a.toFixed(precision);
  if (beforeText === afterText) return `${beforeText} (no measured change)`;
  return `${beforeText} → ${afterText}`;
}
