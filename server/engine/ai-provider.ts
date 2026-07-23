/**
 * AI Provider Abstraction for StoryMachine
 * Supports free (OpenRouter) and premium (Gemini) providers
 * 
 * Phase 1: FreeRide integration with OpenRouter free models
 */

import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { logger } from '../lib/logger.ts';

// ─────────────────────────────────────────────────────────────────
// Provider Interfaces (compatible with existing ai.ts)
// ─────────────────────────────────────────────────────────────────

export interface AIProvider {
  name: string;
  tier: 'free' | 'premium';
  id: string;
  generate(params: GenerateContentParameters): Promise<GenerateContentResponse>;
  generateStream?(params: GenerateContentParameters): Promise<AsyncIterable<GenerateContentResponse>>;
}

// Helper to extract text from complex Gemini content structures
function extractTextFromContents(contents: any): string {
  const parts: string[] = [];
  
  if (!contents) return '';
  
  const contentsArray = Array.isArray(contents) ? contents : [contents];
  for (const content of contentsArray) {
    // Handle Content objects with parts
    if (typeof content === 'object' && content !== null && 'parts' in content) {
      const partsArray = Array.isArray(content.parts) ? content.parts : [content.parts];
      for (const part of partsArray) {
        if (typeof part === 'object' && part !== null && 'text' in part && typeof part.text === 'string') {
          parts.push(part.text);
        } else if (typeof part === 'string') {
          parts.push(part);
        }
      }
    }
    // Handle direct string content
    else if (typeof content === 'string') {
      parts.push(content);
    }
  }
  
  return parts.join('\n');
}

// ─────────────────────────────────────────────────────────────────
// FREE PROVIDER (Default when OPENROUTER_API_KEY is set)
// ─────────────────────────────────────────────────────────────────

export class FreeRideProvider implements AIProvider {
  name = 'FreeRide (OpenRouter Free Models)';
  tier = 'free' as const;
  id = 'freeride';
  
  private apiKey: string;
  private currentModel: string = 'google/gemma-2-9b-it:free';
  private fallbackModels: string[] = [
    'meta-llama/llama-3.2-3b-instruct:free',
    'qwen/qwen-2.5-7b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'nvidia/llama-3.1-nemotron-70b-instruct:free',
  ];
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY required for free AI. Get one at https://openrouter.ai/keys (no credit card needed)'
      );
    }
    this.apiKey = apiKey;
  }
  
  async generate(params: GenerateContentParameters): Promise<GenerateContentResponse> {
    const models = [params.model || this.currentModel, ...this.fallbackModels];
    
    // Extract text content
    const userPrompt = extractTextFromContents(params.contents);
    
    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: userPrompt }
    ];
    
    // Extract generation config
    const config = params.config;
    const temperature = config?.temperature ?? 0.7;
    const maxTokens = config?.maxOutputTokens ?? 4096;
    const stopSequences = config?.stopSequences;
    
    // Try each model with automatic failover
    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://storymachine.ai',
            'X-Title': 'StoryMachine',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stop: stopSequences,
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          // Rate limit hit - try next model
          if (response.status === 429) {
            logger.warn('openrouter_rate_limit', { model, status: response.status });
            continue;
          }
          throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        // Convert OpenRouter response to Gemini-style response
        const text = data.choices?.[0]?.message?.content || '';
        
        // Create a minimal GenerateContentResponse that matches Gemini's structure
        return {
          candidates: [{
            content: {
              parts: [{ text }],
              role: 'model',
            },
            finishReason: 'STOP',
            safetyRatings: [],
          }],
          usageMetadata: {
            promptTokenCount: data.usage?.prompt_tokens || 0,
            candidatesTokenCount: data.usage?.completion_tokens || 0,
            totalTokenCount: data.usage?.total_tokens || 0,
          },
        } as any as GenerateContentResponse;
      } catch (error) {
        logger.error('openrouter_model_error', { 
          model, 
          error: (error as Error).message 
        });
        // Try next fallback
        continue;
      }
    }
    
    throw new Error('All free models exhausted. Try again in a few minutes or upgrade to premium.');
  }
  
  async generateStream(params: GenerateContentParameters): Promise<AsyncIterable<GenerateContentResponse>> {
    const model = params.model || this.currentModel;
    
    // Extract text content
    const userPrompt = extractTextFromContents(params.contents);
    
    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: userPrompt }
    ];
    
    // Extract generation config
    const config = params.config;
    const temperature = config?.temperature ?? 0.7;
    const maxTokens = config?.maxOutputTokens ?? 4096;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://storymachine.ai',
        'X-Title': 'StoryMachine',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });
    
    if (!response.body) {
      throw new Error('No response body from OpenRouter');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    async function* streamGenerator(): AsyncGenerator<GenerateContentResponse> {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
        
        for (const line of lines) {
          const data = line.replace(/^data: /, '').trim();
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              // Convert to Gemini-style streaming response
              yield {
                candidates: [{
                  content: {
                    parts: [{ text: content }],
                    role: 'model',
                  },
                  finishReason: 'STOP',
                  safetyRatings: [],
                }],
              } as any as GenerateContentResponse;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
    
    return streamGenerator();
  }
}

// ─────────────────────────────────────────────────────────────────
// GEMINI PROVIDER (Premium - refactored from ai.ts)
// ─────────────────────────────────────────────────────────────────

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini (Premium)';
  tier = 'premium' as const;
  id = 'gemini';
  
  private geminiAI: any; // Will be injected from ai.ts to avoid circular deps
  
  constructor(geminiAI: any) {
    if (!geminiAI) {
      throw new Error('GEMINI_API_KEY required for Gemini provider');
    }
    this.geminiAI = geminiAI;
  }
  
  async generate(params: GenerateContentParameters): Promise<GenerateContentResponse> {
    // Use existing Gemini implementation
    return await this.geminiAI.models.generateContent(params);
  }
  
  async generateStream(params: GenerateContentParameters): Promise<AsyncIterable<GenerateContentResponse>> {
    // Use existing Gemini streaming implementation
    return await this.geminiAI.models.generateContentStream(params);
  }
}

