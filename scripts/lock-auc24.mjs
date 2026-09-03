#!/usr/bin/env node
// LOCK THE AUC-24 TABLE — the owner-local step that makes the ratchet
// recomputable in CI.
//
// ── What this produces ─────────────────────────────────────────────────────
// tests/fixtures/auc24-table.json: 24 rows of {manifestIndex, contentHash,
// seed, intactHealth, degradedHealth} plus a header carrying the git SHA, the
// date, the manifest's content hash, the manifest's script count, and the
// computed AUC. NUMBERS AND HASHES ONLY — no title, no filename, no line of
// screenplay text ever reaches this file. It is the same shape the repo has
// committed without incident since the corpus existed
// (tests/fixtures/real-corpus-manifest.json: 72 rows of hash + numbers).
//
// ── Why it exists ──────────────────────────────────────────────────────────
// The AUC-24 ratchet is asserted only in tests/core/real-script-corpus.test.ts,
// which is env-gated on REAL_SCRIPT_CORPUS_DIR and therefore SKIPS on every CI
// run — the corpus text is copyrighted and local-only, and mounting it via CI
// secrets was rejected. The project read that as "the AUC cannot be verified
// in CI." It does not follow: the AUC is a pure function of two arrays of
// numbers produced by a seeded, deterministic degradation, and numbers are not
// copyrighted text. With the table committed, tests/core/auc24-table.test.ts
// recomputes the statistic on every CI run and asserts it clears the floor.
//
// ── What this still does NOT prove ─────────────────────────────────────────
// CI cannot confirm the numbers came from the real corpus; a determined author
// could forge 48 plausible health values whose Mann-Whitney statistic lands on
// a claimed figure. That is a far higher bar than typing one number into prose
// (the 2026-08-08 fabricated-receipt shape), and every future change to the
// numbers is a reviewable diff — but it is not proof, and this header is the
// place that says so.
//
// ── Run ────────────────────────────────────────────────────────────────────
//   REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run lock-auc24
//
// Refuses to run with the env var unset (there is nothing to measure, and a
// fabricated table is the one outcome worse than no table). Exits non-zero if
// fewer than 24 manifest rows resolve to readable files, or if any of the 24
// local files' content hashes disagree with the manifest — a table locked
// against different bytes than the manifest describes is not reproducible by
// anyone else, and the fix is to re-lock the manifest first.
//
// A BELOW-FLOOR RESULT IS STILL WRITTEN. This script records; it does not
// enforce. If the measured AUC has fallen under AUC24_FLOOR, the table is
// written with the real number and a loud banner is printed — and
// tests/core/auc24-table.test.ts then fails the build on it. Suppressing the
// write would only hide the regression from the artifact that exists to show
// it.
//
// ── Structure ──────────────────────────────────────────────────────────────
// The measurement is an exported function, `lockAuc24`, taking every path it
// touches as an argument; `main()` binds it to the real repo paths and the
// real env var. tests/scripts/lock-auc24.test.ts drives the same function over
// a synthetic manifest and a synthetic corpus in a temp dir, so every guard
// and the happy path are covered on a machine with no corpus at all. That is
// how this lane could be finished honestly: the machinery is tested, and the
// one thing left is the owner's local run on real text.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import {
  AUC24_DEGRADATION,
  AUC24_FLOOR,
  AUC24_LOCK_COMMAND,
  AUC24_SUBSET,
  AUC24_TABLE_PATH,
  computeAuc,
  degradationSeed,
  shuffleDropDegrade,
} from './lib/auc.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Thrown for every refusal, so callers (main, tests) can distinguish a
 *  deliberate guard from a crash. `detail` lines are printed under the message. */
export class LockRefusal extends Error {
  constructor(message, detail = []) {
    super(message);
    this.name = 'LockRefusal';
    this.detail = detail;
  }
}

/**
 * Measure the AUC-24 subset and return the table object. Pure with respect to
 * the repo: every path comes in as an argument and nothing is written here.
 *
 * @param {object} opts
 * @param {string} opts.corpusDir          directory holding the screenplay text.
 * @param {string} opts.manifestPath       path to real-corpus-manifest.json (or a test double).
 * @param {number} [opts.subsetSize]       defaults to AUC24_SUBSET.
 * @param {(s:string)=>void} [opts.onProgress] per-script progress line.
 * @param {string} [opts.gitSha]           provenance; defaults to `git rev-parse HEAD`.
 * @returns {Promise<import('./lib/auc.ts').Auc24Table>}
 */
