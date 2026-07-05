// Adversarial Audience Red-Team (C2) — a cheap model that can only see
// the audience layer (known facts + suspense/investment) tries to guess
// the mystery. Strong clues are ones the red-team cannot easily guess from
// without them; weak clues are ones the mystery would have been solvable
// anyway. Used to calibrate clue strength and RevealPlan quality.
// Wave 120: separated missingClueIds from weakClues (semantic bug fix).

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { RevealPlan } from '../reveal/RevealPlan.ts';

export interface RedTeamVerdict {
  revealId: string;
  canGuessWithout: boolean;   // true = clues are too obvious; reveal is unearned
  guessConfidence: number;    // 0–1: how confident the red-team is WITHOUT the clues
  clueStrengthScore: number;  // 0–100: how much the clues help (delta confidence)
  missingClueIds: string[];   // required clue IDs not yet seeded in the story
  weakClues: string[];        // visible clue IDs that are individually redundant
  recommendation: 'strengthen_clues' | 'ok' | 'thin_mystery';
}

// Pure heuristic red-team (no LLM required for tests and fast evaluation).
// The real version would call a cheap model with only audience-visible facts.
export function redTeamVerdict(
  plan: RevealPlan,
  state: NarrativeState,
): RedTeamVerdict {
  const { knownFacts, suspense, investment } = state.audienceState;
  const seededClueIds = new Set(state.clues.map(c => c.clueId));

  // How many required clues are actually visible to the audience?
  const visibleClues = plan.requiredClueIds.filter(id => seededClueIds.has(id));
  const missingClueIds = plan.requiredClueIds.filter(id => !seededClueIds.has(id));

  // Heuristic base confidence without any clues — derived from audience's known facts.
  // investment reflects how emotionally committed the audience is, which raises the
  // probability they can piece together context even without explicit clues.
  const topicWords = plan.description.toLowerCase().split(/\s+/);
  const knownFactHits = knownFacts.filter(f =>
    topicWords.some(w => w.length > 3 && f.toLowerCase().includes(w)),
  ).length;

  const safeInvestment = typeof investment === 'number' && isFinite(investment) ? investment : 0;
  const baseConfidence = Math.min(0.95,
    (knownFactHits / Math.max(1, plan.requiredClueIds.length)) * 0.6
    + (suspense / 100) * 0.2
    + (safeInvestment / 100) * 0.15,
  );

  // Clue contribution: each visible clue boosts confidence by a fixed per-clue amount.
  const perClueBoost = 0.12;
  const clueBoost = Math.min(0.5, visibleClues.length * perClueBoost);
  const guessConfidenceWithClues = Math.min(0.98, baseConfidence + clueBoost);

  const clueStrengthScore = Math.round((guessConfidenceWithClues - baseConfidence) * 200);
  const canGuessWithout = baseConfidence > 0.65;

  // A visible clue is "weak" (redundant) if removing it individually still leaves
  // the mystery solvable — i.e., the remaining clues alone exceed the guessability
  // threshold. This tells the writer which planted clues aren't pulling weight.
  const weakClues = visibleClues.filter(_id => {
    const boostWithout = Math.min(0.5, (visibleClues.length - 1) * perClueBoost);
    return baseConfidence + boostWithout >= 0.65;
  });

  let recommendation: RedTeamVerdict['recommendation'];
  if (canGuessWithout) {
    recommendation = 'thin_mystery';
  } else if (clueStrengthScore < 20) {
    recommendation = 'strengthen_clues';
  } else {
    recommendation = 'ok';
  }

  return {
    revealId: plan.revealId,
    canGuessWithout,
    guessConfidence: Math.round(baseConfidence * 100) / 100,
    clueStrengthScore,
    missingClueIds,
    weakClues,
    recommendation,
  };
}

// Batch: evaluate all reveal plans in a manifest.
export function redTeamAll(plans: RevealPlan[], state: NarrativeState): RedTeamVerdict[] {
  return plans.map(p => redTeamVerdict(p, state));
}
