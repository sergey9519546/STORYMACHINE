#!/usr/bin/env node
// COMPUTE AGREEMENT — Fleiss' kappa over collect-labels.mjs's aggregate,
// per-script disagreement listing, and the ADR-002 hard gate:
// kappa >= 0.60 PASS/FAIL.
//
// Only scripts with a COMPLETE, fixed-size rating set are included in the
// kappa computation (every reader in the aggregate rated it, no ABSTAIN) —
// Fleiss' kappa requires every item to have the same number of raters
// (scripts/p1-labeling/lib/fleiss-kappa.mjs enforces this and throws
// otherwise). Incomplete/ABSTAIN-containing scripts are reported separately,
// never silently dropped without a count.
//
// ============================================================================
// USAGE
// ============================================================================
//   node scripts/p1-labeling/compute-agreement.mjs \
//     --labels=data/p1-labeling/labels-aggregate.json \
//     [--out=data/p1-labeling/agreement-report.md]   (default shown)
//     [--threshold=0.60]                             (ADR-002's gate; default shown)
//   node scripts/p1-labeling/compute-agreement.mjs --help
//
// Exit code: 0 if the kappa gate PASSES, 1 if it FAILS (or if there are
// zero complete-rating scripts to compute over) — usable as a scripted
// gate check, though ADR-002's kappa gate is a one-time human decision
// point (docs/p1-benchmark/LABELING_KIT.md), not a CI assertion.

import fs from 'node:fs';
import path from 'node:path';
import { computeFleissKappa, interpretKappa } from './lib/fleiss-kappa.mjs';
import { assertSafeToWriteLabelData, REPO_ROOT } from './lib/git-guard.mjs';

const CATEGORIES = ['A', 'B', 'C', 'D'];
const TIER_RANK = { A: 0, B: 1, C: 2, D: 3 };
const DEFAULT_THRESHOLD = 0.60; // ADR-002 "Why Fleiss' kappa >= 0.60?"
const DEFAULT_OUT_REL = 'data/p1-labeling/agreement-report.md';

const USAGE = `Usage: node scripts/p1-labeling/compute-agreement.mjs [options]

Required:
  --labels=<path>       labels-aggregate.json from collect-labels.mjs.

Optional:
  --out=<path>          Markdown report path. Default: ${DEFAULT_OUT_REL}
  --threshold=<number>  Kappa gate threshold. Default: ${DEFAULT_THRESHOLD} (ADR-002).
  --help                Print this message and exit 0.
`;

