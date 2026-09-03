// scripts/check-doctor-output-identity.mjs — the comparison LOGIC (not the
// --tree/--out snapshot run, which needs two real repo checkouts and is
// exercised manually per the script's own header). This file builds small
// synthetic snapshot dirs in the same on-disk shape snapshotTree() writes
// (`_index.json` + one `<safeName>.json` per fixture) and drives
// computeCompare()/renderCompareReport() directly, covering:
//   - the original no-flags byte-identity behavior (unchanged),
//   - --ignore-keys: a listed key may differ freely, everything else must
//     not, and the per-key differ-count the compare prints must be accurate,
//   - --require-added: the compare fails unless a listed key is present in
//     every AFTER report and absent from every BEFORE report,
//   - the getAtPath/omitAtPath dotted-path helpers in isolation.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

import {
  canonical,
  getAtPath,
  omitAtPath,
  parseKeyList,
  computeCompare,
  renderCompareReport,
} from '../../scripts/check-doctor-output-identity.mjs';

// ---------------------------------------------------------------------------
// Synthetic snapshot-dir builder — mirrors snapshotTree()'s on-disk format.
// ---------------------------------------------------------------------------

interface Fixture { name: string; report: Record<string, unknown> }

function writeSnapshotDir(fixtures: Fixture[]): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'sm-doctor-identity-'));
  const index: Array<{ name: string; sha256: string; bytes: number; sceneCount: number }> = [];
  for (const { name, report } of fixtures) {
    const json = JSON.stringify(canonical(report), null, 2);
    const safe = name.replace(/[^A-Za-z0-9._-]+/g, '__');
    writeFileSync(path.join(dir, `${safe}.json`), json, 'utf8');
    index.push({
      name,
      sha256: createHash('sha256').update(json).digest('hex'),
      bytes: Buffer.byteLength(json, 'utf8'),
      sceneCount: typeof report.sceneCount === 'number' ? report.sceneCount : 0,
    });
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, '_index.json'), JSON.stringify(index, null, 2), 'utf8');
  return dir;
}

function baseReport(overrides: Record<string, unknown> = {}) {
  return { health: 78, verdict: 'CONSIDER', sceneCount: 12, totalIssues: 5, ...overrides };
}

// ---------------------------------------------------------------------------
// parseKeyList
// ---------------------------------------------------------------------------

