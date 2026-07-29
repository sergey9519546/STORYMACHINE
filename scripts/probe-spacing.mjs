import fs from 'node:fs';
for (const f of ['data/screenplays/crawl/war/rushmore.fountain', 'data/screenplays/crawl/action/elf.fountain']) {
  const text = fs.readFileSync(f, 'utf-8');
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let nonBlank = 0, followedByBlank = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() === '') continue;
    nonBlank++;
    if (lines[i + 1].trim() === '') followedByBlank++;
  }
  const name = f.split(/[\\/]/).pop();
  const ratio = nonBlank > 0 ? (followedByBlank / nonBlank).toFixed(3) : 'n/a';
  const blanks = lines.filter(l => l.trim() === '').length;
  console.log(`${name}: nonBlank=${nonBlank} followedByBlank=${followedByBlank} ratio=${ratio}`);
  console.log(`  total lines: ${lines.length} | blank lines: ${blanks}`);
}
