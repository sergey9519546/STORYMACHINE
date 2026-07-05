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

// ── Narrative action vocabulary ──────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for the action types an Agent may take. `ActionType`
// is derived from this array; Agent.ts derives both its runtime guard set and
// the LLM response-schema enum from `ACTION_TYPES`.
//
// TO ADD A NEW ACTION TYPE:
//   1. Add the string here — ActionLogEntry / NarrativeAction / EventCard and
//      the LLM schema enum update automatically.
//   2. personality.ts: extend the exhaustive `Record<ActionType, number>` in
//      actionBiasWeights() — the compiler flags the missing key.
//   3. Orchestrator.runTurn(): handle any side effects (cf. the RELOCATE branch).
//   4. CausalSpine.processEvent(): decide whether the action emits an
//      EventProposition (SPEAK / LIE / EXAMINE currently do).
//   5. Stage.recordAction(): set the is_audible flag for the new type.
export const ACTION_TYPES = ['SPEAK', 'EXAMINE', 'LIE', 'RELOCATE', 'WAIT'] as const;
export type ActionType = typeof ACTION_TYPES[number];

export interface ActionLogEntry {
  action_id: string;
  timestamp: number;
  char_id: string;
  location_id: string;
  action_type: ActionType;
  target_char_id: string | null;
  content: string;
  is_audible: boolean;
}

export interface NarrativeAction {
  action_type: ActionType;
  content: string;
  target: string | null;
  // Run 13 (keyless deterministic simulation): true when this action was
  // composed by the rule-based fallback (agent/deterministic.ts) rather than
  // an LLM. Additive — omitted entirely (not just `false`) on every
  // LLM-produced action, so a successful-provider turn's JSON stays
  // byte-identical to pre-Run-13 output. Surfaced by /api/turn's response and
  // /api/run-room-stream's `agent_action` events so the UI can label
  // rule-based turns.
  deterministic?: boolean;
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
  trust_level: number;           // 0–1: general trust/distrust

  // Relationship graph dimensions (all 0–1 unless noted)
  affinity?: number;          // emotional warmth / liking
  power_balance?: number;     // 0=they dominate, 0.5=equal, 1=I dominate
  debt?: number;              // perceived obligation owed to subject (0–1)
  shared_history?: string[];  // memorable joint events shaping this relationship
}

// ── Stakes ───────────────────────────────────────────────────────────────────
// What a character stands to win or lose by the end of the scene.
// Stakes are agent-authored (seeded by the writer or inferred by the Director)
// and read by DirectorNode to calibrate dramatic pressure escalation.

export type StakeCategory = 'freedom' | 'reputation' | 'relationship' | 'survival' | 'secret' | 'material';

export interface Stakes {
  id: string;
  char_id: string;
  category: StakeCategory;
  description: string;   // e.g. "Will lose custody of her daughter"
  magnitude: number;     // 0–100: how much does this matter?
  is_active: boolean;    // false once resolved (won or lost)
  resolved_at?: number;  // turn index when resolved
  outcome?: 'won' | 'lost';
}

// ── Goal system ──────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  description: string;
  value: number;       // importance 0–100
  achieved: boolean;
  depends_on?: string[]; // IDs of sibling goals that must be achieved before this one is actionable
  priority?: number;    // explicit ordering override; higher = more urgent (defaults to value)
}

export interface GoalStack {
  terminal: Goal;          // the final objective
  instrumental: Goal[];    // current subgoals toward terminal
  last_planned_at: number; // turn index when last replanned
}

// ── Cognitive illusion tracking (The Prestige structure) ────────────────────

// The three-act Prestige phase. Drives outline-beat selection and agent prompt
// conditioning. Adding a phase here also requires handling it in
// structure-presets.ts (phase derivation) and Agent.buildEnhancedPrompt.
export type IllusionPhase = 'Setup' | 'Turn' | 'Prestige';

export interface IllusionElement {
  description: string;
  turn_index: number;
  is_load_bearing: boolean;
  revealed_at?: number;
}

