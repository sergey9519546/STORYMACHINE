import { GoogleGenAI } from "@google/genai";
import { LLMProvider, LLMOptions } from "./llmAdapter";

export class GeminiProvider implements LLMProvider {
  private ai: GoogleGenAI;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string = "gemini-2.5-pro") {
    this.ai = new GoogleGenAI({ apiKey });
    this.defaultModel = defaultModel;
  }

  public async generateText(prompt: string, options?: LLMOptions): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: this.defaultModel,
      contents: prompt,
      config: {
        systemInstruction: options?.systemInstruction,
        temperature: options?.temperature,
        maxOutputTokens: options?.maxOutputTokens,
        topP: options?.topP,
        topK: options?.topK,
      },
    });

    return response.text || "";
  }

  public async generateJSON<T>(prompt: string, schema: any, options?: LLMOptions): Promise<T> {
    const response = await this.ai.models.generateContent({
      model: this.defaultModel,
      contents: prompt,
      config: {
        systemInstruction: options?.systemInstruction,
        temperature: options?.temperature,
        maxOutputTokens: options?.maxOutputTokens,
        topP: options?.topP,
        topK: options?.topK,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text || "{}";
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      console.error("Failed to parse JSON response:", text);
      throw e;
    }
  }
}
