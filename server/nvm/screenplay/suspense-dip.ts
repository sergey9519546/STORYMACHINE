// The suspense-dip reversal predicate — ONE definition, 2026-09-04.
//
// ── What this fixes ────────────────────────────────────────────────────────
// `suspenseDelta` is `clamp(Math.round(raw), -3, 5)` (fountain-analyzer.ts's
// detectSuspenseDelta) — an INTEGER after rounding, not a continuum. Every
// reversal check in the revision passes spelled its threshold as
// `suspenseDelta < -1`, which on an integer channel means `<= -2`.
//
// MEASURED (2026-09-04, over the 42 scripts the repository ships — 20
// data/screenplays CC0 fixtures + 20 calibration REFERENCE_CORPUS samples +
// the two matched advice-audit fixtures, boneyard excluded):
//
//     scripts with ANY scene at suspenseDelta <  -1 :   0 / 42
//     scripts with ANY scene at suspenseDelta <= -1 :  24 / 42
//
// Zero of forty-two. `< -1` is not a strict threshold, it is an UNREACHABLE
// one: every rule built on it is a constant. That made NO_REVERSALS (major)
// and NO_REVERSALS_LONG_STORY (critical, 4x weight in the health formula)
// fire on 42 of 42 scripts — a fixed penalty with zero discriminating power
// occupying the #1 and #2 slots of essentially every report the product
// prints, and a fixed subtraction from every script's health.
//
// causality.ts's GOAL_WITHOUT_OPPOSITION had already been fixed to `<= -1`
// (D2-a, 2026-08-03) and its comment argues the craft case correctly: an
// exact -1 is "precisely what a controlled, professional, or subtextual
// pushback/de-escalation beat produces, as opposed to a shouted,
// exclamation-heavy confrontation that racks up enough danger-lexicon hits
// to clear -2. The bug rewarded loud reversals and blinded the check to
// quiet ones." That fix landed in one file of six; this module finishes it.
//
// ── Why a module and not a sed ─────────────────────────────────────────────
// reversal-detection.ts's `legacySuspenseDipCount` already carried the note
// that "there is no single source of truth for it today, which is a
// pre-existing property of the codebase". Three separate subsystems
// (screenplay/structure.ts's `reversalCountEarly`, conflict.ts's
// `reversalCount210`, reversal-detection.ts's legacy comparison stat) each
// re-spelled the same predicate and were required by comment to be changed
// together. They now share this definition instead.
//
// ── What this module does NOT claim ────────────────────────────────────────
// Widening the threshold does not make the suspense channel a good reversal
// detector. It reads a danger/relief LEXICON delta, so it still cannot see a
// betrayal, a broken deal, or a plan backfiring conveyed in prose that does
// not also read as a tension drop — the limitation the NO_REVERSALS finding
// text already discloses to the writer, and the reason
// analyze/reversal-detection.ts exists as an (unwired) second channel. What
// changes here is only that the predicate can now be FALSE for some scripts
// and TRUE for others, which is the minimum requirement for a rule to carry
// any information at all.
//
// NOT changed by this module, deliberately: conflict.ts's DEEP_REVERSAL_HEALS
// uses `< -1.5` (i.e. `<= -2`) and is therefore also unreachable on the
// current channel. It is left alone because widening it to `<= -1` would
// collapse it onto this predicate and make it a duplicate of the ordinary
// reversal checks rather than the "deep spike" check it is documented to be.
// It is recorded as a known-dead predicate in
// docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md, not silently retuned.

/** The integer floor at which a scene's suspense drop counts as a reversal.
 *  A scene qualifies at this value or below (`<=`), not strictly below it. */
export const SUSPENSE_DIP_THRESHOLD = -1;

/** True when a scene's suspenseDelta reads as a suspense-dip reversal.
 *  Accepts the raw field (optional on legacy/ops-path fixtures — absence is
 *  treated as 0, matching every call site's existing `?? 0`). */
export function isSuspenseDip(delta: number | null | undefined): boolean {
  return (delta ?? 0) <= SUSPENSE_DIP_THRESHOLD;
}

/** Count the scenes that read as suspense-dip reversals. One count per scene. */
export function countSuspenseDips(
  records: ReadonlyArray<{ suspenseDelta?: number | null }>,
): number {
  let n = 0;
  for (const r of records) if (isSuspenseDip(r.suspenseDelta)) n++;
  return n;
}
