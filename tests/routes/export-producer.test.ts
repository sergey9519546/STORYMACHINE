// Run 14, ROADMAP §10 (producer tier) — POST /api/export/slate,
// POST /api/export/breakdown, POST /api/export/pitchkit. Conventions:
// node:test + assert/strict + startTestServer, matching
// tests/routes/export-coverage.test.ts. All three routes are deterministic
// and keyless — no AI key is configured anywhere in this test process, so a
// 200 here is proof the "keyless" contract holds, not an accident of test
// environment setup.

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

// A shorter, thinner script — deliberately weaker material (fewer scenes,
// no clock, no revelations, no clue-lifecycle) so it should rank below
// MULTI_SCENE_FOUNTAIN in the slate.
const THIN_FOUNTAIN = `INT. OFFICE - DAY

A desk. A chair. Nothing happens.

BOB
Hello.

ALICE
Hi.
`;

const MULTI_SCENE_FDX = fountainToFdx(MULTI_SCENE_FOUNTAIN, 'The Long Wait');

describe('routes/export/slate — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown, query = '') => fetch(`${server.baseUrl}/api/export/slate${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('ranks scripts by health, descending, and is deterministic across repeat calls', async () => {
    const body = {
      scripts: [
        { title: 'Thin Draft', fountain: THIN_FOUNTAIN },
        { title: 'The Long Wait', fountain: MULTI_SCENE_FOUNTAIN },
      ],
    };
    const res1 = await post(body);
    assert.equal(res1.status, 200);
    const json1 = await res1.json();
    assert.ok(Array.isArray(json1.slate));
    assert.equal(json1.slate.length, 2);
    assert.ok(typeof json1.rankedAt === 'number');

    // Ranked health desc.
    for (let i = 1; i < json1.slate.length; i++) {
      assert.ok(json1.slate[i - 1].health >= json1.slate[i].health);
    }

    for (const entry of json1.slate) {
      assert.ok(typeof entry.title === 'string');
      assert.ok(typeof entry.health === 'number');
      assert.ok(typeof entry.sceneCount === 'number');
      assert.ok(typeof entry.wordCount === 'number');
      assert.ok(typeof entry.topDimension === 'string');
      assert.ok(typeof entry.weakestDimension === 'string');
      assert.ok(typeof entry.contentHash === 'string' && entry.contentHash.length > 0);
    }

    // Determinism: same input, same ranking (minus rankedAt).
    const res2 = await post(body);
    const json2 = await res2.json();
    assert.deepEqual(
      json2.slate.map((e: { title: string; health: number; contentHash: string }) => [e.title, e.health, e.contentHash]),
      json1.slate.map((e: { title: string; health: number; contentHash: string }) => [e.title, e.health, e.contentHash]),
    );
  });

  it('returns 400 for a single-script slate (min 2)', async () => {
    const res = await post({ scripts: [{ title: 'Solo', fountain: MULTI_SCENE_FOUNTAIN }] });
    assert.equal(res.status, 400);
  });

  it('returns 400 for a slate over 20 scripts', async () => {
    const scripts = Array.from({ length: 21 }, (_, i) => ({ title: `Script ${i}`, fountain: THIN_FOUNTAIN }));
    const res = await post({ scripts });
    assert.equal(res.status, 400);
  });

  it('returns 400 when the combined fountain length exceeds the 900,000-char cap', async () => {
    const big = 'A'.repeat(500_000);
    const res = await post({
      scripts: [
        { title: 'Big One', fountain: big },
        { title: 'Big Two', fountain: big },
      ],
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /900,000 characters/);
  });

  it('format:"html" (body) returns a standalone comparative HTML table as an attachment', async () => {
    const res = await post({
      scripts: [
        { title: 'Thin Draft', fountain: THIN_FOUNTAIN },
        { title: 'The Long Wait', fountain: MULTI_SCENE_FOUNTAIN },
      ],
      format: 'html',
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('text/html'));
    const disposition = res.headers.get('content-disposition') ?? '';
    assert.match(disposition, /attachment/);
    assert.match(disposition, /filename="slate-triage\.html"/);

    const html = await res.text();
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.match(html, /<table>/);
    assert.match(html, /Thin Draft/);
    assert.match(html, /The Long Wait/);
    assert.ok(!/<script/i.test(html));
  });

  it('format=html via query string also returns the HTML variant', async () => {
    const res = await post({
      scripts: [
        { title: 'Thin Draft', fountain: THIN_FOUNTAIN },
        { title: 'The Long Wait', fountain: MULTI_SCENE_FOUNTAIN },
      ],
    }, '?format=html');
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('text/html'));
  });

  it('escapes a hostile title in the HTML variant rather than injecting it verbatim', async () => {
    const res = await post({
      scripts: [
        { title: '<script>alert(1)</script>', fountain: THIN_FOUNTAIN },
        { title: 'Clean Title', fountain: MULTI_SCENE_FOUNTAIN },
      ],
      format: 'html',
    });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(!/<script>alert\(1\)<\/script>/.test(html));
    assert.ok(!/<script/i.test(html));
  });
});

