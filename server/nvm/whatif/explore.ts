// What-If Lab compose module (Run 6) — DETERMINISTIC, KEYLESS.
//
// Pure composition over three engines that already exist and are already
// tested: the causal twin (server/nvm/twin/scm.ts + twin/counterfactual.ts —
// Pearl's do()-calculus over the StoryOp DAG), the Forward Latent Branch
// Field (server/nvm/branch/field.ts + branch/score.ts — scored candidate
// next-moves from a state), and the same ops dispatcher + tension ledger +
// quality engine every other NVM route already uses. This module invents no
// new causal or scoring machinery — it reads the REAL outputs of those
// modules and recombines them into one answer to "what if I changed X?":
// a plain-language diff of what the intervention breaks/opens, plus ranked
// alternate continuations from the resulting world. Same guarantee as the
// rest of NVM — proofs, not vibes — now for a hypothetical instead of canon.
//
// Determinism: every exported function here is a pure fold over data the
// caller already computed (a NarrativeState, a StoryCommit[], a
// StructuralCausalModel). The one place upstream code injects entropy —
// server/nvm/branch/field.ts mints a fresh randomUUID() per branch (and, when
// it fabricates a synthetic ADD_FACT from the current state, a fresh
// randomUUID() factId too) — is neutralized below (stabilizeOps /
// deterministic branchId) so identical requests always produce byte-identical
// responses without touching branch/field.ts itself (out of scope for this
// change). No wall-clock reads (no bare `Date.now()` outside a caller-owned
// StoryCommit.createdAt we merely echo), no network, no LLM call anywhere in
// this file.

import { createHash } from 'node:crypto';
import type { NarrativeState } from '../state/NarrativeState.ts';
import { emptyState, stateHash } from '../state/NarrativeState.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { StructuralCausalModel } from '../twin/scm.ts';
import type { Intervention, CounterfactualReport } from '../twin/counterfactual.ts';
import { doIntervention } from '../twin/counterfactual.ts';
import { applyStoryOps } from '../ops/dispatcher.ts';
import { deriveTensionLedger } from '../valuation/futures.ts';
import { runQualityEngine } from '../quality/index.ts';
import { generateBranchField, type BranchPacket } from '../branch/field.ts';

// ── Public shapes ────────────────────────────────────────────────────────────

/** Compact narrative snapshot — the "before"/"after" the What-If Lab shows side by side. */
export interface CompactSnapshot {
  /** Key clocks (clockId → current value). */
  clocks: Record<string, number>;
  /** Per-dyad relationship summary: net signed valence + which dimension drives it. */
  relationships: Array<{ pair: [string, string]; netValence: number; dominantDimension: string | null }>;
  /** Clue ids that have been planted but not yet paid off. */
  openSetups: string[];
  /** Aggregate dramatic tension (Contradiction Futures Market total). */
  tension: number;
}

export type ConsequenceKind =
  | 'removed' | 'replaced' | 'broken_dependency'
  | 'tension_shift' | 'clock_shift' | 'relationship_shift'
  | 'setup_opened' | 'setup_closed' | 'no_effect';

export interface Consequence {
  kind: ConsequenceKind;
  /** Plain language — no op-kind jargon, no ALL_CAPS tokens. */
  description: string;
  severity?: number; // 0–100
}

export interface ExploreBranch {
  branchId: string;
  ops: StoryOp[];
  summary: string;
  scores: { tension: number; quality: number; composite: number };
}

export interface ExploreResult {
  baseline: CompactSnapshot;
  intervened: CompactSnapshot;
  consequences: Consequence[];
  branches: ExploreBranch[];
}

