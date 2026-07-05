// Final Draft (.fdx) import — the inverse of src/lib/fdx.ts's Fountain→FDX
// exporter. Converts a Final Draft XML document back into Fountain text so
// the Script Doctor (server/routes/scriptide.ts) can accept real screenplay
// files, not just hand-typed Fountain.
//
// Subset supported: FDX's <Content><Paragraph Type="..."><Text>...</Text>
// ...</Paragraph></Content> body structure — the same paragraph-type
// vocabulary src/lib/fdx.ts writes (Scene Heading, Action, Character,
// Parenthetical, Dialogue, Transition, Shot) plus the generic "General" type
// real Final Draft documents also use. Title-page metadata, revision marks,
// scene numbers, character/element style tables, and other FDX furniture
// are intentionally ignored — the doctor only needs the script body as
// Fountain text.
//
// Why a tolerant regex/state-machine walk instead of an XML parser
// dependency: Node has no built-in XML parser, and FDX's paragraph/text
// structure is rigid and shallow enough (no attribute namespaces, no mixed
// content beyond sibling <Text> runs) that a small regex walk covers the
// whole supported subset deterministically, without pulling in a parsing
// library just to read a handful of element/attribute shapes.

type FdxKind =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition';

// FDX paragraph Type → our internal Fountain block kind. "Shot" and
// "General" have no dedicated Fountain syntax (Fountain shots are just
// plain, usually all-caps, lines — see src/lib/fountain.ts's CAMERA_TERMS
// heuristic), so both are carried over as plain Action-equivalent text.
const KNOWN_TYPES: Record<string, FdxKind> = {
  'Scene Heading': 'scene_heading',
  'Action':        'action',
  'Character':     'character',
  'Parenthetical': 'parenthetical',
  'Dialogue':      'dialogue',
  'Transition':    'transition',
  'Shot':          'action',
  'General':       'action',
};

// Decode FDX/XML entities in the order that makes double-encoding safe:
// named entities, then numeric entities, then "&amp;" LAST. If we decoded
// &amp; first, a double-encoded sequence like "&amp;lt;" (i.e. a producer
// that escaped an already-escaped "&lt;") would decode in two passes down to
// a bare "<" — silently re-introducing markup-shaped text. Decoding &amp;
// last means that sequence instead settles one level down, as the literal
// text "&lt;" (an escaped-looking string, not live markup) — the entity can
// never be "re-introduced" by our own decoding.
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&');
}

// Scene Heading → uppercase; force it ("." prefix, Fountain's forced-heading
// marker — see src/lib/fdx.ts's cleanBlockText, which strips this same
// leading "." on export) when the text doesn't already read as INT/EXT/EST/
// INT.-EXT./I-E so Fountain's own heuristic parser still recognizes it as a
// scene heading rather than misreading it as action.
function formatSceneHeading(text: string): string {
  const upper = text.toUpperCase();
  return /^(INT|EXT|EST|INT\.\/EXT|I\/E)[. ]/i.test(upper) ? upper : `.${upper}`;
}

// Transition → uppercase, ending in ":". Force it with a leading "> " when
// the text wouldn't be auto-detected by Fountain's own transition heuristic
// (the FADE IN:/FADE OUT./CUT TO:/DISSOLVE TO: set, or the general
// "ALL CAPS TO:" pattern) so a custom transition like "SMASH TO:" or
// "MATCH CUT TO:" survives the round trip instead of silently becoming a
// plain action line.
const AUTO_DETECTED_TRANSITION_RE = /^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:)$/;
const GENERIC_TRANSITION_RE = /^[A-Z ]+ TO:$/;
function formatTransition(text: string): string {
  const upper = text.toUpperCase();
  const withColon = upper.endsWith(':') ? upper : `${upper}:`;
  const autoDetected = AUTO_DETECTED_TRANSITION_RE.test(withColon) || GENERIC_TRANSITION_RE.test(withColon);
  return autoDetected ? withColon : `> ${withColon}`;
}

// Parenthetical → wrapped in "(...)" directly under the character. Final
// Draft's own <Text> content for a Parenthetical paragraph normally already
// carries the parens, but a defensive wrap keeps the output well-formed even
// if a producer stored the bare phrase.
function formatParenthetical(text: string): string {
  const t = text.trim();
  return t.startsWith('(') && t.endsWith(')') ? t : `(${t})`;
}

