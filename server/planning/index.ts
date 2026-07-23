// ── APDL Module Index ────────────────────────────────────────────────────────
// Central export point for the Affective Planning Domain Language system.

// Core types
export * from './pddl-types';
export * from './apdl';

// Planner
export { apdlPlan, enrichWithEmotionalLogic } from './apdl-planner';

// Validator
export {
  validateEmotionalPreconditions,
  validateEmotionalCoherence,
  validateAction,
  generateValidationSummary,
  type PreconditionValidationResult,
  type CoherenceValidationResult,
  type CoherenceIssue,
} from './apdl-validator';

// Emotional effects library
export {
  getEmotionalTemplate,
  enrichActionWithEmotions,
  getAllEmotionalTemplates,
  getTemplatesByDramaticWeight,
  EMOTIONAL_EFFECTS_LIBRARY,
  type EmotionalActionTemplate,
} from './emotional-effects-library';

// OASIS integration hooks
export {
  type EmotionalValidator,
  type ValidationContext,
  type ValidationResult,
  type SimulatedEmotionalEffects,
  type TransitionPlausibility,
  type CharacterPsychology,
  DeterministicEmotionalValidator,
  OASISEmotionalValidator,
  setEmotionalValidator,
  getEmotionalValidator,
  validateWithOracle,
  simulateWithOracle,
  validateTransitionWithOracle,
} from './oasis-integration';

// Examples (for reference/testing)
export { exampleBetrayal, exampleRejection, runExamples } from './examples';
