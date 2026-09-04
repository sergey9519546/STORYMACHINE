// Unit coverage for the framework-agnostic idle-debounce core
// (src/hooks/idle-debounce.ts). Exercises the CORE directly — no React, no
// render harness (this repo has no jsdom, see CLAUDE.md) — via an injected
// manual fake clock, so the leading/trailing timing is asserted exactly
// without waiting on real timers.
//
// This is the mechanism ScriptIDE.tsx now uses (via useIdleDebouncedValue)
// to stop calling parseFountain() synchronously on every keystroke — see
// that file's `parsedBlocks` declaration for the call site.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createIdleDebouncer, type IdleDebounceCallbacks } from '../../src/hooks/idle-debounce.ts';
import { parseFountain } from '../../src/lib/fountain.ts';

/** A manual fake clock: at most one timer is ever pending at once (the
 *  debouncer always clears its previous timer before setting a new one), so
 *  this only needs to track a single scheduled callback. `flush()` fires it
 *  as if `delayMs` of real time had elapsed with no further pushes. */
function fakeClock() {
  let scheduled: { cb: () => void; ms: number } | null = null;
  let scheduleCount = 0;
  let clearCount = 0;
  return {
    setTimer: (cb: () => void, ms: number): unknown => {
      scheduleCount++;
      const handle = { id: scheduleCount };
      scheduled = { cb, ms };
      return handle;
    },
    clearTimer: (_handle: unknown): void => {
      clearCount++;
      scheduled = null;
    },
    /** Fire the currently-scheduled callback, as a real timer would. */
    flush(): void {
      const s = scheduled;
      assert.ok(s, 'flush() called with no timer pending');
      scheduled = null;
      s!.cb();
    },
    hasPending: (): boolean => scheduled !== null,
    get scheduleCount() { return scheduleCount; },
    get clearCount() { return clearCount; },
  };
}

function harness<T>(overrides: Partial<IdleDebounceCallbacks<T>> = {}) {
  const clock = fakeClock();
  const leadingCalls: T[] = [];
  const trailingCalls: T[] = [];
  const debouncer = createIdleDebouncer<T>({
    delayMs: 200,
    onLeading: (v) => leadingCalls.push(v),
    onTrailing: (v) => trailingCalls.push(v),
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    ...overrides,
  });
  return { clock, leadingCalls, trailingCalls, debouncer };
}

