// Event Store Benchmarks — V5.0 Performance Validation
//
// Performance Targets:
// - Event append: <10ms per operation
// - Temporal queries: <50ms for 10,000 events
// - Snapshot generation: <100ms for 10,000 events
//
// Methodology:
// - Node.js performance API for high-resolution timing
// - Multiple runs with warmup to reduce JIT variability
// - Memory profiling with process.memoryUsage()
// - ASCII charts for result visualization

import { performance } from 'node:perf_hooks';
import { EventStore, createEventStore } from '../event-store.ts';
import type { NarrativeEventInput } from '../types.ts';

// ── Benchmark Configuration ──────────────────────────────────────────────────

interface BenchmarkConfig {
  warmupRuns: number;
  measureRuns: number;
  eventSizes: number[];
}

const config: BenchmarkConfig = {
  warmupRuns: 3,
  measureRuns: 10,
  eventSizes: [100, 1000, 10000],
};

// ── Benchmark Results ────────────────────────────────────────────────────────

interface BenchmarkResult {
  name: string;
  operations: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  opsPerSec: number;
  memoryUsedMb: number;
  target?: number;
  pass?: boolean;
}

// ── Test Data Generators ─────────────────────────────────────────────────────

function generateEvent(index: number): NarrativeEventInput {
  return {
    op: {
      op: 'ADD_FACT',
      fact: {
        factId: `fact_${index}`,
        text: `Character discovers important clue #${index}`,
        addedAtTurn: Math.floor(index / 10),
        expiresAtTurn: Math.floor(index / 10) + 5,
      },
    },
    storyTime: index * 10.5,
    presentationIndex: index,
    realityLayer: 'diegetic',
    sceneIdx: Math.floor(index / 5),
    derivedFrom: [],
  };
}

function generateEventBatch(count: number): NarrativeEventInput[] {
  return Array.from({ length: count }, (_, i) => generateEvent(i));
}

// ── Benchmark Utilities ──────────────────────────────────────────────────────

async function measureOperation<T>(
  name: string,
  operation: () => T | Promise<T>,
  runs: number = config.measureRuns
): Promise<{ avgMs: number; minMs: number; maxMs: number; results: T[] }> {
  const times: number[] = [];
  const results: T[] = [];
  
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    
    times.push(end - start);
    results.push(result);
  }
  
  return {
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    results,
  };
}

function getMemoryUsageMb(): number {
  const usage = process.memoryUsage();
  return usage.heapUsed / 1024 / 1024;
}

// ── Benchmark Suites ─────────────────────────────────────────────────────────

/**
 * Benchmark 1: Event Append Performance
 * Target: <10ms per append operation
 */
async function benchmarkAppend(eventCount: number): Promise<BenchmarkResult> {
  console.log(`\n[Append] Testing with ${eventCount} events...`);
  
  const store = createEventStore();
  const events = generateEventBatch(eventCount);
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    const warmupStore = createEventStore();
    events.forEach(e => warmupStore.append(e));
  }
  
  // Measure
  const memBefore = getMemoryUsageMb();
  const start = performance.now();
  
  for (const event of events) {
    store.append(event);
  }
  
  const end = performance.now();
  const memAfter = getMemoryUsageMb();
  
  const totalTimeMs = end - start;
  const avgTimeMs = totalTimeMs / eventCount;
  const opsPerSec = (eventCount / totalTimeMs) * 1000;
  
  return {
    name: `Append ${eventCount} events`,
    operations: eventCount,
    avgTimeMs,
    minTimeMs: avgTimeMs, // Single run, so min = max = avg
    maxTimeMs: avgTimeMs,
    opsPerSec,
    memoryUsedMb: memAfter - memBefore,
    target: 10,
    pass: avgTimeMs < 10,
  };
}

/**
 * Benchmark 2: Temporal Query Performance
 * Target: <50ms for queries on 10,000 events
 */
