// P3 product-instrumentation sink — strict payload, privacy, and aggregate
// regressions over the real Express route.

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

async function postRawEvent(body: string): Promise<Response> {
  return fetch(`${server.baseUrl}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

interface EventSummary {
  since: string;
  counts: Record<string, number>;
  exportRate: number | null;
  avgTimeToFirstReportMs: number | null;
}

async function getSummary(): Promise<EventSummary> {
  const res = await fetch(`${server.baseUrl}/api/events/summary`);
  assert.equal(res.status, 200);
  return await res.json();
}

async function assertRejectedWithoutMutation(
  body: unknown,
  label: string,
  raw = false,
): Promise<void> {
  const beforeSummary = await getSummary();
  const res = raw ? await postRawEvent(body as string) : await postEvent(body);
  assert.equal(res.status, 400, `${label} must be rejected`);
  assert.deepEqual(await getSummary(), beforeSummary, `${label} must not mutate aggregates`);
}

describe('POST /api/events — exactly four strict payloads', () => {
  it('accepts doctor_run for every closed source value', async () => {
    for (const source of ['sample', 'draft', 'upload']) {
      const res = await postEvent({ name: 'doctor_run', props: { source } });
      assert.equal(res.status, 202, `${source} must be accepted`);
      assert.deepEqual(await res.json(), { accepted: true });
    }
    assert.equal((await getSummary()).counts.doctor_run, 3);
  });

  it('accepts bounded first_report timing payloads', async () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    for (const body of [
      { name: 'first_report', props: { source: 'sample', elapsedMs: 0 } },
      { name: 'first_report', props: { source: 'draft', elapsedMs: 3000 } },
      { name: 'first_report', props: { source: 'upload', elapsedMs: sevenDaysMs } },
    ]) {
      assert.equal((await postEvent(body)).status, 202);
    }
    const summary = await getSummary();
    assert.equal(summary.counts.first_report, 3);
    assert.equal(summary.avgTimeToFirstReportMs, (sevenDaysMs + 3000) / 3);
  });

  it('accepts export_report for every closed verdict value', async () => {
    for (const verdict of ['RECOMMEND', 'CONSIDER', 'PASS', 'unknown']) {
      assert.equal((await postEvent({ name: 'export_report', props: { verdict } })).status, 202);
    }
    assert.equal((await getSummary()).counts.export_report, 4);
  });

  it('accepts verify_run for both boolean outcomes', async () => {
    assert.equal((await postEvent({ name: 'verify_run', props: { verified: true } })).status, 202);
    assert.equal((await postEvent({ name: 'verify_run', props: { verified: false } })).status, 202);
    assert.equal((await getSummary()).counts.verify_run, 2);
  });
});

describe('POST /api/events — rejects invalid and privacy-bearing payloads without mutation', () => {
  it('rejects unknown top-level fields, including a body sessionId', async () => {
    await assertRejectedWithoutMutation(
      { name: 'doctor_run', sessionId: 'private-session-sentinel', props: { source: 'draft' } },
      'body sessionId',
    );
    await assertRejectedWithoutMutation(
      { name: 'doctor_run', props: { source: 'draft' }, scriptText: 'INT. VAULT - NIGHT' },
      'unknown top-level scriptText',
    );
  });

  it('rejects unknown and cross-event prop keys', async () => {
    for (const [label, body] of [
      ['unknown prop', { name: 'doctor_run', props: { source: 'draft', arbitrary: 'sentinel' } }],
      ['doctor/verify cross-event prop', { name: 'doctor_run', props: { source: 'draft', verified: true } }],
      ['first/export cross-event prop', { name: 'first_report', props: { source: 'draft', elapsedMs: 1, verdict: 'PASS' } }],
      ['export/doctor cross-event prop', { name: 'export_report', props: { verdict: 'PASS', source: 'draft' } }],
      ['verify/first cross-event prop', { name: 'verify_run', props: { verified: true, elapsedMs: 1 } }],
    ] as const) {
      await assertRejectedWithoutMutation(body, label);
    }
  });

  it('rejects missing names, props, and required prop fields', async () => {
    for (const [label, body] of [
      ['missing name', { props: { source: 'draft' } }],
      ['missing doctor props', { name: 'doctor_run' }],
      ['missing doctor source', { name: 'doctor_run', props: {} }],
      ['missing first elapsedMs', { name: 'first_report', props: { source: 'draft' } }],
      ['missing export verdict', { name: 'export_report', props: {} }],
      ['missing verify outcome', { name: 'verify_run', props: {} }],
    ] as const) {
      await assertRejectedWithoutMutation(body, label);
    }
  });

  it('rejects invalid source and verdict enums', async () => {
    await assertRejectedWithoutMutation(
      { name: 'doctor_run', props: { source: 'clipboard' } },
      'invalid source',
    );
    await assertRejectedWithoutMutation(
      { name: 'export_report', props: { verdict: 'MAYBE' } },
      'invalid verdict',
    );
  });

  it('rejects negative, non-finite, and unreasonable elapsed time', async () => {
    await assertRejectedWithoutMutation(
      { name: 'first_report', props: { source: 'draft', elapsedMs: -1 } },
      'negative elapsedMs',
    );
    await assertRejectedWithoutMutation(
      '{"name":"first_report","props":{"source":"draft","elapsedMs":1e999}}',
      'non-finite elapsedMs',
      true,
    );
    await assertRejectedWithoutMutation(
      { name: 'first_report', props: { source: 'draft', elapsedMs: 7 * 24 * 60 * 60 * 1000 + 1 } },
      'elapsedMs above seven days',
    );
  });

  it('rejects nested values and screenplay-like free text', async () => {
    await assertRejectedWithoutMutation(
      { name: 'doctor_run', props: { source: { nested: 'draft' } } },
      'nested prop value',
    );
    await assertRejectedWithoutMutation(
      { name: 'doctor_run', props: { source: 'INT. WAREHOUSE - NIGHT\nA writer enters.' } },
      'screenplay-like free text',
    );
  });

  it('rejects event names outside the closed vocabulary', async () => {
    await assertRejectedWithoutMutation(
      { name: 'doctor_run_but_fake', props: { source: 'draft' } },
      'unknown event name',
    );
  });
});

describe('POST /api/events — product-event logger privacy', () => {
  it('logs exactly the accepted event name and never session ids, props, script text, or arbitrary values', async () => {
    const sessionSentinel = 'SESSION_SENTINEL_DO_NOT_LOG';
    const textSentinel = 'INT. SECRET SET - NIGHT TEXT_SENTINEL_DO_NOT_LOG';
    const propSentinel = 'PROP_SENTINEL_DO_NOT_LOG';
    const captured: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown, ...args: unknown[]) => {
      captured.push(String(chunk));
      return (originalWrite as (...values: unknown[]) => boolean)(chunk, ...args);
    }) as typeof process.stdout.write;

    try {
      assert.equal((await postEvent({
        name: 'doctor_run',
        sessionId: sessionSentinel,
        props: { source: 'draft', arbitrary: propSentinel, scriptText: textSentinel },
      })).status, 400);
      assert.equal((await postEvent({ name: 'doctor_run', props: { source: 'upload' } })).status, 202);
    } finally {
      process.stdout.write = originalWrite;
    }

    const productEventLines = captured
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.includes('"msg":"product_event"'));
    assert.equal(productEventLines.length, 1, `expected one product event log, got: ${captured.join('')}`);
    const productEvent = JSON.parse(productEventLines[0]!) as Record<string, unknown>;
    assert.deepEqual(Object.keys(productEvent).sort(), ['level', 'msg', 'name', 'time']);
    assert.equal(productEvent.name, 'doctor_run');
    assert.ok(!productEventLines[0]!.includes(sessionSentinel));
    assert.ok(!productEventLines[0]!.includes(textSentinel));
    assert.ok(!productEventLines[0]!.includes(propSentinel));
    assert.ok(!Object.hasOwn(productEvent, 'props'));
    assert.ok(!Object.hasOwn(productEvent, 'sessionId'));
  });
});

describe('GET /api/events/summary — process-local aggregate math', () => {
  it('reports null rates before any accepted runs', async () => {
    const summary = await getSummary();
    assert.equal(summary.exportRate, null);
    assert.equal(summary.avgTimeToFirstReportMs, null);
    assert.deepEqual(summary.counts, {
      doctor_run: 0, export_report: 0, first_report: 0, verify_run: 0,
    });
    assert.ok(typeof summary.since === 'string' && summary.since.length > 0);
  });

  it('computes exportRate as exports / doctor runs without inventing unique users', async () => {
    for (let i = 0; i < 4; i += 1) {
      await postEvent({ name: 'doctor_run', props: { source: 'draft' } });
    }
    await postEvent({ name: 'export_report', props: { verdict: 'PASS' } });
    assert.equal((await getSummary()).exportRate, 0.25);
  });

  it('reports an exportRate above 1 when one client reports multiple exports', async () => {
    await postEvent({ name: 'doctor_run', props: { source: 'draft' } });
    await postEvent({ name: 'export_report', props: { verdict: 'PASS' } });
    await postEvent({ name: 'export_report', props: { verdict: 'PASS' } });
    assert.equal((await getSummary()).exportRate, 2);
  });
});
