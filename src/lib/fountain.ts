export type FountainBlockType =
  | 'title_page'
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'dual_dialogue'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'
  | 'shot'
  | 'centered'
  | 'lyrics'
  | 'section'
  | 'synopsis'
  | 'note'
  | 'boneyard'
  | 'empty';

export interface FountainBlock {
  id: string;
  type: FountainBlockType;
  text: string;
  /** 1-indexed source line number — used by lint error reporting to pinpoint issues */
  lineNumber: number;
  lintErrors?: string[];
}

const CAMERA_TERMS = [
  'WIDE SHOT', 'PAN', 'ZOOM', 'ANGLE ON', 'CLOSE UP', 'POV', 'CRANE', 'TRACKING SHOT', 'DOLLY', '35MM', 'WE SEE', 'ESTABLISHING SHOT', 'WIDE ESTABLISHING SHOT', 'TIGHT ON', 'REVERSE ANGLE'
];

// ── The character-cue alphabet (2026-09-03, Unicode cue fix) ────────────────
// A character cue is an ALL-CAPS line adjacent to its dialogue. Until this
// change every copy of that rule spelled "all caps" as the ASCII class
// `[A-Z]`, so `MARÍA` failed the test and parsed as `action` while `MARIA`
// parsed as `character`. Because Fountain's grammar is context-dependent on
// the preceding block, the failure cascaded: the parenthetical and EVERY
// dialogue line after an unrecognised cue also fell back to `action`, and the
// Script Doctor — which segments scenes through parseFountain — lost the
// speaker, the dialogue, and every metric derived from them (character count,
// dialogue ratio, voice analysis) for any script with an accented name:
// José, María, Zoë, Björn, Renée.
//
// WHAT IS AND IS NOT A CUE LETTER, and why:
//   * `\p{Lu}` (uppercase) and `\p{Lt}` (titlecase, the ǅ-style digraphs) are
//     the cue alphabet. On ASCII input `\p{Lu}` is exactly `[A-Z]`, so every
//     existing English script parses byte-identically; what it adds is every
//     OTHER cased script — Latin-with-diacritics, Greek, Cyrillic, Armenian,
//     Georgian.
//   * `\p{M}` (combining marks) is allowed only AFTER the first letter, so a
//     decomposed NFD cue (`MARI` + U+0301 + `A`, which macOS and several PDF
//     extractors emit) is the same cue as its NFC twin. A cue may not START
//     with a mark.
//   * CASELESS SCRIPTS (CJK, Hebrew, Arabic, Devanagari, Thai) are
//     DELIBERATELY EXCLUDED — they are `\p{Lo}`, not `\p{Lu}`. This is a
//     decision, not an oversight: "all caps" is a signal that only exists in
//     a cased script, so admitting `\p{Lo}` would make every short line of
//     Japanese or Hebrew action a character cue and destroy the parse of the
//     very documents it was meant to help. Fountain's own escape hatch for
//     those scripts is the forced-cue `@` prefix, which this parser does not
//     implement today (verified by grep at the time of this change) and which
//     this change does not add — teaching every renderer to strip the marker
//     (src/lib/pdf.ts, fdx.ts, docx.ts, src/components/editor/**,
//     src/lib/screenplay-layout.ts) is a separate change. A caseless cue is
//     therefore still parsed as `action`, exactly as before.
//
// These two class BODIES are the single definition of that alphabet. Every
// other cue test in the repository composes them (server/nvm/analyze/
// fountain-analyzer.ts, server/nvm/analyze/screenplay-normalizer.ts) or is
// held to them by tests/core/unicode-character-cues.test.ts, which fails on
// any ASCII-only cue class reintroduced anywhere on the scoring path.

/** Characters a cue may START with: any cased-script capital. */
export const CUE_INITIAL_CLASS = '\\p{Lu}\\p{Lt}';
/** Characters a cue may CONTINUE with: capitals plus combining marks. */
export const CUE_LETTER_CLASS = `${CUE_INITIAL_CLASS}\\p{M}`;

