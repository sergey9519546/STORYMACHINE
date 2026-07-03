// Unit tests for the shared check-template library (audit M2.2). These test the
// library's pure detection logic directly — new wave-authored rules that call
// into this library are still tested end-to-end in their own pass test file,
// same as any other rule.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAftermathVoid, checkDroughtRun, checkZoneCluster, checkCoOccurrenceDecoupled,
  checkHalfLoaded, checkPeakUncaused, checkZoneImbalance, FOUR_ZONE_NAMES,
} from '../../../server/nvm/revision/passes/lib/checks.ts';
import { makeSceneRecord } from '../helpers.ts';

describe('checks lib — checkAftermathVoid', () => {
  it('fires when every trigger scene lacks the aftermath signal within the window', () => {
    const records = Array.from({ length: 8 }, (_, i) => makeSceneRecord(i));
    records[1] = makeSceneRecord(1, { clockRaised: true });
    records[3] = makeSceneRecord(3, { clockRaised: true });
    records[6] = makeSceneRecord(6, { suspenseDelta: 1 });
    const result = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 1, window: 2,
      isTrigger: r => r.clockRaised, isAftermath: r => r.suspenseDelta > 0,
    });
    assert.equal(result.fires, true);
    assert.equal(result.triggerCount, 2);
    assert.equal(result.aftermathCount, 1);
  });

  it('does not fire when a trigger is followed by the aftermath signal within the window', () => {
    const records = Array.from({ length: 8 }, (_, i) => makeSceneRecord(i));
    records[1] = makeSceneRecord(1, { clockRaised: true });
    records[2] = makeSceneRecord(2, { suspenseDelta: 1 });
    records[3] = makeSceneRecord(3, { clockRaised: true });
    records[6] = makeSceneRecord(6, { suspenseDelta: 1 });
    const result = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 1, window: 2,
      isTrigger: r => r.clockRaised, isAftermath: r => r.suspenseDelta > 0,
    });
    assert.equal(result.fires, false);
  });

  it('does not fire below minRecords', () => {
    const records = Array.from({ length: 5 }, (_, i) => makeSceneRecord(i, { clockRaised: true }));
    const result = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 1, minAftermathCount: 0, window: 2,
      isTrigger: r => r.clockRaised, isAftermath: () => false,
    });
    assert.equal(result.fires, false);
  });
});

describe('checks lib — checkDroughtRun', () => {
  it('fires when the longest absence run reaches the threshold', () => {
    const records = Array.from({ length: 10 }, (_, i) => makeSceneRecord(i));
    records[0] = makeSceneRecord(0, { revelation: 'A' });
    records[8] = makeSceneRecord(8, { revelation: 'B' });
    const result = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 2, runThreshold: 7,
      isPresent: r => r.revelation !== null,
    });
    assert.equal(result.fires, true);
    assert.equal(result.longestRun, 7);
    assert.equal(result.runStartIdx, 1);
  });

  it('does not fire when no run reaches the threshold', () => {
    const records = Array.from({ length: 10 }, (_, i) => makeSceneRecord(i));
    records[0] = makeSceneRecord(0, { revelation: 'A' });
    records[4] = makeSceneRecord(4, { revelation: 'B' });
    records[8] = makeSceneRecord(8, { revelation: 'C' });
    const result = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 2, runThreshold: 7,
      isPresent: r => r.revelation !== null,
    });
    assert.equal(result.fires, false);
  });
});

describe('checks lib — checkZoneCluster', () => {
  it('fires when >75% of qualifying scenes cluster in one third', () => {
    const records = Array.from({ length: 9 }, (_, i) => makeSceneRecord(i));
    records[0] = makeSceneRecord(0, { seededClueIds: ['a'] });
    records[1] = makeSceneRecord(1, { seededClueIds: ['b'] });
    records[2] = makeSceneRecord(2, { seededClueIds: ['c'] });
    const result = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.seededClueIds.length > 0,
    });
    assert.equal(result.fires, true);
    assert.equal(result.maxZoneIdx, 0);
    assert.equal(result.zoneNames[0], 'opening');
  });

  it('does not fire when qualifying scenes are spread across thirds', () => {
    const records = Array.from({ length: 9 }, (_, i) => makeSceneRecord(i));
    records[0] = makeSceneRecord(0, { seededClueIds: ['a'] });
    records[4] = makeSceneRecord(4, { seededClueIds: ['b'] });
    records[7] = makeSceneRecord(7, { seededClueIds: ['c'] });
    const result = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.seededClueIds.length > 0,
    });
    assert.equal(result.fires, false);
  });
});

