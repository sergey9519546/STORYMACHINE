// PDF screenplay import — converts a screenplay PDF (Final Draft, WriterDuet,
// Arc Studio, or any app exporting the industry-standard US Letter screenplay
// layout) into Fountain text, mirroring server/lib/fdx-import.ts's module
// shape (pdfToFountain returns { fountain, warnings }, throws a plain Error
// with a human message on unrecoverable input) so the Script Doctor route
// (server/routes/scriptide.ts) can treat both formats identically.
//
// Why position-based classification instead of a markup walk: unlike FDX's
// <Paragraph Type="...">, a PDF carries no semantic tags at all — by the time
// a script is a PDF, all that survives is where each line of text sits on the
// page. Every screenplay-formatting convention (action/sluglines flush left
// at ~1.5in, dialogue indented ~2.5in, parentheticals ~3.1in, character cues
// ~3.7in, transitions right-aligned) is defined purely in terms of
// x-position, so x-position is the strongest signal available, backed up by
// the same content regexes fdx-import.ts and src/lib/fountain.ts already use
// for scene headings/transitions/parentheticals so all three import paths
// agree on what those look like.
//
// Why pdfjs-dist over hand-rolled PDF parsing: PDF text layout is a stream of
// positioned glyph-drawing operators inside (optionally compressed,
// cross-referenced, sometimes-encrypted) object streams — parsing that
// correctly is a solved, heavily-tested problem (font encodings, CID fonts,
// content-stream operators, xref tables/streams). Reinventing it would
// silently mis-extract real scripts and destroy user trust. pdfjs-dist is
// Mozilla's own PDF.js parser; the legacy Node build extracts text without a
// DOM/canvas. Server-only and dynamically imported inside pdfToFountain
// below (this file has no top-level pdfjs-dist import) so neither server
// startup nor the frontend bundle ever pays for it.

// ── Tunables ──────────────────────────────────────────────────────────────
// Vertical distance (pt) within which two glyph runs are considered the same
// visual line. Screenplay line spacing is single-spaced 12pt text with
// baseline-to-baseline gaps well over 10pt, so 2.5pt comfortably absorbs
// sub-pixel baseline jitter between glyphs on one line without ever merging
// two real lines together.
const Y_TOLERANCE = 2.5;

// When two glyph runs on the same line are further apart (in pt) than this
// fraction of the local font size, we infer a word-space between them that
// the content stream didn't spell out as a literal " " glyph. Below this,
// runs are assumed to be adjacent letter-pairs/kerning within one word.
const SPACE_GAP_FACTOR = 0.25;

// x-starts within this distance (pt) are folded into the same layout column
// when clustering the document's own margins. 20pt safely separates the
// four screenplay columns (which are ~40-90pt apart in the standard format)
// while absorbing the few points of jitter different apps introduce.
const CLUSTER_MERGE_TOL = 20;

// Top/bottom page-margin band (pt) searched for page numbers and repeated
// headers/footers — roughly the outer 0.75in of a US Letter page, comfortably
// inside the printable margin every screenplay template reserves.
const MARGIN_BAND_PT = 54;

// US Letter fixed fallback bands (pt from the left edge), used when the
// document's own layout can't be clustered confidently (e.g. a short fixture,
// or every observed line landing at the same x). These are the exact margins
// called out in this module's brief.
const FIXED_BANDS: ColumnBand[] = [
  { role: 'action',        x: 108 }, // 1.5in
  { role: 'dialogue',      x: 180 }, // 2.5in
  { role: 'parenthetical', x: 223 }, // 3.1in
  { role: 'character',     x: 266 }, // 3.7in
];

// Ratio of a mid-cluster's position along [action.x, character.x] below
// which it's classified 'dialogue' rather than 'parenthetical' — matches the
// FIXED_BANDS ratios above ((180-108)/(266-108) ≈ 0.45 vs (223-108)/(266-108)
// ≈ 0.73), so a document with only one detected middle column still lands on
// the right side of the split.
const DIALOGUE_PARENTHETICAL_SPLIT = 0.6;

// A page whose unclassifiable-line ratio exceeds this is flagged — the
// extraction is still emitted (best effort), but the caller is warned the
// result may be unreliable for that page.
const UNCLASSIFIABLE_WARNING_RATIO = 0.2;

