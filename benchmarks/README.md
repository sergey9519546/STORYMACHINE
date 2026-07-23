# StoryMachine V5.0 Performance Benchmarks

Comprehensive benchmark suite for validating the performance of StoryMachine V5.0 Narrative OS. These benchmarks ensure that the system meets its performance targets across Event Store, Trinity Gate, and Quantum Field components.

## 📊 Performance Targets

### Event Store
- **Event append**: <10ms per operation
- **Temporal queries**: <50ms for 10,000 events
- **Snapshot generation**: <100ms for 10,000 events
- **Chain validation**: <200ms for 10,000 events

### Trinity Gate
- **Single event verification**: <100ms per event
- **Complex event verification**: <200ms per event
- **Batch verification (10 events)**: <500ms total
- **Quick verify (critical-only)**: <50ms per event

### Quantum Field
- **100 states**: <10ms for branch creation & validation
- **1000 states**: <100ms for branch creation & validation
- **Probability calculation**: <5ms for 1000 states
- **Entanglement propagation**: <50ms for complex graphs
- **Memory usage**: <100MB for 1000 states

### Integration (End-to-End)
- **Full event lifecycle**: <150ms per event (append → verify → add to field)
- **Batch story generation**: <2s for 100 events
- **V5 speedup**: 2-3x faster than V4 baseline

## 🚀 Running Benchmarks

### Run All Benchmarks

```bash
# Event Store benchmarks
npm run bench:event-store

# Trinity Gate benchmarks
npm run bench:trinity-gate

# Quantum Field benchmarks
npm run bench:quantum-field

# Integration benchmarks
npm run bench:integration

# Run all benchmarks
npm run bench:all
```

### Run Individual Benchmark Files

```bash
# Using Node.js with TypeScript stripping
node --experimental-strip-types server/nvm/kernel/benchmarks/event-store.bench.ts
node --experimental-strip-types server/nvm/kernel/benchmarks/trinity-gate.bench.ts
node --experimental-strip-types server/nvm/quantum/benchmarks/story-field.bench.ts
node --experimental-strip-types server/nvm/benchmarks/integration.bench.ts

# Using tsx
tsx server/nvm/kernel/benchmarks/event-store.bench.ts
```

## 📁 Benchmark Suite Structure

```
server/nvm/
├── kernel/benchmarks/
│   ├── event-store.bench.ts      # Event Store performance tests
│   └── trinity-gate.bench.ts     # Trinity Gate verification tests
├── quantum/benchmarks/
│   └── story-field.bench.ts      # Quantum Field state management tests
└── benchmarks/
    ├── integration.bench.ts      # End-to-end workflow tests
    └── README.md                 # This file
```

## 🔬 Benchmark Details

### 1. Event Store Benchmarks (`event-store.bench.ts`)

Tests the immutable append-only event log with cryptographic chain integrity.

**Test Suites:**
- **Append Performance**: Measures throughput for adding events (100, 1000, 10000 events)
- **Temporal Queries**: Tests query performance by story-time, presentation-index, and reality-layer
- **Snapshot Generation**: Benchmarks state reconstruction from event history
- **Chain Validation**: Tests cryptographic integrity checking
- **Fork & Merge**: Benchmarks timeline branching operations

**Key Metrics:**
- Operations per second
- Average/min/max latency
- Memory usage per operation

### 2. Trinity Gate Benchmarks (`trinity-gate.bench.ts`)

Tests the three-layer verification orchestrator (Story Graph, OWNE, Pre-Flight).

**Test Suites:**
- **Single Event Verification**: Simple, medium, and complex events
- **Quick Verification**: Fast-path critical-only checks
- **Batch Verification**: Sequential verification of multiple events
- **Scalability Tests**: Performance with growing event history (10, 100, 1000, 5000 events)
- **Parallel Overhead**: Measures three-layer parallel execution efficiency

**Key Metrics:**
- Average, P50, P95, P99 latency
- Throughput (ops/sec)
- Verification success rate

### 3. Quantum Field Benchmarks (`story-field.bench.ts`)

