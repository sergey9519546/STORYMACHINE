// writer #9 (upgrade-writer-experience discovery) — "score over revisions".
// Pure helper: turns the ScriptIDE `snapshots` array into per-snapshot trend
// data (health/verdict/sceneCount plus a delta against the PREVIOUS
// snapshot) for the Versions tab's compact trend row and sparkline. No I/O,
// no analysis — every value here already lives on the snapshot or is absent.
//
// Ordering contract: `snapshots` is NEWEST-FIRST, matching how ScriptIDE.tsx
// stores them (`setSnapshots([newSnapshot, ...snapshots])`) and how they're
// persisted (src/lib/scriptide-draft-store.ts, the server's
// ScriptIDE_State.snapshots column). "The previous snapshot" for a delta is
// therefore the NEXT entry in the array — the one taken chronologically
// before it — not the entry before it in array order.
//
// Missing values are honest, not padded: a snapshot saved before this
// feature existed (or saved while no fresh report matched the current text —
// see SnapshotManager.tsx's Snapshot doc comment) carries `health: undefined`
// etc., and every field/delta below resolves to `null` rather than 0 or a
// fabricated number whenever the data it would be computed from is absent.

import type { CoverageVerdict } from "../../server/nvm/analyze/types.ts";
import type { Snapshot } from "../components/scriptide/SnapshotManager.tsx";

export interface SnapshotTrendEntry {
  id: string;
  health: number | null;
  verdict: CoverageVerdict | null;
  sceneCount: number | null;
  analyzedAt: number | null;
  /** health - previous snapshot's health, rounded to 1 decimal. null when
   *  this snapshot, the previous one, or both lack a health value (includes
   *  the oldest snapshot, which has no previous entry at all). */
  healthDelta: number | null;
  /** sceneCount - previous snapshot's sceneCount. null under the same
   *  missing-data conditions as healthDelta. */
  sceneCountDelta: number | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function numberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Builds one SnapshotTrendEntry per input snapshot, in the same
 *  (newest-first) order as the input. Never analyzes, never fabricates —
 *  a snapshot's own health/verdict/sceneCount/analyzedAt are read as-is. */
export function snapshotTrend(snapshots: readonly Snapshot[]): SnapshotTrendEntry[] {
  return snapshots.map((snap, i) => {
    const previous = snapshots[i + 1];
    const health = numberOrNull(snap.health);
    const sceneCount = numberOrNull(snap.sceneCount);
    const prevHealth = previous ? numberOrNull(previous.health) : null;
    const prevSceneCount = previous ? numberOrNull(previous.sceneCount) : null;

    return {
      id: snap.id,
      health,
      verdict: snap.verdict ?? null,
      sceneCount,
      analyzedAt: numberOrNull(snap.analyzedAt),
      healthDelta: health !== null && prevHealth !== null ? round1(health - prevHealth) : null,
      sceneCountDelta: sceneCount !== null && prevSceneCount !== null ? sceneCount - prevSceneCount : null,
    };
  });
}