function parseArgs(argv) {
  const out = { threshold: DEFAULT_THRESHOLD, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--labels=')) out.labels = a.slice('--labels='.length);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
    else if (a.startsWith('--threshold=')) out.threshold = Number(a.slice('--threshold='.length));
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
if (!args.labels) {
  console.error('ERROR: --labels=<path> is required.\n');
  console.error(USAGE);
  process.exit(2);
}
if (!Number.isFinite(args.threshold) || args.threshold < 0 || args.threshold > 1) {
  console.error(`ERROR: --threshold=${args.threshold} must be a number in [0, 1].`);
  process.exit(2);
}

const labelsPath = path.resolve(args.labels);
if (!fs.existsSync(labelsPath)) {
  console.error(`ERROR: ${labelsPath} does not exist.`);
  process.exit(1);
}
const aggregate = JSON.parse(fs.readFileSync(labelsPath, 'utf-8'));
const readers = aggregate.readers ?? [];
const n = readers.length;
if (n < 2) {
  console.error(`ERROR: aggregate lists ${n} reader(s) — Fleiss' kappa needs >= 2 raters per item (ADR-002 requires >= 3).`);
  process.exit(1);
}

const scriptIds = Object.keys(aggregate.scripts ?? {}).sort();
const complete = [];
const excluded = [];

for (const id of scriptIds) {
  const entry = aggregate.scripts[id];
  const ratings = entry.ratings ?? [];
  const byReader = new Map(ratings.map((r) => [r.reader, r]));
  const missingReaders = readers.filter((r) => !byReader.has(r));
  const abstained = ratings.filter((r) => r.tier === 'ABSTAIN').map((r) => r.reader);

  if (missingReaders.length > 0 || abstained.length > 0) {
    excluded.push({
      id,
      reason: [
        missingReaders.length > 0 ? `missing rating from: ${missingReaders.join(', ')}` : null,
        abstained.length > 0 ? `ABSTAIN from: ${abstained.join(', ')}` : null,
      ].filter(Boolean).join('; '),
    });
    continue;
  }

  const counts = CATEGORIES.map((cat) => ratings.filter((r) => r.tier === cat).length);
  const tiersByReader = Object.fromEntries(ratings.map((r) => [r.reader, r.tier]));
  complete.push({ id, counts, ratings, tiersByReader });
}

console.log('═'.repeat(78));
console.log('COMPUTE AGREEMENT');
console.log('═'.repeat(78));
console.log(`labels file       : ${labelsPath}`);
console.log(`readers           : ${readers.join(', ')} (n=${n})`);
console.log(`scripts total     : ${scriptIds.length}`);
console.log(`complete (in kappa): ${complete.length}`);
console.log(`excluded          : ${excluded.length}`);
if (excluded.length > 0) {
  for (const e of excluded.slice(0, 10)) console.log(`  ${e.id}: ${e.reason}`);
  if (excluded.length > 10) console.log(`  ... and ${excluded.length - 10} more`);
}

const hasData = complete.length > 0;
if (!hasData) {
  console.error('\n[NO DATA] Zero scripts have a complete rating set — cannot compute Fleiss\' kappa.');
  console.error('  A report documenting this (and why each script was excluded) is still written');
  console.error('  below, so a partial-round checkpoint is never silently discarded.');
}

const table = complete.map((c) => c.counts);
const result = hasData ? computeFleissKappa(table) : null;
const band = hasData ? interpretKappa(result.kappa) : 'N/A (no complete-rating scripts)';
const gatePass = hasData && result.kappa >= args.threshold;

// ── Per-script disagreement listing ───────────────────────────────────────
// Sorted by P_i ascending (worst agreement first). "Major" disagreement per
// PRE_REGISTRATION_PROTOCOL.md §3 "Conflict Resolution": tier span >= 2
// ranks apart (e.g. A vs C, A vs D) — flagged for consensus discussion,
// distinct from "minor" adjacent-tier disagreement resolved by majority
// vote. ABSTAIN never reaches here (ABSTAIN-containing scripts are already
// routed to `excluded` above), so TIER_RANK only ever sees A/B/C/D.
const disagreements = hasData ? complete.map((c, i) => {
  const tiers = Object.values(c.tiersByReader);
  const ranks = tiers.map((t) => TIER_RANK[t]);
  const span = Math.max(...ranks) - Math.min(...ranks);
  return { id: c.id, Pi: result.Pi[i], tiersByReader: c.tiersByReader, span, severity: span >= 2 ? 'MAJOR' : span === 1 ? 'minor' : 'none' };
}).sort((a, b) => a.Pi - b.Pi) : [];

const majorCount = disagreements.filter((d) => d.severity === 'MAJOR').length;
const minorCount = disagreements.filter((d) => d.severity === 'minor').length;
const noneCount = disagreements.filter((d) => d.severity === 'none').length;

if (hasData) {
  console.log('\n── Category proportions (p_j) ──────────────────────────────');
  CATEGORIES.forEach((cat, j) => console.log(`  ${cat}: ${(result.pj[j] * 100).toFixed(1)}%`));

  console.log('\n── Result ───────────────────────────────────────────────────');
  console.log(`P_bar (observed agreement)     : ${result.Pbar.toFixed(4)}`);
  console.log(`P_e (chance-expected agreement): ${result.Pe.toFixed(4)}`);
  console.log(`Fleiss' kappa                  : ${result.kappa.toFixed(4)}  (${band}, Landis & Koch 1977)`);
  console.log(`Gate (ADR-002, kappa >= ${args.threshold}): ${gatePass ? 'PASS' : 'FAIL'}`);
  console.log(`\nDisagreement: ${noneCount} unanimous, ${minorCount} minor (adjacent tier), ${majorCount} MAJOR (span >= 2 tiers, flag for consensus per PRE_REGISTRATION_PROTOCOL.md §3)`);

  console.log('\n── Worst agreement (lowest P_i first, top 10) ───────────────');
  for (const d of disagreements.slice(0, 10)) {
    const tierStr = Object.entries(d.tiersByReader).map(([r, t]) => `${r}=${t}`).join(' ');
    console.log(`  [${d.severity.padEnd(5)}] ${d.id}  P_i=${d.Pi.toFixed(3)}  ${tierStr}`);
  }
}

// ── Write report ───────────────────────────────────────────────────────────
const outPath = path.resolve(args.out ?? path.join(REPO_ROOT, DEFAULT_OUT_REL));
assertSafeToWriteLabelData(path.dirname(outPath), { toolName: 'compute-agreement.mjs' });

const reportLines = [];
reportLines.push('# P1 Benchmark — Inter-Rater Agreement Report');
reportLines.push('');
reportLines.push(`Generated: ${new Date().toISOString()}`);
reportLines.push(`Labels file: \`${path.relative(REPO_ROOT, labelsPath)}\``);
reportLines.push(`Gate (ADR-002 §"Why Fleiss' kappa >= 0.60?"): kappa >= ${args.threshold}`);
reportLines.push('');
reportLines.push('## Result');
reportLines.push('');
reportLines.push(`| Metric | Value |`);
reportLines.push(`|---|---|`);
reportLines.push(`| Readers | ${readers.join(', ')} (n=${n}) |`);
reportLines.push(`| Scripts with complete ratings | ${complete.length} |`);
reportLines.push(`| Scripts excluded (incomplete/ABSTAIN) | ${excluded.length} |`);
if (hasData) {
  reportLines.push(`| P_bar (observed agreement) | ${result.Pbar.toFixed(4)} |`);
  reportLines.push(`| P_e (chance-expected agreement) | ${result.Pe.toFixed(4)} |`);
  reportLines.push(`| **Fleiss' kappa** | **${result.kappa.toFixed(4)}** |`);
} else {
  reportLines.push(`| P_bar (observed agreement) | N/A |`);
  reportLines.push(`| P_e (chance-expected agreement) | N/A |`);
  reportLines.push(`| **Fleiss' kappa** | **N/A — zero scripts had a complete rating set** |`);
}
reportLines.push(`| Interpretation (Landis & Koch 1977) | ${band} |`);
reportLines.push(`| **Gate** | **${gatePass ? 'PASS' : 'FAIL'}** |`);
reportLines.push('');
reportLines.push('## Category proportions');
reportLines.push('');
if (hasData) {
  reportLines.push('| Tier | Share of all ratings |');
  reportLines.push('|---|---|');
  CATEGORIES.forEach((cat, j) => reportLines.push(`| ${cat} | ${(result.pj[j] * 100).toFixed(1)}% |`));
} else {
  reportLines.push('N/A — zero scripts had a complete rating set (see "Excluded from kappa" below).');
}
reportLines.push('');
reportLines.push('## Disagreement summary');
reportLines.push('');
reportLines.push(`Unanimous: ${noneCount}  |  Minor (adjacent tier): ${minorCount}  |  **MAJOR (span >= 2 tiers): ${majorCount}**`);
reportLines.push('');
reportLines.push('MAJOR-disagreement scripts are flagged for consensus discussion per');
reportLines.push('`PRE_REGISTRATION_PROTOCOL.md` §3 "Conflict Resolution" — raters discuss');
reportLines.push('while still blind to each other\'s original justification, then reach');
reportLines.push('consensus or exclude the script from the corpus. Minor disagreements');
reportLines.push('resolve by majority vote per the same section.');
reportLines.push('');
reportLines.push('## Per-script agreement (worst first)');
reportLines.push('');
reportLines.push('| Script | P_i | Severity | Ratings |');
reportLines.push('|---|---|---|---|');
for (const d of disagreements) {
  const tierStr = Object.entries(d.tiersByReader).map(([r, t]) => `${r}=${t}`).join(', ');
  reportLines.push(`| ${d.id} | ${d.Pi.toFixed(3)} | ${d.severity} | ${tierStr} |`);
}
if (excluded.length > 0) {
  reportLines.push('');
  reportLines.push('## Excluded from kappa (incomplete or ABSTAIN)');
  reportLines.push('');
  reportLines.push('| Script | Reason |');
  reportLines.push('|---|---|');
  for (const e of excluded) reportLines.push(`| ${e.id} | ${e.reason} |`);
}
reportLines.push('');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, reportLines.join('\n') + '\n', 'utf-8');
console.log(`\nwrote ${path.relative(REPO_ROOT, outPath)}`);

process.exit(gatePass ? 0 : 1);
