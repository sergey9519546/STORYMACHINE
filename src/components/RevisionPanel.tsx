// Wave 39 — Revision Panel
// Shows the multi-pass revision pipeline UI: trigger revision, view per-pass
// diffs with issue breakdowns, pick which pass's output to keep, and
// optionally protect specific line ranges from being rewritten at all.
// Pass count is data-driven (totalPasses from the SSE stream), so this UI adapts
// automatically as passes are added to the pipeline (currently 14).
// H8: Uses SSE streaming endpoint so each pass result appears as it completes.
//
// Trust-the-UI fixes (this wave):
//  - "View changes" now renders a REAL per-pass diff (src/lib/diff.ts) instead
//    of just a prose summary — previously promised in this header comment but
//    never actually shown.
//  - Replaced independent per-pass accept/reject with an honest cumulative
//    "use result up to this pass" selector: passes build on each other, so
//    rejecting pass N could never truly un-apply it from pass N+1's input.
//    The old accept/reject buttons implied otherwise; they're gone.
//  - Added a "Protected spans" front door: the only way approvedSpans
//    (server/nvm/revision/passes/types.ts) could reach the revision pipeline
//    used to be hand-crafting a request outside the UI. Now the panel lets an
//    author mark line ranges as protected, sends them via the existing
//    non-streaming POST /api/nvm/revise, and — since the server's protection
//    is a prompt-level request to the LLM, not a hard guarantee — verifies
//    client-side that protected lines actually survived.

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { diffLines, type DiffLine } from '../lib/diff.ts';

interface RevisionIssue {
  location: string;
  rule: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix?: string;
}

interface PassResult {
  pass: string;
  issues: RevisionIssue[];
  revisedFountain: string;
  changed: boolean;
  summary: string;
}

interface RevisionResult {
  passResults: PassResult[];
  finalFountain: string;
  originalFountain: string;
  totalIssuesFound: number;
  passesWithChanges: number;
  completedAt: number;
}

interface RevisionPanelProps {
  onClose: () => void;
}

// Client-side mirror of server/nvm/revision/passes/types.ts's ApprovedSpan,
// plus a UI-only `id` for React keys / removal. The `id` is stripped before
// the span is sent to the server (which only knows startLine/endLine/reason).
interface UiApprovedSpan {
  id: string;
  startLine: number;
  endLine: number;
  reason: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-red-400 bg-red-950/40 border-red-800',
  major:    'text-orange-400 bg-orange-950/40 border-orange-800',
  minor:    'text-yellow-400 bg-yellow-950/40 border-yellow-800',
};

const PASS_ICONS: Record<string, string> = {
  structure:      '🏛',
  causality:      '🔗',
  intention:      '🎯',
  belief:         '🧠',
  conflict:       '⚔️',
  'character-arc':'🌊',
  dialogue:       '💬',
  rhythm:         '🎵',
  pacing:         '⏱',
  originality:    '✨',
  payoff:         '🎁',
  voice:          '🎭',
  theme:          '📜',
  'relationship-arc': '🤝',
};

const SPANS_STORAGE_KEY = 'sm_revision_spans_v1';

