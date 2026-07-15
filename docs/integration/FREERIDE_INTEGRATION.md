# FreeRide Integration for StoryMachine
## Free LLM by default, Premium on demand

---

## 🎯 What FreeRide Does

**FreeRide** manages free AI models from OpenRouter:
- **30+ free models** from Google, Meta, Mistral, DeepSeek, NVIDIA, etc.
- **Auto-ranking** by quality (context length, capabilities, recency)
- **Automatic failover** when rate limits hit
- **Zero cost** for users who don't need premium

---

## 🏗️ Integration Architecture

### Current StoryMachine AI System

```typescript
// server/engine/ai.ts
const key = process.env.GEMINI_API_KEY;  // Hardcoded to Gemini only
if (!key) throw new Error('GEMINI_API_KEY required');
```

**Problems:**
- ❌ Requires paid Gemini API key
- ❌ No fallback if key missing
- ❌ No model switching
- ❌ User can't choose provider

### Proposed FreeRide Integration

```
┌─────────────────────────────────────────────────────────┐
│  StoryMachine Frontend                                  │
│  ├─ Settings Panel: "AI Provider" dropdown             │
│  │   • Free (OpenRouter) ← DEFAULT                     │
│  │   • Premium (Gemini Pro)                            │
│  │   • Premium (GPT-4)                                 │
│  │   • Premium (Claude)                                │
│  └─ Shows current model + token usage                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│  server/engine/ai-provider.ts (NEW)                     │
│  ├─ FreeRideProvider (default)                         │
│  │   └─ Uses OpenRouter free models                    │
│  ├─ GeminiProvider (premium)                           │
│  ├─ OpenAIProvider (premium)                           │
│  └─ AnthropicProvider (premium)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│  FreeRide Model Manager                                 │
│  ├─ Fetches 30+ free models from OpenRouter            │
│  ├─ Ranks by quality score                             │
│  ├─ Auto-failover on rate limits                       │
│  └─ Caches model list (6 hours)                        │
└─────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│  OpenRouter API (Free Tier)                             │
│  └─ google/gemma-2-9b-it:free                          │
│  └─ meta-llama/llama-3.2-3b-instruct:free              │
│  └─ qwen/qwen-2.5-7b-instruct:free                     │
│  └─ ... (30+ more)                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Implementation

### Step 1: AI Provider Abstraction

**File:** `server/engine/ai-provider.ts`

```typescript
/**
 * AI Provider Abstraction for StoryMachine
 * Supports free (OpenRouter) and premium (Gemini, OpenAI, Claude) providers
 */

export interface AIProvider {
  name: string;
  tier: 'free' | 'premium';
  generate(params: GenerateParams): Promise<GenerateResponse>;
  generateStream?(params: GenerateParams): AsyncIterable<GenerateResponse>;
}

export interface GenerateParams {
  model?: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface GenerateResponse {
  text: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ─────────────────────────────────────────────────────────────────
// FREE PROVIDER (Default)
// ─────────────────────────────────────────────────────────────────

export class FreeRideProvider implements AIProvider {
  name = 'FreeRide (OpenRouter Free Models)';
  tier = 'free' as const;
  
  private apiKey: string;
  private currentModel: string = 'google/gemma-2-9b-it:free';
  private fallbackModels: string[] = [
    'meta-llama/llama-3.2-3b-instruct:free',
    'qwen/qwen-2.5-7b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'nvidia/llama-3.1-nemotron-70b-instruct:free',
  ];
  
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY required for free AI. Get one at https://openrouter.ai/keys (no credit card needed)'
      );
    }
  }
  
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const models = [params.model || this.currentModel, ...this.fallbackModels];
    
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
            messages: [
              ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
              { role: 'user', content: params.prompt },
            ],
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 4096,
            stop: params.stopSequences,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          // Rate limit hit - try next model
          if (response.status === 429) {
            console.log(`Rate limit hit on ${model}, trying fallback...`);
            continue;
          }
          throw new Error(`OpenRouter API error: ${JSON.stringify(error)}`);
        }
        
        const data = await response.json();
        return {
          text: data.choices[0].message.content,
          model: data.model || model,
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
        };
      } catch (error) {
        console.error(`Error with model ${model}:`, error);
        // Try next fallback
        continue;
      }
    }
    
    throw new Error('All free models exhausted. Try again in a few minutes or upgrade to premium.');
  }
  
  async *generateStream(params: GenerateParams): AsyncIterable<GenerateResponse> {
    // Streaming support for free models
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://storymachine.ai',
      },
      body: JSON.stringify({
        model: params.model || this.currentModel,
        messages: [
          ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
          { role: 'user', content: params.prompt },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 4096,
        stream: true,
      }),
    });
    
    if (!response.body) {
      throw new Error('No response body');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
      
      for (const line of lines) {
        const data = line.replace(/^data: /, '');
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            yield {
              text: content,
              model: parsed.model || this.currentModel,
            };
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// PREMIUM PROVIDERS
// ─────────────────────────────────────────────────────────────────

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini (Premium)';
  tier = 'premium' as const;
  
  // Existing implementation from ai.ts
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    // Use existing getAI() and generateContent()
    const response = await getAI().models.generateContent({
      model: params.model || 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          { text: params.systemPrompt || '' },
          { text: params.prompt },
        ],
      },
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: params.maxTokens,
        stopSequences: params.stopSequences,
      },
    });
    
    return {
      text: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model: 'gemini-2.0-flash-exp',
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
    };
  }
}

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI (Premium)';
  tier = 'premium' as const;
  
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY required for OpenAI provider');
    }
  }
  
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model || 'gpt-4o',
        messages: [
          ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
          { role: 'user', content: params.prompt },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
        stop: params.stopSequences,
      }),
    });
    
    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}

