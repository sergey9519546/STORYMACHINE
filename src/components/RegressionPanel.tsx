// RegressionPanel — Narrative Regression Suite (Wave 29).
// Fetches GET /api/nvm/regression and shows the 14-invariant test report:
//   pass (green) / fail (red) / warning (amber) / na (gray)
// with an overall grade and per-category breakdown.

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'pass' | 'fail' | 'warning' | 'na';
type Category = 'structure' | 'character' | 'clues' | 'tension' | 'theme';
type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

interface InvariantResult {
  id: string;
  name: string;
  category: Category;
  status: Status;
  message: string;
  sceneRef?: number;
}

interface CategoryStats { pass: number; fail: number; warning: number; na: number; }

interface RegressionReport {
  results: InvariantResult[];
  totalScenes: number;
  pass: number;
  fail: number;
  warning: number;
  na: number;
  score: number;
  grade: Grade;
  byCategory: Record<Category, CategoryStats>;
}

interface Props { onClose: () => void; }

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  pass:    { label: 'PASS',    color: 'var(--sm-ok)', bg: '#052e16' },
  fail:    { label: 'FAIL',    color: 'var(--sm-stamp)', bg: 'var(--sm-stamp-dk)' },
  warning: { label: 'WARN',    color: 'var(--sm-warn)', bg: '#422006' },
  na:      { label: 'N/A',     color: 'var(--sm-ink-mute)', bg: 'var(--sm-night-2)' },
};

const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  structure: { label: 'Structure', color: 'var(--sm-cool)' },
  character: { label: 'Character', color: 'var(--sm-cool)' },
  clues:     { label: 'Clues',     color: 'var(--sm-warn)' },
  tension:   { label: 'Tension',   color: 'var(--sm-stamp)' },
  theme:     { label: 'Theme',     color: 'var(--sm-ok)' },
};

const GRADE_COLOR: Record<Grade, string> = {
  A: 'var(--sm-ok)', B: '#86efac', C: 'var(--sm-warn)', D: 'var(--sm-warn)', F: 'var(--sm-stamp)',
};

const CATEGORIES: Category[] = ['structure', 'character', 'clues', 'tension', 'theme'];

// ── Panel ─────────────────────────────────────────────────────────────────────

