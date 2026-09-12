// The shared AUC machinery (scripts/lib/auc.ts) — known answers, and proof
// that extracting it changed nothing.
//
// WHY: the AUC-24 ratchet used to be an inline loop inside
// tests/core/real-script-corpus.test.ts, a file that SKIPS on every CI run
// (REAL_SCRIPT_CORPUS_DIR is local-only, copyright). So the statistic's own
// arithmetic had never been tested anywhere — a sign error in that loop would
// have been invisible in CI and, on a machine with the corpus, would have
// shown up only as a suspicious AUC number nobody could distinguish from a
// real regression. This file tests the arithmetic itself, with no corpus.
//
// The identity test below is the load-bearing one: it keeps a VERBATIM copy
// of the pre-extraction inline implementation and asserts the extracted
// function agrees with it exactly on random inputs, including the tie-heavy
// inputs the real corpus actually produces (health values are rounded to one
// decimal, so ties are common, and ties are the half-credit term).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUC24_DEGRADATION,
  AUC24_DEGRADATION_ID,
  AUC24_FLOOR,
  AUC24_SUBSET,
  assertDegradationChangedText,
  assertFinalSceneIsFirst,
  aucFromTable,
  computeAuc,
  degradationSeed,
  shuffleDropDegrade,
} from '../../scripts/lib/auc.ts';
import { countFountainScenes, segmentFountainScenes } from '../../scripts/lib/scene-segments.ts';
import { makePrng, seedFromString, shuffle } from '../../server/nvm/repro/seed.ts';

/**
 * The implementation as it stood inline in
 * tests/core/real-script-corpus.test.ts before the extraction, copied
 * character-for-character from the `measure()` helper's last four lines:
 *
 *     let wins = 0, ties = 0;
 *     for (const g of goods) for (const b of bads) { if (g > b) wins++; else if (g === b) ties++; }
 *     return { auc: (wins + ties / 2) / (goods.length * bads.length), goods, bads };
 *
 * This is the oracle. It exists to be compared against, never to be improved.
 */
function inlineAucOracle(goods: number[], bads: number[]): number {
  let wins = 0, ties = 0;
  for (const g of goods) for (const b of bads) { if (g > b) wins++; else if (g === b) ties++; }
  return (wins + ties / 2) / (goods.length * bads.length);
}

describe('computeAuc — known answers', () => {
  it('perfect separation is 1.0', () => {
    assert.equal(computeAuc([90, 91, 92], [10, 11, 12]), 1);
  });

  it('perfect inversion is 0.0', () => {
    assert.equal(computeAuc([10, 11, 12], [90, 91, 92]), 0);
  });

  it('identical arrays are 0.5 — every pair is a tie, worth half each', () => {
    assert.equal(computeAuc([5, 5, 5], [5, 5, 5]), 0.5);
    assert.equal(computeAuc([1, 2, 3], [1, 2, 3]), 0.5);
  });

  it('ties count as half, not as wins and not as losses', () => {
    // 1 good vs 2 bads: one strict win, one tie -> (1 + 0.5) / 2.
    assert.equal(computeAuc([5], [4, 5]), 0.75);
    // The same grid with the tie replaced by a loss, to show the tie term is
    // what moves it: (1 + 0) / 2.
    assert.equal(computeAuc([5], [4, 6]), 0.5);
  });

  it('a single tied pair is exactly 0.5 (the smallest possible grid)', () => {
    assert.equal(computeAuc([7], [7]), 0.5);
  });

  it('unequal band sizes divide by the full grid, not by the larger band', () => {
    // 2 goods x 5 bads = 10 pairs; goods beat 3 of the 5 bads each -> 6/10.
    assert.equal(computeAuc([4, 4], [1, 2, 3, 5, 6]), 0.6);
  });

  it('rejects an empty band instead of returning NaN', () => {
    // 0/0 is NaN, and NaN >= floor is false — so an empty band would have read
    // as a REGRESSION rather than as the broken input it is. Fail loudly.
    assert.throws(() => computeAuc([], [1]), /non-empty/);
    assert.throws(() => computeAuc([1], []), /non-empty/);
  });

  it('is invariant under a shared monotonic rescale of both bands', () => {
    const goods = [88.9, 92.2, 97.5, 98.1];
    const bads = [80.1, 92.2, 71.4, 99.0];
    const scale = (xs: number[]) => xs.map((x) => x * 3 - 17);
    assert.equal(computeAuc(scale(goods), scale(bads)), computeAuc(goods, bads));
  });
});

