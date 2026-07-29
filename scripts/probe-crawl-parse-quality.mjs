// PARSE QUALITY AUDIT — score EVERY crawl file twice (raw parseFountain vs
// normalized) and find files where dialogue is being missed. This identifies
// files that NEED reformatting, vs files that already parse cleanly.
import fs from 'node:fs';
import path from 'node:path';
import { parseFountain } from '../src/lib/fountain.ts';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';

function gather(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) gather(f, out);
    else out.push(f);
  }
  return out;
}

const crawlFiles = gather('data/screenplays/crawl').sort();
console.log(`Auditing ${crawlFiles.length} crawl files...`);

function countTypes(blocks) {
  const t = {};
  for (const b of blocks) t[b.type] = (t[b.type]||0)+1;
  return t;
}

const results = [];
let needsNormalize = 0;
let brokenDialogue = 0;
let noDialogue = 0;

for (const f of crawlFiles) {
  const raw = fs.readFileSync(f, 'utf-8');
  const normalized = normalizeScreenplay(raw);
  const changed = raw !== normalized;
  if (changed) needsNormalize++;

  const rawTypes = countTypes(parseFountain(raw));
  const normTypes = changed ? countTypes(parseFountain(normalized)) : rawTypes;

  const name = f.split(/[\\/]/).slice(-2).join('/');
  const charCount = rawTypes.character || 0;
  const dialCount = rawTypes.dialogue || 0;
  const sceneCount = rawTypes.scene_heading || 0;
  const actionCount = rawTypes.action || 0;

  // Flags
  const flags = [];
  if (changed) flags.push('needsNormalize');
  if (charCount === 0 && dialCount === 0 && actionCount > 50) { flags.push('NO-DIALOGUE'); noDialogue++; }
  // Dialogue should be roughly proportional to character cues
  if (charCount > 0 && dialCount < charCount * 0.3) { flags.push('dialogue<30%ofCues'); brokenDialogue++; }

  results.push({ name, sceneCount, charCount, dialCount, actionCount, changed, flags });
}

// Summary
console.log('');
console.log('=== SUMMARY ===');
console.log(`Total files:                   ${crawlFiles.length}`);
console.log(`Files normalizeScreenplay changes: ${needsNormalize} (${(needsNormalize/crawlFiles.length*100).toFixed(1)}%)`);
console.log(`Files with NO dialogue detected:   ${noDialogue}`);
console.log(`Files with dialogue < 30% of cues: ${brokenDialogue}`);
console.log('');

// Show files with problems
const problems = results.filter(r => r.flags.length > 0);
if (problems.length === 0) {
  console.log('NO PROBLEM FILES — every crawl file parses cleanly with proper dialogue detection.');
} else {
  console.log(`=== ${problems.length} PROBLEM FILES ===`);
  for (const r of problems.slice(0, 30)) {
    console.log(`  [${r.flags.join(',')}]  ${r.name}  scenes=${r.sceneCount} cues=${r.charCount} dial=${r.dialCount} action=${r.actionCount}`);
  }
  if (problems.length > 30) console.log(`  ... and ${problems.length - 30} more`);
}

// Aggregate stats on healthy files
const healthy = results.filter(r => r.flags.length === 0);
if (healthy.length > 0) {
  const cueRatio = healthy.map(r => r.dialCount / Math.max(1, r.charCount)).sort((a,b)=>a-b);
  console.log('');
  console.log('=== HEALTHY FILES dialogue/cue ratio ===');
  console.log(`  min: ${cueRatio[0].toFixed(2)}  | median: ${cueRatio[Math.floor(cueRatio.length/2)].toFixed(2)}  | max: ${cueRatio[cueRatio.length-1].toFixed(2)}`);
}
