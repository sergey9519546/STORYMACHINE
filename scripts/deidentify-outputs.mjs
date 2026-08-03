#!/usr/bin/env node
// DE-IDENTIFY scripts/output/*.csv — rewrite title/path-bearing columns to the
// content-derived `SM-<8 hex>` id form so this public repo stops enumerating
// the titles of the private, copyrighted research corpus in plain text.
//
// HONESTY NOTE (do not remove): this is de-identification and provenance
// hygiene ONLY. Replacing a filename with an opaque id does not change the
// underlying screenplay text's copyright status and does NOT make the corpus
// distributable. The CSVs stay tracked because their numeric columns (health,
// AUC deltas, word/scene counts) are cited as evidence elsewhere in the repo;
// only the identifying strings are rewritten.
//
// WHY THIS SCRIPT EXISTS RATHER THAN A ONE-OFF EDIT: the ~5,000 title-bearing
// rows across these 10 CSVs cannot be hand-edited (see CLAUDE.md — no
// fabricated ids, no silent pass-through of unresolved titles), and the real
// corpus text is not present in this container, so real ids cannot be
// computed here. This script is the reusable, auditable, idempotent tool a
// maintainer runs locally once they have both the private corpus and the
// crosswalk that names it.
//
// ============================================================================
// CROSSWALK INPUT CONTRACT
// ============================================================================
// This script consumes a JSON "crosswalk" file mapping the private corpus's
// original paths/titles to their `SM-<8 hex>` id (id = a prefix of
// sha256(normalized screenplay text), the same content-hash family already
// used by scripts/dedup-corpus.mjs for its fingerprint). Two shapes are
// accepted:
//
//   1) Array of records (preferred — carries the most match surface):
//      [
//        { "id": "SM-b11cb8ba", "path": "crawl/action/the-avengers.fountain",
//          "title": "The Avengers", "contentHash": "b11cb8ba18911311b0e9..." },
//        ...
//      ]
//      Accepted field aliases: id | sm_id | smId; path | file; title | name.
//
//   2) Flat object map, original-string -> id:
//      { "crawl/action/the-avengers.fountain": "SM-b11cb8ba", ... }
//
// As of this edit, the generator that produces this crosswalk
// (scripts/migrate-corpus-ids.mjs, owned by a sibling change) had not landed
// in this container. This script was built and verified against synthetic
// fixtures matching the contract above, plus the 6 real CC0 files in
// data/screenplays/ (see "npm run deidentify:selftest" / the manual command
// in this header). It has NOT been run against the real ~761-script private
// corpus — see "MAINTAINER STEP" at the bottom of this file for that.
//
// ============================================================================
// MATCHING STRATEGY
// ============================================================================
// A CSV cell's title/path is matched against the crosswalk by normalizing
// both sides to a slug: lowercase, strip a known screenplay extension
// (.fountain.txt / .fountain / .txt / .html / .pdf / .pdf.fountain), replace
// every run of non-alphanumeric characters with a single hyphen, trim edge
// hyphens. This tolerates the corpus's inconsistent naming across its
// pipeline stages (raw scrape "1990_Miller's Crossing.html" vs. converted
// "millers-crossing.fountain" vs. manifest "Millers_Crossing") as long as the
// crosswalk itself indexes the same underlying file under multiple names
// (path AND title AND file, all supplied) — this script does not guess a
// mapping the crosswalk doesn't already assert.
//
// A cell already in id form (`SM-xxxxxxxx`, case-insensitive) is left
// untouched — this is what makes re-running the script on already-rewritten
// output a no-op (idempotent) instead of a failure or corruption.
//
// A cell that cannot be resolved AND is not already in id form AND is not on
// the small, explicit KNOWN_NON_TITLE_PLACEHOLDERS allowlist (documented
// below, for the two synthetic labels in dimension-honesty.csv that are not
// real corpus titles) causes the script to ABORT with a non-zero exit and a
// precise row/column/value in the error — never a silent pass-through of
// unredacted text.
//
// ============================================================================
// USAGE
// ============================================================================
//   node scripts/deidentify-outputs.mjs --crosswalk <path-to-crosswalk.json> [options]
//
// Options:
//   --crosswalk <path>   Required. See CROSSWALK INPUT CONTRACT above.
//   --dir <path>         Directory holding the target CSVs. Default: scripts/output
//   --files a.csv,b.csv  Comma-separated subset of target files. Default: all 10.
//   --dry-run            Report what would change; do not write any file.
//   --check              Verify every target file is ALREADY fully de-identified
//                         (no un-rewritten titles); exit non-zero if not. Does
//                         not require every value to resolve against the
//                         crosswalk (it only checks nothing look like a raw
//                         title was left behind by heuristic column shape).
//
// Exits non-zero on any unresolved title, on a crosswalk collision (two
// different ids claim the same normalized key), or on a missing target file.
//
// ============================================================================
// MAINTAINER STEP — the real rewrite (cannot be done in this container)
// ============================================================================
//   1. Obtain scripts/migrate-corpus-ids.mjs's generated crosswalk (produced
//      alongside the sibling manifest de-identification — see
//      docs/p1-benchmark/CORPUS_IDENTIFICATION.md for the generator's exact
//      output path once that work has landed).
//   2. With the private corpus present locally:
//        node scripts/deidentify-outputs.mjs --crosswalk /path/to/crosswalk.json --dry-run
//      Inspect the summary. Fix any reported unresolved titles by extending
//      the crosswalk (never by editing this script's matching heuristics to
//      "make an unrelated title match").
//   3. Re-run without --dry-run to write the 10 files in place.
//   4. `git diff --stat scripts/output/` should show only the 10 target CSVs
//      changed, row counts identical. Run `npm test` to confirm nothing that
//      reads these CSVs regressed (as of this writing, nothing in tests/ does).
//   5. Run again with --check to confirm the rewrite is idempotent.
//
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';

