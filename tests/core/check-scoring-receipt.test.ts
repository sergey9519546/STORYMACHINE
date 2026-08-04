// check-scoring-receipt.mjs — behavioral tests over real synthetic git repos.
//
// WHY A REAL GIT REPO PER FIXTURE: the script's entire job is to read git
// history (`git diff --name-only <range>`) and a static import graph off
// disk. Mocking either would test the mock, not the tool. Each fixture below
// builds a throwaway repo under the OS temp directory (never inside this
// working repo — see CLAUDE.md's git safety protocol and this task's own
// instruction), mimicking just enough of the real scoring-path shape
// (doctor.ts importing fountain-analyzer.ts, calibration/, revision/passes/)
// for the script's classification logic to exercise for real.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts/check-scoring-receipt.mjs');
const RECEIPT_REL = 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md';

// ---------------------------------------------------------------------------
// Synthetic repo scaffolding
// ---------------------------------------------------------------------------

function runGit(cwd: string, args: string[]): string {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed in ${cwd}:\n${res.stderr || res.stdout}`);
  }
  return res.stdout;
}

function writeFile(repoDir: string, relPath: string, content: string): void {
  const abs = path.join(repoDir, relPath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
}

/** A minimal but real scoring-path shape: doctor.ts imports
 *  fountain-analyzer.ts (so the reachability BFS has a real edge to walk),
 *  plus one file in each always-scoring tier, plus one clearly non-scoring
 *  file and a seeded receipts ledger. */
function seedBaseFiles(repoDir: string): void {
  writeFile(repoDir, 'server/nvm/analyze/doctor.ts', [
    "import { helper } from './fountain-analyzer.ts';",
    'export function score(): number {',
    '  return helper() + 1;',
    '}',
    '',
  ].join('\n'));
  writeFile(repoDir, 'server/nvm/analyze/fountain-analyzer.ts', [
    'export function helper(): number {',
    '  return 42;',
    '}',
    '',
  ].join('\n'));
  writeFile(repoDir, 'server/nvm/analyze/emotional-arc.ts', 'export const EMOTIONAL_ARC_WEIGHT = 1;\n');
  writeFile(repoDir, 'server/nvm/analyze/calibration/reference.ts', 'export const REFERENCE_DISTRIBUTION = [1, 2, 3];\n');
  writeFile(repoDir, 'server/nvm/revision/passes/structure.ts', 'export const STRUCTURE_PASS_WEIGHT = 1;\n');
  writeFile(repoDir, 'README.md', '# fixture repo\n\nNot a scoring-path file.\n');
  writeFile(repoDir, RECEIPT_REL, [
    '# Measurement Receipts Ledger (fixture)',
    '',
    '## Seed entry',
    '- placeholder, not a real measurement',
    '',
  ].join('\n'));
}

/** Creates a fresh repo, commits the base scoring-path shape, and returns
 *  the repo dir plus the base commit SHA to diff future commits against. */
function makeBaseRepo(label: string): { dir: string; baseSha: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), `storymachine-scoring-receipt-${label}-`));
  runGit(dir, ['init', '-b', 'main']);
  runGit(dir, ['config', 'user.email', 'test@example.com']);
  runGit(dir, ['config', 'user.name', 'Scoring Receipt Test']);
  runGit(dir, ['config', 'commit.gpgsign', 'false']);
  seedBaseFiles(dir);
  runGit(dir, ['add', '-A']);
  runGit(dir, ['commit', '-m', 'base']);
  const baseSha = runGit(dir, ['rev-parse', 'HEAD']).trim();
  return { dir, baseSha };
}

function commitAll(dir: string, message: string): void {
  runGit(dir, ['add', '-A']);
  runGit(dir, ['commit', '-m', message]);
}

function runCheck(dir: string, range: string, scriptPath = SCRIPT_PATH): { status: number; stdout: string; stderr: string } {
  const res = spawnSync(process.execPath, [scriptPath, range], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, CI: '' },
  });
  return { status: res.status ?? -1, stdout: res.stdout, stderr: res.stderr };
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

describe('check-scoring-receipt.mjs — fixture ranges', () => {
  it('scoring-change-no-receipt: editing doctor.ts alone fails the guard', () => {
    const { dir, baseSha } = makeBaseRepo('no-receipt');
    try {
      writeFile(dir, 'server/nvm/analyze/doctor.ts', [
        "import { helper } from './fountain-analyzer.ts';",
        'export function score(): number {',
        '  return helper() + 2; // formula changed, no receipt',
        '}',
        '',
      ].join('\n'));
      commitAll(dir, 'change doctor formula');
      const result = runCheck(dir, `${baseSha}...HEAD`);
      assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /doctor\.ts/);
      assert.match(result.stderr, /MEASUREMENT_RECEIPTS/);
    } finally {
      cleanup(dir);
    }
  });

  it('scoring-change-with-receipt: editing doctor.ts + appending a receipt passes', () => {
    const { dir, baseSha } = makeBaseRepo('with-receipt');
    try {
      writeFile(dir, 'server/nvm/analyze/doctor.ts', [
        "import { helper } from './fountain-analyzer.ts';",
        'export function score(): number {',
        '  return helper() + 2; // formula changed, receipt appended below',
        '}',
        '',
      ].join('\n'));
      appendFileSync(path.join(dir, RECEIPT_REL), [
        '',
        '### fixture measurement',
        '- Date: fixture',
        '- Measured AUC-24: 0.999 (synthetic fixture value, not a real measurement)',
        '',
      ].join('\n'));
      commitAll(dir, 'change doctor formula + record receipt');
      const result = runCheck(dir, `${baseSha}...HEAD`);
      assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    } finally {
      cleanup(dir);
    }
  });

  it('non-scoring change: editing README.md never trips the guard', () => {
    const { dir, baseSha } = makeBaseRepo('non-scoring');
    try {
      writeFile(dir, 'README.md', '# fixture repo\n\nEdited, still not a scoring-path file.\n');
      commitAll(dir, 'edit readme');
      const result = runCheck(dir, `${baseSha}...HEAD`);
      assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /no scoring-path files changed/);
    } finally {
      cleanup(dir);
    }
  });

  it('new-unwired-file: a brand-new analyze/ file nothing imports does not trip the guard', () => {
    const { dir, baseSha } = makeBaseRepo('unwired');
    try {
      writeFile(dir, 'server/nvm/analyze/reversal-detection-fixture.ts', [
        '// Built but never imported by doctor.ts or anything reachable from it —',
        '// the QL-deduction/reversal-detection/truth-extraction pattern.',
        'export function unwiredCandidate(): number {',
        '  return 7;',
        '}',
        '',
      ].join('\n'));
      commitAll(dir, 'add unwired candidate signal');
      const result = runCheck(dir, `${baseSha}...HEAD`);
      assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /no scoring-path files changed/);
    } finally {
      cleanup(dir);
    }
  });

  it('receipt-only: touching only MEASUREMENT_RECEIPTS.md never trips the guard', () => {
    const { dir, baseSha } = makeBaseRepo('receipt-only');
    try {
      appendFileSync(path.join(dir, RECEIPT_REL), '\n### unrelated housekeeping entry\n- note only, no scoring change accompanies it\n');
      commitAll(dir, 'tidy receipts ledger');
      const result = runCheck(dir, `${baseSha}...HEAD`);
      assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /no scoring-path files changed/);
    } finally {
      cleanup(dir);
    }
  });

  it('newly-wired file: a new analyze/ file that doctor.ts DOES import trips the guard (reachability, not just presence)', () => {
    const { dir, baseSha } = makeBaseRepo('newly-wired');
    try {
      writeFile(dir, 'server/nvm/analyze/new-signal.ts', 'export function newSignal(): number {\n  return 3;\n}\n');
      writeFile(dir, 'server/nvm/analyze/doctor.ts', [
        "import { helper } from './fountain-analyzer.ts';",
        "import { newSignal } from './new-signal.ts';",
        'export function score(): number {',
        '  return helper() + newSignal();',
        '}',
        '',
      ].join('\n'));
      commitAll(dir, 'wire in a new signal from doctor.ts');
      const result = runCheck(dir, `${baseSha}...HEAD`);
      assert.equal(result.status, 1, `expected exit 1 (both doctor.ts and the newly-wired file are scoring-path), got ${result.status}\n${result.stdout}`);
      assert.match(result.stdout, /new-signal\.ts/);
      assert.match(result.stdout, /reachable from doctor\.ts/);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Falsifiability: prove the guard's result actually depends on the path
// definitions, by breaking them and watching the same fixture flip.
// ---------------------------------------------------------------------------

describe('check-scoring-receipt.mjs — falsifiability of the scoring-path definition', () => {
  it('a broken (emptied) path definition lets the no-receipt fixture pass; the real script still catches it', () => {
    const { dir, baseSha } = makeBaseRepo('falsifiability');
    let brokenScriptPath: string | null = null;
    try {
      writeFile(dir, 'server/nvm/analyze/doctor.ts', [
        "import { helper } from './fountain-analyzer.ts';",
        'export function score(): number {',
        '  return helper() + 2; // formula changed, no receipt — same as the no-receipt fixture',
        '}',
        '',
      ].join('\n'));
      commitAll(dir, 'change doctor formula (falsifiability check)');
      const range = `${baseSha}...HEAD`;

      // Sanity: the real script must catch this before we break anything.
      const before = runCheck(dir, range);
      assert.equal(before.status, 1, 'precondition failed: the unmodified script should already flag this change');

      // Break the path definitions: empty every list/set that decides what
      // counts as scoring-path. If the fixture above still failed with this
      // script, the fixture would be testing nothing — this proves it isn't.
      const originalSource = readFileSync(SCRIPT_PATH, 'utf8');
      const brokenSource = originalSource
        .replace(/const ALWAYS_SCORING_FILES = new Set\(\[[\s\S]*?\]\);/, 'const ALWAYS_SCORING_FILES = new Set([]); // BROKEN FOR TEST')
        .replace(/const ALWAYS_SCORING_DIR_PREFIXES = \[[\s\S]*?\];/, 'const ALWAYS_SCORING_DIR_PREFIXES = []; // BROKEN FOR TEST')
        .replace(/const REACHABILITY_GATED_PREFIXES = \[[\s\S]*?\];/, 'const REACHABILITY_GATED_PREFIXES = []; // BROKEN FOR TEST')
        .replace(/const REACHABILITY_ROOTS = \[[\s\S]*?\];/, 'const REACHABILITY_ROOTS = []; // BROKEN FOR TEST');

      assert.notEqual(brokenSource, originalSource, 'the break patterns must actually match the script source (falsifiability harness itself must not silently no-op)');
      for (const marker of ['ALWAYS_SCORING_FILES = new Set([]);', 'ALWAYS_SCORING_DIR_PREFIXES = [];', 'REACHABILITY_GATED_PREFIXES = [];', 'REACHABILITY_ROOTS = [];']) {
        assert.ok(brokenSource.includes(marker), `break pattern for "${marker}" did not match — falsifiability harness is stale against the script`);
      }

      brokenScriptPath = path.join(dir, '__broken-check-scoring-receipt.mjs');
      writeFileSync(brokenScriptPath, brokenSource, 'utf8');

      const broken = runCheck(dir, range, brokenScriptPath);
      assert.equal(broken.status, 0, `a scoring-path definition emptied to nothing must let the change through (proves the fixture is sensitive to the real definitions), got ${broken.status}\n${broken.stdout}`);
      assert.match(broken.stdout, /no scoring-path files changed/);

      // Restore: the real, un-broken script must go back to catching it.
      const after = runCheck(dir, range);
      assert.equal(after.status, 1, 'the real script must still catch the change after the broken copy is discarded');
    } finally {
      cleanup(dir);
      if (brokenScriptPath) rmSync(brokenScriptPath, { force: true });
    }
  });
});
