// Ghost Ledger — shadow canon for rejected IR candidates.
// When the convergence loop (Wave 5) or a human editor rejects a candidate IR,
// it becomes a ghost commit: inspectable, branchable, never merged into canon.
// `branchFromGhost` promotes a ghost back to a live StoryOp[] for What-If exploration.

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { Stage } from '../../engine/Stage.ts';

export type GhostReason =
  | 'proof_fail'
  | 'valuation_too_low'
  | 'editor_reject'
  | 'convergence_evicted';

export interface GhostCommit {
  ghostId: string;
  parentCommitId: string | null;
  sceneIdx: number;
  ir: NarrativeTransitionIR;
  reason: GhostReason;
  rejectedAt: number;
}

export interface BranchResult {
  ghostId: string;
  branchedOps: NarrativeTransitionIR['ops'];
  sceneIdx: number;
}

export function appendGhost(stage: Stage, ghost: GhostCommit): void {
  stage.ghostLedgerAppend(ghost);
}

export function getGhosts(stage: Stage, sceneIdx?: number): GhostCommit[] {
  return stage.ghostLedgerGet(sceneIdx);
}

// Promote a ghost's ops back to a candidate for What-If exploration.
// The caller is responsible for running tier1 proofs before committing.
export function branchFromGhost(stage: Stage, ghostId: string): BranchResult | null {
  const ghost = stage.ghostLedgerFind(ghostId);
  if (!ghost) return null;
  return {
    ghostId,
    branchedOps: ghost.ir.ops,
    sceneIdx: ghost.sceneIdx,
  };
}
