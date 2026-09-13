#!/usr/bin/env node
// owner-measure.mjs — THE OWNER'S ONE COMMAND.
//
//   REAL_SCRIPT_CORPUS_DIR=<corpus> npm run owner:measure
//
// ── WHAT THIS REPLACES ─────────────────────────────────────────────────────
// The owner's one blocking step for P1 is a measurement only they can run: the
// corpus is local-only and copyright-restricted, it cannot reach CI, and
// tests/core/auc24-table.test.ts SKIPS until tests/fixtures/auc24-table.json
// exists — a gate that BLOCKS CI from 2026-10-01. Until today the procedure
// for that step lived in seven documents: the branch ORDER and the three-scan
// receipt-conversion recipe in docs/brain/Owner/Owner - R5 Measurement and
// Merge.md, the pre-flight in Owner - Run Measure Real.md, the lock in
// Owner - Lock AUC24 Table.md, the array-order constraint in
// tests/fixtures/real-corpus-manifest.README.md, the probe columns in
// docs/brain/Branches/Branch - Forced Cue.md and Branch - Renderer
// Residuals.md, and the "0.731 is not comparable" statement in
// scripts/lib/auc.ts's header. This script is those seven documents executed.
// They are still the EXPLANATION — every trap below cites the one that
// measured it — but they are no longer the procedure.
//
// ── WHAT IT DOES, IN ORDER ─────────────────────────────────────────────────
//  1. Reads the PLAN from docs/p1-benchmark/owner-measurement-plan.json and
//     checks it against the owner note's table. A disagreement stops the run:
//     the note and this script must never state different orders.
//  2. Pre-flight: refuses without REAL_SCRIPT_CORPUS_DIR, runs
//     `verify:corpus-layout`, requires a clean tree and a fetched remote, and
//     verifies every recorded branch tip against the remote. A moved tip
//     STOPS the run — the record is the authority, and a tip that moved means
//     the record is stale.
//  3. Measures the BASELINE FIRST (main), then each eligible branch in a
//     DETACHED WORKTREE so the owner's checkout is never touched: the corpus
//     shape probe on the branch tree and on its pre-branch base, then
//     `measure-real`, capturing AUC-24, the corpus fingerprint, the manifest
//     cross-check and the exact command line.
//  4. Converts every PENDING receipt entry in the branch's range by the
//     three-scan recipe, verifies `0 problems` with the gate's own exported
//     functions, commits on the branch, and runs the real CLI as the final
//     check. `--push` is OFF by default: the owner reads the diff first.
//  5. Asks accept/reject after the first branch's number, printing it against
//     AUC24_FLOOR and against main's number from the same run. The 72-row
//     manifest re-lock happens only on acceptance, mapped IN PLACE.
//  6. Locks the AUC-24 table on the accepted tip — or on main if nothing was
//     accepted, because the deadline is the TABLE, not the branches.
//
// ── WHAT NEVER LEAVES THE MACHINE ──────────────────────────────────────────
// Every tool this script runs prints corpus paths, and on the private corpus
// those paths are the TITLES of real screenplays — collectively the corpus's
// index, which this repository has never published. So no tool output is
// echoed: it is written to a LOCAL output directory outside the repository
// ($XDG_STATE_HOME/storymachine/owner-measure/<date>/, else
// ~/.storymachine/owner-measure/<date>/), and this script prints only parsed
// aggregates — numbers, counts, hashes. Anything it does print is passed
// through `redact()` first, which replaces the corpus directory with
// `<corpus>`. The receipt entries it writes carry numbers, hashes and a
// fingerprint, which is exactly the shape this repository already commits
// without incident (tests/fixtures/real-corpus-manifest.json).
//
// ── PROVABLE WITHOUT THE CORPUS ────────────────────────────────────────────
// `--corpus-fixture=public` runs this whole pipeline against the 32
// distributable screenplays (20 CC0 in data/screenplays + the 12 blind-pair
// fixtures) with a throwaway manifest, a throwaway plan and a throwaway
// branch, in a clone. tests/scripts/owner-measure-e2e.test.ts drives it on
// every `npm test`, so the refusals, the SKIP trap, the stale-tip stop, the
// conversion and the re-lock are exercised on a machine with no corpus.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync,
  symlinkSync, writeFileSync,
} from 'node:fs';
import { createInterface } from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  AUC24_DEGRADATION_ID, AUC24_FLOOR, AUC24_SUBSET, AUC24_TABLE_PATH,
} from './lib/auc.ts';
import {
  ConversionError, convertPendingEntries, formatEdits,
} from './lib/receipt-conversion.mjs';
import {
  RelockError, relockManifest, serializeManifest,
} from './lib/manifest-relock.mjs';
import {
  PlanError, comparePlanWithNote, formatPlan, stepEligibility, validatePlan, wrap,
} from './lib/owner-measure-plan.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const PLAN_PATH = 'docs/p1-benchmark/owner-measurement-plan.json';
const MANIFEST_PATH = 'tests/fixtures/real-corpus-manifest.json';
const RECEIPT_PATH = 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md';

/** Exit codes: 0 done, 1 a refusal or a failure, 2 a usage error. */
const EXIT_OK = 0;
const EXIT_REFUSED = 1;
const EXIT_USAGE = 2;

class Refusal extends Error {
  constructor(message, detail = []) {
    super(message);
    this.name = 'Refusal';
    this.detail = detail;
  }
}

// ---------------------------------------------------------------------------
// Redaction — the one rule every printed line goes through
// ---------------------------------------------------------------------------

/**
 * Replace the corpus directory (and the user's home) with placeholders.
 *
 * The corpus dir alone is not a title, but `measure-real`'s mismatch list and
 * `verify-corpus-layout`'s failure lines quote FILES under it, and on the
 * private corpus those filenames are screenplay titles. Nothing from a tool's
 * output is echoed unredacted, and nothing that could carry a filename is
 * echoed at all — this is the belt for the braces.
 */
export function redact(text, corpusDir) {
  let out = String(text);
  if (corpusDir) {
    out = out.split(corpusDir).join('<corpus>');
  }
  const home = os.homedir();
  if (home && home !== '/') out = out.split(home).join('~');
  return out;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const args = {
    plan: false, dryRun: false, push: false, acceptAll: false, yes: false,
    stopAfter: null, only: null, corpusFixture: null, planFile: null,
    repoRoot: null, outDir: null, remote: null, keepTrees: false,
  };
  for (const a of argv) {
    if (a === '--plan') args.plan = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--push') args.push = true;
    else if (a === '--accept-all') args.acceptAll = true;
    else if (a === '--yes' || a === '-y') { args.yes = true; args.acceptAll = true; }
    else if (a === '--keep-trees') args.keepTrees = true;
    else if (a.startsWith('--stop-after=')) args.stopAfter = a.slice('--stop-after='.length);
    else if (a.startsWith('--only=')) args.only = a.slice('--only='.length);
    else if (a.startsWith('--corpus-fixture=')) args.corpusFixture = a.slice('--corpus-fixture='.length);
    else if (a.startsWith('--plan-file=')) args.planFile = a.slice('--plan-file='.length);
    else if (a.startsWith('--repo-root=')) args.repoRoot = a.slice('--repo-root='.length);
    else if (a.startsWith('--out-dir=')) args.outDir = a.slice('--out-dir='.length);
    else if (a.startsWith('--remote=')) args.remote = a.slice('--remote='.length);
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Refusal(`unknown argument: ${a}`, [USAGE]);
  }
  if (args.corpusFixture !== null && args.corpusFixture !== 'public') {
    throw new Refusal(`--corpus-fixture=${args.corpusFixture} is not a fixture this script knows (only "public")`);
  }
  return args;
}

