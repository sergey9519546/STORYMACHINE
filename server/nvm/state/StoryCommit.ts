// StoryCommit — one entry in the event-sourced canon ledger. A committed
// scene: the StoryOp[] that produced it plus a delta summary. The ledger is
// what makes the What-Breaks-If-Removed query mechanical (CLEVER_MOVES §6).

import type { StoryOp } from '../ops/StoryOp.ts';

export interface CommitDeltaSummary {
  facts: number;
  beliefs: number;
  relationships: number;
  emotions: number;
  clues: number;
  payoffs: number;
  clocks: number;
  themeArguments: number;
  objectArcs: number;
  rules: number;
  readerStateUpdates: number;
  visualFacts: number;
  sonicFacts: number;
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
  let facts = 0, beliefs = 0, relationships = 0, emotions = 0,
      clues = 0, payoffs = 0, clocks = 0, themeArguments = 0,
      objectArcs = 0, rules = 0, readerStateUpdates = 0,
      visualFacts = 0, sonicFacts = 0;
  for (const op of ops) {
    switch (op.op) {
      case 'ADD_FACT': case 'EXPIRE_FACT':      facts++;              break;
      case 'UPDATE_BELIEF':                     beliefs++;            break;
      case 'SHIFT_RELATIONSHIP':                relationships++;      break;
      case 'APPRAISE_EMOTION':                  emotions++;           break;
      case 'SEED_CLUE':                         clues++;              break;
      case 'PAYOFF_SETUP':                      payoffs++;            break;
      case 'RAISE_CLOCK':                       clocks++;             break;
      case 'ADVANCE_THEME_ARGUMENT':            themeArguments++;     break;
      case 'ADVANCE_OBJECT_ARC':                objectArcs++;         break;
      case 'TRIGGER_RULE':                      rules++;              break;
      case 'UPDATE_READER_STATE':               readerStateUpdates++; break;
      case 'RECORD_VISUAL_FACT':                visualFacts++;        break;
      case 'RECORD_SONIC_FACT':                 sonicFacts++;         break;
    }
  }
  return { facts, beliefs, relationships, emotions, clues, payoffs, clocks,
           themeArguments, objectArcs, rules, readerStateUpdates, visualFacts, sonicFacts };
}
