// ── APDL (Affective Planning Domain Language) Core Types ────────────────────
// Extends PDDL with emotional/dramatic logic for narrative planning.
// Maintains backward compatibility with pure PDDL planning.

import type {
  PDDLWorldState,
  PDDLAction,
  PDDLGoal,
  PDDLPlan,
  PDDLConstraints,
  Predicate,
} from './pddl-types';

// ── Emotion Types ────────────────────────────────────────────────────────────

/**
 * Core emotions tracked in the affective system.
 * Extends StoryMachine's OCC model with additional dramatic emotions.
 */
export type Emotion =
  // OCC base emotions (from types.ts)
  | 'joy'
  | 'distress'
  | 'anger'
  | 'fear'
  | 'pride'
  | 'shame'
  // Extended dramatic emotions
  | 'betrayed'
  | 'trust'
  | 'guilt'
  | 'relief'
  | 'vulnerable'
  | 'shocked'
  | 'regret'
  | 'hope'
  | 'dread'
  | 'love'
  | 'jealousy'
  | 'contempt'
  | 'admiration'
  | 'disappointment'
  | 'anticipation';

/**
 * Emotional intensity (0-1 scale).
 */
export type Intensity = number;

/**
 * Direction of emotional change over time.
 */
export type EmotionalTrajectory = 'rising' | 'falling' | 'flat' | 'oscillating';

/**
 * Character identifier (compatible with CharacterSheet.char_id).
 */
export type CharacterId = string;

/**
 * The emotional state of a single character.
 */
export interface EmotionalState {
  /** Map of emotions to their current intensity (0-1) */
  feelings: Map<Emotion, Intensity>;
  
  /** Overall trajectory of emotional state */
  trajectory: EmotionalTrajectory;
  
  /** Scene/turn number when emotion was last updated */
  lastChange: number;
  
  /** Dominant emotion (highest intensity above threshold) */
  dominant?: Emotion;
  
  /** Peak intensity across all emotions */
  peakIntensity: number;
}

// ── Audience State ───────────────────────────────────────────────────────────

/**
 * A fact the audience knows (may differ from character knowledge).
 */
export interface Fact {
  content: string;
  revealedAt: number;  // scene number
}

/**
 * An event the audience expects (or fears) might happen.
 */
export interface Event {
  description: string;
  likelihood: number;  // 0-1 probability estimate
}

/**
 * A possible story outcome.
 */
export interface Outcome {
  description: string;
  desirability: number;  // -1 (dread) to +1 (hope)
}

/**
 * Probability estimate (0-1).
 */
export type Probability = number;

/**
 * The emotional/epistemic state of the audience.
 * Tracks dramatic irony and emotional engagement.
 */
export interface AudienceState {
  /** What the audience knows that characters may not */
  knows: Set<string>;  // fact content strings
  
  /** What the audience expects to happen */
  expects: Map<string, Probability>;  // event description → probability
  
  /** What the audience fears/dreads */
  fears: Set<string>;  // outcome descriptions
  
  /** What the audience hopes for */
  hopes: Set<string>;  // outcome descriptions
  
  /** Overall emotional engagement (0-1) */
  engagement: number;
  
  /** Dramatic tension level (0-1) */
  tension: number;
}

// ── APDL World State ─────────────────────────────────────────────────────────

/**
 * Extended world state that includes emotional tracking.
 * Fully backward-compatible with PDDLWorldState.
 */
export interface APDLWorldState extends PDDLWorldState {
  /** Emotional state for each character */
  emotional_state: Map<CharacterId, EmotionalState>;
  
  /** Audience's emotional and epistemic state */
  audience_emotional_state: AudienceState;
  
  /** Irony gaps: what audience knows that characters don't */
  irony_gaps?: IronyGap[];
}

// ── Emotional Effects ────────────────────────────────────────────────────────

/**
 * How an action changes a character's emotional state.
 */
export interface EmotionalEffect {
  /** Target character ID (or 'all' for everyone, 'both' for actor+target) */
  character: CharacterId | 'all' | 'both';
  
  /** The emotion being affected */
  emotion: Emotion;
  
  /** Change in intensity (-1 to +1) */
  delta: number;
  
  /** How fast this emotion fades per scene (default 0.1) */
  decay_rate?: number;
  
  /** Condition that must be met for this effect to apply */
  condition?: string;
}

/**
 * How an action affects audience emotional state.
 */
export interface AudienceEffect {
  /** Type of audience effect */
  type: 'irony_creation' | 'irony_resolution' | 'tension_increase' | 'tension_release' | 'engagement_boost';
  
