// ORDER CLAIMS ARE ASSERTED OVER AN ENSEMBLE, NOT OVER ONE LUCKY PERMUTATION.
//
// ── What this file is for (2026-09-12, adversarial review findings 2, 3) ────
// `tests/core/feature-scale-discrimination.test.ts:220` asserted, in its own
// words, that "a scrambled act order must never score HIGHER than the draft it
// was cut from", and checked it against exactly one hand-built permutation.
// The review ran twenty seeded permutations of the SAME twenty-one scene bodies
// and found the claim false for THIRTEEN of them on `main`, with the committed
// `act-swapped.fountain` scoring lower than all twenty — an extreme-value draw
// from a distribution with 13.3 points of spread, used as the evidence for a
// universal statement.
//
// A single committed permutation is a witness that can be chosen. An ensemble
// cannot be. Every order claim in this repository is therefore stated here as a
// statistic over K seeded orderings, with the whole distribution printed on
// pass as well as on failure, so the margin is always read against the spread.
//
// ── What holds, measured on this tree, and what does not ───────────────────
// It matters that this file is not a victory lap. Two of the four things it
// measures are FAILURES of the engine, recorded as such rather than left out:
//
//   21-scene intact.fountain    intact 79.1; 20 permutations 65.3 .. 81.5
//                               FIVE still score higher; permutation AUC 0.75
//                               (main: THIRTEEN higher)
//                               reversal 66.7, i.e. -12.4 — correct sign
//   231-scene assembled-feature intact 74.4; 20 permutations 54.7 .. 59.7
//                               none higher; permutation AUC 1.0000
//                               REVERSAL 79.1, i.e. +4.7 — WRONG SIGN
//
// The reversal row is finding 2, still open. It is smaller than main's +5.0 and
// no longer promotes the verdict, but the sign is unchanged: reversing every
// scene of a 231-scene document still RAISES its health. It is asserted here as
// a pinned, named, deliberately-failing witness — the value is floored so it
// cannot get worse and asserted to still be positive so nobody can claim it was
// fixed — in the same style as the `empty_verbosity` metamorphic witness.
//
// ── Why a self-referential statistic cannot fix the reversal ───────────────
// The review's proposed cure is an arc statistic referenced to the script's own
// permutation distribution. That WOULD make "no permutation of me outscores me"
// true by construction — and it cannot fix the reversal row, because the
// reference distribution is recomputed for the reversed document too: permuting
// a reversed staple gives the same kind of distribution as permuting the
// original, and the reversed document still sits high in it. The reversal
// finding is not "the arc term lacks a reference distribution", it is "the arc
// term's sign is wrong on this document". Choosing what an arc should measure
// instead is a corpus question, and this lane does not answer it with an edit.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { segmentFountainScenes, reassembleFountainScenes } from '../../scripts/lib/scene-segments.ts';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

/** The ensemble size. Twenty is the review's number and is what every figure in
 *  this file's header was measured at; changing it changes what the floors
 *  below mean, so it is one constant read by every test here. */
export const ORDER_ENSEMBLE_K = 20;

/** mulberry32 — the same PRNG the metamorphic runner and the benchmark use, so
 *  "seeded permutation" means one thing in this repository. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const a = arr.slice();
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Ensemble {
  intact: number;
  sceneCount: number;
  healths: number[];
  higher: number;
  tied: number;
  /** The share of orderings the intact script beats, ties counting a half —
   *  i.e. the AUC of "intact vs a permutation of itself". 1.0 means no
   *  permutation of this script's own scenes outscores it. */
  auc: number;
  reversed: number;
}

