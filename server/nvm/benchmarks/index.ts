// StoryMachine Benchmark Suite — Quick Reference
//
// This file provides a quick overview of all benchmarks and how to run them.
//
// 2026-09-20: three of the four benchmarks this catalog described —
// kernel/benchmarks/trinity-gate.bench.ts, quantum/benchmarks/
// story-field.bench.ts and benchmarks/integration.bench.ts — were deleted with
// the v5.0 "narrative OS" closure (Proposal B2 of
// docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md; audit in
// docs/audits/2026-09-20-dead-weight-b1-b2/README.md). Their entries are
// removed here rather than left pointing at files that no longer exist. Only
// event-store.bench.ts, over the LIVE event store, survives.
//
// This module is itself unreachable from server.ts (see
// scripts/verify-server-reachability.mjs group 5) and the `npm run bench:*`
// scripts it names have never existed in package.json. It was kept, not
// deleted, because its allowlist entry classifies it as "written, never
// connected" rather than as part of the v5.0 closure — but it is a candidate
// the next removal pass should settle.

export const BENCHMARK_SUITE = {
  version: '1.0.0',
  storymachineVersion: '1.0.0-rc.1',
  
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
  },
  
  quickStart: {
    runAll: 'npm run bench:all',
    runIndividual: [
      'npm run bench:event-store',
    ],
    directExecution: [
      'node --experimental-strip-types server/nvm/kernel/benchmarks/event-store.bench.ts',
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
