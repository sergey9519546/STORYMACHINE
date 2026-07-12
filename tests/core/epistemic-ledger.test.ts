import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEpistemicLedger, canKnow } from '../../server/nvm/analyze/epistemic-ledger.ts';

// 5 scenes. Fact established in scene 0 (MARA present). TEO never co-present with
// anyone informed → cannot know. LENA shares scene 2 with MARA → can know by s2+.
const scenes = [
  'INT. VAULT - NIGHT\nMARA\nI found the code.\n',
  'EXT. ROAD - DAY\nTEO\nAny news?\n',
  'INT. CAFE - DAY\nMARA\nListen.\nLENA\nGo on.\n',
  'INT. ROOM - NIGHT\nLENA\nI know the code now.\n',
  'EXT. DOCK - DAY\nTEO\nStill nothing.\n',
];

describe('epistemic ledger: presence', () => {
  const L = buildEpistemicLedger(scenes);
  it('extracts present characters per scene', () => {
    assert.ok(L.scored);
    assert.ok(L.presenceByScene[0].has('MARA'));
    assert.ok(L.presenceByScene[2].has('MARA') && L.presenceByScene[2].has('LENA'));
  });
  it('abstains below 2 scenes', () => {
    assert.equal(buildEpistemicLedger(scenes.slice(0,1)).scored, false);
  });
});

describe('epistemic ledger: canKnow (open-world)', () => {
  const L = buildEpistemicLedger(scenes);
  it('direct presence → ENTAILED', () => {
    assert.equal(canKnow(L, 'MARA', 0, 4), 'ENTAILED');
  });
  it('communication path (co-present with informed) → ENTAILED after the meeting', () => {
    assert.equal(canKnow(L, 'LENA', 0, 2), 'ENTAILED');   // shares scene 2 with MARA
    assert.equal(canKnow(L, 'LENA', 0, 1), 'UNKNOWN');    // before the meeting
  });
  it('no path → UNKNOWN (absence is not a negative fact)', () => {
    assert.equal(canKnow(L, 'TEO', 0, 4), 'UNKNOWN');
  });
  it('is deterministic', () => {
    assert.equal(canKnow(L, 'LENA', 0, 3), canKnow(L, 'LENA', 0, 3));
  });
});
