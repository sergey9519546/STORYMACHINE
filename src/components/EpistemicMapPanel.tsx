// EpistemicMapPanel — live knowledge graph of who believes what about whom.
// Fetches GET /api/nvm/epistemic and renders:
//   - Per-character belief lists with confidence bars and source tags
//   - Inferred ToM² meta-layers (cross-character knowledge inference)
//   - Dramatic irony pairs (characters holding divergent beliefs)

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EpistemicBelief {
  charId: string;
  beliefId: string;
  proposition: string;
  confidence: number;
  source: string;
}

interface MetaLayer {
  holderId: string;
  targetId: string;
  proposition: string;
  confidence: number;
  depth: number;
  basis: string;
}

interface IronyPair {
  charA: string;
  charB: string;
  proposition: string;
  confA: number;
  confB: number;
}

interface EpistemicState {
  characters: string[];
  totalBeliefs: number;
  beliefs: EpistemicBelief[];
  metaLayers: MetaLayer[];
  ironyPairs: IronyPair[];
  clueCount: number;
  payoffCount: number;
  suspense: number;
}

interface Props { onClose: () => void; }

// ── Panel ─────────────────────────────────────────────────────────────────────

export function EpistemicMapPanel({ onClose }: Props) {
  const [state, setState]   = useState<EpistemicState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [view, setView]     = useState<'beliefs' | 'meta' | 'irony'>('beliefs');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nvm/epistemic');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      const data: EpistemicState = await res.json();
      setState(data);
      // Functional update so this doesn't depend on (and re-create on) selectedChar —
      // character selection below is a pure client-side switch, not a re-fetch trigger.
      setSelectedChar(prev => (!prev && data.characters.length > 0) ? data.characters[0] : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const charBeliefs = state ? state.beliefs.filter(b => b.charId === selectedChar) : [];
  const charMeta = state ? state.metaLayers.filter(m => m.holderId === selectedChar) : [];

  return (
    <div style={{
      background: 'var(--sm-night)', color: 'var(--sm-cream)', borderRadius: 8,
      border: '1px solid var(--sm-night-line)', width: 860, maxWidth: '98vw',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--sm-font-mono)', fontSize: 13,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--sm-night-line)', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: 15 }}>Epistemic Map — who believes what about whom</strong>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11, marginTop: 2 }}>
            ToM² meta-layers · dramatic irony pairs · belief confidence landscape
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={load} style={chipBtn('var(--sm-night-2)')}>↺ refresh</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sm-cream-mute)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      </div>

      {loading && <div style={{ color: 'var(--sm-ink-mute)', textAlign: 'center', padding: 40 }}>Loading epistemic state…</div>}
      {error && <div style={{ color: 'var(--sm-stamp)', background: 'var(--sm-night-2)', padding: 12, margin: 12, borderRadius: 5 }}>{error}</div>}

      {state && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left: character selector + stats */}
          <div style={{ width: 210, flexShrink: 0, borderRight: '1px solid var(--sm-night-line)', overflowY: 'auto', padding: 12 }}>
            {/* Global stats */}
            <div style={{ background: 'var(--sm-night-2)', borderRadius: 5, padding: '8px 10px', marginBottom: 12 }}>
              <StatRow label="Total beliefs" value={String(state.totalBeliefs)} />
              <StatRow label="Meta-layers" value={String(state.metaLayers.length)} />
              <StatRow label="Irony pairs" value={String(state.ironyPairs.length)} color={state.ironyPairs.length > 0 ? 'var(--sm-warn)' : 'var(--sm-ink-mute)'} />
              <StatRow label="Clues" value={`${state.clueCount} / ${state.payoffCount} paid`} />
              <StatRow label="Suspense" value={String(state.suspense)} color={state.suspense >= 70 ? 'var(--sm-stamp)' : 'var(--sm-cream-mute)'} />
            </div>

            <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 8 }}>CHARACTERS</div>

            {state.characters.length === 0 && (
              <div style={{ color: '#475569', fontSize: 10, textAlign: 'center' }}>No character beliefs yet.</div>
            )}

            {state.characters.map(charId => {
              const bCount = state.beliefs.filter(b => b.charId === charId).length;
              const mCount = state.metaLayers.filter(m => m.holderId === charId).length;
              const selected = charId === selectedChar;
              return (
                <div key={charId} onClick={() => setSelectedChar(charId)} style={{
                  background: selected ? '#1e2d4a' : 'var(--sm-night-2)',
                  border: `1px solid ${selected ? '#3b82f6' : 'var(--sm-night-line)'}`,
                  borderRadius: 5, padding: '8px 10px', marginBottom: 5, cursor: 'pointer',
                }}>
                  <div style={{ color: selected ? 'var(--sm-cool)' : 'var(--sm-cream)', fontWeight: 700, fontSize: 12 }}>{charId}</div>
                  <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginTop: 2 }}>
                    {bCount} belief{bCount !== 1 ? 's' : ''}
                    {mCount > 0 && <span style={{ color: 'var(--sm-cool)', marginLeft: 6 }}>{mCount} meta</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: belief/meta/irony views */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* View switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--sm-night-line)', padding: '0 12px', flexShrink: 0, gap: 2 }}>
              {(['beliefs', 'meta', 'irony'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${view === v ? (v === 'beliefs' ? 'var(--sm-cool)' : v === 'meta' ? 'var(--sm-cool)' : 'var(--sm-warn)') : 'transparent'}`,
                  color: view === v ? (v === 'beliefs' ? 'var(--sm-cool)' : v === 'meta' ? 'var(--sm-cool)' : 'var(--sm-warn)') : 'var(--sm-ink-mute)',
                  cursor: 'pointer', padding: '8px 12px', fontSize: 11,
                  fontFamily: 'var(--sm-font-mono)', fontWeight: view === v ? 700 : 400,
                }}>
                  {v === 'beliefs' ? `Beliefs (${charBeliefs.length})` : v === 'meta' ? `Meta-layers (${charMeta.length})` : `Irony pairs (${state.ironyPairs.length})`}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {view === 'beliefs' && <BeliefsView beliefs={charBeliefs} charId={selectedChar} />}
              {view === 'meta' && <MetaView layers={charMeta} charId={selectedChar} />}
              {view === 'irony' && <IronyView pairs={state.ironyPairs} />}
            </div>
          </div>
        </div>
      )}

      {!state && !loading && !error && (
        <div style={{ color: '#475569', textAlign: 'center', padding: 50 }}>No epistemic state loaded yet.</div>
      )}
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────

function BeliefsView({ beliefs, charId }: { beliefs: EpistemicBelief[]; charId: string | null }) {
  if (!charId) return <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>← Select a character</div>;
  if (beliefs.length === 0) return (
    <div style={{ color: '#475569', textAlign: 'center', padding: 40, fontSize: 11 }}>
      {charId} holds no beliefs yet.
    </div>
  );

  const sourceColor: Record<string, string> = {
    told: 'var(--sm-warn)', inferred: 'var(--sm-cool)', witnessed: 'var(--sm-ok)', observation: 'var(--sm-cool)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 4 }}>{charId.toUpperCase()} — {beliefs.length} BELIEF{beliefs.length !== 1 ? 'S' : ''}</div>
      {beliefs.map(b => {
        const confPct = Math.round(b.confidence * 100);
        const confColor = b.confidence >= 0.7 ? 'var(--sm-ok)' : b.confidence >= 0.4 ? 'var(--sm-warn)' : 'var(--sm-stamp)';
        return (
          <div key={b.beliefId} style={{ background: 'var(--sm-night-2)', border: '1px solid var(--sm-night-line)', borderRadius: 5, padding: '8px 11px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{
                background: (sourceColor[b.source] ?? 'var(--sm-ink-mute)') + '22',
                color: sourceColor[b.source] ?? 'var(--sm-ink-mute)',
                border: `1px solid ${(sourceColor[b.source] ?? 'var(--sm-ink-mute)') + '55'}`,
                borderRadius: 3, padding: '1px 5px', fontSize: 9, fontWeight: 700, flexShrink: 0,
              }}>{b.source}</span>
              <span style={{ color: 'var(--sm-cream)', fontSize: 12 }}>{b.proposition}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, background: 'var(--sm-night-line)', borderRadius: 3, height: 4 }}>
                <div style={{ background: confColor, height: '100%', width: `${confPct}%`, borderRadius: 3 }} />
              </div>
              <span style={{ color: confColor, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{confPct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetaView({ layers, charId }: { layers: MetaLayer[]; charId: string | null }) {
  if (!charId) return <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>← Select a character</div>;
  if (layers.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ color: '#475569', textAlign: 'center', padding: 30, fontSize: 11 }}>
        {charId} has no inferred meta-beliefs yet.
      </div>
      <div style={{ background: 'var(--sm-night-2)', borderRadius: 5, padding: '10px 14px', color: 'var(--sm-ink-mute)', fontSize: 10 }}>
        Meta-beliefs arise when a character holds a "told" belief that overlaps with another character's proposition.
        Engage characters in dialogue scenes to build ToM² depth.
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 4 }}>{charId.toUpperCase()} BELIEVES THAT…</div>
      {layers.map((m, i) => (
        <div key={i} style={{ background: '#1a1535', border: '1px solid #4c1d95', borderRadius: 5, padding: '8px 11px' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ color: 'var(--sm-cool)', fontWeight: 700, fontSize: 11 }}>{m.targetId}</span>
            <span style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>believes</span>
            <span style={{ color: 'var(--sm-cream)', fontSize: 11 }}>"{m.proposition}"</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ color: '#7c3aed', fontSize: 9 }}>ToM depth {m.depth}</span>
            <span style={{ color: '#475569', fontSize: 9 }}>via {m.basis}</span>
            <span style={{ color: 'var(--sm-cool)', fontSize: 10, fontWeight: 700, marginLeft: 'auto' }}>{Math.round(m.confidence * 100)}% conf</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function IronyView({ pairs }: { pairs: IronyPair[] }) {
  if (pairs.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ color: '#475569', textAlign: 'center', padding: 30, fontSize: 11 }}>
        No dramatic irony pairs detected.
      </div>
      <div style={{ background: 'var(--sm-night-2)', borderRadius: 5, padding: '10px 14px', color: 'var(--sm-ink-mute)', fontSize: 10 }}>
        Dramatic irony occurs when two characters hold divergent beliefs about the same proposition
        (confidence difference ≥ 40%). The audience can see both perspectives simultaneously.
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 4 }}>
        {pairs.length} DRAMATIC IRONY PAIR{pairs.length !== 1 ? 'S' : ''} DETECTED
      </div>
      {pairs.map((p, i) => {
        const diff = Math.abs(p.confA - p.confB);
        const strength = diff >= 0.7 ? 'strong' : diff >= 0.5 ? 'moderate' : 'mild';
        const strengthColor = diff >= 0.7 ? 'var(--sm-stamp)' : diff >= 0.5 ? 'var(--sm-warn)' : 'var(--sm-warn)';
        return (
          <div key={i} style={{ background: 'var(--sm-night-2)', border: `1px solid ${strengthColor}55`, borderRadius: 5, padding: '10px 12px' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ background: strengthColor + '22', color: strengthColor, border: `1px solid ${strengthColor}55`, borderRadius: 3, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>
                {strength} irony
              </span>
              <span style={{ color: '#475569', fontSize: 9 }}>Δconf={Math.round(diff * 100)}%</span>
            </div>
            <div style={{ color: '#fcd34d', fontSize: 11, marginBottom: 8 }}>"{p.proposition}"</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <BeliefConfBar charId={p.charA} conf={p.confA} />
              <BeliefConfBar charId={p.charB} conf={p.confB} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BeliefConfBar({ charId, conf }: { charId: string; conf: number }) {
  const pct = Math.round(conf * 100);
  const color = conf >= 0.7 ? 'var(--sm-ok)' : conf >= 0.4 ? 'var(--sm-warn)' : 'var(--sm-stamp)';
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: 'var(--sm-cream-mute)', fontSize: 10 }}>{charId}</span>
        <span style={{ color, fontSize: 10, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ background: 'var(--sm-night-line)', borderRadius: 3, height: 5 }}>
        <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatRow({ label, value, color = 'var(--sm-cream-mute)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>{label}</span>
      <span style={{ color, fontSize: 10, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function chipBtn(bg: string): React.CSSProperties {
  return {
    background: bg, border: '1px solid var(--sm-night-line)', borderRadius: 4,
    color: 'var(--sm-cream)', padding: '3px 8px', cursor: 'pointer',
    fontFamily: 'var(--sm-font-mono)', fontSize: 11,
  };
}
