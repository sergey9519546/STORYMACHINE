// ArcTimelinePanel — story compiler output view.
// Shows every committed scene in a timeline with proof status, quality score,
// tension, and op breakdown. The writer sees the whole arc at a glance.

import React, { useState, useEffect } from 'react';

interface SceneRow {
  sceneIdx: number;
  commitId: string;
  sceneFunction: string;
  t1Pass: boolean;
  t1FailCount: number;
  t2Score: number;
  t2FailCount: number;
  qualityScore: number;
  tension: number;
  opCount: number;
  topOps: string[];
  mechanisms: string[];
}

interface ArcTimelinePanelProps {
  onClose: () => void;
}

function qualityColor(score: number): string {
  if (score >= 70) return 'var(--sm-ok)';
  if (score >= 50) return 'var(--sm-warn)';
  return 'var(--sm-stamp)';
}

function tensionBar(tension: number, max = 100) {
  const pct = Math.min(100, Math.round((tension / max) * 100));
  const color = pct >= 60 ? 'var(--sm-cool)' : pct >= 30 ? 'var(--sm-cool)' : 'var(--sm-night-line)';
  return (
    <div style={{ background: 'var(--sm-night-2)', borderRadius: 3, height: 6, width: 80 }}>
      <div style={{ background: color, width: `${pct}%`, height: '100%', borderRadius: 3 }} />
    </div>
  );
}

export function ArcTimelinePanel({ onClose }: ArcTimelinePanelProps) {
  const [scenes, setScenes] = useState<SceneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/nvm/arc-timeline')
      .then(r => r.ok ? r.json() : Promise.reject('Server error'))
      .then(data => setScenes(data.scenes ?? []))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Sparkline for tension trajectory
  const maxTension = Math.max(...scenes.map(s => s.tension), 1);
  const sparkH = 40;
  const sparkW = Math.max(200, scenes.length * 24);
  const sparkPoints = scenes.map((s, i) => {
    const x = scenes.length > 1 ? (i / (scenes.length - 1)) * sparkW : sparkW / 2;
    const y = sparkH - (s.tension / maxTension) * sparkH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div style={{
      background: 'var(--sm-night)', color: 'var(--sm-cream)', borderRadius: 8,
      padding: 20, width: 720, maxWidth: '96vw', fontFamily: 'var(--sm-font-mono)',
      fontSize: 13, border: '1px solid var(--sm-night-line)',
      maxHeight: '82vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <strong style={{ fontSize: 15 }}>Arc Timeline ({scenes.length} scene{scenes.length !== 1 ? 's' : ''})</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sm-cream-mute)', cursor: 'pointer', fontSize: 16 }}>x</button>
      </div>

      {loading && <div style={{ color: 'var(--sm-cream-mute)' }}>Loading timeline…</div>}
      {error && <div style={{ color: 'var(--sm-stamp)' }}>{error}</div>}

      {!loading && scenes.length === 0 && (
        <div style={{ color: 'var(--sm-cream-mute)', textAlign: 'center', padding: 24 }}>
          No committed scenes yet. Run the simulation to build the arc.
        </div>
      )}

      {scenes.length > 0 && (
        <>
          {/* Tension sparkline */}
          <div style={{ marginBottom: 16, background: 'var(--sm-night-2)', borderRadius: 6, padding: '10px 12px' }}>
            <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11, marginBottom: 6 }}>Tension trajectory</div>
            <svg width={sparkW} height={sparkH} style={{ display: 'block', overflow: 'visible' }}>
              <polyline
                points={sparkPoints}
                fill="none"
                stroke="var(--sm-cool)"
                strokeWidth={2}
                strokeLinejoin="round"
              />
              {scenes.map((s, i) => {
                const x = scenes.length > 1 ? (i / (scenes.length - 1)) * sparkW : sparkW / 2;
                const y = sparkH - (s.tension / maxTension) * sparkH;
                return <circle key={i} cx={x} cy={y} r={3} fill={s.t1Pass ? 'var(--sm-ok)' : 'var(--sm-stamp)'} />;
              })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--sm-night-line)', fontSize: 10, marginTop: 2 }}>
              <span>scene 0</span>
              {scenes.length > 1 && <span>scene {scenes[scenes.length - 1].sceneIdx}</span>}
            </div>
          </div>

          {/* Scene table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--sm-ink-mute)', textAlign: 'left', borderBottom: '1px solid var(--sm-night-line)' }}>
                  <th style={{ padding: '4px 6px' }}>#</th>
                  <th style={{ padding: '4px 6px' }}>T1</th>
                  <th style={{ padding: '4px 6px' }}>T2</th>
                  <th style={{ padding: '4px 6px' }}>quality</th>
                  <th style={{ padding: '4px 6px' }}>tension</th>
                  <th style={{ padding: '4px 6px' }}>fn</th>
                  <th style={{ padding: '4px 6px' }}>top ops</th>
                  <th style={{ padding: '4px 6px' }}>ops</th>
                </tr>
              </thead>
              <tbody>
                {scenes.map(s => (
                  <tr key={s.commitId} style={{ borderBottom: '1px solid var(--sm-night)' }}>
                    <td style={{ padding: '5px 6px', color: 'var(--sm-cream-mute)' }}>{s.sceneIdx}</td>
                    <td style={{ padding: '5px 6px' }}>
                      <span style={{ color: s.t1Pass ? 'var(--sm-ok)' : 'var(--sm-stamp)', fontWeight: 700 }}>
                        {s.t1Pass ? '✓' : `✗${s.t1FailCount}`}
                      </span>
                    </td>
                    <td style={{ padding: '5px 6px', color: s.t2Score >= 67 ? 'var(--sm-ok)' : s.t2Score >= 33 ? 'var(--sm-warn)' : 'var(--sm-stamp)' }}>
                      {s.t2Score}
                    </td>
                    <td style={{ padding: '5px 6px', color: qualityColor(s.qualityScore) }}>
                      {s.qualityScore.toFixed(0)}
                    </td>
                    <td style={{ padding: '5px 6px' }}>
                      {tensionBar(s.tension, maxTension)}
                      <span style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginLeft: 4 }}>{s.tension.toFixed(0)}</span>
                    </td>
                    <td style={{ padding: '5px 6px', color: 'var(--sm-cool)', fontSize: 11 }}>
                      {s.sceneFunction.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '5px 6px', color: 'var(--sm-ink-mute)', fontSize: 11 }}>
                      {s.topOps.join(', ')}
                    </td>
                    <td style={{ padding: '5px 6px', color: 'var(--sm-ink-mute)' }}>{s.opCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', color: 'var(--sm-ink-mute)', fontSize: 12 }}>
            <span>T1 pass rate: <span style={{ color: 'var(--sm-ok)' }}>{scenes.length > 0 ? Math.round(scenes.filter(s => s.t1Pass).length / scenes.length * 100) : 0}%</span></span>
            <span>Mean quality: <span style={{ color: qualityColor(scenes.reduce((a, s) => a + s.qualityScore, 0) / Math.max(scenes.length, 1)) }}>{(scenes.reduce((a, s) => a + s.qualityScore, 0) / Math.max(scenes.length, 1)).toFixed(0)}</span></span>
            <span>Peak tension: <span style={{ color: 'var(--sm-cool)' }}>{Math.max(...scenes.map(s => s.tension)).toFixed(0)}</span></span>
            <span>Total ops: <span style={{ color: 'var(--sm-cream)' }}>{scenes.reduce((a, s) => a + s.opCount, 0)}</span></span>
          </div>
        </>
      )}
    </div>
  );
}
