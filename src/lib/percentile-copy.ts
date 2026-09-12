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

// ── The reference set's BOUNDS, and the comparability gate ────────────────────
//
// 2026-09-11 (producer-tier discovery #12): the health percentile read 100 for
// every real draft. Not because real drafts are excellent — because the
// reference set is twenty samples of 9-10 scenes and 256-337 words each, by
// deliberate design (corpus.ts's header: band monotonicity is a property of a
// CONTROLLED-RICHNESS design in which every sample shares a scene and word
// budget so craft is the only variable). Rank a 9-scene / 1,448-word short
// against that and it lands at the top of the distribution for being four times
// longer, not for being better. The percentile was measuring length.
//
// So a percentile is only shown when the draft is INSIDE those bounds, and
// "not comparable" is shown when it is not. That is an honest null result, not a
// degradation: the number was never a reading about craft outside this band.
//
// WHY THE NUMBERS ARE LITERALS HERE. This module is imported by the browser
// bundle (ScriptDoctorPanel, SnapshotManager, SlatePanel, WhatIfPanel), and
// deriving the bounds means importing REFERENCE_CORPUS — 1,900 lines of
// screenplay prose — into that bundle. server/lib/reference-bounds.ts DERIVES
// them from the corpus with the same analyzer the doctor uses, and
// tests/core/reference-bounds.test.ts asserts the derived values equal these
// literals. A corpus edit therefore fails CI here rather than silently leaving
// this gate measuring the wrong band.
export const REFERENCE_MIN_SCENES = 9;
export const REFERENCE_MAX_SCENES = 10;
export const REFERENCE_MIN_WORDS = 256;
export const REFERENCE_MAX_WORDS = 337;

export interface ReferenceBoundsShape {
  samples: number;
  minScenes: number;
  maxScenes: number;
  minWords: number;
  maxWords: number;
}

export const REFERENCE_BOUNDS_LITERAL: ReferenceBoundsShape = {
  samples: REFERENCE_SET_SIZE,
  minScenes: REFERENCE_MIN_SCENES,
  maxScenes: REFERENCE_MAX_SCENES,
  minWords: REFERENCE_MIN_WORDS,
  maxWords: REFERENCE_MAX_WORDS,
};

/** A range written the way a reader reads one: "9-10", or "10" when the bound is
 *  degenerate. Never "10-10". */
function boundRange(lo: number, hi: number): string {
  return lo === hi ? `${lo}` : `${lo}\u2013${hi}`;
}

/** "20 samples / 9–10 scenes / 256–337 words" — the confidence line the producer
 *  tier prints under its percentile reading, and the parenthetical the
 *  not-comparable sentence carries. ONE formatter; server/lib/
 *  reference-bounds.ts calls it with the values it derived from the corpus, so
 *  the derived line and the bundled line cannot be formatted two ways. */
export function referenceBoundsLine(
  bounds: ReferenceBoundsShape = REFERENCE_BOUNDS_LITERAL,
): string {
  return `${bounds.samples} samples / ${boundRange(bounds.minScenes, bounds.maxScenes)} scenes / `
    + `${boundRange(bounds.minWords, bounds.maxWords)} words`;
}

/**
 * Is a percentile against the reference set a meaningful reading for a draft of
 * this size?
 *
 * SYMMETRIC, deliberately — BOTH the scene count and the word count have to sit
 * inside the reference set's bounds. The first cut of this gate checked only the
 * scene count on one surface and both on the others, which is how
 * data/screenplays/runoff.fountain (9 scenes, 1,448 words) came to read
 * "top 30%" in the Versions list and "not comparable" everywhere else: 9 scenes
 * is inside the band, 1,448 words is four times over it, and the two surfaces
 * disagreed about the same draft in the same session. One function, both
 * dimensions, every caller.
 *
 * A missing value (null/undefined, or a non-finite number) is NOT comparable.
 * A snapshot saved before the word count was captured has no basis for a band,
 * and inventing one from the scene count alone is the exact bug above.
 */
export function percentileIsComparable(
  sceneCount: number | null | undefined,
  wordCount: number | null | undefined,
): boolean {
  if (typeof sceneCount !== 'number' || !Number.isFinite(sceneCount)) return false;
  if (typeof wordCount !== 'number' || !Number.isFinite(wordCount)) return false;
  return sceneCount >= REFERENCE_MIN_SCENES && sceneCount <= REFERENCE_MAX_SCENES
    && wordCount >= REFERENCE_MIN_WORDS && wordCount <= REFERENCE_MAX_WORDS;
}

/** The sentence that replaces a band when the draft is outside the bounds —
 *  the same slot healthPercentileSentence fills, so a surface swaps one for the
 *  other rather than hiding the row and leaving a reader wondering. */
export function notComparableSentence(): string {
  return 'Health percentile: not comparable \u2014 this draft is outside the bounds of the '
    + `${REFERENCE_SET_LABEL} (${referenceBoundsLine()})`;
}

/** The compact not-comparable note, for the space-constrained list rows
 *  compactPercentileNote serves. Same slot, same swap. */
export function compactNotComparableNote(): string {
  return `not comparable \u2014 outside the ${REFERENCE_SET_LABEL}'s bounds (${referenceBoundsLine()})`;
}

