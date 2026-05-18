// Factory functions for OpenAI-compatible provider adapters.
// A single adapter covers any API that speaks the OpenAI REST dialect:
// OpenRouter, OpenAI, Groq, DeepSeek, Mistral, Together, Ollama, LM Studio, Azure, xAI, etc.

import type { GenerateContentParameters, GenerateContentResponse, Schema } from '@google/genai';
import type { EmbeddingProvider, ImageProvider, TTSProvider, LLMProvider } from '../../engine/ai.ts';
import { geminiSchemaToJsonSchema } from './schema.ts';

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractText(c: unknown): string {
  if (typeof c === 'string') return c;
  const obj = c as { parts?: Array<{ text?: string }>; text?: string };
  if (obj.parts) return obj.parts.map(p => p.text ?? '').join('');
  return obj.text ?? '';
}

function buildMessages(
  params: GenerateContentParameters,
): Array<{ role: string; content: string }> {
  const msgs: Array<{ role: string; content: string }> = [];

  const sys = params.config?.systemInstruction;
  if (sys) {
    const text = extractText(sys);
    if (text) msgs.push({ role: 'system', content: text });
  }

  const contents = params.contents;
  if (Array.isArray(contents)) {
    for (const c of contents) {
      const text = extractText(c);
      const role = (c as { role?: string }).role ?? 'user';
      if (text) msgs.push({ role: role === 'model' ? 'assistant' : role, content: text });
    }
  } else {
    const text = extractText(contents);
    if (text) msgs.push({ role: 'user', content: text });
  }

  return msgs;
}

// ── LLM adapter ──────────────────────────────────────────────────────────────
// Uses params.model as the model name — set AI_MODEL / AI_FAST_MODEL so that
// getModel() returns the right OpenAI-compat model name at call sites.

export function makeOpenAICompatLLMProvider(cfg: {
  baseURL: string;
  apiKey: string;
}): LLMProvider {
  return {
    generate: async (params: GenerateContentParameters): Promise<GenerateContentResponse> => {
      const messages = buildMessages(params);
      const body: Record<string, unknown> = { model: params.model, messages };

      if (
        params.config?.responseMimeType === 'application/json' &&
        params.config?.responseSchema
      ) {
        body.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'response',
            strict: false, // not universally supported
            schema: geminiSchemaToJsonSchema(params.config.responseSchema as Schema),
          },
        };
      }

      if (params.config?.temperature != null) {
        body.temperature = params.config.temperature;
      }

      const res = await fetch(`${cfg.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`OpenAI-compat LLM error ${res.status}: ${errText}`);
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      return {
        text: data.choices?.[0]?.message?.content ?? '',
        usageMetadata: {
          promptTokenCount:     data.usage?.prompt_tokens     ?? 0,
          candidatesTokenCount: data.usage?.completion_tokens ?? 0,
        },
      } as unknown as GenerateContentResponse;
    },
  };
}

// ── Embedding adapter ─────────────────────────────────────────────────────────

export function makeOpenAICompatEmbeddingProvider(cfg: {
  baseURL: string;
  apiKey: string;
  model: string;
}): EmbeddingProvider {
  return {
    embed: async (text: string): Promise<number[]> => {
      const res = await fetch(`${cfg.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: cfg.model, input: text }),
      });
      if (!res.ok) return [];
      const data = await res.json() as { data?: Array<{ embedding?: number[] }> };
      return data.data?.[0]?.embedding ?? [];
    },
  };
}

// ── Image adapter ─────────────────────────────────────────────────────────────

export function makeOpenAICompatImageProvider(cfg: {
  baseURL: string;
  apiKey: string;
  model: string;
}): ImageProvider {
  return {
    generate: async (prompt: string): Promise<string | undefined> => {
      const res = await fetch(`${cfg.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: cfg.model,
          prompt,
          n: 1,
          size: '1792x1024',
          response_format: 'b64_json',
        }),
      });
      if (!res.ok) return undefined;
      const data = await res.json() as { data?: Array<{ b64_json?: string }> };
      const b64 = data.data?.[0]?.b64_json;
      return b64 ? `data:image/png;base64,${b64}` : undefined;
    },
  };
}

// ── TTS adapter ───────────────────────────────────────────────────────────────

export function makeOpenAICompatTTSProvider(cfg: {
  baseURL: string;
  apiKey: string;
  model: string;
  voice?: string;
}): TTSProvider {
  return {
    speak: async (text: string): Promise<{ dataUrl: string; mimeType: string } | undefined> => {
      if (!text) return undefined;
      const res = await fetch(`${cfg.baseURL}/audio/speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: cfg.model,
          input: text,
          voice: cfg.voice ?? 'alloy',
          response_format: 'mp3',
        }),
      });
      if (!res.ok) return undefined;
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        dataUrl: `data:audio/mpeg;base64,${buf.toString('base64')}`,
        mimeType: 'audio/mpeg',
      };
    },
  };
}
