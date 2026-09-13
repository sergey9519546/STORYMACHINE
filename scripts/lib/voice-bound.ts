// The two Fountain document shapes MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT
// (server/lib/validation.ts) is derived against, and the rule that turns a
// table of their measured costs into the bound — ONE implementation of each,
// imported by every place that measures, asserts, or re-checks them. The same
// arrangement scripts/lib/auc.ts has for the AUC floors and their degradation
// recipe, for the same reason.
//
// WHY THIS FILE EXISTS. Both generators were written inside the "finding 10"
// describe block of tests/security/fountain-shape-guard-cue-parity.test.ts on
// 2026-09-12, and the bound was derived from timings taken against a private,
// scratch copy of them on a machine that was never named. On 2026-09-13 the
// first real GitHub Actions run since 2026-09-02 (run 34736306670 attempt 2,
// ubuntu-latest) failed the N=150 cost assertion at 19,713 ms of CPU against a
// 15,000 ms half-budget target: the derivation's machine was faster than the
// machine that enforces the derivation, and nothing in the record said so.
//
// A derivation that can only be reproduced by re-typing the generator is not
// reproducible. So the shapes live here, the calibration script
// (scripts/measure-voice-bound-cost.mjs) and the security suite import the SAME
// bytes, and the committed derivation table
// (tests/fixtures/voice-bound-derivation.json) is produced by running this
// module on the runner. Changing a generator here changes the measurement, the
// test and the constant together, or the fixture test
// (tests/core/voice-bound-derivation.test.ts) fails.
//
// Nothing in this file is scoring-path: it produces text, it does not score it.

/** The dialogue paragraph both shapes are built from. Exactly six real words
 *  (voice-delta.ts's tokenizer counts letter-only tokens), so five paragraphs
 *  land a speaker on exactly 30 — VOICE_ELIGIBLE_MIN_WORDS, the eligibility
 *  floor. The period-terminated variant is the one buildProbeCastFeature used
 *  when the bound was first derived; it is kept byte-for-byte rather than
 *  unified with the other, because unifying them would silently change every
 *  timing this repository has recorded against either shape. */
const DLG_UNIFORM = 'this is ordinary lowercase dialogue here';
const DLG_PROBE = 'this is ordinary lowercase dialogue here.';

/**
 * The UNIFORM-MIN shape: `cast` distinct speakers, each at EXACTLY
 * VOICE_ELIGIBLE_MIN_WORDS (30) real words — five double-spaced six-word
 * paragraphs.
 *
 * This is the worst case the voice-eligible-weight bound admits at any given
 * weight. Weight is (eligible distinct count) x (their total pooled words), and
 * every eligible speaker must ALSO clear the 30-word floor, so a weight ceiling
 * of W admits at most sqrt(W / 30) distinct speakers — and cost is driven by
 * analyzeVoices's O(distinct²) Burrows's-Delta pair count, not by the weight
 * product. Sitting every speaker exactly ON the floor therefore buys the most
 * pairs per unit of weight that the bound can be made to pay for.
 *
 * Weight at cast N is exactly N x (N x 30) = 30N².
 */
export function buildUniformMin(cast: number): string {
  let t = '', occ = 0, scene = 0;
  while (occ < cast) {
    t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
    for (let i = 0; i < 40 && occ < cast; i++, occ++) {
      t += `CHARACTER${occ}\n\n`;
      for (let p = 0; p < 5; p++) t += `${DLG_UNIFORM}\n\n`;
    }
  }
  return t;
}

/** The uniform-min shape's voice-eligible weight at a given cast — the closed
 *  form (30N²) the generator above produces, so callers never restate it. */
export function uniformMinWeight(cast: number): number {
  return cast * (cast * 30);
}

/**
 * The FEW-BIG (probe-cast) shape: a realistic feature-scale ensemble —
 * Zipf-distributed speech with a 35-word floor, ~15,150 pooled dialogue words
 * spread over a 110-page-scale document. Every character clears the
 * eligibility floor (the worst case for this bound among realistic scripts; a
 * real script's walk-ons usually fall under the floor and skip the check
 * entirely).
 *
 * This is the shape the writer-facing side of the bound is about: casts of
 * 20-40 here are ordinary heist / courtroom / war-film / TV-pilot ensembles,
 * and rejecting them is the regression that adversarial finding 10 opened.
 */
