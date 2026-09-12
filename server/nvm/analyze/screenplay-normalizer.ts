// ── Screenplay normalizer (import comprehension, 2026-07-11B) ───────────────
// Real-world imported screenplays (scraped PDFs, OCR) are almost never clean
// Fountain: they are double-spaced (a blank line after EVERY line, including
// character cues), and their dialogue/action is hard-wrapped mid-sentence.
// Fountain requires a character cue to be immediately followed by its dialogue
// with no blank line between — so double-spacing makes parseFountain() type
// every cue as `action`, and the doctor reads imported scripts as ~100% action
// with zero recognized dialogue or speaking characters (measured across the
// real corpus: Ratatouille, Mulan, Coco all parse to 0 dialogue lines).
//
// This module reconstructs proper Fountain STRUCTURE from messy input so the
// engine's existing deep parser (extractSceneContent → dialogueHighlights,
// relationshipShifts, powerBalance, speakingCharacterCount, …) comes alive on
// imports. It is deliberately IDEMPOTENT on already-clean Fountain: a script
// that is not double-spaced and whose cues already sit adjacent to their
// dialogue passes through structurally unchanged.
//
// Design: structural lines (scene headings, transitions, character cues) are
// the only reliable block boundaries in a double-spaced script — blank lines
// are not, because every line has one. So a dialogue block runs from a cue
// until the next cue / heading / transition; an action block runs from after a
// structural element until the next one. Wrapped fragments inside a block are
// joined into flowing text.

import { CUE_INITIAL_CLASS, CUE_LETTER_CLASS, parseFountain, type FountainBlock } from '../../../src/lib/fountain.ts';

// Heading detection is kept BYTE-COMPATIBLE with src/lib/fountain.ts's
// parseFountain (a scene_heading is `/^(INT|EXT|EST|I\/E)[. ]/i` OR any line
// beginning with '.'), so every line the real parser counts as a scene is also
// treated as a heading here and emitted verbatim — the normalizer can NEVER
// change scene segmentation, only reflow the text between headings. Several
// corpus scripts (Ratatouille, Coco, Up) mark scenes with '.'-forced headings
// instead of INT/EXT, which is exactly why alignment matters.
const HEADING_RE = /^(INT|EXT|EST|I\/E|INTERIOR|EXTERIOR|ESTABLECIENDO|INT\/EXT|INTÉRIEUR|EXTÉRIEUR|INTERIEUR|EXTERIEUR|INNEN|AUSSEN)[. ]/iu;
const TRANSITION_RE = /^(CUT TO|FADE (IN|OUT|TO)|DISSOLVE( TO)?|SMASH CUT|MATCH CUT|IRIS (IN|OUT)|WIPE TO|BACK TO|INTERCUT|THE END|FADE)\b/i;
// A caps "cue candidate": the bare name (minus a trailing parenthetical like
// (V.O.)/(CONT'D)/(O.S.)) is short, up to 4 words, all-caps letters + a few
// punctuation marks, and carries at least one letter.
const PAREN_TAIL_RE = /\s*\([^)]*\)\s*$/;
const PURE_PAREN_RE = /^\([^)]*\)$/;
// The cue alphabet, composed from src/lib/fountain.ts's single definition —
// see the block comment there for why capitals of any cased script count and
// caseless scripts (CJK, Hebrew, Arabic) deliberately do not.
const CUE_INITIAL_LETTER_RE = new RegExp(`[${CUE_INITIAL_CLASS}]`, 'u');
const CUE_BODY_RE = new RegExp(`^[${CUE_LETTER_CLASS}0-9 .,'&/#\\-]+$`, 'u');

export function isHeading(t: string): boolean { return HEADING_RE.test(t) || t.startsWith('.'); }
function isTransition(t: string): boolean {
  return TRANSITION_RE.test(t) || (/[A-Z]\s*TO:\s*$/.test(t) && t === t.toUpperCase() && t.length <= 20);
}
function isParenthetical(t: string): boolean { return PURE_PAREN_RE.test(t); }

/** Character-cue detector. Conservative on the two real false-positive sources:
 *  ALL-CAPS action emphasis ("THE DOOR BURSTS OPEN") and SUNG LYRICS — both
 *  tend to be sentence-like (>4 words) or end in sentence punctuation, whereas
 *  a cue is a bare 1–4-word name. */
