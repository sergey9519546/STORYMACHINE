import Database from 'better-sqlite3';
import type { CharacterSheet, Location, ActionLogEntry, NarrativeAction, KnowledgeLedgerEntry } from './types.ts';
import { randomUUID } from 'crypto';
import { safeJsonParse } from "../../src/lib/json.ts";

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
          char_id TEXT REFERENCES Characters(char_id),
          current_location_id TEXT REFERENCES Locations(location_id),
          base_suspicion_score REAL DEFAULT 0.0,
          is_alive INTEGER DEFAULT 1,
          PRIMARY KEY (char_id)
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
    `);
  }

  public addAgent(agent: CharacterSheet) {
    const stmtChar = this.db.prepare(`
      INSERT OR REPLACE INTO Characters (char_id, name, public_mask, hidden_motive)
      VALUES (?, ?, ?, ?)
    `);
    stmtChar.run(agent.char_id, agent.name, agent.public_mask, agent.hidden_motive);

    const stmtState = this.db.prepare(`
      INSERT OR REPLACE INTO Character_State (char_id, current_location_id, base_suspicion_score, is_alive)
      VALUES (?, ?, ?, ?)
    `);
    stmtState.run(agent.char_id, agent.current_location_id, agent.suspicion_score, agent.is_alive ? 1 : 0);

    const stmtKnowledge = this.db.prepare(`
      INSERT OR REPLACE INTO Knowledge_Ledger (knowledge_id, char_id, fact_description, acquired_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const fact of agent.knowledge_vector) {
      stmtKnowledge.run(randomUUID(), agent.char_id, fact, Date.now());
    }
  }

  public getAgent(char_id: string): CharacterSheet | undefined {
    const charRow = this.db.prepare('SELECT * FROM Characters WHERE char_id = ?').get(char_id) as any;
    if (!charRow) return undefined;

    const stateRow = this.db.prepare('SELECT * FROM Character_State WHERE char_id = ?').get(char_id) as any;
    const knowledgeRows = this.db.prepare('SELECT * FROM Knowledge_Ledger WHERE char_id = ?').all(char_id) as any[];

    return {
      char_id: charRow.char_id,
      name: charRow.name,
      public_mask: charRow.public_mask,
      hidden_motive: charRow.hidden_motive,
      current_location_id: stateRow.current_location_id,
      suspicion_score: stateRow.base_suspicion_score,
      is_alive: stateRow.is_alive === 1,
      knowledge_vector: knowledgeRows.map(k => k.fact_description)
    };
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

  public updateAgentSuspicion(char_id: string, score: number) {
    this.db.prepare('UPDATE Character_State SET base_suspicion_score = ? WHERE char_id = ?').run(score, char_id);
  }

  public updateAgentLocation(char_id: string, location_id: string) {
    this.db.prepare('UPDATE Character_State SET current_location_id = ? WHERE char_id = ?').run(location_id, char_id);
  }

  public getAgentsInLocation(location_id: string): CharacterSheet[] {
    const stateRows = this.db.prepare('SELECT char_id FROM Character_State WHERE current_location_id = ?').all(location_id) as any[];
    return stateRows.map(row => this.getAgent(row.char_id)!).filter(Boolean);
  }

  public getAllAgents(): CharacterSheet[] {
    const charRows = this.db.prepare('SELECT char_id FROM Characters').all() as any[];
    return charRows.map(row => this.getAgent(row.char_id)!).filter(Boolean);
  }

  public addLocation(loc: Location) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO Locations (location_id, name, description, adjacent_locations)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(
      loc.location_id,
      loc.name,
      loc.description,
      JSON.stringify(loc.adjacent_locations)
    );
  }

  public getLocation(location_id: string): Location | undefined {
    const row = this.db.prepare('SELECT * FROM Locations WHERE location_id = ?').get(location_id) as any;
    if (!row) return undefined;
    return {
      ...row,
      adjacent_locations: safeJsonParse(row.adjacent_locations, [])
    };
  }

  public getAllLocations(): Location[] {
    const rows = this.db.prepare('SELECT * FROM Locations').all() as any[];
    return rows.map(row => ({
      ...row,
      adjacent_locations: safeJsonParse(row.adjacent_locations, [])
    }));
  }

  public recordAction(char_id: string, action: NarrativeAction, location_id: string) {
    const stmt = this.db.prepare(`
      INSERT INTO Action_Log (action_id, timestamp, char_id, location_id, action_type, target_char_id, content, is_audible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      randomUUID(),
      Date.now(),
      char_id,
      location_id,
      action.action_type,
      action.target || null,
      action.content,
      action.action_type !== 'EXAMINE' ? 1 : 0 // EXAMINE is not audible
    );
  }

  public getSensoryFilter(location_id: string, limit: number = 10): ActionLogEntry[] {
    // Returns the recent history of actions that occurred in this specific spatial node AND are audible
    return this.db.prepare('SELECT * FROM Action_Log WHERE location_id = ? AND is_audible = 1 ORDER BY timestamp DESC LIMIT ?').all(location_id, limit).reverse() as ActionLogEntry[];
  }

  public getFullLedger(): ActionLogEntry[] {
    return this.db.prepare('SELECT * FROM Action_Log ORDER BY timestamp ASC').all() as ActionLogEntry[];
  }
}
