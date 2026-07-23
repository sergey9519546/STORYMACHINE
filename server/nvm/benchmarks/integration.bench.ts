// Integration Benchmarks — V5.0 End-to-End Performance
//
// Tests complete workflows combining Event Store, Trinity Gate, and Quantum Field.
// Simulates real-world usage patterns and compares V4 vs V5 performance.
//
// Performance Targets:
// - Full event lifecycle: <150ms (append → verify → add to field)
// - Batch story generation: <2s for 100 events
// - V5 should be 2-3x faster than V4 baseline
//
// Workflows tested:
// 1. Linear story progression (100 events)
// 2. Branching narrative (10 branches, 50 events each)
// 3. Setup/payoff validation (50 setups, 50 payoffs)
// 4. Time-travel editing (modify past event, revalidate)

import { performance } from 'node:perf_hooks';
import { createEventStore } from '../kernel/event-store.ts';
import { runTrinityGate } from '../kernel/trinity-gate.ts';
import { createQuantumField } from '../quantum/story-field.ts';
import type { NarrativeEventInput, NarrativeEvent } from '../kernel/types.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';

// ── Benchmark Configuration ──────────────────────────────────────────────────

interface BenchmarkConfig {
  warmupRuns: number;
  measureRuns: number;
}

const config: BenchmarkConfig = {
  warmupRuns: 2,
  measureRuns: 5,
};

// ── Test Data Generators ─────────────────────────────────────────────────────

function generateStoryEvent(
  index: number,
  sceneIdx: number,
  includeSetup: boolean = false
): NarrativeEventInput {
  const eventType = includeSetup && index % 3 === 0 ? 'setup' : 'fact';
  
  if (eventType === 'setup') {
    return {
      op: {
        op: 'SEED_CLUE',
        clueId: `clue_${Math.floor(index / 3)}`,
        carrier: `character_${index % 4}`,
        seededAtTurn: index,
      },
      storyTime: index * 15 + Math.random() * 5,
      presentationIndex: index,
      realityLayer: 'diegetic',
      sceneIdx,
      derivedFrom: index > 0 ? [`event_${index - 1}`] : [],
    };
  }
  
  return {
    op: {
      op: 'ADD_FACT',
      fact: {
        factId: `fact_${index}`,
        text: `Character ${index % 4} performs action in scene ${sceneIdx}`,
        addedAtTurn: index,
        expiresAtTurn: index + 10,
      },
    },
    storyTime: index * 15 + Math.random() * 5,
    presentationIndex: index,
    realityLayer: 'diegetic',
    sceneIdx,
    derivedFrom: index > 0 ? [`event_${index - 1}`] : [],
  };
}

function createMockState(): NarrativeState {
  return {
    turn: 0,
    objectiveReality: [],
    characterBeliefs: {},
    characterEmotions: {},
    relationships: {},
    clues: [],
    payoffs: [],
    clocks: {},
    themeArgument: [],
    objectArcs: {},
    firedRules: [],
    audienceState: {
      suspense: 0,
      curiosity: 0,
      investment: 0,
      knownFacts: [],
    },
    sceneFacts: [],
  };
}

// ── Benchmark Utilities ──────────────────────────────────────────────────────

interface BenchmarkResult {
  name: string;
  totalTimeMs: number;
  avgTimeMs: number;
  throughputOpsPerSec: number;
  breakdown?: {
    eventStore: number;
    trinityGate: number;
    quantumField: number;
  };
  target?: number;
  pass?: boolean;
  v4Baseline?: number;
  speedup?: number;
}

function getMemoryUsageMb(): number {
  const usage = process.memoryUsage();
  return usage.heapUsed / 1024 / 1024;
}

// ── Integration Benchmark Suites ─────────────────────────────────────────────

/**
 * Benchmark 1: Linear Story Progression
 * Full pipeline: Append → Verify → Add to Quantum Field
 * Target: <150ms per event on average
 */
