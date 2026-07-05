// What-Breaks-If-Removed (CLEVER_MOVES §6) — the killer query the event-sourced
// StoryCommit ledger makes mechanical. Removing a commit can leave downstream
// commits referencing facts or characters that only the removed commit
// introduced; this finds exactly those dangling references.
// Wave 119: extended to detect dangling clock and clue/payoff references.

import type { Stage } from '../../engine/Stage.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import type { ProofName } from '../proof/contract.ts';

export interface CommitBreak {
  downstreamCommit: string;
  proof: ProofName;
  reason: string;
}

export interface BreakReport {
  removedCommit: string;
  breaks: CommitBreak[];
}

function factsIntroduced(ops: StoryOp[]): string[] {
  return ops.flatMap(op => (op.op === 'ADD_FACT' ? [op.fact.factId] : []));
}

// A character is "introduced" when it first acquires a belief (becomes a mind).
// APPRAISE_EMOTION / SHIFT_RELATIONSHIP only reference an existing character.
function charsIntroduced(ops: StoryOp[]): string[] {
  return ops.flatMap(op => (op.op === 'UPDATE_BELIEF' ? [op.charId] : []));
}

// A clue is introduced by SEED_CLUE; its payoff references it via setupId.
function cluesIntroduced(ops: StoryOp[]): string[] {
  return ops.flatMap(op => (op.op === 'SEED_CLUE' ? [op.clueId] : []));
}

function factsReferenced(ops: StoryOp[]): string[] {
  return ops.flatMap(op => (op.op === 'EXPIRE_FACT' ? [op.factId] : []));
}

function charsReferenced(ops: StoryOp[]): string[] {
  return ops.flatMap(op => {
    if (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION') return [op.charId];
    if (op.op === 'SHIFT_RELATIONSHIP') return [op.pair[0], op.pair[1]];
    return [];
  });
}

function payoffsReferenced(ops: StoryOp[]): string[] {
  return ops.flatMap(op => (op.op === 'PAYOFF_SETUP' ? [op.setupId] : []));
}

export function whatBreaksIfRemoved(stage: Stage, commitId: string): BreakReport {
  const report: BreakReport = { removedCommit: commitId, breaks: [] };
  const target = stage.getCommit(commitId);
  if (!target) return report;

  const all = stage.getCommits();
  const downstream = stage.commitsAfter(commitId);

  // Things the target commit introduces.
  const targetFacts = new Set(factsIntroduced(target.ops));
  const targetChars = new Set(charsIntroduced(target.ops));
  const targetClues = new Set(cluesIntroduced(target.ops));

  // Same things introduced by any OTHER commit.
  const otherFacts = new Set<string>();
  const otherChars = new Set<string>();
  const otherClues = new Set<string>();
  for (const c of all) {
    if (c.commitId === commitId) continue;
    for (const f of factsIntroduced(c.ops)) otherFacts.add(f);
    for (const ch of charsIntroduced(c.ops)) otherChars.add(ch);
    for (const cl of cluesIntroduced(c.ops)) otherClues.add(cl);
  }

  // The target commit is the SOLE source of these.
  const soleFacts = new Set([...targetFacts].filter(f => !otherFacts.has(f)));
  const soleChars = new Set([...targetChars].filter(c => !otherChars.has(c)));
  const soleClues = new Set([...targetClues].filter(cl => !otherClues.has(cl)));

  for (const d of downstream) {
    for (const f of factsReferenced(d.ops)) {
      if (soleFacts.has(f)) {
        report.breaks.push({
          downstreamCommit: d.commitId, proof: 'TemporalProof',
          reason: `EXPIRE_FACT "${f}" — that fact is introduced only by the removed commit`,
        });
      }
    }
    for (const ch of charsReferenced(d.ops)) {
      if (soleChars.has(ch)) {
        report.breaks.push({
          downstreamCommit: d.commitId, proof: 'IntentionalProof',
          reason: `op references character "${ch}" — introduced only by the removed commit`,
        });
      }
    }
    for (const cl of payoffsReferenced(d.ops)) {
      if (soleClues.has(cl)) {
        report.breaks.push({
          downstreamCommit: d.commitId, proof: 'ProvenanceProof',
          reason: `PAYOFF_SETUP "${cl}" — that clue is seeded only by the removed commit`,
        });
      }
    }
  }
  return report;
}
