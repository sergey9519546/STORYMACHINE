// The Fountain document shapes MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT
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
  return buildUniformCast(cast, 30);
}

/**
 * The uniform shape at an arbitrary words-per-speaker: `cast` distinct
 * speakers, each with exactly `wordsPerSpeaker` real words (a multiple of 6,
 * the paragraph's word count; at least 30, the eligibility floor). Weight is
 * cast x (cast x wordsPerSpeaker).
 *
 * buildUniformMin is this at the floor, and is byte-identical to the generator
 * the 2026-09-12 derivation used — verified at eleven casts before the two were
 * merged into one.
 */
export function buildUniformCast(cast: number, wordsPerSpeaker: number): string {
  const paragraphs = Math.round(wordsPerSpeaker / 6);
  if (paragraphs * 6 !== wordsPerSpeaker) {
    throw new Error(`wordsPerSpeaker must be a multiple of 6 (the paragraph length), got ${wordsPerSpeaker}`);
  }
  if (wordsPerSpeaker < 30) {
    throw new Error(`wordsPerSpeaker must clear the 30-word eligibility floor, got ${wordsPerSpeaker}`);
  }
  let t = '', occ = 0, scene = 0;
  while (occ < cast) {
    t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
    for (let i = 0; i < 40 && occ < cast; i++, occ++) {
      t += `CHARACTER${occ}\n\n`;
      for (let p = 0; p < paragraphs; p++) t += `${DLG_UNIFORM}\n\n`;
    }
  }
  return t;
}

/**
 * The largest words-per-speaker a uniform cast of this size can carry while
 * still clearing a weight bound — floor(bound / cast²), rounded DOWN to a whole
 * paragraph, never below the 30-word eligibility floor.
 */
export function maxAdmittedWordsPerSpeaker(cast: number, weightBound: number): number {
  const ceiling = Math.floor(weightBound / (cast * cast));
  return Math.max(30, Math.floor(ceiling / 6) * 6);
}

/**
 * THE WORST SHAPE A WEIGHT BOUND ACTUALLY ADMITS at a given distinct count:
 * `cast` speakers, each carrying as many words as the bound still allows.
 *
 * WHY THIS SHAPE AND NOT uniform-min. A scalar weight bound of W is two
 * constraints in one, and uniform-min only tests the first. Fixing the cast at
 * `cast`, the guard admits any per-speaker word count up to W / cast² — at the
 * 2026-09-12 bound of 675,000 a 60-speaker document may carry 186 words each
 * (11,160 pooled words), not the 30 that uniform-min gives it. Deriving a cap
 * on the distinct count from uniform-min would therefore measure a document
 * three times lighter than the one the pair of bounds lets through, which is
 * the exact class of mistake round 1 of the 2026-09-12 derivation made in the
 * other direction (it measured the cheap few-big shape and missed uniform-min).
 *
 * Note that this shape degenerates to uniform-min once cast² x 30 reaches the
 * bound — at that point the weight bound allows nothing above the floor.
 */
export function buildMaxAdmitted(cast: number, weightBound: number): string {
  return buildUniformCast(cast, maxAdmittedWordsPerSpeaker(cast, weightBound));
}

/** The uniform-min shape's voice-eligible weight at a given cast — the closed
 *  form (30N²) the generator above produces, so callers never restate it. */
export function uniformMinWeight(cast: number): number {
  return cast * (cast * 30);
}

/** The dialogue paragraph the UNIFORM-32 shape is built from. Exactly EIGHT
 *  real words by voice-delta.ts's tokenizer (`[a-z']+`, filtered to tokens
 *  containing a letter — so no digits or punctuation could pad the count), so
 *  four double-spaced paragraphs land a speaker on exactly 32. A dedicated
 *  unit rather than a change to DLG_UNIFORM's six-word rule: 32 is not a
 *  multiple of 6, and bending buildUniformCast to accept it would alter a
 *  generator three suites depend on for byte-stable timings. This constant
 *  is read by buildUniform32 and nothing else. */