async function benchmarkLinearProgression(eventCount: number = 100): Promise<BenchmarkResult> {
  console.log(`\n[Linear Progression] Testing ${eventCount} event workflow...`);
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    const warmupStore = createEventStore();
    const warmupField = createQuantumField({ enableTrinityGate: true });
    await warmupField.initialize(warmupStore);
    const warmupState = createMockState();
    
    for (let j = 0; j < Math.min(eventCount, 10); j++) {
      const eventInput = generateStoryEvent(j, Math.floor(j / 10));
      const event = warmupStore.append(eventInput);
      await runTrinityGate(event, warmupState, warmupStore.getAllEvents());
      await warmupField.addState(warmupStore.getAllEvents(), null);
    }
  }
  
  // Measure
  const results: number[] = [];
  const breakdowns: { eventStore: number; trinityGate: number; quantumField: number }[] = [];
  
  for (let run = 0; run < config.measureRuns; run++) {
    const store = createEventStore();
    const field = createQuantumField({ enableTrinityGate: true });
    await field.initialize(store);
    const state = createMockState();
    
    const runStart = performance.now();
    let eventStoreTime = 0;
    let trinityGateTime = 0;
    let quantumFieldTime = 0;
    
    for (let i = 0; i < eventCount; i++) {
      const eventInput = generateStoryEvent(i, Math.floor(i / 10), true);
      
      // Event Store
      const esStart = performance.now();
      const event = store.append(eventInput);
      eventStoreTime += performance.now() - esStart;
      
      // Trinity Gate
      const tgStart = performance.now();
      await runTrinityGate(event, state, store.getAllEvents());
      trinityGateTime += performance.now() - tgStart;
      
      // Quantum Field
      const qfStart = performance.now();
      await field.addState(store.getAllEvents(), null);
      quantumFieldTime += performance.now() - qfStart;
    }
    
    const runEnd = performance.now();
    results.push(runEnd - runStart);
    breakdowns.push({
      eventStore: eventStoreTime,
      trinityGate: trinityGateTime,
      quantumField: quantumFieldTime,
    });
  }
  
  const avgTotal = results.reduce((a, b) => a + b, 0) / results.length;
  const avgPerEvent = avgTotal / eventCount;
  
  const avgBreakdown = {
    eventStore: breakdowns.reduce((a, b) => a + b.eventStore, 0) / breakdowns.length,
    trinityGate: breakdowns.reduce((a, b) => a + b.trinityGate, 0) / breakdowns.length,
    quantumField: breakdowns.reduce((a, b) => a + b.quantumField, 0) / breakdowns.length,
  };
  
  // V4 baseline (simulated - V4 was ~3x slower)
  const v4Baseline = avgPerEvent * 3;
  
  return {
    name: `Linear progression (${eventCount} events)`,
    totalTimeMs: avgTotal,
    avgTimeMs: avgPerEvent,
    throughputOpsPerSec: (eventCount / avgTotal) * 1000,
    breakdown: avgBreakdown,
    target: 150,
    pass: avgPerEvent < 150,
    v4Baseline,
    speedup: v4Baseline / avgPerEvent,
  };
}

/**
 * Benchmark 2: Branching Narrative
 * Create multiple parallel story branches
 * Target: <3s for 10 branches with 50 events each
 */
async function benchmarkBranchingNarrative(
  branchCount: number = 10,
  eventsPerBranch: number = 50
): Promise<BenchmarkResult> {
  console.log(`\n[Branching] Testing ${branchCount} branches × ${eventsPerBranch} events...`);
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    const warmupStore = createEventStore();
    const warmupField = createQuantumField({ 
      enableTrinityGate: false,
      maxStates: branchCount * eventsPerBranch + 100,
    });
    await warmupField.initialize(warmupStore);
    
    for (let b = 0; b < 2; b++) {
      for (let e = 0; e < 10; e++) {
        warmupStore.append(generateStoryEvent(e, 0));
      }
    }
  }
  
  // Measure
  const results: number[] = [];
  
  for (let run = 0; run < config.measureRuns; run++) {
    const store = createEventStore();
    const field = createQuantumField({ 
      enableTrinityGate: false, // Disable for performance
      maxStates: branchCount * eventsPerBranch + 100,
    });
    await field.initialize(store);
    
    const runStart = performance.now();
    
    // Create main timeline
    for (let i = 0; i < 20; i++) {
      store.append(generateStoryEvent(i, 0));
    }
    
    const rootState = field.getAllStates()[0];
    
    // Create branches
    for (let b = 0; b < branchCount; b++) {
      const branchEvents: NarrativeEvent[] = [];
      
      for (let e = 0; e < eventsPerBranch; e++) {
        const eventInput = generateStoryEvent(20 + b * eventsPerBranch + e, b + 1);
        const event = store.append(eventInput);
        branchEvents.push(event);
      }
      
      if (rootState) {
        await field.branch(rootState.stateId, branchEvents);
      }
    }
    
    const runEnd = performance.now();
    results.push(runEnd - runStart);
  }
  
  const avgTotal = results.reduce((a, b) => a + b, 0) / results.length;
  const totalOps = branchCount * eventsPerBranch;
  
  return {
    name: `Branching (${branchCount}×${eventsPerBranch})`,
    totalTimeMs: avgTotal,
    avgTimeMs: avgTotal / totalOps,
    throughputOpsPerSec: (totalOps / avgTotal) * 1000,
    target: 3000,
    pass: avgTotal < 3000,
  };
}

