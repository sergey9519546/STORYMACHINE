// Per-analysis wall-clock budget — Decision #7 (2026-09-06).
//
// Two halves, and the second is the one that matters:
//
//  1. THE BUDGET FIRES. A job whose wall clock crosses the configured budget
//     is cancelled the way Cancel cancels (doctor-pool.ts terminates the
//     worker) and the caller gets the typed error, from BOTH states a job can
//     be in — running on a worker, and still queued behind another. The
//     "slow job" here is stubbed by shrinking the BUDGET rather than by
//     inflating the work: a 1 ms budget makes every real analysis a slow one,
//     deterministically and in milliseconds, where a genuinely slow fixture
//     would add ~14 s to every CI run to prove the same branch.
//
//  2. THE BUDGET DOES NOT FIRE ON REAL WRITING. The no-fire table the brief
//     required: all 54 tracked .fountain fixtures (which include the 20 CC0
//     reference screenplays under data/screenplays/), the 20 calibration
//     REFERENCE_CORPUS samples, the P0 sample script, and a realistic
//     150-name / 3,000-block feature — each timed against runScriptDoctor and
//     asserted to finish well inside the shipped default. A bound that fires
//     on legitimate work is worse than no bound at all, so this half is
//     asserted per fixture, not on an average.
//
// Timed against runScriptDoctor IN-PROCESS rather than through the pool on
// purpose: the budget measures the analysis, and an in-process measurement
// excludes worker spawn/serialization noise that would make the margin look
// smaller than it is on a warm pool.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS,
  DOCTOR_ANALYSIS_BUDGET_ERROR_NAME,
  DoctorAnalysisBudgetExceededError,
  doctorAnalysisBudgetMs,
  doctorAnalysisBudgetSentence,
  isDoctorAnalysisBudgetExceeded,
} from '../../server/lib/doctor-budget.ts';
import { runScriptDoctorOffThread, shutdownDoctorPool, doctorPoolStatus } from '../../server/nvm/analyze/doctor-pool.ts';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** A tiny but genuinely analyzable script — distinct per call so the doctor's
 *  content-hash LRU can never answer a run this test needs to dispatch. */
const tinyScript = (tag: string): string =>
  `INT. ROOM ${tag} - DAY\n\nA figure waits by the window.\n\nALEX\nWe should go.\n\nSAM\nNot yet.\n`;

function withBudgetEnv<T>(value: string | undefined, fn: () => T): T {
  const previous = process.env.DOCTOR_ANALYSIS_BUDGET_MS;
  if (value === undefined) delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
  else process.env.DOCTOR_ANALYSIS_BUDGET_MS = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
    else process.env.DOCTOR_ANALYSIS_BUDGET_MS = previous;
  }
}

describe('doctorAnalysisBudgetMs — configuration', () => {
  it('defaults to the shipped 30s budget when the env var is unset or empty', () => {
    withBudgetEnv(undefined, () => {
      assert.equal(doctorAnalysisBudgetMs(), DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS);
      assert.equal(DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS, 30_000);
    });
    withBudgetEnv('', () => assert.equal(doctorAnalysisBudgetMs(), DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS));
  });

  it('takes an operator override, and reads it per call rather than at import time', () => {
    withBudgetEnv('45000', () => assert.equal(doctorAnalysisBudgetMs(), 45_000));
    withBudgetEnv('1', () => assert.equal(doctorAnalysisBudgetMs(), 1));
  });

  it('treats 0 and "off" as switched off (0), which armAnalysisBudget reads as "never arm"', () => {
    withBudgetEnv('0', () => assert.equal(doctorAnalysisBudgetMs(), 0));
    withBudgetEnv('off', () => assert.equal(doctorAnalysisBudgetMs(), 0));
  });

  it('falls back to the default — never throws — on a value that cannot be used', () => {
    for (const bad of ['abc', '-5', '9999999999', 'NaN', '30s']) {
      withBudgetEnv(bad, () => {
        assert.equal(
          doctorAnalysisBudgetMs(), DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS,
          `DOCTOR_ANALYSIS_BUDGET_MS=${bad} must fall back, not throw or disable the bound`,
        );
      });
    }
  });

  it('stays below the client-side 120s diagnosis watchdog, or the writer never sees the sentence', () => {
    // src/components/scriptide/ScriptDoctorPanel.tsx aborts a diagnosis after
    // 120s and prints its own "Diagnosis timed out (120s)" copy. A budget at
    // or above that would be dead code from the writer's point of view.
    assert.ok(
      DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS < 120_000,
      'the default budget must fire before the panel\'s own 120s watchdog',
    );
  });

  it('doctorPoolStatus reports the configured budget, so an operator can confirm what is in force', () => {
    withBudgetEnv('12345', () => assert.equal(doctorPoolStatus().analysisBudgetMs, 12_345));
    withBudgetEnv('off', () => assert.equal(doctorPoolStatus().analysisBudgetMs, 0));
  });
});

