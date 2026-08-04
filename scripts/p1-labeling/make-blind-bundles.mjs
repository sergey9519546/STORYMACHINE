#!/usr/bin/env node
// MAKE BLIND BUNDLES — turns a corpus manifest + local corpus text into
// per-reader labeling bundles for the P1 human-labeling round (ADR-002,
// PRE_REGISTRATION_PROTOCOL.md §3).
//
// For each reader this produces: the screenplays assigned to them, title
// pages and leading author/provenance lines stripped, in an
// independently-seeded randomized order (PRE_REGISTRATION_PROTOCOL.md §3
// "Randomize screenplay order (prevent order effects)"); a blank rating
// form (one section per script, in that reader's order); and reader
// instructions rendered from rubric.md. A root-level bundles-lock.json
// records exactly which blind id landed at which position for which
// reader, so the blinding is auditable after the fact without ever having
// exposed a title to a reader.
//
// ============================================================================
// SUPPORTED MANIFEST SHAPES
// ============================================================================
// Both shapes this repo produces are accepted (see lib/manifest.mjs and
// docs/p1-benchmark/CORPUS_IDENTIFICATION.md):
//   - scripts/output/corpus-split.json (train/val/test/excluded object)
//   - tests/fixtures/real-corpus-manifest.json (flat array)
// ...in EITHER their pre-migration (title-bearing `.file`, no `.id`) or
// post-migration (`.id`/`.contentHash` present) form. Pre-migration entries
// get an on-the-fly blind id computed the same way
// scripts/migrate-corpus-ids.mjs would (lib/blind-id.mjs) — a bundle built
// from a title-bearing manifest is exactly as blind as one built from an
// already-migrated one; the original path/title is never written anywhere
// under --out.
//
// ============================================================================
// SAFETY
// ============================================================================
// Refuses to run if --out is tracked by git or not covered by .gitignore
// (lib/git-guard.mjs) — labels and bundles must never be committed, the
// source corpus is not distributable (docs/p1-benchmark/
// CORPUS_IDENTIFICATION.md §0). Refuses to overwrite an existing bundle run
// (a bundles-lock.json already present at --out) unless --force is passed —
// readers may already be working from it.
//
// ============================================================================
// USAGE
// ============================================================================
//   node scripts/p1-labeling/make-blind-bundles.mjs \
//     --corpus-dir=/path/to/corpus \
//     --manifest=scripts/output/corpus-split.json \
//     --readers=R1,R2,R3 \
//     [--out=data/p1-labeling/bundles]   (default shown; already gitignored)
//     [--seed=42]                        (default; PRE_REGISTRATION_PROTOCOL's CORPUS_SPLIT_SEED)
//     [--partition=train|val|test|all]   (default: all, excludes 'excluded' always)
//     [--limit=N]                        (cap corpus size, e.g. for a pilot round)
//     [--id-width=8|10]                  (rarely needed; auto-detected otherwise)
//     [--include-draft-clarifications]   (see rubric.md — OFF by default on purpose)
//     [--force]                          (allow overwriting an existing bundle run)
//   node scripts/p1-labeling/make-blind-bundles.mjs --help

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest } from './lib/manifest.mjs';
import { stripPreamble } from './lib/strip-preamble.mjs';
import { seedFromString, seededShuffle } from './lib/rng.mjs';
import { assertSafeToWriteLabelData, REPO_ROOT } from './lib/git-guard.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.join(REPO_ROOT, 'data/p1-labeling/bundles');
const RUBRIC_PATH = path.join(__dirname, 'rubric.md');

const USAGE = `Usage: node scripts/p1-labeling/make-blind-bundles.mjs [options]

Required:
  --corpus-dir=<path>     Root of the local screenplay corpus text.
  --manifest=<path>       scripts/output/corpus-split.json or
                          tests/fixtures/real-corpus-manifest.json (or an
                          equivalent array-shaped manifest). Pre- or
                          post-migration schema, either is fine.
  --readers=R1,R2,...     Comma-separated reader ids. ADR-002 requires >=3
                          for a valid Fleiss' kappa round; fewer is allowed
                          here (e.g. for a pilot) with a printed warning.

Optional:
  --out=<path>            Output dir. Default: data/p1-labeling/bundles
                          (already covered by .gitignore's data/ rule).
  --seed=<int>            Base seed for per-reader order randomization.
                          Default: 42 (PRE_REGISTRATION_PROTOCOL's
                          CORPUS_SPLIT_SEED).
  --partition=train|val|test|all
                          Filter corpus-split.json-shaped manifests to one
                          AUC partition. Default: all (still excludes the
                          'excluded' partition, always). Ignored (with a
                          note) for flat manifests that carry no partition
                          field.
  --limit=<N>             Cap the corpus to the first N scripts (by blind
                          id, sorted — deterministic regardless of manifest
                          order or reader). Useful for a small pilot round.
  --id-width=8|10         Force an id width instead of auto-detecting from
                          hash collisions.
  --include-draft-clarifications
                          Render rubric.md's "Draft Clarifications" section
                          into reader instructions. OFF by default — see
                          that section's own header for why it must not
                          ship without decision-owner sign-off.
  --force                 Allow writing into an --out that already has a
                          bundles-lock.json from a previous run.
  --help                  Print this message and exit 0.
`;

