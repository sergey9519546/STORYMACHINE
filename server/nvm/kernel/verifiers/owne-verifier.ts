// OWNE Verifier — Trinity Verification Gate Layer 2
//
// Objective World, Narrative Essence verifier.
// Validates world consistency, intentional character actions, and promise/payoff logic.
// Prevents plot holes by enforcing world invariants and character agency.
//
// Design: Checks that events respect:
// 1. World Invariants: Physical laws, established rules, continuity
// 2. Intentional Planning: Characters act with goals, not randomly
// 3. Promise/Payoff Logic: Setups are earned, payoffs are deserved
//
// Integrates with existing proof system (intentionalProof, causalProof, continuityProof).

import type { NarrativeEvent } from '../types.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { AtomicFact } from '../../ops/StoryOp.ts';
import { parseSemanticTriple, occToVAD, type SemanticTriple } from '../adapters/nlp-helpers.ts';

// ── Type Definitions ──────────────────────────────────────────────────────────

export interface OwneViolation {
  type: 'world-inconsistency' | 'unmotivated-action' | 'unearned-payoff' | 'continuity-break' | 'logic-violation';
  severity: 'critical' | 'medium' | 'low';
  message: string;
  factIds?: string[];
  characterIds?: string[];
  objectIds?: string[];  // Added for Trinity Gate metadata compatibility
  repairSuggestions: string[];
  confidence: number;
}

export interface OwneVerification {
  pass: boolean;
  violations: OwneViolation[];
  worldConsistency: number;  // 0-100
  intentionalityScore: number;  // 0-100
  promiseIntegrity: number;  // 0-100
  timestamp: number;
}

// ── Configuration ─────────────────────────────────────────────────────────────

const WORLD_CONSISTENCY_THRESHOLD = 90;  // High bar for world logic
const INTENTIONALITY_THRESHOLD = 70;  // Characters should act with purpose
const PROMISE_INTEGRITY_THRESHOLD = 80;  // Payoffs must be earned

// ── Core Verifier ─────────────────────────────────────────────────────────────

/**
 * Verify Objective World and Narrative Essence for a proposed event.
 * 
 * Three-part check:
 * 1. World Invariants: Does this event violate established physics/rules?
 * 2. Intentional Planning: Do characters act with clear goals/motivations?
 * 3. Promise/Payoff Logic: Are setups properly planted? Are payoffs earned?
 */
export function verifyOwne(
  event: NarrativeEvent,
  currentState: NarrativeState,
  allEvents: NarrativeEvent[]
): OwneVerification {
  
  const violations: OwneViolation[] = [];
  
  // 1. Check World Invariants
  const worldViolations = checkWorldInvariants(event, currentState, allEvents);
  violations.push(...worldViolations);
  
  // 2. Check Intentional Planning
  const intentionalityViolations = checkIntentionality(event, currentState, allEvents);
  violations.push(...intentionalityViolations);
  
  // 3. Check Promise/Payoff Logic
  const promiseViolations = checkPromisePayoffLogic(event, currentState, allEvents);
  violations.push(...promiseViolations);
  
  // Compute scores
  const worldConsistency = computeWorldConsistency(worldViolations);
  const intentionalityScore = computeIntentionality(intentionalityViolations);
  const promiseIntegrity = computePromiseIntegrity(promiseViolations);
  
  // Determine pass/fail
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const pass = 
    criticalCount === 0 &&
    worldConsistency >= WORLD_CONSISTENCY_THRESHOLD &&
    intentionalityScore >= INTENTIONALITY_THRESHOLD &&
    promiseIntegrity >= PROMISE_INTEGRITY_THRESHOLD;
  
  return {
    pass,
    violations,
    worldConsistency,
    intentionalityScore,
    promiseIntegrity,
    timestamp: Date.now(),
  };
}

// ── World Invariants Checking ─────────────────────────────────────────────────

/**
 * Check that event respects established world rules and physical constraints.
 * 
 * Detects:
 * - Contradictory facts (character in two places at once)
 * - Violated physical laws (established in world bible)
 * - Continuity breaks (object state changes without cause)
 */
