/**
 * Coverage summary — primary Coverage-mode surface (paper·ink·stamp).
 * Progressive depth: summary first; full Script Doctor is one click deeper.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Stethoscope, X, ArrowRight } from "lucide-react";
import type { ScriptDoctorReport } from "../../../server/nvm/analyze/types.ts";
import { title as sampleScriptTitle, fountain as sampleScriptFountain } from "../../lib/sample-script.ts";
import { isWholeDraftAnalysisComplete } from "../../lib/analysis-completeness.ts";
import { isDraftStale, type ThreadedCoverageReport } from "../../lib/coverage-staleness.ts";
import { computeJumpSpan } from "../../lib/jump-span.ts";
import {
  streamDoctorProgress,
  applyDoctorProgressEvent,
  doctorProgressLabel,
  DOCTOR_STREAM_TOTAL_PASSES,
  type DoctorStreamProgress,
  type DoctorReportWithAnchors,
} from "../../lib/doctor-stream.ts";

interface CoverageSummaryProps {
  fountain: string;
  title?: string;
  autoLoadSample?: boolean;
  /** G0-02: reads ScriptIDE's live draft generation. Captured when a coverage
   *  request starts and compared when it resolves so a late response can't
   *  clear the stale flag or install a sample over edits made during flight. */
  getDraftGeneration?: () => number;
  onOpenFullReport: () => void;
  /** Plain cursor move, no highlight — the original "Jump to line" wiring.
   *  Kept as the fallback for a host that has not wired
   *  {@link CoverageSummaryProps.onNavigateToFinding}; when both are present
   *  the highlighting one wins. */
  onJumpToLine?: (line1Based: number) => void;
  /** Scroll to a finding's 1-based inclusive line span AND flash-highlight it
   *  — FountainEditorHandle.highlightRange, the same path E2 gave the full
   *  doctor panel's findings. Coverage's own "Jump to line" button predates
   *  that work and was still calling the plain cursor-move above, so the same
   *  click landed differently depending on which of the two panels the writer
   *  clicked it in. Now it doesn't. */
  onNavigateToFinding?: (startLine: number, endLine: number) => void;
  onLoadSampleIntoEditor?: (text: string) => void;
  onClose: () => void;
  onFreshReport?: () => void;
  /** W4: hands the just-computed report (plus the draft generation it
   *  measured and its exact source/title) up to ScriptIDE so a later "Full
   *  report" click can thread it straight into ScriptDoctorPanel instead of
   *  that panel re-running the whole diagnosis cold. Fired under the exact
   *  same freshness gate as onFreshReport (see the `stale` check below) — a
   *  response this component itself treats as stale must never be handed up
   *  as if it were current. */
  onReportComputed?: (payload: ThreadedCoverageReport) => void;
}

type Status = "idle" | "loading" | "success" | "error";

function verdictLabel(v?: string): string {
  if (!v) return "—";
  return v.charAt(0) + v.slice(1).toLowerCase();
}

/**
 * Retrospective #8: the six stat tiles below (Critical/Major/Minor, Subtext
 * Ratio, Voice Separation, Resolved Qs) carried no explanation of what they
 * measure or which direction is better — a first-time writer has to guess
 * whether a high "Subtext Ratio" is good news. Each sentence below is
 * written from the ACTUAL producing code, not a guess:
 *   - bySeverity.critical/major/minor: server/nvm/analyze/doctor.ts's raw
 *     per-severity finding counts (fewer is better, self-evidently).
 *   - subtextRatio: server/nvm/analyze/fountain-analyzer.ts computes
 *     totalActionWords / (totalActionWords + totalDialogueWords) — an
 *     action-vs-dialogue WORD-COUNT split, not a literary subtext judgment.
 *     Nothing in the scoring pipeline attaches an ideal target to it (grep
 *     confirms doctor.ts only carries the number through), so the copy
 *     below does not invent a "higher/lower is better" claim the code
 *     doesn't make.
 *   - voiceAnalysis.pairs/swapRisk: server/nvm/analyze/voice-delta.ts's
 *     Burrows's-Delta pairwise comparison; swapRisk is true when two
 *     characters' dialogue is statistically indistinguishable (delta below
 *     0.15) — more non-swap-risk pairs (a higher fraction) is better.
 *   - questionLatencyOverall: fountain-analyzer.ts's detectQuestionLatency
 *     walks the document tracking every substantive dialogue question
 *     against whether a LATER line's content words answer it — more
 *     resolved (closer to the total) is better (fewer dangling threads).
 * Each definition is BOTH the button's title= (desktop hover) and the
 * always-present, aria-describedby-linked paragraph a screen reader
 * announces regardless of interaction; tapping/clicking the "i" toggle also
 * reveals it visually, which is what makes it reachable on touch (title=
 * alone never fires there).
 */