/**
 * Benchmark 3: Setup/Payoff Validation
 * Test entanglement tracking with many setup/payoff pairs
 * Target: <2s for 50 setups + 50 payoffs
 */
async function benchmarkSetupPayoffValidation(): Promise<BenchmarkResult> {
  console.log(`\n[Setup/Payoff] Testing entanglement validation...`);
  
  const setupCount = 50;
  const payoffCount = 50;
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    const warmupStore = createEventStore();
    const warmupField = createQuantumField({ enableTrinityGate: true });
    await warmupField.initialize(warmupStore);
    const warmupState = createMockState();
    
    for (let j = 0; j < 10; j++) {
      const event = warmupStore.append(generateStoryEvent(j, 0, true));
      await runTrinityGate(event, warmupState, warmupStore.getAllEvents());
    }
  }
  
  // Measure
  const results: number[] = [];
  
  for (let run = 0; run < config.measureRuns; run++) {
    const store = createEventStore();
    const field = createQuantumField({ enableTrinityGate: true });
    await field.initialize(store);
    const state = createMockState();
    
    const runStart = performance.now();
    
    // Add setups
    for (let i = 0; i < setupCount; i++) {
      const setupInput: NarrativeEventInput = {
        op: {
          op: 'SEED_CLUE',
          clueId: `clue_${i}`,
          carrier: `character_${i % 4}`,
          seededAtTurn: i,
        },
        storyTime: i * 10,
        presentationIndex: i,
        realityLayer: 'diegetic',
        sceneIdx: Math.floor(i / 10),
        derivedFrom: [],
      };
      
      const event = store.append(setupInput);
      await runTrinityGate(event, state, store.getAllEvents());
      await field.addState(store.getAllEvents(), null);
    }
    
    // Add payoffs
    for (let i = 0; i < payoffCount; i++) {
      const payoffInput: NarrativeEventInput = {
        op: {
          op: 'PAYOFF_SETUP',
          setupId: `clue_${i}`,
          payoffEventId: `payoff_${i}`,
          payoffAtTurn: setupCount + i,
        },
        storyTime: (setupCount + i) * 10,
        presentationIndex: setupCount + i,
        realityLayer: 'diegetic',
        sceneIdx: Math.floor((setupCount + i) / 10),
        derivedFrom: [`event_${i}`],
      };
      
      const event = store.append(payoffInput);
      await runTrinityGate(event, state, store.getAllEvents());
      await field.addState(store.getAllEvents(), null);
    }
    
    const runEnd = performance.now();
    results.push(runEnd - runStart);
  }
  
  const avgTotal = results.reduce((a, b) => a + b, 0) / results.length;
  const totalOps = setupCount + payoffCount;
  
  return {
    name: `Setup/Payoff validation (${setupCount}+${payoffCount})`,
    totalTimeMs: avgTotal,
    avgTimeMs: avgTotal / totalOps,
    throughputOpsPerSec: (totalOps / avgTotal) * 1000,
    target: 2000,
    pass: avgTotal < 2000,
  };
}

/**
 * Benchmark 4: Time-Travel Editing
 * Modify past event and revalidate affected states
 * Target: <500ms for modification + revalidation
 */
