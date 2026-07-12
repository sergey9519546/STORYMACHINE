// Adversarial-Acquittal pass tests (ULTRAPLAN backlog Phase 2, line 58).
// Fire/no-fire on the strongest-innocent-explanation search that gates
// release before `shouldSurface`.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACQUITTAL_STRENGTH_THRESHOLD,
  adversarialAcquittal,
  surfaceAfterAcquittal,
  type InnocentExplanation,
} from './acquittal.ts';
import type { SurfacingInput } from './surfacing.ts';

const strongConsistent: InnocentExplanation = { label: 'alt-cause', strength: 0.8, consistentWithEvidence: true };
const weakConsistent: InnocentExplanation = { label: 'weak-alt', strength: 0.2, consistentWithEvidence: true };
const strongInconsistent: InnocentExplanation = { label: 'ruled-out', strength: 0.95, consistentWithEvidence: false };

const baseSurfacing: SurfacingInput = {
  subtype: 'knowledge_path',
  dependencyClass: 'epistemic_requirement',
  necessity: 0.9,
  support: 'UNKNOWN',
  searchCompleteness: 0.9,
  alternativeStrength: 0.1, // deliberately below surfacing.ts's own tauA so its acquittal path doesn't fire
  evidencePasses: true,
};

describe('adversarialAcquittal: UNKNOWN + strong innocent explanation', () => {
  it('FIRES (acquits) an UNKNOWN finding with a strong consistent innocent explanation', () => {
    const r = adversarialAcquittal({ support: 'UNKNOWN', explanations: [strongConsistent] });
    assert.equal(r.acquitted, true);
    assert.equal(r.residualSupport, 'ENTAILED');
    assert.deepEqual(r.strongestInnocent, { label: 'alt-cause', strength: 0.8 });
    assert.match(r.reason, /acquitted/);
  });

  it('composed via surfaceAfterAcquittal: acquitted finding does NOT surface', () => {
    const d = surfaceAfterAcquittal(baseSurfacing, [strongConsistent]);
    assert.equal(d.surface, false);
    assert.equal(d.externalVerdict, 'PASS');
    assert.match(d.reason, /adversarial acquittal/);
  });
});

describe('adversarialAcquittal: weak or absent innocent explanation', () => {
  it('does NOT acquit when the strongest explanation is below threshold', () => {
    const r = adversarialAcquittal({ support: 'UNKNOWN', explanations: [weakConsistent] });
    assert.equal(r.acquitted, false);
    assert.equal(r.residualSupport, 'UNKNOWN');
    assert.deepEqual(r.strongestInnocent, { label: 'weak-alt', strength: 0.2 });
  });

  it('does NOT acquit when there are no explanations at all', () => {
    const r = adversarialAcquittal({ support: 'UNKNOWN', explanations: [] });
    assert.equal(r.acquitted, false);
    assert.equal(r.strongestInnocent, null);
    assert.match(r.reason, /no consistent innocent explanation/);
  });

  it('composed via surfaceAfterAcquittal: unacquitted UNKNOWN with high necessity + complete search SURFACES', () => {
    const d = surfaceAfterAcquittal(baseSurfacing, [weakConsistent]);
    assert.equal(d.surface, true);
    assert.equal(d.externalVerdict, 'FAIL');
  });
});

describe('adversarialAcquittal: CONTRADICTED is never acquitted', () => {
  it('does NOT acquit a CONTRADICTED finding even with a strong consistent innocent explanation', () => {
    const r = adversarialAcquittal({ support: 'CONTRADICTED', explanations: [strongConsistent] });
    assert.equal(r.acquitted, false);
    assert.equal(r.residualSupport, 'CONTRADICTED');
    assert.match(r.reason, /never acquitted/);
    // the search still runs and reports the strongest candidate, for audit purposes
    assert.deepEqual(r.strongestInnocent, { label: 'alt-cause', strength: 0.8 });
  });

  it('composed via surfaceAfterAcquittal: CONTRADICTED finding still surfaces despite a strong innocent explanation', () => {
    const contradicted: SurfacingInput = { ...baseSurfacing, support: 'CONTRADICTED' };
    const d = surfaceAfterAcquittal(contradicted, [strongConsistent]);
    assert.equal(d.surface, true);
    assert.equal(d.externalVerdict, 'FAIL');
  });
});

