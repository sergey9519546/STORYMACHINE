// What `npm run benchmark:public` PRINTS about its own limits, checked against
// the bytes it actually writes to stdout.
//
// ── Why this file exists (2026-09-12, adversarial review finding 6) ────────
// `scripts/lib/public-benchmark.ts`'s `PUBLIC_BENCHMARK_LIMITS` block is printed
// on every `npm run benchmark:public` run, quoted by the measurement doc, and
// echoed in `CLAUDE.md` and the brain gate note. One of its lines said:
//
//   "ARC_DED_MIN_SCENES and CLIMAX_DED_MIN_SCENES are both 15 … so the
//    feature-scale deductions never fire on this corpus at all"
//
// `CLIMAX_DED_MIN_SCENES` gates `climaxZoneDecayDeduction`
// (`server/nvm/analyze/doctor.ts:617`), which is EXPORTED and has no scoring-path
// call site: `aggregateReport`'s health line subtracts `structuralDeduction`,
// `arcIncoherenceDeduction` and `dialogueDeduction` only, and
// `doctor.ts:2127-2131` records the revert ("it over-fired on real scripts with
// naturally flat climaxes"). So "never fires at this length" implied that it
// fires at SOME length. It fires at no length. The honest sentence names
// `ARC_DED_MIN_SCENES` alone.
//
// ── Why it greps stdout rather than the module constant ───────────────────
// The claim's damage is done by being PRINTED — a reader of a benchmark run is
// the person misled by it. A test that imported the constant would pass while
// the CLI printed something else (a second copy, a truncation, a reordering), so
// this spawns `npm run benchmark:public -- --limits` and reads its real bytes.
// That flag exists so the check costs ~0.3 s instead of the 6 s a full
// measurement takes: it prints the control rationale and the caveats and exits
// without scoring anything.
//
// Both directions are asserted, because a test that only checked the new wording
// would pass on a file that printed nothing at all.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  PUBLIC_BENCHMARK_LIMITS,
  PUBLIC_CONTROL_RATIONALE,
  REPO_ROOT,
} from '../../scripts/lib/public-benchmark.ts';

/** The CLI's real stdout, produced once. `--limits` runs no measurement. */
const LIMITS_STDOUT = execFileSync(
  'node',
  ['--experimental-strip-types', path.join(REPO_ROOT, 'scripts/benchmark-public.ts'), '--limits'],
  { cwd: REPO_ROOT, encoding: 'utf8' },
);

describe('benchmark:public --limits prints the caveats, and they are the module\'s own', () => {
  it('prints PUBLIC_BENCHMARK_LIMITS and PUBLIC_CONTROL_RATIONALE verbatim, not a copy', () => {
    // If `--limits` ever grows its own wording, every assertion below stops
    // being about what a full run prints. This is the assertion that keeps the
    // cheap flag honest as a proxy for the expensive command.
    assert.ok(
      LIMITS_STDOUT.includes(PUBLIC_BENCHMARK_LIMITS),
      '`--limits` did not print PUBLIC_BENCHMARK_LIMITS verbatim — it has drifted into a second copy',
    );
    assert.ok(LIMITS_STDOUT.includes(PUBLIC_CONTROL_RATIONALE));
  });

  it('runs no measurement — it must not print a single AUC table row', () => {
    assert.doesNotMatch(LIMITS_STDOUT, /AUC \(matched pair/);
    assert.doesNotMatch(LIMITS_STDOUT, /bootstrap: 2000 resamples/);
  });
});

describe('the printed feature-scale claim names ARC_DED_MIN_SCENES alone (finding 6)', () => {
  it('names ARC_DED_MIN_SCENES as the feature-scale deduction that is wired into health', () => {
    assert.match(LIMITS_STDOUT, /ARC_DED_MIN_SCENES is 15/);
    assert.match(LIMITS_STDOUT, /feature-scale deduction that is\s+wired into health never fires/);
  });

  it('does NOT present CLIMAX_DED_MIN_SCENES as a live gate — the sentence cannot drift back', () => {
    // THE ASSERTION THAT WOULD HAVE CAUGHT THE CLAIM. The constant may still be
    // NAMED in the printed text — it is, in the correction that explains the
    // history — but never as one of two deductions that "never fire at this
    // length", which is the phrasing that implies it fires at some length.
    assert.doesNotMatch(
      LIMITS_STDOUT,
      /ARC_DED_MIN_SCENES and CLIMAX_DED_MIN_SCENES are both 15/,
      'the benchmark is printing CLIMAX_DED_MIN_SCENES as a live feature-scale gate again. '
      + 'climaxZoneDecayDeduction is exported and wired into nothing (doctor.ts:2127-2131 records '
      + 'the revert), so it fires at NO length — see docs/audits/2026-09-12-adversarial/'
      + 'engine-logic.md finding 6.',
    );
    assert.doesNotMatch(LIMITS_STDOUT, /the feature-scale deductions\s+never fire/);
  });

  it('says the climax term is exported but unwired, and cites where the revert is recorded', () => {
    assert.match(LIMITS_STDOUT, /climaxZoneDecayDeduction, which is EXPORTED and/);
    assert.match(LIMITS_STDOUT, /wired into nothing/);
    assert.match(LIMITS_STDOUT, /doctor\.ts:2127-2131 records the revert/);
    assert.match(LIMITS_STDOUT, /It fires at no length\./);
  });
});

describe('the engine itself still agrees with that claim', () => {
  const DOCTOR = readFileSync(path.join(REPO_ROOT, 'server/nvm/analyze/doctor.ts'), 'utf8');

  it('climaxZoneDecayDeduction is exported and subtracted from nothing', () => {
    // The claim's ground truth, checked rather than trusted. If a future change
    // WIRES the climax term into health, this test goes red and the printed
    // sentence has to be rewritten in the same commit — which is the point.
    assert.match(DOCTOR, /export function climaxZoneDecayDeduction\(/);
    const healthLine = /const health = Math\.max\(0, Math\.round\(\(([^)]*)\)/.exec(DOCTOR);
    assert.ok(healthLine, 'could not find aggregateReport\'s health line in doctor.ts');
    assert.match(healthLine![1], /baseHealth/);
    assert.ok(
      !healthLine![1].includes('climax'),
      `the health line now includes a climax term: ${healthLine![1]}. climaxZoneDecayDeduction is `
      + 'wired in, so every document saying it is exported-but-unwired is now wrong — including '
      + 'this benchmark\'s printed caveats, CLAUDE.md and docs/brain/Gates/Gate - Public Benchmark.md.',
    );
    // And nothing else on the scoring path calls it: the only consumers are a
    // probe script and this test. `grep -rn climaxZoneDecayDeduction server/`
    // should find its definition and no call.
    const callSites = DOCTOR.split('\n').filter(
      (line) => line.includes('climaxZoneDecayDeduction') && !line.includes('export function'),
    );
    assert.deepEqual(
      callSites.map((l) => l.trim()),
      [],
      'doctor.ts now references climaxZoneDecayDeduction outside its own definition',
    );
  });

  it('ARC_DED_MIN_SCENES is 15 and DOES gate a term that reaches health', () => {
    assert.match(DOCTOR, /const ARC_DED_MIN_SCENES = 15;/);
    assert.match(DOCTOR, /if \(analysis\.sceneCount >= ARC_DED_MIN_SCENES\)/);
    const healthLine = /const health = Math\.max\(0, Math\.round\(\(([^)]*)\)/.exec(DOCTOR);
    assert.match(healthLine![1], /arcIncoherenceDeduction/);
  });
});
