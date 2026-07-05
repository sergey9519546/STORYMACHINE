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
  Upload,
  FileText,
  CheckCircle2,
  ArrowRightLeft,
} from "lucide-react";
import type {
  ScriptDoctorReport,
  DoctorGrade,
  SceneDiagnostics,
  CoverageVerdict,
  DoctorSource,
} from "../../../server/nvm/analyze/types.ts";
import type {
  RevisionIssue,
  PassName,
} from "../../../server/nvm/revision/passes/types.ts";

// ─── Props ───────────────────────────────────────────────────────────────────

interface ScriptDoctorPanelProps {
  /** Current Fountain text from the editor — sent verbatim to POST /api/scriptide/doctor,
   *  unless an uploaded file is active (see uploadedFile state), in which case the
   *  upload supersedes this prop for the purposes of diagnosis. */
  fountain: string;
  /** Optional script title, forwarded to the backend for report labeling. */
  title?: string;
  /** Loads convertedFountain (from an .fdx source report) into the script editor.
   *  Optional so the panel still renders (minus the "load into editor" button)
   *  when a host doesn't wire it up. */
  onLoadFountain?: (text: string) => void;
  onClose: () => void;
}

/** A file read client-side to diagnose instead of the editor's `fountain` prop.
 *  `format` decides which request field (fountain vs fdx) the POST body uses. */
interface UploadedScript {
  name: string;
  content: string;
  format: "fountain" | "fdx";
}

// Matches the request-contract guard on the doctor route: reject oversized
// uploads client-side so we never spend a round-trip proving what we already
// know locally.
const MAX_UPLOAD_CHARS = 900_000;

// DoctorSource per server/nvm/analyze/types.ts doesn't (yet) declare
// `warnings` — the task's request contract mentions fdx-conversion warnings,
// but that field isn't part of the shared contract this wave. Rather than
// edit the shared types.ts (owned by parallel server-agent work), augment
// the shape locally; DoctorSource's fields stay untouched so this is a safe
// narrowing cast, and every access below is optional-chained so it degrades
// to "no warnings" until/unless the field actually ships.
type DoctorSourceWithWarnings = DoctorSource & { warnings?: string[] };

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

// Industry coverage vocabulary (server/nvm/analyze/types.ts CoverageVerdict).
// "Pass" is the one a layperson misreads — coverage readers use it to mean
// "decline," the opposite of a school-test pass, so its explainer says so
// explicitly rather than assuming the word is self-evident.
const VERDICT_META: Record<
  CoverageVerdict,
  { label: string; explainer: string; bg: string; text: string }
> = {
  RECOMMEND: {
    label: "Recommend",
    explainer:
      "Industry-coverage shorthand for “champion this up the chain.” It's the rarest, strongest endorsement a reader gives — this script is ready to move forward.",
    bg: "bg-green-600",
    text: "text-white",
  },
  CONSIDER: {
    label: "Consider",
    explainer:
      "Industry-coverage shorthand for “promising, worth developing further.” Not a yes yet, but the bones are there — worth another pass before it goes further.",
    bg: "bg-amber-500",
    text: "text-black",
  },
  PASS: {
    label: "Pass",
    explainer:
      "In script coverage, “pass” is the industry term for a decline — not a compliment, and not the opposite of “fail.” It means a reader is putting this draft down as-is. The breakdown below shows exactly what to fix.",
    bg: "bg-red-600",
    text: "text-white",
  },
};

/** Same green/amber/red banding the panel already uses for grade and severity,
 *  applied to a 0–100 dimension score: >=75 mirrors excellent/strong (green),
 *  >=55 mirrors solid (amber), below that mirrors uneven/troubled (red). */