  /** Intensity of the effect (0-1) */
  intensity: number;
  
  /** Description of the dramatic effect */
  description?: string;
}

// ── Emotional Preconditions ──────────────────────────────────────────────────

/**
 * An emotional requirement for an action to be dramatically valid.
 */
export interface EmotionalPrecondition {
  /** Character whose emotion is being checked */
  character: CharacterId;
  
  /** The required emotion */
  emotion: Emotion;
  
  /** Minimum intensity required (0-1) */
  min_intensity: number;
  
  /** Optional maximum intensity (for "not too angry" constraints) */
  max_intensity?: number;
  
  /** Human-readable reason why this is required */
  reason?: string;
}

// ── APDL Actions ─────────────────────────────────────────────────────────────

/**
 * An action extended with emotional effects and preconditions.
 * Fully backward-compatible with PDDLAction.
 */
export interface APDLAction extends PDDLAction {
  /** Emotional effects on characters */
  emotional_effects: EmotionalEffect[];
  
  /** Emotional preconditions (in addition to causal preconditions) */
  emotional_preconditions: EmotionalPrecondition[];
  
  /** Effects on audience state */
  audience_effects?: AudienceEffect[];
  
  /** Dramatic weight (higher = more dramatically significant) */
  dramatic_weight?: number;
}

// ── APDL Goals ───────────────────────────────────────────────────────────────

/**
 * Extended goal that includes emotional target states.
 */
export interface APDLGoal extends PDDLGoal {
  /** Required emotional states */
  emotional_goals?: Array<{
    character: CharacterId;
    emotion: Emotion;
    target_intensity: number;
  }>;
  
  /** Required audience state */
  audience_goals?: {
    min_tension?: number;
    min_engagement?: number;
    required_irony?: string[];  // facts audience must know
  };
}

// ── APDL Plans ───────────────────────────────────────────────────────────────

/**
 * A gap between audience knowledge and character knowledge (dramatic irony).
 */
export interface IronyGap {
  /** What the audience knows */
  fact: string;
  
  /** Characters who don't know this */
  ignorant_characters: CharacterId[];
  
  /** Scene where gap was created */
  created_at: number;
  
  /** Scene where gap was resolved (if resolved) */
  resolved_at?: number;
  
  /** Dramatic intensity of this gap (0-1) */
  intensity: number;
}

/**
 * A point in the story where emotional tension is released.
 */
export interface CatharsisPoint {
  /** Scene number */
  scene: number;
  
  /** Type of catharsis */
  type: 'revelation' | 'confrontation' | 'reconciliation' | 'victory' | 'tragedy';
  
  /** Characters involved */
  characters: CharacterId[];
  
  /** Tension released (0-1) */
  release_magnitude: number;
  
  /** Description */
  description: string;
}

/**
 * A plan that optimizes for both causal and emotional coherence.
 */
export interface APDLPlan extends PDDLPlan {
  /** Emotional trajectory across the plan */
  emotional_trajectory: EmotionalTrajectory[];
  
  /** Dramatic irony gaps throughout the plan */
  irony_gaps: IronyGap[];
  
  /** Points of emotional catharsis */
  catharsis_points: CatharsisPoint[];
  
  /** Emotional cost (flatness penalty) */
  emotional_cost: number;
  
  /** Total cost (causal + emotional) */
  total_cost: number;
  
  /** Emotional coherence score (0-1, higher is better) */
  coherence_score: number;
}

// ── APDL Constraints ─────────────────────────────────────────────────────────

/**
 * Extended constraints including emotional requirements.
 */
export interface APDLConstraints extends PDDLConstraints {
  /** Minimum emotional variance required (prevents flat stories) */
  min_emotional_variance?: number;
  
  /** Required number of catharsis points */
  min_catharsis_points?: number;
  
  /** Maximum emotional flatness penalty we'll tolerate */
  max_flatness_penalty?: number;
  
  /** Emotional arc shape preference */
  preferred_arc?: 'rising' | 'falling' | 'rise_fall' | 'fall_rise' | 'oscillating';
  
  /** Minimum dramatic irony requirement */
  min_irony_gaps?: number;
}

// ── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Create an empty emotional state for a character.
 */
export function createEmptyEmotionalState(scene: number = 0): EmotionalState {
  return {
    feelings: new Map(),
    trajectory: 'flat',
    lastChange: scene,
    peakIntensity: 0,
  };
}

/**
 * Create an empty audience state.
 */
export function createEmptyAudienceState(): AudienceState {
  return {
    knows: new Set(),
    expects: new Map(),
    fears: new Set(),
    hopes: new Set(),
    engagement: 0.5,
    tension: 0.0,
  };
}

