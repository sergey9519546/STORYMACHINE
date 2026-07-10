// Production-Realist critic — a line producer's eye. Objects to action lines
// that describe an impression rather than something a camera can point at,
// scenes whose cast has crept into a full company call, and scenes carrying
// enough distinct practical objects/builds to blow a shoot-day budget.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

// Internal-impression phrasing that isn't shootable — no physical action or
// image behind it. "We feel the montage" is a note, not a shot list.
const UNSHOOTABLE = /\bwe feel\b|\bsomehow\b|\bin some way\b|\bmontage of\b|\bsense that\b|\bfeels like\b/i;

function charIdsInOp(op: NarrativeTransitionIR['ops'][number]): string[] {
  if (op.op === 'SHIFT_RELATIONSHIP') return op.pair;
  if ('charId' in op) return [(op as { charId: string }).charId];
  return [];
}

export function productionRealistCritic(ir: NarrativeTransitionIR, _state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  // Gate 1: unshootable action line — a visual fact describes an internal
  // impression rather than a physical, filmable action or image.
  ir.ops.forEach((op, i) => {
    if (op.op === 'RECORD_VISUAL_FACT' && UNSHOOTABLE.test(op.fact)) {
      critiques.push({
        criticId: 'production_realist', severity: 35, targetOpIdx: i,
        objection: `Visual fact "${op.fact}" isn't shootable — it describes an internal impression, not something a camera can point at; give me the physical action or image instead`,
        suggestedOperator: 'plant_sensory_anchor',
        attentionBid: 30,
      });
    }
  });

  // Gate 2: cast size creep — 5+ named characters active in one scene is a
  // full company call for a single set-up.
  const distinctChars = new Set<string>();
  for (const op of ir.ops) for (const c of charIdsInOp(op)) distinctChars.add(c);
  if (distinctChars.size >= 5) {
    critiques.push({
      criticId: 'production_realist', severity: 30, targetOpIdx: null,
      objection: `${distinctChars.size} named characters (${[...distinctChars].join(', ')}) are active in one scene — that's a full company call for a single set-up; confirm we actually need everyone in the room`,
      suggestedOperator: 'cut_on_the_nose',
      attentionBid: 30,
    });
  }

  // Gate 3: build/prop sprawl — 4+ distinct objects advancing arcs in one
  // scene is 4+ practical builds or effects to track for a single beat.
  const objectIds = new Set(
    ir.ops
      .filter((op): op is Extract<typeof op, { op: 'ADVANCE_OBJECT_ARC' }> => op.op === 'ADVANCE_OBJECT_ARC')
      .map(op => op.objectId),
  );
  if (objectIds.size >= 4) {
    critiques.push({
      criticId: 'production_realist', severity: 30, targetOpIdx: null,
      objection: `${objectIds.size} distinct objects (${[...objectIds].join(', ')}) advance arcs in one scene — that's four-plus builds or practical props to track for a single beat; consolidate or budget it explicitly`,
      suggestedOperator: 'cut_on_the_nose',
      attentionBid: 25,
    });
  }

  return critiques;
}
