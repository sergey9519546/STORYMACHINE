import { FabulaState, LocationState, TemporalRule, CausalLink, SetupPayoffLedger } from '../state/narrativeState';

export interface PDDLAction {
  id: string;
  name: string;
  parameters: Record<string, any>;
  preconditions: (state: FabulaState) => boolean;
  effects: (state: FabulaState) => FabulaState;
}

export class PDDLPlanner {
  private currentState: FabulaState;
  private actions: Map<string, PDDLAction>;

  constructor(initialState: FabulaState) {
    this.currentState = this.deepFreeze(initialState);
    this.actions = new Map();
  }

  /**
   * Registers a new action in the domain.
   */
  public registerAction(action: PDDLAction): void {
    this.actions.set(action.id, action);
  }

  /**
   * Returns the current immutable ground truth state.
   */
  public getState(): FabulaState {
    return this.currentState;
  }

  /**
   * Returns all actions whose preconditions are met in the current state.
   */
  public getAvailableActions(): PDDLAction[] {
    const available: PDDLAction[] = [];
    for (const action of this.actions.values()) {
      if (action.preconditions(this.currentState)) {
        available.push(action);
      }
    }
    return available;
  }

  /**
   * Applies an action and returns the new immutable state.
   * Throws if preconditions are not met.
   */
  public applyAction(actionId: string): FabulaState {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`PDDLPlanner Error: Action '${actionId}' not found.`);
    }

    if (!action.preconditions(this.currentState)) {
      throw new Error(`PDDLPlanner Error: Preconditions for action '${actionId}' not met.`);
    }

    // Apply effects to generate a new state
    const nextState = action.effects(this.currentState);
    
    // Enforce immutability
    this.currentState = this.deepFreeze(nextState);
    return this.currentState;
  }

  /**
   * Simple forward-chaining planner to find a path to a goal state.
   * Returns an array of action IDs, or null if no plan is found within maxDepth.
   */
  public plan(goalCondition: (state: FabulaState) => boolean, maxDepth: number = 5): string[] | null {
    interface Node {
      state: FabulaState;
      path: string[];
    }

    const queue: Node[] = [{ state: this.currentState, path: [] }];
    const visited = new Set<string>(); // In a real system, we'd hash the state

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (goalCondition(current.state)) {
        return current.path;
      }

      if (current.path.length >= maxDepth) {
        continue;
      }

      // Generate next states
      for (const action of this.actions.values()) {
        if (action.preconditions(current.state)) {
          try {
            const nextState = action.effects(current.state);
            // Simple hash for visited check (can be optimized)
            const stateHash = JSON.stringify(nextState);
            if (!visited.has(stateHash)) {
              visited.add(stateHash);
              queue.push({
                state: nextState,
                path: [...current.path, action.id]
              });
            }
          } catch (e) {
            // Ignore invalid transitions
          }
        }
      }
    }

    return null; // No plan found
  }

  /**
   * Utility to ensure the state remains immutable.
   */
  private deepFreeze<T>(obj: T): T {
    if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
      Object.freeze(obj);
      Object.keys(obj).forEach(key => this.deepFreeze((obj as any)[key]));
    }
    return obj;
  }
}
