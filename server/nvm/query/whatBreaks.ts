// What-Breaks-If-Removed (CLEVER_MOVES §6) — the killer query the event-sourced
// StoryCommit ledger makes mechanical. Removing a commit can leave downstream
// commits referencing facts or characters that only the removed commit
// introduced; this finds exactly those dangling references.

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

export function whatBreaksIfRemoved(stage: Stage, commitId: string): BreakReport {
  const report: BreakReport = { removedCommit: commitId, breaks: [] };
  const target = stage.getCommit(commitId);
  if (!target) return report;

  const all = stage.getCommits();
  const downstream = stage.commitsAfter(commitId);

  // Facts / characters the target commit introduces.
  const targetFacts = new Set(factsIntroduced(target.ops));
  const targetChars = new Set(charsIntroduced(target.ops));

  // Facts / characters any OTHER commit also introduces.
  const otherFacts = new Set<string>();
  const otherChars = new Set<string>();
  for (const c of all) {
    if (c.commitId === commitId) continue;
    for (const f of factsIntroduced(c.ops)) otherFacts.add(f);
    for (const ch of charsIntroduced(c.ops)) otherChars.add(ch);
  }

  // The target commit is the SOLE source of these.
  const soleFacts = new Set([...targetFacts].filter(f => !otherFacts.has(f)));
  const soleChars = new Set([...targetChars].filter(c => !otherChars.has(c)));

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
  }
  return report;
}