// ─────────────────────────────────────────────────────────────────
// PROVIDER MANAGER
// ─────────────────────────────────────────────────────────────────

class AIProviderManager {
  private currentProvider: AIProvider | null = null;
  private providers: Map<string, AIProvider> = new Map();
  
  constructor() {
    // Providers will be registered via registerProvider()
  }
  
  /**
   * Register a provider (called from ai.ts during initialization)
   */
  registerProvider(id: string, provider: AIProvider): void {
    this.providers.set(id, provider);
    
    // Auto-select first provider if none set
    if (!this.currentProvider) {
      this.currentProvider = provider;
    }
  }
  
  /**
   * Set priority order for auto-selection
   * Prefers free provider, falls back to premium
   */
  autoSelectProvider(): void {
    // Priority order: freeride > gemini > others
    const priority = ['freeride', 'gemini'];
    
    for (const id of priority) {
      const provider = this.providers.get(id);
      if (provider) {
        this.currentProvider = provider;
        logger.info('ai_provider_selected', { 
          provider: provider.name, 
          tier: provider.tier 
        });
        return;
      }
    }
    
    // Fall back to any available provider
    const firstProvider = Array.from(this.providers.values())[0];
    if (firstProvider) {
      this.currentProvider = firstProvider;
      logger.info('ai_provider_selected', { 
        provider: firstProvider.name, 
        tier: firstProvider.tier 
      });
    }
  }
  
  /**
   * Get the current active provider
   */
  getProvider(): AIProvider {
    if (!this.currentProvider) {
      throw new Error(
        'No AI providers available. Set OPENROUTER_API_KEY (free) or GEMINI_API_KEY (premium)'
      );
    }
    return this.currentProvider;
  }
  
  /**
   * Check if any provider is available
   */
  hasProvider(): boolean {
    return this.currentProvider !== null && this.providers.size > 0;
  }
  
  /**
   * Manually set the active provider by ID
   */
  setProvider(id: string): void {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider '${id}' not available. Available: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    this.currentProvider = provider;
    logger.info('ai_provider_switched', { 
      provider: provider.name, 
      tier: provider.tier 
    });
  }
  
  /**
   * List all registered providers
   */
  listProviders(): Array<{ id: string; name: string; tier: 'free' | 'premium' }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.name,
      tier: provider.tier,
    }));
  }
  
  /**
   * Get current provider info
   */
  getCurrentProviderInfo(): { id: string; name: string; tier: 'free' | 'premium' } | null {
    if (!this.currentProvider) return null;
    
    // Find the ID for the current provider
    for (const [id, provider] of this.providers.entries()) {
      if (provider === this.currentProvider) {
        return {
          id,
          name: provider.name,
          tier: provider.tier,
        };
      }
    }
    return null;
  }
}

// Singleton instance - will be initialized from ai.ts
export const aiProviderManager = new AIProviderManager();
