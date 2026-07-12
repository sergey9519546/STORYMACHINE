import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCustodyLedger, canUse } from '../../server/nvm/analyze/custody-ledger.ts';

// 4 scenes. KEY introduced in scene 0 (MARA takes it), then passed to ALEXEI
// in scene 2. COLT never touches it. DOOR_LOCK is never mentioned.
const scenes = [
  'INT. VAULT - NIGHT\nMARA\nI found the key hidden here.\nMARA takes the KEY.\n',
  'EXT. ROAD - DAY\nALEXEI\nWhere is she?\n',
  'INT. CAFE - DAY\nMARA\nListen.\nALEXEI\nI understand.\nMARA hands ALEXEI the KEY.\n',
  'INT. ROOM - NIGHT\nALEXEI\nThis will work.\n',
];

const trackedObjects = ['KEY', 'DOOR_LOCK', 'MONEY'];

describe('custody ledger: extraction', () => {
  const L = buildCustodyLedger(scenes, trackedObjects);
  it('detects custody transactions', () => {
    assert.ok(L.scored);
    assert.ok(L.byObject.KEY.length > 0, 'KEY custody chain exists');
    assert.equal(L.byObject.KEY[0].holder, 'MARA', 'MARA takes KEY in scene 0');
    assert.ok(
      L.byObject.KEY.some(e => e.holder === 'ALEXEI'),
      'ALEXEI holds KEY after scene 2'
    );
  });
  it('tracks unmentioned objects as empty chains', () => {
    assert.ok(Array.isArray(L.byObject.DOOR_LOCK));
    assert.equal(L.byObject.DOOR_LOCK.length, 0, 'DOOR_LOCK never mentioned');
  });
  it('abstains below 2 scenes', () => {
    const L1 = buildCustodyLedger(scenes.slice(0, 1), trackedObjects);
    assert.equal(L1.scored, false, 'single scene abstains');
  });
  it('abstains if no objects tracked', () => {
    const L0 = buildCustodyLedger(scenes, []);
    assert.equal(L0.scored, false, 'no objects to track → abstain');
  });
  it('abstains if no custody activity detected', () => {
    const quietScenes = [
      'INT. ROOM - DAY\nALICE\nHello.\n',
      'INT. ROOM - DAY\nBOB\nHi.\n',
    ];
    const L_quiet = buildCustodyLedger(quietScenes, trackedObjects);
    assert.equal(L_quiet.scored, false, 'no custody activity despite 2 scenes');
  });
});

describe('custody ledger: canUse (open-world)', () => {
  const L = buildCustodyLedger(scenes, trackedObjects);

  it('direct custody → ENTAILED at and after scene', () => {
    // MARA takes KEY in scene 0
    assert.equal(canUse(L, 'KEY', 'MARA', 0), 'ENTAILED', 'MARA can use KEY at s0');
    assert.equal(canUse(L, 'KEY', 'MARA', 1), 'ENTAILED', 'MARA can use KEY after s0');
    assert.equal(canUse(L, 'KEY', 'MARA', 2), 'ENTAILED', 'MARA can use KEY until transfer');
  });

  it('transferred custody → ENTAILED for new holder', () => {
    // ALEXEI gets KEY in scene 2
    assert.equal(canUse(L, 'KEY', 'ALEXEI', 2), 'ENTAILED', 'ALEXEI can use KEY at s2');
    assert.equal(canUse(L, 'KEY', 'ALEXEI', 3), 'ENTAILED', 'ALEXEI can use KEY after s2');
  });

  it('no custody transaction → UNKNOWN (not a negative)', () => {
    // COLT never touches KEY
    assert.equal(canUse(L, 'KEY', 'COLT', 3), 'UNKNOWN', 'COLT never handled KEY');
    assert.equal(canUse(L, 'MONEY', 'MARA', 3), 'UNKNOWN', 'MONEY never mentioned');
  });

  it('before custody transaction → UNKNOWN', () => {
    // ALEXEI gets KEY in scene 2; before then he doesn't have it
    assert.equal(canUse(L, 'KEY', 'ALEXEI', 1), 'UNKNOWN', 'ALEXEI does not have KEY before s2');
  });

  it('unarmed query against unscored ledger → UNKNOWN', () => {
    const L_unscored = buildCustodyLedger(scenes.slice(0, 1), trackedObjects);
    assert.equal(canUse(L_unscored, 'KEY', 'MARA', 0), 'UNKNOWN');
  });

  it('is deterministic', () => {
    assert.equal(
      canUse(L, 'KEY', 'MARA', 1),
      canUse(L, 'KEY', 'MARA', 1),
      'same query yields same result'
    );
  });
});
