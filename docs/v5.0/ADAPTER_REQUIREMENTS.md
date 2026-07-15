# Adapter Requirements Specification
## StoryMachine V5.0 Type Enrichment Layer

**Generated:** 2026-07-15  
**Purpose:** Bridge V5 research-grade types to StoryMachine production types  
**Total Adapters:** 4 core functions  
**Estimated LOC:** ~140 lines  
**Effort:** 8 hours

---

## Architecture Overview

### The Adapter Pattern

V5.0 uses structured semantic types for reasoning (subject-predicate-object triples), while StoryMachine uses simple string descriptions. The adapter layer converts between formats without requiring changes to existing code.

```
┌─────────────────────────────────────────────────┐
│          StoryMachine (Legacy)                  │
│  { content: "Bob entered room" }                │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│          Adapter Layer (NEW)                    │
│  enrichAtomicFact()                             │
│  enrichBelief()                                 │
│  enrichEmotion()                                │
│  parseSemanticTriple()                          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│          V5.0 Verifiers                         │
│  { subject: "Bob", predicate: "entered",        │
│    object: "room" }                             │
└─────────────────────────────────────────────────┘
```

### Design Principles

1. **Backward Compatible:** Accept both old and new formats
2. **Idempotent:** Enriching already-enriched data is safe
3. **Lossless:** Store original for round-trip conversion
4. **Fail-Safe:** Invalid input gets sensible defaults

---

## Adapter 1: parseSemanticTriple()

### Purpose
Convert natural language strings into subject-predicate-object semantic triples.

### Signature
```typescript
function parseSemanticTriple(text: string): {
  subject: string;
  predicate: string;
  object: string;
}
```

### Input Examples
```typescript
"Bob entered the room"
"The door is locked"
"Sarah loves coffee"
"Gun on table"
```

### Output Examples
```typescript
{ subject: "Bob", predicate: "entered", object: "the room" }
{ subject: "the door", predicate: "is", object: "locked" }
{ subject: "Sarah", predicate: "loves", object: "coffee" }
{ subject: "Gun", predicate: "on", object: "table" }
```

### Algorithm (Heuristic Parser)

**Phase 1: Simple Pattern Matching**
```typescript
function parseSemanticTriple(text: string): SemanticTriple {
  const cleaned = text.trim();
  
  // Pattern 1: "X verb Y" (most common)
  const verbMatch = cleaned.match(/^(\w+(?:\s+\w+)?)\s+(\w+)\s+(.+)$/);
  if (verbMatch) {
    return {
      subject: verbMatch[1],
      predicate: verbMatch[2],
      object: verbMatch[3],
    };
  }
  
  // Pattern 2: "X is Y"
  const isMatch = cleaned.match(/^(.+?)\s+is\s+(.+)$/i);
  if (isMatch) {
    return {
      subject: isMatch[1],
      predicate: "is",
      object: isMatch[2],
    };
  }
  
  // Pattern 3: "X on/in/at Y" (spatial relations)
  const spatialMatch = cleaned.match(/^(.+?)\s+(on|in|at|near|under|over)\s+(.+)$/i);
  if (spatialMatch) {
    return {
      subject: spatialMatch[1],
      predicate: spatialMatch[2],
      object: spatialMatch[3],
    };
  }
  
  // Fallback: Treat whole string as state description
  return {
    subject: "entity",
    predicate: "has_state",
    object: cleaned,
  };
}
```

### Test Cases
```typescript
describe('parseSemanticTriple', () => {
  it('parses simple actions', () => {
    expect(parseSemanticTriple('Bob entered room'))
      .toEqual({ subject: 'Bob', predicate: 'entered', object: 'room' });
  });
  
  it('parses states', () => {
    expect(parseSemanticTriple('The door is locked'))
      .toEqual({ subject: 'The door', predicate: 'is', object: 'locked' });
  });
  
  it('parses spatial relations', () => {
    expect(parseSemanticTriple('Gun on table'))
      .toEqual({ subject: 'Gun', predicate: 'on', object: 'table' });
  });
  
  it('handles fallback', () => {
    expect(parseSemanticTriple('mysterious'))
      .toEqual({ subject: 'entity', predicate: 'has_state', object: 'mysterious' });
  });
});
```

