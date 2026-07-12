// Emotional-arc signal — ROADMAP §8 EA wave. Deterministic, no LLM.
//
// Per-scene valence + arousal from a real merged affect lexicon (VADER, Hutto &
// Gilbert 2014, MIT + NRC EmoLex, Mohammad & Turney 2013 — 12,142 words), read
// into POSITION-AWARE arc-shape features and fit to the six Reagan et al. (2016)
// emotional archetypes. Measured (docs/scoring): a position-aware arc signal
// lifts real-vs-act-swap separation from AUC≈0.48 (the engine's global-arc blind
// spot, ROADMAP §5.1) toward ≈0.65. DIAGNOSTIC ONLY — surfaced in the report,
// not (yet) fed into the health scalar (that step is gated on doctor-level AUC +
// zero calibration regression).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// word → [valence ∈ [-1,1], arousal ∈ [0,1]]
type Affect = readonly [number, number];
const LEXICON: Record<string, Affect> = JSON.parse(
  readFileSync(fileURLToPath(new URL('./data/emotional-arc-lexicon.json', import.meta.url)), 'utf8'),
);

export interface SceneAffect { valence: number; arousal: number; tension: number; coverage: number; }
export type ReaganArc = 'rise' | 'fall' | 'man_in_hole' | 'icarus' | 'cinderella' | 'oedipus' | 'flat';
export interface EmotionalArc {
  perScene: SceneAffect[];
  peakPosition: number;       // where peak tension sits, 0..1
  rampCorrelation: number;    // tension vs rising ramp
  resolutionDrop: number;     // fall after the climax
  valenceShift: number;       // end − start valence
  tensionVolatility: number;  // stdev of scene-to-scene tension change
  reaganArc: ReaganArc;       // best-fit valence archetype
  reaganFit: number;          // |corr| to that archetype — shape coherence
  arcHealth: number;          // composite, position-aware. Diagnostic only.
  lexCoverage: number;        // mean fraction of words found in the lexicon
  scored: boolean;
}

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z][a-z']+/g) ?? [];

function sceneAffect(scene: string): SceneAffect {
  const w = tokenize(scene); const n = Math.max(w.length, 1);
  let vSum = 0, aSum = 0, matched = 0;
  for (const t of w) { const e = LEXICON[t]; if (e) { vSum += e[0]; aSum += e[1]; matched++; } }
  const valence = matched ? vSum / matched : 0;
  const arousal = matched ? aSum / matched : 0;
  const excl = (scene.match(/!/g) ?? []).length;
  // tension: negative valence + arousal, scaled by lexical intensity, + light structural cue
  const negPull = Math.max(0, -valence);
  const tension = (negPull * 2 + arousal * 1.5) * 50 + (excl / n) * 20;
  return { valence, arousal, tension, coverage: matched / n };
}

function pearson(a: number[], b: number[]): number {
  const n = a.length; if (n < 2) return 0;
  const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  const den = Math.sqrt(da * db);
  return den ? num / den : 0;
}

// Reagan (2016) archetype templates over t∈[0,1].
const ARCHETYPES: Record<Exclude<ReaganArc, 'flat'>, (t: number) => number> = {
  rise: t => 2 * t - 1,
  fall: t => 1 - 2 * t,
  man_in_hole: t => 2 * (2 * t - 1) ** 2 - 1,   // U: fall then rise
  icarus: t => 1 - 2 * (2 * t - 1) ** 2,         // ∩: rise then fall
  cinderella: t => Math.sin(3 * Math.PI * t),    // rise-fall-rise
  oedipus: t => -Math.sin(3 * Math.PI * t),       // fall-rise-fall
};

function bestReagan(valence: number[]): { arc: ReaganArc; fit: number } {
  const n = valence.length;
  if (new Set(valence).size <= 1) return { arc: 'flat', fit: 0 };
  let best: ReaganArc = 'flat', bestFit = 0;
  for (const [name, fn] of Object.entries(ARCHETYPES) as [Exclude<ReaganArc,'flat'>, (t:number)=>number][]) {
    const tmpl = valence.map((_, i) => fn(i / (n - 1)));
    const c = Math.abs(pearson(valence, tmpl));
    if (c > bestFit) { bestFit = c; best = name; }
  }
  return { arc: best, fit: bestFit };
}

export const EMOTIONAL_ARC_MIN_SCENES = 6;

/** Compute the emotional arc from ordered scene texts. Pure + deterministic. */
export function computeEmotionalArc(sceneTexts: readonly string[]): EmotionalArc {
  const perScene = sceneTexts.map(sceneAffect);
  const n = perScene.length;
  const lexCoverage = n ? perScene.reduce((s, x) => s + x.coverage, 0) / n : 0;
  if (n < EMOTIONAL_ARC_MIN_SCENES) {
    return { perScene, peakPosition: 0, rampCorrelation: 0, resolutionDrop: 0, valenceShift: 0, tensionVolatility: 0, reaganArc: 'flat', reaganFit: 0, arcHealth: 0, lexCoverage, scored: false };
  }
  const T = perScene.map(s => s.tension);
  const V = perScene.map(s => s.valence);
  const idx = T.map((_, i) => i);
  const ramp = idx.map(i => i / (n - 1));
  const peak = Math.max(...T);
  const peakPosition = (T.indexOf(peak) + 1) / n;
  const rampCorrelation = pearson(T, ramp);
  const resolutionDrop = peak > 0 ? (peak - T[n - 1]) / peak : 0;
  const valenceShift = V[n - 1] - V[0];
  const deltas = T.slice(1).map((t, i) => t - T[i]);
  const md = deltas.reduce((s, x) => s + x, 0) / deltas.length;
  const tensionVolatility = Math.sqrt(deltas.reduce((s, x) => s + (x - md) ** 2, 0) / deltas.length);
  const { arc: reaganArc, fit: reaganFit } = bestReagan(V);
  // position-aware composite: rising build + late peak + resolution fall + coherent shape
  const arcHealth = 1.2 * rampCorrelation + 1.0 * peakPosition + 1.0 * resolutionDrop + 0.8 * reaganFit;
  return { perScene, peakPosition, rampCorrelation, resolutionDrop, valenceShift, tensionVolatility, reaganArc, reaganFit, arcHealth, lexCoverage, scored: true };
}

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). */
export function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}
