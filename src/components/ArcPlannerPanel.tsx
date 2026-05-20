// ArcPlannerPanel — multi-scene arc compiler UI.
// The writer defines N scene targets, triggers arc compilation, and watches
// the engine converge each scene in sequence. The result is an arc-level score
// showing how many scenes converged and the mean composite quality.

import React, { useState } from 'react';

type SceneFunction =
  | 'advance_plot' | 'reveal_character' | 'build_tension'
  | 'provide_relief' | 'set_up_payoff' | 'establish_world';

interface SceneConfig {
  sceneIdx: number;
  sceneFunction: SceneFunction;
  tensionTarget: number;
  qualityTarget: number;
}

interface SceneResult {
  sceneIdx: number;
  converged: boolean;
  iterations: number;
  finalValuation: number;
  finalQuality: number;
  finalComposite: number;
  tier3Rank: number;
  ghostCount: number;
  opCount: number;
  sceneFunction: string;
}

interface ArcResult {
  scenes: SceneResult[];
  totalScenes: number;
  convergedCount: number;
  meanComposite: number;
  arcScore: number;
  usedDirectorPolicy: boolean;
}

const SCENE_FUNCTIONS: SceneFunction[] = [
  'advance_plot', 'reveal_character', 'build_tension',
  'provide_relief', 'set_up_payoff', 'establish_world',
];

const DEFAULT_ARC: SceneConfig[] = [
  { sceneIdx: 0, sceneFunction: 'establish_world',   tensionTarget: 20, qualityTarget: 55 },
  { sceneIdx: 1, sceneFunction: 'advance_plot',      tensionTarget: 35, qualityTarget: 60 },
  { sceneIdx: 2, sceneFunction: 'build_tension',     tensionTarget: 60, qualityTarget: 65 },
  { sceneIdx: 3, sceneFunction: 'reveal_character',  tensionTarget: 55, qualityTarget: 65 },
  { sceneIdx: 4, sceneFunction: 'set_up_payoff',     tensionTarget: 75, qualityTarget: 70 },
];

// Genre arc presets — tension shapes grounded in the 6 emotional arc archetypes
// (Reagan et al. 2016 / Vonnegut's story shapes).
interface GenrePreset {
  label: string;
  archetype: string;   // matching ArcArchetype from topology.ts
  description: string;
  scenes: SceneConfig[];
}

