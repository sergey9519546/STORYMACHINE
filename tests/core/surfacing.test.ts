// Surfacing criterion tests (ULTRAPLAN Phase 2 keystone). Fire/no-fire on the
// Pre-Flight §4.4 release gate.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldSurface, isRoutinelyReleasable, thresholdsFor, type SurfacingInput } from '../../server/nvm/proof/surfacing.ts';

const base: SurfacingInput = {
  subtype: 'knowledge_path', dependencyClass: 'epistemic_requirement',
  necessity: 0.9, support: 'CONTRADICTED', searchCompleteness: 1, alternativeStrength: 0.1, evidencePasses: true,
};

describe('surfacing: CONTRADICTED path', () => {
  it('FIRES when necessity high, alternative weak, evidence passes', () => {
    const d = shouldSurface(base);
    assert.equal(d.surface, true); assert.equal(d.externalVerdict, 'FAIL');
  });
  it('SUPPRESSES on low necessity (< τ_N)', () => {
    assert.equal(shouldSurface({ ...base, necessity: 0.3 }).surface, false);
  });
  it('SUPPRESSES when a strong innocent explanation exists (A ≥ τ_A) — adversarial acquittal', () => {
    const d = shouldSurface({ ...base, alternativeStrength: 0.9 });
    assert.equal(d.surface, false); assert.match(d.reason, /acquittal/);
  });
  it('SUPPRESSES when the evidence contract fails — no flag without evidence', () => {
    assert.equal(shouldSurface({ ...base, evidencePasses: false }).surface, false);
  });
});

describe('surfacing: open-world UNKNOWN path', () => {
  const unk: SurfacingInput = { ...base, support: 'UNKNOWN' };
  it('SUPPRESSES UNKNOWN with incomplete search (C < τ_C) — absence is not a negative fact', () => {
    const d = shouldSurface({ ...unk, searchCompleteness: 0.3 });
    assert.equal(d.surface, false); assert.match(d.reason, /open-world|incomplete/);
  });
  it('FIRES UNKNOWN only when search is complete (C ≥ τ_C) and necessity high', () => {
    assert.equal(shouldSurface({ ...unk, searchCompleteness: 0.9 }).surface, true);
  });
  it('SUPPRESSES a soft narrative expectation that is merely absent', () => {
    const d = shouldSurface({ ...unk, dependencyClass: 'soft_narrative_expectation', searchCompleteness: 1 });
    assert.equal(d.surface, false); assert.match(d.reason, /soft dependency/);
  });
});

describe('surfacing: supported / suppressed states', () => {
  it('ENTAILED → PASS, never surfaces', () => {
    const d = shouldSurface({ ...base, support: 'ENTAILED' });
    assert.equal(d.surface, false); assert.equal(d.externalVerdict, 'PASS');
  });
  it('AMBIGUOUS and EXTRACTION_ERROR are suppressed', () => {
    assert.equal(shouldSurface({ ...base, support: 'AMBIGUOUS' }).externalVerdict, 'SUPPRESSED');
    assert.equal(shouldSurface({ ...base, support: 'EXTRACTION_ERROR' }).externalVerdict, 'SUPPRESSED');
  });
});

describe('surfacing: dependency classes + thresholds', () => {
  it('only the 6 hard classes are routinely releasable', () => {
    for (const c of ['explicit_script_rule','established_world_rule','hard_physical_constraint','epistemic_requirement','access_or_possession_requirement','temporal_requirement'] as const)
      assert.equal(isRoutinelyReleasable(c), true);
    assert.equal(isRoutinelyReleasable('soft_narrative_expectation'), false);
  });
  it('per-subtype thresholds resolve (with a default fallback)', () => {
    assert.ok(thresholdsFor('knowledge_path').tauN > 0);
    assert.deepEqual(thresholdsFor('nonexistent_subtype'), thresholdsFor('default'));
  });
  it('is deterministic', () => {
    assert.deepEqual(shouldSurface(base), shouldSurface(base));
  });
});
