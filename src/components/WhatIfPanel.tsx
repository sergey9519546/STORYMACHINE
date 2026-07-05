// What-If Panel — Writer Cockpit feature: browse ghost commits (rejected IR
// candidates) and issue causal interventions via the SCM do() endpoint.
// Ghost commits are the shadow canon: every candidate the Convergence Loop
// rejected is stored here, ready to be branched into.

import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, Eye, Zap, X, Check, AlertTriangle } from 'lucide-react';

interface GhostCommit {
  ghostId: string;
  parentCommitId: string | null;
  sceneIdx: number;
  reason: string;
  rejectedAt: number;
  ir: {
    transitionId?: string;
    sceneFunction?: string;
    ops?: Array<{ op: string }>;
    // MechanismProof/CausalProof (server/nvm/proof/tier1/{mechanism,causal}.ts)
    // block unconditionally on an empty activeMechanisms/preconditions for any
    // non-initial scene with ops, so these must ride along into a commit —
    // they're the scene's own declared metadata, not something to invent here.
    activeMechanisms?: string[];
    preconditions?: string[];
  };
  // Present when this ghost came out of the SELECT convergence loop (older
  // ghosts, e.g. from manual injection paths, may not carry scores).
  composite?: number;
  tension?: number;
  quality?: number;
}

interface InterventionResult {
  intervention: { opId: string; replacement: unknown };
  affectedOps: Array<{ opId: string; originalOp: { op: string }; reason: string; distance: number }>;
  summary: string;
}

interface BranchResponse {
  ghostId: string;
  branchedOps: unknown[];
  sceneIdx: number;
}

// Per-ghost "road not taken" flow: branch first (fetches the server's
// replayable ops for this ghost), then optionally commit those ops into the
// story as a real StoryCommit. Kept per-ghostId so many rows can be mid-flow
// independently.
interface GhostFlowState {
  branching?: boolean;
  branchError?: string;
  branchedOps?: unknown[];
  branchSceneIdx?: number;
  confirming?: boolean;
  committing?: boolean;
  committed?: { commitId: string };
  conflict?: { error: string; failures: string[] };
  commitError?: string;
}

interface WhatIfPanelProps {
  onClose: () => void;
  // Optional refresh hook — mirrors DirectorCutPanel's (currently unwired)
  // onInjected prop. The per-row "committed" state is the primary feedback.
  onCommitted?: (commitId: string) => void;
}

