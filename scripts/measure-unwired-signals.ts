// P-1 EVIDENCE — measurement harness for the four UNWIRED analysis signals
// (agency-signal.ts, question-latency-deduction.ts, reversal-detection.ts,
// truth-extraction.ts). Produces the measurement evidence
// docs/p1-benchmark/UNWIRED_SIGNALS_EVIDENCE_2026-08-21.md reports on.
//
// This script does NOT wire anything into scoring. It imports each unwired
// module's own exported comparison/detector functions (already built,
// already tested) and runs them read-only over two corpora:
//
//   PART A — the 125-film annotated corpus (screenplay_training,
//     `05_dramatic_annotations` + `07_quality_scores`), reusing the EXACT
//     annotation-vocabulary-to-StoryOps bridge scripts/calibrate-stress-
//     ledger.ts already proved out and measured (docs/p1-benchmark/
//     STRESS_LEDGER_CALIBRATION_2026-08-11.md) — per the task instruction
//     to reuse that method rather than invent a new one. Configurable via
//     ANNOT_DIR / QUAL_DIR env vars, same contract as calibrate-stress-
//     ledger.ts. This corpus is OWNER-LOCAL ONLY (a Windows path under
//     C:\Users\...\screenplay_training\corpus\...) and is not present in a
//     cloud/CI/worktree session — see the CANNOT-MEASURE section this
//     script prints when the directories don't exist. That absence is
//     itself load-bearing evidence, not a script bug.
//
//   PART B — the same 44-script in-repo REAL-PROSE sample every other P1
//     unwired-signal probe in this repo already uses (20 calibration-corpus
//     samples + 20 CC0 screenplays under data/screenplays/ + 4 structural-
//     form-experiment fixtures) — see scripts/probe-truth-order-
//     sensitivity.mjs and scripts/probe-question-latency-deduction.mjs,
//     whose corpus-assembly and degradation functions this script's Part B
//     copies verbatim (per those files' own "reuse, don't reimplement"
//     precedent) so results are directly comparable. This is REAL prose —
//     the only real prose actually reachable from inside this session — so
//     Part B is where this script gets real, honest, if underpowered,
//     numbers TODAY.
//
// Neither corpus is the 761-script P1 real-writing corpus
// (REAL_SCRIPT_CORPUS_DIR) that measure-auc-split.mjs's --with-* flags
// target; that corpus is also owner-local only and is not present here
// either (confirmed: data/screenplays/crawl/ does not exist in this
// worktree — data/ is gitignored per CLAUDE.md).
//
// ── Run ──────────────────────────────────────────────────────────────────
//   node --experimental-strip-types scripts/measure-unwired-signals.ts
// Optional (owner machine only, to run Part A for real):
//   ANNOT_DIR=/path/to/screenplay_training/corpus/05_dramatic_annotations \
//   QUAL_DIR=/path/to/screenplay_training/corpus/07_quality_scores \
//   node --experimental-strip-types scripts/measure-unwired-signals.ts
// Output: stdout report + scripts/output/measure-unwired-signals.json
// (new file — not a committed baseline, so no guardedWrite shrink-guard
// needed; plain write).

import fs from 'node:fs';
import path from 'node:path';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { REFERENCE_CORPUS } from '../server/nvm/analyze/calibration/corpus.ts';
import {
  computeD1AgencyDelta,
  computeD2AgencyDelta,
  detectPeakAgency,
  detectAct3Agency,
} from '../server/nvm/analyze/agency-signal.ts';
import { computeReversalDelta, detectReversals } from '../server/nvm/analyze/reversal-detection.ts';
import { computeQuestionLatencyDeduction } from '../server/nvm/analyze/question-latency-deduction.ts';
import { detectTruthContradictions } from '../server/nvm/analyze/truth-extraction.ts';
import { buildScreenplayMemory } from '../server/nvm/screenplay/memory.ts';
import type { StoryOp } from '../server/nvm/ops/StoryOp.ts';
import { summarizeOps, type StoryCommit } from '../server/nvm/state/StoryCommit.ts';
import type { ScreenplaySceneRecord } from '../server/nvm/screenplay/memory.ts';

const OUT_DIR = 'scripts/output';
const OUT_FILE = path.join(OUT_DIR, 'measure-unwired-signals.json');
const report: Record<string, unknown> = { generatedAt: new Date().toISOString() };

