// SIGNAL-DELTA PROBE — empirically measures which signals CHANGE under each
// degradation, BEFORE any formula work. This is the foundation: we add
// deductions ONLY for signals that demonstrably separate real from degraded.
//
// Measures per-degradation, per-signal mean delta and separation ratio across
// a sample of train scripts. A signal is a candidate for a bounded deduction
// only if its delta is consistently large and signed in the right direction.
//
// Signals measured:
//   1. dialogueLineCount — total dialogue blocks
//   2. speakingCharacterCount — distinct speaking characters
//   3. uniqueDialogueRatio — unique dialogue lines / total (flattened → ~0)
//   4. meanDialogueWords — average words per dialogue line (flattened → 1)
//   5. dialogueVocabRichness — unique words in dialogue / total dialogue words
//   6. sceneCount — total scenes
//   7. quartileIntensityDelta — (Q4avg - Q1avg) of suspenseDelta per scene
//   8. peakPositionFraction — position of max-suspenseDelta scene / total
//   9. arcHealth — from computeEmotionalArc
//  10. health — the displayed score (baseline reference)
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { computeEmotionalArc } from '../server/nvm/analyze/emotional-arc.ts';

const split = JSON.parse(fs.readFileSync('scripts/output/corpus-split.json', 'utf-8'));
const SAMPLE = split.train.map(s => s.file).slice(0, 40);  // 40 train scripts

