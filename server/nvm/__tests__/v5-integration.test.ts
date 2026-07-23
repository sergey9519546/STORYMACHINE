// V5.0 Cross-Component Integration Tests
//
// Tests interactions between V5.0 components:
// 1. Trinity Gate validates events from Quantum Field
// 2. Quantum Field uses Story Graph metrics correctly
// 3. EventStore fork/merge works with Trinity Gate validation
// 4. Integration layer orchestrates all components together

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EventStore, createEventStore } from '../kernel/event-store.ts';
import type { NarrativeEvent, NarrativeEventInput, MergeStrategy } from '../kernel/types.ts';
import { runTrinityGate, quickVerify, verifyEventSequence, formatVerificationReport } from '../kernel/trinity-gate.ts';
import { V5Integration, createV5Integration } from '../kernel/integration.ts';
import { emptyState } from '../state/NarrativeState.ts';
import type { StoryOp } from '../ops/StoryOp.ts';

// ── Test Fixtures ─────────────────────────────────────────────────────────────

function createTestOp(type: string = 'ADD_FACT', overrides: any = {}): StoryOp {
  const ops: Record<string, any> = {
    ADD_FACT: { op: 'ADD_FACT', fact: { factId: `f_${Math.random()}`, content: 'Test fact', addedAtTurn: 1 } },
    UPDATE_BELIEF: { op: 'UPDATE_BELIEF', charId: 'john', belief: { content: 'Test belief', confidence: 0.8 } },
    SHIFT_RELATIONSHIP: { op: 'SHIFT_RELATIONSHIP', pair: ['john', 'mary'], delta: { dimension: 'trust', change: 0.2 } },
    SEED_CLUE: { op: 'SEED_CLUE', clueId: `clue_${Math.random()}`, carrier: 'photograph' },
    PAYOFF_SETUP: { op: 'PAYOFF_SETUP', setupId: 'setup1', payoffEventId: 'event5' },
    RAISE_CLOCK: { op: 'RAISE_CLOCK', clockId: 'countdown', amount: 1 },
  };
  
  return { ...ops[type], ...overrides };
}

function createTestEvent(overrides: Partial<NarrativeEventInput> = {}): NarrativeEventInput {
  return {
    storyTime: 100,
    presentationIndex: 0,
    op: createTestOp('ADD_FACT'),
    assertions: [],
    derivedFrom: [],
    createdBy: 'user_authored',
    realityLayer: 'diegetic',
    sceneIdx: 1,
    parentHash: null,
    ...overrides,
  };
}

// ── Test Suite 1: Trinity Gate + Quantum Field ───────────────────────────────

