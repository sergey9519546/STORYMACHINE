// ConvergePanel — AlphaZero-for-drama search UI.
// Wave 85 (H8): Uses SSE streaming so each candidate result appears live as the
// convergence loop evaluates it — no more "Searching…" spinner until completion.
// Wave SELECT: turns the closed optimizer into a writer-in-the-loop tool. On
// completion the panel renders a CANDIDATE BOARD (every candidate the loop
// considered, not just the winner), a "why it won" strip derived from the
// actual scores, the Writers' Room transcript (previously computed and
// thrown away), and a commit pen so the writer — not the optimizer — decides
// what becomes canon. All new server fields are optional-tolerant: against
// an old server response (missing winner/candidates/roomTranscript) the
// panel degrades to the pre-SELECT behavior with no crash.

import React, { useState, useRef, useEffect } from 'react';
import type { StoryOp } from '../../server/nvm/ops/StoryOp.ts';
import type { NarrativeTransitionIR } from '../../server/nvm/ir/NarrativeTransitionIR.ts';
import type { Critique } from '../../server/nvm/room/room.ts';
import { withSession } from '../lib/session.ts';

interface ConvergeStep {
  iteration: number;
  candidateId: string;
  passed: boolean;
  valuationScore: number;
  qualityScore: number;
  compositeScore: number;
  ghostReason?: string;
  writersRoomSummary?: string;
  operator?: string;
}

// The IR carried by a candidate/winner may be partial depending on server
// version — every field is read defensively below.
type CandidateIR = Partial<NarrativeTransitionIR> & { ops?: StoryOp[] };

type CandidateSource = 'llm' | 'mutation' | 'seed';
type CandidateStatus = 'winner' | 'pass' | 'ghost';

interface CandidateResult {
  candidateId: string;
  iteration: number;
  source: CandidateSource;
  status: CandidateStatus;
  ghostReason?: string;
  composite: number;
  tension: number;
  quality: number;
  tier1Failures: string[];
  tier2Flags: string[];
  ir: CandidateIR;
}

interface WinnerSummary {
  candidateId: string;
  ir: CandidateIR;
  composite: number;
  tension: number;
  quality: number;
}

// roomTranscript entries are the room's own Critique records (server/nvm/room/room.ts):
// { criticId, severity, targetOpIdx, objection, suggestedOperator, attentionBid }.
// "Stance" isn't a literal field — it's derived below from severity so the writer
// gets a plain-language read without the panel inventing data that isn't there.
type RoomTranscriptEntry = Critique;

interface ConvergeResult {
  converged: boolean;
  iterations: number;
  finalValuation: number;
  finalQuality: number;
  finalComposite: number;
  ghostCount: number;
  history: ConvergeStep[];
  // SELECT fields — absent on an old server.
  winner?: WinnerSummary | null;
  candidates?: CandidateResult[];
  roomTranscript?: RoomTranscriptEntry[];
}

interface ConvPanelProps {
  onClose: () => void;
  // Optional refresh hook, matching the (currently unwired) onInjected
  // convention already established by DirectorCutPanel — a caller may listen
  // for newly-minted commits without this panel depending on it. The visible
  // per-card "committed" state below is the primary, always-on feedback.
  onCommitted?: (commitId: string) => void;
}

const SCENE_FUNCTIONS = [
  'advance_plot', 'reveal_character', 'build_tension',
  'provide_relief', 'set_up_payoff', 'establish_world',
] as const;

