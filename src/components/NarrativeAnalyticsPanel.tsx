// NarrativeAnalyticsPanel — surfaces three NVM valuation engines that compute
// rich narrative intelligence from the current canon but previously had no UI:
//   • Tension Ledger   (GET /api/nvm/tension)   — open dramatic positions, mark-to-market
//   • Story Topology    (GET /api/nvm/topology)  — emotional-arc archetype fit (Vonnegut shapes)
//   • Two-Reader Report (GET /api/nvm/two-reader)— first-watch vs rewatch scoring
// All three derive from committed story state, so they read "empty" until scenes exist.

import React, { useState, useCallback } from 'react';

type AnalyticsTab = 'tension' | 'topology' | 'two-reader';

// ── Response shapes (mirror server/nvm/valuation/*) ──────────────────────────
interface DramaticPosition {
  positionId: string;
  kind: 'belief_conflict' | 'unexposed_lie' | 'open_payoff' | 'ticking_clock' | 'unresolved_relationship' | 'dramatic_irony';
  charId?: string;
  description: string;
  openedAtScene: number;
  expectedPayoff: number;
  timeDecay: number;
  markToMarket: number;
}
interface TensionLedger {
  positions: DramaticPosition[];
  totalTension: number;
  sceneIdx: number;
}
interface TopologyScore { archetype: string; similarity: number; rank: number; }
interface TopologyReport {
  trajectory: number[];
  scores: TopologyScore[];
  dominantArc: string;
  coherence: number;
}
interface ReaderCurve {
  mode: 'first_watch' | 'rewatch';
  suspense: number;
  ironyDensity: number;
  structuralElegance: number;
  emotionalArc: number[];
  overallScore: number;
}
interface TwoReaderReport {
  firstWatch: ReaderCurve;
  rewatch: ReaderCurve;
  twistPremium: number;
  rewatchRecommended: boolean;
}

interface TabSpec { id: AnalyticsTab; label: string; icon: string; endpoint: string; description: string; color: string; }
const TABS: TabSpec[] = [
  { id: 'tension',    label: 'Tension Ledger', icon: '📈', endpoint: '/api/nvm/tension',    description: 'Open dramatic positions priced mark-to-market',     color: '#fb923c' },
  { id: 'topology',   label: 'Story Shape',    icon: '🪐', endpoint: '/api/nvm/topology',   description: 'Emotional-arc fit against classic story archetypes', color: '#a78bfa' },
  { id: 'two-reader', label: 'Two-Reader',     icon: '👁️', endpoint: '/api/nvm/two-reader', description: 'First-watch vs rewatch scoring & twist premium',     color: '#34d399' },
];

const KIND_LABEL: Record<DramaticPosition['kind'], string> = {
  belief_conflict: 'Belief Conflict',
  unexposed_lie: 'Unexposed Lie',
  open_payoff: 'Open Payoff',
  ticking_clock: 'Ticking Clock',
  unresolved_relationship: 'Unresolved Relationship',
  dramatic_irony: 'Dramatic Irony',
};
const ARC_LABEL: Record<string, string> = {
  rags_to_riches: 'Rags to Riches (rise)',
  riches_to_rags: 'Riches to Rags (tragedy)',
  man_in_hole: 'Man in Hole (redemption)',
  icarus: 'Icarus (hubris)',
  cinderella: 'Cinderella (rise-fall-rise)',
  oedipus: 'Oedipus (fall-rise-fall)',
  flat_line: 'Flat Line (no movement)',
  oscillation: 'Oscillation (seesaw)',
  delayed_rise: 'Delayed Rise (slow burn)',
};

interface Props { onClose: () => void; }

