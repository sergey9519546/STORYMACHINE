// Climax-locator probe: where do the CANDIDATE climax signals sit (as % of
// script) on the 27-script produced-feature set, compared to the degenerate
// suspenseDelta peak (which sits at scene 0-2 uniformly — see
// SUSPENSE_DELTA_DEGENERACY_2026-08-05.md)?
//
// The question: is there ANY existing per-scene signal that localizes the
// dramatic climax LATE (where climaxes actually are on produced features),
// such that relocating that scene would move the locator and make
// CLIMAX_RELOCATE discriminable?
//
// Candidates tested:
//   1. suspenseDelta peak (the degenerate baseline — expected: scene 0-2)
//   2. revelation-bearing scene (the LAST revelation — climaxes often surface truth)
//   3. purpose === 'climax' tag (content-derived; does detectPurpose tag any scene climax?)
//   4. dramaticTurn (the LAST dramatic turn)
//
// For each candidate, the metric is: across 27 scripts, what % have their
// "last occurrence" (or peak) in the final third (>=66%)? If a candidate
// lands late on most scripts, it localizes the climax and is a viable
// locator. If it lands early (like suspenseDelta) or never fires, it isn't.
//
// One analyzer pass per script, no degradations, ~10 seconds total.
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { readdirSync, readFileSync } from 'node:fs';

const files = readdirSync('data/screenplays').filter(f => f.endsWith('.fountain.txt'));
console.log('=== CLIMAX-LOCATOR CANDIDATE PROBE — where does each signal sit? ===');
console.log(`(27 produced features, suspenseDelta baseline = degenerate per prior measurement)\n`);
console.log('script'.padEnd(34) + '| suspPeak%  | lastRevel% | lastTurn%  | purpose=climax at');
console.log('-'.repeat(95));

const stats = {
  suspPeak: [], revLast: [], turnLast: [],
  climaxTagged: 0, climaxTagLate: 0, climaxTags: [],
};

for (const f of files) {
  let a;
  try { a = analyzeFountainText(readFileSync('data/screenplays/' + f, 'utf-8')); }
  catch { continue; }
  const recs = a.records;
  const n = recs.length;
  if (n < 5) continue;

  // 1. suspenseDelta peak
  let suspP = -1, suspV = -Infinity;
  // Match the live structural peak tie-break: a later scene wins an exact
  // suspense tie, rather than preserving the first scene visited.
  recs.forEach((r, i) => { if ((r.suspenseDelta ?? 0) >= suspV) { suspV = r.suspenseDelta ?? 0; suspP = i; } });

  // 2. last revelation-bearing scene
  let revP = -1;
  recs.forEach((r, i) => { if (r.revelation) revP = i; });

  // 3. last dramaticTurn-bearing scene
  let turnP = -1;
  recs.forEach((r, i) => { if (r.dramaticTurn && r.dramaticTurn !== 'nothing') turnP = i; });

  // 4. purpose === 'climax' tag(s)
  const climaxIdx = recs.map((r, i) => r.purpose === 'climax' ? i : -1).filter(i => i >= 0);
  if (climaxIdx.length > 0) stats.climaxTagged++;
  const climaxLate = climaxIdx.filter(i => i / n >= 0.66).length;
  if (climaxLate > 0) stats.climaxTagLate++;

  const suspPct = suspP >= 0 ? (suspP / n * 100) : -1;
  const revPct = revP >= 0 ? (revP / n * 100) : -1;
  const turnPct = turnP >= 0 ? (turnP / n * 100) : -1;
  if (suspPct >= 0) stats.suspPeak.push(suspPct);
  if (revPct >= 0) stats.revLast.push(revPct);
  if (turnPct >= 0) stats.turnLast.push(turnPct);

  const fmt = p => p >= 0 ? (p.toFixed(0) + '%').padStart(7) : '   n/a ';
  const climaxStr = climaxIdx.length ? climaxIdx.map(i => (i / n * 100).toFixed(0) + '%').join(',') : '(none)';
  console.log(
    f.slice(0, 32).padEnd(34) +
    '| ' + fmt(suspPct) + '   | ' + fmt(revPct) + '  | ' + fmt(turnPct) + '   | ' + climaxStr
  );
}

console.log('-'.repeat(95));
const pct = arr => arr.length ? `${Math.min(...arr).toFixed(0)}% / ${arr.sort((a,b)=>a-b)[Math.floor(arr.length/2)].toFixed(0)}% / ${Math.max(...arr).toFixed(0)}%` : 'n/a';
const lateFrac = arr => arr.length ? `${arr.filter(p => p >= 66).length}/${arr.length} (${(arr.filter(p=>p>=66).length/arr.length*100).toFixed(0)}%)` : 'n/a';
console.log('\n=== SUMMARY (min / median / max position %) ===');
console.log('suspenseDelta peak :', pct(stats.suspPeak), '| in final third:', lateFrac(stats.suspPeak));
console.log('last revelation    :', pct(stats.revLast), '| in final third:', lateFrac(stats.revLast));
console.log('last dramaticTurn  :', pct(stats.turnLast), '| in final third:', lateFrac(stats.turnLast));
console.log('purpose=climax tag :', stats.climaxTagged, '/27 scripts tagged at all;', stats.climaxTagLate, '/27 with a late tag');

console.log('\n=== INTERPRETATION ===');
console.log('A candidate is a VIABLE climax locator if its "in final third" fraction is HIGH (>=50%).');
console.log('suspenseDelta is the degenerate baseline (expected ~0%).');
console.log('If revelation or dramaticTurn lands late on most scripts, replacing the suspenseDelta');
console.log('peak-finder with that signal could make CLIMAX_RELOCATE discriminable.');
