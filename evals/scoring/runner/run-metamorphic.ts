// Phase B metamorphic runner — asserts KNOWN score MOVEMENTS through the real
// doctor. Run:  node --experimental-strip-types evals/scoring/runner/run-metamorphic.ts
//
// CI contract (2026-07-14):
//   - HARD cases must pass — failure exits nonzero and fails CI.
//   - KNOWN-FAILING cases (currently empty_verbosity only) are printed as a
//     standing witness of the documented density verbosity bias; they do NOT
//     fail CI until the health formula is re-calibrated.
//   - See docs/scoring/VERBOSITY_BIAS_2026-07-11.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor } from '../../../server/nvm/analyze/doctor.ts';
import type { MetamorphicCase, MetamorphicResult } from '../contracts/scoring-eval-case.ts';
import {
  KNOWN_FAILING_CASE_IDS,
  check,
  classifyResults,
} from './metamorphic-lib.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = readFileSync(path.join(HERE, '../metamorphic/base.fountain'), 'utf8');

// ---- deterministic helpers ----
const splitScenes = (t: string) => {
  const parts = t.split(/^(?=INT\.|EXT\.)/mi);
  const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
  return { head, scenes: parts.filter(x => /^(INT\.|EXT\.)/i.test(x)) };
};
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice(); let s = seed;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const CASES: MetamorphicCase[] = [
  { id: 'identity', category: 'invariance', description: 'no change → identical score',
    transform: b => b, expect: { kind: 'unchanged', epsilon: 0 },
    provenance: { author: 'phaseB', created: '2026-07-11', note: 'control' } },
  { id: 'whitespace_reflow', category: 'invariance', description: 'double blank lines → score invariant (same words/scenes)',
    transform: b => b.replace(/\n\n/g, '\n\n\n'), expect: { kind: 'unchanged', epsilon: 0.5 },
    provenance: { author: 'phaseB', created: '2026-07-11' } },
  { id: 'rename_character', category: 'invariance', description: 'consistent character rename → score invariant',
    transform: b => b.replace(/MARA/g, 'ELINA'), expect: { kind: 'unchanged', epsilon: 0.5 },
    provenance: { author: 'phaseB', created: '2026-07-11' } },
  { id: 'empty_verbosity', category: 'invariance', description: 'append stateless filler action → health must NOT increase (§14 verbosity bias)',
    transform: b => { const { head, scenes } = splitScenes(b);
      return head + scenes.map(s => s + 'The wind continues. Nothing else happens. Time passes without event.\n\n').join(''); },
    expect: { kind: 'not_increase', epsilon: 0.5 },
    provenance: { author: 'phaseB', created: '2026-07-11', note: 'KNOWN FAILING — documented density verbosity bias; see VERBOSITY_BIAS_2026-07-11.md' } },
  { id: 'scene_shuffle', category: 'sensitivity', description: 'seeded scene shuffle → structural damage → health must DROP',
    transform: b => { const { head, scenes } = splitScenes(b); return head + seededShuffle(scenes, 7).join(''); },
    expect: { kind: 'decrease', minDrop: 0.1 },
    provenance: { author: 'phaseB', created: '2026-07-11' } },
  { id: 'scene_reverse', category: 'sensitivity', description: 'reverse scene order → global-arc damage → health must DROP',
    transform: b => { const { head, scenes } = splitScenes(b); return head + scenes.slice().reverse().join(''); },
    expect: { kind: 'decrease', minDrop: 0.1 },
    provenance: { author: 'phaseB', created: '2026-07-11', note: 'known act-swap blind spot — may not drop; that IS the finding' } },
  { id: 'scene_dup_padding', category: 'invariance', description: 'duplicate every scene → padding → health must NOT increase',
    transform: b => { const { head, scenes } = splitScenes(b); return head + scenes.flatMap(s => [s, s]).join(''); },
    expect: { kind: 'not_increase', epsilon: 0.5 },
    provenance: { author: 'phaseB', created: '2026-07-11' } },
];

const WRITE_BASELINE = process.env.METAMORPHIC_WRITE_BASELINE === '1' || process.argv.includes('--write-baseline');

const baseReport = await runScriptDoctor(BASE);
const results: MetamorphicResult[] = [];
for (const c of CASES) {
  const variant = c.transform(BASE);
  const vr = await runScriptDoctor(variant);
  const { passed, reason } = check(c, baseReport.health, vr.health);
  results.push({ id: c.id, category: c.category, baseHealth: baseReport.health, variantHealth: vr.health, delta: +(vr.health - baseReport.health).toFixed(2), passed, reason });
}

const pass = results.filter(r => r.passed).length;
const { hardFailures, knownFailures, unexpectedPasses, hardPasses } = classifyResults(results);

console.log(`\nMETAMORPHIC SUITE — base health ${baseReport.health} (${baseReport.sceneCount} scenes, verdict ${baseReport.verdict})`);
console.log('id'.padEnd(20), 'cat'.padEnd(12), 'base', ' var', '  Δ', '  result');
for (const r of results) {
  const tag = KNOWN_FAILING_CASE_IDS.has(r.id)
    ? (r.passed ? 'UNEXPECTED PASS' : 'KNOWN FAIL')
    : (r.passed ? 'PASS' : 'HARD FAIL');
  console.log(r.id.padEnd(20), r.category.padEnd(12), (''+r.baseHealth).padStart(4), (''+r.variantHealth).padStart(4), (''+r.delta).padStart(6), '  ', tag, r.passed ? '' : `(${r.reason})`);
}
console.log(`\n${pass}/${results.length} cases passed raw; hard passes ${hardPasses}; known-failing witnesses ${knownFailures.length}.`);

if (knownFailures.length > 0) {
  console.log(`KNOWN FAILING: ${knownFailures.map(r => r.id).join(', ')} (documented verbosity bias — not a CI hard fail)`);
}
if (unexpectedPasses.length > 0) {
  console.log(`NOTE: known-failing case(s) now pass: ${unexpectedPasses.map(r => r.id).join(', ')} — flip them to HARD after confirming recalibration.`);
}

if (WRITE_BASELINE) {
  const goldenDir = path.join(HERE, '../golden');
  mkdirSync(goldenDir, { recursive: true });
  writeFileSync(path.join(goldenDir, 'metamorphic-baseline.json'), JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    baseHealth: baseReport.health,
    results,
    hardFailures: hardFailures.map(r => r.id),
    knownFailures: knownFailures.map(r => r.id),
  }, null, 2));
  console.log('wrote golden/metamorphic-baseline.json');
}

if (hardFailures.length > 0) {
  console.error(`\nHARD FAIL — ${hardFailures.length} metamorphic invariant(s) broken: ${hardFailures.map(r => r.id).join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('\nHard metamorphic invariants hold.');
  process.exitCode = 0;
}