export function NarrativeAnalyticsPanel({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('tension');
  const [data, setData] = useState<Partial<Record<AnalyticsTab, unknown>>>({});
  const [loading, setLoading] = useState<Partial<Record<AnalyticsTab, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<AnalyticsTab, string>>>({});

  const load = useCallback(async (tab: AnalyticsTab, force = false) => {
    const spec = TABS.find(t => t.id === tab)!;
    if (!force && (data[tab] || loading[tab])) return;
    setLoading(l => ({ ...l, [tab]: true }));
    setErrors(e => ({ ...e, [tab]: undefined }));
    try {
      const res = await fetch(spec.endpoint);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(body.error ?? 'Server error');
      }
      const json = await res.json();
      setData(d => ({ ...d, [tab]: json }));
    } catch (e) {
      setErrors(err => ({ ...err, [tab]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setLoading(l => ({ ...l, [tab]: false }));
    }
  }, [data, loading]);

  function selectTab(id: AnalyticsTab) { setActiveTab(id); load(id); }

  const currentTab = TABS.find(t => t.id === activeTab)!;
  const isLoading = loading[activeTab];
  const currentError = errors[activeTab];
  const current = data[activeTab];

  // Load the default tab once on first render.
  React.useEffect(() => { load('tension'); }, [load]);

  return (
    <div style={{
      width: 'min(880px, 94vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
      background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155',
      borderRadius: 8, fontFamily: 'ui-monospace, monospace', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #334155' }}>
        <div style={{ fontWeight: 700, letterSpacing: 0.5 }}>
          <span style={{ marginRight: 8 }}>🔬</span>Narrative Analytics
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => load(activeTab, true)} title="Refresh this tab"
            style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>↺</button>
          <button onClick={onClose} title="Close"
            style={{ background: '#1e293b', color: '#f87171', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => selectTab(t.id)}
            title={t.description}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
              background: activeTab === t.id ? t.color : '#1e293b',
              color: activeTab === t.id ? '#0f172a' : '#cbd5e1',
              border: `1px solid ${activeTab === t.id ? t.color : '#334155'}`,
              fontWeight: activeTab === t.id ? 700 : 400, fontSize: 12,
            }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#64748b', padding: '8px 16px 0' }}>{currentTab.description}</div>

      {/* Body */}
      <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
        {isLoading && <div style={{ color: '#94a3b8' }}>Computing {currentTab.label.toLowerCase()}…</div>}
        {currentError && <div style={{ color: '#f87171', background: '#1e293b', padding: 10, borderRadius: 6 }}>{currentError}</div>}
        {!isLoading && !currentError && current != null && (
          <>
            {activeTab === 'tension'   && <TensionView ledger={current as TensionLedger} />}
            {activeTab === 'topology'  && <TopologyView report={current as TopologyReport} />}
            {activeTab === 'two-reader' && <TwoReaderView report={current as TwoReaderReport} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab renderers ────────────────────────────────────────────────────────────

function Bar({ value, color = '#38bdf8', max = 100 }: { value: number; color?: string; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ background: '#1e293b', borderRadius: 4, height: 8, width: '100%', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
    </div>
  );
}

function TensionView({ ledger }: { ledger: TensionLedger }) {
  const positions = [...(ledger.positions ?? [])].sort((a, b) => b.markToMarket - a.markToMarket);
  if (positions.length === 0) {
    return <div style={{ color: '#64748b' }}>No open dramatic positions yet — commit scenes that plant lies, clocks, or payoffs to build tension.</div>;
  }
  const maxMtm = Math.max(...positions.map(p => p.markToMarket), 1);
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <Metric label="Total Tension" value={ledger.totalTension.toFixed(1)} />
        <Metric label="Open Positions" value={String(positions.length)} />
        <Metric label="Scene Index" value={String(ledger.sceneIdx)} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {positions.map(p => (
          <div key={p.positionId} style={{ background: '#1e293b', borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>{KIND_LABEL[p.kind] ?? p.kind}{p.charId ? ` · ${p.charId}` : ''}</span>
              <span style={{ color: '#94a3b8' }}>MtM {p.markToMarket.toFixed(1)} · opened @{p.openedAtScene}</span>
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>{p.description}</div>
            <Bar value={p.markToMarket} color="#fb923c" max={maxMtm} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TopologyView({ report }: { report: TopologyReport }) {
  const scores = [...(report.scores ?? [])].sort((a, b) => a.rank - b.rank);
  if (scores.length === 0) {
    return <div style={{ color: '#64748b' }}>Not enough committed scenes to detect a story shape yet.</div>;
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <Metric label="Dominant Arc" value={ARC_LABEL[report.dominantArc] ?? report.dominantArc} wide />
        <Metric label="Coherence" value={`${report.coherence.toFixed(0)}/100`} />
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Archetype fit (cosine similarity)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {scores.map(s => (
          <div key={s.archetype} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 44px', gap: 8, alignItems: 'center', fontSize: 12 }}>
            <span style={{ color: s.rank === 1 ? '#a78bfa' : '#cbd5e1', fontWeight: s.rank === 1 ? 700 : 400 }}>
              {ARC_LABEL[s.archetype] ?? s.archetype}
            </span>
            <Bar value={s.similarity * 100} color={s.rank === 1 ? '#a78bfa' : '#475569'} />
            <span style={{ color: '#94a3b8', textAlign: 'right' }}>{(s.similarity * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TwoReaderView({ report }: { report: TwoReaderReport }) {
  const fw = report.firstWatch, rw = report.rewatch;
  if (!fw || !rw) return <div style={{ color: '#64748b' }}>Two-reader analysis needs committed scenes with clues and payoffs.</div>;
  const Curve = ({ c }: { c: ReaderCurve }) => (
    <div style={{ flex: 1, background: '#1e293b', borderRadius: 6, padding: 12 }}>
      <div style={{ fontWeight: 700, color: c.mode === 'first_watch' ? '#34d399' : '#60a5fa', marginBottom: 10 }}>
        {c.mode === 'first_watch' ? 'First Watch' : 'Rewatch'} · {c.overallScore.toFixed(0)}/100
      </div>
      {([['Suspense', c.suspense], ['Irony Density', c.ironyDensity], ['Structural Elegance', c.structuralElegance]] as const).map(([label, v]) => (
        <div key={label} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
            <span>{label}</span><span>{v.toFixed(0)}</span>
          </div>
          <Bar value={v} color={c.mode === 'first_watch' ? '#34d399' : '#60a5fa'} />
        </div>
      ))}
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <Metric label="Twist Premium" value={report.twistPremium.toFixed(1)} />
        <Metric label="Rewatch?" value={report.rewatchRecommended ? 'Recommended' : 'Optional'} wide />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Curve c={fw} />
        <Curve c={rw} />
      </div>
    </div>
  );
}

function Metric({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 6, padding: '8px 12px', minWidth: wide ? 160 : 90 }}>
      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
    </div>
  );
}