type ColumnRole = 'action' | 'dialogue' | 'parenthetical' | 'character';
interface ColumnBand { role: ColumnRole; x: number }

type Role = 'scene_heading' | 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition';

/** One glyph-run-merged visual line, still tagged with its source page and
 *  raw x-extent — the unit both furniture-stripping and classification work
 *  on. */
interface RawLine {
  page: number; // 0-indexed
  y: number;
  xStart: number;
  xEnd: number;
  text: string;
}

// ── Content regexes ──────────────────────────────────────────────────────────
// Scene heading: same INT/EXT/EST/I-E prefix test src/lib/fountain.ts and
// fdx-import.ts use, so a heading recognized here is recognized identically
// downstream by the Fountain analyzer.
const SCENE_HEADING_RE = /^(INT|EXT|EST|I\/E|INT\.\/EXT)[.\s]/i;

// A scene-heading-band line that reads like a heading (ends in a time-of-day
// tag, or uses the "LOCATION - WHEN" dash convention) but is missing the
// INT/EXT prefix — sloppy exports and treatments sometimes drop it. Forced
// with a leading "." (Fountain's force-heading marker) rather than silently
// misread as action.
const HEADING_TIME_TAG_RE = /\b(DAY|NIGHT|MORNING|EVENING|AFTERNOON|DAWN|DUSK|CONTINUOUS|LATER|MOMENTS LATER|SAME TIME)\s*$/i;
const HEADING_DASH_RE = / [-–—] /;

// Transitions: identical pattern set to fdx-import.ts's formatTransition
// auto-detect list (AUTO_DETECTED_TRANSITION_RE/GENERIC_TRANSITION_RE, byte-
// for-byte) so "CUT TO:"/"FADE OUT."/"SMASH TO:"/etc. are recognized the same
// way regardless of which importer produced the Fountain, and a script that
// round-trips PDF→Fountain→(re-parsed by src/lib/fountain.ts in the editor)
// never disagrees with itself about what's a transition.
const AUTO_DETECTED_TRANSITION_RE = /^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:)$/;
const GENERIC_TRANSITION_RE = /^[A-Z ]+ TO:$/;
// Beyond the shared set above: a couple of whole-line conventions that are
// unambiguous on their own (never legitimately dialogue or action text as a
// standalone line) but aren't part of the shared auto-detect list.
const OTHER_TRANSITION_RE = /^(THE END\.?|TIME CUT:|INTERCUT WITH:)$/;

const PARENTHETICAL_RE = /^\(.+\)$/;

