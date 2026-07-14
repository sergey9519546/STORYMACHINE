// Slate Panel — producer-tier multi-script comparison. Pick 2–20 Fountain/
// text scripts, rank them deterministically via POST /api/export/slate, and
// optionally download the same ranking as a standalone HTML document.
//
// Keyless-first, deterministic: no LLM anywhere on this surface — the same
// slate submitted twice returns the same order every time (the server route
// re-runs the existing quick doctor per script, then ranks — see the idle
// line below). v1 accepts .fountain/.txt only; .fdx/.pdf slate members are a
// follow-up (each would need client-side conversion or a server contract
// change this run is out of scope for).
//
// Idioms: right-side drawer shell, export/download-blob mechanics, and the
// 404-as-"not deployed yet" feature detection all mirror
// scriptide/ScriptDoctorPanel.tsx (none of its helpers are exported, so the
// small ones used here — downloadBlob, filename parsing, ordinal — are
// duplicated rather than imported). Request lifecycle (abort refs, a
// mounted-guard ref, aborting in-flight work on unmount) mirrors
// InterviewPanel.tsx's send().

import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Layers3,
  X,
  Loader2,
  Upload,
  Trash2,
  Download,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import type { CoverageVerdict, DoctorGrade } from "../../server/nvm/analyze/types.ts";

interface SlatePanelProps {
  onClose: () => void;
}

// ── Client-side guards ───────────────────────────────────────────────────
// MIN/MAX_SCRIPTS mirror the request contract (POST /api/export/slate takes
// 2–20 scripts). MAX_FILE_CHARS mirrors ScriptDoctorPanel's MAX_UPLOAD_CHARS
// single-upload guard exactly (same "fail fast client-side" rationale, same
// number). MAX_COMBINED_CHARS has no server contract to mirror yet (the
// parallel route build hadn't landed one at the time this panel was
// written) — it's this panel's own conservative multiple of the per-file
// cap, purely to keep a pathological 20-huge-file selection from being
// built and serialized client-side; the server's real combined cap, if
// stricter, still wins and its 400 body is surfaced verbatim below.
const MIN_SCRIPTS = 2;
const MAX_SCRIPTS = 20;
const MAX_FILE_CHARS = 900_000;
const MAX_COMBINED_CHARS = 6_000_000;

type RankStatus = "idle" | "loading" | "success" | "error" | "deploying";
type DownloadStatus = "idle" | "loading" | "error" | "deploying";

interface SlateFile {
  id: string;
  fileName: string;
  title: string;
  fountain: string;
  chars: number;
}

/** One ranked slate row — the shape POST /api/export/slate (JSON mode)
 *  returns per script. topDimension/weakestDimension are plain labels (the
 *  same DimensionScore.label strings ScriptDoctorPanel already renders),
 *  not full DimensionScore objects — the contract lists them as flat
 *  fields alongside title/health/verdict, not nested. */
interface SlateEntry {
  title: string;
  health: number;
  verdict?: CoverageVerdict;
  healthPercentile?: number;
  sceneCount: number;
  wordCount: number;
  topDimension?: string;
  weakestDimension?: string;
  contentHash?: string;
}

