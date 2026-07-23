// QualityEnginesPanel — 5-tab quality engine UI for committed scenes.
// Fetches GET /api/nvm/quality/scene/:commitId and renders:
//   Overview · Dialogue (10 validators) · Voice & Style · Propp's Morphology · Causal Graph

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QualityWarning {
  engine: string;
  opIdx: number | null;
  rule: string;
  message: string;
  penalty: number;
}

interface CausalPlotGraph {
  nodes: Array<{ opIdx: number; opKind: string }>;
  edges: Array<{ from: string; toOpIdx: number }>;
  rootOps: number[];
  leafOps: number[];
}

interface ProppAnalysis {
  present: string[];
  absent: string[];
  coverage: number;
}

interface QualitySceneReport {
  commitId: string;
  sceneIdx: number;
  opCount: number;
  score: number;
  specificity: number;
  arcDebt: string[];
  revealReady: boolean;
  necessityScore: number;
  burrowsDelta: number;
  warnings: QualityWarning[];
  causalGraph: CausalPlotGraph;
  proppAnalysis: ProppAnalysis;
  repairGaps: string[];
}

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

interface Props { onClose: () => void; }

// ── Tab IDs ───────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'dialogue' | 'voice' | 'propp' | 'graph';
const TABS: Array<{ id: TabId; label: string; color: string }> = [
  { id: 'overview', label: 'Overview', color: 'var(--sm-cool)' },
  { id: 'dialogue', label: 'Dialogue', color: 'var(--sm-warn)' },
  { id: 'voice', label: 'Voice & Style', color: 'var(--sm-cool)' },
  { id: 'propp', label: "Propp's Morphology", color: '#34d399' },
  { id: 'graph', label: 'Causal Graph', color: 'var(--sm-warn)' },
];

const PROPP_STAGES = ['preparation', 'complication', 'mediation', 'departure', 'ordeal', 'consequence', 'resolution'];
const PROPP_LABELS: Record<string, string> = {
  preparation: 'Preparation — world-building (ADD_FACT)',
  complication: 'Complication — lack/villainy (fear, RAISE_CLOCK)',
  mediation: 'Mediation — hero receives call (told belief)',
  departure: 'Departure — hero commits (ADVANCE_OBJECT_ARC)',
  ordeal: 'Ordeal — confrontation (negative SHIFT_REL)',
  consequence: 'Consequence — result (positive SHIFT_REL, PAYOFF)',
  resolution: 'Resolution — return (ADVANCE_THEME resolve)',
};

// ── Panel ─────────────────────────────────────────────────────────────────────

