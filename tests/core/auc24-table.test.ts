// The AUC-24 ratchet, recomputed in CI from committed NUMBERS.
//
// ── The false inference this file closes ───────────────────────────────────
// CLAUDE.md, NORTH_STAR §0 and the receipt ledger all reason: the corpus is
// copyrighted and local-only -> it can never reach CI -> therefore the AUC-24
// value can never be verified in CI. The first arrow is true and permanent.
// The second does not follow. The statistic is a pure function of two arrays
// of health values produced by a seeded, deterministic degradation, and
// numbers are not copyrighted screenplay text — this repo already commits
// exactly that shape in tests/fixtures/real-corpus-manifest.json (72 rows of
// hash + numbers). Split the statistic from the text and CI can recompute it.
//
// ── What runs where ────────────────────────────────────────────────────────
//   owner, locally, with the corpus : npm run lock-auc24 -> writes the table
//   CI, every run, with no corpus   : this file recomputes the AUC from it
//
// ── What this still does NOT prove ─────────────────────────────────────────
// That the committed numbers came from the real corpus. Nothing in CI can
// check that. What changes is the cost of getting it wrong: a fabricated pass
// now needs 48 individually-plausible health values whose Mann-Whitney
// statistic lands on the claimed figure, rather than one number typed into
// prose (the 2026-08-08 fabricated-receipt shape), and every future edit to
// those numbers is a reviewable diff instead of an invisible skip.
//
// ── Current state: the table is NOT locked yet ─────────────────────────────
// It cannot be produced anywhere the corpus is absent, and inventing values
// would be the exact fabrication this machinery exists to make expensive. So
// the assertions below SKIP, loudly, naming the one command that ends the
// skip — and scripts/report-unverified-gates.mjs lists the missing file as an
// unverified gate with an expiry, after which that CI step exits non-zero
// instead of merely reporting. The machinery itself is covered without a
// corpus by tests/core/auc.test.ts and tests/scripts/lock-auc24.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUC24_DEGRADATION_ID,
  AUC24_FLOOR,
  AUC24_LOCK_COMMAND,
  AUC24_SUBSET,
  AUC24_TABLE_PATH,
  aucFromTable,
  type Auc24Table,
} from '../../scripts/lib/auc.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TABLE_FILE = path.join(REPO_ROOT, AUC24_TABLE_PATH);
const TABLE_PRESENT = existsSync(TABLE_FILE);

/** The skip reason IS the instruction. A skip that does not say how to end
 *  itself is how REAL_SCRIPT_CORPUS_DIR went unnoticed for months. */
const SKIP_REASON = TABLE_PRESENT
  ? false
  : `${AUC24_TABLE_PATH} is not committed yet — the corpus is owner-local, so only the owner can produce it: \`${AUC24_LOCK_COMMAND}\`. Listed by scripts/report-unverified-gates.mjs, which blocks after that gate's expiry.`;

const table: Auc24Table | null = TABLE_PRESENT
  ? (JSON.parse(readFileSync(TABLE_FILE, 'utf8')) as Auc24Table)
  : null;

