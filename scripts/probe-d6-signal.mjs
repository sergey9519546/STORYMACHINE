// Probe: does D6's PAYOFF_BEFORE_SETUP produce a NON-CONSTANT signal under
// CLIMAX_RELOCATE / SCENE_SHUFFLE on real scripts? If the inversion count is
// 0 on intact AND >0 on degraded, D6 created real structural signal. If 0 on
// both, it didn't. This is the cheapest possible test of whether the Jul 29
// AUC baseline (pre-D6) is now stale in D6's favor.
//
// Runs the full doctor (so PAYOFF_BEFORE_SETUP actually fires) on a small
// sample — 12 scripts intact + 12 relocated + 12 shuffled = 36 doctor runs,
// ~3-5 min. NOT an AUC measurement; a signal-existence check.
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'data/screenplays';
const ctx = { theme: '', genre: '', directorStyle: '', characters: [] };

// Pick 12 scripts of moderate size (the manifest's first eligible .fountain.txt set)
const all = readdirSync(SRC).filter(f => f.endsWith('.fountain.txt')).slice(0, 12);

function segment(text) {
  const lines = text.split('\n');
  const pre = []; const scenes = []; let cur = null; let seen = false;
  for (const l of lines) {
    if (/^(INT|EXT)\./.test(l)) { if (cur && seen) scenes.push(cur); seen = true; cur = [l]; }
    else if (seen) cur.push(l); else pre.push(l);
  }
  if (cur) scenes.push(cur);
  return { pre, scenes };
}
function reassemble(pre, scenes) {
  const out = [...pre];
  for (const s of scenes) out.push(...s);
  return out.join('\n');
}
function relocate(text) {
  const { pre, scenes } = segment(text);
  if (scenes.length < 3) return null;
  const last = scenes.pop(); scenes.splice(1, 0, last);
  return reassemble(pre, scenes);
}
function shuffle(text) {
  const { pre, scenes } = segment(text);
  if (scenes.length < 3) return null;
  // seeded Fisher-Yates (seed 42, same as the harness)
  let rng = 42;
  const rand = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };
  const sh = scenes.slice();
  for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
  return reassemble(pre, sh);
}

function countRule(rep, ruleId) {
  // issues live under passes[].issues — count across all
  let n = 0;
  if (Array.isArray(rep?.passes)) {
    for (const p of rep.passes) {
      if (Array.isArray(p?.issues)) n += p.issues.filter(i => i?.rule === ruleId).length;
    }
  }
  return n;
}

console.log('script                                | intact payoffBefore | reloc payoffBefore | shuff payoffBefore | intact health -> reloc -> shuff');
console.log('--------------------------------------|--------------------|--------------------|--------------------|---------------------------------');
let intactAny = 0, relocAny = 0, shuffAny = 0, processed = 0;
for (const f of all) {
  let text;
  try { text = readFileSync(join(SRC, f), 'utf-8'); } catch { continue; }
  const rel = relocate(text); const shu = shuffle(text);
  if (!rel || !shu) continue;
  let intact, reloc, shuff;
  try {
    [intact, reloc, shuff] = await Promise.all([
      runScriptDoctor(text, ctx, 'quick'),
      runScriptDoctor(rel, ctx, 'quick'),
      runScriptDoctor(shu, ctx, 'quick'),
    ]);
  } catch (e) { console.log(f.slice(0,36).padEnd(38), '| doctor error:', e.message?.slice(0,40)); continue; }
  const ib = countRule(intact, 'PAYOFF_BEFORE_SETUP');
  const rb = countRule(reloc, 'PAYOFF_BEFORE_SETUP');
  const sb = countRule(shuff, 'PAYOFF_BEFORE_SETUP');
  if (ib > 0) intactAny++;
  if (rb > 0) relocAny++;
  if (sb > 0) shuffAny++;
  processed++;
  console.log(
    f.slice(0,36).padEnd(38),
    '|', String(ib).padStart(18),
    '|', String(rb).padStart(18),
    '|', String(sb).padStart(18),
    `| ${(intact.health??0).toFixed(1)} -> ${(reloc.health??0).toFixed(1)} -> ${(shuff.health??0).toFixed(1)}`
  );
}
console.log('\n=== D6 SIGNAL-EXISTENCE RESULT ===');
console.log(`scripts processed: ${processed}`);
console.log(`PAYOFF_BEFORE_SETUP fires on INTACT:        ${intactAny}/${processed}`);
console.log(`PAYOFF_BEFORE_SETUP fires on RELOCATED:    ${relocAny}/${processed}`);
console.log(`PAYOFF_BEFORE_SETUP fires on SHUFFLED:     ${shuffAny}/${processed}`);
console.log('\nInterpretation:');
console.log('  If reloc/shuff >> intact: D6 created real structural signal (the rule notices reorder).');
console.log('  If all ~equal or all 0:   D6 is reachable but not order-sensitive on produced features.');