describe('computeAuc — byte-identical to the pre-extraction inline implementation', () => {
  it('agrees with the inline oracle on 400 random tie-heavy grids', () => {
    // Seeded, so a failure is reproducible. The value grid is deliberately
    // coarse (one decimal, narrow range) because that is the shape of real
    // corpus health values — 88.9, 92.2, 97.5 — where ties are frequent and
    // the half-credit term actually decides the number.
    const rng = makePrng(20260903);
    for (let trial = 0; trial < 400; trial++) {
      const nGood = 1 + Math.floor(rng() * 12);
      const nBad = 1 + Math.floor(rng() * 12);
      const value = () => Math.round((70 + rng() * 30) * 10) / 10;
      const goods = Array.from({ length: nGood }, value);
      const bads = Array.from({ length: nBad }, value);
      assert.equal(
        computeAuc(goods, bads),
        inlineAucOracle(goods, bads),
        `extracted computeAuc diverged from the inline oracle on trial ${trial}: `
        + `goods=${JSON.stringify(goods)} bads=${JSON.stringify(bads)}`,
      );
    }
  });

  it('agrees with the inline oracle on all-ties and all-wins extremes', () => {
    const flat = [5, 5, 5, 5];
    assert.equal(computeAuc(flat, flat), inlineAucOracle(flat, flat));
    assert.equal(computeAuc([9, 9], [1, 1]), inlineAucOracle([9, 9], [1, 1]));
    assert.equal(computeAuc([1, 1], [9, 9]), inlineAucOracle([1, 1], [9, 9]));
  });
});

describe('shuffleDropDegrade — byte-identical to the pre-extraction inline recipe ON INT./EXT.-ONLY SCRIPTS', () => {
  // SCOPE NARROWED, DELIBERATELY, 2026-09-12. This block's oracle IS the old
  // INT./EXT.-only split. The recipe's segmentation changed that day to the
  // doctor's own heading grammar (adversarial review finding 12:
  // `EST.`, `I/E.`, `INT./EXT.` and forced `.HEADING` lines were invisible, and
  // on a mixed-heading script the degradation was a NO-OP). So the oracle and
  // the recipe still agree on every script whose headings are plain
  // `INT.`/`EXT.` at column 0 — which is all 300 random scripts below, all 32
  // committed public-benchmark scripts, and the corpus this oracle was written
  // for — and they must NOT agree on a script using any other heading form.
  // Both directions are asserted: the agreement below, and the disagreement in
  // the next describe block. Keeping only the first would quietly re-narrow the
  // recipe to the old grammar.
  /**
   * The recipe as it stood inline in tests/core/real-script-corpus.test.ts's
   * `measure()` helper before the extraction, copied character-for-character:
   *
   *     const parts = t.split(/^(?=INT\.|EXT\.)/mi);
   *     const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
   *     const scenes = parts.filter(x => /^(INT\.|EXT\.)/i.test(x));
   *     const rng = makePrng(seedFromString(`degrade:${f}`));
   *     const degraded = head + shuffle(rng, scenes).filter((_, i) => i % 3 !== 2).join('');
   *
   * The oracle. If this and the extracted function ever disagree, the
   * committed table and the corpus-gated run are measuring different things.
   */
  function inlineRecipeOracle(t: string, f: string): string {
    const parts = t.split(/^(?=INT\.|EXT\.)/mi);
    const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
    const scenes = parts.filter((x) => /^(INT\.|EXT\.)/i.test(x));
    const rng = makePrng(seedFromString(`degrade:${f}`));
    return head + shuffle(rng, scenes).filter((_, i) => i % 3 !== 2).join('');
  }

  it('agrees with the inline oracle on 300 random scripts (with and without a head)', () => {
    const rng = makePrng(7);
    for (let trial = 0; trial < 300; trial++) {
      const sceneCount = 1 + Math.floor(rng() * 30);
      let text = rng() < 0.5 ? 'Title: X\n\n' : '';
      for (let i = 0; i < sceneCount; i++) {
        text += `${rng() < 0.5 ? 'INT' : 'EXT'}. PLACE ${i} - ${rng() < 0.5 ? 'DAY' : 'NIGHT'}\n\nline ${i}\n\n`;
      }
      const key = `f${trial}.fountain.txt`;
      assert.equal(
        shuffleDropDegrade(text, key),
        inlineRecipeOracle(text, key),
        `extracted shuffleDropDegrade diverged from the inline oracle on trial ${trial} (${sceneCount} scenes)`,
      );
    }
  });
});

