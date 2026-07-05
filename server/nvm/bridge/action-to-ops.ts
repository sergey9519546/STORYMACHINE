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
import type { ActionLogEntry, EpistemicUpdate, EventCard, EmotionState } from '../../engine/types.ts';
import type { StoryOp, AtomicFact, RelationshipDelta } from '../ops/StoryOp.ts';
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

// ── Theory-of-mind → SHIFT_RELATIONSHIP ─────────────────────────────────────
// Fix A (simulation↔NVM integration audit): the bridge previously only ever
// emitted UPDATE_READER_STATE / UPDATE_BELIEF / ADD_FACT / RAISE_CLOCK — the
// simulation's theory-of-mind deltas (trust/affinity/debt) and OCC emotion
// appraisals, its richest per-turn signal, never became StoryOps, so every NVM
// relationship analytic (reincorporation, genericness, character-agency,
// attribution — see server/nvm/proof/tier{2,3,4}/*.ts, all of which already
// branch on SHIFT_RELATIONSHIP/APPRAISE_EMOTION) was permanently blind to
// simulated stories. This section + emotionAppraisalsToOps below complete
// that vocabulary. The diff itself is computed at the Orchestrator call site
// (where before/after TheoryOfMind and EmotionState snapshots are actually in
// scope) — this module only turns an already-computed diff into StoryOps,
// deterministically, per the bridge's existing "no LLM, no randomness" rule.

/** One already-computed theory-of-mind (or other relationship) delta, ready to
 *  become a SHIFT_RELATIONSHIP op once it clears the materiality threshold. */
export interface RelationshipDeltaInput {
  pair: [string, string];
  dimension: RelationshipDelta['dimension'];
  amount: number;   // signed -1..1 — the (after - before) diff, computed by the caller
  reason: string;
}

/** One already-computed emotion appraisal, ready to become an APPRAISE_EMOTION
 *  op once it clears the significance threshold. */
export interface EmotionAppraisalInput {
  charId: string;
  emotion: EmotionState;
}

// Minimum |amount| for a relationship delta to be committed as a StoryOp.
// TheoryOfMind dimensions drift by small fractions almost every turn (CICERO
// trust decay alone moves unobserved agents by 0.01 per update — see
// Agent.ts's "CICERO trust decay" block) — committing every such micro-drift
// would flood NarrativeState.relationships with noise and defeat the
// "material change" signal every downstream relationship analytic relies on
// (reincorporationProof, genericnessProof, the fountain/novel/stage
// projectors). 0.03 is ~3x the largest routine per-turn decay step, so it
// only lets through deltas an audience would actually notice.
const RELATIONSHIP_DELTA_THRESHOLD = 0.03;

export function relationshipDeltasToOps(deltas: RelationshipDeltaInput[]): StoryOp[] {
  const ops: StoryOp[] = [];
  for (const d of deltas) {
    if (!Number.isFinite(d.amount) || Math.abs(d.amount) < RELATIONSHIP_DELTA_THRESHOLD) continue;
    ops.push({
      op: 'SHIFT_RELATIONSHIP',
      pair: d.pair,
      delta: { dimension: d.dimension, amount: d.amount, reason: d.reason },
    });
  }
  return ops;
}

// Minimum dominant-emotion intensity for an appraisal to be committed as a
// StoryOp. AppraisalEngine's own setDominant() (server/engine/AppraisalEngine.ts)
// already treats intensity <= 10 as 'neutral' — not a real appraisal, just
// baseline noise around zero. We use a slightly higher bar (15) here because a
// StoryOp is a permanent canon entry (unlike the engine's own per-turn,
// decaying emotionState), so the bar for "this appraisal is worth writing into
// the story forever" is intentionally a notch stricter than the bar for
// "this is the character's current mood".
const EMOTION_SIGNIFICANCE_THRESHOLD = 15;

