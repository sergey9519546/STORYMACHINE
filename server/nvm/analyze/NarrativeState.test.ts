import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NarrativeState } from './NarrativeState.ts';

// Verbatim port of OWNE's tests/test_state.py (TDD cases for NCPState),
// plus a few TS-specific guards for the empty-path and default-container
// behaviors the Python suite relied on implicitly.

// --- Create ---
test('create empty: default containers present', () => {
  const s = new NarrativeState();
  assert.deepEqual(s.query('ledgers'), {});
  assert.deepEqual(s.query('graphs'), {});
  assert.deepEqual(s.query('characters'), {});
});

test('create with initial data', () => {
  const s = new NarrativeState({
    'ledgers.truth': { facts: {} },
    'characters.alice': { alive: true, location: 'hall' },
  });
  assert.deepEqual(s.query('ledgers.truth'), { facts: {} });
  assert.equal(s.query('characters.alice.alive'), true);
});

test('set and get', () => {
  const s = new NarrativeState();
  s.set('ledgers.truth.facts.F001', 'the door was locked');
  assert.equal(s.query('ledgers.truth.facts.F001'), 'the door was locked');
});

test('set nested auto-create', () => {
  const s = new NarrativeState();
  s.set('a.b.c.d', 42);
  assert.equal(s.query('a.b.c.d'), 42);
});

// --- Query ---
test('query missing returns null (Python None)', () => {
  const s = new NarrativeState();
  assert.equal(s.query('nonexistent.path'), null);
});

test('query default value', () => {
  const s = new NarrativeState();
  assert.equal(s.query('missing', 'fallback'), 'fallback');
});

test('query dict subtree', () => {
  const s = new NarrativeState({ 'characters.alice': { hp: 10, mp: 5 } });
  assert.deepEqual(s.query('characters.alice'), { hp: 10, mp: 5 });
});

test('query list value', () => {
  const s = new NarrativeState({ 'graphs.causal.edges': ['E1', 'E2'] });
  assert.deepEqual(s.query('graphs.causal.edges'), ['E1', 'E2']);
});

test('query integer value', () => {
  const s = new NarrativeState({ 'meta.step': 7 });
  assert.equal(s.query('meta.step'), 7);
});

test('query intermediate path', () => {
  const s = new NarrativeState({ 'characters.alice.stats.hp': 10 });
  assert.deepEqual(s.query('characters.alice.stats'), { hp: 10 });
});

test('query empty path returns whole state', () => {
  const s = new NarrativeState({ 'a.b': 1 });
  const whole = s.query('');
  assert.equal((whole as Record<string, unknown>).ledgers !== undefined, true);
  assert.deepEqual((whole as Record<string, Record<string, unknown>>).a, { b: 1 });
});

// --- Snapshot / restore ---
test('snapshot returns object', () => {
  const s = new NarrativeState({ a: 1, b: { c: 2 } });
  const snap = s.snapshot();
  assert.equal(typeof snap, 'object');
  assert.equal(snap.a, 1);
  assert.equal(snap.b.c, 2);
});

test('snapshot is independent copy', () => {
  const s = new NarrativeState({ a: 1 });
  const snap = s.snapshot();
  s.set('a', 999);
  assert.equal(snap.a, 1);
});

test('restore from snapshot', () => {
  const s = new NarrativeState({ x: 10 });
  const snap = s.snapshot();
  s.set('x', 20);
  s.set('y', 30);
  s.restore(snap);
  assert.equal(s.query('x'), 10);
  assert.equal(s.query('y'), null);
});

test('snapshot restore roundtrip', () => {
  const data = {
    'ledgers.truth': { F001: 'locked door' },
    'characters.bob': { alive: true, location: 'kitchen' },
    'graphs.social': { 'alice->bob': { trust: 0.8 } },
  };
  const s = new NarrativeState(data);
  const snap = s.snapshot();
  s.set('characters.bob.alive', false);
  s.set('new.thing', 'added');
  s.restore(snap);
  assert.equal(s.query('characters.bob.alive'), true);
  assert.equal(s.query('new.thing'), null);
});

test('multiple snapshots', () => {
  const s = new NarrativeState({ v: 1 });
  const snap1 = s.snapshot();
  s.set('v', 2);
  const snap2 = s.snapshot();
  s.set('v', 3);
  s.restore(snap1);
  assert.equal(s.query('v'), 1);
  s.restore(snap2);
  assert.equal(s.query('v'), 2);
});

