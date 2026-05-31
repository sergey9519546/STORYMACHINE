// Wave 39 — Pass 2: Causality
// Checks for causal logic breaks: consequences without causes, orphaned facts,
// belief reversals without explanation.

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

export async function causalityPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const curr = records[i];
    const ann = annotations[i];

    // ── Dramatic turn without causal setup ────────────────────────────────
    if (ann && ann.revelation && prev.unresolvedClues.length === 0) {
      // A revelation that has no planted clues in prior records
      const cluesBefore = records.slice(0, i).some(r => r.unresolvedClues.length > 0);
      if (!cluesBefore) {
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'REVELATION_WITHOUT_SETUP',
          description: `Scene ${i} delivers a revelation but no clues were planted in prior scenes`,
          severity: 'critical',
          suggestedFix: 'Add a clue-seeding moment in an earlier scene that anticipates this revelation',
        });
      }
    }

    // ── Suspense drop without a reversal scene ────────────────────────────
    // `dramaticTurn` is a freeform string (deriveDramaticTurn never returns 'none'),
    // so the old `=== 'none'` check was always false and this rule never fired.
    // A sharp suspense drop is *explained* when the scene's purpose releases tension
    // (a resolution, climax, turning point, or revelation). If the drop happens in a
    // non-resolving scene, the deflation has no on-page cause.
    const tensionReleasingPurposes = new Set<string>(['resolution', 'climax', 'turning_point', 'revelation']);
    if (curr.suspenseDelta < -3 && !tensionReleasingPurposes.has(curr.purpose)) {
      issues.push({
        location: `Scene ${i} (${curr.slug})`,
        rule: 'UNEXPLAINED_SUSPENSE_DROP',
        description: `Suspense drops sharply in Scene ${i} but the scene's purpose (${curr.purpose}) does not release tension — the cause of the deflation is unclear`,
        severity: 'minor',
        suggestedFix: 'Add a brief scene of consequence showing why tensions deflated, or recast this scene as a resolution/turning point',
      });
    }

    // ── Consecutive scenes with identical emotional shift ─────────────────
    if (i >= 2 && curr.emotionalShift === prev.emotionalShift && curr.emotionalShift !== 'neutral') {
      const prevPrev = records[i - 2];
      if (!prevPrev) continue;
      if (prevPrev.emotionalShift === curr.emotionalShift) {
        issues.push({
          location: `Scenes ${i - 2}–${i}`,
          rule: 'EMOTIONAL_MONOTONY',
          description: `Three consecutive scenes share the same emotional tone (${curr.emotionalShift}) — no causal variation`,
          severity: 'minor',
          suggestedFix: 'Introduce a brief scene with a contrasting emotional register to create texture',
        });
      }
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'causality', approvedSpans, storyContext: input.storyContext });
  const changed = revised !== fountain;

  return {
    pass: 'causality',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Causality pass: causal logic is sound'
      : `Causality pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
