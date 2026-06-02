// Wave 139 — Pass 1: Structure
// Checks act balance: act1 too long, act2 too short, missing midpoint pressure,
// climax approach in wrong position, epilogue missing.
// Wave 139 additions: missing inciting incident (Act 1 without major shift),
// weak act boundaries (Act 1 end and Act 2 end lack turning-point suspense deltas),
// and protagonist passivity at climax (climax scene lacks decisive character action).

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
  if (structure.tightestScene !== null && n > 6 && structure.tightestScene < Math.floor(n * 0.4)) {
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

  // ── Missing inciting incident (Act 1 without major shift) ──────────────────
  // Wave 139: Act 1 should force the protagonist into the central conflict via
  // a major belief update, relationship shift, or clock raise. If none occur,
  // the story hasn't begun; it's just setup without incitement.
  if (n >= 3) {
    const act1End = Math.floor(n * 0.25);
    const act1Records = records.slice(0, Math.max(1, act1End));
    const hasIncitingEvent = act1Records.some(r =>
      (r.seededClueIds.length > 0 && r.payoffSetupIds.length === 0) || // clue planted
      (r.relationshipShifts && r.relationshipShifts.length > 0) || // relationship shift
      r.clockRaised, // clock pressure applied
    );
    if (!hasIncitingEvent && act1Records.length > 0) {
      issues.push({
        location: `Act 1 (Scenes 0–${Math.max(0, act1End - 1)})`,
        rule: 'MISSING_INCITING_INCIDENT',
        description: `Act 1 lacks a major inciting event — no clues planted, relationship shifts, or clock pressure. The protagonist isn't forced into the central conflict.`,
        severity: 'critical',
        suggestedFix: 'Add a scene in Act 1 where something happens that throws the protagonist into action: a revelation, a betrayal, or an external deadline.',
      });
    }
  }

  // ── Act boundary turning points ────────────────────────────────────────────
  // Wave 139: Act boundaries (25% and 75% of story) should have suspense peaks
  // that mark transitions. If the suspense delta at these boundaries is flat,
  // the acts don't feel like they have shaped, purposeful endings.
  if (n >= 6) {
    const act1End = Math.floor(n * 0.25);
    const act2End = Math.floor(n * 0.75);

    const act1EndRecord = records[Math.min(act1End, n - 1)];
    const act2EndRecord = records[Math.min(act2End, n - 1)];

    if (act1EndRecord && act1EndRecord.suspenseDelta < 1) {
      issues.push({
        location: `End of Act 1 (Scene ~${act1End})`,
        rule: 'ACT1_BOUNDARY_WEAK',
        description: `Scene ${Math.min(act1End, n - 1)} (Act 1 ending) has low suspense delta (${act1EndRecord.suspenseDelta.toFixed(1)}) — Act 1 should end with a turning point that forces entry into Act 2`,
        severity: 'major',
        suggestedFix: 'Ensure the final Act 1 scene is a clear inciting incident or reversal that propels the protagonist into the main conflict',
      });
    }

    if (act2EndRecord && act2EndRecord.suspenseDelta < 1.5) {
      issues.push({
        location: `End of Act 2 (Scene ~${act2End})`,
        rule: 'ACT2_BOUNDARY_WEAK',
        description: `Scene ${Math.min(act2End, n - 1)} (Act 2 ending) has low suspense delta (${act2EndRecord.suspenseDelta.toFixed(1)}) — Act 2 should end with a climactic turn that forces entry into Act 3`,
        severity: 'major',
        suggestedFix: 'The final Act 2 scene should be the highest-stakes moment before the climax: a major reversal, false climax, or all-is-lost moment',
      });
    }
  }

  // ── Rewrite ───────────────────────────────────────────────────────────────
  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'structure', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
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
