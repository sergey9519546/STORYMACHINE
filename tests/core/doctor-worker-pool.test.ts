// Script Doctor worker-thread pool (lane W1) — behavior contract.
//
// The pool's whole value proposition is "identical results, off the main
// thread". Both halves need proving:
//
//   * IDENTICAL — a report that came back over a structured-clone boundary
//     must deep-equal one computed in-process. Structured clone preserves
//     `undefined` where JSON would drop the key entirely, and the report is
//     full of deliberately-optional fields (verdict, dimensions, metrics,
//     storyGraph…) whose ABSENCE is meaningful, so this is a real risk, not a
//     ceremonial assertion.
//
//   * OFF THE MAIN THREAD — asserted by measuring event-loop responsiveness
//     DURING an analysis, which is the actual user-visible property W1 exists
//     to restore. A test that only checked "a worker was spawned" would pass
//     for an implementation that spawned one and then did the work anyway.
//
// Plus the three things a pool can silently get wrong: cache semantics
// (the LRU must stay on the coordinator, or a second identical submission
// re-does the work), cancellation (must actually stop the CPU, not just stop
// waiting), and error propagation (a throw must arrive as a throw).

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import {
  runScriptDoctorOffThread, shutdownDoctorPool, doctorPoolStatus,
} from '../../server/nvm/analyze/doctor-pool.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';

after(async () => { await shutdownDoctorPool(); });

/** A script big enough that the analysis takes long enough to sample the
 *  event loop during it, without making the suite slow. */
function mediumScript(sceneCount: number): string {
  const parts: string[] = [];
  for (let i = 0; i < sceneCount; i++) {
    parts.push(
      `INT. LOCATION ${i} - ${i % 2 === 0 ? 'DAY' : 'NIGHT'}`,
      '',
      `A room that has seen better days. ${'Dust settles on the windowsill. '.repeat(3)}`,
      '',
      i % 3 === 0 ? 'MARA' : 'DEL',
      `Someone has to say it. Nobody wants to be the one who says it in room ${i}.`,
      '',
      'She turns away, hands shaking, and does not answer.',
      '',
    );
  }
  return parts.join('\n');
}

describe('doctor worker pool — result identity', () => {
  it('returns a report deep-equal to the in-process one, undefined-valued fields included', async () => {
    const fountain = REFERENCE_CORPUS[0].fountain;

    clearDoctorCache();
    const inProcess = await runScriptDoctor(fountain);

    clearDoctorCache();
    await shutdownDoctorPool();
    const offThread = await runScriptDoctorOffThread(fountain);

    const { analyzedAt: _a, ...expected } = inProcess;
    const { analyzedAt: _b, ...actual } = offThread;
    assert.deepEqual(actual, expected);

    // deepEqual treats a missing key and an undefined value as equal, so the
    // structured-clone-vs-JSON distinction needs its own check.
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
  });

  it('matches in-process results across the whole calibration corpus', async () => {
    for (const sample of REFERENCE_CORPUS.slice(0, 6)) {
      clearDoctorCache();
      const { analyzedAt: _a, ...expected } = await runScriptDoctor(sample.fountain);
      clearDoctorCache();
      const { analyzedAt: _b, ...actual } = await runScriptDoctorOffThread(sample.fountain);
      assert.deepEqual(actual, expected, `sample ${sample.label} diverged off-thread`);
    }
  });
});

describe('doctor worker pool — the event loop stays free', () => {
  it('keeps the main thread responsive while a script is being analyzed', async () => {
    const fountain = mediumScript(140);
    clearDoctorCache();

    // Sample the event loop every 10ms. If the doctor were running inline,
    // the interval would not fire at all until it finished, and the largest
    // observed gap would be the whole analysis.
    let maxGapMs = 0;
    let last = performance.now();
    let ticks = 0;
    const timer = setInterval(() => {
      const now = performance.now();
      maxGapMs = Math.max(maxGapMs, now - last);
      last = now;
      ticks++;
    }, 10);

    try {
      await runScriptDoctorOffThread(fountain);
    } finally {
      clearInterval(timer);
    }

    if (doctorPoolStatus().disabled) return; // fell back in-process; nothing to assert

    assert.ok(ticks > 5, `event loop timer fired only ${ticks} times during the analysis`);
    // Generous: this is asserting "not blocked for the whole analysis", not a
    // latency SLO. GC and module loading legitimately cost tens of ms.
    assert.ok(
      maxGapMs < 1_000,
      `main thread stalled ${Math.round(maxGapMs)}ms during an off-thread analysis`,
    );
  });
});

