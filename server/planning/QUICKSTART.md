# APDL Quick Start Guide

## Installation

APDL is already integrated into StoryMachine. No additional dependencies needed.

## Quick Test

```bash
# Run APDL tests
npm test tests/apdl.test.ts

# Run examples
npx ts-node server/planning/examples.ts
```

## Basic Usage (5 minutes)

### 1. Simple Planning

```typescript
import { 
  apdlPlan, 
  createEmptyEmotionalState, 
  upgradeToAPDL,
  setEmotionIntensity 
} from './server/planning';

// Create state
const state = upgradeToAPDL({
  facts: new Map([['door_locked', true]]),
  entities: new Map(),
  timestamp: 0,
});

// Add emotional state for a character
const aliceEmotion = createEmptyEmotionalState(0);
setEmotionIntensity(aliceEmotion, 'fear', 0.6, 0);
state.emotional_state.set('alice', aliceEmotion);

// Define goal
const goal = {
  required_facts: [{ name: 'door_open', parameters: [] }],
};

// Define actions
const actions = [{
  name: 'unlock_door',
  parameters: [],
  preconditions: [
    { predicate: { name: 'door_locked', parameters: [] }, required_value: true }
  ],
  effects: [
    { predicate: { name: 'door_open', parameters: [] }, new_value: true }
  ],
  emotional_effects: [
    { character: 'alice', emotion: 'relief', delta: 0.4 }
  ],
  emotional_preconditions: [],
}];

// Plan!
const plan = await apdlPlan(state, goal, actions);
console.log(plan.actions.map(a => a.name)); // ['unlock_door']
```

### 2. Using Emotional Templates

```typescript
import { enrichActionWithEmotions } from './server/planning';

// Start with basic PDDL action
const baseAction = {
  name: 'betray_partner',
  parameters: ['actor', 'target'],
  preconditions: [{ predicate: { name: 'partners', parameters: [] }, required_value: true }],
  effects: [{ predicate: { name: 'betrayed', parameters: [] }, new_value: true }],
};

// Enrich with emotional template
const betrayAction = enrichActionWithEmotions(baseAction, 'betray');

// Now has:
// - emotional_effects: [betrayed +0.9, anger +0.7, trust -0.8, guilt +0.5]
// - emotional_preconditions: [trust >= 0.4]
// - dramatic_weight: 9
```

### 3. Validation

```typescript
import { validateEmotionalCoherence, generateValidationSummary } from './server/planning';

const coherenceResult = validateEmotionalCoherence(plan);

if (!coherenceResult.coherent) {
  console.log('❌ Plan has issues:');
  coherenceResult.issues.forEach(issue => {
    console.log(`  Scene ${issue.scene}: ${issue.description} [${issue.severity}]`);
  });
} else {
  console.log(`✓ Plan coherent (score: ${coherenceResult.score * 100}%)`);
}
```

## Available Emotional Templates

```typescript
// Betrayal & Trust
'betray', 'reconcile', 'build_trust'

// Secrets & Revelation
'reveal_secret', 'discover_secret', 'keep_secret'

// Confrontation & Conflict
'confront', 'threaten', 'de_escalate'

// Deception & Manipulation
'lie', 'expose_lie', 'manipulate'

// Vulnerability & Connection
'confess_feelings', 'offer_support', 'reject'

// Alliance & Loyalty
'form_alliance', 'break_alliance', 'protect'

// Achievement & Failure
'achieve_goal', 'fail_goal', 'sacrifice'
```

## Common Patterns

### Pattern 1: Trust → Betrayal → Reconciliation

```typescript
const actions = [
  enrichActionWithEmotions(buildTrustAction, 'build_trust'),
  enrichActionWithEmotions(betrayAction, 'betray'),
  showRemorseAction,  // custom
  enrichActionWithEmotions(reconcileAction, 'reconcile'),
];
```

### Pattern 2: Secret → Discovery → Confrontation

```typescript
const actions = [
  enrichActionWithEmotions(keepSecretAction, 'keep_secret'),
  enrichActionWithEmotions(discoverAction, 'discover_secret'),
  enrichActionWithEmotions(confrontAction, 'confront'),
  enrichActionWithEmotions(exposeAction, 'expose_lie'),
];
```

### Pattern 3: Alliance → Betrayal → Revenge

```typescript
const actions = [
  enrichActionWithEmotions(allianceAction, 'form_alliance'),
  enrichActionWithEmotions(betrayAction, 'betray'),
  enrichActionWithEmotions(revengeAction, 'confront'),
];
```

## OASIS Integration (Future)

When OASIS is ready:

```typescript
import { setEmotionalValidator, OASISEmotionalValidator } from './server/planning';

// Initialize OASIS
const oasisEngine = new OASISEngine(/* config */);
const validator = new OASISEmotionalValidator(oasisEngine);

// Use OASIS for validation
setEmotionalValidator(validator);

// Now all planning uses OASIS psychological simulations
const plan = await apdlPlan(state, goal, actions);
```

## Debugging

### Check Emotional State

```typescript
const aliceState = state.emotional_state.get('alice');
console.log('Alice emotions:');
for (const [emotion, intensity] of aliceState.feelings) {
  console.log(`  ${emotion}: ${intensity.toFixed(2)}`);
}
console.log(`Dominant: ${aliceState.dominant}`);
console.log(`Trajectory: ${aliceState.trajectory}`);
```

### Validate Single Action

```typescript
import { validateAction } from './server/planning';

const validation = validateAction(action, state, previousActions);

if (!validation.valid) {
  console.log('Errors:', validation.errors);
}
if (validation.warnings.length > 0) {
  console.log('Warnings:', validation.warnings);
}
```

### Print Validation Summary

```typescript
import { generateValidationSummary } from './server/planning';

const precondResult = validatePlanPreconditions(plan, actions);
const coherenceResult = validateEmotionalCoherence(plan);
const summary = generateValidationSummary(precondResult, coherenceResult);

console.log(summary);
```

## Performance Tips

1. **Limit plan length**: `max_plan_length: 20` (default)
2. **Set timeout**: `max_search_time_ms: 5000` (5 seconds)
3. **Use constraints**: Specify `required_actions` to guide search
4. **Prune actions**: Only include relevant actions for the scene
5. **Cache states**: State serialization is used for visited-set checking

## Common Issues

### Issue: No plan found

**Cause**: Emotional preconditions too strict or impossible goal

**Solution**: 
- Check emotional preconditions are achievable
- Add trust-building or emotion-generating actions
- Increase `max_plan_length` or `max_search_time_ms`

### Issue: Plan too flat

**Cause**: Not enough emotional variation

**Solution**:
- Use actions with higher `dramatic_weight`
- Mix rising and falling emotional arcs
- Set `min_emotional_variance: 0.05`

### Issue: "Unearned" warning

**Cause**: Large emotional jump without buildup

**Solution**:
- Add intermediate emotional states
- Use gradual emotional effects (smaller deltas)
- Insert setup actions before major beats

## Full Example

See `server/planning/examples.ts` for a complete betrayal-reconciliation arc that demonstrates:
- Trust building before betrayal
- Emotional preconditions blocking actions
- Remorse before reconciliation
- Validation and coherence checking

Run with:
```bash
npx ts-node server/planning/examples.ts
```

## Resources

- **Full Documentation**: `server/planning/README.md`
- **Implementation Details**: `server/planning/IMPLEMENTATION_SUMMARY.md`
- **Tests**: `tests/apdl.test.ts`
- **Examples**: `server/planning/examples.ts`

## Questions?

Check the README or examine the test suite for more examples.
