// Counterfactual reasoning via Pearl's do()-calculus (G4).
// doIntervention(scm, {opId, replacement}) surgically replaces or removes one
// op in the SCM and propagates through the DAG to find exactly which downstream
// ops are now invalid (their causal parents changed). This is the exact answer
// to "what breaks if I change this?" — What-Breaks-If-Removed is the special
// case where replacement=null.

import type { StructuralCausalModel, SCMNode } from './scm.ts';
import type { StoryOp } from '../ops/StoryOp.ts';

export interface Intervention {
  opId: string;
  replacement: StoryOp | null;   // null = removal (do(X := ∅))
}

export interface AffectedOp {
  opId: string;
  commitId: string;
  opIdx: number;
  originalOp: StoryOp;
  reason: string;     // why this op is affected
  distance: number;   // graph hops from the intervened node
}

export interface CounterfactualReport {
  intervention: Intervention;
  affectedOps: AffectedOp[];
  directlyAffected: AffectedOp[];   // distance === 1
  transitivelyAffected: AffectedOp[]; // distance > 1
  summary: string;
}

// BFS from the intervened node through the DAG to find all descendants.
function descendants(scm: StructuralCausalModel, rootId: string): Map<string, number> {
  const visited = new Map<string, number>(); // opId → distance
  const queue: Array<{ id: string; dist: number }> = [{ id: rootId, dist: 0 }];
  while (queue.length > 0) {
    const { id, dist } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.set(id, dist);
    const node = scm.nodes.get(id);
    if (node) {
      for (const child of node.children) {
        if (!visited.has(child)) queue.push({ id: child, dist: dist + 1 });
      }
    }
  }
  visited.delete(rootId); // don't include the root itself
  return visited;
}

export function doIntervention(
  scm: StructuralCausalModel,
  intervention: Intervention,
): CounterfactualReport {
  const target = scm.nodes.get(intervention.opId);
  if (!target) {
    return {
      intervention,
      affectedOps: [],
      directlyAffected: [],
      transitivelyAffected: [],
      summary: `op "${intervention.opId}" not found in SCM`,
    };
  }

  const desc = descendants(scm, intervention.opId);
  const affected: AffectedOp[] = [];

  for (const [opId, distance] of desc) {
    const node = scm.nodes.get(opId);
    if (!node) continue;

    let reason = '';
    if (intervention.replacement === null) {
      reason = `parent op ${intervention.opId} was removed`;
    } else {
      reason = `parent op ${intervention.opId} was replaced with a different ${intervention.replacement.op}`;
    }

    // Extra specificity: if the target introduced a fact/char, downstream beliefs depending on it
    const targetOp = target.op;
    if (targetOp.op === 'ADD_FACT' && node.op.op === 'UPDATE_BELIEF') {
      reason += ` — belief may reference a fact no longer in scope`;
    }
    if (targetOp.op === 'UPDATE_BELIEF' && node.op.op === 'APPRAISE_EMOTION') {
      reason += ` — emotion appraised by a char whose belief was changed`;
    }

    affected.push({
      opId, commitId: node.commitId, opIdx: node.opIdx, originalOp: node.op, reason, distance,
    });
  }

  affected.sort((a, b) => a.distance - b.distance);

  const direct = affected.filter(a => a.distance === 1);
  const transitive = affected.filter(a => a.distance > 1);

  const action = intervention.replacement === null ? 'removed' : `replaced with ${intervention.replacement.op}`;
  const summary = [
    `Intervention: ${target.op.op} at ${intervention.opId} ${action}.`,
    `${affected.length} downstream op(s) affected (${direct.length} direct, ${transitive.length} transitive).`,
    ...direct.map(a => `  → [direct]  ${a.opId} (${a.originalOp.op}): ${a.reason}`),
    ...transitive.map(a => `  → [trans]   ${a.opId} (${a.originalOp.op}): ${a.reason}`),
  ].join('\n');

  return {
    intervention,
    affectedOps: affected,
    directlyAffected: direct,
    transitivelyAffected: transitive,
    summary,
  };
}