/** The parser's own cue test. Equivalent to the pre-2026-09-03 literal
 *  `/^[A-Z][A-Z0-9 \t'.#\-]*\s*\^?\s*(\s*\(V\.O\.\)|\s*\(O\.S\.\)|\s*\(CONT'D\))?$/`
 *  with the two ASCII classes widened; built with `new RegExp` so the class
 *  bodies above stay the one place the alphabet is written down. */
export const CHARACTER_CUE_RE = new RegExp(
  `^[${CUE_INITIAL_CLASS}][${CUE_LETTER_CLASS}0-9 \\t'.#\\-]*\\s*\\^?\\s*`
  + `(\\s*\\(V\\.O\\.\\)|\\s*\\(O\\.S\\.\\)|\\s*\\(CONT'D\\))?$`,
  'u',
);

/** Camera-direction ("shot") lines are all-caps too, and were gated by the
 *  same ASCII class; widened for the same reason. The CAMERA_TERMS gate is
 *  unchanged, so this only decides whether an accented all-caps line is even
 *  eligible to be tested against those terms. */
const SHOT_LINE_RE = new RegExp(`^[${CUE_LETTER_CLASS}0-9 \\t\\-]+$`, 'u');

// -- The title page (added 2026-09-04) -------------------------------------
// Until this change the parser had NO title-page handling at all. Fountain's
// title page is the `Key: Value` block at the very top of a document, ended by
// the first blank line -- and every one of those lines fell through the type
// ladder below to `action`, which put "Title: The Load Path", "Author: ...",
// "Draft date: ..." into the scored screenplay text: counted in wordCount (the
// health-score denominator), scanned by every action-line lexicon, and folded
// into scene 1 by the analyzer's scene segmenter, which prepends everything
// before the first slugline onto the opening scene.
//
// That reaches real drafts, not just fixtures: a title page is ORDINARY in a
// user's screenplay, which is why this is a larger truth defect than the
// provenance-header contamination it resembles.
//
// The key set is CLOSED on purpose. Fountain's spec permits any `key: value`
// at the top of a document, but a general `\w+:` rule at line 1 would swallow
// a legitimate opening action line that happens to carry a colon ("Checks the
// time: 8:52."). Restricting to the spec's own documented keys (plus the
// common episodic ones) cannot do that, and the cost of a missed nonstandard
// key is exactly the old behaviour -- one action line -- rather than a lost
// opening scene.
const TITLE_PAGE_KEY_RE =
  /^(title|credit|author|authors|source|draft date|date|contact|copyright|notes|revision|format|series|season|episode|writer|writers|written by)\s*:/i;
/** Any well-formed Fountain title-page key. Same shape as
 *  fountain-title-block.ts's KEY_LINE (that module is the app's existing
 *  title-page reader, used by ScriptIDE and by every exporter through
 *  export-title-page.ts) — a leading LETTER is required so "12:00 AM" and
 *  "V.O.:" cannot masquerade as keys. Only lines AFTER a recognised opening
 *  key are matched this loosely: parseFountain runs on every draft in the
 *  product, including ones whose first line is action carrying a colon
 *  ("Checks the time: 8:52."), and nothing but the closed key set above can
 *  keep such a line out of a title page it does not belong to. */
const TITLE_PAGE_ANY_KEY_RE = /^[A-Za-z][A-Za-z0-9 ]*:/;

/** How many leading lines of `text` form its Fountain title page (0 when there
 *  is none). The block starts at the first non-blank line, which must be a
 *  title-page key, and ends at the first blank line; indented continuation
 *  lines and further key lines belong to it. */