### Complexity: MEDIUM
### LOC: ~40
### Effort: 2 hours (with tests)

---

## Adapter 2: enrichAtomicFact()

### Purpose
Convert simple string facts to structured semantic AtomicFact objects.

### Signature
```typescript
function enrichAtomicFact(
  simple: string | { content?: string; text?: string; description?: string } | AtomicFact
): AtomicFact
```

### Input/Output Types
```typescript
// Input (multiple formats):
"Bob entered the room"
{ factId: "f1", content: "Bob entered the room", addedAtTurn: 1 }
{ factId: "f2", text: "Door is locked" }
{ factId: "f3", description: "Gun on table" }
// Already enriched:
{ factId: "f4", subject: "Sarah", predicate: "left", object: "building", ... }

// Output (always structured):
{
  factId: string;
  subject: string;
  predicate: string;
  object: string;
  addedAtTurn: number;
  validFrom: number;
  validTo: number | null;
}
```

### Implementation
```typescript
import { v4 as uuid } from 'uuid';

export function enrichAtomicFact(simple: unknown): AtomicFact {
  // Already enriched?
  if (isAtomicFact(simple)) {
    return simple;
  }
  
  // Extract content string
  let content: string;
  let metadata: Partial<AtomicFact> = {};
  
  if (typeof simple === 'string') {
    content = simple;
  } else if (typeof simple === 'object' && simple !== null) {
    const obj = simple as any;
    content = obj.content || obj.text || obj.description || '';
    metadata = {
      factId: obj.factId,
      addedAtTurn: obj.addedAtTurn,
      validFrom: obj.validFrom,
      validTo: obj.validTo,
    };
  } else {
    throw new Error(`Cannot enrich AtomicFact from: ${typeof simple}`);
  }
  
  // Parse into semantic triple
  const triple = parseSemanticTriple(content);
  
  // Construct enriched fact
  return {
    factId: metadata.factId || uuid(),
    subject: triple.subject,
    predicate: triple.predicate,
    object: triple.object,
    addedAtTurn: metadata.addedAtTurn ?? 0,
    validFrom: metadata.validFrom ?? 0,
    validTo: metadata.validTo ?? null,
    
    // Store original for debugging/round-trip
    _original: typeof simple === 'object' ? simple : { content },
  };
}

// Type guard
function isAtomicFact(obj: unknown): obj is AtomicFact {
  if (typeof obj !== 'object' || obj === null) return false;
  const fact = obj as any;
  return (
    typeof fact.factId === 'string' &&
    typeof fact.subject === 'string' &&
    typeof fact.predicate === 'string' &&
    typeof fact.object === 'string' &&
    typeof fact.addedAtTurn === 'number'
  );
}
```

### Test Cases
```typescript
describe('enrichAtomicFact', () => {
  it('enriches string', () => {
    const result = enrichAtomicFact('Bob entered room');
    expect(result.subject).toBe('Bob');
    expect(result.predicate).toBe('entered');
    expect(result.object).toBe('room');
  });
  
  it('enriches object with content', () => {
    const result = enrichAtomicFact({
      factId: 'f1',
      content: 'Door is locked',
      addedAtTurn: 5
    });
    expect(result.factId).toBe('f1');
    expect(result.subject).toBe('Door');
    expect(result.addedAtTurn).toBe(5);
  });
  
  it('is idempotent', () => {
    const enriched: AtomicFact = {
      factId: 'f1',
      subject: 'Bob',
      predicate: 'entered',
      object: 'room',
      addedAtTurn: 0,
      validFrom: 0,
      validTo: null,
    };
    expect(enrichAtomicFact(enriched)).toBe(enriched);
  });
});
```

### Complexity: LOW (reuses parseSemanticTriple)
### LOC: ~50
### Effort: 2 hours (with tests)
### Solves: 45 errors (34.4%)

---

## Adapter 
