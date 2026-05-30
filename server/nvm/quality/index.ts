// Quality Engines (Wave 11 closeout — _CLEVER_MOVES §21).
// These are narrative quality checks that run *below* the proof kernel's hard
// blocks — they produce weighted warnings that the Convergence Loop uses as
// soft penalties to favor better-crafted candidates.
//
// Implemented:
//   - Specificity score (vague vs. concrete op content)
//   - 10 Dialogue Validators (full spec)
//   - ArcDebt (what emotional beats is the story "owed")
//   - Reveal Readiness (is the audience ready for a reveal?)
//   - Necessity-as-form (every op must earn its place)
//   - Burrows's Delta (stylometric voice diversity)
//   - RelationshipRepairProof (broken relationships without repair arcs)
//   - Causal Plot Graph (dependency graph from IR causalLinks)
//   - Propp's Morphology (Proppian narrative function analysis)

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryOp } from '../ops/StoryOp.ts';

// ── Shared result types ───────────────────────────────────────────────────────

export interface QualityWarning {
  engine: string;
  opIdx: number | null;
  rule: string;
  message: string;
  /** 0–100: how much this warning should penalize the candidate. */
  penalty: number;
}

// ── Causal Plot Graph ─────────────────────────────────────────────────────────

export interface CausalPlotNode {
  opIdx: number;
  opKind: StoryOp['op'];
}

export interface CausalPlotEdge {
  from: string;     // causedBy id (factId | beliefId | charId declared in IR.causalLinks)
  toOpIdx: number;
}

export interface CausalPlotGraph {
  nodes: CausalPlotNode[];
  edges: CausalPlotEdge[];
  rootOps: number[];   // opIdx with no declared causal predecessors
  leafOps: number[];   // opIdx that are never declared as a cause of another op
}

// ── Propp's Morphology ────────────────────────────────────────────────────────

export type ProppStage =
  | 'preparation'   // world-building: ADD_FACT, RECORD_VISUAL_FACT/SONIC
  | 'complication'  // lack/villainy: fear/distress emotion, RAISE_CLOCK
  | 'mediation'     // hero receives call: told UPDATE_BELIEF
  | 'departure'     // hero commits: ADVANCE_OBJECT_ARC
  | 'ordeal'        // battle/confrontation: negative SHIFT_RELATIONSHIP
  | 'consequence'   // result: positive SHIFT_RELATIONSHIP, PAYOFF_SETUP
  | 'resolution';   // return: ADVANCE_THEME_ARGUMENT 'resolve'

export interface ProppAnalysis {
  present: ProppStage[];
  absent: ProppStage[];
  /** 0–1 fraction of 7 Proppian stages present in this IR. */
  coverage: number;
}

// ── QualityReport ─────────────────────────────────────────────────────────────

export interface QualityReport {
  warnings: QualityWarning[];
  /** Aggregate quality score: 100 = perfect, 0 = unshippable. */
  score: number;
  specificity: number;        // 0–1
  arcDebt: string[];          // emotional beats owed
  revealReady: boolean;
  necessityScore: number;     // 0–1 (1 = every op essential)
  /** 0 = each character has a distinct voice; 1 = all voices identical. */
  burrowsDelta: number;
  causalGraph: CausalPlotGraph;
  proppAnalysis: ProppAnalysis;
  /** Relationship pairs that have unresolved negative arcs in this scene. */
  repairGaps: string[];
}

// ── 1. Specificity Engine ─────────────────────────────────────────────────────

const VAGUE_TERMS = [
  'something', 'things', 'stuff', 'happened', 'felt', 'said', 'did',
  'went', 'came', 'got', 'very', 'really', 'kind of', 'sort of',
];

function opText(op: StoryOp): string {
  switch (op.op) {
    case 'ADD_FACT':               return `${op.fact.subject} ${op.fact.predicate} ${op.fact.object}`;
    case 'UPDATE_BELIEF':          return op.belief.proposition;
    case 'APPRAISE_EMOTION':       return `${op.emotion.dominant}`;
    case 'SHIFT_RELATIONSHIP':     return op.delta.reason;
    case 'RECORD_VISUAL_FACT':     return op.fact;
    case 'RECORD_SONIC_FACT':      return op.fact;
    case 'ADVANCE_THEME_ARGUMENT': return `${op.claimId} ${op.move}`;
    default:                       return '';
  }
}

