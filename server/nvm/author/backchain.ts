// Backchain reasoner (G9) — given a target NarrativeState partial, find the
// minimal StoryOp sequence that leads from the current state to the target.
// This is the core of Temporal Authoring: the writer declares "at scene 6,
// nora must believe 'she has won'" and the backchainer determines which ops
// must have fired in prior scenes to make that belief available.
//
// Approach: each target property is decomposed into a *precondition tree*.
// Each node is one StoryOp that satisfies part of the target. The tree is
// ordered topologically (facts before beliefs, clues before payoffs) to
// produce a valid op schedule.

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryOp, AtomicFact } from '../ops/StoryOp.ts';
import type { FixedPoint, GoalBias } from './fixed-points.ts';

// ── Public types ──────────────────────────────────────────────────────────────

/** A single node in the precondition tree. */
export interface PreconditionNode {
  /** The op that satisfies this precondition. */
  op: StoryOp;
  /** Why this op is needed. */
  reason: string;
  /** Ops that must fire before this one. */
  dependencies: PreconditionNode[];
  /** Relative ordering weight (lower = earlier). */
  order: number;
}

export interface BackchainResult {
  /** Ordered list of ops from earliest to latest. */
  schedule: Array<{ atScene: number; op: StoryOp; reason: string }>;
  /** The full precondition tree (for introspection). */
  tree: PreconditionNode[];
  /** Whether the backchain found a complete plan. */
  complete: boolean;
  /** Blocking constraint, if any. */
  blockingConstraint?: string;
  /** Human-readable reasoning trace. */
  trace: string;
}

// ── backchain ─────────────────────────────────────────────────────────────────

/**
 * Backward-chain from a FixedPoint to the current state.
 * Returns a scheduled list of StoryOps that must fire across scenes
 * [currentScene, fixedPoint.atScene) to reach the fixed point.
 */
