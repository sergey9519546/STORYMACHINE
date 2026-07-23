// ── APDL Integration Example ─────────────────────────────────────────────────
// Complete example showing APDL planning for a betrayal-reconciliation arc.

import {
  type APDLWorldState,
  type APDLAction,
  type APDLGoal,
  createEmptyEmotionalState,
  createEmptyAudienceState,
  setEmotionIntensity,
  upgradeToAPDL,
} from './apdl';

import { apdlPlan } from './apdl-planner';

import {
  validateEmotionalCoherence,
  validatePlanPreconditions,
  generateValidationSummary,
} from './apdl-validator';

import { enrichActionWithEmotions } from './emotional-effects-library';

/**
 * Example: Plan a betrayal-reconciliation arc between Alice and Bob.
 * 
 * Story setup:
 * - Alice and Bob are partners
 * - Alice has low trust in Bob (0.2)
 * - Bob needs to betray Alice (external pressure)
 * - Eventually they reconcile
 * 
 * The planner must:
 * 1. Build enough trust before betrayal is meaningful
 * 2. Execute the betrayal
 * 3. Build regret before reconciliation is possible
 * 4. Reconcile
 */
export async function exampleBetrayal(): Promise<void> {
  console.log('=== APDL Planning Example: Betrayal → Reconciliation ===\n');

  // ── Step 1: Create Initial State ──────────────────────────────────────────
  
  const initialState: APDLWorldState = upgradeToAPDL({
    facts: new Map([
      ['alice_at_safehouse', true],
      ['bob_at_safehouse', true],
      ['partners', true],
      ['mission_active', true],
    ]),
    entities: new Map([
      ['alice', { id: 'alice', type: 'character', properties: new Map() }],
      ['bob', { id: 'bob', type: 'character', properties: new Map() }],
    ]),
    timestamp: 0,
  });

  // Set up initial emotional states
  const aliceEmotion = createEmptyEmotionalState(0);
  const bobEmotion = createEmptyEmotionalState(0);
  
  // Alice has low trust (insufficient for betrayal to feel earned)
  setEmotionIntensity(aliceEmotion, 'trust', 0.2, 0);
  setEmotionIntensity(bobEmotion, 'trust', 0.3, 0);
  
  initialState.emotional_state.set('alice', aliceEmotion);
  initialState.emotional_state.set('bob', bobEmotion);
  
  console.log('Initial State:');
  console.log(`  Alice trust: ${aliceEmotion.feelings.get('trust')}`);
  console.log(`  Bob trust: ${bobEmotion.feelings.get('trust')}\n`);

  // ── Step 2: Define Goal ────────────────────────────────────────────────────
  
  const goal: APDLGoal = {
    required_facts: [
      { name: 'reconciled', parameters: [] },
      { name: 'mission_complete', parameters: [] },
    ],
    emotional_goals: [
      { character: 'alice', emotion: 'trust', target_intensity: 0.5 },
      { character: 'alice', emotion: 'betrayed', target_intensity: 0.0 },  // Resolved
    ],
    audience_goals: {
      min_tension: 0.3,
      min_engagement: 0.6,
    },
  };

  console.log('Goal: Reconciliation with restored trust and resolved betrayal\n');

  // ── Step 3: Define Available Actions ───────────────────────────────────────
  
  const actions: APDLAction[] = [];

  // Action 1: Build trust (needed before betrayal)
  const buildTrustAction: APDLAction = {
    name: 'share_vulnerability',
    parameters: ['bob', 'alice'],
    preconditions: [
      { predicate: { name: 'partners', parameters: [] }, required_value: true },
    ],
    effects: [
      { predicate: { name: 'trust_built', parameters: [] }, new_value: true },
    ],
    emotional_effects: [
      { character: 'alice', emotion: 'trust', delta: 0.3, decay_rate: 0.05 },
      { character: 'bob', emotion: 'vulnerable', delta: 0.4, decay_rate: 0.1 },
    ],
    emotional_preconditions: [],
    cost: 1.0,
    dramatic_weight: 4,
  };
  actions.push(buildTrustAction);

  // Action 2: Betray (requires trust to be meaningful)
  const betrayAction = enrichActionWithEmotions(
    {
      name: 'betray_alice',
      parameters: ['bob', 'alice'],
      preconditions: [
        { predicate: { name: 'trust_built', parameters: [] }, required_value: true },
      ],
      effects: [
        { predicate: { name: 'betrayed', parameters: [] }, new_value: true },
        { predicate: { name: 'partners', parameters: [] }, new_value: false },
        { predicate: { name: 'mission_complete', parameters: [] }, new_value: true },
      ],
      cost: 1.0,
    },
    'betray'
  )!;
  // Override character targets for this specific action
  betrayAction.emotional_effects = [
    { character: 'alice', emotion: 'betrayed', delta: 0.9, decay_rate: 0.05 },
    { character: 'alice', emotion: 'anger', delta: 0.7, decay_rate: 0.08 },
    { character: 'alice', emotion: 'trust', delta: -0.8, decay_rate: 0.02 },
    { character: 'bob', emotion: 'guilt', delta: 0.6, decay_rate: 0.1 },
  ];
  actions.push(betrayAction);

  // Action 3: Bob shows remorse (needed before reconciliation)
  const remorseAction: APDLAction = {
    name: 'show_remorse',
    parameters: ['bob', 'alice'],
    preconditions: [
      { predicate: { name: 'betrayed', parameters: [] }, required_value: true },
    ],
    effects: [
      { predicate: { name: 'remorse_shown', parameters: [] }, new_value: true },
    ],
    emotional_effects: [
      { character: 'bob', emotion: 'regret', delta: 0.5, decay_rate: 0.08 },
      { character: 'bob', emotion: 'guilt', delta: 0.3, decay_rate: 0.1 },
      { character: 'alice', emotion: 'anger', delta: -0.2, decay_rate: 0.1 },
    ],
    emotional_preconditions: [
      { character: 'bob', emotion: 'guilt', min_intensity: 0.4, reason: 'Must feel guilt to show remorse' },
    ],
    cost: 1.0,
    dramatic_weight: 6,
  };
  actions.push(remorseAction);

  // Action 4: Reconcile (requires regret, not too much anger)
  const reconcileAction = enrichActionWithEmotions(
    {
      name: 'reconcile',
      parameters: ['alice', 'bob'],
      preconditions: [
        { predicate: { name: 'remorse_shown', parameters: [] }, required_value: true },
      ],
      effects: [
        { predicate: { name: 'reconciled', parameters: [] }, new_value: true },
        { predicate: { name: 'partners', parameters: [] }, new_value: true },
      ],
      cost: 1.0,
    },
    'reconcile'
  )!;
  // Override for specific characters
  reconcileAction.emotional_effects = [
    { character: 'alice', emotion: 'relief', delta: 0.6, decay_rate: 0.12 },
    { character: 'alice', emotion: 'betrayed', delta: -0.4, decay_rate: 0.1 },
    { character: 'alice', emotion: 'anger', delta: -0.5, decay_rate: 0.1 },
    { character: 'alice', emotion: 'trust', delta: 0.4, decay_rate: 0.05 },
    { character: 'bob', emotion: 'relief', delta: 0.6, decay_rate: 0.12 },
    { character: 'bob', emotion: 'guilt', delta: -0.3, decay_rate: 0.1 },
  ];
  reconcileAction.emotional_preconditions = [
    { character: 'bob', emotion: 'regret', min_intensity: 0.3, reason: 'Reconciliation requires acknowledgment' },
    { character: 'alice', emotion: 'anger', max_intensity: 0.7, reason: 'Too much anger prevents reconciliation' },
  ];
  actions.push(reconcileAction);

  console.log(`Available actions: ${actions.map(a => a.name).join(', ')}\n`);

  // ── Step 4: Plan ───────────────────────────────────────────────────────────
  
  console.log('Planning...\n');
  
  const plan = await apdlPlan(initialState, goal, actions, {
    max_search_time_ms: 5000,
    max_plan_length: 10,
    min_emotional_variance: 0.05,
    min_catharsis_points: 1,
  });

  if (!plan) {
    console.log('❌ No plan found!\n');
    return;
  }

  console.log('✓ Plan found!\n');
  console.log('Action Sequence:');
  plan.actions.forEach((action, i) => {
    const weight = action.dramatic_weight || 0;
    console.log(`  ${i + 1}. ${action.name} (weight: ${weight})`);
  });
  console.log('');

  // ── Step 5: Analyze Plan ───────────────────────────────────────────────────
  
  console.log('Plan Analysis:');
  console.log(`  Total actions: ${plan.actions.length}`);
  console.log(`  Causal cost: ${plan.cost.toFixed(2)}`);
  console.log(`  Emotional cost: ${plan.emotional_cost.toFixed(2)}`);
  console.log(`  Total cost: ${plan.total_cost.toFixed(2)}`);
  console.log(`  Coherence score: ${(plan.coherence_score * 100).toFixed(1)}%`);
  console.log('');

  console.log('Emotional Trajectory:');
  plan.emotional_trajectory.forEach((traj, i) => {
    console.log(`  Scene ${i + 1}: ${traj}`);
  });
  console.log('');

  console.log('Catharsis Points:');
  if (plan.catharsis_points.length === 0) {
    console.log('  (none)');
  } else {
    plan.catharsis_points.forEach(point => {
      console.log(`  Scene ${point.scene}: ${point.type} (release: ${point.release_magnitude.toFixed(2)})`);
    });
  }
  console.log('');

  // ── Step 6: Validate ───────────────────────────────────────────────────────
  
  console.log('Validation:\n');

  const precondResult = validatePlanPreconditions(plan, actions);
  const coherenceResult = validateEmotionalCoherence(plan);

  const summary = generateValidationSummary(precondResult, coherenceResult);
  console.log(summary);
  console.log('');

  // ── Step 7: Simulate Emotional States ──────────────────────────────────────
  
  console.log('Emotional State Evolution:\n');
  
  let state = initialState;
  console.log('Scene 0 (Initial):');
  console.log(`  Alice: trust=${state.emotional_state.get('alice')?.feelings.get('trust')?.toFixed(2) || 0}`);
  console.log(`  Bob: trust=${state.emotional_state.get('bob')?.feelings.get('trust')?.toFixed(2) || 0}`);
  console.log('');

  // Note: Full simulation would require importing applyAPDLAction from planner
  // For now, just show the plan structure

  console.log('Expected Evolution:');
  console.log('  Scene 1: Build trust → Alice trust increases to ~0.5');
  console.log('  Scene 2: Betrayal → Alice betrayed (0.9), anger (0.7), trust drops');
  console.log('  Scene 3: Remorse → Bob regret (0.5), Alice anger decreases');
  console.log('  Scene 4: Reconciliation → Relief, trust restored, betrayal resolved');
  console.log('');

  // ── Step 8: Key Insight ────────────────────────────────────────────────────
  
  console.log('=== Key Insight ===\n');
  console.log('The planner ENFORCES emotional logic:');
  console.log('1. Trust must be built BEFORE betrayal (otherwise not dramatic)');
  console.log('2. Guilt must exist BEFORE remorse can be shown');
  console.log('3. Regret must exist BEFORE reconciliation is possible');
  console.log('4. Anger must be reduced BEFORE reconciliation succeeds');
  console.log('');
  console.log('Without emotional preconditions, the planner would take shortcuts');
  console.log('that feel "unearned" to the audience. APDL prevents this.');
  console.log('');
}

