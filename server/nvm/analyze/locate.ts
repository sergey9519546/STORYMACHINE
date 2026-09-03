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
//                     ALSO (2026-09-03, lane A1) the four scene-RANGE forms
//                     the passes already emit — see "Scene ranges" below.
//                     A range still anchors at the 'scene' TIER, never
//                     'lines': a four-scene span is less precise than one
//                     scene, and the tier ordering (lines > scene) is what
//                     the priority sort reads, so calling a range 'lines'
//                     would promote the vaguest findings to the top.
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

// ── Scene ranges (lane A1, 2026-09-03) ──────────────────────────────────────
// Measured on the five real fixtures the 2026-09-03 discovery run captured,
// 81.8% of all located issues (666/814) landed on the 'document' tier with no
// line anchor at all — not because the passes were vague, but because the
// grammar above understood exactly ONE of the shapes they emit. Four more
// shapes appear verbatim in that corpus of 316 distinct document-tier location
// strings, each already naming a concrete region of the script:
//
//   "Act 3 (Scenes 11–14)", "Scenes 1–3", "Midpoint zone (Scenes 6–8)",
//   "Opening scenes (1–3) — no tension", "Climax zone (scenes 10–12)"
//     -> SCENE_RANGE_RE. Note the optional "(" between the word and the first
//        number, which is what "Opening scenes (1–3)" needs, and the three
//        dash characters the passes actually use (ASCII -, en dash, em dash).
//        Deliberately requires the number to FOLLOW the word: "within 2
//        scenes", "6 consecutive scenes" and "2 heavy clue-debt scene(s)" all
//        put a count BEFORE it and mean a length, not a position — they stay
//        on 'document', which is correct.
//
//   "Final quarter (Scenes 10+) — curiosity flatline"
//     -> SCENE_OPEN_RE. Open-ended: scene N through the last scene.
//
//   "End of Act 2 (Scene ~10)", "End of Act 1 (Scene ~3)"
//     -> SCENE_APPROX_RE. The "~" is the pass saying "about here"; the scene
//        it names is still a real index, and one scene's span is the honest
//        anchor for it. (SCENE_RE cannot match these: it wants a digit
//        immediately after the space, and finds "~".)
//
//   "Act 2a (25–50%), Act 3 (75–100%) empty; Act 1 (0–25%) has 2/4
//    stakes-raising scenes", "Act 1 (0%–25%)", "Act 2 (25%–75%)"
//     -> ZONE_PERCENT_RE. These carry their own definition: the percentage
//        window IS the location. The window is resolved with the passes' OWN
//        arithmetic (intention.ts's `Math.min(3, Math.floor((i / n) * 4))`
//        quarters and structure.ts's `sceneIdx >= n * 0.25 && sceneIdx <
//        n * 0.75` thirds are the same half-open [n*lo/100, n*hi/100) rule —
//        see zoneSpanIndices below), so this resolves to exactly the scenes
//        the pass was measuring, not to a guess. When several zones are named
//        the FIRST match wins, and the passes that emit this shape lead with
//        the deficient zone ("… empty; …" precedes "… has 2/4 …").
//
// Everything else stays on 'document' on purpose. "Dialogue throughout",
// "Action lines throughout", "longest stretch with no clue seeded: 6
// consecutive scenes" and "Overall structure" are genuinely whole-document
// observations; inventing a span for them would be the dishonest-UI failure
// the 4-tier design exists to avoid.

