import { GoogleGenAI, Modality } from '@google/genai';
import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { logger } from '../lib/logger.ts';
import { metrics } from '../lib/metrics.ts';
import { aiProviderManager, FreeRideProvider, GeminiProvider } from './ai-provider.ts';

let _shared: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI | null {
  if (!_shared) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // GEMINI_API_KEY is now optional - return null if not set
      return null;
    }
    _shared = new GoogleGenAI({ apiKey: key });
  }
  return _shared;
}

// ── Initialize AI Providers ──────────────────────────────────────────────────
// Register available providers on module load
function initializeProviders(): void {
  // Try to register FreeRide provider (free, via OpenRouter)
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    try {
      const freeride = new FreeRideProvider(openrouterKey);
      aiProviderManager.registerProvider('freeride', freeride);
      logger.info('ai_provider_registered', { provider: 'FreeRide', tier: 'free' });
    } catch (e) {
      logger.warn('freeride_provider_init_failed', { error: (e as Error).message });
    }
  }
  
  // Try to register Gemini provider (premium)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const geminiAI = getAI();
      if (geminiAI) {
        const gemini = new GeminiProvider(geminiAI);
        aiProviderManager.registerProvider('gemini', gemini);
        logger.info('ai_provider_registered', { provider: 'Gemini', tier: 'premium' });
      }
    } catch (e) {
      logger.warn('gemini_provider_init_failed', { error: (e as Error).message });
    }
  }
  
  // Auto-select the best available provider (prefers free > premium)
  aiProviderManager.autoSelectProvider();
}

// Initialize providers when module loads
initializeProviders();

// ── Provider interfaces ───────────────────────────────────────────────────────

export interface LLMProvider {
  generate(params: GenerateContentParameters): Promise<GenerateContentResponse>;
  /** Optional streaming generate. Yields response chunks (each with a `.text`).
   *  Providers that don't support streaming can omit this; callers fall back to
   *  a single non-streamed generate. */
  generateStream?(params: GenerateContentParameters): Promise<AsyncIterable<GenerateContentResponse>>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

export interface ImageProvider {
  generate(prompt: string): Promise<string | undefined>;
}

export interface TTSProvider {
  speak(text: string): Promise<{ dataUrl: string; mimeType: string } | undefined>;
}

// ── No-op providers for graceful degradation ─────────────────────────────────

export const noopImageProvider: ImageProvider = { generate: async () => undefined };
export const noopTTSProvider: TTSProvider     = { speak:    async () => undefined };
export const noopEmbeddingProvider: EmbeddingProvider = { embed: async () => [] };

// ── PCM → WAV helper (used by default Gemini TTS provider) ───────────────────

function pcmToWav(pcmData: Buffer, sampleRate: number, numChannels: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * 2, 28);
  header.writeUInt16LE(numChannels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);
  return Buffer.concat([header, pcmData]);
}

// ── Default Gemini provider implementations ───────────────────────────────────
// Exported so ai-config.ts can restore them without circular deps.

export const geminiProvider: LLMProvider = {
  generate: (params) => {
    const ai = getAI();
    if (!ai) throw new Error('Gemini provider not available (GEMINI_API_KEY not set)');
    return ai.models.generateContent(params);
  },
  generateStream: (params) => {
    const ai = getAI();
    if (!ai) throw new Error('Gemini provider not available (GEMINI_API_KEY not set)');
    return ai.models.generateContentStream(params);
  },
};

export const geminiEmbeddingProvider: EmbeddingProvider = {
  embed: async (text: string): Promise<number[]> => {
    const ai = getAI();
    if (!ai) {
      logger.warn('embedding_provider_unavailable', { reason: 'GEMINI_API_KEY not set' });
      return [];
    }
    const result = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: [text],
    });
    return result.embeddings?.[0]?.values ?? [];
  },
};