describe('aucFromTable', () => {
  it('reads the two bands out of committed rows and returns the same statistic', () => {
    const rows = [
      { manifestIndex: 0, contentHash: 'a'.repeat(64), seed: 1, intactHealth: 97.5, degradedHealth: 90.1 },
      { manifestIndex: 1, contentHash: 'b'.repeat(64), seed: 2, intactHealth: 98.1, degradedHealth: 91.0 },
      { manifestIndex: 2, contentHash: 'c'.repeat(64), seed: 3, intactHealth: 92.2, degradedHealth: 99.9 },
    ];
    assert.equal(
      aucFromTable(rows),
      computeAuc([97.5, 98.1, 92.2], [90.1, 91.0, 99.9]),
    );
  });
});

describe('shuffleDropDegrade — the recipe as a pure function', () => {
  const script = [
    'Title: Something\n\n',
    'INT. KITCHEN - DAY\n\nA.\n\n',
    'EXT. STREET - NIGHT\n\nB.\n\n',
    'INT. CAR - DAY\n\nC.\n\n',
    'EXT. ROOF - NIGHT\n\nD.\n\n',
    'INT. BAR - DAY\n\nE.\n\n',
    'EXT. PIER - DAY\n\nF.\n\n',
  ].join('');

  it('is deterministic for a given seed key', () => {
    assert.equal(shuffleDropDegrade(script, 'x.fountain.txt'), shuffleDropDegrade(script, 'x.fountain.txt'));
  });

  it('a different seed key gives a different order (the seed is load-bearing)', () => {
    const a = shuffleDropDegrade(script, 'x.fountain.txt');
    const b = shuffleDropDegrade(script, 'y.fountain.txt');
    assert.notEqual(a, b, 'both keys produced the same output — the seed template is not being applied');
  });

  it('drops exactly every third scene of the shuffled order', () => {
    const out = shuffleDropDegrade(script, 'x.fountain.txt');
    const kept = out.split(/^(?=INT\.|EXT\.)/mi).filter((p) => /^(INT\.|EXT\.)/i.test(p));
    // 6 scenes in, indices 2 and 5 of the shuffled order dropped -> 4 kept.
    assert.equal(kept.length, 4);
  });

  it('preserves the pre-slugline head verbatim at the top', () => {
    assert.ok(shuffleDropDegrade(script, 'x.fountain.txt').startsWith('Title: Something\n\n'));
  });

  it('keeps every surviving scene byte-identical — only ORDER and DENSITY change', () => {
    // This is what makes the degradation a fair paired test: surface craft
    // (prose, dialogue, action) is untouched, so a health drop can only come
    // from structure.
    const out = shuffleDropDegrade(script, 'x.fountain.txt');
    const original = script.split(/^(?=INT\.|EXT\.)/mi).filter((p) => /^(INT\.|EXT\.)/i.test(p));
    for (const kept of out.split(/^(?=INT\.|EXT\.)/mi).filter((p) => /^(INT\.|EXT\.)/i.test(p))) {
      assert.ok(original.includes(kept), `degraded output contains a scene that is not in the source: ${JSON.stringify(kept)}`);
    }
  });

  it('a script with no sluglines survives the recipe without throwing', () => {
    // The recipe stays TOTAL: a no-heading script comes back unchanged rather
    // than throwing. That return value is a no-op, and a no-op IS an error — but
    // it is the MEASUREMENT's error to raise, not the recipe's, because the
    // recipe has to stay a pure total function for the oracle above to mean
    // anything. assertDegradationChangedText is what turns this into a failure
    // at every call site that counts an observation; see the block below.
    assert.equal(shuffleDropDegrade('just prose, no scene headings\n', 'k'), 'just prose, no scene headings\n');
  });

  it('records the seed it used, so the committed table can be re-derived', () => {
    assert.equal(typeof degradationSeed('x.fountain.txt'), 'number');
    assert.equal(degradationSeed('x.fountain.txt'), degradationSeed('x.fountain.txt'));
    assert.notEqual(degradationSeed('x.fountain.txt'), degradationSeed('y.fountain.txt'));
  });
});

