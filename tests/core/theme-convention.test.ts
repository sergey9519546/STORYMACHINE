// Source-level guard for the theme convention written down in
// src/styles/design-system.css's header (2026-09-05, client-hunter
// B-11/B-14): a surface is either THEME-INVARIANT (--sm-* panel/text
// tokens, no `dark:` variants) or FULLY THEMED (`dark:` on both background
// and text) — never mixed.
//
// ROUND 2 REWRITE (independent review item 2, 2026-09-05): the previous
// version of this file shipped a SAME-ELEMENT-ONLY detector (flags a
// `dark:bg-*` className alongside `text-black`/`text-[var(--sm-ink` in that
// SAME string) after an earlier cross-element prototype, built to catch
// B-11's actual historical shape (the invariant token on a DESCENDANT of
// the dark:bg-* ancestor, not the same element), produced false positives
// on ScriptDoctorPanel.tsx from an indentation-depth heuristic that cannot
// reliably track "still inside this JSX subtree" across a 5,000-line file.
// The previous report's fail-first proof also cited that abandoned
// prototype's log while describing the shipped (same-element) detector —
// which never actually reproduced it: the shipped same-element scanner
// returns `[]` against every `.tsx` file under `main`'s src/components,
// itself included, because THIS EXACT PATTERN — a `dark:bg-*` background
// and an invariant ink token on ONE element with no `dark:text-` — has
// (as far as this repo's history goes) zero instances, past or present.
// B-11 and B-14 are both CROSS-element: the background and the mismatched
// text sit on different nodes, related only by nesting.
//
// This version replaces the indentation heuristic with a genuine JSX
// subtree walk over the TypeScript compiler's own AST (`ts.createSourceFile`
// with `ScriptKind.TSX`, already a project devDependency — see
// package.json) rather than a second hand-rolled parser. It models two
// things a real browser actually composites, which is why it catches BOTH
// known historical shapes with one rule:
//
//   1. BACKGROUND is paint, not CSS inheritance — an element with no
//      background of its own is visually transparent, so whatever real,
//      OPAQUE background the nearest ancestor (or itself) declares is what
//      its text actually sits on. The walk tracks this ("current bg mode")
//      going down the tree, reset by the first descendant that declares its
//      own background.
//   2. `color` genuinely IS an inherited CSS property — an element with no
//      text-color class of its own renders in whatever color the nearest
//      ancestor (or itself) set, all the way up to `body { color:
//      var(--color-ink) }` (src/index.css) — a FIXED value, never touched
//      by any `.dark` rule anywhere in src/styles (verified: no
//      `.dark`/`prefers-color-scheme` selector in this codebase redefines
//      `--color-ink` or any `--sm-*` token). That is why the walk's root
//      starts with an INVARIANT text mode by default, not a neutral one —
//      unstyled text is invariant ink by construction, which is exactly
//      the mechanism behind both SnapshotManager.tsx modals (round 2, item
//      1: their heading/Cancel text carries no color class at all).
//
// At every leaf that actually renders text (a JSX element with no child
// JSX elements of its own, and at least one non-empty JsxText/JsxExpression
// child), a violation is recorded when the EFFECTIVE background mode
// entering that leaf is a solid `dark:bg-*` (real, unconditional dark) and
// the EFFECTIVE text mode is invariant ink (`text-[var(--sm-ink...)]`,
// bare `text-black`, or the `.sm-btn`/`.sm-btn--ink` family, whose CSS rule
// sets `color` to a fixed `--sm-*` value the same way — see
// design-system.css:131-136 — which is how B-14's row/rank/title text
// actually went invariant: not a Tailwind class on the row at all, but the
// `.sm-btn` wrapper class two levels up).
//
// Two deliberate scope limits, kept because widening either would trade a
// real capability for false positives or false confidence:
//   - `dark:bg-*` with a FRACTIONAL opacity suffix (`/10`, `/30`, …) is NOT
//     treated as confidently dark. A low-alpha dark tint composites with
//     whatever sits behind it — on this codebase's actual pattern (a
//     semantic alert card inside an otherwise theme-invariant light panel)
//     the composite stays light. Verified against a real instance found
//     while building this: AnalysisPanel.tsx's lint/dialogue-inconsistency
//     cards use `bg-red-50 dark:bg-red-900/10` / `dark:bg-yellow-900/10`
//     around `text-[var(--sm-ink)]` — the naive (any dark:bg-*) version of
//     this walk flagged all three as violations; none are real (the ambient
//     page never leaves `--sm-panel`/`--sm-paper`, so the composite reads
//     as a light pink/yellow tint, not a dark surface). None of the
//     confirmed real bugs (B-11, B-14, both SnapshotManager modals) use an
//     opacity-suffixed dark background — they are all solid
//     (`dark:bg-zinc-800`, `dark:bg-zinc-900`) — so this exclusion loses no
//     true positive.
//   - A `className` that is a bare identifier referencing a variable
//     defined elsewhere (e.g. SlatePanel.tsx's `const rowBg = i % 2 === 0
//     ? "bg-[var(--sm-panel)]" : "bg-[var(--sm-panel-2)]"; ...
//     className={rowBg}`) is not resolved back to its literal value — this
//     walk reads the attribute's own source text, not a constant-folded
//     evaluation. This cannot produce a false positive (an unresolved
//     attribute just falls through to "inherit," same as no class at all)
//     but it CAN miss a real bug hidden behind a variable; the browser
//     gates in scripts/verify-a11y.mjs are the backstop for whatever this
//     static walk cannot see.
//
// PROOF THIS DETECTOR HAS TEETH (LANE_STANDARD §3): run against
// `git show main:src/components/scriptide/SnapshotManager.tsx` (i.e. before
// EITHER this lane's round-1 fix or its round-2 modal fix), it reports
// SIX violations — the round-1 card bug (:469 the card, :473 the date
// caption's `text-[var(--sm-ink-mute)]`) AND both modals' round-2 bug
// (:295/:312 Save, :371/:378 Restore) — logged at
// /tmp/.../scratchpad/gate-logs/theme-scan-main-SnapshotManager.log. Against
// `git show main:src/components/SlatePanel.tsx`, it reports FIVE
// violations — the historical B-14 shape (:683/:714/:715 rank/title text,
// :721 the health number, :726 the RECOMMEND/CONSIDER/PASS verdict chip),
// logged at .../theme-scan-main-SlatePanel.log. Against the LIVE (fully
// fixed) tree, both files — along with every other file under
// src/components except ScriptDoctorPanel.tsx (below) — report zero.
//
// ScriptDoctorPanel.tsx is the one exception: this walk finds 36 real
// instances of the exact same defect there (verified by hand — e.g.
// line ~5098's `<span className="text-xs font-bold">Graph Health</span>`
// inside a `<div className="border-2 border-black dark:border-white/20
// bg-white dark:bg-zinc-900 p-3">` — a genuine, unfixed B-11-shape bug).
// That file is reserved for a different, concurrently-running lane (see
// the original brief's constraints, and LANE_STANDARD §2's "the reason it
// cannot be [fixed] is written down with file and line evidence") and the
// round-1 independent review explicitly endorsed leaving it alone for
// exactly that reason. The regression gate below therefore excludes it BY
// NAME, with this paragraph as the citation, rather than silently scoping
// past it — CoverageSummary.tsx and ScriptIDE.tsx (also reserved) need no
// such exclusion, because this walk finds zero violations in either.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const COMPONENTS_DIR = join(REPO_ROOT, 'src', 'components');

