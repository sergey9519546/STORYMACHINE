// ORDER-SENSITIVITY PROBE — server/nvm/analyze/question-latency-deduction.ts
// (the UNWIRED P1 candidate that re-routes payoff.ts's question-latency
// rules into a bounded structural deduction; see that module's header and
// docs/p1-benchmark/STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md, candidate 5).
//
// ── What this checks ──────────────────────────────────────────────────────
// Extends scripts/probe-interscene-candidates.mjs's pattern (candidate 5,
// "question-answer latency") to the REAL computeQuestionLatencyDeduction
// function (that probe's candidateQuestionLatency() only computed raw
// stats — no deduction formula existed yet when it ran) and to the wider
// 30-script in-repo corpus: the 20 band-labeled calibration samples
// (server/nvm/analyze/calibration/corpus.ts), the 6 CC0 screenplays
// (data/screenplays/), AND the 4 structural-form-experiment fixtures
// (tests/fixtures/structural-form-experiment/) — the same 30-script set
// scripts/probe-truth-order-sensitivity.mjs and
// scripts/probe-temporal-order-sensitivity.mjs already use for this kind of
// check. Does NOT modify probe-interscene-candidates.mjs.
//
// Degradation functions (degradeShuffle/degradeMidpointDrop/
// degradeClimaxRelocate) are copied VERBATIM from scripts/measure-auc-
// split.mjs, per the pattern every probe in this family follows, so this
// probe damages scripts identically to the real AUC harness.
//
// ── Why two reports (gated vs ungated) ──────────────────────────────────
// The shipped deduction gates on a 15-scene floor (mirrors doctor.ts's
// ARC_DED_MIN_SCENES) specifically so the calibration corpus scores
// byte-identically if this is ever wired. But EVERY one of the 30 in-repo
// scripts here runs 9-16 scenes — most below that floor by construction
// (see the module header: this is exactly why the floor was chosen). A
// probe that only reported the gated, as-shipped deduction would therefore
// report near-total ties and call that "no signal," which would be
// dishonest — the floor, not the signal, is what's flattening the result.
// So this probe reports BOTH:
//   (A) GATED — the real computeQuestionLatencyDeduction() output, exactly
//       as it would behave if wired today. Expect near-total gate failure
//       on this corpus; that is a known, designed property, not a finding.
//   (B) UNGATED-RATE — the underlying unresolvedRate statistic alone
//       (module-internal, no scene-count floor, no question-count floor),
//       to ask the real question this probe exists to answer: does the
//       MECHANISM move under degradation at all, independent of the
//       feature-scale gates that exist for a different reason (calibration
//       compatibility) than signal quality.
// Neither replaces a real-corpus run. Both report n beside every number.
//
// ── Run ────────────────────────────────────────────────────────────────────
//   node scripts/probe-question-latency-deduction.mjs
// Writes scripts/output/probe-question-latency-deduction.json (guarded).

import fs from 'node:fs';
import path from 'node:path';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { computeQuestionLatencyDeduction } from '../server/nvm/analyze/question-latency-deduction.ts';
import { REFERENCE_CORPUS } from '../server/nvm/analyze/calibration/corpus.ts';
import { guardedWrite } from './lib/output-guard.mjs';

const OUT_DIR = 'scripts/output';
const OUT_FILE = path.join(OUT_DIR, 'probe-question-latency-deduction.json');

// ── Corpus assembly — 20 calibration + 6 fountain + 4 structural-form ──────
const scripts = [];
for (const s of REFERENCE_CORPUS) {
  scripts.push({ id: `calibration:${s.label}`, band: s.band, source: 'calibration', text: s.fountain });
}
const SCREENPLAY_DIR = 'data/screenplays';
for (const file of fs.readdirSync(SCREENPLAY_DIR).filter(f => f.endsWith('.fountain'))) {
  scripts.push({
    id: `fountain:${file}`,
    band: null,
    source: 'fountain',
    text: fs.readFileSync(path.join(SCREENPLAY_DIR, file), 'utf-8'),
  });
}
const FIXTURE_DIR = 'tests/fixtures/structural-form-experiment';
for (const file of fs.readdirSync(FIXTURE_DIR).filter(f => f.endsWith('.fountain'))) {
  scripts.push({
    id: `structural-form-experiment:${file}`,
    band: null,
    source: 'structural-form-experiment',
    text: fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf-8'),
  });
}
console.log(`Loaded ${scripts.length} scripts (${REFERENCE_CORPUS.length} calibration + ` +
  `${scripts.filter(s => s.source === 'fountain').length} fountain + ` +
  `${scripts.filter(s => s.source === 'structural-form-experiment').length} structural-form-experiment).`);

