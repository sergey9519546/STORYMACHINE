// A pointer into the claims register must land on a row that exists.
//
// ── Why this guard exists (2026-09-12, writer-loop review round 1, item 3) ──
//
// Two comments shipped citing rows that had never existed:
// `src/components/StartScreen.tsx` said "Registered as docs/CLAIMS_REGISTER.md
// row 103" for a claim that is row 94, and
// `src/components/scriptide/CoverageSummary.tsx` said "row 102" for row 95. The
// register ends at row 100. A reader following either pointer lands nowhere —
// which is the exact failure mode the register exists to prevent, and it is the
// kind of drift no reviewer should have to catch by hand twice.
//
// `scripts/honesty-audit.mjs`'s claims lane already checks the register's own
// rows (their evidence pointers exist, unsupported claims appear nowhere else).
// It does NOT check the pointers aimed AT the register from the other
// direction. This does.
//
// SCOPE: every tracked source, script, test and brain note that names the
// register and a row number. Docs outside `docs/brain/**` are deliberately in
// too — a stale pointer in a session record is the same defect, just quieter.
// Audit records under `docs/audits/**` are excluded: they are dated snapshots
// that legitimately quote the register as it stood on the day, including rows a
// later migration renumbered.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '../..');
const REGISTER = path.join(REPO, 'docs/CLAIMS_REGISTER.md');

/** Every row number the register actually defines, read from its own table. */
function definedRows(): Set<number> {
  const rows = new Set<number>();
  for (const line of readFileSync(REGISTER, 'utf8').split('\n')) {
    const m = /^\|\s*(\d+)\s*\|/.exec(line);
    if (m) rows.add(Number(m[1]));
  }
  return rows;
}

const SEARCH_ROOTS = ['src', 'server', 'scripts', 'tests', 'docs/brain'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage']);
const TEXT_EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.md', '.css', '.html']);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (TEXT_EXT.has(path.extname(entry))) yield full;
  }
}

/** Pull every row number out of a "CLAIMS_REGISTER.md … row(s) N[-M][, K]"
 *  citation. Ranges are expanded, so "rows 82-83, 87-90" checks all six.
 *  The 60-character window after the filename is what keeps an unrelated number
 *  later in the same sentence from being read as a row. */
function citedRows(text: string): { rows: number[]; raw: string }[] {
  const out: { rows: number[]; raw: string }[] = [];
  const citation = /CLAIMS_REGISTER\.md[`'"]?[^\n]{0,20}?\brows?\s+([0-9]+(?:\s*[-–]\s*[0-9]+)?(?:\s*,\s*[0-9]+(?:\s*[-–]\s*[0-9]+)?)*)/g;
  for (const m of text.matchAll(citation)) {
    const rows: number[] = [];
    for (const part of m[1].split(',')) {
      const range = /^\s*([0-9]+)\s*[-–]\s*([0-9]+)\s*$/.exec(part);
      if (range) {
        for (let n = Number(range[1]); n <= Number(range[2]); n++) rows.push(n);
      } else {
        rows.push(Number(part.trim()));
      }
    }
    out.push({ rows, raw: m[0].replace(/\s+/g, ' ') });
  }
  return out;
}

describe('claims-register row citations', () => {
  const rows = definedRows();

  it('the register itself parses (an empty row set would make every check below vacuous)', () => {
    assert.ok(rows.size >= 100, `parsed only ${rows.size} rows out of the register`);
    assert.ok(rows.has(1) && rows.has(100), 'rows 1 and 100 must both be present');
  });

  it('every citation in the tracked tree names a row that exists', () => {
    const dangling: string[] = [];
    for (const root of SEARCH_ROOTS) {
      for (const file of walk(path.join(REPO, root))) {
        const rel = path.relative(REPO, file);
        // This test's own header quotes the two bad pointers as the defect it
        // exists to stop; reading them as live citations would fail it forever.
        if (rel === 'tests/core/claims-row-citations.test.ts') continue;
        for (const { rows: cited, raw } of citedRows(readFileSync(file, 'utf8'))) {
          for (const n of cited) {
            if (!rows.has(n)) dangling.push(`${rel}: "${raw}" — row ${n} does not exist`);
          }
        }
      }
    }
    assert.deepEqual(
      dangling,
      [],
      'a pointer into the claims register must land on a row that exists:\n  ' + dangling.join('\n  '),
    );
  });

  it('the two pointers the round-1 review found are the ones they claim to be', () => {
    // Named rather than merely counted: these are the sentences a reader
    // follows, and their targets are the rows whose evidence backs them.
    const startScreen = readFileSync(path.join(REPO, 'src/components/StartScreen.tsx'), 'utf8');
    const coverage = readFileSync(path.join(REPO, 'src/components/scriptide/CoverageSummary.tsx'), 'utf8');
    assert.match(startScreen, /docs\/CLAIMS_REGISTER\.md row 94\./);
    assert.match(coverage, /docs\/CLAIMS_REGISTER\.md row 95\./);
    assert.doesNotMatch(startScreen, /CLAIMS_REGISTER\.md row 103/);
    assert.doesNotMatch(coverage, /CLAIMS_REGISTER\.md row 102/);
  });
});
