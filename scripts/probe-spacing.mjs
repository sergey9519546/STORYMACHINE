// Blank-line spacing heuristic for any fountain file(s): reports what
// fraction of non-blank lines are immediately followed by a blank line
// (double-spaced-script detection).
//
// De-identification note: this originally hardcoded 2 specific corpus paths.
// It now takes files as CLI arguments instead of hardcoding titles, which
// also makes it reusable against any fountain file.
//
// Usage:
//   node scripts/probe-spacing.mjs <file1.fountain> [file2.fountain ...]
import fs from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/probe-spacing.mjs <file1.fountain> [file2.fountain ...]');
  console.error('Reports the fraction of non-blank lines immediately followed by a blank line.');
  process.exit(1);
}

for (const f of files) {
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