const USAGE = `Usage: REAL_SCRIPT_CORPUS_DIR=<corpus> npm run owner:measure -- [options]

  --plan                   print the plan and the reason for every step, then exit
  --dry-run                run everything read-only; print every edit as a diff, write nothing
  --push                   push the conversion commit (default OFF — read the diff first)
  --accept-all, --yes      do not prompt at an accept/reject gate
  --stop-after=<step id>   stop after this step
  --only=<step id>         measure exactly this step (the way a "manual" step is reached)
  --corpus-fixture=public  self-test: run the whole pipeline on the 32 committed scripts
  --plan-file=<path>       read the plan from here instead of ${PLAN_PATH}
  --repo-root=<path>       operate on this repository instead of this script's own
  --out-dir=<path>         write the run's local artifacts here (default: XDG state dir)
  --remote=<name>          verify tips against this remote instead of the plan's`;

// ---------------------------------------------------------------------------
// Small process helpers
// ---------------------------------------------------------------------------

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, {
    encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts,
  });
  if (res.error) throw new Refusal(`could not run ${cmd}: ${res.error.message}`);
  return {
    status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '',
    command: [cmd, ...cmdArgs].join(' '),
  };
}

function git(repoRoot, gitArgs, { allowFail = false } = {}) {
  const res = run('git', ['-C', repoRoot, ...gitArgs]);
  if (res.status !== 0 && !allowFail) {
    throw new Refusal(`git ${gitArgs.join(' ')} failed (exit ${res.status})`, [res.stderr.trim()]);
  }
  return res.stdout.trim();
}

// ---------------------------------------------------------------------------
// The local output directory
// ---------------------------------------------------------------------------

/**
 * Where the run's artifacts go. NEVER inside the repository: the probe's CSV
 * and `measure-real`'s log index the corpus, and a file under the repo is one
 * `git add -A` away from being published. The guard below is what makes that a
 * property rather than a convention.
 */
export function resolveOutDir(repoRoot, { override = null, date, env = process.env, home = os.homedir() } = {}) {
  const base = override
    ? path.resolve(override)
    : path.join(
      env.XDG_STATE_HOME ? path.resolve(env.XDG_STATE_HOME) : path.join(home, '.storymachine'),
      env.XDG_STATE_HOME ? 'storymachine' : '',
      'owner-measure',
      date,
    );
  const dir = path.normalize(base);
  const rel = path.relative(path.resolve(repoRoot), dir);
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
    throw new Refusal(
      `the output directory ${dir} is inside the repository.`,
      [
        'The probe CSV and the measurement log index the corpus — on the private corpus their',
        'rows are the titles of real screenplays. A file under the repository is one `git add -A`',
        'away from being published, which is the exact exposure the de-identification work exists',
        'to avoid. Choose a path outside the repository.',
      ],
    );
  }
  return dir;
}

function writeArtifact(outDir, name, text) {
  mkdirSync(outDir, { recursive: true });
  const full = path.join(outDir, name);
  writeFileSync(full, text, 'utf8');
  return full;
}

// ---------------------------------------------------------------------------
// Corpus fingerprint — numbers and hashes, never a name
// ---------------------------------------------------------------------------

export function corpusFingerprint(manifestBytes) {
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  return {
    manifestHash: createHash('sha256').update(manifestBytes).digest('hex'),
    manifestScriptCount: manifest.length,
    corpusFingerprint: createHash('sha256')
      .update(manifest.map((m) => m.contentHash).join('\n'))
      .digest('hex'),
  };
}

// ---------------------------------------------------------------------------
// Parsing the tools' output
// ---------------------------------------------------------------------------

/**
 * Read `measure-real`'s output.
 *
 * THE SKIP TRAP, WHICH THE OWNER NOTE MEASURED: `measure-real` prints
 * `[SKIP] REAL_SCRIPT_CORPUS_DIR not set` and EXITS 0, while `lock-auc24`
 * refuses and exits 1. A mistyped variable on the first line therefore looks
 * like success and scrolls past, and the hard refusal that follows names a
 * different command. Here the SKIP banner is a FAILURE, whatever the exit code
 * says.
 */
export function parseMeasureReal(stdout, status) {
  if (/\[SKIP\]\s+REAL_SCRIPT_CORPUS_DIR not set/.test(stdout)) {
    throw new Refusal(
      'measure-real printed its SKIP banner and exited 0 — it measured NOTHING.',
      [
        'This is the trap the owner note names: an inline `VAR=x cmd` assignment applies to one',
        'command only, so the variable was not set for this run. Nothing was measured, nothing',
        'was written. Fix the variable and run again.',
      ],
    );
  }
  if (status !== 0) {
    throw new Refusal(`measure-real exited ${status} — see the run log in the output directory.`);
  }
  const out = { scripts: null, shuffleDropAuc: null, actSwapAuc: null, mismatches: null, belowFloor: null };
  const lines = stdout.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = /^eligible scripts\s*:\s*(\d+)/.exec(line);
    if (m) out.scripts = Number(m[1]);
    m = /^mismatches\s*:\s*(\d+)/.exec(line);
    if (m) out.mismatches = Number(m[1]);
    m = /^below floor \(< \d+\)\s*:\s*(\d+)\s*\//.exec(line);
    if (m) out.belowFloor = Number(m[1]);
    m = /^\s{2}(shuffle-drop|act-swap)\s*$/.exec(line);
    if (m) {
      const aucLine = lines.slice(i + 1, i + 3).find((l) => /^\s+AUC\s*:/.test(l));
      const value = aucLine ? Number(/:\s*([0-9.]+)/.exec(aucLine)?.[1]) : NaN;
      if (Number.isFinite(value)) {
        if (m[1] === 'shuffle-drop') out.shuffleDropAuc = value;
        else out.actSwapAuc = value;
      }
    }
  }
  if (out.shuffleDropAuc === null) {
    throw new Refusal(
      'measure-real produced no shuffle-drop AUC — the number this whole run exists to read.',
      ['Its output is in the run log. Do not proceed on a run whose number could not be read.'],
    );
  }
  return out;
}

