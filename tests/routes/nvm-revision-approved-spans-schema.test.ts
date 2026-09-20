// tests/routes/nvm-revision-approved-spans-schema.test.ts — behavioral HTTP
// coverage for POST /api/nvm/revise's approvedSpans field, closing the gap
// recorded by the per-pass-diagnostics lane
// (docs/audits/2026-09-20-per-pass-diagnostics/README.md §8, "No stricter
// schema for approvedSpans at the route"): the field used to reach the route
// as `z.array(z.unknown())`, force-cast to `ApprovedSpan[]`, so a malformed
// span silently lost its lock (every consumer skips what it cannot use)
// instead of the caller getting a 400 naming the bad field.
//
// FAIL-FIRST: every case below that now expects 400 used to return 200 on
// the pre-change schema (`z.array(z.unknown())` accepts any array contents).
// This file was run against the pre-change tree and each such case is
// annotated with what it returned then; see
// docs/audits/2026-09-20-approved-spans-schema/README.md for the full
// before/after table.
//
// KEYLESS, same contract as tests/routes/nvm-revision.test.ts: no
// GEMINI_API_KEY, so every accepted request still runs all 14 passes and
// rewrites nothing. This file only asserts the schema boundary (400 vs
// 200-shape), not pass content — that is nvm-revision.test.ts's job.
//
// BUDGET: this file spends 10 of its own 20-request/60s aiLimiter budget
// (node:test runs each file in its own process, so the budget is per-file —
// see nvm-revision.test.ts's header) — all 10 requests go to
// POST /api/nvm/revise.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

interface RevisionResultShape {
  passResults: Array<{ pass: string }>;
  finalFountain: string;
  originalFountain: string;
}

describe('POST /api/nvm/revise — approvedSpans schema (typed line ranges, not unknown[])', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  async function revise(approvedSpans: unknown): Promise<Response> {
    return fetch(`${server.baseUrl}/api/nvm/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), approvedSpans }),
    });
  }

  async function assertAccepted(approvedSpans: unknown): Promise<void> {
    const res = await revise(approvedSpans);
    assert.equal(res.status, 200);
    const body = await res.json() as RevisionResultShape;
    assert.equal(body.passResults.length, 14, 'keyless revise must still run all 14 passes');
    assert.equal(
      body.finalFountain, body.originalFountain,
      'keyless mode must return the draft byte-identical',
    );
  }

  async function assertRejected(approvedSpans: unknown, fieldPrefix = 'approvedSpans'): Promise<void> {
    const res = await revise(approvedSpans);
    assert.equal(res.status, 400);
    const body = await res.json() as { error: string };
    assert.match(body.error, new RegExp(`^${fieldPrefix}`), `error must name the ${fieldPrefix} field`);
  }

  // Pre-change: 200 (z.array(z.unknown()) let `startLine: 0` straight through;
  // the pipeline's consumers silently skipped the span — see
  // relocateApprovedSpans's `skipped` bucket and approvedSpansSurvive).
  it('rejects startLine: 0 with 400 naming approvedSpans (line numbers are 1-based)', async () => {
    await assertRejected([{ startLine: 0, endLine: 1, reason: 'ok' }]);
  });

  // Pre-change: 200.
  it('rejects endLine < startLine with 400', async () => {
    await assertRejected([{ startLine: 5, endLine: 3, reason: 'ok' }]);
  });

  // Pre-change: 200 — a string line number reached relocateApprovedSpans's
  // Number.isFinite(startLine) check and was silently treated as an invalid
  // range (skipped), never a 400.
  it('rejects a string startLine ("3") with 400', async () => {
    await assertRejected([{ startLine: '3', endLine: 5, reason: 'ok' }]);
  });

  // Pre-change: 200 — approvedSpanInstructions already tolerates a
  // non-string reason (`typeof s.reason === 'string' ? ... : ''`), so a
  // numeric reason silently became "no reason" instead of a rejected request.
  it('rejects a non-string reason (42) with 400', async () => {
    await assertRejected([{ startLine: 1, endLine: 2, reason: 42 }]);
  });

  // `reason` was always optional on the wire (only ApprovedSpan the TS
  // interface makes it required; the schema deliberately does not, matching
  // the consumers' existing tolerance for an absent reason). Pre-change: 200.
  it('accepts a well-formed span with no reason at all', async () => {
    await assertAccepted([{ startLine: 1, endLine: 2 }]);
  });

  // Pre-change: 200 (reason had no length cap at all).
  it('accepts a well-formed span with a 500-char reason (the cap)', async () => {
    await assertAccepted([{ startLine: 1, endLine: 2, reason: 'x'.repeat(500) }]);
  });

  // Pre-change: 200.
  it('rejects a reason one character past the 500-char cap with 400', async () => {
    await assertRejected([{ startLine: 1, endLine: 2, reason: 'x'.repeat(501) }]);
  });

  // Pre-change: 200 (no array-length cap existed).
  it('accepts exactly 200 well-formed spans (the array-length cap)', async () => {
    const spans = Array.from({ length: 200 }, (_, i) => ({ startLine: i + 1, endLine: i + 1 }));
    await assertAccepted(spans);
  });

  it('rejects 201 well-formed spans with 400 (one past the array-length cap)', async () => {
    const spans = Array.from({ length: 201 }, (_, i) => ({ startLine: i + 1, endLine: i + 1 }));
    await assertRejected(spans);
  });

  // Unchanged behavior: approvedSpans has always been optional.
  it('leaves the no-approvedSpans-field request unchanged (still 200)', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as RevisionResultShape;
    assert.equal(body.passResults.length, 14);
  });
});
