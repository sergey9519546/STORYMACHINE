// Forward-reference density probe — the signal STRUCTURAL_SIGNAL_DIAGNOSIS
// (lines 140-143) named as the unimplemented candidate for detecting scene
// reordering: "count of references (clue mentions, character callbacks) in
// scene N to content established in scenes AFTER N. Genuine position-
// dependence: a payoff before its setup has forward references."
//
// HYPOTHESIS: under CLIMAX_RELOCATE (move last scene to position 1), the
// relocated climax scene contains proper nouns / definite references / named
// entities that are NOT introduced in any earlier scene (there are none) —
// a forward-reference spike at position 1. Intact, that scene sits last, so
// all its named entities WERE introduced earlier → zero forward references.
//
// This signal is fundamentally different from every per-scene field: it is
// defined by the RELATIONSHIP between a scene's tokens and the set of tokens
// in scenes BEFORE it. Reorder the scenes and the "before" set changes.
//
// METRIC: for each scene, count "novel proper nouns" — capitalized multiword
// or all-caps tokens that do NOT appear (case-insensitive) in any earlier
// scene's text. A scene early in a reordered script where the climax landed
// will have many novel proper nouns (characters/props/places the audience
// hasn't been introduced to). Sum across the first quartile; intact scripts
// should have low early-novel-noun density (introductions are spread out),
// relocated scripts should spike.
//
// 12 scripts x intact/CLIMAX_RELOCATE/SCENE_SHUFFLE = 36 text-segmentation
// passes, ~2s. No doctor run. Pure text-signal feasibility check.
import { readFileSync, readdirSync } from 'node:fs';

// See probe-climax-locators.mjs's note: this glob said `*.fountain.txt` while
// the corpus is `*.fountain`, so the probe selected zero files and still
// exited 0. Accept both, and fail loudly on an empty selection.
const files = readdirSync('data/screenplays').filter(f => f.endsWith('.fountain') || f.endsWith('.fountain.txt')).slice(0, 12);
if (files.length === 0) {
  console.error('[FATAL] no screenplays selected from data/screenplays (looked for *.fountain and *.fountain.txt) — refusing to report an empty run as success');
  process.exit(1);
}

function segment(text) {
  const lines = text.split('\n');
  const pre = [], scenes = []; let cur = null, seen = false;
  for (const l of lines) {
    if (/^(INT|EXT)\./.test(l)) { if (cur && seen) scenes.push(cur); seen = true; cur = [l]; }
    else if (seen) cur.push(l); else pre.push(l);
  }
  if (cur) scenes.push(cur);
  // prepend preamble (title page etc.) to scene 0 if present
  if (pre.length && scenes.length) scenes[0] = [...pre, ...scenes[0]];
  return scenes.map(s => s.join('\n'));
}
function relocate(text) {
  const scenes = segment(text);
  if (scenes.length < 3) return null;
  const last = scenes.pop(); scenes.splice(1, 0, last);
  return scenes.join('\n');
}
function shuffle(text) {
  const scenes = segment(text);
  if (scenes.length < 3) return null;
  let rng = 42; const rand = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };
  const sh = scenes.slice();
  for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
  return sh.join('\n');
}

// Extract "proper nouns" from a scene: All-CAPS tokens (≥3 chars, fountain
// character cues + props) AND Capitalized multiword phrases (names, places).
// Exclude sentence-initial common words via a stoplist.
const STOP = new Set(['The','A','An','And','But','Or','So','Then','When','As','He','She','It','They','We','I','You','His','Her','Its','Their','Our','My','Your','This','That','These','Those','There','Here','Now','Just','Very','Into','Onto','Over','Under','Across','Through','Before','After','During','While','Because','Although','Though','If','Unless','Until','Since','Once','Suddenly','Quickly','Slowly','Back','Down','Up','Out','Off','Away','Toward','Towards','Behind','Beside','Between','Among','Against','Within','Without','Upon','Both','Each','Every','Some','Any','All','None','One','Two','Three','First','Second','Next','Last','Final','New','Old','Big','Small','Good','Bad','Right','Left','Yes','No','Not','INT','EXT','CONTINUOUS','DAY','NIGHT','LATER','MOMENTS','CLOSE','OPEN','CUT','FADE','DISSOLVE','BACK','ANGLE','POV','V.O','O.S','CONT','INTERCUT']);

function properNouns(text) {
  const nouns = new Set();
  // All-caps tokens (≥3 chars) — fountain character cues, props
  for (const m of text.match(/\b[A-Z]{3,}\b/g) ?? []) nouns.add(m.toLowerCase());
  // Capitalized words not at line start (names, places, proper nouns)
  // match Cap words preceded by space, not sentence-initial
  for (const m of text.match(/(?<=\s)[A-Z][a-z]{2,}/g) ?? []) {
    if (!STOP.has(m)) nouns.add(m.toLowerCase());
  }
  return nouns;
}

function earlyNovelNounDensity(scenes) {
  // For the first quartile of scenes, count proper nouns not seen in earlier scenes.
  const quart = Math.max(1, Math.floor(scenes.length / 4));
  let novelCount = 0, totalNouns = 0;
  const seen = new Set();
  for (let i = 0; i < scenes.length; i++) {
    const nouns = properNouns(scenes[i]);
    if (i < quart) {
      for (const n of nouns) {
        totalNouns++;
        if (!seen.has(n)) novelCount++;
      }
    }
    for (const n of nouns) seen.add(n);
  }
  return { novelCount, totalNouns, density: totalNouns > 0 ? novelCount / totalNouns : 0 };
}

console.log('=== FORWARD-REFERENCE DENSITY PROBE ===');
console.log('Hypothesis: relocated/shuffled scripts have higher early-scene novel-noun density\n');
console.log('script'.padEnd(30) + '| intact density (novel/total) | reloc density | shuff density | reloc>intact? shuff>intact?');
console.log('-'.repeat(110));
let processed = 0, relocHigher = 0, shuffHigher = 0;
for (const f of files) {
  let text; try { text = readFileSync('data/screenplays/' + f, 'utf-8'); } catch { continue; }
  const rel = relocate(text), shu = shuffle(text);
  if (!rel || !shu) continue;
  const iScenes = segment(text), rScenes = segment(rel), sScenes = segment(shu);
  const iD = earlyNovelNounDensity(iScenes), rD = earlyNovelNounDensity(rScenes), sD = earlyNovelNounDensity(sScenes);
  processed++;
  if (rD.density > iD.density + 0.02) relocHigher++;
  if (sD.density > iD.density + 0.02) shuffHigher++;
  const fmt = d => `${d.density.toFixed(2)} (${d.novelCount}/${d.totalNouns})`.padEnd(28);
  console.log(
    f.slice(0, 28).padEnd(30) + '| ' + fmt(iD) + ' | ' + fmt(rD) + ' | ' + fmt(sD) +
    ` | ${rD.density > iD.density + 0.02 ? 'YES' : 'no'}${' '.repeat(10)}${sD.density > iD.density + 0.02 ? 'YES' : 'no'}`
  );
}
console.log('-'.repeat(110));
console.log(`\n=== RESULT (${processed} scripts) ===`);
console.log(`CLIMAX_RELOCATE raises early-novel-noun density on: ${relocHigher}/${processed}`);
console.log(`SCENE_SHUFFLE   raises early-novel-noun density on: ${shuffHigher}/${processed}`);
console.log('\nInterpretation:');
console.log('If most scripts show reloc/shuff > intact, forward-reference density IS a');
console.log('discriminative signal — the first primitive that sees scene reordering.');
console.log('If ~half, it is at chance (like every per-scene field).');
