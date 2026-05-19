// StoryCommit — one entry in the event-sourced canon ledger. A committed
// scene: the StoryOp[] that produced it plus a delta summary. The ledger is
// what makes the What-Breaks-If-Removed query mechanical (CLEVER_MOVES §6).

import type { StoryOp } from '../ops/StoryOp.ts';

export interface CommitDeltaSummary {
  facts: number;
  beliefs: number;
  relationships: number;
}

export interface StoryCommit {
  commitId: string;
  parentId: string | null;
  sceneIdx: number;
  ops: StoryOp[];
  deltaSummary: CommitDeltaSummary;
  reverted: boolean;
  createdAt: number;
}

// Derives the delta summary from an op list — counts ops by family.
export function summarizeOps(ops: StoryOp[]): CommitDeltaSummary {
  let facts = 0, beliefs = 0, relationships = 0;
  for (const op of ops) {
    if (op.op === 'ADD_FACT' || op.op === 'EXPIRE_FACT') facts++;
    else if (op.op === 'UPDATE_BELIEF') beliefs++;
    else if (op.op === 'SHIFT_RELATIONSHIP') relationships++;
  }
  return { facts, beliefs, relationships };
}
