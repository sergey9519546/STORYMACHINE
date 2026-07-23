# APDL (Affective Planning Domain Language)

Complete emotional-logic layer for StoryMachine's narrative planner.

## Overview

APDL extends PDDL (Planning Domain Definition Language) with emotional and dramatic reasoning. While PDDL handles causal logic ("Character must have key to open door"), APDL adds:

- **Emotional preconditions**: "Character must feel betrayed before confrontation"
- **Emotional effects**: "Betrayal causes anger (0.7) and loss of trust (-0.8)"
- **Audience state**: Tracking dramatic irony, tension, and engagement
- **Dual optimization**: Plans that are both causally valid AND dramatically interesting

## Architecture

```
server/planning/
├── pddl-types.ts              # Base PDDL types (predicates, actions, goals)
├── apdl.ts                    # Core APDL types (emotions, audience, extended world state)
├── apdl-planner.ts            # Dual-optimization A* planner
├── apdl-validator.ts          # Emotional coherence validation
├── emotional-effects-library.ts # 20+ pre-defined dramatic actions
└── oasis-integration.ts       # Future OASIS psychological simulation hooks
```

## Core Concepts

### Emotional State

Characters track emotional intensity (0-1) across 20+ emotions:

```typescript
const emotionalState: EmotionalState = {
  feelings: Map<Emotion, Intensity>,  // e.g., {"betrayed": 0.9, "anger": 0.7}
  trajectory: 'rising' | 'falling' | 'flat' | 'oscillating',
  lastChange: 5,  // scene number
  dominant: 'betrayed',  // highest intensity emotion
  peakIntensity: 0.9
};
```

**Emotional decay**: Emotions fade by default (0.1 per scene) unless sustained by events.

### Emotional Preconditions

Actions can require emotional states:

```typescript
const confrontAction: APDLAction = {
  name: 'confront',
  emotional_preconditions: [
    {
      character: 'alice',
      emotion: 'betrayed',
      min_intensity: 0.5,
      reason: 'Cannot confront without feeling wronged'
    }
  ],
  // ... causal preconditions, effects
};
```

**The planner rejects this action if Alice's betrayal intensity < 0.5.**

### Emotional Effects

Actions change emotional states:

```typescript
const betrayAction: APDLAction = {
  name: 'betray',
  emotional_effects: [
    { character: 'target', emotion: 'betrayed', delta: 0.9, decay_rate: 0.05 },
    { character: 'target', emotion: 'trust', delta: -0.8, decay_rate: 0.02 },
    { character: 'actor', emotion: 'guilt', delta: 0.5, decay_rate: 0.1 }
  ]
};
```

### Audience State

Tracks dramatic irony and engagement:

```typescript
interface AudienceState {
  knows: Set<string>;              // Facts audience knows that characters don't
  expects: Map<string, number>;    // Expected events with probability
  fears: Set<string>;              // Dreaded outcomes
  hopes: Set<string>;              // Desired outcomes
  tension: number;                 // 0-1
  engagement: number;              // 0-1
}
```

## Usage

### Basic Planning

```typescript
import { apdlPlan } from './server/planning/apdl-planner';
import { createTestState } from './server/planning/apdl';

const initialState = createTestState();
const goal = {
  required_facts: [{ name: 'reconciled', parameters: [] }],
  emotional_goals: [
    { character: 'alice', emotion: 'trust', target_intensity: 0.5 }
  ]
};

const plan = await apdlPlan(initialState, goal, availableActions, {
  max_search_time_ms: 5000,
  min_emotional_variance: 0.05,  // Prevent flat stories
  min_catharsis_points: 1
});

console.log(`Plan: ${plan.actions.map(a => a.name).join(' → ')}`);
console.log(`Emotional cost: ${plan.emotional_cost}`);
console.log(`Coherence score: ${plan.coherence_score}`);
```

### Using Emotional Templates

Pre-defined templates for 20+ dramatic actions:

```typescript
import { enrichActionWithEmotions, EMOTIONAL_EFFECTS_LIBRARY } from './server/planning/emotional-effects-library';

// List available templates
console.log(Object.keys(EMOTIONAL_EFFECTS_LIBRARY));
// → ['betray', 'reconcile', 'reveal_secret', 'confront', ...]

// Enrich a base action
const baseAction = { name: 'betray_bob', /* ... */ };
const enriched = enrichActionWithEmotions(baseAction, 'betray');

// enriched now has emotional_effects and emotional_preconditions
```