/** Read `verify-corpus-layout`'s ✓/✗ lines. Its own exit code is not the whole
 *  story: see `classifyLayout`. */
export function parseLayoutChecks(stdout) {
  const checks = [];
  for (const line of stdout.split('\n')) {
    const m = /^([✓✗])\s+(.*)$/.exec(line.trim());
    if (m) checks.push({ ok: m[1] === '✓', label: m[2].replace(/\s{2,}.*$/, '').trim() });
  }
  return checks;
}

/**
 * WHAT verify:corpus-layout CAN AND CANNOT SAY TODAY, and why its exit code is
 * not simply forwarded.
 *
 * MEASURED 2026-09-13, on this repository as committed: that script assumes
 * the MIGRATED corpus schema. `scripts/output/corpus-split.json` is the
 * PRE-migration 761-script P1 split (`{file, sceneCount, wordCount}` rows, no
 * `id`, no `contentHash`), so check 2 fails and the script exits 1 BEFORE
 * reaching the checks that would speak about the 72-row AUC-24 corpus at all.
 * The owner note says to run it first; it is right that it should be run, and
 * wrong that it can pass today.
 *
 * So: a failure whose ONLY failing checks are the migrated-schema ones is
 * reported as a KNOWN pre-migration state and the run continues — with the
 * manifest-resolution check below, which actually speaks about this corpus,
 * standing in its place. Any OTHER failing check stops the run.
 */
export function classifyLayout(status, checks) {
  const failing = checks.filter((c) => !c.ok);
  if (status === 0 && failing.length === 0) return { ok: true, preMigration: false, failing };
  const preMigrationOnly = failing.length > 0
    && failing.every((c) => /migrated schema/i.test(c.label));
  if (preMigrationOnly) return { ok: true, preMigration: true, failing };
  return { ok: false, preMigration: false, failing };
}

// ---------------------------------------------------------------------------
// Scoring the manifest rows (the data the re-lock needs)
// ---------------------------------------------------------------------------

const SCORER = path.join(SCRIPT_DIR, 'lib', 'score-corpus-rows.mjs');
const VERIFIER = path.join(SCRIPT_DIR, 'lib', 'verify-receipt-range.mjs');

function scoreManifestRows(tree, corpusDir, manifestPath, outFile) {
  const res = run(process.execPath, [
    '--experimental-strip-types', SCORER,
    `--tree=${tree}`, `--corpus-dir=${corpusDir}`, `--manifest=${manifestPath}`, `--out=${outFile}`,
  ], { cwd: tree });
  if (res.status !== 0) {
    throw new Refusal(
      `scoring the manifest rows on this tree failed (exit ${res.status}).`,
      [redact(res.stderr.trim().split('\n').slice(-6).join('\n'), corpusDir)],
    );
  }
  return JSON.parse(readFileSync(outFile, 'utf8'));
}

// ---------------------------------------------------------------------------
// Worktrees
// ---------------------------------------------------------------------------

function addWorktree(repoRoot, dir, ref) {
  mkdirSync(path.dirname(dir), { recursive: true });
  git(repoRoot, ['worktree', 'add', '--detach', dir, ref]);
  // Worktrees carry no node_modules, and every tool below is a node script
  // that imports the repository's dependencies. The symlink is what the lane
  // standard already does by hand for its own worktrees.
  const modules = path.join(repoRoot, 'node_modules');
  if (existsSync(modules) && !existsSync(path.join(dir, 'node_modules'))) {
    try {
      symlinkSync(modules, path.join(dir, 'node_modules'), 'dir');
    } catch { /* a filesystem without symlinks still runs everything but npm deps */ }
  }
  return dir;
}

/** A worktree plus, in fixture mode, the throwaway manifest every tool on that
 *  tree reads. The baseline tree needs it as much as a branch tree does: a
 *  fixture run whose baseline scored against the REAL 72-row manifest would
 *  measure nothing at all (none of those rows resolve in the fixture corpus). */
function newTree(ctx, dir, ref) {
  addWorktree(ctx.repoRoot, dir, ref);
  if (ctx.fixtureManifest) {
    writeFileSync(path.join(dir, MANIFEST_PATH), serializeManifest(ctx.fixtureManifest), 'utf8');
  }
  return dir;
}

function removeWorktree(repoRoot, dir) {
  try {
    rmSync(path.join(dir, 'node_modules'), { force: true });
  } catch { /* not a symlink, or already gone */ }
  run('git', ['-C', repoRoot, 'worktree', 'remove', '--force', dir]);
}

// ---------------------------------------------------------------------------
// The public fixture
// ---------------------------------------------------------------------------

/**
 * Assemble the 32 distributable screenplays into a throwaway corpus directory
 * and the throwaway manifest that indexes them, by scoring them with the tree
 * under test. The corpus list comes from `scripts/lib/public-benchmark.ts` —
 * the same list the public benchmark scores, so there is one definition of
 * "the 32 committed scripts".
 */
async function buildPublicFixtureCorpus(tree, outDir) {
  const { listPublicCorpus } = await import(
    pathToFileURL(path.join(tree, 'scripts/lib/public-benchmark.ts')).href
  );
  const scripts = listPublicCorpus(tree);
  const corpusDir = path.join(outDir, 'fixture-corpus');
  mkdirSync(corpusDir, { recursive: true });
  // `file` is the repo-relative path; the fixture corpus is flat, so each one
  // lands under a name derived from it (the same shape a de-identified corpus
  // has: an opaque flat filename, one per script).
  const flatName = (s) => `${s.file.replace(/\.fountain$/, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}.fountain`;
  for (const s of scripts) {
    copyFileSync(path.join(tree, s.file), path.join(corpusDir, flatName(s)));
  }
  const rowsFile = path.join(outDir, 'fixture-corpus-rows.json');
  const stub = scripts.map((s) => ({ name: flatName(s), file: flatName(s), contentHash: '', health: 0, verdict: '', sceneCount: 0 }));
  const stubPath = path.join(outDir, 'fixture-manifest-stub.json');
  writeFileSync(stubPath, `${JSON.stringify(stub, null, 2)}\n`, 'utf8');
  const rows = scoreManifestRows(tree, corpusDir, stubPath, rowsFile);
  const manifest = stub.map((row, i) => ({
    ...row,
    contentHash: rows[i].contentHash,
    health: rows[i].health,
    verdict: rows[i].verdict,
    sceneCount: rows[i].sceneCount,
  }));
  return { corpusDir, manifest };
}

// ---------------------------------------------------------------------------
// Prompting
// ---------------------------------------------------------------------------

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await new Promise((resolve) => rl.question(question, (a) => resolve(a.trim().toLowerCase())));
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// One measured tree
// ---------------------------------------------------------------------------

