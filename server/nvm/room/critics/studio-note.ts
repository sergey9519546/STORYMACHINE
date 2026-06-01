// Studio-Note critic — commercial and audience-engagement viability.
// Objects to scenes with no audience-facing update (UPDATE_READER_STATE),
// scenes that are too intellectually dense, and scenes that drop suspense.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

export function studioNoteCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  // No reader state update — audience not engaged.
  // Exempt scene types that serve structural purposes where direct engagement
  // tracking is less critical: reveal_character and establish_world are deep
  // character/world scenes that earn engagement through content, not audience-state ops.
  const readerUpdateOps = ir.ops.filter(op => op.op === 'UPDATE_READER_STATE');
  const hasReaderUpdate = readerUpdateOps.length > 0;
  const exemptFromReaderCheck: NarrativeTransitionIR['sceneFunction'][] = ['reveal_character', 'establish_world'];
  if (!hasReaderUpdate && ir.sceneIdx > 0 && !exemptFromReaderCheck.includes(ir.sceneFunction)) {
    critiques.push({
      criticId: 'studio_note', severity: 35, targetOpIdx: null,
      objection: 'No UPDATE_READER_STATE — scene does not move the audience needle',
      suggestedOperator: 'inject_irony',
      attentionBid: 40,
    });
  }

  // Low-magnitude reader update: the scene has an UPDATE_READER_STATE but the
  // cumulative suspense/curiosity delta is trivially small (≤5 combined). A
  // pro-forma audience op with delta=1 is noise — the scene didn't actually land.
  if (hasReaderUpdate && ir.sceneIdx > 1) {
    const totalDelta = readerUpdateOps.reduce((sum, op) => {
      if (op.op !== 'UPDATE_READER_STATE') return sum;
      const d = op.delta;
      return sum + Math.abs(d.suspense ?? 0) + Math.abs(d.curiosity ?? 0) + Math.abs(d.investment ?? 0);
    }, 0);
    if (totalDelta <= 5) {
      critiques.push({
        criticId: 'studio_note', severity: 25, targetOpIdx: null,
        objection: `UPDATE_READER_STATE cumulative delta=${totalDelta} — negligible audience impact; increase suspense/curiosity/investment moves`,
        suggestedOperator: 'raise_stakes',
        attentionBid: 30,
      });
    }
  }

  // Curiosity dropping below 20 after scene 2 — the audience has stopped asking questions.
  // Curiosity is the engine that keeps viewers watching; its collapse precedes disengagement.
  if (state.audienceState.curiosity < 20 && ir.sceneIdx > 2) {
    critiques.push({
      criticId: 'studio_note', severity: 40, targetOpIdx: null,
      objection: `Audience curiosity is ${state.audienceState.curiosity}/100 — the story has stopped asking questions; plant a mystery, seed a clue, or reveal an unexpected fact`,
      suggestedOperator: 'inject_irony',
      attentionBid: 45,
    });
  }

  // Suspense dropping below 30 is commercially risky
  if (state.audienceState.suspense < 30 && ir.sceneIdx > 2) {
    critiques.push({
      criticId: 'studio_note', severity: 45, targetOpIdx: null,
      objection: `Audience suspense is ${state.audienceState.suspense}/100 — approaching disengagement threshold`,
      suggestedOperator: 'raise_stakes',
      attentionBid: 50,
    });
  }

  // Investment dropping below 25: audience no longer cares about the characters.
  // Harder to recover from than low suspense — needs a personal cost or decision.
  if (state.audienceState.investment < 25 && ir.sceneIdx > 3) {
    critiques.push({
      criticId: 'studio_note', severity: 50, targetOpIdx: null,
      objection: `Audience investment is ${state.audienceState.investment}/100 — characters feel irrelevant; add a personal cost or decision`,
      suggestedOperator: 'deepen_wound',
      attentionBid: 55,
    });
  }

  // Tension ceiling: when audience suspense is already near its maximum (≥85) and the
  // scene adds more RAISE_CLOCK pressure with no positive-emotion relief, the audience
  // reaches numbness — heightening past the ceiling yields diminishing returns.
  if (state.audienceState.suspense >= 85 && ir.sceneIdx > 2) {
    const hasClockEscalation = ir.ops.some(op => op.op === 'RAISE_CLOCK');
    const POSITIVE_RELIEF = new Set(['joy', 'relief', 'trust', 'admiration']);
    const hasReliefEmotion = ir.ops.some(
      op => op.op === 'APPRAISE_EMOTION' && POSITIVE_RELIEF.has(op.emotion.dominant),
    );
    if (hasClockEscalation && !hasReliefEmotion) {
      critiques.push({
        criticId: 'studio_note', severity: 35, targetOpIdx: null,
        objection: `Audience suspense is ${state.audienceState.suspense}/100 (near ceiling) and this scene adds more RAISE_CLOCK with no relief beat — audiences go numb above 85; add a positive emotion beat or pivot to consequence`,
        suggestedOperator: 'cut_on_the_nose',
        attentionBid: 40,
      });
    }
  }

  // Provide_relief scenes that also have multiple belief updates feel like lectures
  if (ir.sceneFunction === 'provide_relief') {
    const beliefCount = ir.ops.filter(op => op.op === 'UPDATE_BELIEF').length;
    if (beliefCount > 2) {
      critiques.push({
        criticId: 'studio_note', severity: 30, targetOpIdx: null,
        objection: `Relief scene has ${beliefCount} belief updates — too expository, kills the breather`,
        suggestedOperator: 'cut_on_the_nose',
        attentionBid: 25,
      });
    }
  }

  return critiques;
}
