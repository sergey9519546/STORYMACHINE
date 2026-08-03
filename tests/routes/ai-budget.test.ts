// Unit tests for server/lib/ai-budget.ts — the request-scoped provider-attempt
// and wall-clock budget. Lives in tests/routes/ (not tests/core/) because this
// session's slice excludes tests/core/**; the module itself has no HTTP
// surface, so these are plain node:test unit tests, not route/HTTP tests —
// see tests/routes/route-capabilities.test.ts and the per-route wiring tests
// in game.test.ts/config.test.ts/etc. for the HTTP-level proof that routes
// actually use this module.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  withAiBudget, consumeAiAttempt, currentAiAttempts, isAiBudgetExceededError,
  runWithBudgetContext, withDeadline, raceDeadline, withCountedAttempts,
  AiBudgetExceededError, aiBudgetEnvNumber,
} from '../../server/lib/ai-budget.ts';

describe('server/lib/ai-budget — consumeAiAttempt / withAiBudget', () => {
  it('consumeAiAttempt is a no-op with no active budget context (opt-in, never breaks unwired call sites)', () => {
    assert.doesNotThrow(() => consumeAiAttempt());
    assert.equal(currentAiAttempts(), 0);
  });

  it('a fake provider that counts calls is stopped exactly at the ceiling — the budget actually prevents the next call, not just logs it', async () => {
    let calls = 0;
    const fakeProvider = async () => {
      consumeAiAttempt(); // called by the "route" immediately before each attempt
      calls++;
      return calls;
    };

    let caughtCode: string | undefined;
    await withAiBudget({ maxAttempts: 3, timeoutMs: 5000, label: 'fanout-test' }, async () => {
      for (let i = 0; i < 10; i++) {
        try {
          await fakeProvider();
        } catch (e) {
          assert.ok(isAiBudgetExceededError(e));
          caughtCode = (e as AiBudgetExceededError).code;
          break;
        }
      }
    });

    assert.equal(calls, 3, 'fan-out must stop exactly at the ceiling — the 4th call must never be made');
    assert.equal(caughtCode, 'AI_BUDGET_ATTEMPTS_EXCEEDED');
  });

  it('withAiBudget itself rejects when the wrapped operation never catches the attempts-exceeded throw', async () => {
    let calls = 0;
    await assert.rejects(
      withAiBudget({ maxAttempts: 2, timeoutMs: 5000, label: 'uncaught-fanout' }, async () => {
        for (let i = 0; i < 5; i++) {
          consumeAiAttempt();
          calls++;
        }
      }),
      (e: unknown) => isAiBudgetExceededError(e) && (e as AiBudgetExceededError).code === 'AI_BUDGET_ATTEMPTS_EXCEEDED',
    );
    assert.equal(calls, 2, 'exactly maxAttempts calls happen before the 3rd throws and aborts the loop');
  });

  it('isolates concurrent budget contexts from each other (AsyncLocalStorage per-request scoping)', async () => {
    const counts: Record<string, number> = {};
    const runFanout = async (label: string, maxAttempts: number) => {
      await withAiBudget({ maxAttempts, timeoutMs: 5000, label }, async () => {
        let n = 0;
        for (let i = 0; i < 6; i++) {
          try { consumeAiAttempt(); n++; } catch { break; }
        }
        counts[label] = n;
      });
    };
    await Promise.all([runFanout('req-a', 2), runFanout('req-b', 4)]);
    assert.equal(counts['req-a'], 2);
    assert.equal(counts['req-b'], 4);
  });

  it('rejects with a deadline error when the operation hangs past timeoutMs, without waiting for it to finish', async () => {
    const start = Date.now();
    const hangingOp = () => new Promise<never>(() => { /* never resolves */ });
    await assert.rejects(
      withAiBudget({ maxAttempts: 10, timeoutMs: 30, label: 'deadline-test' }, hangingOp),
      (e: unknown) => isAiBudgetExceededError(e) && (e as AiBudgetExceededError).code === 'AI_BUDGET_DEADLINE_EXCEEDED',
    );
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 1000, `deadline rejection should fire promptly (~30ms budget), took ${elapsed}ms`);
  });

  it('consumeAiAttempt also refuses a new attempt once the deadline has already passed, even with attempts remaining', async () => {
    let calls = 0;
    await assert.rejects(
      withAiBudget({ maxAttempts: 100, timeoutMs: 20, label: 'deadline-vs-attempts' }, async () => {
        consumeAiAttempt();
        calls++;
        await new Promise(r => setTimeout(r, 60)); // outlast the 20ms deadline
        consumeAiAttempt(); // must throw: budget deadline already elapsed
        calls++;
      }),
      (e: unknown) => isAiBudgetExceededError(e) && (e as AiBudgetExceededError).code === 'AI_BUDGET_DEADLINE_EXCEEDED',
    );
    assert.equal(calls, 1, 'the second attempt must never be counted once the deadline has elapsed');
  });

  it('propagates the operation\'s own error untouched when it fails before either budget dimension is exceeded', async () => {
    await assert.rejects(
      withAiBudget({ maxAttempts: 5, timeoutMs: 5000, label: 'real-failure' }, async () => {
        consumeAiAttempt();
        throw new Error('upstream provider 500');
      }),
      /upstream provider 500/,
    );
  });
});

