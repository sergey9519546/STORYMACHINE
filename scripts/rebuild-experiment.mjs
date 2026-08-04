// REBUILD EXPERIMENT — "which signals actually separate?" as one command.
//
// ── What this answers ──────────────────────────────────────────────────────
// ROADMAP P1 (the One Bet) says: rebuild the score around the SMALLEST signal
// set that actually separates. Two facts make that concrete:
//
//   * docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md — on the
//     153-script hash-locked test partition, DIALOGUE_FLATTEN clears the gate
//     (0.990) but MIDPOINT_DROP 0.766, SCENE_SHUFFLE 0.734, CLIMAX_RELOCATE
//     0.523 (chance), ALL POOLED 0.754.
//   * doctor.ts lines 1893-1899 — the weighted-rule channel contributes AUC
//     ~0.076 to shuffle-drop discrimination while scene-count scarcity carries
//     ~0.938.
//
// Meanwhile FOUR candidate signals are built, tested, and unwired:
//   server/nvm/analyze/question-latency-deduction.ts   (ships its own deduction)
//   server/nvm/analyze/reversal-detection.ts           (diagnostic only)
//   server/nvm/analyze/agency-signal.ts                (diagnostic only)
//   server/nvm/analyze/truth-extraction.ts             (detector, no deduction)
//
// This harness scores every screenplay in a corpus, and every one of the four
// degradations, under 32 scoring configurations — all 16 subsets of those four
// signals, each with and without the weighted-rule channel zeroed — and reports
// AUC with a seeded bootstrap 95% CI for each. One run, one table, one ranking.
//
// ── What it must never do ──────────────────────────────────────────────────
// Touch a scoring file. This harness calls only EXPORTED functions
// (runScriptDoctor, computeHealthScore, analyzeFountainText, and the four
// candidate modules) and edits nothing. It also refuses --partition=test: the
// held-out set is hash-locked for a single final evaluation through
// scripts/measure-auc-split.mjs (MEASUREMENT_RUNBOOK.md), and exploration that
// touches it burns it. --partition=trainval (the default) additionally EXCLUDES
// every file listed in corpus-split.json's test array, so even a whole-directory
// run cannot leak into it.
//
// ── Run ────────────────────────────────────────────────────────────────────
//   node scripts/rebuild-experiment.mjs --help
//   node scripts/rebuild-experiment.mjs --with-calibration       # in-repo, directional
//   CORPUS_DIR=<local corpus> node scripts/rebuild-experiment.mjs --partition=trainval
//
// The mechanics (degradations, AUC, bootstrap, config matrix, candidate
// deduction shapes, CLI) live in scripts/lib/rebuild-experiment-lib.mjs so
// tests/core/rebuild-experiment.test.ts can assert them without a corpus. That
// file's header carries the line-by-line provenance of every ported piece.

import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { REFERENCE_CORPUS } from '../server/nvm/analyze/calibration/corpus.ts';
import { requireCorpus, guardedWrite } from './lib/output-guard.mjs';
import {
  DEGRADATIONS, SIGNALS, RAW_SIGNAL_COLUMNS, parseArgs, buildConfigs, configHealth,
  candidateDeductions, pairwiseAuc, bootstrapCi, CAVEAT_BLOCK, USAGE,
} from './lib/rebuild-experiment-lib.mjs';

const parsed = parseArgs(process.argv.slice(2), process.env);
if (!parsed.ok) { console.error(parsed.error); process.exit(1); }
const OPTS = parsed.opts;
if (OPTS.help) { console.log(USAGE); process.exit(0); }

console.log('=== REBUILD EXPERIMENT — which signals actually separate? ===\n');
console.log(CAVEAT_BLOCK);
console.log('');

// ── Corpus resolution ──────────────────────────────────────────────────────
// Every screenplay under the corpus dir is classified against
// scripts/output/corpus-split.json. Files the split never assigned (e.g. the
// 14 CC0 scripts added after the split was generated) count as "unassigned"
// and are included by trainval — they are, by construction, not in the
// held-out test set. A file IN the test set is dropped no matter what.
const SPLIT_FILE = path.join(OPTS.outDir, 'corpus-split.json');
const SCRIPT_EXT_RE = /\.(fountain|fountain\.txt|txt)$/i;

function walk(dir, base = dir) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, base));
    else if (SCRIPT_EXT_RE.test(e.name)) out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

