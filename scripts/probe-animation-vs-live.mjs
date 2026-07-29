// ANIMATION VS LIVE-ACTION DIALOGUE DELTA — confirm the hypothesis that the
// previous 0.906 dialogue AUC was an artifact of the animation-heavy corpus.
// Animation scripts have dense dialogue (many short scenes, many characters);
// live-action features have proportionally more action. We compare the
// DIALOGUE_FLATTEN delta distribution across the two groups.
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';

const split = JSON.parse(fs.readFileSync('scripts/output/corpus-split.json', 'utf-8'));
const files = split.train.map(s => s.file);

function flattenDialogue(normalized) {
  const blocks = parseFountain(normalized);
  const out = [];
  for (const b of blocks) {
    if (b.type === 'dialogue' || b.type === 'parenthetical') out.push('Hello.');
    else out.push(b.text);
  }
  return out.join('\n');
}

// Classify: files in data/screenplays/ root (not crawl/) are the original
// animation-heavy corpus. Files in crawl/ are mostly live-action.
const ctx = { theme: '', genre: '', directorStyle: '', characters: [] };
const animationDeltas = [];
const liveDeltas = [];

let processed = 0;
for (const relFile of files) {
  processed++;
  if (processed % 50 === 0) console.error(`  ...${processed}/${files.length}`);
  const fullPath = path.join('data/screenplays', relFile);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const normalized = normalizeScreenplay(raw);
  const degraded = flattenDialogue(normalized);

  let realRep, degRep;
  try {
    realRep = await runScriptDoctor(raw, ctx, 'quick');
    degRep = await runScriptDoctor(degraded, ctx, 'quick');
  } catch { continue; }
  const delta = realRep.health - degRep.health;

  // Classify: root-level files (no subdirectory) are original animation corpus
  const isCrawl = relFile.startsWith('crawl/');
  if (isCrawl) liveDeltas.push(delta);
  else animationDeltas.push(delta);
}

function stats(arr, label) {
  if (arr.length === 0) return;
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((s, d) => s + d, 0) / arr.length;
  const inversions = arr.filter(d => d < 0).length;
  const nearZero = arr.filter(d => Math.abs(d) < 2).length;
  // Approximate AUC: fraction of pairs where delta > 0, ties = 0.5
  const positive = arr.filter(d => d > 0).length;
  const tied = arr.filter(d => d === 0).length;
  const auc = (positive + tied * 0.5) / arr.length;
  console.log(`=== ${label} (n=${arr.length}) ===`);
  console.log(`  mean delta: ${mean.toFixed(2)}`);
  console.log(`  median delta: ${sorted[Math.floor(sorted.length / 2)].toFixed(2)}`);
  console.log(`  inversions (delta<0): ${inversions} (${(inversions / arr.length * 100).toFixed(0)}%)`);
  console.log(`  near-zero (|delta|<2): ${nearZero} (${(nearZero / arr.length * 100).toFixed(0)}%)`);
  console.log(`  approximate AUC (delta>0 fraction): ${auc.toFixed(3)}`);
  console.log('');
}

stats(animationDeltas, 'ORIGINAL CORPUS (animation-heavy, root-level)');
stats(liveDeltas, 'CRAWL CORPUS (live-action, crawl/)');
