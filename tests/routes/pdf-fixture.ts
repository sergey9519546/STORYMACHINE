// Shared screenplay-PDF fixture builder for the /api/scriptide/doctor/pdf
// route tests.
//
// The fixtures are built programmatically (same technique as
// tests/core/pdf-import.test.ts: an uncompressed BT/Tf/Tm/Tj content stream
// with a correct xref table is fully legal PDF) rather than checked in as
// binaries, so the exact expected content stays visible and easy to keep in
// sync with the assertions that read it.
//
// Extracted from scriptide-doctor-pdf.test.ts when the off-thread coverage
// (2026-08-24) needed the same builder from a second file. Two files rather
// than one because the route sits behind heavyBodyLimiter's 10 uploads/min
// and that limiter is a module-level singleton shared by every test server in
// a process — a single file with both suites' uploads in it trips its own
// rate limit and starts asserting against 429s.

export interface Run { x: number; text: string }
export interface Line { y: number; runs: Run[] }
export type Page = Line[];

// US Letter screenplay column x-positions, matching server/lib/pdf-import.ts's FIXED_BANDS.
export const X_ACTION = 108;
export const X_DIALOGUE = 180;
export const X_CHARACTER = 266;

function escapePdfString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function assemblePdf(objects: string[], totalObjs: number): Buffer {
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

export function buildScreenplayPdf(pages: Page[], height = 792): Buffer {
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
    objects[pageObjNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${height}] `
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

// A 2-scene, 2-character fixture — enough for a non-degenerate
// ScriptDoctorReport (matching MULTI_SCENE_FOUNTAIN's role in
// tests/routes/scriptide-doctor.test.ts, just built as a PDF instead of
// Fountain/FDX text).
export const FIXTURE_SLUGLINE = 'INT. WAREHOUSE - NIGHT';
export const FIXTURE_PDF = buildScreenplayPdf([[
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

/** A PDF with `sceneCount` scenes, laid out several lines to a page — big
 *  enough that an analysis of it is not over before a test can look at it,
 *  small enough not to slow the suite down. */
export function buildLongScreenplayPdf(sceneCount: number): Buffer {
  const pages: Page[] = [];
  let lines: Line[] = [];
  let y = 760;
  const push = (x: number, text: string) => {
    lines.push({ y, runs: [{ x, text }] });
    y -= 12;
    if (y < 40) { pages.push(lines); lines = []; y = 760; }
  };
  for (let i = 0; i < sceneCount; i++) {
    push(X_ACTION, `INT. LOCATION ${i} - ${i % 2 === 0 ? 'DAY' : 'NIGHT'}`);
    push(X_ACTION, 'A room that has seen better days. Dust settles on the sill.');
    push(X_CHARACTER, i % 3 === 0 ? 'MARA' : 'DEL');
    push(X_DIALOGUE, `Someone has to say it. Nobody wants to be the one in room ${i}.`);
    push(X_ACTION, 'She turns away, hands shaking, and does not answer him.');
  }
  if (lines.length > 0) pages.push(lines);
  return buildScreenplayPdf(pages);
}
