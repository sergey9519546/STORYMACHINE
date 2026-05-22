// Wave 35 — Forward Latent Branch Field
// Generates N scored candidate next-moves/futures from the current NarrativeState
// WITHOUT writing any prose. Each is a branch packet: a set of StoryOps +
// scores that the author can choose or ignore.
//
// Design:
//   • Starts from the current state (folded from all committed ops)
//   • Applies each of the 8 mutation operators to a base IR derived from
//     the most recent commit (or a blank seed if none exists)
//   • Scores each candidate with scoreBranch()
//   • Prunes cliché/low-consequence branches
//   • Returns the top-N ranked candidates

import { randomUUID } from 'crypto';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import type { StoryOp, AtomicFact } from '../ops/StoryOp.ts';
import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import { applyOperator, ALL_OPERATORS, type MutationOperator } from '../converge/operators.ts';
import { scoreBranch, type BranchScore } from './score.ts';
import { stateHash } from '../state/NarrativeState.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BranchPacket {
  branchId: string;
  parentId: string | null;
  operator: MutationOperator;
  /** Human-readable description of what this branch does */
  description: string;
  /** The ops that would be committed if this branch is chosen */
  ops: StoryOp[];
  scores: BranchScore;
}

export interface BranchField {
  branches: BranchPacket[];
  currentSceneIdx: number;
  generatedAt: number;
}

// ── Branch field generation ───────────────────────────────────────────────────

const MIN_CONSEQUENCE = 15;  // prune branches below this consequence score
const MAX_BRANCHES = 8;      // return at most this many
const TARGET_BRANCHES = 5;   // aim for at least this many (warn if fewer)

/**
 * Generate a forward branch field from the current state.
 *
 * @param state         The current NarrativeState (folded from committed ops)
 * @param recentCommits The most recent committed scenes (for novelty scoring + parent)
 * @param seed          Deterministic seed for mutation operators
 */
export function generateBranchField(
  state: NarrativeState,
  recentCommits: StoryCommit[],
  seed: number = Date.now(),
): BranchField {
  const parentId = recentCommits.length > 0
    ? recentCommits[recentCommits.length - 1].commitId
    : null;
  const sceneIdx = recentCommits.length > 0
    ? (recentCommits[recentCommits.length - 1].sceneIdx + 1)
    : 0;

  // Build a seed IR based on the current state (we mutate from this)
  const seedIR = buildSeedIR(state, sceneIdx);

  const candidates: BranchPacket[] = [];

  for (let i = 0; i < ALL_OPERATORS.length; i++) {
    const operator = ALL_OPERATORS[i];
    const opSeed = seed + i * 1000;

    try {
      const result = applyOperator(operator, seedIR, state, opSeed);
      const { ir: mutatedIR, description } = result;

      const scores = scoreBranch(mutatedIR.ops, mutatedIR, state, recentCommits);

      // Prune low-consequence branches (cliché / no dramatic impact)
      if (scores.consequence < MIN_CONSEQUENCE) continue;

      candidates.push({
        branchId: randomUUID(),
        parentId,
        operator,
        description,
        ops: mutatedIR.ops,
        scores,
      });
    } catch {
      // Operator failed (e.g. no applicable ops) — silently skip
    }
  }

  // Sort by total score descending, take top MAX_BRANCHES
  candidates.sort((a, b) => b.scores.total - a.scores.total);
  const branches = candidates.slice(0, MAX_BRANCHES);

  return { branches, currentSceneIdx: sceneIdx, generatedAt: Date.now() };
}

// ── Seed IR builder ───────────────────────────────────────────────────────────

/**
 * Build a minimal baseline IR from the current state that the mutation
 * operators can work with. The ops are seeded from what we know about the
 * world — facts, beliefs, clocks — so operators have material to mutate.
 */
function buildSeedIR(state: NarrativeState, sceneIdx: number): NarrativeTransitionIR {
  const ops: StoryOp[] = [];

  // Seed some baseline ops from the state so operators have material to work with

  // Reader state: what's the current audience mood?
  if (state.audienceState.suspense > 0 || state.audienceState.curiosity > 0) {
    ops.push({
      op: 'UPDATE_READER_STATE',
      delta: {
        suspense: Math.sign(state.audienceState.suspense),
        curiosity: Math.sign(state.audienceState.curiosity),
      },
    });
  }

  // If there are active clocks, raise the most prominent one
  const clockEntries = Object.entries(state.clocks);
  if (clockEntries.length > 0) {
    const [clockId, amount] = clockEntries.sort((a, b) => b[1] - a[1])[0];
    ops.push({ op: 'RAISE_CLOCK', clockId, amount: 1 });
  }

  // If characters have beliefs, pick one and reference it
  const charIds = Object.keys(state.characterBeliefs);
  if (charIds.length > 0) {
    const charId = charIds[0];
    const beliefs = state.characterBeliefs[charId];
    if (beliefs.length > 0) {
      ops.push({ op: 'UPDATE_BELIEF', charId, belief: { ...beliefs[0] } });
    }
  }

  // If there are facts in objective reality, reference the most recent one
  if (state.objectiveReality.length > 0) {
    const mostRecent = state.objectiveReality[state.objectiveReality.length - 1];
    const fact: AtomicFact = {
      factId: randomUUID(),
      subject: mostRecent.subject,
      predicate: mostRecent.predicate,
      object: mostRecent.object + ' (advanced)',
      addedAtTurn: sceneIdx,
      validFrom: sceneIdx,
      validTo: null,
    };
    ops.push({ op: 'ADD_FACT', fact });
  }

  // Fallback: always have at least one op so operators have something to mutate
  if (ops.length === 0) {
    ops.push({ op: 'UPDATE_READER_STATE', delta: { suspense: 1, curiosity: 1 } });
  }

  return {
    transitionId: randomUUID(),
    sceneIdx,
    sceneFunction: 'build_tension',
    activeMechanisms: ['relationship_externalization'],
    beforeStateHash: stateHash(state),
    ops,
    preconditions: ['story_ongoing'],
    postconditions: [],
    provenance: { origin: 'model_generated', createdAt: Date.now() },
  };
}
