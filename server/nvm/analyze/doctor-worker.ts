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
//
// The report crosses the thread boundary via structured clone. Every field on
// ScriptDoctorReport is plain data (numbers, strings, booleans, arrays, plain
// objects — see analyze/types.ts), which structured clone reproduces exactly,
// including `undefined` values that JSON would silently drop. That exactness
// is what tests/core/doctor-worker-pool.test.ts asserts against an in-process
// run of the same input.

import { parentPort } from 'node:worker_threads';
import type { StoryContext } from '../revision/passes/types.ts';
import type { ScriptDoctorReport } from './types.ts';

/** Coordinator -> worker. */
export interface DoctorWorkerRequest {
  id: number;
  fountain: string;
  storyContext?: StoryContext;
  deepRead?: boolean;
}

/** Worker -> coordinator. `ready` is posted once, after the first successful
 *  module load, so the pool can distinguish "this environment cannot load the
 *  doctor at all" (fall back in-process, permanently) from "this one script
 *  threw" (propagate the error, keep the pool). */
export type DoctorWorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; report: ScriptDoctorReport }
  | { type: 'error'; id: number; name: string; message: string; stack?: string };

if (parentPort) {
  const port = parentPort;
  let doctorModule: typeof import('./doctor.ts') | undefined;
  let announcedReady = false;

  port.on('message', (request: DoctorWorkerRequest) => {
    void (async () => {
      try {
        if (!doctorModule) doctorModule = await import('./doctor.ts');
        if (!announcedReady) {
          announcedReady = true;
          port.postMessage({ type: 'ready' } satisfies DoctorWorkerResponse);
        }
        const report = await doctorModule.runScriptDoctor(
          request.fountain,
          request.storyContext,
          request.deepRead ? { deepRead: true } : undefined,
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
