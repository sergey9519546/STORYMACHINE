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
// small ones used here — downloadBlob, filename parsing — are duplicated
// rather than imported; the percentile copy is NOT duplicated — see
// src/lib/percentile-copy.ts, the single shared implementation ordinal()/
// percentileBand() now live in, 2026-09-04 review). Request lifecycle
// (abort refs, a mounted-guard ref, aborting in-flight work on unmount)
// mirrors InterviewPanel.tsx's send().

import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useModalFocusTrap } from "../lib/use-modal-focus-trap.ts";
import {
  percentileBand, exactRankTooltip, percentileColumnHeaderTooltip, slatePercentileCaption,
} from "../lib/percentile-copy.ts";
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
  totalSceneCount?: number;
  wordCount: number;
  topDimension?: string;
  weakestDimension?: string;
  // 2026-09-04 (honesty-audit matrix fix) — the same two Shape & Rhythm
  // aggregates ScriptDoctorPanel.tsx and both coverage exports already show,
  // present per row only when that script's report scored the block (>= 2
  // scenes). Descriptive only — never part of health or this slate's rank.
  meanAbsDialogueShareDelta?: number;
  actionSentenceCvOverall?: number;
  contentHash?: string;
  /** G0-05: only explicit true may render a score. Anything else is an
   * incomplete-analysis badge, never a fail-open health value. */
  analysisComplete?: boolean;
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

// a11y fix (2026-09-05, client-hunter B-14): the ranked table's rows are now
// theme-invariant (--sm-panel/--sm-panel-2, see the table markup below), so
// every band colour here only ever needs to clear 4.5:1 against those two
// LIGHT backgrounds — never against a dark row, because there no longer is
// one. The previous ramp (green-600/amber-500/red-500/red-700) was picked
// for a WHITE background and measured 1.86-3.32:1 against panel/panel2 —
// amber-500 (the "solid" band, i.e. the health NUMBER itself) was the
// specific 2.04-2.13:1 failure this fix closes. Each replacement below
// clears both panel (#f4efe2) and panel2 (#efe8d7) at 5.80:1 or better
// (measured via the OKLCH->sRGB conversion in
// /tmp/.../scratchpad/contrast/check.mjs, reproducible from Tailwind's own
// theme.css color stops) while keeping the same green/amber/red semantic
// per band, just darkened.
const GRADE_TEXT_CLASS: Record<DoctorGrade, string> = {
  excellent: "text-green-800",
  strong: "text-green-800",
  solid: "text-amber-800",
  uneven: "text-red-700",
  troubled: "text-red-800",
};

const VERDICT_CHIP: Record<
  CoverageVerdict,
  { label: string; bg: string; text: string; title: string }
