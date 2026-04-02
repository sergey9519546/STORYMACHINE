import { GoogleGenAI } from '@google/genai';
import { Stage } from './Stage.ts';
import type { ActionLogEntry } from './types.ts';
import { safeJsonParse } from "../../src/lib/json.ts";

export class DirectorNode {
  private stage: Stage;
  private _ai: GoogleGenAI | null = null;

  constructor(stage: Stage) {
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

  public async evaluateRoom(location_id: string, recentActions: ActionLogEntry[]) {
    if (recentActions.length === 0) return;

    const agentsInRoom = this.stage.getAgentsInLocation(location_id);
    if (agentsInRoom.length === 0) return;

    const transcript = recentActions.map(a => {
      const agent = this.stage.getAgent(a.char_id);
      return `[${a.action_type}] ${agent?.name || 'Unknown'}: ${a.content}`;
    }).join('\n');

    const agentsContext = agentsInRoom.map(a => 
      `Agent: ${a.name} (ID: ${a.char_id})
      Hidden Motive: ${a.hidden_motive}
      Knowledge Vectors: ${JSON.stringify(a.knowledge_vector)}
      Current Suspicion: ${a.suspicion_score}`
    ).join('\n\n');

    const prompt = `Review the following transcript of recent actions in the room:\n${transcript}\n\n` +
      `Here is the context for the agents in the room:\n${agentsContext}\n\n` +
      `Based on the transcript and the agents' hidden motives and knowledge, evaluate if anyone lied or acted suspiciously. ` +
      `Did any agent's statement contradict another agent's knowledge? ` +
      `Return a JSON array of suspicion updates. For each update, provide the char_id to update, the suspicionDelta (a number between -20 and 20 to add to their score), and a brief reason.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: `You are the Director Node. You analyze transcripts and update the psychological tension (suspicion scores) of the agents based on lies, contradictions, and suspicious behavior.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: "ARRAY" as any,
          items: {
            type: "OBJECT" as any,
            properties: {
              char_id: { type: "STRING" as any },
              suspicionDelta: { type: "INTEGER" as any },
              reason: { type: "STRING" as any }
            },
            required: ['char_id', 'suspicionDelta', 'reason']
          }
        }
      }
    });

    const updates = safeJsonParse(response.text || '[]', []);
    
    for (const update of updates) {
      const agent = this.stage.getAgent(update.char_id);
      if (agent) {
        const newScore = Math.max(0, Math.min(100, agent.suspicion_score + update.suspicionDelta));
        this.stage.updateAgentSuspicion(agent.char_id, newScore);
        console.log(`[Director] Updated ${agent.name} suspicion by ${update.suspicionDelta} -> ${newScore}. Reason: ${update.reason}`);
      }
    }
  }
}
