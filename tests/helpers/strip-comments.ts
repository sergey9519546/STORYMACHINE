// Shared structural comment stripper for source-text regex tests.
//
// This repo has no jsdom/browser harness (see CLAUDE.md) — tests assert on
// raw .ts/.tsx file text via regex/substring matching instead. Two source
// tests independently hit the same trap in the same round
// (2026-09-05, round-3 review, non-blocking item 2): a filter that only
// checks whether a MATCHED LINE's own trimmed prefix starts with "//" (or
// "*"/"/*") correctly excludes single-line comments, but a multi-line
// `{/* ... */}` JSX block comment's CONTINUATION lines carry no such
// prefix — they are ordinary prose starting mid-sentence — so a literal
// quoted string on one of those lines (e.g. `role="dialog"` or the retired
// "sentence-length variation" wording, both used in real explanatory JSX
// comments elsewhere in this codebase) is miscounted as live code.
//
// `tests/core/theme-convention.test.ts` already avoids this entire class of
// bug by never scanning raw text for its checks — it walks the TypeScript
// compiler's own AST (`ts.createSourceFile`), which never represents a
// comment as a node in the first place. This helper applies the same
// "let the compiler find the comments" idea to the simpler case of tests
// that still want a stripped STRING to run their own regex/substring checks
// against (rather than an AST subtree walk).
//
// Two approaches were tried and rejected before this one:
//  - A flat re-scan of the raw text with `ts.createScanner` desyncs on real
//    JSX content earlier in the file (the scanner has no JSX-context
//    tracking outside a real parse) and silently stops finding comments
//    after that point — verified against this repo's own WhatIfPanel.tsx,
//    where it left two genuine `//` comments completely untouched.
//  - `ts.getLeadingCommentRanges(fullText, token.getFullStart())` per token
//    (the textbook technique for doc-comment extraction) misses exactly
//    the JSX-comment shape this helper exists for: it only counts a
//    comment as "leading" once it has scanned PAST a line break while
//    advancing toward it, but a `{/* ... */}` JSX comment sits immediately
//    adjacent to its enclosing `{`/`}` tokens with no whitespace at all —
//    so the very case this helper is for is the one that heuristic drops.
//
// What actually works: a real parse (`ts.createSourceFile`, same call
// theme-convention.test.ts makes) gives every token's exact boundaries, so
// the leading-trivia region between one token's `getFullStart()` and its
// `getStart()` is GUARANTEED to contain nothing but whitespace and
// comments — no string/template/regex content can appear there, so a
// plain manual scan of just that substring for `//` and `/* */` is
// unambiguous. Walking `getChildren()` (not `forEachChild`) to reach every
// leaf token, including punctuation like `{`/`}`, ensures no trivia region
// in the file is skipped BY THE WALK — but that alone was not enough: a
// round-4 review caught a further hole. An EMPTY `SyntaxList` is itself a
// leaf whose `getFullStart()` equals its own `getStart()` (it consumes no
// trivia), and de-duplicating visited nodes by `getFullStart()` alone made
// that empty node's offset shadow the very next real token — `)`, `]`,
// `}`, or the end-of-file token — which shares that same start position
// and whose trivia is where the comment actually lives. That silently
// leaked `function f(/* … */) {}`, `f(/* … */)`, `[/* … */]`,
// `{/* … */}`, `function f() {/* … */}`, and a whole comment-only file.
// Fixed by de-duplicating on the full node identity
// (`fullStart:end:kind`), not the start offset alone, so the empty list
// and the token after it are both visited even when they share a
// position — see tests/core/strip-comments.test.ts's own dedicated
// regression fixtures covering each of those five shapes plus a
// comment-only file.
import ts from "typescript";

function blankTriviaComments(chars: string[], text: string, offset: number): void {
  let i = 0;
  while (i < text.length) {
    if (text[i] === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") {
        chars[offset + i] = " ";
        i += 1;
      }
      continue;
    }
    if (text[i] === "/" && text[i + 1] === "*") {
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) {
        if (text[i] !== "\n") chars[offset + i] = " ";
        i += 1;
      }
      if (i < text.length) {
        chars[offset + i] = " ";
        chars[offset + i + 1] = " ";
        i += 2;
      }
      continue;
    }
    i += 1;
  }
}

/** Returns `source` with every line comment, block comment, and JSX
 *  brace-wrapped comment replaced by whitespace of the same length
 *  (newlines preserved), so line numbers and character offsets are
 *  unchanged but no comment text remains for a regex/substring check to
 *  see. Real code — including a real `role="dialog"` JSX attribute or any
 *  other literal string that appears outside a comment — is untouched. */
export function stripComments(source: string): string {
  const chars = source.split("");

  const sourceFile = ts.createSourceFile(
    "stripped.tsx",
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );
  // Round-4 review fix (2026-09-05): keying this on `getFullStart()` alone
  // is wrong — an EMPTY SyntaxList is a leaf whose getFullStart() equals
  // its own getStart() (it consumes no trivia), so visiting it recorded
  // that offset as "seen" and blanked nothing, then the NEXT token sharing
  // the same fullStart — `)`, `]`, `}`, or the EOF token, whose trivia is
  // where the comment actually lives — was skipped by the guard before its
  // own trivia was ever scanned. `function f(/* … */) {}`, `f(/* … */)`,
  // `[/* … */]`, `{/* … */}`, `function f() {/* … */}`, and a whole
  // comment-only file with no other tokens all leaked through this hole.
  // Keying on the full node identity (fullStart + end + kind), not just
  // fullStart, distinguishes the empty SyntaxList from the real token that
  // follows it even when they share a start offset, so both get visited.
  const seen = new Set<string>();

  const stripTriviaBefore = (node: ts.Node): void => {
    const fullStart = node.getFullStart();
    const key = `${fullStart}:${node.end}:${node.kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    const start = node.getStart(sourceFile, /* includeJsDoc */ false);
    if (start > fullStart) {
      blankTriviaComments(chars, source.slice(fullStart, start), fullStart);
    }
  };

  const visit = (node: ts.Node): void => {
    const children = node.getChildren(sourceFile);
    if (children.length === 0) {
      stripTriviaBefore(node);
      return;
    }
    for (const child of children) visit(child);
  };

  visit(sourceFile);
  // Trivia after the last real token (a file-ending comment with nothing
  // after it) lives on the end-of-file token.
  stripTriviaBefore(sourceFile.endOfFileToken);

  return chars.join("");
}
