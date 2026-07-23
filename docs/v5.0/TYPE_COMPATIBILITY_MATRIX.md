# StoryMachine V5.0 Type Compatibility Matrix
## Complete Analysis of 131 TypeScript Errors

**Generated:** 2026-07-15  
**TypeScript Version:** 5.x (strict mode)  
**Actual Error Count:** 131 (not 127 as initially estimated)

---

## Executive Summary

### Error Distribution by Category

| Category | Count | % of Total | Priority | Effort |
|----------|-------|------------|----------|--------|
| **AtomicFact Structure Mismatch** | 45 | 34.4% | CRITICAL | HIGH |
| **Belief Structure Mismatch** | 22 | 16.8% | HIGH | MEDIUM |
| **Type Assignment Incompatibility** | 17 | 13.0% | HIGH | MEDIUM |
| **Function Argument Type Mismatch** | 12 | 9.2% | MEDIUM | LOW |
| **Export Declaration Conflicts** | 8 | 6.1% | HIGH | LOW |
| **ClueCarrier Enum Extension** | 8 | 6.1% | LOW | LOW |
| **EmotionState Structure Mismatch** | 5 | 3.8% | MEDIUM | LOW |
| **BenchmarkResult Structure** | 4 | 3.1% | LOW | LOW |
| **Missing Type Exports** | 3 | 2.3% | MEDIUM | LOW |
| **FountainAnalysis Extension** | 2 | 1.5% | LOW | LOW |
| **RelationshipDelta Type** | 2 | 1.5% | LOW | LOW |
| **CommitDeltaSummary Type** | 2 | 1.5% | LOW | LOW |
| **Other** | 1 | 0.8% | LOW | LOW |

**Total:** 131 errors

---

## Type Compatibility Analysis

### 1. AtomicFact (45 errors - 34.4%)

#### V5 Expected Type
```typescript
// server/nvm/ops/StoryOp.ts
export interface AtomicFact {
  factId: string;
  subject: string;      // ← Structured semantic triple
  predicate: string;    // ← Research-grade format
  object: string;       // ← Enables reasoning
  addedAtTurn: number;
  validFrom: number;
  validTo: number | null;
}
```

#### StoryMachine Actual Usage
```typescript
// Tests and examples use simple string format:
{ factId: "f1", content: "Bob entered the room", addedAtTurn: 1 }
{ factId: "f2", text: "Door is locked", addedAtTurn: 2 }
{ factId: "f3", description: "Gun on table", addedAtTurn: 3 }
```

#### Gap Analysis
- **V5 Expects:** Structured semantic triple (subject-predicate-object)
- **StoryMachine Has:** Simple string descriptions (`content`, `text`, `description`)
- **Impact:** Tests fail, examples break, integration blocked
- **Root Cause:** V5 verifiers need semantic structure for reasoning

#### Resolution Strategy: **ENRICH with Adapter**

**Approach:**
1. Create `enrichAtomicFact()` adapter
2. Parse simple strings into semantic triples using NLP
3. Maintain backward compatibility

**Implementation:**
```typescript
// server/nvm/kernel/adapters/type-enrichment.ts

export function enrichAtomicFact(simple: string | AtomicFact): AtomicFact {
  // Already enriched
  if (typeof simple !== 'string' && 'subject' in simple) {
    return simple;
  }
  
  const content = typeof simple === 'string' ? simple : 
    (simple as any).content || (simple as any).text || (simple as any).description;
  
  // Parse into semantic triple
  const triple = parseSemanticTriple(content);
  
  return {
    factId: (simple as any).factId || generateId(),
    subject: triple.subject,
    predicate: triple.predicate,
    object: triple.object,
    addedAtTurn: (simple as any).addedAtTurn || 0,
    validFrom: (simple as any).validFrom || 0,
    validTo: (simple as any).validTo || null,
  };
}

function parseSemanticTriple(text: string): { subject: string; predicate: string; object: string } {
  // Simple heuristic parser
  // "Bob entered the room" → { subject: "Bob", predicate: "entered", object: "the room" }
  // Can be enhanced with NLP later
  
  const words = text.trim().split(/\s+/);
  if (words.length < 2) {
    return { subject: "entity", predicate: "has_state", object: text };
  }
  
  const subject = words[0];
  const predicate = words[1];
  const object = words.slice(2).join(' ') || "unknown";
  
  return { subject, predicate, object };
}
```

