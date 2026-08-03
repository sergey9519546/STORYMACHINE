// SHARED SAFETY GUARD for scripts under scripts/ that write evidence
// artifacts (CSV/JSON) into scripts/output/.
//
// ── Why this exists (2026-08-03 hygiene audit, Task 1) ─────────────────────
// Several probes wrote their result file unconditionally at the end of the
// run, with no check against what was already on disk. The private research
// corpus lives outside git (see .gitignore's `data/` rule), so most
// checkouts — including sandboxed/CI ones — have zero, or only a handful of
// sample, screenplays under data/screenplays/ instead of the full ~761/765
// script corpus the committed evidence reflects. A probe run under those
// conditions still completed and wrote a valid-looking but empty or
// drastically-smaller CSV/JSON, SILENTLY OVERWRITING a committed evidence
// file that is cited from P1/P0 docs as measurement proof
// (scripts/output/real-corpus-scores.csv lost 81 lines this way;
// dimension-honesty.csv and paired-discrimination.csv were also damaged).
// A near-empty file produces a small, easy-to-miss diff instead of an
// obvious failure — that is what makes it dangerous.
//
// Two guards live here, meant to be used together:
//
//   requireCorpus(count, opts)
//     Call BEFORE doing any real (possibly expensive) work, as soon as the
//     source file count is known. Exits 1 with a clear, explicit message —
//     never a raw ENOENT stack trace — if `count` is 0, so a missing corpus
//     fails fast and loud instead of quietly producing an empty run.
//
//   guardedWrite(outFile, content, opts)
//     Call INSTEAD OF fs.writeFileSync for the final evidence artifact.
//     Refuses (exit 1, clear message, nothing written) if the new result is
//     empty, OR if an existing file is already on disk and the new result
//     is drastically smaller than it (< minRatio, default 50%, of the
//     existing row/entry count) — UNLESS --force (or -f) was passed on
//     argv, or opts.force === true.
//
// Both are deliberately simple counting heuristics, not semantic diffing —
// the goal is to catch the "ran against an empty/partial corpus" failure
// mode before it corrupts an audit trail, not to review content quality.
// A genuine, intentional shrink (e.g. corpus cleanup that legitimately
// removes entries) remains possible — just opt in explicitly with --force.

import fs from 'node:fs';
import path from 'node:path';

/** True if --force or -f is present on argv (defaults to process.argv). */
export function hasForceFlag(argv = process.argv.slice(2)) {
  return argv.includes('--force') || argv.includes('-f');
}

/**
 * Exit 1 with a clear message if `count` is 0. Call this as soon as the
 * source corpus/file list size is known and BEFORE any expensive work, so a
 * missing corpus fails fast with an explanation instead of silently running
 * to completion over zero items.
 *
 * @param {number} count - number of source items resolved (files, entries).
 * @param {{label?: string, hint?: string}} [opts]
 */
export function requireCorpus(count, opts = {}) {
  const { label = 'source corpus', hint = '' } = opts;
  if (count > 0) return;
  console.error(`ERROR: ${label} resolved to 0 files/items — refusing to run.`);
  if (hint) console.error(hint);
  console.error('Nothing was written.');
  process.exit(1);
}

function dataLineCount(text, hasHeader) {
  if (!text) return 0;
  const trimmed = text.replace(/\n+$/, '');
  if (trimmed.length === 0) return 0;
  const lines = trimmed.split('\n').length;
  return hasHeader ? Math.max(0, lines - 1) : lines;
}

/**
 * Guarded replacement for fs.writeFileSync on an evidence artifact under
 * scripts/output/. Refuses to write an empty result, and refuses to shrink
 * an existing file by more than (1 - minRatio), unless forced.
 *
 * For CSV-shaped `content` (one record per line, optional header), the row
 * count is derived automatically by counting lines. For JSON or other
 * non-line-shaped output, pass `rowCount` (the new result's semantic count,
 * e.g. an array length) and `existingRowCount` (the same metric computed
 * from the file already on disk) explicitly — the caller knows the shape,
 * this module intentionally does not parse JSON to guess it.
 *
 * @param {string} outFile
 * @param {string} content - exact bytes to write.
 * @param {object} [opts]
 * @param {number} [opts.rowCount] - explicit new-row count (else derived from `content` by line count).
 * @param {number} [opts.existingRowCount] - explicit existing-row count (else derived from the on-disk file by line count).
 * @param {boolean} [opts.hasHeader=true] - whether line 1 is a header to exclude from the line-count fallback.
 * @param {boolean} [opts.force] - bypass the guard (defaults to hasForceFlag()).
 * @param {string} [opts.label] - name used in messages (defaults to outFile).
 * @param {number} [opts.minRatio=0.5] - new/existing ratio below which a non-empty result still counts as "drastically smaller".
 */
export function guardedWrite(outFile, content, opts = {}) {
  const {
    hasHeader = true,
    force = hasForceFlag(),
    label = outFile,
    minRatio = 0.5,
  } = opts;

  const newRows = opts.rowCount !== undefined ? opts.rowCount : dataLineCount(content, hasHeader);

  const fileExists = fs.existsSync(outFile);
  let existingRows = 0;
  if (fileExists) {
    if (opts.existingRowCount !== undefined) {
      existingRows = opts.existingRowCount;
    } else {
      const existingText = fs.readFileSync(outFile, 'utf-8');
      existingRows = dataLineCount(existingText, hasHeader);
    }
  }

  const isEmpty = newRows === 0;
  // <= (not <): an exact-half reduction is still "drastically smaller" and
  // must require --force, not slip through at the boundary (observed live
  // during this fix's own verification — see scripts/lib/output-guard.mjs
  // header incident: probe-dimension-honesty.mjs run without --real-script
  // produces exactly 5 rows against a committed 10-row file, 5 === 10*0.5).
  const isDrasticallySmaller = fileExists && existingRows > 0 && newRows > 0 && newRows <= existingRows * minRatio;

  if ((isEmpty || isDrasticallySmaller) && !force) {
    console.error(`REFUSING TO WRITE ${label}:`);
    if (fileExists) {
      console.error(`  existing file has ${existingRows} row(s)/entry(ies); new result has ${newRows}.`);
    } else {
      console.error(`  new result has ${newRows} row(s)/entry(ies) and no file exists yet at this path.`);
    }
    console.error(
      isEmpty
        ? '  New result is EMPTY. This usually means the source corpus was missing, moved, or unmatched.'
        : `  New result is drastically smaller than what is on disk (< ${Math.round(minRatio * 100)}% of existing).`
    );
    console.error('  If this reduction is genuinely intended, re-run with --force (or -f).');
    console.error('  No file was written; any existing evidence file is untouched.');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content, 'utf-8');
  console.log(`Wrote ${newRows} row(s)/entry(ies) to ${outFile}${force && (isEmpty || isDrasticallySmaller) ? ' (--force)' : ''}`);
}
