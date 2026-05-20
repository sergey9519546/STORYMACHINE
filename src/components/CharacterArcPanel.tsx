// CharacterArcPanel — per-character multi-signal arc visualizer.
// Fetches GET /api/nvm/character-arc and renders, for each character:
//   - Belief count trajectory (how many beliefs they hold per scene)
//   - Avg confidence trajectory (how certain they are)
//   - Emotional intensity trajectory (how activated emotionally)
//   - Net relationship score trajectory (total bond health)
//   - Agency count (how many ops reference them per scene)

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SceneSnapshot {
  sceneIdx: number;
  beliefCount: number;
  avgConfidence: number;
  dominantEmotion: string;
  emotionIntensity: number;
  netRelationshipScore: number;
  agencyCount: number;
}

interface CharacterArc {
  charId: string;
  scenes: SceneSnapshot[];
  totalScenes: number;
  peakBeliefs: number;
  peakIntensity: number;
  dominantEmotions: string[];
  totalAgency: number;
}

interface ArcData {
  characters: CharacterArc[];
  totalScenes: number;
}

interface Props { onClose: () => void; }

// ── Signal config ─────────────────────────────────────────────────────────────

type Signal = 'beliefs' | 'confidence' | 'intensity' | 'relationship' | 'agency';

const SIGNALS: Array<{ id: Signal; label: string; color: string; unit: string }> = [
  { id: 'beliefs',      label: 'Belief Count',        color: '#60a5fa', unit: '' },
  { id: 'confidence',   label: 'Avg Confidence',      color: '#4ade80', unit: '%' },
  { id: 'intensity',    label: 'Emotion Intensity',   color: '#fb923c', unit: '' },
  { id: 'relationship', label: 'Net Relationship',    color: '#a78bfa', unit: '' },
  { id: 'agency',       label: 'Scene Agency (ops)',  color: '#fbbf24', unit: '' },
];

function getValue(snap: SceneSnapshot, signal: Signal): number {
  switch (signal) {
    case 'beliefs':      return snap.beliefCount;
    case 'confidence':   return Math.round(snap.avgConfidence * 100);
    case 'intensity':    return snap.emotionIntensity;
    case 'relationship': return snap.netRelationshipScore;
    case 'agency':       return snap.agencyCount;
  }
}

const EMOTION_COLORS: Record<string, string> = {
  fear: '#f87171', distress: '#fb923c', anger: '#ef4444',
  joy: '#4ade80', pride: '#a78bfa', shame: '#64748b', none: '#334155',
};

// ── Panel ─────────────────────────────────────────────────────────────────────

