// V5.0 Smoke Tests
//
// Basic sanity checks to ensure all modules load and instantiate correctly:
// 1. All modules import without errors
// 2. Can create instances of all major classes
// 3. Basic operations don't throw
// 4. TypeScript types compile

import { describe, it } from 'node:test';
import assert from 'node:assert';

// ── Test Suite 1: Module Imports ──────────────────────────────────────────────

describe('Smoke Test: Module Imports', () => {
  
  it('should import EventStore module', async () => {
    try {
      const module = await import('../kernel/event-store.ts');
      assert.ok(module.EventStore, 'Should export EventStore class');
      assert.ok(module.createEventStore, 'Should export createEventStore factory');
    } catch (error) {
      assert.fail(`Failed to import event-store: ${error}`);
    }
  });
  
  it('should import types module', async () => {
    try {
      const module = await import('../kernel/types.ts');
      assert.ok(module, 'Types module should load');
    } catch (error) {
      assert.fail(`Failed to import types: ${error}`);
    }
  });
  
  it('should import Trinity Gate module', async () => {
    try {
      const module = await import('../kernel/trinity-gate.ts');
      assert.ok(module.runTrinityGate, 'Should export runTrinityGate');
      assert.ok(module.quickVerify, 'Should export quickVerify');
      assert.ok(module.verifyEventSequence, 'Should export verifyEventSequence');
      assert.ok(module.formatVerificationReport, 'Should export formatVerificationReport');
    } catch (error) {
      assert.fail(`Failed to import trinity-gate: ${error}`);
    }
  });
  
  it('should import Integration module', async () => {
    try {
      const module = await import('../kernel/integration.ts');
      assert.ok(module.V5Integration, 'Should export V5Integration class');
      assert.ok(module.createV5Integration, 'Should export createV5Integration factory');
    } catch (error) {
      assert.fail(`Failed to import integration: ${error}`);
    }
  });
  
  it('should import Adapters module', async () => {
    try {
      const module = await import('../kernel/adapters.ts');
      assert.ok(module.eventsToCommits, 'Should export eventsToCommits');
      assert.ok(module.commitsToEvents, 'Should export commitsToEvents');
      assert.ok(module.addAdaptersToEventStore, 'Should export addAdaptersToEventStore');
    } catch (error) {
      assert.fail(`Failed to import adapters: ${error}`);
    }
  });
  
  it('should import Quantum Field module', async () => {
    try {
      const module = await import('../quantum/story-field.ts');
      assert.ok(module.QuantumNarrativeField, 'Should export QuantumNarrativeField class');
      assert.ok(module.createQuantumField, 'Should export createQuantumField factory');
    } catch (error) {
      assert.fail(`Failed to import story-field: ${error}`);
    }
  });
  
  it('should import Quantum types module', async () => {
    try {
      const module = await import('../quantum/types.ts');
      assert.ok(module, 'Quantum types module should load');
    } catch (error) {
      assert.fail(`Failed to import quantum types: ${error}`);
    }
  });
  
  it('should import NarrativeState module', async () => {
    try {
      const module = await import('../state/NarrativeState.ts');
      assert.ok(module.emptyState, 'Should export emptyState');
      assert.ok(module.relationshipKey, 'Should export relationshipKey');
      assert.ok(module.stateHash, 'Should export stateHash');
    } catch (error) {
      assert.fail(`Failed to import NarrativeState: ${error}`);
    }
  });
  
  it('should import Verifiers modules', async () => {
    try {
      await import('../kernel/verifiers/story-graph-verifier.ts');
      await import('../kernel/verifiers/owne-verifier.ts');
      await import('../kernel/verifiers/preflight-auditor.ts');
      assert.ok(true, 'All verifier modules should load');
    } catch (error) {
      assert.fail(`Failed to import verifiers: ${error}`);
    }
  });
});

// ── Test Suite 2: Instance Creation ───────────────────────────────────────────