export function backchain(
  fixedPoint: FixedPoint,
  state: NarrativeState,
  currentScene: number,
): BackchainResult {
  const desc = fixedPoint.description ?? `fixed point @ scene ${fixedPoint.atScene}`;
  const deadline = fixedPoint.atScene;
  const window = deadline - currentScene;
  const lines: string[] = [`## Backchain: "${desc}"`, `   window: scenes ${currentScene}–${deadline - 1}`, ''];

  if (window <= 0) {
    return {
      schedule: [], tree: [], complete: false,
      blockingConstraint: `deadline scene ${deadline} is at or before current scene ${currentScene}`,
      trace: lines.concat(['✗ No runway — deadline passed']).join('\n'),
    };
  }

  const req = fixedPoint.required;
  const tree: PreconditionNode[] = [];

  // 1. Required clues → must be seeded early
  for (const id of req.clueIds ?? []) {
    if (!state.clues.some(c => c.clueId === id)) {
      tree.push({
        op: { op: 'SEED_CLUE', clueId: id, carrier: 'object' },
        reason: `clue "${id}" not yet planted`,
        dependencies: [],
        order: 10,
      });
      lines.push(`  [clue]    SEED_CLUE "${id}" — must precede any payoff`);
    }
  }

  // 2. Required facts → must precede beliefs that reference them
  for (const id of req.factIds ?? []) {
    if (!state.objectiveReality.some(f => f.factId === id)) {
      const fact: AtomicFact = {
        factId: id, subject: id, predicate: 'exists', object: 'true',
        addedAtTurn: currentScene, validFrom: currentScene, validTo: null,
      };
      tree.push({
        op: { op: 'ADD_FACT', fact },
        reason: `fact "${id}" required but absent`,
        dependencies: [],
        order: 20,
      });
      lines.push(`  [fact]    ADD_FACT "${id}"`);
    }
  }

  // 3. Required characters (need at least one belief)
  for (const id of req.characterIds ?? []) {
    if (!state.characterBeliefs[id]?.length) {
      const believeOp: StoryOp = {
        op: 'UPDATE_BELIEF', charId: id,
        belief: { id: `${id}_intro`, proposition: `${id} enters`, confidence: 1, source: 'witnessed', source_event_id: `intro_${id}`, acquired_at: currentScene },
      };
      // Depends on any fact nodes already in tree (characters should enter after world is established)
      const factDeps = tree.filter(n => n.op.op === 'ADD_FACT');
      tree.push({
        op: believeOp,
        reason: `character "${id}" not yet introduced`,
        dependencies: factDeps,
        order: 30,
      });
      lines.push(`  [char]    UPDATE_BELIEF for "${id}" (introduction)`);
    }
  }

  // 4. Required theme claims
  for (const id of req.claimIds ?? []) {
    if (!state.themeArgument.some(t => t.claimId === id)) {
      tree.push({
        op: { op: 'ADVANCE_THEME_ARGUMENT', claimId: id, move: 'support' },
        reason: `theme claim "${id}" not yet argued`,
        dependencies: [],
        order: 40,
      });
      lines.push(`  [theme]   ADVANCE_THEME_ARGUMENT "${id}"`);
    }
  }

  // 5. Required payoffs
  for (const id of req.payoffSetupIds ?? []) {
    if (!state.payoffs.some(p => p.setupId === id)) {
      // Payoff depends on its clue being seeded
      const clueDeps = tree.filter(n => n.op.op === 'SEED_CLUE');
      tree.push({
        op: { op: 'PAYOFF_SETUP', setupId: id, payoffEventId: `${id}_payoff` },
        reason: `payoff for setup "${id}" not yet fired`,
        dependencies: clueDeps,
        order: 50,
      });
      lines.push(`  [payoff]  PAYOFF_SETUP "${id}"`);
    }
  }

  // 6. Required suspense
  if (req.minSuspense !== undefined && state.audienceState.suspense < req.minSuspense) {
    tree.push({
      op: { op: 'UPDATE_READER_STATE', delta: { suspense: req.minSuspense } },
      reason: `suspense ${state.audienceState.suspense} < required ${req.minSuspense}`,
      dependencies: [],
      order: 35,
    });
    lines.push(`  [tension] UPDATE_READER_STATE tension=${req.minSuspense}`);
  }

  // 7. Verbatim required ops
  for (const op of req.requiredOps ?? []) {
    tree.push({ op, reason: 'declared verbatim in fixed point', dependencies: [], order: 45 });
    lines.push(`  [verbatim] ${op.op}`);
  }

  if (tree.length === 0) {
    lines.push('  ✓ All requirements already satisfied — no ops needed');
    return { schedule: [], tree, complete: true, trace: lines.join('\n') };
  }

  // Topological schedule: sort by order, spread evenly across window
  const sorted = [...tree].sort((a, b) => a.order - b.order);
  const schedule: Array<{ atScene: number; op: StoryOp; reason: string }> = [];

  sorted.forEach((node, i) => {
    // Distribute ops evenly across [currentScene, deadline-1]
    // with earlier orders getting earlier scenes
    const ratio = window <= 1 ? 0 : i / Math.max(sorted.length - 1, 1);
    const atScene = currentScene + Math.floor(ratio * (window - 1));
    schedule.push({ atScene, op: node.op, reason: node.reason });
  });

  lines.push('');
  lines.push('Schedule:');
  for (const s of schedule) {
    lines.push(`  scene ${s.atScene}: ${s.op.op} — ${s.reason}`);
  }

  // Check feasibility: payoffs can't be before their clue deps
  let complete = true;
  let blockingConstraint: string | undefined;
  for (const s of schedule) {
    if (s.op.op === 'PAYOFF_SETUP') {
      const payoffOp = s.op as Extract<StoryOp, { op: 'PAYOFF_SETUP' }>;
      const clueScene = schedule.find(sc => sc.op.op === 'SEED_CLUE');
      if (clueScene && clueScene.atScene >= s.atScene) {
        complete = false;
        blockingConstraint = `SEED_CLUE must precede PAYOFF_SETUP "${payoffOp.setupId}" but both land at scene ${s.atScene}`;
        lines.push(`⚠️  Ordering constraint violated: ${blockingConstraint}`);
      }
    }
  }

  return { schedule, tree, complete, blockingConstraint, trace: lines.join('\n') };
}

/**
 * Convert a BackchainResult schedule into GoalBias[] for the director.
 */
export function scheduleToGoalBiases(
  result: BackchainResult,
  fpDescription: string,
): GoalBias[] {
  // Group ops by scene
  const byScene = new Map<number, Array<{ op: StoryOp; reason: string }>>();
  for (const s of result.schedule) {
    if (!byScene.has(s.atScene)) byScene.set(s.atScene, []);
    byScene.get(s.atScene)!.push({ op: s.op, reason: s.reason });
  }
  const biases: GoalBias[] = [];
  for (const [atScene, items] of byScene) {
    biases.push({
      atScene,
      ops: items.map(i => i.op),
      fixedPointDescription: fpDescription,
      rationale: items.map(i => i.reason).join('; '),
    });
  }
  return biases;
}
