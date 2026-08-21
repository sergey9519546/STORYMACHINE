/**
 * Ship — the plain writer-facing container for the always-visible "Ship"
 * task tab (W6, docs/PATH_TO_EXCELLENCE.md Phase W). ROADMAP P2 says the
 * default surface is Doctor + Editor only; before this component existed,
 * clicking Ship mounted the PRODUCTION/ANALYSIS/ENGINE/CODEX research shell
 * (toolSlot="studio") just to show a snapshots list — a tab bar that
 * truncated off a 1440px viewport and had zero business being on the most
 * load-bearing non-Labs tab. This panel replaces that mount for the default
 * path: exports, snapshots/versions, and the independent-verification
 * pointer — in the paper·ink·stamp language (sm-pagetop/sm-panel-body/
 * sm-card/sm-btn tokens), no research chrome.
 *
 * The research shell itself is NOT deleted (deletion moratorium) — it now
 * lives exclusively behind toolSlot="studio", reachable only through the
 * Labs-gated "Open Studio" entry in Toolbar.tsx's overflow menu (the same
 * onOpenStoryMachine-style labsEnabled gate documented there).
 *
 * Title Page editing (title/author/contact) previously lived only inside
 * that research shell's "Title" tab and stays there — it is not one of the
 * three things this container is scoped to (exports, snapshots, verify).
 * That is not a silent regression: exportFountain already only injects the
 * titlePage state's fields when the draft doesn't already start with a
 * `Title:` block, so a writer can set title/author/contact by typing valid
 * Fountain title-page syntax directly at the top of the draft — the
 * standard way most Fountain tooling expects it — without ever needing
 * Labs. Recorded in docs/p1-benchmark/SURFACE_REVALIDATION_2026-08-04.md's
 * 2026-08-21 addendum for anyone who later wants a default-surface form for
 * it too.
 */
import React from "react";
import { Download, FileText, ShieldCheck, X } from "lucide-react";
import SnapshotManager from "./SnapshotManager";

interface Snapshot {
  id: string;
  name: string;
  text: string;
  date: string;
}

interface ShipPanelProps {
  title?: string;
  isEmptyDraft: boolean;
  onExportFountain: () => void;
  onExportFDX: () => void;
  onExportPDF: () => void;
  onExportDOCX: () => void;
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
  onClose: () => void;
}

const EXPORT_ACTIONS = (props: ShipPanelProps) =>
  [
    { label: "PDF", hint: "Industry-standard, print-ready", icon: FileText, fn: props.onExportPDF },
    { label: "Fountain", hint: "Plain-text .fountain source", icon: FileText, fn: props.onExportFountain },
    { label: "Final Draft", hint: ".fdx for FDX-native tools", icon: FileText, fn: props.onExportFDX },
    { label: "Word", hint: ".docx for notes and redlines", icon: FileText, fn: props.onExportDOCX },
  ] as const;

export default function ShipPanel(props: ShipPanelProps) {
  const { title, isEmptyDraft, onClose } = props;

  return (
    <aside
      className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[400px] flex-col border-l-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-panel)] text-[var(--sm-ink)] sm:w-[380px]"
      style={{ boxShadow: "inset 1px 0 0 rgba(255,255,255,0.6), -24px 0 48px -20px rgba(33,29,21,0.25)" }}
      role="region"
      aria-labelledby="ship-panel-title"
    >
      <div className="sm-pagetop shrink-0">
        <Download className="h-4 w-4 shrink-0 text-[var(--sm-cream)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="ship-panel-title" className="sm-title text-[var(--sm-cream)]">
            Ship
          </h2>
          <p className="truncate font-[family-name:var(--sm-font-mono)] text-[9px] uppercase tracking-[0.14em] text-[var(--sm-cream)]/45">
            {title || "Draft"} · export &amp; version
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ship panel"
          className="border border-[var(--sm-cream)]/25 p-2 text-[var(--sm-cream)] hover:border-[var(--sm-cream)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="sm-panel-body flex-1 overflow-y-auto">
        {/* ── Export ─────────────────────────────────────────────────────── */}
        <section aria-labelledby="ship-export-heading" className="flex flex-col gap-3">
          <h3 id="ship-export-heading" className="sm-h">
            Export
          </h3>
          {isEmptyDraft && (
            <p className="sm-slug">Empty draft — type a scene before exporting.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {EXPORT_ACTIONS(props).map(({ label, hint, icon: Icon, fn }) => (
              <button
                key={label}
                type="button"
                onClick={fn}
                disabled={isEmptyDraft}
                title={hint}
                className="sm-btn flex flex-col items-start gap-0.5 !justify-start px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {label}
                </span>
                <span className="normal-case tracking-normal text-[9px] font-normal text-[var(--sm-ink-faint)]">
                  {hint}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="my-5 border-t border-[var(--sm-hair)]" />

        {/* ── Snapshots / versions ──────────────────────────────────────── */}
        <section aria-labelledby="ship-versions-heading" className="flex flex-col gap-3">
          <SnapshotManager
            snapshots={props.snapshots}
            snapshotModal={props.snapshotModal}
            restoreModal={props.restoreModal}
            onTakeSnapshot={props.onTakeSnapshot}
            onConfirmSnapshot={props.onConfirmSnapshot}
            onRestoreSnapshot={props.onRestoreSnapshot}
            onConfirmRestore={props.onConfirmRestore}
            onDeleteSnapshot={props.onDeleteSnapshot}
            onSetSnapshotModal={props.onSetSnapshotModal}
            onSetRestoreModal={props.onSetRestoreModal}
          />
        </section>

        <div className="my-5 border-t border-[var(--sm-hair)]" />

        {/* ── Verify-report pointer ─────────────────────────────────────── */}
        <section aria-labelledby="ship-verify-heading" className="flex flex-col gap-2">
          <h3 id="ship-verify-heading" className="sm-h">
            Independent verification
          </h3>
          <div className="sm-card flex flex-col gap-2">
            <p className="text-xs leading-relaxed text-[var(--sm-ink-soft)]">
              Every coverage export carries a verify block — a script-text
              hash plus the numbers it claims. Anyone holding the original
              script can re-derive them without trusting this app.
            </p>
            {/* Same #verify hash route StartScreen's own "Verify a report"
                link uses (App.tsx) — deliberately outside the Labs gate. */}
            <a
              href="#verify"
              className="sm-btn inline-flex w-fit items-center gap-2 !justify-start px-3 py-2"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Verify a report
            </a>
          </div>
        </section>
      </div>
    </aside>
  );
}
