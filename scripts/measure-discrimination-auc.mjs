// DISCRIMINATION AUC HARNESS (P1 baseline) — measures the doctor health
// score's ability to rank a real produced screenplay above its own
// mechanically degraded twin.
//
// ── Why this exists ────────────────────────────────────────────────────────
// ROADMAP P1's exit gate requires AUC >= 0.80 (with 95% CI lower bound
// > 0.65) on a held-out, human-labeled real-writing benchmark. That
// benchmark needs 3+ blind readers labeling 100-200 scripts — human work
// this harness cannot do alone.
//
// What this harness CAN do is establish the *mechanical-ground-truth*
// baseline: for each real script, degrade it in a controlled, reversible
// way no reasonable reader would dispute makes it worse, and ask whether
// the score ranks the original above the twin. Pairwise AUC (fraction of
// pairs where health(real) > health(degraded)) is the simplest rigorous
// discrimination metric on balanced pairs, and bootstrap resampling over
// pairs gives a defensible 95% CI.
//
// This is the same discrimination question the human-labeled benchmark
// will answer, just measured against mechanical labels instead of human
// judgment. The mechanical baseline is a LOWER BOUND on what human labels
// would show if humans agree that degraded = worse (which they do, by
// construction). If the score can't separate real from degraded, it
// cannot be expected to separate strong from weak human writing.
//
// ── Run ────────────────────────────────────────────────────────────────────
//   node scripts/measure-discrimination-auc.mjs
// Output: scripts/output/discrimination-auc.csv + stdout table.

// Safety: this harness used to write scripts/output/discrimination-auc.csv
// unconditionally, so running it against the local sample-only
// data/screenplays/ (instead of the full private corpus) silently shrank
// the committed evidence file (see scripts/lib/output-guard.mjs header for
// the incident this guards against). It now refuses to run against a
// missing/empty corpus dir and refuses to shrink the committed CSV by more
// than half, unless --force is passed.
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';
import { requireCorpus, guardedWrite } from './lib/output-guard.mjs';

const SRC_DIR = 'data/screenplays';
const OUT_DIR = 'scripts/output';
const OUT_FILE = path.join(OUT_DIR, 'discrimination-auc.csv');

// ── Bootstrap utilities ────────────────────────────────────────────────────
// Mulberry32 seeded PRNG for reproducible resamples.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pairwise AUC: fraction of pairs where realScore > degradedScore.
 *  Ties count as 0.5 (the standard convention for balanced pairs). */
function pairwiseAuc(pairs) {
  if (pairs.length === 0) return NaN;
  let correct = 0;
  for (const { real, degraded } of pairs) {
    if (real > degraded) correct += 1;
    else if (real === degraded) correct += 0.5;
  }
  return correct / pairs.length;
}

/** 95% bootstrap CI over pairs (resample pairs with replacement, 10000x). */
function bootstrapCi(pairs, iterations = 10000, seed = 42) {
  if (pairs.length === 0) return { lo: NaN, hi: NaN };
  const rng = mulberry32(seed);
  const n = pairs.length;
  const aucSamples = new Float64Array(iterations);
  for (let i = 0; i < iterations; i++) {
    const resample = [];
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(rng() * n);
      resample.push(pairs[idx]);
    }
    aucSamples[i] = pairwiseAuc(resample);
  }
  // percentile method
  const sorted = Array.from(aucSamples).sort((a, b) => a - b);
  const loIdx = Math.floor(0.025 * iterations);
  const hiIdx = Math.floor(0.975 * iterations);
  return { lo: sorted[loIdx], hi: sorted[hiIdx] };
}

// ── Degradations (same set as paired-discrimination) ──────────────────────
const HEADING_RE = /^(INT\.|EXT\.|EST\.|INT\/EXT\.)/;
const DOT_RE = /^\./;

function segmentScenes(text) {
  const lines = text.split(/\r?\n/);
  const scenes = []; let cur = null; let preamble = [];
  for (const line of lines) {
    const t = line.trim();
    if (HEADING_RE.test(t) || DOT_RE.test(t)) {
      if (cur) scenes.push(cur);
      cur = { heading: line, body: [] };
    } else if (cur) cur.body.push(line);
    else preamble.push(line);
  }
  if (cur) scenes.push(cur);
  return { preamble, scenes };
}
function reassemble(preamble, scenes) {
  const out = [...preamble];
  for (const s of scenes) { out.push(s.heading); out.push(...s.body); }
  return out.join('\n');
}
function degradeShuffle(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return null;
  const rng = mulberry32(42);
  const sh = scenes.slice();
  for (let i = sh.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [sh[i], sh[j]] = [sh[j], sh[i]];
  }
  return reassemble(preamble, sh);
}
function degradeMidpointDrop(text) {
  const { preamble, scenes } = segmentScenes(text);
  const n = scenes.length;
  if (n < 5) return null;
  const start = Math.floor(n * 0.4), end = Math.floor(n * 0.6);
  return reassemble(preamble, scenes.slice(0, start).concat(scenes.slice(end)));
}
function degradeClimaxRelocate(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return null;
  const last = scenes.pop();
  scenes.splice(1, 0, last);
  return reassemble(preamble, scenes);
}
function degradeDialogueFlatten(text) {
  const normalized = normalizeScreenplay(text);
  const blocks = parseFountain(normalized);
  if (blocks.length === 0) return null;
  const dl = new Set(blocks.filter(b => b.type === 'dialogue' || b.type === 'parenthetical').map(b => b.lineNumber));
  return normalized.split(/\r?\n/).map((l, i) => dl.has(i + 1) ? 'Hello.' : l).join('\n');
}

