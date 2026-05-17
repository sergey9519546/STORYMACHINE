// Lightweight in-process metrics. Tracks Gemini call volume, latency, retries,
// failures, and token usage per call category. Exposed via GET /metrics.

interface CallStat {
  count: number;
  failures: number;
  retries: number;
  totalMs: number;
  maxMs: number;
  promptTokens: number;
  candidateTokens: number;
}

function emptyStat(): CallStat {
  return { count: 0, failures: 0, retries: 0, totalMs: 0, maxMs: 0, promptTokens: 0, candidateTokens: 0 };
}

// A call label looks like "takeTurn:Alice" — the category is the part before ':'.
function categoryOf(label: string): string {
  const i = label.indexOf(':');
  return i === -1 ? label : label.slice(0, i);
}

const stats = new Map<string, CallStat>();
let startedAt = Date.now();

function statFor(category: string): CallStat {
  let s = stats.get(category);
  if (!s) { s = emptyStat(); stats.set(category, s); }
  return s;
}

export const metrics = {
  // Record one completed Gemini call (after all retries settle).
  // usageMetadata is the optional token usage from the GenerateContentResponse.
  recordAiCall(
    label: string,
    ms: number,
    ok: boolean,
    usage?: { promptTokenCount?: number; candidatesTokenCount?: number },
  ): void {
    const s = statFor(categoryOf(label));
    s.count++;
    if (!ok) s.failures++;
    s.totalMs += ms;
    if (ms > s.maxMs) s.maxMs = ms;
    if (usage) {
      s.promptTokens    += usage.promptTokenCount    ?? 0;
      s.candidateTokens += usage.candidatesTokenCount ?? 0;
    }
  },

  // Record one retry attempt (a transient failure that triggered a backoff).
  recordAiRetry(label: string): void {
    statFor(categoryOf(label)).retries++;
  },

  // JSON snapshot for the /metrics endpoint.
  snapshot(): Record<string, unknown> {
    const byCategory: Record<string, unknown> = {};
    let totalCalls = 0, totalFailures = 0, totalRetries = 0, totalMs = 0;
    let totalPromptTokens = 0, totalCandidateTokens = 0;
    for (const [cat, s] of stats) {
      totalCalls += s.count;
      totalFailures += s.failures;
      totalRetries += s.retries;
      totalMs += s.totalMs;
      totalPromptTokens    += s.promptTokens;
      totalCandidateTokens += s.candidateTokens;
      byCategory[cat] = {
        calls: s.count,
        failures: s.failures,
        retries: s.retries,
        avg_ms: s.count > 0 ? Math.round(s.totalMs / s.count) : 0,
        max_ms: s.maxMs,
        prompt_tokens: s.promptTokens,
        candidate_tokens: s.candidateTokens,
        total_tokens: s.promptTokens + s.candidateTokens,
      };
    }
    return {
      uptime_s: Math.round((Date.now() - startedAt) / 1000),
      ai: {
        total_calls: totalCalls,
        total_failures: totalFailures,
        total_retries: totalRetries,
        avg_ms: totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0,
        total_prompt_tokens: totalPromptTokens,
        total_candidate_tokens: totalCandidateTokens,
        total_tokens: totalPromptTokens + totalCandidateTokens,
        by_category: byCategory,
      },
    };
  },

  reset(): void {
    stats.clear();
    startedAt = Date.now();
  },
};