export default function WhatIfPanel({ onClose, onCommitted }: WhatIfPanelProps) {
  const [ghosts, setGhosts] = useState<GhostCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GhostCommit | null>(null);
  const [opId, setOpId] = useState('');
  const [doResult, setDoResult] = useState<InterventionResult | null>(null);
  const [doLoading, setDoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flows, setFlows] = useState<Record<string, GhostFlowState>>({});

  const fetchGhosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nvm/ghost-commits');
      if (res.ok) setGhosts((await res.json() as { ghosts: GhostCommit[] }).ghosts ?? []);
    } catch { setError('Failed to fetch ghost commits'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGhosts(); }, [fetchGhosts]);

  const runIntervention = async () => {
    if (!opId.trim()) return;
    setDoLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nvm/twin/do', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opId: opId.trim(), replacement: null }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDoResult(await res.json() as InterventionResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally { setDoLoading(false); }
  };

  // Step 1 of the road-not-taken flow: ask the server to replay this ghost's
  // ops against the current story so we get back concrete, current branchedOps
  // (not just whatever was frozen into the ghost ledger at rejection time).
  const branchGhost = useCallback(async (g: GhostCommit) => {
    setFlows(f => ({ ...f, [g.ghostId]: { ...f[g.ghostId], branching: true, branchError: undefined } }));
    try {
      const res = await fetch('/api/nvm/ghost-commits/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ghostId: g.ghostId }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Branch failed');
      const data = await res.json() as BranchResponse;
      setFlows(f => ({
        ...f,
        [g.ghostId]: { ...f[g.ghostId], branching: false, branchedOps: data.branchedOps, branchSceneIdx: data.sceneIdx },
      }));
    } catch (e) {
      setFlows(f => ({
        ...f,
        [g.ghostId]: { ...f[g.ghostId], branching: false, branchError: e instanceof Error ? e.message : 'Branch failed' },
      }));
    }
  }, []);

  const requestCommit = useCallback((ghostId: string) => {
    setFlows(f => ({ ...f, [ghostId]: { ...f[ghostId], confirming: true } }));
  }, []);

  const cancelCommit = useCallback((ghostId: string) => {
    setFlows(f => ({ ...f, [ghostId]: { ...f[ghostId], confirming: false } }));
  }, []);

  // Step 2: writes the branched ops into the story as a new commit. A 409
  // means the story moved since branching (or since rejection) and this
  // ghost's ops no longer prove — shown honestly, with a way to re-branch
  // and try again rather than pretending the commit half-succeeded.
  const commitGhost = useCallback(async (g: GhostCommit) => {
    const branchedOps = flows[g.ghostId]?.branchedOps;
    if (!branchedOps) return;
    setFlows(f => ({ ...f, [g.ghostId]: { ...f[g.ghostId], committing: true, confirming: false, commitError: undefined, conflict: undefined } }));
    try {
      const res = await fetch('/api/nvm/converge/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ops: branchedOps,
          // sceneIdx comes from the branch response (freshest), not the ghost's
          // frozen record; activeMechanisms/preconditions are the scene's own
          // declared metadata, sourced from the ghost's original ir since the
          // branch endpoint only returns ops + sceneIdx.
          sceneIdx: flows[g.ghostId]?.branchSceneIdx ?? g.sceneIdx,
          activeMechanisms: g.ir?.activeMechanisms,
          preconditions: g.ir?.preconditions,
          summary: `Restored ghost ${g.ghostId} (${g.reason}) via What-If`,
        }),
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({} as { error?: string; failures?: string[] }));
        setFlows(f => ({
          ...f,
          [g.ghostId]: {
            ...f[g.ghostId],
            committing: false,
            conflict: {
              error: data.error ?? 'The story state moved — this ghost no longer proves.',
              failures: Array.isArray(data.failures) ? data.failures : [],
            },
          },
        }));
        return;
      }
      if (!res.ok) throw new Error((await res.text()) || `Commit failed (${res.status})`);
      const data = await res.json() as { commitId: string };
      setFlows(f => ({ ...f, [g.ghostId]: { ...f[g.ghostId], committing: false, committed: { commitId: data.commitId } } }));
      onCommitted?.(data.commitId);
    } catch (e) {
      setFlows(f => ({ ...f, [g.ghostId]: { ...f[g.ghostId], committing: false, commitError: e instanceof Error ? e.message : 'Commit failed' } }));
    }
  }, [flows, onCommitted]);

  const REASON_COLOR: Record<string, string> = {
    proof_failed:    'bg-red-900 text-red-200',
    valuation_low:   'bg-orange-900 text-orange-200',
    budget_exceeded: 'bg-yellow-900 text-yellow-200',
    superseded:      'bg-gray-700 text-gray-300',
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1a2e] border border-[#333] rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333]">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-semibold text-lg">What-If / Ghost Commits</h2>
            <span className="text-xs text-gray-500 ml-2">shadow canon — rejected candidates</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Ghost list */}
          <div className="w-1/2 border-r border-[#333] overflow-y-auto p-3 space-y-2">
            {loading && <p className="text-gray-400 text-sm text-center py-8">Loading…</p>}
            {!loading && ghosts.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                No ghost commits yet.<br />
                <span className="text-xs">Run the Convergence Loop to generate candidates.</span>
              </p>
            )}
            {ghosts.map(g => {
              const flow = flows[g.ghostId] ?? {};
              const hasScores = g.composite !== undefined || g.tension !== undefined || g.quality !== undefined;
              return (
                <div
                  key={g.ghostId}
                  onClick={() => setSelected(g)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelected(g); }}
                  className={`w-full text-left rounded-lg border p-3 transition-all cursor-pointer ${
                    selected?.ghostId === g.ghostId
                      ? 'border-purple-500 bg-purple-900/30'
                      : 'border-[#333] hover:border-[#555] bg-[#111]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-purple-300 text-xs font-mono">{g.ghostId.slice(0, 12)}…</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REASON_COLOR[g.reason] ?? 'bg-gray-700 text-gray-300'}`}>
                      {g.reason.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-gray-400 text-xs flex items-center gap-3">
                    <span>Scene {g.sceneIdx}</span>
                    <span>{g.ir?.sceneFunction ?? '—'}</span>
                    <span>{g.ir?.ops?.length ?? 0} ops</span>
                  </div>
                  {hasScores && (
                    <div className="text-[11px] flex items-center gap-3 mt-1 font-mono">
                      {g.composite !== undefined && <span className="text-pink-300">composite {g.composite.toFixed(1)}</span>}
                      {g.tension !== undefined && <span className="text-blue-300">tension {g.tension.toFixed(1)}</span>}
                      {g.quality !== undefined && <span className="text-violet-300">quality {g.quality.toFixed(1)}</span>}
                    </div>
                  )}

                  {/* Road-not-taken actions — stop propagation so clicking these
                      doesn't also select the row underneath. */}
                  <div className="mt-2 pt-2 border-t border-[#2a2a3e]" onClick={e => e.stopPropagation()}>
                    {!flow.committed && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => branchGhost(g)}
                          disabled={flow.branching}
                          className="flex items-center gap-1 bg-[#222] hover:bg-[#2a2a3e] disabled:opacity-40 text-purple-300 text-[11px] px-2 py-1 rounded font-medium transition-colors"
                        >
                          <GitBranch className="w-3 h-3" />
                          {flow.branching ? 'Branching…' : flow.branchedOps ? 'Re-branch' : 'Branch ops'}
                        </button>
                        {flow.branchedOps && !flow.confirming && (
                          <button
                            onClick={() => requestCommit(g.ghostId)}
                            className="flex items-center gap-1 bg-green-900/40 hover:bg-green-900/60 text-green-300 text-[11px] px-2 py-1 rounded font-medium transition-colors"
                          >
                            <Check className="w-3 h-3" /> Commit to story
                          </button>
                        )}
                      </div>
                    )}

                    {flow.branchError && <p className="text-red-400 text-[11px] mt-1">{flow.branchError}</p>}
                    {flow.branchedOps && !flow.conflict && (
                      <p className="text-gray-500 text-[11px] mt-1">
                        {flow.branchedOps.length} op(s) branched at scene {flow.branchSceneIdx}
                      </p>
                    )}

                    {flow.confirming && (
                      <div className="mt-2 bg-yellow-900/20 border border-yellow-700 rounded p-2">
                        <p className="text-yellow-300 text-[11px] mb-2 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          This writes the rejected path into your story as a new commit.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => commitGhost(g)}
                            disabled={flow.committing}
                            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black text-[11px] font-bold px-2 py-1 rounded"
                          >
                            {flow.committing ? 'Committing…' : 'Yes, commit'}
                          </button>
                          <button onClick={() => cancelCommit(g.ghostId)} className="text-gray-400 hover:text-white text-[11px] px-2 py-1">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {flow.conflict && (
                      <div className="mt-2 bg-red-900/20 border border-red-700 rounded p-2">
                        <p className="text-red-300 text-[11px] font-medium">{flow.conflict.error}</p>
                        {flow.conflict.failures.length > 0 && (
                          <ul className="list-disc list-inside text-red-400 text-[11px] mt-1">
                            {flow.conflict.failures.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        )}
                        <button onClick={() => branchGhost(g)} className="text-gray-400 hover:text-white text-[11px] mt-1 underline">
                          Re-branch and retry
                        </button>
                      </div>
                    )}

                    {flow.commitError && <p className="text-red-400 text-[11px] mt-1">{flow.commitError}</p>}

                    {flow.committed && (
                      <div className="flex items-center gap-1 text-green-400 text-[11px]">
                        <Check className="w-3 h-3" /> Committed as {flow.committed.commitId}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail / intervention */}
          <div className="w-1/2 overflow-y-auto p-4 space-y-4">
            {selected ? (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium text-sm">Ghost IR Detail</span>
                  </div>
                  <div className="bg-[#111] rounded-lg p-3 text-xs font-mono text-gray-300 space-y-1">
                    <div><span className="text-gray-500">id:</span> {selected.ghostId}</div>
                    <div><span className="text-gray-500">scene:</span> {selected.sceneIdx}</div>
                    <div><span className="text-gray-500">function:</span> {selected.ir?.sceneFunction ?? '—'}</div>
                    <div><span className="text-gray-500">rejected:</span> {selected.reason}</div>
                    <div className="pt-1"><span className="text-gray-500">ops ({selected.ir?.ops?.length ?? 0}):</span></div>
                    {(selected.ir?.ops ?? []).map((op, i) => (
                      <div key={i} className="pl-2 text-purple-300">
                        {i}: {op.op}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">Select a ghost commit to inspect</p>
            )}

            {/* Causal intervention (do-calculus) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-medium text-sm">Causal Intervention (do-calculus)</span>
              </div>
              <p className="text-gray-500 text-xs mb-2">
                Enter an op ID (<code className="text-gray-400">commitId:opIdx</code>) to compute what downstream ops break if it's removed.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={opId}
                  onChange={e => setOpId(e.target.value)}
                  placeholder="e.g. abc123:2"
                  className="flex-1 bg-[#111] border border-[#333] rounded px-3 py-1.5 text-white text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={runIntervention}
                  disabled={doLoading || !opId.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
                >
                  {doLoading ? '…' : 'do()'}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            {doResult && (
              <div className="bg-[#111] rounded-lg p-3 text-xs">
                <div className="text-yellow-300 font-medium mb-2">Counterfactual Report</div>
                <pre className="text-gray-300 whitespace-pre-wrap font-mono text-[10px] leading-5">
                  {doResult.summary}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
