// Writers' Room Panel (on-demand) — convenes the six standing critics against
// the current story state and shows their live transcript. Deterministic and
// keyless: two runs against the same story state produce the same verdict,
// no AI key required.
//
// Style idiom: ConvergePanel.tsx's terminal dark-slate inline-style idiom
// (bg #0f172a card, monospace, slate borders) — this panel is a sibling
// surface to ConvergePanel's own "Writers' Room" transcript section, so it
// should look identical when placed next to it rather than introduce a
// second visual language for the same critics.
//
// Server contract (server/nvm/room — route may not exist yet, feature-detect
// everything): POST /api/nvm/room/critique {} → 200 { critiques, dominant,
// suggestedOperator?, consensus }. Each critique: { criticId, severity,
// objection, suggestedOperator?, attentionBid? }. A fresh/empty session is a
// legitimate 200 with critiques: [] — rendered as an honest empty result,
// not an error.

import React, { useState, useCallback, useEffect } from 'react';

interface RoomCritique {
  criticId: string;
  severity: number;
  objection: string;
  suggestedOperator?: string | null;
  attentionBid?: number;
}

interface RoomCritiqueResponse {
  critiques: RoomCritique[];
  dominant?: string;
  // Tolerate the WritersRoomResult field name (server/nvm/room/room.ts) in
  // case the shipped route mirrors that internal type instead of the
  // contract's `dominant` — either is read without the panel crashing.
  dominantCritic?: string;
  suggestedOperator?: string | null;
  consensus?: number;
}

interface RoomPanelProps {
  onClose: () => void;
}

const CRITIC_LABELS: Record<string, string> = {
  showrunner: 'Showrunner',
  skeptic: 'Skeptic',
  continuity: 'Continuity',
  character_advocate: 'Character Advocate',
  studio_note: 'Studio Note',
  dramaturge: 'Dramaturge',
};

function criticName(id: string): string {
  return CRITIC_LABELS[id] ?? id.replace(/_/g, ' ');
}

// Mirrors ConvergePanel's criticStance bucketing so severity reads the same
// way everywhere the Writers' Room's critiques are shown.
function criticStance(severity: number): string {
  if (severity >= 70) return 'strong objection';
  if (severity >= 40) return 'concern';
  if (severity > 0) return 'minor note';
  return 'no objection';
}

function severityColor(severity: number): string {
  if (severity >= 70) return '#f87171';
  if (severity >= 40) return '#fb923c';
  if (severity > 0) return '#facc15';
  return '#4ade80';
}

type LoadState = 'idle' | 'loading' | 'error';

export function RoomPanel({ onClose }: RoomPanelProps) {
  const [state, setState] = useState<LoadState>('idle');
  const [result, setResult] = useState<RoomCritiqueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeMissing, setRouteMissing] = useState(false);
  const [runCount, setRunCount] = useState(0);

  const convene = useCallback(async () => {
    if (state === 'loading') return;
    setState('loading');
    setError(null);
    setRouteMissing(false);
    try {
      const res = await fetch('/api/nvm/room/critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.status === 404) {
        setRouteMissing(true);
        setState('idle');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(body.error ?? `Room convene failed (${res.status})`);
      }

      const data = await res.json() as RoomCritiqueResponse;
      setResult(data);
      setRunCount(n => n + 1);
      setState('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Room convene failed.');
      setState('idle');
    }
  }, [state]);

  const critiques = result?.critiques ?? [];
  const dominant = result?.dominant ?? result?.dominantCritic;
  const sorted = [...critiques].sort((a, b) => b.severity - a.severity);

  // Escape closes the panel, matching ScriptDoctorPanel's overlay convention.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
    <div role="dialog" aria-modal="true" aria-labelledby="room-panel-title" style={{
      background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
      padding: 20, width: 640, maxWidth: '95vw', fontFamily: 'monospace',
      fontSize: 13, border: '1px solid #334155',
      maxHeight: '80vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <strong id="room-panel-title" style={{ fontSize: 15 }}>Writers' Room</strong>
        <button onClick={onClose} aria-label="Close Writers' Room" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      <p style={{ color: '#64748b', fontSize: 11.5, marginTop: 0, marginBottom: 14 }}>
        Six critics debate the current story state — deterministic, no AI key required.
        Re-convene any time; the same state always produces the same verdict.
      </p>

      <button onClick={convene} disabled={state === 'loading'} style={{
        width: '100%', padding: '8px 0', marginBottom: 14,
        background: state === 'loading' ? '#334155' : '#1d4ed8',
        color: '#fff', border: 'none', borderRadius: 6,
        cursor: state === 'loading' ? 'default' : 'pointer', fontFamily: 'monospace', fontSize: 13,
      }}>
        {state === 'loading' ? 'Convening…' : result ? 'Re-convene the room' : 'Convene the room'}
      </button>

      {error && <div style={{ color: '#f87171', marginBottom: 12, fontSize: 12 }}>{error}</div>}

      {routeMissing && (
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12, fontStyle: 'italic' }}>
          The room's critique endpoint isn't available yet — this will start working once the server route ships.
        </div>
      )}

      {result && (
        <>
          {/* Header strip: dominant voice + consensus */}
          <div style={{
            background: '#111827', border: '1px solid #334155', borderRadius: 6,
            padding: '8px 14px', marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
          }}>
            {dominant && (
              <span>
                <span style={{ color: '#64748b' }}>dominant voice </span>
                <span style={{ color: '#a78bfa', fontWeight: 700 }}>{criticName(dominant)}</span>
              </span>
            )}
            {typeof result.consensus === 'number' && (
              <span>
                <span style={{ color: '#64748b' }}>consensus </span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>{result.consensus}/100</span>
              </span>
            )}
            {result.suggestedOperator && (
              <span>
                <span style={{ color: '#64748b' }}>suggests </span>
                <span style={{ color: '#34d399' }}>{result.suggestedOperator.replace(/_/g, ' ')}</span>
              </span>
            )}
            {runCount > 1 && (
              <span style={{ color: '#475569', fontSize: 10.5, marginLeft: 'auto' }}>run #{runCount}</span>
            )}
          </div>

          {sorted.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 12.5, fontStyle: 'italic' }}>
              No objections — either the session is fresh with nothing yet to critique, or the room is fully satisfied with the current state.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map((entry, i) => (
                <div key={`${entry.criticId}_${i}`} style={{ background: '#111827', border: '1px solid #334155', borderRadius: 6, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {criticName(entry.criticId)}
                    </span>
                    <span style={{ color: severityColor(entry.severity), fontSize: 11, fontWeight: 600 }}>
                      {criticStance(entry.severity)} <span style={{ color: '#64748b', fontWeight: 400 }}>(severity {entry.severity})</span>
                    </span>
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: 12, whiteSpace: 'pre-wrap' }}>{entry.objection}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    {entry.suggestedOperator && (
                      <span style={{ color: '#34d399', fontSize: 10.5 }}>
                        → suggests: {entry.suggestedOperator.replace(/_/g, ' ')}
                      </span>
                    )}
                    {typeof entry.attentionBid === 'number' && (
                      <span style={{ color: '#64748b', fontSize: 10.5 }}>
                        attention bid {entry.attentionBid}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!result && state !== 'loading' && !error && !routeMissing && (
        <p style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
          Convene the room to see where the six critics stand on the story as it is right now.
        </p>
      )}
    </div>
    </div>
  );
}

export default RoomPanel;