export function isCharacterCue(rawLine: string): boolean {
  const t = rawLine.trim();
  if (!t || isHeading(t) || isTransition(t) || isParenthetical(t)) return false;
  const bare = t.replace(PAREN_TAIL_RE, '').trim();
  if (!bare) return false;
  // must be all-caps (letters that appear are uppercase; digits/&/./'/- allowed)
  if (bare !== bare.toUpperCase()) return false;
  // Unicode cue alphabet (2026-09-03): this file carried a THIRD independent
  // ASCII-only copy of the cue class, so an import whose cues are accented
  // ("MARÍA") was neither detected as double-spaced nor reflowed — the
  // normalizer that exists to rescue messy imports was itself blind to them.
  // Both tests now compose the single class definition in src/lib/fountain.ts.
  // `bare !== bare.toUpperCase()` above was already Unicode-correct.
  if (!CUE_INITIAL_LETTER_RE.test(bare)) return false;
  if (!CUE_BODY_RE.test(bare)) return false;
  const words = bare.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;   // cues are short
  if (bare.length > 30) return false;
  // reject sentence-like caps (ends in sentence punctuation and is multi-word)
  if (words.length > 1 && /[.!?,]$/.test(bare)) return false;
  return true;
}

function looksLikeContinuation(prev: string, next: string): boolean {
  // join wrapped fragments: prev doesn't end a sentence AND next starts lowercase
  // (or prev ends mid-word with a hyphen).
  if (/[-]$/.test(prev)) return true;
  const endsSentence = /[.!?:]["')\]]?$/.test(prev.trim());
  const nextStartsLower = /^[a-z]/.test(next.trim());
  return !endsSentence && nextStartsLower;
}

// ── isDoubleSpaced root-cause note (2026-08-04 fix) ─────────────────────────
// The original heuristic measured the fraction of ALL non-blank lines
// immediately followed by a blank line, flagging >=60% as "double-spaced".
// That number is not actually diagnostic: the Fountain SPEC itself requires
// a blank line between every ELEMENT (scene heading, action paragraph,
// transition, and the dialogue block as a whole) — so a short-paragraph,
// dialogue-heavy script that is correctly single-spaced can legitimately
// clear 60% just from ordinary element boundaries, with no import artifact
// present at all. Measured directly against data/screenplays/: 13 of the 20
// CC0 corpus scripts (ordinary, spec-correct Fountain, never touched by an
// importer) tripped the old ratio despite being clean.
//
// The one adjacency the spec makes IMPOSSIBLE in correctly-formatted
// Fountain is a blank line between a character CUE and its own dialogue —
// this file's own header explains why: "Fountain requires a character cue
// to be immediately followed by its dialogue with no blank line between".
// A genuinely double-spaced import (blank after every physical line,
// including cues, per this file's header) violates that adjacency on every
// cue; ordinary Fountain never does, by construction. That is the real,
// low-false-positive signal, so it is now the primary test. The old
// document-wide ratio is kept only as a fallback for the rare scene/passage
// with no character cues to check (a pure-action montage) — at a much
// higher bar than before, since without cue evidence it is flying blind.
function isDoubleSpaced(lines: string[]): boolean {
  let cueCount = 0, cueFollowedByBlank = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (!isCharacterCue(lines[i])) continue;
    cueCount++;
    if (lines[i + 1].trim() === '') cueFollowedByBlank++;
  }
  if (cueCount > 0) {
    // A genuinely double-spaced import blanks after EVERY cue (~100%);
    // ordinary Fountain never blanks after any cue (~0%) — the gap between
    // those two populations is wide, so a simple majority is a safe cut.
    return cueFollowedByBlank / cueCount >= 0.5;
  }
  // No character cues found anywhere (no dialogue at all) — fall back to
  // the coarse document-wide ratio, raised from 0.6 to 0.9 since it is now
  // a last resort rather than the primary signal.
  let nonBlank = 0, followedByBlank = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() === '') continue;
    nonBlank++;
    if (lines[i + 1].trim() === '') followedByBlank++;
  }
  return nonBlank > 0 && followedByBlank / nonBlank >= 0.9;
}

