// Bit-identity receipt for the 2026-09-20 `burrowsDelta` hoist.
//
// WHAT THIS FILE PROVES. `server/nvm/analyze/voice-delta.ts` used to call
// `corpusStats` from INSIDE `burrowsDelta`'s loop over the 65 function words,
// re-deriving BOTH characters' relative frequencies on every iteration — 130
// full re-tokenizations per pair of two maps it already held. The hoist moves
// that derivation to one pass before the loop. `voice-delta.ts` is reachable
// from `doctor.ts` (via `fountain-analyzer.ts`'s `analyzeVoices` call), so it is
// SCORING-PATH: the change is only admissible if it moves no number at all.
//
// The bar here is therefore `Object.is(old, new)` — exact double equality, NOT
// a tolerance. `maxDeltaDiff` must be exactly 0, and a pair that differs in the
// last bit fails. Floating-point addition is not associative, so this is a real
// risk and not a formality: re-associating the two-sample mean or variance sum
// would pass a `< 1e-12` check and fail this one.
//
// THE BASELINE IS THE REAL PRE-CHANGE CODE. The `frozen*` block below is copied
// verbatim from `git show 925164dc:server/nvm/analyze/voice-delta.ts` (the
// lane's base commit). The ONLY edits are to the top-level identifier names, so
// the frozen copy can coexist with the live module in one file, and the removal
// of the `export` keyword on `burrowsDelta`. No expression inside any body was
// touched. Do not "tidy" it — its value is that it is the old arithmetic, in
// the old order.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { burrowsDelta, analyzeVoices } from '../../server/nvm/analyze/voice-delta.ts';
import { parseFountain } from '../../src/lib/fountain.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FEATURE_FIXTURE = path.join(HERE, '..', 'fixtures', 'feature-length', 'assembled-feature.fountain');

// ── FROZEN pre-hoist implementation (925164dc), verbatim ────────────────────

const FROZEN_DEFAULT_FUNCTION_WORDS = new Set<string>([
  'the', 'and', 'of', 'to', 'a', 'in', 'that', 'it', 'is', 'was', 'i', 'you',
  'he', 'she', 'they', 'we', 'but', 'not', 'with', 'for', 'as', 'this', 'be',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'can', 'may', 'might', 'must', 'are', 'been', 'being', 'or', 'an', 'if', 'by',
  'on', 'at', 'from', 'up', 'about', 'out', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'under', 'again', 'further', 'than', 'then',
]);

function frozenTokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  return words.filter(w => /[a-z]/.test(w));
}

function frozenRelativeFrequencies(lines: string[], functionWords: Set<string>): Record<string, number> {
  const allTokens = lines.flatMap(frozenTokenize);
  const n = allTokens.length;
  const freq: Record<string, number> = {};

  // Initialize all function words with 0
  for (const word of functionWords) {
    freq[word] = 0;
  }

  // Count occurrences
  if (n > 0) {
    for (const token of allTokens) {
      if (functionWords.has(token)) {
        freq[token]++;
      }
    }
    // Normalize to relative frequency
    for (const word of functionWords) {
      freq[word] /= n;
    }
  }

  return freq;
}

function frozenCorpusStats(
  allDialogues: Record<string, string[]>,
  word: string,
  functionWords: Set<string>,
): { mean: number; sd: number } {
  const freqs = Object.values(allDialogues).map(
    lines => frozenRelativeFrequencies(lines, functionWords)[word],
  );

  if (freqs.length === 0) return { mean: 0, sd: 1 };

  const mean = freqs.reduce((s, f) => s + f, 0) / freqs.length;
  if (freqs.length < 2) return { mean, sd: 1 };

  const variance = freqs.reduce((s, f) => s + (f - mean) ** 2, 0) / freqs.length;
  const sd = Math.sqrt(variance);
  return { mean, sd: sd > 0 ? sd : 1 };
}

function frozenBurrowsDelta(
  a: string[],
  b: string[],
  functionWords?: Set<string>,
): number {
  const words = functionWords ?? FROZEN_DEFAULT_FUNCTION_WORDS;

  // Degenerate case: empty input
  if (a.length === 0 || b.length === 0) return 0;

  const freqA = frozenRelativeFrequencies(a, words);
  const freqB = frozenRelativeFrequencies(b, words);

  // For this two-sample delta, use the combined corpus (a + b) for stats
  const allDialogues: Record<string, string[]> = { a, b };

  let sumAbsDelta = 0;
  let count = 0;

  for (const word of words) {
    const { mean, sd } = frozenCorpusStats(allDialogues, word, words);
    const zA = (freqA[word] - mean) / sd;
    const zB = (freqB[word] - mean) / sd;
    sumAbsDelta += Math.abs(zA - zB);
    count++;
  }

  return count > 0 ? sumAbsDelta / count : 0;
}