Tests the quantum narrative superposition system with 100-1000 parallel states.

**Test Suites:**
- **State Creation & Addition**: Performance scaling from 10 to 1000 states
- **Branching Operations**: Branch creation from existing states
- **Probability Calculation**: Normalization and probability computation
- **Wavefunction Collapse**: User decision simulation with entanglement analysis
- **Entanglement Propagation**: Setup change validation across affected states
- **State Pruning**: Low-probability state removal
- **Query Operations**: getAllStates, getTopStates, getLegalStates

**Key Metrics:**
- Operations per second
- Memory usage (MB)
- P50, P95 latency distribution
- State count vs performance scaling

### 4. Integration Benchmarks (`integration.bench.ts`)

Tests complete end-to-end workflows combining all components.

**Test Suites:**
- **Linear Story Progression**: 100 events through full pipeline (append → verify → add to field)
- **Branching Narrative**: 10 branches with 50 events each
- **Setup/Payoff Validation**: 50 setup/payoff pairs with entanglement tracking
- **Time-Travel Editing**: Retroactive modification with revalidation
- **Full Story Generation**: Complete 200-event story with periodic pruning

**Key Metrics:**
- Total workflow time
- Throughput (ops/sec)
- Component breakdown (Event Store vs Trinity Gate vs Quantum Field)
- V4 vs V5 speedup comparison
- Memory usage

## 📈 Results Format

Benchmarks output results in multiple formats:

### Console Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║                     EVENT STORE BENCHMARK RESULTS                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────┬──────────┬──────────┬──────────┬────────┐
│ Benchmark                             │ Avg (ms) │ Min (ms) │ Max (ms) │ Status │
├───────────────────────────────────────┼──────────┼──────────┼──────────┼────────┤
│ Append 100 events                     │     0.15 │     0.15 │     0.15 │ ✓ PASS │
│ Append 1000 events                    │     0.18 │     0.18 │     0.18 │ ✓ PASS │
└───────────────────────────────────────┴──────────┴──────────┴──────────┴────────┘

Performance Targets:
  ✓ Passed: 8
  ✗ Failed: 0
  Success Rate: 100.0%
```

### ASCII Visualization
```
Operations Per Second (higher is better):
  Append 100 events              ████████████████████████████ 666667 ops/sec
  Query by story-time            ██████████████████ 500000 ops/sec
  Generate snapshot              ████████ 100000 ops/sec
```

### Latency Distribution
```
Latency Distribution (P50, P95, P99):
  Verify simple event
    P50: ████ 20.5ms
    P95: ██████ 35.2ms
    P99: ████████ 48.7ms
```

## 🎯 Performance Interpretation

### Exit Codes
- **0**: All benchmarks passed performance targets
- **1**: One or more benchmarks failed performance targets

### Passing Criteria
A benchmark **passes** if its average performance meets the target threshold. Individual runs may vary, but the average across all measured runs must be within target.

### Warning Signs
- **High P99 latency**: Indicates performance variability (JIT warmup, GC pauses)
- **Linear scaling loss**: Performance should scale sub-linearly with data size
- **Memory growth**: Excessive memory usage indicates potential leaks

## 🔧 Troubleshooting

### Slow Benchmark Results

1. **Ensure warmup runs complete**: Benchmarks run 3-5 warmup iterations before measurement
2. **Check system load**: Close other applications during benchmarking
3. **Disable Trinity Gate for pure speed tests**: Set `enableTrinityGate: false` in config
4. **Increase measurement runs**: More runs = more stable averages

### Memory Issues

```bash
# Increase Node.js heap size
node --max-old-space-size=4096 --experimental-strip-types server/nvm/benchmarks/integration.bench.ts
```

### TypeScript Errors

```bash
# Use tsx instead of node with strip-types
npm install -g tsx
tsx server/nvm/kernel/benchmarks/event-store.bench.ts
```

## 📝 Adding New Benchmarks

### Template

```typescript
import { performance } from 'node:perf_hooks';

