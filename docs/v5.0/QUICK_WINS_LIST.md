# Quick Wins List - V5.0 Type Integration
## High-Impact, Low-Effort Fixes (<30 minutes each)

**Generated:** 2026-07-15  
**Total Quick Wins:** 17 errors (13% of total)  
**Total Time:** 40 minutes  
**Impact:** Immediate compilation progress

---

## 1. Remove Export Declaration Conflicts
**Time:** 15 minutes  
**Errors Fixed:** 8 (6.1%)  
**Difficulty:** ⭐ Trivial  
**Files Affected:** 3

### Error Messages
```
server/nvm/kernel/trinity-gate.ts(425,3): error TS2484: 
  Export declaration conflicts with exported declaration of 'TrinityViolation'.
```

### Fix
Remove duplicate `export type { ... }` statements at end of files.

### Implementation
```typescript
// File: server/nvm/kernel/trinity-gate.ts
// Lines 425-428: DELETE these lines

// BEFORE (lines 425-428):
export type { TrinityViolation };
export type { TrinityVerification };
export type { TrinityGateOptions };
export type { VerificationLayer };

// AFTER: 
// (lines deleted - types already exported at definition)
```

### Files to Fix
1. `server/nvm/kernel/trinity-gate.ts` - Remove lines 425-428 (4 exports)
2. `server/nvm/kernel/verifiers/owne-verifier.ts` - Remove line 542 (2 exports)
3. `server/nvm/kernel/verifiers/preflight-auditor.ts` - Remove line 683 (2 exports)

### Validation
```bash
# After fix, these should pass:
grep -n "export type {" server/nvm/kernel/trinity-gate.ts  # Should show 0 results at end
npx tsc --noEmit | grep TS2484  # Should show 0 results
```

---

## 2. Add Missing Type Exports
**Time:** 10 minutes  
**Errors Fixed:** 5 (3.8%)  
**Difficulty:** ⭐ Trivial  
**Files Affected:** 2

### Error Messages
```
error TS2459: Module '"./types.ts"' declares 'ScreenplaySceneRecord' locally, but it is not exported.
error TS2305: Module '"./ai-provider.ts"' has no exported member 'OpenAIProvider'.
```

### Fix
Add `export` keyword to type declarations.

### Implementation

#### Fix 1: ScreenplaySceneRecord
```typescript
// File: server/nvm/analyze/types.ts
// Find the ScreenplaySceneRecord interface and add export

// BEFORE:
interface ScreenplaySceneRecord {
  // ... definition
}

// AFTER:
export interface ScreenplaySceneRecord {
  // ... definition
}
```

#### Fix 2: AI Providers
```typescript
// File: server/engine/ai-provider.ts
// Add exports at bottom of file

// BEFORE:
// (missing exports)

// AFTER (add at end of file):
export { OpenAIProvider, AnthropicProvider };
```

### Files to Fix
1. `server/nvm/analyze/types.ts` - Add export to ScreenplaySceneRecord interface
2. `server/engine/ai-provider.ts` - Add export statement for providers

### Validation
```bash
# Should compile without errors:
npx tsc --noEmit server/nvm/analyze/temporal-consistency-doctor.ts
npx tsc --noEmit server/engine/ai-provider-integration.test.ts
```

---

## 3. Extend FountainAnalysis Interface
**Time:** 5 minutes  
**Errors Fixed:** 2 (1.5%)  
**Difficulty:** ⭐ Trivial  
**Files Affected:** 1

### Error Messages
```
error TS2353: Object literal may only specify known properties, 
  and 'pageCount' does not exist in type 'FountainAnalysis'.
error TS2353: ... 'characterCount' does not exist in type 'FountainAnalysis'.
```

### Fix
Add two optional fields to FountainAnalysis interface.

### Implementation
```typescript
// File: server/nvm/analyze/types.ts
// Find FountainAnalysis interface (around line 21)

export interface FountainAnalysis {
  records: ScreenplaySceneRecord[];
  annotations: SceneAnnotation[];
  structure: StructureState;
  characters: string[];
  sceneCount: number;
  dialogueLineCount: number;
  actionLineCount: number;
  wordCount: number;
  truncatedForAnalysis?: boolean;
  totalSceneCount?: number;
  
  // ADD these two lines:
  pageCount?: number;
  characterCount?: number;
}
```

### Validation
```bash
npx tsc --noEmit server/nvm/kernel/adapters.ts  # Should pass
npx tsc --noEmit server/nvm/kernel/verifiers/story-graph-verifier.ts  # Should pass
```

---

## 4. Fix BenchmarkResult Property Names
**Time:** 10 minutes  
**Errors Fixed:** 4 (3.1%)  
**Difficulty:** ⭐ Trivial  
**Files Affected:** 1

