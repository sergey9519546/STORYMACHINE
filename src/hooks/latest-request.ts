// Framework-agnostic "latest request wins" core. Deliberately React-free so it
// is unit-testable without a render harness (this repo has no jsdom — see
// CLAUDE.md) and reusable anywhere, not just in a component.
//
// The hazard it closes: a panel fires load(), the user hits Refresh, a second
// fetch starts, and the FIRST (slower) response lands last and overwrites the
// newer data. A plain mountedRef guards unmount but NOT this out-of-order
// case, which ~40 panels re-implement inline and mostly miss.
// createLatestRequest() serializes "latest wins": every run() bumps a
// monotonic generation and aborts the prior in-flight request; a result/error
// is delivered only if its run is still the latest AND the core has not been
// disposed. Superseded, aborted, or post-dispose runs are silently dropped.
//
// Modeled on the generation-token + AbortController guard proven in
// ScriptDoctorPanel.runDiagnosis and NarrativeAnalyticsPanel's per-key
// requestId, extracted here so those guards can share one audited
// implementation instead of being re-derived (and half-derived) inline.

export interface LatestRequestHandlers<T> {
  /** Fired once, with the resolved value, only if this run is still the latest
   *  and the core is not disposed. */
  onResult(result: T): void;
  /** Fired instead of onResult when the factory's promise rejects, under the
   *  same latest-and-not-disposed condition. Optional: a caller that only
   *  cares about the success path may omit it, and rejections are then
   *  dropped (an AbortError from a superseded/disposed run is never a
   *  user-facing failure anyway). */
  onError?(error: unknown): void;
}

export interface LatestRequest {
  /** Start a request. `factory` receives an AbortSignal that is aborted if a
   *  newer run supersedes this one, or the core is disposed — forward it to
   *  fetch() so the superseded network request is actually cancelled. */
  run<T>(
    factory: (signal: AbortSignal) => Promise<T>,
    handlers: LatestRequestHandlers<T>,
  ): void;
  /** Abort any in-flight run and permanently stop delivering results (the
   *  owning component has unmounted). Idempotent. */
  dispose(): void;
}

export function createLatestRequest(): LatestRequest {
  // Monotonic run counter: the id stamped on the most recent run() is the only
  // one allowed to deliver. Any earlier run whose id no longer matches is stale.
  let latestGeneration = 0;
  // The in-flight run's controller, so the NEXT run (or dispose) can abort it.
  let activeController: AbortController | null = null;
  // Once disposed, no run ever delivers again.
  let disposed = false;

  function run<T>(
    factory: (signal: AbortSignal) => Promise<T>,
    handlers: LatestRequestHandlers<T>,
  ): void {
    if (disposed) return;

    // Cancel the previous in-flight run so its response can't land after this
    // newer one, then claim the latest generation for this run.
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const myGeneration = ++latestGeneration;

    // A run may deliver only while it is still the newest AND the core is live.
    const isCurrent = (): boolean => !disposed && myGeneration === latestGeneration;

    let promise: Promise<T>;
    try {
      promise = factory(controller.signal);
    } catch (error) {
      // A factory that throws synchronously (before returning a promise) is
      // still just this run failing — route it through the same guard.
      if (isCurrent()) handlers.onError?.(error);
      return;
    }

    promise.then(
      (result) => {
        if (isCurrent()) handlers.onResult(result);
      },
      (error) => {
        // Superseded / aborted / disposed runs are dropped silently.
        if (isCurrent()) handlers.onError?.(error);
      },
    );
  }

  function dispose(): void {
    disposed = true;
    activeController?.abort();
    activeController = null;
  }

  return { run, dispose };
}
