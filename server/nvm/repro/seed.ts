// Seeded PRNG — mulberry32, pure deterministic 32-bit float generator.
// A seeded seed gives reproducible candidate ordering, jitter, pick indices.
// No external deps; safe in both server and test contexts.

export type Seed = number;

export function makePrng(seed: Seed): () => number {
  let s = seed | 0;
  return function prng(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic integer in [0, n).
export function randInt(prng: () => number, n: number): number {
  if (n <= 0) return 0; // guard: empty or invalid range returns 0
  return Math.floor(prng() * n);
}

// Fisher-Yates shuffle, seeded.
export function shuffle<T>(prng: () => number, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(prng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate a stable seed from a string (djb2 hash).
export function seedFromString(s: string): Seed {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) | 0;
  return (h >>> 0);
}