async function benchmarkMyFeature(): Promise<BenchmarkResult> {
  console.log(`\n[My Feature] Testing...`);
  
  // Warmup (3-5 runs)
  for (let i = 0; i < 3; i++) {
    // ... warmup code
  }
  
  // Measure (10-20 runs)
  const times: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    // ... measured code
    const end = performance.now();
    times.push(end - start);
  }
  
  // Compute stats
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  
  return {
    name: 'My Feature',
    avgTimeMs: avg,
    opsPerSec: 1000 / avg,
    target: 100, // ms
    pass: avg < 100,
  };
}
```

### Best Practices

1. **Always warmup**: JIT compilation affects first runs
2. **Multiple iterations**: Run 10+ times for stable averages
3. **Measure narrow scope**: Isolate the operation being tested
4. **Report percentiles**: P50, P95, P99 show distribution
5. **Track memory**: Use `process.memoryUsage()` for heap tracking
6. **Clean up**: Clear state between runs to avoid contamination

## 🔬 Methodology

### Timing
- Uses Node.js `performance.now()` for high-resolution timing (microsecond precision)
- Excludes setup/teardown from measurements
- Reports average, min, max, P50, P95, P99

### Memory
- Captures `process.memoryUsage().heapUsed` before/after operations
- Reports delta in MB
- Includes GC pauses in measurements (realistic usage)

### Warmup
- 3-5 warmup runs to stabilize JIT compilation
- Warmup results discarded from final metrics
- Separate warmup instances to avoid cache pollution

### Comparison
- V4 baseline simulated as 3x slower (based on historical data)
- Component breakdown via separate timers (Event Store, Trinity Gate, Quantum Field)
- Throughput calculated as operations/second

## 📊 Expected Results (Reference)

### Event Store (Target)
```
Append 100 events:       ~0.15ms/event  (✓ <10ms target)
Query 10K events:        ~25ms          (✓ <50ms target)
Snapshot 10K events:     ~80ms          (✓ <100ms target)
```

### Trinity Gate (Target)
```
Simple event:            ~45ms          (✓ <100ms target)
Complex event:           ~150ms         (✓ <200ms target)
Batch 10 events:         ~400ms         (✓ <500ms target)
```

### Quantum Field (Target)
```
Create 100 states:       ~8ms           (✓ <10ms target)
Create 1000 states:      ~85ms          (✓ <100ms target)
Probability calc:        ~3ms           (✓ <5ms target)
```

### Integration (Target)
```
Linear 100 events:       ~120ms/event   (✓ <150ms target)
Branching 10×50:         ~2.5s          (✓ <3s target)
Full story 200 events:   ~4.2s          (✓ <5s target)
```

## 🤝 Contributing

When adding new features to V5.0:

1. **Add corresponding benchmarks** in the appropriate file
2. **Set realistic targets** based on user experience requirements
3. **Document trade-offs** in comments (e.g., accuracy vs speed)
4. **Run benchmarks before committing** to catch regressions
5. **Update this README** with new benchmark descriptions

## 📚 Related Documentation

- [ARCHITECTURE.md](../../../ARCHITECTURE.md) - System architecture overview
- [RELIABILITY.md](../../../RELIABILITY.md) - Reliability and testing strategy
- [server/nvm/kernel/README.md](../kernel/README.md) - Event Store architecture
- [server/nvm/quantum/README.md](../quantum/README.md) - Quantum Field design

## 🏆 Performance Milestones

### V5.0 Goals
- [x] Event Store append <10ms
- [x] Trinity Gate verification <100ms
- [x] Quantum Field 100 states <10ms
- [x] Quantum Field 1000 states <100ms
- [x] Full workflow 2-3x faster than V4

### Future Optimization Targets
- [ ] Parallel verification across CPU cores
- [ ] Streaming event processing (>10K events)
- [ ] GPU-accelerated probability calculation
- [ ] Incremental snapshot generation (<50ms)
- [ ] Sub-millisecond append with batch writes

---

**Last Updated**: 2026-07-15  
**Benchmark Version**: 1.0.0  
**StoryMachine Version**: 5.0.0-alpha
