/**
 * Coverage summary — primary Coverage-mode surface.
 * Progressive depth: summary first; full Script Doctor is one click deeper.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Stethoscope, X, ArrowRight } from "lucide-react";
import type { ScriptDoctorReport } from "../../../server/nvm/analyze/types.ts";
import { title as sampleScriptTitle, fountain as sampleScriptFountain } from "../../lib/sample-script.ts";

interface CoverageSummaryProps {
  fountain: string;
  title?: string;
  /** When true, run once against the built-in sample (Start → sample handoff). */
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

  // Auto-run on open / sample handoff
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
    // Intentionally once per mount / when autoLoadSample flips — re-run via button.
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
      className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[420px] flex-col border-l-4 border-black bg-[#f4f0e6] text-black shadow-[-6px_0_0_rgba(33,29,21,0.12)] sm:w-[400px]"
      role="region"
      aria-labelledby="coverage-summary-title"
    >
      <div className="flex items-center gap-3 border-b-4 border-black bg-black px-4 py-3 text-white">
        <Stethoscope className="h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="coverage-summary-title" className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
            Coverage
          </h2>
          <p className="truncate font-mono text-[10px] uppercase tracking-widest text-white/50">
            {usingSample ? "Sample" : title || "Draft"} · next fix
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={status === "loading"}
          aria-label="Re-run coverage"
          className="border border-white/30 p-2 hover:border-white disabled:opacity-40"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close coverage"
          className="border border-white/30 p-2 hover:border-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {status === "loading" && (
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-black/60">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Reading the draft…
          </div>
        )}

        {status === "error" && (
          <div className="border-2 border-[#c1301c] bg-white p-4" role="alert">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#c1301c]" aria-hidden="true" />
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider">Coverage failed</p>
                <p className="mt-1 text-sm text-black/70">{error}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void run()}
                    className="border border-black bg-black px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white"
                  >
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
                    className="border border-black px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-black hover:text-white"
                  >
                    Use sample
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === "success" && report && (
          <div className="space-y-5">
            {/* Primary object */}
            <div className="border-2 border-black bg-white p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/45">Verdict</p>
                  <p className="mt-2 inline-block rotate-[-3deg] border-2 border-[#c1301c] px-3 py-1 font-mono text-sm font-bold uppercase tracking-[0.16em] text-[#c1301c]">
                    {verdictLabel(report.verdict)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/45">Health</p>
                  <p className="font-display text-5xl leading-none">{Math.round(report.health)}</p>
                </div>
              </div>
              {report.plainSummary && (
                <p className="mt-4 text-sm leading-snug text-black/70">{report.plainSummary}</p>
              )}
            </div>

            {/* Supporting counts */}
            <dl className="grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-wider">
              <div className="border border-black/15 bg-white p-3">
                <dt className="text-black/45">Critical</dt>
                <dd className="mt-1 text-lg font-bold text-[#c1301c]">{report.bySeverity.critical}</dd>
              </div>
              <div className="border border-black/15 bg-white p-3">
                <dt className="text-black/45">Major</dt>
                <dd className="mt-1 text-lg font-bold">{report.bySeverity.major}</dd>
              </div>
              <div className="border border-black/15 bg-white p-3">
                <dt className="text-black/45">Minor</dt>
                <dd className="mt-1 text-lg font-bold text-black/60">{report.bySeverity.minor}</dd>
              </div>
            </dl>

            {/* Next decision */}
            <div className="border-2 border-black bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/45">
                What next
              </p>
              <p className="mt-2 text-sm font-medium leading-snug text-black">
                {nextLabel}
              </p>
              {top?.location && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-black/45">
                  {top.location}
                  {top.severity ? ` · ${top.severity}` : ""}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {jumpLine != null && onJumpToLine && (
                  <button
                    type="button"
                    onClick={() => onJumpToLine(jumpLine)}
                    className="inline-flex items-center gap-1.5 border border-black bg-black px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#c1301c]"
                  >
                    Jump to line {jumpLine}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenFullReport}
                  className="border border-black px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-black hover:text-white"
                >
                  Full report
                </button>
              </div>
            </div>

            {report.strengths && report.strengths.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/45">
                  Working
                </p>
                <ul className="mt-2 space-y-1.5">
                  {report.strengths.slice(0, 3).map((s) => (
                    <li key={s} className="border-l-2 border-black/20 pl-3 text-sm text-black/70">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {status === "idle" && !report && (
          <button
            type="button"
            onClick={() => void run()}
            className="w-full border-2 border-black bg-black py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-white"
          >
            Run coverage
          </button>
        )}
      </div>
    </aside>
  );
}
