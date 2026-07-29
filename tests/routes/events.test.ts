// P3 product-instrumentation sink — route tests for server/routes/events.ts.
// Conventions: node:test + assert/strict over the real Express app (see
// tests/routes/helpers.ts), matching tests/routes/export-verify.test.ts.
//
// What matters here is not "does a counter increment" but the three
// properties the exit-gate metric depends on:
//   1. exportRate is a HONEST ratio — null (not 0) before any Doctor run, so
//      an empty deployment can't be read as "nobody exports".
//   2. The event vocabulary is CLOSED — an open namespace would let any
//      client plant arbitrary keys in the counters that gate P3, and a
//      caller could inflate/deflate the rate with invented event names.
//   3. The payload is privacy-BOUNDED — oversized props (the shape a
//      script-text leak would take) are rejected at the schema, not stored
//      and trimmed later.

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { resetEventAggregatesForTests } from '../../server/routes/events.ts';

let server: TestServer;

before(async () => { server = await startTestServer(); });
after(async () => { await server.close(); });
beforeEach(() => { resetEventAggregatesForTests(); });

async function postEvent(body: unknown): Promise<Response> {
  return fetch(`${server.baseUrl}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function getSummary(): Promise<{
  since: string;
  counts: Record<string, number>;
  exportRate: number | null;
  avgTimeToFirstReportMs: number | null;
}> {
  const res = await fetch(`${server.baseUrl}/api/events/summary`);
  assert.equal(res.status, 200);
  return await res.json();
}

describe('POST /api/events — accepting product events', () => {
  it('accepts each event in the closed vocabulary and counts it', async () => {
    for (const name of ['doctor_run', 'export_report', 'first_report', 'verify_run']) {
      const res = await postEvent({ name });
      assert.equal(res.status, 202, `${name} must be accepted`);
      assert.deepEqual(await res.json(), { accepted: true });
    }

    const summary = await getSummary();
    assert.deepEqual(summary.counts, {
      doctor_run: 1, export_report: 1, first_report: 1, verify_run: 1,
    });
  });

  it('accepts a bounded scalar props record and an optional sessionId', async () => {
    const res = await postEvent({
      name: 'doctor_run',
      sessionId: 'abc-123',
      props: { source: 'draft', elapsedMs: 1234, verified: true },
    });
    assert.equal(res.status, 202);
    assert.equal((await getSummary()).counts.doctor_run, 1);
  });
});

describe('POST /api/events — the vocabulary is closed', () => {
  it('rejects an event name outside PRODUCT_EVENT_NAMES', async () => {
    // An open namespace would let a client mint event names that land in the
    // same counters the P3 exit gate reads. 400, and nothing recorded.
    const res = await postEvent({ name: 'doctor_run_but_fake' });
    assert.equal(res.status, 400);

    const summary = await getSummary();
    assert.equal(summary.counts.doctor_run, 0);
    assert.equal(summary.exportRate, null, 'a rejected event must not create a rate');
  });

  it('rejects a missing name outright', async () => {
    assert.equal((await postEvent({ props: { source: 'draft' } })).status, 400);
  });
});

describe('POST /api/events — the payload is privacy-bounded', () => {
  it('rejects a props value long enough to carry script text', async () => {
    const res = await postEvent({
      name: 'doctor_run',
      props: { leak: 'INT. WAREHOUSE - NIGHT\n'.repeat(200) },
    });
    assert.equal(res.status, 400, 'oversized prop values must never reach the sink');
    assert.equal((await getSummary()).counts.doctor_run, 0);
  });

  it('rejects a props record with more than 8 keys', async () => {
    const props: Record<string, number> = {};
    for (let i = 0; i < 9; i += 1) props[`k${i}`] = i;
    assert.equal((await postEvent({ name: 'doctor_run', props })).status, 400);
  });

  it('rejects a non-scalar props value', async () => {
    const res = await postEvent({ name: 'doctor_run', props: { nested: { a: 1 } } });
    assert.equal(res.status, 400);
  });
});

describe('GET /api/events/summary — the exit-gate metric', () => {
  it('reports exportRate as null (not 0) before any Doctor run', async () => {
    const summary = await getSummary();
    // 0% export rate over zero runs is a measurement artifact, not a finding
    // — the difference matters when reading a fresh deployment's numbers.
    assert.equal(summary.exportRate, null);
    assert.equal(summary.avgTimeToFirstReportMs, null);
    assert.equal(summary.counts.doctor_run, 0);
    assert.ok(typeof summary.since === 'string' && summary.since.length > 0);
  });

  it('computes exportRate as exports / doctor runs', async () => {
    for (let i = 0; i < 4; i += 1) await postEvent({ name: 'doctor_run' });
    await postEvent({ name: 'export_report' });

    const summary = await getSummary();
    assert.equal(summary.counts.doctor_run, 4);
    assert.equal(summary.counts.export_report, 1);
    assert.equal(summary.exportRate, 0.25);
  });

  it('reports an exportRate above 1 honestly when a run is exported more than once', async () => {
    // Re-exporting one report is real behavior, not a bug to clamp away: the
    // metric is "exports per run", and hiding >1 would erase the signal that
    // people re-share the same report.
    await postEvent({ name: 'doctor_run' });
    await postEvent({ name: 'export_report' });
    await postEvent({ name: 'export_report' });

    assert.equal((await getSummary()).exportRate, 2);
  });

  it('averages first_report elapsedMs across sessions', async () => {
    await postEvent({ name: 'first_report', props: { elapsedMs: 1000 } });
    await postEvent({ name: 'first_report', props: { elapsedMs: 3000 } });

    const summary = await getSummary();
    assert.equal(summary.counts.first_report, 2);
    assert.equal(summary.avgTimeToFirstReportMs, 2000);
  });

  it('ignores a first_report with a negative or non-numeric elapsedMs', async () => {
    // A clock skew or a hand-crafted payload must not drag the average into
    // nonsense — the event still counts, the timing sample doesn't.
    await postEvent({ name: 'first_report', props: { elapsedMs: -500 } });
    await postEvent({ name: 'first_report', props: { elapsedMs: 'soon' } });
    await postEvent({ name: 'first_report' });

    const summary = await getSummary();
    assert.equal(summary.counts.first_report, 3, 'the events themselves still count');
    assert.equal(summary.avgTimeToFirstReportMs, null, 'no valid timing sample was recorded');
  });

  it('does not expose individual events or session ids', async () => {
    await postEvent({ name: 'doctor_run', sessionId: 'session-should-not-leak', props: { source: 'draft' } });

    const raw = await (await fetch(`${server.baseUrl}/api/events/summary`)).text();
    assert.ok(!raw.includes('session-should-not-leak'), 'summary must be aggregate-only');
    assert.ok(!raw.includes('"events"'), 'summary must not carry a per-event list');
  });
});
