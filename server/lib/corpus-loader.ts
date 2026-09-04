// server/lib/corpus-loader.ts — Load and vectorize the 54-screenplay reference
// corpus for Story Vector comparative analysis. Handles caching to avoid
// re-running Script Doctor (expensive) on every server restart.
//
// ARCHITECTURE: The corpus lives in data/screenplays/ as Fountain files, with
// an OPTIONAL manifest.json describing metadata. This loader:
//   1. Enumerates available screenplays (manifest.json if present, otherwise a
//      direct scan of data/screenplays/*.fountain — see resolveCorpusEntries)
//   2. Vectorizes each via Script Doctor → story-vector.ts
//   3. Caches computed vectors to data/screenplays/.vectors/ as JSON
//   4. Returns StoryVector[] ready for nearest-neighbor / clustering
//
// CACHING STRATEGY: Vectors are cached by contentHash (SHA-256 of the Fountain
// text) plus a whole-draft completion receipt. A legacy vector without that
// receipt is deliberately re-built: a matching full-input hash is not enough
// if the underlying rules examined only a truncated prefix.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StoryVector } from '../nvm/analyze/story-vector.ts';
import { logger } from './logger.ts';

// ── Paths ──────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Absolute path to data/screenplays/ */
const SCREENPLAY_DIR = path.resolve(__dirname, '../../data/screenplays');

/** Absolute path to data/screenplays/.vectors/ (cache directory) */
const CACHE_DIR = path.join(SCREENPLAY_DIR, '.vectors');

/** Absolute path to data/screenplays/manifest.json */
const MANIFEST_PATH = path.join(SCREENPLAY_DIR, 'manifest.json');

// ── Manifest Types ─────────────────────────────────────────────────────────

interface ManifestEntry {
  slug: string;
  sourcePath: string;
  sourceDir: string;
  outputFile: string;
  convertedAt: string;
  warnings?: string[];
  error?: string;
  wordCount?: number;
  sceneCount?: number;
}

type Manifest = ManifestEntry[];

// ── Corpus Entry Resolution ────────────────────────────────────────────────

/** One resolvable corpus screenplay: a slug plus the Fountain file to read.
 *  sceneCount/wordCount are OPTIONAL because they are manifest-only metadata
 *  — the directory-scan path has no manifest to read them from, and
 *  vectorizeScript already fills both from the real Script Doctor report. */
interface CorpusEntry {
  slug: string;
  fountainPath: string;
  sceneCount?: number;
  wordCount?: number;
}

const FOUNTAIN_EXT = '.fountain';

/** Enumerate the corpus: manifest first, directory scan as the floor.
 *
 *  WHY THE FALLBACK EXISTS (2026-08-24 fix). manifest.json is written by
 *  exactly one thing — scripts/convert-screenplays.ts, which converts PDFs
 *  from a private local source directory — and `data/` is gitignored, so the
 *  manifest can never be committed. Every fresh checkout therefore had NO
 *  manifest, while data/screenplays/ DOES ship tracked CC0 Fountain scripts
 *  (force-added, see data/screenplays/LICENSE-live-action.md). The result was
 *  an unconditional ENOENT out of fs.readFile that reached the Express error
 *  handler: POST /api/nvm/analyze/compare and GET /api/nvm/analyze/corpus-stats
 *  both returned 500 "Internal Server Error" on every install, with the real
 *  cause visible only in an unhandled_error log line. Reading the directory
 *  when the manifest is absent makes the shipped corpus BE the corpus.
 *
 *  Precedence is deliberate: when a manifest exists it wins, because it is the
 *  richer and more selective source — it records conversion errors and
 *  zero-scene extractions that must be skipped, which a bare directory listing
 *  cannot know about. The scan is a floor, never an override.
 *
 *  Failure modes stay distinguishable: a MISSING manifest or a missing corpus
 *  directory is a normal not-yet-populated state and degrades to fewer (or
 *  zero) entries; a manifest that exists but is unreadable or malformed still
 *  throws, because that is a real misconfiguration a caller must see. */
