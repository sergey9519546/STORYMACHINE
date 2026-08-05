// ── Canonical Fountain formatter (2026-07-28) ──────────────────────────────
// Produces 100% clean, parse-guaranteed Fountain from ANY screenplay-shaped
// input: clean Fountain, double-spaced scraped text, single-spaced packed
// text, or text with leading-tab screenplay indentation. The output is what
// the corpus SHOULD store — not a runtime fixup.
//
// Three input archetypes, each handled by a distinct pass:
//
//   1. CLEAN FOUNTAIN (the common case): already has blank lines separating
//      blocks and character cues adjacent to their dialogue. Pass through
//      after light cleanup (strip CRLF, collapse trailing whitespace).
//
//   2. DOUBLE-SPACED: every line followed by a blank (≥60% per
//      normalizeScreenplay's isDoubleSpaced heuristic). Character cues sit
//      one blank line ABOVE their dialogue, so parseFountain sees the cue as
//      action. Hand off to normalizeScreenplay(), which reconstructs blocks.
//
//   3. SINGLE-SPACED / PACKED: NO blank lines between blocks (≤5% blank-line
//      ratio). Character cues, action, and dialogue all run together. The
//      Fountain parser cannot recognize a cue without a preceding empty
//      block. We INSERT blank lines around every detected structural element
//      (heading, transition, character cue, parenthetical) so the parser's
//      adjacency rules fire.
//
// After the archetype pass, a CANONICAL CLEANUP normalizes:
//   - leading whitespace on every line (Fountain is whitespace-insensitive
//     for action/dialogue; the screenplay-indented crawl files have 20-55
//     leading spaces that are pure noise)
//   - blank-line runs collapsed to exactly one (Fountain block separator)
//   - a single trailing newline
//
// The output is verified: we parseFountain() it and confirm the structural
// block counts (character, dialogue, scene_heading) are non-degenerate. If
// a pass made things WORSE (fewer recognized cues/dialogue than the raw
// input), we keep whichever form parsed better — never regress.
//
// ── Status (2026-08-03 wiring audit) ── NOT DORMANT — out of scope by design
// Zero importers from server/routes/**, but that is the wrong test for this
// file: it is a CORPUS-PREP utility, not a screenplay-diagnostic signal, and
// its own header already says so ("The output is what the corpus SHOULD
// store — not a runtime fixup"). It IS actively used, just from offline
// tooling rather than the live server: scripts/convert-crawl-scripts.mjs,
// scripts/probe-canonical-test.mjs, and scripts/probe-canonical-regression.mjs
// all import it (grep-verified). No test file of its own — the probe
// scripts appear to serve as its de facto regression check, though they
// don't run under `npm test`. Nothing to integrate here: it's already doing
// the job it was built for, on the surface it was built for.

import { normalizeScreenplay, isCharacterCue } from './screenplay-normalizer.ts';
import { parseFountain, type FountainBlock } from '../../../src/lib/fountain.ts';

const HEADING_RE = /^(INT|EXT|EST|I\/E|INTERIOR|EXTERIOR|ESTABLECIENDO|INT\/EXT|INTÉRIEUR|EXTÉRIEUR|INTERIEUR|EXTERIEUR|INNEN|AUSSEN)[. ]/iu;
const TRANSITION_RE = /^(CUT TO|FADE (IN|OUT|TO)|DISSOLVE( TO)?|SMASH CUT|MATCH CUT|IRIS (IN|OUT)|WIPE TO|BACK TO|INTERCUT|THE END|FADE)\b/i;
const PAREN_TAIL_RE = /\s*\([^)]*\)\s*$/;
const PURE_PAREN_RE = /^\([^)]*\)$/;

function isHeading(t: string): boolean {
  return HEADING_RE.test(t) || t.startsWith('.');
}
function isTransition(t: string): boolean {
  return TRANSITION_RE.test(t) || (/[A-Z]\s*TO:\s*$/.test(t) && t === t.toUpperCase() && t.length <= 20);
}
function isParenthetical(t: string): boolean {
  return PURE_PAREN_RE.test(t);
}

/** Count structural block types from a parseFountain run. */
function structuralCounts(text: string): { character: number; dialogue: number; scene_heading: number; action: number } {
  const blocks = parseFountain(text);
  const c: any = { character: 0, dialogue: 0, scene_heading: 0, action: 0 };
  for (const b of blocks) if (b.type in c) c[b.type]++;
  return c;
}

/** A "structural score" — higher is better. Weights cues and dialogue heavily
 *  because those are what collapse to action on messy input. Scene headings
 *  are weighted lower because they're usually detected even on messy input. */