// Small, dependency-free, deterministic hash (FNV-1a, 32-bit) over the first
// 64 characters of a script — used only to notice "this is probably a
// different draft than when these spans were saved," not for security.
function hashPrefix(text: string): string {
  const sample = text.slice(0, 64);
  let hash = 0x811c9dc5;
  for (let i = 0; i < sample.length; i++) {
    hash ^= sample.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

// The fountain text a given pass actually revised FROM — pass 0 revises the
// original compile, every later pass revises the previous pass's output.
function inputFountainFor(idx: number, result: RevisionResult): string {
  return idx === 0 ? result.originalFountain : result.passResults[idx - 1].revisedFountain;
}

function diffRowClass(type: DiffLine['type']): string {
  if (type === 'added') return 'bg-green-950/40 text-green-300';
  if (type === 'removed') return 'bg-red-950/40 text-red-300';
  return 'text-zinc-500';
}

function DiffRow({ d }: { d: DiffLine }) {
  const marker = d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' ';
  return (
    <div className={`flex px-2 ${diffRowClass(d.type)}`}>
      <span className="w-9 flex-shrink-0 text-right pr-2 text-zinc-600 select-none">{d.beforeLine ?? ''}</span>
      <span className="w-9 flex-shrink-0 text-right pr-2 text-zinc-600 select-none">{d.afterLine ?? ''}</span>
      <span className="w-3 flex-shrink-0 select-none">{marker}</span>
      <span className="whitespace-pre-wrap break-all flex-1">{d.line.length > 0 ? d.line : ' '}</span>
    </div>
  );
}

const COLLAPSE_RUN_THRESHOLD = 6;

// Renders a real line diff between two fountain strings: unchanged runs
// longer than the threshold collapse behind an "⋯ N unchanged lines ⋯"
// separator (click to expand), changed lines render as classic green/red
// add/remove rows with line numbers on both sides.
function PassDiffView({ before, after }: { before: string; after: string }) {
  const diff = useMemo(() => diffLines(before, after), [before, after]);
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());

  const rows: React.ReactNode[] = [];
  let i = 0;
  let runIdx = 0;
  while (i < diff.length) {
    if (diff[i].type === 'same') {
      let j = i;
      while (j < diff.length && diff[j].type === 'same') j++;
      const runLength = j - i;
      const thisRun = runIdx++;
      if (runLength > COLLAPSE_RUN_THRESHOLD && !expandedRuns.has(thisRun)) {
        rows.push(
          <button
            key={`run-${i}`}
            onClick={() => setExpandedRuns(prev => new Set(prev).add(thisRun))}
            className="w-full text-left px-3 py-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 transition-colors"
          >
            ⋯ {runLength} unchanged lines ⋯
          </button>,
        );
      } else {
        for (let k = i; k < j; k++) rows.push(<DiffRow key={`same-${k}`} d={diff[k]} />);
      }
      i = j;
    } else {
      rows.push(<DiffRow key={`chg-${i}`} d={diff[i]} />);
      i++;
    }
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded border border-zinc-800 bg-zinc-950/50 text-[11px] font-mono leading-5">
      {rows.length > 0 ? rows : (
        <div className="px-3 py-4 text-center text-zinc-600">No line-level differences.</div>
      )}
    </div>
  );
}

// Read-only, numbered, clickable preview of the current fountain — the input
// surface for "Protected spans." Clicking a line sets the start of a new
// range; clicking a second line closes the range (either order). Existing
// protected spans and the range currently being defined are highlighted.
function ProtectedSpansPreview({
  fountain, spans, pendingStart, pendingEnd, onLineClick,
}: {
  fountain: string;
  spans: UiApprovedSpan[];
  pendingStart: number | null;
  pendingEnd: number | null;
  onLineClick: (line: number) => void;
}) {
  const lines = fountain === '' ? [] : fountain.split('\n');
  const lo = pendingStart !== null && pendingEnd !== null ? Math.min(pendingStart, pendingEnd) : null;
  const hi = pendingStart !== null && pendingEnd !== null ? Math.max(pendingStart, pendingEnd) : null;

  return (
    <div className="max-h-56 overflow-y-auto rounded border border-zinc-800 bg-zinc-950/50 text-[11px] font-mono leading-5">
      {lines.map((line, idx) => {
        const lineNum = idx + 1;
        const span = spans.find(s => lineNum >= s.startLine && lineNum <= s.endLine);
        const pending = lo !== null && hi !== null && lineNum >= lo && lineNum <= hi;
        return (
          <div
            key={idx}
            onClick={() => onLineClick(lineNum)}
            title={span ? `Protected: ${span.reason}` : 'Click to start/end a protected range'}
            className={`flex px-2 cursor-pointer hover:bg-zinc-800/60 ${
              span ? 'bg-blue-950/40 border-l-2 border-blue-500' :
              pending ? 'bg-purple-950/30 border-l-2 border-purple-500' : ''
            }`}
          >
            <span className="w-9 flex-shrink-0 text-right pr-2 text-zinc-600 select-none">{lineNum}</span>
            <span className="whitespace-pre-wrap break-all flex-1 text-zinc-300">{line.length > 0 ? line : ' '}</span>
          </div>
        );
      })}
      {lines.length === 0 && (
        <div className="px-3 py-6 text-center text-zinc-600">
          Nothing compiled yet — write or advance a scene, then reopen this panel.
        </div>
      )}
    </div>
  );
}

export function RevisionPanel({ onClose }: RevisionPanelProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RevisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedPass, setExpandedPass] = useState<string | null>(null);
  // H8: Live per-pass progress — appended as each SSE pass_complete event arrives
  const [streamedPasses, setStreamedPasses] = useState<PassResult[]>([]);
  const [streamProgress, setStreamProgress] = useState<{ done: number; total: number } | null>(null);
  const evtRef = useRef<EventSource | null>(null);

  // ── Honest chain semantics ───────────────────────────────────────────────
  // One selected pass drives the actual output. Passes build on each other,
  // so this is a CUTOFF ("use everything through pass i"), not an independent
  // per-pass accept/reject list — that would be a lie, since rejecting pass N
  // can't un-apply it from what pass N+1 already rewrote.
  const [selectedPassIndex, setSelectedPassIndex] = useState<number | null>(null);
  // Visual-only annotations — never affect the output. Purely for the
  // author's own note-taking ("come back and look at this pass again").
  const [flaggedPasses, setFlaggedPasses] = useState<Set<string>>(new Set());
  const [diffOpenPasses, setDiffOpenPasses] = useState<Set<string>>(new Set());

  // ── Span locks (approvedSpans front door) ────────────────────────────────
  const [previewFountain, setPreviewFountain] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [spansSectionOpen, setSpansSectionOpen] = useState(false);
  const [spans, setSpans] = useState<UiApprovedSpan[]>([]);
  const [staleSpans, setStaleSpans] = useState<{ fountainHash: string; spans: UiApprovedSpan[] } | null>(null);
  const [spansReady, setSpansReady] = useState(false); // localStorage reconciled at least once
  const [spanStart, setSpanStart] = useState('');
  const [spanEnd, setSpanEnd] = useState('');
  const [spanReason, setSpanReason] = useState('');
  const [spanError, setSpanError] = useState<string | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  // null = last run used the streaming (unprotected) path; a number = last
  // run was span-locked, with that many spans sent.
  const [lastRunSpanCount, setLastRunSpanCount] = useState<number | null>(null);
  const [spanViolations, setSpanViolations] = useState<UiApprovedSpan[] | null>(null);

  useEffect(() => {
    return () => { evtRef.current?.close(); };
  }, []);

  // Fetch a read-only preview of the current fountain once, on open, purely
  // to populate the protected-spans line picker. Cheap game-tier endpoint —
  // does not touch the AI-backed revision pipeline.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/nvm/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`compile failed (${r.status})`))))
      .then((data: { compiled?: { fountain?: string } }) => {
        if (!cancelled) setPreviewFountain(data.compiled?.fountain ?? '');
      })
      .catch(() => {
        if (!cancelled) { setPreviewFountain(''); setPreviewError('Could not load a preview — write or compile a scene first.'); }
      });
    return () => { cancelled = true; };
  }, []);

  // Reconcile any saved spans against the CURRENT fountain exactly once,
  // as soon as the preview is available. Runs at most once per mount —
  // `spansReady` gates it, and it's set true here (batched with whichever of
  // setSpans/setStaleSpans also fires) so the persist effect below never
  // observes a stale intermediate `spans` value.
  useEffect(() => {
    if (previewFountain === null || spansReady) return;
    try {
      const raw = localStorage.getItem(SPANS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { fountainHash?: unknown; spans?: unknown };
        if (typeof parsed.fountainHash === 'string' && Array.isArray(parsed.spans)) {
          const valid = parsed.spans.every((s): s is UiApprovedSpan =>
            s && typeof s === 'object' &&
            typeof (s as UiApprovedSpan).id === 'string' &&
            typeof (s as UiApprovedSpan).startLine === 'number' &&
            typeof (s as UiApprovedSpan).endLine === 'number' &&
            typeof (s as UiApprovedSpan).reason === 'string');
          if (valid) {
            const currentHash = hashPrefix(previewFountain);
            if (parsed.fountainHash === currentHash) {
              setSpans(parsed.spans as UiApprovedSpan[]);
            } else {
              // Different draft — do NOT silently apply; park for the user to decide.
              setStaleSpans({ fountainHash: parsed.fountainHash, spans: parsed.spans as UiApprovedSpan[] });
            }
          }
        }
      }
    } catch { /* corrupt localStorage entry — ignore, start fresh */ }
    setSpansReady(true);
  }, [previewFountain, spansReady]);

  // Persist spans on every change — but never while a stale-spans decision
  // is still pending, or we'd silently overwrite the very data "Restore"
  // needs before the user has chosen "Restore" or "Clear".
  useEffect(() => {
    if (!spansReady || previewFountain === null || staleSpans !== null) return;
    try {
      localStorage.setItem(SPANS_STORAGE_KEY, JSON.stringify({ fountainHash: hashPrefix(previewFountain), spans }));
    } catch { /* localStorage unavailable/full — spans still work for this session */ }
  }, [spans, previewFountain, spansReady, staleSpans]);

  const restoreStaleSpans = useCallback(() => {
    if (!staleSpans) return;
    setSpans(staleSpans.spans);
    setStaleSpans(null);
  }, [staleSpans]);

  const clearStaleSpans = useCallback(() => setStaleSpans(null), []);

  const onPreviewLineClick = useCallback((lineNum: number) => {
    setSelectionAnchor(prev => {
      if (prev === null) {
        setSpanStart(String(lineNum));
        setSpanEnd(String(lineNum));
        return lineNum;
      }
      setSpanStart(String(Math.min(prev, lineNum)));
      setSpanEnd(String(Math.max(prev, lineNum)));
      return null;
    });
  }, []);

  const addSpan = useCallback(() => {
    setSpanError(null);
    const start = Number(spanStart);
    const end = Number(spanEnd);
    const reason = spanReason.trim();
    const totalLines = previewFountain ? (previewFountain === '' ? 0 : previewFountain.split('\n').length) : 0;

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) {
      setSpanError('Start and end must be positive line numbers.'); return;
    }
    if (start > end) { setSpanError('Start line must be on or before end line.'); return; }
    if (totalLines > 0 && end > totalLines) {
      setSpanError(`End line ${end} is past the end of the script (${totalLines} lines).`); return;
    }
    if (!reason) { setSpanError('A short reason is required, e.g. "final joke — timing is exact".'); return; }
    if (reason.length > 300) { setSpanError('Reason is too long (300 characters max).'); return; }
    const overlap = spans.find(s => start <= s.endLine && end >= s.startLine);
    if (overlap) {
      setSpanError(`Overlaps an existing protected span (lines ${overlap.startLine}–${overlap.endLine}).`); return;
    }

    setSpans(prev => [...prev, {
      id: `span-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startLine: start, endLine: end, reason,
    }]);
    setSpanStart(''); setSpanEnd(''); setSpanReason(''); setSelectionAnchor(null);
  }, [spanStart, spanEnd, spanReason, spans, previewFountain]);

  const removeSpan = useCallback((id: string) => {
    setSpans(prev => prev.filter(s => s.id !== id));
  }, []);

  // Shared reset of everything result-shaped, used at the start of BOTH the
  // streaming and non-streaming run paths.
  const resetForNewRun = useCallback(() => {
    setError(null);
    setResult(null);
    setStreamedPasses([]);
    setStreamProgress(null);
    setSelectedPassIndex(null);
    setFlaggedPasses(new Set());
    setDiffOpenPasses(new Set());
    setSpanViolations(null);
    setExpandedPass(null);
  }, []);

  const runStreamingRevision = useCallback(() => {
    if (evtRef.current) { evtRef.current.close(); evtRef.current = null; }
    setRunning(true);
    resetForNewRun();
    setLastRunSpanCount(null);

    const es = new EventSource('/api/nvm/revise-stream');
    evtRef.current = es;

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as
          | { type: 'pass_complete'; passIndex: number; totalPasses: number; passResult: PassResult }
          | { type: 'revision_complete'; result: RevisionResult }
          | { type: 'revision_error'; error: string };

        if (data.type === 'pass_complete') {
          setStreamedPasses(prev => [...prev, data.passResult]);
          setStreamProgress({ done: data.passIndex + 1, total: data.totalPasses });
        } else if (data.type === 'revision_complete') {
          setResult(data.result);
          setRunning(false);
          es.close();
          evtRef.current = null;
        } else if (data.type === 'revision_error') {
          setError(data.error);
          setRunning(false);
          es.close();
          evtRef.current = null;
        }
      } catch (parseErr) { console.warn('[RevisionPanel] SSE parse error:', parseErr); }
    };

    es.onerror = () => {
      setError('SSE connection lost — try again');
      setRunning(false);
      es.close();
      evtRef.current = null;
    };
  }, [resetForNewRun]);

  const runSpanLockedRevision = useCallback(async () => {
    if (evtRef.current) { evtRef.current.close(); evtRef.current = null; }
    setRunning(true);
    resetForNewRun();
    setLastRunSpanCount(spans.length);

    try {
      const res = await fetch('/api/nvm/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedSpans: spans.map(({ startLine, endLine, reason }) => ({ startLine, endLine, reason })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(body.error || `Revision failed (${res.status})`);
      }
      const json = (await res.json()) as RevisionResult;
      setResult(json);

      // CLIENT-SIDE ENFORCEMENT BACKSTOP: the server only asks the LLM (via
      // prompt) to leave approvedSpans untouched — that's best-effort, not a
      // guarantee. diffLines() against the actual original/final text is
      // ground truth, so this is the real check, not the prompt.
      const verifyDiff = diffLines(json.originalFountain, json.finalFountain);
      const unchangedBeforeLines = new Set(
        verifyDiff.filter(d => d.type === 'same').map(d => d.beforeLine),
      );
      const violated = spans.filter(span => {
        for (let line = span.startLine; line <= span.endLine; line++) {
          if (!unchangedBeforeLines.has(line)) return true;
        }
        return false;
      });
      setSpanViolations(violated.length > 0 ? violated : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Span-locked revision failed — try again');
    } finally {
      setRunning(false);
    }
  }, [spans, resetForNewRun]);

  const runRevision = useCallback(() => {
    if (spans.length > 0) {
      void runSpanLockedRevision();
    } else {
      runStreamingRevision();
    }
  }, [spans, runSpanLockedRevision, runStreamingRevision]);

  // The one fountain string that actually represents "the result" right now
  // — driven entirely by the cumulative selector, defaulting to the last pass.
  const effectiveSelectedIndex = result && result.passResults.length > 0
    ? Math.max(0, Math.min(selectedPassIndex ?? result.passResults.length - 1, result.passResults.length - 1))
    : null;

  const effectiveFinalFountain = useMemo(() => {
    if (!result) return null;
    if (effectiveSelectedIndex === null) return result.finalFountain;
    return result.passResults[effectiveSelectedIndex].revisedFountain;
  }, [result, effectiveSelectedIndex]);

  // Summary strip: net lines added/removed relative to the ORIGINAL,
  // reflecting whatever the selector currently points at.
  const chainStats = useMemo(() => {
    if (!result || effectiveFinalFountain === null) return null;
    const diff = diffLines(result.originalFountain, effectiveFinalFountain);
    let added = 0, removed = 0;
    for (const d of diff) { if (d.type === 'added') added++; else if (d.type === 'removed') removed++; }
    return { added, removed };
  }, [result, effectiveFinalFountain]);

  const downloadFountain = useCallback(() => {
    const text = effectiveFinalFountain ?? result?.finalFountain ?? '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revised_screenplay.fountain';
    a.click();
    URL.revokeObjectURL(url);
  }, [effectiveFinalFountain, result]);

  const toggleFlag = useCallback((passName: string) => {
    setFlaggedPasses(prev => {
      const s = new Set(prev);
      if (s.has(passName)) s.delete(passName); else s.add(passName);
      return s;
    });
  }, []);

  const toggleDiffOpen = useCallback((passName: string) => {
    setDiffOpenPasses(prev => {
      const s = new Set(prev);
      if (s.has(passName)) s.delete(passName); else s.add(passName);
      return s;
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60">
      <div className="h-full w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">14-Pass Revision Pipeline</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Diagnose → mark → rewrite → preserve</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">✕</button>
        </div>

        {/* Protected spans — approvedSpans front door */}
        <div className="border-b border-zinc-800/50 flex-shrink-0">
          <button
            onClick={() => setSpansSectionOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-900/40 transition-colors"
          >
            <span className="text-xs font-semibold text-zinc-300">
              🔒 Protected spans{spans.length > 0 && <span className="text-blue-400"> ({spans.length})</span>}
            </span>
            <span className="text-zinc-600 text-xs">{spansSectionOpen ? '▲' : '▼'}</span>
          </button>
          {spansSectionOpen && (
            <div className="px-4 pb-3 space-y-2.5">
              <p className="text-xs text-zinc-500">
                Protect line ranges the rewriter should leave alone. This is a request sent to the model, not a
                hard lock — after a protected run, this panel checks the actual output and warns you if a
                protected line changed anyway.
              </p>

              {previewError && <p className="text-xs text-orange-400">{previewError}</p>}

              {staleSpans && (
                <div className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-400 space-y-2">
                  <p>
                    {staleSpans.spans.length} saved protected span{staleSpans.spans.length !== 1 ? 's are' : ' is'}{' '}
                    from a different draft.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={restoreStaleSpans} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs">
                      Restore anyway
                    </button>
                    <button onClick={clearStaleSpans} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs">
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <ProtectedSpansPreview
                fountain={previewFountain ?? ''}
                spans={spans}
                pendingStart={spanStart ? Number(spanStart) : null}
                pendingEnd={spanEnd ? Number(spanEnd) : null}
                onLineClick={onPreviewLineClick}
              />

              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col text-xs text-zinc-500">
                  Start line
                  <input
                    type="number" min={1} value={spanStart}
                    onChange={e => setSpanStart(e.target.value)}
                    className="w-20 mt-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs"
                  />
                </label>
                <label className="flex flex-col text-xs text-zinc-500">
                  End line
                  <input
                    type="number" min={1} value={spanEnd}
                    onChange={e => setSpanEnd(e.target.value)}
                    className="w-20 mt-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs"
                  />
                </label>
                <label className="flex flex-col flex-1 min-w-[10rem] text-xs text-zinc-500">
                  Reason (required)
                  <input
                    type="text" value={spanReason} maxLength={300}
                    onChange={e => setSpanReason(e.target.value)}
                    placeholder='e.g. "final joke — timing is exact"'
                    className="mt-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs"
                  />
                </label>
                <button
                  onClick={addSpan}
                  className="px-3 py-1.5 rounded bg-blue-800 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                >
                  + Add span
                </button>
              </div>
              {spanError && <p className="text-xs text-red-400">{spanError}</p>}

              {spans.length > 0 && (
                <ul className="space-y-1">
                  {spans.map(s => (
                    <li key={s.id} className="flex items-center gap-2 px-2 py-1 rounded bg-blue-950/20 border border-blue-900/50 text-xs text-blue-200">
                      <span className="font-mono flex-shrink-0">Lines {s.startLine}–{s.endLine}</span>
                      <span className="text-blue-300/70 truncate flex-1">{s.reason}</span>
                      <button onClick={() => removeSpan(s.id)} className="text-blue-400 hover:text-red-400 flex-shrink-0">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-3">
          <button
            onClick={runRevision}
            disabled={running}
            className="px-4 py-1.5 rounded bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-700 text-white text-xs font-semibold transition-colors"
          >
            {running
              ? '⟳ Running…'
              : spans.length > 0
                ? `▶ Run Revision (${spans.length} protected)`
                : '▶ Run All 14 Passes'}
          </button>
          {result && (
            <button
              onClick={downloadFountain}
              className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              ↓ Export Fountain
            </button>
          )}
          {result && (
            <span className="text-xs text-zinc-500 ml-auto">
              {result.totalIssuesFound} issues · {result.passesWithChanges} pass{result.passesWithChanges !== 1 ? 'es' : ''} changed
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 px-3 py-2 rounded bg-red-950/50 border border-red-800 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Running state — H8 streaming progress, or a plain span-locked progress state */}
        {running && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {lastRunSpanCount !== null ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
                <span className="text-2xl animate-pulse">🔒</span>
                <p className="text-xs font-semibold text-zinc-300">
                  Running span-locked revision ({lastRunSpanCount} protected span{lastRunSpanCount !== 1 ? 's' : ''})…
                </p>
                <p className="text-xs text-zinc-600">
                  This mode runs all passes non-streaming, so there's no live per-pass progress — it may take a
                  little longer to show results.
                </p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-zinc-800/50 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base animate-pulse">🖊</span>
                    <span className="text-xs font-semibold text-zinc-300">
                      {streamProgress
                        ? `Pass ${streamProgress.done} / ${streamProgress.total} complete…`
                        : 'Starting revision pipeline…'}
                    </span>
                  </div>
                  {streamProgress && (
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${(streamProgress.done / streamProgress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {streamedPasses.map((pr, idx) => {
                    const icon = PASS_ICONS[pr.pass] ?? '📝';
                    return (
                      <div key={pr.pass} className="border-b border-zinc-800/30 px-4 py-2 flex items-center gap-3 opacity-80">
                        <span className="text-sm">{icon}</span>
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                          {idx + 1}. {pr.pass}
                        </span>
                        {pr.issues.length > 0 && (
                          <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                            {pr.issues.length} issue{pr.issues.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {pr.changed && (
                          <span className="text-xs bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded">revised</span>
                        )}
                        <span className="text-xs text-green-500 ml-auto">✓</span>
                      </div>
                    );
                  })}
                  {streamedPasses.length === 0 && (
                    <div className="flex items-center justify-center py-12 text-zinc-600 text-xs">
                      Connecting to revision stream…
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {result && !running && (
          <div className="flex-1 overflow-y-auto">
            {lastRunSpanCount !== null && (
              <div className="mx-4 mt-3 px-3 py-2 rounded bg-blue-950/40 border border-blue-800 text-blue-300 text-xs">
                🔒 {lastRunSpanCount} span{lastRunSpanCount !== 1 ? 's were' : ' was'} protected from rewriting.
              </div>
            )}
            {spanViolations && spanViolations.length > 0 && (
              <div className="mx-4 mt-3 px-3 py-2 rounded bg-red-950/50 border border-red-800 text-red-300 text-xs space-y-1.5">
                <p className="font-semibold">
                  ⚠ {spanViolations.length} protected span{spanViolations.length !== 1 ? 's were' : ' was'} modified anyway.
                </p>
                <p className="text-red-400/80">
                  Protection is a prompt-level request to the rewriter, not a hard guarantee — this check compares
                  the actual original and final text directly.
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {spanViolations.map(v => (
                    <li key={v.id}>Lines {v.startLine}–{v.endLine} — "{v.reason}"</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Honest chain semantics: explainer + summary strip */}
            <div className="mx-4 mt-3 px-3 py-2 rounded bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
              Passes build on each other — each one revises the PREVIOUS pass's output, so picking a pass below
              uses everything through that pass and discards anything after it (there's no way to drop a single
              pass out of the middle of the chain).
            </div>
            {chainStats && effectiveSelectedIndex !== null && (
              <div className="mx-4 mt-2 px-3 py-1.5 flex items-center gap-3 text-xs text-zinc-400">
                <span className="text-green-400">+{chainStats.added}</span>
                <span className="text-red-400">−{chainStats.removed}</span>
                <span>
                  lines vs. original, through pass {effectiveSelectedIndex + 1}/{result.passResults.length}
                </span>
              </div>
            )}

            {result.passResults.map((pr, idx) => {
              const icon = PASS_ICONS[pr.pass] ?? '📝';
              const flagged = flaggedPasses.has(pr.pass);
              const isExpanded = expandedPass === pr.pass;
              const isSelectedCutoff = effectiveSelectedIndex === idx;
              const diffOpen = diffOpenPasses.has(pr.pass);

              return (
                <div key={pr.pass} className={`border-b border-zinc-800/50 flex items-stretch ${isSelectedCutoff ? 'bg-purple-950/10' : flagged ? 'bg-yellow-950/10' : ''}`}>
                  <label
                    className="flex items-center px-3 border-r border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 flex-shrink-0"
                    title="Use this pass's output as the final result — everything after it is discarded"
                  >
                    <input
                      type="radio"
                      name="revision-chain-cutoff"
                      checked={isSelectedCutoff}
                      onChange={() => setSelectedPassIndex(idx)}
                      className="accent-purple-600"
                    />
                  </label>
                  <div className="flex-1 min-w-0">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/50 text-left"
                      onClick={() => setExpandedPass(isExpanded ? null : pr.pass)}
                    >
                      <span className="text-base">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                            {idx + 1}. {pr.pass}
                          </span>
                          {pr.issues.length > 0 && (
                            <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                              {pr.issues.length} issue{pr.issues.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {pr.changed && (
                            <span className="text-xs bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded">
                              revised
                            </span>
                          )}
                          {isSelectedCutoff && <span className="text-xs text-purple-400">● using this result</span>}
                          {flagged && <span className="text-xs text-yellow-400">⚑ flagged</span>}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{pr.summary}</p>
                      </div>
                      <span className="text-zinc-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {pr.issues.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {pr.issues.map((issue, iIdx) => (
                              <div key={iIdx} className={`rounded border px-3 py-2 text-xs ${SEVERITY_COLOR[issue.severity] ?? ''}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold uppercase text-[10px] opacity-70">{issue.severity}</span>
                                  <span className="font-mono opacity-60">{issue.rule}</span>
                                  <span className="text-zinc-500 ml-auto">{issue.location}</span>
                                </div>
                                <p>{issue.description}</p>
                                {issue.suggestedFix && (
                                  <p className="mt-1 opacity-60 italic">💡 {issue.suggestedFix}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {pr.issues.length === 0 && (
                          <p className="text-xs text-zinc-600 italic mb-3">No issues found in this pass.</p>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {pr.changed && (
                            <button
                              onClick={() => toggleDiffOpen(pr.pass)}
                              className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                            >
                              {diffOpen ? '▲ Hide changes' : '▼ View changes'}
                            </button>
                          )}
                          <button
                            onClick={() => toggleFlag(pr.pass)}
                            title="Note only — does not affect the final output"
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${flagged ? 'bg-yellow-800 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-yellow-900/50 hover:text-yellow-300'}`}
                          >
                            ⚑ {flagged ? 'Flagged for review' : 'Flag for review'}
                          </button>
                        </div>

                        {pr.changed && diffOpen && (
                          <div className="mt-3">
                            <PassDiffView before={inputFountainFor(idx, result)} after={pr.revisedFountain} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!result && !running && !error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-8">
              <div className="text-4xl mb-3">✍️</div>
              <p className="text-zinc-400 text-sm">Run the revision pipeline to diagnose and improve your screenplay.</p>
              <p className="text-zinc-600 text-xs mt-2">
                Requires a compiled story (use Live Play to build scenes, then compile).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
