// POST /api/export/coverage — the shareable Script Doctor coverage-report
// HTML export. Conventions: node:test + assert/strict + startTestServer,
// matching tests/routes/scriptide-doctor.test.ts and tests/routes/export.test.ts.
//
// Coverage: the two-format DoctorBodySchema contract (valid fountain, valid
// fdx, both fields, neither field), the response envelope (200, text/html,
// attachment Content-Disposition with a filename), that the body carries a
// verdict and a "verification hash", and that a title containing angle
// brackets is HTML-escaped rather than injected verbatim into the exported
// document.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';

// Same shape of fixture as tests/routes/scriptide-doctor.test.ts: enough
// scenes/dialogue/characters for the 14 revision passes to have real
// material, so this exercises a non-degenerate report end to end.
const MULTI_SCENE_FOUNTAIN = `INT. WAREHOUSE - NIGHT

Rain hammers the tin roof. JAX crouches behind a stack of crates, a gun in his hand.

JAX
(whispering)
She said midnight. It's already past that.

MARA
We wait. If they're not here by dawn, we run.

JAX
I don't like waiting in the dark.

EXT. WAREHOUSE - CONTINUOUS

A truck's headlights sweep across the gravel lot. MARA watches through a cracked window.

MARA
Someone's here. Get down.

INT. WAREHOUSE - MOMENTS LATER

The door bursts open. A STRANGER steps inside, face hidden in shadow.

STRANGER
I know what you did.

JAX
That's not true.

STRANGER
You've been lying to her since the beginning.

MARA
Jax? What is he talking about?

EXT. HIGHWAY - DAWN

JAX and MARA run toward the car as the "SILVER KEY" catches the first light.

MARA
Just drive. We'll figure out the rest later.

JAX
I'm sorry. I should have told you everything.
`;

const MULTI_SCENE_FDX = fountainToFdx(MULTI_SCENE_FOUNTAIN, 'The Long Wait');

describe('routes/export/coverage — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/export/coverage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('POST a valid Fountain body returns 200 text/html with an attachment filename and a rendered report', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('text/html'));

    const disposition = res.headers.get('content-disposition') ?? '';
    assert.match(disposition, /attachment/);
    assert.match(disposition, /filename="[^"]*-coverage\.html"/);
    assert.match(disposition, /The(%20|\+)Long(%20|\+)Wait-coverage\.html/);

    const html = await res.text();
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.match(html, /RECOMMEND|CONSIDER|PASS/, 'body must carry a coverage verdict');
    assert.match(html, /Verification hash/i, 'body must carry the verification hash footer');
    assert.ok(!/<script/i.test(html), 'export must not contain any <script> tag');
  });

  it('POST a valid Final Draft (.fdx) body returns 200 with a rendered report', async () => {
    const res = await post({ fdx: MULTI_SCENE_FDX, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('text/html'));

    const html = await res.text();
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.match(html, /RECOMMEND|CONSIDER|PASS/);
    assert.match(html, /Verification hash/i);
  });

  it('POST a body with both fountain and fdx returns 400', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, fdx: MULTI_SCENE_FDX });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('POST a body with neither fountain nor fdx returns 400', async () => {
    const res = await post({ title: 'Untitled' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('POST a malformed fdx (no <Paragraph> elements) returns 400', async () => {
    const res = await post({ fdx: '<FinalDraft><Content></Content></FinalDraft>' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(typeof body.error === 'string' && body.error.length > 0);
  });

  it('POST an empty-string fountain returns 400 (zod .min(1))', async () => {
    const res = await post({ fountain: '' });
    assert.equal(res.status, 400);
  });

  it('does not leak an unescaped title into the exported HTML', async () => {
    const maliciousTitle = '<b>Bad</b> Title <script>alert(1)</script>';
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: maliciousTitle });
    assert.equal(res.status, 200);

    const html = await res.text();
    assert.ok(!html.includes('<b>Bad</b>'), 'raw <b> tag from the title must not survive verbatim');
    assert.ok(!/<script>alert\(1\)<\/script>/.test(html), 'raw <script> tag from the title must not survive verbatim');
    assert.ok(!/<script/i.test(html), 'no <script> tag anywhere in the response');
    assert.ok(html.includes('&lt;b&gt;Bad&lt;/b&gt;'), 'the title must appear HTML-escaped rather than dropped');
  });
});
