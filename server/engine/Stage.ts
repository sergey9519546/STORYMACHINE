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
  EmotionState,
  IllusionState,
  OutlineBeat,
  PersuasionRecord,
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
  StageSnapshot,
  Stakes,
  StakeCategory,
} from './types.ts';
import { safeJsonParse } from '../lib/json.ts';

const DEFAULT_DARK_TRIAD: DarkTriad = { machiavellianism: 50, narcissism: 50, psychopathy: 50 };
const DEFAULT_BIG_FIVE: BigFive = { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 };

export class Stage {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    // WAL mode: better concurrent read performance, no "database is locked" errors.
    // NORMAL synchronous: safe for single-process use and avoids full fsync overhead.
    // Skip for :memory: — pragmas don't persist there but the calls are harmless.
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.initSchema();
    this.runMigrations();
  }

  // Release the underlying SQLite handle. For file-backed sessions the data
  // remains on disk and can be re-opened later; for ':memory:' it is discarded.
  public close(): void {
    try { this.db.close(); } catch { /* already closed */ }
  }

  // ── Schema versioning ────────────────────────────────────────────────────────
  // Each entry in MIGRATIONS corresponds to one schema version increment.
  // Applied sequentially from the current user_version onward.
  private runMigrations(): void {
    const current = this.db.pragma('user_version', { simple: true }) as number;
    const MIGRATIONS: Array<() => void> = [
      // v0 → v1: base schema already applied by initSchema (CREATE IF NOT EXISTS).
      () => { /* no-op */ },
      // v1 → v2: OCC emotion state column
      () => { this.db.exec('ALTER TABLE Character_State ADD COLUMN emotion_state_json TEXT'); },
      // v2 → v3: persuasion log + outline column on illusion state
      () => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS Persuasion_Log (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            target_id TEXT NOT NULL,
            strategy TEXT NOT NULL,
            turn INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_persuasion_agent ON Persuasion_Log(agent_id, turn);
        `);
        this.db.exec('ALTER TABLE Illusion_State ADD COLUMN outline_json TEXT');
      },
      // v3 → v4: story architecture config (pacing target, structure, emotional arc, director style)
      () => {
        this.db.exec('ALTER TABLE Illusion_State ADD COLUMN config_json TEXT');
      },
      // v4 → v5: stakes table
      () => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS Stakes (
            id TEXT PRIMARY KEY,
            char_id TEXT NOT NULL REFERENCES Characters(char_id),
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            magnitude REAL NOT NULL DEFAULT 50,
            is_active INTEGER NOT NULL DEFAULT 1,
            resolved_at INTEGER,
            outcome TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_stakes_char ON Stakes(char_id, is_active);
        `);
      },
      // v5 → v6: persuasion outcome tracking
      () => {
        this.db.exec('ALTER TABLE Persuasion_Log ADD COLUMN success INTEGER');
      },
    ];
    for (let i = current; i < MIGRATIONS.length; i++) {
      this.db.transaction(() => {
        MIGRATIONS[i]();
        this.db.pragma(`user_version = ${i + 1}`);
      })();
    }
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

    // Seed belief graph from knowledge_vector (each fact becomes a witnessed belief).
    // Skip seeds whose proposition already appears in agent.beliefs (avoids duplication
    // when re-importing a snapshot that was already seeded on first addAgent call).
    const existingProps = new Set(
      (agent.beliefs ?? []).map(b => b.proposition.toLowerCase()),
    );
    const seedBeliefs: Belief[] = agent.knowledge_vector
      .filter(fact => !existingProps.has(fact.toLowerCase()))
      .map(fact => ({
        id: randomUUID(),
        proposition: fact,
        confidence: 1.0,
        source: 'witnessed' as const,
        acquired_at: 0,
      }));

    // Merge unique seeds with any pre-supplied beliefs
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

  // Maps a merged Characters + Character_State row (plus the agent's knowledge
  // facts) into a CharacterSheet. Shared by getAgent and the batched bulk
  // fetchers so the JSON-column parsing logic lives in exactly one place.
  private _rowToSheet(row: Record<string, unknown>, knowledgeFacts: string[]): CharacterSheet {
    return {
      char_id: row.char_id as string,
      name: row.name as string,
      public_mask: row.public_mask as string,
      hidden_motive: row.hidden_motive as string,
      current_location_id: row.current_location_id as string,
      suspicion_score: row.base_suspicion_score as number,
      is_alive: (row.is_alive as number) === 1,
      knowledge_vector: knowledgeFacts,
      beliefs: (() => {
        const v = safeJsonParse<unknown>(row.beliefs_json as string, []);
        return Array.isArray(v) ? (v as Belief[]) : [];
      })(),
      theoryOfMind: (() => {
        const v = safeJsonParse<unknown>(row.theory_of_mind_json as string, {});
        return (v && typeof v === 'object' && !Array.isArray(v)) ? (v as Record<string, TheoryOfMind>) : {};
      })(),
      goalStack: (() => {
        if (!row.goal_stack_json) return undefined;
        const v = safeJsonParse<unknown>(row.goal_stack_json as string, null);
        if (!v || typeof v !== 'object') return undefined;
        const g = v as Record<string, unknown>;
        if (!g.terminal || !Array.isArray(g.instrumental)) return undefined;
        return v as GoalStack;
      })(),
      darkTriad: (() => {
        const v = safeJsonParse<unknown>(row.dark_triad_json as string, null);
        return (v && typeof v === 'object' && 'machiavellianism' in (v as object)) ? (v as DarkTriad) : DEFAULT_DARK_TRIAD;
      })(),
      bigFive: (() => {
        const v = safeJsonParse<unknown>(row.big_five_json as string, null);
        return (v && typeof v === 'object' && 'openness' in (v as object)) ? (v as BigFive) : DEFAULT_BIG_FIVE;
      })(),
      attachmentStyle: (row.attachment_style as AttachmentStyle) ?? 'secure',
      defenseMechanisms: (() => {
        const v = safeJsonParse<unknown>(row.defense_mechanisms_json as string, []);
        return Array.isArray(v) ? (v as DefenseMechanism[]) : [];
      })(),
      emotionState: (() => {
        const raw = row.emotion_state_json as string | null;
        if (!raw) return undefined;
        const v = safeJsonParse<unknown>(raw, null);
        if (!v || typeof v !== 'object') return undefined;
        const e = v as Record<string, unknown>;
        if (typeof e.dominant !== 'string') return undefined;
        return v as EmotionState;
      })(),
    };
  }

  public getAgent(char_id: string): CharacterSheet | undefined {
    const row = this.db.prepare(`
      SELECT c.*, s.* FROM Characters c
      JOIN Character_State s ON c.char_id = s.char_id
      WHERE c.char_id = ?
    `).get(char_id) as Record<string, unknown> | undefined;
    if (!row) return undefined;

    const knowledgeRows = this.db.prepare(
      'SELECT fact_description FROM Knowledge_Ledger WHERE char_id = ?'
    ).all(char_id) as Array<{ fact_description: string }>;

    return this._rowToSheet(row, knowledgeRows.map(k => k.fact_description));
  }

  // Batched bulk fetch: one JOIN for character+state, one scan for all
  // knowledge facts — replaces the previous N+1 (3 queries per agent).
  private _getAgentsBatched(stateFilter: string, params: unknown[]): CharacterSheet[] {
    const rows = this.db.prepare(`
      SELECT c.*, s.* FROM Characters c
      JOIN Character_State s ON c.char_id = s.char_id
      ${stateFilter}
    `).all(...params) as Array<Record<string, unknown>>;
    if (rows.length === 0) return [];

    // One query for the fetched agents' knowledge facts, grouped in memory.
    // Filter by char_id IN (...) so we don't load knowledge for agents in other locations.
    const charIds = rows.map(r => r.char_id as string);
    const knowledgeByAgent = new Map<string, string[]>();
    if (charIds.length > 0) {
      const placeholders = charIds.map(() => '?').join(',');
      const knowledgeRows = this.db.prepare(
        `SELECT char_id, fact_description FROM Knowledge_Ledger WHERE char_id IN (${placeholders})`
      ).all(...charIds) as Array<{ char_id: string; fact_description: string }>;
      for (const k of knowledgeRows) {
        const list = knowledgeByAgent.get(k.char_id);
        if (list) list.push(k.fact_description);
        else knowledgeByAgent.set(k.char_id, [k.fact_description]);
      }
    }

    return rows.map(r => this._rowToSheet(r, knowledgeByAgent.get(r.char_id as string) ?? []));
  }

  public getAllAgents(): CharacterSheet[] {
    return this._getAgentsBatched('', []);
  }

  public getAgentsInLocation(location_id: string): CharacterSheet[] {
    return this._getAgentsBatched('WHERE s.current_location_id = ?', [location_id]);
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

  public updateEmotionState(char_id: string, emotion: EmotionState) {
    this.db.prepare('UPDATE Character_State SET emotion_state_json = ? WHERE char_id = ?')
      .run(JSON.stringify(emotion), char_id);
  }

  public getRecentGoalMutations(char_id: string, sinceTurn: number): GoalMutation[] {
    // Use a 5-turn lookback window so mutations written by processContradiction
    // and updateEpistemics (which may differ by a turn due to batch ordering) are
    // all visible to the AppraisalEngine in the same invocation.
    return this.db.prepare(
      'SELECT * FROM Goal_Mutations WHERE char_id = ? AND turn_index >= ?'
    ).all(char_id, Math.max(0, sinceTurn - 4)) as GoalMutation[];
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
      (action.action_type !== 'EXAMINE' && action.action_type !== 'WAIT') ? 1 : 0,
    );
    return action_id;
  }

  public getLastActionForAgent(char_id: string): ActionLogEntry | undefined {
    return this.db.prepare(
      'SELECT * FROM Action_Log WHERE char_id = ? ORDER BY rowid DESC LIMIT 1',
    ).get(char_id) as ActionLogEntry | undefined;
  }

  public getSensoryFilter(location_id: string, limit: number = 10): ActionLogEntry[] {
    return (this.db.prepare(
      'SELECT * FROM Action_Log WHERE location_id = ? AND is_audible = 1 ORDER BY rowid DESC LIMIT ?'
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
    const outlineRaw = row.outline_json as string | null;
    // Story architecture config lives in a single JSON blob (config_json) so new
    // fields can be added without a schema migration each time.
    const config = safeJsonParse<Partial<IllusionState>>((row.config_json as string) ?? '{}', {});
    return {
      phase: (row.phase as IllusionState['phase']) ?? 'Setup',
      planted_elements: safeJsonParse(row.planted_elements_json as string, []),
      pending_recontextualization: safeJsonParse(row.pending_recontextualization_json as string, []),
      total_turns: this.getTurnCount(),
      outline: outlineRaw ? safeJsonParse<OutlineBeat[]>(outlineRaw, []) : undefined,
      pacing_target: config.pacing_target,
      structure: config.structure,
      emotional_arc: config.emotional_arc,
      director_style: config.director_style,
      expected_turns: config.expected_turns,
    };
  }

  public updateIllusionState(state: Partial<IllusionState>) {
    // Wrap read-modify-write in a transaction to prevent concurrent callers from
    // interleaving their reads and writes (e.g. two simultaneous Director evaluations).
    this.db.transaction(() => {
      const current = this.getIllusionState();
      const next = { ...current, ...state };
      const config = {
        pacing_target: next.pacing_target,
        structure: next.structure,
        emotional_arc: next.emotional_arc,
        director_style: next.director_style,
        expected_turns: next.expected_turns,
      };
      this.db.prepare(`
        UPDATE Illusion_State
        SET phase = ?, planted_elements_json = ?, pending_recontextualization_json = ?, outline_json = ?, config_json = ?
        WHERE id = 1
      `).run(
        next.phase,
        JSON.stringify(next.planted_elements),
        JSON.stringify(next.pending_recontextualization),
        next.outline ? JSON.stringify(next.outline) : null,
        JSON.stringify(config),
      );
    })();
  }

  public setOutline(beats: OutlineBeat[]): void {
    this.db.prepare('UPDATE Illusion_State SET outline_json = ? WHERE id = 1')
      .run(JSON.stringify(beats));
  }

  // ── Director tension state persistence (survives server restart) ─────────────
  // Stored inside config_json alongside the story architecture fields so no new
  // schema migration is required.

  public getDirectorTensionState(): { accumulator: number; history: number[] } {
    const row = this.db.prepare('SELECT config_json FROM Illusion_State WHERE id = 1').get() as { config_json: string | null } | undefined;
    if (!row) return { accumulator: 50, history: [] };
    const config = safeJsonParse<Record<string, unknown>>(row.config_json ?? '{}', {});
    return {
      accumulator: typeof config.tension_accumulator === 'number' ? config.tension_accumulator : 50,
      history: Array.isArray(config.tension_history) ? config.tension_history as number[] : [],
    };
  }

  public saveDirectorTensionState(accumulator: number, history: number[]): void {
    const row = this.db.prepare('SELECT config_json FROM Illusion_State WHERE id = 1').get() as { config_json: string | null } | undefined;
    if (!row) return;
    const config = safeJsonParse<Record<string, unknown>>(row.config_json ?? '{}', {});
    config.tension_accumulator = accumulator;
    config.tension_history = history;
    this.db.prepare('UPDATE Illusion_State SET config_json = ? WHERE id = 1').run(JSON.stringify(config));
  }

  // ── Persuasion log ──────────────────────────────────────────────────────────

  public recordPersuasion(record: PersuasionRecord): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO Persuasion_Log (id, agent_id, target_id, strategy, turn, success) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(record.id, record.agent_id, record.target_id, record.strategy, record.turn,
      record.success === undefined ? null : (record.success ? 1 : 0));
  }

  public updatePersuasionOutcome(id: string, success: boolean): void {
    this.db.prepare('UPDATE Persuasion_Log SET success = ? WHERE id = ?').run(success ? 1 : 0, id);
  }

  public getPersuasionHistory(agent_id: string, target_id: string, limit = 8): PersuasionRecord[] {
    return (this.db.prepare(
      'SELECT * FROM Persuasion_Log WHERE agent_id = ? AND target_id = ? ORDER BY turn DESC LIMIT ?',
    ).all(agent_id, target_id, limit) as Array<Record<string, unknown>>).map(r => ({
      id: r.id as string,
      agent_id: r.agent_id as string,
      target_id: r.target_id as string,
      strategy: r.strategy as PersuasionRecord['strategy'],
      turn: r.turn as number,
      success: r.success === null || r.success === undefined ? undefined : (r.success as number) === 1,
    }));
  }

  public getLastPersuasionForTarget(agent_id: string, target_id: string): PersuasionRecord | undefined {
    return this.db.prepare(
      'SELECT * FROM Persuasion_Log WHERE agent_id = ? AND target_id = ? ORDER BY turn DESC LIMIT 1',
    ).get(agent_id, target_id) as PersuasionRecord | undefined;
  }

  public getPersuasionLog(agent_id: string, limit = 10): PersuasionRecord[] {
    return this.db.prepare(
      'SELECT * FROM Persuasion_Log WHERE agent_id = ? ORDER BY turn DESC LIMIT ?',
    ).all(agent_id, limit) as PersuasionRecord[];
  }

  // Most recent persuasion attempt targeting this agent (by ANY agent).
  public getInboundPersuasion(target_id: string): PersuasionRecord | undefined {
    return this.db.prepare(
      'SELECT * FROM Persuasion_Log WHERE target_id = ? ORDER BY turn DESC LIMIT 1',
    ).get(target_id) as PersuasionRecord | undefined;
  }

  public getAllPersuasionLog(): PersuasionRecord[] {
    return this.db.prepare('SELECT * FROM Persuasion_Log ORDER BY turn ASC').all() as PersuasionRecord[];
  }

  public getAllDramaticPressures(): DramaticPressure[] {
    const currentTurn = this.getTurnCount();
    return (this.db.prepare('SELECT * FROM Dramatic_Pressure ORDER BY expires_at_turn ASC').all() as Array<Record<string, unknown>>)
      .filter(r => (r.expires_at_turn as number) > currentTurn)
      .map(r => ({
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

  // INSERT OR IGNORE for snapshot import (addDramaticPressure uses INSERT, not safe for re-import).
  public _insertRawPressure(pressure: DramaticPressure): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO Dramatic_Pressure
        (pressure_id, target_char_id, source_char_id, trigger_event_id,
         pressure_type, intensity, bias_hint, expires_at_turn, applied)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pressure.pressure_id, pressure.target_char_id, pressure.source_char_id ?? null,
      pressure.trigger_event_id, pressure.pressure_type, pressure.intensity,
      pressure.bias_hint, pressure.expires_at_turn, pressure.applied ? 1 : 0,
    );
  }

  public _insertRawPersuasion(record: PersuasionRecord): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO Persuasion_Log (id, agent_id, target_id, strategy, turn)
      VALUES (?, ?, ?, ?, ?)
    `).run(record.id, record.agent_id, record.target_id, record.strategy, record.turn);
  }

  public _insertRawEventProposition(p: EventProposition): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO Event_Propositions
        (proposition_id, event_id, content, is_lie, asserted_by, perceived_truth)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(p.proposition_id, p.event_id, p.content, p.is_lie ? 1 : 0, p.asserted_by, p.perceived_truth ? 1 : 0);
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
    return rows.map(r => this._parsePropositionRow(r));
  }

  private _parsePropositionRow(r: Record<string, unknown>): EventProposition {
    return {
      proposition_id: r.proposition_id as string,
      event_id: r.event_id as string,
      content: r.content as string,
      is_lie: (r.is_lie as number) === 1,
      asserted_by: r.asserted_by as string,
      perceived_truth: (r.perceived_truth as number) === 1,
    };
  }

  // All unexposed lies by a specific agent in a specific location — used by EXAMINE to reveal deception.
  public getUnexposedLiesByAgent(asserted_by: string, location_id: string): EventProposition[] {
    const rows = this.db.prepare(`
      SELECT ep.* FROM Event_Propositions ep
      JOIN Event_Cards ec ON ep.event_id = ec.event_id
      WHERE ep.asserted_by = ? AND ec.location_id = ?
        AND ep.is_lie = 1 AND ep.perceived_truth = 1
      ORDER BY ec.turn_index DESC LIMIT 5
    `).all(asserted_by, location_id) as Array<Record<string, unknown>>;
    return rows.map(r => this._parsePropositionRow(r));
  }

  public setPropositionPerceivedTruth(proposition_id: string, perceived_truth: boolean): void {
    this.db.prepare('UPDATE Event_Propositions SET perceived_truth = ? WHERE proposition_id = ?')
      .run(perceived_truth ? 1 : 0, proposition_id);
  }

  public getAllEventPropositions(): EventProposition[] {
    return (this.db.prepare('SELECT * FROM Event_Propositions').all() as Array<Record<string, unknown>>)
      .map(r => this._parsePropositionRow(r));
  }

  // Returns true if any proposition tied to one of the given event_ids is an
  // unexposed lie — audience knows the ground truth, characters do not.
  public hasUnexposedLiesInChain(eventIds: string[]): boolean {
    if (eventIds.length === 0) return false;
    const placeholders = eventIds.map(() => '?').join(',');
    const row = this.db.prepare(
      `SELECT 1 FROM Event_Propositions WHERE event_id IN (${placeholders}) AND is_lie = 1 AND perceived_truth = 1 LIMIT 1`
    ).get(...eventIds as [string, ...string[]]);
    return row != null;
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

  public getAllActivePressures(): Array<{ char_id: string; pressures: DramaticPressure[] }> {
    const currentTurn = this.getTurnCount();
    const rows = this.db.prepare(`
      SELECT * FROM Dramatic_Pressure
      WHERE applied = 0 AND expires_at_turn > ?
      ORDER BY target_char_id, intensity DESC
    `).all(currentTurn) as Array<Record<string, unknown>>;

    const grouped = new Map<string, DramaticPressure[]>();
    for (const r of rows) {
      const charId = r.target_char_id as string;
      if (!grouped.has(charId)) grouped.set(charId, []);
      grouped.get(charId)!.push({
        pressure_id: r.pressure_id as string,
        target_char_id: charId,
        source_char_id: r.source_char_id as string | undefined,
        trigger_event_id: r.trigger_event_id as string,
        pressure_type: r.pressure_type as DramaticPressure['pressure_type'],
        intensity: r.intensity as number,
        bias_hint: r.bias_hint as string,
        expires_at_turn: r.expires_at_turn as number,
        applied: (r.applied as number) === 1,
      });
    }
    return Array.from(grouped.entries()).map(([char_id, pressures]) => ({ char_id, pressures }));
  }

  // ── Stakes ───────────────────────────────────────────────────────────────────

  public upsertStakes(s: Stakes): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO Stakes (id, char_id, category, description, magnitude, is_active, resolved_at, outcome)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(s.id, s.char_id, s.category, s.description, s.magnitude, s.is_active ? 1 : 0, s.resolved_at ?? null, s.outcome ?? null);
  }

  public getActiveStakes(char_id: string): Stakes[] {
    const rows = this.db.prepare('SELECT * FROM Stakes WHERE char_id = ? AND is_active = 1').all(char_id) as Array<Record<string, unknown>>;
    return rows.map(r => ({
      id: r.id as string,
      char_id: r.char_id as string,
      category: r.category as StakeCategory,
      description: r.description as string,
      magnitude: r.magnitude as number,
      is_active: true,
    }));
  }

  public getAllStakes(): Stakes[] {
    const rows = this.db.prepare('SELECT * FROM Stakes').all() as Array<Record<string, unknown>>;
    return rows.map(r => ({
      id: r.id as string,
      char_id: r.char_id as string,
      category: r.category as StakeCategory,
      description: r.description as string,
      magnitude: r.magnitude as number,
      is_active: Boolean(r.is_active),
      resolved_at: r.resolved_at as number | undefined,
      outcome: r.outcome as Stakes['outcome'] | undefined,
    }));
  }

  public resolveStakes(id: string, outcome: 'won' | 'lost', turnIndex: number): void {
    this.db.prepare('UPDATE Stakes SET is_active = 0, outcome = ?, resolved_at = ? WHERE id = ?')
      .run(outcome, turnIndex, id);
  }

  // ── Session snapshot export / import ─────────────────────────────────────────

  public exportSnapshot(): StageSnapshot {
    return {
      schema_version: this.db.pragma('user_version', { simple: true }) as number,
      exported_at: Date.now(),
      locations: this.getAllLocations(),
      agents: this.getAllAgents(),
      action_log: this.getFullLedger(),
      dramatic_pressures: this.getAllDramaticPressures(),
      event_propositions: this.getAllEventPropositions(),
      persuasion_log: this.getAllPersuasionLog(),
      illusion_state: (() => {
        const s = this.getIllusionState();
        return {
          phase: s.phase,
          planted_elements: s.planted_elements,
          pending_recontextualization: s.pending_recontextualization,
          outline: s.outline,
          pacing_target: s.pacing_target,
          structure: s.structure,
          emotional_arc: s.emotional_arc,
          director_style: s.director_style,
          expected_turns: s.expected_turns,
        };
      })(),
      beat_traces: this.getAllBeatTraces(),
      belief_edges: this.getAllBeliefEdges(),
      goal_mutations: this.getAllGoalMutations(),
    };
  }

  // Restore a snapshot into this (empty) Stage instance.
  // Characters use INSERT OR REPLACE (overwrites existing state).
  // Spine data (edges, mutations, beats) uses INSERT OR IGNORE so partial re-imports are safe.
  public importSnapshot(snap: StageSnapshot): void {
    for (const loc of snap.locations) this.addLocation(loc);
    for (const agent of snap.agents)   this.addAgent(agent);
    for (const entry of snap.action_log) this._insertRawAction(entry);
    this.updateIllusionState(snap.illusion_state);
    for (const edge of snap.belief_edges)          this.addBeliefEdge(edge);
    for (const mut of snap.goal_mutations)         this.recordGoalMutation(mut);
    for (const beat of snap.beat_traces)           this.addBeatTrace(beat);
    for (const p of snap.dramatic_pressures ?? []) this._insertRawPressure(p);
    for (const p of snap.event_propositions ?? []) this._insertRawEventProposition(p);
    for (const p of snap.persuasion_log ?? [])     this._insertRawPersuasion(p);
  }

  private _insertRawAction(entry: ActionLogEntry): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO Action_Log
        (action_id, timestamp, char_id, location_id, action_type, target_char_id, content, is_audible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.action_id, entry.timestamp, entry.char_id, entry.location_id,
      entry.action_type, entry.target_char_id ?? null, entry.content, entry.is_audible ? 1 : 0,
    );
  }
}
