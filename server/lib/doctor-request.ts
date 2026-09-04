// Request-scoped Script Doctor execution — how an Express route runs the
// doctor (2026-09-04, security review finding #1).
//
// ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// server/nvm/analyze/doctor-pool.ts exists to keep one submission from holding
// Node's event loop — and therefore every other user's request — for the whole
// analysis (read its header for the measured history). But "call the pool, not
// the doctor" was a convention carried by one route file, and conventions do
// not survive copy-paste: the 2026-09-04 review found the brand-new
// /api/export/coverage-letter route had been written by copying the UNFIXED
// in-process pattern from server/routes/export.ts rather than the fixed one
// sitting one file over in server/routes/scriptide.ts. Measured on the live
// keyless server, a single unauthenticated POST of a large-but-schema-legal
// script to one of those routes stalled a concurrent GET /health for ~2.6-2.8s;
// the same script through the pool-backed /api/scriptide/doctor left /health at
// ~10ms.
//
// So the pool call, the client-disconnect signal, and the "the client is gone,
// do not answer" branch now live together in ONE named function that every
// doctor-consuming route calls. A route cannot half-adopt it, and
// tests/core/doctor-pool-call-sites.test.ts fails the build if a route file
// imports runScriptDoctor from doctor.ts directly again.
//
// Contract-identical to calling runScriptDoctor in-process: same report, same
// LRU cache, same errors (doctor-pool.ts's own header, "NEVER WORSE THAN
// BEFORE" — if worker threads cannot run in this environment at all, the pool
// silently runs in-process exactly as before). Nothing about the produced
// report changes; only who is blocked while it is produced.

import type { Response } from 'express';
import type { ScriptDoctorReport } from '../nvm/analyze/types.ts';

/**
 * An AbortSignal that fires when the CLIENT gives up on this request — used
 * to cancel off-thread Script Doctor work that nobody is waiting for any more
 * (lane W1; see server/nvm/analyze/doctor-pool.ts).
 *
 * Listens on the RESPONSE, not the request. Since Node 16, `req` emits
 * 'close' as soon as the request stream completes — which, for a POST whose
 * body express already parsed, is immediately — so a req-based signal would
 * abort every analysis the instant it started. `res` emits 'close' exactly
 * once, either after a completed response (writableEnded true, nothing to
 * cancel) or on a genuine disconnect (writableEnded false, cancel), which is
 * the distinction that actually matters.
 */
export function requestAbortSignal(res: Response): AbortSignal {
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });
  return controller.signal;
}

/**
 * Run the Script Doctor for one HTTP request: off the main thread, cancelled
 * if the client hangs up.
 *
 * Returns `undefined` — and NOT an error — when the caller disconnected mid
 * analysis. The only thing that aborts this signal is the client going away
 * (requestAbortSignal fires on res 'close' with the response unsent), so there
 * is no longer anyone to answer and nothing to report as a fault: the route
 * should simply `return`. Letting the AbortError propagate instead would log
 * an error-level event for an ordinary Cancel click and then try to write a
 * response onto a socket that is already gone. Every other failure still
 * throws, unchanged, so asyncHandler's 500 path (and each route's own catch)
 * behaves exactly as it did before.
 *
 * Deep read is deliberately NOT reachable from here: it fans out LLM calls
 * whose budget/abort machinery is main-thread state, so it stays in-process
 * and keeps its own call site — see doctor-pool.ts's header.
 */
export async function runScriptDoctorForRequest(
  fountain: string,
  res: Response,
): Promise<ScriptDoctorReport | undefined> {
  // Dynamic import, matching every route's convention: doctor.ts pulls in the
  // full analyzer + all 14 revision passes, so routes that never analyse
  // anything do not pay for it at startup.
  const { runScriptDoctorOffThread } = await import('../nvm/analyze/doctor-pool.ts');
  try {
    return await runScriptDoctorOffThread(fountain, undefined, { signal: requestAbortSignal(res) });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return undefined;
    throw err;
  }
}
