// The docs-only fast path's test list must be DERIVED, not remembered.
//
// ── Why this file exists ───────────────────────────────────────────────────
//
// `.github/workflows/ci.yml`'s "Run docs-gating tests (docs-only fast path)"
// step replaces the full `npm test` on a docs-only push. It is a hand-typed
// list of paths inside a shell loop, in two workflow files. Round 1 of
// lane/ci-docs-fast-path selected that list by judgment from one `grep -rl`,
// and the list was wrong before it ever merged:
//
//   * `tests/routes/root-cause-parity.test.ts` reads
//     `docs/brain/Surfaces/Surface - Root Cause Pipeline.md` and asserts the
//     note quotes six live-measured values. Editing one table row: fast path
//     GREEN, full path 1 fail. (Round-2 review, blocker 2.)
//   * `tests/core/scoring-receipt-guard.test.ts` reads the REAL committed
//     `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`. Rewording one ledger
//     heading: fast path GREEN, full path 1 fail. (Round-2 review, blocker 3
//     — and the README's stated reason for excluding it was factually
//     wrong.)
//   * `tests/core/telemetry-docs-truth.test.ts` reads the real committed
//     `ROADMAP.md` and asserts thirteen phrases inside its P3 section. A
//     root-level `.md` file IS docs to the classifier. Found by this file's
//     derivation, which sees `'../../ROADMAP.md'` where the review's
//     `grep -l "'docs/"` could not.
//
// That is the same failure shape `tests/core/brain-coverage.test.ts` exists
// to prevent for brain notes: a list nobody is forced to extend. This test
// recomputes the candidate set from the tests themselves and fails when a
// suite that reads committed documentation appears in NEITHER the workflow
// list NOR the explicit, reasoned exclusion table below. An exclusion becomes
// a decision someone had to write down in a diff a reviewer will read, rather
// than an omission nobody noticed.
//
// ── The derivation, stated precisely ───────────────────────────────────────
//
// A `tests/**/*.test.ts` file is a CANDIDATE when both hold:
//
//   1. it, or a non-test module it imports directly (one hop), calls a
//      filesystem READ api — `readFileSync`, `readdirSync`, `existsSync`,
//      `statSync`, `lstatSync`, `opendirSync`, `globSync`, `readFile`; and
//   2. it, or that same one-hop module, contains a STRING LITERAL (taken from
//      the TypeScript parser, so a comment can never contribute one) that
//      resolves — against the repository root or against the containing
//      file's own directory — to a path that EXISTS in this checkout and that
//      the classifier itself would call docs: `docs`, anything under `docs/`,
//      or anything ending in `.md`.
//
// The one-hop arm is not decoration. `tests/core/p0-sample-drift.test.ts`
// names no docs path at all; it reads `OUT_FILE` imported from
// `scripts/generate-p0-sample-report.ts`, which builds
// `docs/user-validation/sample-coverage-report.html`. A literal-only
// derivation misses it, and it is one of the suites the fast path most needs.
//
// "Resolves to a path that exists" is what keeps this honest without
// drowning in noise: a `docs/…` path quoted inside an ERROR MESSAGE is a
// sentence, not a path, so it resolves to nothing and never becomes a
// candidate. That is why `tests/core/blind-pairs-discrimination.test.ts` and
// `tests/core/docker-context.test.ts` — both hand-excluded in round 1 with
// prose reasons — need no entry here at all: the derivation agrees they are
// not candidates, mechanically.
//
// ── What this test does NOT claim ──────────────────────────────────────────
//
// It does not claim the derivation is complete. A test that reads a docs file
// through a path assembled at runtime from non-literal parts, or through a
// module more than one import hop away, is invisible to it. Two hops were
// considered and rejected: `server/lib/rulebook-count.ts` reads
// `docs/rulebook/coverage.json` at module load and is reachable from
// `doctor.ts`, so a two-hop rule would make most of the suite a candidate
// while adding nothing — a change to that JSON is already caught by
// `tests/core/rulebook.test.ts` and `tests/core/rule-test-coverage.test.ts`,
// both of which are IN the list. The claim is narrower and checkable: every
// suite the derivation CAN see is either run on the fast path or excluded on
// a written, currently-true reason.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '../..');
const CI_YML = path.join(ROOT, '.github/workflows/ci.yml');
const RELEASE_YML = path.join(ROOT, '.github/workflows/release.yml');
const STEP_NAME = 'Run docs-gating tests (docs-only fast path)';

