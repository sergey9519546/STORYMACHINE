// Quantum Story Field Benchmarks — V5.0 Performance Validation
//
// Performance Targets:
// - 100 states: <10ms for branch creation & validation
// - 1000 states: <100ms for branch creation & validation
// - Probability calculation: <5ms for 1000 states
// - Entanglement propagation: <50ms for complex graphs
// - Memory usage: <100MB for 1000 states
//
// Tests quantum narrative mechanics:
// - Superposition management (adding/removing states)
// - Wavefunction collapse (user decisions)
// - Entanglement tracking (setup/payoff relationships)
// - Probability calculation and normalization

import { performance } from 'node:perf_hooks';
import { QuantumNarrativeField, createQuantumField } from '../../quantum/story-field.ts';
import { createEventStore } from '../../kernel/event-store.ts';
import type { NarrativeEventInput } from '../../kernel/types.ts';
import type { QuantumFieldConfig } from '../../quantum/types.ts';

// ── Benchmark Configuration ──────────────────────────────────────────────────

interface BenchmarkConfig {
  warmupRuns: number;
  measureRuns: number;
  stateSizes: number[];
}

const config: BenchmarkConfig = {
  warmupRuns: 3,
  measureRuns: 10,
  stateSizes: [10, 100, 500, 1000],
};

// ── Test Data Generators ─────────────────────────────────────────────────────

function generateEvent(index: number, includeSetup: boolean = false): NarrativeEventInput {
  if (includeSetup && index % 5 === 0) {
    return {
      op: {
        op: 'SEED_CLUE',
        clueId: `clue_${Math.floor(index / 5)}`,
        carrier: `character_${index % 3}`,
        seededAtTurn: index,
      },
      storyTime: index * 10,
      presentationIndex: index,
      realityLayer: 'diegetic',
      sceneIdx: Math.floor(index / 10),
      derivedFrom: [],
    };
  }
  
  if (includeSetup && index % 7 === 0) {
    return {
      op: {
        op: 'PAYOFF_SETUP',
        setupId: `clue_${Math.floor((index - 5) / 5)}`,
        payoffEventId: `payoff_${index}`,
        payoffAtTurn: index,
      },
      storyTime: index * 10,
      presentationIndex: index,
      realityLayer: 'diegetic',
      sceneIdx: Math.floor(index / 10),
      derivedFrom: [`event_${index - 5}`],
    };
  }
  
  return {
    op: {
      op: 'ADD_FACT',
      fact: {
        factId: `fact_${index}`,
        text: `Narrative fact #${index}`,
        addedAtTurn: index,
        expiresAtTurn: index + 10,
      },
    },
    storyTime: index * 10,
    presentationIndex: index,
    realityLayer: 'diegetic',
    sceneIdx: Math.floor(index / 10),
    derivedFrom: index > 0 ? [`event_${index - 1}`] : [],
  };
}

function generateEventBatch(count: number, includeSetups: boolean = false): NarrativeEventInput[] {
  return Array.from({ length: count }, (_, i) => generateEvent(i, includeSetups));
}

// ── Benchmark Utilities ──────────────────────────────────────────────────────

interface BenchmarkResult {
  name: string;
  operations: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  p50Ms: number;
  p95Ms: number;
  opsPerSec: number;
  memoryMb?: number;
  target?: number;
  pass?: boolean;
}

async function measureOperation<T>(
  operation: () => T | Promise<T>,
  runs: number
): Promise<{ times: number[]; results: T[] }> {
  const times: number[] = [];
  const results: T[] = [];
  
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    
    times.push(end - start);
    results.push(result);
  }
  
  return { times, results };
}

function calculatePercentile(sorted: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function computeStats(times: number[]) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  return {
    avgTimeMs: sum / sorted.length,
    minTimeMs: sorted[0],
    maxTimeMs: sorted[sorted.length - 1],
    p50Ms: calculatePercentile(sorted, 50),
    p95Ms: calculatePercentile(sorted, 95),
  };
}

