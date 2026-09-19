// ONE scene segmenter for the measurement harnesses — the doctor's own heading
// grammar, reused rather than re-guessed, and a lossless slice view the
// degradations rearrange.
//
// ── Why this file exists (2026-09-12, adversarial review finding 12) ───────
// Three different notions of "a scene" were in play in the degradation
// harnesses, none of them the doctor's:
//
//   * `scripts/lib/auc.ts`'s `shuffleDropDegrade` split on
//     `/^(?=INT\.|EXT\.)/mi` — it does not recognise `EST.`, `I/E.`,
//     `INT./EXT.` or Fountain forced headings (a leading `.`), all standard and
//     all present in real drafts. On a synthetic mixed-heading script it saw 2
//     scenes where the doctor saw 5, and the degradation was a NO-OP.
//   * `scripts/lib/rebuild-experiment-lib.mjs`'s `segmentScenes` matched
//     `INT.|EXT.|EST.|INT/EXT.` plus a leading dot — closer, still not the
//     parser's list, and it reassembled through `lines.join('\n')`, which
//     rewrites CRLF and can drop a trailing newline.
//   * the doctor itself classifies a heading in `src/lib/fountain.ts`'s
//     `parseFountain` (`^(INT|EXT|EST|I/E|INTERIOR|EXTERIOR|ESTABLECIENDO|
//     INT/EXT|INTÉRIEUR|EXTÉRIEUR|INTERIEUR|EXTERIEUR|INNEN|AUSSEN)[. ]` or a
//     leading `.`, boneyard lines excluded) and counts scenes by grouping
//     blocks on those boundaries (`fountain-analyzer.ts` `segmentScenes`).
//
// On the 32 committed public-benchmark scripts all three agree (measured: 0 of
// 32 disagree on scene count), so the defect was latent there. It is not latent
// on the AUC-24 corpus, which is real screenplays.
//
// So: there is now one segmenter, and its grammar is not a fourth opinion — it
// IS the parser's classification, read off `parseFountain`'s own blocks.
// `tests/core/scene-segments.test.ts` asserts it agrees with
// `analyzeFountainText(...).sceneCount` on all 32 committed scripts and on a
// synthetic script that uses every heading form the parser recognises.
//
// ── Importing the parser is allowed; changing it is not ────────────────────
// `src/lib/fountain.ts` IS on the scoring path (`fountain-analyzer.ts` imports
// it, and it decides what counts as a scene heading — i.e. it produces
// `sceneCount`). This module only IMPORTS it, which is what
// `scripts/lib/rebuild-experiment-lib.mjs` already does for
// `degradeDialogueFlatten`; the receipt gate is a gate on CHANGED files
// reachable from `doctor.ts`, and `scripts/**` is not reachable from it
// (`node scripts/check-scoring-receipt.mjs <range>` decides, and says "no
// scoring-path files changed" for this lane). Reusing the classifier is the
// whole point: a harness that segments differently from the engine measures a
// degradation the engine cannot see.
//
// ── Two views, one boundary list ──────────────────────────────────────────
//   * `segmentFountainScenes` — VERBATIM slices. `head + scenes.join('')`
//     reproduces the input byte for byte FOR THE IDENTITY ORDER, so
//     rearranging, dropping or reordering scenes changes only order and
//     membership, never bytes within a scene. This is the view every
//     degradation uses.
//   * `sceneHeadingLineIndices` / `splitLines` — the boundary list and the line
//     split, exported so the legacy `{preamble, scenes: [{heading, body}]}`
//     view in `rebuild-experiment-lib.mjs` can be built on the same grammar
//     instead of carrying its own regexes.
//
// ── A missing final newline, and where the fix lives (2026-09-19,
//    harness-honesty lane) ───────────────────────────────────────────────
// A script with no trailing newline gives its LAST scene slice no line
// terminator — harmless while that slice stays last, but if a degradation
// relocates it earlier, the next slice's heading gets glued onto its final
// prose line and stops parsing as a heading (VERIFIED by probe: a 3-scene,
// no-trailing-newline script relocated to move its final scene first came
// back with 2 scenes, not 3). `reassembleFountainScenes` is where this is
// fixed, not `segmentFountainScenes`: it inserts a `\n` after any slice that
// lacks a terminator and is not last in the OUTPUT order, so the identity
// permutation still reproduces `text` exactly (the one terminator-less slice
// stays last) and every other permutation stays well-formed. See that
// function's own comment for the full account.
//
// ── What it deliberately does NOT do ──────────────────────────────────────
// It does not normalise. `analyzeFountainText` runs `normalizeScreenplay`
// first; this segmenter reads the author's bytes as given, because a degradation
// that normalised its input would score normalised text against a raw intact
// side. (Measured, 2026-09-12: raw and normalised heading counts agree on all
// 32 committed scripts.) It also does not cap at `ANALYZER_SCENE_CEILING` (400)
// the way the analyzer does — above that the doctor analyses a prefix, and a
// degradation must still rearrange the whole document; the test states this
// divergence rather than leaving it to be discovered.

import { parseFountain } from '../../src/lib/fountain.ts';