const GENRE_PRESETS: GenrePreset[] = [
  {
    label: 'Tragedy',
    archetype: 'icarus',
    description: 'Rise then catastrophic fall — Hamlet, Macbeth',
    scenes: [
      { sceneIdx: 0, sceneFunction: 'establish_world',  tensionTarget: 25, qualityTarget: 60 },
      { sceneIdx: 1, sceneFunction: 'advance_plot',     tensionTarget: 40, qualityTarget: 65 },
      { sceneIdx: 2, sceneFunction: 'reveal_character', tensionTarget: 55, qualityTarget: 65 },
      { sceneIdx: 3, sceneFunction: 'build_tension',    tensionTarget: 80, qualityTarget: 70 },
      { sceneIdx: 4, sceneFunction: 'set_up_payoff',    tensionTarget: 95, qualityTarget: 70 },
      { sceneIdx: 5, sceneFunction: 'provide_relief',   tensionTarget: 30, qualityTarget: 60 },
    ],
  },
  {
    label: 'Rags → Riches',
    archetype: 'rags_to_riches',
    description: 'Steady climb — Cinderella, Great Expectations',
    scenes: [
      { sceneIdx: 0, sceneFunction: 'establish_world',  tensionTarget: 15, qualityTarget: 55 },
      { sceneIdx: 1, sceneFunction: 'advance_plot',     tensionTarget: 30, qualityTarget: 60 },
      { sceneIdx: 2, sceneFunction: 'reveal_character', tensionTarget: 45, qualityTarget: 65 },
      { sceneIdx: 3, sceneFunction: 'set_up_payoff',    tensionTarget: 60, qualityTarget: 65 },
      { sceneIdx: 4, sceneFunction: 'build_tension',    tensionTarget: 75, qualityTarget: 70 },
    ],
  },
  {
    label: 'Man in a Hole',
    archetype: 'man_in_hole',
    description: 'Fall into trouble then recovery — most thriller plots',
    scenes: [
      { sceneIdx: 0, sceneFunction: 'establish_world',  tensionTarget: 30, qualityTarget: 60 },
      { sceneIdx: 1, sceneFunction: 'build_tension',    tensionTarget: 75, qualityTarget: 65 },
      { sceneIdx: 2, sceneFunction: 'advance_plot',     tensionTarget: 90, qualityTarget: 65 },
      { sceneIdx: 3, sceneFunction: 'reveal_character', tensionTarget: 60, qualityTarget: 70 },
      { sceneIdx: 4, sceneFunction: 'set_up_payoff',    tensionTarget: 35, qualityTarget: 65 },
    ],
  },
  {
    label: 'Cinderella',
    archetype: 'cinderella',
    description: 'Rise, fall, rise again — most romantic arcs',
    scenes: [
      { sceneIdx: 0, sceneFunction: 'establish_world',  tensionTarget: 20, qualityTarget: 55 },
      { sceneIdx: 1, sceneFunction: 'advance_plot',     tensionTarget: 55, qualityTarget: 65 },
      { sceneIdx: 2, sceneFunction: 'build_tension',    tensionTarget: 85, qualityTarget: 65 },
      { sceneIdx: 3, sceneFunction: 'provide_relief',   tensionTarget: 40, qualityTarget: 60 },
      { sceneIdx: 4, sceneFunction: 'set_up_payoff',    tensionTarget: 80, qualityTarget: 70 },
    ],
  },
  {
    label: 'Oedipus',
    archetype: 'oedipus',
    description: 'Fall, recovery, catastrophic fall — Greek tragedy, noir',
    scenes: [
      { sceneIdx: 0, sceneFunction: 'establish_world',  tensionTarget: 50, qualityTarget: 60 },
      { sceneIdx: 1, sceneFunction: 'build_tension',    tensionTarget: 80, qualityTarget: 65 },
      { sceneIdx: 2, sceneFunction: 'reveal_character', tensionTarget: 35, qualityTarget: 65 },
      { sceneIdx: 3, sceneFunction: 'advance_plot',     tensionTarget: 55, qualityTarget: 65 },
      { sceneIdx: 4, sceneFunction: 'set_up_payoff',    tensionTarget: 90, qualityTarget: 70 },
    ],
  },
  {
    label: 'Hero\'s Journey',
    archetype: 'man_in_hole',
    description: 'Call → ordeal → return transformed',
    scenes: [
      { sceneIdx: 0, sceneFunction: 'establish_world',  tensionTarget: 20, qualityTarget: 55 },
      { sceneIdx: 1, sceneFunction: 'advance_plot',     tensionTarget: 45, qualityTarget: 60 },
      { sceneIdx: 2, sceneFunction: 'build_tension',    tensionTarget: 80, qualityTarget: 65 },
      { sceneIdx: 3, sceneFunction: 'reveal_character', tensionTarget: 90, qualityTarget: 70 },
      { sceneIdx: 4, sceneFunction: 'provide_relief',   tensionTarget: 65, qualityTarget: 65 },
      { sceneIdx: 5, sceneFunction: 'set_up_payoff',    tensionTarget: 40, qualityTarget: 60 },
    ],
  },
];

interface Props { onClose: () => void; }

