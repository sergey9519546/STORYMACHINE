// Contradiction Futures Market (C1) — tension as mark-to-market value of
// open dramatic positions. Each unresolved dramatic contradiction (a belief
// a character holds that conflicts with objective reality, or an unexposed lie,
// or an uncommitted payoff) is a "position". Its mark-to-market value is the
// expected dramatic payoff * audience investment * time-pressure factor.
// Aggregate tension = Σ position values.
//
// This gives the Convergence Loop (G1) a cardinal reward signal instead of
// a binary pass/fail.

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import type { StoryOpKind } from '../ops/StoryOp.ts';

export interface DramaticPosition {
  positionId: string;
  kind: 'belief_conflict' | 'unexposed_lie' | 'open_payoff' | 'ticking_clock' | 'unresolved_relationship';
  charId?: string;
  description: string;
  openedAtScene: number;
  expectedPayoff: number;   // 0–100: how big will the reveal/resolution be?
  timeDecay: number;         // multiplier <1 applied each scene the position stays open
  markToMarket: number;      // computed = expectedPayoff * investment * (timeDecay^age)
}

export interface TensionLedger {
  positions: DramaticPosition[];
  totalTension: number;        // Σ markToMarket
  sceneIdx: number;
}

export function openPosition(
  id: string,
  kind: DramaticPosition['kind'],
  description: string,
  openedAtScene: number,
  expectedPayoff: number,
  charId?: string,
): DramaticPosition {
  return {
    positionId: id,
    kind,
    charId,
    description,
    openedAtScene,
    expectedPayoff,
    timeDecay: 0.92,
    markToMarket: expectedPayoff,
  };
}

export function markToMarket(
  position: DramaticPosition,
  currentScene: number,
  audienceInvestment: number,   // 0–1 from NarrativeState.audienceState.investment
): DramaticPosition {
  const age = Math.max(0, currentScene - position.openedAtScene);
  const decayed = position.expectedPayoff * Math.pow(position.timeDecay, age);
  return {
    ...position,
    markToMarket: Math.round(decayed * audienceInvestment * 100) / 100,
  };
}

// Derive positions automatically from NarrativeState.
// This is a heuristic scan — the Convergence Loop can also maintain positions explicitly.
export function deriveTensionLedger(state: NarrativeState, sceneIdx: number): TensionLedger {
  const positions: DramaticPosition[] = [];
  const investment = Math.max(0.1, state.audienceState.investment / 100);

  // Belief-vs-reality conflicts: character believes X, but objective reality says not-X.
  // Detected heuristically: look for character beliefs whose proposition mentions a
  // subject+predicate that appears in objective reality with a different object.
  const factIndex = new Map<string, string>(); // "subject|predicate" → object
  for (const f of state.objectiveReality) {
    factIndex.set(`${f.subject}|${f.predicate}`, f.object);
  }
  for (const [charId, beliefs] of Object.entries(state.characterBeliefs)) {
    for (const belief of beliefs) {
      // Simple heuristic: if the belief was told (not witnessed) it may be false
      if (belief.source === 'told' && belief.confidence > 0.5) {
        const pos = openPosition(
          `belief_conflict_${charId}_${belief.id}`,
          'belief_conflict',
          `${charId} holds a potentially false told-belief: "${belief.proposition.slice(0, 60)}"`,
          sceneIdx,
          75,
          charId,
        );
        positions.push(markToMarket(pos, sceneIdx, investment));
      }
    }
  }

  // Open payoffs: PAYOFF_SETUP ops whose setups haven't been paid off yet
  for (const payoff of state.payoffs) {
    const pos = openPosition(
      `payoff_${payoff.setupId}`,
      'open_payoff',
      `Setup "${payoff.setupId}" is planted, payoff pending`,
      sceneIdx,
      85,
    );
    positions.push(markToMarket(pos, sceneIdx, investment));
  }

  // Ticking clocks
  for (const [clockId, value] of Object.entries(state.clocks)) {
    if (value > 0) {
      const urgency = Math.min(100, value * 10);
      const pos = openPosition(
        `clock_${clockId}`,
        'ticking_clock',
        `Clock "${clockId}" is running (value ${value})`,
        sceneIdx,
        urgency,
      );
      positions.push(markToMarket(pos, sceneIdx, investment));
    }
  }

  // 5th tension feature — Unexposed lies: told beliefs with low confidence.
  // The character suspects deception but hasn't uncovered the truth — a ticking
  // dramatic irony that pressures confrontation scenes.
  for (const [charId, beliefs] of Object.entries(state.characterBeliefs)) {
    for (const belief of beliefs) {
      if (belief.source === 'told' && belief.confidence >= 0.1 && belief.confidence < 0.4) {
        const pos = openPosition(
          `unexposed_lie_${charId}_${belief.id}`,
          'unexposed_lie',
          `${charId} half-suspects a lie: "${belief.proposition.slice(0, 60)}" (confidence ${belief.confidence.toFixed(2)})`,
          sceneIdx,
          65,
          charId,
        );
        positions.push(markToMarket(pos, sceneIdx, investment));
      }
    }
  }

  // Relationship tensions: large negative shift history
  for (const [key, deltas] of Object.entries(state.relationships)) {
    const net = deltas.reduce((s, d) => s + (isFinite(d.amount) ? d.amount : 0), 0);
    if (net < -0.3) {
      const pos = openPosition(
        `rel_tension_${key}`,
        'unresolved_relationship',
        `Relationship ${key} has net delta ${net.toFixed(2)} — unresolved conflict`,
        sceneIdx,
        60,
      );
      positions.push(markToMarket(pos, sceneIdx, investment));
    }
  }

  const totalTension = Math.round(positions.reduce((s, p) => s + p.markToMarket, 0) * 10) / 10;
  return { positions, totalTension, sceneIdx };
}

// Monotonicity check: tension should rise across successive scenes until the
// climax. Used as the Convergence Loop acceptance gate.
export function tensionMonotone(ledgers: TensionLedger[]): boolean {
  if (ledgers.length < 2) return true;
  for (let i = 1; i < ledgers.length; i++) {
    if (ledgers[i].totalTension < ledgers[i - 1].totalTension * 0.8) return false;
  }
  return true;
}

// ── Narrative Momentum ────────────────────────────────────────────────────────
// The rolling rate of high-value story events over the last 3 commits.
// High momentum = story is advancing rapidly (use as a pacing throttle).
// Returns 0–100; ~6 high-value ops/scene = 100.

const HIGH_VALUE_OPS: Set<StoryOpKind> = new Set([
  'UPDATE_BELIEF', 'APPRAISE_EMOTION', 'SHIFT_RELATIONSHIP',
  'ADVANCE_THEME_ARGUMENT', 'PAYOFF_SETUP', 'SEED_CLUE',
]);

export function momentumScore(commits: StoryCommit[]): number {
  const window = commits.slice(-3);
  if (window.length === 0) return 0;
  const total = window.reduce(
    (sum, c) => sum + c.ops.filter(o => HIGH_VALUE_OPS.has(o.op)).length,
    0,
  );
  return Math.min(100, Math.round((total / window.length) * (100 / 6)));
}