// ── TYPOGRAPHY IS NOT WRITING (2026-09-12, adversarial review finding 13) ──
// Every rule lexicon in this engine matches on ASCII. A writer whose editor
// emits the curly apostrophe — Final Draft, Highland, Word, Google Docs, iOS,
// every one of them — therefore gets a different score for the same sentence.
// Measured on the 32 committed benchmark scripts before this fold: replacing
// `'` with `\u2019` moved health on 21 of 32 (range -0.6 .. +1.6) and replacing
// `"` with `\u201C`/`\u201D` moved it on 7 of 32, by up to +4.3 points on
// `the-key-under-the-mat` — more than twice the corpus's whole shuffle-drop
// mean gap, bought with a keyboard setting.
//
// NFKC FIRST, then an explicit quote fold. NFKC alone does not map curly
// quotes to ASCII (they are not compatibility-equivalent), so the fold is
// listed out; NFKC is still applied because it handles the rest of the same
// family — the ligatures a PDF extractor emits, fullwidth punctuation, the
// non-breaking spaces a word processor leaves behind. Em and en dashes are NOT
// folded: they are typographic choices the lexicons deliberately read.
//
// IT IS SAFE FOR COPY TRUTH. The diagnostic surface quotes no script text back
// at the writer — an issue carries a rule, a location, a description and a
// suggested fix, never an excerpt (verified over every pass on
// data/screenplays/code-blue.fountain) — so folding the analyzer's input
// cannot put punctuation the writer did not type into anything they read.
const CURLY_TO_ASCII: Array<[RegExp, string]> = [
  [/[\u2018\u2019\u201A\u201B\u2032]/g, "'"],
  [/[\u201C\u201D\u201E\u201F\u2033]/g, '"'],
];

export function foldTypography(text: string): string {
  if (!text) return text;
  let out = text.normalize('NFKC');
  for (const [re, to] of CURLY_TO_ASCII) out = out.replace(re, to);
  return out;
}

// ── NOTHING THE READER NEVER SEES IS SCREENPLAY (2026-09-12, finding 1 of
// the writer's-loop review) ────────────────────────────────────────────────
// Fountain defines four constructs that are never printed: the boneyard
// (`/* ... */`), notes (`[[ ... ]]`), synopses (`= ...`) and section headings
// (`# ...`). The analyzer already refuses to diagnose them — extractSceneContent
// skips those block types by name — but several signals still read the RAW
// submission, so their words reached the analysis anyway. Pasting a production
// note into a comment therefore changed the score, and before the denominator
// fix in fountain-analyzer.ts it RAISED it: measured on the 32 committed
// scripts, an 800-repetition boneyard moved health on 32 of 32, mean +7.206, up
// to +18.6, flipping FOUR verdicts CONSIDER -> RECOMMEND without one word of
// screenplay changing.
//
// This strips them from the text the analysis reads. It is not censorship of
// the writer's file: `computeContentHash` still hashes the submitted bytes, and
// the document the writer sees is untouched. It is the same principle as the
// denominator fix — the thing being scored is the screenplay, and these four
// are, by the format's own definition, not the screenplay.
//
// The block types come from parseFountain rather than from a regex over the
// raw text, so a `#` inside a line of dialogue or a `/*` inside an action
// sentence is never mistaken for one of these.
const NON_PRINTING_BLOCK_TYPES = new Set(['boneyard', 'note', 'section', 'synopsis']);
const INLINE_NOTE_RE = /\[\[[^\]]*\]\]/g;

export function stripNonPrinting(text: string): string {
  if (!text) return text;
  const typeByLine = new Map<number, string>();
  for (const b of parseFountain(text)) typeByLine.set(b.lineNumber, b.type);
  const lines = text.split('\n');
  const out: string[] = [];
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const t = typeByLine.get(i + 1);
    if (t !== undefined && NON_PRINTING_BLOCK_TYPES.has(t)) { changed = true; continue; }
    const stripped = lines[i].replace(INLINE_NOTE_RE, ' ');
    if (stripped !== lines[i]) changed = true;
    out.push(stripped);
  }
  return changed ? out.join('\n') : text;
}

