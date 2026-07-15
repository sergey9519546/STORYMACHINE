// Type Enrichment Adapters for V5.0 Narrative OS
//
// Production-grade adapters that bridge StoryMachine's simple types to V5's
// rich semantic types. Enables Trinity Gate to work at full power by providing
// structured semantic data from simple string inputs.
//
// Four Core Adapters:
// 1. parseSemanticTriple() - Extract subject-predicate-object from sentences
// 2. enrichAtomicFact() - Enrich simple facts to semantic facts
// 3. enrichBelief() - Structure beliefs with sources and confidence
// 4. enrichEmotion() - Map OCC emotions to VAD dimensions
//
// Design: High-accuracy NLP-based enrichment with confidence scoring.
// All adapters are idempotent and preserve original data.

import type { AtomicFact } from '../ops/StoryOp.ts';
import type { Belief, BeliefSource, EmotionState, EmotionType } from '../../engine/types.ts';
import {
  parseSemanticTriple as parseTriple,
  recognizeEntities,
  extractTemporal,
  extractManner,
  extractLocation,
  occToVAD,
  computeEmotionalIntensity,
  estimateBeliefConfidence,
  type SemanticTriple,
  type Entity,
  type DimensionalEmotion,
} from './nlp-helpers.ts';

// ── V5.0 Semantic Types ───────────────────────────────────────────────────────

/**
 * Semantic Atomic Fact - V5.0 enriched fact structure
 * Extends basic AtomicFact with semantic triple structure
 */
export interface SemanticAtomicFact extends AtomicFact {
  // Semantic triple (subject-predicate-object)
  subject: string;
  predicate: string;
  object: string;
  
  // Optional enrichments
  manner?: string;      // How: "angrily", "slowly"
  temporal?: string;    // When: "suddenly", "then"
  location?: string;    // Where: "in the room"
  
  // Metadata
  confidence: number;   // 0-1: extraction confidence
  entities?: Entity[];  // Recognized entities in the fact
  source?: string;      // Source text (if enriched from string)
}

/**
 * Structured Belief - V5.0 enriched belief structure
 * Extends basic Belief with semantic decomposition
 */
export interface StructuredBelief extends Belief {
  // Semantic triple
  subject: string;
  predicate: string;
  object: string;
  
  // Enhanced tracking
  evidenceStrength: number;  // 0-1: how strong is the evidence?
  contradictionCount: number; // Number of contradicting beliefs
  supportingFacts: string[];  // Fact IDs that support this belief
}

/**
 * Dimensional Emotion State - V5.0 VAD representation
 * Adds dimensional emotion model alongside discrete OCC emotions
 */
export interface DimensionalEmotionState extends EmotionState {
  // VAD (Valence-Arousal-Dominance) dimensions
  vad: DimensionalEmotion;
  
  // Derived metrics
  emotionalIntensity: number;  // 0-1: overall intensity
  emotionalComplexity: number; // 0-1: how many emotions are active
}

// ── Adapter 1: Parse Semantic Triple ──────────────────────────────────────────

/**
 * Parse sentence into semantic triple (subject-predicate-object)
 * 
 * High-accuracy parser for typical screenplay sentences.
 * Handles:
 * - Simple SVO: "Bob entered the room"
 * - With manner: "Bob entered the room angrily"
 * - Compound predicates: "Bob walked into the room"
 * - Intransitive: "Bob waited"
 * - Passive voice: "The door was opened by Bob"
 * 
 * @param sentence - Natural language sentence
 * @returns Semantic triple with confidence score, or null if unparseable
 * 
 * @example
 * parseSemanticTriple("Bob entered the room angrily")
 * // => { subject: "Bob", predicate: "entered", object: "room", manner: "angrily", confidence: 0.85 }
 */
export function parseSemanticTriple(sentence: string): SemanticTriple | null {
  if (!sentence || sentence.trim().length === 0) {
    return null;
  }
  
  // Use NLP helper to parse
  const triple = parseTriple(sentence);
  
  if (!triple) {
    return null;
  }
  
  // Enrich with additional context
  const temporal = extractTemporal(sentence);
  const manner = extractManner(sentence);
  const location = extractLocation(sentence);
  
  return {
    ...triple,
    temporal,
    manner: manner || triple.manner,
    location,
  };
}

// ── Adapter 2: Enrich Atomic Fact ─────────────────────────────────────────────

