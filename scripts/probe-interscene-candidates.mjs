// FALSIFICATION SCREEN — inter-scene candidate signals for structural
// discrimination (P1). See docs/p1-benchmark/STRUCTURAL_SIGNAL_DIAGNOSIS_
// 2026-07-29.md for the root-cause diagnosis this responds to: every field
// on ScreenplaySceneRecord is computed from that scene's OWN text, so
// reordering scenes preserves every field and no formula on them can detect
// CLIMAX_RELOCATE (test AUC 0.523 — chance). This script does NOT implement
// a fix. It cheaply tests, BEFORE anyone implements anything, whether five
// candidate inter-scene signals actually MOVE under the three degradations
// that expose the blindness (SCENE_SHUFFLE, MIDPOINT_DROP, CLIMAX_RELOCATE),
// on the only material available in this container:
//   - the 20 band-labeled calibration samples (server/nvm/analyze/
//     calibration/corpus.ts) — controlled-richness design, READ ONLY here.
//   - the 6 CC0 screenplays in data/screenplays/*.fountain.
// The 761-script real corpus used for the P1 baseline is NOT in this
// container (local-only, copyright) — this is a 26-script falsification
// screen, NOT a P1 gate measurement. Every statistic below states n beside
// it for that reason.
//
// Degradation functions (degradeShuffle/degradeMidpointDrop/
// degradeClimaxRelocate) are copied VERBATIM from scripts/measure-auc-
// split.mjs — do not re-invent them, per orchestrator instruction.
//
// Run: node scripts/probe-interscene-candidates.mjs
// Writes only to scripts/output/ — no server/ or src/ files touched.

import fs from 'node:fs';
import path from 'node:path';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { REFERENCE_CORPUS } from '../server/nvm/analyze/calibration/corpus.ts';

const OUT_DIR = 'scripts/output';
const OUT_FILE = path.join(OUT_DIR, 'probe-interscene-candidates.json');

// ── Corpus assembly ──────────────────────────────────────────────────────
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
console.log(`Loaded ${scripts.length} scripts (${REFERENCE_CORPUS.length} calibration + ${scripts.length - REFERENCE_CORPUS.length} fountain).`);

// ── Degradations — VERBATIM copy from scripts/measure-auc-split.mjs ─────────
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

// ── Candidate-signal helpers (new — probe-only, not analyzer code) ─────────

// Candidate 1: scene-to-scene intensity delta, built on records[].suspenseDelta.
function candidateIntensityDelta(records) {
  const sd = records.map(r => r.suspenseDelta ?? 0);
  if (sd.length < 2) return null;
  const absDeltas = [];
  for (let i = 1; i < sd.length; i++) absDeltas.push(Math.abs(sd[i] - sd[i - 1]));
  const mean = absDeltas.reduce((a, b) => a + b, 0) / absDeltas.length;
  const variance = absDeltas.reduce((a, b) => a + (b - mean) ** 2, 0) / absDeltas.length;
  // Monotone-run count: number of maximal consecutive runs where the RAW
  // (signed) delta keeps the same sign (or zero). Fewer, longer runs =
  // smoother build; many short runs = choppy/erratic ordering.
  const signedDeltas = [];
  for (let i = 1; i < sd.length; i++) signedDeltas.push(sd[i] - sd[i - 1]);
  let runs = signedDeltas.length > 0 ? 1 : 0;
  for (let i = 1; i < signedDeltas.length; i++) {
    const prevSign = Math.sign(signedDeltas[i - 1]);
    const curSign = Math.sign(signedDeltas[i]);
    if (curSign !== prevSign) runs++;
  }
  return { meanAbsDelta: mean, varianceAbsDelta: variance, monotoneRuns: runs };
}

