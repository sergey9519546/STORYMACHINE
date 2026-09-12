// Freshness test for the generated rulebook (ROADMAP.md §11, Run 15 — trust &
// publishing). This does NOT re-derive the docs; it runs the same core parse
// scripts/generate-rulebook.ts uses against the LIVE pass files and checks
// that docs/rulebook/README.md's published "Total distinct rules" count still
// matches. When a future wave adds 3 rules and someone forgets to re-run
// `npm run rulebook`, this test fails and points straight at the fix.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractAllPasses, listPassFiles, generateRulebook, extractRootCauseTemplates,
  assertRootCauseTemplatesWellFormed,
} from '../../scripts/generate-rulebook.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const README_PATH = path.join(REPO_ROOT, 'docs/rulebook/README.md');
const RULEBOOK_DIR = path.join(REPO_ROOT, 'docs/rulebook');

describe('rulebook freshness', () => {
  it('extracts at least 1300 distinct rules across the 14 pass files', () => {
    const extractions = extractAllPasses();
    const total = extractions.reduce((sum, e) => sum + e.rules.length, 0);
    assert.ok(
      total >= 1300,
      `expected >= 1300 total distinct rules, got ${total} — either the pass files ` +
      'regressed or the extractor is broken (both worth investigating before touching this floor)',
    );
  });

  it('every one of the 14 pass files yields at least 1 rule', () => {
    const passFiles = listPassFiles();
    assert.ok(passFiles.length === 14, `expected 14 pass files, found ${passFiles.length}`);

    const extractions = extractAllPasses();
    assert.equal(extractions.length, passFiles.length);
    for (const e of extractions) {
      assert.ok(
        e.rules.length >= 1,
        `pass "${e.pass}" yielded 0 rules — extractor regression or the pass file lost its checks`,
      );
    }
  });

  it("live extraction count matches docs/rulebook/README.md's published total " +
    '(fails when docs go stale after a wave — re-run `npm run rulebook`)', () => {
    const readme = readFileSync(README_PATH, 'utf8');
    const m = /Total distinct rules:\s*(\d+)/.exec(readme);
    assert.ok(m, 'docs/rulebook/README.md does not contain a "Total distinct rules: N" line — ' +
      'run `npm run rulebook` to (re)generate it');

    const publishedTotal = parseInt(m![1], 10);
    const extractions = extractAllPasses();
    const liveTotal = extractions.reduce((sum, e) => sum + e.rules.length, 0);

    assert.equal(
      liveTotal, publishedTotal,
      `docs/rulebook/README.md says ${publishedTotal} total rules, but the live pass files ` +
      `now extract to ${liveTotal} — the docs are stale. Run \`npm run rulebook\` to regenerate ` +
      'and commit the result.',
    );
  });

  // 2026-09-12 adversarial review, finding 14: `npm run rulebook` was not
  // idempotent on main — a clean regeneration added 16 lines to
  // docs/rulebook/root-causes.md (four root-cause clusters, three with an
  // empty title, all four with an empty `Requires:` list) that
  // `README.md`'s own claim ("Regenerating after a wave lands is idempotent
  // — a no-op diff — until the next wave actually changes something") says
  // should never happen. Neither of the two tests above would have caught
  // it: they check the rule COUNT, and root-causes.md's entries carry no
  // count at all. This is the standard generated-artifact guard instead —
  // regenerate into a temp directory and diff every file against the
  // committed copy.
  it('regenerating into a temp directory produces a zero diff against docs/rulebook/** ' +
    '(the generated-artifact freshness guard — fails when the committed docs are stale ' +
    'relative to a live re-run of `npm run rulebook`)', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'rulebook-regen-'));
    try {
      generateRulebook(tmpDir);

      const committedFiles = readdirSync(RULEBOOK_DIR)
        .filter(f => f.endsWith('.md') || f.endsWith('.json'))
        // COVERAGE_2026-09-03.md is a dated snapshot, not something
        // generate-rulebook.ts writes — coverage.json is READ by
        // generateRulebook (via readCoverageReport), never written by it,
        // so it is legitimately absent from a fresh regeneration.
        .filter(f => f !== 'coverage.json' && !/^COVERAGE_\d{4}-\d{2}-\d{2}\.md$/.test(f));
      assert.ok(committedFiles.length >= 17, // README + 14 passes + excellence + root-causes + genre
        `expected at least 17 generated files under docs/rulebook/, found ${committedFiles.length}: ` +
        committedFiles.join(', '));

      const regeneratedFiles = readdirSync(tmpDir);
      const missing = committedFiles.filter(f => !regeneratedFiles.includes(f));
      const extra = regeneratedFiles.filter(f => !committedFiles.includes(f));
      assert.deepEqual(missing, [], `regeneration did not produce: ${missing.join(', ')}`);
      assert.deepEqual(extra, [], `regeneration produced unexpected file(s) not in docs/rulebook/: ${extra.join(', ')}`);

      const diffs: string[] = [];
      for (const f of committedFiles) {
        const committed = readFileSync(path.join(RULEBOOK_DIR, f), 'utf8');
        const regenerated = readFileSync(path.join(tmpDir, f), 'utf8');
        if (committed !== regenerated) diffs.push(f);
      }
      assert.deepEqual(
        diffs, [],
        `docs/rulebook/** is stale relative to a live regeneration in: ${diffs.join(', ')} — ` +
        'run `npm run rulebook` and commit the result (or, if the extractor itself is wrong, ' +
        'fix the extractor first).',
      );
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // Same finding, the other half: an entry with an empty title or an empty
  // Requires list is not a catalog entry (`### ` + nothing is not a
  // heading), so the generator must refuse to emit root-causes.md rather
  // than publish one. This asserts the LIVE cluster.ts extraction passes the
  // check today, then proves the check itself actually fires by feeding it
  // the exact malformed shape finding 14 reproduced (a cluster with no
  // title, and one with no Requires list) — a guard that could not have
  // caught the bug proves nothing.
  it('root-cause templates extracted from the live cluster.ts all have a title and a Requires list', () => {
    const templates = extractRootCauseTemplates();
    assert.ok(templates.length >= 18, `expected at least 18 root-cause templates, found ${templates.length}`);
    assert.doesNotThrow(() => assertRootCauseTemplatesWellFormed(templates));
  });

  it('the well-formedness guard rejects an empty title and an empty Requires list, naming the cluster', () => {
    assert.throws(
      () => assertRootCauseTemplatesWellFormed([
        { id: 'no-title-cluster', requiredRules: ['SOME_RULE'], title: '', wave: null, waveProse: null, line: 1 },
        { id: 'no-requires-cluster', requiredRules: [], title: 'Has a title', wave: null, waveProse: null, line: 2 },
      ]),
      (err: unknown) => err instanceof Error
        && err.message.includes('no-title-cluster')
        && err.message.includes('no-requires-cluster'),
      'expected the guard to throw naming both malformed clusters',
    );
  });
});
