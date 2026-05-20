// ConvergePanel — AlphaZero-for-drama search UI.
// Shows the G1 convergence loop in action: iteration history with proof/tension/
// quality scores, writers'-room operator+dominant-critic, ghost count, and
// a convergence status badge.

import React, { useState } from 'react';

interface ConvergeStep {
  iteration: number;
  candidateId: string;
  passed: boolean;
  valuationScore: number;
  qualityScore: number;
  compositeScore: number;
  ghostReason?: string;
  writersRoomSummary?: string;
}

interface ConvergeResult {
  converged: boolean;
  iterations: number;
  finalValuation: number;
  finalQuality: number;
  finalComposite: number;
  ghostCount: number;
  history: ConvergeStep[];
}

interface ConvPanelProps {
  onClose: () => void;
}

const SCENE_FUNCTIONS = [
  'advance_plot', 'reveal_character', 'build_tension',
  'provide_relief', 'set_up_payoff', 'establish_world',
] as const;

export function ConvergePanel({ onClose }: ConvPanelProps) {
  const [sceneIdx, setSceneIdx]       = useState(0);
  const [sceneFunc, setSceneFunc]     = useState<string>('build_tension');
  const [tensionTarget, setTension]   = useState(60);
  const [qualityTarget, setQuality]   = useState(60);
  const [maxIter, setMaxIter]         = useState(4);
  const [running, setRunning]         = useState(false);
  const [result, setResult]           = useState<ConvergeResult | null>(null);
  const [error, setError]             = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/nvm/converge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: {
            sceneIdx,
            sceneFunction: sceneFunc,
            activeMechanisms: [],
            tensionTarget,
            qualityTarget,
          },
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
      setRunning(false);
    }
  }

  const row = (step: ConvergeStep, i: number) => {
    const statusColor = step.passed
      ? (step.ghostReason ? '#fb923c' : '#4ade80')
      : '#f87171';
    return (
      <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
        <td style={{ padding: '4px 8px', color: '#94a3b8' }}>{step.iteration}</td>
        <td style={{ padding: '4px 8px' }}>
          <span style={{ color: statusColor, fontWeight: 600 }}>
            {step.passed ? (step.ghostReason ? 'GHOST' : 'PASS') : 'FAIL'}
          </span>
        </td>
        <td style={{ padding: '4px 8px', color: '#60a5fa' }}>{step.valuationScore.toFixed(1)}</td>
        <td style={{ padding: '4px 8px', color: '#a78bfa' }}>{step.qualityScore.toFixed(1)}</td>
        <td style={{ padding: '4px 8px', color: '#f9a8d4' }}>{step.compositeScore.toFixed(1)}</td>
        <td style={{ padding: '4px 8px', color: '#64748b', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {step.writersRoomSummary ?? '—'}
        </td>
      </tr>
    );
  };

  return (
    <div style={{
      background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
      padding: 20, width: 700, maxWidth: '95vw', fontFamily: 'monospace',
      fontSize: 13, border: '1px solid #334155',
      maxHeight: '80vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <strong style={{ fontSize: 15 }}>Convergence Search (G1)</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>x</button>
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <label>
          <div style={{ color: '#94a3b8', marginBottom: 3 }}>Scene index</div>
          <input type="number" min={0} value={sceneIdx} onChange={e => setSceneIdx(Number(e.target.value))}
            style={inputStyle} />
        </label>
        <label>
          <div style={{ color: '#94a3b8', marginBottom: 3 }}>Scene function</div>
          <select value={sceneFunc} onChange={e => setSceneFunc(e.target.value)} style={inputStyle}>
            {SCENE_FUNCTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label>
          <div style={{ color: '#94a3b8', marginBottom: 3 }}>Max iterations</div>
          <input type="number" min={1} max={8} value={maxIter} onChange={e => setMaxIter(Number(e.target.value))}
            style={inputStyle} />
        </label>
        <label>
          <div style={{ color: '#94a3b8', marginBottom: 3 }}>Tension target (0–100)</div>
          <input type="number" min={0} max={100} value={tensionTarget} onChange={e => setTension(Number(e.target.value))}
            style={inputStyle} />
        </label>
        <label>
          <div style={{ color: '#94a3b8', marginBottom: 3 }}>Quality target (0–100)</div>
          <input type="number" min={0} max={100} value={qualityTarget} onChange={e => setQuality(Number(e.target.value))}
            style={inputStyle} />
        </label>
      </div>

      <button onClick={run} disabled={running} style={{
        width: '100%', padding: '8px 0', marginBottom: 16,
        background: running ? '#334155' : '#1d4ed8',
        color: '#fff', border: 'none', borderRadius: 6,
        cursor: running ? 'default' : 'pointer', fontFamily: 'monospace',
      }}>
        {running ? 'Searching…' : 'Run Convergence Search'}
      </button>

      {error && <div style={{ color: '#f87171', marginBottom: 12 }}>{error}</div>}

      {result && (
        <div>
          {/* Status banner */}
          <div style={{
            background: result.converged ? '#14532d' : '#7c2d12',
            borderRadius: 6, padding: '8px 14px', marginBottom: 14,
            display: 'flex', gap: 20, flexWrap: 'wrap',
          }}>
            <span style={{ fontWeight: 700, color: result.converged ? '#4ade80' : '#fb923c' }}>
              {result.converged ? 'CONVERGED' : 'BUDGET EXHAUSTED'}
            </span>
            <span>{result.iterations} iteration{result.iterations !== 1 ? 's' : ''}</span>
            <span>tension {result.finalValuation.toFixed(1)}</span>
            <span>quality {result.finalQuality.toFixed(1)}</span>
            <span>composite {result.finalComposite.toFixed(1)}</span>
            <span style={{ color: '#f87171' }}>{result.ghostCount} ghost{result.ghostCount !== 1 ? 's' : ''}</span>
          </div>

          {/* History table */}
          {result.history.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '4px 8px' }}>iter</th>
                    <th style={{ padding: '4px 8px' }}>status</th>
                    <th style={{ padding: '4px 8px' }}>tension</th>
                    <th style={{ padding: '4px 8px' }}>quality</th>
                    <th style={{ padding: '4px 8px' }}>composite</th>
                    <th style={{ padding: '4px 8px' }}>writers' room</th>
                  </tr>
                </thead>
                <tbody>{result.history.map((s, i) => row(s, i))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#1e293b', border: '1px solid #334155', borderRadius: 4,
  color: '#e2e8f0', padding: '5px 8px', fontFamily: 'monospace',
  fontSize: 13, width: '100%', boxSizing: 'border-box',
};
