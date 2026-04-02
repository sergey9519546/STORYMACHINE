export interface SymbolicState {
  fabula: FabulaState; // The Ground Truth
  syuzhet: SyuzhetState; // The Presentation
}

export interface FabulaState {
  locations: Record<string, LocationState>;
  inventory: Record<string, string[]>; // characterId -> itemIds
  hiddenTraumas: Record<string, string>;
  temporalRules: TemporalRule[];
  causalLinks: CausalLink[];
  setupPayoffLedger: SetupPayoffLedger;
}

export interface LocationState {
  id: string;
  name: string;
  occupants: string[]; // character IDs
  items: string[];
}

export interface TemporalRule {
  id: string;
  condition: string;
  effect: string;
}

export interface SyuzhetState {
  scenes: ScenePresentation[];
  unreliableNarratorScore: number; // 0-100
  activeDissonance: DissonanceMetrics;
}

export interface ScenePresentation {
  id: string;
  fabulaEventIds: string[]; // Which ground truth events are depicted
  narrativeText: string;
  informationPosition: "superior" | "inferior" | "parity";
}

export interface DissonanceMetrics {
  character: number;
  thematic: number;
  epistemic: number;
}

export interface CausalLink {
  id: string;
  causeEventId: string;
  effectEventId: string;
  description: string;
}

export interface SetupPayoffLedger {
  setups: Setup[];
  payoffs: Payoff[];
}

export interface Setup {
  id: string;
  sceneId: string;
  description: string;
  isPaidOff: boolean;
}

export interface Payoff {
  id: string;
  setupId: string;
  sceneId: string;
  description: string;
}

export interface NarrativeStructure {
  framework: "syd_field" | "michael_hauge" | "david_siegel" | "save_the_cat" | "harmon_circle" | "sequence" | "kishotenketsu" | "freytag" | "non_linear" | "rashomon" | "circular" | "hyperlink" | "fabula_syuzhet" | "tv_movie" | "netflix_limited" | "hybrid";
  currentAct: number;
  currentBeat: string;
  completionPercentage: number; // 0-100
}
