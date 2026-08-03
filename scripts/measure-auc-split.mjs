// SPLIT-AWARE DISCRIMINATION AUC HARNESS — measures the doctor health score's
// pairwise AUC on a SPECIFIC partition (train/val/test) of the held-out split.
//
// ── Why this exists ────────────────────────────────────────────────────────
// measure-discrimination-auc.mjs measures on the WHOLE corpus. Once a held-out
// split exists (scripts/output/corpus-split.json), iteration discipline requires
// measuring on TRAIN during development, VAL for checkpoint, and TEST exactly
// once at the end. This harness takes a --partition flag to filter.
//
// ── Run ────────────────────────────────────────────────────────────────────
//   node scripts/measure-auc-split.mjs --partition train
//   node scripts/measure-auc-split.mjs --partition val
//   node scripts/measure-auc-split.mjs --partition test   # ONCE, at the end
// Output: stdout table + scripts/output/discrimination-auc-<partition>.csv

// Safety: this harness used to write
// scripts/output/discrimination-auc-<partition>.csv unconditionally, and
// read each split entry's file with no existence check — so running it
// against the local sample-only data/screenplays/ (instead of the full
// private corpus) either crashed with a raw ENOENT on the first missing
// file, or (if enough files happened to resolve) silently shrank the
// committed evidence file (see scripts/lib/output-guard.mjs header for the
// incident this guards against). Missing per-file reads are now skipped
// with a count reported at the end, and the final write refuses to shrink
// the committed CSV by more than half, unless --force is passed.
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';
import { requireCorpus, guardedWrite } from './lib/output-guard.mjs';

const SRC_DIR = 'data/screenplays';
const OUT_DIR = 'scripts/output';
const SPLIT_FILE = path.join(OUT_DIR, 'corpus-split.json');

// Parse --partition flag (default: val, the checkpoint partition)
const arg = process.argv.find(a => a.startsWith('--partition='));
const PARTITION = arg ? arg.split('=')[1] : 'val';
if (!['train', 'val', 'test'].includes(PARTITION)) {
  console.error(`Invalid partition "${PARTITION}". Use --partition=train|val|test`);
  process.exit(1);
}

const split = JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8'));
const files = split[PARTITION].map(s => s.file);
requireCorpus(files.length, {
  label: `${PARTITION} partition of ${SPLIT_FILE}`,
  hint: 'Run scripts/split-corpus.mjs first, or pick a different --partition.',
});

if (PARTITION === 'test') {
  // Verify the test set hash matches the lock — guards against silent test-set drift
  const crypto = await import('node:crypto');
  const testManifest = split.test.map(t => {
    const stat = fs.statSync(path.join(SRC_DIR, t.file));
    return `${t.file}:${stat.size}`;
  }).sort().join('\n');
  const currentHash = crypto.createHash('sha256').update(testManifest).digest('hex');
  const lockedHash = fs.readFileSync(path.join(OUT_DIR, 'corpus-test-hash.txt'), 'utf-8').trim();
  if (currentHash !== lockedHash) {
    console.error(`TEST SET HASH MISMATCH!\n  locked:  ${lockedHash}\n  current: ${currentHash}\n  The test set has changed since it was locked. Aborting.`);
    process.exit(1);
  }
  console.log(`Test set hash verified: ${currentHash.slice(0, 16)}...\n`);
}

console.log(`=== DISCRIMINATION AUC — partition: ${PARTITION} (${files.length} scripts) ===`);

// ── Bootstrap utilities (same as measure-discrimination-auc.mjs) ────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pairwiseAuc(pairs) {
  if (pairs.length === 0) return NaN;
  let correct = 0;
  for (const { real, degraded } of pairs) {
    if (real > degraded) correct += 1;
    else if (real === degraded) correct += 0.5;
  }
  return correct / pairs.length;
}
function bootstrapCi(pairs, iterations = 10000, seed = 42) {
  if (pairs.length === 0) return { lo: NaN, hi: NaN };
  const rng = mulberry32(seed);
  const n = pairs.length;
  const aucs = new Float64Array(iterations);
  for (let i = 0; i < iterations; i++) {
    const resample = [];
    for (let j = 0; j < n; j++) resample.push(pairs[Math.floor(rng() * n)]);
    aucs[i] = pairwiseAuc(resample);
  }
  const sorted = Array.from(aucs).sort((a, b) => a - b);
  return { lo: sorted[Math.floor(0.025 * iterations)], hi: sorted[Math.floor(0.975 * iterations)] };
}