function checkWorldInvariants(
  event: NarrativeEvent,
  state: NarrativeState,
  allEvents: NarrativeEvent[]
): OwneViolation[] {
  
  const violations: OwneViolation[] = [];
  const op = event.op;
  
  // Check for contradictory facts
  if (op.op === 'ADD_FACT') {
    const newFact = op.fact;
    
    // Check against existing objective reality
    for (const existingFact of state.objectiveReality) {
      if (factsContradict(newFact, existingFact, event.storyTime)) {
        violations.push({
          type: 'world-inconsistency',
          severity: 'critical',
          message: `Fact contradiction: "${newFact.subject} ${newFact.predicate} ${newFact.object}" conflicts with existing fact "${existingFact.subject} ${existingFact.predicate} ${existingFact.object}"`,
          factIds: [newFact.factId, existingFact.factId],
          repairSuggestions: [
            'Expire the old fact before adding the new one',
            'Adjust the temporal validity ranges to avoid overlap',
            'Revise the new fact to be consistent with established truth',
          ],
          confidence: 0.95,
        });
      }
    }
    
    // Check for temporal violations (event before character exists)
    if (newFact.predicate === 'located_at' || newFact.predicate === 'possesses') {
      const characterExists = state.objectiveReality.some(f => 
        f.subject === newFact.subject && 
        f.predicate === 'exists' &&
        f.validFrom <= event.storyTime
      );
      
      if (!characterExists && newFact.subject.startsWith('CHAR_')) {
        violations.push({
          type: 'continuity-break',
          severity: 'critical',
          message: `Character ${newFact.subject} acts before being introduced to the story`,
          factIds: [newFact.factId],
          characterIds: [newFact.subject],
          repairSuggestions: [
            'Introduce the character before this event',
            'Move this event later in story time',
            'Add a fact establishing the character exists at this point',
          ],
          confidence: 0.9,
        });
      }
    }
  }
  
  // Check for object state changes without cause
  if (op.op === 'ADVANCE_OBJECT_ARC') {
    // Verify that there's a causal chain for the state change
    const hasRecentInteraction = allEvents
      .filter(e => e.storyTime < event.storyTime && e.storyTime > event.storyTime - 100)
      .some(e => eventInvolvesObject(e, op.objectId));
    
    if (!hasRecentInteraction) {
      violations.push({
        type: 'continuity-break',
        severity: 'medium',
        message: `Object ${op.objectId} changes state to "${op.toState}" without causal setup`,
        repairSuggestions: [
          'Add a preceding event that interacts with this object',
          'Show a character manipulating or affecting the object',
          'Establish a mechanism that causes this state change',
        ],
        confidence: 0.7,
      });
    }
  }
  
  return violations;
}

/**
 * Check if two facts contradict each other at a given time.
 */
function factsContradict(fact1: AtomicFact, fact2: AtomicFact, atTime: number): boolean {
  // Same subject and predicate but different objects = contradiction
  if (fact1.subject !== fact2.subject || fact1.predicate !== fact2.predicate) {
    return false;
  }
  
  // If objects are the same, not a contradiction
  if (fact1.object === fact2.object) {
    return false;
  }
  
  // Check temporal overlap
  const fact1Active = fact1.validFrom <= atTime && (fact1.validTo === null || fact1.validTo > atTime);
  const fact2Active = fact2.validFrom <= atTime && (fact2.validTo === null || fact2.validTo > atTime);
  
  // Both active at the same time with different objects = contradiction
  // (unless predicate allows multiple values like "possesses")
  const multiValuePredicates = ['possesses', 'knows', 'believes', 'fears'];
  if (multiValuePredicates.includes(fact1.predicate)) {
    return false;
  }
  
  return fact1Active && fact2Active;
}

function eventInvolvesObject(event: NarrativeEvent, objectId: string): boolean {
  const op = event.op;
  
  if (op.op === 'ADD_FACT') {
    return op.fact.subject === objectId || op.fact.object === objectId;
  }
  
  if (op.op === 'ADVANCE_OBJECT_ARC') {
    return op.objectId === objectId;
  }
  
  if (op.op === 'SEED_CLUE' && op.carrier === 'object') {
    return op.clueId.includes(objectId);
  }
  
  return false;
}

// ── Intentional Planning Checking ─────────────────────────────────────────────

/**
 * Check that characters act with clear goals and motivations.
 * 
 * Detects:
 * - Actions without motivation (character does something for no reason)
 * - Goals without progress (character wants something but never pursues it)
 * - Contradictory behavior (character acts against established personality)
 */
