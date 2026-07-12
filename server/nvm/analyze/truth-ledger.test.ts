import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TruthLedger,
  FACT_STATUSES,
  CANON_TIERS,
  EPISTEMIC_LAYERS,
} from './truth-ledger.ts';

// Verbatim port of OWNE's tests/test_truth.py (Truth Ledger + FactTrack
// temporal contradiction detection).

// --- Constants ---
test('all 13 statuses exist', () => {
  assert.equal(FACT_STATUSES.size, 13);
  for (const s of ['true', 'false', 'unknown', 'suspected', 'disputed', 'planted',
    'forged', 'misremembered', 'suppressed', 'retconned', 'symbolically_true',
    'literally_false', 'unverified']) {
    assert.ok(FACT_STATUSES.has(s), s);
  }
});

test('all 11 tiers exist in order', () => {
  assert.equal(CANON_TIERS.length, 11);
  assert.deepEqual([...CANON_TIERS], ['hard_canon', 'soft_canon', 'provisional',
    'character_belief', 'rumor', 'player_theory', 'discarded_draft',
    'alternate_branch', 'brainstorm_only', 'author_note', 'plugin_suggestion']);
});

test('all 8 epistemic layers', () => {
  assert.equal(EPISTEMIC_LAYERS.size, 8);
  for (const l of ['objective_world', 'character_belief', 'audience_belief',
    'author_intent', 'rumor', 'lie', 'memory', 'prediction']) {
    assert.ok(EPISTEMIC_LAYERS.has(l), l);
  }
});

// --- Fact defaults ---
test('add fact: defaults', () => {
  const l = new TruthLedger();
  const f = l.add('alice killed bob', { step: 1 });
  assert.equal(f.id, 'T0001');
  assert.equal(f.proposition, 'alice killed bob');
  assert.equal(f.status, 'true');
  assert.equal(f.canonTier, 'hard_canon');
  assert.equal(f.epistemicLayer, 'objective_world');
  assert.equal(f.confidence, 1.0);
  assert.deepEqual(f.evidenceIds, []);
  assert.deepEqual(f.causedByEventIds, []);
  assert.equal(f.firstTrueAtStep, 1);
  assert.equal(f.visibleToPlayer, false);
  assert.equal(l.count(), 1);
});

test('add multiple: sequential ids', () => {
  const l = new TruthLedger();
  assert.equal(l.add('a').id, 'T0001');
  assert.equal(l.add('b').id, 'T0002');
  assert.equal(l.count(), 2);
});

test('add custom status/tier, evidence, cause, triple, layer', () => {
  const l = new TruthLedger();
  const f = l.add('suspected', { status: 'suspected', canonTier: 'rumor' });
  assert.equal(f.status, 'suspected');
  assert.equal(f.canonTier, 'rumor');
  assert.deepEqual(l.add('e', { evidenceIds: ['E1', 'E2'] }).evidenceIds, ['E1', 'E2']);
  assert.deepEqual(l.add('c', { causedBy: ['EVT01'] }).causedByEventIds, ['EVT01']);
  const t = l.add('alice alive', { step: 1, subject: 'alice', predicate: 'status', obj: 'alive' });
  assert.equal(t.subject, 'alice');
  assert.equal(t.predicate, 'status');
  assert.equal(t.object, 'alive');
  assert.equal(l.add('bob lies', { epistemicLayer: 'lie' }).epistemicLayer, 'lie');
});

test('validity interval defaults + explicit', () => {
  const l = new TruthLedger();
  const f = l.add('x', { step: 7 });
  assert.equal(f.validFromStep, 7);
  assert.equal(f.validUntilStep, null);
  const g = l.add('event', { step: 5, validFromStep: 3, validUntilStep: 10 });
  assert.equal(g.validFromStep, 3);
  assert.equal(g.validUntilStep, 10);
});

// --- Expire ---
test('expire sets until; missing returns null', () => {
  const l = new TruthLedger();
  const f = l.add('alice', { subject: 'alice', predicate: 'status', obj: 'alive' });
  l.expire(f.id, 5);
  assert.equal(f.validUntilStep, 5);
  assert.equal(l.expire('T9999', 5), null);
});

