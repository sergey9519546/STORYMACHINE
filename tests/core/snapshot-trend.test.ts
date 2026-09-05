// src/lib/snapshot-trend.ts — the pure snapshotTrend(snapshots) helper
// behind the Versions tab's compact trend row + sparkline (writer #9,
// upgrade-writer-experience discovery: "score over revisions"). Covers the
// delta math, the newest-first/previous-is-next-in-array ordering contract,
// and every missing-value combination (no crash, no fabricated numbers).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  snapshotTrend, computeDraftRank, snapshotDraftRanks, type DraftHistoryRecord,
} from '../../src/lib/snapshot-trend.ts';
import type { Snapshot } from '../../src/components/scriptide/SnapshotManager.tsx';

function snap(overrides: Partial<Snapshot> & { id: string }): Snapshot {
  return { name: 'v', text: 'x', date: 'd', ...overrides };
}

function histEntry(overrides: Partial<DraftHistoryRecord> = {}): DraftHistoryRecord {
  return { health: 50, contentHash: 'h'.repeat(64), at: 1000, ...overrides };
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
// against the WRITER'S OWN saved drafts of this script, never against any
// other writer's work.
//
// Audit fix (2026-09-04): this used to rank only ScriptIDE `snapshots`
// (Versions tab), leaving ScriptDoctorPanel's own Draft History — a
// complete record of the writer's runs on this script — invisible to the
// rank entirely, AND collapsed "nothing scored yet" and "genuinely nothing
// saved yet" into the same fabricated `{ rank: 1, of: 1 }`. The tests below
// cover the UNION ranking, the cross-store dedupe, and the now-distinct
// three return states.

describe('computeDraftRank', () => {
  it('returns null when currentHealth is not a finite number — never a fabricated position', () => {
    assert.equal(computeDraftRank([], [], null), null);
    assert.equal(computeDraftRank([], [], undefined), null);
    assert.equal(computeDraftRank([], [], Number.NaN), null);
  });

  // ── The REAL state the app produces (independent review round 2, 2026-09-05) ──
  // recordDoctorHistory (ScriptDoctorPanel.tsx) writes a Draft History row for
  // EVERY completed diagnosis BEFORE computeDraftRank ever runs — so
  // `history` passed to computeDraftRank from the live panel always already
  // contains an entry for the report on screen (measured live: even the
  // panel's own "Try a sample script" flow writes one — see state E below,
  // which was previously commented as "sample runs never reach
  // recordDoctorHistory"; that is not what the running app does, though the
  // exclusion below still makes the assertion hold either way, which is why
  // it's worth stating both facts rather than the wrong one). Every case
  // above and below this point (outside this block) passes a `history`
  // array that does NOT contain that self-entry, which is why the
  // double-count bug was invisible to this suite. These 5 cases are the
  // reviewer's own driven-in-Chromium table (A-E), translated to
  // computeDraftRank calls with currentContentHash/currentAt threaded
  // through exactly as ScriptDoctorPanel.tsx now does.
  describe('computeDraftRank — excludes the current run\'s own Draft History/Snapshot row (review round 2)', () => {
    it('state A: 1 doctor run, 0 saved Versions -> "1st of 1" (first saved draft), NOT "tied 1st of 2"', () => {
      const H = 'a'.repeat(64);
      // The self-entry recordDoctorHistory already wrote for THIS report.
      const history = [histEntry({ contentHash: H, health: 62, at: 5000 })];
      const rank = computeDraftRank([], history, 62, H, 5000);
      assert.deepEqual(rank, { rank: 1, of: 1, tied: false, unscored: 0 });
    });

    it('state B: 2 runs, 0 saved Versions -> "of 2" (the earlier run + current), not 3', () => {
      const H1 = 'b1'.padEnd(64, '0');
      const H2 = 'b2'.padEnd(64, '0'); // current
      const history = [
        histEntry({ contentHash: H1, health: 40, at: 1000 }),
        histEntry({ contentHash: H2, health: 62, at: 5000 }),
      ];
      const rank = computeDraftRank([], history, 62, H2, 5000);
      assert.deepEqual(rank, { rank: 1, of: 2, tied: false, unscored: 0 }, 'ahead of the one earlier run; current excluded from the "other" count');
    });

    it('state C: 3 runs + 1 unscored saved Version -> "of 3" (2 other runs + current); the unscored Version stays excluded, not counted and not silently inflating "of"', () => {
      const Hcur = 'c3'.padEnd(64, '0');
      const history = [
        histEntry({ contentHash: 'c1'.padEnd(64, '0'), health: 30, at: 1000 }),
        histEntry({ contentHash: 'c2'.padEnd(64, '0'), health: 50, at: 2000 }),
        histEntry({ contentHash: Hcur, health: 62, at: 5000 }),
      ];
      const snapshots = [snap({ id: 'unscored-version' })]; // saved Version, no health
      const rank = computeDraftRank(snapshots, history, 62, Hcur, 5000);
      assert.deepEqual(rank, { rank: 1, of: 3, tied: false, unscored: 1 });
    });

    it('state D: 3 runs + 2 identical-health saved Versions + 1 unscored -> "of 5", tied: true (a REAL tie, against the 2 Versions, not against itself)', () => {
      const Hcur = 'd3'.padEnd(64, '0');
      const history = [
        histEntry({ contentHash: 'd1'.padEnd(64, '0'), health: 30, at: 1000 }),
        histEntry({ contentHash: 'd2'.padEnd(64, '0'), health: 50, at: 2000 }),
        histEntry({ contentHash: Hcur, health: 62, at: 5000 }),
      ];
      const snapshots = [
        snap({ id: 'v1', health: 62, contentHash: 'dv1'.padEnd(64, '0') }),
        snap({ id: 'v2', health: 62, contentHash: 'dv2'.padEnd(64, '0') }),
        snap({ id: 'v3' }), // unscored
      ];
      const rank = computeDraftRank(snapshots, history, 62, Hcur, 5000);
      assert.deepEqual(rank, { rank: 1, of: 5, tied: true, unscored: 1 });
    });

    it('state E: 5 unscored saved Versions + a sample run -> the unscored shape, not "tied 1st of 2" (holds whether or not the sample run itself reached Draft History, because the exclusion drops it either way)', () => {
      // Whether or not this exact run also wrote a Draft History row, it is
      // either absent (nothing to exclude) or excluded by contentHash match
      // (the same run as `currentContentHash`) — either way `history`
      // contributes nothing scored here, so this asserts the state the
      // writer actually sees regardless of that implementation detail.
      const snapshots = [1, 2, 3, 4, 5].map((n) => snap({ id: `ev${n}` })); // all unscored
      const rank = computeDraftRank(snapshots, [], 62, 'sample-hash'.padEnd(64, '0'), 9000);
      assert.deepEqual(rank, { rank: null, of: 0, unscored: 5 });
    });
  });

  // ── The 4 denominator states named in the 2026-09-04 audit (round 2) ──────

  it('denominator case 1: no snapshots and no history at all -> the genuine first-draft copy state', () => {
    assert.deepEqual(computeDraftRank([], [], 70), { rank: 1, of: 1, tied: false, unscored: 0 });
  });

  it('denominator case 2: 5 snapshots, NONE with health -> the distinguishable unscored shape, never the old fabricated "1st of 1" (the false promise this audit fixed)', () => {
    const snapshots = [1, 2, 3, 4, 5].map((n) => snap({ id: `s${n}` }));
    assert.deepEqual(computeDraftRank(snapshots, [], 70), { rank: null, of: 0, unscored: 5 });
  });

  it('denominator case 3: 5 snapshots, only 1 with health -> ranks among just that 1 ("1st of 2") — the other 4 have no health to rank by, so they correctly don\'t enter the count (not a silent loss: they still surface via the "unscored" count in case 2\'s shape when NONE are scored, and via the ranked branch\'s own `unscored` field here)', () => {
    const snapshots = [
      snap({ id: 'scored', health: 55 }),
      snap({ id: 'u1' }), snap({ id: 'u2' }), snap({ id: 'u3' }), snap({ id: 'u4' }),
    ];
    assert.deepEqual(computeDraftRank(snapshots, [], 80), { rank: 1, of: 2, tied: false, unscored: 4 }, 'ahead of the one scored draft (55); the 4 unscored ones are excluded from the ranked count but named in `unscored`');
  });

  it('denominator case 4: 5 OTHER drafts share the exact same health as the current one -> "tied 1st of 6", not a bare "1st of 6" that reads as clean separation', () => {
    const snapshots = [1, 2, 3, 4, 5].map((n) => snap({ id: `s${n}`, health: 70 }));
    assert.deepEqual(computeDraftRank(snapshots, [], 70), { rank: 1, of: 6, tied: true, unscored: 0 });
  });

  it('with saved snapshots that carry no health value (legacy/unscored) and no history, returns the distinguishable unscored shape — never a fabricated "1st of 1"', () => {
    const snapshots = [snap({ id: 'a' }), snap({ id: 'b' })];
    assert.deepEqual(computeDraftRank(snapshots, [], 70), { rank: null, of: 0, unscored: 2 });
  });

  it('with only unscored history entries and no snapshots, same unscored shape', () => {
    // health omitted -> not a finite health per numberOrNull's contract; cast
    // through Partial since DraftHistoryRecord.health is normally required.
    const history = [{ contentHash: 'x'.repeat(64), at: 1 } as unknown as DraftHistoryRecord];
    assert.deepEqual(computeDraftRank([], history, 70), { rank: null, of: 0, unscored: 1 });
  });

  it('unscored count sums across BOTH stores', () => {
    const snapshots = [snap({ id: 'a' }), snap({ id: 'b' })]; // 2 unscored
    const history = [{ contentHash: 'y'.repeat(64), at: 1 } as unknown as DraftHistoryRecord]; // 1 unscored
    assert.deepEqual(computeDraftRank(snapshots, history, 70), { rank: null, of: 0, unscored: 3 });
  });

  it('ranks the current draft among saved snapshots by health, descending (history empty)', () => {
    const snapshots = [
      snap({ id: 'a', health: 90 }),
      snap({ id: 'b', health: 60 }),
      snap({ id: 'c', health: 40 }),
    ];
    assert.deepEqual(computeDraftRank(snapshots, [], 70), { rank: 2, of: 4, tied: false, unscored: 0 }, 'behind 90, ahead of 60 and 40');
    assert.deepEqual(computeDraftRank(snapshots, [], 95), { rank: 1, of: 4, tied: false, unscored: 0 }, 'ahead of every saved draft');
    assert.deepEqual(computeDraftRank(snapshots, [], 10), { rank: 4, of: 4, tied: false, unscored: 0 }, 'behind every saved draft');
  });

  it('ranks the current draft among Draft History entries too, when there are no snapshots at all', () => {
    const history = [
      histEntry({ contentHash: 'a'.repeat(64), health: 90 }),
      histEntry({ contentHash: 'b'.repeat(64), health: 60 }),
    ];
    assert.deepEqual(computeDraftRank([], history, 70), { rank: 2, of: 3, tied: false, unscored: 0 }, 'behind 90, ahead of 60 — the writer never used Versions, and still ranks');
  });

  it('ranks among the UNION of snapshots and history when both are non-empty and distinct runs', () => {
    const snapshots = [snap({ id: 's1', health: 85 })];
    const history = [
      histEntry({ contentHash: 'c1'.padEnd(64, '0'), health: 60, at: 1000 }),
      histEntry({ contentHash: 'c2'.padEnd(64, '0'), health: 30, at: 2000 }),
    ];
    // 3 distinct saved records (85, 60, 30) + current (70) = 4.
    assert.deepEqual(computeDraftRank(snapshots, history, 70), { rank: 2, of: 4, tied: false, unscored: 0 }, 'behind 85, ahead of 60 and 30');
  });

  it('dedupes a run recorded in BOTH stores by exact contentHash match — counted once, not twice', () => {
    const hash = 'shared'.padEnd(64, '0');
    const snapshots = [snap({ id: 's1', health: 60, contentHash: hash, analyzedAt: 1000 })];
    const history = [histEntry({ contentHash: hash, health: 60, at: 1000 })];
    // Same run — total saved records is 1, not 2: current(70) + 60 = 2 total.
    assert.deepEqual(computeDraftRank(snapshots, history, 70), { rank: 1, of: 2, tied: false, unscored: 0 });
  });

  it('does NOT dedupe when contentHash differs, even if health and timestamp coincide', () => {
    const snapshots = [snap({ id: 's1', health: 60, contentHash: 'aaaa'.padEnd(64, '0'), analyzedAt: 1000 })];
    const history = [histEntry({ contentHash: 'bbbb'.padEnd(64, '0'), health: 60, at: 1000 })];
    assert.deepEqual(computeDraftRank(snapshots, history, 70), { rank: 1, of: 3, tied: false, unscored: 0 }, '2 distinct saved records + current');
  });

  it('falls back to health+timestamp dedupe when the snapshot predates contentHash (no hash on that side)', () => {
    // Legacy snapshot: no contentHash field at all, but health/analyzedAt
    // line up with a Draft History entry recorded moments later.
    const snapshots = [snap({ id: 's1', health: 60, analyzedAt: 1_000_000 })];
    const history = [histEntry({ contentHash: 'z'.repeat(64), health: 60, at: 1_000_500 })]; // 500ms later, same run
    assert.deepEqual(computeDraftRank(snapshots, history, 70), { rank: 1, of: 2, tied: false, unscored: 0 }, 'treated as the same run — deduped to 1 saved record');
  });

  it('does NOT fall back to health+timestamp dedupe once timestamps are far apart — treated as genuinely separate runs', () => {
    const snapshots = [snap({ id: 's1', health: 60, analyzedAt: 1_000_000 })];
    const history = [histEntry({ contentHash: 'z'.repeat(64), health: 60, at: 1_100_000 })]; // 100s later
    assert.deepEqual(computeDraftRank(snapshots, history, 70), { rank: 1, of: 3, tied: false, unscored: 0 }, '2 distinct saved records + current');
  });

  it('an exact tie shares the better rank rather than being bumped down, and sets tied: true', () => {
    const snapshots = [snap({ id: 'a', health: 70 })];
    assert.deepEqual(computeDraftRank(snapshots, [], 70), { rank: 1, of: 2, tied: true, unscored: 0 });
  });

  it('tied is false when ranks/healths differ, even at rank 1', () => {
    const snapshots = [snap({ id: 'a', health: 40 })];
    assert.deepEqual(computeDraftRank(snapshots, [], 70), { rank: 1, of: 2, tied: false, unscored: 0 });
  });

  it('a tie can come from EITHER store — a Draft History entry at the same health as current also sets tied: true', () => {
    const history = [histEntry({ contentHash: 'tie'.padEnd(64, '0'), health: 70 })];
    assert.deepEqual(computeDraftRank([], history, 70), { rank: 1, of: 2, tied: true, unscored: 0 });
  });

  it('the genuinely-first-draft state is never tied — there is nothing else to tie with', () => {
    assert.deepEqual(computeDraftRank([], [], 70), { rank: 1, of: 1, tied: false, unscored: 0 });
  });

  it('ignores unscored records when counting, but keeps every scored one — across both stores', () => {
    const snapshots = [
      snap({ id: 'scored', health: 55 }),
      snap({ id: 'unscored' }),
    ];
    const history = [
      histEntry({ contentHash: 'q'.repeat(64), health: 45 }),
      { contentHash: 'r'.repeat(64), at: 1 } as unknown as DraftHistoryRecord, // unscored history entry
    ];
    assert.deepEqual(computeDraftRank(snapshots, history, 80), { rank: 1, of: 3, tied: false, unscored: 2 }, 'ahead of 55 and 45; both unscored records ignored from the count but named in `unscored`');
  });

  it('does not mutate either input array', () => {
    const inputSnaps = [snap({ id: 'a', health: 10 }), snap({ id: 'b', health: 20 })];
    const inputHistory = [histEntry({ contentHash: 'm'.repeat(64), health: 30 })];
    const copySnaps = JSON.parse(JSON.stringify(inputSnaps));
    const copyHistory = JSON.parse(JSON.stringify(inputHistory));
    computeDraftRank(inputSnaps, inputHistory, 50);
    assert.deepEqual(inputSnaps, copySnaps);
    assert.deepEqual(inputHistory, copyHistory);
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
    assert.deepEqual(rank, { rank: 1, of: 1, tied: false, unscored: 0 });
  });

  it('ranks each snapshot against every OTHER snapshot in the array, by health', () => {
    const snapshots = [
      snap({ id: 'a', health: 90 }),
      snap({ id: 'b', health: 60 }),
      snap({ id: 'c', health: 40 }),
    ];
    const ranks = snapshotDraftRanks(snapshots);
    assert.deepEqual(ranks[0], { rank: 1, of: 3, tied: false, unscored: 0 }, 'the 90 is ahead of both others');
    assert.deepEqual(ranks[1], { rank: 2, of: 3, tied: false, unscored: 0 }, 'the 60 is behind 90, ahead of 40');
    assert.deepEqual(ranks[2], { rank: 3, of: 3, tied: false, unscored: 0 }, 'the 40 is behind both others');
  });

  it('agrees exactly with computeDraftRank(others, [], thisHealth) called directly — same source, never a second implementation', () => {
    const snapshots = [
      snap({ id: 'a', health: 90 }),
      snap({ id: 'b', health: 60 }),
      snap({ id: 'c', health: 75 }),
    ];
    const ranks = snapshotDraftRanks(snapshots);
    snapshots.forEach((s, i) => {
      const others = snapshots.filter((_, j) => j !== i);
      assert.deepEqual(ranks[i], computeDraftRank(others, [], s.health));
    });
  });

  it('a snapshot with no health value is excluded when ranking its siblings, but still gets null itself', () => {
    const snapshots = [
      snap({ id: 'scored-high', health: 90 }),
      snap({ id: 'unscored' }),
      snap({ id: 'scored-low', health: 40 }),
    ];
    const ranks = snapshotDraftRanks(snapshots);
    assert.deepEqual(ranks[0], { rank: 1, of: 2, tied: false, unscored: 1 }, 'the unscored sibling does not count toward "of" but is named in `unscored`');
    assert.equal(ranks[1], null);
    assert.deepEqual(ranks[2], { rank: 2, of: 2, tied: false, unscored: 1 });
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

  // REVIEW round-2-re-review caveat (2026-09-05): currentContentHash/
  // currentAt are OPTIONAL on computeDraftRank, so a stale call site
  // compiles fine and can silently reintroduce a self-count. This proves
  // snapshotDraftRanks itself never does — but "never ranks against
  // itself" means never ranks against its own ARRAY SLOT, not never ranks
  // against a genuinely separate save that happens to share content. An
  // earlier version of this test (and of snapshotDraftRanks itself) got
  // that distinction backwards: it forwarded the snapshot's own
  // contentHash/analyzedAt into computeDraftRank's self-exclusion params,
  // which then matched and dropped a SIBLING snapshot that merely shared
  // the same content — silently shrinking "of" for two real, distinct
  // Save-Version clicks. scripts/verify-p2-p3-surfaces.mjs's own product
  // test ("Ranks 1st of 2 by health among your saved drafts") saves the
  // same script twice on purpose and requires BOTH to count; this test
  // pins the same contract at the unit level, plus the real self-count
  // guard (an N-snapshot array must never read as "of N+1").
  it('two snapshots that are genuine duplicates (same contentHash, same health, different array index — Save Version clicked twice with no edit) each count as a SEPARATE draft, tied for 1st', () => {
    const dupeHash = 'dupe'.padEnd(64, '0');
    const snapshots = [
      snap({ id: 'first-save', health: 70, contentHash: dupeHash, analyzedAt: 1000 }),
      snap({ id: 'other', health: 55, contentHash: 'other'.padEnd(64, '0'), analyzedAt: 2000 }),
      // Re-saved the identical text later (same contentHash, same health) —
      // a real thing a writer can do (Save Version twice with no edit
      // in between), and a real distinct saved record, not a re-display of
      // the first one.
      snap({ id: 'second-save', health: 70, contentHash: dupeHash, analyzedAt: 3000 }),
    ];
    const ranks = snapshotDraftRanks(snapshots);
    // "of: 3" (not 2): first-save's own duplicate (second-save) IS counted
    // as another draft, tied with it for 1st, ahead of "other".
    assert.deepEqual(ranks[0], { rank: 1, of: 3, tied: true, unscored: 0 }, 'first-save vs. {other, second-save}: its content-identical sibling still counts and ties');
    assert.deepEqual(ranks[2], { rank: 1, of: 3, tied: true, unscored: 0 }, 'second-save vs. {other, first-save}: symmetric');
  });

  it('never inflates "of" by counting a snapshot against its own array slot — an N-snapshot array of distinct healths always reads "of N", never "of N+1"', () => {
    const snapshots = [
      snap({ id: 'a', health: 90, contentHash: 'a'.repeat(64), analyzedAt: 1000 }),
      snap({ id: 'b', health: 60, contentHash: 'b'.repeat(64), analyzedAt: 2000 }),
      snap({ id: 'c', health: 40, contentHash: 'c'.repeat(64), analyzedAt: 3000 }),
    ];
    const ranks = snapshotDraftRanks(snapshots);
    for (const r of ranks) assert.equal(r?.of, 3, 'three distinct snapshots, never "of 4" from a self-count');
  });
});