// ── Degradations — VERBATIM copy from scripts/measure-auc-split.mjs ────────
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

// ── Measurement loop ─────────────────────────────────────────────────────
// pairsByDeg[degradationId] = array of { script, cleanScenes, cleanRaised,
//   cleanUnresolvedRate, cleanDeduction, cleanGated, degScenes, degRaised,
//   degUnresolvedRate, degDeduction, degGated }
const pairsByDeg = {};
for (const d of DEGRADATIONS) pairsByDeg[d.id] = [];

let scriptsWithQuestionsOnClean = 0;
let scriptsAnalyzed = 0;

for (const script of scripts) {
  let cleanAnalysis;
  try { cleanAnalysis = analyzeFountainText(script.text); }
  catch (e) { console.warn(`SKIP ${script.id}: analyzeFountainText threw on clean text: ${e.message}`); continue; }
  if (!cleanAnalysis.sceneCount || cleanAnalysis.sceneCount < 3) {
    console.warn(`SKIP ${script.id}: only ${cleanAnalysis.sceneCount ?? 0} scenes`);
    continue;
  }
  scriptsAnalyzed++;
  const cleanQL = computeQuestionLatencyDeduction(cleanAnalysis.records);
  if (cleanQL.raised > 0) scriptsWithQuestionsOnClean++;

  for (const d of DEGRADATIONS) {
    const degradedText = d.fn(script.text);
    if (degradedText === null) continue; // scene-count floor for this degradation not met
    let degAnalysis;
    try { degAnalysis = analyzeFountainText(degradedText); }
    catch (e) { console.warn(`SKIP ${script.id}/${d.id}: analyzeFountainText threw on degraded text: ${e.message}`); continue; }
    const degQL = computeQuestionLatencyDeduction(degAnalysis.records);

    pairsByDeg[d.id].push({
      script: script.id,
      cleanScenes: cleanAnalysis.sceneCount, degScenes: degAnalysis.sceneCount,
      cleanRaised: cleanQL.raised, degRaised: degQL.raised,
      cleanUnresolvedRate: cleanQL.unresolvedRate, degUnresolvedRate: degQL.unresolvedRate,
      cleanDeduction: cleanQL.deduction, degDeduction: degQL.deduction,
      cleanGated: cleanQL.gated, degGated: degQL.gated,
    });
  }
}

// ── Scoring helpers (win/tie/loss + pairwise AUC over paired stats) ────────
function winTieLoss(pairs, cleanKey, degKey, higherIsWorse) {
  let win = 0, tie = 0, loss = 0;
  for (const p of pairs) {
    const c = cleanKey(p);
    const d = degKey(p);
    if (c === null || d === null || Number.isNaN(c) || Number.isNaN(d)) continue;
    const diff = higherIsWorse ? d - c : c - d;
    if (diff > 0) win++;
    else if (diff === 0) tie++;
    else loss++;
  }
  return { win, tie, loss, n: win + tie + loss };
}
function pairwiseAucFromDiffs(pairs, cleanKey, degKey, higherIsWorse) {
  let correct = 0, n = 0;
  for (const p of pairs) {
    const c = cleanKey(p);
    const d = degKey(p);
    if (c === null || d === null || Number.isNaN(c) || Number.isNaN(d)) continue;
    n++;
    const worseIsD = higherIsWorse ? d > c : d < c;
    const tie = d === c;
    if (worseIsD) correct += 1;
    else if (tie) correct += 0.5;
  }
  return n > 0 ? { auc: correct / n, n } : { auc: NaN, n: 0 };
}
function verdictFor(wtl, aucInfo) {
  const { win, loss, n } = wtl;
  if (n === 0) return 'NO VALID PAIRS (n=0)';
  const moveFrac = (win + loss) / n;
  if (moveFrac < 0.15) return `BARELY MOVES (moved ${win + loss}/${n})`;
  const winFrac = win / n;
  if (aucInfo && aucInfo.n >= 10) {
    if (aucInfo.auc >= 0.75) return `PROMISING (AUC ${aucInfo.auc.toFixed(3)}, n=${aucInfo.n})`;
    if (aucInfo.auc >= 0.60) return `WEAK (AUC ${aucInfo.auc.toFixed(3)}, n=${aucInfo.n})`;
    if (aucInfo.auc <= 0.45) return `WRONG DIRECTION (AUC ${aucInfo.auc.toFixed(3)}, n=${aucInfo.n})`;
    return `NEAR CHANCE (AUC ${aucInfo.auc.toFixed(3)}, n=${aucInfo.n})`;
  }
  if (winFrac >= 0.70) return `PROMISING-ish but n<10, AUC NOT COMPUTED (win ${win}/${n})`;
  if (winFrac >= 0.55) return `WEAK, n<10, AUC NOT COMPUTED (win ${win}/${n})`;
  return `WEAK-leaning, n<10, AUC NOT COMPUTED (win ${win}/${n})`;
}

