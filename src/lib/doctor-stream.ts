/**
 * Shared client for POST /api/scriptide/doctor/stream (server/routes/
 * scriptide.ts) — the SSE sibling of the plain /doctor route that reports
 * live per-pass progress instead of one opaque JSON response at the end.
 *
 * Extracted from ScriptDoctorPanel.tsx (E1, 2026-08-21) so CoverageSummary.tsx
 * can drive the exact same streamed run instead of duplicating the SSE frame
 * parsing / progress-folding logic — see the Phase E exit-gate punch list,
 * item P2: CoverageSummary was still on the plain /doctor route with a
 * static "Reading the draft…" spinner for the whole run, even though this
 * client already existed for ScriptDoctorPanel.
 */
import type {
  ScriptDoctorReport,
  DoctorProgressEvent,
  LocatedIssue,
} from "../../server/nvm/analyze/types.ts";
import type { SceneLineSpan } from "../../server/nvm/analyze/locate.ts";

// server/nvm/revision/pipeline.ts's fixed pass count.
export const DOCTOR_STREAM_TOTAL_PASSES = 14;

/** Compact progress state a loading UI can render. */
export interface DoctorStreamProgress {
  stage: "parsing" | "deep_read" | "passes" | "aggregating";
  passesDone: number;
  totalPasses: number;
}

// server/routes/scriptide.ts attaches `locatedIssues` to /doctor, /doctor/
// stream, /doctor/deep, and /doctor/pdf's responses the same way it already
// attaches `rootCauses` — a route-level enrichment, not part of the
// ScriptDoctorReport contract in server/nvm/analyze/types.ts (that interface
// is a fixed contract).
// Shape-&-rhythm jump-to-scene (2026-09-04): same route-level attachment as
// `locatedIssues` above — index i is scene i's { startLine, endLine }, so a
// structuralSignals scene row (sceneIdx/slug only, no line numbers on the
// scoring-path StructuralSignalsReport itself) can resolve to a concrete
// editor span the same way a topPriorities/per-pass issue already does via
// locatedIssues. Optional: absent on any route/response that predates it.
export type DoctorReportWithAnchors = ScriptDoctorReport & {
  locatedIssues?: LocatedIssue[];
  sceneLineSpans?: SceneLineSpan[];
};

type DoctorStreamPayload =
  | { type: "doctor_progress"; event: DoctorProgressEvent }
  | { type: "doctor_result"; report: DoctorReportWithAnchors }
  | { type: "doctor_error"; error: string }
  | { type: "doctor_format_unrecognized"; reason: string; hint: string };

/** Thrown by streamDoctorProgress when the server recognized the submitted
 *  text as having no scene headings at all (upgrade item #3) rather than
 *  running the doctor on it — distinct from a plain Error/doctor_error so a
 *  caller can render its own "this isn't a screenplay" banner instead of the
 *  generic "Diagnosis failed" one. `message` carries `reason`; `hint` is the
 *  extra explanatory sentence. */
export class FormatUnrecognizedError extends Error {
  hint: string;
  constructor(reason: string, hint: string) {
    super(reason);
    this.name = "FormatUnrecognizedError";
    this.hint = hint;
  }
}

/** Folds one DoctorProgressEvent into the next progress state. `pass_complete`
 *  events can arrive out of submission order — the 14 passes run
 *  concurrently in diagnose-only mode (pipeline.ts) — so this counts events
 *  RECEIVED, not the highest passIndex seen; that stays correct regardless
 *  of completion order. */
export function applyDoctorProgressEvent(
  prev: DoctorStreamProgress,
  event: DoctorProgressEvent,
): DoctorStreamProgress {
  if (event.type === "stage") {
    if (event.stage === "passes_start") {
      return { stage: "passes", passesDone: 0, totalPasses: event.totalPasses };
    }
    return { ...prev, stage: event.stage };
  }
  // pass_complete
  return { ...prev, stage: "passes", passesDone: Math.min(prev.totalPasses, prev.passesDone + 1) };
}

/** Parses one SSE frame ("\n\n"-terminated, "data: <json>" line) into its
 *  JSON payload. Returns null for a frame with no `data:` line (a keep-alive
 *  or stray blank) rather than throwing, so the reader loop can never crash
 *  on a frame it doesn't recognize. */
function parseSSEFrame(frame: string): unknown | null {
  const line = frame.split("\n").find((l) => l.startsWith("data: "));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}

/**
 * POST /api/scriptide/doctor/stream and resolve with the final
 * ScriptDoctorReport, calling `onProgress` for every event the server
 * reports along the way. Throws a DOMException named "AbortError" when
 * `signal` fires (cancel or a caller's own watchdog — both abort the same
 * controller), or a plain Error with a user-facing message for anything
 * else.
 */
export async function streamDoctorProgress(
  body: { fountain: string; title?: string } | { fdx: string; title?: string },
  signal: AbortSignal,
  onProgress: (event: DoctorProgressEvent) => void,
): Promise<DoctorReportWithAnchors> {
  const res = await fetch("/api/scriptide/doctor/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(
      errBody?.error ??
        (res.status === 404
          ? "Script Doctor isn't live yet — the /api/scriptide/doctor/stream route hasn't been deployed."
          : `Diagnosis failed (${res.status})`)
    );
  }
  if (!res.body) {
    // No streaming body reader in this environment — never reached in a real
    // browser; guarded so a future non-streaming fetch shim fails loudly
    // instead of hanging forever waiting for frames that never arrive.
    throw new Error("Streaming response body unavailable in this environment.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalReport: DoctorReportWithAnchors | null = null;
  let serverError: string | null = null;
  let formatUnrecognized: { reason: string; hint: string } | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const payload = parseSSEFrame(frame) as DoctorStreamPayload | null;
      if (!payload) continue;
      if (payload.type === "doctor_progress") onProgress(payload.event);
      else if (payload.type === "doctor_result") finalReport = payload.report;
      else if (payload.type === "doctor_error") serverError = payload.error;
      else if (payload.type === "doctor_format_unrecognized") formatUnrecognized = payload;
    }
  }

  if (formatUnrecognized) throw new FormatUnrecognizedError(formatUnrecognized.reason, formatUnrecognized.hint);
  if (serverError) throw new Error(serverError);
  if (!finalReport) throw new Error("Diagnosis stream ended without a result — try again.");
  return finalReport;
}

/** Loading-state copy for the current streamed stage. */
export function doctorProgressLabel(progress: DoctorStreamProgress): string {
  switch (progress.stage) {
    case "parsing":
      return "Reading the script…";
    case "deep_read":
      return "Reading each scene's meaning with AI…";
    case "aggregating":
      return "Compiling the report…";
    case "passes":
    default:
      return `Running pass ${Math.min(progress.passesDone + 1, progress.totalPasses)} of ${progress.totalPasses}…`;
  }
}