export function RegressionPanel({ onClose }: Props) {
  const [data, setData]       = useState<RegressionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<Status | 'all'>('all');
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/nvm/regression');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setData(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = data?.results.filter(r =>
    (filter === 'all' || r.status === filter) &&
    (catFilter === 'all' || r.category === catFilter),
  ) ?? [];

  return (
    <div style={{
      background: 'var(--sm-night)', color: 'var(--sm-cream)', borderRadius: 8,
      border: '1px solid var(--sm-night-line)', width: 820, maxWidth: '98vw',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--sm-font-mono)', fontSize: 13,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--sm-night-line)', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: 15 }}>Narrative Regression Suite</strong>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11, marginTop: 2 }}>
            14 structural invariants — story correctness by construction
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {data && <GradeBadge grade={data.grade} score={data.score} />}
          <button onClick={load} style={chipBtn('var(--sm-night-2)')}>↺</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sm-cream-mute)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      </div>

      {loading && <div style={{ color: 'var(--sm-ink-mute)', textAlign: 'center', padding: 40 }}>Running invariants…</div>}
      {error && <div style={{ color: 'var(--sm-stamp)', background: 'var(--sm-night-2)', padding: 12, margin: 12, borderRadius: 5 }}>{error}</div>}

      {data && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left sidebar: summary + category breakdown */}
          <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--sm-night-line)', overflowY: 'auto', padding: 12 }}>
            {/* Counts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
              {(['pass', 'fail', 'warning', 'na'] as Status[]).map(s => {
                const m = STATUS_META[s];
                return (
                  <div key={s} onClick={() => setFilter(filter === s ? 'all' : s)}
                    style={{ background: filter === s ? m.bg : 'var(--sm-night-2)', border: `1px solid ${filter === s ? m.color : 'var(--sm-night-line)'}`, borderRadius: 5, padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ color: m.color, fontWeight: 700, fontSize: 16 }}>{data[s]}</div>
                    <div style={{ color: 'var(--sm-ink-mute)', fontSize: 9 }}>{m.label}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 6 }}>BY CATEGORY</div>
            {CATEGORIES.map(cat => {
              const m = CATEGORY_META[cat];
              const stats = data.byCategory[cat];
              const sel = catFilter === cat;
              return (
                <div key={cat} onClick={() => setCatFilter(sel ? 'all' : cat)} style={{
                  background: sel ? 'var(--sm-night-2)' : 'transparent',
                  border: `1px solid ${sel ? 'var(--sm-night-line)' : 'transparent'}`,
                  borderRadius: 5, padding: '6px 8px', marginBottom: 3, cursor: 'pointer',
                }}>
                  <div style={{ color: m.color, fontSize: 11, fontWeight: 700 }}>{m.label}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                    <span style={{ color: 'var(--sm-ok)', fontSize: 9 }}>{stats.pass}P</span>
                    <span style={{ color: 'var(--sm-stamp)', fontSize: 9 }}>{stats.fail}F</span>
                    <span style={{ color: 'var(--sm-warn)', fontSize: 9 }}>{stats.warning}W</span>
                    {stats.na > 0 && <span style={{ color: '#475569', fontSize: 9 }}>{stats.na}—</span>}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 14, color: 'var(--sm-ink-mute)', fontSize: 10 }}>
              {data.totalScenes} scene{data.totalScenes !== 1 ? 's' : ''} · {data.results.length} invariants
            </div>
          </div>

          {/* Right: invariant list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
              {(['all', 'pass', 'fail', 'warning', 'na'] as const).map(s => (
                <button key={s} onClick={() => setFilter(s)} style={{
                  background: filter === s ? (s === 'all' ? 'var(--sm-night-line)' : STATUS_META[s as Status].bg) : 'var(--sm-night-2)',
                  border: `1px solid ${filter === s ? (s === 'all' ? 'var(--sm-ink-mute)' : STATUS_META[s as Status].color) : 'var(--sm-night-line)'}`,
                  color: s === 'all' ? 'var(--sm-cream)' : STATUS_META[s as Status].color,
                  borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
                  fontFamily: 'var(--sm-font-mono)', fontSize: 10,
                }}>
                  {s === 'all' ? 'All' : STATUS_META[s as Status].label}
                </button>
              ))}
            </div>

            {visible.length === 0 && (
              <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>No invariants match this filter.</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {visible.map(r => <InvariantRow key={r.id} result={r} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InvariantRow({ result: r }: { result: InvariantResult }) {
  const m = STATUS_META[r.status];
  const cat = CATEGORY_META[r.category];
  return (
    <div style={{
      background: 'var(--sm-night-2)', border: `1px solid ${r.status === 'fail' ? '#7f1d1d' : r.status === 'warning' ? '#78350f' : 'var(--sm-night-line)'}`,
      borderLeft: `3px solid ${m.color}`,
      borderRadius: 5, padding: '8px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StatusBadge status={r.status} />
        <span style={{ color: 'var(--sm-cream)', fontWeight: 700, fontSize: 12 }}>{r.name}</span>
        <span style={{ color: cat.color, fontSize: 9, border: `1px solid ${cat.color}33`, borderRadius: 3, padding: '0 4px' }}>{r.category}</span>
        {r.sceneRef !== undefined && (
          <span style={{ color: 'var(--sm-ink-mute)', fontSize: 9 }}>scene {r.sceneRef}</span>
        )}
      </div>
      <div style={{ color: 'var(--sm-cream-mute)', fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>{r.message}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : status === 'warning' ? '!' : '—';
  return (
    <span style={{
      background: m.bg, color: m.color,
      border: `1px solid ${m.color}66`,
      borderRadius: 3, padding: '1px 5px', fontSize: 9, fontWeight: 700,
      minWidth: 34, textAlign: 'center', display: 'inline-block',
    }}>{icon} {m.label}</span>
  );
}

function GradeBadge({ grade, score }: { grade: Grade; score: number }) {
  return (
    <div style={{ textAlign: 'center', lineHeight: 1 }}>
      <div style={{ color: GRADE_COLOR[grade], fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{grade}</div>
      <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>{score}/100</div>
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
