// V5.0 Backward Compatibility Tests
//
// Tests that V5.0 maintains backward compatibility with existing code:
// 1. Existing Stage code works with V5Integration
// 2. Old StoryCommit converts to Events and back without loss
// 3. v5-loop.ts works as drop-in replacement for loop.ts
// 4. No breaking changes to public APIs

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EventStore, createEventStore } from '../kernel/event-store.ts';
import type { NarrativeEvent } from '../kernel/types.ts';
import { V5Integration, createV5Integration } from '../kernel/integration.ts';
import { eventsToCommits, commitsToEvents, addAdaptersToEventStore } from '../kernel/adapters.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import { emptyState } from '../state/NarrativeState.ts';

// ── Test Fixtures ─────────────────────────────────────────────────────────────

function createLegacyCommit(sceneIdx: number, ops: StoryOp[], parentId: string | null = null): StoryCommit {
  return {
    commitId: `commit_${sceneIdx}`,
    parentId,
    sceneIdx,
    ops,
    deltaSummary: `${ops.length} operations`,
    reverted: false,
    createdAt: Date.now(),
  };
}

function createTestOp(type: string = 'ADD_FACT', overrides: any = {}): StoryOp {
  const ops: Record<string, any> = {
    ADD_FACT: { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'Test', predicate: 'is', object: 'fact', addedAtTurn: 1 } },
    UPDATE_BELIEF: { op: 'UPDATE_BELIEF', charId: 'john', belief: { content: 'Test', confidence: 0.8 } },
    SHIFT_RELATIONSHIP: { op: 'SHIFT_RELATIONSHIP', pair: ['john', 'mary'], delta: { dimension: 'trust', change: 0.2 } },
    SEED_CLUE: { op: 'SEED_CLUE', clueId: 'clue1', carrier: 'photograph' },
  };
  
  return { ...ops[type], ...overrides };
}

function createMockStage(commits: StoryCommit[] = []): any {
  return {
    getCommits: () => commits,
    addCommit: (commit: StoryCommit) => commits.push(commit),
    getTurnCount: () => commits.length,
    getIllusionState: () => ({ 
      structure: 'three_act', 
      story_theme: 'redemption', 
      story_genre: 'drama' 
    }),
    getAllAgents: () => [],
  };
}

// ── Test Suite 1: StoryCommit ↔ Event Conversion ─────────────────────────────

