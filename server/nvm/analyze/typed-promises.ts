// Typed promises ledger — excellence/consistency detector (Chekhov's-gun
// discipline over an explicit, typed API).
//
// COMPLEMENTS cold-open-promise.ts rather than duplicating it: cold-open-
// promise.ts is a heuristic, text-mined signal scoped to the OPENING of a
// script (proper nouns + cue words in the first 1-2 scenes vs. later
// recurrence). This module is NOT text-mined at all — it takes an explicit,
// typed ledger of promise events (plants and payoffs, already classified by
// an upstream extractor) spanning the WHOLE script, and evaluates a strict
// structural discipline: every plant should be paid off later, and every
// payoff should have an earlier plant. Where cold-open-promise answers "does
// the opening plant something that recurs," this module answers "across the
// whole typed ledger, is every gun that's shown eventually fired, and is
// every fired gun one that was actually shown first."
//
// Deterministic, no LLM: this module performs no text extraction of its own;
// callers are responsible for producing the typed PromiseEvent[] (e.g. from
// a dedicated extractor, or hand-authored test fixtures).

import type { SupportState } from '../proof/surfacing.ts';

/** Documented promise-type taxonomy for Chekhov's-gun-style tracked elements. */
export type PromiseType =
  | 'chekhov_object'    // a physical object introduced with dramatic weight (a gun, a key)
  | 'stated_goal'       // a character explicitly states an intention/objective
  | 'prophecy'          // a foretelling, omen, or explicit prediction
  | 'threat'            // an explicit threat of harm/consequence
  | 'mystery_question';  // an explicit unanswered question posed to the audience

const VALID_PROMISE_TYPES: ReadonlySet<PromiseType> = new Set([
  'chekhov_object', 'stated_goal', 'prophecy', 'threat', 'mystery_question',
]);

export type PromiseRole = 'plant' | 'payoff';

/** A single typed promise event, ordered by sceneIndex within the script. */
export interface PromiseEvent {
  id: string;
  type: PromiseType;
  role: PromiseRole;
  sceneIndex: number;
}

export interface TypedPromiseReport {
  kept: string[];
  unkept: string[];
  unplantedPayoffs: string[];
  byType: Record<PromiseType, { planted: number; kept: number }>;
  keptRatio: number;
  strength: number;
  support: SupportState;
  scored: boolean;
}

function emptyByType(): Record<PromiseType, { planted: number; kept: number }> {
  return {
    chekhov_object: { planted: 0, kept: 0 },
    stated_goal: { planted: 0, kept: 0 },
    prophecy: { planted: 0, kept: 0 },
    threat: { planted: 0, kept: 0 },
    mystery_question: { planted: 0, kept: 0 },
  };
}

function abstain(): TypedPromiseReport {
  return {
    kept: [],
    unkept: [],
    unplantedPayoffs: [],
    byType: emptyByType(),
    keptRatio: 0,
    strength: 0,
    support: 'UNKNOWN',
    scored: false,
  };
}

/**
 * Evaluate a typed ledger of promise events for Chekhov's-gun discipline.
 *
 * Semantics per id:
 *  - A "plant" event opens a promise. A "payoff" event with a STRICTLY LATER
 *    sceneIndex than its id's plant closes it: the id is KEPT.
 *  - A plant with no qualifying (later) payoff of the same id is UNKEPT — a
 *    dangling gun (weakness: setup without payoff).
 *  - A payoff with no earlier plant of the same id — including a payoff whose
 *    only same-id event is a plant at an EQUAL or LATER sceneIndex (i.e. the
 *    payoff appears at or before its "plant," which is not a valid causal
 *    order) — is an UNPLANTED PAYOFF: a deus ex machina (weakness/violation).
 *
 * Guards:
 *  - Empty/non-array input → abstain (scored=false).
 *  - Events with an unrecognized `type`, a non-string `id`, a role other than
 *    'plant'/'payoff', or a non-finite/negative `sceneIndex` are dropped
 *    silently (malformed input never crashes or corrupts the ledger).
 *  - Duplicate ids: multiple plants/payoffs for the same id are all
 *    considered; an id counts as KEPT if ANY payoff strictly follows ANY
 *    plant. Every plant event still contributes to `byType.planted` (a
 *    script can plant the same idea more than once).
 *  - If, after filtering, there are no valid PLANT events at all (regardless
 *    of payoffs), the ledger has nothing to assess against, so we abstain.
 */
