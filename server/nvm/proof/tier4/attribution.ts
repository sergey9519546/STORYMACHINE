// AttributionProof (Tier 4 — Ethics & Disclosure) — monitors that model-generated
// IRs which declare causal links actually cite existing facts/beliefs/chars.
// An IR with causalLinks but empty `causedBy` arrays claims causation without
// evidence — a form of confabulation that must be disclosed to the writer.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

export function attributionProof(
  ir: NarrativeTransitionIR,
  state: NarrativeState,
): ProofResult {
  // Only audit model-generated IRs that declare causal links
  if (ir.provenance.origin === 'user_authored') {
    return passResult('AttributionProof', 'user-authored — attribution not required');
  }
  if (!ir.causalLinks || ir.causalLinks.length === 0) {
    return passResult('AttributionProof', 'no causal links declared — nothing to audit');
  }

  const emptyCauses = ir.causalLinks.filter(cl => cl.causedBy.length === 0);

  // Build the set of real IDs that exist in this IR so we can detect phantom references.
  const realFactIds  = new Set<string>();
  const realBeliefIds = new Set<string>();
  const realCharIds  = new Set<string>();
  for (const op of ir.ops) {
    if (op.op === 'ADD_FACT')       realFactIds.add(op.fact.factId);
    if (op.op === 'UPDATE_BELIEF')  { realBeliefIds.add(op.belief.id); realCharIds.add(op.charId); }
    if (op.op === 'APPRAISE_EMOTION') realCharIds.add(op.charId);
    if (op.op === 'SHIFT_RELATIONSHIP') { realCharIds.add(op.pair[0]); realCharIds.add(op.pair[1]); }
  }

  // Check for phantom references: cited IDs that don't exist in this IR's ops or state facts.
  const stateFactIds = new Set(state.objectiveReality.map(f => f.factId));
  const stateBeliefIds = new Set(
    Object.values(state.characterBeliefs).flat().map(b => b.id),
  );
  const phantomLinks: Array<{ opIdx: number; phantomId: string }> = [];
  for (const cl of ir.causalLinks) {
    if (cl.causedBy.length === 0) continue; // handled separately
    for (const id of cl.causedBy) {
      const exists = realFactIds.has(id) || stateFactIds.has(id) ||
                     realBeliefIds.has(id) || stateBeliefIds.has(id) ||
                     realCharIds.has(id);
      if (!exists) phantomLinks.push({ opIdx: cl.opIdx, phantomId: id });
    }
  }

  if (emptyCauses.length === 0 && phantomLinks.length === 0) {
    return passResult('AttributionProof', `all ${ir.causalLinks.length} causal links cite evidence`);
  }

  const findings: import('../contract.ts').ProofFinding[] = [];
  for (const cl of emptyCauses) {
    findings.push({
      proof: 'AttributionProof',
      severity: 'info',
      message: `Op[${cl.opIdx}] declares a causal link but cites no supporting fact/belief/char IDs. Add causedBy entries or remove the causalLink declaration.`,
      subjectId: String(cl.opIdx),
    });
  }
  for (const { opIdx, phantomId } of phantomLinks) {
    findings.push({
      proof: 'AttributionProof',
      severity: 'info',
      message: `Op[${opIdx}] causedBy cites "${phantomId}" — this ID does not match any fact, belief, or character in this scene or prior state. Remove the phantom reference or correct the ID.`,
      subjectId: String(opIdx),
    });
  }

  return failResult('AttributionProof',
    `${emptyCauses.length} empty + ${phantomLinks.length} phantom causal reference(s)`,
    findings,
  );
}