function checkIntentionality(
  event: NarrativeEvent,
  state: NarrativeState,
  allEvents: NarrativeEvent[]
): OwneViolation[] {
  
  const violations: OwneViolation[] = [];
  const op = event.op;
  
  // Check character actions have motivation
  if (op.op === 'ADD_FACT') {
    const fact = op.fact;
    
    // If a character takes an action, check for motivation
    if (fact.predicate === 'does' || fact.predicate === 'moves_to' || fact.predicate === 'takes') {
      const charId = fact.subject;
      
      // Look for recent belief, emotion, or goal that justifies this action
      const hasMotivation = 
        hasRecentBelief(charId, state, allEvents, event) ||
        hasRelevantEmotion(charId, state) ||
        hasActiveGoal(charId, state);
      
      if (!hasMotivation) {
        violations.push({
          type: 'unmotivated-action',
          severity: 'medium',
          message: `Character ${charId} performs action "${fact.object}" without clear motivation`,
          characterIds: [charId],
          repairSuggestions: [
            'Add a belief update showing why the character wants to do this',
            'Show an emotional appraisal that drives this action',
            'Establish a goal that this action serves',
          ],
          confidence: 0.65,
        });
      }
    }
  }
  
  // Check UPDATE_BELIEF has reasonable source
  if (op.op === 'UPDATE_BELIEF') {
    const charId = op.charId;
    const belief = op.belief;
    
    // Parse belief proposition into semantic triple for validation
    const triple = parseSemanticTriple(belief.proposition);
    
    if (!triple) {
      // Can't parse - assume low confidence belief is acceptable
      if (belief.confidence > 0.7) {
        violations.push({
          type: 'unmotivated-action',
          severity: 'low',
          message: `Character ${charId} forms unparseable belief "${belief.proposition}" with high confidence`,
          characterIds: [charId],
          repairSuggestions: [
            'Clarify the belief statement to be more specific',
            'Lower confidence if belief is speculative',
            'Add context showing how this belief was formed',
          ],
          confidence: 0.5,
        });
      }
      return violations;
    }
    
    // Belief should come from perception or inference
    // Check if there's a fact in objective reality that supports this belief
    const hasSupportingFact = state.objectiveReality.some(f =>
      f.subject === triple.subject &&
      f.predicate === triple.predicate &&
      f.validFrom <= event.storyTime
    );
    
    // Or check if character was present at relevant scene
    const wasPresent = checkCharacterPresence(charId, event, allEvents);
    
    if (!hasSupportingFact && !wasPresent && belief.confidence > 0.7) {
      violations.push({
        type: 'unmotivated-action',
        severity: 'low',
        message: `Character ${charId} forms belief "${belief.proposition}" without apparent source`,
        characterIds: [charId],
        repairSuggestions: [
          'Show how the character learned this information',
          'Add a scene where the character observes this fact',
          'Lower confidence to indicate speculation rather than knowledge',
        ],
        confidence: 0.6,
      });
    }
  }
  
  return violations;
}

function hasRecentBelief(
  charId: string,
  state: NarrativeState,
  allEvents: NarrativeEvent[],
  currentEvent: NarrativeEvent
): boolean {
  // Check for beliefs in recent story time
  const recentWindow = 50;  // story-time units
  
  const recentBeliefs = allEvents.filter(e =>
    e.storyTime >= currentEvent.storyTime - recentWindow &&
    e.storyTime < currentEvent.storyTime &&
    e.op.op === 'UPDATE_BELIEF' &&
    e.op.charId === charId
  );
  
  return recentBeliefs.length > 0;
}

function hasRelevantEmotion(charId: string, state: NarrativeState): boolean {
  const emotion = state.characterEmotions[charId];
  if (!emotion) return false;
  
  // Use OCC emotion dimensions - convert to VAD for threshold checking
  // High intensity or dominant emotion counts as motivation
  const vad = occToVAD(emotion.dominant, emotion.intensity);
  return Math.abs(vad.valence) > 0.5 || vad.arousal > 0.5 || emotion.intensity > 50;
}

function hasActiveGoal(charId: string, state: NarrativeState): boolean {
  // Check if character has recent goal-related beliefs
  const beliefs = state.characterBeliefs[charId] || [];
  
  // Parse belief propositions to check for goal-indicating patterns
  return beliefs.some(b => {
    const lower = b.proposition.toLowerCase();
    return lower.includes('want') || 
           lower.includes('intend') || 
           lower.includes('plan') ||
           lower.includes('goal') ||
           lower.includes('need');
  });
}

function checkCharacterPresence(
  charId: string,
  event: NarrativeEvent,
  allEvents: NarrativeEvent[]
): boolean {
  // Check if character was in same scene as event
  const sameSceneEvents = allEvents.filter(e => e.sceneIdx === event.sceneIdx);
  return sameSceneEvents.some(e =>
    e.op.op === 'ADD_FACT' &&
    e.op.fact.subject === charId
  );
}

// ── Promise/Payoff Logic Checking ─────────────────────────────────────────────

/**
 * Check that setups are properly planted and payoffs are earned.
 * 
 * Detects:
 * - Payoffs without setups (deus ex machina)
 * - Setups that are too close to payoffs (no anticipation)
 * - Payoffs that don't match the promise of the setup
 */