// ── A TITLE PAGE IS METADATA, NOT PROSE (2026-09-12, finding 5) ────────────
// Every real draft opens with `Title:` / `Credit:` / `Author:` / `Draft date:`.
// `segmentScenes` prepends everything before the first heading into scene one's
// body, so those four lines were diagnosed as screenplay writing: on `main` the
// review measured 34 rules changing their firing count, health moving on 20 of
// 32 scripts (worst -5.2) and the PRIMARY order AUC shifting 0.047 — more than
// twice the 0.02 floor margin — from metadata alone. On this branch the same
// transform still moved 29 of 32 (range -0.5 .. +1.2).
//
// Not one of the 20 `data/screenplays/*.fountain`, the 12 blind-pair fixtures
// or the 20 calibration samples carries a title page, which is why the defect
// was invisible: the corpus systematically avoids the document shape writers
// actually submit.
//
// THE SPEC'S RULE, followed exactly. A title page is present only when the
// document's FIRST non-blank line is a `Key:` line; it then runs to the first
// blank line, and inside it an indented line is a continuation of the previous
// key's value. Anything else at the top of the document (a `FADE IN:`, an
// epigraph, an action paragraph) is not a title page and is left exactly where
// it was — this must never eat writing.
//
// The text is NOT discarded: `analyzeFountainText` still hands the pre-heading
// blocks to the clue walk as `titlePageText` (see buildProperNounGuard), which
// is what stops the script's own title being read as a planted clue. What
// changes is that those lines stop being counted as scene-one prose.
const TITLE_PAGE_KEY_RE = /^[A-Za-z][A-Za-z0-9 _-]{0,40}:(\s|$)/;
const TITLE_PAGE_CONTINUATION_RE = /^[ \t]+\S/;

/** How many leading blocks are the Fountain title page — 0 when there is none. */
export function titlePageBlockCount(blocks: FountainBlock[]): number {
  // The FIRST block decides. A leading blank line, or any first line that is
  // not `Key:`, means the document has no title page and nothing is dropped.
  if (blocks.length === 0) return 0;
  if (blocks[0].type === 'empty') return 0;
  if (!TITLE_PAGE_KEY_RE.test(blocks[0].text.trim())) return 0;
  let i = 1;
  while (i < blocks.length && blocks[i].type !== 'empty') {
    const raw = blocks[i].text;
    // Inside the block, a line is either another key or an indented
    // continuation of the previous key's value. Anything else ends the title
    // page at that line rather than swallowing it.
    if (!TITLE_PAGE_KEY_RE.test(raw.trim()) && !TITLE_PAGE_CONTINUATION_RE.test(raw)) return i;
    i++;
  }
  return i;
}

/** The Fountain title page, dropped from a text that is about to be ANALYZED
 *  rather than displayed. `titlePageBlockCount` above is the one
 *  definition of where a title page starts and stops — see its header for the
 *  spec rule and for what a title page costs when it is scored as prose.
 *  Kept here, beside the other analysis-time normalisations, so a caller that
 *  needs "the screenplay" gets all of them from one place. */
export function stripTitlePage(text: string): string {
  if (!text) return text;
  const blocks = parseFountain(text);
  const n = titlePageBlockCount(blocks);
  if (n === 0) return text;
  const lines = text.split('\n');
  // titlePageBlockCount counts BLOCKS, and parseFountain emits exactly one
  // block per line, so the block count is the line count. The blank line that
  // ends the title page is left in place: it is what separates the (now
  // absent) metadata from the first element, and removing it too would join
  // two elements that were never adjacent.
  return lines.slice(n).join('\n');
}

