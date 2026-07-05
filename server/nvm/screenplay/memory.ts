// Wave 37 — Live Screenplay Memory
// Annotates each StoryCommit with a screenplay-scene record: slug, purpose,
// dramatic turn, revelation, emotional shift, visual beats, dialogue highlights,
// and unresolved carryovers — built deterministically from the commit's ops.
//
// This is richer than the cold exporter (project/index.ts) because it records
// WHY each scene exists structurally, not just WHAT happened.

import type { StoryOp } from '../ops/StoryOp.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScenePurpose =
  | 'establish_world'
  | 'introduce_conflict'
  | 'complicate'
  | 'raise_stakes'
  | 'revelation'
  | 'turning_point'
  | 'climax'
  | 'resolution'
  | 'character_moment';

export interface ScreenplaySceneRecord {
  commitId: string;
  sceneIdx: number;
  /** INT./EXT. style slug */
  slug: string;
  purpose: ScenePurpose;
  /** The main dramatic thing that changes this scene */
  dramaticTurn: string;
  /** Any revelation (new belief surfaced to audience) */
  revelation: string | null;
  /** Net emotional shift (positive/negative/neutral) */
  emotionalShift: 'positive' | 'negative' | 'neutral';
  /** Prominent visual beats (from RECORD_VISUAL_FACT or EXAMINE ops) */
  visualBeats: string[];
  /** Belief propositions spoken (from UPDATE_BELIEF ops with told source) */
  dialogueHighlights: string[];
  /** Clues planted but not yet resolved (SEED_CLUE without PAYOFF_SETUP) */
  unresolvedClues: string[];
  /** Clue IDs seeded (SEED_CLUE) in this specific scene */
  seededClueIds: string[];
  /** Setup IDs paid off (PAYOFF_SETUP) in this specific scene */
  payoffSetupIds: string[];
  /** Whether a clock was raised this scene */
  clockRaised: boolean;
  /** Net clock pressure added this scene (sum of RAISE_CLOCK amounts) */
  clockDelta: number;
  /** Total suspense delta from UPDATE_READER_STATE */
  suspenseDelta: number;
  /** Total curiosity delta */
  curiosityDelta: number;
  /** Relationship shifts in this scene (from SHIFT_RELATIONSHIP ops). Each entry
   *  is a sorted pair key + signed amount, used by the relationship-arc pass.
   *  The builder always populates this; optional only so legacy/test fixtures that
   *  predate the field still typecheck. Consumers should treat absence as []. */
  relationshipShifts?: Array<{ pairKey: string; dimension: string; amount: number }>;
  /** Question-answer latency (Wave 1182 — Program v2 Type 1 signal channel).
   *  Substantive dialogue questions raised/resolved this scene, lexically
   *  fingerprinted and matched forward against later lines anywhere in the
   *  document (see fountain-analyzer.ts's detectQuestionLatency — the only
   *  builder that currently populates these). questionsResolvedSameScene is
   *  always <= questionsResolved (the subset resolved before the scene that
   *  raised them ends); questionsUnresolved counts this scene's questions
   *  that are never matched anywhere in the document. Optional only so
   *  legacy/test fixtures and the ops-derived path (StoryOps carry no raw
   *  dialogue text to lex-match against) still typecheck; consumers should
   *  treat absence as 0 for every field, matching the relationshipShifts
   *  precedent above. */
  questionsRaised?: number;
  questionsResolved?: number;
  questionsResolvedSameScene?: number;
  questionsUnresolved?: number;
  /** createdAt timestamp */
  createdAt: number;
}

// ── Annotation builder ────────────────────────────────────────────────────────

/**
 * Build a ScreenplaySceneRecord from a StoryCommit's ops.
 * Deterministic: same commit always produces the same record.
 */