const KNOWN_EXTS = ['.fountain.txt', '.pdf.fountain', '.html.fountain', '.fountain', '.txt', '.html', '.pdf'];

// The only two `dimension-honesty.csv` "script" values that are NOT real
// corpus titles. `sample-report-script` is a synthetic placeholder label used
// by the sample/demo report generator (not a corpus file at all). Documented
// here, not inferred, so a future title can never silently ride along on this
// allowlist — extend it only with a written reason.
const KNOWN_NON_TITLE_PLACEHOLDERS = new Set(['sample-report-script']);

const TARGET_FILES = [
  'crawl-inventory.csv',
  'crawl-conversion-report.csv',
  'discrimination-auc-train.csv',
  'discrimination-auc-val.csv',
  'discrimination-auc-test.csv',
  'discrimination-auc.csv',
  'dedup-removal-log.csv',
  'real-corpus-scores.csv',
  'dimension-honesty.csv',
  'paired-discrimination.csv',
];

// scripts/migrate-corpus-ids.mjs widens the id from 8 to 10 hex chars if it
// detects a hash collision at width 8 (see that script's `idFor`/`width`
// logic) — match 8-or-more, not exactly 8, so this stays correct either way.
const ID_RE = /^SM-[0-9a-f]{8,}$/i;
const ID_PREFIX_RE = /^SM-[0-9a-f]{8,}/i;

// --------------------------------------------------------------------------
// Slug / extension helpers
// --------------------------------------------------------------------------

