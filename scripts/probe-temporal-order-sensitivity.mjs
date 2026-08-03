// PROBE — does temporal-consistency.ts's contradiction output actually move
// when scenes are reordered, and if so, is that movement "understanding"
// (explicit FLASHBACK/CONTINUOUS/MEANWHILE/LATER markers) or "bookkeeping"
// (the default sequential 'before' chain that exists between every scene
// regardless of content)?
//
// Answers ONE question cheaply, using the extractor that already exists
// (extractTemporalConstraints / auditTemporalConsistency in
// server/nvm/analyze/temporal-consistency.ts) and the SAME degradations the
// real P1 harness uses (scripts/measure-auc-split.mjs's degradeShuffle /
// degradeMidpointDrop / degradeClimaxRelocate, copied verbatim below — not
// reimplemented).
//
// Run:  node scripts/probe-temporal-order-sensitivity.mjs
// Writes: scripts/output/temporal-order-sensitivity.json (raw per-script data)
// Prints: summary tables to stdout.
//
// Does NOT modify server/nvm/analyze/doctor.ts, temporal-consistency.ts, or
// the health/verdict score in any way — diagnostic probe only, per the P1
// gate (measure-before-threshold; no scoring change without real-corpus
// evidence and a human `npm run measure-real` pass).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { auditTemporalConsistency } from '../server/nvm/analyze/temporal-consistency.ts';
import { REFERENCE_CORPUS } from '../server/nvm/analyze/calibration/corpus.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'scripts', 'output');
const OUT_FILE = path.join(OUT_DIR, 'temporal-order-sensitivity.json');

// ── Degradations — copied VERBATIM from scripts/measure-auc-split.mjs ──────
// (mulberry32, segmentScenes, reassemble, degradeShuffle, degradeMidpointDrop,
// degradeClimaxRelocate). Do not "improve" these here — the whole point of
// the probe is to test the SAME degradation the real AUC harness applies.
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

// ── Load material ────────────────────────────────────────────────────────
const scripts = [];

// 1. Real CC0 screenplays in data/screenplays/
const screenplaysDir = path.join(ROOT, 'data', 'screenplays');
const screenplayFiles = fs.readdirSync(screenplaysDir).filter(f => f.endsWith('.fountain')).sort();
for (const f of screenplayFiles) {
  scripts.push({
    id: `data/screenplays/${f}`,
    group: 'real-cc0-screenplay',
    text: fs.readFileSync(path.join(screenplaysDir, f), 'utf-8'),
  });
}

// 2. Structural-form-experiment fixtures
const fixturesDir = path.join(ROOT, 'tests', 'fixtures', 'structural-form-experiment');
const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.fountain')).sort();
for (const f of fixtureFiles) {
  scripts.push({
    id: `tests/fixtures/structural-form-experiment/${f}`,
    group: 'structural-form-fixture',
    text: fs.readFileSync(path.join(fixturesDir, f), 'utf-8'),
  });
}

// 3. Band-labeled calibration corpus (20 samples)
for (const sample of REFERENCE_CORPUS) {
  scripts.push({
    id: `calibration/${sample.label}`,
    group: `calibration-${sample.band}`,
    text: sample.fountain,
  });
}

console.log(`Loaded ${scripts.length} scripts:`);
console.log(`  ${screenplayFiles.length} real CC0 screenplays (data/screenplays/)`);
console.log(`  ${fixtureFiles.length} structural-form-experiment fixtures (tests/fixtures/structural-form-experiment/)`);
console.log(`  ${REFERENCE_CORPUS.length} band-labeled calibration samples (server/nvm/analyze/calibration/corpus.ts)`);
console.log('');

// ── Contradiction classification: (a) bookkeeping-only vs (b) explicit-marker ──
// A contradiction is (a) "bookkeeping-only" iff EVERY constraint cited in it
// carries the default sequential-chain evidence string ('Sequential scene
// order') with nothing else contributing. It is (b) "explicit-marker" iff AT
// LEAST ONE cited constraint's evidence is anything else — i.e. traces back
// to a FLASHBACK/CONTINUOUS/MEANWHILE marker, or a LATER-marker confidence
// bump (extractTemporalConstraints overwrites the sequential constraint's
// evidence field with the LATER match text in that one case — see the
// "LATER / DAYS LATER / YEARS LATER" branch). A contradiction with zero
// cited constraints (can occur for the plain self-loop cyclic_dependency
// check, which does not populate `constraints`) is bucketed separately as
// "indeterminate" rather than silently folded into (a).
function classifyContradiction(c) {
  if (!c.constraints || c.constraints.length === 0) return 'indeterminate';
  const allSequentialOnly = c.constraints.every(con => con.evidence === 'Sequential scene order');
  return allSequentialOnly ? 'bookkeeping' : 'explicit';
}

