// Wave 32 — Action↔StoryOp Bridge
// Converts one AI-engine turn (ActionLogEntry + EventCard + EpistemicUpdates)
// into StoryOp[] and wraps them as a StoryCommit written to the canon ledger.
//
// This is the keystone that unifies the two engines: every AI-sim action now
// produces a StoryCommit that the compiler (project, regression, momentum,
// voice-DNA) can read — the lived story and the compiled screenplay are one.
//
// DESIGN NOTES
// ─────────────
// • One commit per Orchestrator.runTurn() call (one agent's full narrative beat).
// • For runRoomSimulation, one commit per agent per round (same boundary).
// • Ops are generated deterministically from engine data, no LLM needed here.
// • The proof kernel (Tier 1) gate is run; if it fails, the commit is skipped
//   and a warning is logged rather than throwing — the lived story must never
//   stall because a proof fails on a live action.
// • Bridge is pure: Stage reads happen at call site; bridge only does mapping.

import { randomUUID } from 'crypto';
import type { ActionLogEntry, EpistemicUpdate, EventCard } from '../../engine/types.ts';
import type { StoryOp, AtomicFact } from '../ops/StoryOp.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import { summarizeOps } from '../state/StoryCommit.ts';
import { stateHash } from '../state/NarrativeState.ts';
import { runTier1, tier1Passes } from '../proof/kernel.ts';
import { logger } from '../../lib/logger.ts';

// ── Action → ops ─────────────────────────────────────────────────────────────

/**
 * Map one ActionLogEntry to its primary StoryOps.
 *
 * The mapping is intentionally coarse for Wave 32 — it captures the
 * narrative-significant information in each action type without requiring full
 * prose or LLM calls.
 *
 *   SPEAK   → UPDATE_READER_STATE (curiosity ↑) + UPDATE_BELIEF (proposition told to listeners)
 *   LIE     → UPDATE_READER_STATE (suspense ↑) + UPDATE_BELIEF (false proposition planted)
 *   EXAMINE → ADD_FACT (observed content) + UPDATE_READER_STATE (curiosity ↑)
 *   RELOCATE→ ADD_FACT (location change) + UPDATE_READER_STATE (minor suspense)
 *   WAIT    → (no ops — silent beat)
 */
export function entryToOps(
  entry: ActionLogEntry,
  card: EventCard | null,
  turnIndex: number,
): StoryOp[] {
  const ops: StoryOp[] = [];

  switch (entry.action_type) {
    case 'SPEAK': {
      ops.push({ op: 'UPDATE_READER_STATE', delta: { curiosity: 1 } });
      // Each proposition becomes a belief update for potential listeners
      for (const prop of card?.propositions ?? []) {
        ops.push({
          op: 'UPDATE_BELIEF',
          charId: entry.target_char_id ?? entry.char_id,
          belief: {
            id: prop.proposition_id,
            proposition: prop.content,
            confidence: 0.7,  // told = 0.7 per canonical belief source table
            source: 'told',
            source_agent_id: entry.char_id,
            source_event_id: entry.action_id,
            acquired_at: turnIndex,
            contradicts: [],
          },
        });
      }
      break;
    }
    case 'LIE': {
      // Audience gains suspense because a lie has been planted
      ops.push({ op: 'UPDATE_READER_STATE', delta: { suspense: 2 } });
      // The listener believes the proposition (but audience knows it's false)
      for (const prop of card?.propositions ?? []) {
        ops.push({
          op: 'UPDATE_BELIEF',
          charId: entry.target_char_id ?? entry.char_id,
          belief: {
            id: prop.proposition_id,
            proposition: prop.content,
            confidence: 0.7,
            source: 'told',
            source_agent_id: entry.char_id,
            source_event_id: entry.action_id,
            acquired_at: turnIndex,
            contradicts: [],
          },
        });
      }
      break;
    }
    case 'EXAMINE': {
      ops.push({ op: 'UPDATE_READER_STATE', delta: { curiosity: 2 } });
      const target = entry.target_char_id ?? entry.content.slice(0, 60);
      const fact: AtomicFact = {
        factId: randomUUID(),
        subject: entry.char_id,
        predicate: 'examines',
        object: target,
        addedAtTurn: turnIndex,
        validFrom: turnIndex,
        validTo: null,
      };
      ops.push({ op: 'ADD_FACT', fact });
      break;
    }
    case 'RELOCATE': {
      ops.push({ op: 'UPDATE_READER_STATE', delta: { suspense: 1 } });
      const fact: AtomicFact = {
        factId: randomUUID(),
        subject: entry.char_id,
        predicate: 'moves_to',
        object: entry.content.replace(/^→\s*/, '').slice(0, 80),
        addedAtTurn: turnIndex,
        validFrom: turnIndex,
        validTo: null,
      };
      ops.push({ op: 'ADD_FACT', fact });
      break;
    }
    case 'WAIT':
      // Silent beat — no narrative information produced
      break;
  }

  return ops;
}

/**
 * Convert an EpistemicUpdate to StoryOps.
 *
 *   new_beliefs         → UPDATE_BELIEF per belief (direct epistemic record)
 *   contradiction_detected → UPDATE_READER_STATE (suspense ↑) — audience tension rises
 *                            + RAISE_CLOCK on a structural clock if one exists
 */