// ── Deterministic corpus generation ─────────────────────────────────────────
//
// Seeded so the generated corpus is the same on every machine and every run —
// a bit-identity claim measured over a corpus nobody else can reproduce is not
// a receipt.

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Deliberately mixed: function words at very different rates (which is what
// Burrows's Delta reads), content words, contractions, punctuation-only
// fragments, casing, and apostrophes — the tokenizer keeps `[a-z']+`.
const OPENERS = [
  'I think', 'Maybe', 'You know', 'Listen', 'No', 'Well', 'Honestly', 'Look',
  'Perhaps', 'Frankly', "Don't", 'And then', 'But', 'So', 'Because',
];
const MIDDLES = [
  'we should have gone before the others did', 'it was not about the money',
  'go', 'nothing', 'that is exactly what I would do in your position',
  'he said she had been there after all', 'stop', 'the thing about it is this',
  'I can and I will', 'they might have been under the bridge again',
  'out', 'up through the door and into the cold', 'now', "it's fine",
  'between us there is nothing further to say', 'do it',
];
const CLOSERS = ['.', '!', '?', '...', ' — and that is that.', ',', ''];

function makeVoice(rand: () => number, lineCount: number, bias: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    const parts: string[] = [];
    if (rand() < bias) parts.push(OPENERS[Math.floor(rand() * OPENERS.length)]);
    const reps = 1 + Math.floor(rand() * (1 + Math.floor(bias * 3)));
    for (let r = 0; r < reps; r++) {
      parts.push(MIDDLES[Math.floor(rand() * MIDDLES.length)]);
    }
    lines.push(parts.join(' ') + CLOSERS[Math.floor(rand() * CLOSERS.length)]);
  }
  return lines;
}

interface Pair { label: string; a: string[]; b: string[]; words?: Set<string> }

function buildPairs(): Pair[] {
  const rand = mulberry32(0x5709A1CE);
  const pairs: Pair[] = [];

  // (1) A 25-voice generated cast of varied length and register -> 300 pairs.
  const cast: Array<{ name: string; lines: string[] }> = [];
  for (let i = 0; i < 25; i++) {
    const lineCount = 1 + Math.floor(rand() * 40);
    cast.push({ name: `GEN_${i}`, lines: makeVoice(rand, lineCount, rand()) });
  }
  for (let i = 0; i < cast.length; i++) {
    for (let j = i + 1; j < cast.length; j++) {
      pairs.push({ label: `${cast[i].name} x ${cast[j].name}`, a: cast[i].lines, b: cast[j].lines });
    }
  }

  // (2) Degenerate and boundary shapes, each against a normal voice and each
  //     other. `burrowsDelta` returns 0 for an empty side BEFORE any statistic
  //     is computed; that early return is part of what must not move.
  const normal = makeVoice(rand, 20, 0.6);
  const edges: Array<{ name: string; lines: string[] }> = [
    { name: 'empty', lines: [] },
    { name: 'one-empty-string', lines: [''] },
    { name: 'whitespace-only', lines: ['   ', '\t'] },
    { name: 'punctuation-only', lines: ['...', '!!!', '—'] },
    { name: 'single-word-function', lines: ['the'] },
    { name: 'single-word-content', lines: ['Run'] },
    { name: 'no-function-words', lines: ['Run! Jump! Scream!', 'Knife. Blood. Silence.'] },
    { name: 'all-one-function-word', lines: Array.from({ length: 12 }, () => 'the the the the') },
    { name: 'digits-and-symbols', lines: ['42', '$$$', '#4 @ 9'] },
    { name: 'apostrophes', lines: ["don't, won't, can't", "it's theirs, y'all"] },
    { name: 'uppercase', lines: ['I THINK WE SHOULD GO NOW AND NOT BEFORE'] },
    { name: 'normal', lines: normal },
  ];
  for (let i = 0; i < edges.length; i++) {
    for (let j = i; j < edges.length; j++) {
      pairs.push({ label: `edge ${edges[i].name} x ${edges[j].name}`, a: edges[i].lines, b: edges[j].lines });
    }
  }

  // (3) 2,000-line sets — the shape the DoS cost model in
  //     server/lib/validation.ts is derived against, and the one where the old
  //     130 re-tokenizations per pair actually hurt.
  const big1 = makeVoice(rand, 2000, 0.3);
  const big2 = makeVoice(rand, 2000, 0.9);
  pairs.push({ label: '2000-line x 2000-line', a: big1, b: big2 });
  pairs.push({ label: '2000-line x normal', a: big1, b: normal });
  pairs.push({ label: '2000-line x single-word', a: big2, b: ['the'] });
  pairs.push({ label: '2000-line x itself', a: big1, b: big1 });

  // (4) A custom function-word set exercises the optional third argument,
  //     including a word that appears in neither side (sd falls back to 1).
  const custom = new Set(['zzz', 'the', 'and']);
  pairs.push({ label: 'custom word set', a: normal, b: big2, words: custom });
  pairs.push({ label: 'custom word set, none present', a: ['run jump'], b: ['knife blood'], words: custom });
  pairs.push({ label: 'empty word set', a: normal, b: big2, words: new Set<string>() });

  return pairs;
}