function splitExt(basename) {
  const lower = basename.toLowerCase();
  for (const ext of KNOWN_EXTS) {
    if (lower.endsWith(ext) && lower.length > ext.length) {
      return [basename.slice(0, basename.length - ext.length), basename.slice(basename.length - ext.length)];
    }
  }
  const idx = basename.lastIndexOf('.');
  if (idx > 0) return [basename.slice(0, idx), basename.slice(idx)];
  return [basename, ''];
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function basenameOf(value) {
  // path.basename handles forward slashes; the corpus also uses them
  // exclusively (crawl/genre/file.fountain), never backslashes.
  return path.posix.basename(value.replace(/\\/g, '/'));
}

// --------------------------------------------------------------------------
// Crosswalk loading
// --------------------------------------------------------------------------

function loadCrosswalk(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const records = [];
  if (Array.isArray(raw)) {
    for (const rec of raw) records.push(rec);
  } else if (raw && typeof raw === 'object') {
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val === 'string') records.push({ path: key, id: val });
      else records.push({ path: key, ...val });
    }
  } else {
    throw new Error(`crosswalk file ${file} is neither an array nor an object`);
  }

  const index = new Map(); // slug -> id
  const collisions = [];
  let indexedKeys = 0;

  for (const rec of records) {
    const id = rec.id || rec.sm_id || rec.smId;
    if (!id || !ID_RE.test(id)) continue;
    const candidates = [];
    for (const field of [rec.path, rec.file, rec.title, rec.name]) {
      if (typeof field === 'string' && field.trim()) candidates.push(field);
    }
    for (const c of candidates) {
      const [base] = splitExt(basenameOf(c));
      const key = slug(base);
      if (!key) continue;
      indexedKeys++;
      const existing = index.get(key);
      if (existing && existing !== id) {
        collisions.push({ key, existing, incoming: id, source: c });
        continue; // keep first mapping; collision reported below
      }
      index.set(key, id);
    }
  }

  if (collisions.length > 0) {
    const sample = collisions.slice(0, 5).map(c => `  "${c.key}" -> ${c.existing} vs ${c.incoming} (from "${c.source}")`).join('\n');
    throw new Error(
      `Crosswalk has ${collisions.length} colliding normalized key(s) — two different ids claim the same slug. ` +
      `This means the crosswalk is ambiguous and must be fixed before rewriting (never resolved by guessing here):\n${sample}`
    );
  }

  return { index, recordCount: records.length, indexedKeys };
}

function resolveTitle(index, rawValue) {
  const base = basenameOf(rawValue);
  const [stem, ext] = splitExt(base);
  const key = slug(stem);
  const id = index.get(key);
  if (!id) return null;
  return { id, ext: ext || '.fountain' };
}

// --------------------------------------------------------------------------
// RFC4180-ish CSV parse/stringify (handles quoted fields with embedded
// commas/quotes; every target file except dimension-honesty.csv is valid
// CSV under this parser — see the special-cased handler below for why
// dimension-honesty.csv is NOT parsed this way).
// --------------------------------------------------------------------------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  // trailing field/row (file may or may not end with newline)
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  // drop a fully-empty trailing row (artifact of a trailing newline)
  if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
  return rows;
}

function csvField(value) {
  if (/[",\n\r]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
  return value;
}

function stringifyCsv(rows) {
  return rows.map(r => r.map(csvField).join(',')).join('\n') + '\n';
}

// --------------------------------------------------------------------------
// Per-file column configuration (headers inspected directly, not assumed —
// see the "== <file> ==" header dump this script's fixtures reproduce).
// --------------------------------------------------------------------------

// strategy 'path': cell is a bare filename or a path; replace with `${id}${ext}`.
// strategy 'pathWithExtCol': cell is a filename whose extension is ALSO
//   carried in a separate column (crawl-inventory.csv's `ext`); use that
//   column's value as the canonical extension rather than re-deriving it.
const FILE_CONFIGS = {
  'crawl-inventory.csv': {
    columns: [{ name: 'name', strategy: 'pathWithExtCol', extColumn: 'ext' }],
  },
  'crawl-conversion-report.csv': {
    columns: [{ name: 'file', strategy: 'path' }],
  },
  'discrimination-auc-train.csv': { columns: [{ name: 'file', strategy: 'path' }] },
  'discrimination-auc-val.csv': { columns: [{ name: 'file', strategy: 'path' }] },
  'discrimination-auc-test.csv': { columns: [{ name: 'file', strategy: 'path' }] },
  'discrimination-auc.csv': { columns: [{ name: 'file', strategy: 'path' }] },
  'dedup-removal-log.csv': {
    columns: [
      { name: 'kept', strategy: 'path' },
      { name: 'removed', strategy: 'path' },
    ],
  },
  'real-corpus-scores.csv': { columns: [{ name: 'file', strategy: 'path' }] },
  'paired-discrimination.csv': { columns: [{ name: 'file', strategy: 'path' }] },
  // dimension-honesty.csv is handled by rewriteDimensionHonesty() — its CSV
  // is malformed (unquoted commas inside its JSON-blob columns), so it is
  // NOT run through the generic parseCsv()/FILE_CONFIGS path at all.
};

// --------------------------------------------------------------------------
// Rewrite engine
// --------------------------------------------------------------------------

function rewriteGeneric(fileName, text, index, stats) {
  const config = FILE_CONFIGS[fileName];
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error(`${fileName}: empty or unparseable CSV`);
  const header = rows[0];
  const colIdx = name => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`${fileName}: expected column "${name}" not found in header [${header.join(',')}]`);
    return i;
  };

  const resolved = config.columns.map(c => ({ ...c, idx: colIdx(c.name), extIdx: c.extColumn ? colIdx(c.extColumn) : -1 }));

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    for (const col of resolved) {
      const raw = row[col.idx];
      if (raw === undefined || raw === '') continue;

      if (ID_PREFIX_RE.test(basenameOf(raw))) {
        stats.alreadyId++;
        continue; // idempotent no-op
      }

      const match = resolveTitle(index, raw);
      if (!match) {
        throw new Error(
          `${fileName}: row ${r + 1}, column "${col.name}" — cannot resolve title "${raw}" against the crosswalk. ` +
          `Refusing to pass it through unredacted. Extend the crosswalk to cover it, then re-run.`
        );
      }
      const ext = col.extColumn ? row[col.extIdx] : match.ext;
      row[col.idx] = `${match.id}${ext}`;
      stats.rewritten++;
    }
  }

  return stringifyCsv(rows);
}

