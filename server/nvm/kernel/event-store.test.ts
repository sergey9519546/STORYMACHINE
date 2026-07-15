// Event-Sourced Narrative Kernel — Event Store Tests
//
// Comprehensive test suite covering all event store operations:
// - Basic operations (append, immutability, hash chains)
// - Temporal queries (story-time and presentation-time filtering)
// - Snapshot/state reduction (all 14 StoryOp types)
// - Timeline branching (fork/merge)
// - Cryptographic integrity
// - Edge cases

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { EventStore, createEventStore } from './event-store.ts';
import type { NarrativeEvent, NarrativeEventInput } from './types.ts';

// ── Test Fixtures ─────────────────────────────────────────────────────────────

/**
 * Create a minimal valid event input
 */
function createTestEvent(overrides: Partial<NarrativeEventInput> = {}): NarrativeEventInput {
  return {
    storyTime: 100,
    presentationIndex: 0,
    op: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test fact', addedAtTurn: 1 } },
    assertions: [],
    derivedFrom: [],
    createdBy: 'user_authored',
    realityLayer: 'diegetic',
    sceneIdx: 1,
    ...overrides,
  };
}

/**
 * Create all 14 StoryOp types for comprehensive testing
 */
function createAllStoryOps() {
  return [
    { op: 'ADD_FACT', fact: { factId: 'f1', content: 'John enters', addedAtTurn: 1 } },
    { op: 'EXPIRE_FACT', factId: 'f1' },
    { op: 'UPDATE_BELIEF', charId: 'john', belief: { content: 'Mary is trustworthy', confidence: 0.8 } },
    { op: 'SHIFT_RELATIONSHIP', pair: ['john', 'mary'], delta: { dimension: 'trust', change: 0.2 } },
    { op: 'APPRAISE_EMOTION', charId: 'john', emotion: { type: 'fear', intensity: 0.7 } },
    { op: 'SEED_CLUE', clueId: 'clue1', carrier: 'photograph' },
    { op: 'PAYOFF_SETUP', setupId: 'setup1', payoffEventId: 'event5' },
    { op: 'RAISE_CLOCK', clockId: 'doomsday', amount: 1 },
    { op: 'ADVANCE_THEME_ARGUMENT', claimId: 'power-corrupts', move: 'support' },
    { op: 'ADVANCE_OBJECT_ARC', objectId: 'ring', toState: 'corrupted' },
    { op: 'TRIGGER_RULE', mechanismId: 'karma', ruleId: 'rule1' },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 0.1, curiosity: 0.2, investment: 0.05 } },
    { op: 'RECORD_VISUAL_FACT', sceneId: 'scene1', fact: 'dark room with one window' },
    { op: 'RECORD_SONIC_FACT', sceneId: 'scene1', fact: 'distant footsteps' },
  ];
}

// ── 1. Basic Operations ───────────────────────────────────────────────────────

