// ── APDL Planner ─────────────────────────────────────────────────────────────
// Planner that optimizes for both causal AND emotional paths.
// Uses A* search with a dual cost function (causal + emotional).

import type {
  APDLWorldState,
  APDLAction,
  APDLGoal,
  APDLPlan,
  APDLConstraints,
  EmotionalTrajectory,
  IronyGap,
  CatharsisPoint,
  EmotionalState,
  CharacterId,
} from './apdl';

import {
  cloneAPDLState,
  isEmotionalPreconditionSatisfied,
  getEmotionIntensity,
  setEmotionIntensity,
  applyEmotionalDecay,
  calculateTrajectory,
  createEmptyEmotionalState,
} from './apdl';

import {
  canExecuteAction,
  executeAction,
  predicateToKey,
} from './pddl-types';

// ── Planning Node ────────────────────────────────────────────────────────────

/**
 * A node in the planning search space.
 */
interface PlanningNode {
  state: APDLWorldState;
  actions: APDLAction[];
  causalCost: number;
  emotionalCost: number;
  totalCost: number;
  heuristic: number;
  parent?: PlanningNode;
}

// ── Main Planning Function ───────────────────────────────────────────────────

/**
 * Plan a sequence of actions that achieves the goal while maintaining
 * emotional coherence and dramatic interest.
 * 
 * Uses A* search with a dual cost function:
 * - Causal cost: number of actions (minimize plan length)
 * - Emotional cost: flatness penalty (penalize emotionally flat stories)
 */
export async function apdlPlan(
  initialState: APDLWorldState,
  goal: APDLGoal,
  availableActions: APDLAction[],
  constraints: APDLConstraints = {}
): Promise<APDLPlan | null> {
  const startTime = Date.now();
  const maxTime = constraints.max_search_time_ms || 5000;
  const maxLength = constraints.max_plan_length || 20;
  
  // Initialize search
  const openSet: PlanningNode[] = [{
    state: initialState,
    actions: [],
    causalCost: 0,
    emotionalCost: 0,
    totalCost: 0,
    heuristic: estimateDistance(initialState, goal),
  }];
  
  const closedSet = new Set<string>();
  let nodesExplored = 0;
  let bestPlan: APDLPlan | null = null;
  
  while (openSet.length > 0) {
    // Check timeout
    if (Date.now() - startTime > maxTime) {
      console.warn('[APDL] Planning timeout reached');
      break;
    }
    
    // Get node with lowest f-score (cost + heuristic)
    openSet.sort((a, b) => (a.totalCost + a.heuristic) - (b.totalCost + b.heuristic));
    const current = openSet.shift()!;
    nodesExplored++;
    
    // Check if goal is reached
    if (isGoalSatisfied(current.state, goal)) {
      const plan = buildPlan(current, goal);
      if (!bestPlan || plan.total_cost < bestPlan.total_cost) {
        bestPlan = plan;
      }
      // Continue searching for better plans unless we hit constraints
      if (shouldStopSearch(bestPlan, constraints)) {
        break;
      }
      continue;
    }
    
    // Check max plan length
    if (current.actions.length >= maxLength) {
      continue;
    }
    
    // Mark as visited
    const stateKey = serializeState(current.state);
    if (closedSet.has(stateKey)) continue;
    closedSet.add(stateKey);
    
    // Expand neighbors
    for (const action of availableActions) {
      // Skip forbidden actions
      if (constraints.forbidden_actions?.includes(action.name)) continue;
      
      // Check if action is executable (causal + emotional preconditions)
      if (!isActionExecutable(action, current.state)) continue;
      
      // Apply action
      const newState = applyAPDLAction(action, current.state);
      
      // Calculate costs
      const actionCost = action.cost || 1.0;
      const newCausalCost = current.causalCost + actionCost;
      const newEmotionalCost = calculateEmotionalCost(
        current.state,
        newState,
        current.actions.concat(action)
      );
      const totalCost = newCausalCost + newEmotionalCost;
      
      // Create new node
      const neighbor: PlanningNode = {
        state: newState,
        actions: [...current.actions, action],
        causalCost: newCausalCost,
        emotionalCost: newEmotionalCost,
        totalCost,
        heuristic: estimateDistance(newState, goal),
        parent: current,
      };
      
      openSet.push(neighbor);
    }
  }
  
  if (bestPlan) {
    console.log(`[APDL] Plan found: ${bestPlan.actions.length} actions, ${nodesExplored} nodes explored`);
  } else {
    console.warn('[APDL] No plan found');
  }
  
  return bestPlan;
}

