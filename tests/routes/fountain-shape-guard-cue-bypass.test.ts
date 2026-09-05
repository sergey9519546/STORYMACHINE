// Cue-definition bypass families — HTTP-level regression coverage.
//
// ROUND 1 (2026-09-04 adversarial audit). server/lib/validation.ts's
// fountainShapeRejectionReason() distinct-cue-line guard tested each line
// against a local ASCII-only, 40-char-capped proxy instead of being composed
// from the analyzer's own cue ALPHABET (src/lib/fountain.ts's
// CUE_INITIAL_CLASS/CUE_LETTER_CLASS, Unicode `\p{Lu}\p{Lt}`, no length cap).
// Non-ASCII capitals (Cyrillic, Greek, accented Latin), cues containing `#`,
// and cues over 40 characters were invisible to the guard and reached the
// analyzer's O(n²) tokenizer/character-extraction cost undiminished.
// Measured against the unfixed guard: 2,000 distinct Cyrillic cues -> HTTP
// 200 in several seconds through POST /api/scriptide/doctor, raw and fdx.
//
// ROUND 2 (independent review, same day). The round-1 fix — composing a new
// CUE_LIKE_LINE_RE from the shared alphabet classes — was STILL an
// independently hand-derived grammar, and it missed the dual-dialogue `^`
// marker CHARACTER_CUE_RE accepts (`\s*\^?\s*`). 2,000 distinct `PERSON<i>^`
// cues reached the analyzer unrejected. Fixed by making the guard's
// predicate (isCueLikeLine, exported from validation.ts) a provable superset
// of CHARACTER_CUE_RE by construction; see
// tests/security/fountain-shape-guard-cue-parity.test.ts for the pure,
// non-HTTP proof (including a grammar-product implication test) that this
// cannot silently regress. This file is the end-to-end proof for both
// rounds: each family, submitted both as raw fountain and as a converted
// .fdx, against both POST /api/scriptide/doctor and POST /api/export/verify,
// rejects fast rather than reaching the analyzer.
//
// ROUND 4 (second independent review, 2026-09-05). The round-3 fix
// (MAX_FOUNTAIN_CUE_WEIGHT) also did not bound cost: walking the weight~9.9M
// iso-curve found the guard rejecting a 31s legal payload while accepting
// two that cost 150-216s (low distinct, high occurrences — the corner
// weight-as-a-product cannot see). Fixed with MAX_FOUNTAIN_FREQUENT_CUE_LINES.
// The describe block at the end of this file reproduces the review's own
// two attack points over HTTP.
//
// ROUND 5 (second independent review, same day, of the round-4 context
// check). "Followed by dialogue" is not just "immediately followed by
// non-blank" — DOUBLE-SPACED Fountain (`NAME\n\nline\n\n`, the shape real
// PDF/FDX imports produce) is reflowed into an adjacent cue+dialogue pair by
// server/nvm/analyze/screenplay-normalizer.ts's normalizeScreenplay() before
// the analyzer ever parses the script, but the round-4 check only looked at
// the immediate next line. Fixed by also admitting a blank-line run then
// non-cue-shaped content.
//
// ROUND 6 (third independent review, same day, of the round-5 fix). The
// round-5 fix probed only a FIXED one-blank-line gap; isDoubleSpaced fires
// on ANY gap >= 1 and normalizeScreenplay's reflow filters out every blank
// line regardless of count, so a 2+-blank-line gap was still invisible.
// Fixed with a forward scan over every consecutive blank line. The
// describe blocks below sweep gap in 1..5 (raw) and 1-2 (.fdx).
//
// The .fdx payloads below are hand-built XML (not produced via
// src/lib/fdx.ts's fountainToFdx), deliberately — fountainToFdx treats a
// trailing `^` as a dual-dialogue FORMATTING marker and strips it from the
// exported Character paragraph's literal text (correct behavior for a
// well-formed exporter). An attacker uploading a hand-crafted .fdx has no
// reason to go through that exporter at all; the literal text inside
// <Paragraph Type="Character"><Text>...</Text></Paragraph> is whatever they
// put there. Hand-building the fdx for every family (not just caret) keeps
// the raw and fdx payloads exactly text-identical, rather than relying on
// fountainToFdx happening to pass the other five families through unchanged.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';

const CUE_COUNT = 2000; // matches the audit's measured payload size exactly