const STAT_DEFINITIONS = {
  critical: "Findings the doctor rates severity: critical — the issues most likely to break the read. Fewer is better.",
  major: "Findings rated severity: major — real craft problems short of critical. Fewer is better.",
  minor: "Findings rated severity: minor — smaller polish notes. Fewer is better.",
  subtextRatio:
    "Share of the script's words that are action/description rather than dialogue (action words ÷ action+dialogue words). A word-count split, not a judgment of literary subtlety — there's no single ideal ratio.",
  voiceSeparation:
    "Character pairs whose dialogue is statistically distinguishable (Burrows's Delta) out of every pair with enough dialogue to test. Higher is better — a low pair risks two characters sounding interchangeable.",
  resolvedQs:
    "Substantive questions raised in dialogue that a later line goes on to answer, out of every question raised. Higher (closer to the total) is better — the gap is open threads left dangling.",
} as const;

/** One stat tile: label + value, with an info toggle that's the hover title
 *  AND an always-present aria-describedby target (for screen readers) AND a
 *  tap-to-reveal visible caption (for touch, where title= never fires). */
function StatTile({
  id,
  label,
  description,
  cardClassName = "sm-card py-3 text-center",
  valueClassName = "mt-1 font-[family-name:var(--sm-font-mono)] text-lg font-bold text-[var(--sm-ink)]",
  children,
}: {
  id: string;
  label: string;
  description: string;
  cardClassName?: string;
  valueClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const descId = `${id}-desc`;
  return (
    <div className={cardClassName} aria-describedby={descId}>
      <div className="flex items-center justify-center gap-1">
        <p className="sm-h">{label}</p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`What does ${label} measure?`}
          title={description}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[8px] font-bold normal-case leading-none text-[var(--sm-ink-mute)] opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          i
        </button>
      </div>
      <p className={valueClassName}>
        {children}
      </p>
      {/* Always in the DOM (so aria-describedby always has something for a
          screen reader to announce); `sr-only` visually hides it until the
          "i" toggle opens it — the only way a touch user, who never
          triggers title=, can see it. */}
      <p
        id={descId}
        className={`mt-1.5 text-left text-[9px] font-normal normal-case leading-snug text-[var(--sm-ink-mute)] ${open ? "" : "sr-only"}`}
      >
        {description}
      </p>
    </div>
  );
}

