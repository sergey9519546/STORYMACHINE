// Single source of truth for the "rank among your drafts" display copy —
// the second, honest denominator alongside the calibration reference-set
// percentile (src/lib/percentile-copy.ts), computed by
// src/lib/snapshot-trend.ts's computeDraftRank.
//
// REVIEW FIX (round 2, 2026-09-05): ScriptDoctorPanel.tsx's DraftRankLine
// and server/lib/coverage-letter.ts's buildCaveats each hand-wrote their own
// sentence around the SAME `{ rank, of }` value — and drifted: the letter
// called it "your own saved drafts of this script", the panel called it
// "runs and saved drafts of this script". Same number, two different claims
// about what it is (most of the union is Draft History runs, never
// explicitly saved as a Version). This module is the fix, following the
// exact precedent percentile-copy.ts already set for the SAME class of bug
// (four independent percentile hand-copies, one of them silently wrong):
// ONE denominator phrase, imported by both surfaces, pinned by
// tests/core/percentile-copy-consistency.test.ts alongside the percentile
// copy it sits next to.
//
// Pure, no I/O, no randomness — safe to import from both the browser bundle
// and the server (server files in this codebase already import directly
// from src/lib — see server/lib/coverage-letter.ts's own percentile-copy.ts
// import, server/routes/export.ts's fountain.ts/fdx.ts/docx.ts imports).

import type { DraftRank } from "./snapshot-trend.ts";

/** The wire shape both /api/export/coverage-letter and /api/export/coverage
 *  accept for `draftRank` — server/lib/validation.ts's DraftRankSchema,
 *  which requires `rank >= 1` (it has nothing else to validate: there is no
 *  ordinal to check without one). */
export type DraftRankExportPayload = { rank: number; of: number; tied?: boolean; unscored?: number };

/** Narrows a live DraftRank down to the wire shape the export routes accept,
 *  or `undefined` when there is nothing rankable to send.
 *
 *  REVIEW FIX (rebase defect, 2026-09-05): DraftRank grew a second shape
 *  this session — `{ rank: null, of: 0, unscored: N }` for "N saved records
 *  exist but none carries a score yet" — and ScriptDoctorPanel.tsx's HTML
 *  export (handleExportReport) forwarded the panel's `draftRank` object
 *  UNGUARDED, unlike the letter export (handleExportCoverageLetter) which
 *  already checked `draftRank.rank !== null` inline. DraftRankSchema's
 *  `rank: z.number().int().min(1)` rejects `null`, so the exact "5 saved
 *  drafts have no score yet" state that reads fine in the panel 400'd on
 *  "Export report" where it used to download. One helper now guards BOTH
 *  call sites so this can't drift apart between them again — never forward
 *  `draftRank` itself; always forward what this returns. */
export function draftRankExportPayload(draftRank: DraftRank | null): DraftRankExportPayload | undefined {
  if (!draftRank || draftRank.rank === null) return undefined;
  return {
    rank: draftRank.rank,
    of: draftRank.of,
    ...(draftRank.tied ? { tied: true } : {}),
    ...(draftRank.unscored > 0 ? { unscored: draftRank.unscored } : {}),
  };
}

/** What a DraftRank's denominator counts. 'union' (default) is the deduped
 *  UNION of Draft History runs and ScriptIDE Version snapshots
 *  (computeDraftRank) — what ScriptDoctorPanel.tsx's DraftRankLine and
 *  coverage-letter.ts/coverage-html.ts's exports all rank against. 'saved'
 *  is the NARROWER set SnapshotManager.tsx's per-snapshot badge ranks
 *  against: `snapshotDraftRanks` (src/lib/snapshot-trend.ts) deliberately
 *  calls `computeDraftRank(others, [])` with an EMPTY history array, so a
 *  snapshot's badge ranks it only among the writer's other saved Versions
 *  of this script, never Draft History runs that were never saved. */
export type DraftRankDenominatorScope = 'union' | 'saved';

/** The denominator noun phrase for "rank among your drafts". Every surface
 *  that states this number must call THIS with the scope that actually
 *  matches what it ranked against — not write its own noun for it (2026-09-05
 *  owner rule: one wording per concept — a 'saved'-scope caller writing its
 *  own literal ("among your saved drafts") is exactly the kind of second
 *  copy this function exists to prevent, EVEN THOUGH the underlying set is
 *  genuinely narrower and deserves its own noun rather than the union's). */
export function draftRankDenominatorLabel(scope: DraftRankDenominatorScope = 'union'): string {
  return scope === 'saved' ? 'saved drafts of this script' : 'runs and saved drafts of this script';
}

/** The clause naming when a rank next becomes available for a script with
 *  no rankable draft yet. A rank can appear after simply running the doctor
 *  again (ScriptDoctorPanel.tsx's recordDoctorHistory) just as much as after
 *  explicitly saving a Version — "your next save" alone understates it. */
export function draftRankNextOpportunityLabel(): string {
  return 'your next run or save';
}

/** The additional clause for the MIXED case a bare `of` figure silently
 *  drops: some saved records are ranked, others carry no health at all
 *  (an edit since the last diagnosis, or a snapshot saved before scoring
 *  existed). `unscored` is `DraftRank.unscored` from the ranked branch;
 *  `of` is that same branch's own `of`. Returns null when there is nothing
 *  unranked to report (the common case), so callers can render it
 *  conditionally without duplicating the `unscored > 0` check. */
export function unrankedDraftsNote(unscored: number, of: number): string | null {
  if (unscored <= 0) return null;
  const total = of + unscored;
  const verb = unscored === 1 ? 'is' : 'are';
  return `${unscored} of ${total} ${draftRankDenominatorLabel()} ${verb} unranked (saved without a fresh diagnosis)`;
}