async function resolveCorpusEntries(): Promise<CorpusEntry[]> {
  let manifestRaw: string | null = null;
  try {
    manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    manifestRaw = null;
  }

  if (manifestRaw !== null) {
    let manifest: Manifest;
    try {
      manifest = JSON.parse(manifestRaw);
    } catch (err) {
      logger.error('corpus_loader_manifest_parse_failed', { manifestPath: MANIFEST_PATH, error: (err as Error).message });
      throw new Error('corpus manifest is not valid JSON: ' + (err as Error).message);
    }
    if (!Array.isArray(manifest)) {
      logger.error('corpus_loader_manifest_not_an_array', { manifestPath: MANIFEST_PATH });
      throw new Error('corpus manifest is not an array of entries');
    }
    // Manifest filter (unchanged): skip failed conversions and zero-scene
    // extractions, which are recorded but not usable as reference vectors.
    const entries = manifest
      .filter(entry => !entry.error && !!entry.sceneCount && entry.sceneCount > 0)
      .map(entry => ({
        slug: entry.slug,
        fountainPath: entry.outputFile,
        sceneCount: entry.sceneCount,
        wordCount: entry.wordCount,
      }));
    logger.info('corpus_loader_manifest_loaded', { validScreenplays: entries.length });
    return entries;
  }

  let names: string[];
  try {
    names = await fs.readdir(SCREENPLAY_DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    logger.warn('corpus_loader_corpus_dir_missing', { screenplayDir: SCREENPLAY_DIR });
    return [];
  }

  const entries = names
    .filter(name => name.endsWith(FOUNTAIN_EXT))
    .sort()  // stable enumeration order, so vector ordering is deterministic
    .map(name => ({
      slug: name.slice(0, -FOUNTAIN_EXT.length),
      fountainPath: path.join(SCREENPLAY_DIR, name),
    }));

  if (entries.length === 0) {
    logger.warn('corpus_loader_corpus_empty', { screenplayDir: SCREENPLAY_DIR });
  } else {
    logger.info('corpus_loader_directory_scan', { screenplays: entries.length, reason: 'no manifest.json' });
  }
  return entries;
}

// ── Cache Management ───────────────────────────────────────────────────────

/** Ensure cache directory exists */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (err) {
    // Ignore if already exists
  }
}

/** Load a cached vector if it exists and the contentHash matches.
 * 
 *  @param slug - Screenplay slug (filename without extension)
 *  @param contentHash - SHA-256 of the Fountain text
 *  @returns Cached StoryVector or null if cache miss */
async function loadCachedVector(
  slug: string,
  contentHash: string
): Promise<StoryVector | null> {
  const cachePath = path.join(CACHE_DIR, `${slug}.json`);
  
  try {
    const json = await fs.readFile(cachePath, 'utf-8');
    const cached = JSON.parse(json) as StoryVector;
    
    // Validate cache: hash, whole-draft receipt, and axis labels must all be
    // present. The receipt intentionally invalidates legacy cache rows, which
    // predate the truncation guard and could contain a prefix vector labeled
    // with a full script hash. ruleKeys does the same job for a second class
    // of legacy row: a vector cached before ruleKeys existed carries no record
    // of what its dimension positions meant, and the index order is
    // per-process (see story-vector.ts's RULE_INDEX), so reusing one would
    // compare rule N of this process against rule N of some earlier one.
    // Re-vectorizing is cheap; a silently mis-aligned similarity is not.
    if (
      cached.metadata.contentHash !== contentHash ||
      cached.metadata.wholeDraftAnalysisComplete !== true ||
      !Array.isArray(cached.ruleKeys)
    ) {
      return null; // Cache stale (Fountain text changed, or pre-ruleKeys row)
    }
    
    return cached;
  } catch (err) {
    return null; // Cache miss (file doesn't exist or invalid JSON)
  }
}

/** Save a vector to the cache.
 * 
 *  @param slug - Screenplay slug (filename without extension)
 *  @param vector - StoryVector to cache */
async function saveCachedVector(slug: string, vector: StoryVector): Promise<void> {
  await ensureCacheDir();
  const cachePath = path.join(CACHE_DIR, `${slug}.json`);
  await fs.writeFile(cachePath, JSON.stringify(vector, null, 2), 'utf-8');
}

// ── Corpus Loading ─────────────────────────────────────────────────────────

/** Load all vectors from the screenplay corpus. Uses cache aggressively to
 *  avoid re-running Script Doctor on every call. Skips screenplays with
 *  sceneCount = 0 (malformed/failed extraction) or explicit errors in manifest.
 * 
 *  @param cacheDir - Optional override for cache directory (tests only)
 *  @param progressCallback - Optional callback for progress reporting (screenplayIndex, total, slug)
 *  @returns Array of StoryVectors for valid screenplays */