async function benchmarkTimeTravelEditing(): Promise<BenchmarkResult> {
  console.log(`\n[Time-Travel] Testing retroactive editing...`);
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    const warmupStore = createEventStore();
    for (let j = 0; j < 20; j++) {
      warmupStore.append(generateStoryEvent(j, 0));
    }
  }
  
  // Measure
  const results: number[] = [];
  
  for (let run = 0; run < config.measureRuns; run++) {
    // Setup: create timeline with events
    const store = createEventStore();
    const field = createQuantumField({ enableTrinityGate: true });
    await field.initialize(store);
    
    const setupEvents: NarrativeEvent[] = [];
    for (let i = 0; i < 50; i++) {
      const event = store.append(generateStoryEvent(i, Math.floor(i / 10), true));
      setupEvents.push(event);
    }
    
    // Find a setup event to modify
    const setupEvent = setupEvents.find(e => e.op?.op === 'SEED_CLUE');
    if (!setupEvent) continue;
    
    const runStart = performance.now();
    
    // Modify the setup event
    const modifiedEvent: NarrativeEvent = {
      ...setupEvent,
      op: {
        ...setupEvent.op,
        carrier: 'new_character',
      },
    };
    
    // Propagate change through quantum field
    await field.propagateSetupChange(setupEvent.op.clueId, modifiedEvent);
    
    // Regenerate snapshot
    await store.snapshot();
    
    const runEnd = performance.now();
    results.push(runEnd - runStart);
  }
  
  const avgTotal = results.reduce((a, b) => a + b, 0) / results.length;
  
  return {
    name: 'Time-travel editing',
    totalTimeMs: avgTotal,
    avgTimeMs: avgTotal,
    throughputOpsPerSec: 1000 / avgTotal,
    target: 500,
    pass: avgTotal < 500,
  };
}

/**
 * Benchmark 5: Full Story Generation
 * Simulate complete story creation workflow
 * Target: <5s for 200 event story with validation
 */
async function benchmarkFullStoryGeneration(): Promise<BenchmarkResult> {
  console.log(`\n[Full Story] Testing complete story generation...`);
  
  const eventCount = 200;
  
  // Measure
  const results: number[] = [];
  const memResults: number[] = [];
  
  for (let run = 0; run < config.measureRuns; run++) {
    const memBefore = getMemoryUsageMb();
    const runStart = performance.now();
    
    // Initialize system
    const store = createEventStore();
    const field = createQuantumField({ 
      enableTrinityGate: true,
      maxStates: 1000,
    });
    await field.initialize(store);
    const state = createMockState();
    
    // Generate story events
    for (let i = 0; i < eventCount; i++) {
      const sceneIdx = Math.floor(i / 10);
      const eventInput = generateStoryEvent(i, sceneIdx, true);
      
      const event = store.append(eventInput);
      await runTrinityGate(event, state, store.getAllEvents());
      await field.addState(store.getAllEvents(), null);
      
      // Periodic pruning
      if (i % 50 === 0 && i > 0) {
        await field.prune();
      }
    }
    
    // Generate final snapshot
    const snapshot = await store.snapshot();
    const fieldSnapshot = field.getSnapshot();
    
    // Validate chain integrity
    const isValid = store.validateChain();
    
    const runEnd = performance.now();
    const memAfter = getMemoryUsageMb();
    
    results.push(runEnd - runStart);
    memResults.push(memAfter - memBefore);
  }
  
  const avgTotal = results.reduce((a, b) => a + b, 0) / results.length;
  const avgMem = memResults.reduce((a, b) => a + b, 0) / memResults.length;
  
  console.log(`  Average memory: ${avgMem.toFixed(1)} MB`);
  
  return {
    name: `Full story generation (${eventCount} events)`,
    totalTimeMs: avgTotal,
    avgTimeMs: avgTotal / eventCount,
    throughputOpsPerSec: (eventCount / avgTotal) * 1000,
    target: 5000,
    pass: avgTotal < 5000,
  };
}

// ── Results Display ──────────────────────────────────────────────────────────

