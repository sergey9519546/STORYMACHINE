export interface NCP {
  world: WorldContext;
  characters: Record<string, CharacterContext>;
  narrativeArc: NarrativeArcContext;
  rules: RulesContext;
}

export interface WorldContext {
  geography: string[];
  sociopoliticalHistory: string[];
  technology: string[];
  magicSystems: string[];
}

export interface CharacterContext {
  id: string;
  name: string;
  consciousWant: string;
  unconsciousNeed: string;
  defenseMechanisms: string[];
  speechPatterns: {
    vocabulary: string;
    sentenceLength: string;
    verbalTics: string[];
  };
  shadowMirrors: string[]; // IDs of antagonists reflecting the protagonist
}

export interface NarrativeArcContext {
  bottleneckBeats: BottleneckBeat[];
  throughlines: FourThroughlines;
}

export interface BottleneckBeat {
  id: string;
  name: string; // e.g., "Inciting Incident", "Midpoint"
  description: string;
  isResolved: boolean;
}

export interface FourThroughlines {
  objectiveStory: Throughline;
  mainCharacter: Throughline;
  influenceCharacter: Throughline;
  relationshipStory: Throughline;
}

export interface Throughline {
  domain: string;
  concern: string;
  issue: string;
  problem: string;
  signposts: Signpost[]; // 4 signposts for 16-point matrix
}

export interface Signpost {
  id: string;
  name: string;
  description: string;
  status: "pending" | "active" | "completed";
}

export interface RulesContext {
  diegetic: string[];
  nonDiegetic: string[];
}