// dimension-honesty.csv: malformed CSV (see header comment). Only the first
// field on each data line (the `script` column) is rewritten; everything
// after the first comma is passed through byte-for-byte untouched, including
// its own broken quoting, because it carries only numeric/JSON evidence, no
// titles, and "fixing" its CSV shape is out of scope for a de-identification
// pass.
function rewriteDimensionHonesty(fileName, text, index, stats) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length === 0) throw new Error(`${fileName}: empty file`);
  const out = [];
  out.push(lines[0]); // header, untouched
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') { out.push(line); continue; }
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) throw new Error(`${fileName}: line ${i + 1} has no comma — unexpected shape: ${JSON.stringify(line)}`);
    const scriptValue = line.slice(0, commaIdx);
    const rest = line.slice(commaIdx);

    if (ID_PREFIX_RE.test(basenameOf(scriptValue))) {
      stats.alreadyId++;
      out.push(scriptValue + rest);
      continue;
    }
    if (KNOWN_NON_TITLE_PLACEHOLDERS.has(scriptValue)) {
      stats.placeholderSkipped++;
      out.push(scriptValue + rest);
      continue;
    }
    // suffix-aware resolution: "ratatouille (real)" -> "SM-xxxxxxxx (real)"
    const suffixMatch = scriptValue.match(/^(.*?)(\s*\([^)]*\))$/);
    const base = suffixMatch ? suffixMatch[1] : scriptValue;
    const suffix = suffixMatch ? suffixMatch[2] : '';
    const match = resolveTitle(index, base);
    if (!match) {
      throw new Error(
        `${fileName}: line ${i + 1}, "script" column — cannot resolve title "${scriptValue}" (base "${base}") against the ` +
        `crosswalk, and it is not on KNOWN_NON_TITLE_PLACEHOLDERS. Refusing to pass it through unredacted.`
      );
    }
    stats.rewritten++;
    out.push(match.id + suffix + rest);
  }
  return out.join('\n');
}

function rewriteFile(fileName, text, index, stats) {
  if (fileName === 'dimension-honesty.csv') return rewriteDimensionHonesty(fileName, text, index, stats);
  return rewriteGeneric(fileName, text, index, stats);
}

// --------------------------------------------------------------------------
// --check mode: scan for any value that still LOOKS like a raw title (i.e.
// is not already an SM- id and is not a known placeholder) in the configured
// columns, without requiring crosswalk resolution.
// --------------------------------------------------------------------------

