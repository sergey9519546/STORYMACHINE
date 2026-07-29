// POSITIONAL SIGNAL PROBE — fixed version using analysis.records (the correct
// field name). Measures whether positional signals (quartile intensity delta,
// peak position fraction, arc health, reagan fit) separate under SHUFFLE,
// DROP, and RELOCATE degradations.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { computeEmotionalArc } from '../server/nvm/analyze/emotional-arc.ts';

const split = JSON.parse(fs.readFileSync('scripts/output/corpus-split.json', 'utf-8'));
const SAMPLE = split.train.map(s => s.file).slice(0, 40);

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function segmentScenes(blocks) {
  const scenes = [];
  let cur = [];
  for (const b of blocks) {
    cur.push(b);
    if (b.type === 'scene_heading' && cur.length > 1) { scenes.push(cur); cur = [b]; }
  }
  if (cur.length) scenes.push(cur);
  return scenes;
}

function shuffleScenes(text) {
  const blocks = parseFountain(normalizeScreenplay(text));
  const scenes = segmentScenes(blocks);
  if (scenes.length < 3) return null;
  const rng = mulberry32(42);
  for (let i = scenes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
  }
  return scenes.flat().map(b => b.text).join('\n');
}
function dropMidpoint(text) {
  const blocks = parseFountain(normalizeScreenplay(text));
  const scenes = segmentScenes(blocks);
  if (scenes.length < 10) return null;
  const mid = Math.floor(scenes.length / 2);
  const drop = Math.max(1, Math.floor(scenes.length * 0.2));
  scenes.splice(mid - Math.floor(drop / 2), drop);
  return scenes.flat().map(b => b.text).join('\n');
}
function relocateClimax(text) {
  const blocks = parseFountain(normalizeScreenplay(text));
  const scenes = segmentScenes(blocks);
  if (scenes.length < 5) return null;
  const last = scenes.pop();
  scenes.splice(1, 0, last);
  return scenes.flat().map(b => b.text).join('\n');
}

const DEGRADATIONS = [
  { id: 'SHUFFLE', fn: shuffleScenes },
  { id: 'DROP', fn: dropMidpoint },
  { id: 'RELOCATE', fn: relocateClimax },
];

function extractPositionalSignals(text) {
  const sig = {};
  try {
    const a = analyzeFountainText(text);
    const recs = a.records;
    if (recs.length < 4) return sig;
    const intensities = recs.map(r => (r.suspenseDelta ?? 0) + (r.curiosityDelta ?? 0));
    const n = recs.length;
    const qSize = Math.max(1, Math.floor(n / 4));
    const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const q1 = avg(intensities.slice(0, qSize));
    const q4 = avg(intensities.slice(n - qSize));
    sig.quartileIntensityDelta = q4 - q1;
    sig.q1avg = q1;
    sig.q4avg = q4;

    let maxIdx = 0, maxVal = -Infinity;
    for (let i = 0; i < intensities.length; i++) {
      if (intensities[i] > maxVal) { maxVal = intensities[i]; maxIdx = i; }
    }
    sig.peakPositionFraction = maxIdx / Math.max(1, n - 1);

    // Climax-zone: fraction of total intensity in the final 30% of scenes
    const climaxStart = Math.floor(n * 0.7);
    const climaxIntensity = avg(intensities.slice(climaxStart));
    sig.climaxZoneIntensity = climaxIntensity;
    sig.climaxZoneFraction = avg(intensities.slice(climaxStart)) / Math.max(0.001, avg(intensities));

    // arc health + reagan fit
    try {
      const arc = computeEmotionalArc(recs);
      sig.arcHealth = arc.scored ? arc.arcHealth : null;
      sig.reaganFit = arc.scored ? arc.reaganFit : null;
      sig.rampCorrelation = arc.scored ? arc.rampCorrelation : null;
    } catch { /* skip */ }
  } catch (e) { /* skip */ }
  return sig;
}

const SIGNAL_NAMES = ['quartileIntensityDelta', 'q1avg', 'q4avg', 'peakPositionFraction',
  'climaxZoneIntensity', 'climaxZoneFraction', 'arcHealth', 'reaganFit', 'rampCorrelation'];

const results = {};
for (const d of DEGRADATIONS) results[d.id] = {};
for (const sn of SIGNAL_NAMES) for (const d of DEGRADATIONS) results[d.id][sn] = [];

let processed = 0;
for (const relFile of SAMPLE) {
  processed++;
  if (processed % 10 === 0) console.error(`  ...${processed}/${SAMPLE.length}`);
  const fullPath = path.join('data/screenplays', relFile);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const realSig = extractPositionalSignals(raw);

  for (const d of DEGRADATIONS) {
    const degradedText = d.fn(raw);
    if (!degradedText) continue;
    const degSig = extractPositionalSignals(degradedText);
    for (const sn of SIGNAL_NAMES) {
      const r = realSig[sn];
      const dg = degSig[sn];
      if (r == null || dg == null || isNaN(r) || isNaN(dg)) continue;
      results[d.id][sn].push({ real: r, degraded: dg, delta: dg - r });
    }
  }
}

console.log('\n=== POSITIONAL SIGNAL SEPARATION (40 train scripts) ===\n');
for (const d of DEGRADATIONS) {
  console.log(`\n--- ${d.id} ---`);
  console.log(`${'signal'.padEnd(28)} ${'meanΔ'.padStart(8)} ${'medΔ'.padStart(8)} ${'%changed'.padStart(8)} ${'sepAUC'.padStart(7)}`);
  for (const sn of SIGNAL_NAMES) {
    const arr = results[d.id][sn];
    if (arr.length < 5) { console.log(`${sn.padEnd(28)} (n=${arr.length})`); continue; }
    const meanDelta = arr.reduce((s, x) => s + x.delta, 0) / arr.length;
    const sorted = [...arr].sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
    const medDelta = sorted[Math.floor(sorted.length / 2)].delta;
    const changed = arr.filter(x => Math.abs(x.delta) > 0.01).length;
    const sepAuc = (changed / arr.length).toFixed(2);
    console.log(`${sn.padEnd(28)} ${meanDelta.toFixed(3).padStart(8)} ${medDelta.toFixed(3).padStart(8)} ${(changed+'/'+arr.length).padStart(8)} ${sepAuc.padStart(7)}`);
  }
}
