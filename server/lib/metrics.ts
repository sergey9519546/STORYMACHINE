// Lightweight in-process metrics. Tracks Gemini call volume, latency, retries,
// failures, and token usage per call category. Exposed via GET /metrics.
// Also maintains a rolling window of per-category latency samples to compute
// P50/P95/P99 without storing the full history.

const LATENCY_WINDOW = 500; // samples kept per category

interface CallStat {
  count: number;
  failures: number;
  retries: number;
  totalMs: number;
  maxMs: number;
  promptTokens: number;
  candidateTokens: number;
  latencySamples: number[]; // circular buffer (up to LATENCY_WINDOW newest)
}

function emptyStat(): CallStat {
  return { count: 0, failures: 0, retries: 0, totalMs: 0, maxMs: 0, promptTokens: 0, candidateTokens: 0, latencySamples: [] };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

// ── Token cost estimation (M6) ───────────────────────────────────────────────
// USD per 1M tokens. Defaults approximate Gemini Flash pricing; override per
// deployment via AI_COST_INPUT_PER_M / AI_COST_OUTPUT_PER_M. Cost is an estimate
// for budgeting and observability — not a billing source of truth.
function rate(envVar: string, fallback: number): number {
  const v = parseFloat(process.env[envVar] ?? '');
  return isFinite(v) && v >= 0 ? v : fallback;
}
function estimateCostUsd(promptTokens: number, candidateTokens: number): number {
  const inRate  = rate('AI_COST_INPUT_PER_M', 0.075);
  const outRate = rate('AI_COST_OUTPUT_PER_M', 0.30);
  return (promptTokens / 1_000_000) * inRate + (candidateTokens / 1_000_000) * outRate;
}
// Round to 6 decimals (micro-dollar precision) without float noise.
function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
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
    if (s.latencySamples.length >= LATENCY_WINDOW) s.latencySamples.shift();
    s.latencySamples.push(ms);
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
      const sorted = [...s.latencySamples].sort((a, b) => a - b);
      byCategory[cat] = {
        calls: s.count,
        failures: s.failures,
        retries: s.retries,
        avg_ms: s.count > 0 ? Math.round(s.totalMs / s.count) : 0,
        max_ms: s.maxMs,
        p50_ms: percentile(sorted, 0.50),
        p95_ms: percentile(sorted, 0.95),
        p99_ms: percentile(sorted, 0.99),
        prompt_tokens: s.promptTokens,
        candidate_tokens: s.candidateTokens,
        total_tokens: s.promptTokens + s.candidateTokens,
        est_cost_usd: round6(estimateCostUsd(s.promptTokens, s.candidateTokens)),
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
        est_cost_usd: round6(estimateCostUsd(totalPromptTokens, totalCandidateTokens)),
        by_category: byCategory,
      },
    };
  },

  reset(): void {
    stats.clear();
    startedAt = Date.now();
  },
};
