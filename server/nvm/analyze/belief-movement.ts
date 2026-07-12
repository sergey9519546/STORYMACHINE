// Belief-movement surprise detector (Wave Program v2 — excellence detector).
//
// Models a well-made surprise deterministically: a character's belief moves
// from a confidently-held wrong belief to a corrected one. The reversal is
// only "excellent" craft when it was EARNED — seeded by prior setup. An
// unsupported reversal is a "cheap reversal" and must NOT be rewarded; this
// rule penalizes it explicitly so it cannot masquerade as an earned surprise.
//
// This module does not extract beliefs from prose — callers supply a typed,
// ordered list of belief events (see epistemic-ledger.ts for the sibling
// deterministic-substrate discipline this file follows: no LLM, no semantic
// inference, guarded inputs, UNKNOWN/abstain rather than false positives).

export type BeliefStance = 'believes' | 'doubts' | 'learns';

export interface BeliefEvent {
  agent: string;
  proposition: string;
  stance: BeliefStance;
  sceneIndex: number;
  /** True when the eventual reversal was seeded by earlier setup (earned). */
  supportedByPriorSetup?: boolean;
}

export interface BeliefMovement {
  agent: string;
  proposition: string;
  fromScene: number;
  toScene: number;
  earned: boolean;
}

export interface BeliefMovementReport {
  movements: BeliefMovement[];
  earnedSurpriseCount: number;
  cheapReversalCount: number;
  strength: number;
  scored: boolean;
}

const EMPTY_REPORT: BeliefMovementReport = {
  movements: [],
  earnedSurpriseCount: 0,
  cheapReversalCount: 0,
  strength: 0,
  scored: false,
};

/** Strip a leading negation marker to compare a proposition against its
 *  logical opposite. We treat `not:<X>` / `NOT <X>` as the reversal of `<X>`,
 *  and otherwise treat two textually-distinct propositions for the same
 *  agent as unrelated (no false movement across unrelated beliefs). */
function reversalKey(proposition: string): { base: string; negated: boolean } {
  const trimmed = proposition.trim();
  const m = /^(?:not[:\s]+)/i.exec(trimmed);
  if (m) {
    return { base: trimmed.slice(m[0].length).trim().toLowerCase(), negated: true };
  }
  return { base: trimmed.toLowerCase(), negated: false };
}

/** Does `learnProp` count as the reversal ("not P") of `believeProp`? Either
 *  direction of negation-prefixing counts: believing "P" then learning
 *  "not:P", or believing "not:P" then learning "P". */
function isReversalOf(believeProp: string, learnProp: string): boolean {
  const b = reversalKey(believeProp);
  const l = reversalKey(learnProp);
  return b.base === l.base && b.negated !== l.negated;
}

/**
 * Assess belief-movement surprises across an ordered list of belief events.
 * Deterministic, input-guarded. Returns scored=false when there is nothing
 * to assess (empty input, or fewer than two events for any agent).
 */
export function assessBeliefMovement(events: readonly BeliefEvent[] | null | undefined): BeliefMovementReport {
  if (!events || events.length < 2) return { ...EMPTY_REPORT };

  // Guard + normalize; drop malformed entries defensively.
  const clean = events.filter((e): e is BeliefEvent =>
    !!e && typeof e.agent === 'string' && e.agent.trim().length > 0 &&
    typeof e.proposition === 'string' && e.proposition.trim().length > 0 &&
    (e.stance === 'believes' || e.stance === 'doubts' || e.stance === 'learns') &&
    typeof e.sceneIndex === 'number' && Number.isFinite(e.sceneIndex),
  );
  if (clean.length < 2) return { ...EMPTY_REPORT };

  // Group by agent, preserving scene order.
  const byAgent = new Map<string, BeliefEvent[]>();
  for (const e of clean) {
    const list = byAgent.get(e.agent) ?? [];
    list.push(e);
    byAgent.set(e.agent, list);
  }
  for (const list of byAgent.values()) list.sort((a, b) => a.sceneIndex - b.sceneIndex);

  const movements: BeliefMovement[] = [];

  for (const [agent, list] of byAgent) {
    // Track the most recent 'believes' event per proposition-base (not yet
    // resolved into a movement or re-affirmed away).
    const openBeliefs: BeliefEvent[] = [];
    for (const ev of list) {
      if (ev.stance === 'believes') {
        // Re-affirming the SAME proposition (no reversal) clears prior opens
        // of that exact proposition rather than creating a movement.
        const sameIdx = openBeliefs.findIndex(o => reversalKeysEqual(o.proposition, ev.proposition));
        if (sameIdx >= 0) {
          openBeliefs[sameIdx] = ev; // refresh scene of the held belief
        } else {
          openBeliefs.push(ev);
        }
      } else if (ev.stance === 'learns') {
        // Look for an open belief this 'learns' event reverses.
        const idx = openBeliefs.findIndex(o => isReversalOf(o.proposition, ev.proposition));
        if (idx >= 0) {
          const from = openBeliefs[idx];
          const earned = ev.supportedByPriorSetup === true;
          movements.push({
            agent,
            proposition: from.proposition,
            fromScene: from.sceneIndex,
            toScene: ev.sceneIndex,
            earned,
          });
          openBeliefs.splice(idx, 1);
        }
        // 'learns' with no matching open belief: nothing to reverse, ignore.
      }
      // 'doubts' does not itself create or resolve a movement in this model.
    }
  }

  const earnedSurpriseCount = movements.filter(m => m.earned).length;
  const cheapReversalCount = movements.filter(m => !m.earned).length;

  // Strength rises with earned surprises, is penalized by cheap reversals.
  // Bounded [0,1]; an excellence rule must not reward unsupported twists.
  const raw = earnedSurpriseCount * 0.35 - cheapReversalCount * 0.25;
  const strength = Math.max(0, Math.min(1, raw));

  return {
    movements,
    earnedSurpriseCount,
    cheapReversalCount,
    strength,
    scored: true,
  };
}

function reversalKeysEqual(a: string, b: string): boolean {
  const ka = reversalKey(a);
  const kb = reversalKey(b);
  return ka.base === kb.base && ka.negated === kb.negated;
}