export function specificityScore(ops: StoryOp[]): number {
  if (ops.length === 0) return 1;
  let totalScore = 0;
  let scoredOps = 0;
  for (const op of ops) {
    const text = opText(op).toLowerCase();
    if (!text) continue; // skip ops with no extractable text (SEED_CLUE, RAISE_CLOCK, etc.)
    scoredOps++;
    const vagueCount = VAGUE_TERMS.filter(t => text.includes(t)).length;
    const wordCount = text.split(/\s+/).length;
    const opScore = Math.max(0, 1 - (vagueCount * 0.25) - (wordCount < 3 ? 0.3 : 0));
    totalScore += opScore;
  }
  return scoredOps === 0 ? 1 : totalScore / scoredOps;
}

// ── 2. Dialogue Validators (all 10) ──────────────────────────────────────────

export function dialogueWarnings(ir: NarrativeTransitionIR, state: NarrativeState): QualityWarning[] {
  const warnings: QualityWarning[] = [];

  ir.ops.forEach((op, i) => {
    // DV1: On-the-nose — told belief at full confidence is forced exposition
    if (op.op === 'UPDATE_BELIEF' && op.belief.source === 'told' && op.belief.confidence > 0.95) {
      warnings.push({
        engine: 'dialogue_validator', opIdx: i, rule: 'DV1_ON_THE_NOSE',
        message: `UPDATE_BELIEF "${op.belief.proposition.slice(0, 40)}" is told at full confidence — characters rarely confess perfectly`,
        penalty: 20,
      });
    }

    // DV2: Redundant belief — same proposition already in state
    if (op.op === 'UPDATE_BELIEF') {
      const existing = state.characterBeliefs[op.charId] ?? [];
      if (existing.some(b => b.proposition === op.belief.proposition)) {
        warnings.push({
          engine: 'dialogue_validator', opIdx: i, rule: 'DV2_REDUNDANT_BELIEF',
          message: `UPDATE_BELIEF duplicates an existing belief for ${op.charId}`,
          penalty: 15,
        });
      }
    }

    // DV3: Unmotivated emotion — no prior belief/fact change in same IR.
    // Only fires when BOTH: (a) no causal op precedes in this IR AND (b) the character
    // has no prior beliefs AND the world has no facts. A character can be emotionally
    // motivated by their existing beliefs or the pre-existing world state; checking
    // objectiveReality alone was too strict and produced false positives.
    if (op.op === 'APPRAISE_EMOTION') {
      const priorCausal = ir.ops.slice(0, i).some(
        p => p.op === 'UPDATE_BELIEF' || p.op === 'ADD_FACT' || p.op === 'SHIFT_RELATIONSHIP',
      );
      const charBeliefs = state.characterBeliefs[op.charId] ?? [];
      const noStateGrounding = state.objectiveReality.length === 0 && charBeliefs.length === 0;
      if (!priorCausal && noStateGrounding) {
        warnings.push({
          engine: 'dialogue_validator', opIdx: i, rule: 'DV3_UNMOTIVATED_EMOTION',
          message: `APPRAISE_EMOTION for ${op.charId} has no causal predecessor in this IR or prior state`,
          penalty: 25,
        });
      }
    }

    // DV4: Ungrounded relationship shift — no prior belief/emotion update
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

    // DV5: No human presence — scene only has world-fact ops
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

    // DV7: Tension drop without resolution — emotion intensity falls sharply without relationship repair
    if (op.op === 'APPRAISE_EMOTION') {
      // Check state first, then look for a prior APPRAISE_EMOTION in this same IR
      let priorIntensity = state.characterEmotions[op.charId]?.intensity ?? 0;
      for (let j = i - 1; j >= 0; j--) {
        const prev = ir.ops[j];
        if (prev.op === 'APPRAISE_EMOTION' && prev.charId === op.charId) {
          priorIntensity = prev.emotion.intensity;
          break;
        }
      }
      if (priorIntensity > 0 && op.emotion.intensity < priorIntensity - 20) {
        const hasRepair = ir.ops.some(
          o => o.op === 'SHIFT_RELATIONSHIP' && o.delta.amount > 0.2 &&
               o.pair.includes(op.charId),
        );
        if (!hasRepair) {
          warnings.push({
            engine: 'dialogue_validator', opIdx: i, rule: 'DV7_UNMOTIVATED_TENSION_DROP',
            message: `${op.charId} intensity drops ${priorIntensity}→${op.emotion.intensity} without relationship resolution`,
            penalty: 20,
          });
        }
      }
    }

    // DV8: Abrupt relationship reversal — large shift without prior emotion for either party
    if (op.op === 'SHIFT_RELATIONSHIP' && Math.abs(op.delta.amount) > 0.5) {
      const [a, b] = op.pair;
      const hasEmotion = ir.ops.slice(0, i).some(
        o => o.op === 'APPRAISE_EMOTION' && (o.charId === a || o.charId === b),
      );
      if (!hasEmotion) {
        warnings.push({
          engine: 'dialogue_validator', opIdx: i, rule: 'DV8_ABRUPT_RELATIONSHIP',
          message: `SHIFT_RELATIONSHIP ${a}↔${b} amount=${op.delta.amount.toFixed(2)} is abrupt (no prior emotion for either party)`,
          penalty: 22,
        });
      }
    }

    // DV9: Theme claim without grounding
    if (op.op === 'ADVANCE_THEME_ARGUMENT' &&
        (op.move === 'resolve' || op.move === 'support')) {
      const hasGrounding = ir.ops.some(
        o => o.op === 'ADD_FACT' || o.op === 'UPDATE_BELIEF',
      );
      const stateHasContent = state.objectiveReality.length > 0 ||
        Object.values(state.characterBeliefs).flat().length > 0;
      if (!hasGrounding && !stateHasContent) {
        warnings.push({
          engine: 'dialogue_validator', opIdx: i, rule: 'DV9_UNGROUNDED_THEME',
          message: `ADVANCE_THEME_ARGUMENT '${op.move}' for "${op.claimId}" without factual/belief grounding`,
          penalty: 18,
        });
      }
    }
  });

  // DV6: Character monologue — same charId dominates ≥3 consecutive character ops
  const charOps = ir.ops.map((op, idx) => ({
    idx,
    charId: (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION') ? op.charId : null,
  })).filter(e => e.charId !== null);

  let runLen = 1;
  for (let k = 1; k < charOps.length; k++) {
    if (charOps[k].charId === charOps[k - 1].charId) {
      runLen++;
      if (runLen === 3) {
        warnings.push({
          engine: 'dialogue_validator', opIdx: charOps[k].idx, rule: 'DV6_CHARACTER_MONOLOGUE',
          message: `${charOps[k].charId} dominates 3+ consecutive character ops — other voices absent`,
          penalty: 15,
        });
      }
    } else {
      runLen = 1;
    }
  }

  // DV10: Structural uniformity — all ops the same kind
  if (ir.ops.length >= 4) {
    const kinds = new Set(ir.ops.map(o => o.op));
    if (kinds.size === 1) {
      warnings.push({
        engine: 'dialogue_validator', opIdx: null, rule: 'DV10_STRUCTURAL_UNIFORMITY',
        message: `All ${ir.ops.length} ops are ${[...kinds][0]} — scene lacks structural variety`,
        penalty: 25,
      });
    }
  }

  return warnings;
}

// ── 3. ArcDebt ────────────────────────────────────────────────────────────────

export function computeArcDebt(state: NarrativeState, currentScene: number): string[] {
  const debts: string[] = [];

  if (state.clues.length >= 2 && state.payoffs.length === 0 && currentScene >= 3) {
    debts.push(`${state.clues.length} clues seeded but zero payoffs — mystery engine owes a reveal`);
  }

  if (state.audienceState.suspense > 70 && Object.keys(state.relationships).length === 0) {
    debts.push('High suspense with no relationship dynamics — needs a confrontation');
  }

  const totalBeliefs = Object.values(state.characterBeliefs).flat().length;
  if (totalBeliefs >= 4 && state.themeArgument.length === 0) {
    debts.push('Rich belief landscape but no theme argument started — needs a claim');
  }

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

export function necessityScore(ops: StoryOp[]): number {
  if (ops.length === 0) return 1;
  const necessary = ops.filter((op, i) => {
    if (op.op === 'ADD_FACT') {
      // A fact is necessary if a later op structurally references the same subject/object,
      // or if causal links declare it as a cause. Testing prose inclusion of the factId
      // (a UUID) was always false, scoring every multi-fact scene as "padded".
      const { subject, object: factObj } = op.fact;
      const referencedLater = ops.slice(i + 1).some(later => {
        if (later.op === 'UPDATE_BELIEF') {
          return later.belief.proposition.toLowerCase().includes(subject.toLowerCase()) ||
                 later.belief.proposition.toLowerCase().includes(factObj.toLowerCase());
        }
        if (later.op === 'ADD_FACT') {
          return later.fact.subject === factObj || later.fact.object === subject;
        }
        if (later.op === 'APPRAISE_EMOTION') {
          return later.charId === subject;
        }
        return false;
      });
      return referencedLater || ops.filter(o => o.op === 'ADD_FACT').length === 1;
    }
    if (op.op === 'APPRAISE_EMOTION') {
      const earlier = ops.slice(0, i).some(
        e => e.op === 'APPRAISE_EMOTION' && e.charId === op.charId &&
             e.emotion.dominant === op.emotion.dominant,
      );
      return !earlier;
    }
    return true;
  });
  return necessary.length / ops.length;
}

// ── 6. Burrows's Delta (voice diversity) ─────────────────────────────────────
// Measures stylometric overlap between characters' proposition vocabulary.
// 0 = every character has a completely distinct voice; 1 = all voices identical.

export function burrowsDelta(ops: StoryOp[]): number {
  const charWords = new Map<string, Set<string>>();
  for (const op of ops) {
    if (op.op !== 'UPDATE_BELIEF') continue;
    const words = new Set(
      op.belief.proposition.toLowerCase().split(/\W+/).filter(w => w.length > 3),
    );
    const existing = charWords.get(op.charId);
    if (existing) {
      for (const w of words) existing.add(w);
    } else {
      charWords.set(op.charId, new Set(words));
    }
  }

  const chars = [...charWords.entries()];
  if (chars.length < 2) return 0;

  let totalSim = 0;
  let pairs = 0;
  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      const [, setA] = chars[i];
      const [, setB] = chars[j];
      const intersection = [...setA].filter(w => setB.has(w)).length;
      const union = new Set([...setA, ...setB]).size;
      totalSim += union > 0 ? intersection / union : 0;
      pairs++;
    }
  }
  return pairs > 0 ? totalSim / pairs : 0;
}

