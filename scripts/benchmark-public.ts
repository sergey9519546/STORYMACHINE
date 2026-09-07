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

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  PUBLIC_BENCHMARK_LIMITS,
  PUBLIC_CONTROL_RATIONALE,
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
import { PUBLIC_FLOOR_MARGIN, PUBLIC_FLOORS } from './lib/auc.ts';

/** Repo-relative path of the file whose floor constants `--lock` rewrites. */
const AUC_LIB = 'scripts/lib/auc.ts';

/** floor = round4(measured - margin). The ONE place that rule is arithmetic
 *  rather than prose; `scripts/lib/auc.ts` states it and this implements it. */
function floorFor(measured: number): number {
  return Math.round((measured - PUBLIC_FLOOR_MARGIN) * 1e4) / 1e4;
}

const USAGE = [
  'benchmark-public — degradation discrimination on the 32 distributable screenplays',
  '',
  'Usage:',
  '  npm run benchmark:public                 print the table',
  '  npm run benchmark:public -- --lock       also rewrite the manifest, the split, and the six',
  '                                           floor constants in scripts/lib/auc.ts (read the diff:',
  '                                           re-lock only after an INTENDED scoring change)',
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
    const floorOf = (statistic: 'paired' | 'allPairs') =>
      PUBLIC_FLOORS.find((f) => f.degradation === d.id && f.statistic === statistic)?.value;
    out('-'.repeat(78));
    out(`${d.id} — ${d.label}`);
    out(`  role: ${d.role === 'control' ? 'POSITIVE CONTROL (liveness check on the harness)' : 'measurement channel'}`);
    out(`  scene count preserved: ${d.sceneCountPreserving ? 'YES' : 'no'}`);
    out(`  recipe: ${d.recipe}`);
    out(`  source: ${d.source}`);
    out(`  N = ${d.n}${d.skipped.length ? `  (skipped: ${d.skipped.join(', ')})` : ''}`);
    out(
      `  AUC (matched pair — PRIMARY, this design is paired): ${fixed(d.aucPaired)}  `
      + `95% CI [${fixed(d.ciPaired.lo)}, ${fixed(d.ciPaired.hi)}]   floor ${floorOf('paired')}`,
    );
    out(
      `  AUC (all-pairs — secondary, the AUC-24 definition): ${fixed(d.aucAllPairs)}  `
      + `95% CI [${fixed(d.ciAllPairs.lo)}, ${fixed(d.ciAllPairs.hi)}]   floor ${floorOf('allPairs')}`,
    );
    out(`  bootstrap: ${d.bootstrapIterations} resamples, seed ${d.bootstrapSeed}`);
    out(
      `  sign counts: ordered ${d.ordered} / inverted ${d.inverted} / EXACT TIES ${d.tied}`
      + (d.tied > 0
        ? `  <- ${d.tied} of ${d.n} pairs cannot move; the interval is narrowed by pinning, not precision`
        : ''),
    );
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
  out(PUBLIC_CONTROL_RATIONALE);
  out('-'.repeat(78));
  out(PUBLIC_BENCHMARK_LIMITS);
  out('-'.repeat(78));

  if (lock) {
    writeFileSync(path.join(REPO_ROOT, PUBLIC_SPLIT_PATH), `${JSON.stringify(buildSplit(), null, 2)}\n`);
    writeFileSync(path.join(REPO_ROOT, PUBLIC_MANIFEST_PATH), `${JSON.stringify(buildManifest(result), null, 2)}\n`);
    out();
    out(`locked ${PUBLIC_SPLIT_PATH}`);
    out(`locked ${PUBLIC_MANIFEST_PATH}`);
    for (const line of relockFloors(result)) out(line);
    out();
    out('RE-LOCK RULE — read the diff before committing.');
    out('  Re-lock ONLY after a scoring change you intended. `--lock` moves every floor to');
    out('  round4(measured - 0.02) from THIS run, so re-locking after an unintended');
    out('  regression silently lowers the ratchet — that is the one way this machinery can');
    out('  be defeated, and the diff on scripts/lib/auc.ts is where it would be visible.');
    out('  A moved manifest row is a moved score; a moved floor is a moved gate.');
    out('  The narrative in scripts/lib/auc.ts and the numbers in');
    out('  docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md are NOT rewritten by this');
    out('  command — tests/core/public-benchmark.test.ts fails until you update them too.');
  }
}

/**
 * Rewrite the six floor constants in `scripts/lib/auc.ts` from this run.
 *
 * WHY THIS EXISTS. Round 1 shipped a CLAUDE.md sentence claiming `--lock`
 * re-locked "the manifest, the split and the floors"; it re-locked two of the
 * three, and `auc.ts` came back byte-identical. An instruction that fails when
 * followed is worse than none: a maintainer lands an intentional scoring
 * change, runs `--lock`, sees a clean diff on `auc.ts`, commits — and ships a
 * ratchet asserting a stale number. Rather than weaken the sentence, the
 * command now does what it said.
 *
 * It edits ONLY lines of the exact shape `export const NAME = <number>;` for
 * the names in PUBLIC_FLOORS, and refuses (loudly, without writing) if any one
 * of them is not found — so a refactor that reshapes those lines fails here
 * instead of silently locking nothing.
 */
function relockFloors(result: BenchmarkResult): string[] {
  const file = path.join(REPO_ROOT, AUC_LIB);
  const before = readFileSync(file, 'utf8');
  let source = before;
  const lines: string[] = [];
  const missing: string[] = [];

  for (const floor of PUBLIC_FLOORS) {
    const d = result.degradations.find((x) => x.id === floor.degradation);
    if (!d) {
      missing.push(`${floor.constant} (no ${floor.degradation} result in this run)`);
      continue;
    }
    const measured = floor.statistic === 'paired' ? d.aucPaired : d.aucAllPairs;
    const next = floorFor(measured);
    const pattern = new RegExp(`(export const ${floor.constant} = )(-?[0-9.]+)(;)`);
    if (!pattern.test(source)) {
      missing.push(`${floor.constant} (no single-line \`export const … = <number>;\` in ${AUC_LIB})`);
      continue;
    }
    source = source.replace(pattern, `$1${next}$3`);
    lines.push(
      `  ${floor.constant.padEnd(38)} ${String(floor.value).padStart(7)} -> ${String(next).padStart(7)}`
      + `   (measured ${measured.toFixed(4)}${floor.primary ? ', PRIMARY' : ''}`
      + `${next === floor.value ? ', unchanged' : ''})`,
    );
  }

  if (missing.length > 0) {
    return [
      '',
      `REFUSED to rewrite ${AUC_LIB}: ${missing.length} floor constant(s) could not be located.`,
      ...missing.map((m) => `  - ${m}`),
      'No floor was written. Fix the shape (one line, `export const NAME = <number>;`) and re-run.',
    ];
  }

  writeFileSync(file, source);
  return ['', `locked ${AUC_LIB} — six floor constants:`, ...lines];
}

await main();
