import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessBeliefMovement, type BeliefEvent } from './belief-movement.ts';

test('fires: believe -> learn-opposite WITH prior setup is an earned movement, strength up', () => {
  const events: BeliefEvent[] = [
    { agent: 'MAYA', proposition: 'the butler is loyal', stance: 'believes', sceneIndex: 1 },
    { agent: 'MAYA', proposition: 'not:the butler is loyal', stance: 'learns', sceneIndex: 8, supportedByPriorSetup: true },
  ];
  const report = assessBeliefMovement(events);
  assert.equal(report.scored, true);
  assert.equal(report.movements.length, 1);
  assert.equal(report.movements[0].agent, 'MAYA');
  assert.equal(report.movements[0].fromScene, 1);
  assert.equal(report.movements[0].toScene, 8);
  assert.equal(report.movements[0].earned, true);
  assert.equal(report.earnedSurpriseCount, 1);
  assert.equal(report.cheapReversalCount, 0);
  assert.ok(report.strength > 0);
});

test('no-fire (quality): believe -> learn-opposite WITHOUT setup is a cheap reversal, strength penalized', () => {
  const earned: BeliefEvent[] = [
    { agent: 'MAYA', proposition: 'the butler is loyal', stance: 'believes', sceneIndex: 1 },
    { agent: 'MAYA', proposition: 'not:the butler is loyal', stance: 'learns', sceneIndex: 8, supportedByPriorSetup: true },
  ];
  const cheap: BeliefEvent[] = [
    { agent: 'MAYA', proposition: 'the butler is loyal', stance: 'believes', sceneIndex: 1 },
    { agent: 'MAYA', proposition: 'not:the butler is loyal', stance: 'learns', sceneIndex: 8, supportedByPriorSetup: false },
  ];
  const earnedReport = assessBeliefMovement(earned);
  const cheapReport = assessBeliefMovement(cheap);
  assert.equal(cheapReport.scored, true);
  assert.equal(cheapReport.movements.length, 1);
  assert.equal(cheapReport.movements[0].earned, false);
  assert.equal(cheapReport.earnedSurpriseCount, 0);
  assert.equal(cheapReport.cheapReversalCount, 1);
  assert.equal(cheapReport.strength, 0); // penalty floors at 0, never rewarded
  assert.ok(cheapReport.strength < earnedReport.strength);
});

test('no-fire: believe then re-affirm the SAME proposition is not a movement', () => {
  const events: BeliefEvent[] = [
    { agent: 'BEN', proposition: 'the map is accurate', stance: 'believes', sceneIndex: 2 },
    { agent: 'BEN', proposition: 'the map is accurate', stance: 'believes', sceneIndex: 5 },
  ];
  const report = assessBeliefMovement(events);
  assert.equal(report.scored, true);
  assert.equal(report.movements.length, 0);
  assert.equal(report.earnedSurpriseCount, 0);
  assert.equal(report.cheapReversalCount, 0);
  assert.equal(report.strength, 0);
});

test('no-fire: unrelated agents and unrelated propositions do not produce a false movement', () => {
  const events: BeliefEvent[] = [
    { agent: 'MAYA', proposition: 'the butler is loyal', stance: 'believes', sceneIndex: 1 },
    { agent: 'JAMES', proposition: 'not:the butler is loyal', stance: 'learns', sceneIndex: 3, supportedByPriorSetup: true },
    { agent: 'MAYA', proposition: 'the war is over', stance: 'learns', sceneIndex: 4, supportedByPriorSetup: true },
  ];
  const report = assessBeliefMovement(events);
  assert.equal(report.scored, true);
  assert.equal(report.movements.length, 0);
  assert.equal(report.strength, 0);
});

test('abstain: empty input yields scored=false', () => {
  const report = assessBeliefMovement([]);
  assert.equal(report.scored, false);
  assert.equal(report.movements.length, 0);
  assert.equal(report.strength, 0);
});

test('abstain: single event (nothing to assess) yields scored=false', () => {
  const report = assessBeliefMovement([
    { agent: 'MAYA', proposition: 'the butler is loyal', stance: 'believes', sceneIndex: 1 },
  ]);
  assert.equal(report.scored, false);
  assert.equal(report.movements.length, 0);
});

test('abstain: null/undefined input is guarded', () => {
  assert.equal(assessBeliefMovement(null).scored, false);
  assert.equal(assessBeliefMovement(undefined).scored, false);
});

test('strength is bounded [0,1] with many earned surprises and never negative with many cheap reversals', () => {
  const manyEarned: BeliefEvent[] = [];
  for (let i = 0; i < 10; i++) {
    manyEarned.push({ agent: `A${i}`, proposition: 'p is true', stance: 'believes', sceneIndex: 0 });
    manyEarned.push({ agent: `A${i}`, proposition: 'not:p is true', stance: 'learns', sceneIndex: 1, supportedByPriorSetup: true });
  }
  const highReport = assessBeliefMovement(manyEarned);
  assert.ok(highReport.strength <= 1);
  assert.ok(highReport.strength >= 0);

  const manyCheap: BeliefEvent[] = [];
  for (let i = 0; i < 10; i++) {
    manyCheap.push({ agent: `B${i}`, proposition: 'p is true', stance: 'believes', sceneIndex: 0 });
    manyCheap.push({ agent: `B${i}`, proposition: 'not:p is true', stance: 'learns', sceneIndex: 1, supportedByPriorSetup: false });
  }
  const lowReport = assessBeliefMovement(manyCheap);
  assert.ok(lowReport.strength >= 0);
  assert.equal(lowReport.strength, 0);
});