const FS_READ_RE = /\b(readFileSync|readdirSync|existsSync|statSync|lstatSync|opendirSync|globSync|readFile)\s*\(/;

/**
 * Suites the derivation finds but the fast path deliberately does NOT run.
 * Every entry needs a reason a reader can CHECK against the file, not a
 * category label. A stale entry — one whose file is gone, or which the
 * derivation no longer considers a candidate — fails this suite, so the
 * table cannot rot into a permanent silencer.
 */
const EXCLUDED: Record<string, string> = {
  'tests/core/check-scoring-receipt.test.ts':
    'Behavioral test of scripts/check-scoring-receipt.mjs over synthetic throwaway repos built with '
    + 'mkdtempSync. Its `RECEIPT_REL` constant (line 22) is only ever joined onto a FIXTURE directory '
    + '(writeFile at :64, appendFileSync at :147/:179/:225); the only REPO_ROOT read in the file is '
    + 'scripts/lib/import-graph.mjs at :311, which is code. Nothing here asserts on the committed '
    + 'ledger. NOTE: its sibling tests/core/scoring-receipt-guard.test.ts IS in the list — round 1 '
    + 'excluded both on this one reason and the round-2 review proved it false for that file.',
  'tests/core/public-benchmark-limits.test.ts':
    'Imports PUBLIC_CORPUS_SETS from scripts/lib/public-benchmark.ts purely for its numeric limits; the '
    + '`provenanceFile` strings it inherits are never read here. The one suite that DOES read them '
    + '(tests/core/public-benchmark.test.ts:184) is in the list.',
  'tests/core/scene-segments.test.ts':
    'Same one-hop inheritance from scripts/lib/public-benchmark.ts. This file tests scene segmentation '
    + 'over fixture text and reads no .md at all.',
  'tests/core/sample-coverage-facts.test.ts':
    'Inherits docs/user-validation from scripts/generate-p0-sample-report.ts, but reads '
    + 'src/lib/sample-coverage-facts.ts — a SOURCE module, outside the docs allowlist. The sibling that '
    + 'reads that generator\'s committed docs/ artifact (tests/core/p0-sample-drift.test.ts) is in the list.',
  'tests/scripts/discharge-obligations.test.ts':
    'Builds its receipts with mkdtempSync/writeFileSync (imports at :22) and inherits the '
    + 'MEASUREMENT_RECEIPTS.md path constant from the script under test. It asserts on fixtures it wrote.',
  'tests/scripts/receipt-conversion.test.ts':
    'Imports four PURE functions (PENDING_PHRASES, extractEntries, pendingReason, validateEntry) from '
    + 'scripts/check-scoring-receipt.mjs and feeds them literal strings; the receipt path constant comes '
    + 'along with the import and is never used.',
  'tests/scripts/owner-measure-e2e.test.ts':
    'Real git clones, worktrees and pushes against throwaway repositories; every docs/ path it names is '
    + 'joined onto a fixture build directory or read through `git show <fixture-tip>:…`. It also times out '
    + 'past 60 s on a sandbox, so putting it on a path whose whole purpose is to cost seconds would defeat '
    + 'the fast path. Its schema-validating sibling, tests/scripts/owner-measure-plan.test.ts, IS in the '
    + 'list and is the one that reads the committed plan.',
  'tests/scripts/classify-docs-only.test.ts':
    'The fast path\'s own fixture suite. It WRITES README.md/ROADMAP.md/docs/** into throwaway git '
    + 'repositories under os.tmpdir(); the only committed files it reads are the three scripts it copies, '
    + 'which are code. Editing real documentation cannot change its result.',
};

/** Reads the `tests/…test.ts` paths out of a workflow's docs-gating step. */
function listedFiles(workflowSource: string, file: string): string[] {
  const lines = workflowSource.split('\n');
  const start = lines.findIndex((l) => l.trim() === `- name: ${STEP_NAME}`);
  assert.notEqual(start, -1, `${file} must keep a step named "${STEP_NAME}"`);
  const indent = lines[start].indexOf('-');
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (line.search(/\S/) <= indent) break;
    const m = /^\s*(tests\/\S+\.test\.ts)\s*\\?\s*$/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

/** Every `*.test.ts` under tests/, repo-relative, forward slashes. */
function testFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.endsWith('.test.ts')) out.push(abs);
    }
  };
  walk(path.join(ROOT, 'tests'));
  return out.map((p) => path.relative(ROOT, p).split(path.sep).join('/')).sort();
}