/**
 * Convert Final Draft (.fdx) XML into Fountain text.
 *
 * Deterministic and dependency-free. Throws a plain Error (message safe to
 * surface to the caller) when the document contains no recognizable
 * <Paragraph> content — i.e. it isn't a Final Draft export at all.
 */
export function fdxToFountain(fdxXml: string): { fountain: string; warnings: string[] } {
  // Final Draft always writes the script body's <Content> before the cover
  // page's <TitlePage><Content>...</Content></TitlePage>. Title-page
  // paragraphs (Title/Credit/Author/Contact/etc.) are a different structural
  // layer from the script body and must never leak into the Fountain output,
  // so drop the whole <TitlePage> subtree before looking for the body.
  const withoutTitlePage = fdxXml.replace(/<TitlePage\b[^>]*>[\s\S]*?<\/TitlePage>/i, '');

  const contentMatch = /<Content\b[^>]*>([\s\S]*?)<\/Content>/i.exec(withoutTitlePage);
  const contentXml = contentMatch ? contentMatch[1] : '';

  const rawParagraphs: Array<{ type: string; text: string }> = [];
  const PARAGRAPH_RE = /<Paragraph\b([^>]*)>([\s\S]*?)<\/Paragraph>/gi;
  const TEXT_RE = /<Text\b[^>]*>([\s\S]*?)<\/Text>/gi;

  let pm: RegExpExecArray | null;
  while ((pm = PARAGRAPH_RE.exec(contentXml)) !== null) {
    const attrs = pm[1];
    const inner = pm[2];
    const typeMatch = /\bType\s*=\s*"([^"]*)"/i.exec(attrs);
    const rawType = typeMatch ? typeMatch[1] : '';

    // Concatenate ALL <Text> runs inside the paragraph — Final Draft splits
    // styled spans (e.g. a bold or italic word mid-sentence) into sibling
    // <Text> elements that together make up the paragraph's full text.
    let rawText = '';
    TEXT_RE.lastIndex = 0;
    let tm: RegExpExecArray | null;
    while ((tm = TEXT_RE.exec(inner)) !== null) rawText += tm[1];

    const text = decodeXmlEntities(rawText).trim();
    if (text === '') continue; // spacer / empty paragraph — nothing to carry over

    rawParagraphs.push({ type: rawType, text });
  }

  if (rawParagraphs.length === 0) {
    throw new Error('Not a valid Final Draft (.fdx) file: no <Paragraph> content found.');
  }

  const warnings: string[] = [];
  const unknownTypesWarned = new Set<string>();

  const lines: string[] = [];
  let inSpeech = false; // inside a Character → [Parenthetical/Dialogue]* run

  // Blank-line discipline: Fountain needs a blank line between blocks, but
  // NOT between the Character/Parenthetical/Dialogue lines of one speech.
  // Every non-dialogue-continuation paragraph therefore opens a new block.
  const openNewBlock = (): void => {
    if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
    inSpeech = false;
  };

  for (const para of rawParagraphs) {
    let kind = KNOWN_TYPES[para.type];
    if (!kind) {
      if (!unknownTypesWarned.has(para.type)) {
        unknownTypesWarned.add(para.type);
        const label = para.type || '(missing Type attribute)';
        warnings.push(`Unrecognized Final Draft paragraph type "${label}" — imported as Action.`);
      }
      kind = 'action';
    }

    switch (kind) {
      case 'scene_heading':
        openNewBlock();
        lines.push(formatSceneHeading(para.text));
        break;

      case 'transition':
        openNewBlock();
        lines.push(formatTransition(para.text));
        break;

      case 'character':
        openNewBlock();
        lines.push(para.text.toUpperCase());
        inSpeech = true;
        break;

      case 'parenthetical':
        if (!inSpeech) openNewBlock();
        lines.push(formatParenthetical(para.text));
        break;

      case 'dialogue':
        if (!inSpeech) openNewBlock();
        lines.push(para.text);
        break;

      case 'action':
      default:
        openNewBlock();
        lines.push(para.text);
        break;
    }
  }

  return { fountain: `${lines.join('\n')}\n`, warnings };
}
