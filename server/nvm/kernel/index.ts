// StoryMachine V5.0 Narrative OS Kernel — Alpha Release
//
// This is the v5.0-alpha deployment package. Event-sourced kernel is
// production-ready. Trinity Gate is COMPLETE and production-ready.
// Quantum Field is in development.
//
// Status: FOUNDATION + TRINITY GATE READY
// - Event Store: ✅ Production-ready
// - Adapters: ✅ Backward compatible
// - Trinity Gate: ✅ Production-ready (3-layer verification system)
// - Quantum Field: 🚧 Building (Coming in v5.0-beta)
// - Tests: 🚧 Writing (Agent in progress)

export { EventStore, createEventStore } from './event-store.ts';
export type {
  NarrativeEvent,
  NarrativeEventInput,
  RealityLayer,
  ProvenanceOrigin,
  TimelineBranch,
  MergeStrategy,
  MergeResult,
  SnapshotOptions,
} from './types.ts';

export {
  eventsToCommits,
  commitsToEvents,
  buildScreenplayMemoryFromEvents,
  eventStoreToFountainAnalysis,
  addAdaptersToEventStore,
} from './adapters.ts';

// Re-export for convenience
export type { EventStoreWithAdapters } from './adapters.ts';

// ── Type Enrichment Adapters ──────────────────────────────────────────────────

export {
  // Core Adapters
  parseSemanticTriple,
  enrichAtomicFact,
  enrichBelief,
  enrichEmotion,
  enrichAtomicFactsBatch,
  enrichBeliefsBatch,
  
  // Validation
  validateSemanticFact,
  validateStructuredBelief,
  validateDimensionalEmotion,
  
  // NLP Helpers
  recognizeEntities,
  extractTemporal,
  extractManner,
  extractLocation,
  occToVAD,
  computeEmotionalIntensity,
  estimateBeliefConfidence,
} from './adapters/index.ts';

export type {
  SemanticAtomicFact,
  StructuredBelief,
  DimensionalEmotionState,
  SemanticTriple,
  Entity,
  DimensionalEmotion,
} from './adapters/index.ts';

// ── Trinity Verification Gate ─────────────────────────────────────────────────

export {
  runTrinityGate,
  quickVerify,
  verifyEventSequence,
  formatVerificationReport,
  getTopRepairSuggestions,
} from './trinity-gate.ts';

export type {
  TrinityVerification,
  TrinityViolation,
  TrinityGateOptions,
  VerificationLayer,
} from './trinity-gate.ts';

// Verifier layer exports
export { verifyStoryGraph } from './verifiers/story-graph-verifier.ts';
export { verifyOwne } from './verifiers/owne-verifier.ts';
export { auditPreFlight } from './verifiers/preflight-auditor.ts';

export type { StoryGraphVerification, GraphViolation } from './verifiers/story-graph-verifier.ts';
export type { OwneVerification, OwneViolation } from './verifiers/owne-verifier.ts';
export type { PreFlightAudit, PreFlightViolation } from './verifiers/preflight-auditor.ts';

// ── Version Info ──────────────────────────────────────────────────────────────

export const VERSION = 'v5.0.0-alpha';
export const BUILD_DATE = new Date().toISOString();
export const FEATURES = {
  eventSourcing: true,
  cryptographicChain: true,
  dualTemporalDimensions: true,
  realityLayers: true,
  timelineBranching: true,
  backwardCompatibility: true,
  trinityGate: true, // ✅ Production-ready
  quantumField: false, // Coming in v5.0-beta
};

// ── Usage Example ─────────────────────────────────────────────────────────────

/**
 * Basic usage:
 * 
 * ```typescript
 * import { createEventStore } from './server/nvm/kernel';
 * 
 * const store = createEventStore();
 * 
 * // Append events
 * const event = store.append({
 *   op: { op: 'ADD_FACT', fact: { ... } },
 *   storyTime: 100,
 *   presentationIndex: 0,
 *   assertions: [...],
 *   derivedFrom: [],
 *   createdBy: 'user_authored',
 *   realityLayer: 'diegetic',
 *   sceneIdx: 0,
 *   parentHash: null,
 * });
 * 
 * // Query events
 * const events = store.getEventsBeforeStoryTime(150);
 * 
 * // Get state snapshot
 * const state = await store.snapshot({ storyTime: 200 });
 * 
 * // Backward compatibility
 * import { eventsToCommits } from './server/nvm/kernel';
 * const commits = eventsToCommits(store.getAllEvents());
 * ```
 */

// ── Migration Guide ───────────────────────────────────────────────────────────

/**
 * Migrating from StoryCommit to EventStore:
 * 
 * Phase 1: Dual-Write
 * ```typescript
 * // Old code
 * stage.commitScene(commit);
 * 
 * // New code (dual-write)
 * stage.commitScene(commit);
 * const events = commitsToEvents([commit]);
 * events.forEach(e => eventStore.append(e));
 * ```
 * 
 * Phase 2: Read from EventStore
 * ```typescript
 * // Old code
 * const commits = stage.getCommits();
 * const memory = buildScreenplayMemory(commits);
 * 
 * // New code
 * const memory = await buildScreenplayMemoryFromEvents(eventStore);
 * ```
 * 
 * Phase 3: Remove StoryCommit (after full migration)
 */

// ── Coming in v5.0-beta ───────────────────────────────────────────────────────

/**
 * Trinity Verification Gate (✅ PRODUCTION-READY):
 * 
 * Three-layer verification system that prevents plot holes by construction:
 * 1. Story Graph Verifier: Structural coherence (promise/payoff, causality)
 * 2. OWNE Verifier: World consistency + intentional character actions
 * 3. Pre-Flight Auditor: Epistemic, possession, and spatial feasibility
 * 
 * ```typescript
 * import { runTrinityGate, formatVerificationReport } from './server/nvm/kernel';
 * 
 * const verification = await runTrinityGate(proposedEvent, currentState, allEvents, {
 *   enableLogging: true,
 *   strictMode: false,
 * });
 * 
 * if (!verification.pass) {
 *   console.log(formatVerificationReport(verification));
 *   
 *   // Get repair suggestions
 *   const repairs = getTopRepairSuggestions(verification, 5);
 *   console.log('Top repairs:', repairs);
 * }
 * 
 * // Quick verification (fast path)
 * const { pass, criticalViolations } = await quickVerify(event, state, allEvents);
 * 
 * // Batch verification
 * const results = await verifyEventSequence(events, state, allEvents);
 * ```
 * 
 * Quantum Story Field (v5.0-beta):
 * 
 * ```typescript
 * import { QuantumNarrativeField } from './server/nvm/quantum';
 * 
 * const field = new QuantumNarrativeField(eventStore);
 * 
 * // Propose event → creates branches
 * const branchIds = field.proposeEvent(event);
 * 
 * // Get legal next events
 * const options = field.getPossibleNextEvents();
 * 
 * // User picks one
 * const chosen = field.collapseToState(branchIds[0]);
 * ```
 */
