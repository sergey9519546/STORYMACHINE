// THE RE-LOCK THAT CANNOT RE-ORDER THE MANIFEST.
//
// tests/fixtures/real-corpus-manifest.README.md carries the constraint this
// file enforces: the array ORDER is load-bearing, because
// tests/core/real-script-corpus.test.ts measures the AUC-24 floor over
// `MANIFEST.slice(0, 24)`. Sorting the array — "even for a reasonable-looking
// reason like sort by id" — keeps that assertion passing while silently
// changing which 24 scripts it measures. The README also said no automated
// re-lock existed, which is why the re-lock was a hand edit over 72 rows, which
// is exactly where an accidental sort comes from.
//
// Every refusal below is shown FIRING on the input it exists for, and the
// sorted-array case is shown failing before the in-place case is shown passing.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  MEASURED_FIELDS, RelockError, assertOrderPreserved, relockManifest, serializeManifest,
} from '../../scripts/lib/manifest-relock.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const REAL_MANIFEST = path.join(REPO, 'tests/fixtures/real-corpus-manifest.json');

type Row = {
  name?: string; file: string; contentHash: string;
  health: number; verdict: string; sceneCount: number;
};

function manifestOf(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `script-${i}`,
    file: `script-${String(i).padStart(3, '0')}.fountain`,
    // Hashes that do NOT sort into index order, so a sort-by-hash is visible.
    contentHash: `${(n - i) * 7 % 97}`.padStart(64, '0') + '',
    health: 90 + (i % 5),
    verdict: 'RECOMMEND',
    sceneCount: 40 + i,
  }));
}

function freshFrom(manifest: Row[], mutate: (row: Row, i: number) => Partial<Row> = () => ({})) {
  return manifest.map((row, i) => ({
    index: i,
    contentHash: row.contentHash,
    health: row.health,
    verdict: row.verdict,
    sceneCount: row.sceneCount,
    ...mutate(row, i),
  }));
}

describe('a re-lock maps the array in place', () => {
  it('keeps every row at its own index, and moves only the measured fields', () => {
    const before = manifestOf(72);
    const fresh = freshFrom(before, (_r, i) => (i === 3 ? { health: 81.5, verdict: 'CONSIDER', sceneCount: 39 } : {}));
    const { manifest, changes } = relockManifest(before, fresh);
    assert.equal(manifest.length, 72);
    assert.deepEqual(manifest.map((m) => m.file), before.map((m) => m.file));
    assert.deepEqual(changes.map((c) => c.field).sort(), [...MEASURED_FIELDS].sort());
    assert.equal(manifest[3].health, 81.5);
    assert.equal(manifest[3].verdict, 'CONSIDER');
    assert.equal(manifest[3].sceneCount, 39);
    assert.equal(manifest[3].name, before[3].name, 'identity fields are carried through untouched');
    assert.equal(manifest[3].contentHash, before[3].contentHash);
  });

  it('an unchanged corpus produces no changes and the same bytes', () => {
    const before = manifestOf(24);
    const { manifest, changes } = relockManifest(before, freshFrom(before));
    assert.deepEqual(changes, []);
    assert.equal(serializeManifest(manifest), serializeManifest(before));
  });

  it('the fresh rows may arrive in any order — they are index-keyed', () => {
    const before = manifestOf(10);
    const shuffled = [...freshFrom(before, (_r, i) => ({ health: 70 + i }))].reverse();
    const { manifest } = relockManifest(before, shuffled);
    for (let i = 0; i < 10; i++) assert.equal(manifest[i].health, 70 + i);
  });
});

describe('assertOrderPreserved REFUSES a re-ordered array', () => {
  it('fires on a manifest sorted by id — the README\'s named hazard', () => {
    const before = manifestOf(30);
    const sorted = [...before].sort((a, b) => a.contentHash.localeCompare(b.contentHash));
    assert.notDeepEqual(sorted.map((r) => r.file), before.map((r) => r.file));
    assert.throws(() => assertOrderPreserved(before, sorted), (err: unknown) => {
      assert.ok(err instanceof RelockError);
      assert.match((err as Error).message, /row \d+ is not the same script/);
      assert.ok((err as RelockError).detail.some((l: string) => /MANIFEST\.slice\(0, 24\)/.test(l)));
      return true;
    });
  });

  it('fires on a dropped row', () => {
    const before = manifestOf(30);
    assert.throws(() => assertOrderPreserved(before, before.slice(0, 29)), /has 29 rows, the committed one has 30/);
  });

  it('fires on two rows swapped, even in the tail', () => {
    const before = manifestOf(30);
    const swapped = before.slice();
    [swapped[28], swapped[29]] = [swapped[29], swapped[28]];
    assert.throws(() => assertOrderPreserved(before, swapped), /row 28 is not the same script/);
  });

  it('passes the honest, in-place case', () => {
    const before = manifestOf(30);
    const after = before.map((r) => ({ ...r, health: r.health + 1 }));
    assert.doesNotThrow(() => assertOrderPreserved(before, after));
  });
});

