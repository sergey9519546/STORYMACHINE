// fastWordCount parity harness — server/lib/string-utils.ts.
//
// compile.ts's word count used to be
// `fountain.split(/\s+/).filter(w => w.length > 0).length`. A salvaged
// perf branch (bolt-zero-alloc-wordcount) replaced that with a zero-
// allocation charCodeAt loop treating charCode <= 32 as whitespace. That
// loop is a real speed win (no intermediate array), but JS's regex `\s`
// class matches more than "code <= 32" — it also matches a set of
// non-ASCII whitespace code points (NBSP, the Unicode space family,
// line/paragraph separators, and the BOM/ZWNBSP). Text pasted from Word or
// Final Draft routinely carries these. The naive loop silently
// undercounts words whenever one appears, which is the known blocker this
// test exists to close: fastWordCount must match the regex reference
// EXACTLY, not just on ASCII input.
//
// Convention: node:test + assert/strict, matching tests/core/*.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fastWordCount } from '../../server/lib/string-utils.ts';

/** The reference implementation compile.ts used before the perf salvage. */
function regexWordCount(str: string): number {
  return str.split(/\s+/).filter((w) => w.length > 0).length;
}

// Every code point ECMAScript's `\s` class matches, verified empirically
// (see PR description) against `/^\s$/.test(String.fromCodePoint(cp))` for
// every BMP code point — 25 in total, all confirmed below 0x10000:
//   TAB, LF, VT, FF, CR, SPACE (the ASCII set already handled by "<=32"),
//   then the non-ASCII set that the naive loop misses:
const NON_ASCII_WHITESPACE: Array<{ name: string; char: string }> = [
  { name: 'NBSP (U+00A0)', char: ' ' },
  { name: 'OGHAM SPACE MARK (U+1680)', char: ' ' },
  { name: 'EN QUAD (U+2000)', char: ' ' },
  { name: 'EM QUAD (U+2001)', char: ' ' },
  { name: 'EN SPACE (U+2002)', char: ' ' },
  { name: 'EM SPACE (U+2003)', char: ' ' },
  { name: 'THREE-PER-EM SPACE (U+2004)', char: ' ' },
  { name: 'FOUR-PER-EM SPACE (U+2005)', char: ' ' },
  { name: 'SIX-PER-EM SPACE (U+2006)', char: ' ' },
  { name: 'FIGURE SPACE (U+2007)', char: ' ' },
  { name: 'PUNCTUATION SPACE (U+2008)', char: ' ' },
  { name: 'THIN SPACE (U+2009)', char: ' ' },
  { name: 'HAIR SPACE (U+200A)', char: ' ' },
  { name: 'LINE SEPARATOR (U+2028)', char: ' ' },
  { name: 'PARAGRAPH SEPARATOR (U+2029)', char: ' ' },
  { name: 'NARROW NO-BREAK SPACE (U+202F)', char: ' ' },
  { name: 'MEDIUM MATHEMATICAL SPACE (U+205F)', char: ' ' },
  { name: 'IDEOGRAPHIC SPACE (U+3000)', char: '　' },
  { name: 'ZERO WIDTH NO-BREAK SPACE / BOM (U+FEFF)', char: '﻿' },
];

const ASCII_WHITESPACE: Array<{ name: string; char: string }> = [
  { name: 'SPACE', char: ' ' },
  { name: 'TAB', char: '\t' },
  { name: 'LF', char: '\n' },
  { name: 'CR', char: '\r' },
  { name: 'VT', char: '\v' },
  { name: 'FF', char: '\f' },
];

