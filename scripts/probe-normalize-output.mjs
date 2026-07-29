import fs from 'node:fs';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';

function countTypes(blocks) {
  const t = {};
  for (const b of blocks) t[b.type] = (t[b.type]||0)+1;
  return t;
}

const broken = [
  'data/screenplays/crawl/crime/the-corruptor.fountain',
  'data/screenplays/crawl/horror/true-romance-html.fountain',
  'data/screenplays/crawl/action/legionnaire.fountain',
  'data/screenplays/crawl/war/rushmore.fountain',
  'data/screenplays/crawl/action/elf.fountain',
];

for (const f of broken) {
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