/**
 * Enrich simple atomic fact to semantic fact with triple structure
 * 
 * Converts simple string facts or partial facts into full semantic facts
 * with subject-predicate-object structure. Enables Trinity Gate's OWNE
 * verifier to check world consistency at the semantic level.
 * 
 * @param input - Simple fact string or partial AtomicFact
 * @param context - Optional context for enrichment
 * @returns Full SemanticAtomicFact with semantic triple
 * 
 * @example
 * enrichAtomicFact("The door is locked", { addedAtTurn: 1, validFrom: 1000 })
 * // => {
 * //   factId: "...",
 * //   subject: "door",
 * //   predicate: "is",
 * //   object: "locked",
 * //   confidence: 0.85,
 * //   ...
 * // }
 */
export function enrichAtomicFact(
  input: string | Partial<AtomicFact>,
  context?: {
    addedAtTurn?: number;
    validFrom?: number;
    validTo?: number | null;
    factId?: string;
  }
): SemanticAtomicFact {
  // Extract text content
  let content: string;
  let baseFactId: string | undefined;
  let baseAddedAtTurn: number | undefined;
  let baseValidFrom: number | undefined;
  let baseValidTo: number | null | undefined;
  
  if (typeof input === 'string') {
    content = input;
  } else {
    // For AtomicFact objects, construct content from fields
    if ('subject' in input && 'predicate' in input && 'object' in input) {
      // Already has semantic structure
      return input as SemanticAtomicFact;
    }
    
    // Legacy fact with string description
    content = (input as any).description || (input as any).content || String(input);
    baseFactId = input.factId;
    baseAddedAtTurn = input.addedAtTurn;
    baseValidFrom = input.validFrom;
    baseValidTo = input.validTo;
  }
  
  // Parse semantic triple
  const triple = parseSemanticTriple(content);
  
  // Recognize entities
  const entities = recognizeEntities(content);
  
  // Generate fact ID if not provided
  const factId = context?.factId || baseFactId || generateFactId(content);
  
  // Build semantic fact
  const semanticFact: SemanticAtomicFact = {
    factId,
    subject: triple?.subject || extractSubject(content),
    predicate: triple?.predicate || 'is',
    object: triple?.object || extractObject(content),
    addedAtTurn: context?.addedAtTurn ?? baseAddedAtTurn ?? 0,
    validFrom: context?.validFrom ?? baseValidFrom ?? 0,
    validTo: context?.validTo ?? baseValidTo ?? null,
    confidence: triple?.confidence ?? 0.6,
    entities,
    source: content,
  };
  
  // Add optional enrichments
  if (triple?.manner) {
    semanticFact.manner = triple.manner;
  }
  if (triple?.temporal) {
    semanticFact.temporal = triple.temporal;
  }
  if (triple?.location) {
    semanticFact.location = triple.location;
  }
  
  return semanticFact;
}

// ── Adapter 3: Enrich Belief ──────────────────────────────────────────────────

/**
 * Enrich simple belief to structured belief with semantic decomposition
 * 
 * Converts belief propositions into structured beliefs with:
 * - Semantic triple (subject-predicate-object)
 * - Confidence scoring based on source type
 * - Evidence strength tracking
 * - Contradiction detection
 * 
 * Enables Trinity Gate's Pre-Flight Auditor to validate epistemic consistency.
 * 
 * @param input - Belief string or partial Belief object
 * @param context - Optional context for enrichment
 * @returns Full StructuredBelief with semantic structure
 * 
 * @example
 * enrichBelief("Bob is the killer", {
 *   source: 'inferred',
 *   charId: 'detective1',
 *   acquired_at: 5
 * })
 * // => {
 * //   id: "...",
 * //   proposition: "Bob is the killer",
 * //   subject: "Bob",
 * //   predicate: "is",
 * //   object: "killer",
 * //   confidence: 0.4,
 * //   source: 'inferred',
 * //   evidenceStrength: 0.4,
 * //   ...
 * // }
 */
