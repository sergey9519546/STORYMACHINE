// Wave 62 — Final Draft (.fdx) export (P2)
// Converts a Fountain script to Final Draft XML — the industry-standard
// interchange format. FDX is XML under the hood; we hand-roll the template so
// no dependency is required. Maps each parsed FountainBlock type to its FDX
// paragraph element Type, the way Final Draft's own importer does.

import { parseFountain, type FountainBlock, type FountainBlockType } from './fountain.ts';
import { resolveExportTitlePage, type TitlePageInput, type ExportTitlePage } from './export-title-page.ts';

// Fountain block type → FDX paragraph Type attribute.
// FDX recognises: Scene Heading, Action, Character, Dialogue, Parenthetical,
// Transition, Shot, General. (Dual dialogue is exported as ordinary Character
// + Dialogue pairs — Final Draft re-pairs adjacent cues on import.)
const FDX_TYPE: Partial<Record<FountainBlockType, string>> = {
  scene_heading: 'Scene Heading',
  action:        'Action',
  character:     'Character',
  dual_dialogue: 'Character',
  dialogue:      'Dialogue',
  parenthetical: 'Parenthetical',
  transition:    'Transition',
  shot:          'Shot',
  centered:      'Action',
  lyrics:        'Action',
  section:       'Action',
  synopsis:      'Action',
};

// XML-escape text content for safe embedding in an FDX <Text> node.
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Strip Fountain's leading force/markup characters from a block's display text
// so the FDX paragraph carries clean prose (e.g. "!action" → "action",
// ".INT HOUSE" → "INT HOUSE", a trailing "^" dual-dialogue marker, "> " centering).
function cleanBlockText(block: FountainBlock): string {
  let t = block.text.trim();
  if (block.type === 'scene_heading' && t.startsWith('.')) t = t.slice(1).trim();
  if (block.type === 'action' && t.startsWith('!')) t = t.slice(1);
  if (block.type === 'character' || block.type === 'dual_dialogue') {
    t = t.replace(/\s*\^\s*$/, '').trim();  // drop dual-dialogue caret
  }
  if (block.type === 'centered') t = t.replace(/^>\s*/, '').replace(/\s*<$/, '').trim();
  if (block.type === 'lyrics') t = t.replace(/^~\s*/, '');
  if (block.type === 'section') t = t.replace(/^#+\s*/, '');
  if (block.type === 'synopsis') t = t.replace(/^=\s*/, '');
  return t;
}

function buildTitlePageXml(info: ExportTitlePage): string {
  const parts: string[] = [];
  if (info.title) parts.push(`      <Paragraph Type="Title"><Text>${escapeXml(info.title)}</Text></Paragraph>`);
  if (info.author) {
    parts.push('      <Paragraph Type="Credit"><Text>Written by</Text></Paragraph>');
    parts.push(`      <Paragraph Type="Author"><Text>${escapeXml(info.author)}</Text></Paragraph>`);
  }
  if (info.contact) {
    for (const line of info.contact.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean)) {
      parts.push(`      <Paragraph Type="Contact"><Text>${escapeXml(line)}</Text></Paragraph>`);
    }
  }
  return [
    '  <TitlePage>',
    '    <Content>',
    ...parts,
    '    </Content>',
    '  </TitlePage>',
  ].join('\n');
}

/**
 * Convert a Fountain script string to Final Draft (.fdx) XML.
 * Title-page lines (Title:, Credit:, Author:, etc.) and notes/boneyard blocks
 * are skipped from the body — FDX keeps those in separate structures.
 *
 * `titlePage` is either a plain title string or a {title, author, contact}
 * object; when omitted (or empty), the Fountain text's own leading title
 * block is used instead, and when NEITHER carries anything the document gets
 * no <TitlePage> element at all rather than a page of blank placeholders —
 * see resolveExportTitlePage.
 */
export function fountainToFdx(fountain: string, titlePage?: TitlePageInput): string {
  const blocks = parseFountain(fountain);

  const paragraphs: string[] = [];
  let pastTitlePage = false;

  for (const block of blocks) {
    if (block.type === 'empty' || block.type === 'boneyard' || block.type === 'note') continue;

    const text = cleanBlockText(block);

    // Skip Fountain title-page key:value lines that lead the document.
    if (!pastTitlePage) {
      if (/^(title|credit|author|authors|source|draft date|contact|copyright|notes?)\s*:/i.test(text)) {
        continue;
      }
      pastTitlePage = true;
    }

    if (text === '') continue;
    const fdxType = FDX_TYPE[block.type] ?? 'Action';
    paragraphs.push(
      `    <Paragraph Type="${fdxType}">\n      <Text>${escapeXml(text)}</Text>\n    </Paragraph>`,
    );
  }

  const info = resolveExportTitlePage(fountain, titlePage);

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    '<FinalDraft DocumentType="Script" Template="No" Version="5">',
    '  <Content>',
    ...paragraphs,
    '  </Content>',
    ...(info ? [buildTitlePageXml(info)] : []),
    '</FinalDraft>',
  ].join('\n');
}
