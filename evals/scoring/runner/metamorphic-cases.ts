import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { MetamorphicCase } from '../contracts/scoring-eval-case.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// ── stapled_shorts: the length-pathology witness (2026-09-07) ───────────────
// MEASURED MOTIVATION, on `main` @ 9b199b72: each of the twelve CC0 shorts
// below scores 71.2-78.3 and every one of them reads CONSIDER; the twelve
// stapled end to end — no throughline, twelve protagonists, 55 characters,
// no act structure — scores 86.5 and reads RECOMMEND. Nothing about the
// assembly is better writing than its best part; the only variable that moved
// is length. Decomposed against the health formula on that tree, the whole of
// the +8.2 is the scarcity term (scarcityPenalty 11.667 at 12 scenes vs 1.007
// at 139), NOT the density term (densityPenalty 9.987 vs 10.000, i.e. both
// pinned at the same ceiling). That decomposition is why this witness is
// worth its own case: no change confined to densityPenalty can move it.
//
// THE TWELVE ARE FIXED BY NAME, not globbed, so that adding a screenplay to
// data/screenplays/ can never silently change what this witness measures.
// Their licence is data/screenplays/LICENSE-live-action.md (CC0).
export const STAPLED_SHORT_NAMES = [
  'chain-of-custody', 'close-quarters', 'code-blue', 'counter-offer',
  'dead-frequency', 'high-voltage', 'mise', 'off-season',
  'quiet-season', 'red-line', 'room-12', 'runoff',
] as const;

/** The twelve part texts, read once. Exported so the case's `parts` (the
 *  comparison point) and its `transform` (the variant) are built from ONE
 *  list, never two that could drift. */
let stapledPartsCache: string[] | null = null;
export function stapledShortParts(): string[] {
  if (stapledPartsCache) return stapledPartsCache;
  const dir = path.join(REPO_ROOT, 'data/screenplays');
  const present = new Set(readdirSync(dir));
  stapledPartsCache = STAPLED_SHORT_NAMES.map((name) => {
    const file = `${name}.fountain`;
    if (!present.has(file)) {
      throw new Error(`stapled_shorts witness: data/screenplays/${file} is missing — the witness names its twelve parts explicitly and must not silently measure a different set`);
    }
    return readFileSync(path.join(dir, file), 'utf8');
  });
  return stapledPartsCache;
}

/** Everything from the first scene heading on. Concatenating whole files
 *  would bury eleven title pages mid-document, which is a formatting defect
 *  the analyzer would (rightly) flag — this witness is about LENGTH, so the
 *  concatenation must be a clean one a writer could plausibly produce. */
function sceneBodyOf(text: string): string {
  const i = text.search(/^(INT\.|EXT\.)/mi);
  return i < 0 ? text : text.slice(i);
}

/** The variant: the twelve parts' scene bodies, stapled end to end. */
export function stapledShortsText(): string {
  return stapledShortParts().map(sceneBodyOf).join('\n\n');
}

