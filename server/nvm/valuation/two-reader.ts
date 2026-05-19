// Two-Reader Model (C3, part 1) — dual first-watch / rewatch simulation.
// A story's emotional value to a first-watch reader is determined by surprise
// and suspense. A rewatch reader knows the outcome; value comes from dramatic
// irony and structural elegance. Both curves are computed from NarrativeState.
//
// The two-reader delta (first_watch - rewatch) measures the "twist premium" —
// how much of the story's value depends on not knowing the ending.
// A high delta = twist-dependent; low delta = structurally robust.

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { TensionLedger } from './futures.ts';

export interface ReaderCurve {
  mode: 'first_watch' | 'rewatch';
  suspense: number;         // 0–100
  ironyDensity: number;     // 0–100: scenes where audience knows more than chars
  structuralElegance: number; // 0–100: how many plants match payoffs
  emotionalArc: number[];    // per-scene tension values
  overallScore: number;      // composite
}

export interface TwoReaderReport {
  firstWatch: ReaderCurve;
  rewatch: ReaderCurve;
  twistPremium: number;       // firstWatch.overallScore - rewatch.overallScore
  rewatchRecommended: boolean; // true if rewatch score > 70
}

export function computeFirstWatch(state: NarrativeState, ledger: TensionLedger): ReaderCurve {
  const suspense = state.audienceState.suspense;
  const ironyDensity = computeIronyDensity(state);
  const structuralElegance = computeStructuralElegance(state);
  // First-watch values suspense and mystery most
  const overallScore = Math.round(suspense * 0.5 + ironyDensity * 0.3 + structuralElegance * 0.2);
  return {
    mode: 'first_watch',
    suspense,
    ironyDensity,
    structuralElegance,
    emotionalArc: [ledger.totalTension],
    overallScore,
  };
}

export function computeRewatch(state: NarrativeState, ledger: TensionLedger): ReaderCurve {
  const suspense = state.audienceState.suspense * 0.3; // suspense matters less when you know
  const ironyDensity = computeIronyDensity(state) * 1.4; // irony shines on rewatch
  const structuralElegance = computeStructuralElegance(state) * 1.3;
  const overallScore = Math.min(100, Math.round(suspense * 0.2 + ironyDensity * 0.4 + structuralElegance * 0.4));
  return {
    mode: 'rewatch',
    suspense: Math.round(suspense),
    ironyDensity: Math.round(Math.min(100, ironyDensity)),
    structuralElegance: Math.round(Math.min(100, structuralElegance)),
    emotionalArc: [ledger.totalTension * 0.6],
    overallScore,
  };
}

export function twoReaderReport(state: NarrativeState, ledger: TensionLedger): TwoReaderReport {
  const firstWatch = computeFirstWatch(state, ledger);
  const rewatch = computeRewatch(state, ledger);
  return {
    firstWatch,
    rewatch,
    twistPremium: firstWatch.overallScore - rewatch.overallScore,
    rewatchRecommended: rewatch.overallScore > 70,
  };
}

function computeIronyDensity(state: NarrativeState): number {
  // Audience knows facts that at least one character believes falsely
  const knownFacts = new Set(state.audienceState.knownFacts.map(f => f.toLowerCase()));
  let ironyCount = 0;
  for (const beliefs of Object.values(state.characterBeliefs)) {
    for (const b of beliefs) {
      if (b.source === 'told' && b.confidence > 0.5) {
        const prop = b.proposition.toLowerCase();
        const audienceKnowsConflict = [...knownFacts].some(f =>
          f.includes('lied') || f.includes('false') || f.includes('deceived') ||
          prop.split(' ').some(w => w.length > 3 && knownFacts.has(w)),
        );
        if (audienceKnowsConflict) ironyCount++;
      }
    }
  }
  return Math.min(100, ironyCount * 25);
}

function computeStructuralElegance(state: NarrativeState): number {
  // Ratio of payoffs to clues — high ratio = elegant (every clue pays off)
  const clueCount = state.clues.length;
  const payoffCount = state.payoffs.length;
  if (clueCount === 0) return 50;
  const ratio = payoffCount / clueCount;
  return Math.round(Math.min(100, ratio * 80 + (state.audienceState.investment * 0.2)));
}
