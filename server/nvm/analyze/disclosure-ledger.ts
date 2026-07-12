// Audience-Disclosure Ledger (backlog Phase 3, line 63: "chronology vs
// disclosure -- fair-reveal engine").
//
// Tracks, per revealed story fact, the STORY-TIME order in which it becomes
// true vs the PRESENTATION (discourse) order in which the audience learns it.
// A "fair reveal" gives the audience its setup before the payoff needs it; an
// "unfair" reveal is a twist whose enabling information was withheld so the
// audience could not have guessed it (missing setup), or a payoff shown
// before any setup exists (payoff-before-setup, even if a setup exists later
// in the discourse). This is deterministic bookkeeping over ordered scene
// markers -- NOT semantic understanding. A future extractor is expected to
// feed `DisclosureEvent[]`; `buildDisclosureLedger` below is only a light
// heuristic seed from raw Fountain scene ordering (story time == discourse
// order, i.e. no flashback/flash-forward detection).
import type { SupportState } from '../proof/surfacing.ts';

export type DisclosureKind = 'setup' | 'payoff' | 'reveal';

/** A single deterministic disclosure event. `storyTimeIndex` is the event's
 *  position in the underlying fabula (chronological story time);
 *  `discourseIndex` is its position in the order the audience encounters it
 *  (the syuzhet / presentation order). Both are caller-supplied, non-negative
 *  integers; ties are permitted (simultaneous reveals in the same scene). */
export interface DisclosureEvent {
  factId: string;
  storyTimeIndex: number;
  discourseIndex: number;
  kind: DisclosureKind;
}

export type ViolationKind = 'payoff-before-setup' | 'unwithdrawable-twist';

export interface DisclosureViolation {
  factId: string;
  kind: ViolationKind;
  reason: string;
}

export interface FairRevealAssessment {
  fair: boolean;
  violations: DisclosureViolation[];
  support: SupportState;
}

function isFiniteNonNegativeInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n) && n >= 0;
}

function isValidEvent(e: unknown): e is DisclosureEvent {
  if (!e || typeof e !== 'object') return false;
  const ev = e as Partial<DisclosureEvent>;
  return (
    typeof ev.factId === 'string' && ev.factId.length > 0 &&
    isFiniteNonNegativeInt(ev.storyTimeIndex) &&
    isFiniteNonNegativeInt(ev.discourseIndex) &&
    (ev.kind === 'setup' || ev.kind === 'payoff' || ev.kind === 'reveal')
  );
}

/** Assess fairness of a set of disclosure events. Pure, deterministic,
 *  input-guarded: malformed / out-of-range events are dropped before
 *  evaluation rather than throwing, since this is a bookkeeping layer that
 *  must degrade gracefully alongside partial extractor output.
 *
 *  Support-state choice (mirrors surfacing.ts's SupportState contract):
 *   - fair (no violations, at least one payoff/reveal evaluated)  -> ENTAILED
 *     (the ledger positively establishes that every payoff/reveal was
 *     properly set up in discourse order).
 *   - any violation found                                         -> CONTRADICTED
 *     (the ledger positively establishes an unfair reveal -- this is a hard
 *     fact about presentation order, not an absence of evidence).
 *   - no payoff/reveal events to evaluate (empty or setup-only input) -> UNKNOWN
 *     (nothing to entail or contradict; absence is not a negative fact). */
export function assessFairReveal(events: readonly DisclosureEvent[]): FairRevealAssessment {
  const clean = Array.isArray(events) ? events.filter(isValidEvent) : [];

  const setupsByFact = new Map<string, DisclosureEvent[]>();
  const payoffsByFact = new Map<string, DisclosureEvent[]>();
  for (const ev of clean) {
    const bucket = ev.kind === 'setup' ? setupsByFact : payoffsByFact;
    const list = bucket.get(ev.factId) ?? [];
    list.push(ev);
    bucket.set(ev.factId, list);
  }

  const violations: DisclosureViolation[] = [];

  for (const [factId, payoffs] of payoffsByFact) {
    const setups = setupsByFact.get(factId);

    if (!setups || setups.length === 0) {
      // No setup anywhere in the ledger for this payoff/reveal -- the
      // audience had no way to see it coming.
      violations.push({
        factId,
        kind: 'unwithdrawable-twist',
        reason: `fact "${factId}" has a ${payoffs[0].kind} with no matching setup event anywhere in the ledger`,
      });
      continue;
    }

    // Earliest setup in discourse order is the audience's earliest chance
    // to learn this fact. Every payoff must come after it in discourse order.
    const earliestSetupDiscourse = Math.min(...setups.map(s => s.discourseIndex));
    for (const payoff of payoffs) {
      if (payoff.discourseIndex <= earliestSetupDiscourse) {
        violations.push({
          factId,
          kind: 'payoff-before-setup',
          reason: `fact "${factId}" ${payoff.kind} at discourseIndex ${payoff.discourseIndex} precedes (or ties) its earliest setup at discourseIndex ${earliestSetupDiscourse}`,
        });
      }
    }
  }

  if (payoffsByFact.size === 0) {
    return { fair: true, violations: [], support: 'UNKNOWN' };
  }

  const fair = violations.length === 0;
  return { fair, violations, support: fair ? 'ENTAILED' : 'CONTRADICTED' };
}

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). Local
 *  re-derivation of the same splitting approach used elsewhere in analyze/
 *  (see emotional-arc.ts's scenesFromFountain) -- kept private/local per the
 *  no-cross-import instruction for this module. */
function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}

const REVEAL_CUE = /\b(?:reveal(?:s|ed)?|twist|turns out|it was)\b/i;
const SETUP_CUE = /\b(?:foreshadow\w*|hints?|clues?|mentions?|establish(?:es|ed)?)\b/i;

/** Light heuristic seed: derive a DisclosureLedger's worth of events purely
 *  from scene-level textual cues in raw Fountain. Story time is assumed to
 *  equal discourse order (no flashback/flash-forward detection -- a real
 *  extractor is expected to supply corrected storyTimeIndex values). This is
 *  intentionally shallow; the fairness LOGIC in assessFairReveal is the real
 *  deliverable. factId is synthesized from scene index + kind so repeated
 *  calls on the same script are stable. */
export function buildDisclosureLedger(fountain: string): DisclosureEvent[] {
  if (typeof fountain !== 'string' || fountain.trim().length === 0) return [];
  const scenes = scenesFromFountain(fountain);
  const events: DisclosureEvent[] = [];
  scenes.forEach((scene, i) => {
    if (SETUP_CUE.test(scene)) {
      events.push({ factId: `scene-${i}`, storyTimeIndex: i, discourseIndex: i, kind: 'setup' });
    }
    if (REVEAL_CUE.test(scene)) {
      events.push({ factId: `scene-${i}`, storyTimeIndex: i, discourseIndex: i, kind: 'reveal' });
    }
  });
  return events;
}
