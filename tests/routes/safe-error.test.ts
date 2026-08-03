// Regression tests for server/lib/safe-error.ts. The core assertion the
// 2026-08-03 audit finding demands: a secret-shaped string must never survive
// to EITHER sink (HTTP response or logger) — see server/routes/config.ts's
// POST /api/ai-config/test, which used to redact only the response copy and
// log the raw upstream error two lines below it.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeExternalError } from '../../server/lib/safe-error.ts';

// Every secret-shaped fixture below must not survive sanitization — this is
// the literal "assert a secret-shaped string never survives to either sink"
// regression test the task calls for, run over a representative fixture set
// rather than one example. `secrets` lists the EXACT sensitive substrings
// (not the whole message) so the combined-haystack sweep below checks the
// right thing — a field NAME like "api_key" is expected to survive; only the
// VALUE must not.
const SECRET_FIXTURES: Array<{ name: string; raw: string; mustNotContain: RegExp; secrets: string[] }> = [
  {
    name: 'bearer token',
    raw: 'Request failed: Bearer sk-live-abcDEF123456789 was rejected by upstream',
    mustNotContain: /sk-live-abcDEF123456789/,
    secrets: ['sk-live-abcDEF123456789'],
  },
  {
    name: 'OpenAI-style secret key with no Bearer prefix',
    raw: 'invalid_api_key: sk-proj-AbCdEf0123456789ZzYy',
    mustNotContain: /sk-proj-AbCdEf0123456789ZzYy/,
    secrets: ['sk-proj-AbCdEf0123456789ZzYy'],
  },
  {
    name: 'Google API key',
    raw: 'fetch failed for https://generativelanguage.googleapis.com/v1?key=AIzaSyD-abcDEF1234567890ghijklmnop',
    mustNotContain: /AIzaSyD-abcDEF1234567890ghijklmnop/,
    secrets: ['AIzaSyD-abcDEF1234567890ghijklmnop'],
  },
  {
    name: 'generic api_key= field in free text',
    raw: 'config rejected: api_key=sUpErSecr3tValue1234 is malformed',
    mustNotContain: /sUpErSecr3tValue1234/,
    secrets: ['sUpErSecr3tValue1234'],
  },
  {
    name: 'token= query parameter',
    raw: 'GET https://example.com/callback?token=abcdef0123456789&state=xyz failed with 401',
    mustNotContain: /abcdef0123456789/,
    secrets: ['abcdef0123456789'],
  },
  {
    name: 'connection string with embedded credentials',
    raw: 'connect ECONNREFUSED postgres://admin:hunter2pass@db.internal.example:5432/prod',
    mustNotContain: /hunter2pass/,
    secrets: ['hunter2pass'],
  },
  {
    name: 'absolute POSIX filesystem path',
    raw: 'ENOENT: no such file or directory, open \'/home/user/STORYMACHINE/data/sessions/abc123.db\'',
    mustNotContain: /\/home\/user\/STORYMACHINE\/data\/sessions/,
    secrets: ['/home/user/STORYMACHINE/data/sessions/abc123.db'],
  },
  {
    name: 'absolute Windows filesystem path',
    raw: 'EBUSY: resource busy or locked, open \'C:\\Users\\writer\\AppData\\Local\\storymachine\\session.db\'',
    mustNotContain: /C:\\Users\\writer\\AppData/,
    secrets: ['C:\\Users\\writer\\AppData\\Local\\storymachine\\session.db'],
  },
  {
    name: 'multiple secrets in one message',
    raw: 'Bearer sk-abc123 rejected; retry with api_key=anothersecret999 against mongodb://u:p@host/db',
    mustNotContain: /sk-abc123|anothersecret999|:p@host/,
    secrets: ['sk-abc123', 'anothersecret999', 'u:p@host'],
  },
];

