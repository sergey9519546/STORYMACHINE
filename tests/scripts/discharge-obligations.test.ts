// scripts/discharge-obligations.mjs — pipeline-mechanics tests.
//
// WHAT THIS VALIDATES (and what it does NOT): every test here exercises the
// ORCHESTRATOR's own logic — stage sequencing, env gating, --only/--skip
// filtering, the test-partition guard, receipt rendering, and "a failed
// stage doesn't kill the run". It does NOT exercise the real underlying
// measurement scripts (npm run measure-real, measure-auc-split.mjs, etc.) —
// those take minutes against the real 761-script corpus and require it to
// be present, which this environment does not have (same copyright
// boundary as everywhere else in this repo; see CLAUDE.md). Real command
// execution is replaced with an injected fake `runCommand` in every test
// that would otherwise spawn a subprocess, so these tests are fast,
// deterministic, and prove PIPELINE MECHANICS, not any measured AUC value.
//
// A small MOCK corpus directory (3-5 tiny .fountain files) is still built
// on disk in most tests, because the orchestrator's env-resolution and
// corpus-fingerprint logic (resolveCorpusDirs, countFountainFiles) are real
// filesystem operations worth exercising for real rather than mocking away.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  main,
  parseArgs,
  resolveCorpusDirs,
  checkEnvContract,
  assertSafePartition,
  isMigrationApplied,
  selectStages,
  buildReceipt,
  parseMeasureRealOutput,
  parseAucSplitOutput,
  parseTruthExtractionOutput,
  STAGES,
} from '../../scripts/discharge-obligations.mjs';

// ---------------------------------------------------------------------------
// Mock corpus scaffolding
// ---------------------------------------------------------------------------

function buildMockCorpus(fileCount = 4): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'storymachine-discharge-mock-corpus-'));
  for (let i = 0; i < fileCount; i++) {
    const sub = i % 2 === 0 ? '' : 'crawl/action';
    const full = sub ? path.join(dir, sub) : dir;
    mkdirSync(full, { recursive: true });
    writeFileSync(
      path.join(full, `mock-script-${i}.fountain`),
      [
        `INT. ROOM ${i} - DAY`,
        '',
        `A tiny mock scene, script ${i}, nothing structural — built solely to give`,
        'the orchestrator real files to count. Not real writing.',
        '',
      ].join('\n'),
      'utf-8',
    );
  }
  return dir;
}

/** A fake runCommand that never spawns anything — records every invocation
 *  and returns a canned result keyed by a caller-supplied resolver, or a
 *  default success with empty stdout. */
function makeFakeRunCommand(resolve: (cmd: string, args: string[]) => { ok: boolean; stdout?: string; stderr?: string } | undefined) {
  const calls: { cmd: string; args: string[]; env?: Record<string, string> }[] = [];
  const fn = async (cmd: string, args: string[], opts: { env?: Record<string, string> } = {}) => {
    calls.push({ cmd, args, env: opts.env });
    const custom = resolve(cmd, args);
    if (custom) return { ok: custom.ok, status: custom.ok ? 0 : 1, stdout: custom.stdout ?? '', stderr: custom.stderr ?? '', error: null };
    return { ok: true, status: 0, stdout: '', stderr: '', error: null };
  };
  return { fn, calls };
}

function silentLog() {
  // swallow orchestrator console output in tests to keep test output clean
}

// ---------------------------------------------------------------------------
// Pure helper tests
// ---------------------------------------------------------------------------

