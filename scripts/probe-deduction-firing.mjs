// Check how often each deduction fires on real scripts, and what the
// arcIncoherenceDeduction actually contributes. The arc deduction uses
// computeEmotionalArc which returned n=0 in the positional probe — is it
// firing at all?
import fs from 'node:fs';
import path from 'node:path';
import { computeEmotionalArc } from '../server/nvm/analyze/emotional-arc.ts';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { computeDialogueDiversity, dialogueDegradationDeduction, computeClimaxZoneSignals, climaxZoneDecayDeduction } from '../server/nvm/analyze/doctor.ts';

const split = JSON.parse(fs.readFileSync('scripts/output/corpus-split.json', 'utf-8'));
const SAMPLE = split.train.map(s => s.file).slice(0, 30);

let arcScored = 0, arcNotScored = 0;
let arcDedNonZero = 0;
let dialogueDedNonZero = 0;
let climaxDedNonZero = 0;
const arcDeds = [];
const dialogueDeds = [];

for (const relFile of SAMPLE) {
  const raw = fs.readFileSync(path.join('data/screenplays', relFile), 'utf-8');
  const a = analyzeFountainText(raw);

  // Arc
  try {
    const arc = computeEmotionalArc(a.records);
    if (arc.scored) {
      arcScored++;
      const ded = Math.min(15, 8 * Math.max(0, 1.2 - arc.arcHealth));
      arcDeds.push(ded);
      if (ded > 0) arcDedNonZero++;
    } else {
      arcNotScored++;
    }
  } catch { arcNotScored++; }

  // Dialogue
  const ds = computeDialogueDiversity(a.records);
  const dded = dialogueDegradationDeduction(ds);
  if (dded > 0) dialogueDedNonZero++;
  dialogueDeds.push(dded);

  // Climax
  const cs = computeClimaxZoneSignals(a.records);
  const cded = climaxZoneDecayDeduction(cs);
  if (cded > 0) climaxDedNonZero++;
}

console.log(`=== DEDUCTION FIRING on ${SAMPLE.length} train scripts ===`);
console.log(`arc scored: ${arcScored}/${SAMPLE.length} (${arcNotScored} not scored)`);
console.log(`arc deduction > 0: ${arcDedNonZero}/${SAMPLE.length}`);
console.log(`dialogue deduction > 0: ${dialogueDedNonZero}/${SAMPLE.length}`);
console.log(`climax deduction > 0: ${climaxDedNonZero}/${SAMPLE.length}`);
if (arcDeds.length > 0) {
  console.log(`arc deduction: mean ${arcDeds.reduce((s,v)=>s+v,0)/arcDeds.length.toFixed(2)} max ${Math.max(...arcDeds).toFixed(2)}`);
}
if (dialogueDeds.length > 0) {
  const nonzero = dialogueDeds.filter(d => d > 0);
  console.log(`dialogue deduction: mean ${(dialogueDeds.reduce((s,v)=>s+v,0)/dialogueDeds.length).toFixed(2)} max ${Math.max(...dialogueDeds).toFixed(2)} (${nonzero.length} firing)`);
}