// RESERVED: Image and TTS providers are implemented but not yet wired to any
// story generation or screenplay output path.  Future: wire via P2 export
// pipeline or an image-generation toggle in the Director panel.
export const geminiImageProvider: ImageProvider = {
  generate: async (prompt: string): Promise<string | undefined> => {
    const ai = getAI();
    if (!ai) {
      logger.warn('image_provider_unavailable', { reason: 'GEMINI_API_KEY not set' });
      return undefined;
    }
    try {
      const response = await generateContent({
        model: process.env.GEMINI_IMG_MODEL ?? 'gemini-2.5-flash-preview-image-generation',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: '16:9' } },
      }, { label: 'generateImage', timeoutMs: 25_000 });
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if ((part as { inlineData?: { data?: string; mimeType?: string } }).inlineData?.data) {
          const d = (part as { inlineData: { data: string; mimeType?: string } }).inlineData;
          return `data:${d.mimeType};base64,${d.data}`;
        }
      }
    } catch (e) {
      logger.error('image_generation_failed', { message: (e as Error).message });
    }
    return undefined;
  },
};

export const geminiTTSProvider: TTSProvider = {
  speak: async (text: string): Promise<{ dataUrl: string; mimeType: string } | undefined> => {
    if (!text) return undefined;
    const ai = getAI();
    if (!ai) {
      logger.warn('tts_provider_unavailable', { reason: 'GEMINI_API_KEY not set' });
      return undefined;
    }
    try {
      const response = await generateContent({
        model: process.env.GEMINI_TTS_MODEL ?? 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        },
      }, { label: 'generateAudio', timeoutMs: 20_000 });
      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData?.data || inlineData.data.length === 0) return undefined;

      let base64Data = inlineData.data;
      let mimeType = inlineData.mimeType ?? 'audio/wav';
      const isWav = base64Data.startsWith('UklGR'); // "RIFF" in base64
      if (!isWav && (mimeType.includes('audio/pcm') || mimeType === 'audio/wav')) {
        let pcmBuf = Buffer.from(base64Data, 'base64');
        if (pcmBuf.length === 0) return undefined;
        if (pcmBuf.length % 2 !== 0) pcmBuf = pcmBuf.subarray(0, pcmBuf.length - 1);
        const wavBuf = pcmToWav(pcmBuf, 24000, 1);
        base64Data = wavBuf.toString('base64');
        mimeType = 'audio/wav';
      } else if (isWav) {
        mimeType = 'audio/wav';
      }
      return { dataUrl: `data:${mimeType};base64,${base64Data}`, mimeType };
    } catch (e) {
      logger.error('audio_generation_failed', { message: (e as Error).message });
    }
    return undefined;
  },
};

// ── Provider seam slots ───────────────────────────────────────────────────────
// Default to multi-provider system if available, fall back to Gemini

let _provider:          LLMProvider       = geminiProvider;
let _embeddingProvider: EmbeddingProvider = geminiEmbeddingProvider;
let _imageProvider:     ImageProvider     = geminiImageProvider;
let _ttsProvider:       TTSProvider       = geminiTTSProvider;

// Override _provider if multi-provider system has a provider available
if (aiProviderManager.hasProvider()) {
  const activeProvider = aiProviderManager.getProvider();
  _provider = {
    generate: (params) => activeProvider.generate(params),
    generateStream: (params) => activeProvider.generateStream?.(params) ?? activeProvider.generate(params).then(async function* (r) { yield r; }),
  };
}

export function setLLMProvider(p: LLMProvider): void         { _provider = p; }
export function resetLLMProvider(): void                     { 
  // Reset to multi-provider system if available, otherwise Gemini
  if (aiProviderManager.hasProvider()) {
    const activeProvider = aiProviderManager.getProvider();
    _provider = {
      generate: (params) => activeProvider.generate(params),
      generateStream: (params) => activeProvider.generateStream?.(params) ?? activeProvider.generate(params).then(async function* (r) { yield r; }),
    };
  } else {
    _provider = geminiProvider;
  }
}
export function setEmbeddingProvider(p: EmbeddingProvider): void { _embeddingProvider = p; }
export function setImageProvider(p: ImageProvider): void         { _imageProvider = p; }
export function setTTSProvider(p: TTSProvider): void             { _ttsProvider = p; }
export function getEmbeddingProvider(): EmbeddingProvider        { return _embeddingProvider; }
export function getImageProvider(): ImageProvider                { return _imageProvider; }
export function getTTSProvider(): TTSProvider                    { return _ttsProvider; }
export function resetAllProviders(): void {
  if (aiProviderManager.hasProvider()) {
    const activeProvider = aiProviderManager.getProvider();
    _provider = {
      generate: (params) => activeProvider.generate(params),
      generateStream: (params) => activeProvider.generateStream?.(params) ?? activeProvider.generate(params).then(async function* (r) { yield r; }),
    };
  } else {
    _provider = geminiProvider;
  }
  _embeddingProvider = geminiEmbeddingProvider;
  _imageProvider     = geminiImageProvider;
  _ttsProvider       = geminiTTSProvider;
}

