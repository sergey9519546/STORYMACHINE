// Trinity Gate Benchmarks — V5.0 Verification Performance
//
// Performance Targets:
// - Single event verification: <100ms per event
// - Batch verification (10 events): <500ms total
// - Complex event verification: <200ms per event
//
// Tests three-layer verification orchestration:
// 1. Story Graph Verifier (structural coherence)
// 2. OWNE Verifier (world consistency + intentionality)
// 3. Pre-Flight Auditor (epistemic + possession + spatial)

import { performance } from 'node:perf_hooks';
import { runTrinityGate, quickVerify, verifyEventSequence } from '../trinity-gate.ts';
import { createEventStore } from '../event-store.ts';
import type { NarrativeEvent, NarrativeEventInput } from '../types.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';

// ── Benchmark Configuration ──────────────────────────────────────────────────

interface BenchmarkConfig {
  warmupRuns: number;
  measureRuns: number;
  eventComplexity: string[];
}

const config: BenchmarkConfig = {
  warmupRuns: 3,
  measureRuns: 20,
  eventComplexity: ['simple', 'medium', 'complex'],
};

// ── Test Data Generators ─────────────────────────────────────────────────────

function generateSimpleEvent(index: number): NarrativeEventInput {
  return {
    op: {
      op: 'ADD_FACT',
      fact: {
        factId: `fact_${index}`,
        text: `Simple fact #${index}`,
        addedAtTurn: index,
        expiresAtTurn: index + 5,
      },
    },
    storyTime: index * 10,
    presentationIndex: index,
    realityLayer: 'diegetic',
    sceneIdx: Math.floor(index / 10),
    derivedFrom: [],
  };
}

function generateMediumEvent(index: number): NarrativeEventInput {
  return {
    op: {
      op: 'SEED_CLUE',
      clueId: `clue_${index}`,
      carrier: `character_${index % 5}`,
      seededAtTurn: index,
    },
    storyTime: index * 10,
    presentationIndex: index,
    realityLayer: 'diegetic',
    sceneIdx: Math.floor(index / 10),
    derivedFrom: index > 0 ? [`event_${index - 1}`] : [],
  };
}

function generateComplexEvent(index: number): NarrativeEventInput {
  // Complex event with multiple dependencies and state changes
  return {
    op: {
      op: 'PAYOFF_SETUP',
      setupId: `setup_${Math.floor(index / 3)}`,
      payoffEventId: `payoff_${index}`,
      payoffAtTurn: index,
    },
    storyTime: index * 10,
    presentationIndex: index,
    realityLayer: 'diegetic',
    sceneIdx: Math.floor(index / 10),
    derivedFrom: [
      `event_${Math.max(0, index - 5)}`,
      `event_${Math.max(0, index - 3)}`,
      `event_${Math.max(0, index - 1)}`,
    ],
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
  operations: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSec: number;
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
  return sorted[index];
}

function computeStats(times: number[]): {
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
} {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  return {
    avgMs: sum / sorted.length,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    p50Ms: calculatePercentile(sorted, 50),
    p95Ms: calculatePercentile(sorted, 95),
    p99Ms: calculatePercentile(sorted, 99),
  };
}

// ── Benchmark Suites ─────────────────────────────────────────────────────────

/**
 * Benchmark 1: Single Event Verification
 * Target: <100ms per event
 */
async function benchmarkSingleEventVerification(
  complexity: 'simple' | 'medium' | 'complex'
): Promise<BenchmarkResult> {
  console.log(`\n[Single Event] Testing ${complexity} event verification...`);
  
  const eventGenerator = 
    complexity === 'simple' ? generateSimpleEvent :
    complexity === 'medium' ? generateMediumEvent :
    generateComplexEvent;
  
  // Setup
  const store = createEventStore();
  const setupEvents: NarrativeEvent[] = [];
  
  // Pre-populate with some events for context
  for (let i = 0; i < 50; i++) {
    const evt = store.append(generateSimpleEvent(i));
    setupEvents.push(evt);
  }
  
  const state = createMockState();
  
  // Event to verify
  const testEventInput = eventGenerator(51);
  const testEvent = store.append(testEventInput);
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    await runTrinityGate(testEvent, state, setupEvents);
  }
  
  // Measure
  const { times } = await measureOperation(
    () => runTrinityGate(testEvent, state, setupEvents),
    config.measureRuns
  );
  
  const stats = computeStats(times);
  
  return {
    name: `Verify ${complexity} event`,
    operations: config.measureRuns,
    ...stats,
    opsPerSec: 1000 / stats.avgMs,
    target: complexity === 'complex' ? 200 : 100,
    pass: complexity === 'complex' ? stats.avgMs < 200 : stats.avgMs < 100,
  };
}

