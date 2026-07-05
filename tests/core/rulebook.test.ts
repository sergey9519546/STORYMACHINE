// Freshness test for the generated rulebook (ROADMAP.md §11, Run 15 — trust &
// publishing). This does NOT re-derive the docs; it runs the same core parse
// scripts/generate-rulebook.ts uses against the LIVE pass files and checks
// that docs/rulebook/README.md's published "Total distinct rules" count still
// matches. When a future wave adds 3 rules and someone forgets to re-run
// `npm run rulebook`, this test fails and points straight at the fix.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractAllPasses, listPassFiles } from '../../scripts/generate-rulebook.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const README_PATH = path.join(REPO_ROOT, 'docs/rulebook/README.md');

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
});
