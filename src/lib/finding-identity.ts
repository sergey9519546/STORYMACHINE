/**
 * Finding identity for the draft-over-draft "cleared / new" delta.
 *
 * ── The problem this exists to fix ───────────────────────────────────────────
 * E2 (2026-08-21) matched findings across two runs by the string
 * `pass::rule::location`, where `location` is the free-form English a revision
 * pass wrote (server/nvm/revision/passes/**). Roughly a third of those
 * locations are ABSOLUTE LINE NUMBERS — "Lines 40-42", "Line 88 (MARIA)",
 * "Action line 47 (12 words)". Insert one line of action in scene 1 and every
 * later line number shifts by one, so a finding nobody touched arrives with a
 * new location string, and the delta reports it as cleared AND new at the same
 * time: the "10 cleared · 9 new" noise that made the counter untrustworthy
 * after ordinary edits.
 *
 * ── What this does instead ───────────────────────────────────────────────────
 * Anchor to CONTENT where the report cheaply allows it, and keep the raw
 * location everywhere else:
 *
 *   - Every `Scene N` reference resolves to that scene's heading text.
 *   - Every `Line N` / `Lines N-M` / `Lines N, M, K` reference resolves to the
 *     heading of the scene those lines fall inside.
 *   - Anything else in the location string is left exactly as the pass wrote
 *     it — act-level, thematic and prose-pattern locations ("Action line
 *     adverbs", "Revelation distribution") carry no line numbers to begin
 *     with, so they were never the drifting half.
 *
 * A scene heading survives edits inside its scene, edits in earlier scenes,
 * and scene renumbering — it changes only when the writer rewrites the
 * slugline itself, which is a real change worth reporting.
 *
 * ── What it deliberately does NOT do ─────────────────────────────────────────
 * There is no fuzzy matching, no similarity scoring, no diffing of the
 * description text. Two findings that resolve to the same (pass, rule, place)
 * are told apart only by their ORDER within the report — the second occurrence
 * gets `#2`, the third `#3` (see {@link collectFindingIdentities}) — so a
 * scene that gains a second copy of the same note still shows up as one new
 * finding rather than being silently absorbed.
 *
 * The resolution of the whole mechanism is therefore "this rule, in this
 * place, this many times", not "this exact sentence". The delta copy in
 * ScriptDoctorPanel.tsx says so in as many words; it must keep saying so if
 * this file changes.
 *
 * ── Fallback ─────────────────────────────────────────────────────────────────
 * Scene resolution needs the Fountain text the report was computed against.
 * When that text isn't available (an older report shape, a source whose
 * converted text the client never received) or the script has no scene
 * headings at all, {@link buildFindingSceneIndex} returns null and every
 * location falls back to the raw string — exactly the pre-existing behavior,
 * line drift included. Degrading to the old behavior is the honest failure
 * mode: it is noisy, not wrong.
 */
import { parseFountain } from "./fountain.ts";

/** Scene headings of one Fountain document, in document order. */
export interface FindingSceneIndex {
  /** 1-based line number of each scene heading, ascending. */
  startLines: number[];
  /** Normalized heading text, parallel to {@link startLines}. */
  headings: string[];
}

/** Whitespace-collapsed, upper-cased heading text — so "int. bar  - night"
 *  and "INT. BAR - NIGHT" are the same place. Case folding matters because a
 *  writer fixing the capitalization of a slugline has not moved the scene. */
function normalizeHeading(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().toUpperCase();
}

/**
 * Build the scene lookup for one Fountain document. Returns null when there is
 * nothing to anchor to — no text, or a script with no scene headings — in
 * which case callers keep the raw location strings.
 */
export function buildFindingSceneIndex(
  fountain: string | null | undefined,
): FindingSceneIndex | null {
  if (!fountain || !fountain.trim()) return null;
  const startLines: number[] = [];
  const headings: string[] = [];
  for (const block of parseFountain(fountain)) {
    if (block.type !== "scene_heading") continue;
    startLines.push(block.lineNumber);
    headings.push(normalizeHeading(block.text));
  }
  return startLines.length > 0 ? { startLines, headings } : null;
}

/**
 * The pair of indexes for a two-report comparison — both, or neither.
 *
 * Mixing the two modes is the one way this can be actively WRONG rather than
 * merely noisy: if one side's identities are scene-anchored and the other's
 * are raw location strings, nothing matches, and the delta reports every
 * finding in the draft as both cleared and new. So when either side has no
 * text to anchor against, both sides fall back to raw — the old behavior,
 * applied consistently.
 */