// Candidate 2: forward-reference density. Entities = character names
// (established at the scene where their dialogue cue FIRST appears) and
// scene-heading locations (established at the scene whose heading first
// names them). A forward reference is a mention, in scene i's non-cue body
// text, of an entity whose OWN established scene index is > i — i.e. the
// scene talks about someone/somewhere before that person/place is ever
// established as present. This is independent of fountain-analyzer's
// internal clue-lifecycle (which is proven tautological below, candidate 4)
// because "established" here is anchored to CUE LINES / HEADINGS, not to
// "whichever scene happens to mention the token first."
const CUE_LINE_RE = /^[A-Z][A-Z0-9\s\-'.]{1,40}(\s*\([A-Za-z.\s']+\))?$/;
const HEADING_PARSE_RE = /^(?:INT\.|EXT\.|EST\.|INT\/EXT\.)\s*([^-]+?)(?:\s*-\s*.*)?$/;
function parseSceneEntities(scenes) {
  // scenes: [{ heading, body: string[] }]
  const cueNames = scenes.map(s => {
    const names = new Set();
    for (const line of s.body) {
      const t = line.trim();
      if (t.length >= 2 && t.length <= 40 && CUE_LINE_RE.test(t) &&
          !/^(CUT|FADE|SMASH|DISSOLVE|DAY|NIGHT|CONTINUOUS|LATER)/.test(t)) {
        names.add(t.split('(')[0].trim());
      }
    }
    return names;
  });
  const locations = scenes.map(s => {
    const m = HEADING_PARSE_RE.exec(s.heading.trim());
    return m ? m[1].trim().toUpperCase() : null;
  });
  return { cueNames, locations };
}
function candidateForwardReference(scenes) {
  if (scenes.length < 3) return null;
  const { cueNames, locations } = parseSceneEntities(scenes);
  // established[entity] = earliest scene index establishing it
  const established = new Map();
  for (let i = 0; i < scenes.length; i++) {
    for (const name of cueNames[i]) {
      if (!established.has(name)) established.set(name, i);
    }
    if (locations[i] && !established.has(locations[i])) established.set(locations[i], i);
  }
  // Only consider entities with a distinctive-enough name (2+ chars, not a
  // single common word) to keep false-positive substring matches low.
  const entities = [...established.entries()].filter(([name]) => name.length >= 3);
  let forwardRefCount = 0;
  let scenesWithForwardRef = 0;
  for (let i = 0; i < scenes.length; i++) {
    const bodyText = scenes[i].body.join('\n');
    // Strip this scene's own cue lines so an entity speaking IN this scene
    // (which trivially co-occurs with its own established-here entry) isn't
    // double-counted as a forward reference to itself.
    const ownCues = cueNames[i];
    let sceneHasForwardRef = false;
    for (const [name, est] of entities) {
      if (est <= i) continue; // established at or before this scene — not forward
      if (ownCues.has(name)) continue; // this scene establishes it; not a reference
      const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(bodyText)) {
        forwardRefCount++;
        sceneHasForwardRef = true;
      }
    }
    if (sceneHasForwardRef) scenesWithForwardRef++;
  }
  return {
    forwardRefCount,
    scenesWithForwardRef,
    density: forwardRefCount / scenes.length,
  };
}