function getMemoryUsageMb(): number {
  const usage = process.memoryUsage();
  return usage.heapUsed / 1024 / 1024;
}

// ── Benchmark Suites ─────────────────────────────────────────────────────────

/**
 * Benchmark 1: State Creation & Addition
 * Target: <10ms for 100 states, <100ms for 1000 states
 */
async function benchmarkStateCreation(stateCount: number): Promise<BenchmarkResult> {
  console.log(`\n[State Creation] Testing with ${stateCount} states...`);
  
  const fieldConfig: Partial<QuantumFieldConfig> = {
    maxStates: stateCount + 100,
    enableTrinityGate: false, // Disable for pure performance test
  };
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    const warmupField = createQuantumField(fieldConfig);
    const warmupStore = createEventStore();
    await warmupField.initialize(warmupStore);
    
    for (let j = 0; j < Math.min(stateCount, 10); j++) {
      const events = warmupStore.getAllEvents();
      await warmupField.addState(events, null);
    }
  }
  
  // Measure
  const memBefore = getMemoryUsageMb();
  const start = performance.now();
  
  const field = createQuantumField(fieldConfig);
  const store = createEventStore();
  await field.initialize(store);
  
  // Add states with slight variations
  for (let i = 0; i < stateCount; i++) {
    const eventInput = generateEvent(i);
    const event = store.append(eventInput);
    const events = store.getAllEvents();
    await field.addState(events, null);
  }
  
  const end = performance.now();
  const memAfter = getMemoryUsageMb();
  
  const totalTimeMs = end - start;
  const avgTimeMs = totalTimeMs / stateCount;
  
  const target = stateCount <= 100 ? 10 : 100;
  
  return {
    name: `Create & add ${stateCount} states`,
    operations: stateCount,
    avgTimeMs,
    minTimeMs: avgTimeMs,
    maxTimeMs: avgTimeMs,
    p50Ms: avgTimeMs,
    p95Ms: avgTimeMs,
    opsPerSec: (stateCount / totalTimeMs) * 1000,
    memoryMb: memAfter - memBefore,
    target,
    pass: totalTimeMs < target,
  };
}

/**
 * Benchmark 2: Branch Creation
 * Target: <10ms per branch for 100 states, <100ms for 1000 states
 */
async function benchmarkBranching(existingStates: number): Promise<BenchmarkResult> {
  console.log(`\n[Branching] Testing branch creation with ${existingStates} existing states...`);
  
  // Setup: create field with existing states
  const field = createQuantumField({ 
    maxStates: existingStates + 100,
    enableTrinityGate: false,
  });
  const store = createEventStore();
  await field.initialize(store);
  
  for (let i = 0; i < existingStates; i++) {
    const eventInput = generateEvent(i);
    store.append(eventInput);
  }
  
  const rootState = field.getAllStates()[0];
  if (!rootState) throw new Error('No root state');
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    const newEvent = store.append(generateEvent(existingStates + 1000 + i));
    await field.branch(rootState.stateId, [newEvent]);
  }
  
  // Measure
  const { times } = await measureOperation(
    async () => {
      const newEvent = store.append(generateEvent(existingStates + 2000 + Math.random() * 1000));
      return await field.branch(rootState.stateId, [newEvent]);
    },
    config.measureRuns
  );
  
  const stats = computeStats(times);
  const target = existingStates <= 100 ? 10 : 100;
  
  return {
    name: `Branch from ${existingStates} states`,
    operations: config.measureRuns,
    ...stats,
    opsPerSec: 1000 / stats.avgTimeMs,
    target,
    pass: stats.avgTimeMs < target,
  };
}

/**
 * Benchmark 3: Probability Calculation & Normalization
 * Target: <5ms for 1000 states
 */
