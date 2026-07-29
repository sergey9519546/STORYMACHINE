import fs from 'node:fs';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';

const files = [
  'data/screenplays/crawl/action/13-days.fountain',
  'data/screenplays/crawl/action/15-minutes.fountain',
];
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
