/**
 * High-performance, zero-allocation word count.
 * Avoids String.prototype.split allocations.
 *
 * Must stay in exact parity with `str.split(/\s+/).filter(w => w.length > 0)
 * .length` — the regex reference this replaced in
 * server/nvm/screenplay/compile.ts. A naive `charCodeAt(i) > 32` loop
 * diverges from `\s` in two ways real screenplay text (pasted from Word or
 * Final Draft) actually hits:
 *   - UNDERCOUNTS when a run is ONLY non-ASCII whitespace between two words
 *     (e.g. "hello world" — NBSP alone never breaks the naive loop's
 *     word run because 0x00A0 > 32 counts as a "word" char).
 *   - OVERCOUNTS when non-ASCII whitespace sits inside an otherwise-ASCII
 *     whitespace run (e.g. "\n \r" — the loop drops out of "in word"
 *     at the LF, then the space-like 0x2004 re-triggers a bogus new word
 *     since it's > 32).
 * Both are fixed by treating the full ECMAScript `\s` code-point set as
 * whitespace, not just codes <= 32. That set was verified empirically
 * (`/^\s$/.test(String.fromCodePoint(cp))` for every BMP code point; none
 * exist above 0x10000) as exactly these 25 code points.
 */
const HIGH_WHITESPACE_CODES: ReadonlySet<number> = new Set([
  0x00a0, // NO-BREAK SPACE
  0x1680, // OGHAM SPACE MARK
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, // EN QUAD .. HAIR SPACE
  0x2028, // LINE SEPARATOR
  0x2029, // PARAGRAPH SEPARATOR
  0x202f, // NARROW NO-BREAK SPACE
  0x205f, // MEDIUM MATHEMATICAL SPACE
  0x3000, // IDEOGRAPHIC SPACE
  0xfeff, // ZERO WIDTH NO-BREAK SPACE / BOM
]);

function isWhitespaceCode(code: number): boolean {
  if (code <= 32) {
    // Only TAB(9) LF(10) VT(11) FF(12) CR(13) SPACE(32) match `\s` among low
    // codes — other C0 control characters (0-8, 14-31) do NOT match `\s`
    // and must count as word characters, same as the regex reference.
    return code === 0x20 || (code >= 0x09 && code <= 0x0d);
  }
  // Fast bail for the overwhelmingly common case (printable ASCII/Latin-1
  // text below the first non-ASCII whitespace code point) before touching
  // the Set.
  if (code < 0x00a0) return false;
  return HIGH_WHITESPACE_CODES.has(code);
}

export function fastWordCount(str: string): number {
  let count = 0;
  let inWord = false;
  for (let i = 0; i < str.length; i++) {
    if (isWhitespaceCode(str.charCodeAt(i))) {
      inWord = false;
    } else if (!inWord) {
      inWord = true;
      count++;
    }
  }
  return count;
}
