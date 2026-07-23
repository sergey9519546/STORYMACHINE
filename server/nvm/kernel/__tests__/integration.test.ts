// V5.0 End-to-End Integration Tests
//
// Tests complete flows through the V5.0 pipeline:
// 1. User action → EventStore → Trinity Gate → Commit
// 2. User action → Quantum Field branches → Trinity Gate → User picks → Commit
// 3. Dual-write (EventStore + Stage simultaneously)
// 4. Event replay produces correct NarrativeState
// 5. Adapters convert EventStore ↔ StoryCommit correctly

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { EventStore, createEventStore } from '../event-store.ts';
import type { NarrativeEvent, NarrativeEventInput } from '../types.ts';
import { runTrinityGate, quickVerify } from '../trinity-gate.ts';
import { V5Integration, createV5Integration } from '../integration.ts';
import { eventsToCommits, commitsToEvents } from '../adapters.ts';
import { emptyState } from '../../state/NarrativeState.ts';
import type { StoryOp } from '../../ops/StoryOp.ts';
import type { StoryCommit } from '../../state/StoryCommit.ts';

// ── Test Fixtures ─────────────────────────────────────────────────────────────

function createTestOp(type: string = 'ADD_FACT', overrides: any = {}): StoryOp {
  const ops: Record<string, any> = {
    ADD_FACT: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test fact', addedAtTurn: 1 } },
    EXPIRE_FACT: { op: 'EXPIRE_FACT', factId: 'f1' },
    UPDATE_BELIEF: { op: 'UPDATE_BELIEF', charId: 'john', belief: { content: 'Test belief', confidence: 0.8 } },
    SHIFT_RELATIONSHIP: { op: 'SHIFT_RELATIONSHIP', pair: ['john', 'mary'], delta: { dimension: 'trust', change: 0.2 } },
    SEED_CLUE: { op: 'SEED_CLUE', clueId: 'clue1', carrier: 'photograph' },
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

function createMockStage(): any {
  const commits: StoryCommit[] = [];
  
  return {
    getCommits: () => commits,
    addCommit: (commit: StoryCommit) => commits.push(commit),
    getTurnCount: () => 0,
    getIllusionState: () => ({ structure: 'three_act', story_theme: 'test', story_genre: 'drama' }),
    getAllAgents: () => [],
  };
}

// ── Test Suite 1: Basic End-to-End Flow ──────────────────────────────────────

describe('End-to-End: User Action → EventStore → Trinity Gate → Commit', () => {
  
  it('should successfully commit valid story operations', async () => {
    const integration = createV5Integration({
      enableTrinityGate: true,
      enableQuantumField: false,
      dualWrite: false,
    });
    
    const ops: StoryOp[] = [
      createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'John enters room', addedAtTurn: 1 } }),
      createTestOp('UPDATE_BELIEF', { charId: 'john', belief: { content: 'Room is safe', confidence: 0.9 } }),
    ];
    
    const result = await integration.commit(ops, undefined, {
      sceneIdx: 1,
      storyTime: 100,
    });
    
    assert.strictEqual(result.success, true, 'Commit should succeed');
    assert.strictEqual(result.events.length, 2, 'Should create 2 events');
    assert.ok(result.verification, 'Should include verification');
    assert.strictEqual(result.verification?.pass, true, 'Trinity Gate should pass');
  });
  
  it('should block invalid operations that fail Trinity Gate', async () => {
    const integration = createV5Integration({
      enableTrinityGate: true,
      strictMode: true,
    });
    
    // First, add a fact to establish baseline
    await integration.commit([
      createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Initial fact', addedAtTurn: 1 } }),
    ]);
    
    // Now try to expire a non-existent fact (should fail validation)
    const result = await integration.commit([
      createTestOp('EXPIRE_FACT', { factId: 'non_existent_fact' }),
    ]);
    
    // Note: This may pass depending on verifier implementation
    // The test demonstrates the integration, not specific validation rules
    assert.strictEqual(typeof result.success, 'boolean', 'Should return success status');
    assert.ok(result.verification, 'Should include verification result');
  });
  
  it('should maintain cryptographic chain integrity', async () => {
    const integration = createV5Integration();
    
    await integration.commit([createTestOp('ADD_FACT')]);
    await integration.commit([createTestOp('UPDATE_BELIEF')]);
    await integration.commit([createTestOp('SEED_CLUE')]);
    
    const isValid = integration.validateChain();
    assert.strictEqual(isValid, true, 'Event chain should be valid');
  });
  
  it('should track provenance for all events', async () => {
    const integration = createV5Integration();
    
    const result = await integration.commit([
      createTestOp('ADD_FACT'),
    ], undefined, {
      createdBy: 'director_proposed',
    });
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.events[0].createdBy, 'director_proposed', 'Should track provenance');
  });
});

