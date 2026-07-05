// Wave 39 — Revision Panel
// Shows the multi-pass revision pipeline UI: trigger revision, view per-pass
// diffs with issue breakdowns, accept/reject individual pass results.
// Pass count is data-driven (totalPasses from the SSE stream), so this UI adapts
// automatically as passes are added to the pipeline (currently 14).
// H8: Uses SSE streaming endpoint so each pass result appears as it completes.

import React, { useState, useCallback, useRef, useEffect } from 'react';

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
};

export function RevisionPanel({ onClose }: RevisionPanelProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RevisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedPass, setExpandedPass] = useState<string | null>(null);
  const [acceptedPasses, setAcceptedPasses] = useState<Set<string>>(new Set());
  const [rejectedPasses, setRejectedPasses] = useState<Set<string>>(new Set());
  const [finalFountain, setFinalFountain] = useState<string | null>(null);
  // H8: Live per-pass progress — appended as each SSE pass_complete event arrives
  const [streamedPasses, setStreamedPasses] = useState<PassResult[]>([]);
  const [streamProgress, setStreamProgress] = useState<{ done: number; total: number } | null>(null);
  const evtRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => { evtRef.current?.close(); };
  }, []);

  const runRevision = useCallback(() => {
    // Close any existing stream
    if (evtRef.current) { evtRef.current.close(); evtRef.current = null; }

    setRunning(true);
    setError(null);
    setResult(null);
    setStreamedPasses([]);
    setStreamProgress(null);
    setAcceptedPasses(new Set());
    setRejectedPasses(new Set());
    setFinalFountain(null);

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
  }, []);

  const acceptPass = useCallback((passName: string, revised: string) => {
    setAcceptedPasses(prev => new Set([...prev, passName]));
    setRejectedPasses(prev => { const s = new Set(prev); s.delete(passName); return s; });
    setFinalFountain(revised);
  }, []);

  const rejectPass = useCallback((passName: string) => {
    setRejectedPasses(prev => new Set([...prev, passName]));
    setAcceptedPasses(prev => { const s = new Set(prev); s.delete(passName); return s; });
  }, []);

  const downloadFountain = useCallback(() => {
    const text = finalFountain ?? result?.finalFountain ?? '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revised_screenplay.fountain';
    a.click();
    URL.revokeObjectURL(url);
  }, [finalFountain, result]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60">
      <div className="h-full w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">12-Pass Revision Pipeline</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Diagnose → mark → rewrite → preserve</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">✕</button>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-3">
          <button
            onClick={runRevision}
            disabled={running}
            className="px-4 py-1.5 rounded bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-700 text-white text-xs font-semibold transition-colors"
          >
            {running ? '⟳ Running…' : '▶ Run All 12 Passes'}
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

        {/* Running state — H8: shows live per-pass progress via SSE */}
        {running && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Progress header */}
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
            {/* Live pass results as they arrive */}
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
          </div>
        )}

        {/* Results */}
        {result && !running && (
          <div className="flex-1 overflow-y-auto">
            {result.passResults.map((pr, idx) => {
              const icon = PASS_ICONS[pr.pass] ?? '📝';
              const accepted = acceptedPasses.has(pr.pass);
              const rejected = rejectedPasses.has(pr.pass);
              const isExpanded = expandedPass === pr.pass;

              return (
                <div key={pr.pass} className={`border-b border-zinc-800/50 ${accepted ? 'bg-green-950/10' : rejected ? 'bg-red-950/10' : ''}`}>
                  {/* Pass header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/50 text-left"
                    onClick={() => setExpandedPass(isExpanded ? null : pr.pass)}
                  >
                    <span className="text-base">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
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
                        {accepted && <span className="text-xs text-green-400">✓ accepted</span>}
                        {rejected && <span className="text-xs text-red-400">✗ rejected</span>}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{pr.summary}</p>
                    </div>
                    <span className="text-zinc-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* Expanded pass detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      {/* Issues list */}
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

                      {/* Accept/reject */}
                      {pr.changed && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => acceptPass(pr.pass, pr.revisedFountain)}
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${accepted ? 'bg-green-700 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-green-900/50 hover:text-green-300'}`}
                          >
                            ✓ Accept revision
                          </button>
                          <button
                            onClick={() => rejectPass(pr.pass)}
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${rejected ? 'bg-red-800 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-red-900/50 hover:text-red-300'}`}
                          >
                            ✗ Reject revision
                          </button>
                        </div>
                      )}

                      {pr.issues.length === 0 && (
                        <p className="text-xs text-zinc-600 italic">No issues found in this pass.</p>
                      )}
                    </div>
                  )}
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