async function benchmarkProbabilityCalculation(stateCount: number): Promise<BenchmarkResult> {
  console.log(`\n[Probability] Testing normalization with ${stateCount} states...`);
  
  // Setup
  const field = createQuantumField({ 
    maxStates: stateCount + 100,
    enableTrinityGate: false,
  });
  const store = createEventStore();
  await field.initialize(store);
  
  for (let i = 0; i < stateCount; i++) {
    const eventInput = generateEvent(i);
    store.append(eventInput);
    const events = store.getAllEvents();
    await field.addState(events, null);
  }
  
  // Measure snapshot retrieval (which includes probability info)
  const { times } = await measureOperation(
    () => field.getSnapshot(),
    config.measureRuns
  );
  
  const stats = computeStats(times);
  
  return {
    name: `Probability calc (${stateCount} states)`,
    operations: config.measureRuns,
    ...stats,
    opsPerSec: 1000 / stats.avgTimeMs,
    target: 5,
    pass: stats.avgTimeMs < 5,
  };
}

/**
 * Benchmark 4: Wavefunction Collapse
 * Target: <20ms including entanglement analysis
 */
async function benchmarkCollapse(stateCount: number): Promise<BenchmarkResult> {
  console.log(`\n[Collapse] Testing wavefunction collapse with ${stateCount} states...`);
  
  // Setup
  const field = createQuantumField({ 
    maxStates: stateCount + 100,
    enableTrinityGate: false,
  });
  const store = createEventStore();
  await field.initialize(store);
  
  for (let i = 0; i < stateCount; i++) {
    const eventInput = generateEvent(i, true); // Include setups
    store.append(eventInput);
    const events = store.getAllEvents();
    await field.addState(events, null);
  }
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    const testField = createQuantumField({ maxStates: 100, enableTrinityGate: false });
    const testStore = createEventStore();
    await testField.initialize(testStore);
    for (let j = 0; j < 10; j++) {
      testStore.append(generateEvent(j));
      await testField.addState(testStore.getAllEvents(), null);
    }
    const states = testField.getAllStates();
    if (states.length > 0) {
      testField.collapse(states[0].stateId);
    }
  }
  
  // Measure
  const { times } = await measureOperation(
    () => {
      // Need fresh field for each collapse
      const freshField = createQuantumField({ maxStates: stateCount + 100, enableTrinityGate: false });
      const freshStore = createEventStore();
      const setupPromise = (async () => {
        await freshField.initialize(freshStore);
        for (let i = 0; i < stateCount; i++) {
          const eventInput = generateEvent(i, true);
          freshStore.append(eventInput);
          await freshField.addState(freshStore.getAllEvents(), null);
        }
        const states = freshField.getAllStates();
        return freshField.collapse(states[Math.floor(states.length / 2)].stateId);
      })();
      return setupPromise;
    },
    Math.min(config.measureRuns, 5) // Fewer runs due to setup overhead
  );
  
  const stats = computeStats(times);
  
  return {
    name: `Collapse (${stateCount} states)`,
    operations: Math.min(config.measureRuns, 5),
    ...stats,
    opsPerSec: 1000 / stats.avgTimeMs,
    target: 50, // More lenient due to setup
    pass: stats.avgTimeMs < 50,
  };
}

/**
 * Benchmark 5: Entanglement Propagation
 * Target: <50ms for complex entanglement graphs
 */
async function benchmarkEntanglementPropagation(): Promise<BenchmarkResult> {
  console.log(`\n[Entanglement] Testing setup change propagation...`);
  
  const stateCount = 100;
  
  // Setup: create field with entangled states
  const field = createQuantumField({ 
    maxStates: stateCount + 100,
    enableTrinityGate: true, // Enable for entanglement
  });
  const store = createEventStore();
  await field.initialize(store);
  
  // Create states with setup/payoff relationships
  const setupEvents: any[] = [];
  for (let i = 0; i < stateCount; i++) {
    const eventInput = generateEvent(i, true); // Include setups
    const event = store.append(eventInput);
    setupEvents.push(event);
    const events = store.getAllEvents();
    await field.addState(events, null);
  }
  
  // Find a setup event to modify
  const setupEvent = setupEvents.find(e => e.op?.op === 'SEED_CLUE');
  if (!setupEvent) {
    console.log('  [Warning] No setup events found, skipping');
    return {
      name: 'Entanglement propagation',
      operations: 0,
      avgTimeMs: 0,
      minTimeMs: 0,
      maxTimeMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      opsPerSec: 0,
    };
  }
  
  // Measure propagation
  const { times } = await measureOperation(
    () => field.propagateSetupChange(setupEvent.op.clueId, setupEvent),
    Math.min(config.measureRuns, 5)
  );
  
  const stats = computeStats(times);
  
  return {
    name: 'Entanglement propagation',
    operations: Math.min(config.measureRuns, 5),
    ...stats,
    opsPerSec: 1000 / stats.avgTimeMs,
    target: 50,
    pass: stats.avgTimeMs < 50,
  };
}

