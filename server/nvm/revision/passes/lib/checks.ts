// Shared analytical-mode templates for NVM revision-pass checks (audit M2.2).
//
// Every wave since ~Wave 130 has re-implemented one of a handful of recurring
// shapes (an aftermath window, a drought run, a zone cluster, a co-occurrence
// decoupling, a front/back-loading ratio, a peak-isolation backward-cause
// check, a four-zone imbalance) inline, each time re-deriving the loop and
// re-casting `records as any[]`. That duplication is why the passes grew to
// ~47,500 lines with 1,326 `as any` casts and no compiler protection over the
// most-copied code in the server (see the repo audit, finding Q1/Q2).
//
// These functions extract the DETECTION logic only — the numeric/structural
// question of whether a pattern fires — typed against the real
// ScreenplaySceneRecord, not `any[]`. They deliberately do NOT construct the
// RevisionIssue (location/description/suggestedFix/severity): that prose is
// where a check's craft and distinctness rationale live, and per the
// project's standing CRITICAL RULE each one must be reviewed and hand-written
// per rule, not templated. Callers do:
//
//   const r = checkZoneCluster({ records, minRecords: 9, minCount: 3,
//     ratioThreshold: 0.75, isPresent: r => (r.seededClueIds.length > 0) });
//   if (r.fires) issues.push({ rule: 'MY_RULE', location: ..., description: ..., ... });
//
// Existing rules (Wave ≤592) are NOT retrofitted to use this library — they
// are frozen and green. Only new waves (593+) should reach for these.

import type { ScreenplaySceneRecord } from '../../../screenplay/memory.ts';

/** A per-scene test, given the record, its index, and the full record array. */
export type ScenePredicate = (
  record: ScreenplaySceneRecord,
  index: number,
  records: ScreenplaySceneRecord[],
) => boolean;

// ── 1. Sequence/aftermath ─────────────────────────────────────────────────────
//
// Fires when EVERY qualifying trigger scene (one for which a `window`-scene
// lookahead exists) is never followed by an aftermath signal within that
// window. Mirrors the "every rupture/seed/clock/proactive act is followed by
// N flat scenes" shape used throughout conflict.ts, intention.ts, causality.ts.

export interface AftermathVoidOptions {
  records: ScreenplaySceneRecord[];
  /** Minimum records.length required to run this check at all. */
  minRecords: number;
  /** Minimum number of qualifying trigger scenes required. */
  minTriggerCount: number;
  /** Minimum number of scenes anywhere satisfying isAftermath, required so the
   *  check only fires when the aftermath signal genuinely exists in the story
   *  (proving decoupling, not global absence of the signal). */
  minAftermathCount: number;
  /** How many scenes after the trigger to check (inclusive), e.g. 2. */
  window: number;
  isTrigger: ScenePredicate;
  isAftermath: ScenePredicate;
}

export interface AftermathVoidResult {
  fires: boolean;
  /** Trigger scenes with a full lookahead window available. */
  triggerCount: number;
  /** Total scenes anywhere satisfying isAftermath. */
  aftermathCount: number;
}

export function checkAftermathVoid(opts: AftermathVoidOptions): AftermathVoidResult {
  const { records, minRecords, minTriggerCount, minAftermathCount, window, isTrigger, isAftermath } = opts;
  const n = records.length;
  if (n < minRecords) return { fires: false, triggerCount: 0, aftermathCount: 0 };

  const aftermathCount = records.filter((r, i) => isAftermath(r, i, records)).length;
  // Only scenes with a FULL lookahead window remaining qualify as triggers — matches the
  // established `pos < n - window` convention used throughout the hand-rolled aftermath
  // checks this library replaces, so every qualifying trigger is checked against the same
  // full window rather than a truncated one near the end of the story.
  const triggers = records.filter((r, i) => i < n - window && isTrigger(r, i, records));

  if (triggers.length < minTriggerCount || aftermathCount < minAftermathCount) {
    return { fires: false, triggerCount: triggers.length, aftermathCount };
  }

  const allVoid = triggers.every(r => {
    const idx = records.indexOf(r);
    for (let off = 1; off <= window; off++) {
      if (idx + off >= n) continue;
      if (isAftermath(records[idx + off], idx + off, records)) return false;
    }
    return true;
  });

  return { fires: allVoid, triggerCount: triggers.length, aftermathCount };
}

// ── 2. Run-based (drought/absence) ────────────────────────────────────────────
//
// Fires when the longest consecutive run of scenes where isPresent is FALSE
// reaches runThreshold, while at least minPresentCount scenes elsewhere do
// satisfy isPresent (proving the signal exists but goes dark for a stretch).

export interface DroughtRunOptions {
  records: ScreenplaySceneRecord[];
  minRecords: number;
  minPresentCount: number;
  runThreshold: number;
  isPresent: ScenePredicate;
}

export interface DroughtRunResult {
  fires: boolean;
  longestRun: number;
  runStartIdx: number;
  presentCount: number;
}