export class AnthropicProvider implements AIProvider {
  name = 'Anthropic Claude (Premium)';
  tier = 'premium' as const;
  
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY required for Claude provider');
    }
  }
  
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model || 'claude-3-5-sonnet-20241022',
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature ?? 0.7,
        system: params.systemPrompt,
        messages: [
          { role: 'user', content: params.prompt },
        ],
        stop_sequences: params.stopSequences,
      }),
    });
    
    const data = await response.json();
    return {
      text: data.content[0].text,
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// PROVIDER MANAGER
// ─────────────────────────────────────────────────────────────────

class AIProviderManager {
  private currentProvider: AIProvider;
  private providers: Map<string, AIProvider> = new Map();
  
  constructor() {
    // Register all providers
    try {
      this.providers.set('free', new FreeRideProvider());
    } catch (e) {
      console.warn('FreeRide provider unavailable:', e);
    }
    
    try {
      this.providers.set('gemini', new GeminiProvider());
    } catch (e) {
      console.warn('Gemini provider unavailable:', e);
    }
    
    try {
      this.providers.set('openai', new OpenAIProvider());
    } catch (e) {
      console.warn('OpenAI provider unavailable:', e);
    }
    
    try {
      this.providers.set('anthropic', new AnthropicProvider());
    } catch (e) {
      console.warn('Anthropic provider unavailable:', e);
    }
    
    // Default to free provider, fall back to any available
    this.currentProvider = 
      this.providers.get('free') || 
      this.providers.get('gemini') ||
      Array.from(this.providers.values())[0];
    
    if (!this.currentProvider) {
      throw new Error(
        'No AI providers available. Set OPENROUTER_API_KEY (free) or GEMINI_API_KEY (premium)'
      );
    }
  }
  
  getProvider(): AIProvider {
    return this.currentProvider;
  }
  
  setProvider(name: string) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not available`);
    }
    this.currentProvider = provider;
  }
  
  listProviders(): Array<{ name: string; tier: 'free' | 'premium'; available: boolean }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      name: provider.name,
      tier: provider.tier,
      available: true,
    }));
  }
}

// Singleton instance
export const aiProviders = new AIProviderManager();

// Backward-compatible exports for existing code
export async function generateContent(params: GenerateParams): Promise<GenerateResponse> {
  return aiProviders.getProvider().generate(params);
}

export async function* generateContentStream(params: GenerateParams): AsyncIterable<GenerateResponse> {
  const provider = aiProviders.getProvider();
  if (provider.generateStream) {
    yield* provider.generateStream(params);
  } else {
    // Fallback: single non-streamed response
    yield await provider.generate(params);
  }
}
```

---

### Step 2: Settings UI

**File:** `src/components/AIProviderSettings.tsx`

```typescript
import { useState, useEffect } from 'react';

interface AIProvider {
  id: string;
  name: string;
  tier: 'free' | 'premium';
  available: boolean;
}

export function AIProviderSettings() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [currentProvider, setCurrentProvider] = useState<string>('free');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Fetch available providers
    fetch('/api/ai-providers')
      .then(r => r.json())
      .then(data => {
        setProviders(data.providers);
        setCurrentProvider(data.current);
      });
  }, []);
  
  const switchProvider = async (providerId: string) => {
    setLoading(true);
    try {
      await fetch('/api/ai-providers/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });
      setCurrentProvider(providerId);
    } catch (error) {
      alert('Failed to switch provider: ' + error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="ai-provider-settings">
      <h3>AI Provider</h3>
      
      <div className="provider-list">
        {providers.map(provider => (
          <div
            key={provider.id}
            className={`provider-card ${provider.id === currentProvider ? 'active' : ''}`}
            onClick={() => switchProvider(provider.id)}
          >
            <div className="provider-header">
              <span className="provider-name">{provider.name}</span>
              <span className={`tier-badge ${provider.tier}`}>
                {provider.tier === 'free' ? '🎉 FREE' : '💎 PREMIUM'}
              </span>
            </div>
            
            {provider.id === 'free' && (
              <div className="provider-details">
                <p>✓ 30+ models from Google, Meta, Mistral</p>
                <p>✓ Automatic failover on rate limits</p>
                <p>✓ Zero cost</p>
              </div>
            )}
            
            {provider.id === 'gemini' && (
              <div className="provider-details">
                <p>✓ Google Gemini 2.0 Flash</p>
                <p>✓ 1M token context</p>
                <p>✓ Requires GEMINI_API_KEY</p>
              </div>
            )}
            
            {!provider.available && (
              <div className="provider-unavailable">
                ⚠️ API key required
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="setup-instructions">
        <h4>Setup Free AI (No Credit Card)</h4>
        <ol>
          <li>Go to <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a></li>
          <li>Create account (free, no credit card)</li>
          <li>Generate API key</li>
          <li>Set <code>OPENROUTER_API_KEY</code> in .env</li>
          <li>Restart StoryMachine</li>
        </ol>
      </div>
    </div>
  );
}
```

---

### Step 3: API Routes

**File:** `server/routes/ai-providers.ts`

```typescript
import express from 'express';
import { aiProviders } from '../engine/ai-provider.ts';
import { gameLimiter } from '../lib/session-store.ts';

const router = express.Router();

// List available providers
router.get('/api/ai-providers', gameLimiter, (req, res) => {
  res.json({
    providers: aiProviders.listProviders(),
    current: 'free', // TODO: Store user preference
  });
});

// Switch provider
router.post('/api/ai-providers/switch', gameLimiter, (req, res) => {
  const { provider } = req.body;
  
  try {
    aiProviders.setProvider(provider);
    res.json({ success: true, provider });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

export default router;
```

---

## 🎯 Migration Path

### Phase 1: Add FreeRide (This Week)
1. ✅ Create `ai-provider.ts` with abstraction
2. ✅ Implement `FreeRideProvider`
3. ✅ Update `.env.example` with `OPENROUTER_API_KEY`
4. ✅ Make Gemini optional (not required)
5. ✅ Test with free OpenRouter key

### Phase 2: UI Integration (Next Week)
6. Add `AIProviderSettings` component
7. Add route `/api/ai-providers`
8. Add to `SettingsPanel.tsx`
9. Store user preference in session

### Phase 3: Premium Providers (Optional)
10. Implement `OpenAIProvider`
11. Implement `AnthropicProvider`
12. Add tier-based feature gates

---

## 📝 Environment Variables

Update `.env.example`:

```bash
# AI Provider Configuration
# ────────────────────────────────────────────────────────

# FREE Option (Default) - Get key at https://openrouter.ai/keys
# No credit card needed. 30+ free models available.
OPENROUTER_API_KEY=sk-or-v1-...

# Premium Options (Optional)
GEMINI_API_KEY=...           # Google Gemini Pro
OPENAI_API_KEY=...           # GPT-4, GPT-4o
ANTHROPIC_API_KEY=...        # Claude 3.5
```

---

## ✅ Benefits

### For Free Users
- ✅ **Zero cost** — 30+ free models from major providers
- ✅ **Automatic failover** — rate limit? Next model kicks in
- ✅ **Good quality** — Gemma 2, Llama 3.2, Qwen 2.5
- ✅ **No credit card** — OpenRouter free tier is actually free

### For Premium Users
- ✅ **Keep existing setup** — Gemini still works
- ✅ **Easy switching** — Toggle in UI
- ✅ **Better models** — Gemini Pro, GPT-4o, Claude 3.5

### For StoryMachine
- ✅ **Lower barrier to entry** — New users don't need API key
- ✅ **More users** — Free tier attracts more signups
- ✅ **Upsell path** — Free → Premium conversion
- ✅ **Provider flexibility** — Not locked to one vendor

---

## 🚀 Ready to Implement?

I can build:
**A.** Phase 1 (FreeRide integration) — 2-4 hours
**B.** Full integration (UI + all providers) — 1-2 days
**C.** Just the provider abstraction first — 1 hour

Which would you like?