export function CharacterArcPanel({ onClose }: Props) {
  const [data, setData]         = useState<ArcData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [activeSignals, setActiveSignals] = useState<Set<Signal>>(
    new Set(['beliefs', 'intensity', 'relationship']),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nvm/character-arc');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      const d: ArcData = await res.json();
      setData(d);
      if (!selectedChar && d.characters.length > 0) setSelectedChar(d.characters[0].charId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedChar]);

  useEffect(() => { load(); }, [load]);

  const char = data?.characters.find(c => c.charId === selectedChar) ?? null;

  function toggleSignal(s: Signal) {
    setActiveSignals(prev => {
      const next = new Set(prev);
      if (next.has(s)) { if (next.size > 1) next.delete(s); }
      else next.add(s);
      return next;
    });
  }

  return (
    <div style={{
      background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
      border: '1px solid #334155', width: 860, maxWidth: '98vw',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace', fontSize: 13,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: 15 }}>Character Arc Visualizer</strong>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
            Beliefs · Confidence · Emotion · Relationships · Agency — scene by scene
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={chipBtn('#1e293b')}>↺</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      </div>

      {loading && <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Replaying character arcs…</div>}
      {error && <div style={{ color: '#f87171', background: '#1e293b', padding: 12, margin: 12, borderRadius: 5 }}>{error}</div>}

      {data && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left: character roster */}
          <div style={{ width: 190, flexShrink: 0, borderRight: '1px solid #334155', overflowY: 'auto', padding: 10 }}>
            <div style={{ color: '#64748b', fontSize: 10, marginBottom: 8 }}>
              {data.characters.length} CHARACTER{data.characters.length !== 1 ? 'S' : ''} · {data.totalScenes} SCENES
            </div>
            {data.characters.length === 0 && (
              <div style={{ color: '#475569', fontSize: 10, textAlign: 'center', padding: 20 }}>No characters yet. Generate some scenes.</div>
            )}
            {data.characters.map(c => {
              const sel = c.charId === selectedChar;
              return (
                <div key={c.charId} onClick={() => setSelectedChar(c.charId)} style={{
                  background: sel ? '#1e2d4a' : '#1e293b',
                  border: `1px solid ${sel ? '#3b82f6' : '#334155'}`,
                  borderRadius: 5, padding: '8px 10px', marginBottom: 5, cursor: 'pointer',
                }}>
                  <div style={{ color: sel ? '#60a5fa' : '#e2e8f0', fontWeight: 700, fontSize: 12 }}>{c.charId}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <span style={{ color: '#64748b', fontSize: 9 }}>{c.peakBeliefs}b</span>
                    <span style={{ color: '#fb923c', fontSize: 9 }}>I{c.peakIntensity}</span>
                    <span style={{ color: '#fbbf24', fontSize: 9 }}>{c.totalAgency}ops</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {c.dominantEmotions.slice(0, 3).map(e => (
                      <span key={e} style={{ background: EMOTION_COLORS[e] + '33', color: EMOTION_COLORS[e] ?? '#94a3b8', borderRadius: 3, padding: '0 4px', fontSize: 8 }}>{e}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: arc visualization */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Signal toggles */}
            <div style={{ display: 'flex', gap: 5, padding: '8px 14px', borderBottom: '1px solid #334155', flexShrink: 0, flexWrap: 'wrap' }}>
              {SIGNALS.map(s => (
                <button key={s.id} onClick={() => toggleSignal(s.id)} style={{
                  background: activeSignals.has(s.id) ? s.color + '22' : '#1e293b',
                  border: `1px solid ${activeSignals.has(s.id) ? s.color : '#334155'}`,
                  color: activeSignals.has(s.id) ? s.color : '#64748b',
                  borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
                  fontFamily: 'monospace', fontSize: 10, fontWeight: activeSignals.has(s.id) ? 700 : 400,
                }}>{s.label}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {!selectedChar && (
                <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>← Select a character</div>
              )}

              {char && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Summary row */}
                  <div style={{ display: 'flex', gap: 16, background: '#1e293b', borderRadius: 6, padding: '10px 14px', flexWrap: 'wrap' }}>
                    <Stat label="Peak beliefs" value={String(char.peakBeliefs)} color="#60a5fa" />
                    <Stat label="Peak intensity" value={String(char.peakIntensity)} color="#fb923c" />
                    <Stat label="Total agency" value={`${char.totalAgency} ops`} color="#fbbf24" />
                    <Stat label="Scenes active" value={String(char.scenes.filter(s => s.agencyCount > 0).length)} color="#94a3b8" />
                    <Stat label="Emotions" value={char.dominantEmotions.join(', ') || 'none'} color="#a78bfa" />
                  </div>

                  {/* Multi-signal chart */}
                  {char.scenes.length >= 2 && (
                    <div style={{ background: '#1e293b', borderRadius: 6, padding: '12px 14px' }}>
                      <div style={{ color: '#64748b', fontSize: 10, marginBottom: 8 }}>
                        ARC SIGNALS — scenes 0–{char.scenes[char.scenes.length - 1].sceneIdx}
                      </div>
                      <MultiLineChart arc={char} signals={SIGNALS.filter(s => activeSignals.has(s.id))} />
                    </div>
                  )}

                  {char.scenes.length < 2 && (
                    <div style={{ color: '#475569', fontSize: 11, textAlign: 'center', padding: 30 }}>
                      {char.charId} appears in only {char.scenes.length} scene. Add more scenes to see arc trends.
                    </div>
                  )}

                  {/* Scene-by-scene table */}
                  <div>
                    <div style={{ color: '#64748b', fontSize: 10, marginBottom: 6 }}>SCENE BREAKDOWN</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {char.scenes.map(snap => (
                        <SceneRow key={snap.sceneIdx} snap={snap} char={char} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Multi-line SVG chart ──────────────────────────────────────────────────────

function MultiLineChart({ arc, signals }: { arc: CharacterArc; signals: typeof SIGNALS }) {
  const W = 600, H = 100;
  const scenes = arc.scenes;
  if (scenes.length < 2) return null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', borderRadius: 4 }}>
      <rect width={W} height={H} fill="#0f172a" />
      {signals.map(sig => {
        const values = scenes.map(s => getValue(s, sig.id));
        const max = Math.max(...values, 1);
        const min = Math.min(...values);
        const range = max - min || 1;
        const pts = values.map((v, i) => {
          const x = (i / (values.length - 1)) * W;
          const y = H - ((v - min) / range) * (H - 8) - 4;
          return `${x},${y}`;
        }).join(' ');
        return (
          <polyline key={sig.id} points={pts} fill="none" stroke={sig.color} strokeWidth={1.5} strokeLinejoin="round" opacity={0.85} />
        );
      })}
      {/* Scene tick marks */}
      {scenes.map((_, i) => {
        const x = (i / (scenes.length - 1)) * W;
        return <line key={i} x1={x} y1={H - 3} x2={x} y2={H} stroke="#334155" strokeWidth={1} />;
      })}
    </svg>
  );
}

// ── Scene row ─────────────────────────────────────────────────────────────────

function SceneRow({ snap, char }: { snap: SceneSnapshot; char: CharacterArc }) {
  const emoColor = EMOTION_COLORS[snap.dominantEmotion] ?? '#64748b';
  const hasActivity = snap.agencyCount > 0;
  return (
    <div style={{
      background: hasActivity ? '#1e293b' : '#12181f',
      border: '1px solid #1e293b',
      borderRadius: 4, padding: '5px 9px',
      display: 'flex', alignItems: 'center', gap: 10,
      opacity: hasActivity ? 1 : 0.5,
    }}>
      <span style={{ color: '#475569', fontSize: 10, width: 50, flexShrink: 0 }}>scene {snap.sceneIdx}</span>
      <span style={{ color: '#60a5fa', fontSize: 10, width: 40, flexShrink: 0 }}>{snap.beliefCount}b</span>
      <span style={{ color: '#4ade80', fontSize: 10, width: 45, flexShrink: 0 }}>{Math.round(snap.avgConfidence * 100)}%</span>
      <span style={{ color: emoColor, fontSize: 10, width: 65, flexShrink: 0 }}>
        {snap.dominantEmotion !== 'none' ? `${snap.dominantEmotion}(${snap.emotionIntensity})` : '—'}
      </span>
      <span style={{ color: '#a78bfa', fontSize: 10, width: 55, flexShrink: 0 }}>
        rel:{snap.netRelationshipScore > 0 ? '+' : ''}{snap.netRelationshipScore.toFixed(1)}
      </span>
      <span style={{ color: '#fbbf24', fontSize: 10 }}>
        {snap.agencyCount > 0 ? `${snap.agencyCount} op${snap.agencyCount !== 1 ? 's' : ''}` : '—'}
      </span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ color: '#64748b', fontSize: 10 }}>{label}</div>
      <div style={{ color, fontSize: 13, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function chipBtn(bg: string): React.CSSProperties {
  return {
    background: bg, border: '1px solid #334155', borderRadius: 4,
    color: '#e2e8f0', padding: '3px 8px', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 11,
  };
}
