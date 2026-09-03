import type { MetamorphicCase } from '../contracts/scoring-eval-case.ts';

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

/** The stateless filler the two padding cases append: three sentences that
 *  change no state, introduce no character, and answer no question. Shared so
 *  the "prose only" and "prose plus a scene heading" variants differ in
 *  exactly one thing — whether the filler comes with an opportunity. */
const FILLER_PARAGRAPH = 'The wind continues. Nothing else happens. Time passes without event.\n\n';

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
  { id: 'empty_verbosity', category: 'invariance', disposition: 'hard', description: 'append stateless filler action → health must NOT increase (§14 verbosity bias)',
    transform: b => { const { head, scenes } = splitScenes(b);
      return head + scenes.map(s => s + FILLER_PARAGRAPH).join(''); },
    expect: { kind: 'not_increase', epsilon: 0.5 },
    provenance: { author: 'phaseB', created: '2026-07-11', note: 'HELD known-failing 2026-07-11..2026-09-03 (measured +5.4 at the flip); FIXED by lane R5\'s scene-opportunity denominator, now measured -6.3 — see docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md' } },
  { id: 'filler_scenes', category: 'invariance', disposition: 'hard', description: 'append filler that DOES add scene headings → the opportunity it buys must not outrun the findings it draws',
    transform: b => { const { head, scenes } = splitScenes(b);
      return head + scenes.map((s, i) => s + `INT. FILLER ROOM ${i + 1} - NIGHT\n\n` + FILLER_PARAGRAPH).join(''); },
    expect: { kind: 'not_increase', epsilon: 0.5 },
    provenance: { author: 'laneR5', created: '2026-09-03', note: 'The other half of the padding invariant: empty_verbosity proves prose alone cannot buy health; this proves adding the one unit the denominator DOES read (scenes) cannot either, because filler scenes draw more findings than the scarcity relief they buy. Measured -17.0.' } },
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
];

export const HARD_CASE_IDS = new Set(
  METAMORPHIC_CASES.filter(c => c.disposition === 'hard').map(c => c.id),
);

export const KNOWN_FAILING_CASE_IDS = new Set(
  METAMORPHIC_CASES.filter(c => c.disposition === 'known-failing').map(c => c.id),
);
