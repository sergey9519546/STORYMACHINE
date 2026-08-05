export type RiskCategory = 'A' | 'B' | 'C';

export interface IntentParseResult {
  action: string;
  object?: string;
  speaker?: string;
  line?: string;
  intent: string;
  possibleStateEffects: string[];
  riskCategory: RiskCategory;
}

export interface StateDeltaCard {
  action: string;
  dialogue?: string;
  effects: string[];
  requiresConfirmation: boolean;
}