describe('routes/export/breakdown — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/export/breakdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('POST fountain returns a CSV attachment with header + one row per scene', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('text/csv'));
    const disposition = res.headers.get('content-disposition') ?? '';
    assert.match(disposition, /attachment/);
    assert.match(disposition, /filename="[^"]*-breakdown\.csv"/);

    const csv = await res.text();
    const lines = csv.split('\r\n').filter(Boolean);
    // MULTI_SCENE_FOUNTAIN has 4 scene headings.
    assert.equal(lines.length, 5, 'header + 4 scene rows');
    assert.match(lines[0], /^Scene Number,Slug,Location,INT\/EXT,Time of Day,Speaking Characters,Word Count,Has Clock,Has Clue Seeded/);
    assert.match(lines[1], /^1,INT\. WAREHOUSE - NIGHT,WAREHOUSE,INT,NIGHT,JAX;MARA,/);
  });

  it('escapes a comma-and-quote slug correctly in the CSV body', async () => {
    const fountain = `INT. "THE LOT", SIDE STREET - DAWN

A truck idles.

MARA
Someone's here.
`;
    const res = await post({ fountain });
    assert.equal(res.status, 200);
    const csv = await res.text();
    assert.match(csv, /"INT\. ""THE LOT"", SIDE STREET - DAWN"/);
  });

  it('accepts an .fdx body via the same exactly-one-of contract as /doctor and /coverage', async () => {
    const res = await post({ fdx: MULTI_SCENE_FDX, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    const csv = await res.text();
    const lines = csv.split('\r\n').filter(Boolean);
    assert.equal(lines.length, 5);
  });

  it('returns 400 when both fountain and fdx are provided', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, fdx: MULTI_SCENE_FDX });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('returns 400 when neither fountain nor fdx is provided', async () => {
    const res = await post({ title: 'Untitled' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });
});

describe('routes/export/pitchkit — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/export/pitchkit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('POST fountain returns 200 standalone HTML with tension-curve and character-map SVGs, keyless', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('text/html'));
    const disposition = res.headers.get('content-disposition') ?? '';
    assert.match(disposition, /attachment/);
    assert.match(disposition, /filename="[^"]*-pitchkit\.html"/);

    const html = await res.text();
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    // Two <svg> blocks: tension curve, character map.
    const svgCount = (html.match(/<svg/g) ?? []).length;
    assert.equal(svgCount, 2, 'expected exactly two <svg> elements (tension curve + character map)');
    assert.match(html, /<path /, 'tension curve must draw a path');
    assert.match(html, /<circle /, 'character map must draw at least one node circle');
    assert.match(html, /JAX|MARA|STRANGER/, 'character names must appear in the map');
    assert.match(html, /RECOMMEND|CONSIDER|PASS/, 'summary strip must carry a coverage verdict');
    assert.ok(!/<script/i.test(html), 'export must not contain any <script> tag');
  });

  it('accepts an .fdx body via the same exactly-one-of contract', async () => {
    const res = await post({ fdx: MULTI_SCENE_FDX, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /<svg/);
  });

  it('escapes a hostile title rather than injecting it verbatim', async () => {
    const maliciousTitle = '<b>Bad</b> Title <script>alert(1)</script>';
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: maliciousTitle });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(!html.includes('<b>Bad</b>'), 'raw <b> tag from the title must not survive verbatim');
    assert.ok(!/<script>alert\(1\)<\/script>/i.test(html), 'raw <script> tag must not survive verbatim');
    assert.ok(!/<script/i.test(html), 'no <script> tag anywhere in the response');
    assert.ok(html.includes('&lt;b&gt;Bad&lt;/b&gt;'), 'the title must appear HTML-escaped rather than dropped');
  });

  it('escapes an apostrophe-bearing character name in the character map without breaking the SVG', async () => {
    // parseFountain's character-cue regex only allows [A-Z0-9 \t'.#-], so an
    // apostrophe is the one "special" character a legitimate cue can carry
    // (e.g. "O'BRIEN") — confirms escapeHtml's &#39; substitution runs on
    // every character-map node label, not just on the title.
    const fountain = `INT. LAB - DAY

A quiet lab.

O'BRIEN
Hello there, this is a normal-length line.

MARA
Hi back, nice to meet you.
`;
    const res = await post({ fountain });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /O&#39;BRIEN/);
    assert.ok(!html.includes("O'BRIEN<"), 'a bare unescaped apostrophe name must not sit directly against a tag');
  });

  it('returns 400 when both fountain and fdx are provided', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, fdx: MULTI_SCENE_FDX });
    assert.equal(res.status, 400);
  });

  it('returns 400 when neither fountain nor fdx is provided', async () => {
    const res = await post({ title: 'Untitled' });
    assert.equal(res.status, 400);
  });
});
