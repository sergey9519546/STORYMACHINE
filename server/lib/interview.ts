// Character-interview grounding builder.
//
// Pure and deterministic (no LLM calls, no Stage writes): maps an agent's
// ACTUAL runtime psychological state to (a) a set of plain-language "receipts"
// the human interviewer can inspect, and (b) a systemPrompt instructing an LLM
// to answer in character while staying constrained to those receipts.
//
// This is the differentiator for the character-interview feature: every
// answer is traceable back to the specific beliefs/emotion/defense/attachment/
// goals/relationships that produced it, not a generic "stay in character"
// instruction. Reuses the exact same psychology + memory-retrieval helpers
// server/engine/agent/decision.ts uses to build the live turn-decision prompt,
// so an interview answer is grounded in the SAME machinery that drives the
// character during the simulation itself — not a parallel, divergent model.

import type {
  CharacterSheet,
  EmotionType,
  DefenseMechanism,
  AttachmentStyle,
  BeliefSource,
  TheoryOfMind,
} from '../engine/types.ts';
import type { Stage } from '../engine/Stage.ts';
import { retrieveBeliefs } from './memory.ts';
import { sanitizeForPrompt } from './prompt-utils.ts';
import {
  describeAttachment,
  DEFENSE_DESCRIPTIONS,
  selectActiveDefense,
  deriveSpeechPattern,
  getReadyGoals,
} from '../engine/agent/psychology.ts';

// ── Receipt shapes ────────────────────────────────────────────────────────────

export interface BeliefReceipt {
  proposition: string;
  confidence: number;       // 0–1, rounded to 2 decimals
  source?: BeliefSource;
}

export interface EmotionReceipt {
  dominant: EmotionType;
  intensity: number;        // 0–100
}

export interface DefenseReceipt {
  mechanism: DefenseMechanism | null;
  gloss: string;            // plain-language description of what the defense does
}

export interface AttachmentReceipt {
  style: AttachmentStyle;
  gloss: string;            // plain-language description of the attachment style
}

export interface RelationshipReceipt {
  with: string;             // the other character's name (or char_id if unresolvable)
  stance: string;           // plain-language gloss of trust/affinity
}

export interface InterviewReceipts {
  beliefs: BeliefReceipt[];
  emotion: EmotionReceipt;
  defense: DefenseReceipt;
  attachment: AttachmentReceipt;
  speechPattern: string;
  goals: string[];
  relationshipsInPlay: RelationshipReceipt[];
}

export interface InterviewGrounding {
  receipts: InterviewReceipts;
  systemPrompt: string;
}

// Plain-language gloss for a theory-of-mind relationship. Two-axis (trust +
// affinity) rather than trust alone: trust answers "can I rely on what they
// say/do", affinity answers "do I feel warmth toward them" — a character can
// distrust someone they still love (anxious attachment) or trust someone they
// dislike (a useful rival). Collapsing to one axis would lose exactly the
// nuance the receipts exist to surface.
function describeRelationshipStance(tom: TheoryOfMind): string {
  const trust = tom.trust_level;
  const affinity = tom.affinity;
  const trustLabel =
    trust < 0.25 ? 'deep distrust' :
    trust < 0.45 ? 'wary, guarded trust' :
    trust > 0.75 ? 'strong trust' :
    trust > 0.55 ? 'cautious trust' :
    'undecided trust';
  if (affinity === undefined) return trustLabel;
  const affinityLabel =
    affinity < 0.25 ? 'active dislike' :
    affinity < 0.45 ? 'cool distance' :
    affinity > 0.75 ? 'warm affection' :
    affinity > 0.55 ? 'mild warmth' :
    'emotional neutrality';
  return `${trustLabel}, ${affinityLabel}`;
}

/**
 * Build the grounding (receipts + systemPrompt) for one interview question.
 *
 * @param agent    The full CharacterSheet being interviewed (from stage.getAgent/getAllAgents).
 * @param question The interviewer's raw question text (sanitized internally).
 * @param stage    Optional — when provided, relationship targets and belief
 *                 recency are resolved against live session state (agent
 *                 names, current turn count). Without it the function still
 *                 works (turn count defaults to 0, relationship targets fall
 *                 back to raw char_ids) so it stays independently unit-testable.
 */
