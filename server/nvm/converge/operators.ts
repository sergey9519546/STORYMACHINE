// 8 Mutation Operators — the vocabulary the Convergence Loop uses to improve
// a candidate IR without regenerating from scratch. Each operator targets a
// specific dramatic weakness identified by the proof kernel or valuation engine.
// Operators are pure functions: (ir, state, seed) → mutated IR.

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import { makePrng, randInt } from '../repro/seed.ts';

export type MutationOperator =
  | 'deepen_wound'
  | 'raise_stakes'
  | 'inject_irony'
  | 'cut_on_the_nose'
  | 'complicate_relationship'
  | 'weird_but_valid'
  | 'sharpen_theme'
  | 'invert_expectation'
  | 'pacing_compress'
  | 'reveal_asymmetry'
  | 'plant_sensory_anchor'
  | 'defuse_clock';

export interface MutationResult {
  ir: NarrativeTransitionIR;
  operator: MutationOperator;
  description: string;
}

// ── Operator implementations ─────────────────────────────────────────────────

function deepenWound(ir: NarrativeTransitionIR, state: NarrativeState, seed: number): MutationResult {
  // Find an APPRAISE_EMOTION op and amplify the dominant negative emotion
  const prng = makePrng(seed);
  const emotionOps = ir.ops.map((op, i) => ({ op, i })).filter(x => x.op.op === 'APPRAISE_EMOTION');
  if (emotionOps.length === 0) return { ir, operator: 'deepen_wound', description: 'no emotion ops to deepen' };

  const target = emotionOps[randInt(prng, emotionOps.length)];
  const newOps = ir.ops.map((op, i) => {
    if (i !== target.i || op.op !== 'APPRAISE_EMOTION') return op;
    const negatives = ['distress', 'anger', 'fear', 'shame'] as const;
    const dominant = negatives.includes(op.emotion.dominant as typeof negatives[number])
      ? op.emotion.dominant : 'distress';
    const boosted = Math.min(100, op.emotion.intensity + 15 + randInt(prng, 10));
    return { ...op, emotion: { ...op.emotion, intensity: boosted, dominant } };
  });
  return {
    ir: { ...ir, ops: newOps },
    operator: 'deepen_wound',
    description: `Amplified ${target.op.op === 'APPRAISE_EMOTION' ? (target.op as Extract<StoryOp, {op:'APPRAISE_EMOTION'}>).charId : '?'}'s wound`,
  };
}

function raiseStakes(ir: NarrativeTransitionIR, _state: NarrativeState, seed: number): MutationResult {
  const prng = makePrng(seed);
  // Add or increment a RAISE_CLOCK op
  const existingClock = ir.ops.find(op => op.op === 'RAISE_CLOCK');
  if (existingClock && existingClock.op === 'RAISE_CLOCK') {
    const newOps = ir.ops.map(op =>
      op === existingClock ? { ...op, amount: (op as Extract<StoryOp, {op:'RAISE_CLOCK'}>).amount + 1 + randInt(prng, 2) } : op,
    );
    return { ir: { ...ir, ops: newOps }, operator: 'raise_stakes', description: 'Incremented existing clock' };
  }
  const clockId = `stakes_clock_${ir.sceneIdx}`;
  const newClock: StoryOp = { op: 'RAISE_CLOCK', clockId, amount: 2 + randInt(prng, 3) };
  return {
    ir: { ...ir, ops: [...ir.ops, newClock] },
    operator: 'raise_stakes',
    description: `Added ticking clock "${clockId}"`,
  };
}

function injectIrony(ir: NarrativeTransitionIR, state: NarrativeState, seed: number): MutationResult {
  const prng = makePrng(seed);
  // Add an UPDATE_READER_STATE that reveals a truth the audience knows but a char doesn't
  const chars = Object.keys(state.characterBeliefs);
  if (chars.length === 0) return { ir, operator: 'inject_irony', description: 'no characters to ironize' };
  const char = chars[randInt(prng, chars.length)];
  const ironyOp: StoryOp = {
    op: 'UPDATE_READER_STATE',
    delta: {
      suspense: 10 + randInt(prng, 20),
      knownFact: `The audience sees ${char}'s blind spot while ${char} remains unaware`,
    },
  };
  return {
    ir: { ...ir, ops: [...ir.ops, ironyOp] },
    operator: 'inject_irony',
    description: `Added dramatic irony layer for ${char}`,
  };
}