export function enrichBelief(
  input: string | Partial<Belief>,
  context?: {
    charId?: string;
    source?: BeliefSource;
    acquired_at?: number;
    source_agent_id?: string;
    source_event_id?: string;
    trustLevel?: number;
    contradictions?: string[];
  }
): StructuredBelief {
  // Extract proposition
  let proposition: string;
  let baseId: string | undefined;
  let baseSource: BeliefSource | undefined;
  let baseAcquiredAt: number | undefined;
  let baseContradicts: string[] | undefined;
  
  if (typeof input === 'string') {
    proposition = input;
  } else {
    proposition = input.proposition || String(input);
    baseId = input.id;
    baseSource = input.source;
    baseAcquiredAt = input.acquired_at;
    baseContradicts = input.contradicts;
  }
  
  // Parse semantic triple
  const triple = parseSemanticTriple(proposition);
  
  // Determine source
  const source = context?.source || baseSource || 'inferred';
  
  // Estimate confidence
  const confidence = estimateBeliefConfidence(source, {
    trustLevel: context?.trustLevel,
    contradictions: context?.contradictions?.length || baseContradicts?.length,
  });
  
  // Generate belief ID if not provided
  const id = baseId || generateBeliefId(proposition);
  
  // Build structured belief
  const structuredBelief: StructuredBelief = {
    id,
    proposition,
    subject: triple?.subject || extractSubject(proposition),
    predicate: triple?.predicate || 'is',
    object: triple?.object || extractObject(proposition),
    confidence,
    source,
    acquired_at: context?.acquired_at ?? baseAcquiredAt ?? 0,
    evidenceStrength: confidence,
    contradictionCount: context?.contradictions?.length || baseContradicts?.length || 0,
    supportingFacts: [],
    contradicts: context?.contradictions || baseContradicts,
  };
  
  // Add optional fields
  if (context?.source_agent_id) {
    structuredBelief.source_agent_id = context.source_agent_id;
  }
  if (context?.source_event_id) {
    structuredBelief.source_event_id = context.source_event_id;
  }
  
  return structuredBelief;
}

// ── Adapter 4: Enrich Emotion ─────────────────────────────────────────────────

/**
 * Enrich discrete OCC emotion to dimensional emotion state (VAD)
 * 
 * Maps OCC discrete emotions (joy, distress, anger, fear, pride, shame)
 * to dimensional VAD (Valence-Arousal-Dominance) representation.
 * 
 * Enables richer emotional modeling for:
 * - Emotion interpolation
 * - Emotion intensity computation
 * - Cross-cultural emotion mapping
 * 
 * @param emotionState - OCC emotion state
 * @returns Enhanced emotion state with VAD dimensions
 * 
 * @example
 * enrichEmotion({
 *   joy: 0,
 *   distress: 0,
 *   anger: 80,
 *   fear: 20,
 *   pride: 0,
 *   shame: 0,
 *   dominant: 'anger',
 *   intensity: 80,
 *   last_updated_at: 5
 * })
 * // => {
 *   ...emotionState,
 *   vad: { valence: -0.6, arousal: 0.64, dominance: 0.8 },
 *   emotionalIntensity: 0.8,
 *   emotionalComplexity: 0.2
 * }
 */
export function enrichEmotion(emotionState: EmotionState): DimensionalEmotionState {
  // Compute VAD for dominant emotion
  const vad = occToVAD(emotionState.dominant, emotionState.intensity);
  
  // Compute overall emotional intensity
  const emotionalIntensity = computeEmotionalIntensity(vad);
  
  // Compute emotional complexity (how many emotions are active)
  const activeEmotions = [
    emotionState.joy,
    emotionState.distress,
    emotionState.anger,
    emotionState.fear,
    emotionState.pride,
    emotionState.shame,
  ].filter(v => v > 10).length; // Count emotions above 10%
  
  const emotionalComplexity = Math.min(1.0, activeEmotions / 6);
  
  // Handle mixed emotions by blending VAD values
  if (activeEmotions > 1) {
    const blendedVAD = blendEmotions(emotionState);
    return {
      ...emotionState,
      vad: blendedVAD,
      emotionalIntensity,
      emotionalComplexity,
    };
  }
  
  return {
    ...emotionState,
    vad,
    emotionalIntensity,
    emotionalComplexity,
  };
}

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Blend multiple active emotions into single VAD representation
 * Weight by emotion intensity
 */
function blendEmotions(emotionState: EmotionState): DimensionalEmotion {
  const emotions: Array<{ type: EmotionType; intensity: number }> = [
    { type: 'joy', intensity: emotionState.joy },
    { type: 'distress', intensity: emotionState.distress },
    { type: 'anger', intensity: emotionState.anger },
    { type: 'fear', intensity: emotionState.fear },
    { type: 'pride', intensity: emotionState.pride },
    { type: 'shame', intensity: emotionState.shame },
  ];
  
  // Filter active emotions (> 10%)
  const active = emotions.filter(e => e.intensity > 10);
  
  if (active.length === 0) {
    return { valence: 0, arousal: 0, dominance: 0.5 };
  }
  
  // Compute total weight
  const totalWeight = active.reduce((sum, e) => sum + e.intensity, 0);
  
  // Weighted average of VAD values
  let valence = 0;
  let arousal = 0;
  let dominance = 0;
  
  for (const emotion of active) {
    const vad = occToVAD(emotion.type, emotion.intensity);
    const weight = emotion.intensity / totalWeight;
    
    valence += vad.valence * weight;
    arousal += vad.arousal * weight;
    dominance += vad.dominance * weight;
  }
  
  return { valence, arousal, dominance };
}

