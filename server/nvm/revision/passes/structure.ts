// Wave 39 — Pass 1: Structure
// Checks act balance: act1 too long, act2 too short, missing midpoint pressure,
// climax approach in wrong position, epilogue missing.

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

export async function structurePass(input: PassInput): Promise<PassResult> {
  const { fountain, structure, records, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];
  const n = records.length;

  // ── Act balance checks ────────────────────────────────────────────────────
  if (structure.completionPercent < 80 && structure.actPosition === 'act3') {
    issues.push({
      location: 'Overall structure',
      rule: 'ACT3_TOO_EARLY',
      description: `Act 3 reached at only ${structure.completionPercent}% completion — the climax arrives too early`,
      severity: 'major',
      suggestedFix: 'Expand Act 2b with additional complications or reversals',
    });
  }

  if (structure.actPosition === 'act1' || structure.actPosition === 'act2a') {
    if (structure.completionPercent > 60) {
      issues.push({
        location: 'Overall structure',
        rule: 'ACT2_TOO_SHORT',
        description: `Story is ${structure.completionPercent}% complete but still in ${structure.actPosition} — Act 2 is truncated`,
        severity: 'critical',
        suggestedFix: 'Add more conflict escalation scenes before the climax',
      });
    }
  }

  // ── Midpoint pressure ─────────────────────────────────────────────────────
  if (n >= 6 && structure.midpointPressure < 1) {
    issues.push({
      location: `Scene ${Math.floor(n / 2)} (midpoint)`,
      rule: 'WEAK_MIDPOINT',
      description: 'Midpoint suspense pressure is flat — the story lacks a dramatic pivot',
      severity: 'major',
      suggestedFix: 'Insert a surprise revelation or reversal at the midpoint scene',
    });
  }

  // ── Tightest scene should be in second half ───────────────────────────────
  if (structure.tightestScene !== null && n > 4 && structure.tightestScene < Math.floor(n * 0.4)) {
    issues.push({
      location: `Scene ${structure.tightestScene}`,
      rule: 'CLIMAX_TOO_EARLY',
      description: 'The most intense scene is in the first 40% of the story — the structure peaks too soon',
      severity: 'major',
      suggestedFix: 'Move the peak intensity scene closer to the third act',
    });
  }

  // ── Missing reversal means flat structure ─────────────────────────────────
  if (structure.reversalCount === 0 && n >= 5) {
    issues.push({
      location: 'Overall structure',
      rule: 'NO_REVERSALS',
      description: 'No dramatic reversals detected — the story progresses in a single direction without opposition',
      severity: 'major',
      suggestedFix: 'Add a scene where a character\'s plan backfires or a situation inverts',
    });
  }

  // ── Rewrite ───────────────────────────────────────────────────────────────
  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'structure', approvedSpans });
  const changed = revised !== fountain;

  return {
    pass: 'structure',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Structure pass: no issues found'
      : `Structure pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
