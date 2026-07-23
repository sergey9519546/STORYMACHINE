# V5.0 Narrative OS Integration

Complete integration layer connecting V5.0 components (Event Store, Trinity Gate, Quantum Field) with existing StoryMachine infrastructure (Stage, Director, Live Loop).

## Quick Start

```typescript
import { createV5Integration } from './integration.ts';
import { v5ReactToCommit } from '../live/v5-loop.ts';

// 1. Create integration
const v5 = createV5Integration({
  enableTrinityGate: true,
  enableQuantumField: false,
  dualWrite: true,
});

// 2. Commit story operations
const result = await v5.commit(ops, stage, {
  sceneIdx: 0,
  storyTime: 1000.0,
});

// 3. Use enhanced live loop
const liveResult = await v5ReactToCommit(stage, orchestrator, v5, commitId);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    V5.0 Integration Layer                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Event Store │───▶│ Quantum Field│───▶│ Trinity Gate │   │
│  │             │    │              │    │              │   │
│  │ - Immutable │    │ - Parallel   │    │ - 3-layer    │   │
│  │   event log │    │   story      │    │   validation │   │
│  │ - Crypto    │    │   states     │    │ - Plot hole  │   │
│  │   chain     │    │ - Prob calc  │    │   prevention │   │
│  │ - Temporal  │    │ - Auto prune │    │ - Repair     │   │
│  │   queries   │    │              │    │   suggestions│   │
│  └─────────────┘    └──────────────┘    └──────────────┘   │
│         │                   │                    │          │
│         └───────────────────┼────────────────────┘          │
│                             ▼                                │
│                  ┌─────────────────────┐                    │
│                  │   Dual-Write        │                    │
│                  │   (Optional)        │                    │
│                  └─────────────────────┘                    │
│                       │           │                          │
└───────────────────────┼───────────┼──────────────────────────┘
                        ▼           ▼
            ┌────────────────┐  ┌─────────────┐
            │     Stage      │  │ Live Loop   │
            │  (Legacy DB)   │  │ (Reactions) │
            └────────────────┘  └─────────────┘
```

## Components

### 1. Integration Orchestrator (`integration.ts`)

Main V5.0 orchestrator that coordinates all components.

**Key Features:**
- Dual-write support (EventStore + Stage simultaneously)
- Trinity Gate validation before commit
- Quantum Field management
- Migration helpers (import/export legacy data)
- Temporal queries (story-time vs presentation-time)
- Reality layer filtering

**API:**
```typescript
class V5Integration {
  // Core operations
  commit(ops, stage?, options?): Promise<CommitResult>
  explore(opsArray, currentState): Promise<ExploreResult>
  collapseToChoice(stateId): CollapseResult
  
  // Query interface
  getAllEvents(): NarrativeEvent[]
  getEventsBeforeStoryTime(t, layers?): NarrativeEvent[]
  getSnapshot(options?): Promise<NarrativeState>
  getQuantumSnapshot(): QuantumFieldSnapshot
  validateChain(): boolean
  
  // Migration helpers
  importLegacyCommits(commits): Promise<number>
  exportToLegacyCommits(): StoryCommit[]
}
```

### 2. Enhanced Live Loop (`live/v5-loop.ts`)

Upgraded reactive turn cycle with V5.0 capabilities.

**Key Features:**
- Quantum story exploration (multiple branches)
- Trinity Gate validation
- User branch selection
- Performance metrics
- Backward compatible with original loop

**API:**
```typescript
// Enhanced reaction loop
v5ReactToCommit(stage, orchestrator, v5, commitId, options): Promise<V5ReactResult>

// Advance world N beats
v5AdvanceWorld(stage, orchestrator, v5, beats, options): Promise<V5ReactResult>

// User selects branch after exploration
v5SelectBranch(stage, orchestrator, v5, branch, options): Promise<V5ReactResult>

// Formatting helpers
formatVerificationForDisplay(verification): string
formatBranchForDisplay(branch, index): string
```

### 3. Migration Guide (`V5_MIGRATION_GUIDE.md`)

