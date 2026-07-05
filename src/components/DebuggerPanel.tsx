import { useState, useCallback } from 'react';

interface ExplainFrame {
  layer: 'goal' | 'pressure' | 'tactic' | 'line';
  id: string;
  summary: string;
}

interface ExplainPanel {
  eventId: string;
  charId: string | null;
  actionType: string;
  content: string;
  frames: ExplainFrame[];
}

interface GhostCommit {
  ghostId: string;
  sceneIdx: number;
  reason: string;
  rejectedAt: number;
  ir: {
    transitionId: string; sceneFunction: string; ops: unknown[];
    // MechanismProof/CausalProof (server/nvm/proof/tier1/{mechanism,causal}.ts)
    // block unconditionally on an empty activeMechanisms/preconditions for any
    // non-initial scene with ops, so these must ride along into a commit.
    activeMechanisms?: string[];
    preconditions?: string[];
  };
  // Present when this ghost came out of the SELECT convergence loop.
  composite?: number;
  tension?: number;
  quality?: number;
}

interface BranchResponse {
  ghostId: string;
  branchedOps: unknown[];
  sceneIdx: number;
}

// Per-ghost branch→commit flow state — same "road not taken" pattern as
// WhatIfPanel.tsx, duplicated here rather than shared because the two panels
// use different styling idioms (Tailwind vs. inline styles) and this repo
// has no shared-hooks module to add one to without touching a 5th file.
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

const LAYER_COLORS: Record<string, string> = {
  goal: '#7c6af5',
  pressure: '#e07c3a',
  tactic: '#3ab8e0',
  line: '#6dc96d',
};

const LAYER_LABELS: Record<string, string> = {
  goal: 'GOAL',
  pressure: 'PRESSURE',
  tactic: 'TACTIC',
  line: 'LINE',
};

function CallStack({ frames }: { frames: ExplainFrame[] }) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
      {frames.map((f, i) => (
        <div key={f.id + i} style={{
          display: 'flex', gap: 8, padding: '6px 10px',
          borderLeft: `3px solid ${LAYER_COLORS[f.layer] ?? '#888'}`,
          marginBottom: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 4,
        }}>
          <span style={{ color: LAYER_COLORS[f.layer], minWidth: 70, fontWeight: 700 }}>
            {LAYER_LABELS[f.layer]}
          </span>
          <span style={{ color: '#ccc' }}>{f.summary}</span>
        </div>
      ))}
    </div>
  );
}

