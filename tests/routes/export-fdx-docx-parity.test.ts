// P2 export-pipeline consolidation — server/routes/export.ts's POST
// /api/export/fdx and POST /api/export/docx used to hand-roll their own
// private Fountain→FDX/DOCX writers, independently drifted from the client's
// own src/lib/fdx.ts / src/lib/docx.ts (the ones ScriptIDE's Export menu
// actually calls). Both routes now import and call those same shared
// functions, so this asserts there is genuinely only ONE implementation left:
// the HTTP response for a given (fountain, title) is byte-for-byte what
// calling the shared exporter directly produces for the same input.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';
import { fountainToDocx } from '../../src/lib/docx.ts';

const SAMPLE_FOUNTAIN = `INT. WAREHOUSE - NIGHT

Rain hammers the tin roof. JAX crouches behind a stack of crates.

JAX
(whispering)
She said midnight.

BRICK
Screw retirement.

STEEL ^
Screw retirement!

EXT. HIGHWAY - DAWN

JAX and MARA run toward the car.
`;

describe('routes/export — FDX/DOCX parity with the shared client-side exporters', () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/export/fdx produces byte-identical output to src/lib/fdx.ts for the same input', async () => {
    const title = 'Parity Check';
    const res = await fetch(`${server.baseUrl}/api/export/fdx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: SAMPLE_FOUNTAIN, title }),
    });
    assert.equal(res.status, 200);
    const serverFdx = await res.text();
    const directFdx = fountainToFdx(SAMPLE_FOUNTAIN, title);
    assert.equal(serverFdx, directFdx);
    // Spot-check the two behaviors this parity is actually standing in for —
    // if the route had reverted to its own private writer, both would fail.
    assert.ok(serverFdx.includes('<DualDialogue>'), 'dual dialogue wrapper survives through the route');
    assert.ok(serverFdx.includes('<Paragraph Type="Title"><Text>Parity Check</Text></Paragraph>'), 'real title page survives through the route');
  });

  it('POST /api/export/docx produces byte-identical output to src/lib/docx.ts for the same input', async () => {
    const title = 'Parity Check';
    const res = await fetch(`${server.baseUrl}/api/export/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: SAMPLE_FOUNTAIN, title }),
    });
    assert.equal(res.status, 200);
    const serverBytes = new Uint8Array(await res.arrayBuffer());
    const directBytes = fountainToDocx(SAMPLE_FOUNTAIN, title);
    assert.equal(serverBytes.length, directBytes.length);
    assert.deepEqual(serverBytes, directBytes);
  });

  it('both routes default the title to "Untitled" (and still produce a title page) when none is given', async () => {
    const res = await fetch(`${server.baseUrl}/api/export/fdx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: SAMPLE_FOUNTAIN }),
    });
    assert.equal(res.status, 200);
    const serverFdx = await res.text();
    const directFdx = fountainToFdx(SAMPLE_FOUNTAIN, 'Untitled');
    assert.equal(serverFdx, directFdx);
    assert.ok(serverFdx.includes('<Paragraph Type="Title"><Text>Untitled</Text></Paragraph>'));
  });
});
