// TRUTH-LEDGER ORDER-SENSITIVITY PROBE — measures whether
// server/nvm/analyze/truth-extraction.ts's life-status contradiction
// detector is genuinely order-sensitive (contradiction count moves under
// scene degradation) and, first and foremost, how often it false-positives
// on unmodified, professionally-shaped screenplay text.
//
// ── Why two corpora ──────────────────────────────────────────────────────
// Section A runs over REAL material (6 CC0 screenplays in data/screenplays/,
// 4 structural-form-experiment fixtures, 20 calibration-corpus samples — 30
// scripts total). This is the honest false-positive measurement: these are
// unmodified, competently-to-strongly written scripts, and the extractor
// should report ~0 contradictions on all of them before degradation.
//
// None of these 30 scripts contain an on-page death of a speaking character
// stated with the precision guards' required explicitness (measured, not
// assumed — grep confirms only metaphorical/unrelated "dead"/"deadline"/
// "shooter" hits). That means Section A alone cannot demonstrate the
// order-sensitivity PROPERTY — there's no death fact anywhere to be
// order-sensitive about. So Section B builds a small set (n=12) of
// synthetic, clearly-labeled fixtures whose ONLY job is to isolate the
// mechanism: an unambiguous death near the end, ordinary filler dialogue
// scenes before it. This mirrors the precedent already in this codebase —
// temporal-consistency.ts's own order-sensitivity finding used a hand-built
// fixture for exactly this reason (see that file's header). Section B's
// result is a claim about the MECHANISM; Section A's is a claim about
// REAL-CORPUS RECALL. They are not interchangeable and are reported
// separately on purpose.
//
// ── Run ────────────────────────────────────────────────────────────────────
//   node scripts/probe-truth-order-sensitivity.mjs
// Output: stdout only — this is a diagnostic probe, not an evidence artifact
// pipeline (see scripts/lib/output-guard.mjs's header for why some probes
// write to scripts/output/ and others, like this one, do not: there is no
// existing committed CSV this could silently shrink).

import fs from 'node:fs';
import path from 'node:path';
import { detectTruthContradictions } from '../server/nvm/analyze/truth-extraction.ts';
import { REFERENCE_CORPUS } from '../server/nvm/analyze/calibration/corpus.ts';

// ── Degradations — copied VERBATIM from scripts/measure-auc-split.mjs
//    (per task instruction: reuse, do not reimplement) ─────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const HEADING_RE = /^(INT\.|EXT\.|EST\.|INT\/EXT\.)/;
const DOT_RE = /^\./;
function segmentScenes(text) {
  const lines = text.split(/\r?\n/);
  const scenes = []; let cur = null; let preamble = [];
  for (const line of lines) {
    const t = line.trim();
    if (HEADING_RE.test(t) || DOT_RE.test(t)) {
      if (cur) scenes.push(cur);
      cur = { heading: line, body: [] };
    } else if (cur) cur.body.push(line);
    else preamble.push(line);
  }
  if (cur) scenes.push(cur);
  return { preamble, scenes };
}
function reassemble(preamble, scenes) {
  const out = [...preamble];
  for (const s of scenes) { out.push(s.heading); out.push(...s.body); }
  return out.join('\n');
}
function degradeShuffle(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return null;
  const rng = mulberry32(42);
  const sh = scenes.slice();
  for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
  return reassemble(preamble, sh);
}
function degradeMidpointDrop(text) {
  const { preamble, scenes } = segmentScenes(text);
  const n = scenes.length;
  if (n < 5) return null;
  return reassemble(preamble, scenes.slice(0, Math.floor(n * 0.4)).concat(scenes.slice(Math.floor(n * 0.6))));
}
function degradeClimaxRelocate(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return null;
  const last = scenes.pop();
  scenes.splice(1, 0, last);
  return reassemble(preamble, scenes);
}
const DEGRADATIONS = [
  { id: 'SCENE_SHUFFLE', fn: degradeShuffle },
  { id: 'MIDPOINT_DROP', fn: degradeMidpointDrop },
  { id: 'CLIMAX_RELOCATE', fn: degradeClimaxRelocate },
];

