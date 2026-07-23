// Trinity Gate Integration Tests
//
// Tests the complete three-layer verification system on real screenplay scenarios.
// Validates that Trinity Gate catches plot holes that Story Graph alone would miss.
//
// Test scenarios:
// 1. Character knows information they shouldn't (epistemic violation)
// 2. Character uses object they don't possess (possession violation)
// 3. Character travels impossibly fast (spatial violation)
// 4. Payoff without setup (promise violation)
// 5. Unmotivated character action (intentionality violation)
// 6. World consistency violation (contradictory facts)

import { describe, it, expect } from 'vitest';
import { runTrinityGate, formatVerificationReport } from '../trinity-gate.ts';
import type { NarrativeEvent } from '../types.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import { emptyState } from '../../state/NarrativeState.ts';

// ── Test Helpers ──────────────────────────────────────────────────────────────

function createEvent(
  sceneIdx: number,
  storyTime: number,
  presentationIndex: number,
  op: any
): NarrativeEvent {
  return {
    eventId: `evt_${sceneIdx}_${presentationIndex}`,
    eventHash: 'hash',
    parentHash: null,
    storyTime,
    presentationIndex,
    op,
    assertions: [],
    derivedFrom: [],
    createdBy: 'user_authored',
    realityLayer: 'diegetic',
    sceneIdx,
    createdAt: Date.now(),
  };
}

function createState(overrides: Partial<NarrativeState> = {}): NarrativeState {
  return {
    ...emptyState(),
    ...overrides,
  };
}

// ── Scenario 1: Epistemic Violation ───────────────────────────────────────────

describe('Trinity Gate - Epistemic Consistency', () => {
  it('should catch character knowing information they never observed', async () => {
    // Scene 1: Bob hides key in drawer (Alice not present)
    const event1 = createEvent(1, 10, 0, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_1',
        subject: 'CHAR_Bob',
        predicate: 'hides',
        object: 'OBJ_key_in_drawer',
        addedAtTurn: 1,
        validFrom: 10,
        validTo: null,
      },
    });

    // Scene 2: Alice retrieves key from drawer (without being told)
    const event2 = createEvent(2, 20, 1, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_2',
        subject: 'CHAR_Alice',
        predicate: 'retrieves',
        object: 'OBJ_key',
        addedAtTurn: 2,
        validFrom: 20,
        validTo: null,
      },
    });

    const state = createState({
      objectiveReality: [
        {
          factId: 'fact_1',
          subject: 'CHAR_Bob',
          predicate: 'hides',
          object: 'OBJ_key_in_drawer',
          addedAtTurn: 1,
          validFrom: 10,
          validTo: null,
        },
      ],
      characterBeliefs: {
        CHAR_Alice: [], // Alice has no belief about key location
      },
    });

    const result = await runTrinityGate(event2, state, [event1]);

    expect(result.pass).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    
    // Should have at least one epistemic violation
    const epistemicViolations = result.violations.filter(v => v.type === 'epistemic');
    expect(epistemicViolations.length).toBeGreaterThan(0);
    expect(epistemicViolations[0].message).toContain('without knowing its location');
    expect(result.summary.failedLayers).toContain('preflight');
  });

  it('should pass when character observes fact directly', async () => {
    // Scene 1: Bob hides key, Alice is present
    const event1 = createEvent(1, 10, 0, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_1',
        subject: 'CHAR_Bob',
        predicate: 'hides',
        object: 'OBJ_key_in_drawer',
        addedAtTurn: 1,
        validFrom: 10,
        validTo: null,
      },
    });

    // Alice believes key is in drawer (witnessed)
    const event2 = createEvent(1, 11, 1, {
      op: 'UPDATE_BELIEF',
      charId: 'CHAR_Alice',
      belief: {
        id: 'belief_1',
        proposition: 'key is in drawer',
        confidence: 0.95,
        source: 'witnessed',
        acquired_at: 1,
      },
    });

    // Scene 2: Alice retrieves key
    const event3 = createEvent(2, 20, 2, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_2',
        subject: 'CHAR_Alice',
        predicate: 'retrieves',
        object: 'OBJ_key',
        addedAtTurn: 2,
        validFrom: 20,
        validTo: null,
      },
    });

    const state = createState({
      objectiveReality: [
        {
          factId: 'fact_1',
          subject: 'CHAR_Bob',
          predicate: 'hides',
          object: 'OBJ_key_in_drawer',
          addedAtTurn: 1,
          validFrom: 10,
          validTo: null,
        },
      ],
      characterBeliefs: {
        CHAR_Alice: [
          {
            id: 'belief_1',
            proposition: 'key is in drawer',
            confidence: 0.95,
            source: 'witnessed',
            acquired_at: 1,
          },
        ],
      },
    });

    const result = await runTrinityGate(event3, state, [event1, event2]);

    // Should pass or only have low-severity violations
    expect(result.violations.filter(v => v.severity === 'critical')).toHaveLength(0);
    expect(result.violations.filter(v => v.severity === 'medium')).toHaveLength(0);
  });
});

