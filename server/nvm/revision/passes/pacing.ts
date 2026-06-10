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
// Wave 260 additions: opening scene bloat (overlong first scene), Act 1 overextended
// (setup hogs >40% of pages), short-scene flood (>60% of scenes undersized).
// Wave 274 additions: Act 3 page overrun (climax act >35% of total pages),
// long-scene flood (>50% of scenes above 1.5× average), Act 2 page weight
// (middle act <40% of total pages — underweight complication zone).
// Wave 288 additions: suspense early peak (Act 1 avg suspense > Act 3 avg and Act 3 ≤ 0),
// curiosity final drop (avg curiosityDelta in final quarter ≤ 0 while overall is positive),
// curiosity opening flatline (opening avg curiosityDelta ≤ 0 — hook absent).

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

  // ── Wave 232: Pacing spike scene, peak length misplaced, act-transition jolt ──

  // PACING_SPIKE_SCENE (major, n≥6): A single scene is ≥2.5× the average scene
  // length, dominating the story's page space like a structural monster. Distinct
  // from LONG_SCENE (which fires per scene beyond a relative threshold) and
  // PAGE_SPACE_INEQUALITY (global distribution) — this fires specifically when one
  // scene's length is more than 2.5× the average, creating an extreme outlier.
  if (records.length >= 6 && avgLength > 0) {
    let spikeIdx232 = -1;
    let spikeLen232 = 0;
    for (let i = 0; i < records.length; i++) {
      const len = sceneLengths.get(i) ?? 0;
      if (len > spikeLen232) { spikeLen232 = len; spikeIdx232 = i; }
    }
    if (spikeIdx232 >= 0 && spikeLen232 >= 2.5 * avgLength) {
      issues.push({
        location: `Scene ${spikeIdx232} (${records[spikeIdx232]?.slug ?? ''})`,
        rule: 'PACING_SPIKE_SCENE',
        severity: 'major',
        description: `Scene ${spikeIdx232} is ${spikeLen232} weighted lines — ${(spikeLen232 / avgLength).toFixed(1)}× the story average (${Math.round(avgLength)}). One scene dominates the story's page space, creating a structural imbalance where all surrounding scenes are dwarfed by a single set-piece.`,
        suggestedFix: 'Break the oversized scene into 2-3 shorter ones, or trim it down to match the surrounding density. A pacing spike signals a scene that was never edited — every scene should earn its length relative to its dramatic weight.',
      });
    }
  }

  // PEAK_LENGTH_MISPLACED (minor, n≥8): The story's longest scene is in Act 1
  // (first 25%) — the most expansive moment front-loads the setup rather than
  // the climax. Scene length signals importance to the audience; the opening
  // should be lean and propulsive, not the most expensive real estate in the script.
  if (records.length >= 8 && avgLength > 0) {
    const act1EndPk232 = Math.floor(records.length * 0.25);
    let maxLen232 = 0;
    let maxIdx232 = -1;
    for (let i = 0; i < records.length; i++) {
      const len = sceneLengths.get(i) ?? 0;
      if (len > maxLen232) { maxLen232 = len; maxIdx232 = i; }
    }
    if (maxIdx232 >= 0 && maxIdx232 < act1EndPk232 && maxLen232 >= avgLength * 1.5) {
      issues.push({
        location: `Scene ${maxIdx232} (${records[maxIdx232]?.slug ?? ''})`,
        rule: 'PEAK_LENGTH_MISPLACED',
        severity: 'minor',
        description: `The story's longest scene (Scene ${maxIdx232}, ${maxLen232} lines, ${(maxLen232 / avgLength).toFixed(1)}× avg) is in Act 1 (first 25%). The most expansive real estate is in the setup rather than the climax — opening scenes should be crisp and propulsive, not the story's structural crown.`,
        suggestedFix: 'Trim the Act 1 scene to its essentials, then expand the climax zone with the reclaimed page space. The longest scene should be where the stakes are highest, not where the world is being introduced.',
      });
    }
  }

  // ACT_TRANSITION_JOLT (minor, n≥8): The scene immediately crossing an act
  // boundary (Act 1→2 at 25%, or Act 2→3 at 75%) changes in length by more than
  // 1.5× the average — a step-change in pacing at the structural seam. Gear shifts
  // at act transitions should be gradual; a sudden jump or drop at the act line
  // signals a tonal splice rather than a deliberate structural transition.
  if (records.length >= 8 && avgLength > 0) {
    const joltThreshold232 = avgLength * 1.5;
    const actBoundaries232 = [
      Math.floor(records.length * 0.25),
      Math.floor(records.length * 0.75),
    ];
    for (const boundary232 of actBoundaries232) {
      if (boundary232 <= 0 || boundary232 >= records.length) continue;
      const lenBefore = sceneLengths.get(boundary232 - 1) ?? 0;
      const lenAfter = sceneLengths.get(boundary232) ?? 0;
      if (lenBefore > 0 && lenAfter > 0) {
        const delta232 = Math.abs(lenAfter - lenBefore);
        if (delta232 >= joltThreshold232) {
          const dir232 = lenAfter > lenBefore ? 'expands' : 'contracts';
          issues.push({
            location: `Act boundary (Scene ${boundary232 - 1} → ${boundary232})`,
            rule: 'ACT_TRANSITION_JOLT',
            severity: 'minor',
            description: `At the act boundary (Scene ${boundary232 - 1} to ${boundary232}) the scene length ${dir232} by ${delta232.toFixed(0)} lines — a sudden step-change of ${(delta232 / avgLength).toFixed(1)}× the average. Act transitions should shift gear gradually; a pacing jolt at the structural seam reads as a tonal splice rather than a deliberate transition.`,
            suggestedFix: 'Smooth the transition: add a bridging scene at similar length to the crossing point, or compress the discrepancy across 2-3 scenes rather than one step. Act transitions should feel like a gear shift, not a gear break.',
          });
          break; // one flag per pass
        }
      }
    }
  }
  // ── Wave 246: Act 2 pacing valley, climax scene undersized, midpoint bloat ──

  // ACT2_PACING_VALLEY (minor, n≥10): Three or more consecutive Act 2 scenes
  // (25%–75% window) are each below 60% of the average scene length — a sustained
  // compression valley in the story's middle. Unlike RESOLUTION_BREVITY (end-only)
  // and pacing compression spiral (overall trend), this fires when a localized
  // compression pocket appears mid-story, suggesting a sequence of scenes that
  // were under-written or collapsed into narrative shorthand.
  if (records.length >= 10 && avgLength > 0) {
    const act2Start246 = Math.floor(records.length * 0.25);
    const act2End246 = Math.floor(records.length * 0.75);
    const threshold246 = avgLength * 0.6;
    let streak246 = 0;
    let streakStart246 = -1;
    for (let i = act2Start246; i < act2End246; i++) {
      const len246 = sceneLengths.get(i) ?? 0;
      if (len246 > 0 && len246 < threshold246) {
        if (streak246 === 0) streakStart246 = i;
        streak246++;
        if (streak246 >= 3) {
          issues.push({
            location: `Act 2 valley (Scenes ${streakStart246}–${i})`,
            rule: 'ACT2_PACING_VALLEY',
            severity: 'minor',
            description: `Scenes ${streakStart246}–${i} (Act 2) are each below 60% of the average scene length (avg ${Math.round(avgLength)} lines) — a sustained compression valley in the story's middle. Three or more consecutive under-written scenes create a pacing trough where the story loses physical presence.`,
            suggestedFix: 'Expand at least one of the valley scenes with a concrete dramatic beat: a new complication, a character reaction, or a piece of world detail. Compression pockets in Act 2 are where narrative momentum quietly dies — the story needs something to sustain forward pull here.',
          });
          break;
        }
      } else {
        streak246 = 0;
      }
    }
  }

  // CLIMAX_SCENE_UNDERSIZED (minor, n≥8): The scene with the story's peak
  // suspense (highest suspenseDelta across all records) is in the bottom 30%
  // of all scene lengths — the most intense moment is among the shortest scenes.
  // The climax should be the most substantial scene on the page; an undersized
  // climax delivers maximum tension in minimum space, spending the story's most
  // charged moment in a flash rather than giving it room to breathe.
  if (records.length >= 8 && avgLength > 0) {
    let peakIdx246 = 0;
    let peakDelta246 = -Infinity;
    for (let i = 0; i < records.length; i++) {
      if (records[i].suspenseDelta > peakDelta246) {
        peakDelta246 = records[i].suspenseDelta;
        peakIdx246 = i;
      }
    }
    if (peakDelta246 > 1) {
      const peakLen246 = sceneLengths.get(peakIdx246) ?? 0;
      const sortedLens246 = [...lengths].sort((a, b) => a - b);
      const p30246 = sortedLens246[Math.floor(sortedLens246.length * 0.3)] ?? 0;
      if (peakLen246 > 0 && peakLen246 <= p30246) {
        issues.push({
          location: `Scene ${peakIdx246} (peak suspense, ${peakLen246} lines)`,
          rule: 'CLIMAX_SCENE_UNDERSIZED',
          severity: 'minor',
          description: `The story's peak suspense scene (Scene ${peakIdx246}, suspenseDelta ${peakDelta246.toFixed(1)}) is ${peakLen246} lines — in the bottom 30% of all scene lengths. The most intense moment is among the shortest. The climax deserves the most space; an undersized peak scene spends the story's central dramatic charge in a flash.`,
          suggestedFix: 'Expand the climax scene: more character reaction, more physical consequence, more time inside the highest-stakes moment. The scene that carries the story\'s maximum tension should feel weightier than the setup scenes surrounding it — let the audience live in the peak longer.',
        });
      }
    }
  }

  // MIDPOINT_BLOAT (minor, n≥8): The scene closest to the story's structural
  // midpoint (50%) is ≥2.5× the average scene length. The pivot scene is the
  // story's most expensive real estate — an oversized midpoint signals a
  // "pivot dump," where the reversal is over-written rather than landing cleanly.
  // Distinct from PACING_SPIKE_SCENE (any scene ≥2.5× avg) — this fires
  // specifically when the bloated scene is at the story's structural midpoint.
  if (records.length >= 8 && avgLength > 0) {
    const midIdx246 = Math.floor(records.length * 0.5);
    const midLen246 = sceneLengths.get(midIdx246) ?? 0;
    if (midLen246 >= 2.5 * avgLength) {
      issues.push({
        location: `Scene ${midIdx246} (structural midpoint, ${midLen246} lines)`,
        rule: 'MIDPOINT_BLOAT',
        severity: 'minor',
        description: `The structural midpoint scene (Scene ${midIdx246}) is ${midLen246} lines — ${(midLen246 / avgLength).toFixed(1)}× the story average (${Math.round(avgLength)}). An oversized midpoint signals a "pivot dump": the reversal is over-explained rather than landing with the velocity a structural pivot requires.`,
        suggestedFix: 'Trim the midpoint scene to its essential reversal. The moment where the story\'s direction changes should feel clean and inevitable — not exhaustive. What you remove from the midpoint goes into building the climax instead.',
      });
    }
  }
  // ── End Wave 246 ─────────────────────────────────────────────────────────────

  // ── End Wave 232 ─────────────────────────────────────────────────────────────

  // ── Wave 260: Opening scene bloat, Act 1 overextended, short-scene flood ──

  // OPENING_SCENE_BLOAT (minor, n≥8): The first scene (Scene 0) is ≥2.5× the
  // average scene length — an overlong opening. The first scene must hook fast and
  // earn the audience's attention before spending it; a bloated opener front-loads
  // setup and atmosphere before anyone is invested. Distinct from MIDPOINT_BLOAT
  // (structural midpoint) and PACING_SPIKE_SCENE (any scene); this isolates the
  // first-impression scene, where overlength is most costly.
  if (records.length >= 8) {
    const openLen260 = sceneLengths.get(0) ?? 0;
    if (openLen260 >= 2.5 * avgLength) {
      issues.push({
        location: `Scene 0 (opening, ${openLen260} lines)`,
        rule: 'OPENING_SCENE_BLOAT',
        severity: 'minor',
        description: `The opening scene is ${openLen260} lines — ${(openLen260 / avgLength).toFixed(1)}× the story average (${Math.round(avgLength)}). An overlong first scene front-loads setup and atmosphere before the audience is invested. The opening must hook fast: it earns attention before it can spend it.`,
        suggestedFix: 'Trim the opening to its sharpest hook. Start as late into the first scene as possible, cut throat-clearing exposition, and let the world reveal itself across later scenes. The first scene is a promise, not an encyclopedia.',
      });
    }
  }

  // ACT1_OVEREXTENDED (minor, n≥10): Act 1 (first 25% of scenes) consumes more
  // than 40% of the script's total line count — the setup act hogs the page and
  // delays the inciting incident and Act 2. A proportionally oversized Act 1 means
  // the audience waits too long for the story to actually start. Distinct from the
  // per-scene bloat checks; this is a zone-aggregate page-budget measure.
  if (records.length >= 10) {
    const act1End260 = Math.floor(records.length * 0.25);
    if (act1End260 >= 2) {
      let act1Lines260 = 0;
      let totalLines260 = 0;
      for (const [idx, len] of sceneLengths) {
        totalLines260 += len;
        if (idx < act1End260) act1Lines260 += len;
      }
      const act1Ratio260 = totalLines260 > 0 ? act1Lines260 / totalLines260 : 0;
      if (act1Ratio260 > 0.4) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End260 - 1}) — page budget`,
          rule: 'ACT1_OVEREXTENDED',
          severity: 'minor',
          description: `Act 1 (the first ${act1End260} of ${records.length} scenes) consumes ${Math.round(act1Ratio260 * 100)}% of the script's total lines — the setup act hogs the page and delays the inciting incident. The audience waits too long for the story to actually begin while Act 1 over-establishes.`,
          suggestedFix: 'Compress the setup. Move exposition into later scenes where it can ride on action, and bring the inciting incident forward. Act 1 should be the leanest act — enough to establish the world and the want, then straight into complication.',
        });
      }
    }
  }

  // SHORT_SCENE_FLOOD (minor, n≥10): More than 60% of scenes run below 60% of the
  // average length — the story is dominated by undersized scenes and reads as choppy,
  // fragmentary, never settling into a beat. (The few longer scenes pull the average
  // up, so a majority falling well below it signals a script of fragments punctuated
  // by occasional set-pieces.) Distinct from ACT2_PACING_VALLEY (a local consecutive
  // run) and PAGE_SPACE_INEQUALITY (Gini concentration); this is a global proportion
  // of starved scenes.
  if (records.length >= 10) {
    const shortThreshold260 = avgLength * 0.6;
    let shortCount260 = 0;
    for (const len of lengths) {
      if (len > 0 && len < shortThreshold260) shortCount260++;
    }
    const shortRatio260 = shortCount260 / lengths.length;
    if (shortRatio260 > 0.6) {
      issues.push({
        location: 'Scene-length distribution',
        rule: 'SHORT_SCENE_FLOOD',
        severity: 'minor',
        description: `${shortCount260} of ${lengths.length} scenes (${Math.round(shortRatio260 * 100)}%) run below 60% of the average length — the story is dominated by undersized scenes. The script reads as choppy and fragmentary, a stream of fragments punctuated by a few set-pieces, never settling long enough for a beat to develop.`,
        suggestedFix: 'Consolidate fragments: merge adjacent micro-scenes that share a location or beat, and let the surviving scenes breathe. A few of the short scenes are surely doing real work — invest the page space there instead of scattering it across many thin ones.',
      });
    }
  }

  // ── Wave 274: ACT3_PAGE_OVERRUN ───────────────────────────────────────────
  // Act 3 (final 25%) consumes more than 35% of the script's total weighted
  // line count. The climax act is overlong: it takes more page space than the
  // final act typically earns. A bloated Act 3 often means the resolution
  // lingers too long after the climactic confrontation — the audience watches
  // the protagonist process victory/defeat in real time rather than having the
  // story land its final note and end. Distinct from CLIMAX_SCENE_UNDERSIZED
  // (one scene); this is a zone-level budget measure.
  // Requires 8+ records.
  if (records.length >= 8) {
    const act3Start274 = Math.floor(records.length * 0.75);
    let act3Lines274 = 0;
    let totalLines274 = 0;
    for (const [idx, len] of sceneLengths) {
      totalLines274 += len;
      if (idx >= act3Start274) act3Lines274 += len;
    }
    const act3Ratio274 = totalLines274 > 0 ? act3Lines274 / totalLines274 : 0;
    if (act3Ratio274 > 0.35) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start274}–${records.length - 1}) — page budget`,
        rule: 'ACT3_PAGE_OVERRUN',
        severity: 'minor',
        description: `Act 3 (Scenes ${act3Start274}–${records.length - 1}) consumes ${Math.round(act3Ratio274 * 100)}% of total script pages — more than the final act should need. A bloated Act 3 means the resolution lingers: the story keeps spending pages after its dramatic question is answered, and the audience watches denouement instead of experiencing release.`,
        suggestedFix: 'Compress the resolution. Land the climax, pay its immediate emotional cost in one or two scenes, and end. Every page after the story\'s question is answered is a page the audience is waiting to leave. Act 3 should be the leanest act, not the longest.',
      });
    }
  }

  // ── Wave 274: LONG_SCENE_FLOOD ─────────────────────────────────────────────
  // More than 50% of scenes are over 1.5× the average length — the script is
  // dominated by oversized scenes with no brevity to provide contrast or pace
  // changes. Effective scripts alternate scene lengths: short scenes create
  // urgency and momentum while long scenes develop atmosphere and character.
  // A script where most scenes are long reads as monolithic and slow regardless
  // of how active the content is. The mirror of SHORT_SCENE_FLOOD.
  // Requires 8+ records.
  if (records.length >= 8) {
    const longThreshold274 = avgLength * 1.5;
    const longCount274 = lengths.filter(l => l > longThreshold274).length;
    if (longCount274 / lengths.length > 0.50) {
      issues.push({
        location: 'Scene-length distribution',
        rule: 'LONG_SCENE_FLOOD',
        severity: 'minor',
        description: `${longCount274} of ${lengths.length} scenes (${Math.round(longCount274 / lengths.length * 100)}%) exceed 1.5× the average length — the script is dominated by oversized scenes. Without shorter scenes to create contrast and momentum, the pace becomes monolithic: no quick beats, no breathing room, every scene settling in for an extended stay.`,
        suggestedFix: 'Trim at least half the long scenes to a leaner core, and introduce some genuinely short scenes as pace changes. The contrast between a 2-line beat and a 20-line scene creates rhythm that neither alone can — you need brevity to make length feel substantial.',
      });
    }
  }

  // ── Wave 274: ACT2_PAGE_WEIGHT ─────────────────────────────────────────────
  // Act 2 (the 25-75% zone) consumes less than 40% of total script pages.
  // Act 2 is the complication engine — it should be the longest act, carrying
  // the protagonist's journey from inciting incident to climax approach. A
  // lightweight Act 2 means the complications are rushed, the character
  // development is thin, and the story skips from setup to resolution with an
  // underdeveloped middle. Distinct from ACT2_PACING_VALLEY (suspense curve
  // depression); this is a page-budget distribution measure.
  // Requires 10+ records.
  if (records.length >= 10) {
    const act2Start274 = Math.floor(records.length * 0.25);
    const act2End274 = Math.floor(records.length * 0.75);
    let act2Lines274 = 0;
    let totalLines274b = 0;
    for (const [idx, len] of sceneLengths) {
      totalLines274b += len;
      if (idx >= act2Start274 && idx < act2End274) act2Lines274 += len;
    }
    const act2Ratio274 = totalLines274b > 0 ? act2Lines274 / totalLines274b : 0;
    if (act2Ratio274 < 0.40) {
      issues.push({
        location: `Act 2 (Scenes ${act2Start274}–${act2End274 - 1}) — page budget`,
        rule: 'ACT2_PAGE_WEIGHT',
        severity: 'minor',
        description: `Act 2 (Scenes ${act2Start274}–${act2End274 - 1}) consumes only ${Math.round(act2Ratio274 * 100)}% of total script pages — the complication engine is underweight. A thin Act 2 means complications are rushed, character development is compressed, and the story moves from setup to resolution without developing its middle. Act 2 should be the heaviest act.`,
        suggestedFix: 'Expand the complication zone: add scenes that develop the protagonist\'s relationships under pressure, deepen the opposition, and let the consequences of Act 1 decisions unfold. Act 2 earns the climax — compress it and the resolution will feel unearned.',
      });
    }
  }

  // ── Wave 288: PACING_SUSPENSE_EARLY_PEAK ─────────────────────────────────
  // Average suspenseDelta in Act 1 (first 25%) exceeds average suspenseDelta
  // in Act 3 (last 25%), and Act 3's average is ≤ 0. Suspense peaks in the
  // setup and dissipates before the climax — the story front-loads tension
  // and coasts to the finish. Requires 10+ records with at least 2 scenes
  // in both Act 1 and Act 3 windows.
  if (records.length >= 10) {
    const act1End288 = Math.floor(records.length * 0.25);
    const act3Start288 = Math.floor(records.length * 0.75);
    const act1Recs288 = (records as any[]).slice(0, act1End288);
    const act3Recs288 = (records as any[]).slice(act3Start288);
    if (act1Recs288.length >= 2 && act3Recs288.length >= 2) {
      const act1AvgSusp288 = act1Recs288.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / act1Recs288.length;
      const act3AvgSusp288 = act3Recs288.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / act3Recs288.length;
      if (act1AvgSusp288 > act3AvgSusp288 && act3AvgSusp288 <= 0) {
        issues.push({
          location: `Act 1 avg suspense (${act1AvgSusp288.toFixed(1)}) vs Act 3 avg (${act3AvgSusp288.toFixed(1)})`,
          rule: 'PACING_SUSPENSE_EARLY_PEAK',
          severity: 'minor',
          description: `Act 1's average suspenseDelta (${act1AvgSusp288.toFixed(2)}) exceeds Act 3's (${act3AvgSusp288.toFixed(2)}), and the climax zone is flat or declining. Suspense peaks in the setup and dissipates before the resolution — the story front-loads tension and coasts. The audience loses urgency exactly when the story needs them most engaged.`,
          suggestedFix: 'Redistribute suspense: let Act 1 establish stakes (moderate suspense), Act 2 escalate (rising suspense), and Act 3 peak and resolve (highest then cathartic release). An escalating suspense curve means each act is more urgent than the last.',
        });
      }
    }
  }

  // ── Wave 288: PACING_CURIOSITY_FINAL_DROP ────────────────────────────────
  // Average curiosityDelta in the final quarter (75–100%) is ≤ 0 while the
  // story's overall average curiosityDelta is positive. The mystery engine
  // shuts off before the payoff — the audience stops wondering just as the
  // answers arrive. A satisfying finale should sustain or intensify curiosity
  // until the very last revelation. Requires 10+ records and 3+ scenes in
  // the final quarter.
  if (records.length >= 10) {
    const finalStart288 = Math.floor(records.length * 0.75);
    const finalRecs288 = (records as any[]).slice(finalStart288);
    if (finalRecs288.length >= 3) {
      const overallAvgCuriosity288 = (records as any[]).reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / records.length;
      const finalAvgCuriosity288 = finalRecs288.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / finalRecs288.length;
      if (overallAvgCuriosity288 > 0 && finalAvgCuriosity288 <= 0) {
        issues.push({
          location: `Final quarter (scenes ${finalStart288}+) — curiosity drop`,
          rule: 'PACING_CURIOSITY_FINAL_DROP',
          severity: 'minor',
          description: `Overall average curiosityDelta is ${overallAvgCuriosity288.toFixed(2)} (positive) but the final quarter drops to ${finalAvgCuriosity288.toFixed(2)} (≤ 0). The mystery engine cuts off before the payoff — the audience stops wondering just as the answers arrive. A finale that resolves curiosity without first intensifying it feels like answers to questions the audience has stopped asking.`,
          suggestedFix: 'Sustain curiosity into the final act: introduce a late complication, a new question raised by the approaching resolution, or a false resolution that opens a deeper mystery. The answers should arrive to an audience that is still desperately asking.',
        });
      }
    }
  }

  // ── Wave 288: PACING_CURIOSITY_OPENING_FLATLINE ──────────────────────────
  // Average curiosityDelta in the opening (first 25%) is ≤ 0. The story
  // fails to hook the audience in Act 1 — curiosity never builds in setup.
  // An opening with no curiosity momentum means the audience is given no
  // reason to ask "what happens next?" before the first act turn. Distinct
  // from PACING_CURIOSITY_FINAL_DROP (which fires when the final act loses
  // curiosity after building it); this fires when the opening never builds
  // curiosity at all. Requires 10+ records and 3+ opening scenes.
  if (records.length >= 10) {
    const openingEnd288 = Math.floor(records.length * 0.25);
    const openingRecs288 = (records as any[]).slice(0, openingEnd288);
    if (openingRecs288.length >= 3) {
      const openingAvgCuriosity288 = openingRecs288.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / openingRecs288.length;
      if (openingAvgCuriosity288 <= 0) {
        issues.push({
          location: `Opening (scenes 0–${openingEnd288 - 1}) — curiosity flatline`,
          rule: 'PACING_CURIOSITY_OPENING_FLATLINE',
          severity: 'minor',
          description: `Average curiosityDelta across the opening scenes (0–${openingEnd288 - 1}) is ${openingAvgCuriosity288.toFixed(2)} — the story fails to generate curiosity in setup. The audience reaches the Act 1 turn without a question driving them forward. An opening that doesn't raise questions has no hook.`,
          suggestedFix: 'Plant a question in the first scene: an unexplained action, a mysterious object, a character whose goal is unclear. Every opening scene should make the audience wonder "why?" before it makes them wonder "what next?". Curiosity is the engine of story; start it early.',
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
