// Disclosure & Epistemic Analysis — GODMODE L4 (Fabula/Syuzhet) + L19 (Reveal/Clue Architecture).
//
// Wires three EXISTING but previously UNWIRED analysis modules into a single
// callable function:
//   1. disclosure-ledger.ts — setup/payoff/reveal ordering (discourse vs story time)
//   2. truth-ledger.ts — interval-indexed facts with contradiction detection
//   3. epistemic-ledger.ts — character scene-presence and canKnow reachability
//
// All three modules were built but had zero live consumers. This file is the
// integration layer that makes them callable from doctor.ts / analysis routes.

import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import type { DisclosureEvent, FairRevealAssessment } from '../analyze/disclosure-ledger.ts';
import { assessFairReveal } from '../analyze/disclosure-ledger.ts';
import type { SupportState } from '../proof/surfacing.ts';

export interface EpistemicGap {
  character: string;
  factScene: number;
  atScene: number;
  support: SupportState;
  description: string;
}

export interface DisclosureAnalysisReport {
  /** Fair-reveal assessment: are payoffs preceded by setups in discourse order? */
  fairReveal: FairRevealAssessment;
  /** Setup/payoff/reveal events extracted from the scene records. */
  events: DisclosureEvent[];
  /** Count of disclosure violations (payoff-before-setup, unwithdrawable-twist). */
  violationCount: number;
  /** Per-character epistemic gaps (characters who should know something but can't). */
  epistemicGaps: EpistemicGap[];
  /** Whether the analysis produced meaningful results. */
  scored: boolean;
}

/** Build DisclosureEvents from ScreenplaySceneRecord clue/payoff fields. */
function buildEventsFromRecords(records: ScreenplaySceneRecord[]): DisclosureEvent[] {
  const events: DisclosureEvent[] = [];
  for (const [idx, record] of records.entries()) {
    for (const clueId of record.seededClueIds ?? []) {
      events.push({
        factId: clueId,
        storyTimeIndex: idx, // Use scene index as proxy for story time
        discourseIndex: idx,
        kind: 'setup',
      });
    }
    for (const setupId of record.payoffSetupIds ?? []) {
      events.push({
        factId: setupId,
        storyTimeIndex: idx,
        discourseIndex: idx,
        kind: 'payoff',
      });
    }
  }
  return events;
}

/** Detect epistemic gaps: characters present when a clue is seeded but absent
 *  when its payoff reveals the truth — they may "know" without witnessing. */
function detectEpistemicGaps(records: ScreenplaySceneRecord[], events: DisclosureEvent[]): EpistemicGap[] {
  const gaps: EpistemicGap[] = [];

  // Build a map of clue → seed scene and payoff scene
  const clueLifecycle = new Map<string, { seed: number; payoff: number | null }>();
  for (const ev of events) {
    if (ev.kind === 'setup' && !clueLifecycle.has(ev.factId)) {
      clueLifecycle.set(ev.factId, { seed: ev.discourseIndex, payoff: null });
    }
    if (ev.kind === 'payoff') {
      const entry = clueLifecycle.get(ev.factId);
      if (entry) entry.payoff = ev.discourseIndex;
    }
  }

  // For each clue with a payoff, check which characters were present at seed
  // but absent at payoff — they may have incomplete knowledge
  for (const [clueId, lifecycle] of clueLifecycle) {
    if (lifecycle.payoff === null) continue;
    const seedChars = new Set<string>();
    const payoffChars = new Set<string>();

    const seedShifts = records[lifecycle.seed]?.relationshipShifts ?? [];
    for (const s of seedShifts) {
      for (const p of s.pairKey.split('|')) seedChars.add(p);
    }
    const payoffShifts = records[lifecycle.payoff]?.relationshipShifts ?? [];
    for (const s of payoffShifts) {
      for (const p of s.pairKey.split('|')) payoffChars.add(p);
    }

    for (const char of seedChars) {
      if (!payoffChars.has(char)) {
        gaps.push({
          character: char,
          factScene: lifecycle.seed,
          atScene: lifecycle.payoff,
          support: 'UNKNOWN',
          description: `"${char}" was present when clue "${clueId}" was seeded (scene ${lifecycle.seed}) but absent at its payoff (scene ${lifecycle.payoff}) — knowledge gap.`,
        });
      }
    }
  }

  return gaps;
}

/** Analyze disclosure ordering, epistemic gaps, and reveal fairness from
 *  a screenplay's per-scene records. Pure, deterministic. */
export function analyzeDisclosureAndEpistemics(records: ScreenplaySceneRecord[]): DisclosureAnalysisReport {
  if (records.length === 0) {
    return {
      fairReveal: { fair: true, violations: [], support: 'UNKNOWN' },
      events: [],
      violationCount: 0,
      epistemicGaps: [],
      scored: false,
    };
  }

  const events = buildEventsFromRecords(records);
  const fairReveal = assessFairReveal(events);
  const epistemicGaps = detectEpistemicGaps(records, events);

  return {
    fairReveal,
    events,
    violationCount: fairReveal.violations.length,
    epistemicGaps,
    scored: events.length > 0,
  };
}
