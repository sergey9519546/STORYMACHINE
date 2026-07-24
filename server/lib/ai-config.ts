// In-memory AI provider configuration.
// Applied at startup from env vars; patched at runtime via POST /api/ai-config.
// API keys are stored in a separate private object and NEVER serialised to clients.

import {
  setLLMProvider, resetLLMProvider,
  setEmbeddingProvider, setImageProvider, setTTSProvider,
  geminiEmbeddingProvider, geminiImageProvider, geminiTTSProvider,
  noopImageProvider, noopTTSProvider, noopEmbeddingProvider,
} from '../engine/ai.ts';
import { logger } from './logger.ts';
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

// Placeholder Authorization token used when an openai-compat provider is wired
// with no API key. Local model servers (Ollama, LM Studio) ignore it; public
// endpoints that require a real key will return a clear 401 at call time.
const LOCAL_PLACEHOLDER_KEY = 'not-needed';

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
    // A key is OPTIONAL here. Local model servers (Ollama, LM Studio) ignore
    // the Authorization header entirely, so keyless testing must work — the
    // stock recipe. Public endpoints (OpenRouter, Groq…) do need a real key,
    // but an absent one surfaces as a clear 401 at call time, not a silent
    // misconfig — so we wire on baseURL alone and pass a conventional
    // placeholder when no key was supplied.
    const apiKey = _keys.apiKey || LOCAL_PLACEHOLDER_KEY;
    if (baseURL) {
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
    const apiKey  = _keys.embApiKey ?? _keys.apiKey ?? LOCAL_PLACEHOLDER_KEY;
    const model   = _cfg.embModel ?? 'text-embedding-3-small';
    if (baseURL) {
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
    const apiKey  = _keys.imgApiKey ?? _keys.apiKey ?? LOCAL_PLACEHOLDER_KEY;
    const model   = _cfg.imgModel ?? 'dall-e-3';
    if (baseURL) {
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
    const apiKey  = _keys.ttsApiKey ?? _keys.apiKey ?? LOCAL_PLACEHOLDER_KEY;
    const model   = _cfg.ttsModel ?? 'tts-1';
    const voice   = _cfg.ttsVoice;
    if (baseURL) {
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

// ── Readiness (single source of truth) ────────────────────────────────────────
// `llmReady` is THE readiness signal shared by every route that gates on whether
// a text-LLM call can actually be served. It must OR every independent key
// source that wires a text provider at startup — checking only one is a
// documented trap (a deployment with only the missed source configured shows
// `llmReady:false` while generation silently works, or vice-versa).
//
// Three independent sources wire a text LLM in this codebase:
//   1. GEMINI_API_KEY  (env → getAI()/GeminiProvider, ai.ts:37-44)
//   2. OPENROUTER_API_KEY (env → FreeRideProvider, ai.ts:25-34) — the free tier
//   3. Runtime config:  applyConfig()'s openai-compat path with a stored key
//      (pub.keySet) OR a keyless local model server with a baseUrl
//      (Ollama/LM Studio ignore Authorization, so keySet stays false yet the
//      provider genuinely works) — see wireProviders() above.
// Note: ai.ts reads these env vars itself at module load; we re-check them here
// rather than reaching into the provider manager so readiness stays a pure
// function of configuration (no provider-registration side effects) and stays
// correct even if module-load order or the manager's API changes.
export function llmReady(): boolean {
  const pub = getPublicConfig();
  const localProviderReady = pub.provider === 'openai-compat' && Boolean(pub.baseUrl);
  return Boolean(process.env.GEMINI_API_KEY)
    || Boolean(process.env.OPENROUTER_API_KEY)
    || pub.keySet
    || localProviderReady;
}

const VALID_PROVIDERS: readonly string[]      = ['gemini', 'openai-compat'];
const VALID_MEDIA_PROVIDERS: readonly string[] = ['gemini', 'openai-compat', 'none'];

function warnInvalidProvider(envVar: string, value: string | undefined, valid: readonly string[]): void {
  if (value !== undefined && !valid.includes(value)) {
    logger.warn('ai_config_invalid_provider', { envVar, value, valid: valid.join(', ') });
  }
}

export function initFromEnv(): void {
  const rawProvider = process.env.AI_PROVIDER;
  warnInvalidProvider('AI_PROVIDER', rawProvider, VALID_PROVIDERS);
  const provider = (VALID_PROVIDERS.includes(rawProvider ?? '') ? rawProvider : 'gemini') as AiProviderName;

  const rawImg = process.env.AI_IMG_PROVIDER;
  warnInvalidProvider('AI_IMG_PROVIDER', rawImg, VALID_MEDIA_PROVIDERS);
  const imgProvider = (VALID_MEDIA_PROVIDERS.includes(rawImg ?? '') ? rawImg : provider) as AiMediaProvider;

  const rawTts = process.env.AI_TTS_PROVIDER;
  warnInvalidProvider('AI_TTS_PROVIDER', rawTts, VALID_MEDIA_PROVIDERS);
  const ttsProvider = (VALID_MEDIA_PROVIDERS.includes(rawTts ?? '') ? rawTts : provider) as AiMediaProvider;

  const rawEmb = process.env.AI_EMBEDDING_PROVIDER;
  warnInvalidProvider('AI_EMBEDDING_PROVIDER', rawEmb, VALID_MEDIA_PROVIDERS);
  const embProvider = (VALID_MEDIA_PROVIDERS.includes(rawEmb ?? '') ? rawEmb : 'gemini') as AiMediaProvider;

  applyConfig(
    {
      provider,
      baseUrl:     process.env.AI_BASE_URL,
      model:       process.env.AI_MODEL,
      fastModel:   process.env.AI_FAST_MODEL,
      imgProvider,
      imgBaseUrl:  process.env.AI_IMG_BASE_URL,
      imgModel:    process.env.AI_IMG_MODEL,
      ttsProvider,
      ttsBaseUrl:  process.env.AI_TTS_BASE_URL,
      ttsModel:    process.env.AI_TTS_MODEL,
      ttsVoice:    process.env.AI_TTS_VOICE,
      embProvider,
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
