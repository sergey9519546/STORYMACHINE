// CLIMAX_RELOCATE discrimination signal-existence probe (cheap version).
//
// The full AUC run (measure-auc-split.mjs --partition) takes 90+ min in this
// environment. This probe answers the prerequisite question in ~14 min: does
// ANY climax-zone statistic move systematically under CLIMAX_RELOCATE on real
// scripts, in the direction that would help discrimination?
//
// The background: suspenseDelta's peak is degenerate (scene 0-2, see
// SUSPENSE_DELTA_DEGENERACY_2026-08-05.md). But purpose==='climax' tags sit
// late on 27/27 intact scripts, and detectPurpose is partly position-aware
// (it re-derives tags from positionFrac). So relocating the last scene to
// position 1 should compress/shift the climax zone. The question: does it
// shift ENOUGH and CONSISTENTLY enough that a bounded deduction on it would
// separate intact from relocated better than chance?
//
// Statistics measured (intact vs relocated, per script):
//   A. lastClimaxTagPos  — position % of the LAST purpose==='climax' tag
//   B. climaxTagCount    — how many scenes are tagged climax
//   C. lastTurnPos       — position % of the last dramaticTurn
//   D. climaxSpread      — (lastClimaxTagPos - firstClimaxTagPos), the zone width
//   E. suspPeakPos       — the degenerate baseline (expected: no change)
//
// Discrimination signal = intact vs relocated means, per statistic. A statistic
// where relocated < intact on MOST scripts (climax zone compresses/shifts left
// under relocation) is a candidate for a bounded deduction. A statistic that
// doesn't move (like suspPeakPos) confirms degeneracy.
//
// 12 scripts x 2 variants (intact + relocated) = 24 analyzer passes, ~10s.
// No full doctor run needed — analyzeFountainText exposes all these fields.
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { readdirSync, readFileSync } from 'node:fs';
import { computeProbeStats } from './lib/climax-probe-stats.mjs';

// See probe-climax-locators.mjs's note: this glob said `*.fountain.txt` while
// the corpus is `*.fountain`, so the probe selected zero files and still
// exited 0. Accept both, and fail loudly on an empty selection.
const files = readdirSync('data/screenplays').filter(f => f.endsWith('.fountain') || f.endsWith('.fountain.txt')).slice(0, 12);
if (files.length === 0) {
  console.error('[FATAL] no screenplays selected from data/screenplays (looked for *.fountain and *.fountain.txt) — refusing to report an empty run as success');
  process.exit(1);
}
console.log('=== CLIMAX_RELOCATE DISCRIMINATION SIGNAL-EXISTENCE PROBE ===');
console.log('12 scripts x intact/CLIMAX_RELOCATE. Analyzer-only (no doctor), ~10s.\n');

function relocate(text) {
  const lines = text.split('\n');
  const pre = [], scenes = []; let cur = null, seen = false;
  for (const l of lines) {
    if (/^(INT|EXT)\./.test(l)) { if (cur && seen) scenes.push(cur); seen = true; cur = [l]; }
    else if (seen) cur.push(l); else pre.push(l);
  }
  if (cur) scenes.push(cur);
  if (scenes.length < 3) return null;
  const last = scenes.pop(); scenes.splice(1, 0, last);
  return [...pre, ...scenes.flat()].join('\n');
}

console.log('script'.padEnd(32) + '| lastClimax% (I->R) | climaxN (I->R) | lastTurn% (I->R) | spread (I->R) | susp% (I->R)');
console.log('-'.repeat(115));
let intactLate = 0, relocLate = 0, processed = 0;
const deltas = { lastClimax: [], lastTurn: [], spread: [], susp: [] };
for (const f of files) {
  let text; try { text = readFileSync('data/screenplays/' + f, 'utf-8'); } catch { continue; }
  const rel = relocate(text); if (!rel) continue;
  let si, sr; try { si = computeProbeStats(analyzeFountainText(text)); sr = computeProbeStats(analyzeFountainText(rel)); } catch { continue; }
  if (!si || !sr) continue;
  processed++;
  if (si.lastClimaxPos >= 66) intactLate++;
  if (sr.lastClimaxPos >= 66) relocLate++;
  deltas.lastClimax.push(sr.lastClimaxPos - si.lastClimaxPos);
  deltas.lastTurn.push(sr.lastTurnPos - si.lastTurnPos);
  deltas.spread.push(sr.climaxSpread - si.climaxSpread);
  deltas.susp.push(sr.suspPeakPos - si.suspPeakPos);
  const fp = v => (v >= 0 ? v.toFixed(0) : 'na').padStart(3);
  const pair = (i, r) => `${fp(i)}->${fp(r)}`;
  console.log(
    f.slice(0, 30).padEnd(32) +
    '| ' + pair(si.lastClimaxPos, sr.lastClimaxPos).padEnd(19) +
    '| ' + pair(si.climaxCount, sr.climaxCount).padEnd(15) +
    '| ' + pair(si.lastTurnPos, sr.lastTurnPos).padEnd(17) +
    '| ' + pair(si.climaxSpread, sr.climaxSpread).padEnd(13) +
    '| ' + pair(si.suspPeakPos, sr.suspPeakPos)
  );
}
console.log('-'.repeat(115));
const meanDelta = arr => arr.length ? (arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(1) : 'na';
const movedLeft = arr => arr.filter(d => d < -3).length;
console.log(`\n=== RESULT (${processed} scripts) ===`);
console.log(`lastClimaxPos in final third: intact ${intactLate}/${processed}, relocated ${relocLate}/${processed}`);
console.log(`mean delta (relocated - intact), negative = moves left under relocation:`);
console.log(`  lastClimaxPos: ${meanDelta(deltas.lastClimax)}  (${movedLeft(deltas.lastClimax)}/${processed} moved left)`);
console.log(`  lastTurnPos:   ${meanDelta(deltas.lastTurn)}  (${movedLeft(deltas.lastTurn)}/${processed} moved left)`);
console.log(`  climaxSpread:  ${meanDelta(deltas.spread)}  (negative = compresses under relocation)`);
console.log(`  suspPeakPos:   ${meanDelta(deltas.susp)}  (baseline — expected ~0, degenerate)`);
console.log(`\nInterpretation: a statistic with large negative mean delta AND most scripts moving`);
console.log(`left is a candidate for a bounded deduction that would discriminate CLIMAX_RELOCATE.`);
console.log(`suspPeakPos confirms the degenerate baseline if it ~doesn't move.`);
