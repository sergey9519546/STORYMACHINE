// Wave 33 — Author-Presence Move Bus
// Parses freeform author text into validated StoryOp[] and commits to the ledger.
//
// Author verbs (god-mode controls):
//   STEER   — bias a character's next intention toward a target behaviour.
//             Emits: RAISE_CLOCK (tension/pressure proxy) + ADD_FACT (direction record).
//   INJECT  — add a fact, clue, or pressure into the world immediately.
//             Emits: ADD_FACT / SEED_CLUE / UPDATE_READER_STATE.
//   OVERRULE — revert or replace the last commit (reuses ghost-ledger mechanism).
//             Emits: nothing directly; callers revert then re-commit.
//
// The parse is deterministic-pattern first (keyword matching); it does NOT call
// an LLM so there is no latency or token cost for immediate moves.
//
// The caller (server route) must:
//   1. Call parseAuthorMove(text, state, options)
//   2. Run buildAuthorCommit(result, state, ...) to get a StoryCommit
//   3. Call Stage.appendCommit() and update lastCommitId
// This separation keeps the bus pure and testable.

import { randomUUID } from 'crypto';
import type { StoryOp, AtomicFact, ClueCarrier } from '../ops/StoryOp.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import { summarizeOps } from '../state/StoryCommit.ts';
import { stateHash } from '../state/NarrativeState.ts';
import { runTier1, tier1Passes } from '../proof/kernel.ts';
import { logger } from '../../lib/logger.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuthorVerb = 'STEER' | 'INJECT' | 'OVERRULE';

export interface AuthorIntent {
  verb: AuthorVerb;
  /** The character being steered/injected/overruled (if any) */
  charId?: string;
  /** The raw parsed subject of the move */
  subject?: string;
  /** Free-text goal or target behaviour for STEER */
  target?: string;
  /** Content being injected (for INJECT) */
  content?: string;
  /** Clue carrier type detected for INJECT clue moves */
  clueCarrier?: ClueCarrier;
}

export interface ParsedAuthorMove {
  intent: AuthorIntent;
  ops: StoryOp[];
  /** Human-readable summary of what the move does */
  summary: string;
  /** True when the parser could not extract a valid move — ops will be empty */
  ambiguous: boolean;
}

// ── Known clue-carrier keywords ───────────────────────────────────────────────

const CLUE_CARRIER_MAP: Array<[RegExp, ClueCarrier]> = [
  [/\b(object|item|prop|thing|artifact)\b/i, 'object'],
  [/\b(line|dialogue|says?|speaks?|words?)\b/i, 'line'],
  [/\b(gesture|movement|body language|nod|shrug)\b/i, 'gesture'],
  [/\b(location|place|room|space|scene)\b/i, 'location'],
  [/\b(absence|missing|gone|lack|empty)\b/i, 'absence'],
  [/\b(behav(e|iour?|ior?))\b/i, 'behavior'],
  [/\b(camera|shot|angle|frame|reveal)\b/i, 'camera'],
  [/\b(sound|audio|noise|music|silence)\b/i, 'sound'],
];

function detectCarrier(text: string): ClueCarrier {
  for (const [re, carrier] of CLUE_CARRIER_MAP) {
    if (re.test(text)) return carrier;
  }
  return 'object';
}

// ── STEER parsing ─────────────────────────────────────────────────────────────

/**
 * STEER patterns: "steer <char> to|toward|toward <goal>"
 * Examples:
 *   "Steer Alice toward confronting Bob"
 *   "STEER bob to reveal the truth"
 *   "steer carol away from the safe"
 */
const STEER_RE = /\bsteer\s+(\w+)\s+(?:to|toward|towards|away from|into|toward)\s+(.+)/i;