/**
 * Benchmark 6: State Pruning
 * Target: <30ms for 1000 states
 */
async function benchmarkPruning(stateCount: number): Promise<BenchmarkResult> {
  console.log(`\n[Pruning] Testing state pruning with ${stateCount} states...`);
  
  // Setup: create field at capacity
  const field = createQuantumField({ 
    maxStates: stateCount,
    pruningThreshold: 0.001,
    enableTrinityGate: false,
  });
  const store = createEventStore();
  await field.initialize(store);
  
  for (let i = 0; i < stateCount; i++) {
    const eventInput = generateEvent(i);
    store.append(eventInput);
    const events = store.getAllEvents();
    await field.addState(events, null);
  }
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    await field.prune();
  }
  
  // Measure
  const { times } = await measureOperation(
    () => field.prune(),
    config.measureRuns
  );
  
  const stats = computeStats(times);
  
  return {
    name: `Prune ${stateCount} states`,
    operations: config.measureRuns,
    ...stats,
    opsPerSec: 1000 / stats.avgTimeMs,
    target: 30,
    pass: stats.avgTimeMs < 30,
  };
}

/**
 * Benchmark 7: Query Operations
 */
async function benchmarkQueries(stateCount: number): Promise<BenchmarkResult[]> {
  console.log(`\n[Queries] Testing query operations with ${stateCount} states...`);
  
  const field = createQuantumField({ 
    maxStates: stateCount + 100,
    enableTrinityGate: false,
  });
  const store = createEventStore();
  await field.initialize(store);
  
  for (let i = 0; i < stateCount; i++) {
    const eventInput = generateEvent(i);
    store.append(eventInput);
    const events = store.getAllEvents();
    await field.addState(events, null);
  }
  
  const results: BenchmarkResult[] = [];
  
  // Query 1: Get all states
  const { times: getAllTimes } = await measureOperation(
    () => field.getAllStates(),
    config.measureRuns
  );
  const getAllStats = computeStats(getAllTimes);
  results.push({
    name: `Get all states (${stateCount})`,
    operations: config.measureRuns,
    ...getAllStats,
    opsPerSec: 1000 / getAllStats.avgTimeMs,
  });
  
  // Query 2: Get top N states
  const { times: getTopTimes } = await measureOperation(
    () => field.getTopStates(10),
    config.measureRuns
  );
  const getTopStats = computeStats(getTopTimes);
  results.push({
    name: `Get top 10 states (${stateCount})`,
    operations: config.measureRuns,
    ...getTopStats,
    opsPerSec: 1000 / getTopStats.avgTimeMs,
  });
  
  // Query 3: Get legal states only
  const { times: getLegalTimes } = await measureOperation(
    () => field.getLegalStates(),
    config.measureRuns
  );
  const getLegalStats = computeStats(getLegalTimes);
  results.push({
    name: `Get legal states (${stateCount})`,
    operations: config.measureRuns,
    ...getLegalStats,
    opsPerSec: 1000 / getLegalStats.avgTimeMs,
  });
  
  return results;
}

// ── Results Display ──────────────────────────────────────────────────────────

