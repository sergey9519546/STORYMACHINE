// Narrative lint — style and structure checks below the hard-block threshold.
// Flags patterns that are legal but weak: on-the-nose emotion statements,
// belief without source, repeated same-type ops in a single IR, etc.
// Returns LintWarning[] so the cockpit can surface them without blocking.

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryOp } from '../ops/StoryOp.ts';

export interface LintWarning {
  opIdx: number | null;
  op: string;
  rule: string;
  message: string;
  severity: 'warn' | 'info';
}

export function lint(ir: NarrativeTransitionIR, _state: NarrativeState): LintWarning[] {
  const warnings: LintWarning[] = [];

  // Rule 1: dominant emotion with intensity=0 is incoherent
  ir.ops.forEach((op, i) => {
    if (op.op === 'APPRAISE_EMOTION' && op.emotion.intensity === 0) {
      warnings.push({
        opIdx: i, op: op.op, rule: 'EMOTION_ZERO_INTENSITY',
        message: `APPRAISE_EMOTION for "${op.charId}" has intensity=0 but declares dominant="${op.emotion.dominant}"`,
        severity: 'warn',
      });
    }
  });

  // Rule 2: more than 3 UPDATE_BELIEF ops in one IR risks information overload
  const beliefCount = ir.ops.filter(op => op.op === 'UPDATE_BELIEF').length;
  if (beliefCount > 3) {
    warnings.push({
      opIdx: null, op: 'UPDATE_BELIEF', rule: 'BELIEF_OVERLOAD',
      message: `IR contains ${beliefCount} UPDATE_BELIEF ops — consider splitting into multiple transitions`,
      severity: 'warn',
    });
  }

  // Rule 3: SHIFT_RELATIONSHIP with |amount| > 0.8 is a dramatic leap; flag for review
  ir.ops.forEach((op, i) => {
    if (op.op === 'SHIFT_RELATIONSHIP' && Math.abs(op.delta.amount) > 0.8) {
      warnings.push({
        opIdx: i, op: op.op, rule: 'RELATIONSHIP_LEAP',
        message: `SHIFT_RELATIONSHIP between [${op.pair.join(', ')}] amount=${op.delta.amount} — large jump may feel unearned`,
        severity: 'warn',
      });
    }
  });

  // Rule 4: ADVANCE_THEME_ARGUMENT with no prior theme declared in authorIntent
  if (_state.authorIntent.theme === undefined) {
    const hasThemeOp = ir.ops.some(op => op.op === 'ADVANCE_THEME_ARGUMENT');
    if (hasThemeOp) {
      warnings.push({
        opIdx: null, op: 'ADVANCE_THEME_ARGUMENT', rule: 'THEME_UNDECLARED',
        message: 'ADVANCE_THEME_ARGUMENT present but no theme declared in authorIntent',
        severity: 'info',
      });
    }
  }

  // Rule 5: SEED_CLUE with no corresponding RevealPlan — clue may be dangling
  ir.ops.forEach((op, i) => {
    if (op.op === 'SEED_CLUE') {
      const clueId = (op as Extract<StoryOp, { op: 'SEED_CLUE' }>).clueId;
      const hasRevealPlan = (ir.revealPlans ?? []).some(p =>
        p.requiredClueIds.includes(clueId),
      );
      const inState = _state.clues.some(c => c.clueId === clueId);
      if (!hasRevealPlan && !inState) {
        warnings.push({
          opIdx: i, op: op.op, rule: 'ORPHAN_CLUE',
          message: `SEED_CLUE "${clueId}" has no RevealPlan that requires it — may be orphaned`,
          severity: 'info',
        });
      }
    }
  });

  // Rule 6: IR with no ops is a no-op transition — probably an error
  if (ir.ops.length === 0 && ir.sceneIdx > 0) {
    warnings.push({
      opIdx: null, op: 'IR', rule: 'EMPTY_TRANSITION',
      message: 'IR has no ops — transition changes nothing (expected for scene 0 only)',
      severity: 'warn',
    });
  }

  return warnings;
}
