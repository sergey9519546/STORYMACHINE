// Pre-Flight Auditor — Trinity Verification Gate Layer 3
//
// Validates epistemic consistency, possession tracking, and spatial feasibility.
// Prevents plot holes where characters know things they shouldn't, have objects
// they don't possess, or travel to places they can't reach.
//
// Design: Tracks knowledge paths, object custody, and character locations.
// Integrates with existing proof system (epistemicProof, continuityProof).

import type { NarrativeEvent } from '../types.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { AtomicFact } from '../../ops/StoryOp.ts';

// ── Type Definitions ──────────────────────────────────────────────────────────

export interface PreFlightViolation {
  type: 'epistemic' | 'possession' | 'spatial' | 'temporal-travel' | 'knowledge-path';
  severity: 'critical' | 'medium' | 'low';
  message: string;
  characterIds?: string[];
  objectIds?: string[];
  factIds?: string[];
  repairSuggestions: string[];
  confidence: number;  // 0-1
}

export interface PreFlightAudit {
  pass: boolean;
  violations: PreFlightViolation[];
  epistemicConsistency: number;  // 0-100
  possessionTracking: number;  // 0-100
  spatialFeasibility: number;  // 0-100
  timestamp: number;
}

// ── Configuration ─────────────────────────────────────────────────────────────

const EPISTEMIC_THRESHOLD = 85;  // High bar for knowledge consistency
const POSSESSION_THRESHOLD = 90;  // Very high bar for object tracking
const SPATIAL_THRESHOLD = 80;  // Reasonable bar for travel feasibility

const MAX_TRAVEL_SPEED = 100;  // story-time units per distance unit (configurable)
const KNOWLEDGE_TRANSFER_RADIUS = 2;  // How many "hops" can knowledge travel in one scene

// ── Core Auditor ──────────────────────────────────────────────────────────────

/**
 * Pre-flight audit for a proposed event.
 * 
 * Three-part check:
 * 1. Epistemic: Does character know what they claim to know?
 * 2. Possession: Does character have objects they use?
 * 3. Spatial: Can character reach locations they travel to?
 */
export function auditPreFlight(
  event: NarrativeEvent,
  currentState: NarrativeState,
  allEvents: NarrativeEvent[]
): PreFlightAudit {
  
  const violations: PreFlightViolation[] = [];
  
  // 1. Check Epistemic Consistency
  const epistemicViolations = checkEpistemicConsistency(event, currentState, allEvents);
  violations.push(...epistemicViolations);
  
  // 2. Check Possession Tracking
  const possessionViolations = checkPossessionTracking(event, currentState, allEvents);
  violations.push(...possessionViolations);
  
  // 3. Check Spatial Feasibility
  const spatialViolations = checkSpatialFeasibility(event, currentState, allEvents);
  violations.push(...spatialViolations);
  
  // Compute scores
  const epistemicConsistency = computeEpistemicScore(epistemicViolations);
  const possessionTracking = computePossessionScore(possessionViolations);
  const spatialFeasibility = computeSpatialScore(spatialViolations);
  
  // Determine pass/fail
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const pass = 
    criticalCount === 0 &&
    epistemicConsistency >= EPISTEMIC_THRESHOLD &&
    possessionTracking >= POSSESSION_THRESHOLD &&
    spatialFeasibility >= SPATIAL_THRESHOLD;
  
  return {
    pass,
    violations,
    epistemicConsistency,
    possessionTracking,
    spatialFeasibility,
    timestamp: Date.now(),
  };
}

// ── Epistemic Consistency Checking ────────────────────────────────────────────

/**
 * Check that characters only know what they've observed or been told.
 * 
 * Detects:
 * - Character knows fact they never observed
 * - Character acts on knowledge they shouldn't have
 * - Information appears without transmission path
 */