export function QualityEnginesPanel({ onClose }: Props) {
  const [scenes, setScenes]     = useState<TimelineScene[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport]     = useState<QualitySceneReport | null>(null);
  const [loading, setLoading]   = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [tab, setTab]           = useState<TabId>('overview');

  const loadScenes = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/nvm/arc-timeline');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      const data: { scenes: TimelineScene[] } = await res.json();
      setScenes(data.scenes);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadScenes(); }, [loadScenes]);

  async function inspect(commitId: string) {
    setSelectedId(commitId);
    setReport(null);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nvm/quality/scene/${commitId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: 'var(--sm-night)', color: 'var(--sm-cream)', borderRadius: 8,
      border: '1px solid var(--sm-night-line)', width: 920, maxWidth: '98vw',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--sm-font-mono)', fontSize: 13,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--sm-night-line)', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: 15 }}>Quality Engines — 9 narrative quality signals</strong>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11, marginTop: 2 }}>
            Specificity · 10 Dialogue Validators · Necessity · Burrows's Delta · ArcDebt · Propp · Causal Graph
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sm-cream-mute)', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left: scene list */}
        <div style={{ width: 230, flexShrink: 0, borderRight: '1px solid var(--sm-night-line)', overflowY: 'auto', padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>COMMITTED SCENES</span>
            <button onClick={loadScenes} style={{ background: 'var(--sm-night-2)', border: '1px solid var(--sm-night-line)', borderRadius: 4, color: 'var(--sm-cream)', padding: '2px 7px', cursor: 'pointer', fontSize: 10 }}>↺</button>
          </div>
          {listLoading && <div style={{ color: 'var(--sm-ink-mute)', textAlign: 'center', padding: 16 }}>Loading…</div>}
          {!listLoading && scenes.length === 0 && (
            <div style={{ color: '#475569', fontSize: 10, textAlign: 'center', padding: 16 }}>No committed scenes yet.</div>
          )}
          {scenes.map(sc => {
            const sel = sc.commitId === selectedId;
            return (
              <div key={sc.commitId} onClick={() => inspect(sc.commitId)} style={{
                background: sel ? '#1e2d4a' : 'var(--sm-night-2)',
                border: `1px solid ${sel ? '#3b82f6' : 'var(--sm-night-line)'}`,
                borderRadius: 5, padding: '7px 9px', marginBottom: 5, cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>Scene {sc.sceneIdx}</span>
                  <span style={{ background: sc.qualityScore >= 70 ? '#064e3b' : sc.qualityScore >= 40 ? '#1c1008' : 'var(--sm-stamp-dk)', color: sc.qualityScore >= 70 ? 'var(--sm-ok)' : sc.qualityScore >= 40 ? 'var(--sm-warn)' : 'var(--sm-stamp)', padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>
                    Q:{sc.qualityScore}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>{sc.opCount} ops</span>
                  <span style={{ color: 'var(--sm-cool)', fontSize: 10 }}>T:{sc.tension.toFixed(0)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: quality report */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--sm-night-line)', padding: '0 12px', flexShrink: 0, gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? t.color : 'transparent'}`,
                color: tab === t.id ? t.color : 'var(--sm-ink-mute)', cursor: 'pointer', padding: '8px 10px',
                fontSize: 11, fontFamily: 'var(--sm-font-mono)', fontWeight: tab === t.id ? 700 : 400,
                transition: 'color 0.1s, border-color 0.1s',
              }}>{t.label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {!selectedId && (
              <div style={{ color: '#475569', textAlign: 'center', padding: 50 }}>← Select a scene to inspect</div>
            )}
            {loading && <div style={{ color: 'var(--sm-ink-mute)', textAlign: 'center', padding: 40 }}>Running quality engines…</div>}
            {error && <div style={{ color: 'var(--sm-stamp)', background: 'var(--sm-night-2)', borderRadius: 5, padding: 10 }}>{error}</div>}
            {report && tab === 'overview'  && <OverviewTab report={report} />}
            {report && tab === 'dialogue'  && <DialogueTab report={report} />}
            {report && tab === 'voice'     && <VoiceTab report={report} />}
            {report && tab === 'propp'     && <ProppTab report={report} />}
            {report && tab === 'graph'     && <GraphTab report={report} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ report }: { report: QualitySceneReport }) {
  const scoreColor = report.score >= 70 ? 'var(--sm-ok)' : report.score >= 40 ? 'var(--sm-warn)' : 'var(--sm-stamp)';
  const warnGroups = groupBy(report.warnings, w => w.engine);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Score banner */}
      <div style={{ background: 'var(--sm-night-2)', borderRadius: 6, padding: '12px 16px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>QUALITY SCORE</div>
          <div style={{ color: scoreColor, fontSize: 28, fontWeight: 700 }}>{report.score}</div>
        </div>
        <Stat label="Specificity" value={pct(report.specificity)} color={report.specificity >= 0.6 ? 'var(--sm-ok)' : 'var(--sm-warn)'} />
        <Stat label="Necessity" value={pct(report.necessityScore)} color={report.necessityScore >= 0.8 ? 'var(--sm-ok)' : 'var(--sm-warn)'} />
        <Stat label="Burrows δ" value={pct(report.burrowsDelta)} color={report.burrowsDelta <= 0.4 ? 'var(--sm-ok)' : 'var(--sm-warn)'} />
        <Stat label="Reveal Ready" value={report.revealReady ? 'yes' : 'no'} color={report.revealReady ? 'var(--sm-ok)' : 'var(--sm-cream-mute)'} />
        <Stat label="Warnings" value={String(report.warnings.length)} color={report.warnings.length === 0 ? 'var(--sm-ok)' : 'var(--sm-warn)'} />
      </div>

      {/* Score bar */}
      <div>
        <div style={{ background: 'var(--sm-night-2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
          <div style={{ background: scoreColor, height: '100%', width: `${report.score}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Arc debt */}
      {report.arcDebt.length > 0 && (
        <div>
          <div style={{ color: 'var(--sm-warn)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Arc Debt ({report.arcDebt.length})</div>
          {report.arcDebt.map((d, i) => (
            <div key={i} style={{ background: 'var(--sm-night-2)', border: '1px solid #78350f', borderRadius: 4, padding: '6px 10px', marginBottom: 4, color: '#fcd34d', fontSize: 11 }}>
              ⚠ {d}
            </div>
          ))}
        </div>
      )}

      {/* Warning summary by engine */}
      {Object.entries(warnGroups).map(([engine, ws]) => (
        <div key={engine}>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 4 }}>
            {engine.toUpperCase().replace(/_/g, ' ')} ({ws.length} warning{ws.length !== 1 ? 's' : ''})
          </div>
          {ws.map((w, i) => (
            <div key={i} style={{ background: 'var(--sm-night-2)', border: '1px solid var(--sm-night-line)', borderRadius: 4, padding: '5px 9px', marginBottom: 3, fontSize: 11, display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <PenaltyChip penalty={w.penalty} />
              <span style={{ color: 'var(--sm-cream-mute)' }}>{w.message}</span>
            </div>
          ))}
        </div>
      ))}

      {report.warnings.length === 0 && (
        <div style={{ background: '#064e3b', border: '1px solid #065f46', borderRadius: 5, padding: '10px 14px', color: 'var(--sm-ok)', fontSize: 12 }}>
          ✓ All quality engines pass — no warnings
        </div>
      )}
    </div>
  );
}

// ── Tab: Dialogue ─────────────────────────────────────────────────────────────

const DV_RULES = [
  'DV1_ON_THE_NOSE', 'DV2_REDUNDANT_BELIEF', 'DV3_UNMOTIVATED_EMOTION',
  'DV4_UNGROUNDED_RELATIONSHIP', 'DV5_NO_HUMAN_PRESENCE', 'DV6_CHARACTER_MONOLOGUE',
  'DV7_UNMOTIVATED_TENSION_DROP', 'DV8_ABRUPT_RELATIONSHIP', 'DV9_UNGROUNDED_THEME',
  'DV10_STRUCTURAL_UNIFORMITY', 'DV11_UNEXPLAINED_PRIDE',
  'DV12_TALKING_HEADS', 'DV13_UNACKNOWLEDGED_CLOCK', 'DV14_EMOTIONAL_FLATLINE',
  'DV15_GOAL_FREE_SCENE',
];
const DV_LABELS: Record<string, string> = {
  DV1_ON_THE_NOSE: 'On-the-Nose — told belief at full confidence',
  DV2_REDUNDANT_BELIEF: 'Redundant Belief — duplicate proposition',
  DV3_UNMOTIVATED_EMOTION: 'Unmotivated Emotion — no causal predecessor',
  DV4_UNGROUNDED_RELATIONSHIP: 'Ungrounded Relationship — no prior belief/emotion',
  DV5_NO_HUMAN_PRESENCE: 'No Human Presence — only world-fact ops',
  DV6_CHARACTER_MONOLOGUE: 'Character Monologue — dominates 3+ consecutive ops',
  DV7_UNMOTIVATED_TENSION_DROP: 'Unmotivated Tension Drop — no repair arc',
  DV8_ABRUPT_RELATIONSHIP: 'Abrupt Relationship — large shift without emotion',
  DV9_UNGROUNDED_THEME: 'Ungrounded Theme — resolve/support without facts',
  DV10_STRUCTURAL_UNIFORMITY: 'Structural Uniformity — all ops same kind',
  DV11_UNEXPLAINED_PRIDE: 'Unexplained Pride — no prior achievement',
  DV12_TALKING_HEADS: 'Talking Heads — dialogue with no world consequence',
  DV13_UNACKNOWLEDGED_CLOCK: 'Unacknowledged Clock — stakes invisible to characters',
  DV14_EMOTIONAL_FLATLINE: 'Emotional Flatline — character emotion never arcs',
  DV15_GOAL_FREE_SCENE: 'Goal-Free Scene — no arc/theme/payoff/clock progress',
};

function DialogueTab({ report }: { report: QualitySceneReport }) {
  const dvWarnings = report.warnings.filter(w => w.engine === 'dialogue_validator');
  const firedRules = new Set(dvWarnings.map(w => w.rule));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 4 }}>
        {firedRules.size} of {DV_RULES.length} dialogue validators triggered
      </div>
      {DV_RULES.map(rule => {
        const ws = dvWarnings.filter(w => w.rule === rule);
        const pass = ws.length === 0;
        return (
          <div key={rule} style={{
            background: pass ? '#0a1a0a' : '#1a0a00',
            border: `1px solid ${pass ? '#16532444' : '#9a3412'}`,
            borderRadius: 5, padding: '8px 11px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: ws.length ? 4 : 0 }}>
              <span style={{ color: pass ? 'var(--sm-ok)' : 'var(--sm-warn)', fontWeight: 700, fontSize: 13 }}>{pass ? '✓' : '✗'}</span>
              <span style={{ color: 'var(--sm-cream-mute)', fontSize: 10, fontWeight: 700 }}>{rule}</span>
              <span style={{ color: '#475569', fontSize: 10 }}>{DV_LABELS[rule]}</span>
            </div>
            {ws.map((w, i) => (
              <div key={i} style={{ marginLeft: 20, marginTop: 3, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <PenaltyChip penalty={w.penalty} />
                <span style={{ color: 'var(--sm-warn)', fontSize: 11 }}>{w.message}</span>
                {w.opIdx !== null && <span style={{ color: '#475569', fontSize: 10 }}>op[{w.opIdx}]</span>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Voice & Style ────────────────────────────────────────────────────────

function VoiceTab({ report }: { report: QualitySceneReport }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <MetricBar label="Specificity" value={report.specificity} lo={0.6} hi={0.85}
        hint="How concrete vs. vague the op content is. Vague terms penalize the score." />
      <MetricBar label="Necessity" value={report.necessityScore} lo={0.8} hi={0.95}
        hint="Fraction of ops that are structurally essential (not redundant or repeated)." />
      <MetricBar label="Burrows's Delta (voice diversity)" value={report.burrowsDelta} lo={0} hi={0.4}
        hint="0 = every character has a distinct vocabulary. 1 = all voices identical. Lower is better." invert />

      {/* Repair gaps */}
      {report.repairGaps.length > 0 && (
        <div>
          <div style={{ color: 'var(--sm-warn)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
            Relationship Repair Gaps ({report.repairGaps.length})
          </div>
          {report.repairGaps.map((g, i) => (
            <div key={i} style={{ background: 'var(--sm-night-2)', border: '1px solid #78350f', borderRadius: 4, padding: '6px 10px', marginBottom: 4, color: '#fcd34d', fontSize: 11 }}>
              {g}
            </div>
          ))}
        </div>
      )}

      {/* Reveal readiness detail */}
      <div style={{ background: 'var(--sm-night-2)', border: '1px solid var(--sm-night-line)', borderRadius: 5, padding: '10px 14px' }}>
        <div style={{ color: 'var(--sm-cream-mute)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Reveal Readiness</div>
        <div style={{ color: report.revealReady ? 'var(--sm-ok)' : 'var(--sm-warn)', fontSize: 13 }}>
          {report.revealReady ? '✓ Audience is ready for a reveal' : '✗ Reveal conditions not yet met'}
        </div>
        <div style={{ color: '#475569', fontSize: 10, marginTop: 4 }}>
          (Requires: ≥2 clues + suspense ≥50 + at least one 'told' belief layer)
        </div>
      </div>
    </div>
  );
}

// ── Tab: Propp's Morphology ───────────────────────────────────────────────────

function ProppTab({ report }: { report: QualitySceneReport }) {
  const { proppAnalysis } = report;
  const coveragePct = Math.round(proppAnalysis.coverage * 100);
  const coverageColor = coveragePct >= 70 ? 'var(--sm-ok)' : coveragePct >= 40 ? 'var(--sm-warn)' : 'var(--sm-stamp)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'var(--sm-night-2)', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>COVERAGE</div>
          <div style={{ color: coverageColor, fontSize: 24, fontWeight: 700 }}>{coveragePct}%</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 4 }}>
            {proppAnalysis.present.length} of 7 Proppian stages present in this scene
          </div>
          <div style={{ background: 'var(--sm-night-line)', borderRadius: 4, height: 6 }}>
            <div style={{ background: coverageColor, height: '100%', width: `${coveragePct}%`, borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {PROPP_STAGES.map(stage => {
        const present = proppAnalysis.present.includes(stage);
        return (
          <div key={stage} style={{
            background: present ? '#0a1a0a' : 'var(--sm-night-2)',
            border: `1px solid ${present ? '#16532444' : 'var(--sm-night-line)'}`,
            borderRadius: 5, padding: '8px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: present ? 'var(--sm-ok)' : '#475569', fontWeight: 700, fontSize: 14 }}>{present ? '✓' : '○'}</span>
              <span style={{ color: present ? 'var(--sm-ok)' : '#475569', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{stage}</span>
            </div>
            <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginTop: 3, marginLeft: 22 }}>
              {PROPP_LABELS[stage]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Causal Graph ─────────────────────────────────────────────────────────

function GraphTab({ report }: { report: QualitySceneReport }) {
  const { causalGraph } = report;
  const rootSet = new Set(causalGraph.rootOps);
  const leafSet = new Set(causalGraph.leafOps);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'var(--sm-night-2)', borderRadius: 6, padding: '10px 14px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <Stat label="Nodes" value={String(causalGraph.nodes.length)} color="var(--sm-cream-mute)" />
        <Stat label="Causal edges" value={String(causalGraph.edges.length)} color="var(--sm-cool)" />
        <Stat label="Root ops" value={String(causalGraph.rootOps.length)} color="var(--sm-ok)" />
        <Stat label="Leaf ops" value={String(causalGraph.leafOps.length)} color="var(--sm-cool)" />
      </div>

      <div>
        <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 6 }}>OP NODES</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {causalGraph.nodes.map(n => {
            const isRoot = rootSet.has(n.opIdx);
            const isLeaf = leafSet.has(n.opIdx);
            const bg = isRoot ? '#0c2a1a' : isLeaf ? '#1a0c2a' : 'var(--sm-night-2)';
            const border = isRoot ? '#16a34a' : isLeaf ? '#7c3aed' : 'var(--sm-night-line)';
            const label = isRoot ? '↓ root' : isLeaf ? '↑ leaf' : '';
            return (
              <div key={n.opIdx} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: '4px 8px', fontSize: 10 }}>
                <span style={{ color: 'var(--sm-cream-mute)' }}>[{n.opIdx}] </span>
                <span style={{ color: 'var(--sm-cream)' }}>{n.opKind}</span>
                {label && <span style={{ color: border, marginLeft: 4 }}>{label}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {causalGraph.edges.length > 0 && (
        <div>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 6 }}>CAUSAL EDGES</div>
          {causalGraph.edges.map((e, i) => (
            <div key={i} style={{ background: 'var(--sm-night-2)', border: '1px solid var(--sm-night-line)', borderRadius: 4, padding: '5px 9px', marginBottom: 3, fontSize: 11, color: 'var(--sm-cream-mute)' }}>
              <span style={{ color: 'var(--sm-cool)' }}>{e.from}</span>
              <span style={{ color: '#475569' }}> → op[</span>
              <span style={{ color: 'var(--sm-cream)' }}>{e.toOpIdx}</span>
              <span style={{ color: '#475569' }}>]</span>
            </div>
          ))}
        </div>
      )}

      {causalGraph.edges.length === 0 && (
        <div style={{ color: '#475569', fontSize: 11 }}>
          No explicit causalLinks declared on this IR (implicit causality only).
        </div>
      )}

      {/* Repair gaps */}
      {report.repairGaps.length > 0 && (
        <div>
          <div style={{ color: 'var(--sm-warn)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
            Relationship Repair Gaps
          </div>
          {report.repairGaps.map((g, i) => (
            <div key={i} style={{ background: 'var(--sm-night-2)', border: '1px solid #78350f', borderRadius: 4, padding: '6px 10px', marginBottom: 4, color: '#fcd34d', fontSize: 11 }}>{g}</div>
          ))}
        </div>
      )}
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

function PenaltyChip({ penalty }: { penalty: number }) {
  const color = penalty >= 25 ? 'var(--sm-stamp)' : penalty >= 15 ? 'var(--sm-warn)' : 'var(--sm-warn)';
  return (
    <span style={{ background: 'var(--sm-night-2)', border: `1px solid ${color}`, color, borderRadius: 3, padding: '0 5px', fontSize: 10, flexShrink: 0 }}>
      -{penalty}
    </span>
  );
}

function MetricBar({ label, value, lo, hi, hint, invert }: { label: string; value: number; lo: number; hi: number; hint: string; invert?: boolean }) {
  const pctVal = Math.round(value * 100);
  const good = invert ? value <= lo : value >= lo;
  const color = good ? 'var(--sm-ok)' : value >= (invert ? hi : lo * 0.5) ? 'var(--sm-warn)' : 'var(--sm-stamp)';
  return (
    <div style={{ background: 'var(--sm-night-2)', borderRadius: 5, padding: '10px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: 'var(--sm-cream-mute)', fontSize: 11, fontWeight: 700 }}>{label}</span>
        <span style={{ color, fontSize: 13, fontWeight: 700 }}>{pctVal}%</span>
      </div>
      <div style={{ background: 'var(--sm-night-line)', borderRadius: 4, height: 5, marginBottom: 6 }}>
        <div style={{ background: color, height: '100%', width: `${pctVal}%`, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <div style={{ color: '#475569', fontSize: 10 }}>{hint}</div>
    </div>
  );
}

function pct(v: number): string { return `${Math.round(v * 100)}%`; }

function groupBy<T>(arr: T[], key: (x: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    (result[k] ??= []).push(item);
  }
  return result;
}
