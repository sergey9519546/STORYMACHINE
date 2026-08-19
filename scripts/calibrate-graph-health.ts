// Graph-health calibration harness (GODMODE L5).
//
// Runs the real fountain analyzer + story-graph + graph-health deduction over
// the controlled-richness REFERENCE_CORPUS (20 scripts, 4 quality bands) and
// reports whether the new health-formula channel discriminates bands.
//
// Usage:
//   node --experimental-strip-types scripts/calibrate-graph-health.ts
//
// This is a measurement script, not a test: it prints discrimination evidence
// so a human can decide whether the deduction weights need retuning. It never
// writes to the health formula itself.

import { REFERENCE_CORPUS, type CorpusBand } from '../server/nvm/analyze/calibration/corpus.ts';
import { runScriptDoctor, computeHealthScore } from '../server/nvm/analyze/doctor.ts';

interface SampleResult {
  label: string;
  band: CorpusBand;
  sceneCount: number;
  wordCount: number;
  graphHealthScore: number | null;
  graphDeduction: number;
  baseHealth: number;
  healthWithGraph: number;
  findings: string[];
}

const BAND_ORDER: CorpusBand[] = ['strong', 'competent', 'weak', 'troubled'];

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den > 0 ? num / den : 0;
}

/** Map quality band → ordinal rank for correlation (higher = better). */
function bandRank(band: CorpusBand): number {
  switch (band) {
    case 'strong': return 3;
    case 'competent': return 2;
    case 'weak': return 1;
    case 'troubled': return 0;
  }
}

async function scoreSample(label: string, band: CorpusBand, fountain: string): Promise<SampleResult> {
  const report = await runScriptDoctor(fountain);
  const gh = report.graphHealth;
  const baseHealth = computeHealthScore(report.bySeverity, report.sceneCount, report.wordCount);
  const graphDeduction = gh?.graphDeduction ?? 0;
  const healthWithGraph = report.health;

  return {
    label,
    band,
    sceneCount: report.sceneCount,
    wordCount: report.wordCount,
    graphHealthScore: gh?.graphHealthScore ?? null,
    graphDeduction,
    baseHealth,
    healthWithGraph,
    findings: gh?.findings ?? [],
  };
}

async function main(): Promise<void> {
  console.log('=== GRAPH-HEALTH CALIBRATION (REFERENCE_CORPUS) ===\n');
  console.log(`Samples: ${REFERENCE_CORPUS.length}`);
  console.log('Channel: graphHealthFromReport → graphDeduction (cap 15)\n');

  const results: SampleResult[] = [];
  for (const sample of REFERENCE_CORPUS) {
    const r = await scoreSample(sample.label, sample.band, sample.fountain);
    results.push(r);
    const gh = r.graphHealthScore === null ? 'n/a' : String(r.graphHealthScore);
    console.log(
      `${r.band.padEnd(10)} ${r.label.padEnd(22)} ` +
      `gh=${gh.padStart(3)}  ded=${String(r.graphDeduction).padStart(2)}  ` +
      `base=${r.baseHealth.toFixed(1).padStart(5)}  w/graph=${r.healthWithGraph.toFixed(1).padStart(5)}  ` +
      `scenes=${r.sceneCount}`,
    );
  }

  console.log('\n=== BAND MEANS ===');
  for (const band of BAND_ORDER) {
    const group = results.filter(r => r.band === band);
    const ghScores = group.map(r => r.graphHealthScore).filter((x): x is number => x !== null);
    const deds = group.map(r => r.graphDeduction);
    const bases = group.map(r => r.baseHealth);
    const withG = group.map(r => r.healthWithGraph);
    console.log(
      `${band.padEnd(10)} n=${group.length}  ` +
      `meanGH=${mean(ghScores).toFixed(1).padStart(5)}  ` +
      `meanDed=${mean(deds).toFixed(2).padStart(5)}  ` +
      `meanBase=${mean(bases).toFixed(1).padStart(5)}  ` +
      `meanWGraph=${mean(withG).toFixed(1).padStart(5)}`,
    );
  }

  // Discrimination: better bands should have HIGHER graphHealthScore and LOWER deduction.
  const ranks = results.map(r => bandRank(r.band));
  const ghScores = results.map(r => r.graphHealthScore ?? 0);
  const deds = results.map(r => r.graphDeduction);
  const base = results.map(r => r.baseHealth);
  const withG = results.map(r => r.healthWithGraph);

  const rGh = pearson(ranks, ghScores);
  const rDed = pearson(ranks, deds);
  const rBase = pearson(ranks, base);
  const rWith = pearson(ranks, withG);

  console.log('\n=== DISCRIMINATION (Pearson r vs band rank; strong=3 … troubled=0) ===');
  console.log(`graphHealthScore vs band:  r = ${rGh.toFixed(3)}   (want + : better scripts score higher)`);
  console.log(`graphDeduction   vs band:  r = ${rDed.toFixed(3)}   (want − : better scripts deduct less)`);
  console.log(`baseHealth       vs band:  r = ${rBase.toFixed(3)}   (existing craft channel)`);
  console.log(`health+graph     vs band:  r = ${rWith.toFixed(3)}   (combined)`);

  // Pairwise band monotonicity on mean deduction (strong ≤ competent ≤ weak ≤ troubled)
  console.log('\n=== DEDUCTION MONOTONICITY (band means) ===');
  const meanDed = (b: CorpusBand) => mean(results.filter(r => r.band === b).map(r => r.graphDeduction));
  let monoOk = true;
  for (let i = 0; i < BAND_ORDER.length - 1; i++) {
    const a = BAND_ORDER[i];
    const b = BAND_ORDER[i + 1];
    const da = meanDed(a);
    const db = meanDed(b);
    const ok = da <= db + 1e-9; // allow equal
    if (!ok) monoOk = false;
    console.log(`  ${a} (${da.toFixed(2)}) ${ok ? '≤' : '>'} ${b} (${db.toFixed(2)})  ${ok ? 'OK' : 'INVERT'}`);
  }

  // How often does the graph channel actually fire?
  const firing = results.filter(r => r.graphDeduction > 0).length;
  console.log(`\n=== COVERAGE ===`);
  console.log(`samples with deduction > 0: ${firing}/${results.length} (${((firing / results.length) * 100).toFixed(0)}%)`);

  // Top findings
  const findingCounts = new Map<string, number>();
  for (const r of results) {
    for (const f of r.findings) {
      const key = f.split('—')[0]?.trim() || f.slice(0, 60);
      findingCounts.set(key, (findingCounts.get(key) ?? 0) + 1);
    }
  }
  console.log('\n=== TOP FINDINGS ===');
  for (const [k, n] of [...findingCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`  ${String(n).padStart(2)}×  ${k}`);
  }

  console.log('\n=== VERDICT ===');
  const discOk = rGh > 0.15 && rDed < -0.10;
  if (discOk && monoOk) {
    console.log('PASS directionally: graph-health tracks band quality and deduction monotonicity holds.');
  } else if (discOk) {
    console.log('MIXED: correlation has the right sign, but band-mean monotonicity has an inversion — inspect weights.');
  } else if (firing === 0) {
    console.log('NO-FIRE: deduction never triggers on the controlled corpus — channel is inert here (may still fire on produced features).');
  } else {
    console.log('WEAK/WRONG-SIGN: graph-health does not yet discriminate the calibration bands. Do not raise the cap; retune weights or accept as structural diagnostic only.');
  }
  console.log(`monoOk=${monoOk}  rGh=${rGh.toFixed(3)}  rDed=${rDed.toFixed(3)}  firing=${firing}/${results.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