// --- Merge ---
test('merge adds new keys', () => {
  const s = new NarrativeState({ a: 1 });
  s.merge({ b: 2 });
  assert.equal(s.query('a'), 1);
  assert.equal(s.query('b'), 2);
});

test('merge overwrites existing', () => {
  const s = new NarrativeState({ a: 1, b: { c: 10 } });
  s.merge({ a: 99, b: { c: 20 } });
  assert.equal(s.query('a'), 99);
  assert.equal(s.query('b.c'), 20);
});

test('merge deep', () => {
  const s = new NarrativeState({ 'characters.alice': { hp: 10 } });
  s.merge({ 'characters.alice': { mp: 5 }, 'characters.bob': { hp: 8 } });
  assert.equal(s.query('characters.alice.hp'), 10);
  assert.equal(s.query('characters.alice.mp'), 5);
  assert.equal(s.query('characters.bob.hp'), 8);
});

test('merge with null overwrites', () => {
  const s = new NarrativeState({ a: 1, b: 2 });
  s.merge({ a: null });
  assert.equal(s.query('a'), null);
});

// --- Diff ---
test('diff added', () => {
  const s1 = new NarrativeState({ a: 1 });
  const s2 = new NarrativeState({ a: 1, b: 2 });
  const d = s1.diff(s2);
  assert.deepEqual(d.added, { b: 2 });
  assert.deepEqual(d.removed, {});
  assert.deepEqual(d.changed, {});
});

test('diff removed', () => {
  const s1 = new NarrativeState({ a: 1, b: 2 });
  const s2 = new NarrativeState({ a: 1 });
  const d = s1.diff(s2);
  assert.deepEqual(d.removed, { b: 2 });
  assert.deepEqual(d.added, {});
});

test('diff changed', () => {
  const s1 = new NarrativeState({ a: 1 });
  const s2 = new NarrativeState({ a: 99 });
  const d = s1.diff(s2);
  assert.deepEqual(d.changed, { a: [1, 99] });
});

test('diff no change', () => {
  const s1 = new NarrativeState({ a: 1, b: { c: 2 } });
  const s2 = new NarrativeState({ a: 1, b: { c: 2 } });
  const d = s1.diff(s2);
  assert.deepEqual(d.added, {});
  assert.deepEqual(d.removed, {});
  assert.deepEqual(d.changed, {});
});

test('diff nested changes', () => {
  const s1 = new NarrativeState({ 'chars.alice': { hp: 10 } });
  const s2 = new NarrativeState({ 'chars.alice': { hp: 5 } });
  const d = s1.diff(s2);
  assert.deepEqual(d.changed['chars.alice.hp'], [10, 5]);
});

test('diff compares array leaves by value (not reference)', () => {
  const s1 = new NarrativeState({ 'g.edges': ['E1', 'E2'] });
  const s2 = new NarrativeState({ 'g.edges': ['E1', 'E2'] });
  assert.deepEqual(s1.diff(s2).changed, {});
  const s3 = new NarrativeState({ 'g.edges': ['E1', 'E3'] });
  assert.deepEqual(s1.diff(s3).changed['g.edges'], [['E1', 'E2'], ['E1', 'E3']]);
});

// --- Delete ---
test('delete key', () => {
  const s = new NarrativeState({ a: 1, b: 2 });
  s.delete('b');
  assert.equal(s.query('b'), null);
  assert.equal(s.query('a'), 1);
});

test('delete nested', () => {
  const s = new NarrativeState({ 'characters.alice.hp': 10, 'characters.alice.mp': 5 });
  s.delete('characters.alice.hp');
  assert.equal(s.query('characters.alice.hp'), null);
  assert.equal(s.query('characters.alice.mp'), 5);
});

test('delete nonexistent no error', () => {
  const s = new NarrativeState({ a: 1 });
  s.delete('nonexistent');
  assert.equal(s.query('a'), 1);
});

// --- Guards (TS-specific) ---
test('guards: empty-path set is a no-op; snapshot independence holds', () => {
  const s = new NarrativeState({ a: 1 });
  s.set('', 'ignored');
  s.set('   ', 'ignored');
  assert.equal(s.query('a'), 1);
  const snap = s.snapshot();
  s.set('a', 2);
  assert.equal(snap.a, 1);
});