Complete step-by-step guide for migrating from StoryCommit to V5.0.

**Covers:**
- Quick start
- Migration strategies (dual-write, import legacy, fresh start)
- Code examples (basic commit, quantum exploration, temporal queries)
- Common patterns
- Troubleshooting

### 4. Usage Examples (`v5-examples.ts`)

8 practical examples showing real-world usage patterns.

**Examples:**
1. Simple setup (dual-write mode)
2. Enhanced live loop
3. Quantum story exploration
4. Temporal queries (flashbacks)
5. Reality layers (dreams, hypotheticals)
6. Migration from legacy
7. Validation-only mode
8. Performance monitoring

## Configuration

```typescript
interface V5IntegrationConfig {
  enableTrinityGate?: boolean;      // Validate before commit (default: true)
  enableQuantumField?: boolean;     // Parallel story exploration (default: false)
  strictMode?: boolean;             // Block medium violations (default: false)
  dualWrite?: boolean;              // Write to Stage + EventStore (default: true)
  enableLogging?: boolean;          // Console logging (default: false)
  quantumConfig?: QuantumFieldConfig; // Quantum Field tuning
}
```

### Recommended Configurations

**Migration (Safest):**
```typescript
{
  enableTrinityGate: true,
  enableQuantumField: false,
  strictMode: false,
  dualWrite: true,
  enableLogging: true,
}
```

**Production (Balanced):**
```typescript
{
  enableTrinityGate: true,
  enableQuantumField: true,
  strictMode: false,
  dualWrite: false,
  enableLogging: false,
}
```

**Strict Validation:**
```typescript
{
  enableTrinityGate: true,
  strictMode: true,
  enableQuantumField: false,
  dualWrite: true,
}
```

**Full V5.0 (Advanced):**
```typescript
{
  enableTrinityGate: true,
  enableQuantumField: true,
  strictMode: true,
  dualWrite: false,
  quantumConfig: {
    maxStates: 1000,
    pruningThreshold: 0.01,
  },
}
```

## Workflow Examples

### Basic Commit Workflow

```typescript
const v5 = createV5Integration({ dualWrite: true });

// Create ops
const ops: StoryOp[] = [...];

// Commit through V5.0
const result = await v5.commit(ops, stage, {
  sceneIdx: 0,
  storyTime: 1000.0,
  realityLayer: 'diegetic',
  createdBy: 'user_authored',
});

if (result.success) {
  // Success! Events committed
  console.log('Events:', result.events);
} else {
  // Validation failed
  console.error('Error:', result.error);
  console.error('Violations:', result.verification?.violations);
}
```

### Quantum Exploration Workflow

```typescript
const v5 = createV5Integration({ 
  enableQuantumField: true,
  enableTrinityGate: true,
});

// Get current state
const state = await v5.getSnapshot();

// Generate branches (from Director)
const branches = [branch1Ops, branch2Ops, branch3Ops];

// Explore in parallel
const result = await v5.explore(branches, state);

// Show branches to user
for (const branch of result.branches) {
  console.log('Branch:', branch.stateId);
  console.log('  Probability:', branch.probability);
  console.log('  Legal:', branch.isLegal);
  console.log('  Health:', branch.verification?.overallHealth);
}

// User picks branch
const chosen = result.branches[userChoice];

// Collapse to chosen
v5.collapseToChoice(chosen.stateId);
```

### Enhanced Live Loop Workflow

```typescript
const v5 = createV5Integration({ 
  enableTrinityGate: true,
  dualWrite: true,
});

// Run enhanced loop
const result = await v5ReactToCommit(
  stage,
  orchestrator,
  v5,
  lastCommitId,
  {
    maxBeats: 2,
    enableValidation: true,
  }
);

// Check results
console.log('Turns run:', result.turnsRun);
console.log('Validation health:', result.validation?.overallHealth);
console.log('Performance:', result.metrics);
```

## Integration Points

### With Existing Stage

V5.0 maintains full backward compatibility through dual-write:

