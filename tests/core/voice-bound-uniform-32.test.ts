// The UNIFORM-32 calibration shape (scripts/lib/voice-bound.ts, buildUniform32)
// produces the document VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT was fitted
// on — and this file proves that with the production counters, not by reading
// the generator.
//
// WHY THIS FILE EXISTS. The 0.173 us/unit constant (server/lib/validation.ts)
// was fitted on 2026-09-05 to "n uniform characters on the 32-word floor"
// (n = 97 -> weight 301,088) against a generator that no longer exists, and
// buildUniformCast — the generator every other uniform shape shares — refuses
// 32 words per speaker (not a multiple of 6). So until buildUniform32 the
// calibration runner (.github/workflows/calibrate-voice-bound.yml) had never
// measured the constant's own shape. A shape that is asked for by name in a
// runner sweep has to be the shape it claims to be BEFORE its row is locked,
// or the row's rate is fitted to something else again — which is the exact
// drift the constant's comment warns against. Everything here is asserted
// through the guard's own production walk (realVoiceWordCountsForMeasurement,
// whose voiceTokenCount mirrors voice-delta.ts's tokenize verbatim) and the
// real analyzer's analyzeVoices eligibility (analyzeFountainText), so a
// change to either tokenizer that moved the count would fail here.
//
// NOT scoring-path: it reads a generator and two production counters; it
// changes nothing on the scoring path and locks no timing.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT,
  MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT,
  fountainShapeRejectionReason,
  realVoiceWordCountsForMeasurement,
} from '../../server/lib/validation.ts';
import { VOICE_MIN_WORDS } from '../../server/nvm/analyze/voice-delta.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import {
  buildUniform32,
  uniform32Weight,
  uniformMinWeight,
  VOICE_BOUND_SHAPES,
} from '../../scripts/lib/voice-bound.ts';

/** The cast the 2026-09-05 rate was fitted at, and the weight its table
 *  records for it (server/lib/validation.ts, the round-2 re-derivation grid:
 *  "97  301,088  4,656 pairs  52 ms  0.173 us/unit"). */
const FITTED_CAST = 97;
const FITTED_WEIGHT = 301_088;
const FITTED_PAIRS = 4_656;

function eligibleCounts(text: string): number[] {
  return [...realVoiceWordCountsForMeasurement(text).values()].filter((w) => w > 0);
}