// ── 7. Relationship Repair Proof ─────────────────────────────────────────────
// Returns the relationship keys that have a negative net score in state but
// no compensating positive SHIFT_RELATIONSHIP in this IR.

export function relationshipRepairGaps(
  state: NarrativeState,
  ir: NarrativeTransitionIR,
): string[] {
  const gaps: string[] = [];
  for (const [key, deltas] of Object.entries(state.relationships)) {
    const net = deltas.reduce((s, d) => s + (isFinite(d.amount) ? d.amount : 0), 0);
    if (net < -0.4) {
      const [a, b] = key.split('|');
      const hasRepair = ir.ops.some(
        op => op.op === 'SHIFT_RELATIONSHIP' &&
              op.pair.includes(a) && op.pair.includes(b) &&
              op.delta.amount > 0.2,
      );
      if (!hasRepair) {
        gaps.push(`${key} (net ${net.toFixed(2)}) has no repair arc in this scene`);
      }
    }
  }
  return gaps;
}

// ── 8. Causal Plot Graph ──────────────────────────────────────────────────────
// Builds a directed dependency graph from IR.causalLinks.
// Nodes = ops; edges = declared causal dependencies.

export function buildCausalGraph(ir: NarrativeTransitionIR): CausalPlotGraph {
  const nodes: CausalPlotNode[] = ir.ops.map((op, idx) => ({ opIdx: idx, opKind: op.op }));
  const edges: CausalPlotEdge[] = [];

  if (ir.causalLinks) {
    for (const link of ir.causalLinks) {
      if (link.opIdx < 0 || link.opIdx >= ir.ops.length) continue; // out-of-bounds opIdx
      for (const causedBy of link.causedBy) {
        edges.push({ from: causedBy, toOpIdx: link.opIdx });
      }
    }
  }

  const targetSet = new Set(edges.map(e => e.toOpIdx));
  // rootOps = not a causal target (nothing declares it as caused-by)
  const rootOps = nodes.filter(n => !targetSet.has(n.opIdx)).map(n => n.opIdx);

  // leafOps = ops that are not declared as the cause of any other op.
  // causalLinks use entity ids (factId/charId) as "from", not op indices — so
  // `parseInt(e.from)` was always NaN, making every node a leaf. Instead we find
  // the ops that produce entities referenced as causes, and mark those as non-leaf.
  const causingEntityIds = new Set(edges.map(e => e.from));
  // Map entities back to producer op indices (ADD_FACT produces a factId; UPDATE_BELIEF produces a beliefId)
  const producerOpIdxs = new Set<number>();
  nodes.forEach(n => {
    const op = ir.ops[n.opIdx];
    if (!op) return;
    if (op.op === 'ADD_FACT' && causingEntityIds.has(op.fact.factId)) producerOpIdxs.add(n.opIdx);
    if (op.op === 'UPDATE_BELIEF' && causingEntityIds.has(op.belief.id)) producerOpIdxs.add(n.opIdx);
  });
  const leafOps = nodes.filter(n => !producerOpIdxs.has(n.opIdx)).map(n => n.opIdx);

  return { nodes, edges, rootOps, leafOps };
}

