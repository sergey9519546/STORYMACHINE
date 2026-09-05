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
import { ordinal } from "./percentile-copy.ts";

/** Same private helper coverage-letter.ts and coverage-html.ts each already
 *  define for their own number interpolations (`n.toLocaleString('en-US')`)
 *  — used here so every draft-rank number this module renders is formatted
 *  the SAME way as the rest of a given document, not a bare `${n}` in one
 *  place and a locale-formatted number two lines away. DraftRankSchema
 *  (server/lib/validation.ts) caps `rank`/`of` at 71 and `unscored` at 70,
 *  so a thousands separator never actually fires for any wire-legal value
 *  today — this is a consistency guarantee for the surfaces that share this
 *  module, not a fix for a number that currently reads wrong. (2026-09-05
 *  review fix: buildDraftRankLine's migration to this module's
 *  draftRankSentence() had silently dropped the `formatNumber(draftRank.of)`
 *  call coverage-html.ts's ORIGINAL, pre-migration renderer used, leaving
 *  the letter — which still calls its own formatNumber(of) — as the only
 *  surface with it.) */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

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
 *  conditionally without duplicating the `unscored > 0` check.
 *
 *  BUG FIX (2026-09-05, found while adding the 'saved' scope's own note):
 *  this used to call `draftRankDenominatorLabel()` with no scope argument,
 *  hardcoding the UNION noun ("runs and saved drafts of this script") even
 *  for a 'saved'-scope caller — so a Versions-list badge's own unranked-note
 *  would have said "runs and saved drafts" despite ranking against saved
 *  Versions only. Threading `scope` through closes that before it ever
 *  shipped on that surface (draftRankSentence below is the only caller that
 *  passes 'saved'; every existing 'union' caller is unaffected by the new
 *  optional parameter's default). */
export function unrankedDraftsNote(unscored: number, of: number, scope: DraftRankDenominatorScope = 'union'): string | null {
  if (unscored <= 0) return null;
  const total = of + unscored;
  const verb = unscored === 1 ? 'is' : 'are';
  return `${formatNumber(unscored)} of ${formatNumber(total)} ${draftRankDenominatorLabel(scope)} ${verb} unranked (saved without a fresh diagnosis)`;
}

/** THE one draft-rank sentence, for the four surfaces that render a compact
 *  label (never a longer caveat paragraph — see coverage-letter.ts's own
 *  header for why its prose stays a separate composition of these same
 *  granular pieces): ScriptDoctorPanel.tsx's DraftRankLine (`scope:
 *  'union'`), server/lib/coverage-html.ts's buildDraftRankLine (`'union'`),
 *  and src/components/scriptide/SnapshotManager.tsx's per-snapshot badge
 *  (`'saved'`).
 *
 *  Added 2026-09-05 (client-hunter finding B-12) after the 'saved'-scope
 *  denominator fix alone left SnapshotManager.tsx as a FOURTH hand-copy: it
 *  called draftRankDenominatorLabel('saved') for the noun but still
 *  hand-wrote everything around it, with no `tied` prefix and no
 *  unrankedDraftsNote() call — so a genuine dead heat between two saved
 *  Versions read as clean separation, and an unscored sibling Version
 *  silently vanished from the count, on that one surface only. This
 *  function is the fix: `tied`/`unscored` are read the SAME way in both
 *  scopes, so a future third scope (should one ever exist) gets both for
 *  free by construction rather than needing its own reminder.
 *
 *  Accepts a structural subset of `DraftRank` (rank possibly `null`, `tied`/
 *  `unscored` optional) so callers can pass either the full `DraftRank` the
 *  panel/SnapshotManager compute, or the narrower wire `DraftRankExportPayload`
 *  the two exports carry (whose `rank` is always a number). */
export function draftRankSentence(
  draftRank: { rank: number | null; of: number; tied?: boolean; unscored?: number },
  scope: DraftRankDenominatorScope = 'union',
): string {
  const { rank, of, tied, unscored } = draftRank;

  if (scope === 'saved') {
    // Mirrors the 'union' `rank === null` and `of <= 1` branches below, but
    // SnapshotManager.tsx's own honest framing ("Only saved draft with a
    // health score so far") already covers BOTH cases correctly — there is
    // no separate "N saved drafts have no score yet" copy on this surface,
    // since a Versions-list badge is always attached to one specific,
    // already-scored snapshot; it is the OTHERS that may have no score.
    if (rank === null || of <= 1) return 'Only saved draft with a health score so far';
    const body = `Ranks ${tied ? 'tied ' : ''}${ordinal(rank)} of ${formatNumber(of)} by health among your ${draftRankDenominatorLabel('saved')}`;
    const note = unrankedDraftsNote(unscored ?? 0, of, 'saved');
    return note ? `${body} — ${note}` : body;
  }

  // scope === 'union'
  if (rank === null) {
    const u = unscored ?? 0;
    return `${formatNumber(u)} saved draft${u === 1 ? '' : 's'} ${u === 1 ? 'has' : 'have'} no score yet — run the doctor before saving to rank them`;
  }
  if (of <= 1) {
    const first = `First saved draft — rank among your drafts appears after ${draftRankNextOpportunityLabel()}`;
    // Reachable in principle (a wire-legal `{rank:1, of:1, unscored:N>0}`)
    // even though computeDraftRank (src/lib/snapshot-trend.ts) never
    // actually produces it today — the `of <= 1` branch there always pairs
    // with `unscored: 0` — so this is a correctness-by-construction
    // guarantee, not dead code: it protects this function's OWN contract
    // ("every field this shape carries is accounted for") against a future
    // change to that producer, the exact class of gap a 2026-09-05 review
    // flagged as "checked and dismissed" before this consolidation existed.
    const note = unrankedDraftsNote(unscored ?? 0, of);
    return note ? `${first} — ${note}` : first;
  }
  const body = `Rank among your drafts: ${tied ? 'tied ' : ''}${ordinal(rank)} of ${formatNumber(of)} ${draftRankDenominatorLabel('union')} (by health)`;
  const note = unrankedDraftsNote(unscored ?? 0, of);
  return note ? `${body} — ${note}` : body;
}
