#!/usr/bin/env node
// CORPUS ID MIGRATION — replace the title-bearing filenames the two
// authoritative corpus manifests carry today with opaque, content-derived
// `SM-<hash>` ids, so this public repo stops enumerating the titles of the
// private, copyrighted research corpus.
//
// HONESTY NOTE (do not remove, do not soften): this is de-identification and
// PROVENANCE HYGIENE ONLY. Replacing a filename with an opaque id does not
// change the underlying screenplay text's copyright status and does NOT make
// the corpus distributable. P1's "legally distributable benchmark"
// requirement (ROADMAP.md) is a separate, unresolved sourcing problem this
// script does not touch.
//
// ============================================================================
// THE ID SCHEME
// ============================================================================
// id = "SM-" + sha256(normalizeScreenplay(rawFileText)).hexdigest.slice(0, N)
//   - HASHED INPUT is the NORMALIZED text (server/nvm/analyze/
//     screenplay-normalizer.ts's normalizeScreenplay), not the raw bytes.
//     Normalization reconstructs proper Fountain structure from double-spaced
//     imports (see that file's header); it is a pure, deterministic function
//     of the raw text and is idempotent on already-clean input. Hashing the
//     normalized form means two byte-different-but-structurally-identical
//     extractions of the same script (e.g. a re-OCR'd PDF with different
//     whitespace) collapse to the SAME id — the id tracks the SCRIPT, not the
//     particular file bytes.
//   - N = 8 by default. Widened to 10 for EVERY id in the run (never mixed
//     widths) if any two DIFFERENT scripts collide on the 8-char prefix
//     (checked across the full set being migrated in one invocation).
//   - hex digits are lowercase (sha256 hexdigest's native form); the id is
//     therefore always `SM-[0-9a-f]{8}` or, post-widening, `SM-[0-9a-f]{10}`.
// Rationale (see docs/p1-benchmark/CORPUS_IDENTIFICATION.md for the full
// writeup): OPAQUE (no title/initials/length correlation — a hash carries no
// bytes of the input), STABLE (same script text always yields the same id,
// so re-running this script twice against an unchanged corpus is a no-op),
// and RECOVERABLE (if the private crosswalk this script also writes is ever
// lost, re-running this script against the corpus regenerates every id
// byte-for-byte — past measurements keyed by id never become unattributable).
//
// `contentHash` is a SEPARATE, already-existing field: the FULL sha256 of the
// RAW (untranslated) file text, trimmed — i.e. exactly
// server/nvm/analyze/doctor.ts's `computeContentHash`. It is reimplemented
// here (not imported) to avoid pulling doctor.ts's full rule-pass tree into a
// migration script; the one-line body is kept byte-identical to doctor.ts's
// (both are `sha256(text.trim()).hexdigest`; there is nothing else to keep
// in sync). Keeping contentHash on the RAW text (not the
// normalized text the id is derived from) is a deliberate compatibility
// decision: tests/core/real-script-corpus.test.ts's byte-identical / floor-
// only tier split already keys off `report.contentHash === entry.contentHash`
// where `report.contentHash` comes from doctor.ts's computeContentHash(raw
// fountain as given to it) — changing contentHash's basis to the normalized
// text would silently demote every entry from the exact tier to the floor
// tier without changing a single test's pass/fail outcome, which is exactly
// the kind of silent precision loss this project's CLAUDE.md warns about.
// `id` and `contentHash` therefore intentionally hash DIFFERENT inputs
// (normalized vs. raw) for DIFFERENT purposes (stable opaque identity vs.
// byte-identity to a locked expectation) — this is documented, not an
// oversight.
//
// ============================================================================
// WHAT THIS SCRIPT DOES NOT DO IN THIS CONTAINER
// ============================================================================
// The real corpus text (761 scripts for scripts/output/corpus-split.json, 72
// for tests/fixtures/real-corpus-manifest.json) is NOT present here — only 6
// CC0 reference scripts live in data/screenplays/, and none of them appear in
// either manifest. This script is therefore CORRECT AGAINST A REAL CORPUS DIR
// and VERIFIED END-TO-END against the 6 CC0 files plus synthetic fixtures,
// but it has NOT been run against the real 761/72-script corpora, and NEITHER
// COMMITTED MANIFEST has been rewritten with fabricated ids or hashes. That
// migration is the maintainer's local step — see "MAINTAINER COMMAND
// SEQUENCE" below and docs/p1-benchmark/CORPUS_IDENTIFICATION.md.
//
// ============================================================================
// USAGE
// ============================================================================
//   node scripts/migrate-corpus-ids.mjs --corpus-dir=<path> [options]
//
// Options:
//   --corpus-dir=<path>     Root of the LOCAL real corpus (required for any
//                           mode below except --help).
//   --target=split|manifest|both
//                           Which manifest(s) to migrate. Default: both.
//                             split    -> scripts/output/corpus-split.json
//                             manifest -> tests/fixtures/real-corpus-manifest.json
//   --write                 Actually write the migrated manifest file(s) (and
//                           the crosswalk). Default: dry run — prints the
//                           full plan (counts, sample ids, collisions, the
//                           re-lock proof) and writes nothing.
//   --crosswalk-out=<path>  Default: scripts/output/corpus-crosswalk.json
//   --id-width=8|10         Force a width instead of auto-detecting from
//                           collisions. Rarely needed.
//   --rename                Print the LOCAL RENAME plan (original path ->
//                           <id>.fountain in a flat directory). Dry run by
//                           default — prints the plan, touches nothing. If
//                           the split/manifest files are already migrated,
//                           original paths are recovered from the crosswalk
//                           (see --crosswalk) instead of re-reading them.
//   --rename-out=<path>     Flat directory the rename plan targets. Required
//                           with --rename.
//   --crosswalk=<path>      Crosswalk to read original paths from when
//                           planning a rename against an already-migrated
//                           manifest. Default: scripts/output/corpus-crosswalk.json
//   --apply-rename          Actually perform the renames planned by --rename.
//                           Requires --rename. Never deletes a source file
//                           without first verifying the just-written copy's
//                           content hash matches the source's.
//   --help                  Print this usage block and exit 0.
//
// MAINTAINER COMMAND SEQUENCE (the real migration, once you have the corpus):
//   1. Dry run, both manifests, sanity-check the plan:
//        node scripts/migrate-corpus-ids.mjs --corpus-dir=/path/to/corpus
//   2. Write the migrated manifests + crosswalk:
//        node scripts/migrate-corpus-ids.mjs --corpus-dir=/path/to/corpus --write
//   3. Verify the new layout resolves and hashes match:
//        node scripts/verify-corpus-layout.mjs --corpus-dir=/path/to/corpus \
//          --split-file=scripts/output/corpus-split.json
//   4. (Optional, recommended) Flatten + rename the local files so a local
//      `ls` enumerates nothing either. Run this AFTER step 2 — --rename
//      automatically recovers original paths from the crosswalk step 2
//      wrote once it detects the manifests are already migrated:
//        node scripts/migrate-corpus-ids.mjs --corpus-dir=/path/to/corpus \
//          --rename --rename-out=/path/to/corpus-flat
//        node scripts/migrate-corpus-ids.mjs --corpus-dir=/path/to/corpus \
//          --rename --rename-out=/path/to/corpus-flat --apply-rename
//   5. Re-run verify-corpus-layout.mjs against the flat dir; re-run the P1
//      measurement scripts pointed at it (see MEASUREMENT_RUNBOOK.md).
//   6. Commit ONLY the migrated corpus-split.json / real-corpus-manifest.json
//      (and this script's stdout as evidence, if you keep a paper trail).
//      NEVER commit corpus-crosswalk.json — it is gitignored by name; git
//      will refuse to add it under its default name unless forced.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_CROSSWALK_OUT = path.join(REPO_ROOT, 'scripts/output/corpus-crosswalk.json');