function checkEpistemicConsistency(
  event: NarrativeEvent,
  state: NarrativeState,
  allEvents: NarrativeEvent[]
): PreFlightViolation[] {
  
  const violations: PreFlightViolation[] = [];
  const op = event.op;
  
  // Check UPDATE_BELIEF has valid knowledge path
  if (op.op === 'UPDATE_BELIEF') {
    const charId = op.charId;
    const belief = op.belief;
    
    // Build knowledge graph: who knows what and when
    const knowledgePath = traceKnowledgePath(
      belief.subject,
      belief.predicate,
      belief.object,
      charId,
      event.storyTime,
      allEvents,
      state
    );
    
    if (!knowledgePath.valid && belief.confidence > 0.6) {
      violations.push({
        type: 'knowledge-path',
        severity: 'critical',
        message: `Character ${charId} believes "${belief.subject} ${belief.predicate} ${belief.object}" without valid knowledge path`,
        characterIds: [charId],
        repairSuggestions: [
          'Show character observing this fact directly',
          'Add a scene where another character tells them',
          'Lower confidence to indicate speculation',
          ...knowledgePath.suggestions,
        ],
        confidence: 0.9,
      });
    }
  }
  
  // Check ADD_FACT when character is acting on knowledge
  if (op.op === 'ADD_FACT') {
    const fact = op.fact;
    
    // If character does something that requires knowing a fact
    if (fact.predicate === 'retrieves' || fact.predicate === 'finds' || fact.predicate === 'uses') {
      const charId = fact.subject;
      const objectId = fact.object;
      
      // Check if character knows where object is
      const knownLocation = hasKnowledgeOfObjectLocation(charId, objectId, event, allEvents, state);
      
      if (!knownLocation) {
        violations.push({
          type: 'epistemic',
          severity: 'medium',
          message: `Character ${charId} ${fact.predicate} ${objectId} without knowing its location`,
          characterIds: [charId],
          objectIds: [objectId],
          repairSuggestions: [
            'Show character discovering or being told where object is',
            'Have character search for the object first',
            'Establish that character put object there earlier',
          ],
          confidence: 0.8,
        });
      }
    }
  }
  
  // Check audience knowledge tracking
  if (op.op === 'UPDATE_READER_STATE') {
    if (op.delta.knownFact) {
      // Verify audience has been shown this fact
      const factRevealed = allEvents.some(e =>
        e.storyTime <= event.storyTime &&
        e.presentationIndex < event.presentationIndex &&
        eventRevealsFactToAudience(e, op.delta.knownFact!)
      );
      
      if (!factRevealed) {
        violations.push({
          type: 'epistemic',
          severity: 'medium',
          message: `Audience knowledge updated with fact "${op.delta.knownFact}" that was never revealed`,
          repairSuggestions: [
            'Show this fact in a scene before updating audience knowledge',
            'Add a visual or dialogue moment that reveals this information',
            'Remove this knowledge update if fact wasn\'t revealed',
          ],
          confidence: 0.85,
        });
      }
    }
  }
  
  return violations;
}

interface KnowledgePath {
  valid: boolean;
  path: string[];  // Chain of transmission
  suggestions: string[];
}

/**
 * Trace how character could have learned a fact.
 * Returns path from fact origin to character's belief.
 */
function traceKnowledgePath(
  subject: string,
  predicate: string,
  object: string,
  charId: string,
  atTime: number,
  allEvents: NarrativeEvent[],
  state: NarrativeState
): KnowledgePath {
  
  // Find when fact became true in objective reality
  const factOrigin = state.objectiveReality.find(f =>
    f.subject === subject &&
    f.predicate === predicate &&
    f.object === object &&
    f.validFrom <= atTime
  );
  
  if (!factOrigin) {
    // Fact doesn't exist in objective reality - might be inference or false belief
    return {
      valid: false,
      path: [],
      suggestions: [
        'Add the fact to objective reality first',
        'If this is a false belief, lower the confidence',
      ],
    };
  }
  
  // Check if character was present when fact was established
  const factCreationEvent = allEvents.find(e =>
    e.op.op === 'ADD_FACT' &&
    e.op.fact.factId === factOrigin.factId
  );
  
  if (factCreationEvent) {
    const charWasPresent = checkCharacterInScene(charId, factCreationEvent.sceneIdx, allEvents);
    if (charWasPresent) {
      return {
        valid: true,
        path: [factOrigin.factId, charId],
        suggestions: [],
      };
    }
  }
  
  // Check if another character who knows told them
  const knowledgeTransfer = findKnowledgeTransfer(
    subject, predicate, object,
    charId,
    atTime,
    allEvents,
    state
  );
  
  if (knowledgeTransfer) {
    return {
      valid: true,
      path: knowledgeTransfer,
      suggestions: [],
    };
  }
  
  // No valid path found
  return {
    valid: false,
    path: [],
    suggestions: [
      'Add a dialogue scene where character learns this',
      'Show character observing the fact directly',
      'Establish that character was present when this happened',
    ],
  };
}