// ── Op summary formatting ──────────────────────────────────────────────────
// Every StoryOp kind gets a one-line, human-readable arg summary for the
// candidate board's ops list. Defensive against partially-shaped ops (optional
// chaining throughout) so a slightly-off server payload can't crash the panel.
function summarizeOp(raw: unknown): { kind: string; detail: string } {
  const op = (raw ?? {}) as Partial<StoryOp> & { op?: string };
  const kind = op.op ?? 'UNKNOWN';
  switch (kind) {
    case 'ADD_FACT': {
      const o = op as Extract<StoryOp, { op: 'ADD_FACT' }>;
      return { kind, detail: o.fact ? `${o.fact.subject} ${o.fact.predicate} ${o.fact.object}` : '—' };
    }
    case 'EXPIRE_FACT': {
      const o = op as Extract<StoryOp, { op: 'EXPIRE_FACT' }>;
      return { kind, detail: `${o.factId ?? '—'} @ turn ${o.atTurn ?? '—'}` };
    }
    case 'UPDATE_BELIEF': {
      const o = op as Extract<StoryOp, { op: 'UPDATE_BELIEF' }>;
      return { kind, detail: `${o.charId ?? '—'}: "${o.belief?.proposition ?? '—'}" (conf ${o.belief?.confidence ?? '—'})` };
    }
    case 'APPRAISE_EMOTION': {
      const o = op as Extract<StoryOp, { op: 'APPRAISE_EMOTION' }>;
      return { kind, detail: `${o.charId ?? '—'}: ${o.emotion?.dominant ?? '—'} (intensity ${o.emotion?.intensity ?? '—'})` };
    }
    case 'SHIFT_RELATIONSHIP': {
      const o = op as Extract<StoryOp, { op: 'SHIFT_RELATIONSHIP' }>;
      const [a, b] = o.pair ?? ['?', '?'];
      const amt = o.delta?.amount ?? 0;
      return { kind, detail: `${a} ↔ ${b} ${o.delta?.dimension ?? '—'} ${amt >= 0 ? '+' : ''}${amt}` };
    }
    case 'ADVANCE_OBJECT_ARC': {
      const o = op as Extract<StoryOp, { op: 'ADVANCE_OBJECT_ARC' }>;
      return { kind, detail: `${o.objectId ?? '—'} → ${o.toState ?? '—'}` };
    }
    case 'TRIGGER_RULE': {
      const o = op as Extract<StoryOp, { op: 'TRIGGER_RULE' }>;
      return { kind, detail: `${o.mechanismId ?? '—'} / ${o.ruleId ?? '—'}` };
    }
    case 'SEED_CLUE': {
      const o = op as Extract<StoryOp, { op: 'SEED_CLUE' }>;
      return { kind, detail: `${o.clueId ?? '—'} via ${o.carrier ?? '—'}` };
    }
    case 'PAYOFF_SETUP': {
      const o = op as Extract<StoryOp, { op: 'PAYOFF_SETUP' }>;
      return { kind, detail: `${o.setupId ?? '—'} → ${o.payoffEventId ?? '—'}` };
    }
    case 'RAISE_CLOCK': {
      const o = op as Extract<StoryOp, { op: 'RAISE_CLOCK' }>;
      return { kind, detail: `${o.clockId ?? '—'} +${o.amount ?? '—'}` };
    }
    case 'ADVANCE_THEME_ARGUMENT': {
      const o = op as Extract<StoryOp, { op: 'ADVANCE_THEME_ARGUMENT' }>;
      return { kind, detail: `${o.claimId ?? '—'}: ${o.move ?? '—'}` };
    }
    case 'UPDATE_READER_STATE': {
      const o = op as Extract<StoryOp, { op: 'UPDATE_READER_STATE' }>;
      const d = o.delta ?? {};
      const parts = [
        d.suspense !== undefined ? `suspense ${d.suspense >= 0 ? '+' : ''}${d.suspense}` : null,
        d.curiosity !== undefined ? `curiosity ${d.curiosity >= 0 ? '+' : ''}${d.curiosity}` : null,
        d.investment !== undefined ? `investment ${d.investment >= 0 ? '+' : ''}${d.investment}` : null,
        d.knownFact ? `knows: ${d.knownFact}` : null,
      ].filter((p): p is string => p !== null);
      return { kind, detail: parts.length > 0 ? parts.join(', ') : '—' };
    }
    case 'RECORD_VISUAL_FACT': {
      const o = op as Extract<StoryOp, { op: 'RECORD_VISUAL_FACT' }>;
      return { kind, detail: `scene ${o.sceneId ?? '—'}: ${o.fact ?? '—'}` };
    }
    case 'RECORD_SONIC_FACT': {
      const o = op as Extract<StoryOp, { op: 'RECORD_SONIC_FACT' }>;
      return { kind, detail: `scene ${o.sceneId ?? '—'}: ${o.fact ?? '—'}` };
    }
    default:
      return { kind: String(kind), detail: '—' };
  }
}

