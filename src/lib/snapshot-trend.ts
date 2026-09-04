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
  // 2026-09-04 — Shape & Rhythm (ScriptDoctorReport.structuralSignals): the
  // same two document aggregates ScriptDoctorPanel.tsx's "Shape & Rhythm"
  // section and coverage-letter.ts's caveat surface, read as-is from the
  // snapshot (never re-derived, never fabricated) — null under the same
  // missing-data rule as every other field above: a snapshot saved before
  // this field existed, or saved with an unscored/absent structuralSignals
  // block, simply has no reading here. Purely descriptive, never scored. */
  meanAbsDialogueShareDelta: number | null;
  actionSentenceCvOverall: number | null;
  // 2026-09-04 (honesty-audit matrix fix) — the same calibration
  // reference-set percentile ScriptDoctorPanel.tsx and the exported coverage
  // report already carry (report.healthPercentile), captured at snapshot
  // time exactly like `health` itself — see SnapshotManager.tsx's Snapshot
  // doc comment. null under the same missing-data rule as every other field
  // above: a snapshot saved before this field existed, or saved without a
  // matching fresh report, simply has no reading here.
  healthPercentile: number | null;
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
//
// 2026-09-04 audit fix — the record this ranked was wrong. It counted only
// ScriptIDE `snapshots` (the Versions tab), never ScriptDoctorPanel's own
// Draft History (`sm_doctor_history_v1`, up to 50 retained runs) — a
// complete record of the writer's own runs on this script that a writer who
// never uses Versions never got credit for. `computeDraftRank` now takes
// BOTH stores and ranks among their UNION, deduped so a run that landed in
// both (a diagnosis that was also saved as a snapshot) counts once, not
// twice. See `DraftHistoryRecord` below for the shape it reads from history.

/** The subset of ScriptDoctorPanel.tsx's `DoctorHistoryEntry` this module
 *  needs — kept local (not imported) so this pure lib file has no dependency
 *  on that component; `DoctorHistoryEntry` already satisfies this shape
 *  structurally (health/contentHash/at are all required, non-optional
 *  fields there), so callers pass their history array straight through. */
export interface DraftHistoryRecord {
  health: number;
  contentHash: string;
  at: number;
}

// Cross-store dedupe fallback: when a Snapshot predates the additive
// `contentHash` field below (so an exact-hash match with a Draft History
// entry isn't possible), two records are still treated as the SAME run when
// they carry the same health value and were captured within this many ms of
// each other — the closest approximation available without a shared id.
// Snapshot.analyzedAt is the report's own analysis timestamp and
// DraftHistoryRecord.at is when the panel recorded the run to history
// (moments after the same diagnosis completes), so a real same-run pair
// lands well inside this window; two independently-run diagnoses that
// happen to coincide within 5s AND land on the exact same health are not
// realistically distinguishable from a duplicate without a hash, so this is
// a deliberate, documented approximation — exact for every entry recorded
// after this fix, since Snapshot.contentHash is now stamped whenever the
// source report carries one (see src/components/ScriptIDE.tsx's
// confirmSnapshot).
const DEDUPE_TIMESTAMP_TOLERANCE_MS = 5000;

export type DraftRank =
  // The ranked state: at least one OTHER scored run (from either store)
  // exists to compare against.
  | {
      /** 1-based rank of the current draft's health among all drafts
       *  counted (itself plus every deduped, scored snapshot/history
       *  record), highest health first. */
      rank: number;
      /** Total drafts counted — the deduped union of scored snapshots and
       *  Draft History entries, plus the current draft. Always >= 1. */
      of: number;
      /** True when >= 1 OTHER counted draft carries the EXACT same health
       *  as `currentHealth`. An exact tie already shares the better rank
       *  (see this function's own doc comment) rather than being bumped
       *  down — but a plain ordinal alone ("1st of 6") reads as clean
       *  separation from the rest of the field, which is false when it's
       *  actually a dead heat with some or all of them. Callers should
       *  prefix "tied" in that case (audit fix, 2026-09-04). Always false
       *  in the genuinely-first-draft case (`of === 1`) — there is nothing
       *  else to tie with. */
      tied: boolean;
      /** REVIEW FIX (round 2, 2026-09-05) — how many OTHER saved records
       *  (snapshots/history entries, deduped the same way as `of`) exist but
       *  carry NO health value, so they could not enter the ranking at all.
       *  Always 0 or more; never negative, never the same record twice.
       *  Callers should say so ("N of M runs and saved drafts are unranked
       *  (saved without a fresh diagnosis)") rather than silently omitting
       *  them from the count the way a bare `of` figure would — a writer
       *  with 3 ranked runs and 2 unscored Versions has 5 saved records, not
       *  3, and the rank line should not be the one place that number goes
       *  quiet. */
      unscored: number;
    }
  // The "nothing scored yet" state: `of` is deliberately 0 (not 1) so this
  // shape is never confused with the genuine first-draft case below —
  // `unscored` names how many saved records exist with no health at all
  // (an edit since the last diagnosis, or a snapshot saved before scoring
  // existed), so the caller can render an honest count instead of silently
  // reusing "first saved draft" copy that would never come true.
  | { rank: null; of: 0; unscored: number };