const CUE_LINE_BUILDERS: Record<string, (i: number) => string> = {
  'Cyrillic': (i) => `ПЕРСОНАЖ${i}`,
  'Greek': (i) => `ΧΑΡΑΚΤΗΡΑΣ${i}`,
  'accented Latin': (i) => `JOSÉ MARÍA ZOË${i}`,
  '# in the cue': (i) => `CHARACTER #${i}`,
  '41+ char cue': (i) => `A VERY LONG CHARACTER NAME OVER FORTY CHARACTERS ${i}`,
  // Round-2 (independent review) bypass family: the dual-dialogue caret.
  'caret (tight)': (i) => `PERSON${i}^`,
  'caret (spaced)': (i) => `PERSON${i} ^`,
  'caret + (V.O.) tail': (i) => `PERSON${i} ^ (V.O.)`,
};

function buildFountain(cueOf: (i: number) => string): string {
  let text = 'INT. ROOM - DAY\n\n';
  for (let i = 0; i < CUE_COUNT; i++) text += `${cueOf(i)}\nLine.\n\n`;
  return text;
}

function escapeXmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildFdx(cueOf: (i: number) => string): string {
  let body = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n'
    + '<FinalDraft DocumentType="Script" Template="No" Version="1">\n<Content>\n'
    + '<Paragraph Type="Scene Heading"><Text>INT. ROOM - DAY</Text></Paragraph>\n';
  for (let i = 0; i < CUE_COUNT; i++) {
    body += `<Paragraph Type="Character"><Text>${escapeXmlText(cueOf(i))}</Text></Paragraph>\n`;
    body += '<Paragraph Type="Dialogue"><Text>Line.</Text></Paragraph>\n';
  }
  body += '</Content>\n</FinalDraft>';
  return body;
}

const REJECTION_RE = /more than 1500 distinct all-caps character-cue-shaped lines/;
const FAST_REJECTION_MS = 1000; // see scriptide-doctor.test.ts's own comment
// on why 1000ms rather than the originally-measured ~100ms: full-suite
// `npm test` runs every file's server in one shared process.

describe('cue-definition bypass families — POST /api/scriptide/doctor', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  for (const [family, cueOf] of Object.entries(CUE_LINE_BUILDERS)) {
    it(`raw fountain — ${family} — rejected fast, not analyzed`, async () => {
      const start = Date.now();
      const res = await post({ fountain: buildFountain(cueOf) });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, REJECTION_RE);
      assert.ok(ms < FAST_REJECTION_MS, `${family}: expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });

    it(`.fdx-converted — ${family} — rejected fast, not analyzed`, async () => {
      const start = Date.now();
      const res = await post({ fdx: buildFdx(cueOf) });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, REJECTION_RE);
      assert.ok(ms < FAST_REJECTION_MS, `${family} (fdx): expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });
  }
});

describe('cue-definition bypass families — POST /api/export/verify', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/export/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Same rationale as export-verify.test.ts's own pathological-fdx test: the
  // shape guard must fire before the contentHash comparison, so any
  // well-formed-but-wrong hash proves the point without needing the real one.
  const expected = { contentHash: 'a'.repeat(64) };

  for (const [family, cueOf] of Object.entries(CUE_LINE_BUILDERS)) {
    it(`raw fountain — ${family} — rejected fast, not analyzed`, async () => {
      const start = Date.now();
      const res = await post({ fountain: buildFountain(cueOf), expected });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, REJECTION_RE);
      assert.ok(ms < FAST_REJECTION_MS, `${family}: expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });

    it(`.fdx-converted — ${family} — rejected fast, not analyzed`, async () => {
      const start = Date.now();
      const res = await post({ fdx: buildFdx(cueOf), expected });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, REJECTION_RE);
      assert.ok(ms < FAST_REJECTION_MS, `${family} (fdx): expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });
  }
});