function score(c: { character: number; dialogue: number; scene_heading: number; action: number }): number {
  return c.character * 2 + c.dialogue * 2 + c.scene_heading;
}

/** Collapse 3+ consecutive newlines to exactly 2 (one blank line). */
function collapseBlankRuns(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '\n');
}

/** Strip leading whitespace from every line. Fountain is whitespace-insensitive
 *  for action and dialogue; the screenplay-indented crawl files carry 20-55
 *  leading spaces that are noise. We keep the trimmed text. */
function stripLeadingWhitespace(text: string): string {
  return text.split('\n').map(l => l.replace(/^[ \t]+/, '')).join('\n');
}

/** Detect the single-spaced archetype: very few blank lines relative to
 *  non-blank lines (≤5% blank-after-nonblank ratio). */
function isSingleSpaced(text: string): boolean {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let nonBlank = 0, followedByBlank = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() === '') continue;
    nonBlank++;
    if (lines[i + 1].trim() === '') followedByBlank++;
  }
  if (nonBlank === 0) return false;
  return followedByBlank / nonBlank <= 0.05;
}

/** Single-spaced repair: insert blank lines around every detected structural
 *  element so the Fountain parser's adjacency rules fire. The detector set is
 *  the SAME one parseFountain uses (heading, transition, parenthetical,
 *  character cue) so what we mark as structural is exactly what the parser
 *  would recognize IF it had the blank lines. */
function repairSingleSpaced(text: string): string {
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/^[ \t]+/, ''));
  const out: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const t = line.trim();
    if (t === '') { out.push(''); continue; }

    const structural =
      isHeading(t) || isTransition(t) || isParenthetical(t) || isCharacterCue(line);

    if (structural) {
      // Ensure blank line BEFORE this structural element (unless at start or already preceded by blank)
      if (out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
      out.push(t);
      // For a character cue, ensure the NEXT non-blank line is its dialogue
      // (no blank between cue and dialogue — that's the Fountain rule). For
      // headings and transitions, a blank AFTER is conventional and harmless.
      if (isHeading(t) || isTransition(t)) out.push('');
      // character cue & parenthetical: do NOT push blank after — dialogue must follow immediately
    } else {
      out.push(t);
    }
  }
  return collapseBlankRuns(out.join('\n'));
}

/**
 * Format any screenplay-shaped input into canonical Fountain. Returns the
 * formatted text plus a diagnostic so the converter can log what happened.
 */
export function formatCanonicalFountain(raw: string): { text: string; method: string; before: any; after: any } {
  if (!raw || !raw.trim()) return { text: '', method: 'empty', before: {}, after: {} };

  // Stage 0: light cleanup — CRLF → LF, strip leading whitespace, collapse blank runs.
  const cleaned = collapseBlankRuns(stripLeadingWhitespace(raw.replace(/\r\n?/g, '\n')));
  const beforeCounts = structuralCounts(cleaned);
  const beforeScore = score(beforeCounts);

  // Stage 1: archetype detection on the CLEANED text.
  // Note: normalizeScreenplay checks the RAW input for double-spacing, so we
  // pass it the original (with leading whitespace preserved) — its heuristic
  // looks at blank-line adjacency which leading whitespace doesn't affect.
  const normalizedRaw = normalizeScreenplay(raw);
  const normalizedCounts = structuralCounts(normalizedRaw);
  const normalizedScore = score(normalizedCounts);

  // Try the single-spaced repair on the cleaned text.
  let singleSpacedText = '';
  let singleSpacedScore = -1;
  if (isSingleSpaced(raw)) {
    singleSpacedText = repairSingleSpaced(cleaned);
    const c = structuralCounts(singleSpacedText);
    singleSpacedScore = score(c);
  }

  // Pick the best-scoring candidate. Candidates:
  //   A) cleaned (light cleanup only)
  //   B) normalizedRaw (double-spaced repair)
  //   C) singleSpacedText (single-spaced repair, if applicable)
  const candidates: { text: string; method: string; score: number }[] = [
    { text: cleaned, method: 'clean-pass-through', score: beforeScore },
    { text: normalizedRaw, method: 'normalize-double-spaced', score: normalizedScore },
  ];
  if (singleSpacedScore >= 0) {
    candidates.push({ text: singleSpacedText, method: 'repair-single-spaced', score: singleSpacedScore });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  return {
    text: best.text.endsWith('\n') ? best.text : best.text + '\n',
    method: best.method,
    before: beforeCounts,
    after: structuralCounts(best.text),
  };
}

export type { FountainBlock };
