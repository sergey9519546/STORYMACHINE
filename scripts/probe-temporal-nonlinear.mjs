// PROBE — companion to scripts/probe-temporal-order-sensitivity.mjs, run over
// tests/fixtures/nonlinear-timeline/ instead of the 30-script sample that
// probe used. docs/p1-benchmark/TEMPORAL_ORDER_SENSITIVITY_2026-08-03.md
// found that sample contained ZERO scripts using FLASHBACK or MEANWHILE in
// any scene heading, so temporal-consistency.ts's actual semantic purpose
// (detecting a violated non-linear timeline) was never exercised. This probe
// answers the doc's own stated next step: when a script that genuinely USES
// non-linear markers is shuffled, do EXPLICIT-marker contradictions appear?
//
// Does NOT modify probe-temporal-order-sensitivity.mjs, temporal-
// consistency.ts, or doctor.ts. Degradations (degradeShuffle,
// degradeMidpointDrop, degradeClimaxRelocate) and the (a)/(b) classification
// are copied VERBATIM from that probe (which itself copies them verbatim
// from scripts/measure-auc-split.mjs) -- not reimplemented, so this probe
// damages scripts identically to the real AUC harness and classifies
// contradictions identically to the sibling probe.
//
// Run:  node --experimental-strip-types scripts/probe-temporal-nonlinear.mjs
// Writes: scripts/output/temporal-nonlinear.json (raw per-fixture data)
// Prints: summary tables to stdout, same report shape as the sibling probe.
//
// HONESTY BAR: n=6 fixtures x 3 degradations = 18 pairs per polarity/bucket
// combination below. n is stated beside every number. These are AUTHORED,
// HAND-BUILT fixtures -- an existence/mechanism test (can the mechanism
// separate AT ALL on material that uses its own markers), NOT corpus
// evidence about real screenwriting. AUC is reported only where n>=10 pairs
// exist, per the same rule the sibling probe uses; with n=18 per pooled
// degradation set and n=6 per single degradation, only the POOLED statistics
// clear that bar -- each individual degradation's n=6 is reported as
// win/tie/loss only, same as the sibling probe would for any degradation
// under 10 pairs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { auditTemporalConsistency } from '../server/nvm/analyze/temporal-consistency.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'scripts', 'output');
const OUT_FILE = path.join(OUT_DIR, 'temporal-nonlinear.json');

// ── Degradations — copied VERBATIM from scripts/probe-temporal-order-sensitivity.mjs
// (itself copied verbatim from scripts/measure-auc-split.mjs). Do not
// "improve" these here — the whole point of the probe is to test the SAME
// degradation the real AUC harness applies.
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

// ── Load material: ONLY tests/fixtures/nonlinear-timeline/ ─────────────────
const scripts = [];
const fixturesDir = path.join(ROOT, 'tests', 'fixtures', 'nonlinear-timeline');
const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.fountain')).sort();
for (const f of fixtureFiles) {
  const group = f.startsWith('flashback-') ? 'flashback-framed'
    : f.startsWith('parallel-') ? 'parallel-action'
    : f.startsWith('mixed-') ? 'mixed'
    : 'unknown';
  scripts.push({
    id: `tests/fixtures/nonlinear-timeline/${f}`,
    group,
    text: fs.readFileSync(path.join(fixturesDir, f), 'utf-8'),
  });
}

console.log(`Loaded ${scripts.length} fixtures from tests/fixtures/nonlinear-timeline/`);
console.log(`  (2 flashback-framed, 2 parallel-action, 2 mixed — per the task spec)`);
console.log('');
console.log('HONESTY BAR: these are AUTHORED, hand-built fixtures — an existence/');
console.log('mechanism test (does the mechanism separate at all on material that uses');
console.log('its own markers), NOT corpus evidence about real screenwriting. n=6 per');
console.log('degradation (below the n>=10 AUC threshold), n=18 pooled across the 3');
console.log('degradations (clears it). See this file\'s header for the full framing.');
console.log('');

