// Script Doctor — bridge half 4: resolves each RevisionIssue.location string
// (free-form English written by one of the 14 revision passes — "Scene 3
// (INT. BAR)", "Lines 40-42", "Character: JAX", "Act 3 pacing", ...) into a
// concrete line span the editor can draw a squiggle under.
//
// Honest 4-tier anchoring (see IssueAnchor's doc comment in ./types.ts): most
// issues are scene- or act-level observations, not line-precise, so pretending
// every issue maps to an exact caret range would be dishonest UI. Instead:
//   1. 'scene'     — "Scene N" (the SAME format doctor.ts's buildSceneHeatmap
//                     already parses, and the SAME 0-based sceneIdx
//                     fountain-analyzer.ts assigns) -> that scene's full line
//                     span (its slugline through the line before the next
//                     slugline; the last scene runs to EOF). Out-of-range N
//                     (a pass-invented index, or a script shorter than the
//                     issue expects) falls through to 'document', matching
//                     buildSceneHeatmap's own "can't be pinned to a cell"
//                     fallback for the same case.
//   2. 'lines'     — "Lines N-M" / "Line N" -> that literal span, clamped to
//                     the document's actual length.
//   3. 'character' — "Character: NAME", or a location that IS (not merely
//                     contains) a character-cue-shaped all-caps token ->
//                     that character's first speaking line. A name that never
//                     speaks (its "first line" doesn't exist) — or an
//                     all-caps location that just happens to look like a cue
//                     (e.g. "ACT ONE") but isn't a real speaking character —
//                     both fall through to 'document'.
//   4. 'document'  — everything else (act-level, thematic, whole-script,
//                     prose-pattern locations like "Scene slugline variety")
//                     — no line anchor; surfaced in summaries, not squiggles.
//
// Pure and deterministic: parses `fountain` ONCE per call (never per-issue),
// building the two lookup maps (scene spans, character-cue first lines) in a
// single pass over the parsed blocks so resolving N issues costs O(blocks +
// issues), not O(issues * lines). This matters because /api/scriptide/diagnose
// runs on every keystroke-pause debounce tick — an accidental O(issues*lines)
// rescan would show up as real typing lag on a long screenplay.

import { parseFountain, type FountainBlock } from '../../../src/lib/fountain.ts';
import type { PassName, RevisionIssue } from '../revision/passes/types.ts';
import type { LocatedIssue, IssueAnchor } from './types.ts';

interface LineSpan {
  startLine: number;
  endLine: number;
}

// "Scene N" — same case-insensitive pattern and same direct (0-based) index
// interpretation as doctor.ts's SCENE_LOCATION_RE / buildSceneHeatmap, so a
// location that already resolves correctly on the heatmap resolves to the
// identical scene here too. Deliberately does NOT match "Scenes N-M" (plural,
// a cross-scene range) — that has no single owning scene and correctly falls
// through to the 'document' tier rather than guessing which one owns it.
const SCENE_RE = /Scene (\d+)/i;

// "Lines N-M" or "Line N" — the one format that's already line-precise
// straight out of the pass, so there's nothing to resolve except clamping.
const LINES_RE = /Lines?\s+(\d+)(?:\s*[-–]\s*(\d+))?/i;

// "Character: NAME" — the explicit prefix a pass can use to name a character
// directly rather than embed them in a scene location.
const CHARACTER_PREFIX_RE = /^Character:\s*(.+)$/i;