// ── Degradations (matching measure-auc-split.mjs) ──────────────────────────
function shuffleScenes(text) {
  const normalized = normalizeScreenplay(text);
  const blocks = parseFountain(normalized);
  const scenes = [];
  let cur = [];
  for (const b of blocks) {
    cur.push(b);
    if (b.type === 'scene_heading' && cur.length > 1) { scenes.push(cur); cur = [b]; }
  }
  if (cur.length) scenes.push(cur);
  if (scenes.length < 3) return null;
  const rng = mulberry32(42);
  for (let i = scenes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
  }
  return scenes.flat().map(b => b.text).join('\n');
}
function dropMidpoint(text) {
  const normalized = normalizeScreenplay(text);
  const blocks = parseFountain(normalized);
  const scenes = [];
  let cur = [];
  for (const b of blocks) {
    cur.push(b);
    if (b.type === 'scene_heading' && cur.length > 1) { scenes.push(cur); cur = [b]; }
  }
  if (cur.length) scenes.push(cur);
  if (scenes.length < 10) return null;
  const mid = Math.floor(scenes.length / 2);
  const drop = Math.max(1, Math.floor(scenes.length * 0.2));
  scenes.splice(mid - Math.floor(drop / 2), drop);
  return scenes.flat().map(b => b.text).join('\n');
}
function relocateClimax(text) {
  const normalized = normalizeScreenplay(text);
  const blocks = parseFountain(normalized);
  const scenes = [];
  let cur = [];
  for (const b of blocks) {
    cur.push(b);
    if (b.type === 'scene_heading' && cur.length > 1) { scenes.push(cur); cur = [b]; }
  }
  if (cur.length) scenes.push(cur);
  if (scenes.length < 5) return null;
  const last = scenes.pop();
  scenes.splice(1, 0, last);
  return scenes.flat().map(b => b.text).join('\n');
}
function flattenDialogue(text) {
  const normalized = normalizeScreenplay(text);
  const blocks = parseFountain(normalized);
  return blocks.map(b =>
    (b.type === 'dialogue' || b.type === 'parenthetical') ? 'Hello.' : b.text
  ).join('\n');
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEGRADATIONS = [
  { id: 'SHUFFLE', fn: shuffleScenes },
  { id: 'DROP', fn: dropMidpoint },
  { id: 'RELOCATE', fn: relocateClimax },
  { id: 'FLATTEN', fn: flattenDialogue },
];

// ── Signal extractors ─────────────────────────────────────────────────────
function extractSignals(text) {
  const sig = {};
  try {
    const a = analyzeFountainText(text);
    sig.sceneCount = a.sceneCount ?? 0;
    sig.dialogueLineCount = a.dialogueLineCount ?? 0;

    // Dialogue diversity signals
    const blocks = parseFountain(normalizeScreenplay(text));
    const dialogueLines = blocks.filter(b => b.type === 'dialogue').map(b => b.text.trim()).filter(Boolean);
    const totalDialogueWords = dialogueLines.join(' ').split(/\s+/).filter(Boolean).length;
    const uniqueLines = new Set(dialogueLines.map(l => l.toLowerCase()));
    sig.uniqueDialogueRatio = dialogueLines.length > 0 ? uniqueLines.size / dialogueLines.length : 1;
    sig.meanDialogueWords = dialogueLines.length > 0 ? totalDialogueWords / dialogueLines.length : 0;
    const uniqueWords = new Set(dialogueLines.join(' ').toLowerCase().split(/\s+/).filter(Boolean));
    sig.dialogueVocabRichness = totalDialogueWords > 0 ? uniqueWords.size / totalDialogueWords : 1;

    // Positional signals — quartile intensity + peak position
    if (a.sceneRecords && a.sceneRecords.length >= 4) {
      const recs = a.sceneRecords;
      const n = recs.length;
      const intensities = recs.map(r => (r.suspenseDelta ?? 0) + (r.curiosityDelta ?? 0));
      const qSize = Math.floor(n / 4);
      const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
      const q1 = avg(intensities.slice(0, qSize));
      const q4 = avg(intensities.slice(n - qSize));
      sig.quartileIntensityDelta = q4 - q1;
      // Peak position
      let maxIdx = 0, maxVal = -Infinity;
      for (let i = 0; i < intensities.length; i++) {
        if (intensities[i] > maxVal) { maxVal = intensities[i]; maxIdx = i; }
      }
      sig.peakPositionFraction = maxIdx / Math.max(1, n - 1);
    }

    // Arc health
    try {
      const arc = computeEmotionalArc(recs_scenesFromText(text));
      sig.arcHealth = arc.scored ? arc.arcHealth : null;
      sig.reaganFit = arc.scored ? arc.reaganFit : null;
    } catch { sig.arcHealth = null; sig.reaganFit = null; }
  } catch (e) {
    // analysis failed
  }
  return sig;
}

// Helper: get scene records from text for arc computation
function recs_scenesFromText(text) {
  try {
    const a = analyzeFountainText(text);
    return a.sceneRecords ?? [];
  } catch { return []; }
}

// ── Main: measure signal deltas ───────────────────────────────────────────
console.log(`Measuring signal deltas on ${SAMPLE.length} train scripts...`);
const ctx = { theme: '', genre: '', directorStyle: '', characters: [] };

const SIGNAL_NAMES = ['sceneCount', 'dialogueLineCount', 'uniqueDialogueRatio', 'meanDialogueWords',
  'dialogueVocabRichness', 'quartileIntensityDelta', 'peakPositionFraction', 'arcHealth', 'reaganFit', 'health'];

// results[degradationId][signalName] = array of {real, degraded, delta}
const results = {};
for (const d of DEGRADATIONS) results[d.id] = {};
for (const sn of SIGNAL_NAMES) for (const d of DEGRADATIONS) results[d.id][sn] = [];

let processed = 0;
for (const relFile of SAMPLE) {
  processed++;
  if (processed % 10 === 0) console.error(`  ...${processed}/${SAMPLE.length}`);
  const fullPath = path.join('data/screenplays', relFile);
  const raw = fs.readFileSync(fullPath, 'utf-8');

  // Real signals
  const realSig = extractSignals(raw);
  let realRep;
  try { realRep = await runScriptDoctor(raw, ctx, 'quick'); } catch { continue; }
  realSig.health = realRep.health;

  for (const d of DEGRADATIONS) {
    const degradedText = d.fn(raw);
    if (!degradedText) continue;
    const degSig = extractSignals(degradedText);
    let degRep;
    try { degRep = await runScriptDoctor(degradedText, ctx, 'quick'); } catch { continue; }
    degSig.health = degRep.health;

    for (const sn of SIGNAL_NAMES) {
      const r = realSig[sn];
      const dg = degSig[sn];
      if (r == null || dg == null || isNaN(r) || isNaN(dg)) continue;
      results[d.id][sn].push({ real: r, degraded: dg, delta: dg - r });
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────
console.log('\n=== SIGNAL SEPARATION ANALYSIS ===\n');
console.log('For each degradation × signal: mean |delta|, % scripts with |delta|>threshold, separation AUC\n');

for (const d of DEGRADATIONS) {
  console.log(`\n--- ${d.id} ---`);
  console.log(`${'signal'.padEnd(28)} ${'meanΔ'.padStart(8)} ${'medΔ'.padStart(8)} ${'%big'.padStart(6)} ${'sepAUC'.padStart(7)}`);
  for (const sn of SIGNAL_NAMES) {
    const arr = results[d.id][sn];
    if (arr.length < 5) { console.log(`${sn.padEnd(28)} (insufficient data: ${arr.length})`); continue; }
    const meanDelta = arr.reduce((s, x) => s + x.delta, 0) / arr.length;
    const sorted = [...arr].sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
    const medDelta = sorted[Math.floor(sorted.length / 2)].delta;
    const bigCount = arr.filter(x => Math.abs(x.delta) > 0.01).length;
    const bigPct = (bigCount / arr.length * 100).toFixed(0);
    // Separation AUC: fraction where real != degraded (any direction), weighted by magnitude
    const separated = arr.filter(x => Math.abs(x.delta) > 0.01).length;
    const sepAuc = (separated / arr.length).toFixed(2);
    console.log(`${sn.padEnd(28)} ${meanDelta.toFixed(3).padStart(8)} ${medDelta.toFixed(3).padStart(8)} ${(bigPct + '%').padStart(6)} ${sepAuc.padStart(7)}`);
  }
}
