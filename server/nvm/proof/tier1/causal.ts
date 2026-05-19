// CausalProof (Tier 1) — two checks:
// 1. A non-initial transition that changes state must declare ≥1 precondition.
// 2. When causalLinks are declared, every causedBy ID must exist in prior state
//    (fact, belief, char, setup) — verifying the claim instead of guessing.
// Deterministic; CLEVER_MOVES §1; B2 proof-carrying extension.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

function buildGroundedIds(state: NarrativeState): Set<string> {
  const ids = new Set<string>();
  for (const f of state.objectiveReality) ids.add(f.factId);
  for (const [charId, beliefs] of Object.entries(state.characterBeliefs)) {
    ids.add(charId);
    for (const b of beliefs) ids.add(b.id);
  }
  for (const s of state.payoffs) ids.add(s.setupId);
  for (const c of state.clues) ids.add(c.clueId);
  return ids;
}

export function causalProof(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult {
  const findings: ProofFinding[] = [];

  // Check 1: non-initial transition must declare preconditions
  const isInitial = ir.sceneIdx === 0;
  const changesState = ir.ops.length > 0;
  if (!isInitial && changesState && ir.preconditions.length === 0) {
    findings.push({
      proof: 'CausalProof', severity: 'block',
      message: `scene ${ir.sceneIdx} changes state but declares no preconditions`,
      subjectId: ir.transitionId,
    });
  }

  // Check 2: verify explicit causalLinks when declared (B2)
  if (ir.causalLinks && ir.causalLinks.length > 0) {
    const grounded = buildGroundedIds(state);
    for (const link of ir.causalLinks) {
      for (const causedBy of link.causedBy) {
        if (!grounded.has(causedBy)) {
          findings.push({
            proof: 'CausalProof', severity: 'block',
            message: `op[${link.opIdx}] declares causedBy "${causedBy}" but that ID is not in prior state`,
            subjectId: causedBy,
          });
        }
      }
    }
  }

  return findings.length
    ? failResult('CausalProof', 'causal grounding failed', findings)
    : passResult('CausalProof');
}
