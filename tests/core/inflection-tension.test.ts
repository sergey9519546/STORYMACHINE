// Inflection-tension signal tests. Locks the reversal-counting logic
// and inflectionRate normalization as a regression.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeInflectionTension, INFLECTION_TENSION_MIN_SCENES } from '../../server/nvm/analyze/inflection-tension.ts';

// Reuse emotional-arc test scenes for consistency
const CALM = 'INT. HEARTH - DAY\nThey share bread by the warm fire. A friend laughs. Home is safe, bright, together.\n\n';
const RISE = 'EXT. ROAD - DAY\nThe cold road. A threat. They cannot stop. Danger follows, closer now.\n\n';
const CLIMAX = 'INT. KEEP - NIGHT\nHe screams. Blood and fire! They fight, run. The enemy attacks. Death, terror, rage!\n\n';
const RESOLVE = 'EXT. DAWN - DAY\nWarm light. Safe at last. A friend, a home. Peace and relief, together.\n\n';

// Three-act arc: calm → rising → climax → resolution. One reversal at peak.
const risingArc = [CALM, CALM, CALM, RISE, RISE, RISE, CLIMAX, RESOLVE, RESOLVE];

// Multi-reversal pattern: calm → rise → climax → calm → rise
const multiReversalArc = [CALM, CALM, RISE, RISE, CLIMAX, CALM, RISE, RISE, RESOLVE];

// Monotone rising: progressively more tense. No reversals.
const monotoneRising = [CALM, CALM, RISE, RISE, RISE, CLIMAX, CLIMAX, CLIMAX, CLIMAX];

describe('inflection-tension: reversal counting and inflectionRate', () => {
  it('a three-act arc has at least 1 reversal', () => {
    const result = computeInflectionTension(risingArc);
    assert.ok(result.scored);
    assert.ok(result.reversals >= 1, `expected >=1, got ${result.reversals}`);
  });

  it('a three-act arc has positive inflectionRate', () => {
    const result = computeInflectionTension(risingArc);
    assert.ok(result.scored);
    assert.ok(result.inflectionRate > 0);
  });

  it('a multi-reversal arc has 2 or more reversals', () => {
    const result = computeInflectionTension(multiReversalArc);
    assert.ok(result.scored);
    assert.ok(result.reversals >= 2, `expected >=2, got ${result.reversals}`);
  });

  it('a multi-reversal arc has positive inflectionRate', () => {
    const result = computeInflectionTension(multiReversalArc);
    assert.ok(result.scored);
    assert.ok(result.inflectionRate > 0);
  });

  it('a monotone-rising curve has 0 reversals', () => {
    const result = computeInflectionTension(monotoneRising);
    assert.ok(result.scored);
    assert.equal(result.reversals, 0);
  });

  it('a monotone-rising curve has near-zero inflectionRate', () => {
    const result = computeInflectionTension(monotoneRising);
    assert.ok(result.scored);
    assert.ok(result.inflectionRate < 0.1);
  });

  it('peakToTroughRange is correct', () => {
    const result = computeInflectionTension(risingArc);
    assert.ok(result.scored);
    const min = Math.min(...result.tensionCurve);
    const max = Math.max(...result.tensionCurve);
    assert.equal(result.peakToTroughRange, max - min);
  });
});

describe('inflection-tension: degradation and determinism', () => {
  it('abstains below min scene count', () => {
    const result = computeInflectionTension(risingArc.slice(0, INFLECTION_TENSION_MIN_SCENES - 1));
    assert.equal(result.scored, false);
    assert.equal(result.inflectionRate, 0);
    assert.equal(result.reversals, 0);
  });

  it('is deterministic', () => {
    const r1 = computeInflectionTension(risingArc);
    const r2 = computeInflectionTension(risingArc);
    assert.equal(r1.inflectionRate, r2.inflectionRate);
    assert.equal(r1.reversals, r2.reversals);
  });

  it('up-down-up pattern has 2 reversals', () => {
    const upDownUp = [
      'peaceful quiet calm',
      'peaceful quiet calm',
      'pain suffering agony blood terror fright horrified angry scared!',
      'peaceful quiet calm',
      'peaceful quiet calm',
      'danger threat peril ominous sinister grim dire terror!',
      'peaceful quiet calm',
    ];
    const result = computeInflectionTension(upDownUp);
    assert.ok(result.scored);
    assert.equal(result.reversals, 2);
  });

  it('reports tension curve', () => {
    const result = computeInflectionTension(risingArc);
    assert.ok(result.scored);
    assert.equal(result.tensionCurve.length, risingArc.length);
    for (const t of result.tensionCurve) {
      assert.equal(typeof t, 'number');
    }
  });
});
