// CRAWL SCORING SANITY CHECK — run runScriptDoctor on every crawl script and
// report health/verdict/sceneCount distribution. Flags any degenerate scores
// (health 0, sceneCount < 5, or extreme outliers) that would corrupt the AUC.
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';

function gather(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) gather(f, out);
    else if (f.includes('/crawl/') || f.includes('\\crawl\\')) out.push(f);
  }
  return out;
}

const crawlFiles = gather('data/screenplays/crawl');
console.log(`Scoring ${crawlFiles.length} crawl scripts...`);

const results = [];
let errors = 0;
for (const f of crawlFiles) {
  try {
    const text = fs.readFileSync(f, 'utf-8');
    const report = runScriptDoctor(text, { format: 'auto' });
    results.push({
      file: path.basename(f),
      health: report.health,
      verdict: report.verdict,
      sceneCount: report.sceneCount,
      wordCount: report.wordCount,
    });
  } catch (e) {
    errors++;
    results.push({ file: path.basename(f), health: null, verdict: 'ERROR', sceneCount: 0, wordCount: 0, error: e.message });
  }
}

const healths = results.map(r => r.health).filter(h => h != null).sort((a, b) => a - b);
const scenes = results.map(r => r.sceneCount).sort((a, b) => a - b);
const words = results.map(r => r.wordCount).sort((a, b) => a - b);

console.log('');
console.log('=== HEALTH SCORE DISTRIBUTION ===');
console.log(`  errors:     ${errors}`);
console.log(`  min:        ${healths[0]}`);
console.log(`  p25:        ${healths[Math.floor(healths.length * 0.25)]}`);
console.log(`  median:     ${healths[Math.floor(healths.length / 2)]}`);
console.log(`  p75:        ${healths[Math.floor(healths.length * 0.75)]}`);
console.log(`  max:        ${healths[healths.length - 1]}`);
console.log(`  health==0:  ${healths.filter(h => h === 0).length}`);
console.log(`  health<10:  ${healths.filter(h => h < 10).length}`);
console.log(`  health<20:  ${healths.filter(h => h < 20).length}`);

console.log('');
console.log('=== SCENE COUNT DISTRIBUTION ===');
console.log(`  min: ${scenes[0]}  | median: ${scenes[Math.floor(scenes.length / 2)]}  | max: ${scenes[scenes.length - 1]}`);
console.log(`  <5 scenes: ${scenes.filter(s => s < 5).length} (degenerate)`);
console.log(`  >500 scenes: ${scenes.filter(s => s > 500).length} (suspicious — possible parse error)`);

console.log('');
console.log('=== WORD COUNT DISTRIBUTION ===');
console.log(`  min: ${words[0]}  | median: ${words[Math.floor(words.length / 2)]}  | max: ${words[words.length - 1]}`);
console.log(`  <1000 words: ${words.filter(w => w < 1000).length} (degenerate)`);

// Worst 10 by health
console.log('');
console.log('=== WORST 10 BY HEALTH (look for false-positive parsing) ===');
const sorted = [...results].sort((a, b) => (a.health ?? -1) - (b.health ?? -1));
for (const r of sorted.slice(0, 10)) {
  console.log(`  health=${String(r.health).padStart(3)} scenes=${String(r.sceneCount).padStart(4)} words=${String(r.wordCount).padStart(6)}  ${r.file}`);
}

// Verdict distribution
const verdicts = {};
for (const r of results) verdicts[r.verdict] = (verdicts[r.verdict] || 0) + 1;
console.log('');
console.log('=== VERDICT DISTRIBUTION ===');
for (const [v, c] of Object.entries(verdicts).sort((a, b) => b[1] - a[1])) console.log(`  ${v}: ${c}`);
