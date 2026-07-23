// FixedPointsPanel — G9 Temporal Authoring UI.
// The writer drops fixed points on future scenes ("by scene 5, nora must
// believe X"). The planner backward-chains and injects GoalBiases so the
// engine steers toward every declared attractor while staying emergent.

import React, { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FixedPointRequirement {
  factIds?: string[];
  characterIds?: string[];
  clueIds?: string[];
  claimIds?: string[];
  payoffSetupIds?: string[];
  minSuspense?: number;
}

interface FixedPoint {
  atScene: number;
  description: string;
  required: FixedPointRequirement;
}

interface GoalBias {
  atScene: number;
  ops: Array<{ op: string; [k: string]: unknown }>;
  fixedPointDescription: string;
  rationale: string;
}

interface PlanResult {
  biases: GoalBias[];
  alreadySatisfied: FixedPoint[];
  blocked: Array<{ fixedPoint: FixedPoint; reason: string }>;
  transcript: string;
  pressuresInjected: number;
}

interface BackchainItem {
  atScene: number;
  op: { op: string; [k: string]: unknown };
  reason: string;
}

interface BackchainResult {
  schedule: BackchainItem[];
  complete: boolean;
  blockingConstraint?: string;
  trace: string;
  biases: GoalBias[];
}

// ── Default / empty fixed point ───────────────────────────────────────────────

function emptyFP(idx: number): FixedPoint {
  return {
    atScene: idx + 3,
    description: '',
    required: {},
  };
}

interface Props { onClose: () => void; }

// ── Component ─────────────────────────────────────────────────────────────────

export function FixedPointsPanel({ onClose }: Props) {
  const [fps, setFps]               = useState<FixedPoint[]>([emptyFP(0)]);
  const [currentScene, setCurrentScene] = useState(0);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [bcResult, setBcResult]     = useState<BackchainResult | null>(null);
  const [bcTargetIdx, setBcTargetIdx] = useState<number | null>(null);
  const [planning, setPlanning]     = useState(false);
  const [chaining, setChaining]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  function addFP() {
    setFps(f => [...f, emptyFP(f.length)]);
  }

  function removeFP(i: number) {
    setFps(f => f.filter((_, j) => j !== i));
  }

  function updateFP(i: number, patch: Partial<FixedPoint>) {
    setFps(f => f.map((fp, j) => j === i ? { ...fp, ...patch } : fp));
  }

  function updateReq(i: number, patch: Partial<FixedPointRequirement>) {
    setFps(f => f.map((fp, j) => j === i ? { ...fp, required: { ...fp.required, ...patch } } : fp));
  }

  async function planAll() {
    setPlanning(true); setError(null); setPlanResult(null); setBcResult(null);
    try {
      const res = await fetch('/api/nvm/author/fixed-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixedPoints: fps, currentScene }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setPlanResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPlanning(false);
    }
  }

  async function backchainSingle(i: number) {
    setChaining(true); setError(null); setBcResult(null); setBcTargetIdx(i);
    try {
      const res = await fetch('/api/nvm/author/backchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixedPoint: fps[i], currentScene }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setBcResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChaining(false);
    }
  }

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
          <strong style={{ fontSize: 15 }}>Fixed Points — Temporal Authoring (G9)</strong>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11, marginTop: 2 }}>Drop attractors on future scenes · the planner back-chains the ops needed to reach them</div>
        </div>
        <button onClick={onClose} style={iconBtn}>✕</button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left: fixed point editor */}
        <div style={{ width: 360, flexShrink: 0, borderRight: '1px solid var(--sm-night-line)', overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Current scene control */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ color: 'var(--sm-ink-mute)', fontSize: 11 }}>Current scene</span>
            <input type="number" min={0} max={50} value={currentScene}
              onChange={e => setCurrentScene(Number(e.target.value))}
              style={{ ...inputSt, width: 52 }} />
            <span style={{ color: '#475569', fontSize: 10 }}>Planner works forward from here</span>
          </div>

          {/* Fixed point cards */}
          {fps.map((fp, i) => (
            <FixedPointCard
              key={i}
              idx={i}
              fp={fp}
              onChange={patch => updateFP(i, patch)}
              onReqChange={patch => updateReq(i, patch)}
              onRemove={() => removeFP(i)}
              onBackchain={() => backchainSingle(i)}
              isBackchaining={chaining && bcTargetIdx === i}
              canRemove={fps.length > 1}
            />
          ))}

          <button onClick={addFP} disabled={fps.length >= 6}
            style={{ ...btnSt('var(--sm-night-2)'), color: 'var(--sm-cream-mute)' }}>
            + Add Fixed Point
          </button>
        </div>

        {/* Right: plan results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Plan button */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={planAll} disabled={planning}
              style={{ ...btnSt('#7c3aed'), flex: 1, fontWeight: 700 }}>
              {planning ? 'Planning…' : `Plan toward ${fps.length} fixed point${fps.length !== 1 ? 's' : ''}`}
            </button>
          </div>

          {error && <div style={{ color: 'var(--sm-stamp)', background: 'var(--sm-night-2)', borderRadius: 5, padding: 10 }}>{error}</div>}

          {/* Multi-point plan result */}
          {planResult && <PlanResultView result={planResult} />}

          {/* Single-point backchain result */}
          {bcResult && bcTargetIdx !== null && (
            <BackchainResultView
              result={bcResult}
              fpDesc={fps[bcTargetIdx]?.description || `fixed point @ scene ${fps[bcTargetIdx]?.atScene}`}
            />
          )}

          {!planResult && !bcResult && !error && !planning && !chaining && (
            <div style={{ color: '#475569', textAlign: 'center', padding: 40, fontSize: 12 }}>
              Define fixed points on the left, then click "Plan" to see what ops the planner will inject into earlier scenes.
              Use "Backchain" on a single point for a deep precondition trace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Fixed point card ──────────────────────────────────────────────────────────

interface CardProps {
  idx: number;
  fp: FixedPoint;
  onChange: (p: Partial<FixedPoint>) => void;
  onReqChange: (p: Partial<FixedPointRequirement>) => void;
  onRemove: () => void;
  onBackchain: () => void;
  isBackchaining: boolean;
  canRemove: boolean;
}

function FixedPointCard({ idx, fp, onChange, onReqChange, onRemove, onBackchain, isBackchaining, canRemove }: CardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ background: 'var(--sm-night-2)', borderRadius: 6, border: '1px solid var(--sm-night-line)', overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: expanded ? '1px solid var(--sm-night-line)' : 'none' }}>
        <span style={{ color: '#7c3aed', fontSize: 14 }}>◈</span>
        <span style={{ color: 'var(--sm-cream-mute)', fontSize: 11, fontWeight: 700 }}>Scene</span>
        <input type="number" min={0} max={50} value={fp.atScene}
          onChange={e => onChange({ atScene: Number(e.target.value) })}
          style={{ ...inputSt, width: 46 }} />
        <button onClick={() => setExpanded(x => !x)} style={{ ...iconBtn, fontSize: 12, marginLeft: 'auto' }}>
          {expanded ? '▲' : '▼'}
        </button>
        <button onClick={onRemove} disabled={!canRemove} style={{ ...iconBtn, fontSize: 12, opacity: canRemove ? 1 : 0.3 }}>✕</button>
      </div>

      {expanded && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Description */}
          <div>
            <label style={labelSt}>Description (plain English attractor)</label>
            <input
              value={fp.description}
              onChange={e => onChange({ description: e.target.value })}
              placeholder={`e.g. "Nora discovers the will has been forged"`}
              style={{ ...inputSt, width: '100%' }}
            />
          </div>

          {/* Requirements grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <ReqField
              label="Fact IDs (comma-sep)"
              value={(fp.required.factIds ?? []).join(', ')}
              onChange={v => onReqChange({ factIds: v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined })}
              placeholder="will-fact, deed-fact"
            />
            <ReqField
              label="Character IDs"
              value={(fp.required.characterIds ?? []).join(', ')}
              onChange={v => onReqChange({ characterIds: v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined })}
              placeholder="nora, victor"
            />
            <ReqField
              label="Clue IDs"
              value={(fp.required.clueIds ?? []).join(', ')}
              onChange={v => onReqChange({ clueIds: v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined })}
              placeholder="clue-letter, clue-key"
            />
            <ReqField
              label="Theme Claim IDs"
              value={(fp.required.claimIds ?? []).join(', ')}
              onChange={v => onReqChange({ claimIds: v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined })}
              placeholder="claim-betrayal"
            />
            <ReqField
              label="Payoff Setup IDs"
              value={(fp.required.payoffSetupIds ?? []).join(', ')}
              onChange={v => onReqChange({ payoffSetupIds: v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined })}
              placeholder="setup-gun"
            />
            <div>
              <label style={labelSt}>Min suspense (0–100)</label>
              <input type="number" min={0} max={100}
                value={fp.required.minSuspense ?? ''}
                onChange={e => onReqChange({ minSuspense: e.target.value ? Number(e.target.value) : undefined })}
                style={{ ...inputSt, width: '100%' }}
                placeholder="e.g. 70"
              />
            </div>
          </div>

          <button onClick={onBackchain} disabled={isBackchaining}
            style={{ ...btnSt('#0c4a6e'), color: '#7dd3fc', fontSize: 11, marginTop: 2 }}>
            {isBackchaining ? 'Backchaining…' : '↩ Backchain this point'}
          </button>
        </div>
      )}
    </div>
  );
}

function ReqField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={labelSt}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputSt, width: '100%' }} />
    </div>
  );
}

// ── Plan result view ──────────────────────────────────────────────────────────

function PlanResultView({ result }: { result: PlanResult }) {
  const byScene = new Map<number, GoalBias[]>();
  for (const b of result.biases) {
    if (!byScene.has(b.atScene)) byScene.set(b.atScene, []);
    byScene.get(b.atScene)!.push(b);
  }
  const scenes = [...byScene.keys()].sort((a, b) => a - b);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Banner */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', background: 'var(--sm-night-2)', borderRadius: 6, padding: '10px 14px', alignItems: 'center' }}>
        <Stat label="Goal biases" value={String(result.biases.length)} color="var(--sm-cool)" />
        <Stat label="Already met" value={String(result.alreadySatisfied.length)} color="var(--sm-ok)" />
        <Stat label="Blocked" value={String(result.blocked.length)} color={result.blocked.length > 0 ? 'var(--sm-stamp)' : 'var(--sm-ink-mute)'} />
        <Stat label="Pressures injected" value={String(result.pressuresInjected)} color="var(--sm-cool)" />
      </div>

      {/* Already satisfied */}
      {result.alreadySatisfied.length > 0 && (
        <div>
          <div style={{ color: 'var(--sm-ok)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Already satisfied</div>
          {result.alreadySatisfied.map((fp, i) => (
            <div key={i} style={{ color: 'var(--sm-ok)', fontSize: 12, padding: '3px 0' }}>
              ✓ Scene {fp.atScene}: {fp.description || '(unnamed)'}
            </div>
          ))}
        </div>
      )}

      {/* Blocked */}
      {result.blocked.length > 0 && (
        <div>
          <div style={{ color: 'var(--sm-stamp)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Blocked fixed points</div>
          {result.blocked.map((b, i) => (
            <div key={i} style={{ background: 'var(--sm-night-2)', border: '1px solid #991b1b', borderRadius: 4, padding: '6px 10px', marginBottom: 4 }}>
              <div style={{ color: 'var(--sm-stamp)', fontSize: 12 }}>✗ Scene {b.fixedPoint.atScene}: {b.fixedPoint.description || '(unnamed)'}</div>
              <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11 }}>{b.reason}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bias schedule */}
      {scenes.length > 0 && (
        <div>
          <div style={{ color: 'var(--sm-cool)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Planned bias schedule</div>
          {scenes.map(sc => (
            <div key={sc} style={{ background: 'var(--sm-night-2)', borderRadius: 5, padding: '8px 12px', marginBottom: 6 }}>
              <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 5 }}>INJECT AT SCENE {sc}</div>
              {byScene.get(sc)!.map((bias, i) => (
                <div key={i} style={{ marginBottom: i < byScene.get(sc)!.length - 1 ? 6 : 0 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                    {bias.ops.map((op, oi) => (
                      <span key={oi} style={{ background: '#312e81', color: '#a5b4fc', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>
                        {op.op}
                      </span>
                    ))}
                  </div>
                  <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11 }}>{bias.rationale}</div>
                  <div style={{ color: '#475569', fontSize: 10 }}>for: {bias.fixedPointDescription}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Transcript */}
      <details style={{ background: 'var(--sm-night-2)', borderRadius: 5, padding: 10 }}>
        <summary style={{ color: 'var(--sm-ink-mute)', fontSize: 11, cursor: 'pointer' }}>Planning transcript</summary>
        <pre style={{ marginTop: 8, fontSize: 11, color: 'var(--sm-cream-mute)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0 0' }}>
          {result.transcript}
        </pre>
      </details>
    </div>
  );
}

// ── Backchain result view ─────────────────────────────────────────────────────

function BackchainResultView({ result, fpDesc }: { result: BackchainResult; fpDesc: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ color: '#38bdf8', fontSize: 12, fontWeight: 700 }}>Backchain: {fpDesc}</div>

      {/* Status banner */}
      <div style={{
        background: result.complete ? '#064e3b' : '#431407',
        border: `1px solid ${result.complete ? '#10b981' : '#f97316'}`,
        borderRadius: 5, padding: '8px 12px',
      }}>
        {result.complete
          ? <span style={{ color: 'var(--sm-ok)' }}>✓ Complete — {result.schedule.length} op(s) scheduled, no ordering conflicts</span>
          : <span style={{ color: '#f97316' }}>⚠ Incomplete — {result.blockingConstraint}</span>}
      </div>

      {/* Schedule */}
      {result.schedule.length > 0 && (
        <div>
          <div style={{ color: '#38bdf8', fontSize: 11, marginBottom: 6 }}>Precondition schedule</div>
          {result.schedule.map((s, i) => (
            <div key={i} style={{ background: '#0c1a2a', border: '1px solid #0e4166', borderRadius: 4, padding: '6px 10px', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                <span style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>scene {s.atScene}</span>
                <span style={{ background: '#0e4166', color: '#7dd3fc', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>{s.op.op}</span>
              </div>
              <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11 }}>{s.reason}</div>
            </div>
          ))}
        </div>
      )}

      {result.schedule.length === 0 && result.complete && (
        <div style={{ color: 'var(--sm-ok)', fontSize: 12, padding: '10px 0' }}>All requirements already satisfied — this fixed point needs no prep work.</div>
      )}

      {/* Biases generated */}
      {result.biases.length > 0 && (
        <div>
          <div style={{ color: '#38bdf8', fontSize: 11, marginBottom: 6 }}>{result.biases.length} bias(es) scheduled for injection</div>
          {result.biases.map((b, i) => (
            <div key={i} style={{ color: 'var(--sm-ink-mute)', fontSize: 11, padding: '2px 0' }}>
              Scene {b.atScene}: {b.ops.map(o => o.op).join(', ')} — {b.rationale}
            </div>
          ))}
        </div>
      )}

      {/* Trace */}
      <details style={{ background: 'var(--sm-night-2)', borderRadius: 5, padding: 10 }}>
        <summary style={{ color: 'var(--sm-ink-mute)', fontSize: 11, cursor: 'pointer' }}>Precondition trace</summary>
        <pre style={{ marginTop: 8, fontSize: 11, color: 'var(--sm-cream-mute)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0 0' }}>
          {result.trace}
        </pre>
      </details>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ color: 'var(--sm-ink-mute)', fontSize: 10 }}>{label}</div>
      <div style={{ color, fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const inputSt: React.CSSProperties = {
  background: 'var(--sm-night)', border: '1px solid var(--sm-night-line)', borderRadius: 4,
  color: 'var(--sm-cream)', padding: '4px 6px', fontFamily: 'var(--sm-font-mono)',
  fontSize: 12, boxSizing: 'border-box',
};

const labelSt: React.CSSProperties = {
  display: 'block', color: 'var(--sm-ink-mute)', fontSize: 10, marginBottom: 3,
};

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--sm-cream-mute)', cursor: 'pointer', fontSize: 16,
};

function btnSt(bg: string): React.CSSProperties {
  return {
    padding: '7px 12px', border: 'none', borderRadius: 5,
    background: bg, color: '#fff', cursor: 'pointer',
    fontFamily: 'var(--sm-font-mono)', fontSize: 12,
  };
}
