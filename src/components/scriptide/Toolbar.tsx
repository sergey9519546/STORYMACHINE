import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Download,
  Layers,
  Layers3,
  Loader2,
  MoreHorizontal,
  PanelRight,
  Settings2,
  Sparkles,
  SpellCheck,
  Stethoscope,
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
  onToggleTypewriterSound: () => void;
  onExportFountain: () => void;
  onExportFDX: () => void;
  onExportPDF: () => void;
  onExportDOCX: () => void;
  onSimulateScript?: () => void;
  onOpenStoryMachine?: () => void;
  onNewStory?: () => void;
  onOpenCollab?: () => void;
  onOpenCopilot?: () => void;
}

const TASKS: Array<{ id: IdeTask; label: string; title: string }> = [
  { id: "write", label: "Write", title: "Draft on the page" },
  { id: "coverage", label: "Coverage", title: "Diagnose the draft" },
  { id: "ship", label: "Ship", title: "Export, version, simulate" },
];

export default function Toolbar({
  title = "Untitled Script",
  task,
  toolSlot,
  saveStatusLabel = "",
  isAnalyzing,
  directorsLayer,
  liveDiagnostics,
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
  onToggleTypewriterSound,
  onExportFountain,
  onExportFDX,
  onExportPDF,
  onExportDOCX,
  onSimulateScript,
  onOpenStoryMachine,
  onNewStory,
  onOpenCollab,
  onOpenCopilot,
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

  const statusTone = isAnalyzing
    ? "text-yellow-300"
    : coverageStale
      ? "text-amber-300"
      : "text-green-300";

  const statusLabel = isAnalyzing
    ? "Running"
    : coverageStale
      ? "Outdated"
      : "Ready";

  return (
    <header className="z-20 border-b-2 border-black bg-black text-white">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
        {/* Location / artifact */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
              {title}
            </h1>
            <p className="hidden font-mono text-[10px] uppercase tracking-widest text-white/50 sm:block">
              Script desk
              {provenance !== "user" ? ` · ${provenance}` : ""}
            </p>
          </div>
        </div>

        {/* Task modes — stable structure, adaptive emphasis */}
        <nav
          aria-label="Current task"
          className="order-3 flex w-full basis-full justify-center gap-1 sm:order-none sm:w-auto sm:basis-auto"
        >
          {TASKS.map((t) => {
            const active = task === t.id;
            return (
              <button
                key={t.id}
                type="button"
                title={t.title}
                aria-pressed={active}
                onClick={() => onTaskChange(t.id)}
                className={`min-h-[40px] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "bg-white text-black"
                    : "border border-white/25 text-white/75 hover:border-white hover:text-white"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Status + compact actions */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/55 md:flex">
            <span className={statusTone} role="status" aria-live="polite">
              {statusLabel}
            </span>
            {saveStatusLabel ? (
              <span className="max-w-[9rem] truncate text-white/45" title={saveStatusLabel}>
                {saveStatusLabel}
              </span>
            ) : null}
            <span>
              {wordCount}w · {pageCount}pp
            </span>
          </div>

          {/* Export menu — primary in Ship, available always */}
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              onClick={() => {
                setExportOpen((v) => !v);
                setOverflowOpen(false);
              }}
              className={`flex min-h-[40px] items-center gap-1 border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                task === "ship"
                  ? "border-white bg-white text-black"
                  : "border-white/30 text-white hover:border-white"
              }`}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </button>
            {exportOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] border-2 border-black bg-white py-1 text-black shadow-[4px_4px_0_0_#000]"
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
                    className="block w-full px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider hover:bg-black hover:text-white"
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
            className="flex min-h-[40px] items-center gap-1.5 border border-white/30 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:border-white disabled:cursor-wait disabled:opacity-40"
          >
            {isSimulating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{isSimulating ? "…" : "Simulate"}</span>
          </button>

          {/* Overflow — secondary tools stay reachable without competing */}
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
              className="flex min-h-[40px] min-w-[40px] items-center justify-center border border-white/30 text-white transition-colors hover:border-white"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
            {overflowOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 w-56 border-2 border-black bg-white py-1 text-black shadow-[4px_4px_0_0_#000]"
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
                <div className="my-1 border-t border-black/15" />
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
                    label="Launch Story Machine"
                    onClick={() => {
                      onOpenStoryMachine();
                      setOverflowOpen(false);
                    }}
                  />
                )}
                {onNewStory && (
                  <>
                    <div className="my-1 border-t border-black/15" />
                    <OverflowItem
                      label="New story…"
                      onClick={() => {
                        onNewStory();
                        setOverflowOpen(false);
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>
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
      className={`flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider hover:bg-black hover:text-white ${
        pressed ? "bg-black/5 font-bold" : ""
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
    </button>
  );
}
