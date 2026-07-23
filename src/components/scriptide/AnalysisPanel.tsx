import React, { useMemo } from "react";
import { EngineState } from "../../types";
import { FountainBlock } from "../../lib/fountain";
import {
  Loader2,
  ShieldAlert,
  Settings2,
  Activity,
} from "lucide-react";

interface AnalysisPanelProps {
  engineState: EngineState;
  scriptText: string;
  parsedBlocks: FountainBlock[];
  isCleaning: number | null;
  onCleanAction: (index: number, text: string) => void;
}

export default function AnalysisPanel({
  engineState,
  scriptText,
  parsedBlocks,
  isCleaning,
  onCleanAction,
}: AnalysisPanelProps) {
  const lintedBlocks = useMemo(() => {
    return parsedBlocks
      .map((b, i) => ({ ...b, index: i }))
      .filter((b) => b.lintErrors && b.lintErrors.length > 0);
  }, [parsedBlocks]);

  return (
    <div
      className="space-y-6"
      aria-busy={engineState.isAnalyzing ? "true" : "false"}
    >
      {/* SEMANTIC FIREWALL */}
      <div className="bg-white border-4 border-black p-4 shadow-[var(--sm-shadow)]">
        <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2 text-red-600">
          <ShieldAlert className="w-4 h-4" /> Semantic Firewall
        </h2>
        {lintedBlocks.length === 0 ? (
          <p className="text-[10px] font-mono text-green-600 uppercase font-bold">
            No camera bleed detected. Action is pure.
          </p>
        ) : (
          <div className="space-y-4">
              {lintedBlocks.map((block) => (
                <div
                  key={block.id}
                  className="bg-red-50 border-2 border-red-200 p-3"
                >
                  <p className="text-[10px] font-bold text-red-600 uppercase mb-2">
                    {block.lintErrors?.join(", ")}
                  </p>
                  <p className="text-xs font-mono mb-3 text-black">
                    {block.text}
                  </p>
                  <button
                    onClick={() => onCleanAction(block.index, block.text)}
                    disabled={isCleaning === block.index}
                    aria-label={`Clean action block with AI — ${block.text.substring(0, 40)}`}
                    className="sm-btn--ink text-[10px] px-3 py-2 uppercase font-bold hover:bg-[var(--sm-stamp)] transition-colors sm-btn disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCleaning === block.index ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />{" "}
                        Purifying...
                      </>
                    ) : (
                      "Clean with AI"
                    )}
                  </button>
                </div>
              ))}
            </div>
        )}
      </div>

      {/* DIALOGUE INCONSISTENCIES */}
      {engineState.currentAnalysis?.dialogueInconsistencies &&
        engineState.currentAnalysis.dialogueInconsistencies.length > 0 && (
          <div className="bg-white border-4 border-black p-4 shadow-[var(--sm-shadow)]">
            <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2 text-yellow-600">
              <ShieldAlert className="w-4 h-4" /> Dialogue Inconsistencies
            </h2>
            <div
              className="space-y-4"
              role="status"
              aria-live="polite"
              aria-label="Dialogue inconsistency results"
            >
              {engineState.currentAnalysis.dialogueInconsistencies.map(
                (inc, i) => (
                  <div
                    key={i}
                    className="bg-yellow-50 border-2 border-yellow-200 p-3"
                  >
                    <p className="text-[10px] font-bold text-yellow-600 uppercase mb-2">
                      {inc.character}
                    </p>
                    <p className="text-xs font-mono mb-2 text-black italic">
                      &ldquo;{inc.dialogueText}&rdquo;
                    </p>
                    <p className="text-[10px] font-bold text-black mb-1">
                      Issue: {inc.issue}
                    </p>
                    <p className="text-[10px] font-bold text-red-600">
                      Suggestion: {inc.suggestion}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {/* DIRECTOR ANALYSIS */}
      <div className="bg-white border-4 border-black p-4 shadow-[var(--sm-shadow)]">
        <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Director Analysis
        </h2>
        <div
          className="space-y-4 font-mono text-sm"
          role="status"
          aria-live="polite"
          aria-label="Director analysis results"
        >
          <div>
            <div className="flex justify-between mb-1 uppercase text-xs font-bold">
              <span>Menace Gauge</span>
              <span>{engineState.directorState.menaceGauge}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2 border border-black">
              <div
                className="bg-red-600 h-full transition-all duration-500"
                style={{ width: `${engineState.directorState.menaceGauge}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 uppercase text-xs font-bold">
              <span>Tension Level</span>
              <span>{engineState.directorState.tensionLevel}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2 border border-black">
              <div
                className="bg-black h-full transition-all duration-500"
                style={{ width: `${engineState.directorState.tensionLevel}%` }}
              />
            </div>
          </div>

          {engineState.currentAnalysis?.commentary && (
            <div className="mt-4 p-3 bg-gray-100 border-l-4 border-black text-xs leading-relaxed">
              <p className="font-bold uppercase mb-1">Director&apos;s Notes:</p>
              <p>{engineState.currentAnalysis.commentary.tensionRationale}</p>
            </div>
          )}
        </div>
      </div>

      {/* NARRATIVE METRICS */}
      {engineState.currentAnalysis?.metrics && (
        <div className="bg-white border-4 border-black p-4 shadow-[var(--sm-shadow)]">
          <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Narrative Metrics
          </h2>
          <div
            className="grid grid-cols-2 gap-4 font-mono text-[10px] uppercase"
            role="status"
            aria-live="polite"
            aria-label="Narrative metrics results"
          >
            <div className="p-2 bg-gray-50 border border-black">
              <span className="font-bold block mb-1">Pivot Strength</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 border border-black">
                  <div
                    className="h-full bg-blue-600"
                    style={{
                      width: `${engineState.currentAnalysis.metrics.pivotStrength * 100}%`,
                    }}
                  />
                </div>
                <span>
                  {(
                    engineState.currentAnalysis.metrics.pivotStrength * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-black">
              <span className="font-bold block mb-1">Twist Impact</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 border border-black">
                  <div
                    className="h-full bg-purple-600"
                    style={{
                      width: `${engineState.currentAnalysis.metrics.twistImpact * 100}%`,
                    }}
                  />
                </div>
                <span>
                  {(
                    engineState.currentAnalysis.metrics.twistImpact * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-black">
              <span className="font-bold block mb-1">Surprise</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 border border-black">
                  <div
                    className="h-full bg-yellow-600"
                    style={{
                      width: `${engineState.currentAnalysis.metrics.surprise * 100}%`,
                    }}
                  />
                </div>
                <span>
                  {(
                    engineState.currentAnalysis.metrics.surprise * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
            </div>
            <div className="p-2 bg-gray-50 border border-black">
              <span className="font-bold block mb-1">Suspense</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 border border-black">
                  <div
                    className="h-full bg-red-600"
                    style={{
                      width: `${engineState.currentAnalysis.metrics.suspense * 100}%`,
                    }}
                  />
                </div>
                <span>
                  {(
                    engineState.currentAnalysis.metrics.suspense * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THROUGHLINES */}
      <div className="bg-white border-4 border-black p-4 shadow-[var(--sm-shadow)]">
        <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Narrative Throughlines
        </h2>
        <div
          className="space-y-3 font-mono text-[10px] uppercase"
          role="status"
          aria-live="polite"
          aria-label="Narrative throughlines"
        >
          <div className="p-2 bg-gray-50 border border-black">
            <span className="font-bold block mb-1 text-red-600">
              Objective Story:
            </span>
            {engineState.directorState.throughlines.objectiveStory}
          </div>
          <div className="p-2 bg-gray-50 border border-black">
            <span className="font-bold block mb-1 text-blue-600">
              Main Character:
            </span>
            {engineState.directorState.throughlines.mainCharacter}
          </div>
          <div className="p-2 bg-gray-50 border border-black">
            <span className="font-bold block mb-1 text-green-600">
              Influence Character:
            </span>
            {engineState.directorState.throughlines.influenceCharacter}
          </div>
          <div className="p-2 bg-gray-50 border border-black">
            <span className="font-bold block mb-1 text-purple-600">
              Relationship Story:
            </span>
            {engineState.directorState.throughlines.relationshipStory}
          </div>
        </div>
      </div>
    </div>
  );
}