describe('refusals a partial or drifted corpus earns', () => {
  it('refuses a partial re-lock — some rows fresh, some stale, is unreadable', () => {
    const before = manifestOf(24);
    assert.throws(() => relockManifest(before, freshFrom(before).slice(0, 20)), (err: unknown) => {
      assert.ok(err instanceof RelockError);
      assert.match((err as Error).message, /20 of 24 rows were measured/);
      return true;
    });
  });

  it('refuses two measurements claiming the same row', () => {
    const before = manifestOf(4);
    const fresh = freshFrom(before);
    fresh[1].index = 0;
    assert.throws(() => relockManifest(before, fresh), /two fresh measurements claim index 0/);
  });

  it('refuses an index that is not a row of this manifest', () => {
    const before = manifestOf(4);
    const fresh = freshFrom(before);
    fresh[3].index = 9;
    assert.throws(() => relockManifest(before, fresh), /index 9, which is not a row/);
  });

  it('refuses a row whose local bytes no longer hash to the locked contentHash', () => {
    const before = manifestOf(24);
    const fresh = freshFrom(before, (_r, i) => (i === 7 ? { contentHash: 'f'.repeat(64) } : {}));
    assert.throws(() => relockManifest(before, fresh), (err: unknown) => {
      assert.ok(err instanceof RelockError);
      assert.match((err as Error).message, /1 of 24 local files no longer hash/);
      assert.ok((err as RelockError).detail.some((l: string) => /row 7: \w{8} -> f{8}/.test(l)));
      return true;
    });
  });

  it('allowHashChange re-locks the hash too, and says which rows moved', () => {
    const before = manifestOf(24);
    const fresh = freshFrom(before, (_r, i) => (i === 7 ? { contentHash: 'f'.repeat(64), health: 70 } : {}));
    const { manifest, hashDrift } = relockManifest(before, fresh, { allowHashChange: true });
    assert.equal(manifest[7].contentHash, 'f'.repeat(64));
    assert.equal(manifest[7].health, 70);
    assert.deepEqual(hashDrift.map((d) => d.index), [7]);
  });

  it('refuses a measurement missing a measured field', () => {
    const before = manifestOf(4);
    const fresh = freshFrom(before).map((r, i) => (i === 2 ? { ...r, verdict: undefined } : r));
    assert.throws(() => relockManifest(before, fresh as never), /row 2 has no `verdict`/);
  });

  it('refuses an empty committed manifest', () => {
    assert.throws(() => relockManifest([], []), /non-empty array/);
  });
});

describe('against the committed 72-row manifest', () => {
  it('re-serialises byte-identically when nothing moved', () => {
    const raw = readFileSync(REAL_MANIFEST, 'utf8');
    const manifest = JSON.parse(raw) as Row[];
    assert.equal(manifest.length, 72, 'the committed manifest is the 72-row one this re-lock is for');
    const { manifest: relocked, changes } = relockManifest(manifest, freshFrom(manifest));
    assert.deepEqual(changes, []);
    assert.equal(serializeManifest(relocked), raw, 'a no-op re-lock must not reformat the committed file');
  });

  it('the first 24 rows are still the first 24 after a re-lock — the floor\'s subset', () => {
    const manifest = JSON.parse(readFileSync(REAL_MANIFEST, 'utf8')) as Row[];
    const { manifest: relocked } = relockManifest(manifest, freshFrom(manifest, () => ({ health: 88 })));
    assert.deepEqual(
      relocked.slice(0, 24).map((m) => m.file),
      manifest.slice(0, 24).map((m) => m.file),
    );
  });
});
