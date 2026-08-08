export type RiskCategory = 'A' | 'B' | 'C';

export interface IntentParseResult {
  action: string;
  object?: string;
  speaker?: string;
  line?: string;
  intent: string;
  possibleStateEffects: string[];
  riskCategory: RiskCategory;
  confidenceScore?: number; // 0-100 certainty metric
  dramaticIrony?: boolean; // Audience knows secret that characters do not
  characterBeliefMap?: Record<string, string>; // e.g. { "Mara": "Knows truth", "Eli": "Deceived" }
  suggestionChips?: string[]; // Next-move chips (e.g. "Escalate confrontation")
}

export interface StateDeltaCard {
  action: string;
  dialogue?: string;
  effects: string[];
  requiresConfirmation: boolean;
  confidenceScore?: number;
  dramaticIrony?: boolean;
  characterBeliefMap?: Record<string, string>;
  suggestionChips?: string[];
}

export interface StateBranchNode {
  id: string;
  parentId?: string;
  timestamp: number;
  description: string;
  deltaCard: StateDeltaCard;
  isApplied: boolean;
}