// ── Writers' Room critic display ───────────────────────────────────────────
const CRITIC_LABELS: Record<string, string> = {
  showrunner: 'Showrunner',
  skeptic: 'Skeptic',
  continuity: 'Continuity',
  character_advocate: 'Character Advocate',
  studio_note: 'Studio Note',
  dramaturge: 'Dramaturge',
};

function criticName(entry: RoomTranscriptEntry): string {
  const raw = entry.criticId ?? 'critic';
  return CRITIC_LABELS[raw] ?? raw.replace(/_/g, ' ');
}

// Severity (0-100) is the only signal the Writers' Room gives on how strongly a
// critic objects — bucketed into a plain-language stance rather than showing a
// bare number, without inventing a category the data doesn't support.
function criticStance(entry: RoomTranscriptEntry): string {
  if (entry.severity >= 70) return 'strong objection';
  if (entry.severity >= 40) return 'concern';
  if (entry.severity > 0) return 'minor note';
  return 'no objection';
}

// ── "Why it won" — derived strictly from the data on hand, no invention ────
function deriveWhyItWon(winner: WinnerSummary, candidates: CandidateResult[]): string {
  const passing = candidates.filter(c => c.status === 'winner' || c.status === 'pass');
  const ghostCount = candidates.filter(c => c.status === 'ghost').length;
  const n = Math.max(passing.length, 1);
  const plural = n === 1 ? 'candidate' : 'candidates';
  const ghostSuffix = ghostCount > 0
    ? ` (${ghostCount} ghost${ghostCount === 1 ? '' : 's'} excluded for failed proof)`
    : '';

  const composites = passing.map(c => c.composite);
  const maxComposite = composites.length > 0 ? Math.max(...composites) : winner.composite;
  const tiedAtMax = passing.filter(c => c.composite === maxComposite);

  if (tiedAtMax.length <= 1) {
    return `Highest composite ${winner.composite.toFixed(1)} among ${n} proof-passing ${plural}${ghostSuffix}.`;
  }

  // Multiple candidates tied on composite — look for a deterministic secondary
  // differentiator actually present in the scores rather than guessing at one.
  const others = tiedAtMax.filter(c => c.candidateId !== winner.candidateId);
  if (others.length > 0 && others.every(c => c.quality < winner.quality)) {
    return `Tied composite ${winner.composite.toFixed(1)} with ${others.length} other proof-passing ${others.length === 1 ? 'candidate' : 'candidates'}; won on higher quality (${winner.quality.toFixed(1)})${ghostSuffix}.`;
  }
  if (others.length > 0 && others.every(c => c.tension < winner.tension)) {
    return `Tied composite ${winner.composite.toFixed(1)} with ${others.length} other proof-passing ${others.length === 1 ? 'candidate' : 'candidates'}; won on higher tension (${winner.tension.toFixed(1)})${ghostSuffix}.`;
  }
  return `Tied composite ${winner.composite.toFixed(1)} among ${tiedAtMax.length} proof-passing candidates${ghostSuffix}; selected by the loop's internal tiebreak.`;
}

function isTier1Passing(c: CandidateResult): boolean {
  return c.status !== 'ghost' && c.tier1Failures.length === 0;
}

function statusChipColor(status: CandidateStatus): string {
  if (status === 'winner') return '#facc15';
  if (status === 'pass') return '#4ade80';
  return '#fb923c';
}

function sourceColor(source: CandidateSource): string {
  if (source === 'llm') return '#60a5fa';
  if (source === 'mutation') return '#a78bfa';
  return '#94a3b8';
}

// One commit attempt's lifecycle, keyed per candidateId so many cards can be
// mid-flight independently without clobbering each other's state.
type CommitPhase =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'committed'; commitId: string }
  | { phase: 'conflict'; error: string; failures: string[] }
  | { phase: 'error'; message: string };

