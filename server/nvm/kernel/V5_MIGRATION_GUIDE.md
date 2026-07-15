# V5.0 Narrative OS Migration Guide

Complete guide for migrating from StoryCommit-based workflows to V5.0 Event Store architecture.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Migration Strategies](#migration-strategies)
4. [Code Examples](#code-examples)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### What's New in V5.0?

V5.0 introduces a complete event-sourced architecture for narrative state:

**Before (StoryCommit):**
```typescript
// Batch operations into commits
const commit: StoryCommit = {
  commitId: uuid(),
  ops: [op1, op2, op3],
  sceneIdx: 5,
  ...
};
stage.addCommit(commit);
```

**After (Event Store):**
```typescript
// Granular events with cryptographic chain
const event: NarrativeEvent = {
  eventId: uuid(),
  eventHash: sha256(...),
  parentHash: previousHash,
  op: op1,  // Single operation
  storyTime: 1000.0,
  presentationIndex: 42,
  ...
};
eventStore.append(event);
```

### Key Benefits

1. **Event Granularity**: Each StoryOp becomes one event (enables precise temporal queries)
2. **Dual Temporal Dimensions**: Story-time (diegetic order) + presentation-time (reveal order)
3. **Cryptographic Chain**: Git-like integrity with SHA-256 hashes
4. **Reality Layers**: Single log supports canon + dreams + flashbacks + hypotheticals
5. **Trinity Gate**: Automatic validation prevents plot holes by construction
6. **Quantum Field**: Explore 100-1000 parallel story branches simultaneously

---

## Quick Start

### Step 1: Install V5.0 Integration

```typescript
import { createV5Integration } from '../nvm/kernel/integration.ts';

// Create integration orchestrator
const v5 = createV5Integration({
  enableTrinityGate: true,    // Validate before commit
  enableQuantumField: false,  // Disable for simple migration
  dualWrite: true,            // Write to both EventStore AND Stage
  enableLogging: true,        // See what's happening
});
```

### Step 2: Replace Direct Stage Commits

**Before:**
```typescript
// Old way: directly commit to Stage
const ops = [addFactOp, updateBeliefOp];
const commit = {
  commitId: uuid(),
  parentId: null,
  sceneIdx: 0,
  ops,
  deltaSummary: summarizeOps(ops),
  reverted: false,
  createdAt: Date.now(),
};
stage.addCommit(commit);
```

**After:**
```typescript
// New way: commit through V5.0 integration
const ops = [addFactOp, updateBeliefOp];

const result = await v5.commit(ops, stage, {
  sceneIdx: 0,
  storyTime: 1000.0,
  realityLayer: 'diegetic',
  createdBy: 'user_authored',
});

if (!result.success) {
  console.error('Validation failed:', result.error);
  // Handle violations
} else {
  console.log('Committed:', result.events.length, 'events');
}
```

### Step 3: Use Enhanced Live Loop

**Before:**
```typescript
import { reactToCommit } from '../nvm/live/loop.ts';

const result = await reactToCommit(stage, orchestrator, commitId, {
  maxBeats: 2,
  locationId: 'tavern',
});
```

**After:**
```typescript
import { v5ReactToCommit } from '../nvm/live/v5-loop.ts';

const result = await v5ReactToCommit(
  stage,
  orchestrator,
  v5,  // V5Integration instance
  commitId,
  {
    maxBeats: 2,
    locationId: 'tavern',
    enableValidation: true,
  }
);

// Access Trinity Gate validation results
if (result.validation && !result.validation.pass) {
  console.log('Validation issues:', result.validation.summary);
}
```

---

## Migration Strategies

### Strategy 1: Dual-Write (Recommended for Production)

Run both systems in parallel during migration. Safest approach.

```typescript
const v5 = createV5Integration({
  dualWrite: true,  // ✓ Write to both EventStore and Stage
  enableTrinityGate: true,
  enableQuantumField: false,
});

// Existing code continues to work with Stage
const commits = stage.getCommits();

// New code can query EventStore
const events = v5.getAllEvents();
```

**Timeline:**
1. Week 1-2: Deploy with `dualWrite: true`, monitor
2. Week 3-4: Migrate read queries to EventStore
3. Week 5+: Disable dual-write, use EventStore only

### Strategy 2: Import Legacy Data

Migrate existing projects by importing StoryCommits into EventStore.

```typescript
const v5 = createV5Integration();

// Get all existing commits from Stage
const legacyCommits = stage.getCommits();

// Import into EventStore
const imported = await v5.importLegacyCommits(legacyCommits);
console.log(`Imported ${imported} events from ${legacyCommits.length} commits`);

// Validate chain integrity
const isValid = v5.validateChain();
console.log('Chain valid:', isValid);
```

### Strategy 3: Fresh Start (New Projects)

Start new projects directly on V5.0.

```typescript
const v5 = createV5Integration({
  dualWrite: false,  // ✗ EventStore only
  enableTrinityGate: true,
  enableQuantumField: true,  // Full V5.0 features
});

// All operations go through V5.0
await v5.commit(ops, stage, { ... });
```

---

## Code Examples

### Example 1: Basic Commit with Validation

```typescript
import { createV5Integration } from '../nvm/kernel/integration.ts';
import type { StoryOp } from '../nvm/ops/StoryOp.ts';

const v5 = createV5Integration({
  enableTrinityGate: true,
  strictMode: false,  // Allow medium-severity violations
});

// Create story operations
const ops: StoryOp[] = [
  {
    op: 'ADD_FACT',
    fact: {
      factId: 'f1',
      description: 'The door is locked',
      addedAtTurn: 1,
    },
  },
  {
    op: 'SEED_CLUE',
    clueId: 'key_location',
    carrier: 'tavern_drawer',
  },
];

// Commit through V5.0
const result = await v5.commit(ops, stage, {
  sceneIdx: 0,
  storyTime: 1000.0,
  realityLayer: 'diegetic',
  createdBy: 'user_authored',
});

if (result.success) {
  console.log('✓ Committed', result.events.length, 'events');
  
  // Access verification details
  if (result.verification) {
    console.log('Health score:', result.verification.overallHealth);
    console.log('Violations:', result.verification.summary.totalViolations);
  }
} else {
  console.error('✗ Commit blocked:', result.error?.message);
  
  // Show violations
  if (result.verification) {
    for (const violation of result.verification.violations) {
      console.error(`[${violation.layer}] ${violation.message}`);
      console.error('  Suggestion:', violation.repairSuggestions[0]);
    }
  }
}
```

### Example 2: Quantum Story Exploration

```typescript
import { createV5Integration } from '../nvm/kernel/integration.ts';

const v5 = createV5Integration({
  enableQuantumField: true,
  enableTrinityGate: true,
});

// Initialize quantum field from current state
const currentState = await v5.getSnapshot();

// Generate multiple story branches
const branch1 = [/* ops for confrontation */];
const branch2 = [/* ops for negotiation */];
const branch3 = [/* ops for escape */];

const exploreResult = await v5.explore(
  [branch1, branch2, branch3],
  currentState,
  { storyTime: 1500.0 }
);

// Display branches to user
for (const branch of exploreResult.branches) {
  console.log(`Branch ${branch.stateId}:`);
  console.log(`  Probability: ${Math.round(branch.probability * 100)}%`);
  console.log(`  Legal: ${branch.isLegal}`);
  
  if (branch.verification) {
    console.log(`  Health: ${branch.verification.overallHealth}/100`);
  }
}

// User picks highest probability legal branch
const legalBranches = exploreResult.branches.filter(b => b.isLegal);
const chosen = legalBranches.sort((a, b) => b.probability - a.probability)[0];

// Collapse quantum field to chosen branch
const collapseResult = v5.collapseToChoice(chosen.stateId);
console.log('Collapsed to chosen branch');
console.log('Resolved setups:', collapseResult.entanglementChanges.resolvedSetups);
```

### Example 3: Enhanced Live Loop with Branch Selection

```typescript
import { v5ReactToCommit } from '../nvm/live/v5-loop.ts';

// Run live loop with quantum exploration
const result = await v5ReactToCommit(
  stage,
  orchestrator,
  v5,
  lastCommitId,
  {
    maxBeats: 2,
    enableQuantumExploration: true,
    branchCount: 3,
    enableValidation: true,
  }
);

// Show proposed branches to user
if (result.proposedBranches) {
  console.log('Director proposes', result.proposedBranches.length, 'branches:');
  
  result.proposedBranches.forEach((branch, i) => {
    console.log(`\nBranch ${i + 1}:`);
    console.log('  Description:', branch.summary.description);
    console.log('  Impact:', branch.summary.dramaticImpact);
    console.log('  Probability:', Math.round((branch.probability ?? 0) * 100) + '%');
    console.log('  Valid:', branch.isLegal ? '✓' : '✗');
  });
}

// Auto-selected branch
if (result.chosenBranch) {
  console.log('\nChosen branch:', result.chosenBranch.summary.description);
}

// Performance metrics
if (result.metrics) {
  console.log('\nPerformance:');
  console.log('  Exploration:', result.metrics.explorationTimeMs + 'ms');
  console.log('  Validation:', result.metrics.validationTimeMs + 'ms');
  console.log('  Commit:', result.metrics.commitTimeMs + 'ms');
}
```

### Example 4: Temporal Queries (Story-Time vs Presentation-Time)

```typescript
// Query by story-time (diegetic order)
const eventsAt1500 = v5.getEventsBeforeStoryTime(1500.0, ['diegetic']);
console.log('Events before story-time 1500:', eventsAt1500.length);

// Query by presentation-time (reveal order)
const eventStore = v5['eventStore'];  // Access underlying store
const eventsAtPresentation100 = eventStore.getEventsBeforePresentationIndex(100);
console.log('Events before presentation index 100:', eventsAtPresentation100.length);

// This enables flashbacks: presentation index 100 might show story-time 500
// (earlier than events at presentation index 50 with story-time 1000)

// Get snapshot at specific story-time
const snapshotAt1500 = await v5.getSnapshot({ 
  storyTime: 1500.0,
  realityLayers: ['diegetic', 'memory'],  // Include flashbacks
});
console.log('State at story-time 1500:', snapshotAt1500.turn);
```

### Example 5: Reality Layers (Dreams, Flashbacks, Hypotheticals)

```typescript
// Commit a dream sequence
await v5.commit(dreamOps, stage, {
  realityLayer: 'dream',  // Not canon
  storyTime: 2000.0,
  createdBy: 'director_proposed',
});

// Commit a flashback
await v5.commit(flashbackOps, stage, {
  realityLayer: 'memory',
  storyTime: 100.0,  // Early in story-time
  presentationIndex: 500,  // Late in reveal order
  createdBy: 'screenwriter_generated',
});

// Commit hypothetical "what if" scenario
await v5.commit(whatIfOps, stage, {
  realityLayer: 'hypothetical',
  storyTime: 1500.0,
});

// Query only canon events
const canonEvents = v5.getEventsBeforeStoryTime(3000.0, ['diegetic']);

// Query all narrative layers
const allEvents = v5.getEventsBeforeStoryTime(3000.0, [
  'diegetic',
  'dream',
  'memory',
  'hypothetical',
  'deceptive',
]);
```

---

## Common Patterns

### Pattern 1: Gradual Feature Adoption

```typescript
// Phase 1: Just dual-write (no validation)
const v5Phase1 = createV5Integration({
  enableTrinityGate: false,
  enableQuantumField: false,
  dualWrite: true,
});

// Phase 2: Add validation
const v5Phase2 = createV5Integration({
  enableTrinityGate: true,
  enableQuantumField: false,
  dualWrite: true,
});

// Phase 3: Full V5.0 with quantum exploration
const v5Phase3 = createV5Integration({
  enableTrinityGate: true,
  enableQuantumField: true,
  dualWrite: false,
});
```

### Pattern 2: Validation-Only Mode (No Quantum)

Perfect for projects that want validation but not exploration.

```typescript
const v5 = createV5Integration({
  enableTrinityGate: true,
  strictMode: true,  // Block even medium violations
  enableQuantumField: false,
  dualWrite: true,
});

// All commits validated through Trinity Gate
const result = await v5.commit(ops, stage);

if (!result.success) {
  // Show specific violations to user
  for (const violation of result.verification!.violations) {
    showUserError({
      layer: violation.layer,
      message: violation.message,
      suggestions: violation.repairSuggestions,
    });
  }
}
```

### Pattern 3: Export for Backup/Interop

```typescript
// Export EventStore as legacy StoryCommits
const legacyCommits = v5.exportToLegacyCommits();

// Save to JSON for backup
fs.writeFileSync('backup.json', JSON.stringify(legacyCommits, null, 2));

// Import into another system
const v5Other = createV5Integration();
await v5Other.importLegacyCommits(legacyCommits);
```

### Pattern 4: Custom Validation Rules

```typescript
// Run custom checks after Trinity Gate
const result = await v5.commit(ops, stage);

if (result.success && result.verification) {
  // Add custom business rules
  if (result.verification.overallHealth < 70) {
    console.warn('Health below threshold!');
    // Optionally block or warn user
  }
  
  // Check specific layer scores
  if (result.verification.layers.storyGraph.graphHealth < 50) {
    console.error('Story graph coherence too low');
  }
}
```

---

## Troubleshooting

### Issue 1: "Stage.addCommit is not a function"

**Cause:** Stage might not have an `addCommit` method in your version.

**Solution:** Modify integration.ts to use your Stage's actual API:

```typescript
// In integration.ts, replace:
(stage as any).addCommit?.(storyCommit);

// With your Stage's actual method, e.g.:
stage.commitStory(storyCommit);
// or
stage.recordCommit(storyCommit);
```

### Issue 2: Validation Fails on Legacy Data

**Cause:** Legacy commits might not satisfy Trinity Gate rules.

**Solution:** Import with validation disabled, then fix issues:

```typescript
const v5 = createV5Integration({
  enableTrinityGate: false,  // Disable for import
});

await v5.importLegacyCommits(legacyCommits);

// Re-enable validation for new commits
v5['config'].enableTrinityGate = true;
```

### Issue 3: Performance Issues with Large Quantum Fields

**Cause:** Too many states in superposition.

**Solution:** Tune quantum field configuration:

```typescript
const v5 = createV5Integration({
  enableQuantumField: true,
  quantumConfig: {
    maxStates: 100,  // Lower limit (default: 1000)
    pruningThreshold: 0.05,  // More aggressive pruning (default: 0.01)
  },
});
```

### Issue 4: Events Out of Order

**Cause:** Story-time and presentation-time confusion.

**Solution:** Be explicit about temporal dimensions:

```typescript
// For flashbacks
await v5.commit(ops, stage, {
  storyTime: 100.0,  // Early in diegetic time
  presentationIndex: currentPresentation++,  // Current reveal order
});

// For normal progression
await v5.commit(ops, stage, {
  storyTime: currentStoryTime++,  // Advance story-time
  presentationIndex: currentPresentation++,  // Advance reveal order
});
```

### Issue 5: Chain Validation Fails After Import

**Cause:** Parent hashes broken during import.

**Solution:** Validate after import and rebuild if needed:

```typescript
await v5.importLegacyCommits(legacyCommits);

if (!v5.validateChain()) {
  console.error('Chain integrity compromised');
  // Option 1: Reimport from clean backup
  // Option 2: Create new EventStore and start fresh
}
```

---

## Next Steps

1. **Start Simple**: Enable dual-write first, no validation
2. **Add Validation**: Enable Trinity Gate after stabilization
3. **Try Quantum**: Enable Quantum Field for story exploration
4. **Optimize**: Tune configuration based on performance metrics
5. **Full Migration**: Disable dual-write once confident

For questions or issues, see:
- `server/nvm/kernel/integration.ts` - Integration orchestrator
- `server/nvm/live/v5-loop.ts` - Enhanced live loop
- `server/nvm/kernel/trinity-gate.ts` - Validation system
- `server/nvm/quantum/story-field.ts` - Quantum field
