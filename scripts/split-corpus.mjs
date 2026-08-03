// CORPUS SPLITTER — produces a frozen train/validation/test partition of
// the real screenplay corpus, honoring the P1 pre-registration protocol
// (PRE_REGISTRATION_PROTOCOL.md §4): 60/20/20, fixed seed, hash the test
// set, never tune against the test set.
//
// Outputs two artifacts under scripts/output/:
//   corpus-split.json    — every script assigned to a partition + metadata
//   corpus-test-hash.txt — SHA-256 of the test-set manifest (the lock)
//
// Determinism: a fixed seed makes the split reproducible — anyone running
// this script gets the same partition. The test hash is published so any
// later claim that "the test set changed" is verifiable.
//
// Run:  node scripts/split-corpus.mjs

// Safety: the two writes at the end used to happen unconditionally, so
// re-running this against the local sample-only data/screenplays/ (instead
// of the full private corpus) would silently overwrite the committed
// 761-script split with a handful of entries (see
// scripts/lib/output-guard.mjs header for the incident this class of guard
// responds to). It now refuses to run against a missing/empty corpus dir,
// and refuses to shrink the committed corpus-split.json by more than half
// unless --force is passed. corpus-test-hash.txt is derived from the same
// corpus and is only written once that guard has passed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { requireCorpus, guardedWrite } from './lib/output-guard.mjs';

const SRC_DIR = 'data/screenplays';
const OUT_DIR = 'scripts/output';
const SPLIT_FILE = path.join(OUT_DIR, 'corpus-split.json');
const TEST_HASH_FILE = path.join(OUT_DIR, 'corpus-test-hash.txt');

if (!fs.existsSync(SRC_DIR)) {
  console.error(`ERROR: ${SRC_DIR} does not exist — refusing to run.`);
  console.error('This script requires the private research corpus locally (see MEASUREMENT_RUNBOOK.md). Nothing was written.');
  process.exit(1);
}

// Fixed seed per PRE_REGISTRATION_PROTOCOL §4 (CORPUS_SPLIT_SEED = 42).
const SEED = 42;
const TRAIN_FRAC = 0.60;
const VAL_FRAC = 0.20;
// test = remainder (0.20)

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Gather valid scripts (exclude parse-broken scene-count collapse) ────────
// We need sceneCount to be ≥5 for the structural degradations to be
// meaningful, so we exclude scripts below that floor at split time.
// This list is computed deterministically from the corpus, not hand-picked.
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';

// Recursively gather all .fountain / .fountain.txt files (the crawl corpus
// lives in subdirectories: data/screenplays/crawl/<genre>/)
function gatherFountain(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...gatherFountain(full));
    } else if (entry.name.endsWith('.fountain') || entry.name.endsWith('.fountain.txt')) {
      out.push(full);
    }
  }
  return out;
}

const allPaths = gatherFountain(SRC_DIR).sort();
requireCorpus(allPaths.length, {
  label: `${SRC_DIR} (.fountain/.fountain.txt files)`,
  hint: 'This script requires the private research corpus locally (see MEASUREMENT_RUNBOOK.md).',
});
// Store paths relative to SRC_DIR for the manifest
const allFiles = allPaths.map(p => path.relative(SRC_DIR, p).replace(/\\/g, '/'));

const valid = [];
const excluded = [];
for (const relFile of allFiles) {
  const text = fs.readFileSync(path.join(SRC_DIR, relFile), 'utf-8');
  const a = analyzeFountainText(text);
  if ((a.sceneCount ?? 0) >= 5) {
    valid.push({ file: relFile, sceneCount: a.sceneCount, wordCount: a.wordCount });
  } else {
    excluded.push({ file: relFile, reason: `sceneCount=${a.sceneCount} (<5)`, sceneCount: a.sceneCount });
  }
}

// ── Deterministic shuffle + split ──────────────────────────────────────────
const rng = mulberry32(SEED);
const shuffled = valid.slice();
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}

