// DIALOGUE_FLATTEN DELTA CHECK — verify the degradation is actually changing
// health scores on the expanded corpus. If the delta is near-zero on many
// scripts, the AUC 0.567 is real (dialogue doesn't matter at feature scale on
// live-action scripts). If the delta is large but the AUC is still low, there's
// a methodology bug.
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';

const split = JSON.parse(fs.readFileSync('scripts/output/corpus-split.json', 'utf-8'));
const files = split.train.map(s => s.file).slice(0, 50);  // sample 50 train scripts

function flattenDialogue(normalized) {
  const blocks = parseFountain(normalized);
  const out = [];
  for (const b of blocks) {
    if (b.type === 'dialogue' || b.type === 'parenthetical') {
      out.push('Hello.');
    } else {
      out.push(b.text);
    }
  }
  return out.join('\n');
}

const deltas = [];
const ctx = { theme: '', genre: '', directorStyle: '', characters: [] };
for (const relFile of files) {
  const fullPath = path.join('data/screenplays', relFile);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const normalized = normalizeScreenplay(raw);
  const degraded = flattenDialogue(normalized);

  const realReport = await runScriptDoctor(raw, ctx, 'quick');
  const degReport = await runScriptDoctor(degraded, ctx, 'quick');
  const delta = realReport.health - degReport.health;
  deltas.push({ file: relFile, realHealth: realReport.health, degHealth: degReport.health, delta, sceneCount: realReport.sceneCount });
}

// Sort by delta
deltas.sort((a, b) => a.delta - b.delta);

console.log('=== DIALOGUE_FLATTEN HEALTH DELTA (50 sample train scripts) ===');
console.log('');
console.log('WORST 10 (degraded scored HIGHER than real — inversion):');
for (const d of deltas.slice(0, 10)) {
  console.log(`  Δ=${String(d.delta).padStart(5)}  real=${String(d.realHealth).padStart(3)} deg=${String(d.degHealth).padStart(3)}  scenes=${String(d.sceneCount).padStart(4)}  ${d.file.split('/').pop()}`);
}
console.log('');
console.log('BEST 10 (real scored much higher than degraded):');
for (const d of deltas.slice(-10).reverse()) {
  console.log(`  Δ=${String(d.delta).padStart(5)}  real=${String(d.realHealth).padStart(3)} deg=${String(d.degHealth).padStart(3)}  scenes=${String(d.sceneCount).padStart(4)}  ${d.file.split('/').pop()}`);
}
console.log('');

const meanDelta = deltas.reduce((s, d) => s + d.delta, 0) / deltas.length;
const inversions = deltas.filter(d => d.delta < 0).length;
const nearZero = deltas.filter(d => Math.abs(d.delta) < 2).length;
console.log(`Mean delta: ${meanDelta.toFixed(1)}`);
console.log(`Inversions (delta < 0): ${inversions}/${deltas.length}`);
console.log(`Near-zero (|delta| < 2): ${nearZero}/${deltas.length}`);
