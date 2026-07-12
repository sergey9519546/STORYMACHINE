import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessTypedPromises, type PromiseEvent } from './typed-promises.ts';

test('plant followed by a later payoff is kept, and full ledger is ENTAILED at 100%', () => {
  const events: PromiseEvent[] = [
    { id: 'gun-1', type: 'chekhov_object', role: 'plant', sceneIndex: 2 },
    { id: 'gun-1', type: 'chekhov_object', role: 'payoff', sceneIndex: 20 },
  ];
  const report = assessTypedPromises(events);
  assert.equal(report.scored, true);
  assert.deepEqual(report.kept, ['gun-1']);
  assert.deepEqual(report.unkept, []);
  assert.deepEqual(report.unplantedPayoffs, []);
  assert.equal(report.keptRatio, 1);
  assert.equal(report.strength, 1);
  assert.equal(report.support, 'ENTAILED');
  assert.deepEqual(report.byType.chekhov_object, { planted: 1, kept: 1 });
});

test('plant with no payoff is unkept, and the ledger is UNKNOWN (no violations)', () => {
  const events: PromiseEvent[] = [
    { id: 'goal-1', type: 'stated_goal', role: 'plant', sceneIndex: 3 },
  ];
  const report = assessTypedPromises(events);
  assert.equal(report.scored, true);
  assert.deepEqual(report.kept, []);
  assert.deepEqual(report.unkept, ['goal-1']);
  assert.deepEqual(report.unplantedPayoffs, []);
  assert.equal(report.keptRatio, 0);
  assert.equal(report.strength, 0);
  assert.equal(report.support, 'UNKNOWN');
});

test('payoff with no plant is an unplanted payoff, CONTRADICTED, and strength is penalized', () => {
  const events: PromiseEvent[] = [
    { id: 'plant-a', type: 'threat', role: 'plant', sceneIndex: 1 },
    { id: 'plant-a', type: 'threat', role: 'payoff', sceneIndex: 10 },
    { id: 'deus-ex', type: 'mystery_question', role: 'payoff', sceneIndex: 15 },
  ];
  const report = assessTypedPromises(events);
  assert.equal(report.scored, true);
  assert.deepEqual(report.kept, ['plant-a']);
  assert.deepEqual(report.unplantedPayoffs, ['deus-ex']);
  assert.equal(report.support, 'CONTRADICTED');
  // keptRatio = 1/1 = 1, penalized by one unplanted payoff (0.25) -> 0.75
  assert.equal(report.keptRatio, 1);
  assert.equal(report.strength, 0.75);
});

test('payoff occurring before its own plant is an out-of-order violation (unplanted, and the plant is unkept)', () => {
  const events: PromiseEvent[] = [
    { id: 'prophecy-1', type: 'prophecy', role: 'payoff', sceneIndex: 2 },
    { id: 'prophecy-1', type: 'prophecy', role: 'plant', sceneIndex: 8 },
  ];
  const report = assessTypedPromises(events);
  assert.equal(report.scored, true);
  assert.deepEqual(report.unkept, ['prophecy-1']);
  assert.deepEqual(report.unplantedPayoffs, ['prophecy-1']);
  assert.equal(report.support, 'CONTRADICTED');
  assert.ok(report.strength < 1);
});

test('byType tallies and keptRatio math are correct across a mixed multi-type ledger', () => {
  const events: PromiseEvent[] = [
    { id: 'a', type: 'chekhov_object', role: 'plant', sceneIndex: 1 },
    { id: 'a', type: 'chekhov_object', role: 'payoff', sceneIndex: 9 },
    { id: 'b', type: 'chekhov_object', role: 'plant', sceneIndex: 2 },
    // b never paid off
    { id: 'c', type: 'threat', role: 'plant', sceneIndex: 3 },
    { id: 'c', type: 'threat', role: 'payoff', sceneIndex: 4 },
    { id: 'd', type: 'stated_goal', role: 'plant', sceneIndex: 0 },
    // duplicate plant for d, then a payoff after the LATEST plant too
    { id: 'd', type: 'stated_goal', role: 'plant', sceneIndex: 5 },
    { id: 'd', type: 'stated_goal', role: 'payoff', sceneIndex: 6 },
  ];
  const report = assessTypedPromises(events);
  assert.equal(report.scored, true);
  assert.deepEqual(report.byType.chekhov_object, { planted: 2, kept: 1 });
  assert.deepEqual(report.byType.threat, { planted: 1, kept: 1 });
  assert.deepEqual(report.byType.stated_goal, { planted: 2, kept: 1 });
  // planted ids = a, b, c, d = 4; kept = a, c, d = 3
  assert.equal(report.keptRatio, 3 / 4);
  assert.deepEqual(new Set(report.kept), new Set(['a', 'c', 'd']));
  assert.deepEqual(report.unkept, ['b']);
  assert.deepEqual(report.unplantedPayoffs, []);
  assert.equal(report.support, 'UNKNOWN');
});

test('empty/invalid input abstains (scored=false) rather than scoring', () => {
  assert.equal(assessTypedPromises([]).scored, false);
  assert.equal(assessTypedPromises(null).scored, false);
  assert.equal(assessTypedPromises(undefined).scored, false);
  // Only malformed events (bad type, bad role, bad sceneIndex) -> all dropped -> no plants -> abstain
  const malformed = [
    { id: 'x', type: 'not_a_real_type', role: 'plant', sceneIndex: 1 },
    { id: 'y', type: 'threat', role: 'not_a_role', sceneIndex: 1 },
    { id: 'z', type: 'threat', role: 'plant', sceneIndex: -1 },
    { id: '', type: 'threat', role: 'plant', sceneIndex: 1 },
  ] as unknown as PromiseEvent[];
  const report = assessTypedPromises(malformed);
  assert.equal(report.scored, false);
  assert.equal(report.strength, 0);
  assert.equal(report.support, 'UNKNOWN');
});
