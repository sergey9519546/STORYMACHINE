// Framework-agnostic "leading + trailing, idle-gated" debounce core.
// Deliberately React-free so it is unit-testable without a render harness
// (this repo has no jsdom — see CLAUDE.md) and reusable anywhere, not just in
// a component. Modeled on latest-request.ts's split: a small React-free core
// plus a thin hook wrapper (useIdleDebounce.ts) that owns only lifecycle.
//
// The problem it closes: ScriptIDE.tsx used to run parseFountain() — a full
// document parse — synchronously on every keystroke to feed derived state
// (the scene sidebar, the command palette's scene list, the production/
// analysis tabs) that nothing on screen needs updated mid-burst. A PLAIN
// trailing debounce (setTimeout, reset on every change — see
// diagnostics.ts's DEBOUNCE_MS pattern) fixes the burst cost but makes the
// FIRST keystroke after a pause look stale until the delay elapses. This
// core instead fires push()'s callback SYNCHRONOUSLY on the very first push
// since idle (leading edge) — so a lone edit is never delayed — then
// swallows every push until DELAY_MS of quiet, at which point it fires once
// more with the latest value (trailing edge) so a typing burst still
// converges on the true final value. A burst of N keystrokes therefore costs
// 2 fires (leading + trailing), not N.
//
// Timer injection (`setTimer`/`clearTimer`) exists solely so tests can drive
// this with a manual fake clock instead of real wall-clock waits — see
// tests/core/idle-debounce.test.ts.

export interface IdleDebounceCallbacks<T> {
  /** Fired synchronously on the first push() since idle (leading edge). */
  onLeading(value: T): void;
  /** Fired once DELAY_MS after the last push() (trailing edge) — skipped
   *  when the burst was a single push() whose value onLeading already
   *  covered, so a lone edit never double-fires with an identical value. */
  onTrailing(value: T): void;
  /** Idle window in ms. */
  delayMs: number;
  /** Injectable timer functions, defaulting to the real ones. */
  setTimer?: (cb: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface IdleDebouncer<T> {
  /** Call on every value change (e.g. every keystroke). */
  push(value: T): void;
  /** Cancel any pending trailing fire. Idempotent. Does not fire trailing. */
  dispose(): void;
}

export function createIdleDebouncer<T>(callbacks: IdleDebounceCallbacks<T>): IdleDebouncer<T> {
  const { onLeading, onTrailing, delayMs } = callbacks;
  // Wrapped (rather than defaulted via destructuring) so each local is
  // exactly the `(…) => unknown` / `(handle: unknown) => void` shape the rest
  // of this function relies on — destructuring straight to the real
  // `setTimeout`/`clearTimeout` globals resolves their OWN (Node-specific,
  // `Timeout`-typed) signatures instead, which tsc then rejects at every
  // call site below once `timer` narrows away from `null`.
  const setTimer: (cb: () => void, ms: number) => unknown =
    callbacks.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
  const clearTimer: (handle: unknown) => void =
    callbacks.clearTimer ?? ((handle) => clearTimeout(handle as Parameters<typeof clearTimeout>[0]));

  // Whether we're inside a burst (leading already fired, trailing pending).
  let pending = false;
  let timer: unknown = null;
  // The exact value onLeading fired with, so the trailing edge can skip a
  // redundant identical recompute for a single-push burst.
  let leadingValue: T | undefined;
  let hasLeadingValue = false;

  function push(value: T): void {
    if (!pending) {
      pending = true;
      leadingValue = value;
      hasLeadingValue = true;
      onLeading(value);
    }
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      pending = false;
      const isSameAsLeading = hasLeadingValue && Object.is(leadingValue, value);
      hasLeadingValue = false;
      leadingValue = undefined;
      if (!isSameAsLeading) onTrailing(value);
    }, delayMs);
  }

  function dispose(): void {
    if (timer !== null) clearTimer(timer);
    timer = null;
    pending = false;
    hasLeadingValue = false;
    leadingValue = undefined;
  }

  return { push, dispose };
}
