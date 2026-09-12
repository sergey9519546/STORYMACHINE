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
};

// ── Printing vs non-printing, and how each one crosses into FDX ─────────────
//
// 2026-09-12 (adversarial review round 2). `section` and `synopsis` used to map
// to 'Action' here, and an inline `[[note]]` rode along inside the action text
// it sat in. Fountain DEFINES all three as text that is never printed, so the
// effect was the opposite of dropping them: a writer's `# ACT ONE` outline
// heading and their `= Maya finds the log.` synopsis came out of Final Draft as
// ACTION LINES IN THE SCRIPT. Measured on a marked-up copy of
// data/screenplays/chain-of-custody.fountain, both came back typed `action`
// after a round trip. They are now omitted from the body, which is what "not
// carried" always claimed.
//
// The three PRINTING constructs the exporter used to flatten cross over in real
// FDX vocabulary instead — attributes this format already defines, never an
// invented element:
//
//   centered  `> … <`  ->  Paragraph Alignment="Center"
//   lyric     `~…`     ->  a single Text run with Style="Italic" (Fountain
//                          renders lyrics italic; FDX has no lyric element, and
//                          leaving the `~` in the text would print a stray
//                          tilde in Final Draft — the same defect as above)
//   page break `===`   ->  Paragraph StartsNewPage="Yes" with empty text
//
// server/lib/fdx-import.ts reads all three back, so each one survives the round
// trip as itself rather than as a bare action line.

// A meaningful (non-empty/boneyard/note, past-title-page) block reduced to
// what the paragraph/wrapper builder needs: the ORIGINAL Fountain block type
// (to detect dual-dialogue membership — 'dual_dialogue' cues are grouped with
// the ordinary 'dialogue'/'parenthetical' lines that follow them) alongside
// the already-resolved FDX paragraph Type and cleaned text.
interface FdxEntry {
  blockType: FountainBlockType;
  fdxType: string;
  text: string;
  /** Paragraph Alignment attribute — set for centered text, omitted otherwise
   *  so every paragraph this exporter wrote before today is byte-unchanged. */
  alignment?: 'Center';
  /** Text run Style attribute — set for lyrics, omitted otherwise. */
  style?: 'Italic';
  /** A Fountain page break (`===`): an empty paragraph that starts a new page. */
  pageBreak?: true;
}

/** A Fountain page break is a line of three or more `=`. The parser has no
 *  `page_break` type — such a line lands in `synopsis` because it starts with
 *  `=` — so the shape is tested here rather than read off the block type.
 *  (src/lib/fountain.ts is scoring-path and is not touched to add one.) */
const PAGE_BREAK_RE = /^={3,}$/;

// Strip Fountain's leading force/markup characters from a block's display text
// so the FDX paragraph carries clean prose (e.g. "!action" → "action",
// ".INT HOUSE" → "INT HOUSE", a trailing "^" dual-dialogue marker, "> " centering).
function cleanBlockText(block: FountainBlock): string {
  let t = block.text.trim();
  // Inline notes are non-printing text sitting inside a printing line. They
  // used to ride into the FDX paragraph verbatim, so "MAYA pours coffee.
  // [[check this]]" printed the reminder in the script. Removed here, with the
  // space it leaves collapsed so the sentence still reads as written.
  if (t.includes('[[')) t = t.replace(/\[\[[\s\S]*?\]\]/g, '').replace(/[ \t]{2,}/g, ' ').trim();
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
  if (e.pageBreak) {
    return `${indent}<Paragraph Type="${e.fdxType}" StartsNewPage="Yes">\n${indent}  <Text></Text>\n${indent}</Paragraph>`;
  }
  const align = e.alignment ? ` Alignment="${e.alignment}"` : '';
  const style = e.style ? ` Style="${e.style}"` : '';
  return `${indent}<Paragraph Type="${e.fdxType}"${align}>\n${indent}  <Text${style}>${escapeXml(e.text)}</Text>\n${indent}</Paragraph>`;
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
  // 2026-09-12 (adversarial finding #18): the draft date. FDX's own title-page
  // vocabulary has a "Draft Date" paragraph type, and server/lib/fdx-import.ts
  // maps it straight back to Fountain's `Draft date:` key — so this is the last
  // non-boneyard line an export-and-reimport round trip used to lose.
  if (info.draftDate) {
    parts.push(`      <Paragraph Type="Draft Date"><Text>${escapeXml(info.draftDate)}</Text></Paragraph>`);
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
 * Title-page lines (Title:, Credit:, Author:, etc.) are skipped from the body —
 * FDX keeps those in a separate structure — and so is every Fountain construct
 * that is defined as never printed: boneyard comments, notes (on their own line
 * and inline), section headings and synopses. A `===` page break is printing and
 * is carried, as a paragraph that starts a new page.
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
    // Never printed, and therefore never carried: boneyard comments, notes on
    // their own line, section headings and synopses. A page break is the one
    // `synopsis`-typed block that IS printing, so it is separated out first.
    //
    // SCOPE (2026-09-12, review round 2). "Non-printing" here means the
    // constructs src/lib/fountain.ts actually IMPLEMENTS, which is narrower than
    // the Fountain spec in two places a reader will otherwise find and report as
    // a defect. The parser opens a boneyard only at the START of a line
    // (`trimmed.startsWith('/*')`), and treats a note as a block only when one
    // trimmed line both opens and closes it. So `MAYA pours coffee /* cut? */
    // and waits.` is ONE action block, and a `[[ … ]]` note spanning two lines
    // is three — measured, and both come out of here as printed action text.
    // That is correct rather than missed: the analyzer scores those words as
    // action too, so an exporter that quietly removed them would hand Final
    // Draft a different script from the one the report describes. An inline
    // note that opens and closes on one line IS removed, in cleanBlockText,
    // because there the parser and the exporter agree on what it is.
    if (block.type === 'empty' || block.type === 'boneyard' || block.type === 'note') continue;
    const isPageBreak = block.type === 'synopsis' && PAGE_BREAK_RE.test(block.text.trim());
    if (!isPageBreak && (block.type === 'section' || block.type === 'synopsis')) continue;

    const text = cleanBlockText(block);

    // Skip Fountain title-page key:value lines that lead the document.
    if (!pastTitlePage) {
      if (/^(title|credit|author|authors|source|draft date|contact|copyright|notes?)\s*:/i.test(text)) {
        continue;
      }
      pastTitlePage = true;
    }

    if (isPageBreak) {
      entries.push({ blockType: block.type, fdxType: 'Action', text: '', pageBreak: true });
      continue;
    }
    if (text === '') continue;
    const fdxType = FDX_TYPE[block.type] ?? 'Action';
    entries.push({
      blockType: block.type,
      fdxType,
      text,
      ...(block.type === 'centered' ? { alignment: 'Center' as const } : {}),
      ...(block.type === 'lyrics' ? { style: 'Italic' as const } : {}),
    });
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
