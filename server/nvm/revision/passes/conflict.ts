// Wave 39 — Pass 5: Conflict
// Checks conflict escalation: flat arc, missing opposition, collisions not detonated.
// Wave 144 additions: escalation plateau (peak then stalls), confrontation quality,
// and conflict fatigue (reversals too frequent causing audience whiplash).
// Wave 158 additions: threat amnesia (clock established but forgotten in second half),
// antagonist vanish (all reversals in first 60%, none after), and single-register
// conflict (all relationship shifts use the same dimension — one-axis drama).
// Wave 257 additions: conflict Act 3 absent (climax without struggle), reconciliation
// Wave 271 additions: conflict Act 2b void (dark-night zone empty), interpersonal
// conflict only (zero external reversals), conflict pair density gap (one pair 3× others).
// absent (no broken bond ever repairs), and conflict opening void (frictionless Act 1).
// Wave 285 additions: conflict suspense decoupled (conflict scenes don't drive suspense),
// negative spiral unbroken (≥4 consecutive negative shifts with no relief),
// conflict resolution premature (major conflict resolved before final quarter).
// Wave 299 additions: conflict emotion decoupled (conflict scenes all emotionally
// neutral), stakes label unbacked (raise_stakes scenes with no conflict markers),
// eleventh hour conflict (new conflict pair first appears in the final 10%).
// Wave 313 additions: conflict curiosity decoupled (conflict scenes avg curiosityDelta
// ≤ 0), conflict magnitude peak early (heaviest relational rupture in the first half,
// distributed), conflict relentless run (≥4 consecutive scenes with a negative shift).
// Wave 338 additions: conflict clock decoupled (≥2 clock scenes none with relational
// conflict — deadlines without friction), conflict dramatic turn void (≥3 turn scenes
// none with negative relationship shift — pivots that don't crack bonds), conflict
// first-half monopoly (>70% of all conflict scenes in the first half — front-loaded).
// Wave 352 additions: conflict peak suspense absent (the heaviest-rupture scene has
// suspenseDelta ≤ 0), conflict peak emotion absent (the heaviest-rupture scene is
// emotionally neutral), conflict peak curiosity absent (the heaviest-rupture scene has
// curiosityDelta ≤ 0) — the single biggest bond-break is dramatically inert.
// Wave 366 additions: conflict peak dramatic turn absent (the heaviest-rupture scene
// carries no dramatic turn — the biggest break is not a story pivot), conflict peak clock
// absent (the heaviest-rupture scene raises no clock while the story uses clocks elsewhere
// — the biggest break adds no time pressure), conflict late first rupture (the first
// conflict scene falls at or after the midpoint — the entire first half is frictionless).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