function runAudit(text) {
  let analysis;
  try {
    analysis = analyzeFountainText(text);
  } catch (err) {
    return { error: `analyzeFountainText threw: ${err.message}` };
  }
  if (!analysis.records || analysis.records.length === 0) {
    return { error: 'no scene records produced' };
  }
  let contradictions;
  try {
    contradictions = auditTemporalConsistency(analysis.records);
  } catch (err) {
    return { error: `auditTemporalConsistency threw: ${err.message}` };
  }
  const buckets = { bookkeeping: 0, explicit: 0, indeterminate: 0 };
  for (const c of contradictions) buckets[classifyContradiction(c)]++;
  return {
    sceneCount: analysis.sceneCount,
    contradictionCount: contradictions.length,
    buckets,
    contradictions: contradictions.map(c => ({
      type: c.type,
      severity: c.severity,
      explanation: c.explanation,
      affectedScenes: c.affectedScenes,
      classification: classifyContradiction(c),
    })),
  };
}

// ── Run: clean baseline + each degradation, per script ──────────────────────
const results = [];
for (const s of scripts) {
  const clean = runAudit(s.text);
  const degradations = {};
  for (const d of DEGRADATIONS) {
    const degradedText = d.fn(s.text);
    if (degradedText === null) {
      degradations[d.id] = { skipped: true, reason: 'too few scenes for this degradation' };
      continue;
    }
    degradations[d.id] = runAudit(degradedText);
  }
  results.push({ id: s.id, group: s.group, clean, degradations });
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));

// ── Report: false-positive rate on clean scripts ────────────────────────────
const usableClean = results.filter(r => !r.clean.error);
const cleanWithAny = usableClean.filter(r => r.clean.contradictionCount > 0);
const cleanWithExplicit = usableClean.filter(r => r.clean.buckets.explicit > 0);
const cleanWithBookkeepingOnly = usableClean.filter(r => r.clean.buckets.explicit === 0 && r.clean.buckets.bookkeeping > 0);