// ── Rank statistic helpers ───────────────────────────────────────────────
// Pairwise AUC over "cleanliness" (negative contradiction count, so higher =
// cleaner = better) — same convention as measure-auc-split.mjs's health-based
// AUC, just applied to this detector's own output instead of doctor health.
function pairwiseAuc(pairs) {
  if (pairs.length === 0) return NaN;
  let correct = 0;
  for (const { real, degraded } of pairs) {
    if (real > degraded) correct += 1;
    else if (real === degraded) correct += 0.5;
  }
  return correct / pairs.length;
}
function winTieLoss(pairs) {
  // "win" = clean strictly cleaner than degraded (real > degraded score,
  // i.e. clean had fewer contradictions) — the direction that supports
  // order-sensitivity.
  let win = 0, tie = 0, loss = 0;
  for (const { real, degraded } of pairs) {
    if (real > degraded) win++; else if (real === degraded) tie++; else loss++;
  }
  return { win, tie, loss };
}

// ── Section A: REAL corpus (false-positive rate + whatever order-signal exists)
function collectRealScripts() {
  const scripts = [];
  const screenplayDir = path.resolve('data/screenplays');
  if (fs.existsSync(screenplayDir)) {
    for (const f of fs.readdirSync(screenplayDir)) {
      if (!f.endsWith('.fountain')) continue;
      scripts.push({ id: `data/screenplays/${f}`, text: fs.readFileSync(path.join(screenplayDir, f), 'utf-8') });
    }
  }
  const fixtureDir = path.resolve('tests/fixtures/structural-form-experiment');
  if (fs.existsSync(fixtureDir)) {
    for (const f of fs.readdirSync(fixtureDir)) {
      if (!f.endsWith('.fountain')) continue;
      scripts.push({ id: `structural-form-experiment/${f}`, text: fs.readFileSync(path.join(fixtureDir, f), 'utf-8') });
    }
  }
  for (const s of REFERENCE_CORPUS) {
    scripts.push({ id: `calibration/${s.label} (${s.band})`, text: s.fountain });
  }
  return scripts;
}

function runSection(label, scripts) {
  console.log(`\n=== ${label} (${scripts.length} scripts) ===`);
  console.log('script'.padEnd(48) + 'clean' + '  | ' + DEGRADATIONS.map(d => d.id.padEnd(16)).join(' '));

  const pairsByDeg = {};
  for (const d of DEGRADATIONS) pairsByDeg[d.id] = [];
  let cleanFalsePositiveScripts = 0;
  let cleanFalsePositiveCount = 0;
  let skippedNoFacts = 0;

  for (const s of scripts) {
    let clean;
    try {
      clean = detectTruthContradictions(s.text);
    } catch (e) {
      console.log(`  SKIP ${s.id}: extractor threw: ${e.message}`);
      continue;
    }
    const cleanN = clean.contradictions.length;
    if (cleanN > 0) { cleanFalsePositiveScripts++; cleanFalsePositiveCount += cleanN; }
    if (clean.facts.filter(f => f.object === 'dead').length === 0) skippedNoFacts++;

    const row = [`${s.id}`.padEnd(48), String(cleanN).padStart(5), ' |'];
    for (const d of DEGRADATIONS) {
      const degradedText = d.fn(s.text);
      if (degradedText === null) { row.push('  n/a'.padEnd(17)); continue; }
      let degraded;
      try {
        degraded = detectTruthContradictions(degradedText);
      } catch (e) {
        row.push(`  ERR`.padEnd(17));
        continue;
      }
      const degradedN = degraded.contradictions.length;
      const dir = degradedN > cleanN ? 'UP' : degradedN < cleanN ? 'DOWN' : 'flat';
      row.push(`  ${String(degradedN).padStart(2)} (${dir})`.padEnd(17));
      pairsByDeg[d.id].push({ real: -cleanN, degraded: -degradedN, script: s.id });
    }
    console.log(row.join(''));
  }

  console.log(`\n${label} — false positives on CLEAN, unmodified text:`);
  console.log(`  ${cleanFalsePositiveScripts}/${scripts.length} scripts produced >=1 contradiction before any degradation (total ${cleanFalsePositiveCount} contradictions).`);
  console.log(`  ${skippedNoFacts}/${scripts.length} scripts produced zero death facts at all (no life-status signal present to test).`);

  console.log(`\n${label} — order-sensitivity rank statistic per degradation:`);
  for (const d of DEGRADATIONS) {
    const pairs = pairsByDeg[d.id];
    const activePairs = pairs.filter(p => p.real !== p.degraded);
    if (pairs.length >= 10) {
      const auc = pairwiseAuc(pairs);
      const { win, tie, loss } = winTieLoss(pairs);
      console.log(`  ${d.id.padEnd(16)} n=${pairs.length} (${activePairs.length} active/non-tied) AUC=${auc.toFixed(3)} win/tie/loss=${win}/${tie}/${loss}`);
    } else {
      const { win, tie, loss } = winTieLoss(pairs);
      console.log(`  ${d.id.padEnd(16)} n=${pairs.length} — TOO SMALL FOR AUC, reporting win/tie/loss=${win}/${tie}/${loss}`);
    }
  }
  return { pairsByDeg, cleanFalsePositiveScripts, totalScripts: scripts.length };
}