// Model tiering. High-volume per-turn calls (agent actions) can run on the
// fast tier to cut cost/latency; quality-critical calls stay on the pro tier.
// AI_MODEL / AI_FAST_MODEL take precedence for multi-provider setups;
// GEMINI_MODEL / GEMINI_FAST_MODEL are Gemini-specific fallbacks.
export function getModel(tier: 'fast' | 'pro' = 'pro'): string {
  if (tier === 'fast') {
    return process.env.AI_FAST_MODEL ?? process.env.GEMINI_FAST_MODEL ?? 'gemini-2.5-flash';
  }
  return process.env.AI_MODEL ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-pro';
}

// ── P5: Multi-model routing by task type ─────────────────────────────────────
// Maps a semantic task type to a model tier. High-reasoning / long-context /
// quality-critical tasks route to the Pro tier; high-volume, low-latency, or
// simple-transform tasks route to the Fast tier. Centralizing the mapping here
// means callers declare WHAT they're doing, not WHICH model — so the whole
// routing policy can be tuned in one place (or overridden per task via env:
// e.g. AI_TASK_TIER_GHOST_TEXT=pro).
export type TaskType =
  | 'OUTLINE'      // structure / beat-sheet generation — high reasoning, long context
  | 'CANDIDATE'    // NVM scene-candidate generation — quality critical
  | 'REVISION'     // 12-pass revision rewrites — quality critical
  | 'WORLDBUILD'   // ScriptIDE scene generation — quality critical
  | 'DIALOGUE'     // dialogue doctoring — voice/subtext quality
  | 'ANALYSIS'     // tension / structure analysis — reasoning
  | 'CHARACTER'    // character profile synthesis — reasoning
  | 'ACTION'       // clean-action transform — simple, mechanical
  | 'AGENT_TURN'   // per-agent ToT action selection — high volume
  | 'EPISTEMICS'   // per-agent belief update — high volume
  | 'GHOST_TEXT';  // inline copilot completion — latency critical

const TASK_TIER: Record<TaskType, 'fast' | 'pro'> = {
  OUTLINE:    'pro',
  // CANDIDATE and REVISION run in high-volume iterative loops (convergence emits
  // up to 24 candidates/scene; revision runs 12 passes/scene). They default to
  // fast to keep cost bounded; bump to pro per-deployment via
  // AI_TASK_TIER_CANDIDATE=pro / AI_TASK_TIER_REVISION=pro when quality > cost.
  CANDIDATE:  'fast',
  REVISION:   'fast',
  WORLDBUILD: 'pro',   // single-shot, user-triggered — quality worth the latency
  DIALOGUE:   'pro',
  ANALYSIS:   'pro',
  CHARACTER:  'pro',
  ACTION:     'fast',  // mechanical camera-direction strip — no reasoning needed
  AGENT_TURN: 'fast',  // high volume per turn
  EPISTEMICS: 'fast',  // high volume per turn
  GHOST_TEXT: 'fast',  // latency critical (inline copilot)
};

/**
 * Resolve the model name for a semantic task type. A per-task env override
 * (AI_TASK_TIER_<TASK>=fast|pro) takes precedence over the default mapping.
 */
export function modelForTask(task: TaskType): string {
  const override = process.env[`AI_TASK_TIER_${task}`];
  const tier: 'fast' | 'pro' =
    override === 'fast' || override === 'pro' ? override : TASK_TIER[task];
  return getModel(tier);
}

