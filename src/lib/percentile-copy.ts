// Single source of truth for the calibration-reference-set percentile
// display copy: ordinal suffixing, the D5 false-precision band, and the
// sentences every surface renders around them.
//
// 2026-09-04 review finding: after the first pass of the cross-surface
// parity lane, `ordinal()`/`percentileBand()` existed as FOUR independent
// hand-copies (ScriptDoctorPanel.tsx, server/lib/coverage-html.ts,
// SnapshotManager.tsx, SlatePanel.tsx) with no test comparing any two of
// them — and one of the four had already silently dropped "hand-authored
// synthetic" from its sentence, the qualifier that stops a reader assuming
// the percentile is a comparison against real scripts. This module is the
// fix: ONE implementation, imported by all four surfaces (server files in
// this codebase already import directly from src/lib — see
// server/routes/export.ts's imports of ../../src/lib/fountain.ts, fdx.ts,
// docx.ts — so this is an established pattern, not a new one), plus
// tests/core/percentile-copy-consistency.test.ts asserting no surface
// re-implements its own copy.
//
// Pure, no I/O, no randomness — safe to import from both the browser bundle
// and the server.

/** The calibration reference set (server/nvm/analyze/calibration/corpus.ts)
 *  is 20 hand-authored synthetic scripts. Every percentile shown anywhere
 *  in the product is ranked against exactly this set. */
export const REFERENCE_SET_SIZE = 20;
export const REFERENCE_SET_LABEL = 'hand-authored synthetic reference set';

/** Ordinal suffix ("1st", "2nd", "3rd", "4th"…) — handles the 11-13 teens
 *  exception (11th/12th/13th, not 11st/12nd/13rd). */
export function ordinal(n: number): string {
  const rounded = Math.round(n);
  const mod100 = rounded % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rounded}th`;
  switch (rounded % 10) {
    case 1: return `${rounded}st`;
    case 2: return `${rounded}nd`;
    case 3: return `${rounded}rd`;
    default: return `${rounded}th`;
  }
}

/** D5 (docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md) false-precision
 *  presentation fix. The 20-sample reference set is worth 5 raw points of
 *  resolution per sample, so an exact ordinal ("100th") reads as far more
 *  precise than 20 data points can support — the same tell as a
 *  one-decimal sub-score on thin evidence. This buckets to the nearest 10
 *  for the glanceable text; the exact ordinal stays available via
 *  `exactRankTooltip` below, so nothing is deleted — only the headline
 *  precision is scoped down to what the sample size actually backs. */
export function percentileBand(pct: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  if (clamped >= 90) return 'top 10%';
  if (clamped <= 10) return 'bottom 10%';
  const topShare = Math.ceil((100 - clamped) / 10) * 10;
  return `top ${topShare}%`;
}

/** Tooltip text for the exact (un-bucketed) rank — the same string every
 *  percentile badge/line in the product carries in its `title`. */
export function exactRankTooltip(pct: number): string {
  return `Exact rank: ${ordinal(pct)} of ${REFERENCE_SET_SIZE} reference samples`;
}

/** The full headline sentence — "Health percentile: <band> within a
 *  20-sample, hand-authored synthetic reference set" — used by
 *  ScriptDoctorPanel.tsx and the exported coverage HTML
 *  (server/lib/coverage-html.ts). */
export function healthPercentileSentence(pct: number): string {
  return `Health percentile: ${percentileBand(pct)} within a ${REFERENCE_SET_SIZE}-sample, ${REFERENCE_SET_LABEL}`;
}

/** The compact form for space-constrained list rows (the Versions list) —
 *  keeps the same "hand-authored synthetic" qualifier the full sentence
 *  has, just without the "Health percentile:" label prefix a list row's
 *  own heading already supplies context for. */
export function compactPercentileNote(pct: number): string {
  return `${percentileBand(pct)} of a ${REFERENCE_SET_SIZE}-sample, ${REFERENCE_SET_LABEL}`;
}
