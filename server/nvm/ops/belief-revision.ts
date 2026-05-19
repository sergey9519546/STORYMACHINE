// AGM Belief Revision (Wave 11 doc-gap) — Alchourrón–Gärdenfors–Makinson
// contraction and source-reliability / CICERO trust.
//
// AGM contraction: K - φ = the belief set K with φ removed, plus any beliefs
// that were only justified by φ. This is the "minimal change" principle:
// remove the target belief and any that logically depended on it, keep all
// others intact.
//
// Source credence (CICERO trust): each information source has a credence score
// (0–1). When a character receives a belief from a source, the belief's
// confidence is modulated by that source's credence. Credences update over time
// via Bayes-lite: correct predictions raise credence, contradictions lower it.

import type { Belief } from '../../engine/types.ts';

// ── Source Credence (CICERO trust) ────────────────────────────────────────────

export interface SourceCredence {
  /** 'char_id' | 'environment' | 'narrator' | 'rumor' */
  sourceId: string;
  /** Reliability score 0–1 (1 = fully trusted, 0 = never believed). */
  credence: number;
  /** Bayes-lite update count (number of observations). */
  observations: number;
  /** Turn index of last update. */
  updatedAt: number;
}

export type SourceCredenceMap = Record<string, SourceCredence>;

/** Initialize a credence record for a source (default: 0.6 — moderate trust). */
export function initCredence(sourceId: string, initial = 0.6, turn = 0): SourceCredence {
  return { sourceId, credence: initial, observations: 0, updatedAt: turn };
}

/**
 * Update a source's credence after observing whether its information was accurate.
 * Correct = credence increases toward 1; incorrect = decreases toward 0.
 * Uses a decaying Bayesian update: weight = 1 / (1 + observations).
 */
export function updateCredence(
  credence: SourceCredence,
  correct: boolean,
  turn: number,
): SourceCredence {
  const weight = 1 / (1 + credence.observations);
  const delta = correct ? weight : -weight;
  const newCredence = Math.max(0, Math.min(1, credence.credence + delta * 0.2));
  return {
    ...credence,
    credence: newCredence,
    observations: credence.observations + 1,
    updatedAt: turn,
  };
}

/**
 * Modulate a belief's confidence by the source's credence.
 * Result: confidence × credence (a character with low trust has lower confidence).
 */
export function applyCredence(belief: Belief, credenceMap: SourceCredenceMap): Belief {
  const sourceId = (belief.source_event_id ?? '').split(':')[0] || 'unknown';
  const credence = credenceMap[sourceId]?.credence ?? 0.7;   // default 0.7
  return { ...belief, confidence: Math.max(0, Math.min(1, belief.confidence * credence)) };
}

// ── AGM Contraction ───────────────────────────────────────────────────────────

/**
 * AGM contraction: remove a belief from a belief set.
 * Also removes any beliefs that were causally chained from the target
 * (identified by matching source_event_id — a belief is dependent if it
 * was acquired as a consequence of the same event).
 *
 * @param beliefs   The character's current belief set.
 * @param beliefId  The id of the belief to contract.
 * @returns The contracted belief set (beliefs that remain after contraction).
 */
export function contractBelief(beliefs: Belief[], beliefId: string): Belief[] {
  const target = beliefs.find(b => b.id === beliefId);
  if (!target) return beliefs;   // nothing to contract

  // Beliefs that causally depended on the target (same source event = derived at same turn)
  const dependents = new Set<string>();
  dependents.add(beliefId);

  // Simple dependency heuristic: beliefs acquired in the same turn with the same
  // source_event_id were likely derived together and should be co-contracted.
  for (const b of beliefs) {
    if (
      b.id !== beliefId &&
      b.source_event_id === target.source_event_id &&
      b.acquired_at === target.acquired_at
    ) {
      dependents.add(b.id);
    }
  }

  return beliefs.filter(b => !dependents.has(b.id));
}

/**
 * AGM revision: add a new belief, contracting any belief that contradicts it.
 * A contradiction is detected when two beliefs share the same proposition stem
 * (first 40 chars) but have opposite sources (one 'witnessed', one 'told').
 *
 * @param beliefs    Current belief set.
 * @param newBelief  The belief to revise into the set.
 * @returns The revised belief set.
 */
export function reviseBelief(beliefs: Belief[], newBelief: Belief): Belief[] {
  const stem = newBelief.proposition.slice(0, 40);

  // Contract any belief whose proposition stem conflicts
  let contracted = beliefs;
  for (const b of beliefs) {
    const bStem = b.proposition.slice(0, 40);
    const conflict =
      bStem === stem &&
      b.source !== newBelief.source &&
      ((b.source === 'witnessed' && newBelief.source === 'told') ||
       (b.source === 'told' && newBelief.source === 'witnessed'));
    if (conflict) {
      contracted = contractBelief(contracted, b.id);
    }
  }

  // Add the new belief (replacing if same id)
  const withoutSelf = contracted.filter(b => b.id !== newBelief.id);
  return [...withoutSelf, newBelief];
}

/**
 * AGM expansion: add a belief to the set without any contraction.
 * This is the "consistent addition" operation — caller guarantees no conflict.
 */
export function expandBelief(beliefs: Belief[], newBelief: Belief): Belief[] {
  const idx = beliefs.findIndex(b => b.id === newBelief.id);
  if (idx >= 0) return beliefs.map((b, i) => i === idx ? newBelief : b);
  return [...beliefs, newBelief];
}

/**
 * Contraction report: what would be removed if we contracted `beliefId`?
 */
export interface ContractionReport {
  targetId: string;
  coContracted: string[];   // belief ids also removed
  remaining: number;
}

export function planContraction(beliefs: Belief[], beliefId: string): ContractionReport {
  const contracted = contractBelief(beliefs, beliefId);
  const removedIds = beliefs.filter(b => !contracted.some(c => c.id === b.id)).map(b => b.id);
  return {
    targetId: beliefId,
    coContracted: removedIds.filter(id => id !== beliefId),
    remaining: contracted.length,
  };
}
