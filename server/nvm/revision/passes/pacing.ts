// Wave 39 — Pass 9: Pacing
// Checks scene length balance: scenes that are too long for their dramatic
// purpose, scenes that are too short to land, act-level pacing imbalance.
// Wave 143 additions: energy monotone (scenes all the same energy level),
// rhythm variety (scenes lack alternating fast/slow pacing), and energy timing
// (high-energy scenes placed where they won't impact story).
// Wave 157 additions: climax scene underweight (peak Act 3 scene given fewer
// lines than average), midpoint collapse (midpoint scene is too brief and flat
// to function as structural pivot), resolution too brief (final scene ends
// before the audience can experience the emotional release).

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

  // ── Wave 157: Climax underweight, midpoint collapse, resolution brevity ──────

  // CLIMAX_SCENE_UNDERWEIGHT: The Act 3 peak-suspense scene is shorter than 70%
  // of average — the most important scene in the story is given less physical
  // space than a setup scene. Emotional weight requires proportional page space.
  if (records.length >= 6) {
    const climaxZoneStart = Math.floor(records.length * 0.7);
    let climaxSceneIdx = -1;
    let maxClimaxSuspense = -Infinity;
    for (let i = climaxZoneStart; i < records.length; i++) {
      if (records[i].suspenseDelta > maxClimaxSuspense) {
        maxClimaxSuspense = records[i].suspenseDelta;
        climaxSceneIdx = i;
      }
    }
    if (climaxSceneIdx >= 0 && maxClimaxSuspense > 1.5) {
      const climaxLines = sceneLengths.get(climaxSceneIdx) ?? 0;
      if (climaxLines > 0 && climaxLines < avgLength * 0.7) {
        issues.push({
          location: `Scene ${climaxSceneIdx} (climax, peak suspense ${maxClimaxSuspense.toFixed(1)})`,
          rule: 'CLIMAX_SCENE_UNDERWEIGHT',
          description: `The climax scene (Scene ${climaxSceneIdx}) is only ${climaxLines} lines — ${Math.round(climaxLines / avgLength * 100)}% of the story average. The most emotionally significant scene in the story is given less space than a setup scene.`,
          severity: 'major',
          suggestedFix: 'Expand the climax with physical staging, character reaction, and immediate consequence. The audience needs time to experience the weight of the moment before the story moves on.',
        });
      }
    }
  }

  // MIDPOINT_COLLAPSE: The midpoint scene is shorter than 50% of average AND
  // has low suspense — there is no structural pivot. The midpoint should feel
  // like a gear-shift; when it's collapsed, Act 2a and Act 2b blur together.
  if (records.length >= 8) {
    const midIdx = Math.floor(records.length / 2);
    const midLines = sceneLengths.get(midIdx) ?? 0;
    if (midLines > 0 && midLines < avgLength * 0.5 && records[midIdx].suspenseDelta < 2) {
      issues.push({
        location: `Scene ${midIdx} (midpoint)`,
        rule: 'MIDPOINT_COLLAPSE',
        description: `The midpoint scene (Scene ${midIdx}) is only ${midLines} lines — ${Math.round(midLines / avgLength * 100)}% of average — with low suspense (${records[midIdx].suspenseDelta.toFixed(1)}). The structural pivot of the story is physically underdeveloped.`,
        severity: 'major',
        suggestedFix: 'Expand the midpoint with a substantial reversal or revelation. The midpoint should feel like a turning: the second half of Act 2 must be qualitatively different from the first.',
      });
    }
  }

  // RESOLUTION_TOO_BRIEF: The final scene (resolution/epilogue) is shorter than
  // 50% of average, leaving no room for emotional release or denouement. A story
  // that ends before it has time to breathe denies the audience the release they
  // were building toward.
  if (records.length >= 6) {
    const lastSceneIdx = records.length - 1;
    const lastLines = sceneLengths.get(lastSceneIdx) ?? 0;
    const lastRecord = records[lastSceneIdx];
    const isResolutionScene = lastRecord &&
      (lastRecord.purpose === 'resolution' || lastRecord.suspenseDelta < 0);
    if (isResolutionScene && lastLines > 0 && lastLines < avgLength * 0.5) {
      issues.push({
        location: `Scene ${lastSceneIdx} (final/resolution)`,
        rule: 'RESOLUTION_TOO_BRIEF',
        description: `The final scene (Scene ${lastSceneIdx}) is only ${lastLines} lines — ${Math.round(lastLines / avgLength * 100)}% of average. The story ends before there is space for emotional release or denouement.`,
        severity: 'major',
        suggestedFix: 'Expand the final scene with character reactions, a moment of reflection, and a visual or physical image that earns the emotional release the story has been building toward.',
      });
    }
  }

  // ── Wave 172: Plateau, opening bloat, suspense/length decoupling ─────────────

  // PACING_PLATEAU: A run of 4+ consecutive scenes whose lengths sit within ±20%
  // of one another. Even when the global scene-length variance is healthy (so
  // ENERGY_MONOTONE stays quiet), a flat local stretch reads as a sag — four
  // scenes in a row at the same cadence with no acceleration or contraction.
  if (records.length >= 8) {
    const orderedLengths = Array.from({ length: records.length }, (_, i) => sceneLengths.get(i) ?? 0);
    for (let i = 0; i + 4 <= orderedLengths.length; i++) {
      const window = orderedLengths.slice(i, i + 4);
      const minLen = Math.min(...window);
      const maxLen = Math.max(...window);
      if (minLen > 0 && maxLen <= minLen * 1.2) {
        issues.push({
          location: `Scenes ${i}–${i + 3}`,
          rule: 'PACING_PLATEAU',
          description: `Scenes ${i}–${i + 3} all run within ±20% of the same length (${minLen}–${maxLen} lines) — a flat stretch with no acceleration or contraction. The cadence plateaus for four scenes in a row.`,
          severity: 'minor',
          suggestedFix: 'Break the plateau: hard-cut one of these scenes to a single beat, or expand another into a full set-piece. A run of same-length scenes reads as a monotone even when the rest of the script breathes.',
        });
        break; // one plateau report is enough
      }
    }
  }

  // OPENING_SCENE_BLOAT: The very first scene is more than 2x the story average.
  // A bloated opening makes the audience wait through setup before the engine
  // turns over — the hook arrives late. Distinct from OVERLONG_LOW_TENSION
  // (>2.5x), this catches a merely-overweight opener specifically.
  if (records.length >= 6) {
    const openingLen = sceneLengths.get(0) ?? 0;
    if (openingLen > 0 && openingLen > avgLength * 2 && openingLen <= avgLength * 2.5) {
      issues.push({
        location: `Scene 0 (${records[0]?.slug ?? 'opening'})`,
        rule: 'OPENING_SCENE_BLOAT',
        description: `The opening scene is ${openingLen} lines — ${Math.round(openingLen / avgLength * 100)}% of the story average. The story takes too long to get going before the central engine turns over.`,
        severity: 'minor',
        suggestedFix: 'Trim the opening to its sharpest entry point. Start as late into the scene as possible, cut throat-clearing setup, and let exposition arrive through later conflict rather than up front.',
      });
    }
  }

  // SUSPENSE_LENGTH_DECOUPLING: Page space is allocated inversely to dramatic
  // weight — multiple high-tension scenes are crammed below average length while
  // multiple low-tension scenes sprawl above it. Distinct from
  // CLIMAX_SCENE_UNDERWEIGHT (single climax scene), this catches a systemic
  // misallocation across the whole script.
  if (records.length >= 8) {
    const underweightHighTension = records.filter(
      (r, i) => r.suspenseDelta > 2.5 && (sceneLengths.get(i) ?? 0) > 0 && (sceneLengths.get(i) ?? 0) < avgLength,
    ).length;
    const overweightLowTension = records.filter(
      (r, i) => r.suspenseDelta < 1 && (sceneLengths.get(i) ?? 0) > avgLength,
    ).length;
    if (underweightHighTension >= 2 && overweightLowTension >= 2) {
      issues.push({
        location: 'Page-space allocation',
        rule: 'SUSPENSE_LENGTH_DECOUPLING',
        description: `Page space is decoupled from drama: ${underweightHighTension} high-tension scenes run below average length while ${overweightLowTension} low-tension scenes run above it. The script spends its pages on its quietest moments and rushes its loudest.`,
        severity: 'major',
        suggestedFix: 'Reallocate page space toward dramatic weight: expand the high-tension scenes with staging, reaction, and consequence; compress the low-tension scenes to their essential function.',
      });
    }
  }

  // ── Wave 189: Velocity drop, climax runway, resolution bloat ─────────────

  // SCENE_VELOCITY_DROP: The average scene length in the second half exceeds the
  // first-half average by more than 30%. A story that gets slower as stakes rise
  // deprives the climax of kinetic energy — the screenplay should tighten, not expand.
  if (records.length >= 8) {
    const halfIdx = Math.floor(records.length / 2);
    let firstHalfSum = 0;
    for (let i = 0; i < halfIdx; i++) firstHalfSum += sceneLengths.get(i) ?? 0;
    let secondHalfSum = 0;
    for (let i = halfIdx; i < records.length; i++) secondHalfSum += sceneLengths.get(i) ?? 0;
    const avgFirstHalf = firstHalfSum / halfIdx;
    const avgSecondHalf = secondHalfSum / (records.length - halfIdx);
    if (avgFirstHalf > 0 && avgSecondHalf > avgFirstHalf * 1.3) {
      issues.push({
        location: 'Scene velocity',
        rule: 'SCENE_VELOCITY_DROP',
        severity: 'minor',
        description: `The second half averages ${Math.round(avgSecondHalf)} lines per scene vs ${Math.round(avgFirstHalf)} in the first half — the story decelerates toward the climax instead of accelerating.`,
        suggestedFix: 'Trim scenes in the second half to tighten the approach to climax. The story should accelerate as stakes rise, not expand and dilate.',
      });
    }
  }

  // CLIMAX_RUNWAY_OVERLONG: The three scenes immediately before the Act 3 climax peak
  // are all above average length — the screenplay lingers in the approach rather than
  // snapping into the climax. A long runway dilutes urgency.
  if (records.length >= 8) {
    const climaxPeakZoneStart = Math.floor(records.length * 0.75);
    let climaxPeakIdx = -1;
    let maxClimaxPeak = -Infinity;
    for (let i = climaxPeakZoneStart; i < records.length; i++) {
      if (records[i].suspenseDelta > maxClimaxPeak) {
        maxClimaxPeak = records[i].suspenseDelta;
        climaxPeakIdx = i;
      }
    }
    if (climaxPeakIdx >= 3) {
      const runwayLens = [
        sceneLengths.get(climaxPeakIdx - 3) ?? 0,
        sceneLengths.get(climaxPeakIdx - 2) ?? 0,
        sceneLengths.get(climaxPeakIdx - 1) ?? 0,
      ];
      if (runwayLens.every(l => l > avgLength)) {
        issues.push({
          location: `Scenes ${climaxPeakIdx - 3}–${climaxPeakIdx - 1} (climax runway)`,
          rule: 'CLIMAX_RUNWAY_OVERLONG',
          severity: 'minor',
          description: `The three scenes before the climax (Scenes ${climaxPeakIdx - 3}–${climaxPeakIdx - 1}) are all above average length — the approach to the climax sprawls rather than snapping.`,
          suggestedFix: 'Cut at least one pre-climax scene to a sharp, punchy beat. The runway should tighten, not sprawl.',
        });
      }
    }
  }

  // RESOLUTION_SCENE_BLOAT: The final two scenes are both above average length and
  // both low-tension — the denouement lingers beyond its emotional function.
  // A tight resolution lands harder than an extended one.
  if (records.length >= 6) {
    const lastTwoIdx = records.length - 1;
    const secondToLastIdx = records.length - 2;
    const lastTwoLen = sceneLengths.get(lastTwoIdx) ?? 0;
    const secondToLastLen = sceneLengths.get(secondToLastIdx) ?? 0;
    if (
      lastTwoLen > 0 && secondToLastLen > 0 &&
      lastTwoLen > avgLength && secondToLastLen > avgLength &&
      records[lastTwoIdx].suspenseDelta < 1.5 &&
      records[secondToLastIdx].suspenseDelta < 1.5
    ) {
      issues.push({
        location: `Scenes ${secondToLastIdx}–${lastTwoIdx} (resolution)`,
        rule: 'RESOLUTION_SCENE_BLOAT',
        severity: 'minor',
        description: `The final two scenes (Scenes ${secondToLastIdx}–${lastTwoIdx}) are both above average length and both low-tension — the resolution drags rather than releasing.`,
        suggestedFix: 'Trim the resolution to its essential emotional beats. A tight denouement lands harder than an extended one.',
      });
    }
  }

  // ── Wave 200: Compression spiral, Act 2 dead weight, late expansion ─────────

  // SCENE_COMPRESSION_SPIRAL: Five consecutive scenes each shorter than the
  // previous — a spiral that depletes page space before the climax. Even when
  // global variance is healthy, a sustained unbroken compression run strands
  // the story below the line-count floor it needs to land the climax.
  if (records.length >= 8) {
    const orderedLens200 = Array.from({ length: records.length }, (_, i) => sceneLengths.get(i) ?? 0);
    let spiralStart = -1;
    for (let i = 0; i + 4 < orderedLens200.length; i++) {
      if (
        orderedLens200[i] > 0 &&
        orderedLens200[i + 1] < orderedLens200[i] &&
        orderedLens200[i + 2] < orderedLens200[i + 1] &&
        orderedLens200[i + 3] < orderedLens200[i + 2] &&
        orderedLens200[i + 4] < orderedLens200[i + 3]
      ) {
        spiralStart = i;
        break;
      }
    }
    if (spiralStart >= 0) {
      issues.push({
        location: `Scenes ${spiralStart}–${spiralStart + 4}`,
        rule: 'SCENE_COMPRESSION_SPIRAL',
        severity: 'major',
        description: `Scenes ${spiralStart}–${spiralStart + 4} are each shorter than the last — a five-scene compression spiral that depletes page space before the climax. The story has no recovery or re-expansion within this run.`,
        suggestedFix: 'Break the spiral by expanding at least one mid-sequence scene with a set-piece, confrontation, or character beat. The story needs room to breathe before the climax.',
      });
    }
  }

  // ACT2_DEAD_WEIGHT: Three or more Act 2 scenes that are both below average
  // length and dramatically inert — no revelation, no rising tension, no
  // relationship shift. These scenes pad runtime without advancing story; the
  // audience feels the story idling at the moment it should be escalating.
  if (records.length >= 8) {
    const act2DwStart = Math.floor(records.length * 0.25);
    const act2DwEnd = Math.floor(records.length * 0.75);
    let deadWeightCount = 0;
    for (let i = act2DwStart; i < act2DwEnd; i++) {
      const r = records[i];
      const lineLen = sceneLengths.get(i) ?? 0;
      if (
        lineLen > 0 && lineLen < avgLength &&
        r.revelation === null &&
        !r.clockRaised &&
        r.suspenseDelta < 1 &&
        (r.relationshipShifts ?? []).every((s: any) => Math.abs(s.amount) < 0.3)
      ) {
        deadWeightCount++;
      }
    }
    if (deadWeightCount >= 3) {
      issues.push({
        location: `Act 2 (scenes ${act2DwStart}–${act2DwEnd - 1})`,
        rule: 'ACT2_DEAD_WEIGHT',
        severity: 'major',
        description: `${deadWeightCount} Act 2 scenes are both below average length and dramatically empty — no revelation, no rising tension, no relationship shift. These scenes pad runtime without advancing the story.`,
        suggestedFix: 'Either cut these scenes or inject a dramatic event into each: a revelation, a rising tension beat, or a meaningful character shift. Every Act 2 scene must change something.',
      });
    }
  }

  // LATE_EXPANSION: Act 3 average scene length exceeds Act 2 average by more
  // than 15%. As stakes reach their peak, scenes should compress, not expand.
  // A late expansion dissipates the urgency built through Act 2 and makes the
  // climax feel padded rather than inevitable.
  if (records.length >= 8) {
    const act2LeStart = Math.floor(records.length * 0.25);
    const act3LeStart = Math.floor(records.length * 0.75);
    const act2LeRecs = records.slice(act2LeStart, act3LeStart);
    const act3LeRecs = records.slice(act3LeStart);
    if (act2LeRecs.length >= 2 && act3LeRecs.length >= 2) {
      const avgAct2Le = act2LeRecs.reduce((s, _, i) => s + (sceneLengths.get(act2LeStart + i) ?? 0), 0) / act2LeRecs.length;
      const avgAct3Le = act3LeRecs.reduce((s, _, i) => s + (sceneLengths.get(act3LeStart + i) ?? 0), 0) / act3LeRecs.length;
      if (avgAct2Le > 0 && avgAct3Le > avgAct2Le * 1.15) {
        issues.push({
          location: 'Act 2 vs Act 3 pacing',
          rule: 'LATE_EXPANSION',
          severity: 'minor',
          description: `Act 3 averages ${Math.round(avgAct3Le)} lines per scene vs ${Math.round(avgAct2Le)} in Act 2 — the story expands when it should contract. A late expansion dissipates the urgency built through Act 2.`,
          suggestedFix: 'Tighten Act 3 scenes as stakes peak. Reserve expansion only for the climax itself, then snap into a lean denouement.',
        });
      }
    }
  }

  // ── Wave 218: Pacing signal-processing — trend slope, distribution inequality,
  //    oscillation rate. Three orthogonal measures of the whole scene-length sequence
  //    that variance and act-average comparisons cannot capture. ──
  if (records.length >= 8) {
    const orderedLens218 = Array.from({ length: records.length }, (_, i) => sceneLengths.get(i) ?? 0);
    const n218 = orderedLens218.length;

    // PACE_DECELERATION_TREND (major): the least-squares slope of scene length against
    // scene index, normalised by average length, is positive beyond 6% per scene — the
    // story systematically lengthens its scenes across the WHOLE arc. Distinct from
    // LATE_EXPANSION (which compares Act 2 vs Act 3 averages): a global upward trend can
    // exist even when the act averages look similar. As stakes rise scenes should quicken.
    {
      const meanIdx218 = (n218 - 1) / 2;
      let cov218 = 0, varIdx218 = 0;
      for (let i = 0; i < n218; i++) {
        cov218 += (i - meanIdx218) * (orderedLens218[i] - avgLength);
        varIdx218 += (i - meanIdx218) ** 2;
      }
      const slope218 = varIdx218 > 0 ? cov218 / varIdx218 : 0;
      const slopeNorm218 = slope218 / avgLength;
      if (slopeNorm218 > 0.06) {
        issues.push({
          location: 'Whole-story pacing trend',
          rule: 'PACE_DECELERATION_TREND',
          severity: 'major',
          description: `Scene length trends upward across the entire story (normalised slope +${(slopeNorm218 * 100).toFixed(0)}% of average per scene) — the pace systematically decelerates as the story advances. Scenes should quicken toward the climax, not stretch; a rising length trend bleeds urgency out of the back half.`,
          suggestedFix: 'Reverse the trend: tighten later scenes so the average scene gets shorter as stakes rise. The audience should feel the cutting accelerate toward the climax — the scene-length curve is one of the strongest implicit signals of momentum.',
        });
      }
    }

    // PAGE_SPACE_INEQUALITY (minor): the Gini coefficient of scene lengths exceeds 0.5 —
    // a few scenes hoard most of the page space while the rest are starved. The story
    // budgets its runtime unevenly, which reads as a handful of set-pieces stranded among
    // undernourished connective scenes. A distribution measure, orthogonal to variance.
    {
      let absDiffSum218 = 0;
      for (let i = 0; i < n218; i++) {
        for (let j = 0; j < n218; j++) absDiffSum218 += Math.abs(orderedLens218[i] - orderedLens218[j]);
      }
      const gini218 = avgLength > 0 ? absDiffSum218 / (2 * n218 * n218 * avgLength) : 0;
      if (gini218 > 0.5) {
        issues.push({
          location: 'Page-space distribution',
          rule: 'PAGE_SPACE_INEQUALITY',
          severity: 'minor',
          description: `Scene lengths have a Gini coefficient of ${gini218.toFixed(2)} — page space is concentrated in a few scenes while the rest are starved. The story spends its runtime unevenly, reading as a handful of bloated set-pieces among undernourished connective tissue.`,
          suggestedFix: 'Redistribute page space: trim the dominant scenes and give the starved ones enough room to land their beat. A healthier length distribution keeps the audience from feeling the story lurch between feast and famine.',
        });
      }
    }

    // RHYTHMIC_ALTERNATION_ABSENT (minor): scene lengths cross their own mean in fewer
    // than 25% of transitions — the pacing stays on one side of the average for long
    // stretches (a block of long scenes, then a block of short) instead of alternating
    // breath and sprint. Distinct from ENERGY_MONOTONE (low variance): a story can have
    // large length swings yet still fail to ALTERNATE, sitting high then sitting low.
    {
      let crossings218 = 0, transitions218 = 0;
      let prevSign218 = 0;
      for (let i = 0; i < n218; i++) {
        const sign218 = orderedLens218[i] > avgLength ? 1 : orderedLens218[i] < avgLength ? -1 : 0;
        if (sign218 !== 0) {
          if (prevSign218 !== 0) {
            transitions218++;
            if (sign218 !== prevSign218) crossings218++;
          }
          prevSign218 = sign218;
        }
      }
      const crossRate218 = transitions218 > 0 ? crossings218 / transitions218 : 1;
      if (transitions218 >= 6 && crossRate218 < 0.25) {
        issues.push({
          location: 'Pacing rhythm',
          rule: 'RHYTHMIC_ALTERNATION_ABSENT',
          severity: 'minor',
          description: `Scene lengths cross their average in only ${Math.round(crossRate218 * 100)}% of transitions — the pacing sits on one side of the mean for long stretches (a block of long scenes, then a block of short) rather than alternating. Even with large swings, the rhythm never breathes in and out.`,
          suggestedFix: 'Interleave long and short scenes rather than grouping them: follow an expansive scene with a clipped one and vice versa. Rhythmic pacing comes from frequent alternation around the mean, not from one long deceleration or acceleration.',
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
