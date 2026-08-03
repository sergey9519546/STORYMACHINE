// Inflection-rate tension signal — geometric measure of narrative reversals.
//
// Per-scene tension curve based on affect lexicon (VADER, NRC EmoLex —
// same as emotional-arc.ts). Measures local minima and maxima — inflection
// points where the narrative curve reverses direction. Normalized by curve
// length to produce inflectionRate: low for flat/monotone arcs, moderate
// for well-structured stories with clear acts, high for erratic noise.
// Deterministic, no LLM. Research: arXiv 2604.09854 "Spoiler Alert / 100-Endings".
//
// -- Status (2026-08-03 wiring audit) -- INTEGRATE LATER (strongest
// order-sensitivity finding outside temporal-consistency.ts this audit)
// Zero importers anywhere in the repo except its own test
// (tests/core/inflection-tension.test.ts). Takes ordered scene texts
// directly (computeInflectionTension(sceneTexts)) -- no missing extractor,
// trivially callable from doctor.ts via the same scenesFromFountain split
// already duplicated elsewhere in this directory. STRONG order-sensitivity
// CONFIRMED by probe (12-scene fixture, 15 seeded shuffles): inflectionRate
// changed in 11/15 shuffles (73%), ranging 0.27-0.82 against an intact-order
// reading of 0.45 -- nearly a 3x spread from reordering the SAME 12 scenes.
// This is a curve-shape statistic by construction (local minima/maxima over
// an ordered sequence), so the sensitivity is expected, not incidental --
// unlike story-spine.ts. Comparable in spirit to the ALREADY-PROVEN
// emotional-arc.ts rampCorrelation/peakPosition signal NORTH_STAR credits
// with AUC ~0.82 on act-swap; this may be an underused sibling of that
// signal, sharing the same LEXICON (data/emotional-arc-lexicon.json).
// NOT YET SAFE to wire: this probe only shows the output CHANGES under
// shuffle, not that it changes in the discriminating direction on REAL
// (non-adversarially-constructed) scripts, and -- per this audit's
// temporal-consistency.ts finding -- an existing green test suite is not
// sufficient evidence of low false-positive risk on realistic input. What
// would unblock it: the same adversarial-fixture pass temporal-
// consistency.ts's FLASHBACK branch needed (ordinary scripts, not just
// hand-picked shuffles) before diagnostic wiring; real-corpus shuffle-AUC
// measurement before any score-side conversation.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// word → [valence ∈ [-1,1], arousal ∈ [0,1]]
type Affect = readonly [number, number];
const LEXICON: Record<string, Affect> = JSON.parse(
  readFileSync(fileURLToPath(new URL('./data/emotional-arc-lexicon.json', import.meta.url)), 'utf8'),
);

export interface InflectionTension {
  tensionCurve: number[];
  inflectionRate: number;
  reversals: number;
  peakToTroughRange: number;
  scored: boolean;
}

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z][a-z']+/g) ?? [];

function computeTension(scene: string): number {
  const w = tokenize(scene);
  const n = Math.max(w.length, 1);
  let vSum = 0, aSum = 0, matched = 0;
  for (const t of w) {
    const e = LEXICON[t];
    if (e) {
      vSum += e[0];
      aSum += e[1];
      matched++;
    }
  }
  const valence = matched ? vSum / matched : 0;
  const arousal = matched ? aSum / matched : 0;
  const excl = (scene.match(/!/g) ?? []).length;
  // tension: negative valence + arousal, scaled by lexical intensity, + light structural cue
  const negPull = Math.max(0, -valence);
  const tension = (negPull * 2 + arousal * 1.5) * 50 + (excl / n) * 20;
  return tension;
}

export const INFLECTION_TENSION_MIN_SCENES = 6;

/** Count reversals (inflection points) in a tension curve. */
function countReversals(curve: number[]): number {
  if (curve.length < 3) return 0;
  let reversals = 0;
  for (let i = 1; i < curve.length - 1; i++) {
    const isLocalMax = curve[i - 1] < curve[i] && curve[i] > curve[i + 1];
    const isLocalMin = curve[i - 1] > curve[i] && curve[i] < curve[i + 1];
    if (isLocalMax || isLocalMin) reversals++;
  }
  return reversals;
}

/** Compute the inflection-rate tension signal from ordered scene texts. Pure + deterministic. */
export function computeInflectionTension(sceneTexts: readonly string[]): InflectionTension {
  const n = sceneTexts.length;

  // Abstain if too few scenes
  if (n < INFLECTION_TENSION_MIN_SCENES) {
    return {
      tensionCurve: [],
      inflectionRate: 0,
      reversals: 0,
      peakToTroughRange: 0,
      scored: false,
    };
  }

  // Compute tension curve
  const tensionCurve = sceneTexts.map(computeTension);

  // Count reversals
  const reversals = countReversals(tensionCurve);

  // Compute inflection rate: reversals per interval (normalized by length)
  const inflectionRate = n > 1 ? reversals / (n - 1) : 0;

  // Compute peak-to-trough range
  const peak = Math.max(...tensionCurve);
  const trough = Math.min(...tensionCurve);
  const peakToTroughRange = peak - trough;

  return {
    tensionCurve,
    inflectionRate,
    reversals,
    peakToTroughRange,
    scored: true,
  };
}