function parseSteer(text: string, sceneIdx: number): ParsedAuthorMove {
  const m = STEER_RE.exec(text);
  if (!m) {
    return {
      intent: { verb: 'STEER' },
      ops: [],
      summary: 'STEER: could not parse character or goal from input',
      ambiguous: true,
    };
  }
  const charId = m[1].toLowerCase();
  const target = m[2].trim();

  // STEER emits two ops:
  //   1. ADD_FACT: records the director's intention for this character
  //   2. RAISE_CLOCK: escalates narrative pressure on the target clock
  const fact: AtomicFact = {
    factId: randomUUID(),
    subject: charId,
    predicate: 'author_steers_toward',
    object: target.slice(0, 120),
    addedAtTurn: sceneIdx,
    validFrom: sceneIdx,
    validTo: sceneIdx + 3,   // steering expires after 3 scenes
  };
  const ops: StoryOp[] = [
    { op: 'ADD_FACT', fact },
    { op: 'RAISE_CLOCK', clockId: `steer:${charId}`, amount: 1 },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 1 } },
  ];

  return {
    intent: { verb: 'STEER', charId, subject: charId, target },
    ops,
    summary: `STEER ${charId} → "${target}"`,
    ambiguous: false,
  };
}

// ── INJECT parsing ────────────────────────────────────────────────────────────

/**
 * INJECT patterns:
 *   "inject fact: <content>"
 *   "inject clue: <content>"
 *   "inject pressure: <content>"
 *   "inject <content>" (defaults to fact)
 */
const INJECT_RE = /\binject\s+(?:(fact|clue|pressure|reveal|secret)\s*:?\s*)?(.+)/i;

function parseInject(text: string, sceneIdx: number): ParsedAuthorMove {
  const m = INJECT_RE.exec(text);
  if (!m) {
    return {
      intent: { verb: 'INJECT' },
      ops: [],
      summary: 'INJECT: could not parse content from input',
      ambiguous: true,
    };
  }
  const kind = (m[1] ?? 'fact').toLowerCase() as 'fact' | 'clue' | 'pressure' | 'reveal' | 'secret';
  const content = m[2].trim();
  const ops: StoryOp[] = [];

  if (kind === 'clue') {
    const carrier = detectCarrier(content);
    const clueId = randomUUID();
    ops.push({ op: 'SEED_CLUE', clueId, carrier });
    // Also add a fact so the content is recorded in objective reality
    ops.push({
      op: 'ADD_FACT',
      fact: {
        factId: randomUUID(),
        subject: 'world',
        predicate: 'contains_clue',
        object: content.slice(0, 120),
        addedAtTurn: sceneIdx,
        validFrom: sceneIdx,
        validTo: null,
      },
    });
    ops.push({ op: 'UPDATE_READER_STATE', delta: { curiosity: 2 } });
    return {
      intent: { verb: 'INJECT', content, clueCarrier: carrier },
      ops,
      summary: `INJECT clue [${carrier}]: "${content}"`,
      ambiguous: false,
    };
  }

  if (kind === 'pressure' || kind === 'secret' || kind === 'reveal') {
    const suspenseDelta = kind === 'reveal' ? 3 : 2;
    ops.push({ op: 'UPDATE_READER_STATE', delta: { suspense: suspenseDelta } });
    ops.push({ op: 'RAISE_CLOCK', clockId: `inject:${kind}`, amount: 1 });
    ops.push({
      op: 'ADD_FACT',
      fact: {
        factId: randomUUID(),
        subject: 'world',
        predicate: `author_${kind}`,
        object: content.slice(0, 120),
        addedAtTurn: sceneIdx,
        validFrom: sceneIdx,
        validTo: null,
      },
    });
    return {
      intent: { verb: 'INJECT', content },
      ops,
      summary: `INJECT ${kind}: "${content}"`,
      ambiguous: false,
    };
  }

  // Default: inject a world fact
  ops.push({
    op: 'ADD_FACT',
    fact: {
      factId: randomUUID(),
      subject: 'world',
      predicate: 'author_fact',
      object: content.slice(0, 120),
      addedAtTurn: sceneIdx,
      validFrom: sceneIdx,
      validTo: null,
    },
  });
  ops.push({ op: 'UPDATE_READER_STATE', delta: { curiosity: 1 } });
  return {
    intent: { verb: 'INJECT', content },
    ops,
    summary: `INJECT fact: "${content}"`,
    ambiguous: false,
  };
}

// ── OVERRULE parsing ──────────────────────────────────────────────────────────