export function ConvergePanel({ onClose, onCommitted }: ConvPanelProps) {
  const [sceneIdx, setSceneIdx]       = useState(0);
  const [sceneFunc, setSceneFunc]     = useState<string>('build_tension');
  const [tensionTarget, setTension]   = useState(60);
  const [qualityTarget, setQuality]   = useState(60);
  const [maxIter, setMaxIter]         = useState(4);
  const [running, setRunning]         = useState(false);
  const [liveSteps, setLiveSteps]     = useState<ConvergeStep[]>([]);
  const [result, setResult]           = useState<ConvergeResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [commitStates, setCommitStates] = useState<Record<string, CommitPhase>>({});
  const esRef = useRef<EventSource | null>(null);

  // Clean up SSE connection on unmount
  useEffect(() => () => { esRef.current?.close(); }, []);

  function run() {
    if (running) return;
    esRef.current?.close();
    setRunning(true);
    setError(null);
    setResult(null);
    setLiveSteps([]);
    setCommitStates({});

    const params = new URLSearchParams({
      sceneIdx: String(sceneIdx),
      sceneFunction: sceneFunc,
      tensionTarget: String(tensionTarget),
      qualityTarget: String(qualityTarget),
      maxIterations: String(maxIter),
      candidatesPerIteration: '2',
    });

    const es = new EventSource(withSession(`/api/nvm/converge-stream?${params}`));
    esRef.current = es;

    // Local to this run() invocation — not a stale closure like `running`,
    // which is always false here (the button is disabled while running).
    let finished = false;

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'converge_step') {
          setLiveSteps(prev => [...prev, data.step as ConvergeStep]);
        } else if (data.type === 'converge_complete') {
          finished = true;
          setResult(data.result as ConvergeResult);
          setRunning(false);
          es.close();
        } else if (data.type === 'converge_error') {
          finished = true;
          setError(data.error ?? 'Unknown error');
          setRunning(false);
          es.close();
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      if (!finished) setError('Connection lost — try again');
      finished = true;
      setRunning(false);
      es.close();
    };
  }

  // THE COMMIT PEN — commits a single candidate's ops as-is. 409 means the
  // story state moved underneath this candidate since convergence ran; the
  // failures are shown honestly and a re-run is offered rather than retrying
  // blindly against a candidate that no longer proves.
  async function commitCandidate(candidate: CandidateResult) {
    const id = candidate.candidateId;
    setCommitStates(s => ({ ...s, [id]: { phase: 'loading' } }));
    try {
      const res = await fetch('/api/nvm/converge/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ops: candidate.ir?.ops ?? [],
          // MechanismProof/CausalProof (server/nvm/proof/tier1/{mechanism,causal}.ts)
          // block unconditionally on an empty activeMechanisms/preconditions for any
          // non-initial scene with ops — these are the candidate's own declared IR
          // fields (already computed by the loop), not something this panel invents.
          sceneIdx: candidate.ir?.sceneIdx,
          activeMechanisms: candidate.ir?.activeMechanisms,
          preconditions: candidate.ir?.preconditions,
          summary: `SELECT commit — candidate ${id} (${candidate.source}, composite ${candidate.composite.toFixed(1)})`,
        }),
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({} as { error?: string; failures?: string[] }));
        setCommitStates(s => ({
          ...s,
          [id]: {
            phase: 'conflict',
            error: data.error ?? 'The story state moved — this candidate no longer proves.',
            failures: Array.isArray(data.failures) ? data.failures : [],
          },
        }));
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setCommitStates(s => ({ ...s, [id]: { phase: 'error', message: text || `Commit failed (${res.status})` } }));
        return;
      }
      const data = await res.json() as { commitId: string };
      setCommitStates(s => ({ ...s, [id]: { phase: 'committed', commitId: data.commitId } }));
      onCommitted?.(data.commitId);
    } catch (e) {
      setCommitStates(s => ({ ...s, [id]: { phase: 'error', message: e instanceof Error ? e.message : 'Network error' } }));
    }
  }

  // Derive steps to display: live steps while running, history from result when done
  const displaySteps = result ? result.history : liveSteps;

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
        <td style={{ padding: '4px 8px', color: '#34d399', fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {step.operator ? step.operator.replace(/_/g, ' ') : '—'}
        </td>
        <td style={{ padding: '4px 8px', color: '#64748b', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {step.writersRoomSummary ?? '—'}
        </td>
      </tr>
    );
  };

  const candidateCard = (candidate: CandidateResult) => {
    const isWinner = candidate.status === 'winner';
    const eligible = isTier1Passing(candidate);
    const commitState = commitStates[candidate.candidateId] ?? { phase: 'idle' as const };
    const ops = candidate.ir?.ops ?? [];

    return (
      <div key={candidate.candidateId} style={{
        background: isWinner ? '#1c1917' : '#111827',
        border: isWinner ? '2px solid #facc15' : '1px solid #334155',
        borderRadius: 8, padding: 12,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {/* Header: status chip, source, iteration */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: statusChipColor(candidate.status), fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>
            {candidate.status.toUpperCase()}
          </span>
          <span style={{ color: '#64748b', fontSize: 11 }}>
            iter {candidate.iteration} · <span style={{ color: sourceColor(candidate.source) }}>{candidate.source}</span>
          </span>
        </div>
        <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace' }}>{candidate.candidateId}</div>

        {/* Scores */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ color: '#f9a8d4', fontSize: 22, fontWeight: 700 }}>{candidate.composite.toFixed(1)}</span>
          <span style={{ color: '#60a5fa', fontSize: 11 }}>tension {candidate.tension.toFixed(1)}</span>
          <span style={{ color: '#a78bfa', fontSize: 11 }}>quality {candidate.quality.toFixed(1)}</span>
        </div>

        {/* Why it won — winner card only */}
        {isWinner && result?.winner && (
          <div style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid #facc15', borderRadius: 4, padding: 8, color: '#fde68a', fontSize: 11 }}>
            {deriveWhyItWon(result.winner, result.candidates ?? [])}
          </div>
        )}

        {/* Ghost reason / tier failures */}
        {candidate.ghostReason && (
          <div style={{ color: '#fb923c', fontSize: 11 }}>Ghost: {candidate.ghostReason.replace(/_/g, ' ')}</div>
        )}
        {candidate.tier1Failures.length > 0 && (
          <div style={{ color: '#f87171', fontSize: 11 }}>
            <div style={{ fontWeight: 600 }}>Tier-1 failures:</div>
            <ul style={{ margin: '2px 0 0', paddingLeft: 16 }}>
              {candidate.tier1Failures.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
        {candidate.tier2Flags.length > 0 && (
          <div style={{ color: '#fbbf24', fontSize: 11 }}>
            <div style={{ fontWeight: 600 }}>Tier-2 flags:</div>
            <ul style={{ margin: '2px 0 0', paddingLeft: 16 }}>
              {candidate.tier2Flags.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}

        {/* Ops summary */}
        {ops.length > 0 && (
          <div style={{ maxHeight: 140, overflowY: 'auto', background: '#0b1220', borderRadius: 4, padding: 6 }}>
            {ops.map((op, i) => {
              const { kind, detail } = summarizeOp(op);
              return (
                <div key={i} style={{ fontSize: 10.5, color: '#94a3b8', padding: '2px 0' }}>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>{kind}</span>{' '}
                  <span>{detail}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* THE COMMIT PEN */}
        {eligible ? (
          <div>
            {commitState.phase === 'idle' && (
              <button onClick={() => commitCandidate(candidate)} style={{
                width: '100%', padding: '6px 0', background: '#1d4ed8', color: '#fff',
                border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12,
              }}>
                Commit this candidate
              </button>
            )}
            {commitState.phase === 'loading' && (
              <button disabled style={{
                width: '100%', padding: '6px 0', background: '#334155', color: '#fff',
                border: 'none', borderRadius: 4, fontFamily: 'monospace', fontSize: 12,
              }}>
                Committing…
              </button>
            )}
            {commitState.phase === 'committed' && (
              <div style={{ background: '#14532d', border: '1px solid #4ade80', borderRadius: 4, padding: 6, color: '#4ade80', fontSize: 11 }}>
                Committed — id {commitState.commitId}
              </div>
            )}
            {commitState.phase === 'conflict' && (
              <div style={{ background: '#450a0a', border: '1px solid #f87171', borderRadius: 4, padding: 8 }}>
                <div style={{ color: '#f87171', fontSize: 11, fontWeight: 600 }}>{commitState.error}</div>
                {commitState.failures.length > 0 && (
                  <ul style={{ color: '#fca5a5', fontSize: 10.5, margin: '4px 0 0', paddingLeft: 16 }}>
                    {commitState.failures.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
                <button onClick={run} style={{
                  marginTop: 6, padding: '4px 8px', background: '#1d4ed8', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11,
                }}>
                  Re-run search
                </button>
              </div>
            )}
            {commitState.phase === 'error' && (
              <div style={{ background: '#450a0a', border: '1px solid #f87171', borderRadius: 4, padding: 8 }}>
                <div style={{ color: '#fca5a5', fontSize: 11 }}>{commitState.message}</div>
                <button onClick={() => commitCandidate(candidate)} style={{
                  marginTop: 6, padding: '4px 8px', background: '#1d4ed8', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11,
                }}>
                  Retry
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 10.5, fontStyle: 'italic' }}>
            Not proof-passing — no commit available.
          </div>
        )}
      </div>
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
        {running
          ? `Searching… (iter ${liveSteps.length > 0 ? liveSteps[liveSteps.length - 1].iteration + 1 : 1}/${maxIter})`
          : 'Run Convergence Search'}
      </button>

      {error && <div style={{ color: '#f87171', marginBottom: 12 }}>{error}</div>}

      {/* Live step table — shown while running and after completion */}
      {displaySteps.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: result ? 0 : 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '4px 8px' }}>iter</th>
                <th style={{ padding: '4px 8px' }}>status</th>
                <th style={{ padding: '4px 8px' }}>tension</th>
                <th style={{ padding: '4px 8px' }}>quality</th>
                <th style={{ padding: '4px 8px' }}>composite</th>
                <th style={{ padding: '4px 8px' }}>operator</th>
                <th style={{ padding: '4px 8px' }}>writers' room</th>
              </tr>
            </thead>
            <tbody>{displaySteps.map((s, i) => row(s, i))}</tbody>
          </table>
        </div>
      )}

      {result && (
        <div style={{
          background: result.converged ? '#14532d' : '#7c2d12',
          borderRadius: 6, padding: '8px 14px', marginTop: 14,
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
      )}

      {/* CANDIDATE BOARD — every candidate the loop considered, writer holds the pen */}
      {result && result.candidates && result.candidates.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Candidate Board</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {result.candidates.map(candidateCard)}
          </div>
        </div>
      )}

      {/* Writers' Room transcript — surfacing data that was previously thrown away.
          Sorted by severity so the loudest objections read first, matching the
          room's own transcript ordering (server/nvm/room/room.ts). */}
      {result && result.roomTranscript && result.roomTranscript.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Writers' Room</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...result.roomTranscript].sort((a, b) => b.severity - a.severity).map((entry, i) => (
              <div key={i} style={{ background: '#111827', border: '1px solid #334155', borderRadius: 6, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {criticName(entry)}
                  </span>
                  <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>
                    {criticStance(entry)} (severity {entry.severity})
                    {entry.targetOpIdx !== null && ` · op${entry.targetOpIdx}`}
                  </span>
                </div>
                <div style={{ color: '#cbd5e1', fontSize: 12, whiteSpace: 'pre-wrap' }}>{entry.objection}</div>
                {entry.suggestedOperator && (
                  <div style={{ color: '#34d399', fontSize: 10.5, marginTop: 4 }}>
                    → suggests: {entry.suggestedOperator.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            ))}
          </div>
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