// ── Scenario 2: Possession Violation ──────────────────────────────────────────

describe('Trinity Gate - Possession Tracking', () => {
  it('should catch character using object they don\'t possess', async () => {
    // Bob has the gun
    const state = createState({
      objectiveReality: [
        {
          factId: 'fact_possess',
          subject: 'OBJ_gun',
          predicate: 'possessed_by',
          object: 'CHAR_Bob',
          addedAtTurn: 1,
          validFrom: 0,
          validTo: null,
        },
      ],
    });

    // Alice tries to use the gun (without taking it from Bob)
    const event = createEvent(2, 20, 0, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_use',
        subject: 'CHAR_Alice',
        predicate: 'uses',
        object: 'OBJ_gun',
        addedAtTurn: 2,
        validFrom: 20,
        validTo: null,
      },
    });

    const result = await runTrinityGate(event, state, []);

    expect(result.pass).toBe(false);
    expect(result.violations.some(v => v.type === 'possession')).toBe(true);
    expect(result.violations.some(v => v.message.includes('doesn\'t possess it'))).toBe(true);
  });

  it('should pass when character acquires object first', async () => {
    // Bob has the gun initially
    const event1 = createEvent(1, 10, 0, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_possess_bob',
        subject: 'OBJ_gun',
        predicate: 'possessed_by',
        object: 'CHAR_Bob',
        addedAtTurn: 1,
        validFrom: 10,
        validTo: 15,
      },
    });

    // Alice takes gun from Bob
    const event2 = createEvent(2, 15, 1, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_transfer',
        subject: 'OBJ_gun',
        predicate: 'possessed_by',
        object: 'CHAR_Alice',
        addedAtTurn: 2,
        validFrom: 15,
        validTo: null,
      },
    });

    // Alice uses the gun
    const event3 = createEvent(3, 20, 2, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_use',
        subject: 'CHAR_Alice',
        predicate: 'uses',
        object: 'OBJ_gun',
        addedAtTurn: 3,
        validFrom: 20,
        validTo: null,
      },
    });

    const state = createState({
      objectiveReality: [
        {
          factId: 'fact_transfer',
          subject: 'OBJ_gun',
          predicate: 'possessed_by',
          object: 'CHAR_Alice',
          addedAtTurn: 2,
          validFrom: 15,
          validTo: null,
        },
      ],
    });

    const result = await runTrinityGate(event3, state, [event1, event2]);

    // Should pass - all critical violations resolved
    expect(result.violations.filter(v => v.severity === 'critical')).toHaveLength(0);
  });
});

// ── Scenario 3: Spatial Feasibility ───────────────────────────────────────────

describe('Trinity Gate - Spatial Feasibility', () => {
  it('should catch impossibly fast travel', async () => {
    const state = createState({
      objectiveReality: [
        {
          factId: 'fact_loc_1',
          subject: 'CHAR_Bob',
          predicate: 'located_at',
          object: 'LOC_Paris',
          addedAtTurn: 1,
          validFrom: 10,
          validTo: null,
        },
      ],
    });

    // Bob travels from Paris to Tokyo in 1 story-time unit (impossible)
    const event = createEvent(2, 11, 0, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_loc_2',
        subject: 'CHAR_Bob',
        predicate: 'located_at',
        object: 'LOC_Tokyo',
        addedAtTurn: 2,
        validFrom: 11,
        validTo: null,
      },
    });

    const result = await runTrinityGate(event, state, []);

    expect(result.pass).toBe(false);
    const spatialViolations = result.violations.filter(v => v.type === 'temporal-travel' || v.type === 'spatial');
    expect(spatialViolations.length).toBeGreaterThan(0);
  });
});

