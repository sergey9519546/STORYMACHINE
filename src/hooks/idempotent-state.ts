// Framework-agnostic "a repeat write is a real no-op" core.
//
// Deliberately React-free so it is unit-testable without a render harness
// (this repo has no jsdom — see CLAUDE.md), the same split idle-debounce.ts /
// useIdleDebouncedValue.ts and latest-request.ts / useLatestRequest.ts already
// use: a small testable core plus a thin hook wrapper that owns only React
// lifecycle.
//
// ── The problem it closes (2026-09-06, feature-length defect #1) ────────────
//
// React's useState dispatcher has its OWN same-value bail-out, but it is
// CONDITIONAL: dispatchSetState only computes the eager state (and skips
// scheduling when Object.is(eager, current)) while the owning fiber has no
// work already pending — `fiber.lanes === 0 && (alternate === null ||
// alternate.lanes === 0)` in react-dom. The instant a component has ANY
// pending update of its own, every further setState on it schedules real work
// even when the value is identical, because React cannot know the value is
// identical without rendering.
//
// ScriptIDE hits that window on every single keystroke. The keystroke's own
// setScriptText puts a pending update on the ScriptIDE fiber; the localStorage
// persistence effect then runs (a passive effect, after the commit) and calls
// setSaveStatus("saving-local") — already "saving-local" since the first
// keystroke of the burst, so semantically a no-op, but scheduled anyway
// because of the window above. Each keystroke's commit therefore ends with a
// pending default-lane update, which is exactly the condition React's
// nested-update counter increments on (`remainingLanes & 42` in
// commitRootImpl). Fifty-one consecutive keystrokes with no gap long enough
// for React to drain to zero pending lanes, and the fifty-second setState
// throws "Maximum update depth exceeded" (minified React error #185) out of
// the CodeMirror update listener.
//
// It needs a feature-length draft to show up because that is what makes each
// commit slow enough that the next keystroke always lands before React has
// drained — measured 5/5 reproductions on the 231-scene fixture, 4/5 on a
// 146-scene assembly, 0/N on the 12-scene short (see the lane report). The
// document size is not the bug; it is what removes the accidental gaps that
// were hiding it.
//
// So: suppress the write BEFORE it reaches React, unconditionally, rather than
// relying on a bail-out that only holds when the component happens to be idle.

export interface IdempotentWriterOptions<T> {
  /** The value most recently WRITTEN (not most recently rendered) — see the
   *  hook wrapper for why those differ within a single tick. */
  read(): T;
  /** Called only when the value genuinely changes. */
  write(value: T): void;
  /** Equality test; defaults to Object.is, matching React's own bail-out. */
  equals?(a: T, b: T): boolean;
}

/**
 * Returns a setter that forwards to `write` only when `value` differs from
 * whatever `read()` reports, and returns whether it forwarded — so a caller
 * (or a test) can assert the suppression happened rather than infer it.
 */
export function createIdempotentWriter<T>(options: IdempotentWriterOptions<T>): (value: T) => boolean {
  const { read, write } = options;
  const equals = options.equals ?? Object.is;
  return (value: T) => {
    if (equals(read(), value)) return false;
    write(value);
    return true;
  };
}
