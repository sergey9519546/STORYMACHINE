// Feature-scale discrimination — the guard for the two health deductions the
// suite was structurally blind to.
//
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
// doctor.ts sums four things into `health`:
//
//     health = baseHealth
//            - structuralDeduction
//            - arcIncoherenceDeduction     <-- gated to sceneCount >= 15
//            - dialogueDeduction           <-- gated to >= 10 dialogue lines
//
// An audit forced BOTH of the last two terms to zero and ran everything the
// repository owns. Result: 10,863 tests, 0 failures, and `npm run
// test:metamorphic` green. Reproduced here before this file was written —
// ABLATE both terms, `npm test` still exits 0 with the identical
// 10863/0-fail/85-skip line.
//
// The cause was not subtle. `ARC_DED_MIN_SCENES = 15` and EVERY committed
// script in the repository sat below it: `data/screenplays/*.fountain` run
// 9-14 scenes, the calibration corpus is 10 scenes per sample, and the
// discrimination fixtures are smaller still. The arc term could not fire on
// any input the suite owned, so deleting it was free. The dialogue term could
// fire, but no committed fixture PAIR differed in dialogue diversity, so
// nothing compared a healthy draft to a flattened one.
//
// So this file tests the one thing the rest of the suite structurally cannot:
// that the two order/dialogue-sensitive deductions actually MOVE THE SCORE, on
// committed input that clears their gates.
//
// ── HOW THE THRESHOLDS WERE CHOSEN ──────────────────────────────────────────
// Every number below is a measured before/after, not a guess. Measured on the
// committed fixtures (deterministic — no LLM, no clock, no randomness):
//
//                              health    with the term    with the term
//                                          LIVE             FORCED TO 0
//   intact.fountain                          79.7              79.7
//   act-swapped.fountain                     70.0              73.9
//     -> act-swap delta                       9.7               5.8
//   dialogue-flattened.fountain              51.0              69.0
//     -> flatten delta                       28.7              10.7
//
// The act-swap delta is arc-attributable EXACTLY: intact and act-swapped have
// byte-identical dialogue, so dialogueDeduction is 0 on both, and 70.0 + 3.92
// (the measured arcIncoherenceDeduction on the swapped file) = 73.92 = the
// ablated score. The gates below sit between the live and ablated columns:
// 8.0 for the act-swap (live 9.7, ablated 5.8) and 20.0 for the flatten (live
// 28.7, ablated 10.7). Either term being deleted, zeroed, or silently gated
// out of reach fails a named assertion here instead of passing 10,863 tests.
//
// ── WHAT THIS FILE DOES NOT CLAIM ───────────────────────────────────────────
// These are SYNTHETIC fixtures. They prove the deductions are wired up and
// directionally alive; they are not evidence that the score is valid on real
// writing. That claim belongs to the P1 benchmark and the env-gated
// `real-script-corpus.test.ts` AUC ratchet, and nothing here substitutes for
// it. See tests/fixtures/feature-scale-discrimination/README.md.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor, computeDialogueDiversity } from '../../server/nvm/analyze/doctor.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { computeEmotionalArc, scenesFromFountain } from '../../server/nvm/analyze/emotional-arc.ts';
import type { CoverageVerdict } from '../../server/nvm/analyze/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, '../fixtures/feature-scale-discrimination');

const read = (name: string): string =>
  readFileSync(path.join(FIXTURE_DIR, `${name}.fountain`), 'utf8');

const INTACT = read('intact');
const ACT_SWAPPED = read('act-swapped');
const DIALOGUE_FLATTENED = read('dialogue-flattened');

/** doctor.ts's gate, mirrored here deliberately. If someone raises
 *  ARC_DED_MIN_SCENES above the fixture's scene count, the fixture stops
 *  reaching the term and this file goes quietly blind again — exactly the
 *  failure it exists to prevent. The guard test below makes that loud. */
const ARC_DED_MIN_SCENES = 15;
/** doctor.ts's ARC_DED_REF — arcHealth below this means the term fires. */
const ARC_DED_REF = 1.2;
/** doctor.ts's DIALOGUE_DED_MIN_LINES. */
const DIALOGUE_DED_MIN_LINES = 10;

const VERDICT_RANK: Record<CoverageVerdict, number> = { PASS: 0, CONSIDER: 1, RECOMMEND: 2 };

/** Grade order, lowest first — the tier that still separates the flattened
 *  fixture from its source after the 2026-09-07 density recalibration. Same
 *  shape as VERDICT_RANK above; see that constant's own use for why a rank
 *  map rather than a string compare. */