function checkFile(fileName, text) {
  if (fileName === 'dimension-honesty.csv') {
    const lines = text.replace(/\r\n/g, '\n').split('\n').slice(1).filter(Boolean);
    const leftover = [];
    for (const line of lines) {
      const scriptValue = line.slice(0, line.indexOf(','));
      if (ID_PREFIX_RE.test(basenameOf(scriptValue))) continue;
      if (KNOWN_NON_TITLE_PLACEHOLDERS.has(scriptValue)) continue;
      const suffixMatch = scriptValue.match(/^(.*?)(\s*\([^)]*\))$/);
      const base = suffixMatch ? suffixMatch[1] : scriptValue;
      if (ID_PREFIX_RE.test(base)) continue;
      leftover.push(scriptValue);
    }
    return leftover;
  }

  const config = FILE_CONFIGS[fileName];
  const rows = parseCsv(text);
  const header = rows[0];
  const leftover = [];
  for (const col of config.columns) {
    const idx = header.indexOf(col.name);
    for (let r = 1; r < rows.length; r++) {
      const raw = rows[r][idx];
      if (!raw) continue;
      if (!ID_PREFIX_RE.test(basenameOf(raw))) leftover.push(`row ${r + 1} col "${col.name}": ${raw}`);
    }
  }
  return leftover;
}

// --------------------------------------------------------------------------
// CLI
// --------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dir: 'scripts/output', files: TARGET_FILES.slice(), dryRun: false, check: false, crosswalk: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--crosswalk') args.crosswalk = argv[++i];
    else if (a === '--dir') args.dir = argv[++i];
    else if (a === '--files') args.files = argv[++i].split(',').map(s => s.trim());
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--check') args.check = true;
    else if (a === '--help' || a === '-h') { printUsage(); process.exit(0); }
    else { console.error(`Unknown argument: ${a}`); printUsage(); process.exit(2); }
  }
  return args;
}

function printUsage() {
  console.log(`Usage: node scripts/deidentify-outputs.mjs --crosswalk <path> [--dir scripts/output] [--files a.csv,b.csv] [--dry-run] [--check]

See the header comment in this file for the full crosswalk input contract,
matching strategy, and the maintainer command sequence for the real rewrite.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.check) {
    let anyLeftover = false;
    for (const fileName of args.files) {
      const p = path.join(args.dir, fileName);
      if (!fs.existsSync(p)) { console.error(`MISSING: ${p}`); anyLeftover = true; continue; }
      const text = fs.readFileSync(p, 'utf-8');
      const leftover = checkFile(fileName, text);
      if (leftover.length > 0) {
        anyLeftover = true;
        console.error(`${fileName}: ${leftover.length} value(s) not in id form:`);
        for (const l of leftover.slice(0, 10)) console.error(`  ${l}`);
        if (leftover.length > 10) console.error(`  ...and ${leftover.length - 10} more`);
      } else {
        console.log(`${fileName}: OK (all values already in id form)`);
      }
    }
    process.exit(anyLeftover ? 1 : 0);
  }

  if (!args.crosswalk) {
    console.error('Missing required --crosswalk <path>. See --help.');
    process.exit(2);
  }
  const { index, recordCount, indexedKeys } = loadCrosswalk(args.crosswalk);
  console.log(`Loaded crosswalk: ${recordCount} record(s), ${indexedKeys} indexed key(s), ${index.size} unique slug(s).`);

  let anyError = false;
  for (const fileName of args.files) {
    const p = path.join(args.dir, fileName);
    if (!fs.existsSync(p)) { console.error(`MISSING: ${p}`); anyError = true; continue; }
    const text = fs.readFileSync(p, 'utf-8');
    const stats = { rewritten: 0, alreadyId: 0, placeholderSkipped: 0 };
    let out;
    try {
      out = rewriteFile(fileName, text, index, stats);
    } catch (err) {
      console.error(`FAILED: ${fileName}\n  ${err.message}`);
      anyError = true;
      continue;
    }
    const changed = out !== text;
    console.log(
      `${fileName}: rewritten=${stats.rewritten} alreadyId=${stats.alreadyId}` +
      (stats.placeholderSkipped ? ` placeholderSkipped=${stats.placeholderSkipped}` : '') +
      ` changed=${changed}`
    );
    if (!args.dryRun && changed) fs.writeFileSync(p, out);
  }

  if (anyError) {
    console.error('\nOne or more files failed to de-identify. No partial file was left half-rewritten (each file is rewritten atomically in memory before being written), but earlier files in this run may already have been written to disk — re-run is safe (idempotent).');
    process.exit(1);
  }
  console.log(args.dryRun ? '\nDry run complete. No files were written.' : '\nDone.');
}

main().catch(err => { console.error(err.stack || err.message); process.exit(1); });