/**
 * Benchmark 2: Quick Verification (Critical-Only)
 * Target: <50ms per event (faster path)
 */
async function benchmarkQuickVerification(): Promise<BenchmarkResult> {
  console.log(`\n[Quick Verify] Testing fast-path verification...`);
  
  const store = createEventStore();
  const setupEvents: NarrativeEvent[] = [];
  
  for (let i = 0; i < 50; i++) {
    const evt = store.append(generateSimpleEvent(i));
    setupEvents.push(evt);
  }
  
  const state = createMockState();
  const testEvent = store.append(generateSimpleEvent(51));
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    await quickVerify(testEvent, state, setupEvents);
  }
  
  // Measure
  const { times } = await measureOperation(
    () => quickVerify(testEvent, state, setupEvents),
    config.measureRuns
  );
  
  const stats = computeStats(times);
  
  return {
    name: 'Quick verify (critical-only)',
    operations: config.measureRuns,
    ...stats,
    opsPerSec: 1000 / stats.avgMs,
    target: 50,
    pass: stats.avgMs < 50,
  };
}

/**
 * Benchmark 3: Batch Verification
 * Target: <500ms for 10 events
 */
async function benchmarkBatchVerification(batchSize: number = 10): Promise<BenchmarkResult> {
  console.log(`\n[Batch Verify] Testing batch of ${batchSize} events...`);
  
  const store = createEventStore();
  const setupEvents: NarrativeEvent[] = [];
  
  for (let i = 0; i < 50; i++) {
    const evt = store.append(generateSimpleEvent(i));
    setupEvents.push(evt);
  }
  
  const state = createMockState();
  
  // Create batch of events to verify
  const batchEvents: NarrativeEvent[] = [];
  for (let i = 0; i < batchSize; i++) {
    const evt = store.append(generateMediumEvent(51 + i));
    batchEvents.push(evt);
  }
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    await verifyEventSequence(batchEvents, state, setupEvents);
  }
  
  // Measure
  const { times } = await measureOperation(
    () => verifyEventSequence(batchEvents, state, setupEvents),
    Math.min(config.measureRuns, 10) // Fewer runs for batch
  );
  
  const stats = computeStats(times);
  
  return {
    name: `Batch verify ${batchSize} events`,
    operations: Math.min(config.measureRuns, 10),
    ...stats,
    opsPerSec: (batchSize * 1000) / stats.avgMs,
    target: 500,
    pass: stats.avgMs < 500,
  };
}

/**
 * Benchmark 4: Verification With Growing Event History
 * Test how performance scales with event history size
 */
async function benchmarkScalability(): Promise<BenchmarkResult[]> {
  console.log(`\n[Scalability] Testing with varying event history sizes...`);
  
  const historySizes = [10, 100, 1000, 5000];
  const results: BenchmarkResult[] = [];
  
  for (const historySize of historySizes) {
    const store = createEventStore();
    const setupEvents: NarrativeEvent[] = [];
    
    // Build history
    for (let i = 0; i < historySize; i++) {
      const evt = store.append(generateSimpleEvent(i));
      setupEvents.push(evt);
    }
    
    const state = createMockState();
    const testEvent = store.append(generateSimpleEvent(historySize + 1));
    
    // Measure
    const { times } = await measureOperation(
      () => runTrinityGate(testEvent, state, setupEvents),
      Math.min(config.measureRuns, 10)
    );
    
    const stats = computeStats(times);
    
    results.push({
      name: `Verify with ${historySize} event history`,
      operations: Math.min(config.measureRuns, 10),
      ...stats,
      opsPerSec: 1000 / stats.avgMs,
    });
  }
  
  return results;
}

/**
 * Benchmark 5: Parallel Verification Overhead
 * Measure overhead of running three layers in parallel
 */