### Validation

```typescript
import { validateEmotionalCoherence, generateValidationSummary } from './server/planning/apdl-validator';

const coherenceResult = validateEmotionalCoherence(plan);

if (!coherenceResult.coherent) {
  console.log('Issues found:');
  coherenceResult.issues.forEach(issue => {
    console.log(`- Scene ${issue.scene}: ${issue.description} (${issue.severity})`);
  });
}

// Generate full report
const summary = generateValidationSummary(precondResult, coherenceResult);
console.log(summary);
```

## Emotional Effects Library

### Betrayal & Trust
- `betray`: High dramatic weight (9), requires trust ≥ 0.4
- `reconcile`: Requires regret ≥ 0.3, releases tension
- `build_trust`: Gradual trust building (+0.3)

### Secrets & Revelation
- `reveal_secret`: Actor vulnerable (+0.7), target shocked (+0.8)
- `discover_secret`: Creates dramatic irony
- `keep_secret`: Builds guilt, increases tension

### Confrontation & Conflict
- `confront`: Requires anger ≥ 0.4, fear < 0.8
- `threaten`: Target fear +0.8, trust -0.6
- `de_escalate`: Reduces anger/fear for all

### Deception & Manipulation
- `lie`: Creates irony gap, builds guilt
- `expose_lie`: High shame for liar, releases irony
- `manipulate`: Subtle influence, pride for actor

### Vulnerability & Connection
- `confess_feelings`: High vulnerability (+0.8), requires love ≥ 0.5
- `offer_support`: Reduces distress, builds trust
- `reject`: Shame +0.6, disappointment +0.7

### Alliance & Loyalty
- `form_alliance`: Requires trust ≥ 0.2
- `break_alliance`: Like betrayal, high dramatic weight (8)
- `protect`: Builds trust and admiration

### Achievement & Failure
- `achieve_goal`: Joy +0.8, provides catharsis
- `fail_goal`: Distress +0.7, shame if public
- `sacrifice`: Highest weight (9), requires love ≥ 0.4

## Validation Issues

The validator detects:

1. **Unearned emotions**: Strong emotions without buildup
   - Example: Betrayal intensity jumps from 0.1 to 0.9 in one scene
   
2. **Rushed arcs**: Too-fast trajectory changes
   - Example: Rising → Falling in one scene
   - Example: Two major beats (weight ≥ 8) back-to-back
   
3. **Flat trajectories**: Too many flat scenes
   - Warning at 50% flat, error at 70% flat
   
4. **Incoherent transitions**: Psychologically implausible
   - Example: Joy → Distress without intermediate confusion

## Dual Optimization

The planner uses a dual cost function:

```typescript
totalCost = causalCost + emotionalCost

where:
  causalCost = sum of action costs (minimize plan length)
  emotionalCost = flatnessPenalty + catharsisPenalty
  
  flatnessPenalty = 1.0 / (emotionalVariance + 0.01)
  catharsisPenalty = catharsisCount > 0 ? 0 : 2.0
```

This means:
- **Short plans** are preferred (fewer actions)
- **Emotionally flat plans** are penalized heavily
- **Plans without catharsis** are penalized

## OASIS Integration (Future)

APDL includes hooks for OASIS psychological simulation:

```typescript
import { setEmotionalValidator, OASISEmotionalValidator } from './server/planning/oasis-integration';

// Future: When OASIS is implemented
const oasisEngine = new OASISEngine(/* ... */);
const validator = new OASISEmotionalValidator(oasisEngine);
setEmotionalValidator(validator);

// Now apdlPlan() uses OASIS for validation
const plan = await apdlPlan(state, goal, actions);
```

**Current**: Uses `DeterministicEmotionalValidator` (threshold checks)  
**Future**: OASIS runs micro-simulations to validate emotional plausibility

### Validator Interface

```typescript
interface EmotionalValidator {
  validatePrecondition(precond, state, context): Promise<ValidationResult>;
  simulateEmotionalEffects(action, state): Promise<SimulatedEmotionalEffects>;
  validateTransition(from, to, char, trigger, state): Promise<TransitionPlausibility>;
}
```

