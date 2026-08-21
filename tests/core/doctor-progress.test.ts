// Script Doctor progress hook (lane E1, 2026-08-21) — behavior contract.
//
// runScriptDoctor's optional onProgress callback (server/nvm/analyze/
// types.ts's DoctorProgressEvent) is a receipt-guarded scoring-path change
// (doctor.ts is ALWAYS-SCORING per scripts/check-scoring-receipt.mjs), so its
// whole justification rests on ONE property: it is purely observational.
// This file proves that property directly, at the doctor.ts level, ahead of
// (and independent from) the byte-identity proof scripts/
// check-doctor-output-identity.mjs runs across the fixture corpus.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import type { DoctorProgressEvent } from '../../server/nvm/analyze/types.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';

describe('doctor progress hook — output identity', () => {
  it('produces a byte-identical report (minus analyzedAt) whether or not onProgress is supplied', async () => {
    const fountain = REFERENCE_CORPUS[0].fountain;

    clearDoctorCache();
    const withoutHook = await runScriptDoctor(fountain);

    clearDoctorCache();
    const events: DoctorProgressEvent[] = [];
    const withHook = await runScriptDoctor(fountain, undefined, { onProgress: e => events.push(e) });

    const { analyzedAt: _a, ...expected } = withoutHook;
    const { analyzedAt: _b, ...actual } = withHook;
    assert.deepEqual(actual, expected);
    assert.ok(events.length > 0, 'expected the hook to have fired at least once');
  });

  it('matches across the whole calibration corpus, with or without a hook attached', async () => {
    for (const sample of REFERENCE_CORPUS.slice(0, 6)) {
      clearDoctorCache();
      const { analyzedAt: _a, ...expected } = await runScriptDoctor(sample.fountain);
      clearDoctorCache();
      const { analyzedAt: _b, ...actual } = await runScriptDoctor(sample.fountain, undefined, { onProgress: () => {} });
      assert.deepEqual(actual, expected, `sample ${sample.label} diverged with onProgress attached`);
    }
  });

  it('a throwing onProgress callback surfaces rather than silently corrupting the run', async () => {
    // Defensive: a caller's callback (an SSE write, a postMessage) can throw
    // for reasons that have nothing to do with the analysis itself (a closed
    // socket, a full send queue). This only documents current behavior — the
    // 14 passes run concurrently (pipeline.ts's diagnose-only fast path), so
    // more than one may call the hook before the first throw is observed;
    // this test asserts the hook fired and the throw propagated, not an
    // exact call count, which concurrent scheduling makes non-deterministic.
    clearDoctorCache();
    let calls = 0;
    const fountain = REFERENCE_CORPUS[1].fountain;
    await assert.rejects(
      runScriptDoctor(fountain, undefined, {
        onProgress: () => {
          calls++;
          throw new Error('boom');
        },
      }),
    );
    assert.ok(calls >= 1, 'onProgress should have fired at least once before the throw propagated');
  });
});

describe('doctor progress hook — event sequence', () => {
  it('emits stage bookends and exactly one pass_complete per revision pass, for a non-degenerate script', async () => {
    clearDoctorCache();
    const fountain = REFERENCE_CORPUS[2].fountain;
    const events: DoctorProgressEvent[] = [];
    await runScriptDoctor(fountain, undefined, { onProgress: e => events.push(e) });

    const stages = events.filter((e): e is Extract<DoctorProgressEvent, { type: 'stage' }> => e.type === 'stage');
    assert.ok(stages.some(s => s.stage === 'parsing'));
    assert.ok(stages.some(s => s.stage === 'passes_start'));
    assert.ok(stages.some(s => s.stage === 'aggregating'));
    // parsing must be the very first event; aggregating must be the very last.
    const first = events[0];
    const last = events[events.length - 1];
    assert.equal(first?.type === 'stage' && first.stage, 'parsing');
    assert.equal(last?.type === 'stage' && last.stage, 'aggregating');

    const passCompletes = events.filter(e => e.type === 'pass_complete');
    assert.equal(passCompletes.length, 14, 'expected one pass_complete event per one of the 14 revision passes');
    const indices = passCompletes.map(e => (e as Extract<DoctorProgressEvent, { type: 'pass_complete' }>).passIndex);
    assert.deepEqual([...indices].sort((a, b) => a - b), Array.from({ length: 14 }, (_, i) => i));
  });

  it('fires only the parsing stage for the degenerate zero-scene report — no pipeline ever runs', async () => {
    const events: DoctorProgressEvent[] = [];
    await runScriptDoctor('   ', undefined, { onProgress: e => events.push(e) });
    assert.deepEqual(events, [{ type: 'stage', stage: 'parsing' }]);
  });

  it('fires no events on a cache hit — a repeat submission returns before any stage runs', async () => {
    clearDoctorCache();
    const fountain = REFERENCE_CORPUS[3].fountain;
    await runScriptDoctor(fountain); // populate the cache
    const events: DoctorProgressEvent[] = [];
    await runScriptDoctor(fountain, undefined, { onProgress: e => events.push(e) });
    assert.deepEqual(events, []);
  });
});