describe('EventStore - Basic Operations', () => {
  it('append() creates events with correct hashes', () => {
    const store = createEventStore();
    const input = createTestEvent();
    
    const event = store.append(input);
    
    assert.ok(event.eventId, 'Event should have ID');
    assert.ok(event.eventHash, 'Event should have hash');
    assert.strictEqual(event.eventHash.length, 64, 'SHA-256 hash should be 64 hex chars');
    assert.strictEqual(event.parentHash, null, 'First event should have null parent');
    assert.strictEqual(event.storyTime, 100);
    assert.strictEqual(event.presentationIndex, 0);
  });

  it('Events maintain referential integrity', () => {
    const store = createEventStore();
    const event = store.append(createTestEvent());
    
    const originalHash = event.eventHash;
    const originalId = event.eventId;
    
    // Retrieve the same event
    const retrieved = store.getAllEvents()[0];
    
    assert.strictEqual(retrieved.eventId, originalId, 'Should retrieve same event');
    assert.strictEqual(retrieved.eventHash, originalHash, 'Hash should match');
    assert.strictEqual(retrieved.eventHash.length, 64, 'Hash integrity maintained');
  });

  it('Parent hash chain is correct', () => {
    const store = createEventStore();
    
    const event1 = store.append(createTestEvent({ presentationIndex: 0 }));
    const event2 = store.append(createTestEvent({ presentationIndex: 1 }));
    const event3 = store.append(createTestEvent({ presentationIndex: 2 }));
    
    assert.strictEqual(event1.parentHash, null, 'First event has no parent');
    assert.strictEqual(event2.parentHash, event1.eventHash, 'Second event references first');
    assert.strictEqual(event3.parentHash, event2.eventHash, 'Third event references second');
  });

  it('Hash computation is deterministic', () => {
    const store1 = createEventStore();
    const store2 = createEventStore();
    
    const input = createTestEvent({ eventId: 'fixed-id' });
    
    const event1 = store1.append(input);
    const event2 = store2.append(input);
    
    assert.strictEqual(event1.eventHash, event2.eventHash, 'Same input should produce same hash');
  });

  it('Validates required fields', () => {
    const store = createEventStore();
    
    // Missing op
    assert.throws(() => {
      store.append({
        storyTime: 100,
        presentationIndex: 0,
        op: null as any,
        assertions: [],
        derivedFrom: [],
        createdBy: 'user_authored',
        realityLayer: 'diegetic',
        sceneIdx: 1,
      });
    }, 'Should throw on missing op');
    
    // Invalid storyTime
    assert.throws(() => {
      store.append(createTestEvent({ storyTime: 'invalid' as any }));
    }, 'Should throw on invalid storyTime');
  });
});

// ── 2. Temporal Queries ───────────────────────────────────────────────────────

describe('EventStore - Temporal Queries', () => {
  it('getEventsBeforeStoryTime() filters correctly', () => {
    const store = createEventStore();
    
    store.append(createTestEvent({ storyTime: 100, presentationIndex: 0 }));
    store.append(createTestEvent({ storyTime: 200, presentationIndex: 1 }));
    store.append(createTestEvent({ storyTime: 300, presentationIndex: 2 }));
    store.append(createTestEvent({ storyTime: 400, presentationIndex: 3 }));
    
    const before250 = store.getEventsBeforeStoryTime(250);
    
    assert.strictEqual(before250.length, 2, 'Should return 2 events');
    assert.strictEqual(before250[0].storyTime, 100);
    assert.strictEqual(before250[1].storyTime, 200);
  });

  it('getEventsBeforePresentationIndex() filters correctly', () => {
    const store = createEventStore();
    
    store.append(createTestEvent({ presentationIndex: 0 }));
    store.append(createTestEvent({ presentationIndex: 1 }));
    store.append(createTestEvent({ presentationIndex: 2 }));
    store.append(createTestEvent({ presentationIndex: 3 }));
    
    const before2 = store.getEventsBeforePresentationIndex(2);
    
    assert.strictEqual(before2.length, 3, 'Should return events 0, 1, 2');
    assert.strictEqual(before2[0].presentationIndex, 0);
    assert.strictEqual(before2[1].presentationIndex, 1);
    assert.strictEqual(before2[2].presentationIndex, 2);
  });

  it('Handles flashbacks (presentationIndex > storyTime relationship)', () => {
    const store = createEventStore();
    
    // Scene presented later but happens earlier in story
    store.append(createTestEvent({ storyTime: 300, presentationIndex: 0 })); // Present
    store.append(createTestEvent({ storyTime: 100, presentationIndex: 1 })); // Flashback
    store.append(createTestEvent({ storyTime: 400, presentationIndex: 2 })); // Back to present
    
    // Query by story time
    const storyEvents = store.getEventsBeforeStoryTime(250);
    assert.strictEqual(storyEvents.length, 1, 'Only flashback should be before storyTime 250');
    assert.strictEqual(storyEvents[0].storyTime, 100);
    
    // Query by presentation order
    const presentationEvents = store.getEventsBeforePresentationIndex(1);
    assert.strictEqual(presentationEvents.length, 2, 'First two presented events');
    assert.strictEqual(presentationEvents[0].presentationIndex, 0);
    assert.strictEqual(presentationEvents[1].presentationIndex, 1);
  });

  it('Reality layer filtering works', () => {
    const store = createEventStore();
    
    store.append(createTestEvent({ realityLayer: 'diegetic', presentationIndex: 0 }));
    store.append(createTestEvent({ realityLayer: 'dream', presentationIndex: 1 }));
    store.append(createTestEvent({ realityLayer: 'memory', presentationIndex: 2 }));
    store.append(createTestEvent({ realityLayer: 'diegetic', presentationIndex: 3 }));
    
    const diegeticOnly = store.getEventsBeforeStoryTime(1000, ['diegetic']);
    assert.strictEqual(diegeticOnly.length, 2, 'Should return only diegetic events');
    
    const dreamAndMemory = store.getEventsBeforeStoryTime(1000, ['dream', 'memory']);
    assert.strictEqual(dreamAndMemory.length, 2, 'Should return dream and memory events');
  });

  it('getEventsByRealityLayer() works correctly', () => {
    const store = createEventStore();
    
    store.append(createTestEvent({ realityLayer: 'diegetic' }));
    store.append(createTestEvent({ realityLayer: 'dream' }));
    store.append(createTestEvent({ realityLayer: 'diegetic' }));
    
    const dreams = store.getEventsByRealityLayer('dream');
    assert.strictEqual(dreams.length, 1);
    assert.strictEqual(dreams[0].realityLayer, 'dream');
  });
});

