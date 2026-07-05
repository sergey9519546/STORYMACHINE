// B1-f — Defense cascade (arousal/freeze/flight/fight/fawn/collapse) and
// Id/Ego/Superego Trinity arbitration. Unit tests for the new exports in
// server/engine/agent/psychology.ts: computeDefenseCascadeState,
// cascadeBehaviorProfile, cascadeActionBias, arbitrateTrinity,
// trinityActionBias, describeTrinityGuidance.
//
// These are pure, deterministic functions — no Stage/LLM involved — so every
// test operates directly on hand-built inputs (cascade) or hand-built
// CharacterSheets (trinity). Fire + no-fire pairs per CLAUDE.md's quality bar.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeDefenseCascadeState,
  cascadeBehaviorProfile,
  arbitrateTrinity,
  describeTrinityGuidance,
} from '../../server/engine/agent/psychology.ts';
import type { DefenseCascadeInputs, CascadeState, TrinityAgent } from '../../server/engine/agent/psychology.ts';
import type { CharacterSheet, EmotionState, Stakes } from '../../server/engine/types.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function cascadeInputs(overrides: Partial<DefenseCascadeInputs> = {}): DefenseCascadeInputs {
  return {
    threatLevel: 0,
    suddenness: 0,
    escapeAvailable: false,
    powerDifferential: 0,
    socialThreat: false,
    angerDominant: false,
    exposureTurns: 0,
    ...overrides,
  };
}

function emotion(overrides: Partial<EmotionState> = {}): EmotionState {
  return {
    joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0,
    dominant: 'neutral', intensity: 0, last_updated_at: 0,
    ...overrides,
  };
}

function baseSheet(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    char_id: 'c1',
    name: 'Test Character',
    public_mask: 'A calm professional.',
    hidden_motive: 'Protect the secret.',
    knowledge_vector: [],
    current_location_id: 'room-a',
    suspicion_score: 0,
    is_alive: true,
    ...overrides,
  };
}

function survivalStake(magnitude: number, overrides: Partial<Stakes> = {}): Stakes {
  return {
    id: 's1', char_id: 'c1', category: 'survival',
    description: 'Might die tonight.', magnitude, is_active: true,
    ...overrides,
  };
}

const ALL_CASCADE_STATES: CascadeState[] = ['arousal', 'freeze', 'flight', 'fight', 'fawn', 'collapse'];
const ALL_TRINITY_AGENTS: TrinityAgent[] = ['id', 'ego', 'superego'];

// ── Cascade: every state reachable (fire tests) ──────────────────────────────