**Affected Files (45 locations):**
- `server/nvm/__tests__/smoke.test.ts` (16 errors)
- `server/nvm/kernel/event-store.test.ts` (11 errors)
- `server/nvm/quantum/example.ts` (11 errors)
- `server/nvm/kernel/v5-examples.ts` (7 errors)

**Effort:** 6-8 hours
- 2 hours: Implement adapter
- 2 hours: Write parser logic
- 2 hours: Update all test files
- 2 hours: Test and validate

**Priority:** CRITICAL (blocks 34% of errors)

---

### 2. Belief Structure (22 errors - 16.8%)

#### V5 Expected Type
```typescript
// V5 verifiers expect structured beliefs (subject-predicate-object)
// Used in: owne-verifier.ts, preflight-auditor.ts

// Expected structure (inferred from error messages):
interface Belief {
  id: string;
  subject: string;      // ← What the belief is about
  predicate: string;    // ← Relationship/property
  object: string;       // ← Value/target
  confidence: number;
  source: BeliefSource;
  acquired_at: number;
}
```

#### StoryMachine Actual Type
```typescript
// server/engine/types.ts
export interface Belief {
  id: string;
  proposition: string;  // ← Simple string, no structure
  confidence: number;
  source: BeliefSource;
  source_agent_id?: string;
  source_event_id?: string;
  acquired_at: number;
  contradicts?: string[];
}
```

#### Gap Analysis
- **V5 Expects:** Structured belief with subject-predicate-object
- **StoryMachine Has:** Simple proposition string
- **Impact:** OWNE verifier (10 errors), Pre-Flight auditor (12 errors)
- **Root Cause:** V5 knowledge path verification needs structured beliefs

#### Resolution Strategy: **ENRICH with Adapter**

**Implementation:**
```typescript
export function enrichBelief(simple: Belief): StructuredBelief {
  if ('subject' in simple) {
    return simple as StructuredBelief;
  }
  
  const triple = parseSemanticTriple(simple.proposition);
  
  return {
    ...simple,
    subject: triple.subject,
    predicate: triple.predicate,
    object: triple.object,
    proposition: simple.proposition, // Keep original for backward compat
  };
}
```

**Affected Files:**
- `server/nvm/kernel/verifiers/owne-verifier.ts` (10 errors)
- `server/nvm/kernel/verifiers/preflight-auditor.ts` (12 errors)

**Effort:** 4 hours
- 2 hours: Implement adapter (reuse parseSemanticTriple)
- 1 hour: Update verifiers to use adapter
- 1 hour: Test

**Priority:** HIGH (blocks Trinity Gate verifiers)

---

### 3. EmotionState Structure (5 errors - 3.8%)

#### V5 Expected Type
```typescript
// V5 verifiers expect dimensional emotion model
interface EmotionState {
  valence: number;      // ← Pleasure-displeasure axis (-1 to 1)
  arousal: number;      // ← Activation level (0 to 1)
  type?: string;        // ← Emotion label
  intensity: number;
}
```

#### StoryMachine Actual Type
```typescript
// server/engine/types.ts
export interface EmotionState {
  joy: number;               // ← Discrete emotion dimensions
  distress: number;
  anger: number;
  anger_target_id?: string;
  fear: number;
  pride: number;
  shame: number;
  dominant: EmotionType;     // ← Not 'type'
  intensity: number;
  last_updated_at: number;
}
```

#### Gap Analysis
- **V5 Expects:** Valence-arousal dimensional model (research standard)
- **StoryMachine Has:** Discrete emotion categories (OCC model)
- **Impact:** OWNE verifier emotion validation
- **Compatibility:** Both valid emotion models, can convert

#### Resolution Strategy: **ENRICH with Mapper**

**Implementation:**
```typescript
export function enrichEmotion(discrete: EmotionState): DimensionalEmotion {
  // Map discrete emotions to valence-arousal space
  const valence = 
    discrete.joy * 0.8 - 
    discrete.distress * 0.6 - 
    discrete.anger * 0.7 - 
    discrete.fear * 0.5 - 
    discrete.shame * 0.4 + 
    discrete.pride * 0.5;
    
  const arousal = 
    discrete.anger * 0.9 + 
    discrete.fear * 0.8 + 
    discrete.joy * 0.6 + 
    discrete.distress * 0.5;
  
  return {
    valence: Math.max(-1, Math.min(1, valence / 100)),
    arousal: Math.max(0, Math.mi