// ── 3. Snapshot/State Reduction ───────────────────────────────────────────────

describe('EventStore - Snapshot/State Reduction', () => {
  it('snapshot() produces valid NarrativeState', async () => {
    const store = createEventStore();
    
    store.append(createTestEvent({
      op: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test', addedAtTurn: 1 } }
    }));
    
    const state = await store.snapshot();
    
    assert.ok(state, 'Should produce state');
    assert.ok(Array.isArray(state.objectiveReality), 'Should have objectiveReality array');
    assert.ok(state.characterBeliefs, 'Should have characterBeliefs');
    assert.ok(state.relationships, 'Should have relationships');
  });

  it('All 14 StoryOp types are applied correctly', async () => {
    const store = createEventStore();
    const ops = createAllStoryOps();
    
    // Append all op types
    ops.forEach((op, idx) => {
      store.append(createTestEvent({ 
        op, 
        presentationIndex: idx,
        storyTime: 100 + idx * 10 
      }));
    });
    
    const state = await store.snapshot();
    
    // Verify each op type was applied
    assert.strictEqual(state.objectiveReality.length, 0, 'Fact was added then expired');
    assert.ok(state.characterBeliefs['john'], 'Belief was added');
    assert.ok(state.relationships['john<->mary'], 'Relationship was shifted');
    assert.strictEqual(state.characterEmotions['john'].type, 'fear', 'Emotion was appraised');
    assert.strictEqual(state.clues.length, 1, 'Clue was seeded');
    assert.strictEqual(state.payoffs.length, 1, 'Setup was paid off');
    assert.strictEqual(state.clocks['doomsday'], 1, 'Clock was raised');
    assert.strictEqual(state.themeArgument.length, 1, 'Theme argument advanced');
    assert.strictEqual(state.objectArcs['ring'], 'corrupted', 'Object arc advanced');
    assert.strictEqual(state.firedRules.length, 1, 'Rule was triggered');
    assert.ok(state.audienceState.suspense > 0, 'Reader state was updated');
    assert.strictEqual(state.sceneFacts.length, 2, 'Visual and sonic facts recorded');
  });

  it('State matches expected values after event sequence', async () => {
    const store = createEventStore();
    
    // Add two facts
    store.append(createTestEvent({
      op: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Fact 1', addedAtTurn: 1 } },
      presentationIndex: 0
    }));
    store.append(createTestEvent({
      op: { op: 'ADD_FACT', fact: { factId: 'f2', content: 'Fact 2', addedAtTurn: 2 } },
      presentationIndex: 1
    }));
    
    // Raise clock twice
    store.append(createTestEvent({
      op: { op: 'RAISE_CLOCK', clockId: 'timer', amount: 5 },
      presentationIndex: 2
    }));
    store.append(createTestEvent({
      op: { op: 'RAISE_CLOCK', clockId: 'timer', amount: 3 },
      presentationIndex: 3
    }));
    
    const state = await store.snapshot();
    
    assert.strictEqual(state.objectiveReality.length, 2, 'Should have 2 facts');
    assert.strictEqual(state.clocks['timer'], 8, 'Clock should be 5 + 3 = 8');
  });

  it('Temporal filtering works in snapshots', async () => {
    const store = createEventStore();
    
    store.append(createTestEvent({
      op: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Early', addedAtTurn: 1 } },
      storyTime: 100,
      presentationIndex: 0
    }));
    store.append(createTestEvent({
      op: { op: 'ADD_FACT', fact: { factId: 'f2', content: 'Late', addedAtTurn: 2 } },
      storyTime: 200,
      presentationIndex: 1
    }));
    
    // Snapshot at storyTime 150 (should only include first fact)
    const earlyState = await store.snapshot({ storyTime: 150 });
    assert.strictEqual(earlyState.objectiveReality.length, 1, 'Should have 1 fact');
    assert.strictEqual(earlyState.objectiveReality[0].factId, 'f1');
    
    // Snapshot at presentationIndex 0 (should also only include first)
    const firstPresentationState = await store.snapshot({ presentationIndex: 0 });
    assert.strictEqual(firstPresentationState.objectiveReality.length, 1);
  });

  it('Reality layer filtering works in snapshots', async () => {
    const store = createEventStore();
    
    store.append(createTestEvent({
      op: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Real', addedAtTurn: 1 } },
      realityLayer: 'diegetic',
      presentationIndex: 0
    }));
    store.append(createTestEvent({
      op: { op: 'ADD_FACT', fact: { factId: 'f2', content: 'Dream', addedAtTurn: 2 } },
      realityLayer: 'dream',
      presentationIndex: 1
    }));
    
    // Snapshot with only diegetic layer
    const diegeticState = await store.snapshot({ realityLayers: ['diegetic'] });
    assert.strictEqual(diegeticState.objectiveReality.length, 1);
    assert.strictEqual(diegeticState.objectiveReality[0].factId, 'f1');
    
    // Snapshot with dream layer
    const dreamState = await store.snapshot({ realityLayers: ['dream'] });
    assert.strictEqual(dreamState.objectiveReality.length, 1);
    assert.strictEqual(dreamState.objectiveReality[0].factId, 'f2');
  });
});

