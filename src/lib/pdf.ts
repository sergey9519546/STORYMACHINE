// Wave 91 — Fountain → PDF export (P2 export pipeline)
//
// Hand-rolled minimal PDF writer, mirroring the dependency-free philosophy of
// fdx.ts. A screenplay PDF is uniquely simple to emit: a single base-14 font
// (Courier — no embedding required), monospaced, with a fixed industry layout
// supplied by screenplay-layout.ts. We only need the text-showing operators
// (BT / Tf / Td / Tj / ET) plus a correct xref table and trailer.

import { layoutScreenplay, PAGE_WIDTH, PAGE_HEIGHT, type LayoutPage } from './screenplay-layout.ts';

// Escape a string for a PDF literal string object: \ ( ) must be escaped, and
// characters outside printable ASCII are normalised so StandardEncoding renders
// them predictably (smart quotes / dashes → ASCII; anything else → '?').
function pdfEscape(s: string): string {
  const normalised = s
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E]/g, '?');
  return normalised
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

// Build the content stream for one page from its positioned lines.
function pageContentStream(page: LayoutPage, withPageNumber: boolean): string {
  const ops: string[] = ['BT', '/F1 12 Tf'];
  for (const line of page.lines) {
    if (line.text === '') continue;
    // Td sets the text position in absolute page coordinates via Tm reset each line.
    ops.push(`1 0 0 1 ${line.xPt.toFixed(2)} ${line.yPt.toFixed(2)} Tm`);
    ops.push(`(${pdfEscape(line.text)}) Tj`);
  }
  // Page number top-right (from page 2 onward), at 7.5" / 0.5" from top.
  if (withPageNumber) {
    const label = `${page.pageNumber}.`;
    const x = 7.5 * 72 - label.length * 7.2;
    const y = PAGE_HEIGHT - 0.5 * 72;
    ops.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
    ops.push(`(${pdfEscape(label)}) Tj`);
  }
  ops.push('ET');
  return ops.join('\n');
}

/**
 * Convert a Fountain script to a PDF document.
 * Returns the raw PDF bytes as a Uint8Array (wrap in a Blob to download).
 */
export function fountainToPdf(fountain: string): Uint8Array {
  const pages = layoutScreenplay(fountain);

  // ── Object plan ──────────────────────────────────────────────────────────
  // 1: Catalog
  // 2: Pages tree
  // 3: Font (Courier)
  // then per page: [Page object, Contents stream]
  const objects: string[] = [];
  const pageObjNums: number[] = [];

  // Reserve nums 1..3; page/content objects start at 4.
  let nextNum = 4;
  const contentObjs: { num: number; body: string }[] = [];
  const pageObjs: { num: number; body: string }[] = [];

  pages.forEach((page, idx) => {
    const showPageNum = idx > 0; // no number on the first page
    const stream = pageContentStream(page, showPageNum);
    const contentNum = nextNum++;
    const pageNum = nextNum++;
    pageObjNums.push(pageNum);

    contentObjs.push({
      num: contentNum,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    });
    pageObjs.push({
      num: pageNum,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`,
    });
  });

  // ── Assemble objects in numeric order ──────────────────────────────────────
  const ordered: { num: number; body: string }[] = [
    { num: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    {
      num: 2,
      body: `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageObjNums.length} >>`,
    },
    { num: 3, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>' },
    ...contentObjs,
    ...pageObjs,
  ].sort((a, b) => a.num - b.num);

  // ── Serialise with byte-offset tracking for the xref table ──────────────────
  let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
  const offsets: number[] = [];
  for (const obj of ordered) {
    offsets[obj.num] = pdf.length;
    pdf += `${obj.num} 0 obj\n${obj.body}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  const objCount = ordered.length + 1; // +1 for the free object 0
  let xref = `xref\n0 ${objCount}\n0000000000 65535 f \n`;
  for (let n = 1; n < objCount; n++) {
    const off = offsets[n] ?? 0;
    xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += xref;
  pdf += `trailer\n<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  // Convert the binary-safe latin1 string to bytes.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}
