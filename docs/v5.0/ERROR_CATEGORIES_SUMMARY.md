# TypeScript Error Categories Summary
## StoryMachine V5.0 Integration

**Generated:** 2026-07-15  
**Total Errors:** 131

---

## Error Distribution by TypeScript Error Code

| Error Code | Count | % | Description |
|------------|-------|---|-------------|
| **TS2353** | 51 | 38.9% | Object literal may only specify known properties |
| **TS2339** | 26 | 19.8% | Property does not exist on type |
| **TS2322** | 17 | 13.0% | Type is not assignable to type |
| **TS2345** | 12 | 9.2% | Argument of type X is not assignable to parameter of type Y |
| **TS2484** | 8 | 6.1% | Export declaration conflicts |
| **TS2739** | 4 | 3.1% | Type is missing properties |
| **TS2459** | 3 | 2.3% | Module declares X locally, but it is not exported |
| **TS2305** | 3 | 2.3% | Module has no exported member |
| **TS2741** | 2 | 1.5% | Property is missing in type but required |
| **TS2724** | 2 | 1.5% | Module has no exported member (with suggestion) |
| **TS7006** | 1 | 0.8% | Parameter implicitly has 'any' type |
| **TS2769** | 1 | 0.8% | No overload matches this call |
| **TS18046** | 1 | 0.8% | Variable is of type 'unknown' |

---

## Error Distribution by Semantic Category

| Category | Count | % | Fix Type | Effort Estimate |
|----------|-------|---|----------|-----------------|
| **AtomicFact Structure** | 45 | 34.4% | Adapter | 6-8 hours |
| **Belief Structure** | 22 | 16.8% | Adapter | 4 hours |
| **Type Assignments** | 17 | 13.0% | Test Fixes | 3 hours |
| **Function Arguments** | 12 | 9.2% | Test Fixes | 2 hours |
| **Export Conflicts** | 8 | 6.1% | Remove Code | 15 minutes |
| **ClueCarrier Enum** | 8 | 6.1% | Test Fixes | 1 hour |
| **EmotionState Structure** | 5 | 3.8% | Adapter | 2 hours |
| **BenchmarkResult** | 4 | 3.1% | Test Fixes | 10 minutes |
| **Missing Exports** | 3 | 2.3% | Add Exports | 10 minutes |
| **NarrativeEvent Fields** | 7 | 5.3% | EventStore Fix | 1 hour |
| **FountainAnalysis** | 2 | 1.5% | Extend Type | 5 minutes |
| **Other** | 3 | 2.3% | Various | 30 minutes |

---

## Error Distribution by File

| File | Error Count | Primary Issues |
|------|-------------|----------------|
| `server/nvm/__tests__/smoke.test.ts` | 16 | AtomicFact.content |
| `server/nvm/kernel/verifiers/preflight-auditor.ts` | 12 | Belief.subject/predicate/object |
| `server/nvm/kernel/event-store.test.ts` | 11 | AtomicFact.content, NarrativeEvent |
| `server/nvm/quantum/example.ts` | 11 | AtomicFact.content, NarrativeEvent |
| `server/nvm/kernel/verifiers/owne-verifier.ts` | 10 | Belief, EmotionState |
| `server/nvm/kernel/v5-examples.ts` | 7 | AtomicFact.description |
| `server/nvm/quantum/benchmarks/story-field.bench.ts` | 4 | ClueCarrier, AtomicFact |
| `server/nvm/kernel/trinity-gate.ts` | 4 | Export conflicts |
| `server/nvm/benchmarks/integration.bench.ts` | 4 | ClueCarrier, AtomicFact |
| `server/nvm/kernel/benchmarks/trinity-gate.bench.ts` | 7 | ClueCarrier, BenchmarkResult |
| Other files (22 files) | 45 | Various |

---

## Effort Estimates by Phase

### Phase 1: Quick Wins (1 hour)
- Remove export conflicts: 15 min → **8 errors fixed**
- Add missing exports: 10 min → **3 errors fixed**
- Extend FountainAnalysis: 5 min → **2 errors fixed**
- Fix BenchmarkResult: 10 min → **4 errors fixed**
- Fix ClueCarrier: 20 min → **8 errors fixed**

**Subtotal:** 1 hour → **25 errors fixed (19%)**

### Phase 2: Core Adapters (8 hours)
- Implement parseSemanticTriple: 2 hours
- Implement enrichAtomicFact: 2 hours
- Implement enrichBelief: 1 hour
- Implement enrichEmotion: 1 hour
- Write adapter tests: 2 hours

