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

// Heading detection is kept BYTE-COMPATIBLE with src/lib/fountain.ts's
// parseFountain (a scene_heading is `/^(INT|EXT|EST|I\/E)[. ]/i` OR any line
// beginning with '.'), so every line the real parser counts as a scene is also
// treated as a heading here and emitted verbatim — the normalizer can NEVER
// change scene segmentation, only reflow the text between headings. Several
// corpus scripts (Ratatouille, Coco, Up) mark scenes with '.'-forced headings
// instead of INT/EXT, which is exactly why alignment matters.
const HEADING_RE = /^(INT|EXT|EST|I\/E)[. ]/i;
const TRANSITION_RE = /^(CUT TO|FADE (IN|OUT|TO)|DISSOLVE( TO)?|SMASH CUT|MATCH CUT|IRIS (IN|OUT)|WIPE TO|BACK TO|INTERCUT|THE END|FADE)\b/i;
// A caps "cue candidate": the bare name (minus a trailing parenthetical like
// (V.O.)/(CONT'D)/(O.S.)) is short, up to 4 words, all-caps letters + a few
// punctuation marks, and carries at least one letter.
const PAREN_TAIL_RE = /\s*\([^)]*\)\s*$/;
const PURE_PAREN_RE = /^\([^)]*\)$/;

function isHeading(t: string): boolean { return HEADING_RE.test(t) || t.startsWith('.'); }
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
  if (!/[A-Z]/.test(bare)) return false;
  if (!/^[A-Z0-9 .,'&/#\-]+$/.test(bare)) return false;
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

/** True when the text is already clean single-spaced Fountain — heuristic:
 *  fewer than 40% of non-blank lines are immediately followed by a blank. */
function isDoubleSpaced(lines: string[]): boolean {
  let nonBlank = 0, followedByBlank = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() === '') continue;
    nonBlank++;
    if (lines[i + 1].trim() === '') followedByBlank++;
  }
  return nonBlank > 0 && followedByBlank / nonBlank >= 0.6;
}

export function normalizeScreenplay(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw ?? '';
  const allLines = raw.replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/\s+$/, ''));
  // Preserve a title page verbatim if present (key: value lines before first blank/heading).
  if (!isDoubleSpaced(allLines)) return raw; // idempotent on clean input

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
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
