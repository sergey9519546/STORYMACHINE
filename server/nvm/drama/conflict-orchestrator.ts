// Wave 36 — Conflict Orchestrator
// Proactively computes goal collisions from character intention registries,
// identifies threatened plans, leverage reversals, and ticking clocks.
// Surface these to the branch field and drama manager so they can propose
// detonating branches.

import type { IntentionRegistry, CharacterIntention } from './intention-registry.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Two characters whose terminal goals are structurally incompatible */
export interface GoalCollision {
  charA: string;
  charB: string;
  nameA: string;
  nameB: string;
  goalA: string;
  goalB: string;
  /** 0-100: how explosive is this collision? */
  severity: number;
  /** A branch move that would detonate this collision */
  detonatingMove: string;
}

/** A character whose plan is currently threatened */
export interface ThreatenedPlan {
  charId: string;
  name: string;
  plan: string;
  threat: string;
  urgency: number;
}

/** A clock that is ticking toward a dramatic deadline */
export interface TickingClock {
  clockId: string;
  level: number;
  narrativeLabel: string;
  urgency: 'critical' | 'high' | 'moderate' | 'low';
}

/** A dramatic leverage reversal opportunity */
export interface LeverageReversal {
  charId: string;
  name: string;
  currentlyStrong: boolean;
  reversalMove: string;
  tensionGain: number;
}

export interface ConflictReport {
  collisions: GoalCollision[];
  threatenedPlans: ThreatenedPlan[];
  tickingClocks: TickingClock[];
  leverageReversals: LeverageReversal[];
  totalDramaticPressure: number;
  builtAt: number;
}

// ── Conflict detection ────────────────────────────────────────────────────────

/**
 * Analyse the intention registry and NarrativeState to compute dramatic conflicts.
 */
export function computeConflicts(
  registry: IntentionRegistry,
  state: NarrativeState,
): ConflictReport {
  const collisions = detectGoalCollisions(registry.intentions);
  const threatenedPlans = detectThreatenedPlans(registry.intentions);
  const tickingClocks = detectTickingClocks(state);
  const leverageReversals = detectLeverageReversals(registry.intentions, state);

  // Total pressure = weighted sum; guard each term against NaN
  const fin = (n: number): number => (isFinite(n) ? n : 0);
  const totalDramaticPressure = Math.min(100,
    collisions.reduce((s, c) => s + fin(c.severity) * 0.4, 0) +
    threatenedPlans.reduce((s, t) => s + fin(t.urgency) * 0.3, 0) +
    tickingClocks.filter(c => c.urgency === 'critical').length * 20 +
    tickingClocks.filter(c => c.urgency === 'high').length * 10 +
    leverageReversals.reduce((s, l) => s + fin(l.tensionGain) * 0.3, 0)
  );

  return { collisions, threatenedPlans, tickingClocks, leverageReversals, totalDramaticPressure, builtAt: Date.now() };
}

// ── Collision detector ────────────────────────────────────────────────────────

function detectGoalCollisions(intentions: CharacterIntention[]): GoalCollision[] {
  const collisions: GoalCollision[] = [];

  for (let i = 0; i < intentions.length; i++) {
    for (let j = i + 1; j < intentions.length; j++) {
      const a = intentions[i], b = intentions[j];
      const collision = checkCollision(a, b);
      if (collision) collisions.push(collision);
    }
  }

  return collisions.sort((a, b) => b.severity - a.severity);
}