// ── ONE SPEECH IS ONE ELEMENT, HOWEVER MANY LINES IT OCCUPIES (2026-09-12) ──
// A Fountain dialogue element runs from its character cue to the next blank
// line; whether the writer typed it as one long line or let an editor wrap it
// at 35 columns is a property of the keyboard, not of the writing. The
// analyzer measures per-line shape in several places (monologue length, action
// paragraph peaks, opener runs, arc sampling), so without this join the SAME
// speech scores differently depending on the wrap width.
//
// MEASURED, on the 32 committed benchmark scripts re-wrapped at 30/35/40/60
// columns (dialogue lines only, located with the repository's own parser, no
// blank line introduced, whitespace-normalised text byte-identical):
//   before the parser fix + this join   119 of 128 pairs moved, range -8.8 .. +5.0
//                                       (room-12 at 60 cols: 63.9 -> 55.1, CONSIDER -> PASS)
//   after the parser fix alone          119 of 128 moved, range -5.9 .. +5.9
//   after both                          see tests/core/parse-format-invariance.test.ts
//
// WHY HERE AND NOT IN parseFountain. parseFountain returns one block per
// physical line and every editor surface depends on that (incremental reparse,
// decorations, line-addressed lint). The JOIN is an analysis-time
// normalisation, so it belongs beside the other one, and it uses parseFountain
// itself to find the runs — the dialogue-block rule stays written down once.
//
// It is a no-op on the 32 committed scripts (every speech is one line), which
// is why the public benchmark does not move; the scripts it changes are the
// ones a writer actually pastes in.
export function joinWrappedDialogue(text: string): string {
  if (!text) return text;
  const lines = text.split('\n');
  const typeByLine = new Map<number, string>();
  for (const b of parseFountain(text)) typeByLine.set(b.lineNumber, b.type);
  const out: string[] = [];
  let i = 0;
  let joined = false;
  while (i < lines.length) {
    if (typeByLine.get(i + 1) === 'dialogue') {
      // The FIRST line of the run is kept byte-for-byte (its indentation is the
      // speech's own); only the continuation lines are trimmed before joining,
      // so a speech that was never wrapped comes back out unchanged.
      let j = i;
      let text0 = lines[j];
      j++;
      while (j < lines.length && typeByLine.get(j + 1) === 'dialogue') {
        text0 = `${text0.replace(/\s+$/, '')} ${lines[j].trim()}`;
        joined = true;
        j++;
      }
      out.push(text0);
      i = j;
    } else {
      out.push(lines[i]);
      i++;
    }
  }
  return joined ? out.join('\n') : text;
}

export function normalizeScreenplay(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw ?? '';
  const allLines = raw.replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/\s+$/, ''));
  // Preserve a title page verbatim if present (key: value lines before first blank/heading).
  // Clean input still gets the dialogue join: a wrapped speech is one element.
  if (!isDoubleSpaced(allLines)) return joinWrappedDialogue(stripNonPrinting(foldTypography(raw))); // structurally idempotent on clean input

  const lines = allLines.filter(l => l.trim() !== '');
  const out: string[] = [];
  type Mode = 'none' | 'action' | 'dialogue';
  let mode: Mode = 'none';
  let buf: string[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    out.push(buf.join(' ').replace(/\s{2,}/g, ' ').trim());
    out.push('');
    buf = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (isHeading(t)) {
      flush(); mode = 'action';
      out.push(t); out.push('');   // verbatim — keep parseFountain's scene boundary intact
      continue;
    }
    if (isTransition(t)) {
      flush(); mode = 'none';
      out.push(t.toUpperCase()); out.push('');
      continue;
    }
    if (isCharacterCue(line)) {
      flush(); mode = 'dialogue';
      out.push(t.toUpperCase().replace(PAREN_TAIL_RE, m => ' ' + m.trim())); // keep cue; parenthetical spaced
      continue;
    }
    if (isParenthetical(t)) {
      // parenthetical belongs to current dialogue; flush any pending dialogue text first
      if (mode === 'dialogue') { flush(); out.push(t); }
      else { // stray parenthetical in action
        if (buf.length) buf.push(t); else { out.push(t); out.push(''); }
      }
      continue;
    }
    // plain text: dialogue if we're under a cue, else action. Join wraps.
    if (buf.length && looksLikeContinuation(buf[buf.length - 1], t)) {
      buf[buf.length - 1] = buf[buf.length - 1] + ' ' + t;
    } else {
      // new paragraph within the same block only for action; dialogue stays one block
      if (mode === 'dialogue') {
        if (buf.length) buf[buf.length - 1] = buf[buf.length - 1] + ' ' + t;
        else buf.push(t);
      } else {
        buf.push(t);
      }
    }
  }
  flush();
  return stripNonPrinting(foldTypography(out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'));
}
