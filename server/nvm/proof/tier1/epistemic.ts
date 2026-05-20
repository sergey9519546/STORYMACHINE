// EpistemicProof (Tier 1) — a belief a character acquires must carry legal
// provenance: a witnessed belief names the event it saw; a told belief names
// the agent who told it. Deterministic lookup; CLEVER_MOVES §1.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

export function epistemicProof(ir: NarrativeTransitionIR, _state: NarrativeState): ProofResult {
  const findings: ProofFinding[] = [];
  for (const op of ir.ops) {
    if (op.op !== 'UPDATE_BELIEF') continue;
    const b = op.belief;
    if (b.source === 'witnessed' && !b.source_event_id) {
      findings.push({
        proof: 'EpistemicProof', severity: 'block',
        message: `${op.charId} holds a witnessed belief "${b.proposition}" with no source event`,
        subjectId: b.id,
      });
    }
    if (b.source === 'told' && !b.source_agent_id) {
      findings.push({
        proof: 'EpistemicProof', severity: 'block',
        message: `${op.charId} holds a told belief "${b.proposition}" with no source agent`,
        subjectId: b.id,
      });
    }
  }
  return findings.length
    ? failResult('EpistemicProof', 'a belief was acquired without legal provenance', findings)
    : passResult('EpistemicProof');
}
