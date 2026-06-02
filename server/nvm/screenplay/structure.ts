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

  // ── Dramatic-event signals (needed before act position) ───────────────────
  // Revelations and reversals are accumulated dramatic progress: a story rich in
  // turning points has advanced through its structure even if the author never
  // raised an explicit clock. Computing these first lets act position blend them
  // with raw clock pressure rather than relying on clocks alone.
  const revelationCountEarly = records.filter(r => r.revelation !== null).length;
  const reversalCountEarly = suspenseValues.filter(v => v < -1).length;

  // ── Act position ──────────────────────────────────────────────────────────
  // Rough 3-act model. In a live story we don't know the total length, so we use
  // a blended pressure proxy: explicit clock pressure PLUS dramatic-event weight.
  // This prevents clock-less stories from being permanently stuck in act1.
  const totalClockPressure = commits
    .filter(c => !c.reverted)
    .flatMap(c => c.ops)
    .filter(o => o.op === 'RAISE_CLOCK')
    .reduce((s, o) => { const a = (o as { amount: number }).amount; return s + (isFinite(a) ? a : 0); }, 0);

  // Each revelation is worth 2 pressure units; each reversal 1.5. These weights
  // are calibrated so a story with ~4 revelations + a couple reversals reaches
  // act3 territory (≈15) even with no clocks, matching the clock-only thresholds.
  const REVELATION_WEIGHT = 2;
  const REVERSAL_WEIGHT = 1.5;
  const dramaticPressure = revelationCountEarly * REVELATION_WEIGHT + reversalCountEarly * REVERSAL_WEIGHT;
  const blendedPressure = totalClockPressure + dramaticPressure;

  const actPosition: ActPosition =
    blendedPressure >= 15 ? 'act3' :
    blendedPressure >= 10 ? 'act2b' :
    blendedPressure >= 7 ? 'midpoint' :
    blendedPressure >= 4 ? 'act2a' :
    'act1';

  // ── Completion ────────────────────────────────────────────────────────────
  // Proxy: blended pressure normalized by expected max (20)
  const completionPercent = Math.min(100, Math.round((blendedPressure / 20) * 100));

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
  const reversalCount = reversalCountEarly;
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
  const revelationCount = revelationCountEarly;

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