const DLG_UNIFORM_32 = 'this is ordinary lowercase dialogue here for now';

/**
 * The UNIFORM-32 shape: `cast` distinct speakers, each at EXACTLY 32 real
 * words — four double-spaced eight-word paragraphs — with the same scene /
 * action / cue scaffolding buildUniformCast emits (a heading every 40 cues).
 *
 * WHY A THIRD UNIFORM SHAPE. VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT
 * (server/lib/validation.ts) was first fitted on 2026-09-05, at 0.173
 * us/unit, to "n uniform characters on the 32-word floor" (n = 97 -> weight
 * 301,088), on a developer box, against a generator that no longer exists.
 * buildUniformCast cannot reproduce that shape at any cast — it refuses a
 * words-per-speaker that is not a multiple of 6 — so until 2026-09-21 the
 * runner had never measured it, and the constant could only be cross-checked
 * against OTHER shapes' rates. This generator gives the calibration script
 * (`--uniform-32=`) and the workflow (`uniform_32`) the shape by name; run
 * 35553883758 measured it (N=97: 299 ms loaded, 0.9931 us/unit), the table
 * is committed at tests/fixtures/voice-bound-derivation.json, and the
 * constant is now that row, asserted equal to it by the security suite. It
 * is a reconstruction from the constant's two recorded outputs (32 words per
 * speaker; 97 speakers -> weight 301,088), not the lost generator's bytes.
 *
 * Weight at cast N is exactly N x (N x 32) = 32N².
 */
export function buildUniform32(cast: number): string {
  let t = '', occ = 0, scene = 0;
  while (occ < cast) {
    t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
    for (let i = 0; i < 40 && occ < cast; i++, occ++) {
      t += `CHARACTER${occ}\n\n`;
      for (let p = 0; p < 4; p++) t += `${DLG_UNIFORM_32}\n\n`;
    }
  }
  return t;
}

/** The uniform-32 shape's voice-eligible weight at a given cast — the closed
 *  form (32N²) buildUniform32 produces, so callers never restate it
 *  (97 -> 301,088, the weight the cost-rate constant is fitted at). */
