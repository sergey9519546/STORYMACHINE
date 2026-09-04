import { logger } from './logger.ts';
import { describeContent } from './log-redact.ts';

// Server-side safe JSON parse. Mirrors src/lib/json.ts but logs through the
// structured logger instead of console — keeps the engine free of any
// dependency on frontend code (src/).
export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    // NOT `message: (e as Error).message` — V8's JSON.parse SyntaxError
    // embeds a verbatim snippet of the offending input in its own message
    // ("Unexpected token 'M', \"MARLA know\"... is not valid JSON"). When
    // `json` here is a malformed LLM response, that snippet can be the
    // writer's own story text quoted back by the parser it fails in. Log the
    // error's name/shape and describe the input through the one sanctioned
    // content-logging seam instead of the raw message.
    const err = e as Error;
    const positionMatch = err.message.match(/position (\d+)/);
    logger.warn('json_parse_error', {
      errorName: err.name,
      position: positionMatch ? Number(positionMatch[1]) : undefined,
      input: describeContent(json),
    });
    return fallback;
  }
}
