// ── APDL Tests ───────────────────────────────────────────────────────────────
// Comprehensive test suite for the Affective Planning Domain Language system.

import { describe, it, expect, beforeEach } from '@jest/globals';
import type {
  APDLWorldState,
  APDLAction,
  APDLGoal,
  EmotionalState,
  CharacterId,
} from '../server/planning/apdl';

import {
  createEmptyEmotionalState,
  createEmptyAudienceState,
  upgradeToAPDL,
  getEmotionIntensity,
  setEmotionIntensity,
  applyEmotionalDecay,
  isEmotionalPreconditionSatisfied,
  cloneAPDLState,
} from '../server/planning/apdl';

import {
  predicateToKey,
  keyToPredicate,
  isPreconditionSatisfied,
  applyEffect,
  executeAction,
} from '../server/planning/pddl-types';

import { apdlPlan, enrichWithEmotionalLogic } from '../server/planning/apdl-planner';

import {
  validateEmotionalPreconditions,
  validateEmotionalCoherence,
  validateAction,
  generateValidationSummary,
} from '../server/planning/apdl-validator';

import {
  getEmotionalTemplate,
  enrichActionWithEmotions,
  EMOTIONAL_EFFECTS_LIBRARY,
} from '../server/planning/emotional-effects-library';

// ── Helper Functions ─────────────────────────────────────────────────────────

function createTestState(): APDLWorldState {
  const state = upgradeToAPDL({
    facts: new Map([
      ['alice_at_room', true],
      ['bob_at_room', true],
      ['door_locked', true],
    ]),
    entities: new Map([
      ['alice', { id: 'alice', type: 'character', properties: new Map() }],
      ['bob', { id: 'bob', type: 'character', properties: new Map() }],
    ]),
    timestamp: 0,
  });
  
  // Add emotional states
  const aliceEmotion = createEmptyEmotionalState(0);
  const bobEmotion = createEmptyEmotionalState(0);
  
  state.emotional_state.set('alice', aliceEmotion);
  state.emotional_state.set('bob', bobEmotion);
  
  return state;
}

function createTestAction(name: string): APDLAction {
  return {
    name,
    parameters: ['alice', 'bob'],
    preconditions: [],
    effects: [],
    emotional_effects: [],
    emotional_preconditions: [],
    cost: 1.0,
  };
}

// ── Core APDL Types Tests ────────────────────────────────────────────────────

