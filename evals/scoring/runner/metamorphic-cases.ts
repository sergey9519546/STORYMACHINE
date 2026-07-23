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
    s = (s * 1103515245 + 12345) & 0x7fffffff;
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
];

export const HARD_CASE_IDS = new Set(
  METAMORPHIC_CASES.filter(c => c.disposition === 'hard').map(c => c.id),
);

export const KNOWN_FAILING_CASE_IDS = new Set(
  METAMORPHIC_CASES.filter(c => c.disposition === 'known-failing').map(c => c.id),
);