// ── Action Execution ─────────────────────────────────────────────────────────

/**
 * Check if an action can be executed (both causal and emotional preconditions).
 */
function isActionExecutable(action: APDLAction, state: APDLWorldState): boolean {
  // Check causal preconditions
  if (!canExecuteAction(action, state)) return false;
  
  // Check emotional preconditions
  for (const precond of action.emotional_preconditions) {
    if (!isEmotionalPreconditionSatisfied(precond, state)) return false;
  }
  
  return true;
}

/**
 * Apply an APDL action to a state, including emotional effects.
 */
function applyAPDLAction(action: APDLAction, state: APDLWorldState): APDLWorldState {
  // Clone state
  const newState = cloneAPDLState(state);
  
  // Apply causal effects (from base PDDL)
  const causalNewState = executeAction(action, newState);
  
  // Copy over APDL fields (executeAction only updates PDDL fields)
  causalNewState.emotional_state = newState.emotional_state;
  causalNewState.audience_emotional_state = newState.audience_emotional_state;
  causalNewState.irony_gaps = newState.irony_gaps;
  
  // Apply emotional decay for all characters
  for (const [charId, emotionalState] of causalNewState.emotional_state) {
    applyEmotionalDecay(emotionalState, causalNewState.timestamp);
  }
  
  // Apply emotional effects
  for (const effect of action.emotional_effects) {
    applyEmotionalEffect(effect, action, causalNewState);
  }
  
  // Apply audience effects
  if (action.audience_effects) {
    for (const audienceEffect of action.audience_effects) {
      applyAudienceEffect(audienceEffect, action, causalNewState);
    }
  }
  
  return causalNewState;
}

/**
 * Apply an emotional effect to a character or characters.
 */
function applyEmotionalEffect(
  effect: any,
  action: APDLAction,
  state: APDLWorldState
): void {
  const characters = resolveCharacterTargets(effect.character, action, state);
  
  for (const charId of characters) {
    let emotionalState = state.emotional_state.get(charId);
    if (!emotionalState) {
      emotionalState = createEmptyEmotionalState(state.timestamp);
      state.emotional_state.set(charId, emotionalState);
    }
    
    const currentIntensity = getEmotionIntensity(emotionalState, effect.emotion);
    const newIntensity = currentIntensity + effect.delta;
    setEmotionIntensity(emotionalState, effect.emotion, newIntensity, state.timestamp);
  }
}

/**
 * Apply an audience effect to the audience state.
 */
function applyAudienceEffect(
  effect: any,
  action: APDLAction,
  state: APDLWorldState
): void {
  const audience = state.audience_emotional_state;
  
  switch (effect.type) {
    case 'irony_creation':
      audience.tension = Math.min(1, audience.tension + effect.intensity * 0.3);
      audience.engagement = Math.min(1, audience.engagement + effect.intensity * 0.2);
      break;
      
    case 'irony_resolution':
      audience.tension = Math.max(0, audience.tension - effect.intensity * 0.2);
      audience.engagement = Math.min(1, audience.engagement + effect.intensity * 0.1);
      break;
      
    case 'tension_increase':
      audience.tension = Math.min(1, audience.tension + effect.intensity * 0.4);
      break;
      
    case 'tension_release':
      audience.tension = Math.max(0, audience.tension - effect.intensity * 0.5);
      break;
      
    case 'engagement_boost':
      audience.engagement = Math.min(1, audience.engagement + effect.intensity * 0.3);
      break;
  }
}

/**
 * Resolve character targets ('actor', 'target', 'both', 'all', or specific ID).
 */
function resolveCharacterTargets(
  target: string,
  action: APDLAction,
  state: APDLWorldState
): CharacterId[] {
  if (target === 'all') {
    return Array.from(state.emotional_state.keys());
  }
  
  if (target === 'both' || target === 'actor' || target === 'target') {
    // In a real implementation, would extract from action parameters
    // For now, return empty to avoid errors
    return [];
  }
  
  return [target];
}

// ── Cost Functions ───────────────────────────────────────────────────────────

/**
 * Calculate the emotional cost (flatness penalty) of a plan.
 * Higher cost = flatter emotional trajectory = less interesting story.
 */