async function ensembleFor(file: string, k: number): Promise<Ensemble> {
  const text = readFileSync(path.join(REPO_ROOT, file), 'utf8');
  const seg = segmentFountainScenes(text);
  const intactReport = await runScriptDoctor(text);
  const healths: number[] = [];
  for (let seed = 1; seed <= k; seed++) {
    const permuted = reassembleFountainScenes(seg.head, seededShuffle(seg.scenes, seed));
    const r = await runScriptDoctor(permuted);
    assert.equal(
      r.sceneCount, intactReport.sceneCount,
      `seed ${seed} changed the scene count ${intactReport.sceneCount} -> ${r.sceneCount}; a permutation `
      + 'must hold scene count and word count constant or it is not measuring order',
    );
    healths.push(r.health);
  }
  const reversedReport = await runScriptDoctor(
    reassembleFountainScenes(seg.head, seg.scenes.slice().reverse()),
  );
  const higher = healths.filter((h) => h > intactReport.health).length;
  const tied = healths.filter((h) => h === intactReport.health).length;
  return {
    intact: intactReport.health,
    sceneCount: intactReport.sceneCount,
    healths: healths.slice().sort((a, b) => a - b),
    higher,
    tied,
    auc: (k - higher - tied * 0.5) / k,
    reversed: reversedReport.health,
  };
}

function report(label: string, e: Ensemble): string {
  return `    ${label}: intact ${e.intact.toFixed(1)} over ${e.sceneCount} scenes; `
    + `${ORDER_ENSEMBLE_K} permutations [${e.healths[0].toFixed(1)}, ${e.healths[e.healths.length - 1].toFixed(1)}]; `
    + `${e.higher} higher, ${e.tied} tied; permutation AUC ${e.auc.toFixed(4)}; reversed ${e.reversed.toFixed(1)} `
    + `(${e.reversed >= e.intact ? '+' : ''}${(e.reversed - e.intact).toFixed(1)})`;
}

// ── The floors. Each is a MEASURED value on this tree, and each is a ratchet
// against getting worse, never a target. Raising one is a rerun's job.
/** 21-scene fixture: measured 0.7500 (15 of 20 permutations beaten). */
const SHORT_PERMUTATION_AUC_FLOOR = 0.70;
/** 231-scene fixture: measured 1.0000 (no permutation beats the intact). */
const FEATURE_PERMUTATION_AUC_FLOOR = 0.95;
/** The reversal defect, pinned. Measured +4.7 on this tree, +5.0 on main. */
const FEATURE_REVERSAL_DELTA_CEILING = 5.2;