describe('APDL Core Types', () => {
  describe('createEmptyEmotionalState', () => {
    it('should create an empty emotional state', () => {
      const state = createEmptyEmotionalState(5);
      
      expect(state.feelings.size).toBe(0);
      expect(state.trajectory).toBe('flat');
      expect(state.lastChange).toBe(5);
      expect(state.peakIntensity).toBe(0);
      expect(state.dominant).toBeUndefined();
    });
  });

  describe('createEmptyAudienceState', () => {
    it('should create an empty audience state', () => {
      const state = createEmptyAudienceState();
      
      expect(state.knows.size).toBe(0);
      expect(state.expects.size).toBe(0);
      expect(state.fears.size).toBe(0);
      expect(state.hopes.size).toBe(0);
      expect(state.engagement).toBe(0.5);
      expect(state.tension).toBe(0.0);
    });
  });

  describe('getEmotionIntensity / setEmotionIntensity', () => {
    it('should get and set emotion intensity', () => {
      const state = createEmptyEmotionalState(0);
      
      expect(getEmotionIntensity(state, 'anger')).toBe(0);
      
      setEmotionIntensity(state, 'anger', 0.7, 1);
      
      expect(getEmotionIntensity(state, 'anger')).toBe(0.7);
      expect(state.lastChange).toBe(1);
      expect(state.peakIntensity).toBe(0.7);
      expect(state.dominant).toBe('anger');
    });

    it('should clamp intensity to [0, 1]', () => {
      const state = createEmptyEmotionalState(0);
      
      setEmotionIntensity(state, 'joy', 1.5, 0);
      expect(getEmotionIntensity(state, 'joy')).toBe(1.0);
      
      setEmotionIntensity(state, 'fear', -0.3, 0);
      expect(getEmotionIntensity(state, 'fear')).toBe(0.0);
    });

    it('should update dominant emotion correctly', () => {
      const state = createEmptyEmotionalState(0);
      
      setEmotionIntensity(state, 'anger', 0.5, 0);
      expect(state.dominant).toBe('anger');
      
      setEmotionIntensity(state, 'fear', 0.8, 1);
      expect(state.dominant).toBe('fear');
    });
  });

  describe('applyEmotionalDecay', () => {
    it('should decay emotions over time', () => {
      const state = createEmptyEmotionalState(0);
      
      setEmotionIntensity(state, 'anger', 0.8, 0);
      setEmotionIntensity(state, 'fear', 0.6, 0);
      
      applyEmotionalDecay(state, 2, 0.2);  // 2 scenes, 0.2 decay per scene
      
      expect(getEmotionIntensity(state, 'anger')).toBe(0.4);  // 0.8 - 2*0.2
      expect(getEmotionIntensity(state, 'fear')).toBe(0.2);   // 0.6 - 2*0.2
    });

    it('should not decay below zero', () => {
      const state = createEmptyEmotionalState(0);
      
      setEmotionIntensity(state, 'joy', 0.3, 0);
      
      applyEmotionalDecay(state, 5, 0.1);  // Would decay by 0.5
      
      expect(getEmotionIntensity(state, 'joy')).toBe(0);
    });
  });

  describe('isEmotionalPreconditionSatisfied', () => {
    it('should validate emotional preconditions', () => {
      const state = createTestState();
      const aliceState = state.emotional_state.get('alice')!;
      
      setEmotionIntensity(aliceState, 'trust', 0.6, 0);
      
      const precond = {
        character: 'alice' as CharacterId,
        emotion: 'trust' as const,
        min_intensity: 0.4,
      };
      
      expect(isEmotionalPreconditionSatisfied(precond, state)).toBe(true);
    });

    it('should reject when intensity too low', () => {
      const state = createTestState();
      const aliceState = state.emotional_state.get('alice')!;
      
      setEmotionIntensity(aliceState, 'trust', 0.2, 0);
      
      const precond = {
        character: 'alice' as CharacterId,
        emotion: 'trust' as const,
        min_intensity: 0.4,
      };
      
      expect(isEmotionalPreconditionSatisfied(precond, state)).toBe(false);
    });

    it('should handle max_intensity constraints', () => {
      const state = createTestState();
      const aliceState = state.emotional_state.get('alice')!;
      
      setEmotionIntensity(aliceState, 'anger', 0.9, 0);
      
      const precond = {
        character: 'alice' as CharacterId,
        emotion: 'anger' as const,
        min_intensity: 0.3,
        max_intensity: 0.7,
      };
      
      expect(isEmotionalPreconditionSatisfied(precond, state)).toBe(false);
    });
  });

  describe('cloneAPDLState', () => {
    it('should deep clone APDL state', () => {
      const original = createTestState();
      const aliceState = original.emotional_state.get('alice')!;
      setEmotionIntensity(aliceState, 'joy', 0.5, 0);
      
      const clone = cloneAPDLState(original);
      
      // Modify clone
      const cloneAliceState = clone.emotional_state.get('alice')!;
      setEmotionIntensity(cloneAliceState, 'joy', 0.9, 1);
      
      // Original should be unchanged
      expect(getEmotionIntensity(aliceState, 'joy')).toBe(0.5);
      expect(getEmotionIntensity(cloneAliceState, 'joy')).toBe(0.9);
    });
  });
});

// ── PDDL Base Tests ──────────────────────────────────────────────────────────

describe('PDDL Base Types', () => {
  describe('predicateToKey / keyToPredicate', () => {
    it('should convert predicates to keys and back', () => {
      const pred = { name: 'has_item', parameters: ['alice', 'key'] };
      const key = predicateToKey(pred);
      
      expect(key).toBe('has_item(alice,key)');
      
      const recovered = keyToPredicate(key);
      expect(recovered).toEqual(pred);
    });

    it('should handle predicates without parameters', () => {
      const pred = { name: 'door_open', parameters: [] };
      const key = predicateToKey(pred);
      
      expect(key).toBe('door_open');
      
      const recovered = keyToPredicate(key);
      expect(recovered).toEqual(pred);
    });
  });

  describe('executeAction', () => {
    it('should execute action and update state', () => {
      const state = createTestState();
      
      const action = {
        name: 'unlock_door',
        parameters: [],
        preconditions: [
          { predicate: { name: 'door_locked', parameters: [] }, required_value: true },
        ],
        effects: [
          { predicate: { name: 'door_locked', parameters: [] }, new_value: false },
          { predicate: { name: 'door_open', parameters: [] }, new_value: true },
        ],
      };
      
      const newState = executeAction(action, state);
      
      expect(newState.facts.get('door_locked')).toBe(false);
      expect(newState.facts.get('door_open')).toBe(true);
      expect(newState.timestamp).toBe(1);
    });

    it('should throw when preconditions not met', () => {
      const state = createTestState();
      state.facts.set('door_locked', false);
      
      const action = {
        name: 'unlock_door',
        parameters: [],
        preconditions: [
          { predicate: { name: 'door_locked', parameters: [] }, required_value: true },
        ],
        effects: [],
      };
      
      expect(() => executeAction(action, state)).toThrow();
    });
  });
});

