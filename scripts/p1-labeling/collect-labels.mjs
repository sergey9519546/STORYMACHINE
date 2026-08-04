#!/usr/bin/env node
// COLLECT LABELS — validates and aggregates completed rating-form.md files
// produced by make-blind-bundles.mjs into one labels-aggregate.json for
// compute-agreement.mjs.
//
// Validation performed (all must pass for a reader's form to be accepted):
//   - Schema: every expected "## Script NN — <blindId>" section is present,
//     each with a "Reader ID:", "Tier (...):", and "Justification...:" line
//     in the exact shape make-blind-bundles.mjs generated.
//   - Completeness: every blind id assigned to that reader (per
//     bundles-lock.json) has exactly one rated section; nothing missing,
//     nothing extra, nothing still carrying the unfilled placeholder text.
//   - Tier validity: A, B, C, D, or ABSTAIN (case-insensitive), never a
//     leftover "TIER_LETTER" placeholder.
//   - No duplicate reader/script pairs: refuses if the same reader id is
//     encountered from two different files, or the same blind id appears
//     twice within one reader's form.
//
// ============================================================================
// USAGE
// ============================================================================
//   node scripts/p1-labeling/collect-labels.mjs \
//     --bundles-dir=data/p1-labeling/bundles \
//     [--forms-dir=<path>]         (default: same as --bundles-dir — readers
//                                   fill in rating-form.md in place)
//     [--out=data/p1-labeling/labels-aggregate.json]   (default shown)
//     [--partial]                  (accept whatever readers are complete;
//                                   default: abort the whole run if ANY
//                                   assigned reader's form is incomplete)
//     [--force]                    (allow overwriting an existing aggregate)
//   node scripts/p1-labeling/collect-labels.mjs --help

import fs from 'node:fs';
import path from 'node:path';
import { assertSafeToWriteLabelData, REPO_ROOT } from './lib/git-guard.mjs';

const DEFAULT_OUT_REL = 'data/p1-labeling/labels-aggregate.json';

const USAGE = `Usage: node scripts/p1-labeling/collect-labels.mjs [options]

Required:
  --bundles-dir=<path>    The --out directory a prior make-blind-bundles.mjs
                          run wrote (must contain bundles-lock.json).

Optional:
  --forms-dir=<path>      Where to look for reader-<ID>/rating-form.md.
                          Default: same as --bundles-dir.
  --out=<path>            Aggregate output path.
                          Default: ${DEFAULT_OUT_REL}
  --partial               Accept whatever readers submitted complete forms;
                          incomplete readers are reported and skipped
                          instead of aborting the whole run.
  --force                 Allow overwriting an existing --out file.
  --help                  Print this message and exit 0.
`;