export function buildProbeCastFeature(cast: number, totalDialogueWords = 15_150): string {
  const raw: number[] = [];
  let rawSum = 0;
  for (let i = 1; i <= cast; i++) { const w = 1 / i; raw.push(w); rawSum += w; }
  const alloc = raw.map((w) => Math.max(35, Math.round((w / rawSum) * totalDialogueWords)));
  const drift = totalDialogueWords - alloc.reduce((a, b) => a + b, 0);
  alloc[0] = Math.max(35, alloc[0]! + drift);

  const names = Array.from({ length: cast }, (_, i) => `CHARACTER${i + 1}`);
  let text = 'INT. ROOM 0 - DAY\n\nA moment passes before anyone speaks.\n\n';
  let scene = 1;
  for (let i = 0; i < cast; i++) {
    let remaining = alloc[i]!;
    while (remaining > 0) {
      const n = Math.min(remaining, 10);
      text += `${names[i]}\n${DLG_PROBE}${n > 6 ? ' ' + DLG_PROBE : ''}\n\n`;
      remaining -= Math.min(remaining, n > 6 ? 12 : 6);
      if (remaining > 0 && (i + scene) % 7 === 0) {
        text += `INT. LOCATION ${scene++} - DAY\n\nA moment passes before anyone speaks.\n\n`;
      }
    }
  }
  return text;
}

/** The two shapes by name, so a calibration run, a workflow argument and a
 *  fixture row all spell them the same way. */
export const VOICE_BOUND_SHAPES = {
  'uniform-min': buildUniformMin,
  'probe-cast': buildProbeCastFeature,
} as const;

export type VoiceBoundShapeName = keyof typeof VOICE_BOUND_SHAPES;

// ── The derivation rule ────────────────────────────────────────────────────
// Stated once, in code, so a committed table and the constant cannot drift
// apart: tests/core/voice-bound-derivation.test.ts re-derives the bound from
// tests/fixtures/voice-bound-derivation.json's rows with this exact function
// and asserts the constant equals the result.

/** One measured row of a calibration sweep
 *  (scripts/measure-voice-bound-cost.mjs). */
export interface VoiceBoundRow {
  readonly shape: VoiceBoundShapeName;
  readonly n: number;
  readonly distinct: number;
  readonly pooledWords: number;
  readonly weight: number;
  readonly guard: 'ACCEPT' | 'REJECT';
  readonly cpuMsSamples: readonly number[];
  readonly cpuMsMedian: number;
  readonly cpuMsMax: number;
  readonly wallMsMedian: number;
  readonly wallMsMax: number;
}

/**
 * The safety margin the derivation holds back from the half-budget target.
 *
 * Not decoration. The 2026-09-12 derivation chose N=150 (12.1 s) over N=160
 * (14.3 s) precisely because 0.7 s of headroom under a 15 s target is inside
 * this measurement's own run-to-run spread — it said so, but the margin lived
 * only in that prose judgement, so nothing recomputed it later. 15% of the
 * target (2,250 ms at the current budget) is wider than the spread seen in
 * every sweep recorded so far, on either machine, in either load condition.
 */
export const DERIVATION_MARGIN_FRACTION = 0.15;

export interface VoiceBoundDerivation {
  readonly targetMs: number;
  readonly ceilingMs: number;
  readonly marginFraction: number;
  readonly derivedN: number | null;
  readonly derivedWeight: number | null;
  readonly derivedCpuMsMax: number | null;
}

/**
 * The largest swept uniform-min cast whose WORST observed CPU sample stays at
 * or under (half the analysis budget, less the margin) — and every smaller
 * swept cast must clear it too, so one noisy-low sample above a noisy-high one
 * can never promote a cast. Worst sample, not median: the assertion this bound
 * is answerable to runs once per CI run and fails on a single bad sample.
 */
export function deriveCast(
  rows: readonly VoiceBoundRow[],
  budgetMs: number,
  marginFraction: number = DERIVATION_MARGIN_FRACTION,
): VoiceBoundDerivation {
  const targetMs = budgetMs / 2;
  const ceilingMs = Math.floor(targetMs * (1 - marginFraction));
  const uniform = rows.filter((r) => r.shape === 'uniform-min').slice().sort((a, b) => a.n - b.n);
  let derived: VoiceBoundRow | null = null;
  for (const row of uniform) {
    if (row.cpuMsMax <= ceilingMs) derived = row;
    else break; // cost is monotone in N by construction — stop at the first failure
  }
  return {
    targetMs,
    ceilingMs,
    marginFraction,
    derivedN: derived ? derived.n : null,
    derivedWeight: derived ? uniformMinWeight(derived.n) : null,
    derivedCpuMsMax: derived ? derived.cpuMsMax : null,
  };
}