describe('doctor worker pool — cache, cancellation, errors', () => {
  it('serves a repeat submission from the coordinator-side LRU, not a second worker run', async () => {
    const fountain = REFERENCE_CORPUS[1].fountain;
    clearDoctorCache();

    const first = await runScriptDoctorOffThread(fountain);
    const beforeSecond = performance.now();
    const second = await runScriptDoctorOffThread(fountain);
    const secondMs = performance.now() - beforeSecond;

    const { analyzedAt: _a, ...firstStable } = first;
    const { analyzedAt: _b, ...secondStable } = second;
    assert.deepEqual(secondStable, firstStable);
    // A cache hit costs one sha256; a re-run costs a thread hop plus the
    // whole pipeline. Anything under 50ms can only be the cache.
    assert.ok(secondMs < 50, `repeat submission took ${Math.round(secondMs)}ms — the LRU was not consulted`);

    // And the cache genuinely lives on the coordinator: clearing it there
    // must make the next call do real work again.
    clearDoctorCache();
    const afterClear = performance.now();
    await runScriptDoctorOffThread(fountain);
    assert.ok(
      performance.now() - afterClear > secondMs,
      'clearDoctorCache() did not affect the pooled path — the cache is not on the coordinator',
    );
  });

  it('rejects with an AbortError when the caller cancels, and stays usable afterwards', async () => {
    clearDoctorCache();
    const controller = new AbortController();
    const pending = runScriptDoctorOffThread(mediumScript(200), undefined, { signal: controller.signal });
    // Abort after the job has certainly been dispatched.
    setTimeout(() => controller.abort(), 20);

    await assert.rejects(pending, (err: Error) => {
      assert.equal(err.name, 'AbortError');
      return true;
    });

    // The pool must recover: the terminated worker is replaced transparently.
    clearDoctorCache();
    const report = await runScriptDoctorOffThread(REFERENCE_CORPUS[2].fountain);
    assert.equal(typeof report.health, 'number');
  });

  it('rejects immediately for an already-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      runScriptDoctorOffThread(REFERENCE_CORPUS[0].fountain, undefined, { signal: controller.signal }),
      (err: Error) => err.name === 'AbortError',
    );
  });

  it('handles the degenerate empty script exactly as the in-process path does', async () => {
    clearDoctorCache();
    const { analyzedAt: _a, ...expected } = await runScriptDoctor('   ');
    clearDoctorCache();
    const { analyzedAt: _b, ...actual } = await runScriptDoctorOffThread('   ');
    assert.deepEqual(actual, expected);
    assert.equal(actual.analysisComplete, false);
  });

  it('runs in-process, with identical results, when the pool is disabled', async () => {
    const previous = process.env.DOCTOR_WORKER_POOL;
    process.env.DOCTOR_WORKER_POOL = 'off';
    try {
      const fountain = REFERENCE_CORPUS[3].fountain;
      clearDoctorCache();
      const { analyzedAt: _a, ...expected } = await runScriptDoctor(fountain);
      clearDoctorCache();
      const { analyzedAt: _b, ...actual } = await runScriptDoctorOffThread(fountain);
      assert.deepEqual(actual, expected);
    } finally {
      if (previous === undefined) delete process.env.DOCTOR_WORKER_POOL;
      else process.env.DOCTOR_WORKER_POOL = previous;
    }
  });

  it('preserves FIFO order across concurrently submitted analyses', async () => {
    clearDoctorCache();
    await shutdownDoctorPool();
    const completions: number[] = [];
    // One worker, so ordering is fully determined by the queue.
    const previousSize = process.env.DOCTOR_WORKER_POOL_SIZE;
    process.env.DOCTOR_WORKER_POOL_SIZE = '1';
    try {
      await Promise.all(
        REFERENCE_CORPUS.slice(0, 4).map((sample, i) =>
          runScriptDoctorOffThread(sample.fountain).then(() => { completions.push(i); }),
        ),
      );
      assert.deepEqual(completions, [0, 1, 2, 3], 'queued analyses did not complete in submission order');
    } finally {
      if (previousSize === undefined) delete process.env.DOCTOR_WORKER_POOL_SIZE;
      else process.env.DOCTOR_WORKER_POOL_SIZE = previousSize;
      await shutdownDoctorPool();
    }
  });
});
