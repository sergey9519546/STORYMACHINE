import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
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
  Wand2,
} from "lucide-react";

/** Three user-facing desk modes. Scenes/cast stay in the rail (not a peer mode). */
export type IdeTask = "write" | "coverage" | "ship";
export type IdeToolSlot = "none" | "coverage" | "studio" | "director" | "slate";

interface ToolbarProps {
  title?: string;
  task: IdeTask;
  toolSlot: IdeToolSlot;
  saveStatusLabel?: string;
  isAnalyzing: boolean;
  directorsLayer: boolean;
  liveDiagnostics: boolean;
  /** G0-03: inline AI ghost-text completion toggle state. */
  inlineCompletion: boolean;
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
  onToggleInlineCompletion: () => void;
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
  onOpenCopilot?: () => void;
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
  saveStatusLabel = "",
  isAnalyzing,
  directorsLayer,
  liveDiagnostics,
  inlineCompletion,
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
  onToggleInlineCompletion,
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
  onOpenCopilot,
  onToggleSidebar,
}: ToolbarProps) {
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

  const statusLabel = isAnalyzing ? "Running" : coverageStale ? "Outdated" : "Ready";
  const statusClass = isAnalyzing
    ? "text-[var(--sm-warn)]"
    : coverageStale
      ? "text-[var(--sm-stamp)]"
      : "text-[var(--sm-ok)]";

  return (
    <header
      className="sm-pagetop z-20 flex-wrap gap-y-2 border-b-[1.5px] border-[var(--sm-ink)]"
      style={{ padding: '10px 16px' }}
    >
      {/* Identity */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
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
          <p className="hidden font-[family-name:var(--sm-font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--sm-cream)]/45 sm:block">
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

      {/* Status + utilities cluster */}
      <div className="flex shrink-0 items-center gap-2.5">
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
        
        {/* Save status chip - now prominent with icons and colors */}
        {saveStatusLabel && (
          <span
            className={`inline-flex min-h-[28px] items-center gap-1.5 border px-2.5 font-[family-name:var(--sm-font-mono)] text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
              saveStatusLabel === "saved-server"
                ? "border-[var(--sm-ok)] text-[var(--sm-ok)]"
                : saveStatusLabel === "saving-local"
                  ? "border-[var(--sm-warn)] text-[var(--sm-warn)]"
                  : saveStatusLabel === "save-conflict"
                    ? "border-[var(--sm-stamp)] bg-[var(--sm-stamp)]/10 text-[var(--sm-stamp)]"
                    : saveStatusLabel === "save-failed"
                      ? "border-[var(--sm-stamp)] bg-[var(--sm-stamp)]/10 text-[var(--sm-stamp)]"
                      : "border-[var(--sm-cream)]/30 text-[var(--sm-cream)]/60"
            }`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            title={
              saveStatusLabel === "saved-server"
                ? "All changes saved to server"
                : saveStatusLabel === "saving-local"
                  ? "Saving changes..."
                  : saveStatusLabel === "save-conflict"
                    ? "Conflict detected - resolve below"
                    : saveStatusLabel === "save-failed"
                      ? "Failed to save - your work may be at risk"
                      : saveStatusLabel
            }
          >
            {saveStatusLabel === "saved-server" && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
            {saveStatusLabel === "saving-local" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {(saveStatusLabel === "save-conflict" || saveStatusLabel === "save-failed") && (
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {saveStatusLabel === "saved-server"
                ? "Saved"
                : saveStatusLabel === "saving-local"
                  ? "Saving"
                  : saveStatusLabel === "save-conflict"
                    ? "Conflict"
                    : saveStatusLabel === "save-failed"
                      ? "Not Saved"
                      : saveStatusLabel}
            </span>
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

        <button
          type="button"
          onClick={onSimulateScript}
          disabled={isSimulating || !onSimulateScript}
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
                icon={<Wand2 className="h-3.5 w-3.5" />}
                label={inlineCompletion ? "Inline copilot on" : "Inline copilot off"}
                pressed={inlineCompletion}
                onClick={() => {
                  onToggleInlineCompletion();
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
              {onOpenCopilot && (
                <OverflowItem
                  label="Copilot voice"
                  onClick={() => {
                    onOpenCopilot();
                    setOverflowOpen(false);
                  }}
                />
              )}
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
                      label="New story…"
                      onClick={() => {
                        onNewStory();
                        setOverflowOpen(false);
                      }}
                    />
                  )}
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
