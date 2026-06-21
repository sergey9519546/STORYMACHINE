// Wave 130 — Pass 13: Theme Resonance
// Checks whether each scene's dialogue, action, and visual content actively
// echoes, embodies, or challenges the declared story theme. A theme that's
// stated in the logline but never dramatized is an empty promise.
//
// This pass only fires when storyContext.theme is set (a non-trivial statement).
// It checks two failure modes:
//   1. THEME_RESONANCE_GAP — too many scenes have zero language related to the theme
//   2. THEME_UNRESOLVED   — Act 3 contains no thematic language (climax fails to answer)
// Wave 148 additions: theme craft — heavy-handedness (too dense/preachy),
// dialectic absence (theme asserted but never challenged), and front-loading
// (theme dumped early then abandoned).
// Wave 162 additions: theme midpoint silent (structural pivot has no theme voice),
// theme accelerating density absent (theme fades instead of amplifying toward climax),
// theme dialectic in Act 3 absent (Act 2 challenges the theme but Act 3 only affirms).
// Wave 346 additions: theme suspense peak absent (the highest-suspense scene is themically
// mute), theme late debut (the first resonant scene falls at or past the midpoint), theme
// closing quarter silent (the final 25% carries no theme while it appears earlier).
// Wave 360 additions: Act 3 density drop (Act 3 resonance proportion < 50% of Act 2's —
// theme thins at the approach to resolution), relationship peak absent (the scene with the
// largest relationship shift magnitude is thematically silent while others carry theme),
// dual peak absent (the scene with max combined suspenseDelta + curiosityDelta is
// thematically mute — peak drama and peak curiosity arrive without the theme).
// Wave 374 additions: Act 1 density drop (the opening 25% is under-themed vs the body),
// clock peak absent (the largest-clockDelta deadline is thematically silent — complement
// of clock scene silent), charged scene silent (no non-neutral emotional scene carries the
// theme — feeling and meaning never coincide, across both polarities together).
// Wave 388 additions: midpoint density drop (the 40%–60% zone is <50% as resonant as the
// story overall — theme thins at the pivot), opening image silent (the first scene carries
// no theme though it appears later — the bookend mirror of final scene silent), proactive
// decoupled (every clock/clue-planting scene is thematically silent — agency and meaning
// never coincide).
// Wave 402 additions: Act 2a density drop (the 25%–50% conflict-entry zone is less than
// half as resonant as overall — completes the zone density set with Act 1/2b/3/midpoint),
// seed peak absent (the scene that plants the most clues is thematically silent while other
// seed scenes carry theme — the single-peak mode for the seededClueIds channel), payoff
// peak absent (the scene that resolves the most setups is thematically silent while other
// payoff scenes carry theme — the single-peak mode for the payoffSetupIds channel).
// Wave 265 additions: clue scenes decoupled (≥2 clue-planting scenes with no theme),
// curiosity scenes decoupled (≥2 curiosity spikes with no theme), payoff scenes
// decoupled (≥2 payoff scenes with no theme).
// Wave 279 additions: dramatic-turn scenes carry no theme (≥2 turns, n≥8), negative
// emotional-shift scenes carry no theme (≥2 negative shifts, n≥8), and high-suspense
// scenes (suspenseDelta > 1) all carry no theme (≥3 scenes, n≥8).
// Wave 293 additions: revelation scenes carry no theme (≥2 revelations, n≥8), clock-raised
// scenes carry no theme (≥2 clockRaised, n≥8), payoff scenes carry no theme (≥2 payoffs, n≥8).
// Wave 307 additions: shallow resonance (no resonant scene matches ≥2 distinct theme
// keywords — theme name-dropped but never explored in depth), quiet scenes only (every
// resonant scene is emotionally neutral and low-suspense), resonance burst (a single
// scene holds >50% of all theme keyword occurrences).
// Wave 321 additions: peak before midpoint (the densest theme scene falls in the first
// half — theme should crescendo toward the climax), raise-stakes silent (every stake-
// raising scene is thematically empty), suspense-release silent (every clock-release
// scene is thematically empty — exhale beats waste their reflection potential).
// Wave 332 additions: development scene desert (none of the purpose='development'
// scenes carry theme — connective tissue is thematically empty), curiosity peak absent
// (the highest-curiosity scene lacks theme even when others carry it), Act 2b density
// drop (theme thins in Act 2b vs Act 2a — story loses thematic pressure pre-climax).
// Wave 416 additions: resonant singleton run (the theme never accumulates across
// consecutive scenes — every resonant scene is isolated, run-based mode × resonance
// sequence), peak suspense aftermath silent (the scene immediately following the
// story's highest-suspense moment carries no theme — sequence/aftermath mode ×
// peak suspenseDelta), dual rise decoupled (every scene where both suspenseDelta and
// curiosityDelta are simultaneously positive carries no theme — co-occurrence/
// decoupling mode across the joint tension+curiosity channel).
// Wave 430 additions: dramatic turn aftermath silent (sequence/aftermath — every scene
// immediately following a dramatic pivot carries no theme even though other scenes do,
// wasting the most reflective post-reversal processing beat), peak unmotivated
// (backward-cause — the story's densest theme scene lacks any structural catalyst in
// the two preceding scenes, so the thematic peak appears without narrative preparation),
// resonance emotionally lopsided (valence — the emotionally charged resonant scenes are
// ≥3:1 skewed toward one polarity, leaving the theme unable to speak in the opposite
// emotional register).
// Wave 444 additions: resonant cluster flood (run-based — 4+ consecutive scenes all carry
// theme, creating a local echo-chamber drumbeat that dilutes contrast; the opposite extreme
// from THEME_RESONANT_SINGLETON_RUN and distinct from global-proportion and single-peak checks),
// long silent stretch (distribution/timing — the single longest gap between any two resonant
// scenes is ≥5 consecutive inert scenes; fires when one stretch is thematically empty even
// when global proportion and zone checks pass), revelation aftermath silent (sequence/aftermath —
// every scene immediately following a revelation carries no theme though theme appears elsewhere;
// the first aftermath check anchored to the revelation channel, distinct from dramatic-turn
// aftermath and from the revelation-scenes-themselves check).
// Wave 458 additions: relationship decoupled (co-occurrence/decoupling × relationship shift —
// all scenes with non-empty relationshipShifts are thematically silent; bonds never move
// in the same beat where the theme is voiced; the relationship-channel sibling of all
// existing decoupled checks — clue/curiosity/payoff/turn/emotion/suspense/revelation/clock),
// clock aftermath silent (sequence/aftermath × clock → theme — no clock-raised scene is
// followed within 1 scene by theme resonance; every deadline passes without the next scene
// picking up the thematic meaning; the aftermath sibling of THEME_CLOCK_RAISED_DECOUPLED),
// all resonance causeless (backward-cause × all resonant scenes — every resonant scene is
// preceded in the prior 2 scenes by no revelation, dramatic turn, or high suspense; theme
// surfaces in narrative dead air; broader than THEME_PEAK_UNMOTIVATED which checks only
// the single densest scene).
// Wave 472 additions: positive emotion decoupled (co-occurrence/decoupling × positive emotional
// shift — all scenes with emotionalShift='positive' are thematically silent; the positive polarity
// complement to THEME_NEGATIVE_EMOTION_DECOUPLED, completing the full valence-channel set in the
// co-occurrence family), resonant valence uniform (valence × within-resonant-set — >80% of resonant
// scenes share the same emotional register; theme is tonal-monotone, always voiced in one kind of
// scene; distinct from RESONANCE_EMOTIONALLY_LOPSIDED which fires on 3:1 charged-scene skew and
// QUIET_SCENES_ONLY which requires all neutral+low-suspense; this fires even when the uniform
// register is 'neutral' with high suspense), dialogue peak silent (single-peak isolation × dialogue
// channel — the scene with the most dialogue highlights carries no theme while ≥2 others do; the
// script's most verbally active moment is thematically mute; fills the dialogue-channel cell in the
// single-peak isolation family alongside seed/payoff/curiosity/suspense/relationship/clock peaks).
// Wave 486 additions: positive emotion aftermath silent (sequence/aftermath × positive emotion
// trigger → theme — n≥8, ≥2 positive-shift scenes not at last position, none followed by a
// resonant scene; the aftermath × positive-emotion channel, distinct from THEME_POSITIVE_EMOTION_DECOUPLED
// which fires when the positive scene itself is silent), first resonant causeless (backward-cause
// × first resonant scene — the story's inaugural thematic moment lacks any structural catalyst in
// the 2 prior scenes; distinct from THEME_PEAK_UNMOTIVATED which targets the densest scene and from
// THEME_ALL_RESONANCE_CAUSELESS which requires every resonant scene to be causeless), resonance thirds
// cluster (distribution/timing × thirds × resonant scene proportion — >75% of resonant scenes fall
// in one structural third; distinct from THEME_FRONT_LOADED which compares keyword hit density
// first-third vs rest, and from zone checks which fire on 0 resonant scenes in a zone).
// Wave 500 additions: negative emotion aftermath silent (sequence/aftermath × negative emotion
// trigger → theme — n≥8, ≥2 negative-shift scenes not at last position, none followed by a
// resonant scene; the negative-polarity aftermath complement to THEME_POSITIVE_EMOTION_AFTERMATH_SILENT,
// completing the full emotional-polarity pair for the aftermath × emotion channel), last resonant
// causeless (backward-cause × last resonant scene — the story's valedictory thematic beat lacks
// any structural catalyst in the 2 prior scenes; the final-scene sibling of THEME_FIRST_RESONANT_
// CAUSELESS, distinct from THEME_PEAK_UNMOTIVATED which targets the densest scene), payoff aftermath
// silent (sequence/aftermath × payoff trigger → theme — n≥8, ≥2 qualifying payoff scenes not at
// last position, none followed by a resonant scene; first aftermath check with the payoff channel,
// distinct from THEME_REVELATION_AFTERMATH_SILENT which uses the revelation trigger).
// Wave 542 additions: resonant suspense flat (average/aggregate × suspense × resonant set —
// every resonant scene has suspenseDelta ≤ 0 while ≥2 suspense-spike scenes exist globally;
// theme always surfaces in tension-free contexts; distinct from QUIET_SCENES_ONLY which also
// requires emotional neutrality and from HIGH_SUSPENSE_SCENES_DECOUPLED which checks the
// reverse direction), Act 2b resonant causeless (backward-cause × Act 2b zone 50%–75% —
// the first resonant scene in Act 2b lacks any structural catalyst in the 2 prior scenes while
// catalysts exist elsewhere; fills the Act 2b cell in the backward-cause zone family alongside
// midpoint/first/last/peak zone cells), resonant aftermath curiosity void (sequence/aftermath ×
// curiosity × resonant trigger — ≥2 qualifying resonant scenes none followed by curiosityDelta>0
// in next 2 scenes while ≥2 curiosity-spike scenes exist; theme surfacing never generates
// questions; first aftermath check using the resonant scene as trigger rather than as aftermath).
// Wave 528 additions: relationship shift aftermath silent (sequence/aftermath × relationship shift
// trigger → theme — n≥8, ≥2 qualifying relationship-shift scenes none followed by a resonant scene;
// the first aftermath check triggered by relationshipShifts, distinct from THEME_RELATIONSHIP_DECOUPLED
// which fires when the shift scene ITSELF is silent), midpoint resonant causeless (backward-cause ×
// midpoint zone resonant scene — the first resonant scene in the 40%–60% midpoint zone lacks any
// structural catalyst in the 2 prior scenes while catalysts exist elsewhere; fills the midpoint-zone
// cell in the backward-cause family alongside FIRST/LAST/PEAK_UNMOTIVATED), theme back heavy
// (distribution/timing × second-half proportion — >65% of ≥3 resonant scenes fall in the second half
// while ≥1 exists in the first half; theme is back-loaded across acts, distinct from THIRDS_CLUSTER
// which fires on >75% in any single third and from FRONT_LOADED which compares keyword density).
// Wave 514 additions: seed aftermath silent (sequence/aftermath × seed trigger → theme — n≥8, ≥2
// qualifying seed scenes [seededClueIds non-empty] not at last position, none followed by a resonant
// scene; the seed-channel aftermath complement to THEME_PAYOFF_AFTERMATH_SILENT; distinct from
// THEME_CLUE_SCENES_DECOUPLED which fires when the clue scene ITSELF is silent), high-suspense
// aftermath silent (sequence/aftermath × suspense trigger — n≥8, ≥2 high-suspense scenes with
// suspenseDelta>1 not at last position, none followed by resonant; broader than THEME_PEAK_SUSPENSE_
// AFTERMATH_SILENT which targets only the single max-suspense spike; distinct from THEME_HIGH_SUSPENSE_
// SCENES_DECOUPLED which fires when the scene itself is silent), curiosity aftermath silent
// (sequence/aftermath × curiosity trigger — n≥8, ≥2 curiosity-spike scenes with curiosityDelta>0
// not at last position, none followed by resonant; the curiosity-channel aftermath complement to
// THEME_CURIOSITY_SCENES_DECOUPLED; completes the aftermath × {seed, suspense, curiosity} channel family).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'that', 'this', 'it',
  'in', 'on', 'at', 'to', 'of', 'and', 'or', 'but', 'not', 'with', 'by',
  'for', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
  'all', 'any', 'each', 'every', 'some', 'very', 'just', 'then', 'when',
  'who', 'what', 'where', 'how', 'if', 'so', 'its', 'their', 'them',
  'they', 'we', 'you', 'he', 'she', 'his', 'her', 'our', 'your',
]);

function extractThemeKeywords(theme: string): string[] {
  return theme.toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));
}

// Expand each keyword into related forms (crude stem/synonym expansion).
// E.g., "betray" covers "betrayal", "betrayed", "betrayer", "betray".
function expandKeyword(kw: string): string[] {
  return [kw, kw + 's', kw + 'ed', kw + 'ing', kw + 'al', kw + 'er', kw + 'ful', kw + 'less'];
}

// Build the set of scene text from records (dialogue + revelation + slug).
// Also scan the raw fountain text around each scene's line position using slugs.
function buildSceneText(
  records: PassInput['records'],
  fountain: string,
): Map<number, string> {
  const fountainLines = fountain.split('\n');
  const slugLineIndex = new Map<string, number>();

  for (let i = 0; i < fountainLines.length; i++) {
    const t = fountainLines[i].trim();
    if (t && /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
      slugLineIndex.set(t.toLowerCase(), i);
    }
  }

  const result = new Map<number, string>();

  for (let ri = 0; ri < records.length; ri++) {
    const r = records[ri];
    const parts: string[] = [
      r.slug,
      ...r.dialogueHighlights,
      r.revelation ?? '',
    ];

    // Also grab the fountain lines between this scene's slug and the next.
    const slugKey = r.slug.toLowerCase();
    const slugLine = slugLineIndex.get(slugKey) ?? -1;
    if (slugLine >= 0) {
      // Find the next scene heading line
      const nextSlugLine = ri + 1 < records.length
        ? (slugLineIndex.get(records[ri + 1].slug.toLowerCase()) ?? fountainLines.length)
        : fountainLines.length;
      const sceneBlock = fountainLines.slice(slugLine, nextSlugLine).join(' ');
      parts.push(sceneBlock);
    }

    result.set(r.sceneIdx, parts.join(' ').toLowerCase());
  }

  return result;
}

function sceneHasResonance(text: string, expandedKeywords: string[][]): boolean {
  return expandedKeywords.some(forms => forms.some(form => text.includes(form)));
}

