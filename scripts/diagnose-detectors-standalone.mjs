#!/usr/bin/env node
// Standalone detector-diagnostic runner — computes the D1/D2 (agency-signal),
// D3 (reversal-detection), and QL (question-latency-deduction) diagnostics
// across a corpus partition WITHOUT running the full 14-pass doctor + 4
// degradations per script that measure-auc-split.mjs requires.
//
// WHY THIS EXISTS: measure-auc-split.mjs computes these diagnostics inside
// its main AUC loop, so even with --with-agency-signal / --with-reversal-
// detection / --with-question-latency-deduction, it still runs runScriptDoctor
// 5 times per script (1 base + 4 degradations). On a 152-script partition
// that is ~760 doctor runs and can exceed an hour on a slow machine. The
// diagnostics themselves only need the REAL (undegraded) text analyzed once
// via analyzeFountainText — which takes ~0.15s per script. This script does
// exactly that: one analyzeFountainText pass per script, all three detector
// diagnostics, ~2-5 min for a full partition regardless of machine speed.
//
// This is DIAGNOSTIC ONLY — it does not touch health, AUC, the AUC-24
// ratchet, or any committed baseline CSV. It writes its tables to a separate
// file (detector-diagnostics-<partition>.csv) and stdout. Whether to wire
// any detector into a scoring path is a separate, receipt-gated decision
// requiring the full P1 evidence protocol (per CLAUDE.md).
//
// Usage:
//   node scripts/diagnose-detectors-standalone.mjs --partition=train
//   node scripts/diagnose-detectors-standalone.mjs --partition=val
//   node scripts/diagnose-detectors-standalone.mjs --partition=test   # final
//
// Reads the same corpus-split.json + data/screenplays/ as measure-auc-split.

import fs from 'node:fs';
import path from 'node:path';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { computeReversalDelta } from '../server/nvm/analyze/reversal-detection.ts';
import {
  computeD1AgencyDelta,
  computeD2AgencyDelta,
} from '../server/nvm/analyze/agency-signal.ts';
import { computeQuestionLatencyDeduction } from '../server/nvm/analyze/question-latency-deduction.ts';
import { requireCorpus } from './lib/output-guard.mjs';

const SRC_DIR = 'data/screenplays';
const OUT_DIR = 'scripts/output';
const SPLIT_FILE = path.join(OUT_DIR, 'corpus-split.json');

const arg = process.argv.find(a => a.startsWith('--partition='));
const PARTITION = arg ? arg.split('=')[1] : 'val';
const VALID = ['train', 'val', 'test'];
if (!VALID.includes(PARTITION)) {
  console.error(`Invalid partition "${PARTITION}". Use --partition=train|val|test`);
  process.exit(1);
}

const split = JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8'));
const files = split[PARTITION].map(s => s.file);
requireCorpus(files.length, {
  label: `${PARTITION} partition of ${SPLIT_FILE}`,
  hint: 'Run scripts/split-corpus.mjs first, or pick a different --partition.',
});

console.log(`=== DETECTOR DIAGNOSTICS — partition: ${PARTITION} (${files.length} scripts) ===`);
console.log('One analyzeFountainText pass per script (no degradations, no full doctor).');
console.log('D1/D2 = agency-signal disagreement with legacy passivity predicate.');
console.log('D3    = reversal-detection disagreement with legacy suspense-dip counter.');
console.log('QL    = question-latency-deduction value (unwired, diagnostic only).');
console.log('');

let processed = 0, skipped = 0;
const rows = [];
let d1Disagree = 0, d2Disagree = 0, d3Disagree = 0, d3LegacyMisses = 0, qlNonZero = 0;
let qlSum = 0, qlMax = 0;

