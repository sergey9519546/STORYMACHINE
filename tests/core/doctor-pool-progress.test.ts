// Script Doctor worker-pool progress relay (lane E1, 2026-08-21).
//
// doctor-worker.ts forwards each DoctorProgressEvent runScriptDoctor fires
// in-worker back to the coordinator over postMessage ('progress' messages),
// and doctor-pool.ts routes them to the PendingJob's own onProgress callback
// without settling the job. This is the off-thread half of the E1 progress
// contract; tests/core/doctor-progress.test.ts covers the in-process half.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import {
  runScriptDoctorOffThread, shutdownDoctorPool, doctorPoolStatus,
} from '../../server/nvm/analyze/doctor-pool.ts';
import type { DoctorProgressEvent } from '../../server/nvm/analyze/types.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';

after(async () => { await shutdownDoctorPool(); });

describe('doctor pool — progress relay', () => {
  it('relays the same set of progress events off-thread as the in-process run fires', async () => {
    const fountain = REFERENCE_CORPUS[0].fountain;

    clearDoctorCache();
    const inProcessEvents: DoctorProgressEvent[] = [];
    await runScriptDoctor(fountain, undefined, { onProgress: e => inProcessEvents.push(e) });

    clearDoctorCache();
    await shutdownDoctorPool();
    const offThreadEvents: DoctorProgressEvent[] = [];
    await runScriptDoctorOffThread(fountain, undefined, { onProgress: e => offThreadEvents.push(e) });

    if (doctorPoolStatus().disabled) return; // fell back in-process — nothing new to prove here

    // Order can legitimately differ (the 14 passes settle concurrently and a
    // structured-clone postMessage hop adds its own scheduling), so compare
    // as multisets keyed by a stable signature rather than by array order.
    const signature = (e: DoctorProgressEvent) =>
      e.type === 'stage' ? `stage:${e.stage}` : `pass_complete:${e.passIndex}`;
    const sortedIn = inProcessEvents.map(signature).sort();
    const sortedOff = offThreadEvents.map(signature).sort();
    assert.deepEqual(sortedOff, sortedIn);
  });

  it('fires no progress events on a coordinator-side cache hit off-thread either', async () => {
    clearDoctorCache();
    const fountain = REFERENCE_CORPUS[1].fountain;
    await runScriptDoctorOffThread(fountain); // populate the cache
    const events: DoctorProgressEvent[] = [];
    await runScriptDoctorOffThread(fountain, undefined, { onProgress: e => events.push(e) });
    assert.deepEqual(events, []);
  });

  it('stops delivering progress for a job once it has been cancelled', async () => {
    clearDoctorCache();
    const controller = new AbortController();
    const events: DoctorProgressEvent[] = [];
    const pending = runScriptDoctorOffThread(
      REFERENCE_CORPUS[2].fountain,
      undefined,
      { signal: controller.signal, onProgress: e => events.push(e) },
    );
    setTimeout(() => controller.abort(), 5);
    await assert.rejects(pending, (err: Error) => err.name === 'AbortError');

    const eventsAtAbort = events.length;
    // The pool must recover and stay progress-capable for the next caller.
    clearDoctorCache();
    const nextEvents: DoctorProgressEvent[] = [];
    const report = await runScriptDoctorOffThread(
      REFERENCE_CORPUS[3].fountain,
      undefined,
      { onProgress: e => nextEvents.push(e) },
    );
    assert.equal(typeof report.health, 'number');
    if (!doctorPoolStatus().disabled) {
      assert.ok(nextEvents.length > 0, 'the pool should still relay progress after a prior cancellation');
    }
    // No event for the cancelled job should have arrived after the abort
    // settled the promise — a late/stale postMessage would grow this.
    assert.equal(events.length, eventsAtAbort);
  });

  it('runs in-process with progress still forwarded, when the pool is disabled', async () => {
    const previous = process.env.DOCTOR_WORKER_POOL;
    process.env.DOCTOR_WORKER_POOL = 'off';
    try {
      clearDoctorCache();
      const events: DoctorProgressEvent[] = [];
      const report = await runScriptDoctorOffThread(
        REFERENCE_CORPUS[4].fountain,
        undefined,
        { onProgress: e => events.push(e) },
      );
      assert.equal(typeof report.health, 'number');
      assert.ok(events.some(e => e.type === 'pass_complete'));
    } finally {
      if (previous === undefined) delete process.env.DOCTOR_WORKER_POOL;
      else process.env.DOCTOR_WORKER_POOL = previous;
    }
  });
});
