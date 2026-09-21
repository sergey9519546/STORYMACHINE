// Script Doctor worker entry (lane W1, 2026-08-21).
//
// Runs on a node:worker_threads thread owned by doctor-pool.ts. Its entire
// job is: receive a request, call runScriptDoctor, post the report back.
//
// Deliberate constraints, all of them load-bearing:
//   * NO logger, and no direct stdout/stderr writes of any kind — this file
//     runs under server/**, where CI greps for the global console object and
//     fails the build on any hit, and the logger's sinks are not worker-safe
//     to assume. Anything the coordinator needs to know travels back over
//     postMessage as structured data.
//   * NO session/DB/Express imports. The doctor is a pure function of
//     (fountain, storyContext, deepRead) — see doctor.ts's own header — so
//     the worker needs nothing else, and keeping it that way is what makes
//     terminating the thread mid-run safe (there is no half-written state to
//     corrupt; the request is simply abandoned).
//   * doctor.ts is imported LAZILY, inside the first request, not at module
//     load. The pool spawns workers eagerly-ish; paying for the analyzer +
//     14 passes at spawn time would move the cost rather than remove it.
//   * A FAILURE TO LOAD doctor.ts IS NOT A FAILED ANALYSIS, and the two must
//     never be reported the same way (C9, 2026-09-19). Until this lane, the
//     lazy import above sat inside the SAME try/catch as runScriptDoctor, so
//     "this environment cannot load the doctor at all" — an exotic loader, a
//     locked-down runtime, a bundler that did not emit the module — came back
//     as an ordinary `{type:'error', id}` for one job. `ready` was never
//     posted, the pool's slot never flipped to ready, no `'error'` event ever
//     fired, so the pool read it as a per-job failure: it rejected the caller,
//     KEPT the slot, and repeated the whole thing on the next request. The
//     product's front door 500'd forever instead of falling back in-process,
//     which is exactly what doctor-pool.ts's property (4) promises it cannot
//     do. A load failure now posts its own `load_failed` message and then
//     exits the thread with DOCTOR_WORKER_LOAD_FAILED_EXIT, so the pool's
//     environment-detection branch runs on the message and, if that message
//     is ever lost, on the exit code behind it.
//
// The report crosses the thread boundary via structured clone. Every field on
// ScriptDoctorReport is plain data (numbers, strings, booleans, arrays, plain
// objects — see analyze/types.ts), which structured clone reproduces exactly,
// including `undefined` values that JSON would silently drop. That exactness
// is what tests/core/doctor-worker-pool.test.ts asserts against an in-process
// run of the same input.

import { parentPort } from 'node:worker_threads';
import type { StoryContext } from '../revision/passes/types.ts';
import type { ScriptDoctorReport, DoctorProgressEvent } from './types.ts';

/** Coordinator -> worker. */
export interface DoctorWorkerRequest {
  id: number;
  fountain: string;
  storyContext?: StoryContext;
  deepRead?: boolean;
}

/** Exit code this worker uses when it could not load doctor.ts at all.
 *
 *  A deliberate `worker.terminate()` (Cancel, a run-budget kill, a privacy
 *  purge, shutdown) exits with 1, and an ordinary end-of-life exit with 0, so
 *  a distinctive code is what lets doctor-pool.ts's `'exit'` handler tell
 *  "this environment cannot host the pool" from every other way a worker can
 *  stop — without guessing from `slot.ready`, which is also false for a
 *  worker cancelled during its very first (cold) job. Imported as a VALUE by
 *  doctor-pool.ts: this module's top level is a single `if (parentPort)`
 *  guard, which is null on the main thread, so loading it there costs
 *  nothing and runs nothing. */
export const DOCTOR_WORKER_LOAD_FAILED_EXIT = 97;

/** The doctor module this worker loads. TEST-ONLY override: pointing
 *  `DOCTOR_WORKER_DOCTOR_MODULE` at a specifier that does not resolve is how
 *  tests/core/doctor-pool-load-failure.test.ts reproduces "this environment
 *  cannot load the doctor" against the REAL worker rather than a hand-written
 *  stand-in for it (a fixture worker would be free to drift from this file,
 *  which is the one thing the test must not allow). Ignored under
 *  NODE_ENV=production, and documented as test-only in README.md. */
