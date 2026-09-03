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
// committed fixtures (deterministic — no LLM, no clock, no randomness), and
// RE-MEASURED on 2026-09-03 after lane R5 changed the health formula's density
// denominator (docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md):
//
//                              health    with the term    with the term
//                                          LIVE             FORCED TO 0
//   intact.fountain                          29.7              29.7
//   act-swapped.fountain                     21.2              25.1
//     -> act-swap delta                       8.5               4.6
//   dialogue-flattened.fountain              17.7              35.7
//     -> flatten delta                       12.0              -6.0
//
//   (pre-lane-R5, for the record: 79.7 / 70.0 / 51.0 live, deltas 9.7 and
//    28.7, ablated 5.8 and 10.7.)
//
// The act-swap delta is arc-attributable EXACTLY: intact and act-swapped have
// byte-identical dialogue, so dialogueDeduction is 0 on both, and the whole
// 8.5 - 4.6 = 3.9 difference is the measured arcIncoherenceDeduction on the
// swapped file. The gates below sit between the live and ablated columns: 8.0
// for the act-swap (live 8.5, ablated 4.6 — UNCHANGED by lane R5) and 8.0 for
// the flatten (live 12.0, ablated -6.0 — LOWERED from 20.0). Either term being
// deleted, zeroed, or silently gated out of reach fails a named assertion here
// instead of passing 11,000 tests.
//
// WHY THE FLATTEN GATE MOVED, and why the test is stronger for it: the old
// 20.0 gate was reachable only because the flatten delta had TWO contributors —
// the dedicated deduction (~18) plus ~10.7 from the density channel reacting to
// the words the flattening deleted. That second contributor is the one this
// file's own header calls a chance-level signal (P1 baseline AUC 0.54), and
// lane R5 removed it: the density term no longer reads word count, so the
// flattened fixture now scores 6.0 points HIGHER than intact with the deduction
// ablated (it carries slightly fewer weighted findings). The gate therefore
// separates "deduction alive" from "deduction dead" cleanly for the first time
// — the ablated side is now negative rather than 10.7 short of the gate.
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
      `points (${intact.health} -> ${swapped.health}); the gate is 8.0. Measured 8.5 with ` +
      "doctor.ts's arcIncoherenceDeduction live and 4.6 with it forced to zero, so a value " +
      'under 8.0 means that term has been removed, zeroed, or gated out of reach of a ' +
      '21-scene script. Nothing else in the suite notices when that happens — that is why ' +
      'this assertion exists. See the header for the full before/after table.',
    );
    assert.ok(
      swapped.health < intact.health,
      'a scrambled act order must never score HIGHER than the draft it was cut from',
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
      delta >= 8.0,
      `flattening all dialogue moved health by only ${delta.toFixed(1)} points ` +
      `(${intact.health} -> ${flattened.health}); the gate is 8.0. Measured 12.0 with ` +
      "doctor.ts's dialogueDeduction live and -6.0 with it forced to zero, so the whole " +
      'delta is now the deduction: since lane R5 the density term no longer reads word ' +
      'count, so deleting dialogue no longer moves it (the old formula contributed ~10.7 ' +
      'of the delta through that channel, which the P1 baseline measured at AUC 0.54 — ' +
      'chance — and is exactly why the dedicated deduction exists). See the header.',
    );
    // Both scripts analyse cleanly at 21 scenes, so both must carry a verdict;
    // an undefined one means the doctor withheld its judgement and the tier
    // comparison below would be meaningless rather than false.
    assert.ok(
      intact.verdict !== undefined && flattened.verdict !== undefined,
      `both fixtures must produce a verdict (intact ${String(intact.verdict)}, ` +
      `flattened ${String(flattened.verdict)})`,
    );
    // SUSPENDED, NOT DELETED — OWNER RE-DERIVATION REQUIRED (lane R5, 2026-09-03).
    // This used to assert a strict tier DROP (intact CONSIDER 79.7, flattened
    // PASS 51.0). It cannot hold today, and not because the deduction stopped
    // working: the health delta above is still 14.0 points and still entirely
    // deduction-attributable. What changed is the absolute scale. verdictFor's
    // boundaries (RECOMMEND >= 85, PASS < 60, doctor.ts) were anchored against
    // the OLD word-normalized distribution, in which produced features scored
    // 97-98 (tests/fixtures/real-corpus-manifest.json). Under the scene-
    // opportunity denominator these two fixtures score 29.7 and 17.7, so both
    // land in the bottom tier and no boundary falls between them.
    //
    // Re-anchoring 85/60 is NOT an in-repo decision — the tiers describe where
    // real produced writing sits, and that measurement needs the corpus this
    // repository deliberately does not carry. It is item 4 on the owner
    // checklist in docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md; when the
    // manifest is re-locked and the boundaries re-derived, restore the strict
    // form below. Until then this asserts the half that is still meaningful and
    // still catches a dead deduction via the delta gate above.
    assert.ok(
      VERDICT_RANK[flattened.verdict] <= VERDICT_RANK[intact.verdict],
      `a draft whose dialogue has collapsed to one repeated word must never hold a BETTER ` +
      `verdict tier than the draft it came from (intact ${intact.verdict}, ` +
      `flattened ${flattened.verdict}).`,
    );
  });
});
