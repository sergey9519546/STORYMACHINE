import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { MetamorphicCase } from '../contracts/scoring-eval-case.ts';
import { parseFountain } from '../../../src/lib/fountain.ts';

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

/** The variant: the twelve parts' scene bodies, stapled end to end in the
 *  canonical (STAPLED_SHORT_NAMES, i.e. alphabetical) order. This is the
 *  member of the ordering set that gets printed; the ASSERTION is over the
 *  whole set — see stapledShortsOrderings. */
export function stapledShortsText(): string {
  return stapledShortParts().map(sceneBodyOf).join('\n\n');
}

// ── ORDERING-FREE (2026-09-11, round 2 item 1) ──────────────────────────────
// The first version of this witness stapled the twelve in ONE order and
// asserted the result against the best part. The independent review showed
// that this pinned a favourable arrangement rather than testing the property:
// on the round-1 tree, reordering the SAME twelve files made the invariant
// fail in 7 of 14 measured orderings (alphabetical -2.0 PASS, reversed +0.6
// FAIL, twelve mulberry32 permutations 79.1-82.5 against a best part of 81.8
// — a 3.4-point order-sensitivity against a 2.0-point margin). The witness
// now asserts the MAXIMUM over the whole ordering set, so the claim it makes
// is the claim it tests.
//
// THE SET IS THE REVIEWER'S OWN, reproduced here so the numbers in
// docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md are re-runnable: the
// canonical (alphabetical) order, the reverse of it, and twelve mulberry32
// Fisher-Yates permutations seeded 1..12. mulberry32 is the PRNG the
// repository already uses for seeded degradation
// (scripts/lib/rebuild-experiment-lib.mjs); it is replicated here rather than
// imported because this file is a pure .ts eval contract with no dependency
// on the scripts/ harness, and a 6-line PRNG copy whose output is pinned by
// the assertion below is cheaper than that coupling. The seeds are fixed, so
// the set is the same on every machine and in every run.
const STAPLE_ORDERING_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function permute<T>(arr: readonly T[], seed: number): T[] {
  const a = arr.slice();
  const rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Every ordering the witness is asserted over: 14 stapled documents built
 *  from the SAME twelve scene bodies, differing only in the order they are
 *  concatenated in. Identical scene count (139) and word count (11,412) in
 *  every one of them, by construction — the only thing that varies is order,
 *  which is what makes this a clean test of "length, not arrangement, is what
 *  must not buy health". */
export function stapledShortsOrderings(): string[] {
  const bodies = stapledShortParts().map(sceneBodyOf);
  const orderings: string[][] = [bodies, bodies.slice().reverse()];
  for (const seed of STAPLE_ORDERING_SEEDS) orderings.push(permute(bodies, seed));
  return orderings.map(o => o.join('\n\n'));
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

/** Re-wrap DIALOGUE lines at `cols`, using the repository's own parser to decide
 *  which lines those are — the same transform tests/core/parse-format-invariance.test.ts
 *  applies to all 32 committed scripts, written once here for the runner. No
 *  blank line is introduced and no word changes. */
export function reflowDialogueAt(text: string, cols: number): string {
  const typeByLine = new Map<number, string>();
  for (const b of parseFountain(text)) typeByLine.set(b.lineNumber, b.type);
  const lines = text.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (typeByLine.get(i + 1) !== 'dialogue' || line.trim().length <= cols) { out.push(line); continue; }
    const words = line.trim().split(/\s+/);
    let cur = '';
    for (const w of words) {
      if (cur === '') cur = w;
      else if ((cur + ' ' + w).length <= cols) cur += ' ' + w;
      else { out.push(cur); cur = w; }
    }
    if (cur !== '') out.push(cur);
  }
  return out.join('\n');
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
  // ── dialogue_reflow (2026-09-12, adversarial review finding 4) ────────────
  // A Fountain dialogue element runs from its character cue to the next blank
  // line. Wrapping a long speech across three lines is what every editor does
  // and changes not one word — but until 2026-09-12 the parser classified every
  // line of a speech after the first as ACTION PROSE, and the pipeline was
  // handed the raw text while the analyzer read a normalised one. Measured on
  // the 32 committed benchmark scripts at 30/35/40/60 columns: 119 of 128
  // (script, width) pairs moved, range -8.8 to +5.0, against a shuffle-drop
  // mean gap of 1.9 points on the same corpus. epsilon is 0 because this is
  // format, not writing: the assertion is equality.
  { id: 'dialogue_reflow', category: 'invariance', disposition: 'hard',
    description: 'wrap every speech at 35 columns → score identical (same words, same speakers, same order)',
    transform: b => reflowDialogueAt(b, 35), expect: { kind: 'unchanged', epsilon: 0 },
    provenance: { author: 'scoring/adversarial-2026-09-12', created: '2026-09-12',
      note: 'engine-logic.md finding 4; the per-script assertion set is tests/core/parse-format-invariance.test.ts' } },
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
  // known-failing and printed +8.2 on `main @ 9b199b72`.
  //
  // WHAT IT ASSERTS, and what it does NOT (corrected 2026-09-11, round 2
  // item 1 — the first version of this comment claimed the witness "fails
  // the build if length alone ever buys health again", which was not true).
  //
  // IT ASSERTS: no ordering in `stapledShortsOrderings()` — 14 documents with
  // identical scene and word counts, differing only in the order the twelve
  // bodies are concatenated — outscores the best single part. Measured on the
  // round-1 tree that claim was FALSE for 7 of the 14 (range 79.1-82.5
  // against a best part of 81.8); it is true now, by 1.6 to 5.0 points, after
  // the scarcity saturation point moved from 15 scenes to 12. The reason it
  // is now robust rather than marginal is decomposed in
  // docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md §8.3: at a saturation
  // point of 12 the scarcity term contributes EXACTLY ZERO to this
  // comparison (140/min(139,12) = 140/min(12,12)), so the margin is the
  // staple's own density disadvantage plus its feature-scale deductions,
  // neither of which length can buy.
  //
  // IT DOES NOT ASSERT that length can never buy health. The scarcity term is
  // still decreasing below the saturation point, so a staple whose best part
  // has FEWER than 12 scenes would still collect the difference — for a
  // 9-scene best part that is 140/9 - 140/12 = 3.89 points. The general
  // statement the formula now supports is narrower and exact: scene count
  // buys nothing at or above 12 scenes, and the residue available to a staple
  // is exactly `140/min(bestPartScenes, 12) - 140/12`, which is zero if and
  // only if the best part is itself at or past the saturation point. That
  // arithmetic is pinned independently in tests/core/script-doctor.test.ts.
  { id: 'stapled_shorts', category: 'invariance', disposition: 'hard',
    description: 'twelve unrelated CC0 shorts stapled end to end, in ANY of 14 seeded orderings → health must NOT exceed the BEST single part',
    parts: stapledShortParts,
    transform: () => stapledShortsText(),
    variants: stapledShortsOrderings,
    // epsilon 0: health is already rounded to 0.1, and the claim is an
    // inequality ("must not outscore"), not a tolerance. Measured on
    // `main` @ 9b199b72: best part 78.3 (dead-frequency, CONSIDER), stapled
    // 86.5 (RECOMMEND) — delta +8.2, and every ordering failed there, by
    // +5.8 to +10.7.
    expect: { kind: 'not_increase', epsilon: 0 },
    provenance: { author: 'scoring/feature-length-defects', created: '2026-09-07',
      note: 'Was KNOWN FAILING on main @ 9b199b72 (+8.2): the scarcity term 140/sceneCount decayed to ~0, so length alone bought ~10.7 points. Promoted to hard once scarcityPenalty saturated, and made ordering-free on 2026-09-11 after an independent review showed the single-ordering version passing by less than its own order-sensitivity; see docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md §8.3' } },
];

export const HARD_CASE_IDS = new Set(
  METAMORPHIC_CASES.filter(c => c.disposition === 'hard').map(c => c.id),
);

export const KNOWN_FAILING_CASE_IDS = new Set(
  METAMORPHIC_CASES.filter(c => c.disposition === 'known-failing').map(c => c.id),
);
