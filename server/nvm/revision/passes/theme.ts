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
