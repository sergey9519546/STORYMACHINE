import { GoogleGenAI, Type } from '@google/genai';
import type { CharacterSheet, NarrativeAction, ActionLogEntry, Location } from './types.ts';
import { Stage } from './Stage.ts';
import { safeJsonParse } from "../../src/lib/json.ts";

export class Agent {
  private sheet: CharacterSheet;
  private stage: Stage;
  private _ai: GoogleGenAI | null = null;

  constructor(sheet: CharacterSheet, stage: Stage) {
    this.sheet = sheet;
    this.stage = stage;
  }

  private get ai(): GoogleGenAI {
    if (!this._ai) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      this._ai = new GoogleGenAI({ apiKey: key });
    }
    return this._ai;
  }

  public async takeTurn(): Promise<NarrativeAction> {
    const currentNode = this.stage.getLocation(this.sheet.current_location_id);
    if (!currentNode) throw new Error('Agent is in an invalid location');

    const sensoryFilter = this.stage.getSensoryFilter(this.sheet.current_location_id);
    const otherAgents = this.stage.getAgentsInLocation(this.sheet.current_location_id).filter(a => a.char_id !== this.sheet.char_id);

    const prompt = this.buildPrompt(currentNode, sensoryFilter, otherAgents);

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: `You are playing the role of ${this.sheet.name}. You must output a strict JSON object representing your next action.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action_type: { type: Type.STRING, enum: ['SPEAK', 'EXAMINE', 'LIE', 'RELOCATE'] },
            target: { type: Type.STRING, nullable: true, description: 'The name of the character being spoken to, or room moving to.' },
            content: { type: Type.STRING, description: 'The actual dialogue spoken or action taken.' }
          },
          required: ['action_type', 'content']
        }
      }
    });

    const result = safeJsonParse<NarrativeAction>(response.text || '{}', { action_type: 'SPEAK', content: '', target: null });
    
    return {
      action_type: result.action_type,
      target: result.target || null,
      content: result.content
    };
  }

  private buildPrompt(node: Location, history: ActionLogEntry[], otherAgents: CharacterSheet[]): string {
    let historyStr = '';
    if (history.length === 0) {
      historyStr = `(Silence. You are the first to act.)`;
    } else {
      for (const entry of history) {
        const agentName = this.stage.getAgent(entry.char_id)?.name || 'Unknown';
        historyStr += `[${entry.action_type}] ${agentName}: ${entry.content}\n`;
      }
    }

    let prompt = `You are ${this.sheet.name}. Your public persona is: ${this.sheet.public_mask}.
**CRITICAL DIRECTIVE:** Your hidden motive is: ${this.sheet.hidden_motive}. Do not reveal this directly.
You currently know these facts: ${JSON.stringify(this.sheet.knowledge_vector)}. Do not act on outside information.

You are currently in the ${node.name}. Here is what just happened in this room:
${historyStr}

Based on your motives and the current tension, choose your next action and output it strictly in the NarrativeAction JSON schema.`;

    return prompt;
  }

  public async evaluateState(recentActions: ActionLogEntry[]) {
    // State Evaluation Loop (Memory & Suspicion Tracking)
    if (recentActions.length === 0) return;

    const prompt = `Review the following recent actions in your vicinity:\n` +
      recentActions.map(a => `[${a.action_type}] ${this.stage.getAgent(a.char_id)?.name || 'Unknown'}: ${a.content}`).join('\n') +
      `\n\nBased on your Knowledge Vectors (${JSON.stringify(this.sheet.knowledge_vector)}) and Hidden Motive (${this.sheet.hidden_motive}), evaluate if anyone is lying or acting suspiciously.
      Return a JSON object with:
      1. newSuspicionScore: An integer from 0 to 100 representing your current suspicion level.
      2. newKnowledge: Any new facts you have deduced or learned (array of strings). Return an empty array if nothing new.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: `You are evaluating the state of the world as ${this.sheet.name}. Update your internal state based on recent events.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            newSuspicionScore: { type: Type.INTEGER },
            newKnowledge: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['newSuspicionScore', 'newKnowledge']
        }
      }
    });

    const result = safeJsonParse<{ newSuspicionScore: number; newKnowledge: string[] }>(response.text || '{}', { newSuspicionScore: 0, newKnowledge: [] });
    
    if (result.newSuspicionScore !== undefined) {
      this.sheet.suspicion_score = result.newSuspicionScore;
      this.stage.updateAgentSuspicion(this.sheet.char_id, result.newSuspicionScore);
    }
    
    if (result.newKnowledge && result.newKnowledge.length > 0) {
      const existingSet = new Set(this.sheet.knowledge_vector);
      const newFacts = result.newKnowledge.filter((f: string) => !existingSet.has(f));
      if (newFacts.length > 0) {
        this.sheet.knowledge_vector = [...this.sheet.knowledge_vector, ...newFacts];
        this.stage.updateAgentKnowledge(this.sheet.char_id, newFacts);
      }
    }
  }
}
