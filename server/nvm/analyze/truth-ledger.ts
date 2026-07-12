/**
 * Truth Ledger — objective facts about the story world (#70).
 *
 * Verbatim TypeScript port of OWNE's `TruthLedger` (owne/ledgers/truth.py),
 * including FactTrack temporal contradiction detection. This is the assertion-
 * containment upgrade (#105): the crude `acknowledgedReversal` boolean is
 * replaced by Allen-style interval overlap on both validity checkpoints.
 *
 * A contradiction exists when two facts share the same subject and predicate,
 * carry incompatible object values, sit in the same epistemic layer, have
 * overlapping validity intervals, and no registered event explains the
 * transition.
 *
 * Port fidelity: matches OWNE's `test_truth.py` case-for-case (TruthFact
 * defaults, add/expire/query/get/retcon/promote/count, interval overlap, and
 * the 13 detect_contradictions cases).
 *
 * Population note (the one adaptation, per OWNE_PORT_PLAN): OWNE populated this
 * ledger from validated generation events; StoryMachine populates the same
 * ledger from per-scene fact extraction over a comprehended imported script,
 * where the scene's presentation-order index plays the role of OWNE's `step`.
 * The data structures and `detectContradictions` algorithm below are the
 * substrate that per-scene extraction feeds; the extraction adapter is wired
 * separately (findings layer). No LLM, no I/O — pure and deterministic.
 */

/** All 13 fact statuses (OWNE's FACT_STATUSES; the docstring says 14, the set is 13). */
export const FACT_STATUSES: ReadonlySet<string> = new Set([
  'true', 'false', 'unknown', 'suspected', 'disputed',
  'planted', 'forged', 'misremembered', 'suppressed',
  'retconned', 'symbolically_true', 'literally_false', 'unverified',
]);

/** All 11 canon tiers, ordered (promote advances to the next entry). */
export const CANON_TIERS: readonly string[] = [
  'hard_canon', 'soft_canon', 'provisional', 'character_belief',
  'rumor', 'player_theory', 'discarded_draft', 'alternate_branch',
  'brainstorm_only', 'author_note', 'plugin_suggestion',
];

/** All 8 epistemic layers. */
export const EPISTEMIC_LAYERS: ReadonlySet<string> = new Set([
  'objective_world', 'character_belief', 'audience_belief',
  'author_intent', 'rumor', 'lie', 'memory', 'prediction',
]);

/** A structured fact about the world — a subject/predicate/object triple. */
export interface TruthFact {
  id: string;
  proposition: string;
  subject: string;
  predicate: string;
  object: string;
  status: string;
  canonTier: string;
  epistemicLayer: string;
  confidence: number;
  evidenceIds: string[];
  causedByEventIds: string[];
  firstTrueAtStep: number;
  validFromStep: number;
  validUntilStep: number | null; // null = still valid
  visibleToPlayer: boolean;
}

/** A detected contradiction between two facts. */
export interface Contradiction {
  factAId: string;
  factBId: string;
  subject: string;
  predicate: string;
  reason: string;
  overlappingInterval: [number, number];
  epistemicLayer: string;
}

export interface AddFactOptions {
  step?: number;
  status?: string;
  canonTier?: string;
  subject?: string;
  predicate?: string;
  obj?: string;
  epistemicLayer?: string;
  confidence?: number;
  validFromStep?: number | null;
  validUntilStep?: number | null;
  causedBy?: string[];
  evidenceIds?: string[];
}

const OVERLAP_INF = 1_000_000_000; // 10**9, matching OWNE

export class TruthLedger {
  private facts: Map<string, TruthFact> = new Map();
  private nextId = 1;
  // Events that explain state transitions — keyed by `${subject}${predicate}`.
  private transitionEvents: Map<string, string[]> = new Map();

  private static transitionKey(subject: string, predicate: string): string {
    return `${subject}${predicate}`;
  }

  /** Add a new truth fact. Returns the created TruthFact. */
  add(proposition: string, opts: AddFactOptions = {}): TruthFact {
    const step = opts.step ?? 0;
    const fid = `T${String(this.nextId).padStart(4, '0')}`;
    this.nextId += 1;
    const fact: TruthFact = {
      id: fid,
      proposition,
      subject: opts.subject ?? '',
      predicate: opts.predicate ?? '',
      object: opts.obj ?? '',
      status: opts.status ?? 'true',
      canonTier: opts.canonTier ?? 'hard_canon',
      epistemicLayer: opts.epistemicLayer ?? 'objective_world',
      confidence: opts.confidence ?? 1.0,
      firstTrueAtStep: step,
      validFromStep: opts.validFromStep != null ? opts.validFromStep : step,
      validUntilStep: opts.validUntilStep ?? null,
      causedByEventIds: opts.causedBy ? [...opts.causedBy] : [],
      evidenceIds: opts.evidenceIds ? [...opts.evidenceIds] : [],
      visibleToPlayer: false,
    };
    this.facts.set(fid, fact);
    return fact;
  }

  /** Set validUntilStep on a fact, ending its validity interval. */
  expire(factId: string, step: number): TruthFact | null {
    const fact = this.facts.get(factId);
    if (fact != null) {
      fact.validUntilStep = step;
      return fact;
    }
    return null;
  }

