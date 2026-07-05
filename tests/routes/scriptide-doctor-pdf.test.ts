// Script Doctor — PDF submission path (POST /api/scriptide/doctor/pdf).
// Conventions: node:test + assert/strict, matching tests/routes/scriptide-doctor.test.ts,
// whose { fdx } coverage this file mirrors for the { pdf } format.
//
// The fixture PDF is built programmatically (same technique as
// tests/core/pdf-import.test.ts: an uncompressed BT/Tf/Tm/Tj content stream
// with a correct xref table is fully legal PDF) rather than checked in as a
// binary file, so the fixture's exact expected content stays visible and
// easy to keep in sync with the assertions below.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';

// ── PDF fixture builder (see tests/core/pdf-import.test.ts for the fuller,
// documented version this is trimmed from) ──────────────────────────────────
interface Run { x: number; text: string }
interface Line { y: number; runs: Run[] }
type Page = Line[];

function escapePdfString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function assemblePdf(objects: string[], totalObjs: number): Buffer {
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = new Array<number>(totalObjs + 1).fill(0);
  for (let i = 1; i <= totalObjs; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'binary');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${totalObjs + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= totalObjs; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

function buildScreenplayPdf(pages: Page[]): Buffer {
  const objects: string[] = [];
  const pageObjNums: number[] = [];
  const contentObjNums: number[] = [];
  let nextObj = 4;
  for (let p = 0; p < pages.length; p++) {
    pageObjNums.push(nextObj++);
    contentObjNums.push(nextObj++);
  }

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';

  for (let p = 0; p < pages.length; p++) {
    const pageObjNum = pageObjNums[p]!;
    const contentObjNum = contentObjNums[p]!;
    objects[pageObjNum] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] '
      + `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjNum} 0 R >>`;

    const ops = ['BT', '/F1 12 Tf'];
    for (const line of pages[p]!) {
      for (const run of line.runs) {
        ops.push(`1 0 0 1 ${run.x} ${line.y} Tm`);
        ops.push(`(${escapePdfString(run.text)}) Tj`);
      }
    }
    ops.push('ET');
    const content = ops.join('\n');
    objects[contentObjNum] = `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
  }

  return assemblePdf(objects, nextObj - 1);
}

// US Letter screenplay column x-positions, matching server/lib/pdf-import.ts's FIXED_BANDS.
const X_ACTION = 108;
const X_DIALOGUE = 180;
const X_CHARACTER = 266;

// A 2-scene, 2-character fixture — enough for a non-degenerate ScriptDoctorReport
// (matching MULTI_SCENE_FOUNTAIN's role in tests/routes/scriptide-doctor.test.ts,
// just built as a PDF instead of Fountain/FDX text).
const FIXTURE_SLUGLINE = 'INT. WAREHOUSE - NIGHT';
const FIXTURE_PDF = buildScreenplayPdf([[
  { y: 700, runs: [{ x: X_ACTION, text: FIXTURE_SLUGLINE }] },
  { y: 680, runs: [{ x: X_ACTION, text: 'Rain hammers the tin roof. Jax crouches behind a stack of crates.' }] },
  { y: 650, runs: [{ x: X_CHARACTER, text: 'JAX' }] },
  { y: 636, runs: [{ x: X_DIALOGUE, text: 'She said midnight. Its already past that.' }] },
  { y: 610, runs: [{ x: X_CHARACTER, text: 'MARA' }] },
  { y: 596, runs: [{ x: X_DIALOGUE, text: 'We wait. If they are not here by dawn, we run.' }] },
  { y: 570, runs: [{ x: X_ACTION, text: 'EXT. HIGHWAY - DAWN' }] },
  { y: 550, runs: [{ x: X_ACTION, text: 'Jax and Mara run toward the car as the sun comes up.' }] },
  { y: 530, runs: [{ x: X_CHARACTER, text: 'JAX' }] },
  { y: 516, runs: [{ x: X_DIALOGUE, text: 'I should have told you everything.' }] },
]]);

describe('routes/scriptide/doctor/pdf — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const postPdf = (body: Buffer | string) => fetch(`${server.baseUrl}/api/scriptide/doctor/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body,
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

  it('a GET request to the PDF doctor route is not allowed (POST-only)', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/doctor/pdf`);
    assert.equal(res.status, 404);
  });
});