export async function lockAuc24(opts) {
  const {
    corpusDir,
    manifestPath,
    subsetSize = AUC24_SUBSET,
    onProgress = () => {},
    gitSha = readGitSha(),
  } = opts;

  if (!corpusDir) {
    throw new LockRefusal('REAL_SCRIPT_CORPUS_DIR is not set — refusing to run.', [
      'This script measures real screenplays; with no corpus there is nothing to',
      'measure, and writing a table of invented numbers would defeat the entire',
      'point of committing one.',
      '',
      `  ${AUC24_LOCK_COMMAND}`,
    ]);
  }
  if (!existsSync(corpusDir) || !statSync(corpusDir).isDirectory()) {
    throw new LockRefusal(`corpus dir "${corpusDir}" does not exist or is not a directory.`);
  }

  // The manifest selects the subset — its first `subsetSize` entries, in
  // committed array order. NEVER sorted, never regrouped: that order is what
  // "the 24-script subset" means, and re-ordering it silently measures a
  // different set of scripts against the same floor.
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const manifestHash = createHash('sha256').update(manifestBytes).digest('hex');
  if (!Array.isArray(manifest) || manifest.length < subsetSize) {
    throw new LockRefusal(
      `${manifestPath} has ${Array.isArray(manifest) ? manifest.length : 'no'} entries; `
      + `the AUC-${subsetSize} subset needs at least ${subsetSize}.`,
    );
  }
  const subset = manifest.slice(0, subsetSize);

  const missing = subset.filter((e) => !existsSync(path.join(corpusDir, e.file)));
  if (missing.length > 0) {
    throw new LockRefusal(
      `${missing.length} of the first ${subsetSize} manifest entries are not present in the corpus dir.`,
      [
        'The AUC statistic is defined over exactly those scripts; measuring a',
        'partial subset would produce a number that is not comparable to the floor.',
        `Missing (by content hash, never by title): ${missing.map((e) => e.contentHash.slice(0, 8)).join(', ')}`,
      ],
    );
  }

  const rows = [];
  const hashDrift = [];
  for (let i = 0; i < subset.length; i++) {
    const entry = subset[i];
    // Labels are content-hash prefixes, matching
    // tests/core/real-script-corpus.test.ts. A screenplay title has no
    // business in this script's stdout either.
    const label = `contentHash:${entry.contentHash.slice(0, 8)}`;
    onProgress(`scoring ${String(i + 1).padStart(2)}/${subset.length}  ${label}`);
    const text = readFileSync(path.join(corpusDir, entry.file), 'utf8');
    const intact = await runScriptDoctor(text);
    if (intact.contentHash !== entry.contentHash) {
      hashDrift.push(`  ${label} -> local ${(intact.contentHash ?? '').slice(0, 8)}`);
      continue;
    }
    const degraded = await runScriptDoctor(shuffleDropDegrade(text, entry.file));
    rows.push({
      manifestIndex: i,
      contentHash: entry.contentHash,
      seed: degradationSeed(entry.file),
      intactHealth: intact.health,
      degradedHealth: degraded.health,
    });
  }

  if (hashDrift.length > 0) {
    throw new LockRefusal(
      `${hashDrift.length} of the ${subsetSize} local files do not match their manifest content hash.`,
      [
        'The table would then describe bytes nobody else has. Re-lock the manifest',
        'first (see tests/fixtures/real-corpus-manifest.README.md), then re-run.',
        ...hashDrift,
      ],
    );
  }
  if (rows.length !== subsetSize) {
    throw new LockRefusal(`only ${rows.length} of ${subsetSize} rows resolved — refusing to write a partial table.`);
  }

  return {
    schemaVersion: 1,
    degradation: AUC24_DEGRADATION,
    floor: AUC24_FLOOR,
    measuredAuc: computeAuc(rows.map((r) => r.intactHealth), rows.map((r) => r.degradedHealth)),
    measuredAt: new Date().toISOString().slice(0, 10),
    gitSha,
    manifestHash,
    manifestScriptCount: manifest.length,
    rows,
  };
}