export function annotateCommit(commit: StoryCommit): ScreenplaySceneRecord {
  const ops = commit.ops;

  // ── Visual beats ──────────────────────────────────────────────────────────
  const visualBeats: string[] = [];
  for (const op of ops) {
    if (op.op === 'RECORD_VISUAL_FACT') visualBeats.push(op.fact);
    if (op.op === 'ADD_FACT' && (op as Extract<StoryOp, {op:'ADD_FACT'}>).fact.predicate === 'examines') {
      visualBeats.push(`${op.fact.subject} examines ${op.fact.object}`);
    }
  }

  // ── Dialogue highlights (told beliefs) ───────────────────────────────────
  const dialogueHighlights = ops
    .filter(o => o.op === 'UPDATE_BELIEF' &&
      (o as Extract<StoryOp, {op:'UPDATE_BELIEF'}>).belief.source === 'told')
    .map(o => (o as Extract<StoryOp, {op:'UPDATE_BELIEF'}>).belief.proposition)
    .slice(0, 3);

  // ── Revelation: witnessed beliefs (audience learns truth) ─────────────────
  const revelationBeliefs = ops
    .filter(o => o.op === 'UPDATE_BELIEF' &&
      (o as Extract<StoryOp, {op:'UPDATE_BELIEF'}>).belief.source === 'witnessed')
    .map(o => (o as Extract<StoryOp, {op:'UPDATE_BELIEF'}>).belief.proposition);
  const revelation = revelationBeliefs.length > 0 ? revelationBeliefs[0] : null;

  // ── Unresolved clues (seeds without payoffs in this commit) ───────────────
  const seededClueIds = new Set(
    ops.filter(o => o.op === 'SEED_CLUE')
       .map(o => (o as Extract<StoryOp, {op:'SEED_CLUE'}>).clueId)
  );
  const paidOffSetupIds = new Set(
    ops.filter(o => o.op === 'PAYOFF_SETUP')
       .map(o => (o as Extract<StoryOp, {op:'PAYOFF_SETUP'}>).setupId)
  );
  const unresolvedClues = [...seededClueIds].filter(id => !paidOffSetupIds.has(id));

  // ── Emotional shift ───────────────────────────────────────────────────────
  const suspenseDelta = ops
    .filter(o => o.op === 'UPDATE_READER_STATE')
    .reduce((s, o) => { const v = (o as Extract<StoryOp, {op:'UPDATE_READER_STATE'}>).delta.suspense ?? 0; return s + (isFinite(v) ? v : 0); }, 0);
  const curiosityDelta = ops
    .filter(o => o.op === 'UPDATE_READER_STATE')
    .reduce((s, o) => { const v = (o as Extract<StoryOp, {op:'UPDATE_READER_STATE'}>).delta.curiosity ?? 0; return s + (isFinite(v) ? v : 0); }, 0);
  const emotionOps = ops.filter(o => o.op === 'APPRAISE_EMOTION');
  const negativeEmotions = emotionOps.filter(o =>
    ['distress', 'anger', 'fear', 'shame'].includes(
      (o as Extract<StoryOp, {op:'APPRAISE_EMOTION'}>).emotion.dominant ?? ''
    )
  );
  const emotionalShift: ScreenplaySceneRecord['emotionalShift'] =
    negativeEmotions.length > emotionOps.length / 2 ? 'negative' :
    emotionOps.length > 0 ? 'positive' : 'neutral';

  // ── Relationship shifts ───────────────────────────────────────────────────
  const relationshipShifts: ScreenplaySceneRecord['relationshipShifts'] = [];
  for (const o of ops) {
    if (o.op !== 'SHIFT_RELATIONSHIP') continue;
    const rel = o as Extract<StoryOp, { op: 'SHIFT_RELATIONSHIP' }>;
    const pair = rel.pair;
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const pairKey = [pair[0], pair[1]].sort().join('|');
    const amount = typeof rel.delta?.amount === 'number' && isFinite(rel.delta.amount) ? rel.delta.amount : 0;
    const dimension = typeof rel.delta?.dimension === 'string' ? rel.delta.dimension : 'affinity';
    relationshipShifts.push({ pairKey, dimension, amount });
  }

  // ── Clock detection ───────────────────────────────────────────────────────
  const clockOpsLocal = ops.filter(o => o.op === 'RAISE_CLOCK');
  const clockRaised = clockOpsLocal.length > 0;
  const clockDelta = clockOpsLocal.reduce(
    (s, o) => { const a = (o as Extract<StoryOp, {op:'RAISE_CLOCK'}>).amount; return s + (isFinite(a) ? a : 0); }, 0,
  );

  // ── Purpose ───────────────────────────────────────────────────────────────
  const purpose = derivePurpose(ops, commit.sceneIdx);

  // ── Dramatic turn ─────────────────────────────────────────────────────────
  const dramaticTurn = deriveDramaticTurn(ops, purpose);

  // ── Slug ──────────────────────────────────────────────────────────────────
  const slug = deriveSlug(ops, commit.sceneIdx);

  return {
    commitId: commit.commitId,
    sceneIdx: commit.sceneIdx,
    slug,
    purpose,
    dramaticTurn,
    revelation,
    emotionalShift,
    visualBeats,
    dialogueHighlights,
    unresolvedClues,
    seededClueIds: [...seededClueIds],
    payoffSetupIds: [...paidOffSetupIds],
    clockRaised,
    clockDelta,
    suspenseDelta,
    curiosityDelta,
    relationshipShifts,
    createdAt: commit.createdAt,
  };
}