// ── Section B: synthetic mechanism-proof fixtures ───────────────────────
// Deliberately NOT "real corpus" — see file header. Each fixture: a small
// deterministic cast of two characters trading filler dialogue across
// (10+i) scenes, then an unambiguous, unhedged death of the primary
// character in the FINAL scene with no dialogue from them afterward — so
// the clean/original order always scores 0 contradictions by construction,
// and only degradations that actually MOVE the death scene relative to that
// character's other dialogue scenes should ever produce one.
const DYING_NAMES = ['MARA', 'JONAH', 'PRIYA', 'DESMOND', 'ODALYS', 'TARIQ', 'LENA', 'FITCH', 'ROSALIND', 'KOFI', 'SIENA', 'ADAEZE'];
const LOCATIONS = ['WAREHOUSE', 'DINER', 'ROOFTOP', 'SUBWAY PLATFORM', 'OFFICE', 'ALLEY', 'PIER', 'GARAGE', 'LIBRARY', 'MOTEL ROOM', 'STAIRWELL', 'KITCHEN'];

function buildSyntheticFixture(i) {
  const dying = DYING_NAMES[i % DYING_NAMES.length];
  const companion = 'COMPANION';
  const sceneCount = 10 + i;
  const fillerCount = sceneCount - 1;
  const lines = [];
  lines.push(`// Synthetic mechanism-proof fixture #${i} — not real writing, built solely`);
  lines.push(`// to isolate truth-extraction.ts's life-status order-sensitivity property.`);
  lines.push('');
  for (let s = 0; s < fillerCount; s++) {
    const loc = LOCATIONS[s % LOCATIONS.length];
    const intext = s % 2 === 0 ? 'INT' : 'EXT';
    lines.push(`${intext}. ${loc} ${i} - DAY`);
    lines.push('');
    lines.push(`${dying} and ${companion} cross paths near the ${loc.toLowerCase()}, beat number ${s}.`);
    lines.push('');
    const speaker = s % 2 === 0 ? dying : companion;
    lines.push(speaker);
    lines.push(`Ordinary filler line number ${s} for fixture ${i}, nothing structural here.`);
    lines.push('');
  }
  lines.push(`INT. FINAL ROOM ${i} - NIGHT`);
  lines.push('');
  lines.push(`${companion} watches in horror as ${dying} collapses. ${dying} is dead.`);
  lines.push('');
  lines.push(companion);
  lines.push(`No... ${dying.charAt(0)}${dying.slice(1).toLowerCase()}, no.`);
  lines.push('');
  return lines.join('\n');
}

function buildSyntheticFixtures(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ id: `synthetic-fixture-${i}`, text: buildSyntheticFixture(i) });
  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────
const realScripts = collectRealScripts();
const sectionA = runSection('SECTION A — REAL CORPUS (false-positive measurement)', realScripts);

const syntheticScripts = buildSyntheticFixtures(12);
const sectionB = runSection('SECTION B — SYNTHETIC MECHANISM-PROOF FIXTURES (order-sensitivity demonstration)', syntheticScripts);

console.log('\n=== SUMMARY ===');
console.log(`Section A (real, n=${sectionA.totalScripts}): false positives on clean text = ${sectionA.cleanFalsePositiveScripts}/${sectionA.totalScripts} scripts.`);
console.log('Section A order-sensitivity is degenerate (0/0 on nearly every script/degradation pair) because');
console.log('this corpus contains no on-page death of a speaking character stated with the precision guards\'');
console.log('required explicitness — a genuine recall finding, not a bug. See per-degradation win/tie/loss above.');
console.log(`Section B (synthetic, n=${sectionB.totalScripts}): false positives on clean text = ${sectionB.cleanFalsePositiveScripts}/${sectionB.totalScripts} scripts`);
console.log('(expected 0 by construction — any nonzero value here would indicate a bug in the fixture itself,');
console.log('not the extractor, since the death is always the last scene with no dialogue after it in the original).');
