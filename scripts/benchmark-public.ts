#!/usr/bin/env node
// `npm run benchmark:public` — run the distributable-corpus degradation
// benchmark and print the table. `-- --lock` rewrites the two committed
// artifacts the always-on test asserts against.
//
// This CLI computes NOTHING. Every number below comes from
// scripts/lib/public-benchmark.ts, which is the same module
// tests/core/public-benchmark.test.ts imports — so "what the CLI printed" and
// "what CI asserted" are the same code path, not two implementations that
// agree until they don't.
//
// The corpus is committed, so unlike `npm run measure-real` this needs no env
// var, no corpus mount and no owner. Anyone can reproduce every figure in
// docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md by running it.

import { writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  PUBLIC_BENCHMARK_LIMITS,
  PUBLIC_CORPUS_SETS,
  PUBLIC_CORPUS_SIZE,
  PUBLIC_LOCK_COMMAND,
  PUBLIC_MANIFEST_PATH,
  PUBLIC_SPLIT_PATH,
  PUBLIC_SPLIT_RULE,
  REPO_ROOT,
  listPublicCorpus,
  measurePublicBenchmark,
  partitionFor,
  type BenchmarkResult,
} from './lib/public-benchmark.ts';
import { PUBLIC_ORDER_FLOOR, PUBLIC_SHUFFLE_DROP_FLOOR } from './lib/auc.ts';

const USAGE = [
  'benchmark-public — degradation discrimination on the 32 distributable screenplays',
  '',
  'Usage:',
  '  npm run benchmark:public                 print the table',
  '  npm run benchmark:public -- --lock       also rewrite the manifest and split fixtures',
  '  npm run benchmark:public -- --control    also score the calibration corpus (labelled CONTROL)',
  '  npm run benchmark:public -- --json       print the whole result as JSON',
  '  npm run benchmark:public -- --quiet      suppress per-script progress',
  '',
  'No corpus mount, no env var, no owner-local step: the text is committed.',
].join('\n');

function out(line = ''): void {
  process.stdout.write(`${line}\n`);
}

