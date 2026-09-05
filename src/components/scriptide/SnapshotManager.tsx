import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Save, Trash2, History } from "lucide-react";
import type { CoverageVerdict } from "../../../server/nvm/analyze/types.ts";
import {
  snapshotTrend, snapshotDraftRanks, type SnapshotTrendEntry, type DraftRank,
} from "../../lib/snapshot-trend.ts";
import { useModalFocusTrap } from "../../lib/use-modal-focus-trap.ts";
import { ordinal, exactRankTooltip, compactPercentileNote } from "../../lib/percentile-copy.ts";
import { draftRankDenominatorLabel } from "../../lib/draft-rank-copy.ts";

// writer #9 (upgrade-writer-experience discovery) — "score over revisions".
// The four score fields are ALL optional: a snapshot only carries them when
// a report already existed for the EXACT text being saved at snapshot time
// (ScriptIDE.tsx's confirmSnapshot never analyzes on save and never
// fabricates a score), so every snapshot saved before this feature — and
// any snapshot saved without a matching fresh report — simply omits them.
// Exported so ScriptIDE.tsx (which owns the `snapshots` state) and
// server/lib/validation.ts's SnapshotSchema share one shape.
export interface Snapshot {
  id: string;
  name: string;
  text: string;
  date: string;
  health?: number;
  verdict?: CoverageVerdict;
  sceneCount?: number;
  analyzedAt?: number;
  // 2026-09-04 — Shape & Rhythm (ScriptDoctorReport.structuralSignals):
  // the same two document aggregates ScriptDoctorPanel.tsx's "Shape &
  // Rhythm" section and coverage-letter.ts's caveat surface, captured at
  // snapshot time exactly like health/verdict/sceneCount above — present
  // only when a fresh, SCORED report existed for the exact text being
  // snapshotted (see ScriptIDE.tsx's confirmSnapshot); never fabricated,
  // never re-derived from anything but the report itself. Purely additive —
  // descriptive numbers, not part of the score.
  meanAbsDialogueShareDelta?: number;
  actionSentenceCvOverall?: number;
  // 2026-09-04 (honesty-audit matrix fix) — the calibration reference-set
  // percentile ScriptDoctorPanel.tsx and both coverage exports already show
  // (report.healthPercentile), captured at snapshot time under the SAME rule
  // as `health` above: present only when a fresh, complete report existed
  // for the exact text being snapshotted; never fabricated, never
  // re-derived. Purely additive.
  healthPercentile?: number;
  // 2026-09-04 — the determinism receipt from the freshReport this snapshot
  // was captured from (server/nvm/analyze/types.ts's contentHash), stamped
  // the same additive, present-only-when-a-fresh-report-matched way as
  // health/verdict/sceneCount above. Lets src/lib/snapshot-trend.ts's
  // computeDraftRank dedupe this snapshot exactly against the SAME run
  // recorded in ScriptDoctorPanel's own Draft History, instead of falling
  // back to its health+timestamp approximation.
  contentHash?: string;
}

// ── Score-over-revisions trend (writer #9) ──────────────────────────────────
// a11y pass (2026-09-04): --sm-ok/--sm-warn/--sm-stamp measured 3.77:1 /
// 2.41:1 / 4.27:1 as bare TEXT on this panel (--sm-panel-2, light) — all
// under 4.5:1 (that's why these live as separate -on-light/-on-dark tokens
// now — see design-system.css's header comment on them). The sparkline's
// own path/dots stay decorative (non-text, no contrast requirement); this
// function's callers are both real text (the verdict label, the delta
// figure), so both now resolve to the -on-light variants.
function verdictColor(v: CoverageVerdict | null): string {
  if (v === "RECOMMEND") return "var(--sm-ok-on-light)";
  if (v === "CONSIDER") return "var(--sm-warn-on-light)";
  if (v === "PASS") return "var(--sm-stamp-on-light)";
  return "var(--sm-ink-mute)";
}

/** Tiny inline SVG sparkline of health across every SCORED snapshot, oldest
 *  (left) to newest (right) — theme-token colours, no charting library.
 *  Renders nothing when fewer than two snapshots carry a health value:
 *  a single point or an all-empty trend has nothing to show a trend line. */
