// Regression/inspection tool for formatCanonicalFountain(): shows the
// before/after block-type counts and a text preview for any given file(s).
//
// De-identification note: this originally hardcoded 5 specific corpus paths
// used to validate the canonical Fountain formatter while it was being
// built. formatCanonicalFountain is still live (server/nvm/analyze/
// canonical-fountain.ts, part of the 14-pass pipeline), so this remains a
// useful general-purpose inspection tool — it now takes files as CLI
// arguments instead of hardcoding titles.
//
// Usage:
//   node scripts/probe-canonical-test.mjs <file1.fountain> [file2.fountain ...]
import fs from 'node:fs';
import { formatCanonicalFountain } from '../server/nvm/analyze/canonical-fountain.ts';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/probe-canonical-test.mjs <file1.fountain> [file2.fountain ...]');
  console.error('Runs formatCanonicalFountain() on each file and prints before/after block counts + a text preview.');
  process.exit(1);
}

console.log('=== FORMAT CANONICAL FOUNTAIN ===');
for (const f of files) {
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
