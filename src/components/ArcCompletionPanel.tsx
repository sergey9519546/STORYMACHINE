// ArcCompletionPanel — live tracker of every open narrative promise
// across all committed scenes. Shows clues awaiting payoffs, clocks
// counting down, broken relationships, unresolved themes, and object
// arcs in intermediate states, each with a pacing score + completion window.

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type PromiseKind = 'CLUE' | 'CLOCK' | 'REL' | 'THEME' | 'OBJECT';
type PromiseUrgency = 'overdue' | 'due_soon' | 'on_track' | 'not_yet';

interface OpenPromise {
  promiseId: string;
  kind: PromiseKind;
  description: string;
  openedAtScene: number;
  targetWindow: [number, number];
  urgency: PromiseUrgency;
  suggestedOp: string;
  pacingScore: number;
}

interface ArcCompletionReport {
  totalScenes: number;
  openPromises: OpenPromise[];
  resolvedCount: number;
  overdueCount: number;
  debtScore: number;
}

interface Props { onClose: () => void; }

// ── Palette ───────────────────────────────────────────────────────────────────

const KIND_META: Record<PromiseKind, { label: string; icon: string; color: string; bg: string }> = {
  CLUE:   { label: 'Clue',         icon: '🔍', color: 'var(--sm-warn)', bg: 'var(--sm-night-2)' },
  CLOCK:  { label: 'Clock',        icon: '⏱',  color: 'var(--sm-stamp)', bg: 'var(--sm-night-2)' },
  REL:    { label: 'Relationship', icon: '↔',  color: 'var(--sm-warn)', bg: 'var(--sm-night-2)' },
  THEME:  { label: 'Theme',        icon: '◈',  color: 'var(--sm-cool)', bg: 'var(--sm-night-2)' },
  OBJECT: { label: 'Object Arc',   icon: '○',  color: 'var(--sm-cool)', bg: 'var(--sm-night-2)' },
};

const URGENCY_META: Record<PromiseUrgency, { label: string; color: string; bg: string }> = {
  overdue:  { label: 'OVERDUE',   color: 'var(--sm-stamp)', bg: 'var(--sm-stamp-dk)' },
  due_soon: { label: 'DUE SOON',  color: 'var(--sm-warn)', bg: 'var(--sm-night-2)' },
  on_track: { label: 'ON TRACK',  color: 'var(--sm-ok)', bg: 'var(--sm-night-2)' },
  not_yet:  { label: 'NOT YET',   color: 'var(--sm-ink-mute)', bg: 'var(--sm-night-2)' },
};

const ALL_KINDS: PromiseKind[] = ['CLUE', 'CLOCK', 'REL', 'THEME', 'OBJECT'];

// ── Panel ─────────────────────────────────────────────────────────────────────