export function assessTypedPromises(events: readonly PromiseEvent[] | null | undefined): TypedPromiseReport {
  if (!Array.isArray(events) || events.length === 0) return abstain();

  const clean: PromiseEvent[] = [];
  for (const e of events) {
    if (!e || typeof e !== 'object') continue;
    if (typeof e.id !== 'string' || e.id.length === 0) continue;
    if (!VALID_PROMISE_TYPES.has(e.type)) continue;
    if (e.role !== 'plant' && e.role !== 'payoff') continue;
    if (typeof e.sceneIndex !== 'number' || !Number.isFinite(e.sceneIndex) || e.sceneIndex < 0) continue;
    clean.push({ id: e.id, type: e.type, role: e.role, sceneIndex: e.sceneIndex });
  }

  const plantsByType = emptyByType();
  const plantsById = new Map<string, number[]>();   // id -> plant sceneIndexes
  const payoffsById = new Map<string, number[]>();  // id -> payoff sceneIndexes
  const typeById = new Map<string, PromiseType>();

  for (const e of clean) {
    typeById.set(e.id, e.type);
    if (e.role === 'plant') {
      plantsByType[e.type].planted += 1;
      const list = plantsById.get(e.id) ?? [];
      list.push(e.sceneIndex);
      plantsById.set(e.id, list);
    } else {
      const list = payoffsById.get(e.id) ?? [];
      list.push(e.sceneIndex);
      payoffsById.set(e.id, list);
    }
  }

  if (plantsById.size === 0) return abstain();

  const kept: string[] = [];
  const unkept: string[] = [];
  const unplantedPayoffs: string[] = [];

  // Evaluate every id that has a plant: kept iff any payoff strictly follows
  // the earliest plant sceneIndex.
  for (const [id, plantIdxs] of plantsById) {
    const earliestPlant = Math.min(...plantIdxs);
    const payoffIdxs = payoffsById.get(id) ?? [];
    const hasLaterPayoff = payoffIdxs.some(pi => pi > earliestPlant);
    if (hasLaterPayoff) {
      kept.push(id);
      const t = typeById.get(id)!;
      plantsByType[t].kept += 1;
    } else {
      unkept.push(id);
    }
  }

  // Evaluate every id that has a payoff: unplanted iff it has NO plant, or
  // ALL its payoffs occur at or before every plant (out-of-order violation).
  for (const [id, payoffIdxs] of payoffsById) {
    const plantIdxs = plantsById.get(id);
    if (!plantIdxs || plantIdxs.length === 0) {
      unplantedPayoffs.push(id);
      continue;
    }
    const earliestPlant = Math.min(...plantIdxs);
    const anyValidPayoff = payoffIdxs.some(pi => pi > earliestPlant);
    if (!anyValidPayoff) {
      unplantedPayoffs.push(id);
    }
  }

  const plantedCount = plantsById.size;
  const keptRatio = plantedCount > 0 ? kept.length / plantedCount : 0;

  // Strength is bounded [0,1] from keptRatio, but any unplanted payoff
  // (deus ex machina) penalizes strength — an unearned payoff must never be
  // rewarded. Each unplanted payoff subtracts a fixed penalty, floored at 0.
  const UNPLANTED_PENALTY = 0.25;
  const strength = Math.max(0, Math.min(1, keptRatio - unplantedPayoffs.length * UNPLANTED_PENALTY));

  let support: SupportState;
  if (unplantedPayoffs.length > 0) {
    support = 'CONTRADICTED';
  } else if (unkept.length === 0 && kept.length === plantedCount && plantedCount > 0) {
    support = 'ENTAILED';
  } else {
    support = 'UNKNOWN';
  }

  return { kept, unkept, unplantedPayoffs, byType: plantsByType, keptRatio, strength, support, scored: true };
}