// ════════════════════════════════════════════════════════════════════════
// SHARED — degradation functions (VERBATIM copy from scripts/measure-auc-
// split.mjs / scripts/probe-truth-order-sensitivity.mjs / scripts/probe-
// question-latency-deduction.mjs, per this repo's established "reuse, don't
// reimplement" precedent for this exact block) + a bootstrap CI helper this
// script adds (none of the three probes above compute one).
// ════════════════════════════════════════════════════════════════════════

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const HEADING_RE = /^(INT\.|EXT\.|EST\.|INT\/EXT\.)/;
const DOT_RE = /^\./;
interface Scene { heading: string; body: string[] }
function segmentScenes(text: string): { preamble: string[]; scenes: Scene[] } {
  const lines = text.split(/\r?\n/);
  const scenes: Scene[] = []; let cur: Scene | null = null; const preamble: string[] = [];
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
function reassemble(preamble: string[], scenes: Scene[]): string {
  const out = [...preamble];
  for (const s of scenes) { out.push(s.heading); out.push(...s.body); }
  return out.join('\n');
}
function degradeShuffle(text: string): string | null {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return null;
  const rng = mulberry32(42);
  const sh = scenes.slice();
  for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
  return reassemble(preamble, sh);
}
function degradeMidpointDrop(text: string): string | null {
  const { preamble, scenes } = segmentScenes(text);
  const n = scenes.length;
  if (n < 5) return null;
  return reassemble(preamble, scenes.slice(0, Math.floor(n * 0.4)).concat(scenes.slice(Math.floor(n * 0.6))));
}
function degradeClimaxRelocate(text: string): string | null {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return null;
  const last = scenes.pop()!;
  scenes.splice(1, 0, last);
  return reassemble(preamble, scenes);
}
const DEGRADATIONS: { id: string; fn: (t: string) => string | null }[] = [
  { id: 'SCENE_SHUFFLE', fn: degradeShuffle },
  { id: 'MIDPOINT_DROP', fn: degradeMidpointDrop },
  { id: 'CLIMAX_RELOCATE', fn: degradeClimaxRelocate },
];

interface Pair { real: number; degraded: number; script: string }
function pairwiseAuc(pairs: Pair[]): number {
  if (pairs.length === 0) return NaN;
  let correct = 0;
  for (const { real, degraded } of pairs) {
    if (real > degraded) correct += 1;
    else if (real === degraded) correct += 0.5;
  }
  return correct / pairs.length;
}
function winTieLoss(pairs: Pair[]): { win: number; tie: number; loss: number } {
  let win = 0, tie = 0, loss = 0;
  for (const { real, degraded } of pairs) {
    if (real > degraded) win++; else if (real === degraded) tie++; else loss++;
  }
  return { win, tie, loss };
}
/** Percentile-bootstrap 95% CI on pairwiseAuc, resampling PAIRS with
 *  replacement (not individual scripts) — cheap (2000 resamples, O(n) each)
 *  and appropriate for the paired-comparison design every degradation AUC
 *  in this codebase already uses. Returns null when n < 8 (too few pairs
 *  for a bootstrap distribution to mean anything). */
function bootstrapAucCI(pairs: Pair[], iters = 2000, seed = 20260821): { lo: number; hi: number } | null {
  if (pairs.length < 8) return null;
  const rng = mulberry32(seed);
  const samples: number[] = [];
  for (let it = 0; it < iters; it++) {
    const resample: Pair[] = [];
    for (let i = 0; i < pairs.length; i++) resample.push(pairs[Math.floor(rng() * pairs.length)]);
    samples.push(pairwiseAuc(resample));
  }
  samples.sort((a, b) => a - b);
  const lo = samples[Math.floor(0.025 * iters)];
  const hi = samples[Math.min(iters - 1, Math.floor(0.975 * iters))];
  return { lo, hi };
}
function fmtCI(ci: { lo: number; hi: number } | null): string {
  return ci ? `[${ci.lo.toFixed(3)}, ${ci.hi.toFixed(3)}]` : 'n/a (n<8)';
}

// ════════════════════════════════════════════════════════════════════════
// PART B — 44-script in-repo REAL-PROSE corpus (reachable right now)
// ════════════════════════════════════════════════════════════════════════

interface CorpusScript { id: string; text: string }
function collectRealScripts(): CorpusScript[] {
  const scripts: CorpusScript[] = [];
  for (const s of REFERENCE_CORPUS) scripts.push({ id: `calibration:${s.label} (${s.band})`, text: s.fountain });
  const screenplayDir = path.resolve('data/screenplays');
  if (fs.existsSync(screenplayDir)) {
    for (const f of fs.readdirSync(screenplayDir)) {
      if (!f.endsWith('.fountain')) continue;
      scripts.push({ id: `fountain:${f}`, text: fs.readFileSync(path.join(screenplayDir, f), 'utf-8') });
    }
  }
  const fixtureDir = path.resolve('tests/fixtures/structural-form-experiment');
  if (fs.existsSync(fixtureDir)) {
    for (const f of fs.readdirSync(fixtureDir)) {
      if (!f.endsWith('.fountain')) continue;
      scripts.push({ id: `structural-form-experiment:${f}`, text: fs.readFileSync(path.join(fixtureDir, f), 'utf-8') });
    }
  }
  return scripts;
}
const realScripts = collectRealScripts();
console.log(`\n${'═'.repeat(78)}`);
console.log(`PART B — IN-REPO REAL-PROSE CORPUS (n=${realScripts.length}: ${REFERENCE_CORPUS.length} calibration + ` +
  `${realScripts.filter(s => s.id.startsWith('fountain:')).length} CC0 + ` +
  `${realScripts.filter(s => s.id.startsWith('structural-form-experiment:')).length} structural-form-experiment)`);
console.log('═'.repeat(78));

// ── B1. AGENCY-SIGNAL — disagreement rate vs. legacy predicate (NOT an ──────
// order-sensitivity signal by construction: peak/act-3 scene selection is
// driven by suspenseDelta, which is intrinsic to each scene's own content,
// not document position — so no degradation-AUC framework applies here.
// The measurement this module's own file header calls for is disagreement
// rate, not discrimination AUC.
{
  console.log('\n── B1. AGENCY-SIGNAL — legacy (neutral/no-clock/no-clue) vs. agency-aware read ──');
  let d1Total = 0, d1Disagree = 0, d1NoPeak = 0;
  let d2Total = 0, d2Disagree = 0, d2ZeroAct3 = 0;
  const rows: Record<string, unknown>[] = [];
  for (const s of realScripts) {
    let analysis;
    try { analysis = analyzeFountainText(s.text); } catch (e) { console.log(`  SKIP ${s.id}: ${(e as Error).message}`); continue; }
    if (analysis.records.length === 0 || analysis.characters.length === 0) { d1NoPeak++; d2ZeroAct3++; continue; }
    const protagonist = analysis.characters[0];
    const d1 = computeD1AgencyDelta(analysis.records, protagonist);
    const d2 = computeD2AgencyDelta(analysis.records, protagonist);
    d1Total++; if (d1.disagreement) d1Disagree++;
    d2Total++; if (d2.disagreement) d2Disagree++;
    rows.push({ script: s.id, protagonist, d1, d2 });
  }
  console.log(`  D1 (peak-scene passivity): ${d1Disagree}/${d1Total} scripts show legacy-passive-but-agency-detected disagreement.`);
  console.log(`  D2 (Act-3 window passivity): ${d2Disagree}/${d2Total} scripts show legacy-all-passive-but-initiative-detected disagreement.`);
  report.agencySignalPartB = { d1: { total: d1Total, disagree: d1Disagree }, d2: { total: d2Total, disagree: d2Disagree }, rows };
}

// ── B2. REVERSAL-DETECTION — disagreement rate + channel-2 order-sensitivity ──
{
  console.log('\n── B2. REVERSAL-DETECTION — legacy suspense-dip vs. detected (revelation + relationship-swing) ──');
  let total = 0, disagree = 0, negDelta = 0;
  const rows: Record<string, unknown>[] = [];
  const pairsByDeg: Record<string, Pair[]> = {};
  for (const d of DEGRADATIONS) pairsByDeg[d.id] = [];
  for (const s of realScripts) {
    let analysis;
    try { analysis = analyzeFountainText(s.text); } catch (e) { console.log(`  SKIP ${s.id}: ${(e as Error).message}`); continue; }
    if (analysis.records.length < 3) continue;
    const delta = computeReversalDelta(analysis.records);
    total++;
    if (delta.delta > 0) disagree++;
    if (delta.delta < 0) negDelta++;
    rows.push({ script: s.id, ...delta });

    for (const deg of DEGRADATIONS) {
      const degText = deg.fn(s.text);
      if (degText === null) continue;
      let degAnalysis;
      try { degAnalysis = analyzeFountainText(degText); } catch { continue; }
      const cleanDetected = delta.detectedCount;
      const degDetected = computeReversalDelta(degAnalysis.records).detectedCount;
      // "cleanliness" convention: higher clean-vs-degraded detected-reversal
      // COUNT under shuffle/relocate is not itself "better" — reversal
      // detection is a descriptive count, not a quality score — so this
      // reports MOVEMENT (order-sensitivity), not a win/loss verdict.
      pairsByDeg[deg.id].push({ real: cleanDetected, degraded: degDetected, script: s.id });
    }
  }
  console.log(`  ${disagree}/${total} scripts: detector finds MORE reversals than legacy suspense-dip count (D3's exact failure mode).`);
  console.log(`  ${negDelta}/${total} scripts: legacy suspense-dip finds reversals this detector's two channels miss (documented CANNOT case).`);
  console.log('  Channel-2 order-sensitivity (does detectedCount MOVE under degradation — not a win/loss claim, a movement claim):');
  const degStats: Record<string, unknown> = {};
  for (const deg of DEGRADATIONS) {
    const pairs = pairsByDeg[deg.id];
    const moved = pairs.filter(p => p.real !== p.degraded).length;
    console.log(`    ${deg.id.padEnd(16)} n=${pairs.length}  moved=${moved}/${pairs.length}`);
    degStats[deg.id] = { n: pairs.length, moved };
  }
  report.reversalDetectionPartB = { total, disagreeMoreFound: disagree, disagreeLegacyOnly: negDelta, rows, degradations: degStats };
}

// ── B3. QUESTION-LATENCY — gated deduction + ungated rate, degradation AUC ──
{
  console.log('\n── B3. QUESTION-LATENCY — computeQuestionLatencyDeduction() gated + ungated rate ──');
  const pairsGated: Record<string, Pair[]> = {};
  const pairsUngated: Record<string, Pair[]> = {};
  for (const d of DEGRADATIONS) { pairsGated[d.id] = []; pairsUngated[d.id] = []; }
  let withQuestions = 0, analyzed = 0;
  for (const s of realScripts) {
    let clean;
    try { clean = analyzeFountainText(s.text); } catch (e) { console.log(`  SKIP ${s.id}: ${(e as Error).message}`); continue; }
    if (clean.sceneCount < 3) continue;
    analyzed++;
    const cleanQL = computeQuestionLatencyDeduction(clean.records);
    if (cleanQL.raised > 0) withQuestions++;
    for (const deg of DEGRADATIONS) {
      const degText = deg.fn(s.text);
      if (degText === null) continue;
      let degAnalysis;
      try { degAnalysis = analyzeFountainText(degText); } catch { continue; }
      const degQL = computeQuestionLatencyDeduction(degAnalysis.records);
      if (cleanQL.gated && degQL.gated) pairsGated[deg.id].push({ real: -cleanQL.deduction, degraded: -degQL.deduction, script: s.id });
      if (cleanQL.unresolvedRate !== null && degQL.unresolvedRate !== null) {
        pairsUngated[deg.id].push({ real: -cleanQL.unresolvedRate, degraded: -degQL.unresolvedRate, script: s.id });
      }
    }
  }
  console.log(`  ${withQuestions}/${analyzed} scripts raised >=1 substantive dialogue question on clean text.`);
  const gatedStats: Record<string, unknown> = {}, ungatedStats: Record<string, unknown> = {};
  for (const deg of DEGRADATIONS) {
    const g = pairsGated[deg.id];
    const auc = pairwiseAuc(g);
    const ci = bootstrapAucCI(g);
    console.log(`  GATED    ${deg.id.padEnd(16)} n=${g.length}  AUC=${isNaN(auc) ? 'n/a' : auc.toFixed(3)}  95% CI ${fmtCI(ci)}`);
    gatedStats[deg.id] = { n: g.length, auc, ci };
    const u = pairsUngated[deg.id];
    const uAuc = pairwiseAuc(u);
    const uCi = bootstrapAucCI(u);
    console.log(`  UNGATED  ${deg.id.padEnd(16)} n=${u.length}  AUC=${isNaN(uAuc) ? 'n/a' : uAuc.toFixed(3)}  95% CI ${fmtCI(uCi)}`);
    ungatedStats[deg.id] = { n: u.length, auc: uAuc, ci: uCi };
  }
  report.questionLatencyPartB = { withQuestions, analyzed, gated: gatedStats, ungated: ungatedStats };
}

// ── B4. TRUTH-EXTRACTION — false-positive rate + synthetic order-sensitivity ──
{
  console.log('\n── B4. TRUTH-EXTRACTION — false-positive rate on real corpus + synthetic mechanism proof ──');
  let fpScripts = 0, fpCount = 0, noDeathFacts = 0, analyzed = 0;
  for (const s of realScripts) {
    let result;
    try { result = detectTruthContradictions(s.text); } catch (e) { console.log(`  SKIP ${s.id}: ${(e as Error).message}`); continue; }
    analyzed++;
    if (result.contradictions.length > 0) { fpScripts++; fpCount += result.contradictions.length; }
    if (result.facts.filter(f => f.object === 'dead').length === 0) noDeathFacts++;
  }
  console.log(`  ${fpScripts}/${analyzed} scripts produced >=1 contradiction on CLEAN, unmodified real prose (total ${fpCount}).`);
  console.log(`  ${noDeathFacts}/${analyzed} scripts contain zero on-page deaths explicit enough to fire (real-corpus RECALL is untestable on this sample).`);
  report.truthExtractionPartB = { falsePositiveScripts: fpScripts, falsePositiveCount: fpCount, noDeathFactScripts: noDeathFacts, analyzed };
}

// ════════════════════════════════════════════════════════════════════════
// PART A — 125-FILM ANNOTATED CORPUS (screenplay_training), via the
// stress-ledger's own annotation→StoryOps bridge, reused verbatim from
// scripts/calibrate-stress-ledger.ts, then run through the REAL
// buildScreenplayMemory (server/nvm/screenplay/memory.ts) to get
// ScreenplaySceneRecord[] — the same record type all four unwired modules
// consume.
// ════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(78)}`);
console.log('PART A — 125-FILM ANNOTATED CORPUS (screenplay_training)');
console.log('═'.repeat(78));

const ANNOT_DIR = process.env.ANNOT_DIR ??
  'C:\\Users\\serge\\.minimax-agent\\projects\\screenplay_training\\corpus\\05_dramatic_annotations';
const QUAL_DIR = process.env.QUAL_DIR ??
  'C:\\Users\\serge\\.minimax-agent\\projects\\screenplay_training\\corpus\\07_quality_scores';

if (!fs.existsSync(ANNOT_DIR) || !fs.existsSync(QUAL_DIR)) {
  console.log(`\nCANNOT-MEASURE: ANNOT_DIR (${ANNOT_DIR}) or QUAL_DIR (${QUAL_DIR}) does not exist in`);
  console.log('this session. The 125-film corpus lives only on the maintainer\'s local machine (same');
  console.log('constraint CLAUDE.md documents for REAL_SCRIPT_CORPUS_DIR: local-only, copyright, not');
  console.log('mountable via secrets). This is the honest result for THIS environment, not a script bug —');
  console.log('scripts/calibrate-stress-ledger.ts has the identical env-var contract and was necessarily');
  console.log('run by someone with local access to produce docs/p1-benchmark/STRESS_LEDGER_CALIBRATION_');
  console.log('2026-08-11.md. To discharge Part A for real, on the owner machine:');
  console.log('');
  console.log('  node --experimental-strip-types scripts/measure-unwired-signals.ts');
  console.log('  (ANNOT_DIR / QUAL_DIR default to the same screenplay_training paths');
  console.log('   scripts/calibrate-stress-ledger.ts already uses — override via env vars if the');
  console.log('   corpus moved.)');
  console.log('');
  console.log('Independent of corpus availability, THREE of the four signals have a STRUCTURAL ceiling');
  console.log('on this corpus even when it IS available, because the annotation schema');
  console.log('(active_mechanism / function_tags / reversal / thematic_function /');
  console.log('audience_information_advantage / characters_present — see calibrate-stress-ledger.ts\'s');
  console.log('DramaticScene interface) carries NO raw screenplay prose, only structured per-scene tags:');
  console.log('');
  console.log('  - TRUTH-EXTRACTION requires raw Fountain text (parseFountain over actual dialogue/action');
  console.log('    lines) end to end — there is no bridge from structured annotations to prose at all.');
  console.log('    CANNOT-MEASURE against this corpus by construction, not a fixable gap in this script.');
  console.log('  - QUESTION-LATENCY reads questionsRaised/Resolved/Unresolved, which memory.ts documents');
  console.log('    as populated ONLY on the text-derived path ("the ops-derived path has no raw dialogue');
  console.log('    text to lex-match against" — memory.ts field comment, verified by reading the file).');
  console.log('    The annotation-to-StoryOps bridge produces zero raised questions for every film, so');
  console.log('    computeQuestionLatencyDeduction gates false everywhere: CANNOT-MEASURE, not underpowered.');
  console.log('  - AGENCY-SIGNAL reads dramaticTurn/visualBeats TEXT for a protagonist-as-subject clause.');
  console.log('    On the ops-derived path, dramaticTurn falls back to a synthesized "Scene {purpose}"');
  console.log('    string (memory.ts\'s deriveDramaticTurn: no ADD_FACT/UPDATE_BELIEF ops in the stress-');
  console.log('    ledger converter\'s output) that structurally cannot contain a protagonist name next to');
  console.log('    a decisive/spectator verb. CANNOT-MEASURE-MEANINGFULLY: it would run without error and');
  console.log('    report zero agency evidence everywhere, which is a bridge artifact, not a finding about');
  console.log('    the detector.');
  console.log('  - REVERSAL-DETECTION is the ONE signal structurally reachable: channel 2 (relationship-');
  console.log('    shift sign flip) is driven by NUMERIC SHIFT_RELATIONSHIP amounts, which the stress-');
  console.log('    ledger converter DOES emit (confrontation: -0.3, test: -0.15, reversal tag: -0.5), and');
  console.log('    the corpus\'s own `reversal` field is a direct ground-truth label per scene — a genuine');
  console.log('    precision/recall opportunity this script computes below IF the corpus is present. Two');
  console.log('    caveats an owner run must account for: (1) channel 1 (revelation-text allegiance) is');
  console.log('    unreachable for the same no-prose reason as truth-extraction/agency-signal above, so');
  console.log('    only channel 2 is testable; (2) the converter\'s SHIFT_RELATIONSHIP amplitudes (0.15-0.5)');
  console.log('    are roughly 10x smaller than reversal-detection.ts\'s own established/swing thresholds');
  console.log('    (3/4), which were tuned against real fountain-text amplitudes (RELATIONSHIP_SHIFT_');
  console.log('    THRESHOLD=2, per-scene cap 5) — an owner run may need a corpus-appropriate rescale, not');
  console.log('    the thresholds as shipped, or channel 2 will structurally under-fire regardless of the');
  console.log('    real reversal rate. This script does NOT rescale on the owner\'s behalf (that is a');
  console.log('    threshold-tuning decision requiring the actual data distribution, out of scope here).');
  report.partA = { measured: false, reason: 'ANNOT_DIR/QUAL_DIR not present in this environment', annotDir: ANNOT_DIR, qualDir: QUAL_DIR };
} else {
  // ── Reused verbatim from scripts/calibrate-stress-ledger.ts ──────────────
  interface DramaticScene {
    script_id: string; scene_id: string; act?: number; slugline?: string;
    function_tags?: string[]; scene_purpose?: string; active_mechanism?: string;
    reversal?: string | { present?: boolean }; thematic_function?: string;
    audience_information_advantage?: string; conflict?: string;
    before_state?: string; after_state?: string; tension_curve?: string;
    evidence?: { characters_present?: string[]; first_line_no?: number; last_line_no?: number };
  }
  interface QualityFile { script_id: string; composite_quality?: number; title_guess?: string }
  interface ConvertContext { openClues: string[]; isFinalAct: boolean }

  function convertScene(scene: DramaticScene, sceneIdx: number, ctx: ConvertContext): StoryOp[] {
    const ops: StoryOp[] = [];
    const chars = scene.evidence?.characters_present ?? [];
    const sid = scene.scene_id ?? `scene_${sceneIdx}`;
    switch (scene.active_mechanism) {
      case 'reveal':
      case 'revelation':
        ops.push({ op: 'UPDATE_READER_STATE', delta: { knownFact: `${sid}:reveal` } } as StoryOp);
        if (ctx.openClues.length > 0) {
          const clueId = ctx.openClues.shift()!;
          ops.push({ op: 'PAYOFF_SETUP', setupId: clueId, payoffEventId: `${sid}:payoff` } as StoryOp);
        }
        if (chars[0]) {
          ops.push({ op: 'APPRAISE_EMOTION', charId: chars[0], emotion: { joy: 40, distress: 0, anger: 0, fear: 0, pride: 30, shame: 0, dominant: 'joy', intensity: 40, last_updated_at: sceneIdx } } as StoryOp);
        }
        break;
      case 'discovery':
        ops.push({ op: 'UPDATE_READER_STATE', delta: { suspense: 5, curiosity: 3 } } as StoryOp);
        break;
      case 'confrontation':
        if (chars.length >= 2) ops.push({ op: 'SHIFT_RELATIONSHIP', pair: [chars[0], chars[1]], delta: { dimension: 'trust', amount: -0.3, reason: 'confrontation' } } as StoryOp);
        if (chars[0]) ops.push({ op: 'APPRAISE_EMOTION', charId: chars[0], emotion: { joy: 0, distress: 50, anger: 76, fear: 0, pride: 0, shame: 0, dominant: 'anger', intensity: 76, last_updated_at: sceneIdx } } as StoryOp);
        break;
      case 'test':
        if (chars.length >= 2) ops.push({ op: 'SHIFT_RELATIONSHIP', pair: [chars[0], chars[1]], delta: { dimension: 'trust', amount: -0.15, reason: 'test' } } as StoryOp);
        break;
      case 'loss':
      case 'consequence':
      case 'reversal_of_fortune':
        if (chars[0]) ops.push({ op: 'APPRAISE_EMOTION', charId: chars[0], emotion: { joy: 0, distress: 78, anger: 0, fear: 50, pride: 0, shame: 0, dominant: 'distress', intensity: 78, last_updated_at: sceneIdx } } as StoryOp);
        break;
      case 'decision_under_pressure':
        ops.push({ op: 'ADVANCE_OBJECT_ARC', objectId: `${sid}:decision`, toState: 'committed' } as StoryOp);
        if (chars[0]) ops.push({ op: 'APPRAISE_EMOTION', charId: chars[0], emotion: { joy: 0, distress: 0, anger: 0, fear: 75, pride: 0, shame: 0, dominant: 'fear', intensity: 75, last_updated_at: sceneIdx } } as StoryOp);
        break;
      case 'decision':
      case 'commitment':
        ops.push({ op: 'ADVANCE_OBJECT_ARC', objectId: `${sid}:decision`, toState: 'committed' } as StoryOp);
        break;
      case 'exposition':
      case 'set_piece':
        ops.push({ op: 'RECORD_VISUAL_FACT', sceneId: sid, fact: 'setting' } as StoryOp);
        break;
    }
    const hasReversal = scene.reversal === 'yes' || (typeof scene.reversal === 'object' && scene.reversal?.present === true);
    if (hasReversal && chars.length >= 2) {
      ops.push({ op: 'SHIFT_RELATIONSHIP', pair: [chars[0], chars[1]], delta: { dimension: 'trust', amount: -0.5, reason: 'reversal' } } as StoryOp);
      if (chars[0]) ops.push({ op: 'APPRAISE_EMOTION', charId: chars[0], emotion: { joy: 0, distress: 80, anger: 0, fear: 40, pride: 0, shame: 0, dominant: 'distress', intensity: 80, last_updated_at: sceneIdx } } as StoryOp);
    }
    const tags = scene.function_tags ?? [];
    if (tags.includes('setup') || tags.includes('plant')) {
      const clueId = `${sid}:clue`;
      ctx.openClues.push(clueId);
      ops.push({ op: 'SEED_CLUE', clueId, carrier: 'object' } as StoryOp);
    }
    if (tags.includes('inciting') || tags.includes('inciting_incident')) ops.push({ op: 'RAISE_CLOCK', clockId: `${sid}:clock`, amount: 5 } as StoryOp);
    if ((tags.includes('payoff') || tags.includes('resolution') || tags.includes('convergence') || tags.includes('climax_buildup')) && ctx.openClues.length > 0) {
      const clueId = ctx.openClues.shift()!;
      ops.push({ op: 'PAYOFF_SETUP', setupId: clueId, payoffEventId: `${sid}:payoff` } as StoryOp);
    }
    const tf = scene.thematic_function;
    if (tf && !['tone_setting', 'world_introduction', 'opening'].includes(tf)) {
      const move = (tf === 'resolution' || ctx.isFinalAct) ? 'resolve' : 'support';
      ops.push({ op: 'ADVANCE_THEME_ARGUMENT', claimId: tf, move } as StoryOp);
    }
    const adv = scene.audience_information_advantage ?? '';
    if (adv.includes('audience knows more') || adv.includes('audience knows slightly more')) {
      ops.push({ op: 'UPDATE_READER_STATE', delta: { curiosity: 3 } } as StoryOp);
    }
    return ops;
  }

  function convertFilm(scenes: DramaticScene[]): { sceneIdx: number; ops: StoryOp[]; annotatedReversal: boolean }[] {
    const openClues: string[] = [];
    const total = scenes.length;
    return scenes.map((scene, idx) => {
      const isFinalAct = (scene.act !== undefined && scene.act >= 3) || idx >= total * 0.8;
      const ctx: ConvertContext = { openClues, isFinalAct };
      const annotatedReversal = scene.reversal === 'yes' || (typeof scene.reversal === 'object' && scene.reversal?.present === true);
      return { sceneIdx: idx, ops: convertScene(scene, idx, ctx), annotatedReversal };
    });
  }

  function pearson(a: number[], b: number[]): number {
    const n = a.length;
    if (n < 3) return 0;
    const meanA = a.reduce((s, x) => s + x, 0) / n, meanB = b.reduce((s, x) => s + x, 0) / n;
    let num = 0, dA = 0, dB = 0;
    for (let i = 0; i < n; i++) { num += (a[i] - meanA) * (b[i] - meanB); dA += (a[i] - meanA) ** 2; dB += (b[i] - meanB) ** 2; }
    const den = Math.sqrt(dA * dB);
    return den > 0 ? num / den : 0;
  }

  const MIN_SCENES = 20;
  const filmDirs = fs.readdirSync(ANNOT_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);

  interface FilmResult {
    film: string; quality: number; sceneCount: number;
    legacyReversalCount: number; detectedReversalCount: number;
    tp: number; fp: number; fn: number; tn: number;
    agencyD1Runs: number; agencyD1Disagree: number;
    questionLatencyGated: number;
  }
  const results: FilmResult[] = [];

  for (const film of filmDirs) {
    const annotPath = path.join(ANNOT_DIR, film, 'dramatic.json');
    const qualPath = path.join(QUAL_DIR, `${film}.quality.json`);
    let scenes: DramaticScene[], quality: number;
    try {
      scenes = JSON.parse(fs.readFileSync(annotPath, 'utf8'));
      const qualFile: QualityFile = JSON.parse(fs.readFileSync(qualPath, 'utf8'));
      quality = qualFile.composite_quality ?? 0;
    } catch { continue; }
    if (scenes.length < MIN_SCENES) continue;

    const converted = convertFilm(scenes);
    const commits: StoryCommit[] = converted.map(c => ({
      commitId: `${film}:${c.sceneIdx}`, parentId: c.sceneIdx > 0 ? `${film}:${c.sceneIdx - 1}` : null,
      sceneIdx: c.sceneIdx, ops: c.ops, deltaSummary: summarizeOps(c.ops), reverted: false, createdAt: c.sceneIdx,
    }));
    const records: ScreenplaySceneRecord[] = buildScreenplayMemory(commits);

    // Reversal-detection: legacy vs detected vs the corpus's OWN ground-truth
    // `reversal` label (per-scene confusion matrix — the direct-validation
    // opportunity this corpus uniquely offers among the four signals).
    const revResult = detectReversals(records);
    const revDelta = computeReversalDelta(records);
    const detectedScenes = new Set(revResult.reversals.map(r => r.sceneIdx));
    let tp = 0, fp = 0, fn = 0, tn = 0;
    converted.forEach((c) => {
      const labeled = c.annotatedReversal;
      const detected = detectedScenes.has(c.sceneIdx);
      if (labeled && detected) tp++;
      else if (!labeled && detected) fp++;
      else if (labeled && !detected) fn++;
      else tn++;
    });

    // Agency-signal / question-latency: run anyway (honest, not guessed) —
    // expected near-zero per the structural-ceiling note above; recorded,
    // not assumed.
    const charSet = new Set<string>();
    for (const s of scenes) for (const c of s.evidence?.characters_present ?? []) charSet.add(c);
    const protagonist = [...charSet][0] ?? '';
    let d1Disagree = 0;
    if (protagonist) {
      const d1 = computeD1AgencyDelta(records, protagonist);
      if (d1.disagreement) d1Disagree = 1;
    }
    const ql = computeQuestionLatencyDeduction(records);

    results.push({
      film, quality, sceneCount: scenes.length,
      legacyReversalCount: revDelta.legacyCount, detectedReversalCount: revDelta.detectedCount,
      tp, fp, fn, tn,
      agencyD1Runs: protagonist ? 1 : 0, agencyD1Disagree: d1Disagree,
      questionLatencyGated: ql.gated ? 1 : 0,
    });
  }

  console.log(`\n${results.length} films measured (>= ${MIN_SCENES} scenes each, of ${filmDirs.length} film directories found).`);

  // Reversal-detection: confusion matrix + precision/recall/F1 + quality correlation
  const totalTp = results.reduce((s, r) => s + r.tp, 0);
  const totalFp = results.reduce((s, r) => s + r.fp, 0);
  const totalFn = results.reduce((s, r) => s + r.fn, 0);
  const totalTn = results.reduce((s, r) => s + r.tn, 0);
  const precision = totalTp + totalFp > 0 ? totalTp / (totalTp + totalFp) : NaN;
  const recall = totalTp + totalFn > 0 ? totalTp / (totalTp + totalFn) : NaN;
  const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : NaN;
  console.log('\n── A2. REVERSAL-DETECTION vs. corpus\'s own `reversal` annotation label (channel 2 only) ──');
  console.log(`  Confusion (scene-level): TP=${totalTp} FP=${totalFp} FN=${totalFn} TN=${totalTn}`);
  console.log(`  Precision=${precision.toFixed(3)}  Recall=${recall.toFixed(3)}  F1=${f1.toFixed(3)}`);
  const rQuality = pearson(results.map(r => r.quality), results.map(r => r.detectedReversalCount));
  const rLegacyQuality = pearson(results.map(r => r.quality), results.map(r => r.legacyReversalCount));
  console.log(`  Pearson r(quality, detectedReversalCount) = ${rQuality.toFixed(4)}`);
  console.log(`  Pearson r(quality, legacyReversalCount)   = ${rLegacyQuality.toFixed(4)}  (comparison baseline)`);

  console.log('\n── A1/A3/A4. AGENCY-SIGNAL / QUESTION-LATENCY / TRUTH-EXTRACTION — run anyway, honest zero ──');
  const agencyRuns = results.filter(r => r.agencyD1Runs > 0).length;
  const agencyDisagree = results.reduce((s, r) => s + r.agencyD1Disagree, 0);
  const qlGated = results.reduce((s, r) => s + r.questionLatencyGated, 0);
  console.log(`  agency-signal D1 disagreement: ${agencyDisagree}/${agencyRuns} films (expect ~0 — see structural-ceiling note above).`);
  console.log(`  question-latency gate passed: ${qlGated}/${results.length} films (expect 0 — raised is always 0 on the ops-derived path).`);
  console.log('  truth-extraction: CANNOT-MEASURE — no bridge path exists (see structural-ceiling note above); not attempted.');

  report.partA = {
    measured: true, filmCount: results.length,
    reversalDetection: { tp: totalTp, fp: totalFp, fn: totalFn, tn: totalTn, precision, recall, f1, rQualityDetected: rQuality, rQualityLegacy: rLegacyQuality },
    agencySignal: { runs: agencyRuns, disagree: agencyDisagree },
    questionLatency: { gatedPassed: qlGated, total: results.length },
    truthExtraction: { measured: false, reason: 'no bridge path from structured annotations to raw Fountain text' },
    results,
  };
}

// ════════════════════════════════════════════════════════════════════════
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
console.log(`\nWrote ${OUT_FILE}`);
console.log('\nDone. Neither this script nor its output changes any scoring path — see file header.');
