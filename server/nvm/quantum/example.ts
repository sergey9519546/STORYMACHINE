// Quantum Narrative Field — Example Usage
//
// Demonstrates how to use the Quantum Field system to maintain parallel story-states,
// track setup→payoff entanglement, and collapse to user decisions.

import { createEventStore } from '../kernel/event-store.ts';
import { createQuantumField, DEFAULT_QUANTUM_CONFIG, FAST_QUANTUM_CONFIG } from './index.ts';
import type { NarrativeEvent, NarrativeEventInput } from '../kernel/types.ts';

// ── Example 1: Basic Superposition ───────────────────────────────────────────

async function example1_basicSuperposition() {
  console.log('=== Example 1: Basic Superposition ===\n');
  
  // Create event store with initial events
  const eventStore = createEventStore();
  
  // Add some initial story events
  const event1 = eventStore.append({
    op: { op: 'ADD_FACT', fact: { factId: 'f1', content: 'Hero enters castle', addedAtTurn: 1 } },
    storyTime: 100,
    presentationIndex: 0,
    realityLayer: 'diegetic',
    assertions: [],
    derivedFrom: [],
    createdBy: 'user_authored',
    sceneIdx: 0,
  });
  
  const event2 = eventStore.append({
    op: { op: 'SEED_CLUE', clueId: 'mysterious_door', carrier: 'environment' },
    storyTime: 150,
    presentationIndex: 1,
    realityLayer: 'diegetic',
    assertions: [],
    derivedFrom: [event1.eventId],
    createdBy: 'director_proposed',
    sceneIdx: 0,
  });
  
  // Initialize quantum field
  const quantumField = createQuantumField(FAST_QUANTUM_CONFIG);
  const rootState = await quantumField.initialize(eventStore);
  
  console.log(`Root state created: ${rootState.stateId}`);
  console.log(`Initial probability: ${rootState.probability.toFixed(3)}`);
  console.log(`Events in root state: ${rootState.events.length}`);
  console.log(`Entangled setups: ${rootState.entangledSetups.size}\n`);
  
  // Branch 1: Hero opens the door
  const branch1Events: NarrativeEventInput[] = [{
    op: { op: 'ADD_FACT', fact: { factId: 'f2', content: 'Hero opens mysterious door', addedAtTurn: 2 } },
    storyTime: 200,
    presentationIndex: 2,
    realityLayer: 'diegetic',
    assertions: [],
    derivedFrom: [event2.eventId],
    createdBy: 'user_authored',
    sceneIdx: 1,
  }];
  
  const branch1 = await quantumField.branch(rootState.stateId, [
    eventStore.append(branch1Events[0])
  ]);
  
  console.log(`Branch 1 created: ${branch1.stateId}`);
  console.log(`Branch 1 probability: ${branch1.probability.toFixed(3)}`);
  console.log(`Branch 1 legal: ${branch1.isLegal}\n`);
  
  // Branch 2: Hero ignores the door
  const branch2Events: NarrativeEventInput[] = [{
    op: { op: 'ADD_FACT', fact: { factId: 'f3', content: 'Hero walks past door', addedAtTurn: 2 } },
    storyTime: 200,
    presentationIndex: 2,
    realityLayer: 'diegetic',
    assertions: [],
    derivedFrom: [event2.eventId],
    createdBy: 'user_authored',
    sceneIdx: 1,
  }];
  
  const branch2 = await quantumField.branch(rootState.stateId, [
    eventStore.append(branch2Events[0])
  ]);
  
  console.log(`Branch 2 created: ${branch2.stateId}`);
  console.log(`Branch 2 probability: ${branch2.probability.toFixed(3)}`);
  console.log(`Branch 2 legal: ${branch2.isLegal}\n`);
  
  // Get snapshot
  const snapshot = quantumField.getSnapshot();
  console.log(`Total states in superposition: ${snapshot.stateCount}`);
  console.log(`Legal states: ${snapshot.legalStates}`);
  console.log(`Illegal states: ${snapshot.illegalStates}`);
  console.log(`Total probability mass: ${snapshot.totalProbabilityMass.toFixed(3)}\n`);
  
  return quantumField;
}

