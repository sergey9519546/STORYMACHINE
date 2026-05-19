// ToM² — Theory of Mind depth-2 (Wave 11 doc-gap).
// A MetaBelief captures "charA believes that charB believes that P".
// This is the cognitive substrate of dramatic irony: the audience knows
// that helmer believes nora is honest, and also knows that nora knows
// that helmer believes this, and acts accordingly.
//
// Depth-2 is the minimum for rich dramatic irony; depth-3 is supported
// but rarely needed (it models "A knows that B knows that A is lying").

import type { Belief } from '../../engine/types.ts';

// ── Core types ────────────────────────────────────────────────────────────────

export type ToMDepth = 1 | 2 | 3;

/**
 * A belief held by `holderId` about what `targetId` believes.
 * depth=1 is an ordinary belief about the world.
 * depth=2 is "holderId thinks targetId believes X" (canonical ToM²).
 * depth=3 is "holderId thinks targetId thinks holderId believes X".
 */
export interface MetaBelief {
  metaId: string;
  holderId: string;        // who holds this meta-belief
  targetId: string;        // who the inner belief is attributed to
  innerBelief: Belief;     // the belief holderId attributes to targetId
  depth: ToMDepth;
  confidence: number;      // holderId's confidence in this attribution (0–1)
  acquiredAt: number;      // turn index when holderId formed this meta-belief
  source: 'inferred' | 'told' | 'witnessed';
}

/**
 * The full nested belief state: per-character lists of MetaBeliefs.
 * Key = holderId.
 */
export type MetaBeliefState = Record<string, MetaBelief[]>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function buildMetaBelief(
  holderId: string,
  targetId: string,
  innerBelief: Belief,
  confidence: number,
  acquiredAt: number,
  source: MetaBelief['source'] = 'inferred',
  depth: ToMDepth = 2,
): MetaBelief {
  return {
    metaId: `tom_${holderId}_${targetId}_${innerBelief.id}`,
    holderId,
    targetId,
    innerBelief,
    depth,
    confidence,
    acquiredAt,
    source,
  };
}

// ── Query helpers ─────────────────────────────────────────────────────────────

/**
 * Get all MetaBeliefs held by `holderId` about what `targetId` believes.
 */
export function getMetaBeliefsAbout(
  state: MetaBeliefState,
  holderId: string,
  targetId: string,
): MetaBelief[] {
  return (state[holderId] ?? []).filter(m => m.targetId === targetId);
}

/**
 * Does holderId believe that targetId believes proposition P (by id)?
 */
export function holderBelievesThatTargetBelieves(
  state: MetaBeliefState,
  holderId: string,
  targetId: string,
  beliefId: string,
  minConfidence = 0.5,
): boolean {
  const mbs = getMetaBeliefsAbout(state, holderId, targetId);
  return mbs.some(m => m.innerBelief.id === beliefId && m.confidence >= minConfidence);
}

/**
 * Dramatic irony check: the audience (implicitly omniscient) knows the true
 * fact, but targetId holds a false MetaBelief about it.
 * Returns the MetaBelief(s) that constitute the irony.
 */
export function findIronicMetaBeliefs(
  state: MetaBeliefState,
  targetId: string,
  groundTruthBelief: Belief,
): MetaBelief[] {
  const result: MetaBelief[] = [];
  for (const [, mbs] of Object.entries(state)) {
    for (const mb of mbs) {
      if (
        mb.holderId === targetId &&
        mb.innerBelief.id !== groundTruthBelief.id &&
        mb.innerBelief.proposition !== groundTruthBelief.proposition
      ) {
        result.push(mb);
      }
    }
  }
  return result;
}

/**
 * Add or update a MetaBelief in the state (pure, returns new state).
 */
export function upsertMetaBelief(
  state: MetaBeliefState,
  mb: MetaBelief,
): MetaBeliefState {
  const existing = state[mb.holderId] ?? [];
  const idx = existing.findIndex(m => m.metaId === mb.metaId);
  const updated = idx >= 0
    ? existing.map((m, i) => i === idx ? mb : m)
    : [...existing, mb];
  return { ...state, [mb.holderId]: updated };
}
