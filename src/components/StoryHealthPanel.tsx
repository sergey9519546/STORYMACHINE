// StoryHealthPanel — unified story vitals dashboard.
// One GET /api/nvm/health call aggregates tension, topology, arc-completion,
// epistemic state, quality, proof pass-rate, and momentum. Glanceable
// vital-signs grid + sparklines + open-promise urgency.

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TopologyScore { archetype: string; similarity: number; rank: number; }

interface HealthReport {
  commitCount: number;
  sceneCount: number;
  currentTension: number;
  tensionHistory: number[];
  momentum: number;
  topology: {
    dominantArc: string;
    coherence: number;
    scores: TopologyScore[];
  };
  arcCompletion: {
    openCount: number;
    overdueCount: number;
    resolvedCount: number;
    debtScore: number;
    mostUrgent: Array<{ kind: string; description: string; urgency: string }>;
  };
  epistemic: {
    characterCount: number;
    totalBeliefs: number;
    suspense: number;
    clueCount: number;
    payoffCount: number;
  };
  proof: {
    passRate: number;
    avgQualityScore: number;
    tier1TopFailures?: Array<{ proof: string; failCount: number }>;
  };
}

interface Props { onClose: () => void; }

// ── Panel ─────────────────────────────────────────────────────────────────────

export function StoryHealthPanel({ onClose }: Props) {
  const [report, setReport]   = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nvm/health');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!report && loading) return (
    <div style={panelStyle}>
      <PanelHeader onClose={onClose} onRefresh={load} />
      <div style={{ color: '#64748b', textAlign: 'center', padding: 60 }}>Aggregating story vitals…</div>
    </div>
  );

  if (!report && error) return (
    <div style={panelStyle}>
      <PanelHeader onClose={onClose} onRefresh={load} />
      <div style={{ color: '#f87171', padding: 20 }}>{error}</div>
    </div>
  );

  if (!report) return (
    <div style={panelStyle}>
      <PanelHeader onClose={onClose} onRefresh={load} />
      <div style={{ color: '#475569', textAlign: 'center', padding: 60 }}>No data yet.</div>
    </div>
  );

  return (
    <div style={panelStyle}>
      <PanelHeader onClose={onClose} onRefresh={load} subtitle={`${report.commitCount} commits · ${report.sceneCount} scenes`} />

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Vitals grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <VitalCard label="Proof pass rate" value={`${report.proof.passRate}%`} color={report.proof.passRate >= 80 ? '#4ade80' : report.proof.passRate >= 60 ? '#fb923c' : '#f87171'} sub="Tier 1 per scene" />
          <VitalCard label="Avg quality" value={String(report.proof.avgQualityScore)} color={scoreColor(report.proof.avgQualityScore)} sub="Tier 2 score" />
          <VitalCard label="Tension" value={report.currentTension.toFixed(1)} color="#60a5fa" sub="mark-to-market" />
          <VitalCard label="Momentum" value={`${Math.round(report.momentum * 100)}%`} color={report.momentum >= 0.6 ? '#4ade80' : report.momentum >= 0.3 ? '#fb923c' : '#f87171'} sub="5-scene signal" />
        </div>

        {/* Tension sparkline */}
        {report.tensionHistory.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>Tension Curve</span>
              <span style={{ color: '#60a5fa', fontSize: 11 }}>current: {report.currentTension.toFixed(1)}</span>
            </div>
            <TensionSparkline values={report.tensionHistory} />
          </div>
        )}

        {/* Topology */}
        <div style={{ background: '#1e293b', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Emotional Arc Topology</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: 10 }}>DOMINANT ARC</div>
              <div style={{ color: '#a78bfa', fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>
                {report.topology.dominantArc.replace(/_/g, ' ')}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: 10 }}>COHERENCE</div>
              <div style={{ color: '#fbbf24', fontSize: 16, fontWeight: 700 }}>{report.topology.coherence}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {report.topology.scores.map(s => (
                <div key={s.archetype} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: 9, width: 90, flexShrink: 0 }}>{s.archetype.replace(/_/g, ' ')}</span>
                  <div style={{ flex: 1, background: '#334155', borderRadius: 3, height: 4 }}>
                    <div style={{ background: s.rank === 1 ? '#a78bfa' : '#64748b', width: `${Math.round(s.similarity * 100)}%`, height: '100%', borderRadius: 3 }} />
                  </div>
                  <span style={{ color: s.rank === 1 ? '#a78bfa' : '#475569', fontSize: 9 }}>{Math.round(s.similarity * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Arc completion summary */}
        <div style={{ background: '#1e293b', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>Arc Completion</span>
            <span style={{ color: report.arcCompletion.debtScore >= 40 ? '#f87171' : '#4ade80', fontSize: 11 }}>
              debt: {report.arcCompletion.debtScore}%
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: report.arcCompletion.mostUrgent.length > 0 ? 10 : 0 }}>
            <MiniStat label="Open" value={String(report.arcCompletion.openCount)} color="#94a3b8" />
            <MiniStat label="Overdue" value={String(report.arcCompletion.overdueCount)} color={report.arcCompletion.overdueCount > 0 ? '#f87171' : '#64748b'} />
            <MiniStat label="Resolved" value={String(report.arcCompletion.resolvedCount)} color="#4ade80" />
          </div>
          {report.arcCompletion.mostUrgent.map((p, i) => (
            <div key={i} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 4, padding: '5px 9px', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <UrgencyBadge urgency={p.urgency} />
                <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700 }}>{p.kind}</span>
                <span style={{ color: '#64748b', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Epistemic */}
        <div style={{ background: '#1e293b', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Epistemic State</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <MiniStat label="Characters" value={String(report.epistemic.characterCount)} color="#94a3b8" />
            <MiniStat label="Beliefs" value={String(report.epistemic.totalBeliefs)} color="#60a5fa" />
            <MiniStat label="Suspense" value={String(report.epistemic.suspense)} color={report.epistemic.suspense >= 70 ? '#f87171' : '#94a3b8'} />
            <MiniStat label={`Clues / Payoffs`} value={`${report.epistemic.clueCount} / ${report.epistemic.payoffCount}`} color="#fbbf24" />
          </div>
        </div>

        {/* Proof failure breakdown */}
        {report.proof.tier1TopFailures && report.proof.tier1TopFailures.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '12px 14px' }}>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              Tier 1 Failure Breakdown
            </div>
            {report.proof.tier1TopFailures.map(({ proof, failCount }) => (
              <div key={proof} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ color: '#64748b', fontSize: 11 }}>{proof}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 80, background: '#334155', borderRadius: 3, height: 5 }}>
                    <div style={{
                      background: '#f87171',
                      width: `${Math.min(100, Math.round((failCount / (report.commitCount || 1)) * 100))}%`,
                      height: '100%', borderRadius: 3,
                    }} />
                  </div>
                  <span style={{ color: '#f87171', fontSize: 11, width: 22, textAlign: 'right' }}>{failCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function PanelHeader({ onClose, onRefresh, subtitle }: { onClose: () => void; onRefresh: () => void; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
      <div>
        <strong style={{ fontSize: 15 }}>Story Health Dashboard</strong>
        {subtitle && <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onRefresh} style={btnStyle('#1e293b')}>↺ refresh</button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
    </div>
  );
}

function VitalCard({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 6, padding: '10px 12px' }}>
      <div style={{ color: '#64748b', fontSize: 9, marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#475569', fontSize: 9, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ color: '#64748b', fontSize: 9 }}>{label}</div>
      <div style={{ color, fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const conf: Record<string, { color: string; bg: string }> = {
    overdue:  { color: '#f87171', bg: '#450a0a' },
    due_soon: { color: '#fb923c', bg: '#1c0800' },
    on_track: { color: '#4ade80', bg: '#032012' },
    not_yet:  { color: '#64748b', bg: '#1e293b' },
  };
  const c = conf[urgency] ?? conf.not_yet;
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}55`, borderRadius: 3, padding: '0 5px', fontSize: 8, fontWeight: 700 }}>
      {urgency.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

// ── Tension sparkline ─────────────────────────────────────────────────────────

function TensionSparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const H = 52, W = 400;
  const pts = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * W : W / 2;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
        <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
        {/* current point */}
        {values.length > 0 && (() => {
          const last = values[values.length - 1];
          const x = W;
          const y = H - ((last - min) / range) * H;
          return <circle cx={x} cy={y} r={4} fill="#60a5fa" />;
        })()}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: 9, marginTop: 2 }}>
        <span>scene 0</span>
        <span>scene {values.length - 1}</span>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  return s >= 70 ? '#4ade80' : s >= 40 ? '#fb923c' : '#f87171';
}

const panelStyle: React.CSSProperties = {
  background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
  border: '1px solid #334155', width: 720, maxWidth: '98vw',
  maxHeight: '90vh', display: 'flex', flexDirection: 'column',
  fontFamily: 'monospace', fontSize: 13,
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, border: '1px solid #334155', borderRadius: 4,
    color: '#e2e8f0', padding: '3px 8px', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 11,
  };
}