export function ArcPlannerPanel({ onClose }: Props) {
  const [scenes, setScenes]       = useState<SceneConfig[]>(DEFAULT_ARC);
  const [maxIter, setMaxIter]     = useState(3);
  const [running, setRunning]     = useState(false);
  const [result, setResult]       = useState<ArcResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [progress, setProgress]   = useState<string | null>(null);

  function addScene() {
    const nextIdx = scenes.length;
    setScenes(s => [...s, { sceneIdx: nextIdx, sceneFunction: 'advance_plot', tensionTarget: 50, qualityTarget: 60 }]);
  }

  function removeScene(i: number) {
    setScenes(s => s.filter((_, j) => j !== i).map((sc, j) => ({ ...sc, sceneIdx: j })));
  }

  function updateScene<K extends keyof SceneConfig>(i: number, key: K, val: SceneConfig[K]) {
    setScenes(s => s.map((sc, j) => j === i ? { ...sc, [key]: val } : sc));
  }

  async function compile() {
    setRunning(true); setError(null); setResult(null);
    setProgress(`Compiling ${scenes.length} scenes…`);
    try {
      const res = await fetch('/api/nvm/converge-arc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: scenes.map(s => ({
            sceneIdx: s.sceneIdx,
            sceneFunction: s.sceneFunction,
            activeMechanisms: [],
            tensionTarget: s.tensionTarget,
            qualityTarget: s.qualityTarget,
          })),
          budget: { maxIterations: maxIter, candidatesPerIteration: 2 },
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(e.error ?? 'Server error');
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false); setProgress(null);
    }
  }

  function arcColor(score: number) {
    if (score >= 0.7) return '#4ade80';
    if (score >= 0.4) return '#fb923c';
    return '#f87171';
  }

  return (
    <div style={{
      background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
      padding: 20, width: 740, maxWidth: '96vw', fontFamily: 'monospace',
      fontSize: 13, border: '1px solid #334155',
      maxHeight: '88vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <strong style={{ fontSize: 15 }}>Arc Compiler — multi-scene convergence</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>x</button>
      </div>

      {/* Genre presets */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: '#64748b', fontSize: 10, marginBottom: 6, letterSpacing: '0.05em' }}>GENRE ARC PRESETS</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {GENRE_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => setScenes(preset.scenes)}
              title={`${preset.description} · archetype: ${preset.archetype}`}
              style={{
                background: '#1e293b', border: '1px solid #334155', borderRadius: 4,
                color: '#94a3b8', padding: '4px 10px', cursor: 'pointer',
                fontFamily: 'monospace', fontSize: 11,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c3aed')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setScenes(DEFAULT_ARC)}
            title="Default 5-scene balanced arc"
            style={{
              background: 'transparent', border: '1px solid #1e293b', borderRadius: 4,
              color: '#475569', padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Scene list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {scenes.map((sc, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 80px 80px 32px', gap: 6, alignItems: 'center', background: '#1e293b', borderRadius: 5, padding: '6px 8px' }}>
            <span style={{ color: '#64748b', textAlign: 'center' }}>{i}</span>
            <select
              value={sc.sceneFunction}
              onChange={e => updateScene(i, 'sceneFunction', e.target.value as SceneFunction)}
              style={selStyle}
            >
              {SCENE_FUNCTIONS.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ color: '#64748b', fontSize: 11 }}>T</span>
              <input type="number" min={0} max={100} value={sc.tensionTarget}
                onChange={e => updateScene(i, 'tensionTarget', Number(e.target.value))}
                style={{ ...inputStyle, width: 46 }} />
              <span style={{ color: '#64748b', fontSize: 11 }}>Q</span>
              <input type="number" min={0} max={100} value={sc.qualityTarget}
                onChange={e => updateScene(i, 'qualityTarget', Number(e.target.value))}
                style={{ ...inputStyle, width: 46 }} />
            </div>
            <div />
            <div />
            <button onClick={() => removeScene(i)} disabled={scenes.length <= 1}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <button onClick={addScene} disabled={scenes.length >= 8}
          style={{ ...btnStyle, background: '#1e293b', color: '#94a3b8', flex: '0 0 auto' }}>
          + Add Scene
        </button>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#64748b', fontSize: 12 }}>
          <span>Max iter</span>
          <input type="number" min={1} max={6} value={maxIter} onChange={e => setMaxIter(Number(e.target.value))}
            style={{ ...inputStyle, width: 46 }} />
        </div>
        <button onClick={compile} disabled={running}
          style={{ ...btnStyle, flex: 1, background: running ? '#334155' : '#7c3aed' }}>
          {running ? (progress ?? 'Compiling…') : `Compile ${scenes.length}-Scene Arc`}
        </button>
      </div>

      {error && <div style={{ color: '#f87171', marginBottom: 12 }}>{error}</div>}

      {result && (
        <div>
          {/* Arc score banner */}
          <div style={{
            background: '#1e293b', borderRadius: 6, padding: '10px 14px',
            marginBottom: 14, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <div>
              <div style={{ color: '#64748b', fontSize: 11 }}>Arc Score</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: arcColor(result.arcScore) }}>
                {(result.arcScore * 100).toFixed(0)}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: 11 }}>Converged</div>
              <div style={{ fontSize: 18, color: result.convergedCount === result.totalScenes ? '#4ade80' : '#fb923c' }}>
                {result.convergedCount}/{result.totalScenes}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: 11 }}>Mean composite</div>
              <div style={{ fontSize: 18, color: '#60a5fa' }}>{result.meanComposite.toFixed(1)}</div>
            </div>
            {result.usedDirectorPolicy && (
              <span style={{ background: '#4c1d95', color: '#c4b5fd', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                Director Policy active
              </span>
            )}
          </div>

          {/* Per-scene results */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '4px 6px' }}>#</th>
                <th style={{ padding: '4px 6px' }}>status</th>
                <th style={{ padding: '4px 6px' }}>iter</th>
                <th style={{ padding: '4px 6px' }}>tension</th>
                <th style={{ padding: '4px 6px' }}>quality</th>
                <th style={{ padding: '4px 6px' }}>composite</th>
                <th style={{ padding: '4px 6px' }}>T3</th>
                <th style={{ padding: '4px 6px' }}>ghosts</th>
                <th style={{ padding: '4px 6px' }}>fn</th>
              </tr>
            </thead>
            <tbody>
              {result.scenes.map(s => (
                <tr key={s.sceneIdx} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '5px 6px', color: '#94a3b8' }}>{s.sceneIdx}</td>
                  <td style={{ padding: '5px 6px' }}>
                    <span style={{ color: s.converged ? '#4ade80' : '#fb923c', fontWeight: 700 }}>
                      {s.converged ? '✓' : '~'}
                    </span>
                  </td>
                  <td style={{ padding: '5px 6px', color: '#64748b' }}>{s.iterations}</td>
                  <td style={{ padding: '5px 6px', color: '#a78bfa' }}>{s.finalValuation.toFixed(1)}</td>
                  <td style={{ padding: '5px 6px', color: s.finalQuality >= 65 ? '#4ade80' : s.finalQuality >= 50 ? '#fb923c' : '#f87171' }}>
                    {s.finalQuality.toFixed(0)}
                  </td>
                  <td style={{ padding: '5px 6px', color: '#60a5fa' }}>{s.finalComposite.toFixed(1)}</td>
                  <td style={{ padding: '5px 6px', color: s.tier3Rank === 100 ? '#4ade80' : '#64748b' }}>{s.tier3Rank}</td>
                  <td style={{ padding: '5px 6px', color: s.ghostCount > 0 ? '#f87171' : '#64748b' }}>{s.ghostCount}</td>
                  <td style={{ padding: '5px 6px', color: '#64748b', fontSize: 11 }}>{s.sceneFunction.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#0f172a', border: '1px solid #334155', borderRadius: 4,
  color: '#e2e8f0', padding: '4px 6px', fontFamily: 'monospace',
  fontSize: 12, boxSizing: 'border-box',
};

const selStyle: React.CSSProperties = {
  ...inputStyle, width: '100%', cursor: 'pointer',
};

const btnStyle: React.CSSProperties = {
  padding: '7px 12px', border: 'none', borderRadius: 5,
  color: '#fff', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12,
};