describe('resolveCorpusDirs', () => {
  it('backfills CORPUS_DIR from REAL_SCRIPT_CORPUS_DIR when only one is set', () => {
    const { realScriptCorpusDir, corpusDir } = resolveCorpusDirs({ REAL_SCRIPT_CORPUS_DIR: '/a/b' });
    assert.equal(realScriptCorpusDir, '/a/b');
    assert.equal(corpusDir, '/a/b');
  });

  it('backfills REAL_SCRIPT_CORPUS_DIR from CORPUS_DIR when only that is set', () => {
    const { realScriptCorpusDir, corpusDir } = resolveCorpusDirs({ CORPUS_DIR: '/x/y' });
    assert.equal(realScriptCorpusDir, '/x/y');
    assert.equal(corpusDir, '/x/y');
  });

  it('returns empty strings when neither is set', () => {
    const { realScriptCorpusDir, corpusDir } = resolveCorpusDirs({});
    assert.equal(realScriptCorpusDir, '');
    assert.equal(corpusDir, '');
  });
});

describe('checkEnvContract — fail-fast on missing env', () => {
  it('fails when neither var is set', () => {
    const result = checkEnvContract({});
    assert.equal(result.ok, false);
    assert.match(result.message, /REAL_SCRIPT_CORPUS_DIR/);
    assert.match(result.message, /CORPUS_DIR/);
  });

  it('passes when only REAL_SCRIPT_CORPUS_DIR is set', () => {
    assert.equal(checkEnvContract({ REAL_SCRIPT_CORPUS_DIR: '/a' }).ok, true);
  });

  it('passes when only CORPUS_DIR is set', () => {
    assert.equal(checkEnvContract({ CORPUS_DIR: '/a' }).ok, true);
  });
});

describe('assertSafePartition — the test-partition guard', () => {
  it('refuses "test"', () => {
    assert.throws(() => assertSafePartition('test'), /REFUSED.*partition=test/s);
  });

  it('allows "train" and "val"', () => {
    assert.equal(assertSafePartition('train'), 'train');
    assert.equal(assertSafePartition('val'), 'val');
  });
});

describe('isMigrationApplied', () => {
  it('is false for the pre-migration (title-bearing) schema', () => {
    assert.equal(
      isMigrationApplied({ train: [{ file: 'a.fountain', sceneCount: 10 }], val: [], test: [], excluded: [] }),
      false,
    );
  });

  it('is true when every entry across all partitions carries id + contentHash', () => {
    assert.equal(
      isMigrationApplied({
        train: [{ id: 'SM-abc12345', contentHash: 'deadbeef', file: 'SM-abc12345.fountain' }],
        val: [{ id: 'SM-def67890', contentHash: 'beefdead', file: 'SM-def67890.fountain' }],
        test: [],
        excluded: [],
      }),
      true,
    );
  });

  it('is false when only SOME entries carry id + contentHash', () => {
    assert.equal(
      isMigrationApplied({
        train: [
          { id: 'SM-abc12345', contentHash: 'deadbeef', file: 'x.fountain' },
          { file: 'y.fountain' }, // not migrated
        ],
        val: [], test: [], excluded: [],
      }),
      false,
    );
  });

  it('is false for null/empty input', () => {
    assert.equal(isMigrationApplied(null), false);
    assert.equal(isMigrationApplied({}), false);
  });
});

describe('parseArgs', () => {
  it('parses --only as a comma-separated list', () => {
    assert.deepEqual(parseArgs(['--only=measure-real,corpus-migration']).only, ['measure-real', 'corpus-migration']);
  });

  it('parses --skip as a comma-separated list', () => {
    assert.deepEqual(parseArgs(['--skip=rebuild-experiment']).skip, ['rebuild-experiment']);
  });

  it('rejects --only and --skip together', () => {
    assert.throws(() => parseArgs(['--only=a', '--skip=b']), /mutually exclusive/);
  });

  it('rejects unknown flags', () => {
    assert.throws(() => parseArgs(['--bogus']), /Unknown argument/);
  });

  it('parses --reason', () => {
    assert.equal(parseArgs(['--reason=my custom reason']).reason, 'my custom reason');
  });
});