describe('AUC-24 constants', () => {
  it('the subset size and the degradation descriptor agree', () => {
    assert.equal(AUC24_DEGRADATION.subsetSize, AUC24_SUBSET);
    assert.equal(AUC24_DEGRADATION.id, AUC24_DEGRADATION_ID);
  });

  it('the floor is a probability strictly between chance and certainty', () => {
    // A floor at or below 0.5 would assert nothing (0.5 is a coin flip); a
    // floor of 1.0 could never hold. Both are ways a ratchet quietly dies.
    assert.ok(AUC24_FLOOR > 0.5 && AUC24_FLOOR < 1, `AUC24_FLOOR ${AUC24_FLOOR} is not a meaningful ratchet`);
  });
});

// ── The segmenter change, and the guards that make a no-op an error ────────
// docs/audits/2026-09-12-adversarial/engine-logic.md finding 12. Two separate
// defects, two separate blocks, each shown to FAIL on the unfixed input first.
describe('shuffleDropDegrade — the segmentation change is real, not cosmetic', () => {
  /**
   * Five scenes, none of whose headings the old INT./EXT.-only split could see
   * AT ALL: `EST.`, `I/E.` and a forced `.HEADING`. The doctor reads all five.
   *
   * `INT./EXT.` is deliberately absent: it begins with the literal `INT.`, so the
   * old split DID see it — as a scene boundary in the wrong place, merging
   * whatever preceded it into the head. That is mis-segmentation, a different and
   * quieter failure than blindness, and mixing the two into one fixture would
   * make this block's no-op claim depend on which one happened to dominate.
   * The full heading grammar is covered in tests/core/scene-segments.test.ts.
   */
  const MIXED = [
    'Title: Mixed\n\n',
    'EST. THE TOWN - DAWN\n\nRooftops.\n\n',
    'I/E. TRUCK - CONTINUOUS\n\nShe drives.\n\n',
    'EST. THE HARBOUR - DUSK\n\nCranes.\n\n',
    '.THE LONG WAY ROUND\n\nA forced heading, no INT or EXT in it.\n\n',
    'I/E. FERRY - NIGHT\n\nSpray across the rail.\n\n',
  ].join('');

  /** The pre-2026-09-12 recipe, verbatim. */
  function oldRecipe(t: string, f: string): string {
    const parts = t.split(/^(?=INT\.|EXT\.)/mi);
    const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
    const scenes = parts.filter((x) => /^(INT\.|EXT\.)/i.test(x));
    const rng = makePrng(seedFromString(`degrade:${f}`));
    return head + shuffle(rng, scenes).filter((_, i) => i % 3 !== 2).join('');
  }

  it('THE OLD RECIPE WAS A NO-OP on a mixed-heading script — reproduced here', () => {
    // The bug, before the fix. One `EXT.` heading, so the old split saw a single
    // scene, kept it (index 0 survives `% 3 !== 2`), and returned its input.
    // Every such script in the real AUC-24 corpus contributed an exact tie.
    assert.equal(
      oldRecipe(MIXED, 'mixed.fountain'),
      MIXED,
      'the old split no longer no-ops here, so this block no longer reproduces the defect it guards',
    );
    // And it saw no scenes at all, which is the mechanism.
    assert.equal(MIXED.split(/^(?=INT\.|EXT\.)/mi).filter((x) => /^(INT\.|EXT\.)/i.test(x)).length, 0);
  });

  it('the new recipe degrades it — strictly fewer scenes, and different bytes', () => {
    const out = shuffleDropDegrade(MIXED, 'mixed.fountain');
    assert.notEqual(out, MIXED);
    assert.ok(
      countFountainScenes(out) < countFountainScenes(MIXED),
      `drop-every-third left ${countFountainScenes(out)} of ${countFountainScenes(MIXED)} scenes`,
    );
    // Five headings, one dropped (index 2 of the shuffled order) -> 4 kept.
    assert.equal(countFountainScenes(MIXED), 5);
    assert.equal(countFountainScenes(out), 4);
    // The head is still preserved verbatim, and surviving scenes are verbatim.
    assert.ok(out.startsWith('Title: Mixed\n\n'));
    const sourceScenes = new Set(segmentFountainScenes(MIXED).scenes);
    for (const scene of segmentFountainScenes(out).scenes) {
      assert.ok(sourceScenes.has(scene), `the degraded output invented a scene: ${JSON.stringify(scene)}`);
    }
  });

  it('records the new segmentation in the degradation id and recipe text', () => {
    // A table locked under the old recipe must never be compared to a new
    // measurement, and the artifact is self-describing, so the id carries it.
    assert.equal(AUC24_DEGRADATION_ID, 'shuffle-drop/v2');
    assert.match(AUC24_DEGRADATION.recipe, /scene-segments\.ts/);
    assert.match(AUC24_DEGRADATION.recipe, /NOT the INT\.\/EXT\.-only split/);
  });
});

