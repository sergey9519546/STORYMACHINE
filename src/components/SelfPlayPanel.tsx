// SelfPlayPanel — G13 Self-Play Corpus + Genome Browser.
// Three tabs:
//   Launcher — define scenarios, fire headless sims, see results
//   Corpus   — ranked runs, Director Policy, operator effectiveness
//   Genome   — diff and breed story genomes from corpus runs

import React, { useState, useCallback, useEffect } from 'react';

// ── Shared types ──────────────────────────────────────────────────────────────

interface CorpusRun {
  run_id: string;
  scenario_id: string;
  score: number;
  proof_pass_rate: number;
  mean_valuation: number;
  ops_count: number;
  genome_json: string;
}

interface RankedCombo {
  arcArchetype: string;
  meanScore: number;
  sampleSize: number;
  topOperators: string[];
}

interface DirectorPolicy {
  rankedCombos: RankedCombo[];
  globalTopOperators: string[];
  operatorEffectiveness: Array<{ operator: string; score: number }>;
}

interface Playbook {
  policy: DirectorPolicy;
  summary: string;
}

interface CorpusData {
  runs: CorpusRun[];
  runCount: number;
  playbook: Playbook | null;
  message?: string;
}

interface StoryGenome {
  genomeId: string;
  sceneCount: number;
  arcArchetype: string;
  themeClaims: string[];
  dominantWound: string | null;
  revealComplexity: number;
  tensionProfile: [number, number, number, number, number];
  voiceVector: Record<string, number>;
  dominantOperators: string[];
  revertRate: number;
  ironyDensity: number;
}

interface GenomeDiff {
  similarity: number;
  tensionSim: number;
  voiceSim: number;
  thematicSim: number;
  arcMatch: number;
  differences: string[];
}

type Tab = 'launcher' | 'corpus' | 'genome';

interface Props { onClose: () => void; }

// ── Top-level panel ───────────────────────────────────────────────────────────