// ── Example 2: Entanglement Tracking ─────────────────────────────────────────

async function example2_entanglement() {
  console.log('=== Example 2: Entanglement Tracking ===\n');
  
  const eventStore = createEventStore();
  const quantumField = createQuantumField(FAST_QUANTUM_CONFIG);
  
  // Scene 1: Setup - Plant the gun
  const setup = eventStore.append({
    op: { op: 'SEED_CLUE', clueId: 'chekhovs_gun', carrier: 'object' },
    storyTime: 100,
    presentationIndex: 0,
    realityLayer: 'diegetic',
    assertions: [],
    derivedFrom: [],
    createdBy: 'user_authored',
    sceneIdx: 0,
  });
  
  const rootState = await quantumField.initialize(eventStore);
  console.log(`Setup planted: chekhovs_gun`);
  console.log(`Entangled setups: ${Array.from(rootState.entangledSetups).join(', ')}\n`);
  
  // Branch A: Gun is used (proper payoff)
  const payoffA = eventStore.append({
    op: { op: 'PAYOFF_SETUP', setupId: 'chekhovs_gun', payoffEventId: 'payoff_a' },
    storyTime: 500,
    presentationIndex: 1,
    realityLayer: 'diegetic',
    assertions: [],
    derivedFrom: [setup.eventId],
    createdBy: 'user_authored',
    sceneIdx: 5,
  });
  
  const branchA = await quantumField.branch(rootState.stateId, [payoffA]);
  console.log(`Branch A (gun used): ${branchA.stateId}`);
  console.log(`Branch A probability: ${branchA.probability.toFixed(3)}`);
  console.log(`Branch A legal: ${branchA.isLegal}`);
  console.log(`Branch A payoffs: ${Array.from(branchA.entangledPayoffs).join(', ')}\n`);
  
  // Branch B: Gun never used (unpaid setup - should have lower probability)
  const branchB = await quantumField.branch(rootState.stateId, [
    eventStore.append({
      op: { op: 'ADD_FACT', fact: { factId: 'ending', content: 'Story ends', addedAtTurn: 5 } },
      storyTime: 500,
      presentationIndex: 1,
      realityLayer: 'diegetic',
      assertions: [],
      derivedFrom: [setup.eventId],
      createdBy: 'user_authored',
      sceneIdx: 5,
    })
  ]);
  
  console.log(`Branch B (gun unused): ${branchB.stateId}`);
  console.log(`Branch B probability: ${branchB.probability.toFixed(3)}`);
  console.log(`Branch B legal: ${branchB.isLegal}\n`);
  
  // Get entanglement graph
  const entanglement = quantumField.getEntanglementGraph();
  console.log(`Total setups: ${entanglement.totalSetups}`);
  console.log(`Resolved setups: ${entanglement.resolvedSetups}`);
  console.log(`Unresolved setups: ${entanglement.unresolvedSetups}`);
  console.log(`Average setup→payoff distance: ${entanglement.avgDistance.toFixed(1)} scenes\n`);
  
  return quantumField;
}

// ── Example 3: Wavefunction Collapse ─────────────────────────────────────────

