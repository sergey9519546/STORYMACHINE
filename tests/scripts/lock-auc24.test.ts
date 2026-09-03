// scripts/lock-auc24.mjs — every guard, and the happy path, on a machine with
// no real corpus.
//
// WHY THIS CAN BE TESTED AT ALL: the lock script's measurement is an exported
// function taking every path as an argument, so this file points it at a
// SYNTHETIC manifest and a SYNTHETIC corpus in a temp dir and runs the real
// doctor over them. Nothing here touches the real corpus (it does not exist in
// CI or in this sandbox) and nothing here fabricates a real-corpus number: the
// health values below come from the actual scoring pipeline running on scripts
// this file generates. The committed tests/fixtures/auc24-table.json can only
// be produced by the owner, locally, on real text — that step is deliberately
// not simulated anywhere.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { lockAuc24, LockRefusal, serializeTable } from '../../scripts/lock-auc24.mjs';
import { AUC24_DEGRADATION_ID, aucFromTable, degradationSeed } from '../../scripts/lib/auc.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

const SUBSET = 6; // the real subset is 24; 6 keeps this test fast and proves the same paths

/** A synthetic screenplay with `n` scenes. Deliberately varied in length so
 *  the health values differ from row to row — a table where every value is
 *  identical would give AUC 0.5 and hide an arithmetic mistake. */
function syntheticScript(n: number, tag: number): string {
  const scenes: string[] = [];
  for (let i = 0; i < n; i++) {
    scenes.push(
      `INT. ROOM ${i} - ${i % 2 ? 'NIGHT' : 'DAY'}\n\n`
      + `A man waits by the window as the rain starts. He checks the clock and decides.\n\n`
      + `MAN\nWe should go now, before the road floods.\n\n`
      + `WOMAN\nNot yet. Wait for the signal.\n\n`
      + `He opens the door anyway.\n`,
    );
  }
  return `Title: Synthetic ${tag}\n\n${scenes.join('\n')}`;
}

describe('lock-auc24 — guards', () => {
  let dir: string;
  before(() => { dir = mkdtempSync(path.join(tmpdir(), 'auc24-guards-')); });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it('refuses to run with no corpus dir — a fabricated table is worse than no table', async () => {
    await assert.rejects(
      () => lockAuc24({ corpusDir: '', manifestPath: path.join(dir, 'm.json') }),
      (err: unknown) => err instanceof LockRefusal && /REAL_SCRIPT_CORPUS_DIR is not set/.test((err as Error).message),
    );
  });

  it('refuses a corpus dir that does not exist (the typo case)', async () => {
    writeFileSync(path.join(dir, 'm.json'), '[]');
    await assert.rejects(
      () => lockAuc24({ corpusDir: path.join(dir, 'nope'), manifestPath: path.join(dir, 'm.json') }),
      (err: unknown) => err instanceof LockRefusal && /does not exist or is not a directory/.test((err as Error).message),
    );
  });

  it('refuses a manifest with fewer entries than the subset size', async () => {
    const corpus = path.join(dir, 'corpus');
    mkdirSync(corpus, { recursive: true });
    writeFileSync(path.join(dir, 'short.json'), JSON.stringify([{ file: 'a.txt', contentHash: 'x'.repeat(64) }]));
    await assert.rejects(
      () => lockAuc24({ corpusDir: corpus, manifestPath: path.join(dir, 'short.json'), subsetSize: SUBSET }),
      (err: unknown) => err instanceof LockRefusal && /needs at least/.test((err as Error).message),
    );
  });

  it('refuses when fewer than the full subset resolves to a file — never a partial table', async () => {
    const corpus = path.join(dir, 'corpus');
    mkdirSync(corpus, { recursive: true });
    const entries = Array.from({ length: SUBSET }, (_, i) => ({
      file: `missing-${i}.txt`, contentHash: String(i).repeat(64).slice(0, 64),
    }));
    writeFileSync(path.join(dir, 'absent.json'), JSON.stringify(entries));
    await assert.rejects(
      () => lockAuc24({ corpusDir: corpus, manifestPath: path.join(dir, 'absent.json'), subsetSize: SUBSET }),
      (err: unknown) => err instanceof LockRefusal
        && /are not present in the corpus dir/.test((err as Error).message)
        // The refusal names the missing scripts by content-hash prefix only.
        && !/missing-0\.txt/.test((err as Error).message),
    );
  });

  it('refuses when a local file no longer matches its manifest content hash', async () => {
    const corpus = path.join(dir, 'drift');
    mkdirSync(corpus, { recursive: true });
    const entries = Array.from({ length: SUBSET }, (_, i) => {
      writeFileSync(path.join(corpus, `s${i}.txt`), syntheticScript(20 + i, i));
      return { file: `s${i}.txt`, contentHash: 'd'.repeat(64) }; // deliberately wrong
    });
    writeFileSync(path.join(dir, 'drift.json'), JSON.stringify(entries));
    await assert.rejects(
      () => lockAuc24({ corpusDir: corpus, manifestPath: path.join(dir, 'drift.json'), subsetSize: SUBSET }),
      (err: unknown) => err instanceof LockRefusal && /do not match their manifest content hash/.test((err as Error).message),
    );
  });
});

