// Client telemetry must remain a closed, session-unlinked aggregate emitter.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { trackEvent } from '../../src/lib/analytics.ts';

const ANALYTICS_SRC = path.resolve(import.meta.dirname, '../../src/lib/analytics.ts');

describe('client analytics — no telemetry session identifier', () => {
  it('does not retain identifier-generation or sessionId serialization code', () => {
    const source = fs.readFileSync(ANALYTICS_SRC, 'utf8');
    assert.doesNotMatch(source, /crypto\.randomUUID\s*\(/);
    assert.doesNotMatch(source, /SESSION_ID_KEY|sm_session_id/);
    assert.doesNotMatch(source, /JSON\.stringify\s*\(\s*\{[^}]*sessionId/s);
  });

  it('posts only the closed event name and props without reading storage or minting an id', async () => {
    const originalFetch = globalThis.fetch;
    const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const originalSessionStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    const bodies: unknown[] = [];
    let randomUuidCalls = 0;
    let storageReads = 0;
    let storageWrites = 0;

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: () => { randomUuidCalls += 1; return 'telemetry-id-sentinel'; } },
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: () => { storageReads += 1; return null; },
        setItem: () => { storageWrites += 1; },
      },
    });
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
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
    }

    assert.equal(randomUuidCalls, 0);
    assert.equal(storageReads, 0);
    assert.equal(storageWrites, 0);
    assert.deepEqual(bodies, [{ name: 'doctor_run', props: { source: 'sample' } }]);
  });
});