// ── The three functions every surface should actually call ────────────────────
//
// The comparability decision is ONE `if`, and it belongs here rather than at each
// of the seven surfaces that show a percentile (the in-app panel twice, the
// Versions list, the Slate table in-app and exported, the What-If Lab, the
// exported coverage HTML, the coverage letter). The first cut of this gate was a
// ternary repeated per surface, and one of them checked only the scene count —
// which is how data/screenplays/runoff.fountain read "top 30%" in Versions and
// "not comparable" everywhere else in the same session. Call these instead.

/** The full headline sentence, gated: a BAND for an in-band draft, the
 *  not-comparable sentence otherwise. */
export function percentileSentenceFor(
  pct: number, sceneCount: number | null | undefined, wordCount: number | null | undefined,
): string {
  return percentileIsComparable(sceneCount, wordCount)
    ? healthPercentileSentence(pct)
    : notComparableSentence();
}

/** The compact list-row note, gated the same way. */
export function compactPercentileNoteFor(
  pct: number, sceneCount: number | null | undefined, wordCount: number | null | undefined,
): string {
  return percentileIsComparable(sceneCount, wordCount)
    ? compactPercentileNote(pct)
    : compactNotComparableNote();
}

/**
 * The full how-to-read CAVEAT sentence, gated — the reading plus the clause that
 * qualifies it.
 *
 * ROUND 2 (2026-09-11). The coverage letter used to append one fixed clause to
 * whichever reading it got: `… — not against other scripts you might send it, and
 * not a market comparison.` That clause modifies "ranks … AGAINST", which the band
 * sentence has and the not-comparable sentence does not, so on the not-comparable
 * path it dangled off a sentence with nothing to attach to — shipped in all three
 * committed letter goldens, on 100% of real drafts (0 of the 20 CC0 shorts are
 * inside the band).
 *
 * Two readings, two qualifications, one decision point, here:
 *   in band  — the original clause, where it is grammatical and useful;
 *   out of band — the thing that is actually true of that state, which is WHY no
 *   percentile is stated rather than what the absent percentile is not.
 *
 * Lives here rather than in the letter so no surface keeps its own copy of the
 * comparability branch (see percentileIsComparable's own note on the surface that
 * kept half of it).
 */
export function percentileCaveatSentenceFor(
  pct: number, sceneCount: number | null | undefined, wordCount: number | null | undefined,
): string {
  return percentileIsComparable(sceneCount, wordCount)
    ? `${healthPercentileSentence(pct)} — not against other scripts you might send it, `
      + 'and not a market comparison.'
    : `${notComparableSentence()}. A percentile against that set would be measuring this `
      + "draft's length, not its craft.";
}

/** The narrow TABLE-CELL form: the band alone, or "not comparable".
 *
 *  For the Slate triage table, which shows one reading per row and has no room
 *  for a sentence — the column header tooltip and the table's own caption
 *  (percentileColumnHeaderTooltip / slatePercentileCaption) already name the
 *  denominator, so the cell states only the reading.
 *
 *  This closes a second drift the same audit found: the IN-APP table rendered
 *  `percentileBand(pct)` ("top 20%") while the EXPORTED slate HTML rendered
 *  `${Math.round(pct)}th pct` — an ordinal, with the same hardcoded "th" suffix
 *  bug the coverage letter had ("82th"), for the identical number in the identical
 *  column. One function now. */
export function percentileCellFor(
  pct: number, sceneCount: number | null | undefined, wordCount: number | null | undefined,
): string {
  return percentileIsComparable(sceneCount, wordCount) ? percentileBand(pct) : 'not comparable';
}

/** The exact-rank tooltip, or `undefined` when the draft is not comparable.
 *
 *  An exact ordinal against a reference set the draft cannot be compared to is
 *  the false precision twice over, so the tooltip is WITHHELD rather than shown
 *  beside a "not comparable" label. `undefined`, not '', so a caller can pass it
 *  straight to a `title` attribute and have the attribute disappear. */
export function exactRankTooltipFor(
  pct: number, sceneCount: number | null | undefined, wordCount: number | null | undefined,
): string | undefined {
  return percentileIsComparable(sceneCount, wordCount) ? exactRankTooltip(pct) : undefined;
}

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

/** The denominator described with NO specific percentile value attached —
 *  for a column header/caption that describes a whole table column (each
 *  row shows a DIFFERENT number, e.g. the Slate table's Percentile column)
 *  rather than one reading. Every other function above always names a
 *  number; this is the one that doesn't, so a caller composing its own
 *  sentence around it still carries the "hand-authored synthetic"
 *  qualifier verbatim. */
export function referenceSetDescription(): string {
  return `a ${REFERENCE_SET_SIZE}-sample, ${REFERENCE_SET_LABEL}`;
}

/** Shared column-header tooltip for a table whose Percentile column ranks
 *  EACH ROW against the reference set, not against the other rows in the
 *  same table (the Slate triage table, in-app and exported) — used so the
 *  in-app SlatePanel.tsx and the exported slate HTML (server/lib/slate.ts)
 *  can never state this denominator two different ways. */
export function percentileColumnHeaderTooltip(): string {
  return `Rank against ${referenceSetDescription()}, not the other scripts in this slate`;
}

/** Shared visible caption sentence for the same Slate percentile column —
 *  rendered as actual page text (not merely a tooltip) beside the table on
 *  both the in-app SlatePanel.tsx and the exported slate HTML. */
export function slatePercentileCaption(): string {
  return `Percentile ranks each script's health against ${referenceSetDescription()} — not the other scripts in this slate.`;
}
// probe