export function checkDroughtRun(opts: DroughtRunOptions): DroughtRunResult {
  const { records, minRecords, minPresentCount, runThreshold, isPresent } = opts;
  const n = records.length;
  if (n < minRecords) return { fires: false, longestRun: 0, runStartIdx: -1, presentCount: 0 };

  const presentCount = records.filter((r, i) => isPresent(r, i, records)).length;
  if (presentCount < minPresentCount) {
    return { fires: false, longestRun: 0, runStartIdx: -1, presentCount };
  }

  let longestRun = 0;
  let longestStart = -1;
  let curRun = 0;
  let curStart = 0;
  for (let i = 0; i < n; i++) {
    if (!isPresent(records[i], i, records)) {
      if (curRun === 0) curStart = i;
      curRun++;
      if (curRun > longestRun) { longestRun = curRun; longestStart = curStart; }
    } else {
      curRun = 0;
    }
  }

  return { fires: longestRun >= runThreshold, longestRun, runStartIdx: longestStart, presentCount };
}

// ── 3. Distribution/timing — zone cluster (thirds) ────────────────────────────
//
// Fires when more than ratioThreshold of isPresent scenes fall in a single
// structural third (opening/middle/closing).

export interface ZoneClusterOptions {
  records: ScreenplaySceneRecord[];
  minRecords: number;
  minCount: number;
  ratioThreshold: number;
  isPresent: ScenePredicate;
}

export interface ZoneClusterResult {
  fires: boolean;
  count: number;
  maxZoneIdx: number;
  maxZoneCount: number;
  zoneNames: readonly [string, string, string];
}

const THIRD_ZONE_NAMES = ['opening', 'middle', 'closing'] as const;

export function checkZoneCluster(opts: ZoneClusterOptions): ZoneClusterResult {
  const { records, minRecords, minCount, ratioThreshold, isPresent } = opts;
  const n = records.length;
  const empty: ZoneClusterResult = { fires: false, count: 0, maxZoneIdx: -1, maxZoneCount: 0, zoneNames: THIRD_ZONE_NAMES };
  if (n < minRecords) return empty;

  const zoneCounts: [number, number, number] = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (isPresent(records[i], i, records)) {
      count++;
      zoneCounts[Math.min(2, Math.floor((i / n) * 3))]++;
    }
  }
  if (count < minCount) return { ...empty, count };

  const maxZoneCount = Math.max(...zoneCounts);
  const maxZoneIdx = zoneCounts.indexOf(maxZoneCount);
  return {
    fires: maxZoneCount / count > ratioThreshold,
    count, maxZoneIdx, maxZoneCount, zoneNames: THIRD_ZONE_NAMES,
  };
}

// ── 4. Co-occurrence/decoupling ───────────────────────────────────────────────
//
// Fires when zero scenes satisfy BOTH isA and isB simultaneously, while each
// individually has enough occurrences to make the absence of overlap meaningful.

export interface CoOccurrenceDecoupledOptions {
  records: ScreenplaySceneRecord[];
  minRecords: number;
  minACount: number;
  minBCount: number;
  isA: ScenePredicate;
  isB: ScenePredicate;
}

export interface CoOccurrenceDecoupledResult {
  fires: boolean;
  aCount: number;
  bCount: number;
}

export function checkCoOccurrenceDecoupled(opts: CoOccurrenceDecoupledOptions): CoOccurrenceDecoupledResult {
  const { records, minRecords, minACount, minBCount, isA, isB } = opts;
  const n = records.length;
  if (n < minRecords) return { fires: false, aCount: 0, bCount: 0 };

  const aCount = records.filter((r, i) => isA(r, i, records)).length;
  const bCount = records.filter((r, i) => isB(r, i, records)).length;
  if (aCount < minACount || bCount < minBCount) return { fires: false, aCount, bCount };

  const anyOverlap = records.some((r, i) => isA(r, i, records) && isB(r, i, records));
  return { fires: !anyOverlap, aCount, bCount };
}

// ── 5. Distribution/timing — half-loaded (front/back) ─────────────────────────
//
// Fires when more than ratioThreshold of isPresent scenes fall in one half of
// the story while the other half still has at least minOtherHalfCount.

export interface HalfLoadedOptions {
  records: ScreenplaySceneRecord[];
  minRecords: number;
  minCount: number;
  ratioThreshold: number;
  direction: 'front' | 'back';
  isPresent: ScenePredicate;
  minOtherHalfCount?: number;
}

export interface HalfLoadedResult {
  fires: boolean;
  count: number;
  matchingHalfCount: number;
  otherHalfCount: number;
}

