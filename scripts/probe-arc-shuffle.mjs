// ARC-SHUFFLE SEPARATION — does arcHealth separate real from shuffled/dropped/
// relocated scripts? The existing arcIncoherenceDeduction uses arcHealth<1.2
// with K=8, cap=15. If arcHealth drops significantly under structural
// degradation, increasing the deduction strength could help.
import fs from 'node:fs';
import path from 'node:path';
import { computeEmotionalArc, scenesFromFountain } from '../server/nvm/analyze/emotional-arc.ts';

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
// Use the SAME segmentation as the AUC harness (text-line based)
function segmentScenes(text) {
  const lines = text.split(/\r?\n/);
  const scenes = []; let cur = null; let preamble = [];
  const HEADING_RE = /^(INT\.|EXT\.|EST\.|INT\/EXT\.)/;
  const DOT_RE = /^\./;
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
function shuffle(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return null;
  const rng = mulberry32(42);
  const sh = scenes.slice();
  for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
  return reassemble(preamble, sh);
}
function drop(text) {
  const { preamble, scenes } = segmentScenes(text);
  const n = scenes.length;
  if (n < 5) return null;
  return reassemble(preamble, scenes.slice(0, Math.floor(n * 0.4)).concat(scenes.slice(Math.floor(n * 0.6))));
}
function relocate(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return null;
  const last = scenes.pop();
  scenes.splice(1, 0, last);
  return reassemble(preamble, scenes);
}

const DEGS = [['SHUFFLE', shuffle], ['DROP', drop], ['RELOCATE', relocate]];

const results = {};
for (const [id] of DEGS) results[id] = [];

let processed = 0;
for (const relFile of SAMPLE) {
  processed++;
  if (processed % 10 === 0) console.error(`  ...${processed}/${SAMPLE.length}`);
  const raw = fs.readFileSync(path.join('data/screenplays', relFile), 'utf-8');

  const realScenes = scenesFromFountain(raw);
  const realArc = computeEmotionalArc(realScenes);
  if (!realArc.scored) continue;

  for (const [id, fn] of DEGS) {
    const degText = fn(raw);
    if (!degText) continue;
    const degScenes = scenesFromFountain(degText);
    const degArc = computeEmotionalArc(degScenes);
    if (!degArc.scored) continue;

    results[id].push({
      realArcHealth: realArc.arcHealth,
      degArcHealth: degArc.arcHealth,
      delta: degArc.arcHealth - realArc.arcHealth,
      realReagan: realArc.reaganFit,
      degReagan: degArc.reaganFit,
      reaganDelta: degArc.reaganFit - realArc.reaganFit,
    });
  }
}

console.log('\n=== ARC SIGNAL SEPARATION (40 train scripts) ===\n');
for (const [id] of DEGS) {
  const arr = results[id];
  if (arr.length < 5) { console.log(`${id}: insufficient data (${arr.length})`); continue; }
  const meanDelta = arr.reduce((s, x) => s + x.delta, 0) / arr.length;
  const meanReaganDelta = arr.reduce((s, x) => s + x.reaganDelta, 0) / arr.length;
  // AUC: fraction where realArc > degArc
  let wins = 0;
  for (const x of arr) {
    if (x.realArcHealth > x.degArcHealth) wins++;
    else if (x.realArcHealth === x.degArcHealth) wins += 0.5;
  }
  const auc = wins / arr.length;
  let reaganWins = 0;
  for (const x of arr) {
    if (x.realReagan > x.degReagan) reaganWins++;
    else if (x.realReagan === x.degReagan) reaganWins += 0.5;
  }
  const reaganAuc = reaganWins / arr.length;
  console.log(`${id} (n=${arr.length}):`);
  console.log(`  arcHealth: meanΔ=${meanDelta.toFixed(3)} AUC=${auc.toFixed(3)}`);
  console.log(`  reaganFit: meanΔ=${meanReaganDelta.toFixed(3)} AUC=${reaganAuc.toFixed(3)}`);
}
