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

  // Second pass: wire causal edges heuristically (IR causalLinks are not stored,
  // so we infer: within a commit, facts precede beliefs; across commits, ops depend
  // on the prior commit's op that introduced their subject entity.
  // Wave 119: extended to cross-commit edges for facts, clues, clocks, and emotions.

  // Build cross-commit lookup: entity → last opId that introduced it (across all prior commits).
  // We maintain these maps as we process commits in chronological order.
  const lastFactOpId = new Map<string, string>();     // factId → opId of most recent ADD_FACT
  const lastClueOpId = new Map<string, string>();     // clueId → opId of most recent SEED_CLUE
  const lastClockOpId = new Map<string, string>();    // clockId → opId of most recent RAISE_CLOCK
  const lastBeliefOpId = new Map<string, string>();   // charId → opId of most recent UPDATE_BELIEF

  function addEdge(parentId: string, childId: string): void {
    const parentNode = nodes.get(parentId);
    const childNode = nodes.get(childId);
    if (!parentNode || !childNode) return;
    if (!childNode.parents.includes(parentId)) childNode.parents.push(parentId);
    if (!parentNode.children.includes(childId)) parentNode.children.push(childId);
  }

  for (const commit of commits) {
    commit.ops.forEach((op, i) => {
      const self = opId(commit.commitId, i);

      // ── Intra-commit: UPDATE_BELIEF after ADD_FACT → fact causes belief
      if (op.op === 'UPDATE_BELIEF') {
        for (let j = 0; j < i; j++) {
          const prev = commit.ops[j];
          if (prev.op === 'ADD_FACT') {
            addEdge(opId(commit.commitId, j), self);
          }
        }
      }

      // ── Cross-commit: EXPIRE_FACT depends on the ADD_FACT that introduced the fact
      if (op.op === 'EXPIRE_FACT') {
        const src = lastFactOpId.get(op.factId);
        if (src && src !== self) addEdge(src, self);
      }

      // ── Cross-commit: PAYOFF_SETUP depends on the SEED_CLUE that planted the clue
      if (op.op === 'PAYOFF_SETUP') {
        const src = lastClueOpId.get(op.setupId);
        if (src && src !== self) addEdge(src, self);
      }

      // ── Cross-commit: RAISE_CLOCK chains — each raise depends on the prior raise of same clock
      if (op.op === 'RAISE_CLOCK') {
        const src = lastClockOpId.get(op.clockId);
        if (src && src !== self) addEdge(src, self);
      }

      // ── Cross-commit: APPRAISE_EMOTION depends on the most recent UPDATE_BELIEF for same char
      if (op.op === 'APPRAISE_EMOTION') {
        const src = lastBeliefOpId.get(op.charId);
        if (src && src !== self) addEdge(src, self);
      }
    });

    // Update lookup maps AFTER processing this commit so intra-commit ops
    // only see entities introduced by strictly prior commits.
    commit.ops.forEach((op, i) => {
      const self = opId(commit.commitId, i);
      if (op.op === 'ADD_FACT') lastFactOpId.set(op.fact.factId, self);
      if (op.op === 'SEED_CLUE') lastClueOpId.set(op.clueId, self);
      if (op.op === 'RAISE_CLOCK') lastClockOpId.set(op.clockId, self);
      if (op.op === 'UPDATE_BELIEF') lastBeliefOpId.set(op.charId, self);
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