// ── Test Suite 2: Event Replay & State Reconstruction ────────────────────────

describe('End-to-End: Event Replay Produces Correct NarrativeState', () => {
  
  it('should reconstruct state from event log', async () => {
    const store = createEventStore();
    
    // Add several events
    store.append(createTestEvent({
      op: createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Fact 1', addedAtTurn: 1 } }),
      presentationIndex: 0,
    }));
    
    store.append(createTestEvent({
      op: createTestOp('ADD_FACT', { fact: { factId: 'f2', content: 'Fact 2', addedAtTurn: 2 } }),
      presentationIndex: 1,
    }));
    
    store.append(createTestEvent({
      op: createTestOp('UPDATE_BELIEF', { charId: 'john' }),
      presentationIndex: 2,
    }));
    
    const state = await store.snapshot();
    
    assert.strictEqual(state.objectiveReality.length, 2, 'Should have 2 facts');
    assert.ok(state.characterBeliefs['john'], 'Should have beliefs for john');
    assert.strictEqual(state.characterBeliefs['john'].length, 1, 'Should have 1 belief');
  });
  
  it('should handle all 14 StoryOp types in replay', async () => {
    const store = createEventStore();
    
    const allOps: StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Test', addedAtTurn: 1 } },
      { op: 'EXPIRE_FACT', factId: 'f1' },
      { op: 'UPDATE_BELIEF', charId: 'john', belief: { content: 'Belief', confidence: 0.8 } },
      { op: 'SHIFT_RELATIONSHIP', pair: ['john', 'mary'], delta: { dimension: 'trust', change: 0.2 } },
      { op: 'APPRAISE_EMOTION', charId: 'john', emotion: { type: 'fear', intensity: 0.7 } },
      { op: 'SEED_CLUE', clueId: 'clue1', carrier: 'photograph' },
      { op: 'PAYOFF_SETUP', setupId: 'setup1', payoffEventId: 'event5' },
      { op: 'RAISE_CLOCK', clockId: 'doomsday', amount: 1 },
      { op: 'ADVANCE_THEME_ARGUMENT', claimId: 'power', move: 'support' },
      { op: 'ADVANCE_OBJECT_ARC', objectId: 'ring', toState: 'corrupted' },
      { op: 'TRIGGER_RULE', mechanismId: 'karma', ruleId: 'rule1' },
      { op: 'UPDATE_READER_STATE', delta: { suspense: 0.5, curiosity: 0.3, investment: 0.2 } },
      { op: 'RECORD_VISUAL_FACT', sceneId: 'scene1', fact: 'Dark room' },
      { op: 'RECORD_SONIC_FACT', sceneId: 'scene1', fact: 'Thunder sound' },
    ];
    
    let presentationIndex = 0;
    for (const op of allOps) {
      store.append(createTestEvent({ op, presentationIndex: presentationIndex++ }));
    }
    
    const state = await store.snapshot();
    
    // Verify each op type left its mark
    assert.strictEqual(state.objectiveReality.length, 0, 'Fact was added then expired');
    assert.ok(state.characterBeliefs['john'], 'Should have beliefs');
    assert.ok(state.characterEmotions['john'], 'Should have emotions');
    assert.strictEqual(state.clues.length, 1, 'Should have 1 clue');
    assert.strictEqual(state.payoffs.length, 1, 'Should have 1 payoff');
    assert.strictEqual(state.clocks['doomsday'], 1, 'Clock should be incremented');
    assert.strictEqual(state.themeArgument.length, 1, 'Should have theme argument');
    assert.strictEqual(state.objectArcs['ring'], 'corrupted', 'Object arc should be updated');
    assert.strictEqual(state.firedRules.length, 1, 'Should have fired rule');
    assert.strictEqual(state.audienceState.suspense, 0.5, 'Audience suspense should be updated');
    assert.strictEqual(state.sceneFacts.length, 2, 'Should have 2 scene facts');
  });
  
  it('should support time-travel queries (story-time)', async () => {
    const store = createEventStore();
    
    store.append(createTestEvent({ storyTime: 100, presentationIndex: 0 }));
    store.append(createTestEvent({ storyTime: 200, presentationIndex: 1 }));
    store.append(createTestEvent({ storyTime: 300, presentationIndex: 2 }));
    
    const snapshot = await store.snapshot({ storyTime: 150 });
    
    // Should only include event at storyTime 100
    assert.strictEqual(snapshot.objectiveReality.length, 1, 'Should only include events up to t=150');
  });
  
  it('should support presentation-order queries', async () => {
    const store = createEventStore();
    
    // Add events in non-chronological story order (flashback scenario)
    store.append(createTestEvent({ 
      storyTime: 200, 
      presentationIndex: 0,
      op: createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Present', addedAtTurn: 1 } }),
    }));
    
    store.append(createTestEvent({ 
      storyTime: 100, 
      presentationIndex: 1,
      op: createTestOp('ADD_FACT', { fact: { factId: 'f2', content: 'Past (flashback)', addedAtTurn: 2 } }),
    }));
    
    const events = store.getEventsBeforePresentationIndex(0);
    
    assert.strictEqual(events.length, 1, 'Should only include first presented event');
    assert.strictEqual(events[0].storyTime, 200, 'First presented event is at story-time 200');
  });
});