describe('adversarialAcquittal: inconsistent explanations are ignored', () => {
  it('ignores a strong explanation that is inconsistent with the evidence, even when it is the only candidate', () => {
    const r = adversarialAcquittal({ support: 'UNKNOWN', explanations: [strongInconsistent] });
    assert.equal(r.acquitted, false);
    assert.equal(r.strongestInnocent, null);
  });

  it('picks the strongest CONSISTENT explanation over a stronger inconsistent one', () => {
    const r = adversarialAcquittal({ support: 'UNKNOWN', explanations: [strongInconsistent, weakConsistent] });
    assert.equal(r.acquitted, false); // weakConsistent (0.2) is below threshold
    assert.deepEqual(r.strongestInnocent, { label: 'weak-alt', strength: 0.2 });
  });
});

describe('adversarialAcquittal: threshold boundary', () => {
  it('acquits when strength is EXACTLY at the threshold (>=)', () => {
    const atThreshold: InnocentExplanation = { label: 'boundary', strength: ACQUITTAL_STRENGTH_THRESHOLD, consistentWithEvidence: true };
    const r = adversarialAcquittal({ support: 'UNKNOWN', explanations: [atThreshold] });
    assert.equal(r.acquitted, true);
  });

  it('does NOT acquit when strength is just below the threshold', () => {
    const belowThreshold: InnocentExplanation = {
      label: 'boundary-minus',
      strength: ACQUITTAL_STRENGTH_THRESHOLD - 0.01,
      consistentWithEvidence: true,
    };
    const r = adversarialAcquittal({ support: 'UNKNOWN', explanations: [belowThreshold] });
    assert.equal(r.acquitted, false);
  });

  it('respects a custom threshold override', () => {
    const r = adversarialAcquittal({ support: 'UNKNOWN', explanations: [weakConsistent], threshold: 0.1 });
    assert.equal(r.acquitted, true);
  });
});

describe('adversarialAcquittal: non-UNKNOWN/non-CONTRADICTED states pass through unchanged', () => {
  it('ENTAILED support is left unchanged (not eligible for acquittal machinery)', () => {
    const r = adversarialAcquittal({ support: 'ENTAILED', explanations: [strongConsistent] });
    assert.equal(r.acquitted, false);
    assert.equal(r.residualSupport, 'ENTAILED');
  });

  it('AMBIGUOUS support is left unchanged', () => {
    const r = adversarialAcquittal({ support: 'AMBIGUOUS', explanations: [strongConsistent] });
    assert.equal(r.acquitted, false);
    assert.equal(r.residualSupport, 'AMBIGUOUS');
  });
});

describe('adversarialAcquittal: input guards', () => {
  it('throws on an out-of-range threshold', () => {
    assert.throws(() => adversarialAcquittal({ support: 'UNKNOWN', explanations: [], threshold: 1.5 }), RangeError);
  });

  it('ignores a malformed explanation (out-of-range strength) rather than crashing', () => {
    const malformed: InnocentExplanation = { label: 'bad', strength: 1.7 as number, consistentWithEvidence: true };
    const r = adversarialAcquittal({ support: 'UNKNOWN', explanations: [malformed, weakConsistent] });
    assert.equal(r.acquitted, false);
    assert.deepEqual(r.strongestInnocent, { label: 'weak-alt', strength: 0.2 });
  });

  it('is deterministic', () => {
    const input = { support: 'UNKNOWN' as const, explanations: [strongConsistent, weakConsistent] };
    assert.deepEqual(adversarialAcquittal(input), adversarialAcquittal(input));
  });
});
