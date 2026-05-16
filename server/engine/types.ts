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
  source_event_id?: string;    // action_id of the event that produced this belief
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

// ── OCC Emotion model ────────────────────────────────────────────────────────
// Emotions are deterministic appraisals of events relative to goals.
// Computed by AppraisalEngine — no LLM calls involved.

export type EmotionType = 'neutral' | 'joy' | 'distress' | 'anger' | 'fear' | 'pride' | 'shame';

export interface EmotionState {
  joy: number;               // 0–100: goal achieved, positive surprise
  distress: number;          // 0–100: goal blocked, contradiction discovered
  anger: number;             // 0–100: distress attributed to another agent's action
  anger_target_id?: string;  // char_id the anger is directed at
  fear: number;              // 0–100: anticipated threat, confrontation_imminent
  pride: number;             // 0–100: own successful deception or achievement
  shame: number;             // 0–100: own failure exposed
  dominant: EmotionType;     // whichever dimension exceeds the threshold
  intensity: number;         // overall peak (max of all six dimensions)
  last_updated_at: number;   // turn index of last update
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

  // OCC Emotional state (populated by AppraisalEngine each turn)
  emotionState?: EmotionState;
}

// ── Causal-Epistemic Spine types ─────────────────────────────────────────────

// A discrete truth-claim extracted from one narrative action
export interface EventProposition {
  proposition_id: string;
  event_id: string;           // FK → ActionLogEntry.action_id
  content: string;
  is_lie: boolean;            // Director ground truth; observers see perceived_truth
  asserted_by: string;        // char_id of the speaker/actor
  perceived_truth: boolean;   // what observers believe (always true unless EXAMINE reveals otherwise)
}

// Wraps an ActionLogEntry with its extracted propositions
export interface EventCard {
  event_id: string;           // same UUID as ActionLogEntry.action_id (1:1)
  char_id: string;
  action_type: ActionLogEntry['action_type'];
  content: string;
  location_id: string;
  turn_index: number;
  propositions: EventProposition[];
}

// Directed edge in the belief graph
export type BeliefEdgeType = 'contradicts' | 'supports' | 'supersedes';

export interface BeliefEdge {
  edge_id: string;
  from_belief_id: string;     // the older belief being contradicted/supported
  to_belief_id: string;       // the newer belief that creates the relationship
  edge_type: BeliefEdgeType;
  discovered_by: string;      // char_id holding both beliefs
  source_event_id: string;    // the event that revealed this relationship
  turn_index: number;
  severity?: number;          // 0–100: product of both beliefs' confidence values
}

// A recorded mutation to a character's goal stack
export type GoalMutationType =
  | 'subgoal_added'
  | 'subgoal_achieved'
  | 'subgoal_blocked'
  | 'terminal_threatened';

export interface GoalMutation {
  mutation_id: string;
  char_id: string;
  turn_index: number;
  trigger_event_id: string;
  trigger_belief_id?: string;
  mutation_type: GoalMutationType;
  description: string;
  old_subgoal?: string;
  new_subgoal?: string;
}

// Director bias signal — biases an agent's next action, never puppets them
// Canonical spec types (UPPERCASE) added alongside legacy snake_case for backward compat.
export type DramaticPressureType =
  | 'confrontation_imminent'
  | 'evidence_against'
  | 'ally_compromised'
  | 'goal_blocked'
  | 'revelation_due'
  | 'CONFRONT'
  | 'WITHHOLD'
  | 'ESCALATE'
  | 'COOL'
  | 'REDIRECT'
  | 'REVEAL';

export interface DramaticPressure {
  pressure_id: string;
  target_char_id: string;
  source_char_id?: string;    // who created this pressure (undefined = situational)
  trigger_event_id: string;
  pressure_type: DramaticPressureType;
  intensity: number;          // 0–100
  bias_hint: string;          // natural-language context injected into the agent prompt
  expires_at_turn: number;    // pressure dissipates after this turn index
  applied: boolean;           // true once injected into a prompt
}

// Causal record of one significant narrative beat
export type BeatType =
  | 'inciting_action'
  | 'contradiction_discovered'
  | 'goal_mutated'
  | 'pressure_applied'
  | 'revelation'
  | 'turning_point';

export type InformationPosition = 'superior' | 'inferior' | 'parity';

export interface BeatTrace {
  beat_id: string;
  turn_index: number;
  location_id: string;
  trigger_event_id: string;
  beat_type: BeatType;
  participants: string[];          // char_ids
  causal_chain: string[];          // event_ids in causal order (oldest first)
  narrative_summary: string;       // one human-readable sentence
  fountain_hint: string;           // suggested Fountain treatment for the screenplay
  information_position?: InformationPosition; // audience vs characters knowledge state
}

// Returned by updateEpistemics() and evaluateRoom() so Orchestrator can feed CausalSpine
export interface EpistemicUpdate {
  char_id: string;
  new_beliefs: Belief[];                  // freshly merged beliefs (with IDs and source fields set)
  contradiction_detected: boolean;
  contradicted_propositions: string[];    // text of beliefs that were contradicted
  source_event_id?: string;              // primary trigger event for this update
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
  contradicted_propositions: string[];            // text of beliefs the new observations contradict
}

// ── Session snapshot (export / import) ───────────────────────────────────────

export interface StageSnapshot {
  schema_version: number;
  exported_at: number;
  locations: Location[];
  agents: CharacterSheet[];
  action_log: ActionLogEntry[];
  illusion_state: Pick<IllusionState, 'phase' | 'planted_elements' | 'pending_recontextualization'>;
  beat_traces: BeatTrace[];
  belief_edges: BeliefEdge[];
  goal_mutations: GoalMutation[];
}

