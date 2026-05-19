// ContinuityProof (Tier 1) — no two facts share a (subject, predicate) with
// overlapping validity intervals and incompatible objects. Deterministic scan
// over the post-transition objective reality; CLEVER_MOVES §1.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { AtomicFact } from '../../ops/StoryOp.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';
import { applyStoryOps } from '../../ops/dispatcher.ts';

// Half-open intervals [validFrom, validTo); validTo === null means open-ended.
function overlaps(a: AtomicFact, b: AtomicFact): boolean {
  const aEnd = a.validTo ?? Number.POSITIVE_INFINITY;
  const bEnd = b.validTo ?? Number.POSITIVE_INFINITY;
  return a.validFrom < bEnd && b.validFrom < aEnd;
}

export function continuityProof(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult {
  const facts = applyStoryOps(state, ir.ops).objectiveReality;
  const findings: ProofFinding[] = [];

  for (let i = 0; i < facts.length; i++) {
    for (let j = i + 1; j < facts.length; j++) {
      const a = facts[i], b = facts[j];
      if (a.subject === b.subject && a.predicate === b.predicate
          && a.object !== b.object && overlaps(a, b)) {
        findings.push({
          proof: 'ContinuityProof', severity: 'block',
          message: `facts "${a.factId}" and "${b.factId}" both assert ${a.subject}.${a.predicate} `
                 + `with incompatible values ("${a.object}" vs "${b.object}") over overlapping time`,
          subjectId: b.factId,
        });
      }
    }
  }
  return findings.length
    ? failResult('ContinuityProof', 'contradictory facts hold simultaneously', findings)
    : passResult('ContinuityProof');
}
