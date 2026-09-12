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

import { CUE_INITIAL_CLASS, CUE_LETTER_CLASS, parseFountain, type FountainBlock, type FountainBlockType } from '../../../src/lib/fountain.ts';

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
/** THE double-spaced decision, taken on a raw submission — the public form of
 *  `isDoubleSpaced` below, which takes lines that have already been split and
 *  right-trimmed. `normalizeScreenplayUncached` calls this, so the decision the
 *  analyzer reports and the decision the normalizer takes are the same code and
 *  cannot drift.
 *
 *  Exported for MEASUREMENT_RECEIPTS.md's pending entry (2026-09-12, round 3):
 *  it tells the owner to split the corpus by whether this fires before reading
 *  any rank statistic, and until round 3 nothing outside this module could
 *  answer the question. `server/lib/validation.ts`'s shape guard mirrors the
 *  same decision on the raw text and must keep agreeing with it. */
export function isDoubleSpacedText(raw: string): boolean {
  if (!raw || typeof raw !== 'string') return false;
  return isDoubleSpaced(rawLines(raw));
}

/** The line prep the double-spaced decision is taken on: CRLF folded, trailing
 *  whitespace dropped, nothing else. Written once so the exported form above
 *  and the normalizer below cannot prepare their input differently. */
function rawLines(raw: string): string[] {
  return raw.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
}

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
    // BLANKED, NOT DELETED. Every issue location a writer clicks is a line
    // number in this text (locate.ts resolves them here), so deleting a line
    // would slide every location below it off the line the writer is looking
    // at. A blank line is already an exact score invariant — it parses as an
    // `empty` block, which extractSceneContent skips and no rule reads — so
    // blanking costs nothing and keeps the line numbering the writer's editor
    // shows. Asserted in tests/core/parse-format-invariance.test.ts.
    if (t !== undefined && NON_PRINTING_BLOCK_TYPES.has(t)) { changed = true; out.push(''); continue; }
    const stripped = lines[i].replace(INLINE_NOTE_RE, ' ');
    if (stripped !== lines[i]) changed = true;
    out.push(stripped);
  }
  return changed ? out.join('\n') : text;
}