describe('checks lib — checkCoOccurrenceDecoupled', () => {
  it('fires when no scene has both signals simultaneously', () => {
    const records = Array.from({ length: 8 }, (_, i) => makeSceneRecord(i));
    records[1] = makeSceneRecord(1, { payoffSetupIds: ['a'] });
    records[3] = makeSceneRecord(3, { payoffSetupIds: ['b'] });
    records[6] = makeSceneRecord(6, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
    const result = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 2, minBCount: 1,
      isA: r => r.payoffSetupIds.length > 0,
      isB: r => (r.relationshipShifts ?? []).length > 0,
    });
    assert.equal(result.fires, true);
    assert.equal(result.aCount, 2);
    assert.equal(result.bCount, 1);
  });

  it('does not fire when a scene has both signals together', () => {
    const records = Array.from({ length: 8 }, (_, i) => makeSceneRecord(i));
    records[1] = makeSceneRecord(1, {
      payoffSetupIds: ['a'],
      relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }],
    });
    records[3] = makeSceneRecord(3, { payoffSetupIds: ['b'] });
    const result = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 2, minBCount: 1,
      isA: r => r.payoffSetupIds.length > 0,
      isB: r => (r.relationshipShifts ?? []).length > 0,
    });
    assert.equal(result.fires, false);
  });
});

describe('checks lib — checkHalfLoaded', () => {
  it('fires when >70% of qualifying scenes are in the front half and the back half still has some', () => {
    const records = Array.from({ length: 10 }, (_, i) => makeSceneRecord(i));
    for (const i of [0, 1, 2, 3]) records[i] = makeSceneRecord(i, { seededClueIds: ['x'] });
    records[8] = makeSceneRecord(8, { seededClueIds: ['y'] });
    const result = checkHalfLoaded({
      records, minRecords: 8, minCount: 4, ratioThreshold: 0.70, direction: 'front',
      isPresent: r => r.seededClueIds.length > 0,
    });
    assert.equal(result.fires, true);
    assert.equal(result.matchingHalfCount, 4);
    assert.equal(result.otherHalfCount, 1);
  });

  it('does not fire when the other half is empty', () => {
    const records = Array.from({ length: 10 }, (_, i) => makeSceneRecord(i));
    for (const i of [0, 1, 2, 3]) records[i] = makeSceneRecord(i, { seededClueIds: ['x'] });
    const result = checkHalfLoaded({
      records, minRecords: 8, minCount: 4, ratioThreshold: 0.70, direction: 'front',
      isPresent: r => r.seededClueIds.length > 0,
    });
    assert.equal(result.fires, false, 'other half has zero qualifying scenes, so it should not fire');
  });
});

describe('checks lib — checkPeakUncaused', () => {
  it('fires when the peak-magnitude scene has no cause within the lookback window', () => {
    const records = Array.from({ length: 8 }, (_, i) => makeSceneRecord(i));
    records[5] = makeSceneRecord(5, { suspenseDelta: 5 });
    records[1] = makeSceneRecord(1, { suspenseDelta: 1 });
    const result = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.suspenseDelta,
      hasCause: r => r.clockRaised,
    });
    assert.equal(result.fires, true);
    assert.equal(result.peakIdx, 5);
    assert.equal(result.peakMagnitude, 5);
  });

  it('does not fire when the peak scene has a cause within the lookback window', () => {
    const records = Array.from({ length: 8 }, (_, i) => makeSceneRecord(i));
    records[4] = makeSceneRecord(4, { clockRaised: true });
    records[5] = makeSceneRecord(5, { suspenseDelta: 5 });
    records[1] = makeSceneRecord(1, { suspenseDelta: 1 });
    const result = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.suspenseDelta,
      hasCause: r => r.clockRaised,
    });
    assert.equal(result.fires, false);
  });
});

describe('checks lib — checkZoneImbalance', () => {
  it('fires when one of four zones is empty while another holds the bloat ratio', () => {
    // 12 scenes, 4 zones of 3: payoffs at 6,7,8 (zone 2) → zone 2 has 3/3=100% ≥ 0.5, zones 0,1,3 empty
    const records = Array.from({ length: 12 }, (_, i) => makeSceneRecord(i));
    records[6] = makeSceneRecord(6, { payoffSetupIds: ['a'] });
    records[7] = makeSceneRecord(7, { payoffSetupIds: ['b'] });
    records[8] = makeSceneRecord(8, { payoffSetupIds: ['c'] });
    const result = checkZoneImbalance({
      records, minRecords: 10, minCount: 3, bloatRatio: 0.5,
      isPresent: r => r.payoffSetupIds.length > 0,
    });
    assert.equal(result.fires, true);
    assert.equal(result.bloatZoneIdx, 2);
    assert.deepEqual(result.emptyZoneIdxs, [0, 1, 3]);
    assert.equal(FOUR_ZONE_NAMES[result.bloatZoneIdx], 'Act 2b (50–75%)');
  });

  it('does not fire when every zone has at least one qualifying scene', () => {
    const records = Array.from({ length: 12 }, (_, i) => makeSceneRecord(i));
    for (const i of [1, 4, 7, 10]) records[i] = makeSceneRecord(i, { payoffSetupIds: ['x'] });
    const result = checkZoneImbalance({
      records, minRecords: 10, minCount: 3, bloatRatio: 0.5,
      isPresent: r => r.payoffSetupIds.length > 0,
    });
    assert.equal(result.fires, false);
  });
});