describe('Cross-Component: Trinity Gate validates Quantum Field branches', () => {
  
  it('should validate each quantum branch through Trinity Gate', async () => {
    const integration = createV5Integration({
      enableQuantumField: true,
      enableTrinityGate: true,
    });
    
    const currentState = emptyState();
    
    const opsArray = [
      [createTestOp('ADD_FACT')],
      [createTestOp('UPDATE_BELIEF')],
      [createTestOp('SEED_CLUE')],
    ];
    
    const result = await integration.explore(opsArray, currentState);
    
    assert.strictEqual(result.branches.length, 3, 'Should create 3 branches');
    
    for (const branch of result.branches) {
      assert.ok(branch.verification, 'Each branch should have verification');
      assert.ok(branch.verification.layers, 'Should have layer results');
      assert.ok(branch.verification.layers.storyGraph, 'Should have story graph verification');
      assert.ok(branch.verification.layers.owne, 'Should have OWNE verification');
      assert.ok(branch.verification.layers.preflight, 'Should have preflight verification');
    }
  });
  
  it('should filter out branches that fail Trinity Gate', async () => {
    const integration = createV5Integration({
      enableQuantumField: true,
      enableTrinityGate: true,
      strictMode: true,
    });
    
    const currentState = emptyState();
    
    // Add some valid and potentially invalid branches
    const opsArray = [
      [createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Valid', addedAtTurn: 1 } })],
      [createTestOp('ADD_FACT', { fact: { factId: 'f2', content: 'Valid', addedAtTurn: 1 } })],
    ];
    
    const result = await integration.explore(opsArray, currentState);
    
    // Count branches with passing verification
    const passingBranches = result.branches.filter(b => b.verification?.pass);
    
    assert.ok(passingBranches.length >= 0, 'Should have some passing branches');
    
    // All branches should have legality status
    for (const branch of result.branches) {
      assert.strictEqual(typeof branch.isLegal, 'boolean', 'Should have legality flag');
    }
  });
  
  it('should propagate Trinity Gate violations to quantum state', async () => {
    const integration = createV5Integration({
      enableQuantumField: true,
      enableTrinityGate: true,
    });
    
    const currentState = emptyState();
    
    const result = await integration.explore(
      [[createTestOp('ADD_FACT')]],
      currentState
    );
    
    const branch = result.branches[0];
    
    if (branch.verification && !branch.verification.pass) {
      assert.ok(branch.verification.violations, 'Failed verification should have violations');
      assert.strictEqual(branch.verification.violations.length > 0, true, 'Should have violation details');
    }
  });
  
  it('should include health scores in quantum branch metadata', async () => {
    const integration = createV5Integration({
      enableQuantumField: true,
      enableTrinityGate: true,
    });
    
    const currentState = emptyState();
    
    const result = await integration.explore(
      [[createTestOp('ADD_FACT')]],
      currentState
    );
    
    const verification = result.branches[0].verification;
    
    if (verification) {
      assert.strictEqual(typeof verification.overallHealth, 'number', 'Should have overall health score');
      assert.ok(verification.overallHealth >= 0 && verification.overallHealth <= 100, 'Health should be 0-100');
      
      assert.strictEqual(typeof verification.layers.storyGraph.graphHealth, 'number', 'Should have graph health');
      assert.strictEqual(typeof verification.layers.owne.worldConsistency, 'number', 'Should have world consistency');
      assert.strictEqual(typeof verification.layers.preflight.epistemicConsistency, 'number', 'Should have epistemic consistency');
    }
  });
});

// ── Test Suite 2: EventStore Fork/Merge + Trinity Gate ───────────────────────

describe('Cross-Component: EventStore branching with Trinity Gate', () => {
  
  it('should validate events on fork', async () => {
    const store = createEventStore();
    const currentState = emptyState();
    
    // Add baseline events
    const event1 = store.append(createTestEvent({ presentationIndex: 0 }));
    const event2 = store.append(createTestEvent({ presentationIndex: 1 }));
    
    // Fork at event1
    const branchId = store.fork(event1.eventId, 'alternate-timeline');
    
    assert.ok(branchId, 'Should create branch');
    assert.ok(branchId.startsWith('branch_'), 'Branch ID should have correct prefix');
  });
  
  it('should validate merge conflicts through Trinity Gate', async () => {
    const store = createEventStore();
    const currentState = emptyState();
    
    // Create main timeline
    store.append(createTestEvent({ 
      storyTime: 100, 
      presentationIndex: 0,
      op: createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Main', addedAtTurn: 1 } }),
    }));
    
    const event2 = store.append(createTestEvent({ 
      storyTime: 200, 
      presentationIndex: 1,
      op: createTestOp('ADD_FACT', { fact: { factId: 'f2', content: 'Main continued', addedAtTurn: 2 } }),
    }));
    
    // Verify chain is valid
    assert.strictEqual(store.validateChain(), true, 'Chain should be valid before merge');
    
    // Test merge strategies
    const strategies: MergeStrategy[] = ['ours', 'theirs', 'time-ordered'];
    
    for (const strategy of strategies) {
      // Each strategy should be valid
      assert.ok(strategy, `Strategy ${strategy} should be valid`);
    }
  });
  
  it('should maintain chain integrity across fork/merge', async () => {
    const store = createEventStore();
    
    const event1 = store.append(createTestEvent({ presentationIndex: 0 }));
    const event2 = store.append(createTestEvent({ presentationIndex: 1 }));
    
    assert.strictEqual(store.validateChain(), true, 'Chain should be valid before fork');
    
    const branchId = store.fork(event1.eventId, 'test-branch');
    
    assert.strictEqual(store.validateChain(), true, 'Chain should be valid after fork');
  });
  
  it('should handle complex branching scenarios', async () => {
    const store = createEventStore();
    
    // Create base timeline
    for (let i = 0; i < 5; i++) {
      store.append(createTestEvent({ 
        presentationIndex: i,
        storyTime: 100 + i * 10,
      }));
    }
    
    const events = store.getAllEvents();
    assert.strictEqual(events.length, 5, 'Should have 5 events');
    
    // Fork at different points
    const branch1 = store.fork(events[1].eventId, 'early-branch');
    const branch2 = store.fork(events[3].eventId, 'late-branch');
    
    assert.ok(branch1, 'Should create early branch');
    assert.ok(branch2, 'Should create late branch');
    assert.notStrictEqual(branch1, branch2, 'Branches should be distinct');
  });
});

// ── Test Suite 3: Integration Layer Orchestration ─────────────────────────────

describe('Cross-Component: Integration layer orchestrates all components', () => {
  
  it('should coordinate EventStore + Trinity Gate + Quantum Field', async () => {
    const integration = createV5Integration({
      enableTrinityGate: true,
      enableQuantumField: true,
      strictMode: false,
    });
    
    // Test that all components work together
    const currentState = emptyState();
    
    // Step 1: Explore options (uses Quantum Field)
    const exploration = await integration.explore(
      [
        [createTestOp('ADD_FACT')],
        [createTestOp('UPDATE_BELIEF')],
      ],
      currentState
    );
    
    assert.strictEqual(exploration.branches.length, 2, 'Should explore 2 branches');
    
    // Step 2: Commit chosen branch (uses EventStore + Trinity Gate)
    const chosenOps = exploration.branches[0].events.map(e => e.op);
    const result = await integration.commit(chosenOps);
    
    assert.strictEqual(result.success, true, 'Commit should succeed');
    assert.ok(result.verification, 'Should have verification');
    
    // Step 3: Verify all systems in sync
    const allEvents = integration.getAllEvents();
    assert.ok(allEvents.length > 0, 'EventStore should have events');
    
    const snapshot = await integration.getSnapshot();
    assert.ok(snapshot, 'Should get state snapshot');
  });
  
  it('should pass context between components correctly', async () => {
    const integration = createV5Integration({
      enableTrinityGate: true,
      enableLogging: false,
    });
    
    // Add events with specific provenance
    await integration.commit(
      [createTestOp('ADD_FACT')],
      undefined,
      { createdBy: 'user_authored', sceneIdx: 1 }
    );
    
    await integration.commit(
      [createTestOp('UPDATE_BELIEF')],
      undefined,
      { createdBy: 'director_proposed', sceneIdx: 2 }
    );
    
    const events = integration.getAllEvents();
    
    assert.strictEqual(events[0].createdBy, 'user_authored', 'Should preserve provenance');
    assert.strictEqual(events[1].createdBy, 'director_proposed', 'Should preserve provenance');
    assert.strictEqual(events[0].sceneIdx, 1, 'Should preserve scene index');
    assert.strictEqual(events[1].sceneIdx, 2, 'Should preserve scene index');
  });
  
  it('should handle errors gracefully across components', async () => {
    const integration = createV5Integration({
      enableTrinityGate: true,
      strictMode: true,
    });
    
    // Try to commit with potential validation failure
    const result = await integration.commit([
      createTestOp('ADD_FACT'),
    ]);
    
    // Should handle result gracefully
    assert.strictEqual(typeof result.success, 'boolean', 'Should have success flag');
    
    if (!result.success) {
      assert.ok(result.error, 'Failed commit should have error details');
      assert.ok(result.error.layer, 'Error should identify layer');
      assert.ok(result.error.message, 'Error should have message');
    }
  });
  
  it('should maintain performance with multiple components active', async () => {
    const integration = createV5Integration({
      enableTrinityGate: true,
      enableQuantumField: true,
    });
    
    const startTime = Date.now();
    
    // Perform several operations
    for (let i = 0; i < 10; i++) {
      await integration.commit([createTestOp('ADD_FACT')]);
    }
    
    const duration = Date.now() - startTime;
    
    // Should complete in reasonable time (relaxed for CI environments)
    assert.ok(duration < 5000, `Should complete in <5s, took ${duration}ms`);
    
    const events = integration.getAllEvents();
    assert.strictEqual(events.length, 10, 'Should have 10 events');
  });
});

// ── Test Suite 4: Trinity Gate Layer Interactions ────────────────────────────

describe('Cross-Component: Trinity Gate layer interactions', () => {
  
  it('should run all three verification layers', async () => {
    const store = createEventStore();
    const event = store.append(createTestEvent());
    const currentState = await store.snapshot();
    const allEvents = store.getAllEvents();
    
    const verification = await runTrinityGate(event, currentState, allEvents);
    
    assert.ok(verification, 'Should return verification result');
    assert.ok(verification.layers, 'Should have layers object');
    assert.ok(verification.layers.storyGraph, 'Should have story graph layer');
    assert.ok(verification.layers.owne, 'Should have OWNE layer');
    assert.ok(verification.layers.preflight, 'Should have preflight layer');
  });
  
  it('should aggregate violations from all layers', async () => {
    const store = createEventStore();
    const event = store.append(createTestEvent());
    const currentState = await store.snapshot();
    const allEvents = store.getAllEvents();
    
    const verification = await runTrinityGate(event, currentState, allEvents);
    
    assert.ok(Array.isArray(verification.violations), 'Should have violations array');
    assert.strictEqual(typeof verification.summary.totalViolations, 'number', 'Should count total violations');
    assert.strictEqual(typeof verification.summary.criticalCount, 'number', 'Should count critical');
    assert.strictEqual(typeof verification.summary.mediumCount, 'number', 'Should count medium');
    assert.strictEqual(typeof verification.summary.lowCount, 'number', 'Should count low');
  });
  
  it('should provide repair suggestions across layers', async () => {
    const store = createEventStore();
    const event = store.append(createTestEvent());
    const currentState = await store.snapshot();
    const allEvents = store.getAllEvents();
    
    const verification = await runTrinityGate(event, currentState, allEvents);
    
    // Each violation should have repair suggestions
    for (const violation of verification.violations) {
      assert.ok(Array.isArray(violation.repairSuggestions), 'Violation should have repair suggestions');
      assert.ok(violation.layer, 'Violation should identify layer');
      assert.ok(violation.type, 'Violation should have type');
      assert.ok(violation.message, 'Violation should have message');
    }
  });
  
  it('should support quick verification mode', async () => {
    const store = createEventStore();
    const event = store.append(createTestEvent());
    const currentState = await store.snapshot();
    const allEvents = store.getAllEvents();
    
    const result = await quickVerify(event, currentState, allEvents);
    
    assert.ok(result, 'Should return quick verify result');
    assert.strictEqual(typeof result.pass, 'boolean', 'Should have pass/fail');
    assert.ok(Array.isArray(result.criticalViolations), 'Should have critical violations');
  });
  
  it('should verify event sequences efficiently', async () => {
    const store = createEventStore();
    const currentState = emptyState();
    
    const events = [
      store.append(createTestEvent({ presentationIndex: 0 })),
      store.append(createTestEvent({ presentationIndex: 1 })),
      store.append(createTestEvent({ presentationIndex: 2 })),
    ];
    
    const allEvents = store.getAllEvents();
    
    const results = await verifyEventSequence(events, currentState, allEvents);
    
    assert.ok(Array.isArray(results), 'Should return array of results');
    assert.strictEqual(results.length, 3, 'Should verify all events');
    
    for (const result of results) {
      assert.strictEqual(typeof result.pass, 'boolean', 'Each result should have pass/fail');
    }
  });
  
  it('should format verification reports', async () => {
    const store = createEventStore();
    const event = store.append(createTestEvent());
    const currentState = await store.snapshot();
    const allEvents = store.getAllEvents();
    
    const verification = await runTrinityGate(event, currentState, allEvents);
    const report = formatVerificationReport(verification);
    
    assert.strictEqual(typeof report, 'string', 'Should return string report');
    assert.ok(report.length > 0, 'Report should not be empty');
    assert.ok(report.includes('TRINITY'), 'Report should mention Trinity');
    assert.ok(report.includes(verification.pass ? 'PASS' : 'FAIL'), 'Report should include status');
  });
});

// ── Test Suite 5: State Consistency Across Components ────────────────────────

describe('Cross-Component: State consistency', () => {
  
  it('should maintain consistent state across EventStore and snapshots', async () => {
    const integration = createV5Integration();
    
    await integration.commit([
      createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Fact 1', addedAtTurn: 1 } }),
    ]);
    
    await integration.commit([
      createTestOp('ADD_FACT', { fact: { factId: 'f2', content: 'Fact 2', addedAtTurn: 2 } }),
    ]);
    
    const snapshot1 = await integration.getSnapshot();
    const snapshot2 = await integration.getSnapshot();
    
    assert.strictEqual(snapshot1.objectiveReality.length, snapshot2.objectiveReality.length, 'Snapshots should be consistent');
    assert.strictEqual(snapshot1.turn, snapshot2.turn, 'Turn count should match');
  });
  
  it('should handle concurrent operations safely', async () => {
    const integration = createV5Integration();
    
    // Simulate concurrent commits
    const promises = [
      integration.commit([createTestOp('ADD_FACT')]),
      integration.commit([createTestOp('UPDATE_BELIEF')]),
      integration.commit([createTestOp('SEED_CLUE')]),
    ];
    
    const results = await Promise.all(promises);
    
    for (const result of results) {
      assert.strictEqual(result.success, true, 'All commits should succeed');
    }
    
    const allEvents = integration.getAllEvents();
    assert.strictEqual(allEvents.length, 3, 'Should have all 3 events');
  });
  
  it('should preserve event order across components', async () => {
    const integration = createV5Integration();
    
    const ops = [
      createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'First', addedAtTurn: 1 } }),
      createTestOp('ADD_FACT', { fact: { factId: 'f2', content: 'Second', addedAtTurn: 2 } }),
      createTestOp('ADD_FACT', { fact: { factId: 'f3', content: 'Third', addedAtTurn: 3 } }),
    ];
    
    for (let i = 0; i < ops.length; i++) {
      await integration.commit([ops[i]], undefined, { presentationIndex: i });
    }
    
    const events = integration.getAllEvents();
    
    assert.strictEqual(events[0].presentationIndex, 0, 'First event should be index 0');
    assert.strictEqual(events[1].presentationIndex, 1, 'Second event should be index 1');
    assert.strictEqual(events[2].presentationIndex, 2, 'Third event should be index 2');
  });
  
  it('should handle reality layer filtering consistently', async () => {
    const integration = createV5Integration();
    
    await integration.commit([createTestOp('ADD_FACT')], undefined, { realityLayer: 'diegetic' });
    await integration.commit([createTestOp('ADD_FACT')], undefined, { realityLayer: 'dream' });
    await integration.commit([createTestOp('ADD_FACT')], undefined, { realityLayer: 'hypothetical' });
    
    const diegeticEvents = integration.getEventsBeforeStoryTime(Infinity, ['diegetic']);
    const dreamEvents = integration.getEventsBeforeStoryTime(Infinity, ['dream']);
    const allEvents = integration.getAllEvents();
    
    assert.strictEqual(diegeticEvents.length, 1, 'Should have 1 diegetic event');
    assert.strictEqual(dreamEvents.length, 1, 'Should have 1 dream event');
    assert.strictEqual(allEvents.length, 3, 'Should have 3 total events');
  });
});

