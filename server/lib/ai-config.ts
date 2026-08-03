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
    } else {
      // No baseUrl yet (e.g. `provider` was patched ahead of a follow-up call
      // that supplies it). llmReady() already reports not-ready for this
      // state; fail closed here too instead of silently leaving whatever
      // provider was wired before this call (stale Gemini, or a previous
      // openai-compat endpoint/key) active under this new, mismatched label.
      setLLMProvider({
        generate: async () => { throw new Error('AI LLM provider is set to openai-compat but no baseUrl is configured yet'); },
      });
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
    } else {
      // No baseUrl yet — don't leave a stale/prior provider silently wired.
      setEmbeddingProvider(noopEmbeddingProvider);
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
    } else {
      // No baseUrl yet — don't leave a stale/prior provider silently wired.
      setImageProvider(noopImageProvider);
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
    } else {
      // No baseUrl yet — don't leave a stale/prior provider silently wired.
      setTTSProvider(noopTTSProvider);
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
// `llmReady` is the readiness signal shared by routes that expose the
// configured text-generation workflow. It must evaluate the ACTIVE configured
// provider, not OR unrelated credentials: an OpenAI-compatible key cannot
// power Gemini, and a Gemini key cannot power a selected OpenAI-compatible
// endpoint.
//
// OPENROUTER_API_KEY is intentionally not accepted here. The legacy FreeRide
// bridge is not yet response-compatible with the ScriptIDE routes (its bridge
// object has no `.text` getter), so treating that key as readiness would send a
// writer's draft to a provider and return an empty or invalid result. It stays
// unavailable to this surface until that provider has an end-to-end contract.
//
// Keyless OpenAI-compatible endpoints are supported only for loopback local
// model servers such as Ollama and LM Studio. A public endpoint must have an
// explicit runtime key; otherwise we fail closed instead of issuing an
// unauthenticated request to an arbitrary URL.
function isLoopbackBaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
  } catch {
    return false;
  }
}

export function llmReady(): boolean {
  const pub = getPublicConfig();
  if (pub.provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
  return Boolean(pub.baseUrl) && (pub.keySet || isLoopbackBaseUrl(pub.baseUrl));
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