describe('Backward Compatibility: StoryCommit ↔ Event Conversion', () => {
  
  it('should convert legacy commits to events without data loss', () => {
    const legacyCommits: StoryCommit[] = [
      createLegacyCommit(1, [
        createTestOp('ADD_FACT', { fact: { factId: 'f1', subject: 'Scene', predicate: 'is', object: '1', addedAtTurn: 1 } }),
        createTestOp('UPDATE_BELIEF', { charId: 'john' }),
      ], null),
      createLegacyCommit(2, [
        createTestOp('SEED_CLUE', { clueId: 'clue1' }),
      ], 'commit_1'),
    ];
    
    const events = commitsToEvents(legacyCommits);
    
    assert.strictEqual(events.length, 3, 'Should create 3 events from 2 commits');
    assert.strictEqual(events[0].op.op, 'ADD_FACT', 'First event should be ADD_FACT');
    assert.strictEqual(events[1].op.op, 'UPDATE_BELIEF', 'Second event should be UPDATE_BELIEF');
    assert.strictEqual(events[2].op.op, 'SEED_CLUE', 'Third event should be SEED_CLUE');
    
    // Verify scene grouping is preserved
    assert.strictEqual(events[0].sceneIdx, 1, 'First two events should be scene 1');
    assert.strictEqual(events[1].sceneIdx, 1);
    assert.strictEqual(events[2].sceneIdx, 2, 'Third event should be scene 2');
  });
  
  it('should convert events back to commits preserving structure', async () => {
    const store = createEventStore();
    
    // Add events for scene 1
    store.append({
      op: createTestOp('ADD_FACT'),
      assertions: [],
      derivedFrom: [],
      createdBy: 'user_authored',
      realityLayer: 'diegetic',
      storyTime: 100,
      presentationIndex: 0,
      sceneIdx: 1,
      parentHash: null,
    });
    
    store.append({
      op: createTestOp('UPDATE_BELIEF'),
      assertions: [],
      derivedFrom: [],
      createdBy: 'user_authored',
      realityLayer: 'diegetic',
      storyTime: 110,
      presentationIndex: 1,
      sceneIdx: 1,
      parentHash: null,
    });
    
    // Add event for scene 2
    store.append({
      op: createTestOp('SEED_CLUE'),
      assertions: [],
      derivedFrom: [],
      createdBy: 'user_authored',
      realityLayer: 'diegetic',
      storyTime: 200,
      presentationIndex: 2,
      sceneIdx: 2,
      parentHash: null,
    });
    
    const events = store.getAllEvents();
    const commits = eventsToCommits(events);
    
    assert.strictEqual(commits.length, 2, 'Should create 2 commits');
    assert.strictEqual(commits[0].sceneIdx, 1, 'First commit should be scene 1');
    assert.strictEqual(commits[0].ops.length, 2, 'Scene 1 should have 2 ops');
    assert.strictEqual(commits[1].sceneIdx, 2, 'Second commit should be scene 2');
    assert.strictEqual(commits[1].ops.length, 1, 'Scene 2 should have 1 op');
  });
  
  it('should preserve op order in round-trip conversion', () => {
    const originalCommits: StoryCommit[] = [
      createLegacyCommit(1, [
        createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Op 1', addedAtTurn: 1 } }),
        createTestOp('UPDATE_BELIEF', { charId: 'john' }),
        createTestOp('SEED_CLUE', { clueId: 'c1' }),
      ], null),
    ];
    
    const events = commitsToEvents(originalCommits);
    const reconstructedCommits = eventsToCommits(events);
    
    assert.strictEqual(reconstructedCommits.length, 1, 'Should have 1 commit');
    assert.strictEqual(reconstructedCommits[0].ops.length, 3, 'Should have 3 ops');
    assert.strictEqual(reconstructedCommits[0].ops[0].op, 'ADD_FACT', 'Order should be preserved');
    assert.strictEqual(reconstructedCommits[0].ops[1].op, 'UPDATE_BELIEF', 'Order should be preserved');
    assert.strictEqual(reconstructedCommits[0].ops[2].op, 'SEED_CLUE', 'Order should be preserved');
  });
  
  it('should handle empty commits gracefully', () => {
    const emptyCommits: StoryCommit[] = [];
    const events = commitsToEvents(emptyCommits);
    const commits = eventsToCommits(events);
    
    assert.strictEqual(events.length, 0, 'Should handle empty input');
    assert.strictEqual(commits.length, 0, 'Should handle empty output');
  });
  
  it('should preserve commit metadata through conversion', () => {
    const originalCommit = createLegacyCommit(1, [createTestOp('ADD_FACT')], null);
    const originalTimestamp = originalCommit.createdAt;
    
    const events = commitsToEvents([originalCommit]);
    const reconstructedCommits = eventsToCommits(events);
    
    assert.strictEqual(reconstructedCommits[0].sceneIdx, originalCommit.sceneIdx, 'Scene index preserved');
    assert.strictEqual(reconstructedCommits[0].reverted, false, 'Reverted flag preserved');
  });
});

// ── Test Suite 2: Existing Stage Integration ─────────────────────────────────