export async function loadCorpusVectors(
  cacheDir?: string,
  progressCallback?: (current: number, total: number, slug: string) => void
): Promise<StoryVector[]> {
  const validEntries = await resolveCorpusEntries();

  const vectors: StoryVector[] = [];
  // OFF-THREAD, and this is the call site that made it matter (2026-09-04).
  // On a cold cache this loop vectorizes EVERY corpus screenplay, and
  // vectorizing runs the Script Doctor — so the loop below is not one analysis
  // but up to twenty, back to back. Run in-process, that is twenty
  // consecutive full-stops for every other request the server is serving, and
  // it happens on the FIRST POST /api/nvm/analyze/compare after any fresh
  // checkout (data/ is gitignored, so data/screenplays/.vectors never ships).
  // Measured on the live keyless server before this change: GET /health p95
  // 2,420 ms while the compare route was under load, with only 19 probes
  // answered in the whole phase. See server/nvm/analyze/doctor-pool.ts.
  const { vectorizeScriptOffThread } = await import('../nvm/analyze/story-vector.ts');
  const { computeContentHash } = await import('../nvm/analyze/doctor.ts');
  
  for (let i = 0; i < validEntries.length; i++) {
    const entry = validEntries[i];
    const slug = entry.slug;
    
    if (progressCallback) {
      progressCallback(i + 1, validEntries.length, slug);
    }
    
    // Read Fountain file
    const fountainPath = entry.fountainPath;
    let fountainText: string;
    try {
      fountainText = await fs.readFile(fountainPath, 'utf-8');
    } catch (err) {
      logger.warn('corpus_loader_read_failed', { slug, error: err instanceof Error ? err.message : String(err) });
      continue;
    }
    
    // Compute content hash for cache lookup
    const contentHash = computeContentHash(fountainText);
    
    // Try cache first
    const cached = await loadCachedVector(slug, contentHash);
    if (cached) {
      logger.debug('corpus_loader_cache_hit', { slug });
      vectors.push(cached);
      continue;
    }

    // Cache miss: vectorize from scratch
    logger.info('corpus_loader_cache_miss', { slug, note: 'vectorizing (this may take 30-60s)' });
    try {
      const vector = await vectorizeScriptOffThread(fountainText, entry.slug, 'corpus');

      // Enhance metadata with manifest info WHEN THERE IS ANY. Guarded because
      // directory-scan entries carry no counts: an unconditional assignment
      // would overwrite the real Script Doctor-derived sceneCount/wordCount
      // vectorizeScript just set with `undefined`, and the response would then
      // report a missing count for a script that was fully measured.
      if (entry.sceneCount !== undefined) vector.metadata.sceneCount = entry.sceneCount;
      if (entry.wordCount !== undefined) vector.metadata.wordCount = entry.wordCount;

      // Save to cache
      await saveCachedVector(slug, vector);
      
      vectors.push(vector);
      logger.info('corpus_loader_vectorized', { slug });
    } catch (err) {
      logger.error('corpus_loader_vectorize_failed', { slug, error: err instanceof Error ? err.message : String(err) });
      // Continue with other screenplays
    }
  }

  logger.info('corpus_loader_complete', { vectorCount: vectors.length, attempted: validEntries.length });
  return vectors;
}

/** Load a single screenplay and vectorize it (with caching). Useful for
 *  on-demand loading or when you only need a subset of the corpus.
 * 
 *  @param slug - Screenplay slug from manifest
 *  @returns StoryVector or null if not found */
export async function loadSingleVector(slug: string): Promise<StoryVector | null> {
  // resolveCorpusEntries has already applied the manifest's error/zero-scene
  // filter, so an entry that comes back here is by construction usable.
  const entry = (await resolveCorpusEntries()).find(e => e.slug === slug);
  if (!entry) {
    return null;
  }

  // Read Fountain
  const fountainText = await fs.readFile(entry.fountainPath, 'utf-8');
  const { computeContentHash } = await import('../nvm/analyze/doctor.ts');
  const contentHash = computeContentHash(fountainText);
  
  // Try cache
  const cached = await loadCachedVector(slug, contentHash);
  if (cached) {
    return cached;
  }
  
  // Vectorize — off-thread, for the reason loadCorpusVectors gives above.
  const { vectorizeScriptOffThread } = await import('../nvm/analyze/story-vector.ts');
  const vector = await vectorizeScriptOffThread(fountainText, entry.slug, 'corpus');
  // Guarded for the same reason as loadCorpusVectors above: a directory-scan
  // entry has no manifest counts, and must not blank out the measured ones.
  if (entry.sceneCount !== undefined) vector.metadata.sceneCount = entry.sceneCount;
  if (entry.wordCount !== undefined) vector.metadata.wordCount = entry.wordCount;

  // Cache and return
  await saveCachedVector(slug, vector);
  return vector;
}

/** Get list of available screenplay slugs (for enumeration). Reads the
 *  manifest when there is one, otherwise the shipped Fountain files; only
 *  returns usable screenplays (no conversion errors, sceneCount > 0 where a
 *  manifest recorded one).
 *
 *  @returns Array of slugs (empty when no corpus is installed) */
export async function getAvailableSlugs(): Promise<string[]> {
  return (await resolveCorpusEntries()).map(e => e.slug);
}

/** Clear all cached vectors (force re-vectorization on next load). Useful for
 *  testing or when the vectorization algorithm changes.
 * 
 *  @returns Number of cache files deleted */
export async function clearCache(): Promise<number> {
  let deleted = 0;
  try {
    const files = await fs.readdir(CACHE_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(CACHE_DIR, file));
        deleted++;
      }
    }
  } catch (err) {
    // Cache dir doesn't exist — that's fine
  }
  return deleted;
}

/** Get cache statistics (how many cached vectors exist).
 * 
 *  @returns Object with cache counts */
export async function getCacheStats(): Promise<{
  cached: number;
  available: number;
  hitRate: number;
}> {
  const available = (await getAvailableSlugs()).length;
  
  let cached = 0;
  try {
    const files = await fs.readdir(CACHE_DIR);
    cached = files.filter(f => f.endsWith('.json')).length;
  } catch (err) {
    // Cache dir doesn't exist
    cached = 0;
  }
  
  const hitRate = available > 0 ? cached / available : 0;
  
  return { cached, available, hitRate };
}
