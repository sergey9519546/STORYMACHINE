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
