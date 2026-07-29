import fs from 'node:fs';
import { formatCanonicalFountain } from '../server/nvm/analyze/canonical-fountain.ts';

const broken = [
  'data/screenplays/crawl/crime/the-corruptor.fountain',
  'data/screenplays/crawl/horror/true-romance-html.fountain',
  'data/screenplays/crawl/action/legionnaire.fountain',
  'data/screenplays/crawl/war/rushmore.fountain',
  'data/screenplays/crawl/action/elf.fountain',
];

console.log('=== FORMAT CANONICAL FOUNTAIN — broken-file test ===');
for (const f of broken) {
  const raw = fs.readFileSync(f, 'utf-8');
  const { text, method, before, after } = formatCanonicalFountain(raw);
  const name = f.split(/[\\/]/).slice(-2).join('/');
  console.log('');
  console.log(`FILE: ${name}`);
  console.log(`METHOD: ${method}`);
  console.log(`BEFORE: char=${before.character || 0} dial=${before.dialogue || 0} scene=${before.scene_heading || 0} action=${before.action || 0}`);
  console.log(`AFTER:  char=${after.character || 0} dial=${after.dialogue || 0} scene=${after.scene_heading || 0} action=${after.action || 0}`);
  console.log(`First 400 chars of output:`);
  console.log(JSON.stringify(text.substring(0, 400)));
}
