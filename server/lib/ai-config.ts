// In-memory AI provider configuration.
// Applied at startup from env vars; patched at runtime via POST /api/ai-config.
// API keys are stored in a separate private object and NEVER serialised to clients.

import {
  setLLMProvider, resetLLMProvider,
  setEmbeddingProvider, setImageProvider, setTTSProvider,
  geminiEmbeddingProvider, geminiImageProvider, geminiTTSProvider,
  noopImageProvider, noopTTSProvider, noopEmbeddingProvider,
} from '../engine/ai.ts';
import {
  makeOpenAICompatLLMProvider,
  makeOpenAICompatEmbeddingProvider,
  makeOpenAICompatImageProvider,
  makeOpenAICompatTTSProvider,
} from './ai-providers/openai-compat.ts';

// ── Config types ─────────────────────────────────────────────────────────────

export type AiProviderName  = 'gemini' | 'openai-compat';
export type AiMediaProvider = 'gemini' | 'openai-compat' | 'none';

export interface AiRuntimeConfig {
  provider:    AiProviderName;
  baseUrl?:    string;
  model?:      string;
  fastModel?:  string;
  imgProvider: AiMediaProvider;
  imgBaseUrl?: string;
  imgModel?:   string;
  ttsProvider: AiMediaProvider;
  ttsBaseUrl?: string;
  ttsModel?:   string;
  ttsVoice?:   string;
  embProvider: AiMediaProvider;
  embBaseUrl?: string;
  embModel?:   string;
}

// ── Internal state ────────────────────────────────────────────────────────────

let _cfg: AiRuntimeConfig = {
  provider:    'gemini',
  imgProvider: 'gemini',
  ttsProvider: 'gemini',
  embProvider: 'gemini',
};

// API keys kept private — never exposed outside this module
const _keys: Partial<Record<'apiKey' | 'imgApiKey' | 'ttsApiKey' | 'embApiKey', string>> = {};

// ── Provider wiring ───────────────────────────────────────────────────────────

function wireProviders(): void {
  // ── Text LLM ──
  if (_cfg.provider === 'openai-compat') {
    const baseURL = _cfg.baseUrl ?? '';
    const apiKey  = _keys.apiKey ?? '';
    if (baseURL && apiKey) {
      setLLMProvider(makeOpenAICompatLLMProvider({ baseURL, apiKey }));
    }
  } else {
    resetLLMProvider(); // back to Gemini
  }

  // ── Embeddings ──
  if (_cfg.embProvider === 'none') {
    setEmbeddingProvider(noopEmbeddingProvider);
  } else if (_cfg.embProvider === 'openai-compat') {
    const baseURL = _cfg.embBaseUrl ?? _cfg.baseUrl ?? '';
    const apiKey  = _keys.embApiKey ?? _keys.apiKey ?? '';
    const model   = _cfg.embModel ?? 'text-embedding-3-small';
    if (baseURL && apiKey) {
      setEmbeddingProvider(makeOpenAICompatEmbeddingProvider({ baseURL, apiKey, model }));
    }
  } else {
    setEmbeddingProvider(geminiEmbeddingProvider);
  }

  // ── Image ──
  if (_cfg.imgProvider === 'none') {
    setImageProvider(noopImageProvider);
  } else if (_cfg.imgProvider === 'openai-compat') {
    const baseURL = _cfg.imgBaseUrl ?? _cfg.baseUrl ?? '';
    const apiKey  = _keys.imgApiKey ?? _keys.apiKey ?? '';
    const model   = _cfg.imgModel ?? 'dall-e-3';
    if (baseURL && apiKey) {
      setImageProvider(makeOpenAICompatImageProvider({ baseURL, apiKey, model }));
    }
  } else {
    setImageProvider(geminiImageProvider);
  }

  // ── TTS ──
  if (_cfg.ttsProvider === 'none') {
    setTTSProvider(noopTTSProvider);
  } else if (_cfg.ttsProvider === 'openai-compat') {
    const baseURL = _cfg.ttsBaseUrl ?? _cfg.baseUrl ?? '';
    const apiKey  = _keys.ttsApiKey ?? _keys.apiKey ?? '';
    const model   = _cfg.ttsModel ?? 'tts-1';
    const voice   = _cfg.ttsVoice;
    if (baseURL && apiKey) {
      setTTSProvider(makeOpenAICompatTTSProvider({ baseURL, apiKey, model, voice }));
    }
  } else {
    setTTSProvider(geminiTTSProvider);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function applyConfig(
  cfg: Partial<AiRuntimeConfig>,
  keys?: Partial<Record<'apiKey' | 'imgApiKey' | 'ttsApiKey' | 'embApiKey', string>>,
): void {
  _cfg = { ..._cfg, ...cfg };
  if (keys) {
    for (const [k, v] of Object.entries(keys)) {
      if (v) (_keys as Record<string, string>)[k] = v;
    }
  }
  wireProviders();
}

export function getPublicConfig(): AiRuntimeConfig & {
  keySet:    boolean;
  imgKeySet: boolean;
  ttsKeySet: boolean;
  embKeySet: boolean;
} {
  return {
    ..._cfg,
    keySet:    !!_keys.apiKey,
    imgKeySet: !!(_keys.imgApiKey ?? _keys.apiKey),
    ttsKeySet: !!(_keys.ttsApiKey ?? _keys.apiKey),
    embKeySet: !!(_keys.embApiKey ?? _keys.apiKey),
  };
}

export function initFromEnv(): void {
  const provider = (process.env.AI_PROVIDER ?? 'gemini') as AiProviderName;

  applyConfig(
    {
      provider,
      baseUrl:     process.env.AI_BASE_URL,
      model:       process.env.AI_MODEL,
      fastModel:   process.env.AI_FAST_MODEL,
      imgProvider: (process.env.AI_IMG_PROVIDER ?? provider) as AiMediaProvider,
      imgBaseUrl:  process.env.AI_IMG_BASE_URL,
      imgModel:    process.env.AI_IMG_MODEL,
      ttsProvider: (process.env.AI_TTS_PROVIDER ?? provider) as AiMediaProvider,
      ttsBaseUrl:  process.env.AI_TTS_BASE_URL,
      ttsModel:    process.env.AI_TTS_MODEL,
      ttsVoice:    process.env.AI_TTS_VOICE,
      embProvider: (process.env.AI_EMBEDDING_PROVIDER ?? 'gemini') as AiMediaProvider,
      embBaseUrl:  process.env.AI_EMBEDDING_BASE_URL,
      embModel:    process.env.AI_EMBEDDING_MODEL,
    },
    {
      apiKey:    process.env.AI_API_KEY,
      imgApiKey: process.env.AI_IMG_API_KEY,
      ttsApiKey: process.env.AI_TTS_API_KEY,
      embApiKey: process.env.AI_EMBEDDING_API_KEY,
    },
  );
}
