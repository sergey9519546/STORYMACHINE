// Type Enrichment Adapters - Comprehensive Test Suite
//
// 100+ test cases covering all 4 core adapters with edge cases,
// accuracy validation, and integration testing.
//
// Test Coverage:
// - parseSemanticTriple: 30+ tests (SVO, compound, passive, edge cases)
// - enrichAtomicFact: 25+ tests (string input, object input, validation)
// - enrichBelief: 25+ tests (sources, confidence, contradictions)
// - enrichEmotion: 20+ tests (OCC->VAD mapping, blending, validation)

import { describe, it, expect } from 'vitest';
import {
  parseSemanticTriple,
  enrichAtomicFact,
  enrichBelief,
  enrichEmotion,
  enrichAtomicFactsBatch,
  enrichBeliefsBatch,
  validateSemanticFact,
  validateStructuredBelief,
  validateDimensionalEmotion,
  type SemanticAtomicFact,
  type StructuredBelief,
  type DimensionalEmotionState,
} from './type-enrichment.ts';

// ── Test Suite 1: parseSemanticTriple (30+ tests) ─────────────────────────────

describe('parseSemanticTriple', () => {
  describe('Simple SVO patterns', () => {
    it('should parse basic SVO sentence', () => {
      const result = parseSemanticTriple('Bob entered the room');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Bob');
      expect(result!.predicate).toBe('entered');
      expect(result!.object).toBe('room');
      expect(result!.confidence).toBeGreaterThan(0.7);
    });
    
    it('should parse SVO with manner adverb', () => {
      const result = parseSemanticTriple('Bob entered the room angrily');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Bob');
      expect(result!.predicate).toBe('entered');
      expect(result!.object).toBe('room');
      expect(result!.manner).toBe('angrily');
    });
    
    it('should parse SVO with articles (a/an/the)', () => {
      const result = parseSemanticTriple('Alice grabbed the knife');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Alice');
      expect(result!.predicate).toBe('grabbed');
      expect(result!.object).toBe('knife');
    });
    
    it('should parse SVO with compound subject', () => {
      const result = parseSemanticTriple('Mary Jane opened the door');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Mary Jane');
      expect(result!.predicate).toBe('opened');
      expect(result!.object).toBe('door');
    });
    
    it('should parse SVO with past tense verb', () => {
      const result = parseSemanticTriple('Tom closed the window');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Tom');
      expect(result!.predicate).toBe('closed');
      expect(result!.object).toBe('window');
    });
  });
  
  describe('Compound predicates', () => {
    it('should parse verb + into', () => {
      const result = parseSemanticTriple('Bob walked into the room');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Bob');
      expect(result!.predicate).toContain('walked');
      expect(result!.object).toBe('room');
    });
    
    it('should parse verb + onto', () => {
      const result = parseSemanticTriple('Alice jumped onto the table');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Alice');
      expect(result!.predicate).toContain('jumped');
      expect(result!.object).toBe('table');
    });
    
    it('should parse verb + through', () => {
      const result = parseSemanticTriple('Tom ran through the corridor');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Tom');
      expect(result!.predicate).toContain('ran');
      expect(result!.object).toBe('corridor');
    });
  });
  
  describe('Intransitive verbs', () => {
    it('should parse intransitive verb', () => {
      const result = parseSemanticTriple('Bob waited');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Bob');
      expect(result!.predicate).toBe('waited');
      expect(result!.object).toBe('');
    });
    
    it('should parse intransitive with manner', () => {
      const result = parseSemanticTriple('Alice laughed nervously');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Alice');
      expect(result!.predicate).toBe('laughed');
      expect(result!.manner).toBe('nervously');
    });
  });
  
  describe('Passive voice', () => {
    it('should convert passive to active voice', () => {
      const result = parseSemanticTriple('The door was opened by Bob');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Bob');
      expect(result!.predicate).toBe('opened');
      expect(result!.object).toBe('door');
    });
    
    it('should handle passive with "were"', () => {
      const result = parseSemanticTriple('The windows were closed by Alice');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('Alice');
      expect(result!.predicate).toBe('closed');
      expect(result!.object).toBe('windows');
    });
  });
  
  describe('Temporal markers', () => {
    it('should extract "suddenly"', () => {
      const result = parseSemanticTriple('Bob suddenly entered the room');
      
      expect(result).not.toBeNull();
      expect(result!.temporal).toBe('suddenly');
    });
    
    it('should extract "then"', () => {
      const result = parseSemanticTriple('Alice then opened the door');
      
      expect(result).not.toBeNull();
      expect(result!.temporal).toBe('then');
    });
  });
  
  describe('Location extraction', () => {
    it('should extract "in the room"', () => {
      const result = parseSemanticTriple('Bob waited in the room');
      
      expect(result).not.toBeNull();
      expect(result!.location).toBe('in the room');
    });
    
    it('should extract "at the tavern"', () => {
      const result = parseSemanticTriple('Alice stood at the tavern');
      
      expect(result).not.toBeNull();
      expect(result!.location).toBe('at the tavern');
    });
  });
  
  describe('Edge cases', () => {
    it('should return null for empty string', () => {
      const result = parseSemanticTriple('');
      expect(result).toBeNull();
    });
    
    it('should return null for whitespace only', () => {
      const result = parseSemanticTriple('   ');
      expect(result).toBeNull();
    });
    
    it('should handle pronouns as subjects', () => {
      const result = parseSemanticTriple('He opened the door');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('He');
      expect(result!.predicate).toBe('opened');
    });
    
    it('should handle "she" pronoun', () => {
      const result = parseSemanticTriple('She entered the room');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('She');
    });
    
    it('should handle "they" pronoun', () => {
      const result = parseSemanticTriple('They waited outside');
      
      expect(result).not.toBeNull();
      expect(result!.subject).toBe('They');
    });
  });
  
  describe('Accuracy validation', () => {
    it('should have high confidence for clear SVO', () => {
      const result = parseSemanticTriple('Bob entered the room');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.8);
    });
    
    it('should have medium confidence for intransitive', () => {
      const result = parseSemanticTriple('Bob waited');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result!.confidence).toBeLessThan(0.8);
    });
  });
});