for (const file of files) {
  let text;
  try { text = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8'); }
  catch { skipped++; continue; }

  try {
    const { records, characters } = analyzeFountainText(text);
    const protagonist = characters[0];

    // D3: reversal detection (no protagonist dependency)
    let legacyRev = 0, detectedRev = 0, revDisagree = false;
    try {
      const r = computeReversalDelta(records);
      legacyRev = r.legacyCount;
      detectedRev = r.detectedCount;
      revDisagree = r.delta !== 0;
      if (revDisagree) d3Disagree++;
      if (legacyRev === 0 && detectedRev >= 1) d3LegacyMisses++;
    } catch { /* skip this diagnostic */ }

    // D1/D2: agency signal (requires a protagonist guess)
    let d1DisagreeThis = null, d2DisagreeThis = null;
    if (protagonist) {
      try {
        const d1 = computeD1AgencyDelta(records, protagonist);
        const d2 = computeD2AgencyDelta(records, protagonist);
        d1DisagreeThis = d1.disagreement;
        d2DisagreeThis = d2.disagreement;
        if (d1.disagreement) d1Disagree++;
        if (d2.disagreement) d2Disagree++;
      } catch { /* skip */ }
    }

    // QL: question-latency deduction (no protagonist dependency)
    let qlDeduction = 0;
    try {
      const ql = computeQuestionLatencyDeduction(records);
      qlDeduction = ql.deduction;
      qlSum += qlDeduction;
      if (qlDeduction > qlMax) qlMax = qlDeduction;
      if (qlDeduction > 0) qlNonZero++;
    } catch { /* skip */ }

    rows.push({
      file, protagonist: protagonist ?? '(none)',
      legacyRev, detectedRev, revDisagree,
      d1DisagreeThis, d2DisagreeThis,
      qlDeduction,
    });
    processed++;
    if (processed % 25 === 0) console.error(`  ...${processed}/${files.length}`);
  } catch {
    skipped++;
  }
}

console.log('');
console.log('────────────────────────────────────────────────────────────────────────');
console.log(`SUMMARY — ${processed} processed, ${skipped} skipped (missing/unanalyzable)`);
console.log('────────────────────────────────────────────────────────────────────────');
console.log('');
console.log('D1 (agency at peak):     disagreement rate  ' + (d1Disagree / Math.max(1, processed) * 100).toFixed(1) + '%  (' + d1Disagree + '/' + processed + ')');
console.log('  legacy predicate calls peak-scene passive but agency-aware read finds agency there');
console.log('D2 (agency in Act 3):    disagreement rate  ' + (d2Disagree / Math.max(1, processed) * 100).toFixed(1) + '%  (' + d2Disagree + '/' + processed + ')');
console.log('  legacy calls all Act-3 scenes passive but agency-aware read finds initiative in >=1');
console.log('D3 (reversal detection): disagreement rate  ' + (d3Disagree / Math.max(1, processed) * 100).toFixed(1) + '%  (' + d3Disagree + '/' + processed + ')');
console.log('  legacy-misses-entirely rate (legacy=0, detected>=1)  ' + (d3LegacyMisses / Math.max(1, processed) * 100).toFixed(1) + '%  (' + d3LegacyMisses + '/' + processed + ')');
console.log('QL (question-latency):  mean deduction ' + (qlSum / Math.max(1, processed)).toFixed(2) + ', max ' + qlMax + ', non-zero on ' + qlNonZero + '/' + processed + ' (' + (qlNonZero / Math.max(1, processed) * 100).toFixed(1) + '%)');
console.log('');

// Write per-script CSV for the record
const csvHeader = 'file,protagonist,legacyReversals,detectedReversals,reversalDisagree,d1Disagree,d2Disagree,qlDeduction';
const csvBody = rows.map(r =>
  [r.file, r.protagonist, r.legacyRev, r.detectedRev, r.revDisagree, r.d1DisagreeThis ?? '', r.d2DisagreeThis ?? '', r.qlDeduction].join(',')
).join('\n');
const outFile = path.join(OUT_DIR, `detector-diagnostics-${PARTITION}.csv`);
fs.writeFileSync(outFile, csvHeader + '\n' + csvBody + '\n', 'utf-8');
console.log(`Wrote ${rows.length} rows to ${outFile}`);