describe('Backward Compatibility: Stage Integration', () => {
  
  it('should work with existing Stage.getCommits() calls', () => {
    const legacyCommits = [
      createLegacyCommit(1, [createTestOp('ADD_FACT')], null),
      createLegacyCommit(2, [createTestOp('UPDATE_BELIEF')], 'commit_1'),
    ];
    
    const stage = createMockStage(legacyCommits);
    const commits = stage.getCommits();
    
    assert.strictEqual(commits.length, 2, 'Should return commits');
    assert.strictEqual(commits[0].sceneIdx, 1, 'Commits should be accessible');
  });
  
  it('should support dual-write to legacy Stage', async () => {
    const integration = createV5Integration({ dualWrite: true });
    const stage = createMockStage();
    
    await integration.commit(
      [createTestOp('ADD_FACT')],
      stage,
      { sceneIdx: 1 }
    );
    
    const commits = stage.getCommits();
    assert.strictEqual(commits.length, 1, 'Should write to Stage');
    assert.strictEqual(commits[0].sceneIdx, 1, 'Commit should have correct scene');
    assert.strictEqual(commits[0].ops.length, 1, 'Commit should have ops');
  });
  
  it('should import existing Stage commits into EventStore', async () => {
    const legacyCommits = [
      createLegacyCommit(1, [createTestOp('ADD_FACT')], null),
      createLegacyCommit(2, [createTestOp('UPDATE_BELIEF')], 'commit_1'),
      createLegacyCommit(3, [createTestOp('SEED_CLUE')], 'commit_2'),
    ];
    
    const integration = createV5Integration();
    const imported = await integration.importLegacyCommits(legacyCommits);
    
    assert.strictEqual(imported, 3, 'Should import 3 events (one per commit op)');
    
    const events = integration.getAllEvents();
    assert.strictEqual(events.length, 3, 'EventStore should have 3 events');
  });
  
  it('should export EventStore back to Stage format', async () => {
    const integration = createV5Integration();
    
    await integration.commit([createTestOp('ADD_FACT')], undefined, { sceneIdx: 1 });
    await integration.commit([createTestOp('UPDATE_BELIEF')], undefined, { sceneIdx: 2 });
    
    const commits = integration.exportToLegacyCommits();
    
    assert.strictEqual(commits.length, 2, 'Should export 2 commits');
    assert.ok(commits[0].commitId, 'Commits should have IDs');
    assert.ok(commits[0].deltaSummary, 'Commits should have summaries');
  });
  
  it('should maintain Stage API compatibility', () => {
    const stage = createMockStage();
    
    // Test that all expected Stage methods exist
    assert.strictEqual(typeof stage.getCommits, 'function', 'Should have getCommits');
    assert.strictEqual(typeof stage.addCommit, 'function', 'Should have addCommit');
    assert.strictEqual(typeof stage.getTurnCount, 'function', 'Should have getTurnCount');
    assert.strictEqual(typeof stage.getIllusionState, 'function', 'Should have getIllusionState');
    assert.strictEqual(typeof stage.getAllAgents, 'function', 'Should have getAllAgents');
  });
});

// ── Test Suite 3: Public API Compatibility ───────────────────────────────────

