// Transportation Scale Short Form (TS-SF) Rubric — Phase G Calibration
//
// DIAGNOSTIC ONLY: This rubric maps deterministic narrative signals to TS-SF item
// estimates for human-label calibration. It is NOT a gate, NOT canonical, and does
// NOT own quality judgment. No single scalar owns canon: TS-SF is one axis among many.
//
// TS-SF (Green & Brock 2000): 6 items measuring narrative transportation (1–7 Likert).
// This implementation estimates items from engine-derived signals (0..1 proxies) to
// calibrate expected human responses. Always require empirical validation against
// actual human labels before any gating decision.
import type { strict as assert } from 'node:assert';

export type TransportationBand = 'low' | 'moderate' | 'high';

export interface TransportationSignals {
  /** Coherence of the narrative tension arc (0..1) */
  tensionArcCoherence: number;
  /** Depth of character interiority signals (0..1) */
  characterInteriority: number;
  /** Openness of unresolved curiosity threads (0..1) */
  curiosityOpen: number;
  /** Range of emotional valence across scenes (0..1) */
  emotionalRange: number;
  /** Clarity of plot resolution (0..1) */
  resolutionClarity: number;
}

export interface TSSFResult {
  /** Individual TS-SF item estimates (1..7 scale, 6 items) */
  items: [number, number, number, number, number, number];
  /** Mean of items */
  mean: number;
  /** Classification band: low (<5), moderate (5-5.9), high (≥6) */
  band: TransportationBand;
  /** True if one or more signals were zero/missing, affecting confidence */
  abstained: boolean;
  /** Diagnostic note on signal coverage and band rationale */
  note: string;
}

/**
 * Estimate TS-SF items from deterministic narrative signals.
 *
 * Maps five engine-derived signal proxies (each 0..1) to the six TS-SF items
 * (1..7 Likert). Returns a diagnostic result: NOT a gate, NOT canonical.
 * Always validate against human labels before any production use.
 */
export function estimateTransportation(signals: TransportationSignals): TSSFResult {
  const {
    tensionArcCoherence: tension,
    characterInteriority: interiority,
    curiosityOpen: curiosity,
    emotionalRange: emotion,
    resolutionClarity: resolution,
  } = signals;

  // Detect abstention: if all signals are effectively zero, we abstain
  const signalValues = [tension, interiority, curiosity, emotion, resolution];
  const nonZeroCount = signalValues.filter((v) => v > 0).length;
  const abstained = nonZeroCount < 3; // require at least 3 non-zero signals

  // TS-SF Item Mappings (Green & Brock 2000, adapted to signal proxies):
  // 1. Visualization: "I could picture the events in this story taking place."
  //    → tension (narrative clarity) + curiosity (world-building interest)
  const item1 = 1 + (tension * 0.6 + curiosity * 0.4) * 6;

  // 2. Mental Involvement: "I was mentally involved in the story while reading it."
  //    → interiority (are we in characters' minds?) + tension (narrative grip)
  const item2 = 1 + (interiority * 0.7 + tension * 0.3) * 6;

  // 3. Curiosity: "I wanted to learn how the story ended."
  //    → curiosity (unresolved threads) + tension (narrative drive)
  const item3 = 1 + (curiosity * 0.6 + tension * 0.4) * 6;

  // 4. Emotional Impact: "The story affected me emotionally."
  //    → emotion (valence range) + interiority (character connection)
  const item4 = 1 + (emotion * 0.6 + interiority * 0.4) * 6;

  // 5. Character Interest: "I was very interested in what happens to the characters."
  //    → interiority (character depth) + curiosity (character fate threads)
  const item5 = 1 + (interiority * 0.7 + curiosity * 0.3) * 6;

  // 6. Social Resonance: "After finishing the story, I wanted to discuss it with someone."
  //    → resolution (satisfying closure) + emotion (resonant feeling)
  const item6 = 1 + (resolution * 0.6 + emotion * 0.4) * 6;

  const items: [number, number, number, number, number, number] = [
    Math.min(7, Math.max(1, item1)),
    Math.min(7, Math.max(1, item2)),
    Math.min(7, Math.max(1, item3)),
    Math.min(7, Math.max(1, item4)),
    Math.min(7, Math.max(1, item5)),
    Math.min(7, Math.max(1, item6)),
  ];

  const mean = items.reduce((s, x) => s + x, 0) / 6;
  const band: TransportationBand = mean >= 6 ? 'high' : mean >= 5 ? 'moderate' : 'low';

  const coverage = `${nonZeroCount}/5 signals`;
  const note = abstained
    ? `Abstained (${coverage}): insufficient signal coverage for confident estimate.`
    : `Diagnostic estimate (${coverage}). Band ${band} at mean=${mean.toFixed(2)}. ` +
      `Validate against human labels before any decision.`;

  return { items, mean, band, abstained, note };
}
