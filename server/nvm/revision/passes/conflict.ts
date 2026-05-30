// Wave 39 — Pass 5: Conflict
// Checks conflict escalation: flat arc, missing opposition, collisions not detonated.

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
  const clockRaisedScenes = records.filter(r => r.clockRaised).length;
  const reversalScenes = records.filter(r => r.suspenseDelta < -1).length;
  if (clockRaisedScenes >= 3 && reversalScenes === 0) {
    issues.push({
      location: 'Conflict escalation',
      rule: 'CLOCK_WITHOUT_CONFRONTATION',
      description: `Clock is raised ${clockRaisedScenes} times but no confrontation/reversal follows — ticking clocks need detonation`,
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

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'conflict', approvedSpans, storyContext: input.storyContext });
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
