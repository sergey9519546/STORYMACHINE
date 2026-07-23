// MomentumPanel — Narrative Momentum Dashboard (Wave 30).
// Fetches GET /api/nvm/momentum and shows the CI-style history of:
//   quality score, regression grade, tension total, proof pass rate
// — one data point per committed scene, rendered as sparklines + a scene table.

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

interface MomentumPoint {
  sceneIdx: number;
  commitId: string;
  opCount: number;
  qualityScore: number;
  qualityWarnings: number;
  regressionScore: number;
  regressionGrade: Grade;
  tensionTotal: number;
  proofPassRate: number; // 0-100
}

interface MomentumData {
  points: MomentumPoint[];
  totalScenes: number;
}

interface Props { onClose: () => void; }

// ── Config ────────────────────────────────────────────────────────────────────

const GRADE_COLOR: Record<Grade, string> = {
  A: 'var(--sm-ok)', B: '#86efac', C: 'var(--sm-warn)', D: 'var(--sm-warn)', F: 'var(--sm-stamp)',
};

function gradeColor(g: Grade): string { return GRADE_COLOR[g] ?? 'var(--sm-cream-mute)'; }

function trendIcon(values: number[]): string {
  if (values.length < 2) return '→';
  const delta = values[values.length - 1] - values[values.length - 2];
  if (delta > 2) return '↑';
  if (delta < -2) return '↓';
  return '→';
}

function trendColor(values: number[]): string {
  const icon = trendIcon(values);
  return icon === '↑' ? 'var(--sm-ok)' : icon === '↓' ? 'var(--sm-stamp)' : 'var(--sm-ink-mute)';
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ values, color, width = 180, height = 40 }: {
  values: number[]; color: string; width?: number; height?: number;
}) {
  if (values.length < 2) {
    return <svg width={width} height={height}><rect width={width} height={height} fill="var(--sm-night)" /></svg>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  const last = values[values.length - 1];
  const lx = width;
  const ly = height - ((last - min) / range) * (height - 6) - 3;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <rect width={width} height={height} fill="var(--sm-night)" rx={3} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" opacity={0.8} />
      <circle cx={lx} cy={ly} r={3} fill={color} />
    </svg>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, trend, tCol, sparkValues, sparkColor }: {
  label: string; value: string | number; unit?: string;
  trend: string; tCol: string;
  sparkValues: number[]; sparkColor: string;
}) {
  return (
    <div style={{ background: 'var(--sm-night-2)', borderRadius: 7, padding: '12px 14px', flex: 1 }}>
      <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
        <span style={{ color: 'var(--sm-cream)', fontSize: 22, fontWeight: 700 }}>{value}</span>
        {unit && <span style={{ color: 'var(--sm-ink-mute)', fontSize: 11 }}>{unit}</span>}
        <span style={{ color: tCol, fontSize: 14, marginLeft: 'auto' }}>{trend}</span>
      </div>
      <Sparkline values={sparkValues} color={sparkColor} />
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function MomentumPanel({ onClose }: Props) {
  const [data, setData]       = useState<MomentumData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/nvm/momentum');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setData(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pts = data?.points ?? [];
  const last = pts[pts.length - 1];

  const qVals     = pts.map(p => p.qualityScore);
  const regVals   = pts.map(p => p.regressionScore);
  const tenVals   = pts.map(p => p.tensionTotal);
  const prVals    = pts.map(p => p.proofPassRate);

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
          <strong style={{ fontSize: 15 }}>Narrative Momentum</strong>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11, marginTop: 2 }}>
            Quality · Regression · Tension · Proofs — scene-by-scene CI history
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={chipBtn('var(--sm-night-2)')}>↺</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sm-cream-mute)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      </div>

      {loading && <div style={{ color: 'var(--sm-ink-mute)', textAlign: 'center', padding: 40 }}>Replaying story momentum…</div>}
      {error && <div style={{ color: 'var(--sm-stamp)', background: 'var(--sm-night-2)', padding: 12, margin: 12, borderRadius: 5 }}>{error}</div>}

      {data && data.totalScenes === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>
          No committed scenes yet. Commit some scenes to see momentum.
        </div>
      )}

      {data && data.totalScenes > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Metric cards row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <MetricCard
              label="Quality Score"
              value={last?.qualityScore ?? '—'}
              unit="/100"
              trend={trendIcon(qVals)}
              tCol={trendColor(qVals)}
              sparkValues={qVals}
              sparkColor="var(--sm-ok)"
            />
            <MetricCard
              label="Regression Grade"
              value={last ? `${last.regressionGrade}` : '—'}
              unit={last ? `(${last.regressionScore}/100)` : ''}
              trend={trendIcon(regVals)}
              tCol={trendColor(regVals)}
              sparkValues={regVals}
              sparkColor="var(--sm-cool)"
            />
            <MetricCard
              label="Tension Total"
              value={last?.tensionTotal.toFixed(1) ?? '—'}
              trend={trendIcon(tenVals)}
              tCol={trendColor(tenVals)}
              sparkValues={tenVals}
              sparkColor="var(--sm-warn)"
            />
            <MetricCard
              label="Proof Pass Rate"
              value={last ? `${last.proofPassRate}%` : '—'}
              trend={trendIcon(prVals)}
              tCol={trendColor(prVals)}
              sparkValues={prVals}
              sparkColor="var(--sm-cool)"
            />
          </div>

          {/* Combined multi-line chart */}
          {pts.length >= 2 && (
            <div style={{ background: 'var(--sm-night-2)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 8 }}>
                TRAJECTORY — scenes 0–{pts[pts.length - 1].sceneIdx}
              </div>
              <MultiLineChart points={pts} />
              <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'Quality', color: 'var(--sm-ok)' },
                  { label: 'Regression', color: 'var(--sm-cool)' },
                  { label: 'Proof Pass', color: 'var(--sm-cool)' },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 16, height: 2, background: color }} />
                    <span style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scene-by-scene table */}
          <div>
            <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 6 }}>SCENE HISTORY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <SceneTableHeader />
              {pts.map(p => <SceneRow key={p.commitId} point={p} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Multi-line chart ──────────────────────────────────────────────────────────

function MultiLineChart({ points }: { points: MomentumPoint[] }) {
  const W = 600, H = 80;
  const n = points.length;

  function line(values: number[], color: string) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / (n - 1)) * W;
      const y = H - ((v - min) / range) * (H - 8) - 4;
      return `${x},${y}`;
    }).join(' ');
    return <polyline key={color} points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" opacity={0.85} />;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', borderRadius: 4 }}>
      <rect width={W} height={H} fill="var(--sm-night)" />
      {line(points.map(p => p.qualityScore),     'var(--sm-ok)')}
      {line(points.map(p => p.regressionScore),  'var(--sm-cool)')}
      {line(points.map(p => p.proofPassRate),    'var(--sm-cool)')}
      {points.map((_, i) => {
        const x = (i / (n - 1)) * W;
        return <line key={i} x1={x} y1={H - 3} x2={x} y2={H} stroke="var(--sm-night-line)" strokeWidth={1} />;
      })}
    </svg>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

