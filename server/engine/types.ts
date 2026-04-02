export interface Character {
  char_id: string;
  name: string;
  public_mask: string;
  hidden_motive: string;
}

export interface CharacterState {
  char_id: string;
  current_location_id: string;
  base_suspicion_score: number;
  is_alive: boolean;
}

export interface KnowledgeLedgerEntry {
  knowledge_id: string;
  char_id: string;
  fact_description: string;
  acquired_at: number;
}

export interface Location {
  location_id: string;
  name: string;
  description: string;
  adjacent_locations: string[];
}

export interface ActionLogEntry {
  action_id: string;
  timestamp: number;
  char_id: string;
  location_id: string;
  action_type: 'SPEAK' | 'EXAMINE' | 'LIE' | 'RELOCATE';
  target_char_id: string | null;
  content: string;
  is_audible: boolean;
}

// Combined sheet for frontend and easy access
export interface CharacterSheet {
  char_id: string;
  name: string;
  public_mask: string;
  hidden_motive: string;
  knowledge_vector: string[];
  current_location_id: string;
  suspicion_score: number;
  is_alive: boolean;
}

export interface NarrativeAction {
  action_type: 'SPEAK' | 'EXAMINE' | 'LIE' | 'RELOCATE';
  content: string;
  target: string | null;
}