export function titlePageLineCount(text: string): number {
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length || !TITLE_PAGE_KEY_RE.test(lines[i].trim())) return 0;
  let end = i;
  while (end < lines.length && lines[end].trim() !== '') {
    const raw = lines[end];
    const isKey = TITLE_PAGE_ANY_KEY_RE.test(raw.trim());
    const isContinuation = end > i && /^\s+\S/.test(raw);
    if (!isKey && !isContinuation) break;
    end++;
  }
  return end;
}

/** Split `text` into lines with every NON-SCREENPLAY line blanked: the leading
 *  title page, and the body of every boneyard comment (Fountain's slash-star
 *  block comment).
 *
 *  ── Why blanking rather than deleting ─────────────────────────────────────
 *  Ten of the fourteen revision passes scan raw `fountain.split('\n')` rather
 *  than parsed blocks, and every finding they emit is anchored by LINE NUMBER.
 *  Deleting the metadata would renumber every anchor in the report; replacing
 *  it with empty strings leaves every index exactly where it was, and a blank
 *  line is what all of those scanners already skip.
 *
 *  ── What this is for ──────────────────────────────────────────────────────
 *  A boneyard is Fountain's COMMENT. The 2026-09-04 corpus-integrity fix moved
 *  every shipped fixture's provenance header into one, and the analyzer's
 *  block-level consumers (word count, scene segmentation, every per-scene
 *  lexicon) stopped reading it — but the raw-line scanners never learned, so a
 *  licence note was still being measured as prose. MEASURED across the 20
 *  shipped CC0 fixtures plus the two advice-audit fixtures, removing the
 *  boneyard changed the finding count of 23 distinct rules, concentrated
 *  entirely in two passes: voice (SENTENCE_FRAGMENT_STARVATION on 19 of 22
 *  scripts, ACTION_MOTION_VERB_MONOTONE on 6, ACTION_LINE_LENGTH_UNIFORMITY on
 *  5, MONOCHROME_VERBS on 3) and originality (ACTION_OPENER_MONOTONY on 9,
 *  SENSORY_MONOTONE on 8, ACTION_PEAK_PARAGRAPH on 3, and ten more). Those two
 *  passes now mask; the remaining raw-line scanners measured clean on this
 *  corpus and are recorded as unfinished work in
 *  docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md rather than changed blind.
 *
 *  The transform is MONOTONE by construction: a blanked line can only remove a
 *  metadata-derived finding, never create one, and never move an anchor. */
export function maskNonScreenplayLines(text: string): string[] {
  const lines = text.split('\n');
  const titlePageEnd = titlePageLineCount(text);
  const out: string[] = [];
  let inBoneyard = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (i < titlePageEnd) { out.push(''); continue; }
    if (!inBoneyard && trimmed.startsWith('/*')) {
      inBoneyard = !(trimmed.includes('*/') && trimmed.length > 2);
      out.push('');
      continue;
    }
    if (inBoneyard) {
      if (trimmed.includes('*/')) inBoneyard = false;
      out.push('');
      continue;
    }
    out.push(line);
  }
  return out;
}