// ── Emotional Effects Library Tests ──────────────────────────────────────────

describe('Emotional Effects Library', () => {
  describe('getEmotionalTemplate', () => {
    it('should retrieve emotional templates', () => {
      const betrayTemplate = getEmotionalTemplate('betray');
      
      expect(betrayTemplate).toBeDefined();
      expect(betrayTemplate?.dramatic_weight).toBe(9);
      expect(betrayTemplate?.effects.length).toBeGreaterThan(0);
      expect(betrayTemplate?.preconditions.length).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent templates', () => {
      const template = getEmotionalTemplate('nonexistent_action');
      expect(template).toBeUndefined();
    });
  });

  describe('EMOTIONAL_EFFECTS_LIBRARY', () => {
    it('should contain all documented actions', () => {
      const expectedActions = [
        'betray', 'reconcile', 'build_trust',
        'reveal_secret', 'discover_secret', 'keep_secret',
        'confront', 'threaten', 'de_escalate',
        'lie', 'expose_lie', 'manipulate',
        'confess_feelings', 'offer_support', 'reject',
        'form_alliance', 'break_alliance', 'protect',
        'achieve_goal', 'fail_goal', 'sacrifice',
      ];
      
      for (const action of expectedActions) {
        expect(EMOTIONAL_EFFECTS_LIBRARY[action]).toBeDefined();
      }
    });

    it('should have properly structured templates', () => {
      for (const [name, template] of Object.entries(EMOTIONAL_EFFECTS_LIBRARY)) {
        expect(template.description).toBeDefined();
        expect(template.effects).toBeInstanceOf(Array);
        expect(template.preconditions).toBeInstanceOf(Array);
        
        // Validate effects
        for (const effect of template.effects) {
          expect(effect.character).toBeDefined();
          expect(effect.emotion).toBeDefined();
          expect(effect.delta).toBeDefined();
          expect(Math.abs(effect.delta)).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('enrichActionWithEmotions', () => {
    it('should enrich PDDL action with emotional template', () => {
      const baseAction = createTestAction('betray_action');
      const enriched = enrichActionWithEmotions(baseAction, 'betray');
      
      expect(enriched).toBeDefined();
      expect(enriched?.emotional_effects.length).toBeGreaterThan(0);
      expect(enriched?.emotional_preconditions.length).toBeGreaterThan(0);
      expect(enriched?.dramatic_weight).toBe(9);
    });

    it('should return null for non-existent template', () => {
      const baseAction = createTestAction('some_action');
      const enriched = enrichActionWithEmotions(baseAction, 'nonexistent');
      
      expect(enriched).toBeNull();
    });
  });
});

// ── APDL Validator Tests ─────────────────────────────────────────────────────

describe('APDL Validator', () => {
  describe('validateEmotionalPreconditions', () => {
    it('should pass when all preconditions satisfied', () => {
      const state = createTestState();
      const aliceState = state.emotional_state.get('alice')!;
      setEmotionIntensity(aliceState, 'trust', 0.6, 0);
      
      const action: APDLAction = {
        ...createTestAction('test'),
        emotional_preconditions: [
          { character: 'alice', emotion: 'trust', min_intensity: 0.4 },
        ],
      };
      
      const result = validateEmotionalPreconditions(action, state);
      
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when preconditions not satisfied', () => {
      const state = createTestState();
      const aliceState = state.emotional_state.get('alice')!;
      setEmotionIntensity(aliceState, 'betrayed', 0.2, 0);
      
      const action: APDLAction = {
        ...createTestAction('confront'),
        emotional_preconditions: [
          { 
            character: 'alice', 
            emotion: 'betrayed', 
            min_intensity: 0.5,
            reason: 'Must feel betrayed to confront',
          },
        ],
      };
      
      const result = validateEmotionalPreconditions(action, state);
      
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('betrayed');
      expect(result.violations[0]).toContain('0.50');
    });
  });

  describe('validateEmotionalCoherence', () => {
    it('should detect flat emotional trajectories', () => {
      const plan: any = {
        actions: [createTestAction('a1'), createTestAction('a2'), createTestAction('a3')],
        initial_state: createTestState(),
        final_state: createTestState(),
        emotional_trajectory: ['flat', 'flat', 'flat'],
        irony_gaps: [],
        catharsis_points: [],
        emotional_cost: 0,
        total_cost: 3,
        coherence_score: 0.3,
      };
      
      const result = validateEmotionalCoherence(plan);
      
      expect(result.coherent).toBe(false);
      const flatIssue = result.issues.find(i => i.problem === 'flat');
      expect(flatIssue).toBeDefined();
      expect(flatIssue?.severity).toBe('high');
    });

    it('should detect unearned emotions', () => {
      const state = createTestState();
      const aliceState = state.emotional_state.get('alice')!;
      setEmotionIntensity(aliceState, 'betrayed', 0.1, 0);
      
      const action: APDLAction = {
        ...createTestAction('sudden_rage'),
        emotional_effects: [
          { character: 'alice', emotion: 'betrayed', delta: 0.8 },
        ],
      };
      
      const plan: any = {
        actions: [action],
        initial_state: state,
        final_state: state,
        emotional_trajectory: ['rising'],
        irony_gaps: [],
        catharsis_points: [],
      };
      
      const result = validateEmotionalCoherence(plan);
      
      const unearnedIssue = result.issues.find(i => i.problem === 'unearned');
      expect(unearnedIssue).toBeDefined();
    });

    it('should accept coherent plans', () => {
      const plan: any = {
        actions: [createTestAction('a1'), createTestAction('a2')],
        initial_state: createTestState(),
        final_state: createTestState(),
        emotional_trajectory: ['rising', 'rising'],
        irony_gaps: [{ created_at: 0, intensity: 0.7 }],
        catharsis_points: [{ scene: 1, type: 'revelation', release_magnitude: 0.6 }],
        emotional_cost: 0.5,
        total_cost: 2.5,
        coherence_score: 0.8,
      };
      
      const result = validateEmotionalCoherence(plan);
      
      expect(result.score).toBeGreaterThan(0.6);
    });
  });

  describe('validateAction', () => {
    it('should validate single action in context', () => {
      const state = createTestState();
      const aliceState = state.emotional_state.get('alice')!;
      setEmotionIntensity(aliceState, 'anger', 0.6, 0);
      
      const action: APDLAction = {
        ...createTestAction('confront'),
        emotional_preconditions: [
          { character: 'alice', emotion: 'anger', min_intensity: 0.4 },
        ],
        dramatic_weight: 7,
      };
      
      const result = validateAction(action, state, []);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about too many dramatic beats', () => {
      const state = createTestState();
      
      const highWeightAction: APDLAction = {
        ...createTestAction('dramatic'),
        dramatic_weight: 9,
      };
      
      const previousActions = [highWeightAction, highWeightAction];
      
      const result = validateAction(highWeightAction, state, previousActions);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('rushed');
    });
  });

  describe('generateValidationSummary', () => {
    it('should generate readable summary', () => {
      const precondResult = {
        valid: false,
        violations: ['Character alice must feel anger at intensity 0.50'],
      };
      
      const coherenceResult = {
        coherent: false,
        score: 0.4,
        issues: [
          { scene: 0, problem: 'flat' as const, description: 'Too flat', severity: 'high' as const },
          { scene: 1, problem: 'rushed' as const, description: 'Too rushed', severity: 'medium' as const },
        ],
      };
      
      const summary = generateValidationSummary(precondResult, coherenceResult);
      
      expect(summary).toContain('Emotional Preconditions');
      expect(summary).toContain('Emotional Coherence');
      expect(summary).toContain('40.0%');
      expect(summary).toContain('High severity: 1');
      expect(summary).toContain('Medium severity: 1');
    });
  });
});

// ── APDL Planner Tests ───────────────────────────────────────────────────────

describe('APDL Planner', () => {
  describe('apdlPlan', () => {
    it('should find simple plan', async () => {
      const initialState = createTestState();
      
      const goal: APDLGoal = {
        required_facts: [
          { name: 'door_open', parameters: [] },
        ],
      };
      
      const actions: APDLAction[] = [
        {
          name: 'unlock_door',
          parameters: [],
          preconditions: [
            { predicate: { name: 'door_locked', parameters: [] }, required_value: true },
          ],
          effects: [
            { predicate: { name: 'door_locked', parameters: [] }, new_value: false },
            { predicate: { name: 'door_open', parameters: [] }, new_value: true },
          ],
          emotional_effects: [],
          emotional_preconditions: [],
          cost: 1.0,
        },
      ];
      
      const plan = await apdlPlan(initialState, goal, actions, { max_search_time_ms: 1000 });
      
      expect(plan).toBeDefined();
      expect(plan?.actions.length).toBe(1);
      expect(plan?.actions[0].name).toBe('unlock_door');
    });

    it('should reject plans with unsatisfied emotional preconditions', async () => {
      const initialState = createTestState();
      
      // Alice has no trust
      const aliceState = initialState.emotional_state.get('alice')!;
      setEmotionIntensity(aliceState, 'trust', 0.1, 0);
      
      const goal: APDLGoal = {
        required_facts: [
          { name: 'alice_confessed', parameters: [] },
        ],
      };
      
      const actions: APDLAction[] = [
        {
          name: 'confess',
          parameters: ['alice'],
          preconditions: [],
          effects: [
            { predicate: { name: 'alice_confessed', parameters: [] }, new_value: true },
          ],
          emotional_effects: [
            { character: 'alice', emotion: 'vulnerable', delta: 0.7 },
          ],
          emotional_preconditions: [
            { character: 'alice', emotion: 'trust', min_intensity: 0.4, reason: 'Need trust to confess' },
          ],
          cost: 1.0,
        },
      ];
      
      const plan = await apdlPlan(initialState, goal, actions, { max_search_time_ms: 1000 });
      
      // Plan should fail because emotional preconditions not met
      expect(plan).toBeNull();
    });
  });

  describe('enrichWithEmotionalLogic', () => {
    it('should convert PDDL plan to APDL plan', () => {
      const pddlPlan = {
        actions: [createTestAction('a1'), createTestAction('a2')],
        initial_state: createTestState(),
        final_state: createTestState(),
        cost: 2.0,
      };
      
      const apdlPlan = enrichWithEmotionalLogic(pddlPlan);
      
      expect(apdlPlan.emotional_trajectory).toBeDefined();
      expect(apdlPlan.irony_gaps).toBeDefined();
      expect(apdlPlan.catharsis_points).toBeDefined();
      expect(apdlPlan.total_cost).toBe(2.0);
    });
  });
});

// ── Integration Test ─────────────────────────────────────────────────────────

describe('APDL Integration', () => {
  it('should demonstrate emotional preconditions blocking invalid actions', async () => {
    // Setup: Alice and Bob in a room, Alice doesn't trust Bob yet
    const initialState = createTestState();
    const aliceState = initialState.emotional_state.get('alice')!;
    const bobState = initialState.emotional_state.get('bob')!;
    
    setEmotionIntensity(aliceState, 'trust', 0.2, 0);  // Low trust
    setEmotionIntensity(bobState, 'trust', 0.3, 0);
    
    // Goal: Alice and Bob reconcile
    const goal: APDLGoal = {
      required_facts: [
        { name: 'reconciled', parameters: [] },
      ],
      emotional_goals: [
        { character: 'alice', emotion: 'trust', target_intensity: 0.5 },
      ],
    };
    
    // Actions available
    const actions: APDLAction[] = [
      // Build trust first
      {
        name: 'build_trust',
        parameters: ['alice', 'bob'],
        preconditions: [],
        effects: [
          { predicate: { name: 'trust_built', parameters: [] }, new_value: true },
        ],
        emotional_effects: [
          { character: 'alice', emotion: 'trust', delta: 0.3 },
        ],
        emotional_preconditions: [],
        cost: 1.0,
      },
      // Then reconcile (requires trust)
      {
        name: 'reconcile',
        parameters: ['alice', 'bob'],
        preconditions: [
          { predicate: { name: 'trust_built', parameters: [] }, required_value: true },
        ],
        effects: [
          { predicate: { name: 'reconciled', parameters: [] }, new_value: true },
        ],
        emotional_effects: [
          { character: 'alice', emotion: 'relief', delta: 0.6 },
          { character: 'alice', emotion: 'trust', delta: 0.2 },
        ],
        emotional_preconditions: [
          { character: 'alice', emotion: 'trust', min_intensity: 0.4, reason: 'Cannot reconcile without trust' },
        ],
        cost: 1.0,
        dramatic_weight: 7,
      },
    ];
    
    const plan = await apdlPlan(initialState, goal, actions, { 
      max_search_time_ms: 2000,
      max_plan_length: 10,
    });
    
    expect(plan).toBeDefined();
    expect(plan?.actions.length).toBe(2);
    expect(plan?.actions[0].name).toBe('build_trust');
    expect(plan?.actions[1].name).toBe('reconcile');
    
    // Validate the plan
    const validationResult = validateEmotionalCoherence(plan!);
    console.log('Coherence Score:', validationResult.score);
    console.log('Issues:', validationResult.issues);
  });
});
