// ProofInspectorPanel — full 4-tier proof breakdown for any committed scene.
// Replays state to the selected commit, runs all 4 tiers + lint + repair,
// and renders per-proof pass/fail badges, findings, and patch suggestions.

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimelineScene {
  sceneIdx: number;
  commitId: string;
  t1Pass: boolean;
  t1FailCount: number;
  t2Score: number;
  qualityScore: number;
  tension: number;
  opCount: number;
}

interface ProofEntry {
  proof: string;
  pass: boolean;
  reason?: string;
  findings?: string[];
}

interface LintWarning {
  rule: string;
  severity: string;
  message: string;
}

interface RepairPatch {
  proof: string;
  ops: Array<{ op: string; [k: string]: unknown }>;
}

interface ProofReport {
  commitId: string;
  sceneIdx: number;
  opCount: number;
  tier1: ProofEntry[];
  tier1Pass: boolean;
  tier2: ProofEntry[];
  tier2Score: number;
  tier3: ProofEntry[];
  tier3Rank: number;
  tier4: ProofEntry[];
  patches: RepairPatch[];
  lintWarnings: LintWarning[];
  patchCount: number;
}

interface Props { onClose: () => void; }

// ── Panel ────────────────────────────────────────────────────────────────────

export function ProofInspectorPanel({ onClose }: Props) {
  const [scenes, setScenes]           = useState<TimelineScene[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [report, setReport]           = useState<ProofReport | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/nvm/arc-timeline');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      const data: { scenes: TimelineScene[] } = await res.json();
      setScenes(data.scenes);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  async function inspect(commitId: string) {
    setSelectedId(commitId);
    setReport(null);
    setLoadingReport(true);
    setError(null);
    try {
      const res = await fetch(`/api/nvm/proof/${commitId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingReport(false);
    }
  }

  return (
    <div style={{
      background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
      border: '1px solid #334155', width: 880, maxWidth: '98vw',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace', fontSize: 13,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: 15 }}>Proof Inspector — 4-tier scene analysis</strong>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
            Select any committed scene · run all tiers · see findings + repair patches
          </div>
        </div>
        <button onClick={onClose} style={iconBtn}>✕</button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left: scene selector */}
        <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid #334155', overflowY: 'auto', padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ color: '#64748b', fontSize: 11 }}>COMMITTED SCENES</span>
            <button onClick={loadList} style={{ ...chipBtn('#1e293b'), fontSize: 10 }}>↺</button>
          </div>

          {loadingList && <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>Loading…</div>}

          {!loadingList && scenes.length === 0 && (
            <div style={{ color: '#475569', fontSize: 11, textAlign: 'center', padding: 20 }}>
              No committed scenes yet. Run the engine to build a story.
            </div>
          )}

          {scenes.map(sc => {
            const isSelected = sc.commitId === selectedId;
            return (
              <div
                key={sc.commitId}
                onClick={() => inspect(sc.commitId)}
                style={{
                  background: isSelected ? '#1e2d4a' : '#1e293b',
                  border: `1px solid ${isSelected ? '#3b82f6' : '#334155'}`,
                  borderRadius: 5, padding: '8px 10px', marginBottom: 6,
                  cursor: 'pointer', transition: 'border-color 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: '#64748b', fontSize: 10 }}>Scene {sc.sceneIdx}</span>
                  <span style={{
                    background: sc.t1Pass ? '#064e3b' : '#7f1d1d',
                    color: sc.t1Pass ? '#4ade80' : '#f87171',
                    padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                  }}>
                    {sc.t1Pass ? 'T1 ✓' : `T1 ✗${sc.t1FailCount}`}
                  </span>
                  <span style={{ color: qualityColor(sc.t2Score), fontSize: 10 }}>T2:{sc.t2Score}</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ color: '#64748b', fontSize: 10 }}>Q:{sc.qualityScore}</span>
                  <span style={{ color: '#a78bfa', fontSize: 10 }}>T:{sc.tension.toFixed(0)}</span>
                  <span style={{ color: '#475569', fontSize: 10 }}>{sc.opCount} ops</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: proof report */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {!selectedId && (
            <div style={{ color: '#475569', textAlign: 'center', padding: 50, fontSize: 12 }}>
              ← Select a scene to inspect its proof results
            </div>
          )}

          {loadingReport && (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>
              Running 4-tier proof kernel…
            </div>
          )}

          {error && (
            <div style={{ color: '#f87171', background: '#1e293b', borderRadius: 5, padding: 10 }}>{error}</div>
          )}

          {report && <ReportView report={report} />}
        </div>
      </div>
    </div>
  );
}

// ── Report view ───────────────────────────────────────────────────────────────

function ReportView({ report }: { report: ProofReport }) {
  const totalIssues = report.tier1.filter(r => !r.pass).length +
    report.tier2.filter(r => !r.pass).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary banner */}
      <div style={{
        display: 'flex', gap: 18, flexWrap: 'wrap',
        background: '#1e293b', borderRadius: 6, padding: '10px 14px', alignItems: 'center',
      }}>
        <Stat label="Scene" value={String(report.sceneIdx)} color="#94a3b8" />
        <Stat label="Ops" value={String(report.opCount)} color="#64748b" />
        <Stat label="T1" value={report.tier1Pass ? '✓ pass' : '✗ fail'} color={report.tier1Pass ? '#4ade80' : '#f87171'} />
        <Stat label="T2 score" value={String(report.tier2Score)} color={qualityColor(report.tier2Score)} />
        <Stat label="T3 rank" value={String(report.tier3Rank)} color={report.tier3Rank === 100 ? '#4ade80' : '#fb923c'} />
        <Stat label="Patches" value={String(report.patchCount)} color={report.patchCount > 0 ? '#fbbf24' : '#64748b'} />
        {totalIssues === 0 && (
          <span style={{ background: '#064e3b', color: '#4ade80', padding: '2px 10px', borderRadius: 4, fontSize: 11 }}>
            All proofs pass
          </span>
        )}
      </div>

      {/* Tier 1 — hard blocks */}
      <TierSection
        label="Tier 1 — Hard Block Proofs"
        subtitle="Any failure prevents commit"
        proofs={report.tier1}
        passColor="#4ade80"
        failColor="#f87171"
        failBg="#431407"
        passBg="#064e3b"
      />

      {/* Tier 2 — quality gates */}
      <TierSection
        label="Tier 2 — Quality Gate Proofs"
        subtitle={`Score: ${report.tier2Score}/100 — failures feed back into generation spec`}
        proofs={report.tier2}
        passColor="#60a5fa"
        failColor="#fb923c"
        failBg="#1c1008"
        passBg="#0c1a2a"
      />

      {/* Tier 3 — ranking signals */}
      <TierSection
        label="Tier 3 — Ranking Signals"
        subtitle={`Rank: ${report.tier3Rank}/100 — more passes = higher candidate rank`}
        proofs={report.tier3}
        passColor="#a78bfa"
        failColor="#94a3b8"
        failBg="#1e293b"
        passBg="#1a1535"
      />

      {/* Tier 4 — ethics advisories */}
      {report.tier4.length > 0 && (
        <TierSection
          label="Tier 4 — Ethics & Disclosure (advisory)"
          subtitle="Monitor only — do not block or rank"
          proofs={report.tier4}
          passColor="#34d399"
          failColor="#fbbf24"
          failBg="#1a1500"
          passBg="#0a1a12"
        />
      )}

      {/* Repair patches */}
      {report.patches.length > 0 && (
        <div>
          <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
            Repair patches ({report.patches.length})
          </div>
          {report.patches.map((p, i) => (
            <div key={i} style={{ background: '#1a1200', border: '1px solid #78350f', borderRadius: 4, padding: '7px 10px', marginBottom: 6 }}>
              <div style={{ color: '#fbbf24', fontSize: 11, marginBottom: 4 }}>Fix for {p.proof}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {p.ops.map((op, oi) => (
                  <span key={oi} style={{ background: '#78350f', color: '#fcd34d', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>
                    {op.op}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lint warnings */}
      {report.lintWarnings.length > 0 && (
        <div>
          <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
            Lint warnings ({report.lintWarnings.length})
          </div>
          {report.lintWarnings.map((w, i) => (
            <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, padding: '6px 10px', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                <span style={{
                  background: w.severity === 'error' ? '#7f1d1d' : '#1c1008',
                  color: w.severity === 'error' ? '#f87171' : '#fb923c',
                  padding: '1px 5px', borderRadius: 3, fontSize: 10,
                }}>
                  {w.severity}
                </span>
                <span style={{ color: '#64748b', fontSize: 10 }}>{w.rule}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 11 }}>{w.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tier section ──────────────────────────────────────────────────────────────

function TierSection({ label, subtitle, proofs, passColor, failColor, failBg, passBg }: {
  label: string; subtitle: string;
  proofs: ProofEntry[];
  passColor: string; failColor: string;
  failBg: string; passBg: string;
}) {
  const failCount = proofs.filter(p => !p.pass).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <div style={{ color: failCount === 0 ? passColor : failColor, fontSize: 11, fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ color: '#475569', fontSize: 10 }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {proofs.map(p => (
          <div key={p.proof} style={{
            background: p.pass ? passBg : failBg,
            border: `1px solid ${p.pass ? passColor + '44' : failColor + '66'}`,
            borderRadius: 4, padding: '6px 10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: p.reason ? 4 : 0 }}>
              <span style={{ color: p.pass ? passColor : failColor, fontSize: 13, fontWeight: 700 }}>
                {p.pass ? '✓' : '✗'}
              </span>
              <span style={{ color: p.pass ? passColor : failColor, fontSize: 12 }}>{p.proof}</span>
              {!p.pass && p.reason && (
                <span style={{ color: '#64748b', fontSize: 11, marginLeft: 4 }}>{p.reason}</span>
              )}
            </div>
            {p.findings && p.findings.length > 0 && (
              <div style={{ marginLeft: 20, marginTop: 2 }}>
                {p.findings.map((f, i) => (
                  <div key={i} style={{ color: '#94a3b8', fontSize: 11 }}>• {f}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ color: '#64748b', fontSize: 10 }}>{label}</div>
      <div style={{ color, fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function qualityColor(score: number): string {
  if (score >= 66) return '#4ade80';
  if (score >= 33) return '#fb923c';
  return '#f87171';
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16,
};

function chipBtn(bg: string): React.CSSProperties {
  return {
    background: bg, border: '1px solid #334155', borderRadius: 4,
    color: '#e2e8f0', padding: '3px 8px', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 11,
  };
}
