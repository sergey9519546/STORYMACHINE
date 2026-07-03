import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';

describe('routes/export — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/export/fdx rejects a missing fountain field with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/export/fdx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/export/fdx returns 200 with XML for a valid fountain body', async () => {
    const res = await fetch(`${server.baseUrl}/api/export/fdx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: 'INT. OFFICE - DAY\n\nAlice sits down.', title: 'Test Script' }),
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('application/xml'));
    const text = await res.text();
    assert.ok(text.includes('<?xml'), 'response should be XML');
  });

  it('POST /api/export/docx rejects a missing fountain field with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/export/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
});