function parseArgs(argv) {
  const out = { partition: 'all', seed: 42, includeDraft: false, force: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--force') out.force = true;
    else if (a === '--include-draft-clarifications') out.includeDraft = true;
    else if (a.startsWith('--corpus-dir=')) out.corpusDir = a.slice('--corpus-dir='.length);
    else if (a.startsWith('--manifest=')) out.manifest = a.slice('--manifest='.length);
    else if (a.startsWith('--readers=')) out.readers = a.slice('--readers='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
    else if (a.startsWith('--seed=')) out.seed = Number(a.slice('--seed='.length));
    else if (a.startsWith('--partition=')) out.partition = a.slice('--partition='.length);
    else if (a.startsWith('--limit=')) out.limit = Number(a.slice('--limit='.length));
    else if (a.startsWith('--id-width=')) out.idWidth = Number(a.slice('--id-width='.length));
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}

const problems = [];
if (!args.corpusDir) problems.push('--corpus-dir=<path> is required.');
if (!args.manifest) problems.push('--manifest=<path> is required.');
if (!args.readers || args.readers.length === 0) problems.push('--readers=R1,R2,... is required.');
if (!['train', 'val', 'test', 'all'].includes(args.partition)) problems.push(`--partition=${args.partition} invalid (train|val|test|all).`);
if (args.idWidth !== undefined && ![8, 10].includes(args.idWidth)) problems.push('--id-width must be 8 or 10.');
if (!Number.isFinite(args.seed)) problems.push('--seed must be a number.');
if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1)) problems.push('--limit must be a positive integer.');
if (problems.length > 0) {
  for (const p of problems) console.error(`ERROR: ${p}`);
  console.error('\n' + USAGE);
  process.exit(2);
}

const corpusDir = path.resolve(args.corpusDir);
if (!fs.existsSync(corpusDir) || !fs.statSync(corpusDir).isDirectory()) {
  console.error(`--corpus-dir "${corpusDir}" does not exist or is not a directory.`);
  process.exit(1);
}
const manifestPath = path.resolve(args.manifest);
if (!fs.existsSync(manifestPath)) {
  console.error(`--manifest "${manifestPath}" does not exist.`);
  process.exit(1);
}
const outDir = path.resolve(args.out ?? DEFAULT_OUT);

// ── Safety: refuse before doing any real work ───────────────────────────
assertSafeToWriteLabelData(outDir, { toolName: 'make-blind-bundles.mjs' });
const lockPath = path.join(outDir, 'bundles-lock.json');
if (fs.existsSync(lockPath) && !args.force) {
  console.error(`\n[REFUSED] ${path.relative(REPO_ROOT, outDir)} already has a bundles-lock.json from a previous run.`);
  console.error('  Readers may already be working from it. Pass --force to overwrite, or pick a');
  console.error('  fresh --out path for a new round. Nothing was written.');
  process.exit(1);
}
if (args.readers.length < 3) {
  console.warn(`\n[WARN] Only ${args.readers.length} reader(s) requested. ADR-002 requires >=3 independent`);
  console.warn('  readers for a valid Fleiss\' kappa round (ties cannot be resolved with 2). This');
  console.warn('  is fine for a pilot but the labeling round is not P1-gate-valid with < 3.');
}

// ── Load manifest, filter partition, resolve blind ids ──────────────────
const { entries, missing, shape, idWidth: resolvedWidth, excludedDroppedCount } = loadManifest({
  manifestPath,
  corpusDir,
  idWidth: args.idWidth,
});

