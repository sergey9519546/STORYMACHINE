// StoryMachine V5.0 Benchmark Suite — Quick Reference
//
// This file provides a quick overview of all benchmarks and how to run them.
// For detailed documentation, see benchmarks/README.md

export const BENCHMARK_SUITE = {
  version: '1.0.0',
  storymachineVersion: '5.0.0-alpha',
  
  benchmarks: {
    eventStore: {
      file: 'server/nvm/kernel/benchmarks/event-store.bench.ts',
      command: 'npm run bench:event-store',
      tests: [
        'Event append performance (100, 1000, 10000 events)',
        'Temporal query performance',
        'Snapshot generation',
        'Chain validation',
        'Fork & merge operations',
      ],
      targets: {
        append: '<10ms per event',
        query: '<50ms for 10K events',
        snapshot: '<100ms for 10K events',
      },
    },
    
    trinityGate: {
      file: 'server/nvm/kernel/benchmarks/trinity-gate.bench.ts',
      command: 'npm run bench:trinity-gate',
      tests: [
        'Single event verification (simple, medium, complex)',
        'Quick verification (critical-only)',
        'Batch verification (10 events)',
        'Scalability tests (10-5000 event history)',
        'Parallel three-layer execution',
      ],
      targets: {
        simple: '<100ms per event',
        complex: '<200ms per event',
        batch: '<500ms for 10 events',
        quick: '<50ms per event',
      },
    },
    
    quantumField: {
      file: 'server/nvm/quantum/benchmarks/story-field.bench.ts',
      command: 'npm run bench:quantum-field',
      tests: [
        'State creation & addition (10-1000 states)',
        'Branch creation performance',
        'Probability calculation & normalization',
        'Wavefunction collapse',
        'Entanglement propagation',
        'State pruning',
        'Query operations',
      ],
      targets: {
        states100: '<10ms for 100 states',
        states1000: '<100ms for 1000 states',
        probability: '<5ms for 1000 states',
        entanglement: '<50ms for propagation',
        memory: '<100MB for 1000 states',
      },
    },
    
    integration: {
      file: 'server/nvm/benchmarks/integration.bench.ts',
      command: 'npm run bench:integration',
      tests: [
        'Linear story progression (100 events)',
        'Branching narrative (10 branches × 50 events)',
        'Setup/payoff validation (50+50 pairs)',
        'Time-travel editing (retroactive modification)',
        'Full story generation (200 events)',
      ],
      targets: {
        lifecycle: '<150ms per event',
        batch100: '<2s for 100 events',
        speedup: '2-3x faster than V4',
        fullStory: '<5s for 200 events',
      },
    },
  },
  
  quickStart: {
    runAll: 'npm run bench:all',
    runIndividual: [
      'npm run bench:event-store',
      'npm run bench:trinity-gate',
      'npm run bench:quantum-field',
      'npm run bench:integration',
    ],
    directExecution: [
      'node --experimental-strip-types server/nvm/kernel/benchmarks/event-store.bench.ts',
      'node --experimental-strip-types server/nvm/kernel/benchmarks/trinity-gate.bench.ts',
      'node --experimental-strip-types server/nvm/quantum/benchmarks/story-field.bench.ts',
      'node --experimental-strip-types server/nvm/benchmarks/integration.bench.ts',
    ],
  },
  
  metrics: {
    timing: [
      'Average latency (ms)',
      'Min/Max latency (ms)',
      'P50, P95, P99 percentiles',
      'Operations per second',
    ],
    resources: [
      'Memory usage (MB)',
      'Heap allocation delta',
    ],
    quality: [
      'Pass/fail vs targets',
      'Success rate percentage',
      'V4 vs V5 speedup comparison',
    ],
  },
  
  interpretation: {
    exitCodes: {
      0: 'All benchmarks passed performance targets',
      1: 'One or more benchmarks failed',
    },
    passingCriteria: 'Average performance across all runs must meet target threshold',
    warningsSigns: [
      'High P99 latency (indicates variability)',
      'Linear scaling loss (should be sub-linear)',
      'Excessive memory growth (potential leaks)',
    ],
  },
};

// Usage examples
export const USAGE_EXAMPLES = `
// Run all benchmarks
npm run bench:all

// Run specific benchmark
npm run bench:event-store

// With increased memory
node --max-old-space-size=4096 --experimental-strip-types server/nvm/benchmarks/integration.bench.ts

// Using tsx instead
tsx server/nvm/kernel/benchmarks/event-store.bench.ts
`;

// Expected output format
export const EXAMPLE_OUTPUT = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                     EVENT STORE BENCHMARK RESULTS                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────┬──────────┬──────────┬──────────┬────────┐
│ Benchmark                             │ Avg (ms) │ Min (ms) │ Max (ms) │ Status │
├───────────────────────────────────────┼──────────┼──────────┼──────────┼────────┤
│ Append 100 events                     │     0.15 │     0.15 │     0.15 │ ✓ PASS │
│ Query by story-time (10000 events)    │    25.30 │    24.10 │    27.80 │ ✓ PASS │
│ Generate snapshot (10000 events)      │    85.20 │    82.50 │    89.40 │ ✓ PASS │
└───────────────────────────────────────┴──────────┴──────────┴──────────┴────────┘

Performance Targets:
  ✓ Passed: 8
  ✗ Failed: 0
  Success Rate: 100.0%

Operations Per Second (higher is better):
  Append 100 events              ████████████████████████████ 666667 ops/sec
  Query by story-time            ██████████████████ 39526 ops/sec
  Generate snapshot              ████████ 11737 ops/sec
`;

export default BENCHMARK_SUITE;