// A location that IS (not merely contains) an all-caps character-cue-shaped
// token, e.g. "JAX" or "THE STRANGER" — the same typography Fountain itself
// uses for cue lines. Requires the WHOLE trimmed location to match so an
// act-level location like "ACT ONE" isn't mistaken for one just because it's
// upper-case too; the deciding factor is always the character-cue lookup
// below (a name that isn't a real speaking character falls through to
// 'document' regardless of this regex matching).
const BARE_CUE_RE = /^[A-Z][A-Z0-9 '.\-]*$/;

/** Strip Fountain character-cue decorations ((V.O.), (O.S.), (CONT'D), the
 *  trailing ^ dual-dialogue marker) down to the bare character name.
 *  Duplicated from fountain-analyzer.ts's (private, unexported)
 *  normalizeCharacterName — that module owns scene-record construction and
 *  is out of scope for this feature to touch, so the handful of lines are
 *  copied here rather than exported solely for this one caller. */
function normalizeCueText(raw: string): string {
  return raw
    .replace(/\^\s*$/, '')
    .replace(/\(\s*V\.O\.\s*\)/gi, '')
    .replace(/\(\s*O\.S\.\s*\)/gi, '')
    .replace(/\(\s*CONT'?D\s*\)/gi, '')
    .trim();
}

/** Every scene's [startLine, endLine] (1-based, inclusive), in the SAME
 *  0-based sceneIdx order fountain-analyzer.ts's segmentScenes assigns —
 *  built from the identical scene_heading boundaries so "Scene N" here always
 *  names the same scene the heatmap and the 14 passes mean. Spans run from
 *  the slugline's own line through the line before the next slugline (last
 *  scene runs to EOF), per the IssueAnchor contract — NOT segmentScenes'
 *  "fold pre-heading preamble into scene 0" behavior, which is a
 *  content-grouping detail for analysis, irrelevant to where an editor
 *  squiggle should start. */
function computeSceneSpans(blocks: FountainBlock[], totalLines: number): LineSpan[] {
  const headingLines = blocks.filter(b => b.type === 'scene_heading').map(b => b.lineNumber);

  if (headingLines.length === 0) {
    // No sluglines at all: analyzeFountainText's segmentScenes treats the
    // entire document as one implicit "UNTITLED SCENE" (sceneIdx 0) — mirror
    // that here so "Scene 0" still resolves for a headingless script.
    return totalLines > 0 ? [{ startLine: 1, endLine: totalLines }] : [];
  }

  return headingLines.map((line, i) => ({
    startLine: line,
    endLine: i + 1 < headingLines.length ? headingLines[i + 1] - 1 : totalLines,
  }));
}

/** First line (1-based) each character speaks, keyed by their cue text
 *  normalized to uppercase — built once over every 'character'/'dual_dialogue'
 *  block in document order (first occurrence wins). Mirrors how
 *  fountain-analyzer.ts's extractSceneContent tracks first-appearance, just
 *  document-wide instead of per-scene, since a "Character: NAME" location
 *  isn't scoped to any one scene. */
function computeCharacterFirstLines(blocks: FountainBlock[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of blocks) {
    if (b.type !== 'character' && b.type !== 'dual_dialogue') continue;
    const name = normalizeCueText(b.text.trim());
    if (!name) continue;
    const key = name.toUpperCase();
    if (!map.has(key)) map.set(key, b.lineNumber);
  }
  return map;
}

function clampLine(n: number, totalLines: number): number {
  return Math.max(1, Math.min(totalLines, n));
}

/** Resolve one issue's `location` string against the precomputed maps. Tier
 *  order matches the module doc comment (scene, lines, character, document):
 *  each regex is checked in turn and the first match wins, since the four
 *  formats are mutually exclusive by construction — no pass emits a location
 *  that could plausibly satisfy two tiers at once. */
function resolveLocation(
  location: string,
  sceneSpans: LineSpan[],
  characterFirstLines: Map<string, number>,
  totalLines: number,
): { anchor: IssueAnchor; startLine?: number; endLine?: number } {
  const sceneMatch = SCENE_RE.exec(location);
  if (sceneMatch) {
    const idx = parseInt(sceneMatch[1], 10);
    const span = sceneSpans[idx];
    return span
      ? { anchor: 'scene', startLine: span.startLine, endLine: span.endLine }
      : { anchor: 'document' };
  }

  const linesMatch = LINES_RE.exec(location);
  if (linesMatch) {
    const start = clampLine(parseInt(linesMatch[1], 10), totalLines);
    const end = linesMatch[2] ? clampLine(parseInt(linesMatch[2], 10), totalLines) : start;
    return { anchor: 'lines', startLine: Math.min(start, end), endLine: Math.max(start, end) };
  }

  const prefixMatch = CHARACTER_PREFIX_RE.exec(location);
  const trimmed = location.trim();
  const candidateName = prefixMatch ? prefixMatch[1].trim() : (BARE_CUE_RE.test(trimmed) ? trimmed : null);
  if (candidateName) {
    const line = characterFirstLines.get(normalizeCueText(candidateName).toUpperCase());
    if (line !== undefined) return { anchor: 'character', startLine: line, endLine: line };
  }

  return { anchor: 'document' };
}

/**
 * Resolve every RevisionIssue's free-form `location` string to a concrete
 * line span. Pure and deterministic — same fountain + same issues always
 * produces the same LocatedIssue[], byte for byte (aside from object
 * identity), which is what lets the /diagnose route's determinism tests (and
 * the client's debounce skip-redundant-render check) hold.
 */
export function locateIssues(
  issues: Array<RevisionIssue & { pass: PassName }>,
  fountain: string,
): LocatedIssue[] {
  // A blank (or whitespace-only) fountain is exactly the case
  // analyzeFountainText treats as zero scenes (its own `!fountain.trim()`
  // guard) — mirror that here so this module's view of "no scenes" never
  // disagrees with the report the issues actually came from.
  const isBlank = !fountain || !fountain.trim();
  const totalLines = isBlank ? 0 : fountain.split('\n').length;
  const blocks = isBlank ? [] : parseFountain(fountain);

  const sceneSpans = computeSceneSpans(blocks, totalLines);
  const characterFirstLines = computeCharacterFirstLines(blocks);

  return issues.map(({ pass, ...issue }) => ({
    issue,
    pass,
    ...resolveLocation(issue.location, sceneSpans, characterFirstLines, totalLines),
  }));
}