function cutOnTheNose(ir: NarrativeTransitionIR, _state: NarrativeState, _seed: number): MutationResult {
  // Remove UPDATE_READER_STATE ops that explicitly name the theme (on-the-nose)
  const filtered = ir.ops.filter(op => {
    if (op.op !== 'UPDATE_READER_STATE') return true;
    const kf = op.delta.knownFact?.toLowerCase() ?? '';
    const onTheNose = ['theme', 'moral', 'message', 'lesson', 'means that'].some(w => kf.includes(w));
    return !onTheNose;
  });
  const removed = ir.ops.length - filtered.length;
  return {
    ir: { ...ir, ops: filtered },
    operator: 'cut_on_the_nose',
    description: removed > 0 ? `Removed ${removed} on-the-nose reader state op(s)` : 'Nothing to cut',
  };
}

function complicateRelationship(ir: NarrativeTransitionIR, state: NarrativeState, seed: number): MutationResult {
  const prng = makePrng(seed);
  const chars = Object.keys(state.characterBeliefs);
  if (chars.length < 2) return { ir, operator: 'complicate_relationship', description: 'not enough characters' };
  const i = randInt(prng, chars.length);
  const j = (i + 1 + randInt(prng, chars.length - 1)) % chars.length;
  const a = chars[i], b = chars[j];
  const complicateOp: StoryOp = {
    op: 'SHIFT_RELATIONSHIP',
    pair: [a, b],
    delta: {
      dimension: 'trust',
      amount: -(0.1 + randInt(prng, 3) * 0.1),
      reason: `${a} and ${b}'s dynamic becomes more fraught`,
    },
  };
  return {
    ir: { ...ir, ops: [...ir.ops, complicateOp] },
    operator: 'complicate_relationship',
    description: `Added trust friction between ${a} and ${b}`,
  };
}

function weirdButValid(ir: NarrativeTransitionIR, state: NarrativeState, seed: number): MutationResult {
  const prng = makePrng(seed);
  // Add a concrete, scene-specific sensory detail that creates productive strangeness.
  // Pull context from the existing ops and state to avoid generic template strings.
  const facts = state.objectiveReality;
  const chars = Object.keys(state.characterBeliefs);
  const charName = chars.length > 0 ? chars[randInt(prng, chars.length)] : 'the protagonist';
  const existingFact = facts.length > 0 ? facts[randInt(prng, facts.length)] : null;

  // Sonic options reference known characters or facts for specificity
  const sonicOptions = [
    `${charName}'s silence after the question — louder than any answer`,
    existingFact ? `a sound tied to "${existingFact.subject}" interrupts at the worst moment` : `a distant sound breaks the rhythm of the scene`,
    `something mechanical fails at the exact wrong moment`,
  ];
  // Visual options
  const visualOptions = [
    `a physical object on screen contradicts what ${charName} just said`,
    existingFact ? `the location itself — "${existingFact.subject}" — shows something the characters haven't noticed` : `a background detail undercuts the foreground drama`,
    `${charName}'s body betrays what their words deny`,
  ];
  const flavors = ['sound', 'camera'] as const;
  const flavor = flavors[randInt(prng, flavors.length)];
  const weirdOp: StoryOp = flavor === 'sound'
    ? { op: 'RECORD_SONIC_FACT', sceneId: `s${ir.sceneIdx}`, fact: sonicOptions[randInt(prng, sonicOptions.length)] }
    : { op: 'RECORD_VISUAL_FACT', sceneId: `s${ir.sceneIdx}`, fact: visualOptions[randInt(prng, visualOptions.length)] };
  return {
    ir: { ...ir, ops: [...ir.ops, weirdOp] },
    operator: 'weird_but_valid',
    description: `Added ${flavor} texture grounded in scene context: ${charName}`,
  };
}

function sharpenTheme(ir: NarrativeTransitionIR, state: NarrativeState, seed: number): MutationResult {
  const prng = makePrng(seed);
  const theme = state.authorIntent.theme;
  if (!theme) return { ir, operator: 'sharpen_theme', description: 'no theme declared in authorIntent' };
  const moves = ['support', 'attack', 'complicate'] as const;
  const move = moves[randInt(prng, moves.length)];
  const themeOp: StoryOp = {
    op: 'ADVANCE_THEME_ARGUMENT',
    claimId: `theme_${ir.sceneIdx}_${randInt(prng, 99999)}`,
    move,
  };
  return {
    ir: { ...ir, ops: [...ir.ops, themeOp] },
    operator: 'sharpen_theme',
    description: `Added theme move "${move}" for: "${theme}"`,
  };
}