describe('computeDefenseCascadeState — every state reachable', () => {
  it('fires AROUSAL under low threat (alert baseline)', () => {
    const r = computeDefenseCascadeState(cascadeInputs({ threatLevel: 10 }));
    assert.equal(r.state, 'arousal');
  });

  it('does NOT fire AROUSAL once threat crosses the activation threshold', () => {
    const r = computeDefenseCascadeState(cascadeInputs({ threatLevel: 70, escapeAvailable: true }));
    assert.notEqual(r.state, 'arousal');
  });

  it('fires FREEZE on sudden onset with no time yet to assess (first-instant reflex)', () => {
    const r = computeDefenseCascadeState(cascadeInputs({
      threatLevel: 70, suddenness: 90, exposureTurns: 0, escapeAvailable: true,
    }));
    assert.equal(r.state, 'freeze');
  });

  it('does NOT fire FREEZE once exposure has continued past the first-instant window', () => {
    const r = computeDefenseCascadeState(cascadeInputs({
      threatLevel: 70, suddenness: 90, exposureTurns: 3, escapeAvailable: true,
    }));
    assert.notEqual(r.state, 'freeze');
  });

  it('fires FLIGHT when a viable exit exists and nothing overrides it', () => {
    const r = computeDefenseCascadeState(cascadeInputs({
      threatLevel: 65, suddenness: 10, escapeAvailable: true, exposureTurns: 2,
    }));
    assert.equal(r.state, 'flight');
  });

  it('does NOT fire FLIGHT when no exit exists', () => {
    const r = computeDefenseCascadeState(cascadeInputs({
      threatLevel: 65, suddenness: 10, escapeAvailable: false, exposureTurns: 2,
    }));
    assert.notEqual(r.state, 'flight');
  });

  it('fires FIGHT when escape is blocked', () => {
    const r = computeDefenseCascadeState(cascadeInputs({
      threatLevel: 65, suddenness: 10, escapeAvailable: false, exposureTurns: 2,
    }));
    assert.equal(r.state, 'fight');
  });

  it('does NOT fire FIGHT when an exit exists and anger is not dominant', () => {
    const r = computeDefenseCascadeState(cascadeInputs({
      threatLevel: 65, suddenness: 10, escapeAvailable: true, angerDominant: false, exposureTurns: 2,
    }));
    assert.notEqual(r.state, 'fight');
  });

  it('fires FAWN under social threat + meaningful power imbalance', () => {
    const r = computeDefenseCascadeState(cascadeInputs({
      threatLevel: 65, suddenness: 10, escapeAvailable: true,
      socialThreat: true, powerDifferential: -60, exposureTurns: 2,
    }));
    assert.equal(r.state, 'fawn');
  });

  it('does NOT fire FAWN when the threat is not social', () => {
    const r = computeDefenseCascadeState(cascadeInputs({
      threatLevel: 65, suddenness: 10, escapeAvailable: true,
      socialThreat: false, powerDifferential: -60, exposureTurns: 2,
    }));
    assert.notEqual(r.state, 'fawn');
  });

  it('fires COLLAPSE under prolonged, maxed-out threat with no escape', () => {
    const r = computeDefenseCascadeState(cascadeInputs({
      threatLevel: 95, suddenness: 5, escapeAvailable: false, exposureTurns: 6,
    }));
    assert.equal(r.state, 'collapse');
  });

  it('does NOT fire COLLAPSE when exposure has not yet been prolonged', () => {
    const r = computeDefenseCascadeState(cascadeInputs({
      threatLevel: 95, suddenness: 5, escapeAvailable: false, exposureTurns: 1,
    }));
    assert.notEqual(r.state, 'collapse');
  });
});

// ── Cascade: ordering sanity ─────────────────────────────────────────────────

describe('computeDefenseCascadeState — ordering sanity', () => {
  it('flips FLIGHT -> FIGHT when escape becomes blocked (same other inputs)', () => {
    const withExit = cascadeInputs({ threatLevel: 65, suddenness: 10, escapeAvailable: true, exposureTurns: 2 });
    const blocked = cascadeInputs({ ...withExit, escapeAvailable: false });
    assert.equal(computeDefenseCascadeState(withExit).state, 'flight');
    assert.equal(computeDefenseCascadeState(blocked).state, 'fight');
  });

  it('adding a power imbalance under social threat yields FAWN (overriding flight/fight)', () => {
    const parity = cascadeInputs({
      threatLevel: 65, suddenness: 10, escapeAvailable: true, socialThreat: true, powerDifferential: 0, exposureTurns: 2,
    });
    const dominated = cascadeInputs({ ...parity, powerDifferential: -70 });
    assert.notEqual(computeDefenseCascadeState(parity).state, 'fawn');
    assert.equal(computeDefenseCascadeState(dominated).state, 'fawn');
  });

  it('prolonged exposure at max threat with no escape yields COLLAPSE regardless of the starting state', () => {
    const brief = cascadeInputs({ threatLevel: 95, suddenness: 5, escapeAvailable: false, exposureTurns: 0 });
    const prolonged = cascadeInputs({ ...brief, exposureTurns: 8 });
    assert.notEqual(computeDefenseCascadeState(brief).state, 'collapse');
    assert.equal(computeDefenseCascadeState(prolonged).state, 'collapse');
  });

  it('anger dominance can override an available exit into FIGHT', () => {
    const calm = cascadeInputs({ threatLevel: 65, suddenness: 10, escapeAvailable: true, angerDominant: false, exposureTurns: 2 });
    const angry = cascadeInputs({ ...calm, angerDominant: true });
    assert.equal(computeDefenseCascadeState(calm).state, 'flight');
    assert.equal(computeDefenseCascadeState(angry).state, 'fight');
  });
});