// ── Round-4 bypass: low-distinct/high-occurrence, weight-bound-blind
// (2026-09-05 second independent review) ───────────────────────────────────
// The round-3 fix (MAX_FOUNTAIN_CUE_WEIGHT, distinct x occurrences) does not
// bound analyzer cost: walking the weight~9.9M iso-curve, the review found
// the guard REJECTING a 31s payload (1,500 distinct x 30,000 occurrences)
// while ACCEPTING two payloads that cost 150-216s — distinct=200/
// occurrences=49,500 and distinct=400/occurrences=24,750, both weight~9.9M,
// both under the 10,000,000 weight bound. Fixed with
// MAX_FOUNTAIN_FREQUENT_CUE_LINES (server/lib/validation.ts) — a bound on
// the COUNT of distinct cue lines that individually repeat often, which
// both of these payloads blow (200 and 400 "frequent" lines respectively,
// each repeating far more than the 15-occurrence threshold). These are the
// review's own two attack points, reproduced here as an HTTP-level
// regression test.
describe('round-4 bypass (weight-bound-blind, low-distinct/high-occurrence) — POST /api/scriptide/doctor', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const FREQUENT_REJECTION_RE = /MAX_FOUNTAIN_FREQUENT_CUE_LINES/;

  const ISO_WEIGHT_POINTS: Record<string, { distinct: number; occurrences: number }> = {
    'distinct=200/occurrences=49,500 (review-measured 157s unguarded)': { distinct: 200, occurrences: 49_500 },
    'distinct=400/occurrences=24,750 (review-measured 216s unguarded)': { distinct: 400, occurrences: 24_750 },
  };

  for (const [label, { distinct, occurrences }] of Object.entries(ISO_WEIGHT_POINTS)) {
    it(`${label} is rejected fast via the frequent-cue-line bound, not the weight bound`, async () => {
      // Short names/dialogue (not "CHARACTER<i>"/"Line.") — at 49,500
      // occurrences the longer spelling used elsewhere in this file would
      // exceed MAX_FOUNTAIN_CHARS (900,000) before ever reaching the guard's
      // OWN bounds, which would test the wrong thing (the unconditional
      // z.string().max() cap, not this guard).
      const names = Array.from({ length: distinct }, (_, i) => `C${i}`);
      let fountain = 'INT. ROOM - DAY\n\n';
      for (let i = 0; i < occurrences; i++) fountain += `${names[i % distinct]}\nL.\n`;
      assert.ok(fountain.length < 900_000, `test payload (${fountain.length} chars) must itself stay under MAX_FOUNTAIN_CHARS to prove this guard's own bound is what rejects it`);
      // Sanity: this payload's weight sits at ~9.9M, comfortably under the
      // 10,000,000 weight bound — if this assertion ever fails, the test is
      // no longer proving what it claims to (that the OTHER bound is doing
      // the work here).
      assert.ok(distinct * occurrences < 10_000_000, `test payload's weight (${distinct * occurrences}) must stay under the weight bound to prove this is the frequent-line bound catching it`);

      const start = Date.now();
      const res = await post({ fountain });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, FREQUENT_REJECTION_RE);
      assert.ok(ms < FAST_REJECTION_MS, `expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });
  }
});

// ── POST /api/scriptide/fix's candidateFountain — same guard, second field
// (main-branch merge, 2026-09-05) ───────────────────────────────────────────
// FixBodySchema's `candidateFountain` (added on main the same day, merged in
// by this lane's rebase) reuses fountainField() — the exact same
// zod-wrapped call to fountainShapeRejectionReason every other field on this
// page proves against — so every bound above already applies to it with no
// route-specific wiring. Two representative cases (not the full family
// sweep — POST /api/scriptide/fix sits behind aiLimiter, 20 requests/min,
// far tighter than gameLimiter): the round-2 caret bypass and the round-4
// low-distinct/high-occurrence bypass, both submitted as `candidateFountain`
// alongside a small, valid `fountain`.
describe('cue-definition bypass families — POST /api/scriptide/fix (candidateFountain)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const VALID_FOUNTAIN = 'INT. ROOM - DAY\n\nA quiet room.\n\nALEX\nHello there.\n';

  it('caret bypass — candidateFountain is rejected fast, not analyzed', async () => {
    const candidateFountain = buildFountain(CUE_LINE_BUILDERS['caret (tight)']!);
    const start = Date.now();
    const res = await post({ fountain: VALID_FOUNTAIN, candidateFountain });
    const ms = Date.now() - start;
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, REJECTION_RE);
    assert.ok(ms < FAST_REJECTION_MS, `expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
  });

  it('round-4 low-distinct/high-occurrence bypass — candidateFountain is rejected fast via the frequent-cue-line bound', async () => {
    const distinct = 400;
    const occurrences = 24_750;
    const names = Array.from({ length: distinct }, (_, i) => `C${i}`);
    let candidateFountain = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < occurrences; i++) candidateFountain += `${names[i % distinct]}\nL.\n`;
    assert.ok(candidateFountain.length < 900_000, `test payload (${candidateFountain.length} chars) must itself stay under MAX_FOUNTAIN_CHARS`);

    const start = Date.now();
    const res = await post({ fountain: VALID_FOUNTAIN, candidateFountain });
    const ms = Date.now() - start;
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /MAX_FOUNTAIN_FREQUENT_CUE_LINES/);
    assert.ok(ms < FAST_REJECTION_MS, `expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
  });
});

// ── ROUND 5 bypass: double-spaced Fountain (second independent review,
// 2026-09-05, of the round-4 context check) ─────────────────────────────────
// `NAME\n\nline\n\n` — a blank line between every block — is the shape real
// PDF/FDX imports actually produce (server/nvm/analyze/
// screenplay-normalizer.ts's normalizeScreenplay() exists specifically to
// reflow it before the analyzer ever parses the script). The round-4 context
// check only looked at the IMMEDIATE next line, so a double-spaced cue's
// blank next line made it count as zero cues — measured: a 154,954-byte
// double-spaced payload (distinct=600, occurrences=12,000) answered HTTP 200
// in 90,575 ms. Fixed in validation.ts by also admitting "a blank-line run,
// then non-cue-shaped content" as a valid dialogue-following shape.
//
// ROUND 6 (third independent review, same day): the round-5 fix probed only
// a FIXED one-blank-line gap; isDoubleSpaced fires on ANY gap >= 1 and
// normalizeScreenplay's reflow filters out every blank line regardless of
// count, so a 2-, 3-, 4-, or 5-blank-line gap was STILL invisible to the
// fixed-offset probe — measured: a 2-blank-line-gap payload (203 KB)
// answered HTTP 200 in 85,388 ms. `gap` below defaults to 1 (the original
// shape) but every describe block sweeps gap in 1..5.
function buildDoubleSpacedFountain(distinct: number, occurrences: number, gap = 1): string {
  const cues = Array.from({ length: distinct }, (_, i) => `CHARACTER${i}`);
  const blanks = '\n'.repeat(gap);
  let text = 'INT. ROOM - DAY\n\n';
  for (let i = 0; i < occurrences; i++) text += `${cues[i % distinct]}${blanks}Line.\n\n`;
  return text;
}

// The .fdx variant: fdxToFountain (server/lib/fdx-import.ts) always writes a
// SINGLE blank line as a plain block separator between an ordinary Character
// and Dialogue paragraph pair — a normal FDX export structurally cannot
// reproduce double-spacing that way. What CAN: FDX's <Text> extraction only
// trims LEADING/TRAILING whitespace (`.trim()`), not internal, so a
// Character paragraph whose <Text> itself CONTAINS an embedded blank-line
// run (`NAME\n\nfakeDialogue`, or more `\n`s for a wider gap) round-trips as
// literal double-spaced text in the converted Fountain — a real hazard for
// any FDX producer/exporter that doesn't split paragraphs as cleanly as this
// repo's own src/lib/fdx.ts does. `fakeDialogue` ends in `!` (not in either
// cue class's continuation alphabet) specifically because fdxToFountain
// uppercases the WHOLE Character paragraph text, embedded dialogue
// included — without the `!`, the uppercased "fake dialogue" would itself
// look cue-shaped and the guard would (correctly, conservatively) still
// exclude it. `gap` blank lines needs `gap + 1` literal newlines between the
// name and the fake dialogue.
function buildDoubleSpacedFdx(distinct: number, repeats: number, gap = 1): string {
  let body = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n'
    + '<FinalDraft DocumentType="Script" Template="No" Version="1">\n<Content>\n'
    + '<Paragraph Type="Scene Heading"><Text>INT. ROOM - DAY</Text></Paragraph>\n';
  const blanks = '\n'.repeat(gap + 1);
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < distinct; i++) {
      const embedded = `CHARACTER${i}${blanks}Line!`;
      body += `<Paragraph Type="Character"><Text>${embedded}</Text></Paragraph>\n`;
    }
  }
  body += '</Content>\n</FinalDraft>';
  return body;
}

describe('double-spaced bypass (ROUND 5) — POST /api/scriptide/doctor', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // ROUND 6 property sweep: gap in 1..5 must all reject (raw fountain).
  for (let gap = 1; gap <= 5; gap++) {
    it(`raw double-spaced fountain, gap=${gap} (distinct=600, occurrences=12,000) is rejected fast, not analyzed`, async () => {
      const fountain = buildDoubleSpacedFountain(600, 12_000, gap);
      assert.ok(fountain.length < 900_000, `test payload (${fountain.length} chars) must stay under MAX_FOUNTAIN_CHARS`);
      const start = Date.now();
      const res = await post({ fountain });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, /MAX_FOUNTAIN_FREQUENT_CUE_LINES/);
      assert.ok(ms < FAST_REJECTION_MS, `gap=${gap}: expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });
  }

  // Round-6 finding's own reproduction point (gap=2), plus the original
  // round-5 shape (gap=1), via the .fdx-conversion path.
  for (const gap of [1, 2]) {
    it(`.fdx-converted double-spaced text, gap=${gap} (distinct=600 x 20 repeats) is rejected fast, not analyzed`, async () => {
      const fdx = buildDoubleSpacedFdx(600, 20, gap);
      const start = Date.now();
      const res = await post({ fdx });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, /MAX_FOUNTAIN_FREQUENT_CUE_LINES/);
      assert.ok(ms < FAST_REJECTION_MS, `gap=${gap}: expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });
  }

  for (const gap of [1, 2, 3]) {
    it(`a legitimate small double-spaced cast (2 distinct cues), gap=${gap}, is NOT rejected`, async () => {
      const fountain = buildDoubleSpacedFountain(2, 30, gap);
      const res = await post({ fountain });
      assert.equal(res.status, 200);
    });
  }
});

describe('double-spaced bypass (ROUND 5) — POST /api/export/verify', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/export/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const expected = { contentHash: 'a'.repeat(64) };

  // ROUND 6 property sweep: gap in 1..5 must all reject (raw fountain).
  for (let gap = 1; gap <= 5; gap++) {
    it(`raw double-spaced fountain, gap=${gap}, is rejected fast, not analyzed`, async () => {
      const fountain = buildDoubleSpacedFountain(600, 12_000, gap);
      const start = Date.now();
      const res = await post({ fountain, expected });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, /MAX_FOUNTAIN_FREQUENT_CUE_LINES/);
      assert.ok(ms < FAST_REJECTION_MS, `gap=${gap}: expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });
  }

  for (const gap of [1, 2]) {
    it(`.fdx-converted double-spaced text, gap=${gap}, is rejected fast, not analyzed`, async () => {
      const fdx = buildDoubleSpacedFdx(600, 20, gap);
      const start = Date.now();
      const res = await post({ fdx, expected });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, /MAX_FOUNTAIN_FREQUENT_CUE_LINES/);
      assert.ok(ms < FAST_REJECTION_MS, `gap=${gap}: expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });
  }
});

// ── ROUND 7 bypass (finding A1, BLOCKER, 2026-09-05): the caps-heavy-
// "dialogue" shape — a blank-gapped cue followed by a long ALL-CAPS line —
// was a COMPLETE bypass of every bound this file's other describe blocks
// prove. See tests/security/fountain-shape-guard-cue-parity.test.ts's own
// "ROUND 7" describe block for the pure-function proof (including the
// pipeline-parity sanity check); this is the HTTP-level regression.
function buildCapsDialogueBypass(distinct: number, occurrences: number): string {
  const parts: string[] = ['INT. ROOM - DAY', ''];
  for (let k = 0; k < occurrences; k++) {
    parts.push(`PERSON${k % distinct}`, '', 'THIS IS AN ALL CAPITALS SPEECH LINE OF SUBSTANTIAL LENGTH INDEED', '');
  }
  return parts.join('\n');
}

describe('ROUND 7 bypass (caps-heavy-"dialogue", finding A1) — POST /api/scriptide/doctor', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('the A1 payload (distinct=200, occurrences=6,000, 458,716 chars) is rejected fast, not analyzed', async () => {
    const fountain = buildCapsDialogueBypass(200, 6000);
    assert.equal(fountain.length, 458_716, 'payload size must match the measured A1 shape exactly');
    const start = Date.now();
    const res = await post({ fountain });
    const ms = Date.now() - start;
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /MAX_FOUNTAIN_FREQUENT_CUE_LINES/);
    assert.ok(ms < FAST_REJECTION_MS, `expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
  });
});