function checkCharacterInScene(charId: string, sceneIdx: number, allEvents: NarrativeEvent[]): boolean {
  return allEvents.some(e =>
    e.sceneIdx === sceneIdx &&
    e.op.op === 'ADD_FACT' &&
    (e.op.fact.subject === charId || e.op.fact.object === charId)
  );
}

function findKnowledgeTransfer(
  subject: string,
  predicate: string,
  object: string,
  targetChar: string,
  atTime: number,
  allEvents: NarrativeEvent[],
  state: NarrativeState
): string[] | null {
  
  // Look for scenes where characters who know talk to target character
  for (const event of allEvents) {
    if (event.storyTime >= atTime) continue;
    
    // Check for dialogue or interaction
    if (event.op.op === 'SHIFT_RELATIONSHIP') {
      const [char1, char2] = event.op.pair;
      
      // If one of them is target and other knows the fact
      if (char1 === targetChar || char2 === targetChar) {
        const otherChar = char1 === targetChar ? char2 : char1;
        
        // Check if other character has the belief
        const otherBeliefs = state.characterBeliefs[otherChar] || [];
        const hasBelief = otherBeliefs.some(b =>
          b.subject === subject &&
          b.predicate === predicate &&
          b.object === object
        );
        
        if (hasBelief) {
          return [otherChar, targetChar];
        }
      }
    }
  }
  
  return null;
}

function hasKnowledgeOfObjectLocation(
  charId: string,
  objectId: string,
  event: NarrativeEvent,
  allEvents: NarrativeEvent[],
  state: NarrativeState
): boolean {
  
  // Check if character has belief about object location
  const beliefs = state.characterBeliefs[charId] || [];
  const hasLocationBelief = beliefs.some(b =>
    b.subject === objectId &&
    b.predicate === 'located_at'
  );
  
  if (hasLocationBelief) return true;
  
  // Check if character placed object there themselves
  const characterPlaced = allEvents.some(e =>
    e.storyTime < event.storyTime &&
    e.op.op === 'ADD_FACT' &&
    e.op.fact.subject === charId &&
    (e.op.fact.predicate === 'places' || e.op.fact.predicate === 'puts') &&
    e.op.fact.object === objectId
  );
  
  return characterPlaced;
}

function eventRevealsFactToAudience(event: NarrativeEvent, factStr: string): boolean {
  // Check if event shows this fact on screen
  if (event.op.op === 'RECORD_VISUAL_FACT') {
    return event.op.fact.includes(factStr);
  }
  
  if (event.op.op === 'RECORD_SONIC_FACT') {
    return event.op.fact.includes(factStr);
  }
  
  if (event.op.op === 'ADD_FACT') {
    const factDesc = `${event.op.fact.subject} ${event.op.fact.predicate} ${event.op.fact.object}`;
    return factDesc.includes(factStr);
  }
  
  return false;
}

// ── Possession Tracking ───────────────────────────────────────────────────────

/**
 * Check that characters only use objects they possess.
 * 
 * Detects:
 * - Character uses object they don't have
 * - Object in two places at once
 * - Object custody chain is broken
 */
