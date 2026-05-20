// CausalTwinPanel — G4 Causal Twin UI (Pearl's do()-calculus).
// The writer browses the StoryOp DAG, selects any op as an intervention
// target, fires do(X := ∅) or do(X := Y), and sees exactly which downstream
// beliefs, emotions, and reveals are now causally invalid.

import React, { useState, useEffect, useCallback } from 'react';

// ── Types mirrored from server-side ──────────────────────────────────────────

interface SCMNodeSummary {
  opId: string;
  commitId: string;
  opIdx: number;
  op: { op: string; [k: string]: unknown };
  parents: string[];
  children: string[];
}

interface SCMData {
  nodes: SCMNodeSummary[];
  order: string[];
  nodeCount: number;
}

interface AffectedOp {
  opId: string;
  commitId: string;
  opIdx: number;
  originalOp: { op: string; [k: string]: unknown };
  reason: string;
  distance: number;
}

interface CounterfactualReport {
  intervention: { opId: string; replacement: unknown };
  affectedOps: AffectedOp[];
  directlyAffected: AffectedOp[];
  transitivelyAffected: AffectedOp[];
  summary: string;
}

interface Props { onClose: () => void; }

// ── Component ─────────────────────────────────────────────────────────────────

export function CausalTwinPanel({ onClose }: Props) {
  const [scm, setScm]                   = useState<SCMData | null>(null);
  const [scmLoading, setScmLoading]     = useState(false);
  const [scmError, setScmError]         = useState<string | null>(null);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [report, setReport]             = useState<CounterfactualReport | null>(null);
  const [running, setRunning]           = useState(false);
  const [reportError, setReportError]   = useState<string | null>(null);

  const loadSCM = useCallback(async () => {
    setScmLoading(true); setScmError(null);
    try {
      const res = await fetch('/api/nvm/twin/scm');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setScm(await res.json());
    } catch (e) {
      setScmError(e instanceof Error ? e.message : String(e));
    } finally {
      setScmLoading(false);
    }
  }, []);

  useEffect(() => { loadSCM(); }, [loadSCM]);

  async function runIntervention(removal: boolean) {
    if (!selectedId) return;
    setRunning(true); setReport(null); setReportError(null);
    try {
      const res = await fetch('/api/nvm/twin/do', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opId: selectedId, replacement: removal ? null : undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setReport(await res.json());
    } catch (e) {
      setReportError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  // Group nodes by commitId
  const commitGroups = scm
    ? [...new Set(scm.nodes.map(n => n.commitId))].map(cid => ({
        commitId: cid,
        nodes: scm.nodes.filter(n => n.commitId === cid).sort((a, b) => a.opIdx - b.opIdx),
      }))
    : [];

  const selectedNode = scm?.nodes.find(n => n.opId === selectedId) ?? null;

  // Build a set of affected opIds from the report for fast lookup
  const affectedSet = new Map<string, number>(); // opId → distance
  if (report) {
    for (const a of report.affectedOps) affectedSet.set(a.opId, a.distance);
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
          <strong style={{ fontSize: 15 }}>Causal Twin — Pearl's do()-calculus (G4)</strong>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Select an op · fire do(remove) · see exactly what breaks downstream</div>
        </div>
        <button onClick={onClose} style={iconBtn}>✕</button>
      </div>

      {/* Body: two-column split */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left: Op DAG browser */}
        <div style={{
          width: 300, flexShrink: 0, borderRight: '1px solid #334155',
          overflowY: 'auto', padding: '12px 10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ color: '#64748b', fontSize: 11 }}>CAUSAL DAG — {scm?.nodeCount ?? '…'} ops</span>
            <button onClick={loadSCM} style={{ ...chip('#1e293b'), fontSize: 10 }}>↺</button>
          </div>

          {scmLoading && <div style={{ color: '#64748b', textAlign: 'center', padding: 30 }}>Building SCM…</div>}
          {scmError  && <div style={{ color: '#f87171', padding: 10 }}>{scmError}</div>}

          {!scmLoading && !scmError && commitGroups.length === 0 && (
            <div style={{ color: '#475569', fontSize: 11, textAlign: 'center', padding: 30 }}>
              No committed ops yet. Run the engine to populate the causal graph.
            </div>
          )}

          {commitGroups.map((group, gi) => (
            <div key={group.commitId} style={{ marginBottom: 12 }}>
              <div style={{ color: '#475569', fontSize: 10, marginBottom: 4, letterSpacing: '0.05em' }}>
                SCENE {gi} · {group.commitId.slice(0, 8)}…
              </div>
              {group.nodes.map(node => {
                const isSelected = node.opId === selectedId;
                const dist = affectedSet.get(node.opId);
                const isDirect = dist === 1;
                const isTransitive = dist !== undefined && dist > 1;
                const isIntervened = report && node.opId === selectedId;

                let bg = '#1e293b';
                if (isSelected) bg = '#312e81';
                else if (isDirect) bg = '#431407';
                else if (isTransitive) bg = '#1c1008';
                else if (isIntervened) bg = '#4c1d95';

                let borderColor = '#334155';
                if (isSelected) borderColor = '#818cf8';
                else if (isDirect) borderColor = '#f97316';
                else if (isTransitive) borderColor = '#78350f';

                return (
                  <div
                    key={node.opId}
                    onClick={() => { setSelectedId(node.opId); setReport(null); setReportError(null); }}
                    style={{
                      background: bg, border: `1px solid ${borderColor}`,
                      borderRadius: 4, padding: '5px 8px', marginBottom: 4,
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ color: '#64748b', fontSize: 10 }}>{node.opIdx}</span>
                      <span style={{ color: opColor(node.op.op), fontSize: 11, fontWeight: 700 }}>{node.op.op}</span>
                      {node.parents.length > 0 && <span style={{ color: '#475569', fontSize: 9 }}>↑{node.parents.length}</span>}
                      {node.children.length > 0 && <span style={{ color: '#475569', fontSize: 9 }}>↓{node.children.length}</span>}
                      {isDirect && <span style={{ color: '#f97316', fontSize: 9, marginLeft: 'auto' }}>DIRECT</span>}
                      {isTransitive && <span style={{ color: '#92400e', fontSize: 9, marginLeft: 'auto' }}>D+{dist}</span>}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {opSummary(node.op)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right: intervention + report */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Intervention controls */}
          {selectedNode ? (
            <div style={{ background: '#1e293b', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: '#64748b', fontSize: 10, marginBottom: 3 }}>SELECTED OP</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: opColor(selectedNode.op.op), fontWeight: 700 }}>{selectedNode.op.op}</span>
                  <span style={{ color: '#475569', fontSize: 11 }}>@ {selectedNode.opId}</span>
                  {selectedNode.parents.length > 0 && (
                    <span style={{ color: '#64748b', fontSize: 11 }}>depends on {selectedNode.parents.length} op(s)</span>
                  )}
                  {selectedNode.children.length > 0 && (
                    <span style={{ color: '#64748b', fontSize: 11 }}>{selectedNode.children.length} downstream dep(s)</span>
                  )}
                </div>
                <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>{opSummary(selectedNode.op)}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => runIntervention(true)}
                  disabled={running}
                  style={{ ...chip('#7f1d1d'), color: '#fca5a5', fontWeight: 700, padding: '7px 14px' }}
                >
                  {running ? 'Running…' : 'do(remove)'}
                </button>
                <div style={{ color: '#334155', fontSize: 11, alignSelf: 'center' }}>
                  Surgically removes this op and propagates causal invalidation through the DAG
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#475569', textAlign: 'center', padding: 40, fontSize: 12 }}>
              {scm && scm.nodeCount > 0
                ? '← Select any op in the DAG to begin a causal intervention'
                : 'No ops committed yet — run the engine first'}
            </div>
          )}

          {reportError && (
            <div style={{ color: '#f87171', background: '#1e293b', borderRadius: 5, padding: 10 }}>{reportError}</div>
          )}

          {/* Counterfactual Report */}
          {report && (
            <CounterfactualReportView report={report} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Report viewer ─────────────────────────────────────────────────────────────

function CounterfactualReportView({ report }: { report: CounterfactualReport }) {
  const totalAffected = report.affectedOps.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary banner */}
      <div style={{
        background: totalAffected > 0 ? '#431407' : '#064e3b',
        border: `1px solid ${totalAffected > 0 ? '#f97316' : '#10b981'}`,
        borderRadius: 6, padding: '10px 14px',
      }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
          <Stat label="Total affected" value={String(totalAffected)} color={totalAffected > 0 ? '#f97316' : '#4ade80'} />
          <Stat label="Direct (d=1)" value={String(report.directlyAffected.length)} color="#fb923c" />
          <Stat label="Transitive (d>1)" value={String(report.transitivelyAffected.length)} color="#f59e0b" />
        </div>
        {totalAffected === 0 && (
          <div style={{ color: '#4ade80', fontSize: 12 }}>No downstream ops depend on this one — safe to remove.</div>
        )}
      </div>

      {/* Direct affected */}
      {report.directlyAffected.length > 0 && (
        <AffectedGroup
          label="Directly affected (distance = 1)"
          ops={report.directlyAffected}
          color="#f97316"
          bg="#1c0a00"
        />
      )}

      {/* Transitive */}
      {report.transitivelyAffected.length > 0 && (
        <AffectedGroup
          label="Transitively affected (distance > 1)"
          ops={report.transitivelyAffected}
          color="#f59e0b"
          bg="#1a1000"
        />
      )}

      {/* Full summary text */}
      <details style={{ background: '#1e293b', borderRadius: 5, padding: 10 }}>
        <summary style={{ color: '#64748b', fontSize: 11, cursor: 'pointer' }}>Full causal summary</summary>
        <pre style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0 0' }}>
          {report.summary}
        </pre>
      </details>
    </div>
  );
}

function AffectedGroup({ label, ops, color, bg }: { label: string; ops: AffectedOp[]; color: string; bg: string }) {
  return (
    <div>
      <div style={{ color, fontSize: 11, marginBottom: 6, fontWeight: 700 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ops.map(a => (
          <div key={a.opId} style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 4, padding: '6px 10px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
              <span style={{ color: opColor(a.originalOp.op), fontWeight: 700, fontSize: 12 }}>{a.originalOp.op}</span>
              <span style={{ color: '#475569', fontSize: 10 }}>@ {a.opId}</span>
              <span style={{ color, fontSize: 10, marginLeft: 'auto' }}>d={a.distance}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>{a.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ color: '#64748b', fontSize: 10 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function opColor(opKind: string): string {
  if (opKind === 'ADD_FACT' || opKind === 'EXPIRE_FACT') return '#60a5fa';
  if (opKind === 'UPDATE_BELIEF') return '#a78bfa';
  if (opKind === 'APPRAISE_EMOTION') return '#f472b6';
  if (opKind === 'SHIFT_RELATIONSHIP') return '#34d399';
  if (opKind === 'SEED_CLUE' || opKind === 'TRIGGER_PAYOFF') return '#fbbf24';
  if (opKind === 'RECORD_VISUAL_FACT' || opKind === 'RECORD_SONIC_FACT') return '#fb923c';
  if (opKind === 'RAISE_CLOCK' || opKind === 'EXPIRE_CLOCK') return '#f87171';
  return '#94a3b8';
}

function opSummary(op: { op: string; [k: string]: unknown }): string {
  const k = op.op;
  if (k === 'UPDATE_BELIEF') {
    const b = op.belief as { proposition?: string } | undefined;
    const c = op.charId as string | undefined;
    return `${c ?? '?'}: "${(b?.proposition ?? '').slice(0, 40)}"`;
  }
  if (k === 'ADD_FACT') {
    const f = op.fact as { subject?: string; predicate?: string; object?: string } | undefined;
    return `${f?.subject ?? '?'} ${f?.predicate ?? '?'} ${f?.object ?? '?'}`;
  }
  if (k === 'APPRAISE_EMOTION') {
    const e = op.emotion as { dominant?: string; intensity?: number } | undefined;
    return `${op.charId as string ?? '?'} → ${e?.dominant ?? '?'} (${e?.intensity ?? '?'})`;
  }
  if (k === 'SHIFT_RELATIONSHIP') {
    const pair = op.pair as [string, string] | undefined;
    const d = op.delta as { reason?: string } | undefined;
    return `${pair?.[0] ?? '?'} ↔ ${pair?.[1] ?? '?'}: ${(d?.reason ?? '').slice(0, 30)}`;
  }
  if (k === 'SEED_CLUE') return `clue: ${op.clueId as string ?? '?'} (${op.carrier as string ?? '?'})`;
  if (k === 'RAISE_CLOCK') return `clock: ${op.clockId as string ?? '?'} +${op.amount as number ?? '?'}`;
  if (k === 'RECORD_VISUAL_FACT') return `visual: ${(op.fact as string ?? '').slice(0, 40)}`;
  return JSON.stringify(op).slice(0, 50);
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16,
};

function chip(bg: string): React.CSSProperties {
  return {
    background: bg, border: '1px solid #334155', borderRadius: 4,
    color: '#e2e8f0', padding: '3px 8px', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 11,
  };
}
