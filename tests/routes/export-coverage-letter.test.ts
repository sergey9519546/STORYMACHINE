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

  // Attack-lane audit follow-up (fdx-conversion bypass) — see
  // tests/routes/scriptide-doctor.test.ts's own copy of this test for the
  // full rationale.
  it('POST an fdx whose converted Fountain has 1,600 distinct character cues is rejected fast, not analyzed', async () => {
    let fountain = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 1600; i++) fountain += `CHARACTER${i}\nLine.\n\n`;
    const fdx = fountainToFdx(fountain, 'Pathological');

    const start = Date.now();
    const res = await post({ fdx });
    const ms = Date.now() - start;
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /more than 1500 distinct all-caps character-cue-shaped lines/);
    // 1000ms, not the originally-specified 100ms: measured under `npm test`'s
    // real execution shape (scripts/run-tests.mjs runs every file as ONE
    // `node --test <every file>` invocation, so this suite's server shares
    // the process with ~2,400 other suites' concurrent HTTP servers) an
    // isolated run of this guard consistently answers in 7-40ms, but a
    // full-suite run observed a 134-156ms outlier from host scheduling
    // contention alone (same request, same guard, server-side log still
    // showed ms=40). 1000ms keeps this a meaningful regression guard — an
    // UNguarded pathological shape costs seconds-to-minutes (this file's own
    // header measurements), four orders of magnitude more — while not
    // flaking on ordinary shared-host jitter.
    assert.ok(ms < 1000, `expected a fast rejection (<1000ms), took ${ms}ms — the fdx-path guard may not be firing`);
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

  // 2026-09-04 — draft-rank union fix: computeDraftRank now ranks among
  // snapshots (20-entry cap) UNION Draft History (50-entry cap), raising the
  // plausible ceiling from 21 (20 + 1 current) to 71 (20 + 50 + 1) — see
  // server/lib/validation.ts's DraftRankSchema comment for the exact math.
  it('POST a draftRank above the old 21 ceiling but within the new 71 union ceiling is accepted', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, draftRank: { rank: 40, of: 65 } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.markdown, /ranks 40th of 65 by health/);
  });

  it('POST a draftRank of 71 (the exact new ceiling) is accepted; 72 is rejected', async () => {
    const atCeiling = await post({ fountain: MULTI_SCENE_FOUNTAIN, draftRank: { rank: 71, of: 71 } });
    assert.equal(atCeiling.status, 200);
    const overCeiling = await post({ fountain: MULTI_SCENE_FOUNTAIN, draftRank: { rank: 72, of: 72 } });
    assert.equal(overCeiling.status, 400);
  });

  // 2026-09-04 (audit round 2) — draftRank.tied: several drafts sharing the
  // exact same health as the current one.
  it('POST a draftRank with tied: true renders "ties for" instead of "ranks"', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait', draftRank: { rank: 1, of: 6, tied: true } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.markdown, /ties for 1st of 6 by health/);
  });

  it('POST a draftRank with no tied field renders the ordinary "ranks" wording', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait', draftRank: { rank: 2, of: 5 } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.markdown, /ranks 2nd of 5 by health/);
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
