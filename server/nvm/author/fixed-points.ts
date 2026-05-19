// Temporal Authoring (G9) — the writer authors *destiny*.
// A FixedPoint declares a future scene that MUST be reached: a set of
// required StoryOps that must be present in canon by `atScene`, or a
// partial NarrativeState snapshot that must hold.
//
// `planToward(state, fixedPoints)` returns GoalBias[] — pressure ops and
// clue seeds that the director injects into earlier scenes to steer the
// simulation toward every declared attractor while staying emergent.

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryOp, AtomicFact } from '../ops/StoryOp.ts';

// ── Public types ─────────────────────────────────────────────────────────────

/** A desired state the story must reach by `atScene`. */
export interface FixedPoint {
  /** Scene index by which this fixed point must be satisfied. */
  atScene: number;
  /** The required facts, beliefs or ops that must hold at that scene. */
  required: FixedPointRequirement;
  /** Human-readable description of the attractor (used in transcripts). */
  description?: string;
}

/** What must hold at a fixed point — one or more constraint flavours. */
export interface FixedPointRequirement {
  /** Fact IDs that must exist in objectiveReality. */
  factIds?: string[];
  /** Characters whose belief sets must be non-empty. */
  characterIds?: string[];
  /** Clue IDs that must have been seeded. */
  clueIds?: string[];
  /** Theme claims that must have been advanced. */
  claimIds?: string[];
  /** Setup IDs that must have been paid off. */
  payoffSetupIds?: string[];
  /** The audience suspense level that must be met or exceeded. */
  minSuspense?: number;
  /** Specific StoryOps that must be present in canon verbatim. */
  requiredOps?: StoryOp[];
}

/** A bias the planner injects into earlier scenes to reach a fixed point. */
export interface GoalBias {
  /** Scene index at which this bias should be applied (always before fixedPoint.atScene). */
  atScene: number;
  /** The StoryOp(s) to inject or suggest for this scene. */
  ops: StoryOp[];
  /** Which fixed point this bias serves. */
  fixedPointDescription: string;
  /** Why this bias is needed — for the argument transcript. */
  rationale: string;
}

/** Summary of which fixed points are reachable vs blocked in current state. */
export interface PlanResult {
  biases: GoalBias[];
  /** Fixed points already satisfied by current state (no action needed). */
  alreadySatisfied: FixedPoint[];
  /** Fixed points that cannot be satisfied in time given current scene. */
  blocked: Array<{ fixedPoint: FixedPoint; reason: string }>;
  /** Human-readable planning transcript. */
  transcript: string;
}

// ── planToward ────────────────────────────────────────────────────────────────

/**
 * Backward-chain from each FixedPoint to the current scene.
 * Returns GoalBias[] the director can inject into earlier scenes to steer
 * the simulation toward every declared attractor.
 *
 * @param state       The current NarrativeState (read-only).
 * @param fixedPoints The declared attractors the story must reach.
 * @param currentScene The scene index the sim is currently producing.
 */