interface SlateResponse {
  slate: SlateEntry[];
  rankedAt: number;
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** health→grade banding — the exact thresholds ScriptDoctorReport.health
 *  documents (90/75/55/35) and ScriptDoctorPanel's GRADE_META renders by.
 *  Duplicated locally since GRADE_META isn't exported from that file. */
function gradeFromHealth(health: number): DoctorGrade {
  if (health >= 90) return "excellent";
  if (health >= 75) return "strong";
  if (health >= 55) return "solid";
  if (health >= 35) return "uneven";
  return "troubled";
}

const GRADE_TEXT_CLASS: Record<DoctorGrade, string> = {
  excellent: "text-green-600",
  strong: "text-green-600",
  solid: "text-amber-500",
  uneven: "text-red-500",
  troubled: "text-red-700",
};

const VERDICT_CHIP: Record<
  CoverageVerdict,
  { label: string; bg: string; text: string; title: string }
> = {
  RECOMMEND: {
    label: "Recommend",
    bg: "bg-green-600",
    text: "text-white",
    title: "Champion this up the chain — the rarest, strongest endorsement a reader gives.",
  },
  CONSIDER: {
    label: "Consider",
    bg: "bg-amber-500",
    text: "text-black",
    title: "Promising, worth developing further — not a yes yet, but the bones are there.",
  },
  PASS: {
    label: "Pass",
    bg: "bg-red-600",
    text: "text-white",
    title: "Industry-coverage shorthand for a decline — not the opposite of a school-test “fail.”",
  },
};

/** Ordinal suffix for a percentile badge — same 11–13 teens exception as
 *  ScriptDoctorPanel's ordinal(), duplicated for the same reason as above. */
function ordinal(n: number): string {
  const rounded = Math.round(n);
  const mod100 = rounded % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rounded}th`;
  switch (rounded % 10) {
    case 1:
      return `${rounded}st`;
    case 2:
      return `${rounded}nd`;
    case 3:
      return `${rounded}rd`;
    default:
      return `${rounded}th`;
  }
}

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const extended = /filename\*=(?:UTF-8''|utf-8'')?([^;]+)/i.exec(header);
  if (extended?.[1]) {
    try {
      return decodeURIComponent(extended[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // Malformed percent-encoding — fall through to the plain form below.
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || null;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function titleFromFileName(name: string): string {
  const stem = name.replace(/\.(fountain|txt)$/i, "");
  return stem.trim() || "Untitled";
}

function formatChars(n: number): string {
  return n.toLocaleString("en-US");
}

export default function SlatePanel({ onClose }: SlatePanelProps) {
  const [files, setFiles] = useState<SlateFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const [rankStatus, setRankStatus] = useState<RankStatus>("idle");
  const [rankError, setRankError] = useState<string | null>(null);
  const [result, setResult] = useState<SlateResponse | null>(null);

  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("idle");
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rankAbortRef = useRef<AbortController | null>(null);
  const downloadAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Abort any in-flight requests on unmount so a stale response can never
  // land after the panel is gone — same idiom as InterviewPanel/
  // ScriptDoctorPanel's cleanup effects.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      rankAbortRef.current?.abort();
      downloadAbortRef.current?.abort();
    };
  }, []);

  // Escape closes the panel, matching ScriptDoctorPanel/DirectorPanel's
  // overlay convention.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const combinedChars = files.reduce((sum, f) => sum + f.chars, 0);

  const handleFilesSelected = async (fileList: FileList) => {
    setFileError(null);
    const incoming = Array.from(fileList);
    const accepted: SlateFile[] = [];
    const problems: string[] = [];

    let runningCombined = combinedChars;
    let runningCount = files.length;

    for (const file of incoming) {
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith(".fountain") && !lowerName.endsWith(".txt")) {
        problems.push(
          `"${file.name}" skipped — only .fountain/.txt are supported in v1 (Final Draft .fdx and PDF are a follow-up).`
        );
        continue;
      }
      if (runningCount >= MAX_SCRIPTS) {
        problems.push(`"${file.name}" skipped — a slate tops out at ${MAX_SCRIPTS} scripts.`);
        continue;
      }
      let text: string;
      try {
        text = await file.text();
      } catch {
        problems.push(`"${file.name}" skipped — couldn't be read.`);
        continue;
      }
      if (text.trim().length === 0) {
        problems.push(`"${file.name}" skipped — empty file.`);
        continue;
      }
      if (text.length > MAX_FILE_CHARS) {
        problems.push(
          `"${file.name}" skipped — ${formatChars(text.length)} chars is over the ${formatChars(MAX_FILE_CHARS)}-char single-script limit.`
        );
        continue;
      }
      if (runningCombined + text.length > MAX_COMBINED_CHARS) {
        problems.push(
          `"${file.name}" skipped — would push the combined slate over ${formatChars(MAX_COMBINED_CHARS)} chars.`
        );
        continue;
      }
      runningCombined += text.length;
      runningCount += 1;
      accepted.push({
        id: uid(),
        fileName: file.name,
        title: titleFromFileName(file.name),
        fountain: text,
        chars: text.length,
      });
    }

    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
      // A changed file set invalidates whatever ranking is on screen — it no
      // longer describes the slate the writer is looking at.
      setResult(null);
      setRankStatus("idle");
      setRankError(null);
    }
    setFileError(problems.length > 0 ? problems.join(" ") : null);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setResult(null);
    setRankStatus("idle");
    setRankError(null);
  };

  const updateTitle = (id: string, title: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, title } : f)));
  };

  const canRank = files.length >= MIN_SCRIPTS && files.length <= MAX_SCRIPTS;
  const rankDisabledReason =
    files.length < MIN_SCRIPTS
      ? `Add at least ${MIN_SCRIPTS} scripts to rank a slate.`
      : files.length > MAX_SCRIPTS
      ? `A slate tops out at ${MAX_SCRIPTS} scripts — remove some to rank.`
      : undefined;

  const buildPayload = (format?: "html") => ({
    scripts: files.map((f) => ({ title: f.title.trim() || "Untitled", fountain: f.fountain })),
    ...(format ? { format } : {}),
  });

  const runRank = () => {
    if (!canRank || rankStatus === "loading") return;

    rankAbortRef.current?.abort();
    const controller = new AbortController();
    rankAbortRef.current = controller;

    setRankStatus("loading");
    setRankError(null);

    fetch("/api/export/slate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 404) {
          if (!mountedRef.current) return;
          setRankStatus("deploying");
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Ranking failed (${res.status})`);
        }
        const data = (await res.json()) as SlateResponse;
        if (!mountedRef.current) return;
        setResult(data);
        setRankStatus("success");
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setRankStatus("error");
        setRankError(err instanceof Error ? err.message : "Ranking failed");
      });
  };

  const downloadComparison = () => {
    if (!canRank || downloadStatus === "loading") return;

    downloadAbortRef.current?.abort();
    const controller = new AbortController();
    downloadAbortRef.current = controller;

    setDownloadStatus("loading");
    setDownloadError(null);

    fetch("/api/export/slate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload("html")),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 404) {
          if (!mountedRef.current) return null;
          setDownloadStatus("deploying");
          return null;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Download failed (${res.status})`);
        }
        const filename =
          parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
          "slate-comparison.html";
        const blob = await res.blob();
        return { blob, filename };
      })
      .then((payload) => {
        if (!payload || !mountedRef.current) return;
        downloadBlob(payload.blob, payload.filename);
        setDownloadStatus("idle");
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setDownloadStatus("error");
        setDownloadError(err instanceof Error ? err.message : "Download failed");
      });
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slate-panel-title"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 w-[880px] max-w-[96vw] h-dvh bg-white dark:bg-zinc-900 dark:text-white brutal-border-thick text-black p-0 overflow-y-auto z-50 brutal-shadow flex flex-col"
    >
      {/* Chrome header */}
      <div className="flex items-center gap-3 p-6 pb-4 border-b-[8px] border-black shrink-0">
        <Layers3 className="w-8 h-8 shrink-0" aria-hidden="true" />
        <h2 id="slate-panel-title" className="text-2xl font-display uppercase tracking-widest flex-1">
          Slate
        </h2>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".fountain,.txt"
          className="hidden"
          aria-label="Add scripts to the slate (.fountain or .txt)"
          onChange={(e) => {
            const list = e.target.files;
            // Reset so re-selecting the same filename still fires onChange.
            e.target.value = "";
            if (list && list.length > 0) void handleFilesSelected(list);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= MAX_SCRIPTS}
          aria-label="Add script files to the slate"
          title={
            files.length >= MAX_SCRIPTS
              ? `A slate tops out at ${MAX_SCRIPTS} scripts`
              : "Add .fountain or .txt files (2–20 total)"
          }
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest brutal-border bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" /> Add scripts
        </button>
        <button
          onClick={onClose}
          aria-label="Close Slate panel"
          className="p-2 brutal-border hover:bg-black hover:text-white transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* File-picker guard errors */}
      {fileError && (
        <div
          role="alert"
          className="px-6 py-2 bg-red-50 dark:bg-red-950/40 border-b-2 border-red-300 dark:border-red-800 text-[10px] font-mono text-red-700 dark:text-red-300 shrink-0"
        >
          {fileError}
        </div>
      )}

      <div className="p-6 space-y-6 flex-1">
        {/* ── File list ───────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Scripts ({files.length}/{MAX_SCRIPTS})
            </h3>
            <span className="text-[10px] font-mono text-gray-400">
              {formatChars(combinedChars)} / {formatChars(MAX_COMBINED_CHARS)} chars
            </span>
          </div>

          {files.length === 0 ? (
            <div className="p-8 text-center border-4 border-dashed border-gray-300 dark:border-zinc-700 text-gray-400 font-mono text-xs uppercase">
              No scripts yet — add at least {MIN_SCRIPTS} .fountain/.txt files to build a slate.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 border-2 border-black/10 dark:border-white/10 px-3 py-2"
                >
                  <input
                    value={f.title}
                    onChange={(e) => updateTitle(f.id, e.target.value)}
                    aria-label={`Title for ${f.fileName}`}
                    className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border-2 border-black/20 dark:border-white/20 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span
                    className="text-[10px] font-mono text-gray-400 truncate max-w-[160px]"
                    title={f.fileName}
                  >
                    {f.fileName}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 shrink-0">
                    {formatChars(f.chars)} ch
                  </span>
                  <button
                    onClick={() => removeFile(f.id)}
                    aria-label={`Remove ${f.title}`}
                    className="p-1 brutal-border hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={runRank}
            disabled={!canRank || rankStatus === "loading"}
            aria-label="Rank slate"
            title={rankDisabledReason}
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest brutal-border bg-black text-white hover:bg-purple-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {rankStatus === "loading" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : result ? (
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Layers3 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {rankStatus === "loading" ? "Ranking…" : result ? "Re-rank slate" : "Rank slate"}
          </button>

          {result && (
            <button
              onClick={downloadComparison}
              disabled={!canRank || downloadStatus === "loading"}
              aria-label="Download comparison as HTML"
              title="Re-runs the same ranking server-side and downloads it as a standalone HTML comparison document"
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest brutal-border bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {downloadStatus === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              Download comparison (HTML)
            </button>
          )}
        </div>

        {/* ── Status: idle / deploying / error ───────────────────────── */}
        {rankStatus === "idle" && !result && (
          <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 italic">
            Deterministic ranking — same slate, same order, every time.
          </p>
        )}

        {rankStatus === "deploying" && (
          <div
            role="status"
            className="p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 text-[11px] font-mono text-amber-900 dark:text-amber-200 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            Slate ranking isn't live yet — the /api/export/slate route hasn't been deployed. Try
            again shortly.
          </div>
        )}

        {rankStatus === "error" && rankError && (
          <div
            role="alert"
            className="p-4 bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 text-[11px] font-mono text-red-700 dark:text-red-300 flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> {rankError}
            </span>
            <button
              onClick={() => setRankError(null)}
              aria-label="Dismiss ranking error"
              className="shrink-0 hover:text-red-900 dark:hover:text-red-100"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        )}

        {downloadStatus === "deploying" && (
          <div
            role="status"
            className="p-3 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 text-[11px] font-mono text-amber-900 dark:text-amber-200 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            The comparison download isn't live yet — the /api/export/slate route hasn't been
            deployed.
          </div>
        )}

        {downloadStatus === "error" && downloadError && (
          <div
            role="alert"
            className="p-3 bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 text-[11px] font-mono text-red-700 dark:text-red-300 flex items-center justify-between gap-3"
          >
            <span>Download failed: {downloadError}</span>
            <button
              onClick={() => setDownloadError(null)}
              aria-label="Dismiss download error"
              className="shrink-0 hover:text-red-900 dark:hover:text-red-100"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── Ranked comparison table ─────────────────────────────────── */}
        {result && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              Ranked {new Date(result.rankedAt).toLocaleString()}
            </p>
            <div className="overflow-x-auto brutal-border">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">#</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Title</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Health</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Verdict</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Percentile</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Scenes/Words</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Top</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Weakest</th>
                  </tr>
                </thead>
                <tbody>
                  {result.slate.map((entry, i) => {
                    const grade = gradeFromHealth(entry.health);
                    const verdictMeta = entry.verdict ? VERDICT_CHIP[entry.verdict] : undefined;
                    return (
                      <tr
                        key={entry.contentHash ?? `${entry.title}-${i}`}
                        className={i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-gray-50 dark:bg-zinc-800"}
                      >
                        <td className="px-2 py-2 font-bold">{i + 1}</td>
                        <td
                          className="px-2 py-2 truncate max-w-[160px]"
                          title={entry.contentHash ? `contentHash: ${entry.contentHash}` : undefined}
                        >
                          {entry.title}
                        </td>
                        <td className={`px-2 py-2 font-bold ${GRADE_TEXT_CLASS[grade]}`}>
                          {Math.round(entry.health)}
                        </td>
                        <td className="px-2 py-2">
                          {verdictMeta ? (
                            <span
                              title={verdictMeta.title}
                              className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${verdictMeta.bg} ${verdictMeta.text}`}
                            >
                              {verdictMeta.label}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                          {typeof entry.healthPercentile === "number"
                            ? ordinal(entry.healthPercentile)
                            : "—"}
                        </td>
                        <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                          {entry.sceneCount} / {entry.wordCount.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-green-700 dark:text-green-400">
                          {entry.topDimension ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-red-700 dark:text-red-400">
                          {entry.weakestDimension ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