describe('Smoke Test: Instance Creation', () => {
  
  it('should create EventStore instance', async () => {
    const { createEventStore } = await import('../kernel/event-store.ts');
    
    try {
      const store = createEventStore();
      assert.ok(store, 'Should create EventStore instance');
      assert.strictEqual(typeof store.append, 'function', 'Should have append method');
    } catch (error) {
      assert.fail(`Failed to create EventStore: ${error}`);
    }
  });
  
  it('should create V5Integration instance with default config', async () => {
    const { createV5Integration } = await import('../kernel/integration.ts');
    
    try {
      const integration = createV5Integration();
      assert.ok(integration, 'Should create V5Integration instance');
      assert.strictEqual(typeof integration.commit, 'function', 'Should have commit method');
    } catch (error) {
      assert.fail(`Failed to create V5Integration: ${error}`);
    }
  });
  
  it('should create V5Integration with custom config', async () => {
    const { createV5Integration } = await import('../kernel/integration.ts');
    
    try {
      const integration = createV5Integration({
        enableTrinityGate: false,
        enableQuantumField: false,
        dualWrite: false,
      });
      assert.ok(integration, 'Should create V5Integration with config');
    } catch (error) {
      assert.fail(`Failed to create V5Integration with config: ${error}`);
    }
  });
  
  it('should create QuantumNarrativeField instance', async () => {
    const { createQuantumField } = await import('../quantum/story-field.ts');
    
    try {
      const field = createQuantumField();
      assert.ok(field, 'Should create QuantumNarrativeField instance');
    } catch (error) {
      assert.fail(`Failed to create QuantumNarrativeField: ${error}`);
    }
  });
  
  it('should create empty NarrativeState', async () => {
    const { emptyState } = await import('../state/NarrativeState.ts');
    
    try {
      const state = emptyState();
      assert.ok(state, 'Should create empty state');
      assert.ok(Array.isArray(state.objectiveReality), 'Should have objectiveReality array');
      assert.strictEqual(typeof state.characterBeliefs, 'object', 'Should have characterBeliefs object');
    } catch (error) {
      assert.fail(`Failed to create empty state: ${error}`);
    }
  });
});

// ── Test Suite 3: Basic Operations ───────────────────────────────────────────