function invertExpectation(ir: NarrativeTransitionIR, _state: NarrativeState, seed: number): MutationResult {
  const prng = makePrng(seed);
  // Find a SHIFT_RELATIONSHIP and flip its amount sign
  const relOps = ir.ops.map((op, i) => ({ op, i })).filter(x => x.op.op === 'SHIFT_RELATIONSHIP');
  if (relOps.length === 0) return { ir, operator: 'invert_expectation', description: 'no relationship ops to invert' };
  const target = relOps[randInt(prng, relOps.length)];
  const newOps = ir.ops.map((op, i) => {
    if (i !== target.i || op.op !== 'SHIFT_RELATIONSHIP') return op;
    return { ...op, delta: { ...op.delta, amount: -op.delta.amount, reason: `[inverted] ${op.delta.reason}` } };
  });
  return {
    ir: { ...ir, ops: newOps },
    operator: 'invert_expectation',
    description: 'Inverted a relationship delta — subverted the expected emotional beat',
  };
}

function pacingCompress(ir: NarrativeTransitionIR, _state: NarrativeState, _seed: number): MutationResult {
  if (ir.ops.length <= 2) return { ir, operator: 'pacing_compress', description: 'scene too short to compress' };
  // Remove the last APPRAISE_EMOTION or UPDATE_BELIEF op if the same character already
  // has an identical dominant emotion / same proposition earlier in the IR.
  for (let i = ir.ops.length - 1; i >= 1; i--) {
    const op = ir.ops[i];
    if (op.op === 'APPRAISE_EMOTION') {
      const duplicate = ir.ops.slice(0, i).some(
        e => e.op === 'APPRAISE_EMOTION' && e.charId === op.charId &&
             e.emotion.dominant === op.emotion.dominant,
      );
      if (duplicate) {
        const newOps = [...ir.ops.slice(0, i), ...ir.ops.slice(i + 1)];
        return {
          ir: { ...ir, ops: newOps },
          operator: 'pacing_compress',
          description: `Removed redundant ${op.emotion.dominant} emotion op for ${op.charId} — duplicate beat excised`,
        };
      }
    }
    if (op.op === 'UPDATE_BELIEF') {
      const duplicate = ir.ops.slice(0, i).some(
        e => e.op === 'UPDATE_BELIEF' && e.charId === op.charId &&
             e.belief.proposition === op.belief.proposition,
      );
      if (duplicate) {
        const newOps = [...ir.ops.slice(0, i), ...ir.ops.slice(i + 1)];
        return {
          ir: { ...ir, ops: newOps },
          operator: 'pacing_compress',
          description: `Removed redundant belief op for ${op.charId} — proposition restated without change`,
        };
      }
    }
  }
  // Fallback: remove the last world-fact op (ADD_FACT) to tighten a bloated scene
  for (let i = ir.ops.length - 1; i >= 0; i--) {
    if (ir.ops[i].op === 'ADD_FACT') {
      const newOps = [...ir.ops.slice(0, i), ...ir.ops.slice(i + 1)];
      return {
        ir: { ...ir, ops: newOps },
        operator: 'pacing_compress',
        description: 'Removed trailing ADD_FACT op to tighten scene pacing',
      };
    }
  }
  return { ir, operator: 'pacing_compress', description: 'no compressible ops found' };
}