/**
 * Convert a PDDLWorldState to an APDLWorldState.
 */
export function upgradeToAPDL(state: PDDLWorldState): APDLWorldState {
  return {
    ...state,
    emotional_state: new Map(),
    audience_emotional_state: createEmptyAudienceState(),
  };
}

/**
 * Get the intensity of an emotion for a character (0 if not present).
 */
export function getEmotionIntensity(
  state: EmotionalState,
  emotion: Emotion
): number {
  return state.feelings.get(emotion) || 0;
}

/**
 * Set an emotion's intensity, clamping to [0, 1].
 */
export function setEmotionIntensity(
  state: EmotionalState,
  emotion: Emotion,
  intensity: number,
  scene: number
): void {
  const clamped = Math.max(0, Math.min(1, intensity));
  state.feelings.set(emotion, clamped);
  state.lastChange = scene;
  
  // Update peak intensity
  state.peakIntensity = Math.max(
    state.peakIntensity,
    ...Array.from(state.feelings.values())
  );
  
  // Update dominant emotion
  let maxIntensity = 0;
  let dominantEmotion: Emotion | undefined;
  for (const [emotion, intensity] of state.feelings) {
    if (intensity > maxIntensity && intensity > 0.3) {  // threshold for dominance
      maxIntensity = intensity;
      dominantEmotion = emotion;
    }
  }
  state.dominant = dominantEmotion;
}

/**
 * Apply emotional decay (emotions fade over time).
 */
export function applyEmotionalDecay(
  state: EmotionalState,
  currentScene: number,
  defaultDecayRate: number = 0.1
): void {
  const scenesSinceUpdate = currentScene - state.lastChange;
  if (scenesSinceUpdate <= 0) return;
  
  for (const [emotion, intensity] of state.feelings) {
    const decayedIntensity = Math.max(0, intensity - defaultDecayRate * scenesSinceUpdate);
    state.feelings.set(emotion, decayedIntensity);
  }
  
  // Recalculate peak and dominant
  state.peakIntensity = Math.max(0, ...Array.from(state.feelings.values()));
  
  let maxIntensity = 0;
  let dominantEmotion: Emotion | undefined;
  for (const [emotion, intensity] of state.feelings) {
    if (intensity > maxIntensity && intensity > 0.3) {
      maxIntensity = intensity;
      dominantEmotion = emotion;
    }
  }
  state.dominant = dominantEmotion;
}

/**
 * Calculate emotional trajectory from a sequence of emotional states.
 */
export function calculateTrajectory(
  states: EmotionalState[]
): EmotionalTrajectory {
  if (states.length < 2) return 'flat';
  
  const intensities = states.map(s => s.peakIntensity);
  const deltas = intensities.slice(1).map((val, i) => val - intensities[i]);
  
  const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
  const variance = deltas.reduce((sum, d) => sum + Math.pow(d - avgDelta, 2), 0) / deltas.length;
  
  if (variance > 0.05) return 'oscillating';
  if (avgDelta > 0.05) return 'rising';
  if (avgDelta < -0.05) return 'falling';
  return 'flat';
}

/**
 * Check if an emotional precondition is satisfied.
 */
export function isEmotionalPreconditionSatisfied(
  precond: EmotionalPrecondition,
  state: APDLWorldState
): boolean {
  const emotionalState = state.emotional_state.get(precond.character);
  if (!emotionalState) return false;
  
  const intensity = getEmotionIntensity(emotionalState, precond.emotion);
  
  if (intensity < precond.min_intensity) return false;
  if (precond.max_intensity !== undefined && intensity > precond.max_intensity) return false;
  
  return true;
}

/**
 * Clone an APDL world state for simulation.
 */
export function cloneAPDLState(state: APDLWorldState): APDLWorldState {
  return {
    facts: new Map(state.facts),
    entities: new Map(state.entities),
    timestamp: state.timestamp,
    emotional_state: new Map(
      Array.from(state.emotional_state.entries()).map(([id, emo]) => [
        id,
        {
          ...emo,
          feelings: new Map(emo.feelings),
        },
      ])
    ),
    audience_emotional_state: {
      ...state.audience_emotional_state,
      knows: new Set(state.audience_emotional_state.knows),
      expects: new Map(state.audience_emotional_state.expects),
      fears: new Set(state.audience_emotional_state.fears),
      hopes: new Set(state.audience_emotional_state.hopes),
    },
    irony_gaps: state.irony_gaps ? [...state.irony_gaps] : undefined,
  };
}
