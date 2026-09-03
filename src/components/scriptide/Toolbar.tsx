import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  FlaskConical,
  Home,
  Layers,
  Layers3,
  Loader2,
  Menu,
  MoreHorizontal,
  PanelRight,
  Settings2,
  Sparkles,
  SpellCheck,
  Stethoscope,
  Zap,
} from "lucide-react";
import { getLabsEnabled } from "../../lib/feature-flags";
import type { SaveStatus } from "../../lib/draft-persistence";

/** Three user-facing desk modes. Scenes/cast stay in the rail (not a peer mode). */
export type IdeTask = "write" | "coverage" | "ship";
// W6: "ship" is the plain writer-facing container (exports, snapshots/
// versions, verify-report pointer — ShipPanel.tsx) that the always-visible
// Ship task tab opens by default. "studio" is the PRODUCTION/ANALYSIS/
// ENGINE/CODEX research shell — Labs-gated, reachable only via this
// Toolbar's own "Open Studio" overflow item (see the labsEnabled check
// below). They used to be the same slot, which is exactly the P2 leak W6
// closed: the Ship tab was mounting the research shell for every writer.
export type IdeToolSlot = "none" | "coverage" | "ship" | "studio" | "director" | "slate";

/** Phase E exit-gate punch list, P1: which right-side coverage panel (if
 *  any) is currently drawn on top of this header — "mini" for
 *  CoverageSummary.tsx's fixed 380px aside, "full" for ScriptDoctorPanel.tsx's
 *  fixed 640px (max 94vw) drawer, "none" otherwise. Drives reservedRightCss
 *  below so the header's own live content (identity, save-status chip, etc.)
 *  never renders UNDER that panel's left edge — the root cause of the
 *  clipped "SAVING LOCA…" bug: the panel is a `position:fixed` overlay with
 *  no participation in this header's layout, so without a reservation the
 *  header simply draws content that the panel then draws over. */
export type IdePanelReserve = "none" | "mini" | "full";

interface ToolbarProps {
  title?: string;
  task: IdeTask;
  toolSlot: IdeToolSlot;
  panelReserve?: IdePanelReserve;
  /** Phase E exit-gate punch list, P1: the RAW SaveStatus enum, not a
   *  pre-formatted display string. Renamed from the old `saveStatusLabel`
   *  prop, which was passed draft-persistence.ts's saveStatusLabel(status)
   *  OUTPUT ("Saving locally…") while this component's own render logic
   *  compared it against the enum's raw values ("saving-local") — a
   *  mismatch that never matched, so the chip always fell through to its
   *  bland "else" branch (no icon, no color, and the FULL long-form string
   *  instead of the intended short "Saving"/"Saved" label) — one of the
   *  contributors to how much of this chip extended under the coverage
   *  panel's left edge before panelReserve above. */
  saveStatus?: SaveStatus;
  /** Finding 2 (audit-client-data-paths.md): the server's own validation
   *  message for a save-failed status caused by a 4xx rejection (e.g. an
   *  oversized scriptText/title-page field), verbatim from the response
   *  body — replaces the generic "may be at risk" wording so the writer can
   *  actually tell what's wrong. Undefined/null for a network/5xx failure,
   *  where the generic wording is already accurate. */
  saveFailureMessage?: string | null;
  /** True only when the current save-failed status is a 4xx validation
   *  rejection (retrying the identical payload cannot succeed) rather than a
   *  network/5xx blip (worth retrying) — drives a distinct chip label. */
  saveFailureIsValidation?: boolean;
  /** Finding 2: scriptText is within 5% of the server's hard save cap. Shown
   *  as a standalone soft warning (not tied to saveStatus) so it appears
   *  BEFORE any save actually fails. */
  scriptNearSizeCap?: boolean;
  isAnalyzing: boolean;
  directorsLayer: boolean;
  liveDiagnostics: boolean;
  /** G0-04: idle/background AI analysis (POST /api/analyze-script) toggle state. */
  autoAnalysis: boolean;
  wordCount: number;
  pageCount: number;
  isTypewriterSound: boolean;
  isSimulating: boolean;
  coverageStale?: boolean;
  provenance?: "user" | "sample" | "import" | "simulation";
  onTaskChange: (task: IdeTask) => void;
  onToggleDirectorsLayer: () => void;
  onOpenDirector: () => void;
  onOpenSlate: () => void;
  onOpenStudio: () => void;
  onToggleLiveDiagnostics: () => void;
  onToggleAutoAnalysis: () => void;
  onToggleTypewriterSound: () => void;
  onExportFountain: () => void;
  onExportFDX: () => void;
  onExportPDF: () => void;
  onExportDOCX: () => void;
  onSimulateScript?: () => void;
  onOpenStoryMachine?: () => void;
  onNewStory?: () => void;
  onGoHome?: () => void;
  onOpenCollab?: () => void;
  onOpenSettings?: () => void;
  onToggleSidebar?: () => void;
}

