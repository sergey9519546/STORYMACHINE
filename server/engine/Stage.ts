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
        pending_recontextualization_json TEXT DEFAULT '[]',
        total_turns INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_actionlog_location
        ON Action_Log(location_id, is_audible, timestamp);
      CREATE INDEX IF NOT EXISTS idx_knowledge_char
        ON Knowledge_Ledger(char_id);
      CREATE INDEX IF NOT EXISTS idx_charstate_location
        ON Character_State(current_location_id);
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

  public recordAction(char_id: string, action: NarrativeAction, location_id: string) {
    this.db.prepare(`
      INSERT INTO Action_Log (action_id, timestamp, char_id, location_id, action_type, target_char_id, content, is_audible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      Date.now(),
      char_id,
      location_id,
      action.action_type,
      action.target ?? null,
      action.content,
      action.action_type !== 'EXAMINE' ? 1 : 0,
    );
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
      total_turns: (row.total_turns as number) ?? 0,
    };
  }

  public updateIllusionState(state: Partial<IllusionState>) {
    const current = this.getIllusionState();
    const next = { ...current, ...state };
    this.db.prepare(`
      UPDATE Illusion_State
      SET phase = ?, planted_elements_json = ?, pending_recontextualization_json = ?, total_turns = ?
      WHERE id = 1
    `).run(
      next.phase,
      JSON.stringify(next.planted_elements),
      JSON.stringify(next.pending_recontextualization),
      next.total_turns,
    );
  }

  public incrementTurnCount() {
    this.db.prepare('UPDATE Illusion_State SET total_turns = total_turns + 1 WHERE id = 1').run();
  }
}