export function DebuggerPanel({ sessionId }: { sessionId: string }) {
  const [eventId, setEventId] = useState('');
  const [panel, setPanel] = useState<ExplainPanel | null>(null);
  const [ghosts, setGhosts] = useState<GhostCommit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'explain' | 'ghosts'>('explain');
  const [flows, setFlows] = useState<Record<string, GhostFlowState>>({});

  const explain = useCallback(async () => {
    if (!eventId.trim()) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/debug/explain/${encodeURIComponent(eventId.trim())}?sessionId=${sessionId}`);
      if (!r.ok) { setError((await r.json()).error ?? 'Not found'); setPanel(null); return; }
      setPanel(await r.json());
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [eventId, sessionId]);

  const loadGhosts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/nvm/ghost-commits?sessionId=${sessionId}`);
      if (!r.ok) { setError('Failed to load ghosts'); return; }
      setGhosts((await r.json()).ghosts ?? []);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [sessionId]);

  // Step 1 of the road-not-taken flow: replay this ghost's ops against the
  // current story so we get back concrete, current branchedOps — replaces
  // the old alert()-and-forget dead end with real state the writer can act on.
  const branchGhost = useCallback(async (ghostId: string) => {
    setFlows(f => ({ ...f, [ghostId]: { ...f[ghostId], branching: true, branchError: undefined } }));
    try {
      const r = await fetch('/api/nvm/ghost-commits/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ghostId }),
      });
      if (!r.ok) throw new Error((await r.text()) || 'Branch failed');
      const result = await r.json() as BranchResponse;
      setFlows(f => ({
        ...f,
        [ghostId]: { ...f[ghostId], branching: false, branchedOps: result.branchedOps, branchSceneIdx: result.sceneIdx },
      }));
    } catch (e) {
      setFlows(f => ({
        ...f,
        [ghostId]: { ...f[ghostId], branching: false, branchError: e instanceof Error ? e.message : 'Branch failed' },
      }));
    }
  }, [sessionId]);

  const requestCommit = useCallback((ghostId: string) => {
    setFlows(f => ({ ...f, [ghostId]: { ...f[ghostId], confirming: true } }));
  }, []);

  const cancelCommit = useCallback((ghostId: string) => {
    setFlows(f => ({ ...f, [ghostId]: { ...f[ghostId], confirming: false } }));
  }, []);

  // Step 2: writes the branched ops into the story as a new commit. A 409
  // means the story moved since branching and this ghost's ops no longer
  // prove — shown honestly, with a way to re-branch and try again.
  const commitGhost = useCallback(async (ghost: GhostCommit) => {
    const ghostId = ghost.ghostId;
    const branchedOps = flows[ghostId]?.branchedOps;
    if (!branchedOps) return;
    setFlows(f => ({ ...f, [ghostId]: { ...f[ghostId], committing: true, confirming: false, commitError: undefined, conflict: undefined } }));
    try {
      const r = await fetch('/api/nvm/converge/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ops: branchedOps,
          // sceneIdx comes from the branch response (freshest); activeMechanisms/
          // preconditions are the scene's own declared metadata, sourced from the
          // ghost's original ir since the branch endpoint only returns ops+sceneIdx.
          sceneIdx: flows[ghostId]?.branchSceneIdx ?? ghost.sceneIdx,
          activeMechanisms: ghost.ir?.activeMechanisms,
          preconditions: ghost.ir?.preconditions,
          summary: `Restored ghost ${ghostId} (${ghost.reason}) from Debugger`,
        }),
      });
      if (r.status === 409) {
        const data = await r.json().catch(() => ({} as { error?: string; failures?: string[] }));
        setFlows(f => ({
          ...f,
          [ghostId]: {
            ...f[ghostId],
            committing: false,
            conflict: {
              error: data.error ?? 'The story state moved — this ghost no longer proves.',
              failures: Array.isArray(data.failures) ? data.failures : [],
            },
          },
        }));
        return;
      }
      if (!r.ok) throw new Error((await r.text()) || `Commit failed (${r.status})`);
      const data = await r.json() as { commitId: string };
      setFlows(f => ({ ...f, [ghostId]: { ...f[ghostId], committing: false, committed: { commitId: data.commitId } } }));
    } catch (e) {
      setFlows(f => ({ ...f, [ghostId]: { ...f[ghostId], committing: false, commitError: e instanceof Error ? e.message : 'Commit failed' } }));
    }
  }, [flows, sessionId]);

  const panelStyle: React.CSSProperties = {
    background: '#1a1a2e', color: '#e0e0e0', borderRadius: 8,
    padding: 16, fontFamily: 'system-ui, sans-serif', fontSize: 13,
    border: '1px solid #333',
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['explain', 'ghosts'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'ghosts') loadGhosts(); }}
            style={{
              padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer',
              background: tab === t ? '#7c6af5' : '#2a2a3e', color: '#fff',
            }}>
            {t === 'explain' ? 'Action Inspector' : 'Ghost Ledger'}
          </button>
        ))}
      </div>

      {tab === 'explain' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={eventId}
              onChange={e => setEventId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && explain()}
              placeholder="event_id / action_id…"
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #444',
                background: '#12122a', color: '#e0e0e0', fontSize: 13,
              }}
            />
            <button onClick={explain} disabled={loading}
              style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: '#3ab8e0', cursor: 'pointer', color: '#000' }}>
              {loading ? '…' : 'Explain'}
            </button>
          </div>
          {error && <div style={{ color: '#f66', marginBottom: 8 }}>{error}</div>}
          {panel && (
            <>
              <div style={{ marginBottom: 8, color: '#999', fontSize: 11 }}>
                {panel.charId && <span>char: <b style={{ color: '#7c6af5' }}>{panel.charId}</b> · </span>}
                action: <b style={{ color: '#3ab8e0' }}>{panel.actionType}</b>
              </div>
              <div style={{ marginBottom: 10, color: '#ccc', fontStyle: 'italic', fontSize: 12 }}>
                "{panel.content.slice(0, 120)}{panel.content.length > 120 ? '…' : ''}"
              </div>
              <CallStack frames={panel.frames} />
            </>
          )}
        </>
      )}

      {tab === 'ghosts' && (
        <>
          {error && <div style={{ color: '#f66', marginBottom: 8 }}>{error}</div>}
          {loading && <div style={{ color: '#999' }}>Loading…</div>}
          {!loading && ghosts.length === 0 && (
            <div style={{ color: '#666', textAlign: 'center', padding: 24 }}>
              No ghost commits yet. Rejected IR candidates appear here.
            </div>
          )}
          {ghosts.map(g => {
            const flow = flows[g.ghostId] ?? {};
            const hasScores = g.composite !== undefined || g.tension !== undefined || g.quality !== undefined;
            return (
              <div key={g.ghostId} style={{
                background: '#12122a', borderRadius: 6, padding: 10, marginBottom: 8,
                border: '1px solid #2a2a3e',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#7c6af5', fontSize: 11, fontFamily: 'monospace' }}>{g.ghostId}</span>
                  <span style={{ color: '#888', fontSize: 11 }}>scene {g.sceneIdx}</span>
                </div>
                <div style={{ color: '#e07c3a', fontSize: 11, marginBottom: 4 }}>reason: {g.reason}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginBottom: 6 }}>
                  {g.ir.transitionId} · {g.ir.sceneFunction} · {g.ir.ops.length} ops
                </div>
                {hasScores && (
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, marginBottom: 6 }}>
                    {g.composite !== undefined && <span style={{ color: '#f9a8d4' }}>composite {g.composite.toFixed(1)}</span>}
                    {g.tension !== undefined && <span style={{ color: '#3ab8e0' }}>tension {g.tension.toFixed(1)}</span>}
                    {g.quality !== undefined && <span style={{ color: '#a78bfa' }}>quality {g.quality.toFixed(1)}</span>}
                  </div>
                )}

                {!flow.committed && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => branchGhost(g.ghostId)} disabled={flow.branching}
                      style={{
                        padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4,
                        background: '#2a3a2a', color: '#6dc96d',
                        cursor: flow.branching ? 'default' : 'pointer', opacity: flow.branching ? 0.5 : 1,
                      }}>
                      {flow.branching ? 'Branching…' : flow.branchedOps ? 'Re-branch' : 'Branch (What-If)'}
                    </button>
                    {flow.branchedOps && !flow.confirming && (
                      <button onClick={() => requestCommit(g.ghostId)}
                        style={{ padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4, background: '#1e3a2e', color: '#4ade80', cursor: 'pointer' }}>
                        Commit to story
                      </button>
                    )}
                  </div>
                )}

                {flow.branchError && <div style={{ color: '#f66', fontSize: 11, marginTop: 4 }}>{flow.branchError}</div>}
                {flow.branchedOps && !flow.conflict && (
                  <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
                    {flow.branchedOps.length} op(s) branched at scene {flow.branchSceneIdx}
                  </div>
                )}

                {flow.confirming && (
                  <div style={{ marginTop: 8, background: '#2a2410', border: '1px solid #6b5a1f', borderRadius: 4, padding: 8 }}>
                    <div style={{ color: '#e0c04a', fontSize: 11, marginBottom: 6 }}>
                      This writes the rejected path into your story as a new commit.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => commitGhost(g)} disabled={flow.committing}
                        style={{ padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4, background: '#e0c04a', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
                        {flow.committing ? 'Committing…' : 'Yes, commit'}
                      </button>
                      <button onClick={() => cancelCommit(g.ghostId)}
                        style={{ padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4, background: 'transparent', color: '#999', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {flow.conflict && (
                  <div style={{ marginTop: 8, background: '#2a1414', border: '1px solid #6b1f1f', borderRadius: 4, padding: 8 }}>
                    <div style={{ color: '#f66', fontSize: 11, fontWeight: 700 }}>{flow.conflict.error}</div>
                    {flow.conflict.failures.length > 0 && (
                      <ul style={{ color: '#f88', fontSize: 11, marginTop: 4, paddingLeft: 16 }}>
                        {flow.conflict.failures.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    )}
                    <button onClick={() => branchGhost(g.ghostId)}
                      style={{ color: '#999', fontSize: 11, marginTop: 4, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Re-branch and retry
                    </button>
                  </div>
                )}

                {flow.commitError && <div style={{ color: '#f66', fontSize: 11, marginTop: 4 }}>{flow.commitError}</div>}

                {flow.committed && (
                  <div style={{ color: '#6dc96d', fontSize: 11, marginTop: 4 }}>
                    Committed as {flow.committed.commitId}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
