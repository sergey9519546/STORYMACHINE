// BLIND ID — mirrors scripts/migrate-corpus-ids.mjs's SM-<hash> id scheme so
// every reader-facing bundle uses the SAME opaque, content-derived id
// whether the input manifest is already migrated (carries `.id`) or still
// the older title-bearing form (carries only `.file`, a real path).
//
// Deliberately DUPLICATED, not imported: migrate-corpus-ids.mjs is a CLI
// script whose top-level code runs unconditionally on import (arg parsing,
// process.exit calls) — importing it here would execute its whole CLI. The
// id/contentHash algorithms are each one function; see
// docs/p1-benchmark/CORPUS_IDENTIFICATION.md §2 for the full rationale
// (OPAQUE / STABLE / RECOVERABLE) this mirrors byte-for-byte:
//
//   id          = "SM-" + sha256(normalizeScreenplay(rawFileText)).hexdigest.slice(0, width)
//   contentHash = sha256(rawFileText.trim()).hexdigest
//   width       = 8, widened to 10 (for every id in the run) if any two
//                 DIFFERENT scripts collide on their 8-char prefix.
//
// Keeping this mirrored (not shared as an import) means a change to the
// canonical algorithm in migrate-corpus-ids.mjs will NOT silently propagate
// here — that is intentional friction: if the id scheme ever changes, both
// copies must be updated in the same review, so a P1 labeling round can
// never silently drift from the migrated manifests' ids.

import crypto from 'node:crypto';
import { normalizeScreenplay } from '../../../server/nvm/analyze/screenplay-normalizer.ts';

export function computeContentHash(rawText) {
  return crypto.createHash('sha256').update(rawText.trim()).digest('hex');
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/** Full (untruncated) id hash for a raw screenplay text. */
export function computeIdHashFull(rawText) {
  return sha256Hex(normalizeScreenplay(rawText));
}

export function idFor(idHashFull, width) {
  return `SM-${idHashFull.slice(0, width)}`;
}

/**
 * Resolve the id width (8, widened to 10 on collision) across a FULL set of
 * entries in one pass — collision detection must see the whole set being
 * migrated/bundled in a single invocation, exactly like
 * migrate-corpus-ids.mjs's resolveWidth.
 *
 * @param {{ idHashFull: string }[]} entries
 * @param {8|10} [forcedWidth]
 */
export function resolveWidth(entries, forcedWidth) {
  const byPrefix8 = new Map();
  for (const e of entries) {
    const p = e.idHashFull.slice(0, 8);
    if (!byPrefix8.has(p)) byPrefix8.set(p, new Set());
    byPrefix8.get(p).add(e.idHashFull);
  }
  const collisions = [...byPrefix8.entries()].filter(([, set]) => set.size > 1);
  const width = forcedWidth ?? (collisions.length > 0 ? 10 : 8);
  return { width, collisions };
}
