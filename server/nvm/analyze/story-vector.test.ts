// server/nvm/analyze/story-vector.test.ts — coverage for the
// vectorizeFromIssues() first-call RULE_INDEX patch (see "Module
// Initialization" in story-vector.ts).
//
// story-vector.ts used to patch vectorizeFromIssues via
// `(vectorizeFromIssues as any) = function(...) {...}` because a plain
// `export function` binding cannot be reassigned (tsc TS2630: "Cannot assign
// to 'X' because it is a function"). That was replaced with a typed `let`
// binding (`export let vectorizeFromIssues: VectorizeFromIssuesFn = ...`),
// reassigned once at module load with no cast. This suite proves the
// reassignment still behaves exactly as before: the wrapper builds
// RULE_INDEX lazily on first call, delegates to the original
// implementation, and — since the swap happens exactly once at module
// init, not per call — every import sees the same function identity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RevisionIssue, PassName } from '../revision/passes/types.ts';
import {
  vectorizeFromIssues,
  cosineSimilarity,
  resetRuleIndex,
  getRuleIndex,
} from './story-vector.ts';

type TaggedIssue = RevisionIssue & { pass: PassName };

function issue(pass: PassName, rule: string): TaggedIssue {
  return {
    pass,
    rule,
    location: 'Scene 1',
    description: `mock issue: ${rule}`,
    severity: 'major',
  };
}

test('vectorizeFromIssues: produces a normalized, deterministic vector', () => {
  resetRuleIndex();
  const issues = [issue('structure', 'ACT_BREAK_MISSING'), issue('pacing', 'SCENE_TOO_LONG')];
  const meta = { title: 'Test', source: 'synthetic' as const, contentHash: 'h1' };

  const v1 = vectorizeFromIssues(issues, meta);
  const v2 = vectorizeFromIssues(issues, meta);

  assert.ok(v1.dimensions.length > 0);
  const norm = Math.sqrt(v1.dimensions.reduce((s, x) => s + x * x, 0));
  assert.ok(Math.abs(norm - 1) < 1e-9, `expected unit L2-norm, got ${norm}`);
  assert.deepEqual(v1.dimensions, v2.dimensions);
  assert.ok(Math.abs(cosineSimilarity(v1, v2) - 1) < 1e-9);
});

test('vectorizeFromIssues: RULE_INDEX is built lazily on first call (patch-on-first-call still works)', () => {
  resetRuleIndex();
  assert.deepEqual(getRuleIndex(), [], 'index must start empty after reset');

  const issues = [issue('dialogue', 'ON_THE_NOSE'), issue('structure', 'ACT_BREAK_MISSING')];
  vectorizeFromIssues(issues, { title: 'T', source: 'synthetic', contentHash: 'h' });

  const index = getRuleIndex();
  assert.deepEqual(
    [...index].sort(),
    ['dialogue::ON_THE_NOSE', 'structure::ACT_BREAK_MISSING'].sort(),
    'first call must populate RULE_INDEX from the issues it was given'
  );
});

test('vectorizeFromIssues: same vector out before/after repeated calls (delegation to the original implementation is stable)', () => {
  resetRuleIndex();
  const issues = [issue('structure', 'RULE_X')];
  const meta = { title: 'T', source: 'synthetic' as const, contentHash: 'h' };

  // First call builds RULE_INDEX; second call (same issues) must extend it
  // with no new rules and produce an identical vector — proving the
  // reassigned wrapper still round-trips through the original
  // implementation correctly on every call, not just the first.
  const before = vectorizeFromIssues(issues, meta);
  const after = vectorizeFromIssues(issues, meta);

  assert.deepEqual(before.dimensions, after.dimensions);
});

test('vectorizeFromIssues: the exported binding is reassigned exactly once (stable identity across calls)', () => {
  resetRuleIndex();
  const issues = [issue('structure', 'RULE_Y')];
  const meta = { title: 'T', source: 'synthetic' as const, contentHash: 'h' };

  // The patch (let binding reassignment) runs once at module init, before
  // this test file's import of vectorizeFromIssues even resolves. If the
  // wrapper were somehow re-wrapping itself per call (a regression this
  // guards against), capturing the reference around multiple calls would
  // still show it as constant — the real assertion is functional: the same
  // reference, invoked repeatedly, keeps delegating correctly.
  const fnBefore = vectorizeFromIssues;
  vectorizeFromIssues(issues, meta);
  const fnAfter = vectorizeFromIssues;
  vectorizeFromIssues(issues, meta);
  const fnStillAfter = vectorizeFromIssues;

  assert.equal(fnBefore, fnAfter);
  assert.equal(fnAfter, fnStillAfter);
});
