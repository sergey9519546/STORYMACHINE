// Quality Engines (Wave 11 closeout — _CLEVER_MOVES §21).
// These are narrative quality checks that run *below* the proof kernel's hard
// blocks — they produce weighted warnings that the Convergence Loop uses as
// soft penalties to favor better-crafted candidates.
//
// Implemented here:
//   - Specificity score (vague vs. concrete op content)
//   - 5 Dialogue Validators (from the 10-validator spec)
//   - ArcDebt (what emotional beats is the story "owed")
//   - Reveal Readiness (is the audience ready for a reveal?)
//   - Necessity-as-form (every op must earn its place)

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryOp } from '../ops/StoryOp.ts';

// ── Shared result type ────────────────────────────────────────────────────────

export interface QualityWarning {
  engine: string;
  opIdx: number | null;
  rule: string;
  message: string;
  /** 0–100: how much this warning should penalize the candidate. */
  penalty: number;
}

export interface QualityReport {
  warnings: QualityWarning[];
  /** Aggregate quality score: 100 = perfect, 0 = unshippable. */
  score: number;
  specificity: number;     // 0–1
  arcDebt: string[];       // emotional beats owed
  revealReady: boolean;
  necessityScore: number;  // 0–1 (1 = every op essential)
}

// ── 1. Specificity Engine ─────────────────────────────────────────────────────

// Vague trigger words that signal generic ("said something", "felt bad")
const VAGUE_TERMS = [
  'something', 'things', 'stuff', 'happened', 'felt', 'said', 'did',
  'went', 'came', 'got', 'very', 'really', 'kind of', 'sort of',
];

function opText(op: StoryOp): string {
  switch (op.op) {
    case 'ADD_FACT':           return `${op.fact.subject} ${op.fact.predicate} ${op.fact.object}`;
    case 'UPDATE_BELIEF':      return op.belief.proposition;
    case 'APPRAISE_EMOTION':   return `${op.emotion.dominant}`;
    case 'SHIFT_RELATIONSHIP': return op.delta.reason;
    case 'RECORD_VISUAL_FACT': return op.fact;
    case 'RECORD_SONIC_FACT':  return op.fact;
    case 'ADVANCE_THEME_ARGUMENT': return `${op.claimId} ${op.move}`;
    default:                   return '';
  }
}

export function specificityScore(ops: StoryOp[]): number {
  if (ops.length === 0) return 1;
  let totalScore = 0;
  for (const op of ops) {
    const text = opText(op).toLowerCase();
    if (!text) { totalScore += 1; continue; }
    const vagueCount = VAGUE_TERMS.filter(t => text.includes(t)).length;
    const wordCount = text.split(/\s+/).length;
    // Specificity: 1.0 = no vague terms; penalize proportionally
    const opScore = Math.max(0, 1 - (vagueCount * 0.25) - (wordCount < 3 ? 0.3 : 0));
    totalScore += opScore;
  }
  return totalScore / ops.length;
}

// ── 2. Dialogue Validators (5 of 10) ─────────────────────────────────────────