/** One script, split at scene boundaries, losslessly. */
export interface FountainSceneSegmentation {
  /** Everything before the first scene heading, verbatim. `''` when the first
   *  line is a heading; the WHOLE text when there are no headings at all. */
  head: string;
  /** One verbatim slice per scene: its heading line and everything up to (not
   *  including) the next heading. Empty when the text has no scene heading. */
  scenes: string[];
}

/**
 * Split into lines, each KEEPING its own trailing newline, so that joining the
 * pieces reproduces the input exactly (including CRLF and a missing final
 * newline). `String.split` cannot do this without losing the terminators.
 */
export function splitLinesKeepingEndings(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+/g) ?? [];
}

/**
 * The parser's own scene-heading lines, as 0-based indices into
 * `text.split(/\r?\n/)`.
 *
 * `parseFountain` emits exactly one block per input line and numbers them from
 * 1, so `lineNumber - 1` is the index. (It can append one synthetic
 * `block-eof-boneyard` block past the end for an unclosed boneyard; that block
 * is never a `scene_heading`, and the bound below drops it regardless.)
 */
export function sceneHeadingLineIndices(text: string): number[] {
  const lineCount = text.split(/\r?\n/).length;
  const out: number[] = [];
  for (const block of parseFountain(text)) {
    if (block.type !== 'scene_heading') continue;
    const index = block.lineNumber - 1;
    if (index >= 0 && index < lineCount) out.push(index);
  }
  return out;
}

/**
 * Segment a script into a verbatim head plus one verbatim slice per scene.
 *
 * INVARIANT, asserted in tests: `head + scenes.join('') === text`.
 */
export function segmentFountainScenes(text: string): FountainSceneSegmentation {
  const headings = sceneHeadingLineIndices(text);
  if (headings.length === 0) return { head: text, scenes: [] };
  const lines = splitLinesKeepingEndings(text);
  const head = lines.slice(0, headings[0]).join('');
  const scenes = headings.map((start, i) =>
    lines.slice(start, i + 1 < headings.length ? headings[i + 1] : lines.length).join(''));
  return { head, scenes };
}

/**
 * Put a segmentation back together. The inverse of `segmentFountainScenes`
 * for any permutation or subset of its scenes — including the identity
 * permutation, which must reproduce `text` exactly.
 *
 * ── Why this isn't just `head + scenes.join('')` (2026-09-19, harness-honesty
 * lane, VERIFIED by probe) ─────────────────────────────────────────────────
 * A script with no trailing newline has a last scene slice that ALSO lacks a
 * trailing newline — `segmentFountainScenes` keeps each slice byte-verbatim,
 * so a missing terminator on the input's last line means a missing
 * terminator on its last slice. That is harmless in the ORIGINAL order,
 * where the un-terminated slice is still last. It stops being harmless the
 * moment a degradation moves that slice out of last position: the next
 * scene's heading is concatenated onto the un-terminated slice's final prose
 * line and, since a heading only parses at the start of a LINE, stops being
 * a heading at all. Probe (3 scenes, no trailing newline on the source,
 * final scene relocated to position 1): the naive join produced
 * `"INT. C - DAY\n\nthree.INT. A - DAY\n\n..."` — 2 scenes where there
 * should be 3, because `INT. A - DAY` is now glued onto `three.` on one
 * line. Consequences downstream: `shuffleDropDegrade` silently loses an
 * EXTRA scene beyond the ones it meant to drop (inflating the measured
 * separation in the harness's favour, since the scarcity term is
 * `140/sceneCount`), and `assertFinalSceneIsFirst` THROWS on the scene-count
 * mismatch — hard-failing the climax-relocate channel on any corpus script
 * stored without a trailing newline.
 *
 * The fix is in REASSEMBLY, not segmentation: when joining, insert a single
 * `\n` after any scene slice that (a) does not already end with a line
 * terminator (`\n` or `\r\n`) and (b) is not the LAST slice in the new
 * order. The identity permutation is then still exact, because the one
 * slice that can lack a terminator — the original text's last scene — stays
 * last, so rule (b) never fires for it. Any permutation that moves it
 * earlier now gets a terminator inserted after it, so the invariant
 * `head + scenes.join('') === text` (identity order only) still holds, and
 * every other order stays a well-formed, re-parseable script.
 */
export function reassembleFountainScenes(head: string, scenes: readonly string[]): string {
  const withTerminators = scenes.map((scene, i) => {
    const isLast = i === scenes.length - 1;
    const hasTerminator = scene.endsWith('\n'); // covers both '\n' and '\r\n'
    return isLast || hasTerminator ? scene : `${scene}\n`;
  });
  return head + withTerminators.join('');
}

/** How many scenes this segmenter sees. Equal to the doctor's `sceneCount` for
 *  any script with at least one heading and at most `ANALYZER_SCENE_CEILING`
 *  of them — see this file's header for the two documented divergences. */
export function countFountainScenes(text: string): number {
  return sceneHeadingLineIndices(text).length;
}

/** A scene slice's heading line, trimmed. For diagnostics and tests; no
 *  degradation depends on it. */
export function sceneHeadingOf(scene: string): string {
  return (scene.split(/\r?\n/, 1)[0] ?? '').trim();
}
