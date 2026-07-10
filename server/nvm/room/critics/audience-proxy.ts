// Audience-Proxy critic — the smart-viewer-not-writer voice. Distinguishes
// confusion from mystery: too many brand-new names hitting the page at once,
// two clues stacked so quietly neither one registers, and scenes with no
// character to anchor the audience's point of view.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

// Carriers that don't call attention to themselves — legitimate on their own,
// but stacking two in the same beat leaves nothing loud enough to register.
const LOW_VISIBILITY_CARRIERS = new Set(['absence', 'gesture']);

// Scene functions where the audience expects to be riding with someone.
const CHARACTER_SCENE_FUNCTIONS: NarrativeTransitionIR['sceneFunction'][] = [
  'advance_plot', 'build_tension', 'reveal_character', 'set_up_payoff',
];

function charIdsInOp(op: NarrativeTransitionIR['ops'][number]): string[] {
  if (op.op === 'SHIFT_RELATIONSHIP') return op.pair;
  if ('charId' in op) return [(op as { charId: string }).charId];
  return [];
}

export function audienceProxyCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  // Gate 1: new-name pileup — 3+ characters the audience has never seen
  // before all land in the same scene. Mystery invites curiosity; a pileup of
  // unintroduced names just invites confusion.
  const knownChars = new Set([...Object.keys(state.characterBeliefs), ...Object.keys(state.characterEmotions)]);
  const newChars = new Set<string>();
  for (const op of ir.ops) {
    for (const c of charIdsInOp(op)) {
      if (!knownChars.has(c)) newChars.add(c);
    }
  }
  if (newChars.size >= 3) {
    critiques.push({
      criticId: 'audience_proxy', severity: 35, targetOpIdx: null,
      objection: `${newChars.size} brand-new names hit the page in one scene (${[...newChars].join(', ')}) — an audience can't retain that many unknowns from a single beat`,
      suggestedOperator: 'cut_on_the_nose',
      attentionBid: 35,
    });
  }

  // Gate 2: low-visibility clue stacking — two clues seeded in one beat via
  // carriers that don't call attention to themselves. Neither one registers.
  const lowVisClues = ir.ops
    .map((op, i) => ({ op, i }))
    .filter((x): x is { op: Extract<typeof x.op, { op: 'SEED_CLUE' }>; i: number } =>
      x.op.op === 'SEED_CLUE' && LOW_VISIBILITY_CARRIERS.has(x.op.carrier));
  if (lowVisClues.length >= 2) {
    critiques.push({
      criticId: 'audience_proxy', severity: 35, targetOpIdx: lowVisClues[1].i,
      objection: `Two clues seeded in one beat via low-visibility carriers (${lowVisClues.map(x => x.op.carrier).join(', ')}) — nothing here is loud enough for an audience to register even one of them, let alone both`,
      suggestedOperator: 'plant_sensory_anchor',
      attentionBid: 35,
    });
  }

  // Gate 3: POV vacuum — a character-driven scene with real material but no
  // op touches a character at all. Whose scene is this?
  if (CHARACTER_SCENE_FUNCTIONS.includes(ir.sceneFunction) && ir.sceneIdx > 0 && ir.ops.length > 0) {
    const hasCharPresence = ir.ops.some(op => charIdsInOp(op).length > 0);
    if (!hasCharPresence) {
      critiques.push({
        criticId: 'audience_proxy', severity: 30, targetOpIdx: null,
        objection: `"${ir.sceneFunction}" scene has ${ir.ops.length} op(s) but none touch a character — whose experience is this? ground it in someone's point of view`,
        suggestedOperator: 'deepen_wound',
        attentionBid: 30,
      });
    }
  }

  return critiques;
}