// TO ADD A NEW STORY STRUCTURE: extend this union, then add an entry in
//   server/lib/structure-presets.ts STRUCTURE_NAMES and STRUCTURE_BEATS.
export type StoryStructure =
  | 'save_the_cat'
  | 'dan_harmon'
  | 'john_yorke'
  | 'freytag'
  | 'sequence'
  | 'kishotenketsu'
  | 'three_act'
  | 'syd_field'
  | 'rashomon'
  | 'non_linear'
  | 'circular'
  | 'hyperlink'
  | 'fichtean_curve'
  | 'in_media_res'
  | 'snowflake'
  | 'mystery_box'
  | 'closed_circle'
  | 'procedural_case'
  | 'heist_structure'
  | 'trial_structure'
  | 'survival_structure'
  | 'hero_journey';

// TO ADD A NEW EMOTIONAL ARC: extend this union, then add an entry in
//   server/lib/structure-presets.ts ARC_TENSION_CURVES.
export type EmotionalArc =
  | 'rags_to_riches'
  | 'riches_to_rags'
  | 'man_in_a_hole'
  | 'icarus'
  | 'cinderella'
  | 'oedipus'
  | 'flat_tension_baseline'
  | 'sine_wave'
  | 'double_man_in_a_hole'
  | 'tragedy_spiral';

// TO ADD A NEW DIRECTOR STYLE: extend this union, then add an entry in
//   server/lib/structure-presets.ts STYLE_MODIFIERS.
export type DirectorStyle =
  | 'hitchcock'
  | 'fincher'
  | 'nolan'
  | 'villeneuve'
  | 'aster'
  | 'lynch'
  | 'kubrick'
  | 'tarantino'
  | 'scorsese'
  | 'coen_brothers'
  | 'wes_anderson'
  | 'spielberg'
  | 'kurosawa'
  | 'leone'
  | 'malick'
  | 'michael_mann'
  | 'edgar_wright'
  | 'refn'
  | 'eggers'
  | 'bong_joon_ho'
  | 'del_toro'
  | 'gerwig'
  | 'chazelle'
  | 'pta'
  | 'claire_denis'
  | 'almodovar'
  | 'park_chan_wook'
  | 'miyazaki';

// TO ADD A NEW GENRE: extend this union, then add a matching entry in
//   server/lib/genre-router.ts's GENRE_MODIFIERS (toneInstruction, register,
//   forbiddenCliches, emotionalRegister, and the genreRules structural
//   contract — threatType, informationPositionDefault, requiredBehaviors,
//   forbiddenShortcuts) and GENRE_NAMES. genre-router.ts's GenreId is a
//   direct alias of this union (`export type GenreId = StoryGenre`), so the
//   two stay in lockstep by construction — add here first, then there.
// Genre-completion wave (44+ roster): grew from the original 8 through the
// B1-a expansion (20 more) to this 47-genre roster (19 more), spanning the
// highest-coverage real-world submission categories a screenwriting tool
// needs to route tone, vocabulary, and structural contract for.
export type StoryGenre =
  | 'thriller'
  | 'horror'
  | 'drama'
  | 'comedy'
  | 'romance'
  | 'sci_fi'
  | 'noir'
  | 'mystery'
  | 'action'
  | 'adventure'
  | 'crime'
  | 'fantasy'
  | 'western'
  | 'war'
  | 'historical'
  | 'biopic'
  | 'musical'
  | 'family'
  | 'documentary_style'
  | 'heist'
  | 'courtroom'
  | 'survival'
  | 'coming_of_age'
  | 'satire'
  | 'folk_horror'
  | 'cyberpunk'
  | 'gothic'
  | 'melodrama'
  | 'dark_comedy'
  | 'romantic_comedy'
  | 'spy_espionage'
  | 'gangster'
  | 'political_thriller'
  | 'psychological_thriller'
  | 'police_procedural'
  | 'cosmic_horror'
  | 'slasher'
  | 'space_opera'
  | 'time_travel'
  | 'post_apocalyptic'
  | 'urban_fantasy'
  | 'sports_drama'
  | 'disaster'
  | 'road_movie'
  | 'prison_drama'
  | 'noir_comedy'
  | 'superhero';