export function planToward(
  state: NarrativeState,
  fixedPoints: FixedPoint[],
  currentScene = 0,
): PlanResult {
  const biases: GoalBias[] = [];
  const alreadySatisfied: FixedPoint[] = [];
  const blocked: Array<{ fixedPoint: FixedPoint; reason: string }> = [];
  const lines: string[] = ['## Temporal Planner — Forward from fixed points', ''];

  // Sort by deadline: earliest first so biases don't clobber each other
  const sorted = [...fixedPoints].sort((a, b) => a.atScene - b.atScene);

  for (const fp of sorted) {
    const desc = fp.description ?? `fixed point @ scene ${fp.atScene}`;

    if (isSatisfied(fp.required, state)) {
      alreadySatisfied.push(fp);
      lines.push(`✓ Already satisfied: ${desc}`);
      continue;
    }

    const scenesRemaining = fp.atScene - currentScene;
    if (scenesRemaining <= 0) {
      blocked.push({ fixedPoint: fp, reason: `deadline scene ${fp.atScene} has passed (current: ${currentScene})` });
      lines.push(`✗ BLOCKED: ${desc} — deadline passed`);
      continue;
    }

    // Backward-chain: figure out what ops are missing and spread them over
    // the remaining window, biased toward the earliest available scene.
    const missing = missingRequirements(fp.required, state);
    lines.push(`→ Planning toward: ${desc} (${scenesRemaining} scene(s) of runway)`);

    const spread = spreadBiases(missing, currentScene, fp.atScene, desc, state);
    biases.push(...spread);

    for (const b of spread) {
      lines.push(`  scene ${b.atScene}: inject ${b.ops.map(o => o.op).join(', ')} — ${b.rationale}`);
    }
  }

  return {
    biases,
    alreadySatisfied,
    blocked,
    transcript: lines.join('\n'),
  };
}

// ── Satisfaction check ────────────────────────────────────────────────────────

function isSatisfied(req: FixedPointRequirement, state: NarrativeState): boolean {
  if (req.factIds?.some(id => !state.objectiveReality.some(f => f.factId === id))) return false;
  if (req.characterIds?.some(id => !state.characterBeliefs[id]?.length)) return false;
  if (req.clueIds?.some(id => !state.clues.some(c => c.clueId === id))) return false;
  if (req.claimIds?.some(id => !state.themeArgument.some(t => t.claimId === id))) return false;
  if (req.payoffSetupIds?.some(id => !state.payoffs.some(p => p.setupId === id))) return false;
  if (req.minSuspense !== undefined && state.audienceState.suspense < req.minSuspense) return false;
  return true;
}

// ── Missing requirement extractor ─────────────────────────────────────────────

interface MissingItem {
  kind: 'fact' | 'character' | 'clue' | 'claim' | 'payoff' | 'suspense' | 'op';
  id?: string;
  op?: StoryOp;
  detail?: string;
}

function missingRequirements(req: FixedPointRequirement, state: NarrativeState): MissingItem[] {
  const items: MissingItem[] = [];

  for (const id of req.factIds ?? []) {
    if (!state.objectiveReality.some(f => f.factId === id))
      items.push({ kind: 'fact', id });
  }
  for (const id of req.characterIds ?? []) {
    if (!state.characterBeliefs[id]?.length)
      items.push({ kind: 'character', id });
  }
  for (const id of req.clueIds ?? []) {
    if (!state.clues.some(c => c.clueId === id))
      items.push({ kind: 'clue', id });
  }
  for (const id of req.claimIds ?? []) {
    if (!state.themeArgument.some(t => t.claimId === id))
      items.push({ kind: 'claim', id });
  }
  for (const id of req.payoffSetupIds ?? []) {
    if (!state.payoffs.some(p => p.setupId === id))
      items.push({ kind: 'payoff', id });
  }
  if (req.minSuspense !== undefined && state.audienceState.suspense < req.minSuspense) {
    items.push({ kind: 'suspense', detail: `need ${req.minSuspense}, have ${state.audienceState.suspense}` });
  }
  for (const op of req.requiredOps ?? []) {
    items.push({ kind: 'op', op });
  }
  return items;
}

// ── Bias generation (backward chain → forward schedule) ──────────────────────

