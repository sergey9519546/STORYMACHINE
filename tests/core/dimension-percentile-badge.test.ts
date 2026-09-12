// The Craft Dimensions badges: one module, one gate, no badge that reads backwards.
//
// ── The two defects (2026-09-12 adversarial audit, findings #4 and #14) ─────
//
// #4. `percentileIsComparable` was written 2026-09-11 to stop the product ranking
// real drafts against a 20-sample, 9–10-scene, 256–337-word synthetic corpus. Its
// own doc comment says "One function, both dimensions, every caller." It reached
// the HEADLINE health percentile and not the five DIMENSION badges, so one
// scrolling report said
//
//   "Health percentile: not comparable — this draft is outside the bounds of the
//    hand-authored synthetic reference set (20 samples / 9–10 scenes / 256–337 words)"
//
// on line 140, and
//
//   "STRUCTURE & PACING TOP 10% 92 · CHARACTER TOP 10% 95 · DIALOGUE & VOICE
//    TOP 10% 99 · PLOT LOGIC & PAYOFF TOP 10% 88 · THEME & ORIGINALITY TOP 10% 100"
//
// on lines 367–399.
//
// #14. `percentileBand(20)` returns "top 80%" — literally true, and read as praise
// by every reader not thinking about it. On `runoff` the badge beside Dialogue &
// Voice (percentile 20) read "TOP 80%" next to the score 98.
//
// AND the badge ranks a DIFFERENT statistic from the number beside it:
// `doctor.ts:2257` ranks `build.rawScore` (unclamped, scarcity term included)
// while the badge sits next to the clamped display score, which is why a 100/100
// dimension read "bottom 10%" and an 81.5 read "top 10%". Re-ranking is a scoring
// change and is NOT part of this lane; what IS here is that the gate withholds the
// badge for every draft outside the bounds (i.e. every real draft), and that where
// a badge IS shown its tooltip names the statistic it ranked.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  dimensionPercentileBand,
  dimensionPercentileBadgeFor,
  dimensionPercentileCaptionFor,
  dimensionPercentileTooltipFor,
  percentileBand,
  percentileCellFor,
  REFERENCE_MIN_SCENES,
  REFERENCE_MAX_SCENES,
  REFERENCE_MIN_WORDS,
  REFERENCE_MAX_WORDS,
} from '../../src/lib/percentile-copy.ts';
import { percentileDescriptor } from '../../server/nvm/analyze/calibration/percentile.ts';

// Inside the reference set's bounds on BOTH axes — the only shape that gets a
// badge at all.
const IN = [REFERENCE_MIN_SCENES, REFERENCE_MIN_WORDS] as const;

describe('finding #14 — the band cannot be read backwards', () => {
  it('stops saying "top 80%" for a bottom-quintile percentile', () => {
    // The audit's own example: runoff's Dialogue & Voice, percentile 20, badge
    // "TOP 80%", score 98 beside it.
    assert.equal(percentileBand(20), 'top 80%', 'sanity: the old wording is what it was');
    assert.equal(dimensionPercentileBand(20), 'bottom quartile');
  });

  it('uses the descriptor\'s own four-band vocabulary at every boundary', () => {
    // The boundaries are percentileDescriptor's: >=90, <25, <10.
    assert.equal(dimensionPercentileBand(100), 'top 10%');
    assert.equal(dimensionPercentileBand(90), 'top 10%');
    assert.equal(dimensionPercentileBand(89), 'stronger than 89%');
    assert.equal(dimensionPercentileBand(25), 'stronger than 25%');
    assert.equal(dimensionPercentileBand(24), 'bottom quartile');
    assert.equal(dimensionPercentileBand(10), 'bottom quartile');
    assert.equal(dimensionPercentileBand(9), 'bottom 10%');
    assert.equal(dimensionPercentileBand(0), 'bottom 10%');
  });

  it('clamps, so an out-of-range statistic cannot produce a nonsense band', () => {
    assert.equal(dimensionPercentileBand(-40), 'bottom 10%');
    assert.equal(dimensionPercentileBand(140), 'top 10%');
    assert.equal(dimensionPercentileBand(89.6), 'top 10%', 'rounds before banding');
  });

  it('never disagrees in DIRECTION with the descriptor the server already emits', () => {
    for (let pct = 0; pct <= 100; pct++) {
      const badge = dimensionPercentileBand(pct);
      const descriptor = percentileDescriptor(pct, 'X');
      const badgeSaysTop = /^top/.test(badge);
      const descriptorSaysTop = /top 10%/.test(descriptor);
      const badgeSaysBottom = /^bottom/.test(badge);
      const descriptorSaysBottom = /bottom (10%|quartile)/.test(descriptor);
      assert.equal(badgeSaysTop, descriptorSaysTop, `direction disagreement at ${pct}: "${badge}" vs "${descriptor}"`);
      assert.equal(badgeSaysBottom, descriptorSaysBottom, `direction disagreement at ${pct}: "${badge}" vs "${descriptor}"`);
    }
  });
});