// ── Report ───────────────────────────────────────────────────────────────
const report = {
  generatedAt: new Date().toISOString(),
  scriptCount: scripts.length,
  scriptsAnalyzed,
  candidate5Coverage: { scriptsWithQuestionsOnClean, scriptsAnalyzed },
  degradations: {},
};

console.log(`\nCoverage: ${scriptsWithQuestionsOnClean}/${scriptsAnalyzed} scripts raised >=1 substantive ` +
  `question on the CLEAN text (a 0-question script contributes no signal to either report below).`);

console.log('\n=== (A) GATED — computeQuestionLatencyDeduction() exactly as shipped ===');
console.log('Expect heavy gate failure on this corpus: all 20 calibration samples run 9-10 scenes and');
console.log('all 6 fountain scripts run 9-12 scenes — below the 15-scene floor by construction (the floor');
console.log('exists so the calibration corpus stays byte-identical if this is ever wired). Only the two');
console.log('16-scene structural-form-experiment fixtures can clear the scene gate at all on this corpus.');
for (const d of DEGRADATIONS) {
  const pairs = pairsByDeg[d.id];
  const bothGated = pairs.filter(p => p.cleanGated && p.degGated);
  const wtl = winTieLoss(bothGated, p => p.cleanDeduction, p => p.degDeduction, true);
  const aucInfo = pairwiseAucFromDiffs(bothGated, p => p.cleanDeduction, p => p.degDeduction, true);
  const verdict = verdictFor(wtl, aucInfo);
  console.log(`  ${d.id.padEnd(18)} pairs=${String(pairs.length).padStart(2)}  both-gated=${String(bothGated.length).padStart(2)}  ` +
    `win/tie/loss=${wtl.win}/${wtl.tie}/${wtl.loss}  -> ${verdict}`);
  report.degradations[d.id] = {
    gated: { totalPairs: pairs.length, bothGatedPairs: bothGated.length, winTieLoss: wtl, auc: aucInfo, verdict },
  };
}

console.log('\n=== (B) UNGATED-RATE — module-internal unresolvedRate, no scene/question floor ===');
console.log('Asks whether the underlying mechanism moves at all, independent of the shipped feature-scale');
console.log('gates. Per the 2026-08-03 screen doc, expect UNDERPOWERED (not refuted): most calibration');
console.log('samples raise 0-2 questions in 300-360 words, so most pairs tie at null/null or 0/0.');
for (const d of DEGRADATIONS) {
  const pairs = pairsByDeg[d.id];
  const wtl = winTieLoss(pairs, p => p.cleanUnresolvedRate, p => p.degUnresolvedRate, true);
  const aucInfo = pairwiseAucFromDiffs(pairs, p => p.cleanUnresolvedRate, p => p.degUnresolvedRate, true);
  const verdict = verdictFor(wtl, aucInfo);
  console.log(`  ${d.id.padEnd(18)} pairs=${String(pairs.length).padStart(2)}  win/tie/loss=${wtl.win}/${wtl.tie}/${wtl.loss}  -> ${verdict}`);
  report.degradations[d.id].ungatedRate = { totalPairs: pairs.length, winTieLoss: wtl, auc: aucInfo, verdict };
}

// Full per-pair rows for anyone who wants to inspect exact scripts, not just aggregates.
report.pairs = pairsByDeg;

let existingScriptCount;
if (fs.existsSync(OUT_FILE)) {
  try {
    existingScriptCount = JSON.parse(fs.readFileSync(OUT_FILE, 'utf-8')).scriptCount;
  } catch { /* malformed/missing existing file — let guardedWrite fall back */ }
}
guardedWrite(OUT_FILE, JSON.stringify(report, null, 2), {
  rowCount: report.scriptCount,
  existingRowCount: existingScriptCount,
});

console.log('\nHONESTY NOTE: this is a 30-script in-repo probe (20 calibration samples + 6 CC0');
console.log('screenplays + 4 structural-form-experiment fixtures), NOT the 761-script P1 real-writing');
console.log('corpus. No number above is a P1 gate result or a wiring decision. The maintainer\'s local');
console.log('`node scripts/measure-auc-split.mjs --partition=train --with-question-latency-deduction`');
console.log('run against the real corpus is the evidence that can actually settle whether to wire this.');
