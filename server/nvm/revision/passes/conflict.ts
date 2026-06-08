// Wave 39 — Pass 5: Conflict
// Checks conflict escalation: flat arc, missing opposition, collisions not detonated.
// Wave 144 additions: escalation plateau (peak then stalls), confrontation quality,
// and conflict fatigue (reversals too frequent causing audience whiplash).
// Wave 158 additions: threat amnesia (clock established but forgotten in second half),
// antagonist vanish (all reversals in first 60%, none after), and single-register
// conflict (all relationship shifts use the same dimension — one-axis drama).
// Wave 257 additions: conflict Act 3 absent (climax without struggle), reconciliation
// absent (no broken bond ever repairs), and conflict opening void (frictionless Act 1).

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