export default function CoverageSummary({
  fountain,
  title,
  autoLoadSample = false,
  getDraftGeneration,
  onOpenFullReport,
  onJumpToLine,
  onNavigateToFinding,
  onLoadSampleIntoEditor,
  onClose,
  onFreshReport,
  onReportComputed,
}: CoverageSummaryProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  // DoctorReportWithAnchors, not the bare ScriptDoctorReport: the route
  // attaches `locatedIssues` to every doctor response (server/routes/
  // scriptide.ts), and the jump button below reads them to resolve the top
  // priority's prose location to the span the server already computed for it.
  const [report, setReport] = useState<DoctorReportWithAnchors | null>(null);
  const [usingSample, setUsingSample] = useState(false);
  // P2 (Phase E punch list): live per-pass progress for the streamed run —
  // null while no streamed run is in flight, matching ScriptDoctorPanel's
  // own streamProgress contract (../../lib/doctor-stream.ts).
  const [streamProgress, setStreamProgress] = useState<DoctorStreamProgress | null>(null);
  const genRef = useRef(0);
  const sampleFired = useRef(false);
  // G0-02: false once the panel unmounts (Coverage closed mid-flight), so a
  // late response can't invoke parent callbacks over a torn-down editor.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);
  // Live AbortController for the in-flight streamed run, so Cancel can stop
  // it server-side the same way ScriptDoctorPanel's cancelDiagnosis does —
  // aborting the fetch closes the connection, which frees the doctor-pool
  // worker immediately (server/nvm/analyze/doctor-pool.ts) rather than
  // leaving it to run to completion for a result nobody will see.
  const abortRef = useRef<AbortController | null>(null);
  // Set only by the Cancel button's own handler, so the catch block can tell
  // a real Cancel apart from the 120s watchdog or a teardown/superseded
  // abort — all three share the same DOMException("AbortError") shape.
  const userCancelledRef = useRef(false);

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
      // G0-02: draft version this request is measuring. Compared at resolution
      // so edits made during flight invalidate the result.
      const startDraftGen = getDraftGeneration?.() ?? 0;
      setStatus("loading");
      setError(null);
      // Watchdog. This is the FIRST request a new visitor's browser makes
      // ("Try sample coverage" lands here), and without a deadline a stalled
      // connection — a proxy that never errors, a very long draft — left the
      // panel on "Reading the draft…" forever, with the re-run button disabled
      // while loading so the only escape was closing and reopening the panel.
      // Mirrors runDiagnosis's proven pattern in ScriptDoctorPanel.tsx, with
      // `timedOut` distinguishing a real deadline from a teardown/superseded
      // abort so only the former paints an error.
      const controller = new AbortController();
      abortRef.current = controller;
      userCancelledRef.current = false;
      setStreamProgress(null);
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 120_000);
      try {
        // P2 (Phase E punch list): same streamed client ScriptDoctorPanel
        // uses (../../lib/doctor-stream.ts) — turns this panel's loading
        // state into a live "Running pass N of 14…" readout instead of a
        // static "Reading the draft…" spinner for the whole run, and gives
        // Cancel (below) something real to stop server-side.
        const data = await streamDoctorProgress(
          {
            fountain: override?.fountain ?? fountain,
            title: override?.title ?? title ?? "Untitled",
          },
          controller.signal,
          (event) => {
            if (gen !== genRef.current) return; // superseded — ignore
            setStreamProgress((prev) =>
              applyDoctorProgressEvent(
                prev ?? { stage: "parsing", passesDone: 0, totalPasses: DOCTOR_STREAM_TOTAL_PASSES },
                event,
              ),
            );
          },
        );
        if (gen !== genRef.current) return;
        // G0-02: Coverage closed mid-flight, or the writer typed during the
        // request. Show the numbers we computed, but never write back over the
        // live draft (onLoadSampleIntoEditor) and never clear the stale flag
        // (onFreshReport) — the parent keeps "coverage outdated" so the writer
        // is told to re-run against their current draft.
        const stale = !aliveRef.current || isDraftStale(startDraftGen, getDraftGeneration?.() ?? startDraftGen);
        setReport(data);
        setUsingSample(!!override?.sample);
        setStatus("success");
        if (stale) return;
        onFreshReport?.();
        if (override?.sample && onLoadSampleIntoEditor) {
          onLoadSampleIntoEditor(override.fountain);
        }
        // W4: hand the computed report up so "Full report" can thread it into
        // ScriptDoctorPanel instead of that panel re-running cold. Generation
        // is read FRESH here, after the sample-install branch above rather
        // than reusing startDraftGen — installDraft's mutateDraft() bumps the
        // shared draft generation by design (every real content mutation
        // must, so a later report/fix can detect it), and for a sample run
        // that bump happens on the very same content this report just
        // measured. Reusing the pre-install startDraftGen would make a
        // report that is byte-identical to what's now on screen look stale
        // the instant it lands — a false "Coverage outdated" on the P0
        // golden path this fix exists to protect. For a non-sample run,
        // getDraftGeneration() here is guaranteed to equal startDraftGen —
        // the `stale` check above already returned before this point if the
        // writer edited during flight — so this is a safe substitution
        // either way, not a behavior change for the common case.
        onReportComputed?.({
          report: data,
          generation: getDraftGeneration?.() ?? startDraftGen,
          title: override?.title ?? title ?? "Untitled",
          fountain: override?.fountain ?? fountain,
          isSample: !!override?.sample,
        });
      } catch (e) {
        if (gen !== genRef.current) return;
        // A non-timeout, non-user-cancel abort means this run was superseded
        // or the panel was torn down — that is not an error the writer
        // should see. A real Cancel click goes back to idle (stopped, not
        // failed), matching ScriptDoctorPanel's cancelDiagnosis.
        if ((e as Error).name === "AbortError" && !timedOut) {
          if (userCancelledRef.current) setStatus("idle");
          return;
        }
        setStatus("error");
        setError(
          timedOut
            ? "Coverage timed out. The draft may be very long, or the connection stalled — try again."
            : (e as Error).message || "Coverage failed.",
        );
      } finally {
        clearTimeout(timeoutId);
        setStreamProgress(null);
      }
    },
    [fountain, title, onFreshReport, onReportComputed, onLoadSampleIntoEditor, getDraftGeneration],
  );

  /** Cancel the in-flight streamed run (loading state only) — stops it for
   *  real, not just the client's wait for it. Mirrors ScriptDoctorPanel's
   *  cancelDiagnosis exactly: aborting the fetch closes the connection,
   *  which frees the doctor-pool worker server-side immediately. */
  const cancelRun = useCallback(() => {
    userCancelledRef.current = true;
    abortRef.current?.abort();
  }, []);

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

  // Escape closes the panel, matching ScriptDoctorPanel's overlay convention
  // (same coverage flow, one click deeper — keyboard behavior should not
  // differ between the two). Calling the onClose prop directly (rather than
  // relying solely on ScriptIDE's document-level Escape ladder) matters: the
  // ladder's generic "close the open tool slot" branch does not reset
  // doctorAutoSample the way this panel's own close button does, so without
  // this handler, Escape-closing a sample-driven run left doctorAutoSample
  // stuck true and silently re-triggered the sample the next time Coverage
  // opened instead of running on the writer's actual draft.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const top = report?.topPriorities?.[0];
  const root = report?.rootCauses?.[0];
  const reportIsComplete = report ? isWholeDraftAnalysisComplete(report) : false;
  // The span the "Jump to line" button targets. A root cause already carries
  // one (its member issues' combined scene span); a topPriority carries only
  // the free-form location string a revision pass wrote, so parse the
  // "Lines N-M" / "Line N" shape out of it — both endpoints now, not just the
  // first, so a multi-line finding highlights the lines it actually covers
  // instead of one arbitrary line of them. A location with no line numbers
  // (scene-, act- or document-level) yields no span and no button, exactly as
  // before. Both endpoints are clamped editor-side by highlightRange, so a
  // span computed against text the writer has since edited cannot throw.
  //
  // Three sources, in the order that matches what the card actually says.
  // The card leads with the TOP PRIORITY's description, so its own anchor
  // comes first: the server already resolved every issue's prose location to
  // a span (report.locatedIssues, attached at the route) using the honest
  // four-tier anchoring in server/nvm/analyze/locate.ts — scene, lines,
  // character, or document (no span). Reading that map is what makes the
  // button appear for the ordinary case of a scene-level top priority
  // ("Scene 9 (climax peak)"), which the old line-number regex could never
  // resolve and which therefore showed no jump button at all. The root
  // cause's own span is the fallback, and the regex parse is the last resort
  // for a report shape that predates locatedIssues.
  // Retrospective #10 (tighter jump highlight): computeJumpSpan prefers a
  // line-precise member span over a root cause's own wider envelope — see
  // its doc comment in jump-span.ts for the full four-source priority order.
  const jumpSpan = computeJumpSpan({
    topLocation: top?.location,
    root,
    locatedIssues: report?.locatedIssues,
  });

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
          <h2 id="coverage-summary-title" className="sm-title !text-[var(--sm-cream)]">
            Coverage
          </h2>
          {/* a11y pass: raw --sm-cream/45 measured 4.00:1 on this dark
              header bar — under the 4.5:1 AA text minimum; --sm-cream-mute
              is the same tone tuned to 6.3-6.7:1. */}
          <p className="truncate font-[family-name:var(--sm-font-mono)] text-[9px] uppercase tracking-[0.14em] text-[var(--sm-cream-mute)]">
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
          <div className="sm-card border-[var(--sm-ink)] bg-[var(--sm-panel)]">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--sm-ink-mute)]" aria-hidden="true" />
              <span className="sm-slug" role="status" aria-live="polite">
                {streamProgress ? doctorProgressLabel(streamProgress) : "Reading the draft…"}
              </span>
            </div>
            {/* P2 (Phase E punch list): live per-pass counter — the same
                signal ScriptDoctorPanel's loading state shows, now visible
                on the first-contact sample/Coverage-summary path too. */}
            {streamProgress && streamProgress.stage === "passes" && (
              <div className="mt-3">
                <div
                  className="h-1.5 w-full bg-[var(--sm-ink)]/10 border border-[var(--sm-ink)]/20 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={streamProgress.passesDone}
                  aria-valuemin={0}
                  aria-valuemax={streamProgress.totalPasses}
                  aria-label="Revision passes completed"
                >
                  <div
                    className="h-full bg-[var(--sm-ink)]/60 transition-[width] duration-300"
                    style={{ width: `${Math.round((streamProgress.passesDone / streamProgress.totalPasses) * 100)}%` }}
                  />
                </div>
                <p className="sm-slug mt-1">
                  {streamProgress.passesDone} / {streamProgress.totalPasses} passes
                </p>
              </div>
            )}
            <div className="mt-3">
              <button type="button" onClick={cancelRun} className="sm-btn" aria-label="Cancel this coverage run">
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
              </button>
            </div>
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
          !reportIsComplete ? (
            /* P0: a failed pass or scene-truncated prefix makes health/grade
               sentinels (0 / troubled) unsafe to display as real scores. */
            <div className="sm-card border-[var(--sm-ink)] bg-[var(--sm-panel)]">
              {/* a11y pass: `.sm-h` bakes in its own `color` and loads after
                  Tailwind in the cascade — a same-specificity utility color
                  here silently loses to it without `!`, rendering
                  --sm-ink-faint (the light-context default) instead of the
                  intended stamp color. */}
              <p className="sm-h !text-[var(--sm-stamp-on-light)]">Analysis incomplete</p>
              <p className="mt-2 font-[family-name:var(--sm-font-display)] text-2xl uppercase leading-none text-[var(--sm-ink)]">
                Score withheld
              </p>
              <p className="mt-3 text-sm leading-snug text-[var(--sm-ink-soft)]">
                {report.plainSummary ||
                  "Analysis could not be completed across the whole draft. Health, verdict, and percentiles are withheld."}
              </p>
              {Array.isArray(report.failedPasses) && report.failedPasses.length > 0 && (
                <p className="sm-slug mt-3">Failed passes: {report.failedPasses.join(", ")}</p>
              )}
              <p className="sm-slug mt-2">
                {report.truncatedForAnalysis && report.totalSceneCount !== undefined ? (
                  <>
                    {report.sceneCount.toLocaleString()} of {report.totalSceneCount.toLocaleString()} scenes analyzed · {report.totalIssues} issue
                    {report.totalIssues === 1 ? "" : "s"} observed in the analyzed portion
                  </>
                ) : (
                  <>
                    {report.sceneCount} scene{report.sceneCount === 1 ? "" : "s"} · {report.wordCount.toLocaleString()} words · {report.totalIssues} issue
                    {report.totalIssues === 1 ? "" : "s"} observed before analysis became incomplete
                  </>
                )}
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
              <StatTile
                id="tile-critical"
                label="Critical"
                description={STAT_DEFINITIONS.critical}
                valueClassName="mt-1 font-[family-name:var(--sm-font-mono)] text-lg font-bold text-[var(--sm-stamp-on-light)]"
              >
                {report.bySeverity.critical}
              </StatTile>
              <StatTile id="tile-major" label="Major" description={STAT_DEFINITIONS.major}>
                {report.bySeverity.major}
              </StatTile>
              <StatTile
                id="tile-minor"
                label="Minor"
                description={STAT_DEFINITIONS.minor}
                valueClassName="mt-1 font-[family-name:var(--sm-font-mono)] text-lg font-bold text-[var(--sm-ink-mute)]"
              >
                {report.bySeverity.minor}
              </StatTile>
            </div>

            {/* Batch 2 Metrics: Subtext, Voice Separation & Question Latency */}
            <div className="grid grid-cols-3 gap-2">
              <StatTile
                id="tile-subtext-ratio"
                label="Subtext Ratio"
                description={STAT_DEFINITIONS.subtextRatio}
                cardClassName="sm-card py-2 text-center"
                valueClassName="mt-1 font-[family-name:var(--sm-font-mono)] text-sm font-bold text-[var(--sm-ink)]"
              >
                {typeof report.subtextRatio === 'number' ? `${Math.round(report.subtextRatio * 100)}%` : '—'}
              </StatTile>
              <StatTile
                id="tile-voice-separation"
                label="Voice Separation"
                description={STAT_DEFINITIONS.voiceSeparation}
                cardClassName="sm-card py-2 text-center"
                valueClassName="mt-1 font-[family-name:var(--sm-font-mono)] text-sm font-bold text-[var(--sm-ink)]"
              >
                {report.voiceAnalysis?.scored ? `${report.voiceAnalysis.pairs.filter(p => !p.swapRisk).length}/${report.voiceAnalysis.pairs.length} Pairs` : 'N/A'}
              </StatTile>
              <StatTile
                id="tile-resolved-qs"
                label="Resolved Qs"
                description={STAT_DEFINITIONS.resolvedQs}
                cardClassName="sm-card py-2 text-center"
                valueClassName="mt-1 font-[family-name:var(--sm-font-mono)] text-sm font-bold text-[var(--sm-ink)]"
              >
                {report.questionLatencyOverall ? `${report.questionLatencyOverall.totalResolved}/${report.questionLatencyOverall.totalQuestions}` : '—'}
              </StatTile>
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
                {jumpSpan && (onNavigateToFinding || onJumpToLine) && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToFinding
                        ? onNavigateToFinding(jumpSpan.startLine, jumpSpan.endLine)
                        : onJumpToLine?.(jumpSpan.startLine)
                    }
                    className="sm-btn sm-btn--stamp"
                  >
                    Jump to line {jumpSpan.startLine}
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