// ── Cascade: determinism + intensity bounds ──────────────────────────────────

describe('computeDefenseCascadeState — determinism & bounds', () => {
  it('is deterministic: identical inputs produce identical output twice', () => {
    const inputs = cascadeInputs({ threatLevel: 72, suddenness: 40, escapeAvailable: true, exposureTurns: 3, socialThreat: true, powerDifferential: -20 });
    const a = computeDefenseCascadeState(inputs);
    const b = computeDefenseCascadeState(inputs);
    assert.deepEqual(a, b);
  });

  it('keeps intensity within [0, 100] across a spread of inputs, including extreme/out-of-range values', () => {
    const spread: DefenseCascadeInputs[] = [
      cascadeInputs({ threatLevel: -50 }),
      cascadeInputs({ threatLevel: 500, suddenness: 999, exposureTurns: 1000, escapeAvailable: false }),
      cascadeInputs({ threatLevel: 95, exposureTurns: 50, escapeAvailable: false }),
      cascadeInputs({ threatLevel: 65, escapeAvailable: true, socialThreat: true, powerDifferential: -1000 }),
      cascadeInputs({ threatLevel: 0 }),
      cascadeInputs({ threatLevel: 100, escapeAvailable: true, angerDominant: true }),
    ];
    for (const inputs of spread) {
      const r = computeDefenseCascadeState(inputs);
      assert.ok(r.intensity >= 0 && r.intensity <= 100, `intensity ${r.intensity} out of bounds for state ${r.state}`);
      assert.ok(Number.isFinite(r.intensity));
    }
  });
});

// ── Cascade: behavior profile completeness ───────────────────────────────────

describe('cascadeBehaviorProfile — completeness', () => {
  for (const state of ALL_CASCADE_STATES) {
    it(`returns a fully-populated profile for ${state}`, () => {
      const profile = cascadeBehaviorProfile(state);
      assert.ok(profile.dialogueStyle.length > 0);
      assert.ok(profile.promptInstruction.length > 0);
      assert.ok(['full', 'limited', 'movement', 'confrontation', 'submission', 'near_zero'].includes(profile.choiceSpace));
    });
  }

  it('gives freeze and collapse the most restrictive choice spaces', () => {
    assert.equal(cascadeBehaviorProfile('freeze').choiceSpace, 'limited');
    assert.equal(cascadeBehaviorProfile('collapse').choiceSpace, 'near_zero');
  });

  it('gives arousal the full choice space', () => {
    assert.equal(cascadeBehaviorProfile('arousal').choiceSpace, 'full');
  });
});

// ── Trinity: winner fire tests ────────────────────────────────────────────────