const n = shuffled.length;
const trainEnd = Math.floor(n * TRAIN_FRAC);
const valEnd = trainEnd + Math.floor(n * VAL_FRAC);

const train = shuffled.slice(0, trainEnd);
const val = shuffled.slice(trainEnd, valEnd);
const test = shuffled.slice(valEnd);

const assignPartition = (file) => {
  if (train.some(s => s.file === file)) return 'train';
  if (val.some(s => s.file === file)) return 'val';
  if (test.some(s => s.file === file)) return 'test';
  return 'excluded';
};

// ── Build split record ─────────────────────────────────────────────────────
const splitRecord = {
  generatedAt: new Date().toISOString(),
  seed: SEED,
  fracs: { train: TRAIN_FRAC, val: VAL_FRAC, test: 1 - TRAIN_FRAC - VAL_FRAC },
  counts: {
    total: allFiles.length,
    valid: valid.length,
    excluded: excluded.length,
    train: train.length,
    val: val.length,
    test: test.length,
  },
  testSetHash: '', // filled below
  train,
  val,
  test,
  excluded,
};

// ── Compute test-set lock hash (SHA-256 of sorted test file list + sizes) ──
// Per PRE_REGISTRATION_PROTOCOL §4: "Compute SHA-256 hash of test set manifest.
// Publish hash publicly." The hash covers the file NAMES and BYTE SIZES of the
// test partition so any later swap is detectable. It does NOT cover file
// contents (those are the scripts themselves, already in the repo).
const testManifest = test
  .map(t => {
    const stat = fs.statSync(path.join(SRC_DIR, t.file));
    return `${t.file}:${stat.size}`;
  })
  .sort()
  .join('\n');
const testHash = crypto.createHash('sha256').update(testManifest).digest('hex');
splitRecord.testSetHash = testHash;

// ── Write artifacts ────────────────────────────────────────────────────────
// corpus-test-hash.txt is derived from (and meaningless without) the split
// it locks, so it is written manually right after the guarded split write
// succeeds — guardedWrite() only protects the file path given to it, and
// gating a second, coupled write behind the first keeps them from drifting
// out of sync if the split write is ever refused.
fs.mkdirSync(OUT_DIR, { recursive: true });
let existingValidCount;
if (fs.existsSync(SPLIT_FILE)) {
  try {
    existingValidCount = JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8')).counts?.valid;
  } catch { /* malformed/missing existing file — let guardedWrite fall back to line counting */ }
}
guardedWrite(SPLIT_FILE, JSON.stringify(splitRecord, null, 2) + '\n', {
  rowCount: valid.length,
  existingRowCount: existingValidCount,
});
fs.writeFileSync(TEST_HASH_FILE, testHash + '\n', 'utf-8');

// ── Report ─────────────────────────────────────────────────────────────────
console.log('=== CORPUS SPLIT (P1 pre-registration protocol) ===');
console.log(`seed: ${SEED}  |  fracs: train ${TRAIN_FRAC} / val ${VAL_FRAC} / test ${(1 - TRAIN_FRAC - VAL_FRAC).toFixed(2)}`);
console.log(`valid: ${valid.length}  |  excluded (sceneCount < 5): ${excluded.length}`);
console.log(`train: ${train.length}  |  val: ${val.length}  |  test: ${test.length}`);
console.log(`test set hash: ${testHash}`);
console.log(`test files: ${test.map(t => t.file).join(', ')}`);
console.log(`\nWrote ${SPLIT_FILE}`);
console.log(`Wrote ${TEST_HASH_FILE}`);
console.log('\nDISCIPLINE: tune against train ONLY, check progress against val,');
console.log('evaluate ONCE on test at the end. The test hash locks the set.');

// ── Export a helper for downstream scripts ─────────────────────────────────
// Downstream measurement scripts import this to filter to a partition.
export function loadSplit() {
  return JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8'));
}

export function partitionFor(file) {
  return assignPartition(file);
}