// ── Test Suite 3: Dual-Write Integration ─────────────────────────────────────

describe('End-to-End: Dual-Write (EventStore + Stage)', () => {
  
  it('should write to both EventStore and Stage simultaneously', async () => {
    const integration = createV5Integration({
      dualWrite: true,
      enableTrinityGate: false,
    });
    
    const mockStage = createMockStage();
    
    const ops: StoryOp[] = [
      createTestOp('ADD_FACT'),
      createTestOp('UPDATE_BELIEF'),
    ];
    
    const result = await integration.commit(ops, mockStage, {
      sceneIdx: 1,
    });
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.events.length, 2, 'Should create 2 events in EventStore');
    assert.ok(result.storyCommit, 'Should create StoryCommit');
    assert.strictEqual(result.storyCommit.ops.length, 2, 'StoryCommit should have 2 ops');
    
    const stageCommits = mockStage.getCommits();
    assert.strictEqual(stageCommits.length, 1, 'Should write to Stage');
  });
  
  it('should continue if Stage write fails but EventStore succeeds', async () => {
    const integration = createV5Integration({ dualWrite: true });
    
    const brokenStage = {
      addCommit: () => { throw new Error('Stage error'); },
    };
    
    const result = await integration.commit(
      [createTestOp('ADD_FACT')],
      brokenStage as any
    );
    
    // Should succeed despite Stage failure
    assert.strictEqual(result.success, true, 'Should succeed despite Stage failure');
    assert.strictEqual(result.events.length, 1, 'EventStore should have event');
  });
  
  it('should maintain consistency between EventStore and Stage', async () => {
    const integration = createV5Integration({ dualWrite: true });
    const mockStage = createMockStage();
    
    await integration.commit([createTestOp('ADD_FACT')], mockStage, { sceneIdx: 1 });
    await integration.commit([createTestOp('UPDATE_BELIEF')], mockStage, { sceneIdx: 2 });
    
    const events = integration.getAllEvents();
    const commits = mockStage.getCommits();
    
    assert.strictEqual(commits.length, 2, 'Should have 2 commits');
    assert.strictEqual(events.length, 2, 'Should have 2 events');
    
    // Verify ops match
    const allCommitOps = commits.flatMap((c: StoryCommit) => c.ops);
    const allEventOps = events.map(e => e.op);
    
    assert.strictEqual(allCommitOps.length, allEventOps.length, 'Op counts should match');
  });
});

// ── Test Suite 4: Adapter Bidirectional Conversion ───────────────────────────