async function benchmarkTemporalQueries(eventCount: number): Promise<BenchmarkResult[]> {
  console.log(`\n[Temporal Queries] Testing with ${eventCount} events...`);
  
  // Setup: populate store
  const store = createEventStore();
  const events = generateEventBatch(eventCount);
  events.forEach(e => store.append(e));
  
  const results: BenchmarkResult[] = [];
  
  // Query 1: Get events before specific story-time (middle of timeline)
  const midStoryTime = (eventCount / 2) * 10.5;
  const queryResult1 = await measureOperation(
    'getEventsBeforeStoryTime',
    () => store.getEventsBeforeStoryTime(midStoryTime),
    config.measureRuns
  );
  
  results.push({
    name: `Query by story-time (${eventCount} events)`,
    operations: config.measureRuns,
    avgTimeMs: queryResult1.avgMs,
    minTimeMs: queryResult1.minMs,
    maxTimeMs: queryResult1.maxMs,
    opsPerSec: (1000 / queryResult1.avgMs),
    memoryUsedMb: 0,
    target: 50,
    pass: queryResult1.avgMs < 50,
  });
  
  // Query 2: Get events by presentation index
  const midPresentation = Math.floor(eventCount / 2);
  const queryResult2 = await measureOperation(
    'getEventsBeforePresentationIndex',
    () => store.getEventsBeforePresentationIndex(midPresentation),
    config.measureRuns
  );
  
  results.push({
    name: `Query by presentation-index (${eventCount} events)`,
    operations: config.measureRuns,
    avgTimeMs: queryResult2.avgMs,
    minTimeMs: queryResult2.minMs,
    maxTimeMs: queryResult2.maxMs,
    opsPerSec: (1000 / queryResult2.avgMs),
    memoryUsedMb: 0,
    target: 50,
    pass: queryResult2.avgMs < 50,
  });
  
  // Query 3: Get events by reality layer
  const queryResult3 = await measureOperation(
    'getEventsByRealityLayer',
    () => store.getEventsByRealityLayer('diegetic'),
    config.measureRuns
  );
  
  results.push({
    name: `Query by reality-layer (${eventCount} events)`,
    operations: config.measureRuns,
    avgTimeMs: queryResult3.avgMs,
    minTimeMs: queryResult3.minMs,
    maxTimeMs: queryResult3.maxMs,
    opsPerSec: (1000 / queryResult3.avgMs),
    memoryUsedMb: 0,
    target: 50,
    pass: queryResult3.avgMs < 50,
  });
  
  return results;
}

/**
 * Benchmark 3: Snapshot Generation Performance
 * Target: <100ms for 10,000 events
 */
async function benchmarkSnapshot(eventCount: number): Promise<BenchmarkResult> {
  console.log(`\n[Snapshot] Testing with ${eventCount} events...`);
  
  // Setup
  const store = createEventStore();
  const events = generateEventBatch(eventCount);
  events.forEach(e => store.append(e));
  
  // Warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    await store.snapshot();
  }
  
  // Measure
  const memBefore = getMemoryUsageMb();
  const snapshotResult = await measureOperation(
    'snapshot',
    () => store.snapshot(),
    config.measureRuns
  );
  const memAfter = getMemoryUsageMb();
  
  return {
    name: `Generate snapshot (${eventCount} events)`,
    operations: config.measureRuns,
    avgTimeMs: snapshotResult.avgMs,
    minTimeMs: snapshotResult.minMs,
    maxTimeMs: snapshotResult.maxMs,
    opsPerSec: (1000 / snapshotResult.avgMs),
    memoryUsedMb: memAfter - memBefore,
    target: 100,
    pass: snapshotResult.avgMs < 100,
  };
}

/**
 * Benchmark 4: Chain Validation Performance
 */
async function benchmarkChainValidation(eventCount: number): Promise<BenchmarkResult> {
  console.log(`\n[Chain Validation] Testing with ${eventCount} events...`);
  
  const store = createEventStore();
  const events = generateEventBatch(eventCount);
  events.forEach(e => store.append(e));
  
  const validationResult = await measureOperation(
    'validateChain',
    () => store.validateChain(),
    config.measureRuns
  );
  
  return {
    name: `Validate chain (${eventCount} events)`,
    operations: config.measureRuns,
    avgTimeMs: validationResult.avgMs,
    minTimeMs: validationResult.minMs,
    maxTimeMs: validationResult.maxMs,
    opsPerSec: (1000 / validationResult.avgMs),
    memoryUsedMb: 0,
  };
}

/**
 * Benchmark 5: Fork & Merge Performance
 */
