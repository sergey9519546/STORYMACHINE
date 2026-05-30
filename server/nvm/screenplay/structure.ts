// Wave 37 — Live Screenplay Structure Tracking
// Computes: act position, midpoint pressure, escalation curve, reversal density,
// climax approach — derived live from the StoryCommit ledger.
//
// Reuses arc-tracker.ts and topology.ts where available.

import type { StoryCommit } from '../state/StoryCommit.ts';
import type { ScreenplaySceneRecord } from './memory.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActPosition = 'act1' | 'act2a' | 'midpoint' | 'act2b' | 'act3' | 'epilogue';

export interface StructureState {
  /** Current act position in the 3-act/5-act model */
  actPosition: ActPosition;
  /** 0-100: how far through the story we are */
  completionPercent: number;
  /** Average suspense per scene */
  avgSuspensePerScene: number;
  /** Is suspense trending up (escalation curve healthy)? */
  escalating: boolean;
  /** Number of scenes that caused a suspense DROP (reversals) */
  reversalCount: number;
  /** Density of reversals per 10 scenes */
  reversalDensity: number;
  /** Is the story approaching climax? (high clock levels, many threatened plans) */
  approachingClimax: boolean;
  /** Number of clues planted but not yet paid off */
  openClues: number;
  /** Number of scenes with a revelation (witnessed belief) */
  revelationCount: number;
  /** Midpoint pressure: suspense at the halfway point */
  midpointPressure: number;
  /** Tightest scene (highest suspense delta) */
  tightestScene: number | null;
}

// ── Structure analyzer ────────────────────────────────────────────────────────

/**
 * Derive the current structural state from the committed scene records.
 */
export function analyzeStructure(
  records: ScreenplaySceneRecord[],
  commits: StoryCommit[],
): StructureState {
  if (records.length === 0) {
    return {
      actPosition: 'act1',
      completionPercent: 0,
      avgSuspensePerScene: 0,
      escalating: false,
      reversalCount: 0,
      reversalDensity: 0,
      approachingClimax: false,
      openClues: 0,
      revelationCount: 0,
      midpointPressure: 0,
      tightestScene: null,
    };
  }

  const n = records.length;
  const suspenseValues = records.map(r => r.suspenseDelta);

  // ── Act position ──────────────────────────────────────────────────────────
  // Rough 3-act model: Act1 = first ~25%, Midpoint = ~50%, Act3 = last ~25%
  // In a live story we don't know the total length, so we use clock totals as proxy
  const totalClockPressure = commits
    .filter(c => !c.reverted)
    .flatMap(c => c.ops)
    .filter(o => o.op === 'RAISE_CLOCK')
    .reduce((s, o) => { const a = (o as { amount: number }).amount; return s + (isFinite(a) ? a : 0); }, 0);

  const actPosition: ActPosition =
    totalClockPressure >= 15 ? 'act3' :
    totalClockPressure >= 10 ? 'act2b' :
    totalClockPressure >= 7 ? 'midpoint' :
    totalClockPressure >= 4 ? 'act2a' :
    'act1';

  // ── Completion ────────────────────────────────────────────────────────────
  // Proxy: clock pressure normalized by expected max (20)
  const completionPercent = Math.min(100, Math.round((totalClockPressure / 20) * 100));

  // ── Escalation curve ──────────────────────────────────────────────────────
  const avgSuspensePerScene = n > 0
    ? Math.round(suspenseValues.reduce((s, v) => s + v, 0) / n)
    : 0;

  // Escalating if suspense is trending up in the second half vs first half
  const midN = Math.floor(n / 2);
  const firstHalfAvg = midN > 0
    ? suspenseValues.slice(0, midN).reduce((s, v) => s + v, 0) / midN
    : 0;
  const secondHalfAvg = n - midN > 0
    ? suspenseValues.slice(midN).reduce((s, v) => s + v, 0) / (n - midN)
    : 0;
  const escalating = secondHalfAvg > firstHalfAvg;

  // ── Reversals: scenes where suspense dropped significantly ────────────────
  const reversalCount = suspenseValues.filter(v => v < -1).length;
  const reversalDensity = n >= 10 ? Math.round((reversalCount / n) * 10) : reversalCount;

  // ── Climax approach ───────────────────────────────────────────────────────
  const recentRecords = records.slice(-3);
  const recentClockRaises = recentRecords.filter(r => r.clockRaised).length;
  const approachingClimax = recentClockRaises >= 2 || actPosition === 'act3';

  // ── Open clues ────────────────────────────────────────────────────────────
  // Build a Set to deduplicate clue IDs — a single clue can appear in multiple
  // records' unresolvedClues arrays, so a reduce-sum would overcount.
  const plantedClues = new Set<string>();
  for (const record of records) {
    for (const clueId of record.unresolvedClues) plantedClues.add(clueId);
  }
  const openClues = plantedClues.size;

  // ── Revelation count ──────────────────────────────────────────────────────
  const revelationCount = records.filter(r => r.revelation !== null).length;

  // ── Midpoint pressure ─────────────────────────────────────────────────────
  const midIdx = Math.floor(n / 2);
  const midpointPressure = n > 0 ? (suspenseValues[midIdx] ?? 0) : 0;

  // ── Tightest scene ────────────────────────────────────────────────────────
  const tightestScene = n > 0
    ? records.reduce((best, r) =>
        r.suspenseDelta > (best?.suspenseDelta ?? -Infinity) ? r : best, null as ScreenplaySceneRecord | null
      )?.sceneIdx ?? null
    : null;

  return {
    actPosition,
    completionPercent,
    avgSuspensePerScene,
    escalating,
    reversalCount,
    reversalDensity,
    approachingClimax,
    openClues,
    revelationCount,
    midpointPressure,
    tightestScene,
  };
}
