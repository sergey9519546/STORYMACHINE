// COMPLETE CLAIM-FALSIFICATION MATRIX — for each of the report's "What's
// Working" strengths, does the claim DISAPPEAR when the property it asserts
// is destroyed?
//
// ── Why this exists ────────────────────────────────────────────────────────
// DIMENSION_HONESTY_AUDIT_2026-07-28.md verified 2 of 6 strengths by
// falsification (climax placement, stakes continuity — both reworded) and
// marked the other 4 as "robust" or "not tested" without running the test.
// That's not honest enough to call the report fieldable. This probe closes
// the gap: for each claim, apply every degradation and record whether the
// claim's marker string still appears in the strengths list.
//
// A claim that SURVIVES the damage that should destroy its asserted
// property is an overstatement (Category A candidate). A claim that
// DISAPPEARS under matching damage is honestly gated.
//
// ── Run ────────────────────────────────────────────────────────────────────
//   node scripts/probe-claim-falsification.mjs
// Output: stdout matrix.

import fs from 'node:fs';
import { fountain } from '../src/lib/sample-script.ts';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';

// ── Claim markers (substring unique to each strength template) ─────────────
// Each marker is chosen to fire only for its own claim and survive the
// Category A rewording already shipped.
const CLAIMS = [
  {
    id: 'C1-tension-rise',
    marker: 'Tension rises on average from the first half to the second',
    asserts: 'back-half tension > front-half tension (global arc / position)',
    killerDamage: 'SCENE_SHUFFLE — should equalize halves, destroying the rise',
  },
  {
    id: 'C2-payoff-completeness',
    marker: 'every planted clue is paid off',
    asserts: 'all planted clues have payoffs (content-level tracking)',
    killerDamage: 'none direct — payoff is content-tracked; flag if it survives SCENE_SHUFFLE',
  },
  {
    id: 'C3-stakes-continuity',
    marker: 'Deadline pressure (clock-raising language) appears in both halves',
    asserts: 'clockRaised present in both halves (presence, not chronology)',
    killerDamage: 'MIDPOINT_DROP — should remove clock scenes if they cluster mid-script',
  },
  {
    id: 'C4-function-distribution',
    marker: "doesn't lean on one narrative gear",
    asserts: '6+ distinct scene purposes, no single one dominant (distribution)',
    killerDamage: 'none direct — distribution is content-level; flag if it survives SCENE_MERGE',
  },
  {
    id: 'C5-suspense-shaping',
    marker: 'highest-suspense scene sits in the final quartile',
    asserts: 'suspense peaks in late quartile (position)',
    killerDamage: 'CLIMAX_RELOCATE / SCENE_SHUFFLE — should flatten the late peak',
  },
  {
    id: 'C6-climax-placement',
    marker: "draft's single most intense scene lands in the final stretch",
    asserts: 'peak intensity scene in final 30%, Q4 > Q1 (position)',
    killerDamage: 'CLIMAX_RELOCATE — moves peak scene to position 2',
  },
];

// ── Degradations (same set as paired-discrimination) ──────────────────────
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
  if (scenes.length < 3) return text;
  const rng = mulberry32(42);
  const sh = scenes.slice();
  for (let i = sh.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [sh[i], sh[j]] = [sh[j], sh[i]];
  }
  return reassemble(preamble, sh);
}
function degradeMidpointDrop(text) {
  const { preamble, scenes } = segmentScenes(text);
  const n = scenes.length;
  if (n < 5) return text;
  const start = Math.floor(n * 0.4), end = Math.floor(n * 0.6);
  return reassemble(preamble, scenes.slice(0, start).concat(scenes.slice(end)));
}
function degradeClimaxRelocate(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return text;
  const last = scenes.pop();
  scenes.splice(1, 0, last);
  return reassemble(preamble, scenes);
}
function degradeDialogueFlatten(text) {
  const normalized = normalizeScreenplay(text);
  const blocks = parseFountain(normalized);
  if (blocks.length === 0) return normalized;
  const dl = new Set(blocks.filter(b => b.type === 'dialogue' || b.type === 'parenthetical').map(b => b.lineNumber));
  return normalized.split(/\r?\n/).map((l, i) => dl.has(i + 1) ? 'Hello.' : l).join('\n');
}
function degradeSceneMerge(text) {
  return text.split(/\r?\n/).filter(l => { const t = l.trim(); return !HEADING_RE.test(t) && !DOT_RE.test(t); }).join('\n');
}
const DEGRADATIONS = [
  { id: 'SCENE_SHUFFLE', fn: degradeShuffle },
  { id: 'MIDPOINT_DROP', fn: degradeMidpointDrop },
  { id: 'CLIMAX_RELOCATE', fn: degradeClimaxRelocate },
  { id: 'DIALOGUE_FLATTEN', fn: degradeDialogueFlatten },
  { id: 'SCENE_MERGE', fn: degradeSceneMerge },
];

// ── Main ───────────────────────────────────────────────────────────────────
const ctx = { theme: '', genre: '', directorStyle: '', characters: [] };
const base = await runScriptDoctor(fountain, ctx, 'quick');
const baselinePresent = {};
for (const c of CLAIMS) baselinePresent[c.id] = base.strengths.some(s => s.includes(c.marker));
console.log('=== BASELINE (sample script, ' + base.sceneCount + ' scenes) ===');
for (const c of CLAIMS) {
  console.log('  ' + c.id.padEnd(26) + (baselinePresent[c.id] ? ' PRESENT' : ' absent') + '  | asserts: ' + c.asserts);
}

console.log('\n=== FALSIFICATION MATRIX (does claim survive the damage?) ===');
console.log('Y = claim still fires after damage (potential overstatement);  . = claim correctly disappeared');
console.log('');
const header = 'claim'.padEnd(26) + ' | ' + DEGRADATIONS.map(d => d.id).join(' | ');
console.log(header);
console.log('-'.repeat(header.length));

const results = {};
for (const c of CLAIMS) {
  if (!baselinePresent[c.id]) {
    console.log(c.id.padEnd(26) + ' | (baseline absent — skip)');
    results[c.id] = { baselineAbsent: true };
    continue;
  }
  const row = [c.id.padEnd(26)];
  const survival = {};
  for (const d of DEGRADATIONS) {
    const damaged = d.fn(fountain);
    const rep = await runScriptDoctor(damaged, ctx, 'quick');
    const present = rep.strengths.some(s => s.includes(c.marker));
    survival[d.id] = present;
    row.push((present ? 'Y' : '.').padEnd(d.id.length));
  }
  results[c.id] = survival;
  console.log(row.join(' | '));
}

console.log('\n=== OVERSTATEMENT CANDIDATES (claim survives its killer damage) ===');
let anyCandidate = false;
for (const c of CLAIMS) {
  if (!baselinePresent[c.id]) continue;
  // Determine which degradations are "killers" for this claim
  const killers = [];
  if (c.id === 'C1-tension-rise') killers.push('SCENE_SHUFFLE');
  if (c.id === 'C3-stakes-continuity') killers.push('MIDPOINT_DROP');
  if (c.id === 'C5-suspense-shaping') killers.push('CLIMAX_RELOCATE', 'SCENE_SHUFFLE');
  if (c.id === 'C6-climax-placement') killers.push('CLIMAX_RELOCATE');
  for (const k of killers) {
    if (results[c.id] && results[c.id][k]) {
      anyCandidate = true;
      console.log('  ' + c.id + ' SURVIVES ' + k + ' — ' + c.killerDamage);
    }
  }
}
if (!anyCandidate) console.log('  (none — every claim retracts under its killer damage)');