describe('lock-auc24 — happy path over a synthetic corpus', () => {
  let dir: string;
  let corpus: string;
  let manifestPath: string;
  let table: Awaited<ReturnType<typeof lockAuc24>>;

  before(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'auc24-lock-'));
    corpus = path.join(dir, 'corpus');
    mkdirSync(corpus, { recursive: true });
    // Build the manifest the way the real one was built: run the doctor once
    // per script and record what it actually produced. Nothing is invented.
    const entries: Array<{ name: string; file: string; contentHash: string; health: number }> = [];
    for (let i = 0; i < SUBSET; i++) {
      const file = `s${i}.fountain.txt`;
      const text = syntheticScript(18 + i * 4, i);
      writeFileSync(path.join(corpus, file), text);
      const report = await runScriptDoctor(text);
      entries.push({ name: `synthetic ${i}`, file, contentHash: report.contentHash!, health: report.health });
    }
    manifestPath = path.join(dir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(entries, null, 2));
    table = await lockAuc24({ corpusDir: corpus, manifestPath, subsetSize: SUBSET, gitSha: 'testsha' });
  });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it('produces exactly one row per subset entry, in manifest order', () => {
    assert.equal(table.rows.length, SUBSET);
    assert.deepEqual(table.rows.map((r) => r.manifestIndex), [0, 1, 2, 3, 4, 5]);
  });

  it('the header AUC equals the AUC recomputed from the rows', () => {
    assert.equal(table.measuredAuc, aucFromTable(table.rows));
  });

  it('records the seed each row was degraded with, re-derivable from the recipe', () => {
    for (let i = 0; i < SUBSET; i++) {
      assert.equal(table.rows[i].seed, degradationSeed(`s${i}.fountain.txt`));
    }
  });

  it('every intact health matches what the doctor reports for that script', async () => {
    // The manifest was built from real doctor runs above; if the lock script
    // scored a different text (wrong file, wrong order) this diverges.
    const manifest = JSON.parse(serializeTable(table)) as typeof table;
    assert.equal(manifest.rows.length, SUBSET);
    for (const row of table.rows) {
      const text = syntheticScript(18 + row.manifestIndex * 4, row.manifestIndex);
      assert.equal((await runScriptDoctor(text)).health, row.intactHealth);
    }
  });

  it('the rows carry no title, filename, or screenplay text — only hashes and numbers', () => {
    // Scoped to `rows` on purpose: the header's `degradation` block is a fixed
    // English description of the recipe (it mentions INT./EXT. because that is
    // what the recipe splits on) and contains nothing derived from any script.
    const rowsJson = JSON.stringify(table.rows);
    assert.doesNotMatch(rowsJson, /fountain/i, 'a filename leaked into the table rows');
    assert.doesNotMatch(rowsJson, /synthetic/i, 'a title leaked into the table rows');
    assert.doesNotMatch(rowsJson, /INT\.|EXT\.|MAN|WOMAN/, 'screenplay text leaked into the table rows');
    for (const row of table.rows) {
      for (const [key, value] of Object.entries(row)) {
        if (typeof value !== 'string') continue;
        assert.equal(key, 'contentHash', `row field ${key} is a string; only contentHash may be one`);
        assert.match(value, /^[0-9a-f]{64}$/, 'contentHash must be a bare sha256 hex digest');
      }
    }
  });

  it('the header carries only provenance fields — no path, no corpus location', () => {
    const { rows: _rows, degradation: _degradation, ...header } = table;
    assert.deepEqual(
      Object.keys(header).sort(),
      ['floor', 'gitSha', 'manifestHash', 'manifestScriptCount', 'measuredAt', 'measuredAuc', 'schemaVersion'],
    );
    for (const value of Object.values(header)) {
      if (typeof value !== 'string') continue;
      assert.doesNotMatch(value, /[/\\]/, 'a filesystem path leaked into the table header');
    }
  });

  it('records provenance: recipe id, floor, manifest hash and count, git SHA, date', () => {
    assert.equal(table.schemaVersion, 1);
    assert.equal((table.degradation as { id: string }).id, AUC24_DEGRADATION_ID);
    assert.equal(table.manifestScriptCount, SUBSET);
    assert.match(table.manifestHash, /^[0-9a-f]{64}$/);
    assert.equal(table.gitSha, 'testsha');
    assert.match(table.measuredAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof table.floor, 'number');
  });

  it('serializes as pretty JSON with a trailing newline (a re-lock must diff by line)', () => {
    const serialized = serializeTable(table);
    assert.ok(serialized.endsWith('}\n'));
    assert.ok(serialized.includes('\n  "rows": ['));
    assert.deepEqual(JSON.parse(serialized), JSON.parse(JSON.stringify(table)));
  });

  it('is deterministic — a second run over the same corpus produces the same numbers', async () => {
    const again = await lockAuc24({ corpusDir: corpus, manifestPath, subsetSize: SUBSET, gitSha: 'testsha' });
    assert.deepEqual(again.rows, table.rows);
    assert.equal(again.measuredAuc, table.measuredAuc);
  });
});
