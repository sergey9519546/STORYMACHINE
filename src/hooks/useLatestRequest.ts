// Thin React binding for createLatestRequest() (src/hooks/latest-request.ts):
// one latest-wins request core per mounted component, disposed on unmount.
// Returns a stable `run` you call from a load()/refresh handler — a slow
// earlier response can never overwrite a newer one, and nothing fires after
// the component unmounts.

import { useEffect, useRef } from 'react';
import {
  createLatestRequest,
  type LatestRequest,
  type LatestRequestHandlers,
} from './latest-request.ts';

export type { LatestRequest, LatestRequestHandlers } from './latest-request.ts';

export function useLatestRequest(): LatestRequest['run'] {
  const coreRef = useRef<LatestRequest | null>(null);
  // Lazily create on first render so run() is usable immediately, even before
  // the mount effect below has run. One instance per mount; stable identity
  // across re-renders (the ref is only initialized when null).
  if (coreRef.current === null) coreRef.current = createLatestRequest();

  useEffect(() => {
    // React StrictMode (dev) runs this setup → cleanup → setup on mount. The
    // cleanup disposes AND nulls the core, so this second setup must mint a
    // fresh one — otherwise every request would hit the disposed guard and be
    // silently dropped, and the panel would never load in dev.
    if (coreRef.current === null) coreRef.current = createLatestRequest();
    const core = coreRef.current;
    return () => {
      core.dispose();
      coreRef.current = null;
    };
  }, []);

  // Stable wrapper so the returned function keeps a constant identity across
  // renders (safe to list in a useCallback/useEffect dependency array). It
  // forwards to the live core; after unmount coreRef is null and the call is a
  // no-op, so a late async caller can never setState on an unmounted component.
  const runRef = useRef<LatestRequest['run'] | null>(null);
  if (runRef.current === null) {
    runRef.current = <T>(
      factory: (signal: AbortSignal) => Promise<T>,
      handlers: LatestRequestHandlers<T>,
    ): void => {
      coreRef.current?.run(factory, handlers);
    };
  }
  return runRef.current;
}