> = {
  RECOMMEND: {
    label: "Recommend",
    // a11y fix (2026-09-05, B-14 follow-on): white text on bg-green-600
    // measured 3.22:1 — found auditing this table's other health-band
    // colours, not itself named in the original finding, but the same
    // class of bug on the same table. bg-green-700 clears 4.5:1 (4.95:1)
    // with the identical white label text; this chip's own background
    // travels with it regardless of the row's theme, so this is
    // independent of the row-background fix above.
    bg: "bg-green-700",
    text: "text-white",
    title: "The deterministic engine placed this draft in its top verdict tier — a measurement, not a human-reader endorsement.",
  },
  CONSIDER: {
    label: "Consider",
    bg: "bg-amber-500",
    text: "text-black",
    title: "The engine's intermediate verdict — its checks indicate focused revision before moving forward.",
  },
  PASS: {
    label: "Pass",
    bg: "bg-red-600",
    text: "text-white",
    title: "In coverage, “pass” means decline — not the opposite of a school-test “fail.” The engine placed this draft in its decline tier.",
  },
};

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
  // Dialog root — see the tabIndex={-1} on the outer motion.div below and
  // the useModalFocusTrap call near the Escape-handling effect further down.
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  // Real focus management for this panel's role="dialog" aria-modal="true"
  // contract (see the outer motion.div below): moves focus in on mount,
  // traps Tab/Shift+Tab within the panel while mounted, and restores focus
  // to the triggering control on unmount. See use-modal-focus-trap.ts for
  // the scope/limits of what this does and does not cover.
  useModalFocusTrap(panelRef);

  const combinedChars = files.reduce((sum, f) => sum + f.chars, 0);

  const handleFilesSelected = async (fileList: File[]) => {
    setFileError(null);
    const incoming = fileList;
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
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="slate-panel-title"
      // a11y fix (2026-09-05, round 3 — independent review round 2, item
      // 4): this scoping hook used to start at the content container below,
      // so the chrome header (the file/char counts, Add/Close buttons) and
      // the file-picker error banner above it sat outside the audited
      // subtree — a gate blind spot (both measured clean today, but nothing
      // proved it). Moved to the drawer root so scripts/verify-a11y.mjs's
      // scoped axe.run covers the whole dialog (37 nodes, in-DOM count).
      data-a11y-section="slate-table"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      // a11y fix (2026-09-05, round 2 — independent review item 5): the
      // drawer root used to be `bg-white dark:bg-zinc-900 dark:text-white
      // text-black` (fully themed) while the ranked table's rows are the
      // theme-invariant `--sm-panel`/`--sm-panel-2` this same fix put them
      // on — a real dark drawer with a cream table island floating inside
      // it. `--sm-panel`/`--sm-ink` bring the whole drawer to the SAME
      // invariant convention as the table (measured below: every node in
      // the drawer still clears 4.5:1 in both themes with this change).
      className="fixed top-0 right-0 w-[880px] max-w-[96vw] h-dvh bg-[var(--sm-panel)] text-[var(--sm-ink)] border-[2px] border-[var(--sm-ink)] p-0 overflow-y-auto z-50 shadow-[var(--sm-shadow)] flex flex-col"
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
            // Real bug found while adding a live browser check for this
            // panel (2026-09-05): `e.target.files` is a LIVE FileList tied
            // to the input element, not a snapshot — resetting
            // `e.target.value` below (needed so re-selecting the same
            // filename still fires onChange) synchronously empties that
            // SAME FileList in Chromium, so a caller that reads it
            // afterward sees zero files. Copying into a real array FIRST
            // is what makes the reset safe.
            const files = e.target.files ? Array.from(e.target.files) : [];
            e.target.value = "";
            if (files.length > 0) void handleFilesSelected(files);
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
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest sm-btn sm-btn hover:bg-black hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" /> Add scripts
        </button>
        <button
          onClick={onClose}
          aria-label="Close Slate panel"
          className="p-2 sm-btn hover:bg-black hover:text-white transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* File-picker guard errors */}
      {fileError && (
        <div
          role="alert"
          // a11y fix (2026-09-05, round 2 item 5): dropped the `dark:`
          // half of this pair — the drawer root is now theme-invariant, so
          // this box always sits on the same light `--sm-panel` ambient and
          // never needs a second, darker set of colours.
          className="px-6 py-2 bg-red-50 border-b-2 border-red-300 text-[10px] font-mono text-red-700 shrink-0"
        >
          {fileError}
        </div>
      )}

      {/* a11y fix (2026-09-05, round 2 — independent review item 4):
          data-a11y-section used to sit only on the ranked table's own
          wrapper below, so scripts/verify-a11y.mjs's scoped axe.run only
          ever saw the table — not the surrounding panel chrome (the file
          count/char count line, the empty-state dropzone, the per-file
          name/size chips, the "Ranked at…"/Shape & Rhythm caption, the
          percentile explainer) that measured 2.49-2.60:1 in light
          (bare `text-gray-400`, no dark: pairing). Widened to this
          container — everything from the file list through the ranked
          result — so the gate covers the chrome a writer actually reads,
          not just the table cells.

          Item 5 (below, and everywhere in this file) then brought the whole
          drawer to the theme-invariant convention, which is why this chrome
          no longer carries `dark:` pairs at all: once the ambient panel
          never goes dark, a themed pair whose `dark:` half was tuned for a
          real dark background (e.g. the `text-gray-400` this item first
          reached for) actively FAILS against the now-permanent light one —
          measured live at 2.26:1 fixing this item, the mirror image of
          B-11. `--sm-ink-mute` (already this file's own convention for
          descriptive captions, see ShapeRhythmTrendLine-equivalent copy
          elsewhere in the app) replaces it everywhere in this panel.

          Round 3 (independent review round 2, item 4): the scoping hook
          itself moved up to the drawer root (above, on the `motion.div`) so
          the chrome header and the file-picker error banner are covered
          too — this container no longer carries its own copy, so exactly
          one element in the dialog carries `data-a11y-section`. */}
      <div className="p-6 space-y-6 flex-1">
        {/* ── File list ───────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--sm-ink-mute)]">
              Scripts ({files.length}/{MAX_SCRIPTS})
            </h3>
            <span className="text-[10px] font-mono text-[var(--sm-ink-mute)]">
              {formatChars(combinedChars)} / {formatChars(MAX_COMBINED_CHARS)} chars
            </span>
          </div>

          {files.length === 0 ? (
            <div className="p-8 text-center border-4 border-dashed border-[var(--sm-hair)] text-[var(--sm-ink-mute)] font-mono text-xs uppercase">
              No scripts yet — add at least {MIN_SCRIPTS} .fountain/.txt files to build a slate.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 bg-[var(--sm-panel-2)] border-2 border-black/10 px-3 py-2"
                >
                  <input
                    value={f.title}
                    onChange={(e) => updateTitle(f.id, e.target.value)}
                    aria-label={`Title for ${f.fileName}`}
                    className="flex-1 min-w-0 bg-[var(--sm-panel)] border-2 border-black/20 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span
                    className="text-[10px] font-mono text-[var(--sm-ink-mute)] truncate max-w-[160px]"
                    title={f.fileName}
                  >
                    {f.fileName}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--sm-ink-mute)] shrink-0">
                    {formatChars(f.chars)} ch
                  </span>
                  <button
                    onClick={() => removeFile(f.id)}
                    aria-label={`Remove ${f.title}`}
                    className="p-1 sm-btn hover:bg-black hover:text-white transition-colors shrink-0"
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
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest sm-btn sm-btn--ink hover:bg-purple-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
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
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest sm-btn sm-btn hover:bg-black hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
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
          <p className="text-[11px] font-mono text-[var(--sm-ink-mute)] italic">
            Deterministic ranking — same slate, same order, every time.
          </p>
        )}

        {rankStatus === "deploying" && (
          <div
            role="status"
            className="p-4 bg-amber-50 border-2 border-amber-300 text-[11px] font-mono text-amber-900 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            Slate ranking isn't live yet — the /api/export/slate route hasn't been deployed. Try
            again shortly.
          </div>
        )}

        {rankStatus === "error" && rankError && (
          <div
            role="alert"
            className="p-4 bg-red-50 border-2 border-red-300 text-[11px] font-mono text-red-700 flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> {rankError}
            </span>
            <button
              onClick={() => setRankError(null)}
              aria-label="Dismiss ranking error"
              className="shrink-0 hover:text-red-900"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        )}

        {downloadStatus === "deploying" && (
          <div
            role="status"
            className="p-3 bg-amber-50 border-2 border-amber-300 text-[11px] font-mono text-amber-900 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            The comparison download isn't live yet — the /api/export/slate route hasn't been
            deployed.
          </div>
        )}

        {downloadStatus === "error" && downloadError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border-2 border-red-300 text-[11px] font-mono text-red-700 flex items-center justify-between gap-3"
          >
            <span>Download failed: {downloadError}</span>
            <button
              onClick={() => setDownloadError(null)}
              aria-label="Dismiss download error"
              className="shrink-0 hover:text-red-900"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── Ranked comparison table ─────────────────────────────────── */}
        {result && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-[var(--sm-ink-mute)] uppercase tracking-widest">
              Ranked {new Date(result.rankedAt).toLocaleString()}
              {/* 2026-09-04 review (REVISE item 3): the "not part of the
                  score" caveat used to live ONLY in a title= tooltip on the
                  Shape & Rhythm column header — invisible to keyboard and
                  touch readers. Rendered here as visible copy too, matching
                  the visible label ScriptDoctorPanel.tsx's Shape & Rhythm
                  section and SnapshotManager.tsx's trend line already use,
                  and the visible footer sentence the exported slate HTML
                  (server/lib/slate.ts) already carries. */}
              <span className="normal-case tracking-normal"> &middot; Shape &amp; Rhythm column is descriptive only — not part of the score or this ranking</span>
            </p>
            {/* a11y fix (2026-09-05, client-hunter B-14): this used to carry
                its own data-a11y-section="slate-table" scoping hook for
                scripts/verify-a11y.mjs, matching the convention
                ScriptDoctorPanel.tsx's data-a11y-section="shape-rhythm"
                already established. Round 2 (independent review item 4)
                widened that hook to the panel's whole content container
                above, which already covers this subtree — kept unscoped
                here to avoid two overlapping axe scopes on the same audit. */}
            <div className="overflow-x-auto sm-btn">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="sm-btn--ink">
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">#</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Title</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Health</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Verdict</th>
                    <th
                      className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]"
                      title={percentileColumnHeaderTooltip()}
                    >
                      Percentile
                    </th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Scenes/Words</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Top</th>
                    <th className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]">Weakest</th>
                    <th
                      className="px-2 py-2 text-left font-bold uppercase tracking-widest text-[9px]"
                      title="Descriptive only — not part of the score or this ranking"
                    >
                      Shape &amp; Rhythm
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.slate.map((entry, i) => {
                    // G0-05: incomplete analyses carry a sentinel health (0)
                    // that is not a real score. Badge them "incomplete" and
                    // suppress the derived score/verdict/percentile cells.
                    const incomplete = entry.analysisComplete !== true;
                    // a11y fix (2026-09-05, client-hunter B-14): rows used to
                    // be `bg-white dark:bg-zinc-900` / `bg-gray-50
                    // dark:bg-zinc-800` — a REAL dark background in dark
                    // mode — while the "#"/Title cells inherit `.sm-btn`'s
                    // theme-invariant `color:var(--sm-ink)` and every other
                    // cell used a `text-gray-500 dark:text-gray-400` (or
                    // similar) pair. Measured live (⌥⇧D, 2 ranked scripts):
                    // 6 of 36 nodes fell to 1.06-1.13:1 in dark mode. The
                    // rows now sit on the SAME theme-invariant tokens
                    // `.sm-card` uses (--sm-panel/--sm-panel-2,
                    // design-system.css) — see that file's header for the
                    // write-up of this convention — so every text colour
                    // below only ever needs to clear 4.5:1 against those two
                    // LIGHT backgrounds, and the `dark:` variants that used
                    // to pair with a real dark row are dropped rather than
                    // left to mismatch it.
                    const rowBg = i % 2 === 0 ? "bg-[var(--sm-panel)]" : "bg-[var(--sm-panel-2)]";
                    if (incomplete) {
                      return (
                        <tr
                          key={entry.contentHash ?? `${entry.title}-${i}`}
                          className={rowBg}
                        >
                          <td className="px-2 py-2 font-bold text-[var(--sm-ink-mute)]">—</td>
                          <td
                            className="px-2 py-2 truncate max-w-[160px]"
                            title={entry.contentHash ? `contentHash: ${entry.contentHash}` : undefined}
                          >
                            {entry.title}
                          </td>
                          <td className="px-2 py-2">
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-gray-200 text-gray-600">
                              Incomplete
                            </span>
                          </td>
                          <td className="px-2 py-2 text-[var(--sm-ink-mute)]">—</td>
                          <td className="px-2 py-2 text-[var(--sm-ink-mute)]">—</td>
                          <td className="px-2 py-2 text-[var(--sm-ink-mute)]">
                            {entry.totalSceneCount !== undefined
                              ? `${entry.sceneCount.toLocaleString()} of ${entry.totalSceneCount.toLocaleString()} scenes analyzed`
                              : `${entry.sceneCount.toLocaleString()} scenes analyzed before analysis became incomplete`}
                          </td>
                          <td className="px-2 py-2 text-[var(--sm-ink-mute)]">—</td>
                          <td className="px-2 py-2 text-[var(--sm-ink-mute)]">—</td>
                          <td className="px-2 py-2 text-[var(--sm-ink-mute)]">—</td>
                        </tr>
                      );
                    }
                    const grade = gradeFromHealth(entry.health);
                    const verdictMeta = entry.verdict ? VERDICT_CHIP[entry.verdict] : undefined;
                    return (
                      <tr
                        key={entry.contentHash ?? `${entry.title}-${i}`}
                        className={rowBg}
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
                            <span className="text-[var(--sm-ink-mute)]">—</span>
                          )}
                        </td>
                        <td
                          className="px-2 py-2 text-[var(--sm-ink-mute)]"
                          title={
                            typeof entry.healthPercentile === "number"
                              ? exactRankTooltip(entry.healthPercentile)
                              : undefined
                          }
                        >
                          {typeof entry.healthPercentile === "number"
                            ? percentileBand(entry.healthPercentile)
                            : "—"}
                        </td>
                        <td className="px-2 py-2 text-[var(--sm-ink-mute)]">
                          {entry.sceneCount} / {entry.wordCount.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-green-800">
                          {entry.topDimension ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-red-700">
                          {entry.weakestDimension ?? "—"}
                        </td>
                        <td
                          className="px-2 py-2 text-[var(--sm-ink-mute)]"
                          title="Descriptive only — not part of the score or this ranking"
                        >
                          {typeof entry.meanAbsDialogueShareDelta === "number"
                            && typeof entry.actionSentenceCvOverall === "number"
                            ? `swing ${entry.meanAbsDialogueShareDelta.toFixed(2)} · cv ${entry.actionSentenceCvOverall.toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* 2026-09-05 (owner-rule follow-up) — the Percentile column's
                denominator used to be visible ONLY as a title= tooltip on
                the header cell, same gap the review found and fixed for
                the Shape & Rhythm column above. Rendered here as visible
                text too, from the SAME shared sentence
                (src/lib/percentile-copy.ts's slatePercentileCaption) the
                exported slate HTML's footer already carries, so the two
                can never disagree on wording. */}
            <p className="text-[10px] font-mono text-[var(--sm-ink-mute)] normal-case tracking-normal">
              {slatePercentileCaption()}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