const GRADE_RANK: Record<string, number> = {
  troubled: 0, uneven: 1, solid: 2, strong: 3, excellent: 4,
};

/** Ordered scene bodies, slug included, for the permutation invariant. */
function sceneBlocks(fountain: string): string[] {
  return scenesFromFountain(fountain).map(s => s.trim()).filter(Boolean);
}

describe('Feature-scale discrimination — fixture invariants', () => {
  it('the intact fixture clears the arc deduction gate that every other committed script sits below', () => {
    const { sceneCount } = analyzeFountainText(INTACT);
    assert.ok(
      sceneCount >= ARC_DED_MIN_SCENES,
      `intact.fountain has ${sceneCount} scenes, below doctor.ts's ARC_DED_MIN_SCENES ` +
      `of ${ARC_DED_MIN_SCENES}. Every assertion in this file about arcIncoherenceDeduction ` +
      'is then vacuous — the term cannot fire — which is precisely the blindness this ' +
      'file was written to close. Grow the fixture, do not lower this guard.',
    );
    assert.equal(analyzeFountainText(ACT_SWAPPED).sceneCount, sceneCount);
    assert.equal(analyzeFountainText(DIALOGUE_FLATTENED).sceneCount, sceneCount);
  });

  it('act-swapped.fountain is a pure PERMUTATION of intact.fountain — nothing else changed', () => {
    const intactScenes = sceneBlocks(INTACT);
    const swappedScenes = sceneBlocks(ACT_SWAPPED);

    assert.equal(swappedScenes.length, intactScenes.length, 'scene count must be identical');
    assert.deepEqual(
      [...swappedScenes].sort(),
      [...intactScenes].sort(),
      'act-swapped.fountain must contain exactly the same scene bodies as intact.fountain. ' +
      'If this fails the pair has drifted into some OTHER degradation, and every health ' +
      'delta below stops being attributable to narrative order.',
    );
    assert.notDeepEqual(
      swappedScenes, intactScenes,
      'act-swapped.fountain must not be in the same ORDER as intact.fountain',
    );

    // The invariant that makes the comparison a controlled experiment: same
    // scenes, same words, therefore identical scarcity/density input.
    const a = analyzeFountainText(INTACT);
    const b = analyzeFountainText(ACT_SWAPPED);
    assert.equal(b.wordCount, a.wordCount, 'word count must be held constant across the permutation');
  });

  it('dialogue-flattened.fountain keeps the scene order and collapses only the dialogue', () => {
    const intactScenes = sceneBlocks(INTACT);
    const flatScenes = sceneBlocks(DIALOGUE_FLATTENED);
    assert.equal(flatScenes.length, intactScenes.length);
    // Same slugs, in the same order — the degradation is inside the scenes.
    assert.deepEqual(
      flatScenes.map(s => s.split('\n')[0]),
      intactScenes.map(s => s.split('\n')[0]),
      'flattening must not reorder or rename scenes',
    );

    const intactDialogue = computeDialogueDiversity(analyzeFountainText(INTACT).records);
    const flatDialogue = computeDialogueDiversity(analyzeFountainText(DIALOGUE_FLATTENED).records);

    assert.ok(
      intactDialogue.totalLines >= DIALOGUE_DED_MIN_LINES,
      `intact.fountain yields ${intactDialogue.totalLines} dialogue highlights, below ` +
      `doctor.ts's DIALOGUE_DED_MIN_LINES of ${DIALOGUE_DED_MIN_LINES}: the dialogue ` +
      'deduction cannot fire and the flatten assertions below are vacuous.',
    );
    assert.equal(flatDialogue.totalLines, intactDialogue.totalLines,
      'flattening must not change how many dialogue lines exist, only what is in them');
    assert.ok(intactDialogue.uniqueRatio > 0.9, `intact uniqueRatio ${intactDialogue.uniqueRatio}`);
    assert.ok(flatDialogue.uniqueRatio < 0.1, `flattened uniqueRatio ${flatDialogue.uniqueRatio}`);
    assert.ok(intactDialogue.meanWords > 5, `intact meanWords ${intactDialogue.meanWords}`);
    assert.ok(flatDialogue.meanWords < 2, `flattened meanWords ${flatDialogue.meanWords}`);
  });
});

