// Thin React binding for createIdempotentWriter() (src/hooks/idempotent-state.ts):
// a useState whose setter NEVER schedules React work for a value equal to the
// one already written, even while the component has other updates pending —
// the window where React's own eager same-value bail-out does not apply. See
// that file's header for the measured failure this closes (feature-length
// defect #1: React error #185 out of the editor's update listener).
//
// Use it for state a per-keystroke (or per-frame) effect writes repeatedly
// with the same value. It is NOT a general replacement for useState: the
// setter takes a value, not an updater function, precisely because an updater
// cannot be compared without running it, and running it here would reintroduce
// the work this exists to avoid.

import { useCallback, useRef, useState } from 'react';
import { createIdempotentWriter } from './idempotent-state.ts';

export function useIdempotentState<T>(
  initial: T | (() => T),
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);
  // The latest value WRITTEN, which is ahead of `value` between a write and
  // the re-render it causes. Comparing against this (rather than against the
  // rendered `value`) is what makes two same-value writes inside one tick
  // collapse to one — the exact shape of the burst this exists for. `set` is
  // the only writer, so the two can never drift.
  const latestRef = useRef<T>(value);
  const writerRef = useRef<(next: T) => boolean>(undefined as unknown as (next: T) => boolean);
  if (!writerRef.current) {
    writerRef.current = createIdempotentWriter<T>({
      read: () => latestRef.current,
      write: (next) => {
        latestRef.current = next;
        setValue(next);
      },
    });
  }
  const set = useCallback((next: T) => { writerRef.current(next); }, []);
  return [value, set];
}
