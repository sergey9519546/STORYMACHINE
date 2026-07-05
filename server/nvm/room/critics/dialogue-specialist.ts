// Dialogue-Specialist critic — a polish writer's ear for voice. Objects to
// two characters registering the exact same emotional note (no vocal
// differentiation), sonic beats that state a feeling outright instead of
// carrying it as subtext, and a clue engine that leans on spoken lines to the
// exclusion of anything staged or seen.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

// Direct feeling-naming phrasing — dialogue that announces the emotion
// instead of letting it leak out sideways through action or evasion.
const ON_THE_NOSE = /\bI (feel|really feel|am so)\b|\bthat makes me feel\b|\bI love you because\b|\bI'?m (so )?(angry|sad|scared|afraid|happy|furious) (because|that)\b/i;

export function dialogueSpecialistCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  // Gate 1: voice differentiation — two DIFFERENT characters land the exact
  // same emotional note in one scene. On the page that reads as two voices
  // delivering the same line reading.
  const emotionOps = ir.ops
    .map((op, i) => ({ op, i }))
    .filter((x): x is { op: Extract<typeof x.op, { op: 'APPRAISE_EMOTION' }>; i: number } =>
      x.op.op === 'APPRAISE_EMOTION');
  outer:
  for (let a = 0; a < emotionOps.length; a++) {
    for (let b = a + 1; b < emotionOps.length; b++) {
      const A = emotionOps[a].op;
      const B = emotionOps[b].op;
      if (A.charId !== B.charId && A.emotion.dominant === B.emotion.dominant && A.emotion.intensity === B.emotion.intensity) {
        critiques.push({
          criticId: 'dialogue_specialist', severity: 30, targetOpIdx: emotionOps[b].i,
          objection: `${A.charId} and ${B.charId} both register ${A.emotion.dominant}(${A.emotion.intensity}) in the same scene — two characters, one voice; differentiate how each of them carries it`,
          suggestedOperator: 'inject_irony',
          attentionBid: 30,
        });
        break outer;
      }
    }
  }

  // Gate 2: on-the-nose density — a sonic beat states the feeling outright.
  ir.ops.forEach((op, i) => {
    if (op.op === 'RECORD_SONIC_FACT' && ON_THE_NOSE.test(op.fact)) {
      critiques.push({
        criticId: 'dialogue_specialist', severity: 30, targetOpIdx: i,
        objection: `Sonic beat states the feeling outright — "${op.fact}" — that's information, not subtext; let it leak out sideways instead of announcing it`,
        suggestedOperator: 'cut_on_the_nose',
        attentionBid: 35,
      });
    }
  });

  // Gate 3: line-carrier overreliance — every clue seeded so far (including
  // this one) rides a spoken "line" carrier. Dialogue can't be the only thing
  // that plants information; something has to be staged or seen.
  ir.ops.forEach((op, i) => {
    if (op.op === 'SEED_CLUE' && op.carrier === 'line') {
      const priorAllLine = state.clues.length > 0 && state.clues.every(c => c.carrier === 'line');
      if (priorAllLine) {
        const total = state.clues.length + 1;
        if (total >= 3) {
          critiques.push({
            criticId: 'dialogue_specialist', severity: 30, targetOpIdx: i,
            objection: `${total} clues seeded so far and every one of them rides a spoken "line" carrier ("${op.clueId}" makes it ${total}) — stage one as an object, gesture, or image instead`,
            suggestedOperator: 'plant_sensory_anchor',
            attentionBid: 35,
          });
        }
      }
    }
  });

  return critiques;
}