describe('server/lib/safe-error — sanitizeExternalError', () => {
  for (const fixture of SECRET_FIXTURES) {
    it(`redacts: ${fixture.name}`, () => {
      const { message } = sanitizeExternalError(new Error(fixture.raw));
      assert.doesNotMatch(message, fixture.mustNotContain, `sanitized message still contains the secret: ${message}`);
    });

    it(`redacts (non-Error thrown value): ${fixture.name}`, () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      const { message } = sanitizeExternalError(fixture.raw);
      assert.doesNotMatch(message, fixture.mustNotContain, `sanitized message still contains the secret: ${message}`);
    });
  }

  it('never emits a secret-shaped string across the full fixture set — combined haystack check', () => {
    const combined = SECRET_FIXTURES.map(f => sanitizeExternalError(new Error(f.raw)).message).join('\n');
    // Sanity sweep over the EXACT secret values (not field names, hosts, or
    // other incidental text that is fine to leave visible) — none may appear
    // anywhere in the combined sanitized output.
    for (const f of SECRET_FIXTURES) {
      for (const secret of f.secrets) {
        assert.ok(!combined.includes(secret), `leaked secret "${secret}" from fixture "${f.name}"`);
      }
    }
  });

  it('preserves ordinary, non-secret error text unchanged', () => {
    const { message } = sanitizeExternalError(new Error('Agent \'ghost\' does not exist in this session'));
    assert.equal(message, "Agent 'ghost' does not exist in this session");
  });

  it('truncates long messages to a bounded length with an ellipsis', () => {
    const longMessage = 'x'.repeat(500);
    const { message } = sanitizeExternalError(new Error(longMessage));
    assert.ok(message.length <= 201, `expected <=201 chars (200 + ellipsis), got ${message.length}`);
    assert.ok(message.endsWith('…'));
  });

  it('redacts BEFORE truncating, so a secret straddling the truncation boundary cannot survive as a partial fragment', () => {
    // Construct a message where a long, sk-prefixed secret sits exactly across
    // the 200-char truncation boundary — the naive truncate-then-redact order
    // would cut the token in half and the regex would no longer match the
    // remaining fragment. Redact-then-truncate must not have this failure mode.
    const prefix = 'error: '.padEnd(190, ' ');
    const secret = 'sk-' + 'A'.repeat(60); // token starts before char 200, ends well after
    const raw = prefix + secret + ' rejected';
    const { message } = sanitizeExternalError(new Error(raw));
    assert.doesNotMatch(message, /sk-A{5,}/, `partial secret fragment survived truncation: ${message}`);
  });

  it('reports the errorClass for a genuine Error and typeof for a non-Error throw', () => {
    assert.equal(sanitizeExternalError(new TypeError('bad')).errorClass, 'TypeError');
    assert.equal(sanitizeExternalError('plain string').errorClass, 'string');
    assert.equal(sanitizeExternalError(42).errorClass, 'number');
  });

  it('passes through a genuine numeric status/statusCode property, but not from arbitrary text', () => {
    const withStatus = Object.assign(new Error('upstream failed'), { status: 429 });
    assert.equal(sanitizeExternalError(withStatus).status, 429);

    const withStatusCode = Object.assign(new Error('upstream failed'), { statusCode: 503 });
    assert.equal(sanitizeExternalError(withStatusCode).status, 503);

    const withoutStatus = new Error('status: 500 mentioned only in text');
    assert.equal(sanitizeExternalError(withoutStatus).status, undefined);
  });

  it('ignores a non-numeric or out-of-range status-like property rather than passing it through', () => {
    const bogus1 = Object.assign(new Error('x'), { status: 'not-a-number' });
    assert.equal(sanitizeExternalError(bogus1).status, undefined);
    const bogus2 = Object.assign(new Error('x'), { status: 999999 });
    assert.equal(sanitizeExternalError(bogus2).status, undefined);
  });

  it('is idempotent — sanitizing an already-sanitized message changes nothing further', () => {
    const first = sanitizeExternalError(new Error('Bearer sk-abc123 leaked postgres://u:p@h/db'));
    const second = sanitizeExternalError(new Error(first.message));
    assert.equal(second.message, first.message);
  });
});