// ── Page-furniture regexes ───────────────────────────────────────────────────
const PAGE_NUMBER_RE = /^\.?\s*(\d{1,4}|[ivxlcdm]{1,8})\s*\.?$/i;
const MORE_MARKER_RE = /^\(?\s*more\s*\)?\.?$/i;
const CONTINUED_MARKER_RE = /^continued\s*:?\.?$/i;
const CONTD_SUFFIX_RE = /\s*\(\s*cont'?d\s*\)\s*$/i;

// PDFs built without an explicit /Encoding on their font fall back to the
// font's built-in encoding (StandardEncoding for the base-14 fonts), which
// maps the apostrophe/quote codes to typographic curly glyphs (’ “ ”) rather
// than the plain ASCII Fountain expects — and plenty of word processors
// substitute "smart quotes" at authoring time regardless of PDF encoding.
// Normalizing both back to straight quotes keeps the converted Fountain
// consistent with what a writer typed, and keeps our own quote-based
// PARENTHETICAL_RE/regex checks working regardless of which glyphs a given
// producer emitted.
const TYPOGRAPHIC_NORMALIZE: Array<[RegExp, string]> = [
  [/[‘’‚‛]/g, '\''],
  [/[“”„‟]/g, '"'],
  [/ /g, ' '],
];
function normalizeTypography(text: string): string {
  let out = text;
  for (const [re, rep] of TYPOGRAPHIC_NORMALIZE) out = out.replace(re, rep);
  return out;
}

/**
 * Convert a screenplay PDF into Fountain text.
 *
 * Deterministic given identical bytes (no timestamps, no randomness, no
 * network I/O — pdfjs-dist is handed the buffer directly). Throws a plain
 * Error (message safe to surface to the caller) when the input isn't a PDF,
 * is encrypted, or has no extractable text anywhere (a scanned image with no
 * text layer).
 */
export async function pdfToFountain(pdfBytes: Uint8Array): Promise<{ fountain: string; warnings: string[] }> {
  if (!hasPdfHeader(pdfBytes)) {
    throw new Error('This does not look like a PDF file (no %PDF header found).');
  }

  // Dynamic import: pdfjs-dist is a large parser with its own worker/canvas
  // machinery — kept out of both the server's startup path and the frontend
  // bundle, loaded only when a PDF actually needs converting (see fdx-import's
  // sibling comment in scriptide.ts for the same lazy-load convention).
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // This module only ever reads text positions — never renders — so no
  // canvas/font-rendering options are needed; the legacy Node build already
  // disables its worker thread automatically (see pdfjs-dist's own isNodeJS
  // check) and runs entirely in-process against the buffer we hand it.
  // verbosity:ERRORS — pdfjs otherwise logs a WARNINGS-level notice for every
  // non-embedded standard font (common in hand-built/lightweight PDFs) asking
  // for standardFontDataUrl glyph-metrics data we don't need: text extraction
  // only reads the positions pdfjs already computed, not rendered glyphs.
  //
  // pdfBytes.slice() — pdfjs takes ownership of the `data` buffer it's given
  // (it's routed through the same transferable-object machinery used for its
  // real Worker mode even when the worker itself is disabled in Node),
  // detaching the caller's underlying ArrayBuffer as a side effect. Handing
  // it a private copy instead keeps the caller's original bytes valid and
  // reusable after this call returns — required for this function's own
  // documented determinism guarantee (calling it twice with the same
  // Uint8Array must work, not throw on the second call).
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(), verbosity: pdfjsLib.VerbosityLevel.ERRORS });
  let doc: PdfDocumentLike;
  try {
    // pdfjs's real PDFDocumentProxy is structurally compatible with our own
    // narrow PdfDocumentLike (see the "Minimal structural types" note at the
    // bottom of this file for why we declare our own instead of importing
    // pdfjs-dist's types here).
    doc = await loadingTask.promise;
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Remove the password and try again.');
    }
    if (name === 'InvalidPDFException') {
      throw new Error('This PDF is corrupted or not a valid PDF document.');
    }
    throw new Error(`Could not read this PDF: ${(err as Error).message ?? 'unknown error'}`);
  }

  const warnings: string[] = [];
  const pageCount = doc.numPages;

  // ── Phase 1: extract every page's visual lines, tagging which pages have
  // no text layer at all (the scanned-image case) ────────────────────────────
  const perPageLines: RawLine[][] = [];
  const perPageHeight: number[] = [];
  let pagesWithText = 0;

  for (let i = 0; i < pageCount; i++) {
    const page = await doc.getPage(i + 1);
    const [, viewY0, , viewY1] = page.view;
    perPageHeight.push(viewY1 - viewY0);
    const { lines, hasText } = await extractPageLines(page, i);
    perPageLines.push(lines);
    if (hasText) {
      pagesWithText++;
    } else {
      warnings.push(`Page ${i + 1}: no text layer found — this page may be a scanned image.`);
    }
  }

  if (pagesWithText === 0) {
    throw new Error('This PDF has no text layer (it may be a scan). Export the script from your writing app instead.');
  }

  // ── Phase 2: strip page furniture (page numbers, repeated headers/footers,
  // MORE/CONTINUED page-break artifacts) before it can pollute the x-position
  // histogram or leak into the script body ──────────────────────────────────
  const { contentLines, headerFooterTexts } = stripFurniture(perPageLines, perPageHeight, pageCount);
  if (headerFooterTexts.length > 0) {
    warnings.push(`Stripped ${headerFooterTexts.length} repeated header/footer line${headerFooterTexts.length === 1 ? '' : 's'} found on multiple pages.`);
  }

  // ── Phase 3: histogram the surviving lines' x-starts into layout columns,
  // adaptively — falling back to fixed US Letter screenplay margins when the
  // document doesn't yield enough distinct columns to trust. Transitions are
  // excluded from the histogram: they occupy their own right-aligned column
  // that isn't one of the four structural bands, so folding it in would drag
  // the computed 'character' band (normally the rightmost real column) out
  // to the transition's position and misclassify every dialogue/parenthetical
  // line relative to it.
  const bands = computeBands(contentLines.filter(l => !isTransitionText(l.text)).map(l => l.xStart));

  // ── Phase 4: classify every line and emit Fountain, tracking per-page
  // unclassifiable-line ratios for the warnings list and merging dialogue
  // that a page break split mid-speech ───────────────────────────────────────
  const { fountain, perPageUnclassifiable } = classifyAndEmit(contentLines, bands);

  for (const [pageIdx, ratio] of perPageUnclassifiable) {
    if (ratio > UNCLASSIFIABLE_WARNING_RATIO) {
      warnings.push(`Page ${pageIdx + 1}: ${Math.round(ratio * 100)}% of lines had ambiguous formatting position — extraction may be less accurate there.`);
    }
  }

  if (fountain.trim() === '') {
    throw new Error('This PDF has no text layer (it may be a scan). Export the script from your writing app instead.');
  }

  return { fountain, warnings: dedupe(warnings) };
}

