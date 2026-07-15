// ── OASIS Integration Points ─────────────────────────────────────────────────
// Forward-compatible integration hooks for OASIS emotional/psychological simulation.
// APDL works standalone with deterministic validation, but can delegate to OASIS
// when available for higher-fidelity emotional reasoning.

import type {
  APDLAction,
  APDLWorldState,
  EmotionalPrecondition,
  EmotionalEffect,
  CharacterId,
} from './apdl';

// ── Emotional Validator Interface ────────────────────────────────────────────

/**
 * Interface for external emotional validators (e.g., OASIS simulation).
 * APDL can use this to validate emotional preconditions via micro-simulation
 * instead of simple threshold checks.
 */
export interface EmotionalValidator {
  /**
   * Validate if an emotional precondition makes psychological sense.
   * 
   * @param precond - The emotional precondition to validate
   * @param state - Current world state
   * @param context - Additional context (previous actions, character history)
   * @returns Validation result with confidence score
   */
  validatePrecondition(
    precond: EmotionalPrecondition,
    state: APDLWorldState,
    context?: ValidationContext
  ): Promise<ValidationResult>;

  /**
   * Simulate the emotional effects of an action.
   * Returns predicted emotional state changes with confidence intervals.
   * 
   * @param action - The action to simulate
   * @param state - Current world state
   * @returns Predicted emotional effects
   */
  simulateEmotionalEffects(
    action: APDLAction,
    state: APDLWorldState
  ): Promise<SimulatedEmotionalEffects>;

  /**
   * Check if an emotional transition is psychologically plausible.
   * 
   * @param fromEmotion - Starting emotional state
   * @param toEmotion - Target emotional state
   * @param character - Character undergoing transition
   * @param trigger - Action/event triggering transition
   * @returns Plausibility assessment
   */
  validateTransition(
    fromEmotion: string,
    toEmotion: string,
    character: CharacterId,
    trigger: APDLAction,
    state: APDLWorldState
  ): Promise<TransitionPlausibility>;

  /**
   * Get the validator's name (for logging/debugging).
   */
  getName(): string;
}

/**
 * Context for validation (previous actions, character psychology, etc.).
 */
export interface ValidationContext {
  previousActions?: APDLAction[];
  characterPsychology?: CharacterPsychology;
  narrativeContext?: {
    genre?: string;
    tone?: string;
    act?: number;
  };
}

/**
 * Result of validating an emotional precondition.
 */
export interface ValidationResult {
  /** Is the precondition satisfied? */
  satisfied: boolean;
  
  /** Confidence in the validation (0-1) */
  confidence: number;
  
  /** Human-readable explanation */
  explanation: string;
  
  /** Suggested intensity if different from current */
  suggestedIntensity?: number;
  
  /** Alternative emotions that would be more appropriate */
  alternatives?: Array<{
    emotion: string;
    intensity: number;
    reason: string;
  }>;
}

/**
 * Simulated emotional effects with uncertainty.
 */
export interface SimulatedEmotionalEffects {
  /** Predicted effects by character */
  effects: Map<CharacterId, Array<{
    emotion: string;
    deltaMin: number;    // Lower bound of confidence interval
    deltaMean: number;   // Expected change
    deltaMax: number;    // Upper bound of confidence interval
    confidence: number;  // How confident is the prediction (0-1)
  }>>;
  
  /** Overall simulation confidence */
  overallConfidence: number;
  
  /** Warnings or notes from simulation */
  warnings?: string[];
}

/**
 * Plausibility of an emotional transition.
 */
export interface TransitionPlausibility {
  /** Is this transition plausible? */
  plausible: boolean;
  
  /** How plausible (0-1) */
  score: number;
  
  /** Explanation */
  reason: string;
  
  /** Suggested intermediate emotions if transition too abrupt */
  intermediateSteps?: Array<{
    emotion: string;
    minDuration: number;  // Minimum scenes needed
  }>;
}

/**
 * Character psychology profile (future integration with OASIS).
 */