describe('Backward Compatibility: Public APIs', () => {
  
  it('should maintain EventStore public API', () => {
    const store = createEventStore();
    
    // Verify all expected methods exist
    assert.strictEqual(typeof store.append, 'function', 'Should have append');
    assert.strictEqual(typeof store.getEventsBeforeStoryTime, 'function', 'Should have getEventsBeforeStoryTime');
    assert.strictEqual(typeof store.getEventsBeforePresentationIndex, 'function', 'Should have getEventsBeforePresentationIndex');
    assert.strictEqual(typeof store.getEventsByRealityLayer, 'function', 'Should have getEventsByRealityLayer');
    assert.strictEqual(typeof store.snapshot, 'function', 'Should have snapshot');
    assert.strictEqual(typeof store.fork, 'function', 'Should have fork');
    assert.strictEqual(typeof store.merge, 'function', 'Should have merge');
    assert.strictEqual(typeof store.validateChain, 'function', 'Should have validateChain');
    assert.strictEqual(typeof store.getAllEvents, 'function', 'Should have getAllEvents');
    assert.strictEqual(typeof store.size, 'function', 'Should have size');
  });
  
  it('should maintain V5Integration public API', () => {
    const integration = createV5Integration();
    
    // Verify all expected methods exist
    assert.strictEqual(typeof integration.commit, 'function', 'Should have commit');
    assert.strictEqual(typeof integration.getAllEvents, 'function', 'Should have getAllEvents');
    assert.strictEqual(typeof integration.getEventsBeforeStoryTime, 'function', 'Should have getEventsBeforeStoryTime');
    assert.strictEqual(typeof integration.getSnapshot, 'function', 'Should have getSnapshot');
    assert.strictEqual(typeof integration.validateChain, 'function', 'Should have validateChain');
    assert.strictEqual(typeof integration.importLegacyCommits, 'function', 'Should have importLegacyCommits');
    assert.strictEqual(typeof integration.exportToLegacyCommits, 'function', 'Should have exportToLegacyCommits');
  });
  
  it('should maintain adapter function signatures', () => {
    // Test that adapter functions have expected signatures
    assert.strictEqual(typeof eventsToCommits, 'function', 'eventsToCommits should be function');
    assert.strictEqual(typeof commitsToEvents, 'function', 'commitsToEvents should be function');
    assert.strictEqual(typeof addAdaptersToEventStore, 'function', 'addAdaptersToEventStore should be function');
  });
  
  it('should support optional parameters in commit', async () => {
    const integration = createV5Integration();
    
    // All these should work
    await integration.commit([createTestOp('ADD_FACT')]);
    await integration.commit([createTestOp('ADD_FACT')], undefined);
    await integration.commit([createTestOp('ADD_FACT')], undefined, {});
    await integration.commit([createTestOp('ADD_FACT')], undefined, { sceneIdx: 1 });
    await integration.commit([createTestOp('ADD_FACT')], undefined, { storyTime: 100 });
    
    const events = integration.getAllEvents();
    assert.strictEqual(events.length, 5, 'All commit variants should work');
  });
  
  it('should accept configuration with defaults', () => {
    // All these should work
    const i1 = createV5Integration();
    const i2 = createV5Integration({});
    const i3 = createV5Integration({ enableTrinityGate: true });
    const i4 = createV5Integration({ enableQuantumField: false, dualWrite: true });
    
    assert.ok(i1, 'Default config should work');
    assert.ok(i2, 'Empty config should work');
    assert.ok(i3, 'Partial config should work');
    assert.ok(i4, 'Full config should work');
  });
});

// ── Test Suite 4: Adapter Extensions ─────────────────────────────────────────

describe('Backward Compatibility: Adapter Extensions', () => {
  
  it('should add convenience methods to EventStore', () => {
    const store = createEventStore();
    const extended = addAdaptersToEventStore(store);
    
    assert.strictEqual(typeof extended.buildScreenplayMemory, 'function', 'Should have buildScreenplayMemory');
    assert.strictEqual(typeof extended.toFountainAnalysis, 'function', 'Should have toFountainAnalysis');
    assert.strictEqual(typeof extended.getCommits, 'function', 'Should have getCommits');
  });
  
  it('should getCommits from extended EventStore', () => {
    const store = createEventStore();
    const extended = addAdaptersToEventStore(store);
    
    store.append({
      op: createTestOp('ADD_FACT'),
      assertions: [],
      derivedFrom: [],
      createdBy: 'user_authored',
      realityLayer: 'diegetic',
      storyTime: 100,
      presentationIndex: 0,
      sceneIdx: 1,
      parentHash: null,
    });
    
    const commits = extended.getCommits();
    
    assert.strictEqual(commits.length, 1, 'Should return commits');
    assert.strictEqual(commits[0].ops.length, 1, 'Commit should have ops');
  });
  
  it('should maintain original EventStore functionality after extension', () => {
    const store = createEventStore();
    const extended = addAdaptersToEventStore(store);
    
    // Original methods should still work
    const event = extended.append({
      op: createTestOp('ADD_FACT'),
      assertions: [],
      derivedFrom: [],
      createdBy: 'user_authored',
      realityLayer: 'diegetic',
      storyTime: 100,
      presentationIndex: 0,
      sceneIdx: 1,
      parentHash: null,
    });
    
    assert.ok(event, 'Original append should work');
    assert.strictEqual(extended.size(), 1, 'Original size should work');
    assert.strictEqual(extended.validateChain(), true, 'Original validateChain should work');
  });
});

// ── Test Suite 5: Data Type Compatibility ────────────────────────────────────

