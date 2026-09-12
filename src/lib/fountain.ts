export type FountainBlockType =
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

/** A Fountain SCENE HEADING, by the same alphabet the classifier uses. Hoisted
 *  out of the classification chain so the dialogue-block rule below can ask
 *  the question without duplicating the pattern — one definition, two readers. */
const SCENE_HEADING_RE = /^(INT|EXT|EST|I\/E|INTERIOR|EXTERIOR|ESTABLECIENDO|INT\/EXT|INTÉRIEUR|EXTÉRIEUR|INTERIEUR|EXTERIEUR|INNEN|AUSSEN)[. ]/iu;

// ── THE DIALOGUE BLOCK RUNS TO THE NEXT BLANK LINE (2026-09-12) ────────────
// WHAT WAS WRONG. A line was classified `dialogue` only when the PREVIOUS
// block was `character`, `dual_dialogue` or `parenthetical`. A previous block
// of type `dialogue` was not accepted, so the second and every subsequent line
// of a multi-line speech fell through to the default and was scored as ACTION
// PROSE — same words, same speaker, same order. (The parenthetical branch
// below already accepted a previous `dialogue` block, so the omission was
// local to one condition.)
//
// WHY IT MATTERED MORE THAN IT LOOKS. Measured on this branch before the fix,
// over the 32 committed benchmark scripts re-wrapped at 30/35/40/60 columns
// using the repository's own parser to find the dialogue lines (no blank line
// introduced, whitespace-normalised text byte-identical, scene count
// unchanged on every one): health moved on 119 of 128 script-width pairs,
// range -8.8 .. +5.0, and `room-12` at 60 columns fell 63.9 -> 55.1, taking
// its verdict from CONSIDER to PASS. The entire measured shuffle-drop mean
// health gap on the same corpus is 1.9 points. Pressing Enter inside a speech
// moved the score by four times the signal the benchmark exists to detect, and
// it was invisible to every committed test because all 32 scripts write
// one-line speeches.
//
// THE RULE, AND ITS FOUR ESCAPES. Fountain's dialogue element runs from the
// character cue to the next blank line, so inside that span a non-blank line
// is a parenthetical if it is wrapped in `()` and dialogue otherwise. Four
// unambiguous author signals still break out, because real drafts drop the
// blank line before them and reading them as dialogue would be worse than the
// bug being fixed: a forced action `!`, a forced scene heading `.`, a lyric
// `~`, and a recognised INT./EXT. scene heading. A `>` transition does NOT
// break out — `>` is legal inside a speech in no sense, but `>text<` centering
// is, and the pre-existing transition branch only matched the four fixed
// strings anyway. Each escape is asserted in tests/core/fountain-dialogue-block.test.ts.
export function parseFountain(text: string): FountainBlock[] {
  const lines = text.split('\n');
  const blocks: FountainBlock[] = [];

  let inBoneyard = false;
  /** True while inside a dialogue element — i.e. after a character cue (or a
   *  line already classified as its parenthetical or dialogue) and before the
   *  blank line that ends the block. */
  let inDialogueBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNumber = i + 1;  // 1-indexed

    if (trimmed === '') {
      blocks.push({ id: `block-${i}`, type: 'empty', text: line, lineNumber });
      inDialogueBlock = false;
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

    // Inside a dialogue element, the only two elements Fountain defines are
    // dialogue and parenthetical — see the block comment above parseFountain
    // for the rule, the four escapes and the measurement that motivated it.
    const escapesDialogueBlock = trimmed.startsWith('!')
      || trimmed.startsWith('.')
      || trimmed.startsWith('~')
      || SCENE_HEADING_RE.test(trimmed);
    if (inDialogueBlock && !escapesDialogueBlock) {
      type = trimmed.startsWith('(') && trimmed.endsWith(')') ? 'parenthetical' : 'dialogue';
      blocks.push({ id: `block-${i}`, type, text: line, lineNumber });
      continue;
    }
    inDialogueBlock = false;

    // Basic Fountain parsing rules
    if (SCENE_HEADING_RE.test(trimmed) || trimmed.startsWith('.')) {
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
    }
    // (The old `prev is character | dual_dialogue | parenthetical -> dialogue`
    // clause lived here. It is not deleted so much as generalised: the
    // dialogue-block branch above decides every line inside a speech, and it
    // reaches this point only when that branch did not — i.e. never for a line
    // that clause could have matched. Keeping both would be two definitions of
    // one rule, which is how the missing `dialogue` case survived.)

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

    if (type === 'character' || type === 'dual_dialogue') inDialogueBlock = true;

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