export interface CharacterPsychology {
  bigFive?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  darkTriad?: {
    machiavellianism: number;
    narcissism: number;
    psychopathy: number;
  };
  attachmentStyle?: 'secure' | 'anxious' | 'avoidant' | 'anxious_avoidant';
  defenseMechanisms?: string[];
}

// ── Default Deterministic Validator ──────────────────────────────────────────

/**
 * Default validator using simple threshold checks.
 * Used when no OASIS validator is available.
 */
export class DeterministicEmotionalValidator implements EmotionalValidator {
  getName(): string {
    return 'DeterministicValidator';
  }

  async validatePrecondition(
    precond: EmotionalPrecondition,
    state: APDLWorldState,
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const emotionalState = state.emotional_state.get(precond.character);
    
    if (!emotionalState) {
      return {
        satisfied: false,
        confidence: 1.0,
        explanation: `Character ${precond.character} has no emotional state`,
      };
    }

    const intensity = emotionalState.feelings.get(precond.emotion) || 0;
    const satisfied = intensity >= precond.min_intensity &&
      (precond.max_intensity === undefined || intensity <= precond.max_intensity);

    return {
      satisfied,
      confidence: 1.0,
      explanation: satisfied
        ? `${precond.emotion} intensity ${intensity.toFixed(2)} meets requirement ${precond.min_intensity.toFixed(2)}`
        : `${precond.emotion} intensity ${intensity.toFixed(2)} below required ${precond.min_intensity.toFixed(2)}`,
      suggestedIntensity: satisfied ? undefined : precond.min_intensity,
    };
  }

  async simulateEmotionalEffects(
    action: APDLAction,
    state: APDLWorldState
  ): Promise<SimulatedEmotionalEffects> {
    const effects = new Map<CharacterId, Array<any>>();

    // Simple deterministic prediction: effects are exactly as specified
    for (const effect of action.emotional_effects) {
      const characters = this.resolveCharacters(effect.character, action, state);
      
      for (const charId of characters) {
        if (!effects.has(charId)) {
          effects.set(charId, []);
        }
        
        effects.get(charId)!.push({
          emotion: effect.emotion,
          deltaMin: effect.delta * 0.9,   // Small uncertainty
          deltaMean: effect.delta,
          deltaMax: effect.delta * 1.1,
          confidence: 0.8,  // Moderately confident
        });
      }
    }

    return {
      effects,
      overallConfidence: 0.8,
      warnings: ['Using deterministic prediction; consider OASIS simulation for higher fidelity'],
    };
  }

  async validateTransition(
    fromEmotion: string,
    toEmotion: string,
    character: CharacterId,
    trigger: APDLAction,
    state: APDLWorldState
  ): Promise<TransitionPlausibility> {
    // Simple incompatibility check
    const incompatible: Record<string, string[]> = {
      joy: ['distress', 'despair'],
      trust: ['betrayed', 'suspicious'],
      pride: ['shame', 'humiliation'],
      love: ['hate', 'contempt'],
    };

    if (incompatible[fromEmotion]?.includes(toEmotion)) {
      return {
        plausible: false,
        score: 0.2,
        reason: `Direct transition from ${fromEmotion} to ${toEmotion} is psychologically abrupt`,
        intermediateSteps: [
          { emotion: 'confusion', minDuration: 1 },
          { emotion: 'ambivalence', minDuration: 1 },
        ],
      };
    }

    return {
      plausible: true,
      score: 0.7,
      reason: 'Transition appears plausible based on simple heuristics',
    };
  }

  private resolveCharacters(
    target: string,
    action: APDLAction,
    state: APDLWorldState
  ): CharacterId[] {
    if (target === 'all') {
      return Array.from(state.emotional_state.keys());
    }
    if (target === 'both' || target === 'actor' || target === 'target') {
      // Would need action parameter resolution
      return [];
    }
    return [target];
  }
}

// ── Validator Registry ───────────────────────────────────────────────────────