async function benchmarkForkMerge(): Promise<BenchmarkResult[]> {
  console.log(`\n[Fork & Merge] Testing timeline branching...`);
  
  const store = createEventStore();
  const events = generateEventBatch(100);
  events.forEach(e => store.append(e));
  
  const results: BenchmarkResult[] = [];
  
  // Fork performance
  const forkResult = await measureOperation(
    'fork',
    () => {
      const eventId = store.getAllEvents()[50].eventId;
      return store.fork(eventId, 'test-branch');
    },
    config.measureRuns
  );
  
  results.push({
    name: 'Fork timeline',
    operations: config.measureRuns,
    avgTimeMs: forkResult.avgMs,
    minTimeMs: forkResult.minMs,
    maxTimeMs: forkResult.maxMs,
    opsPerSec: (1000 / forkResult.avgMs),
    memoryUsedMb: 0,
  });
  
  return results;
}

// ── Results Display ──────────────────────────────────────────────────────────

function displayResults(results: BenchmarkResult[]): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     EVENT STORE BENCHMARK RESULTS                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log('┌───────────────────────────────────────┬──────────┬──────────┬──────────┬────────┐');
  console.log('│ Benchmark                             │ Avg (ms) │ Min (ms) │ Max (ms) │ Status │');
  console.log('├───────────────────────────────────────┼──────────┼──────────┼──────────┼────────┤');
  
  for (const result of results) {
    const name = result.name.padEnd(37).substring(0, 37);
    const avg = result.avgTimeMs.toFixed(2).padStart(8);
    const min = result.minTimeMs.toFixed(2).padStart(8);
    const max = result.maxTimeMs.toFixed(2).padStart(8);
    const status = result.pass !== undefined 
      ? (result.pass ? '✓ PASS' : '✗ FAIL')
      : '  N/A ';
    
    console.log(`│ ${name} │ ${avg} │ ${min} │ ${max} │ ${status}  │`);
  }
  
  console.log('└───────────────────────────────────────┴──────────┴──────────┴──────────┴────────┘\n');
  
  // Performance targets summary
  const withTargets = results.filter(r => r.target !== undefined);
  const passed = withTargets.filter(r => r.pass).length;
  const failed = withTargets.length - passed;
  
  console.log('Performance Targets:');
  console.log(`  ✓ Passed: ${passed}`);
  console.log(`  ✗ Failed: ${failed}`);
  console.log(`  Success Rate: ${((passed / withTargets.length) * 100).toFixed(1)}%\n`);
  
  // ASCII chart for ops/sec
  console.log('Operations Per Second (higher is better):');
  const maxOps = Math.max(...results.map(r => r.opsPerSec));
  for (const result of results.slice(0, 5)) {
    const barLength = Math.round((result.opsPerSec / maxOps) * 40);
    const bar = '█'.repeat(barLength);
    const ops = result.opsPerSec.toFixed(0).padStart(8);
    console.log(`  ${result.name.substring(0, 30).padEnd(30)} ${bar} ${ops} ops/sec`);
  }
  console.log('');
  
  // Memory usage
  const memResults = results.filter(r => r.memoryUsedMb > 0);
  if (memResults.length > 0) {
    console.log('Memory Usage:');
    for (const result of memResults) {
      console.log(`  ${result.name.substring(0, 40).padEnd(40)} ${result.memoryUsedMb.toFixed(2)} MB`);
    }
    console.log('');
  }
}

// ── Main Benchmark Runner ────────────────────────────────────────────────────

async function runAllBenchmarks(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          StoryMachine V5.0 — Event Store Performance Benchmarks              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('\nConfiguration:');
  console.log(`  Warmup runs: ${config.warmupRuns}`);
  console.log(`  Measure runs: ${config.measureRuns}`);
  console.log(`  Event sizes: ${config.eventSizes.join(', ')}`);
  
  const allResults: BenchmarkResult[] = [];
  
  // Run benchmarks for each event size
  for (const size of config.eventSizes) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`EVENT SIZE: ${size}`);
    console.log('='.repeat(80));
    
    // Append benchmark
    const appendResult = await benchmarkAppend(size);
    allResults.push(appendResult);
    
    // Temporal queries (only for larger sizes)
    if (size >= 1000) {
      const queryResults = await benchmarkTemporalQueries(size);
      allResults.push(...queryResults);
    }
    
    // Snapshot benchmark
    const snapshotResult = await benchmarkSnapshot(size);
    allResults.push(snapshotResult);
    
    // Chain validation
    const validationResult = await benchmarkChainValidation(size);
    allResults.push(validationResult);
  }
  
  // Fork & Merge (independent of size)
  const forkMergeResults = await benchmarkForkMerge();
  allResults.push(...forkMergeResults);
  
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

export { runAllBenchmarks, benchmarkAppend, benchmarkTemporalQueries, benchmarkSnapshot };