// --- Query / get ---
test('query by status / tier / both / layer / subject / predicate', () => {
  const l = new TruthLedger();
  l.add('a', { status: 'true', canonTier: 'hard_canon' });
  l.add('b', { status: 'true', canonTier: 'rumor' });
  l.add('c', { status: 'false', canonTier: 'rumor' });
  assert.equal(l.query({ status: 'true' }).length, 2);
  assert.equal(l.query({ canonTier: 'rumor' }).length, 2);
  assert.equal(l.query({ status: 'true', canonTier: 'rumor' }).length, 1);
});

test('query empty', () => {
  assert.deepEqual(new TruthLedger().query({ status: 'true' }), []);
});

test('query by layer/subject/predicate', () => {
  const l = new TruthLedger();
  l.add('a', { subject: 'alice', predicate: 'status', obj: 'alive', epistemicLayer: 'objective_world' });
  l.add('b', { subject: 'bob', predicate: 'role', obj: 'spy', epistemicLayer: 'lie' });
  assert.equal(l.query({ epistemicLayer: 'lie' }).length, 1);
  assert.equal(l.query({ subject: 'alice' }).length, 1);
  assert.equal(l.query({ predicate: 'status' }).length, 1);
});

test('get existing / missing', () => {
  const l = new TruthLedger();
  const f = l.add('t');
  assert.equal(l.get(f.id), f);
  assert.equal(l.get('T9999'), null);
});

// --- Retcon / promote / count ---
test('retcon changes status; missing null', () => {
  const l = new TruthLedger();
  const f = l.add('alice alive', { status: 'true' });
  const r = l.retcon(f.id, 'retconned', 10);
  assert.equal(r?.status, 'retconned');
  assert.equal(r?.firstTrueAtStep, 10);
  assert.equal(l.retcon('T9999', 'false', 0), null);
});

test('promote hard->soft, pipeline, max, missing', () => {
  const l = new TruthLedger();
  assert.equal(l.promote(l.add('t', { canonTier: 'hard_canon' }).id)?.canonTier, 'soft_canon');
  const f = l.add('t2', { canonTier: 'brainstorm_only' });
  l.promote(f.id);
  assert.equal(f.canonTier, 'author_note');
  l.promote(f.id);
  assert.equal(f.canonTier, 'plugin_suggestion');
  const g = l.add('t3', { canonTier: 'plugin_suggestion' });
  assert.equal(l.promote(g.id)?.canonTier, 'plugin_suggestion');
  assert.equal(l.promote('T9999'), null);
});

test('count empty / nonempty', () => {
  assert.equal(new TruthLedger().count(), 0);
  const l = new TruthLedger();
  l.add('a'); l.add('b'); l.add('c');
  assert.equal(l.count(), 3);
});

// --- Interval overlap ---
test('interval overlap cases', () => {
  assert.deepEqual(TruthLedger.intervalOverlap(0, 10, 5, 15), [5, 10]);
  assert.deepEqual(TruthLedger.intervalOverlap(0, 5, 5, 10), [5, 5]);
  assert.equal(TruthLedger.intervalOverlap(0, 3, 5, 10), null);
  assert.deepEqual(TruthLedger.intervalOverlap(0, null, 5, 10), [5, 10]);
  assert.deepEqual(TruthLedger.intervalOverlap(0, null, 0, null), [0, 1_000_000_000]);
  assert.deepEqual(TruthLedger.intervalOverlap(3, 7, 3, 7), [3, 7]);
});

// --- FactTrack contradiction detection ---
test('no contradiction: same object', () => {
  const l = new TruthLedger();
  l.add('alice alive', { subject: 'alice', predicate: 'status', obj: 'alive', step: 0 });
  l.add('alice alive again', { subject: 'alice', predicate: 'status', obj: 'alive', step: 5 });
  assert.deepEqual(l.detectContradictions(), []);
});

test('contradiction detected', () => {
  const l = new TruthLedger();
  l.add('alice alive', { subject: 'alice', predicate: 'status', obj: 'alive', step: 0 });
  l.add('alice dead', { subject: 'alice', predicate: 'status', obj: 'dead', step: 3 });
  const c = l.detectContradictions();
  assert.equal(c.length, 1);
  assert.equal(c[0].subject, 'alice');
  assert.equal(c[0].predicate, 'status');
  assert.equal(c[0].epistemicLayer, 'objective_world');
});

