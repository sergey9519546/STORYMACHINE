// Seeded PRNG — mirrors scripts/split-corpus.mjs's mulberry32 generator
// byte-for-byte, so the same seed produces the same deterministic sequence
// as the rest of the P1 tooling. Duplicated rather than imported because
// split-corpus.mjs runs its full corpus-split pipeline unconditionally at
// import time (requires the private corpus present on disk) — importing it
// here would execute that pipeline as a side effect just to reach one
// eight-line function.

export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic string -> 32-bit int seed (for deriving a per-reader seed
 *  from a base seed + reader id without a table of magic numbers). */
export function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

/** Fisher-Yates shuffle using a seeded generator; does not mutate input. */
export function seededShuffle(array, seed) {
  const rng = mulberry32(seed);
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