/** "Scenes N–M" / "scenes (N–M)" — a contiguous, 1-based, inclusive range. */
const SCENE_RANGE_RE = /\bScenes\s+\(?(\d+)\s*[-–—]\s*(\d+)/i;

/** "Scenes N+" — scene N through the end of the script. */
const SCENE_OPEN_RE = /\bScenes\s+(\d+)\s*\+/i;

/** "Scene ~N" — an approximate single scene ("End of Act 2 (Scene ~10)"). */
const SCENE_APPROX_RE = /\bScene\s+~\s*(\d+)/i;

/** "Act 2a (25–50%)" / "Act 1 (0%–25%)" / "Act 2 (25%–75%)" — a structural
 *  zone stated as a percentage window. The leading Act/Zone/Quarter word is
 *  required so a bare parenthesised range that happens to end in "%" can't be
 *  mistaken for one. */
const ZONE_PERCENT_RE = /\b(?:Act|Zone|Quarter)\s*[0-9a-z]*\s*\(\s*(\d{1,3})\s*%?\s*[-–—]\s*(\d{1,3})\s*%\s*\)/i;

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

/** The line span covering scenes [startIdx, endIdx] (0-based, inclusive), or
 *  null when the range cannot be honoured. The START index must be real: an
 *  out-of-range start is a pass-invented index and falls through to
 *  'document', exactly as a single out-of-range "Scene N" already does. The
 *  END is clamped to the last scene instead, because a range that runs past
 *  the end ("Scenes 11–14" against a 13-scene draft) still names a region
 *  that genuinely exists — the overshoot is the pass describing an act
 *  boundary, not a wrong location. */
function spanForSceneRange(
  startIdx: number,
  endIdx: number,
  sceneSpans: LineSpan[],
): { startLine: number; endLine: number } | null {
  if (startIdx < 0 || startIdx >= sceneSpans.length) return null;
  const last = Math.max(startIdx, Math.min(endIdx, sceneSpans.length - 1));
  return { startLine: sceneSpans[startIdx].startLine, endLine: sceneSpans[last].endLine };
}

/** Scene indices [first, last] (0-based, inclusive) covered by the percentage
 *  window [loPct, hiPct). This is the passes' own arithmetic, restated once:
 *  intention.ts assigns scene i to quarter `Math.floor((i / n) * 4)` and
 *  structure.ts selects an act with `sceneIdx >= n * lo && sceneIdx < n * hi`
 *  — the same half-open interval [n*lo/100, n*hi/100). The smallest integer
 *  index in it is ceil(n*lo/100); the largest is ceil(n*hi/100) - 1 (which
 *  yields n-1 for hi = 100, whether or not n*hi/100 lands on an integer).
 *  Returns null for a zero-scene document or a window that contains no scene
 *  at all (possible on a very short script, e.g. 25–50% of 3 scenes). */
function zoneSpanIndices(
  loPct: number,
  hiPct: number,
  sceneCount: number,
): { firstIdx: number; lastIdx: number } | null {
  if (sceneCount <= 0 || hiPct <= loPct) return null;
  const firstIdx = Math.ceil((sceneCount * loPct) / 100);
  const lastIdx = Math.ceil((sceneCount * hiPct) / 100) - 1;
  if (firstIdx > lastIdx || firstIdx >= sceneCount) return null;
  return { firstIdx, lastIdx: Math.min(lastIdx, sceneCount - 1) };
}

/** Resolve one issue's `location` string against the precomputed maps. Tier
 *  order matches the module doc comment (scene, lines, character, document):
 *  each regex is checked in turn and the first match wins, since the formats
 *  are mutually exclusive by construction — no pass emits a location that
 *  could plausibly satisfy two tiers at once. Within the scene tier the
 *  single-scene form is checked FIRST so every location that resolved before
 *  the 2026-09-03 range grammar resolves to the byte-identical span now; the
 *  four range forms only ever claim strings that previously fell all the way
 *  through to 'document'. */
function resolveLocation(
  location: string,
  sceneSpans: LineSpan[],
  characterFirstLines: Map<string, number>,
  totalLines: number,
): { anchor: IssueAnchor; startLine?: number; endLine?: number } {
  const sceneMatch = SCENE_RE.exec(location);
  if (sceneMatch) {
    // Labels are 1-based ("Scene 1" is the first scene — the numbering the
    // writer sees, matching the heatmap), so decode to the 0-based span
    // index here. Before the 2026-08 label migration the passes emitted raw
    // 0-based sceneIdx values and this parse consumed them verbatim; the two
    // bugs cancelled. Now the label is correct and this boundary owns the
    // conversion.
    const idx = parseInt(sceneMatch[1], 10) - 1;
    const span = sceneSpans[idx];
    return span
      ? { anchor: 'scene', startLine: span.startLine, endLine: span.endLine }
      : { anchor: 'document' };
  }

  // Scene RANGES, checked after the single-scene form so a location that
  // already resolved before this lane resolves to the identical span now.
  // Each is still the 'scene' tier — see the module doc comment.
  const rangeMatch = SCENE_RANGE_RE.exec(location);
  if (rangeMatch) {
    const span = spanForSceneRange(
      parseInt(rangeMatch[1], 10) - 1,
      parseInt(rangeMatch[2], 10) - 1,
      sceneSpans,
    );
    if (span) return { anchor: 'scene', ...span };
    return { anchor: 'document' };
  }

  const openMatch = SCENE_OPEN_RE.exec(location);
  if (openMatch) {
    const span = spanForSceneRange(
      parseInt(openMatch[1], 10) - 1,
      sceneSpans.length - 1,
      sceneSpans,
    );
    if (span) return { anchor: 'scene', ...span };
    return { anchor: 'document' };
  }

  const approxMatch = SCENE_APPROX_RE.exec(location);
  if (approxMatch) {
    const idx = parseInt(approxMatch[1], 10) - 1;
    const span = sceneSpans[idx];
    return span
      ? { anchor: 'scene', startLine: span.startLine, endLine: span.endLine }
      : { anchor: 'document' };
  }

  const zoneMatch = ZONE_PERCENT_RE.exec(location);
  if (zoneMatch) {
    const zone = zoneSpanIndices(
      parseInt(zoneMatch[1], 10),
      parseInt(zoneMatch[2], 10),
      sceneSpans.length,
    );
    if (zone) {
      return {
        anchor: 'scene',
        startLine: sceneSpans[zone.firstIdx].startLine,
        endLine: sceneSpans[zone.lastIdx].endLine,
      };
    }
    return { anchor: 'document' };
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
