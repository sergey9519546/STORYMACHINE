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
// The per-character abstention that lets the channel report at feature length
// arrived with scoring/feature-length-defects and was merged on 2026-09-20, so
// the tile now has a THIRD state — reported, but on a subset of the cast — and
// `voiceSeparationTooltip` below owns that sentence too.
//
// Pure, no I/O — safe in the browser bundle and in a server renderer. It reads
// a report field and returns a string; nothing here can move a score.

/** The shape this module needs from `ScriptDoctorReport.voiceAnalysis`.
 *  Structural rather than an import of the report type, so the copy module does
 *  not drag the whole analyze surface into the browser bundle. */
export interface VoiceAnalysisReading {
  pairs: ReadonlyArray<{ swapRisk: boolean }>;
  scored: boolean;
  /** The characters the analyzer held OUT of the pair set because each speaks
   *  under VOICE_MIN_WORDS — populated since the per-character abstention
   *  change. Optional, because a report written before that change carries no
   *  such field and every surface here must still render. */
  excludedCharacters?: ReadonlyArray<string>;
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

/** Appended to VOICE_SEPARATION_DEFINITION when the analyzer held characters
 *  out of the pair set. Until the per-character abstention change a single
 *  character under the 30-word floor abstained the WHOLE analysis, so the tile
 *  read N/A on every feature-length script while the definition promised a
 *  per-pair filter the code did not implement. The filter is per character now,
 *  and this names who it dropped, so a partial matrix is never unexplained.
 *  It lives here, with the other three sentences, because
 *  tests/core/voice-separation-abstention.test.ts holds every surface to
 *  stating this channel in the module's words rather than its own. */
export const VOICE_SEPARATION_EXCLUDED_PREFIX =
  'Characters with under 30 words of dialogue are left out of the pairs, not scored against '
  + 'anybody:';

/** How many held-out names the sentence lists before it counts the rest. */
const VOICE_SEPARATION_EXCLUDED_SHOWN = 6;

/**
 * The tooltip for the tile, in whichever of its THREE states it is in: the
 * reason when the channel abstained, the reading instruction when it reported
 * on everybody, and the reading instruction plus the held-out names when it
 * reported on a subset.
 *
 * One function rather than a ternary at each surface, for the reason
 * src/lib/percentile-copy.ts's header records about the comparability gate: a
 * decision repeated per surface is a decision one surface will get wrong.
 */
export function voiceSeparationTooltip(
  voiceAnalysis: VoiceAnalysisReading | null | undefined,
  characterCount: number,
): string {
  const abstained = voiceSeparationAbstentionReason(voiceAnalysis, characterCount);
  if (abstained !== null) return abstained;
  const excluded = voiceAnalysis?.excludedCharacters ?? [];
  if (excluded.length === 0) return VOICE_SEPARATION_DEFINITION;
  const shown = excluded.slice(0, VOICE_SEPARATION_EXCLUDED_SHOWN).join(', ');
  const rest = excluded.length > VOICE_SEPARATION_EXCLUDED_SHOWN
    ? ` and ${excluded.length - VOICE_SEPARATION_EXCLUDED_SHOWN} more`
    : '';
  return `${VOICE_SEPARATION_DEFINITION} ${VOICE_SEPARATION_EXCLUDED_PREFIX} ${shown}${rest}.`;
}
