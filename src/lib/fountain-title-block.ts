// Fountain leading title-block parser — Retrospective #1 ("Title survives").
//
// Fountain's title-page convention is a run of `Key: value` lines (optionally
// continued on indented lines per the spec) at the very start of the
// document, ending at the first blank line. This module extracts just the
// three fields ScriptIDE's Title tab cares about (title/author(s)/contact)
// so ScriptIDE.tsx can populate titlePage state from a pasted or typed
// script that already carries its own title page, instead of showing
// "UNTITLED SCRIPT" forever until the writer fills in the separate Title
// tab by hand.
//
// Deliberately conservative: a document that does not open with a
// recognizable `Key: value` line is assumed to have NO title page (the
// common case — most scripts just start with a scene heading or action),
// and this returns null rather than guessing.

export interface ParsedFountainTitleBlock {
  title?: string;
  author?: string;
  contact?: string;
}

// A top-level "Key: value" line. Fountain key names are letters/digits/space
// (e.g. "Draft date", "Contact"); require the FIRST character to be a letter
// so a line like "12:00 AM" or "V.O.:" (a dialogue extension, not a key)
// can't masquerade as one.
const KEY_LINE = /^([A-Za-z][A-Za-z0-9 ]*):\s*(.*)$/;
// A continuation line (indented, no colon needed) belonging to the
// most-recently-seen key — Fountain's own multi-line value convention
// (used most often for a multi-line Contact address).
const CONTINUATION_LINE = /^[ \t]+(\S.*)$/;

/**
 * Parse a leading Fountain title-page block out of `scriptText`. Returns
 * null when the document does not open with one, or when none of the three
 * fields this app tracks (title/author(s)/contact) were present in it.
 */
export function parseFountainTitleBlock(scriptText: string): ParsedFountainTitleBlock | null {
  if (!scriptText) return null;
  // Title blocks are short. Bound the scan so this stays cheap even when
  // called on every keystroke of a long draft.
  const head = scriptText.slice(0, 4000);
  const lines = head.split(/\r\n|\r|\n/);
  const firstLine = lines[0] ?? "";
  if (!KEY_LINE.test(firstLine)) return null; // doesn't open with a title page at all

  const fields = new Map<string, string>();
  let currentKey: string | null = null;
  for (const rawLine of lines) {
    if (rawLine.trim().length === 0) break; // first blank line ends the title page
    const keyMatch = KEY_LINE.exec(rawLine);
    if (keyMatch) {
      currentKey = keyMatch[1].trim().toLowerCase();
      fields.set(currentKey, keyMatch[2].trim());
      continue;
    }
    const contMatch = currentKey ? CONTINUATION_LINE.exec(rawLine) : null;
    if (contMatch) {
      const existing = fields.get(currentKey as string) ?? "";
      fields.set(currentKey as string, existing ? `${existing}\n${contMatch[1].trim()}` : contMatch[1].trim());
      continue;
    }
    // A line inside the leading run that is neither a key nor a valid
    // continuation — not a well-formed title page. Stop reading further
    // lines but keep whatever was already parsed (matches real-world Final
    // Draft output, which sometimes has a stray line before the body).
    break;
  }

  const title = fields.get("title");
  const author = fields.get("author") ?? fields.get("authors");
  const contact = fields.get("contact") ?? fields.get("contact info");
  if (!title && !author && !contact) return null;

  const result: ParsedFountainTitleBlock = {};
  if (title) result.title = title;
  if (author) result.author = author;
  if (contact) result.contact = contact;
  return result;
}
