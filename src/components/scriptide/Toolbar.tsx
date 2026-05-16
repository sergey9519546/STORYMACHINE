import React from "react";
import { BookOpen, Settings2, Layers, Download, Loader2 } from "lucide-react";

interface ToolbarProps {
  isSaving: boolean;
  isAnalyzing: boolean;
  showDirectorHUD: boolean;
  directorsLayer: boolean;
  wordCount: number;
  onToggleHUD: () => void;
  onToggleDirectorsLayer: () => void;
  onExportFountain: () => void;
  onOpenStoryMachine?: () => void;
}

export default function Toolbar({
  isSaving,
  isAnalyzing,
  showDirectorHUD,
  directorsLayer,
  wordCount,
  onToggleHUD,
  onToggleDirectorsLayer,
  onExportFountain,
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
          onClick={onExportFountain}
          aria-label="Export script as Fountain file"
          className="bg-white text-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors brutal-border flex items-center gap-2"
        >
          <Download className="w-3 h-3" aria-hidden="true" /> Export .Fountain
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