function spreadBiases(
  missing: MissingItem[],
  currentScene: number,
  deadline: number,
  fpDesc: string,
  state: NarrativeState,
): GoalBias[] {
  if (missing.length === 0) return [];

  const window = deadline - currentScene;   // available scenes
  const biases: GoalBias[] = [];

  // Clues must be planted first (at least 1 scene before payoff)
  // Facts must precede beliefs that reference them
  // Sort: clues → facts → characters → claims → payoffs → ops → suspense

  const clues = missing.filter(m => m.kind === 'clue');
  const facts = missing.filter(m => m.kind === 'fact');
  const chars = missing.filter(m => m.kind === 'character');
  const claims = missing.filter(m => m.kind === 'claim');
  const payoffs = missing.filter(m => m.kind === 'payoff');
  const ops = missing.filter(m => m.kind === 'op');
  const suspenseItems = missing.filter(m => m.kind === 'suspense');

  // Clues: plant as early as possible (front of window)
  let ptr = currentScene;
  for (const item of clues) {
    const scene = Math.min(ptr, deadline - 1);
    biases.push({
      atScene: scene,
      ops: [{ op: 'SEED_CLUE', clueId: item.id!, carrier: 'object' }],
      fixedPointDescription: fpDesc,
      rationale: `clue "${item.id}" must be planted before the reveal`,
    });
    ptr = Math.min(ptr + 1, deadline - 1);
  }

  // Facts: plant early-to-mid window so beliefs can reference them
  for (const item of facts) {
    const scene = Math.min(ptr, deadline - 1);
    const fact: AtomicFact = {
      factId: item.id!,
      subject: item.id!,
      predicate: 'exists',
      object: 'true',
      addedAtTurn: scene,
      validFrom: scene,
      validTo: null,
    };
    biases.push({
      atScene: scene,
      ops: [{ op: 'ADD_FACT', fact }],
      fixedPointDescription: fpDesc,
      rationale: `fact "${item.id}" required by fixed point`,
    });
    ptr = Math.min(ptr + 1, deadline - 1);
  }

  // Characters: introduce (plant belief) mid-window
  const midpoint = currentScene + Math.floor(window / 2);
  for (const item of chars) {
    const scene = Math.min(midpoint, deadline - 1);
    biases.push({
      atScene: scene,
      ops: [{
        op: 'UPDATE_BELIEF', charId: item.id!,
        belief: { id: `${item.id}_intro`, proposition: `${item.id} enters the story`, confidence: 1, source: 'witnessed', source_event_id: `intro_${item.id}`, acquired_at: scene },
      }],
      fixedPointDescription: fpDesc,
      rationale: `character "${item.id}" must be introduced`,
    });
  }

  // Theme claims: mid-to-late window
  const lateStart = currentScene + Math.ceil(window * 0.6);
  for (const item of claims) {
    const scene = Math.min(lateStart, deadline - 1);
    biases.push({
      atScene: scene,
      ops: [{ op: 'ADVANCE_THEME_ARGUMENT', claimId: item.id!, move: 'support' }],
      fixedPointDescription: fpDesc,
      rationale: `theme claim "${item.id}" required`,
    });
  }

  // Payoffs: one scene before deadline
  for (const item of payoffs) {
    biases.push({
      atScene: Math.max(deadline - 1, currentScene),
      ops: [{ op: 'PAYOFF_SETUP', setupId: item.id!, payoffEventId: `${item.id}_payoff` }],
      fixedPointDescription: fpDesc,
      rationale: `payoff "${item.id}" must fire before scene ${deadline}`,
    });
  }

  // Suspense: raise suspense via reader-state update, mid-window
  for (const item of suspenseItems) {
    const scene = Math.min(currentScene + Math.floor(window / 2), deadline - 1);
    biases.push({
      atScene: scene,
      ops: [{ op: 'UPDATE_READER_STATE', delta: { suspense: 90 } }],
      fixedPointDescription: fpDesc,
      rationale: `suspense boost needed — ${item.detail}`,
    });
  }

  // Verbatim ops: spread over remaining window
  for (const item of ops) {
    const scene = Math.min(ptr, deadline - 1);
    biases.push({
      atScene: scene,
      ops: [item.op!],
      fixedPointDescription: fpDesc,
      rationale: `verbatim op "${item.op!.op}" declared in fixed point`,
    });
    ptr = Math.min(ptr + 1, deadline - 1);
  }

  return biases;
}