function doctorModuleSpecifier(): string {
  const override = process.env.DOCTOR_WORKER_DOCTOR_MODULE;
  if (override && process.env.NODE_ENV !== 'production') return override;
  return './doctor.ts';
}

/** Worker -> coordinator. `ready` is posted once, after the first successful
 *  module load, so the pool can distinguish "this environment cannot load the
 *  doctor at all" (fall back in-process, permanently) from "this one script
 *  threw" (propagate the error, keep the pool).
 *
 *  `load_failed` is the first half of that distinction made EXPLICIT rather
 *  than inferred: it is posted when the lazy `import()` of the doctor module
 *  itself rejects, and it is followed by the thread exiting with
 *  DOCTOR_WORKER_LOAD_FAILED_EXIT. It carries the job id it was about to
 *  serve so the pool can hand that exact caller to the in-process fallback
 *  instead of rejecting it.
 *
 *  `progress` (E1, 2026-08-21): zero or more of these precede a `result` (or
 *  `error`) for the same id — one per DoctorProgressEvent runScriptDoctor's
 *  optional onProgress callback fires (types.ts). Purely a side channel: it
 *  carries the SAME event object the in-process caller would have received,
 *  across the structured-clone boundary, and does not affect what `result`
 *  ends up containing. */
export type DoctorWorkerResponse =
  | { type: 'ready' }
  | { type: 'load_failed'; id: number; name: string; message: string; stack?: string }
  | { type: 'progress'; id: number; event: DoctorProgressEvent }
  | { type: 'result'; id: number; report: ScriptDoctorReport }
  | { type: 'error'; id: number; name: string; message: string; stack?: string };

if (parentPort) {
  const port = parentPort;
  let doctorModule: typeof import('./doctor.ts') | undefined;
  let announcedReady = false;

  port.on('message', (request: DoctorWorkerRequest) => {
    void (async () => {
      // OUTSIDE the analysis try/catch, deliberately — see the header's third
      // constraint. A module that will not load is a property of the
      // ENVIRONMENT, not of this draft, and the pool has a permanent answer
      // for it (fall back in-process, forever) that it can only reach if the
      // two failures arrive as different messages.
      if (!doctorModule) {
        try {
          doctorModule = await import(doctorModuleSpecifier()) as typeof import('./doctor.ts');
        } catch (err) {
          const error = err as Error;
          port.postMessage({
            type: 'load_failed',
            id: request.id,
            name: error?.name ?? 'Error',
            message: error?.message ?? String(err),
            stack: error?.stack,
          } satisfies DoctorWorkerResponse);
          // Exit on the NEXT turn of the loop, not synchronously: the message
          // above has to reach the coordinator's port before this thread
          // stops, because it is the signal the pool acts on (the exit code
          // is only the backstop for it being lost). Non-zero, and its own
          // code, so the `'exit'` handler can recognise this case without
          // mistaking a cancelled cold job for it.
          setTimeout(() => process.exit(DOCTOR_WORKER_LOAD_FAILED_EXIT), 0);
          return;
        }
      }
      try {
        if (!announcedReady) {
          announcedReady = true;
          port.postMessage({ type: 'ready' } satisfies DoctorWorkerResponse);
        }
        const report = await doctorModule.runScriptDoctor(
          request.fountain,
          request.storyContext,
          {
            ...(request.deepRead ? { deepRead: true } : {}),
            onProgress: event => port.postMessage({ type: 'progress', id: request.id, event } satisfies DoctorWorkerResponse),
          },
        );
        port.postMessage({ type: 'result', id: request.id, report } satisfies DoctorWorkerResponse);
      } catch (err) {
        const error = err as Error;
        port.postMessage({
          type: 'error',
          id: request.id,
          name: error?.name ?? 'Error',
          message: error?.message ?? String(err),
          stack: error?.stack,
        } satisfies DoctorWorkerResponse);
      }
    })();
  });
}
