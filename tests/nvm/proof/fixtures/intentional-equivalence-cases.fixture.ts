// The (IR, state) pairs that pin runTier1()'s no-opts behaviour to what it was
// at 1e7779de — the commit before the 2026-09-19 cast-grounding lane.
//
// This module holds ONLY data, and holds it outside the test file, because two
// programs read it: tests/nvm/proof/intentional-cast.test.ts, and the scratch
// generator that produced intentional-equivalence-baseline.json by running
// these same cases through `git show 1e7779de:server/nvm/proof/tier1/intentional.ts`.
// A baseline generated from the fixtures the test also uses is the only way the
// comparison means anything; see the lane README for the generator and its
// output.
//
// The six IRs cover every shape charsReferenced() distinguishes, plus the one
// that motivated the lane:
//   1. no character ops at all
//   2. SELF-GROUNDING: invents "Char1" and emits its UPDATE_BELIEF (passed
//      before this lane, and still passes with no cast supplied)
//   3. reference-only ops for real cast names (blocked against an empty state —
//      the bench's 17 Tier-1 blocks)
//   4. one grounded, one referenced
//   5. a relationship pair with one unknown half
//   6. several ops, one of them an invented self-grounded name
import type { NarrativeTransitionIR } from '../../../../server/nvm/ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../../../server/nvm/state/NarrativeState.ts';
import { emptyState } from '../../../../server/nvm/state/NarrativeState.ts';

/** A real *.mech.json id — MechanismProof requires one. */
export const REAL_MECHANISM = 'relationship_externalization';

function ir(id: string, ops: NarrativeTransitionIR['ops'], sceneIdx = 2): NarrativeTransitionIR {
  return {
    transitionId: id,
    sceneIdx,
    sceneFunction: 'build_tension',
    activeMechanisms: [REAL_MECHANISM],
    beforeStateHash: 'fixed-hash',
    ops,
    preconditions: ['prior scene'],
    postconditions: [],
    provenance: { origin: 'model_generated', createdAt: 0, model: 'fixture' },
  };
}

function belief(charId: string, proposition: string): NarrativeTransitionIR['ops'][number] {
  return {
    op: 'UPDATE_BELIEF',
    charId,
    belief: {
      id: `b-${charId}`, proposition, confidence: 0.8,
      source: 'witnessed', source_event_id: 'e-0', acquired_at: 0,
    },
  };
}

function emotion(charId: string): NarrativeTransitionIR['ops'][number] {
  return {
    op: 'APPRAISE_EMOTION',
    charId,
    emotion: {
      joy: 0, distress: 60, anger: 0, fear: 10, pride: 0, shame: 0,
      dominant: 'distress', intensity: 60, last_updated_at: 2,
    },
  };
}

function rel(a: string, b: string): NarrativeTransitionIR['ops'][number] {
  return { op: 'SHIFT_RELATIONSHIP', pair: [a, b], delta: { dimension: 'trust', amount: -0.3, reason: 'the vault opens once' } };
}

export const IRS: ReadonlyArray<{ name: string; ir: NarrativeTransitionIR }> = [
  { name: 'no-character-ops', ir: ir('eq-1', [{ op: 'UPDATE_READER_STATE', delta: { suspense: 5, curiosity: 3 } }]) },
  { name: 'self-grounding-invented-name', ir: ir('eq-2', [belief('Char1', 'the bridge is safe'), emotion('Char1')]) },
  { name: 'reference-only-real-cast', ir: ir('eq-3', [emotion('MAYA'), rel('MAYA', 'DEV')]) },
  { name: 'one-grounded-one-referenced', ir: ir('eq-4', [belief('DEV', 'the letter is a forgery'), emotion('MAYA')]) },
  { name: 'relationship-with-unknown-half', ir: ir('eq-5', [rel('MAYA', 'THE STRANGER')]) },
  { name: 'mixed-with-invented-name', ir: ir('eq-6', [belief('MAYA', 'the vault opens once'), emotion('DEV'), rel('MAYA', 'DEV'), belief('Char1', 'nobody is coming')]) },
];

/** Empty — the scene-0 situation the bench actually converges against. */
export function emptyFixtureState(): NarrativeState {
  return emptyState();
}

/** MAYA grounded by a belief, DEV by an emotion — the two ways state grounds. */
export function populatedFixtureState(): NarrativeState {
  const s = emptyState();
  s.characterBeliefs = {
    MAYA: [{ id: 'b-maya', proposition: 'the bridge is safe', confidence: 0.8, source: 'witnessed', acquired_at: 0 }],
  };
  s.characterEmotions = {
    DEV: { joy: 0, distress: 40, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 40, last_updated_at: 0 },
  };
  return s;
}

export const STATES: ReadonlyArray<{ name: string; make: () => NarrativeState }> = [
  { name: 'empty', make: emptyFixtureState },
  { name: 'maya-dev', make: populatedFixtureState },
];