function checkPossessionTracking(
  event: NarrativeEvent,
  state: NarrativeState,
  allEvents: NarrativeEvent[]
): PreFlightViolation[] {
  
  const violations: PreFlightViolation[] = [];
  const op = event.op;
  
  // Check ADD_FACT when character uses/manipulates object
  if (op.op === 'ADD_FACT') {
    const fact = op.fact;
    
    if (fact.predicate === 'uses' || fact.predicate === 'wields' || fact.predicate === 'shows') {
      const charId = fact.subject;
      const objectId = fact.object;
      
      // Check possession chain
      const custody = trackObjectCustody(objectId, event.storyTime, allEvents, state);
      
      if (custody.currentOwner !== charId) {
        violations.push({
          type: 'possession',
          severity: 'critical',
          message: `Character ${charId} ${fact.predicate} ${objectId} but doesn't possess it (current owner: ${custody.currentOwner || 'unknown'})`,
          characterIds: [charId],
          objectIds: [objectId],
          repairSuggestions: [
            `Show character acquiring ${objectId} from ${custody.currentOwner || 'its location'}`,
            'Add a transfer event where character receives the object',
            'Move this event to when character had possession',
          ],
          confidence: 0.95,
        });
      }
    }
  }
  
  // Check SEED_CLUE with object carrier
  if (op.op === 'SEED_CLUE' && op.carrier === 'object') {
    const clueId = op.clueId;
    
    // Extract object ID from clue ID (convention: object_name)
    const objectMatch = clueId.match(/OBJ_(\w+)/);
    if (objectMatch) {
      const objectId = `OBJ_${objectMatch[1]}`;
      
      // Check object exists and is located somewhere plausible
      const objectExists = state.objectiveReality.some(f =>
        f.subject === objectId &&
        f.predicate === 'located_at' &&
        f.validFrom <= event.storyTime
      );
      
      if (!objectExists) {
        violations.push({
          type: 'possession',
          severity: 'medium',
          message: `Clue ${clueId} carried by object ${objectId} that doesn't exist in world`,
          objectIds: [objectId],
          repairSuggestions: [
            'Add a fact establishing this object exists',
            'Place the object in the scene location',
            'Change the clue carrier to something established',
          ],
          confidence: 0.8,
        });
      }
    }
  }
  
  return violations;
}

interface ObjectCustody {
  currentOwner: string | null;
  lastTransfer: number;  // story time
  chain: string[];  // ownership history
}

/**
 * Track custody chain for an object through story time.
 */
function trackObjectCustody(
  objectId: string,
  atTime: number,
  allEvents: NarrativeEvent[],
  state: NarrativeState
): ObjectCustody {
  
  let currentOwner: string | null = null;
  let lastTransfer = 0;
  const chain: string[] = [];
  
  // Check current state first
  const possessionFact = state.objectiveReality.find(f =>
    f.subject === objectId &&
    f.predicate === 'possessed_by' &&
    f.validFrom <= atTime &&
    (f.validTo === null || f.validTo > atTime)
  );
  
  if (possessionFact) {
    currentOwner = possessionFact.object;
    lastTransfer = possessionFact.validFrom;
    chain.push(currentOwner);
  } else {
    // Check location instead
    const locationFact = state.objectiveReality.find(f =>
      f.subject === objectId &&
      f.predicate === 'located_at' &&
      f.validFrom <= atTime &&
      (f.validTo === null || f.validTo > atTime)
    );
    
    if (locationFact) {
      currentOwner = locationFact.object;  // Location is "owner"
      lastTransfer = locationFact.validFrom;
      chain.push(currentOwner);
    }
  }
  
  return { currentOwner, lastTransfer, chain };
}

// ── Spatial Feasibility Checking ──────────────────────────────────────────────

/**
 * Check that characters can physically reach locations they travel to.
 * 
 * Detects:
 * - Character moves too fast (teleportation)
 * - Character in impossible location
 * - Travel without sufficient time
 */
