/**
 * Dependency Injection interface for LLM execution environments.
 * This allows the core engine to remain framework-agnostic while
 * integrating with different providers (e.g., @google/genai, OpenAI, local models).
 */
export interface LLMProvider {
  /**
   * Generate raw text from a prompt.
   */
  generateText(prompt: string, options?: LLMOptions): Promise<string>;

  /**
   * Generate structured JSON data adhering to a specific schema.
   */
  generateJSON<T>(prompt: string, schema: any, options?: LLMOptions): Promise<T>;
}

export interface LLMOptions {
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  topP?: number;
  topK?: number;
}

/**
 * The LLMAdapter acts as the bridge between the Story Machine's internal
 * neuro-symbolic logic and the external LLM provider.
 */
export class LLMAdapter {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  /**
   * Generates a scene narrative based on the current context and constraints.
   */
  public async generateSceneNarrative(
    context: string,
    constraints: string[],
    options?: LLMOptions
  ): Promise<string> {
    const prompt = `
[CONTEXT]
${context}

[CONSTRAINTS]
${constraints.map((c) => `- ${c}`).join('\n')}

Generate the next scene narrative adhering strictly to the constraints above.
`;
    return this.provider.generateText(prompt, options);
  }

  /**
   * Evaluates a scene against a specific set of criteria, returning a structured score.
   */
  public async evaluateScene<T>(
    sceneText: string,
    evaluationCriteria: string,
    schema: any,
    options?: LLMOptions
  ): Promise<T> {
    const prompt = `
[SCENE]
${sceneText}

[EVALUATION CRITERIA]
${evaluationCriteria}

Evaluate the scene based on the criteria and return the structured JSON result.
`;
    return this.provider.generateJSON<T>(prompt, schema, options);
  }

  /**
   * Summarizes raw lore/backstory into structured NCP (Narrative Context Protocol) format.
   */
  public async extractContext<T>(
    rawText: string,
    targetSchema: any,
    options?: LLMOptions
  ): Promise<T> {
    const prompt = `
[RAW LORE]
${rawText}

Extract the core semantic value and structure it according to the provided JSON schema.
Ignore irrelevant details and focus on actionable narrative context.
`;
    return this.provider.generateJSON<T>(prompt, targetSchema, options);
  }
}
