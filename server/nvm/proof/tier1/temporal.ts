// TemporalProof (Tier 1) — no fact is expired before it exists.
// Deterministic; CLEVER_MOVES §1.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

export function temporalProof(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult {
  const addedAtTurn = new Map<string, number>();
  for (const f of state.objectiveReality) addedAtTurn.set(f.factId, f.addedAtTurn);
  for (const op of ir.ops) {
    if (op.op === 'ADD_FACT') addedAtTurn.set(op.fact.factId, op.fact.addedAtTurn);
  }

  const findings: ProofFinding[] = [];
  for (const op of ir.ops) {
    if (op.op !== 'EXPIRE_FACT') continue;
    const added = addedAtTurn.get(op.factId);
    if (added !== undefined && op.atTurn < added) {
      findings.push({
        proof: 'TemporalProof', severity: 'block',
        message: `EXPIRE_FACT ${op.factId} at turn ${op.atTurn} precedes its ADD_FACT turn ${added}`,
        subjectId: op.factId,
      });
    }
  }
  return findings.length
    ? failResult('TemporalProof', 'a fact is expired before it exists', findings)
    : passResult('TemporalProof');
}