async function example3_collapse() {
  console.log('=== Example 3: Wavefunction Collapse ===\n');
  
  const eventStore = createEventStore();
  const quantumField = createQuantumField(FAST_QUANTUM_CONFIG);
  
  // Create root state
  eventStore.append({
    op: { op: 'ADD_FACT', fact: { factId: 'start', content: 'Story begins', addedAtTurn: 1 } },
    storyTime: 0,
    presentationIndex: 0,
    realityLayer: 'diegetic',
    assertions: [],
    derivedFrom: [],
    createdBy: 'user_authored',
    sceneIdx: 0,
  });
  
  const rootState = await quantumField.initialize(eventStore);
  
  // Create multiple branches
  for (let i = 0; i < 5; i++) {
    await quantumField.branch(rootState.stateId, [
      eventStore.append({
        op: { op: 'ADD_FACT', fact: { factId: `choice_${i}`, content: `Path ${i}`, addedAtTurn: 2 } },
        storyTime: 100 + i * 10,
        presentationIndex: 1,
        realityLayer: 'diegetic',
        assertions: [],
        derivedFrom: [],
        createdBy: 'user_authored',
        sceneIdx: 1,
      })
    ]);
  }
  
  console.log(`Created 5 branches from root state`);
  console.log(`States before collapse: ${quantumField.size()}\n`);
  
  // Get top states
  const topStates = quantumField.getTopStates(3);
  console.log('Top 3 states by probability:');
  topStates.forEach((state, idx) => {
    console.log(`  ${idx + 1}. ${state.stateId.substring(0, 8)}... (p=${state.probability.toFixed(3)})`);
  });
  console.log();
  
  // User chooses highest probability state
  const chosenStateId = topStates[0].stateId;
  const collapseResult = quantumField.collapse(chosenStateId);
  
  console.log(`Collapsed to state: ${chosenStateId.substring(0, 8)}...`);
  console.log(`Probability of chosen state: ${collapseResult.probabilityOfChosen.toFixed(3)}`);
  console.log(`States before collapse: ${collapseResult.totalStatesBeforeCollapse}`);
  console.log(`States pruned: ${collapseResult.prunedStates.length}`);
  console.log(`States after collapse: ${quantumField.size()}\n`);
  
  console.log('Entanglement changes:');
  console.log(`  Resolved setups: ${collapseResult.entanglementChanges.resolvedSetups.length}`);
  console.log(`  Introduced setups: ${collapseResult.entanglementChanges.introducedSetups.length}`);
  console.log(`  Broken entanglements: ${collapseResult.entanglementChanges.brokenEntanglements.length}\n`);
  
  return quantumField;
}

// ── Example 4: Setup Change Propagation ──────────────────────────────────────

async function example4_propagation() {
  console.log('=== Example 4: Setup Change Propagation ===\n');
  
  const eventStore = createEventStore();
  const quantumField = createQuantumField(FAST_QUANTUM_CONFIG);
  
  // Create initial setup
  const originalSetup = eventStore.append({
    op: { op: 'SEED_CLUE', clueId: 'magic_ring', carrier: 'object' },
    storyTime: 100,
    presentationIndex: 0,
    realityLayer: 'diegetic',
    assertions: [],
    derivedFrom: [],
    createdBy: 'user_authored',
    sceneIdx: 0,
  });
  
  const rootState = await quantumField.initialize(eventStore);
  
  // Create branches that depend on the setup
  const branch1 = await quantumField.branch(rootState.stateId, [
    eventStore.append({
      op: { op: 'PAYOFF_SETUP', setupId: 'magic_ring', payoffEventId: 'payoff_1' },
      storyTime: 200,
      presentationIndex: 1,
      realityLayer: 'diegetic',
      assertions: [],
      derivedFrom: [originalSetup.eventId],
      createdBy: 'user_authored',
      sceneIdx: 2,
    })
  ]);
  
  const branch2 = await quantumField.branch(rootState.stateId, [
    eventStore.append({
      op: { op: 'PAYOFF_SETUP', setupId: 'magic_ring', payoffEventId: 'payoff_2' },
      storyTime: 300,
      presentationIndex: 1,
      realityLayer: 'diegetic',
      assertions: [],
      derivedFrom: [originalSetup.eventId],
      createdBy: 'user_authored',
      sceneIdx: 3,
    })
  ]);
  
  console.log(`Created 2 branches with payoffs for 'magic_ring'`);
  console.log(`Branch 1: ${branch1.stateId.substring(0, 8)}...`);
  console.log(`Branch 2: ${branch2.stateId.substring(0, 8)}...\n`);
  
  // Now change the setup (user edits Act 1)
  const modifiedSetup: NarrativeEvent = {
    ...originalSetup,
    op: { op: 'SEED_CLUE', clueId: 'cursed_ring', carrier: 'object' }, // Changed!
  };
  
  console.log('Propagating setup change from "magic_ring" to "cursed_ring"...\n');
  
  const revalidatedStates = await quantumField.propagateSetupChange('magic_ring', modifiedSetup);
  
  console.log(`Revalidated ${revalidatedStates.size} states:`);
  for (const stateId of revalidatedStates) {
    const state = quantumField.getState(stateId);
    if (state) {
      console.log(`  - ${stateId.substring(0, 8)}... (legal: ${state.isLegal})`);
      if (state.validationErrors.length > 0) {
        console.log(`    Errors: ${state.validationErrors.join(', ')}`);
      }
    }
  }
  console.log();
  
  return quantumField;
}

