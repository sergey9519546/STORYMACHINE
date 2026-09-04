// Cue-definition bypass families (2026-09-04 adversarial audit) — HTTP-level
// regression coverage. server/lib/validation.ts's fountainShapeRejectionReason()
// distinct-cue-line guard used to test each line against a local ASCII-only,
// 40-char-capped proxy instead of being composed from the analyzer's own cue
// ALPHABET (src/lib/fountain.ts's CUE_INITIAL_CLASS/CUE_LETTER_CLASS, Unicode
// `\p{Lu}\p{Lt}`, no length cap). Families of line were therefore invisible
// to the guard and reached the analyzer's O(n²) tokenizer/character-
// extraction cost undiminished: non-ASCII capitals (Cyrillic, Greek, accented
// Latin), cues containing `#`, and cues over 40 characters. Measured against
// the unfixed guard: 2,000 distinct Cyrillic cues -> HTTP 200 in several
// seconds through POST /api/scriptide/doctor, both raw and via a converted
// .fdx.
//
// server/lib/validation.ts now composes its own line-shape proxy from the
// shared CUE_INITIAL_CLASS/CUE_LETTER_CLASS classes (see that composition's
// own comment) rather than maintaining a second, driftable alphabet — see
// tests/security/fountain-shape-guard-cue-parity.test.ts for the pure,
// non-HTTP proof that every family is now caught and every committed fixture
// still passes. This file is the end-to-end proof: each family, submitted
// both as raw fountain and as a converted .fdx, against both a route with no
// post-conversion guard call path issue (/api/scriptide/doctor) and the one
// route this class of bug was found on first (/api/export/verify's fdx
// branch), rejects fast rather than reaching the analyzer.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';

const CUE_COUNT = 2000; // matches the audit's measured payload size exactly

const CUE_LINE_BUILDERS: Record<string, (i: number) => string> = {
  'Cyrillic': (i) => `ПЕРСОНАЖ${i}`,
  'Greek': (i) => `ΧΑΡΑΚΤΗΡΑΣ${i}`,
  'accented Latin': (i) => `JOSÉ MARÍA ZOË${i}`,
  '# in the cue': (i) => `CHARACTER #${i}`,
  '41+ char cue': (i) => `A VERY LONG CHARACTER NAME OVER FORTY CHARACTERS ${i}`,
};

function buildFountain(cueOf: (i: number) => string): string {
  let text = 'INT. ROOM - DAY\n\n';
  for (let i = 0; i < CUE_COUNT; i++) text += `${cueOf(i)}\nLine.\n\n`;
  return text;
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
    const fountain = buildFountain(cueOf);

    it(`raw fountain — ${family} — rejected fast, not analyzed`, async () => {
      const start = Date.now();
      const res = await post({ fountain });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, REJECTION_RE);
      assert.ok(ms < FAST_REJECTION_MS, `${family}: expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });

    it(`.fdx-converted — ${family} — rejected fast, not analyzed`, async () => {
      const fdx = fountainToFdx(fountain, { title: `Pathological ${family}` });
      const start = Date.now();
      const res = await post({ fdx });
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
    const fountain = buildFountain(cueOf);

    it(`raw fountain — ${family} — rejected fast, not analyzed`, async () => {
      const start = Date.now();
      const res = await post({ fountain, expected });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, REJECTION_RE);
      assert.ok(ms < FAST_REJECTION_MS, `${family}: expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });

    it(`.fdx-converted — ${family} — rejected fast, not analyzed`, async () => {
      const fdx = fountainToFdx(fountain, { title: `Pathological ${family}` });
      const start = Date.now();
      const res = await post({ fdx, expected });
      const ms = Date.now() - start;
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, REJECTION_RE);
      assert.ok(ms < FAST_REJECTION_MS, `${family} (fdx): expected a fast rejection (<${FAST_REJECTION_MS}ms), took ${ms}ms`);
    });
  }
});
