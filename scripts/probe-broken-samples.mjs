// Sample any file(s) to understand WHY dialogue isn't being detected.
//
// De-identification note: this originally hardcoded 4 specific corpus paths
// (a diagnostic aid while investigating dialogue-detection gaps that fed into
// the canonical Fountain formatter). It now takes file paths as CLI arguments
// instead — that removes the corpus titles from source control AND makes the
// probe reusable against any file, not just the four it was written for.
//
// Usage:
//   node scripts/probe-broken-samples.mjs <file1.fountain> [file2.fountain ...]
import fs from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/probe-broken-samples.mjs <file1.fountain> [file2.fountain ...]');
  console.error('Samples each given file to show why a character-cue candidate is/isn\'t found near dialogue.');
  process.exit(1);
}

for (const f of files) {
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