  /** Register an event that explains a state transition for a subject/predicate. */
  registerTransitionEvent(subject: string, predicate: string, eventId: string): void {
    const key = TruthLedger.transitionKey(subject, predicate);
    const list = this.transitionEvents.get(key);
    if (list) {
      list.push(eventId);
    } else {
      this.transitionEvents.set(key, [eventId]);
    }
  }

  /** Read-only view of registered transition events for a subject/predicate. */
  transitionEventsFor(subject: string, predicate: string): string[] {
    return [...(this.transitionEvents.get(TruthLedger.transitionKey(subject, predicate)) ?? [])];
  }

  /** Get a fact by ID. */
  get(factId: string): TruthFact | null {
    return this.facts.get(factId) ?? null;
  }

  /** Query facts by status, canon tier, epistemic layer, subject, predicate. */
  query(filters: {
    status?: string;
    canonTier?: string;
    epistemicLayer?: string;
    subject?: string;
    predicate?: string;
  } = {}): TruthFact[] {
    let results = [...this.facts.values()];
    if (filters.status != null) results = results.filter((f) => f.status === filters.status);
    if (filters.canonTier != null) results = results.filter((f) => f.canonTier === filters.canonTier);
    if (filters.epistemicLayer != null) results = results.filter((f) => f.epistemicLayer === filters.epistemicLayer);
    if (filters.subject != null) results = results.filter((f) => f.subject === filters.subject);
    if (filters.predicate != null) results = results.filter((f) => f.predicate === filters.predicate);
    return results;
  }

  /**
   * FactTrack temporal contradiction detection.
   * Same subject+predicate, incompatible object, same epistemic layer,
   * overlapping validity intervals, and no explaining transition event.
   */
  detectContradictions(): Contradiction[] {
    const contradictions: Contradiction[] = [];

    // Group facts by (subject, predicate, epistemic_layer). Preserve insertion
    // order of both groups and members to match Python dict/list iteration.
    const groups = new Map<string, TruthFact[]>();
    for (const fact of this.facts.values()) {
      if (!fact.subject || !fact.predicate) continue;
      const key = `${fact.subject}${fact.predicate}${fact.epistemicLayer}`;
      const g = groups.get(key);
      if (g) g.push(fact);
      else groups.set(key, [fact]);
    }

    for (const groupFacts of groups.values()) {
      for (let i = 0; i < groupFacts.length; i++) {
        for (let j = i + 1; j < groupFacts.length; j++) {
          const a = groupFacts[i];
          const b = groupFacts[j];

          // Condition 2: incompatible objects
          if (a.object === b.object) continue;

          // Condition 4: overlapping validity intervals
          const overlap = TruthLedger.intervalOverlap(
            a.validFromStep, a.validUntilStep,
            b.validFromStep, b.validUntilStep,
          );
          if (overlap === null) continue;

          // Condition 5: no event explaining the transition
          const tKey = TruthLedger.transitionKey(a.subject, a.predicate);
          const events = this.transitionEvents.get(tKey);
          if (events && events.length > 0) continue;

          contradictions.push({
            factAId: a.id,
            factBId: b.id,
            subject: a.subject,
            predicate: a.predicate,
            reason:
              `Incompatible objects '${a.object}' vs '${b.object}' ` +
              `in layer '${a.epistemicLayer}' with overlapping validity ` +
              `[${overlap[0]},${overlap[1]}] and no transition event`,
            overlappingInterval: overlap,
            epistemicLayer: a.epistemicLayer,
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Compute overlap of two intervals. A null end means "still valid"
   * (treated as +inf). Returns [start, end] or null if no overlap.
   */
  static intervalOverlap(
    aStart: number, aEnd: number | null,
    bStart: number, bEnd: number | null,
  ): [number, number] | null {
    const aEffEnd = aEnd != null ? aEnd : OVERLAP_INF;
    const bEffEnd = bEnd != null ? bEnd : OVERLAP_INF;
    const overlapStart = Math.max(aStart, bStart);
    const overlapEnd = Math.min(aEffEnd, bEffEnd);
    if (overlapStart <= overlapEnd) return [overlapStart, overlapEnd];
    return null;
  }

  /** Retcon a fact — change its status and reset first-true step. */
  retcon(factId: string, newStatus: string, step: number): TruthFact | null {
    const fact = this.facts.get(factId);
    if (fact != null) {
      fact.status = newStatus;
      fact.firstTrueAtStep = step;
      return fact;
    }
    return null;
  }

  /** Advance a fact to the next canon tier in the hierarchy. */
  promote(factId: string): TruthFact | null {
    const fact = this.facts.get(factId);
    if (fact == null) return null;
    const currentIdx = CANON_TIERS.indexOf(fact.canonTier);
    if (currentIdx >= 0 && currentIdx < CANON_TIERS.length - 1) {
      fact.canonTier = CANON_TIERS[currentIdx + 1];
    }
    return fact;
  }

  /** Number of facts in the ledger. */
  count(): number {
    return this.facts.size;
  }
}