describe('parseKeyList', () => {
  it('splits, trims, and drops empties', () => {
    assert.deepEqual(parseKeyList('a, b ,c'), ['a', 'b', 'c']);
    assert.deepEqual(parseKeyList(''), []);
    assert.deepEqual(parseKeyList(undefined), []);
    assert.deepEqual(parseKeyList('a,,b'), ['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// getAtPath / omitAtPath
// ---------------------------------------------------------------------------

describe('getAtPath', () => {
  it('reads a top-level key', () => {
    assert.deepEqual(getAtPath({ a: 1 }, 'a'), { present: true, value: 1 });
  });

  it('reads a nested dotted path', () => {
    assert.deepEqual(getAtPath({ a: { b: { c: 'x' } } }, 'a.b.c'), { present: true, value: 'x' });
  });

  it('reports absent for a missing key at any depth', () => {
    assert.equal(getAtPath({ a: 1 }, 'b').present, false);
    assert.equal(getAtPath({ a: { b: 1 } }, 'a.c').present, false);
  });

  it('treats a path through an array or primitive as absent (cheap dotted-path support)', () => {
    assert.equal(getAtPath({ a: [1, 2] }, 'a.0').present, false);
    assert.equal(getAtPath({ a: 'x' }, 'a.b').present, false);
    assert.equal(getAtPath(null, 'a').present, false);
  });
});

describe('omitAtPath', () => {
  it('removes a top-level key without mutating the input', () => {
    const obj = { a: 1, b: 2 };
    const out = omitAtPath(obj, 'a');
    assert.deepEqual(out, { b: 2 });
    assert.deepEqual(obj, { a: 1, b: 2 }, 'input must not be mutated');
  });

  it('removes a nested key, cloning only the spine', () => {
    const obj = { a: { b: 1, c: 2 }, d: 3 };
    const out = omitAtPath(obj, 'a.b');
    assert.deepEqual(out, { a: { c: 2 }, d: 3 });
  });

  it('is a no-op when the path does not resolve', () => {
    const obj = { a: 1 };
    assert.deepEqual(omitAtPath(obj, 'missing'), obj);
    assert.deepEqual(omitAtPath(obj, 'a.deeper'), obj);
  });
});

// ---------------------------------------------------------------------------
// computeCompare — no flags (original byte-identity behavior)
// ---------------------------------------------------------------------------

describe('computeCompare — no flags', () => {
  it('two identical snapshot dirs -> exit 0, no differences', () => {
    const fixtures = [
      { name: 'fixture/a', report: baseReport() },
      { name: 'fixture/b', report: baseReport({ health: 91 }) },
    ];
    const before = writeSnapshotDir(fixtures);
    const after = writeSnapshotDir(fixtures);
    const result = computeCompare(before, after);
    assert.equal(result.exitCode, 0);
    assert.equal(result.contentDifferences, 0);
    assert.equal(result.totalCompared, 2);
    const report = renderCompareReport(result);
    assert.match(report, /OUTPUT IDENTITY: PASS — all 2 reports are byte-identical \(analyzedAt excluded\)\./);
  });

  it('a changed field in one fixture -> exit 1, named as differing', () => {
    const before = writeSnapshotDir([{ name: 'fixture/a', report: baseReport() }]);
    const after = writeSnapshotDir([{ name: 'fixture/a', report: baseReport({ health: 55 }) }]);
    const result = computeCompare(before, after);
    assert.equal(result.exitCode, 1);
    assert.equal(result.contentDifferences, 1);
    assert.equal(result.fixtures[0].status, 'differs');
    const report = renderCompareReport(result);
    assert.match(report, /! fixture\/a: report differs/);
    assert.match(report, /OUTPUT IDENTITY: FAIL — 1 fixture\(s\) differ\./);
  });

  it('a fixture present only after, or only before, counts as a difference', () => {
    const before = writeSnapshotDir([{ name: 'fixture/a', report: baseReport() }]);
    const after = writeSnapshotDir([
      { name: 'fixture/a', report: baseReport() },
      { name: 'fixture/new', report: baseReport() },
    ]);
    const result = computeCompare(before, after);
    assert.equal(result.exitCode, 1);
    assert.equal(result.fixtures.some((f) => f.name === 'fixture/new' && f.status === 'onlyAfter'), true);
  });
});

// ---------------------------------------------------------------------------
// computeCompare — --ignore-keys
// ---------------------------------------------------------------------------

describe('computeCompare — --ignore-keys', () => {
  it('a field listed as ignored may differ in every fixture while the compare still PASSES', () => {
    const before = writeSnapshotDir([
      { name: 'fixture/a', report: baseReport({ plainSummary: 'old summary A' }) },
      { name: 'fixture/b', report: baseReport({ plainSummary: 'old summary B' }) },
    ]);
    const after = writeSnapshotDir([
      { name: 'fixture/a', report: baseReport({ plainSummary: 'new summary A' }) },
      { name: 'fixture/b', report: baseReport({ plainSummary: 'new summary B' }) },
    ]);
    const result = computeCompare(before, after, { ignoreKeys: ['plainSummary'] });
    assert.equal(result.exitCode, 0);
    assert.equal(result.contentDifferences, 0);
    assert.equal(result.ignoredKeyDiffCounts.plainSummary, 2, 'both fixtures differ in the ignored key');
    const report = renderCompareReport(result);
    assert.match(report, /"plainSummary": differs in 2\/2 reports/);
    assert.match(report, /OUTPUT IDENTITY: PASS — all 2 reports are byte-identical modulo the ignored key\(s\) \[plainSummary\]/);
  });

  it('an ignored key that does NOT actually differ in a fixture is counted honestly (0, not N)', () => {
    const shared = { name: 'fixture/a', report: baseReport({ plainSummary: 'same for both' }) };
    const before = writeSnapshotDir([shared]);
    const after = writeSnapshotDir([{ ...shared, report: { ...shared.report, health: 99 } }]);
    const result = computeCompare(before, after, { ignoreKeys: ['plainSummary'] });
    assert.equal(result.ignoredKeyDiffCounts.plainSummary, 0);
    // health is NOT ignored, so this must still be a real (non-ignorable) difference.
    assert.equal(result.exitCode, 1);
    assert.equal(result.contentDifferences, 1);
  });

  it('a non-ignored field differing alongside an ignored one still FAILS the compare', () => {
    const before = writeSnapshotDir([{ name: 'fixture/a', report: baseReport({ plainSummary: 'old' }) }]);
    const after = writeSnapshotDir([{ name: 'fixture/a', report: baseReport({ plainSummary: 'new', health: 12 }) }]);
    const result = computeCompare(before, after, { ignoreKeys: ['plainSummary'] });
    assert.equal(result.exitCode, 1, 'health moved too — ignoring plainSummary must not hide that');
    assert.equal(result.fixtures[0].status, 'differs');
  });

  it('supports a dotted path so a nested field can be ignored without ignoring its whole parent object', () => {
    const before = writeSnapshotDir([{
      name: 'fixture/a',
      report: baseReport({ provenance: { engineCommit: 'abc', rulebookCount: 3217, note: 'x' } }),
    }]);
    const after = writeSnapshotDir([{
      name: 'fixture/a',
      report: baseReport({ provenance: { engineCommit: 'def', rulebookCount: 3217, note: 'x' } }),
    }]);
    const ignoredOnlyEngine = computeCompare(before, after, { ignoreKeys: ['provenance.engineCommit'] });
    assert.equal(ignoredOnlyEngine.exitCode, 0);
    assert.equal(ignoredOnlyEngine.ignoredKeyDiffCounts['provenance.engineCommit'], 1);

    // Sanity: rulebookCount genuinely did NOT change, so ignoring it should
    // report zero differences even though its sibling did change.
    const alsoTrackingRulebookCount = computeCompare(before, after, {
      ignoreKeys: ['provenance.engineCommit', 'provenance.rulebookCount'],
    });
    assert.equal(alsoTrackingRulebookCount.ignoredKeyDiffCounts['provenance.rulebookCount'], 0);
  });
});

// ---------------------------------------------------------------------------
// computeCompare — --require-added
// ---------------------------------------------------------------------------

describe('computeCompare — --require-added', () => {
  it('passes when the key is present in every AFTER and absent from every BEFORE', () => {
    const before = writeSnapshotDir([
      { name: 'fixture/a', report: baseReport() },
      { name: 'fixture/b', report: baseReport() },
    ]);
    const after = writeSnapshotDir([
      { name: 'fixture/a', report: baseReport({ provenance: { engineCommit: 'x' } }) },
      { name: 'fixture/b', report: baseReport({ provenance: { engineCommit: 'y' } }) },
    ]);
    const result = computeCompare(before, after, {
      ignoreKeys: ['provenance'],
      requireAdded: ['provenance'],
    });
    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.requireAddedViolations, []);
    const report = renderCompareReport(result);
    assert.match(report, /Required-added keys confirmed present in every AFTER report and absent from every BEFORE report: provenance/);
  });

  it('fails when the key is missing from one AFTER report', () => {
    const before = writeSnapshotDir([
      { name: 'fixture/a', report: baseReport() },
      { name: 'fixture/b', report: baseReport() },
    ]);
    const after = writeSnapshotDir([
      { name: 'fixture/a', report: baseReport({ provenance: { engineCommit: 'x' } }) },
      { name: 'fixture/b', report: baseReport() }, // missing provenance
    ]);
    const result = computeCompare(before, after, {
      ignoreKeys: ['provenance'],
      requireAdded: ['provenance'],
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.requireAddedViolations.length, 1);
    assert.equal(result.requireAddedViolations[0].fixture, 'fixture/b');
    assert.match(result.requireAddedViolations[0].reason, /absent from AFTER/);
    const report = renderCompareReport(result);
    assert.match(report, /REQUIRE-ADDED FAILURES:/);
    assert.match(report, /"provenance" in fixture\/b: absent from AFTER/);
  });

  it('fails when the key is already present in a BEFORE report (not a clean addition)', () => {
    const before = writeSnapshotDir([
      { name: 'fixture/a', report: baseReport({ provenance: { engineCommit: 'stale' } }) },
    ]);
    const after = writeSnapshotDir([
      { name: 'fixture/a', report: baseReport({ provenance: { engineCommit: 'x' } }) },
    ]);
    const result = computeCompare(before, after, {
      ignoreKeys: ['provenance'],
      requireAdded: ['provenance'],
    });
    assert.equal(result.exitCode, 1);
    assert.ok(result.requireAddedViolations.some((v) => /present in BEFORE/.test(v.reason)));
  });

  it('a require-added failure fails the compare even when content is otherwise byte-identical', () => {
    // Simulates the exact laundering attempt --require-added exists to catch:
    // a field silently REMOVED (not added) is masked by --ignore-keys alone.
    const before = writeSnapshotDir([{ name: 'fixture/a', report: baseReport({ oldField: 'value' }) }]);
    const after = writeSnapshotDir([{ name: 'fixture/a', report: baseReport() }]); // oldField dropped
    const withoutRequireAdded = computeCompare(before, after, { ignoreKeys: ['oldField'] });
    assert.equal(withoutRequireAdded.exitCode, 0, 'ignore-keys alone hides the removal — this is the hole require-added closes');

    const withRequireAdded = computeCompare(before, after, {
      ignoreKeys: ['oldField'],
      requireAdded: ['oldField'],
    });
    assert.equal(withRequireAdded.exitCode, 1);
    assert.ok(withRequireAdded.requireAddedViolations.some((v) => /present in BEFORE/.test(v.reason)));
  });
});
