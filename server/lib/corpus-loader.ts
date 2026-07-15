// server/lib/corpus-loader.ts — Load and vectorize the 54-screenplay reference
// corpus for Story Vector comparative analysis. Handles caching to avoid
// re-running Script Doctor (expensive) on every server restart.
//
// ARCHITECTURE: The corpus lives in data/screenplays/ as Fountain files with
// a manifest.json describing metadata. This loader:
//   1. Reads manifest.json to enumerate available screenplays
//   2. Vectorizes each via Script Doctor → story-vector.ts
//   3. Caches computed vectors to data/screenplays/.vectors/ as JSON
//   4. Returns StoryVector[] ready for nearest-neighbor / clustering
//
// CACHING STRATEGY: Vectors are cached by contentHash (SHA-256 of the Fountain
// text). If the cache exists and the hash matches, we skip re-vectorization.
// This makes subsequent loads ~1000x faster (read JSON vs run full pipeline).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StoryVector } from '../nvm/analyze/story-vector.ts';

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
    
    // Validate cache: hash must match
    if (cached.metadata.contentHash !== contentHash) {
      return null; // Cache stale (Fountain text changed)
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
  // Read manifest
  const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf-8');
  const manifest: Manifest = JSON.parse(manifestRaw);
  
  // Filter to valid screenplays only (skip errors and zero-scene files)
  const validEntries = manifest.filter(entry => {
    if (entry.error) return false;
    if (entry.sceneCount === 0) return false;
    if (!entry.sceneCount) return false; // undefined/null
    return true;
  });
  
  console.log(`[corpus-loader] Found ${validEntries.length} valid screenplays in manifest`);
  
  const vectors: StoryVector[] = [];
  const { vectorizeScript } = await import('../nvm/analyze/story-vector.ts');
  const { computeContentHash } = await import('../nvm/analyze/doctor.ts');
  
  for (let i = 0; i < validEntries.length; i++) {
    const entry = validEntries[i];
    const slug = entry.slug;
    
    if (progressCallback) {
      progressCallback(i + 1, validEntries.length, slug);
    }
    
    // Read Fountain file
    const fountainPath = entry.outputFile;
    let fountainText: string;
    try {
      fountainText = await fs.readFile(fountainPath, 'utf-8');
    } catch (err) {
      console.warn(`[corpus-loader] Failed to read ${slug}: ${err}`);
      continue;
    }
    
    // Compute content hash for cache lookup
    const contentHash = computeContentHash(fountainText);
    
    // Try cache first
    const cached = await loadCachedVector(slug, contentHash);
    if (cached) {
      console.log(`[corpus-loader] Cache hit: ${slug}`);
      vectors.push(cached);
      continue;
    }
    
    // Cache miss: vectorize from scratch
    console.log(`[corpus-loader] Cache miss: ${slug} — vectorizing (this may take 30-60s)...`);
    try {
      const vector = await vectorizeScript(fountainText, entry.slug, 'corpus');
      
      // Enhance metadata with manifest info
      vector.metadata.sceneCount = entry.sceneCount;
      vector.metadata.wordCount = entry.wordCount;
      
      // Save to cache
      await saveCachedVector(slug, vector);
      
      vectors.push(vector);
      console.log(`[corpus-loader] Vectorized and cached: ${slug}`);
    } catch (err) {
      console.error(`[corpus-loader] Failed to vectorize ${slug}:`, err);
      // Continue with other screenplays
    }
  }
  
  console.log(`[corpus-loader] Loaded ${vectors.length} vectors (${validEntries.length} attempted)`);
  return vectors;
}

/** Load a single screenplay and vectorize it (with caching). Useful for
 *  on-demand loading or when you only need a subset of the corpus.
 * 
 *  @param slug - Screenplay slug from manifest
 *  @returns StoryVector or null if not found */
export async function loadSingleVector(slug: string): Promise<StoryVector | null> {
  // Read manifest
  const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf-8');
  const manifest: Manifest = JSON.parse(manifestRaw);
  
  // Find entry
  const entry = manifest.find(e => e.slug === slug);
  if (!entry) {
    return null;
  }
  
  // Validate entry
  if (entry.error || entry.sceneCount === 0) {
    return null;
  }
  
  // Read Fountain
  const fountainText = await fs.readFile(entry.outputFile, 'utf-8');
  const { computeContentHash } = await import('../nvm/analyze/doctor.ts');
  const contentHash = computeContentHash(fountainText);
  
  // Try cache
  const cached = await loadCachedVector(slug, contentHash);
  if (cached) {
    return cached;
  }
  
  // Vectorize
  const { vectorizeScript } = await import('../nvm/analyze/story-vector.ts');
  const vector = await vectorizeScript(fountainText, entry.slug, 'corpus');
  vector.metadata.sceneCount = entry.sceneCount;
  vector.metadata.wordCount = entry.wordCount;
  
  // Cache and return
  await saveCachedVector(slug, vector);
  return vector;
}

/** Get list of available screenplay slugs from manifest (for enumeration).
 *  Only returns valid screenplays (no errors, sceneCount > 0).
 * 
 *  @returns Array of slugs */
export async function getAvailableSlugs(): Promise<string[]> {
  const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf-8');
  const manifest: Manifest = JSON.parse(manifestRaw);
  
  return manifest
    .filter(e => !e.error && e.sceneCount && e.sceneCount > 0)
    .map(e => e.slug);
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