const TASKS: Array<{ id: IdeTask; label: string; title: string }> = [
  { id: "write", label: "Write", title: "Draft on the page" },
  { id: "coverage", label: "Coverage", title: "Diagnose the draft" },
  { id: "ship", label: "Ship", title: "Export, version, simulate" },
];

/**
 * Desk chrome — night bar from the paper·ink·stamp system.
 * Navigation + identity only; tools live in mode, export, or overflow.
 */
export default function Toolbar({
  title = "Untitled Script",
  task,
  toolSlot,
  panelReserve = "none",
  saveStatus,
  saveFailureMessage,
  saveFailureIsValidation = false,
  scriptNearSizeCap = false,
  isAnalyzing,
  directorsLayer,
  liveDiagnostics,
  autoAnalysis,
  wordCount,
  pageCount,
  isTypewriterSound,
  isSimulating,
  coverageStale = false,
  provenance = "user",
  onTaskChange,
  onToggleDirectorsLayer,
  onOpenDirector,
  onOpenSlate,
  onOpenStudio,
  onToggleLiveDiagnostics,
  onToggleAutoAnalysis,
  onToggleTypewriterSound,
  onExportFountain,
  onExportFDX,
  onExportPDF,
  onExportDOCX,
  onSimulateScript,
  onOpenStoryMachine,
  onNewStory,
  onGoHome,
  onOpenCollab,
  onOpenSettings,
  onToggleSidebar,
}: ToolbarProps) {
  // P2 (ROADMAP): research tool slots (Studio, Director, Slate) are gated behind
  // the Labs flag so the default experience is Doctor + Editor only.
  const labsEnabled = getLabsEnabled();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen && !exportOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (overflowOpen && overflowRef.current && !overflowRef.current.contains(t)) {
        setOverflowOpen(false);
      }
      if (exportOpen && exportRef.current && !exportRef.current.contains(t)) {
        setExportOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOverflowOpen(false);
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [overflowOpen, exportOpen]);

  // Phase E exit-gate punch list, P1: one entry per real SaveStatus value
  // (idle intentionally excluded — the chip doesn't render for it, see
  // `saveStatus && saveStatus !== "idle"` below). Short `label` is what
  // shows in the chip (sm: and up); `title` is the full tooltip.
  const SAVE_STATUS_META: Record<
    Exclude<SaveStatus, "idle">,
    { border: string; icon: React.ReactNode; label: string; title: string }
  > = {
    "saving-local": {
      border: "border-[var(--sm-warn)] text-[var(--sm-warn)]",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />,
      label: "Saving",
      title: "Saving changes…",
    },
    "saved-local": {
      border: "border-[var(--sm-ok)] text-[var(--sm-ok)]",
      icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
      label: "Saved",
      title: "Saved on this device",
    },
    "saving-server": {
      border: "border-[var(--sm-warn)] text-[var(--sm-warn)]",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />,
      label: "Syncing",
      title: "Saving to server…",
    },
    "saved-server": {
      border: "border-[var(--sm-ok)] text-[var(--sm-ok)]",
      icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
      label: "Saved",
      title: "All changes saved to server",
    },
    "save-conflict": {
      border: "border-[var(--sm-stamp)] bg-[var(--sm-stamp)]/10 text-[var(--sm-stamp)]",
      icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />,
      label: "Conflict",
      title: "Conflict detected - resolve below",
    },
    "save-failed": {
      border: "border-[var(--sm-stamp)] bg-[var(--sm-stamp)]/10 text-[var(--sm-stamp)]",
      icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />,
      // Finding 2: a 4xx validation rejection (the draft itself is too big —
      // retrying the same bytes can never succeed) reads distinctly from a
      // network/5xx blip (worth retrying), both in the short chip label and
      // its full tooltip (the server's own message, when one came back).
      label: saveFailureIsValidation ? "Too Large" : "Not Saved",
      title: saveFailureMessage || "Failed to save - your work may be at risk",
    },
  };
  const saveMeta = saveStatus && saveStatus !== "idle" ? SAVE_STATUS_META[saveStatus] : null;

  const statusLabel = isAnalyzing ? "Running" : coverageStale ? "Outdated" : "Ready";
  const statusClass = isAnalyzing
    ? "text-[var(--sm-warn)]"
    : coverageStale
      ? "text-[var(--sm-stamp)]"
      : "text-[var(--sm-ok)]";

  // Phase E exit-gate punch list, P1: mirrors CoverageSummary.tsx's own
  // `sm:` breakpoint (Tailwind's default 640px) for when its 380px aside
  // actually sits beside the header rather than covering the whole screen
  // edge-to-edge (its mobile layout is a full-screen slide-over, so nothing
  // needs reserving there — the header is meant to be fully hidden behind it,
  // same as any other full-screen sheet). Below 640px, isDesktop stays false
  // and reservedRightCss stays undefined.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(min-width: 640px)").matches
      : true,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 640px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // CoverageSummary.tsx: `sm:w-[380px]`. ScriptDoctorPanel.tsx: `w-[640px]
  // max-w-[94vw]` — min() mirrors that same cap so the reservation never
  // exceeds the drawer's own real width on a narrower desktop viewport.
  const reservedRightCss =
    !isDesktop || panelReserve === "none"
      ? undefined
      : panelReserve === "mini"
        ? "380px"
        : "min(640px, 94vw)";

  return (
    <header
      className="sm-pagetop z-20 flex-wrap gap-y-2 border-b-[1.5px] border-[var(--sm-ink)]"
      style={{
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 16,
        // Reserves real layout space for whichever coverage panel is open
        // instead of letting its fixed-position overlay silently cover live
        // header content — see IdePanelReserve's doc comment above.
        paddingRight: reservedRightCss ? `calc(${reservedRightCss} + 16px)` : 16,
      }}
    >
      {/* Identity. min-w-[160px] (not min-w-0): a bare min-w-0 let this block
          get squeezed toward 0 width whenever panelReserve's paddingRight
          (above) leaves the header tight — the title/subtitle's own
          `truncate` still engaged, but at ~24px wide it wrapped into an
          unreadable one-word-per-line stack instead of legibly truncating.
          A concrete floor keeps this block readable and lets nav/the status
          cluster wrap to their own row instead — flex-wrap on the header
          already handles that gracefully. */}
      <div className="flex min-w-[160px] flex-1 items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Open scenes and characters"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center border border-[var(--sm-cream)]/25 text-[var(--sm-cream)] md:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="sm-chip hidden border-[var(--sm-cream)]/30 bg-transparent text-[var(--sm-cream)] sm:inline-flex">
              Script
            </span>
            <h1 className="truncate font-[family-name:var(--sm-font-display)] text-sm uppercase leading-none tracking-[0.04em] text-[var(--sm-cream)]">
              {title}
            </h1>
          </div>
          <p className="hidden truncate font-[family-name:var(--sm-font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--sm-cream)]/45 sm:block">
            {provenance !== "user" ? provenance : "desk"}
            <span className="text-[var(--sm-cream)]/30">
              {" "}
              · {wordCount}w · {pageCount}pp
            </span>
          </p>
        </div>
      </div>

      {/* Mode switch — filled segment = active */}
      <nav
        aria-label="Current task"
        className="order-3 flex w-full basis-full justify-center sm:order-none sm:w-auto sm:basis-auto"
      >
        <div className="inline-flex border border-[var(--sm-cream)]/25 p-0.5">
          {TASKS.map((t) => {
            const active = task === t.id;
            return (
              <button
                key={t.id}
                type="button"
                title={t.title}
                aria-pressed={active}
                onClick={() => onTaskChange(t.id)}
                className={`min-h-[40px] px-4 font-[family-name:var(--sm-font-mono)] text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  active
                    ? "bg-[var(--sm-cream)] text-[var(--sm-ink)]"
                    : "text-[var(--sm-cream)]/70 hover:text-[var(--sm-cream)]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Status + utilities cluster.

          Phone-width fix (375/390px): this cluster used to be a single
          `shrink-0` nowrap row. Its own max-content width is ~415px — wider
          than a 375px viewport — and because ScriptIDE's root shell is
          `overflow-hidden`, the tail of the row (the Export menu AND the
          "More tools" overflow button) was clipped off the right edge with
          NO scroll affordance to reach it. The overflow menu is the only
          route to Labs & Settings, so on a phone that also made Settings →
          Session → "Delete Everything" — the exact flow #privacy tells the
          reader to use — physically unreachable.

          Below `sm` the cluster now takes its own full-width row and wraps
          internally, so every chip and control stays inside the viewport.
          From `sm` up every one of those utilities is restored verbatim
          (w-auto / basis-auto / flex-nowrap / shrink-0), so the desktop
          header is byte-identical in layout to before. */}
      <div className="flex w-full basis-full flex-wrap items-center justify-end gap-2.5 sm:w-auto sm:basis-auto sm:flex-nowrap sm:shrink-0">
        {/* Status chip */}
        <span
          className={`inline-flex min-h-[28px] items-center border px-2 font-[family-name:var(--sm-font-mono)] text-[10px] font-bold uppercase tracking-[0.12em] ${
            isAnalyzing
              ? "border-[var(--sm-warn)] text-[var(--sm-warn)]"
              : coverageStale
                ? "border-[var(--sm-stamp)] text-[var(--sm-stamp)]"
                : "border-[var(--sm-ok)] text-[var(--sm-ok)]"
          }`}
          role="status"
          aria-live="polite"
        >
          {statusLabel}
        </span>
        
        {/* Save status chip - now prominent with icons and colors.
            min-w-0 + truncate (below) are defensive: with panelReserve
            keeping this cluster clear of the coverage panel's left edge
            (see reservedRightCss above), this chip should never need to
            shrink — but if the header ever gets tighter than expected, it
            now degrades to an ellipsis instead of being silently overdrawn. */}
        {saveMeta && (
          <span
            className={`inline-flex min-w-0 min-h-[28px] items-center gap-1.5 border px-2.5 font-[family-name:var(--sm-font-mono)] text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${saveMeta.border}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            title={saveMeta.title}
          >
            {saveMeta.icon}
            <span className="hidden truncate sm:inline">{saveMeta.label}</span>
          </span>
        )}

        {/* Page / Word Budget Indicator */}
        <span
          className="inline-flex min-h-[28px] items-center gap-1 border border-[var(--sm-cream)]/30 px-2 font-[family-name:var(--sm-font-mono)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--sm-cream)]/80"
          title="Feature screenplay budget target: ~110 pages"
        >
          <span>P.{pageCount || 1}/110</span>
          <span className="text-[var(--sm-cream)]/40">·</span>
          <span>{wordCount.toLocaleString()} w</span>
        </span>

        {/* Finding 2: soft warning as scriptText nears the server's hard
            save cap — appears BEFORE any save actually fails, distinct from
            the save-failed chip above (which only shows once one has). */}
        {scriptNearSizeCap && (
          <span
            className="inline-flex min-h-[28px] items-center gap-1.5 border border-[var(--sm-warn)] px-2 font-[family-name:var(--sm-font-mono)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--sm-warn)]"
            role="status"
            aria-live="polite"
            title="This draft is nearing the server's save size limit — trim it or export a copy so autosave keeps working"
          >
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Near Size Limit</span>
          </span>
        )}

        <div className="relative" ref={exportRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            onClick={() => {
              setExportOpen((v) => !v);
              setOverflowOpen(false);
            }}
            className={`flex min-h-[40px] items-center gap-1.5 border px-3 font-[family-name:var(--sm-font-mono)] text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
              task === "ship"
                ? "border-[var(--sm-stamp)] bg-[var(--sm-stamp)] text-white"
                : "border-[var(--sm-cream)]/30 text-[var(--sm-cream)] hover:border-[var(--sm-cream)]"
            }`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
          {exportOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] border-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-panel)] py-1 text-[var(--sm-ink)] shadow-[var(--sm-shadow-sm)]"
            >
              {[
                { label: "Fountain", fn: onExportFountain },
                { label: "Final Draft", fn: onExportFDX },
                { label: "PDF", fn: onExportPDF },
                { label: "Word", fn: onExportDOCX },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left font-[family-name:var(--sm-font-mono)] text-[11px] uppercase tracking-wider hover:bg-[var(--sm-ink)] hover:text-[var(--sm-cream)]"
                  onClick={() => {
                    item.fn();
                    setExportOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* P2 surface collapse: simulation is a Labs surface. ScriptIDE
            withholds onSimulateScript when Labs is off, and the control is
            hidden (not merely disabled) so no research affordance survives
            on the default Doctor+Editor surface. */}
        {onSimulateScript && (
          <button
            type="button"
            onClick={onSimulateScript}
            disabled={isSimulating}
            aria-label={isSimulating ? "Simulating script" : "Simulate in Story Machine"}
            aria-busy={isSimulating}
            className={`flex min-h-[40px] min-w-[40px] items-center gap-1.5 border border-[var(--sm-cream)]/30 px-2.5 font-[family-name:var(--sm-font-mono)] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sm-cream)] transition-colors hover:border-[var(--sm-cream)] ${
              isSimulating ? "cursor-wait opacity-50" : "disabled:opacity-40"
            }`}
          >
            {isSimulating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{isSimulating ? "Simulating" : "Simulate"}</span>
          </button>
        )}

        <div className="relative" ref={overflowRef}>
          <button
            type="button"
            aria-label="More tools"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            onClick={() => {
              setOverflowOpen((v) => !v);
              setExportOpen(false);
            }}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center border border-[var(--sm-cream)]/30 text-[var(--sm-cream)] transition-colors hover:border-[var(--sm-cream)]"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
          {overflowOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-56 border-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-panel)] py-1 text-[var(--sm-ink)] shadow-[var(--sm-shadow-sm)]"
            >
              <OverflowItem
                icon={<Stethoscope className="h-3.5 w-3.5" />}
                label={toolSlot === "coverage" ? "Close Coverage" : "Open Coverage"}
                onClick={() => {
                  onTaskChange(toolSlot === "coverage" ? "write" : "coverage");
                  setOverflowOpen(false);
                }}
              />
              {labsEnabled && (
                <>
                  <OverflowItem
                    icon={<PanelRight className="h-3.5 w-3.5" />}
                    label={toolSlot === "studio" ? "Close Studio" : "Open Studio"}
                    onClick={() => {
                      onOpenStudio();
                      setOverflowOpen(false);
                    }}
                  />
                  <OverflowItem
                    icon={<Settings2 className="h-3.5 w-3.5" />}
                    label={toolSlot === "director" ? "Close Director" : "Director HUD"}
                    onClick={() => {
                      onOpenDirector();
                      setOverflowOpen(false);
                    }}
                  />
                  <OverflowItem
                    icon={<Layers3 className="h-3.5 w-3.5" />}
                    label={toolSlot === "slate" ? "Close Slate" : "Slate compare"}
                    onClick={() => {
                      onOpenSlate();
                      setOverflowOpen(false);
                    }}
                  />
                </>
              )}
              <div className="my-1 border-t border-[var(--sm-hair)]" />
              <OverflowItem
                icon={<Layers className="h-3.5 w-3.5" />}
                label={directorsLayer ? "Director layer on" : "Director layer off"}
                pressed={directorsLayer}
                onClick={() => {
                  onToggleDirectorsLayer();
                  setOverflowOpen(false);
                }}
              />
              <OverflowItem
                icon={<SpellCheck className="h-3.5 w-3.5" />}
                label={liveDiagnostics ? "Live notes on" : "Live notes off"}
                pressed={liveDiagnostics}
                onClick={() => {
                  onToggleLiveDiagnostics();
                  setOverflowOpen(false);
                }}
              />
              <OverflowItem
                icon={<Zap className="h-3.5 w-3.5" />}
                label={autoAnalysis ? "Auto-analysis on" : "Auto-analysis off"}
                pressed={autoAnalysis}
                onClick={() => {
                  onToggleAutoAnalysis();
                  setOverflowOpen(false);
                }}
              />
              <OverflowItem
                label={isTypewriterSound ? "Typewriter SFX on" : "Typewriter SFX off"}
                pressed={isTypewriterSound}
                onClick={() => {
                  onToggleTypewriterSound();
                  setOverflowOpen(false);
                }}
              />
              {onOpenCollab && (
                <OverflowItem
                  label="Collaborate"
                  onClick={() => {
                    onOpenCollab();
                    setOverflowOpen(false);
                  }}
                />
              )}
              {onOpenStoryMachine && (
                <OverflowItem
                  label="Open Simulate"
                  onClick={() => {
                    onOpenStoryMachine();
                    setOverflowOpen(false);
                  }}
                />
              )}
              {(onGoHome || onNewStory) && (
                <>
                  <div className="my-1 border-t border-[var(--sm-hair)]" />
                  {onGoHome && (
                    <OverflowItem
                      icon={<Home className="h-3.5 w-3.5" />}
                      label="Home"
                      onClick={() => {
                        onGoHome();
                        setOverflowOpen(false);
                      }}
                    />
                  )}
                  {onNewStory && (
                    <OverflowItem
                      label="Change setup…"
                      onClick={() => {
                        onNewStory();
                        setOverflowOpen(false);
                      }}
                    />
                  )}
                </>
              )}
              {/* P2: Settings (incl. Labs toggle) always reachable so a writer
                  can enable OASIS/research surfaces without first entering them. */}
              {onOpenSettings && (
                <>
                  <div className="my-1 border-t border-[var(--sm-hair)]" />
                  <OverflowItem
                    icon={<FlaskConical className="h-3.5 w-3.5" />}
                    label={labsEnabled ? "Labs is ON" : "Labs & Settings"}
                    onClick={() => {
                      onOpenSettings();
                      setOverflowOpen(false);
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function OverflowItem({
  label,
  onClick,
  icon,
  pressed,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left font-[family-name:var(--sm-font-mono)] text-[11px] uppercase tracking-wider hover:bg-[var(--sm-ink)] hover:text-[var(--sm-cream)] ${
        pressed ? "bg-[var(--sm-panel-2)] font-bold" : ""
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
    </button>
  );
}