console.log('═══════════════════════════════════════════════════════════════');
console.log('CLEAN-SCRIPT FALSE-POSITIVE RATE (n=' + usableClean.length + ' usable of ' + results.length + ' loaded)');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Scripts with >=1 contradiction on UNMODIFIED text: ${cleanWithAny.length}/${usableClean.length}`);
console.log(`  — of which driven by an EXPLICIT marker (b):     ${cleanWithExplicit.length}/${usableClean.length}`);
console.log(`  — of which bookkeeping-only, no explicit marker: ${cleanWithBookkeepingOnly.length}/${usableClean.length}`);
if (cleanWithAny.length > 0) {
  console.log('\nClean scripts with contradictions:');
  for (const r of cleanWithAny) {
    console.log(`  ${r.id}: ${r.clean.contradictionCount} contradiction(s) (bookkeeping=${r.clean.buckets.bookkeeping}, explicit=${r.clean.buckets.explicit}, indeterminate=${r.clean.buckets.indeterminate})`);
  }
}
if (results.some(r => r.clean.error)) {
  console.log('\nScripts that failed to analyze (excluded from stats):');
  for (const r of results.filter(r => r.clean.error)) console.log(`  ${r.id}: ${r.clean.error}`);
}

// ── Report: per-script, per-degradation movement ────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('PER-SCRIPT / PER-DEGRADATION MOVEMENT (clean count -> degraded count)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('id | degradation | clean | degraded | direction | clean(a/b) -> degraded(a/b)');
console.log('---|-------------|-------|----------|-----------|------------------------------');
for (const r of results) {
  if (r.clean.error) continue;
  for (const d of DEGRADATIONS) {
    const dr = r.degradations[d.id];
    if (dr.skipped) {
      console.log(`${r.id} | ${d.id} | ${r.clean.contradictionCount} | SKIPPED (${dr.reason}) | - | -`);
      continue;
    }
    if (dr.error) {
      console.log(`${r.id} | ${d.id} | ${r.clean.contradictionCount} | ERROR: ${dr.error} | - | -`);
      continue;
    }
    const cleanN = r.clean.contradictionCount;
    const degN = dr.contradictionCount;
    const dir = degN > cleanN ? 'MORE' : degN < cleanN ? 'FEWER' : 'SAME';
    console.log(`${r.id} | ${d.id} | ${cleanN} | ${degN} | ${dir} | (${r.clean.buckets.bookkeeping}/${r.clean.buckets.explicit}) -> (${dr.buckets.bookkeeping}/${dr.buckets.explicit})`);
  }
}

// ── Rank statistic ───────────────────────────────────────────────────────
// Positive polarity here is the OPPOSITE of the health-score AUC harness:
// a real order-sensitivity signal should produce MORE contradictions on the
// degraded (reordered) text than on the clean text. So "correct" = degraded
// count > clean count (not < as in a health-score AUC).
function pairwiseAucMoreIsDegraded(pairs) {
  if (pairs.length === 0) return NaN;
  let correct = 0;
  for (const { clean, degraded } of pairs) {
    if (degraded > clean) correct += 1;
    else if (degraded === clean) correct += 0.5;
  }
  return correct / pairs.length;
}
function winTieLoss(pairs) {
  let win = 0, tie = 0, loss = 0;
  for (const { clean, degraded } of pairs) {
    if (degraded > clean) win++;
    else if (degraded === clean) tie++;
    else loss++;
  }
  return { win, tie, loss };
}

const pairsByDeg = {};
const pairsByDegExplicitOnly = {};
for (const d of DEGRADATIONS) { pairsByDeg[d.id] = []; pairsByDegExplicitOnly[d.id] = []; }
for (const r of results) {
  if (r.clean.error) continue;
  for (const d of DEGRADATIONS) {
    const dr = r.degradations[d.id];
    if (dr.skipped || dr.error) continue;
    pairsByDeg[d.id].push({ id: r.id, clean: r.clean.contradictionCount, degraded: dr.contradictionCount });
    pairsByDegExplicitOnly[d.id].push({ id: r.id, clean: r.clean.buckets.explicit, degraded: dr.buckets.explicit });
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('RANK STATISTIC — TOTAL CONTRADICTION COUNT (bookkeeping + explicit)');
console.log('═══════════════════════════════════════════════════════════════');
const allPairsTotal = [];
for (const d of DEGRADATIONS) {
  const pairs = pairsByDeg[d.id];
  const wtl = winTieLoss(pairs);
  allPairsTotal.push(...pairs);
  if (pairs.length >= 10) {
    const auc = pairwiseAucMoreIsDegraded(pairs);
    console.log(`${d.id}: n=${pairs.length} AUC(more-is-degraded)=${auc.toFixed(3)} | win=${wtl.win} tie=${wtl.tie} loss=${wtl.loss}`);
  } else {
    console.log(`${d.id}: n=${pairs.length} — TOO FEW PAIRS FOR AUC (need >=10); win=${wtl.win} tie=${wtl.tie} loss=${wtl.loss}`);
  }
}
if (allPairsTotal.length >= 10) {
  const auc = pairwiseAucMoreIsDegraded(allPairsTotal);
  const wtl = winTieLoss(allPairsTotal);
  console.log(`POOLED (all 3 degradations): n=${allPairsTotal.length} AUC(more-is-degraded)=${auc.toFixed(3)} | win=${wtl.win} tie=${wtl.tie} loss=${wtl.loss}`);
} else {
  const wtl = winTieLoss(allPairsTotal);
  console.log(`POOLED (all 3 degradations): n=${allPairsTotal.length} — TOO FEW PAIRS FOR AUC (need >=10); win=${wtl.win} tie=${wtl.tie} loss=${wtl.loss}`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('RANK STATISTIC — EXPLICIT-MARKER CONTRADICTIONS ONLY (bucket b)');
console.log('═══════════════════════════════════════════════════════════════');
const allPairsExplicit = [];
for (const d of DEGRADATIONS) {
  const pairs = pairsByDegExplicitOnly[d.id];
  const wtl = winTieLoss(pairs);
  allPairsExplicit.push(...pairs);
  if (pairs.length >= 10) {
    const auc = pairwiseAucMoreIsDegraded(pairs);
    console.log(`${d.id}: n=${pairs.length} AUC(more-is-degraded)=${auc.toFixed(3)} | win=${wtl.win} tie=${wtl.tie} loss=${wtl.loss}`);
  } else {
    console.log(`${d.id}: n=${pairs.length} — TOO FEW PAIRS FOR AUC (need >=10); win=${wtl.win} tie=${wtl.tie} loss=${wtl.loss}`);
  }
}
if (allPairsExplicit.length >= 10) {
  const auc = pairwiseAucMoreIsDegraded(allPairsExplicit);
  const wtl = winTieLoss(allPairsExplicit);
  console.log(`POOLED (all 3 degradations): n=${allPairsExplicit.length} AUC(more-is-degraded)=${auc.toFixed(3)} | win=${wtl.win} tie=${wtl.tie} loss=${wtl.loss}`);
} else {
  const wtl = winTieLoss(allPairsExplicit);
  console.log(`POOLED (all 3 degradations): n=${allPairsExplicit.length} — TOO FEW PAIRS FOR AUC (need >=10); win=${wtl.win} tie=${wtl.tie} loss=${wtl.loss}`);
}

console.log(`\nRaw per-script/per-degradation data written to ${path.relative(ROOT, OUT_FILE)}`);
