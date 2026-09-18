// The docs-only fast-path classifier (scripts/lib/docs-only.mjs) must be
// able to fail: a guard with no failing case is not a guard (LANE_STANDARD
// §3). This is a table of changed-file sets that must classify one way or
// the other, including the adversarial cases named in the lane brief —
// `docs/foo.md` plus `server/app.ts`, `.github/workflows/ci.yml` alone,
// `README.md` alone, a path merely CONTAINING "docs" but not under it
// (`src/docs-panel.tsx`), and an empty change set.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDocsOnly, isDocsPath } from '../../scripts/lib/docs-only.mjs';

type Case = { name: string; files: string[]; expected: boolean; why: string };

const DOCS_ONLY_CASES: Case[] = [
  {
    name: 'a single markdown file under docs/',
    files: ['docs/PATH_TO_EXCELLENCE.md'],
    expected: true,
    why: 'the textbook case — one prose file, nothing else',
  },
  {
    name: 'several files all under docs/, including a non-.md asset',
    files: ['docs/brain/00 Home.md', 'docs/brain/brain.graph.json', 'docs/audits/2026-09-18-x/README.md'],
    expected: true,
    why: 'docs/** covers every file under the directory, not just *.md ones',
  },
  {
    name: 'README.md alone, at the repo root',
    files: ['README.md'],
    expected: true,
    why: 'decided and justified in scripts/lib/docs-only.mjs\'s header: README.md is not under docs/, '
      + 'but it matches **/*.md, and it is already unconditionally scanned by honesty-audit '
      + '(SCAN_ROOT_FILES), check-docs (--all root scope), and asserted against by '
      + 'tests/scripts/smoke-gate-serve-mode.test.ts (a fast-path test) — nothing that gates it is skipped',
  },
  {
    name: 'a root-level markdown file that is not README',
    files: ['ROADMAP.md', 'NORTH_STAR.md', 'CLAUDE.md'],
    expected: true,
    why: 'same reasoning as README.md: **/*.md is not restricted to docs/ or to README specifically',
  },
  {
    name: 'a deeply nested markdown file outside docs/',
    files: ['docs/audits/2026-09-18-ci-docs-fast-path/README.md'],
    expected: true,
    why: 'still under docs/, and also still .md — matches on either arm',
  },
];

const NOT_DOCS_ONLY_CASES: Case[] = [
  {
    name: 'a docs file plus a server file (mixed push)',
    files: ['docs/foo.md', 'server/app.ts'],
    expected: false,
    why: 'adversarial case from the lane brief — one non-docs file anywhere in the set fails the whole push',
  },
  {
    name: '.github/workflows/ci.yml alone',
    files: ['.github/workflows/ci.yml'],
    expected: false,
    why: 'adversarial case from the lane brief — a workflow file is not documentation; it is the thing '
      + 'whose own gates this classifier exists to keep honest',
  },
  {
    name: 'Dockerfile alone',
    files: ['Dockerfile'],
    expected: false,
    why: 'build surface, not prose, and named explicitly in the brief as NOT docs',
  },
  {
    name: 'package.json alone',
    files: ['package.json'],
    expected: false,
    why: 'dependency/script surface, not prose, and named explicitly in the brief as NOT docs',
  },
  {
    name: 'a path that CONTAINS "docs" but is not under the docs/ directory',
    files: ['src/docs-panel.tsx'],
    expected: false,
    why: 'adversarial case from the lane brief — matching must be on the first PATH SEGMENT, not a '
      + 'substring; a component merely named with "docs" in it is ordinary source',
  },
  {
    name: 'a non-markdown file under a directory whose name merely STARTS WITH "docs"',
    files: ['docsite/config.json'],
    expected: false,
    why: 'guards against a naive prefix match (`startsWith("docs")` instead of `startsWith("docs/")`) '
      + 'that would wrongly treat a same-prefixed sibling directory as the docs/ tree; note this file '
      + 'does NOT also match **/*.md, unlike a markdown file in the same directory would',
  },
  {
    name: 'an empty change set',
    files: [],
    expected: false,
    why: 'adversarial case from the lane brief — decided and justified in scripts/lib/docs-only.mjs\'s '
      + 'header: an empty set is either a true no-op (nothing saved by a fast path) or a sign the diff '
      + 'could not be computed, and the conservative default for an unclassifiable input is "run everything"',
  },
  {
    name: 'a test file under tests/ that happens to test docs behavior',
    files: ['tests/core/brain-coverage.test.ts'],
    expected: false,
    why: 'the test file itself is code, even though what it tests is documentation freshness',
  },
  {
    name: 'a scripts/ file that generates documentation',
    files: ['scripts/brain-graph.mjs'],
    expected: false,
    why: 'the generator is code; changing it can change what the generated docs SHOULD say, which is '
      + 'exactly the case check-brain and the full test suite must still run to catch',
  },
];

describe('classifyDocsOnly — docs-only pushes classify true', () => {
  for (const c of DOCS_ONLY_CASES) {
    it(`${c.name} -> docs-only`, () => {
      assert.equal(classifyDocsOnly(c.files), c.expected, c.why);
    });
  }
});

describe('classifyDocsOnly — mixed or non-docs pushes classify false', () => {
  for (const c of NOT_DOCS_ONLY_CASES) {
    it(`${c.name} -> NOT docs-only`, () => {
      assert.equal(classifyDocsOnly(c.files), c.expected, c.why);
    });
  }
});

describe('classifyDocsOnly — order and duplicates do not matter', () => {
  it('is insensitive to file order', () => {
    assert.equal(classifyDocsOnly(['server/app.ts', 'docs/foo.md']), false);
    assert.equal(classifyDocsOnly(['docs/a.md', 'docs/b.md']), true);
    assert.equal(classifyDocsOnly(['docs/b.md', 'docs/a.md']), true);
  });

  it('one non-docs file anywhere in a large set still fails the whole set', () => {
    const files = Array.from({ length: 50 }, (_, i) => `docs/file-${i}.md`);
    files.push('server/lib/one-line-change.ts');
    assert.equal(classifyDocsOnly(files), false);
  });
});

describe('isDocsPath — the per-file predicate the classifier folds over', () => {
  it('normalizes a leading "./" and backslashes before matching', () => {
    assert.equal(isDocsPath('./docs/foo.md'), true);
    assert.equal(isDocsPath('docs\\foo.md'), true);
  });

  it('is case-insensitive on the .md extension only', () => {
    assert.equal(isDocsPath('NOTES.MD'), true);
    assert.equal(isDocsPath('notes.Md'), true);
  });

  it('rejects non-string and empty input rather than throwing', () => {
    assert.equal(isDocsPath(''), false);
    // Deliberately passing non-string input to prove the guard — docs-only.mjs
    // is plain JS (no `checkJs`), so these calls type-check as `any` and need
    // no suppression; the runtime guard is what is actually under test.
    assert.equal(isDocsPath(null as unknown as string), false);
    assert.equal(isDocsPath(undefined as unknown as string), false);
  });
});

describe('classifyDocsOnly — malformed input fails safe, not open', () => {
  it('a non-array is NOT docs-only', () => {
    // Deliberately wrong types, proving the fail-safe default at runtime.
    assert.equal(classifyDocsOnly(null as unknown as string[]), false);
    assert.equal(classifyDocsOnly(undefined as unknown as string[]), false);
    assert.equal(classifyDocsOnly('docs/foo.md' as unknown as string[]), false);
  });

  it('a non-string entry inside an otherwise-docs array is NOT docs-only', () => {
    assert.equal(classifyDocsOnly(['docs/foo.md', null as unknown as string]), false);
  });
});