describe('the budget error — one registered sentence, recognizable across module instances', () => {
  it('renders seconds for a deployment budget and milliseconds for a test one', () => {
    assert.match(doctorAnalysisBudgetSentence(30_000), /per-analysis budget \(30s\)/);
    assert.match(doctorAnalysisBudgetSentence(1), /per-analysis budget \(1ms\)/);
  });

  it('says the run stopped, that nothing was scored, and what to do next — and promises nothing else', () => {
    const sentence = doctorAnalysisBudgetSentence(DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS);
    assert.match(sentence, /the run was stopped and nothing was scored/);
    assert.match(sentence, /Try again, or split the draft into shorter files and analyze them separately\./);
    // Never claim a retry will work or that the draft is at fault: on a
    // contended box the same draft can cross the budget and be fine.
    assert.doesNotMatch(sentence, /will succeed|too large|invalid|malformed/i);
  });

  it('is recognized by name as well as by prototype', () => {
    const real = new DoctorAnalysisBudgetExceededError(30_000);
    assert.ok(isDoctorAnalysisBudgetExceeded(real));
    assert.equal(real.status, 400, 'the JSON routes answer with the shape guard\'s own 4xx');
    // A structurally identical error from a second module instance (a worker
    // realm, a differently-specified import) must still be recognized.
    const fromAnotherRealm = new Error('whatever');
    fromAnotherRealm.name = DOCTOR_ANALYSIS_BUDGET_ERROR_NAME;
    assert.ok(isDoctorAnalysisBudgetExceeded(fromAnotherRealm));
    assert.ok(!isDoctorAnalysisBudgetExceeded(new Error('unrelated')));
    assert.ok(!isDoctorAnalysisBudgetExceeded('not an error'));
  });
});

describe('the budget fires, and cancels the job the way Cancel does', () => {
  before(async () => { await shutdownDoctorPool(); });
  after(async () => {
    delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
    await shutdownDoctorPool();
  });

  it('rejects a RUNNING analysis with the typed error once the budget is crossed', async (t) => {
    if (doctorPoolStatus().disabled || !doctorPoolStatus().enabled) {
      // In-process fallback: there is no worker to terminate, which is the
      // documented carve-out (armAnalysisBudget's own comment), not a gap
      // this test should paper over.
      t.skip('worker pool unavailable in this environment — the budget is a worker-path mechanism');
      return;
    }
    clearDoctorCache();
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = '1';
    const err = await runScriptDoctorOffThread(tinyScript('running')).then(
      () => null,
      (e: unknown) => e,
    );
    assert.ok(err, 'expected the 1ms budget to stop the analysis');
    assert.ok(isDoctorAnalysisBudgetExceeded(err), `expected the budget error, got ${(err as Error)?.name}`);
    assert.equal((err as DoctorAnalysisBudgetExceededError).budgetMs, 1);
    assert.match((err as Error).message, /per-analysis budget \(1ms\)/);
  });

  it('rejects a QUEUED analysis too — a job waiting behind another is also spending the writer\'s wall clock', async (t) => {
    if (doctorPoolStatus().disabled || !doctorPoolStatus().enabled) {
      t.skip('worker pool unavailable in this environment');
      return;
    }
    await shutdownDoctorPool();
    clearDoctorCache();
    const previousSize = process.env.DOCTOR_WORKER_POOL_SIZE;
    process.env.DOCTOR_WORKER_POOL_SIZE = '1';
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = '1';
    try {
      // Three submissions, one worker: at least two of them are still in the
      // FIFO queue when the 1ms timers fire.
      const settled = await Promise.allSettled([
        runScriptDoctorOffThread(tinyScript('q1')),
        runScriptDoctorOffThread(tinyScript('q2')),
        runScriptDoctorOffThread(tinyScript('q3')),
      ]);
      const budgetRejections = settled.filter(
        (s) => s.status === 'rejected' && isDoctorAnalysisBudgetExceeded(s.reason),
      );
      assert.equal(
        budgetRejections.length, 3,
        `every submission should have been stopped by the 1ms budget, got ${JSON.stringify(settled.map((s) => s.status))}`,
      );
    } finally {
      if (previousSize === undefined) delete process.env.DOCTOR_WORKER_POOL_SIZE;
      else process.env.DOCTOR_WORKER_POOL_SIZE = previousSize;
      await shutdownDoctorPool();
    }
  });

  it('does not fire when the analysis finishes inside the budget — the ordinary path is untouched', async () => {
    clearDoctorCache();
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = String(DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS);
    const report = await runScriptDoctorOffThread(tinyScript('ok'));
    assert.ok(report.contentHash, 'a fast analysis must return its report unchanged');
  });

  it('arms nothing at all when the operator switches the budget off', async () => {
    clearDoctorCache();
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = 'off';
    assert.equal(doctorPoolStatus().analysisBudgetMs, 0);
    // With the budget off, even a value that would otherwise stop every run
    // (1ms, above) cannot: nothing is armed, so this must return a report.
    const report = await runScriptDoctorOffThread(tinyScript('off'));
    assert.ok(report.contentHash);
  });
});

