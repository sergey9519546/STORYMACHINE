// Anti-slop discrimination evidence generator (the runnable "on real writing" proof).
//
// WHY: server/nvm/analyze/anti-slop.ts's screenplayAIMarkers signal (64 Tier 1
// patterns) shipped UNVALIDATED — its header claimed a "<0.1 false positives/film"
// target that had never been measured. CLAUDE.md's quality bar forbids exactly
// this: any scoring change needs "runnable discrimination evidence on real
// writing", not synthetic fire/no-fire fixtures. This script IS that evidence.
//
// It runs detectSlop() over a directory of REAL, professionally produced
// screenplays (the negative class — human writing that SHOULD score near-zero
// AI markers) and reports the false-positive density distribution. If an
// --ai <dir> of AI-generated screenplays is also given (the positive class),
// it additionally reports class separation (mean gap + a simple threshold AUC),
// which is the full discrimination claim.
//
// COPYRIGHT BOUNDARY (same rule as tests/core/real-script-corpus.test.ts): the
// screenplay text is never committed. Point --corpus at a local directory of
// *.fountain.txt / *.txt files. The committed artifact is this script and the
// numbers it prints, which are reproducible against any equivalent corpus.
//
// Run:
//   node --experimental-strip-types scripts/measure-slop-discrimination.ts --corpus <dir>
//   node --experimental-strip-types scripts/measure-slop-discrimination.ts --corpus <real> --ai <ai>
//
// This is a validation tool, not engine code: it adds no rules and touches no
// formula. It only reads the existing deterministic detectSlop() surface.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { detectSlop } from '../server/nvm/analyze/anti-slop.ts';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const CORPUS = arg('--corpus');
const AI = arg('--ai');
const MIN_LINES = Number(arg('--min-lines') ?? 50); // skip fragments/stubs

if (!CORPUS) {
  console.error('usage: --corpus <dir> [--ai <dir>] [--min-lines N]');
  process.exit(2);
}

interface FilmRow {
  name: string;
  lines: number;
  markerLines: number;
  densityPer1k: number;
  slop: number;
  byCat: Record<string, number>;
}

function measureDir(dir: string): FilmRow[] {
  if (!statSync(dir).isDirectory()) throw new Error(`not a directory: ${dir}`);
  const files = readdirSync(dir).filter(f => f.endsWith('.fountain.txt') || f.endsWith('.txt'));
  const rows: FilmRow[] = [];
  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(path.join(dir, f), 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n').length;
    if (lines < MIN_LINES) continue;
    const r = detectSlop(text);
    const m = r.screenplayAIMarkers;
    rows.push({
      name: f.replace(/\.(fountain\.)?txt$/, ''),
      lines,
      markerLines: m.detection.count,
      densityPer1k: (m.detection.count / lines) * 1000,
      slop: r.slopScore,
      byCat: m.byCategory,
    });
  }
  return rows;
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function summarize(label: string, rows: FilmRow[]) {
  const n = rows.length;
  const totalMarker = rows.reduce((s, r) => s + r.markerLines, 0);
  const avgPerFilm = totalMarker / n;
  const dens = rows.map(r => r.densityPer1k).sort((a, b) => a - b);
  const catTotals: Record<string, number> = {};
  for (const r of rows) for (const [k, v] of Object.entries(r.byCat)) catTotals[k] = (catTotals[k] ?? 0) + v;

  console.log(`\n=== ${label}: ${n} screenplays ===`);
  console.log(`marker-lines / film       mean=${avgPerFilm.toFixed(2)}`);
  console.log(`density /1k lines   p50=${pct(dens, 0.5).toFixed(2)}  p90=${pct(dens, 0.9).toFixed(2)}  p99=${pct(dens, 0.99).toFixed(2)}  max=${dens[dens.length - 1].toFixed(2)}`);
  console.log(`films with zero markers   ${rows.filter(r => r.markerLines === 0).length} / ${n}`);
  console.log(`per-category marker total (mean/film):`);
  for (const [k, v] of Object.entries(catTotals).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(24)} ${String(v).padStart(5)}   ${(v / n).toFixed(3)}/film`);
  }
  return { n, avgPerFilm, dens, catTotals };
}

const real = measureDir(CORPUS);
if (real.length === 0) {
  console.error(`no eligible screenplays (>= ${MIN_LINES} lines) in ${CORPUS}`);
  process.exit(1);
}
const realStats = summarize('REAL (negative class — human writing)', real);

// Suggested regression ceilings for the env-gated test, derived from measurement
// with head-room so honest human writing never flaps the gate.
console.log(`\n--- suggested false-positive ceilings (measured baseline + margin) ---`);
console.log(`  mean marker-lines/film ceiling : ${(realStats.avgPerFilm * 1.6).toFixed(1)}  (observed ${realStats.avgPerFilm.toFixed(2)})`);
console.log(`  p90 density/1k ceiling         : ${(pct(realStats.dens, 0.9) * 1.6).toFixed(2)}  (observed ${pct(realStats.dens, 0.9).toFixed(2)})`);

if (AI) {
  const ai = measureDir(AI);
  if (ai.length === 0) {
    console.error(`--ai given but no eligible files in ${AI}`);
    process.exit(1);
  }
  const aiStats = summarize('AI (positive class — should score HIGHER)', ai);

  // Threshold-sweep AUC on density/1k: fraction of (ai, real) pairs correctly ordered.
  let correct = 0, ties = 0, total = 0;
  for (const a of ai) for (const r of real) {
    total++;
    if (a.densityPer1k > r.densityPer1k) correct++;
    else if (a.densityPer1k === r.densityPer1k) ties++;
  }
  const auc = (correct + ties / 2) / total;
  console.log(`\n=== DISCRIMINATION (density/1k, AI vs real) ===`);
  console.log(`mean gap  ai=${aiStats.avgPerFilm.toFixed(2)}  real=${realStats.avgPerFilm.toFixed(2)}`);
  console.log(`pairwise AUC = ${auc.toFixed(3)}   (0.5 = coin flip, 1.0 = perfect separation)`);
  if (auc < 0.7) console.log(`VERDICT: markers do NOT meaningfully separate AI from human writing on this corpus.`);
  else console.log(`VERDICT: markers separate the classes (AUC >= 0.7).`);
} else {
  console.log(`\n(no --ai corpus given: negative-control false-positive rate only; full`);
  console.log(` AUC separation needs an AI-generated positive class.)`);
}
