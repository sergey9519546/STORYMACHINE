import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessAssertionContainment,
  buildAssertionLedger,
  type Assertion,
} from './assertion-containment.ts';

test('empty assertion list — contained, UNKNOWN', () => {
  const result = assessAssertionContainment([]);
  assert.equal(result.contained, true);
  assert.deepEqual(result.violations, []);
  assert.equal(result.support, 'UNKNOWN');
});

test('null/undefined input — guarded, contained, UNKNOWN', () => {
  assert.equal(assessAssertionContainment(null).support, 'UNKNOWN');
  assert.equal(assessAssertionContainment(undefined).support, 'UNKNOWN');
  assert.equal(assessAssertionContainment(null).contained, true);
});

test('single assertion — nothing to compare, contained, UNKNOWN', () => {
  const assertions: Assertion[] = [
    { id: 'a1', subject: 'the door', predicate: 'is locked', polarity: 'affirm', sceneIndex: 0 },
  ];
  const result = assessAssertionContainment(assertions);
  assert.equal(result.contained, true);
  assert.deepEqual(result.violations, []);
  assert.equal(result.support, 'UNKNOWN');
});

test('fire: affirm then unacknowledged negate on same subject+predicate → violation + CONTRADICTED', () => {
  const assertions: Assertion[] = [
    { id: 'a1', subject: 'the door', predicate: 'is locked', polarity: 'affirm', sceneIndex: 2 },
    { id: 'a2', subject: 'the door', predicate: 'is locked', polarity: 'negate', sceneIndex: 9 },
  ];
  const result = assessAssertionContainment(assertions);
  assert.equal(result.contained, false);
  assert.equal(result.support, 'CONTRADICTED');
  assert.equal(result.violations.length, 1);
  const v = result.violations[0];
  assert.equal(v.subject, 'the door');
  assert.equal(v.predicate, 'is locked');
  assert.equal(v.earlierScene, 2);
  assert.equal(v.laterScene, 9);
  assert.match(v.reason, /contradicted/i);
});

test('no-fire: same contradiction but acknowledgedReversal=true → contained', () => {
  const assertions: Assertion[] = [
    { id: 'a1', subject: 'she', predicate: 'has never lied', polarity: 'affirm', sceneIndex: 1 },
    {
      id: 'a2', subject: 'she', predicate: 'has never lied', polarity: 'negate',
      sceneIndex: 40, acknowledgedReversal: true,
    },
  ];
  const result = assessAssertionContainment(assertions);
  assert.equal(result.contained, true);
  assert.deepEqual(result.violations, []);
  assert.equal(result.support, 'ENTAILED');
});

test('no-fire: two unrelated subject/predicate assertions → contained, ENTAILED', () => {
  const assertions: Assertion[] = [
    { id: 'a1', subject: 'the door', predicate: 'is locked', polarity: 'affirm', sceneIndex: 0 },
    { id: 'a2', subject: 'the island', predicate: 'has no boats', polarity: 'affirm', sceneIndex: 1 },
    { id: 'a3', subject: 'the door', predicate: 'is locked', polarity: 'affirm', sceneIndex: 2 },
    { id: 'a4', subject: 'the island', predicate: 'has no boats', polarity: 'affirm', sceneIndex: 3 },
  ];
  const result = assessAssertionContainment(assertions);
  assert.equal(result.contained, true);
  assert.equal(result.violations.length, 0);
  assert.equal(result.support, 'ENTAILED');
});

test('no-fire: same-polarity repeat (reaffirmation) → contained, no violation', () => {
  const assertions: Assertion[] = [
    { id: 'a1', subject: 'no one', predicate: 'can leave the island', polarity: 'affirm', sceneIndex: 0 },
    { id: 'a2', subject: 'no one', predicate: 'can leave the island', polarity: 'affirm', sceneIndex: 5 },
    { id: 'a3', subject: 'no one', predicate: 'can leave the island', polarity: 'affirm', sceneIndex: 12 },
  ];
  const result = assessAssertionContainment(assertions);
  assert.equal(result.contained, true);
  assert.deepEqual(result.violations, []);
  assert.equal(result.support, 'ENTAILED');
});

