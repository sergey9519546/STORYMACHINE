// Wave 35 — Forward Branch Scorer
// Scores a candidate branch packet on 5 dimensions so the author can pick
// the most valuable next move.
//
// Dimensions (all 0-100):
//   novelty            — how different this branch is from recent commits
//   consequence        — magnitude of state change (facts + beliefs + clocks)
//   coherence          — Tier-1 proof pass rate (100 = fully valid)
//   viability          — quality engine specificity + originality proxy
//   screenplayUsefulness — dramatic value: tension arc fit + revelation potential

import type { StoryOp } from '../ops/StoryOp.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import { runTier1, tier1Passes } from '../proof/kernel.ts';
import { specificityScore } from '../quality/index.ts';

export interface BranchScore {
  novelty: number;            // 0-100
  consequence: number;        // 0-100
  coherence: number;          // 0-100
  viability: number;          // 0-100
  screenplayUsefulness: number; // 0-100
  /** Scene-level arc alignment: does this branch advance character arcs,
   *  pay off setups, or create an emotional polarity shift? */
  arcAlignment: number;       // 0-100
  total: number;              // weighted average
}

/**
 * Score a branch's ops against the current state and recent commit history.
 *
 * @param ops          The candidate branch's StoryOps
 * @param ir           The NarrativeTransitionIR built for this branch
 * @param state        Current NarrativeState
 * @param recentCommits Recent committed ops for novelty comparison
 */
