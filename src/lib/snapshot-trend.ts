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

// 2026-09-04 — a second, honest denominator alongside the calibration
// reference-set percentile (server/nvm/analyze/calibration/percentile.ts):
// rank among the writer's OWN saved drafts of THIS script, computed from the
// same score-over-revisions data this module already stores. Deliberately
// NOT inside doctor.ts (receipt-gated scoring path) and not a replacement for
// the reference-set percentile — an additive field a caller renders beside
// it, e.g. "Rank among your drafts: 2nd of 5 · Reference set: top band of 20".

export interface DraftRank {
  /** 1-based rank of the current draft's health among all drafts counted
   *  (itself plus every saved snapshot that carries a health value), highest
   *  health first. */
  rank: number;
  /** Total drafts counted (saved snapshots with a health value, plus the
   *  current draft). Always >= 1. */
  of: number;
}

/** Where the current draft's health would land against the writer's own
 *  saved snapshots of this script — "2nd of 5", not a comparison to any
 *  other writer's work. `currentHealth` is the health of the draft being
 *  displayed right now (it need not itself be a saved snapshot yet — most of
 *  the time it is the just-computed, not-yet-saved report). Ties resolve by
 *  counting only STRICTLY higher health as ahead, so an exact tie shares the
 *  better rank rather than being arbitrarily bumped down.
 *
 *  Returns null only when there is no health to rank (`currentHealth` is not
 *  a finite number) — never a fabricated position. Returns `{ rank: 1, of: 1
 *  }` when no saved snapshot carries a health value yet (a brand-new script,
 *  or every snapshot predates the scoring feature): callers should render
 *  "first saved draft — rank appears after the next save" for that case
 *  rather than hiding the line, per the same "missing is honest, not padded"
 *  rule the rest of this module follows. */
export function computeDraftRank(
  snapshots: readonly Snapshot[],
  currentHealth: number | null | undefined,
): DraftRank | null {
  if (typeof currentHealth !== "number" || !Number.isFinite(currentHealth)) return null;
  const savedHealths = snapshots
    .map((s) => numberOrNull(s.health))
    .filter((h): h is number => h !== null);
  const all = [...savedHealths, currentHealth];
  const of = all.length;
  const rank = 1 + all.filter((h) => h > currentHealth).length;
  return { rank, of };
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
