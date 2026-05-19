// Continuity critic — wraps the Tier 1 proof kernel.
// This critic is the proof kernel's voice in the writers' room.
// Every proof failure becomes a critique with severity proportional to its impact.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';
import { runTier1 } from '../../proof/kernel.ts';
import type { MutationOperator } from '../../converge/operators.ts';

const PROOF_TO_OPERATOR: Partial<Record<string, MutationOperator>> = {
  IntentionalProof: 'deepen_wound',
  TemporalProof: 'raise_stakes',
  EarnedRevealProof: 'weird_but_valid',
  CausalProof: 'raise_stakes',
  EpistemicProof: 'complicate_relationship',
};

export function continuityCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const results = runTier1(ir, state);
  const critiques: Critique[] = [];

  for (const result of results) {
    if (result.pass) continue;
    for (const finding of result.findings) {
      const opIdx = finding.message.match(/op\[(\d+)\]/)?.[1];
      critiques.push({
        criticId: 'continuity',
        severity: 80,   // proof failures are always high severity
        targetOpIdx: opIdx !== undefined ? Number(opIdx) : null,
        objection: `[${result.proof}] ${finding.message}`,
        suggestedOperator: PROOF_TO_OPERATOR[result.proof] ?? null,
        attentionBid: 85,
      });
    }
  }

  return critiques;
}
