import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessFairReveal,
  buildDisclosureLedger,
  type DisclosureEvent,
} from './disclosure-ledger.ts';

// ---------------------------------------------------------------------------
// Rule: fair case (no-fire baseline)
// ---------------------------------------------------------------------------

test('fair reveal: setup precedes payoff in discourse order -> fair, ENTAILED, no violations', () => {
  const events: DisclosureEvent[] = [
    { factId: 'gun-in-drawer', storyTimeIndex: 0, discourseIndex: 0, kind: 'setup' },
    { factId: 'gun-in-drawer', storyTimeIndex: 5, discourseIndex: 5, kind: 'payoff' },
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, true);
  assert.deepEqual(result.violations, []);
  assert.equal(result.support, 'ENTAILED');
});

test('fair reveal: multiple independent facts all properly set up -> fair', () => {
  const events: DisclosureEvent[] = [
    { factId: 'A', storyTimeIndex: 0, discourseIndex: 0, kind: 'setup' },
    { factId: 'A', storyTimeIndex: 3, discourseIndex: 3, kind: 'reveal' },
    { factId: 'B', storyTimeIndex: 1, discourseIndex: 1, kind: 'setup' },
    { factId: 'B', storyTimeIndex: 4, discourseIndex: 4, kind: 'payoff' },
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, true);
  assert.equal(result.violations.length, 0);
  assert.equal(result.support, 'ENTAILED');
});

// ---------------------------------------------------------------------------
// Rule: payoff-before-setup (fire + no-fire)
// ---------------------------------------------------------------------------

test('payoff-before-setup FIRES when payoff discourseIndex precedes setup discourseIndex', () => {
  const events: DisclosureEvent[] = [
    { factId: 'poison', storyTimeIndex: 2, discourseIndex: 0, kind: 'payoff' },
    { factId: 'poison', storyTimeIndex: 0, discourseIndex: 5, kind: 'setup' },
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, false);
  assert.equal(result.support, 'CONTRADICTED');
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].kind, 'payoff-before-setup');
  assert.equal(result.violations[0].factId, 'poison');
});

test('payoff-before-setup FIRES on exact discourse-index tie (setup does not strictly precede)', () => {
  const events: DisclosureEvent[] = [
    { factId: 'sameScene', storyTimeIndex: 0, discourseIndex: 2, kind: 'setup' },
    { factId: 'sameScene', storyTimeIndex: 0, discourseIndex: 2, kind: 'reveal' },
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, false);
  assert.equal(result.violations[0].kind, 'payoff-before-setup');
});

test('payoff-before-setup DOES NOT FIRE when setup strictly precedes payoff', () => {
  const events: DisclosureEvent[] = [
    { factId: 'poison', storyTimeIndex: 0, discourseIndex: 1, kind: 'setup' },
    { factId: 'poison', storyTimeIndex: 2, discourseIndex: 4, kind: 'payoff' },
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, true);
  assert.equal(result.violations.length, 0);
});

// ---------------------------------------------------------------------------
// Rule: missing-setup / unwithdrawable-twist (fire + no-fire)
// ---------------------------------------------------------------------------

test('unwithdrawable-twist FIRES when a reveal has no setup event anywhere', () => {
  const events: DisclosureEvent[] = [
    { factId: 'secret-sibling', storyTimeIndex: 0, discourseIndex: 0, kind: 'reveal' },
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, false);
  assert.equal(result.support, 'CONTRADICTED');
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].kind, 'unwithdrawable-twist');
  assert.equal(result.violations[0].factId, 'secret-sibling');
});

test('unwithdrawable-twist DOES NOT FIRE when the reveal has a matching setup', () => {
  const events: DisclosureEvent[] = [
    { factId: 'secret-sibling', storyTimeIndex: 0, discourseIndex: 0, kind: 'setup' },
    { factId: 'secret-sibling', storyTimeIndex: 5, discourseIndex: 5, kind: 'reveal' },
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, true);
  assert.equal(result.violations.length, 0);
});

