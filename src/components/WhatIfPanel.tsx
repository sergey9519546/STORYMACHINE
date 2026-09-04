// What-If Lab — Writer Cockpit feature: pick a story decision, flip it via the
// SCM do()-calculus, see alternate futures through an experimental composite
// ranking with Tier-1 checks included,
// and adopt one straight into canon. Underneath, the original "Roads not
// taken" ghost-commit browser lives on unchanged: every candidate the
// Convergence Loop rejected, ready to be branched into.
//
// Lab section: fetches the same causal-model snapshot CausalTwinPanel uses
// (GET /api/nvm/twin/scm), lets the writer pick an intervention target in
// plain language, and POSTs to /api/nvm/whatif/explore (a route landing in
// parallel — this panel feature-detects its absence and 404s gracefully).
// Adopting a branch reuses the exact same commit path ("commitOpsToStory",
// see below) that the ghost flow already established: POST ops to
// /api/nvm/converge/commit, same two-step confirmation, same 409 handling.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { StoryOp } from '../../server/nvm/ops/StoryOp.ts';
import type { CoverageVerdict } from '../../server/nvm/analyze/types.ts';
import { useModalFocusTrap } from '../lib/use-modal-focus-trap.ts';
import {
  GitBranch, Eye, Zap, X, Check, AlertTriangle, FlaskConical, Play, Ban, Link2, Clock3,
  Stethoscope, FileDown,
} from 'lucide-react';

interface GhostCommit {
  ghostId: string;
  parentCommitId: string | null;
  sceneIdx: number;
  reason: string;
  rejectedAt: number;
  ir: {
    transitionId?: string;
    sceneFunction?: string;
    ops?: Array<{ op: string }>;
    // MechanismProof/CausalProof (server/nvm/proof/tier1/{mechanism,causal}.ts)
    // block unconditionally on an empty activeMechanisms/preconditions for any
    // non-initial scene with ops, so these must ride along into a commit —
    // they're the scene's own declared metadata, not something to invent here.
    activeMechanisms?: string[];
    preconditions?: string[];
  };
  // Present when this ghost came out of the SELECT convergence loop (older
  // ghosts, e.g. from manual injection paths, may not carry scores).
  composite?: number;
  tension?: number;
  quality?: number;
}

interface InterventionResult {
  intervention: { opId: string; replacement: unknown };
  affectedOps: Array<{ opId: string; originalOp: { op: string }; reason: string; distance: number }>;
  summary: string;
}

interface BranchResponse {
  ghostId: string;
  branchedOps: unknown[];
  sceneIdx: number;
}

// Per-ghost "road not taken" flow: branch first (fetches the server's
// replayable ops for this ghost), then optionally commit those ops into the
// story as a real StoryCommit. Kept per-ghostId so many rows can be mid-flow
// independently.
interface GhostFlowState {
  branching?: boolean;
  branchError?: string;
  branchedOps?: unknown[];
  branchSceneIdx?: number;
  confirming?: boolean;
  committing?: boolean;
  committed?: { commitId: string };
  conflict?: { error: string; failures: string[] };
  commitError?: string;
}

// ── Lab types ────────────────────────────────────────────────────────────────
// SCMNodeSummary/SCMData mirror the shapes CausalTwinPanel already fetches
// from GET /api/nvm/twin/scm — the Lab's intervention picker is built from
// the same causal graph, just grouped into plain-language buckets.
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

// A compact story snapshot as returned by the explore endpoint for the
// baseline-vs-intervened strip. The server contract for this shape isn't
// pinned down yet (it's landing in parallel), so every field is optional and
// read defensively — the card renders whatever is actually present.
interface WhatIfSnapshot {
  summary?: string;
  sceneIdx?: number;
  tension?: number;
  quality?: number;
  composite?: number;
  [k: string]: unknown;
}

interface WhatIfConsequence {
  kind: string;
  description: string;
  severity?: number | string;
}

interface WhatIfBranch {
  branchId: string;
  ops: StoryOp[];
  summary: string;
  scores: { tension: number; quality: number; composite: number };
  // Optional passthrough fields a future server revision may add. Not in the
  // v1 contract, but read defensively so an older/newer payload can't crash
  // the adopt flow — and so that, if the server DOES start sending these,
  // the commit re-proves cleanly instead of falling back to sceneIdx=state.turn
  // and empty activeMechanisms/preconditions (which fails Tier-1 proof for any
  // non-trivial scene — see the comment on commitOpsToStory below).
  sceneIdx?: number;
  activeMechanisms?: string[];
  preconditions?: string[];
}

interface WhatIfExploreResult {
  baseline: WhatIfSnapshot;
  intervened: WhatIfSnapshot;
  consequences: WhatIfConsequence[];
  branches: WhatIfBranch[];
}

// ── Script Doctor readout types (POST /api/nvm/whatif/doctor) ────────────────
// The Lab's second question: not "what breaks?" but "is the resulting SCRIPT
// any good?". The server materialises each branch as a real Fountain draft
// (server/nvm/whatif/materialize.ts, deterministic, no LLM) and runs the same
// pooled Script Doctor POST /api/scriptide/doctor uses, so these numbers are
// the doctor's own — nothing here re-derives or re-weights a score.
//
// health/grade/verdict are OPTIONAL because the route withholds them for any
// variant it could not analyze whole (the same isWholeDraftAnalysisComplete
// predicate the editor's own surfaces use), and formatUnrecognized marks the
// one case it never even runs the doctor on: a projected draft with no scenes.
interface WhatIfDoctorDraft {
  fountain: string;
  formatUnrecognized?: boolean;
  analysisComplete?: boolean;
  sceneCount?: number;
  analyzedAt?: number;
  health?: number;
  grade?: string;
  verdict?: CoverageVerdict;
  // 2026-09-04 review (REVISE item 5) — the same calibration reference-set
  // percentile every other scored surface shows, gated by the server on the
  // same "complete" flag health/grade/verdict already use
  // (server/routes/nvm/twin-whatif.ts's presentReport).
  healthPercentile?: number;
  // Descriptive document aggregates — NEVER part of health. Same two channels,
  // same wording, as ScriptDoctorPanel's "Shape & Rhythm" section.
  meanAbsDialogueShareDelta?: number;
  actionSentenceCvOverall?: number;
}

interface WhatIfBranchDoctor extends WhatIfDoctorDraft {
  branchId: string;
  summary: string;
  /** This branch's health minus the base draft's. Absent unless BOTH sides
   *  were analyzed whole — never a delta against a withheld score. */
  healthDelta?: number;
}

interface WhatIfDoctorResult {
  base: WhatIfDoctorDraft;
  intervened: string;
  consequences: WhatIfConsequence[];
  branches: WhatIfBranchDoctor[];
}