export function checkHalfLoaded(opts: HalfLoadedOptions): HalfLoadedResult {
  const { records, minRecords, minCount, ratioThreshold, direction, isPresent, minOtherHalfCount = 1 } = opts;
  const n = records.length;
  if (n < minRecords) return { fires: false, count: 0, matchingHalfCount: 0, otherHalfCount: 0 };

  const half = Math.floor(n / 2);
  const firstHalfCount = records.slice(0, half).filter((r, i) => isPresent(r, i, records)).length;
  const total = records.filter((r, i) => isPresent(r, i, records)).length;
  const secondHalfCount = total - firstHalfCount;
  if (total < minCount) return { fires: false, count: total, matchingHalfCount: 0, otherHalfCount: 0 };

  const matchingHalfCount = direction === 'front' ? firstHalfCount : secondHalfCount;
  const otherHalfCount = direction === 'front' ? secondHalfCount : firstHalfCount;
  return {
    fires: matchingHalfCount / total > ratioThreshold && otherHalfCount >= minOtherHalfCount,
    count: total, matchingHalfCount, otherHalfCount,
  };
}

// ── 6. Backward-cause / single-peak isolation ─────────────────────────────────
//
// Finds the single scene with the maximum `magnitude`, then checks whether the
// peak scene itself or any of the `lookback` prior scenes satisfies hasCause.
// Fires when the peak has no cause — the story's biggest instance of a signal
// arrives without preparation.

export interface PeakUncausedOptions {
  records: ScreenplaySceneRecord[];
  minRecords: number;
  /** Minimum scenes with magnitude > 0 required for the peak to be meaningful. */
  minQualifying: number;
  lookback: number;
  magnitude: (record: ScreenplaySceneRecord, index: number, records: ScreenplaySceneRecord[]) => number;
  hasCause: ScenePredicate;
}

export interface PeakUncausedResult {
  fires: boolean;
  peakIdx: number;
  peakMagnitude: number;
  qualifyingCount: number;
}

export function checkPeakUncaused(opts: PeakUncausedOptions): PeakUncausedResult {
  const { records, minRecords, minQualifying, lookback, magnitude, hasCause } = opts;
  const n = records.length;
  if (n < minRecords) return { fires: false, peakIdx: -1, peakMagnitude: 0, qualifyingCount: 0 };

  const magnitudes = records.map((r, i) => magnitude(r, i, records));
  const qualifyingCount = magnitudes.filter(m => m > 0).length;
  if (qualifyingCount < minQualifying) return { fires: false, peakIdx: -1, peakMagnitude: 0, qualifyingCount };

  let peakIdx = 0;
  for (let i = 1; i < n; i++) if (magnitudes[i] > magnitudes[peakIdx]) peakIdx = i;

  let caused = hasCause(records[peakIdx], peakIdx, records);
  for (let back = 1; back <= lookback && !caused; back++) {
    const idx = peakIdx - back;
    if (idx < 0) break;
    caused = hasCause(records[idx], idx, records);
  }

  return { fires: !caused, peakIdx, peakMagnitude: magnitudes[peakIdx], qualifyingCount };
}

// ── 7. Underweight/bloat — four-zone imbalance ────────────────────────────────
//
// Divides the story into four equal structural zones (Act 1: 0-25%, Act 2a:
// 25-50%, Act 2b: 50-75%, Act 3: 75-100%). Fires when at least one zone has
// zero isPresent scenes while another holds >= bloatRatio of the total.

export interface ZoneImbalanceOptions {
  records: ScreenplaySceneRecord[];
  minRecords: number;
  minCount: number;
  bloatRatio: number;
  isPresent: ScenePredicate;
}

export interface ZoneImbalanceResult {
  fires: boolean;
  counts: [number, number, number, number];
  totalCount: number;
  emptyZoneIdxs: number[];
  bloatZoneIdx: number;
}

export const FOUR_ZONE_NAMES = ['Act 1 (0–25%)', 'Act 2a (25–50%)', 'Act 2b (50–75%)', 'Act 3 (75–100%)'] as const;

export function checkZoneImbalance(opts: ZoneImbalanceOptions): ZoneImbalanceResult {
  const { records, minRecords, minCount, bloatRatio, isPresent } = opts;
  const n = records.length;
  const empty: ZoneImbalanceResult = { fires: false, counts: [0, 0, 0, 0], totalCount: 0, emptyZoneIdxs: [], bloatZoneIdx: -1 };
  if (n < minRecords) return empty;

  const counts: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    if (isPresent(records[i], i, records)) counts[Math.min(3, Math.floor((i / n) * 4))]++;
  }
  const totalCount = counts.reduce((a, b) => a + b, 0);
  if (totalCount < minCount) return { ...empty, counts, totalCount };

  const bloatZoneIdx = counts.indexOf(Math.max(...counts));
  const emptyZoneIdxs = counts.map((c, i) => (c === 0 ? i : -1)).filter(i => i >= 0);
  const fires = emptyZoneIdxs.length > 0 && counts[bloatZoneIdx] / totalCount >= bloatRatio;

  return { fires, counts, totalCount, emptyZoneIdxs, bloatZoneIdx };
}
