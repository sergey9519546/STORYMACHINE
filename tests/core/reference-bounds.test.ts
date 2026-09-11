// server/lib/reference-bounds.ts — the derived bounds must equal the literals the
// browser bundle carries.
//
// ── Why this test is the load-bearing part of the design ────────────────────
//
// The comparability gate (src/lib/percentile-copy.ts's percentileIsComparable)
// decides whether a percentile is shown at all, and it needs the calibration
// reference set's scene and word bounds. Those bounds cannot be DERIVED inside
// that module: deriving them means importing REFERENCE_CORPUS — 1,900 lines of
// screenplay prose — into the browser bundle that every panel loads.
//
// So the numbers live in two places on purpose: derived from the corpus in
// server/lib/reference-bounds.ts, and as literals in percentile-copy.ts. This
// test is what makes that safe. Edit the calibration corpus and the derived
// values move; the literals do not; this fails. That is the whole mechanism —
// without it, a corpus edit would silently leave the gate measuring a band the
// reference set no longer occupies.
//
// (calibration/** is always-scoring per scripts/check-scoring-receipt.mjs. This
// test READS it; it changes nothing there.)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REFERENCE_BOUNDS, derivedReferenceBoundsLine } from '../../server/lib/reference-bounds.ts';
import {
  REFERENCE_SET_SIZE, REFERENCE_MIN_SCENES, REFERENCE_MAX_SCENES,
  REFERENCE_MIN_WORDS, REFERENCE_MAX_WORDS, referenceBoundsLine, percentileIsComparable,
} from '../../src/lib/percentile-copy.ts';

describe('reference bounds — derived equals bundled', () => {
  it('the sample count matches', () => {
    assert.equal(REFERENCE_BOUNDS.samples, REFERENCE_SET_SIZE);
  });

  it('the scene band matches', () => {
    assert.equal(REFERENCE_BOUNDS.minScenes, REFERENCE_MIN_SCENES);
    assert.equal(REFERENCE_BOUNDS.maxScenes, REFERENCE_MAX_SCENES);
  });

  it('the word band matches', () => {
    assert.equal(REFERENCE_BOUNDS.minWords, REFERENCE_MIN_WORDS);
    assert.equal(REFERENCE_BOUNDS.maxWords, REFERENCE_MAX_WORDS);
  });

  it('the rendered line is byte-identical from either source', () => {
    assert.equal(derivedReferenceBoundsLine(), referenceBoundsLine());
  });

  it('the line states what it claims to state', () => {
    // Pinned as a whole string: this is the confidence line a producer reads.
    assert.equal(derivedReferenceBoundsLine(), '20 samples / 9–10 scenes / 256–337 words');
  });
});

describe('reference bounds — the gate uses them symmetrically', () => {
  it('fire: a sample-shaped draft is comparable', () => {
    assert.equal(percentileIsComparable(REFERENCE_BOUNDS.minScenes, REFERENCE_BOUNDS.minWords), true);
    assert.equal(percentileIsComparable(REFERENCE_BOUNDS.maxScenes, REFERENCE_BOUNDS.maxWords), true);
  });

  it('no-fire: one dimension out of band is enough — the gate is symmetric', () => {
    // data/screenplays/runoff.fountain: 9 scenes (IN band), 1,448 words (out).
    // The first cut of this gate checked only the scene count on one surface,
    // which is how runoff read "top 30%" in Versions and "not comparable"
    // everywhere else in the same session.
    assert.equal(percentileIsComparable(9, 1448), false, 'words out of band');
    assert.equal(percentileIsComparable(231, 300), false, 'scenes out of band');
    assert.equal(percentileIsComparable(8, 256), false, 'one under the scene floor');
    assert.equal(percentileIsComparable(11, 337), false, 'one over the scene ceiling');
    assert.equal(percentileIsComparable(10, 255), false, 'one under the word floor');
    assert.equal(percentileIsComparable(10, 338), false, 'one over the word ceiling');
  });

  it('no-fire: a missing value is not comparable, and never crashes', () => {
    assert.equal(percentileIsComparable(null, 300), false);
    assert.equal(percentileIsComparable(10, null), false);
    assert.equal(percentileIsComparable(undefined, undefined), false);
    assert.equal(percentileIsComparable(NaN, 300), false);
    assert.equal(percentileIsComparable(10, Infinity), false);
  });
});