/** Every string literal in `source`, via the parser (so never a comment). */
function stringLiterals(source: string): string[] {
  const sf = ts.createSourceFile('scan.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** Relative import specifiers, via the parser. */
function importSpecifiers(source: string): string[] {
  const sf = ts.createSourceFile('scan.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) out.push(node.moduleSpecifier.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function resolveImport(fromFileAbs: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFileAbs), spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

/** The classifier's own notion of a docs path, applied to a repo-relative path. */
function isDocsRelPath(rel: string): boolean {
  return rel === 'docs' || rel.startsWith('docs/') || /\.md$/i.test(rel);
}

/** Candidate suites, each with the committed docs paths that made it one. */
function deriveCandidates(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const rel of testFiles()) {
    const abs = path.join(ROOT, rel);
    const src = fs.readFileSync(abs, 'utf8');
    const sources: Array<[string, string]> = [[abs, src]];
    for (const spec of importSpecifiers(src)) {
      const target = resolveImport(abs, spec);
      // Only NON-test modules: a test importing another test's helpers would
      // otherwise inherit that file's literals and blur the derivation.
      if (target && !target.includes(`${path.sep}tests${path.sep}`)) {
        sources.push([target, fs.readFileSync(target, 'utf8')]);
      }
    }
    if (!sources.some(([, text]) => FS_READ_RE.test(text))) continue;
    const hits = new Set<string>();
    for (const [origin, text] of sources) {
      for (const lit of stringLiterals(text)) {
        if (!lit || lit.length > 200 || lit.includes('\n')) continue;
        for (const base of [ROOT, path.dirname(origin)]) {
          const resolved = path.resolve(base, lit);
          if (!resolved.startsWith(ROOT + path.sep)) continue;
          const docRel = path.relative(ROOT, resolved).split(path.sep).join('/');
          if (!isDocsRelPath(docRel)) continue;
          if (!fs.existsSync(resolved)) continue;
          hits.add(docRel);
        }
      }
    }
    if (hits.size) found.set(rel, [...hits].sort());
  }
  return found;
}

describe('the docs-only fast path runs every suite that gates documentation', () => {
  const ci = fs.readFileSync(CI_YML, 'utf8');
  const release = fs.readFileSync(RELEASE_YML, 'utf8');
  const ciList = listedFiles(ci, 'ci.yml');
  const releaseList = listedFiles(release, 'release.yml');
  const candidates = deriveCandidates();

  it('ci.yml and release.yml list exactly the same files', () => {
    assert.deepEqual(
      releaseList,
      ciList,
      'the two workflows must run the same docs-gating set. ci-gates-intact.test.ts already requires the '
      + 'step bodies to be byte-identical; this states the consequence in the terms that matter, so a '
      + 'divergence names the files rather than printing two shell loops.',
    );
  });

  it('the list is non-empty, duplicate-free and sorted', () => {
    assert.ok(ciList.length > 0, 'an empty docs-gating list would make the fast path a `paths-ignore` in disguise');
    assert.deepEqual([...new Set(ciList)], ciList, 'a duplicated path runs a suite twice and hides a missing one');
    assert.deepEqual([...ciList].sort(), ciList,
      'keep the list sorted — an unsorted list makes an addition indistinguishable from a reordering in review');
  });

  it('every listed file exists', () => {
    const missing = ciList.filter((f) => !fs.existsSync(path.join(ROOT, f)));
    assert.deepEqual(missing, [],
      'the docs-only fast path runs `node --experimental-strip-types <file>` for each of these, so a '
      + 'renamed or deleted file turns the fast path red on every docs push');
  });

  it('every suite that reads committed documentation is run or explicitly excluded', () => {
    const uncovered = [...candidates.keys()]
      .filter((f) => !ciList.includes(f) && !(f in EXCLUDED))
      .map((f) => `${f}  (reads: ${candidates.get(f)!.join(', ')})`);
    assert.deepEqual(
      uncovered,
      [],
      'these suites read committed documentation but are neither on the docs-only fast path nor in this '
      + "file's EXCLUDED table. On a docs-only push the fast path would go GREEN where the full path goes "
      + 'RED — exactly the regression the round-2 review found twice. Add the file to the list in BOTH '
      + '.github/workflows/ci.yml and .github/workflows/release.yml, or add an EXCLUDED entry saying, '
      + 'specifically, what it reads instead and why a documentation edit cannot change its result.',
    );
  });

  it('no exclusion has gone stale', () => {
    for (const [file, reason] of Object.entries(EXCLUDED)) {
      assert.ok(fs.existsSync(path.join(ROOT, file)), `EXCLUDED names ${file}, which no longer exists`);
      assert.ok(
        candidates.has(file),
        `EXCLUDED names ${file}, which the derivation no longer considers a candidate. Delete the entry — a `
        + 'silencer for a case that cannot occur hides the next real one.',
      );
      assert.ok(reason.length > 80 && /\.(ts|mjs|md|json|html)\b|:\d+/.test(reason),
        `${file}'s exclusion reason must cite a file or a line, not a category — got: ${reason}`);
    }
  });

  it('nothing is both listed and excluded', () => {
    const both = ciList.filter((f) => f in EXCLUDED);
    assert.deepEqual(both, [], 'a file cannot be both on the fast path and excluded from it');
  });

  it('the three suites the round-2 review found missing are on the list', () => {
    // Named individually, not merely covered by the derivation above: these
    // are the concrete regressions, and a future refactor of the derivation
    // must not be able to quietly drop them.
    for (const f of [
      'tests/routes/root-cause-parity.test.ts',
      'tests/core/scoring-receipt-guard.test.ts',
      'tests/core/telemetry-docs-truth.test.ts',
    ]) {
      assert.ok(ciList.includes(f), `${f} gates committed documentation and must run on the docs-only fast path`);
      assert.ok(candidates.has(f), `${f} must still be derivable as a candidate`);
    }
  });

  it('the derivation actually found the docs each listed suite reads', () => {
    // A derivation that returned nothing would make the coverage assertion
    // above vacuously green. Most of the list must be reachable BY the
    // derivation, not merely present in the workflow.
    const derived = ciList.filter((f) => candidates.has(f));
    assert.ok(
      derived.length >= ciList.length - 1,
      `only ${derived.length} of ${ciList.length} listed suites are derivable — the derivation has broken, `
      + 'and the coverage assertion above is no longer meaningful. Listed but not derived: '
      + ciList.filter((f) => !candidates.has(f)).join(', '),
    );
  });
});