// ── Performance Test ──────────────────────────────────────────────────────────

async function performanceTest() {
  console.log('=== Performance Test ===\n');
  
  const eventStore = createEventStore();
  
  // Test with 100 states
  console.log('Testing with 100 states (target: <10ms)...');
  const field100 = createQuantumField(FAST_QUANTUM_CONFIG);
  
  eventStore.append({
    op: { op: 'ADD_FACT', fact: { factId: 'root', content: 'Root', addedAtTurn: 1 } },
    storyTime: 0,
    presentationIndex: 0,
    realityLayer: 'diegetic',
    assertions: [],
    derivedFrom: [],
    createdBy: 'user_authored',
    sceneIdx: 0,
  });
  
  const root = await field100.initialize(eventStore);
  
  const start100 = Date.now();
  for (let i = 0; i < 99; i++) {
    await field100.branch(root.stateId, [
      eventStore.append({
        op: { op: 'ADD_FACT', fact: { factId: `state_${i}`, content: `State ${i}`, addedAtTurn: 2 } },
        storyTime: 100 + i,
        presentationIndex: 1,
        realityLayer: 'diegetic',
        assertions: [],
        derivedFrom: [],
        createdBy: 'system_inferred',
        sceneIdx: 1,
      })
    ]);
  }
  const time100 = Date.now() - start100;
  
  const snapshot100 = field100.getSnapshot();
  console.log(`  States created: ${snapshot100.stateCount}`);
  console.log(`  Time taken: ${time100}ms`);
  console.log(`  Validation time: ${snapshot100.performance.validationTimeMs}ms`);
  console.log(`  Target met: ${time100 < 10 ? '✓ YES' : '✗ NO'}\n`);
  
  // Test with 1000 states
  console.log('Testing with 1000 states (target: <100ms)...');
  const field1000 = createQuantumField(DEFAULT_QUANTUM_CONFIG);
  await field1000.initialize(eventStore);
  
  const start1000 = Date.now();
  for (let i = 0; i < 999; i++) {
    await field1000.branch(root.stateId, [
      eventStore.append({
        op: { op: 'ADD_FACT', fact: { factId: `big_${i}`, content: `Big ${i}`, addedAtTurn: 2 } },
        storyTime: 100 + i,
        presentationIndex: 1,
        realityLayer: 'diegetic',
        assertions: [],
        derivedFrom: [],
        createdBy: 'system_inferred',
        sceneIdx: 1,
      })
    ]);
  }
  const time1000 = Date.now() - start1000;
  
  const snapshot1000 = field1000.getSnapshot();
  console.log(`  States created: ${snapshot1000.stateCount}`);
  console.log(`  Time taken: ${time1000}ms`);
  console.log(`  Validation time: ${snapshot1000.performance.validationTimeMs}ms`);
  console.log(`  Target met: ${time1000 < 100 ? '✓ YES' : '✗ NO'}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Quantum Narrative Field — Example Usage                    ║');
  console.log('║   StoryMachine V5.0                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    await example1_basicSuperposition();
    console.log('─'.repeat(65) + '\n');
    
    await example2_entanglement();
    console.log('─'.repeat(65) + '\n');
    
    await example3_collapse();
    console.log('─'.repeat(65) + '\n');
    
    await example4_propagation();
    console.log('─'.repeat(65) + '\n');
    
    await performanceTest();
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   All examples completed successfully! ✓                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  example1_basicSuperposition,
  example2_entanglement,
  example3_collapse,
  example4_propagation,
  performanceTest,
};