export function buildInterviewGrounding(
  agent: CharacterSheet,
  question: string,
  stage?: Stage,
): InterviewGrounding {
  const safeName = sanitizeForPrompt(agent.name, 256);
  const safeQuestion = sanitizeForPrompt(question, 2000);
  const currentTurn = stage?.getTurnCount() ?? 0;

  // ── Beliefs ──────────────────────────────────────────────────────────────
  // retrieveBeliefs (server/lib/memory.ts) ranks by recency × importance ×
  // relevance-to-context. Passing the question itself as the context text is
  // what makes "a question mentioning a topic surfaces the matching belief" —
  // without it we'd only ever see the character's globally most-confident
  // beliefs, not the ones actually pertinent to what's being asked.
  const rankedBeliefs = retrieveBeliefs(agent.beliefs ?? [], currentTurn, safeQuestion, 5);
  const beliefs: BeliefReceipt[] = rankedBeliefs.map(b => ({
    proposition: sanitizeForPrompt(b.proposition, 500),
    confidence: Math.round(b.confidence * 100) / 100,
    source: b.source,
  }));

  // ── Emotion ──────────────────────────────────────────────────────────────
  // The OCC-derived current EmotionState (AppraisalEngine output) is included
  // because — exactly as in decision.ts's emotionBlock — it is the single
  // strongest driver of HOW an answer is delivered even when it's never
  // named aloud in the text itself.
  const es = agent.emotionState;
  const emotion: EmotionReceipt = {
    dominant: es?.dominant ?? 'neutral',
    intensity: es?.intensity ?? 0,
  };

  // ── Defense ──────────────────────────────────────────────────────────────
  // selectActiveDefense only fires above an intensity threshold (>=30) —
  // reusing it (rather than reimplementing the gate) guarantees an interview
  // answer is coloured by the SAME defense mechanism the character would
  // actually be running mid-scene right now, not a generic "characters lie
  // sometimes" placeholder.
  const activeDefense = selectActiveDefense(agent.defenseMechanisms, agent.emotionState);
  const defense: DefenseReceipt = {
    mechanism: activeDefense,
    gloss: activeDefense
      ? DEFENSE_DESCRIPTIONS[activeDefense]
      : 'No defense mechanism is currently active — this character is composed enough to answer directly.',
  };

  // ── Attachment ───────────────────────────────────────────────────────────
  // A stable trait (unlike emotion's transient state) — it governs how the
  // character handles the INTERVIEWER relationship itself: whether they lean
  // into the conversation, withdraw from it, or oscillate between the two.
  const attachment: AttachmentReceipt = {
    style: agent.attachmentStyle ?? 'secure',
    gloss: describeAttachment(agent.attachmentStyle),
  };

  // ── Speech pattern ───────────────────────────────────────────────────────
  // Deterministic Big Five / Dark Triad / emotion → prose-style cues. This is
  // the actual voice constraint the LLM must honor, so it is surfaced both as
  // a receipt (for citability — "why does she talk like that?") and embedded
  // verbatim as a systemPrompt instruction below.
  const speechPattern = deriveSpeechPattern(agent.bigFive, agent.darkTriad, agent.emotionState);

  // ── Goals ────────────────────────────────────────────────────────────────
  // Only READY goals (all declared dependencies satisfied) surface: a goal
  // still blocked on an unmet prerequisite isn't yet live in the character's
  // mind, so presenting it as something currently motivating their answer
  // would be a false receipt. getReadyGoals only inspects GoalStack.instrumental
  // (by design — see psychology.ts) — but the TERMINAL goal is always live by
  // definition (it's what the whole stack exists to reach), so it surfaces
  // too. Without this, a character seeded with only a terminal goal (the
  // editor's "Simulate this script" flow maps `need` → terminal, no
  // instrumental steps yet) would show EMPTIER receipts than one with no
  // goalStack at all — an inversion caught by live smoke after init started
  // honoring goalStack. Agents with no goalStack fall back to hidden_motive
  // as the implicit single goal, matching decision.ts's buildPrompt().
  const goals = agent.goalStack
    ? [
        ...(agent.goalStack.terminal && !agent.goalStack.terminal.achieved
          ? [sanitizeForPrompt(agent.goalStack.terminal.description, 256)]
          : []),
        ...getReadyGoals(agent.goalStack).map(g => sanitizeForPrompt(g.description, 256)),
      ]
    : [sanitizeForPrompt(agent.hidden_motive, 256)];

  // ── Relationships in play ───────────────────────────────────────────────
  // Only derivable when the agent has formed a theory-of-mind model of at
  // least one other character. Sorted by distance from neutral trust (0.5)
  // so the most emotionally charged relationships — the ones most likely to
  // actually color THIS answer — surface first; capped at 5 to match the
  // belief receipt cadence and keep the prompt bounded.
  const tomEntries = Object.values(agent.theoryOfMind ?? {});
  const relationshipsInPlay: RelationshipReceipt[] = tomEntries
    .slice()
    .sort((a, b) => Math.abs(b.trust_level - 0.5) - Math.abs(a.trust_level - 0.5))
    .slice(0, 5)
    .map(tom => ({
      with: sanitizeForPrompt(stage?.getAgent(tom.subject_id)?.name ?? tom.subject_id, 128),
      stance: describeRelationshipStance(tom),
    }));

  // ── systemPrompt ─────────────────────────────────────────────────────────
  const beliefsBlock = beliefs.length > 0
    ? beliefs.map(b => `  - "${b.proposition}" (confidence ${Math.round(b.confidence * 100)}%${b.source ? `, source: ${b.source}` : ''})`).join('\n')
    : '  (No established beliefs are relevant to this question — answer from general character knowledge only; do not invent specific facts.)';

  const goalsBlock = goals.length > 0
    ? goals.map(g => `  - ${g}`).join('\n')
    : '  (No active goals currently in play.)';

  const relationshipsBlock = relationshipsInPlay.length > 0
    ? relationshipsInPlay.map(r => `  - ${r.with}: ${r.stance}`).join('\n')
    : '  (No specific relationships bear on this question.)';

  const systemPrompt = `You are ${safeName}, answering an off-scene interview question in character. Public persona: ${sanitizeForPrompt(agent.public_mask, 2000)}

QUESTION BEING ASKED: "${safeQuestion}"

GROUNDING — your answer is constrained by this character's actual psychological state. You may deflect, evade, or color the truth the way this character would, but you may NEVER assert a fact that contradicts a belief listed below, and you may NEVER invent a specific fact (a name, a date, an event) that isn't supported by one of these beliefs.

WHAT YOU BELIEVE (the human interviewer can see these as receipts; you cannot):
${beliefsBlock}

CURRENT EMOTIONAL STATE: ${emotion.dominant.toUpperCase()} (intensity ${emotion.intensity}/100). Let this color your tone throughout without naming the emotion outright.

ACTIVE DEFENSE: ${defense.gloss}${activeDefense ? ' Let this defense visibly shape any evasion, deflection, or discomfort in your answer.' : ''}

ATTACHMENT STYLE: ${attachment.gloss}

SPEECH PATTERN (you must speak this way): ${speechPattern || 'Speak naturally, without a pronounced stylistic tic.'}

WHAT YOU ARE CURRENTLY PURSUING:
${goalsBlock}

RELATIONSHIPS IN PLAY:
${relationshipsBlock}

RULES:
- Stay strictly in character for the entire answer. Never break the fourth wall, never mention being an AI, a simulation, or a "character".
- Never contradict a listed belief. If asked about something you hold no belief about, respond the way this character would to genuine uncertainty (deflect, guess, or admit not knowing) rather than fabricating specifics.
- Let your speech pattern, current emotion, active defense, and goals visibly shape the answer — this is what makes the answer distinguishably this character's, not a generic reply.
- Respond conversationally, as a spoken answer to a direct question — not narration, not a monologue, no stage directions.`;

  return {
    receipts: { beliefs, emotion, defense, attachment, speechPattern, goals, relationshipsInPlay },
    systemPrompt,
  };
}