describe('selectStages', () => {
  it('filters to --only ids, preserving STAGES order', () => {
    const selected = selectStages(STAGES, { only: ['rebuild-experiment', 'measure-real'], skip: null });
    assert.deepEqual(selected.map((s) => s.id), ['measure-real', 'rebuild-experiment']);
  });

  it('excludes --skip ids', () => {
    const selected = selectStages(STAGES, { only: null, skip: ['corpus-migration'] });
    assert.ok(!selected.some((s) => s.id === 'corpus-migration'));
    assert.equal(selected.length, STAGES.length - 1);
  });

  it('throws on an unknown --only id', () => {
    assert.throws(() => selectStages(STAGES, { only: ['not-a-real-stage'], skip: null }), /Unknown stage id/);
  });

  it('throws on an unknown --skip id', () => {
    assert.throws(() => selectStages(STAGES, { only: null, skip: ['not-a-real-stage'] }), /Unknown stage id/);
  });

  it('returns all stages when neither is given', () => {
    assert.equal(selectStages(STAGES, { only: null, skip: null }).length, STAGES.length);
  });
});

describe('output parsers', () => {
  it('parseMeasureRealOutput extracts shuffle-drop and act-swap AUC', () => {
    const stdout = 'blah\n     - shuffle-drop AUC 0.731 (mean intact 91.2 -> degraded 78.4).\n     - act-swap    AUC 0.812 (mean intact 91.2 -> degraded 70.1).\nmore\n';
    assert.deepEqual(parseMeasureRealOutput(stdout), { shuffleDropAuc: 0.731, actSwapAuc: 0.812 });
  });

  it('parseMeasureRealOutput returns nulls when the pattern is absent', () => {
    assert.deepEqual(parseMeasureRealOutput('nothing relevant here'), { shuffleDropAuc: null, actSwapAuc: null });
  });

  it('parseAucSplitOutput extracts the ALL POOLED row', () => {
    const stdout = 'SCENE_SHUFFLE | 455 | 0.727 |\nALL POOLED             |  1820 | 0.627   | [0.608, 0.647]   | FAIL\n';
    assert.deepEqual(parseAucSplitOutput(stdout), { allPooledAuc: 0.627 });
  });

  it('parseTruthExtractionOutput extracts Section A false-positive counts', () => {
    const stdout = 'Section A (real, n=30): false positives on clean text = 2/30 scripts.\n';
    assert.deepEqual(parseTruthExtractionOutput(stdout), { totalScripts: 30, falsePositiveScripts: 2 });
  });
});

