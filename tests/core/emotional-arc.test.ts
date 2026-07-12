// Emotional-arc signal tests (ROADMAP §8 EA). Locks the position-aware
// separation the prototype measured (act-swap AUC 0.48→0.642) as a regression.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeEmotionalArc, scenesFromFountain, EMOTIONAL_ARC_MIN_SCENES } from '../../server/nvm/analyze/emotional-arc.ts';

// A classic rising arc: calm opening → rising conflict → climax → resolution.
const CALM = 'INT. HEARTH - DAY\nThey share bread by the warm fire. A friend laughs. Home is safe, bright, together.\n\n';
const RISE = 'EXT. ROAD - DAY\nThe cold road. A threat. They cannot stop. Danger follows, closer now.\n\n';
const CLIMAX = 'INT. KEEP - NIGHT\nHe screams. Blood and fire! They fight, run. The enemy attacks. Death, terror, rage!\n\n';
const RESOLVE = 'EXT. DAWN - DAY\nWarm light. Safe at last. A friend, a home. Peace and relief, together.\n\n';
const risingScript = [CALM, CALM, CALM, RISE, RISE, RISE, CLIMAX, RESOLVE, RESOLVE];

function actSwap<T>(scenes: T[]): T[] { const k = Math.floor(scenes.length / 3); return [...scenes.slice(2*k), ...scenes.slice(0,k), ...scenes.slice(k,2*k)]; }

describe('emotional-arc: position-aware separation (the EA hypothesis, locked)', () => {
  it('a rising arc scores higher arcHealth than its act-swapped twin', () => {
    const good = computeEmotionalArc(risingScript);
    const bad = computeEmotionalArc(actSwap(risingScript));
    assert.ok(good.scored && bad.scored);
    assert.ok(good.arcHealth > bad.arcHealth, `rising ${good.arcHealth.toFixed(2)} should beat act-swapped ${bad.arcHealth.toFixed(2)}`);
  });
  it('rising arc has a late tension peak and positive ramp correlation', () => {
    const a = computeEmotionalArc(risingScript);
    assert.ok(a.peakPosition >= 0.6, `peak at ${a.peakPosition}`);
    assert.ok(a.rampCorrelation > 0.1, `rampCorr ${a.rampCorrelation}`); // rises then resolves → modest positive, not a pure ramp
  });
});

describe('emotional-arc: honest degradation + determinism', () => {
  it('abstains (scored:false) below the minimum scene count', () => {
    const a = computeEmotionalArc(risingScript.slice(0, EMOTIONAL_ARC_MIN_SCENES - 1));
    assert.equal(a.scored, false);
    assert.equal(a.arcHealth, 0);
  });
  it('is deterministic: identical input → identical arcHealth', () => {
    assert.equal(computeEmotionalArc(risingScript).arcHealth, computeEmotionalArc(risingScript).arcHealth);
  });
  it('tension responds to affect: a violent scene out-tensions a calm one', () => {
    const calm = computeEmotionalArc([CALM,CALM,CALM,CALM,CALM,CALM]).perScene[0].tension;
    const violent = computeEmotionalArc([CLIMAX,CLIMAX,CLIMAX,CLIMAX,CLIMAX,CLIMAX]).perScene[0].tension;
    assert.ok(violent > calm, `violent ${violent} > calm ${calm}`);
  });
  it('uses the real lexicon (coverage > 0) and fits a Reagan archetype', () => {
    const a = computeEmotionalArc(risingScript);
    assert.ok(a.lexCoverage > 0, `lexCoverage ${a.lexCoverage}`);
    assert.ok(a.reaganFit >= 0 && a.reaganArc !== undefined, 'reagan fit computed');
  });
  it('scenesFromFountain splits on INT./EXT.', () => {
    assert.equal(scenesFromFountain(risingScript.join('')).length, 9);
  });
});