// ── PDF header check ──────────────────────────────────────────────────────────
// The %PDF- header is allowed by spec to be preceded by a small amount of
// leading garbage (some producers prepend a few bytes) but must appear near
// the very start of the file — scan a generous-but-bounded window rather than
// requiring byte 0 exactly, matching how real PDF readers (including pdfjs
// itself) locate it.
const PDF_HEADER_SEARCH_WINDOW = 1024;
function hasPdfHeader(bytes: Uint8Array): boolean {
  const scanLen = Math.min(bytes.length, PDF_HEADER_SEARCH_WINDOW);
  const head = Buffer.from(bytes.buffer, bytes.byteOffset, scanLen).toString('latin1');
  return head.includes('%PDF-');
}

function dedupe(list: string[]): string[] {
  return [...new Set(list)];
}

// ── Phase 1 helper: per-page line extraction ─────────────────────────────────
// pdfjs's getTextContent() returns items in content-stream draw order, not
// reading order — sort top-to-bottom (PDF y increases upward, so descending y
// is reading order) then left-to-right, and merge runs whose y falls within
// Y_TOLERANCE of the line already being built.
async function extractPageLines(page: PdfPageLike, pageIndex: number): Promise<{ lines: RawLine[]; hasText: boolean }> {
  const content = await page.getTextContent();
  const items = content.items.filter((it): it is PdfTextItem => typeof (it as PdfTextItem).str === 'string' && (it as PdfTextItem).str.trim() !== '');

  if (items.length === 0) return { lines: [], hasText: false };

  const sorted = [...items].sort((a, b) => (b.transform[5] - a.transform[5]) || (a.transform[4] - b.transform[4]));

  const lines: RawLine[] = [];
  for (const item of sorted) {
    const x = item.transform[4];
    const y = item.transform[5];
    const current = lines[lines.length - 1];
    if (current && Math.abs(current.y - y) <= Y_TOLERANCE) {
      const gap = x - current.xEnd;
      const fontSize = Math.abs(item.transform[0]) || item.height || 12;
      const alreadySpaced = current.text.endsWith(' ') || item.str.startsWith(' ');
      current.text += (!alreadySpaced && gap > fontSize * SPACE_GAP_FACTOR ? ' ' : '') + normalizeTypography(item.str);
      current.xEnd = Math.max(current.xEnd, x + item.width);
    } else {
      lines.push({ page: pageIndex, y, xStart: x, xEnd: x + item.width, text: normalizeTypography(item.str) });
    }
  }
  return { lines, hasText: true };
}

