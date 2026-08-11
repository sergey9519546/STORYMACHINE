// Voice-swap-risk → generation-constraint adapter.
//
// server/nvm/analyze/voice-delta.ts's analyzeVoices() already runs on every
// analyzed script and returns {pairs, scored}, where each pair flags
// swapRisk: true when two characters' Burrows's Delta < 0.15 (statistically
// indistinguishable voices). But that result lives only on FountainAnalysis
// (the analysis surface) — it never feeds back into generation, so nothing
// prevents the model from collapsing two characters' voices on the next
// candidate. This adapter closes that loop: it turns each swap-risk pair
// into a GenerationConstraint the converge loop can hand the candidate
// generator alongside quality constraints.
//
// CONSTITUTIONAL BOUNDARY: this module is pure prompt-construction (it builds
// constraint objects from a plain-data input shape). It does NOT import from
// server/nvm/analyze/voice-delta.ts (which would be a generation→analyzer
// import, crossing the directional boundary). Instead it declares the input
// shape it accepts inline — any object structurally matching VoiceAnalysis
// can be passed. The analyzer produces it; this module consumes it; the
// boundary stays directional. No LLM, no scoring.
//
// KEYLESS-FIRST / GRACEFUL DEGRADATION: returns [] (no constraints) when the
// analysis is unscored, has no swap-risk pairs, or is absent entirely. The
// converge loop's first iteration (no prior scene to analyze yet) naturally
// gets [] — matching the keyless-first doctrine that generation never refuses
// for lack of a signal, it just gets less-steered.

import type { GenerationConstraint } from './proof-spec.ts';

/**
 * The input shape this adapter accepts. Structurally identical to
 * analyzeVoices()'s return type (server/nvm/analyze/voice-delta.ts), declared
 * here rather than imported to preserve the generation→analyzer import
 * boundary. Any object with these fields works.
 */
export interface VoiceAnalysisInput {
  pairs: Array<{ a: string; b: string; delta: number; swapRisk: boolean }>;
  scored: boolean;
}

/** SWAP_RISK_THRESHOLD mirrors voice-delta.ts's own threshold (0.15). Kept
 *  inline rather than imported for the same boundary reason. The adapter
 *  trusts the `swapRisk` flag the analyzer already computed; this constant is
 *  only used for the constraint's human-readable message. */
const SWAP_RISK_THRESHOLD = 0.15;

/**
 * Convert voice-swap-risk pairs into generation constraints. Each pair where
 * the analyzer flagged swapRisk: true becomes one free_form constraint
 * directing the model to differentiate the two characters' voices.
 *
 * @param voiceAnalysis The analyzer's voice result (from FountainAnalysis.voiceAnalysis),
 *                      or null/undefined when no prior analysis exists.
 * @returns Zero or more GenerationConstraint[] — empty when there is no
 *          swap-risk to address (unscored analysis, no at-risk pairs, or
 *          absent input).
 */
export function voiceConstraintsFromAnalysis(
  voiceAnalysis: VoiceAnalysisInput | null | undefined,
): GenerationConstraint[] {
  if (!voiceAnalysis || !voiceAnalysis.scored) return [];
  const atRisk = voiceAnalysis.pairs.filter(p => p.swapRisk);
  if (atRisk.length === 0) return [];

  return atRisk.map(p => ({
    kind: 'free_form' as const,
    description:
      `Characters "${p.a}" and "${p.b}" have statistically indistinguishable voices ` +
      `(Burrows's Delta ${p.delta.toFixed(3)}, below the ${SWAP_RISK_THRESHOLD} swap-risk threshold). ` +
      `Differentiate them: give one a terse/imperative register (short commands, fragments) and the other a ` +
      `verbose/hedging register (qualifiers, conditionals, longer sentences). The audience should never mistake ` +
      `who is speaking without a character cue.`,
  }));
}