describe('assertDegradationChangedText / assertFinalSceneIsFirst', () => {
  const THREE = 'INT. A - DAY\n\nX.\n\nINT. B - DAY\n\nY.\n\nINT. C - DAY\n\nZ.\n';

  it('passes a real degradation through untouched', () => {
    const degraded = shuffleDropDegrade(THREE, 'k');
    assert.equal(assertDegradationChangedText('SHUFFLE_DROP', 'k', THREE, degraded), degraded);
  });

  it('THROWS on a no-op, and says why a tie is not a measurement', () => {
    assert.throws(
      () => assertDegradationChangedText('SHUFFLE_DROP', 'k.fountain', THREE, THREE),
      (err: Error) => {
        assert.match(err.message, /produced its input unchanged on k\.fountain/);
        assert.match(err.message, /HARNESS FAULT/);
        assert.match(err.message, /counted as 0\.5/);
        return true;
      },
    );
  });

  it('accepts a relocation that puts the final scene FIRST', () => {
    const { head, scenes } = segmentFountainScenes(THREE);
    const relocated = head + [scenes[2], scenes[0], scenes[1]].join('');
    assert.equal(assertFinalSceneIsFirst('k', THREE, relocated), relocated);
  });

  it('THROWS on the position-TWO relocation this lane fixed', () => {
    // The exact output of the old `scenes.splice(1, 0, last)`: the original
    // opening stays first. Every document said position one; nothing checked.
    const { head, scenes } = segmentFountainScenes(THREE);
    const positionTwo = head + [scenes[0], scenes[2], scenes[1]].join('');
    assert.throws(
      () => assertFinalSceneIsFirst('k.fountain', THREE, positionTwo),
      /did not put the final scene first on k\.fountain/,
    );
  });

  it('THROWS when a scene-count-preserving relocation changed the count', () => {
    const { head, scenes } = segmentFountainScenes(THREE);
    const dropped = head + [scenes[2], scenes[0]].join('');
    assert.throws(
      () => assertFinalSceneIsFirst('k.fountain', THREE, dropped),
      /changed the scene count on k\.fountain \(3 -> 2\)/,
    );
  });
});
