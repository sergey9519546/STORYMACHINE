// Inspection tool for normalizeScreenplay(): like probe-normalize-check.mjs,
// but additionally dumps normalized output text when normalization changed
// nothing, and runs a blank-line-spacing heuristic on that "unchanged" case
// to help diagnose why normalization didn't fire.
//
// De-identification note: this originally hardcoded a fixed list of 5
// "broken" corpus paths from the canonical-formatter investigation. It now
// takes files as CLI arguments instead of hardcoding titles.
//
// This overlaps substantially with probe-normalize-check.mjs (same imports,
// same countTypes helper); it is kept as a separate tool because of the
// extra spacing-ratio fallback diagnostic below, which normalize-check does
// not have. If that distinction stops mattering, the two are candidates for
// a future merge — not done here since neither script was asked to be
// consolidated and each remains independently useful.
//
// Usage:
//   node scripts/probe-normalize-output.mjs <file1.fountain> [file2.fountain ...]
import fs from 'node:fs';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';

function countTypes(blocks) {
  const t = {};
  for (const b of blocks) t[b.type] = (t[b.type]||0)+1;
  return t;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/probe-normalize-output.mjs <file1.fountain> [file2.fountain ...]');
  console.error('Runs normalizeScreenplay() on each file; if unchanged, also reports a blank-line spacing ratio.');
  process.exit(1);
}

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf-8');
  const norm = normalizeScreenplay(raw);
  const changed = raw !== norm;
  const r = countTypes(parseFountain(raw));
  const n = countTypes(parseFountain(norm));

  const name = f.split(/[\\/]/).slice(-2).join('/');
  console.log('===', name, '===');
  console.log('changed:', changed);
  console.log('RAW:  char=' + (r.character||0) + ' dial=' + (r.dialogue||0) + ' act=' + (r.action||0) + ' scene=' + (r.scene_heading||0));
  console.log('NORM: char=' + (n.character||0) + ' dial=' + (n.dialogue||0) + ' act=' + (n.action||0) + ' scene=' + (n.scene_heading||0));
  if (changed) {
    console.log('NORM first 800 chars:');
    console.log(JSON.stringify(norm.substring(0, 800)));
  } else {
    console.log('NOT CHANGED — checking if double-spaced:');
    const lines = raw.replace(/\r\n?/g,'\n').split('\n');
    let nonBlank = 0, followedByBlank = 0;
    for (let i = 0; i < lines.length-1; i++) {
      if (lines[i].trim()==='') continue;
      nonBlank++;
      if (lines[i+1].trim()==='') followedByBlank++;
    }
    console.log(`  nonBlank=${nonBlank} followedByBlank=${followedByBlank} ratio=${nonBlank>0?(followedByBlank/nonBlank).toFixed(3):'n/a'}`);
  }
  console.log('');
}
