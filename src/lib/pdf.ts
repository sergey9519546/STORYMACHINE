// Wave 91 — Fountain → PDF export (P2 export pipeline)
//
// Hand-rolled minimal PDF writer, mirroring the dependency-free philosophy of
// fdx.ts. A screenplay PDF is uniquely simple to emit: a single base-14 font
// (Courier — no embedding required), monospaced, with a fixed industry layout
// supplied by screenplay-layout.ts. We only need the text-showing operators
// (BT / Tf / Td / Tj / ET) plus a correct xref table and trailer.

import { layoutScreenplay, PAGE_WIDTH, PAGE_HEIGHT, type LayoutPage, type LayoutLine } from './screenplay-layout.ts';
import { resolveExportTitlePage, type TitlePageInput, type ExportTitlePage } from './export-title-page.ts';

const PT_PER_INCH = 72;
const LINE_HEIGHT = 12;            // matches screenplay-layout.ts's single-spaced 12pt Courier
const CHAR_WIDTH = 7.2;            // Courier 12pt advance width (0.6em) — 10 cpi

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
    const x = 7.5 * PT_PER_INCH - label.length * CHAR_WIDTH;
    const y = PAGE_HEIGHT - 0.5 * PT_PER_INCH;
    ops.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
    ops.push(`(${pdfEscape(label)}) Tj`);
  }
  ops.push('ET');
  return ops.join('\n');
}

// ── Title page ────────────────────────────────────────────────────────────────
// Industry convention: title centered, roughly 1/3 down the page (not
// literally vertically centered — that reads as too low once "Written by" +
// author sit under it); a "Written by" credit line and the author's name
// centered directly beneath; a contact block bottom-left. It carries no page
// number of its own — the script proper's page 1 (right after it) starts the
// numbering, and stays unnumbered too (industry convention numbers from
// page 2 onward — see the "never page 1" test below).
function centerLine(text: string, yPt: number): LayoutLine {
  const xPt = Math.max(36, (PAGE_WIDTH - text.length * CHAR_WIDTH) / 2);
  return { text, xPt, yPt };
}

function buildTitlePageLines(info: ExportTitlePage): LayoutLine[] {
  const lines: LayoutLine[] = [];
  let y = PAGE_HEIGHT - 3.5 * PT_PER_INCH; // ~1/3 down from the top

  if (info.title) {
    lines.push(centerLine(info.title, y));
    y -= LINE_HEIGHT * 3;
  }
  if (info.author) {
    lines.push(centerLine('Written by', y));
    y -= LINE_HEIGHT * 1.5;
    lines.push(centerLine(info.author, y));
  }

  if (info.contact) {
    const contactLines = info.contact.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
    const xPt = 1 * PT_PER_INCH;
    let cy = 1 * PT_PER_INCH + (contactLines.length - 1) * LINE_HEIGHT; // stack upward from 1" above the bottom edge
    for (const line of contactLines) {
      lines.push({ text: line, xPt, yPt: cy });
      cy -= LINE_HEIGHT;
    }
  }

  return lines;
}

/**
 * Convert a Fountain script to a PDF document.
 * Returns the raw PDF bytes as a Uint8Array (wrap in a Blob to download).
 *
 * `titlePage` is either a plain title string or a {title, author, contact}
 * object; when omitted (or empty), the Fountain text's own leading title
 * block is used instead, and when NEITHER carries anything the PDF gets no
 * title page at all rather than a page of blank placeholders — see
 * resolveExportTitlePage. When present, it becomes page 1 and the script's
 * own first page — unnumbered, matching convention — follows it.
 */
export function fountainToPdf(fountain: string, titlePage?: TitlePageInput): Uint8Array {
  const scriptPages = layoutScreenplay(fountain);
  const info = resolveExportTitlePage(fountain, titlePage);
  // pageNumber 0 is a sentinel meaning "no page number" — distinct from the
  // script's own page 1 (also unnumbered, by convention, but a real page 1).
  const pages: LayoutPage[] = info
    ? [{ lines: buildTitlePageLines(info), pageNumber: 0 }, ...scriptPages]
    : scriptPages;

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

  pages.forEach((page) => {
    const showPageNum = page.pageNumber >= 2; // never the title page, never script page 1
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
