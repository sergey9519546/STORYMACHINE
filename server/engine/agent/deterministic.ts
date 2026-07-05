// ── Run 13 — Keyless deterministic simulation ────────────────────────────────
// DESIGN (kept in-code per this run's instructions, not a separate doc)
//
// AUDIT FINDING addressed here: without an AI key, Agent.takeTurn() fell back
// to a hardcoded `{ action_type: 'SPEAK', content: '...' }` and
// Agent.updateEpistemics() fell back to an empty EpistemicUpdate — structure
// (turn count, location graph) advanced, but beliefs/relationships/dialogue
// were completely frozen. That broke this product's own stated principle
// (see server/lib/interview.ts's header, and CLAUDE.md's "deterministic
// psychology is real product, not degraded product"): the interview route
// already proves a fully rule-based, keyless surface can be a first-class
// feature, not an apology. This file is the same move applied to the live
// simulation loop.
//
// PRINCIPLES
// 1. Reuse, don't reinvent. Every signal used below (ready goals, active
//    defense, defense level, speech-pattern cues, dramatic pressure) is read
//    from the exact same psychology.ts helpers agent/decision.ts's buildPrompt
//    already uses to brief the LLM — so a keyless turn is grounded in
//    IDENTICAL state to an LLM turn, just rendered through templates instead
//    of a model. It is a scaffold, not literary prose — plain, honest,
//    state-derived sentences (goal voiced, defense colored, addressee named).
// 2. No Math.random anywhere. Any tie-break that would otherwise need
//    randomness (which exit to take, who to address when no relationship
//    signal exists yet) is seeded from `${char_id}:${turnCount}:${tag}` via
//    nvm/repro/seed.ts's mulberry32 PRNG — same inputs always produce the same
//    output, which is both the fairness contract of a "deterministic"
//    simulation and directly unit-tested (deterministic-sim.test.ts).
// 3. Additive only. `NarrativeAction.deterministic` / `EpistemicUpdate
//    .deterministic` are optional fields set ONLY on the fallback path — an
//    LLM-produced action/update never gets the key at all (not even `false`),
//    so JSON responses on a successful LLM turn are byte-identical to
//    pre-Run-13 output.
// 4. Bounded, not generative. The epistemics fallback never invents facts: it
//    turns already-observed ActionLogEntry rows into propositions verbatim
//    (as claims, for SPEAK/LIE — matching action-to-ops.ts's own "told=0.7"
//    convention for listener beliefs — or as directly witnessed physical
//    facts, for RELOCATE, at a higher confidence). Suspicion and
//    theory-of-mind nudges are small, capped per turn (constants below), and
//    reuse the SAME result shape the LLM branch parses into, so every line of
//    Agent.updateEpistemics() downstream of the parse (belief merge, ToM
//    merge, goal-stack mutation, deadlock detection) already treats both
//    paths identically — the Orchestrator's before/after ToM/emotion diffing
//    (SHIFT_RELATIONSHIP / APPRAISE_EMOTION ops) needs no bridge changes at
//    all to see keyless turns.

import type {
  ActionLogEntry,
  BeliefSource,
  CharacterSheet,
  DefenseMechanism,
  Location,
  NarrativeAction,
} from '../types.ts';
import type { Stage } from '../Stage.ts';
import { makePrng, randInt, seedFromString } from '../../nvm/repro/seed.ts';
import {
  computeDefenseLevel,
  getReadyGoals,
  selectActiveDefense,
} from './psychology.ts';