export function emotionAppraisalsToOps(appraisals: EmotionAppraisalInput[]): StoryOp[] {
  const ops: StoryOp[] = [];
  for (const a of appraisals) {
    if (a.emotion.dominant === 'neutral') continue;
    if (!Number.isFinite(a.emotion.intensity) || a.emotion.intensity < EMOTION_SIGNIFICANCE_THRESHOLD) continue;
    ops.push({ op: 'APPRAISE_EMOTION', charId: a.charId, emotion: a.emotion });
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
  /** Fix A: theory-of-mind deltas computed at the Orchestrator call site
   *  (before/after diff of TheoryOfMind per acting agent). Additive/optional —
   *  omitted by every pre-existing caller, which preserves their exact prior
   *  behavior (no SHIFT_RELATIONSHIP ops). Defaults to []. */
  relationshipDeltas?: RelationshipDeltaInput[];
  /** Fix A: emotion appraisals computed at the Orchestrator call site
   *  (post-AppraisalEngine.appraise() EmotionState per updated agent).
   *  Additive/optional — same backward-compat guarantee as above.
   *  Defaults to []. */
  emotionAppraisals?: EmotionAppraisalInput[];
  /** Fix C: called with the joined Tier-1 failing-proof names when this
   *  turn's ops fail the proof gate and the commit is dropped. Additive/
   *  optional — every pre-existing caller omits it, so the original
   *  silent-log-only behavior (a logger.warn and a null return) is preserved
   *  exactly. The Orchestrator wires this to accumulate a droppedCommits
   *  count/reasons list so route handlers can surface it to the user instead
   *  of the drop being invisible outside the server log. */
  onTier1Reject?: (reasons: string) => void;
}

/**
 * Build a StoryCommit from one complete Orchestrator turn.
 * Returns null if Tier-1 proof fails — the caller logs and continues.
 */
export function buildTurnCommit(input: BridgeInput): StoryCommit | null {
  const {
    entry, card, primaryUpdate, extraUpdates = [],
    relationshipDeltas = [], emotionAppraisals = [], onTier1Reject,
    turnIndex, beforeState, sceneIdx, parentId,
  } = input;

  // ── Collect ops ──────────────────────────────────────────────────────────────
  const baseOps: StoryOp[] = [
    ...entryToOps(entry, card, turnIndex),
    ...epistemicUpdateToOps(primaryUpdate),
    ...extraUpdates.flatMap(u => epistemicUpdateToOps(u)),
  ];

  // Fix A: ground new SHIFT_RELATIONSHIP / APPRAISE_EMOTION ops against the
  // EXACT SAME "known character" rule IntentionalProof (Tier 1) enforces
  // (server/nvm/proof/tier1/intentional.ts) — a character is grounded once
  // they have a belief/emotion already in beforeState, or earn an
  // UPDATE_BELIEF in this turn's own ops. Pre-filtering here means a
  // relationship/emotion op for a not-yet-grounded character can never sink
  // the WHOLE commit (including this turn's otherwise-valid belief updates)
  // through IntentionalProof — it is simply dropped from this turn and picked
  // up honestly on a later turn once the character is grounded some other way.
  const known = new Set<string>([
    ...Object.keys(beforeState.characterBeliefs),
    ...Object.keys(beforeState.characterEmotions),
  ]);
  for (const op of baseOps) {
    if (op.op === 'UPDATE_BELIEF') known.add(op.charId);
  }

  const relationshipOps = relationshipDeltasToOps(relationshipDeltas)
    .filter((op): op is Extract<StoryOp, { op: 'SHIFT_RELATIONSHIP' }> =>
      op.op === 'SHIFT_RELATIONSHIP' && known.has(op.pair[0]) && known.has(op.pair[1]));
  const emotionOps = emotionAppraisalsToOps(emotionAppraisals)
    .filter((op): op is Extract<StoryOp, { op: 'APPRAISE_EMOTION' }> =>
      op.op === 'APPRAISE_EMOTION' && known.has(op.charId));

  const ops: StoryOp[] = [...baseOps, ...relationshipOps, ...emotionOps];

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
    // Fix C: let the caller (Orchestrator) know a commit was dropped and why,
    // so it can surface `droppedCommits` in its route responses instead of
    // the drop being visible only in the server log. Additive — omitted by
    // every pre-existing caller, so their behavior is unchanged.
    onTier1Reject?.(failing);
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