**Subtotal:** 8 hours → **Adapters ready (enables 67 errors)**

### Phase 3: Verifier Integration (4 hours)
- Update OWNE verifier: 2 hours → **10 errors fixed**
- Update Pre-Flight auditor: 1.5 hours → **12 errors fixed**
- Test verifiers: 0.5 hours → **10 errors fixed**

**Subtotal:** 4 hours → **32 errors fixed (24%)**

### Phase 4: Test Fixes (6 hours)
- Fix AtomicFact in tests: 3 hours → **45 errors fixed**
- Fix NarrativeEvent fields: 1 hour → **7 errors fixed**
- Fix type assignments: 2 hours → **17 errors fixed**

**Subtotal:** 6 hours → **69 errors fixed (53%)**

### Phase 5: Validation (3 hours)
- Run full test suite: 1 hour
- Validate on corpus: 1 hour
- Performance benchmarks: 1 hour

**Subtotal:** 3 hours → **Validation complete**

---

## Total Effort Summary

| Phase | Duration | Errors Fixed | Cumulative |
|-------|----------|--------------|------------|
| Phase 1 | 1 hour | 25 | 25 (19%) |
| Phase 2 | 8 hours | 0* | 25 (19%) |
| Phase 3 | 4 hours | 32 | 57 (43%) |
| Phase 4 | 6 hours | 69 | 126 (96%) |
| Phase 5 | 3 hours | 5 | 131 (100%) |
| **TOTAL** | **22 hours** | **131** | **100%** |

*Phase 2 creates adapters that enable Phase 3-4 fixes

---

## Critical Path

### Must-Fix for Compilation (108 errors - 82%)
1. **AtomicFact structure** (45 errors) - CRITICAL
2. **Belief structure** (22 errors) - CRITICAL
3. **Export conflicts** (8 errors) - CRITICAL
4. **Type assignments** (17 errors) - HIGH
5. **Function arguments** (12 errors) - HIGH
6. **Missing exports** (3 errors) - HIGH

**Effort:** 18 hours

### Nice-to-Fix (23 errors - 18%)
1. ClueCarrier enums (8 errors) - LOW
2. EmotionState structure (5 errors) - MEDIUM
3. BenchmarkResult (4 errors) - LOW
4. FountainAnalysis (2 errors) - LOW
5. Other (4 errors) - LOW

**Effort:** 4 hours

---

## Risk-Adjusted Estimates

### Optimistic (18 hours)
- Semantic parser works first try
- No hidden dependencies
- Tests pass immediately

### Realistic (22 hours)
- Some parser refinement needed
- Minor integration issues
- Test debugging required

### Pessimistic (30 hours)
- Semantic parser needs significant work
- Unexpected type dependencies
- Complex test failures
- Corpus validation reveals issues

**Recommended Planning:** 24 hours (includes buffer)

---

## Dependencies

### Phase Dependencies
- Phase 3 depends on Phase 2 (needs adapters)
- Phase 4 depends on Phase 2 (needs adapters)
- Phase 5 depends on Phases 1-4 (needs all fixes)

### Resource Dependencies
- **1 Senior Developer** for adapters (Phase 2)
- **1 Developer** for test fixes (Phase 4)
- **1 QA** for validation (Phase 5)

Can parallelize:
- Phase 1 + Phase 2 start (1.5 hours overlap)
- Phase 3 + Phase 4 (verifiers and tests, 2 hours overlap)

**Parallelized Timeline:** 18-20 hours with 2 developers

---

## Validation Checkpoints

### After Phase 1 (Quick Wins)
- ✅ 25 errors fixed
- ✅ TypeScript compilation shows 106 errors
- ✅ No new errors introduced

### After Phase 3 (Verifiers)
- ✅ 57 errors fixed
- ✅ Trinity Gate compiles
- ✅ OWNE and Pre-Flight verifiers work

### After Phase 4 (Tests)
- ✅ 126 errors fixed
- ✅ All tests compile
- ✅ Test pass rate >95%

### After Phase 5 (Validation)
- ✅ 0 TypeScript errors
- ✅ Test pass rate >99%
- ✅ Validates real screenplays

---

## Conclusion

**Total Errors:** 131  
**Total Effort:** 22 hours (2.75 days)  
**Parallelized:** 18-20 hours with 2 developers  
**Risk Level:** LOW  

The errors are systematic and well-understood. The adapter pattern solves 67 errors (51%) at the root cause level, and the remaining 64 errors (49%) are straightforward test fixes.

**Recommendation:** Proceed with implementation starting Phase 1 immediately.

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-15  
**Status:** READY FOR IMPLEMENTATION
