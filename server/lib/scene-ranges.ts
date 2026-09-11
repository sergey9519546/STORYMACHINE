// One wording for "which scenes is this finding in" — the only scene-list
// formatter any surface is allowed to use.
//
// ── Why this exists (2026-09-11, producer-tier discovery) ───────────────────
//
// A RootCauseFinding carries `sceneIdxs: number[]` (server/nvm/analyze/
// types.ts) — every scene the cluster's member issues actually touch, 0-based.
// Three surfaces rendered that array, three different ways, each by joining
// EVERY index:
//
//   server/lib/coverage-html.ts   `Scene 1, Scene 2, Scene 3, …`
//   server/lib/coverage-letter.ts ` (Scenes 1, 2, 3, …)`
//   ScriptDoctorPanel.tsx         `scenes 1, 2, 3, …`
//
// On short form that is three wordings for one fact. On a real draft it is
// also unreadable: measured on tests/fixtures/feature-length/
// assembled-feature.fountain (231 scenes, 899 issues), the widest finding
// spans 116 scenes, and the coverage HTML rendered that as a 1,231-character
// run of "Scene N, " — one paragraph of punctuation where a reader needed one
// phrase. The product-discovery report named a 342-character, 36-number
// parenthetical; the real worst case is three and a half times that.
//
// The fix is not truncation (nothing is dropped here) but RUN COLLAPSING: a
// contiguous stretch of scenes is one fact about one stretch, so it is stated
// as one range. A scattered set is genuinely scattered and stays explicit —
// collapsing 2, 5, 9 into "Scenes 2–9" would claim the seven scenes between
// them are implicated when they are not. That distinction is the whole point
// of the module: the output is shorter ONLY where shortening it is true.
//
// Pure, no I/O, no randomness. Imported by both server renderers and by the
// in-app panel (src/ already imports server/lib modules directly — see
// src/lib/story-axes.ts's import of server/lib/genre-router.ts), so all three
// cannot drift again.

/** Minimum length of a contiguous stretch before it is stated as a range.
 *
 *  THREE, not two. A pair of adjacent scenes written "Scenes 7–8" is the same
 *  length as "Scenes 7, 8" and reads as a span when it is really two scenes,
 *  so a pair stays explicit and nothing is gained or lost. At three the range
 *  is both shorter and genuinely a stretch. Measured on the feature fixture
 *  (231 scenes, 70 root causes): with MIN_RUN = 3 the longest rendered scene
 *  list falls from 1,231 characters to 14. */
const MIN_RUN_FOR_RANGE = 3;

/** EN DASH, matching the range glyph server/nvm/analyze/cluster.ts's own
 *  finding titles already use ("Recurring orphan clue trouble in Scenes
 *  1–58") — so the list under a title cannot use a different dash from the
 *  title above it. */
const RANGE_DASH = '–';

/** Collapse a set of 0-based scene indices into maximal contiguous runs,
 *  as inclusive 1-based [first, last] pairs. Input order and duplicates do
 *  not matter: the indices are sorted and de-duplicated first, because
 *  `sceneIdxs` is assembled from a Set in cluster.ts and a caller must never
 *  have to care. Negative or non-integer indices are dropped rather than
 *  rendered — a scene number below 1 is not a fact about any script. */
export function sceneRuns(sceneIdxs: readonly number[]): Array<[number, number]> {
  const clean = [...new Set(sceneIdxs)]
    .filter(n => Number.isInteger(n) && n >= 0)
    .sort((a, b) => a - b);
  const runs: Array<[number, number]> = [];
  for (const idx of clean) {
    const open = runs[runs.length - 1];
    // `clean` is sorted and de-duplicated, so the ONLY way idx continues the
    // open run is by sitting exactly one past its end (both 0-based here).
    if (open && idx === open[1] + 1) open[1] = idx;
    else runs.push([idx, idx]);
  }
  // Re-encode 0-based -> 1-based for display. Done at the end, once, so the
  // adjacency arithmetic above stays in one index base.
  return runs.map(([a, b]) => [a + 1, b + 1]);
}

/**
 * The one reader-facing scene list.
 *
 *   []             -> ''            (the caller MUST guard: see below)
 *   [0]            -> 'Scene 1'
 *   [0,1,2,…,35]   -> 'Scenes 1–36'
 *   [1,4,8]        -> 'Scenes 2, 5, 9'
 *   [0,1,2,6,7]    -> 'Scenes 1–3, 7, 8'
 *
 * Empty input returns the EMPTY STRING, never a placeholder like "no scenes":
 * a finding with no scene anchor has nothing true to say here, and every
 * caller therefore has to decide what its own surrounding punctuation does in
 * that case (the HTML report drops its em-dash separator, the letter drops its
 * parenthetical entirely, the panel drops its bullet). Returning a sentence
 * here would put that decision in the wrong place and make every surface
 * render a hollow phrase.
 */
export function formatSceneList(sceneIdxs: readonly number[]): string {
  const runs = sceneRuns(sceneIdxs);
  if (runs.length === 0) return '';

  const parts = runs.flatMap(([first, last]) => {
    const length = last - first + 1;
    if (length >= MIN_RUN_FOR_RANGE) return [`${first}${RANGE_DASH}${last}`];
    // A run shorter than the range threshold is listed scene by scene.
    const out: string[] = [];
    for (let n = first; n <= last; n++) out.push(String(n));
    return out;
  });

  // "Scene" singular only when exactly one scene is named in total — a single
  // collapsed range still covers several scenes, so "Scenes 1–3" is plural
  // even though it is one part.
  const total = runs.reduce((n, [first, last]) => n + (last - first + 1), 0);
  return `${total === 1 ? 'Scene' : 'Scenes'} ${parts.join(', ')}`;
}