// Per-branch promote flow — two-step confirm like the adopt flow above, but a
// promote writes SCRIPT TEXT into the editor rather than ops into canon, so it
// is deliberately a separate control with its own confirmation copy.
interface PromoteFlowState {
  confirming?: boolean;
  promoted?: boolean;
}

// Per-branch adopt flow — same shape as GhostFlowState's commit half, keyed
// by branchId instead of ghostId so Lab cards and ghost rows never collide.
interface LabFlowState {
  confirming?: boolean;
  committing?: boolean;
  committed?: { commitId: string };
  conflict?: { error: string; failures: string[] };
  commitError?: string;
}

interface WhatIfPanelProps {
  onClose: () => void;
  // Optional refresh hook — mirrors DirectorCutPanel's (currently unwired)
  // onInjected prop. The per-row "committed" state is the primary feedback.
  onCommitted?: (commitId: string) => void;
  /** "Promote this branch": hands the branch's materialised Fountain (plus the
   *  doctor numbers measured against that exact text) up to the editor, which
   *  snapshots the current draft first and then saves the promoted text as its
   *  own snapshot. Absent when no editor is mounted behind this panel, in
   *  which case the promote control is not rendered at all rather than
   *  rendered as a dead button. */
  onPromoteToEditor?: (promotion: BranchPromotion) => void;
}

/** Everything the editor needs to save a promoted branch as a scored snapshot.
 *  The score fields mirror SnapshotManager.tsx's `Snapshot` exactly and are all
 *  optional for the same reason they are optional there: they are attached only
 *  when a real report existed for THIS text, and are never fabricated. */
export interface BranchPromotion {
  branchId: string;
  /** Short human label — becomes the snapshot name. */
  label: string;
  /** The branch's materialised Fountain draft. */
  text: string;
  health?: number;
  verdict?: CoverageVerdict;
  sceneCount?: number;
  analyzedAt?: number;
  // 2026-09-04 review (REVISE item 5) — carried through so a promoted
  // snapshot is not the one row in Versions that can never show a
  // percentile; same optional/never-fabricated contract as every other
  // field here.
  healthPercentile?: number;
  meanAbsDialogueShareDelta?: number;
  actionSentenceCvOverall?: number;
}

// ── Intervention-target vocabulary ───────────────────────────────────────────
// Buckets ops into the plain-language groups a writer actually thinks in.
// "other" catches every op kind not covered by the three named buckets so a
// future StoryOp addition degrades to a visible-but-unlabeled bucket instead
// of silently disappearing from the picker.
type InterventionBucketKey = 'facts' | 'relationships' | 'clocks' | 'other';

function interventionBucket(opKind: string): InterventionBucketKey {
  if (opKind === 'ADD_FACT' || opKind === 'EXPIRE_FACT' || opKind === 'RECORD_VISUAL_FACT' || opKind === 'RECORD_SONIC_FACT') return 'facts';
  if (opKind === 'SHIFT_RELATIONSHIP') return 'relationships';
  if (opKind === 'RAISE_CLOCK' || opKind === 'TRIGGER_RULE' || opKind === 'SEED_CLUE' || opKind === 'PAYOFF_SETUP') return 'clocks';
  return 'other';
}

// One-line plain-language label for an interventionable op — this is the text
// on the picker button, so it favors "negate: X" / "flip: X" / "remove: X"
// phrasing over the raw op-kind names CausalTwinPanel uses for its DAG rows.
function describeInterventionTarget(node: SCMNodeSummary): string {
  const op = node.op;
  switch (op.op) {
    case 'ADD_FACT': {
      const f = op.fact as { subject?: string; predicate?: string; object?: string } | undefined;
      return `negate: ${f?.subject ?? '?'} ${f?.predicate ?? '?'} ${f?.object ?? '?'}`;
    }
    case 'EXPIRE_FACT':
      return `negate: expiry of ${(op.factId as string) ?? '?'}`;
    case 'RECORD_VISUAL_FACT':
    case 'RECORD_SONIC_FACT':
      return `negate: ${((op.fact as string) ?? '?').slice(0, 40)}`;
    case 'SHIFT_RELATIONSHIP': {
      const pair = op.pair as [string, string] | undefined;
      const d = op.delta as { dimension?: string } | undefined;
      return `flip: ${pair?.[0] ?? '?'} ↔ ${pair?.[1] ?? '?'}${d?.dimension ? ` (${d.dimension})` : ''}`;
    }
    case 'RAISE_CLOCK':
      return `remove: clock ${(op.clockId as string) ?? '?'} +${(op.amount as number) ?? '?'}`;
    case 'TRIGGER_RULE':
      return `remove: rule ${(op.ruleId as string) ?? '?'}`;
    case 'SEED_CLUE':
      return `remove: clue ${(op.clueId as string) ?? '?'}`;
    case 'PAYOFF_SETUP':
      return `remove: setup → ${(op.payoffEventId as string) ?? '?'}`;
    case 'UPDATE_BELIEF': {
      const b = op.belief as { proposition?: string } | undefined;
      return `${(op.charId as string) ?? '?'}: "${(b?.proposition ?? '').slice(0, 30)}"`;
    }
    case 'APPRAISE_EMOTION': {
      const e = op.emotion as { dominant?: string } | undefined;
      return `${(op.charId as string) ?? '?'} → ${e?.dominant ?? '?'}`;
    }
    default:
      return `${op.op} @ op ${node.opIdx}`;
  }
}

