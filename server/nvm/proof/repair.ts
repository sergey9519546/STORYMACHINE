// repair() — converts proof failures into executable StoryOp patches.
// A RepairPatch carries StoryOp[] that, prepended to the failing IR's ops,
// would satisfy the failing proof. Self-healing canon (CLEVER_MOVES §B3).

import type { ProofResult } from './contract.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryOp, AtomicFact } from '../ops/StoryOp.ts';
import type { Belief } from '../../engine/types.ts';

export interface RepairPatch {
  proof: string;
  description: string;
  ops: StoryOp[];
}

export function repair(failures: ProofResult[], _state: NarrativeState): RepairPatch[] {
  const patches: RepairPatch[] = [];

  for (const result of failures) {
    if (result.pass) continue;

    for (const finding of result.findings) {
      switch (result.proof) {
        case 'IntentionalProof': {
          // Missing character — introduce them with a minimal witnessed belief
          if (finding.subjectId) {
            const charId = finding.subjectId;
            const belief: Belief = {
              id: `repair_belief_${charId}_${Date.now()}`,
              proposition: `${charId} exists in this narrative`,
              confidence: 1,
              source: 'witnessed',
              source_event_id: `repair_evt_${charId}`,
              acquired_at: 0,
            };
            patches.push({
              proof: 'IntentionalProof',
              description: `Introduce character "${charId}" so ops referencing them are grounded`,
              ops: [{ op: 'UPDATE_BELIEF', charId, belief }],
            });
          }
          break;
        }
        case 'TemporalProof': {
          // EXPIRE_FACT before the fact was added — add the fact first
          if (finding.subjectId) {
            const factId = finding.subjectId;
            const fact: AtomicFact = {
              factId,
              subject: factId,
              predicate: 'exists',
              object: 'true',
              addedAtTurn: 0,
              validFrom: 0,
              validTo: null,
            };
            patches.push({
              proof: 'TemporalProof',
              description: `Add fact "${factId}" so the EXPIRE_FACT has a prior ADD_FACT to target`,
              ops: [{ op: 'ADD_FACT', fact }],
            });
          }
          break;
        }
        case 'EarnedRevealProof': {
          // Missing clue — seed it so the reveal becomes earned
          if (finding.subjectId) {
            const clueId = finding.subjectId;
            patches.push({
              proof: 'EarnedRevealProof',
              description: `Seed clue "${clueId}" so the reveal is earned`,
              ops: [{ op: 'SEED_CLUE', clueId, carrier: 'object' }],
            });
          }
          break;
        }
        case 'EpistemicProof': {
          // Witnessed belief missing source_event_id — patch carried in description only
          patches.push({
            proof: 'EpistemicProof',
            description: finding.message,
            ops: [], // epistemic repairs require belief content changes; surface as hint
          });
          break;
        }
        case 'CausalProof': {
          patches.push({
            proof: 'CausalProof',
            description: finding.message,
            ops: [], // causal grounding requires a precondition string, not a StoryOp
          });
          break;
        }
        default: {
          patches.push({
            proof: result.proof,
            description: finding.message,
            ops: [],
          });
        }
      }
    }
  }

  // Deduplicate by proof+subjectId
  const seen = new Set<string>();
  return patches.filter(p => {
    const key = `${p.proof}:${p.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