function dimensionBand(score: number): { text: string; bar: string } {
  if (score >= 75) return { text: "text-green-600", bar: "bg-green-600" };
  if (score >= 55) return { text: "text-amber-500", bar: "bg-amber-500" };
  return { text: "text-red-600", bar: "bg-red-600" };
}

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
  onLoadFountain,
  onClose,
}: ScriptDoctorPanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [report, setReport] = useState<ScriptDoctorReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Per-pass collapse overrides; a pass with no override defaults to
  // "open iff it found issues" (collapsed-by-default when 0 issues).
  const [openPasses, setOpenPasses] = useState<Partial<Record<PassName, boolean>>>({});

  // A client-read file that supersedes `fountain` for diagnosis purposes.
  // Non-null only while the user is analyzing an upload instead of the
  // editor; clearing it (the chip's ✕) falls back to the editor text.
  const [uploadedFile, setUploadedFile] = useState<UploadedScript | null>(null);
  // Pre-flight upload guard errors (empty file, over the size cap, unreadable)
  // — distinct from `errorMessage`, which is reserved for API/diagnosis
  // failures, so a bad upload never looks like a failed diagnosis run.
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Transient confirmation after "Load converted Fountain into editor".
  const [loadedNotice, setLoadedNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadedNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every run so a stale (aborted/superseded) response can never
  // clobber the state of a newer run — same guard pattern as
  // ScriptIDE.triggerAnalysis's analysisGenerationRef.
  const generationRef = useRef(0);

  // The uploaded file's content, once present, IS the thing being diagnosed —
  // upload guards already reject empty files, so `fountain` only matters here
  // when there is no upload.
  const activeText = uploadedFile ? uploadedFile.content : fountain;
  const isEmpty = !activeText || activeText.trim().length === 0;

  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setUploadError(
        `Couldn't read "${file.name}" — try re-saving it as plain text (or Final Draft XML) and uploading again.`
      );
      return;
    }

    if (text.trim().length === 0) {
      setUploadError(`"${file.name}" is empty — there's nothing to diagnose.`);
      return;
    }
    if (text.length > MAX_UPLOAD_CHARS) {
      setUploadError(
        `"${file.name}" is ${text.length.toLocaleString()} characters, over the ${MAX_UPLOAD_CHARS.toLocaleString()}-character limit for a single diagnosis. Trim it and try again.`
      );
      return;
    }

    // Format detection: trust the extension first; fall back to sniffing the
    // content (XML prolog or a literal FinalDraft tag) for files renamed or
    // exported without a reliable extension.
    const lowerName = file.name.toLowerCase();
    const sniffedFdx = /^\s*<\?xml/.test(text) || text.includes("<FinalDraft");
    const format: "fountain" | "fdx" = lowerName.endsWith(".fdx") || sniffedFdx ? "fdx" : "fountain";

    setUploadedFile({ name: file.name, content: text, format });
    // A fresh upload supersedes whatever was on screen — drop back to idle so
    // "Run Diagnosis" unambiguously targets the new source, not a stale
    // report or error from the editor content.
    abortRef.current?.abort();
    setStatus("idle");
    setReport(null);
    setErrorMessage(null);
  };

  const clearUpload = () => {
    abortRef.current?.abort();
    setUploadedFile(null);
    setUploadError(null);
    setStatus("idle");
    setReport(null);
    setErrorMessage(null);
  };

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

    // Request contract: exactly one of fountain|fdx. An .fdx upload sends its
    // raw text as `fdx`; everything else (editor text, or an uploaded
    // .fountain/.txt file) sends `fountain` as before.
    const requestBody =
      uploadedFile?.format === "fdx"
        ? { fdx: uploadedFile.content, title }
        : { fountain: activeText, title };

    fetch("/api/scriptide/doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
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

  // Abort any in-flight request when the panel unmounts (e.g. user closes it),
  // and clear the "loaded into editor" confirmation timer alongside it.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (loadedNoticeTimerRef.current) clearTimeout(loadedNoticeTimerRef.current);
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
        {/* Hidden file input + styled trigger button. Accepts Fountain, plain
            text, and Final Draft XML; format is decided client-side in
            handleFileSelected (extension first, content sniff as fallback). */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".fountain,.txt,.fdx"
          className="hidden"
          aria-label="Upload script file (.fountain, .txt, or .fdx)"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset so re-selecting the same filename still fires onChange.
            e.target.value = "";
            if (file) void handleFileSelected(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={status === "loading"}
          aria-label="Upload script file to diagnose instead of the editor content"
          title="Upload a .fountain, .txt, or Final Draft (.fdx) file to diagnose instead of the editor content"
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest brutal-border bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" /> Upload script
        </button>
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

      {/* Uploaded-file chip: shown whenever an upload is active, in every
          status, so the writer always knows what they're looking at. */}
      {uploadedFile && (
        <div className="flex items-center gap-2 px-6 py-2 bg-gray-100 dark:bg-zinc-800 border-b-2 border-black/10 dark:border-white/10 shrink-0">
          <FileText className="w-3.5 h-3.5 shrink-0 text-gray-600 dark:text-gray-300" aria-hidden="true" />
          <span
            className="text-[10px] font-mono uppercase tracking-widest text-gray-700 dark:text-gray-300 truncate flex-1"
            title={uploadedFile.name}
          >
            Analyzing upload: {uploadedFile.name}
          </span>
          <button
            onClick={clearUpload}
            aria-label="Stop analyzing the uploaded file and go back to the editor content"
            title="Analyze the editor content instead"
            className="p-1 brutal-border hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Pre-flight upload guard errors (empty file / over the size cap /
          unreadable) — distinct from the diagnosis error state below. */}
      {uploadError && (
        <div
          role="alert"
          className="px-6 py-2 bg-red-50 dark:bg-red-950/40 border-b-2 border-red-300 dark:border-red-800 text-[10px] font-mono text-red-700 dark:text-red-300 shrink-0"
        >
          {uploadError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-6 font-mono text-sm">
        {/* ── Idle state ── */}
        {status === "idle" &&
          (isEmpty ? (
            <div className="p-8 text-center border-4 border-dashed border-gray-300 dark:border-zinc-600 text-gray-400">
              <p className="text-xs uppercase tracking-widest">
                Write some script content, or upload a script file above, before
                running a diagnosis.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                Script Doctor runs the full 14-pass narrative revision engine in
                diagnose-only mode — dialogue, structure, character arcs, conflict,
                pacing, theme, voice, and more — and returns a health score, a
                scene-by-scene issue heatmap, and your top priority fixes.
                {uploadedFile && " It will analyze the uploaded file shown above, not the editor."}
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
            {/* Report header: verdict banner when the coverage layer is present
                (report.verdict), else the original health/grade box — so older
                doctor responses (verdict absent) still render exactly as before. */}
            {report.verdict ? (
              <div
                className={`p-4 brutal-border-thick ${VERDICT_META[report.verdict].bg} ${
                  VERDICT_META[report.verdict].text
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold">{Math.round(report.health)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xl font-display uppercase tracking-widest">
                      {VERDICT_META[report.verdict].label}
                    </div>
                    <div className="text-[10px] font-mono opacity-80 mt-1">
                      {GRADE_META[report.grade].label} draft &middot; {report.sceneCount} scene
                      {report.sceneCount === 1 ? "" : "s"} &middot;{" "}
                      {report.wordCount.toLocaleString()} words &middot; {report.totalIssues} issue
                      {report.totalIssues === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <p className="text-xs font-mono leading-relaxed mt-3 pt-3 border-t border-white/30">
                  {VERDICT_META[report.verdict].explainer}
                </p>
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
                    <span className="text-[10px] font-mono uppercase font-bold">
                      Zero issues found across all 14 passes.
                    </span>
                  )}
                </div>
              </div>
            ) : (
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
            )}

            {/* Plain-language summary — a readable paragraph a writer with no
                film-school vocabulary can act on immediately. */}
            {report.plainSummary && (
              <p className="text-xs leading-relaxed text-black dark:text-gray-100 bg-gray-50 dark:bg-zinc-800 border-2 border-black/10 dark:border-white/10 p-3">
                {report.plainSummary}
              </p>
            )}

            {/* Craft dimensions — 14 passes rolled up into 5 writer-facing scores. */}
            {report.dimensions && report.dimensions.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-500 dark:text-gray-400">
                  Craft Dimensions
                </h3>
                <div className="space-y-3">
                  {report.dimensions.map((dim) => {
                    const band = dimensionBand(dim.score);
                    const pct = Math.max(0, Math.min(100, Math.round(dim.score)));
                    return (
                      <div key={dim.key}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-black dark:text-white">
                            {dim.label}
                          </span>
                          <span className={`text-xs font-bold ${band.text}`}>{pct}</span>
                        </div>
                        <div
                          className="h-2.5 w-full bg-gray-200 dark:bg-zinc-700 border border-black/10 dark:border-white/10 overflow-hidden mt-1"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${dim.label} score`}
                        >
                          <div className={`h-full ${band.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[11px] font-mono text-gray-600 dark:text-gray-300 leading-snug mt-1">
                          {dim.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* What's working — deterministic, earned strengths. Never padded,
                so this only renders when there's something real to say. */}
            {report.strengths && report.strengths.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-500 dark:text-gray-400">
                  What&rsquo;s Working
                </h3>
                <ul className="space-y-1.5">
                  {report.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs font-mono text-black dark:text-gray-100 leading-relaxed"
                    >
                      <CheckCircle2
                        className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-600"
                        aria-hidden="true"
                      />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Source note — only meaningful for .fdx submissions. */}
            {report.source?.format === "fdx" &&
              (() => {
                const source = report.source as DoctorSourceWithWarnings;
                return (
                  <div className="bg-gray-50 dark:bg-zinc-800 border-2 border-black/10 dark:border-white/10 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Converted from Final
                      Draft (.fdx)
                    </p>
                    {source.warnings && source.warnings.length > 0 && (
                      <ul className="space-y-1">
                        {source.warnings.map((w, i) => (
                          <li
                            key={i}
                            className="text-[10px] font-mono text-amber-700 dark:text-amber-400 flex items-start gap-1.5"
                          >
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {source.convertedFountain && onLoadFountain && (
                      <div className="flex items-center gap-3 flex-wrap pt-1">
                        <button
                          onClick={() => {
                            onLoadFountain(source.convertedFountain as string);
                            setLoadedNotice(true);
                            if (loadedNoticeTimerRef.current) clearTimeout(loadedNoticeTimerRef.current);
                            loadedNoticeTimerRef.current = setTimeout(() => setLoadedNotice(false), 4000);
                          }}
                          aria-label="Load the converted Fountain text into the script editor"
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest brutal-border bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" aria-hidden="true" /> Load converted
                          Fountain into editor
                        </button>
                        {loadedNotice && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Loaded into editor
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

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