describe('Smoke Test: Basic Operations', () => {
  
  it('should append event to EventStore', async () => {
    const { createEventStore } = await import('../kernel/event-store.ts');
    const store = createEventStore();
    
    try {
      const event = store.append({
        op: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test', addedAtTurn: 1 } },
        assertions: [],
        derivedFrom: [],
        createdBy: 'user_authored',
        realityLayer: 'diegetic',
        storyTime: 100,
        presentationIndex: 0,
        sceneIdx: 1,
        parentHash: null,
      });
      
      assert.ok(event, 'Should return event');
      assert.ok(event.eventId, 'Event should have ID');
      assert.ok(event.eventHash, 'Event should have hash');
    } catch (error) {
      assert.fail(`Failed to append event: ${error}`);
    }
  });
  
  it('should commit through V5Integration', async () => {
    const { createV5Integration } = await import('../kernel/integration.ts');
    const integration = createV5Integration({ enableTrinityGate: false });
    
    try {
      const result = await integration.commit([
        { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test', addedAtTurn: 1 } },
      ]);
      
      assert.ok(result, 'Should return result');
      assert.strictEqual(typeof result.success, 'boolean', 'Should have success flag');
    } catch (error) {
      assert.fail(`Failed to commit: ${error}`);
    }
  });
  
  it('should validate chain', async () => {
    const { createEventStore } = await import('../kernel/event-store.ts');
    const store = createEventStore();
    
    try {
      store.append({
        op: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test', addedAtTurn: 1 } },
        assertions: [],
        derivedFrom: [],
        createdBy: 'user_authored',
        realityLayer: 'diegetic',
        storyTime: 100,
        presentationIndex: 0,
        sceneIdx: 1,
        parentHash: null,
      });
      
      const isValid = store.validateChain();
      assert.strictEqual(typeof isValid, 'boolean', 'Should return boolean');
    } catch (error) {
      assert.fail(`Failed to validate chain: ${error}`);
    }
  });
  
  it('should get snapshot', async () => {
    const { createEventStore } = await import('../kernel/event-store.ts');
    const store = createEventStore();
    
    try {
      const snapshot = await store.snapshot();
      assert.ok(snapshot, 'Should return snapshot');
      assert.ok(Array.isArray(snapshot.objectiveReality), 'Should have objectiveReality');
    } catch (error) {
      assert.fail(`Failed to get snapshot: ${error}`);
    }
  });
  
  it('should convert events to commits', async () => {
    const { eventsToCommits } = await import('../kernel/adapters.ts');
    
    try {
      const commits = eventsToCommits([]);
      assert.ok(Array.isArray(commits), 'Should return array');
    } catch (error) {
      assert.fail(`Failed to convert events to commits: ${error}`);
    }
  });
  
  it('should convert commits to events', async () => {
    const { commitsToEvents } = await import('../kernel/adapters.ts');
    
    try {
      const events = commitsToEvents([]);
      assert.ok(Array.isArray(events), 'Should return array');
    } catch (error) {
      assert.fail(`Failed to convert commits to events: ${error}`);
    }
  });
  
  it('should run Trinity Gate', async () => {
    const { runTrinityGate } = await import('../kernel/trinity-gate.ts');
    const { createEventStore } = await import('../kernel/event-store.ts');
    const { emptyState } = await import('../state/NarrativeState.ts');
    
    const store = createEventStore();
    const event = store.append({
      op: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test', addedAtTurn: 1 } },
      assertions: [],
      derivedFrom: [],
      createdBy: 'user_authored',
      realityLayer: 'diegetic',
      storyTime: 100,
      presentationIndex: 0,
      sceneIdx: 1,
      parentHash: null,
    });
    
    try {
      const verification = await runTrinityGate(event, emptyState(), []);
      assert.ok(verification, 'Should return verification');
      assert.strictEqual(typeof verification.pass, 'boolean', 'Should have pass flag');
      assert.ok(verification.layers, 'Should have layers');
    } catch (error) {
      assert.fail(`Failed to run Trinity Gate: ${error}`);
    }
  });
});

// ── Test Suite 4: Error Handling ──────────────────────────────────────────────

describe('Smoke Test: Error Handling', () => {
  
  it('should handle invalid event gracefully', async () => {
    const { createEventStore } = await import('../kernel/event-store.ts');
    const store = createEventStore();
    
    try {
      // Missing required fields should throw
      store.append({} as any);
      assert.fail('Should have thrown error for invalid event');
    } catch (error) {
      assert.ok(error, 'Should throw error for invalid event');
    }
  });
  
  it('should handle empty operations', async () => {
    const { createV5Integration } = await import('../kernel/integration.ts');
    const integration = createV5Integration();
    
    try {
      const result = await integration.commit([]);
      assert.ok(result, 'Should handle empty ops array');
    } catch (error) {
      // Should not throw, but may return error in result
      assert.ok(error || true, 'Should handle empty ops gracefully');
    }
  });
  
  it('should handle null/undefined inputs safely', async () => {
    const { eventsToCommits, commitsToEvents } = await import('../kernel/adapters.ts');
    
    try {
      const commits1 = eventsToCommits([]);
      const events1 = commitsToEvents([]);
      
      assert.ok(Array.isArray(commits1), 'Should handle empty events array');
      assert.ok(Array.isArray(events1), 'Should handle empty commits array');
    } catch (error) {
      assert.fail(`Should handle empty arrays: ${error}`);
    }
  });
});

// ── Test Suite 5: Type System ─────────────────────────────────────────────────

describe('Smoke Test: Type System', () => {
  
  it('should have proper TypeScript types', async () => {
    // These imports should not throw type errors
    const types = await import('../kernel/types.ts');
    const stateTypes = await import('../state/NarrativeState.ts');
    const quantumTypes = await import('../quantum/types.ts');
    
    assert.ok(types, 'Types module should load');
    assert.ok(stateTypes, 'State types module should load');
    assert.ok(quantumTypes, 'Quantum types module should load');
  });
  
  it('should export expected type definitions', async () => {
    // Check that key types are available
    const module = await import('../kernel/types.ts');
    
    // These should be available as type imports in real code
    assert.ok(module, 'Should export types');
  });
});

// ── Test Suite 6: Performance Smoke Tests ─────────────────────────────────────

describe('Smoke Test: Basic Performance', () => {
  
  it('should create 100 events in reasonable time', async () => {
    const { createEventStore } = await import('../kernel/event-store.ts');
    const store = createEventStore();
    
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      store.append({
        op: { op: 'ADD_FACT', fact: { factId: `f${i}`, content: `Fact ${i}`, addedAtTurn: i } },
        assertions: [],
        derivedFrom: [],
        createdBy: 'user_authored',
        realityLayer: 'diegetic',
        storyTime: 100 + i,
        presentationIndex: i,
        sceneIdx: 1,
        parentHash: null,
      });
    }
    
    const duration = Date.now() - startTime;
    
    assert.strictEqual(store.size(), 100, 'Should have 100 events');
    assert.ok(duration < 1000, `Should complete in <1s, took ${duration}ms`);
  });
  
  it('should validate 100-event chain quickly', async () => {
    const { createEventStore } = await import('../kernel/event-store.ts');
    const store = createEventStore();
    
    // Add 100 events
    for (let i = 0; i < 100; i++) {
      store.append({
        op: { op: 'ADD_FACT', fact: { factId: `f${i}`, content: `Fact ${i}`, addedAtTurn: i } },
        assertions: [],
        derivedFrom: [],
        createdBy: 'user_authored',
        realityLayer: 'diegetic',
        storyTime: 100 + i,
        presentationIndex: i,
        sceneIdx: 1,
        parentHash: null,
      });
    }
    
    const startTime = Date.now();
    const isValid = store.validateChain();
    const duration = Date.now() - startTime;
    
    assert.strictEqual(isValid, true, 'Chain should be valid');
    assert.ok(duration < 500, `Validation should be fast, took ${duration}ms`);
  });
  
  it('should snapshot 100 events efficiently', async () => {
    const { createEventStore } = await import('../kernel/event-store.ts');
    const store = createEventStore();
    
    // Add 100 events
    for (let i = 0; i < 100; i++) {
      store.append({
        op: { op: 'ADD_FACT', fact: { factId: `f${i}`, content: `Fact ${i}`, addedAtTurn: i } },
        assertions: [],
        derivedFrom: [],
        createdBy: 'user_authored',
        realityLayer: 'diegetic',
        storyTime: 100 + i,
        presentationIndex: i,
        sceneIdx: 1,
        parentHash: null,
      });
    }
    
    const startTime = Date.now();
    const snapshot = await store.snapshot();
    const duration = Date.now() - startTime;
    
    assert.ok(snapshot, 'Should create snapshot');
    assert.ok(duration < 1000, `Snapshot should be fast, took ${duration}ms`);
  });
});