export function dialogueWarnings(ir: NarrativeTransitionIR, _state: NarrativeState): QualityWarning[] {
  const warnings: QualityWarning[] = [];

  ir.ops.forEach((op, i) => {
    // DV1: On-the-nose — UPDATE_BELIEF with low-confidence told belief is a sign of
    //      forced exposition ("she told him everything")
    if (op.op === 'UPDATE_BELIEF' && op.belief.source === 'told' && op.belief.confidence > 0.95) {
      warnings.push({
        engine: 'dialogue_validator', opIdx: i, rule: 'DV1_ON_THE_NOSE',
        message: `UPDATE_BELIEF "${op.belief.proposition.slice(0, 40)}" is told at full confidence — characters rarely confess perfectly`,
        penalty: 20,
      });
    }

    // DV2: Redundant belief — if the same proposition was already in state beliefs
    if (op.op === 'UPDATE_BELIEF') {
      const existing = _state.characterBeliefs[op.charId] ?? [];
      if (existing.some(b => b.proposition === op.belief.proposition)) {
        warnings.push({
          engine: 'dialogue_validator', opIdx: i, rule: 'DV2_REDUNDANT_BELIEF',
          message: `UPDATE_BELIEF duplicates an existing belief for ${op.charId}`,
          penalty: 15,
        });
      }
    }

    // DV3: Emotion without cause — APPRAISE_EMOTION without a prior belief/fact change in same IR
    if (op.op === 'APPRAISE_EMOTION') {
      const priorCausal = ir.ops.slice(0, i).some(
        p => p.op === 'UPDATE_BELIEF' || p.op === 'ADD_FACT' || p.op === 'SHIFT_RELATIONSHIP',
      );
      if (!priorCausal && _state.objectiveReality.length === 0) {
        warnings.push({
          engine: 'dialogue_validator', opIdx: i, rule: 'DV3_UNMOTIVATED_EMOTION',
          message: `APPRAISE_EMOTION for ${op.charId} has no causal predecessor in this IR or state`,
          penalty: 25,
        });
      }
    }

    // DV4: Relationship shift without emotional grounding — SHIFT_RELATIONSHIP
    //       that doesn't follow a belief or emotion update is structurally hollow
    if (op.op === 'SHIFT_RELATIONSHIP') {
      const priorEmotion = ir.ops.slice(0, i).some(
        p => p.op === 'APPRAISE_EMOTION' || p.op === 'UPDATE_BELIEF',
      );
      if (!priorEmotion) {
        warnings.push({
          engine: 'dialogue_validator', opIdx: i, rule: 'DV4_UNGROUNDED_RELATIONSHIP',
          message: `SHIFT_RELATIONSHIP between ${op.pair[0]} and ${op.pair[1]} is not preceded by belief or emotion change`,
          penalty: 18,
        });
      }
    }

    // DV5: Empty transition — ops that touch no character (only world facts) produce
    //       a scene with no human presence (a dead scene)
    if (i === ir.ops.length - 1) {
      const hasCharOp = ir.ops.some(
        p => p.op === 'UPDATE_BELIEF' || p.op === 'APPRAISE_EMOTION' ||
             p.op === 'SHIFT_RELATIONSHIP',
      );
      if (!hasCharOp && ir.sceneIdx > 0) {
        warnings.push({
          engine: 'dialogue_validator', opIdx: null, rule: 'DV5_NO_HUMAN_PRESENCE',
          message: 'Scene has no character belief/emotion/relationship ops — no human presence',
          penalty: 30,
        });
      }
    }
  });

  return warnings;
}

// ── 3. ArcDebt ────────────────────────────────────────────────────────────────

/** The emotional beats the story is "owed" based on what has been set up. */
export function computeArcDebt(state: NarrativeState, currentScene: number): string[] {
  const debts: string[] = [];

  // If clues have been seeded but no payoffs yet fired, debt accumulates
  if (state.clues.length >= 2 && state.payoffs.length === 0 && currentScene >= 3) {
    debts.push(`${state.clues.length} clues seeded but zero payoffs — mystery engine owes a reveal`);
  }

  // If high suspense but no relationship shifts, the tension has no human outlet
  if (state.audienceState.suspense > 70 && Object.keys(state.relationships).length === 0) {
    debts.push('High suspense with no relationship dynamics — needs a confrontation');
  }

  // If characters have many beliefs but no theme argument advanced, intellectual debt
  const totalBeliefs = Object.values(state.characterBeliefs).flat().length;
  if (totalBeliefs >= 4 && state.themeArgument.length === 0) {
    debts.push('Rich belief landscape but no theme argument started — needs a claim');
  }

  // If emotional peaks (fear/distress > 70) but no relationship repair, unresolved arc
  for (const [charId, emo] of Object.entries(state.characterEmotions)) {
    if ((emo.fear + emo.distress) > 100) {
      const relCount = Object.keys(state.relationships).filter(k => k.includes(charId)).length;
      if (relCount === 0) {
        debts.push(`${charId} is in peak distress/fear but has no relationship arc — needs human contact`);
      }
    }
  }

  return debts;
}