// Candidate 3: local-context emotional shift, built on records[].emotionalShift.
function candidateEmotionalShift(records) {
  const shifts = records.map(r => r.emotionalShift ?? 'neutral');
  if (shifts.length < 2) return null;
  let sameRuns = 0;
  for (let i = 1; i < shifts.length; i++) if (shifts[i] === shifts[i - 1]) sameRuns++;
  // Transition-matrix entropy over {positive, negative, neutral}.
  const states = ['positive', 'negative', 'neutral'];
  const counts = {};
  for (const a of states) for (const b of states) counts[`${a}>${b}`] = 0;
  for (let i = 1; i < shifts.length; i++) counts[`${shifts[i - 1]}>${shifts[i]}`]++;
  const total = shifts.length - 1;
  let entropy = 0;
  if (total > 0) {
    for (const k of Object.keys(counts)) {
      const p = counts[k] / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
  }
  const neutralFrac = shifts.filter(s => s === 'neutral').length / shifts.length;
  return {
    sameValenceAdjacentRuns: sameRuns,
    // Rate variant, added to distinguish a genuine order effect from the
    // trivial "fewer scenes under MIDPOINT_DROP -> fewer adjacent pairs ->
    // lower raw count" scale artifact the P1 diagnosis already flagged for
    // the scarcity term (140/sceneCount) on other channels.
    sameValenceAdjacentRunsRate: (shifts.length - 1) > 0 ? sameRuns / (shifts.length - 1) : null,
    transitionEntropy: entropy,
    neutralFraction: neutralFrac,
  };
}

// Candidate 4: setup-before-payoff, built on records[].seededClueIds /
// records[].payoffSetupIds — the analyzer's OWN content-detected clue
// lifecycle. Counts pairs where a clue's payoff scene index is LESS than
// its seed scene index (an inversion). Included per orchestrator's request
// even though the 2026-07-29 diagnosis (Step 3) already found 0/N
// inversions on 5 train scripts and flagged the mechanism as tautological
// (applyClueLifecycle in fountain-analyzer.ts always assigns the SEED to
// occ[0] — the first occurrence in SCAN order — and the PAYOFF to occ[last]
// — a later occurrence in the SAME scan order — so no matter what order the
// scenes arrive in, seed can never scan after payoff. It is not measuring
// document position; it is measuring "which occurrence came first in
// whatever order the analyzer was given," which is definitionally always
// the seed.) This probe re-confirms that finding on 26 scripts.
function candidateSetupBeforePayoff(records) {
  const seedScene = new Map();
  for (const r of records) for (const id of r.seededClueIds ?? []) if (!seedScene.has(id)) seedScene.set(id, r.sceneIdx);
  let totalPayoffs = 0;
  let inversions = 0;
  for (const r of records) {
    for (const id of r.payoffSetupIds ?? []) {
      totalPayoffs++;
      const seedIdx = seedScene.get(id);
      if (seedIdx !== undefined && seedIdx > r.sceneIdx) inversions++;
    }
  }
  return { totalPayoffs, inversions };
}

// Candidate 5 (added mid-task per orchestrator): question-answer latency,
// built on records[].questionsRaised/Resolved/ResolvedSameScene/Unresolved
// — the ONLY candidate here that is order-sensitive BY CONSTRUCTION in the
// analyzer's existing implementation (detectQuestionLatency in
// fountain-analyzer.ts matches each question FORWARD, scene by scene, in
// whatever order the scenes are handed to it — an answer that ends up
// BEFORE its question in the new order can no longer match it, converting a
// resolved question into a permanently unresolved one). Aggregated at
// DOCUMENT level since the degradations are document-level. Per-scene
// resolution DISTANCE (in scenes) is not reported: detectQuestionLatency
// exposes only per-scene aggregate counts, not which scene resolved which
// raised question, so a distance metric is not derivable from the exported
// fields without re-implementing the private matching logic — noted as a
// gap, not faked.
function candidateQuestionLatency(records) {
  const totalRaised = records.reduce((s, r) => s + (r.questionsRaised ?? 0), 0);
  const totalResolved = records.reduce((s, r) => s + (r.questionsResolved ?? 0), 0);
  const totalResolvedSameScene = records.reduce((s, r) => s + (r.questionsResolvedSameScene ?? 0), 0);
  const totalUnresolved = records.reduce((s, r) => s + (r.questionsUnresolved ?? 0), 0);
  return {
    totalRaised, totalResolved, totalResolvedSameScene, totalUnresolved,
    resolutionRate: totalRaised > 0 ? totalResolved / totalRaised : null,
    unresolvedRate: totalRaised > 0 ? totalUnresolved / totalRaised : null,
    sameSceneRate: totalResolved > 0 ? totalResolvedSameScene / totalResolved : null,
  };
}

// ── Measurement loop ─────────────────────────────────────────────────────
// results[candidateId][degradationId] = array of { script, clean, degraded }
const CANDIDATES = ['intensityDelta', 'forwardReference', 'emotionalShift', 'setupBeforePayoff', 'questionLatency'];
const results = {};
for (const c of CANDIDATES) { results[c] = {}; for (const d of DEGRADATIONS) results[c][d.id] = []; }

for (const script of scripts) {
  let cleanAnalysis;
  try { cleanAnalysis = analyzeFountainText(script.text); }
  catch (e) { console.warn(`SKIP ${script.id}: analyzeFountainText threw on clean text: ${e.message}`); continue; }
  if (!cleanAnalysis.sceneCount || cleanAnalysis.sceneCount < 3) {
    console.warn(`SKIP ${script.id}: only ${cleanAnalysis.sceneCount ?? 0} scenes`);
    continue;
  }
  const { scenes: cleanScenes } = segmentScenes(script.text);

  for (const d of DEGRADATIONS) {
    const degradedText = d.fn(script.text);
    if (degradedText === null) continue; // scene-count floor not met
    let degAnalysis;
    try { degAnalysis = analyzeFountainText(degradedText); }
    catch (e) { console.warn(`SKIP ${script.id}/${d.id}: analyzeFountainText threw on degraded text: ${e.message}`); continue; }
    const { scenes: degScenes } = segmentScenes(degradedText);

    const cleanID = candidateIntensityDelta(cleanAnalysis.records);
    const degID = candidateIntensityDelta(degAnalysis.records);
    if (cleanID && degID) results.intensityDelta[d.id].push({ script: script.id, clean: cleanID, degraded: degID });

    const cleanFR = candidateForwardReference(cleanScenes);
    const degFR = candidateForwardReference(degScenes);
    if (cleanFR && degFR) results.forwardReference[d.id].push({ script: script.id, clean: cleanFR, degraded: degFR });

    const cleanES = candidateEmotionalShift(cleanAnalysis.records);
    const degES = candidateEmotionalShift(degAnalysis.records);
    if (cleanES && degES) results.emotionalShift[d.id].push({ script: script.id, clean: cleanES, degraded: degES });

    const cleanSP = candidateSetupBeforePayoff(cleanAnalysis.records);
    const degSP = candidateSetupBeforePayoff(degAnalysis.records);
    results.setupBeforePayoff[d.id].push({ script: script.id, clean: cleanSP, degraded: degSP });

    const cleanQL = candidateQuestionLatency(cleanAnalysis.records);
    const degQL = candidateQuestionLatency(degAnalysis.records);
    results.questionLatency[d.id].push({ script: script.id, clean: cleanQL, degraded: degQL });
  }
}

// ── Scoring: direction + win/tie/loss + AUC-if-large-enough ────────────────
// "Expected direction" per candidate: degraded should look WORSE/MORE
// EVIDENT-OF-DISORDER than clean on the primary statistic named below.
function winTieLoss(pairs, cleanKey, degKey, higherIsWorse) {
  let win = 0, tie = 0, loss = 0;
  for (const p of pairs) {
    const c = cleanKey(p.clean);
    const d = degKey(p.degraded);
    if (c === null || d === null || Number.isNaN(c) || Number.isNaN(d)) continue;
    const diff = higherIsWorse ? d - c : c - d;
    if (diff > 0) win++;
    else if (diff === 0) tie++;
    else loss++;
  }
  return { win, tie, loss, n: win + tie + loss };
}
function pairwiseAucFromDiffs(pairs, cleanKey, degKey, higherIsWorse) {
  // Pairwise AUC treating "degraded" as the positive (worse) class and
  // "clean" as the negative class, using the SAME real/degraded pairing
  // convention as measure-auc-split.mjs's pairwiseAuc (health: real >
  // degraded = correct; here: degraded statistic "worse" than clean =
  // correct, oriented by higherIsWorse).
  let correct = 0, n = 0;
  for (const p of pairs) {
    const c = cleanKey(p.clean);
    const d = degKey(p.degraded);
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
  if (n === 0) return 'DEAD (no valid pairs)';
  const moveFrac = (win + loss) / n; // fraction that moved at all (non-tie)
  if (moveFrac < 0.15) return 'DEAD — barely moves';
  const winFrac = win / n;
  if (aucInfo && aucInfo.n >= 10) {
    if (aucInfo.auc >= 0.75) return `PROMISING (AUC ${aucInfo.auc.toFixed(3)}, n=${aucInfo.n})`;
    if (aucInfo.auc >= 0.60) return `WEAK (AUC ${aucInfo.auc.toFixed(3)}, n=${aucInfo.n})`;
    if (aucInfo.auc <= 0.45) return `DEAD — moves wrong direction (AUC ${aucInfo.auc.toFixed(3)}, n=${aucInfo.n})`;
    return `WEAK (AUC near chance, ${aucInfo.auc.toFixed(3)}, n=${aucInfo.n})`;
  }
  // Sample too small for AUC — report raw win/tie/loss only, explicitly.
  if (winFrac >= 0.70) return `PROMISING-ish but n<10, AUC NOT COMPUTED (win ${win}/${n})`;
  if (winFrac >= 0.55) return `WEAK, n<10, AUC NOT COMPUTED (win ${win}/${n})`;
  return `DEAD-leaning, n<10, AUC NOT COMPUTED (win ${win}/${n})`;
}

// ── Report ───────────────────────────────────────────────────────────────
const report = { generatedAt: new Date().toISOString(), scriptCount: scripts.length, candidates: {} };

function reportCandidate(name, resultsKey, statLabel, cleanKey, degKey, higherIsWorse) {
  console.log(`\n=== Candidate: ${name} (primary stat: ${statLabel}, expected direction: degraded ${higherIsWorse ? 'HIGHER' : 'LOWER'}) ===`);
  const perDeg = {};
  for (const d of DEGRADATIONS) {
    const pairs = results[resultsKey][d.id];
    const wtl = winTieLoss(pairs, cleanKey, degKey, higherIsWorse);
    const aucInfo = pairwiseAucFromDiffs(pairs, cleanKey, degKey, higherIsWorse);
    const verdict = verdictFor(wtl, aucInfo);
    perDeg[d.id] = { pairs: pairs.length, winTieLoss: wtl, auc: aucInfo, verdict };
    console.log(`  ${d.id.padEnd(18)} pairs=${String(pairs.length).padStart(2)}  win/tie/loss=${wtl.win}/${wtl.tie}/${wtl.loss}  ${aucInfo.n >= 10 ? `AUC=${aucInfo.auc.toFixed(3)}` : 'AUC=n/a (n<10)'}  -> ${verdict}`);
  }
  report.candidates[name] = perDeg;
  return perDeg;
}

reportCandidate('1_intensityDelta_meanAbsDelta', 'intensityDelta', 'meanAbsDelta', c => c.meanAbsDelta, d => d.meanAbsDelta, true);
reportCandidate('1_intensityDelta_variance', 'intensityDelta', 'varianceAbsDelta', c => c.varianceAbsDelta, d => d.varianceAbsDelta, true);
reportCandidate('1_intensityDelta_monotoneRuns', 'intensityDelta', 'monotoneRuns', c => c.monotoneRuns, d => d.monotoneRuns, true);

reportCandidate('2_forwardReference_count', 'forwardReference', 'forwardRefCount', c => c.forwardRefCount, d => d.forwardRefCount, true);
reportCandidate('2_forwardReference_density', 'forwardReference', 'density', c => c.density, d => d.density, true);

reportCandidate('3_emotionalShift_sameRuns', 'emotionalShift', 'sameValenceAdjacentRuns', c => c.sameValenceAdjacentRuns, d => d.sameValenceAdjacentRuns, false);
reportCandidate('3_emotionalShift_sameRunsRate', 'emotionalShift', 'sameValenceAdjacentRunsRate', c => c.sameValenceAdjacentRunsRate, d => d.sameValenceAdjacentRunsRate, false);
reportCandidate('3_emotionalShift_entropy', 'emotionalShift', 'transitionEntropy', c => c.transitionEntropy, d => d.transitionEntropy, true);

reportCandidate('4_setupBeforePayoff_inversions', 'setupBeforePayoff', 'inversions', c => c.inversions, d => d.inversions, true);

reportCandidate('5_questionLatency_unresolvedRate', 'questionLatency', 'unresolvedRate', c => c.unresolvedRate, d => d.unresolvedRate, true);
reportCandidate('5_questionLatency_resolutionRate', 'questionLatency', 'resolutionRate', c => c.resolutionRate, d => d.resolutionRate, false);
reportCandidate('5_questionLatency_totalUnresolved', 'questionLatency', 'totalUnresolved', c => c.totalUnresolved, d => d.totalUnresolved, true);

// Candidate 5 coverage note — how many scripts actually raised ANY questions
// at all, since a 0/0 script contributes no signal either way.
{
  let scriptsWithQuestions = 0, scriptsTotal = 0;
  const seen = new Set();
  for (const d of DEGRADATIONS) {
    for (const p of results.questionLatency[d.id]) {
      if (seen.has(p.script)) continue;
      seen.add(p.script);
      scriptsTotal++;
      if (p.clean.totalRaised > 0) scriptsWithQuestions++;
    }
  }
  console.log(`\nCandidate 5 coverage: ${scriptsWithQuestions}/${scriptsTotal} scripts raised >=1 substantive question on the CLEAN text (0-question scripts contribute no signal to this candidate either way).`);
  report.candidate5Coverage = { scriptsWithQuestions, scriptsTotal };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2), 'utf-8');
console.log(`\nWrote full results to ${OUT_FILE}`);
console.log('\nHONESTY NOTE: this is a 26-script falsification screen (20 hand-authored');
console.log('calibration samples + 6 CC0 short screenplays), NOT the 761-script P1 real-');
console.log('writing corpus. No number above is a P1 gate result. Any candidate deemed');
console.log('PROMISING here still requires the real-corpus measure-auc-split.mjs harness');
console.log('before it can be trusted for an implementation decision.');