async function benchmarkParallelOverhead(): Promise<BenchmarkResult> {
  console.log(`\n[Parallel] Testing three-layer parallel execution...`);
  
  const store = createEventStore();
  const setupEvents: NarrativeEvent[] = [];
  
  for (let i = 0; i < 100; i++) {
    const evt = store.append(generateSimpleEvent(i));
    setupEvents.push(evt);
  }
  
  const state = createMockState();
  const testEvent = store.append(generateComplexEvent(101));
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    await runTrinityGate(testEvent, state, setupEvents, { enableLogging: false });
  }
  
  // Measure
  const { times } = await measureOperation(
    () => runTrinityGate(testEvent, state, setupEvents, { enableLogging: false }),
    config.measureRuns
  );
  
  const stats = computeStats(times);
  
  return {
    name: 'Three-layer parallel execution',
    operations: config.measureRuns,
    ...stats,
    opsPerSec: 1000 / stats.avgMs,
  };
}

// ── Results Display ──────────────────────────────────────────────────────────

function displayResults(results: BenchmarkResult[]): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    TRINITY GATE BENCHMARK RESULTS                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log('┌────────────────────────────────────────┬─────────┬─────────┬─────────┬────────┐');
  console.log('│ Benchmark                              │ Avg(ms) │ P50(ms) │ P99(ms) │ Status │');
  console.log('├────────────────────────────────────────┼─────────┼─────────┼─────────┼────────┤');
  
  for (const result of results) {
    const name = result.name.padEnd(38).substring(0, 38);
    const avg = result.avgTimeMs.toFixed(1).padStart(7);
    const p50 = result.p50Ms.toFixed(1).padStart(7);
    const p99 = result.p99Ms.toFixed(1).padStart(7);
    const status = result.pass !== undefined 
      ? (result.pass ? '✓ PASS' : '✗ FAIL')
      : '  N/A ';
    
    console.log(`│ ${name} │ ${avg} │ ${p50} │ ${p99} │ ${status}  │`);
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
  
  // Latency distribution (ASCII histogram)
  console.log('Latency Distribution (P50, P95, P99):');
  const topResults = results.filter(r => r.target !== undefined);
  for (const result of topResults) {
    const p50Bar = '█'.repeat(Math.round(result.p50Ms / 5));
    const p95Bar = '▓'.repeat(Math.round(result.p95Ms / 5));
    const p99Bar = '░'.repeat(Math.round(result.p99Ms / 5));
    
    console.log(`  ${result.name.substring(0, 28).padEnd(28)}`);
    console.log(`    P50: ${p50Bar} ${result.p50Ms.toFixed(1)}ms`);
    console.log(`    P95: ${p95Bar} ${result.p95Ms.toFixed(1)}ms`);
    console.log(`    P99: ${p99Bar} ${result.p99Ms.toFixed(1)}ms`);
  }
  console.log('');
  
  // Throughput comparison
  console.log('Throughput (operations/second):');
  const maxOps = Math.max(...results.map(r => r.opsPerSec));
  for (const result of results.slice(0, 8)) {
    const barLength = Math.round((result.opsPerSec / maxOps) * 40);
    const bar = '█'.repeat(barLength);
    const ops = result.opsPerSec.toFixed(0).padStart(6);
    console.log(`  ${result.name.substring(0, 28).padEnd(28)} ${bar} ${ops} ops/s`);
  }
  console.log('');
}

// ── Main Benchmark Runner ────────────────────────────────────────────────────

async function runAllBenchmarks(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         StoryMachine V5.0 — Trinity Gate Performance Benchmarks              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('\nConfiguration:');
  console.log(`  Warmup runs: ${config.warmupRuns}`);
  console.log(`  Measure runs: ${config.measureRuns}`);
  
  const allResults: BenchmarkResult[] = [];
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('SINGLE EVENT VERIFICATION');
  console.log('='.repeat(80));
  
  // Test each complexity level
  for (const complexity of ['simple', 'medium', 'complex'] as const) {
    const result = await benchmarkSingleEventVerification(complexity);
    allResults.push(result);
  }
  
  // Quick verification
  const quickResult = await benchmarkQuickVerification();
  allResults.push(quickResult);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('BATCH VERIFICATION');
  console.log('='.repeat(80));
  
  // Batch verification
  const batchResult = await benchmarkBatchVerification(10);
  allResults.push(batchResult);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('SCALABILITY TESTS');
  console.log('='.repeat(80));
  
  // Scalability tests
  const scalabilityResults = await benchmarkScalability();
  allResults.push(...scalabilityResults);
  
  // Parallel overhead
  const parallelResult = await benchmarkParallelOverhead();
  allResults.push(parallelResult);
  
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
  benchmarkSingleEventVerification,
  benchmarkBatchVerification,
  benchmarkScalability,
};
