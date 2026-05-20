// LLM call cache — keyed by (model, prompt hash) stored in the Stage DB.
// On warm hit: returns cached response, zero network. Makes replay deterministic.
// Hot path is a single SQLite SELECT; all I/O is synchronous to match Stage API.

import { createHash } from 'crypto';
import type { Stage } from '../../engine/Stage.ts';

export interface LlmCacheEntry {
  cacheKey: string;
  model: string;
  promptHash: string;
  response: string;
  createdAt: number;
}

export function promptHash(model: string, prompt: string): string {
  return createHash('sha256').update(`${model}\0${prompt}`).digest('hex').slice(0, 32);
}

export function getCached(stage: Stage, model: string, prompt: string): string | null {
  return stage.llmCacheGet(promptHash(model, prompt));
}

export function putCache(stage: Stage, model: string, prompt: string, response: string): void {
  stage.llmCachePut(promptHash(model, prompt), model, response);
}