describe('buildReceipt', () => {
  it('renders the §3 template fields with a real SHA and command strings', () => {
    const results: { id: string; label: string; optional: boolean; ok: boolean; skipped: boolean; commands: string[]; notes: string[]; measured: Record<string, number | null> }[] = [
      { id: 'measure-real', label: 'x', optional: false, ok: true, skipped: false, commands: ['npm run measure-real'], notes: ['ok note'], measured: { shuffleDropAuc: 0.731, actSwapAuc: 0.8 } },
      { id: 'auc-split-unwired-flags', label: 'y', optional: false, ok: true, skipped: false, commands: ['node scripts/measure-auc-split.mjs --partition=train --with-agency-signal'], notes: ['ok note 2'], measured: { 'agency-signal:train': 0.65 } },
    ];
    const receipt = buildReceipt({
      results,
      sha: 'deadbeefcafe1234567890abcdef1234567890',
      date: '2026-08-04',
      corpusFingerprint: '4 fountain file(s) found under the configured corpus dir; scripts/output/corpus-split.json testSetHash=unknown',
      reason: 'test run',
    });
    assert.match(receipt, /### 2026-08-04 — test run/);
    assert.match(receipt, /\*\*Git SHA:\*\* `deadbeefcafe1234567890abcdef1234567890`/);
    assert.match(receipt, /npm run measure-real/);
    assert.match(receipt, /--with-agency-signal/);
    assert.match(receipt, /shuffle-drop AUC 0\.731, act-swap AUC 0\.8/);
    assert.match(receipt, /agency-signal:train ALL POOLED AUC=0\.65/);
    assert.match(receipt, /Runner attestation/);
    assert.match(receipt, /REPLACE ME/);
  });

  it('reports skipped stages as "not run" rather than fabricating a number', () => {
    const results = [
      { id: 'measure-real', label: 'x', optional: false, ok: false, skipped: true, commands: [], notes: ['skipped note'], measured: {} },
    ];
    const receipt = buildReceipt({ results, sha: 'abc', date: '2026-08-04', corpusFingerprint: 'n/a', reason: 'r' });
    assert.match(receipt, /Measured AUC-24:\*\* not run — stage skipped/);
  });
});

// ---------------------------------------------------------------------------
// main() orchestration tests — real mock corpus dir + injected fake runner
// ---------------------------------------------------------------------------

describe('main() — env fail-fast', () => {
  it('exits 1 and runs zero stages when neither env var is set', async () => {
    const { fn: runCommand, calls } = makeFakeRunCommand(() => undefined);
    const { exitCode, results } = await main([], {}, { runCommand, log: silentLog });
    assert.equal(exitCode, 1);
    assert.equal(results.length, 0);
    assert.equal(calls.length, 0);
  });
});

describe('main() — stage sequencing against a mock corpus', () => {
  it('runs every stage in STAGES order when no filter is given, using the mock corpus dir', async () => {
    const corpusDir = buildMockCorpus(4);
    try {
      const { fn: runCommand, calls } = makeFakeRunCommand(() => ({ ok: true, stdout: '' }));
      const { exitCode, results } = await main(
        [],
        { REAL_SCRIPT_CORPUS_DIR: corpusDir },
        {
          runCommand,
          readSplitFile: () => ({ train: [{ file: 'a', sceneCount: 1 }], val: [], test: [], excluded: [] }), // not migrated
          fileExists: () => false, // rebuild-experiment.mjs absent
          gitRevParse: () => 'testsha1234',
          now: () => new Date('2026-08-04T00:00:00Z'),
          log: silentLog,
        },
      );
      assert.equal(exitCode, 0);
      assert.deepEqual(results.map((r) => r.id), STAGES.map((s) => s.id));
      // corpus-migration stage should have actually invoked migrate-corpus-ids.mjs
      // (not skipped) since the injected split file is pre-migration schema.
      const migrationCalls = calls.filter((c) => c.args[0]?.includes('migrate-corpus-ids.mjs'));
      assert.ok(migrationCalls.length >= 1, 'expected migrate-corpus-ids.mjs to be invoked');
      assert.ok(migrationCalls[0].args.some((a) => a === `--corpus-dir=${corpusDir}`));
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });

  it('skips the corpus-migration stage cleanly when already migrated, without invoking migrate-corpus-ids.mjs', async () => {
    const corpusDir = buildMockCorpus(2);
    try {
      const { fn: runCommand, calls } = makeFakeRunCommand(() => ({ ok: true, stdout: '' }));
      const { results } = await main(
        ['--only=corpus-migration'],
        { CORPUS_DIR: corpusDir },
        {
          runCommand,
          readSplitFile: () => ({ train: [{ id: 'SM-aaaa1111', contentHash: 'x', file: 'a' }], val: [], test: [], excluded: [] }),
          gitRevParse: () => 'testsha',
          now: () => new Date('2026-08-04T00:00:00Z'),
          log: silentLog,
        },
      );
      assert.equal(results.length, 1);
      assert.equal(results[0].skipped, true);
      assert.equal(calls.length, 0, 'migrate-corpus-ids.mjs must not be invoked when already migrated');
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });

  it('feature-detects an absent scripts/rebuild-experiment.mjs and skips it as optional', async () => {
    const corpusDir = buildMockCorpus(1);
    try {
      const { fn: runCommand, calls } = makeFakeRunCommand(() => ({ ok: true, stdout: '' }));
      const { results } = await main(
        ['--only=rebuild-experiment'],
        { CORPUS_DIR: corpusDir },
        { runCommand, fileExists: () => false, gitRevParse: () => 'sha', now: () => new Date(), log: silentLog },
      );
      assert.equal(results[0].skipped, true);
      assert.equal(calls.length, 0);
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });

  it('runs scripts/rebuild-experiment.mjs when feature-detected present', async () => {
    const corpusDir = buildMockCorpus(1);
    try {
      const { fn: runCommand, calls } = makeFakeRunCommand(() => ({ ok: true, stdout: 'done' }));
      const { results } = await main(
        ['--only=rebuild-experiment'],
        { CORPUS_DIR: corpusDir },
        { runCommand, fileExists: () => true, gitRevParse: () => 'sha', now: () => new Date(), log: silentLog },
      );
      assert.equal(results[0].skipped, false);
      assert.equal(results[0].ok, true);
      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0].args, ['scripts/rebuild-experiment.mjs']);
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });
});

describe('main() — --only and --skip', () => {
  it('--only runs exactly the requested stages', async () => {
    const corpusDir = buildMockCorpus(1);
    try {
      const { fn: runCommand } = makeFakeRunCommand(() => ({ ok: true, stdout: '' }));
      const { results } = await main(
        ['--only=measure-real,truth-extraction-recall'],
        { REAL_SCRIPT_CORPUS_DIR: corpusDir },
        { runCommand, gitRevParse: () => 'sha', now: () => new Date(), log: silentLog },
      );
      assert.deepEqual(results.map((r) => r.id), ['measure-real', 'truth-extraction-recall']);
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });

  it('--skip omits exactly the requested stages', async () => {
    const corpusDir = buildMockCorpus(1);
    try {
      const { fn: runCommand } = makeFakeRunCommand(() => ({ ok: true, stdout: '' }));
      const { results } = await main(
        ['--skip=measure-real,auc-split-unwired-flags,corpus-migration,rebuild-experiment'],
        { REAL_SCRIPT_CORPUS_DIR: corpusDir },
        { runCommand, gitRevParse: () => 'sha', now: () => new Date(), log: silentLog },
      );
      assert.deepEqual(results.map((r) => r.id), ['truth-extraction-recall']);
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });

  it('exits 2 and runs nothing for an unknown --only id', async () => {
    const { fn: runCommand, calls } = makeFakeRunCommand(() => ({ ok: true }));
    const { exitCode, results } = await main(
      ['--only=not-a-stage'],
      { REAL_SCRIPT_CORPUS_DIR: '/whatever' },
      { runCommand, log: silentLog },
    );
    assert.equal(exitCode, 2);
    assert.equal(results.length, 0);
    assert.equal(calls.length, 0);
  });
});

describe('main() — a failed stage does not kill the run', () => {
  it('continues past a failing measure-real stage and still runs later stages', async () => {
    const corpusDir = buildMockCorpus(2);
    try {
      const { fn: runCommand, calls } = makeFakeRunCommand((cmd, args) => {
        if (args.includes('measure-real')) return { ok: false, stdout: '', stderr: 'boom' };
        return { ok: true, stdout: '' };
      });
      const { exitCode, results } = await main(
        ['--only=measure-real,truth-extraction-recall'],
        { REAL_SCRIPT_CORPUS_DIR: corpusDir },
        { runCommand, gitRevParse: () => 'sha', now: () => new Date(), log: silentLog },
      );
      const measureReal = results.find((r) => r.id === 'measure-real');
      const truthStage = results.find((r) => r.id === 'truth-extraction-recall');
      assert.equal(measureReal?.ok, false);
      assert.equal(measureReal?.skipped, false);
      assert.equal(truthStage?.ok, true, 'later stage must still have run despite the earlier failure');
      assert.equal(exitCode, 1, 'overall exit code reflects the hard failure');
      // both stages actually got invoked
      assert.ok(calls.some((c) => c.args.includes('measure-real')));
      assert.ok(calls.some((c) => c.args[0]?.includes('probe-truth-order-sensitivity.mjs')));
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });

  it('a failed OPTIONAL stage does not flip the overall exit code to nonzero', async () => {
    const corpusDir = buildMockCorpus(1);
    try {
      const { fn: runCommand } = makeFakeRunCommand(() => ({ ok: false, stdout: '', stderr: 'boom' }));
      const { exitCode, results } = await main(
        ['--only=rebuild-experiment'],
        { CORPUS_DIR: corpusDir },
        { runCommand, fileExists: () => true, gitRevParse: () => 'sha', now: () => new Date(), log: silentLog },
      );
      assert.equal(results[0].ok, false);
      assert.equal(exitCode, 0, 'a failing optional stage must not fail the overall run');
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });
});

describe('main() — the auc-split-unwired-flags stage never constructs --partition=test', () => {
  it('only ever passes --partition=train or --partition=val to measure-auc-split.mjs', async () => {
    const corpusDir = buildMockCorpus(1);
    try {
      const { fn: runCommand, calls } = makeFakeRunCommand(() => ({ ok: true, stdout: 'ALL POOLED | 10 | 0.7 |' }));
      await main(
        ['--only=auc-split-unwired-flags'],
        { CORPUS_DIR: corpusDir },
        { runCommand, gitRevParse: () => 'sha', now: () => new Date(), log: silentLog },
      );
      const aucSplitCalls = calls.filter((c) => c.args[0] === 'scripts/measure-auc-split.mjs');
      assert.equal(aucSplitCalls.length, 6, '3 flags x 2 partitions = 6 invocations');
      for (const c of aucSplitCalls) {
        const partitionArg = c.args.find((a) => a.startsWith('--partition='));
        assert.ok(partitionArg === '--partition=train' || partitionArg === '--partition=val', `unexpected partition arg: ${partitionArg}`);
      }
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });
});

describe('main() — receipt output', () => {
  it('writes the receipt to a path under os.tmpdir(), never under scripts/output/', async () => {
    const corpusDir = buildMockCorpus(2);
    try {
      const { fn: runCommand } = makeFakeRunCommand(() => ({ ok: true, stdout: '' }));
      let writtenPath = '';
      let writtenContent = '';
      const { receiptPath, receipt } = await main(
        ['--only=measure-real'],
        { REAL_SCRIPT_CORPUS_DIR: corpusDir },
        {
          runCommand,
          gitRevParse: () => 'realsha0000',
          now: () => new Date('2026-08-04T00:00:00Z'),
          writeReceiptFile: (p: string, content: string) => { writtenPath = p; writtenContent = content; },
          log: silentLog,
        },
      );
      assert.equal(writtenPath, receiptPath);
      assert.equal(writtenContent, receipt);
      const tmp = path.resolve(os.tmpdir());
      assert.ok(path.resolve(receiptPath).startsWith(tmp), `expected receipt under ${tmp}, got ${receiptPath}`);
      assert.ok(!receiptPath.includes(`${path.sep}scripts${path.sep}output${path.sep}`));
      assert.match(receipt, /realsha0000/);
      assert.match(receipt, /### 2026-08-04/);
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });

  it('uses the REAL git SHA (unmocked) when gitRevParse is not injected', async () => {
    const corpusDir = buildMockCorpus(1);
    try {
      const { fn: runCommand } = makeFakeRunCommand(() => ({ ok: true, stdout: '' }));
      const { receipt } = await main(
        ['--only=measure-real'],
        { REAL_SCRIPT_CORPUS_DIR: corpusDir },
        { runCommand, log: silentLog },
      );
      // A real `git rev-parse HEAD` is a 40-char lowercase hex string.
      assert.match(receipt, /\*\*Git SHA:\*\* `[0-9a-f]{40}`/);
    } finally {
      rmSync(corpusDir, { recursive: true, force: true });
    }
  });
});
