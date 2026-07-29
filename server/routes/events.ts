// P3 — Product instrumentation sink (ROADMAP §3 P3 exit gate: "% of Doctor
// runs that export is measured"; also carries P2's deferred time-to-first-
// report measurement). Deliberately minimal and privacy-bounded:
//
//   - The event vocabulary is a closed enum (validation.ts's
//     PRODUCT_EVENT_NAMES) and props are capped scalar records — no script
//     text, no PII, no free-form keys can accumulate here.
//   - Storage is in-memory aggregate counters only (plus one structured log
//     line per event for the persistent stream). No database, no per-event
//     history — the exit-gate questions are ratios and averages, which
//     counters answer exactly.
//   - Keyless/stateless like the rest of the analysis surface: no LLM, no
//     session store, no auth. GET /api/events/summary exposes only
//     aggregates, never individual events.

import express from 'express';
import { asyncHandler, gameLimiter } from '../lib/session-store.ts';
import { validate, EventBodySchema, PRODUCT_EVENT_NAMES } from '../lib/validation.ts';
import { logger } from '../lib/logger.ts';

const router = express.Router();
export default router;

type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

interface EventAggregates {
  /** Process start — the `since` anchor on the summary response. */
  since: string;
  counts: Record<ProductEventName, number>;
  /** first_report elapsedMs accumulation — avg = sum / count. */
  firstReportElapsedMsSum: number;
  firstReportElapsedMsCount: number;
}

function freshAggregates(): EventAggregates {
  return {
    since: new Date().toISOString(),
    counts: {
      doctor_run: 0,
      export_report: 0,
      first_report: 0,
      verify_run: 0,
    },
    firstReportElapsedMsSum: 0,
    firstReportElapsedMsCount: 0,
  };
}

let aggregates = freshAggregates();

/** Test-only reset — route tests need counter isolation between cases
 *  without restarting the server. Not exposed over HTTP. */
export function resetEventAggregatesForTests(): void {
  aggregates = freshAggregates();
}

router.post('/api/events', gameLimiter, validate(EventBodySchema), asyncHandler(async (req, res) => {
  const { name, sessionId, props } = req.body as {
    name: ProductEventName;
    sessionId?: string;
    props?: Record<string, string | number | boolean>;
  };

  aggregates.counts[name] += 1;

  if (name === 'first_report' && typeof props?.elapsedMs === 'number' && Number.isFinite(props.elapsedMs) && props.elapsedMs >= 0) {
    aggregates.firstReportElapsedMsSum += props.elapsedMs;
    aggregates.firstReportElapsedMsCount += 1;
  }

  // The persistent stream: counters answer the exit-gate ratios, but the log
  // line is the only durable record of an individual event — keep it
  // aggregate-safe (no props beyond the bounded scalars the schema allows).
  logger.info('product_event', { name, sessionId, props });

  res.status(202).json({ accepted: true });
}));

router.get('/api/events/summary', gameLimiter, asyncHandler(async (_req, res) => {
  const doctorRuns = aggregates.counts.doctor_run;
  const exports = aggregates.counts.export_report;
  res.json({
    since: aggregates.since,
    counts: { ...aggregates.counts },
    // The P3 exit-gate number: share of Doctor runs that produced an export.
    // Null (not 0) when there are no runs yet — a 0% rate with zero runs is
    // a measurement artifact, not a finding.
    exportRate: doctorRuns > 0 ? exports / doctorRuns : null,
    avgTimeToFirstReportMs: aggregates.firstReportElapsedMsCount > 0
      ? aggregates.firstReportElapsedMsSum / aggregates.firstReportElapsedMsCount
      : null,
  });
}));
