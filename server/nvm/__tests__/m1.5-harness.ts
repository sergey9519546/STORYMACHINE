// M1.5 integration harness (HYBRID_DECISION Week 0 exit test) — represents a
// scenario purely as state: facts + beliefs + emotion + relationship + reader
// deltas, expressed as StoryOps, with NO prose and NO LLM call. The Tier 1
// Proof Kernel must pass on it.
//
// Scenario: Nora lies to Bob about which warehouse holds crate 7. Nora knows
// the truth (witnessed); Bob believes the lie (told by Nora); the audience is
// let in on the deception (dramatic irony).

import type { StoryOp } from '../ops/StoryOp.ts';
import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { ProofResult } from '../proof/contract.ts';
import { emptyState, stateHash } from '../state/NarrativeState.ts';
import { applyStoryOps } from '../ops/dispatcher.ts';
import { runTier1, tier1Passes } from '../proof/kernel.ts';

export interface M15Result {
  ir: NarrativeTransitionIR;
  state: NarrativeState;
  tier1: ProofResult[];
  allPass: boolean;
}

export function buildNoraWarehouseIR(): NarrativeTransitionIR {
  const ops: StoryOp[] = [
    {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_crate7', subject: 'crate_7', predicate: 'location',
        object: 'warehouse_B', addedAtTurn: 1, validFrom: 1, validTo: null,
      },
    },
    {
      op: 'UPDATE_BELIEF', charId: 'nora',
      belief: {
        id: 'nora_b1', proposition: 'crate_7 is in warehouse_B',
        confidence: 1, source: 'witnessed', source_event_id: 'evt_nora_saw', acquired_at: 1,
      },
    },
    {
      op: 'UPDATE_BELIEF', charId: 'bob',
      belief: {
        id: 'bob_b1', proposition: 'crate_7 is in warehouse_A',
        confidence: 0.7, source: 'told', source_agent_id: 'nora', acquired_at: 1,
      },
    },
    {
      op: 'APPRAISE_EMOTION', charId: 'nora',
      emotion: {
        joy: 0, distress: 0, anger: 0, fear: 0, pride: 60, shame: 0,
        dominant: 'pride', intensity: 60, last_updated_at: 1,
      },
    },
    {
      op: 'SHIFT_RELATIONSHIP', pair: ['nora', 'bob'],
      delta: { dimension: 'trust', amount: 0.1, reason: 'Bob accepted Nora\'s account' },
    },
    {
      op: 'UPDATE_READER_STATE',
      delta: { suspense: 0.3, knownFact: 'Nora lied to Bob about the warehouse' },
    },
  ];

  return {
    transitionId: 'm15_nora_warehouse',
    sceneIdx: 1,
    sceneFunction: 'build_tension',
    activeMechanisms: ['relationship_externalization'],
    beforeStateHash: stateHash(emptyState()),
    ops,
    preconditions: ['Nora and Bob are both in the warehouse', 'crate 7 has gone missing'],
    postconditions: ['Bob holds a false belief', 'the audience holds the truth'],
    provenance: { origin: 'model_generated', createdAt: Date.now() },
  };
}

export function runM15Harness(): M15Result {
  const before = emptyState();
  const ir = buildNoraWarehouseIR();
  const tier1 = runTier1(ir, before);
  const state = applyStoryOps(before, ir.ops);
  return { ir, state, tier1, allPass: tier1Passes(tier1) };
}