describe('Feature-scale discrimination — arcIncoherenceDeduction moves health', () => {
  it('the arc signal itself separates intact from act-swapped, and only the swapped side crosses the deduction threshold', () => {
    const intactArc = computeEmotionalArc(scenesFromFountain(INTACT));
    const swappedArc = computeEmotionalArc(scenesFromFountain(ACT_SWAPPED));

    assert.ok(intactArc.scored && swappedArc.scored, 'both fixtures must produce a scored arc');

    // Direction, not type. A rising-then-resolving draft correlates with the
    // ramp; the same scenes in the order III-I-II anti-correlate with it.
    assert.ok(
      intactArc.rampCorrelation > 0.4,
      `intact rampCorrelation ${intactArc.rampCorrelation.toFixed(3)} should be strongly positive (measured +0.685)`,
    );
    assert.ok(
      swappedArc.rampCorrelation < -0.15,
      `act-swapped rampCorrelation ${swappedArc.rampCorrelation.toFixed(3)} should be negative (measured -0.412)`,
    );
    assert.ok(
      intactArc.peakPosition > swappedArc.peakPosition,
      `the climax should sit later in the intact cut (intact ${intactArc.peakPosition.toFixed(3)}, ` +
      `swapped ${swappedArc.peakPosition.toFixed(3)})`,
    );

    // The gate itself: intact is above ARC_DED_REF (term contributes nothing),
    // act-swapped is below it (term fires). Measured 2.949 vs 0.709.
    assert.ok(
      intactArc.arcHealth >= ARC_DED_REF,
      `intact arcHealth ${intactArc.arcHealth.toFixed(3)} must sit at or above ARC_DED_REF ` +
      `${ARC_DED_REF}, so the intact side of every delta below carries a zero arc deduction`,
    );
    assert.ok(
      swappedArc.arcHealth < ARC_DED_REF,
      `act-swapped arcHealth ${swappedArc.arcHealth.toFixed(3)} must fall below ARC_DED_REF ` +
      `${ARC_DED_REF}, otherwise the deduction never fires and the health delta below ` +
      'is measuring something else',
    );
  });

  it('act-swapping a feature-scale script LOWERS health — the deduction cannot be deleted for free', async () => {
    const intact = await runScriptDoctor(INTACT);
    const swapped = await runScriptDoctor(ACT_SWAPPED);

    // Controlled experiment: identical scene count and word count, so scarcity
    // and density are constant, and identical dialogue, so dialogueDeduction is
    // 0 on both sides. Whatever separates them is order-sensitive.
    assert.equal(swapped.sceneCount, intact.sceneCount);

    const delta = intact.health - swapped.health;
    assert.ok(
      delta >= 8.0,
      `act-swapping a ${intact.sceneCount}-scene script moved health by only ${delta.toFixed(1)} ` +
      `points (${intact.health} -> ${swapped.health}); the gate is 8.0. Measured 9.7 with ` +
      "doctor.ts's arcIncoherenceDeduction live and 5.8 with it forced to zero, so a value " +
      'under 8.0 means that term has been removed, zeroed, or gated out of reach of a ' +
      '21-scene script. Nothing else in the suite notices when that happens — that is why ' +
      'this assertion exists. See the header for the full before/after table.',
    );
    // ── WHAT THIS ASSERTION IS, AND WHAT IT IS NOT (corrected 2026-09-12) ──
    // It used to read: "a scrambled act order must never score HIGHER than the
    // draft it was cut from", checked against this ONE committed permutation.
    // The universal claim is false. The 2026-09-12 adversarial review ran 20
    // seeded permutations of the SAME 21 scene bodies and found 13 of them
    // scoring higher than the intact draft on `main`; on this branch it is
    // still 5 of 20 (permutation AUC 0.7500). `act-swapped.fountain` scores
    // BELOW all twenty — it is an extreme-value draw from a distribution with
    // 13.3 points of spread, and a universal statement was resting on the most
    // favourable possible sample.
    //
    // So the sentence below now says only what it checks: this particular,
    // deliberately act-swapped arrangement scores lower. The general claim,
    // stated as a statistic over an ensemble with its floor and the whole
    // distribution printed, lives in tests/core/order-ensemble.test.ts — which
    // also records that the committed witness is an extreme draw, so the two
    // files cannot drift back into agreeing on something untrue.
    assert.ok(
      swapped.health < intact.health,
      `this specific act-swapped arrangement (${swapped.health}) must score below the intact draft `
      + `(${intact.health}). This is NOT the general claim "a scrambled order never scores higher" — that is `
      + 'false for 5 of 20 seeded permutations of this same fixture. See tests/core/order-ensemble.test.ts '
      + 'for the ensemble statistic and its floor.',
    );
  });
});