OASIS can provide:
- **Higher fidelity**: Personality-based emotional responses
- **Uncertainty bounds**: Confidence intervals on predictions
- **Alternative suggestions**: Better emotions for the situation
- **Psychological plausibility**: Defense mechanisms, attachment styles

## Example: Blocked Confrontation

```typescript
// Setup
const state = createTestState();
const aliceState = state.emotional_state.get('alice')!;
setEmotionIntensity(aliceState, 'betrayed', 0.2, 0);  // Too low

// Define actions
const actions = [
  // ... build_betrayal action that increases betrayed to 0.6
  {
    name: 'confront',
    emotional_preconditions: [
      { character: 'alice', emotion: 'betrayed', min_intensity: 0.5 }
    ],
    // ...
  }
];

// Plan
const plan = await apdlPlan(state, goal, actions);

// Result: Planner inserts build_betrayal BEFORE confront
// Plan: [build_betrayal, confront]
// Validates emotional preconditions are satisfied in sequence
```

## Backward Compatibility

APDL is fully backward-compatible with pure PDDL:

```typescript
// Upgrade PDDL state to APDL
const apdlState = upgradeToAPDL(pddlState);  // Adds empty emotional_state

// Convert PDDL plan to APDL
const apdlPlan = enrichWithEmotionalLogic(pddlPlan);  // Adds emotional fields

// PDDL actions work unchanged
const pddlAction = { name: 'move', preconditions: [...], effects: [...] };
// Just has empty emotional_effects and emotional_preconditions arrays
```

## Testing

Comprehensive test suite in `tests/apdl.test.ts`:

- ✓ Emotional state management (get/set/decay)
- ✓ Emotional precondition satisfaction
- ✓ PDDL base operations (predicates, actions)
- ✓ Emotional effects library (20+ templates)
- ✓ Validation (preconditions, coherence, single actions)
- ✓ Planning (simple plans, blocked preconditions)
- ✓ Integration test (betrayal → trust-building → reconciliation)

Run tests:
```bash
npm test tests/apdl.test.ts
```

## Performance

- **Planning**: A* search with visited-set pruning
- **State serialization**: Facts + dominant emotions (not full state)
- **Typical performance**: 1000-2000 nodes/second
- **Memory**: ~100 KB per 1000 nodes explored
- **Recommended limits**:
  - `max_plan_length`: 20 actions
  - `max_search_time_ms`: 5000 ms
  - `max_emotional_variance`: 0.05-0.1

## Integration with StoryMachine

APDL types are compatible with StoryMachine's existing types:

```typescript
// From server/engine/types.ts
CharacterId → CharacterSheet.char_id
Emotion → extends EmotionType (OCC model)
EmotionalState.feelings → similar to EmotionState
```

To integrate with existing StoryMachine engine:

1. **Convert CharacterSheet → APDL state**:
   ```typescript
   const apdlState = characterSheetToAPDL(sheet);
   ```

2. **Convert ActionLogEntry → APDLAction**:
   ```typescript
   const apdlAction = enrichActionWithEmotions(logEntry, 'betray');
   ```

3. **Use APDL validator in DirectorNode**:
   ```typescript
   const validation = await validateAction(action, state, previousActions);
   if (!validation.valid) {
     // Reject action, emit DramaticPressure
   }
   ```

4. **Future**: Replace goal replanning with APDL planner

## Limitations

1. **No temporal reasoning**: Actions are instantaneous, no durations
2. **No partial observability**: All facts are globally known
3. **No multi-agent planning**: Plans for single "story" agent
4. **Simplified emotions**: Discrete intensities, not continuous dynamics
5. **No personality interaction**: Waiting for OASIS integration

These are acceptable for narrative planning but would need extension for full cognitive simulation.

## File Sizes

- `pddl-types.ts`: ~170 lines
- `apdl.ts`: ~420 lines
- `apdl-planner.ts`: ~450 lines
- `apdl-validator.ts`: ~400 lines
- `emotional-effects-library.ts`: ~500 lines
- `oasis-integration.ts`: ~300 lines
- `tests/apdl.test.ts`: ~600 lines

**Total: ~2,840 lines** of production code + tests

## License

Same as StoryMachine (see root LICENSE file).

## Authors

Built for StoryMachine's narrative planning system.
OASIS integration hooks designed for future psychological simulation.