export async function themePass(input: PassInput): Promise<PassResult> {
  const { fountain, records, storyContext, approvedSpans } = input;

  // Pass is a no-op unless the story has a declared theme
  const themeRaw = storyContext?.theme?.trim() ?? '';
  if (!themeRaw || records.length < 3) {
    return {
      pass: 'theme',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Theme resonance pass: no theme declared (set story theme to activate this pass)',
    };
  }

  const keywords = extractThemeKeywords(themeRaw);
  if (keywords.length === 0) {
    return {
      pass: 'theme',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Theme resonance pass: theme statement too sparse to extract keywords',
    };
  }

  const expandedKeywords = keywords.map(expandKeyword);
  const sceneTexts = buildSceneText(records, fountain);
  const issues: RevisionIssue[] = [];

  // ── Per-scene resonance audit ─────────────────────────────────────────────
  const silentScenes: Array<{ idx: number; slug: string }> = [];
  for (const r of records) {
    const text = sceneTexts.get(r.sceneIdx) ?? '';
    if (!sceneHasResonance(text, expandedKeywords)) {
      silentScenes.push({ idx: r.sceneIdx, slug: r.slug });
    }
  }

  // ── THEME_RESONANCE_GAP — >40% of scenes are theme-silent ─────────────────
  const silenceRatio = silentScenes.length / records.length;
  if (silenceRatio > 0.4 && records.length >= 4) {
    const sample = silentScenes.slice(0, 3).map(s => `Scene ${s.idx} (${s.slug})`).join(', ');
    const extra = silentScenes.length > 3 ? ` +${silentScenes.length - 3} more` : '';
    issues.push({
      location: sample + extra,
      rule: 'THEME_RESONANCE_GAP',
      description:
        `${Math.round(silenceRatio * 100)}% of scenes (${silentScenes.length}/${records.length}) contain no language related to the theme "${themeRaw}". ` +
        `Theme keywords expected: [${keywords.slice(0, 5).join(', ')}${keywords.length > 5 ? '…' : ''}].`,
      severity: 'major',
      suggestedFix:
        `Find one moment per silent scene where a character's action, dialogue, or visual detail directly embodies or subverts the theme: "${themeRaw}"`,
    });
  }

  // ── THEME_UNRESOLVED — Act 3 has no thematic language ─────────────────────
  const act3Start = Math.floor(records.length * 0.7);
  const act3Records = records.slice(act3Start);
  const act3HasResonance = act3Records.some(r =>
    sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
  );

  if (!act3HasResonance && act3Records.length > 0) {
    issues.push({
      location: 'Act 3',
      rule: 'THEME_UNRESOLVED',
      description:
        `Act 3 contains no language echoing the theme "${themeRaw}". The climax should deliver the story's thematic answer, not just resolve the plot.`,
      severity: 'critical',
      suggestedFix:
        `The final act must explicitly answer or crystallize the theme. Have a character make a choice that embodies or refutes it: "${themeRaw}"`,
    });
  }

  // ── THEME_ORPHANED — theme set but no scene has any resonance at all ───────
  if (silentScenes.length === records.length) {
    issues.length = 0; // replace the gap flag with a stronger one
    issues.push({
      location: 'Entire screenplay',
      rule: 'THEME_ORPHANED',
      description:
        `The story declares the theme "${themeRaw}" but zero scenes contain any thematic language. Theme is not dramatized.`,
      severity: 'critical',
      suggestedFix:
        `Ensure that the story's dialogue and action consistently echo, test, and ultimately resolve the declared theme.`,
    });
  }

  // ── Wave 148: Theme craft — heavy-handedness, dialectic, front-loading ──────
  // These only run when the theme IS resonating (not orphaned); they measure HOW
  // well the theme is woven, not just whether it's present.
  if (silentScenes.length < records.length) {
    // Per-scene keyword density: count keyword hits per scene.
    const sceneHitCounts = new Map<number, number>();
    for (const r of records) {
      const text = sceneTexts.get(r.sceneIdx) ?? '';
      let hits = 0;
      for (const forms of expandedKeywords) {
        for (const form of forms) {
          // Count occurrences of each form
          let pos = text.indexOf(form);
          while (pos !== -1) { hits++; pos = text.indexOf(form, pos + form.length); }
        }
      }
      sceneHitCounts.set(r.sceneIdx, hits);
    }

    // THEME_HEAVY_HANDED — a scene repeats theme keywords so densely it becomes
    // preachy/on-the-nose. We flag scenes where keyword hits are ≥6 AND more than
    // 3x the average per-scene hit count — the theme is being hammered, not woven.
    const totalHits = [...sceneHitCounts.values()].reduce((s, v) => s + v, 0);
    const avgHits = totalHits / Math.max(records.length, 1);
    for (const r of records) {
      const hits = sceneHitCounts.get(r.sceneIdx) ?? 0;
      if (hits >= 6 && hits > avgHits * 3 && avgHits > 0) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'THEME_HEAVY_HANDED',
          description:
            `Scene ${r.sceneIdx} repeats theme language ${hits} times (${(hits / avgHits).toFixed(1)}x the story average) — the theme "${themeRaw}" is stated on-the-nose rather than dramatized through subtext`,
          severity: 'major',
          suggestedFix:
            `Cut explicit theme statements in this scene. Let one image or action carry the meaning instead of having characters articulate it directly. Theme lands hardest when implied.`,
        });
        break; // one heavy-handed flag per pass to avoid noise
      }
    }

    // THEME_NO_DIALECTIC — the theme is echoed throughout but never CHALLENGED.
    // A theme without a counterargument is propaganda. We approximate the presence
    // of a counterargument by checking whether any thematic scene also carries a
    // negative emotional shift or a reversal (suspenseDelta < -1) — i.e. a moment
    // where the theme's value is questioned or fails the character. If every
    // theme-resonant scene is emotionally neutral/positive, the theme is unchallenged.
    const resonantScenes = records.filter(r =>
      sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
    );
    if (resonantScenes.length >= 3) {
      const hasChallenge = resonantScenes.some(r =>
        r.emotionalShift === 'negative' || r.suspenseDelta < -1,
      );
      if (!hasChallenge) {
        issues.push({
          location: 'Thematic arc',
          rule: 'THEME_NO_DIALECTIC',
          description:
            `The theme "${themeRaw}" is echoed in ${resonantScenes.length} scenes but never challenged — no thematic scene carries a negative turn or reversal. A theme that is only ever affirmed feels like a lecture, not a question.`,
          severity: 'major',
          suggestedFix:
            `Add a scene where the theme's value is tested and appears to fail — a moment where honesty backfires, love costs too much, or the protagonist's belief is genuinely shaken. The strongest themes survive their own counterargument.`,
        });
      }
    }

    // THEME_FRONT_LOADED — theme keywords cluster heavily in the first third then
    // fade. The story introduces its theme as a thesis statement but stops
    // dramatizing it. We compare resonance density in the first third vs the rest.
    if (records.length >= 6) {
      const third = Math.floor(records.length / 3);
      const firstThirdHits = records.slice(0, third)
        .reduce((s, r) => s + (sceneHitCounts.get(r.sceneIdx) ?? 0), 0);
      const restHits = records.slice(third)
        .reduce((s, r) => s + (sceneHitCounts.get(r.sceneIdx) ?? 0), 0);
      const firstThirdScenes = third;
      const restScenes = records.length - third;
      const firstThirdDensity = firstThirdHits / Math.max(firstThirdScenes, 1);
      const restDensity = restHits / Math.max(restScenes, 1);

      // Front-loaded if the opening is dense (≥2 hits/scene) but the rest fades to <40% of that
      if (firstThirdDensity >= 2 && restDensity < firstThirdDensity * 0.4) {
        issues.push({
          location: 'Thematic distribution',
          rule: 'THEME_FRONT_LOADED',
          description:
            `The theme "${themeRaw}" is densely stated in the opening third (${firstThirdDensity.toFixed(1)} hits/scene) but fades to ${restDensity.toFixed(1)} hits/scene afterward — the story announces its theme then abandons dramatizing it`,
          severity: 'major',
          suggestedFix:
            `Distribute theme touchpoints evenly. Rather than front-loading the thematic statement, let the theme deepen and complicate as the story progresses, paying off strongest at the climax.`,
        });
      }
    }

    // ── Wave 162: Midpoint silence, accelerating density, Act 3 dialectic ─────

    // THEME_MIDPOINT_SILENT: The midpoint scene and its neighbors (±1) have no
    // thematic resonance. The structural pivot of the story has no thematic voice —
    // the gear-shift doesn't engage the story's central question.
    if (records.length >= 6) {
      const midIdx = Math.floor(records.length * 0.5);
      const midText = sceneTexts.get(records[midIdx]?.sceneIdx ?? -1) ?? '';
      const prevText = midIdx > 0 ? (sceneTexts.get(records[midIdx - 1]?.sceneIdx ?? -1) ?? '') : midText;
      const nextText = midIdx < records.length - 1
        ? (sceneTexts.get(records[midIdx + 1]?.sceneIdx ?? -1) ?? '')
        : midText;

      if (!sceneHasResonance(midText, expandedKeywords) &&
          !sceneHasResonance(prevText, expandedKeywords) &&
          !sceneHasResonance(nextText, expandedKeywords)) {
        issues.push({
          location: `Scene ${records[midIdx]?.sceneIdx ?? midIdx} (midpoint ±1)`,
          rule: 'THEME_MIDPOINT_SILENT',
          description: `The midpoint and adjacent scenes (Scenes ${Math.max(0, midIdx - 1)}–${Math.min(records.length - 1, midIdx + 1)}) have no thematic language — the structural pivot has no thematic voice`,
          severity: 'major',
          suggestedFix: `Add one thematic beat to the midpoint scene: a choice, image, or line of dialogue that resonates with "${themeRaw}". The midpoint is where the theme's second half begins — it should carry the question forward`,
        });
      }
    }

    // THEME_ACCELERATING_DENSITY_ABSENT: The thematic density in the final third is
    // lower than the first third, meaning the theme fades instead of amplifying toward
    // the climax. A well-structured story's theme should crescendo, not diminish.
    if (records.length >= 6 && resonantScenes.length >= 4) {
      const wavethird = Math.floor(records.length / 3);
      const firstThirdSum = records.slice(0, wavethird)
        .reduce((s, r) => s + (sceneHitCounts.get(r.sceneIdx) ?? 0), 0);
      const lastThirdSum = records.slice(records.length - wavethird)
        .reduce((s, r) => s + (sceneHitCounts.get(r.sceneIdx) ?? 0), 0);
      const firstDens = firstThirdSum / Math.max(wavethird, 1);
      const lastDens = lastThirdSum / Math.max(wavethird, 1);

      if (firstDens > 0 && lastDens > 0 && firstDens > lastDens * 1.5) {
        issues.push({
          location: 'Thematic arc',
          rule: 'THEME_ACCELERATING_DENSITY_ABSENT',
          description: `Thematic density decreases from first third (${firstDens.toFixed(1)} hits/scene) to final third (${lastDens.toFixed(1)} hits/scene) — the theme "${themeRaw}" fades instead of amplifying toward the climax`,
          severity: 'major',
          suggestedFix: `Increase thematic resonance in the final act. The story's thematic question should be most urgently present at the moment of resolution — the climax should be the most thematically charged scene in the script`,
        });
      }
    }

    // THEME_DIALECTIC_IN_ACT3_ABSENT: Act 2 challenges the theme (a resonant scene
    // with a negative shift or reversal) but Act 3 only affirms it. The question was
    // asked in Act 2 but Act 3 gives an easy, unearned answer. Great drama keeps
    // questioning through the climax.
    if (records.length >= 6 && resonantScenes.length >= 3) {
      const act3ZoneStart = Math.floor(records.length * 0.75);
      const act2Resonant = resonantScenes.filter(r => r.sceneIdx < act3ZoneStart);
      const act3Resonant = resonantScenes.filter(r => r.sceneIdx >= act3ZoneStart);

      const act2HasChallenge = act2Resonant.some(r =>
        r.emotionalShift === 'negative' || r.suspenseDelta < -1,
      );
      const act3HasChallenge = act3Resonant.some(r =>
        r.emotionalShift === 'negative' || r.suspenseDelta < -1,
      );

      if (act2HasChallenge && !act3HasChallenge && act3Resonant.length >= 1) {
        issues.push({
          location: 'Act 3 thematic arc',
          rule: 'THEME_DIALECTIC_IN_ACT3_ABSENT',
          description: `The theme "${themeRaw}" is challenged in Act 2 (a resonant scene with a negative turn) but Act 3 only affirms it. The question was asked but the answer comes too easily — the climax doesn't earn its resolution.`,
          severity: 'major',
          suggestedFix: `Add one final challenge to the theme in Act 3 before the resolution — a moment where the protagonist's belief is tested one last time. The resolution carries more weight when the final answer arrives after the final doubt.`,
        });
      }
    }

    // ── Wave 174: Opening silence, single-keyword reliance, climax silence ─────

    // THEME_OPENING_SILENT: The first three scenes carry no thematic language.
    // A screenplay should plant its central question in the opening — the
    // audience needs to feel the theme before the plot complicates it. This is
    // the inverse failure to THEME_FRONT_LOADED (theme dumped early then dropped):
    // here the theme arrives late, with no thesis to set against the antithesis.
    if (records.length >= 6) {
      const openingCount = Math.min(3, records.length);
      const openingSilent = records.slice(0, openingCount).every(r =>
        !sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      );
      if (openingSilent) {
        issues.push({
          location: `Scenes 0–${openingCount - 1} (opening)`,
          rule: 'THEME_OPENING_SILENT',
          description: `The opening ${openingCount} scenes contain no language related to the theme "${themeRaw}" — the story complicates a question it never planted. The audience reaches the midpoint without knowing what the film is about.`,
          severity: 'major',
          suggestedFix: `Plant the theme in the opening: a line, an image, or a choice in the first scene or two that poses the question "${themeRaw}" without answering it. The thesis must precede the antithesis.`,
        });
      }
    }

    // THEME_SINGLE_KEYWORD_RELIANCE: The declared theme has multiple keywords,
    // but resonance comes overwhelmingly from a single one while at least one
    // other keyword is never dramatized at all. A theme like "loyalty and
    // betrayal" that only ever shows betrayal represents one pole of its own
    // tension — the dialectic is lopsided.
    if (keywords.length >= 2) {
      const perKwHits = expandedKeywords.map(forms => {
        let total = 0;
        for (const r of records) {
          const text = sceneTexts.get(r.sceneIdx) ?? '';
          for (const form of forms) {
            let pos = text.indexOf(form);
            while (pos !== -1) { total++; pos = text.indexOf(form, pos + form.length); }
          }
        }
        return total;
      });
      const totalKwHits = perKwHits.reduce((s, v) => s + v, 0);
      const topHits = Math.max(...perKwHits);
      if (totalKwHits >= 5 && topHits / totalKwHits > 0.8 && perKwHits.some(h => h === 0)) {
        const topIdx = perKwHits.indexOf(topHits);
        const absent = keywords.filter((_, i) => perKwHits[i] === 0);
        issues.push({
          location: 'Thematic balance',
          rule: 'THEME_SINGLE_KEYWORD_RELIANCE',
          description: `Thematic resonance relies almost entirely on "${keywords[topIdx]}" (${Math.round(topHits / totalKwHits * 100)}% of all theme hits) while [${absent.join(', ')}] never appear — the theme "${themeRaw}" is represented by only one pole of its own tension`,
          severity: 'minor',
          suggestedFix: `Dramatize the neglected side of the theme. If "${keywords[topIdx]}" dominates, give [${absent.join(', ')}] their own scenes — a theme is a dialectic, and one pole without the other is a slogan.`,
        });
      }
    }

    // THEME_CLIMAX_SCENE_SILENT: Act 3 carries the theme somewhere, but the
    // single highest-suspense scene — the climax beat itself — has no thematic
    // resonance. The story answers its question adjacent to the climax rather
    // than IN it. Distinct from THEME_UNRESOLVED (whole-act silence); this fires
    // only when the act resonates but the peak moment doesn't.
    if (records.length >= 8 && act3HasResonance) {
      const climaxZoneStart = Math.floor(records.length * 0.75);
      let climaxIdx = -1;
      let maxSus = -Infinity;
      for (let i = climaxZoneStart; i < records.length; i++) {
        if (records[i].suspenseDelta > maxSus) { maxSus = records[i].suspenseDelta; climaxIdx = i; }
      }
      if (climaxIdx >= 0 && maxSus > 1.5) {
        const climaxText = sceneTexts.get(records[climaxIdx].sceneIdx) ?? '';
        if (!sceneHasResonance(climaxText, expandedKeywords)) {
          issues.push({
            location: `Scene ${records[climaxIdx].sceneIdx} (climax, peak suspense ${maxSus.toFixed(1)})`,
            rule: 'THEME_CLIMAX_SCENE_SILENT',
            description: `Act 3 carries the theme "${themeRaw}", but the climax scene (Scene ${records[climaxIdx].sceneIdx}, the peak-suspense beat) has no thematic language — the story resolves its question beside the climax rather than inside it`,
            severity: 'major',
            suggestedFix: `Move the thematic payoff into the climax itself. The single most dramatic moment should also be the most thematically charged: the protagonist's decisive action should embody the answer to "${themeRaw}".`,
          });
        }
      }
    }

    // THEME_ACT2_DESERT: Act 2 (25%–75% of scenes) has fewer than 30% thematically
    // resonant scenes — the middle of the story, where the theme is tested and
    // complicated, is an empty desert. The theme is present in the opening and
    // closing but the long middle section abandons the central question.
    if (records.length >= 6) {
      const act2DesertStart = Math.floor(records.length * 0.25);
      const act2DesertEnd = Math.floor(records.length * 0.75);
      const act2DesertRecs = records.slice(act2DesertStart, act2DesertEnd);
      if (act2DesertRecs.length >= 3) {
        const resonantInAct2 = act2DesertRecs.filter(r =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        ).length;
        if (resonantInAct2 / act2DesertRecs.length < 0.3) {
          issues.push({
            location: `Act 2 (scenes ${act2DesertStart}–${act2DesertEnd - 1})`,
            rule: 'THEME_ACT2_DESERT',
            description:
              `Only ${resonantInAct2} of ${act2DesertRecs.length} Act 2 scenes (${Math.round(resonantInAct2 / act2DesertRecs.length * 100)}%) carry the theme "${themeRaw}" — the middle of the story is thematically inert`,
            severity: 'major',
            suggestedFix:
              `Act 2 is where the theme is tested and complicated. Add thematic resonance to at least every third Act 2 scene: a choice, image, or line of dialogue that ties back to "${themeRaw}" while the plot escalates.`,
          });
        }
      }
    }

    // THEME_RESOLUTION_SILENT: The final scene — the screenplay's last word — contains
    // no thematic language. The denouement resolves the plot but leaves the central
    // question unanswered in the audience's final impression.
    if (records.length >= 4) {
      const finalRec = records[records.length - 1];
      const finalText = sceneTexts.get(finalRec.sceneIdx) ?? '';
      if (!sceneHasResonance(finalText, expandedKeywords)) {
        issues.push({
          location: `Scene ${finalRec.sceneIdx} (final scene)`,
          rule: 'THEME_RESOLUTION_SILENT',
          description:
            `The final scene contains no language related to the theme "${themeRaw}" — the screenplay ends on a plot beat rather than a thematic one`,
          severity: 'major',
          suggestedFix:
            `The last scene should echo the theme one final time: a callback line, a closing image, or a character's action that answers "${themeRaw}". The audience's final impression should be thematic, not transactional.`,
        });
      }
    }

    // THEME_DENSITY_INVERSION: The proportion of thematically resonant scenes is
    // higher in the first half than the second. Theme should escalate toward the
    // climax, not retreat from it. Distinct from THEME_FRONT_LOADED (which tracks
    // keyword-hit density); this counts whether scenes carry ANY resonance at all.
    if (records.length >= 8) {
      const halfIdxDens = Math.floor(records.length / 2);
      const firstHalfResonant = records.slice(0, halfIdxDens).filter(r =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      ).length;
      const secondHalfResonant = records.slice(halfIdxDens).filter(r =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      ).length;
      const firstHalfRatioDens = firstHalfResonant / halfIdxDens;
      const secondHalfRatioDens = secondHalfResonant / (records.length - halfIdxDens);
      if (firstHalfRatioDens > secondHalfRatioDens && firstHalfRatioDens > 0.3) {
        issues.push({
          location: 'Thematic distribution',
          rule: 'THEME_DENSITY_INVERSION',
          description:
            `Thematic resonance is denser in the first half (${Math.round(firstHalfRatioDens * 100)}% of scenes carry the theme) than the second (${Math.round(secondHalfRatioDens * 100)}%) — the theme builds early then retreats`,
          severity: 'minor',
          suggestedFix:
            `Redistribute thematic touchpoints so the second half carries at least as many resonant scenes as the first. The theme should be escalating toward the climax, not retreating from it.`,
        });
      }
    }

    // ── Wave 208: Consecutive resonant surfeit, first-act resolution, subplot isolation ──

    // THEME_CONSECUTIVE_RESONANT_SURFEIT: Five or more consecutive scenes all carry
    // thematic language — a saturation wall that trains the audience to stop registering
    // the theme. Theme lands hardest when it has silence between its hits. A run of five
    // or more consecutive resonant scenes collapses the signal into wallpaper.
    if (records.length >= 8 && resonantScenes.length >= 5) {
      let maxRun208 = 0;
      let currentRun208 = 0;
      let maxRunStart208 = 0;
      let currentRunStart208 = 0;
      for (let i = 0; i < records.length; i++) {
        const isRes208 = sceneHasResonance(sceneTexts.get(records[i].sceneIdx) ?? '', expandedKeywords);
        if (isRes208) {
          if (currentRun208 === 0) currentRunStart208 = i;
          currentRun208++;
          if (currentRun208 > maxRun208) { maxRun208 = currentRun208; maxRunStart208 = currentRunStart208; }
        } else {
          currentRun208 = 0;
        }
      }
      if (maxRun208 >= 5) {
        const runEnd208 = Math.min(maxRunStart208 + maxRun208 - 1, records.length - 1);
        issues.push({
          location: `Scenes ${records[maxRunStart208].sceneIdx}–${records[runEnd208].sceneIdx}`,
          rule: 'THEME_CONSECUTIVE_RESONANT_SURFEIT',
          severity: 'minor',
          description: `${maxRun208} consecutive scenes all carry the theme "${themeRaw}" with no breathing room — thematic saturation desensitizes the audience. Theme lands hardest when it has silence between its hits; without rest, the resonance becomes ambient noise.`,
          suggestedFix: `Break the run with 1–2 theme-silent scenes inside that stretch: pure plot or action scenes that let the thematic statement settle before the next invocation. Rhythm requires rest; the audience must feel the theme's absence before the next hit registers.`,
        });
      }
    }

    // THEME_FIRST_ACT_RESOLUTION: Act 1 contains a thematically resonant scene with
    // a positive, unthreatened emotional outcome — the story delivers a comfortable
    // answer to its central question before the question has been dramatized. A theme
    // resolved before it is tested carries no weight; the audience has received the
    // thesis without enduring the antithesis.
    if (records.length >= 8) {
      const act1End208 = Math.floor(records.length * 0.25);
      const act1Recs208 = records.slice(0, act1End208);
      if (act1Recs208.length >= 2) {
        const act1ResonantEasy208 = act1Recs208.some(r =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords) &&
          r.emotionalShift === 'positive' &&
          !r.clockRaised &&
          r.suspenseDelta >= 0,
        );
        const act1HasChallenge208 = act1Recs208.some(r =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords) &&
          r.emotionalShift === 'negative',
        );
        if (act1ResonantEasy208 && !act1HasChallenge208) {
          issues.push({
            location: `Act 1 (scenes 0–${act1End208 - 1})`,
            rule: 'THEME_FIRST_ACT_RESOLUTION',
            severity: 'major',
            description: `Act 1 contains a thematically resonant scene with a positive, unchallenged outcome — the story answers "${themeRaw}" before the question has been tested through drama. A thesis delivered before the antithesis is a lecture, not a story.`,
            suggestedFix: `The opening thematic beat should POSE the question, not answer it. Replace the comfortable thematic moment with one that plants the theme at cost: a moment where its value is desired but not yet earned, already under threat, or complicated by what it costs.`,
          });
        }
      }
    }

    // THEME_SUBPLOT_ISOLATION: All thematically resonant scenes are revelation or
    // exposition scenes (where a character delivers information); no pure dramatic-action
    // scene carries the theme. The theme lives in speeches and explanations rather than
    // in kinetic physical choice. Great theme is dramatized, not announced.
    if (records.length >= 8 && resonantScenes.length >= 3) {
      const actionScenes208 = records.filter(r => r.revelation === null && r.dramaticTurn !== 'nothing');
      if (actionScenes208.length >= 2) {
        const allResonantHaveRevelation208 = resonantScenes.every(r => r.revelation !== null);
        const noActionSceneResonant208 = !resonantScenes.some(r => r.revelation === null);
        if (allResonantHaveRevelation208 && noActionSceneResonant208) {
          issues.push({
            location: 'Thematic placement',
            rule: 'THEME_SUBPLOT_ISOLATION',
            severity: 'minor',
            description: `Every thematically resonant scene in "${themeRaw}" is a revelation or exposition scene. No scene of pure dramatic action carries the theme — it is spoken about rather than embodied through physical, kinetic choice.`,
            suggestedFix: `Move at least one thematic beat into a scene of pure dramatic action: a confrontation, escape, or decisive physical choice where the theme is enacted rather than articulated. Great theme lives in what characters DO, not what they SAY about what they believe.`,
          });
        }
      }
    }

    // ── Wave 223: THEME_SILENT_STRETCH ────────────────────────────────────────
    // A long consecutive run of theme-silent scenes creates a dead zone where
    // the audience forgets what the story is about. We compute the maximum
    // unbroken run of theme-silent scenes; if it exceeds 25% of the script
    // (or 4, whichever is larger) the theme has a structural hole.
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const stretchThreshold223 = Math.max(4, Math.floor(records.length * 0.25));
      const resonantIdxSet223 = new Set(resonantScenes.map(r => r.sceneIdx));
      let maxRun223 = 0;
      let run223 = 0;
      let stretchStart223 = -1;
      let runStart223 = 0;
      for (let i = 0; i < records.length; i++) {
        if (!resonantIdxSet223.has(records[i].sceneIdx)) {
          if (run223 === 0) runStart223 = i;
          run223++;
          if (run223 > maxRun223) { maxRun223 = run223; stretchStart223 = runStart223; }
        } else {
          run223 = 0;
        }
      }
      if (maxRun223 > stretchThreshold223) {
        issues.push({
          location: `Scenes ${stretchStart223}–${stretchStart223 + maxRun223 - 1}`,
          rule: 'THEME_SILENT_STRETCH',
          severity: 'major',
          description: `A consecutive run of ${maxRun223} theme-silent scenes (${stretchThreshold223} allowed for a ${records.length}-scene story) creates a thematic dead zone — the audience loses the story's meaning for an extended stretch before the theme returns.`,
          suggestedFix: `Break the silent stretch by inserting thematic language into at least one of these scenes: a character's choice that embodies or resists "${themeRaw}", a visual metaphor, or a line of dialogue that touches the core tension.`,
        });
      }
    }

    // ── Wave 223: THEME_POLES_NEVER_COSTAGED ──────────────────────────────────
    // Complex themes have multiple dimensions (e.g. "trust vs betrayal" has
    // 'trust' and 'betrayal' as poles). If no single scene contains language
    // from at least two keyword groups simultaneously, the poles exist in
    // isolation — the theme is never dramatized as a live collision of competing
    // values within a single scene, which is where thematic resonance lives.
    if (keywords.length >= 2 && resonantScenes.length >= 3) {
      const anyCostaged223 = resonantScenes.some(r => {
        const text223 = sceneTexts.get(r.sceneIdx) ?? '';
        let groupsHit223 = 0;
        for (const forms of expandedKeywords) {
          if (forms.some(f => text223.includes(f))) groupsHit223++;
        }
        return groupsHit223 >= 2;
      });
      if (!anyCostaged223) {
        issues.push({
          location: 'Thematic placement',
          rule: 'THEME_POLES_NEVER_COSTAGED',
          severity: 'minor',
          description: `The theme "${themeRaw}" has ${keywords.length} keyword groups but no single scene contains language from two or more of them simultaneously. The theme's poles are never staged in tension — each dimension appears in isolation, diluting the central conflict.`,
          suggestedFix: `Write at least one scene that dramatizes the collision of both thematic poles — a moment where "${keywords[0]}" and "${keywords[1]}" are in active opposition within the same scene, forcing a character to embody or choose between them.`,
        });
      }
    }

    // ── Wave 223: THEME_RESONANCE_EMOTIONALLY_INERT ───────────────────────────
    // Theme only truly lands when it coincides with emotional stakes. If every
    // thematically resonant scene is emotionally flat — neutral emotional shift
    // AND zero suspense delta — the audience registers the theme intellectually
    // but never feels it. Theme must be dramatized at moments of genuine heat.
    if (resonantScenes.length >= 3) {
      const hasChargedResonance223 = resonantScenes.some(r =>
        r.emotionalShift !== 'neutral' || r.suspenseDelta > 0,
      );
      if (!hasChargedResonance223) {
        issues.push({
          location: 'Thematic placement',
          rule: 'THEME_RESONANCE_EMOTIONALLY_INERT',
          severity: 'minor',
          description: `All ${resonantScenes.length} thematically resonant scenes for "${themeRaw}" carry flat emotional charge (neutral shift, zero suspense delta). Theme is acknowledged but never felt — it needs at least one scene where thematic resonance coincides with genuine stakes.`,
          suggestedFix: `Move thematic beats into scenes of emotional heat: a breakthrough, a loss, a rising tension moment. The theme lands hardest when a character's world changes as they confront what the story is about.`,
        });
      }
    }

    // ── Wave 237: Revelation decoupled, clock resonance absent, relationship-shift decoupled ──

    // THEME_REVELATION_DECOUPLED (minor, ≥6 scenes, ≥3 revelations): Revelation
    // scenes — the story's moments of maximum information delivery — carry no
    // thematic language. Revelations should resonate with the theme because they
    // answer questions the theme raises. When all revelations are "plot only," the
    // story's information architecture is structurally disconnected from its
    // central question. Distinct from THEME_SUBPLOT_ISOLATION (which flags when
    // ALL resonant scenes contain revelations): this fires when ALL revelation
    // scenes are thematically silent.
    if (records.length >= 6) {
      const revScenes237 = records.filter((r: any) => r.revelation !== null);
      if (revScenes237.length >= 3) {
        const anyRevResonant237 = revScenes237.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyRevResonant237) {
          issues.push({
            location: 'Revelation scenes',
            rule: 'THEME_REVELATION_DECOUPLED',
            severity: 'minor',
            description: `${revScenes237.length} revelation scenes carry no thematic language related to "${themeRaw}" — the story's information architecture is structurally disconnected from its central question. Revelations should answer questions the theme raises, not just advance the plot.`,
            suggestedFix: `Rewrite at least one revelation so it delivers its payload in terms of the theme: the truth revealed should complicate or crystallize what the story is ultimately about, not just change the plot. A revelation decoupled from the theme is a puzzle piece that doesn't fit.`,
          });
        }
      }
    }

    // THEME_CLOCK_RESONANCE_ABSENT (minor, ≥6 scenes, ≥2 clock scenes): Scenes
    // where a ticking clock or deadline is raised never carry thematic language.
    // Clock scenes represent maximum urgency — the question of what is worth paying
    // the cost of time. When clocks and theme are decoupled, the story's urgency
    // has no thematic meaning; the protagonist is racing against a deadline that
    // has nothing to do with what the story is about.
    if (records.length >= 6) {
      const clockScenes237 = records.filter((r: any) => r.clockRaised === true);
      if (clockScenes237.length >= 2) {
        const anyClockResonant237 = clockScenes237.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyClockResonant237) {
          issues.push({
            location: 'Clock/deadline scenes',
            rule: 'THEME_CLOCK_RESONANCE_ABSENT',
            severity: 'minor',
            description: `${clockScenes237.length} clock-raised scenes carry no thematic language related to "${themeRaw}" — the story's urgency is structurally decoupled from its central question. When the deadline has nothing to do with the theme, the pressure feels mechanical rather than meaningful.`,
            suggestedFix: `Rewrite at least one clock scene so the deadline stakes the theme: the cost of running out of time should be a thematic cost — a betrayal that can't be undone, a trust that will expire. The audience should feel that BOTH the plot and the central question are on the clock.`,
          });
        }
      }
    }

    // THEME_RELATIONSHIP_SHIFT_DECOUPLED (minor, ≥6 scenes, ≥3 relShift scenes):
    // Scenes where a character relationship shifts significantly carry no thematic
    // language. Relationship shifts are the primary vehicle for theme in drama —
    // they are the story's emotional architecture. When relationship changes are
    // thematically silent, the human connections that carry the emotional weight
    // are disconnected from the story's declared central question.
    if (records.length >= 6) {
      const relShiftScenes237 = records.filter((r: any) =>
        (r.relationshipShifts ?? []).length > 0,
      );
      if (relShiftScenes237.length >= 3) {
        const anyRelResonant237 = relShiftScenes237.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyRelResonant237) {
          issues.push({
            location: 'Relationship-shift scenes',
            rule: 'THEME_RELATIONSHIP_SHIFT_DECOUPLED',
            severity: 'minor',
            description: `${relShiftScenes237.length} relationship-shift scenes carry no thematic language related to "${themeRaw}" — the story's emotional architecture is disconnected from its central question. Relationship changes should dramatize the theme, not exist in a parallel track.`,
            suggestedFix: `Rewrite at least one relationship-shift scene so the shift expresses the theme: if the theme is betrayal, make the relationship crack along a line of trust; if loyalty, make the bond tested on precisely those terms. The theme lives in what characters do to each other.`,
          });
        }
      }
    }

    // ── Wave 265: Clue decoupled, curiosity decoupled, payoff decoupled ──────────

    // THEME_CLUE_DECOUPLED (minor, ≥6 scenes, ≥2 clue-planting scenes): All scenes
    // that plant story clues (seededClueIds present) carry no thematic language.
    // The mystery architecture is disconnected from the central question — planted
    // clues point to plot mechanics but carry no thematic meaning. Distinct from
    // THEME_REVELATION_DECOUPLED (revelation scenes) and THEME_SUBPLOT_ISOLATION
    // (all resonant scenes have revelation).
    if (records.length >= 6) {
      const clueScenes265 = records.filter((r: any) => (r.seededClueIds?.length ?? 0) > 0);
      if (clueScenes265.length >= 2) {
        const anyClueResonant265 = clueScenes265.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyClueResonant265) {
          issues.push({
            location: 'Clue-planting scenes',
            rule: 'THEME_CLUE_DECOUPLED',
            severity: 'minor',
            description: `${clueScenes265.length} clue-planting scenes carry no thematic language related to "${themeRaw}" — the mystery architecture is structurally disconnected from the central question. Planted clues should carry thematic weight: what is being discovered should connect to what the story is about.`,
            suggestedFix: `Rewrite at least one clue-planting scene so the clue speaks to the theme: if the theme is betrayal, the clue should be evidence of a betrayal; if trust, what's found should complicate trust. Plant evidence of the theme, not just evidence of the crime.`,
          });
        }
      }
    }

    // THEME_CURIOSITY_DECOUPLED (minor, ≥8 scenes, ≥2 curiosity-raising scenes):
    // All scenes that spike curiosity (curiosityDelta > 1) carry no thematic language.
    // The moments that pose story questions are thematically mute — the audience
    // wonders about plot mechanics, not about the story's central question. Distinct
    // from THEME_REVELATION_DECOUPLED (revelation scenes carry no theme) and
    // STRUCTURE_CURIOSITY_VOID (no curiosity spikes exist at all).
    if (records.length >= 8) {
      const curiosityScenes265 = records.filter((r: any) => (r.curiosityDelta ?? 0) > 1);
      if (curiosityScenes265.length >= 2) {
        const anyCuriousResonant265 = curiosityScenes265.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyCuriousResonant265) {
          issues.push({
            location: 'High-curiosity scenes',
            rule: 'THEME_CURIOSITY_DECOUPLED',
            severity: 'minor',
            description: `${curiosityScenes265.length} scenes that spike audience curiosity (curiosityDelta > 1) carry no thematic language related to "${themeRaw}" — the hook moments are thematically mute. The audience wonders about plot mechanics, not about the story's central question. Questions created by the story should point toward its theme.`,
            suggestedFix: `Embed the theme into the story's hook moments: each curiosity spike should pose a question that is ultimately about "${themeRaw}". The audience's wondering should be guided by the theme — not just "what happens next?" but "what does it mean to trust, or to betray?"`,
          });
        }
      }
    }

    // THEME_PAYOFF_DECOUPLED (minor, ≥8 scenes, ≥2 payoff scenes): All scenes
    // that pay off earlier setups (payoffSetupIds present) carry no thematic language.
    // Payoff moments are the story's peaks of consequence — when they're thematically
    // silent, the dramatic revelations of the story don't answer the central question.
    // Distinct from THEME_RESOLUTION_SILENT (final scene) and THEME_CLIMAX_SCENE_SILENT
    // (Act 3 peak): payoff scenes can appear anywhere and this fires regardless of act.
    if (records.length >= 8) {
      const payoffScenes265 = records.filter((r: any) => (r.payoffSetupIds?.length ?? 0) > 0);
      if (payoffScenes265.length >= 2) {
        const anyPayoffResonant265 = payoffScenes265.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyPayoffResonant265) {
          issues.push({
            location: 'Payoff scenes',
            rule: 'THEME_PAYOFF_DECOUPLED',
            severity: 'minor',
            description: `${payoffScenes265.length} scenes that pay off story setups carry no thematic language related to "${themeRaw}" — the moments of dramatic consequence are thematically silent. Payoffs should answer not just "what happens?" but "what does it mean?" in terms of the story's central question.`,
            suggestedFix: `Rewrite at least one payoff scene to resonate with the theme: the revelation or consequence should speak directly to "${themeRaw}". A setup planted in terms of the theme should pay off in terms of the theme. If the setup asked a plot question, the payoff should also answer the thematic one.`,
          });
        }
      }
    }

    // ── Wave 251: Final scene silent, positive shift silent, resonance clustering ──

    // THEME_FINAL_SCENE_SILENT (minor, ≥6 scenes, expandedKeywords≥2): The story's
    // final scene carries no thematic language. The last image the audience receives
    // is thematically mute — they exit with the plot's conclusion but no sense of
    // what the story was ultimately about. The final scene is the theme's last chance
    // to speak; silence there leaves the story's central question unanswered at the
    // moment of maximum receptivity.
    if (records.length >= 6 && expandedKeywords.length >= 2) {
      const lastRec251 = records[records.length - 1];
      const lastSceneText251 = sceneTexts.get(lastRec251.sceneIdx) ?? '';
      if (lastSceneText251 && !sceneHasResonance(lastSceneText251, expandedKeywords)) {
        issues.push({
          location: `Final scene (Scene ${lastRec251.sceneIdx})`,
          rule: 'THEME_FINAL_SCENE_SILENT',
          severity: 'minor',
          description: `The story's final scene carries no thematic language related to "${themeRaw}" — the closing moment is thematically mute. The last image the audience receives contains no trace of the central question the story raised.`,
          suggestedFix: `Weave at least one thematic word or image into the final scene: an echo of the opening theme statement, a visual symbol that completes the metaphor, or a line of dialogue that rephrases the central question as an answer. The final scene is the theme's last word.`,
        });
      }
    }

    // THEME_POSITIVE_SHIFT_SILENT (minor, ≥6 scenes, ≥2 positive shifts): All
    // scenes with positive emotional shifts are thematically silent — the theme is
    // present only in conflict, never in resolution or relief. The story uses theme
    // as a weapon rather than a lens. Distinct from THEME_RESONANCE_EMOTIONALLY_INERT
    // (which fires when resonant scenes carry no emotional shift): this fires when
    // positive-shift scenes are the thematically silent ones — theme speaks in pain
    // but not in release.
    if (records.length >= 6) {
      const posShiftScenes251 = records.filter((r: any) => r.emotionalShift === 'positive');
      if (posShiftScenes251.length >= 2) {
        const anyPosResonant251 = posShiftScenes251.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyPosResonant251) {
          issues.push({
            location: 'Positive emotional shift scenes',
            rule: 'THEME_POSITIVE_SHIFT_SILENT',
            severity: 'minor',
            description: `${posShiftScenes251.length} scenes with positive emotional shifts carry no thematic language — the theme is present only in conflict and loss, never in moments of relief or resolution. The story's warmth is disconnected from its central question.`,
            suggestedFix: `Let the theme breathe in at least one positive scene: a moment of joy or connection that speaks to what the story is fundamentally about. If the theme is trust, let a scene of reconciliation carry that word or its symbol. Theme needs to live in hope as well as despair.`,
          });
        }
      }
    }

    // THEME_RESONANCE_CLUSTERING (minor, ≥6 scenes, ≥4 resonant): More than 65%
    // of all thematically resonant scenes cluster within a single act zone
    // (Act 1: 0–25%, Act 2: 25–75%, or Act 3: 75–100%). The theme speaks loudly
    // in one zone and falls silent everywhere else — an uneven distribution that
    // leaves the audience without thematic guidance during large stretches of the
    // story. Distinct from THEME_OPENING_SILENCE (which fires when Act 1 has no
    // theme) — this fires when ALL acts have theme but most of it piles up in one.
    if (records.length >= 6) {
      const resonantRecords251 = records.filter((r: any) =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      );
      if (resonantRecords251.length >= 4) {
        const zones251 = [
          { name: 'Act 1', start: 0, end: Math.floor(records.length * 0.25) },
          { name: 'Act 2', start: Math.floor(records.length * 0.25), end: Math.floor(records.length * 0.75) },
          { name: 'Act 3', start: Math.floor(records.length * 0.75), end: records.length },
        ];
        for (const zone251 of zones251) {
          const zoneResonant251 = resonantRecords251.filter(
            (r: any) => r.sceneIdx >= zone251.start && r.sceneIdx < zone251.end,
          ).length;
          if (zoneResonant251 / resonantRecords251.length > 0.65) {
            issues.push({
              location: `Theme clustering in ${zone251.name}`,
              rule: 'THEME_RESONANCE_CLUSTERING',
              severity: 'minor',
              description: `${zoneResonant251} of ${resonantRecords251.length} thematically resonant scenes (${Math.round(zoneResonant251 / resonantRecords251.length * 100)}%) cluster in ${zone251.name} — the theme speaks loudly in one act and falls almost silent in the rest. The audience loses thematic orientation during large stretches of the story.`,
              suggestedFix: `Redistribute thematic resonance across all three acts: let the theme surface at the opening (planting), the midpoint (complicating), and the finale (resolving). Each act should carry at least one moment where the story's central question is visible.`,
            });
            break;
          }
        }
      }
    }

    // ── Wave 279: Dramatic-turn decoupled, negative-shift silent, suspense cluster silent ──

    // THEME_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥2 dramatic-turn scenes): All scenes
    // where a dramatic pivot occurs (dramaticTurn !== 'nothing') carry no thematic
    // language. Dramatic turns are the story's decisive structural pivots — when every
    // reversal and revelation is thematically mute, the narrative machinery operates
    // independently of the central question. The turns steer the plot but never the theme.
    if (records.length >= 8) {
      const turnScenes279 = records.filter((r: any) => (r.dramaticTurn ?? 'nothing') !== 'nothing');
      if (turnScenes279.length >= 2) {
        const anyTurnResonant279 = turnScenes279.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyTurnResonant279) {
          issues.push({
            location: 'Dramatic-turn scenes',
            rule: 'THEME_DRAMATIC_TURN_DECOUPLED',
            severity: 'minor',
            description: `${turnScenes279.length} scenes with a dramatic turn carry no thematic language related to "${themeRaw}" — every narrative pivot is thematically mute. Dramatic turns are the story's decisive moments; when they never carry the theme, reversals change the plot without ever answering the central question.`,
            suggestedFix: `Rewrite at least one dramatic-turn scene so the reversal speaks to the theme: the pivot should cost the protagonist something related to "${themeRaw}" or reveal a truth about it. A turn that changes the plot AND the thematic stakes is infinitely more resonant.`,
          });
        }
      }
    }

    // THEME_NEGATIVE_SHIFT_SILENT (minor, n≥8, ≥2 negative-shift scenes): All scenes
    // with negative emotional shifts carry no thematic language. The story's darkest
    // moments — where the protagonist loses, fails, or suffers — have no connection
    // to the central question. Theme should be felt most keenly at the nadir; when
    // loss and theme are decoupled, the pain has no meaning. Inverse of
    // THEME_POSITIVE_SHIFT_SILENT (which fires when positive scenes are thematically silent).
    if (records.length >= 8) {
      const negScenes279 = records.filter((r: any) => r.emotionalShift === 'negative');
      if (negScenes279.length >= 2) {
        const anyNegResonant279 = negScenes279.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyNegResonant279) {
          issues.push({
            location: 'Negative emotional shift scenes',
            rule: 'THEME_NEGATIVE_SHIFT_SILENT',
            severity: 'minor',
            description: `${negScenes279.length} scenes with negative emotional shifts carry no thematic language — the story's darkest moments are thematically mute. When loss and the central question are decoupled, the audience feels the pain without understanding its meaning in terms of "${themeRaw}".`,
            suggestedFix: `Let the theme speak at the story's lowest point: a scene of loss or failure should make explicit what thematic value was sacrificed. If the theme is loyalty, the betrayal should cost that; if courage, the defeat should name what was given up. Pain needs thematic meaning to become drama.`,
          });
        }
      }
    }

    // THEME_SUSPENSE_CLUSTER_SILENT (minor, n≥8, ≥3 scenes with suspenseDelta > 1): All
    // high-suspense scenes carry no thematic language. The moments of maximum tension
    // — where the audience's pulse quickens — have no thematic dimension. Distinct from
    // THEME_CLOCK_RESONANCE_ABSENT (ticking clocks) and THEME_CLIMAX_SCENE_SILENT (single
    // peak scene): this checks whether the cluster of high-tension scenes as a group
    // carries any theme. When all suspense is thematically empty, the story is exciting
    // but not meaningful.
    if (records.length >= 8) {
      const suspenseScenes279 = records.filter((r: any) => (r.suspenseDelta ?? 0) > 1);
      if (suspenseScenes279.length >= 3) {
        const anySuspenseResonant279 = suspenseScenes279.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anySuspenseResonant279) {
          issues.push({
            location: 'High-suspense scenes',
            rule: 'THEME_SUSPENSE_CLUSTER_SILENT',
            severity: 'minor',
            description: `${suspenseScenes279.length} high-suspense scenes (suspenseDelta > 1) carry no thematic language related to "${themeRaw}" — the story's most gripping moments are thematically hollow. Tension that never implicates the central question makes the story exciting but not meaningful.`,
            suggestedFix: `Weave the theme into at least one high-suspense scene: the thing at stake in the tense moment should connect to "${themeRaw}". If the audience is on the edge of their seat, they should also be questioning what the story is about — the greatest suspense is thematic as well as physical.`,
          });
        }
      }
    }

    // ── Wave 293: THEME_REVELATION_SILENT ────────────────────────────────────
    // All revelation scenes carry no thematic language. Revelations are the
    // story's information peaks — the moments where hidden truth emerges. When
    // every revelation is thematically mute, the audience receives facts without
    // understanding their thematic weight. Requires n≥8 and ≥2 revelation scenes.
    if (records.length >= 8) {
      const revScenes293 = records.filter((r: any) => r.revelation !== null);
      if (revScenes293.length >= 2) {
        const anyRevResonant293 = revScenes293.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyRevResonant293) {
          issues.push({
            location: 'Revelation scenes',
            rule: 'THEME_REVELATION_SILENT',
            severity: 'minor',
            description: `${revScenes293.length} revelation scene(s) carry no thematic language related to "${themeRaw}" — the story's moments of disclosed truth are thematically mute. Revelations should reframe the theme: what is revealed should illuminate what the story is about, not just what happened.`,
            suggestedFix: `Each revelation should answer a thematic question, not just a plot question. If the theme is betrayal, the revelation should expose what loyalty costs; if it is identity, the truth revealed should force a character to confront who they are. Let "${themeRaw}" resonate in every unmasking.`,
          });
        }
      }
    }

    // ── Wave 293: THEME_CLOCK_SCENE_SILENT ───────────────────────────────────
    // All clock-raising scenes carry no thematic language. The story's urgency
    // engine — the ticking deadlines — never implicates the central theme. When
    // time pressure is decoupled from the thematic question, the stakes are
    // mechanical rather than meaningful: the audience fears running out of time
    // without knowing what the time is for. Requires n≥8 and ≥2 clockRaised scenes.
    if (records.length >= 8) {
      const clockScenes293 = records.filter((r: any) => r.clockRaised === true);
      if (clockScenes293.length >= 2) {
        const anyClockResonant293 = clockScenes293.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyClockResonant293) {
          issues.push({
            location: 'Clock-raising scenes',
            rule: 'THEME_CLOCK_SCENE_SILENT',
            severity: 'minor',
            description: `${clockScenes293.length} clock-raising scene(s) carry no thematic language related to "${themeRaw}" — the story's urgency engine is thematically disconnected. Time pressure without thematic meaning creates mechanical tension: the audience worries about the deadline without understanding what the deadline is for.`,
            suggestedFix: `Connect the deadline to "${themeRaw}": what thematic value is at stake when the clock expires? If the theme is redemption, the deadline is the last chance for it; if justice, the clock is time running out on the truth. Ticking clocks become unbearable when what they threaten is thematic, not just practical.`,
          });
        }
      }
    }

    // ── Wave 293: THEME_PAYOFF_SILENT ────────────────────────────────────────
    // All payoff scenes carry no thematic language. The story's resolution engine
    // — the moments when planted threads finally resolve — never connects to the
    // central theme. When payoffs are thematically silent, the audience receives
    // closure without insight: the loop closes but the meaning is absent.
    // Requires n≥8 and ≥2 payoff scenes (payoffSetupIds non-empty).
    if (records.length >= 8) {
      const payoffScenes293 = records.filter((r: any) => (r.payoffSetupIds?.length ?? 0) > 0);
      if (payoffScenes293.length >= 2) {
        const anyPayoffResonant293 = payoffScenes293.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyPayoffResonant293) {
          issues.push({
            location: 'Payoff scenes',
            rule: 'THEME_PAYOFF_SILENT',
            severity: 'minor',
            description: `${payoffScenes293.length} payoff scene(s) carry no thematic language related to "${themeRaw}" — the story's resolution moments are thematically empty. Payoffs that close loops without implicating the theme produce satisfaction without meaning: the audience feels the closure but cannot articulate what it was for.`,
            suggestedFix: `Ensure each payoff answers both a plot question and a thematic question. What does the resolved thread reveal about "${themeRaw}"? A clue paid off should say something about the theme, not just confirm a fact. Thematic payoffs are the difference between a satisfying ending and a meaningful one.`,
          });
        }
      }
    }

    // ── Wave 307: shallow resonance, quiet scenes only, resonance burst ──────
    // Local hit accounting over the resonant set (reuses expandedKeywords +
    // sceneTexts, both in scope here).
    const distinctKw307 = (text: string) =>
      expandedKeywords.filter(forms => forms.some(f => text.includes(f))).length;
    const formHits307 = (text: string) =>
      expandedKeywords.reduce(
        (s, forms) => s + forms.reduce((c, f) => c + (f ? text.split(f).length - 1 : 0), 0),
        0,
      );
    const resonant307 = records.filter(r => distinctKw307(sceneTexts.get(r.sceneIdx) ?? '') > 0);

    // THEME_SHALLOW_RESONANCE (minor, ≥3 resonant scenes, ≥2 theme keywords): No
    // resonant scene matches two or more distinct theme keywords. The theme is
    // name-dropped a single facet at a time but never explored in depth within a
    // single beat — the audience never sees two sides of the theme collide in one
    // scene. Distinct from THEME_SINGLE_KEYWORD_RELIANCE (which audits keyword
    // proportions across the whole story) — this audits per-scene facet depth.
    if (resonant307.length >= 3 && expandedKeywords.length >= 2) {
      const maxDistinct307 = Math.max(
        ...resonant307.map(r => distinctKw307(sceneTexts.get(r.sceneIdx) ?? '')),
      );
      if (maxDistinct307 <= 1) {
        issues.push({
          location: 'Thematically resonant scenes',
          rule: 'THEME_SHALLOW_RESONANCE',
          severity: 'minor',
          description: `Across ${resonant307.length} thematically resonant scenes, no single scene touches more than one facet of "${themeRaw}" — the theme is name-dropped one keyword at a time but never explored in depth. Theme lands hardest when two sides of its tension meet in the same beat; one-keyword-per-scene resonance keeps the theme a label rather than a lived idea.`,
          suggestedFix: `Write at least one scene where multiple facets of "${themeRaw}" collide — where the competing values the theme names are both present and in tension. A scene that holds two sides of the theme at once does more thematic work than a dozen that each gesture at one.`,
        });
      }
    }

    // THEME_QUIET_SCENES_ONLY (minor, ≥3 resonant scenes): Every resonant scene is
    // emotionally neutral AND low-suspense (suspenseDelta ≤ 1). The theme only ever
    // surfaces in dramatically inert connective tissue, never in a charged scene.
    // Distinct from THEME_SUSPENSE_CLUSTER_SILENT (population = high-suspense scenes)
    // and the emotional-shift-silent checks (population = shifted scenes) — this
    // audits whether the resonant set as a whole ever lands in a charged scene.
    if (resonant307.length >= 3) {
      const allQuiet307 = resonant307.every(
        (r: any) => r.emotionalShift === 'neutral' && (r.suspenseDelta ?? 0) <= 1,
      );
      if (allQuiet307) {
        issues.push({
          location: 'Thematically resonant scenes',
          rule: 'THEME_QUIET_SCENES_ONLY',
          severity: 'minor',
          description: `All ${resonant307.length} thematically resonant scenes are emotionally neutral and low-suspense — the theme "${themeRaw}" only ever surfaces in dramatically inert scenes. When theme appears exclusively in quiet connective tissue and never in a charged moment, the audience files it as commentary rather than experiencing it as stakes.`,
          suggestedFix: `Move at least one thematic beat into a charged scene — a confrontation, a reversal, a moment of real suspense or emotional swing. Theme that surfaces when the stakes are highest fuses idea and feeling; theme confined to calm scenes stays intellectual.`,
        });
      }
    }

    // THEME_RESONANCE_BURST (minor, total hits ≥4, ≥2 resonant scenes): A single
    // scene holds more than half of all theme keyword occurrences in the story.
    // The theme is crammed into one moment rather than woven through. Distinct from
    // THEME_HEAVY_HANDED (a scene with ≥6 hits and >3× the average) — BURST is a
    // share-of-total measure that fires on concentration even at modest counts.
    if (resonant307.length >= 2) {
      const perSceneHits307 = resonant307.map(r => formHits307(sceneTexts.get(r.sceneIdx) ?? ''));
      const totalHits307 = perSceneHits307.reduce((s, v) => s + v, 0);
      const maxHits307 = Math.max(...perSceneHits307);
      if (totalHits307 >= 4 && maxHits307 / totalHits307 > 0.5) {
        issues.push({
          location: 'Theme keyword distribution',
          rule: 'THEME_RESONANCE_BURST',
          severity: 'minor',
          description: `A single scene holds ${maxHits307} of ${totalHits307} total theme keyword occurrences (${Math.round(maxHits307 / totalHits307 * 100)}%) for "${themeRaw}" — the theme is concentrated in one burst rather than woven through the story. A theme delivered in a single concentrated dose reads as a thesis statement the rest of the script forgot to dramatize.`,
          suggestedFix: `Redistribute the theme's language across the story: take the keyword density piled into one scene and spread it so the theme recurs as a thread the audience can track from opening to finale. A theme woven through many scenes accumulates; a theme dumped in one evaporates.`,
        });
      }
    }

    // ── Wave 321: peak-before-midpoint, raise-stakes silent, suspense-release silent ──

    // THEME_PEAK_BEFORE_MIDPOINT (minor, n≥8, totalHits≥4, peak≥2): The scene
    // with the most theme keyword hits — the thematic peak — falls in the first
    // half of the story. Theme should crescendo toward the climax; a thematic
    // peak in the setup means the densest statement of the story's idea arrives
    // before the audience is invested, then the theme thins out. Distinct from
    // THEME_FRONT_LOADED (first-third vs rest density gradient), THEME_ACCELERATING_
    // DENSITY_ABSENT (final-third vs first-third), and THEME_RESONANCE_BURST
    // (single-scene share of total) — this is an argmax-position metric.
    if (records.length >= 8) {
      let peakPos321 = -1;
      let peakHits321 = 0;
      for (let i = 0; i < records.length; i++) {
        const h321 = sceneHitCounts.get(records[i].sceneIdx) ?? 0;
        if (h321 > peakHits321) { peakHits321 = h321; peakPos321 = i; }
      }
      const totalHits321 = [...sceneHitCounts.values()].reduce((s, v) => s + v, 0);
      const midPos321 = Math.floor(records.length / 2);
      if (peakHits321 >= 2 && totalHits321 >= 4 && peakPos321 >= 0 && peakPos321 < midPos321) {
        issues.push({
          location: `Scene ${records[peakPos321].sceneIdx} (thematic peak)`,
          rule: 'THEME_PEAK_BEFORE_MIDPOINT',
          severity: 'minor',
          description: `The thematic peak — the scene with the most "${themeRaw}" language (${peakHits321} hits) — falls in the first half of the story (Scene ${records[peakPos321].sceneIdx} of ${records.length}). Theme should build toward its densest statement near the climax, where the audience is most invested; a peak in the setup states the idea before anyone cares, then lets it thin out toward the ending.`,
          suggestedFix: `Shift the theme's strongest expression later: let the setup introduce the question lightly and reserve the most concentrated thematic beat for a scene at or near the climax, where the story's events give the idea its full weight. The theme should land hardest where the stakes are highest.`,
        });
      }
    }

    // THEME_RAISE_STAKES_SILENT (minor, n≥8, ≥2 raise-stakes scenes): Every scene
    // whose purpose is to raise the stakes carries no thematic language. The
    // moments that escalate the story's danger are disconnected from what the
    // story is about — the audience feels the pressure rise but never sees it
    // implicate the theme. Distinct from the other channel-silent checks
    // (revelation, clock-raised, payoff, clue, curiosity, dramatic-turn, shifts,
    // high-suspense): population here is scenes with purpose === 'raise_stakes'.
    if (records.length >= 8) {
      const stakesScenes321 = records.filter((r: any) => r.purpose === 'raise_stakes');
      if (stakesScenes321.length >= 2) {
        const allSilent321 = stakesScenes321.every(
          r => !sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (allSilent321) {
          issues.push({
            location: `${stakesScenes321.length} raise-stakes scene(s)`,
            rule: 'THEME_RAISE_STAKES_SILENT',
            severity: 'minor',
            description: `All ${stakesScenes321.length} stake-raising scenes carry no language related to "${themeRaw}" — the moments that escalate the story's danger are thematically empty. When rising stakes never implicate the theme, the audience feels the pressure mount mechanically but cannot connect it to the story's central question. Escalation without thematic stake is plot machinery.`,
            suggestedFix: `Tie each escalation to the theme: when the stakes rise, let what is threatened be the value the theme is about. If the theme is "trust," the rising danger should put trust itself at risk — so the audience feels the cost in thematic terms, not just plot terms.`,
          });
        }
      }
    }

    // THEME_SUSPENSE_RELEASE_SILENT (minor, n≥8, ≥2 release scenes): Every scene
    // that releases clock pressure (clockDelta < 0) carries no thematic language.
    // Release beats are the story's exhales — natural reflection points where a
    // character (and audience) can process what just happened. When all release
    // moments are thematically silent, the story never uses its quiet beats to
    // deepen meaning. Distinct from THEME_CLOCK_SCENE_SILENT (population =
    // clockRaised scenes, i.e. tension BUILD): this audits tension RELEASE.
    if (records.length >= 8) {
      const releaseScenes321 = records.filter((r: any) => (r.clockDelta ?? 0) < 0);
      if (releaseScenes321.length >= 2) {
        const allSilent321r = releaseScenes321.every(
          r => !sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (allSilent321r) {
          issues.push({
            location: `${releaseScenes321.length} tension-release scene(s)`,
            rule: 'THEME_SUSPENSE_RELEASE_SILENT',
            severity: 'minor',
            description: `All ${releaseScenes321.length} tension-release scenes (clockDelta < 0) carry no language related to "${themeRaw}" — the story's exhale moments are thematically empty. Release beats are where a character and the audience process what just happened; squandering them on plot-only downtime wastes the story's natural reflection points, where theme lands most gently and most deeply.`,
            suggestedFix: `Use release beats to deepen the theme: after the pressure drops, give a character a moment to reckon with what the recent events mean in terms of "${themeRaw}" — a quiet line, a telling action, an image that reframes the cost. The exhale is when meaning settles.`,
          });
        }
      }
    }

    // ── Wave 332: THEME_DEVELOPMENT_SCENE_DESERT, THEME_CURIOSITY_PEAK_ABSENT, THEME_ACT2B_DENSITY_DROP ──

    // THEME_DEVELOPMENT_SCENE_DESERT (minor, n≥10, ≥4 dev scenes): None of the
    // scenes with purpose='development' carry thematic resonance. The story's
    // connective tissue — the scenes that link structural events — is completely
    // thematically empty. When theme only appears at set-pieces (revelations,
    // turns, escalations) but never in the in-between moments, the audience
    // experiences the theme as episodic punctuation rather than a continuous
    // undercurrent. Distinct from THEME_ACT2_DESERT (zone-based %; this is
    // purpose-based and can fire outside Act 2) and THEME_QUIET_SCENES_ONLY
    // (fires when theme ONLY appears in quiet scenes — the opposite problem).
    if (records.length >= 10) {
      const devScenes332 = records.filter((r: any) => r.purpose === 'development');
      if (devScenes332.length >= 4) {
        const anyDevResonant332 = devScenes332.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyDevResonant332) {
          issues.push({
            location: `${devScenes332.length} development scene(s)`,
            rule: 'THEME_DEVELOPMENT_SCENE_DESERT',
            severity: 'minor',
            description: `All ${devScenes332.length} scenes marked as 'development' carry no language related to "${themeRaw}" — the story's connective tissue is thematically empty. Theme appears at structural peak moments (revelations, turns, escalations) but vanishes in the scenes between them. The audience experiences the theme as episodic punctuation rather than a continuous undercurrent of meaning.`,
            suggestedFix: `Weave the theme into the development scenes: a passing reference, an image that echoes the theme's vocabulary, or a character action that embodies the theme without announcing it. The connective tissue of the story is where the theme becomes habitual — where the audience starts to feel it before they consciously register it.`,
          });
        }
      }
    }

    // THEME_CURIOSITY_PEAK_ABSENT (minor, n≥8, totalHits≥3): The scene with the
    // highest curiosityDelta carries no thematic resonance — even though other scenes
    // do carry the theme. The story's single most question-raising moment is
    // thematically mute. The audience is most curious at that scene but the curiosity
    // is pure plot mechanics, not thematic inquiry. Distinct from THEME_CURIOSITY_DECOUPLED
    // (fires when ALL high-curiosity scenes lack theme; this fires when the PEAK
    // curiosity scene lacks theme even if other curiosity scenes carry it).
    if (records.length >= 8 && totalHits >= 3) {
      const maxCuriosity332 = Math.max(...(records as any[]).map(r => r.curiosityDelta ?? 0));
      if (maxCuriosity332 > 0) {
        const peakRec332 = (records as any[]).find(r => (r.curiosityDelta ?? 0) === maxCuriosity332);
        if (peakRec332 && !sceneHasResonance(sceneTexts.get(peakRec332.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${peakRec332.sceneIdx} (peak curiosity: ${maxCuriosity332})`,
            rule: 'THEME_CURIOSITY_PEAK_ABSENT',
            severity: 'minor',
            description: `The scene with the highest curiosityDelta (Scene ${peakRec332.sceneIdx}, delta ${maxCuriosity332}) carries no language related to "${themeRaw}" — the story's single most question-raising moment is thematically mute. While other scenes carry the theme, the moment of maximum curiosity leaves the audience wondering about plot mechanics rather than thematic meaning. The most urgent question posed should be the story's thematic question.`,
            suggestedFix: `Embed the theme in the peak curiosity scene: let the question it raises be ultimately about "${themeRaw}" rather than purely about what happens next. The audience should leave that scene wondering about the theme, not just about the plot.`,
          });
        }
      }
    }

    // THEME_ACT2B_DENSITY_DROP (minor, n≥12): Thematic resonance density in Act 2b
    // (50%–75%) falls below half the density of Act 2a (25%–50%). The theme
    // thins precisely when the story should be escalating its central question —
    // the run-up to the climax loses thematic pressure. Distinct from
    // THEME_DENSITY_INVERSION (first half vs second half overall), THEME_FRONT_LOADED
    // (first-third vs rest), and THEME_ACT2_DESERT (Act 2 as a whole < 30% resonant):
    // this specifically checks the 2a-to-2b trajectory within Act 2.
    if (records.length >= 12) {
      const act2aStart332 = Math.floor(records.length * 0.25);
      const act2bStart332 = Math.floor(records.length * 0.5);
      const act2bEnd332 = Math.floor(records.length * 0.75);
      const act2aRecs332 = records.slice(act2aStart332, act2bStart332);
      const act2bRecs332 = records.slice(act2bStart332, act2bEnd332);
      if (act2aRecs332.length > 0 && act2bRecs332.length > 0) {
        const act2aResonant332 = act2aRecs332.filter((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        ).length;
        const act2bResonant332 = act2bRecs332.filter((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        ).length;
        const act2aDensity332 = act2aResonant332 / act2aRecs332.length;
        const act2bDensity332 = act2bResonant332 / act2bRecs332.length;
        if (act2aDensity332 > 0.4 && act2bDensity332 < act2aDensity332 * 0.5) {
          issues.push({
            location: `Act 2a vs Act 2b — thematic density drop`,
            rule: 'THEME_ACT2B_DENSITY_DROP',
            severity: 'minor',
            description: `Thematic density falls sharply from Act 2a (${Math.round(act2aDensity332 * 100)}% resonant) to Act 2b (${Math.round(act2bDensity332 * 100)}% resonant) — the story loses thematic pressure in the run-up to the climax. The complication zone should escalate the theme toward its most intense statement near the climax; a thinning in Act 2b means the thematic question goes quiet at the exact moment it should be most insistent.`,
            suggestedFix: `Maintain or increase thematic density into Act 2b: let the escalating stakes also escalate the thematic question. Each new complication in Act 2b should tighten the screw on "${themeRaw}" — the theme should arrive at the climax at maximum pressure, not at minimum.`,
          });
        }
      }
    }

    // ── Wave 346: THEME_SUSPENSE_PEAK_ABSENT, THEME_LATE_DEBUT, THEME_CLOSING_QUARTER_SILENT ──

    // THEME_SUSPENSE_PEAK_ABSENT (minor, n≥8, totalHits≥3): The scene with the
    // highest suspenseDelta carries no thematic resonance, even though other scenes do.
    // The story's single most tense moment is thematically mute — the audience is at
    // peak tension, but the danger is pure plot mechanics rather than a collision with
    // the theme. The most charged confrontation should be where the thematic question
    // is most at stake. The suspense analogue of THEME_CURIOSITY_PEAK_ABSENT (Wave 332);
    // distinct from THEME_SUSPENSE_CLUSTER_SILENT (a run of high-suspense scenes) and
    // THEME_SUSPENSE_RELEASE_SILENT (tension-release scenes).
    if (records.length >= 8 && totalHits >= 3) {
      const maxSuspense346 = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
      if (maxSuspense346 > 0) {
        const peakRec346 = (records as any[]).find(r => (r.suspenseDelta ?? 0) === maxSuspense346);
        if (peakRec346 && !sceneHasResonance(sceneTexts.get(peakRec346.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${peakRec346.sceneIdx} (peak suspense: ${maxSuspense346})`,
            rule: 'THEME_SUSPENSE_PEAK_ABSENT',
            severity: 'minor',
            description: `The scene with the highest suspenseDelta (Scene ${peakRec346.sceneIdx}, delta ${maxSuspense346}) carries no language related to "${themeRaw}" — the story's single most tense moment is thematically mute. While other scenes carry the theme, the peak of tension lands as pure plot danger rather than a collision with the thematic question. The most charged confrontation is exactly where the theme should be most at stake.`,
            suggestedFix: `Bind the theme to the peak-tension scene: let what is in jeopardy there be ultimately about "${themeRaw}", not just about who survives or wins. When the audience is most gripped, the stakes they feel should be thematic as well as physical.`,
          });
        }
      }
    }

    // THEME_LATE_DEBUT (minor, n≥8, totalHits≥2): The first scene that carries any
    // thematic resonance falls at or after the midpoint — the entire first half of the
    // story is thematically silent. A theme introduced only in the back half has no time
    // to establish itself as the story's through-line; the audience reaches the midpoint
    // with no sense of what the story is about, then is asked to invest in a meaning that
    // arrives late. Distinct from THEME_OPENING_SILENT (only the first three scenes) and
    // THEME_FRONT_LOADED / THEME_FIRST_ACT_RESOLUTION (the opposite — theme spent early).
    if (records.length >= 8 && totalHits >= 2) {
      const mid346 = Math.floor(records.length * 0.5);
      let firstResonantPos346 = -1;
      for (let i346 = 0; i346 < records.length; i346++) {
        if (sceneHasResonance(sceneTexts.get((records as any[])[i346].sceneIdx) ?? '', expandedKeywords)) {
          firstResonantPos346 = i346;
          break;
        }
      }
      if (firstResonantPos346 >= mid346) {
        issues.push({
          location: `First thematic resonance at Scene ${(records as any[])[firstResonantPos346].sceneIdx} (past the midpoint)`,
          rule: 'THEME_LATE_DEBUT',
          severity: 'minor',
          description: `The first scene carrying any language related to "${themeRaw}" is Scene ${(records as any[])[firstResonantPos346].sceneIdx}, at or past the story's midpoint — the entire first half is thematically silent. A theme introduced only in the back half has no time to establish itself as the through-line; the audience reaches the midpoint with no sense of what the story is about, then is asked to invest in a meaning that arrives late.`,
          suggestedFix: `Plant the theme early: let "${themeRaw}" surface — even quietly — in the opening act, through an image, a line, or a choice that frames the question the story will explore. The theme the audience meets in Act 1 is the one they feel resolve in Act 3.`,
        });
      }
    }

    // THEME_CLOSING_QUARTER_SILENT (minor, n≥12, ≥3 final-quarter scenes): The final
    // 25% of the story contains no thematically resonant scene, while the theme appears
    // earlier. The thematic frame is left open — the story raises its central question
    // but lets it go quiet exactly where it should resolve. A theme that vanishes from
    // the finale denies the audience the sense that the ending answers (or pointedly
    // refuses to answer) what the story was about. Distinct from THEME_FINAL_SCENE_SILENT
    // (the single last scene), THEME_RESOLUTION_SILENT (purpose='resolution' scenes), and
    // THEME_CLIMAX_SCENE_SILENT (the climax scene): this checks the whole closing zone.
    if (records.length >= 12) {
      const finalStart346 = Math.floor(records.length * 0.75);
      const finalRecs346 = (records as any[]).slice(finalStart346);
      const earlierRecs346 = (records as any[]).slice(0, finalStart346);
      if (finalRecs346.length >= 3) {
        const earlierResonant346 = earlierRecs346.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        const finalResonant346 = finalRecs346.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (earlierResonant346 && !finalResonant346) {
          issues.push({
            location: `Closing quarter (Scenes ${finalStart346}–${records.length - 1}) — thematically silent`,
            rule: 'THEME_CLOSING_QUARTER_SILENT',
            severity: 'minor',
            description: `The final quarter of the story (Scenes ${finalStart346}–${records.length - 1}) carries no language related to "${themeRaw}", though the theme appears earlier — the thematic frame is left open. The story raises its central question but lets it go quiet exactly where it should resolve, so the ending answers the plot without answering (or pointedly refusing to answer) what the story was about.`,
            suggestedFix: `Return to the theme in the closing quarter: the climax and denouement should be where "${themeRaw}" reaches its sharpest statement — the moment the story's argument lands. Let the resolution of the plot also resolve the thematic question, so the ending feels like it meant something.`,
          });
        }
      }
    }

    // ── Wave 360: THEME_ACT3_DENSITY_DROP, THEME_RELATIONSHIP_PEAK_ABSENT, THEME_DUAL_PEAK_ABSENT ──

    // THEME_ACT3_DENSITY_DROP (minor, n≥12, ≥2 resonant Act 2 scenes): The
    // proportion of resonant scenes in Act 3 (final 25%) is less than 50% of
    // the proportion in Act 2 (25%–75%). The theme thins sharply at the approach
    // to resolution — exactly when it should be at its most insistent. Distinct
    // from THEME_CLOSING_QUARTER_SILENT (total absence in final 25%; this fires
    // even when some theme is present but much less dense than Act 2), THEME_
    // ACCELERATING_DENSITY_ABSENT (keyword count, first-third vs last-third),
    // THEME_DENSITY_INVERSION (first half vs second half), and THEME_ACT2B_
    // DENSITY_DROP (Act 2a vs Act 2b within Act 2).
    if (records.length >= 12) {
      const act2Start360 = Math.floor(records.length * 0.25);
      const act3Start360 = Math.floor(records.length * 0.75);
      const act2Recs360 = (records as any[]).slice(act2Start360, act3Start360);
      const act3Recs360 = (records as any[]).slice(act3Start360);
      const act2Resonant360 = act2Recs360.filter((r: any) =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      ).length;
      const act3Resonant360 = act3Recs360.filter((r: any) =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      ).length;
      if (act2Resonant360 >= 2 && act3Recs360.length >= 2) {
        const act2Density360 = act2Resonant360 / act2Recs360.length;
        const act3Density360 = act3Resonant360 / act3Recs360.length;
        if (act3Density360 < act2Density360 * 0.5) {
          issues.push({
            location: `Act 3 (Scenes ${act3Start360}–${records.length - 1}) — thematic density drop`,
            rule: 'THEME_ACT3_DENSITY_DROP',
            severity: 'minor',
            description: `Act 3 is ${Math.round(act3Density360 * 100)}% thematically resonant vs Act 2's ${Math.round(act2Density360 * 100)}% — the theme thins sharply at the approach to resolution. The story should be escalating its thematic argument toward the climax, not retreating from it; a density drop into Act 3 means the ending inherits a plot without a meaning.`,
            suggestedFix: `Bring the theme back at full force in Act 3: the climax should be where "${themeRaw}" is most urgently at stake, not where it quietly recedes. Redistribute resonant beats into the finale so the ending answers the story's central question at the moment of highest dramatic pressure.`,
          });
        }
      }
    }

    // THEME_RELATIONSHIP_PEAK_ABSENT (minor, n≥8, ≥2 resonant relationship-
    // shift scenes): The scene carrying the largest absolute relationship shift
    // (max |amount| across all shifts in all scenes) is thematically silent,
    // even though at least 2 other relationship-shift scenes carry theme. The
    // biggest relational swing in the story happens without thematic resonance
    // — the moment a bond moves most dramatically is thematically mute. Distinct
    // from THEME_RELATIONSHIP_SHIFT_DECOUPLED (all shift scenes are silent; this
    // fires when others carry theme but the PEAK is silent) and THEME_SUSPENSE_
    // PEAK_ABSENT / THEME_CURIOSITY_PEAK_ABSENT (different channels).
    if (records.length >= 8) {
      const shiftRecs360 = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      const resonantShiftRecs360 = shiftRecs360.filter((r: any) =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      );
      if (resonantShiftRecs360.length >= 2) {
        let peakAmount360 = 0;
        let peakRec360: any = null;
        for (const r of shiftRecs360) {
          for (const sh of (r.relationshipShifts ?? []) as Array<{ amount: number }>) {
            if (Math.abs(sh.amount) > peakAmount360) {
              peakAmount360 = Math.abs(sh.amount);
              peakRec360 = r;
            }
          }
        }
        if (peakRec360 && !sceneHasResonance(sceneTexts.get(peakRec360.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${peakRec360.sceneIdx} — largest relationship shift (|${peakAmount360.toFixed(2)}|)`,
            rule: 'THEME_RELATIONSHIP_PEAK_ABSENT',
            severity: 'minor',
            description: `The scene with the story's largest relationship shift (Scene ${peakRec360.sceneIdx}, magnitude ${peakAmount360.toFixed(2)}) carries no language related to "${themeRaw}", even though ${resonantShiftRecs360.length} other relationship-shift scenes do. The biggest relational swing in the story — the moment a bond moves most dramatically — happens without thematic resonance, so the audience registers the event but misses its meaning.`,
            suggestedFix: `Let the peak relational moment carry the theme: when a bond breaks or deepens most severely, the language should echo what the story is about. If the theme is "${themeRaw}", the biggest shift should make explicit what value is at stake in that bond at that moment.`,
          });
        }
      }
    }

    // THEME_DUAL_PEAK_ABSENT (minor, n≥8, ≥3 resonant scenes): The scene with
    // the highest combined (suspenseDelta + curiosityDelta) carries no theme —
    // the most dramatically and intellectually charged moment of the story is
    // thematically silent. This is the moment where both tension and curiosity
    // peak simultaneously; if the theme is absent there, the audience's most
    // heightened state is thematically blank. Distinct from THEME_SUSPENSE_PEAK_
    // ABSENT (max suspenseDelta alone) and THEME_CURIOSITY_PEAK_ABSENT (max
    // curiosityDelta alone): this targets the joint peak, which may be a different
    // scene than either individual peak.
    if (records.length >= 8 && resonantScenes.length >= 3) {
      const maxDual360 = Math.max(...(records as any[]).map(r =>
        (r.suspenseDelta ?? 0) + (r.curiosityDelta ?? 0),
      ));
      if (maxDual360 > 0) {
        const peakDualRec360 = (records as any[]).find(r =>
          (r.suspenseDelta ?? 0) + (r.curiosityDelta ?? 0) === maxDual360,
        );
        if (peakDualRec360 && !sceneHasResonance(sceneTexts.get(peakDualRec360.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${peakDualRec360.sceneIdx} — combined suspense + curiosity peak (${maxDual360.toFixed(2)})`,
            rule: 'THEME_DUAL_PEAK_ABSENT',
            severity: 'minor',
            description: `Scene ${peakDualRec360.sceneIdx} has the story's highest combined suspense and curiosity charge (suspenseDelta + curiosityDelta = ${maxDual360.toFixed(2)}) but carries no language related to "${themeRaw}". The moment where tension and intrigue peak simultaneously — when the audience is most gripped and most curious — is thematically blank. The most engaged the audience will be all story, and the theme is nowhere in the scene.`,
            suggestedFix: `Bring "${themeRaw}" into the story's peak dramatic moment: when suspense and curiosity crest at the same scene, the thematic stakes should be explicit. The audience's maximum engagement is the most powerful moment to remind them what the story is ultimately about.`,
          });
        }
      }
    }

    // ── Wave 374: THEME_ACT1_DENSITY_DROP, THEME_CLOCK_PEAK_ABSENT, THEME_CHARGED_SCENE_SILENT ──

    // THEME_ACT1_DENSITY_DROP (minor, n≥12, ≥2 resonant scenes in the body): Act 1
    // (the first 25%) has a resonance proportion less than half that of the rest of the
    // story. The opening under-weights the theme relative to the body, so the audience
    // spends the setup with little sense of what the story is about and the through-line
    // is established late. Distinct from THEME_OPENING_SILENT (only the first three
    // scenes), THEME_LATE_DEBUT (first resonant scene past the midpoint), and THEME_FRONT_
    // LOADED (the opposite — theme concentrated early): this compares Act 1 density to the
    // remaining acts.
    if (records.length >= 12) {
      const act1End374 = Math.floor(records.length * 0.25);
      const act1Recs374 = (records as any[]).slice(0, act1End374);
      const restRecs374 = (records as any[]).slice(act1End374);
      const act1Resonant374 = act1Recs374.filter((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords)).length;
      const restResonant374 = restRecs374.filter((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords)).length;
      if (act1Recs374.length >= 2 && restResonant374 >= 2) {
        const act1Density374 = act1Resonant374 / act1Recs374.length;
        const restDensity374 = restResonant374 / restRecs374.length;
        if (act1Density374 < restDensity374 * 0.5) {
          issues.push({
            location: `Act 1 (Scenes 0–${act1End374 - 1}) — thematic density drop`,
            rule: 'THEME_ACT1_DENSITY_DROP',
            severity: 'minor',
            description: `Act 1 is ${Math.round(act1Density374 * 100)}% thematically resonant vs ${Math.round(restDensity374 * 100)}% across the rest of the story — the opening under-weights the theme relative to the body. The audience spends the setup with little sense of what "${themeRaw}" means to the story, so the through-line is established late and the early scenes don't frame the question the rest of the film will explore.`,
            suggestedFix: `Weave "${themeRaw}" into Act 1 at closer to the density of the later acts: an image, a line, or a choice in the opening that plants the thematic question. The theme the audience meets in the setup is the one they feel pay off in the climax — establish it early enough to matter.`,
          });
        }
      }
    }

    // THEME_CLOCK_PEAK_ABSENT (minor, n≥8, ≥2 clock scenes): The clock-raising scene
    // with the largest clockDelta is thematically silent, even though the theme appears
    // elsewhere. The story's most urgent deadline — the moment time pressure peaks — has
    // no thematic dimension, so the audience feels the clock without connecting it to what
    // the story is about. Distinct from THEME_CLOCK_SCENE_SILENT (which fires when ALL
    // clock scenes are silent — a set check); this isolates the single peak deadline.
    if (records.length >= 8) {
      const clockScenes374 = (records as any[]).filter(r => r.clockRaised === true);
      if (clockScenes374.length >= 2) {
        const peakClock374 = clockScenes374.reduce((best: any, r: any) =>
          (r.clockDelta ?? 0) > (best.clockDelta ?? 0) ? r : best, clockScenes374[0]);
        if (peakClock374 && !sceneHasResonance(sceneTexts.get(peakClock374.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${peakClock374.sceneIdx} — peak deadline (clockDelta ${(peakClock374.clockDelta ?? 0).toFixed(2)})`,
            rule: 'THEME_CLOCK_PEAK_ABSENT',
            severity: 'minor',
            description: `The story's most urgent deadline (Scene ${peakClock374.sceneIdx}, clockDelta ${(peakClock374.clockDelta ?? 0).toFixed(2)}) carries no language related to "${themeRaw}", though the theme appears elsewhere. The moment time pressure peaks has no thematic dimension, so the audience feels the clock tightening without connecting the urgency to what the story is ultimately about — the deadline is mechanical rather than meaningful.`,
            suggestedFix: `Tie the peak deadline to "${themeRaw}": what thematic value is at stake when this clock runs out? When the most urgent moment of time pressure is also the moment the theme is most threatened, the ticking clock becomes unbearable because what it endangers is meaning, not just outcome.`,
          });
        }
      }
    }

    // THEME_CHARGED_SCENE_SILENT (minor, n≥8, ≥3 non-neutral scenes): No emotionally
    // charged scene (emotionalShift ≠ 'neutral') carries the theme, even though the theme
    // appears elsewhere. The story's feeling and its meaning never coincide — emotion lands
    // in thematically blank scenes and theme lands in emotionally flat ones. Distinct from
    // THEME_POSITIVE_SHIFT_SILENT and THEME_NEGATIVE_SHIFT_SILENT (each audits a single
    // polarity at a ≥2 threshold): this fires across both polarities together, catching
    // stories where charged scenes exist but neither polarity alone meets its threshold.
    if (records.length >= 8) {
      const chargedScenes374 = (records as any[]).filter(r => r.emotionalShift && r.emotionalShift !== 'neutral');
      if (chargedScenes374.length >= 3 && !chargedScenes374.some((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords))) {
        issues.push({
          location: `${chargedScenes374.length} emotionally charged scene(s) — thematically silent`,
          rule: 'THEME_CHARGED_SCENE_SILENT',
          severity: 'minor',
          description: `None of the ${chargedScenes374.length} emotionally charged scenes carries language related to "${themeRaw}", though the theme appears elsewhere — the story's feeling and its meaning never coincide. Emotion lands in thematically blank scenes and the theme surfaces only in emotionally flat ones, so the audience never feels the theme and thinks about it in the same beat.`,
          suggestedFix: `Fuse emotion and theme: let at least one charged scene also carry "${themeRaw}", so the moment the audience feels something is the moment the thematic question is most alive. Theme that is felt rather than merely stated is the difference between a story that means something and one that says it does.`,
        });
      }
    }

    // ── Wave 388: THEME_MIDPOINT_DENSITY_DROP, THEME_OPENING_IMAGE_SILENT, THEME_PROACTIVE_DECOUPLED ──

    // THEME_MIDPOINT_DENSITY_DROP (minor, n≥12, ≥2 midpoint scenes): The midpoint zone
    // (40%–60%) is less than half as thematically dense as the story overall — theme thins
    // sharply at the structural pivot, the moment a strong midpoint should be restating the
    // central question with new force. Distinct from THEME_MIDPOINT_SILENT (a binary ±1-scene
    // window with NO theme at all) — this fires even when the midpoint carries some theme but
    // far less than the body — and from THEME_ACT2B_DENSITY_DROP (2a-vs-2b trajectory).
    if (records.length >= 12) {
      const midS388 = Math.floor(records.length * 0.4);
      const midE388 = Math.floor(records.length * 0.6);
      const midRecs388 = (records as any[]).slice(midS388, midE388);
      const overallResonant388 = (records as any[]).filter((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords)).length;
      if (midRecs388.length >= 2 && overallResonant388 >= 2) {
        const midResonant388 = midRecs388.filter((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords)).length;
        const midDensity388 = midResonant388 / midRecs388.length;
        const overallDensity388 = overallResonant388 / records.length;
        if (midDensity388 < overallDensity388 * 0.5) {
          issues.push({
            location: `Midpoint (Scenes ${midS388}–${midE388 - 1}) — thematic density drop`,
            rule: 'THEME_MIDPOINT_DENSITY_DROP',
            severity: 'minor',
            description: `The midpoint zone (Scenes ${midS388}–${midE388 - 1}) is ${Math.round(midDensity388 * 100)}% thematically resonant versus ${Math.round(overallDensity388 * 100)}% across the story — theme thins sharply at the structural pivot. The midpoint is where a strong story restates "${themeRaw}" with new force as the central question is reframed; a density drop there means the pivot turns the plot without deepening the meaning.`,
            suggestedFix: `Bring the theme back at the midpoint: the reframing turn should make "${themeRaw}" newly urgent — a revelation that recasts the thematic question, a choice that tests it under new terms. The center of the story is exactly where the theme should intensify, not recede.`,
          });
        }
      }
    }

    // THEME_OPENING_IMAGE_SILENT (minor, n≥6, expandedKeywords≥2): The very first scene
    // carries no thematic language, though the theme appears later. The opening image is a
    // privileged thematic slot — it frames how the audience reads everything that follows —
    // and squandering it means the story's first impression is disconnected from its meaning.
    // The bookend mirror of THEME_FINAL_SCENE_SILENT (the last scene); distinct from THEME_
    // OPENING_SILENT (the first three scenes ALL silent — this fires even when scenes 2–3
    // carry theme but the opening image itself does not).
    if (records.length >= 6 && expandedKeywords.length >= 2) {
      const firstRec388 = (records as any[])[0];
      const laterResonant388 = (records as any[]).slice(1).some((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords));
      if (firstRec388 && laterResonant388 && !sceneHasResonance(sceneTexts.get(firstRec388.sceneIdx) ?? '', expandedKeywords)) {
        issues.push({
          location: `Scene ${firstRec388.sceneIdx} — opening image`,
          rule: 'THEME_OPENING_IMAGE_SILENT',
          severity: 'minor',
          description: `The story's opening image (Scene ${firstRec388.sceneIdx}) carries no language related to "${themeRaw}", though the theme surfaces later. The first scene is a privileged thematic slot — it frames how the audience reads everything that follows — and an opening disconnected from the theme means the story's first impression sets up a different question than the one it ultimately answers.`,
          suggestedFix: `Plant "${themeRaw}" in the opening image: a detail, a choice, or a visual that quietly poses the thematic question from the very first beat. The image the audience meets first is the lens they watch the rest of the film through — make it carry the meaning.`,
        });
      }
    }

    // THEME_PROACTIVE_DECOUPLED (minor, n≥8, ≥3 proactive scenes): Every scene in which
    // the protagonist takes initiative (raises a clock or plants a clue) carries no theme.
    // The protagonist's agency and the story's meaning never coincide — the character drives
    // the plot in thematically blank scenes, so what they do is never about what the story is
    // about. Distinct from THEME_CLUE_DECOUPLED (clue-planting scenes only) and THEME_CLOCK_
    // SCENE_SILENT (clock scenes only): this fires across the combined proactive set, catching
    // stories where neither subgroup alone meets its threshold but agency-as-a-whole is silent.
    if (records.length >= 8) {
      const proactiveScenes388 = (records as any[]).filter((r: any) => r.clockRaised === true || ((r.seededClueIds ?? []) as any[]).length > 0);
      if (proactiveScenes388.length >= 3 && !proactiveScenes388.some((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords))) {
        issues.push({
          location: `${proactiveScenes388.length} proactive scene(s) — thematically silent`,
          rule: 'THEME_PROACTIVE_DECOUPLED',
          severity: 'minor',
          description: `None of the ${proactiveScenes388.length} scenes where the protagonist takes initiative — raising a clock or planting a clue — carries language related to "${themeRaw}". The protagonist's agency and the story's meaning never coincide: the character drives the plot in thematically blank scenes, so what they actively do is never about what the story is ultimately exploring.`,
          suggestedFix: `Tie the protagonist's initiative to "${themeRaw}": the choices they make to drive the plot should be the choices that test the theme. When agency and meaning coincide, the audience reads the protagonist's actions as an argument about the theme, not just moves that advance the plot.`,
        });
      }
    }

    // ── Wave 402: THEME_ACT2A_DENSITY_DROP, THEME_SEED_PEAK_ABSENT, THEME_PAYOFF_PEAK_ABSENT ──

    // THEME_ACT2A_DENSITY_DROP (minor, n≥12, ≥3 Act 2a scenes, overall resonance≥2):
    // Act 2a (25%–50%) is less than half as thematically dense as the story overall —
    // theme thins in the entry to the conflict zone. Act 2a is where the protagonist
    // first engages the central struggle; if the theme is absent here, the conflict
    // opens as plot mechanics rather than as a dramatization of the story's meaning.
    // Completes the zone density set alongside THEME_ACT1_DENSITY_DROP,
    // THEME_MIDPOINT_DENSITY_DROP, THEME_ACT2B_DENSITY_DROP, and THEME_ACT3_DENSITY_DROP.
    // Distinct from THEME_ACT2_DESERT (Act 2 as a whole < 30% resonant — a binary
    // all-of-Act-2 check) and THEME_ACT2B_DENSITY_DROP (2a-vs-2b trajectory — this
    // fires when Act 2a itself is under-themed relative to the whole story).
    if (records.length >= 12) {
      const a2aStart402 = Math.floor(records.length * 0.25);
      const a2aEnd402 = Math.floor(records.length * 0.5);
      const a2aRecs402 = records.slice(a2aStart402, a2aEnd402);
      const overallResonant402 = (records as any[]).filter(
        r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      ).length;
      if (a2aRecs402.length >= 3 && overallResonant402 >= 2) {
        const a2aResonant402 = a2aRecs402.filter(
          r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        ).length;
        const a2aDensity402 = a2aResonant402 / a2aRecs402.length;
        const overallDensity402 = overallResonant402 / records.length;
        if (a2aDensity402 < overallDensity402 * 0.5) {
          issues.push({
            location: `Act 2a (Scenes ${a2aStart402}–${a2aEnd402 - 1}) — thematic density drop`,
            rule: 'THEME_ACT2A_DENSITY_DROP',
            severity: 'minor',
            description: `Act 2a (Scenes ${a2aStart402}–${a2aEnd402 - 1}) is ${Math.round(a2aDensity402 * 100)}% thematically resonant versus ${Math.round(overallDensity402 * 100)}% across the story — the theme thins precisely as the protagonist enters the central conflict. Act 2a is where the struggle opens and the audience's investment in the theme should deepen; a density drop here means the conflict is engaged as pure plot mechanics with "${themeRaw}" absent from the scenes that should first test it.`,
            suggestedFix: `Bring the theme into the early conflict: as the protagonist first engages the central struggle, let the scenes echo "${themeRaw}" — through a character's observation, a choice that embodies the theme's tension, or an image that reframes the conflict in thematic terms. The entry into Act 2 is where the audience learns that the story is about something, not just about someone.`,
          });
        }
      }
    }

    // THEME_SEED_PEAK_ABSENT (minor, n≥8, totalHits≥3, ≥2 seed scenes, ≥1 resonant seed):
    // The scene that plants the most clues (highest seededClueIds.length) carries no
    // thematic resonance, even though other seed scenes do carry the theme. This specific
    // scene — the story's densest foreshadowing moment — is thematically mute. Seeding
    // clues and raising thematic questions should be the same gesture: the evidence the
    // protagonist or audience collects should feel meaningful in thematic terms, not just
    // as plot mechanics. Single-peak mode × seededClueIds × theme. Distinct from
    // THEME_CLUE_DECOUPLED (ALL seed scenes silent — this fires when the peak is silent
    // even though other seed scenes carry theme) and THEME_PAYOFF_PEAK_ABSENT (same mode
    // applied to the payoff side of the seed/payoff channel pair).
    if (records.length >= 8 && totalHits >= 3) {
      const seedRecs402b = (records as any[]).filter(
        r => ((r.seededClueIds ?? []) as any[]).length > 0,
      );
      if (seedRecs402b.length >= 2) {
        const anySeedResonant402b = seedRecs402b.some(
          r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (anySeedResonant402b) {
          const peakSeedCount402b = Math.max(...seedRecs402b.map(r => ((r.seededClueIds ?? []) as any[]).length));
          const peakSeedRec402b = seedRecs402b.find(
            r => ((r.seededClueIds ?? []) as any[]).length === peakSeedCount402b,
          );
          if (peakSeedRec402b && !sceneHasResonance(sceneTexts.get(peakSeedRec402b.sceneIdx) ?? '', expandedKeywords)) {
            issues.push({
              location: `Scene ${peakSeedRec402b.sceneIdx} (peak clue-planting: ${peakSeedCount402b} seed(s))`,
              rule: 'THEME_SEED_PEAK_ABSENT',
              severity: 'minor',
              description: `The scene that plants the most clues (Scene ${peakSeedRec402b.sceneIdx}, ${peakSeedCount402b} seed(s)) carries no language related to "${themeRaw}", though other seed scenes do carry the theme. The densest foreshadowing moment is thematically mute — the story plants evidence as a plot mechanic without the scene being about "${themeRaw}". The clues the audience will be asked to remember should feel thematically significant when they are planted.`,
              suggestedFix: `Let the story's richest clue-planting scene also carry "${themeRaw}": the evidence being planted should feel dangerous or revealing in thematic terms, not just mechanically important. When a seed and a thematic note land in the same scene, the payoff that resolves the clue also resolves the thematic question — the most satisfying form of closure.`,
            });
          }
        }
      }
    }

    // THEME_PAYOFF_PEAK_ABSENT (minor, n≥8, totalHits≥3, ≥2 payoff scenes, ≥1 resonant):
    // The scene that resolves the most narrative setups (highest payoffSetupIds.length)
    // carries no thematic resonance, while other payoff scenes do. The story's densest
    // resolution moment — where the audience experiences the largest return on its
    // narrative investment — is thematically mute. A payoff that settles the biggest thread
    // without any language of the theme collapses a structural catharsis into a mere plot
    // event. Single-peak mode × payoffSetupIds × theme. Distinct from THEME_PAYOFF_SILENT
    // (all payoff scenes silent) and THEME_SEED_PEAK_ABSENT (seed side of same channel pair).
    if (records.length >= 8 && totalHits >= 3) {
      const payoffRecs402c = (records as any[]).filter(
        r => ((r.payoffSetupIds ?? []) as any[]).length > 0,
      );
      if (payoffRecs402c.length >= 2) {
        const anyPayoffResonant402c = payoffRecs402c.some(
          r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (anyPayoffResonant402c) {
          const peakPayoffCount402c = Math.max(...payoffRecs402c.map(r => ((r.payoffSetupIds ?? []) as any[]).length));
          const peakPayoffRec402c = payoffRecs402c.find(
            r => ((r.payoffSetupIds ?? []) as any[]).length === peakPayoffCount402c,
          );
          if (peakPayoffRec402c && !sceneHasResonance(sceneTexts.get(peakPayoffRec402c.sceneIdx) ?? '', expandedKeywords)) {
            issues.push({
              location: `Scene ${peakPayoffRec402c.sceneIdx} (peak payoff: ${peakPayoffCount402c} setup(s) resolved)`,
              rule: 'THEME_PAYOFF_PEAK_ABSENT',
              severity: 'minor',
              description: `The scene that resolves the most setups (Scene ${peakPayoffRec402c.sceneIdx}, ${peakPayoffCount402c} payoff(s)) carries no language related to "${themeRaw}", though other payoff scenes do. The story's densest resolution moment — where the audience receives the largest return on its narrative investment — is thematically mute. The most important convergence of threads lands without any echo of what the story is ultimately about.`,
              suggestedFix: `Infuse the peak payoff scene with "${themeRaw}": the resolution of the story's most important threads should make the audience feel the theme being answered, not just the plot being closed. A payoff that resolves a setup AND speaks to the theme produces the deepest catharsis — the story closes two loops at once.`,
            });
          }
        }
      }
    }

    // ── Wave 416: THEME_RESONANT_SINGLETON_RUN, THEME_PEAK_SUSPENSE_AFTERMATH_SILENT, THEME_DUAL_RISE_DECOUPLED ──

    // THEME_RESONANT_SINGLETON_RUN (minor, n≥10, ≥4 resonant scenes): The longest
    // consecutive run of thematically resonant scenes is exactly 1 — the theme never
    // builds momentum across two adjacent scenes. Every resonant scene is an isolated
    // island surrounded by theme-silent scenes; the theme fires in disconnected beats
    // rather than flowing as a continuous through-line. A theme that never accumulates
    // across consecutive scenes feels like episodic punctuation rather than a woven
    // undercurrent — the audience registers it as interruption, not architecture.
    // Run-based mode × resonance sequence. Distinct from THEME_CONSECUTIVE_RESONANT_
    // SURFEIT (Wave 208: fires when max run ≥5 — the opposite excess), and
    // THEME_SILENT_STRETCH (Wave 223: measures the longest SILENT run, not resonant).
    if (records.length >= 10 && resonantScenes.length >= 4) {
      let maxRun416a = 0;
      let curRun416a = 0;
      for (let i = 0; i < records.length; i++) {
        if (sceneHasResonance(sceneTexts.get(records[i].sceneIdx) ?? '', expandedKeywords)) {
          if (++curRun416a > maxRun416a) maxRun416a = curRun416a;
        } else {
          curRun416a = 0;
        }
      }
      if (maxRun416a <= 1) {
        issues.push({
          location: 'Thematic distribution — resonance never consecutive',
          rule: 'THEME_RESONANT_SINGLETON_RUN',
          severity: 'minor',
          description: `The theme "${themeRaw}" appears in ${resonantScenes.length} scenes but never in two consecutive scenes — every resonant moment is isolated by theme-silent scenes. A theme that fires only in disconnected beats never builds momentum; the audience experiences it as episodic punctuation rather than a continuous through-line that deepens as the story escalates.`,
          suggestedFix: `Let the theme accumulate across at least one pair of consecutive scenes: a scene that lands the theme should be followed by a scene that deepens or challenges it, so meaning builds rather than resets each time. Two adjacent resonant scenes create a thematic rhythm the audience can track and anticipate.`,
        });
      }
    }

    // THEME_PEAK_SUSPENSE_AFTERMATH_SILENT (minor, n≥8, ≥2 resonant scenes): The
    // scene immediately following the story's highest-suspense scene carries no
    // thematic language. The aftermath of maximum tension — the natural exhale and
    // reflection beat that follows the story's most charged moment — is thematically
    // mute. This is the most receptive moment in the story for meaning to land: the
    // audience is adrenaline-primed and looking for the point of what they just
    // experienced. Squandering it on thematically empty content wastes the story's
    // most powerful delivery window. Sequence/aftermath mode × peak suspenseDelta.
    // Distinct from THEME_SUSPENSE_PEAK_ABSENT (Wave 346: the peak scene ITSELF is
    // silent), THEME_SUSPENSE_RELEASE_SILENT (Wave 321: clockDelta<0 release beats),
    // and THEME_CLIMAX_SCENE_SILENT (Wave 174: peak-suspense scene in Act 3 only).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      let peakSuspPos416b = 0;
      let peakSuspVal416b = records[0].suspenseDelta ?? 0;
      for (let i = 1; i < records.length; i++) {
        if ((records[i].suspenseDelta ?? 0) > peakSuspVal416b) {
          peakSuspVal416b = records[i].suspenseDelta ?? 0;
          peakSuspPos416b = i;
        }
      }
      if (peakSuspVal416b > 0 && peakSuspPos416b < records.length - 1) {
        const aftermathRec416b = records[peakSuspPos416b + 1];
        if (!sceneHasResonance(sceneTexts.get(aftermathRec416b.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${aftermathRec416b.sceneIdx} (aftermath of peak-suspense Scene ${records[peakSuspPos416b].sceneIdx})`,
            rule: 'THEME_PEAK_SUSPENSE_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The scene immediately following the story's highest-suspense moment (Scene ${records[peakSuspPos416b].sceneIdx}, suspenseDelta ${peakSuspVal416b.toFixed(1)}) carries no language related to "${themeRaw}". The aftermath of maximum tension is the story's most receptive delivery window for meaning — the audience is adrenaline-primed and looking for the point of what they just experienced — yet it is thematically blank.`,
            suggestedFix: `Give the aftermath scene thematic resonance: a character's first words or action after the peak tension should speak to "${themeRaw}" — crystallizing what the danger revealed about the story's central question or complicating the protagonist's relationship to it. The exhale beat is where meaning lands deepest because the audience's guard is down.`,
          });
        }
      }
    }

    // THEME_DUAL_RISE_DECOUPLED (minor, n≥8, ≥2 resonant scenes, ≥2 dual-rise
    // scenes): Every scene where BOTH suspenseDelta > 0 AND curiosityDelta > 0
    // simultaneously carries no thematic language. The moments of doubly energized
    // audience engagement — where tension and intrigue rise together — are always
    // thematically mute. When the story's most doubly engaged states never coincide
    // with theme, the audience never feels that "more at stake, more mysterious"
    // also means "more meaningful." Co-occurrence/decoupling mode × suspenseDelta
    // × curiosityDelta. Distinct from THEME_DUAL_PEAK_ABSENT (Wave 360: only the
    // single scene with the highest sum of both), THEME_SUSPENSE_CLUSTER_SILENT
    // (Wave 279: high suspense alone, threshold > 1), and THEME_CURIOSITY_DECOUPLED
    // (Wave 265: high curiosity alone, threshold > 1 — this fires at any positive
    // value when both channels rise together).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const dualRiseScenes416c = (records as any[]).filter(
        r => (r.suspenseDelta ?? 0) > 0 && (r.curiosityDelta ?? 0) > 0,
      );
      if (dualRiseScenes416c.length >= 2 &&
          !dualRiseScenes416c.some((r: any) =>
            sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
          )) {
        issues.push({
          location: `${dualRiseScenes416c.length} dual-rise scene(s) — simultaneous tension and curiosity increase, all thematically silent`,
          rule: 'THEME_DUAL_RISE_DECOUPLED',
          severity: 'minor',
          description: `All ${dualRiseScenes416c.length} scenes where both suspense and curiosity rise simultaneously carry no language related to "${themeRaw}". The story's doubly charged states — where the audience is both tense and intrigued at once — are always thematically empty. When maximum engagement never coincides with thematic meaning, the audience learns to separate "exciting and mysterious" from "what the story is about."`,
          suggestedFix: `Let at least one of the story's dual-rise moments carry "${themeRaw}": the scenes where tension and intrigue peak together are where the audience is most receptive to the meaning of what they're experiencing. A scene that is dangerous, mysterious, AND thematically resonant is the most memorable kind — the audience remembers what they felt AND what it meant.`,
        });
      }
    }

    // ── Wave 430: THEME_DRAMATIC_TURN_AFTERMATH_SILENT, THEME_PEAK_UNMOTIVATED, THEME_RESONANCE_EMOTIONALLY_LOPSIDED ──

    // THEME_DRAMATIC_TURN_AFTERMATH_SILENT (sequence/aftermath, n≥10, ≥2 qualifying
    // post-turn scenes): Every scene immediately following a dramatic pivot carries no
    // thematic language, even though theme appears elsewhere. A dramatic turn creates
    // a processing beat — the scene that follows is where the audience absorbs what the
    // reversal means. That aftermath is the story's second-most-receptive delivery
    // window for meaning (behind peak suspense), because the audience is reeling and
    // primed to ask "what does this change?" When every post-turn aftermath is blank,
    // the story never uses this reflective state to deepen the theme.
    // Distinctness: THEME_DRAMATIC_TURN_DECOUPLED (Wave 279) checks whether the
    // TURN SCENES THEMSELVES carry theme. This checks the scene AFTER each turn — a
    // different structural position. Distinct from THEME_PEAK_SUSPENSE_AFTERMATH_SILENT
    // (Wave 416: aftermath of the single highest-suspense scene, not of all turns).
    if (records.length >= 10 && resonantScenes.length >= 2) {
      const turnAftermathRecs430a: typeof records = [];
      for (let i430a = 0; i430a < records.length - 1; i430a++) {
        if ((records[i430a].dramaticTurn ?? 'nothing') !== 'nothing') {
          turnAftermathRecs430a.push(records[i430a + 1]);
        }
      }
      if (turnAftermathRecs430a.length >= 2 &&
          !turnAftermathRecs430a.some(r =>
            sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
          )) {
        issues.push({
          location: `${turnAftermathRecs430a.length} post-dramatic-turn scene(s) — thematically silent`,
          rule: 'THEME_DRAMATIC_TURN_AFTERMATH_SILENT',
          severity: 'minor',
          description: `The scene immediately following every dramatic turn (${turnAftermathRecs430a.length} aftermath scenes) carries no language related to "${themeRaw}", even though the theme appears elsewhere. Post-turn scenes are the story's most receptive delivery windows for meaning — the audience is reeling from a reversal and primed to ask what it means — yet every one is thematically blank. The processing beat after each pivot wastes its thematic potential.`,
          suggestedFix: `Let at least one scene following a dramatic turn carry "${themeRaw}": after a reversal, a character's first response should speak to the theme — a choice, an observation, or an image that frames what the pivot just cost or revealed in terms of the story's central question. The beat after the turn is where meaning settles.`,
        });
      }
    }

    // THEME_PEAK_UNMOTIVATED (backward-cause, n≥10, peakHits≥3, totalHits≥6):
    // The scene with the highest theme keyword density — the story's thematic peak —
    // arrives without any structural catalyst in the two scenes preceding it.
    // Looking backward from the peak: neither of the two prior scenes contains a
    // revelation, dramatic turn, clock-raised signal, or high suspense (>1). The
    // thematic peak appears to surface at random rather than as a consequence of
    // rising dramatic energy. A well-crafted thematic peak should be triggered by
    // something that opens the audience emotionally before the meaning lands hardest.
    // Distinctness: THEME_PEAK_BEFORE_MIDPOINT (Wave 321) audits WHERE the peak
    // lands (position), not WHY it's there (backward cause). The single-peak
    // isolation checks (THEME_SUSPENSE_PEAK_ABSENT, THEME_CURIOSITY_PEAK_ABSENT,
    // etc.) compare the peak scene to others — this is the only check that looks
    // backward from the peak to audit its narrative justification.
    if (records.length >= 10 && totalHits >= 6) {
      let peakPos430b = -1;
      let peakHits430b = 0;
      for (let i430b = 0; i430b < records.length; i430b++) {
        const h430b = sceneHitCounts.get(records[i430b].sceneIdx) ?? 0;
        if (h430b > peakHits430b) { peakHits430b = h430b; peakPos430b = i430b; }
      }
      const isCatalyst430b = (r: typeof records[0]) =>
        r.revelation !== null ||
        (r.dramaticTurn ?? 'nothing') !== 'nothing' ||
        r.clockRaised === true ||
        (r.suspenseDelta ?? 0) > 1;
      if (peakPos430b >= 2 && peakHits430b >= 3) {
        const prior1_430b = records[peakPos430b - 1];
        const prior2_430b = records[peakPos430b - 2];
        if (!isCatalyst430b(prior1_430b) && !isCatalyst430b(prior2_430b)) {
          issues.push({
            location: `Scene ${records[peakPos430b].sceneIdx} — thematic peak (${peakHits430b} keyword hits)`,
            rule: 'THEME_PEAK_UNMOTIVATED',
            severity: 'minor',
            description: `The story's thematic peak — Scene ${records[peakPos430b].sceneIdx} with ${peakHits430b} theme keyword hits for "${themeRaw}" — arrives without any structural catalyst in the two preceding scenes (no revelation, dramatic turn, clock-raised, or high suspense). The most concentrated thematic statement in the story surfaces without narrative preparation; there is no dramatic cause to explain why the theme peaks here. An unmotivated thematic peak reads as a thesis paragraph accidentally placed in the script rather than earned by what precedes it.`,
            suggestedFix: `Motivate the thematic peak: let the scene before (or two before) the densest theme moment carry a revelation, a turn, or a spike in suspense that opens the audience emotionally before the meaning lands at full force. The thematic peak must be earned — the audience needs to be primed by rising dramatic energy before the theme can land at its hardest. Move the peak, or add a catalyst that justifies its position.`,
          });
        }
      }
    }

    // THEME_RESONANCE_EMOTIONALLY_LOPSIDED (valence, n≥8, ≥4 charged resonant
    // scenes): The emotionally charged resonant scenes — those carrying both a
    // non-neutral emotional shift and thematic language — are ≥3:1 skewed toward
    // one polarity. The theme speaks overwhelmingly in one emotional register,
    // leaving it unable to articulate the opposite face of its tension. A theme
    // confined to positive moments cannot show what it costs to fail; a theme
    // confined to negative moments cannot show what it looks like to succeed. Both
    // extremes collapse the theme's range to a single emotional note, denying the
    // audience the full dialectical picture.
    // Distinctness: THEME_NO_DIALECTIC (Wave 148) is a binary check firing when NO
    // resonant scene at all carries a negative charge — it fires even at 0 negative
    // scenes, regardless of ratio. This valence check fires at the RATIO of charged
    // resonant scenes (≥3:1), catching imbalance even when both polarities appear
    // but one dominates. THEME_POSITIVE_SHIFT_SILENT / THEME_NEGATIVE_SHIFT_SILENT
    // (Waves 251/279) check whether scenes of a given polarity carry theme at all —
    // the inverse direction. This checks whether the RESONANT SET ITSELF is emotionally
    // one-sided, an entirely different population and question.
    if (records.length >= 8 && resonantScenes.length >= 4) {
      const chargedResonant430c = resonantScenes.filter((r: any) => r.emotionalShift !== 'neutral');
      if (chargedResonant430c.length >= 4) {
        const posCount430c = chargedResonant430c.filter((r: any) => r.emotionalShift === 'positive').length;
        const negCount430c = chargedResonant430c.length - posCount430c;
        const minCount430c = Math.min(posCount430c, negCount430c);
        const maxCount430c = Math.max(posCount430c, negCount430c);
        const lopsided430c = minCount430c === 0
          ? maxCount430c >= 4
          : maxCount430c >= minCount430c * 3;
        if (lopsided430c) {
          const dominant430c = posCount430c > negCount430c ? 'positive' : 'negative';
          const minority430c = posCount430c > negCount430c ? 'negative' : 'positive';
          issues.push({
            location: 'Emotionally charged resonant scenes',
            rule: 'THEME_RESONANCE_EMOTIONALLY_LOPSIDED',
            severity: 'minor',
            description: `Of ${chargedResonant430c.length} emotionally charged scenes that carry the theme "${themeRaw}", ${maxCount430c} are ${dominant430c} and only ${minCount430c} are ${minority430c} — the theme speaks overwhelmingly in one emotional register. A theme present only in ${dominant430c} moments can only articulate one pole of its tension and never shows what "${themeRaw}" looks like when experienced in ${minority430c} terms. The audience receives a one-note picture of what the theme means.`,
            suggestedFix: `Balance the emotional register of the theme: let "${themeRaw}" appear in both ${dominant430c} and ${minority430c} moments — in scenes of both gain and loss. A thematically resonant ${minority430c} scene shows what the theme means in its opposite emotional register; the dialectic of the theme lives in both polarities. Write at least one scene where the theme is felt in a ${minority430c} emotional context.`,
          });
        }
      }
    }

    // THEME_RESONANT_CLUSTER_FLOOD (run-based, n≥10, ≥4 resonant scenes, maxConsecutiveRun≥4):
    // Four or more consecutive scenes all carry thematic language — a local echo-chamber plateau
    // where theme becomes a relentless drumbeat rather than an accent. Resonance lands hardest when
    // it punctuates inert scenes; when every scene in a run carries the theme, each occurrence
    // dilutes the next. A cluster of 4+ consecutive resonant scenes loses the contrast that makes
    // individual resonant moments feel meaningful.
    // Distinctness: THEME_RESONANT_SINGLETON_RUN (Wave 416) fires when ALL resonant scenes are
    // isolated (max consecutive run = 1) — the opposite extreme. THEME_CRAFT fires on high GLOBAL
    // DENSITY (>40% of all scenes). THEME_RESONANCE_BURST (Wave 307) fires when ONE SCENE holds
    // >50% of keyword hits — a single-scene check. This fires when a consecutive RUN OF SCENES
    // is thematically dense, a spatial clustering test distinct from all proportion, isolation,
    // and single-scene-peak checks.
    if (records.length >= 10 && resonantScenes.length >= 4) {
      let maxResRun444a = 0;
      let maxResRunStart444a = -1;
      let curResRun444a = 0;
      let curResRunStart444a = 0;
      for (let i444a = 0; i444a < records.length; i444a++) {
        const isRes444a = sceneHasResonance(sceneTexts.get(records[i444a].sceneIdx) ?? '', expandedKeywords);
        if (isRes444a) {
          if (curResRun444a === 0) curResRunStart444a = i444a;
          if (++curResRun444a > maxResRun444a) {
            maxResRun444a = curResRun444a;
            maxResRunStart444a = curResRunStart444a;
          }
        } else {
          curResRun444a = 0;
        }
      }
      if (maxResRun444a >= 4 && resonantScenes.length < records.length) {
        issues.push({
          location: `Scenes ${maxResRunStart444a}–${maxResRunStart444a + maxResRun444a - 1} — consecutive resonant cluster (${maxResRun444a} scenes)`,
          rule: 'THEME_RESONANT_CLUSTER_FLOOD',
          severity: 'minor',
          description: `${maxResRun444a} consecutive scenes all carry language related to "${themeRaw}" — a local echo-chamber where theme becomes a relentless drumbeat rather than an accent. Thematic resonance lands hardest when it punctuates scenes that don't carry it; when every scene in a run speaks the theme, each occurrence dilutes the next. The contrast that makes individual resonant moments meaningful disappears when ${maxResRun444a} consecutive scenes all announce the same message.`,
          suggestedFix: `Break the consecutive resonant cluster (Scenes ${maxResRunStart444a}–${maxResRunStart444a + maxResRun444a - 1}) by letting at least one or two scenes advance plot or character without explicitly carrying "${themeRaw}". The silence will make the next resonant scene land harder. Thematic meaning comes from pattern; patterns need variation to register as patterns.`,
        });
      }
    }

    // THEME_LONG_SILENT_STRETCH (distribution/timing, n≥12, ≥2 resonant scenes, maxGap≥5):
    // The longest consecutive stretch of non-resonant scenes anywhere in the story — including
    // the stretch before the first resonant scene and after the last — is ≥5 scenes. A gap of
    // 5+ consecutive inert scenes is long enough for the audience to lose the thematic thread.
    // Distinct from zone checks which flag entire structural zones: this fires on the SINGLE
    // WORST GAP regardless of zone boundaries, catching gaps that straddle zones or sit inside
    // nominally themed zones.
    // Distinctness: THEME_RESONANCE_GAP fires when >40% of ALL scenes are inert (global proportion).
    // Zone checks (THEME_ACT2_DESERT, THEME_CLOSING_QUARTER_SILENT, etc.) audit fixed structural
    // zones. This is a distribution/timing check that identifies the single worst gap — it catches
    // long thematic silences that zone and proportion checks miss when the silence straddles zones
    // or sits inside an otherwise-resonant zone.
    if (records.length >= 12 && resonantScenes.length >= 2) {
      const resIdx444b: number[] = records
        .map((r: any, i: number) => ({ i, res: sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords) }))
        .filter((x: any) => x.res)
        .map((x: any) => x.i as number);
      let maxGap444b = 0;
      if (resIdx444b.length > 0) {
        maxGap444b = Math.max(maxGap444b, resIdx444b[0]);
        for (let g = 1; g < resIdx444b.length; g++) {
          maxGap444b = Math.max(maxGap444b, resIdx444b[g] - resIdx444b[g - 1] - 1);
        }
        maxGap444b = Math.max(maxGap444b, records.length - 1 - resIdx444b[resIdx444b.length - 1]);
      }
      if (maxGap444b >= 5) {
        issues.push({
          location: `Longest thematic silence — ${maxGap444b} consecutive non-resonant scenes`,
          rule: 'THEME_LONG_SILENT_STRETCH',
          severity: 'minor',
          description: `Somewhere in the story, ${maxGap444b} consecutive scenes carry no language related to "${themeRaw}" — long enough for the audience to lose the thematic thread. While individual inert scenes are healthy, a gap of 5 or more creates a portion of the story where the central meaning disappears from view. This gap may sit inside a nominally themed zone or straddle zone boundaries, which is why zone checks may not catch it.`,
          suggestedFix: `Find the longest gap (${maxGap444b} consecutive scenes without "${themeRaw}") and plant one or two thematic anchors within it — an image, a line of dialogue, or a character choice that briefly reconnects the action to the story's central question without stating it outright. The theme need not be argued; it only needs to be glimpsed.`,
        });
      }
    }

    // THEME_REVELATION_AFTERMATH_SILENT (sequence/aftermath, n≥10, ≥2 qualifying aftermaths):
    // Every scene immediately following a revelation (r.revelation is non-null and non-empty)
    // carries no thematic language, even though theme appears elsewhere. A revelation is the story's
    // disclosure moment — the scene after it is when the audience first processes what the truth means.
    // That processing beat is the most receptive window for thematic delivery because the audience is
    // actively recontextualising everything they know. When post-revelation scenes are all thematically
    // silent, the story's meaning-making never aligns with its information-delivery.
    // Distinctness: THEME_REVELATION_DECOUPLED (Wave 293) fires when REVELATION SCENES THEMSELVES
    // carry no theme (a different structural position). THEME_DRAMATIC_TURN_AFTERMATH_SILENT (Wave 430)
    // checks aftermath of dramatic TURNS (r.dramaticTurn ≠ 'nothing'), a different structural event from
    // revelations (disclosed information vs reversal of direction). This is the first aftermath check
    // anchored specifically to the revelation channel.
    if (records.length >= 10 && resonantScenes.length >= 2) {
      const revAftermaths444c: typeof records = [];
      for (let i444c = 0; i444c < records.length - 1; i444c++) {
        const rev444c = records[i444c].revelation;
        if (rev444c != null && rev444c !== '') {
          revAftermaths444c.push(records[i444c + 1]);
        }
      }
      if (revAftermaths444c.length >= 2 &&
          !revAftermaths444c.some((r: any) =>
            sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
          )) {
        issues.push({
          location: `${revAftermaths444c.length} post-revelation scene(s) — thematically silent`,
          rule: 'THEME_REVELATION_AFTERMATH_SILENT',
          severity: 'minor',
          description: `The scene immediately following every revelation (${revAftermaths444c.length} aftermath scene(s)) carries no language related to "${themeRaw}", even though the theme appears elsewhere. Post-revelation scenes are the most receptive windows for thematic delivery: the audience is actively recontextualising everything they know, primed to understand not just what happened but what it means. When every disclosure is followed by a thematically blank scene, the story's meaning-making never aligns with its information-delivery.`,
          suggestedFix: `Let at least one scene following a revelation carry "${themeRaw}": after a truth is disclosed, the next scene's reaction — a character's choice, an image, a line of dialogue — should briefly reflect what this revelation means in terms of the story's central question. The processing beat after a disclosure is the most powerful moment to make the audience feel not just the fact but its significance.`,
        });
      }
    }

    // ── Wave 458: THEME_RELATIONSHIP_DECOUPLED, THEME_CLOCK_AFTERMATH_SILENT, THEME_ALL_RESONANCE_CAUSELESS ──

    // THEME_RELATIONSHIP_DECOUPLED (co-occurrence/decoupling × relationship shift channel, n≥8,
    // ≥2 relationship-shift scenes): Every scene with non-empty `relationshipShifts` is thematically
    // silent — bonds never move in the same beat where the theme is voiced. Relationship dynamics
    // and thematic meaning operate on entirely separate tracks: the story explores its central question
    // in some scenes and evolves its bonds in others, but the two never coincide. The most powerful
    // scenes combine dramatic relationship movement with thematic resonance — a bond shift that also
    // embodies or challenges the story's central question makes both the relationship and the theme
    // feel necessary to each other. Co-occurrence mode × relationship shift channel.
    // Distinct from all existing decoupled checks (THEME_CLUE_SCENES_DECOUPLED, THEME_CURIOSITY_
    // SCENES_DECOUPLED, THEME_PAYOFF_SCENES_DECOUPLED, THEME_DRAMATIC_TURN_DECOUPLED, THEME_NEGATIVE_
    // EMOTION_DECOUPLED, THEME_SUSPENSE_SCENES_DECOUPLED, THEME_REVELATION_DECOUPLED, THEME_CLOCK_
    // SCENES_DECOUPLED — all in prior waves; this adds relationship shifts as a new co-occurrence
    // signal, completing the relational engine's place in the theme co-occurrence family).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const relShiftScenes458a = records.filter(r =>
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (relShiftScenes458a.length >= 2 &&
          !relShiftScenes458a.some(r =>
            sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
          )) {
        issues.push({
          location: `All ${relShiftScenes458a.length} relationship-shift scene(s) — thematically silent`,
          rule: 'THEME_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `All ${relShiftScenes458a.length} scenes that move a character bond (non-empty relationshipShifts) carry no language related to "${themeRaw}", even though ${resonantScenes.length} scenes carry the theme elsewhere. The story's relational engine and its thematic voice operate on entirely separate tracks: bonds shift in thematically silent scenes, and theme resonates in relationally inert ones. The most powerful scenes in any story combine these two registers — a bond that shifts in a scene that also speaks the central question makes both the relationship and the theme feel inevitable to each other, as if the story could not have been told without that specific convergence.`,
          suggestedFix: `Give at least one relationship-shift scene a thematic dimension: let the dynamic between the characters embody the story's central question as it shifts — a reconciliation that dramatises "${themeRaw}", a rupture that challenges it, or a shift whose terms are framed by the theme's language. When a bond moves in a scene that also speaks the theme, the audience feels the meaning of the relationship and the meaning of the story simultaneously.`,
        });
      }
    }

    // THEME_CLOCK_AFTERMATH_SILENT (sequence/aftermath × clock → theme, n≥8, ≥2 qualifying
    // clock-raised scenes with 1+ scene after them): No clock-raised scene is immediately followed
    // by a scene carrying thematic resonance — every deadline passes without the next scene picking
    // up the thematic meaning of the pressure. Clock scenes are among the most attention-heightened
    // moments in a story: the audience is maximally alert when a countdown is running. The scene
    // immediately following a deadline beat is the most receptive window for thematic delivery —
    // the character just experienced maximum urgency, and the next scene can use that heightened
    // state to ask what the deadline meant in terms of the story's central question.
    // Distinct from THEME_CLOCK_RAISED_DECOUPLED (Wave 293: the clock scenes THEMSELVES carry no
    // theme — co-occurrence within the same scene; this checks the NEXT scene after the clock fires,
    // sequence/aftermath mode from a different structural position), and distinct from all other
    // aftermath checks (dramatic turn aftermath, revelation aftermath — those use a different trigger).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const qualClockIdxs458b: number[] = [];
      for (let i = 0; i < records.length - 1; i++) {
        if ((records[i].clockRaised ?? false) === true) qualClockIdxs458b.push(i);
      }
      if (qualClockIdxs458b.length >= 2) {
        const anyAftermathResonant458b = qualClockIdxs458b.some(idx => {
          const next = records[idx + 1];
          return next && sceneHasResonance(sceneTexts.get(next.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyAftermathResonant458b) {
          issues.push({
            location: `All ${qualClockIdxs458b.length} clock-raised scenes — thematically silent aftermath`,
            rule: 'THEME_CLOCK_AFTERMATH_SILENT',
            severity: 'minor',
            description: `None of the story's ${qualClockIdxs458b.length} clock-raised scenes is immediately followed by a scene with thematic resonance related to "${themeRaw}". Clock scenes maximise audience attention — when a deadline is running, every scene carries heightened alertness. The scene immediately following a deadline beat is the most receptive window for thematic delivery: what did the pressure of that countdown mean in terms of the story's central question? When every clock scene is followed by a thematically silent scene, the deadline machinery generates urgency without meaning — the audience feels the temporal pressure but is never given the thematic frame that would tell them what was at stake beyond the surface event.`,
            suggestedFix: `After at least one clock-raised scene, let the following scene pick up the theme of "${themeRaw}": a character reflects on what the deadline pressure revealed about themselves, or takes an action that embodies the story's central question under the urgency the deadline established. The scene after a deadline beat is when the meaning of the pressure can be crystallised most powerfully.`,
          });
        }
      }
    }

    // THEME_ALL_RESONANCE_CAUSELESS (backward-cause × all resonant scenes, n≥8, ≥3 resonant
    // scenes, every resonant scene lacks upstream cause in prior 2 scenes). Every scene that
    // carries thematic language is preceded in the two scenes before it by no revelation,
    // no dramatic turn, and no high suspense (suspenseDelta > 1). The story's thematic moments
    // consistently surface in narrative dead air — theme appears without any of the structural
    // triggers that most naturally motivate the audience to receive meaning: the relief after
    // danger, the processing of a disclosure, the shift of direction from a pivot.
    // Distinct from THEME_PEAK_UNMOTIVATED (Wave 430: backward-cause × the SINGLE DENSEST theme
    // scene only; this fires when ALL resonant scenes are systematically causeless — a structural
    // pattern, not an isolated peak), and from all sequence/aftermath checks (those look FORWARD
    // from triggers for theme; this looks BACKWARD from resonant scenes for triggers).
    if (records.length >= 8 && resonantScenes.length >= 3) {
      const hasCause458c = (idx: number): boolean => {
        for (let off = 1; off <= 2; off++) {
          const prevIdx = idx - off;
          if (prevIdx < 0) continue;
          const prev = records[prevIdx];
          if ((prev?.revelation ?? null) !== null && (prev?.revelation ?? '') !== '') return true;
          if ((prev?.dramaticTurn ?? 'nothing') !== 'nothing') return true;
          if ((prev?.suspenseDelta ?? 0) > 1) return true;
        }
        return false;
      };
      const resonantIdxs458c = resonantScenes.map(r => (records as any[]).indexOf(r));
      const allResCauseless458c = resonantIdxs458c.every(idx => idx >= 0 && !hasCause458c(idx));
      if (allResCauseless458c) {
        issues.push({
          location: `All ${resonantScenes.length} resonant scene(s) — no upstream narrative trigger`,
          rule: 'THEME_ALL_RESONANCE_CAUSELESS',
          severity: 'minor',
          description: `None of the story's ${resonantScenes.length} thematically resonant scenes for "${themeRaw}" is preceded in the prior two scenes by a revelation, a dramatic turn, or a high-suspense moment — theme consistently surfaces in narrative dead air. The most powerful thematic moments arrive when the audience is already primed to receive meaning: a revelation that raises a question the theme then answers, a dramatic turn that has the characters re-examine what they believe, or tension that has been released in the scene that follows. When every resonant scene arrives without any of these upstream triggers, the theme feels structurally optional — it could be moved to any scene and mean the same thing, because it is never the consequence of anything that happened just before.`,
          suggestedFix: `Before at least one resonant scene, plant a structural trigger in the prior two scenes: a revelation that makes the theme's central question land with specific urgency, a dramatic turn that forces the characters to grapple with what the story is about, or a suspense peak that the following thematic scene then reflects on. Theme that arrives as the consequence of something the audience just experienced feels earned rather than inserted.`,
        });
      }
    }

    // ── Wave 472: THEME_POSITIVE_EMOTION_DECOUPLED, THEME_RESONANT_VALENCE_UNIFORM, THEME_DIALOGUE_PEAK_SILENT ──

    // THEME_POSITIVE_EMOTION_DECOUPLED — Co-occurrence/decoupling × positive emotional shift
    // (n≥8, ≥2 positive-shift scenes, ≥2 resonant scenes, no positive scene is resonant).
    // All scenes with emotionalShift='positive' are thematically silent: warmth, triumph, and
    // relief never coincide with the story's central question. The theme only speaks during
    // neutral or dark moments, making it exclusively associated with gravity. When the audience
    // never hears the theme in a positive scene, they cannot experience the story's central
    // idea as something life-affirming or hopeful — it remains only a question that the script
    // asks in its darker or flatter register. Completes the emotional-shift channel in the
    // co-occurrence family alongside THEME_NEGATIVE_EMOTION_DECOUPLED (Wave 279: negative shift
    // channel).
    // Distinct from THEME_NEGATIVE_EMOTION_DECOUPLED (Wave 279: negative shift scenes carry no
    // theme; this is the positive polarity — orthogonal valence × co-occurrence check),
    // THEME_RESONANCE_EMOTIONALLY_LOPSIDED (Wave 430: fires when CHARGED resonant scenes have
    // 3:1 polarity skew; this fires when NO positive scene is EVER resonant, a zero-intersection
    // condition), all zone and sequence/aftermath checks.
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const posScenes472a = records.filter(r => r.emotionalShift === 'positive');
      if (posScenes472a.length >= 2 &&
          !posScenes472a.some(r =>
            sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
          )) {
        issues.push({
          location: `All ${posScenes472a.length} positive-shift scene(s) — thematically silent`,
          rule: 'THEME_POSITIVE_EMOTION_DECOUPLED',
          severity: 'minor',
          description: `All ${posScenes472a.length} scenes with emotionalShift='positive' carry no language related to "${themeRaw}", while ${resonantScenes.length} scenes carry the theme in neutral or negative moments. The story voices its central question exclusively during gravity and flatness, never during warmth, triumph, or relief. When theme only appears in darker or inert scenes, the audience learns to associate the story's central idea with burden rather than with what is possible — the theme never gets to answer its own question in the emotional register where the answer would feel earned.`,
          suggestedFix: `Let at least one positive-emotional scene also carry thematic resonance: a triumph that dramatises what "${themeRaw}" looks like when it works, a moment of relief that names what was at stake. A theme that can speak in both joy and grief feels universal; one that only speaks in dark moments feels like a lesson rather than a truth.`,
        });
      }
    }

    // THEME_RESONANT_VALENCE_UNIFORM — Valence × within-resonant-set uniformity (resonantScenes
    // length ≥ 4, >80% of resonant scenes share the same emotionalShift register). The theme is
    // tonal-monotone: it is always voiced in one emotional key — always neutral, always positive,
    // or always negative. A theme voiced exclusively in one register narrows its reach; it can only
    // speak to the audience when they are in that particular emotional state. A theme that can land
    // in grief, in triumph, and in neutral reflection is structurally woven into the story at every
    // level; a theme confined to one register is structurally optional in the other two.
    // Distinct from THEME_RESONANCE_EMOTIONALLY_LOPSIDED (Wave 430: fires when CHARGED resonant
    // scenes are 3:1 skewed positive vs negative; requires ≥4 CHARGED resonant scenes and excludes
    // neutral — my check fires when all resonant are neutral with high suspense, where LOPSIDED's
    // guard fails), THEME_QUIET_SCENES_ONLY (Wave 307: fires when all resonant are neutral AND
    // suspenseDelta ≤ 1 — my check fires when all resonant are neutral with some high-suspense
    // scenes, where QUIET_SCENES_ONLY's guard fails), THEME_RESONANCE_EMOTIONALLY_INERT (Wave 223:
    // fires when all resonant are neutral AND suspenseDelta ≤ 0 — my check fires when all neutral
    // but some have suspenseDelta > 0, avoiding INERT's trigger).
    if (resonantScenes.length >= 4) {
      const posRes472b = resonantScenes.filter(r => r.emotionalShift === 'positive').length;
      const negRes472b = resonantScenes.filter(r => r.emotionalShift === 'negative').length;
      const neuRes472b = resonantScenes.filter(r => r.emotionalShift === 'neutral').length;
      const maxRes472b = Math.max(posRes472b, negRes472b, neuRes472b);
      if (maxRes472b / resonantScenes.length > 0.8) {
        const dominant472b = posRes472b === maxRes472b ? 'positive' : negRes472b === maxRes472b ? 'negative' : 'neutral';
        issues.push({
          location: `${resonantScenes.length} resonant scenes — ${dominant472b} emotional register (${maxRes472b}/${resonantScenes.length})`,
          rule: 'THEME_RESONANT_VALENCE_UNIFORM',
          severity: 'minor',
          description: `${maxRes472b} of ${resonantScenes.length} thematically resonant scenes (${Math.round(maxRes472b / resonantScenes.length * 100)}%) share the same emotional register ('${dominant472b}') — the theme is tonal-monotone. A theme voiced exclusively in one emotional key speaks only to the audience when they're in that state; it cannot reach them in the other emotional registers. The full power of a theme comes from its ability to surface in triumph, grief, and calm reflection alike — in different emotional keys, the same idea asks different questions and produces different insights.`,
          suggestedFix: `Distribute resonant scenes across at least two emotional registers: if the theme currently only speaks in '${dominant472b}' moments, give it at least one scene in the opposite register. A single resonant scene in a different emotional key (${'neutral' === dominant472b ? "'positive' or 'negative'" : "'neutral'"}) dramatically expands the theme's tonal range and prevents it from reading as tonally one-dimensional.`,
        });
      }
    }

    // THEME_DIALOGUE_PEAK_SILENT — Single-peak isolation × dialogue channel (n≥8, ≥2 resonant
    // scenes, scene with max dialogueHighlights count > 2 is thematically mute). The script's
    // most verbally active scene — the moment with the most dialogue highlights — carries no
    // thematic resonance for "${themeRaw}". Dialogue-rich scenes are where the story's verbal
    // register is highest: characters speak in longer, denser exchanges, and this scene is the
    // peak of that verbal density. When the verbal peak is thematically silent, the script's
    // most talkative moment is also its thematically emptiest — the most dialogue the story
    // produces has nothing to do with its central question. Fills the dialogue-channel cell
    // alongside THEME_SEED_PEAK_ABSENT (seededClueIds), THEME_PAYOFF_PEAK_ABSENT (payoffs),
    // THEME_CURIOSITY_PEAK_ABSENT (curiosityDelta), THEME_SUSPENSE_PEAK_ABSENT (suspenseDelta),
    // THEME_RELATIONSHIP_PEAK_ABSENT (relationshipShifts), THEME_CLOCK_PEAK_ABSENT (clockDelta).
    // Distinct from all co-occurrence/decoupling checks (those audit entire categories of scenes;
    // this isolates a single peak by dialogue count — a single-peak mode on a different metric),
    // THEME_RESONANCE_BURST (Wave 307: one scene has >50% of all keyword hits — a single-peak
    // check on keyword density; this checks the single peak of DIALOGUE VOLUME, not keyword hits).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const dlgCounts472c = records.map(r => ((r.dialogueHighlights ?? []) as string[]).length);
      const maxDlg472c = Math.max(...dlgCounts472c);
      if (maxDlg472c > 2) {
        const peakDlgIdx472c = dlgCounts472c.indexOf(maxDlg472c);
        const peakDlgScene472c = records[peakDlgIdx472c];
        const peakIsResonant472c = sceneHasResonance(
          sceneTexts.get(peakDlgScene472c.sceneIdx) ?? '',
          expandedKeywords,
        );
        if (!peakIsResonant472c) {
          issues.push({
            location: `Scene ${peakDlgScene472c.sceneIdx} (${peakDlgScene472c.slug}) — peak dialogue scene (${maxDlg472c} highlights) is thematically silent`,
            rule: 'THEME_DIALOGUE_PEAK_SILENT',
            severity: 'minor',
            description: `The scene with the most dialogue highlights (${maxDlg472c} at scene ${peakDlgScene472c.sceneIdx}) carries no language related to "${themeRaw}", though ${resonantScenes.length} other scenes carry the theme. The script's most verbally active moment — the scene where characters speak most — is thematically silent. Dialogue is the primary channel through which characters voice ideas, make choices, and reveal meaning; the scene with the most dialogue should be among the most likely to carry thematic weight. When the verbal peak is mute, the theme has been written around the story's main talking point.`,
            suggestedFix: `Give scene ${peakDlgScene472c.sceneIdx} at least one line of dialogue that touches "${themeRaw}": a character statement, question, or argument that invokes the theme directly or obliquely. The most dialogue-rich scene in the script is the most natural place for thematic language to appear — it's where characters are already speaking most fully, and thematic depth costs only one line.`,
          });
        }
      }
    }

    // ── Wave 486: POSITIVE_EMOTION_AFTERMATH_SILENT, FIRST_RESONANT_CAUSELESS, RESONANCE_THIRDS_CLUSTER ──

    // THEME_POSITIVE_EMOTION_AFTERMATH_SILENT — sequence/aftermath × positive emotion trigger → theme.
    // n≥8, ≥2 positive-shift scenes not at the last position. For every such scene, check whether the
    // immediately following scene is thematically resonant. If no positive-shift scene is followed by a
    // resonant scene, the post-uplift beat never picks up the theme — emotional highs and thematic meaning
    // are permanently decoupled across time rather than co-incident.
    // Distinctness: THEME_POSITIVE_EMOTION_DECOUPLED fires when the positive scene ITSELF is thematically
    // silent (co-occurrence check); this fires when the NEXT scene is silent (aftermath check). Different
    // temporal relationship — decoupling vs aftermath silence. Fills the aftermath × positive-emotion
    // channel alongside THEME_CLOCK_AFTERMATH_SILENT, THEME_REVELATION_AFTERMATH_SILENT,
    // THEME_DRAMATIC_TURN_AFTERMATH_SILENT, THEME_PEAK_SUSPENSE_AFTERMATH_SILENT.
    const n486a = records.length;
    if (n486a >= 8) {
      const posIdxs486a: number[] = [];
      for (let i486a = 0; i486a < n486a - 1; i486a++) {
        if (records[i486a].emotionalShift === 'positive') posIdxs486a.push(i486a);
      }
      if (posIdxs486a.length >= 2) {
        const anyPosAftermath486a = posIdxs486a.some(i486a => {
          const next486a = records[i486a + 1];
          return sceneHasResonance(sceneTexts.get(next486a.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyPosAftermath486a) {
          issues.push({
            location: `${posIdxs486a.length} positive-shift scenes — none followed by theme resonance`,
            rule: 'THEME_POSITIVE_EMOTION_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${posIdxs486a.length} positive-emotion scenes, but not one is followed immediately by a scene that touches "${themeRaw}". Post-uplift beats are among the most natural moments for thematic reflection — characters have just experienced something hopeful or triumphant, and the next scene is primed to carry meaning. When every positive-shift moment passes without the theme entering the next beat, the story's emotional highs and its central idea remain permanently disconnected.`,
            suggestedFix: `After at least one positive-emotion scene, let the next scene voice or embody "${themeRaw}" — even a single image, line, or decision that connects the uplift to the story's central question. The moment after a positive turn is the most receptive audience state for thematic reinforcement.`,
          });
        }
      }
    }

    // THEME_FIRST_RESONANT_CAUSELESS — backward-cause × first resonant scene.
    // n≥6, first resonant scene at array pos≥2. Check whether either of the 2 prior scenes
    // contains a structural cause: revelation, dramatic turn (≠'nothing'), suspense rise
    // (suspenseDelta>0), clockRaised, or any non-neutral emotional shift. When the story's
    // inaugural thematic moment is structurally causeless, the theme debuts as an editorial
    // insertion rather than emerging from narrative pressure.
    // Distinctness: THEME_PEAK_UNMOTIVATED fires on the single densest scene (most keyword hits);
    // THEME_ALL_RESONANCE_CAUSELESS fires only when every resonant scene is causeless. This
    // specifically targets the very first resonant scene — a weaker, earlier failure mode that
    // the other two checks cannot catch. THEME_LATE_DEBUT checks the first resonant scene's
    // POSITION (too late); this checks its CAUSE regardless of position.
    if (records.length >= 6) {
      const firstResIdx486b = records.findIndex(r =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      );
      if (firstResIdx486b >= 2) {
        const prior1_486b = records[firstResIdx486b - 1];
        const prior2_486b = records[firstResIdx486b - 2];
        const hasCause486b = [prior1_486b, prior2_486b].some(r =>
          r !== undefined && (
            (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
            (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
            r.suspenseDelta > 0 ||
            r.clockRaised === true ||
            r.emotionalShift !== 'neutral'
          ),
        );
        if (!hasCause486b) {
          issues.push({
            location: `Scene ${records[firstResIdx486b].sceneIdx} (${records[firstResIdx486b].slug}) — first resonant scene, causeless`,
            rule: 'THEME_FIRST_RESONANT_CAUSELESS',
            severity: 'minor',
            description: `The first thematically resonant scene (scene ${records[firstResIdx486b].sceneIdx}) appears with no structural preparation — the 2 preceding scenes carry no revelation, dramatic turn, suspense rise, deadline, or emotional shift that would motivate a thematic surfacing. When the theme debuts without cause, it arrives as an editorial insertion rather than emerging from narrative pressure.`,
            suggestedFix: `Add a structural catalyst in the scene immediately before scene ${records[firstResIdx486b].sceneIdx}: a revelation, a reversal, a moment of tension, or an emotional beat that makes the theme's debut feel earned. The first thematic moment should feel provoked by the story, not appended to it.`,
          });
        }
      }
    }

    // THEME_RESONANCE_THIRDS_CLUSTER — distribution/timing × thirds × resonant scene proportion.
    // n≥9, ≥3 resonant scenes. Divide records into three equal structural thirds. Count resonant
    // scenes in each third. If >75% of all resonant scenes fall in a single third, the theme is
    // structurally localized — it speaks in only one segment and falls silent for two thirds of runtime.
    // Distinctness: THEME_FRONT_LOADED compares keyword hit DENSITY (hits/scene) in the first third
    // vs the rest, requires ≥2 hits/scene density to fire, and only contrasts first-third vs rest
    // (not all three thirds). This check uses scene MEMBERSHIP PROPORTION across all three thirds
    // and fires even when the dominant zone is the middle or final third. THEME_CLOSING_QUARTER_SILENT,
    // THEME_MIDPOINT_SILENT etc. fire on ZERO resonant scenes in a zone; this fires when one zone
    // is overwhelmingly dominant (≥1 in each zone but concentration >75% in one). THEME_RESONANT_
    // CLUSTER_FLOOD fires on ≥4 consecutive resonant scenes (run-based, adjacency); this uses
    // structural position thirds, not adjacency.
    if (records.length >= 9 && resonantScenes.length >= 3) {
      const third486c = Math.floor(records.length / 3);
      const resonantSet486c = new Set(resonantScenes.map(r => r.sceneIdx));
      const zone1Count486c = records.slice(0, third486c).filter(r => resonantSet486c.has(r.sceneIdx)).length;
      const zone2Count486c = records.slice(third486c, 2 * third486c).filter(r => resonantSet486c.has(r.sceneIdx)).length;
      const zone3Count486c = records.slice(2 * third486c).filter(r => resonantSet486c.has(r.sceneIdx)).length;
      const maxZone486c = Math.max(zone1Count486c, zone2Count486c, zone3Count486c);
      if (maxZone486c / resonantScenes.length > 0.75) {
        const dominantZone486c = zone1Count486c === maxZone486c ? 'first'
          : zone2Count486c === maxZone486c ? 'second' : 'third';
        issues.push({
          location: `Thematic distribution — ${maxZone486c}/${resonantScenes.length} resonant scenes in ${dominantZone486c} third (zones: ${zone1Count486c}/${zone2Count486c}/${zone3Count486c})`,
          rule: 'THEME_RESONANCE_THIRDS_CLUSTER',
          severity: 'minor',
          description: `${Math.round(maxZone486c / resonantScenes.length * 100)}% of thematically resonant scenes (${maxZone486c} of ${resonantScenes.length}) fall in the ${dominantZone486c} structural third of the script. The theme is localized — it only speaks in one segment and falls silent for the other two thirds of the runtime. A theme that concentrates in one structural zone cannot accompany the audience through the full arc of the story.`,
          suggestedFix: `Distribute theme touchpoints across all three structural thirds. Add at least one scene in each of the ${dominantZone486c === 'first' ? 'second and third' : dominantZone486c === 'second' ? 'first and third' : 'first and second'} thirds that carries language, action, or image related to "${themeRaw}". Theme should compound and evolve across the full structure, not concentrate in one zone.`,
        });
      }
    }

    // ── Wave 500: THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT, THEME_LAST_RESONANT_CAUSELESS,
    //              THEME_PAYOFF_AFTERMATH_SILENT ──────────────────────────────────────────────

    // THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT (sequence/aftermath × negative emotion trigger →
    // theme, n≥8, ≥2 negative-shift scenes not at last position, none followed by resonant scene):
    // Every scene of loss, conflict, or grief passes without the next scene picking up the theme —
    // dark emotional beats and thematic meaning are permanently disconnected across time. The scene
    // after a negative-shift moment is a natural fulcrum for thematic weight: the character has just
    // suffered something, and the next beat is primed for reflection or consequence. Sequence/aftermath
    // mode × negative emotion trigger × theme aftermath. Distinct from THEME_NEGATIVE_EMOTION_DECOUPLED
    // (Wave 279: co-occurrence — the negative scene ITSELF is silent; this fires when the NEXT scene
    // is silent), THEME_POSITIVE_EMOTION_AFTERMATH_SILENT (Wave 486: same mode, opposite polarity —
    // completes the full emotional-polarity pair for the aftermath × emotion channel), THEME_DRAMATIC_
    // TURN_AFTERMATH_SILENT (Wave 430: same mode, different trigger — turn vs negative emotion).
    const n500a = records.length;
    if (n500a >= 8) {
      const negIdxs500a: number[] = [];
      for (let i500a = 0; i500a < n500a - 1; i500a++) {
        if (records[i500a].emotionalShift === 'negative') negIdxs500a.push(i500a);
      }
      if (negIdxs500a.length >= 2) {
        const anyNegAftermath500a = negIdxs500a.some(i500a => {
          const next500a = records[i500a + 1];
          return sceneHasResonance(sceneTexts.get(next500a.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyNegAftermath500a) {
          issues.push({
            location: `${negIdxs500a.length} negative-shift scenes — none followed by theme resonance`,
            rule: 'THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${negIdxs500a.length} scenes of negative emotional shift, but not one is followed immediately by a scene that touches "${themeRaw}". The scene after a moment of loss, conflict, or grief is a natural fulcrum for thematic weight: characters have just suffered something, and the next beat is primed for reflection, consequence, or a thematic echo of what just happened. When every dark emotional moment passes without the theme entering the next beat, the story uses loss as incident rather than meaning — the damage lands but the story never asks what it signifies.`,
            suggestedFix: `After at least one negative-shift scene, let the next scene voice or embody "${themeRaw}" — even a single image, line, or decision that connects the loss to the story's central question. A moment of grief is a lens through which the theme can be seen more clearly; the scene immediately after it is the most receptive moment in the script for that thematic connection.`,
          });
        }
      }
    }

    // THEME_LAST_RESONANT_CAUSELESS (backward-cause × last resonant scene, n≥6, last resonant
    // scene at index ≥ 2, prior 2 scenes have no structural cause): The story's final thematic
    // beat lacks preparation — the last scene to carry the theme appears without any preceding
    // revelation, reversal, tension, deadline, or emotional charge. The theme's last voicing
    // should arrive with structural weight, not as a stray coda. A closing thematic moment that
    // appears causeless reads as an authorial safety valve appended after the real story has ended
    // rather than as the earned crystallization of everything that preceded it. Backward-cause mode
    // × last resonant scene. Distinct from THEME_FIRST_RESONANT_CAUSELESS (Wave 486: inaugural
    // thematic moment, not final), THEME_PEAK_UNMOTIVATED (Wave 430: densest resonant scene, not
    // last), THEME_ALL_RESONANCE_CAUSELESS (Wave 458: requires every resonant scene to be causeless;
    // this fires on the last scene alone). First backward-cause check targeting the final resonant
    // scene position.
    if (records.length >= 6) {
      let lastResIdx500b = -1;
      for (let i500b = records.length - 1; i500b >= 0; i500b--) {
        if (sceneHasResonance(sceneTexts.get(records[i500b].sceneIdx) ?? '', expandedKeywords)) {
          lastResIdx500b = i500b;
          break;
        }
      }
      if (lastResIdx500b >= 2) {
        const prior1_500b = records[lastResIdx500b - 1];
        const prior2_500b = records[lastResIdx500b - 2];
        const hasCause500b = [prior1_500b, prior2_500b].some(r =>
          r !== undefined && (
            (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
            (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
            r.suspenseDelta > 0 ||
            r.clockRaised === true ||
            r.emotionalShift !== 'neutral'
          ),
        );
        if (!hasCause500b) {
          issues.push({
            location: `Scene ${records[lastResIdx500b].sceneIdx} (${records[lastResIdx500b].slug}) — last resonant scene, causeless`,
            rule: 'THEME_LAST_RESONANT_CAUSELESS',
            severity: 'minor',
            description: `The last thematically resonant scene (scene ${records[lastResIdx500b].sceneIdx}) appears with no structural preparation — the 2 preceding scenes carry no revelation, dramatic turn, suspense rise, deadline, or emotional shift that would motivate a final thematic statement. The story's last voicing of its central meaning arrives as a coda rather than a conclusion: a thematic beat without narrative cause. When the final thematic moment is causeless, it reads as an authorial safety valve rather than the earned crystallization of everything that preceded it.`,
            suggestedFix: `Add a structural catalyst in the scene immediately before scene ${records[lastResIdx500b].sceneIdx}: a revelation, a reversal, a moment of tension, or an emotional beat that makes the theme's final statement feel earned rather than appended. The last thematic moment should feel provoked by the story — the culmination of a narrative pressure — not added as a safety net.`,
          });
        }
      }
    }

    // THEME_PAYOFF_AFTERMATH_SILENT (sequence/aftermath × payoff trigger → theme, n≥8, ≥2
    // qualifying payoff scenes [payoffSetupIds non-empty, pos < n-1], none followed by a resonant
    // next scene): Every scene that resolves a planted setup passes without the next scene touching
    // the theme — payoffs close narrative loops but never prompt thematic reflection. A scene that
    // delivers on a planted setup is a moment of structural completion: what was promised has arrived.
    // That completion is a natural gateway for theme because it asks why the payoff mattered — what
    // it cost and what it means for the characters. Sequence/aftermath mode × payoff trigger × theme
    // aftermath. Distinct from THEME_REVELATION_AFTERMATH_SILENT (Wave 444: revelation trigger — a
    // different structural event), THEME_POSITIVE_EMOTION_AFTERMATH_SILENT (Wave 486: positive
    // emotion trigger, not payoff), THEME_PAYOFF_PEAK_ABSENT (Wave 402: single-peak isolation —
    // the densest payoff scene itself is mute; this checks what happens AFTER payoff scenes). First
    // aftermath check with the payoff channel.
    const n500c = records.length;
    if (n500c >= 8) {
      const payoffIdxs500c: number[] = [];
      for (let i500c = 0; i500c < n500c - 1; i500c++) {
        if (((records[i500c].payoffSetupIds ?? []) as any[]).length > 0) payoffIdxs500c.push(i500c);
      }
      if (payoffIdxs500c.length >= 2) {
        const anyPayoffAftermath500c = payoffIdxs500c.some(i500c => {
          const next500c = records[i500c + 1];
          return sceneHasResonance(sceneTexts.get(next500c.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyPayoffAftermath500c) {
          issues.push({
            location: `${payoffIdxs500c.length} payoff scene(s) — none followed by theme resonance`,
            rule: 'THEME_PAYOFF_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${payoffIdxs500c.length} scenes that deliver on planted setups (non-empty payoffSetupIds), but not one is followed immediately by a scene that touches "${themeRaw}". A payoff scene is a moment of structural completion — what was promised has arrived. That completion is a natural gateway for theme: it asks why the resolution mattered, what it cost, and what it means for the characters. When no payoff scene is followed by a resonant next beat, the story treats resolution as purely mechanical: loops close without meaning being extracted from them.`,
            suggestedFix: `After at least one payoff scene, let the next scene voice or embody "${themeRaw}" — even a single moment that connects the resolution to the story's central question. A payoff is not just the end of a planted setup; it is a narrative event with meaning. The scene immediately after it is the most natural moment to ask: what did that resolution mean for the theme?`,
          });
        }
      }
    }

    // ── Wave 514: THEME_SEED_AFTERMATH_SILENT, THEME_HIGH_SUSPENSE_AFTERMATH_SILENT,
    //              THEME_CURIOSITY_AFTERMATH_SILENT ──────────────────────────────────────────────

    // THEME_SEED_AFTERMATH_SILENT (sequence/aftermath × seed trigger → theme, n≥8, ≥2 qualifying
    // seed scenes [seededClueIds non-empty, pos < n-1], none followed by a resonant next scene):
    // Every scene that plants a clue or setup passes without the next scene touching the theme —
    // seed moments are buried without the story signaling their meaning. When a scene plants a seed,
    // the story is making a promise about what will matter; the next beat is a natural moment to
    // connect that promise to the central question. Sequence/aftermath mode × seed trigger × theme
    // aftermath. Distinctness: THEME_PAYOFF_AFTERMATH_SILENT (Wave 500) uses the payoffSetupIds
    // channel (what arrives); this uses the seededClueIds channel (what is planted). THEME_CLUE_
    // SCENES_DECOUPLED (Wave 265) fires when the clue scene ITSELF is silent — co-occurrence mode;
    // this fires when the FOLLOWING scene is silent — aftermath mode, a later failure in the seed
    // lifecycle distinct from what the seed scene itself carries.
    const n514a = records.length;
    if (n514a >= 8) {
      const seedIdxs514a: number[] = [];
      for (let i514a = 0; i514a < n514a - 1; i514a++) {
        if (((records[i514a].seededClueIds ?? []) as string[]).length > 0) seedIdxs514a.push(i514a);
      }
      if (seedIdxs514a.length >= 2) {
        const anySeedAftermath514a = seedIdxs514a.some(i514a => {
          const next514a = records[i514a + 1];
          return sceneHasResonance(sceneTexts.get(next514a.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anySeedAftermath514a) {
          issues.push({
            location: `${seedIdxs514a.length} seed scene(s) — none followed by theme resonance`,
            rule: 'THEME_SEED_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${seedIdxs514a.length} scenes that plant clues or setups (non-empty seededClueIds), but not one is followed immediately by a scene that touches "${themeRaw}". When a scene plants a seed, the story is making a promise about what will matter; the next beat is a natural moment to voice what that promise means — to connect the planted expectation to the central question. When every seed moment passes without the theme entering the next beat, clue-planting becomes purely mechanical: seeds are buried but their meaning is never foreshadowed, leaving the eventual payoff disconnected from the theme.`,
            suggestedFix: `After at least one seed scene, let the next scene voice or embody "${themeRaw}" — a moment that connects the planted setup to the story's central question. A seed is not just a future narrative promise; it is a thematic signal about what the story values. The scene immediately after planting is the most natural moment to let the audience feel what the seed means.`,
          });
        }
      }
    }

    // THEME_HIGH_SUSPENSE_AFTERMATH_SILENT (sequence/aftermath × high-suspense trigger → theme,
    // n≥8, ≥2 scenes with suspenseDelta>1 not at last position, none followed by a resonant scene):
    // Every moment of peak tension passes without the next scene picking up the theme. A high-suspense
    // scene is when the story's stakes feel most immediate; the scene that follows is uniquely
    // positioned to channel that tension into thematic meaning — to answer "what does this danger
    // signify?" with the story's central idea. When no high-suspense moment is followed by a resonant
    // beat, the script uses tension as spectacle rather than as a delivery mechanism for meaning.
    // Sequence/aftermath mode × suspense trigger × theme aftermath. Distinctness: THEME_PEAK_SUSPENSE_
    // AFTERMATH_SILENT (Wave 416) fires on the scene after the single max-suspenseDelta spike — only
    // one position. This fires when ANY of ≥2 high-suspense scenes (suspenseDelta>1) fails to be
    // followed by theme — a broader, distribution-level version of the same failure mode. THEME_HIGH_
    // SUSPENSE_SCENES_DECOUPLED (Wave 279) fires when the high-suspense scenes THEMSELVES carry no
    // theme — co-occurrence mode. This fires when FOLLOWING scenes are silent — aftermath mode,
    // one temporal step later.
    const n514b = records.length;
    if (n514b >= 8) {
      const highSuspIdxs514b: number[] = [];
      for (let i514b = 0; i514b < n514b - 1; i514b++) {
        if (records[i514b].suspenseDelta > 1) highSuspIdxs514b.push(i514b);
      }
      if (highSuspIdxs514b.length >= 2) {
        const anyHighSuspAftermath514b = highSuspIdxs514b.some(i514b => {
          const next514b = records[i514b + 1];
          return sceneHasResonance(sceneTexts.get(next514b.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyHighSuspAftermath514b) {
          issues.push({
            location: `${highSuspIdxs514b.length} high-suspense scene(s) — none followed by theme resonance`,
            rule: 'THEME_HIGH_SUSPENSE_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${highSuspIdxs514b.length} high-suspense scenes (suspenseDelta > 1), but not one is followed immediately by a scene that touches "${themeRaw}". A high-suspense moment is when the story's stakes feel most immediate and real; the scene that follows it is uniquely positioned to channel that tension into thematic meaning — to answer the implicit question "what does this danger mean?" with the story's central idea. When no peak-tension moment is followed by a resonant beat, the script uses suspense as spectacle: tension is raised and managed but its thematic significance is never extracted.`,
            suggestedFix: `After at least one high-suspense scene, let the next scene voice or embody "${themeRaw}" — even a brief moment that connects the tension to the story's central question. The scene immediately following a moment of peak danger is the most receptive in the script to thematic weight: the audience's attention is fully engaged and the question "why does this matter?" is already live.`,
          });
        }
      }
    }

    // THEME_CURIOSITY_AFTERMATH_SILENT (sequence/aftermath × curiosity trigger → theme, n≥8, ≥2
    // scenes with curiosityDelta>0 not at last position, none followed by a resonant scene): Every
    // scene that raises a question or mystery passes without the next scene picking up the theme.
    // When a scene spikes curiosity, the story is declaring "there is something you need to understand";
    // the next beat is the most natural moment to connect that need-to-know to what the story is
    // actually about. When no curiosity beat is followed by a resonant scene, the script poses
    // mysteries as appetite stimulation rather than thematic motivation — questions are raised but
    // their connection to the central meaning is never signaled. Sequence/aftermath mode × curiosity
    // trigger × theme aftermath. Distinctness: THEME_CURIOSITY_SCENES_DECOUPLED (Wave 265) fires when
    // the curiosity scene ITSELF carries no theme — co-occurrence mode. This fires when the FOLLOWING
    // scene is silent — aftermath mode, one temporal step later. THEME_PAYOFF_AFTERMATH_CURIOSITY_FLAT
    // in pacing.ts is a completely different axis (curiosity in aftermath of payoff triggers, not
    // theme in aftermath of curiosity triggers).
    const n514c = records.length;
    if (n514c >= 8) {
      const curIdxs514c: number[] = [];
      for (let i514c = 0; i514c < n514c - 1; i514c++) {
        if (records[i514c].curiosityDelta > 0) curIdxs514c.push(i514c);
      }
      if (curIdxs514c.length >= 2) {
        const anyCurAftermath514c = curIdxs514c.some(i514c => {
          const next514c = records[i514c + 1];
          return sceneHasResonance(sceneTexts.get(next514c.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyCurAftermath514c) {
          issues.push({
            location: `${curIdxs514c.length} curiosity-spike scene(s) — none followed by theme resonance`,
            rule: 'THEME_CURIOSITY_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${curIdxs514c.length} scenes that spike audience curiosity (curiosityDelta > 0), but not one is followed immediately by a scene that touches "${themeRaw}". When a scene raises a question or mystery, the story is declaring that something needs to be understood. The next beat is the most natural moment to connect that need-to-know to what the story is actually about. When no curiosity beat is followed by a resonant scene, the script poses mysteries as appetite stimulation rather than thematic motivation — questions are raised but their connection to the central meaning is never signaled, leaving intrigue and theme permanently decoupled across time.`,
            suggestedFix: `After at least one curiosity-raising scene, let the next scene voice or embody "${themeRaw}" — a moment that connects the story's open question to its central theme. The scene immediately following a curiosity spike is the most receptive moment for thematic anchoring: the audience is actively wondering "what does this mean?" and the answer can be thematic as well as plot-level.`,
          });
        }
      }
    }

    // ── Wave 528: THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT, THEME_MIDPOINT_RESONANT_CAUSELESS,
    //              THEME_BACK_HEAVY ──────────────────────────────────────────────────────────────

    // THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT (sequence/aftermath × relationship shift trigger
    // → theme, n≥8, ≥2 qualifying relationship-shift scenes [pos < n-1], none followed by a
    // resonant scene): Every scene that moves a relationship between characters passes without
    // the next scene touching the theme. A relationship shift is the human core of the story's
    // machinery: when two characters grow closer, more distant, more hostile, or more trusting,
    // the story is articulating the emotional cost of its events. The scene that follows a
    // relational beat is the natural moment to ask what the shift means — to connect the
    // interpersonal movement to the theme's central question. When no relational shift is followed
    // by a resonant next beat, the story treats relationships as plot mechanics rather than as
    // vehicles for meaning. Sequence/aftermath mode × relationship-shift trigger × theme aftermath.
    // Distinct from THEME_RELATIONSHIP_DECOUPLED (Wave 458: co-occurrence mode — the relationship
    // shift scene ITSELF carries no theme; this fires when the FOLLOWING scene is silent, one
    // temporal step later), all other aftermath checks (different triggers: seed, payoff, curiosity,
    // suspense, emotion, revelation, clock, dramatic-turn — relationship is a new trigger channel).
    const n528a = records.length;
    if (n528a >= 8) {
      const relIdxs528a: number[] = [];
      for (let i528a = 0; i528a < n528a - 1; i528a++) {
        if (((records[i528a].relationshipShifts ?? []) as any[]).length > 0) relIdxs528a.push(i528a);
      }
      if (relIdxs528a.length >= 2) {
        const anyRelAftermath528a = relIdxs528a.some(i528a => {
          const next528a = records[i528a + 1];
          return sceneHasResonance(sceneTexts.get(next528a.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyRelAftermath528a) {
          issues.push({
            location: `${relIdxs528a.length} relationship-shift scene(s) — none followed by theme resonance`,
            rule: 'THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${relIdxs528a.length} scenes that move a relationship between characters (non-empty relationshipShifts), but not one is followed immediately by a scene that touches "${themeRaw}". A relationship shift is the human core of the story's machinery: when characters grow closer, more distant, or more hostile, the story is articulating the emotional cost of its events. The scene that follows a relational beat is the natural moment to connect that interpersonal movement to what the story is about. When no relationship shift is followed by a resonant next beat, the story treats relational movement as plot mechanics rather than as vehicles for the theme — bonds change but the change is never made to mean anything.`,
            suggestedFix: `After at least one relationship-shift scene, let the next scene voice or embody "${themeRaw}" — even briefly. A character reflecting on what just changed between them and someone else is a natural gateway for thematic language: the shift gives a context in which the theme's central question has immediate personal stakes. The relationship scene and its thematic aftermath together form one complete dramatic unit: the shift in bond plus the meaning of that shift.`,
          });
        }
      }
    }

    // THEME_MIDPOINT_RESONANT_CAUSELESS (backward-cause × midpoint zone resonant scene,
    // n≥8, ≥2 global structural catalysts, ≥1 resonant scene in the 40%–60% midpoint zone,
    // no midpoint resonant scene preceded by a catalyst in its prior 2 scenes): The first
    // thematically resonant scene in the story's structural midpoint (40%–60%) lacks any
    // upstream cause — no revelation, dramatic turn, suspense rise, clock, or emotional shift
    // in the 2 preceding scenes — even though structural catalysts exist elsewhere. The midpoint
    // is where the story's central question is supposed to crystallize: the protagonist has
    // committed, the opposition has materialized, and the theme should arrive with the full
    // weight of the structural turn. When the midpoint's first thematic beat is causeless,
    // it lands in the script as an editorial insertion at the pivot rather than as a consequence
    // of the pivot. Backward-cause mode × midpoint structural position × first resonant scene
    // in zone. Distinct from THEME_PEAK_UNMOTIVATED (Wave 430: the single densest scene in the
    // whole script), THEME_FIRST_RESONANT_CAUSELESS (Wave 486: the very first resonant scene in
    // the story), THEME_LAST_RESONANT_CAUSELESS (Wave 500: the final thematic beat), THEME_ALL_
    // RESONANCE_CAUSELESS (Wave 458: every resonant scene causeless — fires only when no exception
    // exists; this fires when the midpoint resonant scene specifically is causeless even if many
    // others ARE motivated).
    const n528b = records.length;
    if (n528b >= 8) {
      const midStart528b = Math.floor(n528b * 0.40);
      const midEnd528b = Math.floor(n528b * 0.60);
      const midResonantIdxs528b = records
        .map((r, i) => ({ r, i }))
        .filter(({ r, i }) =>
          i >= midStart528b && i <= midEnd528b &&
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        )
        .map(({ i }) => i);
      const hasCatalystGlobally528b = records.some(r =>
        (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
        (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
        r.suspenseDelta > 0 ||
        r.clockRaised === true ||
        r.emotionalShift !== 'neutral',
      );
      // Need ≥2 catalysts globally so that causelessness is meaningful
      const globalCatalystCount528b = records.filter(r =>
        (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
        (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
        r.suspenseDelta > 0 ||
        r.clockRaised === true ||
        r.emotionalShift !== 'neutral',
      ).length;
      if (midResonantIdxs528b.length > 0 && globalCatalystCount528b >= 2) {
        const firstMidRes528b = midResonantIdxs528b[0];
        const hasCause528b = firstMidRes528b >= 2 && [records[firstMidRes528b - 1], records[firstMidRes528b - 2]].some(r =>
          r !== undefined && (
            (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
            (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
            r.suspenseDelta > 0 ||
            r.clockRaised === true ||
            r.emotionalShift !== 'neutral'
          ),
        );
        if (!hasCause528b) {
          const midScene528b = records[firstMidRes528b];
          issues.push({
            location: `Scene ${midScene528b.sceneIdx} (${midScene528b.slug}) — first midpoint resonant scene, causeless`,
            rule: 'THEME_MIDPOINT_RESONANT_CAUSELESS',
            severity: 'minor',
            description: `The first thematically resonant scene in the story's midpoint zone (40%–60%) — scene ${midScene528b.sceneIdx} — appears without any structural preparation: the 2 preceding scenes carry no revelation, dramatic turn, suspense rise, deadline, or emotional shift that would motivate the theme's surfacing at this structural pivot, even though such catalysts exist elsewhere in the story. The midpoint is where the story's central question should crystallize with the full weight of the turn: the protagonist has committed, the opposition has materialized, and the theme should land as a consequence of the structural moment, not as an editorial aside dropped into the middle. A causeless thematic beat at the midpoint reads as a thesis statement placed at the center of the script rather than earned by what happened in the preceding scenes.`,
            suggestedFix: `Add a structural catalyst in one of the two scenes before scene ${midScene528b.sceneIdx}: a revelation that makes the theme's question land with midpoint urgency, a dramatic turn that forces the characters to confront what the story is about, or a moment of tension or emotional charge that the midpoint's thematic beat then responds to. The midpoint resonant scene should feel provoked by the pivot, not inserted at it.`,
          });
        }
      }
    }

    // THEME_BACK_HEAVY (distribution/timing × second-half proportion × resonant scene count,
    // n≥8, ≥3 resonant scenes, ≥1 in first half [pos < n/2], >65% in second half [pos ≥ n/2]):
    // More than two-thirds of the script's resonant scenes fall in the second half while the
    // first half has at least one. Theme is structurally back-loaded: the story's opening
    // movement is largely thematically silent, and meaning concentrates in the second half
    // and resolution. The audience spends the first half of the narrative without the thematic
    // anchor that would give dramatic events their meaning — what the story is about only
    // becomes clear in the back half, leaving the opening acts to feel like setup for a
    // thematic statement that arrives too late to permeate the whole story. Distribution/
    // timing mode × second-half proportion × resonant scene membership. Distinct from
    // THEME_RESONANCE_THIRDS_CLUSTER (Wave 486: >75% in one structural third — fires when
    // one of three thirds is dominant, not when two of them [second half] are collectively
    // dominant at a lower threshold), THEME_FRONT_LOADED (Wave 148: keyword hit DENSITY in
    // first third vs rest — the exact opposite distribution problem; density-based not
    // scene-count proportion; fires on first-half front-loading not second-half back-loading),
    // THEME_ACT_1_DENSITY_DROP (Wave 374: first 25% zone vs overall — zone density check not
    // a half-split proportion), THEME_PEAK_BEFORE_MIDPOINT (Wave 321: the single densest theme
    // scene is in first half — single-peak position check, not overall scene distribution).
    if (records.length >= 8 && resonantScenes.length >= 3) {
      const halfIdx528c = Math.floor(records.length / 2);
      const firstHalfResonant528c = resonantScenes.filter(r => {
        const pos = records.indexOf(r);
        return pos < halfIdx528c;
      });
      const secondHalfResonant528c = resonantScenes.filter(r => {
        const pos = records.indexOf(r);
        return pos >= halfIdx528c;
      });
      if (
        firstHalfResonant528c.length >= 1 &&
        secondHalfResonant528c.length / resonantScenes.length > 0.65
      ) {
        issues.push({
          location: `${secondHalfResonant528c.length}/${resonantScenes.length} resonant scenes in second half`,
          rule: 'THEME_BACK_HEAVY',
          severity: 'minor',
          description: `${secondHalfResonant528c.length} of the story's ${resonantScenes.length} thematically resonant scenes (${(secondHalfResonant528c.length / resonantScenes.length * 100).toFixed(0)}%) fall in the second half of the script, while only ${firstHalfResonant528c.length} appear in the first half. Theme is structurally back-loaded: the first half of the narrative is largely thematically silent, and meaning concentrates in the second half and resolution. The audience spends the story's opening movement without the thematic anchor that would give dramatic events their significance — what the story is about only becomes clear once the narrative is past its midpoint, leaving the first half to feel like mechanical setup for a meaning that arrives too late to permeate the whole. The most durable thematic work permeates the whole story: the audience needs the theme's frame early enough to feel each subsequent event as part of the pattern.`,
          suggestedFix: `Distribute theme earlier: let at least two or three scenes in the first half voice or embody "${themeRaw}" — even briefly. The first half doesn't need the full thematic statement, but it needs enough resonance to let the audience begin forming the question that the second half will answer. A theme heard first at the 60% mark arrives as a thesis; a theme woven through from the beginning arrives as a truth.`,
        });
      }
    }

    // ── Wave 542: THEME_RESONANT_SUSPENSE_FLAT, THEME_ACT2B_RESONANT_CAUSELESS,
    //              THEME_RESONANT_AFTERMATH_CURIOSITY_VOID ─────────────────────────────────

    // THEME_RESONANT_SUSPENSE_FLAT (average/aggregate × suspense × resonant set, n≥8,
    // ≥2 resonant scenes, ≥2 suspense-spike scenes [suspenseDelta>0]): Every resonant scene
    // has suspenseDelta ≤ 0 — theme always surfaces in tension-free contexts, never in a scene
    // where the stakes are also rising. Theme voiced in low-tension beats reads as commentary
    // rather than consequence: the story pauses to make its thematic statement in scenes where
    // nothing dangerous is happening, then moves on to danger in scenes where meaning is silent.
    // The audience receives the thematic register and the tension register as fully separate
    // tracks — they feel the suspense without the meaning, and they receive the meaning without
    // the suspense. Average/aggregate mode × suspense channel × resonant set. Distinct from
    // THEME_HIGH_SUSPENSE_SCENES_DECOUPLED (Wave 279: high-suspense scenes carry no theme —
    // the HIGH-SUSPENSE end; this checks that resonant scenes have NO positive suspense at all),
    // THEME_QUIET_SCENES_ONLY (Wave 307: every resonant scene is neutral AND low-suspense — a
    // stricter double condition; this fires when only the suspense sub-condition holds).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const suspenseScenes542a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (suspenseScenes542a.length >= 2) {
        const allResonantFlat542a = resonantScenes.every(r => (r.suspenseDelta ?? 0) <= 0);
        if (allResonantFlat542a) {
          issues.push({
            location: `${resonantScenes.length} resonant scene(s) — none with positive suspenseDelta`,
            rule: 'THEME_RESONANT_SUSPENSE_FLAT',
            severity: 'minor',
            description: `Every scene that voices "${themeRaw}" (${resonantScenes.length} resonant scene(s)) has a suspenseDelta of 0 or below — the theme only surfaces when tension is not rising — even though ${suspenseScenes542a.length} scenes elsewhere carry positive suspenseDelta. Theme voiced exclusively in tension-free moments reads as editorial commentary rather than as dramatic consequence: the story pauses from its tension-raising to deliver meaning, then resumes tension in scenes where meaning is silent. The two registers never touch: the audience experiences suspense without thematic anchoring, and receives thematic anchoring without any suspense to make the meaning urgent. When theme and tension share a scene, the theme gains weight from what is at stake in that moment; when they are always decoupled, neither operates at full force.`,
            suggestedFix: `Let at least one resonant scene also carry a positive suspenseDelta — a scene where the theme is voiced in the context of rising stakes, not in a tension-free pause. A character articulating what the story is about while facing danger, or a scene that crystallizes the theme in the middle of an escalating situation, gives the thematic moment the urgency that makes meaning feel inevitable rather than inserted.`,
          });
        }
      }
    }

    // THEME_ACT2B_RESONANT_CAUSELESS (backward-cause × Act 2b zone 50%–75%, n≥8, ≥2 global
    // catalysts, ≥1 resonant scene in Act 2b zone, no Act 2b resonant scene preceded by a
    // catalyst in prior 2 scenes): The first thematically resonant scene in Act 2b (the
    // 50%–75% escalation run-up to the climax) lacks any upstream cause — no revelation,
    // dramatic turn, suspense rise, clock, or emotional shift in the 2 preceding scenes —
    // even though catalysts exist elsewhere. Act 2b is where the story presses toward maximum
    // pressure before the climax: the protagonist has failed to resolve the central problem,
    // the opposition is bearing down, and everything is escalating. A causeless thematic beat
    // in this zone reads as the writer stepping in to state meaning rather than the events
    // generating it through accumulation. Backward-cause mode × Act 2b zone × resonant trigger.
    // Distinct from THEME_MIDPOINT_RESONANT_CAUSELESS (Wave 528: 40%–60% zone), THEME_FIRST/
    // LAST_RESONANT_CAUSELESS (first/last scenes in the story), THEME_PEAK_UNMOTIVATED (densest
    // scene in the whole script, not zone-specific).
    const n542b = records.length;
    if (n542b >= 8) {
      const act2bStart542b = Math.floor(n542b * 0.50);
      const act2bEnd542b = Math.floor(n542b * 0.75);
      const act2bResonantIdxs542b = records
        .map((r, i) => ({ r, i }))
        .filter(({ r, i }) =>
          i >= act2bStart542b && i < act2bEnd542b &&
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        )
        .map(({ i }) => i);
      const globalCatalystCount542b = (records as any[]).filter(r =>
        (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
        (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
        (r.suspenseDelta ?? 0) > 0 ||
        r.clockRaised === true ||
        (r.emotionalShift ?? 'neutral') !== 'neutral',
      ).length;
      if (act2bResonantIdxs542b.length > 0 && globalCatalystCount542b >= 2) {
        const firstAct2bRes542b = act2bResonantIdxs542b[0];
        const hasCause542b = firstAct2bRes542b >= 2 && [
          (records as any[])[firstAct2bRes542b - 1],
          (records as any[])[firstAct2bRes542b - 2],
        ].some(r =>
          r !== undefined && (
            (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
            (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
            (r.suspenseDelta ?? 0) > 0 ||
            r.clockRaised === true ||
            (r.emotionalShift ?? 'neutral') !== 'neutral'
          ),
        );
        if (!hasCause542b) {
          const act2bScene542b = (records as any[])[firstAct2bRes542b];
          issues.push({
            location: `Scene ${act2bScene542b.sceneIdx} (${act2bScene542b.slug}) — first Act 2b resonant scene, causeless`,
            rule: 'THEME_ACT2B_RESONANT_CAUSELESS',
            severity: 'minor',
            description: `The first thematically resonant scene in Act 2b (50%–75% of the story) — scene ${act2bScene542b.sceneIdx} — appears without any structural preparation: the 2 preceding scenes carry no revelation, dramatic turn, suspense rise, deadline, or emotional shift that would motivate the theme's surfacing at this escalation zone, even though such catalysts exist elsewhere. Act 2b is the story's pressure-maximum zone: the protagonist is failing, the stakes are highest, and the theme should arrive as a consequence of that mounting pressure rather than as an aside within it. A causeless thematic beat in Act 2b reads as a thesis statement dropped into the escalation rather than earned by it — the meaning surfaces without the pressure that should have generated it.`,
            suggestedFix: `Add a structural catalyst in one of the two scenes before scene ${act2bScene542b.sceneIdx}: a revelation that makes the theme's question land with the urgency of the approach to the climax, a dramatic turn that forces the characters to confront what the story is about, or a moment of tension or emotional charge that the Act 2b thematic beat then responds to. In the escalation zone, theme should feel provoked by the story's mounting pressure, not inserted into a gap between pressures.`,
          });
        }
      }
    }

    // THEME_RESONANT_AFTERMATH_CURIOSITY_VOID (sequence/aftermath × curiosity × resonant trigger,
    // n≥8, ≥2 qualifying resonant scenes [pos < n-2], ≥2 curiosity-spike scenes [curiosityDelta>0]):
    // No resonant scene is followed by a curiosity spike in the next 2 scenes, despite curiosity
    // scenes existing elsewhere. When the story voices its theme, it should also open questions:
    // a thematic beat that lands without generating any new wondering in the scenes that follow
    // is a statement rather than a provocation. The theme's power is partly in how it reframes
    // what the audience is watching for — but when every resonant scene's aftermath is curiosity-flat,
    // the theme surfaces as assertion rather than as the engine of new forward pull.
    // Sequence/aftermath mode × curiosity channel × resonant trigger. First aftermath check that
    // uses the resonant scene as the TRIGGER (not the aftermath target). Distinct from all existing
    // aftermath checks (which fire when X → theme is missing), co-occurrence checks (same scene),
    // and CURIOSITY_AFTERMATH_SILENT (Wave 514: curiosity spike as trigger → theme as aftermath).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const qualResonant542c = resonantScenes.filter(r => {
        const pos = (records as any[]).indexOf(r);
        return pos < records.length - 2;
      });
      const curiosityScenes542c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      if (qualResonant542c.length >= 2 && curiosityScenes542c.length >= 2) {
        const allResNoCuriosity542c = qualResonant542c.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.curiosityDelta ?? 0) > 0) return false;
          }
          return true;
        });
        if (allResNoCuriosity542c) {
          issues.push({
            location: `${qualResonant542c.length} resonant scene(s) — no curiosity spike in any aftermath window`,
            rule: 'THEME_RESONANT_AFTERMATH_CURIOSITY_VOID',
            severity: 'minor',
            description: `None of the story's ${qualResonant542c.length} thematically resonant scene(s) is followed by a curiosity spike (curiosityDelta > 0) within the next two scenes, even though ${curiosityScenes542c.length} curiosity-generating scenes exist elsewhere. A thematic beat should open questions as well as answer them: when the story voices "${themeRaw}", the audience should be left wondering something they weren't wondering before — how will this apply to the protagonist's next choice, what the theme's implication means for a specific relationship, or what the stated truth will cost in the scenes ahead. When every resonant scene's aftermath is curiosity-flat, the theme operates as assertion rather than provocation — it makes a statement and closes the beat without generating any new forward pull. A theme that provokes wondering is dramatically active; a theme that only declares is editorially passive.`,
            suggestedFix: `After at least one resonant scene, introduce a curiosity-raising beat in the following one or two scenes — a question opened by what the theme just stated, an implication that the audience now wants to track, or a character discovery that the thematic moment makes newly uncertain. The curiosity spike after a resonant scene tells the audience that the theme is not just a statement but an active force that changes what they are watching for.`,
          });
        }
      }
    }

  }

  const { revised, usedLLM } = await rewritePass({
    fountain, issues, passName: 'theme', approvedSpans,
    storyContext: input.storyContext, priorPassResults: input.priorPassResults,
  });
  const changed = revised !== fountain;

  return {
    pass: 'theme',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? `Theme resonance pass: all scenes echo the theme "${themeRaw}"`
      : `Theme resonance pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