function revealAsymmetry(ir: NarrativeTransitionIR, state: NarrativeState, seed: number): MutationResult {
  const prng = makePrng(seed);
  // Find a character who holds beliefs that another character in the scene doesn't have.
  // Insert an UPDATE_BELIEF for the uninformed character using a "told" belief from
  // the informed character — establishing dramatic irony or reducing it.
  const charIds = [...new Set(
    ir.ops
      .filter(op => op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION')
      .map(op => (op as { charId: string }).charId),
  )];
  if (charIds.length < 2) {
    // Single-character scene: add a "told" belief referencing a world fact
    const facts = state.objectiveReality;
    if (facts.length === 0) return { ir, operator: 'reveal_asymmetry', description: 'no world facts to create asymmetry from' };
    const fact = facts[randInt(prng, facts.length)];
    const char = charIds[0] ?? 'protagonist';
    const newOp: StoryOp = {
      op: 'UPDATE_BELIEF', charId: char,
      belief: { id: `bel_asym_${ir.sceneIdx}_${randInt(prng, 99999)}`, proposition: `${fact.subject} ${fact.predicate} ${fact.object}`, confidence: 0.55, source: 'told', acquired_at: 0 },
    };
    return {
      ir: { ...ir, ops: [...ir.ops, newOp] },
      operator: 'reveal_asymmetry',
      description: `Inserted "told" belief for ${char} about "${fact.subject}" to create dramatic irony`,
    };
  }
  // Two or more characters: give the second character a belief the first has
  const [informed, uninformed] = [charIds[randInt(prng, charIds.length)], charIds[(randInt(prng, charIds.length) + 1) % charIds.length]];
  const informedBeliefs = state.characterBeliefs[informed] ?? [];
  if (informedBeliefs.length === 0) return { ir, operator: 'reveal_asymmetry', description: `${informed} has no beliefs to create asymmetry from` };
  const sourceBelief = informedBeliefs[randInt(prng, informedBeliefs.length)];
  const newOp: StoryOp = {
    op: 'UPDATE_BELIEF', charId: uninformed,
    belief: { id: `bel_asym_${ir.sceneIdx}_${randInt(prng, 99999)}`, proposition: sourceBelief.proposition, confidence: 0.45, source: 'told', acquired_at: 0 },
  };
  return {
    ir: { ...ir, ops: [...ir.ops, newOp] },
    operator: 'reveal_asymmetry',
    description: `${uninformed} learns what ${informed} knows: "${sourceBelief.proposition.slice(0, 40)}" — asymmetry established`,
  };
}

// plant_sensory_anchor — grounds a scene in physical/sensory reality by adding a
// RECORD_VISUAL_FACT or RECORD_SONIC_FACT that is emotionally legible (not strange).
// Unlike weird_but_valid, the anchor is calibrated to the scene's dominant emotion:
// fear → constriction; joy → light/warmth; distress → stillness; anger → impact.
function plantSensoryAnchor(ir: NarrativeTransitionIR, state: NarrativeState, seed: number): MutationResult {
  const prng = makePrng(seed);
  // Detect dominant emotional register from character emotions in this IR or state
  const emotionOps = ir.ops.filter(op => op.op === 'APPRAISE_EMOTION') as Extract<StoryOp, {op:'APPRAISE_EMOTION'}>[];
  const dominant = emotionOps.length > 0
    ? emotionOps[randInt(prng, emotionOps.length)].emotion.dominant
    : Object.values(state.characterEmotions)[0]?.dominant ?? 'neutral';

  const VISUAL_BY_EMOTION: Record<string, string[]> = {
    fear:    ['a narrow corridor with no visible exit', 'shadows that move before the character does', 'hands that will not stop trembling'],
    distress:['an object left behind — uncollected, irrelevant to everyone but the character', 'the room empties while the character stands still', 'light dims without anyone touching a switch'],
    anger:   ['something slammed down rather than placed', 'a glass left at the edge — ready to fall', 'teeth marks on a pen'],
    joy:     ['unexpected warmth from an open window', 'two people moving at the same pace without noticing', 'a held breath, then release'],
    shame:   ['a mirror the character avoids', 'a chair pushed slightly out of place — as if someone left in a hurry', 'eye contact broken a beat too soon'],
    pride:   ['a posture held a second too long', 'a hand resting on a surface with precision', 'a small smile that no one was meant to see'],
    neutral: ['light unchanged — the scene holds its breath', 'nothing moves, which is itself an event'],
  };
  const SONIC_BY_EMOTION: Record<string, string[]> = {
    fear:    ['silence that the character wants to break but can\'t', 'a distant sound that stops exactly when noticed'],
    distress:['a clock ticking that wasn\'t audible a moment ago', 'the sound of something hollow'],
    anger:   ['a door that is not quite slammed', 'breath controlled to prevent noise'],
    joy:     ['a sound that arrives at the right moment, not the expected one', 'laughter from another room'],
    shame:   ['a name called in a crowd that might be theirs', 'steps that slow without a reason'],
    pride:   ['deliberate footsteps', 'a pause before speaking — owning the silence'],
    neutral: ['ambient noise that fades', 'a hum under everything'],
  };

  const visualOpts = VISUAL_BY_EMOTION[dominant] ?? VISUAL_BY_EMOTION['neutral']!;
  const sonicOpts  = SONIC_BY_EMOTION[dominant]  ?? SONIC_BY_EMOTION['neutral']!;
  const useVisual  = randInt(prng, 2) === 0;
  const text = useVisual
    ? visualOpts[randInt(prng, visualOpts.length)]
    : sonicOpts[randInt(prng, sonicOpts.length)];
  const anchorOp: StoryOp = useVisual
    ? { op: 'RECORD_VISUAL_FACT', sceneId: `s${ir.sceneIdx}`, fact: text }
    : { op: 'RECORD_SONIC_FACT',  sceneId: `s${ir.sceneIdx}`, fact: text };
  return {
    ir: { ...ir, ops: [...ir.ops, anchorOp] },
    operator: 'plant_sensory_anchor',
    description: `Added ${useVisual ? 'visual' : 'sonic'} anchor calibrated to "${dominant}" register`,
  };
}

// defuse_clock — the relief-side counterpart to raise_stakes. Reduces an existing
// clock's pressure, signalling that a countdown has been temporarily arrested.
// Use on provide_relief scenes, after a climax, or to create false-relief beats.
// Adds a RAISE_CLOCK with a negative amount (architecturally valid: defuses tension).
function defuseClock(ir: NarrativeTransitionIR, state: NarrativeState, seed: number): MutationResult {
  const prng = makePrng(seed);
  // Prefer to defuse the most urgent clock in state
  const clockEntries = Object.entries(state.clocks).filter(([, v]) => v > 0);
  if (clockEntries.length === 0) {
    // No existing clock — defuse a clock already in this IR
    const existingClock = ir.ops.find(op => op.op === 'RAISE_CLOCK') as Extract<StoryOp, {op:'RAISE_CLOCK'}> | undefined;
    if (!existingClock) return { ir, operator: 'defuse_clock', description: 'no clock to defuse' };
    const newOps = ir.ops.map(op =>
      op === existingClock
        ? { ...op, amount: -Math.abs((op as Extract<StoryOp, {op:'RAISE_CLOCK'}>).amount) }
        : op,
    );
    return { ir: { ...ir, ops: newOps }, operator: 'defuse_clock', description: `Reversed clock ${existingClock.clockId} to signal relief` };
  }
  // Pick the most urgent clock (highest value)
  const urgentClock = clockEntries.reduce((best, curr) => curr[1] > best[1] ? curr : best, clockEntries[0]!);
  const defuseAmount = -(2 + randInt(prng, 3)); // defuse by 2–4 units
  const defuseOp: StoryOp = { op: 'RAISE_CLOCK', clockId: urgentClock[0], amount: defuseAmount };
  return {
    ir: { ...ir, ops: [...ir.ops, defuseOp] },
    operator: 'defuse_clock',
    description: `Defused clock "${urgentClock[0]}" (currently ${urgentClock[1]}) by ${Math.abs(defuseAmount)} — relief beat`,
  };
}

// ── Operator dispatch ─────────────────────────────────────────────────────────

const OPERATORS: Record<MutationOperator, (ir: NarrativeTransitionIR, state: NarrativeState, seed: number) => MutationResult> = {
  deepen_wound:           deepenWound,
  raise_stakes:           raiseStakes,
  inject_irony:           injectIrony,
  cut_on_the_nose:        cutOnTheNose,
  complicate_relationship: complicateRelationship,
  weird_but_valid:        weirdButValid,
  sharpen_theme:          sharpenTheme,
  invert_expectation:     invertExpectation,
  pacing_compress:        pacingCompress,
  reveal_asymmetry:       revealAsymmetry,
  plant_sensory_anchor:   plantSensoryAnchor,
  defuse_clock:           defuseClock,
};

export function applyOperator(
  op: MutationOperator,
  ir: NarrativeTransitionIR,
  state: NarrativeState,
  seed: number,
): MutationResult {
  return OPERATORS[op](ir, state, seed);
}

export const ALL_OPERATORS = Object.keys(OPERATORS) as MutationOperator[];