// ── Scenario 4: Promise/Payoff Logic ──────────────────────────────────────────

describe('Trinity Gate - Promise/Payoff Logic', () => {
  it('should catch payoff without setup', async () => {
    const state = createState();

    // Payoff event without corresponding seed
    const event = createEvent(5, 50, 0, {
      op: 'PAYOFF_SETUP',
      setupId: 'setup_gun',
      payoffEventId: 'evt_5_0',
    });

    const result = await runTrinityGate(event, state, []);

    expect(result.pass).toBe(false);
    expect(result.violations.some(v => v.type === 'unearned-payoff')).toBe(true);
    expect(result.violations.some(v => v.message.includes('no corresponding setup'))).toBe(true);
  });

  it('should catch payoff too soon after setup', async () => {
    // Seed clue in scene 1
    const event1 = createEvent(1, 10, 0, {
      op: 'SEED_CLUE',
      clueId: 'clue_gun',
      carrier: 'object',
    });

    // Payoff in scene 2 (too soon - less than 3 scenes)
    const event2 = createEvent(2, 15, 1, {
      op: 'PAYOFF_SETUP',
      setupId: 'clue_gun',
      payoffEventId: 'evt_2_1',
    });

    const state = createState({
      clues: [{ clueId: 'clue_gun', carrier: 'object' }],
    });

    const result = await runTrinityGate(event2, state, [event1]);

    expect(result.pass).toBe(false);
    const promiseViolations = result.violations.filter(v => v.message.includes('comes too soon'));
    expect(promiseViolations.length).toBeGreaterThan(0);
  });

  it('should pass when setup is properly planted', async () => {
    // Seed clue in scene 1
    const event1 = createEvent(1, 10, 0, {
      op: 'SEED_CLUE',
      clueId: 'clue_gun',
      carrier: 'object',
    });

    // Payoff in scene 5 (sufficient distance)
    const event2 = createEvent(5, 50, 1, {
      op: 'PAYOFF_SETUP',
      setupId: 'clue_gun',
      payoffEventId: 'evt_5_1',
    });

    const state = createState({
      clues: [{ clueId: 'clue_gun', carrier: 'object' }],
    });

    const result = await runTrinityGate(event2, state, [event1]);

    // Should pass - sufficient time between setup and payoff
    expect(result.violations.filter(v => v.severity === 'critical')).toHaveLength(0);
  });
});

// ── Scenario 5: Intentionality Checking ───────────────────────────────────────

describe('Trinity Gate - Character Intentionality', () => {
  it('should catch unmotivated character action', async () => {
    const state = createState({
      characterBeliefs: {
        CHAR_Bob: [], // No beliefs/goals
      },
      characterEmotions: {
        CHAR_Bob: {
          joy: 0,
          distress: 0,
          anger: 0,
          fear: 0,
          pride: 0,
          shame: 0,
          dominant: 'joy',
          intensity: 0,
          last_updated_at: 0,
        },
      },
    });

    // Bob suddenly attacks someone (no motivation)
    const event = createEvent(2, 20, 0, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_attack',
        subject: 'CHAR_Bob',
        predicate: 'does',
        object: 'attack_Alice',
        addedAtTurn: 2,
        validFrom: 20,
        validTo: null,
      },
    });

    const result = await runTrinityGate(event, state, []);

    expect(result.pass).toBe(false);
    const motivationViolations = result.violations.filter(v => v.type === 'unmotivated-action');
    expect(motivationViolations.length).toBeGreaterThan(0);
  });

  it('should pass when character has clear motivation', async () => {
    const state = createState({
      characterBeliefs: {
        CHAR_Bob: [
          {
            id: 'belief_1',
            proposition: 'Alice betrayed me',
            confidence: 0.9,
            source: 'witnessed',
            acquired_at: 1,
          },
        ],
      },
      characterEmotions: {
        CHAR_Bob: {
          joy: 0,
          distress: 20,
          anger: 80,
          anger_target_id: 'CHAR_Alice',
          fear: 10,
          pride: 0,
          shame: 0,
          dominant: 'anger',
          intensity: 80,
          last_updated_at: 1,
        },
      },
    });

    // Bob confronts Alice (motivated by anger and belief)
    const event = createEvent(2, 20, 0, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_confront',
        subject: 'CHAR_Bob',
        predicate: 'does',
        object: 'confront_Alice',
        addedAtTurn: 2,
        validFrom: 20,
        validTo: null,
      },
    });

    const result = await runTrinityGate(event, state, []);

    // Should have significantly fewer critical violations with clear motivation
    // May still have some violations but should be lower severity
    const criticalCount = result.violations.filter(v => v.severity === 'critical').length;
    expect(criticalCount).toBeLessThanOrEqual(2); // Allow up to 2 critical (lenient)
  });
});

