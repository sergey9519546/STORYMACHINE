import React from "react";
import { BookOpen, Settings2, Layers, Download, Loader2, Stethoscope, SpellCheck, Sparkles } from "lucide-react";

interface ToolbarProps {
  isSaving: boolean;
  isAnalyzing: boolean;
  showDirectorHUD: boolean;
  directorsLayer: boolean;
  showScriptDoctor: boolean;
  liveDiagnostics: boolean;
  wordCount: number;
  isTypewriterSound: boolean;
  isSimulating: boolean;
  onToggleHUD: () => void;
  onToggleDirectorsLayer: () => void;
  onToggleScriptDoctor: () => void;
  onToggleLiveDiagnostics: () => void;
  onToggleTypewriterSound: () => void;
  onExportFountain: () => void;
  onExportFDX: () => void;
  onExportPDF: () => void;
  onExportDOCX: () => void;
  onSimulateScript?: () => void;
  onOpenStoryMachine?: () => void;
}

export default function Toolbar({
  isSaving,
  isAnalyzing,
  showDirectorHUD,
  directorsLayer,
  showScriptDoctor,
  liveDiagnostics,
  wordCount,
  isTypewriterSound,
  isSimulating,
  onToggleHUD,
  onToggleDirectorsLayer,
  onToggleScriptDoctor,
  onToggleLiveDiagnostics,
  onToggleTypewriterSound,
  onExportFountain,
  onExportFDX,
  onExportPDF,
  onExportDOCX,
  onSimulateScript,
  onOpenStoryMachine,
}: ToolbarProps) {
  return (
    <div className="p-4 border-b-4 border-black bg-black text-white flex justify-between items-center z-20">
      <h1 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
        <BookOpen className="w-4 h-4" /> The Ingest Engine (Script)
      </h1>
      <div className="flex items-center gap-4">
        {isSaving && (
          <div className="text-[10px] font-bold text-yellow-400 animate-pulse uppercase tracking-widest">
            Auto-saving...
          </div>
        )}
        <div className="text-xs font-mono" aria-live="polite" role="status">
          {isAnalyzing ? (
            <span className="flex items-center gap-2 text-yellow-400">
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />{" "}
              ANALYZING...
            </span>
          ) : (
            <span className="text-green-400">READY</span>
          )}
        </div>
        <div className="text-[10px] font-mono text-gray-400 hidden sm:block">
          {wordCount} words
        </div>
        <button
          onClick={onToggleTypewriterSound}
          aria-label={isTypewriterSound ? "Mute typewriter sound" : "Enable typewriter sound"}
          aria-pressed={isTypewriterSound}
          title={isTypewriterSound ? "Typewriter sound ON" : "Typewriter sound OFF"}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors brutal-border ${
            isTypewriterSound ? "bg-white text-black" : "bg-gray-600 text-gray-300"
          }`}
        >
          {isTypewriterSound ? "⌨ SFX" : "⌨ MUTE"}
        </button>
        <button
          onClick={onToggleHUD}
          aria-label={showDirectorHUD ? "Hide Director HUD" : "Show Director HUD"}
          aria-pressed={showDirectorHUD}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors brutal-border flex items-center gap-2 ${
            showDirectorHUD
              ? "bg-purple-600 text-white"
              : "bg-white text-black hover:bg-gray-200"
          }`}
        >
          <Settings2 className="w-3 h-3" aria-hidden="true" /> HUD
        </button>
        <button
          onClick={onToggleDirectorsLayer}
          aria-label={
            directorsLayer
              ? "Hide Director's Layer"
              : "Show Director's Layer"
          }
          aria-pressed={directorsLayer}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors brutal-border flex items-center gap-2 ${
            directorsLayer
              ? "bg-purple-600 text-white"
              : "bg-white text-black hover:bg-gray-200"
          }`}
        >
          <Layers className="w-3 h-3" aria-hidden="true" /> Director&apos;s Layer
        </button>
        <button
          onClick={onToggleScriptDoctor}
          aria-label={showScriptDoctor ? "Hide Script Doctor" : "Show Script Doctor"}
          aria-pressed={showScriptDoctor}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors brutal-border flex items-center gap-2 ${
            showScriptDoctor
              ? "bg-purple-600 text-white"
              : "bg-white text-black hover:bg-gray-200"
          }`}
        >
          <Stethoscope className="w-3 h-3" aria-hidden="true" /> Doctor
        </button>
        <button
          onClick={onToggleLiveDiagnostics}
          aria-label={liveDiagnostics ? "Hide Live Notes" : "Show Live Notes"}
          aria-pressed={liveDiagnostics}
          title={
            liveDiagnostics
              ? "Live Notes ON — narrative issues underline as you write"
              : "Live Notes OFF — enable in-editor squiggle diagnostics"
          }
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors brutal-border flex items-center gap-2 ${
            liveDiagnostics
              ? "bg-purple-600 text-white"
              : "bg-white text-black hover:bg-gray-200"
          }`}
        >
          <SpellCheck className="w-3 h-3" aria-hidden="true" /> Live Notes
        </button>
        <button
          onClick={onExportFountain}
          aria-label="Export script as Fountain file"
          className="bg-white text-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors brutal-border flex items-center gap-2"
        >
          <Download className="w-3 h-3" aria-hidden="true" /> .Fountain
        </button>
        <button
          onClick={onExportFDX}
          aria-label="Export script as Final Draft FDX file"
          title="Export as Final Draft (.fdx)"
          className="bg-white text-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors brutal-border flex items-center gap-2"
        >
          <Download className="w-3 h-3" aria-hidden="true" /> .FDX
        </button>
        <button
          onClick={onExportPDF}
          aria-label="Export script as industry-standard PDF"
          title="Export as PDF (Courier 12pt, industry margins)"
          className="bg-white text-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors brutal-border flex items-center gap-2"
        >
          <Download className="w-3 h-3" aria-hidden="true" /> .PDF
        </button>
        <button
          onClick={onExportDOCX}
          aria-label="Export script as Word document"
          title="Export as Word (.docx)"
          className="bg-white text-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors brutal-border flex items-center gap-2"
        >
          <Download className="w-3 h-3" aria-hidden="true" /> .DOCX
        </button>
        <button
          onClick={onSimulateScript}
          disabled={isSimulating || !onSimulateScript}
          aria-label={isSimulating ? "Simulating script…" : "Simulate this script in Story Machine"}
          title="Seed an OASIS scenario from this script's scenes and characters, then open Story Machine"
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors brutal-border flex items-center gap-2 ${
            isSimulating
              ? "bg-gray-500 text-gray-200 cursor-wait"
              : "bg-purple-600 text-white hover:bg-white hover:text-black disabled:opacity-40"
          }`}
        >
          {isSimulating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Simulating…
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" aria-hidden="true" /> Simulate
            </>
          )}
        </button>
        <button
          onClick={onOpenStoryMachine}
          aria-label="Launch Story Machine"
          className="bg-[#FF4444] text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors brutal-border"
        >
          Launch Machine
        </button>
      </div>
    </div>
  );
}