/**
 * Build the full screenplay memory: one record per non-reverted commit.
 */
export function buildScreenplayMemory(commits: StoryCommit[]): ScreenplaySceneRecord[] {
  const active = commits.filter(c => !c.reverted);

  // Two-pass: first collect ALL paid-off setupIds across the full ledger,
  // then pass that set to annotateCommit so clues resolved in later scenes
  // are correctly removed from earlier scenes' unresolvedClues lists.
  const allPaidOffIds = new Set<string>();
  for (const c of active) {
    for (const op of c.ops) {
      if (op.op === 'PAYOFF_SETUP') allPaidOffIds.add(op.setupId);
    }
  }

  return active.map(c => {
    const record = annotateCommit(c);
    // Remove globally-paid-off clues from this record's unresolved list.
    record.unresolvedClues = record.unresolvedClues.filter(id => !allPaidOffIds.has(id));
    return record;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function derivePurpose(ops: StoryOp[], sceneIdx: number): ScenePurpose {
  if (sceneIdx === 0) return 'establish_world';
  if (ops.some(o => o.op === 'PAYOFF_SETUP')) return 'revelation';
  if (ops.some(o => o.op === 'SEED_CLUE')) return 'introduce_conflict';
  const clockOps = ops.filter(o => o.op === 'RAISE_CLOCK');
  if (clockOps.length > 0) {
    const totalAmount = clockOps.reduce((s, o) => { const a = (o as Extract<StoryOp, {op:'RAISE_CLOCK'}>).amount; return s + (isFinite(a) ? a : 0); }, 0);
    if (totalAmount >= 3) return 'climax';
    if (totalAmount >= 2) return 'raise_stakes';
    return 'complicate';
  }
  if (ops.some(o => o.op === 'SHIFT_RELATIONSHIP')) return 'character_moment';
  if (ops.some(o => o.op === 'ADVANCE_THEME_ARGUMENT')) return 'turning_point';
  return 'character_moment';
}

function deriveDramaticTurn(ops: StoryOp[], purpose: ScenePurpose): string {
  const facts = ops.filter(o => o.op === 'ADD_FACT').map(o =>
    `${(o as Extract<StoryOp, {op:'ADD_FACT'}>).fact.subject} ${(o as Extract<StoryOp, {op:'ADD_FACT'}>).fact.predicate} ${(o as Extract<StoryOp, {op:'ADD_FACT'}>).fact.object}`
  );
  if (facts.length > 0) return facts[0].slice(0, 80);

  const beliefs = ops.filter(o => o.op === 'UPDATE_BELIEF');
  if (beliefs.length > 0) {
    const b = (beliefs[0] as Extract<StoryOp, {op:'UPDATE_BELIEF'}>).belief;
    return b.proposition.slice(0, 80);
  }

  return `Scene ${purpose.replace(/_/g, ' ')}`;
}

function deriveSlug(ops: StoryOp[], sceneIdx: number): string {
  // Look for location in ADD_FACT with predicate 'moves_to'
  const relocationFact = ops
    .filter(o => o.op === 'ADD_FACT')
    .find(o => (o as Extract<StoryOp, {op:'ADD_FACT'}>).fact.predicate === 'moves_to');
  if (relocationFact) {
    const location = (relocationFact as Extract<StoryOp, {op:'ADD_FACT'}>).fact.object.toUpperCase();
    return `INT. ${location} — SCENE ${sceneIdx + 1}`;
  }
  return `INT. UNKNOWN — SCENE ${sceneIdx + 1}`;
}