### Error Messages
```
error TS2739: Type '{ opsPerSec: number; avgMs: number; ... }' is missing 
  the following properties from type 'BenchmarkResult': avgTimeMs, minTimeMs, maxTimeMs
```

### Fix
Rename properties to match expected interface.

### Implementation
```typescript
// File: server/nvm/kernel/benchmarks/trinity-gate.bench.ts
// Find all return statements in benchmark functions

// BEFORE:
return {
  name,
  operations,
  avgMs,
  minMs,
  maxMs,
  p50Ms,
  p95Ms,
  p99Ms,
  opsPerSec,
};

// AFTER:
return {
  name,
  operations,
  avgTimeMs: avgMs,      // ← RENAME
  minTimeMs: minMs,      // ← RENAME
  maxTimeMs: maxMs,      // ← RENAME
  p50Ms,
  p95Ms,
  p99Ms,
  opsPerSec,
};
```

### Locations
- Line 220: `runBenchmark()` function
- Line 261: Second benchmark function
- Line 308: Third benchmark function
- Line 391: Fourth benchmark function

### Validation
```bash
npx tsc --noEmit server/nvm/kernel/benchmarks/trinity-gate.bench.ts  # Should pass
```

---

## 5. Fix ClueCarrier Enum Values
**Time:** 20 minutes  
**Errors Fixed:** 8 (6.1%)  
**Difficulty:** ⭐⭐ Easy  
**Files Affected:** 5

### Error Messages
```
error TS2322: Type '"photograph"' is not assignable to type 'ClueCarrier'.
error TS2322: Type '"environment"' is not assignable to type 'ClueCarrier'.
```

### Fix
Replace invalid ClueCarrier values with valid enum members.

### Valid ClueCarrier Values
```typescript
'object' | 'line' | 'gesture' | 'location' | 'absence' | 'behavior' | 
'camera' | 'sound' | 'costume' | 'lighting' | 'timing' | 'silence' | 
'transformation' | 'wound' | 'document' | 'symbol' | 'animal' | 'price'
```

### Mapping Table
| Invalid Value | Replace With | Reasoning |
|---------------|--------------|-----------|
| `'photograph'` | `'object'` | A photograph is a physical object |
| `'environment'` | `'location'` | Environment describes location |
| `'bartender_apron'` | `'costume'` | An apron is costume/wardrobe |
| `'character_${n}'` | `'behavior'` | Character actions are behavior |
| `'new_character'` | `'behavior'` | Character presence is behavior |

### Implementation

#### File 1: server/nvm/kernel/v5-examples.ts (Line 38)
```typescript
// BEFORE:
{ op: 'SEED_CLUE', clueId: 'apron', carrier: 'bartender_apron' }

// AFTER:
{ op: 'SEED_CLUE', clueId: 'apron', carrier: 'costume' }
```

#### File 2: server/nvm/quantum/example.ts (Line 31)
```typescript
// BEFORE:
{ op: 'SEED_CLUE', clueId: 'c1', carrier: 'environment' }

// AFTER:
{ op: 'SEED_CLUE', clueId: 'c1', carrier: 'location' }
```

#### File 3: server/nvm/benchmarks/integration.bench.ts
```typescript
// Line 50, 338:
// BEFORE: carrier: `character_${i}`
// AFTER: carrier: 'behavior'

// Line 433:
// BEFORE: carrier: 'new_character'
// AFTER: carrier: 'behavior'
```

#### File 4: server/nvm/kernel/benchmarks/trinity-gate.bench.ts
```typescript
// Line 59:
// BEFORE: carrier: `character_${i}`
// AFTER: carrier: 'behavior'
```

#### File 5: server/nvm/quantum/benchmarks/story-field.bench.ts
```typescript
// Line 44:
// BEFORE: carrier: `character_${i}`
// AFTER: carrier: 'behavior'
```

### Search and Replace Commands
```bash
# Run these in the project root:
sed -i "s/carrier: 'photograph'/carrier: 'object'/g" server/nvm/**/*.ts
sed -i "s/carrier: 'environment'/carrier: 'location'/g" server/nvm/**/*.ts
sed -i "s/carrier: 'bartender_apron'/carrier: 'costume'/g" server/nvm/**/*.ts
sed -i "s/carrier: \`character_\${.*}\`/carrier: 'behavior'/g" server/nvm/**/*.ts
sed -i "s/carrier: 'new_character'/carrier: 'behavior'/g" server/nvm/**/*.ts
```

### Validation
```bash
# Should show no ClueCarrier errors:
npx tsc --noEmit | grep ClueCarrier  # Should return nothing
```

---

## Execution Plan

### Step-by-Step (40