// ── 9. Propp's Morphology ─────────────────────────────────────────────────────
// Maps StoryOps to 7 Proppian macro-functions and reports coverage.

const ALL_PROPP_STAGES: ProppStage[] = [
  'preparation', 'complication', 'mediation', 'departure',
  'ordeal', 'consequence', 'resolution',
];

export function proppMorphology(ir: NarrativeTransitionIR): ProppAnalysis {
  const present = new Set<ProppStage>();

  for (const op of ir.ops) {
    switch (op.op) {
      case 'ADD_FACT':
      case 'RECORD_VISUAL_FACT':
      case 'RECORD_SONIC_FACT':
        present.add('preparation');
        break;
      case 'APPRAISE_EMOTION':
        if (op.emotion.dominant === 'fear' || op.emotion.dominant === 'distress') {
          present.add('complication');
        }
        break;
      case 'RAISE_CLOCK':
        present.add('complication');
        break;
      case 'UPDATE_BELIEF':
        if (op.belief.source === 'told') present.add('mediation');
        break;
      case 'ADVANCE_OBJECT_ARC':
        present.add('departure');
        break;
      case 'SHIFT_RELATIONSHIP':
        if (op.delta.amount < 0) present.add('ordeal');
        else if (op.delta.amount > 0) present.add('consequence');
        break;
      case 'PAYOFF_SETUP':
        present.add('consequence');
        break;
      case 'ADVANCE_THEME_ARGUMENT':
        if (op.move === 'resolve') present.add('resolution');
        break;
    }
  }

  const presentArr = [...present];
  const absent = ALL_PROPP_STAGES.filter(s => !present.has(s));
  return { present: presentArr, absent, coverage: presentArr.length / ALL_PROPP_STAGES.length };
}

// ── Main: runQualityEngine ────────────────────────────────────────────────────

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

  // Dialogue validators (all 10)
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

  // Burrows's Delta
  const delta = burrowsDelta(ir.ops);
  if (delta > 0.6) {
    warnings.push({
      engine: 'burrows_delta', opIdx: null, rule: 'VOICE_UNIFORMITY',
      message: `Burrows delta ${delta.toFixed(2)} — characters share too much vocabulary (same voice)`,
      penalty: Math.round((delta - 0.6) * 40),
    });
  }

  const arcDebt = computeArcDebt(state, ir.sceneIdx);
  const rr = revealReady(state);
  const repairGaps = relationshipRepairGaps(state, ir);
  const causalGraph = buildCausalGraph(ir);
  const proppAnalysis = proppMorphology(ir);

  const totalPenalty = warnings.reduce((s, w) => s + w.penalty, 0);
  const score = Math.max(0, 100 - totalPenalty);

  return {
    warnings,
    score,
    specificity: spec,
    arcDebt,
    revealReady: rr.ready,
    necessityScore: necessity,
    burrowsDelta: delta,
    causalGraph,
    proppAnalysis,
    repairGaps,
  };
}