describe('the uniform-32 calibration shape is the document the 0.173 us/unit constant was fitted on', () => {
  it('is registered by name, so a sweep, a workflow input and a fixture row all spell it the same way', () => {
    assert.equal(typeof VOICE_BOUND_SHAPES['uniform-32'], 'function');
    assert.equal(
      VOICE_BOUND_SHAPES['uniform-32'](FITTED_CAST, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT),
      buildUniform32(FITTED_CAST),
      'the registry entry must be buildUniform32 itself, not a variant that takes the weight bound into account',
    );
  });

  it('every speaker carries EXACTLY 32 real words by the guard\'s own production walk, and the distinct count is the cast', () => {
    for (const cast of [2, 40, FITTED_CAST, MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT, MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT + 1]) {
      const counts = eligibleCounts(buildUniform32(cast));
      assert.equal(counts.length, cast, `uniform-32 N=${cast}: the guard sees ${counts.length} speakers, not ${cast}`);
      for (const words of counts) {
        assert.equal(words, 32, `uniform-32 N=${cast}: a speaker carries ${words} words, not 32 — the paragraph unit is not eight letter-only words, or the parser is joining or splitting paragraphs`);
      }
    }
  });

  it('the closed-form weight matches what the guard measures, and 97 speakers weigh exactly 301,088', () => {
    assert.equal(uniform32Weight(FITTED_CAST), FITTED_WEIGHT);
    for (const cast of [2, FITTED_CAST, MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT]) {
      const counts = eligibleCounts(buildUniform32(cast));
      const measured = counts.length * counts.reduce((a, b) => a + b, 0);
      assert.equal(measured, uniform32Weight(cast), `uniform-32 N=${cast}: measured weight ${measured} != closed form ${uniform32Weight(cast)}`);
    }
    // The point of a dedicated unit: at the SAME cast this shape is heavier
    // than uniform-min by exactly 32/30, which is why the two rates cannot be
    // swapped for one another (the 2026-09-07 review's "~3% more characters,
    // ~7% more pairs" at a fixed weight, stated here as the inverse).
    assert.equal(uniform32Weight(FITTED_CAST) * 30, uniformMinWeight(FITTED_CAST) * 32);
  });

  it('voice-delta\'s OWN eligibility (analyzeVoices, through the real analyzer) admits every speaker and scores every pair — 4,656 at N=97, the fitted table\'s own pair count', () => {
    // The guard walk above mirrors voice-delta's tokenizer; this is the
    // tokenizer itself, reached the way a request reaches it. 32 >= the
    // 30-word floor, so no speaker may be excluded and every pair must score.
    assert.ok(32 >= VOICE_MIN_WORDS, 'the shape is defined as sitting above the eligibility floor');
    const { voiceAnalysis } = analyzeFountainText(buildUniform32(FITTED_CAST));
    assert.ok(voiceAnalysis, 'the analyzer returned no voice analysis at all for a 97-speaker document');
    assert.equal(voiceAnalysis.scored, true);
    assert.deepEqual(voiceAnalysis.excludedCharacters, [], 'a speaker fell under voice-delta\'s floor — its pooledWordCount disagrees with the guard walk');
    assert.equal(voiceAnalysis.pairs.length, FITTED_PAIRS);
    assert.equal(voiceAnalysis.pairs.length, (FITTED_CAST * (FITTED_CAST - 1)) / 2);
  });

  it('the guard\'s verdict is what the weight arithmetic predicts: ACCEPT at N=97 and at the cast bound, REJECT by the CAST bound one past it, REJECT by the WEIGHT bound once 32N² crosses it', () => {
    // At the fitted cast and at the cast bound the weight is far under the
    // weight bound, so both must be ACCEPTED — the 2026-09-05 fit was taken
    // on an admitted document, and it has to stay one.
    assert.ok(uniform32Weight(FITTED_CAST) < MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT);
    assert.equal(fountainShapeRejectionReason(buildUniform32(FITTED_CAST)), null, 'uniform-32 N=97 must be ACCEPTED');

    const castBound = MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT;
    assert.ok(uniform32Weight(castBound) < MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT, 'sanity: the cast bound sits under the weight bound on this shape');
    assert.equal(fountainShapeRejectionReason(buildUniform32(castBound)), null, `uniform-32 N=${castBound} (the cast bound) must be ACCEPTED`);

    // One past the cast bound: still under the weight bound, so the CAST bound
    // is the only thing that can be rejecting it — and the message must say so.
    assert.ok(uniform32Weight(castBound + 1) < MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT);
    const overCast = fountainShapeRejectionReason(buildUniform32(castBound + 1));
    assert.ok(overCast, `uniform-32 N=${castBound + 1} must be REJECTED`);
    assert.match(overCast!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT/);
    assert.doesNotMatch(overCast!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);

    // The weight crossing: the smallest N with 32N² > the weight bound. The
    // weight bound is checked first, so past it the message names the WEIGHT
    // bound even though the cast bound is also exceeded.
    const firstOverWeight = Math.floor(Math.sqrt(MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT / 32)) + 1;
    assert.ok(uniform32Weight(firstOverWeight - 1) <= MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT);
    assert.ok(uniform32Weight(firstOverWeight) > MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT);
    const overWeight = fountainShapeRejectionReason(buildUniform32(firstOverWeight));
    assert.ok(overWeight, `uniform-32 N=${firstOverWeight} (weight ${uniform32Weight(firstOverWeight)}) must be REJECTED`);
    assert.match(overWeight!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
    const underWeight = fountainShapeRejectionReason(buildUniform32(firstOverWeight - 1));
    assert.ok(underWeight, `uniform-32 N=${firstOverWeight - 1} is over the cast bound and must still be REJECTED`);
    assert.match(underWeight!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT/);
  });
});
