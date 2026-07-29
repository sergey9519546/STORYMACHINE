// Sample each broken file to understand WHY dialogue isn't being detected.
import fs from 'node:fs';

const broken = [
  'data/screenplays/crawl/action/elf.fountain',           // NO-DIALOGUE
  'data/screenplays/crawl/war/rushmore.fountain',         // NO-DIALOGUE
  'data/screenplays/crawl/crime/the-corruptor.fountain',  // needsNormalize + NO-DIALOGUE
  'data/screenplays/crawl/action/legionnaire.fountain',   // needsNormalize
];

for (const f of broken) {
  const text = fs.readFileSync(f, 'utf-8');
  console.log('========================================');
  console.log('FILE:', f.split(/[\\/]/).slice(-2).join('/'));
  // Show middle section where dialogue would appear
  const lines = text.split('\n');
  // Find a line that looks like a character cue
  let cueIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    // All-caps short line
    if (/^[A-Z][A-Z .,'&\-]{2,25}$/.test(t) && t.split(/\s+/).length <= 4) { cueIdx = i; break; }
  }
  if (cueIdx === -1) {
    console.log('No candidate character cue found in entire file.');
    console.log('First 2000 chars:');
    console.log(JSON.stringify(text.substring(0, 2000)));
  } else {
    console.log(`Sample around cue at line ${cueIdx + 1}:`);
    const start = Math.max(0, cueIdx - 2);
    const end = Math.min(lines.length, cueIdx + 8);
    for (let i = start; i < end; i++) {
      const mark = i === cueIdx ? '>>' : '  ';
      console.log(`${mark} [${i+1}] ${JSON.stringify(lines[i])}`);
    }
  }
  console.log('');
}
