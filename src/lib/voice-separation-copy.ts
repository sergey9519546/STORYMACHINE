// What the Voice Separation tile says — including when it has nothing to say.
//
// ── Why this exists (2026-09-12, adversarial finding #17) ───────────────────
//
// On the 231-scene feature fixture the Coverage panel showed
//
//     VOICE SEPARATION — N/A
//
// beside an `i` tooltip reading: "Character pairs whose dialogue is
// statistically distinguishable (Burrows's Delta) out of every pair with enough
// dialogue to test. Higher is better — a low pair risks two characters sounding
// interchangeable."
//
// That sentence explains how to read a number that is not there. Nothing said
// why the channel abstained or what would make it report, and the exported
// coverage report did not mention the channel at all. MEASURED across the
// committed inputs (tests/core/voice-separation-abstention.test.ts re-measures
// every row):
//
//     assembled-feature (231 scenes, 81 characters)   scored: false
//     runoff (9 scenes)                               scored: true, 10 pairs
//     dead-frequency (12 scenes)                      scored: true, 6 pairs
//     chain-of-custody (13 scenes)                    scored: true, 6 pairs
//
// — i.e. the channel abstains at exactly the length the product is for, and the
// one surface that showed it explained the wrong thing.
//
// ── What this module may and may not claim ─────────────────────────────────
//
// server/nvm/analyze/voice-delta.ts's analyzeVoices has exactly TWO abstention
// branches, and it records neither: it returns `{ pairs: [], scored: false }`
// for both. They are (a) fewer than two characters with dialogue and (b) at
// least one of those characters carrying less dialogue than the minimum
// Burrows's Delta needs.
//
// Adding a reason field to that return is a SCORING-PATH change
// (voice-delta.ts is reachable from doctor.ts through fountain-analyzer.ts), so
// this lane does not make one. What is derivable from the report alone is:
//
//   * `characters.length < 2` -> branch (a), certainly, and the count is worth
//     stating because it is the actionable half;
//   * otherwise -> one of the two, stated as both conditions rather than as a
//     guess at which. `report.characters` counts every named character who
//     APPEARS (fountain-analyzer.ts's characterOrder), not every character who
//     SPEAKS, so "81 characters" is not evidence that two of them have
//     dialogue, and this module does not pretend otherwise.
//
// The per-character abstention that would let the channel report at feature
// length is on the owner-gated scoring branch and is deliberately untouched.
//
// Pure, no I/O — safe in the browser bundle and in a server renderer. It reads
// a report field and returns a string; nothing here can move a score.

/** The shape this module needs from `ScriptDoctorReport.voiceAnalysis`.
 *  Structural rather than an import of the report type, so the copy module does
 *  not drag the whole analyze surface into the browser bundle. */
export interface VoiceAnalysisReading {
  pairs: ReadonlyArray<{ swapRisk: boolean }>;
  scored: boolean;
}

/** The label every surface uses for this channel. */
export const VOICE_SEPARATION_LABEL = 'Voice Separation';

/** What the number MEANS — the reading instruction. Correct beside a value and
 *  actively misleading beside an abstention, which is the finding. Lives here so
 *  the panel's tile and any export state it identically. */
export const VOICE_SEPARATION_DEFINITION =
  "Character pairs whose dialogue is statistically distinguishable (Burrows's Delta) out of "
  + 'every pair with enough dialogue to test. Higher is better — a low pair risks two '
  + 'characters sounding interchangeable.';

/** The value shown when the channel reported, e.g. `6/6 Pairs`. `null` when it
 *  abstained or the report carries no reading at all. */
export function voiceSeparationValue(
  voiceAnalysis: VoiceAnalysisReading | null | undefined,
): string | null {
  if (!voiceAnalysis?.scored) return null;
  const distinguishable = voiceAnalysis.pairs.filter(p => !p.swapRisk).length;
  return `${distinguishable}/${voiceAnalysis.pairs.length} Pairs`;
}

/** The short value for a surface with no room for a sentence. `N/A` is kept,
 *  unchanged, for the abstention — the tile has always read that and the tooltip
 *  is where the reason belongs. */
export const VOICE_SEPARATION_ABSTAINED_VALUE = 'N/A';

export function voiceSeparationShortValue(
  voiceAnalysis: VoiceAnalysisReading | null | undefined,
): string {
  return voiceSeparationValue(voiceAnalysis) ?? VOICE_SEPARATION_ABSTAINED_VALUE;
}

/** The value shown when the channel abstained on a surface that has room for
 *  words rather than a badge — the exported coverage report's metric row.
 *
 *  2026-09-12 (review round 2, non-blocking 2). server/lib/coverage-html.ts
 *  hand-typed `'not measured'` at its metric row while the panel read
 *  `VOICE_SEPARATION_ABSTAINED_VALUE` from here, so two surfaces stated one fact
 *  in two words from two places — inside a lane whose own brief item is "no
 *  second formatter". The export's wording is the better of the two and is now
 *  the module's; the badge-width `N/A` stays for the tile, which has no room
 *  for it. Which one a surface uses is a layout decision; the WORDS are this
 *  module's, and tests/core/voice-separation-abstention.test.ts asserts no
 *  surface types either of them itself. */
export const VOICE_SEPARATION_NOT_MEASURED_VALUE = 'not measured';

export function voiceSeparationLongValue(
  voiceAnalysis: VoiceAnalysisReading | null | undefined,
): string {
  return voiceSeparationValue(voiceAnalysis) ?? VOICE_SEPARATION_NOT_MEASURED_VALUE;
}

/**
 * WHY the channel abstained, or `null` when it did not.
 *
 * `characterCount` is `ScriptDoctorReport.characters.length`. Both branches say
 * what would make the channel report, because "N/A" with no way forward is the
 * half of the finding a reader can actually act on.
 */
export function voiceSeparationAbstentionReason(
  voiceAnalysis: VoiceAnalysisReading | null | undefined,
  characterCount: number,
): string | null {
  if (voiceAnalysis?.scored) return null;
  const named = Number.isFinite(characterCount) ? Math.max(0, Math.floor(characterCount)) : 0;
  if (named < 2) {
    return `Not measured: comparing two voices needs two characters with dialogue, and this draft `
      + `names ${named === 0 ? 'none' : 'one'}.`;
  }
  return 'Not measured: this reading needs at least two characters with dialogue and enough '
    + 'dialogue from each one across the whole draft to compare. This draft does not meet both, '
    + 'so the channel reports nothing rather than a pair count the text cannot support.';
}

/**
 * The tooltip for the tile, in whichever of its two states it is in: the
 * reading instruction when there is a reading, the reason when there is not.
 *
 * One function rather than a ternary at each surface, for the reason
 * src/lib/percentile-copy.ts's header records about the comparability gate: a
 * decision repeated per surface is a decision one surface will get wrong.
 */
export function voiceSeparationTooltip(
  voiceAnalysis: VoiceAnalysisReading | null | undefined,
  characterCount: number,
): string {
  return voiceSeparationAbstentionReason(voiceAnalysis, characterCount)
    ?? VOICE_SEPARATION_DEFINITION;
}