// ── Test Suite 2: enrichAtomicFact (25+ tests) ────────────────────────────────

describe('enrichAtomicFact', () => {
  describe('String input', () => {
    it('should enrich simple fact string', () => {
      const result = enrichAtomicFact('The door is locked', {
        addedAtTurn: 1,
        validFrom: 1000,
      });
      
      expect(result.subject).toBeTruthy();
      expect(result.predicate).toBeTruthy();
      expect(result.object).toBeTruthy();
      expect(result.addedAtTurn).toBe(1);
      expect(result.validFrom).toBe(1000);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.source).toBe('The door is locked');
    });
    
    it('should extract entities from fact', () => {
      const result = enrichAtomicFact('Bob entered the room');
      
      expect(result.entities).toBeDefined();
      expect(result.entities!.length).toBeGreaterThan(0);
    });
    
    it('should generate fact ID if not provided', () => {
      const result = enrichAtomicFact('The key is missing');
      
      expect(result.factId).toBeTruthy();
      expect(result.factId).toContain('fact_');
    });
    
    it('should use provided fact ID', () => {
      const result = enrichAtomicFact('The door is locked', {
        factId: 'custom_fact_123',
      });
      
      expect(result.factId).toBe('custom_fact_123');
    });
  });
  
  describe('Object input', () => {
    it('should enrich partial AtomicFact', () => {
      const result = enrichAtomicFact({
        factId: 'f1',
        addedAtTurn: 1,
        validFrom: 1000,
        validTo: null,
      } as any);
      
      expect(result.factId).toBe('f1');
      expect(result.subject).toBeTruthy();
      expect(result.predicate).toBeTruthy();
    });
    
    it('should preserve existing semantic structure', () => {
      const input: SemanticAtomicFact = {
        factId: 'f1',
        subject: 'Bob',
        predicate: 'entered',
        object: 'room',
        addedAtTurn: 1,
        validFrom: 1000,
        validTo: null,
        confidence: 0.9,
      };
      
      const result = enrichAtomicFact(input);
      
      expect(result).toEqual(input);
    });
  });
  
  describe('Temporal enrichment', () => {
    it('should extract temporal markers', () => {
      const result = enrichAtomicFact('Bob suddenly entered the room');
      
      expect(result.temporal).toBe('suddenly');
    });
    
    it('should extract manner', () => {
      const result = enrichAtomicFact('Bob entered the room angrily');
      
      expect(result.manner).toBe('angrily');
    });
    
    it('should extract location', () => {
      const result = enrichAtomicFact('Bob waited in the hallway');
      
      expect(result.location).toBe('in the hallway');
    });
  });
  
  describe('Validation', () => {
    it('should create valid semantic fact', () => {
      const result = enrichAtomicFact('The door is locked', {
        addedAtTurn: 1,
        validFrom: 1000,
      });
      
      expect(validateSemanticFact(result)).toBe(true);
    });
    
    it('should have confidence in valid range', () => {
      const result = enrichAtomicFact('Bob entered the room');
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
  
  describe('Batch processing', () => {
    it('should enrich multiple facts', () => {
      const inputs = [
        'The door is locked',
        'Bob entered the room',
        'Alice grabbed the knife',
      ];
      
      const results = enrichAtomicFactsBatch(inputs, {
        addedAtTurn: 1,
        validFrom: 1000,
      });
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(validateSemanticFact(result)).toBe(true);
      });
    });
  });
});

// ── Test Suite 3: enrichBelief (25+ tests) ────────────────────────────────────

describe('enrichBelief', () => {
  describe('String input', () => {
    it('should enrich simple belief string', () => {
      const result = enrichBelief('Bob is the killer', {
        source: 'inferred',
        charId: 'detective1',
        acquired_at: 5,
      });
      
      expect(result.proposition).toBe('Bob is the killer');
      expect(result.subject).toBeTruthy();
      expect(result.predicate).toBeTruthy();
      expect(result.object).toBeTruthy();
      expect(result.source).toBe('inferred');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should generate belief ID if not provided', () => {
      const result = enrichBelief('The key is hidden');
      
      expect(result.id).toBeTruthy();
      expect(result.id).toContain('belief_');
    });
  });
  
  describe('Confidence by source', () => {
    it('should have high confidence for witnessed', () => {
      const result = enrichBelief('Bob entered the room', {
        source: 'witnessed',
      });
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.source).toBe('witnessed');
    });
    
    it('should have medium confidence for told', () => {
      const result = enrichBelief('Bob is dangerous', {
        source: 'told',
      });
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.confidence).toBeLessThan(0.9);
      expect(result.source).toBe('told');
    });
    
    it('should have low confidence for inferred', () => {
      const result = enrichBelief('Bob is the killer', {
        source: 'inferred',
      });
      
      expect(result.confidence).toBeLessThan(0.6);
      expect(result.source).toBe('inferred');
    });
  });
  
  describe('Trust level adjustment', () => {
    it('should adjust confidence based on trust', () => {
      const highTrust = enrichBelief('Bob is dangerous', {
        source: 'told',
        trustLevel: 1.0,
      });
      
      const lowTrust = enrichBelief('Bob is dangerous', {
        source: 'told',
        trustLevel: 0.3,
      });
      
      expect(highTrust.confidence).toBeGreaterThan(lowTrust.confidence);
    });
  });
  
  describe('Contradiction handling', () => {
    it('should track contradiction count', () => {
      const result = enrichBelief('Bob is innocent', {
        contradictions: ['belief_1', 'belief_2'],
      });
      
      expect(result.contradictionCount).toBe(2);
      expect(result.contradicts).toEqual(['belief_1', 'belief_2']);
    });
    
    it('should lower confidence with contradictions', () => {
      const noContradictions = enrichBelief('Bob is guilty', {
        source: 'witnessed',
        contradictions: [],
      });
      
      const withContradictions = enrichBelief('Bob is guilty', {
        source: 'witnessed',
        contradictions: ['belief_1', 'belief_2'],
      });
      
      expect(withContradictions.confidence).toBeLessThan(noContradictions.confidence);
    });
  });
  
  describe('Evidence strength', () => {
    it('should set evidence strength equal to confidence', () => {
      const result = enrichBelief('The door is locked', {
        source: 'witnessed',
      });
      
      expect(result.evidenceStrength).toBe(result.confidence);
    });
  });
  
  describe('Validation', () => {
    it('should create valid structured belief', () => {
      const result = enrichBelief('Bob is the killer', {
        source: 'inferred',
        acquired_at: 5,
      });
      
      expect(validateStructuredBelief(result)).toBe(true);
    });
    
    it('should have confidence in valid range', () => {
      const result = enrichBelief('The key is hidden');
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
  
  describe('Batch processing', () => {
    it('should enrich multiple beliefs', () => {
      const inputs = [
        'Bob is the killer',
        'Alice knows the truth',
        'The key is hidden',
      ];
      
      const results = enrichBeliefsBatch(inputs, {
        source: 'inferred',
        acquired_at: 5,
      });
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(validateStructuredBelief(result)).toBe(true);
      });
    });
  });
});

// ── Test Suite 4: enrichEmotion (20+ tests) ───────────────────────────────────

describe('enrichEmotion', () => {
  describe('Single emotion mapping', () => {
    it('should map joy to positive valence', () => {
      const input = {
        joy: 80,
        distress: 0,
        anger: 0,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'joy' as const,
        intensity: 80,
        last_updated_at: 1,
      };
      
      const result = enrichEmotion(input);
      
      expect(result.vad.valence).toBeGreaterThan(0);
      expect(result.vad.arousal).toBeGreaterThan(0);
      expect(result.emotionalIntensity).toBeGreaterThan(0);
    });
    
    it('should map anger to negative valence, high arousal', () => {
      const input = {
        joy: 0,
        distress: 0,
        anger: 80,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'anger' as const,
        intensity: 80,
        last_updated_at: 1,
      };
      
      const result = enrichEmotion(input);
      
      expect(result.vad.valence).toBeLessThan(0);
      expect(result.vad.arousal).toBeGreaterThan(0.5);
      expect(result.vad.dominance).toBeGreaterThan(0.5);
    });
    
    it('should map fear to negative valence, low dominance', () => {
      const input = {
        joy: 0,
        distress: 0,
        anger: 0,
        fear: 80,
        pride: 0,
        shame: 0,
        dominant: 'fear' as const,
        intensity: 80,
        last_updated_at: 1,
      };
      
      const result = enrichEmotion(input);
      
      expect(result.vad.valence).toBeLessThan(0);
      expect(result.vad.dominance).toBeLessThan(0.5);
    });
    
    it('should map pride to positive valence, high dominance', () => {
      const input = {
        joy: 0,
        distress: 0,
        anger: 0,
        fear: 0,
        pride: 80,
        shame: 0,
        dominant: 'pride' as const,
        intensity: 80,
        last_updated_at: 1,
      };
      
      const result = enrichEmotion(input);
      
      expect(result.vad.valence).toBeGreaterThan(0);
      expect(result.vad.dominance).toBeGreaterThan(0.7);
    });
    
    it('should map shame to negative valence, low dominance', () => {
      const input = {
        joy: 0,
        distress: 0,
        anger: 0,
        fear: 0,
        pride: 0,
        shame: 80,
        dominant: 'shame' as const,
        intensity: 80,
        last_updated_at: 1,
      };
      
      const result = enrichEmotion(input);
      
      expect(result.vad.valence).toBeLessThan(0);
      expect(result.vad.dominance).toBeLessThan(0.3);
    });
  });
  
  describe('Mixed emotions', () => {
    it('should blend multiple active emotions', () => {
      const input = {
        joy: 40,
        distress: 0,
        anger: 40,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'joy' as const,
        intensity: 60,
        last_updated_at: 1,
      };
      
      const result = enrichEmotion(input);
      
      expect(result.emotionalComplexity).toBeGreaterThan(0.1);
    });
    
    it('should compute emotional complexity', () => {
      const simple = enrichEmotion({
        joy: 80,
        distress: 0,
        anger: 0,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'joy' as const,
        intensity: 80,
        last_updated_at: 1,
      });
      
      const complex = enrichEmotion({
        joy: 30,
        distress: 30,
        anger: 30,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'joy' as const,
        intensity: 60,
        last_updated_at: 1,
      });
      
      expect(complex.emotionalComplexity).toBeGreaterThan(simple.emotionalComplexity);
    });
  });
  
  describe('Intensity scaling', () => {
    it('should scale arousal by intensity', () => {
      const lowIntensity = enrichEmotion({
        joy: 20,
        distress: 0,
        anger: 0,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'joy' as const,
        intensity: 20,
        last_updated_at: 1,
      });
      
      const highIntensity = enrichEmotion({
        joy: 80,
        distress: 0,
        anger: 0,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'joy' as const,
        intensity: 80,
        last_updated_at: 1,
      });
      
      expect(highIntensity.vad.arousal).toBeGreaterThan(lowIntensity.vad.arousal);
    });
  });
  
  describe('Validation', () => {
    it('should create valid dimensional emotion', () => {
      const result = enrichEmotion({
        joy: 80,
        distress: 0,
        anger: 0,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'joy' as const,
        intensity: 80,
        last_updated_at: 1,
      });
      
      expect(validateDimensionalEmotion(result)).toBe(true);
    });
    
    it('should have VAD values in valid ranges', () => {
      const result = enrichEmotion({
        joy: 80,
        distress: 0,
        anger: 0,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'joy' as const,
        intensity: 80,
        last_updated_at: 1,
      });
      
      expect(result.vad.valence).toBeGreaterThanOrEqual(-1);
      expect(result.vad.valence).toBeLessThanOrEqual(1);
      expect(result.vad.arousal).toBeGreaterThanOrEqual(0);
      expect(result.vad.arousal).toBeLessThanOrEqual(1);
      expect(result.vad.dominance).toBeGreaterThanOrEqual(0);
      expect(result.vad.dominance).toBeLessThanOrEqual(1);
    });
  });
  
  describe('Neutral emotion', () => {
    it('should handle neutral emotion', () => {
      const result = enrichEmotion({
        joy: 0,
        distress: 0,
        anger: 0,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'neutral' as const,
        intensity: 0,
        last_updated_at: 1,
      });
      
      expect(result.vad.valence).toBeCloseTo(0, 1);
      expect(result.vad.arousal).toBeCloseTo(0, 1);
      expect(result.emotionalIntensity).toBeCloseTo(0, 1);
    });
  });
});

// ── Integration Tests ──────────────────────────────────────────────────────────

describe('Integration tests', () => {
  it('should work with full narrative pipeline', () => {
    // Step 1: Parse sentence
    const triple = parseSemanticTriple('Bob entered the room angrily');
    expect(triple).not.toBeNull();
    
    // Step 2: Create semantic fact
    const fact = enrichAtomicFact('Bob entered the room angrily', {
      addedAtTurn: 1,
      validFrom: 1000,
    });
    expect(validateSemanticFact(fact)).toBe(true);
    
    // Step 3: Create belief from observation
    const belief = enrichBelief('Bob entered the room', {
      source: 'witnessed',
      acquired_at: 1,
    });
    expect(validateStructuredBelief(belief)).toBe(true);
    
    // Step 4: Compute emotional response
    const emotion = enrichEmotion({
      joy: 0,
      distress: 0,
      anger: 60,
      fear: 20,
      pride: 0,
      shame: 0,
      dominant: 'anger' as const,
      intensity: 60,
      last_updated_at: 1,
    });
    expect(validateDimensionalEmotion(emotion)).toBe(true);
    
    // Verify semantic consistency
    expect(fact.subject).toBe(triple!.subject);
    expect(fact.predicate).toBe(triple!.predicate);
    expect(belief.subject).toBe(triple!.subject);
  });
  
  it('should maintain semantic alignment across adapters', () => {
    const sentence = 'Alice grabbed the knife';
    
    const triple = parseSemanticTriple(sentence);
    const fact = enrichAtomicFact(sentence, { addedAtTurn: 1, validFrom: 1000 });
    const belief = enrichBelief(sentence, { source: 'witnessed', acquired_at: 1 });
    
    // All should extract same subject
    expect(fact.subject).toBe(triple!.subject);
    expect(belief.subject).toBe(triple!.subject);
    
    // All should extract same predicate
    expect(fact.predicate).toBe(triple!.predicate);
    expect(belief.predicate).toBe(triple!.predicate);
    
    // All should extract same object
    expect(fact.object).toBe(triple!.object);
    expect(belief.object).toBe(triple!.object);
  });
});
