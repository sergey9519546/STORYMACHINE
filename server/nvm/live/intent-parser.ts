import { generateContent } from '../../engine/ai.ts';
import { Type } from '@google/genai';
import { logger } from '../../lib/logger.ts';
import type { IntentParseResult, StateDeltaCard } from './types.ts';

/**
 * Parses freeform writer intent into a structured IntentParseResult.
 * Determines the risk category (A, B, C) of the action to dictate
 * whether a StateDeltaCard confirmation is required.
 * 
 * Category A: Low risk, ambient action, formatting, minor dialogue (No confirmation)
 * Category B: Medium risk, character belief shift, minor secret (Optional/Soft confirmation)
 * Category C: High risk, major secret revealed, irreversible death, betrayal (Hard confirmation)
 */
export async function parseIntent(userInput: string): Promise<IntentParseResult> {
  const schema = {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, description: "The physical or verbal action occurring." },
      object: { type: Type.STRING, description: "The primary object or subject of the action, if any.", nullable: true },
      speaker: { type: Type.STRING, description: "The character speaking, if applicable.", nullable: true },
      line: { type: Type.STRING, description: "The exact dialogue line, if any.", nullable: true },
      intent: { type: Type.STRING, description: "The underlying dramatic intent or subtext of this move." },
      possibleStateEffects: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "A list of potential state changes this action causes (e.g. 'Mara learns the truth', 'Eli loses the keys')."
      },
      riskCategory: {
        type: Type.STRING,
        enum: ["A", "B", "C"],
        description: "The risk level of the action. A = ambient/minor, B = belief shift, C = major irreversible revelation or state change."
      }
    },
    required: ["action", "intent", "possibleStateEffects", "riskCategory"]
  };

  const prompt = `
You are the Intent Parser for a probabilistic creative sandbox.
The writer has provided an input describing their next move in the story.
Your job is to parse this input into a structured format and assess its risk to the story's state.

Writer Input: "${userInput}"

Analyze the input and return the structured parsing.
`;

  try {
    const response = await generateContent(
      {
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.1
        }
      },
      { label: 'intent_parser' }
    );

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Empty response from AI");
    }

    const parsed = JSON.parse(text) as IntentParseResult;
    return parsed;
  } catch (error) {
    logger.error('intent_parser_failed', { error: (error as Error).message });
    throw error;
  }
}

/**
 * Proposes a State Delta Card if the risk category is high enough.
 */
export function proposeStateDelta(parsed: IntentParseResult): StateDeltaCard | null {
  if (parsed.riskCategory === 'A') {
    return null; // No card needed for ambient actions
  }
  
  return {
    action: parsed.action,
    dialogue: parsed.line,
    effects: parsed.possibleStateEffects,
    requiresConfirmation: parsed.riskCategory === 'C'
  };
}
