// STRIP PREAMBLE — removes title pages and leading author/provenance lines
// from a screenplay's text before it is shown to a blind reader.
//
// Two conventions are stripped, both restricted to the very TOP of the file
// (before any scene heading), so real screenplay content can never be
// mistaken for a preamble mid-document:
//
//   1. Leading Fountain title-page block. Per the Fountain spec, a title
//      page is one or more `Key: value` lines (optionally with indented
//      continuation lines) at the very start of the document, terminated by
//      the first blank line. Recognized only when the FIRST non-blank line
//      matches the `Key: value` shape and is not itself a scene heading,
//      transition, or character cue (so a screenplay that opens directly on
//      action/dialogue is never touched).
//   2. Leading `//`-prefixed comment lines. This repo's own CC0 benchmark
//      contributions (data/screenplays/*.fountain) use a leading block of
//      `//` lines for provenance/license attribution (see
//      data/screenplays/LICENSE-live-action.md, "In-file marking") — not
//      standard Fountain syntax, but real content in this corpus that must
//      not reach a blind reader (it can name contributors/authorship).
//
// Idempotent and a safe no-op on text that has neither: a script with no
// title page and no leading `//` block passes through byte-identical.

const HEADING_RE = /^(INT|EXT|EST|I\/E)[. ]/i;
const TRANSITION_RE = /^(CUT TO|FADE (IN|OUT|TO)|DISSOLVE( TO)?|SMASH CUT|MATCH CUT|IRIS (IN|OUT)|WIPE TO|BACK TO|INTERCUT|THE END|FADE)\b/i;
const KEY_VALUE_RE = /^[A-Za-z][A-Za-z0-9 _-]*:\s*\S/; // "Title: X", "Author: Y", ...

function isHeadingOrTransition(line) {
  const t = line.trim();
  if (!t) return false;
  if (HEADING_RE.test(t) || t.startsWith('.')) return true;
  if (TRANSITION_RE.test(t)) return true;
  return false;
}

/**
 * @param {string} rawText
 * @returns {{ body: string, strippedTitlePage: boolean, strippedCommentLines: number }}
 */
export function stripPreamble(rawText) {
  if (!rawText || typeof rawText !== 'string') return { body: rawText ?? '', strippedTitlePage: false, strippedCommentLines: 0 };

  let lines = rawText.replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  const n = lines.length;

  const skipBlank = () => {
    while (i < n && lines[i].trim() === '') i++;
  };

  skipBlank();

  // ── Step 1: leading `//` comment block ──────────────────────────────
  let strippedCommentLines = 0;
  while (i < n && lines[i].trimStart().startsWith('//')) {
    i++;
    strippedCommentLines++;
  }
  skipBlank();

  // ── Step 2: leading Fountain title page (Key: value lines) ─────────
  let strippedTitlePage = false;
  if (i < n && !isHeadingOrTransition(lines[i]) && KEY_VALUE_RE.test(lines[i].trim())) {
    const start = i;
    while (i < n && lines[i].trim() !== '') i++;
    if (i > start) strippedTitlePage = true;
    skipBlank();
  }

  const body = lines.slice(i).join('\n').replace(/^\n+/, '');
  return { body, strippedTitlePage, strippedCommentLines };
}
