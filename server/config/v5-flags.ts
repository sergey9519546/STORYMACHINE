// V5.0 Phase 1 feature flags — EventStore shadow-write configuration.
//
// PROVENANCE: commit aacd715 ("Finalize all V5.0 systems") wired
// server/engine/Stage.ts to import getV5Phase1Config / getV5Metrics /
// commitToEvents from three modules that were never actually committed, which
// made server.ts crash on boot (ERR_MODULE_NOT_FOUND) — the real cause of the
// P0 fielding blocker previously misfiled as a "port binding" problem. This
// module restores boot with the V5 shadow-write feature DEFAULT-OFF, so the
// keyless deterministic front door works again and the dormant V5 API surface
// is preserved for a future, properly-committed EventStore integration.
//
// SAFETY: every flag defaults false/inert. Nothing here enables writes, LLM
// calls, or any behavior change to the shipped verdict path. The shadow-write
// path in Stage.ts is a no-op while `eventStoreShadow` is false, which it is
// unless an operator explicitly opts in via the environment.

/** Phase-1 shadow-write configuration consumed by server/engine/Stage.ts. */
export interface V5Phase1Config {
  /** Master switch for EventStore shadow writes. Default OFF. */
  eventStoreShadow: boolean;
  /** Emit success/failure/timeout metrics for shadow writes. Default OFF. */
  enableMetrics: boolean;
  /** Emit shadow-write diagnostic logs. Default OFF (also keeps CI's
   *  no-console-in-server rule happy, since the log sites are dead while OFF). */
  enableLogging: boolean;
  /** Per-commit shadow-write timeout guard, in milliseconds. */
  shadowWriteTimeoutMs: number;
}

// A boolean env var is "on" only for the explicit truthy tokens below; any
// other value (including unset) is false. Kept local + tiny so this module has
// zero import cost on the boot path.
function envFlag(name: string): boolean {
  const v = process.env[name];
  return v === '1' || v === 'true' || v === 'TRUE';
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Resolve the Phase-1 config from the environment. Pure aside from reading
 * process.env; returns a fresh object each call so callers can cache one
 * instance (Stage.ts holds it as a per-instance field). All flags are OFF
 * unless explicitly enabled, so the default return is fully inert.
 */
export function getV5Phase1Config(): V5Phase1Config {
  const eventStoreShadow = envFlag('V5_EVENTSTORE_SHADOW');
  return {
    eventStoreShadow,
    // Metrics/logging can only matter when the shadow path is live; keep them
    // subordinate to the master switch so a stray env var can't turn on log
    // spam or metric recording while the feature itself is off.
    enableMetrics: eventStoreShadow && envFlag('V5_ENABLE_METRICS'),
    enableLogging: eventStoreShadow && envFlag('V5_ENABLE_LOGGING'),
    shadowWriteTimeoutMs: envInt('V5_SHADOW_TIMEOUT_MS', 50),
  };
}