describe('server/lib/ai-budget — withCountedAttempts (dependency-injection seam)', () => {
  it('wraps an injected generator so the real function is never invoked past the ceiling', async () => {
    let realCalls = 0;
    const realGenerator = async (n: number) => { realCalls++; return n * 2; };

    await assert.rejects(
      withAiBudget({ maxAttempts: 2, timeoutMs: 5000, label: 'generator-test' }, async () => {
        const wrapped = withCountedAttempts(realGenerator);
        await wrapped(1);
        await wrapped(2);
        await wrapped(3); // 3rd call must be refused before realGenerator ever runs again
      }),
    );
    assert.equal(realCalls, 2, 'the real generator must never be called a 3rd time once the ceiling is hit');
  });

  it('withCountedAttempts is transparent (return value/args pass through) when under budget', async () => {
    const double = withCountedAttempts((n: number) => n * 2);
    await withAiBudget({ maxAttempts: 5, timeoutMs: 5000, label: 'transparent' }, async () => {
      assert.equal(double(21), 42);
    });
  });
});

describe('server/lib/ai-budget — withDeadline (coordinator-safe soft race)', () => {
  it('resolves {timedOut:true} without rejecting, and without the operation having settled yet', async () => {
    let resolved = false;
    const slow = new Promise<string>(resolve => setTimeout(() => { resolved = true; resolve('done'); }, 80));
    const raced = await withDeadline(slow, 20);
    assert.deepEqual(raced, { timedOut: true });
    assert.equal(resolved, false, 'the real operation must still be in flight when withDeadline reports a timeout');

    // Coordinator-safety discipline: the caller keeps awaiting the real promise.
    const final = await slow;
    assert.equal(final, 'done');
    assert.equal(resolved, true);
  });

  it('resolves {timedOut:false, value} when the operation settles first', async () => {
    const fast = Promise.resolve(42);
    const raced = await withDeadline(fast, 5000);
    assert.deepEqual(raced, { timedOut: false, value: 42 });
  });

  it('propagates the operation\'s own rejection when it fails before the deadline', async () => {
    const failing = Promise.reject(new Error('boom'));
    await assert.rejects(withDeadline(failing, 5000), /boom/);
  });
});

describe('server/lib/ai-budget — raceDeadline (abandon-on-timeout)', () => {
  it('settles exactly as the wrapped promise does when it finishes in time', async () => {
    const result = await raceDeadline(Promise.resolve('ok'), 5000, 'quick');
    assert.equal(result, 'ok');
  });

  it('rejects with AiBudgetExceededError and stops waiting once timeoutMs elapses', async () => {
    const start = Date.now();
    await assert.rejects(
      raceDeadline(new Promise(() => {}), 25, 'never-settles'),
      (e: unknown) => isAiBudgetExceededError(e) && (e as AiBudgetExceededError).code === 'AI_BUDGET_DEADLINE_EXCEEDED',
    );
    assert.ok(Date.now() - start < 1000);
  });
});

describe('server/lib/ai-budget — runWithBudgetContext', () => {
  it('establishes context synchronously so consumeAiAttempt works inside a callback started before any await', () => {
    let seen = -1;
    runWithBudgetContext({ maxAttempts: 3, timeoutMs: 5000, label: 'sync-context' }, () => {
      consumeAiAttempt();
      seen = currentAiAttempts();
    });
    assert.equal(seen, 1);
  });

  it('context propagates through an async chain started inside the callback (the seam converge/selfplay routes rely on)', async () => {
    const record: number[] = [];
    const asyncChain = async () => {
      await Promise.resolve();
      consumeAiAttempt();
      record.push(currentAiAttempts());
      await new Promise(r => setTimeout(r, 5));
      consumeAiAttempt();
      record.push(currentAiAttempts());
    };
    const promise = runWithBudgetContext({ maxAttempts: 5, timeoutMs: 5000, label: 'async-context' }, asyncChain);
    await promise;
    assert.deepEqual(record, [1, 2]);
  });
});

describe('server/lib/ai-budget — aiBudgetEnvNumber (test/operator override seam)', () => {
  const KEY = 'AI_BUDGET_TEST_ONLY_PROBE';

  it('falls back when unset, empty, non-numeric, or non-positive', () => {
    delete process.env[KEY];
    assert.equal(aiBudgetEnvNumber(KEY, 42), 42);
    process.env[KEY] = '';
    assert.equal(aiBudgetEnvNumber(KEY, 42), 42);
    process.env[KEY] = 'not-a-number';
    assert.equal(aiBudgetEnvNumber(KEY, 42), 42);
    process.env[KEY] = '-5';
    assert.equal(aiBudgetEnvNumber(KEY, 42), 42);
    process.env[KEY] = '0';
    assert.equal(aiBudgetEnvNumber(KEY, 42), 42);
    delete process.env[KEY];
  });

  it('honors a valid positive override', () => {
    process.env[KEY] = '7';
    assert.equal(aiBudgetEnvNumber(KEY, 42), 7);
    delete process.env[KEY];
  });
});