describe('fastWordCount — parity with the regex reference', () => {
  it('fires: matches on empty input', () => {
    assert.equal(fastWordCount(''), regexWordCount(''));
    assert.equal(fastWordCount(''), 0);
  });

  it('fires: matches on all-whitespace (ASCII) input', () => {
    const s = '   \t\t\n\n  ';
    assert.equal(fastWordCount(s), regexWordCount(s));
    assert.equal(fastWordCount(s), 0);
  });

  it('fires: matches with leading/trailing/multiple spaces', () => {
    const cases = [
      '  hello world  ',
      'hello   world',
      '   hello',
      'hello   ',
      'a  b  c',
    ];
    for (const s of cases) {
      assert.equal(fastWordCount(s), regexWordCount(s), `mismatch on ${JSON.stringify(s)}`);
    }
  });

  it('fires: matches across tabs and CRLF', () => {
    const cases = [
      'hello\tworld',
      'hello\r\nworld',
      'line1\r\nline2\r\nline3',
      '\r\n\r\nhello\r\n\r\n',
    ];
    for (const s of cases) {
      assert.equal(fastWordCount(s), regexWordCount(s), `mismatch on ${JSON.stringify(s)}`);
    }
  });

  for (const { name, char } of ASCII_WHITESPACE) {
    it(`fires: single ${name} separator matches`, () => {
      const s = `hello${char}world`;
      assert.equal(fastWordCount(s), regexWordCount(s), `mismatch on ${JSON.stringify(s)}`);
    });
  }

  // The actual RED case this salvage exists to fix: every non-ASCII
  // whitespace code point \s matches that a naive "charCode <= 32" loop
  // does not.
  for (const { name, char } of NON_ASCII_WHITESPACE) {
    it(`fires: non-ASCII whitespace ${name} matches the regex reference`, () => {
      const s = `hello${char}world`;
      const fast = fastWordCount(s);
      const ref = regexWordCount(s);
      assert.equal(
        fast,
        ref,
        `divergence on ${name} (${JSON.stringify(char)}): fastWordCount(${JSON.stringify(s)}) = ${fast}, regexWordCount = ${ref}`,
      );
    });

    it(`fires: ${name} surrounded by ASCII spaces matches`, () => {
      const s = `one two${char}three ${char} four`;
      assert.equal(fastWordCount(s), regexWordCount(s), `mismatch on ${JSON.stringify(s)}`);
    });

    it(`fires: string made only of ${name} counts zero words`, () => {
      const s = char.repeat(5);
      assert.equal(fastWordCount(s), regexWordCount(s));
      assert.equal(fastWordCount(s), 0);
    });
  }

  it('fires: canonical "hello world" with NBSP is 2 words, not 1', () => {
    // This is the exact divergence a prior evaluation flagged: the naive
    // charCode<=32 loop reports 1 (it doesn't see NBSP as a separator);
    // the regex — and a parity-correct fastWordCount — report 2.
    const s = 'hello world';
    assert.equal(regexWordCount(s), 2);
    assert.equal(fastWordCount(s), 2);
  });

  it('fires: mixed non-ASCII whitespace runs collapse like regex \\s+', () => {
    const s = `alpha${NON_ASCII_WHITESPACE[0].char}${NON_ASCII_WHITESPACE[1].char} \tbeta${NON_ASCII_WHITESPACE[2].char}gamma`;
    assert.equal(fastWordCount(s), regexWordCount(s), `mismatch on ${JSON.stringify(s)}`);
  });

  it('property: random mixes of words and every whitespace kind match over many samples', () => {
    const words = ['the', 'quick', 'brown', 'fox', 'INT', 'CUT', 'TO', 'a', 'JORDAN', "don't", 'well-worn'];
    const allWhitespace = [...ASCII_WHITESPACE, ...NON_ASCII_WHITESPACE].map((w) => w.char);

    // Deterministic PRNG (mulberry32) so failures are reproducible without
    // pulling in a dependency.
    function mulberry32(seed: number) {
      let a = seed;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rand = mulberry32(0xc0ffee);

    const SAMPLES = 500;
    for (let sample = 0; sample < SAMPLES; sample++) {
      const tokenCount = 1 + Math.floor(rand() * 12);
      const parts: string[] = [];
      // Randomly lead with whitespace sometimes.
      if (rand() < 0.3) parts.push(allWhitespace[Math.floor(rand() * allWhitespace.length)]);
      for (let t = 0; t < tokenCount; t++) {
        parts.push(words[Math.floor(rand() * words.length)]);
        const sepRuns = 1 + Math.floor(rand() * 3);
        let sep = '';
        for (let r = 0; r < sepRuns; r++) {
          sep += allWhitespace[Math.floor(rand() * allWhitespace.length)];
        }
        parts.push(sep);
      }
      // Randomly trail with extra whitespace sometimes.
      if (rand() < 0.3) parts.push(allWhitespace[Math.floor(rand() * allWhitespace.length)]);

      const s = parts.join('');
      const fast = fastWordCount(s);
      const ref = regexWordCount(s);
      assert.equal(
        fast,
        ref,
        `sample ${sample} diverged on ${JSON.stringify(s)}: fastWordCount=${fast} regexWordCount=${ref}`,
      );
    }
  });
});