function HealthSparkline({ entries }: { entries: SnapshotTrendEntry[] }) {
  const points = [...entries].reverse().filter(
    (e): e is SnapshotTrendEntry & { health: number } => e.health !== null,
  );
  if (points.length < 2) return null;

  const width = 160;
  const height = 28;
  const pad = 3;
  const healths = points.map((p) => p.health);
  const min = Math.min(...healths);
  const max = Math.max(...healths);
  const span = max - min || 1;
  const step = (width - pad * 2) / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: pad + i * step,
    y: pad + (1 - (p.health - min) / span) * (height - pad * 2),
    color: verdictColor(p.verdict),
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Health trend across ${points.length} scored versions, from ${healths[0].toFixed(1)} to ${healths[healths.length - 1].toFixed(1)} out of 100`}
      className="shrink-0"
    >
      <path d={path} fill="none" stroke="var(--sm-ink-mute)" strokeWidth={1.5} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 2.5 : 1.5} fill={c.color} />
      ))}
    </svg>
  );
}

/** Shape & Rhythm trend line (2026-09-04) — a second, descriptive-only line
 *  under the health sparkline's caption, oldest-scored → newest-scored, for
 *  the same two aggregates ScriptDoctorPanel.tsx's "Shape & Rhythm" section
 *  and coverage-letter.ts's caveat surface already show. Renders nothing
 *  when fewer than one entry carries a reading (every snapshot predates the
 *  field, or none was scored) — a single reading still shows as a bare
 *  value, since "trend" here is oldest-vs-newest, not a two-point minimum
 *  the way the sparkline requires. */
function ShapeRhythmTrendLine({ entries }: { entries: SnapshotTrendEntry[] }) {
  const points = [...entries].reverse().filter(
    (e): e is SnapshotTrendEntry & { meanAbsDialogueShareDelta: number; actionSentenceCvOverall: number } =>
      e.meanAbsDialogueShareDelta !== null && e.actionSentenceCvOverall !== null,
  );
  if (points.length === 0) return null;

  const oldest = points[0];
  const newest = points[points.length - 1];
  const swingText =
    points.length > 1
      ? `${oldest.meanAbsDialogueShareDelta.toFixed(2)} → ${newest.meanAbsDialogueShareDelta.toFixed(2)}`
      : newest.meanAbsDialogueShareDelta.toFixed(2);
  const cvText =
    points.length > 1
      ? `${oldest.actionSentenceCvOverall.toFixed(2)} → ${newest.actionSentenceCvOverall.toFixed(2)}`
      : newest.actionSentenceCvOverall.toFixed(2);

  return (
    <div className="flex items-center gap-3 px-1 flex-wrap text-[10px] font-mono text-[var(--sm-ink-mute)]">
      <span className="uppercase tracking-widest font-bold">Shape &amp; rhythm (descriptive, not part of the score)</span>
      <span>Talk/action swing {swingText}</span>
      <span>Action-prose variation {cvText}</span>
    </div>
  );
}

// ── Percentile / draft-rank copy (2026-09-04 honesty-matrix fix) ───────────
// Same two lines ScriptDoctorPanel.tsx and both coverage exports
// (coverage-html.ts, coverage-letter.ts) already show for the CURRENT
// draft, now shown per SAVED snapshot in the Versions list.
// ordinal()/compactPercentileNote() are the ONE shared implementation
// (src/lib/percentile-copy.ts) every percentile-showing surface now imports
// — 2026-09-04 review finding: this file's PREVIOUS local copy had already
// silently dropped "hand-authored synthetic" from its sentence (the
// qualifier that stops a reader assuming the percentile is a comparison
// against real scripts), proving why a fourth independent hand-copy with no
// cross-surface test was a real defect, not a harmless convenience. The
// ranking ITSELF is never reimplemented either: computeDraftRank
// (src/lib/snapshot-trend.ts) is the one and only place a rank number gets
// computed anywhere in this codebase — this file only formats a DraftRank
// it received.

/** Second line under a scored snapshot's trend badge: the reference-set
 *  percentile (when this snapshot carries one) and its rank among the
 *  writer's OTHER saved drafts of this script (when computeDraftRank found
 *  one). Renders nothing when neither is available. */
function SnapshotPercentileAndRankLine({
  healthPercentile, draftRank,
}: {
  healthPercentile: number | null;
  draftRank: DraftRank | null;
}) {
  if (healthPercentile === null && draftRank === null) return null;
  return (
    <div className="text-[10px] font-mono text-[var(--sm-ink-mute)] mt-0.5 flex flex-wrap gap-x-3">
      {healthPercentile !== null && (
        <span title={exactRankTooltip(healthPercentile)}>
          {compactPercentileNote(healthPercentile)}
        </span>
      )}
      {draftRank && (
        <span>
          {/* `rank === null` checked first (not just `of <= 1`) so TypeScript
              narrows `draftRank.rank` to `number` in the ordinal() branch —
              the DraftRank union's real discriminant is `rank`, not `of`.
              Also correctly covers the "nothing else is scored, though other
              unscored snapshots may exist" case (rank: null), which reads
              the same as "only saved draft with a health score so far". */}
          {draftRank.rank === null || draftRank.of <= 1
            ? "Only saved draft with a health score so far"
            // 2026-09-05 (owner rule: one wording per concept) — routed
            // through the shared draftRankDenominatorLabel('saved') instead
            // of this component's own "your saved drafts" literal. The
            // narrower 'saved' scope is deliberate, not a drift: this badge
            // ranks against snapshotDraftRanks' empty-history call
            // (src/lib/snapshot-trend.ts), never Draft History runs, so it
            // must not read "runs and saved drafts" like the union scope.
            : `Ranks ${ordinal(draftRank.rank)} of ${draftRank.of} by health among your ${draftRankDenominatorLabel('saved')}`}
        </span>
      )}
    </div>
  );
}

/** One snapshot row's compact health/verdict + delta-vs-previous readout.
 *  Renders nothing when this snapshot has no health value at all (saved
 *  before this feature, or saved with no fresh report for that text). */
function SnapshotTrendBadge({ entry, draftRank }: { entry: SnapshotTrendEntry; draftRank: DraftRank | null }) {
  if (entry.health === null) return null;
  const delta = entry.healthDelta;
  const deltaLabel = delta === null ? null : delta === 0 ? "±0.0" : delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  const deltaColor = delta === null || delta === 0 ? "var(--sm-ink-mute)" : delta > 0 ? "var(--sm-ok-on-light)" : "var(--sm-stamp-on-light)";
  const deltaArrow = delta === null || delta === 0 ? "→" : delta > 0 ? "▲" : "▼";

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
        <span style={{ color: verdictColor(entry.verdict) }} className="font-bold uppercase">
          {entry.verdict ?? "—"}
        </span>
        <span className="opacity-80">{entry.health.toFixed(1)}/100</span>
        {deltaLabel && (
          <span
            style={{ color: deltaColor }}
            aria-label={`Health change vs. the previous saved version: ${deltaLabel}`}
          >
            {deltaArrow} {deltaLabel}
          </span>
        )}
      </div>
      <SnapshotPercentileAndRankLine healthPercentile={entry.healthPercentile} draftRank={draftRank} />
    </div>
  );
}

// 2026-09-04 a11y fix (docs/audits/2026-09-04-evening-batch/AUDIT.md, "the
// snapshot save modal has no dialog semantics"): this used to be inline JSX
// rendered from the parent's `{snapshotModal.open && (...)}` block. That
// shape cannot host `useModalFocusTrap` correctly — the hook's effect runs
// once per mount of whatever COMPONENT calls it (its dependency is the ref
// object's own stable identity, not `snapshotModal.open`), so calling it
// from SnapshotManager's top level — which is mounted the whole time the
// Versions tab or Ship panel is open, closed dialog included — would run the
// trap's initial-focus effect on SnapshotManager's OWN mount, almost always
// while `containerRef.current` is still null. Every other dialog in this app
// (ShortcutModal, WhatIfPanel, RoomPanel, …) is its own component that only
// exists in the tree while open, for exactly this reason. Splitting the
// modal out here gives it the same shape: a fresh mount every time
// `snapshotModal.open` flips true, so the hook's mount-time effect actually
// runs against a real, attached container.
function SaveSnapshotModal({
  snapshotModal,
  onSetSnapshotModal,
  onConfirmSnapshot,
}: {
  snapshotModal: SnapshotManagerProps["snapshotModal"];
  onSetSnapshotModal: SnapshotManagerProps["onSetSnapshotModal"];
  onConfirmSnapshot: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalFocusTrap(dialogRef);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
    >
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-snapshot-modal-title"
        // Escape on the container catches the key regardless of which
        // focusable descendant currently has it (input, Cancel, or Save) —
        // attached here rather than only on the input, and scoped to this
        // container (not document) for the same reason use-modal-focus-
        // trap.ts's own Tab handler is: it can never fire while this dialog
        // isn't open, and never interferes with unrelated document-level
        // Escape handlers (e.g. ScriptIDE's palette/prefs/shortcuts ladder).
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onSetSnapshotModal({ open: false, name: "" });
          }
        }}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white dark:bg-zinc-800 p-6 border-[2px] border-[var(--sm-ink)] shadow-[var(--sm-shadow)] w-80 space-y-4"
      >
        <h3 id="save-snapshot-modal-title" className="font-bold uppercase text-xs tracking-widest">
          Save Snapshot
        </h3>
        <input
          type="text"
          value={snapshotModal.name}
          onChange={(e) =>
            onSetSnapshotModal({ ...snapshotModal, name: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirmSnapshot();
          }}
          aria-label="Snapshot version name"
          className="w-full border-2 border-black px-3 py-2 font-mono text-sm dark:bg-zinc-700 dark:text-white"
          placeholder="Version name…"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => onSetSnapshotModal({ open: false, name: "" })}
            className="px-4 py-2 text-xs font-bold uppercase border-2 border-black hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmSnapshot}
            className="px-4 py-2 text-xs font-bold uppercase sm-btn--ink hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Same 2026-09-04 a11y fix, same reason (see SaveSnapshotModal's header
// comment above): the "Restore Snapshot?" confirm modal had the identical
// defect — bare motion.div, no role="dialog", no aria-modal, no accessible
// name, no useModalFocusTrap, and (unlike the Save modal, which at least had
// an input-level Escape handler) no Escape handling of any kind — only a
// mouse click on Cancel/Restore could dismiss it. Extracted the same way,
// for the same mount-timing reason.
function RestoreSnapshotModal({
  onSetRestoreModal,
  onConfirmRestore,
}: {
  onSetRestoreModal: SnapshotManagerProps["onSetRestoreModal"];
  onConfirmRestore: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalFocusTrap(dialogRef);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
    >
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-snapshot-modal-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onSetRestoreModal({ open: false, text: "" });
          }
        }}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white dark:bg-zinc-800 p-6 border-[2px] border-[var(--sm-ink)] shadow-[var(--sm-shadow)] w-80 space-y-4"
      >
        <h3 id="restore-snapshot-modal-title" className="font-bold uppercase text-xs tracking-widest">
          Restore Snapshot?
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Current unsaved changes will be lost.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => onSetRestoreModal({ open: false, text: "" })}
            className="px-4 py-2 text-xs font-bold uppercase border-2 border-black hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmRestore}
            className="px-4 py-2 text-xs font-bold uppercase sm-btn--ink hover:bg-[var(--sm-stamp)]"
          >
            Restore
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface SnapshotManagerProps {
  snapshots: Snapshot[];
  snapshotModal: { open: boolean; name: string };
  restoreModal: { open: boolean; text: string };
  onTakeSnapshot: () => void;
  onConfirmSnapshot: () => void;
  onRestoreSnapshot: (text: string) => void;
  onConfirmRestore: () => void;
  onDeleteSnapshot: (id: string) => void;
  onSetSnapshotModal: (modal: { open: boolean; name: string }) => void;
  onSetRestoreModal: (modal: { open: boolean; text: string }) => void;
  /** When true, only mount modals (list rendered elsewhere in studio Versions). */
  hideList?: boolean;
}

export default function SnapshotManager({
  snapshots,
  snapshotModal,
  restoreModal,
  onTakeSnapshot,
  onConfirmSnapshot,
  onRestoreSnapshot,
  onConfirmRestore,
  onDeleteSnapshot,
  onSetSnapshotModal,
  onSetRestoreModal,
  hideList = false,
}: SnapshotManagerProps) {
  const trend = React.useMemo(() => snapshotTrend(snapshots), [snapshots]);
  // 2026-09-04 — same computeDraftRank the current draft's rank already
  // reuses (ScriptDoctorPanel.tsx, coverage exports), applied per snapshot;
  // see snapshot-trend.ts's snapshotDraftRanks header.
  const draftRanks = React.useMemo(() => snapshotDraftRanks(snapshots), [snapshots]);
  const hasAnyScore = trend.some((t) => t.health !== null);

  return (
    <>
      {!hideList && (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            Script Snapshots
          </h2>
          <button
            onClick={onTakeSnapshot}
            aria-label="Save new script version snapshot"
            className="sm-btn--ink px-3 py-1 text-[10px] font-bold uppercase sm-btn flex items-center gap-2"
          >
            <Save className="w-3 h-3" /> Save Version
          </button>
        </div>
        {hasAnyScore && (
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-1">
              <HealthSparkline entries={trend} />
              {/* a11y pass: same opacity-60-on-inherited-color pattern as the
                  snapshot date caption below — replaced for the same reason. */}
              <span className="text-[10px] font-mono text-[var(--sm-ink-mute)] uppercase tracking-widest">
                Health trend across scored versions
              </span>
            </div>
            {/* Second line under the health trend (2026-09-04) — Shape &
                Rhythm, descriptive only. */}
            <ShapeRhythmTrendLine entries={trend} />
          </div>
        )}
        <div className="space-y-4">
          {snapshots.map((s, i) => (
            <div
              key={s.id}
              className="bg-white dark:bg-zinc-800 p-4 border-[2px] border-[var(--sm-ink)] shadow-[var(--sm-shadow)] flex justify-between items-center"
            >
              <div>
                <div className="font-bold uppercase text-xs">{s.name}</div>
                {/* a11y pass: opacity-60 on inherited black-ish text
                    measured 4.45:1 on this card's white background — just
                    under 4.5:1. --sm-ink-mute clears it (6.07:1). */}
                <div className="text-[10px] font-mono text-[var(--sm-ink-mute)]">{s.date}</div>
                <SnapshotTrendBadge entry={trend[i]} draftRank={draftRanks[i]} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onRestoreSnapshot(s.text)}
                  aria-label={`Restore snapshot: ${s.name}`}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteSnapshot(s.id)}
                  aria-label={`Delete snapshot: ${s.name}`}
                  className="p-2 hover:bg-red-100 text-red-500 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {snapshots.length === 0 && (
            // a11y pass: text-gray-400 measured 2.26:1 on this panel's
            // background — under the 4.5:1 AA minimum. --sm-ink-mute is
            // this app's own design-system token for secondary text and
            // clears it (5.29:1) — border-gray-300 is decorative only
            // (non-text, already >=3:1), left as-is.
            <div className="text-center p-8 border-2 border-dashed border-gray-300 text-[var(--sm-ink-mute)] font-mono text-xs">
              No snapshots saved yet.
            </div>
          )}
        </div>
      </div>
      )}

      {/* Snapshot name modal */}
      <AnimatePresence>
        {snapshotModal.open && (
          <SaveSnapshotModal
            snapshotModal={snapshotModal}
            onSetSnapshotModal={onSetSnapshotModal}
            onConfirmSnapshot={onConfirmSnapshot}
          />
        )}
      </AnimatePresence>

      {/* Restore confirm modal */}
      <AnimatePresence>
        {restoreModal.open && (
          <RestoreSnapshotModal
            onSetRestoreModal={onSetRestoreModal}
            onConfirmRestore={onConfirmRestore}
          />
        )}
      </AnimatePresence>
    </>
  );
}