// ── 4. Timeline Branching ─────────────────────────────────────────────────────

describe('EventStore - Timeline Branching', () => {
  it('fork() creates independent branches', () => {
    const store = createEventStore();
    
    const event1 = store.append(createTestEvent({ presentationIndex: 0 }));
    const branchId = store.fork(event1.eventId, 'alternate-ending');
    
    assert.ok(branchId, 'Should return branch ID');
    assert.ok(branchId.startsWith('branch_'), 'Branch ID should have prefix');
  });

  it('merge() handles conflicts correctly', () => {
    const store = createEventStore();
    
    const event1 = store.append(createTestEvent({ storyTime: 100, presentationIndex: 0 }));
    const branchId = store.fork(event1.eventId, 'alt-branch');
    
    // Add conflicting event to main timeline
    store.append(createTestEvent({ storyTime: 200, presentationIndex: 1 }));
    
    // Merge with 'ours' strategy (keep main timeline)
    const result = store.merge(branchId, 'ours');
    
    assert.ok(result.success, 'Merge should succeed');
    assert.ok(Array.isArray(result.mergedEvents), 'Should return merged events');
  });

  it('Branch events don\'t affect main timeline', () => {
    const store = createEventStore();
    
    const event1 = store.append(createTestEvent({ presentationIndex: 0 }));
    const mainCount = store.size();
    
    store.fork(event1.eventId, 'test-branch');
    
    assert.strictEqual(store.size(), mainCount, 'Main timeline size unchanged after fork');
  });
});

