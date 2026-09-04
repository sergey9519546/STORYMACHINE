// src/lib/snapshot-trend.ts — the pure snapshotTrend(snapshots) helper
// behind the Versions tab's compact trend row + sparkline (writer #9,
// upgrade-writer-experience discovery: "score over revisions"). Covers the
// delta math, the newest-first/previous-is-next-in-array ordering contract,
// and every missing-value combination (no crash, no fabricated numbers).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { snapshotTrend, computeDraftRank, snapshotDraftRanks } from '../../src/lib/snapshot-trend.ts';
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

// ── Shape & Rhythm aggregates (2026-09-04) — additive, optional per-snapshot
//    fields (server/nvm/analyze/structural-signals.ts's
//    meanAbsDialogueShareDelta/actionSentenceCvOverall). Read as-is, never
//    fabricated: absent under the exact same "field predates this feature or
//    was never scored" rule as health/verdict/sceneCount above.

describe('snapshotTrend — Shape & Rhythm aggregates', () => {
  it('carries meanAbsDialogueShareDelta/actionSentenceCvOverall through as-is when present', () => {
    const [entry] = snapshotTrend([
      snap({ id: 's1', meanAbsDialogueShareDelta: 0.12, actionSentenceCvOverall: 0.55 }),
    ]);
    assert.equal(entry.meanAbsDialogueShareDelta, 0.12);
    assert.equal(entry.actionSentenceCvOverall, 0.55);
  });

  it('resolves to null (not undefined, not 0) when absent — the "field absent" path', () => {
    const [entry] = snapshotTrend([snap({ id: 's1' })]);
    assert.equal(entry.meanAbsDialogueShareDelta, null);
    assert.equal(entry.actionSentenceCvOverall, null);
  });

  it('a legacy snapshot with health but no structural-signal fields still resolves those two to null', () => {
    const [entry] = snapshotTrend([snap({ id: 's1', health: 72, verdict: 'CONSIDER', sceneCount: 6 })]);
    assert.equal(entry.health, 72);
    assert.equal(entry.meanAbsDialogueShareDelta, null);
    assert.equal(entry.actionSentenceCvOverall, null);
  });

  it('resolves each snapshot independently — no delta-vs-previous is computed for these two fields', () => {
    const entries = snapshotTrend([
      snap({ id: 'newest', meanAbsDialogueShareDelta: 0.3, actionSentenceCvOverall: 0.7 }),
      snap({ id: 'oldest', meanAbsDialogueShareDelta: 0.1, actionSentenceCvOverall: 0.4 }),
    ]);
    assert.equal(entries[0].meanAbsDialogueShareDelta, 0.3);
    assert.equal(entries[1].meanAbsDialogueShareDelta, 0.1);
    assert.equal(entries[0].actionSentenceCvOverall, 0.7);
    assert.equal(entries[1].actionSentenceCvOverall, 0.4);
  });

  it('does not mutate the input array', () => {
    const input = [snap({ id: 'a', meanAbsDialogueShareDelta: 0.2, actionSentenceCvOverall: 0.5 })];
    const copy = JSON.parse(JSON.stringify(input));
    snapshotTrend(input);
    assert.deepEqual(input, copy);
  });
});

// ── healthPercentile (2026-09-04 honesty-audit matrix fix) — same
//    missing-is-honest rule as every other snapshot field above. ──────────

describe('snapshotTrend — healthPercentile', () => {
  it('carries healthPercentile through as-is when present', () => {
    const [entry] = snapshotTrend([snap({ id: 's1', healthPercentile: 82 })]);
    assert.equal(entry.healthPercentile, 82);
  });

  it('resolves to null (not undefined, not 0) when absent', () => {
    const [entry] = snapshotTrend([snap({ id: 's1' })]);
    assert.equal(entry.healthPercentile, null);
  });

  it('a legacy snapshot with health but no healthPercentile still resolves it to null', () => {
    const [entry] = snapshotTrend([snap({ id: 's1', health: 72, verdict: 'CONSIDER', sceneCount: 6 })]);
    assert.equal(entry.health, 72);
    assert.equal(entry.healthPercentile, null);
  });

  it('does not mutate the input array', () => {
    const input = [snap({ id: 'a', healthPercentile: 40 })];
    const copy = JSON.parse(JSON.stringify(input));
    snapshotTrend(input);
    assert.deepEqual(input, copy);
  });
});

// ── computeDraftRank — "rank among your own saved drafts" ──────────────────
// The second, honest denominator alongside the calibration reference-set
// percentile (2026-09-04): where does the current draft's health land
// against the WRITER'S OWN saved snapshots of this script, never against any
// other writer's work.