async function measureTree(ctx, { label, ref, tree, probe }) {
  const log = [];
  const say = (line) => { console.log(line); log.push(line); };
  say(`  tree            : ${label} @ ${git(ctx.repoRoot, ['rev-parse', '--short', ref])}`);

  // ── the probe, on this tree and on its pre-branch base ────────────────────
  if (probe) {
    for (const [which, at] of [['branch', ref], ['base', probe.base]]) {
      const result = runProbe(ctx, { which, at, sourceRef: probe.sourceRef, label });
      say(`  probe (${which.padEnd(6)}) : ${result.summary}`);
      log.push(...result.log);
    }
    say('  NOTE            : the probe CSVs index the corpus. They are in the output directory');
    say('                    and must not be pasted into a receipt, a commit message or a chat.');
  } else {
    say('  probe           : none recorded for this step');
  }

  // ── measure-real ──────────────────────────────────────────────────────────
  const cmd = [process.execPath, '--experimental-strip-types', 'scripts/measure-real-script-discrimination.ts'];
  const res = run(cmd[0], cmd.slice(1), {
    cwd: tree,
    env: { ...process.env, REAL_SCRIPT_CORPUS_DIR: ctx.corpusDir },
  });
  const logFile = writeArtifact(ctx.outDir, `${label}.measure-real.log`, `$ REAL_SCRIPT_CORPUS_DIR=<corpus> ${cmd.join(' ')}\n\n${res.stdout}\n${res.stderr}`);
  const parsed = parseMeasureReal(res.stdout, res.status);
  say(`  measure-real    : ${parsed.scripts} scripts · shuffle-drop AUC-24 ${parsed.shuffleDropAuc.toFixed(4)} · act-swap ${parsed.actSwapAuc === null ? 'n/a' : parsed.actSwapAuc.toFixed(3)}`);
  say(`  manifest        : ${parsed.mismatches} mismatch(es) · ${parsed.belowFloor ?? '?'} below the produced floor`);
  say(`  command         : REAL_SCRIPT_CORPUS_DIR=<corpus> ${cmd.slice(1).join(' ')}  (cwd ${redact(tree, ctx.corpusDir)})`);
  say(`  log             : ${redact(logFile, ctx.corpusDir)}`);

  return {
    label, ref, tree, auc24: parsed.shuffleDropAuc, actSwap: parsed.actSwapAuc,
    scripts: parsed.scripts, mismatches: parsed.mismatches, log, commandLine: cmd.join(' '),
  };
}

/**
 * Run the corpus-shape probe on one tree.
 *
 * WHAT THE BRIEF AND THE NOTE GET RIGHT AND WRONG HERE, measured 2026-09-13:
 * `scripts/probe-corpus-shape.ts` does not exist on `main` or on
 * `scoring/feature-length-defects` — it was written on
 * `scoring/adversarial-2026-09-12`, and the note is right that it has to be
 * copied across. But it cannot always be: the `scoring/forced-cue` copy
 * imports `FORCED_CUE_MARKER` from `src/lib/fountain.ts` and the
 * `scoring/renderer-residuals` copy also imports `FORCED_TRANSITION_MARKER` —
 * symbols the base trees do not export, because those exports ARE the change.
 * So each side runs the newest copy that its own tree can load: the tree's own
 * if it has one, else the plan's `sourceRef` copy, and a tree that can load
 * neither is recorded as "no probe" with the reason rather than failing the
 * run. On a base tree the new column is zero by construction.
 */
function runProbe(ctx, { which, at, sourceRef, label }) {
  const log = [];
  const dir = path.join(ctx.treesDir, `probe-${label}-${which}`);
  addWorktree(ctx.repoRoot, dir, at);
  try {
    const own = path.join(dir, 'scripts/probe-corpus-shape.ts');
    let provenance = 'the tree\'s own copy';
    if (!existsSync(own) && sourceRef) {
      const show = run('git', ['-C', ctx.repoRoot, 'show', `${sourceRef}:scripts/probe-corpus-shape.ts`]);
      if (show.status !== 0) {
        return { summary: `skipped — no probe on this tree and none at ${sourceRef.slice(0, 8)}`, log };
      }
      writeFileSync(own, show.stdout, 'utf8');
      provenance = `copied from ${sourceRef.slice(0, 8)}`;
    }
    if (!existsSync(own)) {
      return { summary: 'skipped — this tree has no scripts/probe-corpus-shape.ts and the plan names no source', log };
    }
    const res = run(process.execPath, ['--experimental-strip-types', 'scripts/probe-corpus-shape.ts', '--csv'], {
      cwd: dir,
      env: { ...process.env, REAL_SCRIPT_CORPUS_DIR: ctx.corpusDir },
    });
    if (res.status !== 0) {
      const why = redact(res.stderr.trim().split('\n').slice(-3).join(' | '), ctx.corpusDir);
      writeArtifact(ctx.outDir, `${label}.probe-${which}.error.log`, `${res.stdout}\n${res.stderr}`);
      return { summary: `unavailable (${provenance}) — ${why.slice(0, 160)}`, log };
    }
    const file = writeArtifact(ctx.outDir, `${label}.probe-${which}.csv`, res.stdout);
    const rows = res.stdout.trim().split('\n').length - 1;
    log.push(`probe ${which} (${provenance}) -> ${file}`);
    return { summary: `${rows} rows, ${provenance} -> ${redact(file, ctx.corpusDir)}`, log };
  } finally {
    if (!ctx.keepTrees) removeWorktree(ctx.repoRoot, dir);
  }
}

// ---------------------------------------------------------------------------
// The receipt conversion, on one branch
// ---------------------------------------------------------------------------

/** Ask the measured tree's own gate what a range contains. Returns the parsed
 *  `{ entries, headings, problems }`. */
function inspectRange(ctx, tree, base) {
  const res = run(process.execPath, [VERIFIER, `--tree=${tree}`, `--base=${base}`], { cwd: tree });
  if (res.status !== 0) {
    throw new Refusal(
      `could not read range ${base.slice(0, 8)}..HEAD with the gate's own functions.`,
      [redact(res.stderr.trim(), ctx.corpusDir)],
    );
  }
  return JSON.parse(res.stdout.trim().split('\n').pop());
}

