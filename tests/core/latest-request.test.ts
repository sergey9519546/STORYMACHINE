// Unit coverage for the framework-agnostic latest-request core
// (src/hooks/latest-request.ts). Exercises the CORE directly — no React, no
// render harness (this repo has no jsdom, see CLAUDE.md), which is exactly why
// the guard was extracted into a React-free module.
//
// The three hazards it must close:
//   (a) out-of-order — a slow earlier run's result must not overwrite a faster
//       later run's result;
//   (b) supersede — a new run must abort the previous run's AbortSignal (so the
//       superseded fetch is actually cancelled);
//   (c) dispose — after dispose(), an in-flight run that resolves late fires
//       nothing.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLatestRequest } from '../../src/hooks/latest-request.ts';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Let the microtask queue drain so any .then() reactions have run.
const flush = (): Promise<void> => new Promise((r) => setImmediate(r));

describe('createLatestRequest — latest-wins request core', () => {
  it('(a) out-of-order: a slow earlier run is dropped once a faster later run supersedes it', async () => {
    const core = createLatestRequest();
    const a = deferred<string>();
    const b = deferred<string>();
    const results: string[] = [];
    const errors: unknown[] = [];

    // Run A ignores its signal, so it can still resolve late (this isolates the
    // GENERATION guard from the abort behaviour tested in (b)).
    core.run(() => a.promise, {
      onResult: (r) => results.push(r),
      onError: (e) => errors.push(e),
    });
    core.run(() => b.promise, {
      onResult: (r) => results.push(r),
      onError: (e) => errors.push(e),
    });

    // B (the newer run) resolves first…
    b.resolve('B');
    await flush();
    // …then A (the older, slower run) resolves late and must be ignored.
    a.resolve('A');
    await flush();

    assert.deepEqual(results, ['B'], 'only the latest run may deliver a result');
    assert.deepEqual(errors, []);
  });

  it('(b) supersede: a new run aborts the previous run’s AbortSignal', () => {
    const core = createLatestRequest();
    let signalA: AbortSignal | undefined;

    core.run(
      (signal) => {
        signalA = signal;
        return new Promise<never>(() => {}); // never settles
      },
      { onResult: () => {} },
    );
    assert.equal(signalA?.aborted, false, 'the first run starts with a live signal');

    core.run(() => Promise.resolve('B'), { onResult: () => {} });
    assert.equal(signalA?.aborted, true, 'starting a new run aborts the previous run’s signal');
  });

  it('(c) dispose: after dispose(), a late resolve fires nothing (and the in-flight signal is aborted)', async () => {
    const core = createLatestRequest();
    const a = deferred<string>();
    let signalA: AbortSignal | undefined;
    const results: string[] = [];
    const errors: unknown[] = [];

    core.run(
      (signal) => {
        signalA = signal;
        return a.promise;
      },
      { onResult: (r) => results.push(r), onError: (e) => errors.push(e) },
    );

    core.dispose();
    assert.equal(signalA?.aborted, true, 'dispose() aborts the in-flight signal');

    a.resolve('late');
    await flush();

    assert.deepEqual(results, [], 'a disposed core delivers no result');
    assert.deepEqual(errors, [], 'a disposed core delivers no error either');
  });

  it('routes a rejection to onError for the latest (undisposed) run', async () => {
    const core = createLatestRequest();
    const errors: unknown[] = [];

    core.run(() => Promise.reject(new Error('boom')), {
      onResult: () => assert.fail('onResult must not fire for a rejected run'),
      onError: (e) => errors.push(e),
    });
    await flush();

    assert.equal(errors.length, 1);
    assert.equal((errors[0] as Error).message, 'boom');
  });

  it('swallows a superseded run’s rejection (no spurious error surfaces)', async () => {
    const core = createLatestRequest();
    const a = deferred<string>();
    const results: string[] = [];
    const errors: unknown[] = [];

    core.run(() => a.promise, {
      onResult: (r) => results.push(r),
      onError: (e) => errors.push(e),
    });
    core.run(() => Promise.resolve('B'), {
      onResult: (r) => results.push(r),
      onError: (e) => errors.push(e),
    });

    await flush();
    // The superseded run rejects late (as an aborted fetch would) — it must be
    // dropped, not painted as an error over the newer run's result.
    a.reject(new Error('aborted'));
    await flush();

    assert.deepEqual(results, ['B']);
    assert.deepEqual(errors, []);
  });

  it('a synchronous throw from the factory is routed to onError for the latest run', async () => {
    const core = createLatestRequest();
    const errors: unknown[] = [];

    core.run<string>(
      () => {
        throw new Error('sync-throw');
      },
      { onResult: () => assert.fail('onResult must not fire'), onError: (e) => errors.push(e) },
    );
    await flush();

    assert.equal(errors.length, 1);
    assert.equal((errors[0] as Error).message, 'sync-throw');
  });
});