// ── The feature fixture's own dialogue ──────────────────────────────────────

function featureDialogueByCharacter(): Record<string, string[]> {
  const text = readFileSync(FEATURE_FIXTURE, 'utf-8');
  const byCharacter: Record<string, string[]> = {};
  let speaker: string | null = null;
  for (const block of parseFountain(text)) {
    if (block.type === 'character') {
      speaker = block.text.trim();
    } else if (block.type === 'dialogue') {
      if (speaker) (byCharacter[speaker] ??= []).push(block.text);
    } else if (block.type !== 'parenthetical') {
      speaker = null;
    }
  }
  return byCharacter;
}

// ── The receipt ─────────────────────────────────────────────────────────────

describe('burrowsDelta hoist — bit-identity against the frozen 925164dc implementation', () => {
  it('is bit-identical over a generated corpus of >= 200 character pairs, including empty, single-word and 2,000-line sets', () => {
    const pairs = buildPairs();
    assert.ok(pairs.length >= 200, `expected >= 200 generated pairs, built ${pairs.length}`);

    let maxDeltaDiff = 0;
    let compared = 0;
    for (const pair of pairs) {
      const oldDelta = frozenBurrowsDelta(pair.a, pair.b, pair.words);
      const newDelta = burrowsDelta(pair.a, pair.b, pair.words);
      assert.ok(
        Object.is(oldDelta, newDelta),
        `${pair.label}: old ${oldDelta} !== new ${newDelta} (bit-identity required, not tolerance)`,
      );
      const diff = Math.abs(oldDelta - newDelta);
      if (diff > maxDeltaDiff) maxDeltaDiff = diff;
      compared++;
    }

    assert.equal(maxDeltaDiff, 0, `maxDeltaDiff must be exactly 0, was ${maxDeltaDiff}`);
    console.log(`voice-delta hoist identity (generated): ${compared} pairs, maxDeltaDiff = ${maxDeltaDiff}`);
  });

  it('is bit-identical over every character pair in the assembled feature fixture, and analyzeVoices reproduces those deltas exactly', () => {
    const byCharacter = featureDialogueByCharacter();
    const names = Object.keys(byCharacter);
    assert.ok(names.length >= 2, `feature fixture must yield >= 2 speaking characters, found ${names.length}`);

    let maxDeltaDiff = 0;
    let compared = 0;
    const frozenByKey = new Map<string, number>();
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const oldDelta = frozenBurrowsDelta(byCharacter[names[i]], byCharacter[names[j]]);
        const newDelta = burrowsDelta(byCharacter[names[i]], byCharacter[names[j]]);
        assert.ok(
          Object.is(oldDelta, newDelta),
          `${names[i]} x ${names[j]}: old ${oldDelta} !== new ${newDelta}`,
        );
        const diff = Math.abs(oldDelta - newDelta);
        if (diff > maxDeltaDiff) maxDeltaDiff = diff;
        frozenByKey.set(`${names[i]}\u0000${names[j]}`, oldDelta);
        compared++;
      }
    }
    assert.equal(maxDeltaDiff, 0, `maxDeltaDiff must be exactly 0, was ${maxDeltaDiff}`);

    // The shipped entry point, not just the inner function: every pair
    // analyzeVoices reports must equal the frozen implementation's value.
    const analysis = analyzeVoices(byCharacter);
    if (analysis.scored) {
      assert.ok(analysis.pairs.length > 0, 'a scored analysis must report pairs');
      for (const p of analysis.pairs) {
        const expected = frozenByKey.get(`${p.a}\u0000${p.b}`) ?? frozenByKey.get(`${p.b}\u0000${p.a}`);
        assert.ok(expected !== undefined, `analyzeVoices reported an unexpected pair ${p.a} x ${p.b}`);
        assert.ok(
          Object.is(expected, p.delta),
          `analyzeVoices ${p.a} x ${p.b}: frozen ${expected} !== shipped ${p.delta}`,
        );
      }
    }

    console.log(
      `voice-delta hoist identity (assembled-feature.fountain): ${names.length} characters, `
      + `${compared} pairs, maxDeltaDiff = ${maxDeltaDiff}, analyzeVoices scored = ${analysis.scored}, `
      + `pairs reported = ${analysis.pairs.length}`,
    );
  });

  it('keeps the degenerate contract: an empty side returns exactly 0 and never a NaN', () => {
    assert.ok(Object.is(burrowsDelta([], []), 0));
    assert.ok(Object.is(burrowsDelta(['I go now.'], []), 0));
    assert.ok(Object.is(burrowsDelta([], ['I go now.']), 0));
    // Empty function-word set: the loop never runs, count stays 0.
    assert.ok(Object.is(burrowsDelta(['I go now.'], ['you go now.'], new Set<string>()), 0));
    // Identical inputs: every z-score difference is exactly 0.
    const same = ['I think we should go now.', 'I believe this is correct.'];
    assert.ok(Object.is(burrowsDelta(same, same), 0));
  });
});