function calculateEmotionalCost(
  previousState: APDLWorldState,
  newState: APDLWorldState,
  actions: APDLAction[]
): number {
  if (actions.length < 2) return 0;
  
  // Calculate emotional variance across the plan
  const emotionalStates = extractEmotionalStates(actions, previousState, newState);
  const variance = calculateEmotionalVariance(emotionalStates);
  
  // Flatness penalty: inverse of variance
  // Low variance (flat story) = high penalty
  const flatnessPenalty = 1.0 / (variance + 0.01);
  
  // Check for required catharsis points
  const catharsisCount = detectCatharsisPoints(emotionalStates).length;
  const catharsisPenalty = catharsisCount > 0 ? 0 : 2.0;
  
  return flatnessPenalty + catharsisPenalty;
}

/**
 * Calculate emotional variance across a sequence of states.
 */
function calculateEmotionalVariance(states: EmotionalState[][]): number {
  if (states.length < 2) return 0;
  
  // Calculate peak intensity at each step
  const intensities = states.map(stateSet => {
    return Math.max(0, ...stateSet.map(s => s.peakIntensity));
  });
  
  // Calculate variance
  const mean = intensities.reduce((sum, i) => sum + i, 0) / intensities.length;
  const variance = intensities.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intensities.length;
  
  return variance;
}

/**
 * Extract emotional states at each step of the plan.
 */
function extractEmotionalStates(
  actions: APDLAction[],
  initialState: APDLWorldState,
  finalState: APDLWorldState
): EmotionalState[][] {
  // Simulate plan to extract states at each step
  const states: EmotionalState[][] = [];
  let currentState = initialState;
  
  for (const action of actions) {
    currentState = applyAPDLAction(action, currentState);
    states.push(Array.from(currentState.emotional_state.values()));
  }
  
  return states;
}

/**
 * Detect catharsis points (major emotional releases) in a sequence.
 */
function detectCatharsisPoints(states: EmotionalState[][]): CatharsisPoint[] {
  const points: CatharsisPoint[] = [];
  
  for (let i = 1; i < states.length; i++) {
    const prevIntensity = Math.max(0, ...states[i - 1].map(s => s.peakIntensity));
    const currIntensity = Math.max(0, ...states[i].map(s => s.peakIntensity));
    
    // Catharsis = significant drop in intensity
    if (prevIntensity > 0.6 && currIntensity < prevIntensity - 0.3) {
      points.push({
        scene: i,
        type: 'revelation',  // Would determine type from action
        characters: [],
        release_magnitude: prevIntensity - currIntensity,
        description: 'Emotional tension released',
      });
    }
  }
  
  return points;
}

// ── Goal Checking ────────────────────────────────────────────────────────────

/**
 * Check if a goal is satisfied in a given state.
 */
function isGoalSatisfied(state: APDLWorldState, goal: APDLGoal): boolean {
  // Check causal goals
  for (const fact of goal.required_facts) {
    const key = predicateToKey(fact);
    if (!state.facts.get(key)) return false;
  }
  
  for (const fact of goal.forbidden_facts || []) {
    const key = predicateToKey(fact);
    if (state.facts.get(key)) return false;
  }
  
  // Check emotional goals
  if (goal.emotional_goals) {
    for (const emotionalGoal of goal.emotional_goals) {
      const emotionalState = state.emotional_state.get(emotionalGoal.character);
      if (!emotionalState) return false;
      
      const intensity = getEmotionIntensity(emotionalState, emotionalGoal.emotion);
      if (Math.abs(intensity - emotionalGoal.target_intensity) > 0.2) return false;
    }
  }
  
  // Check audience goals
  if (goal.audience_goals) {
    const audience = state.audience_emotional_state;
    if (goal.audience_goals.min_tension && audience.tension < goal.audience_goals.min_tension) {
      return false;
    }
    if (goal.audience_goals.min_engagement && audience.engagement < goal.audience_goals.min_engagement) {
      return false;
    }
  }
  
  return true;
}

/**
 * Estimate remaining distance to goal (heuristic for A*).
 */
function estimateDistance(state: APDLWorldState, goal: APDLGoal): number {
  let distance = 0;
  
  // Count unsatisfied causal facts
  for (const fact of goal.required_facts) {
    const key = predicateToKey(fact);
    if (!state.facts.get(key)) distance += 1;
  }
  
  // Count emotional goals not met
  if (goal.emotional_goals) {
    for (const emotionalGoal of goal.emotional_goals) {
      const emotionalState = state.emotional_state.get(emotionalGoal.character);
      const intensity = emotionalState ? getEmotionIntensity(emotionalState, emotionalGoal.emotion) : 0;
      const diff = Math.abs(intensity - emotionalGoal.target_intensity);
      distance += diff;
    }
  }
  
  return distance;
}