async function convertAndCommit(ctx, step, tree, measurement, baseline) {
  const receiptFile = path.join(tree, RECEIPT_PATH);
  const before = readFileSync(receiptFile, 'utf8');
  // The entries this RANGE adds — the only ones the conversion may touch. See
  // scripts/lib/receipt-conversion.mjs's `only`.
  const inRange = new Set();
  for (const range of step.receiptRanges) {
    for (const heading of inspectRange(ctx, tree, range.replace(/\.\.HEAD$/, '')).headings) {
      inRange.add(heading);
    }
  }
  const fingerprint = corpusFingerprint(readFileSync(path.join(tree, MANIFEST_PATH)));
  const facts = {
    date: ctx.date,
    branch: step.branch,
    filedAtSha: git(ctx.repoRoot, ['rev-parse', step.tip]),
    runner: `${ctx.runnerLogin}@${ctx.runnerHost}`,
    auc24: measurement.auc24,
    actSwapAuc: measurement.actSwap,
    baselineAuc24: baseline ? baseline.auc24 : null,
    baselineRef: baseline ? baseline.label : null,
    corpusScriptCount: measurement.scripts,
    subsetSize: AUC24_SUBSET,
    degradationId: AUC24_DEGRADATION_ID,
    floor: AUC24_FLOOR,
    ...fingerprint,
  };
  const result = convertPendingEntries(before, facts, { only: inRange });
  if (result.outOfScope.length > 0) {
    console.log(`  receipt         : ${result.outOfScope.length} pending-looking entr${result.outOfScope.length === 1 ? 'y' : 'ies'} outside this range left untouched (merged history the CLI never validates)`);
  }
  if (result.converted.length === 0) {
    console.log('  receipt         : no PENDING entry in this tree — nothing to convert');
    return { committed: false, converted: [] };
  }
  console.log(`  receipt         : ${result.converted.length} PENDING entr${result.converted.length === 1 ? 'y' : 'ies'} converted by the three-scan recipe`);

  writeFileSync(receiptFile, result.text, 'utf8');
  // Verification one: the gate's OWN exported functions over the real diff,
  // run BY THE MEASURED TREE (see scripts/lib/verify-receipt-range.mjs for why
  // that is a separate process and not an import).
  for (const range of step.receiptRanges) {
    const base = range.replace(/\.\.HEAD$/, '');
    let entries; let problems;
    try {
      ({ entries, problems } = inspectRange(ctx, tree, base));
    } catch (err) {
      writeFileSync(receiptFile, before, 'utf8');
      throw err;
    }
    if (problems.length > 0) {
      writeFileSync(receiptFile, before, 'utf8');
      throw new Refusal(
        `the conversion left ${problems.length} problem(s) on range ${base.slice(0, 8)}..HEAD — nothing was committed.`,
        [...problems, '', 'The three scans are in docs/brain/Owner/Owner - R5 Measurement and Merge.md.'],
      );
    }
    if (entries === 0) {
      // A verification that saw NO entries verified nothing. The first version
      // of this check imported the gate into this process, where `ROOT` is the
      // orchestrator's cwd, and cheerfully printed "0 entries, 0 problems" for
      // a conversion it had never looked at.
      writeFileSync(receiptFile, before, 'utf8');
      throw new Refusal(
        `range ${base.slice(0, 8)}..HEAD adds no receipt entry at all — refusing to treat that as a pass.`,
        ['The conversion rewrote an entry, so the range must show one. Either the range is wrong',
          'in the plan record, or the entry this run converted is not one this range adds.'],
      );
    }
    console.log(`  verified        : ${base.slice(0, 8)}..HEAD — ${entries} entr${entries === 1 ? 'y' : 'ies'}, 0 problems (gate's own validateEntry)`);
  }

  if (ctx.dryRun) {
    console.log('');
    console.log(formatEdits(result.converted));
    writeFileSync(receiptFile, before, 'utf8');
    console.log('  --dry-run       : the receipt was restored; nothing was written or committed');
    return { committed: false, converted: result.converted };
  }
  return { committed: true, converted: result.converted, receiptFile };
}

// ---------------------------------------------------------------------------
// Pre-flight
// ---------------------------------------------------------------------------