// ── 4. Reveal Readiness ───────────────────────────────────────────────────────

/**
 * Is the audience ready for a reveal at this scene?
 * Ready means: ≥2 clues planted, suspense ≥50, at least 1 dramatic irony layer.
 */
export function revealReady(state: NarrativeState): { ready: boolean; score: number; gaps: string[] } {
  const gaps: string[] = [];
  let score = 0;

  if (state.clues.length >= 2) score += 40; else gaps.push(`only ${state.clues.length} clues (need ≥2)`);
  if (state.audienceState.suspense >= 50) score += 30; else gaps.push(`suspense ${state.audienceState.suspense} (need ≥50)`);

  const ironyLayers = Object.values(state.characterBeliefs).flat().filter(b => b.source === 'told').length;
  if (ironyLayers >= 1) score += 30; else gaps.push('no dramatic irony layers (no "told" beliefs)');

  return { ready: score >= 80, score, gaps };
}

// ── 5. Necessity-as-form ─────────────────────────────────────────────────────

/**
 * Score how necessary each op is (0–1: 1 = every op is essential).
 * An op is "unnecessary" if it is:
 *   - A fact that is never referenced by a belief in the same IR
 *   - A WAIT-equivalent (no-op): empty record ops
 *   - A duplicate emotion appraisal for the same character
 */
export function necessityScore(ops: StoryOp[]): number {
  if (ops.length === 0) return 1;
  const necessary = ops.filter((op, i) => {
    if (op.op === 'ADD_FACT') {
      // Is this fact referenced by a later belief in the same IR?
      const referencedLater = ops.slice(i + 1).some(
        later => later.op === 'UPDATE_BELIEF' &&
                 later.belief.proposition.toLowerCase().includes(op.fact.factId.toLowerCase()),
      );
      // Also keep if it's the only ADD_FACT (establishing scene)
      return referencedLater || ops.filter(o => o.op === 'ADD_FACT').length === 1;
    }
    if (op.op === 'APPRAISE_EMOTION') {
      // Duplicate emotion for same char = unnecessary
      const earlier = ops.slice(0, i).some(
        e => e.op === 'APPRAISE_EMOTION' && e.charId === op.charId && e.emotion.dominant === op.emotion.dominant,
      );
      return !earlier;
    }
    return true;
  });
  return necessary.length / ops.length;
}

// ── Main: runQualityEngine ────────────────────────────────────────────────────

/**
 * Run all quality engines on a candidate IR + state.
 * Returns a QualityReport with composite score (100 = perfect).
 */
export function runQualityEngine(ir: NarrativeTransitionIR, state: NarrativeState): QualityReport {
  const warnings: QualityWarning[] = [];

  // Specificity
  const spec = specificityScore(ir.ops);
  if (spec < 0.6) {
    warnings.push({
      engine: 'specificity', opIdx: null, rule: 'LOW_SPECIFICITY',
      message: `Specificity score ${spec.toFixed(2)} — ops are too vague`,
      penalty: Math.round((0.6 - spec) * 100),
    });
  }

  // Dialogue validators
  warnings.push(...dialogueWarnings(ir, state));

  // Necessity
  const necessity = necessityScore(ir.ops);
  if (necessity < 0.8) {
    warnings.push({
      engine: 'necessity', opIdx: null, rule: 'UNNECESSARY_OPS',
      message: `Necessity score ${necessity.toFixed(2)} — some ops are redundant`,
      penalty: Math.round((0.8 - necessity) * 50),
    });
  }

  // Arc debt
  const arcDebt = computeArcDebt(state, ir.sceneIdx);

  // Reveal readiness
  const rr = revealReady(state);

  // Composite score: start at 100, subtract penalties
  const totalPenalty = warnings.reduce((s, w) => s + w.penalty, 0);
  const score = Math.max(0, 100 - totalPenalty);

  return {
    warnings,
    score,
    specificity: spec,
    arcDebt,
    revealReady: rr.ready,
    necessityScore: necessity,
  };
}
