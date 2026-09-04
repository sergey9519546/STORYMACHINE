// Wave 62 — Final Draft (.fdx) export (P2)
// Converts a Fountain script to Final Draft XML — the industry-standard
// interchange format. FDX is XML under the hood; we hand-roll the template so
// no dependency is required. Maps each parsed FountainBlock type to its FDX
// paragraph element Type, the way Final Draft's own importer does.

import { parseFountain, type FountainBlock, type FountainBlockType } from './fountain.ts';
import { resolveExportTitlePage, type TitlePageInput, type ExportTitlePage } from './export-title-page.ts';
// The escaper is shared with docx.ts (it used to be copy-pasted into both, and
// both copies let XML-illegal control characters through — see xml-escape.ts).
import { escapeXml } from './xml-escape.ts';

// Fountain block type → FDX paragraph Type attribute.
// FDX recognises: Scene Heading, Action, Character, Dialogue, Parenthetical,
// Transition, Shot, General. Dual dialogue (a `dual_dialogue`-typed Character
// cue and its Parenthetical/Dialogue lines) is wrapped in a <DualDialogue>
// element below — see buildParagraphs — which is what the FDX spec actually
// requires for two columns to render side by side; Final Draft does NOT
// re-pair adjacent Character/Dialogue paragraphs on import on its own.
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

// A meaningful (non-empty/boneyard/note, past-title-page) block reduced to
// what the paragraph/wrapper builder needs: the ORIGINAL Fountain block type
// (to detect dual-dialogue membership — 'dual_dialogue' cues are grouped with
// the ordinary 'dialogue'/'parenthetical' lines that follow them) alongside
// the already-resolved FDX paragraph Type and cleaned text.
interface FdxEntry {
  blockType: FountainBlockType;
  fdxType: string;
  text: string;
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

/** A block is part of a dual-dialogue exchange's body once its speaker cue
 *  has been retagged 'dual_dialogue' — its Parenthetical/Dialogue lines stay
 *  typed 'parenthetical'/'dialogue' (see fountain.ts), so membership in the
 *  wrapped run is "starts at a dual_dialogue cue, continues through any
 *  parenthetical/dialogue/dual_dialogue block that immediately follows". */
function isDualDialogueMember(t: FountainBlockType): boolean {
  return t === 'dual_dialogue' || t === 'parenthetical' || t === 'dialogue';
}

function paragraphXml(e: FdxEntry, indent: string): string {
  return `${indent}<Paragraph Type="${e.fdxType}">\n${indent}  <Text>${escapeXml(e.text)}</Text>\n${indent}</Paragraph>`;
}

// Walk the flat entry list, wrapping every contiguous dual-dialogue run
// (one or more 'dual_dialogue' cues plus their parenthetical/dialogue lines)
// in a <DualDialogue> element as the FDX spec requires for two-column
// playback, and emitting every other paragraph as before.
function buildParagraphs(entries: FdxEntry[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < entries.length) {
    const entry = entries[i];
    if (entry.blockType === 'dual_dialogue') {
      let j = i;
      const group: FdxEntry[] = [];
      while (j < entries.length && isDualDialogueMember(entries[j].blockType)) {
        group.push(entries[j]);
        j++;
      }
      out.push('    <DualDialogue>');
      for (const g of group) out.push(paragraphXml(g, '      '));
      out.push('    </DualDialogue>');
      i = j;
    } else {
      out.push(paragraphXml(entry, '    '));
      i++;
    }
  }
  return out;
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

  const entries: FdxEntry[] = [];
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
    entries.push({ blockType: block.type, fdxType, text });
  }

  const info = resolveExportTitlePage(fountain, titlePage);

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    '<FinalDraft DocumentType="Script" Template="No" Version="5">',
    '  <Content>',
    ...buildParagraphs(entries),
    '  </Content>',
    ...(info ? [buildTitlePageXml(info)] : []),
    '</FinalDraft>',
  ].join('\n');
}