describe('finding #4 — the comparability gate reaches the dimension badges', () => {
  it('a draft inside the bounds gets a band', () => {
    assert.equal(dimensionPercentileBadgeFor(95, IN[0], IN[1]), 'top 10%');
    assert.equal(dimensionPercentileBadgeFor(20, REFERENCE_MAX_SCENES, REFERENCE_MAX_WORDS), 'bottom quartile');
    assert.equal(dimensionPercentileBadgeFor(60, REFERENCE_MAX_SCENES, REFERENCE_MAX_WORDS), 'stronger than 60%');
  });

  it('a draft outside EITHER bound gets "not comparable", not a band', () => {
    // runoff: 9 scenes (inside), 1,448 words (four times over) — the exact draft
    // whose two surfaces disagreed in one session.
    assert.equal(dimensionPercentileBadgeFor(100, 9, 1448), 'not comparable');
    // The 231-scene fixture, whose Character badge read "top 10%" at 81.5.
    assert.equal(dimensionPercentileBadgeFor(95, 231, 95000), 'not comparable');
    // And the 12-scene sample the start screen's own button analyses.
    assert.equal(dimensionPercentileBadgeFor(100, 12, 1800), 'not comparable');
    // One step over each bound, on its own.
    assert.equal(dimensionPercentileBadgeFor(50, REFERENCE_MAX_SCENES + 1, IN[1]), 'not comparable');
    assert.equal(dimensionPercentileBadgeFor(50, REFERENCE_MIN_SCENES - 1, IN[1]), 'not comparable');
    assert.equal(dimensionPercentileBadgeFor(50, IN[0], REFERENCE_MAX_WORDS + 1), 'not comparable');
    assert.equal(dimensionPercentileBadgeFor(50, IN[0], REFERENCE_MIN_WORDS - 1), 'not comparable');
  });

  it('a missing scene or word count is NOT comparable (no basis for a band)', () => {
    assert.equal(dimensionPercentileBadgeFor(95, undefined, IN[1]), 'not comparable');
    assert.equal(dimensionPercentileBadgeFor(95, IN[0], null), 'not comparable');
    assert.equal(dimensionPercentileBadgeFor(95, Number.NaN, IN[1]), 'not comparable');
  });

  it('uses the SAME words as the Slate table for the same decision', () => {
    assert.equal(
      dimensionPercentileBadgeFor(100, 9, 1448),
      percentileCellFor(100, 9, 1448),
      'two surfaces must not word one withheld reading two ways',
    );
  });
});

describe('the tooltip and the section caption are gated by the same decision', () => {
  it('out of bounds: the reason, in the headline\'s own terms, and NO exact rank', () => {
    const tip = dimensionPercentileTooltipFor(100, 'Theme & Originality', 9, 1448);
    assert.match(tip, /^Theme & Originality: no percentile/);
    assert.match(tip, /hand-authored synthetic reference set/);
    assert.match(tip, /20 samples \/ 9–10 scenes \/ 256–337 words/);
    assert.match(tip, /measure this draft's length, not its craft/);
    assert.doesNotMatch(tip, /Exact rank/, 'an ordinal against a set it cannot be compared to is false precision');
  });

  it('in bounds: the band, the exact rank, AND which statistic was ranked', () => {
    const tip = dimensionPercentileTooltipFor(95, 'Character', IN[0], IN[1]);
    assert.match(tip, /^Character: top 10%/);
    assert.match(tip, /Exact rank: 95th of 20 reference samples/);
    assert.match(
      tip,
      /Ranked on the unclamped craft statistic, not the 0-100 score shown beside it\./,
      'without this clause the two numbers on one row read as two readings of the same thing',
    );
  });

  it('the caption does not promise a comparison the badges withhold', () => {
    assert.match(dimensionPercentileCaptionFor(IN[0], IN[1]), /^Percentile badges compare against/);
    const outOfBounds = dimensionPercentileCaptionFor(9, 1448);
    assert.match(outOfBounds, /^No percentile badges/);
    assert.match(outOfBounds, /outside the bounds of the hand-authored synthetic reference set/);
  });
});
