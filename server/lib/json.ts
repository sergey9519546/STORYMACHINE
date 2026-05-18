import { logger } from './logger.ts';

// Server-side safe JSON parse. Mirrors src/lib/json.ts but logs through the
// structured logger instead of console — keeps the engine free of any
// dependency on frontend code (src/).
export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    logger.warn('json_parse_error', { message: (e as Error).message });
    return fallback;
  }
}