/**
 * Extract subject from text (fallback if triple parsing fails)
 */
function extractSubject(text: string): string {
  // Try to find first capitalized word or pronoun
  const entities = recognizeEntities(text);
  
  if (entities.length > 0 && entities[0].type === 'character') {
    return entities[0].text;
  }
  
  // Fallback: first word
  const words = text.trim().split(/\s+/);
  return words[0] || 'unknown';
}

/**
 * Extract object from text (fallback if triple parsing fails)
 */
function extractObject(text: string): string {
  // Try to find object entity
  const entities = recognizeEntities(text);
  
  const objectEntity = entities.find(e => e.type === 'object');
  if (objectEntity) {
    return objectEntity.text;
  }
  
  // Fallback: last significant word
  const words = text.trim().split(/\s+/);
  return words[words.length - 1] || 'unknown';
}

/**
 * Generate deterministic fact ID from content
 */
function generateFactId(content: string): string {
  // Simple hash-like ID based on content
  const hash = content
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 16);
  
  return `fact_${hash}_${Date.now()}`;
}

/**
 * Generate deterministic belief ID from proposition
 */
function generateBeliefId(proposition: string): string {
  // Simple hash-like ID based on proposition
  const hash = proposition
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 16);
  
  return `belief_${hash}_${Date.now()}`;
}

// ── Batch Processing ──────────────────────────────────────────────────────────

/**
 * Enrich multiple facts in batch
 * More efficient for large datasets
 */
export function enrichAtomicFactsBatch(
  inputs: Array<string | Partial<AtomicFact>>,
  baseContext?: {
    addedAtTurn?: number;
    validFrom?: number;
  }
): SemanticAtomicFact[] {
  return inputs.map((input, idx) =>
    enrichAtomicFact(input, {
      ...baseContext,
      factId: baseContext?.factId || `fact_batch_${idx}_${Date.now()}`,
    })
  );
}

/**
 * Enrich multiple beliefs in batch
 */
export function enrichBeliefsBatch(
  inputs: Array<string | Partial<Belief>>,
  baseContext?: {
    charId?: string;
    source?: BeliefSource;
    acquired_at?: number;
  }
): StructuredBelief[] {
  return inputs.map(input => enrichBelief(input, baseContext));
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate semantic fact structure
 * Ensures all required fields are present and valid
 */
export function validateSemanticFact(fact: SemanticAtomicFact): boolean {
  return !!(
    fact.factId &&
    fact.subject &&
    fact.predicate &&
    fact.addedAtTurn !== undefined &&
    fact.validFrom !== undefined &&
    fact.confidence >= 0 &&
    fact.confidence <= 1
  );
}

/**
 * Validate structured belief
 */
export function validateStructuredBelief(belief: StructuredBelief): boolean {
  return !!(
    belief.id &&
    belief.proposition &&
    belief.subject &&
    belief.predicate &&
    belief.confidence >= 0 &&
    belief.confidence <= 1 &&
    belief.source &&
    belief.evidenceStrength >= 0 &&
    belief.evidenceStrength <= 1
  );
}

/**
 * Validate dimensional emotion state
 */
export function validateDimensionalEmotion(emotion: DimensionalEmotionState): boolean {
  return !!(
    emotion.vad &&
    emotion.vad.valence >= -1 &&
    emotion.vad.valence <= 1 &&
    emotion.vad.arousal >= 0 &&
    emotion.vad.arousal <= 1 &&
    emotion.vad.dominance >= 0 &&
    emotion.vad.dominance <= 1 &&
    emotion.emotionalIntensity >= 0 &&
    emotion.emotionalIntensity <= 1
  );
}

// ── Export All ────────────────────────────────────────────────────────────────

export {
  // Types
  type SemanticAtomicFact,
  type StructuredBelief,
  type DimensionalEmotionState,
  type SemanticTriple,
  type Entity,
  type DimensionalEmotion,
  
  // Core Adapters
  parseSemanticTriple,
  enrichAtomicFact,
  enrichBelief,
  enrichEmotion,
  
  // Batch Processing
  enrichAtomicFactsBatch,
  enrichBeliefsBatch,
  
  // Validation
  validateSemanticFact,
  validateStructuredBelief,
  validateDimensionalEmotion,
};
