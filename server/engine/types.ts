// ── Core entity types ────────────────────────────────────────────────────────

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

export interface NarrativeAction {
  action_type: 'SPEAK' | 'EXAMINE' | 'LIE' | 'RELOCATE';
  content: string;
  target: string | null;
}

// ── Psychology substrate ─────────────────────────────────────────────────────

export type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'anxious_avoidant';

export type DefenseMechanism =
  | 'rationalization'
  | 'intellectualization'
  | 'projection'
  | 'displacement'
  | 'denial'
  | 'dissociation'
  | 'repression';

export interface DarkTriad {
  machiavellianism: number; // 0–100
  narcissism: number;       // 0–100
  psychopathy: number;      // 0–100
}

export interface BigFive {
  openness: number;          // 0–100
  conscientiousness: number; // 0–100
  extraversion: number;      // 0–100
  agreeableness: number;     // 0–100
  neuroticism: number;       // 0–100
}

// ── Belief / epistemics system ───────────────────────────────────────────────

export type BeliefSource = 'witnessed' | 'told' | 'inferred';

export interface Belief {
  id: string;
  proposition: string;
  confidence: number;          // 0–1: witnessed≈1.0, told≈0.7, inferred≈0.4
  source: BeliefSource;
  source_agent_id?: string;    // who told me this
  acquired_at: number;         // turn index
  contradicts?: string[];      // IDs of beliefs this contradicts
}

export interface TheoryOfMind {
  subject_id: string;
  believed_knowledge: string[];  // what I think they know
  believed_motive: string;       // my model of their goal
  trust_level: number;           // 0–1
}

// ── Goal system ──────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  description: string;
  value: number;    // importance 0–100
  achieved: boolean;
}

export interface GoalStack {
  terminal: Goal;          // the final objective
  instrumental: Goal[];    // current subgoals toward terminal
  last_planned_at: number; // turn index when last replanned
}

// ── Cognitive illusion tracking (The Prestige structure) ────────────────────

export interface IllusionElement {
  description: string;
  turn_index: number;
  is_load_bearing: boolean;
  revealed_at?: number;
}

export interface IllusionState {
  phase: 'Setup' | 'Turn' | 'Prestige';
  planted_elements: IllusionElement[];
  pending_recontextualization: string[];
  total_turns: number;
}

// ── Combined character sheet (full runtime state) ────────────────────────────
// New psychology/belief fields are optional so existing init payloads still work.

export interface CharacterSheet {
  char_id: string;
  name: string;
  public_mask: string;
  hidden_motive: string;

  // Preserved for backward compatibility — also used as seed for belief graph
  knowledge_vector: string[];

  current_location_id: string;
  suspicion_score: number;
  is_alive: boolean;

  // Psychology (optional — defaults to neutral values in Stage)
  darkTriad?: DarkTriad;
  bigFive?: BigFive;
  attachmentStyle?: AttachmentStyle;
  defenseMechanisms?: DefenseMechanism[];

  // Epistemics (populated by engine after init)
  beliefs?: Belief[];
  theoryOfMind?: Record<string, TheoryOfMind>;
  goalStack?: GoalStack;
}

// ── Director evaluation result ───────────────────────────────────────────────

export interface PerspectiveEvaluation {
  observer_id: string;
  tension_delta: number;                          // –20 to +20
  suspicion_updates: Array<{
    char_id: string;
    delta: number;
    reason: string;
  }>;
  new_beliefs: Array<{
    proposition: string;
    confidence: number;
    source: BeliefSource;
  }>;
  contradiction_detected: boolean;
}
