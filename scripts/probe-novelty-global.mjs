// GLOBAL novelty-against-prior discrimination probe.
//
// A historical inline per-scene probe reported that the relocated CLIMAX
// scene's proper-noun novelty spiked (mean delta +0.45, 10/11 scripts), but
// its source and per-script receipt were not committed. This script tests the
// GLOBAL statistic — does summing "novelty-against-prior" across ALL scenes separate
// intact from degraded consistently enough to drive an AUC?
//
// GLOBAL METRIC: "forward-novelty burden" = sum over all scenes i of
//   (count of scene i's proper nouns not appearing in any scene j<i)
// normalized by total proper-noun mentions. Intact scripts introduce nouns
// gradually (low early burden); reordered scripts front-load nouns that
// belong later (high early burden). We measure EARLY-region burden specifically
// (first third), since that's where reordering spikes novelty.
//
// Tests intact vs CLIMAX_RELOCATE, SCENE_SHUFFLE, MIDPOINT_DROP. If the early-
// region burden is consistently HIGHER on degraded than intact, this is a
// viable bounded-deduction signal — the first that sees all reordering types.
//
// 12 scripts x 4 variants = 48 text passes, ~3s.
import { readFileSync, readdirSync } from 'node:fs';

const files = readdirSync('data/screenplays').filter(f => f.endsWith('.fountain.txt')).slice(0, 12);

function segment(text) {
  const lines = text.split('\n');
  const pre = [], scenes = []; let cur = null, seen = false;
  for (const l of lines) {
    if (/^(INT|EXT)\./.test(l)) { if (cur && seen) scenes.push(cur); seen = true; cur = [l]; }
    else if (seen) cur.push(l); else pre.push(l);
  }
  if (cur) scenes.push(cur);
  if (pre.length && scenes.length) scenes[0] = [...pre, ...scenes[0]];
  return scenes.map(s => s.join('\n'));
}
function relocate(text) { const s = segment(text); if (s.length < 3) return null; const last = s.pop(); s.splice(1, 0, last); return s.join('\n'); }
function shuffle(text) {
  const s = segment(text); if (s.length < 3) return null;
  let rng = 42; const rand = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };
  const sh = s.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
  return sh.join('\n');
}
function midpointDrop(text) {
  const s = segment(text); const n = s.length; if (n < 5) return null;
  return [...s.slice(0, Math.floor(n * 0.4)), ...s.slice(Math.floor(n * 0.6))].join('\n');
}

function properNouns(text) {
  const n = new Set();
  for (const m of text.match(/\b[A-Z]{3,}\b/g) ?? []) n.add(m.toLowerCase());
  for (const m of text.match(/(?<=\s)[A-Z][a-z]{2,}/g) ?? []) n.add(m.toLowerCase());
  return n;
}

// Early-region forward-novelty burden: in the first third of scenes, what
// fraction of proper-noun MENTIONS are novel (not seen in earlier scenes)?
function earlyNoveltyBurden(scenes) {
  const third = Math.max(1, Math.floor(scenes.length / 3));
  const seen = new Set();
  let earlyNovelMentions = 0, earlyTotalMentions = 0;
  for (let i = 0; i < scenes.length; i++) {
    const nouns = properNouns(scenes[i]);
    // count mentions (with multiplicity per scene) — each noun in scene counts once
    for (const n of nouns) {
      if (i < third) {
        earlyTotalMentions++;
        if (!seen.has(n)) earlyNovelMentions++;
      }
      seen.add(n);
    }
  }
  return earlyTotalMentions > 0 ? earlyNovelMentions / earlyTotalMentions : 0;
}

console.log('=== GLOBAL EARLY-NOVELTY-BURDEN DISCRIMINATION PROBE ===');
console.log('Metric: in the first 1/3 of scenes, fraction of proper-noun mentions not seen earlier.\n');
console.log('script'.padEnd(28) + '| intact | reloc  | shuff  | midDrop| reloc>intact? shuff>intact?');
console.log('-'.repeat(95));
let processed = 0, relocH = 0, shuffH = 0, dropH = 0;
for (const f of files) {
  let text; try { text = readFileSync('data/screenplays/' + f, 'utf-8'); } catch { continue; }
  const rel = relocate(text), shu = shuffle(text), mid = midpointDrop(text);
  if (!rel || !shu || !mid) continue;
  const iB = earlyNoveltyBurden(segment(text));
  const rB = earlyNoveltyBurden(segment(rel));
  const sB = earlyNoveltyBurden(segment(shu));
  const mB = earlyNoveltyBurden(segment(mid));
  processed++;
  if (rB > iB + 0.02) relocH++;
  if (sB > iB + 0.02) shuffH++;
  if (mB > iB + 0.02) dropH++;
  const p = v => v.toFixed(2).padStart(5);
  console.log(
    f.slice(0, 26).padEnd(28) +
    '| ' + p(iB) + '  | ' + p(rB) + '  | ' + p(sB) + '  | ' + p(mB) + '  |' +
    ` ${rB > iB + 0.02 ? 'YES' : 'no '}${' '.repeat(9)}${sB > iB + 0.02 ? 'YES' : 'no '}`
  );
}
console.log('-'.repeat(95));
console.log(`\n=== RESULT (${processed} scripts) ===`);
console.log(`CLIMAX_RELOCATE burden > intact: ${relocH}/${processed}`);
console.log(`SCENE_SHUFFLE   burden > intact: ${shuffH}/${processed}`);
console.log(`MIDPOINT_DROP   burden > intact: ${dropH}/${processed}  (control — drop should NOT raise early novelty)`);
console.log('\nA viable structural signal needs: reloc/shuff > intact on MOST scripts,');
console.log('AND midDrop ~ intact (drop removes scenes but does not reorder — early novelty should be unchanged).');