// Copied (not imported) from ConvergePanel.tsx's summarizeOp — that function
// isn't exported there and this file may only be touched here, so the small
// per-op-kind formatter is duplicated rather than reaching into a sibling
// panel's module internals. Keep in sync manually if StoryOp grows a kind.
function summarizeLabOp(raw: unknown): { kind: string; detail: string } {
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

// Severity may arrive as a 0-100 number (matching the Writers' Room critique
// convention in ConvergePanel's criticStance) or as a string bucket. Tint
// tolerantly either way; unknown/absent severity renders neutral rather than
// guessing at a color that implies a signal the data doesn't carry.
function consequenceTone(severity?: number | string): string {
  if (typeof severity === 'number') {
    if (severity >= 70) return 'border-red-700 bg-red-900/20 text-red-200';
    if (severity >= 40) return 'border-orange-700 bg-orange-900/20 text-orange-200';
    if (severity > 0) return 'border-yellow-700 bg-yellow-900/20 text-yellow-200';
    return 'border-[#333] bg-[#111] text-gray-300';
  }
  if (typeof severity === 'string') {
    const s = severity.toLowerCase();
    if (s === 'high' || s === 'critical' || s === 'severe') return 'border-red-700 bg-red-900/20 text-red-200';
    if (s === 'medium' || s === 'moderate') return 'border-orange-700 bg-orange-900/20 text-orange-200';
    if (s === 'low' || s === 'minor') return 'border-yellow-700 bg-yellow-900/20 text-yellow-200';
  }
  return 'border-[#333] bg-[#111] text-gray-300';
}

// Compact baseline/intervened snapshot card — every field optional-read since
// the explore endpoint's snapshot shape isn't finalized server-side.
function SnapshotCard({ label, tone, snapshot }: { label: string; tone: 'gray' | 'purple'; snapshot: WhatIfSnapshot }) {
  const border = tone === 'purple' ? 'border-purple-700' : 'border-[#333]';
  const titleColor = tone === 'purple' ? 'text-purple-300' : 'text-gray-400';
  const scoreEntries: Array<[string, number | undefined]> = [
    ['tension', snapshot.tension], ['quality', snapshot.quality], ['composite', snapshot.composite],
  ];
  const hasScores = scoreEntries.some(([, v]) => v !== undefined);
  return (
    <div className={`bg-[#111] rounded-lg border ${border} p-3`}>
      <div className={`text-[11px] font-medium mb-1.5 ${titleColor}`}>{label}</div>
      {snapshot.sceneIdx !== undefined && <div className="text-[11px] text-gray-500 mb-1">scene {snapshot.sceneIdx + 1}</div>}
      {hasScores && (
        <div className="flex gap-3 text-[11px] font-mono mb-1.5">
          {scoreEntries.map(([k, v]) => v !== undefined && (
            <span key={k} className="text-gray-400">{k} <span className="text-white">{v.toFixed(1)}</span></span>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-300 whitespace-pre-wrap">{snapshot.summary ?? '—'}</p>
    </div>
  );
}

// Verdict tint. Mirrors the three CoverageVerdict values the Script Doctor
// emits; anything else (or nothing) renders neutral rather than guessing at a
// colour that would imply a signal the data doesn't carry — the same rule
// consequenceTone above already follows.
function verdictTone(verdict?: CoverageVerdict): string {
  if (verdict === 'RECOMMEND') return 'border-green-700 bg-green-900/20 text-green-200';
  if (verdict === 'CONSIDER') return 'border-yellow-700 bg-yellow-900/20 text-yellow-200';
  if (verdict === 'PASS') return 'border-red-700 bg-red-900/20 text-red-200';
  return 'border-[#333] bg-[#111] text-gray-300';
}

// The Script Doctor readout for ONE materialised draft (the base draft, or one
// branch's variant of it). Renders the doctor's own health/verdict/grade, the
// signed delta against the base when there is one, and the two descriptive
// structural aggregates — labelled with the SAME copy ScriptDoctorPanel.tsx's
// Shape & Rhythm surfaces use ("descriptive, not part of the score" /
// "Talk/action swing" / "Action-prose variation"), because they are the same
// two numbers and must never read as a second, competing score.
//
// Withholding is the point of the branches below: when the server could not
// analyze a variant whole it sends no health/grade/verdict at all, and this
// says so plainly instead of rendering a 0 that looks like a measurement.
function DoctorReadout({ label, draft, delta }: {
  label: string;
  draft: WhatIfDoctorDraft;
  delta?: number;
}) {
  const scored = draft.health !== undefined;
  return (
    <div className={`rounded border p-2 ${scored ? verdictTone(draft.verdict) : 'border-[#333] bg-[#111] text-gray-400'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">{label}</span>
        {draft.sceneCount !== undefined && (
          <span className="text-[10px] font-mono opacity-70">{draft.sceneCount} scene{draft.sceneCount === 1 ? '' : 's'}</span>
        )}
      </div>
      {scored ? (
        <>
          <div className="flex items-baseline gap-2 flex-wrap mt-1">
            <span className="text-sm font-mono font-bold">{draft.health!.toFixed(1)}</span>
            <span className="text-[11px] font-mono opacity-90">/ 100</span>
            {draft.verdict && <span className="text-[11px] font-bold uppercase tracking-widest">{draft.verdict}</span>}
            {draft.grade && <span className="text-[11px] font-mono opacity-80">grade {draft.grade}</span>}
            {delta !== undefined && (
              <span className="text-[11px] font-mono opacity-90">
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)} vs base
              </span>
            )}
          </div>
          {draft.meanAbsDialogueShareDelta !== undefined && draft.actionSentenceCvOverall !== undefined && (
            <div className="text-[10px] font-mono opacity-75 flex items-center gap-2 flex-wrap mt-1">
              <span className="uppercase tracking-widest font-bold">
                Shape &amp; rhythm (descriptive, not part of the score)
              </span>
              <span>Talk/action swing {draft.meanAbsDialogueShareDelta.toFixed(2)}</span>
              <span>Action-prose variation {draft.actionSentenceCvOverall.toFixed(2)}</span>
            </div>
          )}
        </>
      ) : (
        <p className="text-[11px] mt-1">
          {draft.formatUnrecognized
            ? 'Nothing to score yet — this timeline has no scenes.'
            : 'The whole draft could not be analyzed, so no health, grade or verdict is shown.'}
        </p>
      )}
    </div>
  );
}

// One ranked branch card: scores, ops (via the copied ConvergePanel idiom),
// and the adopt flow — two-step confirm, then commitOpsToStory, matching the
// ghost row's UI exactly (confirmation copy differs since this writes a
// branch rather than restores a ghost, but the mechanics are identical).
//
// 2026-09-04: the card also carries the Script Doctor readout for this
// branch's materialised script (`doctor`, absent until the writer runs it) and
// the promote-to-editor flow beside adopt. Adopt and promote are deliberately
// distinct and both kept: adopt writes the branch's OPS into canon through the
// one commit pen (/api/nvm/converge/commit), promote writes the branch's TEXT
// into the editor as a snapshot. Neither replaces the other.
function BranchCard({
  branch, rank, flow, onRequestAdopt, onCancelAdopt, onAdopt,
  doctor, promoteFlow, onRequestPromote, onCancelPromote, onPromote,
}: {
  branch: WhatIfBranch;
  rank: number;
  flow: LabFlowState;
  onRequestAdopt: (branchId: string) => void;
  onCancelAdopt: (branchId: string) => void;
  onAdopt: (branch: WhatIfBranch) => void;
  doctor?: WhatIfBranchDoctor;
  promoteFlow?: PromoteFlowState;
  onRequestPromote?: (branchId: string) => void;
  onCancelPromote?: (branchId: string) => void;
  onPromote?: (doctor: WhatIfBranchDoctor, rank: number) => void;
}) {
  return (
    <div className={`rounded-lg border p-3 ${rank === 1 ? 'border-purple-500 bg-purple-900/10' : 'border-[#333] bg-[#111]'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-white">#{rank}{rank === 1 ? ' · best' : ''}</span>
        <span className="text-[10px] text-gray-500 font-mono">{branch.branchId.slice(0, 12)}…</span>
      </div>
      <p className="text-gray-300 text-xs mb-2">{branch.summary}</p>
      <div className="flex items-center gap-3 text-[11px] font-mono mb-2">
        <span className="text-pink-300">composite {branch.scores.composite.toFixed(1)}</span>
        <span className="text-blue-300">tension {branch.scores.tension.toFixed(1)}</span>
        <span className="text-violet-300">quality {branch.scores.quality.toFixed(1)}</span>
      </div>
      {branch.ops.length > 0 && (
        <div className="max-h-28 overflow-y-auto bg-[#0d0d1a] rounded p-2 mb-2 space-y-0.5">
          {branch.ops.map((op, i) => {
            const { kind, detail } = summarizeLabOp(op);
            return (
              <div key={i} className="text-[10.5px] text-gray-400">
                <span className="text-green-400 font-medium">{kind}</span> {detail}
              </div>
            );
          })}
        </div>
      )}

      {/* Script Doctor readout for this branch's materialised script. */}
      {doctor && (
        <div className="mb-2">
          <DoctorReadout label="Script Doctor" draft={doctor} delta={doctor.healthDelta} />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {!flow.committed && !flow.confirming && (
          <button
            onClick={() => onRequestAdopt(branch.branchId)}
            disabled={flow.committing}
            className="flex items-center gap-1 bg-green-900/40 hover:bg-green-900/60 disabled:opacity-40 text-green-300 text-[11px] px-2 py-1 rounded font-medium transition-colors"
          >
            <Check className="w-3 h-3" /> Adopt this branch
          </button>
        )}

        {/* Promote is offered only once the branch HAS a materialised script to
            promote — before the doctor run there is no text, so the control is
            absent rather than disabled-and-confusing. */}
        {doctor && onRequestPromote && !promoteFlow?.promoted && !promoteFlow?.confirming && (
          <button
            onClick={() => onRequestPromote(branch.branchId)}
            className="flex items-center gap-1 bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 text-[11px] px-2 py-1 rounded font-medium transition-colors"
          >
            <FileDown className="w-3 h-3" /> Promote this branch
          </button>
        )}
      </div>

      {doctor && promoteFlow?.confirming && onPromote && onCancelPromote && (
        <div className="mt-2 bg-purple-900/20 border border-purple-700 rounded p-2">
          <p className="text-purple-200 text-[11px] mb-2 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            This replaces the editor&rsquo;s draft with this branch&rsquo;s script. Your current draft is
            snapshotted first, so you can restore it from Versions.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPromote(doctor, rank)}
              className="bg-purple-500 hover:bg-purple-400 text-black text-[11px] font-bold px-2 py-1 rounded"
            >
              Yes, promote
            </button>
            <button onClick={() => onCancelPromote(branch.branchId)} className="text-gray-400 hover:text-white text-[11px] px-2 py-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      {promoteFlow?.promoted && (
        <div className="flex items-center gap-1 text-purple-300 text-[11px] mt-2">
          <Check className="w-3 h-3" /> Promoted into the editor as a new snapshot
        </div>
      )}

      {flow.confirming && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded p-2">
          <p className="text-yellow-300 text-[11px] mb-2 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            This writes this branch into your story as a new commit.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onAdopt(branch)}
              disabled={flow.committing}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black text-[11px] font-bold px-2 py-1 rounded"
            >
              {flow.committing ? 'Committing…' : 'Yes, adopt'}
            </button>
            <button onClick={() => onCancelAdopt(branch.branchId)} className="text-gray-400 hover:text-white text-[11px] px-2 py-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      {flow.conflict && (
        <div className="mt-2 bg-red-900/20 border border-red-700 rounded p-2">
          <p className="text-red-300 text-[11px] font-medium">{flow.conflict.error}</p>
          {flow.conflict.failures.length > 0 && (
            <ul className="list-disc list-inside text-red-400 text-[11px] mt-1">
              {flow.conflict.failures.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          )}
        </div>
      )}

      {flow.commitError && <p className="text-red-400 text-[11px] mt-1">{flow.commitError}</p>}

      {flow.committed && (
        <div className="flex items-center gap-1 text-green-400 text-[11px]">
          <Check className="w-3 h-3" /> Adopted as {flow.committed.commitId}
        </div>
      )}
    </div>
  );
}

type CommitOutcome =
  | { status: 'committed'; commitId: string }
  | { status: 'conflict'; error: string; failures: string[] }
  | { status: 'error'; message: string };

export default function WhatIfPanel({ onClose, onCommitted, onPromoteToEditor }: WhatIfPanelProps) {
  const [ghosts, setGhosts] = useState<GhostCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GhostCommit | null>(null);
  const [opId, setOpId] = useState('');
  const [doResult, setDoResult] = useState<InterventionResult | null>(null);
  const [doLoading, setDoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flows, setFlows] = useState<Record<string, GhostFlowState>>({});

  // ── Lab state ──────────────────────────────────────────────────────────────
  const [scm, setScm] = useState<SCMData | null>(null);
  const [scmLoading, setScmLoading] = useState(false);
  const [scmError, setScmError] = useState<string | null>(null);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [branchLimit, setBranchLimit] = useState(3);
  const [labLoading, setLabLoading] = useState(false);
  const [labError, setLabError] = useState<string | null>(null);
  const [labNotDeployed, setLabNotDeployed] = useState(false);
  const [labResult, setLabResult] = useState<WhatIfExploreResult | null>(null);
  const [labFlows, setLabFlows] = useState<Record<string, LabFlowState>>({});
  // ── Script Doctor state (POST /api/nvm/whatif/doctor) ──────────────────────
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [doctorResult, setDoctorResult] = useState<WhatIfDoctorResult | null>(null);
  const [promoteFlows, setPromoteFlows] = useState<Record<string, PromoteFlowState>>({});
  const scmAbortRef = useRef<AbortController | null>(null);
  const labAbortRef = useRef<AbortController | null>(null);
  const doctorAbortRef = useRef<AbortController | null>(null);
  // mountedRef guards setState after unmount for fetchGhosts (loadScm/exploreLab
  // already use AbortController; only fetchGhosts was missing the guard).
  const mountedRef = useRef(true);
  // Dialog root — see the tabIndex={-1} on the role="dialog" div below and
  // the useModalFocusTrap call near the Escape-handling effect further down.
  const panelRef = useRef<HTMLDivElement | null>(null);

  const fetchGhosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nvm/ghost-commits');
      if (res.ok) setGhosts((await res.json() as { ghosts: GhostCommit[] }).ghosts ?? []);
    } catch { setError('Failed to fetch ghost commits'); }
    finally { if (mountedRef.current) setLoading(false); }
  }, []);

  useEffect(() => { fetchGhosts(); }, [fetchGhosts]);

  // Same causal-model fetch CausalTwinPanel uses (GET /api/nvm/twin/scm),
  // guarded with an abort ref + stale check (the pattern DirectorPanel's QBN
  // filter-choices effect already establishes in this codebase) so a slow
  // response from a prior mount/click can't clobber a newer one.
  const loadScm = useCallback(async () => {
    scmAbortRef.current?.abort();
    const controller = new AbortController();
    scmAbortRef.current = controller;
    setScmLoading(true);
    setScmError(null);
    try {
      const res = await fetch('/api/nvm/twin/scm', { signal: controller.signal });
      if (!res.ok) throw new Error((await res.json().catch(() => ({} as { error?: string }))).error ?? 'Failed to load causal model');
      setScm(await res.json() as SCMData);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setScmError(e instanceof Error ? e.message : 'Failed to load causal model');
    } finally {
      if (!controller.signal.aborted) setScmLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScm();
    return () => scmAbortRef.current?.abort();
  }, [loadScm]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      labAbortRef.current?.abort();
      doctorAbortRef.current?.abort();
    };
  }, []);

  const interventionGroups = useMemo(() => {
    const buckets: Record<InterventionBucketKey, SCMNodeSummary[]> = { facts: [], relationships: [], clocks: [], other: [] };
    for (const n of scm?.nodes ?? []) buckets[interventionBucket(n.op.op)].push(n);
    return [
      { key: 'facts' as const, label: 'Facts to negate', icon: Ban, nodes: buckets.facts },
      { key: 'relationships' as const, label: 'Relationships to flip', icon: Link2, nodes: buckets.relationships },
      { key: 'clocks' as const, label: 'Clocks & events to remove', icon: Clock3, nodes: buckets.clocks },
      { key: 'other' as const, label: 'Other story beats', icon: Zap, nodes: buckets.other },
    ];
  }, [scm]);

  const selectIntervention = useCallback((targetOpId: string) => {
    setSelectedOpId(targetOpId);
    setLabResult(null);
    setLabError(null);
    setLabNotDeployed(false);
    // A doctor readout belongs to ONE intervention's branches. Changing the
    // target invalidates it, so it is cleared rather than left showing numbers
    // measured against scripts nobody is looking at any more.
    setDoctorResult(null);
    setDoctorError(null);
    setPromoteFlows({});
  }, []);

  // Explore: POST the selected intervention to the parallel-landing
  // /api/nvm/whatif/explore route. 404 is expected until that agent's route
  // deploys — surfaced as an honest "still deploying" message, not an error.
  const exploreLab = useCallback(async () => {
    if (!selectedOpId) return;
    labAbortRef.current?.abort();
    const controller = new AbortController();
    labAbortRef.current = controller;
    setLabLoading(true);
    setLabError(null);
    setLabNotDeployed(false);
    setLabResult(null);
    try {
      const res = await fetch('/api/nvm/whatif/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Flat body per WhatIfExploreBodySchema (server/lib/validation.ts):
        // { opId, replacement?, branchLimit? } — the server's contract is
        // authoritative; an earlier draft nested these under `intervention`.
        body: JSON.stringify({
          opId: selectedOpId,
          replacement: null,
          branchLimit,
        }),
        signal: controller.signal,
      });
      if (res.status === 404) {
        setLabNotDeployed(true);
        return;
      }
      if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Explore failed (${res.status})`);
      setLabResult(await res.json() as WhatIfExploreResult);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setLabError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      if (!controller.signal.aborted) setLabLoading(false);
    }
  }, [selectedOpId, branchLimit]);

  // Score: POST the SAME intervention to /api/nvm/whatif/doctor, which
  // materialises the base draft and every branch as real Fountain
  // (server/nvm/whatif/materialize.ts) and runs each through the pooled Script
  // Doctor server-side. Nothing about the score is computed in this bundle —
  // the panel only renders numbers the server measured, exactly like
  // ScriptDoctorPanel does for the editor's draft.
  const runDoctor = useCallback(async () => {
    if (!selectedOpId) return;
    doctorAbortRef.current?.abort();
    const controller = new AbortController();
    doctorAbortRef.current = controller;
    setDoctorLoading(true);
    setDoctorError(null);
    setDoctorResult(null);
    setPromoteFlows({});
    try {
      const res = await fetch('/api/nvm/whatif/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opId: selectedOpId, replacement: null, branchLimit }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Script Doctor failed (${res.status})`);
      setDoctorResult(await res.json() as WhatIfDoctorResult);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setDoctorError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      if (!controller.signal.aborted) setDoctorLoading(false);
    }
  }, [selectedOpId, branchLimit]);

  const doctorByBranch = useMemo(() => {
    const map = new Map<string, WhatIfBranchDoctor>();
    for (const b of doctorResult?.branches ?? []) map.set(b.branchId, b);
    return map;
  }, [doctorResult]);

  // ── Promote (branch script → editor snapshot) ──────────────────────────────
  const requestPromote = useCallback((branchId: string) => {
    setPromoteFlows(f => ({ ...f, [branchId]: { ...f[branchId], confirming: true } }));
  }, []);

  const cancelPromote = useCallback((branchId: string) => {
    setPromoteFlows(f => ({ ...f, [branchId]: { ...f[branchId], confirming: false } }));
  }, []);

  // Hands the branch's own materialised text and the doctor numbers measured
  // against THAT EXACT text up to the editor. The score fields are forwarded
  // only when present — a variant the server declined to score promotes as an
  // unscored snapshot rather than one carrying an invented health.
  const promoteBranch = useCallback((branch: WhatIfBranchDoctor, rank: number) => {
    onPromoteToEditor?.({
      branchId: branch.branchId,
      label: `What-If branch #${rank}`,
      text: branch.fountain,
      health: branch.health,
      verdict: branch.verdict,
      sceneCount: branch.sceneCount,
      analyzedAt: branch.analyzedAt,
      healthPercentile: branch.healthPercentile,
      meanAbsDialogueShareDelta: branch.meanAbsDialogueShareDelta,
      actionSentenceCvOverall: branch.actionSentenceCvOverall,
    });
    setPromoteFlows(f => ({ ...f, [branch.branchId]: { confirming: false, promoted: true } }));
  }, [onPromoteToEditor]);

  // THE SHARED COMMIT PATH — both the ghost "road not taken" flow (commitGhost,
  // pre-existing) and the Lab's branch-adopt flow (adoptBranch, new) call this
  // single function to POST ops to /api/nvm/converge/commit and interpret the
  // response. One place talks to the endpoint and parses its 409/ok shape, so
  // adopting a Lab branch is not a parallel reimplementation of the ghost
  // commit logic — it's the same code path with a different caller and a
  // caller-supplied conflict-fallback message.
  const commitOpsToStory = useCallback(async (params: {
    ops: unknown[];
    sceneIdx?: number;
    activeMechanisms?: string[];
    preconditions?: string[];
    summary: string;
    conflictFallback: string;
  }): Promise<CommitOutcome> => {
    try {
      const res = await fetch('/api/nvm/converge/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ops: params.ops,
          sceneIdx: params.sceneIdx,
          activeMechanisms: params.activeMechanisms,
          preconditions: params.preconditions,
          summary: params.summary,
        }),
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({} as { error?: string; failures?: string[] }));
        return {
          status: 'conflict',
          error: data.error ?? params.conflictFallback,
          failures: Array.isArray(data.failures) ? data.failures : [],
        };
      }
      if (!res.ok) {
        return { status: 'error', message: (await res.text().catch(() => '')) || `Commit failed (${res.status})` };
      }
      const data = await res.json() as { commitId: string };
      return { status: 'committed', commitId: data.commitId };
    } catch (e) {
      return { status: 'error', message: e instanceof Error ? e.message : 'Commit failed' };
    }
  }, []);

  const runIntervention = async () => {
    if (!opId.trim()) return;
    setDoLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nvm/twin/do', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opId: opId.trim(), replacement: null }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDoResult(await res.json() as InterventionResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally { setDoLoading(false); }
  };

  // Step 1 of the road-not-taken flow: ask the server to replay this ghost's
  // ops against the current story so we get back concrete, current branchedOps
  // (not just whatever was frozen into the ghost ledger at rejection time).
  const branchGhost = useCallback(async (g: GhostCommit) => {
    setFlows(f => ({ ...f, [g.ghostId]: { ...f[g.ghostId], branching: true, branchError: undefined } }));
    try {
      const res = await fetch('/api/nvm/ghost-commits/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ghostId: g.ghostId }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Branch failed');
      const data = await res.json() as BranchResponse;
      setFlows(f => ({
        ...f,
        [g.ghostId]: { ...f[g.ghostId], branching: false, branchedOps: data.branchedOps, branchSceneIdx: data.sceneIdx },
      }));
    } catch (e) {
      setFlows(f => ({
        ...f,
        [g.ghostId]: { ...f[g.ghostId], branching: false, branchError: e instanceof Error ? e.message : 'Branch failed' },
      }));
    }
  }, []);

  const requestCommit = useCallback((ghostId: string) => {
    setFlows(f => ({ ...f, [ghostId]: { ...f[ghostId], confirming: true } }));
  }, []);

  const cancelCommit = useCallback((ghostId: string) => {
    setFlows(f => ({ ...f, [ghostId]: { ...f[ghostId], confirming: false } }));
  }, []);

  // Step 2: writes the branched ops into the story as a new commit, via the
  // shared commitOpsToStory path. A 409 means the story moved since branching
  // (or since rejection) and this ghost's ops no longer prove — shown
  // honestly, with a way to re-branch and try again rather than pretending
  // the commit half-succeeded.
  const commitGhost = useCallback(async (g: GhostCommit) => {
    const branchedOps = flows[g.ghostId]?.branchedOps;
    if (!branchedOps) return;
    setFlows(f => ({ ...f, [g.ghostId]: { ...f[g.ghostId], committing: true, confirming: false, commitError: undefined, conflict: undefined } }));
    const outcome = await commitOpsToStory({
      ops: branchedOps,
      // sceneIdx comes from the branch response (freshest), not the ghost's
      // frozen record; activeMechanisms/preconditions are the scene's own
      // declared metadata, sourced from the ghost's original ir since the
      // branch endpoint only returns ops + sceneIdx.
      sceneIdx: flows[g.ghostId]?.branchSceneIdx ?? g.sceneIdx,
      activeMechanisms: g.ir?.activeMechanisms,
      preconditions: g.ir?.preconditions,
      summary: `Restored ghost ${g.ghostId} (${g.reason}) via What-If`,
      conflictFallback: 'The story state moved — this ghost no longer proves.',
    });
    if (outcome.status === 'conflict') {
      setFlows(f => ({ ...f, [g.ghostId]: { ...f[g.ghostId], committing: false, conflict: { error: outcome.error, failures: outcome.failures } } }));
    } else if (outcome.status === 'error') {
      setFlows(f => ({ ...f, [g.ghostId]: { ...f[g.ghostId], committing: false, commitError: outcome.message } }));
    } else {
      setFlows(f => ({ ...f, [g.ghostId]: { ...f[g.ghostId], committing: false, committed: { commitId: outcome.commitId } } }));
      onCommitted?.(outcome.commitId);
    }
  }, [flows, onCommitted, commitOpsToStory]);

  // Lab branch adopt flow — same two-step confirm/commit shape as the ghost
  // flow above, same shared commitOpsToStory call, keyed by branchId.
  const requestAdopt = useCallback((branchId: string) => {
    setLabFlows(f => ({ ...f, [branchId]: { ...f[branchId], confirming: true } }));
  }, []);

  const cancelAdopt = useCallback((branchId: string) => {
    setLabFlows(f => ({ ...f, [branchId]: { ...f[branchId], confirming: false } }));
  }, []);

  const adoptBranch = useCallback(async (branch: WhatIfBranch) => {
    setLabFlows(f => ({ ...f, [branch.branchId]: { ...f[branch.branchId], committing: true, confirming: false, commitError: undefined, conflict: undefined } }));
    const outcome = await commitOpsToStory({
      ops: branch.ops,
      sceneIdx: branch.sceneIdx,
      activeMechanisms: branch.activeMechanisms,
      preconditions: branch.preconditions,
      summary: branch.summary || `Adopted What-If Lab branch ${branch.branchId}`,
      conflictFallback: 'the story moved on — this branch no longer proves.',
    });
    if (outcome.status === 'conflict') {
      setLabFlows(f => ({ ...f, [branch.branchId]: { ...f[branch.branchId], committing: false, conflict: { error: outcome.error, failures: outcome.failures } } }));
    } else if (outcome.status === 'error') {
      setLabFlows(f => ({ ...f, [branch.branchId]: { ...f[branch.branchId], committing: false, commitError: outcome.message } }));
    } else {
      setLabFlows(f => ({ ...f, [branch.branchId]: { ...f[branch.branchId], committing: false, committed: { commitId: outcome.commitId } } }));
      onCommitted?.(outcome.commitId);
    }
  }, [commitOpsToStory, onCommitted]);

  const REASON_COLOR: Record<string, string> = {
    proof_failed:    'bg-red-900 text-red-200',
    valuation_low:   'bg-orange-900 text-orange-200',
    budget_exceeded: 'bg-yellow-900 text-yellow-200',
    superseded:      'bg-gray-700 text-gray-300',
  };

  const hasAnyInterventionTargets = interventionGroups.some(g => g.nodes.length > 0);

  // Escape closes the panel, matching ScriptDoctorPanel's overlay convention.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Real focus management for this panel's role="dialog" aria-modal="true"
  // contract (see the div below): moves focus in on mount, traps
  // Tab/Shift+Tab within the panel while mounted, and restores focus to the
  // triggering control on unmount. See use-modal-focus-trap.ts for the
  // scope/limits of what this does and does not cover.
  useModalFocusTrap(panelRef);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="whatif-panel-title" className="bg-[#1a1a2e] border border-[#333] rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333]">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-400" />
            <h2 id="whatif-panel-title" className="text-white font-semibold text-lg">What-If Lab</h2>
            <span className="text-xs text-gray-500 ml-2">flip a decision, see an experimental composite ranking with Tier-1 checks included</span>
          </div>
          <button onClick={onClose} aria-label="Close What-If Lab" className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── LAB SECTION ─────────────────────────────────────────────────── */}
          <div className="p-5 border-b border-[#333] space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="w-4 h-4 text-purple-400" />
                <span className="text-white font-medium text-sm">Intervention picker</span>
              </div>

              <div className="bg-[#111] rounded-lg p-3 space-y-3">
                {scmLoading && <p className="text-gray-400 text-xs">Loading causal model…</p>}
                {scmError && <p className="text-red-400 text-xs">{scmError}</p>}
                {!scmLoading && !scmError && !hasAnyInterventionTargets && (
                  <p className="text-gray-500 text-xs">No committed ops yet — run the engine to populate interventions.</p>
                )}
                {interventionGroups.map(group => group.nodes.length > 0 && (
                  <div key={group.key}>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mb-1.5">
                      <group.icon className="w-3 h-3" />
                      {group.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.nodes.map(node => (
                        <button
                          key={node.opId}
                          onClick={() => selectIntervention(node.opId)}
                          title={node.opId}
                          className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                            selectedOpId === node.opId
                              ? 'border-purple-500 bg-purple-900/40 text-purple-200'
                              : 'border-[#333] hover:border-[#555] bg-[#1a1a2e] text-gray-300'
                          }`}
                        >
                          {describeInterventionTarget(node)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3 pt-2 border-t border-[#2a2a3e]">
                  <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    Branches
                    <select
                      value={branchLimit}
                      onChange={e => setBranchLimit(Number(e.target.value))}
                      className="bg-[#1a1a2e] border border-[#333] rounded px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-purple-500"
                    >
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <button
                    onClick={exploreLab}
                    disabled={!selectedOpId || labLoading}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors ml-auto"
                  >
                    <Play className="w-3 h-3" />
                    {labLoading ? 'Exploring…' : 'Explore'}
                  </button>
                  {/* Separate control, not folded into Explore: scoring runs the
                      full 14-pass doctor once per branch, so the cheap "what
                      breaks?" answer never has to pay for it. */}
                  <button
                    onClick={runDoctor}
                    disabled={!selectedOpId || !labResult || doctorLoading}
                    className="flex items-center gap-1.5 bg-[#1a1a2e] border border-purple-700 hover:border-purple-500 disabled:opacity-40 text-purple-200 text-xs px-3 py-1.5 rounded font-medium transition-colors"
                  >
                    <Stethoscope className="w-3 h-3" />
                    {doctorLoading ? 'Scoring…' : 'Score with Script Doctor'}
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div>
              {labNotDeployed && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 text-xs text-yellow-300 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  The Lab's server piece is still deploying — /api/nvm/whatif/explore isn't live yet. Try again shortly.
                </div>
              )}

              {!labNotDeployed && labError && (
                <p className="text-red-400 text-xs">{labError}</p>
              )}

              {!labNotDeployed && !labError && labLoading && (
                <p className="text-gray-400 text-xs animate-pulse py-2">Computing alternate futures…</p>
              )}

              {!labNotDeployed && !labError && !labLoading && !labResult && (
                <p className="text-gray-500 text-xs italic py-1">
                  Interventions are computed on the story's causal model — deterministic, no AI key needed.
                  Pick a target above and Explore.
                </p>
              )}

              {!labNotDeployed && !labError && !labLoading && labResult && (
                <div className="space-y-4">
                  {/* Baseline vs intervened comparison strip */}
                  <div className="grid grid-cols-2 gap-3">
                    <SnapshotCard label="Baseline" tone="gray" snapshot={labResult.baseline} />
                    <SnapshotCard label="Intervened" tone="purple" snapshot={labResult.intervened} />
                  </div>

                  {/* Consequences */}
                  <div>
                    <div className="text-white font-medium text-xs mb-1.5">Consequences</div>
                    {labResult.consequences.length === 0 ? (
                      <p className="text-gray-400 text-xs bg-[#111] border border-[#333] rounded-lg p-3">
                        This change barely ripples — the story doesn't depend on it.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {labResult.consequences.map((c, i) => (
                          <div key={i} className={`rounded-lg border p-2.5 text-xs ${consequenceTone(c.severity)}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{c.kind.replace(/_/g, ' ')}</span>
                              {c.severity !== undefined && (
                                <span className="text-[10px] opacity-75 shrink-0">
                                  {typeof c.severity === 'number' ? `severity ${c.severity}` : c.severity}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 opacity-90">{c.description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Script Doctor — the base draft's own reading, so every
                      per-branch delta below has a visible reference point. */}
                  {doctorError && <p className="text-red-400 text-xs">{doctorError}</p>}
                  {doctorLoading && (
                    <p className="text-gray-400 text-xs animate-pulse py-2">
                      Materialising each branch as a script and running the Script Doctor…
                    </p>
                  )}
                  {!doctorLoading && !doctorError && !doctorResult && (
                    <p className="text-gray-500 text-xs italic">
                      Branches are story moves, not text — until they are compiled into a script there is
                      nothing for the Script Doctor to read. &ldquo;Score with Script Doctor&rdquo; compiles
                      each branch into a Fountain draft (deterministic, no AI key) and scores it.
                    </p>
                  )}
                  {!doctorLoading && !doctorError && doctorResult && (
                    <div>
                      <div className="text-white font-medium text-xs mb-1.5">Script Doctor</div>
                      <DoctorReadout label="Base draft (this story as it stands)" draft={doctorResult.base} />
                    </div>
                  )}

                  {/* Branch cards */}
                  {labResult.branches.length > 0 && (
                    <div>
                      <div className="text-white font-medium text-xs mb-1.5">
                        Branches <span className="text-gray-500 font-normal">experimental composite ranking with Tier-1 checks included</span>
                      </div>
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                        {labResult.branches.map((b, i) => (
                          <BranchCard
                            key={b.branchId}
                            branch={b}
                            rank={i + 1}
                            flow={labFlows[b.branchId] ?? {}}
                            onRequestAdopt={requestAdopt}
                            onCancelAdopt={cancelAdopt}
                            onAdopt={adoptBranch}
                            doctor={doctorByBranch.get(b.branchId)}
                            promoteFlow={promoteFlows[b.branchId]}
                            onRequestPromote={onPromoteToEditor ? requestPromote : undefined}
                            onCancelPromote={cancelPromote}
                            onPromote={promoteBranch}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── ROADS NOT TAKEN — the original ghost-commit browser ──────────── */}
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-purple-400" />
            <h3 className="text-white font-medium text-sm">Roads not taken</h3>
            <span className="text-xs text-gray-500">shadow canon — rejected candidates</span>
          </div>

          <div className="flex h-[420px]">
            {/* Ghost list */}
            <div className="w-1/2 border-r border-[#333] overflow-y-auto p-3 space-y-2">
              {loading && <p className="text-gray-400 text-sm text-center py-8">Loading…</p>}
              {!loading && ghosts.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  No ghost commits yet.<br />
                  <span className="text-xs">Run the Convergence Loop to generate candidates.</span>
                </p>
              )}
              {ghosts.map(g => {
                const flow = flows[g.ghostId] ?? {};
                const hasScores = g.composite !== undefined || g.tension !== undefined || g.quality !== undefined;
                return (
                  <div
                    key={g.ghostId}
                    onClick={() => setSelected(g)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelected(g); }}
                    className={`w-full text-left rounded-lg border p-3 transition-all cursor-pointer ${
                      selected?.ghostId === g.ghostId
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-[#333] hover:border-[#555] bg-[#111]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-purple-300 text-xs font-mono">{g.ghostId.slice(0, 12)}…</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REASON_COLOR[g.reason] ?? 'bg-gray-700 text-gray-300'}`}>
                        {g.reason.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs flex items-center gap-3">
                      <span>Scene {g.sceneIdx + 1}</span>
                      <span>{g.ir?.sceneFunction ?? '—'}</span>
                      <span>{g.ir?.ops?.length ?? 0} ops</span>
                    </div>
                    {hasScores && (
                      <div className="text-[11px] flex items-center gap-3 mt-1 font-mono">
                        {g.composite !== undefined && <span className="text-pink-300">composite {g.composite.toFixed(1)}</span>}
                        {g.tension !== undefined && <span className="text-blue-300">tension {g.tension.toFixed(1)}</span>}
                        {g.quality !== undefined && <span className="text-violet-300">quality {g.quality.toFixed(1)}</span>}
                      </div>
                    )}

                    {/* Road-not-taken actions — stop propagation so clicking these
                        doesn't also select the row underneath. */}
                    <div className="mt-2 pt-2 border-t border-[#2a2a3e]" onClick={e => e.stopPropagation()}>
                      {!flow.committed && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => branchGhost(g)}
                            disabled={flow.branching}
                            className="flex items-center gap-1 bg-[#222] hover:bg-[#2a2a3e] disabled:opacity-40 text-purple-300 text-[11px] px-2 py-1 rounded font-medium transition-colors"
                          >
                            <GitBranch className="w-3 h-3" />
                            {flow.branching ? 'Branching…' : flow.branchedOps ? 'Re-branch' : 'Branch ops'}
                          </button>
                          {flow.branchedOps && !flow.confirming && (
                            <button
                              onClick={() => requestCommit(g.ghostId)}
                              className="flex items-center gap-1 bg-green-900/40 hover:bg-green-900/60 text-green-300 text-[11px] px-2 py-1 rounded font-medium transition-colors"
                            >
                              <Check className="w-3 h-3" /> Commit to story
                            </button>
                          )}
                        </div>
                      )}

                      {flow.branchError && <p className="text-red-400 text-[11px] mt-1">{flow.branchError}</p>}
                      {flow.branchedOps && !flow.conflict && (
                        <p className="text-gray-500 text-[11px] mt-1">
                          {flow.branchedOps.length} op(s) branched at scene {flow.branchSceneIdx}
                        </p>
                      )}

                      {flow.confirming && (
                        <div className="mt-2 bg-yellow-900/20 border border-yellow-700 rounded p-2">
                          <p className="text-yellow-300 text-[11px] mb-2 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            This writes the rejected path into your story as a new commit.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => commitGhost(g)}
                              disabled={flow.committing}
                              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black text-[11px] font-bold px-2 py-1 rounded"
                            >
                              {flow.committing ? 'Committing…' : 'Yes, commit'}
                            </button>
                            <button onClick={() => cancelCommit(g.ghostId)} className="text-gray-400 hover:text-white text-[11px] px-2 py-1">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {flow.conflict && (
                        <div className="mt-2 bg-red-900/20 border border-red-700 rounded p-2">
                          <p className="text-red-300 text-[11px] font-medium">{flow.conflict.error}</p>
                          {flow.conflict.failures.length > 0 && (
                            <ul className="list-disc list-inside text-red-400 text-[11px] mt-1">
                              {flow.conflict.failures.map((f, i) => <li key={i}>{f}</li>)}
                            </ul>
                          )}
                          <button onClick={() => branchGhost(g)} className="text-gray-400 hover:text-white text-[11px] mt-1 underline">
                            Re-branch and retry
                          </button>
                        </div>
                      )}

                      {flow.commitError && <p className="text-red-400 text-[11px] mt-1">{flow.commitError}</p>}

                      {flow.committed && (
                        <div className="flex items-center gap-1 text-green-400 text-[11px]">
                          <Check className="w-3 h-3" /> Committed as {flow.committed.commitId}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail / intervention */}
            <div className="w-1/2 overflow-y-auto p-4 space-y-4">
              {selected ? (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium text-sm">Ghost IR Detail</span>
                    </div>
                    <div className="bg-[#111] rounded-lg p-3 text-xs font-mono text-gray-300 space-y-1">
                      <div><span className="text-gray-500">id:</span> {selected.ghostId}</div>
                      <div><span className="text-gray-500">scene:</span> {selected.sceneIdx + 1}</div>
                      <div><span className="text-gray-500">function:</span> {selected.ir?.sceneFunction ?? '—'}</div>
                      <div><span className="text-gray-500">rejected:</span> {selected.reason}</div>
                      <div className="pt-1"><span className="text-gray-500">ops ({selected.ir?.ops?.length ?? 0}):</span></div>
                      {(selected.ir?.ops ?? []).map((op, i) => (
                        <div key={i} className="pl-2 text-purple-300">
                          {i}: {op.op}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">Select a ghost commit to inspect</p>
              )}

              {/* Causal intervention (do-calculus) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-medium text-sm">Causal Intervention (do-calculus)</span>
                </div>
                <p className="text-gray-500 text-xs mb-2">
                  Enter an op ID (<code className="text-gray-400">commitId:opIdx</code>) to compute what downstream ops break if it's removed.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={opId}
                    onChange={e => setOpId(e.target.value)}
                    placeholder="e.g. abc123:2"
                    className="flex-1 bg-[#111] border border-[#333] rounded px-3 py-1.5 text-white text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={runIntervention}
                    disabled={doLoading || !opId.trim()}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
                  >
                    {doLoading ? '…' : 'do()'}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              {doResult && (
                <div className="bg-[#111] rounded-lg p-3 text-xs">
                  <div className="text-yellow-300 font-medium mb-2">Counterfactual Report</div>
                  <pre className="text-gray-300 whitespace-pre-wrap font-mono text-[10px] leading-5">
                    {doResult.summary}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