function preflight(ctx, plan) {
  const out = [];
  const say = (line) => { console.log(line); out.push(line); };
  say('─'.repeat(78));
  say('PRE-FLIGHT');
  say('─'.repeat(78));

  if (!ctx.corpusDir) {
    throw new Refusal(
      'REAL_SCRIPT_CORPUS_DIR is not set — refusing to run. Nothing was written.',
      [
        'Every number this command produces comes from the local corpus. With no corpus there is',
        'nothing to measure, and a run that produced a receipt anyway would be the fabrication',
        'the receipt gate exists to make expensive.',
        '',
        '  REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run owner:measure',
        '',
        'The variable must be on the SAME line as the command: an inline assignment applies to',
        'one command only.',
      ],
    );
  }
  if (!existsSync(ctx.corpusDir) || !statSync(ctx.corpusDir).isDirectory()) {
    throw new Refusal(`REAL_SCRIPT_CORPUS_DIR points at "${redact(ctx.corpusDir, null)}", which is not a directory. Nothing was written.`);
  }
  say(`corpus            : set, readable (${readdirSync(ctx.corpusDir).length} entries)`);

  // Working tree clean — a run that commits a receipt must not sweep up
  // whatever the owner had open.
  const dirty = git(ctx.repoRoot, ['status', '--porcelain=v1']).split('\n').filter((l) => l.trim() !== '');
  if (dirty.length > 0 && !ctx.allowDirty) {
    throw new Refusal(
      `the working tree has ${dirty.length} uncommitted change(s).`,
      ['Commit or stash them first: this command creates commits, and a dirty tree is how an',
        'unrelated edit ends up inside a measurement receipt.',
        ...dirty.slice(0, 10).map((l) => `  ${l}`)],
    );
  }
  say('working tree      : clean');

  // The remote, fetched.
  const remote = ctx.remote;
  const fetched = run('git', ['-C', ctx.repoRoot, 'fetch', remote, '--quiet']);
  if (fetched.status !== 0) {
    throw new Refusal(`\`git fetch ${remote}\` failed — the recorded tips cannot be verified.`, [fetched.stderr.trim()]);
  }
  say(`remote            : ${remote}, fetched`);

  // The owner's own checkout must not be sitting on a branch this run moves.
  const head = git(ctx.repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const measured = new Set(plan.steps.map((s) => s.branch));
  if (measured.has(head)) {
    throw new Refusal(
      `your checkout is on \`${head}\`, which this run measures and commits to.`,
      ['Check out another branch first. Every measurement happens in a detached worktree so your',
        'checkout is never touched — that promise cannot be kept for the branch you are standing on.'],
    );
  }
  say(`HEAD              : ${head} (not a measured branch)`);

  // Every recorded tip, against the remote. The record is the authority.
  const drift = [];
  for (const step of plan.steps) {
    for (const target of step.stack ?? [{ branch: step.branch, tip: step.tip }]) {
      const ref = `refs/remotes/${remote}/${target.branch}`;
      const actual = git(ctx.repoRoot, ['rev-parse', '--verify', '--quiet', ref], { allowFail: true });
      if (actual === '') {
        drift.push(`${target.branch}: recorded ${target.tip.slice(0, 8)}, but ${remote} has no such branch`);
      } else if (actual !== target.tip) {
        drift.push(`${target.branch}: recorded ${target.tip.slice(0, 8)}, ${remote} has ${actual.slice(0, 8)}`);
      }
    }
  }
  if (drift.length > 0) {
    throw new Refusal(
      `${drift.length} recorded branch tip(s) do not match ${remote}.`,
      [
        ...drift.map((d) => `  ${d}`),
        '',
        'THE RECORD IS THE AUTHORITY, and a moved tip means the record is stale — the owner note',
        `and ${PLAN_PATH} both have to be re-read and updated together before`,
        'anything is measured. Measuring a tree nobody wrote down is how a number ends up',
        'attached to the wrong branch. Nothing was measured and nothing was written.',
      ],
    );
  }
  say(`tips              : ${plan.steps.length} step(s), every recorded tip matches ${remote}`);

  // verify:corpus-layout — the note's pre-flight, with today's caveat.
  const layout = run(process.execPath, [path.join(ctx.repoRoot, 'scripts/verify-corpus-layout.mjs'), `--corpus-dir=${ctx.corpusDir}`], { cwd: ctx.repoRoot });
  const layoutFile = writeArtifact(ctx.outDir, 'verify-corpus-layout.log', `${layout.stdout}\n${layout.stderr}`);
  const checks = parseLayoutChecks(layout.stdout);
  const verdict = classifyLayout(layout.status, checks);
  if (!verdict.ok) {
    throw new Refusal(
      `verify:corpus-layout failed ${verdict.failing.length} check(s) that are not the known pre-migration ones.`,
      [...verdict.failing.map((c) => `  ✗ ${redact(c.label, ctx.corpusDir)}`), '', `Full output: ${redact(layoutFile, ctx.corpusDir)}`],
    );
  }
  say(`corpus layout     : ${checks.filter((c) => c.ok).length}/${checks.length} checks pass${verdict.preMigration ? ' — the rest are the KNOWN pre-migration schema failures (see classifyLayout)' : ''}`);

  // The check verify:corpus-layout cannot make today: does every manifest row
  // resolve to a file in this corpus? Counts and hash prefixes only.
  const manifest = JSON.parse(readFileSync(path.join(ctx.repoRoot, MANIFEST_PATH), 'utf8'));
  const missing = manifest.filter((e) => !existsSync(path.join(ctx.corpusDir, e.file)));
  if (missing.length > 0) {
    throw new Refusal(
      `${missing.length} of the ${manifest.length} manifest rows do not resolve to a file in this corpus.`,
      [
        'The AUC-24 statistic is defined over the FIRST 24 rows in committed array order; a',
        'partial subset produces a number that is not comparable to the floor.',
        `Missing, by content hash (never by title): ${missing.slice(0, 12).map((e) => e.contentHash.slice(0, 8)).join(', ')}`,
      ],
    );
  }
  const fp = corpusFingerprint(readFileSync(path.join(ctx.repoRoot, MANIFEST_PATH)));
  say(`manifest          : ${manifest.length}/${manifest.length} rows resolve · sha256 ${fp.manifestHash.slice(0, 12)} · corpus id ${fp.corpusFingerprint.slice(0, 12)}`);
  say('');
  return { fingerprint: fp, layout: verdict, log: out };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(USAGE);
    return EXIT_OK;
  }
  const repoRoot = path.resolve(args.repoRoot ?? DEFAULT_REPO_ROOT);
  const planPath = path.resolve(args.planFile ?? path.join(repoRoot, PLAN_PATH));
  const plan = validatePlan(JSON.parse(readFileSync(planPath, 'utf8')));
  const noteFile = path.join(repoRoot, plan.note);
  const noteProblems = existsSync(noteFile)
    ? comparePlanWithNote(plan, readFileSync(noteFile, 'utf8'))
    : [`the plan names a note (${plan.note}) that does not exist in this repository`];

  console.log(formatPlan(plan, { noteProblems }));
  if (noteProblems.length > 0) {
    throw new Refusal(
      'the owner note and the plan record state different things — refusing to measure.',
      ['Fix BOTH, never one: the note carries the reasons and the record carries the order, and a',
        'run driven by one while a person reads the other is how the wrong branch gets measured.'],
    );
  }
  if (args.plan) return EXIT_OK;

  const date = new Date().toISOString().slice(0, 10);
  const ctx = {
    repoRoot,
    remote: args.remote ?? plan.remote,
    corpusDir: (process.env.REAL_SCRIPT_CORPUS_DIR ?? '').trim(),
    outDir: resolveOutDir(repoRoot, { override: args.outDir, date }),
    date,
    dryRun: args.dryRun,
    push: args.push,
    keepTrees: args.keepTrees,
    allowDirty: false,
    runnerLogin: os.userInfo().username,
    runnerHost: os.hostname(),
  };
  ctx.treesDir = path.join(ctx.outDir, 'trees');
  mkdirSync(ctx.outDir, { recursive: true });

  console.log(`output directory  : ${redact(ctx.outDir, null)}`);
  console.log('                    Everything this run writes outside the repository goes here. The');
  console.log('                    probe CSVs and the measurement logs INDEX THE CORPUS — keep them');
  console.log('                    on this machine; never paste them anywhere.');
  console.log('');

  // ── the public fixture: a throwaway corpus, manifest and plan ─────────────
  if (args.corpusFixture === 'public') {
    const fixture = await buildPublicFixtureCorpus(repoRoot, ctx.outDir);
    ctx.corpusDir = fixture.corpusDir;
    ctx.fixtureManifest = fixture.manifest;
    ctx.allowDirty = true;
    process.env.REAL_SCRIPT_CORPUS_DIR = fixture.corpusDir;
    writeFileSync(path.join(repoRoot, MANIFEST_PATH), serializeManifest(fixture.manifest), 'utf8');
    console.log(`FIXTURE MODE      : ${fixture.manifest.length} committed scripts as a throwaway corpus; the manifest in this`);
    console.log('                    checkout has been replaced by a throwaway one. This is a self-test.');
    console.log('');
  }

  preflight(ctx, plan);

  // ── the baseline, FIRST ──────────────────────────────────────────────────
  console.log('─'.repeat(78));
  console.log(`BASELINE — ${plan.baseline.ref}`);
  console.log('─'.repeat(78));
  console.log(wrap(plan.baseline.reason, 78, '  ').join('\n'));
  const baselineTree = newTree(ctx, path.join(ctx.treesDir, 'baseline'), `${ctx.remote}/${plan.baseline.ref}`);
  let baseline;
  try {
    baseline = await measureTree(ctx, { label: 'baseline', ref: `${ctx.remote}/${plan.baseline.ref}`, tree: baselineTree, probe: null });
  } finally {
    if (!ctx.keepTrees) removeWorktree(repoRoot, baselineTree);
  }
  console.log('');

  // ── the steps ────────────────────────────────────────────────────────────
  const decisions = new Map();
  const results = [];
  let accepted = null;
  for (const step of plan.steps) {
    if (args.only && args.only !== step.id) continue;
    const eligibility = args.only === step.id
      ? { eligible: true, reason: `named by --only=${step.id}` }
      : stepEligibility(step, decisions);
    console.log('─'.repeat(78));
    console.log(`STEP ${step.id} — ${eligibility.eligible ? 'MEASURING' : 'SKIPPED'}`);
    console.log('─'.repeat(78));
    console.log(wrap(eligibility.reason, 78, '  ').join('\n'));
    if (!eligibility.eligible) { console.log(''); continue; }
    console.log(wrap(step.reason, 78, '  ').join('\n'));
    if (step.caveat) console.log(wrap(`CAVEAT: ${step.caveat}`, 78, '  ').join('\n'));

    const tree = newTree(ctx, path.join(ctx.treesDir, step.id), step.tip);
    try {
      const measurement = await measureTree(ctx, { label: step.id, ref: step.tip, tree, probe: step.probe });
      results.push({ step, measurement });

      console.log('');
      console.log(`  AUC-24          : ${measurement.auc24.toFixed(4)}`);
      console.log(`  vs AUC24_FLOOR  : ${AUC24_FLOOR} — ${measurement.auc24 >= AUC24_FLOOR ? 'clears' : 'BELOW THE FLOOR'}`);
      console.log(`  vs ${baseline.label.padEnd(12)}: ${baseline.auc24.toFixed(4)} (${(measurement.auc24 - baseline.auc24 >= 0 ? '+' : '') + (measurement.auc24 - baseline.auc24).toFixed(4)})`);
      console.log('  BOTH numbers are on recipe ' + AUC24_DEGRADATION_ID + ', measured in this run. The last');
      console.log('  recorded AUC-24 (0.731, 2026-07-11) is on the PRE-2026-09-12 segmentation and is');
      console.log('  not comparable to either of them.');
      console.log('');

      const conversion = await convertAndCommit(ctx, step, tree, measurement, baseline);

      // ── the accept/reject gate ────────────────────────────────────────────
      let decision = 'accepted';
      if (step.gate === 'accept-reject') {
        if (args.acceptAll) {
          console.log('  gate            : --accept-all, taken as accepted');
        } else {
          const answer = await ask(`  accept ${step.id} (AUC-24 ${measurement.auc24.toFixed(4)} vs baseline ${baseline.auc24.toFixed(4)})? [y/N] `);
          decision = answer === 'y' || answer === 'yes' ? 'accepted' : 'rejected';
        }
      } else {
        console.log('  gate            : this step reports; it takes no accept/reject decision');
      }
      decisions.set(step.id, decision);
      console.log(`  decision        : ${decision}`);

      // ── the manifest re-lock, ONLY on acceptance ──────────────────────────
      if (decision === 'accepted') {
        accepted = { step, tree, measurement };
        relockStep(ctx, step, tree);
      } else {
        console.log('  manifest        : not re-locked — the re-lock follows acceptance, never a measurement');
      }

      if (conversion.committed) commitOnBranch(ctx, step, tree, measurement, decision);
    } finally {
      if (!ctx.keepTrees && !(accepted && accepted.step === step)) removeWorktree(repoRoot, tree);
    }
    console.log('');
    if (args.stopAfter === step.id) {
      console.log(`--stop-after=${step.id}: stopping here as asked.`);
      break;
    }
  }

  // ── the lock ─────────────────────────────────────────────────────────────
  const lockRef = accepted ? accepted.step.tip : `${ctx.remote}/${plan.baseline.ref}`;
  const lockLabel = accepted ? accepted.step.branch : plan.baseline.ref;
  console.log('─'.repeat(78));
  console.log(`LOCK — ${plan.lock.artifact} on ${lockLabel}`);
  console.log('─'.repeat(78));
  console.log(wrap(plan.lock.reason, 78, '  ').join('\n'));
  const lockTree = accepted ? accepted.tree : newTree(ctx, path.join(ctx.treesDir, 'lock'), lockRef);
  try {
    lockAuc24Step(ctx, lockTree, lockLabel, accepted);
  } finally {
    if (!accepted && !ctx.keepTrees) removeWorktree(repoRoot, lockTree);
  }

  // ── what the owner does next ─────────────────────────────────────────────
  printNextSteps(ctx, { accepted, results, baseline, plan });
  if (accepted && !ctx.keepTrees) removeWorktree(repoRoot, accepted.tree);
  return EXIT_OK;
}