export function parseFountain(text: string): FountainBlock[] {
  const lines = text.split('\n');
  const blocks: FountainBlock[] = [];

  let inBoneyard = false;
  const titlePageEnd = titlePageLineCount(text);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNumber = i + 1;  // 1-indexed

    if (i < titlePageEnd && trimmed !== '') {
      blocks.push({ id: `block-${i}`, type: 'title_page', text: line, lineNumber });
      continue;
    }

    if (trimmed === '') {
      blocks.push({ id: `block-${i}`, type: 'empty', text: line, lineNumber });
      continue;
    }

    // Boneyard handling
    if (trimmed.startsWith('/*')) {
      inBoneyard = true;
    }

    if (inBoneyard) {
      blocks.push({ id: `block-${i}`, type: 'boneyard', text: line, lineNumber });
      if (trimmed.includes('*/') && !(trimmed.startsWith('/*') && !trimmed.includes('*/'))) {
        inBoneyard = false;
      }
      continue;
    }

    let type: FountainBlockType = 'action';

    // Basic Fountain parsing rules
    if (trimmed.match(/^(INT|EXT|EST|I\/E|INTERIOR|EXTERIOR|ESTABLECIENDO|INT\/EXT|INTÉRIEUR|EXTÉRIEUR|INTERIEUR|EXTERIEUR|INNEN|AUSSEN)[. ]/iu) || trimmed.startsWith('.')) {
      type = 'scene_heading';
    } else if (trimmed.startsWith('#')) {
      type = 'section';
    } else if (trimmed.startsWith('=')) {
      type = 'synopsis';
    } else if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      type = 'note';
    } else if (trimmed.startsWith('~')) {
      type = 'lyrics';
    } else if (trimmed.startsWith('>') && trimmed.endsWith('<')) {
      type = 'centered';
    } else if (CHARACTER_CUE_RE.test(trimmed) && i < lines.length - 1 && lines[i+1].trim() !== '') {
      // Character names are all caps, optionally ending with ^ for dual dialogue
      const prevBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
      if (!prevBlock || prevBlock.type === 'empty') {
        // Dual dialogue: character cue ends with ^ (Fountain spec §Dual Dialogue)
        if (trimmed.endsWith('^') || trimmed.replace(/\s*\(.*?\)\s*$/, '').trimEnd().endsWith('^')) {
          type = 'dual_dialogue';
          // Retroactively mark the preceding character block as the left column
          // so renderers can lay out both columns side-by-side. Bound the search
          // to the current scene: a `^` cue must never retag a character cue from
          // an earlier scene, so walk back only until the nearest scene heading.
          let prevChar: FountainBlock | null = null;
          for (let bi = blocks.length - 1; bi >= 0; bi--) {
            if (blocks[bi].type === 'scene_heading') break;
            if (blocks[bi].type === 'character') { prevChar = blocks[bi]; break; }
          }
          if (prevChar) prevChar.type = 'dual_dialogue';
        } else {
          type = 'character';
        }
      }
    } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      // Check if it follows a character or dialogue
      const prevBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
      if (prevBlock && (prevBlock.type === 'character' || prevBlock.type === 'dual_dialogue' || prevBlock.type === 'dialogue')) {
        type = 'parenthetical';
      }
    } else if (trimmed.match(/^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:)$/) || (trimmed.match(/^[A-Z ]+ TO:$/) && trimmed === trimmed.toUpperCase())) {
      type = 'transition';
    } else if (SHOT_LINE_RE.test(trimmed) && CAMERA_TERMS.some(term => trimmed.includes(term))) {
      type = 'shot';
    } else if (i > 0 && blocks.length > 0 && (blocks[blocks.length - 1].type === 'character' || blocks[blocks.length - 1].type === 'dual_dialogue' || blocks[blocks.length - 1].type === 'parenthetical')) {
      type = 'dialogue';
    }

    // Forced Action
    if (trimmed.startsWith('!')) {
      type = 'action';
    }

    // Linting for camera directions in action and scene headings
    const lintErrors: string[] = [];
    if (type === 'action' || type === 'scene_heading') {
      const upperLine = line.toUpperCase();
      for (const term of CAMERA_TERMS) {
        if (upperLine.includes(term)) {
          lintErrors.push(`Line ${lineNumber}: Camera bleed: "${term}"`);
        }
      }
    }

    blocks.push({
      id: `block-${i}`,
      type,
      text: line,
      lineNumber,
      lintErrors: lintErrors.length > 0 ? lintErrors : undefined,
    });
  }

  // Warn about unclosed boneyard — remaining lines were already pushed as boneyard blocks
  // but future authors should know the comment was never closed.
  if (inBoneyard) {
    blocks.push({ id: `block-eof-boneyard`, type: 'boneyard', text: '/* UNCLOSED BONEYARD COMMENT */', lineNumber: lines.length + 1 });
  }

  return blocks;
}
