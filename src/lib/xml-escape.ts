// The one XML text-content escaper, shared by the two hand-rolled XML writers
// (src/lib/fdx.ts's Final Draft export and src/lib/docx.ts's Office Open XML
// export). It was duplicated in both files, character for character, and both
// copies carried the same defect — so it now lives once, with the defect
// fixed once.
//
// ── WHAT WAS WRONG (2026-09-04 security review finding #2) ──────────────────
// Both copies escaped the five XML entities and passed everything else
// through, including C0 control characters. Verified live: a script whose
// dialogue carried a raw NUL byte — an ordinary artefact of bad PDF-to-text
// extraction, an odd paste source, or a collaborator's file — produced a .fdx
// that a conforming XML parser REFUSES ("not well-formed (invalid token)"),
// and put the same literal bytes inside word/document.xml in the .docx. The
// writer gets a file Final Draft or Word may not open. Nothing about it is an
// injection: `<`, `>` and `&` were correctly neutralised then and still are.
// It is a correctness defect in files people are supposed to be able to open.
//
// src/lib/pdf.ts's pdfEscape() never had this problem — it maps everything
// outside its encoding's repertoire before writing — and this function is the
// same idea applied to XML's rules instead of WinAnsi's.
//
// ── WHAT XML 1.0 ACTUALLY ALLOWS, AND WHAT WE DO WITH THE REST ──────────────
// The Char production (XML 1.0 §2.2) permits, below U+0020, ONLY tab (U+0009),
// LF (U+000A) and CR (U+000D). It also excludes lone surrogates and the two
// noncharacters U+FFFE/U+FFFF. Two different repairs, because the two cases
// are not the same kind of damage:
//
//   * ILLEGAL C0 CONTROLS ARE DROPPED. They are invisible in the source text,
//     so deleting them removes nothing a reader could ever have seen — the
//     script reads exactly as it looked in the editor. Substituting a visible
//     marker instead would ADD a character the writer never typed to a
//     document they are about to send out, which is the worse failure.
//     Tab/LF/CR are kept: they are legal, and they are real whitespace
//     somebody typed.
//
//   * LONE SURROGATES AND NONCHARACTERS BECOME U+FFFD (the Unicode
//     REPLACEMENT CHARACTER). Unlike a control byte, a broken surrogate is the
//     wreckage of a character that was MEANT to be visible — usually an emoji
//     or a CJK glyph mangled by a bad slice or encoding round-trip. U+FFFD is
//     the standard, universally rendered way to say "a character was here and
//     it is damaged", so the writer can find it and fix it. Silently deleting
//     it would hide a real corruption in their text.
//
// Characters at or above U+0020 that XML permits — including U+007F and the
// C1 block, which XML 1.0 allows literally even though XML 1.1 would require
// escaping them — are passed through unchanged. This code declares 1.0.

/** XML 1.0 §2.2 forbids these outright; tab/LF/CR are deliberately absent. */
const ILLEGAL_C0 = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

/** A well-formed surrogate pair, OR a single unpaired surrogate. Matching the
 *  pair first is what keeps valid astral characters (emoji, CJK extensions)
 *  intact — only the alternative that captures group 1 is a lone surrogate. */
const SURROGATES = /[\uD800-\uDBFF][\uDC00-\uDFFF]|([\uD800-\uDFFF])/g;

/** The two noncharacters XML 1.0's Char production excludes by name. */
const NONCHARACTERS = /[\uFFFE\uFFFF]/g;

/**
 * Make `s` safe AND legal as XML character content: strip the characters XML
 * 1.0 forbids, then escape the five entities.
 *
 * Order matters only in that the stripping pass can never introduce `&`, `<`
 * or `>` — so escaping afterwards cannot double-escape anything.
 */
export function escapeXml(s: string): string {
  return s
    .replace(ILLEGAL_C0, '')
    .replace(SURROGATES, (match, lone: string | undefined) => (lone === undefined ? match : '\uFFFD'))
    .replace(NONCHARACTERS, '\uFFFD')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