test('no contradiction: different layer', () => {
  const l = new TruthLedger();
  l.add('a', { subject: 'alice', predicate: 'status', obj: 'alive', epistemicLayer: 'objective_world' });
  l.add('b', { subject: 'alice', predicate: 'status', obj: 'dead', epistemicLayer: 'character_belief' });
  assert.deepEqual(l.detectContradictions(), []);
});

test('no contradiction: non-overlapping (expired before)', () => {
  const l = new TruthLedger();
  const f1 = l.add('alice alive', { subject: 'alice', predicate: 'status', obj: 'alive', step: 0, validFromStep: 0 });
  l.expire(f1.id, 3);
  l.add('alice dead', { subject: 'alice', predicate: 'status', obj: 'dead', step: 5, validFromStep: 5 });
  assert.deepEqual(l.detectContradictions(), []);
});

test('no contradiction: transition event explains change', () => {
  const l = new TruthLedger();
  l.add('alice alive', { subject: 'alice', predicate: 'status', obj: 'alive', step: 0 });
  l.add('alice dead', { subject: 'alice', predicate: 'status', obj: 'dead', step: 3 });
  l.registerTransitionEvent('alice', 'status', 'EVT_KILLED');
  assert.deepEqual(l.detectContradictions(), []);
});

test('no contradiction: different predicate / different subject', () => {
  const l = new TruthLedger();
  l.add('alice alive', { subject: 'alice', predicate: 'status', obj: 'alive' });
  l.add('alice spy', { subject: 'alice', predicate: 'role', obj: 'spy' });
  assert.deepEqual(l.detectContradictions(), []);
  const l2 = new TruthLedger();
  l2.add('alice alive', { subject: 'alice', predicate: 'status', obj: 'alive' });
  l2.add('bob dead', { subject: 'bob', predicate: 'status', obj: 'dead' });
  assert.deepEqual(l2.detectContradictions(), []);
});

test('multiple contradictions: C(3,2)=3', () => {
  const l = new TruthLedger();
  l.add('a', { subject: 'x', predicate: 'p', obj: 'v1', step: 0 });
  l.add('b', { subject: 'x', predicate: 'p', obj: 'v2', step: 1 });
  l.add('c', { subject: 'x', predicate: 'p', obj: 'v3', step: 2 });
  assert.equal(l.detectContradictions().length, 3);
});

test('contradictions respect epistemic-layer grouping', () => {
  const l = new TruthLedger();
  l.add('a', { subject: 'x', predicate: 'p', obj: 'v1', epistemicLayer: 'objective_world' });
  l.add('b', { subject: 'x', predicate: 'p', obj: 'v2', epistemicLayer: 'rumor' });
  l.add('c', { subject: 'x', predicate: 'p', obj: 'v3', epistemicLayer: 'objective_world' });
  assert.equal(l.detectContradictions().length, 1);
});

test('partial overlap interval reported', () => {
  const l = new TruthLedger();
  l.add('a', { subject: 'x', predicate: 'p', obj: 'v1', step: 0, validFromStep: 0, validUntilStep: 10 });
  l.add('b', { subject: 'x', predicate: 'p', obj: 'v2', step: 5, validFromStep: 5, validUntilStep: 15 });
  const c = l.detectContradictions();
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].overlappingInterval, [5, 10]);
});

test('unstructured facts skipped', () => {
  const l = new TruthLedger();
  l.add('some proposition');
  l.add('another proposition');
  assert.deepEqual(l.detectContradictions(), []);
});

test('contradiction reason contains details', () => {
  const l = new TruthLedger();
  l.add('a', { subject: 'alice', predicate: 'status', obj: 'alive', step: 0 });
  l.add('b', { subject: 'alice', predicate: 'status', obj: 'dead', step: 2 });
  const reason = l.detectContradictions()[0].reason;
  assert.ok(reason.includes('alive'));
  assert.ok(reason.includes('dead'));
  assert.ok(reason.includes('objective_world'));
});

test('register transition event stores in order', () => {
  const l = new TruthLedger();
  l.registerTransitionEvent('alice', 'status', 'EVT1');
  l.registerTransitionEvent('alice', 'status', 'EVT2');
  assert.deepEqual(l.transitionEventsFor('alice', 'status'), ['EVT1', 'EVT2']);
});
