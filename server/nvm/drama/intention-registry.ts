// Wave 36 — Centralized Intention Registry
// Per-character record of what they want NOW, why they believe it, and what
// they stand to lose. Built from Stage's CharacterSheet.goalStack + beliefs.
//
// The registry makes the branch field and NPC reactions dramatically intelligent
// rather than just reactive — they know who wants what and why.

import type { Stage } from '../../engine/Stage.ts';
import type { Belief } from '../../engine/types.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CharacterIntention {
  charId: string;
  name: string;
  /** The immediate goal they're pursuing this scene */
  wantNow: string;
  /** The terminal goal driving everything */
  terminalWant: string;
  /** Current top instrumental subgoal */
  currentSubgoal: string | null;
  /** Beliefs that justify pursuing this goal */
  beliefJustifying: string[];
  /** What they lose if they fail their terminal goal */
  whatTheyLose: string;
  /** 0-100: how important is this goal to them */
  urgency: number;
  /** True if terminal goal is threatened */
  threatened: boolean;
}

export interface IntentionRegistry {
  intentions: CharacterIntention[];
  totalChars: number;
  builtAt: number;
}

// ── Registry builder ──────────────────────────────────────────────────────────

/**
 * Build the intention registry from the live Stage.
 * Reads CharacterSheets + their beliefs to construct CharacterIntention records.
 */
export function buildIntentionRegistry(stage: Stage): IntentionRegistry {
  const agents = stage.getAllAgents().filter(a => a.is_alive !== false);
  const intentions: CharacterIntention[] = [];

  for (const agent of agents) {
    const gs = agent.goalStack;
    const beliefs: Belief[] = agent.beliefs ?? [];

    // Beliefs that reference the terminal goal or instrumental goals
    const goalKeywords = [
      gs?.terminal.description ?? '',
      ...(gs?.instrumental.map(g => g.description) ?? []),
    ].flatMap(d => d.toLowerCase().split(/\W+/).filter(w => w.length > 4));

    const justifyingBeliefs = beliefs
      .filter(b => goalKeywords.some(kw => b.proposition.toLowerCase().includes(kw)))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(b => b.proposition);

    // "What they lose" = most important stake, or derived from terminal goal
    const stakes = agent.stakes ?? [];
    const biggestStake = stakes
      .filter(s => s.is_active)
      .sort((a, b) => b.magnitude - a.magnitude)[0];
    const whatTheyLose = biggestStake
      ? biggestStake.description
      : `fails to achieve: ${gs?.terminal.description ?? 'their goal'}`;

    // Top instrumental subgoal (first not-yet-achieved)
    const currentSubgoal = gs?.instrumental.find(g => !g.achieved)?.description ?? null;

    // wantNow: the most pressing instrumental goal, or the terminal if none
    const wantNow = currentSubgoal ?? gs?.terminal.description ?? 'survive the scene';

    // Urgency: terminal goal value, boosted if threatened
    const threatened = agent.suspicion_score > 60 ||
      (gs?.terminal.achieved === false && agent.suspicion_score > 40);
    const urgency = Math.min(100, (gs?.terminal.value ?? 50) + (threatened ? 20 : 0));

    intentions.push({
      charId: agent.char_id,
      name: agent.name,
      wantNow,
      terminalWant: gs?.terminal.description ?? 'undefined',
      currentSubgoal,
      beliefJustifying: justifyingBeliefs,
      whatTheyLose,
      urgency,
      threatened,
    });
  }

  // Sort by urgency descending (most pressing character first)
  intentions.sort((a, b) => b.urgency - a.urgency);

  return { intentions, totalChars: intentions.length, builtAt: Date.now() };
}