// ── Phase 2: furniture stripping ─────────────────────────────────────────────
// Runs in two passes: first collect every top/bottom-margin-band line's
// normalized text across the whole document so a header/footer repeated on
// 2+ pages can be recognized as furniture rather than content (a single
// page's margin text might legitimately be a slugline that just happens to
// sit high on the page); then re-walk each page dropping page numbers,
// recognized repeated furniture, and MORE/CONTINUED page-break markers
// (which are stripped unconditionally, not just in the margin band, since
// "CONTINUED:" routinely opens the first body line of a continuation page).
function stripFurniture(
  perPageLines: RawLine[][],
  perPageHeight: number[],
  pageCount: number,
): { contentLines: RawLine[]; headerFooterTexts: string[] } {
  const marginTextPages = new Map<string, Set<number>>();

  for (let p = 0; p < pageCount; p++) {
    const height = perPageHeight[p] ?? 792;
    for (const line of perPageLines[p]) {
      const trimmed = line.text.trim();
      if (trimmed === '' || PAGE_NUMBER_RE.test(trimmed)) continue;
      const inMarginBand = line.y > height - MARGIN_BAND_PT || line.y < MARGIN_BAND_PT;
      if (!inMarginBand) continue;
      const norm = normalizeFurnitureText(trimmed);
      if (!marginTextPages.has(norm)) marginTextPages.set(norm, new Set());
      marginTextPages.get(norm)!.add(p);
    }
  }

  const headerFooterTexts = [...marginTextPages.entries()]
    .filter(([, pages]) => pages.size >= 2)
    .map(([norm]) => norm);
  const headerFooterSet = new Set(headerFooterTexts);

  const contentLines: RawLine[] = [];
  for (let p = 0; p < pageCount; p++) {
    const height = perPageHeight[p] ?? 792;
    for (const line of perPageLines[p]) {
      const trimmed = line.text.trim();
      if (trimmed === '') continue;
      if (MORE_MARKER_RE.test(trimmed) || CONTINUED_MARKER_RE.test(trimmed)) continue; // page-break furniture, anywhere
      const inMarginBand = line.y > height - MARGIN_BAND_PT || line.y < MARGIN_BAND_PT;
      // Page-number stripping is margin-band-gated, unlike MORE/CONTINUED
      // above: a bare "12" is unambiguous page furniture only near the top/
      // bottom edge. The same digits appearing in the body (e.g. a clock
      // readout or a room number in an action line) are real content and
      // must survive.
      if (inMarginBand && PAGE_NUMBER_RE.test(trimmed)) continue;
      if (inMarginBand && headerFooterSet.has(normalizeFurnitureText(trimmed))) continue; // repeated running header/footer
      contentLines.push({ ...line, text: trimmed });
    }
  }

  return { contentLines, headerFooterTexts };
}

function normalizeFurnitureText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

// ── Phase 3: adaptive column clustering ──────────────────────────────────────
// Single-linkage 1-D clustering over observed x-starts: walk the sorted list,
// starting a new cluster whenever the next value is further than
// CLUSTER_MERGE_TOL from the running mean of the current one. Deterministic
// (stable sort + linear scan), and cheap enough to run on every document.
function clusterXPositions(xs: number[]): Array<{ x: number; count: number }> {
  if (xs.length === 0) return [];
  const sorted = [...xs].sort((a, b) => a - b);
  const clusters: Array<{ sum: number; count: number }> = [];
  for (const x of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && x - last.sum / last.count <= CLUSTER_MERGE_TOL) {
      last.sum += x;
      last.count += 1;
    } else {
      clusters.push({ sum: x, count: 1 });
    }
  }
  return clusters.map(c => ({ x: c.sum / c.count, count: c.count }));
}

/**
 * Map the document's own observed x-start clusters onto the four screenplay
 * columns. The leftmost cluster is always 'action' (sluglines/action share
 * the same left margin in every standard format) and the rightmost is always
 * 'character' (the most-indented column). Any cluster(s) in between are
 * split into 'dialogue' vs 'parenthetical' by their relative position along
 * the [action, character] span, matching the FIXED_BANDS ratios.
 *
 * Falls back to FIXED_BANDS whenever fewer than 2 distinct columns are
 * observed — too degenerate to trust (e.g. a short fixture, or a page where
 * every extracted line happens to share one x, such as a title page).
 */
