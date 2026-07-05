// StoryOp bytecode (HYBRID_DECISION §6, decision 1) — the canonical typed
// instruction set every NarrativeModule emits. 14 ops: the NVM's 12 + the
// two media ops (RECORD_VISUAL_FACT / RECORD_SONIC_FACT).
//
// TO ADD A NEW OP: extend the union below. The `STORY_OP_KINDS` record and the
// dispatcher's `assertNever` arm both fail to compile until the op is handled.

import type { Belief, EmotionState } from '../../engine/types.ts';

// An objective truth-claim with a temporal validity interval.
export interface AtomicFact {
  factId: string;
  subject: string;
  predicate: string;
  object: string;
  addedAtTurn: number;
  validFrom: number;
  validTo: number | null;   // null = still valid
}

export interface RelationshipDelta {
  // Wave E1-b: +4 dimensions (jealousy, respect, rivalry, protectiveness),
  // 10 → 14. `shame` was evaluated and deliberately excluded: EmotionState
  // (server/engine/types.ts) already has its own `shame` field — shame is a
  // feeling a character holds about themselves, not an axis a relationship
  // BETWEEN two people moves along, so admitting it here would duplicate an
  // emotion as a relationship dimension rather than describe a genuinely
  // relational quantity (contrast with `contempt`, which is inherently
  // directed AT the other party and so is relational).
  dimension: 'love' | 'trust' | 'intimacy' | 'admiration' | 'resentment'
           | 'fear' | 'contempt' | 'guilt' | 'obligation' | 'dependency'
           | 'jealousy' | 'respect' | 'rivalry' | 'protectiveness';
  amount: number;   // signed, -1..1
  reason: string;
}

// 18 clue carrier types (GODMODE Stage 8 — clue ecology). Wave E1-b: +10
// (costume, lighting, timing, silence, transformation, wound, document,
// symbol, animal, price), 8 → 18.
export type ClueCarrier =
  'object' | 'line' | 'gesture' | 'location' | 'absence' | 'behavior' | 'camera' | 'sound'
  | 'costume' | 'lighting' | 'timing' | 'silence' | 'transformation' | 'wound' | 'document'
  | 'symbol' | 'animal' | 'price';

// Theme argumentation moves (GODMODE Stage 2 — ThemeArgumentGraph). Wave
// E1-b: +6 (invert, parallel, echo, interrogate, demonstrate_through_failure,
// humanize), 5 → 11. A 7th candidate, 'subvert', was evaluated and dropped as
// a synonym of the existing `undercut` (both mean "weaken/undermine the
// claim from within") — no craft-plausible two-voice rendering reliably
// distinguished it from undercut's; see project/index.ts's themeArgumentLines
// and this wave's final report for the reasoning.
export type ThemeMove =
  'support' | 'attack' | 'undercut' | 'complicate' | 'resolve'
  | 'invert' | 'parallel' | 'echo' | 'interrogate' | 'demonstrate_through_failure' | 'humanize';

export interface ReaderStateDelta {
  suspense?: number;     // signed deltas
  curiosity?: number;
  investment?: number;
  knownFact?: string;    // a fact the audience now knows
}

export type StoryOp =
  | { op: 'ADD_FACT';               fact: AtomicFact }
  | { op: 'EXPIRE_FACT';            factId: string; atTurn: number }
  | { op: 'UPDATE_BELIEF';          charId: string; belief: Belief }
  | { op: 'APPRAISE_EMOTION';       charId: string; emotion: EmotionState }
  | { op: 'SHIFT_RELATIONSHIP';     pair: [string, string]; delta: RelationshipDelta }
  | { op: 'ADVANCE_OBJECT_ARC';     objectId: string; toState: string }
  | { op: 'TRIGGER_RULE';           mechanismId: string; ruleId: string }
  | { op: 'SEED_CLUE';              clueId: string; carrier: ClueCarrier }
  | { op: 'PAYOFF_SETUP';           setupId: string; payoffEventId: string }
  | { op: 'RAISE_CLOCK';            clockId: string; amount: number }
  | { op: 'ADVANCE_THEME_ARGUMENT'; claimId: string; move: ThemeMove }
  | { op: 'UPDATE_READER_STATE';    delta: ReaderStateDelta }
  | { op: 'RECORD_VISUAL_FACT';     sceneId: string; fact: string }
  | { op: 'RECORD_SONIC_FACT';      sceneId: string; fact: string };

export type StoryOpKind = StoryOp['op'];

// Exhaustiveness guard — proves all 14 op kinds are enumerable.
export const STORY_OP_KINDS: Record<StoryOpKind, true> = {
  ADD_FACT: true, EXPIRE_FACT: true, UPDATE_BELIEF: true, APPRAISE_EMOTION: true,
  SHIFT_RELATIONSHIP: true, ADVANCE_OBJECT_ARC: true, TRIGGER_RULE: true,
  SEED_CLUE: true, PAYOFF_SETUP: true, RAISE_CLOCK: true, ADVANCE_THEME_ARGUMENT: true,
  UPDATE_READER_STATE: true, RECORD_VISUAL_FACT: true, RECORD_SONIC_FACT: true,
};
