// Client telemetry must remain a closed, session-unlinked aggregate emitter.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { trackDoctorRun, trackEvent } from '../../src/lib/analytics.ts';

const ANALYTICS_SRC = path.resolve(import.meta.dirname, '../../src/lib/analytics.ts');

describe('client analytics — no telemetry session identifier', () => {
  it('does not retain identifier-generation or sessionId serialization code', () => {
    const source = fs.readFileSync(ANALYTICS_SRC, 'utf8');
    assert.doesNotMatch(source, /crypto\.randomUUID\s*\(/);
    assert.doesNotMatch(source, /SESSION_ID_KEY|sm_session_id/);
    assert.doesNotMatch(source, /JSON\.stringify\s*\(\s*\{[^}]*sessionId/s);
  });

  it('posts the exact endpoint, content header, and closed body without reading either identity store', async () => {
    const originalFetch = globalThis.fetch;
    const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const originalSessionStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    let randomUuidCalls = 0;
    let sessionStorageReads = 0;
    let sessionStorageWrites = 0;
    let localStorageReads = 0;
    let localStorageWrites = 0;

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: () => { randomUuidCalls += 1; return 'telemetry-id-sentinel'; } },
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: () => { sessionStorageReads += 1; return null; },
        setItem: () => { sessionStorageWrites += 1; },
      },
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => { localStorageReads += 1; return 'storymachine-session-id-sentinel'; },
        setItem: () => { localStorageWrites += 1; },
      },
    });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, init });
      return new Response(null, { status: 202 });
    }) as typeof fetch;

    try {
      trackEvent('doctor_run', { source: 'sample' });
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      globalThis.fetch = originalFetch;
      if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
      else delete (globalThis as { crypto?: Crypto }).crypto;
      if (originalSessionStorage) Object.defineProperty(globalThis, 'sessionStorage', originalSessionStorage);
      else delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
      if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
      else delete (globalThis as { localStorage?: Storage }).localStorage;
    }

    assert.equal(randomUuidCalls, 0);
    assert.equal(sessionStorageReads, 0);
    assert.equal(sessionStorageWrites, 0);
    assert.equal(localStorageReads, 0);
    assert.equal(localStorageWrites, 0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0]!.input, '/api/events');
    assert.equal(requests[0]!.init?.method, 'POST');
    assert.equal(requests[0]!.init?.keepalive, true);
    assert.deepEqual(
      [...new Headers(requests[0]!.init?.headers).entries()],
      [['content-type', 'application/json']],
      'Content-Type must be the only header; no session or identity header may be serialized',
    );
    assert.deepEqual(
      JSON.parse(String(requests[0]!.init?.body)),
      { name: 'doctor_run', props: { source: 'sample' } },
    );
  });

  it('retains the once-per-tab first-report flag in sessionStorage without consulting localStorage', async () => {
    const originalFetch = globalThis.fetch;
    const originalSessionStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const bodies: Array<{ name: string; props: Record<string, unknown> }> = [];
    let firstReportFlag: string | null = null;
    const sessionStorageReads: string[] = [];
    const sessionStorageWrites: Array<[string, string]> = [];
    let localStorageReads = 0;

    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => { sessionStorageReads.push(key); return firstReportFlag; },
        setItem: (key: string, value: string) => {
          sessionStorageWrites.push([key, value]);
          firstReportFlag = value;
        },
      },
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => { localStorageReads += 1; return 'storymachine-session-id-sentinel'; },
        setItem: () => { throw new Error('analytics must not write localStorage'); },
      },
    });
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(null, { status: 202 });
    }) as typeof fetch;

    try {
      trackDoctorRun('draft');
      trackDoctorRun('draft');
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      globalThis.fetch = originalFetch;
      if (originalSessionStorage) Object.defineProperty(globalThis, 'sessionStorage', originalSessionStorage);
      else delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
      if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
      else delete (globalThis as { localStorage?: Storage }).localStorage;
    }

    assert.deepEqual(bodies.map(({ name }) => name), ['doctor_run', 'first_report', 'doctor_run']);
    assert.equal(bodies[1]!.props.source, 'draft');
    assert.equal(typeof bodies[1]!.props.elapsedMs, 'number');
    assert.deepEqual(sessionStorageReads, ['sm_first_report_sent', 'sm_first_report_sent']);
    assert.deepEqual(sessionStorageWrites, [['sm_first_report_sent', '1']]);
    assert.equal(localStorageReads, 0);
  });
});
