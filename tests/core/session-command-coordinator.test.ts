import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { SessionCommandCoordinator } from '../../server/lib/session-store.ts';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void } {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('SessionCommandCoordinator', () => {
  it('runs one session FIFO, survives rejection, and permits another session concurrently', async () => {
    const firstSession = new SessionCommandCoordinator();
    const secondSession = new SessionCommandCoordinator();
    const order: string[] = [];
    const release = deferred<void>();

    const first = firstSession.run(async () => {
      order.push('first-start');
      await release.promise;
      order.push('first-end');
    });
    const rejected = firstSession.run(async () => {
      order.push('second');
      throw new Error('expected command failure');
    });
    const third = firstSession.run(async () => {
      order.push('third');
    });
    const otherSession = secondSession.run(async () => {
      order.push('other-session');
    });

    await otherSession;
    assert.deepEqual(order, ['first-start', 'other-session'], 'another session must not wait behind the first');

    release.resolve();
    await first;
    await assert.rejects(rejected, /expected command failure/);
    await third;
    assert.deepEqual(order, ['first-start', 'other-session', 'first-end', 'second', 'third']);
  });
});