/** Provenance, not an input to the statistic: a checkout without git still
 *  produces a usable table, recorded honestly as unknown rather than guessed. */
function readGitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/** The exact bytes written: 2-space JSON with a trailing newline, so a
 *  re-lock produces a readable line-level diff rather than one long line. */
export function serializeTable(table) {
  return `${JSON.stringify(table, null, 2)}\n`;
}

async function main() {
  const manifestPath = path.join(REPO_ROOT, 'tests/fixtures/real-corpus-manifest.json');
  const tablePath = path.join(REPO_ROOT, AUC24_TABLE_PATH);
  const corpusDir = process.env.REAL_SCRIPT_CORPUS_DIR ?? '';

  console.log('='.repeat(72));
  console.log(`LOCKING AUC-${AUC24_SUBSET} TABLE — recipe ${AUC24_DEGRADATION.id}`);
  console.log('='.repeat(72));
  console.log(`corpus dir     : ${corpusDir || '(unset)'}`);
  console.log(`manifest       : ${path.relative(REPO_ROOT, manifestPath)}`);
  console.log(`output         : ${AUC24_TABLE_PATH}`);
  console.log(`floor          : ${AUC24_FLOOR}`);
  console.log('');

  let table;
  try {
    table = await lockAuc24({
      corpusDir,
      manifestPath,
      onProgress: (line) => process.stdout.write(`\r  ${line}   `),
    });
  } catch (err) {
    process.stdout.write('\r' + ' '.repeat(72) + '\r');
    if (!(err instanceof LockRefusal)) throw err;
    console.error(`\n[FATAL] ${err.message}`);
    for (const d of err.detail) console.error(`        ${d}`);
    console.error('        Nothing was written.\n');
    process.exit(1);
  }
  process.stdout.write('\r' + ' '.repeat(72) + '\r');

  writeFileSync(tablePath, serializeTable(table), 'utf8');

  const meanIntact = table.rows.reduce((s, r) => s + r.intactHealth, 0) / table.rows.length;
  const meanDegraded = table.rows.reduce((s, r) => s + r.degradedHealth, 0) / table.rows.length;
  console.log(`rows written         : ${table.rows.length}`);
  console.log(`manifest             : ${table.manifestScriptCount} entries, sha256 ${table.manifestHash.slice(0, 12)}…`);
  console.log(`mean intact health   : ${meanIntact.toFixed(2)}`);
  console.log(`mean degraded health : ${meanDegraded.toFixed(2)}`);
  console.log(`measured AUC-${AUC24_SUBSET}      : ${table.measuredAuc.toFixed(4)}`);
  console.log(`floor                : ${AUC24_FLOOR}`);
  console.log(`git SHA              : ${table.gitSha}`);
  console.log('');

  if (table.measuredAuc < AUC24_FLOOR) {
    console.log('!'.repeat(72));
    console.log(`BELOW FLOOR: ${table.measuredAuc.toFixed(4)} < ${AUC24_FLOOR}. The table was still written, with`);
    console.log('the real number — that is what the artifact is for. tests/core/auc24-table.test.ts');
    console.log('will now fail the build until the regression is fixed, or until the floor is');
    console.log('deliberately and visibly re-derived in scripts/lib/auc.ts.');
    console.log('!'.repeat(72));
  } else {
    console.log(`Wrote ${AUC24_TABLE_PATH}. Commit it: CI recomputes the AUC from these numbers`);
    console.log('on every run, and the corpus text never leaves your machine.');
    console.log('');
    console.log('Two follow-ups this run makes possible, both owner decisions:');
    console.log(`  1. append a MEASUREMENT_RECEIPTS.md entry citing AUC-${AUC24_SUBSET} ${table.measuredAuc.toFixed(4)};`);
    console.log(`  2. consider raising AUC24_FLOOR in scripts/lib/auc.ts to ${(table.measuredAuc - 0.05).toFixed(3)}`);
    console.log('     (measured minus the 0.05 margin) — the ratchet only ratchets if it moves.');
  }
  console.log('');
}

// Run only when invoked directly, so the test can import lockAuc24 without
// the CLI firing (and without needing the real corpus to exist).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