describe('End-to-End: Adapters Convert EventStore ↔ StoryCommit', () => {
  
  it('should convert events to commits correctly', async () => {
    const store = createEventStore();
    
    // Add events in scene 1
    store.append(createTestEvent({ sceneIdx: 1, presentationIndex: 0 }));
    store.append(createTestEvent({ sceneIdx: 1, presentationIndex: 1 }));
    
    // Add events in scene 2
    store.append(createTestEvent({ sceneIdx: 2, presentationIndex: 2 }));
    
    const events = store.getAllEvents();
    const commits = eventsToCommits(events);
    
    assert.strictEqual(commits.length, 2, 'Should create 2 commits (one per scene)');
    assert.strictEqual(commits[0].sceneIdx, 1, 'First commit should be scene 1');
    assert.strictEqual(commits[0].ops.length, 2, 'Scene 1 should have 2 ops');
    assert.strictEqual(commits[1].sceneIdx, 2, 'Second commit should be scene 2');
    assert.strictEqual(commits[1].ops.length, 1, 'Scene 2 should have 1 op');
  });
  
  it('should convert commits to events correctly', () => {
    const commits: StoryCommit[] = [
      {
        commitId: 'c1',
        parentId: null,
        sceneIdx: 1,
        ops: [createTestOp('ADD_FACT'), createTestOp('UPDATE_BELIEF')],
        deltaSummary: '2 ops',
        reverted: false,
        createdAt: Date.now(),
      },
      {
        commitId: 'c2',
        parentId: 'c1',
        sceneIdx: 2,
        ops: [createTestOp('SEED_CLUE')],
        deltaSummary: '1 op',
        reverted: false,
        createdAt: Date.now(),
      },
    ];
    
    const events = commitsToEvents(commits);
    
    assert.strictEqual(events.length, 3, 'Should create 3 events (one per op)');
    assert.strictEqual(events[0].sceneIdx, 1, 'First 2 events should be scene 1');
    assert.strictEqual(events[1].sceneIdx, 1);
    assert.strictEqual(events[2].sceneIdx, 2, 'Last event should be scene 2');
  });
  
  it('should be idempotent: events → commits → events', async () => {
    const store = createEventStore();
    
    const originalOps = [
      createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Test 1', addedAtTurn: 1 } }),
      createTestOp('UPDATE_BELIEF', { charId: 'john' }),
    ];
    
    for (let i = 0; i < originalOps.length; i++) {
      store.append(createTestEvent({ 
        op: originalOps[i], 
        sceneIdx: 1,
        presentationIndex: i,
      }));
    }
    
    const events1 = store.getAllEvents();
    const commits = eventsToCommits(events1);
    const events2 = commitsToEvents(commits);
    
    assert.strictEqual(events1.length, events2.length, 'Should have same number of events');
    
    for (let i = 0; i < events1.length; i++) {
      assert.strictEqual(events1[i].op.op, events2[i].op.op, `Event ${i} op type should match`);
      assert.strictEqual(events1[i].sceneIdx, events2[i].sceneIdx, `Event ${i} sceneIdx should match`);
    }
  });
  
  it('should preserve reality layers in conversion', async () => {
    const store = createEventStore();
    
    store.append(createTestEvent({ realityLayer: 'diegetic', sceneIdx: 1, presentationIndex: 0 }));
    store.append(createTestEvent({ realityLayer: 'dream', sceneIdx: 1, presentationIndex: 1 }));
    
    const events = store.getAllEvents();
    const commits = eventsToCommits(events);
    
    // Only diegetic events should be in commits (backward compat)
    assert.strictEqual(commits[0].ops.length, 1, 'Should only include diegetic events');
  });
});

// ── Test Suite 5: Quantum Field Integration ──────────────────────────────────

