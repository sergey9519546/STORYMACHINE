// P3 — Client-side product instrumentation (ROADMAP §3 P3 exit gate:
// "% of Doctor runs that export is measured"; also P2's deferred
// time-to-first-report). Fire-and-forget counterpart to server/routes/
// events.ts: a closed payload map with no arbitrary metadata, free text, or
// telemetry identifier. These unauthenticated, client-reported aggregates are
// session-unlinked; that is not a claim of absolute anonymity because normal
// HTTP/network metadata remains outside this sink. Every call fails silent —
// analytics must never break the product surface it measures.
//
// The vocabulary here must stay in lockstep with PRODUCT_EVENT_NAMES in
// server/lib/validation.ts — the server rejects anything outside the enum.

export interface ProductEventPayloadMap {
  doctor_run: { source: 'sample' | 'draft' | 'upload' };
  first_report: { source: 'sample' | 'draft' | 'upload'; elapsedMs: number };
  export_report: { verdict: 'RECOMMEND' | 'CONSIDER' | 'PASS' | 'unknown' };
  verify_run: { verified: boolean };
}

export type ProductEventName = keyof ProductEventPayloadMap;

// Module-load timestamp ≈ app boot. time-to-first-report is measured from
// here to the first successful Doctor run of the session — close enough to
// "a new user reaches their first coverage report" for the P2/P3 gates
// without pulling in Navigation Timing API complexity.
const APP_START_TS = Date.now();

const FIRST_REPORT_SENT_KEY = 'sm_first_report_sent';

/** Fire-and-forget event post. Never throws, never awaits, never retries —
 *  the server meters this route with gameLimiter, so a retry storm from a
 *  flapping client would only burn the caller's own rate budget. */
export function trackEvent<Name extends ProductEventName>(
  name: Name,
  props: ProductEventPayloadMap[Name],
): void {
  try {
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, props }),
      keepalive: true,
    }).catch(() => { /* analytics must never surface */ });
  } catch {
    /* analytics must never surface */
  }
}

// Module-level fallback for the once-per-session flag: when sessionStorage
// is unavailable (private mode) the persisted flag can never stick, and
// without this backup every Doctor run would re-emit first_report and skew
// the average toward repeat-run times.
let firstReportSentThisBoot = false;

/** A Doctor run completed successfully (any source). The first one of the
 *  session additionally emits `first_report` with the elapsed time since
 *  app boot — the P2 time-to-first-report measurement. The once-per-session
 *  flag lives in sessionStorage so a page reload restarts the clock (a
 *  reload IS a new session for time-to-first-report purposes). */
export function trackDoctorRun(source: 'sample' | 'draft' | 'upload'): void {
  trackEvent('doctor_run', { source });
  let alreadySent = firstReportSentThisBoot;
  try {
    if (sessionStorage.getItem(FIRST_REPORT_SENT_KEY)) alreadySent = true;
  } catch {
    /* sessionStorage unavailable — rely on the in-memory flag */
  }
  if (alreadySent) return;
  firstReportSentThisBoot = true;
  try { sessionStorage.setItem(FIRST_REPORT_SENT_KEY, '1'); } catch { /* best-effort */ }
  trackEvent('first_report', { elapsedMs: Date.now() - APP_START_TS, source });
}
