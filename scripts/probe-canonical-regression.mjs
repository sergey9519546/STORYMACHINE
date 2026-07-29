// REGRESSION CHECK — run formatCanonicalFountain on EVERY crawl file and
// confirm it never REDUCES the structural score (never regresses). This is
// the safety guarantee: the formatter either helps or is a no-op.
import fs from 'node:fs';
import path from 'node:path';
import { formatCanonicalFountain } from '../server/nvm/analyze/canonical-fountain.ts';
import { parseFountain } from '../src/lib/fountain.ts';

function gather(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) gather(f, out);
    else out.push(f);
  }
  return out;
}

function counts(text) {
  const blocks = parseFountain(text);
  const c = { character: 0, dialogue: 0, scene_heading: 0, action: 0 };
  for (const b of blocks) if (b.type in c) c[b.type]++;
  return c;
}
function score(c) { return c.character * 2 + c.dialogue * 2 + c.scene_heading; }

const files = gather('data/screenplays/crawl').sort();
let improved = 0, unchanged = 0, regressed = 0;
const regressions = [];
const methods = {};

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf-8');
  const rawScore = score(counts(raw));
  const { text, method } = formatCanonicalFountain(raw);
  const newScore = score(counts(text));
  methods[method] = (methods[method] || 0) + 1;
  if (newScore > rawScore) improved++;
  else if (newScore === rawScore) unchanged++;
  else { regressed++; regressions.push({ f, rawScore, newScore, method }); }
}

console.log(`=== REGRESSION CHECK on ${files.length} crawl files ===`);
console.log(`Improved:   ${improved}`);
console.log(`Unchanged:  ${unchanged}`);
console.log(`Regressed:  ${regressed}  ← MUST be 0`);
console.log('');
console.log('Methods used:');
for (const [m, c] of Object.entries(methods).sort((a, b) => b[1] - a[1])) console.log(`  ${m}: ${c}`);
if (regressions.length > 0) {
  console.log('');
  console.log('REGRESSIONS:');
  for (const r of regressions.slice(0, 20)) {
    console.log(`  ${r.f.split(/[\\/]/).slice(-2).join('/')}  ${r.rawScore}→${r.newScore} (${r.method})`);
  }
}