// ── 5. Cryptographic Integrity ────────────────────────────────────────────────

describe('EventStore - Cryptographic Integrity', () => {
  it('validateChain() passes for valid chain', () => {
    const store = createEventStore();
    
    store.append(createTestEvent({ presentationIndex: 0 }));
    store.append(createTestEvent({ presentationIndex: 1 }));
    store.append(createTestEvent({ presentationIndex: 2 }));
    
    const isValid = store.validateChain();
    assert.strictEqual(isValid, true, 'Valid chain should pass validation');
  });

  it('validateChain() detects tampering', () => {
    const store = createEventStore();
    
    store.append(createTestEvent({ presentationIndex: 0 }));
    const event2 = store.append(createTestEvent({ presentationIndex: 1 }));
    store.append(createTestEvent({ presentationIndex: 2 }));
    
    // Tamper with middle event (simulate corruption)
    (event2 as any).eventHash = 'tampered_hash_value';
    
    const isValid = store.validateChain();
    assert.strictEqual(isValid, false, 'Tampered chain should fail validation');
  });

  it('Parent references are correct', () => {
    const store = createEventStore();
    
    const event1 = store.append(createTestEvent({ presentationIndex: 0 }));
    const event2 = store.append(createTestEvent({ presentationIndex: 1 }));
    const event3 = store.append(createTestEvent({ presentationIndex: 2 }));
    
    assert.strictEqual(event1.parentHash, null);
    assert.strictEqual(event2.parentHash, event1.eventHash);
    assert.strictEqual(event3.parentHash, event2.eventHash);
    
    // Validate all parents exist
    const allEvents = store.getAllEvents();
    for (let i = 1; i < allEvents.length; i++) {
      const parentExists = allEvents.find(e => e.eventHash === allEvents[i].parentHash);
      assert.ok(parentExists, `Parent should exist for event ${i}`);
    }
  });

  it('Hash changes when content changes', () => {
    const store1 = createEventStore();
    const store2 = createEventStore();
    
    const event1 = store1.append(createTestEvent({ 
      eventId: 'test-id',
      storyTime: 100 
    }));
    const event2 = store2.append(createTestEvent({ 
      eventId: 'test-id',
      storyTime: 200 
    }));
    
    assert.notStrictEqual(event1.eventHash, event2.eventHash, 
      'Different content should produce different hash');
  });
});

// ── 6. Edge Cases ─────────────────────────────────────────────────────────────