test('fire: multiple subjects mixed — one clean, one violating → single violation isolated correctly', () => {
  const assertions: Assertion[] = [
    // Clean pair (island) — should not appear in violations.
    { id: 'a1', subject: 'the island', predicate: 'has no boats', polarity: 'affirm', sceneIndex: 0 },
    { id: 'a2', subject: 'the island', predicate: 'has no boats', polarity: 'affirm', sceneIndex: 10 },
    // Violating pair (door) — unacknowledged contradiction.
    { id: 'a3', subject: 'the door', predicate: 'is locked', polarity: 'affirm', sceneIndex: 1 },
    { id: 'a4', subject: 'the door', predicate: 'is locked', polarity: 'negate', sceneIndex: 8 },
    // Acknowledged reversal pair (her honesty) — not a violation.
    { id: 'a5', subject: 'she', predicate: 'has lied', polarity: 'negate', sceneIndex: 2 },
    { id: 'a6', subject: 'she', predicate: 'has lied', polarity: 'affirm', sceneIndex: 20, acknowledgedReversal: true },
  ];
  const result = assessAssertionContainment(assertions);
  assert.equal(result.contained, false);
  assert.equal(result.support, 'CONTRADICTED');
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].subject, 'the door');
});

test('out-of-order sceneIndex input is re-sorted before comparison', () => {
  // Later-scene assertion appears FIRST in the array; the ledger should
  // still treat sceneIndex 3 as "earlier" than sceneIndex 15.
  const assertions: Assertion[] = [
    { id: 'a1', subject: 'the vault', predicate: 'is sealed', polarity: 'negate', sceneIndex: 15 },
    { id: 'a2', subject: 'the vault', predicate: 'is sealed', polarity: 'affirm', sceneIndex: 3 },
  ];
  const result = assessAssertionContainment(assertions);
  assert.equal(result.contained, false);
  assert.equal(result.violations[0].earlierScene, 3);
  assert.equal(result.violations[0].laterScene, 15);
});

test('malformed entries are guarded/dropped rather than throwing', () => {
  const malformed = [
    null,
    undefined,
    42,
    { id: 'bad', subject: '', predicate: 'is locked', polarity: 'affirm', sceneIndex: 0 },
    { id: 'bad2', subject: 'the door', predicate: 'is locked', polarity: 'sideways', sceneIndex: 0 },
    { id: 'bad3', subject: 'the door', predicate: 'is locked', polarity: 'affirm', sceneIndex: -1 },
    { id: 'ok1', subject: 'the door', predicate: 'is locked', polarity: 'affirm', sceneIndex: 0 },
  ];
  const result = assessAssertionContainment(malformed as unknown[]);
  assert.equal(result.contained, true);
  assert.equal(result.support, 'UNKNOWN'); // only one valid assertion survives — singleton group
});

test('duplicate ids are tolerated without throwing', () => {
  const assertions: Assertion[] = [
    { id: 'dup', subject: 'the gate', predicate: 'is open', polarity: 'affirm', sceneIndex: 0 },
    { id: 'dup', subject: 'the gate', predicate: 'is open', polarity: 'negate', sceneIndex: 1 },
  ];
  const result = assessAssertionContainment(assertions);
  assert.equal(result.contained, false);
  assert.equal(result.violations.length, 1);
});

test('buildAssertionLedger: guards non-array input', () => {
  assert.deepEqual(buildAssertionLedger(null), []);
  assert.deepEqual(buildAssertionLedger(undefined), []);
  assert.deepEqual(buildAssertionLedger([]), []);
});

test('buildAssertionLedger: seeds assertions from simple cue patterns', () => {
  const scenes = [
    'JOHN\nThe door is locked tonight.',
    "MARY\nNo one can leave the island.",
  ];
  const seeded = buildAssertionLedger(scenes);
  assert.ok(seeded.length > 0);
  for (const a of seeded) {
    assert.equal(typeof a.id, 'string');
    assert.ok(a.sceneIndex === 0 || a.sceneIndex === 1);
    assert.ok(a.polarity === 'affirm' || a.polarity === 'negate');
  }
  // Round-trip through the containment assessor without throwing.
  const result = assessAssertionContainment(seeded);
  assert.equal(typeof result.contained, 'boolean');
});