let inScope = entries;
if (args.partition !== 'all') {
  if (shape !== 'split') {
    console.log(`[NOTE] --partition=${args.partition} ignored: manifest "${manifestPath}" is flat (no partition field).`);
  } else {
    inScope = inScope.filter((e) => e.partition === args.partition);
  }
}

// Deterministic base ordering (by blind id) BEFORE any --limit or per-reader
// shuffle, so --limit always selects the same subset regardless of the
// manifest's own row order.
inScope = inScope.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
if (args.limit !== undefined) inScope = inScope.slice(0, args.limit);

console.log('═'.repeat(78));
console.log('MAKE BLIND BUNDLES');
console.log('═'.repeat(78));
console.log(`corpus dir       : ${corpusDir}`);
console.log(`manifest         : ${manifestPath} (${shape} shape)`);
console.log(`id width         : ${resolvedWidth}`);
console.log(`partition filter : ${args.partition}`);
console.log(`excluded dropped : ${excludedDroppedCount} (manifest's own 'excluded' partition — never bundled)`);
console.log(`missing files    : ${missing.length}`);
if (missing.length > 0) {
  for (const m of missing.slice(0, 5)) console.log(`  ${m.file}: ${m.reason}`);
  if (missing.length > 5) console.log(`  ... and ${missing.length - 5} more`);
}
console.log(`scripts in scope : ${inScope.length}`);
console.log(`readers          : ${args.readers.join(', ')}`);
console.log(`base seed        : ${args.seed}`);

if (inScope.length === 0) {
  console.error('\n[ABORTED] Zero scripts in scope after filtering — nothing to bundle. Nothing was written.');
  process.exit(1);
}

// ── Load rubric, render instructions ─────────────────────────────────────
const rubricRaw = fs.readFileSync(RUBRIC_PATH, 'utf-8');
function renderRubricForReader() {
  if (args.includeDraft) return rubricRaw;
  const marker = '## Draft Clarifications';
  const idx = rubricRaw.indexOf(marker);
  if (idx === -1) return rubricRaw;
  return (
    rubricRaw.slice(0, idx) +
    '## Draft Clarifications\n\n' +
    '*(withheld — pass --include-draft-clarifications to render this section; ' +
    'see scripts/p1-labeling/rubric.md for why it is withheld by default)*\n'
  );
}

function renderInstructions(readerId, scriptCount) {
  return `# P1 Benchmark — Reader Instructions (${readerId})

This bundle contains ${scriptCount} screenplay(s) for you to rate
independently, per docs/adr/ADR-002-p1-benchmark-design.md and
docs/p1-benchmark/PRE_REGISTRATION_PROTOCOL.md §3.

## Before you start

- Do not discuss any screenplay with the other readers until ALL readers
  have submitted ALL ratings.
- Read the screenplays in \`scripts/\` in the numeric order they are named
  (\`01-...\`, \`02-...\`, ...) — that order has already been independently
  randomized for you and must not be reordered.
- Title pages and leading author/provenance text have been removed. If you
  believe you recognize a screenplay anyway, rate it normally and note the
  recognition in your justification (do not look it up or let outside
  knowledge about its reception substitute for your own read).

## What to submit

Fill in \`rating-form.md\` in this same folder — one section per screenplay,
already labeled with the id you'll see in that script's filename. Replace
\`TIER_LETTER\` with A, B, C, D, or ABSTAIN (if you genuinely cannot rate a
script — e.g. it fails to render), and \`JUSTIFICATION_TEXT\` with your 1-2
sentence justification. Do not edit anything else in the file (the script
id and Reader ID lines are used to validate your submission).

Return the completed \`rating-form.md\` to the study coordinator through
whatever channel they specified — this kit does not transmit anything for
you.

---

${renderRubricForReader()}
`;
}

