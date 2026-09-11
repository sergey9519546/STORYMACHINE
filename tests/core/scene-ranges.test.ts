// server/lib/scene-ranges.ts — the ONE scene-list wording.
//
// Both directions for every rule: collapses where collapsing is true (a
// contiguous stretch), stays explicit where it is not (a scattered set, where a
// range would claim scenes the finding never touched), and the empty case
// returns '' so each surface punctuates its own absence.
//
// The last describe block is the measurement the module exists for: the real
// 116-scene finding from tests/fixtures/feature-length/assembled-feature.fountain
// rendered 1,231 characters of "Scene N, " in the exported coverage report.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatSceneList, sceneRuns } from '../../server/lib/scene-ranges.ts';

describe('formatSceneList — the documented cases', () => {
  it('fire: a single scene is singular and 1-based', () => {
    assert.equal(formatSceneList([0]), 'Scene 1');
    assert.equal(formatSceneList([230]), 'Scene 231');
  });

  it('fire: a contiguous stretch collapses to one range', () => {
    assert.equal(formatSceneList(Array.from({ length: 36 }, (_, i) => i)), 'Scenes 1–36');
    assert.equal(formatSceneList([0, 1, 2]), 'Scenes 1–3');
  });

  it('no-fire: a scattered set stays explicit — a range would overclaim', () => {
    assert.equal(formatSceneList([1, 4, 8]), 'Scenes 2, 5, 9');
  });

  it('no-fire: a PAIR of adjacent scenes stays explicit (MIN_RUN_FOR_RANGE is 3)', () => {
    assert.equal(formatSceneList([6, 7]), 'Scenes 7, 8');
  });

  it('fire: mixed input collapses only the runs', () => {
    assert.equal(formatSceneList([0, 1, 2, 6, 7]), 'Scenes 1–3, 7, 8');
    assert.equal(formatSceneList([206, 207, 208, 209, 210, 212, 214, 215, 216, 217, 218]),
      'Scenes 207–211, 213, 215–219');
  });

  it('no-fire: empty input is the EMPTY STRING, never a placeholder sentence', () => {
    assert.equal(formatSceneList([]), '');
  });

  it('is order- and duplicate-insensitive: sceneIdxs comes out of a Set', () => {
    assert.equal(formatSceneList([2, 0, 1, 1, 2]), 'Scenes 1–3');
    assert.equal(formatSceneList([8, 1, 4]), 'Scenes 2, 5, 9');
  });

  it('drops indices that are not real scene positions rather than printing them', () => {
    assert.equal(formatSceneList([-1, 0, 1, 2]), 'Scenes 1–3');
    assert.equal(formatSceneList([1.5, 3]), 'Scene 4');
    assert.equal(formatSceneList([-5]), '');
  });

  it('uses the SAME en dash cluster.ts’s own finding titles use', () => {
    // cluster.ts renders "Recurring orphan clue trouble in Scenes 1–58";
    // a list under that title must not use a different dash.
    assert.ok(formatSceneList([0, 1, 2]).includes('–'));
    assert.ok(!formatSceneList([0, 1, 2]).includes('-'), 'must not use an ASCII hyphen');
  });

  it('says "Scenes" plural for a collapsed range even though it is one part', () => {
    assert.ok(formatSceneList([0, 1, 2]).startsWith('Scenes '));
    assert.ok(formatSceneList([0]).startsWith('Scene '));
  });
});

describe('sceneRuns — the collapse itself', () => {
  it('returns inclusive 1-based pairs, one per maximal run', () => {
    assert.deepEqual(sceneRuns([0, 1, 2, 5, 7, 8]), [[1, 3], [6, 6], [8, 9]]);
  });

  it('returns [] for no usable indices', () => {
    assert.deepEqual(sceneRuns([]), []);
    assert.deepEqual(sceneRuns([-2, -1]), []);
  });
});

describe('formatSceneList — the measured defect it closes', () => {
  // The widest root cause on the committed feature fixture: 116 scenes, indices
  // 56..171 with gaps (see tests/routes/root-cause-parity.test.ts, which drives
  // the real routes). Reproduced here as a pure-input case so the size claim is
  // asserted without a 1.3-second doctor run.
  const WIDE = Array.from({ length: 116 }, (_, i) => 56 + i);

  it('a 116-scene contiguous span renders as one short phrase, not 1,231 characters', () => {
    const oldWording = WIDE.map(i => `Scene ${i + 1}`).join(', ');
    assert.equal(oldWording.length, 1231, 'the pre-fix wording measured 1,231 characters');
    const now = formatSceneList(WIDE);
    assert.equal(now, 'Scenes 57–172');
    assert.ok(now.length < 20, `still ${now.length} characters`);
  });

  it('nothing is dropped: every scene in the input is still named by the output', () => {
    const runs = sceneRuns(WIDE);
    const covered = runs.reduce((n, [a, b]) => n + (b - a + 1), 0);
    assert.equal(covered, WIDE.length);
  });
});