// Returns the generation temperature to use for all Gemini calls.
// Set GEMINI_TEMPERATURE=0 in .env to get near-deterministic outputs.
// Defaults to 1.0 (Gemini default). Values outside 0–2 are clamped.
export function getTemperature(): number {
  const raw = parseFloat(process.env.GEMINI_TEMPERATURE ?? '');
  return isNaN(raw) ? 1.0 : Math.max(0, Math.min(2, raw));
}

// Wraps a promise with a hard deadline. Clears the timer on settle so Node can exit cleanly.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Gemini timeout (${ms}ms): ${label}`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// A failure is transient (worth retrying) if it's a rate-limit, an upstream
// 5xx, a timeout, or a dropped connection. Bad-request / auth errors are not.
function isTransient(err: unknown): boolean {
  const msg = ((err as Error)?.message ?? String(err)).toLowerCase();
  const status = (err as { status?: number })?.status;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  return /\b(429|500|502|503|504)\b/.test(msg)
    || msg.includes('rate limit')
    || msg.includes('quota')
    || msg.includes('overloaded')
    || msg.includes('unavailable')
    || msg.includes('timeout')
    || msg.includes('econnreset')
    || msg.includes('etimedout')
    || msg.includes('socket hang up')
    || msg.includes('fetch failed');
}

// Retries a promise factory on transient failures with exponential backoff
// (500ms, 1s, 2s, … capped at 8s) plus jitter. The factory is re-invoked on
// each attempt so a fresh request is issued every time.
export async function withRetry<T>(
  factory: () => Promise<T>,
  label: string,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await factory();
    } catch (e) {
      lastErr = e;
      if (attempt >= maxAttempts || !isTransient(e)) throw e;
      metrics.recordAiRetry(label);
      const backoff = Math.min(8000, 500 * 2 ** (attempt - 1));
      const delay = backoff + Math.random() * 250;
      logger.warn('ai_retry', { label, attempt, maxAttempts, delayMs: Math.round(delay), error: (e as Error).message });
      await sleep(delay);
    }
  }
  throw lastErr;
}

// Convenience: a single Gemini generateContent call with both a hard timeout
// and transient-failure retry. Replaces the bare withTimeout(ai...generateContent())
// pattern at call sites so retry is applied uniformly.
export async function generateContent(
  params: GenerateContentParameters,
  opts: { label: string; timeoutMs?: number; maxAttempts?: number },
): Promise<GenerateContentResponse> {
  const { label, timeoutMs = 30_000, maxAttempts = 3 } = opts;
  const started = Date.now();
  let ok = false;
  let res: GenerateContentResponse | undefined;
  try {
    res = await withRetry(
      () => withTimeout(_provider.generate(params), timeoutMs, label),
      label,
      maxAttempts,
    );
    ok = true;
    return res;
  } finally {
    metrics.recordAiCall(
      label,
      Date.now() - started,
      ok,
      res ? (res as GenerateContentResponse & { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata : undefined,
    );
  }
}

// Streaming variant of generateContent — goes through the active LLM provider so
// it can be stubbed in tests and stays consistent with the non-streaming path.
// Records a single metrics entry once the stream is exhausted (latency = full
// stream duration). If the active provider has no generateStream, falls back to
// a one-shot generate yielded as a single chunk.
export async function generateContentStream(
  params: GenerateContentParameters,
  opts: { label: string },
): Promise<AsyncIterable<GenerateContentResponse>> {
  const { label } = opts;
  const started = Date.now();

  if (!_provider.generateStream) {
    // Fallback: single non-streamed call wrapped as a one-element async iterable.
    const res = await generateContent(params, { label });
    async function* single(): AsyncGenerator<GenerateContentResponse> { yield res; }
    return single();
  }

  const inner = await _provider.generateStream(params);
  async function* tracked(): AsyncGenerator<GenerateContentResponse> {
    let ok = false;
    let last: GenerateContentResponse | undefined;
    try {
      for await (const chunk of inner) {
        last = chunk;
        yield chunk;
      }
      ok = true;
    } finally {
      metrics.recordAiCall(
        label,
        Date.now() - started,
        ok,
        last ? (last as GenerateContentResponse & { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata : undefined,
      );
    }
  }
  return tracked();
}