// ── Build the rating form template ───────────────────────────────────────
// FORMAT CHOICE: Markdown, not CSV. Justification (recorded here and in
// docs/p1-benchmark/LABELING_KIT.md): the justification field is 1-2
// sentences of free text (PRE_REGISTRATION_PROTOCOL.md §3 "Labeling
// Procedure," step 4) that will routinely contain commas and quotes CSV
// would force into escaped/quoted cells; Markdown sections are also
// something a non-technical reader can open, read, and edit correctly in
// any text editor without a spreadsheet tool or CSV-quoting mistakes, and
// they diff cleanly if a coordinator needs to review changes. Parsing is
// still fully mechanical (see collect-labels.mjs) via a small fixed set of
// `Key: value` lines per section — this is "a per-script rating form"
// realized as one clearly delimited section per script inside a single
// per-reader file, rather than one file per script, so a reader is never
// juggling dozens of loose files for one bundle.
function renderRatingForm(readerId, order) {
  const lines = [];
  lines.push(`# P1 Benchmark — Rating Form`);
  lines.push('');
  lines.push(`Reader ID: ${readerId}`);
  lines.push(`Scripts assigned: ${order.length}`);
  lines.push('');
  lines.push('Fill in TIER_LETTER (A, B, C, D, or ABSTAIN) and JUSTIFICATION_TEXT for');
  lines.push('every section below. Do not edit the heading lines or the Reader ID line.');
  lines.push('');
  lines.push('---');
  lines.push('');
  order.forEach((item, idx) => {
    const n = String(idx + 1).padStart(2, '0');
    lines.push(`## Script ${n} — ${item.id}`);
    lines.push('');
    lines.push(`Reader ID: ${readerId}`);
    lines.push(`Tier (A/B/C/D/ABSTAIN): TIER_LETTER`);
    lines.push(`Justification (1-2 sentences): JUSTIFICATION_TEXT`);
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  return lines.join('\n');
}

// ── Write bundles ─────────────────────────────────────────────────────────
fs.mkdirSync(outDir, { recursive: true });
const lock = {
  generatedAt: new Date().toISOString(),
  tool: 'scripts/p1-labeling/make-blind-bundles.mjs',
  manifestFile: path.relative(REPO_ROOT, manifestPath),
  manifestShape: shape,
  corpusDir, // local-only metadata; this whole file is gitignored, never committed
  baseSeed: args.seed,
  idWidth: resolvedWidth,
  partitionFilter: args.partition,
  scriptsInScope: inScope.length,
  readers: {},
};

for (const readerId of args.readers) {
  const readerSeed = seedFromString(`${args.seed}:${readerId}`);
  const order = seededShuffle(inScope, readerSeed);

  const readerDir = path.join(outDir, `reader-${readerId}`);
  const scriptsDir = path.join(readerDir, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });

  const orderRecord = [];
  order.forEach((item, idx) => {
    const n = String(idx + 1).padStart(2, '0');
    const full = path.join(corpusDir, item.file);
    const raw = fs.readFileSync(full, 'utf-8');
    const { body, strippedTitlePage, strippedCommentLines } = stripPreamble(raw);
    const outFile = path.join(scriptsDir, `${n}-${item.id}.fountain`);
    fs.writeFileSync(outFile, body, 'utf-8');
    orderRecord.push({
      position: idx + 1,
      blindId: item.id,
      contentHash: item.contentHash,
      sourceRelFile: item.sourceRelFile,
      partition: item.partition,
      sceneCount: item.sceneCount,
      wordCount: item.wordCount,
      strippedTitlePage,
      strippedCommentLines,
    });
  });

  fs.writeFileSync(path.join(readerDir, 'instructions.md'), renderInstructions(readerId, order.length), 'utf-8');
  fs.writeFileSync(path.join(readerDir, 'rating-form.md'), renderRatingForm(readerId, order), 'utf-8');

  lock.readers[readerId] = { seed: readerSeed, order: orderRecord };
  console.log(`  wrote reader-${readerId}/ (${order.length} scripts, seed ${readerSeed})`);
}

fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
const markerPath = lockPath + '.DO-NOT-COMMIT.txt';
fs.writeFileSync(
  markerPath,
  'bundles-lock.json records which blind SM-<hash> id landed at which reading position for\n' +
  'which reader, plus (for pre-migration manifests) the original corpus-relative source path.\n' +
  'IT MUST NEVER BE COMMITTED, and neither must anything else in this directory — this whole\n' +
  'tree holds reader bundles and, once returned, human quality labels for a private corpus.\n' +
  `Generated by scripts/p1-labeling/make-blind-bundles.mjs at ${new Date().toISOString()}.\n`,
  'utf-8',
);

console.log(`\nwrote lock: ${path.relative(REPO_ROOT, lockPath)}`);
console.log(`wrote marker: ${path.relative(REPO_ROOT, markerPath)}`);
console.log(`\nDone. ${args.readers.length} reader bundle(s) written under ${path.relative(REPO_ROOT, outDir)}.`);
console.log('Next: hand each reader-<ID>/ folder to that reader. See docs/p1-benchmark/LABELING_KIT.md.');