describe('arbitrateTrinity — winner selection', () => {
  it('ID wins under high fear + active survival stakes', () => {
    const sheet = baseSheet({
      emotionState: emotion({ dominant: 'fear', intensity: 90, fear: 90 }),
      stakes: [survivalStake(90)],
    });
    const r = arbitrateTrinity(sheet);
    assert.equal(r.winner, 'id');
  });

  it('EGO wins with strong instrumental goal feasibility + only moderate emotion', () => {
    const sheet = baseSheet({
      bigFive: { openness: 50, conscientiousness: 85, extraversion: 50, agreeableness: 50, neuroticism: 50 },
      emotionState: emotion({ dominant: 'fear', intensity: 40, fear: 40 }),
      goalStack: {
        terminal: { id: 'g0', description: 'escape the building', value: 90, achieved: false },
        instrumental: [
          { id: 'g1', description: 'find the exit', value: 80, achieved: false },
          { id: 'g2', description: 'grab the evidence', value: 70, achieved: false },
        ],
        last_planned_at: 0,
      },
      suspicion_score: 5,
    });
    const r = arbitrateTrinity(sheet);
    assert.equal(r.winner, 'ego');
  });

  it('SUPEREGO wins under moral-violation pressure (shame + high agreeableness + low dark triad + obligation)', () => {
    const sheet = baseSheet({
      darkTriad: { machiavellianism: 10, narcissism: 20, psychopathy: 5 },
      bigFive: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 90, neuroticism: 50 },
      emotionState: emotion({ dominant: 'shame', intensity: 90, shame: 90 }),
      theoryOfMind: {
        a2: { subject_id: 'a2', believed_knowledge: [], believed_motive: 'unknown', trust_level: 0.6, debt: 0.8 },
      },
    });
    const r = arbitrateTrinity(sheet);
    assert.equal(r.winner, 'superego');
  });

  it('colorer is always the runner-up across a spread of scenarios', () => {
    const scenarios: CharacterSheet[] = [
      baseSheet({ emotionState: emotion({ dominant: 'fear', intensity: 90, fear: 90 }), stakes: [survivalStake(90)] }),
      baseSheet({
        bigFive: { openness: 50, conscientiousness: 85, extraversion: 50, agreeableness: 50, neuroticism: 50 },
        goalStack: {
          terminal: { id: 'g0', description: 'win', value: 90, achieved: false },
          instrumental: [{ id: 'g1', description: 'gather clues', value: 80, achieved: false }],
          last_planned_at: 0,
        },
      }),
      baseSheet({
        darkTriad: { machiavellianism: 5, narcissism: 5, psychopathy: 5 },
        bigFive: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 95, neuroticism: 50 },
        emotionState: emotion({ dominant: 'shame', intensity: 95, shame: 95 }),
      }),
      baseSheet(), // minimal/neutral — no strong signal anywhere
    ];
    for (const sheet of scenarios) {
      const r = arbitrateTrinity(sheet);
      const scores: Record<TrinityAgent, number> = { id: r.idProposal, ego: r.egoAssessment, superego: r.superegoPressure };
      const sortedAgents = ALL_TRINITY_AGENTS.slice().sort((a, b) => scores[b] - scores[a]);
      assert.equal(r.winner, sortedAgents[0]);
      assert.equal(r.colorer, sortedAgents[1]);
      assert.notEqual(r.winner, r.colorer);
    }
  });

  it('is deterministic: identical sheet produces identical arbitration twice', () => {
    const sheet = baseSheet({
      darkTriad: { machiavellianism: 40, narcissism: 60, psychopathy: 30 },
      bigFive: { openness: 60, conscientiousness: 55, extraversion: 45, agreeableness: 65, neuroticism: 50 },
      emotionState: emotion({ dominant: 'anger', intensity: 55, anger: 55 }),
      stakes: [survivalStake(40)],
      goalStack: {
        terminal: { id: 'g0', description: 'objective', value: 80, achieved: false },
        instrumental: [{ id: 'g1', description: 'subgoal', value: 60, achieved: false }],
        last_planned_at: 0,
      },
    });
    const a = arbitrateTrinity(sheet);
    const b = arbitrateTrinity(sheet);
    assert.deepEqual(a, b);
  });

  it('does not crash on an empty/minimal character sheet and returns bounded scores', () => {
    const sheet = baseSheet(); // no darkTriad/bigFive/emotionState/goalStack/stakes/theoryOfMind
    const r = arbitrateTrinity(sheet);
    assert.ok(ALL_TRINITY_AGENTS.includes(r.winner));
    assert.ok(ALL_TRINITY_AGENTS.includes(r.colorer));
    for (const score of [r.idProposal, r.egoAssessment, r.superegoPressure]) {
      assert.ok(score >= 0 && score <= 100 && Number.isFinite(score));
    }
    assert.ok(r.rationale.length > 0);
    assert.ok(describeTrinityGuidance(r).length > 0);
  });
});
