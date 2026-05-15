import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type {
  CharacterSheet,
  Location,
  ActionLogEntry,
  NarrativeAction,
  Belief,
  TheoryOfMind,
  GoalStack,
  IllusionState,
  DarkTriad,
  BigFive,
  AttachmentStyle,
  DefenseMechanism,
  EventCard,
  EventProposition,
  BeliefEdge,
  GoalMutation,
  DramaticPressure,
  BeatTrace,
} from './types.ts';
import { safeJsonParse } from '../../src/lib/json.ts';

const DEFAULT_DARK_TRIAD: DarkTriad = { machiavellianism: 50, narcissism: 50, psychopathy: 50 };
const DEFAULT_BIG_FIVE: BigFive = { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 };

export class Stage {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Locations (
        location_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        adjacent_locations TEXT
      );

      CREATE TABLE IF NOT EXISTS Characters (
        char_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        public_mask TEXT NOT NULL,
        hidden_motive TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS Character_State (
        char_id TEXT PRIMARY KEY REFERENCES Characters(char_id),
        current_location_id TEXT REFERENCES Locations(location_id),
        base_suspicion_score REAL DEFAULT 0.0,
        is_alive INTEGER DEFAULT 1,
        beliefs_json TEXT NOT NULL DEFAULT '[]',
        theory_of_mind_json TEXT NOT NULL DEFAULT '{}',
        goal_stack_json TEXT,
        dark_triad_json TEXT,
        big_five_json TEXT,
        attachment_style TEXT DEFAULT 'secure',
        defense_mechanisms_json TEXT NOT NULL DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS Knowledge_Ledger (
        knowledge_id TEXT PRIMARY KEY,
        char_id TEXT REFERENCES Characters(char_id),
        fact_description TEXT NOT NULL,
        acquired_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS Action_Log (
        action_id TEXT PRIMARY KEY,
        timestamp INTEGER,
        char_id TEXT REFERENCES Characters(char_id),
        location_id TEXT REFERENCES Locations(location_id),
        action_type TEXT NOT NULL,
        target_char_id TEXT,
        content TEXT NOT NULL,
        is_audible INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS Illusion_State (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        phase TEXT DEFAULT 'Setup',
        planted_elements_json TEXT DEFAULT '[]',
        pending_recontextualization_json TEXT DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS Event_Cards (
        event_id TEXT PRIMARY KEY,
        char_id TEXT REFERENCES Characters(char_id),
        action_type TEXT NOT NULL,
        content TEXT NOT NULL,
        location_id TEXT NOT NULL,
        turn_index INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS Event_Propositions (
        proposition_id TEXT PRIMARY KEY,
        event_id TEXT REFERENCES Event_Cards(event_id),
        content TEXT NOT NULL,
        is_lie INTEGER NOT NULL DEFAULT 0,
        asserted_by TEXT NOT NULL,
        perceived_truth INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS Belief_Edges (
        edge_id TEXT PRIMARY KEY,
        from_belief_id TEXT NOT NULL,
        to_belief_id TEXT NOT NULL,
        edge_type TEXT NOT NULL,
        discovered_by TEXT NOT NULL,
        source_event_id TEXT NOT NULL,
        turn_index INTEGER NOT NULL,
        severity REAL
      );

      CREATE TABLE IF NOT EXISTS Goal_Mutations (
        mutation_id TEXT PRIMARY KEY,
        char_id TEXT REFERENCES Characters(char_id),
        turn_index INTEGER NOT NULL,
        trigger_event_id TEXT NOT NULL,
        trigger_belief_id TEXT,
        mutation_type TEXT NOT NULL,
        description TEXT NOT NULL,
        old_subgoal TEXT,
        new_subgoal TEXT
      );

      CREATE TABLE IF NOT EXISTS Dramatic_Pressure (
        pressure_id TEXT PRIMARY KEY,
        target_char_id TEXT REFERENCES Characters(char_id),
        source_char_id TEXT,
        trigger_event_id TEXT NOT NULL,
        pressure_type TEXT NOT NULL,
        intensity REAL NOT NULL DEFAULT 50,
        bias_hint TEXT NOT NULL,
        expires_at_turn INTEGER NOT NULL,
        applied INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS Beat_Traces (
        beat_id TEXT PRIMARY KEY,
        turn_index INTEGER NOT NULL,
        location_id TEXT NOT NULL,
        trigger_event_id TEXT NOT NULL,
        beat_type TEXT NOT NULL,
        participants_json TEXT NOT NULL DEFAULT '[]',
        causal_chain_json TEXT NOT NULL DEFAULT '[]',
        narrative_summary TEXT NOT NULL,
        fountain_hint TEXT NOT NULL,
        information_position TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_actionlog_location
        ON Action_Log(location_id, is_audible, timestamp);
      CREATE INDEX IF NOT EXISTS idx_knowledge_char
        ON Knowledge_Ledger(char_id);
      CREATE INDEX IF NOT EXISTS idx_charstate_location
        ON Character_State(current_location_id);
      CREATE INDEX IF NOT EXISTS idx_pressure_target
        ON Dramatic_Pressure(target_char_id, applied, expires_at_turn);
      CREATE INDEX IF NOT EXISTS idx_beat_location
        ON Beat_Traces(location_id);
      CREATE INDEX IF NOT EXISTS idx_belief_edges_from
        ON Belief_Edges(from_belief_id);
    `);

    // Seed illusion state if not present
    this.db.prepare(`INSERT OR IGNORE INTO Illusion_State (id) VALUES (1)`).run();
  }

  // ── Location ops ────────────────────────────────────────────────────────────

  public addLocation(loc: Location) {
    this.db.prepare(`
      INSERT OR REPLACE INTO Locations (location_id, name, description, adjacent_locations)
      VALUES (?, ?, ?, ?)
    `).run(loc.location_id, loc.name, loc.description, JSON.stringify(loc.adjacent_locations));
  }

  public getLocation(location_id: string): Location | undefined {
    const row = this.db.prepare('SELECT * FROM Locations WHERE location_id = ?').get(location_id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return { ...(row as Omit<Location, 'adjacent_locations'>), adjacent_locations: safeJsonParse<string[]>(row.adjacent_locations as string, []) };
  }

  public getAllLocations(): Location[] {
    const rows = this.db.prepare('SELECT * FROM Locations').all() as Array<Record<string, unknown>>;
    return rows.map(row => ({ ...(row as Omit<Location, 'adjacent_locations'>), adjacent_locations: safeJsonParse<string[]>(row.adjacent_locations as string, []) }));
  }

  // ── Agent ops ────────────────────────────────────────────────────────────────

  public addAgent(agent: CharacterSheet) {
    this.db.prepare(`
      INSERT OR REPLACE INTO Characters (char_id, name, public_mask, hidden_motive)
      VALUES (?, ?, ?, ?)
    `).run(agent.char_id, agent.name, agent.public_mask, agent.hidden_motive);

    // Seed belief graph from knowledge_vector (each fact becomes a witnessed belief)
    const seedBeliefs: Belief[] = agent.knowledge_vector.map(fact => ({
      id: randomUUID(),
      proposition: fact,
      confidence: 1.0,
      source: 'witnessed' as const,
      acquired_at: 0,
    }));

    // Merge any pre-supplied beliefs with the seeded ones
    const allBeliefs = [...seedBeliefs, ...(agent.beliefs ?? [])];

    this.db.prepare(`
      INSERT OR REPLACE INTO Character_State
        (char_id, current_location_id, base_suspicion_score, is_alive,
         beliefs_json, theory_of_mind_json, goal_stack_json,
         dark_triad_json, big_five_json, attachment_style, defense_mechanisms_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      agent.char_id,
      agent.current_location_id,
      agent.suspicion_score,
      agent.is_alive ? 1 : 0,
      JSON.stringify(allBeliefs),
      JSON.stringify(agent.theoryOfMind ?? {}),
      agent.goalStack ? JSON.stringify(agent.goalStack) : null,
      JSON.stringify(agent.darkTriad ?? DEFAULT_DARK_TRIAD),
      JSON.stringify(agent.bigFive ?? DEFAULT_BIG_FIVE),
      agent.attachmentStyle ?? 'secure',
      JSON.stringify(agent.defenseMechanisms ?? []),
    );

    // Also insert into legacy Knowledge_Ledger for backward compat
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO Knowledge_Ledger (knowledge_id, char_id, fact_description, acquired_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const fact of agent.knowledge_vector) {
      stmt.run(randomUUID(), agent.char_id, fact, Date.now());
    }
  }

  public getAgent(char_id: string): CharacterSheet | undefined {
    const charRow = this.db.prepare('SELECT * FROM Characters WHERE char_id = ?').get(char_id) as Record<string, unknown> | undefined;
    if (!charRow) return undefined;

    const stateRow = this.db.prepare('SELECT * FROM Character_State WHERE char_id = ?').get(char_id) as Record<string, unknown> | undefined;
    if (!stateRow) return undefined;

    const knowledgeRows = this.db.prepare('SELECT * FROM Knowledge_Ledger WHERE char_id = ?').all(char_id) as Array<Record<string, unknown>>;

    return {
      char_id: charRow.char_id as string,
      name: charRow.name as string,
      public_mask: charRow.public_mask as string,
      hidden_motive: charRow.hidden_motive as string,
      current_location_id: stateRow.current_location_id as string,
      suspicion_score: stateRow.base_suspicion_score as number,
      is_alive: (stateRow.is_alive as number) === 1,
      knowledge_vector: knowledgeRows.map(k => k.fact_description as string),
      beliefs: safeJsonParse<Belief[]>(stateRow.beliefs_json as string, []),
      theoryOfMind: safeJsonParse<Record<string, TheoryOfMind>>(stateRow.theory_of_mind_json as string, {}),
      goalStack: stateRow.goal_stack_json
        ? safeJsonParse<GoalStack>(stateRow.goal_stack_json as string, undefined as unknown as GoalStack)
        : undefined,
      darkTriad: safeJsonParse<DarkTriad>(stateRow.dark_triad_json as string, DEFAULT_DARK_TRIAD),
      bigFive: safeJsonParse<BigFive>(stateRow.big_five_json as string, DEFAULT_BIG_FIVE),
      attachmentStyle: (stateRow.attachment_style as AttachmentStyle) ?? 'secure',
      defenseMechanisms: safeJsonParse<DefenseMechanism[]>(stateRow.defense_mechanisms_json as string, []),
    };
  }

  public getAllAgents(): CharacterSheet[] {
    const rows = this.db.prepare('SELECT char_id FROM Characters').all() as Array<{ char_id: string }>;
    return rows.map(r => this.getAgent(r.char_id)).filter((a): a is CharacterSheet => a !== undefined);
  }

  public getAgentsInLocation(location_id: string): CharacterSheet[] {
    const rows = this.db.prepare(
      'SELECT char_id FROM Character_State WHERE current_location_id = ?'
    ).all(location_id) as Array<{ char_id: string }>;
    return rows.map(r => this.getAgent(r.char_id)).filter((a): a is CharacterSheet => a !== undefined);
  }

  // ── Agent state mutations ────────────────────────────────────────────────────

  public updateAgentSuspicion(char_id: string, score: number) {
    this.db.prepare('UPDATE Character_State SET base_suspicion_score = ? WHERE char_id = ?')
      .run(Math.max(0, Math.min(100, score)), char_id);
  }

  public updateAgentLocation(char_id: string, location_id: string) {
    this.db.prepare('UPDATE Character_State SET current_location_id = ? WHERE char_id = ?')
      .run(location_id, char_id);
  }

  public updateAgentKnowledge(char_id: string, newFacts: string[]) {
    const stmt = this.db.prepare(`
      INSERT INTO Knowledge_Ledger (knowledge_id, char_id, fact_description, acquired_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const fact of newFacts) {
      stmt.run(randomUUID(), char_id, fact, Date.now());
    }
  }

  public updateAgentBeliefs(char_id: string, beliefs: Belief[]) {
    this.db.prepare('UPDATE Character_State SET beliefs_json = ? WHERE char_id = ?')
      .run(JSON.stringify(beliefs), char_id);
  }

  public updateTheoryOfMind(char_id: string, tom: Record<string, TheoryOfMind>) {
    this.db.prepare('UPDATE Character_State SET theory_of_mind_json = ? WHERE char_id = ?')
      .run(JSON.stringify(tom), char_id);
  }

  public updateGoalStack(char_id: string, goalStack: GoalStack | null) {
    this.db.prepare('UPDATE Character_State SET goal_stack_json = ? WHERE char_id = ?')
      .run(goalStack ? JSON.stringify(goalStack) : null, char_id);
  }

  // ── Action log ───────────────────────────────────────────────────────────────

  public recordAction(char_id: string, action: NarrativeAction, location_id: string): string {
    const action_id = randomUUID();
    this.db.prepare(`
      INSERT INTO Action_Log (action_id, timestamp, char_id, location_id, action_type, target_char_id, content, is_audible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      action_id,
      Date.now(),
      char_id,
      location_id,
      action.action_type,
      action.target ?? null,
      action.content,
      action.action_type !== 'EXAMINE' ? 1 : 0,
    );
    return action_id;
  }

  public getSensoryFilter(location_id: string, limit: number = 10): ActionLogEntry[] {
    return (this.db.prepare(
      'SELECT * FROM Action_Log WHERE location_id = ? AND is_audible = 1 ORDER BY timestamp DESC LIMIT ?'
    ).all(location_id, limit) as ActionLogEntry[]).reverse();
  }

  public getFullLedger(): ActionLogEntry[] {
    return this.db.prepare('SELECT * FROM Action_Log ORDER BY timestamp ASC').all() as ActionLogEntry[];
  }

  public getTurnCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM Action_Log').get() as { cnt: number };
    return row.cnt;
  }

  // ── Illusion state ───────────────────────────────────────────────────────────

  public getIllusionState(): IllusionState {
    const row = this.db.prepare('SELECT * FROM Illusion_State WHERE id = 1').get() as Record<string, unknown>;
    return {
      phase: (row.phase as IllusionState['phase']) ?? 'Setup',
      planted_elements: safeJsonParse(row.planted_elements_json as string, []),
      pending_recontextualization: safeJsonParse(row.pending_recontextualization_json as string, []),
      total_turns: this.getTurnCount(),
    };
  }

  public updateIllusionState(state: Partial<IllusionState>) {
    const current = this.getIllusionState();
    const next = { ...current, ...state };
    this.db.prepare(`
      UPDATE Illusion_State
      SET phase = ?, planted_elements_json = ?, pending_recontextualization_json = ?
      WHERE id = 1
    `).run(
      next.phase,
      JSON.stringify(next.planted_elements),
      JSON.stringify(next.pending_recontextualization),
    );
  }

  // ── Causal-Epistemic Spine ───────────────────────────────────────────────────

  public recordEventCard(card: Omit<EventCard, 'propositions'>): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO Event_Cards (event_id, char_id, action_type, content, location_id, turn_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(card.event_id, card.char_id, card.action_type, card.content, card.location_id, card.turn_index);
  }

  public addEventPropositions(propositions: EventProposition[]): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO Event_Propositions (proposition_id, event_id, content, is_lie, asserted_by, perceived_truth)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const p of propositions) {
      stmt.run(p.proposition_id, p.event_id, p.content, p.is_lie ? 1 : 0, p.asserted_by, p.perceived_truth ? 1 : 0);
    }
  }

  public getEventPropositions(event_id: string): EventProposition[] {
    const rows = this.db.prepare('SELECT * FROM Event_Propositions WHERE event_id = ?').all(event_id) as Array<Record<string, unknown>>;
    return rows.map(r => ({
      proposition_id: r.proposition_id as string,
      event_id: r.event_id as string,
      content: r.content as string,
      is_lie: (r.is_lie as number) === 1,
      asserted_by: r.asserted_by as string,
      perceived_truth: (r.perceived_truth as number) === 1,
    }));
  }

  public addBeliefEdge(edge: BeliefEdge): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO Belief_Edges (edge_id, from_belief_id, to_belief_id, edge_type, discovered_by, source_event_id, turn_index, severity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(edge.edge_id, edge.from_belief_id, edge.to_belief_id, edge.edge_type, edge.discovered_by, edge.source_event_id, edge.turn_index, edge.severity ?? null);
  }

  private _parseEdgeRow(r: Record<string, unknown>): BeliefEdge {
    return {
      edge_id: r.edge_id as string,
      from_belief_id: r.from_belief_id as string,
      to_belief_id: r.to_belief_id as string,
      edge_type: r.edge_type as BeliefEdge['edge_type'],
      discovered_by: r.discovered_by as string,
      source_event_id: r.source_event_id as string,
      turn_index: r.turn_index as number,
      severity: r.severity != null ? (r.severity as number) : undefined,
    };
  }

  public getBeliefEdgesForBelief(belief_id: string): BeliefEdge[] {
    const rows = this.db.prepare(
      'SELECT * FROM Belief_Edges WHERE from_belief_id = ? OR to_belief_id = ?'
    ).all(belief_id, belief_id) as Array<Record<string, unknown>>;
    return rows.map(r => this._parseEdgeRow(r));
  }

  public getAllBeliefEdges(): BeliefEdge[] {
    const rows = this.db.prepare('SELECT * FROM Belief_Edges ORDER BY turn_index ASC').all() as Array<Record<string, unknown>>;
    return rows.map(r => this._parseEdgeRow(r));
  }

  // All contradiction edges belonging to a specific agent (by discovered_by).
  public getActiveBeliefEdges(char_id: string): BeliefEdge[] {
    const rows = this.db.prepare(
      'SELECT * FROM Belief_Edges WHERE discovered_by = ? ORDER BY turn_index DESC'
    ).all(char_id) as Array<Record<string, unknown>>;
    return rows.map(r => this._parseEdgeRow(r));
  }

  public recordGoalMutation(mutation: GoalMutation): void {
    this.db.prepare(`
      INSERT INTO Goal_Mutations (mutation_id, char_id, turn_index, trigger_event_id, trigger_belief_id,
        mutation_type, description, old_subgoal, new_subgoal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mutation.mutation_id, mutation.char_id, mutation.turn_index, mutation.trigger_event_id,
      mutation.trigger_belief_id ?? null, mutation.mutation_type, mutation.description,
      mutation.old_subgoal ?? null, mutation.new_subgoal ?? null,
    );
  }

  public getGoalMutations(char_id: string): GoalMutation[] {
    const rows = this.db.prepare('SELECT * FROM Goal_Mutations WHERE char_id = ? ORDER BY turn_index ASC').all(char_id) as Array<Record<string, unknown>>;
    return rows.map(r => this._parseGoalMutationRow(r));
  }

  public getAllGoalMutations(): GoalMutation[] {
    const rows = this.db.prepare('SELECT * FROM Goal_Mutations ORDER BY turn_index ASC').all() as Array<Record<string, unknown>>;
    return rows.map(r => this._parseGoalMutationRow(r));
  }

  private _parseGoalMutationRow(r: Record<string, unknown>): GoalMutation {
    return {
      mutation_id: r.mutation_id as string,
      char_id: r.char_id as string,
      turn_index: r.turn_index as number,
      trigger_event_id: r.trigger_event_id as string,
      trigger_belief_id: r.trigger_belief_id as string | undefined,
      mutation_type: r.mutation_type as GoalMutation['mutation_type'],
      description: r.description as string,
      old_subgoal: r.old_subgoal as string | undefined,
      new_subgoal: r.new_subgoal as string | undefined,
    };
  }

  public addDramaticPressure(pressure: DramaticPressure): void {
    this.db.prepare(`
      INSERT INTO Dramatic_Pressure (pressure_id, target_char_id, source_char_id, trigger_event_id,
        pressure_type, intensity, bias_hint, expires_at_turn, applied)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pressure.pressure_id, pressure.target_char_id, pressure.source_char_id ?? null,
      pressure.trigger_event_id, pressure.pressure_type, pressure.intensity,
      pressure.bias_hint, pressure.expires_at_turn, pressure.applied ? 1 : 0,
    );
  }

  public getActivePressures(char_id: string): DramaticPressure[] {
    const currentTurn = this.getTurnCount();
    const rows = this.db.prepare(`
      SELECT * FROM Dramatic_Pressure
      WHERE target_char_id = ? AND applied = 0 AND expires_at_turn > ?
      ORDER BY intensity DESC
    `).all(char_id, currentTurn) as Array<Record<string, unknown>>;
    return rows.map(r => ({
      pressure_id: r.pressure_id as string,
      target_char_id: r.target_char_id as string,
      source_char_id: r.source_char_id as string | undefined,
      trigger_event_id: r.trigger_event_id as string,
      pressure_type: r.pressure_type as DramaticPressure['pressure_type'],
      intensity: r.intensity as number,
      bias_hint: r.bias_hint as string,
      expires_at_turn: r.expires_at_turn as number,
      applied: (r.applied as number) === 1,
    }));
  }

  public markPressureApplied(pressure_id: string): void {
    this.db.prepare('UPDATE Dramatic_Pressure SET applied = 1 WHERE pressure_id = ?').run(pressure_id);
  }

  public addBeatTrace(trace: BeatTrace): void {
    this.db.prepare(`
      INSERT INTO Beat_Traces (beat_id, turn_index, location_id, trigger_event_id, beat_type,
        participants_json, causal_chain_json, narrative_summary, fountain_hint, information_position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trace.beat_id, trace.turn_index, trace.location_id, trace.trigger_event_id,
      trace.beat_type, JSON.stringify(trace.participants), JSON.stringify(trace.causal_chain),
      trace.narrative_summary, trace.fountain_hint, trace.information_position ?? null,
    );
  }

  public getAllBeatTraces(): BeatTrace[] {
    const rows = this.db.prepare('SELECT * FROM Beat_Traces ORDER BY turn_index ASC').all() as Array<Record<string, unknown>>;
    return this._parseBeatRows(rows);
  }

  public getBeatTracesForLocation(location_id: string): BeatTrace[] {
    const rows = this.db.prepare('SELECT * FROM Beat_Traces WHERE location_id = ? ORDER BY turn_index ASC').all(location_id) as Array<Record<string, unknown>>;
    return this._parseBeatRows(rows);
  }

  private _parseBeatRows(rows: Array<Record<string, unknown>>): BeatTrace[] {
    return rows.map(r => ({
      beat_id: r.beat_id as string,
      turn_index: r.turn_index as number,
      location_id: r.location_id as string,
      trigger_event_id: r.trigger_event_id as string,
      beat_type: r.beat_type as BeatTrace['beat_type'],
      participants: safeJsonParse<string[]>(r.participants_json as string, []),
      causal_chain: safeJsonParse<string[]>(r.causal_chain_json as string, []),
      narrative_summary: r.narrative_summary as string,
      fountain_hint: r.fountain_hint as string,
      information_position: r.information_position as BeatTrace['information_position'] ?? undefined,
    }));
  }
}
