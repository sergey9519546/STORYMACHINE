export interface Character {
  name: string;
  ghost: string; // Past trauma
  lie: string; // False belief
  want: string; // External goal
  need: string; // Internal truth
  visualAnchor: string; // Detailed visual description for consistency
  psychology: {
    attachmentStyle: AttachmentStyle;
    darkTriad: DarkTriad;
    formativeWound: string;
    defenseMechanisms: DefenseMechanism[];
    currentDefenseLevel: "low" | "medium" | "high" | "breaking_point";
  };
  speechPattern: {
    vocabulary: string;
    underPressure: string;
  };
}

export type AttachmentStyle = "secure" | "anxious" | "avoidant" | "anxious_avoidant";
export type ChoiceTaxonomy = "didactic" | "reflective" | "exploratory";
export type DefenseMechanism = "rationalization" | "intellectualization" | "projection" | "displacement" | "denial" | "dissociation" | "repression";

export interface DarkTriad {
  machiavellianism: number; // 0-100
  narcissism: number; // 0-100
  psychopathy: number; // 0-100
}

export interface NPCProfile {
  name: string;
  role: string;
  agenda: string;
  trustworthiness: number;
  visualAnchor: string;
}

export interface Secret {
  content: string;
  owner: string;
  revealed: boolean;
}

export interface StoryConfig {
  theme: string;
  backstory?: string;
  format: "film" | "limited_series";
  structure: "save_the_cat" | "dan_harmon" | "john_yorke" | "freytag" | "sequence" | "kishotenketsu";
  directorStyle: "hitchcock" | "fincher" | "nolan" | "villeneuve" | "aster" | "lynch";
  emotionalArc: "rags_to_riches" | "riches_to_rags" | "man_in_a_hole" | "icarus" | "cinderella" | "oedipus";
}

export interface ArcMeter {
  lieBelief: number; // 0-100
  needAwareness: number; // 0-100
  internalConflict: number; // 0-100
}

export interface BigFive {
  openness: number; // 0-100
  conscientiousness: number; // 0-100
  extraversion: number; // 0-100
  agreeableness: number; // 0-100
  neuroticism: number; // 0-100
}

export interface PlayerModel {
  inferredIntent: string;
  engagementLevel: number;
  detectedEmotion: string;
  bigFive: BigFive;
  biometrics: {
    readTimeTrend: "accelerating" | "decelerating" | "stable";
    choiceDeliberationTime: number; // ms
    panelToggleFrequency: number;
  };
}

export interface MemorySystem {
  episodic: string[];
  semantic: string[];
  procedural: string[];
}

export interface QualityValidation {
  passed: boolean;
  sinCheck: string;
  horizonCheck: string;
  subtextGap: boolean; // Is surface meaning different from true meaning?
}

export interface Choice {
  text: string;
  intent: string;
  consequenceScope: "micro" | "macro" | "crisis";
  taxonomy: ChoiceTaxonomy;
  qbnRequirements?: Record<string, number>; // Quality-Based Narrative requirements
}

export interface CinematicComposition {
  cameraAngle: string; // e.g., Dutch angle, low angle
  shotType: string; // e.g., Close-up, wide shot
  lighting: string; // e.g., Chiaroscuro, neon, natural
  colorPalette: string; // e.g., Muted, vibrant, monochromatic
}

export type InformationPosition = "superior" | "inferior" | "parity";

export interface NarrativeMetrics {
  pivotStrength: number; // JSD between emotional distributions
  cliffhangerStrength: number; // Entropy of possible outcomes
  twistImpact: number; // KL divergence
  surprise: number; // -log P(event | context)
  suspense: number; // Entropy of possible upcoming outcomes
}

export interface ThroughlineState {
  objectiveStory: string; // "They"
  mainCharacter: string; // "I"
  influenceCharacter: string; // "You"
  relationshipStory: string; // "We"
  activeThroughlines: ("objectiveStory" | "mainCharacter" | "influenceCharacter" | "relationshipStory")[];
}

export interface DirectorCommentary {
  tensionRationale: string;
  informationPositionRationale: string;
  defenseMechanismRationale: string;
  comicReliefRationale: string;
  throughlineRationale: string;
  cognitiveIllusionRationale?: string;
  cognitiveIllusionPhase?: "Setup" | "Turn" | "Prestige";
  evaluatorScores: {
    ego: number;
    superego: number;
    narrator: number;
    audience: number;
    storymind: number;
  };
}

export interface Scene {
  narrativeText: string;
  dialogue: Array<{
    speaker: string;
    intention: string;
    barrier: string;
    surfaceText: string;
    subtextField: string;
    powerDynamic: string;
  }>;
  imagePrompt: string;
  imageUrl?: string;
  audioDialogue: string;
  audioUrl?: string;
  beat: string;
  composition: CinematicComposition;
  choices: Choice[];
  informationPosition: InformationPosition;
  metrics: NarrativeMetrics;
  commentary: DirectorCommentary;
  isQBNMode?: boolean; // Quality-Based Narrative mode for investigations
  comedyMisdirection?: "clue_delivery" | "false_safety" | "desensitization";
  selectedChoice?: Choice; // The choice that led to this scene (for history)
}

export interface ActiveCodexEntry {
  title: string;
  category: string;
  content: string;
}

export interface DirectorState {
  arcMeter: ArcMeter;
  memory: MemorySystem;
  playerModel: PlayerModel;
  qualityValidation: QualityValidation;
  tensionLevel: number; // 0-100
  menaceGauge: number; // 0-100
  tensionSpace: number; // 0-100
  structuralNode: string;
  unreliableNarratorScore: number; // 0-100
  activeSecrets: Secret[];
  npcs: NPCProfile[];
  throughlines: ThroughlineState;
  qbnQualities: Record<string, number>; // Accumulated qualities for QBN mode
  activeCodexEntries?: ActiveCodexEntry[]; // RAG memory injected into the current scene
}

export interface ScriptBlock {
  id: string;
  type: "scene_heading" | "action" | "character" | "dialogue" | "parenthetical" | "transition";
  text: string;
}

export interface SceneAnalysis {
  composition: CinematicComposition;
  metrics: NarrativeMetrics;
  commentary: DirectorCommentary;
  qualityValidation: QualityValidation;
  informationPosition: InformationPosition;
  comedyMisdirection?: "clue_delivery" | "false_safety" | "desensitization";
  imageUrl?: string;
  audioUrl?: string;
  extractedDialogue?: Array<{
    speaker: string;
    surfaceText: string;
  }>;
  dialogueInconsistencies?: Array<{
    character: string;
    dialogueText: string;
    issue: string;
    suggestion: string;
  }>;
}

export interface EngineState {
  config: StoryConfig;
  protagonist: Character;
  directorState: DirectorState;
  scriptBlocks: ScriptBlock[];
  currentAnalysis?: SceneAnalysis;
  isAnalyzing: boolean;
  isGeneratingMedia: boolean;
}

export interface GameState {
  config: StoryConfig;
  protagonist: Character;
  directorState: DirectorState;
  currentScene: Scene;
  history: Scene[];
  ncpStoryform?: Record<string, unknown>; // Narrative Context Protocol JSON schema
}

export interface ScriptCharacter {
  id: string;
  name: string;
  ghost: string;
  lie: string;
  want: string;
  need: string;
}
