// Thin React binding for createIdleDebouncer() (src/hooks/idle-debounce.ts):
// derives `compute(value)` on the leading edge of every idle->active burst
// AND once more on the trailing edge (DELAY_MS after the burst ends), instead
// of on every single value change. Use for a derived value whose consumers
// (a sidebar list, a command-palette entry set, a background tab) don't need
// per-keystroke freshness — never for a value the user's immediate typing
// feedback depends on (that stays a plain synchronous useMemo).

import { useEffect, useRef, useState } from 'react';
import { createIdleDebouncer, type IdleDebouncer } from './idle-debounce.ts';

export function useIdleDebouncedValue<T, R>(
  value: T,
  delayMs: number,
  compute: (value: T) => R,
): R {
  const [result, setResult] = useState<R>(() => compute(value));

  // Always call the LATEST compute/value without re-creating the debouncer
  // core (which would drop an in-flight trailing timer) on every render.
  const computeRef = useRef(compute);
  computeRef.current = compute;

  const debouncerRef = useRef<IdleDebouncer<T> | null>(null);
  // Guards the initial render: `result` above was already seeded with
  // compute(value) for the FIRST value, so the mount-time effect run below
  // must not push() that same value again (which would burn it as the
  // leading fire of a "burst" that never really started).
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    debouncerRef.current = createIdleDebouncer<T>({
      delayMs,
      onLeading: (v) => setResult(computeRef.current(v)),
      onTrailing: (v) => setResult(computeRef.current(v)),
    });
    return () => {
      debouncerRef.current?.dispose();
      debouncerRef.current = null;
    };
    // Recreated only if delayMs itself changes (never does in current
    // callers) — value changes are handled via push() below, not by
    // rebuilding the core.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs]);

  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    debouncerRef.current?.push(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return result;
}
