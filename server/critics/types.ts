// Writers' Room & Multi-Agent Critique System Types (Items 31–40)

export type CriticCategory = 'pacing' | 'character' | 'dialogue' | 'structure' | 'brevity';
export type CriticSeverity = 'blocking' | 'major' | 'stylistic' | 'nitpick';

export interface CriticSuggestion {
  id: string;
  targetLine: number;
  originalText: string;
  proposedText: string;
  rationale: string;
  accepted?: boolean;
}

export interface SingleCriticResult {
  criticId: string;
  criticName: string;
  persona: string;
  category: CriticCategory;
  severity: CriticSeverity;
  score: number; // 0-100
  summary: string;
  suggestions: CriticSuggestion[];
  timestamp: number;
}

export interface WritersRoomConsensus {
  overallScore: number;
  categoryScores: Record<CriticCategory, number>;
  agreementRate: number; // 0-100%
  critics: SingleCriticResult[];
  consensusSummary: string;
  debateTimeline: Array<{
    turn: number;
    criticName: string;
    comment: string;
    resolved: boolean;
  }>;
}

export interface CustomCriticPersona {
  id: string;
  name: string;
  category: CriticCategory;
  severityBias: CriticSeverity;
  systemPrompt: string;
  tone: 'rigorous' | 'encouraging' | 'cynical' | 'academic';
}