// ── computeContentHash: byte-identical reimplementation of
// server/nvm/analyze/doctor.ts's exported computeContentHash. Duplicated
// (not imported) so this script never pulls doctor.ts's full pass tree in
// just to hash a string. Keep this in sync with doctor.ts by inspection if
// that function ever changes (both are one-line: sha256 of the trimmed raw
// text; there is nothing else to keep in sync). ───────────────────────────
function computeContentHash(fountain) {
  return crypto.createHash('sha256').update(fountain.trim()).digest('hex');
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ── CLI ──────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { target: 'both', write: false, rename: false, applyRename: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--write') out.write = true;
    else if (a === '--rename') out.rename = true;
    else if (a === '--apply-rename') out.applyRename = true;
    else if (a.startsWith('--corpus-dir=')) out.corpusDir = a.slice('--corpus-dir='.length);
    else if (a.startsWith('--target=')) out.target = a.slice('--target='.length);
    else if (a.startsWith('--crosswalk-out=')) out.crosswalkOut = a.slice('--crosswalk-out='.length);
    else if (a.startsWith('--id-width=')) out.idWidth = Number(a.slice('--id-width='.length));
    else if (a.startsWith('--rename-out=')) out.renameOut = a.slice('--rename-out='.length);
    else if (a.startsWith('--split-file=')) out.splitFileOverride = a.slice('--split-file='.length);
    else if (a.startsWith('--manifest-file=')) out.manifestFileOverride = a.slice('--manifest-file='.length);
    else if (a.startsWith('--crosswalk=')) out.crosswalkIn = a.slice('--crosswalk='.length);
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const USAGE = `Usage: node scripts/migrate-corpus-ids.mjs --corpus-dir=<path> [options]
See this file's header comment for the full option list and the maintainer
command sequence. Quick reference:
  --target=split|manifest|both   (default: both)
  --write                        actually write manifests + crosswalk
  --crosswalk-out=<path>         default: scripts/output/corpus-crosswalk.json
  --id-width=8|10                force a width (normally auto-detected)
  --rename --rename-out=<path>   print (or, with --apply-rename, perform) the
                                  local flatten-and-rename plan
  --crosswalk=<path>              source of original paths for --rename once
                                  the manifest(s) are already migrated
`;

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
if (!['split', 'manifest', 'both'].includes(args.target)) {
  console.error(`Invalid --target=${args.target}. Use split|manifest|both.`);
  process.exit(2);
}
if (args.idWidth !== undefined && ![8, 10].includes(args.idWidth)) {
  console.error(`Invalid --id-width=${args.idWidth}. Use 8 or 10.`);
  process.exit(2);
}
if (args.applyRename && !args.rename) {
  console.error('--apply-rename requires --rename.');
  process.exit(2);
}
if (args.rename && !args.renameOut) {
  console.error('--rename requires --rename-out=<path>.');
  process.exit(2);
}
if (!args.corpusDir) {
  console.error('--corpus-dir=<path> is required. See --help.');
  process.exit(2);
}
// The two authoritative manifest paths. Overridable ONLY for this script's
// own self-test / verification runs (see docs/p1-benchmark/
// CORPUS_IDENTIFICATION.md's "verified by execution" section) — a normal
// maintainer run should never need --split-file/--manifest-file.
const SPLIT_FILE = args.splitFileOverride ? path.resolve(args.splitFileOverride) : path.join(REPO_ROOT, 'scripts/output/corpus-split.json');
const MANIFEST_FILE = args.manifestFileOverride ? path.resolve(args.manifestFileOverride) : path.join(REPO_ROOT, 'tests/fixtures/real-corpus-manifest.json');

const CORPUS_DIR = path.resolve(args.corpusDir);
if (!fs.existsSync(CORPUS_DIR) || !fs.statSync(CORPUS_DIR).isDirectory()) {
  console.error(`--corpus-dir "${CORPUS_DIR}" does not exist or is not a directory.`);
  process.exit(2);
}

// ── genre / origin extraction ───────────────────────────────────────────
// origin: 'crawl' scripts live under crawl/<genre>/... ; everything else is
// a flat 'root'-level file. This is the SAME split scripts/
// probe-animation-vs-live.mjs already uses to separate the animation-heavy
// legacy corpus from the mostly-live-action crawl (relFile.startsWith
// ('crawl/')) -- kept identical on purpose so that probe's live/animation
// classification survives migration. FIELD NAME CHOSEN: `origin`, values
// 'crawl' | 'root'. (Flagged in this migration's report for the probe's own
// fix, which is out of this script's ownership.)
function classify(relFile) {
  const isCrawl = relFile.startsWith('crawl/');
  const origin = isCrawl ? 'crawl' : 'root';
  const genre = isCrawl ? (relFile.split('/')[1] ?? null) : null;
  return { origin, genre };
}

// ── per-file identity computation ───────────────────────────────────────
function identify(relFile) {
  const full = path.join(CORPUS_DIR, relFile);
  if (!fs.existsSync(full)) {
    return { ok: false, relFile, reason: 'missing from corpus dir' };
  }
  const raw = fs.readFileSync(full, 'utf-8');
  const stat = fs.statSync(full);
  const normalized = normalizeScreenplay(raw);
  const idHashFull = sha256Hex(normalized);
  const contentHash = computeContentHash(raw);
  const { origin, genre } = classify(relFile);
  return {
    ok: true,
    relFile,
    size: stat.size,
    idHashFull,
    contentHash,
    origin,
    genre,
  };
}

// ── collision detection + width resolution ──────────────────────────────
// Two DIFFERENT scripts (different idHashFull) that share the same N-char
// prefix is a collision requiring a width bump for EVERY id in the run
// (never mixed widths). Two entries sharing the SAME full idHashFull is a
// distinct condition -- literal duplicate content -- reported separately,
// not treated as a collision (there is nothing to widen: the prefixes
// legitimately match because the underlying scripts are identical).
function resolveWidth(identified, forcedWidth) {
  const okEntries = identified.filter(e => e.ok);
  const byPrefix8 = new Map();
  for (const e of okEntries) {
    const p = e.idHashFull.slice(0, 8);
    if (!byPrefix8.has(p)) byPrefix8.set(p, new Set());
    byPrefix8.get(p).add(e.idHashFull);
  }
  const collisions = [...byPrefix8.entries()].filter(([, set]) => set.size > 1);
  const dupContentByHash = new Map();
  for (const e of okEntries) {
    if (!dupContentByHash.has(e.idHashFull)) dupContentByHash.set(e.idHashFull, []);
    dupContentByHash.get(e.idHashFull).push(e.relFile);
  }
  const duplicateContent = [...dupContentByHash.entries()].filter(([, files]) => files.length > 1);
  const width = forcedWidth ?? (collisions.length > 0 ? 10 : 8);
  return { width, collisions, duplicateContent };
}

function idFor(idHashFull, width) {
  return `SM-${idHashFull.slice(0, width)}`;
}

// ── crosswalk writer ────────────────────────────────────────────────────
// Refuses to write into a tracked location: the target path MUST resolve as
// git-ignored (checked via `git check-ignore`) before anything is written.
// This is the belt to .gitignore's suspenders -- a maintainer who deletes
// the .gitignore rule by accident still can't have this script write a
// trackable file.
function assertPathIsGitIgnored(absPath) {
  const rel = path.relative(REPO_ROOT, absPath);
  try {
    execFileSync('git', ['check-ignore', '-q', rel], { cwd: REPO_ROOT });
    return true; // exit 0 = ignored
  } catch (err) {
    if (err.status === 1) return false; // exit 1 = NOT ignored
    // Any other failure (git missing, not a repo, etc.) — fail closed.
    console.error(`  git check-ignore could not run (${err.message}); refusing to write ${rel} as a safety default.`);
    return false;
  }
}

function writeCrosswalk(outPath, records) {
  if (!assertPathIsGitIgnored(outPath)) {
    console.error(`\n[REFUSED] ${path.relative(REPO_ROOT, outPath)} is NOT covered by .gitignore.`);
    console.error('  The crosswalk maps ids back to original titles/paths and must NEVER be');
    console.error('  committed. Add a gitignore rule for it (see .gitignore\'s corpus-crosswalk');
    console.error('  entry) or pass --crosswalk-out to a path that is already ignored.');
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // FORMAT CONTRACT: a plain JSON ARRAY of {id, path, title, contentHash, ...}
  // records — this is the exact shape scripts/deidentify-outputs.mjs already
  // documents and parses (its loadCrosswalk() branches on Array.isArray).
  // JSON has no comment syntax, so the "DO NOT COMMIT" warning can't live
  // inside this array without breaking that contract (wrapping it in a
  // metadata object would make deidentify-outputs.mjs mis-parse it as the
  // alternate flat-object-map shape). The warning instead lives in: this
  // generator's own header, the .gitignore entry it depends on, this
  // function's write-time console output, and a sibling marker file next to
  // the crosswalk itself.
  fs.writeFileSync(outPath, JSON.stringify(records, null, 2) + '\n', 'utf-8');
  const markerPath = outPath + '.DO-NOT-COMMIT.txt';
  fs.writeFileSync(
    markerPath,
    `${path.basename(outPath)} maps de-identified SM-<hash> ids back to this private\n` +
    'corpus\'s original paths/titles for the maintainer\'s own local audit.\n' +
    'IT MUST NEVER BE COMMITTED. It is gitignored by name (see .gitignore); if you\n' +
    'rename it, add a matching gitignore rule before touching it again.\n' +
    `Generated by scripts/migrate-corpus-ids.mjs at ${new Date().toISOString()}.\n`,
    'utf-8',
  );
  console.log(`  wrote crosswalk: ${path.relative(REPO_ROOT, outPath)} (${records.length} records, gitignored)`);
  console.log(`  wrote marker   : ${path.relative(REPO_ROOT, markerPath)}`);
}

// ── migrate: scripts/output/corpus-split.json ───────────────────────────
function migrateSplit(width, crosswalkRecords) {
  if (!fs.existsSync(SPLIT_FILE)) {
    console.error(`  [split] ${SPLIT_FILE} not found — skipping.`);
    return null;
  }
  const current = JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8'));
  const partitions = ['train', 'val', 'test', 'excluded'];
  const missing = [];
  const migrated = {};
  const newTestLockLines = []; // `${newFile}:${size}` for the RE-LOCKED hash

  // INDEPENDENT "before" pass over the ORIGINAL test-set file list, computed
  // BEFORE any migration — this is deliberately its own read/hash pass (not
  // reused from the migration loop below) so the relock proof is a real
  // cross-check, not an identity that's true by construction.
  const beforeTestContentHashes = (current.test ?? [])
    .map(t => {
      const full = path.join(CORPUS_DIR, t.file);
      if (!fs.existsSync(full)) return null;
      return computeContentHash(fs.readFileSync(full, 'utf-8'));
    })
    .filter(Boolean);

  for (const part of partitions) {
    const arr = Array.isArray(current[part]) ? current[part] : [];
    const outArr = [];
    for (const entry of arr) {
      const info = identify(entry.file);
      if (!info.ok) {
        missing.push({ partition: part, file: entry.file, reason: info.reason });
        continue;
      }
      const id = idFor(info.idHashFull, width);
      const newFile = `${id}.fountain`;
      outArr.push({
        id,
        contentHash: info.contentHash,
        genre: info.genre,
        origin: info.origin,
        sceneCount: entry.sceneCount,
        wordCount: entry.wordCount,
        partition: part,
        file: newFile, // de-identified flat filename — see --rename mode
      });
      crosswalkRecords.push({
        id,
        path: entry.file,
        title: path.basename(entry.file).replace(/\.(fountain\.txt|fountain|txt)$/i, ''),
        contentHash: info.contentHash,
        partition: part,
      });
      if (part === 'test') {
        newTestLockLines.push(`${newFile}:${info.size}`);
      }
    }
    migrated[part] = outArr;
  }

  // Re-lock proof: the test-set membership must be UNCHANGED (same scripts,
  // by content) even though the lock VALUE necessarily changes (it hashes
  // filename+size, and renaming changes the filename — see this script's
  // header + CLAUDE.md's "protocol-sensitive" note on
  // scripts/split-corpus.mjs:120-132). Proof: compare the INDEPENDENTLY
  // computed "before" content-hash multiset (above, read straight from
  // current.test's original paths) against the "after" multiset (each
  // migrated.test entry's freshly computed contentHash) — sorted-array
  // equality, not identity, so a real bug (e.g. accidental reordering or a
  // dropped/duplicated entry) would be caught here.
  const afterTestContentHashes = migrated.test.map(t => t.contentHash);
  const sortedBefore = [...beforeTestContentHashes].sort();
  const sortedAfter = [...afterTestContentHashes].sort();
  const multisetMatches =
    sortedBefore.length === sortedAfter.length &&
    sortedBefore.every((h, i) => h === sortedAfter[i]);

  const oldLockManifest = (current.test ?? [])
    .map(t => {
      const full = path.join(CORPUS_DIR, t.file);
      if (!fs.existsSync(full)) return null;
      const size = fs.statSync(full).size;
      return `${t.file}:${size}`;
    })
    .filter(Boolean)
    .sort()
    .join('\n');
  const oldLockRecomputed = sha256Hex(oldLockManifest);
  const newLockManifest = [...newTestLockLines].sort().join('\n');

  const out = {
    ...current,
    idScheme: {
      algorithm: 'SM-<hash>: sha256(normalizeScreenplay(rawFileText)).hexdigest.slice(0, width)',
      width,
      contentHashAlgorithm: 'sha256(rawFileText.trim()).hexdigest — matches server/nvm/analyze/doctor.ts computeContentHash',
    },
    migratedAt: new Date().toISOString(),
    testSetHash: current.testSetHash, // OLD lock, preserved for audit trail
    testSetHashRelocked: oldLockRecomputed === current.testSetHash ? sha256Hex(newLockManifest) : null,
    testSetRelockProof: {
      note: 'The lock (scripts/split-corpus.mjs:120-132) is filename+size based, so renaming test-set files NECESSARILY changes it. This is NOT evidence the test set changed. Proof of an unchanged test set is the multiset of contentHash values below, which is independent of filename.',
      oldLockValue: current.testSetHash,
      oldLockRecomputedFromDisk: oldLockRecomputed,
      oldLockStillValid: oldLockRecomputed === current.testSetHash,
      newLockValue: sha256Hex(newLockManifest),
      testSetSize: sortedBefore.length,
      contentHashMultisetMatches: multisetMatches,
    },
    train: migrated.train,
    val: migrated.val,
    test: migrated.test,
    excluded: migrated.excluded,
  };

  return { out, missing, counts: { train: migrated.train.length, val: migrated.val.length, test: migrated.test.length, excluded: migrated.excluded.length } };
}

// ── migrate: tests/fixtures/real-corpus-manifest.json ───────────────────
// ORDER IS LOAD-BEARING (tests/core/real-script-corpus.test.ts computes its
// enforced AUC-24 ratchet as MANIFEST.slice(0, 24)) — this function maps the
// array in place, one-to-one, and never sorts/dedupes/regroups it.
function migrateManifest(width, crosswalkRecords) {
  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error(`  [manifest] ${MANIFEST_FILE} not found — skipping.`);
    return null;
  }
  const current = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
  const missing = [];
  const hashDrift = [];
  const out = [];
  for (const entry of current) {
    const info = identify(entry.file);
    if (!info.ok) {
      missing.push({ file: entry.file, reason: info.reason });
      out.push(null); // preserve index; caller must treat null as unmigratable
      continue;
    }
    if (info.contentHash !== entry.contentHash) {
      hashDrift.push({ file: entry.file, was: entry.contentHash, now: info.contentHash });
    }
    const id = idFor(info.idHashFull, width);
    const newFile = `${id}.fountain`;
    out.push({
      id,
      contentHash: info.contentHash,
      genre: info.genre,
      origin: info.origin,
      health: entry.health,
      verdict: entry.verdict,
      sceneCount: entry.sceneCount,
      file: newFile,
    });
    crosswalkRecords.push({
      id,
      path: entry.file,
      title: entry.name ?? path.basename(entry.file).replace(/\.(fountain\.txt|fountain|txt)$/i, ''),
      contentHash: info.contentHash,
    });
  }
  return { out, missing, hashDrift, orderPreserved: current.length === out.length };
}

// ── local rename mode ────────────────────────────────────────────────────
// SOURCING NOTE: this must work regardless of whether --write has already
// run. Pre-migration, corpus-split.json / real-corpus-manifest.json's `file`
// fields ARE the original paths, so they're read directly. Post-migration,
// `file` has already been rewritten to `<id>.fountain` (the id-based name
// this very rename plan is trying to PRODUCE) — reading it again would ask
// "where is <id>.fountain" against a corpus dir that doesn't have it yet,
// which is exactly the bug this comment exists to prevent. So: once a
// manifest looks migrated (an `id` field is present), original paths are
// recovered from the crosswalk this script's own --write step already
// generated (`--crosswalk=<path>`, default scripts/output/corpus-crosswalk.json)
// instead of from the manifest.
function planRename() {
  const plan = [];
  const sources = new Set();
  let usedCrosswalk = false;

  const splitIsMigrated = fs.existsSync(SPLIT_FILE) && (JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8')).train ?? []).some(e => typeof e.id === 'string');
  const manifestIsMigrated = fs.existsSync(MANIFEST_FILE) && JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8')).some(e => typeof e.id === 'string');

  if (splitIsMigrated || manifestIsMigrated) {
    const crosswalkPath = args.crosswalkIn ? path.resolve(args.crosswalkIn) : DEFAULT_CROSSWALK_OUT;
    if (!fs.existsSync(crosswalkPath)) {
      console.error(`\n[FATAL] the split/manifest file(s) are already migrated (id-based \`file\`),`);
      console.error(`  but no crosswalk was found at ${path.relative(REPO_ROOT, crosswalkPath)} to recover the`);
      console.error('  original paths from. Re-run with --crosswalk=<path> pointing at the');
      console.error('  crosswalk your earlier `--write` run produced.');
      process.exit(1);
    }
    const records = JSON.parse(fs.readFileSync(crosswalkPath, 'utf-8'));
    for (const r of records) sources.add(r.path);
    usedCrosswalk = true;
  } else {
    if (fs.existsSync(SPLIT_FILE)) {
      const split = JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8'));
      for (const part of ['train', 'val', 'test', 'excluded']) {
        for (const e of split[part] ?? []) sources.add(e.file);
      }
    }
    if (fs.existsSync(MANIFEST_FILE)) {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
      for (const e of manifest) sources.add(e.file);
    }
  }
  console.log(`source of original paths: ${usedCrosswalk ? 'crosswalk (manifests already migrated)' : 'split/manifest files (pre-migration)'}`);
  const identified = [...sources].map(identify);
  const { width, collisions, duplicateContent } = resolveWidth(identified, args.idWidth);
  for (const info of identified) {
    if (!info.ok) continue;
    const id = idFor(info.idHashFull, width);
    plan.push({ from: path.join(CORPUS_DIR, info.relFile), to: path.join(args.renameOut, `${id}.fountain`), id, size: info.size, contentHash: info.contentHash });
  }
  return { plan, width, collisions, duplicateContent, missing: identified.filter(e => !e.ok) };
}

function executeRename(plan) {
  fs.mkdirSync(args.renameOut, { recursive: true });
  let renamed = 0, skipped = 0;
  for (const item of plan) {
    if (fs.existsSync(item.to)) {
      // Already present — verify it's the SAME content before treating as done.
      const existingHash = computeContentHash(fs.readFileSync(item.to, 'utf-8'));
      if (existingHash === item.contentHash) {
        skipped++;
        continue;
      }
      console.error(`  [CONFLICT] ${item.to} already exists with DIFFERENT content — refusing to overwrite. Skipping ${item.from}.`);
      continue;
    }
    const raw = fs.readFileSync(item.from, 'utf-8');
    fs.writeFileSync(item.to, raw, 'utf-8');
    // Never delete the source without first verifying the just-written copy
    // by content hash.
    const writtenRaw = fs.readFileSync(item.to, 'utf-8');
    const writtenHash = computeContentHash(writtenRaw);
    if (writtenHash !== item.contentHash) {
      console.error(`  [VERIFY FAILED] ${item.to} did not verify against ${item.from} — leaving source untouched, removing bad copy.`);
      fs.unlinkSync(item.to);
      continue;
    }
    fs.unlinkSync(item.from);
    renamed++;
  }
  return { renamed, skipped };
}

// ── main ─────────────────────────────────────────────────────────────────
function main() {
  console.log('═'.repeat(78));
  console.log('CORPUS ID MIGRATION');
  console.log('═'.repeat(78));
  console.log(`corpus dir : ${CORPUS_DIR}`);
  console.log(`target     : ${args.target}`);
  console.log(`mode       : ${args.write ? 'WRITE' : 'DRY RUN (pass --write to actually write files)'}`);

  if (args.rename) {
    console.log('\n── LOCAL RENAME PLAN ──────────────────────────────────────────────────');
    const { plan, width, collisions, duplicateContent, missing } = planRename();
    console.log(`id width       : ${width}${collisions.length > 0 ? '  (widened — collision detected)' : ''}`);
    console.log(`files planned  : ${plan.length}`);
    console.log(`missing        : ${missing.length}`);
    if (duplicateContent.length > 0) {
      console.log(`duplicate content groups (same script, multiple paths): ${duplicateContent.length}`);
    }
    if (collisions.length > 0) {
      console.error(`\n[COLLISION] ${collisions.length} 8-char id prefix(es) shared by different scripts — widened to 10.`);
      for (const [prefix, set] of collisions) console.error(`  prefix ${prefix}: ${set.size} distinct scripts`);
    }
    console.log('\nplan (first 10 shown):');
    for (const item of plan.slice(0, 10)) {
      console.log(`  ${item.from} -> ${item.to}`);
    }
    if (plan.length > 10) console.log(`  ... and ${plan.length - 10} more`);
    if (!args.applyRename) {
      console.log('\nDRY RUN — no files were touched. Pass --apply-rename to perform this plan.');
    } else {
      console.log(`\nAPPLYING rename plan to ${args.renameOut} ...`);
      const { renamed, skipped } = executeRename(plan);
      console.log(`renamed: ${renamed}  |  already-present (verified, skipped): ${skipped}`);
    }
    return;
  }

  // ── manifest migration (id/contentHash rewrite) ─────────────────────────
  const wantSplit = args.target === 'split' || args.target === 'both';
  const wantManifest = args.target === 'manifest' || args.target === 'both';

  // Pre-pass: gather every relFile referenced by the targets in scope so
  // collision detection runs over the FULL combined set, per this script's
  // header contract.
  const allRelFiles = new Set();
  if (wantSplit && fs.existsSync(SPLIT_FILE)) {
    const split = JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8'));
    for (const part of ['train', 'val', 'test', 'excluded']) {
      for (const e of split[part] ?? []) allRelFiles.add(e.file);
    }
  }
  if (wantManifest && fs.existsSync(MANIFEST_FILE)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
    for (const e of manifest) allRelFiles.add(e.file);
  }
  console.log(`\nresolving ${allRelFiles.size} referenced file(s) against the corpus dir...`);
  const identified = [...allRelFiles].map(identify);
  const missingUpfront = identified.filter(e => !e.ok);
  if (missingUpfront.length > 0) {
    console.log(`  ${missingUpfront.length} file(s) not found in corpus dir (reported per-target below).`);
  }
  const { width, collisions, duplicateContent } = resolveWidth(identified, args.idWidth);
  console.log(`id width resolved: ${width}${collisions.length > 0 ? '  *** COLLISION DETECTED, WIDENED ***' : ' (no collisions)'}`);
  if (collisions.length > 0) {
    console.error(`\n[COLLISION] ${collisions.length} 8-char prefix(es) shared by different scripts:`);
    for (const [prefix, set] of collisions) console.error(`  ${prefix}: ${set.size} distinct scripts`);
  }
  if (duplicateContent.length > 0) {
    console.log(`\n[INFO] ${duplicateContent.length} group(s) of literal duplicate content (same script under multiple paths):`);
    for (const [, files] of duplicateContent.slice(0, 5)) console.log(`  ${files.join('  ==  ')}`);
  }

  const crosswalkRecords = [];
  let splitResult = null, manifestResult = null;

  if (wantSplit) {
    console.log('\n── scripts/output/corpus-split.json ──────────────────────────────────');
    splitResult = migrateSplit(width, crosswalkRecords);
    if (splitResult) {
      console.log(`  migrated counts: train=${splitResult.counts.train} val=${splitResult.counts.val} test=${splitResult.counts.test} excluded=${splitResult.counts.excluded}`);
      console.log(`  missing: ${splitResult.missing.length}`);
      if (splitResult.missing.length > 0) {
        for (const m of splitResult.missing.slice(0, 5)) console.log(`    [${m.partition}] ${m.file}: ${m.reason}`);
        if (splitResult.missing.length > 5) console.log(`    ... and ${splitResult.missing.length - 5} more`);
      }
      const proof = splitResult.out.testSetRelockProof;
      console.log(`  test-set relock proof:`);
      console.log(`    old lock (committed)      : ${proof.oldLockValue}`);
      console.log(`    old lock (recomputed here): ${proof.oldLockRecomputedFromDisk}  ${proof.oldLockStillValid ? '(matches — corpus dir has the same original files)' : '(MISMATCH — corpus dir differs from what produced the committed lock)'}`);
      console.log(`    new lock (post-rename ids): ${proof.newLockValue}`);
      console.log(`    test-set size              : ${proof.testSetSize}`);
      console.log(`    contentHash multiset match : ${proof.contentHashMultisetMatches ? `YES — same ${proof.testSetSize} scripts, by content, before and after` : 'NO — INVESTIGATE, this should never happen'}`);
    }
  }

  if (wantManifest) {
    console.log('\n── tests/fixtures/real-corpus-manifest.json ──────────────────────────');
    manifestResult = migrateManifest(width, crosswalkRecords);
    if (manifestResult) {
      const migratable = manifestResult.out.filter(Boolean).length;
      console.log(`  entries: ${manifestResult.out.length}  |  migratable: ${migratable}  |  missing: ${manifestResult.missing.length}`);
      console.log(`  order preserved: ${manifestResult.orderPreserved} (array is never sorted/deduped/regrouped)`);
      if (manifestResult.hashDrift.length > 0) {
        console.log(`  [WARN] contentHash drift vs. committed manifest on ${manifestResult.hashDrift.length} entr(ies) — local files differ from what locked the health/verdict/sceneCount expectations:`);
        for (const d of manifestResult.hashDrift.slice(0, 5)) console.log(`    ${d.file}: was ${d.was.slice(0, 12)}... now ${d.now.slice(0, 12)}...`);
      }
      if (manifestResult.missing.length > 0) {
        for (const m of manifestResult.missing.slice(0, 5)) console.log(`    ${m.file}: ${m.reason}`);
      }
    }
  }

  if (!args.write) {
    console.log('\nDRY RUN — no files were written. Pass --write to write the migrated manifest(s) + crosswalk.');
    return;
  }

  console.log('\n── writing ─────────────────────────────────────────────────────────────');
  // Validate EVERYTHING before writing ANYTHING — a refusal (bad gitignore
  // coverage, unmigratable manifest gaps) must never leave the committed
  // manifests overwritten while the crosswalk that explains them was never
  // written. All guard checks run first; only then do the writes happen.
  if (manifestResult && manifestResult.out.some(e => e === null)) {
    console.error('  [ABORTED] real-corpus-manifest.json has unmigratable (missing-file) entries — refusing to write a manifest with gaps. Fix the corpus dir and re-run. Nothing was written.');
    process.exit(1);
  }
  const crosswalkOut = args.crosswalkOut ? path.resolve(args.crosswalkOut) : DEFAULT_CROSSWALK_OUT;
  if (!assertPathIsGitIgnored(crosswalkOut)) {
    console.error(`\n[REFUSED] ${crosswalkOut} is NOT covered by .gitignore.`);
    console.error('  The crosswalk maps ids back to original titles/paths and must NEVER be');
    console.error('  committed. Add a gitignore rule for it (see .gitignore\'s corpus-crosswalk');
    console.error('  entry) or pass --crosswalk-out to a path that is already ignored.');
    console.error('  Nothing was written (manifests included) — fix this and re-run.');
    process.exit(1);
  }

  if (splitResult) {
    fs.writeFileSync(SPLIT_FILE, JSON.stringify(splitResult.out, null, 2) + '\n', 'utf-8');
    console.log(`  wrote ${path.relative(REPO_ROOT, SPLIT_FILE)}`);
  }
  if (manifestResult) {
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifestResult.out, null, 2) + '\n', 'utf-8');
    console.log(`  wrote ${path.relative(REPO_ROOT, MANIFEST_FILE)}`);
  }
  writeCrosswalk(crosswalkOut, crosswalkRecords);

  console.log('\nDone. Next: node scripts/verify-corpus-layout.mjs --corpus-dir=' + CORPUS_DIR + ' --split-file=' + path.relative(REPO_ROOT, SPLIT_FILE));
}

main();