/**
 * Example: Show how APDL rejects emotionally invalid plans.
 */
export async function exampleRejection(): Promise<void> {
  console.log('=== APDL Example: Rejected Plan ===\n');

  const initialState: APDLWorldState = upgradeToAPDL({
    facts: new Map([['alice_at_room', true]]),
    entities: new Map([
      ['alice', { id: 'alice', type: 'character', properties: new Map() }],
    ]),
    timestamp: 0,
  });

  const aliceEmotion = createEmptyEmotionalState(0);
  setEmotionIntensity(aliceEmotion, 'trust', 0.1, 0);  // Very low trust
  initialState.emotional_state.set('alice', aliceEmotion);

  const goal: APDLGoal = {
    required_facts: [{ name: 'confession_made', parameters: [] }],
  };

  // Action requires high trust
  const confessAction = enrichActionWithEmotions(
    {
      name: 'confess_feelings',
      parameters: ['alice'],
      preconditions: [],
      effects: [
        { predicate: { name: 'confession_made', parameters: [] }, new_value: true },
      ],
      cost: 1.0,
    },
    'confess_feelings'
  )!;
  confessAction.emotional_preconditions = [
    { character: 'alice', emotion: 'trust', min_intensity: 0.5, reason: 'Need trust to be vulnerable' },
  ];

  console.log('Attempting to plan with insufficient emotional setup...\n');

  const plan = await apdlPlan(initialState, goal, [confessAction], {
    max_search_time_ms: 2000,
  });

  if (!plan) {
    console.log('❌ Plan rejected: Emotional preconditions not satisfied');
    console.log('   Alice trust (0.1) < required (0.5)');
    console.log('   Solution: Add trust-building actions before confession\n');
  } else {
    console.log('⚠️ Unexpected: Plan succeeded despite low trust\n');
  }
}

/**
 * Run all examples.
 */
export async function runExamples(): Promise<void> {
  await exampleBetrayal();
  console.log('\n' + '='.repeat(70) + '\n\n');
  await exampleRejection();
}

// Run if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}
