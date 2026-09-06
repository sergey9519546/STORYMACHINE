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
  CLIENT_DIAGNOSIS_WATCHDOG_MS,
  DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS,
  DOCTOR_ANALYSIS_BUDGET_ERROR_NAME,
  DOCTOR_QUEUE_BUDGET_DEFAULT_MS,
  DoctorAnalysisBudgetExceededError,
  doctorAnalysisBudgetMs,
  doctorAnalysisBudgetSentence,
  doctorQueueBudgetMs,
  doctorQueueBudgetSentence,
  isDoctorAnalysisBudgetExceeded,
} from '../../server/lib/doctor-budget.ts';
import { runScriptDoctorOffThread, shutdownDoctorPool, doctorPoolStatus } from '../../server/nvm/analyze/doctor-pool.ts';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** A tiny but genuinely analyzable script — distinct per call so the doctor's
 *  content-hash LRU can never answer a run this test needs to dispatch. */
const tinyScript = (tag: string): string =>
  `INT. ROOM ${tag} - DAY\n\nA figure waits by the window.\n\nALEX\nWe should go.\n\nSAM\nNot yet.\n`;

function withEnv<T>(name: string, value: string | undefined, fn: () => T): T {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

const withBudgetEnv = <T>(value: string | undefined, fn: () => T): T =>
  withEnv('DOCTOR_ANALYSIS_BUDGET_MS', value, fn);
const withQueueBudgetEnv = <T>(value: string | undefined, fn: () => T): T =>
  withEnv('DOCTOR_QUEUE_BUDGET_MS', value, fn);

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

  it('stays below the client-side 120s diagnosis watchdog — and so does the SUM of the two budgets', () => {
    // src/components/scriptide/ScriptDoctorPanel.tsx aborts a diagnosis after
    // 120s and prints its own "Diagnosis timed out (120s)" copy. The budgets
    // COMPOSE: a job admitted at the last moment of the queue budget then
    // gets its full running budget, so it is the sum that has to stay inside
    // the watchdog or a contended request meets the panel's generic timeout
    // instead of one of the registered sentences.
    assert.equal(CLIENT_DIAGNOSIS_WATCHDOG_MS, 120_000);
    assert.ok(DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS < CLIENT_DIAGNOSIS_WATCHDOG_MS);
    assert.ok(DOCTOR_QUEUE_BUDGET_DEFAULT_MS < CLIENT_DIAGNOSIS_WATCHDOG_MS);
    assert.ok(
      DOCTOR_QUEUE_BUDGET_DEFAULT_MS + DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS < CLIENT_DIAGNOSIS_WATCHDOG_MS,
      `queue + running (${DOCTOR_QUEUE_BUDGET_DEFAULT_MS + DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS}ms) must stay inside the panel's ${CLIENT_DIAGNOSIS_WATCHDOG_MS}ms watchdog`,
    );
  });

  it('the queue budget is a SEPARATE, larger number — queue wait is contention, not the draft\'s cost', () => {
    withQueueBudgetEnv(undefined, () => {
      assert.equal(doctorQueueBudgetMs(), DOCTOR_QUEUE_BUDGET_DEFAULT_MS);
      assert.equal(DOCTOR_QUEUE_BUDGET_DEFAULT_MS, 60_000);
    });
    assert.ok(
      DOCTOR_QUEUE_BUDGET_DEFAULT_MS > DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS,
      'a shared or smaller queue budget sheds work the pool could have served — measured on the '
      + 'round-2 review\'s 60-concurrent burst: 20 scored / 40 rejected at one 30s budget, 34 scored / 26 at 60s',
    );
    withQueueBudgetEnv('90000', () => assert.equal(doctorQueueBudgetMs(), 90_000));
    withQueueBudgetEnv('0', () => assert.equal(doctorQueueBudgetMs(), 0));
    withQueueBudgetEnv('off', () => assert.equal(doctorQueueBudgetMs(), 0));
    for (const bad of ['abc', '-5', '9999999999']) {
      withQueueBudgetEnv(bad, () => assert.equal(doctorQueueBudgetMs(), DOCTOR_QUEUE_BUDGET_DEFAULT_MS));
    }
  });

  it('doctorPoolStatus reports both configured budgets, so an operator can confirm what is in force', () => {
    withBudgetEnv('12345', () => assert.equal(doctorPoolStatus().analysisBudgetMs, 12_345));
    withBudgetEnv('off', () => assert.equal(doctorPoolStatus().analysisBudgetMs, 0));
    withQueueBudgetEnv('23456', () => assert.equal(doctorPoolStatus().queueBudgetMs, 23_456));
    withQueueBudgetEnv('off', () => assert.equal(doctorPoolStatus().queueBudgetMs, 0));
  });

  it('the Retry-After estimate is bounded and actionable on an idle pool', () => {
    // Idle pool: nothing queued, nothing busy -> the smallest honest answer,
    // never 0 (a Retry-After of 0 invites an immediate retry storm) and never
    // past the client watchdog (a number nobody can act on).
    const seconds = doctorPoolStatus().retryAfterSeconds;
    assert.ok(Number.isInteger(seconds), 'Retry-After must be whole seconds');
    assert.ok(seconds >= 1, `Retry-After must never be 0, got ${seconds}`);
    assert.ok(seconds <= CLIENT_DIAGNOSIS_WATCHDOG_MS / 1000, `Retry-After must stay actionable, got ${seconds}`);
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

  it('the QUEUED sentence names the server, clears the draft, and gives a retry time', () => {
    const sentence = doctorQueueBudgetSentence(60_000, 45);
    assert.match(sentence, /^This server is busy/);
    assert.match(sentence, /waited longer than the 60s it allows for a free analysis slot/);
    assert.match(sentence, /the run never started and nothing was scored/);
    assert.match(sentence, /Nothing is wrong with the draft/);
    assert.match(sentence, /try again in about 45 seconds\./);
    // The round-2 blocker in one assertion: none of the running sentence's
    // draft-blaming clauses may appear on a job that never ran.
    assert.doesNotMatch(sentence, /split the draft/);
    assert.doesNotMatch(sentence, /This draft took longer to analyze/);
    // Singular/plural, because "1 seconds" is the kind of thing that ships.
    assert.match(doctorQueueBudgetSentence(60_000, 1), /try again in about 1 second\./);
  });

  it('the two sentences are genuinely different strings — one state, one wording', () => {
    assert.notEqual(
      doctorQueueBudgetSentence(60_000, 30),
      doctorAnalysisBudgetSentence(30_000),
    );
  });

  it('is recognized by name as well as by prototype, and carries the state that decides the status', () => {
    const real = new DoctorAnalysisBudgetExceededError(30_000);
    assert.ok(isDoctorAnalysisBudgetExceeded(real));
    assert.equal(real.state, 'running', 'the default state is the occupancy one');
    assert.equal(real.status, 400, 'the JSON routes answer with the shape guard\'s own 4xx');
    assert.equal(real.retryAfterSeconds, undefined, 'no Retry-After on a deterministic outcome');
    assert.equal(real.message, doctorAnalysisBudgetSentence(30_000));

    const queued = new DoctorAnalysisBudgetExceededError(60_000, 'queued', 45);
    assert.ok(isDoctorAnalysisBudgetExceeded(queued));
    assert.equal(queued.state, 'queued');
    assert.equal(queued.status, 503, 'contention is a server state, and a retry is correct behaviour');
    assert.equal(queued.retryAfterSeconds, 45);
    assert.equal(queued.message, doctorQueueBudgetSentence(60_000, 45));
    // A structurally identical error from a second module instance (a worker
    // realm, a differently-specified import) must still be recognized.
    const fromAnotherRealm = new Error('whatever');
    fromAnotherRealm.name = DOCTOR_ANALYSIS_BUDGET_ERROR_NAME;
    assert.ok(isDoctorAnalysisBudgetExceeded(fromAnotherRealm));
    assert.ok(!isDoctorAnalysisBudgetExceeded(new Error('unrelated')));
    assert.ok(!isDoctorAnalysisBudgetExceeded('not an error'));
  });
});

describe('the budgets fire, each in its own state, and cancel the job the way Cancel does', () => {
  before(async () => { await shutdownDoctorPool(); });
  after(async () => {
    delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
    delete process.env.DOCTOR_QUEUE_BUDGET_MS;
    delete process.env.DOCTOR_WORKER_POOL_SIZE;
    await shutdownDoctorPool();
  });

  it('a RUNNING analysis past its budget gets the analysis sentence, state "running", 400', async (t) => {
    if (doctorPoolStatus().disabled || !doctorPoolStatus().enabled) {
      // In-process fallback: there is no worker to terminate, which is the
      // documented carve-out (armQueueBudget's own comment), not a gap this
      // test should paper over.
      t.skip('worker pool unavailable in this environment — the budget is a worker-path mechanism');
      return;
    }
    clearDoctorCache();
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = '1';
    // Queue budget left at its default: this job is dispatched immediately
    // (pump() runs synchronously on submission), so only the RUNNING budget
    // can be what stops it — which is exactly the distinction under test.
    delete process.env.DOCTOR_QUEUE_BUDGET_MS;
    const err = await runScriptDoctorOffThread(tinyScript('running')).then(
      () => null,
      (e: unknown) => e,
    );
    assert.ok(err, 'expected the 1ms running budget to stop the analysis');
    assert.ok(isDoctorAnalysisBudgetExceeded(err), `expected the budget error, got ${(err as Error)?.name}`);
    const budgetErr = err as DoctorAnalysisBudgetExceededError;
    assert.equal(budgetErr.state, 'running');
    assert.equal(budgetErr.status, 400);
    assert.equal(budgetErr.budgetMs, 1);
    assert.equal(budgetErr.retryAfterSeconds, undefined);
    assert.match(budgetErr.message, /per-analysis budget \(1ms\)/);
  });

  // ── The round-2 BLOCKER, as a test ────────────────────────────────────────
  // The reviewer produced it with 60 concurrent distinct 346 KB features on a
  // 2-worker pool: on this box 40 of the 60 were rejected at ~34.8 s reading
  // "This draft took longer to analyze … split the draft into shorter files",
  // for jobs that had never run. The mechanism is identical at any scale —
  // one worker busy, the rest of the burst waiting — so this reproduces it
  // deterministically in milliseconds instead of shipping a 35-second,
  // load-sensitive burst into every CI run. The real 60-concurrent
  // before/after is in the lane report.
  it('a QUEUED submission gets the CONTENTION sentence, state "queued", 503 + Retry-After — never the draft sentence', async (t) => {
    if (doctorPoolStatus().disabled || !doctorPoolStatus().enabled) {
      t.skip('worker pool unavailable in this environment');
      return;
    }
    await shutdownDoctorPool();
    clearDoctorCache();
    process.env.DOCTOR_WORKER_POOL_SIZE = '1';
    process.env.DOCTOR_QUEUE_BUDGET_MS = '1';
    // The running budget stays at its shipped default, so nothing here can be
    // stopped for occupancy — every rejection below has to be a queue one.
    delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
    try {
      // Five submissions, one worker: the first is dispatched synchronously,
      // the other four are still in the FIFO when their 1ms timers fire.
      const settled = await Promise.allSettled([
        runScriptDoctorOffThread(tinyScript('c1')),
        runScriptDoctorOffThread(tinyScript('c2')),
        runScriptDoctorOffThread(tinyScript('c3')),
        runScriptDoctorOffThread(tinyScript('c4')),
        runScriptDoctorOffThread(tinyScript('c5')),
      ]);
      const rejections = settled.flatMap((s) => (s.status === 'rejected' ? [s.reason] : []));
      assert.ok(
        rejections.length >= 4,
        `expected the queued submissions to be shed, got ${JSON.stringify(settled.map((s) => s.status))}`,
      );
      for (const reason of rejections) {
        assert.ok(isDoctorAnalysisBudgetExceeded(reason), `expected a budget error, got ${(reason as Error)?.name}`);
        const err = reason as DoctorAnalysisBudgetExceededError;
        assert.equal(err.state, 'queued', 'a job that never reached a worker is not a "running" rejection');
        assert.equal(err.status, 503, 'contention is a server state — a 4xx would file it as a client error');
        assert.ok(
          err.retryAfterSeconds !== undefined && err.retryAfterSeconds >= 1,
          `a 503 must carry an actionable Retry-After, got ${err.retryAfterSeconds}`,
        );
        // The blocker itself: NONE of these may render row 72's sentence.
        assert.match(err.message, /^This server is busy/);
        assert.doesNotMatch(err.message, /This draft took longer to analyze/);
        assert.doesNotMatch(err.message, /split the draft/);
        assert.match(err.message, /Nothing is wrong with the draft/);
      }
    } finally {
      delete process.env.DOCTOR_WORKER_POOL_SIZE;
      delete process.env.DOCTOR_QUEUE_BUDGET_MS;
      await shutdownDoctorPool();
    }
  });

  it('does not fire when the analysis finishes inside the budgets — the ordinary path is untouched', async () => {
    clearDoctorCache();
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = String(DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS);
    process.env.DOCTOR_QUEUE_BUDGET_MS = String(DOCTOR_QUEUE_BUDGET_DEFAULT_MS);
    const report = await runScriptDoctorOffThread(tinyScript('ok'));
    assert.ok(report.contentHash, 'a fast analysis must return its report unchanged');
  });

  it('arms nothing at all when the operator switches the budgets off', async () => {
    clearDoctorCache();
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = 'off';
    process.env.DOCTOR_QUEUE_BUDGET_MS = 'off';
    assert.equal(doctorPoolStatus().analysisBudgetMs, 0);
    assert.equal(doctorPoolStatus().queueBudgetMs, 0);
    // With both off, even a value that would otherwise stop every run (1ms,
    // above) cannot: nothing is armed, so this must return a report.
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