/**
 * OVERRULE signals intent to revert the last commit. The ops list is empty
 * (the caller handles the revert via Stage.revertCommit + ghost ledger);
 * this parser just extracts the verb for routing.
 */
const OVERRULE_RE = /\b(overrule|undo|revert|cancel|remove last|take back)\b/i;

function parseOverrule(text: string): ParsedAuthorMove {
  return {
    intent: { verb: 'OVERRULE', content: text.trim() },
    ops: [],
    summary: `OVERRULE: revert last commit`,
    ambiguous: false,
  };
}

// ── Main parser ───────────────────────────────────────────────────────────────

/**
 * Parse freeform author text into a `ParsedAuthorMove`.
 *
 * Detection order:
 *   1. Starts with OVERRULE keyword → parseOverrule
 *   2. Contains STEER keyword → parseSteer
 *   3. Contains INJECT keyword → parseInject
 *   4. Fallback → INJECT (author text = implicit world fact)
 */
export function parseAuthorMove(
  text: string,
  state: NarrativeState,
  options: { sceneIdx?: number } = {},
): ParsedAuthorMove {
  const trimmed = text.trim();
  const sceneIdx = options.sceneIdx ?? state.turn;

  if (OVERRULE_RE.test(trimmed)) {
    return parseOverrule(trimmed);
  }
  if (/\bsteer\b/i.test(trimmed)) {
    return parseSteer(trimmed, sceneIdx);
  }
  if (/\binject\b/i.test(trimmed)) {
    return parseInject(trimmed, sceneIdx);
  }

  // Implicit INJECT: author types free prose → treat as a world fact injection
  const fallback = parseInject(`inject fact: ${trimmed}`, sceneIdx);
  fallback.intent.verb = 'INJECT';
  fallback.summary = `INJECT (implicit): "${trimmed.slice(0, 80)}"`;
  return fallback;
}

// ── Commit builder ────────────────────────────────────────────────────────────

export interface AuthorCommitInput {
  move: ParsedAuthorMove;
  beforeState: NarrativeState;
  sceneIdx: number;
  parentId: string | null;
}

/**
 * Build a StoryCommit from a parsed author move.
 * Returns null if Tier-1 proof fails or if the move has no ops (e.g. OVERRULE).
 */
export function buildAuthorCommit(input: AuthorCommitInput): StoryCommit | null {
  const { move, beforeState, sceneIdx, parentId } = input;

  if (move.ops.length === 0) return null;

  // Build IR for the proof gate
  const ir: NarrativeTransitionIR = {
    transitionId: randomUUID(),
    sceneIdx,
    sceneFunction: intentToSceneFunction(move.intent),
    activeMechanisms: intentToMechanism(move.intent),
    beforeStateHash: stateHash(beforeState),
    ops: move.ops,
    preconditions: ['author_present'],
    postconditions: [],
    provenance: { origin: 'user_authored', createdAt: Date.now() },
  };

  const tier1Results = runTier1(ir, beforeState);
  if (!tier1Passes(tier1Results)) {
    const failing = tier1Results.filter(r => !r.pass).map(r => r.proof).join(', ');
    logger.warn('author_commit_tier1_reject', { verb: move.intent.verb, failing, summary: move.summary });
    return null;
  }

  const commit: StoryCommit = {
    commitId: randomUUID(),
    parentId,
    sceneIdx,
    ops: move.ops,
    deltaSummary: summarizeOps(move.ops),
    reverted: false,
    createdAt: Date.now(),
  };
  return commit;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function intentToSceneFunction(
  intent: AuthorIntent,
): import('../ir/NarrativeTransitionIR.ts').SceneFunction {
  switch (intent.verb) {
    case 'STEER':    return 'build_tension';
    case 'INJECT':   return intent.clueCarrier ? 'set_up_payoff' : 'establish_world';
    case 'OVERRULE': return 'advance_plot';
  }
}

function intentToMechanism(intent: AuthorIntent): string[] {
  switch (intent.verb) {
    case 'STEER':    return ['relationship_externalization'];
    case 'INJECT':   return ['object_burden'];
    case 'OVERRULE': return ['legitimacy_split'];
  }
}