const DEGRADATIONS = [
  { id: 'SCENE_SHUFFLE', fn: degradeShuffle, channel: 'global arc / position' },
  { id: 'MIDPOINT_DROP', fn: degradeMidpointDrop, channel: '3-act structure' },
  { id: 'CLIMAX_RELOCATE', fn: degradeClimaxRelocate, channel: 'climax ordering' },
  { id: 'DIALOGUE_FLATTEN', fn: degradeDialogueFlatten, channel: 'character/voice/dialogue' },
];

// ── Main ───────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
const ctx = { theme: '', genre: '', directorStyle: '', characters: [] };

if (!fs.existsSync(SRC_DIR)) {
  console.error(`ERROR: ${SRC_DIR} does not exist — refusing to run.`);
  console.error('This harness requires the private research corpus locally (see MEASUREMENT_RUNBOOK.md). Nothing was written.');
  process.exit(1);
}
const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.fountain') || f.endsWith('.fountain.txt')).sort();
requireCorpus(files.length, {
  label: `${SRC_DIR} (.fountain/.fountain.txt files)`,
  hint: 'This harness requires the private research corpus locally (see MEASUREMENT_RUNBOOK.md).',
});

// Collect pairs per degradation: { real: health, degraded: health, file }
const pairsByDeg = {};
for (const d of DEGRADATIONS) pairsByDeg[d.id] = [];

const csvRows = [];
let skipped = 0;

for (const file of files) {
  const text = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');
  let baseRep;
  try {
    baseRep = await runScriptDoctor(text, ctx, 'quick');
  } catch (e) {
    skipped++;
    continue;
  }
  // Skip parse-broken scripts (scene-count collapse)
  if (!baseRep.sceneCount || baseRep.sceneCount < 5) { skipped++; continue; }
  const realHealth = baseRep.health;

  for (const d of DEGRADATIONS) {
    const degradedText = d.fn(text);
    if (degradedText === null) continue;
    let rep;
    try {
      rep = await runScriptDoctor(degradedText, ctx, 'quick');
    } catch (e) {
      continue;
    }
    pairsByDeg[d.id].push({ real: realHealth, degraded: rep.health, file });
    csvRows.push([file, d.id, realHealth, rep.health,
      +(rep.health - realHealth).toFixed(1)].join(','));
  }
}

// ── Report ────────────────────────────────────────────────────────────────
console.log('=== DISCRIMINATION AUC (mechanical ground truth) ===');
console.log(`Scripts scored: ${files.length - skipped} valid, ${skipped} skipped (parse-broken)`);
console.log('');
console.log('Per-degradation pairwise AUC (real > degraded = correct):');
console.log('');
console.log('degradation            | pairs |   AUC   |  95% CI          | P1 gate (>=0.80)');
console.log('-----------------------|-------|---------|------------------|----------------');

let overallCorrect = 0, overallTotal = 0;
for (const d of DEGRADATIONS) {
  const pairs = pairsByDeg[d.id];
  if (pairs.length === 0) {
    console.log(`${d.id.padEnd(22)} |     0 |    n/a  |  n/a             | n/a`);
    continue;
  }
  const auc = pairwiseAuc(pairs);
  const ci = bootstrapCi(pairs);
  overallCorrect += pairs.filter(p => p.real > p.degraded).length + pairs.filter(p => p.real === p.degraded).length * 0.5;
  overallTotal += pairs.length;
  const gate = auc >= 0.80 && ci.lo > 0.65 ? 'PASS' :
               auc >= 0.70 ? 'partial' :
               auc >= 0.60 ? 'weak' : 'FAIL';
  console.log(
    `${d.id.padEnd(22)} | ${String(pairs.length).padStart(5)} | ${auc.toFixed(3).padStart(7)} | [${ci.lo.toFixed(3)}, ${ci.hi.toFixed(3)}] | ${gate}`
  );
}

// Overall (all degradations pooled)
const allPairs = Object.values(pairsByDeg).flat();
const overallAuc = pairwiseAuc(allPairs);
const overallCi = bootstrapCi(allPairs);
console.log('-----------------------|-------|---------|------------------|----------------');
console.log(
  `${'ALL POOLED'.padEnd(22)} | ${String(allPairs.length).padStart(5)} | ${overallAuc.toFixed(3).padStart(7)} | [${overallCi.lo.toFixed(3)}, ${overallCi.hi.toFixed(3)}] | ${overallAuc >= 0.80 && overallCi.lo > 0.65 ? 'PASS' : overallAuc >= 0.70 ? 'partial' : overallAuc >= 0.60 ? 'weak' : 'FAIL'}`
);

console.log('');
console.log('=== INTERPRETATION ===');
console.log('This is the mechanical-ground-truth baseline. The P1 gate requires');
console.log('these numbers on HUMAN-labeled real writing. Mechanical degradation');
console.log('is a proxy: if the score cannot separate real from degraded, it');
console.log('cannot be expected to separate strong from weak human writing.');
console.log('');
console.log('DIALOGUE_FLATTEN AUC is the expected strongest channel (probe 2');
console.log('showed mean -15.3 health drop). The structural degradations');
console.log('(SHUFFLE/DROP/RELOCATE) are expected to show weaker or near-chance');
console.log('AUC, confirming the document-scale structure blindness that P1\'s');
console.log('bounded structural-deduction pathway is meant to close.');

const header = 'file,degradation,realHealth,degradedHealth,delta';
guardedWrite(OUT_FILE, header + '\n' + csvRows.join('\n') + '\n', { rowCount: csvRows.length });
