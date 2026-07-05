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
  Download,
  History as HistoryIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import type {
  ScriptDoctorReport,
  DoctorGrade,
  SceneDiagnostics,
  CoverageVerdict,
  DimensionKey,
  RootCauseFinding,
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
 *  `format` decides how the request is built: `fountain`/`fdx` send the read
 *  text as JSON (same as before); `pdf` sends the raw bytes with no JSON
 *  wrapper, so `content` stays empty and the bytes live in `pdfBytes` instead
 *  — the server converts PDF→Fountain itself, there's nothing to read as text
 *  client-side. */
interface UploadedScript {
  name: string;
  content: string;
  format: "fountain" | "fdx" | "pdf";
  pdfBytes?: ArrayBuffer;
}

// Matches the request-contract guard on the doctor route: reject oversized
// uploads client-side so we never spend a round-trip proving what we already
// know locally.
const MAX_UPLOAD_CHARS = 900_000;

// Matches POST /api/scriptide/doctor/pdf's 15MB request-body cap — same
// "fail fast client-side" rationale as MAX_UPLOAD_CHARS above.
const MAX_PDF_BYTES = 15 * 1024 * 1024;

type Status = "idle" | "loading" | "success" | "error";
// Export is a fully independent, secondary in-flight action (a report is
// already on screen when it runs) — kept as its own status rather than
// folded into the main `Status` so an export failure/retry never disturbs
// the displayed diagnosis.
type ExportStatus = "idle" | "loading" | "error";

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

/** Turn a raw rule identifier (e.g. "CHARACTER_INTRO_CLICHE", the ALL_CAPS
 *  snake_case convention every revision pass uses for RevisionIssue.rule)
 *  into a plain-language phrase ("character intro cliche") for the root-cause
 *  card's "contributing notes" list — that list is meant to name the writer's
 *  problem, not leak an internal rule constant verbatim. */
function humanizeRule(rule: string): string {
  return rule.replace(/_/g, " ").toLowerCase();
}

/** Severity → chip classes for the root-cause card's severity badge — reuses
 *  the exact SEVERITY_META palette (green/amber/red is reserved for
 *  score/severity bands elsewhere in this file) so a root cause reads with
 *  the same urgency vocabulary as everything else in the report. */
const ROOT_CAUSE_SEVERITY_BORDER: Record<RevisionIssue["severity"], string> = {
  critical: "border-red-600",
  major: "border-amber-500",
  minor: "border-zinc-400 dark:border-zinc-500",
};

/** Neutral/accent styling for percentile badges — deliberately NOT the
 *  green/amber/red severity palette used everywhere else in this file, since
 *  a percentile is descriptive context ("how this compares"), not a grade. */
const PERCENTILE_BADGE_CLASS =
  "inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40";

/** Ordinal suffix ("1st", "2nd", "3rd", "4th"…) for a percentile badge —
 *  handles the 11–13 teens exception (11th/12th/13th, not 11st/12nd/13rd). */
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

/** Heatmap cell color by issue density — critical presence always wins regardless
 *  of total count, so a single critical issue reads as urgent even in a light scene. */
function heatmapClass(scene: SceneDiagnostics): string {
  if (scene.critical > 0) return "bg-red-600";
  if (scene.issueCount === 0) return "bg-zinc-100 dark:bg-zinc-700";
  if (scene.issueCount <= 2) return "bg-yellow-300";
  if (scene.issueCount <= 4) return "bg-orange-400";
  return "bg-red-500";
}

// ─── Draft history (client-side, localStorage) ──────────────────────────────
// Draft-over-draft tracking lives entirely in the browser: one compact entry
// per genuinely-changed diagnosis, keyed by the report's contentHash (the
// determinism receipt from server/nvm/analyze/types.ts). Every access is
// wrapped in try/catch — private-mode browsers throw on localStorage access
// entirely, and quota can be exceeded — so the feature always degrades to
// "no history" rather than ever breaking a diagnosis run.

const DOCTOR_HISTORY_KEY = "sm_doctor_history_v1";
// Stored oldest-first (append at the end); capped by dropping the oldest
// entries first so the list always keeps the most recent drafts.
const DOCTOR_HISTORY_MAX_ENTRIES = 50;
const DOCTOR_HISTORY_DISPLAY_MAX = 10;

interface DoctorHistoryEntry {
  at: number;
  title: string;
  contentHash: string;
  health: number;
  verdict?: CoverageVerdict;
  totalIssues: number;
  bySeverity: { critical: number; major: number; minor: number };
  dimensions: Array<{ key: DimensionKey; score: number }>;
}

function loadDoctorHistory(): DoctorHistoryEntry[] {
  try {
    const raw = localStorage.getItem(DOCTOR_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DoctorHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveDoctorHistory(entries: DoctorHistoryEntry[]): void {
  try {
    localStorage.setItem(DOCTOR_HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Private-mode localStorage access, or quota exceeded — this run's
    // history entry just doesn't persist; nothing else depends on it.
  }
}

function clearDoctorHistory(): void {
  try {
    localStorage.removeItem(DOCTOR_HISTORY_KEY);
  } catch {
    // Nothing to clean up if localStorage was never reachable.
  }
}

/** Append a new history entry for `report` (unless it's an exact repeat of
 *  the most recently recorded draft, i.e. same contentHash — an unchanged
 *  script has nothing new to record), capped at 50 entries with the oldest
 *  dropped first. Returns the resulting history (for the list UI) alongside
 *  whichever entry was newest *before* this call — the caller uses that as
 *  the delta baseline, or to detect the "identical script" case when its
 *  contentHash matches the new report's. A missing contentHash (a report
 *  shape older than this feature) skips recording entirely rather than
 *  storing an entry that could never be matched against later. */
function recordDoctorHistory(
  report: ScriptDoctorReport,
  title: string,
): { history: DoctorHistoryEntry[]; previous: DoctorHistoryEntry | null } {
  const existing = loadDoctorHistory();
  const previous = existing.length > 0 ? existing[existing.length - 1] : null;

  if (!report.contentHash) return { history: existing, previous };
  if (previous && previous.contentHash === report.contentHash) {
    return { history: existing, previous };
  }

  const entry: DoctorHistoryEntry = {
    at: Date.now(),
    title: title.trim() || "Untitled",
    contentHash: report.contentHash,
    health: report.health,
    verdict: report.verdict,
    totalIssues: report.totalIssues,
    bySeverity: report.bySeverity,
    dimensions: (report.dimensions ?? []).map((d) => ({ key: d.key, score: d.score })),
  };
  const next = [...existing, entry].slice(-DOCTOR_HISTORY_MAX_ENTRIES);
  saveDoctorHistory(next);
  return { history: next, previous };
}

/** Coarse, human relative-time phrase ("3 hours ago") for the delta strip's
 *  "vs. previous draft (…)" label — deliberately coarse-grained (no seconds
 *  beyond "just now") since draft comparisons are meaningful at the
 *  minute-to-month scale, not the second scale. */
function relativeTimeFrom(at: number): string {
  const diffSec = Math.round((Date.now() - at) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
  const diffYear = Math.round(diffMonth / 12);
  return `${diffYear} year${diffYear === 1 ? "" : "s"} ago`;
}

/** Up (green) / down (red) / flat (neutral) arrow for a numeric delta.
 *  `invert` flips which sign counts as "improved" — a rising health/dimension
 *  score is good, but a rising issue count is bad, so the two deltas can't
 *  share one polarity rule. */
function DeltaGlyph({ delta, invert = false }: { delta: number; invert?: boolean }) {
  const improved = invert ? delta < 0 : delta > 0;
  const flat = delta === 0;
  const color = flat ? "text-gray-400" : improved ? "text-green-600" : "text-red-500";
  const Icon = flat ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 font-bold ${color}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {flat ? "0" : `${delta > 0 ? "+" : ""}${delta}`}
    </span>
  );
}

/** Draft-over-draft delta strip: shown above the dimension bars whenever a
 *  previous, DIFFERENT-hash history entry exists. Every number here is a
 *  plain subtraction over already-computed report/entry fields — no new
 *  heuristics, so it can never disagree with what the two reports actually
 *  say. Dimensions that didn't move are omitted per the task's "only
 *  dimensions that moved" rule, so a script with no dimension movement still
 *  shows the health/verdict/issue lines without a misleading empty row. */
function DraftDeltaStrip({
  previous,
  current,
}: {
  previous: DoctorHistoryEntry;
  current: ScriptDoctorReport;
}) {
  const healthDelta = Math.round((current.health - previous.health) * 10) / 10;
  const verdictChanged =
    !!previous.verdict && !!current.verdict && previous.verdict !== current.verdict;
  // Positive issuesDelta = more issues than before (regression); negative =
  // fewer (net cleared) — invert=true on its DeltaGlyph below since fewer is
  // the improvement here, the opposite polarity from health/dimension scores.
  const issuesDelta = current.totalIssues - previous.totalIssues;

  const dimensionDeltas = (current.dimensions ?? [])
    .map((dim) => {
      const prior = previous.dimensions.find((d) => d.key === dim.key);
      if (!prior) return null;
      const delta = Math.round((dim.score - prior.score) * 10) / 10;
      return delta !== 0 ? { key: dim.key, label: dim.label, delta } : null;
    })
    .filter((d): d is { key: DimensionKey; label: string; delta: number } => d !== null);

  return (
    <div className="bg-gray-50 dark:bg-zinc-800 border-2 border-black/10 dark:border-white/10 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        vs. previous draft ({relativeTimeFrom(previous.at)})
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono text-black dark:text-gray-100">
        <span className="flex items-center gap-1.5">
          Health <DeltaGlyph delta={healthDelta} />
        </span>
        {verdictChanged && (
          <span className="flex items-center gap-1.5 uppercase font-bold">
            {previous.verdict} &rarr; {current.verdict}
          </span>
        )}
        {issuesDelta !== 0 && (
          <span className="flex items-center gap-1.5">
            Issues <DeltaGlyph delta={issuesDelta} invert />{" "}
            {issuesDelta < 0 ? "cleared" : "added"}
          </span>
        )}
        {issuesDelta === 0 && (
          <span className="text-gray-400">Issue count unchanged</span>
        )}
      </div>
      {dimensionDeltas.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-black/10 dark:border-white/10 text-[10px] font-mono text-gray-600 dark:text-gray-300">
          {dimensionDeltas.map((d) => (
            <span key={d.key} className="flex items-center gap-1">
              {d.label} <DeltaGlyph delta={d.delta} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Export helpers ──────────────────────────────────────────────────────────

/** Pull a filename out of a Content-Disposition header, preferring the
 *  RFC 5987 `filename*=UTF-8''…` form (percent-encoded, handles non-ASCII
 *  titles) and falling back to the plain `filename="…"` form. Returns null
 *  for a missing/unparsable header so the caller can fall back to its own
 *  sensible default rather than downloading a file named "null". */
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

/** Trigger a browser download of `blob` named `filename` via a throwaway
 *  anchor element — the standard blob-URL download pattern, since the
 *  response body is opaque bytes (an HTML attachment) rather than something
 *  the app can navigate to directly. */
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

/** Sanitize a report title into a safe filename stem: strip characters that
 *  are invalid (or awkward) across Windows/macOS/Linux filesystems, collapse
 *  whitespace, and fall back to a generic name so an empty/symbol-only title
 *  never produces an empty or all-underscore filename. */
function safeFilenameStem(title: string | undefined): string {
  const cleaned = (title ?? "").trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-");
  return cleaned || "coverage-report";
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

/** One root-cause finding: severity chip, title, explanation, a compact
 *  "N issues • scenes X, Y" meta line, and a collapsible list of the member
 *  rules that were clustered into this diagnosis. Manages its own collapse
 *  state (each card opens independently) — mirrors the per-pass collapsible
 *  pattern below (aria-expanded + chevron) rather than introducing a new
 *  interaction idiom. */
function RootCauseCard({ finding }: { finding: RootCauseFinding }) {
  const [open, setOpen] = useState(false);
  const meta = SEVERITY_META[finding.severity];
  const Icon = meta.icon;
  const sceneLabel =
    finding.sceneIdxs.length > 0
      ? `scene${finding.sceneIdxs.length === 1 ? "" : "s"} ${finding.sceneIdxs
          .map((idx) => idx + 1)
          .join(", ")}`
      : null;
  const notesId = `root-cause-notes-${finding.id}`;

  return (
    <div
      className={`bg-gray-50 dark:bg-zinc-800 border-2 border-l-[6px] ${ROOT_CAUSE_SEVERITY_BORDER[finding.severity]} border-black/10 dark:border-white/10 p-3 space-y-2`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.badge}`}
        >
          <Icon className="w-3 h-3" aria-hidden="true" /> {meta.label}
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-black dark:text-white">
          {finding.title}
        </span>
      </div>
      <p className="text-xs font-mono leading-relaxed text-black dark:text-gray-100">
        {finding.explanation}
      </p>
      <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        {finding.memberCount} issue{finding.memberCount === 1 ? "" : "s"}
        {sceneLabel ? ` • ${sceneLabel}` : ""}
      </p>
      {finding.memberRules.length > 0 && (
        <div>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={notesId}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-black dark:text-white hover:underline"
          >
            {open ? (
              <ChevronDown className="w-3 h-3 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-3 h-3 shrink-0" aria-hidden="true" />
            )}
            Show the {finding.memberRules.length} contributing note
            {finding.memberRules.length === 1 ? "" : "s"}
          </button>
          {open && (
            <ul id={notesId} className="mt-1.5 space-y-1 pl-4">
              {finding.memberRules.map((rule, i) => (
                <li
                  key={`${rule}-${i}`}
                  className="text-[10px] font-mono text-gray-600 dark:text-gray-300 list-disc"
                >
                  {humanizeRule(rule)}
                </li>
              ))}
            </ul>
          )}
        </div>
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

  // Exact payload the currently-displayed report was generated from, snapshot
  // at the moment diagnosis succeeds. Export must reuse this rather than
  // recomputing from `uploadedFile`/`fountain` live, since either can change
  // (further edits, a cleared upload) while the report from an earlier run is
  // still on screen. Null for pdf-sourced reports — those export from
  // report.source.convertedFountain instead, which the server already returns.
  const [analyzedSnapshot, setAnalyzedSnapshot] = useState<{ fountain?: string; fdx?: string } | null>(null);

  // Draft-over-draft history (localStorage-backed; see recordDoctorHistory).
  const [history, setHistory] = useState<DoctorHistoryEntry[]>(() => loadDoctorHistory());
  // The entry to compare the current report against: null on the very first
  // diagnosis ever recorded (nothing to compare to), or an entry whose
  // contentHash may equal the current report's (render the "identical
  // script" notice) or differ (render the full delta strip).
  const [previousEntry, setPreviousEntry] = useState<DoctorHistoryEntry | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmingClearHistory, setConfirmingClearHistory] = useState(false);

  // "Export report" is independent of the main diagnosis lifecycle.
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadedNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every run so a stale (aborted/superseded) response can never
  // clobber the state of a newer run — same guard pattern as
  // ScriptIDE.triggerAnalysis's analysisGenerationRef.
  const generationRef = useRef(0);

  const isPdfUpload = uploadedFile?.format === "pdf";
  // The uploaded file's content, once present, IS the thing being diagnosed —
  // upload guards already reject empty files, so `fountain` only matters here
  // when there is no upload. A pdf upload has no client-readable text at all
  // (the server converts it), so it never contributes to `activeText`.
  const activeText = uploadedFile && !isPdfUpload ? uploadedFile.content : fountain;
  const isEmpty = isPdfUpload
    ? !uploadedFile?.pdfBytes || uploadedFile.pdfBytes.byteLength === 0
    : !activeText || activeText.trim().length === 0;

  const handleFileSelected = async (file: File) => {
    setUploadError(null);

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith(".pdf") || file.type === "application/pdf";

    if (isPdf) {
      // PDF path: read as raw bytes, not text — conversion happens server-side
      // (POST /api/scriptide/doctor/pdf), so there's nothing to sniff or parse
      // client-side beyond the size guard.
      let buffer: ArrayBuffer;
      try {
        buffer = await file.arrayBuffer();
      } catch {
        setUploadError(
          `Couldn't read "${file.name}" — try re-exporting the PDF and uploading again.`
        );
        return;
      }
      if (buffer.byteLength === 0) {
        setUploadError(`"${file.name}" is empty — there's nothing to diagnose.`);
        return;
      }
      if (buffer.byteLength > MAX_PDF_BYTES) {
        setUploadError(
          `"${file.name}" is ${(buffer.byteLength / (1024 * 1024)).toFixed(1)}MB, over the ` +
            `${(MAX_PDF_BYTES / (1024 * 1024)).toFixed(0)}MB limit for a single diagnosis. Trim it and try again.`
        );
        return;
      }
      setUploadedFile({ name: file.name, content: "", format: "pdf", pdfBytes: buffer });
      abortRef.current?.abort();
      setStatus("idle");
      setReport(null);
      setErrorMessage(null);
      return;
    }

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

    // Request contract: exactly one of fountain|fdx as JSON, OR raw PDF bytes
    // with no JSON wrapper. A .fdx upload sends its raw text as `fdx`; a .pdf
    // upload POSTs the bytes directly to the dedicated pdf route; everything
    // else (editor text, or an uploaded .fountain/.txt file) sends `fountain`.
    // `snapshotForThisRun` mirrors whichever branch fires — it's what "Export
    // report" reuses later, since by then `uploadedFile`/`fountain` may have
    // moved on. pdf has no snapshot: the server's response itself carries
    // convertedFountain, which export reads directly off the report.
    const isPdf = uploadedFile?.format === "pdf";
    const isFdx = uploadedFile?.format === "fdx";
    const snapshotForThisRun: { fountain?: string; fdx?: string } | null = isPdf
      ? null
      : isFdx
      ? { fdx: uploadedFile!.content }
      : { fountain: activeText };

    const request = isPdf
      ? fetch("/api/scriptide/doctor/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: uploadedFile!.pdfBytes,
          signal: controller.signal,
        })
      : fetch("/api/scriptide/doctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isFdx ? { fdx: uploadedFile!.content, title } : { fountain: activeText, title }),
          signal: controller.signal,
        });

    request
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          const fallback =
            res.status === 404
              ? isPdf
                ? "PDF diagnosis isn't live yet — the /api/scriptide/doctor/pdf route hasn't been deployed."
                : "Script Doctor isn't live yet — the /api/scriptide/doctor route hasn't been deployed."
              : `Diagnosis failed (${res.status})`;
          throw new Error(body?.error ?? fallback);
        }
        return (await res.json()) as ScriptDoctorReport;
      })
      .then((data) => {
        if (myGeneration !== generationRef.current) return; // superseded by a newer run
        setReport(data);
        setAnalyzedSnapshot(snapshotForThisRun);
        setOpenPasses({});
        setStatus("success");
        // Draft-over-draft history: record this diagnosis (unless it's an
        // exact repeat of the last one) and capture whatever was newest
        // *before* this call as the delta baseline / identical-script check.
        const { history: nextHistory, previous } = recordDoctorHistory(data, title ?? "");
        setHistory(nextHistory);
        setPreviousEntry(previous);
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

  const handleExportReport = () => {
    if (!report) return;

    exportAbortRef.current?.abort();
    const controller = new AbortController();
    exportAbortRef.current = controller;

    setExportStatus("loading");
    setExportError(null);

    // Reuse whatever content the DISPLAYED report was actually generated
    // from — never live editor/upload state, which may have moved on since
    // diagnosis succeeded. pdf-sourced reports have no fountain/fdx snapshot
    // (the doctor/pdf route takes raw bytes, not JSON), so they export the
    // server's own convertedFountain instead.
    let payload: { fountain?: string; fdx?: string; title?: string };
    if (report.source?.format === "pdf") {
      const converted = report.source.convertedFountain;
      if (!converted) {
        setExportStatus("error");
        setExportError("This PDF-sourced report has no converted Fountain text to export.");
        return;
      }
      payload = { fountain: converted, title };
    } else if (analyzedSnapshot) {
      payload = { ...analyzedSnapshot, title };
    } else {
      // Defensive fallback — unreachable in practice, since analyzedSnapshot
      // is set in lockstep with the report itself for every non-pdf source.
      payload = { fountain: activeText, title };
    }

    fetch("/api/export/coverage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          const fallback =
            res.status === 404
              ? "Coverage export isn't live yet — the /api/export/coverage route hasn't been deployed."
              : `Export failed (${res.status})`;
          throw new Error(body?.error ?? fallback);
        }
        const filename =
          parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
          `${safeFilenameStem(title)}-coverage.html`;
        const blob = await res.blob();
        return { blob, filename };
      })
      .then(({ blob, filename }) => {
        downloadBlob(blob, filename);
        setExportStatus("idle");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return; // cancelled — no error state
        setExportStatus("error");
        setExportError(err instanceof Error ? err.message : "Export failed");
      });
  };

  // Abort any in-flight request when the panel unmounts (e.g. user closes it),
  // and clear the "loaded into editor" confirmation timer alongside it.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      exportAbortRef.current?.abort();
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
            text, Final Draft XML, and PDF; format is decided client-side in
            handleFileSelected (extension first, content sniff as fallback for
            fountain/fdx; PDF is read as raw bytes and diagnosed server-side). */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".fountain,.txt,.fdx,.pdf"
          className="hidden"
          aria-label="Upload script file (.fountain, .txt, .fdx, or .pdf)"
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
          title="Upload a .fountain, .txt, Final Draft (.fdx), or PDF file to diagnose instead of the editor content"
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest brutal-border bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" /> Upload script
        </button>
        {status === "success" && report && (
          <button
            onClick={handleExportReport}
            disabled={exportStatus === "loading"}
            aria-label="Export coverage report as an HTML document"
            title="Export the current report as a downloadable HTML coverage document"
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest brutal-border bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {exportStatus === "loading" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            Export report
          </button>
        )}
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

      {/* Export failures (route not deployed yet, network error, etc.) —
          distinct from both the upload guard and diagnosis error states,
          since exporting never disturbs the report already on screen. */}
      {exportStatus === "error" && exportError && (
        <div
          role="alert"
          className="px-6 py-2 bg-red-50 dark:bg-red-950/40 border-b-2 border-red-300 dark:border-red-800 text-[10px] font-mono text-red-700 dark:text-red-300 shrink-0 flex items-center justify-between gap-3"
        >
          <span>Export failed: {exportError}</span>
          <button
            onClick={() => setExportError(null)}
            aria-label="Dismiss export error"
            className="shrink-0 hover:text-red-900 dark:hover:text-red-100"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
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
                    {typeof report.healthPercentile === "number" && (
                      <div className="text-[10px] font-mono opacity-80 mt-0.5">
                        Stronger than {Math.round(report.healthPercentile)}% of the reference set
                      </div>
                    )}
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
                    {typeof report.healthPercentile === "number" && (
                      <div className="text-[10px] font-mono opacity-70 mt-0.5">
                        Stronger than {Math.round(report.healthPercentile)}% of the reference set
                      </div>
                    )}
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

            {/* Root causes — co-firing issues clustered into named diagnoses.
                Placed high in the reading order (right after the verdict/
                plainSummary, before the dimension bars) since "what's actually
                wrong" is the headline, not an appendix. Renders only when the
                server populated at least one finding — older reports (or a
                script with nothing to cluster) fall through with no gap. */}
            {report.rootCauses && report.rootCauses.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1 text-gray-500 dark:text-gray-400">
                  Root Causes
                </h3>
                <p className="text-[11px] font-mono text-gray-600 dark:text-gray-300 leading-snug mb-2">
                  Several notes often share one underlying problem. Fixing these first
                  clears the most issues at once.
                </p>
                <div className="space-y-2">
                  {report.rootCauses.map((finding) => (
                    <RootCauseCard key={finding.id} finding={finding} />
                  ))}
                </div>
              </div>
            )}

            {/* Draft-over-draft: only rendered once a PREVIOUS entry exists at
                all (nothing to compare on the very first-ever diagnosis).
                Identical contentHash to that previous entry gets the flat
                "no changes" notice per the determinism nuance in the task
                spec, rather than a delta strip showing all-zero deltas. */}
            {previousEntry && report.contentHash && (
              previousEntry.contentHash === report.contentHash ? (
                <p className="text-[11px] font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800 border-2 border-black/10 dark:border-white/10 p-3">
                  No changes since last diagnosis — identical script.
                </p>
              ) : (
                <DraftDeltaStrip previous={previousEntry} current={report} />
              )
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
                          <span className="flex items-center gap-1.5">
                            {typeof dim.percentile === "number" && (
                              <span
                                className={PERCENTILE_BADGE_CLASS}
                                title={dim.percentileDescriptor ?? `${ordinal(dim.percentile)} percentile`}
                              >
                                {ordinal(dim.percentile)} pct
                              </span>
                            )}
                            <span className={`text-xs font-bold ${band.text}`}>{pct}</span>
                          </span>
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

            {/* Source note — meaningful whenever the submission was converted
                to Fountain server-side (.fdx or .pdf); the label names which. */}
            {(report.source?.format === "fdx" || report.source?.format === "pdf") &&
              (() => {
                const source = report.source!;
                const sourceLabel =
                  source.format === "pdf" ? "Converted from PDF" : "Converted from Final Draft (.fdx)";
                return (
                  <div className="bg-gray-50 dark:bg-zinc-800 border-2 border-black/10 dark:border-white/10 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" /> {sourceLabel}
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

            {/* Draft history — collapsed by default, most-recent-first, up to
                10 shown (of up to 50 retained). Purely client-side
                (localStorage); degrades to "nothing to show" if unavailable. */}
            {history.length > 0 && (
              <div>
                <button
                  onClick={() => setHistoryOpen((open) => !open)}
                  aria-expanded={historyOpen}
                  className="w-full flex items-center justify-between gap-2 p-3 text-left border-2 border-black dark:border-white/20 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span className="flex items-center gap-2 font-bold uppercase text-xs tracking-widest">
                    {historyOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <HistoryIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> Draft History
                  </span>
                  <span className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">
                    {history.length} draft{history.length === 1 ? "" : "s"}
                  </span>
                </button>
                {historyOpen && (
                  <div className="border-2 border-t-0 border-black dark:border-white/20 p-3 space-y-3">
                    <ul className="space-y-1.5">
                      {[...history]
                        .reverse()
                        .slice(0, DOCTOR_HISTORY_DISPLAY_MAX)
                        .map((entry) => (
                          <li
                            key={`${entry.at}-${entry.contentHash}`}
                            className="flex items-center justify-between gap-2 text-[10px] font-mono text-black dark:text-gray-100 border-b border-black/10 dark:border-white/10 pb-1.5 last:border-b-0 last:pb-0"
                          >
                            <span className="text-gray-500 dark:text-gray-400 shrink-0">
                              {new Date(entry.at).toLocaleString()}
                            </span>
                            <span className="font-bold shrink-0">{Math.round(entry.health)}</span>
                            {entry.verdict && (
                              <span className="uppercase font-bold shrink-0">{entry.verdict}</span>
                            )}
                            <span className="text-gray-600 dark:text-gray-300 truncate">
                              {entry.totalIssues} issue{entry.totalIssues === 1 ? "" : "s"}
                            </span>
                          </li>
                        ))}
                    </ul>
                    <div className="pt-2 border-t border-black/10 dark:border-white/10">
                      {confirmingClearHistory ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-red-600 dark:text-red-400">
                            Clear all {history.length} saved draft{history.length === 1 ? "" : "s"}?
                          </span>
                          <button
                            onClick={() => {
                              clearDoctorHistory();
                              setHistory([]);
                              setPreviousEntry(null);
                              setConfirmingClearHistory(false);
                            }}
                            className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest brutal-border bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmingClearHistory(false)}
                            className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest brutal-border bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingClearHistory(true)}
                          aria-label="Clear all saved draft history"
                          className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest brutal-border bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" /> Clear history
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