// ── Small helpers ─────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function clamp01(v: number): number {
  return clamp(v, 0, 1);
}
function lowerFirst(s: string): string {
  return s.length ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABLE 1 — deterministic takeTurn fallback
// ─────────────────────────────────────────────────────────────────────────────

// The character's current live objective, in plain scaffold language.
// Ready (unblocked) instrumental goals are voiced directly — they're already
// surfaced to the character as "CURRENT SUBGOAL" in the LLM prompt
// (decision.ts's buildPrompt), so saying them aloud in the keyless scaffold is
// not a new disclosure. With NO goalStack at all, we deliberately do NOT print
// `hidden_motive` verbatim — decision.ts's own prompt tells the LLM "Never
// state this directly. Every action serves it"; the keyless scaffold honors
// the same secrecy contract with a generic but honest placeholder instead of
// leaking the raw motive text.
function primaryGoalText(sheet: CharacterSheet): string {
  const gs = sheet.goalStack;
  if (gs) {
    const ready = getReadyGoals(gs);
    if (ready[0]) return ready[0].description;
    if (!gs.terminal.achieved) return gs.terminal.description;
    return 'stay composed and watch the room';
  }
  return 'get a clearer read on what is really going on here';
}

// Picks who this turn's line is addressed to. Prefers the relationship that
// is most emotionally "live" right now (biggest trust deviation from neutral,
// same ordering interview.ts's relationshipsInPlay receipt uses) so the line
// reads as reacting to a real relationship, not a random pick. Only falls
// back to a seeded hash — never Math.random — when no ToM signal exists yet
// (e.g. the very first turn of a scene).
function pickAddressee(
  sheet: CharacterSheet,
  otherAgents: CharacterSheet[],
  turn: number,
  tag: string,
): CharacterSheet | null {
  if (otherAgents.length === 0) return null;
  const tom = sheet.theoryOfMind ?? {};
  const withTom = otherAgents.filter(a => tom[a.char_id]);
  if (withTom.length > 0) {
    return withTom.slice().sort((a, b) =>
      Math.abs((tom[b.char_id]?.trust_level ?? 0.5) - 0.5) -
      Math.abs((tom[a.char_id]?.trust_level ?? 0.5) - 0.5),
    )[0];
  }
  const prng = makePrng(seedFromString(`${sheet.char_id}:${turn}:${tag}`));
  return otherAgents[randInt(prng, otherAgents.length)];
}

const DEFENSE_LINES: Record<DefenseMechanism, (goal: string, addresseeName: string | null) => string> = {
  rationalization: (goal) => `There's a perfectly reasonable explanation for all of this: ${goal}.`,
  intellectualization: (goal) => `Let's set feelings aside and look at this plainly: ${goal}.`,
  projection: (_goal, name) => name
    ? `${name}, you're the one with something to explain here, not me.`
    : `Someone in this room has something to explain, and it isn't me.`,
  displacement: (_goal, name) => name
    ? `Don't push me right now, ${name} — I've got enough to deal with.`
    : `Don't push me right now — I've got enough to deal with.`,
  denial: () => `That's not true. None of this happened the way you're describing.`,
  dissociation: (goal) => `I'm fine. ${goal}. None of this changes anything for me.`,
  repression: (goal) => `${capitalize(goal)}.`,
};

function deceptionLine(): string {
  return `Whatever you heard, that isn't what happened. You can trust me on that.`;
}
function flightLine(): string {
  return `I can't stay in this room right now.`;
}
function goalVoicingLine(goal: string, underPressure: boolean): string {
  return `${underPressure ? 'Right now, ' : ''}I need to ${goal}.`;
}

/**
 * Compose one turn's NarrativeAction with no LLM call, purely from the
 * agent's actual live state. Called from Agent.takeTurn() only when
 * selectBestAction() returned null (no key, timeout, or parse failure).
 *
 * Action TYPE is chosen by a deterministic priority cascade — goal urgency,
 * defense level, and dramatic pressure decide it, never a coin flip:
 *   1. FLIGHT (RELOCATE)   — avoidant + rising suspicion + cracking composure
 *      + a real exit exists. Mirrors psychology.ts's own describeActionBias
 *      bias text for this exact combination ("RELOCATE is starting to feel
 *      appealing") — the fallback acts on the SAME bias the LLM prompt states.
 *   2. DECEPTION (LIE)     — Machiavellian/psychopathic traits past the same
 *      thresholds describeActionBias already uses ("LIE is a natural tool" /
 *      "no hesitation"), with a live addressee to deceive.
 *   3. DEFENSE-COLORED SPEAK — an active defense mechanism (selectActiveDefense
 *      already gates this on emotional intensity >= 30) recolors — not
 *      replaces — the goal-voicing line.
 *   4. Composed default SPEAK — plainly voices the live goal.
 *
 * Pure with respect to its inputs (only reads Stage, never writes) — the same
 * (sheet, stage-state, node, otherAgents) always produces the same action,
 * which is exactly what the determinism test in deterministic-sim.test.ts
 * checks.
 */
export function composeDeterministicAction(
  sheet: CharacterSheet,
  stage: Stage,
  node: Location,
  otherAgents: CharacterSheet[],
): NarrativeAction {
  const turn = stage.getTurnCount();
  const goalText = lowerFirst(primaryGoalText(sheet));
  const suspicion = sheet.suspicion_score ?? 0;
  const defenseLevel = computeDefenseLevel(sheet.bigFive?.neuroticism ?? 50, suspicion);
  const activeDefense = selectActiveDefense(sheet.defenseMechanisms, sheet.emotionState);
  const underPressure = stage.getActivePressures(sheet.char_id).length > 0;
  const addressee = pickAddressee(sheet, otherAgents, turn, 'addressee');

  // 1. FLIGHT
  if (
    sheet.attachmentStyle === 'avoidant' &&
    suspicion > 40 &&
    !defenseLevel.startsWith('low') &&
    node.adjacent_locations.length > 0
  ) {
    const prng = makePrng(seedFromString(`${sheet.char_id}:${turn}:exit`));
    const exitId = node.adjacent_locations[randInt(prng, node.adjacent_locations.length)];
    const exitLoc = stage.getLocation(exitId);
    return {
      action_type: 'RELOCATE',
      target: exitLoc?.name ?? exitId,
      content: flightLine(),
      deterministic: true,
    };
  }

  // 2. DECEPTION
  const dt = sheet.darkTriad;
  const deceptive = (dt?.machiavellianism ?? 0) > 70 || (dt?.psychopathy ?? 0) > 70;
  if (deceptive && addressee) {
    return {
      action_type: 'LIE',
      target: addressee.char_id,
      content: deceptionLine(),
      deterministic: true,
    };
  }

  // 3. DEFENSE-COLORED SPEAK
  if (activeDefense) {
    return {
      action_type: 'SPEAK',
      target: addressee?.char_id ?? null,
      content: DEFENSE_LINES[activeDefense](goalText, addressee?.name ?? null),
      deterministic: true,
    };
  }

  // 4. Composed default
  return {
    action_type: 'SPEAK',
    target: addressee?.char_id ?? null,
    content: goalVoicingLine(goalText, underPressure),
    deterministic: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABLE 2 — deterministic updateEpistemics fallback
// ─────────────────────────────────────────────────────────────────────────────

// Mirrors EXACTLY the shape Agent.updateEpistemics() parses the LLM's JSON
// response into (see the safeJsonParse<...> call there) so both branches feed
// the SAME downstream merge/write code. `source` is narrowed to BeliefSource
// (the LLM branch only ever widens to `string` because it comes from
// arbitrary model JSON; ours is authored, so it can be exact).
export interface EpistemicsFallbackResult {
  newSuspicionScore: number;
  newBeliefs: Array<{ proposition: string; confidence: number; source: BeliefSource; source_action_index?: number | null }>;
  updatedTheoryOfMind: Array<{
    agent_name: string;
    believed_motive: string;
    trust_level: number;
    affinity?: number | null;
    power_balance?: number | null;
    debt?: number | null;
    new_believed_knowledge?: string[];
    shared_history_event?: string | null;
  }>;
  contradiction_detected: boolean;
  contradicted_propositions: string[];
  goal_stack_update?: { add_subgoal?: string | null; mark_achieved?: string | null } | null;
  level2_tom?: Array<{ about_agent: string; they_believe_about_you: string; confidence: number }>;
  level3_tom?: Array<{ about_agent: string; they_believe_you_believe: string; confidence: number }>;
}

// Confidence-by-directness (Belief's own doc comment in types.ts: "witnessed
// ≈1.0, told ≈0.7, inferred ≈0.4"). A SPEAK/LIE is an ASSERTION — the listener
// only has the speaker's word for it, exactly action-to-ops.ts's entryToOps
// already encodes for the SPEAK/LIE case (confidence 0.7, source 'told'). A
// RELOCATE is a directly OBSERVED physical fact, not a claim — hence the
// higher 'witnessed' confidence. witnessed > told is the ordering
// deterministic-sim.test.ts checks.
const TOLD_CONFIDENCE = 0.7;
const WITNESSED_CONFIDENCE = 0.9;

// Suspicion heuristic bumps — small and capped (see MAX_SUSPICION_DELTA_PER_TURN
// below). Being visibly accused raises how surveilled/suspected you feel more
// than merely sounding defensive yourself does, hence the different weights.
const ACCUSATION_SUSPICION_BUMP = 5;
const DEFENSE_SUSPICION_BUMP = 3;
const MAX_SUSPICION_DELTA_PER_TURN = 8;

// ToM valence nudge per lexicon hit, and the per-agent-per-turn cap. 0.04 is
// deliberately just over action-to-ops.ts's RELATIONSHIP_DELTA_THRESHOLD
// (0.03) — a single clear positive/negative line is meant to be able to clear
// the bar for a committed SHIFT_RELATIONSHIP op, while staying small enough
// that a single mixed exchange (one hit each way) nets out to noise.
const TONE_DELTA_PER_HIT = 0.04;
const MAX_TONE_DELTA_PER_TURN = 0.08;

// Minimal LOCAL lexicon — WHY local rather than reused: the codebase's only
// existing valence/sentiment word lists (POSITIVE_VALENCE_WORDS /
// NEGATIVE_VALENCE_WORDS in server/nvm/analyze/fountain-analyzer.ts) are
// module-private (not exported) and that module transitively pulls in
// src/lib/fountain.ts + screenplay/structure.ts — a large, one-directional
// (nvm → engine) dependency this run is not chartered to invert. A small,
// purpose-built list kept next to its one caller is the honest option.
const ACCUSATORY_WORDS = [
  'lying', 'lied', 'liar', 'why did you', 'explain yourself', 'guilty',
  "don't believe you", 'hiding something', 'suspicious of you', "you did this",
];
const DEFENSIVE_WORDS = [
  "i didn't", "that's not true", 'i swear', "wasn't me", "you're wrong", 'nothing to hide',
];
const POSITIVE_TONE_WORDS = [
  'thank you', 'appreciate', 'trust you', 'glad', 'understand', 'agree with you', 'here to help', 'sorry',
];
const NEGATIVE_TONE_WORDS = [
  'hate you', 'angry at you', 'never trust', 'disgusted', 'betrayed', 'accus', 'threat', 'liar',
];

function countLexiconHits(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const w of words) if (lower.includes(w)) hits++;
  return hits;
}

/**
 * Rule-based fallback for Agent.updateEpistemics() when there is no LLM
 * response (no key, timeout, or parse failure). Reads only what was actually
 * observed this turn — no generation, no invented facts:
 *
 *  - witnessed → belief: every observed SPEAK/LIE becomes a 'told' belief (the
 *    listener only has the speaker's word — LIE renders identically to SPEAK,
 *    same epistemic-isolation rule buildPrompt's actionSummary already uses,
 *    since the observer cannot distinguish a lie from the truth); every
 *    observed RELOCATE becomes a higher-confidence 'witnessed' belief (a
 *    directly seen physical fact, not a claim).
 *  - suspicion deltas: bounded, small nudges from accusatory-toward-me /
 *    self-defensive lexicon hits.
 *  - ToM valence: bounded, small trust/affinity nudges from the tone of what
 *    co-present agents say, independent of whether it was directed at you.
 *
 * contradiction_detected is deliberately always false here — a reliable
 * negation-aware contradiction detector is out of scope for a keyless
 * rule-based pass (the LLM branch's own semantic-contradiction step already
 * requires an embeddings/LLM call); returning a false positive here would
 * spuriously spawn CONFRONT dramatic pressure, which is worse than the
 * (honestly labeled) absence of this one capability keylessly.
 */
export function buildDeterministicEpistemics(
  sheet: CharacterSheet,
  observableActions: ActionLogEntry[],
  otherAgentsInRoom: CharacterSheet[],
): EpistemicsFallbackResult {
  const nameOf = (charId: string): string => {
    if (charId === sheet.char_id) return sheet.name;
    return otherAgentsInRoom.find(a => a.char_id === charId)?.name ?? charId;
  };

  const newBeliefs: EpistemicsFallbackResult['newBeliefs'] = [];
  let suspicionDelta = 0;
  const toneByAgent = new Map<string, number>();

  observableActions.forEach((a, i) => {
    if (a.char_id === sheet.char_id) {
      // Own action: not a belief source (the agent already knows what it just
      // did) — only feeds the small self-defensiveness suspicion bump.
      if (countLexiconHits(a.content, DEFENSIVE_WORDS) > 0) {
        suspicionDelta += DEFENSE_SUSPICION_BUMP;
      }
      return;
    }

    if (a.action_type === 'SPEAK' || a.action_type === 'LIE') {
      newBeliefs.push({
        proposition: `${nameOf(a.char_id)} claims: "${a.content.slice(0, 300)}"`,
        confidence: TOLD_CONFIDENCE,
        source: 'told',
        source_action_index: i,
      });
    } else if (a.action_type === 'RELOCATE') {
      newBeliefs.push({
        proposition: `${nameOf(a.char_id)} relocated: ${a.content.replace(/^→\s*/, '').slice(0, 200)}`,
        confidence: WITNESSED_CONFIDENCE,
        source: 'witnessed',
        source_action_index: i,
      });
    }

    if (a.target_char_id === sheet.char_id && countLexiconHits(a.content, ACCUSATORY_WORDS) > 0) {
      suspicionDelta += ACCUSATION_SUSPICION_BUMP;
    }

    const toneHits = countLexiconHits(a.content, POSITIVE_TONE_WORDS) - countLexiconHits(a.content, NEGATIVE_TONE_WORDS);
    if (toneHits !== 0) {
      const prior = toneByAgent.get(a.char_id) ?? 0;
      toneByAgent.set(a.char_id, clamp(prior + toneHits * TONE_DELTA_PER_HIT, -MAX_TONE_DELTA_PER_TURN, MAX_TONE_DELTA_PER_TURN));
    }
  });

  const boundedSuspicionDelta = clamp(suspicionDelta, -MAX_SUSPICION_DELTA_PER_TURN, MAX_SUSPICION_DELTA_PER_TURN);
  const newSuspicionScore = clamp((sheet.suspicion_score ?? 0) + boundedSuspicionDelta, 0, 100);

  const existingTom = sheet.theoryOfMind ?? {};
  const updatedTheoryOfMind: EpistemicsFallbackResult['updatedTheoryOfMind'] = [];
  for (const other of otherAgentsInRoom) {
    const delta = toneByAgent.get(other.char_id);
    if (delta === undefined) continue; // no tone signal this turn — leave this relationship untouched
    const existing = existingTom[other.char_id];
    const entry: EpistemicsFallbackResult['updatedTheoryOfMind'][number] = {
      agent_name: other.name,
      // No LLM to infer a fresh motive — reuse the standing belief if one
      // exists; otherwise the character's own public_mask is the only
      // non-fabricated guess available (real state, not invented prose).
      believed_motive: existing?.believed_motive ?? other.public_mask.slice(0, 200),
      trust_level: clamp01((existing?.trust_level ?? 0.5) + delta),
    };
    // affinity has no documented neutral default (see Orchestrator.ts's
    // diffTheoryOfMind comment) — only nudge it when a prior value exists, so
    // a first-ever encounter never fabricates a baseline.
    if (existing?.affinity !== undefined) entry.affinity = clamp01(existing.affinity + delta);
    updatedTheoryOfMind.push(entry);
  }

  return {
    newSuspicionScore,
    newBeliefs,
    updatedTheoryOfMind,
    contradiction_detected: false,
    contradicted_propositions: [],
  };
}
