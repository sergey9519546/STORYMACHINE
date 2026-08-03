import { getEmbeddingProvider } from '../engine/ai.ts';
import type { Belief } from '../engine/types.ts';
import { logger } from './logger.ts';

// ── Embedding cache ──────────────────────────────────────────────────────────
// In-process cache keyed by proposition text. Avoids re-embedding identical
// strings across turns. This Map is process-wide, not actually session-scoped
// — it outlives any one game session — so it's a bounded LRU (capacity
// EMBEDDING_CACHE_CAPACITY) rather than unbounded: every hit deletes-then-
// re-sets its key (bumping it to "most recent"), and every miss/insert evicts
// the Map's iteration-order-first (least-recently-used) entry once size
// exceeds capacity. That's a textbook LRU without needing an external LRU
// package, and it keeps a long-running server's memory bounded no matter how
// many distinct propositions it ever embeds.
const EMBEDDING_CACHE_CAPACITY = 2000;
const _cache = new Map<string, number[]>();

export async function getEmbedding(text: string): Promise<number[]> {
  const cached = _cache.get(text);
  if (cached) {
    _cache.delete(text);
    _cache.set(text, cached);
    return cached;
  }

  const values = await getEmbeddingProvider().embed(text);
  if (values.length > 0) {
    if (_cache.size >= EMBEDDING_CACHE_CAPACITY) {
      const oldestKey = _cache.keys().next().value;
      if (oldestKey !== undefined) _cache.delete(oldestKey);
    }
    _cache.set(text, values);
  }
  return values;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Semantic contradiction detection ────────────────────────────────────────
// Compares new beliefs against existing ones. Two beliefs are flagged as a
// semantic contradiction when their embedding cosine similarity is high (similar
// topic) but one contains negation relative to the other.
//
// Returns pairs of (existing_id, new_id) that semantically contradict.
// Bounded to at most 10 new beliefs, each compared against up to 5 existing
// beliefs, so total API calls are bounded regardless of how many beliefs a
// caller passes in.
// Gracefully returns [] on any API failure.

const NEGATION_WORDS = /\b(not|never|didn't|wasn't|isn't|aren't|doesn't|no longer|false|deny|denies)\b/i;

export async function detectSemanticContradictions(
  existingBeliefs: Belief[],
  newBeliefs: Belief[],
): Promise<Array<{ existing_id: string; new_id: string; similarity: number }>> {
  if (existingBeliefs.length === 0 || newBeliefs.length === 0) return [];

  const results: Array<{ existing_id: string; new_id: string; similarity: number }> = [];

  try {
    // Only check high-confidence new beliefs against high-confidence existing ones
    const candidateExisting = existingBeliefs.filter(b => b.confidence >= 0.5).slice(-10);
    const candidateNew = newBeliefs.filter(b => b.confidence >= 0.5).slice(-10);

    for (const nb of candidateNew) {
      const newVec = await getEmbedding(nb.proposition);
      if (newVec.length === 0) continue;
      const newHasNegation = NEGATION_WORDS.test(nb.proposition);

      for (const eb of candidateExisting.slice(0, 5)) {
        if (eb.id === nb.id) continue;
        const existVec = await getEmbedding(eb.proposition);
        if (existVec.length === 0) continue;

        const sim = cosineSimilarity(newVec, existVec);
        if (sim < 0.80) continue; // not about the same topic

        const existHasNegation = NEGATION_WORDS.test(eb.proposition);
        // Contradiction: similar topic but opposite polarity (one negates the other)
        if (newHasNegation !== existHasNegation) {
          results.push({ existing_id: eb.id, new_id: nb.id, similarity: sim });
        }
      }
    }
  } catch (err) {
    logger.warn('embedding_contradiction_error', { message: (err as Error).message });
  }

  return results;
}