function splitScenes(t: string) {
  const parts = t.split(/^(?=INT\.|EXT\.)/mi);
  const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
  return { head, scenes: parts.filter(x => /^(INT\.|EXT\.)/i.test(x)) };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    // 32-bit-exact multiply: s approaches 2^31, and s * 1103515245 overflows
    // 2^53 (the double integer-precision limit), corrupting the low bits the
    // mask then keeps. Math.imul does the multiply in exact int32, so the LCG
    // is a true, platform-stable sequence.
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const METAMORPHIC_CASES: MetamorphicCase[] = [
  { id: 'identity', category: 'invariance', disposition: 'hard', description: 'no change → identical score',
    transform: b => b, expect: { kind: 'unchanged', epsilon: 0 },
    provenance: { author: 'phaseB', created: '2026-07-11', note: 'control' } },
  { id: 'whitespace_reflow', category: 'invariance', disposition: 'hard', description: 'double blank lines → score invariant (same words/scenes)',
    transform: b => b.replace(/\n\n/g, '\n\n\n'), expect: { kind: 'unchanged', epsilon: 0.5 },
    provenance: { author: 'phaseB', created: '2026-07-11' } },
  { id: 'rename_character', category: 'invariance', disposition: 'hard', description: 'consistent character rename → score invariant',
    transform: b => b.replace(/MARA/g, 'ELINA'), expect: { kind: 'unchanged', epsilon: 0.5 },
    provenance: { author: 'phaseB', created: '2026-07-11' } },
  { id: 'empty_verbosity', category: 'invariance', disposition: 'known-failing', description: 'append stateless filler action → health must NOT increase (§14 verbosity bias)',
    transform: b => { const { head, scenes } = splitScenes(b);
      return head + scenes.map(s => s + 'The wind continues. Nothing else happens. Time passes without event.\n\n').join(''); },
    expect: { kind: 'not_increase', epsilon: 0.5 },
    provenance: { author: 'phaseB', created: '2026-07-11', note: 'KNOWN FAILING — documented density verbosity bias; see VERBOSITY_BIAS_2026-07-11.md' } },
  { id: 'scene_shuffle', category: 'sensitivity', disposition: 'hard', description: 'seeded scene shuffle → structural damage → health must DROP',
    transform: b => { const { head, scenes } = splitScenes(b); return head + seededShuffle(scenes, 7).join(''); },
    expect: { kind: 'decrease', minDrop: 0.1 },
    provenance: { author: 'phaseB', created: '2026-07-11' } },
  { id: 'scene_reverse', category: 'sensitivity', disposition: 'hard', description: 'reverse scene order → global-arc damage → health must DROP',
    transform: b => { const { head, scenes } = splitScenes(b); return head + scenes.slice().reverse().join(''); },
    expect: { kind: 'decrease', minDrop: 0.1 },
    provenance: { author: 'phaseB', created: '2026-07-11', note: 'former act-swap blind spot; now a hard regression invariant' } },
  { id: 'scene_dup_padding', category: 'invariance', disposition: 'hard', description: 'duplicate every scene → padding → health must NOT increase',
    transform: b => { const { head, scenes } = splitScenes(b); return head + scenes.flatMap(s => [s, s]).join(''); },
    expect: { kind: 'not_increase', epsilon: 0.5 },
    provenance: { author: 'phaseB', created: '2026-07-11' } },
  // PROMOTED to `hard` 2026-09-07, per this runner's own standing instruction
  // ("flip them to HARD after confirming recalibration"). It was registered
  // known-failing and printed +8.2 on `main @ 9b199b72`; after the density
  // and scarcity changes in the same branch it measures -2.0 (best part 81.8,
  // stapled 79.8), so it now fails the build if length alone ever buys health
  // again. A known failure that quietly starts passing is how a fixed defect
  // goes unnoticed.
  { id: 'stapled_shorts', category: 'invariance', disposition: 'hard',
    description: 'twelve unrelated CC0 shorts stapled end to end → health must NOT exceed the BEST single part',
    parts: stapledShortParts,
    transform: () => stapledShortsText(),
    // epsilon 0: health is already rounded to 0.1, and the claim is an
    // inequality ("must not outscore"), not a tolerance. Measured on
    // `main` @ 9b199b72: best part 78.3 (dead-frequency, CONSIDER), stapled
    // 86.5 (RECOMMEND) — delta +8.2.
    expect: { kind: 'not_increase', epsilon: 0 },
    provenance: { author: 'scoring/feature-length-defects', created: '2026-09-07',
      note: 'Was KNOWN FAILING on main @ 9b199b72 (+8.2): the scarcity term 140/sceneCount decayed to ~0, so length alone bought ~10.7 points. Promoted to hard once scarcityPenalty saturated; see docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md' } },
];

export const HARD_CASE_IDS = new Set(
  METAMORPHIC_CASES.filter(c => c.disposition === 'hard').map(c => c.id),
);

export const KNOWN_FAILING_CASE_IDS = new Set(
  METAMORPHIC_CASES.filter(c => c.disposition === 'known-failing').map(c => c.id),
);
