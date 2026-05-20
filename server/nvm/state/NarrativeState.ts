// NarrativeState — the unified typed state the NVM operates on. Four truth
// layers (objective / character belief / audience / author intent) plus the
// mechanism bookkeeping slots every StoryOp targets.
//
// This is a VIEW projected over the existing SQLite-backed Stage (CLEVER_MOVES
// §0 — most engines are views, not stateful services). StoryOps produce new
// NarrativeState values purely; they never mutate Stage directly.

import { createHash } from 'node:crypto';
import type { Belief, EmotionState, StoryStructure } from '../../engine/types.ts';
import type { Stage } from '../../engine/Stage.ts';
import type { AtomicFact, RelationshipDelta, ClueCarrier, ThemeMove } from '../ops/StoryOp.ts';

export interface NarrativeState {
  // Layer 1 — objective truth
  objectiveReality: AtomicFact[];
  // Layer 2 — per-character belief + emotion
  characterBeliefs: Record<string, Belief[]>;
  characterEmotions: Record<string, EmotionState>;
  // Layer 3 — audience
  audienceState: { knownFacts: string[]; suspense: number; curiosity: number; investment: number };
  // Layer 4 — author intent
  authorIntent: { theme?: string; targetStructure?: StoryStructure };
  // Mechanism + narrative bookkeeping — one slot per StoryOp family
  relationships: Record<string, RelationshipDelta[]>;   // key = relationshipKey(a, b)
  objectArcs: Record<string, string>;                   // objectId → current lifecycle state
  firedRules: string[];                                 // "mechanismId:ruleId"
  clues: Array<{ clueId: string; carrier: ClueCarrier }>;
  payoffs: Array<{ setupId: string; payoffEventId: string }>;
  clocks: Record<string, number>;
  themeArgument: Array<{ claimId: string; move: ThemeMove }>;
  sceneFacts: Array<{ sceneId: string; kind: 'visual' | 'sonic'; fact: string }>;
  turn: number;
}

export function emptyState(): NarrativeState {
  return {
    objectiveReality: [], characterBeliefs: {}, characterEmotions: {},
    audienceState: { knownFacts: [], suspense: 0, curiosity: 0, investment: 0 },
    authorIntent: {},
    relationships: {}, objectArcs: {}, firedRules: [], clues: [], payoffs: [],
    clocks: {}, themeArgument: [], sceneFacts: [], turn: 0,
  };
}

// Order-independent key for a relationship dyad.
export function relationshipKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

// Deterministic content hash — cache key (CLEVER_MOVES §2) and the value a
// NarrativeTransitionIR.beforeStateHash is checked against.
export function stateHash(s: NarrativeState): string {
  return createHash('sha256').update(canonical(s)).digest('hex').slice(0, 16);
}

// Canonical JSON with recursively sorted object keys, so logically-equal states
// hash identically regardless of key insertion order.
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const obj = value as Record<string, unknown>;
  return '{' + Object.keys(obj).sort()
    .map(k => JSON.stringify(k) + ':' + canonical(obj[k])).join(',') + '}';
}

// Projects a NarrativeState read-model from the live Stage. Objective facts
// start empty — they accumulate through ADD_FACT StoryOps, not Stage rows.
export function buildNarrativeState(stage: Stage): NarrativeState {
  const state = emptyState();
  state.turn = stage.getTurnCount();
  const illusion = stage.getIllusionState();
  state.authorIntent = { targetStructure: illusion.structure };
  for (const agent of stage.getAllAgents()) {
    if (agent.beliefs?.length) state.characterBeliefs[agent.char_id] = agent.beliefs;
    if (agent.emotionState) state.characterEmotions[agent.char_id] = agent.emotionState;
  }
  return state;
}