/** Where the current draft's health would land against the writer's own
 *  saved drafts of this script — the deduped UNION of ScriptIDE `snapshots`
 *  (the Versions tab) and ScriptDoctorPanel's own Draft History — "2nd of
 *  5", not a comparison to any other writer's work. `currentHealth` is the
 *  health of the draft being displayed right now (it need not itself be a
 *  saved snapshot yet — most of the time it is the just-computed,
 *  not-yet-saved report). Ties resolve by counting only STRICTLY higher
 *  health as ahead, so an exact tie shares the better rank rather than being
 *  arbitrarily bumped down.
 *
 *  REVIEW FIX (round 2, 2026-09-05): every completed, non-sample diagnosis
 *  writes its OWN entry to Draft History (ScriptDoctorPanel.tsx's
 *  recordDoctorHistory) before this function ever runs — so without
 *  excluding it, the run being displayed right now was counted TWICE: once
 *  as `currentHealth` and again as its own freshly-written history row,
 *  making one real run read as "tied 1st of 2". `currentContentHash` (the
 *  on-screen report's own determinism receipt — always present for a
 *  complete report) and `currentAt` (the report's own `analyzedAt`, for the
 *  same legacy-snapshot health+timestamp fallback the cross-store dedupe
 *  below already uses) let this function recognize and exclude that
 *  self-record from the union before counting or ranking anything — the
 *  current draft is added back exactly once, explicitly, below.
 *  `snapshotDraftRanks` below reuses this same parameter to exclude a
 *  snapshot from being ranked against itself (a duplicate save of the same
 *  content, not just the same array index).
 *
 *  Returns null only when there is no health to rank (`currentHealth` is not
 *  a finite number) — never a fabricated position. Returns
 *  `{ rank: null, of: 0, unscored: N }` when N saved records exist but NONE
 *  carries a health value (distinct from the genuinely-first-draft case
 *  below — see the 2026-09-04 audit fix note above). Returns
 *  `{ rank: 1, of: 1 }` when there are no OTHER saved records at all (a
 *  brand-new script, or every saved record turned out to be the current
 *  run itself): callers should render "first saved draft — rank appears
 *  after the next save" for that case rather than hiding the line, per the
 *  same "missing is honest, not padded" rule the rest of this module
 *  follows. */