```typescript
// Stage continues to work
const commits = stage.getCommits();
const agents = stage.getAllAgents();

// V5.0 writes to Stage automatically (if dualWrite: true)
await v5.commit(ops, stage);  // Commits to both EventStore AND Stage

// Export EventStore as StoryCommits if needed
const legacyFormat = v5.exportToLegacyCommits();
```

### With Existing Director

Director continues to generate StoryOps as before:

```typescript
// Director generates ops (unchanged)
const ops = await director.generateOps(context);

// Commit through V5.0 instead of directly to Stage
await v5.commit(ops, stage);
```

### With Existing Live Loop

Enhanced loop is drop-in replacement:

```typescript
// Before
import { reactToCommit } from '../nvm/live/loop.ts';
await reactToCommit(stage, orchestrator, commitId);

// After
import { v5ReactToCommit } from '../nvm/live/v5-loop.ts';
await v5ReactToCommit(stage, orchestrator, v5, commitId);
```

## Performance

### Benchmarks (Target)

- **Event Store append**: <1ms per event
- **Trinity Gate validation**: <50ms per event
- **Quantum Field (100 states)**: <10ms validation cycle
- **Quantum Field (1000 states)**: <100ms validation cycle
- **Chain integrity check**: <100ms for 10,000 events

### Optimization Tips

1. **Batch operations** when possible (commit multiple ops at once)
2. **Tune Quantum Field** based on your needs:
   ```typescript
   quantumConfig: {
     maxStates: 100,           // Lower for faster performance
     pruningThreshold: 0.05,   // Higher for more aggressive pruning
   }
   ```
3. **Disable logging** in production:
   ```typescript
   enableLogging: false
   ```
4. **Use strictMode: false** unless you need to block medium violations

## Testing

Run examples to test integration:

```typescript
import { runAllExamples } from './v5-examples.ts';

await runAllExamples(stage, orchestrator);
```

Individual examples:

```typescript
import { 
  example1_simpleSetup,
  example3_quantumExploration 
} from './v5-examples.ts';

await example1_simpleSetup(stage);
await example3_quantumExploration(stage, orchestrator);
```

## Migration Checklist

- [ ] Read `V5_MIGRATION_GUIDE.md`
- [ ] Run `v5-examples.ts` to understand patterns
- [ ] Create V5Integration with `dualWrite: true`
- [ ] Replace direct Stage commits with `v5.commit()`
- [ ] Test with `enableTrinityGate: true`
- [ ] Monitor validation results
- [ ] Import legacy data with `importLegacyCommits()`
- [ ] Validate chain integrity with `validateChain()`
- [ ] Try Quantum Field with test data
- [ ] Gradually disable dual-write
- [ ] Update routes/handlers to use V5.0

## Files

```
server/nvm/
├── kernel/
│   ├── integration.ts              # Main V5.0 orchestrator (300 LOC)
│   ├── event-store.ts              # Immutable event log (existing)
│   ├── trinity-gate.ts             # 3-layer validation (existing)
│   ├── types.ts                    # Type definitions (existing)
│   ├── V5_MIGRATION_GUIDE.md       # Step-by-step migration guide
│   ├── v5-examples.ts              # 8 usage examples
│   └── README.md                   # This file
│
├── live/
│   ├── v5-loop.ts                  # Enhanced live loop (200 LOC)
│   └── loop.ts                     # Original loop (unchanged)
│
└── quantum/
    ├── story-field.ts              # Quantum narrative field (existing)
    ├── entanglement.ts             # Setup/payoff tracking (existing)
    └── types.ts                    # Quantum types (existing)
```

## Next Steps

1. **Start with examples**: Run `v5-examples.ts` to see V5.0 in action
2. **Read migration guide**: Follow `V5_MIGRATION_GUIDE.md` step-by-step
3. **Enable dual-write**: Safest way to adopt V5.0 gradually
4. **Test validation**: See Trinity Gate catch plot holes before they happen
5. **Try quantum**: Explore parallel story branches with Quantum Field

## Support

For questions or issues:
- See `V5_MIGRATION_GUIDE.md` troubleshooting section
- Check `v5-examples.ts` for usage patterns
- Review component documentation in source files
