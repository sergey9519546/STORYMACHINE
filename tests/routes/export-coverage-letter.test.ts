// POST /api/export/coverage-letter — the one-to-two-page connected-prose
// coverage LETTER (server/routes/coverage-letter.ts,
// server/lib/coverage-letter.ts). Conventions and fixture text match
// tests/routes/export-coverage.test.ts (the dashboard-style HTML sibling):
// same node:test + startTestServer harness, same MULTI_SCENE_FOUNTAIN/FDX
// fixtures, so the two routes are exercised on materially the same input.
//
// Coverage: the CoverageLetterBodySchema two-format contract (valid
// fountain, valid fdx, both fields, neither field), the JSON response
// envelope (markdown + text + contentHash), an incomplete/scene-truncated
// analysis 422s instead of shipping a partial letter, title/author flow
// through into the letter, and a title/author containing Markdown-hostile
// characters survives as plain text (no HTML-escaping expected here — this
// route emits Markdown/text, not HTML).

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';

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

function buildSceneTruncatedFountain(): string {
  return Array.from(
    { length: 1_001 },
    (_, index) => `INT. ROOM ${index} - DAY\n\nA person waits.`,
  ).join('\n\n');
}

describe('routes/export/coverage-letter — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/export/coverage-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('POST a valid Fountain body returns 200 JSON with markdown, text, and contentHash', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait', author: 'A. Writer' });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('application/json'));

    const body = await res.json();
    assert.equal(typeof body.markdown, 'string');
    assert.equal(typeof body.text, 'string');
    assert.match(body.markdown, /^# The Long Wait/);
    assert.match(body.markdown, /Written by A\. Writer/);
    assert.match(body.markdown, /RECOMMEND|CONSIDER|PASS/);
    assert.match(body.markdown, /## How to Read This Report/);
    assert.match(body.text, /^THE LONG WAIT/);
    assert.equal(typeof body.contentHash, 'string');
    assert.equal(body.contentHash.length, 64, 'must be a full sha256 hex digest, not a truncated form');
    assert.ok(!/<script/i.test(body.markdown), 'no HTML/script content belongs in a Markdown export');
  });

  it('POST a valid Final Draft (.fdx) body returns 200 with a rendered letter', async () => {
    const res = await post({ fdx: MULTI_SCENE_FDX, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.markdown, /RECOMMEND|CONSIDER|PASS/);
    assert.match(body.markdown, /Script-text hash \(SHA-256\)/);
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

  it('POST an over-length author returns 400 (zod .max(300))', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, author: 'x'.repeat(301) });
    assert.equal(res.status, 400);
  });

  // ── draftRank (2026-09-04) — "rank among your own saved drafts of this
  // script", passed through by the client the same way title/author are. ──
  it('POST with a draftRank renders the rank-among-your-drafts line into the letter', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait', draftRank: { rank: 2, of: 5 } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.markdown, /ranks 2nd of 5 by health/);
  });

  it('POST with no draftRank omits the rank-among-your-drafts line', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(!body.markdown.includes('saved draft'));
  });

  it('POST a malformed draftRank (rank > of) returns 400', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, draftRank: { rank: 5, of: 2 } });
    assert.equal(res.status, 400);
  });

  it('POST a malformed draftRank (non-integer) returns 400', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, draftRank: { rank: 1.5, of: 2 } });
    assert.equal(res.status, 400);
  });

  it('refuses to export a letter from a scene-truncated partial analysis', async () => {
    const res = await post({ fountain: buildSceneTruncatedFountain(), title: 'Partial Draft' });
    assert.equal(res.status, 422);
    assert.ok(res.headers.get('content-type')?.startsWith('application/json'));
    const body = await res.json();
    assert.equal(body.error, 'analysis_incomplete');
    assert.match(body.message, /complete/i);
    assert.equal(body.markdown, undefined);
  });

  it('falls back to the Fountain title page when no explicit title is posted', async () => {
    const withTitlePage = `Title: Parsed From Page\nAuthor: Page Author\n\n${MULTI_SCENE_FOUNTAIN}`;
    const res = await post({ fountain: withTitlePage });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.markdown, /^# Parsed From Page/);
    assert.match(body.markdown, /Written by Page Author/);
  });

  it('an explicit title/author overrides the Fountain title page', async () => {
    const withTitlePage = `Title: Parsed From Page\nAuthor: Page Author\n\n${MULTI_SCENE_FOUNTAIN}`;
    const res = await post({ fountain: withTitlePage, title: 'Explicit Title', author: 'Explicit Author' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.markdown, /^# Explicit Title/);
    assert.match(body.markdown, /Written by Explicit Author/);
  });

  it('carries a Markdown-hostile title through as plain text (no HTML escaping applied)', async () => {
    const trickyTitle = '<b>Bad</b> & "Title"';
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: trickyTitle });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.markdown.includes(trickyTitle), 'title must survive verbatim — this route emits Markdown, not HTML, so no entity-escaping applies');
  });

  it('agrees with POST /api/export/coverage on the coverage verdict for the same script', async () => {
    const htmlRes = await fetch(`${server.baseUrl}/api/export/coverage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait' }),
    });
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    const htmlVerdict = html.match(/RECOMMEND|CONSIDER|PASS \(decline\)/)?.[0];

    const letterRes = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait' });
    assert.equal(letterRes.status, 200);
    const letterBody = await letterRes.json();
    const letterVerdict = letterBody.markdown.match(/Verdict: (RECOMMEND|CONSIDER|PASS \(decline\))/)?.[1];

    assert.ok(htmlVerdict, 'HTML export must carry a verdict to compare against');
    assert.equal(letterVerdict, htmlVerdict, 'the two exports must agree on the deterministic verdict for the same script');
  });
});
