// Wave 39 — Pass 5: Conflict
// Checks conflict escalation: flat arc, missing opposition, collisions not detonated.
// Wave 144 additions: escalation plateau (peak then stalls), confrontation quality,
// and conflict fatigue (reversals too frequent causing audience whiplash).
// Wave 158 additions: threat amnesia (clock established but forgotten in second half),
// antagonist vanish (all reversals in first 60%, none after), and single-register
// conflict (all relationship shifts use the same dimension — one-axis drama).

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
