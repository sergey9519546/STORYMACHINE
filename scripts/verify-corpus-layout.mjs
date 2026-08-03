#!/usr/bin/env node
// CORPUS LAYOUT VERIFICATION — pre-flight check before running any P1
// measurement against a local corpus directory. Referenced by
// docs/p1-benchmark/MEASUREMENT_RUNBOOK.md §1.3 (which named this script
// before it existed — see that section's own note). This is the script that
// makes the runbook's promise true.
//
// Checks, in order, each with a clear PASS/FAIL line:
//   1. corpus dir is set, exists, and is a directory
//   2. the split file is present and parses as a migrated (id-based) manifest
//   3. every manifest entry's id resolves to a present file in the corpus dir
//   4. each present file's content hash matches its manifest entry's
//      contentHash (byte-identity to what the manifest expects)
//   5. per-partition counts match the manifest's own recorded counts
//   6. the test-set lock verifies — see the relock-proof note below
//
// Exit code: 0 only if every check passes. Non-zero (1) on any failure, so
// this composes cleanly with `&&` in a maintainer's local pipeline.
//
// ============================================================================
// USAGE
// ============================================================================
//   node scripts/verify-corpus-layout.mjs --corpus-dir=<path> [--split-file=<path>]
//
// Options:
//   --corpus-dir=<path>   Required. Root of the local corpus (post-migration,
//                         post-rename: a flat directory of <id>.fountain
//                         files is what this script expects to check against;
//                         see scripts/migrate-corpus-ids.mjs --rename).
//   --split-file=<path>   Default: scripts/output/corpus-split.json
//   --manifest-file=<path> Also verify tests/fixtures/real-corpus-manifest.json.
//                         Default: tests/fixtures/real-corpus-manifest.json
//                         (checked automatically unless --no-manifest-check).
//   --no-manifest-check   Skip the real-corpus-manifest.json checks (useful
//                         if that corpus isn't on the machine being checked).
//
// NOTE ON PRE-MIGRATION MANIFESTS: this script assumes the MIGRATED schema
// (id, contentHash, file=<id>.fountain, ...) that scripts/migrate-corpus-ids.mjs
// produces. Run that script with --write first. A manifest still in the
// pre-migration (title-bearing `file`, no `id`/`contentHash` per corpus-split
// entry) shape fails check 2 immediately with a clear message rather than
// producing confusing downstream failures.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function computeContentHash(fountain) {
  return crypto.createHash('sha256').update(fountain.trim()).digest('hex');
}
function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function parseArgs(argv) {
  const out = { manifestCheck: true };
  for (const a of argv) {
    if (a.startsWith('--corpus-dir=')) out.corpusDir = a.slice('--corpus-dir='.length);
    else if (a.startsWith('--split-file=')) out.splitFile = a.slice('--split-file='.length);
    else if (a.startsWith('--manifest-file=')) out.manifestFile = a.slice('--manifest-file='.length);
    else if (a === '--no-manifest-check') out.manifestCheck = false;
    else if (a === '--help' || a === '-h') out.help = true;
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log('Usage: node scripts/verify-corpus-layout.mjs --corpus-dir=<path> [--split-file=<path>] [--manifest-file=<path>] [--no-manifest-check]');
  process.exit(0);
}

const SPLIT_FILE = args.splitFile ? path.resolve(args.splitFile) : path.join(REPO_ROOT, 'scripts/output/corpus-split.json');
const MANIFEST_FILE = args.manifestFile ? path.resolve(args.manifestFile) : path.join(REPO_ROOT, 'tests/fixtures/real-corpus-manifest.json');

let failures = 0;
function check(label, ok, detail) {
  const mark = ok ? '✓' : '✗'; // ✓ / ✗
  console.log(`${mark} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
  return ok;
}

console.log('═'.repeat(78));
console.log('CORPUS LAYOUT VERIFICATION');
console.log('═'.repeat(78));
console.log(`corpus dir   : ${args.corpusDir ?? '(not set)'}`);
console.log(`split file   : ${path.relative(REPO_ROOT, SPLIT_FILE)}`);
console.log('');

// ── Check 1: corpus dir ─────────────────────────────────────────────────
const corpusDirOk = !!args.corpusDir && fs.existsSync(args.corpusDir) && fs.statSync(args.corpusDir).isDirectory();
check('corpus dir set and readable', corpusDirOk, args.corpusDir ? '' : '(pass --corpus-dir=<path>)');
if (!corpusDirOk) {
  console.log(`\n${failures} check(s) FAILED. Stopping early — no corpus dir to verify against.`);
  process.exit(1);
}
const CORPUS_DIR = path.resolve(args.corpusDir);

// ── Check 2: split file present + migrated schema ───────────────────────
const splitExists = fs.existsSync(SPLIT_FILE);
check('split manifest present', splitExists);
if (!splitExists) {
  console.log(`\n${failures} check(s) FAILED.`);
  process.exit(1);
}
const split = JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8'));
const partitions = ['train', 'val', 'test', 'excluded'];
const allEntries = partitions.flatMap(p => (split[p] ?? []).map(e => ({ ...e, partition: p })));
const isMigrated = allEntries.length > 0 && allEntries.every(e => typeof e.id === 'string' && typeof e.contentHash === 'string');
check(
  'split manifest is migrated schema (id + contentHash present)',
  isMigrated,
  isMigrated ? '' : '— run `node scripts/migrate-corpus-ids.mjs --corpus-dir=... --write` first',
);
if (!isMigrated) {
  console.log(`\n${failures} check(s) FAILED. Cannot verify a pre-migration manifest's file layout.`);
  process.exit(1);
}

// ── Check 3 + 4: every entry resolves + content hash matches ────────────
let resolved = 0, hashOk = 0;
const resolveFailures = [];
const hashFailures = [];
for (const e of allEntries) {
  const full = path.join(CORPUS_DIR, e.file);
  if (!fs.existsSync(full)) {
    resolveFailures.push(e.file);
    continue;
  }
  resolved++;
  const raw = fs.readFileSync(full, 'utf-8');
  const h = computeContentHash(raw);
  if (h === e.contentHash) hashOk++;
  else hashFailures.push({ file: e.file, expected: e.contentHash, got: h });
}
check(
  `every manifest id resolves to a present file (${resolved}/${allEntries.length})`,
  resolveFailures.length === 0,
  resolveFailures.length > 0 ? `— ${resolveFailures.length} missing, e.g. ${resolveFailures.slice(0, 3).join(', ')}` : '',
);
check(
  `content hash matches for every present file (${hashOk}/${resolved})`,
  hashFailures.length === 0 && resolveFailures.length === 0,
  hashFailures.length > 0 ? `— ${hashFailures.length} mismatched, e.g. ${hashFailures[0].file}` : '',
);

// ── Check 5: partition counts match recorded counts ──────────────────────
const recordedCounts = split.counts ?? null;
let countsOk = true;
const countLines = [];
countLines.push('partition               | expected | found | status');
countLines.push('-'.repeat(50));
for (const p of ['train', 'val', 'test']) {
  const found = (split[p] ?? []).length;
  const expected = recordedCounts ? recordedCounts[p] : found;
  const ok = expected === found;
  if (!ok) countsOk = false;
  countLines.push(`${p.padEnd(24)}| ${String(expected).padStart(8)} | ${String(found).padStart(5)} | ${ok ? '✓' : '✗'}`);
}
const totalFound = ['train', 'val', 'test'].reduce((s, p) => s + (split[p] ?? []).length, 0);
const totalExpected = recordedCounts ? (recordedCounts.train + recordedCounts.val + recordedCounts.test) : totalFound;
countLines.push('-'.repeat(50));
countLines.push(`${'total'.padEnd(24)}| ${String(totalExpected).padStart(8)} | ${String(totalFound).padStart(5)} | ${totalExpected === totalFound ? '✓' : '✗'}`);
console.log('');
for (const l of countLines) console.log(l);
console.log('');
check('partition counts match manifest', countsOk && totalExpected === totalFound);

// ── Check 6: test-set lock verifies ──────────────────────────────────────
// Post-migration, the manifest carries testSetHashRelocked (computed by
// migrate-corpus-ids.mjs against the id-based flat filenames) alongside the
// ORIGINAL testSetHash (kept for audit trail, no longer verifiable here
// since the original filenames no longer exist post-rename). Verify against
// whichever lock the manifest declares as current.
const lockToVerify = split.testSetHashRelocked ?? split.testSetHash;
const testEntries = split.test ?? [];
const lockManifest = testEntries
  .map(t => {
    const full = path.join(CORPUS_DIR, t.file);
    if (!fs.existsSync(full)) return null;
    return `${t.file}:${fs.statSync(full).size}`;
  })
  .filter(Boolean)
  .sort()
  .join('\n');
const recomputedLock = sha256Hex(lockManifest);
const lockOk = !!lockToVerify && recomputedLock === lockToVerify;
console.log(`test set hash (manifest) : ${lockToVerify ?? '(none recorded)'}`);
console.log(`test set hash (recomputed): ${recomputedLock}`);
check('test set lock verifies', lockOk, lockOk ? '(locked)' : '(MISMATCH — see values above)');

// ── Optional: real-corpus-manifest.json ──────────────────────────────────
if (args.manifestCheck && fs.existsSync(MANIFEST_FILE)) {
  console.log('\n' + '─'.repeat(78));
  console.log('tests/fixtures/real-corpus-manifest.json');
  console.log('─'.repeat(78));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
  const manifestMigrated = manifest.length > 0 && manifest.every(e => typeof e.id === 'string' && typeof e.contentHash === 'string');
  check('real-corpus-manifest is migrated schema (id + contentHash present)', manifestMigrated,
    manifestMigrated ? '' : '— pre-migration manifest, or corpus not available; skipping file checks');
  if (manifestMigrated) {
    let mResolved = 0, mHashOk = 0;
    const mMissing = [], mHashFail = [];
    for (const e of manifest) {
      const full = path.join(CORPUS_DIR, e.file);
      if (!fs.existsSync(full)) { mMissing.push(e.file); continue; }
      mResolved++;
      const h = computeContentHash(fs.readFileSync(full, 'utf-8'));
      if (h === e.contentHash) mHashOk++; else mHashFail.push(e.file);
    }
    check(`every entry resolves (${mResolved}/${manifest.length})`, mMissing.length === 0,
      mMissing.length > 0 ? `— ${mMissing.length} missing` : '');
    check(`content hash matches (${mHashOk}/${mResolved})`, mHashFail.length === 0 && mMissing.length === 0,
      mHashFail.length > 0 ? `— ${mHashFail.length} mismatched` : '');
  }
}

console.log('\n' + '═'.repeat(78));
if (failures === 0) {
  console.log('corpus layout OK. Ready to measure.');
  process.exit(0);
} else {
  console.log(`${failures} check(s) FAILED. Do not run measurements against this layout.`);
  process.exit(1);
}