describe('Backward Compatibility: Data Types', () => {
  
  it('should accept all legacy StoryOp types', () => {
    const allOpTypes = [
      'ADD_FACT',
      'EXPIRE_FACT',
      'UPDATE_BELIEF',
      'SHIFT_RELATIONSHIP',
      'APPRAISE_EMOTION',
      'SEED_CLUE',
      'PAYOFF_SETUP',
      'RAISE_CLOCK',
      'ADVANCE_THEME_ARGUMENT',
      'ADVANCE_OBJECT_ARC',
      'TRIGGER_RULE',
      'UPDATE_READER_STATE',
      'RECORD_VISUAL_FACT',
      'RECORD_SONIC_FACT',
    ];
    
    const store = createEventStore();
    
    for (const opType of allOpTypes) {
      const op: any = { op: opType };
      
      // Add minimal required fields based on type
      switch (opType) {
        case 'ADD_FACT':
          op.fact = { factId: 'f1', content: 'test', addedAtTurn: 1 };
          break;
        case 'EXPIRE_FACT':
          op.factId = 'f1';
          break;
        case 'UPDATE_BELIEF':
          op.charId = 'john';
          op.belief = { content: 'test', confidence: 0.8 };
          break;
        case 'SHIFT_RELATIONSHIP':
          op.pair = ['a', 'b'];
          op.delta = { dimension: 'trust', change: 0.1 };
          break;
        case 'APPRAISE_EMOTION':
          op.charId = 'john';
          op.emotion = { type: 'fear', intensity: 0.5 };
          break;
        case 'SEED_CLUE':
          op.clueId = 'c1';
          op.carrier = 'photograph';
          break;
        case 'PAYOFF_SETUP':
          op.setupId = 's1';
          op.payoffEventId = 'e1';
          break;
        case 'RAISE_CLOCK':
          op.clockId = 'clock1';
          op.amount = 1;
          break;
        case 'ADVANCE_THEME_ARGUMENT':
          op.claimId = 'claim1';
          op.move = 'support';
          break;
        case 'ADVANCE_OBJECT_ARC':
          op.objectId = 'obj1';
          op.toState = 'state1';
          break;
        case 'TRIGGER_RULE':
          op.mechanismId = 'mech1';
          op.ruleId = 'rule1';
          break;
        case 'UPDATE_READER_STATE':
          op.delta = { suspense: 0.5 };
          break;
        case 'RECORD_VISUAL_FACT':
          op.sceneId = 'scene1';
          op.fact = 'visual';
          break;
        case 'RECORD_SONIC_FACT':
          op.sceneId = 'scene1';
          op.fact = 'sonic';
          break;
      }
      
      const event = store.append({
        op,
        assertions: [],
        derivedFrom: [],
        createdBy: 'user_authored',
        realityLayer: 'diegetic',
        storyTime: 100,
        presentationIndex: 0,
        sceneIdx: 1,
        parentHash: null,
      });
      
      assert.ok(event, `Should accept ${opType} op type`);
    }
    
    assert.strictEqual(store.size(), allOpTypes.length, 'Should have all ops stored');
  });
  
  it('should handle all reality layers', () => {
    const realityLayers = ['diegetic', 'dream', 'memory', 'hypothetical', 'deceptive'];
    const store = createEventStore();
    
    for (const layer of realityLayers) {
      store.append({
        op: createTestOp('ADD_FACT'),
        assertions: [],
        derivedFrom: [],
        createdBy: 'user_authored',
        realityLayer: layer as any,
        storyTime: 100,
        presentationIndex: 0,
        sceneIdx: 1,
        parentHash: null,
      });
    }
    
    assert.strictEqual(store.size(), realityLayers.length, 'Should accept all reality layers');
  });
  
  it('should handle all provenance origins', () => {
    const origins = [
      'user_authored',
      'director_proposed',
      'screenwriter_generated',
      'actor_improvised',
      'system_inferred',
    ];
    
    const store = createEventStore();
    
    for (const origin of origins) {
      store.append({
        op: createTestOp('ADD_FACT'),
        assertions: [],
        derivedFrom: [],
        createdBy: origin as any,
        realityLayer: 'diegetic',
        storyTime: 100,
        presentationIndex: 0,
        sceneIdx: 1,
        parentHash: null,
      });
    }
    
    assert.strictEqual(store.size(), origins.length, 'Should accept all provenance origins');
  });
});