function checkSpatialFeasibility(
  event: NarrativeEvent,
  state: NarrativeState,
  allEvents: NarrativeEvent[]
): PreFlightViolation[] {
  
  const violations: PreFlightViolation[] = [];
  const op = event.op;
  
  // Check ADD_FACT for location changes
  if (op.op === 'ADD_FACT') {
    const fact = op.fact;
    
    if (fact.predicate === 'located_at' || fact.predicate === 'moves_to') {
      const charId = fact.subject;
      const newLocation = fact.object;
      
      // Find previous location
      const previousLocation = findPreviousLocation(charId, event.storyTime, allEvents, state);
      
      if (previousLocation && previousLocation.location !== newLocation) {
        const distance = estimateDistance(previousLocation.location, newLocation);
        const timeElapsed = event.storyTime - previousLocation.time;
        const requiredTime = distance / MAX_TRAVEL_SPEED;
        
        if (timeElapsed < requiredTime) {
          violations.push({
            type: 'temporal-travel',
            severity: 'medium',
            message: `Character ${charId} travels from ${previousLocation.location} to ${newLocation} too quickly (${timeElapsed.toFixed(1)} time units for ${distance.toFixed(1)} distance)`,
            characterIds: [charId],
            repairSuggestions: [
              'Increase story time between locations',
              'Add a transition scene showing travel',
              'Adjust locations to be closer together',
              `Allow at least ${requiredTime.toFixed(1)} time units for this travel`,
            ],
            confidence: 0.75,
          });
        }
      }
    }
  }
  
  return violations;
}

interface LocationRecord {
  location: string;
  time: number;
}

function findPreviousLocation(
  charId: string,
  beforeTime: number,
  allEvents: NarrativeEvent[],
  state: NarrativeState
): LocationRecord | null {
  
  // Check state first
  const locationFact = state.objectiveReality
    .filter(f =>
      f.subject === charId &&
      f.predicate === 'located_at' &&
      f.validFrom < beforeTime
    )
    .sort((a, b) => b.validFrom - a.validFrom)[0];
  
  if (locationFact) {
    return {
      location: locationFact.object,
      time: locationFact.validFrom,
    };
  }
  
  return null;
}

function estimateDistance(loc1: string, loc2: string): number {
  // Simple heuristic: locations with similar names are closer
  // More sophisticated: use location graph from world bible
  
  if (loc1 === loc2) return 0;
  
  // Check for hierarchical relationship (e.g., "kitchen" vs "house")
  if (loc1.includes(loc2) || loc2.includes(loc1)) {
    return 1;  // Adjacent
  }
  
  // Default distance
  return 10;
}

// ── Score Computation ─────────────────────────────────────────────────────────

function computeEpistemicScore(violations: PreFlightViolation[]): number {
  const criticalWeight = 30;
  const mediumWeight = 15;
  const lowWeight = 5;
  
  let deduction = 0;
  for (const v of violations) {
    if (v.type !== 'epistemic' && v.type !== 'knowledge-path') continue;
    
    if (v.severity === 'critical') deduction += criticalWeight;
    else if (v.severity === 'medium') deduction += mediumWeight;
    else deduction += lowWeight;
  }
  
  return Math.max(0, 100 - deduction);
}

function computePossessionScore(violations: PreFlightViolation[]): number {
  const criticalWeight = 35;
  const mediumWeight = 15;
  const lowWeight = 5;
  
  let deduction = 0;
  for (const v of violations) {
    if (v.type !== 'possession') continue;
    
    if (v.severity === 'critical') deduction += criticalWeight;
    else if (v.severity === 'medium') deduction += mediumWeight;
    else deduction += lowWeight;
  }
  
  return Math.max(0, 100 - deduction);
}

function computeSpatialScore(violations: PreFlightViolation[]): number {
  const criticalWeight = 25;
  const mediumWeight = 12;
  const lowWeight = 5;
  
  let deduction = 0;
  for (const v of violations) {
    if (v.type !== 'spatial' && v.type !== 'temporal-travel') continue;
    
    if (v.severity === 'critical') deduction += criticalWeight;
    else if (v.severity === 'medium') deduction += mediumWeight;
    else deduction += lowWeight;
  }
  
  return Math.max(0, 100 - deduction);
}

// ── Export ────────────────────────────────────────────────────────────────────

export type { PreFlightViolation, PreFlightAudit };
