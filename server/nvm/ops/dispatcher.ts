// StoryOp dispatcher — applies typed bytecode to a NarrativeState. Pure: every
// function returns a new state and never mutates its input, so op lists are
// replayable and cacheable by state-hash (CLEVER_MOVES §0).

import { assertNever } from '../util/assertNever.ts';
import type { StoryOp } from './StoryOp.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import { relationshipKey } from '../state/NarrativeState.ts';

export function applyStoryOp(state: NarrativeState, op: StoryOp): NarrativeState {
  switch (op.op) {
    case 'ADD_FACT':
      return { ...state, objectiveReality: [...state.objectiveReality, op.fact] };

    case 'EXPIRE_FACT':
      // Expiry is monotone: take the earliest expiry turn so a later EXPIRE_FACT
      // can never silently extend (re-open) a validity window that was already closed.
      return {
        ...state,
        objectiveReality: state.objectiveReality.map(f =>
          f.factId === op.factId
            ? { ...f, validTo: f.validTo === null ? op.atTurn : Math.min(f.validTo, op.atTurn) }
            : f),
      };

    case 'UPDATE_BELIEF': {
      const existing = state.characterBeliefs[op.charId] ?? [];
      const next = existing.some(b => b.id === op.belief.id)
        ? existing.map(b => (b.id === op.belief.id ? op.belief : b))
        : [...existing, op.belief];
      return { ...state, characterBeliefs: { ...state.characterBeliefs, [op.charId]: next } };
    }

    case 'APPRAISE_EMOTION':
      return {
        ...state,
        characterEmotions: { ...state.characterEmotions, [op.charId]: op.emotion },
      };

    case 'SHIFT_RELATIONSHIP': {
      const key = relationshipKey(op.pair[0], op.pair[1]);
      const existing = state.relationships[key] ?? [];
      return { ...state, relationships: { ...state.relationships, [key]: [...existing, op.delta] } };
    }

    case 'ADVANCE_OBJECT_ARC':
      return { ...state, objectArcs: { ...state.objectArcs, [op.objectId]: op.toState } };

    case 'TRIGGER_RULE': {
      const tag = `${op.mechanismId}:${op.ruleId}`;
      return state.firedRules.includes(tag)
        ? state
        : { ...state, firedRules: [...state.firedRules, tag] };
    }

    case 'SEED_CLUE':
      return { ...state, clues: [...state.clues, { clueId: op.clueId, carrier: op.carrier }] };

    case 'PAYOFF_SETUP':
      return {
        ...state,
        payoffs: [...state.payoffs, { setupId: op.setupId, payoffEventId: op.payoffEventId }],
      };

    case 'RAISE_CLOCK':
      return {
        ...state,
        clocks: { ...state.clocks, [op.clockId]: (state.clocks[op.clockId] ?? 0) + op.amount },
      };

    case 'ADVANCE_THEME_ARGUMENT':
      return {
        ...state,
        themeArgument: [...state.themeArgument, { claimId: op.claimId, move: op.move }],
      };

    case 'UPDATE_READER_STATE': {
      const a = state.audienceState;
      return {
        ...state,
        audienceState: {
          knownFacts: op.delta.knownFact ? [...a.knownFacts, op.delta.knownFact] : a.knownFacts,
          suspense:   a.suspense   + (op.delta.suspense   ?? 0),
          curiosity:  a.curiosity  + (op.delta.curiosity  ?? 0),
          investment: a.investment + (op.delta.investment ?? 0),
        },
      };
    }

    case 'RECORD_VISUAL_FACT':
      return {
        ...state,
        sceneFacts: [...state.sceneFacts, { sceneId: op.sceneId, kind: 'visual', fact: op.fact }],
      };

    case 'RECORD_SONIC_FACT':
      return {
        ...state,
        sceneFacts: [...state.sceneFacts, { sceneId: op.sceneId, kind: 'sonic', fact: op.fact }],
      };

    default:
      return assertNever(op, 'StoryOp');
  }
}

export function applyStoryOps(state: NarrativeState, ops: StoryOp[]): NarrativeState {
  return ops.reduce(applyStoryOp, state);
}