/**
 * Check if we should stop searching for better plans.
 */
function shouldStopSearch(plan: APDLPlan, constraints: APDLConstraints): boolean {
  // Check if plan meets all constraints
  if (constraints.required_actions) {
    const actionNames = plan.actions.map(a => a.name);
    for (const required of constraints.required_actions) {
      if (!actionNames.includes(required)) return false;
    }
  }
  
  if (constraints.min_catharsis_points) {
    if (plan.catharsis_points.length < constraints.min_catharsis_points) return false;
  }
  
  if (constraints.min_emotional_variance) {
    const states = extractEmotionalStates(plan.actions, plan.initial_state, plan.final_state);
    const variance = calculateEmotionalVariance(states);
    if (variance < constraints.min_emotional_variance) return false;
  }
  
  // If all constraints met, stop searching
  return true;
}

// ── Plan Construction ────────────────────────────────────────────────────────

/**
 * Build a complete APDL plan from a planning node.
 */
function buildPlan(node: PlanningNode, goal: APDLGoal): APDLPlan {
  // Extract emotional trajectory
  const states = extractEmotionalStates(node.actions, node.state, node.state);
  const trajectory = states.map(stateSet => {
    const intensities = stateSet.map(s => s.peakIntensity);
    if (intensities.length === 0) return 'flat';
    return calculateTrajectory(stateSet);
  });
  
  // Extract irony gaps
  const ironyGaps = extractIronyGaps(node.state);
  
  // Detect catharsis points
  const catharsisPoints = detectCatharsisPoints(states);
  
  // Calculate coherence score
  const coherenceScore = calculateCoherenceScore(node.actions, states);
  
  return {
    actions: node.actions,
    initial_state: node.state,
    final_state: node.state,
    cost: node.causalCost,
    emotional_trajectory: trajectory,
    irony_gaps: ironyGaps,
    catharsis_points: catharsisPoints,
    emotional_cost: node.emotionalCost,
    total_cost: node.totalCost,
    coherence_score: coherenceScore,
  };
}

/**
 * Extract irony gaps from final state.
 */
function extractIronyGaps(state: APDLWorldState): IronyGap[] {
  return state.irony_gaps || [];
}

/**
 * Calculate emotional coherence score (0-1, higher is better).
 */
function calculateCoherenceScore(actions: APDLAction[], states: EmotionalState[][]): number {
  if (states.length === 0) return 0;
  
  // Score based on variance (not flat) and catharsis points
  const variance = calculateEmotionalVariance(states);
  const catharsisCount = detectCatharsisPoints(states).length;
  
  // Normalize
  const varianceScore = Math.min(1, variance * 10);  // variance typically 0-0.1
  const catharsisScore = Math.min(1, catharsisCount / 3);
  
  return (varianceScore + catharsisScore) / 2;
}

// ── State Serialization ──────────────────────────────────────────────────────

/**
 * Serialize state to a string key for visited-set tracking.
 */
function serializeState(state: APDLWorldState): string {
  // Simple serialization: just use facts and dominant emotions
  const factKeys = Array.from(state.facts.entries())
    .filter(([, value]) => value)
    .map(([key]) => key)
    .sort()
    .join(',');
  
  const emotions = Array.from(state.emotional_state.entries())
    .map(([id, emo]) => `${id}:${emo.dominant || 'none'}`)
    .sort()
    .join(',');
  
  return `${factKeys}|${emotions}`;
}

// ── Backward-Compatible Wrapper ──────────────────────────────────────────────

/**
 * Enrich a pure PDDL plan with emotional logic (backward-compatible wrapper).
 */
export function enrichWithEmotionalLogic(
  pddlPlan: any,  // PDDLPlan
  emotionalContext?: Map<CharacterId, EmotionalState>
): APDLPlan {
  // Convert PDDL plan to APDL plan with default emotional data
  return {
    ...pddlPlan,
    emotional_trajectory: new Array(pddlPlan.actions.length).fill('flat'),
    irony_gaps: [],
    catharsis_points: [],
    emotional_cost: 0,
    total_cost: pddlPlan.cost,
    coherence_score: 0.5,
  };
}
