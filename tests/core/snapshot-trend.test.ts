// src/lib/snapshot-trend.ts — the pure snapshotTrend(snapshots) helper
// behind the Versions tab's compact trend row + sparkline (writer #9,
// upgrade-writer-experience discovery: "score over revisions"). Covers the
// delta math, the newest-first/previous-is-next-in-array ordering contract,
// and every missing-value combination (no crash, no fabricated numbers).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { snapshotTrend } from '../../src/lib/snapshot-trend.ts';
import type { Snapshot } from '../../src/components/scriptide/SnapshotManager.tsx';

function snap(overrides: Partial<Snapshot> & { id: string }): Snapshot {
  return { name: 'v', text: 'x', date: 'd', ...overrides };
}

describe('snapshotTrend', () => {
  it('returns an empty array for no snapshots', () => {
    assert.deepEqual(snapshotTrend([]), []);
  });

  it('carries health/verdict/sceneCount/analyzedAt through as-is when present', () => {
    const [entry] = snapshotTrend([
      snap({ id: 's1', health: 72.5, verdict: 'CONSIDER', sceneCount: 6, analyzedAt: 1000 }),
    ]);
    assert.equal(entry.id, 's1');
    assert.equal(entry.health, 72.5);
    assert.equal(entry.verdict, 'CONSIDER');
    assert.equal(entry.sceneCount, 6);
    assert.equal(entry.analyzedAt, 1000);
  });

  it('the single (oldest = only) snapshot has no delta — nothing to compare against', () => {
    const [entry] = snapshotTrend([snap({ id: 's1', health: 50, sceneCount: 10 })]);
    assert.equal(entry.healthDelta, null);
    assert.equal(entry.sceneCountDelta, null);
  });

  it('computes healthDelta against the NEXT array entry (the previous, older snapshot) — array is newest-first', () => {
    // Newest first: index 0 = 80 (latest), index 1 = 65 (previous).
    const [newest, previous] = snapshotTrend([
      snap({ id: 'latest', health: 80 }),
      snap({ id: 'previous', health: 65 }),
    ]);
    assert.equal(newest.healthDelta, 15, 'latest.health(80) - previous.health(65) = +15');
    assert.equal(previous.healthDelta, null, 'the oldest entry has nothing older to compare against');
  });

  it('reports a negative delta when health dropped since the previous snapshot', () => {
    const [newest] = snapshotTrend([
      snap({ id: 'latest', health: 40 }),
      snap({ id: 'previous', health: 70 }),
    ]);
    assert.equal(newest.healthDelta, -30);
  });

  it('rounds healthDelta to one decimal place, avoiding float noise', () => {
    const [newest] = snapshotTrend([
      snap({ id: 'a', health: 66.7 }),
      snap({ id: 'b', health: 66.4 }),
    ]);
    assert.equal(newest.healthDelta, 0.3);
  });

  it('computes sceneCountDelta independently of healthDelta', () => {
    const [newest] = snapshotTrend([
      snap({ id: 'a', sceneCount: 12 }),
      snap({ id: 'b', sceneCount: 9 }),
    ]);
    assert.equal(newest.sceneCountDelta, 3);
  });

  it('healthDelta is null when EITHER side is missing a health value — never fabricated', () => {
    const [thisOneUnscored] = snapshotTrend([
      snap({ id: 'a' }), // no health
      snap({ id: 'b', health: 50 }),
    ]);
    assert.equal(thisOneUnscored.health, null);
    assert.equal(thisOneUnscored.healthDelta, null);

    const [scored, unscoredPrevious] = snapshotTrend([
      snap({ id: 'a', health: 50 }),
      snap({ id: 'b' }), // no health
    ]);
    assert.equal(scored.healthDelta, null, 'previous snapshot has no health to diff against');
    assert.equal(unscoredPrevious.health, null);
  });

  it('a run of three snapshots (two scored, one legacy/unscored in the middle) computes each delta independently', () => {
    const entries = snapshotTrend([
      snap({ id: 'newest', health: 90 }),
      snap({ id: 'middle-unscored' }), // legacy snapshot, no score at all
      snap({ id: 'oldest', health: 60 }),
    ]);
    assert.equal(entries[0].healthDelta, null, 'previous (middle) has no health to diff against');
    assert.equal(entries[1].health, null);
    assert.equal(entries[1].healthDelta, null, 'this entry has no health of its own');
    assert.equal(entries[2].healthDelta, null, 'oldest entry — nothing older to compare against');
  });

  it('verdict/sceneCount/analyzedAt resolve to null (not undefined, not 0) when absent', () => {
    const [entry] = snapshotTrend([snap({ id: 's1' })]);
    assert.equal(entry.verdict, null);
    assert.equal(entry.sceneCount, null);
    assert.equal(entry.analyzedAt, null);
    assert.equal(entry.health, null);
  });

  it('preserves input order and length 1:1 with the input snapshots array', () => {
    const input = [snap({ id: 'a' }), snap({ id: 'b' }), snap({ id: 'c' })];
    const entries = snapshotTrend(input);
    assert.deepEqual(entries.map((e) => e.id), ['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const input = [snap({ id: 'a', health: 10 }), snap({ id: 'b', health: 20 })];
    const copy = JSON.parse(JSON.stringify(input));
    snapshotTrend(input);
    assert.deepEqual(input, copy);
  });
});