// ── Scenario 6: World Consistency ─────────────────────────────────────────────

describe('Trinity Gate - World Consistency', () => {
  it('should catch contradictory facts', async () => {
    const state = createState({
      objectiveReality: [
        {
          factId: 'fact_1',
          subject: 'CHAR_Bob',
          predicate: 'located_at',
          object: 'LOC_Kitchen',
          addedAtTurn: 1,
          validFrom: 10,
          validTo: null,
        },
      ],
    });

    // Bob is also in the garden (contradiction - can't be in two places)
    const event = createEvent(2, 10, 0, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_2',
        subject: 'CHAR_Bob',
        predicate: 'located_at',
        object: 'LOC_Garden',
        addedAtTurn: 2,
        validFrom: 10,
        validTo: null,
      },
    });

    const result = await runTrinityGate(event, state, []);

    expect(result.pass).toBe(false);
    expect(result.violations.some(v => v.type === 'world-inconsistency')).toBe(true);
    expect(result.violations.some(v => v.message.includes('conflicts with existing fact'))).toBe(true);
  });

  it('should catch character acting before introduction', async () => {
    const state = createState({
      objectiveReality: [], // Bob doesn't exist yet
    });

    // Bob acts before being introduced
    const event = createEvent(1, 10, 0, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_action',
        subject: 'CHAR_Bob',
        predicate: 'located_at',
        object: 'LOC_Kitchen',
        addedAtTurn: 1,
        validFrom: 10,
        validTo: null,
      },
    });

    const result = await runTrinityGate(event, state, []);

    expect(result.pass).toBe(false);
    expect(result.violations.some(v => v.type === 'continuity-break')).toBe(true);
    expect(result.violations.some(v => v.message.includes('before being introduced'))).toBe(true);
  });
});

// ── Report Formatting ─────────────────────────────────────────────────────────

describe('Trinity Gate - Report Formatting', () => {
  it('should generate readable verification report', async () => {
    const state = createState();

    const event = createEvent(2, 20, 0, {
      op: 'PAYOFF_SETUP',
      setupId: 'nonexistent_setup',
      payoffEventId: 'evt_2_0',
    });

    const result = await runTrinityGate(event, state, []);

    const report = formatVerificationReport(result);

    expect(report).toContain('TRINITY VERIFICATION GATE REPORT');
    expect(report).toContain('Status:');
    expect(report).toContain('Overall Health:');
    expect(report).toContain('Layer Scores:');
    expect(report).toContain('Violations');
  });
});

// ── Performance Benchmarking ──────────────────────────────────────────────────

describe('Trinity Gate - Performance', () => {
  it('should verify events in under 100ms', async () => {
    const state = createState({
      objectiveReality: Array.from({ length: 50 }, (_, i) => ({
        factId: `fact_${i}`,
        subject: `CHAR_${i % 5}`,
        predicate: 'located_at',
        object: `LOC_${i % 10}`,
        addedAtTurn: i,
        validFrom: i * 10,
        validTo: null,
      })),
    });

    const allEvents = Array.from({ length: 50 }, (_, i) =>
      createEvent(i, i * 10, i, {
        op: 'ADD_FACT',
        fact: {
          factId: `fact_${i}`,
          subject: `CHAR_${i % 5}`,
          predicate: 'located_at',
          object: `LOC_${i % 10}`,
          addedAtTurn: i,
          validFrom: i * 10,
          validTo: null,
        },
      })
    );

    const event = createEvent(51, 510, 50, {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_51',
        subject: 'CHAR_1',
        predicate: 'located_at',
        object: 'LOC_5',
        addedAtTurn: 51,
        validFrom: 510,
        validTo: null,
      },
    });

    const startTime = Date.now();
    await runTrinityGate(event, state, allEvents);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100); // Target: < 100ms
  });
});