function displayResults(results: BenchmarkResult[]): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                  QUANTUM STORY FIELD BENCHMARK RESULTS                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log('┌────────────────────────────────────────┬─────────┬─────────┬─────────┬────────┐');
  console.log('│ Benchmark                              │ Avg(ms) │ P50(ms) │ P95(ms) │ Status │');
  console.log('├────────────────────────────────────────┼─────────┼─────────┼─────────┼────────┤');
  
  for (const result of results) {
    const name = result.name.padEnd(38).substring(0, 38);
    const avg = result.avgTimeMs.toFixed(1).padStart(7);
    const p50 = result.p50Ms.toFixed(1).padStart(7);
    const p95 = result.p95Ms.toFixed(1).padStart(7);
    const status = result.pass !== undefined 
      ? (result.pass ? '✓ PASS' : '✗ FAIL')
      : '  N/A ';
    
    console.log(`│ ${name} │ ${avg} │ ${p50} │ ${p95} │ ${status}  │`);
  }
  
  console.log('└────────────────────────────────────────┴─────────┴─────────┴─────────┴────────┘\n');
  
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
  
  // Memory usage
  const memResults = results.filter(r => r.memoryMb && r.memoryMb > 0);
  if (memResults.length > 0) {
    console.log('Memory Usage:');
    for (const result of memResults) {
      const memBar = '█'.repeat(Math.round((result.memoryMb || 0) / 5));
      console.log(`  ${result.name.substring(0, 30).padEnd(30)} ${memBar} ${result.memoryMb?.toFixed(1)} MB`);
    }
    console.log('');
  }
  
  // Throughput chart
  console.log('Throughput (operations/second):');
  const maxOps = Math.max(...results.map(r => r.opsPerSec));
  for (const result of results.filter(r => r.opsPerSec > 0).slice(0, 10)) {
    const barLength = Math.round((result.opsPerSec / maxOps) * 40);
    const bar = '█'.repeat(Math.max(1, barLength));
    const ops = result.opsPerSec.toFixed(0).padStart(6);
    console.log(`  ${result.name.substring(0, 28).padEnd(28)} ${bar} ${ops} ops/s`);
  }
  console.log('');
}

// ── Main Benchmark Runner ────────────────────────────────────────────────────

async function runAllBenchmarks(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        StoryMachine V5.0 — Quantum Field Performance Benchmarks              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('\nConfiguration:');
  console.log(`  Warmup runs: ${config.warmupRuns}`);
  console.log(`  Measure runs: ${config.measureRuns}`);
  console.log(`  State sizes: ${config.stateSizes.join(', ')}`);
  
  const allResults: BenchmarkResult[] = [];
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('STATE CREATION & MANAGEMENT');
  console.log('='.repeat(80));
  
  // State creation benchmarks
  for (const size of [100, 1000]) {
    const result = await benchmarkStateCreation(size);
    allResults.push(result);
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('BRANCHING OPERATIONS');
  console.log('='.repeat(80));
  
  // Branching benchmarks
  for (const size of [100, 1000]) {
    const result = await benchmarkBranching(size);
    allResults.push(result);
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('PROBABILITY & COLLAPSE');
  console.log('='.repeat(80));
  
  // Probability calculation
  for (const size of [100, 1000]) {
    const result = await benchmarkProbabilityCalculation(size);
    allResults.push(result);
  }
  
  // Wavefunction collapse
  const collapseResult = await benchmarkCollapse(100);
  allResults.push(collapseResult);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('ENTANGLEMENT & PRUNING');
  console.log('='.repeat(80));
  
  // Entanglement propagation
  const entanglementResult = await benchmarkEntanglementPropagation();
  allResults.push(entanglementResult);
  
  // Pruning
  const pruningResult = await benchmarkPruning(1000);
  allResults.push(pruningResult);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('QUERY OPERATIONS');
  console.log('='.repeat(80));
  
  // Query benchmarks
  const queryResults = await benchmarkQueries(1000);
  allResults.push(...queryResults);
  
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
  benchmarkStateCreation,
  benchmarkBranching,
  benchmarkCollapse,
  benchmarkEntanglementPropagation,
};