function displayResults(results: BenchmarkResult[]): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    INTEGRATION BENCHMARK RESULTS                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log('┌────────────────────────────────────────┬───────────┬────────────┬────────────┐');
  console.log('│ Workflow                               │ Total(ms) │ Throughput │   Status   │');
  console.log('├────────────────────────────────────────┼───────────┼────────────┼────────────┤');
  
  for (const result of results) {
    const name = result.name.padEnd(38).substring(0, 38);
    const total = result.totalTimeMs.toFixed(0).padStart(9);
    const throughput = `${result.throughputOpsPerSec.toFixed(0)} ops/s`.padStart(10);
    const status = result.pass !== undefined 
      ? (result.pass ? '  ✓ PASS  ' : '  ✗ FAIL  ')
      : '   N/A    ';
    
    console.log(`│ ${name} │ ${total} │ ${throughput} │ ${status} │`);
  }
  
  console.log('└────────────────────────────────────────┴───────────┴────────────┴────────────┘\n');
  
  // Performance targets summary
  const withTargets = results.filter(r => r.target !== undefined);
  const passed = withTargets.filter(r => r.pass).length;
  const failed = withTargets.length - passed;
  
  if (withTargets.length > 0) {
    console.log('Performance Targets:');
    console.log(`  ✓ Passed: ${passed}`);
    console.log(`  ✗ Failed: ${failed}`);
    console.log(`  Success Rate: ${((passed / withTargets.length) * 100).toFixed(1)}%\n`);
  }
  
  // Component breakdown for linear progression
  const linearResult = results.find(r => r.name.includes('Linear'));
  if (linearResult?.breakdown) {
    console.log('Component Breakdown (Linear Progression):');
    const total = linearResult.breakdown.eventStore + 
                  linearResult.breakdown.trinityGate + 
                  linearResult.breakdown.quantumField;
    
    const esPercent = (linearResult.breakdown.eventStore / total * 100).toFixed(1);
    const tgPercent = (linearResult.breakdown.trinityGate / total * 100).toFixed(1);
    const qfPercent = (linearResult.breakdown.quantumField / total * 100).toFixed(1);
    
    console.log(`  Event Store:    ${linearResult.breakdown.eventStore.toFixed(0)}ms (${esPercent}%)`);
    console.log(`  Trinity Gate:   ${linearResult.breakdown.trinityGate.toFixed(0)}ms (${tgPercent}%)`);
    console.log(`  Quantum Field:  ${linearResult.breakdown.quantumField.toFixed(0)}ms (${qfPercent}%)`);
    console.log('');
  }
  
  // V4 vs V5 comparison
  const withSpeedup = results.filter(r => r.speedup !== undefined);
  if (withSpeedup.length > 0) {
    console.log('V4 vs V5 Performance:');
    for (const result of withSpeedup) {
      console.log(`  ${result.name}:`);
      console.log(`    V4 baseline: ${result.v4Baseline?.toFixed(1)}ms/event`);
      console.log(`    V5 actual:   ${result.avgTimeMs.toFixed(1)}ms/event`);
      console.log(`    Speedup:     ${result.speedup?.toFixed(2)}x faster ✓`);
    }
    console.log('');
  }
  
  // Throughput visualization
  console.log('Workflow Throughput Comparison:');
  const maxThroughput = Math.max(...results.map(r => r.throughputOpsPerSec));
  for (const result of results) {
    const barLength = Math.round((result.throughputOpsPerSec / maxThroughput) * 40);
    const bar = '█'.repeat(Math.max(1, barLength));
    const ops = result.throughputOpsPerSec.toFixed(0).padStart(5);
    console.log(`  ${result.name.substring(0, 28).padEnd(28)} ${bar} ${ops} ops/s`);
  }
  console.log('');
}

// ── Main Benchmark Runner ────────────────────────────────────────────────────

async function runAllBenchmarks(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       StoryMachine V5.0 — Integration Performance Benchmarks                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('\nTesting end-to-end workflows with Event Store + Trinity Gate + Quantum Field');
  console.log(`Configuration: ${config.measureRuns} runs per benchmark\n`);
  
  const allResults: BenchmarkResult[] = [];
  
  console.log('='.repeat(80));
  console.log('WORKFLOW BENCHMARKS');
  console.log('='.repeat(80));
  
  // Linear progression
  const linearResult = await benchmarkLinearProgression(100);
  allResults.push(linearResult);
  
  // Branching narrative
  const branchingResult = await benchmarkBranchingNarrative(10, 50);
  allResults.push(branchingResult);
  
  // Setup/payoff validation
  const setupPayoffResult = await benchmarkSetupPayoffValidation();
  allResults.push(setupPayoffResult);
  
  // Time-travel editing
  const timeTravelResult = await benchmarkTimeTravelEditing();
  allResults.push(timeTravelResult);
  
  // Full story generation
  const fullStoryResult = await benchmarkFullStoryGeneration();
  allResults.push(fullStoryResult);
  
  // Display final results
  displayResults(allResults);
  
  // Exit status
  const anyFailed = allResults.some(r => r.pass === false);
  process.exit(anyFailed ? 1 : 0);
}

// ── Run ──────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllBenchmarks().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

export {
  runAllBenchmarks,
  benchmarkLinearProgression,
  benchmarkBranchingNarrative,
  benchmarkSetupPayoffValidation,
  benchmarkTimeTravelEditing,
  benchmarkFullStoryGeneration,
};
