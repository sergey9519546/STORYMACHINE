// Lightweight in-process metrics. Tracks Gemini call volume, latency, retries
// and failures per call category so cost/latency can be measured without an
// external system. Exposed via GET /metrics.

interface CallStat {
  count: number;
  failures: number;
  retries: number;
  totalMs: number;
  maxMs: number;
}

function emptyStat(): CallStat {
  return { count: 0, failures: 0, retries: 0, totalMs: 0, maxMs: 0 };
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
  recordAiCall(label: string, ms: number, ok: boolean): void {
    const s = statFor(categoryOf(label));
    s.count++;
    if (!ok) s.failures++;
    s.totalMs += ms;
    if (ms > s.maxMs) s.maxMs = ms;
  },

  // Record one retry attempt (a transient failure that triggered a backoff).
  recordAiRetry(label: string): void {
    statFor(categoryOf(label)).retries++;
  },

  // JSON snapshot for the /metrics endpoint.
  snapshot(): Record<string, unknown> {
    const byCategory: Record<string, unknown> = {};
    let totalCalls = 0, totalFailures = 0, totalRetries = 0, totalMs = 0;
    for (const [cat, s] of stats) {
      totalCalls += s.count;
      totalFailures += s.failures;
      totalRetries += s.retries;
      totalMs += s.totalMs;
      byCategory[cat] = {
        calls: s.count,
        failures: s.failures,
        retries: s.retries,
        avg_ms: s.count > 0 ? Math.round(s.totalMs / s.count) : 0,
        max_ms: s.maxMs,
      };
    }
    return {
      uptime_s: Math.round((Date.now() - startedAt) / 1000),
      ai: {
        total_calls: totalCalls,
        total_failures: totalFailures,
        total_retries: totalRetries,
        avg_ms: totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0,
        by_category: byCategory,
      },
    };
  },

  reset(): void {
    stats.clear();
    startedAt = Date.now();
  },
};