function fixed(value: number, digits = 4): string {
  return Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

/** The split artifact, derived entirely from the rule + the files on disk. */
function buildSplit(): unknown {
  const scripts = listPublicCorpus();
  return {
    schemaVersion: 1,
    rule: PUBLIC_SPLIT_RULE,
    ruleImplementation: 'scripts/lib/public-benchmark.ts partitionFor()',
    preRegistered:
      'The assignment is a pure function of each file\'s own sha256, computed before any AUC '
      + 'was. Adding a script never reassigns an existing one; editing one moves its row here '
      + 'as a reviewable diff.',
    lockCommand: PUBLIC_LOCK_COMMAND,
    counts: {
      total: scripts.length,
      exploration: scripts.filter((s) => partitionFor(s.sha256) === 'exploration').length,
      holdout: scripts.filter((s) => partitionFor(s.sha256) === 'holdout').length,
    },
    assignments: scripts.map((s) => ({
      file: s.file,
      set: s.set,
      sha256: s.sha256,
      partition: partitionFor(s.sha256),
    })),
  };
}

function buildManifest(result: BenchmarkResult): unknown {
  return {
    schemaVersion: 1,
    lockCommand: PUBLIC_LOCK_COMMAND,
    note:
      'Locked from the tree at lock time. Every future scoring change that moves any of these '
      + 'numbers shows up here as a reviewable numeric diff — the thing that exists today only '
      + 'for a corpus CI cannot read (tests/fixtures/real-corpus-manifest.json).',
    sets: PUBLIC_CORPUS_SETS.map((s) => ({
      id: s.id,
      dir: s.dir,
      provenanceFile: s.provenanceFile,
      licence: s.licence,
    })),
    scriptCount: result.scripts.length,
    scripts: result.scripts,
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    out(USAGE);
    return;
  }
  const lock = argv.includes('--lock');
  const control = argv.includes('--control');
  const asJson = argv.includes('--json');
  const quiet = argv.includes('--quiet') || asJson;

  const started = Date.now();
  const result = await measurePublicBenchmark({
    includeCalibrationControl: control,
    onScript: quiet
      ? undefined
      : (file, i, total) => process.stderr.write(`  [${i + 1}/${total}] ${file}\n`),
  });
  const elapsedMs = Date.now() - started;

  if (asJson) {
    out(JSON.stringify({ elapsedMs, ...result }, null, 2));
    return;
  }

  out();
  out('='.repeat(78));
  out('PUBLIC BENCHMARK — degradation discrimination on distributable screenplays');
  out('='.repeat(78));
  out(`Corpus: ${result.scripts.length} .fountain files (expected ${PUBLIC_CORPUS_SIZE})`);
  for (const set of PUBLIC_CORPUS_SETS) {
    const n = result.scripts.filter((s) => s.file.startsWith(`${set.dir}/`)).length;
    out(`  ${set.id}: ${n} files — ${set.licence}`);
    out(`     provenance: ${set.provenanceFile}`);
    out(`     caveat:     ${set.caveat}`);
  }
  out(`Split rule: ${PUBLIC_SPLIT_RULE}`);
  out(`Runtime:    ${(elapsedMs / 1000).toFixed(1)}s`);
  out();

  for (const d of result.degradations) {
    const floor = d.id === 'SHUFFLE_DROP' ? PUBLIC_SHUFFLE_DROP_FLOOR : PUBLIC_ORDER_FLOOR;
    out('-'.repeat(78));
    out(`${d.id} — ${d.label}`);
    out(`  scene count preserved: ${d.sceneCountPreserving ? 'YES' : 'no'}`);
    out(`  recipe: ${d.recipe}`);
    out(`  source: ${d.source}`);
    out(`  N = ${d.n}${d.skipped.length ? `  (skipped: ${d.skipped.join(', ')})` : ''}`);
    out(
      `  AUC (all-pairs, the AUC-24 statistic): ${fixed(d.aucAllPairs)}  `
      + `95% CI [${fixed(d.ciAllPairs.lo)}, ${fixed(d.ciAllPairs.hi)}]   floor ${floor}`,
    );
    out(
      `  AUC (matched pair, the rebuild-experiment statistic): ${fixed(d.aucPaired)}  `
      + `95% CI [${fixed(d.ciPaired.lo)}, ${fixed(d.ciPaired.hi)}]`,
    );
    out(`  bootstrap: ${d.bootstrapIterations} resamples, seed ${d.bootstrapSeed}`);
    out(`  mean health gap (intact - degraded): ${fixed(d.meanGap, 2)} points`);
    out();
    out('  file                                                partition   intact  degraded    gap  scenes');
    for (const p of d.pairs) {
      out(
        `  ${p.file.padEnd(50)} ${p.partition.padEnd(11)} `
        + `${p.real.toFixed(1).padStart(6)} ${p.degraded.toFixed(1).padStart(9)} `
        + `${(p.real - p.degraded).toFixed(1).padStart(6)}  ${String(p.intactScenes).padStart(3)}->${String(p.degradedScenes).padEnd(3)}`,
      );
    }
    out();
    for (const partition of ['exploration', 'holdout'] as const) {
      const subset = d.pairs.filter((p) => p.partition === partition);
      if (subset.length === 0) continue;
      out(
        `  ${partition} only (N=${subset.length}): matched-pair AUC `
        + `${fixed(subset.reduce((a, p) => a + (p.real > p.degraded ? 1 : p.real === p.degraded ? 0.5 : 0), 0) / subset.length)}`,
      );
    }
    out();
  }

  if (result.calibrationControl) {
    out('-'.repeat(78));
    out('CALIBRATION CONTROL (not part of any asserted number)');
    out(`  ${result.calibrationControl.note}`);
    for (const b of result.calibrationControl.bands) {
      out(`  band ${b.band.padEnd(10)} n=${b.n}  mean health ${b.meanHealth.toFixed(2)}`);
    }
    const s = result.calibrationControl.strongOverTroubled;
    out(`  strong over troubled: ${s.ordered} of ${s.of} ordered, mean gap ${fixed(s.meanGap, 2)}`);
    out();
  }

  out('-'.repeat(78));
  out(PUBLIC_BENCHMARK_LIMITS);
  out('-'.repeat(78));

  if (lock) {
    const splitFile = path.join(REPO_ROOT, PUBLIC_SPLIT_PATH);
    const manifestFile = path.join(REPO_ROOT, PUBLIC_MANIFEST_PATH);
    writeFileSync(splitFile, `${JSON.stringify(buildSplit(), null, 2)}\n`);
    writeFileSync(manifestFile, `${JSON.stringify(buildManifest(result), null, 2)}\n`);
    out();
    out(`locked ${PUBLIC_SPLIT_PATH}`);
    out(`locked ${PUBLIC_MANIFEST_PATH}`);
    out('Review the diff before committing: a moved row is a moved score.');
  }
}

await main();