// ── A MARKER IS NOT A WORD (2026-09-12, round 2) ───────────────────────────
// Fountain's forced-element markers say what an element IS; they are never
// printed. `parseFountain` reads them to TYPE a line and then leaves them in
// the block's text, so the marker glues to the first word of the element and
// reaches every rule lexicon, every word count and all fourteen revision
// passes as prose. Measured on the 32 committed public scripts, applying each
// marker where it is REDUNDANT — i.e. declaring the element the line already
// parses as, so not one printed character changes:
//
//   forced-action `!` on every action line       32 of 32 moved, mean +1.056,
//                                                largest +7.0, 1 verdict flip
//   forced-heading `.` on every scene heading    32 of 32 moved, mean +0.659,
//                                                largest +2.5
//   forced-transition `>` on every transition    5 of 6 applicable moved,
//                                                mean -4.080, largest -15.7
//   forced-cue `@` on every character cue        32 of 32 moved, mean -1.172,
//                                                largest -26.8  (NOT FIXED HERE —
//                                                see below)
//
// `!` was the round-1 reviewer's own find and the reason this exists.
//
// WHAT THE STRIP MAY NOT DO. Removing a marker changes how the line re-parses,
// and scene segmentation is the strongest signal the engine has — a `.`
// silently dissolving a scene heading would be far worse than the leak. So the
// marker is removed only when the resulting document still parses to the
// element the marker DECLARED, and every unmarked line still parses to what it
// parsed to before. Any marker that fails that test keeps its character, and
// the leak with it; the alternative is a strip that can change the parse, and
// there is no version of that which is safe. The check is a re-parse, so it is
// exact rather than a heuristic about what "should" happen.
//
// THE FORCED CUE `@` IS DELIBERATELY NOT STRIPPED, AND IT IS THE BIGGEST OF
// THE FOUR. This parser has never implemented `@` (src/lib/fountain.ts says so
// and says why), so `@MARY` is action prose and so is every line of her speech
// under it — measured above at 32 of 32 scripts and up to 26.8 points, more
// than any other transform this branch has measured. Honouring it here would
// be a PARSER FEATURE wearing a normaliser's clothes: unlike `!`, `.` and `>`,
// stripping `@` changes the type of every line BELOW the cue (action becomes
// dialogue), and the editor, the PDF, the FDX and the DOCX renderers would all
// still print the `@` that the analysis had decided was invisible. It needs
// the renderer work src/lib/fountain.ts names, measured as its own change. It
// is asserted here as a KNOWN, QUANTIFIED gap rather than left to be found
// again (tests/core/parse-format-invariance.test.ts).
//
// TWO MARKERS ARE DELIBERATELY ABSENT. The lyric `~` and the centered
// `> ... <` have no line that already parses as `lyrics` or `centered`, so
// removing their marker necessarily changes the element — there is no
// redundant application and therefore no format-only transform to be invariant
// under. Both block types are skipped by extractSceneContent, so neither
// carries a word into the heuristics either way. Measured for the record:
// wrapping every transition line as `> ... <` moves 5 of 6 applicable scripts
// and a `~` on one dialogue line moves 8 of 32 — those are ELEMENT changes,
// not formatting, and they are named as such in the invariance suite.
interface ForcedMarker {
  marker: string;
  /** The block type(s) the marker declares its line to be. */
  declares: FountainBlockType[];
  test: (t: string) => boolean;
  /** True when parseFountain already TYPES the line from this marker. When it
   *  does not (`>`), the strip is what makes the declaration true, and the
   *  re-parse check below is what makes that safe. */
  parserTypes: boolean;
}
const FORCED_MARKERS: ForcedMarker[] = [
  { marker: '!', declares: ['action'], test: (t) => t.startsWith('!'), parserTypes: true },
  // `.` is a forced heading only when a NON-period follows it: `...` opening an
  // action line is an ellipsis, and parseFountain already (separately) types it
  // as a heading — that is a different defect and this must not touch it.
  { marker: '.', declares: ['scene_heading'], test: (t) => /^\.[^.]/.test(t), parserTypes: true },
  // `>` ending in `<` is centering, not a transition — excluded above. The
  // parser has no forced-transition branch, so `>CUT TO:` arrives typed
  // `action` and is scored as action prose, `>` and all; removing the marker
  // hands the line to the transition branch that was always meant to have it,
  // and changes no other line's type (nothing in parseFountain's state
  // depends on a transition block).
  { marker: '>', declares: ['transition'], test: (t) => t.startsWith('>') && !t.endsWith('<'), parserTypes: false },
];
const MARKER_SCAN_RE = /^[ \t]*[!.>]/m;

/** Remove every forced-element marker whose removal leaves the document
 *  parsing exactly as it did — see the block comment above for the rule, the
 *  measurement and the two markers this deliberately does not touch. */
export function stripForcedMarkers(text: string): string {
  if (!text || !MARKER_SCAN_RE.test(text)) return text;
  const lines = text.split('\n');
  const original = typesByLine(text);

  /** line index -> the block types its marker declares. */
  const declared = new Map<number, FountainBlockType[]>();
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    for (const m of FORCED_MARKERS) {
      if (!m.test(t)) continue;
      // A marker the parser DOES type from is only a marker when the parser
      // actually typed from it — otherwise the character is doing something
      // else on that line and must not be touched.
      if (m.parserTypes && !m.declares.includes(original[i])) break;
      declared.set(i, m.declares);
      break;
    }
  }
  if (declared.size === 0) return text;

  const allowed = new Set(declared.keys());
  // Each round drops the markers that did not survive the re-parse. The set
  // only ever shrinks, so this terminates; the cap is belt-and-braces against
  // a future parser rule that makes the fixpoint oscillate.
  for (let round = 0; round < 5 && allowed.size > 0; round++) {
    const candidate = lines.map((l, i) => (allowed.has(i) ? l.replace(/^([ \t]*)./, '$1') : l)).join('\n');
    const got = typesByLine(candidate);
    const reject = new Set<number>();
    for (let i = 0; i < lines.length; i++) {
      if (allowed.has(i)) {
        if (!declared.get(i)!.includes(got[i])) reject.add(i);
      } else if (got[i] !== original[i]) {
        // An unmarked line changed type, which means a marker earlier in the
        // document moved a block boundary. Blame the nearest allowed marker at
        // or above it; if there is none, the document is not strippable.
        let blame = -1;
        for (let j = i; j >= 0; j--) if (allowed.has(j)) { blame = j; break; }
        if (blame < 0) return text;
        reject.add(blame);
      }
    }
    if (reject.size === 0) return candidate;
    for (const i of reject) allowed.delete(i);
  }
  return text;
}