/** The 72-row re-lock, in place, order preserved. */
function relockStep(ctx, step, tree) {
  const manifestPath = path.join(tree, MANIFEST_PATH);
  const existing = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const rowsFile = path.join(ctx.outDir, `${step.id}.manifest-rows.json`);
  const fresh = scoreManifestRows(tree, ctx.corpusDir, manifestPath, rowsFile);
  const { manifest, changes } = relockManifest(existing, fresh);
  console.log(`  manifest re-lock: ${existing.length} rows mapped IN PLACE, order preserved — ${changes.length} field(s) moved`);
  for (const c of changes.slice(0, 12)) {
    console.log(`                    row ${String(c.index).padStart(2)} ${c.field}: ${c.was} -> ${c.now}`);
  }
  if (changes.length > 12) console.log(`                    … and ${changes.length - 12} more (full list in the run log)`);
  writeArtifact(ctx.outDir, `${step.id}.manifest-changes.json`, `${JSON.stringify(changes, null, 2)}\n`);
  if (ctx.dryRun) {
    console.log('  --dry-run       : the manifest was NOT written');
    return;
  }
  writeFileSync(manifestPath, serializeManifest(manifest), 'utf8');
}

/** Commit the conversion (and any re-lock) on the branch, in the detached
 *  worktree, then run the REAL CLI as the final check. */
