// DOCTOR_POOL_PREWARM_BEFORE_LISTEN — 2026-09-04 ops audit finding A,
// follow-up. GET /ready (tests/routes/ready.test.ts) lets an orchestrator
// hold traffic back during the Script Doctor worker pool's ~2.1-2.7s
// boot-time pre-warm without the process itself booting any slower. Some
// single-process deployments have no such orchestrator in front of them and
// would rather the port simply not open until the pool is warm. This flag
// (default OFF) is that trade: server.ts's awaitPrewarmBeforeListenIfConfigured()
// AWAITS the pre-warm before app.listen() is ever called when set.
//
// Rather than importing server.ts's real startServer() (which binds a live
// port, creates real sessions, and registers process signal handlers —
// unnecessary here and actively unwanted in a unit test, per
// tests/routes/hardening.test.ts's own documented reasoning for the same
// choice), this file exercises the extracted, directly-testable function
// with an injected fake warm function — proving the ordering ("listen is
// delayed until warm when set") without spawning a real worker thread or
// binding a real port.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { awaitPrewarmBeforeListenIfConfigured, prewarmBeforeListenEnabled } from '../../server.ts';

const ENV_KEY = 'DOCTOR_POOL_PREWARM_BEFORE_LISTEN';
let snapshot: string | undefined;

beforeEach(() => { snapshot = process.env[ENV_KEY]; });
afterEach(() => {
  if (snapshot === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = snapshot;
});

describe('awaitPrewarmBeforeListenIfConfigured', () => {
  it('is a no-op when the flag is unset — never invokes warmFn, resolves immediately', async () => {
    delete process.env[ENV_KEY];
    let called = false;
    await awaitPrewarmBeforeListenIfConfigured(async () => { called = true; });
    assert.equal(called, false, 'default boot path must never call warmFn — byte-identical to before this flag existed');
  });

  it('is a no-op for any value other than "1" or "true"', async () => {
    for (const value of ['0', 'yes', 'TRUE', '']) {
      process.env[ENV_KEY] = value;
      let called = false;
      // eslint-disable-next-line no-await-in-loop
      await awaitPrewarmBeforeListenIfConfigured(async () => { called = true; });
      assert.equal(called, false, `value ${JSON.stringify(value)} must not enable the flag`);
    }
  });

  it('when set to "1": awaits warmFn before resolving — listen is delayed until warm', async () => {
    process.env[ENV_KEY] = '1';

    let releaseWarm: () => void = () => {};
    const gate = new Promise<void>((resolve) => { releaseWarm = resolve; });
    let warmResolved = false;
    let callerResolved = false;

    const pending = awaitPrewarmBeforeListenIfConfigured(async () => {
      await gate;
      warmResolved = true;
    }).then(() => { callerResolved = true; });

    // Give the microtask queue a turn — the caller must still be pending,
    // exactly the "port has not opened yet" state this flag exists to
    // produce, since the injected warm function hasn't resolved.
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(warmResolved, false, 'precondition: warm function has not resolved yet');
    assert.equal(callerResolved, false, 'awaitPrewarmBeforeListenIfConfigured must not resolve before warmFn does');

    releaseWarm();
    await pending;
    assert.equal(warmResolved, true);
    assert.equal(callerResolved, true, 'must resolve once warmFn resolves');
  });

  it('when set to "true": behaves the same as "1"', async () => {
    process.env[ENV_KEY] = 'true';
    let called = false;
    await awaitPrewarmBeforeListenIfConfigured(async () => { called = true; });
    assert.equal(called, true);
  });

  it('propagates a rejection from warmFn rather than swallowing it', async () => {
    process.env[ENV_KEY] = '1';
    await assert.rejects(
      awaitPrewarmBeforeListenIfConfigured(async () => { throw new Error('simulated warm-up failure'); }),
      /simulated warm-up failure/,
    );
  });
});

// 2026-09-04 follow-up review item 5 — the accepted-value predicate is now a
// single exported function (prewarmBeforeListenEnabled()), used both by
// awaitPrewarmBeforeListenIfConfigured() above and by startServer()'s own
// "did the pre-warm already run before listen?" check, so the two call
// sites cannot silently disagree into a double-warm or a no-warm.
describe('prewarmBeforeListenEnabled', () => {
  it('agrees with awaitPrewarmBeforeListenIfConfigured\'s own decision to call (or skip) warmFn', async () => {
    for (const [value, expected] of [
      [undefined, false], ['', false], ['0', false], ['yes', false], ['TRUE', false],
      ['1', true], ['true', true],
    ] as const) {
      if (value === undefined) delete process.env[ENV_KEY];
      else process.env[ENV_KEY] = value;

      assert.equal(prewarmBeforeListenEnabled(), expected, `value ${JSON.stringify(value)}`);

      let called = false;
      // eslint-disable-next-line no-await-in-loop
      await awaitPrewarmBeforeListenIfConfigured(async () => { called = true; });
      assert.equal(called, expected, `awaitPrewarmBeforeListenIfConfigured for value ${JSON.stringify(value)} must match prewarmBeforeListenEnabled()`);
    }
  });
});