// Reserved for a different, concurrently-running lane (see this file's
// header) — real violations found there are disclosed in the round-2
// report, not fixed here, and not asserted against below.
const RESERVED_FILES = new Set([
  join('src', 'components', 'scriptide', 'ScriptDoctorPanel.tsx'),
]);

interface Violation {
  file: string;
  line: number;
  value: string;
}

type BgMode = 'inherit' | 'safe' | 'dark';
type TextMode = 'inherit' | 'safe' | 'invariant';

// `.sm-btn` / `.sm-btn--ink` / `.sm-btn--stamp` (design-system.css:131-136)
// each set BOTH a fixed background AND a fixed text color via a plain CSS
// class rule, not a Tailwind utility — neither ever reacts to `.dark`. This
// is the exact mechanism behind B-14 (the invariant ink came from
// `.sm-btn`'s `color:`, cascading onto a `dark:bg-*` descendant two levels
// down). The bare-token match (not `--off`, a no-color opacity modifier,
// and not a partial match inside those `--suffix` variants) is anchored on
// both sides so it can't fire inside an unrelated class.
const SMBTN_FAMILY_RE = /(^|[\s"'`{])sm-btn(--ink|--stamp)?(?=[\s"'`}]|$)/;
const DARK_BG_TOKEN_SRC = '(^|[\\s"\'`{])dark:bg-[\\w.\\[\\]#()-]+(\\/\\d{1,3})?';
const ANY_BG_RE = /(^|[\s"'`{])bg-[\w./\[\]#%()-]+/;
const TEXT_TOKEN_RE = /(^|[\s"'`{])(dark:)?text-(\[[^\]]*\]|[\w./%-]+)/g;

/** A `text-` token's SUFFIX can be a font-SIZE utility (`text-xs`, a pixel
 *  arbitrary value like `text-[10px]`) or a text-COLOR utility
 *  (`text-black`, `text-gray-500`, `text-[var(--sm-ink)]`) — Tailwind
 *  overloads the same prefix for both, so this must be told apart per
 *  token, not assumed from the presence of "text-" alone. */
function classifyTextBody(body: string): 'size' | 'invariant-ink' | 'color' {
  if (body.startsWith('[')) {
    const inner = body.slice(1, -1);
    if (/^-?[\d.]/.test(inner)) return 'size'; // text-[10px], text-[1.5rem]
    if (/var\(--sm-ink/.test(inner)) return 'invariant-ink';
    return 'color';
  }
  if (/^(xs|sm|base|lg|xl|\d+xl|left|center|right|justify|start|end|nowrap|wrap|balance|pretty|ellipsis|clip)(\/.*)?$/.test(body)) {
    return 'size';
  }
  if (body === 'black') return 'invariant-ink';
  return 'color';
}

/** A solid `dark:bg-*` token (no fractional-opacity suffix) — see this
 *  file's header for why fractional opacity is excluded. */
function hasSolidDarkBg(raw: string): boolean {
  for (const m of raw.matchAll(new RegExp(DARK_BG_TOKEN_SRC, 'g'))) {
    if (!m[2]) return true;
  }
  return false;
}
function hasAnyDarkBgToken(raw: string): boolean {
  return new RegExp(DARK_BG_TOKEN_SRC).test(raw);
}

/** Pulls the raw source text of a `className` attribute's value, whatever
 *  shape it takes (string literal, template literal, ternary, `${...}`
 *  interpolation) — this is a substring-presence scan, not an evaluator, so
 *  reading the raw text of ANY expression shape is deliberate: a ternary
 *  like `i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-gray-50
 *  dark:bg-zinc-800"` (SlatePanel.tsx's historical row background) always
 *  contains a real `dark:bg-*` token in its source regardless of which
 *  branch the ternary actually picks at runtime, because the CSS `dark:`
 *  variant is a stylesheet selector, not a JS branch. */
function classNameRaw(el: ts.JsxOpeningLikeElement, sf: ts.SourceFile): string {
  for (const p of el.attributes.properties) {
    if (ts.isJsxAttribute(p) && p.name.getText(sf) === 'className' && p.initializer) {
      if (ts.isStringLiteral(p.initializer)) return p.initializer.text;
      if (ts.isJsxExpression(p.initializer) && p.initializer.expression) {
        return p.initializer.expression.getText(sf);
      }
    }
  }
  return '';
}

interface Classification {
  raw: string;
  newBg: BgMode;
  newText: TextMode;
}

function classify(
  el: ts.JsxOpeningLikeElement,
  sf: ts.SourceFile,
  inheritedBg: BgMode,
  inheritedText: TextMode,
): Classification {
  const raw = classNameRaw(el, sf);
  const isSmBtnFamily = SMBTN_FAMILY_RE.test(raw);
  const hasDarkBg = hasSolidDarkBg(raw);
  const hasBg = hasDarkBg || hasAnyDarkBgToken(raw) || ANY_BG_RE.test(raw) || isSmBtnFamily;

  let hasAnyTextColor = false;
  let hasDarkTextColor = false;
  let hasOwnInvariantInk = false;
  for (const m of raw.matchAll(TEXT_TOKEN_RE)) {
    const isDark = !!m[2];
    const cls = classifyTextBody(m[3]);
    if (cls === 'size') continue;
    hasAnyTextColor = true;
    if (isDark) hasDarkTextColor = true;
    else if (cls === 'invariant-ink') hasOwnInvariantInk = true;
  }
  if (isSmBtnFamily) {
    // Fixed background, fixed text color, both invariant, correctly
    // paired — see this file's header comment on the SMBTN_FAMILY_RE.
    hasAnyTextColor = true;
    hasOwnInvariantInk = true;
  }

  const ownTextIsInvariant = hasOwnInvariantInk && !hasDarkTextColor;
  const ownBgMode: BgMode = !hasBg ? 'inherit' : hasDarkBg ? 'dark' : 'safe';
  const ownTextMode: TextMode = !hasAnyTextColor ? 'inherit' : ownTextIsInvariant ? 'invariant' : 'safe';

  return {
    raw,
    newBg: ownBgMode === 'inherit' ? inheritedBg : ownBgMode,
    newText: ownTextMode === 'inherit' ? inheritedText : ownTextMode,
  };
}

/** True if `node` contains a JSX element/fragment anywhere within it — used
 *  to tell a plain text-bearing expression (`{s.date}`) apart from one that
 *  renders further JSX (`{cond && <Foo/>}`), so a mixed-content element
 *  (some direct text, some nested elements) still gets checked for the
 *  text it renders directly. */
function containsJsx(node: ts.Node): boolean {
  let found = false;
  const visit = (n: ts.Node) => {
    if (found) return;
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

function hasDirectText(el: ts.JsxElement): boolean {
  return el.children.some((child) => {
    if (ts.isJsxText(child)) return child.text.trim() !== '';
    if (ts.isJsxExpression(child) && child.expression) return !containsJsx(child.expression);
    return false;
  });
}

/** The detector: a real JSX-subtree walk (TypeScript's own AST, not an
 *  indentation heuristic) that tracks the CSS-composited background and
 *  inherited text color down the tree and flags any text-bearing leaf where
 *  the two disagree — see this file's header for the full mechanism and its
 *  two disclosed scope limits. */
function findThemeConventionViolations(source: string, filePath: string): Violation[] {
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: Violation[] = [];

  function visit(node: ts.Node, bg: BgMode, text: TextMode): void {
    if (ts.isJsxElement(node)) {
      const { raw, newBg, newText } = classify(node.openingElement, sf, bg, text);
      if (newBg === 'dark' && newText === 'invariant' && hasDirectText(node)) {
        const { line } = ts.getLineAndCharacterOfPosition(sf, node.openingElement.getStart(sf));
        violations.push({ file: filePath, line: line + 1, value: raw || '(inherited)' });
      }
      for (const child of node.children) visit(child, newBg, newText);
      return;
    }
    if (ts.isJsxSelfClosingElement(node)) {
      // Self-closing elements (input, img, br…) render no direct text
      // child and have no children to recurse into.
      return;
    }
    if (ts.isJsxFragment(node)) {
      for (const child of node.children) visit(child, bg, text);
      return;
    }
    ts.forEachChild(node, (child) => visit(child, bg, text));
  }

  // Root defaults: no ambient background is declared (`safe`), but text
  // color IS: `body { color: var(--color-ink) }` (src/index.css) is a
  // fixed value inherited by anything with no color class of its own —
  // see this file's header point 2.
  visit(sf, 'safe', 'invariant');
  return violations;
}

function listTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listTsxFiles(full));
    else if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('theme-convention scanner — proof it can actually fail (LANE_STANDARD §3)', () => {
  it('flags the same-element mixed pattern (dark:bg-* + invariant ink token, no dark:text-)', () => {
    const badFixture = '<div className="bg-[var(--sm-panel-2)] dark:bg-zinc-800 p-4 text-[var(--sm-ink-mute)]">{s.date}</div>';
    const violations = findThemeConventionViolations(badFixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  it('flags the bare text-black variant of the same same-element pattern', () => {
    const badFixture = '<div className="bg-white dark:bg-zinc-800 p-4 text-black">{s.name}</div>';
    const violations = findThemeConventionViolations(badFixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  it('flags B-11\'s actual CROSS-element shape: invariant text on a DESCENDANT of a dark:bg-* ancestor', () => {
    const fixture = [
      '<div className="bg-white dark:bg-zinc-800 p-4">',
      '  <span className="text-[var(--sm-ink-mute)]">{s.date}</span>',
      '</div>',
    ].join('\n');
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
    assert.ok(violations[0].value.includes('text-[var(--sm-ink-mute)]'));
  });

  it('flags B-14\'s actual CROSS-element shape: invariant ink from an .sm-btn ANCESTOR, dark:bg-* on a DESCENDANT', () => {
    const fixture = [
      '<div className="overflow-x-auto sm-btn">',
      '  <table><tbody>',
      '    <tr className="bg-white dark:bg-zinc-900">',
      '      <td className="px-2 py-2 font-bold">{i + 1}</td>',
      '    </tr>',
      '  </tbody></table>',
      '</div>',
    ].join('\n');
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  it('flags unstyled text (no text class at all) inside a dark:bg-* element — the SnapshotManager modal shape', () => {
    // The modal heading/Cancel button carried NO text-color class at all —
    // the bug was the inherited body default (--color-ink), not a Tailwind
    // class. Round 2, item 1.
    const fixture = '<div className="bg-white dark:bg-zinc-800 p-6"><h3 className="font-bold uppercase text-xs">Save Snapshot</h3></div>';
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  it('does NOT flag the same element once its background is theme-invariant (the actual B-11 fix)', () => {
    const fixedFixture = '<div className="bg-[var(--sm-panel-2)] p-4 text-[var(--sm-ink-mute)]">{s.date}</div>';
    assert.deepEqual(findThemeConventionViolations(fixedFixture, 'fixture.tsx'), []);
  });

  it('does NOT flag a genuinely fully-themed pairing (text-black WITH its own dark:text- override)', () => {
    // Matches ScriptDoctorPanel.tsx's real `text-black dark:text-gray-100
    // ... bg-gray-50 dark:bg-zinc-800` shape — a different, actively-owned
    // lane's file — this IS the correct convention #2 (fully themed), not
    // the bug, and must never be flagged.
    const fullyThemedFixture = '<p className="text-xs leading-relaxed text-black dark:text-gray-100 bg-gray-50 dark:bg-zinc-800 border-2 p-3">text</p>';
    assert.deepEqual(findThemeConventionViolations(fullyThemedFixture, 'fixture.tsx'), []);
  });

  it('does NOT flag an ordinary theme-invariant surface with no dark: anything', () => {
    const invariantFixture = '<div className="bg-[var(--sm-panel-2)]"><span className="text-[var(--sm-ink-mute)]">x</span></div>';
    assert.deepEqual(findThemeConventionViolations(invariantFixture, 'fixture.tsx'), []);
  });

  it('does NOT flag a nested element that establishes its own theme-invariant background, breaking the dark chain', () => {
    const fixture = [
      '<div className="bg-white dark:bg-zinc-900 p-4">',
      '  <div className="bg-[var(--sm-panel)] p-2">',
      '    <span className="text-[var(--sm-ink)]">{"inner"}</span>',
      '  </div>',
      '</div>',
    ].join('\n');
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });

  it('does NOT flag a fractional-opacity dark:bg-* (a low-alpha tint, not a confidently dark surface) — the AnalysisPanel case', () => {
    // Real, live code (src/components/scriptide/AnalysisPanel.tsx) — a
    // naive "any dark:bg-*" version of this walk flagged this as a
    // violation; it is not one (see this file's header).
    const fixture = '<div className="bg-red-50 dark:bg-red-900/10 p-3"><p className="text-[var(--sm-ink)]">{"warn"}</p></div>';
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });
});

describe('theme-convention scanner — reproduces the real historical bugs on pre-fix source', () => {
  // These are literal excerpts of the actual pre-fix files (captured via
  // `git show main:...`), not synthetic — the full `git show` runs and
  // their logs are recorded in the round-2 report and
  // /tmp/.../scratchpad/gate-logs/theme-scan-main-*.log.
  it('reproduces B-11: SnapshotManager.tsx pre-fix card (main), the date caption on a dark:bg-zinc-800 card', () => {
    const fixture = [
      '<div className="bg-white dark:bg-zinc-800 p-4 border-[2px] border-[var(--sm-ink)] shadow-[var(--sm-shadow)] flex justify-between items-center">',
      '  <div>',
      '    <div className="font-bold uppercase text-xs">{s.name}</div>',
      '    <div className="text-[10px] font-mono text-[var(--sm-ink-mute)]">{s.date}</div>',
      '  </div>',
      '</div>',
    ].join('\n');
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    // Both the card's own name (no text class -> inherits invariant ink)
    // AND the date caption (its own invariant token) render on the real
    // dark background — two flagged leaves from one bug.
    assert.equal(violations.length, 2);
  });

  it('reproduces B-14: SlatePanel.tsx pre-fix ranked row (main), rank/title text on an .sm-btn-wrapped dark:bg-* row', () => {
    const fixture = [
      '<div className="overflow-x-auto sm-btn">',
      '  <table><tbody>',
      '    <tr className={i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-gray-50 dark:bg-zinc-800"}>',
      '      <td className="px-2 py-2 font-bold">{i + 1}</td>',
      '      <td className="px-2 py-2 truncate max-w-[160px]">{entry.title}</td>',
      '    </tr>',
      '  </tbody></table>',
      '</div>',
    ].join('\n');
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 2);
  });
});

describe('theme-convention scanner — the actual regression gate over src/components', () => {
  it('finds zero violations in every file this lane owns (ScriptDoctorPanel.tsx excluded — see header)', () => {
    const files = listTsxFiles(COMPONENTS_DIR);
    assert.ok(files.length > 50, `sanity: expected many .tsx files under src/components, found ${files.length}`);

    const allViolations: Violation[] = [];
    for (const file of files) {
      const rel = relative(REPO_ROOT, file);
      if (RESERVED_FILES.has(rel)) continue;
      const source = readFileSync(file, 'utf8');
      allViolations.push(...findThemeConventionViolations(source, rel));
    }

    assert.deepEqual(
      allViolations,
      [],
      'theme-convention violation (dark:bg-* composited with invariant ink text, or the reverse):\n'
      + allViolations.map((v) => `  ${v.file}:${v.line} — ${v.value}`).join('\n'),
    );
  });

  it('the reserved ScriptDoctorPanel.tsx exclusion is not silently hiding a bigger number than it looks — recorded here so a change is visible in review', () => {
    const file = join(COMPONENTS_DIR, 'scriptide', 'ScriptDoctorPanel.tsx');
    const source = readFileSync(file, 'utf8');
    const violations = findThemeConventionViolations(source, relative(REPO_ROOT, file));
    // Not a pass/fail assertion on the count itself (this lane does not own
    // that file) — it pins the number so any future change to it shows up
    // as a diff in this test rather than an invisible drift either way.
    assert.equal(violations.length, 36);
  });
});
