import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Stethoscope,
  X,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
} from "lucide-react";
import type {
  ScriptDoctorReport,
  DoctorGrade,
  SceneDiagnostics,
} from "../../../server/nvm/analyze/types.ts";
import type {
  RevisionIssue,
  PassName,
} from "../../../server/nvm/revision/passes/types.ts";

// ─── Props ───────────────────────────────────────────────────────────────────

interface ScriptDoctorPanelProps {
  /** Current Fountain text from the editor — sent verbatim to POST /api/scriptide/doctor. */
  fountain: string;
  /** Optional script title, forwarded to the backend for report labeling. */
  title?: string;
  onClose: () => void;
}

type Status = "idle" | "loading" | "success" | "error";

// ─── Presentation tables ─────────────────────────────────────────────────────
// health ≥ 90 excellent · ≥ 75 strong · ≥ 55 solid · ≥ 35 uneven · else troubled
// (thresholds owned by the backend contract — this table is display-only.)
const GRADE_META: Record<DoctorGrade, { label: string; text: string; ring: string }> = {
  excellent: { label: "Excellent", text: "text-green-600", ring: "border-green-600" },
  strong: { label: "Strong", text: "text-green-600", ring: "border-green-600" },
  solid: { label: "Solid", text: "text-amber-500", ring: "border-amber-500" },
  uneven: { label: "Uneven", text: "text-red-500", ring: "border-red-500" },
  troubled: { label: "Troubled", text: "text-red-700", ring: "border-red-700" },
};

const SEVERITY_META: Record<
  RevisionIssue["severity"],
  { label: string; badge: string; icon: typeof AlertTriangle }
> = {
  critical: { label: "Critical", badge: "bg-red-600 text-white", icon: AlertTriangle },
  major: { label: "Major", badge: "bg-amber-500 text-black", icon: AlertCircle },
  minor: { label: "Minor", badge: "bg-zinc-400 text-black", icon: Info },
};

function formatPassName(pass: PassName): string {
  return pass
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Heatmap cell color by issue density — critical presence always wins regardless
 *  of total count, so a single critical issue reads as urgent even in a light scene. */
function heatmapClass(scene: SceneDiagnostics): string {
  if (scene.critical > 0) return "bg-red-600";
  if (scene.issueCount === 0) return "bg-zinc-100 dark:bg-zinc-700";
  if (scene.issueCount <= 2) return "bg-yellow-300";
  if (scene.issueCount <= 4) return "bg-orange-400";
  return "bg-red-500";
}

// ─── Small presentational pieces ─────────────────────────────────────────────

function SeverityChip({
  severity,
  count,
}: {
  severity: RevisionIssue["severity"];
  count: number;
}) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.badge}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" /> {count} {meta.label}
    </span>
  );
}