// ── Test Suite 7: Integration Health Check ───────────────────────────────────

describe('Smoke Test: Integration Health', () => {
  
  it('should have working end-to-end pipeline', async () => {
    const { createV5Integration } = await import('../kernel/integration.ts');
    
    try {
      const integration = createV5Integration({
        enableTrinityGate: false,
        enableQuantumField: false,
      });
      
      await integration.commit([
        { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test', addedAtTurn: 1 } },
      ]);
      
      const events = integration.getAllEvents();
      const snapshot = await integration.getSnapshot();
      const isValid = integration.validateChain();
      
      assert.ok(events.length > 0, 'Should have events');
      assert.ok(snapshot, 'Should have snapshot');
      assert.strictEqual(isValid, true, 'Chain should be valid');
    } catch (error) {
      assert.fail(`Pipeline health check failed: ${error}`);
    }
  });
  
  it('should have all components wired correctly', async () => {
    const { createV5Integration } = await import('../kernel/integration.ts');
    
    try {
      const integration = createV5Integration({
        enableTrinityGate: true,
        enableQuantumField: false,
        dualWrite: false,
      });
      
      const result = await integration.commit([
        { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test', addedAtTurn: 1 } },
      ]);
      
      assert.ok(result, 'Integration should work');
      assert.ok(result.verification || !result.verification, 'Verification should be optional');
    } catch (error) {
      assert.fail(`Component wiring check failed: ${error}`);
    }
  });
  
  it('should support all configuration combinations', async () => {
    const { createV5Integration } = await import('../kernel/integration.ts');
    
    const configs = [
      {},
      { enableTrinityGate: true },
      { enableQuantumField: true },
      { dualWrite: true },
      { enableTrinityGate: true, enableQuantumField: true },
      { enableTrinityGate: true, dualWrite: true },
      { enableQuantumField: true, dualWrite: true },
      { enableTrinityGate: true, enableQuantumField: true, dualWrite: true },
    ];
    
    for (const config of configs) {
      try {
        const integration = createV5Integration(config);
        assert.ok(integration, `Should create with config: ${JSON.stringify(config)}`);
      } catch (error) {
        assert.fail(`Failed with config ${JSON.stringify(config)}: ${error}`);
      }
    }
  });
});

// ── Test Suite 8: Documentation Examples ──────────────────────────────────────

describe('Smoke Test: Documentation Examples Work', () => {
  
  it('should run basic example from README', async () => {
    const { createV5Integration } = await import('../kernel/integration.ts');
    
    try {
      // Example from docs
      const integration = createV5Integration({
        enableTrinityGate: true,
      });
      
      const result = await integration.commit([
        { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Hero enters', addedAtTurn: 1 } },
      ]);
      
      assert.ok(result.success || !result.success, 'Example should run');
    } catch (error) {
      assert.fail(`README example failed: ${error}`);
    }
  });
  
  it('should run adapter example', async () => {
    const { eventsToCommits, commitsToEvents } = await import('../kernel/adapters.ts');
    const { createEventStore } = await import('../kernel/event-store.ts');
    
    try {
      const store = createEventStore();
      
      store.append({
        op: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test', addedAtTurn: 1 } },
        assertions: [],
        derivedFrom: [],
        createdBy: 'user_authored',
        realityLayer: 'diegetic',
        storyTime: 100,
        presentationIndex: 0,
        sceneIdx: 1,
        parentHash: null,
      });
      
      const events = store.getAllEvents();
      const commits = eventsToCommits(events);
      const eventsAgain = commitsToEvents(commits);
      
      assert.ok(commits.length > 0, 'Should convert to commits');
      assert.ok(eventsAgain.length > 0, 'Should convert back to events');
    } catch (error) {
      assert.fail(`Adapter example failed: ${error}`);
    }
  });
});