/**
 * Global registry for emotional validators.
 * Allows OASIS integration without modifying planner code.
 */
class ValidatorRegistry {
  private validator: EmotionalValidator = new DeterministicEmotionalValidator();

  /**
   * Set the active emotional validator.
   * Call this to integrate OASIS when available.
   */
  setValidator(validator: EmotionalValidator): void {
    console.log(`[APDL] Switching emotional validator to: ${validator.getName()}`);
    this.validator = validator;
  }

  /**
   * Get the current validator.
   */
  getValidator(): EmotionalValidator {
    return this.validator;
  }

  /**
   * Reset to default deterministic validator.
   */
  reset(): void {
    this.validator = new DeterministicEmotionalValidator();
  }
}

export const validatorRegistry = new ValidatorRegistry();

/**
 * Set the global emotional validator (for OASIS integration).
 */
export function setEmotionalValidator(validator: EmotionalValidator): void {
  validatorRegistry.setValidator(validator);
}

/**
 * Get the current emotional validator.
 */
export function getEmotionalValidator(): EmotionalValidator {
  return validatorRegistry.getValidator();
}

// ── Enhanced Validation with Validator ───────────────────────────────────────

/**
 * Validate emotional precondition using the active validator.
 * Uses OASIS if available, falls back to deterministic.
 */
export async function validateWithOracle(
  precond: EmotionalPrecondition,
  state: APDLWorldState,
  context?: ValidationContext
): Promise<ValidationResult> {
  const validator = getEmotionalValidator();
  return validator.validatePrecondition(precond, state, context);
}

/**
 * Simulate action effects using the active validator.
 */
export async function simulateWithOracle(
  action: APDLAction,
  state: APDLWorldState
): Promise<SimulatedEmotionalEffects> {
  const validator = getEmotionalValidator();
  return validator.simulateEmotionalEffects(action, state);
}

/**
 * Check transition plausibility using the active validator.
 */
export async function validateTransitionWithOracle(
  fromEmotion: string,
  toEmotion: string,
  character: CharacterId,
  trigger: APDLAction,
  state: APDLWorldState
): Promise<TransitionPlausibility> {
  const validator = getEmotionalValidator();
  return validator.validateTransition(fromEmotion, toEmotion, character, trigger, state);
}

// ── Example OASIS Integration ────────────────────────────────────────────────

/**
 * Example stub showing how OASIS would integrate.
 * When OASIS is implemented, create a class like this.
 */
export class OASISEmotionalValidator implements EmotionalValidator {
  private oasisEngine: any;  // Future: import from scripts/oasis_cinematic_v2/

  constructor(oasisEngine: any) {
    this.oasisEngine = oasisEngine;
  }

  getName(): string {
    return 'OASISValidator';
  }

  async validatePrecondition(
    precond: EmotionalPrecondition,
    state: APDLWorldState,
    context?: ValidationContext
  ): Promise<ValidationResult> {
    // Future: Run OASIS micro-simulation
    // const simulation = await this.oasisEngine.simulate({
    //   character: precond.character,
    //   targetEmotion: precond.emotion,
    //   targetIntensity: precond.min_intensity,
    //   worldState: state,
    //   steps: 10,
    // });
    
    // For now, throw to signal unimplemented
    throw new Error('OASIS integration not yet implemented. Use setEmotionalValidator(new DeterministicEmotionalValidator())');
  }

  async simulateEmotionalEffects(
    action: APDLAction,
    state: APDLWorldState
  ): Promise<SimulatedEmotionalEffects> {
    // Future: Run OASIS forward simulation
    throw new Error('OASIS integration not yet implemented');
  }

  async validateTransition(
    fromEmotion: string,
    toEmotion: string,
    character: CharacterId,
    trigger: APDLAction,
    state: APDLWorldState
  ): Promise<TransitionPlausibility> {
    // Future: Use OASIS PsychologyEngine
    throw new Error('OASIS integration not yet implemented');
  }
}
