// Dedicated regression suite for tests/helpers/strip-comments.ts.
//
// This helper exists to remove the same class of bug from two other tests
// (modal-focus-trap-wirings.test.ts, shape-rhythm-panel-copy.test.ts): a
// "does this line start with //" filter that misses a multi-line
// `{/* ... */}` JSX comment's continuation lines. Its own correctness
// matters more than usual for a test helper, since a silent leak here
// reintroduces the exact bug it was built to close, in every consumer at
// once — see its header for the two rejected implementations and why this
// one's own dedupe logic needed a round-4 review fix (keying `seen` on
// `getFullStart()` alone let an empty SyntaxList shadow the very next
// token, whose trivia held the comment).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stripComments } from "../helpers/strip-comments.ts";

describe("stripComments — the target case this helper exists for", () => {
  it("a comment quoted mid-sentence on a {/* ... */} continuation line is blanked, while a real attribute a few lines later survives", () => {
    const source = [
      "function Fixture() {",
      "  return (",
      "    <div>",
      "      {/* This paragraph explains that the sibling panel is a real",
      '         role="dialog" (ScriptDoctorPanel) with its own focus trap,',
      "         so no extra wiring is needed here. */}",
      '      <div ref={fixtureRef} tabIndex={-1} role="dialog">real dialog</div>',
      "    </div>",
      "  );",
      "}",
    ].join("\n");
    const stripped = stripComments(source);
    const matches = [...stripped.matchAll(/role="dialog"/g)];
    assert.equal(matches.length, 1, "only the real JSX attribute should survive stripping");
  });
});

describe("stripComments — round-4 review: the empty-SyntaxList leak", () => {
  // An empty SyntaxList is itself a leaf whose getFullStart() equals its
  // own getStart() (it consumes no trivia). De-duplicating visited nodes
  // by getFullStart() alone let that empty node's offset shadow the very
  // next real token sharing that same start position — `)`, `]`, `}`, or
  // the end-of-file token — whose OWN leading trivia is where the comment
  // actually lives, so that token's trivia was never scanned. All five of
  // these ordinary shapes leaked before the fix (proven live, via
  // git-stash, against the pre-fix helper: every one of these five
  // assertions failed on that tree and passes on this one).
  const leakCases: Array<{ label: string; source: string }> = [
    { label: "comment as the sole argument of an empty parameter list", source: "function f(/* HERE */) {}" },
    { label: "comment as the sole argument of a call expression", source: "const z = f(/* HERE */);" },
    { label: "comment as the sole element of an array literal", source: "const a = [/* HERE */];" },
    { label: "comment as the sole property of an object literal", source: "const o = {/* HERE */};" },
    { label: "comment as the sole statement in a function body", source: "function f() {/* HERE */}" },
  ];

  for (const { label, source } of leakCases) {
    it(`${label} — "${source}" — HERE is blanked`, () => {
      const stripped = stripComments(source);
      assert.ok(!stripped.includes("HERE"), `expected "HERE" to be stripped from: ${JSON.stringify(stripped)}`);
    });
  }

  it("a whole comment-only file (single // line comment, nothing else) is fully blanked", () => {
    const source = "// only a comment HERE\n";
    const stripped = stripComments(source);
    assert.ok(!stripped.includes("HERE"), `expected "HERE" to be stripped from: ${JSON.stringify(stripped)}`);
    assert.match(stripped, /^\s*\n?$/, "a comment-only file should strip to whitespace only");
  });

  it("a whole comment-only file (single block comment, nothing else) is fully blanked", () => {
    const source = "/* only a comment HERE */";
    const stripped = stripComments(source);
    assert.ok(!stripped.includes("HERE"), `expected "HERE" to be stripped from: ${JSON.stringify(stripped)}`);
    assert.match(stripped, /^\s*$/, "a comment-only file should strip to whitespace only");
  });
});

describe("stripComments — must-survive cases (real code that merely resembles a comment)", () => {
  it("// inside a string literal survives", () => {
    const source = 'const s = "not a // comment";';
    assert.ok(stripComments(source).includes("not a // comment"));
  });

  it("// inside a template literal survives", () => {
    const source = "const s = `not a // comment`;";
    assert.ok(stripComments(source).includes("not a // comment"));
  });

  it("/* */ inside a template literal survives", () => {
    const source = "const s = `not a /* comment */`;";
    assert.ok(stripComments(source).includes("not a /* comment */"));
  });

  it("// inside JSX text content survives", () => {
    const source = "const el = <p>not a // comment</p>;";
    assert.ok(stripComments(source).includes("not a // comment"));
  });

  it("preserves line numbers (newlines untouched inside a blanked block comment)", () => {
    const source = "const a = 1;\n/* line2\nline3\nline4 */\nconst b = 2;";
    const stripped = stripComments(source);
    assert.equal(stripped.split("\n").length, source.split("\n").length);
  });
});
