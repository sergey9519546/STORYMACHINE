// Inspection tool for normalizeScreenplay(): shows whether normalization
// changed a file's text, and the block-type counts parseFountain() finds
// before vs. after normalization.
//
// De-identification note: this originally hardcoded 2 specific corpus paths.
// It now takes files as CLI arguments instead of hardcoding titles, which
// also makes it reusable against any fountain file.
//
// Usage:
//   node scripts/probe-normalize-check.mjs <file1.fountain> [file2.fountain ...]
import fs from 'node:fs';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/probe-normalize-check.mjs <file1.fountain> [file2.fountain ...]');
  console.error('Runs normalizeScreenplay() on each file and compares parseFountain() block counts before/after.');
  process.exit(1);
}

function countTypes(blocks) {
  const t = {};
  for (const b of blocks) t[b.type] = (t[b.type]||0)+1;
  return t;
}
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf-8');
  const normalized = normalizeScreenplay(raw);
  const changed = raw !== normalized;

  const rawBlocks = parseFountain(raw);
  const normBlocks = parseFountain(normalized);
  const r = countTypes(rawBlocks);
  const n = countTypes(normBlocks);

  const name = f.split(/[\\/]/).pop();
  console.log('===', name, '===');
  console.log('normalizeScreenplay changed the text:', changed);
  console.log('RAW  parse:  character=' + (r.character||0) + ' dialogue=' + (r.dialogue||0) + ' action=' + (r.action||0) + ' scene_heading=' + (r.scene_heading||0));
  console.log('NORM parse:  character=' + (n.character||0) + ' dialogue=' + (n.dialogue||0) + ' action=' + (n.action||0) + ' scene_heading=' + (n.scene_heading||0));
  console.log('');
}