export function epistemicUpdateToOps(update: EpistemicUpdate): StoryOp[] {
  const ops: StoryOp[] = [];

  for (const belief of update.new_beliefs) {
    ops.push({
      op: 'UPDATE_BELIEF',
      charId: update.char_id,
      belief,
    });
  }

  if (update.contradiction_detected) {
    // Contradiction = dramatic tension spike; audience suspense rises
    ops.push({ op: 'UPDATE_READER_STATE', delta: { suspense: 3 } });
    // Clock: 'contradiction_clock' is a synthetic clock tracking unresolved conflicts
    ops.push({ op: 'RAISE_CLOCK', clockId: 'contradiction_clock', amount: 1 });
  }

  return ops;
}

// ── Turn → StoryCommit ────────────────────────────────────────────────────────

export interface BridgeInput {
  /** The primary action for this turn */
  entry: ActionLogEntry;
  /** The EventCard produced by CausalSpine.processEvent (null for WAIT) */
  card: EventCard | null;
  /** Primary epistemic update (the acting agent's own update) */
  primaryUpdate: EpistemicUpdate;
  /** Additional updates (director, observer agents) */
  extraUpdates?: EpistemicUpdate[];
  /** Current turn index from Stage.getTurnCount() */
  turnIndex: number;
  /** State BEFORE this turn (for the proof kernel and beforeStateHash) */
  beforeState: NarrativeState;
  /** Scene index — used as StoryCommit.sceneIdx */
  sceneIdx: number;
  /** Parent commit ID (null if first commit) */
  parentId: string | null;
}

/**
 * Build a StoryCommit from one complete Orchestrator turn.
 * Returns null if Tier-1 proof fails — the caller logs and continues.
 */
export function buildTurnCommit(input: BridgeInput): StoryCommit | null {
  const {
    entry, card, primaryUpdate, extraUpdates = [],
    turnIndex, beforeState, sceneIdx, parentId,
  } = input;

  // ── Collect ops ──────────────────────────────────────────────────────────────
  const ops: StoryOp[] = [
    ...entryToOps(entry, card, turnIndex),
    ...epistemicUpdateToOps(primaryUpdate),
    ...extraUpdates.flatMap(u => epistemicUpdateToOps(u)),
  ];

  if (ops.length === 0) {
    // WAIT turn with no epistemic change — skip committing (nothing to record)
    return null;
  }

  // ── Proof gate (Tier 1 only — hard blocks) ──────────────────────────────────
  // Build a minimal IR so we can run the kernel. The IR's preconditions and
  // postconditions are approximate for live turns — we don't have explicit plans —
  // but the kernel can still catch causality / continuity violations.
  const ir: NarrativeTransitionIR = {
    transitionId: randomUUID(),
    sceneIdx,
    sceneFunction: actionToSceneFunction(entry),
    activeMechanisms: [actionToMechanism(entry)],
    beforeStateHash: stateHash(beforeState),
    ops,
    preconditions: [`agent:${entry.char_id}:alive`],
    postconditions: [],
    provenance: { origin: 'model_generated', createdAt: Date.now() },
  };

  const tier1Results = runTier1(ir, beforeState);
  if (!tier1Passes(tier1Results)) {
    const failing = tier1Results.filter(r => !r.pass).map(r => r.proof).join(', ');
    logger.warn('bridge_tier1_reject', {
      actionId: entry.action_id,
      actionType: entry.action_type,
      charId: entry.char_id,
      failing,
    });
    // Tier-1 failure on a live turn → skip but do NOT throw (engine must not stall)
    return null;
  }

  // ── Build commit ─────────────────────────────────────────────────────────────
  const commit: StoryCommit = {
    commitId: randomUUID(),
    parentId,
    sceneIdx,
    ops,
    deltaSummary: summarizeOps(ops),
    reverted: false,
    createdAt: Date.now(),
  };

  return commit;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionToSceneFunction(
  entry: ActionLogEntry,
): import('../ir/NarrativeTransitionIR.ts').SceneFunction {
  switch (entry.action_type) {
    case 'SPEAK':    return 'reveal_character';
    case 'LIE':      return 'build_tension';
    case 'EXAMINE':  return 'reveal_character';
    case 'RELOCATE': return 'advance_plot';
    case 'WAIT':     return 'build_tension';
  }
}

/**
 * Map an action type to the most appropriate loaded mechanism ID.
 * Available mechanisms: legitimacy_split, object_burden, relationship_externalization.
 *
 * - SPEAK / WAIT → relationship_externalization (social exchange)
 * - LIE           → legitimacy_split (deception delegitimizes)
 * - EXAMINE        → object_burden (physical object carries story weight)
 * - RELOCATE       → relationship_externalization (social positioning)
 */
function actionToMechanism(entry: ActionLogEntry): string {
  switch (entry.action_type) {
    case 'LIE':     return 'legitimacy_split';
    case 'EXAMINE': return 'object_burden';
    default:        return 'relationship_externalization';
  }
}
