// Phase B metamorphic runner — asserts KNOWN score MOVEMENTS through the real
// doctor. Run:  node --experimental-strip-types evals/scoring/runner/run-metamorphic.ts
//
// CI contract (2026-07-14):
//   - HARD cases must pass — failure exits nonzero and fails CI.
//   - KNOWN-FAILING cases (currently empty_verbosity only) are printed as a
//     standing witness of the documented density verbosity bias; they do NOT
//     fail CI until the health formula is re-calibrated.
//   - See docs/scoring/VERBOSITY_BIAS_2026-07-11.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor } from '../../../server/nvm/analyze/doctor.ts';
import type { MetamorphicResult } from '../contracts/scoring-eval-case.ts';
import { METAMORPHIC_CASES } from './metamorphic-cases.ts';
import {
  KNOWN_FAILING_CASE_IDS,
  check,
  classifyResults,
  exitCodeForResults,
} from './metamorphic-lib.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = readFileSync(path.join(HERE, '../metamorphic/base.fountain'), 'utf8');

const WRITE_BASELINE = process.env.METAMORPHIC_WRITE_BASELINE === '1' || process.argv.includes('--write-baseline');

const baseReport = await runScriptDoctor(BASE);
const results: MetamorphicResult[] = [];
for (const c of METAMORPHIC_CASES) {
  const variant = c.transform(BASE);
  const vr = await runScriptDoctor(variant);
  const { passed, reason } = check(c, baseReport.health, vr.health);
  results.push({ id: c.id, category: c.category, baseHealth: baseReport.health, variantHealth: vr.health, delta: +(vr.health - baseReport.health).toFixed(2), passed, reason });
}

const pass = results.filter(r => r.passed).length;
const { hardFailures, knownFailures, unexpectedPasses, hardPasses } = classifyResults(results);

console.log(`\nMETAMORPHIC SUITE — base health ${baseReport.health} (${baseReport.sceneCount} scenes, verdict ${baseReport.verdict})`);
console.log('id'.padEnd(20), 'cat'.padEnd(12), 'base', ' var', '  Δ', '  result');
for (const r of results) {
  const tag = KNOWN_FAILING_CASE_IDS.has(r.id)
    ? (r.passed ? 'UNEXPECTED PASS' : 'KNOWN FAIL')
    : (r.passed ? 'PASS' : 'HARD FAIL');
  console.log(r.id.padEnd(20), r.category.padEnd(12), (''+r.baseHealth).padStart(4), (''+r.variantHealth).padStart(4), (''+r.delta).padStart(6), '  ', tag, r.passed ? '' : `(${r.reason})`);
}
console.log(`\n${pass}/${results.length} cases passed raw; hard passes ${hardPasses}; known-failing witnesses ${knownFailures.length}.`);

console.log('KNOWN FAILING POLICY: empty_verbosity (documented verbosity bias — not a CI hard fail)');
if (knownFailures.length > 0) {
  console.log(`CURRENT WITNESS: ${knownFailures.map(r => r.id).join(', ')} still fails as documented.`);
}
if (unexpectedPasses.length > 0) {
  console.log(`NOTE: known-failing case(s) now pass: ${unexpectedPasses.map(r => r.id).join(', ')} — flip them to HARD after confirming recalibration.`);
}

if (WRITE_BASELINE) {
  const goldenDir = path.join(HERE, '../golden');
  mkdirSync(goldenDir, { recursive: true });
  writeFileSync(path.join(goldenDir, 'metamorphic-baseline.json'), JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    baseHealth: baseReport.health,
    results,
    hardFailures: hardFailures.map(r => r.id),
    knownFailures: knownFailures.map(r => r.id),
  }, null, 2));
  console.log('wrote golden/metamorphic-baseline.json');
}

if (hardFailures.length > 0) {
  console.error(`\nHARD FAIL — ${hardFailures.length} metamorphic invariant(s) broken: ${hardFailures.map(r => r.id).join(', ')}`);
} else {
  console.log('\nHard metamorphic invariants hold.');
}
process.exitCode = exitCodeForResults(results);