function computeBands(xs: number[]): ColumnBand[] {
  const clusters = clusterXPositions(xs);
  if (clusters.length < 2) return FIXED_BANDS;

  const sorted = [...clusters].sort((a, b) => a.x - b.x);
  const action = sorted[0]!;
  const character = sorted[sorted.length - 1]!;
  const span = character.x - action.x || 1;

  const bands: ColumnBand[] = [
    { role: 'action', x: action.x },
    { role: 'character', x: character.x },
  ];
  for (let i = 1; i < sorted.length - 1; i++) {
    const rel = (sorted[i]!.x - action.x) / span;
    bands.push({ role: rel < DIALOGUE_PARENTHETICAL_SPLIT ? 'dialogue' : 'parenthetical', x: sorted[i]!.x });
  }
  return bands;
}

function nearestBand(x: number, bands: ColumnBand[]): ColumnBand {
  let best = bands[0]!;
  let bestDist = Math.abs(x - best.x);
  for (const b of bands) {
    const d = Math.abs(x - b.x);
    if (d < bestDist) { best = b; bestDist = d; }
  }
  return best;
}

// A line is "unclassifiable" (position-wise) when it sits meaningfully far
// from every one of the four canonical US Letter screenplay columns — i.e.
// this document's layout barely resembles standard screenplay format at all
// (e.g. a general-prose PDF fed in by mistake). This is checked against
// FIXED_BANDS specifically, not the document's own adaptively-computed
// bands: the adaptive bands are *fit to* whatever this document contains, so
// every line is trivially "close" to one of them by construction — that
// would never flag anything. Comparing against the fixed reference points
// instead gives an independent, non-circular confidence signal. Wide enough
// to tolerate the margin drift between different screenwriting apps, tight
// enough to catch content that isn't screenplay-column-shaped at all.
const FIXED_BAND_CONFIDENCE_TOL = 60;

// ── Phase 4: classification + Fountain emission ──────────────────────────────
function classifyAndEmit(lines: RawLine[], bands: ColumnBand[]): { fountain: string; perPageUnclassifiable: Map<number, number> } {
  const out: string[] = [];
  let inSpeech = false;
  let lastSpeaker: string | null = null;
  let lastPage = -1;

  const perPageTotal = new Map<number, number>();
  const perPageUnclassifiable = new Map<number, number>();

  const openNewBlock = (): void => {
    if (out.length > 0 && out[out.length - 1] !== '') out.push('');
    inSpeech = false;
  };

  for (const line of lines) {
    const text = line.text;
    if (text === '') continue;

    perPageTotal.set(line.page, (perPageTotal.get(line.page) ?? 0) + 1);
    const band = nearestBand(line.xStart, bands);
    const fixedRef = nearestBand(line.xStart, FIXED_BANDS);
    if (Math.abs(line.xStart - fixedRef.x) > FIXED_BAND_CONFIDENCE_TOL) {
      perPageUnclassifiable.set(line.page, (perPageUnclassifiable.get(line.page) ?? 0) + 1);
    }

    const newPage = line.page !== lastPage;
    const role = classifyLine(text, band, inSpeech);

    // Continuation of dialogue split across a page break: the new page opens
    // with the same speaker's cue suffixed "(CONT'D)" while we were still
    // inSpeech when the previous page ended — drop the redundant re-cue and
    // keep appending as the same speech, rather than opening a fresh block.
    if (newPage && role === 'character' && inSpeech && lastSpeaker
      && text.replace(CONTD_SUFFIX_RE, '').trim().toUpperCase() === lastSpeaker) {
      lastPage = line.page;
      continue;
    }

    lastPage = line.page;

    switch (role) {
      case 'scene_heading':
        openNewBlock();
        out.push(formatSceneHeadingLine(text));
        break;
      case 'transition':
        openNewBlock();
        out.push(text.toUpperCase());
        break;
      case 'character': {
        openNewBlock();
        const name = text.replace(CONTD_SUFFIX_RE, '').trim();
        out.push(name.toUpperCase());
        inSpeech = true;
        lastSpeaker = name.toUpperCase();
        break;
      }
      case 'parenthetical':
        if (!inSpeech) openNewBlock();
        out.push(formatParentheticalLine(text));
        break;
      case 'dialogue':
        if (!inSpeech) openNewBlock();
        out.push(text);
        break;
      case 'action':
      default:
        openNewBlock();
        out.push(text);
        break;
    }
  }

  const ratios = new Map<number, number>();
  for (const [page, total] of perPageTotal) {
    ratios.set(page, (perPageUnclassifiable.get(page) ?? 0) / total);
  }

  return { fountain: out.length > 0 ? `${out.join('\n')}\n` : '', perPageUnclassifiable: ratios };
}

