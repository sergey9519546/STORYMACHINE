// Structural Causal Model (G4) — the StoryCommit DAG + IR causalLinks
// form a structural causal model (SCM). Each node is a StoryOp with an opId;
// edges are the causalLinks declared in the IR that produced each commit.
// Pearl's do()-calculus operates on this graph.

import type { Stage } from '../../engine/Stage.ts';
import type { StoryOp } from '../ops/StoryOp.ts';

export interface SCMNode {
  opId: string;            // "${commitId}:${opIdx}"
  commitId: string;
  opIdx: number;
  op: StoryOp;
  parents: string[];       // opIds this op causally depends on (from causalLinks)
  children: string[];      // opIds that depend on this op
}

export interface StructuralCausalModel {
  nodes: Map<string, SCMNode>;
  // topological order (leaves first, roots last)
  order: string[];
}

function opId(commitId: string, opIdx: number): string {
  return `${commitId}:${opIdx}`;
}

export function buildSCM(stage: Stage): StructuralCausalModel {
  const nodes = new Map<string, SCMNode>();
  const commits = stage.getCommits().filter(c => !c.reverted);

  // First pass: create all nodes
  for (const commit of commits) {
    commit.ops.forEach((op, opIdx) => {
      const id = opId(commit.commitId, opIdx);
      nodes.set(id, {
        opId: id,
        commitId: commit.commitId,
        opIdx,
        op,
        parents: [],
        children: [],
      });
    });
  }

  // Second pass: wire causalLinks from the IR stored in commits
  // We can't re-read the IR from Stage (it's stored in ops_json without causalLinks),
  // so we infer causality heuristically: within a commit, facts precede beliefs;
  // across commits, beliefs depend on facts introduced in prior commits.
  for (const commit of commits) {
    // Intra-commit: UPDATE_BELIEF after ADD_FACT → ADD_FACT causes belief
    commit.ops.forEach((op, i) => {
      if (op.op === 'UPDATE_BELIEF') {
        for (let j = 0; j < i; j++) {
          const prev = commit.ops[j];
          if (prev.op === 'ADD_FACT') {
            const parent = opId(commit.commitId, j);
            const child = opId(commit.commitId, i);
            const parentNode = nodes.get(parent);
            const childNode = nodes.get(child);
            if (parentNode && childNode) {
              if (!childNode.parents.includes(parent)) childNode.parents.push(parent);
              if (!parentNode.children.includes(child)) parentNode.children.push(child);
            }
          }
        }
      }
    });
  }

  // Topological order (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  for (const [id, node] of nodes) inDegree.set(id, node.parents.length);
  const queue = [...nodes.keys()].filter(id => (inDegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const child of (nodes.get(id)?.children ?? [])) {
      const d = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, d);
      if (d === 0) queue.push(child);
    }
  }
  // Append any remaining (cycles, if any — shouldn't happen in a DAG)
  for (const id of nodes.keys()) {
    if (!order.includes(id)) order.push(id);
  }

  // Kahn's algorithm produces roots-first. The interface contract specifies
  // "leaves first, roots last" for do-calculus traversal, so reverse.
  order.reverse();

  return { nodes, order };
}