export function computeDraftRank(
  snapshots: readonly Snapshot[],
  history: readonly DraftHistoryRecord[],
  currentHealth: number | null | undefined,
  currentContentHash?: string | null,
  currentAt?: number | null,
): DraftRank | null {
  if (typeof currentHealth !== "number" || !Number.isFinite(currentHealth)) return null;

  interface Rec { health: number; contentHash: string | null; at: number | null }

  let unscored = 0;
  const snapRecords: Rec[] = [];
  for (const s of snapshots) {
    const health = numberOrNull(s.health);
    if (health === null) { unscored++; continue; }
    snapRecords.push({
      health,
      contentHash: typeof s.contentHash === "string" ? s.contentHash : null,
      at: numberOrNull(s.analyzedAt),
    });
  }
  const historyRecords: Rec[] = [];
  for (const h of history) {
    const health = numberOrNull(h.health);
    if (health === null) { unscored++; continue; }
    historyRecords.push({ health, contentHash: h.contentHash || null, at: numberOrNull(h.at) });
  }

  const isSameRun = (a: Rec, b: Rec): boolean => {
    // Both sides carry a hash (the common case going forward — Draft
    // History always has one, and a Snapshot gets one whenever its source
    // report did): an exact match is the only proof of "same run" needed,
    // and a mismatch is conclusive too — never fall through to the
    // approximate check below once a real answer is available.
    if (a.contentHash && b.contentHash) return a.contentHash === b.contentHash;
    // At least one side predates contentHash (a legacy Snapshot) — fall
    // back to the health+timestamp approximation documented above.
    if (a.at === null || b.at === null) return false; // no timestamp to compare — distinct
    return a.health === b.health && Math.abs(a.at - b.at) <= DEDUPE_TIMESTAMP_TOLERANCE_MS;
  };

  // Union: every snapshot record as-is (snapshots are never deduped against
  // EACH OTHER — two genuinely separate saves that happen to share a health
  // value both still count, matching this module's pre-existing, tested
  // behavior), plus every history record that isn't the SAME run as one
  // already counted from snapshots.
  const union: Rec[] = [...snapRecords];
  for (const h of historyRecords) {
    if (!snapRecords.some((s) => isSameRun(s, h))) union.push(h);
  }

  // REVIEW FIX: drop the current run's own record(s) out of the union — the
  // report on screen almost always already has a matching Draft History
  // entry (recordDoctorHistory writes one on every completed diagnosis) and
  // may also already be a just-taken Snapshot; either would otherwise be
  // counted as an "other" draft the current one is being compared against,
  // which is not honest — it IS the current draft. Matched the same way
  // every other same-run comparison in this function is: exact contentHash
  // when both sides have one, else the health+timestamp fallback.
  const currentRecord: Rec = {
    health: currentHealth,
    contentHash: currentContentHash || null,
    at: currentAt ?? null,
  };
  const others = union.filter((r) => !isSameRun(currentRecord, r));

  if (others.length === 0) {
    return unscored > 0 ? { rank: null, of: 0, unscored } : { rank: 1, of: 1, tied: false, unscored: 0 };
  }

  const all = [...others.map((r) => r.health), currentHealth];
  const of = all.length;
  const rank = 1 + all.filter((h) => h > currentHealth).length;
  // A tie is another COUNTED, DISTINCT draft (i.e. from `others`, which
  // already excludes the current run itself) at the exact same health —
  // never fabricated separation when the field is a genuine dead heat, and
  // never fabricated agreement with a draft that IS this one.
  const tied = others.some((r) => r.health === currentHealth);
  return { rank, of, tied, unscored };
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
      meanAbsDialogueShareDelta: numberOrNull(snap.meanAbsDialogueShareDelta),
      actionSentenceCvOverall: numberOrNull(snap.actionSentenceCvOverall),
      healthPercentile: numberOrNull(snap.healthPercentile),
    };
  });
}

// ── Per-snapshot draft rank (honesty-audit matrix fix, 2026-09-04) ─────────
// The Versions list previously showed health/verdict/sceneCount for each
// saved version but never where that version ranked among the writer's OTHER
// saved drafts — the same "rank among your drafts" line ScriptDoctorPanel.tsx
// and both coverage exports already show for the CURRENT draft
// (computeDraftRank above). This is the identical rule applied per snapshot,
// reusing computeDraftRank itself rather than a second ranking
// implementation: for snapshot i, every OTHER snapshot in the array is the
// "saved history" and snapshot i's own health is the "current" draft being
// ranked against it.

/** Draft rank for EVERY entry in `snapshots`, in the same (newest-first)
 *  order as the input. Reuses computeDraftRank per entry — never
 *  reimplements the ranking rule, so a snapshot's rank here can never
 *  disagree with what computeDraftRank would say if that exact snapshot were
 *  the live draft. null for a snapshot with no health value, matching
 *  computeDraftRank's own null contract exactly.
 *
 *  REVIEW FIX (round 2, 2026-09-05): passes snapshot i's own contentHash/
 *  analyzedAt through as computeDraftRank's `currentContentHash`/`currentAt`
 *  — not just index-based exclusion (`j !== i`) — so a snapshot is never
 *  ranked against a genuine duplicate of itself (the same content saved
 *  twice, at a different array index) any more than the live-draft caller
 *  in ScriptDoctorPanel.tsx is. No Draft History array is available here
 *  (this ranks a snapshot only among the OTHER saved Versions of this
 *  script, not the writer's Draft History runs — that union is the live
 *  panel's job, not the Versions list's). */
export function snapshotDraftRanks(snapshots: readonly Snapshot[]): (DraftRank | null)[] {
  return snapshots.map((snap, i) => {
    const others = snapshots.filter((_, j) => j !== i);
    return computeDraftRank(
      others,
      [],
      numberOrNull(snap.health),
      typeof snap.contentHash === "string" ? snap.contentHash : null,
      numberOrNull(snap.analyzedAt),
    );
  });
}