function checkPromisePayoffLogic(
  event: NarrativeEvent,
  state: NarrativeState,
  allEvents: NarrativeEvent[]
): OwneViolation[] {
  
  const violations: OwneViolation[] = [];
  const op = event.op;
  
  // Check PAYOFF_SETUP has corresponding seed
  if (op.op === 'PAYOFF_SETUP') {
    const setupId = op.setupId;
    
    // Find the seed event
    const seedEvent = allEvents.find(e =>
      e.op.op === 'SEED_CLUE' && e.op.clueId === setupId
    );
    
    if (!seedEvent) {
      violations.push({
        type: 'unearned-payoff',
        severity: 'critical',
        message: `Payoff for "${setupId}" has no corresponding setup/seed`,
        repairSuggestions: [
          'Add a SEED_CLUE event earlier in the story',
          'Plant the setup at least 3-5 scenes before the payoff',
          'Remove this payoff if the setup is not necessary',
        ],
        confidence: 0.95,
      });
    } else {
      // Check temporal distance
      const distance = event.sceneIdx - seedEvent.sceneIdx;
      
      if (distance < 3) {
        violations.push({
          type: 'unearned-payoff',
          severity: 'medium',
          message: `Payoff for "${setupId}" comes too soon after setup (${distance} scenes)`,
          repairSuggestions: [
            'Move the setup earlier to create anticipation',
            'Add intermediate scenes to build tension',
            'Allow at least 3-5 scenes between setup and payoff',
          ],
          confidence: 0.8,
        });
      }
      
      // Check story-time distance (should be > 10 units for dramatic setups)
      const storyTimeDistance = event.storyTime - seedEvent.storyTime;
      if (storyTimeDistance < 5) {
        violations.push({
          type: 'unearned-payoff',
          severity: 'low',
          message: `Payoff for "${setupId}" happens too quickly in story time (${storyTimeDistance.toFixed(1)} units)`,
          repairSuggestions: [
            'Increase story-time gap between setup and payoff',
            'Allow time for audience anticipation to build',
          ],
          confidence: 0.7,
        });
      }
    }
  }
  
  // Check SEED_CLUE is in appropriate carrier
  if (op.op === 'SEED_CLUE') {
    // Validate carrier exists in scene context
    const sceneHasCarrier = validateClueCarrier(op.carrier, event, allEvents, state);
    
    if (!sceneHasCarrier) {
      violations.push({
        type: 'logic-violation',
        severity: 'low',
        message: `Clue "${op.clueId}" carried by ${op.carrier} but carrier not established in scene`,
        repairSuggestions: [
          'Add a fact establishing the carrier object/location in the scene',
          'Change the carrier to something present in the scene',
          'Ensure the scene context supports this clue delivery',
        ],
        confidence: 0.65,
      });
    }
  }
  
  return violations;
}

function validateClueCarrier(
  carrier: string,
  event: NarrativeEvent,
  allEvents: NarrativeEvent[],
  state: NarrativeState
): boolean {
  // For now, simple validation - could be more sophisticated
  // Check if scene has any facts about the carrier type
  
  if (carrier === 'line' || carrier === 'gesture' || carrier === 'behavior') {
    // Character-based carriers - always valid if characters present
    return true;
  }
  
  if (carrier === 'object' || carrier === 'location') {
    // Should have supporting fact
    const sameSceneEvents = allEvents.filter(e => e.sceneIdx === event.sceneIdx);
    return sameSceneEvents.some(e =>
      e.op.op === 'ADD_FACT' &&
      (e.op.fact.predicate === 'located_at' || e.op.fact.predicate === 'possesses')
    );
  }
  
  // Other carriers are always valid (camera, sound, etc.)
  return true;
}

// ── Score Computation ─────────────────────────────────────────────────────────

function computeWorldConsistency(violations: OwneViolation[]): number {
  const criticalWeight = 30;
  const mediumWeight = 15;
  const lowWeight = 5;
  
  let deduction = 0;
  for (const v of violations) {
    if (v.severity === 'critical') deduction += criticalWeight;
    else if (v.severity === 'medium') deduction += mediumWeight;
    else deduction += lowWeight;
  }
  
  return Math.max(0, 100 - deduction);
}

function computeIntentionality(violations: OwneViolation[]): number {
  const criticalWeight = 25;
  const mediumWeight = 12;
  const lowWeight = 5;
  
  let deduction = 0;
  for (const v of violations) {
    if (v.severity === 'critical') deduction += criticalWeight;
    else if (v.severity === 'medium') deduction += mediumWeight;
    else deduction += lowWeight;
  }
  
  return Math.max(0, 100 - deduction);
}

function computePromiseIntegrity(violations: OwneViolation[]): number {
  const criticalWeight = 30;
  const mediumWeight = 15;
  const lowWeight = 5;
  
  let deduction = 0;
  for (const v of violations) {
    if (v.severity === 'critical') deduction += criticalWeight;
    else if (v.severity === 'medium') deduction += mediumWeight;
    else deduction += lowWeight;
  }
  
  return Math.max(0, 100 - deduction);
}

// ── Export ────────────────────────────────────────────────────────────────────
// Types are already exported inline above, no need to re-export