export interface ExploreInput {
  /** Current session's enriched NarrativeState (server/nvm/state/enrichedState.ts). */
  state: NarrativeState;
  /** Non-reverted commits, chronological — the EXACT same set + order buildSCM(stage) used. */
  commits: StoryCommit[];
  /** buildSCM(stage) — built by the caller from the same commits. */
  scm: StructuralCausalModel;
  /** {opId, replacement} — identical vocabulary to POST /api/nvm/twin/do. */
  intervention: Intervention;
  /** Deterministic RNG seed for branch-field mutation operators. Defaults to a hash of the intervention itself (see deriveSeed) so callers never need to think about it to get determinism. */
  seed?: number;
  /** 1–5, default 3. */
  branchLimit?: number;
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function exploreWhatIf(input: ExploreInput): ExploreResult {
  const { state, commits, scm, intervention } = input;
  const branchLimit = Math.max(1, Math.min(5, Math.trunc(input.branchLimit ?? 3)));
  const seed = input.seed ?? deriveSeed(intervention);

  // sceneIdx anchors the tension ledger's time-decay math to "now" — the scene
  // after the most recent commit, same convention branch/field.ts's route uses.
  const sceneIdx = commits.length > 0 ? commits[commits.length - 1].sceneIdx : state.turn;
  const baseline = buildCompactSnapshot(state, sceneIdx);

  const report = doIntervention(scm, intervention);
  const targetNode = scm.nodes.get(intervention.opId);

  // Guard: the intervention targets an op that doesn't exist in this session's
  // history (fresh session, typo, stale client-side opId). doIntervention()
  // already reports this via an empty affectedOps + a "not found" summary —
  // the honest answer is that nothing changed, not a guessed diff or a 4xx:
  // the request was well-formed, it just has no referent yet.
  if (!targetNode) {
    const branchField = generateBranchField(state, commits, seed);
    return {
      baseline,
      intervened: baseline,
      consequences: [{
        kind: 'no_effect',
        description: `no story event with id "${intervention.opId}" exists yet in this session, so nothing changed`,
      }],
      branches: rankBranches(branchField.branches, state, sceneIdx, branchLimit),
    };
  }

  const interveneOps = buildInterveneOps(commits, intervention, report);
  const foldedIntervened = applyStoryOps(emptyState(), interveneOps);
  const intervenedState = mergeLiveFields(foldedIntervened, state);
  const intervened = buildCompactSnapshot(intervenedState, sceneIdx);

  const consequences = diffConsequences(targetNode.op, intervention, report, baseline, intervened);

  const branchField = generateBranchField(intervenedState, commits, seed);
  const branches = rankBranches(branchField.branches, intervenedState, sceneIdx, branchLimit);

  return { baseline, intervened, consequences, branches };
}

// ── Seed derivation ──────────────────────────────────────────────────────────

// Folds the intervention's own content into a positive 31-bit int. Deliberately
// NOT Date.now()-based — the whole point is that the same {opId, replacement}
// always yields the same branch field, so two identical POSTs to
// /api/nvm/whatif/explore are byte-identical.
function deriveSeed(intervention: Intervention): number {
  const key = `${intervention.opId}::${JSON.stringify(intervention.replacement)}`;
  const digest = createHash('sha256').update(key).digest();
  return digest.readUInt32BE(0) & 0x7fffffff;
}

// ── Timeline reconstruction (the do() half) ─────────────────────────────────

function opNodeId(commitId: string, opIdx: number): string {
  return `${commitId}:${opIdx}`;
}

/**
 * Reconstructs the full chronological op sequence AS IF the intervention had
 * always applied: the target op is replaced (or dropped, for a removal), and
 * every op the causal twin found downstream of it (report.affectedOps — both
 * direct and transitive) is also dropped, because its causal premise no
 * longer holds. This is the same dependency logic CausalProof enforces at
 * commit time (server/nvm/proof/tier1/causal.ts) — an op whose declared cause
 * vanished is not valid canon, hypothetical or otherwise — just applied here
 * as a graph cut instead of a proof rejection, since there is nothing to
 * reject: this is exploration, not a commit attempt.
 */
function buildInterveneOps(
  commits: StoryCommit[],
  intervention: Intervention,
  report: CounterfactualReport,
): StoryOp[] {
  const excluded = new Set(report.affectedOps.map(a => a.opId));
  const out: StoryOp[] = [];
  for (const commit of commits) {
    commit.ops.forEach((op, idx) => {
      const id = opNodeId(commit.commitId, idx);
      if (id === intervention.opId) {
        if (intervention.replacement) out.push(intervention.replacement);
        return; // null replacement = removal (do(X := ∅)) — nothing pushed
      }
      if (excluded.has(id)) return; // downstream premise broke — drop
      out.push(op);
    });
  }
  return out;
}

/**
 * Merges a from-scratch op replay with the session's live-derived fields —
 * mirrors server/nvm/state/enrichedState.ts's merge policy exactly: op replay
 * is authoritative for accumulative world state (facts, clocks, clues,
 * relationships, theme), but per-agent beliefs/emotions/authorIntent stay
 * sourced from the live session state, since a hypothetical intervention on
 * story HISTORY doesn't retroactively rewrite today's live Stage rows.
 */
function mergeLiveFields(folded: NarrativeState, liveState: NarrativeState): NarrativeState {
  return {
    ...folded,
    characterBeliefs: liveState.characterBeliefs,
    characterEmotions: liveState.characterEmotions,
    authorIntent: liveState.authorIntent,
    audienceState: (folded.audienceState.suspense > 0 || folded.audienceState.curiosity > 0)
      ? folded.audienceState
      : liveState.audienceState,
    turn: liveState.turn,
  };
}

// ── Compact snapshot ─────────────────────────────────────────────────────────

function buildCompactSnapshot(state: NarrativeState, sceneIdx: number): CompactSnapshot {
  const paidOff = new Set(state.payoffs.map(p => p.setupId));
  const openSetups = state.clues.map(c => c.clueId).filter(id => !paidOff.has(id));

  const relationships = Object.entries(state.relationships).map(([key, deltas]) => {
    const pair = key.split('|') as [string, string];
    const byDimension = new Map<string, number>();
    for (const d of deltas) byDimension.set(d.dimension, (byDimension.get(d.dimension) ?? 0) + d.amount);
    let netValence = 0;
    let dominantDimension: string | null = null;
    let maxAbs = 0;
    for (const [dim, v] of byDimension) {
      netValence += v;
      if (Math.abs(v) > maxAbs) { maxAbs = Math.abs(v); dominantDimension = dim; }
    }
    return { pair, netValence: Math.round(netValence * 100) / 100, dominantDimension };
  });

  const ledger = deriveTensionLedger(state, sceneIdx);

  return {
    clocks: { ...state.clocks },
    relationships,
    openSetups,
    tension: Math.round(ledger.totalTension * 100) / 100,
  };
}

// ── Plain-language op descriptions ──────────────────────────────────────────

// Translates a StoryOp into a sentence fragment with no op-kind jargon and no
// ALL_CAPS tokens — the What-If Lab's whole differentiator is answering in
// prose, not internal bytecode. Exhaustive switch (mirrors the dispatcher's
// own assertNever discipline in server/nvm/ops/dispatcher.ts) so a 15th
// StoryOp kind fails to compile here until it gets a plain-language phrasing.
function describeOp(op: StoryOp): string {
  switch (op.op) {
    case 'ADD_FACT':
      return `a new fact was established: "${op.fact.subject} ${op.fact.predicate} ${op.fact.object}"`;
    case 'EXPIRE_FACT':
      return 'a previously established fact stopped being true';
    case 'UPDATE_BELIEF':
      return `${op.charId}'s belief changed to: "${op.belief.proposition}"`;
    case 'APPRAISE_EMOTION':
      return `${op.charId}'s dominant feeling became ${op.emotion.dominant}`;
    case 'SHIFT_RELATIONSHIP':
      return `the relationship between ${op.pair[0]} and ${op.pair[1]} ${op.delta.amount >= 0 ? 'warmed' : 'cooled'}`;
    case 'ADVANCE_OBJECT_ARC':
      return `"${op.objectId}" moved to a new role in the story: ${op.toState}`;
    case 'TRIGGER_RULE':
      return 'a background story rule fired';
    case 'SEED_CLUE':
      return 'a new clue was planted';
    case 'PAYOFF_SETUP':
      return 'a previously planted clue paid off';
    case 'RAISE_CLOCK':
      return `a ticking deadline moved by ${op.amount}`;
    case 'ADVANCE_THEME_ARGUMENT':
      return `the story's thematic argument ${op.move === 'resolve' ? 'reached a conclusion' : 'shifted'}`;
    case 'UPDATE_READER_STATE':
      return "the audience's engagement shifted";
    case 'RECORD_VISUAL_FACT':
      return 'a visual story detail was recorded';
    case 'RECORD_SONIC_FACT':
      return 'a sound story detail was recorded';
    default: {
      const _exhaustive: never = op;
      return 'a story change occurred';
    }
  }
}

// ── Consequences (the diff) ──────────────────────────────────────────────────

function diffConsequences(
  targetOp: StoryOp,
  intervention: Intervention,
  report: CounterfactualReport,
  baseline: CompactSnapshot,
  intervened: CompactSnapshot,
): Consequence[] {
  const out: Consequence[] = [];

  // 1. The intervention itself, translated out of jargon.
  if (intervention.replacement) {
    out.push({
      kind: 'replaced',
      description: `this no longer happens: ${describeOp(targetOp)}. Instead, ${describeOp(intervention.replacement)}`,
      severity: 60,
    });
  } else {
    out.push({
      kind: 'removed',
      description: `this no longer happens: ${describeOp(targetOp)}`,
      severity: 60,
    });
  }

  // 2. Everything the causal twin (server/nvm/twin/counterfactual.ts) found
  //    downstream — its own BFS over the real op-dependency graph, just
  //    translated out of op-kind jargon. Direct (one hop) consequences are
  //    weighted above transitive (multi-hop) ones.
  for (const a of report.directlyAffected) {
    out.push({
      kind: 'broken_dependency',
      description: `this depended on the change above, so it no longer holds: ${describeOp(a.originalOp)}`,
      severity: 70,
    });
  }
  for (const a of report.transitivelyAffected) {
    out.push({
      kind: 'broken_dependency',
      description: `several steps further downstream, this is now also in question: ${describeOp(a.originalOp)}`,
      severity: 40,
    });
  }

  // 3. Quantitative diffs the writer can act on directly.
  const clockIds = new Set([...Object.keys(baseline.clocks), ...Object.keys(intervened.clocks)]);
  for (const id of clockIds) {
    const before = baseline.clocks[id] ?? 0;
    const after = intervened.clocks[id] ?? 0;
    if (before !== after) {
      out.push({
        kind: 'clock_shift',
        description: `the pressure on "${id}" moved from ${before} to ${after}`,
        severity: Math.max(0, Math.min(80, Math.round(Math.abs(after - before)))),
      });
    }
  }

  const tensionDelta = intervened.tension - baseline.tension;
  if (Math.abs(tensionDelta) >= 1) {
    out.push({
      kind: 'tension_shift',
      description: `overall story tension ${tensionDelta > 0 ? 'rose' : 'fell'}, from ${baseline.tension} to ${intervened.tension}`,
      severity: Math.max(0, Math.min(90, Math.round(Math.abs(tensionDelta)))),
    });
  }

  const baselineSetups = new Set(baseline.openSetups);
  const intervenedSetups = new Set(intervened.openSetups);
  let opened = 0;
  let closed = 0;
  for (const id of intervenedSetups) if (!baselineSetups.has(id)) opened++;
  for (const id of baselineSetups) if (!intervenedSetups.has(id)) closed++;
  if (opened > 0) {
    out.push({
      kind: 'setup_opened',
      description: `${opened} unresolved thread${opened === 1 ? '' : 's'} that didn't exist before now ${opened === 1 ? 'is' : 'are'} open`,
      severity: 30,
    });
  }
  if (closed > 0) {
    out.push({
      kind: 'setup_closed',
      description: `${closed} previously open thread${closed === 1 ? '' : 's'} no longer exist${closed === 1 ? 's' : ''} in this timeline`,
      severity: 30,
    });
  }

  const beforeByPair = new Map(baseline.relationships.map(r => [r.pair.join('|'), r]));
  for (const r of intervened.relationships) {
    const before = beforeByPair.get(r.pair.join('|'));
    const beforeSign = Math.sign(before?.netValence ?? 0);
    const afterSign = Math.sign(r.netValence);
    if (beforeSign !== afterSign && (beforeSign !== 0 || afterSign !== 0)) {
      out.push({
        kind: 'relationship_shift',
        description: `the relationship between ${r.pair[0]} and ${r.pair[1]} flips direction: ${afterSign > 0 ? 'now warming' : afterSign < 0 ? 'now cooling' : 'now neutral'}`,
        severity: 50,
      });
    }
  }

  return out;
}

// ── Branches (alternate continuations) ──────────────────────────────────────

// branch/field.ts fabricates a synthetic ADD_FACT (buildSeedIR) with a fresh
// randomUUID() factId whenever the state already has objective-reality facts
// to riff on. That factId is opaque content no scoring logic keys off — but
// it does mean two identical /api/nvm/whatif/explore calls would otherwise
// return non-identical `ops`, which breaks this endpoint's determinism
// contract. Replace any such op's factId with one derived purely from its own
// content, so identical inputs always produce identical output.
function stabilizeOps(ops: StoryOp[], knownFactIds: Set<string>): StoryOp[] {
  return ops.map(op => {
    if (op.op === 'ADD_FACT' && !knownFactIds.has(op.fact.factId)) {
      const contentKey = `${op.fact.subject}|${op.fact.predicate}|${op.fact.object}|${op.fact.addedAtTurn}`;
      const stableId = `whatif-fact-${createHash('sha256').update(contentKey).digest('hex').slice(0, 16)}`;
      return { ...op, fact: { ...op.fact, factId: stableId } };
    }
    return op;
  });
}

/**
 * Maps ranked BranchPacket[] (already sorted best-first by scores.total —
 * server/nvm/branch/field.ts's own weighted blend of novelty/consequence/
 * coherence/viability/screenplayUsefulness/arcAlignment) into the What-If
 * Lab's branch shape. This function does not re-rank or second-guess the
 * field's ordering — that ranking IS the composite score the deliverable asks
 * for. It only adds the two extra numbers (tension, quality) using the same
 * engines the rest of NVM already uses for those (deriveTensionLedger,
 * runQualityEngine), so a branch can be judged on the same axes as any other
 * candidate in the system.
 */
function rankBranches(
  packets: BranchPacket[],
  baseState: NarrativeState,
  sceneIdx: number,
  limit: number,
): ExploreBranch[] {
  const knownFactIds = new Set(baseState.objectiveReality.map(f => f.factId));

  return packets.slice(0, limit).map((p, idx) => {
    const ops = stabilizeOps(p.ops, knownFactIds);
    const afterBranch = applyStoryOps(baseState, ops);
    const tension = Math.round(deriveTensionLedger(afterBranch, sceneIdx + 1).totalTension * 100) / 100;

    // Deterministic id: derived from the branch's own operator + its rank
    // position (both stable given a stable seed), NOT field.ts's randomUUID().
    const branchId = `whatif-${p.operator}-${idx}`;

    const shellIR: NarrativeTransitionIR = {
      transitionId: `whatif-branch-${branchId}`,
      sceneIdx: sceneIdx + 1,
      sceneFunction: 'advance_plot',
      activeMechanisms: [],
      beforeStateHash: stateHash(baseState),
      ops,
      preconditions: [],
      postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 0 },
    };
    const quality = runQualityEngine(shellIR, baseState).score;

    return {
      branchId,
      ops,
      summary: p.description,
      scores: { tension, quality, composite: p.scores.total },
    };
  });
}