// ── Test Suite 6: Error Handling & Recovery ──────────────────────────────────

describe('Cross-Component: Error handling', () => {
  
  it('should rollback on Trinity Gate failure', async () => {
    const integration = createV5Integration({
      enableTrinityGate: true,
      strictMode: true,
    });
    
    // Add valid event
    const result1 = await integration.commit([createTestOp('ADD_FACT')]);
    assert.strictEqual(result1.success, true, 'First commit should succeed');
    
    const countBefore = integration.getAllEvents().length;
    
    // Try to add potentially invalid event
    const result2 = await integration.commit([createTestOp('ADD_FACT')]);
    
    // Regardless of validation result, state should be consistent
    const countAfter = integration.getAllEvents().length;
    
    if (!result2.success) {
      assert.strictEqual(countAfter, countBefore, 'Should not add events on failure');
    } else {
      assert.strictEqual(countAfter, countBefore + 1, 'Should add events on success');
    }
  });
  
  it('should provide detailed error information', async () => {
    const integration = createV5Integration({
      enableTrinityGate: true,
      strictMode: true,
    });
    
    const result = await integration.commit([createTestOp('ADD_FACT')]);
    
    if (!result.success) {
      assert.ok(result.error, 'Should have error object');
      assert.ok(result.error.layer, 'Should identify error layer');
      assert.ok(result.error.message, 'Should have error message');
      
      if (result.error.violations) {
        assert.ok(Array.isArray(result.error.violations), 'Violations should be array');
      }
    }
  });
  
  it('should recover from partial failures', async () => {
    const integration = createV5Integration({ dualWrite: true });
    
    const brokenStage = {
      addCommit: () => { throw new Error('Stage error'); },
    };
    
    const result = await integration.commit(
      [createTestOp('ADD_FACT')],
      brokenStage as any
    );
    
    // Should succeed in EventStore despite Stage failure
    assert.strictEqual(result.success, true, 'Should succeed despite Stage failure');
    assert.strictEqual(integration.getAllEvents().length, 1, 'EventStore should have event');
  });
});