export function uniform32Weight(cast: number): number {
  return cast * (cast * 32);
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

/** The shapes by name, so a calibration run, a workflow argument and a
 *  fixture row all spell them the same way. */
export const VOICE_BOUND_SHAPES = {
  /** Every speaker at the 30-word eligibility floor — the shape the 2026-09-12
   *  derivation used, kept so its numbers stay comparable. */
  'uniform-min': (cast: number, _weightBound: number) => buildUniformMin(cast),
  /** Every speaker at exactly 32 words — the shape
   *  VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT was fitted on. Not swept by
   *  default; asked for by name (`--uniform-32=` / `uniform_32`). */
  'uniform-32': (cast: number, _weightBound: number) => buildUniform32(cast),
  /** Every speaker at the 30-word floor, padded to the heaviest document the
   *  weight bound still admits at this cast — the real worst case. */
  'max-admitted': (cast: number, weightBound: number) => buildMaxAdmitted(cast, weightBound),
  /** A realistic feature-scale ensemble. */
  'probe-cast': (cast: number, _weightBound: number) => buildProbeCastFeature(cast),
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
 * WHAT IT IS FOR, AND WHAT IT IS NOT FOR. `ubuntu-latest` is not one machine.
 * Four CI runs on 2026-09-13 landed on three different CPU models — AMD EPYC
 * 9V74 (run 34739080950), AMD EPYC 7763 (run 34741928418), Intel Xeon Platinum
 * 8573C (run 34740951649) — all four vCPU, all the same runner image. The same
 * shape under the same saturating load proxy differs by **20.1%** between the
 * two that were swept: uniform-min N=150 cost 20,022 ms on the Xeon (the
 * committed table) and 24,052 ms on the EPYC 9V74 (run 34739790205). A table is
 * locked from whichever runner the calibration happens to land on, and it has
 * to hold on the others. That transfer is the whole job of this number, and
 * 20% is what it measured.
 *
 * It is therefore applied to the LOCKED table only. Applying it again to a
 * table already measured on the slower machine would double-count the same
 * spread: on the EPYC 9V74 sweep the 12,000 ms ceiling clears no swept cast at
 * all (the smallest, N=40, reads 12,442 ms) and `deriveCast` returns null. The
 * check against that machine is the raw half-budget, not the discounted one,
 * and the shipped cast reads 14,724 ms there — under 15,000 ms, but only just,
 * and under a load harsher than the one the assertion runs in. This is stated
 * rather than smoothed over; see MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT's own
 * comment in server/lib/validation.ts for what that means for a red build.
 *
 * VERIFIED END TO END, so none of the above has to be believed. The assertion
 * measures the shipped boundary shape itself, inside the real `npm test`, on
 * whatever runner CI lands on, and prints the number on pass. Run 34741928418,
 * AMD EPYC 7763: **12,319 ms of CPU, 82% of the 15,000 ms target**. That is the
 * quantity the derivation is about, measured in the condition it is enforced
 * in, with no cross-machine arithmetic in between.
 *
 * NOT MORE THAN 20%, and the same tables say why. A realistic 40-character
 * feature (the committed probe-cast generator, ~15,240 pooled dialogue words)
 * costs 10,606 ms under the proxy on the Xeon and 12,057 ms on the EPYC 9V74 —
 * 71% to 80% of the half-budget with nothing pathological about it. The
 * analyzer's baseline cost on a feature-length document, not the voice pass,
 * fills most of that budget on these machines. A cast bound cannot buy margin
 * against it, and a larger margin would stop buying safety and start refusing
 * ordinary ensembles a score.
 */
export const DERIVATION_MARGIN_FRACTION = 0.20;

/** The shape the cast cap is derived from: the heaviest document the weight
 *  bound still admits at each cast. See buildMaxAdmitted for why not
 *  uniform-min. */
export const DERIVATION_SHAPE: VoiceBoundShapeName = 'max-admitted';

export interface VoiceBoundDerivation {
  readonly shape: VoiceBoundShapeName;
  readonly targetMs: number;
  readonly ceilingMs: number;
  readonly marginFraction: number;
  /** The largest cast whose worst measured cost clears the ceiling — the value
   *  MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT takes. */
  readonly derivedCast: number | null;
  readonly derivedCpuMsMax: number | null;
}

/**
 * The largest swept cast of the derivation shape whose WORST observed CPU
 * sample stays at or under (half the analysis budget, less the margin) — and
 * every smaller swept cast must clear it too, so one noisy-low sample above a
 * noisy-high one can never promote a cast. Worst sample, not median: the
 * assertion this bound is answerable to runs once per CI run and fails on a
 * single bad sample.
 */
export function deriveCast(
  rows: readonly VoiceBoundRow[],
  budgetMs: number,
  marginFraction: number = DERIVATION_MARGIN_FRACTION,
  shape: VoiceBoundShapeName = DERIVATION_SHAPE,
): VoiceBoundDerivation {
  const targetMs = budgetMs / 2;
  const ceilingMs = Math.floor(targetMs * (1 - marginFraction));
  const swept = rows.filter((r) => r.shape === shape).slice().sort((a, b) => a.n - b.n);
  let derived: VoiceBoundRow | null = null;
  for (const row of swept) {
    if (row.cpuMsMax <= ceilingMs) derived = row;
    else break; // cost is monotone in cast for this shape — stop at the first failure
  }
  return {
    shape,
    targetMs,
    ceilingMs,
    marginFraction,
    derivedCast: derived ? derived.n : null,
    derivedCpuMsMax: derived ? derived.cpuMsMax : null,
  };
}
