// confidence.ts — fire + no-fire tests (W1, research intake 2026-07-11).
// Run one file fast:
//   node --experimental-strip-types tests/passes/confidence.test.ts
// Proves: (1) tier-aware weight is byte-exact legacy when no tier is present
// (calibration cannot regress on landing); (2) the heuristic-can't-hard-block
// invariant fires and no-fires correctly; (3) the determinism classifier labels
// the §5.2 offenders and the lexical-flood family; (4) the tier multiplier
// discounts low-confidence findings. Float assertions use an epsilon because the
// tier-aware path carries IEEE-754 error (0.5·0.4·19 = 3.8000000000000003).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RevisionIssue } from '../../server/nvm/revision/passes/types.ts';
import {
  SEVERITY_WEIGHT,
  TIER_MULTIPLIER,
  tierMultiplier,
  gateForDeterminism,
  isSeverityLegal,
  assertSeverityLegal,
  inferDeterminism,
  defaultTierFor,
  weightedIssues,
} from '../../server/nvm/revision/passes/confidence.ts';

const EPS = 1e-9;
const near = (a: number, b: number, msg?: string) =>
  assert.ok(Math.abs(a - b) < EPS, msg ?? `${a} !~= ${b}`);

const mk = (over: Partial<RevisionIssue>): RevisionIssue => ({
  location: 'Scene 1 (INT. TEST)',
  rule: 'TEST_RULE',
  description: 'test',
  severity: 'minor',
  ...over,
});

describe('confidence: legacy-exact regression (inert by default)', () => {
  it('weightedIssues with no options == 4·crit + 1.5·major + 0.5·minor exactly', () => {
    const issues: RevisionIssue[] = [
      mk({ severity: 'critical' }), mk({ severity: 'critical' }),
      mk({ severity: 'major' }), mk({ severity: 'major' }), mk({ severity: 'major' }),
      mk({ severity: 'minor' }),
    ];
    assert.equal(weightedIssues(issues), 4 * 2 + 1.5 * 3 + 0.5 * 1); // exact, no float slop
    assert.equal(weightedIssues(issues), 13);
  });

  it('tier fields present but tierAware omitted ⇒ still legacy-exact', () => {
    const issues: RevisionIssue[] = [
      mk({ severity: 'minor', confidenceTier: 'pattern_to_watch', determinism: 'heuristic' }),
      mk({ severity: 'major', confidenceTier: 'strong_evidence', determinism: 'structured_only' }),
    ];
    assert.equal(weightedIssues(issues), 0.5 + 1.5); // tiers ignored unless opted in
  });

  it('SEVERITY_WEIGHT matches doctor.ts constants exactly', () => {
    assert.deepEqual(SEVERITY_WEIGHT, { critical: 4, major: 1.5, minor: 0.5 });
  });
});

describe('confidence: heuristic-cannot-hard-block invariant (D.3)', () => {
  it('FIRE: heuristic + critical is illegal', () => {
    assert.equal(isSeverityLegal('critical', 'heuristic'), false);
    assert.throws(
      () => assertSeverityLegal(mk({ severity: 'critical', determinism: 'heuristic', rule: 'ACTION_ADVERB_FLOOD' })),
      /gate violation/,
    );
  });

  it('NO-FIRE: structured/deterministic + critical is legal', () => {
    assert.equal(isSeverityLegal('critical', 'structured_only'), true);
    assert.equal(isSeverityLegal('critical', 'deterministic'), true);
    assert.doesNotThrow(() => assertSeverityLegal(mk({ severity: 'critical', determinism: 'structured_only' })));
  });

  it('NO-FIRE: heuristic + major/minor is legal; missing determinism never guarded', () => {
    assert.equal(isSeverityLegal('major', 'heuristic'), true);
    assert.doesNotThrow(() => assertSeverityLegal(mk({ severity: 'major', determinism: 'heuristic' })));
    assert.doesNotThrow(() => assertSeverityLegal(mk({ severity: 'critical' })));
  });

  it('gateForDeterminism: only structured/deterministic may hard-block', () => {
    assert.equal(gateForDeterminism('heuristic'), 'soft_rank');
    assert.equal(gateForDeterminism('structured_only'), 'hard_blocker');
    assert.equal(gateForDeterminism('deterministic'), 'hard_blocker');
  });
});

describe('confidence: determinism classifier', () => {
  it('§5.2 named offenders are heuristic', () => {
    assert.equal(inferDeterminism('TALKING_HEADS'), 'heuristic');
    assert.equal(inferDeterminism('OPENING_SCENE_UNDERWEIGHT'), 'heuristic');
  });

  it('lexical-flood family is heuristic by morphology', () => {
    for (const r of ['ACTION_ADVERB_FLOOD', 'ACTION_PRONOUN_FLOOD', 'ACTION_MOTION_VERB_MONOTONE',
      'ACTION_PUNCTUATION_DESERT', 'ACTION_LINE_LENGTH_UNIFORMITY', 'ABSTRACT_NOUN_OVERLOAD']) {
      assert.equal(inferDeterminism(r), 'heuristic', `${r} should be heuristic`);
    }
  });

  it('unknown/structural rules default to structured_only (full weight, conservative)', () => {
    assert.equal(inferDeterminism('ABANDONED_GOAL'), 'structured_only');
    assert.equal(inferDeterminism('SCENE_CONTINUITY_COLLAPSE'), 'structured_only');
    assert.equal(inferDeterminism('SOME_UNREVIEWED_RULE'), 'structured_only');
  });

  it('defaultTierFor maps determinism → tier', () => {
    assert.equal(defaultTierFor('deterministic'), 'strong_evidence');
    assert.equal(defaultTierFor('structured_only'), 'worth_a_look');
    assert.equal(defaultTierFor('heuristic'), 'pattern_to_watch');
  });
});

describe('confidence: tier-aware weighting discounts low-confidence findings', () => {
  it('tierMultiplier: absent ⇒ 1.0; pattern_to_watch < worth_a_look < strong_evidence', () => {
    assert.equal(tierMultiplier(undefined), 1.0);
    assert.equal(tierMultiplier('strong_evidence'), 1.0);
    assert.ok(TIER_MULTIPLIER.pattern_to_watch < TIER_MULTIPLIER.worth_a_look);
    assert.ok(TIER_MULTIPLIER.worth_a_look < TIER_MULTIPLIER.strong_evidence);
  });

  it('a wall of heuristic style-minors weighs far less than the same count of structured minors', () => {
    const floods: RevisionIssue[] = Array.from({ length: 19 }, () => mk({ severity: 'minor', determinism: 'heuristic' }));
    const structured: RevisionIssue[] = Array.from({ length: 19 }, () => mk({ severity: 'minor', determinism: 'deterministic' }));
    const floodWeight = weightedIssues(floods, { tierAware: true });
    const structuredWeight = weightedIssues(structured, { tierAware: true });
    assert.equal(weightedIssues(floods), 9.5); // legacy path exact
    assert.ok(floodWeight < structuredWeight, 'heuristic floods must weigh less than structured');
    assert.ok(floodWeight < 9.5, 'tier-aware must discount the flood below legacy');
    near(floodWeight, 3.8);       // 19·0.5·0.4 — epsilon, not exact (IEEE-754)
    near(structuredWeight, 9.5);  // 19·0.5·1.0
  });

  it('explicit confidenceTier overrides the determinism-derived default', () => {
    const issue = mk({ severity: 'major', determinism: 'heuristic', confidenceTier: 'strong_evidence' });
    near(weightedIssues([issue], { tierAware: true }), 1.5); // strong_evidence ⇒ full major weight
  });
});
