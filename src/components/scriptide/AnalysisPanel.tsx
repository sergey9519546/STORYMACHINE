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

  // a11y pass (2026-09-04): this panel carried ZERO dark: variants — raw
  // bg-white/border-black/text-black everywhere, plus a few color pairs that
  // were failing WCAG even in light mode. Fixed by moving every structural
  // color to the design system's own paper/ink tokens (bg-[var(--sm-panel)],
  // border/text-[var(--sm-ink)], bg-[var(--sm-panel-2)] for nested "inset"
  // boxes, text-[var(--sm-ink-faint/-mute)] for captions) instead of adding
  // dark: pairs: body itself (src/index.css) and every sibling card in this
  // same sidebar (ScriptIDE.tsx's AUDIO PRODUCTION/Codex cards) already use
  // bg-[var(--sm-panel)] with NO dark override anywhere in the codebase —
  // this app's "paper" surfaces are theme-invariant by design, so a token
  // swap here gives correct contrast in both themes with no new dark:
  // classes needed (verified: sm-ink/sm-*-on-light all clear 4.5:1 against
  // both --sm-panel and --sm-panel-2; see the session report for the full
  // contrast table). The two colored alert cards (lint errors, dialogue
  // inconsistencies) DO get a real dark:bg-*-900/10 / dark:border-*-800 pair
  // — matching ScriptDoctorPanel's established idiom for alert cards nested
  // in this same invariant chrome — even though the blend stays light
  // enough that the same on-light text token still passes in the toggled
  // state too (no dark: text pair needed, verified 4.80-4.81:1).
  //
  // Also fixed in the same pass: text-red-600/green-600/yellow-600/
  // blue-600/purple-600 as TEXT were failing 4.5:1 on this app's paper tones
  // even in light mode (2.41-4.41:1) — a pre-existing bug, not something the
  // dark toggle caused. Swapped for the darker on-light-safe equivalents
  // (--sm-stamp/-ok/-warn-on-light, --sm-cool, purple-700) and, for the
  // Surprise meter's fill bar (a value indicator, not text — 3:1 minimum),
  // yellow-700.
  return (
    <div
      className="space-y-6"
      aria-busy={engineState.isAnalyzing ? "true" : "false"}
    >
      {/* SEMANTIC FIREWALL */}
      <div className="bg-[var(--sm-panel)] border-4 border-[var(--sm-ink)] p-4 shadow-[var(--sm-shadow)]">
        <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-[var(--sm-ink)] pb-2 flex items-center gap-2 text-[var(--sm-stamp-on-light)]">
          <ShieldAlert className="w-4 h-4" /> Semantic Firewall
        </h2>
        {lintedBlocks.length === 0 ? (
          <p className="text-[10px] font-mono text-[var(--sm-ok-on-light)] uppercase font-bold">
            No camera bleed detected. Action is pure.
          </p>
        ) : (
          <div className="space-y-4">
              {lintedBlocks.map((block) => (
                <div
                  key={block.id}
                  className="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800 p-3"
                >
                  <p className="text-[10px] font-bold text-[var(--sm-stamp-on-light)] uppercase mb-2">
                    {block.lintErrors?.join(", ")}
                  </p>
                  <p className="text-xs font-mono mb-3 text-[var(--sm-ink)]">
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
          <div className="bg-[var(--sm-panel)] border-4 border-[var(--sm-ink)] p-4 shadow-[var(--sm-shadow)]">
            <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-[var(--sm-ink)] pb-2 flex items-center gap-2 text-[var(--sm-warn-on-light)]">
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
                    className="bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-200 dark:border-yellow-800 p-3"
                  >
                    <p className="text-[10px] font-bold text-[var(--sm-warn-on-light)] uppercase mb-2">
                      {inc.character}
                    </p>
                    <p className="text-xs font-mono mb-2 text-[var(--sm-ink)] italic">
                      &ldquo;{inc.dialogueText}&rdquo;
                    </p>
                    <p className="text-[10px] font-bold text-[var(--sm-ink)] mb-1">
                      Issue: {inc.issue}
                    </p>
                    <p className="text-[10px] font-bold text-[var(--sm-stamp-on-light)]">
                      Suggestion: {inc.suggestion}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {/* DIRECTOR ANALYSIS */}
      <div className="bg-[var(--sm-panel)] border-4 border-[var(--sm-ink)] p-4 shadow-[var(--sm-shadow)]">
        <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-[var(--sm-ink)] pb-2 flex items-center gap-2">
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
            <div className="w-full bg-[var(--sm-panel-2)] h-2 border border-[var(--sm-ink)]">
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
            <div className="w-full bg-[var(--sm-panel-2)] h-2 border border-[var(--sm-ink)]">
              <div
                className="bg-[var(--sm-ink)] h-full transition-all duration-500"
                style={{ width: `${engineState.directorState.tensionLevel}%` }}
              />
            </div>
          </div>

          {engineState.currentAnalysis?.commentary && (
            <div className="mt-4 p-3 bg-[var(--sm-panel-2)] border-l-4 border-[var(--sm-ink)] text-[var(--sm-ink)] text-xs leading-relaxed">
              <p className="font-bold uppercase mb-1">Director&apos;s Notes:</p>
              <p>{engineState.currentAnalysis.commentary.tensionRationale}</p>
            </div>
          )}
        </div>
      </div>

      {/* NARRATIVE METRICS */}
      {engineState.currentAnalysis?.metrics && (
        <div className="bg-[var(--sm-panel)] border-4 border-[var(--sm-ink)] p-4 shadow-[var(--sm-shadow)]">
          <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-[var(--sm-ink)] pb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Narrative Metrics
          </h2>
          <div
            className="grid grid-cols-2 gap-4 font-mono text-[10px] uppercase text-[var(--sm-ink)]"
            role="status"
            aria-live="polite"
            aria-label="Narrative metrics results"
          >
            <div className="p-2 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
              <span className="font-bold block mb-1">Pivot Strength</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
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
            <div className="p-2 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
              <span className="font-bold block mb-1">Twist Impact</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
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
            <div className="p-2 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
              <span className="font-bold block mb-1">Surprise</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
                  <div
                    className="h-full bg-yellow-700"
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
            <div className="p-2 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
              <span className="font-bold block mb-1">Suspense</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
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
      <div className="bg-[var(--sm-panel)] border-4 border-[var(--sm-ink)] p-4 shadow-[var(--sm-shadow)]">
        <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-[var(--sm-ink)] pb-2 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Narrative Throughlines
        </h2>
        <div
          className="space-y-3 font-mono text-[10px] uppercase text-[var(--sm-ink)]"
          role="status"
          aria-live="polite"
          aria-label="Narrative throughlines"
        >
          <div className="p-2 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
            <span className="font-bold block mb-1 text-[var(--sm-stamp-on-light)]">
              Objective Story:
            </span>
            {engineState.directorState.throughlines.objectiveStory}
          </div>
          <div className="p-2 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
            <span className="font-bold block mb-1 text-[var(--sm-cool)]">
              Main Character:
            </span>
            {engineState.directorState.throughlines.mainCharacter}
          </div>
          <div className="p-2 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
            <span className="font-bold block mb-1 text-[var(--sm-ok-on-light)]">
              Influence Character:
            </span>
            {engineState.directorState.throughlines.influenceCharacter}
          </div>
          <div className="p-2 bg-[var(--sm-panel-2)] border border-[var(--sm-ink)]">
            <span className="font-bold block mb-1 text-purple-700">
              Relationship Story:
            </span>
            {engineState.directorState.throughlines.relationshipStory}
          </div>
        </div>
      </div>
    </div>
  );
}
