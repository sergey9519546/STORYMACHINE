// Upgrade item #12 — rulebook anchors. scripts/generate-rulebook.ts now
// emits a stable `<a id="rule-<rule.toLowerCase()>"></a>` immediately before
// every rule's list item in docs/rulebook/<pass>.md, so a finding's
// (pass, rule) pair — the shape server/nvm/revision/passes/types.ts's
// RevisionIssue actually carries — resolves to a real, linkable location
// (src/components/scriptide/ScriptDoctorPanel.tsx's rulebookHref).
//
// tests/fixtures/rulebook-report-pairs.json is every distinct (pass, rule)
// pair from one real captured report (POST /api/scriptide/doctor on
// data/screenplays/chain-of-custody.fountain, discovery report scratchpad,
// 2026-09-03) — 185 pairs across all 14 passes — so this checks the anchor
// actually exists for rules a real script really fires, not just for
// synthetic examples.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RULEBOOK_DIR = path.join(REPO_ROOT, 'docs', 'rulebook');

interface ReportPair { pass: string; rule: string }

const PAIRS: ReportPair[] = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'fixtures', 'rulebook-report-pairs.json'), 'utf8'),
);

function anchorFor(rule: string): string {
  return `rule-${rule.toLowerCase()}`;
}

describe('docs/rulebook — per-rule anchors (upgrade item #12)', () => {
  it('the fixture is non-trivial and spans most of the 14 passes', () => {
    assert.ok(PAIRS.length > 100, `expected a substantial fixture, got ${PAIRS.length} pairs`);
    // One real script's own report, not a synthetic all-passes fixture — a
    // pass that fired zero issues on this particular draft (here: theme)
    // legitimately contributes no pairs, so this checks broad coverage
    // rather than exact-14, which would make the fixture as fragile as a
    // hand-built one.
    const passesSeen = new Set(PAIRS.map(p => p.pass));
    assert.ok(passesSeen.size >= 12, `expected most of the 14 passes represented, got only ${[...passesSeen].sort().join(', ')}`);
  });

  it('every (pass, rule) pair from the captured report resolves to a real anchor in docs/rulebook/<pass>.md', () => {
    const docCache = new Map<string, string>();
    const missing: string[] = [];

    for (const { pass, rule } of PAIRS) {
      let doc = docCache.get(pass);
      if (doc === undefined) {
        const docPath = path.join(RULEBOOK_DIR, `${pass}.md`);
        doc = readFileSync(docPath, 'utf8');
        docCache.set(pass, doc);
      }
      const anchorTag = `<a id="${anchorFor(rule)}"></a>`;
      if (!doc.includes(anchorTag)) {
        missing.push(`${pass}/${rule} (expected ${anchorTag} in docs/rulebook/${pass}.md)`);
      }
    }

    assert.deepEqual(missing, [], `${missing.length} rule(s) missing a rulebook anchor:\n${missing.join('\n')}`);
  });

  it('the anchor for every rule also lines up with the rule\'s own backtick-quoted name on the same line', () => {
    for (const { pass, rule } of PAIRS) {
      const doc = readFileSync(path.join(RULEBOOK_DIR, `${pass}.md`), 'utf8');
      const line = doc.split('\n').find(l => l.includes(`<a id="${anchorFor(rule)}"></a>`));
      assert.ok(line, `no line carries the anchor for ${pass}/${rule}`);
      assert.ok(line!.includes(`\`${rule}\``), `anchor line for ${pass}/${rule} doesn't also quote the rule name: ${line}`);
    }
  });
});
