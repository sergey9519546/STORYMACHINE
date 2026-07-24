/**
 * Coverage summary — primary Coverage-mode surface (paper·ink·stamp).
 * Progressive depth: summary first; full Script Doctor is one click deeper.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Stethoscope, X, ArrowRight } from "lucide-react";
import type { ScriptDoctorReport } from "../../../server/nvm/analyze/types.ts";
import { title as sampleScriptTitle, fountain as sampleScriptFountain } from "../../lib/sample-script.ts";

interface CoverageSummaryProps {
  fountain: string;
  title?: string;
  autoLoadSample?: boolean;
  onOpenFullReport: () => void;
  onJumpToLine?: (line1Based: number) => void;
  onLoadSampleIntoEditor?: (text: string) => void;
  onClose: () => void;
  onFreshReport?: () => void;
}

type Status = "idle" | "loading" | "success" | "error";

function verdictLabel(v?: string): string {
  if (!v) return "—";
  return v.charAt(0) + v.slice(1).toLowerCase();
}

export default function CoverageSummary({
  fountain,
  title,
  autoLoadSample = false,
  onOpenFullReport,
  onJumpToLine,
  onLoadSampleIntoEditor,
  onClose,
  onFreshReport,
}: CoverageSummaryProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ScriptDoctorReport | null>(null);
  const [usingSample, setUsingSample] = useState(false);
  const genRef = useRef(0);
  const sampleFired = useRef(false);

  const run = useCallback(
    async (override?: { fountain: string; title: string; sample?: boolean }) => {
      const text = (override?.fountain ?? fountain).trim();
      if (!text) {
        setStatus("error");
        setError("Empty draft — type a scene or load the sample.");
        setReport(null);
        return;
      }
      const gen = ++genRef.current;
      setStatus("loading");
      setError(null);
      try {
        const res = await fetch("/api/scriptide/doctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fountain: override?.fountain ?? fountain,
            title: override?.title ?? title ?? "Untitled",
          }),
        });
        if (gen !== genRef.current) return;
        if (res.status === 404) {
          setStatus("error");
          setError("Coverage route not available.");
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setStatus("error");
          setError(body.error ?? `Coverage failed (${res.status})`);
          return;
        }
        const data = (await res.json()) as ScriptDoctorReport;
        if (gen !== genRef.current) return;
        setReport(data);
        setUsingSample(!!override?.sample);
        setStatus("success");
        onFreshReport?.();
        if (override?.sample && onLoadSampleIntoEditor) {
          onLoadSampleIntoEditor(override.fountain);
        }
      } catch (e) {
        if (gen !== genRef.current) return;
        setStatus("error");
        setError((e as Error).message || "Coverage failed.");
      }
    },
    [fountain, title, onFreshReport, onLoadSampleIntoEditor],
  );

  useEffect(() => {
    if (autoLoadSample && !sampleFired.current) {
      sampleFired.current = true;
      void run({
        fountain: sampleScriptFountain,
        title: sampleScriptTitle,
        sample: true,
      });
      return;
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadSample]);

  const top = report?.topPriorities?.[0];
  const root = report?.rootCauses?.[0];
  const jumpLine =
    root?.startLine ??
    (typeof top?.location === "string"
      ? (() => {
          const m = top.location.match(/Lines?\s+(\d+)/i) || top.location.match(/Line\s+(\d+)/i);
          return m ? Number(m[1]) : undefined;
        })()
      : undefined);

  const nextLabel =
    top?.description?.slice(0, 140) ||
    root?.title ||
    root?.explanation?.slice(0, 140) ||
    (report && report.totalIssues === 0 ? "No blocking issues" : "Open full report");

  return (
    <aside
      className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[400px] flex-col border-l-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-panel)] text-[var(--sm-ink)] sm:w-[380px]"
      style={{ boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.6), -24px 0 48px -20px rgba(33,29,21,0.25)' }}
      role="region"
      aria-labelledby="coverage-summary-title"
    >
      <div className="sm-pagetop shrink-0">
        <Stethoscope className="h-4 w-4 shrink-0 text-[var(--sm-cream)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="coverage-summary-title" className="sm-title text-[var(--sm-cream)]">
            Coverage
          </h2>
          <p className="truncate font-[family-name:var(--sm-font-mono)] text-[9px] uppercase tracking-[0.14em] text-[var(--sm-cream)]/45">
            {usingSample ? "Sample" : title || "Draft"} · next fix
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={status === "loading"}
          aria-label="Re-run coverage"
          className="border border-[var(--sm-cream)]/25 p-2 text-[var(--sm-cream)] hover:border-[var(--sm-cream)] disabled:opacity-40"
        >
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close coverage"
          className="border border-[var(--sm-cream)]/25 p-2 text-[var(--sm-cream)] hover:border-[var(--sm-cream)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="sm-panel-body flex-1 overflow-y-auto">
        {status === "loading" && (
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--sm-ink-mute)]" aria-hidden="true" />
            <span className="sm-slug">Reading the draft…</span>
          </div>
        )}

        {status === "error" && (
          <div className="sm-card border-[var(--sm-stamp)]" role="alert">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sm-stamp)]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="sm-title">Coverage failed</p>
                <p className="sm-sub mt-1">{error}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void run()} className="sm-btn sm-btn--ink">
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void run({
                        fountain: sampleScriptFountain,
                        title: sampleScriptTitle,
                        sample: true,
                      })
                    }
                    className="sm-btn"
                  >
                    Use sample
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === "success" && report && (
          report.analysisComplete === false ? (
            /* P0.3 / G0-05: one or more diagnostic passes failed. Health/grade
               sentinels (0 / troubled) are NOT real scores and must not be
               shown as if they were — mirror ScriptDoctorPanel's withheld read. */
            <div className="sm-card border-[var(--sm-ink)] bg-[var(--sm-panel)]">
              <p className="sm-h text-[var(--sm-stamp)]">Analysis incomplete</p>
              <p className="mt-2 font-[family-name:var(--sm-font-display)] text-2xl uppercase leading-none text-[var(--sm-ink)]">
                Score withheld
              </p>
              <p className="mt-3 text-sm leading-snug text-[var(--sm-ink-soft)]">
                {report.plainSummary ||
                  "One or more diagnostic passes failed. Health, verdict, and percentiles are withheld because the issue count may be artificially low."}
              </p>
              {Array.isArray(report.failedPasses) && report.failedPasses.length > 0 && (
                <p className="sm-slug mt-3">Failed passes: {report.failedPasses.join(", ")}</p>
              )}
              <p className="sm-slug mt-2">
                {report.sceneCount} scene{report.sceneCount === 1 ? "" : "s"} ·{" "}
                {report.wordCount.toLocaleString()} words · {report.totalIssues} issue
                {report.totalIssues === 1 ? "" : "s"} observed before failure
              </p>
              <div className="mt-4">
                <button type="button" onClick={onOpenFullReport} className="sm-btn">
                  Full report
                </button>
              </div>
            </div>
          ) : (
          <>
            <div className="sm-card border-[var(--sm-ink)] bg-[var(--sm-panel)]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="sm-h">Verdict</p>
                  <p className="sm-stamp mt-2 text-[13px]">{verdictLabel(report.verdict)}</p>
                </div>
                <div className="text-right">
                  <p className="sm-h">Health</p>
                  <p className="font-[family-name:var(--sm-font-display)] text-5xl leading-none text-[var(--sm-ink)]">
                    {Math.round(report.health)}
                  </p>
                </div>
              </div>
              {report.plainSummary && (
                <p className="mt-4 text-sm leading-snug text-[var(--sm-ink-soft)]">{report.plainSummary}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="sm-card py-3 text-center">
                <p className="sm-h">Critical</p>
                <p className="mt-1 font-[family-name:var(--sm-font-mono)] text-lg font-bold text-[var(--sm-stamp)]">
                  {report.bySeverity.critical}
                </p>
              </div>
              <div className="sm-card py-3 text-center">
                <p className="sm-h">Major</p>
                <p className="mt-1 font-[family-name:var(--sm-font-mono)] text-lg font-bold text-[var(--sm-ink)]">
                  {report.bySeverity.major}
                </p>
              </div>
              <div className="sm-card py-3 text-center">
                <p className="sm-h">Minor</p>
                <p className="mt-1 font-[family-name:var(--sm-font-mono)] text-lg font-bold text-[var(--sm-ink-mute)]">
                  {report.bySeverity.minor}
                </p>
              </div>
            </div>

            <div className="sm-card sm-card--sel">
              <p className="sm-h">What next</p>
              <p className="mt-2 text-sm font-medium leading-snug text-[var(--sm-ink)]">{nextLabel}</p>
              {top?.location && (
                <p className="sm-slug mt-1.5">
                  {top.location}
                  {top.severity ? ` · ${top.severity}` : ""}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {jumpLine != null && onJumpToLine && (
                  <button
                    type="button"
                    onClick={() => onJumpToLine(jumpLine)}
                    className="sm-btn sm-btn--stamp"
                  >
                    Jump to line {jumpLine}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
                <button type="button" onClick={onOpenFullReport} className="sm-btn">
                  Full report
                </button>
              </div>
            </div>

            {report.strengths && report.strengths.length > 0 && (
              <div>
                <p className="sm-h">Working</p>
                <ul className="mt-2 space-y-1.5">
                  {report.strengths.slice(0, 3).map((s) => (
                    <li
                      key={s}
                      className="border-l-[3px] border-[var(--sm-ok)] pl-3 text-sm text-[var(--sm-ink-soft)]"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
          )
        )}

        {status === "idle" && !report && (
          <button type="button" onClick={() => void run()} className="sm-btn sm-btn--ink w-full">
            Run coverage
          </button>
        )}
      </div>
    </aside>
  );
}