let split = null;
if (fs.existsSync(SPLIT_FILE)) {
  try { split = JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8')); } catch { split = null; }
}
const inTest = new Set(split ? split.test.map(s => s.file) : []);
const inTrain = new Set(split ? split.train.map(s => s.file) : []);
const inVal = new Set(split ? split.val.map(s => s.file) : []);

const onDisk = walk(OPTS.corpusDir);
function keep(rel) {
  if (inTest.has(rel)) return false;               // never, under any partition
  if (OPTS.partition === 'train') return inTrain.has(rel);
  if (OPTS.partition === 'val') return inVal.has(rel);
  return true;                                      // trainval: train + val + unassigned
}
const files = onDisk.filter(keep).sort();
const excludedAsTest = onDisk.filter(rel => inTest.has(rel));
const unassigned = files.filter(rel => !inTrain.has(rel) && !inVal.has(rel));

console.log(`corpus dir:  ${OPTS.corpusDir}`);
console.log(`split file:  ${split ? SPLIT_FILE : '(none found — every file treated as unassigned)'}`);
console.log(`partition:   ${OPTS.partition}`);
console.log(`scripts:     ${files.length} on-disk kept `
  + `(${files.length - unassigned.length} split-assigned, ${unassigned.length} unassigned)`
  + `${excludedAsTest.length ? `, ${excludedAsTest.length} EXCLUDED as held-out test-partition files` : ''}`);
if (OPTS.withCalibration) console.log(`calibration: +${REFERENCE_CORPUS.length} samples (--with-calibration)`);
console.log(`bootstrap:   ${OPTS.bootstrap} resamples, seed ${OPTS.seed}`);
console.log('');

const sources = files.map(rel => ({
  label: rel,
  origin: 'corpus',
  read: () => fs.readFileSync(path.join(OPTS.corpusDir, rel), 'utf-8'),
}));
if (OPTS.withCalibration) {
  for (const s of REFERENCE_CORPUS) {
    sources.push({
      label: `calibration/${s.label.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.fountain`,
      origin: `calibration:${s.band}`,
      read: () => s.fountain,
    });
  }
}
requireCorpus(sources.length, {
  label: `${OPTS.partition} partition of ${OPTS.corpusDir}`,
  hint: 'Set CORPUS_DIR to a directory of .fountain scripts, or pass --with-calibration.',
});

// ── Scoring ────────────────────────────────────────────────────────────────
// Each variant (real + up to 4 degraded) is scored exactly ONCE: doctor health,
// the four candidate deductions, and the rule-channel-zero adjustment. Every
// configuration is then a linear combination of those numbers, so measuring 32
// configurations costs no more pipeline work than measuring one.
const ctx = { theme: '', genre: '', directorStyle: '', characters: [] };

async function scoreVariant(text) {
  let report;
  try { report = await runScriptDoctor(text, ctx, 'quick'); } catch { return null; }
  if (!report.sceneCount || report.sceneCount < 5) return null;
  let analysis;
  try { analysis = analyzeFountainText(text); } catch { return null; }
  return { health: report.health, report, deductions: candidateDeductions(text, analysis, report) };
}

const CONFIGS = buildConfigs();
/** pairs[configId][degradationId] = [{ real, degraded, file }] */
const pairs = {};
for (const c of CONFIGS) { pairs[c.id] = {}; for (const d of DEGRADATIONS) pairs[c.id][d.id] = []; }

const gatePass = Object.fromEntries(SIGNALS.map(s => [s, 0]));
const nonZero = Object.fromEntries(SIGNALS.map(s => [s, 0]));
/** How many (script, degradation) variants moved this signal's deduction away
 *  from the intact script's value. A signal that never moves cannot separate
 *  anything, whatever its level — this is the statistic that tells a saturated
 *  constant apart from a live detector. */
const responded = Object.fromEntries(SIGNALS.map(s => [s, 0]));
let variantCount = 0;
/** Variants whose doctor health hit the 0 floor. This is the one place the
 *  rule-channel add-back is NOT faithful: doctor.ts clamps health at 0
 *  (line 1939), so everything the weighted-rule channel took below zero is
 *  already destroyed before this harness can see the report, and adding the
 *  channel back recovers the same ceiling for every saturated variant. Two
 *  saturated variants therefore TIE under RULE_ZERO regardless of how
 *  differently damaged they are. Counted per degradation and reported, because
 *  it changes how a RULE_ZERO row on that degradation may be read. */
const saturatedByDeg = Object.fromEntries(DEGRADATIONS.map(d => [d.id, 0]));
const perScript = [];
let scored = 0, skipped = 0, saturated = 0;

for (const src of sources) {
  let text;
  try { text = src.read(); } catch { skipped++; continue; }
  const base = await scoreVariant(text);
  if (!base) { skipped++; continue; }
  scored++;
  if (base.health === 0) saturated++;
  for (const s of SIGNALS) {
    if (base.deductions[`${s}_gated`]) gatePass[s]++;
    if (base.deductions[s] > 0) nonZero[s]++;
  }
  perScript.push({
    file: src.label,
    origin: src.origin,
    sceneCount: base.report.sceneCount,
    wordCount: base.report.wordCount,
    health: base.health,
    ruleChannelPoints: +base.deductions.RULE_ZERO_ADJ.toFixed(3),
    QL: +base.deductions.QL.toFixed(3),
    REV: +base.deductions.REV.toFixed(3),
    AGENCY: +base.deductions.AGENCY.toFixed(3),
    TRUTH: +base.deductions.TRUTH.toFixed(3),
    raw: base.deductions.raw,
  });

  for (const d of DEGRADATIONS) {
    const degradedText = d.fn(text);
    if (degradedText === null) continue;
    const deg = await scoreVariant(degradedText);
    if (!deg) continue;
    variantCount++;
    if (deg.health === 0) saturatedByDeg[d.id]++;
    for (const s of SIGNALS) {
      if (deg.deductions[s] !== base.deductions[s]) responded[s]++;
    }
    for (const c of CONFIGS) {
      pairs[c.id][d.id].push({
        real: configHealth(c, base),
        degraded: configHealth(c, deg),
        file: src.label,
      });
    }
  }
}

requireCorpus(scored, {
  label: 'scripts that produced a usable doctor report (>= 5 scenes)',
  hint: 'Every source was skipped — check CORPUS_DIR and the partition filter.',
});

// ── Statistics ─────────────────────────────────────────────────────────────
const results = [];
for (const c of CONFIGS) {
  const row = { config: c.id, ruleZero: c.ruleZero, signals: c.signals, byDeg: {} };
  const pooled = [];
  for (const d of DEGRADATIONS) {
    const p = pairs[c.id][d.id];
    pooled.push(...p);
    row.byDeg[d.id] = {
      pairs: p.length,
      auc: pairwiseAuc(p),
      ci: bootstrapCi(p, OPTS.bootstrap, OPTS.seed),
    };
  }
  row.pooled = {
    pairs: pooled.length,
    auc: pairwiseAuc(pooled),
    ci: bootstrapCi(pooled, OPTS.bootstrap, OPTS.seed),
  };
  results.push(row);
}
const baselineRow = results.find(r => r.config === 'baseline');
for (const r of results) r.pooledLift = r.pooled.auc - baselineRow.pooled.auc;
const ranked = [...results].sort((a, b) => b.pooled.auc - a.pooled.auc || a.config.localeCompare(b.config));

// ── Report ─────────────────────────────────────────────────────────────────
const fmt = n => (Number.isNaN(n) ? '  n/a  ' : n.toFixed(3).padStart(7));
const ci = c => (Number.isNaN(c.lo) ? '[  n/a,   n/a]' : `[${c.lo.toFixed(3)}, ${c.hi.toFixed(3)}]`);

console.log(`\nScored ${scored} script(s); ${skipped} skipped (unreadable, <5 scenes, or analyzer failure).`);
console.log('\n── Health-floor saturation (health === 0) ──');
console.log(`intact scripts: ${saturated}/${scored}`);
for (const d of DEGRADATIONS) {
  console.log(`${d.id.padEnd(18)} degraded variants: ${saturatedByDeg[d.id]}/${baselineRow.byDeg[d.id].pairs}`);
}
if (saturated > 0 || Object.values(saturatedByDeg).some(n => n > 0)) {
  console.log('READ WITH CARE: doctor.ts floors health at 0, so a saturated variant has already lost');
  console.log('the information the weighted-rule channel took below zero. Adding the channel back');
  console.log('recovers the SAME ceiling for every saturated variant, which makes them TIE under any');
  console.log('RULE_ZERO configuration. A RULE_ZERO row on a degradation with many saturated variants');
  console.log('is measuring that floor, not the channel — and a BASELINE row on the same degradation');
  console.log('is measuring "degraded bottomed out", which is a weaker claim than the AUC suggests.');
}

console.log('\n── Candidate-signal coverage ──');
console.log('"gate passed" / "non-zero" are over intact scripts; "responded" is over all');
console.log(`${variantCount} degraded variants — how often the signal moved AWAY from the intact value.`);
console.log('signal | gate passed | non-zero | responded | note');
console.log('-------|-------------|----------|-----------|-------------------------------------');
const GATE_NOTE = {
  QL: 'module gate: >= 15 scenes AND >= 6 questions raised',
  REV: 'harness gate: >= 8 scenes',
  AGENCY: 'harness gate: >= 2 Act-3 scenes and a speaking protagonist',
  TRUTH: 'no gate — discrete contradiction count',
};
for (const s of SIGNALS) {
  console.log(`${s.padEnd(6)} | ${String(`${gatePass[s]}/${scored}`).padStart(11)} `
    + `| ${String(`${nonZero[s]}/${scored}`).padStart(8)} | ${String(`${responded[s]}/${variantCount}`).padStart(9)} | ${GATE_NOTE[s]}`);
}
console.log('A signal with 0 non-zero deductions did not MEASURE as useless — it never fired.');
console.log('A signal with responded=0 is a CONSTANT on this corpus and cannot separate anything.');

console.log('\n── All configurations, ranked by pooled AUC ──');
console.log('rank | configuration                  | pooled AUC | 95% CI           | lift vs baseline');
console.log('-----|--------------------------------|------------|------------------|-----------------');
ranked.forEach((r, i) => {
  const lift = Number.isNaN(r.pooledLift) ? ' n/a' : `${r.pooledLift >= 0 ? '+' : ''}${r.pooledLift.toFixed(3)}`;
  console.log(`${String(i + 1).padStart(4)} | ${r.config.padEnd(30)} | ${fmt(r.pooled.auc)}    | ${ci(r.pooled.ci)} | ${lift.padStart(16)}`);
});

console.log('\n── Per-degradation AUC (every configuration) ──');
console.log('configuration                  | ' + DEGRADATIONS.map(d => d.id.padEnd(15)).join(' | '));
console.log('-------------------------------|-' + DEGRADATIONS.map(() => '-'.repeat(15)).join('-|-'));
for (const r of ranked) {
  console.log(`${r.config.padEnd(30)} | ` + DEGRADATIONS.map(d => fmt(r.byDeg[d.id].auc).padEnd(15)).join(' | '));
}
console.log(`\nPairs per degradation (identical across configurations): `
  + DEGRADATIONS.map(d => `${d.id}=${baselineRow.byDeg[d.id].pairs}`).join(', '));

console.log('');
console.log(CAVEAT_BLOCK);

// ── Artifacts ──────────────────────────────────────────────────────────────
// New filenames, distinct from every committed evidence artifact — this
// harness can never shrink discrimination-auc-*.csv or real-corpus-scores.csv.
fs.mkdirSync(OPTS.outDir, { recursive: true });
const suffix = `${OPTS.partition}${OPTS.withCalibration ? '-with-calibration' : ''}`;

const aucHeader = 'config,ruleZero,signals,degradation,pairs,auc,ciLo,ciHi';
const aucRows = [];
for (const r of results) {
  for (const d of [...DEGRADATIONS.map(x => x.id), 'POOLED']) {
    const cell = d === 'POOLED' ? r.pooled : r.byDeg[d];
    aucRows.push([
      r.config, r.ruleZero, `"${r.signals.join(' ')}"`, d, cell.pairs,
      Number.isNaN(cell.auc) ? '' : cell.auc.toFixed(4),
      Number.isNaN(cell.ci.lo) ? '' : cell.ci.lo.toFixed(4),
      Number.isNaN(cell.ci.hi) ? '' : cell.ci.hi.toFixed(4),
    ].join(','));
  }
}
const AUC_FILE = path.join(OPTS.outDir, `rebuild-experiment-${suffix}.csv`);
guardedWrite(AUC_FILE, `${aucHeader}\n${aucRows.join('\n')}\n`, { rowCount: aucRows.length, label: AUC_FILE, force: OPTS.force });

const perScriptHeader = `file,origin,sceneCount,wordCount,health,ruleChannelPoints,QL,REV,AGENCY,TRUTH,${RAW_SIGNAL_COLUMNS.join(',')}`;
const perScriptRows = perScript.map(p => [
  p.file, p.origin, p.sceneCount, p.wordCount, p.health, p.ruleChannelPoints, p.QL, p.REV, p.AGENCY, p.TRUTH,
  ...RAW_SIGNAL_COLUMNS.map(k => p.raw[k] ?? ''),
].join(','));
const SIGNAL_FILE = path.join(OPTS.outDir, `rebuild-experiment-signals-${suffix}.csv`);
guardedWrite(SIGNAL_FILE, `${perScriptHeader}\n${perScriptRows.join('\n')}\n`, { rowCount: perScriptRows.length, label: SIGNAL_FILE, force: OPTS.force });

console.log(`\nWrote ${AUC_FILE} (${aucRows.length} rows) and ${SIGNAL_FILE} (${perScriptRows.length} rows).`);
