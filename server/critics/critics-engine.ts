import type { SingleCriticResult, WritersRoomConsensus, CriticCategory, CustomCriticPersona } from './types.ts';
import { analyzeFountainText } from '../nvm/analyze/fountain-analyzer.ts';

export const BUILTIN_CRITICS: Record<string, CustomCriticPersona> = {
  dialogue: {
    id: 'dialogue-doctor',
    name: 'Dialogue Sub-Room Specialist',
    category: 'dialogue',
    severityBias: 'major',
    systemPrompt: 'Audit dialogue for subtext, rhythm, voice distinctiveness, and expositional fat.',
    tone: 'rigorous',
  },
  pacing: {
    id: 'pacing-tension',
    name: 'Pacing & Tension Architect',
    category: 'pacing',
    severityBias: 'blocking',
    systemPrompt: 'Evaluate scene momentum, conflict escalation, and mid-act velocity lulls.',
    tone: 'cynical',
  },
  brevity: {
    id: 'brevity-budget',
    name: 'Brevity & Page Budget Critic',
    category: 'brevity',
    severityBias: 'stylistic',
    systemPrompt: 'Flag over-description, line padding, and redundant action beats.',
    tone: 'academic',
  },
};

export function runSingleCritic(fountain: string, criticId: string): SingleCriticResult {
  const analysis = analyzeFountainText(fountain);
  const persona = BUILTIN_CRITICS[criticId] || BUILTIN_CRITICS['dialogue'];

  let score = 85;
  const suggestions = [];

  if (persona.category === 'dialogue') {
    const subtext = analysis.subtextRatio ?? 0.5;
    score = Math.round(subtext * 100);
    if (subtext < 0.4) {
      suggestions.push({
        id: 'sugg-1',
        targetLine: 12,
        originalText: 'I am so angry at you right now for keeping that secret.',
        proposedText: '(beat)\nYou knew.',
        rationale: 'Subtext ratio low: replace direct exposition with emotional understatement.',
      });
    }
  } else if (persona.category === 'pacing') {
    score = Math.min(100, Math.max(30, 100 - (analysis.sceneCount > 0 ? 10 : 0)));
    suggestions.push({
      id: 'sugg-2',
      targetLine: 28,
      originalText: 'INT. HALLWAY - NIGHT\nJohn walks slowly down the long corridor.',
      proposedText: 'INT. HALLWAY - NIGHT\nJohn sprints down the corridor — feet pounding.',
      rationale: 'Escalate pacing momentum prior to midpoint reversal.',
    });
  } else if (persona.category === 'brevity') {
    const wordDensity = analysis.sceneCount > 0 ? Math.round(analysis.wordCount / analysis.sceneCount) : 0;
    score = wordDensity > 400 ? 65 : 90;
    suggestions.push({
      id: 'sugg-3',
      targetLine: 5,
      originalText: 'A ornate vintage grandfather clock sits silently in the corner of the dimly lit room.',
      proposedText: 'A grandfather clock ticks in the corner.',
      rationale: 'Trim adjective clutter for cleaner screenplay layout.',
    });
  }

  return {
    criticId: persona.id,
    criticName: persona.name,
    persona: persona.systemPrompt,
    category: persona.category,
    severity: persona.severityBias,
    score,
    summary: `${persona.name} evaluated the script and assigned a ${score}/100 rating.`,
    suggestions,
    timestamp: Date.now(),
  };
}

export function computeRoomConsensus(results: SingleCriticResult[]): WritersRoomConsensus {
  if (!results.length) {
    return {
      overallScore: 0,
      categoryScores: { pacing: 0, character: 0, dialogue: 0, structure: 0, brevity: 0 },
      agreementRate: 100,
      critics: [],
      consensusSummary: 'No critics evaluated.',
      debateTimeline: [],
    };
  }

  const sum = results.reduce((a, b) => a + b.score, 0);
  const overallScore = Math.round(sum / results.length);

  const categoryScores: Record<CriticCategory, number> = {
    pacing: 80,
    character: 80,
    dialogue: 80,
    structure: 80,
    brevity: 80,
  };

  results.forEach(r => {
    categoryScores[r.category] = r.score;
  });

  const scores = results.map(r => r.score);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const agreementRate = Math.max(0, 100 - (max - min) * 2);

  return {
    overallScore,
    categoryScores,
    agreementRate,
    critics: results,
    consensusSummary: `Writers' Room consensus reached at ${overallScore}/100 with ${agreementRate}% critic agreement.`,
    debateTimeline: [
      { turn: 1, criticName: 'Dialogue Sub-Room', comment: 'Dialogue rhythm needs more subtext in Act II.', resolved: false },
      { turn: 2, criticName: 'Pacing Architect', comment: 'Agreed on Act II, but scene 4 escalation is solid.', resolved: true },
    ],
  };
}
