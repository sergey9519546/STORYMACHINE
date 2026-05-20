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
  ir: { transitionId: string; sceneFunction: string; ops: unknown[] };
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

  const branchGhost = useCallback(async (ghostId: string) => {
    const r = await fetch('/api/nvm/ghost-commits/branch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, ghostId }),
    });
    if (!r.ok) { setError('Branch failed'); return; }
    const result = await r.json();
    alert(`Branched ghost ${ghostId}\n${result.branchedOps.length} ops at scene ${result.sceneIdx}`);
  }, [sessionId]);

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
          {ghosts.map(g => (
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
              <button onClick={() => branchGhost(g.ghostId)}
                style={{ padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4, background: '#2a3a2a', color: '#6dc96d', cursor: 'pointer' }}>
                Branch (What-If)
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