function SceneTableHeader() {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '3px 9px', color: '#475569', fontSize: 9 }}>
      <span style={{ width: 50, flexShrink: 0 }}>SCENE</span>
      <span style={{ width: 60, flexShrink: 0 }}>QUALITY</span>
      <span style={{ width: 60, flexShrink: 0 }}>GRADE</span>
      <span style={{ width: 60, flexShrink: 0 }}>TENSION</span>
      <span style={{ width: 60, flexShrink: 0 }}>PROOFS</span>
      <span style={{ flex: 1 }}>WARNINGS</span>
      <span style={{ width: 40, flexShrink: 0 }}>OPS</span>
    </div>
  );
}

function SceneRow({ point: p }: { point: MomentumPoint }) {
  const qColor = p.qualityScore >= 75 ? 'var(--sm-ok)' : p.qualityScore >= 55 ? 'var(--sm-warn)' : 'var(--sm-stamp)';
  const prColor = p.proofPassRate === 100 ? 'var(--sm-ok)' : p.proofPassRate >= 80 ? 'var(--sm-warn)' : 'var(--sm-stamp)';
  return (
    <div style={{
      background: 'var(--sm-night-2)', border: '1px solid var(--sm-night-2)', borderRadius: 4, padding: '5px 9px',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ color: '#475569', fontSize: 10, width: 50, flexShrink: 0 }}>scene {p.sceneIdx}</span>
      <span style={{ color: qColor, fontSize: 10, width: 60, flexShrink: 0 }}>{p.qualityScore}/100</span>
      <span style={{ color: gradeColor(p.regressionGrade), fontSize: 10, width: 60, flexShrink: 0, fontWeight: 700 }}>
        {p.regressionGrade} ({p.regressionScore})
      </span>
      <span style={{ color: 'var(--sm-warn)', fontSize: 10, width: 60, flexShrink: 0 }}>{p.tensionTotal.toFixed(2)}</span>
      <span style={{ color: prColor, fontSize: 10, width: 60, flexShrink: 0 }}>{p.proofPassRate}%</span>
      <span style={{ color: p.qualityWarnings > 3 ? 'var(--sm-stamp)' : 'var(--sm-ink-mute)', fontSize: 10, flex: 1 }}>
        {p.qualityWarnings} warning{p.qualityWarnings !== 1 ? 's' : ''}
      </span>
      <span style={{ color: 'var(--sm-ink-mute)', fontSize: 10, width: 40, flexShrink: 0 }}>{p.opCount} ops</span>
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