describe('AUC-24 committed table — the ratchet, recomputed without the corpus', () => {
  it('recomputes to the AUC the table header records', { skip: SKIP_REASON }, () => {
    const recomputed = aucFromTable(table!.rows);
    assert.ok(
      Math.abs(recomputed - table!.measuredAuc) < 1e-12,
      `the table's header claims AUC ${table!.measuredAuc} but its own ${table!.rows.length} rows compute `
      + `${recomputed}. The header is a summary of the rows, not an independent number — a divergence means `
      + `the rows were edited without re-running \`${AUC24_LOCK_COMMAND}\`.`,
    );
  });

  it(`clears the ${AUC24_FLOOR} floor`, { skip: SKIP_REASON }, () => {
    const recomputed = aucFromTable(table!.rows);
    assert.ok(
      recomputed >= AUC24_FLOOR,
      `structural-degradation AUC ${recomputed.toFixed(4)} fell below the ${AUC24_FLOOR} ratchet — a change `
      + 'made the doctor MORE structure-blind. This is the assertion that used to run only on a machine with '
      + 'the corpus mounted, which meant it ran nowhere.',
    );
  });

  it('was locked against the same floor this code enforces', { skip: SKIP_REASON }, () => {
    assert.equal(
      table!.floor,
      AUC24_FLOOR,
      'the committed table was locked against a different floor than scripts/lib/auc.ts now enforces. '
      + `Re-run \`${AUC24_LOCK_COMMAND}\` so the recorded number and the enforced number are the same number.`,
    );
  });

  it(`holds exactly ${AUC24_SUBSET} rows, in manifest order, one per subset script`, { skip: SKIP_REASON }, () => {
    assert.equal(table!.rows.length, AUC24_SUBSET, 'the AUC-24 statistic is defined over exactly 24 scripts');
    assert.deepEqual(
      table!.rows.map((r) => r.manifestIndex),
      Array.from({ length: AUC24_SUBSET }, (_, i) => i),
      'rows must be manifest entries 0..23 in committed array order — sorting or regrouping them silently '
      + 'measures a different set of scripts against the same floor',
    );
    assert.equal(
      new Set(table!.rows.map((r) => r.contentHash)).size,
      AUC24_SUBSET,
      'duplicate content hashes mean the same script was measured twice',
    );
  });

  it('carries no screenplay text: every string field is a bare hex hash', { skip: SKIP_REASON }, () => {
    // The copyright boundary, asserted rather than trusted. A future edit that
    // adds `title` or `file` "just for readability" fails here.
    for (const row of table!.rows) {
      for (const [key, value] of Object.entries(row)) {
        if (typeof value !== 'string') {
          assert.equal(typeof value, 'number', `row field ${key} must be a number or a hash string`);
          continue;
        }
        assert.equal(key, 'contentHash', `row field ${key} is a string — only contentHash may be one, and only as a hash`);
        assert.match(value, /^[0-9a-f]{64}$/, `row contentHash ${JSON.stringify(value)} is not a bare sha256 hex digest`);
      }
      assert.ok(Number.isFinite(row.intactHealth) && Number.isFinite(row.degradedHealth),
        'health values must be finite numbers');
      assert.ok(Number.isFinite(row.seed), 'the degradation seed must be recorded as a number');
    }
  });

  it('was produced by the recipe this code implements', { skip: SKIP_REASON }, () => {
    assert.equal(table!.schemaVersion, 1);
    assert.equal(
      (table!.degradation as { id?: string }).id,
      AUC24_DEGRADATION_ID,
      'the table was produced by a different degradation recipe than the one in scripts/lib/auc.ts. '
      + 'Numbers from two recipes are not comparable against one floor.',
    );
    assert.match(table!.gitSha, /^[0-9a-f]{7,40}$|^unknown$/, 'gitSha must be a commit hash or the honest string "unknown"');
    assert.match(table!.measuredAt, /^\d{4}-\d{2}-\d{2}$/, 'measuredAt must be an ISO date');
  });
});

// This suite runs ALWAYS — with or without the table. It is the guard against
// the failure mode the extraction was for: two floors, in two files, drifting.
describe('AUC-24 floor — one definition, imported everywhere', () => {
  const corpusTestSrc = readFileSync(path.join(REPO_ROOT, 'tests/core/real-script-corpus.test.ts'), 'utf8');

  it('real-script-corpus.test.ts imports the floor instead of hardcoding one', () => {
    assert.match(
      corpusTestSrc,
      /import\s*\{[^}]*AUC24_FLOOR[^}]*\}\s*from\s*'\.\.\/\.\.\/scripts\/lib\/auc\.ts'/s,
      'tests/core/real-script-corpus.test.ts must import AUC24_FLOOR from scripts/lib/auc.ts. Two copies of '
      + 'the floor is how the corpus-gated assertion and the always-on one drift apart — which is exactly the '
      + 'shape of bug that let the ratchet sit unmoved from 2026-07-10 to 2026-09-02.',
    );
  });

  it('the env-gated AUC assertion is written against the shared constant', () => {
    const assertion = /assert\.ok\(\s*measured\.auc\s*>=\s*AUC24_FLOOR/.exec(corpusTestSrc);
    assert.ok(
      assertion,
      'the hard-floor assertion in real-script-corpus.test.ts must compare against AUC24_FLOOR. A numeric '
      + 'literal there can be edited without touching the constant this file enforces, and then the two '
      + 'gates disagree in silence.',
    );
  });

  it('real-script-corpus.test.ts uses the shared degradation recipe, not a private copy', () => {
    assert.match(
      corpusTestSrc,
      /shuffleDropDegrade/,
      'the env-gated measurement must call shuffleDropDegrade from scripts/lib/auc.ts, so the committed '
      + 'table and the live corpus run are produced by the same recipe. A re-implemented recipe would make '
      + 'the two numbers quietly incomparable.',
    );
  });
});