describe('computeDraftRank', () => {
  it('returns null when currentHealth is not a finite number — never a fabricated position', () => {
    assert.equal(computeDraftRank([], null), null);
    assert.equal(computeDraftRank([], undefined), null);
    assert.equal(computeDraftRank([], Number.NaN), null);
  });

  it('with no saved snapshots at all, the current draft is "1st of 1"', () => {
    assert.deepEqual(computeDraftRank([], 70), { rank: 1, of: 1 });
  });

  it('with saved snapshots that carry no health value (legacy/unscored), still "1st of 1"', () => {
    const snapshots = [snap({ id: 'a' }), snap({ id: 'b' })];
    assert.deepEqual(computeDraftRank(snapshots, 70), { rank: 1, of: 1 });
  });

  it('ranks the current draft among saved snapshots by health, descending', () => {
    const snapshots = [
      snap({ id: 'a', health: 90 }),
      snap({ id: 'b', health: 60 }),
      snap({ id: 'c', health: 40 }),
    ];
    assert.deepEqual(computeDraftRank(snapshots, 70), { rank: 2, of: 4 }, 'behind 90, ahead of 60 and 40');
    assert.deepEqual(computeDraftRank(snapshots, 95), { rank: 1, of: 4 }, 'ahead of every saved draft');
    assert.deepEqual(computeDraftRank(snapshots, 10), { rank: 4, of: 4 }, 'behind every saved draft');
  });

  it('an exact tie shares the better rank rather than being bumped down', () => {
    const snapshots = [snap({ id: 'a', health: 70 })];
    assert.deepEqual(computeDraftRank(snapshots, 70), { rank: 1, of: 2 });
  });

  it('ignores snapshots with no health value when counting, but keeps the ones that have one', () => {
    const snapshots = [
      snap({ id: 'scored', health: 55 }),
      snap({ id: 'unscored' }),
    ];
    assert.deepEqual(computeDraftRank(snapshots, 80), { rank: 1, of: 2 });
  });

  it('does not mutate the input array', () => {
    const input = [snap({ id: 'a', health: 10 }), snap({ id: 'b', health: 20 })];
    const copy = JSON.parse(JSON.stringify(input));
    computeDraftRank(input, 50);
    assert.deepEqual(input, copy);
  });
});

// ── snapshotDraftRanks — the same rank, per saved snapshot ──────────────────
// The Versions list honesty-audit fix (2026-09-04): each SAVED snapshot now
// shows where it ranks among the OTHER saved snapshots, using the exact same
// computeDraftRank the current-draft rank already uses — never a second
// ranking implementation. These tests prove the per-snapshot rank agrees
// EXACTLY with what computeDraftRank(others, thisHealth) would say directly.

describe('snapshotDraftRanks', () => {
  it('returns an empty array for no snapshots', () => {
    assert.deepEqual(snapshotDraftRanks([]), []);
  });

  it('returns null for a snapshot with no health value', () => {
    const [rank] = snapshotDraftRanks([snap({ id: 'a' })]);
    assert.equal(rank, null);
  });

  it('a lone scored snapshot is "1st of 1" — nothing else to rank against', () => {
    const [rank] = snapshotDraftRanks([snap({ id: 'a', health: 70 })]);
    assert.deepEqual(rank, { rank: 1, of: 1 });
  });

  it('ranks each snapshot against every OTHER snapshot in the array, by health', () => {
    const snapshots = [
      snap({ id: 'a', health: 90 }),
      snap({ id: 'b', health: 60 }),
      snap({ id: 'c', health: 40 }),
    ];
    const ranks = snapshotDraftRanks(snapshots);
    assert.deepEqual(ranks[0], { rank: 1, of: 3 }, 'the 90 is ahead of both others');
    assert.deepEqual(ranks[1], { rank: 2, of: 3 }, 'the 60 is behind 90, ahead of 40');
    assert.deepEqual(ranks[2], { rank: 3, of: 3 }, 'the 40 is behind both others');
  });

  it('agrees exactly with computeDraftRank(others, thisHealth) called directly — same source, never a second implementation', () => {
    const snapshots = [
      snap({ id: 'a', health: 90 }),
      snap({ id: 'b', health: 60 }),
      snap({ id: 'c', health: 75 }),
    ];
    const ranks = snapshotDraftRanks(snapshots);
    snapshots.forEach((s, i) => {
      const others = snapshots.filter((_, j) => j !== i);
      assert.deepEqual(ranks[i], computeDraftRank(others, s.health));
    });
  });

  it('a snapshot with no health value is excluded when ranking its siblings, but still gets null itself', () => {
    const snapshots = [
      snap({ id: 'scored-high', health: 90 }),
      snap({ id: 'unscored' }),
      snap({ id: 'scored-low', health: 40 }),
    ];
    const ranks = snapshotDraftRanks(snapshots);
    assert.deepEqual(ranks[0], { rank: 1, of: 2 }, 'the unscored sibling does not count toward "of"');
    assert.equal(ranks[1], null);
    assert.deepEqual(ranks[2], { rank: 2, of: 2 });
  });

  it('preserves input order and length 1:1 with the input snapshots array', () => {
    const input = [snap({ id: 'a', health: 10 }), snap({ id: 'b' }), snap({ id: 'c', health: 20 })];
    const ranks = snapshotDraftRanks(input);
    assert.equal(ranks.length, 3);
    assert.notEqual(ranks[0], null);
    assert.equal(ranks[1], null);
    assert.notEqual(ranks[2], null);
  });

  it('does not mutate the input array', () => {
    const input = [snap({ id: 'a', health: 10 }), snap({ id: 'b', health: 20 })];
    const copy = JSON.parse(JSON.stringify(input));
    snapshotDraftRanks(input);
    assert.deepEqual(input, copy);
  });
});