export async function conflictPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, structure, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  // ── Flat suspense arc ─────────────────────────────────────────────────────
  if (!structure.escalating && records.length >= 5) {
    issues.push({
      location: 'Overall conflict arc',
      rule: 'FLAT_SUSPENSE_ARC',
      description: `Average suspense in the second half (${structure.avgSuspensePerScene}) does not exceed the first half — conflict fails to escalate`,
      severity: 'major',
      suggestedFix: 'Increase the stakes in the second half by having a character lose something they cannot recover easily',
    });
  }

  // ── Reversal density too low ──────────────────────────────────────────────
  if (structure.reversalDensity === 0 && records.length >= 8) {
    issues.push({
      location: 'Conflict layer',
      rule: 'NO_REVERSALS_LONG_STORY',
      description: 'An 8+ scene story with zero dramatic reversals lacks conflict texture',
      severity: 'critical',
      suggestedFix: 'Add at least one scene where a character\'s plan fails or backfires unexpectedly',
    });
  }

  // ── Open clues without tension ────────────────────────────────────────────
  if (structure.openClues > 3) {
    issues.push({
      location: 'Conflict — unresolved threads',
      rule: 'TOO_MANY_OPEN_CONFLICTS',
      description: `${structure.openClues} planted conflicts/clues remain unresolved — the story feels scattered rather than escalating`,
      severity: 'major',
      suggestedFix: 'Converge 2-3 open threads into a single confrontation scene',
    });
  }

  // ── Clock pressure without confrontation ─────────────────────────────────
  // Only count scenes with meaningful clock pressure (delta > 1) to avoid flagging minor raises.
  const clockRaisedScenes = records.filter(r => (r.clockDelta ?? (r.clockRaised ? 1.1 : 0)) > 1).length;
  const reversalScenes = records.filter(r => r.suspenseDelta < -1).length;
  if (clockRaisedScenes >= 3 && reversalScenes === 0) {
    issues.push({
      location: 'Conflict escalation',
      rule: 'CLOCK_WITHOUT_CONFRONTATION',
      description: `Clock is raised significantly ${clockRaisedScenes} times but no confrontation/reversal follows — ticking clocks need detonation`,
      severity: 'major',
      suggestedFix: 'Add a scene where the clock expires and forces a confrontation between opposing characters',
    });
  }

  // ── Approaching climax without intensification ────────────────────────────
  if (structure.approachingClimax) {
    const recentRecords = records.slice(-3);
    const recentSuspense = recentRecords.map(r => r.suspenseDelta);
    const avgRecentSuspense = recentSuspense.reduce((a, b) => a + b, 0) / Math.max(recentSuspense.length, 1);
    if (avgRecentSuspense < structure.avgSuspensePerScene) {
      issues.push({
        location: 'Pre-climax scenes (last 3)',
        rule: 'CLIMAX_APPROACH_FLAT',
        description: 'Story is approaching climax but recent scenes have below-average suspense — the approach lacks urgency',
        severity: 'major',
        suggestedFix: 'Accelerate the final act with shorter scenes and higher-stakes confrontations',
      });
    }
  }

  // ── Wave 144: Escalation plateau & confrontation quality ──────────────────

  // ESCALATION_PLATEAU: Suspense builds to a peak mid-story then plateaus or
  // drops instead of continuing to rise toward climax. The conflict peaked too
  // early and can't be recaptured.
  if (records.length >= 8) {
    const mid = Math.floor(records.length / 2);
    const firstHalf = records.slice(0, mid);
    const secondHalf = records.slice(mid);

    const firstHalfMax = Math.max(...firstHalf.map(r => r.suspenseDelta), 0);
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((s, r) => s + r.suspenseDelta, 0) / secondHalf.length
      : 0;

    // If suspense peaks in first half but second half average is lower, it's plateaued
    if (firstHalfMax > 3 && secondHalfAvg < firstHalfMax * 0.7) {
      issues.push({
        location: 'Mid-story conflict',
        rule: 'ESCALATION_PLATEAU',
        description: `Conflict peaks at suspense ${firstHalfMax.toFixed(1)} in the first half but averages only ${secondHalfAvg.toFixed(1)} in the second half — escalation plateaus instead of building`,
        severity: 'major',
        suggestedFix: 'Either reduce the mid-story peak so the final act can surpass it, or add new complications in the second half that drive suspense even higher',
      });
    }
  }

  // CONFRONTATION_AVOIDANCE: Characters in conflict (negative relationship shifts)
  // but never meet in a scene with dialogue — they avoid direct confrontation.
  // This weakens the conflict's narrative impact.
  if (records.length >= 5) {
    const hasNegativeShifts = records.some(r => {
      const negativeShifts = (r.relationshipShifts ?? []).filter(s => s.amount < -0.5);
      return negativeShifts.length > 0;
    });

    if (hasNegativeShifts) {
      // Check if any scene with negative shift also has dialogue highlights (confrontation)
      const hasDirectConfrontation = records.some(r => {
        const negativeShifts = (r.relationshipShifts ?? []).filter(s => s.amount < -0.5);
        const hasDialogue = (r.dialogueHighlights ?? []).length > 0;
        return negativeShifts.length > 0 && hasDialogue;
      });

      if (!hasDirectConfrontation) {
        issues.push({
          location: 'Relationship conflict',
          rule: 'CONFRONTATION_AVOIDANCE',
          description: `Characters have negative relationship shifts but never appear in a scene together with dialogue — the conflict is stated but not enacted on stage`,
          severity: 'major',
          suggestedFix: 'Add a direct confrontation scene where conflicted characters face each other and their tension becomes verbal or physical action',
        });
      }
    }
  }

  // CONFLICT_FATIGUE: Too many reversals in quick succession (3+ reversals in
  // consecutive or near-consecutive scenes) causes audience whiplash — tension
  // oscillates too rapidly without settling, exhausting the viewer.
  if (records.length >= 8) {
    let reversalStreak = 0;
    let streakStart = -1;
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const isReversal = r.suspenseDelta < -1;
      if (isReversal) {
        if (reversalStreak === 0) streakStart = i;
        reversalStreak++;
      } else if (i > streakStart + 1 && reversalStreak < 3) {
        // Break the streak if too much non-reversal space
        reversalStreak = 0;
      }

      if (reversalStreak === 3) {
        issues.push({
          location: `Scenes ${streakStart}–${i}`,
          rule: 'CONFLICT_FATIGUE',
          description: `Three reversals in quick succession (Scenes ${streakStart}-${i}) — the audience experiences whiplash from rapid oscillation without settling`,
          severity: 'minor',
          suggestedFix: 'Space reversals further apart or let one reversal settle with a scene of consequence before introducing the next',
        });
        reversalStreak = 0; // reset to avoid duplicate fires
      }
    }
  }

  // ── Wave 158: Threat amnesia, antagonist vanish, single-register conflict ─────

  // THREAT_AMNESIA: A clock is raised in Act 1 (first 25%) but never raised again
  // in the second half (from 50% onward). The urgency that launched the story is
  // abandoned — the audience forgets what's at stake. Requires 8+ scenes.
  if (records.length >= 8) {
    const act1Zone = Math.floor(records.length * 0.25);
    const secondHalfStart = Math.floor(records.length * 0.5);

    const clockInAct1 = records.slice(0, act1Zone).some(r => r.clockRaised);
    const clockInSecondHalf = records.slice(secondHalfStart).some(r => r.clockRaised);

    if (clockInAct1 && !clockInSecondHalf) {
      issues.push({
        location: `Act 1–Act 2 clock gap (Scenes ${act1Zone}–${records.length - 1})`,
        rule: 'THREAT_AMNESIA',
        description: `A clock is raised in Act 1 but no clock pressure appears in the second half (Scenes ${secondHalfStart}+) — the external threat that launched the story is forgotten, and stakes evaporate`,
        severity: 'major',
        suggestedFix: 'Re-invoke the original threat in Act 2b with an escalation (a closer deadline, a new consequence, or a complication that restores urgency)',
      });
    }
  }

  // ANTAGONIST_VANISH: All reversals (suspenseDelta < -1) occur before the 60%
  // mark, with none after. The antagonistic force is active in the first half but
  // passive or absent as the story approaches the climax — the protagonist faces
  // a depleted opposition in the final act.
  if (records.length >= 8) {
    const splitPoint = Math.floor(records.length * 0.6);
    const reversalsInFirst = records.slice(0, splitPoint).filter(r => r.suspenseDelta < -1).length;
    const reversalsInLast = records.slice(splitPoint).filter(r => r.suspenseDelta < -1).length;

    if (reversalsInFirst >= 2 && reversalsInLast === 0) {
      issues.push({
        location: `Late conflict (Scenes ${splitPoint}–${records.length - 1})`,
        rule: 'ANTAGONIST_VANISH',
        description: `${reversalsInFirst} reversals occur before Scene ${splitPoint} but none after — the antagonist's active opposition evaporates before the climax. The protagonist wins the finale against a passive opponent.`,
        severity: 'major',
        suggestedFix: 'Add at least one reversal or direct antagonistic action in the final 40% — the protagonist must face active opposition in the climax, not just the aftermath of it',
      });
    }
  }

  // SINGLE_REGISTER_CONFLICT: All relationship shifts use the same dimension
  // (e.g., only 'trust', only 'power'). Real relationships operate on multiple
  // axes. Single-dimension conflict produces thin drama where every scene feels
  // like a repeat of the same relational beat. Requires 6+ scenes, 4+ shifts.
  if (records.length >= 6) {
    const allShifts = records.flatMap(r => r.relationshipShifts ?? []);
    if (allShifts.length >= 4) {
      const dimensions = new Set(allShifts.map(s => s.dimension));
      if (dimensions.size === 1) {
        const [onlyDim] = dimensions;
        issues.push({
          location: 'Relationship conflict layer',
          rule: 'SINGLE_REGISTER_CONFLICT',
          description: `All ${allShifts.length} relationship shifts use the same dimension ("${onlyDim}") — conflict operates on a single axis. Every relational scene delivers the same beat.`,
          severity: 'minor',
          suggestedFix: `Introduce a second conflict dimension (e.g., if all shifts are "${onlyDim}", add scenes that shift power, loyalty, or affection) to give the relationships texture and make each confrontation feel distinct`,
        });
      }
    }
  }

  // ── Wave 169: Deadline absence, low-stakes conflict, interpersonal peak timing ──

  // CONFLICT_WITHOUT_DEADLINE: 5+ conflict scenes (negative shifts or reversals)
  // but no clock raised anywhere. Interpersonal conflict without a deadline can be
  // deferred indefinitely — nothing forces the characters' hands.
  if (records.length >= 6) {
    const conflictSceneCount = records.filter(r => {
      const hasNegShift = (r.relationshipShifts ?? []).some(s => s.amount < -0.3);
      const isReversal = r.suspenseDelta < -1;
      return hasNegShift || isReversal;
    }).length;
    const hasAnyClockRaised = records.some(r => r.clockRaised);
    if (conflictSceneCount >= 5 && !hasAnyClockRaised) {
      issues.push({
        location: 'Conflict architecture',
        rule: 'CONFLICT_WITHOUT_DEADLINE',
        description: `${conflictSceneCount} conflict scenes with no clock pressure anywhere — all conflict is interpersonal with no external urgency forcing it to a head`,
        severity: 'minor',
        suggestedFix: 'Add at least one external clock: a deadline, a closing window, or a consequence that expires. A ticking clock transforms interpersonal friction into unavoidable confrontation.',
      });
    }
  }

  // LOW_STAKES_CONFLICT: The largest relationship shift magnitude is below 0.4 —
  // all conflict is minor. No scene creates a significant rupture in any relationship;
  // the story operates at a perpetually low emotional temperature.
  if (records.length >= 6) {
    const allShifts2 = records.flatMap(r => r.relationshipShifts ?? []);
    if (allShifts2.length >= 4) {
      const maxMagnitude = Math.max(...allShifts2.map(s => Math.abs(s.amount)));
      if (maxMagnitude < 0.4) {
        issues.push({
          location: 'Relationship conflict layer',
          rule: 'LOW_STAKES_CONFLICT',
          description: `Largest relationship shift is only ${maxMagnitude.toFixed(2)} — all ${allShifts2.length} shifts are minor. No scene delivers a high-magnitude rupture or bond.`,
          severity: 'major',
          suggestedFix: 'At least one scene must deliver a shift ≥0.5 in magnitude: a betrayal, a rescue, or an act of devotion that irreversibly changes a relationship',
        });
      }
    }
  }

  // INTERPERSONAL_PEAK_TOO_EARLY: The scene with the most intense negative
  // relationship shift (abs highest) occurs before the 60% mark. The relational
  // climax passes before the dramatic climax — characters are partially reconciled
  // when they should be at maximum opposition.
  if (records.length >= 8) {
    const negShiftScenes: Array<{ sceneIdx: number; amount: number }> = [];
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        if (shift.amount < 0) negShiftScenes.push({ sceneIdx: r.sceneIdx, amount: shift.amount });
      }
    }
    if (negShiftScenes.length >= 3) {
      const peakShift = negShiftScenes.reduce((worst, s) => s.amount < worst.amount ? s : worst);
      const climaxZone = Math.floor(records.length * 0.6);
      if (peakShift.sceneIdx < climaxZone && peakShift.amount < -0.4) {
        issues.push({
          location: `Scene ${peakShift.sceneIdx} (relational peak)`,
          rule: 'INTERPERSONAL_PEAK_TOO_EARLY',
          description: `The most damaging relationship shift (${peakShift.amount.toFixed(2)}) occurs at Scene ${peakShift.sceneIdx} — ${Math.round(peakShift.sceneIdx / records.length * 100)}% through the story, before the climax zone (Scene ${climaxZone}+). The relational conflict peaks too early.`,
          severity: 'major',
          suggestedFix: 'Reserve the most damaging relational rupture for the climax or just before it. Maximum interpersonal damage should coincide with maximum dramatic stakes.',
        });
      }
    }
  }

  // ── Wave 183: Reversal vacuum, Act 1 conflict absent, convergence absent ──

  // REVERSAL_WITHOUT_CONSEQUENCE: A reversal (suspenseDelta < -1) is followed by
  // two consecutive flat scenes — no emotional reaction, no clock, no relational
  // movement. The blow lands in a dramatic vacuum and the story absorbs it without
  // ripple, making the reversal feel inert rather than pivotal.
  if (records.length >= 6) {
    for (let i = 0; i < records.length - 2; i++) {
      if (records[i].suspenseDelta >= -1) continue;
      const afterScenes = records.slice(i + 1, i + 3);
      const isVacuum = afterScenes.length === 2 && afterScenes.every(a =>
        a.emotionalShift === 'neutral' &&
        !a.clockRaised &&
        (a.relationshipShifts ?? []).every(s => Math.abs(s.amount) < 0.3) &&
        a.suspenseDelta <= 1,
      );
      if (isVacuum) {
        issues.push({
          location: `Scene ${records[i].sceneIdx} (reversal)`,
          rule: 'REVERSAL_WITHOUT_CONSEQUENCE',
          description: `The reversal at Scene ${records[i].sceneIdx} (suspense drop: ${records[i].suspenseDelta.toFixed(1)}) lands in a dramatic vacuum — the next two scenes are emotionally flat with no clock, no relationship impact, and no causal reaction.`,
          severity: 'minor',
          suggestedFix: 'A reversal must ripple forward: the scene after a reversal should register its impact through emotional reaction, relationship strain, or an accelerating clock. Let the hit land.',
        });
        break;
      }
    }
  }

  // CONFLICT_ACT1_ABSENT: The entire Act 1 (first 25%) contains no conflict
  // signal — no clock raised, no reversal-level suspense, no negative relationship
  // shift. The story opens without any tension hook; the audience has nothing at
  // stake and no reason to fear loss.
  if (records.length >= 8) {
    const act1End = Math.floor(records.length * 0.25);
    const act1Records = records.slice(0, act1End);
    if (act1Records.length >= 2) {
      const hasConflictHook = act1Records.some(r =>
        r.clockRaised ||
        r.suspenseDelta > 2 ||
        (r.relationshipShifts ?? []).some(s => s.amount < -0.3),
      );
      if (!hasConflictHook) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End - 1})`,
          rule: 'CONFLICT_ACT1_ABSENT',
          description: `Act 1 (${act1Records.length} scenes) contains no conflict signal: no clock raised, no reversal, no negative relationship shift. The story opens without tension — the audience has nothing at stake from the start.`,
          severity: 'major',
          suggestedFix: 'Introduce a conflict signal in the first 25%: raise a clock, create a minor relational rupture, or plant a threat. The opening must establish what the protagonist stands to lose before the audience will care about saving it.',
        });
      }
    }
  }

  // CONFLICT_CONVERGENCE_ABSENT: Multiple active relational conflicts (≥2 distinct
  // negative-shift pairKeys) and a clock pressure exist throughout the story but
  // never intersect in the same scene. The threads run in parallel without the
  // explosive convergence that creates a true dramatic peak — the story fragments
  // its tension instead of detonating it.
  if (records.length >= 10) {
    const negPairKeys = new Set<string>();
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        if (shift.amount < -0.3) negPairKeys.add(shift.pairKey);
      }
    }
    const hasClockAnywhere = records.some(r => r.clockRaised);
    if (negPairKeys.size >= 2 && hasClockAnywhere) {
      const hasConvergence = records.some(r =>
        r.clockRaised && (r.relationshipShifts ?? []).some(s => s.amount < -0.3),
      );
      if (!hasConvergence) {
        issues.push({
          location: 'Conflict architecture',
          rule: 'CONFLICT_CONVERGENCE_ABSENT',
          description: `${negPairKeys.size} active relational conflicts and a clock pressure run in parallel throughout the story but never meet in a single scene. The threads fragment the tension instead of converging into one explosive confrontation.`,
          severity: 'major',
          suggestedFix: 'Design a scene where the deadline and the relational conflict collide simultaneously — a clock that forces opposing characters into the same room where they cannot avoid confrontation. Convergence is what turns multiple conflicts into a climax.',
        });
      }
    }
  }

  // ── Wave 195: Midpoint absent, Act 3 deflation, frequency drop ───────────

  // CONFLICT_MIDPOINT_ABSENT: The midpoint scene (floor(n*0.5)) and its ±1
  // neighbors carry no conflict signal — no clock, no reversal, no negative
  // relational shift. The structural pivot has no dramatic tension: the story
  // changes gear in a vacuum.
  if (records.length >= 8) {
    const midIdxConf = Math.floor(records.length * 0.5);
    const windowLow = Math.max(0, midIdxConf - 1);
    const windowHigh = Math.min(records.length - 1, midIdxConf + 1);
    const midpointWindow = records.slice(windowLow, windowHigh + 1);
    const hasMidpointConflict = midpointWindow.some(r =>
      r.clockRaised ||
      r.suspenseDelta < -1 ||
      (r.relationshipShifts ?? []).some((s: any) => s.amount < -0.3),
    );
    if (!hasMidpointConflict) {
      issues.push({
        location: `Scenes ${windowLow}–${windowHigh} (midpoint ±1)`,
        rule: 'CONFLICT_MIDPOINT_ABSENT',
        description: `The midpoint and adjacent scenes (Scenes ${windowLow}–${windowHigh}) carry no conflict signal — no clock, no reversal, no negative relationship shift. The structural pivot has no dramatic tension.`,
        severity: 'major',
        suggestedFix: 'Add a conflict beat to the midpoint zone: raise a clock, introduce a reversal, or create a relational rupture. The midpoint is where the story shifts gear — it should feel dramatic, not inert.',
      });
    }
  }

  // CONFLICT_ACT3_DEFLATION: Act 3 (last 25%) average suspense is significantly
  // lower than the second half of Act 2 (50%–75%). Conflict deflates before the
  // climax instead of crescendoing — the audience loses urgency at the finish line.
  if (records.length >= 8) {
    const act3StartConf = Math.floor(records.length * 0.75);
    const act2bStartConf = Math.floor(records.length * 0.5);
    const act2bRecs = records.slice(act2bStartConf, act3StartConf);
    const act3Recs = records.slice(act3StartConf);
    if (act2bRecs.length >= 2 && act3Recs.length >= 2) {
      const act2bAvgConf = act2bRecs.reduce((s: number, r: any) => s + r.suspenseDelta, 0) / act2bRecs.length;
      const act3AvgConf = act3Recs.reduce((s: number, r: any) => s + r.suspenseDelta, 0) / act3Recs.length;
      if (act2bAvgConf > 0 && act3AvgConf < act2bAvgConf * 0.6) {
        issues.push({
          location: `Act 3 (Scenes ${act3StartConf}–${records.length - 1})`,
          rule: 'CONFLICT_ACT3_DEFLATION',
          description: `Act 3 average suspense (${act3AvgConf.toFixed(1)}) is significantly below late Act 2 (${act2bAvgConf.toFixed(1)}) — conflict deflates before the climax instead of crescendoing`,
          severity: 'major',
          suggestedFix: 'Increase conflict intensity in the final act: escalate the antagonist\'s threat, raise a secondary clock, or force characters into their most consequential confrontation yet. The climax must be the peak.',
        });
      }
    }
  }

  // CONFLICT_FREQUENCY_DROP: The proportion of conflict-event scenes (reversals
  // or negative relationship shifts) falls from the first third to the final third.
  // The story becomes less dramatically active as it approaches its end — the
  // inverse of escalation. Requires 9+ scenes to have three meaningful thirds.
  if (records.length >= 9) {
    const confThird = Math.floor(records.length / 3);
    const isConflictEvent = (r: any) =>
      r.suspenseDelta < -1 || (r.relationshipShifts ?? []).some((s: any) => s.amount < -0.3);
    const firstThirdFreq = records.slice(0, confThird).filter(isConflictEvent).length / confThird;
    const lastThirdFreq = records.slice(records.length - confThird).filter(isConflictEvent).length / confThird;
    if (firstThirdFreq > lastThirdFreq && firstThirdFreq >= 0.4) {
      issues.push({
        location: 'Conflict frequency arc',
        rule: 'CONFLICT_FREQUENCY_DROP',
        description: `Conflict events (reversals + negative shifts) occur in ${Math.round(firstThirdFreq * 100)}% of first-third scenes but only ${Math.round(lastThirdFreq * 100)}% of final-third scenes — the story becomes less dramatic as it approaches its end`,
        severity: 'minor',
        suggestedFix: 'Spread conflict events evenly or escalate them toward the finale. The final third needs at least as many dramatic events as the opening — the climax arc must have its own conflict pulse.',
      });
    }
  }

  // ── Wave 210: Positive spiral trap, reversal symmetry break, antagonist force only ──

  // POSITIVE_SPIRAL_TRAP: Four or more consecutive scenes all carry a positive
  // emotional shift — an unbroken winning streak with no setback, reversal, or
  // doubt. A protagonist winning continuously for too long removes stakes and
  // transforms conflict into a montage. The audience stops fearing loss when
  // loss has been absent for four scenes in a row.
  if (records.length >= 8) {
    let posRun210 = 0;
    let maxPosRun210 = 0;
    let posRunStart210 = 0;
    let maxPosRunStart210 = 0;
    for (let i = 0; i < records.length; i++) {
      if (records[i].emotionalShift === 'positive') {
        if (posRun210 === 0) posRunStart210 = i;
        posRun210++;
        if (posRun210 > maxPosRun210) { maxPosRun210 = posRun210; maxPosRunStart210 = posRunStart210; }
      } else {
        posRun210 = 0;
      }
    }
    if (maxPosRun210 >= 4) {
      const runEnd210 = Math.min(maxPosRunStart210 + maxPosRun210 - 1, records.length - 1);
      issues.push({
        location: `Scenes ${records[maxPosRunStart210].sceneIdx}–${records[runEnd210].sceneIdx}`,
        rule: 'POSITIVE_SPIRAL_TRAP',
        severity: 'minor',
        description: `${maxPosRun210} consecutive scenes all end on a positive emotional shift — the protagonist wins continuously with no setback for ${maxPosRun210} scenes. Stakes evaporate when loss is absent for this long.`,
        suggestedFix: 'Break the winning streak with a reversal, a cost, or a doubt: a scene where the protagonist\'s progress is complicated or reversed. Sustained victories reduce tension — the audience must fear loss to care about the next scene.',
      });
    }
  }

  // REVERSAL_SYMMETRY_BREAK: Act 2a (25%–50%) contains two or more reversals
  // but Act 2b (50%–75%) contains none. The conflict's second half goes silent
  // exactly when it should be pressing hardest toward the climax. This is the
  // mid-story version of ANTAGONIST_VANISH: the opposition is active in the
  // first half of the conflict zone but passive in the second.
  if (records.length >= 10) {
    const act2aStart210 = Math.floor(records.length * 0.25);
    const act2Split210  = Math.floor(records.length * 0.5);
    const act2bEnd210   = Math.floor(records.length * 0.75);
    const reversalsAct2a = records.slice(act2aStart210, act2Split210).filter(r => r.suspenseDelta < -1).length;
    const reversalsAct2b = records.slice(act2Split210, act2bEnd210).filter(r => r.suspenseDelta < -1).length;
    if (reversalsAct2a >= 2 && reversalsAct2b === 0) {
      issues.push({
        location: `Act 2 (Scenes ${act2aStart210}–${act2bEnd210 - 1})`,
        rule: 'REVERSAL_SYMMETRY_BREAK',
        severity: 'minor',
        description: `Act 2a (Scenes ${act2aStart210}–${act2Split210 - 1}) delivers ${reversalsAct2a} reversals but Act 2b (Scenes ${act2Split210}–${act2bEnd210 - 1}) has none — the conflict's second half goes passive when it should be escalating. The approach to the climax has no oppositional momentum.`,
        suggestedFix: 'Add at least one reversal in Act 2b: a setback, a plan failure, or an antagonist action that raises the cost before the climax. The protagonist must enter the final act under active pressure, not from a lull.',
      });
    }
  }

  // ANTAGONIST_FORCE_ONLY: The story's conflict is entirely external — multiple
  // reversals (plot-level setbacks) but zero scenes with any negative relationship
  // shift. The antagonist creates plot obstacles but the characters never wound
  // each other. Conflict that operates only through external force, with no
  // interpersonal friction, produces thriller plotting without emotional dimension.
  if (records.length >= 8) {
    const reversalCount210 = records.filter(r => r.suspenseDelta < -1).length;
    const negRelShiftScenes210 = records.filter(r =>
      (r.relationshipShifts ?? []).some(s => s.amount < 0),
    ).length;
    if (reversalCount210 >= 2 && negRelShiftScenes210 === 0) {
      issues.push({
        location: 'Conflict architecture',
        rule: 'ANTAGONIST_FORCE_ONLY',
        severity: 'minor',
        description: `${reversalCount210} reversals occur but no scene carries a negative relationship shift — all conflict is external plot force with zero interpersonal damage. Characters never wound each other; they only absorb external obstacles.`,
        suggestedFix: 'Add at least one scene where the conflict damages a relationship: a betrayal, a broken trust, or an accusation that shifts how two characters stand in relation to each other. External opposition without interpersonal cost produces plot without drama.',
      });
    }
  }

  // ── Wave 214: Conflict-dynamics physics — pressure rhythm, mass distribution,
  //    reversal-magnitude trend. These reason over a per-scene conflict signal vector
  //    (see computeConflictDynamics) rather than single suspenseDelta thresholds. ──
  const conflictDyn214 = computeConflictDynamics(records);

  // UNRELIEVED_TENSION_ASCENT (major, n≥10): the dual of ESCALATION_PLATEAU. A long
  // run of consecutive scenes that each ADD external pressure with no release valve
  // among them. Relentless monotonic escalation with no beat of relief exhausts the
  // audience as surely as no escalation bores them — drama needs systole and diastole.
  if (records.length >= 10) {
    let run214 = 0, maxRun214 = 0, runStart214 = 0, maxRunStart214 = 0;
    for (let i = 0; i < conflictDyn214.length; i++) {
      const escalating = conflictDyn214[i].escalation > 0;
      const isRelief = conflictDyn214[i].release > 1;
      if (escalating && !isRelief) {
        if (run214 === 0) runStart214 = i;
        run214++;
        if (run214 > maxRun214) { maxRun214 = run214; maxRunStart214 = runStart214; }
      } else {
        run214 = 0;
      }
    }
    if (maxRun214 >= 6) {
      const runEnd214 = maxRunStart214 + maxRun214 - 1;
      issues.push({
        location: `Scenes ${records[maxRunStart214].sceneIdx}–${records[runEnd214].sceneIdx}`,
        rule: 'UNRELIEVED_TENSION_ASCENT',
        severity: 'major',
        description: `${maxRun214} consecutive scenes each add external pressure (rising suspense or a tightening clock) with no release valve between them — the tension climbs monotonically for ${maxRun214} scenes without a single beat of relief. Unbroken escalation flattens into noise; the audience cannot register a rise it is never allowed to fall from.`,
        suggestedFix: 'Insert a release beat inside the run: a reversal that briefly drops the pressure, a moment of false safety, or a small victory that the audience can exhale on before the next surge. Tension is felt as contrast — give the line a trough so the next peak reads as a climb.',
      });
    }
  }

  // CONFLICT_CONCENTRATION_SPIKE (major, n≥10): the story carries substantial total
  // conflict mass, but a single scene holds 60%+ of it while the rest is dead air.
  // The drama is one explosion in an empty field rather than a sustained engagement —
  // a structural signature of a story that front-loads or dumps its entire conflict
  // into one set-piece instead of threading opposition through the whole arc.
  if (records.length >= 10) {
    const masses214 = conflictDyn214.map(d => d.mass);
    const totalMass214 = masses214.reduce((a, b) => a + b, 0);
    const maxMass214 = Math.max(...masses214);
    const spikeIdx214 = masses214.indexOf(maxMass214);
    if (totalMass214 >= 6 && maxMass214 >= 0.6 * totalMass214) {
      issues.push({
        location: `Scene ${records[spikeIdx214].sceneIdx}`,
        rule: 'CONFLICT_CONCENTRATION_SPIKE',
        severity: 'major',
        description: `Scene ${records[spikeIdx214].sceneIdx} holds ${Math.round((maxMass214 / totalMass214) * 100)}% of the story's entire conflict mass — the opposition detonates in a single scene while the rest of the arc is dramatically inert. Conflict concentrated this heavily reads as an isolated set-piece, not a sustained pressure on the protagonist.`,
        suggestedFix: 'Distribute the conflict: seed smaller oppositional beats across the surrounding scenes so the spike is the crest of a wave, not a lone spike in flat water. A story sustains tension by keeping pressure present, not by discharging it all at once.',
      });
    }
  }

  // REVERSAL_MAGNITUDE_DECAY (major, n≥10): reversals exist in both the opening and
  // closing thirds, but their MAGNITUDE shrinks — the biggest setback is early and the
  // late reversals are at least half as large or smaller. Stakes that deflate toward
  // the climax invert the dramatic gradient: each blow should land harder than the last,
  // not softer. This is a magnitude-aware check that "are there reversals" cannot catch.
  if (records.length >= 10) {
    const third214 = Math.floor(records.length / 3);
    const firstThirdRev214 = conflictDyn214.slice(0, third214).filter(d => d.isReversal).map(d => d.reversalMag);
    const lastThirdRev214 = conflictDyn214.slice(records.length - third214).filter(d => d.isReversal).map(d => d.reversalMag);
    if (firstThirdRev214.length > 0 && lastThirdRev214.length > 0) {
      const firstMax214 = Math.max(...firstThirdRev214);
      const lastMax214 = Math.max(...lastThirdRev214);
      if (firstMax214 >= 2 * lastMax214) {
        issues.push({
          location: 'Reversal magnitude arc',
          rule: 'REVERSAL_MAGNITUDE_DECAY',
          severity: 'major',
          description: `The story's largest early reversal swings by ${firstMax214.toFixed(1)} but its largest late reversal swings by only ${lastMax214.toFixed(1)} — the setbacks shrink as the story approaches its climax. The dramatic gradient is inverted: the protagonist's hardest blow lands first and the stakes deflate toward the end.`,
          suggestedFix: 'Escalate reversal magnitude toward the finale: the climax-adjacent setback should be the largest, most costly reversal in the story. Reorder or deepen the late reversals so each blow lands harder than the one before — a deflating stakes curve drains the climax of consequence.',
        });
      }
    }
  }

  // ── Wave 229: Reversal tempo flatline, telegraphed antagonist, positive resolution too early ──

  // REVERSAL_TEMPO_FLATLINE (minor, n≥10): Reversal-level conflict events exist but
  // their average interval exceeds 40% of the total scene count — the conflict pulse
  // is so slow that narrative momentum stalls between beats. Unlike
  // CONFLICT_FREQUENCY_DROP (which compares thirds), this measures absolute spacing
  // rhythm and fires when events are chronically far apart regardless of distribution.
  if (records.length >= 10) {
    const conflictEventIdxs229: number[] = [];
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.suspenseDelta < -1 ||
          (r.relationshipShifts ?? []).some((s: any) => s.amount < -0.4)) {
        conflictEventIdxs229.push(i);
      }
    }
    if (conflictEventIdxs229.length >= 2) {
      const gaps229: number[] = [];
      for (let j = 1; j < conflictEventIdxs229.length; j++) {
        gaps229.push(conflictEventIdxs229[j] - conflictEventIdxs229[j - 1]);
      }
      const avgGap229 = gaps229.reduce((a, b) => a + b, 0) / gaps229.length;
      const gapThreshold229 = records.length * 0.4;
      if (avgGap229 > gapThreshold229) {
        issues.push({
          location: 'Conflict rhythm',
          rule: 'REVERSAL_TEMPO_FLATLINE',
          severity: 'minor',
          description: `Conflict events are spaced an average of ${avgGap229.toFixed(1)} scenes apart (threshold: ${gapThreshold229.toFixed(1)}) — the narrative pulse is so slow that dramatic momentum stalls. The story has ${conflictEventIdxs229.length} conflict beats across ${records.length} scenes.`,
          suggestedFix: 'Reduce the interval between conflict events: add micro-reversals, raise a clock between major beats, or introduce small relational friction to keep pressure present. A conflict rhythm of one beat every 3–4 scenes sustains tension.',
        });
      }
    }
  }

  // ANTAGONIST_TELEGRAPHED (minor, n≥10): Every deep reversal (suspenseDelta < -2)
  // is immediately preceded by a clock raise in the prior scene — the antagonist only
  // strikes after a warning. Real opposition needs unpredictable strikes: a reversal
  // with no advance warning creates genuine dread that telegraphed attacks cannot.
  if (records.length >= 10) {
    const deepReversals229 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => r.suspenseDelta < -2);
    if (deepReversals229.length >= 2) {
      const allTelegraphed229 = deepReversals229.every(({ i }: any) =>
        i > 0 && records[i - 1].clockRaised,
      );
      if (allTelegraphed229) {
        issues.push({
          location: 'Conflict — reversal pattern',
          rule: 'ANTAGONIST_TELEGRAPHED',
          severity: 'minor',
          description: `Every reversal (${deepReversals229.length} events, suspenseDelta < -2) is immediately preceded by a clock raise — the antagonist only strikes after a warning. Permanently telegraphed attacks eliminate genuine shock from the conflict.`,
          suggestedFix: 'Remove the preceding clock raise from at least one reversal, or introduce a strike where the prior scene carried no threat signal. Unpredictable antagonist action creates dread; telegraphed opposition only builds anxiety.',
        });
      }
    }
  }

  // POSITIVE_RESOLUTION_TOO_EARLY (major, n≥8): The story's most significant
  // positive relationship shift (largest-magnitude, ≥0.4) occurs before the 60%
  // mark. The central reconciliation front-loads the emotional reward — the final
  // act has nowhere left to go. The structural complement to INTERPERSONAL_PEAK_TOO_EARLY.
  if (records.length >= 8) {
    const posShiftScenes229: Array<{ sceneIdx: number; recIdx: number; amount: number }> = [];
    for (let i = 0; i < records.length; i++) {
      for (const shift of (records[i].relationshipShifts ?? []) as Array<{ amount: number }>) {
        if (shift.amount >= 0.4) {
          posShiftScenes229.push({ sceneIdx: records[i].sceneIdx, recIdx: i, amount: shift.amount });
        }
      }
    }
    if (posShiftScenes229.length >= 3) {
      const peakPos229 = posShiftScenes229.reduce((best, s) => s.amount > best.amount ? s : best);
      const earlyZone229 = Math.floor(records.length * 0.6);
      if (peakPos229.recIdx < earlyZone229) {
        issues.push({
          location: `Scene ${peakPos229.sceneIdx} (relational peak resolution)`,
          rule: 'POSITIVE_RESOLUTION_TOO_EARLY',
          severity: 'major',
          description: `The story's most significant positive relationship shift (+${peakPos229.amount.toFixed(2)}) occurs at Scene ${peakPos229.sceneIdx} — ${Math.round(peakPos229.recIdx / records.length * 100)}% through the story, before the 60% mark. The central reconciliation arrives too early; the final act has nowhere left to go emotionally.`,
          suggestedFix: 'Reserve the most significant positive relationship shift for the climax or resolution zone (60%+). Let the characters earn their reconciliation at the story\'s peak — the audience must be made to wait for the reward they sense is coming.',
        });
      }
    }
  }
  // ── Wave 243: Conflict recovery too fast, single-pair conflict, conflict purpose monotone ──

  // CONFLICT_RECOVERY_TOO_FAST (minor, n≥8): Every scene with deep negative
  // tension (suspenseDelta < -1.5) is followed within 2 scenes by a clear
  // recovery (suspenseDelta > 1.0). All damage heals before it can accumulate.
  // The story never allows a wound to linger — each crisis is resolved so quickly
  // that pressure never builds, and the audience stops believing the setbacks
  // are permanent. Requires ≥2 deep reversals.
  if (records.length >= 8) {
    const deepReversals243 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => r.suspenseDelta < -1.5);
    if (deepReversals243.length >= 2) {
      const allRecoverFast243 = deepReversals243.every(({ i }: any) => {
        for (let k = i + 1; k <= Math.min(i + 2, records.length - 1); k++) {
          if (records[k].suspenseDelta > 1.0) return true;
        }
        return false;
      });
      if (allRecoverFast243) {
        issues.push({
          location: 'Conflict recovery rhythm',
          rule: 'CONFLICT_RECOVERY_TOO_FAST',
          severity: 'minor',
          description: `Every deep negative tension spike (suspenseDelta < -1.5) recovers with a positive beat (>1.0) within 2 scenes — all ${deepReversals243.length} setbacks heal before they can accumulate. The audience stops believing the reversals are permanent because the story refuses to let damage linger.`,
          suggestedFix: 'Let at least one wound stay open for 3-4 scenes before relief arrives. When every crisis resolves immediately, pressure never builds to an unbearable level — the climax can\'t feel like the worst moment if every prior moment of danger was fixed by the next scene.',
        });
      }
    }
  }

  // SINGLE_PAIR_CONFLICT (minor, n≥8): All negative relationship shifts
  // (amount < -0.3) involve only one pair, while ≥2 total pairs are tracked.
  // The antagonistic load is carried by a single feud; every other relationship
  // in the story remains frictionless. Conflict that lives in only one pair
  // lacks the multi-front pressure that forces genuine crisis. Distinct from
  // GOAL_WITHOUT_OPPOSITION (which fires when there's NO opposition) — this
  // fires when opposition exists but is limited to one pair.
  {
    const allActivePairs243 = new Set<string>();
    for (const r of records) for (const s of (r.relationshipShifts ?? [])) allActivePairs243.add((s as any).pairKey);
    if (records.length >= 8 && allActivePairs243.size >= 2) {
      const conflictingPairs243 = new Set<string>();
      for (const r of records) {
        for (const shift of (r.relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>) {
          if (shift.amount < -0.3) conflictingPairs243.add(shift.pairKey);
        }
      }
      if (conflictingPairs243.size === 1) {
        const [onlyPair243] = conflictingPairs243;
        issues.push({
          location: `Conflict: ${onlyPair243}`,
          rule: 'SINGLE_PAIR_CONFLICT',
          severity: 'minor',
          description: `All negative relationship shifts (amount < -0.3) involve the same pair ("${onlyPair243}") — the entire antagonistic load of the story is carried by one feud. Every other relationship remains frictionless. Multi-front conflict creates genuine crisis; a single-pair conflict is a dispute, not a war.`,
          suggestedFix: 'Introduce negative pressure in at least one other relationship: a second rivalry, a loyalty strained by a third party, or an alliance under stress. Protagonists under pressure on multiple fronts simultaneously face more complex, higher-stakes choices.',
        });
      }
    }
  }

  // CONFLICT_PURPOSE_MONOTONE (minor, n≥8): All scenes carrying strong conflict
  // signals (suspenseDelta < -1 OR any relationship shift ≤ -0.3) share the same
  // purpose label — the story can only deliver antagonistic pressure in one
  // structural mode. Three or more such scenes all labelled "confrontation" (or
  // any single label) suggests the conflict register is locked: every crisis looks
  // the same. Requires ≥3 conflict events with the same purpose.
  if (records.length >= 8) {
    const conflictScenePurposes243 = records
      .filter(r =>
        r.suspenseDelta < -1 ||
        (r.relationshipShifts ?? []).some((s: any) => s.amount <= -0.3),
      )
      .map(r => r.purpose);
    if (conflictScenePurposes243.length >= 3) {
      const purposeMap243 = new Map<string, number>();
      for (const p of conflictScenePurposes243) {
        purposeMap243.set(p, (purposeMap243.get(p) ?? 0) + 1);
      }
      const [domPurpose243, domCount243] = [...purposeMap243.entries()].sort((a, b) => b[1] - a[1])[0];
      if (domCount243 === conflictScenePurposes243.length) {
        issues.push({
          location: 'Conflict scene purpose register',
          rule: 'CONFLICT_PURPOSE_MONOTONE',
          severity: 'minor',
          description: `All ${domCount243} conflict scenes (suspenseDelta < -1 or strong negative shift) share the same purpose label ("${domPurpose243}") — the story delivers antagonistic pressure in only one structural mode. Every conflict scene looks the same at the functional level.`,
          suggestedFix: `Vary the structural vessel for conflict: not every crisis needs to be a "${domPurpose243}". A revelation scene can carry as much antagonistic load as a confrontation; a character-development scene can contain the story's sharpest friction. Varied conflict modes keep the audience from predicting the next crisis shape.`,
        });
      }
    }
  }
  // ── End Wave 243 ─────────────────────────────────────────────────────────────

  // ── End Wave 229 ─────────────────────────────────────────────────────────────

  // ── Wave 257: Conflict Act 3 absent, reconciliation absent, conflict opening void ──

  // A scene carries a conflict signal when it has deep negative tension OR any
  // strong negative relationship shift. Shared by the three Wave 257 checks.
  const isConflictScene257 = (r: any): boolean =>
    (r.suspenseDelta ?? 0) < -1 ||
    (r.relationshipShifts ?? []).some((s: any) => s.amount <= -0.3);

  // CONFLICT_ACT3_ABSENT (major, n≥8): The story carries conflict in its first
  // 75% but Act 3 (final 25%) has no conflict signal at all — the climax act
  // resolves without struggle. The protagonist coasts to the ending with no
  // antagonistic pressure in the very stretch that should hold the story's
  // hardest opposition. Only fires when conflict exists earlier (otherwise
  // GOAL_WITHOUT_OPPOSITION already covers the conflictless case).
  if (records.length >= 8) {
    const act3Start257 = Math.floor(records.length * 0.75);
    const earlyConflict257 = records.slice(0, act3Start257).some(isConflictScene257);
    const act3Conflict257 = records.slice(act3Start257).some(isConflictScene257);
    if (earlyConflict257 && !act3Conflict257) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start257}–${records.length - 1}) — conflict layer`,
        rule: 'CONFLICT_ACT3_ABSENT',
        severity: 'major',
        description: `The story carries conflict through its first 75% but Act 3 (Scenes ${act3Start257}–${records.length - 1}) has no conflict signal — no deep tension drop, no strong negative relationship shift. The climax act resolves without struggle; the protagonist coasts to the ending in the stretch that should hold the story's fiercest opposition.`,
        suggestedFix: 'Load the final act with its hardest opposition: the antagonist\'s last and strongest move, a betrayal that lands at the worst moment, a setback that makes victory seem impossible. The climax must be the point of maximum pressure, not its release.',
      });
    }
  }

  // RECONCILIATION_ABSENT (minor, n≥8, ≥2 broken pairs): Two or more pairs suffer
  // a strong relational rupture (a shift ≤ -0.4) but not one of them ever recovers
  // with a later positive shift (≥ +0.3). Every broken bond stays broken — the
  // story fractures relationships and never repairs a single one. While some
  // ruptures should be permanent, a cast in which nobody ever reconciles offers no
  // relational catharsis. Distinct from CONFLICT_RECOVERY_TOO_FAST (suspense, and
  // its opposite failure); this is the relational-repair arc end to end.
  if (records.length >= 8) {
    const brokenPairs257 = new Map<string, number>(); // pairKey → scene index of rupture
    for (let i = 0; i < records.length; i++) {
      for (const s of (records[i].relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>) {
        if (s.amount <= -0.4 && !brokenPairs257.has(s.pairKey)) brokenPairs257.set(s.pairKey, i);
      }
    }
    if (brokenPairs257.size >= 2) {
      const anyReconciled257 = [...brokenPairs257.entries()].some(([pairKey, ruptureIdx]) => {
        for (let j = ruptureIdx + 1; j < records.length; j++) {
          if ((records[j].relationshipShifts ?? []).some((s: any) => s.pairKey === pairKey && s.amount >= 0.3)) {
            return true;
          }
        }
        return false;
      });
      if (!anyReconciled257) {
        issues.push({
          location: 'Relational repair arc',
          rule: 'RECONCILIATION_ABSENT',
          severity: 'minor',
          description: `${brokenPairs257.size} relationships suffer a strong rupture (shift ≤ -0.4) but not one of them ever recovers with a later positive shift — every broken bond stays broken. The story fractures relationships and repairs none, leaving the cast with no relational catharsis.`,
          suggestedFix: 'Let at least one broken relationship find its way back — a reconciliation, a hard-won forgiveness, an alliance reforged in the climax. Not every rupture must heal, but a story where none do denies the audience the release that comes from a bond restored.',
        });
      }
    }
  }

  // CONFLICT_OPENING_VOID (minor, n≥8): Act 1 (first 25%) contains no conflict
  // signal while conflict exists later — the story opens frictionless and the
  // inciting tension arrives late. An opening with no friction gives the audience
  // nothing to lean into; the dramatic question should be posed, and resisted,
  // from the first act. Distinct from causality's CAUSAL_ACT1_VOID (any causal
  // thread); this fires specifically on the absence of opposition in the opening.
  if (records.length >= 8) {
    const act1End257 = Math.floor(records.length * 0.25);
    const act1Recs257 = records.slice(0, act1End257);
    if (act1Recs257.length >= 2) {
      const act1Conflict257 = act1Recs257.some(isConflictScene257);
      const laterConflict257 = records.slice(act1End257).some(isConflictScene257);
      if (!act1Conflict257 && laterConflict257) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End257 - 1}) — conflict layer`,
          rule: 'CONFLICT_OPENING_VOID',
          severity: 'minor',
          description: `Act 1 (the first ${act1End257} scenes) contains no conflict signal — no tension drop, no negative relationship shift — yet the story develops conflict later. The opening is frictionless and the inciting opposition arrives late, giving the audience nothing to lean into from the start.`,
          suggestedFix: 'Pose the dramatic question early and let something resist it in Act 1: a friction between characters, an obstacle that bites, a threat that announces itself. An opening with no opposition reads as preamble; the conflict should be felt before the first act ends.',
        });
      }
    }
  }

  // ── Wave 271: CONFLICT_ACT2B_VOID ─────────────────────────────────────────
  // Act 2b (the 50-75% zone, the "dark night" stretch before the final push)
  // has no conflict signal while overall conflict exists. The zone that should
  // hold the protagonist's lowest moment and the antagonist's strongest move
  // is empty. The story has tension in the opening half and in the climax, but
  // the bridge between them — where stakes should be at their heaviest — is
  // inert. Distinct from CONFLICT_MIDPOINT_ABSENT (midpoint ±1 window only)
  // and CONFLICT_ACT3_DEFLATION (comparing averages, not checking for void).
  // Requires 10+ records and 2+ overall conflict scenes.
  if (records.length >= 10) {
    const act2bStart271 = Math.floor(records.length * 0.5);
    const act2bEnd271 = Math.floor(records.length * 0.75);
    const overallConflict271 = records.filter(isConflictScene257).length;
    if (overallConflict271 >= 2) {
      const act2bConflict271 = records.slice(act2bStart271, act2bEnd271).filter(isConflictScene257).length;
      if (act2bConflict271 === 0) {
        issues.push({
          location: `Act 2b (scenes ${act2bStart271}–${act2bEnd271 - 1}) — conflict layer`,
          rule: 'CONFLICT_ACT2B_VOID',
          severity: 'minor',
          description: `The Act 2b zone (scenes ${act2bStart271}–${act2bEnd271 - 1}) has no conflict signal — no tension drop, no negative relationship shift — while the first half and climax both carry conflict. The stretch that should hold the protagonist's lowest moment and the antagonist's strongest move is inert; the bridge to the climax has no dramatic engine.`,
          suggestedFix: 'Put the story\'s hardest moment in Act 2b: a betrayal that isolates the protagonist, a failure that seems final, a revelation that reframes everything. The "dark night" zone needs the story\'s highest conflict density, not its lowest.',
        });
      }
    }
  }

  // ── Wave 271: INTERPERSONAL_CONFLICT_ONLY ─────────────────────────────────
  // The story carries 3+ scenes with negative relationship shifts but no scene
  // delivers an atmospheric tension reversal (suspenseDelta < -1). All conflict
  // is interpersonal — characters wound each other — but nothing external
  // threatens them: no plot reversals, no danger, no external pressure. The
  // mirror of ANTAGONIST_FORCE_ONLY (which fires when all conflict is external
  // with no interpersonal dimension). A story without any plot reversal can
  // read as a domestic chamber drama even when the subject demands external
  // stakes. Requires 6+ records.
  if (records.length >= 6) {
    const negRelShiftScenes271 = records.filter(r =>
      ((r.relationshipShifts as any[] ?? [])).some((s: any) => s.amount <= -0.3),
    );
    if (negRelShiftScenes271.length >= 3) {
      const hasSuspenseReversal271 = records.some(r => (r.suspenseDelta ?? 0) < -1);
      if (!hasSuspenseReversal271) {
        issues.push({
          location: 'Conflict architecture',
          rule: 'INTERPERSONAL_CONFLICT_ONLY',
          severity: 'minor',
          description: `${negRelShiftScenes271.length} scenes carry negative relationship shifts but no scene delivers a tension reversal (suspenseDelta < -1) — all conflict is interpersonal with zero external plot pressure. Characters wound each other but nothing external threatens them; the story has friction without danger.`,
          suggestedFix: 'Add at least one scene where external circumstances create a reversal: a plan that fails, a threat that arrives unexpectedly, a deadline that bites. External pressure transforms interpersonal friction from a slow burn into unavoidable confrontation with genuine stakes.',
        });
      }
    }
  }

  // ── Wave 271: CONFLICT_PAIR_DENSITY_GAP ───────────────────────────────────
  // Three or more pairs are involved in negative relationship shifts, but one
  // pair accumulates at least 3× as many negative conflict events as the next
  // most active pair. The conflict load is unevenly distributed — one feud
  // dominates while others exist as background friction that never escalates.
  // Distinct from SINGLE_PAIR_CONFLICT (only one pair with any conflict); this
  // fires when multiple pairs have conflict but one pair crushes all others.
  // Requires 6+ records and 3+ pairs with negative shifts.
  if (records.length >= 6) {
    const pairNegCounts271 = new Map<string, number>();
    for (const r of records) {
      for (const s of (r.relationshipShifts as any[] ?? []) as Array<{ pairKey: string; amount: number }>) {
        if (s.amount <= -0.3) {
          pairNegCounts271.set(s.pairKey, (pairNegCounts271.get(s.pairKey) ?? 0) + 1);
        }
      }
    }
    if (pairNegCounts271.size >= 3) {
      const sorted271 = [...pairNegCounts271.entries()].sort((a, b) => b[1] - a[1]);
      const dominantCount271 = sorted271[0][1];
      const secondCount271 = sorted271[1][1];
      if (dominantCount271 >= 3 * secondCount271) {
        issues.push({
          location: `Conflict distribution — "${sorted271[0][0]}" dominant`,
          rule: 'CONFLICT_PAIR_DENSITY_GAP',
          severity: 'minor',
          description: `"${sorted271[0][0]}" accumulates ${dominantCount271} negative conflict events — at least 3× more than any other pair (next: ${secondCount271}). While ${pairNegCounts271.size} pairs carry conflict, one feud so dominates the dramatic load that all others register as background noise. The antagonistic architecture collapses into a single overwhelming dispute.`,
          suggestedFix: 'Raise the conflict stakes in at least one secondary pair so it approaches the dominant pair\'s density. Layered conflict — two or three pairs with comparably high friction — creates a richer dramatic web than a single dominant feud surrounded by quiet bystanders.',
        });
      }
    }
  }

  // ── Wave 285: CONFLICT_SUSPENSE_DECOUPLED ────────────────────────────────
  // Scenes with negative relationship shifts (conflict scenes) have no
  // corresponding suspense lift — their average suspenseDelta is ≤ 0.
  // Conflict and suspense should reinforce each other; when conflict scenes
  // produce zero suspense, they feel consequence-free and the audience
  // disengages. Requires 8+ records and 3+ conflict scenes.
  if (records.length >= 8) {
    const conflictScenes285 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictScenes285.length >= 3) {
      const avgSuspense285 = conflictScenes285.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / conflictScenes285.length;
      if (avgSuspense285 <= 0) {
        issues.push({
          location: 'Conflict scenes — suspense decoupled',
          rule: 'CONFLICT_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `${conflictScenes285.length} conflict scene(s) have an average suspenseDelta of ${avgSuspense285.toFixed(2)} — conflict is not generating suspense. When confrontations fail to raise tension, the audience reads them as consequence-free arguments rather than dramatic turning points. Conflict without suspense is noise.`,
          suggestedFix: 'Raise the stakes in each conflict scene: add a ticking deadline, an unexpected revelation, a power shift, or an irreversible action that could end the relationship. Suspense comes from uncertainty — the audience must believe the worst outcome is possible.',
        });
      }
    }
  }

  // ── Wave 285: NEGATIVE_SPIRAL_UNBROKEN ───────────────────────────────────
  // Four or more consecutive scenes have negative emotional shifts with no
  // neutral or positive break. An unbroken descent exhausts the audience —
  // they become desensitized to negative beats and stop believing each new
  // blow matters. Even the darkest stories need a single breath of relief
  // before the next descent to maintain emotional responsiveness.
  // Requires 8+ records.
  if (records.length >= 8) {
    let spiralLen285 = 0;
    let maxSpiral285 = 0;
    let spiralStart285 = -1;
    let maxSpiralStart285 = -1;
    for (let i285 = 0; i285 < records.length; i285++) {
      if ((records as any[])[i285].emotionalShift === 'negative') {
        if (spiralLen285 === 0) spiralStart285 = i285;
        spiralLen285++;
        if (spiralLen285 > maxSpiral285) {
          maxSpiral285 = spiralLen285;
          maxSpiralStart285 = spiralStart285;
        }
      } else {
        spiralLen285 = 0;
      }
    }
    if (maxSpiral285 >= 4) {
      issues.push({
        location: `Scenes ${maxSpiralStart285}–${maxSpiralStart285 + maxSpiral285 - 1} — negative spiral`,
        rule: 'NEGATIVE_SPIRAL_UNBROKEN',
        severity: 'minor',
        description: `${maxSpiral285} consecutive scenes (${maxSpiralStart285}–${maxSpiralStart285 + maxSpiral285 - 1}) have negative emotional shifts with no neutral or positive break. An unbroken descent desensitizes the audience — each new blow registers with less impact than the last. Even a brief moment of relief or dark humor between negative beats resets the audience's capacity for distress.`,
        suggestedFix: 'Insert a single neutral or positive beat within the spiral — a small victory, a moment of gallows humor, a character reconnection before the next blow. The beat does not need to resolve anything; it just gives the audience permission to breathe before the next descent.',
      });
    }
  }

  // ── Wave 285: CONFLICT_RESOLUTION_PREMATURE ──────────────────────────────
  // The dominant conflict pair (most negative shifts) has all of its
  // negative events in the first 75% of the story, and the final quarter
  // has no negative shifts from that pair. The central conflict resolves
  // before the climax — the story continues but the engine is off.
  // Requires 8+ records and 4+ negative events from the dominant pair.
  if (records.length >= 8) {
    const pairNegEvents285 = new Map<string, number[]>();
    for (const r of records as any[]) {
      for (const s of ((r.relationshipShifts as any[] ?? []) as Array<{ pairKey: string; amount: number }>)) {
        if (s.amount <= -0.3) {
          const arr = pairNegEvents285.get(s.pairKey) ?? [];
          arr.push(r.sceneIdx);
          pairNegEvents285.set(s.pairKey, arr);
        }
      }
    }
    if (pairNegEvents285.size >= 1) {
      const sorted285 = [...pairNegEvents285.entries()].sort((a, b) => b[1].length - a[1].length);
      const [dominantPair285, dominantScenes285] = sorted285[0];
      if (dominantScenes285.length >= 4) {
        const finalStart285 = Math.floor(records.length * 0.75);
        const lateEvents285 = dominantScenes285.filter(idx => idx >= finalStart285);
        if (lateEvents285.length === 0) {
          issues.push({
            location: `Dominant conflict pair "${dominantPair285}" — resolves before climax`,
            rule: 'CONFLICT_RESOLUTION_PREMATURE',
            severity: 'minor',
            description: `"${dominantPair285}" drives ${dominantScenes285.length} negative conflict events but none occur in the final quarter (scene ${finalStart285}+). The central conflict resolves before the climax — the story continues but the dramatic engine has already switched off. The final act plays out in the aftermath of a conflict that is already settled.`,
            suggestedFix: 'Extend the central conflict into the final quarter: add a late reversal, an unexpected re-escalation, or a final confrontation that must be resolved at the climax. The dominant conflict pair should be unresolved until the final act — early resolution steals the climax.',
          });
        }
      }
    }
  }

  // ── Wave 299: CONFLICT_EMOTION_DECOUPLED ─────────────────────────────────
  // Scenes carrying negative relationship shifts (conflict scenes) are all
  // emotionally neutral — the fights leave no mark on anyone's emotional
  // state. Distinct from CONFLICT_SUSPENSE_DECOUPLED (which audits the
  // suspense channel): this audits the emotional channel. A confrontation
  // that changes a relationship but moves no one emotionally reads as a
  // transaction, not a fight. Requires 8+ records and 3+ conflict scenes.
  if (records.length >= 8) {
    const conflictScenes299 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictScenes299.length >= 3 && conflictScenes299.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Conflict scenes — emotionally neutral',
        rule: 'CONFLICT_EMOTION_DECOUPLED',
        severity: 'minor',
        description: `All ${conflictScenes299.length} conflict scenes (negative relationship shifts) carry a neutral emotional shift — relationships fracture but nobody feels anything. A confrontation that changes a bond without moving anyone emotionally reads as a transaction: the audience sees the ledger update but never the cost. Conflict's currency is feeling.`,
        suggestedFix: 'Let at least one fight land emotionally: the scene where a bond breaks should also be the scene where someone\'s emotional state turns — anger curdling to grief, betrayal hardening to resolve. If a relationship can sour without anyone caring, the audience will conclude the relationship never mattered.',
      });
    }
  }

  // ── Wave 299: STAKES_LABEL_UNBACKED ──────────────────────────────────────
  // Two or more scenes are tagged with purpose "raise_stakes" but none of
  // them carries any conflict marker — no negative relationship shift, no
  // suspense rise, no clock raised. The structure claims stakes are rising
  // while the scene data shows nothing at risk: the label is unbacked by
  // dramatic content. Requires 8+ records.
  if (records.length >= 8) {
    const stakesScenes299 = (records as any[]).filter(r => r.purpose === 'raise_stakes');
    if (stakesScenes299.length >= 2) {
      const anyBacked299 = stakesScenes299.some(r =>
        (r.suspenseDelta ?? 0) > 0 ||
        r.clockRaised === true ||
        ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      if (!anyBacked299) {
        issues.push({
          location: 'Scenes tagged raise_stakes',
          rule: 'STAKES_LABEL_UNBACKED',
          severity: 'minor',
          description: `${stakesScenes299.length} scenes are tagged "raise_stakes" but none of them shows a suspense rise, a clock raised, or a relationship souring — the structural label claims escalation while the scene data shows nothing newly at risk. Stakes that are declared rather than dramatized leave the audience told the situation is worse without ever feeling it.`,
          suggestedFix: 'Back each stake-raising scene with a concrete escalation: a deadline introduced, a threat made specific, an ally turned, a cost paid. If a scene cannot show what is newly at risk, retag it honestly as development — a mislabeled scene corrupts the story\'s structural map.',
        });
      }
    }
  }

  // ── Wave 299: ELEVENTH_HOUR_CONFLICT ─────────────────────────────────────
  // A conflict pair's first negative shift ever occurs in the final 10% of
  // the story. A feud introduced this late has no room to escalate, breathe,
  // or resolve — it exists only to inject artificial tension into the finale.
  // Distinct from the Act-3-absence checks (which flag missing late conflict):
  // this flags brand-new conflict arriving too late to mean anything.
  // Requires 10+ records.
  if (records.length >= 10) {
    const firstConflictAt299 = new Map<string, number>();
    for (const r of records as any[]) {
      for (const s of ((r.relationshipShifts as any[] ?? []) as Array<{ pairKey: string; amount: number }>)) {
        if (s.amount <= -0.3 && !firstConflictAt299.has(s.pairKey)) {
          firstConflictAt299.set(s.pairKey, r.sceneIdx);
        }
      }
    }
    const lateCutoff299 = Math.floor(records.length * 0.9);
    const elevenths299 = [...firstConflictAt299.entries()].filter(([, idx]) => idx >= lateCutoff299);
    if (elevenths299.length > 0 && firstConflictAt299.size > elevenths299.length) {
      const [latePair299, lateIdx299] = elevenths299[0];
      issues.push({
        location: `Scene ${lateIdx299} — first conflict for "${latePair299}"`,
        rule: 'ELEVENTH_HOUR_CONFLICT',
        severity: 'minor',
        description: `The conflict between "${latePair299}" first appears at scene ${lateIdx299} — inside the final 10% of the story. A feud introduced this late has no room to escalate or resolve; it reads as artificial tension injected into the finale rather than a fault line the story has been tracking. Late conflict the audience never saw coming (and never sees settled) leaves the ending cluttered.`,
        suggestedFix: `Either seed the "${latePair299}" friction earlier — a cold exchange, a competing interest, a small betrayal in Act 2 that makes the late rupture feel inevitable — or cut the late conflict entirely and spend the finale resolving the conflicts the story has already earned.`,
      });
    }
  }

  // ── Wave 313: CONFLICT_CURIOSITY_DECOUPLED ───────────────────────────────
  // Conflict scenes (negative relationship shifts) have an average curiosityDelta
  // of zero or below — confrontations resolve the audience's "what happens next?"
  // to nothing. Completes the conflict-channel trilogy alongside CONFLICT_SUSPENSE_
  // DECOUPLED (tension) and CONFLICT_EMOTION_DECOUPLED (feeling): a fight that
  // raises no question leaves the audience watching an argument with no forward
  // pull. Requires 8+ records and 3+ conflict scenes.
  if (records.length >= 8) {
    const conflictScenes313 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictScenes313.length >= 3) {
      const avgCuriosity313 = conflictScenes313.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / conflictScenes313.length;
      if (avgCuriosity313 <= 0) {
        issues.push({
          location: 'Conflict scenes — curiosity decoupled',
          rule: 'CONFLICT_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `${conflictScenes313.length} conflict scenes have an average curiosityDelta of ${avgCuriosity313.toFixed(2)} — confrontations resolve the audience's "what happens next?" to nothing. A fight should open questions as well as wounds: who will retaliate, what was really meant, what this costs. Conflict that raises no question is an argument with no forward pull.`,
          suggestedFix: 'End conflict scenes on an open question, not a closed one: a threat half-made, a secret half-revealed, an alliance left uncertain. The audience should leave each confrontation needing the next scene — curiosity is the thread that pulls them through the fight.',
        });
      }
    }
  }

  // ── Wave 313: CONFLICT_MAGNITUDE_PEAK_EARLY ──────────────────────────────
  // The scene carrying the heaviest relational conflict (the largest summed
  // magnitude of negative shifts) falls in the first half of the story, while
  // conflict is distributed rather than concentrated (the peak holds under 60%
  // of total conflict mass, so this is not a single-set-piece spike). The
  // biggest rupture lands in the setup and nothing later surpasses it — the
  // climax inherits a conflict that already peaked. Distinct from the suspense-
  // based ESCALATION_PLATEAU/CLIMAX_APPROACH_FLAT and from CONFLICT_CONCENTRATION_
  // SPIKE (single scene ≥60% of mass). Requires 10+ records and 3+ conflict scenes.
  if (records.length >= 10) {
    const mags313 = (records as any[]).map(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>)
        .filter(s => s.amount < 0)
        .reduce((acc, s) => acc + Math.abs(s.amount), 0),
    );
    const conflictSceneCount313 = mags313.filter(m => m > 0).length;
    const totalMass313 = mags313.reduce((a, b) => a + b, 0);
    const peakMass313 = Math.max(...mags313);
    const peakIdx313 = mags313.indexOf(peakMass313);
    const half313 = Math.floor(records.length * 0.5);
    if (
      conflictSceneCount313 >= 3 &&
      totalMass313 >= 1.5 &&
      peakMass313 > 0 &&
      peakIdx313 < half313 &&
      peakMass313 < 0.6 * totalMass313
    ) {
      issues.push({
        location: `Scene ${(records as any[])[peakIdx313].sceneIdx} — conflict magnitude peak`,
        rule: 'CONFLICT_MAGNITUDE_PEAK_EARLY',
        severity: 'minor',
        description: `The heaviest relational conflict (magnitude ${peakMass313.toFixed(2)}) falls at Scene ${(records as any[])[peakIdx313].sceneIdx}, in the first half of the story, and nothing later surpasses it. The biggest rupture lands in the setup, so the climax inherits a conflict that already peaked — the back half can only echo a blow the audience has already absorbed.`,
        suggestedFix: 'Reserve the heaviest rupture for the climax. Either soften the early peak so a later confrontation can exceed it, or escalate the back half — a deeper betrayal, a higher-stakes break — so the relational conflict curve rises toward the ending rather than away from it.',
      });
    }
  }

  // ── Wave 313: CONFLICT_RELENTLESS_RUN ────────────────────────────────────
  // Four or more consecutive scenes each carry a negative relationship shift,
  // with no respite scene between them. Unbroken relational conflict exhausts
  // the audience: with no breather, each new rupture lands softer than the last
  // and the pressure flattens into noise. Distinct from NEGATIVE_SPIRAL_UNBROKEN
  // (consecutive negative emotionalShift) and CONFLICT_FATIGUE (rapid reversal
  // oscillation): this tracks an unbroken run on the relationship-shift channel.
  // Requires 8+ records.
  if (records.length >= 8) {
    const isConflict313 = (r: any) =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    let runC313 = 0;
    let startC313 = 0;
    let maxRunC313 = 0;
    let maxStartC313 = 0;
    for (let i313 = 0; i313 < records.length; i313++) {
      if (isConflict313((records as any[])[i313])) {
        if (runC313 === 0) startC313 = i313;
        runC313++;
        if (runC313 > maxRunC313) { maxRunC313 = runC313; maxStartC313 = startC313; }
      } else {
        runC313 = 0;
      }
    }
    if (maxRunC313 >= 4) {
      const s313 = (records as any[])[maxStartC313].sceneIdx;
      const e313 = (records as any[])[maxStartC313 + maxRunC313 - 1].sceneIdx;
      issues.push({
        location: `Scenes ${s313}–${e313} — relentless conflict`,
        rule: 'CONFLICT_RELENTLESS_RUN',
        severity: 'minor',
        description: `${maxRunC313} consecutive scenes (${s313}–${e313}) each carry a negative relationship shift with no respite between them. Unbroken relational conflict exhausts the audience: with no breather, each new rupture lands softer than the last and the mounting pressure flattens into noise rather than building.`,
        suggestedFix: 'Insert a respite within the run — a scene of détente, a shared moment, a temporary alliance — before resuming the conflict. The contrast lets the next rupture register; relentless souring desensitizes the audience to the very damage the story is trying to make them feel.',
      });
    }
  }

  // ── Wave 338: CONFLICT_CLOCK_DECOUPLED, CONFLICT_DRAMATIC_TURN_VOID, CONFLICT_FIRST_HALF_MONOPOLY ──

  // CONFLICT_CLOCK_DECOUPLED (minor, n≥8, ≥2 clock-raised scenes): Two or more scenes
  // raise a deadline (clockRaised === true) and not one of them carries a negative
  // relationship shift — deadlines without relational friction. A ticking clock should
  // pressure the characters, and pressure cracks bonds: characters disagree about how to
  // respond, blame each other for the predicament, or betray one another under the
  // urgency. When every clock scene is relationally placid, the deadline is a prop that
  // creates urgency in the plot while leaving the characters untouched by each other.
  // Distinct from CONFLICT_SUSPENSE_DECOUPLED (suspenseDelta on conflict scenes) and
  // THREAT_AMNESIA (clock forgotten in second half — timing, not relational impact).
  if (records.length >= 8) {
    const clockScenes338 = (records as any[]).filter(r => r.clockRaised === true);
    const isClockConflict338 = (r: any) => ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    if (clockScenes338.length >= 2 && !clockScenes338.some(isClockConflict338)) {
      issues.push({
        location: `${clockScenes338.length} clock-raised scene(s) — none carry relational conflict`,
        rule: 'CONFLICT_CLOCK_DECOUPLED',
        severity: 'minor',
        description: `${clockScenes338.length} scenes raise a clock (clockRaised) but none carry a negative relationship shift — deadlines without relational friction. A ticking clock should pressure the people in the story: under time pressure, characters disagree about how to respond, blame each other, make desperate deals, or betray one another. When every clock scene is relationally placid, the deadline is a prop that drives plot urgency while leaving the characters untouched by each other.`,
        suggestedFix: "Let the deadline crack something: a clock scene is an opportunity to reveal what a character will sacrifice under pressure. At least one clock scene should carry a negative relationship shift — the moment urgency forces a choice that damages a bond, making the ticking clock cost something interpersonal as well as practical.",
      });
    }
  }

  // CONFLICT_DRAMATIC_TURN_VOID (minor, n≥10, ≥3 dramatic turn scenes): Three or more
  // scenes contain a genuine dramatic turn (reversal, recognition, or twist — not
  // 'nothing') and not one of them carries a negative relationship shift — pivots
  // that leave every bond intact. A dramatic turn should rearrange the forces in the
  // story, which means rearranging relationships: a reversal that exposes a betrayal,
  // a recognition that shatters a partnership, a twist that creates a new enemy. When
  // the story's turning points are relationally inert, they move the plot without
  // moving the people. Distinct from ARC_TURN_EMOTION_ABSENT (emotion not relationship
  // shifts) and CONFLICT_CURIOSITY_DECOUPLED (curiosity on conflict scenes, not turns).
  if (records.length >= 10) {
    const turnScenes338 = (records as any[]).filter(r => r.dramaticTurn && r.dramaticTurn !== 'nothing');
    const isTurnConflict338 = (r: any) => ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    if (turnScenes338.length >= 3 && !turnScenes338.some(isTurnConflict338)) {
      issues.push({
        location: 'Dramatic-turn scenes',
        rule: 'CONFLICT_DRAMATIC_TURN_VOID',
        severity: 'minor',
        description: `${turnScenes338.length} dramatic turn scenes (reversals, recognitions, twists) none of which carry a negative relationship shift — pivots that leave every bond intact. A dramatic turn should rearrange the forces in the story, which means rearranging relationships: a reversal that exposes a betrayal, a recognition that shatters a partnership, a twist that creates a new enemy. When the story's turning points are relationally inert, they move the plot while leaving the people in it unchanged.`,
        suggestedFix: "Give at least one dramatic turn a relational cost: the moment the story changes direction should also be a moment when a relationship changes direction. A turn that costs someone a bond — or reveals that a bond was never what it seemed — lands twice: once in the plot, once in the heart.",
      });
    }
  }

  // CONFLICT_FIRST_HALF_MONOPOLY (minor, n≥10, ≥4 conflict scenes): More than 70%
  // of all conflict scenes (scenes with at least one negative relationship shift of
  // magnitude ≥ 0.3) fall in the first half of the story. All the relational damage
  // is done early, leaving the second half with nothing to escalate against. The
  // climax inherits relationships that have already been battered down rather than
  // bonds still cracking under growing pressure. Distinct from CONFLICT_MAGNITUDE_
  // PEAK_EARLY (the heaviest single rupture in first half — this checks proportion
  // of all conflict scenes), ESCALATION_PLATEAU (peak then stalls — different
  // mechanism), and ANTAGONIST_VANISH (dramatic reversals timing, not relational scenes).
  if (records.length >= 10) {
    const allConflict338 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3)
    );
    if (allConflict338.length >= 4) {
      const half338 = Math.floor(records.length * 0.5);
      const firstHalfConflict338 = allConflict338.filter(r => (records as any[]).indexOf(r) < half338);
      const ratio338 = firstHalfConflict338.length / allConflict338.length;
      if (ratio338 > 0.7) {
        issues.push({
          location: `${firstHalfConflict338.length} of ${allConflict338.length} conflict scenes in first half (${Math.round(ratio338 * 100)}%)`,
          rule: 'CONFLICT_FIRST_HALF_MONOPOLY',
          severity: 'minor',
          description: `${firstHalfConflict338.length} of ${allConflict338.length} conflict scenes (${Math.round(ratio338 * 100)}%) fall in the first half of the story — all the relational damage is done early and the second half has nothing to escalate against. When the majority of conflict front-loads, the climax arrives after relationships have already been battered down rather than at the moment when bonds are at maximum strain.`,
          suggestedFix: "Redistribute conflict across the arc: hold back some of the most damaging ruptures for the second half so the climax arrives at the worst point in the relationships rather than on the far side of them. The audience should feel that bonds are at their most strained precisely when the story reaches its peak.",
        });
      }
    }
  }

  // ── Wave 352: CONFLICT_PEAK_SUSPENSE_ABSENT, CONFLICT_PEAK_EMOTION_ABSENT, CONFLICT_PEAK_CURIOSITY_ABSENT ──
  // The single heaviest bond-rupture in the story (the conflict scene with the largest
  // negative relationship-shift magnitude) should be its most charged moment. These three
  // checks audit that peak scene on each dramatic channel. Distinct from CONFLICT_SUSPENSE_
  // DECOUPLED / CONFLICT_EMOTION_DECOUPLED / CONFLICT_CURIOSITY_DECOUPLED, which average
  // over ALL conflict scenes — these isolate the single most consequential rupture.
  if (records.length >= 8) {
    const conflictRecs352 = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictRecs352.length >= 2) {
      let peakRec352: any = null;
      let peakMag352 = 0;
      for (const r of conflictRecs352) {
        const mag = Math.max(
          ...((r.relationshipShifts ?? []) as Array<{ amount: number }>)
            .filter(s => s.amount <= -0.3)
            .map(s => Math.abs(s.amount)),
        );
        if (mag > peakMag352) { peakMag352 = mag; peakRec352 = r; }
      }
      if (peakRec352) {
        if ((peakRec352.suspenseDelta ?? 0) <= 0) {
          issues.push({
            location: `Scene ${peakRec352.sceneIdx} — peak rupture (magnitude ${peakMag352.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_SUSPENSE_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec352.sceneIdx}, magnitude ${peakMag352.toFixed(2)}) carries a suspenseDelta of ${(peakRec352.suspenseDelta ?? 0).toFixed(2)} — the biggest break in the story generates no tension. The most consequential rupture should be the most dangerous-feeling moment, leaving the audience uncertain what the fracture will cost; when it lands tension-flat, the story's central conflict peaks without anyone feeling the stakes.`,
            suggestedFix: 'Stage the heaviest rupture so it threatens something concrete: the break should put a goal, a life, or a future in jeopardy, not just register as a relationship changing state. The single biggest fracture deserves the story\'s highest suspense, not its flattest.',
          });
        }
        if (peakRec352.emotionalShift === 'neutral') {
          issues.push({
            location: `Scene ${peakRec352.sceneIdx} — peak rupture (magnitude ${peakMag352.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_EMOTION_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec352.sceneIdx}, magnitude ${peakMag352.toFixed(2)}) is emotionally neutral — the biggest break leaves the protagonist unmoved. The most consequential fracture in the story should be felt most acutely; when it registers no emotional shift, the rupture reads as a plot adjustment rather than a loss, and the audience is told the bond broke without being made to feel it break.`,
            suggestedFix: 'Let the heaviest rupture wound: the scene where the most important bond breaks should carry the story\'s sharpest emotional charge — grief, betrayal, rage. The magnitude of a break is measured by how much it costs the person at its center.',
          });
        }
        if ((peakRec352.curiosityDelta ?? 0) <= 0) {
          issues.push({
            location: `Scene ${peakRec352.sceneIdx} — peak rupture (magnitude ${peakMag352.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_CURIOSITY_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec352.sceneIdx}, magnitude ${peakMag352.toFixed(2)}) carries a curiosityDelta of ${(peakRec352.curiosityDelta ?? 0).toFixed(2)} — the biggest break raises no questions about what happens next. A major rupture should leave the audience hungry to know how the characters will live with the fracture; when the peak conflict closes a door without opening one, the story's central break is an endpoint rather than a turn.`,
            suggestedFix: 'Make the heaviest rupture generative: the break should open new uncertainties — what each character does now, what the fracture exposes, who they become without the bond. The biggest conflict should propel the story forward, not just register damage.',
          });
        }
      }
    }
  }

  // ── Wave 366: CONFLICT_PEAK_DRAMATIC_TURN_ABSENT, CONFLICT_PEAK_CLOCK_ABSENT, CONFLICT_LATE_FIRST_RUPTURE ──
  // The first two extend the Wave 352 peak-rupture audit to the dramatic-turn and clock
  // channels; the third audits the timing of the story's first rupture.
  if (records.length >= 8) {
    const conflictRecs366 = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictRecs366.length >= 2) {
      let peakRec366: any = null;
      let peakMag366 = 0;
      for (const r of conflictRecs366) {
        const mag = Math.max(
          ...((r.relationshipShifts ?? []) as Array<{ amount: number }>)
            .filter(s => s.amount <= -0.3)
            .map(s => Math.abs(s.amount)),
        );
        if (mag > peakMag366) { peakMag366 = mag; peakRec366 = r; }
      }
      if (peakRec366) {
        // CONFLICT_PEAK_DRAMATIC_TURN_ABSENT: the heaviest rupture is not a story pivot.
        // Distinct from CONFLICT_DRAMATIC_TURN_VOID (audits whether turn scenes carry a
        // negative shift; this audits whether the peak conflict carries a turn) and from
        // the Wave 352 peak checks (suspense/emotion/curiosity channels).
        if ((peakRec366.dramaticTurn ?? 'nothing') === 'nothing') {
          issues.push({
            location: `Scene ${peakRec366.sceneIdx} — peak rupture (magnitude ${peakMag366.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_DRAMATIC_TURN_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec366.sceneIdx}, magnitude ${peakMag366.toFixed(2)}) carries no dramatic turn — the biggest break is not a story pivot. The single most consequential fracture should reverse, escalate, or recast the situation; when it leaves the plot's trajectory unchanged, the rupture is an event the story passes through rather than a turn the story turns on.`,
            suggestedFix: 'Make the heaviest rupture pivot the story: the break should change what the protagonist is pursuing, expose a new obstacle, or invert an alliance. The biggest fracture in the relational world deserves to be a hinge the plot swings on, not a beat it merely records.',
          });
        }
        // CONFLICT_PEAK_CLOCK_ABSENT: the heaviest rupture adds no time pressure even
        // though the story uses clocks. Distinct from CONFLICT_CLOCK_DECOUPLED (audits
        // whether clock scenes carry conflict; this audits whether the peak conflict
        // raises a clock) and CONFLICT_WITHOUT_DEADLINE.
        const clockScenes366 = (records as any[]).filter(r => r.clockRaised === true);
        if (clockScenes366.length >= 2 && peakRec366.clockRaised !== true) {
          issues.push({
            location: `Scene ${peakRec366.sceneIdx} — peak rupture (magnitude ${peakMag366.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_CLOCK_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec366.sceneIdx}, magnitude ${peakMag366.toFixed(2)}) raises no clock, even though the story uses ${clockScenes366.length} clock-raising scenes elsewhere. The biggest break adds no time pressure — it fractures a bond without tightening the deadline the characters are racing. When the peak conflict and the urgency engine never coincide, the rupture lands in a moment with all the time in the world.`,
            suggestedFix: 'Couple the heaviest rupture to a deadline: let the break that hurts most also shorten the time available — a betrayal that costs a crucial ally just as the clock runs down, a severed bond that forecloses an escape. The biggest fracture is most devastating when there is no time left to repair it.',
          });
        }
      }

      // CONFLICT_LATE_FIRST_RUPTURE (n≥10): the first conflict scene occurs at or after
      // the midpoint — the entire first half is frictionless. Distinct from CONFLICT_
      // OPENING_VOID / CONFLICT_ACT1_ABSENT (the first 25% only) and ELEVENTH_HOUR_
      // CONFLICT (a NEW pair in the final 10%): this fires when no rupture of any kind
      // lands before the 50% mark despite the story containing conflict.
      if (records.length >= 10) {
        const mid366 = Math.floor(records.length * 0.5);
        const firstRuptureIdx366 = conflictRecs366
          .map(r => (records as any[]).indexOf(r))
          .reduce((min, i) => Math.min(min, i), Infinity);
        if (firstRuptureIdx366 >= mid366) {
          issues.push({
            location: `First rupture at Scene ${(records as any[])[firstRuptureIdx366].sceneIdx} (at or past the midpoint)`,
            rule: 'CONFLICT_LATE_FIRST_RUPTURE',
            severity: 'minor',
            description: `The story's first relational rupture lands at Scene ${(records as any[])[firstRuptureIdx366].sceneIdx}, at or past the midpoint — the entire first half is frictionless. With ${conflictRecs366.length} conflict scenes in the story, all of them fall in the back half, so the setup and first complication zone establish the world and the relationships without ever straining a bond. The audience reaches the midpoint with no felt conflict to invest in.`,
            suggestedFix: 'Introduce a rupture in the first half: even a small friction — a broken promise, an eroded trust, a clash of goals — gives the audience a relational stake before the story starts breaking things in earnest. A first half with no conflict trains the audience to expect calm exactly when the story should be teaching them to worry.',
          });
        }
      }
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'conflict', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'conflict',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Conflict pass: escalation is healthy'
      : `Conflict pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}

/** Per-scene conflict signal vector used by the Wave 214 conflict-dynamics checks.
 *  Conflict is modelled as a pressure system: each scene either ADDS external pressure
 *  (rising suspense, a tightening clock), RELEASES it (a reversal that drops suspense),
 *  or inflicts INTERPERSONAL damage (a relationship deteriorating). Decomposing the
 *  signals this way lets the checks reason about the rhythm of escalation and release,
 *  the spatial distribution of conflict mass, and the trend of reversal magnitude —
 *  none of which are visible from a single suspenseDelta threshold. */
interface SceneConflictSignal {
  /** External pressure added this scene: rising suspense + tightening clock */
  escalation: number;
  /** Tension released this scene: a drop in suspense (a reversal/relief valve) */
  release: number;
  /** Interpersonal damage magnitude: summed |amount| of negative relationship shifts */
  interpersonal: number;
  /** Total conflict magnitude concentrated in this scene */
  mass: number;
  /** Whether this scene is a genuine reversal (suspense drops by more than 1) */
  isReversal: boolean;
  /** Magnitude of the reversal (|suspenseDelta|) when this scene is a reversal, else 0 */
  reversalMag: number;
}

function computeConflictDynamics(records: PassInput['records']): SceneConflictSignal[] {
  return records.map((r: any) => {
    const sd = r.suspenseDelta ?? 0;
    const cd = r.clockDelta ?? 0;
    const negRel = ((r.relationshipShifts ?? []) as Array<{ amount: number }>)
      .filter(s => s.amount < 0)
      .reduce((a, s) => a + Math.abs(s.amount), 0);
    const escalation = Math.max(sd, 0) + Math.max(cd, 0);
    const release = Math.max(-sd, 0);
    const interpersonal = negRel;
    const mass = escalation + 2 * interpersonal;
    const isReversal = sd < -1;
    const reversalMag = isReversal ? Math.abs(sd) : 0;
    return { escalation, release, interpersonal, mass, isReversal, reversalMag };
  });
}