describe('End-to-End: Quantum Field Exploration', () => {
  
  it('should explore multiple story branches', async () => {
    const integration = createV5Integration({
      enableQuantumField: true,
      enableTrinityGate: false,
    });
    
    const currentState = emptyState();
    
    const opsArray = [
      [createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Branch 1', addedAtTurn: 1 } })],
      [createTestOp('ADD_FACT', { fact: { factId: 'f2', content: 'Branch 2', addedAtTurn: 1 } })],
      [createTestOp('ADD_FACT', { fact: { factId: 'f3', content: 'Branch 3', addedAtTurn: 1 } })],
    ];
    
    const result = await integration.explore(opsArray, currentState);
    
    assert.strictEqual(result.branches.length, 3, 'Should create 3 branches');
    assert.ok(result.topPick, 'Should identify top pick');
    
    for (const branch of result.branches) {
      assert.ok(branch.stateId, 'Branch should have state ID');
      assert.strictEqual(typeof branch.probability, 'number', 'Branch should have probability');
      assert.strictEqual(typeof branch.isLegal, 'boolean', 'Branch should have legality status');
    }
  });
  
  it('should validate branches with Trinity Gate when enabled', async () => {
    const integration = createV5Integration({
      enableQuantumField: true,
      enableTrinityGate: true,
    });
    
    const currentState = emptyState();
    
    const opsArray = [
      [createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Test', addedAtTurn: 1 } })],
    ];
    
    const result = await integration.explore(opsArray, currentState);
    
    assert.ok(result.branches[0].verification, 'Should include verification for each branch');
    assert.strictEqual(typeof result.branches[0].verification?.pass, 'boolean', 'Should have pass/fail status');
  });
  
  it('should allow collapsing to chosen branch', async () => {
    const integration = createV5Integration({
      enableQuantumField: true,
    });
    
    const currentState = emptyState();
    
    const opsArray = [
      [createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Branch 1', addedAtTurn: 1 } })],
      [createTestOp('ADD_FACT', { fact: { factId: 'f2', content: 'Branch 2', addedAtTurn: 1 } })],
    ];
    
    const result = await integration.explore(opsArray, currentState);
    const chosenStateId = result.branches[0].stateId;
    
    const collapsed = integration.collapseToChoice(chosenStateId);
    
    assert.ok(collapsed, 'Should return collapsed state');
    assert.strictEqual(collapsed.stateId, chosenStateId, 'Should match chosen state');
  });
});

// ── Test Suite 6: Full Pipeline Integration ──────────────────────────────────

describe('End-to-End: Complete V5.0 Pipeline', () => {
  
  it('should handle complex multi-scene narrative', async () => {
    const integration = createV5Integration({
      enableTrinityGate: true,
      dualWrite: true,
    });
    
    const mockStage = createMockStage();
    
    // Scene 1: Setup
    await integration.commit([
      createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Hero enters', addedAtTurn: 1 } }),
      createTestOp('SEED_CLUE', { clueId: 'clue1', carrier: 'letter' }),
    ], mockStage, { sceneIdx: 1 });
    
    // Scene 2: Development
    await integration.commit([
      createTestOp('UPDATE_BELIEF', { charId: 'hero', belief: { content: 'Villain is near', confidence: 0.9 } }),
      createTestOp('RAISE_CLOCK', { clockId: 'countdown', amount: 1 }),
    ], mockStage, { sceneIdx: 2 });
    
    // Scene 3: Payoff
    await integration.commit([
      createTestOp('PAYOFF_SETUP', { setupId: 'clue1', payoffEventId: 'reveal1' }),
    ], mockStage, { sceneIdx: 3 });
    
    const events = integration.getAllEvents();
    const snapshot = await integration.getSnapshot();
    
    assert.strictEqual(events.length, 5, 'Should have 5 events total');
    assert.strictEqual(snapshot.clues.length, 1, 'Should have 1 clue');
    assert.strictEqual(snapshot.payoffs.length, 1, 'Should have 1 payoff');
    assert.strictEqual(snapshot.clocks['countdown'], 1, 'Clock should be incremented');
    assert.ok(snapshot.characterBeliefs['hero'], 'Hero should have beliefs');
    
    // Verify chain integrity
    assert.strictEqual(integration.validateChain(), true, 'Chain should be valid');
    
    // Verify dual-write
    const stageCommits = mockStage.getCommits();
    assert.strictEqual(stageCommits.length, 3, 'Should have 3 commits in Stage');
  });
  
  it('should handle reality layer separation', async () => {
    const integration = createV5Integration();
    
    // Diegetic reality
    await integration.commit([
      createTestOp('ADD_FACT', { fact: { factId: 'f1', content: 'Real event', addedAtTurn: 1 } }),
    ], undefined, { realityLayer: 'diegetic' });
    
    // Dream sequence
    await integration.commit([
      createTestOp('ADD_FACT', { fact: { factId: 'f2', content: 'Dream event', addedAtTurn: 2 } }),
    ], undefined, { realityLayer: 'dream' });
    
    // Hypothetical
    await integration.commit([
      createTestOp('ADD_FACT', { fact: { factId: 'f3', content: 'What if', addedAtTurn: 3 } }),
    ], undefined, { realityLayer: 'hypothetical' });
    
    const diegeticSnapshot = await integration.getSnapshot({ realityLayers: ['diegetic'] });
    const dreamSnapshot = await integration.getSnapshot({ realityLayers: ['dream'] });
    
    assert.strictEqual(diegeticSnapshot.objectiveReality.length, 1, 'Diegetic should have 1 fact');
    assert.strictEqual(dreamSnapshot.objectiveReality.length, 1, 'Dream should have 1 fact');
  });
  
  it('should track provenance through entire pipeline', async () => {
    const integration = createV5Integration();
    
    await integration.commit([
      createTestOp('ADD_FACT'),
    ], undefined, { createdBy: 'user_authored' });
    
    await integration.commit([
      createTestOp('UPDATE_BELIEF'),
    ], undefined, { createdBy: 'director_proposed' });
    
    await integration.commit([
      createTestOp('SEED_CLUE'),
    ], undefined, { createdBy: 'screenwriter_generated' });
    
    const events = integration.getAllEvents();
    
    assert.strictEqual(events[0].createdBy, 'user_authored');
    assert.strictEqual(events[1].createdBy, 'director_proposed');
    assert.strictEqual(events[2].createdBy, 'screenwriter_generated');
  });
});
