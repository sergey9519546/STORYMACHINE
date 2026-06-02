// Wave 39 — Pass 9: Pacing
// Checks scene length balance: scenes that are too long for their dramatic
// purpose, scenes that are too short to land, act-level pacing imbalance.
// Wave 143 additions: energy monotone (scenes all the same energy level),
// rhythm variety (scenes lack alternating fast/slow pacing), and energy timing
// (high-energy scenes placed where they won't impact story).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

/**
 * Compute weighted line counts per scene.
 * Dialogue lines read ~2x faster than action lines, so they're weighted at 0.5
 * to give an approximation of reading time rather than raw line count.
 */
function sceneLineCount(fountain: string): Map<number, number> {
  const lines = fountain.split('\n');
  const counts = new Map<number, number>();
  let currentScene = -1;
  let weightedCount = 0;
  // A character cue is an ALL-CAPS line (optional indent) followed by dialogue.
  let nextLineIsDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed)) {
      if (currentScene >= 0) counts.set(currentScene, Math.round(weightedCount));
      currentScene++;
      weightedCount = 0;
      nextLineIsDialogue = false;
    } else if (currentScene >= 0 && trimmed) {
      // Character cue: all-caps, optionally with parenthetical suffix
      if (/^[A-Z][A-Z0-9 \-'\.]{1,}(\s*\(.*\))?$/.test(trimmed) && trimmed.length < 40) {
        nextLineIsDialogue = true;
        // Character cue itself doesn't count toward pacing weight
      } else if (nextLineIsDialogue && !/^\(/.test(trimmed)) {
        // Dialogue line — reads faster
        weightedCount += 0.5;
      } else if (/^\(/.test(trimmed)) {
        // Parenthetical — very short, negligible
        weightedCount += 0.25;
        nextLineIsDialogue = true;
      } else {
        // Action line
        weightedCount += 1;
        nextLineIsDialogue = false;
      }
    } else if (currentScene >= 0 && !trimmed) {
      nextLineIsDialogue = false;
    }
  }
  if (currentScene >= 0) counts.set(currentScene, Math.round(weightedCount));
  return counts;
}

export async function pacingPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, annotations, structure, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const sceneLengths = sceneLineCount(fountain);
  if (sceneLengths.size === 0) {
    return {
      pass: 'pacing',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Pacing pass: no scenes found',
    };
  }

  const lengths = Array.from(sceneLengths.values());
  const avgLength = lengths.reduce((s, v) => s + v, 0) / lengths.length;

  // ── Scenes that are disproportionately long ───────────────────────────────
  // Guard: all-whitespace scripts produce avgLength=0; skip per-scene checks in that case.
  if (!isFinite(avgLength) || avgLength === 0) {
    return { pass: 'pacing', issues: [], revisedFountain: fountain, changed: false, summary: 'Pacing pass: all scenes are empty' };
  }

  for (const [sceneIdx, lineCount] of sceneLengths) {
    const record = records[sceneIdx];
    const ann = annotations[sceneIdx];
    if (!record || !ann) continue;

    // Scene is >2.5x average and has low suspense delta = over-written
    if (lineCount > avgLength * 2.5 && record.suspenseDelta < 2) {
      issues.push({
        location: `Scene ${sceneIdx} (${record.slug})`,
        rule: 'OVERLONG_LOW_TENSION',
        description: `Scene ${sceneIdx} is ${lineCount} lines (${Math.round(lineCount / avgLength * 100)}% above average) but generates low tension — over-written`,
        severity: 'major',
        suggestedFix: 'Trim exposition and redundant beats; reduce to the scene\'s essential dramatic moment',
      });
    }

    // Scene is <30% of average and is a turning point — too compressed
    if (lineCount < avgLength * 0.3 && (ann.revelation || record.clockRaised)) {
      issues.push({
        location: `Scene ${sceneIdx} (${record.slug})`,
        rule: 'COMPRESSED_TURNING_POINT',
        description: `Scene ${sceneIdx} is a turning point but only ${lineCount} lines (very short) — the moment may not land`,
        severity: 'major',
        suggestedFix: 'Expand this key scene with more character reaction and consequence before moving on',
      });
    }
  }

  // ── Act-level pacing: Act 1 too long, Act 3 too short ────────────────────
  const n = records.length;
  if (n >= 6) {
    const act1End = Math.floor(n * 0.25);
    const act3Start = Math.floor(n * 0.75);

    const act1Lines = Array.from({ length: act1End }, (_, i) => sceneLengths.get(i) ?? 0).reduce((s, v) => s + v, 0);
    const act3Lines = Array.from({ length: n - act3Start }, (_, i) => sceneLengths.get(act3Start + i) ?? 0).reduce((s, v) => s + v, 0);
    const totalLines = lengths.reduce((s, v) => s + v, 0);
    if (totalLines === 0) return {
      pass: 'pacing', issues: [], revisedFountain: fountain, changed: false,
      summary: 'Pacing pass: all scenes are empty',
    };

    const act1Pct = act1Lines / totalLines;
    const act3Pct = act3Lines / totalLines;

    if (act1Pct > 0.4) {
      issues.push({
        location: 'Act 1 pacing',
        rule: 'ACT1_TOO_LONG',
        description: `Act 1 uses ${Math.round(act1Pct * 100)}% of total page count — setup dominates at the expense of conflict`,
        severity: 'major',
        suggestedFix: 'Trim Act 1 by cutting or compressing scenes that don\'t introduce conflict',
      });
    }

    if (act3Pct < 0.1 && structure.actPosition === 'act3') {
      issues.push({
        location: 'Act 3 pacing',
        rule: 'ACT3_TOO_SHORT',
        description: `Act 3 uses only ${Math.round(act3Pct * 100)}% of total page count — the resolution feels rushed`,
        severity: 'major',
        suggestedFix: 'Expand Act 3 with a proper denouement that honors the climax',
      });
    }
  }

  // ── Wave 143: Energy monotone & rhythm variety ────────────────────────────

  // ENERGY_MONOTONE: All scenes have similar line counts (±50% of average) →
  // screenplay has no pacing rhythm (no short punchy scenes, no long contemplative ones).
  // This creates a dull, uniform energy that bores the audience.
  const lineCountVariance = lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(lineCountVariance);
  const coefficientOfVariation = stdDev / avgLength;

  if (coefficientOfVariation < 0.35 && records.length >= 8) {
    // Low variation (<35%) means scenes are all similar length
    issues.push({
      location: 'Overall pacing',
      rule: 'ENERGY_MONOTONE',
      description: `Scene lengths are monotone: all scenes are ${Math.round(avgLength)} ±${Math.round(stdDev)} lines. There's no rhythm — no short punchy scenes, no long contemplative ones.`,
      severity: 'major',
      suggestedFix: 'Vary scene length dramatically: follow a 2-page scene with a 30-second beat, then a 5-page confrontation. Create pacing texture.',
    });
  }

  // RHYTHM_INVERSION: Plot peaks (highest suspense) occur at the beginning
  // or middle of the story, with low energy at the climax. The rhythm is inverted.
  if (records.length >= 5) {
    const firstThird = records.slice(0, Math.floor(records.length / 3));
    const lastThird = records.slice(Math.floor(records.length * 2 / 3));

    const firstThirdMaxSuspense = Math.max(...firstThird.map(r => r.suspenseDelta), 0);
    const lastThirdAvgSuspense = lastThird.length > 0
      ? lastThird.reduce((s, r) => s + r.suspenseDelta, 0) / lastThird.length
      : 0;

    if (firstThirdMaxSuspense > 3 && lastThirdAvgSuspense < 1.5) {
      issues.push({
        location: 'Story rhythm',
        rule: 'RHYTHM_INVERSION',
        description: `Story's highest energy (suspense > 3) occurs in the opening third, but the final act has low average suspense (${lastThirdAvgSuspense.toFixed(1)}) — the climax is anticlimactic`,
        severity: 'critical',
        suggestedFix: 'Restructure so energy builds toward climax. Either reduce early peaks or amplify the final act to surpass the opening energy.',
      });
    }
  }

  // ENERGY_PLACEMENT_MISMATCH: High-energy scenes (suspense > 2.5) are scattered
  // without building toward climax. Energy should cluster near the end.
  if (records.length >= 8) {
    const highEnergyScenes = records
      .map((r, i) => ({ idx: i, suspense: r.suspenseDelta }))
      .filter(s => s.suspense > 2.5);

    if (highEnergyScenes.length >= 2) {
      const lastHalf = records.length / 2;
      const inLastHalf = highEnergyScenes.filter(s => s.idx >= lastHalf).length;
      const ratio = inLastHalf / highEnergyScenes.length;

      // If fewer than 60% of high-energy scenes are in the second half, placement is bad
      if (ratio < 0.6) {
        const clustered = Math.round(ratio * 100);
        issues.push({
          location: 'Energy distribution',
          rule: 'ENERGY_PLACEMENT_MISMATCH',
          description: `Only ${clustered}% of high-energy scenes (${inLastHalf}/${highEnergyScenes.length}) occur in the second half — energy peaks are scattered early, not building toward climax`,
          severity: 'major',
          suggestedFix: 'Move or amplify high-energy scenes to occur after the midpoint. The story should accelerate toward, not away from, the climax.',
        });
      }
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'pacing', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'pacing',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Pacing pass: scene lengths are balanced'
      : `Pacing pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