export function SelfPlayPanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('launcher');

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'launcher', label: 'Launcher', icon: '▶' },
    { id: 'corpus',   label: 'Corpus',   icon: '📋' },
    { id: 'genome',   label: 'Genome',   icon: '🧬' },
  ];

  return (
    <div style={{
      background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
      border: '1px solid #334155', width: 860, maxWidth: '98vw',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace', fontSize: 13,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: 15 }}>Self-Play Corpus — G13 Story Engine</strong>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Headless sims · learned Director policy · genome diff/breed</div>
        </div>
        <button onClick={onClose} style={iconBtn}>✕</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155', background: '#0c1525', flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: t.id === tab ? '#1e293b' : 'transparent',
            border: 'none',
            borderBottom: t.id === tab ? '2px solid #7c3aed' : '2px solid transparent',
            color: t.id === tab ? '#e2e8f0' : '#64748b',
            padding: '9px 18px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'launcher' && <LauncherTab />}
        {tab === 'corpus'   && <CorpusTab />}
        {tab === 'genome'   && <GenomeTab />}
      </div>
    </div>
  );
}

// ── Launcher tab ──────────────────────────────────────────────────────────────

interface ScenarioConfig {
  scenarioId: string;
  seed: number;
  sceneCount: number;
}

function makeDefaultScenario(i: number): ScenarioConfig {
  return { scenarioId: `scenario-${i + 1}`, seed: Math.floor(Math.random() * 9999), sceneCount: 3 };
}

function LauncherTab() {
  const [scenarios, setScenarios]           = useState<ScenarioConfig[]>([makeDefaultScenario(0)]);
  const [running, setRunning]               = useState(false);
  const [result, setResult]                 = useState<{ runs: number; meanScore: number; bestScenario: string; operatorFrequency: Record<string, number> } | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [maxSimulations, setMaxSimulations] = useState<number>(5);
  // H6: Per-simulation convergence budget controls
  const [maxIterations, setMaxIterations]   = useState<number>(4);
  const [maxLLMCalls, setMaxLLMCalls]       = useState<number | ''>('');

  function addScenario() {
    setScenarios(s => [...s, makeDefaultScenario(s.length)]);
  }

  function updateScenario(i: number, patch: Partial<ScenarioConfig>) {
    setScenarios(s => s.map((sc, j) => j === i ? { ...sc, ...patch } : sc));
  }

  function removeScenario(i: number) {
    setScenarios(s => s.filter((_, j) => j !== i));
  }

  async function launch() {
    setRunning(true); setError(null); setResult(null);
    try {
      const SCENE_FNS = ['advance_plot', 'build_tension', 'reveal_character', 'establish_world', 'set_up_payoff'];
      const budget: Record<string, number> = { maxIterations };
      if (typeof maxLLMCalls === 'number' && maxLLMCalls > 0) budget.maxLLMCalls = maxLLMCalls;
      const body = {
        maxSimulations,
        budget,
        scenarios: scenarios.map(sc => ({
          scenarioId: sc.scenarioId,
          seed: sc.seed,
          sceneTargets: Array.from({ length: sc.sceneCount }, (_, i) => ({
            sceneIdx: i,
            sceneFunction: SCENE_FNS[i % SCENE_FNS.length],
            activeMechanisms: [],
            tensionTarget: 40 + i * 10,
            qualityTarget: 55,
          })),
        })),
      };
      const res = await fetch('/api/nvm/selfplay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ color: '#64748b', fontSize: 11 }}>
        Each scenario runs the convergence loop headlessly across its scenes. Results are persisted to the corpus and feed the Director Policy.
      </div>

      {/* Scenario list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {scenarios.map((sc, i) => (
          <div key={sc.scenarioId || i} style={{ background: '#1e293b', borderRadius: 5, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 80px 60px 28px', gap: 8, alignItems: 'center' }}>
            <div>
              <div style={labelSt}>Scenario ID</div>
              <input value={sc.scenarioId} onChange={e => updateScenario(i, { scenarioId: e.target.value })}
                style={{ ...inputSt, width: '100%' }} />
            </div>
            <div>
              <div style={labelSt}>Seed</div>
              <input type="number" value={sc.seed} onChange={e => updateScenario(i, { seed: Number(e.target.value) })}
                style={{ ...inputSt, width: '100%' }} />
            </div>
            <div>
              <div style={labelSt}>Scenes</div>
              <input type="number" min={1} max={6} value={sc.sceneCount} onChange={e => updateScenario(i, { sceneCount: Number(e.target.value) })}
                style={{ ...inputSt, width: '100%' }} />
            </div>
            <button onClick={() => removeScenario(i)} disabled={scenarios.length <= 1}
              style={{ ...iconBtn, fontSize: 13, opacity: scenarios.length > 1 ? 1 : 0.3 }}>✕</button>
          </div>
        ))}
      </div>

      {/* Launch controls row 1: scenario count + convergence budget */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <button onClick={addScenario} disabled={scenarios.length >= 5} style={btnSt('#1e293b')}>
          + Add Scenario
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={labelSt}>Max Sims</div>
          <input type="number" min={1} max={50} value={maxSimulations}
            onChange={e => setMaxSimulations(Math.max(1, Math.min(50, Number(e.target.value))))}
            style={{ ...inputSt, width: 60 }} title="Cap total simulations to control LLM cost" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={labelSt}>Converge Iters</div>
          <input type="number" min={1} max={10} value={maxIterations}
            onChange={e => setMaxIterations(Math.max(1, Math.min(10, Number(e.target.value))))}
            style={{ ...inputSt, width: 60 }} title="Max convergence iterations per scene (higher = better quality, more LLM cost)" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={labelSt}>LLM Call Cap</div>
          <input type="number" min={1} max={100} value={maxLLMCalls}
            placeholder="auto"
            onChange={e => {
              const v = e.target.value === '' ? '' : Math.max(1, Math.min(100, Number(e.target.value)));
              setMaxLLMCalls(v as number | '');
            }}
            style={{ ...inputSt, width: 70 }} title="Hard cap on total LLM calls per simulation (leave blank for automatic: iters × 2)" />
        </div>
        <button onClick={launch} disabled={running} style={{ ...btnSt('#7c3aed'), flex: 1, fontWeight: 700, minWidth: 140 }}>
          {running ? 'Running headless sims…' : `Launch ${scenarios.length} scenario${scenarios.length !== 1 ? 's' : ''}`}
        </button>
      </div>

      {error && <div style={{ color: '#f87171', background: '#1e293b', borderRadius: 5, padding: 10 }}>{error}</div>}

      {running && (
        <div style={{ color: '#64748b', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
          Running convergence loops — this may take a few seconds…
        </div>
      )}

      {result && (
        <div style={{ background: '#1e293b', borderRadius: 6, padding: '12px 16px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <Stat label="Runs completed" value={String(result.runs)} color="#4ade80" />
          <Stat label="Mean score" value={(result.meanScore * 100).toFixed(1)} color="#a78bfa" />
          <Stat label="Best scenario" value={result.bestScenario} color="#60a5fa" small />
          <div>
            <div style={labelSt}>Top operators</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(result.operatorFrequency).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([op, n]) => (
                <span key={op} style={{ background: '#312e81', color: '#a5b4fc', padding: '1px 6px', borderRadius: 3, fontSize: 10 }}>
                  {op.replace(/_/g, '-')} ×{n}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Corpus tab ────────────────────────────────────────────────────────────────

function CorpusTab() {
  const [data, setData]       = useState<CorpusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/nvm/corpus');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ color: '#64748b', textAlign: 'center', padding: 50 }}>Loading corpus…</div>;
  if (error) return <div style={{ color: '#f87171', padding: 18 }}>{error}</div>;
  if (!data) return null;

  if (data.runs.length === 0) {
    return (
      <div style={{ padding: 18, color: '#475569', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 13 }}>No corpus runs yet.</div>
        <div style={{ fontSize: 11, marginTop: 6 }}>Use the Launcher tab to run headless sims.</div>
      </div>
    );
  }

  const maxScore = Math.max(...data.runs.map(r => r.score));

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', background: '#1e293b', borderRadius: 6, padding: '10px 14px' }}>
        <Stat label="Corpus runs" value={String(data.runCount)} color="#a78bfa" />
        <Stat label="Best score" value={(maxScore * 100).toFixed(1)} color="#4ade80" />
        {data.playbook && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={labelSt}>Director summary</div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>{data.playbook.summary.slice(0, 120)}</div>
          </div>
        )}
      </div>

      {/* Director Policy */}
      {data.playbook?.policy && (
        <div>
          <div style={{ color: '#7c3aed', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Director Policy</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#1e293b', borderRadius: 5, padding: '10px 12px' }}>
              <div style={labelSt}>Global top operators</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {data.playbook.policy.globalTopOperators.slice(0, 6).map(op => (
                  <span key={op} style={{ background: '#4c1d95', color: '#c4b5fd', padding: '2px 8px', borderRadius: 3, fontSize: 11 }}>
                    {op.replace(/_/g, '-')}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ background: '#1e293b', borderRadius: 5, padding: '10px 12px' }}>
              <div style={labelSt}>Operator effectiveness</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                {data.playbook.policy.operatorEffectiveness.slice(0, 5).map(({ operator, score }) => (
                  <div key={operator} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#64748b', fontSize: 10, width: 130, flexShrink: 0 }}>{operator.replace(/_/g, '-')}</span>
                    <div style={{ flex: 1, background: '#334155', borderRadius: 2, height: 6 }}>
                      <div style={{ width: `${score * 100}%`, background: '#a78bfa', height: '100%', borderRadius: 2 }} />
                    </div>
                    <span style={{ color: '#a78bfa', fontSize: 10 }}>{(score * 100).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Run list */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700 }}>Run history</div>
          <button onClick={load} style={{ ...btnSt('#1e293b'), fontSize: 10, padding: '3px 8px' }}>↺ Refresh</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '4px 8px' }}>Scenario</th>
              <th style={{ padding: '4px 8px' }}>Score</th>
              <th style={{ padding: '4px 8px' }}>Proof%</th>
              <th style={{ padding: '4px 8px' }}>Valuation</th>
              <th style={{ padding: '4px 8px' }}>Ops</th>
            </tr>
          </thead>
          <tbody>
            {data.runs.map(run => (
              <tr key={run.run_id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '5px 8px', color: '#94a3b8' }}>{run.scenario_id}</td>
                <td style={{ padding: '5px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 60, background: '#334155', borderRadius: 2, height: 6 }}>
                      <div style={{ width: `${run.score * 100}%`, background: scoreColor(run.score), height: '100%', borderRadius: 2 }} />
                    </div>
                    <span style={{ color: scoreColor(run.score) }}>{(run.score * 100).toFixed(0)}</span>
                  </div>
                </td>
                <td style={{ padding: '5px 8px', color: '#60a5fa' }}>{(run.proof_pass_rate * 100).toFixed(0)}%</td>
                <td style={{ padding: '5px 8px', color: '#34d399' }}>{run.mean_valuation.toFixed(1)}</td>
                <td style={{ padding: '5px 8px', color: '#64748b' }}>{run.ops_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Genome tab ────────────────────────────────────────────────────────────────

function GenomeTab() {
  const [runs, setRuns]           = useState<CorpusRun[]>([]);
  const [runIdA, setRunIdA]       = useState('');
  const [runIdB, setRunIdB]       = useState('');
  const [diffResult, setDiff]     = useState<{ diff: GenomeDiff; genomeA: StoryGenome; genomeB: StoryGenome } | null>(null);
  const [bred, setBred]           = useState<StoryGenome | null>(null);
  const [loading, setLoading]     = useState(false);
  const [acting, setActing]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/nvm/corpus').then(r => r.json()).then((d: CorpusData) => {
      setRuns(d.runs ?? []);
      if (d.runs?.length >= 2) {
        setRunIdA(d.runs[0].run_id);
        setRunIdB(d.runs[1].run_id);
      }
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Failed to load corpus');
    }).finally(() => setLoading(false));
  }, []);

  async function runDiff() {
    setActing(true); setError(null); setDiff(null); setBred(null);
    try {
      const res = await fetch('/api/nvm/genome/diff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runIdA, runIdB }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setDiff(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActing(false);
    }
  }

  async function runBreed() {
    setActing(true); setError(null); setBred(null);
    try {
      const res = await fetch('/api/nvm/genome/breed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runIdA, runIdB, newId: `bred-${Date.now()}` }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setBred(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActing(false);
    }
  }

  if (runs.length === 0) {
    return (
      <div style={{ padding: 18, color: '#475569', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🧬</div>
        <div style={{ fontSize: 12 }}>No corpus runs available. Launch headless sims first.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ color: '#64748b', fontSize: 11 }}>
        Select two corpus runs to compare their story genomes (tension profile, voice vectors, arc archetype) and optionally breed a hybrid seed.
      </div>

      {/* Run selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <RunSelector label="Genome A" value={runIdA} runs={runs} onChange={setRunIdA} />
        <RunSelector label="Genome B" value={runIdB} runs={runs} onChange={setRunIdB} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={runDiff} disabled={acting || !runIdA || !runIdB || runIdA === runIdB}
          style={{ ...btnSt('#7c3aed'), flex: 1, fontWeight: 700 }}>
          {acting ? 'Computing…' : 'Diff genomes'}
        </button>
        <button onClick={runBreed} disabled={acting || !runIdA || !runIdB || runIdA === runIdB}
          style={{ ...btnSt('#065f46'), flex: 1 }}>
          🧬 Breed hybrid
        </button>
      </div>

      {error && <div style={{ color: '#f87171', background: '#1e293b', borderRadius: 5, padding: 10 }}>{error}</div>}

      {/* Diff result */}
      {diffResult && <GenomeDiffView result={diffResult} />}

      {/* Bred genome */}
      {bred && <BreedResultView genome={bred} />}
    </div>
  );
}

function RunSelector({ label, value, runs, onChange }: { label: string; value: string; runs: CorpusRun[]; onChange: (v: string) => void }) {
  const selected = runs.find(r => r.run_id === value);
  return (
    <div style={{ background: '#1e293b', borderRadius: 5, padding: '10px 12px' }}>
      <div style={labelSt}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inputSt, width: '100%', cursor: 'pointer' }}>
        {runs.map(r => (
          <option key={r.run_id} value={r.run_id}>
            {r.scenario_id} — score {(r.score * 100).toFixed(0)}
          </option>
        ))}
      </select>
      {selected && (
        <div style={{ marginTop: 6, display: 'flex', gap: 12 }}>
          <div><span style={labelSt}>proof%</span><span style={{ color: '#60a5fa', fontSize: 11 }}>{(selected.proof_pass_rate * 100).toFixed(0)}%</span></div>
          <div><span style={labelSt}>val</span><span style={{ color: '#34d399', fontSize: 11 }}>{selected.mean_valuation.toFixed(1)}</span></div>
          <div><span style={labelSt}>ops</span><span style={{ color: '#64748b', fontSize: 11 }}>{selected.ops_count}</span></div>
        </div>
      )}
    </div>
  );
}

function GenomeDiffView({ result }: { result: { diff: GenomeDiff; genomeA: StoryGenome; genomeB: StoryGenome } }) {
  const { diff, genomeA, genomeB } = result;
  const simPct = (diff.similarity * 100).toFixed(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Similarity banner */}
      <div style={{ background: '#1e293b', borderRadius: 6, padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
          <Stat label="Overall similarity" value={`${simPct}%`} color={Number(simPct) >= 70 ? '#4ade80' : Number(simPct) >= 40 ? '#fb923c' : '#f87171'} />
          <SimBar label="Tension" value={diff.tensionSim} />
          <SimBar label="Voice"   value={diff.voiceSim} />
          <SimBar label="Theme"   value={diff.thematicSim} />
          <Stat label="Arc match" value={diff.arcMatch === 1 ? '✓' : '✗'} color={diff.arcMatch === 1 ? '#4ade80' : '#f87171'} />
        </div>
        {diff.differences.length > 0 && (
          <div>
            <div style={labelSt}>Notable differences</div>
            {diff.differences.map((d, i) => (
              <div key={i} style={{ color: '#94a3b8', fontSize: 11 }}>• {d}</div>
            ))}
          </div>
        )}
      </div>

      {/* Side-by-side genome summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <GenomeSummary genome={genomeA} label="Genome A" />
        <GenomeSummary genome={genomeB} label="Genome B" />
      </div>

      {/* Tension profile sparkline comparison */}
      <TensionCompare profileA={genomeA.tensionProfile} profileB={genomeB.tensionProfile} />
    </div>
  );
}

function GenomeSummary({ genome, label }: { genome: StoryGenome; label: string }) {
  const topVoice = Object.entries(genome.voiceVector)
    .sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div style={{ background: '#1e293b', borderRadius: 5, padding: '10px 12px' }}>
      <div style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>{label} — {genome.genomeId}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row k="arc" v={genome.arcArchetype} />
        <Row k="wound" v={genome.dominantWound ?? 'none'} />
        <Row k="irony" v={`${(genome.ironyDensity * 100).toFixed(0)}%`} />
        <Row k="reveals" v={`${(genome.revealComplexity * 100).toFixed(0)}% layered`} />
        <Row k="revertRate" v={`${(genome.revertRate * 100).toFixed(0)}%`} />
        <div style={{ marginTop: 4 }}>
          <div style={labelSt}>dominant voice</div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {topVoice.map(([op, pct]) => (
              <span key={op} style={{ background: '#312e81', color: '#a5b4fc', padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>
                {op.replace(/_/g, '-')} {(pct * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TensionCompare({ profileA, profileB }: { profileA: [number, number, number, number, number]; profileB: [number, number, number, number, number] }) {
  const w = 380, h = 60, pts = 5;
  function toPath(profile: number[], color: string) {
    const step = (w - 20) / (pts - 1);
    const points = profile.map((v, i) => `${10 + i * step},${h - 8 - v / 100 * (h - 16)}`).join(' ');
    return <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />;
  }
  return (
    <div style={{ background: '#1e293b', borderRadius: 5, padding: '10px 12px' }}>
      <div style={labelSt}>Tension profile comparison (A=purple, B=teal)</div>
      <svg width={w} height={h} style={{ display: 'block', marginTop: 4 }}>
        {toPath(Array.from(profileA), '#a78bfa')}
        {toPath(Array.from(profileB), '#2dd4bf')}
        {[0, 1, 2, 3, 4].map(i => {
          const x = 10 + i * ((w - 20) / 4);
          return <line key={i} x1={x} y1={0} x2={x} y2={h} stroke="#334155" strokeWidth={0.5} />;
        })}
      </svg>
    </div>
  );
}

function BreedResultView({ genome }: { genome: StoryGenome }) {
  return (
    <div style={{ background: '#064e3b', border: '1px solid #10b981', borderRadius: 6, padding: '12px 14px' }}>
      <div style={{ color: '#4ade80', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🧬 Hybrid genome bred: {genome.genomeId}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Row k="arc" v={genome.arcArchetype} />
        <Row k="wound" v={genome.dominantWound ?? 'none'} />
        <Row k="reveals" v={`${(genome.revealComplexity * 100).toFixed(0)}% layered`} />
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={labelSt}>Tension profile (hybrid)</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 30, marginTop: 4 }}>
          {genome.tensionProfile.map((v, i) => (
            <div key={i} style={{ flex: 1, background: '#10b981', borderRadius: 2, height: `${v}%`, minHeight: 2 }} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={labelSt}>Hybrid operators</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {genome.dominantOperators.map(op => (
            <span key={op} style={{ background: '#065f46', color: '#6ee7b7', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>
              {op.replace(/_/g, '-')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Stat({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div>
      <div style={labelSt}>{label}</div>
      <div style={{ color, fontSize: small ? 14 : 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function SimBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={labelSt}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 50, background: '#334155', borderRadius: 2, height: 6 }}>
          <div style={{ width: `${value * 100}%`, background: '#7c3aed', height: '100%', borderRadius: 2 }} />
        </div>
        <span style={{ color: '#a78bfa', fontSize: 11 }}>{(value * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{ color: '#64748b', fontSize: 10 }}>{k}:</span>
      <span style={{ color: '#cbd5e1', fontSize: 11 }}>{v}</span>
    </div>
  );
}

function scoreColor(s: number): string {
  if (s >= 0.7) return '#4ade80';
  if (s >= 0.4) return '#fb923c';
  return '#f87171';
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  background: '#0f172a', border: '1px solid #334155', borderRadius: 4,
  color: '#e2e8f0', padding: '4px 6px', fontFamily: 'monospace',
  fontSize: 12, boxSizing: 'border-box',
};

const labelSt: React.CSSProperties = {
  display: 'block', color: '#64748b', fontSize: 10, marginBottom: 2,
};

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16,
};

function btnSt(bg: string): React.CSSProperties {
  return {
    padding: '7px 12px', border: 'none', borderRadius: 5,
    background: bg, color: '#fff', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 12,
  };
}