test('unwithdrawable-twist FIRES for a payoff (not just kind reveal) with no setup', () => {
  const events: DisclosureEvent[] = [
    { factId: 'inheritance', storyTimeIndex: 3, discourseIndex: 3, kind: 'payoff' },
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, false);
  assert.equal(result.violations[0].kind, 'unwithdrawable-twist');
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test('empty events list -> fair with UNKNOWN support (nothing to entail or contradict)', () => {
  const result = assessFairReveal([]);
  assert.equal(result.fair, true);
  assert.deepEqual(result.violations, []);
  assert.equal(result.support, 'UNKNOWN');
});

test('setup-only ledger (no payoff/reveal at all) -> fair with UNKNOWN support', () => {
  const events: DisclosureEvent[] = [
    { factId: 'A', storyTimeIndex: 0, discourseIndex: 0, kind: 'setup' },
    { factId: 'B', storyTimeIndex: 1, discourseIndex: 1, kind: 'setup' },
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, true);
  assert.equal(result.support, 'UNKNOWN');
});

test('single event (lone payoff) -> unwithdrawable-twist, not a crash', () => {
  const events: DisclosureEvent[] = [
    { factId: 'lone', storyTimeIndex: 0, discourseIndex: 0, kind: 'payoff' },
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, false);
  assert.equal(result.violations.length, 1);
});

test('duplicate setups for the same fact: only the earliest discourse setup counts', () => {
  const events: DisclosureEvent[] = [
    { factId: 'dup', storyTimeIndex: 0, discourseIndex: 3, kind: 'setup' },
    { factId: 'dup', storyTimeIndex: 0, discourseIndex: 1, kind: 'setup' }, // earlier, duplicate
    { factId: 'dup', storyTimeIndex: 5, discourseIndex: 2, kind: 'payoff' }, // between the two setups
  ];
  const result = assessFairReveal(events);
  // earliest setup discourseIndex is 1, payoff at 2 comes after it -> fair
  assert.equal(result.fair, true);
  assert.equal(result.violations.length, 0);
});

test('reveal with multiple setups: fair if payoff is after the earliest one, even if after a later one too', () => {
  const events: DisclosureEvent[] = [
    { factId: 'multi', storyTimeIndex: 0, discourseIndex: 0, kind: 'setup' },
    { factId: 'multi', storyTimeIndex: 1, discourseIndex: 2, kind: 'setup' },
    { factId: 'multi', storyTimeIndex: 5, discourseIndex: 1, kind: 'reveal' }, // after first setup, before second
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, true);
  assert.equal(result.violations.length, 0);
});

test('multiple facts: one fair and one unfair -> overall unfair, only the bad fact reported', () => {
  const events: DisclosureEvent[] = [
    { factId: 'good', storyTimeIndex: 0, discourseIndex: 0, kind: 'setup' },
    { factId: 'good', storyTimeIndex: 3, discourseIndex: 3, kind: 'payoff' },
    { factId: 'bad', storyTimeIndex: 0, discourseIndex: 4, kind: 'reveal' }, // no setup
  ];
  const result = assessFairReveal(events);
  assert.equal(result.fair, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].factId, 'bad');
});

test('malformed events (missing fields, wrong types, out-of-range indices) are dropped, not thrown', () => {
  const events = [
    { factId: 'ok', storyTimeIndex: 0, discourseIndex: 0, kind: 'setup' },
    { factId: 'ok', storyTimeIndex: 1, discourseIndex: 1, kind: 'payoff' },
    { factId: '', storyTimeIndex: 0, discourseIndex: 0, kind: 'setup' }, // empty factId
    { factId: 'bad-idx', storyTimeIndex: -1, discourseIndex: 0, kind: 'setup' }, // negative
    { factId: 'bad-idx2', storyTimeIndex: 1.5, discourseIndex: 0, kind: 'setup' }, // non-integer
    { factId: 'bad-kind', storyTimeIndex: 0, discourseIndex: 0, kind: 'nonsense' }, // bad kind
    null,
    undefined,
    'not-an-object',
    { factId: 'lonely-payoff' }, // missing required fields entirely
  ] as unknown as DisclosureEvent[];
  const result = assessFairReveal(events);
  assert.equal(result.fair, true);
  assert.equal(result.violations.length, 0);
  assert.equal(result.support, 'ENTAILED');
});

test('non-array input is treated as empty (guarded, no throw)', () => {
  const result = assessFairReveal(undefined as unknown as DisclosureEvent[]);
  assert.equal(result.fair, true);
  assert.equal(result.support, 'UNKNOWN');
});

// ---------------------------------------------------------------------------
// buildDisclosureLedger heuristic seed
// ---------------------------------------------------------------------------

test('buildDisclosureLedger: empty/whitespace fountain -> no events', () => {
  assert.deepEqual(buildDisclosureLedger(''), []);
  assert.deepEqual(buildDisclosureLedger('   \n  '), []);
});

test('buildDisclosureLedger: non-string input is guarded to empty array', () => {
  assert.deepEqual(buildDisclosureLedger(undefined as unknown as string), []);
});

test('buildDisclosureLedger: extracts setup and reveal cues per scene, feeding a usable ledger', () => {
  const fountain = [
    'INT. KITCHEN - DAY',
    'Mom hints at a family secret to Sarah.',
    '',
    'EXT. PARK - LATER',
    'Nothing much happens here.',
    '',
    'INT. ATTIC - NIGHT',
    'The twist is finally revealed: Sarah is adopted.',
  ].join('\n');
  const events = buildDisclosureLedger(fountain);
  assert.ok(events.some(e => e.kind === 'setup'));
  assert.ok(events.some(e => e.kind === 'reveal'));
  // Feed straight into the fairness assessor without throwing.
  const result = assessFairReveal(events);
  assert.ok(typeof result.fair === 'boolean');
});
