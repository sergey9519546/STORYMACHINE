// Process-wide draining flag for GET /ready (server/routes/config.ts) —
// 2026-09-04 ops audit, follow-up review item 6 (owner rule: finish it).
//
// WHY A SEPARATE FILE. createShutdownHandler() (server.ts) must flip this
// flag the INSTANT a graceful shutdown begins — before server.close() ever
// runs — so a load balancer polling /ready sees 503 and stops routing new
// traffic before the socket itself starts refusing connections. That flag
// has to be readable from server/routes/config.ts's /ready handler. Reading
// it from server.ts directly would create an import cycle: server.ts
// imports createApp from server/app.ts, which mounts
// server/routes/config.ts's router — so routes/config.ts importing back
// from server.ts would close the loop. A small standalone leaf module
// avoids that entirely: server.ts and routes/config.ts each import this
// file; neither imports the other.
//
// Deliberately NOT exported from doctor-pool.ts alongside the warm-up
// state: draining is an orthogonal signal (shutdown-driven, not pool-driven)
// and /ready's handler checks it FIRST, independent of pool warmth — a
// draining-but-still-warm process must still answer 503, since the whole
// point is "stop sending me new work," not "am I ready."

let draining = false;

/** Called by createShutdownHandler() the moment a graceful (or crash-driven)
 *  shutdown begins. Idempotent — safe to call more than once (SIGTERM then
 *  SIGINT, say) or with an explicit false to reset. */
export function setDraining(value = true): void {
  draining = value;
}

/** Read by GET /ready — true from the instant shutdown begins until the
 *  process exits (there is no "un-draining" in production; `value` exists
 *  on setDraining() only for symmetry with resetDrainingForTests()). */
export function isDraining(): boolean {
  return draining;
}

/** Test-only reset, mirroring doctor-pool.ts's resetDoctorPoolWarmStateForTests(). */
export function resetDrainingForTests(): void {
  draining = false;
}