describe('order invariants over a seeded permutation ensemble (findings 2 and 3)', () => {
  let short: Ensemble;
  let feature: Ensemble;

  it(`the 21-scene fixture: intact vs ${ORDER_ENSEMBLE_K} seeded permutations of its own scenes`, async () => {
    short = await ensembleFor('tests/fixtures/feature-scale-discrimination/intact.fountain', ORDER_ENSEMBLE_K);
    console.log(report('21-scene', short));
    assert.ok(
      short.auc >= SHORT_PERMUTATION_AUC_FLOOR,
      `permutation AUC ${short.auc.toFixed(4)} is below the ${SHORT_PERMUTATION_AUC_FLOOR} floor: `
      + `${short.higher} of ${ORDER_ENSEMBLE_K} seeded permutations of this script's own scenes score HIGHER `
      + `than the script (range [${short.healths[0]}, ${short.healths[short.healths.length - 1]}]). `
      + 'Measured on main: 13 of 20. This is the assertion feature-scale-discrimination.test.ts made against '
      + 'one hand-built permutation and could not have caught.',
    );
  });

  it('the committed act-swapped witness is an EXTREME draw, not a typical one — and that is stated, not hidden', async () => {
    // The review's sharpest point: the one permutation the suite used scored
    // lower than all twenty random ones, so a universal claim rested on the
    // most favourable possible sample. The file stays — it is readable, and a
    // deliberate act swap is a meaningful manipulation — but its standing is
    // recorded here rather than implied.
    const swapped = await runScriptDoctor(
      readFileSync(path.join(REPO_ROOT, 'tests/fixtures/feature-scale-discrimination/act-swapped.fountain'), 'utf8'),
    );
    const e = short ?? await ensembleFor('tests/fixtures/feature-scale-discrimination/intact.fountain', ORDER_ENSEMBLE_K);
    const rank = e.healths.filter((h) => h < swapped.health).length;
    console.log(`    act-swapped ${swapped.health.toFixed(1)} ranks ${rank} of ${ORDER_ENSEMBLE_K} random permutations from the bottom`);
    assert.ok(
      swapped.health < e.intact,
      `act-swapped ${swapped.health} must still score below intact ${e.intact}`,
    );
    assert.ok(
      rank <= 4,
      `act-swapped now scores above ${rank} of ${ORDER_ENSEMBLE_K} random permutations. It used to be an extreme `
      + 'low draw, which is what made it a misleading witness; if it has become typical, the ensemble floor '
      + 'above is the claim to read and this note needs rewriting.',
    );
  });

  it(`the 231-scene fixture: intact vs ${ORDER_ENSEMBLE_K} seeded permutations`, async () => {
    feature = await ensembleFor('tests/fixtures/feature-length/assembled-feature.fountain', ORDER_ENSEMBLE_K);
    console.log(report('231-scene', feature));
    assert.ok(
      feature.auc >= FEATURE_PERMUTATION_AUC_FLOOR,
      `permutation AUC ${feature.auc.toFixed(4)} is below the ${FEATURE_PERMUTATION_AUC_FLOOR} floor: `
      + `${feature.higher} of ${ORDER_ENSEMBLE_K} permutations beat the intact 231-scene document.`,
    );
  });

  it('WITNESS, STILL FAILING: reversing every scene of a 231-scene feature RAISES its health (finding 2)', async () => {
    // This is not a passing property. It is a defect, pinned so it cannot get
    // worse and asserted to still be present so it cannot be quietly declared
    // fixed. Both directions matter:
    //   * the delta must not GROW (the ceiling), and
    //   * it must still be POSITIVE, because the day it goes negative this test
    //     has to be rewritten as a real invariant rather than left passing on a
    //     stale ceiling.
    const e = feature ?? await ensembleFor('tests/fixtures/feature-length/assembled-feature.fountain', ORDER_ENSEMBLE_K);
    const delta = e.reversed - e.intact;
    assert.ok(
      delta <= FEATURE_REVERSAL_DELTA_CEILING,
      `reversing all ${e.sceneCount} scenes now raises health by ${delta.toFixed(1)} points, above the pinned `
      + `${FEATURE_REVERSAL_DELTA_CEILING}. Measured +5.0 on main (84.4 -> 89.4, CONSIDER -> RECOMMEND) and +4.7 here. `
      + 'The whole of it is arcIncoherenceDeduction: arcHealth is built from rampCorrelation and peakPosition, '
      + 'so reversing a document whose intensity falls can manufacture a rising ramp out of nothing.',
    );
    assert.ok(
      delta > 0,
      `reversing all ${e.sceneCount} scenes now moves health by ${delta.toFixed(1)}, which is no longer positive. `
      + 'Finding 2 may be fixed — if so, replace this witness with the real invariant (reversal must LOWER '
      + 'health) rather than leaving a ceiling that passes for the wrong reason.',
    );
  });

  it('the 21-scene reversal has the RIGHT sign, which is why the 231-scene one is a length defect', async () => {
    // Both directions, and the contrast is the finding. On a 21-scene coherent
    // draft reversal costs 12.4 points; on the 231-scene staple it GAINS 4.7.
    // Whatever the arc term is reading, it stops working somewhere between the
    // two, and saying that is more useful than reporting either number alone.
    const e = short ?? await ensembleFor('tests/fixtures/feature-scale-discrimination/intact.fountain', ORDER_ENSEMBLE_K);
    assert.ok(
      e.reversed < e.intact,
      `reversing the 21-scene fixture moved health ${e.intact} -> ${e.reversed}. It should LOWER it; measured -12.4.`,
    );
  });
});
