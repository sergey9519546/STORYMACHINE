// Script Doctor — PDF submission path (POST /api/scriptide/doctor/pdf).
// Conventions: node:test + assert/strict, matching tests/routes/scriptide-doctor.test.ts,
// whose { fdx } coverage this file mirrors for the { pdf } format.
//
// The fixture PDFs are built programmatically rather than checked in as
// binaries — see ./pdf-fixture.ts, which now owns the builder so the
// off-thread suite (scriptide-doctor-pdf-offthread.test.ts) can share it.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import {
  assemblePdf,
  buildScreenplayPdf,
  FIXTURE_PDF,
  FIXTURE_SLUGLINE,
  X_ACTION,
  type Line,
  type Page,
} from './pdf-fixture.ts';


describe('routes/scriptide/doctor/pdf — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  // `Uint8Array` is used (rather than passing `Buffer` directly) so the body
  // satisfies the DOM `BodyInit` typing the test-only fetch call expects —
  // Node's `Buffer<ArrayBufferLike>` is not assignable to `BodyInit` under the
  // active lib.dom typings. At runtime a `Uint8Array` and a `Buffer` over the
  // same bytes are interchangeable to fetch, so this changes no behavior.
  const postPdf = (body: Buffer | string) =>
    fetch(`${server.baseUrl}/api/scriptide/doctor/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: typeof body === 'string' ? body : new Uint8Array(body),
    });

  it('POST a valid screenplay PDF returns 200 with a well-formed report, 14 passes, and source.format "pdf"', async () => {
    const res = await postPdf(FIXTURE_PDF);
    assert.equal(res.status, 200);
    const body = await res.json();

    // Same 14-pass contract as the fountain/fdx submission paths — the
    // doctor never knows or cares which format the script arrived in.
    assert.equal(body.passes.length, 14);
    assert.equal(body.sceneCount, 2);

    assert.equal(body.source.format, 'pdf');
    assert.equal(typeof body.source.convertedFountain, 'string');
    assert.ok(body.source.convertedFountain.length > 0);
    assert.match(body.source.convertedFountain, new RegExp(FIXTURE_SLUGLINE.replace('.', '\\.')));

    // health is clamped to [0, 100], same invariant as the other two formats.
    assert.ok(body.health >= 0 && body.health <= 100, `health ${body.health} out of [0,100]`);
  });

  it('is deterministic through HTTP: the same PDF bytes POSTed twice yield deep-equal reports', async () => {
    const [res1, res2] = await Promise.all([postPdf(FIXTURE_PDF), postPdf(FIXTURE_PDF)]);
    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    const body1 = await res1.json();
    const body2 = await res2.json();
    delete body1.analyzedAt;
    delete body2.analyzedAt;
    assert.deepEqual(body1, body2);
  });

  it('POST an empty body returns 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/doctor/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(typeof body.error === 'string' && body.error.length > 0);
  });

  it('POST non-PDF bytes returns 400 with a clear message', async () => {
    const res = await postPdf(Buffer.from('This is not a PDF file at all, just plain text.', 'utf8'));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /PDF/);
  });

  it('POST a PDF with no text layer returns 400 with the scan message', async () => {
    // A single page whose content stream never shows any text.
    const blankObjects: string[] = [];
    blankObjects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    blankObjects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    blankObjects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>';
    blankObjects[4] = '<< /Length 0 >>\nstream\n\nendstream';
    const blankPdf = assemblePdf(blankObjects, 4);

    const res = await postPdf(blankPdf);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /no text layer/);
  });

  it('POST a 301-page PDF returns the exact safe page-cap 400', async () => {
    const pages = Array.from({ length: 301 }, (_, index): Page => index === 0
      ? [{ y: 700, runs: [{ x: X_ACTION, text: 'INT. ARCHIVE - DAY' }] }]
      : []);
    const res = await postPdf(buildScreenplayPdf(pages));
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), {
      error: 'This PDF exceeds the 300-page limit. Split it into smaller files and try again.',
    });
  });

  it('POST a PDF with 900,001 extractable characters returns the exact safe text-cap 400', async () => {
    const lines = Array.from(
      { length: 100_001 },
      (_, index): Line => ({
        y: 350_000 - index * 3,
        runs: [{ x: X_ACTION, text: index === 100_000 ? 'A' : 'A'.repeat(9) }],
      }),
    );
    const oversizedPdf = buildScreenplayPdf([lines], 400_000);
    const res = await postPdf(oversizedPdf);
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), {
      error: 'This PDF contains more than 900,000 extractable text characters. Split it into smaller files and try again.',
    });
  });

  it('a GET request to the PDF doctor route is not allowed (POST-only)', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/doctor/pdf`);
    assert.equal(res.status, 404);
  });
});