function typesByLine(text: string): FountainBlockType[] {
  const out: FountainBlockType[] = [];
  for (const b of parseFountain(text)) out[b.lineNumber - 1] = b.type;
  return out;
}

// ── ONE SPELLING OF AN EXTENSION IS ONE SPEAKER (2026-09-12, round 2) ──────
// `(V.O.)`, `(V.O)`, `(VO)` and `(v.o.)` are one extension; Final Draft, Celtx,
// Highland and every human typist emit all four. `CHARACTER_CUE_RE` admits
// only the canonical spelling, so `MARY (V.O)` is not a cue at all — the line
// is ACTION PROSE and so is the speech beneath it. Measured on the 32 public
// scripts, respelling every extension without its periods moved 12 of the 14
// applicable scripts (largest -1.3); `(V.O.)` -> `(V.O)` alone moved 8 of 8.
//
// The fold is deliberately narrow: it applies only to a line that is a cue
// name followed by nothing but parenthetical tails, and only when EVERY tail
// is a recognised extension. `MARY (into phone)` is a wryly-directed cue this
// parser has never accepted, and folding is not the change that would fix it —
// leaving it alone keeps this from ever eating a parenthetical direction or a
// line of prose that happens to end in brackets.
//
// WHAT IT DOES CHANGE THE CLASS OF, said plainly because it is the one case
// (2026-09-12 round 3): an all-caps ACTION-shaped line ending in an extension,
// `DOOR SLAMS (OS)`, becomes a character cue with the next line as dialogue.
// That is a consistency fix, not a new ambiguity — `DOOR SLAMS (O.S.)` was
// ALREADY a cue before this fold (measured on a git archive 85273742 export:
// canonical spelling character+dialogue, every alias spelling action+action),
// so the fold removes a spelling-dependent inconsistency inside a class the
// parser has always had. Whether such a line should be a cue at all is a
// question about CHARACTER_CUE_RE's shape and is not answered by spelling one
// of its four aliases differently from the other three. Asserted in
// tests/core/parse-format-invariance.test.ts.
const EXTENSION_ALIASES: Array<[RegExp, string]> = [
  [/^V\.?\s*O\.?$/i, 'V.O.'],
  [/^O\.?\s*S\.?$/i, 'O.S.'],
  [/^O\.?\s*C\.?$/i, 'O.C.'],
  [/^CONT'?\s*D\.?$/i, "CONT'D"],
];
const CUE_TAIL_LINE_RE = new RegExp(
  `^([ \\t]*)([${CUE_INITIAL_CLASS}][${CUE_LETTER_CLASS}0-9 \\t'.#\\-]*?)(\\s*\\^)?((?:\\s*\\([^)]*\\))+)[ \\t]*$`,
  'u',
);

export function normalizeCueExtensions(text: string): string {
  if (!text || !text.includes('(')) return text;
  let changed = false;
  const out = text.split('\n').map((line) => {
    const m = CUE_TAIL_LINE_RE.exec(line);
    if (!m) return line;
    const [, indent, name, caret, tails] = m;
    const canon: string[] = [];
    for (const t of tails.match(/\([^)]*\)/g) ?? []) {
      const inner = t.slice(1, -1).trim();
      const alias = EXTENSION_ALIASES.find(([re]) => re.test(inner));
      if (!alias) return line;   // not an extension — leave the whole line alone
      canon.push(alias[1]);
    }
    const rebuilt = `${indent}${name.trimEnd()}${caret ? ' ^' : ''}${canon.map((c) => ` (${c})`).join('')}`;
    if (rebuilt !== line) changed = true;
    return rebuilt;
  });
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
let titleMemoInput: string | null = null;
let titleMemoOutput = '';

export function stripTitlePage(text: string): string {
  if (text === titleMemoInput) return titleMemoOutput;
  const out = stripTitlePageUncached(text);
  titleMemoInput = text;
  titleMemoOutput = out;
  return out;
}

function stripTitlePageUncached(text: string): string {
  if (!text) return text;
  const blocks = parseFountain(text);
  const n = titlePageBlockCount(blocks);
  if (n === 0) return text;
  const lines = text.split('\n');
  // titlePageBlockCount counts BLOCKS, and parseFountain emits exactly one
  // block per line, so the block count is the line count. The lines are
  // BLANKED rather than removed, for the same reason stripNonPrinting blanks
  // its own: an issue location is a line number in this text, and deleting
  // four lines at the top would slide every location in the document.
  return [...lines.slice(0, n).map(() => ''), ...lines.slice(n)].join('\n');
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

// ── ONE-ENTRY MEMO (2026-09-12) ────────────────────────────────────────────
// normalizeScreenplay is now three passes over the document (fold, strip, join)
// and it is called more than once on the same bytes in a single request: the
// shape guard's real-parse bound calls it, analyzeFountainText calls it, and
// aggregateReport calls it again to build the canonical analysis text. It is a
// PURE function of its input, so remembering the last (input, output) pair
// collapses those repeats to one. ONE entry, not an LRU: the repeats are
// always the same string back-to-back, and a multi-entry cache would hold
// several megabytes of screenplay alive for no extra hit rate.
//
// Measured on the round-2 reviewer's 458,716-char A1 payload: the guard's
// rejection path goes from 102 ms to 63 ms with the memo, against a 100 ms
// assertion in tests/security/fountain-shape-guard-cue-parity.test.ts.
let memoInput: string | null = null;
let memoOutput = '';

export function normalizeScreenplay(raw: string): string {
  if (raw === memoInput) return memoOutput;
  const out = normalizeScreenplayUncached(raw);
  memoInput = raw;
  memoOutput = out;
  return out;
}

function normalizeScreenplayUncached(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw ?? '';
  // ── ORDER MATTERS: STRIP BEFORE RECONSTRUCTING (2026-09-12) ──────────────
  // The non-printing strip reads BLOCK TYPES from parseFountain, and
  // parseFountain only recognises a boneyard when `/*` opens a line. The
  // double-spaced reconstruction below joins wrapped fragments, which moves
  // `/*` into the middle of a joined line — so stripping AFTER it silently
  // does nothing on exactly the documents (scraped PDFs, FDX exports) most
  // likely to carry production notes. Measured: a cue inside a boneyard in a
  // double-spaced-shaped document reached `dialogueByCharacter` with 12 words,
  // which the shape guard — correctly reading the raw text's boneyard — scored
  // as 0, breaking the guard's `guardWords >= pipelineWords` oracle.
  //
  // The double-spaced DECISION is still taken on the raw lines, because
  // server/lib/validation.ts's guard mirrors that decision on the raw text and
  // the two must agree. Blanking boneyard lines adds blank lines, which would
  // move the decision if it were taken after.
  // fold typography -> canonical cue extensions -> drop what is never printed
  // -> drop the markers that say what an element is. The extension fold runs
  // BEFORE the strips because both of them read block types from parseFountain,
  // and a cue the parser cannot see is a speech it types as action; the marker
  // strip runs LAST because it decides what to remove from the block types the
  // steps before it produce.
  const cleaned = stripForcedMarkers(stripNonPrinting(normalizeCueExtensions(foldTypography(raw))));
  // Preserve a title page verbatim if present (key: value lines before first blank/heading).
  // Clean input still gets the dialogue join: a wrapped speech is one element.
  if (!isDoubleSpacedText(raw)) return joinWrappedDialogue(cleaned); // structurally idempotent on clean input

  const lines = cleaned.replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/\s+$/, '')).filter(l => l.trim() !== '');
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
  // Already folded and stripped above; the join is what this branch adds.
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