export function ArcCompletionPanel({ onClose }: Props) {
  const [report, setReport]     = useState<ArcCompletionReport | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<PromiseKind | 'ALL'>('ALL');
  const [urgFilter, setUrgFilter] = useState<PromiseUrgency | 'ALL'>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nvm/arc-completion');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayed = report?.openPromises.filter(p => {
    if (filter !== 'ALL' && p.kind !== filter) return false;
    if (urgFilter !== 'ALL' && p.urgency !== urgFilter) return false;
    return true;
  }) ?? [];

  const debtColor = !report ? 'var(--sm-ink-mute)'
    : report.debtScore <= 10 ? 'var(--sm-ok)'
    : report.debtScore <= 40 ? 'var(--sm-warn)'
    : 'var(--sm-stamp)';

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
          <strong style={{ fontSize: 15 }}>Arc Completion Tracker — open narrative promises</strong>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11, marginTop: 2 }}>
            Clues · Clocks · Relationships · Themes · Object Arcs — pacing scores + completion windows
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={load} style={chipBtn('var(--sm-night-2)')}>↺</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sm-cream-mute)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      </div>

      {/* Summary bar */}
      {report && (
        <div style={{ display: 'flex', gap: 20, padding: '10px 18px', borderBottom: '1px solid var(--sm-night-line)', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <Stat label="Open promises" value={String(report.openPromises.length)} color="var(--sm-cream-mute)" />
          <Stat label="Resolved" value={String(report.resolvedCount)} color="var(--sm-ok)" />
          <Stat label="Overdue" value={String(report.overdueCount)} color={report.overdueCount > 0 ? 'var(--sm-stamp)' : 'var(--sm-ink-mute)'} />
          <Stat label="Arc debt" value={`${report.debtScore}%`} color={debtColor} />
          <Stat label="Scenes" value={String(report.totalScenes)} color="var(--sm-ink-mute)" />

          {/* Debt bar */}
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 3 }}>ARC DEBT</div>
            <div style={{ background: 'var(--sm-night-2)', borderRadius: 4, height: 6 }}>
              <div style={{ background: debtColor, height: '100%', width: `${Math.min(100, report.debtScore)}%`, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {report && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--sm-night-line)', flexShrink: 0, flexWrap: 'wrap' }}>
          <FilterChip active={filter === 'ALL'} label="All" color="var(--sm-cream-mute)" onClick={() => setFilter('ALL')} />
          {ALL_KINDS.map(k => (
            <FilterChip key={k} active={filter === k} label={KIND_META[k].label} color={KIND_META[k].color}
              onClick={() => setFilter(filter === k ? 'ALL' : k)}
              count={report.openPromises.filter(p => p.kind === k).length} />
          ))}
          <div style={{ width: 1, background: 'var(--sm-night-line)', margin: '0 4px' }} />
          {(['overdue', 'due_soon', 'on_track', 'not_yet'] as PromiseUrgency[]).map(u => (
            <FilterChip key={u} active={urgFilter === u} label={URGENCY_META[u].label} color={URGENCY_META[u].color}
              onClick={() => setUrgFilter(urgFilter === u ? 'ALL' : u)}
              count={report.openPromises.filter(p => p.urgency === u).length} />
          ))}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {loading && <div style={{ color: 'var(--sm-ink-mute)', textAlign: 'center', padding: 40 }}>Analyzing arc promises…</div>}
        {error && <div style={{ color: 'var(--sm-stamp)', background: 'var(--sm-night-2)', borderRadius: 5, padding: 10 }}>{error}</div>}

        {report && report.openPromises.length === 0 && (
          <div style={{ background: '#064e3b', border: '1px solid #065f46', borderRadius: 6, padding: '14px 18px', color: 'var(--sm-ok)', fontSize: 12 }}>
            ✓ No open narrative promises — all planted beats are resolved
          </div>
        )}

        {report && displayed.length === 0 && report.openPromises.length > 0 && (
          <div style={{ color: '#475569', textAlign: 'center', padding: 30, fontSize: 11 }}>
            No promises match the current filter.
          </div>
        )}

        {displayed.map(p => <PromiseCard key={p.promiseId} promise={p} totalScenes={report!.totalScenes} />)}

        {/* Scene timeline (compact) */}
        {report && report.openPromises.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <TimelineView promises={report.openPromises} totalScenes={report.totalScenes} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Promise card ──────────────────────────────────────────────────────────────

function PromiseCard({ promise: p, totalScenes }: { promise: OpenPromise; totalScenes: number }) {
  const km = KIND_META[p.kind];
  const um = URGENCY_META[p.urgency];
  const pct = Math.round(p.pacingScore * 100);

  return (
    <div style={{
      background: km.bg, border: `1px solid ${km.color}44`,
      borderRadius: 6, padding: '10px 13px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{km.icon}</span>
        <span style={{ color: km.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{km.label}</span>
        <span style={{ background: um.bg, color: um.color, border: `1px solid ${um.color}55`, borderRadius: 3, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>
          {um.label}
        </span>
        <span style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginLeft: 'auto' }}>
          scene {p.openedAtScene} → [{p.targetWindow[0]}–{p.targetWindow[1]}]
        </span>
      </div>
      <div style={{ color: 'var(--sm-cream)', fontSize: 11, marginBottom: 6 }}>{p.description}</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 9, marginBottom: 2 }}>PACING SCORE</div>
          <div style={{ background: 'var(--sm-night-line)', borderRadius: 3, height: 4 }}>
            <div style={{
              background: pct >= 70 ? 'var(--sm-ok)' : pct >= 40 ? 'var(--sm-warn)' : 'var(--sm-stamp)',
              height: '100%', width: `${pct}%`, borderRadius: 3,
            }} />
          </div>
        </div>
        <span style={{ color: pct >= 70 ? 'var(--sm-ok)' : pct >= 40 ? 'var(--sm-warn)' : 'var(--sm-stamp)', fontSize: 11, fontWeight: 700 }}>{pct}%</span>
        <div style={{ background: 'var(--sm-night-2)', border: '1px solid var(--sm-night-line)', borderRadius: 3, padding: '2px 7px', fontSize: 9, color: 'var(--sm-cream-mute)' }}>
          → {p.suggestedOp}
        </div>
      </div>
      {/* Mini timeline showing current vs target window */}
      <MiniTimeline openedAt={p.openedAtScene} targetWindow={p.targetWindow} currentScene={totalScenes - 1} />
    </div>
  );
}

// ── Mini timeline ─────────────────────────────────────────────────────────────

function MiniTimeline({ openedAt, targetWindow, currentScene }: {
  openedAt: number; targetWindow: [number, number]; currentScene: number;
}) {
  const max = Math.max(targetWindow[1] + 2, currentScene + 1);
  const toX = (s: number) => `${Math.min(100, (s / max) * 100)}%`;
  const overdue = currentScene > targetWindow[1];

  return (
    <div style={{ marginTop: 8, position: 'relative' }}>
      {/* Track */}
      <div style={{ background: 'var(--sm-night-line)', height: 3, borderRadius: 3, position: 'relative' }}>
        {/* Target window */}
        <div style={{
          position: 'absolute', top: 0, height: '100%',
          left: toX(targetWindow[0]),
          width: `${((targetWindow[1] - targetWindow[0]) / max) * 100}%`,
          background: overdue ? '#7f1d1d' : '#16532455', borderRadius: 2,
        }} />
        {/* Planted marker */}
        <div style={{ position: 'absolute', top: -3, left: toX(openedAt), width: 2, height: 9, background: 'var(--sm-cream-mute)', borderRadius: 1 }} />
        {/* Current scene marker */}
        <div style={{ position: 'absolute', top: -4, left: toX(currentScene), width: 2, height: 11, background: overdue ? 'var(--sm-stamp)' : 'var(--sm-ok)', borderRadius: 1 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ color: '#475569', fontSize: 9 }}>0</span>
        <span style={{ color: overdue ? 'var(--sm-stamp)' : 'var(--sm-ink-mute)', fontSize: 9 }}>
          window: {targetWindow[0]}–{targetWindow[1]}
        </span>
        <span style={{ color: '#475569', fontSize: 9 }}>scene {max}</span>
      </div>
    </div>
  );
}

// ── Timeline overview ─────────────────────────────────────────────────────────

function TimelineView({ promises, totalScenes }: { promises: OpenPromise[]; totalScenes: number }) {
  if (totalScenes === 0) return null;
  const maxScene = Math.max(totalScenes + 2, ...promises.map(p => p.targetWindow[1] + 2));

  return (
    <div style={{ background: 'var(--sm-night-2)', borderRadius: 6, padding: '12px 14px' }}>
      <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 10 }}>PROMISE TIMELINE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {promises.slice(0, 12).map(p => {
          const km = KIND_META[p.kind];
          const toX = (s: number) => `${Math.min(100, (s / maxScene) * 100)}%`;
          const overdue = totalScenes - 1 > p.targetWindow[1];
          return (
            <div key={p.promiseId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: km.color, fontSize: 11, width: 14, flexShrink: 0 }}>{km.icon}</span>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ background: 'var(--sm-night-line)', height: 4, borderRadius: 3, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', height: '100%',
                    left: toX(p.openedAtScene),
                    width: `${Math.max(2, ((p.targetWindow[1] - p.openedAtScene) / maxScene) * 100)}%`,
                    background: overdue ? '#7f1d1d88' : km.color + '44',
                    borderRadius: 3,
                  }} />
                </div>
              </div>
              <span style={{ color: '#475569', fontSize: 9, width: 50, textAlign: 'right', flexShrink: 0 }}>
                s{p.openedAtScene}→{p.targetWindow[1]}
              </span>
            </div>
          );
        })}
        {promises.length > 12 && (
          <div style={{ color: '#475569', fontSize: 10, textAlign: 'center', marginTop: 4 }}>
            +{promises.length - 12} more promises
          </div>
        )}
        {/* Current scene indicator */}
        <div style={{ color: 'var(--sm-ink-mute)', fontSize: 9, textAlign: 'center', marginTop: 4 }}>
          ▲ current: scene {totalScenes - 1}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>{label}</div>
      <div style={{ color, fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function FilterChip({ active, label, color, onClick, count }: {
  active: boolean; label: string; color: string; onClick: () => void; count?: number;
}) {
  return (
    <button onClick={onClick} style={{
      background: active ? color + '22' : 'var(--sm-night-2)',
      border: `1px solid ${active ? color : 'var(--sm-night-line)'}`,
      color: active ? color : 'var(--sm-ink-mute)',
      borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
      fontFamily: 'var(--sm-font-mono)', fontSize: 10, fontWeight: active ? 700 : 400,
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {label}
      {count !== undefined && count > 0 && (
        <span style={{ background: color + '33', borderRadius: 3, padding: '0 4px', fontSize: 9 }}>{count}</span>
      )}
    </button>
  );
}

function chipBtn(bg: string): React.CSSProperties {
  return {
    background: bg, border: '1px solid var(--sm-night-line)', borderRadius: 4,
    color: 'var(--sm-cream)', padding: '3px 8px', cursor: 'pointer',
    fontFamily: 'var(--sm-font-mono)', fontSize: 11,
  };
}
