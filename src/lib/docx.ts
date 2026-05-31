// Wave 92 — Fountain → DOCX export (P2 export pipeline).
//
// Builds a minimal but valid Office Open XML (.docx) package and zips it with
// the dependency-free store-only writer in zip.ts. Each Fountain block type maps
// to a named paragraph style whose indents mirror the industry screenplay layout
// (Courier, 12pt). Word, Google Docs, and LibreOffice all open the result.

import { parseFountain, type FountainBlock, type FountainBlockType } from './fountain.ts';
import { buildZip, type ZipEntry } from './zip.ts';

// Twips = 1/1440 inch. Word measures indents in twips.
const TW = (inches: number) => Math.round(inches * 1440);

interface DocxStyle {
  styleId: string;
  name: string;
  leftIndent: number;   // twips from page text edge
  rightIndent?: number;
  uppercase?: boolean;
  alignment?: 'left' | 'right' | 'center';
  spaceBefore?: number; // twips of space above the paragraph
}

// Page text area begins at the 1" left margin; screenplay indents are measured
// from the paper edge, so subtract the 1.5" left page margin we set in sectPr.
// We set a 1" document margin and express element indents relative to that.
const LEFT_MARGIN_IN = 1.0;
const ind = (fromEdgeInches: number) => TW(fromEdgeInches - LEFT_MARGIN_IN);

const STYLES: Partial<Record<FountainBlockType, DocxStyle>> = {
  scene_heading: { styleId: 'SceneHeading', name: 'Scene Heading', leftIndent: ind(1.5), uppercase: true, spaceBefore: 240 },
  action:        { styleId: 'Action',       name: 'Action',       leftIndent: ind(1.5), spaceBefore: 240 },
  character:     { styleId: 'Character',     name: 'Character',    leftIndent: ind(3.7), uppercase: true, spaceBefore: 240 },
  parenthetical: { styleId: 'Parenthetical', name: 'Parenthetical', leftIndent: ind(3.1), rightIndent: TW(8.5 - 1 - 5.5) },
  dialogue:      { styleId: 'Dialogue',      name: 'Dialogue',     leftIndent: ind(2.5), rightIndent: TW(8.5 - 1 - 6.0) },
  dual_dialogue: { styleId: 'Character',     name: 'Character',    leftIndent: ind(3.7), uppercase: true, spaceBefore: 240 },
  transition:    { styleId: 'Transition',   name: 'Transition',   leftIndent: ind(1.5), alignment: 'right', spaceBefore: 240 },
  shot:          { styleId: 'Action',       name: 'Action',       leftIndent: ind(1.5), uppercase: true, spaceBefore: 240 },
  centered:      { styleId: 'Centered',     name: 'Centered',     leftIndent: ind(1.5), alignment: 'center' },
  lyrics:        { styleId: 'Dialogue',     name: 'Dialogue',     leftIndent: ind(2.5) },
  section:       { styleId: 'Action',       name: 'Action',       leftIndent: ind(1.5), uppercase: true, spaceBefore: 240 },
  synopsis:      { styleId: 'Action',       name: 'Action',       leftIndent: ind(1.5), spaceBefore: 240 },
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanText(block: FountainBlock): string {
  let t = block.text.trim();
  if (block.type === 'scene_heading' && t.startsWith('.')) t = t.slice(1).trim();
  if (block.type === 'action' && t.startsWith('!')) t = t.slice(1);
  if (block.type === 'character' || block.type === 'dual_dialogue') t = t.replace(/\s*\^\s*$/, '').trim();
  if (block.type === 'centered') t = t.replace(/^>\s*/, '').replace(/\s*<$/, '').trim();
  if (block.type === 'lyrics') t = t.replace(/^~\s*/, '');
  if (block.type === 'section') t = t.replace(/^#+\s*/, '');
  if (block.type === 'synopsis') t = t.replace(/^=\s*/, '');
  return t;
}

// ── Static package parts ──────────────────────────────────────────────────────
const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

function buildStylesXml(): string {
  const styleDefs = Object.values(STYLES)
    // De-dupe styleIds (several block types share one style).
    .filter((s, i, arr) => arr.findIndex(x => x!.styleId === s!.styleId) === i)
    .map((s) => {
      const align = s!.alignment && s!.alignment !== 'left' ? `<w:jc w:val="${s!.alignment}"/>` : '';
      const spacing = s!.spaceBefore ? `<w:spacing w:before="${s!.spaceBefore}"/>` : '';
      const rightInd = s!.rightIndent ? ` w:right="${Math.max(0, s!.rightIndent)}"` : '';
      return `  <w:style w:type="paragraph" w:styleId="${s!.styleId}">
    <w:name w:val="${s!.name}"/>
    <w:pPr><w:ind w:left="${Math.max(0, s!.leftIndent)}"${rightInd}/>${spacing}${align}</w:pPr>
    <w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="24"/></w:rPr>
  </w:style>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="24"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
${styleDefs}
</w:styles>`;
}

function buildDocumentXml(fountain: string): string {
  const blocks = parseFountain(fountain);
  const paras: string[] = [];
  let pastTitlePage = false;

  for (const block of blocks) {
    if (block.type === 'empty' || block.type === 'boneyard' || block.type === 'note') continue;
    const style = STYLES[block.type];
    if (!style) continue;

    let text = cleanText(block);
    if (!pastTitlePage) {
      if (/^(title|credit|author|authors|source|draft date|contact|copyright|notes?)\s*:/i.test(text)) continue;
      pastTitlePage = true;
    }
    if (text === '') continue;
    if (style.uppercase) text = text.toUpperCase();

    paras.push(
      `    <w:p><w:pPr><w:pStyle w:val="${style.styleId}"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`,
    );
  }

  // US Letter page with 1" margins (1440 twips).
  const sectPr = `    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${paras.join('\n')}
${sectPr}
  </w:body>
</w:document>`;
}

/**
 * Convert a Fountain script to a .docx document.
 * Returns the raw archive bytes (wrap in a Blob to download).
 */
export function fountainToDocx(fountain: string): Uint8Array {
  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: CONTENT_TYPES },
    { name: '_rels/.rels', data: ROOT_RELS },
    { name: 'word/_rels/document.xml.rels', data: DOC_RELS },
    { name: 'word/styles.xml', data: buildStylesXml() },
    { name: 'word/document.xml', data: buildDocumentXml(fountain) },
  ];
  return buildZip(entries);
}
