// V5.0 Phase 1 metrics — EventStore shadow-write counters.
//
// PROVENANCE: see server/config/v5-flags.ts. This is the second of the three
// modules commit aacd715 imported but never committed. It restores boot with a
// minimal, dependency-free in-memory counter that server/engine/Stage.ts calls
// only when the shadow-write feature is explicitly enabled (default OFF), so it
// is inert on the normal keyless path.
//
// DESIGN: pure in-process counters — no I/O, no logging (keeps CI's
// no-console-in-server rule satisfied), no external metrics backend. If a real
// observability sink is wired later, this is the single seam to replace.

/** Snapshot of shadow-write outcomes since process start. */
export interface V5MetricsSnapshot {
  successes: number;
  failures: number;
  timeouts: number;
  totalEvents: number;
  totalBytes: number;
  lastLatencyMs: number;
  /** Keyed by error name/type, e.g. { TIMEOUT: 2, UNKNOWN: 1 }. */
  failuresByType: Record<string, number>;
}

/** Records outcomes of EventStore shadow writes. All methods are cheap and
 *  never throw so they can be called from Stage.ts's fire-and-forget path. */
export class V5Metrics {
  private successes = 0;
  private failures = 0;
  private timeouts = 0;
  private totalEvents = 0;
  private totalBytes = 0;
  private lastLatencyMs = 0;
  private failuresByType: Record<string, number> = {};

  recordSuccess(latencyMs: number, eventCount: number, byteSize: number): void {
    this.successes += 1;
    this.totalEvents += eventCount;
    this.totalBytes += byteSize;
    this.lastLatencyMs = latencyMs;
  }

  recordFailure(latencyMs: number, errorType: string): void {
    this.failures += 1;
    this.lastLatencyMs = latencyMs;
    this.failuresByType[errorType] = (this.failuresByType[errorType] ?? 0) + 1;
  }

  recordTimeout(latencyMs: number): void {
    this.timeouts += 1;
    this.lastLatencyMs = latencyMs;
    this.failuresByType.TIMEOUT = (this.failuresByType.TIMEOUT ?? 0) + 1;
  }

  snapshot(): V5MetricsSnapshot {
    return {
      successes: this.successes,
      failures: this.failures,
      timeouts: this.timeouts,
      totalEvents: this.totalEvents,
      totalBytes: this.totalBytes,
      lastLatencyMs: this.lastLatencyMs,
      failuresByType: { ...this.failuresByType },
    };
  }
}

// Process-wide singleton so every Stage instance reports into the same
// counters (matches the getV5Metrics() call shape in Stage.ts).
let singleton: V5Metrics | null = null;

/** Return the process-wide V5 metrics recorder, creating it on first use. */
export function getV5Metrics(): V5Metrics {
  if (!singleton) singleton = new V5Metrics();
  return singleton;
}