describe('Feature-scale discrimination — dialogueDeduction moves health', () => {
  it('flattening every line of dialogue LOWERS health and the verdict tier', async () => {
    const intact = await runScriptDoctor(INTACT);
    const flattened = await runScriptDoctor(DIALOGUE_FLATTENED);

    assert.equal(flattened.sceneCount, intact.sceneCount, 'flattening must not change scene count');

    const delta = intact.health - flattened.health;
    assert.ok(
      delta >= 20.0,
      `flattening all dialogue moved health by only ${delta.toFixed(1)} points ` +
      `(${intact.health} -> ${flattened.health}); the gate is 20.0. Measured 28.7 with ` +
      "doctor.ts's dialogueDeduction live and 10.7 with it forced to zero — the ~10.7 " +
      'residual is the density channel reacting to the lost words, which the P1 baseline ' +
      'measured at AUC 0.54 (chance) and is exactly why the dedicated deduction exists.',
    );
    // Both scripts analyse cleanly at 21 scenes, so both must carry a verdict;
    // an undefined one means the doctor withheld its judgement and the tier
    // comparison below would be meaningless rather than false.
    assert.ok(
      intact.verdict !== undefined && flattened.verdict !== undefined,
      `both fixtures must produce a verdict (intact ${String(intact.verdict)}, ` +
      `flattened ${String(flattened.verdict)})`,
    );
    // The GRADE tier still separates. Asserted here, and labelled honestly
    // (round 2, item 9a): this is the THINNER of the two tier checks in this
    // file, not an equal partner to the verdict-tier one below. The grade
    // boundary it crosses is 75, and with the 20.0-point delta gate two lines
    // up enforced, any intact score below 95 makes a grade drop arithmetically
    // implied — so on these fixtures it adds little beyond the gate. It is kept
    // because the two checks read DIFFERENT thresholds (grade 75, verdict 60)
    // and a future fixture could cross one without the other, not because it is
    // strong evidence on its own. Measured on this tree: intact 79 `strong`,
    // flattened 58.2 `solid`.
    assert.ok(
      GRADE_RANK[flattened.grade] < GRADE_RANK[intact.grade],
      `a draft whose dialogue has collapsed to one repeated word must not hold the same ` +
      `GRADE as the draft it came from (intact ${intact.health} ${intact.grade}, ` +
      `flattened ${flattened.health} ${flattened.grade})`,
    );
  });

  // RE-OPENED as `todo` 2026-09-07 and CLOSED AGAIN 2026-09-11 (round 2), on
  // its own merits and not by moving anything.
  //
  // The history, because a re-opened-then-closed assertion is worth less than
  // the record of why. Round 1 of this branch recalibrated the sub-1 density
  // curve, which lifted short-and-mid-length scripts generally, and this
  // 21-scene fixture crossed back over the PASS line: intact 81.4 CONSIDER,
  // flattened 60.5 CONSIDER — a 20.9-point drop that landed 0.5 points ABOVE
  // health 60. The delta gate and the grade drop still passed, so the honest
  // move was a `todo` carrying the number rather than a deleted assertion, a
  // widened gate, or a moved PASS line. The comment said what would close it:
  // "the flattened fixture scoring below 60 again on its own merits".
  //
  // That is what happened. Round 2 moved the scarcity saturation point from 15
  // scenes to 12 and fixed three false suppressions in the clue guard, and the
  // fixture now measures intact 79 CONSIDER / flattened 58.2 PASS — a
  // 20.8-point drop that crosses the line by 1.8. Neither change was made for
  // this assertion and neither threshold moved: health 60 is still the PASS
  // ceiling and the delta gate is still 20.0. Re-measure before touching it.
  it(
    'flattening every line of dialogue drops the VERDICT tier too',
    async () => {
      const intact = await runScriptDoctor(INTACT);
      const flattened = await runScriptDoctor(DIALOGUE_FLATTENED);
      assert.ok(
        intact.verdict !== undefined && flattened.verdict !== undefined,
        `both fixtures must produce a verdict (intact ${String(intact.verdict)}, `
        + `flattened ${String(flattened.verdict)})`,
      );
      assert.ok(
        VERDICT_RANK[flattened.verdict] < VERDICT_RANK[intact.verdict],
        `a draft whose dialogue has collapsed to one repeated word must not hold the same `
        + `verdict tier as the draft it came from (intact ${intact.verdict}, `
        + `flattened ${flattened.verdict})`,
      );
    },
  );
});
