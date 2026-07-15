// ── PDDL (Planning Domain Definition Language) Base Types ───────────────────
// Standard PDDL types for causal planning. APDL extends these with emotional
// reasoning while maintaining backward compatibility.

/**
 * A fact about the world that can be true or false.
 * Example: "door_is_open", "character_has_key(alice)"
 */
export interface Predicate {
  name: string;
  parameters: string[];  // entity references
}

/**
 * The complete state of the world at a given point in time.
 * Maps predicate signatures to boolean values.
 */
export interface PDDLWorldState {
  facts: Map<string, boolean>;       // "door_is_open" → true
  entities: Map<string, Entity>;     // entity_id → Entity
  timestamp: number;                 // scene/turn number
}

/**
 * An entity that exists in the world (character, object, location).
 */
export interface Entity {
  id: string;
  type: 'character' | 'object' | 'location';
  properties: Map<string, any>;
}

/**
 * A condition that must be true for an action to be executable.
 */
export interface Precondition {
  predicate: Predicate;
  required_value: boolean;  // must be true or must be false
}

/**
 * A change to the world state caused by an action.
 */
export interface Effect {
  predicate: Predicate;
  new_value: boolean;
}

/**
 * An action that can be taken to change the world state.
 */
export interface PDDLAction {
  name: string;
  parameters: string[];              // e.g., ["character", "target"]
  preconditions: Precondition[];
  effects: Effect[];
  cost?: number;                     // default 1.0 (used in plan cost calculation)
}

/**
 * A goal condition to achieve through planning.
 */
export interface PDDLGoal {
  required_facts: Predicate[];       // all must be true
  forbidden_facts?: Predicate[];     // all must be false
}

/**
 * A sequence of actions that achieves a goal.
 */
export interface PDDLPlan {
  actions: PDDLAction[];
  initial_state: PDDLWorldState;
  final_state: PDDLWorldState;
  cost: number;                      // sum of action costs
}

/**
 * Constraints on what plans are acceptable.
 */
export interface PDDLConstraints {
  max_plan_length?: number;          // max number of actions
  max_search_time_ms?: number;       // timeout for planning
  forbidden_actions?: string[];      // action names to never use
  required_actions?: string[];       // action names that must appear
}

/**
 * Helper: Convert a predicate to a unique string key for storage.
 */
export function predicateToKey(pred: Predicate): string {
  if (pred.parameters.length === 0) {
    return pred.name;
  }
  return `${pred.name}(${pred.parameters.join(',')})`;
}

/**
 * Helper: Parse a predicate key back into a Predicate.
 */
export function keyToPredicate(key: string): Predicate {
  const match = key.match(/^([^(]+)(?:\(([^)]*)\))?$/);
  if (!match) {
    throw new Error(`Invalid predicate key: ${key}`);
  }
  const [, name, params] = match;
  return {
    name,
    parameters: params ? params.split(',').map(p => p.trim()) : [],
  };
}

/**
 * Helper: Check if a precondition is satisfied in a given state.
 */
export function isPreconditionSatisfied(
  precond: Precondition,
  state: PDDLWorldState
): boolean {
  const key = predicateToKey(precond.predicate);
  const actual = state.facts.get(key);
  return actual === precond.required_value;
}

/**
 * Helper: Apply an effect to a world state (mutates state).
 */
export function applyEffect(effect: Effect, state: PDDLWorldState): void {
  const key = predicateToKey(effect.predicate);
  state.facts.set(key, effect.new_value);
}

/**
 * Helper: Clone a world state for simulation.
 */
export function cloneWorldState(state: PDDLWorldState): PDDLWorldState {
  return {
    facts: new Map(state.facts),
    entities: new Map(state.entities),
    timestamp: state.timestamp,
  };
}

/**
 * Helper: Check if all preconditions are satisfied.
 */
export function canExecuteAction(
  action: PDDLAction,
  state: PDDLWorldState
): boolean {
  return action.preconditions.every(p => isPreconditionSatisfied(p, state));
}

/**
 * Helper: Execute an action and return the new state (does not mutate original).
 */
export function executeAction(
  action: PDDLAction,
  state: PDDLWorldState
): PDDLWorldState {
  if (!canExecuteAction(action, state)) {
    throw new Error(`Cannot execute action ${action.name}: preconditions not satisfied`);
  }
  
  const newState = cloneWorldState(state);
  action.effects.forEach(effect => applyEffect(effect, newState));
  newState.timestamp += 1;
  
  return newState;
}
