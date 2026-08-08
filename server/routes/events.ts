// P3 — Product instrumentation sink (ROADMAP §3 P3 exit gate: "% of Doctor
// runs that export is measured"; also carries P2's deferred time-to-first-
// report measurement). Deliberately minimal and privacy-bounded:
//
//   - A strict discriminated schema accepts only the props each closed event
//     requires. No arbitrary metadata, free text, or session capability.
//   - Metrics are unauthenticated, client-reported, in-memory, process-local
//     aggregates. They reset on restart and are neither durable nor
//     deployment-wide, authoritative P0 evidence, or proof of unique users.
//   - The aggregate sink is session-unlinked, not absolutely anonymous:
//     ordinary HTTP/network metadata can still exist outside this sink.
//   - The optional structured product-event log records the event name only.

import express from 'express';
import { asyncHandler, gameLimiter } from '../lib/session-store.ts';
import {
  validate,
  EventBodySchema,
  PRODUCT_EVENT_NAMES,
  type EventPayload,
} from '../lib/validation.ts';
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
  const event = req.body as EventPayload;
  const { name } = event;

  aggregates.counts[name] += 1;

  if (event.name === 'first_report') {
    aggregates.firstReportElapsedMsSum += event.props.elapsedMs;
    aggregates.firstReportElapsedMsCount += 1;
  }

  // Do not turn the logging stream into a second, richer telemetry sink.
  logger.info('product_event', { name });

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