function checkCollision(a: CharacterIntention, b: CharacterIntention): GoalCollision | null {
  // Structural collision heuristics:
  //   1. Opposite-direction goals (one wants X, other wants NOT-X)
  //   2. Resource conflict: both mention the same noun (object/location/person)
  //   3. Epistemic conflict: one believes something false that blocks the other

  const aWords = new Set(a.terminalWant.toLowerCase().split(/\W+/).filter(w => w.length > 4));
  const bWords = new Set(b.terminalWant.toLowerCase().split(/\W+/).filter(w => w.length > 4));
  const shared = [...aWords].filter(w => bWords.has(w));

  if (shared.length === 0) return null; // No obvious conflict

  // Check for contradiction keywords: expose/hide, find/conceal, protect/harm, etc.
  const contradictPairs = [
    ['expose', 'conceal'], ['reveal', 'hide'], ['find', 'destroy'],
    ['protect', 'harm'], ['accuse', 'defend'], ['arrest', 'escape'],
    ['keep', 'steal'], ['prove', 'deny'],
    ['warn', 'silence'], ['cooperate', 'betray'], ['save', 'kill'],
    ['trust', 'manipulate'], ['love', 'control'], ['support', 'undermine'],
    ['include', 'exile'], ['remember', 'erase'],
  ];

  let conflictType = 'resource';
  for (const [kw1, kw2] of contradictPairs) {
    if ((a.terminalWant.toLowerCase().includes(kw1) && b.terminalWant.toLowerCase().includes(kw2)) ||
        (a.terminalWant.toLowerCase().includes(kw2) && b.terminalWant.toLowerCase().includes(kw1))) {
      conflictType = 'directional';
      break;
    }
  }

  // Guard against NaN urgency propagating into severity
  const finUrgA = isFinite(a.urgency) ? a.urgency : 50;
  const finUrgB = isFinite(b.urgency) ? b.urgency : 50;
  const severity = conflictType === 'directional'
    ? Math.round((finUrgA + finUrgB) / 2)
    : Math.round((finUrgA + finUrgB) / 4);

  if (severity < 15) return null; // Too mild to surface (lowered from 20 to catch more conflicts)

  const resource = shared[0] ?? 'the situation';
  const detonatingMove = conflictType === 'directional'
    ? `Force ${a.name} and ${b.name} into direct confrontation over "${resource}"`
    : `Inject: ${a.name} and ${b.name} both reach for ${resource} at the same moment`;

  return {
    charA: a.charId, charB: b.charId,
    nameA: a.name, nameB: b.name,
    goalA: a.terminalWant, goalB: b.terminalWant,
    severity,
    detonatingMove,
  };
}

// ── Threatened plan detector ──────────────────────────────────────────────────

function detectThreatenedPlans(intentions: CharacterIntention[]): ThreatenedPlan[] {
  return intentions
    .filter(i => i.threatened)
    .map(i => ({
      charId: i.charId,
      name: i.name,
      plan: i.wantNow,
      threat: i.beliefJustifying.length > 0
        ? `Contradicted by: "${i.beliefJustifying[0]}"`
        : 'Unknown threat vector',
      urgency: i.urgency,
    }))
    .sort((a, b) => b.urgency - a.urgency);
}

// ── Clock detector ────────────────────────────────────────────────────────────

function detectTickingClocks(state: NarrativeState): TickingClock[] {
  const clocks: TickingClock[] = [];

  for (const [clockId, level] of Object.entries(state.clocks)) {
    const urgency: TickingClock['urgency'] =
      level >= 8 ? 'critical' :
      level >= 5 ? 'high' :
      level >= 3 ? 'moderate' : 'low';

    // Generate a narrative label from the clock ID
    const label = clockId
      .replace(/[_:]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    clocks.push({ clockId, level, narrativeLabel: label, urgency });
  }

  return clocks.sort((a, b) => b.level - a.level);
}

// ── Leverage reversal detector ────────────────────────────────────────────────

function detectLeverageReversals(
  intentions: CharacterIntention[],
  state: NarrativeState,
): LeverageReversal[] {
  const reversals: LeverageReversal[] = [];

  for (const intention of intentions) {
    // A character is "currently strong" if their urgency is low (comfortable position)
    // but they have a high-value terminal goal — prime for reversal
    const currentlyStrong = intention.urgency < 50 && !intention.threatened;

    if (currentlyStrong) {
      // Propose a reversal move based on their beliefs
      const justification = intention.beliefJustifying[0] ?? intention.wantNow;
      const reversalMove = `Inject: evidence contradicts ${intention.name}'s belief that "${justification.slice(0, 60)}"`;
      const tensionGain = Math.round((100 - intention.urgency) * 0.6);

      if (tensionGain >= 20) {
        reversals.push({
          charId: intention.charId,
          name: intention.name,
          currentlyStrong,
          reversalMove,
          tensionGain,
        });
      }
    }
  }

  // Also check relationship dimensions for leverage
  for (const [pairKey, deltas] of Object.entries(state.relationships)) {
    const [a, b] = pairKey.split('|');
    const charA = intentions.find(i => i.charId === a);
    const charB = intentions.find(i => i.charId === b);
    if (!charA || !charB) continue;

    const totalDebt = deltas.reduce((s, d) => s + (d.dimension === 'obligation' ? d.amount : 0), 0);
    if (totalDebt > 0.5) {
      const nameA = charA.name, nameB = charB.name;
      reversals.push({
        charId: a,
        name: nameA,
        currentlyStrong: true,
        reversalMove: `${nameA} calls in the debt — ${nameB} must choose between obligation and goal`,
        tensionGain: Math.round(totalDebt * 60),
      });
    }
  }

  return reversals.sort((a, b) => b.tensionGain - a.tensionGain);
}
