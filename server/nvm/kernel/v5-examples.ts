// V5.0 Integration Usage Examples
//
// Practical examples showing how to use V5.0 Narrative OS in real scenarios.
// Copy these patterns into your routes/handlers.

import type { Stage } from '../../engine/Stage.ts';
import type { Orchestrator } from '../../engine/Orchestrator.ts';
import { createV5Integration } from '../kernel/integration.ts';
import { v5ReactToCommit, v5AdvanceWorld, formatVerificationForDisplay } from '../live/v5-loop.ts';
import type { StoryOp } from '../ops/StoryOp.ts';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXAMPLE 1: Simple Setup (Dual-Write Mode)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function example1_simpleSetup(stage: Stage) {
  // Create V5.0 integration with dual-write (safest for migration)
  const v5 = createV5Integration({
    enableTrinityGate: true,     // Validate before commit
    enableQuantumField: false,   // Not needed for simple use
    dualWrite: true,             // Write to both EventStore AND Stage
    enableLogging: true,         // See what's happening
  });
  
  // Create some story operations
  const ops: StoryOp[] = [
    {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_door_locked',
        description: 'The tavern door is locked from inside',
        addedAtTurn: 1,
      },
    },
    {
      op: 'SEED_CLUE',
      clueId: 'clue_key_location',
      carrier: 'bartender_apron',
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
    console.log('✓ Committed successfully!');
    console.log('  Events created:', result.events.length);
    console.log('  Health score:', result.verification?.overallHealth);
    
    // Legacy Stage still works
    console.log('  Stage commits:', stage.getCommits().length);
  } else {
    console.error('✗ Commit blocked by Trinity Gate');
    console.error('  Reason:', result.error?.message);
    
    if (result.verification) {
      console.error('\n' + formatVerificationForDisplay(result.verification));
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXAMPLE 2: Enhanced Live Loop
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function example2_enhancedLiveLoop(
  stage: Stage,
  orchestrator: Orchestrator
) {
  const v5 = createV5Integration({
    enableTrinityGate: true,
    dualWrite: true,
  });
  
  const lastCommitId = stage.getCommits()[stage.getCommits().length - 1]?.commitId || 'initial';
  
  // Run enhanced live loop with validation
  const result = await v5ReactToCommit(
    stage,
    orchestrator,
    v5,
    lastCommitId,
    {
      maxBeats: 2,
      locationId: 'tavern',
      enableValidation: true,
    }
  );
  
  console.log('Live loop results:');
  console.log('  Turns run:', result.turnsRun);
  console.log('  Commits:', result.commits.length);
  console.log('  Events:', result.events.length);
  console.log('  Stopped because:', result.stoppedBecause);
  
  if (result.validation) {
    console.log('  Validation health:', result.validation.overallHealth);
  }
  
  if (result.metrics) {
    console.log('  Performance:');
    console.log('    Validation:', result.metrics.validationTimeMs + 'ms');
    console.log('    Commit:', result.metrics.commitTimeMs + 'ms');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXAMPLE 3: Quantum Story Exploration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function example3_quantumExploration(
  stage: Stage,
  orchestrator: Orchestrator
) {
  const v5 = createV5Integration({
    enableTrinityGate: true,
    enableQuantumField: true,    // ✓ Enable quantum features
    dualWrite: true,
    quantumConfig: {
      maxStates: 100,
      pruningThreshold: 0.01,
    },
  });
  
  // Get current narrative state
  const currentState = await v5.getSnapshot();
  
  // Generate multiple story branches (normally from Director)
  const branch1: StoryOp[] = [
    { op: 'ADD_FACT', fact: { factId: 'f1', description: 'Alice confronts Bob', addedAtTurn: 2 } },
    { op: 'SHIFT_RELATIONSHIP', pair: ['alice', 'bob'], delta: -20 },
  ];
  
  const branch2: StoryOp[] = [
    { op: 'ADD_FACT', fact: { factId: 'f2', description: 'Alice negotiates with Bob', addedAtTurn: 2 } },
    { op: 'SHIFT_RELATIONSHIP', pair: ['alice', 'bob'], delta: 10 },
  ];
  
  const branch3: StoryOp[] = [
    { op: 'ADD_FACT', fact: { factId: 'f3', description: 'Alice flees from Bob', addedAtTurn: 2 } },
    { op: 'RAISE_CLOCK', clockId: 'tension', amount: 2 },
  ];
  
  // Explore all branches in parallel
  const exploreResult = await v5.explore(
    [branch1, branch2, branch3],
    currentState,
    { storyTime: 1500.0 }
  );
  
  console.log('Explored', exploreResult.branches.length, 'branches:');
  
  for (let i = 0; i < exploreResult.branches.length; i++) {
    const branch = exploreResult.branches[i];
    console.log(`\nBranch ${i + 1}:`);
    console.log('  Probability:', Math.round(branch.probability * 100) + '%');
    console.log('  Legal:', branch.isLegal ? '✓' : '✗');
    
    if (branch.verification) {
      console.log('  Health:', branch.verification.overallHealth);
      console.log('  Violations:', branch.verification.summary.totalViolations);
    }
  }
  
  // Auto-pick highest probability legal branch
  const legalBranches = exploreResult.branches.filter(b => b.isLegal);
  const chosen = legalBranches.sort((a, b) => b.probability - a.probability)[0];
  
  console.log('\nChosen branch:', chosen.stateId);
  console.log('  Probability:', Math.round(chosen.probability * 100) + '%');
  
  // Collapse quantum field to chosen branch
  const collapseResult = v5.collapseToChoice(chosen.stateId);
  console.log('Collapsed! Pruned', collapseResult.prunedStates.length, 'alternate states');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXAMPLE 4: Temporal Queries (Flashbacks)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function example4_temporalQueries(stage: Stage) {
  const v5 = createV5Integration();
  
  // Commit present-day scene
  await v5.commit(
    [{ op: 'ADD_FACT', fact: { factId: 'f1', description: 'Detective finds evidence', addedAtTurn: 5 } }],
    stage,
    {
      storyTime: 5000.0,           // Late in story
      realityLayer: 'diegetic',
    }
  );
  
  // Commit flashback scene
  await v5.commit(
    [{ op: 'ADD_FACT', fact: { factId: 'f2', description: 'Murderer hides weapon', addedAtTurn: 1 } }],
    stage,
    {
      storyTime: 1000.0,           // Early in story (flashback)
      realityLayer: 'memory',      // Flashback layer
    }
  );
  
  // Query by story-time (diegetic order)
  const eventsAt3000 = v5.getEventsBeforeStoryTime(3000.0, ['diegetic', 'memory']);
  console.log('Events before story-time 3000:', eventsAt3000.length);
  // Will include flashback (1000.0) but not present-day (5000.0)
  
  // Get snapshot at specific story-time
  const snapshotAt3000 = await v5.getSnapshot({ 
    storyTime: 3000.0,
    realityLayers: ['diegetic', 'memory'],
  });
  console.log('State at story-time 3000:', snapshotAt3000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXAMPLE 5: Reality Layers (Dreams, Hypotheticals)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function example5_realityLayers(stage: Stage) {
  const v5 = createV5Integration();
  
  // Commit canon scene
  await v5.commit(
    [{ op: 'ADD_FACT', fact: { factId: 'f1', description: 'Alice enters tavern', addedAtTurn: 1 } }],
    stage,
    {
      storyTime: 1000.0,
      realityLayer: 'diegetic',    // Canon
    }
  );
  
  // Commit dream sequence
  await v5.commit(
    [{ op: 'ADD_FACT', fact: { factId: 'f2', description: 'Alice flies through sky', addedAtTurn: 2 } }],
    stage,
    {
      storyTime: 1100.0,
      realityLayer: 'dream',       // Not canon
    }
  );
  
  // Commit hypothetical "what if" scenario
  await v5.commit(
    [{ op: 'ADD_FACT', fact: { factId: 'f3', description: 'What if Alice had fled?', addedAtTurn: 3 } }],
    stage,
    {
      storyTime: 1000.0,           // Same time as canon
      realityLayer: 'hypothetical', // Alternate timeline
    }
  );
  
  // Query only canon
  const canonOnly = v5.getEventsBeforeStoryTime(2000.0, ['diegetic']);
  console.log('Canon events:', canonOnly.length);  // 1
  
  // Query all layers
  const allLayers = v5.getEventsBeforeStoryTime(2000.0, [
    'diegetic',
    'dream',
    'memory',
    'hypothetical',
    'deceptive',
  ]);
  console.log('All events:', allLayers.length);  // 3
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXAMPLE 6: Migration from Legacy
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function example6_migrateLegacy(stage: Stage) {
  const v5 = createV5Integration({
    enableTrinityGate: false,  // Disable for import (legacy might have issues)
  });
  
  // Get all existing commits from Stage
  const legacyCommits = stage.getCommits();
  console.log('Found', legacyCommits.length, 'legacy commits');
  
  // Import into V5.0 Event Store
  const imported = await v5.importLegacyCommits(legacyCommits);
  console.log('Imported', imported, 'events');
  
  // Validate chain integrity
  const isValid = v5.validateChain();
  console.log('Chain valid:', isValid);
  
  // Get all events
  const events = v5.getAllEvents();
  console.log('Total events in store:', events.length);
  
  // Re-enable validation for future commits
  (v5 as any).config.enableTrinityGate = true;
  console.log('Validation enabled for new commits');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXAMPLE 7: Validation-Only Mode (No Quantum)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function example7_validationOnly(stage: Stage) {
  const v5 = createV5Integration({
    enableTrinityGate: true,
    strictMode: true,           // Block even medium-severity violations
    enableQuantumField: false,  // Don't need quantum for validation
    dualWrite: true,
  });
  
  // Try to commit ops with potential issues
  const ops: StoryOp[] = [
    {
      op: 'PAYOFF_SETUP',
      setupId: 'nonexistent_setup',  // This should trigger violation
      payoffEventId: 'event1',
    },
  ];
  
  const result = await v5.commit(ops, stage, {
    sceneIdx: 1,
    storyTime: 2000.0,
  });
  
  if (!result.success) {
    console.error('✗ Validation failed!');
    console.error('Reason:', result.error?.message);
    
    if (result.verification) {
      // Show detailed violations
      for (const violation of result.verification.violations) {
        console.error(`\n[${violation.layer}] ${violation.severity.toUpperCase()}`);
        console.error('  Message:', violation.message);
        console.error('  Suggestions:');
        violation.repairSuggestions.forEach(s => console.error('    -', s));
      }
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXAMPLE 8: Performance Monitoring
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function example8_performanceMonitoring(
  stage: Stage,
  orchestrator: Orchestrator
) {
  const v5 = createV5Integration({
    enableTrinityGate: true,
    enableQuantumField: true,
    enableLogging: true,
  });
  
  // Run enhanced loop with metrics
  const result = await v5ReactToCommit(
    stage,
    orchestrator,
    v5,
    'commit1',
    {
      maxBeats: 3,
      enableQuantumExploration: true,
      branchCount: 5,
    }
  );
  
  if (result.metrics) {
    console.log('Performance Report:');
    console.log('  Exploration:', result.metrics.explorationTimeMs + 'ms');
    console.log('  Validation:', result.metrics.validationTimeMs + 'ms');
    console.log('  Commit:', result.metrics.commitTimeMs + 'ms');
    console.log('  Total:', 
      result.metrics.explorationTimeMs + 
      result.metrics.validationTimeMs + 
      result.metrics.commitTimeMs + 'ms'
    );
  }
  
  // Get quantum field snapshot for diagnostics
  if (result.proposedBranches) {
    const snapshot = v5.getQuantumSnapshot();
    console.log('\nQuantum Field Status:');
    console.log('  Total states:', snapshot.stateCount);
    console.log('  Legal states:', snapshot.legalStates);
    console.log('  Illegal states:', snapshot.illegalStates);
    console.log('  Probability mass:', snapshot.totalProbabilityMass.toFixed(3));
    console.log('  Setups tracked:', snapshot.entanglement.totalSetups);
    console.log('  Resolved setups:', snapshot.entanglement.resolvedSetups);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Run all examples
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function runAllExamples(stage: Stage, orchestrator: Orchestrator) {
  console.log('━━━ Example 1: Simple Setup ━━━');
  await example1_simpleSetup(stage);
  
  console.log('\n━━━ Example 2: Enhanced Live Loop ━━━');
  await example2_enhancedLiveLoop(stage, orchestrator);
  
  console.log('\n━━━ Example 3: Quantum Exploration ━━━');
  await example3_quantumExploration(stage, orchestrator);
  
  console.log('\n━━━ Example 4: Temporal Queries ━━━');
  await example4_temporalQueries(stage);
  
  console.log('\n━━━ Example 5: Reality Layers ━━━');
  await example5_realityLayers(stage);
  
  console.log('\n━━━ Example 6: Migrate Legacy ━━━');
  await example6_migrateLegacy(stage);
  
  console.log('\n━━━ Example 7: Validation Only ━━━');
  await example7_validationOnly(stage);
  
  console.log('\n━━━ Example 8: Performance Monitoring ━━━');
  await example8_performanceMonitoring(stage, orchestrator);
}