describe('EventStore - Edge Cases', () => {
  it('Empty event store', () => {
    const store = createEventStore();
    
    assert.strictEqual(store.size(), 0, 'New store should be empty');
    assert.strictEqual(store.getAllEvents().length, 0, 'Should return empty array');
    assert.strictEqual(store.validateChain(), true, 'Empty chain is valid');
  });

  it('Single event', () => {
    const store = createEventStore();
    
    const event = store.append(createTestEvent());
    
    assert.strictEqual(store.size(), 1);
    assert.strictEqual(event.parentHash, null, 'Single event has no parent');
    assert.strictEqual(store.validateChain(), true, 'Single event chain is valid');
  });

  it('Large event stores (1000+ events)', () => {
    const store = createEventStore();
    const eventCount = 1000;
    
    // Append 1000 events
    for (let i = 0; i < eventCount; i++) {
      store.append(createTestEvent({ 
        presentationIndex: i,
        storyTime: 100 + i 
      }));
    }
    
    assert.strictEqual(store.size(), eventCount, 'Should store all events');
    assert.strictEqual(store.validateChain(), true, 'Large chain should be valid');
    
    // Query performance check
    const before500 = store.getEventsBeforePresentationIndex(499);
    assert.strictEqual(before500.length, 500, 'Should filter large dataset correctly');
  });

  it('Empty snapshot on empty store', async () => {
    const store = createEventStore();
    
    const state = await store.snapshot();
    
    assert.ok(state, 'Should return state object');
    assert.strictEqual(state.objectiveReality.length, 0);
    assert.strictEqual(state.turn, 0);
  });

  it('Handles events with same storyTime', () => {
    const store = createEventStore();
    
    // Multiple events at same story time (simultaneous actions)
    store.append(createTestEvent({ storyTime: 100, presentationIndex: 0 }));
    store.append(createTestEvent({ storyTime: 100, presentationIndex: 1 }));
    store.append(createTestEvent({ storyTime: 100, presentationIndex: 2 }));
    
    const events = store.getEventsBeforeStoryTime(100);
    assert.strictEqual(events.length, 3, 'Should include all events at storyTime 100');
  });

  it('Handles events with negative storyTime', () => {
    const store = createEventStore();
    
    // Negative story time (prehistory, prologue, etc.)
    store.append(createTestEvent({ storyTime: -100, presentationIndex: 0 }));
    store.append(createTestEvent({ storyTime: 0, presentationIndex: 1 }));
    store.append(createTestEvent({ storyTime: 100, presentationIndex: 2 }));
    
    const beforeZero = store.getEventsBeforeStoryTime(0);
    assert.strictEqual(beforeZero.length, 2, 'Should include negative and zero');
  });

  it('getEventsByProvenance() traverses derivation chains', () => {
    const store = createEventStore();
    
    const event1 = store.append(createTestEvent({ 
      presentationIndex: 0,
      derivedFrom: []
    }));
    const event2 = store.append(createTestEvent({ 
      presentationIndex: 1,
      derivedFrom: [event1.eventId]
    }));
    const event3 = store.append(createTestEvent({ 
      presentationIndex: 2,
      derivedFrom: [event2.eventId]
    }));
    
    const provenance = store.getEventsByProvenance([event3.eventId]);
    
    assert.ok(provenance.length >= 1, 'Should include at least the queried event');
  });

  it('Multiple reality layers can coexist', async () => {
    const store = createEventStore();
    
    store.append(createTestEvent({ realityLayer: 'diegetic', presentationIndex: 0 }));
    store.append(createTestEvent({ realityLayer: 'dream', presentationIndex: 1 }));
    store.append(createTestEvent({ realityLayer: 'memory', presentationIndex: 2 }));
    store.append(createTestEvent({ realityLayer: 'hypothetical', presentationIndex: 3 }));
    store.append(createTestEvent({ realityLayer: 'deceptive', presentationIndex: 4 }));
    
    assert.strictEqual(store.size(), 5, 'All reality layers stored');
    
    const diegetic = store.getEventsByRealityLayer('diegetic');
    const dream = store.getEventsByRealityLayer('dream');
    
    assert.strictEqual(diegetic.length, 1);
    assert.strictEqual(dream.length, 1);
  });
});

// ── Performance & Stress Tests ────────────────────────────────────────────────

describe('EventStore - Performance', () => {
  it('Handles rapid sequential appends', () => {
    const store = createEventStore();
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      store.append(createTestEvent({ presentationIndex: i }));
    }
    
    const duration = Date.now() - startTime;
    
    assert.strictEqual(store.size(), 100);
    assert.ok(duration < 1000, 'Should complete 100 appends in under 1 second');
  });

  it('Snapshot performance on large event store', async () => {
    const store = createEventStore();
    
    // Create 500 events with varied ops
    for (let i = 0; i < 500; i++) {
      store.append(createTestEvent({
        op: { op: 'ADD_FACT', fact: { factId: `f${i}`, content: `Fact ${i}`, addedAtTurn: i } },
        presentationIndex: i,
        storyTime: 100 + i
      }));
    }
    
    const startTime = Date.now();
    const state = await store.snapshot();
    const duration = Date.now() - startTime;
    
    assert.strictEqual(state.objectiveReality.length, 500);
    assert.ok(duration < 2000, 'Snapshot should complete in under 2 seconds');
  });
});