/**
 * Decide a line's Fountain role from its text and its nearest layout column.
 * Content-pattern signals (scene heading / transition / parenthetical) take
 * priority over the column, matching the module brief's disambiguation
 * order — a "CUT TO:" is a transition no matter which column pdfjs measured
 * it in, but within the action/dialogue/character columns, position is what
 * decides.
 */
function classifyLine(text: string, band: ColumnBand, inSpeech: boolean): Role {
  if (SCENE_HEADING_RE.test(text)) return 'scene_heading';
  if (isTransitionText(text)) return 'transition';

  if (PARENTHETICAL_RE.test(text) && (band.role === 'parenthetical' || band.role === 'dialogue')) {
    return 'parenthetical';
  }

  if (band.role === 'action') {
    if (isForceableHeading(text)) return 'scene_heading';
    return 'action';
  }

  if (band.role === 'character') {
    if (looksLikeCharacterCue(text)) return 'character';
    // ALL-CAPS-short-in-the-character-column is the confident signal; text
    // that fails it while we're currently mid-speech is far more likely a
    // dialogue line pdfjs measured with a slightly deeper indent (e.g. a
    // hanging continuation, or a page-break split — inSpeech persists across
    // pages, see classifyAndEmit) than a genuine new speaker cue, so keep the
    // speech open instead of misreading it as a new Character block.
    return inSpeech ? 'dialogue' : 'action';
  }

  // 'dialogue' or 'parenthetical' band, not already caught by the
  // parenthetical content check above → ordinary dialogue text.
  return 'dialogue';
}

// Transitions are recognized purely by content, matching the exact patterns
// server/lib/fdx-import.ts's formatTransition and src/lib/fountain.ts's
// parser already use for the same phrases — so a transition round-trips
// identically regardless of which importer produced it, and this module
// doesn't need a reliable x-band for the (often sparse, 1-2 lines per
// script) right-aligned transition column to recognize one.
function isTransitionText(text: string): boolean {
  const upper = text.toUpperCase();
  if (upper !== text) return false;
  return AUTO_DETECTED_TRANSITION_RE.test(upper) || GENERIC_TRANSITION_RE.test(upper) || OTHER_TRANSITION_RE.test(upper);
}

function isForceableHeading(text: string): boolean {
  const upper = text.toUpperCase();
  if (upper !== text) return false;
  if (text.length > 60) return false;
  if (SCENE_HEADING_RE.test(text)) return false;
  return HEADING_TIME_TAG_RE.test(text) || HEADING_DASH_RE.test(text);
}

function looksLikeCharacterCue(text: string): boolean {
  const upper = text.toUpperCase();
  if (upper !== text) return false;
  if (text.length > 40) return false;
  if (SCENE_HEADING_RE.test(text)) return false;
  return /[A-Z]/.test(text);
}

function formatSceneHeadingLine(text: string): string {
  const upper = text.toUpperCase();
  return SCENE_HEADING_RE.test(upper) ? upper : `.${upper}`;
}

function formatParentheticalLine(text: string): string {
  const t = text.trim();
  return t.startsWith('(') && t.endsWith(')') ? t : `(${t})`;
}

// ── Minimal structural types for the pdfjs surface this module touches ──────
// Kept narrow and local (rather than importing pdfjs-dist's own types at the
// top of the file) so this module's only coupling to pdfjs-dist is the single
// dynamic import inside pdfToFountain — nothing here forces pdfjs-dist's
// package to be resolvable at type-check time for code that never calls this
// function.
interface PdfTextItem { str: string; transform: number[]; width: number; height: number }
interface PdfPageLike {
  view: number[];
  getTextContent(): Promise<{ items: Array<PdfTextItem | { type: string }> }>;
}
interface PdfDocumentLike {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
}
