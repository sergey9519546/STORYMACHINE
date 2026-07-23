// Type Enrichment Adapters - Public API
//
// Main export file for V5.0 type enrichment adapters.
// Provides clean interface for enriching StoryMachine's simple types
// to V5's rich semantic types.

// ── Core Adapters ─────────────────────────────────────────────────────────────

export {
  // Adapter Functions
  parseSemanticTriple,
  enrichAtomicFact,
  enrichBelief,
  enrichEmotion,
  enrichAtomicFactsBatch,
  enrichBeliefsBatch,
  
  // Validation Functions
  validateSemanticFact,
  validateStructuredBelief,
  validateDimensionalEmotion,
  
  // Type Exports
  type SemanticAtomicFact,
  type StructuredBelief,
  type DimensionalEmotionState,
  type SemanticTriple,
  type Entity,
  type DimensionalEmotion,
} from './type-enrichment.ts';

// ── NLP Helpers ───────────────────────────────────────────────────────────────

export {
  // Entity Recognition
  recognizeEntities,
  
  // Feature Extraction
  extractTemporal,
  extractManner,
  extractLocation,
  
  // Emotion Mapping
  occToVAD,
  computeEmotionalIntensity,
  
  // Belief Confidence
  estimateBeliefConfidence,
  
  // Validation Helpers
  isValidVerb,
  isCommonWord,
  isTemporalWord,
  isLocationWord,
} from './nlp-helpers.ts';

// ── Usage Examples ────────────────────────────────────────────────────────────

/**
 * Example 1: Parse a sentence into semantic triple
 * 
 * ```typescript
 * import { parseSemanticTriple } from './adapters';
 * 
 * const triple = parseSemanticTriple("Bob entered the room angrily");
 * // => { subject: "Bob", predicate: "entered", object: "room", manner: "angrily", confidence: 0.85 }
 * ```
 */

/**
 * Example 2: Enrich an atomic fact
 * 
 * ```typescript
 * import { enrichAtomicFact } from './adapters';
 * 
 * const fact = enrichAtomicFact("The door is locked", {
 *   addedAtTurn: 1,
 *   validFrom: 1000
 * });
 * // => SemanticAtomicFact with subject-predicate-object structure
 * ```
 */

/**
 * Example 3: Enrich a belief
 * 
 * ```typescript
 * import { enrichBelief } from './adapters';
 * 
 * const belief = enrichBelief("Bob is the killer", {
 *   source: 'inferred',
 *   charId: 'detective1',
 *   acquired_at: 5
 * });
 * // => StructuredBelief with confidence scoring
 * ```
 */

/**
 * Example 4: Enrich an emotion state
 * 
 * ```typescript
 * import { enrichEmotion } from './adapters';
 * 
 * const emotion = enrichEmotion({
 *   joy: 0,
 *   distress: 0,
 *   anger: 80,
 *   fear: 20,
 *   pride: 0,
 *   shame: 0,
 *   dominant: 'anger',
 *   intensity: 80,
 *   last_updated_at: 5
 * });
 * // => DimensionalEmotionState with VAD (valence-arousal-dominance)
 * ```
 */
