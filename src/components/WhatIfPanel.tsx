// What-If Panel — Writer Cockpit feature: browse ghost commits (rejected IR
// candidates) and issue causal interventions via the SCM do() endpoint.
// Ghost commits are the shadow canon: every candidate the Convergence Loop
// rejected is stored here, ready to be branched into.

import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, Eye, Zap, X } from 'lucide-react';

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
  };
}

interface InterventionResult {
  intervention: { opId: string; replacement: unknown };
  affectedOps: Array<{ opId: string; originalOp: { op: string }; reason: string; distance: number }>;
  summary: string;
}

interface WhatIfPanelProps {
  onClose: () => void;
}

export default function WhatIfPanel({ onClose }: WhatIfPanelProps) {
  const [ghosts, setGhosts] = useState<GhostCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GhostCommit | null>(null);
  const [opId, setOpId] = useState('');
  const [doResult, setDoResult] = useState<InterventionResult | null>(null);
  const [doLoading, setDoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            {ghosts.map(g => (
              <button
                key={g.ghostId}
                onClick={() => setSelected(g)}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
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
              </button>
            ))}
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