export interface IllusionState {
  phase: IllusionPhase;
  planted_elements: IllusionElement[];
  pending_recontextualization: string[];
  total_turns: number;
  outline?: OutlineBeat[];      // optional writer-authored beat sheet
  pacing_target?: 'slow' | 'medium' | 'fast';  // writer-set pacing intent
  // Story architecture config (persisted in engine so Director + Agents can read them)
  structure?: StoryStructure;
  emotional_arc?: EmotionalArc;
  director_style?: DirectorStyle;
  expected_turns?: number;      // writer's estimate of total session length for arc curve
  story_theme?: string;         // author-declared thematic statement ("power corrupts", etc.)
  story_genre?: StoryGenre;     // genre routing signal — selects tone/vocabulary/cliché modifiers
}

// ── Persuasion strategy ──────────────────────────────────────────────────────
// Named strategy selected deterministically per target from Big Five + emotion state.
// Recorded to DB so the writer can observe what tactic each character is using.

export type PersuasionStrategy = 'logic' | 'emotion' | 'authority' | 'reciprocity' | 'social_proof';

export interface PersuasionRecord {
  id: string;
  agent_id: string;
  target_id: string;
  strategy: PersuasionStrategy;
  turn: number;
  success?: boolean;  // recorded post-turn: did target's suspicion decrease?
}

// ── Structured story outline ─────────────────────────────────────────────────
// Writer-authored beat sheet, optionally persisted in IllusionState.
// When present, each matching OutlineBeat replaces the generic phase hint in agent prompts.

export interface OutlineBeat {
  phase: IllusionPhase;
  turn_start: number;
  turn_end: number;
  goal: string;        // narrative goal for this beat
  constraint: string;  // what must not happen yet
  avoid: string;       // character behaviors to avoid
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

  // What this character stands to win or lose (populated by Director / writer)
  stakes?: Stakes[];
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

// Director bias signal — biases an agent's next action, never puppets them.
// Canonical spec types (UPPERCASE) added alongside legacy snake_case for backward compat.
//
// TO ADD A NEW PRESSURE TYPE: extend this union, then handle it in
//   - AppraisalEngine.appraise(): the per-pressure OCC emotion appraisal, and
//   - CausalSpine / DirectorNode: wherever the pressure is emitted.
// The agent prompt consumes `bias_hint` generically, so no Agent.ts change is needed.
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

// Causal record of one significant narrative beat.
// TO ADD A NEW BEAT TYPE: extend this union — CausalSpine's
// `Record<BeatType, InformationPosition>` default-position map fails to compile
// until the new type is assigned an information position, so the seam is enforced.
export type BeatType =
  | 'inciting_action'
  | 'contradiction_discovered'
  | 'goal_mutated'
  | 'pressure_applied'
  | 'revelation'
  | 'turning_point'
  | 'defense_activated';

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
  // Run 13: true when this update was produced by the keyless rule-based
  // fallback (agent/deterministic.ts's buildDeterministicEpistemics) rather
  // than an LLM call. Additive — omitted (not `false`) on the LLM path.
  deterministic?: boolean;
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
  // Previously omitted — now included for a lossless round-trip:
  dramatic_pressures: DramaticPressure[];   // live bias signals survive restart
  event_propositions: EventProposition[];   // is_lie ground truth survives restart
  persuasion_log: PersuasionRecord[];       // strategy history survives restart
  illusion_state: Pick<IllusionState,
    | 'phase' | 'planted_elements' | 'pending_recontextualization'
    | 'outline' | 'pacing_target' | 'structure' | 'emotional_arc'
    | 'director_style' | 'expected_turns' | 'story_theme' | 'story_genre'>;
  beat_traces: BeatTrace[];
  belief_edges: BeliefEdge[];
  goal_mutations: GoalMutation[];
  stakes?: Stakes[];                        // active stakes survive restart
}