// ── Contradiction classification: (a) bookkeeping-only vs (b) explicit-marker
// — copied verbatim (same semantics) from probe-temporal-order-sensitivity.mjs.
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

// ── Run: clean baseline + each degradation, per fixture ─────────────────────
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

// ── Report: clean-fixture false-positive rate (must be 0/6 — locked in by
// the additive test suite; this is a live re-confirmation, not a duplicate
// of the unit test) ──────────────────────────────────────────────────────
const usableClean = results.filter(r => !r.clean.error);
const cleanWithAny = usableClean.filter(r => r.clean.contradictionCount > 0);

console.log('═══════════════════════════════════════════════════════════════');
console.log(`CLEAN-FIXTURE FALSE-POSITIVE RATE (n=${usableClean.length} usable of ${results.length} loaded)`);
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Fixtures with >=1 contradiction on UNMODIFIED text: ${cleanWithAny.length}/${usableClean.length} (must be 0/6)`);
if (cleanWithAny.length > 0) {
  console.log('\nUNEXPECTED — clean fixtures with contradictions (these should have been');
  console.log('caught by the additive test suite; investigate before trusting this run):');
  for (const r of cleanWithAny) {
    console.log(`  ${r.id}: ${r.clean.contradictionCount} contradiction(s)`);
    for (const c of r.clean.contradictions) console.log(`    - [${c.severity}] ${c.explanation}`);
  }
}
if (results.some(r => r.clean.error)) {
  console.log('\nFixtures that failed to analyze (excluded from stats):');
  for (const r of results.filter(r => r.clean.error)) console.log(`  ${r.id}: ${r.clean.error}`);
}

// ── Report: per-fixture, per-degradation movement ────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('PER-FIXTURE / PER-DEGRADATION MOVEMENT (clean count -> degraded count)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('id | group | degradation | clean | degraded | direction | clean(a/b) -> degraded(a/b)');
console.log('---|-------|-------------|-------|----------|-----------|------------------------------');
for (const r of results) {
  if (r.clean.error) continue;
  for (const d of DEGRADATIONS) {
    const dr = r.degradations[d.id];
    if (dr.skipped) {
      console.log(`${r.id} | ${r.group} | ${d.id} | ${r.clean.contradictionCount} | SKIPPED (${dr.reason}) | - | -`);
      continue;
    }
    if (dr.error) {
      console.log(`${r.id} | ${r.group} | ${d.id} | ${r.clean.contradictionCount} | ERROR: ${dr.error} | - | -`);
      continue;
    }
    const cleanN = r.clean.contradictionCount;
    const degN = dr.contradictionCount;
    const dir = degN > cleanN ? 'MORE' : degN < cleanN ? 'FEWER' : 'SAME';
    console.log(`${r.id} | ${r.group} | ${d.id} | ${cleanN} | ${degN} | ${dir} | (${r.clean.buckets.bookkeeping}/${r.clean.buckets.explicit}) -> (${dr.buckets.bookkeeping}/${dr.buckets.explicit})`);
  }
}

// ── Rank statistic — same polarity convention as the sibling probe: a real
// order-sensitivity signal should produce MORE contradictions on the
// degraded (reordered) text than on the clean text. "correct" = degraded
// count > clean count. ───────────────────────────────────────────────────
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
console.log('This is the number that actually answers the task question: does a');
console.log('FLASHBACK/MEANWHILE-using script produce MORE explicit-marker');
console.log('contradictions once shuffled? (Bucket (a) bookkeeping-only was 0 in');
console.log('every run in the prior 30-script probe, by construction — see that');
console.log('doc\'s (a)/(b) split section — so this and the total-count table above');
console.log('should track closely unless bucket (a) fires for the first time here.)');
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

console.log(`\nRaw per-fixture/per-degradation data written to ${path.relative(ROOT, OUT_FILE)}`);
console.log('\nReminder: n=6 fixtures, hand-authored — an existence/mechanism test,');
console.log('not corpus evidence. See TEMPORAL_ORDER_SENSITIVITY_2026-08-03.md\'s');
console.log('2026-08-03 addendum for the honesty-bar framing of this result.');