function IssueCard({ issue, pass }: { issue: RevisionIssue; pass?: PassName }) {
  const meta = SEVERITY_META[issue.severity];
  return (
    <div className="bg-gray-50 dark:bg-zinc-800 border-2 border-black/10 dark:border-white/10 p-3">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span
          className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.badge}`}
        >
          {meta.label}
        </span>
        {pass && (
          <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {formatPassName(pass)}
          </span>
        )}
        <span className="text-[10px] font-mono text-gray-600 dark:text-gray-300 ml-auto">
          {issue.location}
        </span>
      </div>
      <p className="text-[10px] font-bold uppercase text-black dark:text-white mb-1">
        {issue.rule}
      </p>
      <p className="text-xs font-mono leading-relaxed text-black dark:text-gray-100">
        {issue.description}
      </p>
      {issue.suggestedFix && (
        <p className="text-[10px] font-mono text-green-700 dark:text-green-400 mt-2 pl-2 border-l-2 border-green-500">
          Fix: {issue.suggestedFix}
        </p>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScriptDoctorPanel({
  fountain,
  title,
  onClose,
}: ScriptDoctorPanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [report, setReport] = useState<ScriptDoctorReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Per-pass collapse overrides; a pass with no override defaults to
  // "open iff it found issues" (collapsed-by-default when 0 issues).
  const [openPasses, setOpenPasses] = useState<Partial<Record<PassName, boolean>>>({});

  const abortRef = useRef<AbortController | null>(null);
  // Bumped on every run so a stale (aborted/superseded) response can never
  // clobber the state of a newer run — same guard pattern as
  // ScriptIDE.triggerAnalysis's analysisGenerationRef.
  const generationRef = useRef(0);

  const isEmpty = !fountain || fountain.trim().length === 0;

  const runDiagnosis = () => {
    if (isEmpty) return;

    // Cancel any in-flight diagnosis so its response can't land after a newer one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const myGeneration = ++generationRef.current;

    // 14 LLM-backed passes over a full script can run long — generous timeout,
    // scaled up from the 60s single-scene-analysis pattern in services/director.ts.
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    setStatus("loading");
    setErrorMessage(null);

    fetch("/api/scriptide/doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fountain, title }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          const fallback =
            res.status === 404
              ? "Script Doctor isn't live yet — the /api/scriptide/doctor route hasn't been deployed."
              : `Diagnosis failed (${res.status})`;
          throw new Error(body?.error ?? fallback);
        }
        return (await res.json()) as ScriptDoctorReport;
      })
      .then((data) => {
        if (myGeneration !== generationRef.current) return; // superseded by a newer run
        setReport(data);
        setOpenPasses({});
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (myGeneration !== generationRef.current) return; // superseded — ignore
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("error");
          setErrorMessage("Diagnosis timed out (120s) or was cancelled — try again.");
          return;
        }
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Diagnosis failed");
      })
      .finally(() => clearTimeout(timeoutId));
  };

  // Abort any in-flight request when the panel unmounts (e.g. user closes it).
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Escape closes the panel, matching DirectorPanel's overlay convention.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const togglePass = (pass: PassName, currentlyOpen: boolean) => {
    setOpenPasses((prev) => ({ ...prev, [pass]: !currentlyOpen }));
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="script-doctor-title"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 w-[640px] max-w-[94vw] h-screen bg-white dark:bg-zinc-900 dark:text-white brutal-border-thick text-black p-0 overflow-y-auto z-50 brutal-shadow flex flex-col"
    >
      {/* Chrome header */}
      <div className="flex items-center gap-3 p-6 pb-4 border-b-[8px] border-black shrink-0">
        <Stethoscope className="w-8 h-8 shrink-0" aria-hidden="true" />
        <h2
          id="script-doctor-title"
          className="text-2xl font-display uppercase tracking-widest flex-1"
        >
          Script Doctor
        </h2>
        {status === "success" && (
          <button
            onClick={runDiagnosis}
            disabled={isEmpty}
            aria-label="Re-run diagnosis"
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest brutal-border bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Re-run
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close Script Doctor panel"
          className="p-2 brutal-border hover:bg-black hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-6 font-mono text-sm">
        {/* ── Idle state ── */}
        {status === "idle" &&
          (isEmpty ? (
            <div className="p-8 text-center border-4 border-dashed border-gray-300 dark:border-zinc-600 text-gray-400">
              <p className="text-xs uppercase tracking-widest">
                Write some script content before running a diagnosis.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                Script Doctor runs the full 14-pass narrative revision engine in
                diagnose-only mode — dialogue, structure, character arcs, conflict,
                pacing, theme, voice, and more — and returns a health score, a
                scene-by-scene issue heatmap, and your top priority fixes.
              </p>
              <button
                onClick={runDiagnosis}
                className="w-full bg-black text-white px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#FF4444] transition-colors brutal-border flex items-center justify-center gap-2"
              >
                <Stethoscope className="w-4 h-4" aria-hidden="true" /> Run Diagnosis
              </button>
            </div>
          ))}

        {/* ── Loading state ── */}
        {status === "loading" && (
          <div className="p-8 text-center border-4 border-dashed border-gray-300 dark:border-zinc-600">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-500" aria-hidden="true" />
            <p className="text-xs uppercase tracking-widest text-gray-500" role="status" aria-live="polite">
              Running 14 passes&hellip;
            </p>
            <button
              disabled
              className="mt-4 w-full bg-gray-300 text-gray-600 px-4 py-3 text-xs font-bold uppercase tracking-widest brutal-border cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Diagnosing&hellip;
            </button>
          </div>
        )}

        {/* ── Error state ── */}
        {status === "error" && (
          <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 p-4 space-y-3">
            <p className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" aria-hidden="true" /> Diagnosis failed
            </p>
            <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">{errorMessage}</p>
            <button
              onClick={runDiagnosis}
              disabled={isEmpty}
              className="bg-black text-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors brutal-border disabled:opacity-40 flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Retry
            </button>
          </div>
        )}

        {/* ── Success state ── */}
        {status === "success" && report && (
          <div className="space-y-6">
            {/* Report header: health score, grade, counts, severity chips */}
            <div className="bg-black text-white p-4 brutal-border-thick">
              <div className="flex items-center gap-4">
                <div className={`text-5xl font-bold ${GRADE_META[report.grade].text}`}>
                  {Math.round(report.health)}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-bold uppercase tracking-widest ${GRADE_META[report.grade].text}`}
                  >
                    {GRADE_META[report.grade].label}
                  </div>
                  <div className="text-[10px] font-mono opacity-70 mt-1">
                    {report.sceneCount} scene{report.sceneCount === 1 ? "" : "s"} &middot;{" "}
                    {report.wordCount.toLocaleString()} words &middot; {report.totalIssues} issue
                    {report.totalIssues === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {report.bySeverity.critical > 0 && (
                  <SeverityChip severity="critical" count={report.bySeverity.critical} />
                )}
                {report.bySeverity.major > 0 && (
                  <SeverityChip severity="major" count={report.bySeverity.major} />
                )}
                {report.bySeverity.minor > 0 && (
                  <SeverityChip severity="minor" count={report.bySeverity.minor} />
                )}
                {report.totalIssues === 0 && (
                  <span className="text-[10px] font-mono text-green-400 uppercase font-bold">
                    Zero issues found across all 14 passes.
                  </span>
                )}
              </div>
            </div>

            {/* Scene heatmap */}
            {report.sceneHeatmap.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-500 dark:text-gray-400">
                  Scene Heatmap
                </h3>
                <div className="flex gap-0.5 overflow-x-auto pb-1" role="list" aria-label="Per-scene issue heatmap">
                  {report.sceneHeatmap.map((scene) => (
                    <div
                      key={scene.sceneIdx}
                      role="listitem"
                      title={`${scene.slug} — ${scene.issueCount} issue${
                        scene.issueCount === 1 ? "" : "s"
                      } (${scene.critical} critical, ${scene.major} major, ${scene.minor} minor)`}
                      className={`flex-1 min-w-[10px] h-10 border border-black/20 dark:border-white/20 ${heatmapClass(
                        scene
                      )} ${scene.critical > 0 ? "ring-2 ring-red-800 ring-inset" : ""}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] font-mono text-gray-400 mt-1 uppercase">
                  <span>Scene 1</span>
                  <span>Scene {report.sceneHeatmap.length}</span>
                </div>
              </div>
            )}

            {/* Top priorities */}
            {report.topPriorities.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-500 dark:text-gray-400">
                  Top Priorities
                </h3>
                <div className="space-y-2">
                  {report.topPriorities.map((issue, i) => (
                    <IssueCard key={i} issue={issue} pass={issue.pass} />
                  ))}
                </div>
              </div>
            )}

            {/* Per-pass breakdown — all 14 passes, in pipeline order */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-500 dark:text-gray-400">
                Per-Pass Breakdown
              </h3>
              <div className="space-y-2">
                {report.passes.map((p) => {
                  const isOpen = openPasses[p.pass] ?? p.issues.length > 0;
                  return (
                    <div
                      key={p.pass}
                      className="border-2 border-black dark:border-white/20 bg-white dark:bg-zinc-900"
                    >
                      <button
                        onClick={() => togglePass(p.pass, isOpen)}
                        aria-expanded={isOpen}
                        className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <span className="flex items-center gap-2 font-bold uppercase text-xs tracking-widest">
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          )}
                          {formatPassName(p.pass)}
                        </span>
                        <span className="flex items-center gap-1.5 flex-wrap justify-end">
                          {p.issues.length === 0 ? (
                            <span className="text-[9px] font-mono text-green-600 uppercase font-bold">
                              Clean
                            </span>
                          ) : (
                            <>
                              {p.critical > 0 && <SeverityChip severity="critical" count={p.critical} />}
                              {p.major > 0 && <SeverityChip severity="major" count={p.major} />}
                              {p.minor > 0 && <SeverityChip severity="minor" count={p.minor} />}
                            </>
                          )}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="p-3 pt-0 space-y-2">
                          {p.issues.length === 0 ? (
                            <p className="text-[10px] font-mono text-gray-500 uppercase px-1 pb-2">
                              No issues found by this pass.
                            </p>
                          ) : (
                            p.issues.map((issue, i) => <IssueCard key={i} issue={issue} />)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
