// MANIFEST LOADER — normalizes the two corpus manifest shapes this repo
// actually produces into one flat list of entries, resolving a blind
// `SM-<hash>` id for every entry regardless of which shape was given.
//
// Supported input shapes (see docs/p1-benchmark/CORPUS_IDENTIFICATION.md):
//
//   A) scripts/output/corpus-split.json shape — an object with
//      train/val/test/excluded arrays. Each entry has `.file` (a path
//      relative to the corpus dir) plus `.sceneCount`/`.wordCount`, and,
//      POST-MIGRATION ONLY, `.id`/`.contentHash`/`.genre`/`.origin`.
//
//   B) tests/fixtures/real-corpus-manifest.json shape — a flat array, no
//      partition field. Same pre/post-migration id distinction as (A).
//
// PRE-MIGRATION entries carry only `.file`, and that path can itself be
// title-bearing (e.g. `crawl/action/the-avengers.fountain`) — this loader
// computes the SAME opaque id migrate-corpus-ids.mjs would (see
// lib/blind-id.mjs) from the resolved file's actual text, so a bundle built
// from a pre-migration manifest is exactly as blind as one built from an
// already-migrated manifest. This requires `corpusDir` and reads every
// resolved file once to compute its id (unavoidable — the id is a hash of
// the content).

import fs from 'node:fs';
import path from 'node:path';
import { computeIdHashFull, computeContentHash, idFor, resolveWidth } from './blind-id.mjs';

/**
 * @param {string} manifestPath
 * @returns {{ entries: object[], shape: 'split'|'flat' }}
 */
function readRawManifest(manifestPath) {
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (Array.isArray(raw)) {
    return { entries: raw.map((e, idx) => ({ ...e, partition: e.partition ?? null, __order: idx })), shape: 'flat' };
  }
  if (raw && typeof raw === 'object' && ('train' in raw || 'val' in raw || 'test' in raw)) {
    const entries = [];
    let order = 0;
    for (const part of ['train', 'val', 'test', 'excluded']) {
      for (const e of raw[part] ?? []) entries.push({ ...e, partition: e.partition ?? part, __order: order++ });
    }
    return { entries, shape: 'split' };
  }
  throw new Error(`${manifestPath}: unrecognized manifest shape (expected an array, or an object with train/val/test arrays).`);
}

/**
 * Load a manifest, resolve every entry's blind id, and return a flat,
 * deterministically ordered list. Entries whose file cannot be resolved
 * against `corpusDir` are reported in `missing` and excluded from `entries`
 * rather than aborting the whole load (a maintainer's corpus dir is often a
 * partial local mirror).
 *
 * @param {{ manifestPath: string, corpusDir: string, idWidth?: 8|10 }} opts
 * @returns {{
 *   entries: Array<{ id: string, contentHash: string, file: string, sourceRelFile: string,
 *     partition: string|null, sceneCount: number|null, wordCount: number|null, wasPreMigration: boolean }>,
 *   missing: Array<{ file: string, reason: string }>,
 *   shape: 'split'|'flat',
 *   idWidth: number,
 * }}
 */
export function loadManifest({ manifestPath, corpusDir, idWidth }) {
  const { entries: rawEntries, shape } = readRawManifest(manifestPath);
  const excludedDropped = rawEntries.filter((e) => e.partition === 'excluded');
  const inScope = rawEntries.filter((e) => e.partition !== 'excluded');

  const missing = [];
  const resolved = [];

  for (const e of inScope) {
    const wasPreMigration = typeof e.id !== 'string';
    if (!wasPreMigration) {
      // Already has an id (post-migration manifest) — trust it, but still
      // need the actual file to build a bundle, so verify presence.
      const full = path.join(corpusDir, e.file);
      if (!fs.existsSync(full)) {
        missing.push({ file: e.file, reason: 'missing from corpus dir' });
        continue;
      }
      resolved.push({
        id: e.id,
        contentHash: e.contentHash ?? null,
        file: e.file,
        sourceRelFile: e.file,
        partition: e.partition ?? null,
        sceneCount: e.sceneCount ?? null,
        wordCount: e.wordCount ?? null,
        wasPreMigration: false,
        __order: e.__order,
      });
      continue;
    }
    // Pre-migration: `.file` is the real (possibly title-bearing) relative
    // path. Compute the id on the fly from the actual file content.
    const full = path.join(corpusDir, e.file);
    if (!fs.existsSync(full)) {
      missing.push({ file: e.file, reason: 'missing from corpus dir' });
      continue;
    }
    const raw = fs.readFileSync(full, 'utf-8');
    resolved.push({
      id: null, // filled in once width is resolved, below
      idHashFull: computeIdHashFull(raw),
      contentHash: computeContentHash(raw),
      file: e.file,
      sourceRelFile: e.file,
      partition: e.partition ?? null,
      sceneCount: e.sceneCount ?? null,
      wordCount: e.wordCount ?? null,
      wasPreMigration: true,
      __order: e.__order,
    });
  }

  // Resolve width across every pre-migration entry that needed on-the-fly
  // id computation (collision detection must run over the full set in one
  // pass, matching migrate-corpus-ids.mjs's contract).
  const needsId = resolved.filter((r) => r.id === null);
  if (needsId.length > 0) {
    const { width } = resolveWidth(needsId, idWidth);
    for (const r of needsId) r.id = idFor(r.idHashFull, width);
  }
  const finalWidth = idWidth ?? (resolved.some((r) => r.id?.length === 'SM-'.length + 10) ? 10 : 8);

  resolved.sort((a, b) => a.__order - b.__order);

  return { entries: resolved, missing, shape, idWidth: finalWidth, excludedDroppedCount: excludedDropped.length };
}