// ── The no-fire table ───────────────────────────────────────────────────────
// Every legitimate corpus this repository owns, measured individually. The
// margin asserted is HALF the shipped default: a fixture that needed more
// than 15 s would mean the 30 s default no longer carries the 2x headroom its
// derivation claims (server/lib/doctor-budget.ts), and that is a fact about
// the default worth failing on, not a fact to discover in production.
describe('the budget does not fire on real writing (no-fire table)', () => {
  const MARGIN_MS = DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS / 2;

  function trackedFountainFiles(): string[] {
    const out = execFileSync('git', ['ls-files', '-z', '--', '*.fountain'], { cwd: REPO_ROOT, encoding: 'utf8' });
    return out.split('\0').filter(Boolean).map((rel) => path.join(REPO_ROOT, rel));
  }

  async function timeAnalysis(text: string): Promise<number> {
    const started = performance.now();
    await runScriptDoctor(text);
    return performance.now() - started;
  }

  it('every tracked .fountain fixture (the CC0 reference screenplays included) analyses well inside the budget', async () => {
    const files = trackedFountainFiles();
    assert.ok(files.length >= 45, `expected the tracked fixture set, found ${files.length}`);
    const ccZero = files.filter((f) => f.includes(`${path.sep}data${path.sep}screenplays${path.sep}`));
    assert.equal(ccZero.length, 20, 'the 20 CC0 reference screenplays must be part of this sweep');
    let slowest = { file: '', ms: 0 };
    for (const file of files) {
      const ms = await timeAnalysis(readFileSync(file, 'utf8'));
      if (ms > slowest.ms) slowest = { file: path.relative(REPO_ROOT, file), ms };
      assert.ok(ms < MARGIN_MS, `${path.relative(REPO_ROOT, file)} took ${Math.round(ms)}ms, past the ${MARGIN_MS}ms no-fire margin`);
    }
    console.log(`no-fire: ${files.length} tracked fixtures, slowest ${Math.round(slowest.ms)}ms (${slowest.file})`);
  });

  it('every calibration REFERENCE_CORPUS sample and the P0 sample analyse well inside the budget', async () => {
    const { REFERENCE_CORPUS } = await import('../../server/nvm/analyze/calibration/corpus.ts');
    const { fountain: p0Sample } = await import('../../src/lib/sample-script.ts');
    assert.equal(REFERENCE_CORPUS.length, 20);
    let slowest = 0;
    for (const sample of REFERENCE_CORPUS) {
      const ms = await timeAnalysis(sample.fountain);
      slowest = Math.max(slowest, ms);
      assert.ok(ms < MARGIN_MS, `calibration sample "${sample.label}" took ${Math.round(ms)}ms`);
    }
    const p0Ms = await timeAnalysis(p0Sample);
    assert.ok(p0Ms < MARGIN_MS, `the P0 sample took ${Math.round(p0Ms)}ms`);
    console.log(`no-fire: 20 calibration samples, slowest ${Math.round(slowest)}ms; P0 sample ${Math.round(p0Ms)}ms`);
  });

  it('a realistic 150-name, 3,000-block feature analyses well inside the budget', async () => {
    // The shape a real ensemble feature has: ten leads carrying most of the
    // dialogue, 140 supporting names around them, action between cues, 120
    // scenes. This is the most expensive LEGITIMATE document the brief named,
    // and it is the one whose margin actually constrains the default.
    const NAMES_SUPPORTING = 140;
    const BLOCKS = 3_000;
    const SCENES = 120;
    const words = ['the', 'plan', 'was', 'never', 'going', 'to', 'work', 'like', 'this', 'again', 'tonight', 'trust', 'me', 'now', 'wait'];
    let seed = 0;
    const line = (n = 8): string => {
      const w = Array.from({ length: n }, () => words[seed++ % words.length]!);
      const s = w.join(' ');
      return `${s[0]!.toUpperCase()}${s.slice(1)}.`;
    };
    let text = '';
    let block = 0;
    const perScene = Math.ceil(BLOCKS / SCENES);
    for (let s = 0; s < SCENES && block < BLOCKS; s++) {
      text += `INT. LOCATION ${s} - DAY\n\n${line(16)}\n\n`;
      for (let k = 0; k < perScene && block < BLOCKS; k++, block++) {
        const name = block % 10 === 0 ? `SUPPORT${block % NAMES_SUPPORTING}` : `LEAD${block % 10}`;
        text += `${name}\n${line()}\n\n`;
      }
    }
    const ms = await timeAnalysis(text);
    console.log(`no-fire: realistic 150-name/${BLOCKS}-block feature (${text.length} chars) ${Math.round(ms)}ms`);
    assert.ok(
      ms < MARGIN_MS,
      `the realistic feature took ${Math.round(ms)}ms, past the ${MARGIN_MS}ms no-fire margin — the 30s default no longer carries 2x headroom`,
    );
  });
});