function commitOnBranch(ctx, step, tree, measurement, decision) {
  const changed = git(tree, ['status', '--porcelain=v1']).split('\n').filter((l) => l.trim() !== '');
  // `node_modules` is the symlink `newTree` adds so the tree's own tools can
  // run; it is this script's doing, not a change to the branch.
  const unexpected = changed.filter(
    (l) => !l.endsWith('node_modules') && ![RECEIPT_PATH, MANIFEST_PATH].some((p) => l.endsWith(p)),
  );
  if (unexpected.length > 0) {
    throw new Refusal(
      'the measured worktree has changes this run did not make — refusing to commit.',
      unexpected.map((l) => `  ${l}`),
    );
  }
  git(tree, ['add', RECEIPT_PATH, ...(changed.some((l) => l.endsWith(MANIFEST_PATH)) ? [MANIFEST_PATH] : [])]);
  const message = [
    `docs(receipt): the ${ctx.date} owner measurement on \`${step.branch}\` — AUC-24 ${measurement.auc24.toFixed(4)}`,
    '',
    `Run by \`npm run owner:measure\` on ${ctx.date}. The PENDING ledger entries in this`,
    `range are converted in place by the three-scan recipe; \`check-scoring-receipt\``,
    `${step.receiptRanges.map((r) => r.replace(/^([0-9a-f]{8})[0-9a-f]*/, '$1')).join(' and ')} exits 0 on this commit.`,
    `Decision at the gate: ${decision}.`,
    '',
    'No corpus path, title or filename is in this commit: the numbers and the',
    'fingerprint are, which is the shape this repository already commits.',
  ].join('\n');
  git(tree, ['commit', '-m', message]);
  const newSha = git(tree, ['rev-parse', 'HEAD']);
  console.log(`  committed       : ${newSha.slice(0, 8)} on the detached worktree`);

  // The real CLI, on the branch's own copy of the gate, with the branch's cwd.
  for (const range of step.receiptRanges) {
    const res = run(process.execPath, [path.join(tree, 'scripts/check-scoring-receipt.mjs'), range], { cwd: tree });
    if (res.status !== 0) {
      console.error(redact(res.stdout + res.stderr, ctx.corpusDir));
      throw new Refusal(
        `check-scoring-receipt ${range} exited ${res.status} on the committed tree.`,
        [`The commit is at ${newSha.slice(0, 8)} in ${redact(tree, ctx.corpusDir)} and the branch ref was NOT moved.`],
      );
    }
    console.log(`  gate CLI        : check-scoring-receipt ${range.replace(/^([0-9a-f]{8})[0-9a-f]*/, '$1')} — exit 0`);
  }

  // Only now is the branch ref moved, with its old value pinned so a branch
  // that moved under us fails instead of being overwritten.
  git(ctx.repoRoot, ['update-ref', `refs/heads/${step.branch}`, newSha, step.tip], { allowFail: true });
  console.log(`  branch          : refs/heads/${step.branch} -> ${newSha.slice(0, 8)}`);
  if (ctx.push) {
    const res = run('git', ['-C', tree, 'push', ctx.remote, `${newSha}:refs/heads/${step.branch}`]);
    console.log(`  push            : ${res.status === 0 ? 'ok' : `FAILED (exit ${res.status}) — ${res.stderr.trim().split('\n')[0]}`}`);
  } else {
    console.log('  push            : skipped (--push is off by default — read the diff first)');
  }
}

/** The last step: the committed table the 2026-10-01 deadline is about. */
function lockAuc24Step(ctx, tree, label, accepted) {
  if (ctx.dryRun) {
    console.log('  --dry-run       : lock-auc24 not run (it writes tests/fixtures/auc24-table.json)');
    return;
  }
  const res = run(process.execPath, ['--experimental-strip-types', 'scripts/lock-auc24.mjs'], {
    cwd: tree, env: { ...process.env, REAL_SCRIPT_CORPUS_DIR: ctx.corpusDir },
  });
  const logFile = writeArtifact(ctx.outDir, 'lock-auc24.log', `${res.stdout}\n${res.stderr}`);
  if (res.status !== 0) {
    throw new Refusal(`lock-auc24 exited ${res.status} on ${label}.`, [`Output: ${redact(logFile, ctx.corpusDir)}`]);
  }
  const measured = /measured AUC-\d+\s*:\s*([0-9.]+)/.exec(res.stdout);
  const table = path.join(tree, AUC24_TABLE_PATH);
  if (!existsSync(table)) throw new Refusal(`lock-auc24 exited 0 but wrote no ${AUC24_TABLE_PATH}.`);
  git(tree, ['add', AUC24_TABLE_PATH]);
  console.log(`  locked          : ${AUC24_TABLE_PATH} (measured ${measured ? measured[1] : '?'}), staged with \`git add\``);
  console.log(`  recipe          : ${AUC24_DEGRADATION_ID} — the FIRST AUC-24 this segmentation has ever produced.`);
  console.log('                    Do not compare it to 0.731.');
  if (!accepted) {
    console.log('  note            : nothing was accepted, so this table is locked on the baseline. The');
    console.log('                    2026-10-01 deadline is the TABLE, not the branches.');
  }
}

function printNextSteps(ctx, { accepted, results, baseline, plan }) {
  console.log('');
  console.log('='.repeat(78));
  console.log('WHAT YOU COMMIT AND PUSH NEXT');
  console.log('='.repeat(78));
  console.log(`baseline ${plan.baseline.ref}: AUC-24 ${baseline.auc24.toFixed(4)} (recipe ${AUC24_DEGRADATION_ID})`);
  for (const r of results) {
    console.log(`${r.step.id.padEnd(32)}: AUC-24 ${r.measurement.auc24.toFixed(4)}  (${(r.measurement.auc24 - baseline.auc24 >= 0 ? '+' : '') + (r.measurement.auc24 - baseline.auc24).toFixed(4)} vs baseline)`);
  }
  console.log('');
  if (ctx.dryRun) {
    console.log('--dry-run: nothing was written, nothing was committed, no ref moved.');
    return;
  }
  const where = accepted ? accepted.step.branch : plan.baseline.ref;
  console.log(`1. Read the diff on \`${where}\`: the converted receipt entries and, if a step was`);
  console.log('   accepted, the re-locked 72-row manifest. A re-lock after an unintended change');
  console.log('   silently lowers a ratchet — that is the one way this machinery is defeated.');
  console.log(`2. Commit ${AUC24_TABLE_PATH} (already staged) on \`${where}\`:`);
  console.log(`     git -C <checkout> commit -m "test(auc24): lock the table from the ${ctx.date} owner run"`);
  console.log(`3. Push: git push ${ctx.remote} ${where}`);
  console.log('4. Consider raising AUC24_FLOOR in scripts/lib/auc.ts to the measured number minus');
  console.log('   the 0.05 margin — the ratchet only ratchets if it moves, and moving it is a');
  console.log("   measurement's job, which this run just did.");
  console.log('');
  console.log('THE VOICE BOUND, at the point it applies: any stack carrying the first branch\'s');
  console.log('1,500,000 voice-eligible-weight bound must not land before main\'s 675,000');
  console.log('re-derivation is applied on the merged tree with the analyzer cap in place.');
  console.log('');
  console.log(`Local artifacts (corpus-indexing — keep them here): ${redact(ctx.outDir, null)}`);
}

// ---------------------------------------------------------------------------

const invokedDirectly = Boolean(process.argv[1])
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (err) {
    if (err instanceof Refusal || err instanceof PlanError || err instanceof ConversionError || err instanceof RelockError) {
      console.error('');
      console.error('!'.repeat(78));
      console.error(`[REFUSED] ${err.message}`);
      for (const line of err.detail ?? []) console.error(`          ${line}`);
      console.error('!'.repeat(78));
      process.exitCode = err instanceof Refusal && /unknown argument/.test(err.message) ? EXIT_USAGE : EXIT_REFUSED;
    } else {
      throw err;
    }
  }
}

export { main, Refusal };