export function scoreBranch(
  ops: StoryOp[],
  ir: NarrativeTransitionIR,
  state: NarrativeState,
  recentCommits: StoryCommit[],
): BranchScore {
  // ── Novelty: Jaccard distance from recent commit ops ──────────────────────
  const novelty = computeNovelty(ops, recentCommits);

  // ── Consequence: magnitude of state impact ────────────────────────────────
  const consequence = computeConsequence(ops);

  // ── Coherence: Tier-1 proof gate ─────────────────────────────────────────
  const tier1 = runTier1(ir, state);
  const passCount = tier1.filter(r => r.pass).length;
  const coherence = tier1.length > 0 ? Math.round((passCount / tier1.length) * 100) : 100;

  // ── Viability: specificity (reuses quality engine) ───────────────────────
  const viability = Math.min(100, Math.round(specificityScore(ops) * 1.5));

  // ── Screenplay usefulness: tension + reveal potential ─────────────────────
  const screenplayUsefulness = computeScreenplayUsefulness(ops, state);

  // ── Arc alignment: does this branch advance arcs, pay off setups, or create
  //    a polarity shift relative to the current emotional state? ─────────────
  const arcAlignment = computeArcAlignment(ops, state);

  // Weighted total — 6 dimensions summing to 1.0
  const total = Math.round(
    novelty * 0.15 +
    consequence * 0.2 +
    coherence * 0.2 +
    viability * 0.15 +
    screenplayUsefulness * 0.15 +
    arcAlignment * 0.15,
  );

  return { novelty, consequence, coherence, viability, screenplayUsefulness, arcAlignment, total };
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

function computeNovelty(ops: StoryOp[], recentCommits: StoryCommit[]): number {
  if (recentCommits.length === 0) return 80; // No history = moderately novel

  // Compare op-kind fingerprint against recent commits
  const candidateKinds = new Set(ops.map(o => o.op));
  const recentKindSets = recentCommits.slice(-5).map(c => new Set(c.ops.map(o => o.op)));

  let minSimilarity = 1;
  for (const recentKinds of recentKindSets) {
    const union = new Set([...candidateKinds, ...recentKinds]).size;
    const intersection = [...candidateKinds].filter(k => recentKinds.has(k)).length;
    const sim = union > 0 ? intersection / union : 0;
    if (sim < minSimilarity) minSimilarity = sim;
  }

  // Also compare content fingerprint for UPDATE_BELIEF ops
  const candidatePropositions = new Set(
    ops.filter(o => o.op === 'UPDATE_BELIEF')
       .map(o => (o as Extract<StoryOp, {op: 'UPDATE_BELIEF'}>).belief.proposition.toLowerCase().slice(0, 40))
  );
  let maxPropOverlap = 0;
  for (const c of recentCommits.slice(-3)) {
    const recentProps = new Set(
      c.ops.filter(o => o.op === 'UPDATE_BELIEF')
           .map(o => (o as Extract<StoryOp, {op: 'UPDATE_BELIEF'}>).belief.proposition.toLowerCase().slice(0, 40))
    );
    if (recentProps.size > 0 && candidatePropositions.size > 0) {
      const overlap = [...candidatePropositions].filter(p => recentProps.has(p)).length;
      const propSim = overlap / Math.max(recentProps.size, candidatePropositions.size);
      if (propSim > maxPropOverlap) maxPropOverlap = propSim;
    }
  }

  const rawNovelty = 1 - Math.max(minSimilarity, maxPropOverlap * 0.5);
  return Math.round(rawNovelty * 100);
}

function computeConsequence(ops: StoryOp[]): number {
  let score = 0;

  for (const op of ops) {
    switch (op.op) {
      case 'ADD_FACT':          score += 8;  break;
      case 'EXPIRE_FACT':       score += 10; break;
      case 'UPDATE_BELIEF': {
        const conf = (op as Extract<StoryOp, {op:'UPDATE_BELIEF'}>).belief.confidence;
        // Weight by confidence so a high-certainty belief shift scores more than a tentative one
        score += 6 * Math.max(0.2, isFinite(conf) ? conf : 0.5);
        break;
      }
      case 'APPRAISE_EMOTION':  score += 5;  break;
      case 'SHIFT_RELATIONSHIP':score += 12; break;
      case 'RAISE_CLOCK': {
        const a = (op as Extract<StoryOp, {op:'RAISE_CLOCK'}>).amount;
        score += (isFinite(a) ? a : 0) * 4;
        break;
      }
      case 'SEED_CLUE':         score += 15; break;
      case 'PAYOFF_SETUP':      score += 20; break;
      case 'ADVANCE_THEME_ARGUMENT': score += 10; break;
      case 'UPDATE_READER_STATE': {
        const d = (op as Extract<StoryOp, {op:'UPDATE_READER_STATE'}>).delta;
        const sv = d.suspense ?? 0; const cv = d.curiosity ?? 0; const iv = d.investment ?? 0;
        score += (Math.abs(isFinite(sv) ? sv : 0) + Math.abs(isFinite(cv) ? cv : 0) + Math.abs(isFinite(iv) ? iv : 0)) * 3;
        break;
      }
      default: score += 2;
    }
  }

  return Math.min(100, score);
}

/**
 * Arc alignment (0–100): rewards scene-level dramatic progress.
 *
 *  - Polarity shift: APPRAISE_EMOTION with a valence opposite to the character's
 *    current dominant emotion (state.characterEmotions). The scene should "turn".
 *  - Goal advancement: ADVANCE_OBJECT_ARC ops signal a character's plan bearing fruit.
 *  - Payoff: PAYOFF_SETUP ops close a dramatic loop that was opened earlier.
 *  - Theme resolution: ADVANCE_THEME_ARGUMENT 'resolve' moves the argument to closure.
 */
function computeArcAlignment(ops: StoryOp[], state: NarrativeState): number {
  let score = 30; // baseline — every branch has some arc value

  const NEGATIVE_EMOTIONS = new Set(['fear', 'distress', 'anger', 'shame', 'contempt']);
  const POSITIVE_EMOTIONS = new Set(['joy', 'trust', 'admiration', 'relief', 'love']);

  // Polarity shift: emotion op with opposite valence to the character's current state
  for (const op of ops) {
    if (op.op !== 'APPRAISE_EMOTION') continue;
    const current = state.characterEmotions[op.charId];
    if (!current) continue;
    const currentNeg = NEGATIVE_EMOTIONS.has(current.dominant);
    const newNeg = NEGATIVE_EMOTIONS.has(op.emotion.dominant);
    const newPos = POSITIVE_EMOTIONS.has(op.emotion.dominant);
    if (currentNeg && newPos) { score += 25; break; } // dark→light turn
    if (!currentNeg && newNeg) { score += 20; break; } // light→dark reversal
  }

  // Object arc advancement = character's plan bears fruit
  score += ops.filter(o => o.op === 'ADVANCE_OBJECT_ARC').length * 15;

  // Payoff setup = dramatic loop closes
  score += ops.filter(o => o.op === 'PAYOFF_SETUP').length * 20;

  // Theme resolution = argument reaches a conclusion
  score += ops.filter(o => o.op === 'ADVANCE_THEME_ARGUMENT' && o.move === 'resolve').length * 15;

  // Clue seeding = future arc primed
  score += ops.filter(o => o.op === 'SEED_CLUE').length * 8;

  // Earned payoff bonus: PAYOFF_SETUP where setupId matches an already-seeded clue
  // in state means this branch closes a real dramatic loop, not just declares one
  const seededClueIds = new Set(state.clues.map(c => c.clueId));
  const earnedPayoffs = ops.filter(o => {
    if (o.op !== 'PAYOFF_SETUP') return false;
    return seededClueIds.has((o as Extract<StoryOp, {op:'PAYOFF_SETUP'}>).setupId);
  }).length;
  score += earnedPayoffs * 12;

  return Math.min(100, score);
}

function computeScreenplayUsefulness(ops: StoryOp[], _state: NarrativeState): number {
  let score = 50; // baseline

  // Raises in tension are screenplay-useful
  const clockOps = ops.filter(o => o.op === 'RAISE_CLOCK');
  score += clockOps.reduce((s, o) => { const a = (o as Extract<StoryOp, {op:'RAISE_CLOCK'}>).amount; return s + (isFinite(a) ? a : 0) * 5; }, 0);

  // Clues are highly screenplay-useful (setup/payoff)
  score += ops.filter(o => o.op === 'SEED_CLUE').length * 15;
  score += ops.filter(o => o.op === 'PAYOFF_SETUP').length * 20;

  // Theme moves advance the screenplay argument
  score += ops.filter(o => o.op === 'ADVANCE_THEME_ARGUMENT').length * 10;

  // Relationship shifts = character drama
  score += ops.filter(o => o.op === 'SHIFT_RELATIONSHIP').length * 12;

  return Math.min(100, Math.max(0, score));
}