export function pairFindingSceneIndexes(
  previousFountain: string | null | undefined,
  currentFountain: string | null | undefined,
): [FindingSceneIndex | null, FindingSceneIndex | null] {
  const previous = buildFindingSceneIndex(previousFountain);
  const current = buildFindingSceneIndex(currentFountain);
  return previous && current ? [previous, current] : [null, null];
}

/** The heading of the scene containing 1-based `line`, or null when the line
 *  sits above the first slugline (title page, an opening FADE IN:). */
function headingForLine(index: FindingSceneIndex, line: number): string | null {
  // Linear-scan from the end is fine here: this runs at most a few hundred
  // times per delta (once per reported issue), over a few hundred headings.
  for (let i = index.startLines.length - 1; i >= 0; i--) {
    if (index.startLines[i] <= line) return index.headings[i];
  }
  return null;
}

/** "Scene 3", "Scenes 4–6", "Line 88", "Lines 40-42", "Lines 12, 18, 24",
 *  "Lines ~12–40" — one alternation so a single pass over the location string
 *  can rewrite every reference without ever re-scanning text it just inserted.
 *  The number-run tails mirror the shapes the 14 passes actually emit (a
 *  range, or a comma list, or a bare number), checked against
 *  server/nvm/revision/passes/**. */
const LOCATION_REF_RE =
  /\b(Scenes?|Lines?)\s+~?(\d+)((?:\s*[-–—]\s*~?\d+)?(?:\s*,\s*~?\d+)*)/gi;

function numbersIn(text: string): number[] {
  return (text.match(/\d+/g) ?? []).map((n) => parseInt(n, 10));
}

/**
 * Rewrite one issue location so it names places instead of line numbers.
 * Returns the location unchanged when `index` is null, when it holds no
 * resolvable reference, or when a reference points outside the document —
 * the raw-location fallback described in this module's header.
 */
export function normalizeFindingLocation(
  location: string,
  index: FindingSceneIndex | null,
): string {
  if (!index) return location;
  return location.replace(
    LOCATION_REF_RE,
    (whole: string, kind: string, first: string, tail: string) => {
      const isScene = /^scenes?$/i.test(kind);
      const nums = [parseInt(first, 10), ...numbersIn(tail)];
      const places: string[] = [];
      for (const n of nums) {
        // Scene labels are 1-based ("Scene 1" is the first scene), matching
        // server/nvm/analyze/locate.ts's own decoding of the same strings.
        const place = isScene ? index.headings[n - 1] ?? null : headingForLine(index, n);
        if (place === null) return whole; // unresolvable — keep what the pass wrote
        if (places[places.length - 1] !== place) places.push(place);
      }
      return `${isScene ? "scene" : "at"}[${places.join(" + ")}]`;
    },
  );
}

/** One issue's identity: which pass raised it, which rule fired, and where —
 *  with "where" content-anchored per {@link normalizeFindingLocation}. */
export function findingIdentity(
  pass: string,
  issue: { rule: string; location: string },
  index: FindingSceneIndex | null,
): string {
  return `${pass}::${issue.rule}::${normalizeFindingLocation(issue.location, index)}`;
}

/**
 * Every finding in a report, as a set of identities. Repeats of the same
 * identity within one report are disambiguated by their order of appearance
 * ("…#2", "…#3"), so a place that gains a second copy of the same note counts
 * as one new finding instead of vanishing into the first. Report order is
 * deterministic (pass order, then each pass's own issue order), so the same
 * report always yields the same set.
 */
export function collectFindingIdentities(
  passes: Array<{ pass: string; issues: Array<{ rule: string; location: string }> }>,
  index: FindingSceneIndex | null,
): Set<string> {
  const seen = new Map<string, number>();
  const ids = new Set<string>();
  for (const p of passes) {
    for (const issue of p.issues) {
      const base = findingIdentity(p.pass, issue, index);
      const nth = (seen.get(base) ?? 0) + 1;
      seen.set(base, nth);
      ids.add(nth === 1 ? base : `${base}#${nth}`);
    }
  }
  return ids;
}

/** Plain set difference in both directions — no weighting, no severity
 *  ranking, nothing the label over the number could misdescribe. */
export function diffFindingIdentities(
  prev: Set<string>,
  curr: Set<string>,
): { cleared: number; added: number } {
  let cleared = 0;
  for (const id of prev) if (!curr.has(id)) cleared++;
  let added = 0;
  for (const id of curr) if (!prev.has(id)) added++;
  return { cleared, added };
}