function parseArgs(argv) {
  const out = { partial: false, force: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--partial') out.partial = true;
    else if (a === '--force') out.force = true;
    else if (a.startsWith('--bundles-dir=')) out.bundlesDir = a.slice('--bundles-dir='.length);
    else if (a.startsWith('--forms-dir=')) out.formsDir = a.slice('--forms-dir='.length);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
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
if (!args.bundlesDir) {
  console.error('ERROR: --bundles-dir=<path> is required.\n');
  console.error(USAGE);
  process.exit(2);
}

const bundlesDir = path.resolve(args.bundlesDir);
const formsDir = path.resolve(args.formsDir ?? args.bundlesDir);
const outPath = path.resolve(args.out ?? path.join(REPO_ROOT, DEFAULT_OUT_REL));

const lockPath = path.join(bundlesDir, 'bundles-lock.json');
if (!fs.existsSync(lockPath)) {
  console.error(`ERROR: no bundles-lock.json found at ${lockPath}.`);
  console.error('  --bundles-dir must point at a directory make-blind-bundles.mjs produced.');
  process.exit(1);
}
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
const readerIds = Object.keys(lock.readers ?? {});
if (readerIds.length === 0) {
  console.error(`ERROR: ${lockPath} lists zero readers.`);
  process.exit(1);
}

const VALID_TIERS = new Set(['A', 'B', 'C', 'D', 'ABSTAIN']);
const PLACEHOLDER_TIER = 'TIER_LETTER';
const PLACEHOLDER_JUSTIFICATION = 'JUSTIFICATION_TEXT';

// ── Rating-form parser ────────────────────────────────────────────────────
// Matches exactly the shape renderRatingForm() in make-blind-bundles.mjs
// generates: a top-level "Reader ID: X" line, then repeated sections of
//   ## Script NN — <blindId>
//   Reader ID: X
//   Tier (A/B/C/D/ABSTAIN): <value>
//   Justification (1-2 sentences): <value>
function parseRatingForm(text, filePath) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const errors = [];

  const topReaderMatch = lines.find((l) => /^Reader ID:\s*/.test(l));
  if (!topReaderMatch) {
    errors.push(`${filePath}: missing top-level "Reader ID:" line.`);
  }
  const topReaderId = topReaderMatch ? topReaderMatch.replace(/^Reader ID:\s*/, '').trim() : null;

  const sections = [];
  let current = null;
  const headingRe = /^##\s+Script\s+(\d+)\s+—\s+(\S+)\s*$/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = headingRe.exec(line.trim());
    if (m) {
      if (current) sections.push(current);
      current = { position: Number(m[1]), blindId: m[2], readerId: null, tier: null, justification: null, lineNo: i + 1 };
      continue;
    }
    if (!current) continue;
    const readerM = /^Reader ID:\s*(.*)$/.exec(line);
    if (readerM) { current.readerId = readerM[1].trim(); continue; }
    const tierM = /^Tier \(A\/B\/C\/D\/ABSTAIN\):\s*(.*)$/.exec(line);
    if (tierM) { current.tier = tierM[1].trim(); continue; }
    const justM = /^Justification \(1-2 sentences\):\s*(.*)$/.exec(line);
    if (justM) { current.justification = justM[1].trim(); continue; }
  }
  if (current) sections.push(current);

  if (sections.length === 0) {
    errors.push(`${filePath}: no "## Script NN — <blindId>" sections found — is this a rating-form.md make-blind-bundles.mjs generated?`);
  }

  return { topReaderId, sections, errors };
}

function validateSection(section, filePath, expectedReaderId) {
  const errs = [];
  if (section.readerId !== expectedReaderId) {
    errs.push(`${filePath} §${section.blindId}: Reader ID "${section.readerId}" does not match expected "${expectedReaderId}".`);
  }
  if (section.tier === null || section.tier === '') {
    errs.push(`${filePath} §${section.blindId}: missing Tier line.`);
  } else if (section.tier === PLACEHOLDER_TIER) {
    errs.push(`${filePath} §${section.blindId}: Tier still carries the unfilled placeholder "${PLACEHOLDER_TIER}".`);
  } else if (!VALID_TIERS.has(section.tier.toUpperCase())) {
    errs.push(`${filePath} §${section.blindId}: Tier "${section.tier}" is not one of A/B/C/D/ABSTAIN.`);
  }
  if (section.justification === null || section.justification === '') {
    errs.push(`${filePath} §${section.blindId}: missing Justification line.`);
  } else if (section.justification === PLACEHOLDER_JUSTIFICATION) {
    errs.push(`${filePath} §${section.blindId}: Justification still carries the unfilled placeholder "${PLACEHOLDER_JUSTIFICATION}".`);
  }
  return errs;
}

// ── Main ─────────────────────────────────────────────────────────────────
console.log('═'.repeat(78));
console.log('COLLECT LABELS');
console.log('═'.repeat(78));
console.log(`bundles dir : ${bundlesDir}`);
console.log(`forms dir   : ${formsDir}`);
console.log(`readers (per lock): ${readerIds.join(', ')}`);

const scripts = {}; // blindId -> [{ reader, tier, justification }]
const sourceForms = [];
const seenReaderFiles = new Map(); // readerId -> filePath (duplicate detection)
const acceptedReaders = [];
const skippedReaders = [];
let hardErrors = [];

