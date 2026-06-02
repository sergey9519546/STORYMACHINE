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