// ── Degradations ───────────────────────────────────────────────────────────
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
  for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
  return reassemble(preamble, sh);
}
function degradeMidpointDrop(text) {
  const { preamble, scenes } = segmentScenes(text);
  const n = scenes.length;
  if (n < 5) return null;
  return reassemble(preamble, scenes.slice(0, Math.floor(n * 0.4)).concat(scenes.slice(Math.floor(n * 0.6))));
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
  { id: 'SCENE_SHUFFLE', fn: degradeShuffle },
  { id: 'MIDPOINT_DROP', fn: degradeMidpointDrop },
  { id: 'CLIMAX_RELOCATE', fn: degradeClimaxRelocate },
  { id: 'DIALOGUE_FLATTEN', fn: degradeDialogueFlatten },
];

// ── Main ───────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
const ctx = { theme: '', genre: '', directorStyle: '', characters: [] };
const pairsByDeg = {};
for (const d of DEGRADATIONS) pairsByDeg[d.id] = [];
const csvRows = [];
let missingLocally = 0;

for (const file of files) {
  let text;
  try { text = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8'); }
  catch { missingLocally++; continue; } // corpus text not present locally (expected outside a maintainer's machine)
  let baseRep;
  try { baseRep = await runScriptDoctor(text, ctx, 'quick'); }
  catch { continue; }
  if (!baseRep.sceneCount || baseRep.sceneCount < 5) continue;
  for (const d of DEGRADATIONS) {
    const degradedText = d.fn(text);
    if (degradedText === null) continue;
    let rep;
    try { rep = await runScriptDoctor(degradedText, ctx, 'quick'); }
    catch { continue; }
    pairsByDeg[d.id].push({ real: baseRep.health, degraded: rep.health, file });
    csvRows.push([file, d.id, baseRep.health, rep.health, +(rep.health - baseRep.health).toFixed(1)].join(','));
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log('\ndegradation            | pairs |   AUC   |  95% CI          | gate (>=0.80)');
console.log('-----------------------|-------|---------|------------------|----------------');
for (const d of DEGRADATIONS) {
  const pairs = pairsByDeg[d.id];
  if (pairs.length === 0) { console.log(`${d.id.padEnd(22)} |     0 |    n/a  |  n/a             | n/a`); continue; }
  const auc = pairwiseAuc(pairs);
  const ci = bootstrapCi(pairs);
  const gate = auc >= 0.80 && ci.lo > 0.65 ? 'PASS' : auc >= 0.70 ? 'partial' : auc >= 0.60 ? 'weak' : 'FAIL';
  console.log(`${d.id.padEnd(22)} | ${String(pairs.length).padStart(5)} | ${auc.toFixed(3).padStart(7)} | [${ci.lo.toFixed(3)}, ${ci.hi.toFixed(3)}] | ${gate}`);
}
const allPairs = Object.values(pairsByDeg).flat();
if (allPairs.length > 0) {
  const auc = pairwiseAuc(allPairs);
  const ci = bootstrapCi(allPairs);
  console.log('-----------------------|-------|---------|------------------|----------------');
  console.log(`${'ALL POOLED'.padEnd(22)} | ${String(allPairs.length).padStart(5)} | ${auc.toFixed(3).padStart(7)} | [${ci.lo.toFixed(3)}, ${ci.hi.toFixed(3)}] | ${auc >= 0.80 && ci.lo > 0.65 ? 'PASS' : auc >= 0.70 ? 'partial' : 'FAIL'}`);
}

if (missingLocally > 0) {
  console.log(`\n${missingLocally}/${files.length} ${PARTITION}-partition file(s) not found under ${SRC_DIR} (expected outside a maintainer's machine) — skipped.`);
}

const header = 'file,degradation,realHealth,degradedHealth,delta';
const OUT_FILE = path.join(OUT_DIR, `discrimination-auc-${PARTITION}.csv`);
guardedWrite(OUT_FILE, header + '\n' + csvRows.join('\n') + '\n', { rowCount: csvRows.length, label: OUT_FILE });

if (PARTITION === 'test') {
  console.log('\n⚠  TEST SET EVALUATED. Per pre-registration protocol, this is the FINAL');
  console.log('evaluation. Do not re-run after further formula changes without documenting');
  console.log('a deviation in PRE_REGISTRATION_PROTOCOL.md §9.');
}
