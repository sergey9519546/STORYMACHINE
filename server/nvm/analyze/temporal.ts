// Allen Interval Algebra — ROADMAP RECOVER-02 / M4. Deterministic, no LLM.
//
// Defines the 13 basic temporal relations between intervals per Allen (1983) and
// provides constraint composition checking to detect transitive contradictions
// (e.g. A before B, B before C, C before A). Used for narrative timeline
// consistency checking — each interval represents an event or scene span.
// Path-consistency style detection: O(n³) deterministic propagation over the
// relation constraint set.

// The 13 Allen basic interval relations.
export type AllenRelation =
  | 'before' | 'meets' | 'overlaps' | 'starts' | 'during' | 'finishes' | 'equals'
  | 'after' | 'met_by' | 'overlapped_by' | 'started_by' | 'contains' | 'finished_by';

export interface Interval {
  readonly start: number;
  readonly end: number;
}

/** Determine the single Allen relation that holds between two intervals [a, b].
    Assumes a.start < a.end and b.start < b.end (valid intervals).
    Deterministic and pure.
*/
export function relate(a: Interval, b: Interval): AllenRelation {
  const { start: a1, end: a2 } = a;
  const { start: b1, end: b2 } = b;

  if (a2 < b1) return 'before';
  if (a2 === b1) return 'meets';
  if (a1 < b1 && a2 > b1 && a2 < b2) return 'overlaps';
  if (a1 === b1 && a2 < b2) return 'starts';
  if (a1 > b1 && a2 < b2) return 'during';
  if (a1 > b1 && a1 < b2 && a2 === b2) return 'finishes';
  if (a1 === b1 && a2 === b2) return 'equals';
  if (a1 > b2) return 'after';
  if (a1 === b2) return 'met_by';
  if (b1 < a1 && b2 > a1 && b2 < a2) return 'overlapped_by';
  if (a1 === b1 && a2 > b2) return 'started_by';
  if (b1 > a1 && b2 < a2) return 'contains';
  if (b1 > a1 && b1 < a2 && b2 === a2) return 'finished_by';

  // Should not reach here for valid input intervals
  return 'equals';
}

/** Return the inverse of a given Allen relation. */
export function inverse(r: AllenRelation): AllenRelation {
  const inverses: Record<AllenRelation, AllenRelation> = {
    before: 'after',
    meets: 'met_by',
    overlaps: 'overlapped_by',
    starts: 'started_by',
    during: 'contains',
    finishes: 'finished_by',
    equals: 'equals',
    after: 'before',
    met_by: 'meets',
    overlapped_by: 'overlaps',
    started_by: 'starts',
    contains: 'during',
    finished_by: 'finishes',
  };
  return inverses[r];
}

export interface Constraint {
  readonly a: string;
  readonly b: string;
  readonly relation: AllenRelation;
}

export interface Violation {
  readonly cycleStart: string;
  readonly path: Constraint[];
}

/**
 * Detect transitive contradictions in a set of interval-ordering constraints.
 * Uses cycle detection (O(n³) deterministic).
 * Abstains (returns {consistent: true}) for <2 events.
 * Returns the first detected cycle violation.
 */
export function composeConsistent(constraints: readonly Constraint[]): { consistent: boolean; violation?: Violation } {
  // Extract unique event names
  const events = new Set<string>();
  for (const c of constraints) {
    events.add(c.a);
    events.add(c.b);
  }

  if (events.size < 2) {
    return { consistent: true };
  }

  // Build an adjacency map: event -> list of (target, relation) pairs
  const graph: Map<string, Array<{ target: string; relation: AllenRelation }>> = new Map();
  for (const event of events) {
    graph.set(event, []);
  }
  for (const { a, b, relation } of constraints) {
    const neighbors = graph.get(a) || [];
    neighbors.push({ target: b, relation });
    graph.set(a, neighbors);
  }

  // DFS to detect cycles with path tracking
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string, start: string, path: Constraint[]): Violation | null {
    visited.add(node);
    recStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const { target, relation } of neighbors) {
      const constraint: Constraint = { a: node, b: target, relation };
      const newPath = [...path, constraint];

      if (target === start && newPath.length > 1) {
        // Found a cycle back to start
        return { cycleStart: start, path: newPath };
      }

      if (!visited.has(target)) {
        const violation = dfs(target, start, newPath);
        if (violation) {
          return violation;
        }
      } else if (recStack.has(target)) {
        // Back edge to a node in current recursion stack — cycle exists
        const cycleConstraint: Constraint = { a: node, b: target, relation };
        return { cycleStart: target, path: [...path, cycleConstraint] };
      }
    }

    recStack.delete(node);
    return null;
  }

  // Try DFS from each unvisited node
  for (const event of events) {
    if (!visited.has(event)) {
      const violation = dfs(event, event, []);
      if (violation) {
        return { consistent: false, violation };
      }
    }
  }

  return { consistent: true };
}