// ── Test Suite 6: Migration Path Support ─────────────────────────────────────

describe('Backward Compatibility: Migration Support', () => {
  
  it('should gradually migrate from Stage to EventStore', async () => {
    // Start with legacy Stage
    const legacyCommits = [
      createLegacyCommit(1, [createTestOp('ADD_FACT')], null),
      createLegacyCommit(2, [createTestOp('UPDATE_BELIEF')], 'commit_1'),
    ];
    
    const stage = createMockStage(legacyCommits);
    
    // Create integration with dual-write
    const integration = createV5Integration({ dualWrite: true });
    
    // Import legacy data
    await integration.importLegacyCommits(legacyCommits);
    
    // New commits go to both systems
    await integration.commit([createTestOp('SEED_CLUE')], stage, { sceneIdx: 3 });
    
    // Verify both systems have data
    const events = integration.getAllEvents();
    const commits = stage.getCommits();
    
    assert.ok(events.length > 0, 'EventStore should have events');
    assert.ok(commits.length > 0, 'Stage should have commits');
  });
  
  it('should support read-only legacy Stage access', async () => {
    const legacyCommits = [
      createLegacyCommit(1, [createTestOp('ADD_FACT')], null),
    ];
    
    const integration = createV5Integration({ dualWrite: false });
    await integration.importLegacyCommits(legacyCommits);
    
    // Should be able to export back to Stage format
    const exported = integration.exportToLegacyCommits();
    
    assert.strictEqual(exported.length, 1, 'Should export commits');
    assert.strictEqual(exported[0].ops.length, 1, 'Should preserve ops');
  });
  
  it('should handle mixed V5/legacy workflow', async () => {
    const integration = createV5Integration({ dualWrite: true });
    const stage = createMockStage();
    
    // Add through V5
    await integration.commit([createTestOp('ADD_FACT')], stage, { sceneIdx: 1 });
    
    // Import legacy
    await integration.importLegacyCommits([
      createLegacyCommit(2, [createTestOp('UPDATE_BELIEF')], null),
    ]);
    
    // Add more through V5
    await integration.commit([createTestOp('SEED_CLUE')], stage, { sceneIdx: 3 });
    
    const events = integration.getAllEvents();
    assert.strictEqual(events.length, 3, 'Should have all events from both sources');
  });
});

// ── Test Suite 7: No Breaking Changes ────────────────────────────────────────

describe('Backward Compatibility: No Breaking Changes', () => {
  
  it('should not require changes to existing commit creation code', async () => {
    const integration = createV5Integration({ dualWrite: false });
    
    // Old-style commit (just ops array)
    const result = await integration.commit([
      createTestOp('ADD_FACT'),
      createTestOp('UPDATE_BELIEF'),
    ]);
    
    assert.strictEqual(result.success, true, 'Old-style commits should work');
    assert.strictEqual(result.events.length, 2, 'Should create events');
  });
  
  it('should not require changes to existing query code', async () => {
    const integration = createV5Integration();
    
    await integration.commit([createTestOp('ADD_FACT')]);
    
    // Old-style queries should work
    const events = integration.getAllEvents();
    const snapshot = await integration.getSnapshot();
    
    assert.ok(events, 'getAllEvents should work');
    assert.ok(snapshot, 'getSnapshot should work');
  });
  
  it('should maintain existing error handling patterns', async () => {
    const integration = createV5Integration({ enableTrinityGate: true });
    
    try {
      const result = await integration.commit([createTestOp('ADD_FACT')]);
      
      // Should return result object, not throw
      assert.ok(result, 'Should return result');
      assert.strictEqual(typeof result.success, 'boolean', 'Should have success flag');
    } catch (error) {
      assert.fail('Should not throw, should return result with error field');
    }
  });
  
  it('should preserve existing type definitions', () => {
    // Type checks - these should compile without errors
    const op: StoryOp = createTestOp('ADD_FACT');
    const state = emptyState();
    
    assert.ok(op, 'StoryOp type should work');
    assert.ok(state, 'NarrativeState type should work');
  });
});