describe('createIdleDebouncer — leading+trailing idle debounce core', () => {
  it('fires the leading edge synchronously on the very first push (first keystroke is never delayed)', () => {
    const { leadingCalls, trailingCalls, debouncer } = harness<string>();
    debouncer.push('a');
    assert.deepEqual(leadingCalls, ['a']);
    assert.deepEqual(trailingCalls, []); // trailing hasn't fired yet — still idle-gated
  });

  it('a burst of pushes fires leading ONCE (first value) and trailing ONCE (last value) — not once per push', () => {
    const { clock, leadingCalls, trailingCalls, debouncer } = harness<string>();
    debouncer.push('a');
    debouncer.push('ab');
    debouncer.push('abc');
    debouncer.push('abcd');
    assert.deepEqual(leadingCalls, ['a'], 'leading must fire only for the burst-opening push');
    assert.equal(trailingCalls.length, 0, 'trailing must not fire mid-burst');

    clock.flush(); // simulate DELAY_MS of quiet after the last push
    assert.deepEqual(trailingCalls, ['abcd'], 'trailing must deliver the LATEST value once the burst settles');
    assert.deepEqual(leadingCalls, ['a'], 'leading must still have fired exactly once for the whole burst');
  });

  it('reschedules (clears the previous timer) on every push within a burst, never letting an intermediate value fire', () => {
    const { clock, debouncer } = harness<number>();
    debouncer.push(1);
    debouncer.push(2);
    debouncer.push(3);
    // 2 clears: the push(2) and push(3) each clear the timer the previous
    // push had just set; push(1)'s leading call sets the first timer with
    // nothing to clear yet.
    assert.equal(clock.clearCount, 2);
    assert.equal(clock.scheduleCount, 3);
    assert.ok(clock.hasPending());
  });

  it('a single isolated push does not double-fire an identical value on the trailing edge', () => {
    const { clock, leadingCalls, trailingCalls, debouncer } = harness<string>();
    debouncer.push('solo');
    clock.flush();
    assert.deepEqual(leadingCalls, ['solo']);
    assert.deepEqual(trailingCalls, [], 'trailing must skip when nothing changed since the leading fire');
  });

  it('a new burst after a settled trailing edge fires leading again (idle -> active transition resets)', () => {
    const { clock, leadingCalls, trailingCalls, debouncer } = harness<string>();
    debouncer.push('first-burst');
    clock.flush();
    assert.deepEqual(leadingCalls, ['first-burst']);

    debouncer.push('second-burst-a');
    debouncer.push('second-burst-b');
    assert.deepEqual(leadingCalls, ['first-burst', 'second-burst-a'], 'idle->active must re-arm the leading edge');
    clock.flush();
    assert.deepEqual(trailingCalls, ['second-burst-b']);
  });

  it('dispose() cancels a pending trailing fire without invoking it', () => {
    const { clock, trailingCalls, debouncer } = harness<string>();
    debouncer.push('x');
    debouncer.dispose();
    assert.equal(clock.hasPending(), false);
    assert.doesNotThrow(() => { /* no timer left to flush */ });
    assert.deepEqual(trailingCalls, []);
  });

  it('push() after dispose() re-arms cleanly (dispose is not a permanent kill-switch, unlike LatestRequest)', () => {
    const { clock, leadingCalls, debouncer } = harness<string>();
    debouncer.push('a');
    debouncer.dispose();
    debouncer.push('b');
    assert.deepEqual(leadingCalls, ['a', 'b']);
    clock.flush();
  });

  it('REGRESSION: after a burst settles, the debounced trailing value equals a synchronous parseFountain() of the final text — the debounced path must converge on the same derived value the old per-keystroke path always produced', () => {
    const { clock, trailingCalls, debouncer } = harness<string>();

    // Simulate a writer typing a scene heading + action line one character at
    // a time, driving the PURE core exactly as useIdleDebouncedValue would —
    // no DOM, no React, per the "drive the pure function" testing note.
    const finalText = 'INT. KITCHEN - DAY\n\nShe stares at the phone.';
    let typed = '';
    for (const ch of finalText) {
      typed += ch;
      debouncer.push(typed);
    }
    assert.equal(typed, finalText);

    clock.flush(); // burst settles
    assert.equal(trailingCalls.length, 1);
    const debouncedResult = trailingCalls[0];
    const syncResult = finalText; // trailing edge delivers the raw value; parse happens in the consumer

    // The core itself is value-agnostic (T is generic); the actual
    // consumer-side equivalence — that parseFountain(debounced value)
    // matches parseFountain(current scriptText) once settled — is the real
    // claim, asserted directly below using the same parser ScriptIDE.tsx
    // wires through useIdleDebouncedValue.
    assert.equal(debouncedResult, syncResult);
    assert.deepEqual(parseFountain(debouncedResult), parseFountain(finalText));
  });

  it('REGRESSION: useIdleDebouncedValue-style compute() wiring — debounced parseFountain output matches the synchronous parse after settling', () => {
    const leadingParses: ReturnType<typeof parseFountain>[] = [];
    const trailingParses: ReturnType<typeof parseFountain>[] = [];
    const clock = fakeClock();
    const debouncer = createIdleDebouncer<string>({
      delayMs: 200,
      onLeading: (v) => leadingParses.push(parseFountain(v)),
      onTrailing: (v) => trailingParses.push(parseFountain(v)),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    const script = [
      'INT. OFFICE - DAY',
      '',
      'JANE',
      'We need to talk.',
      '',
      'EXT. STREET - NIGHT',
      '',
      'Rain falls on empty pavement.',
    ].join('\n');

    // Burst: every incremental prefix, as if typed.
    for (let i = 1; i <= script.length; i++) {
      debouncer.push(script.slice(0, i));
    }
    clock.flush();

    assert.equal(leadingParses.length, 1, 'only the burst-opening keystroke should have parsed synchronously');
    assert.equal(trailingParses.length, 1, 'settling should parse exactly once more, not once per keystroke');

    const authoritative = parseFountain(script);
    assert.deepEqual(
      trailingParses[0],
      authoritative,
      'the debounced path must produce the SAME parsedBlocks the old synchronous per-keystroke path always did, once settled',
    );
  });
});
