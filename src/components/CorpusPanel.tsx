// CorpusPanel — visualizes the self-play corpus and learned Director Policy.
// Shows top corpus runs, global operator ranking, and arc-specific playbook.

import React, { useState, useEffect } from 'react';

interface RankedCombo {
  arcArchetype: string;
  meanScore: number;
  sampleSize: number;
  topOperators: string[];
}

interface OperatorEffectiveness {
  operator: string;
  score: number;
}

interface Playbook {
  policy: {
    rankedCombos: RankedCombo[];
    globalTopOperators: string[];
    operatorEffectiveness: OperatorEffectiveness[];
  };
  hallOfFame: Array<{ scenarioId: string; score: number; proofPassRate: number; meanValuation: number }>;
  summary: string;
}

interface CorpusRun {
  run_id: string;
  scenario_id: string;
  score: number;
  proof_pass_rate: number;
  mean_valuation: number;
  ops_count: number;
}

interface CorpusPanelProps {
  onClose: () => void;
}

export function CorpusPanel({ onClose }: CorpusPanelProps) {
  const [data, setData] = useState<{ playbook: Playbook | null; runs: CorpusRun[]; runCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/nvm/corpus')
      .then(r => r.ok ? r.json() : Promise.reject('Server error'))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function pct(v: number) { return `${(v * 100).toFixed(0)}%`; }
  function score(v: number) { return v.toFixed(2); }

  return (
    <div style={{
      background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
      padding: 20, width: 640, maxWidth: '95vw', fontFamily: 'monospace',
      fontSize: 13, border: '1px solid #334155',
      maxHeight: '80vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <strong style={{ fontSize: 15 }}>Director Policy (G13 Corpus)</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>x</button>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>Loading corpus…</div>}
      {error && <div style={{ color: '#f87171' }}>{error}</div>}

      {data && !data.playbook && (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
          No corpus runs yet.<br />
          <span style={{ fontSize: 11 }}>POST /api/nvm/selfplay to generate.</span>
        </div>
      )}

      {data?.playbook && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary */}
          <div style={{ background: '#1e293b', borderRadius: 6, padding: 10, color: '#94a3b8', fontSize: 12 }}>
            {data.playbook.summary} — {data.runCount} run{data.runCount !== 1 ? 's' : ''}
          </div>

          {/* Global operator ranking */}
          {data.playbook.policy.globalTopOperators.length > 0 && (
            <section>
              <div style={{ color: '#64748b', marginBottom: 6 }}>Global top operators</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {data.playbook.policy.globalTopOperators.slice(0, 6).map((op, i) => (
                  <span key={op} style={{
                    background: i === 0 ? '#1d4ed8' : '#1e293b',
                    padding: '2px 8px', borderRadius: 4, fontSize: 11,
                    color: i === 0 ? '#fff' : '#94a3b8',
                  }}>{op}</span>
                ))}
              </div>
            </section>
          )}

          {/* Operator effectiveness */}
          {data.playbook.policy.operatorEffectiveness.length > 0 && (
            <section>
              <div style={{ color: '#64748b', marginBottom: 6 }}>Operator effectiveness</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.playbook.policy.operatorEffectiveness.slice(0, 6).map(oe => (
                  <div key={oe.operator} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 180, color: '#e2e8f0' }}>{oe.operator}</span>
                    <div style={{ flex: 1, background: '#1e293b', borderRadius: 4, height: 6 }}>
                      <div style={{ background: '#4ade80', width: `${Math.min(100, oe.score * 100)}%`, height: '100%', borderRadius: 4 }} />
                    </div>
                    <span style={{ color: '#64748b', width: 40, textAlign: 'right' }}>{score(oe.score)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Arc-specific combos */}
          {data.playbook.policy.rankedCombos.length > 0 && (
            <section>
              <div style={{ color: '#64748b', marginBottom: 6 }}>Arc playbook</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '3px 8px' }}>arc</th>
                    <th style={{ padding: '3px 8px' }}>mean score</th>
                    <th style={{ padding: '3px 8px' }}>samples</th>
                    <th style={{ padding: '3px 8px' }}>top op</th>
                  </tr>
                </thead>
                <tbody>
                  {data.playbook.policy.rankedCombos.slice(0, 6).map(c => (
                    <tr key={c.arcArchetype} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '3px 8px', color: '#a78bfa' }}>{c.arcArchetype}</td>
                      <td style={{ padding: '3px 8px', color: '#4ade80' }}>{score(c.meanScore)}</td>
                      <td style={{ padding: '3px 8px', color: '#64748b' }}>{c.sampleSize}</td>
                      <td style={{ padding: '3px 8px', color: '#60a5fa' }}>{c.topOperators[0] ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Top runs */}
          {data.runs.length > 0 && (
            <section>
              <div style={{ color: '#64748b', marginBottom: 6 }}>Top corpus runs</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '3px 8px' }}>scenario</th>
                    <th style={{ padding: '3px 8px' }}>score</th>
                    <th style={{ padding: '3px 8px' }}>pass%</th>
                    <th style={{ padding: '3px 8px' }}>tension</th>
                    <th style={{ padding: '3px 8px' }}>ops</th>
                  </tr>
                </thead>
                <tbody>
                  {data.runs.slice(0, 8).map(r => (
                    <tr key={r.run_id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '3px 8px', color: '#e2e8f0', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.scenario_id}</td>
                      <td style={{ padding: '3px 8px', color: '#4ade80' }}>{score(r.score)}</td>
                      <td style={{ padding: '3px 8px', color: '#60a5fa' }}>{pct(r.proof_pass_rate)}</td>
                      <td style={{ padding: '3px 8px', color: '#fb923c' }}>{r.mean_valuation.toFixed(1)}</td>
                      <td style={{ padding: '3px 8px', color: '#64748b' }}>{r.ops_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