for (const readerId of readerIds) {
  const formPath = path.join(formsDir, `reader-${readerId}`, 'rating-form.md');
  if (!fs.existsSync(formPath)) {
    skippedReaders.push({ readerId, reason: 'no rating-form.md found (not yet returned)' });
    continue;
  }
  if (seenReaderFiles.has(readerId)) {
    hardErrors.push(`Reader "${readerId}" resolved to two different form files: ${seenReaderFiles.get(readerId)} and ${formPath}. Refusing duplicate reader submissions.`);
    continue;
  }
  seenReaderFiles.set(readerId, formPath);

  const text = fs.readFileSync(formPath, 'utf-8');
  const { topReaderId, sections, errors } = parseRatingForm(text, formPath);
  const localErrors = [...errors];
  if (topReaderId !== readerId) {
    localErrors.push(`${formPath}: top-level Reader ID "${topReaderId}" does not match folder's reader id "${readerId}".`);
  }

  const expectedIds = new Set((lock.readers[readerId].order ?? []).map((o) => o.blindId));
  const seenIds = new Set();
  for (const section of sections) {
    if (!expectedIds.has(section.blindId)) {
      localErrors.push(`${formPath}: section "${section.blindId}" is not one of the ${expectedIds.size} scripts assigned to ${readerId} — possibly a tampered or mismatched form.`);
      continue;
    }
    if (seenIds.has(section.blindId)) {
      localErrors.push(`${formPath}: script "${section.blindId}" appears more than once — refusing duplicate reader/script pair.`);
      continue;
    }
    seenIds.add(section.blindId);
    localErrors.push(...validateSection(section, formPath, readerId));
  }
  const missingIds = [...expectedIds].filter((id) => !seenIds.has(id));
  if (missingIds.length > 0) {
    localErrors.push(`${formPath}: incomplete — missing rating(s) for: ${missingIds.join(', ')}.`);
  }

  if (localErrors.length > 0) {
    if (args.partial) {
      skippedReaders.push({ readerId, reason: `${localErrors.length} validation error(s)`, errors: localErrors });
      console.log(`\n[SKIPPED] ${readerId} (--partial mode):`);
      for (const e of localErrors) console.log(`  ${e}`);
      continue;
    }
    hardErrors.push(...localErrors.map((e) => `[${readerId}] ${e}`));
    continue;
  }

  sourceForms.push(path.relative(REPO_ROOT, formPath));
  acceptedReaders.push(readerId);
  for (const section of sections) {
    const tier = section.tier.toUpperCase();
    if (!scripts[section.blindId]) scripts[section.blindId] = [];
    scripts[section.blindId].push({ reader: readerId, tier, justification: section.justification });
  }
}

if (hardErrors.length > 0) {
  console.error(`\n[ABORTED] ${hardErrors.length} validation error(s) (pass --partial to collect whatever is complete instead):`);
  for (const e of hardErrors) console.error(`  ${e}`);
  console.error('\nNothing was written.');
  process.exit(1);
}

if (acceptedReaders.length === 0) {
  console.error('\n[ABORTED] Zero complete reader forms found — nothing to aggregate. Nothing was written.');
  process.exit(1);
}

console.log(`\naccepted readers : ${acceptedReaders.join(', ')} (${acceptedReaders.length}/${readerIds.length})`);
if (skippedReaders.length > 0) {
  console.log(`skipped readers  : ${skippedReaders.map((s) => `${s.readerId} (${s.reason})`).join('; ')}`);
}
const scriptIds = Object.keys(scripts).sort();
console.log(`scripts rated    : ${scriptIds.length}`);
const abstainCount = scriptIds.reduce((acc, id) => acc + scripts[id].filter((r) => r.tier === 'ABSTAIN').length, 0);
if (abstainCount > 0) console.log(`ABSTAIN ratings  : ${abstainCount}`);

const aggregate = {
  generatedAt: new Date().toISOString(),
  bundlesLock: path.relative(REPO_ROOT, lockPath),
  sourceForms,
  readers: acceptedReaders,
  skippedReaders,
  scripts: Object.fromEntries(scriptIds.map((id) => [id, { ratings: scripts[id], n: scripts[id].length }])),
};

assertSafeToWriteLabelData(path.dirname(outPath), { toolName: 'collect-labels.mjs' });
if (fs.existsSync(outPath) && !args.force) {
  console.error(`\n[REFUSED] ${outPath} already exists. Pass --force to overwrite. Nothing was written.`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(aggregate, null, 2) + '\n', 'utf-8');
console.log(`\nwrote ${path.relative(REPO_ROOT, outPath)}`);
console.log('Next: node scripts/p1-labeling/compute-agreement.mjs --labels=' + path.relative(REPO_ROOT, outPath));
