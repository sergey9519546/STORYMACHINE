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
// Three deliberate scope limits, kept because widening any of them would
// trade a real capability for false positives or false confidence
// (round 3 adds the third — independent review round 2, item 2):
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
//     defined elsewhere is not resolved back to its literal value — this
//     walk reads the attribute's own source text, not a constant-folded
//     evaluation. This cannot produce a false positive (an unresolved
//     attribute just falls through to "inherit," same as no class at all)
//     but it CAN miss a real bug hidden behind a variable. The LIVE shape
//     of exactly this limit: SlatePanel.tsx's ranked table rows declare
//     `const rowBg = i % 2 === 0 ? "bg-[var(--sm-panel)]" :
//     "bg-[var(--sm-panel-2)]"` a few lines above, then reference it as
//     `className={rowBg}` on the `<tr>` — this walk sees only the
//     identifier `rowBg`, not the literal classes it holds, on both `<tr>`s
//     that use it. That row background is theme-invariant today (proven at
//     `fix/a-bare-var.tsx`, which reproduces the identical pattern with
//     `main`'s pre-fix DARK values and still reports 0 — this walk cannot
//     see it either way), so there is nothing live for this scanner to
//     miss right now — but if a future edit made `rowBg` themed again
//     (round 1 and round 2's own regression, in miniature), this walk
//     would not catch it. `scripts/verify-a11y.mjs`'s step 10b
//     (`light-/dark-slate-table`, a real scoped `axe.run` against the
//     rendered table after a rank) is the backstop for exactly this case —
//     proven able to catch it: the round-1 counterfactual
//     (`.../scratchpad/gate-logs/slate-counterfactual-round2.log`) restored
//     the pre-fix colours in the live DOM and the SAME scoped axe call
//     reported the finding's own numbers (2.13/2.04 light, ~1.05 dark).
//   - COMPOSITION ACROSS FUNCTION/COMPONENT BOUNDARIES IS NOT WALKED, and
//     neither is JSX passed as an attribute value. This walk resets to the
//     root defaults (`safe` background, `invariant` text) at the start of
//     EVERY JSX tree it is handed — which is correct for the top-level
//     call this test makes per file, but the walk never crosses INTO a
//     separate function/component body it encounters (a `<Card s={s}/>`
//     reference is a JsxSelfClosingElement or a childless JsxElement; this
//     walk does not — and structurally cannot, without full type/import
//     resolution across files and inlining — look inside `Card`'s own
//     JSX to see what its `s` prop paints or colors), nor into JSX
//     supplied as an attribute (`label={<span>…</span>}`, never a
//     `node.children` entry). A `dark:bg-*` div wrapping `<Card
//     s={s}/>` where `Card`'s own body renders an invariant-ink `<span>`
//     is invisible to this walk (reproduced at `fix/b-cross-function.tsx`:
//     0 violations; `fix/c-component-child.tsx`, a `<SomeText/>` child of a
//     `dark:bg-zinc-800` div, likewise 0). Every real component in
//     src/components today either renders its own text inline or is a
//     leaf whose parent already gets scanned as its own file, so this has
//     not (yet) hidden a live bug — but it means the reserved
//     ScriptDoctorPanel.tsx count pinned below is a LOWER bound on what a
//     component-boundary-aware walk would find, not the true count, and
//     the browser gates remain the real backstop for cross-component
//     composition the same way they are for the bare-variable case above.
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
// ROUND 3 (independent review round 2, item 1): the same proof for the
// REVERSE rule. The forward-only detector reported ZERO violations against
// `fix/f-reverse.tsx` (independent review's reproduction of this round's
// own regression: `bg-[var(--sm-panel-2)]` — invariant, "safe" — wrapping
// `<p className="text-xs text-gray-600 dark:text-gray-400">`) even though
// the failure message already promised to catch "the reverse." With the
// reverse rule implemented, that same fixture now reports ONE violation
// (the `<p>`, effective background `safe`, effective text `themed`) — see
// the "proof it can actually fail" describe block below.
//
// Turning the reverse rule ON and scanning the live tree found THREE more
// real, live instances of the exact same shape — a themed `dark:text-*`
// orphaned on a file with no `dark:bg-*` anywhere to pair it with — none
// of them previously known:
//   - Sidebar.tsx (LongTextField's character-count caption): `text-red-500
//     dark:text-red-400` / `text-yellow-600 dark:text-yellow-400` — this
//     entire file has zero `dark:bg-*` occurrences. FIXED (dropped the
//     `dark:` half; the file's real ambient never leaves light).
//   - StateDeltaCard.tsx (the "Dramatic Irony" callout): `text-amber-700
//     dark:text-amber-300` on the SAME `bg-amber-500/10` — this file too
//     has zero `dark:bg-*` occurrences. FIXED, same way.
//   - ScriptIDE.tsx (`renderTitlePage`, `:2222`): `bg-[var(--sm-panel)]
//     dark:text-white` — an invariant background with white text once
//     dark mode is toggled. Real, live, NOT fixed — see RESERVED_FILES
//     below for why (this file is reserved for a different lane).
// Building the reverse rule ALSO surfaced one false positive along the way
// (documented at hasFractionalDarkBg's definition below): a same-element
// pair like `bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300`
// (SlatePanel.tsx's former deploying/error banners, before round 2 made
// the whole file invariant) is correctly, fully themed, but the earlier
// version of this rule flagged it because a fractional dark background
// was being treated as confidently "safe" rather than left ambiguous.
// Fixed before this rule shipped — see the fixture proof below ("the
// SlatePanel historical alert-box shape").
//
// ScriptDoctorPanel.tsx is the confirmed exception at scale: this walk
// finds AT LEAST 65 real instances of the forward OR reverse shape there —
// 36 forward (verified by hand in round 2 — e.g. line ~5098's `<span
// className="text-xs font-bold">Graph Health</span>` inside a `<div
// className="border-2 border-black dark:border-white/20 bg-white
// dark:bg-zinc-900 p-3">`) plus 29 more the reverse rule newly finds this
// round (e.g. `:807`'s `text-gray-600 dark:text-gray-300` — the identical
// Sidebar.tsx/StateDeltaCard.tsx shape, in this file too). "At least"
// because of the third scope limit above (composition across function/
// component boundaries is not walked) — a component-boundary-aware
// version of this walk could find more in that same file; 65 is what THIS
// walk can see today, a floor, not a ceiling. That file is reserved for a
// different, concurrently-running lane (see the original brief's
// constraints, and LANE_STANDARD §2's "the reason it cannot be [fixed] is
// written down with file and line evidence") and the round-1 independent
// review explicitly endorsed leaving it alone for exactly that reason.
// ScriptIDE.tsx joins it this round for the one reverse-rule hit above.
// The regression gate below excludes both BY NAME, with this paragraph as
// the citation, rather than silently scoping past them —
// CoverageSummary.tsx (also reserved) needs no such exclusion, because
// this walk finds zero violations there either way.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const COMPONENTS_DIR = join(REPO_ROOT, 'src', 'components');

// Reserved for a different, concurrently-running lane (see this file's
// header) — real violations found there are disclosed in the round-2 and
// round-3 reports, not fixed here, and not asserted against below.
// ScriptIDE.tsx joined this set in round 3: the new REVERSE rule (see the
// header) found ONE real, live instance at `:2222` (renderTitlePage's
// `bg-[var(--sm-panel)] dark:text-white` — an invariant background with an
// orphaned `dark:text-white`, so "written by" and the author field render
// white-on-cream once dark mode is toggled) — a genuine bug, but in a file
// this lane does not own.
const RESERVED_FILES = new Set([
  join('src', 'components', 'scriptide', 'ScriptDoctorPanel.tsx'),
  join('src', 'components', 'ScriptIDE.tsx'),
]);

interface Violation {
  file: string;
  line: number;
  value: string;
}

type BgMode = 'inherit' | 'safe' | 'dark';
// 'themed' (round 3, independent review round 2 item 1) is an element's own
// (or inherited) `dark:text-*` color declaration — a text color that
// EXPECTS the ambient to toggle with it. It is distinct from 'invariant'
// (never changes) and 'safe' (a plain light-only color, e.g. `text-red-700`
// alone, that never changes either but isn't the --sm-ink family this
// scanner tracks). See findThemeConventionViolations's reverse check below.
type TextMode = 'inherit' | 'safe' | 'invariant' | 'themed';

// `.sm-btn` / `.sm-btn--ink` / `.sm-btn--stamp` (design-system.css:131-136)
// each set BOTH a fixed background AND a fixed text color via a plain CSS
// class rule, not a Tailwind utility — neither ever reacts to `.dark`. This
// is the exact mechanism behind B-14 (the invariant ink came from
// `.sm-btn`'s `color:`, cascading onto a `dark:bg-*` descendant two levels
// down). The bare-token match (not `--off`, a no-color opacity modifier,
// and not a partial match inside those `--suffix` variants) is anchored on
// both sides so it can't fire inside an unrelated class.
const SMBTN_FAMILY_RE = /(^|[\s"'`{])sm-btn(--ink|--stamp)?(?=[\s"'`}]|$)/;
// Round 4 (independent review round 3, item 3): `dark:bg-[var(--sm-panel)]`
// / `dark:bg-[var(--sm-panel-2)]` PAINT LIGHT (both are the design system's
// invariant light panel tokens — design-system.css:49-50) even though the
// token starts with `dark:bg-`. The base pattern below would otherwise
// classify them as a dark background, propagating `bg: 'dark'` into a
// subtree that is actually rendered on a light surface — the exact
// opposite of what the class paints. The negative lookahead excludes them
// from EITHER dark-bg regex entirely (solid or fractional); such a token
// then falls through to `ANY_BG_RE` / `hasOwnSolidBg` like any other
// non-dark background declaration — see INVARIANT_BG_VAR_RE's own fixture
// proof below. Live shape: ScriptIDE.tsx:3035's
// `bg-black dark:bg-[var(--sm-panel)]` (reserved, carries no text, so this
// was a latent false-positive shape rather than a live one — but a
// scanner whose value is not crying wolf should not carry it forward).
// Round 5 (independent review round 4, follow-up 1): the lookahead used to
// be a bare prefix match (`(?!\[var\(--sm-panel`), which disagreed with
// INVARIANT_BG_VAR_RE below on a hypothetical `dark:bg-[var(--sm-panelXYZ)]`
// — excluded from EITHER dark-bg regex by the lookahead, but not matched
// by INVARIANT_BG_VAR_RE's exact-token requirement either, so it fell
// through to `inherit` rather than the `safe` it should resolve to.
// Tightened to require the exact closing `)]` (with the optional `-2`),
// so the two paths can never disagree on a token name they don't both
// recognize — see the fixture proof below.
//
// Round 5 (independent review round 4, follow-up 2): this used to be ONE
// character class covering both plain color-name tokens (`dark:bg-red-950`)
// and arbitrary-value tokens (`dark:bg-[...]`), and that class excluded
// `/` so the (\/\d{1,3})? suffix group could read a trailing Tailwind
// shorthand opacity (`dark:bg-red-950/40`). But an arbitrary CSS
// color-function value can carry its OWN internal `/` for an alpha channel
// (`dark:bg-[rgb(24_24_27/0.95)]`, CSS Color Module 4 syntax) — the shared
// class stopped consuming at that internal slash, and the trailing group
// then greedily read "/0" off "0.95)]" (alpha 0), wrongly exempting an
// effectively opaque background. Split into two alternatives: BRACKET
// tokens (`\[[^\]]*\]`) may contain `/` freely, since it's an arbitrary
// value this walk doesn't otherwise parse; NAMED tokens keep the original,
// `/`-free class so the outer Tailwind shorthand suffix still parses the
// same way it always did. Each alternative still allows an OUTER trailing
// `/NN` shorthand too (Tailwind allows applying opacity to an arbitrary
// value from outside it, `dark:bg-[...]/50`) — see hasSolidDarkBg for how
// the two alpha sources (outer shorthand vs. inner CSS-function slash) are
// reconciled.
const DARK_BG_TOKEN_SRC = '(^|[\\s"\'`{])dark:bg-(?!\\[var\\(--sm-panel(-2)?\\)\\])(?:(\\[[^\\]]*\\])|([\\w.#()-]+))(\\/\\d{1,3})?';
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

// Round 4 (independent review round 3, item 2): the fractional-opacity
// carve-out (see hasFractionalDarkBg below) was previously unbounded in
// alpha — ANY `dark:bg-*/N` fell through to `inherit`, so a future
// `dark:bg-zinc-900/95` (effectively opaque) would have been wrongly
// exempted from the forward rule. 60 is the threshold: at or above it, a
// dark tint is confidently dark regardless of what's behind it (verified
// against every fractional dark:bg-* actually in `src` today — all are
// /10, /20, or /40, all safely below this line, so nothing live crosses
// it; see the fixture proof below for both directions). Below 60, the
// composited result depends too much on the ambient to call it — that
// stays `inherit`, per hasFractionalDarkBg's own reasoning.
const FRACTIONAL_DARK_BG_SOLID_THRESHOLD = 60;

/** A `dark:bg-[var(--sm-panel)]` / `dark:bg-[var(--sm-panel-2)]` token —
 *  see DARK_BG_TOKEN_SRC's comment for why these are excluded from the
 *  dark-bg regexes despite the `dark:bg-` prefix: they paint the
 *  invariant LIGHT panel, not a dark surface. */
const INVARIANT_BG_VAR_RE = /(^|[\s"'`{])dark:bg-\[var\(--sm-panel(-2)?\)\](?=[\s"'`}]|$)/;

/** Looks for a CSS Color Module 4 style internal alpha channel inside an
 *  arbitrary-value bracket (`[rgb(24_24_27/0.95)]` — Tailwind stands
 *  underscores in for the spaces `rgb(24 24 27 / 0.95)` would otherwise
 *  need) — the LAST `/` inside the brackets, followed by a number, either
 *  a 0-1 fraction or an already-0-100 value. Returns the alpha as a 0-100
 *  number, or `null` when the bracket carries no such marker at all (an
 *  8-digit hex, a bare arbitrary value with no slash, …) — this walk
 *  cannot tell in that case, so it is treated as confidently solid (the
 *  safe direction — see hasSolidDarkBg). */
function parseInternalAlpha(bracketContent: string): number | null {
  const inner = bracketContent.slice(1, -1); // strip the outer [ ]
  const slash = inner.lastIndexOf('/');
  if (slash === -1) return null;
  const value = Number.parseFloat(inner.slice(slash + 1));
  if (Number.isNaN(value)) return null;
  return value <= 1 ? value * 100 : value;
}

/** A confidently dark `dark:bg-*` token: no opacity information at all
 *  (named or bracket-form with nothing to read), or an opacity — Tailwind
 *  shorthand OUTSIDE the token, or a CSS-function alpha channel INSIDE an
 *  arbitrary-value bracket, see parseInternalAlpha — at or above
 *  FRACTIONAL_DARK_BG_SOLID_THRESHOLD. Below that line, this walk cannot
 *  confidently call it dark (see this file's header). */
function hasSolidDarkBg(raw: string): boolean {
  for (const m of raw.matchAll(new RegExp(DARK_BG_TOKEN_SRC, 'g'))) {
    // Group indices: [0] full match, [1] boundary, [2] the lookahead's own
    // inner "-2" capture (always undefined in any match this loop sees —
    // a negative lookahead that matched would have blocked the match
    // entirely), [3] bracket token, [4] named token, [5] outer suffix.
    const [, , , bracketToken, namedToken, outerSuffix] = m;
    if (outerSuffix) {
      // A Tailwind shorthand opacity OUTSIDE the token — applies to either
      // form (`dark:bg-red-950/40` or `dark:bg-[...]/50`) and always wins
      // over whatever might be inside a bracket, since it's what actually
      // controls the rendered alpha.
      const alpha = Number.parseInt(outerSuffix.slice(1), 10);
      if (alpha >= FRACTIONAL_DARK_BG_SOLID_THRESHOLD) return true;
      continue;
    }
    if (bracketToken) {
      const alpha = parseInternalAlpha(bracketToken);
      if (alpha === null || alpha >= FRACTIONAL_DARK_BG_SOLID_THRESHOLD) return true;
      continue;
    }
    if (namedToken) return true; // no opacity information anywhere — solid
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
  // True when THIS element's own className declares SOME dark:bg-* token,
  // solid or fractional — used to exempt a genuine same-element pair (a
  // fractional dark:bg with the SAME element's own dark:text-*, e.g. a
  // semantic alert box) from the reverse check even though the fractional
  // background resolves to 'inherit' for propagation purposes. See the
  // reverse-rule fixture proof below ("the SlatePanel historical alert-box
  // shape") for why this exists.
  ownAttemptedDarkBg: boolean;
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
  // A FRACTIONAL dark:bg-* token (present, but not solid — see
  // hasSolidDarkBg) makes this element's OWN dark-mode background
  // ambiguous, not "confidently light." A same-element pair like
  // `bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300` (a
  // common semantic-alert shape, e.g. SlatePanel.tsx's historical
  // deploying/error banners) is correctly, fully themed — but under
  // `.dark`, Tailwind's cascade REPLACES `bg-red-50` with the translucent
  // `dark:bg-red-950/40`, whose real rendered color depends on whatever
  // ambient sits behind it, which could be genuinely dark. Treating that
  // case as 'safe' (rather than passing the INHERITED bg through
  // unchanged) previously produced a false REVERSE-rule positive on this
  // exact shape (found building the reverse rule, round 3): the element's
  // own `dark:text-*` looked "orphaned" against a background this walk had
  // wrongly asserted was confidently light. `hasFractionalDarkBg` lets such
  // an element fall through to `inherit` instead, so it takes on whatever
  // the real ambient already was — correct whether that ambient is
  // genuinely dark (this shape) or genuinely invariant (AnalysisPanel.tsx's
  // real fractional-tint cards, this file's other fractional-opacity proof
  // fixture, unaffected by this change).
  const hasFractionalDarkBg = hasAnyDarkBgToken(raw) && !hasDarkBg;
  const hasOwnSolidBg = hasDarkBg || ANY_BG_RE.test(raw) || isSmBtnFamily || INVARIANT_BG_VAR_RE.test(raw);

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
  const ownBgMode: BgMode = hasDarkBg
    ? 'dark'
    : hasFractionalDarkBg
      ? 'inherit' // ambiguous — pass the real ambient through, see above
      : hasOwnSolidBg
        ? 'safe'
        : 'inherit';
  const ownTextMode: TextMode = !hasAnyTextColor
    ? 'inherit'
    : ownTextIsInvariant
      ? 'invariant'
      : hasDarkTextColor
        ? 'themed'
        : 'safe';

  return {
    raw,
    newBg: ownBgMode === 'inherit' ? inheritedBg : ownBgMode,
    newText: ownTextMode === 'inherit' ? inheritedText : ownTextMode,
    ownAttemptedDarkBg: hasDarkBg || hasFractionalDarkBg,
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
 *  the two disagree, in EITHER direction — see this file's header for the
 *  full mechanism and its disclosed scope limits.
 *
 *  FORWARD (B-11/B-14's shape): effective background is a solid `dark:bg-*`
 *  and effective text is invariant ink — a real dark surface under text
 *  that never reacts to the toggle.
 *
 *  REVERSE (round 3, independent review round 2 item 1 —
 *  `SnapshotManager.tsx`'s own round-2 regression, reproduced at
 *  `fix/f-reverse.tsx` in the review): effective background never carries a
 *  `dark:bg-*` anywhere in the chain down to this leaf (it is `safe` —
 *  invariant, or a plain light-only color) and this leaf's own text carries
 *  a `dark:text-*` color — a themed text half with no themed background to
 *  pair it with, so the `dark:` half fires against an ambient that never
 *  goes dark. The failure message below names both. */
function findThemeConventionViolations(source: string, filePath: string): Violation[] {
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: Violation[] = [];

  function visit(node: ts.Node, bg: BgMode, text: TextMode): void {
    if (ts.isJsxElement(node)) {
      const { raw, newBg, newText, ownAttemptedDarkBg } = classify(node.openingElement, sf, bg, text);
      const isForwardViolation = newBg === 'dark' && newText === 'invariant';
      // `!ownAttemptedDarkBg`: a leaf whose OWN className already attempts
      // a dark:bg-* (even a fractional one that resolves to 'inherit' for
      // propagation, see hasFractionalDarkBg's comment) is a same-element
      // themed pair, not an orphaned dark:text-* — exempt it here even
      // though the resolved effective background is 'safe'.
      const isReverseViolation = newBg === 'safe' && newText === 'themed' && !ownAttemptedDarkBg;
      if ((isForwardViolation || isReverseViolation) && hasDirectText(node)) {
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

  it('does NOT flag a same-element fractional-dark-bg PROPERLY paired with its own dark:text-* — the SlatePanel historical alert-box shape', () => {
    // Building the reverse rule (round 3) this fixture was a false
    // positive: `dark:bg-red-950/40` is fractional, so this walk (correctly)
    // does not call it confidently dark — but the earlier version then
    // asserted the opposite (confidently 'safe'), so the element's own
    // `dark:text-red-300` looked orphaned and the reverse rule fired. A
    // fractional dark:bg now falls through to `inherit` instead of
    // asserting 'safe', so this same-element pair (correctly, fully
    // themed — its true dark-mode background is genuinely ambiguous/
    // context-dependent, not confidently light) is left alone either way.
    // Literal shape of `git show main:src/components/SlatePanel.tsx`'s
    // former deploying/error banners.
    const fixture = '<div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300">{rankError}</div>';
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });

  // ── Bounded fractional-opacity threshold (round 4, independent review
  //    round 3, item 2): a HIGH-alpha "fractional" dark:bg (/60 and above)
  //    is confidently dark, not ambiguous — see
  //    FRACTIONAL_DARK_BG_SOLID_THRESHOLD's comment. ─────────────────────

  it('a HIGH-opacity dark:bg-[rgb(…/0.95)] (CSS-function alpha syntax, INSIDE the brackets) IS caught (round 5, independent review round 4, follow-up 2)', () => {
    // Before this round, the shared bracket/named character class excluded
    // "/", so matching stopped at the internal slash inside
    // `[rgb(24_24_27/0.95)]` and the trailing `(\/\d{1,3})?` group then
    // read "/0" off "0.95)]" (parsed as alpha 0) — wrongly exempting an
    // effectively opaque (95%) background. parseInternalAlpha now reads
    // the alpha from INSIDE the bracket when there's no outer Tailwind
    // shorthand suffix to prefer instead.
    const fixture = [
      '<div className="bg-white dark:bg-[rgb(24_24_27/0.95)] p-4">',
      '  <span className="text-[var(--sm-ink)]">{"caught"}</span>',
      '</div>',
    ].join('\n');
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  it('dark:bg-zinc-900/[0.95] (Tailwind\'s own arbitrary-opacity shorthand) still IS caught', () => {
    // The outer "/" here is NOT inside the arbitrary-value bracket (there
    // is no bracket on the color name itself) — the named-token branch
    // matches "zinc-900" and stops before the "/", the outer suffix group
    // then fails to match "[0.95]" (not digits), so this token carries no
    // alpha information at all and defaults to confidently solid — the
    // same "nothing to read, so solid" direction as `dark:bg-[#18181bF2]`
    // below.
    const fixture = [
      '<div className="bg-white dark:bg-zinc-900/[0.95] p-4">',
      '  <span className="text-[var(--sm-ink)]">{"caught"}</span>',
      '</div>',
    ].join('\n');
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  it('dark:bg-[#18181bF2] (8-digit hex with an alpha byte, no internal slash to read) still IS caught', () => {
    const fixture = [
      '<div className="bg-white dark:bg-[#18181bF2] p-4">',
      '  <span className="text-[var(--sm-ink)]">{"caught"}</span>',
      '</div>',
    ].join('\n');
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  it('a LOW internal alpha inside an arbitrary-value bracket (dark:bg-[rgb(…/0.3)]) is still NOT confidently dark', () => {
    const fixture = [
      '<div className="bg-white dark:bg-[rgb(24_24_27/0.3)] p-4">',
      '  <span className="text-[var(--sm-ink)]">{"not caught"}</span>',
      '</div>',
    ].join('\n');
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });

  it('a HIGH-opacity dark:bg-*/95 (effectively opaque) IS caught by the forward rule, unlike a genuinely low-opacity one', () => {
    const fixture = [
      '<div className="bg-white dark:bg-zinc-900/95 p-4">',
      '  <span className="text-[var(--sm-ink)]">{"caught"}</span>',
      '</div>',
    ].join('\n');
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  it('a LOW-opacity dark:bg-*/40 (below the threshold) is still NOT confidently dark — the AnalysisPanel/alert-box shape stays exempt', () => {
    const fixture = [
      '<div className="bg-white dark:bg-zinc-900/40 p-4">',
      '  <span className="text-[var(--sm-ink)]">{"not caught"}</span>',
      '</div>',
    ].join('\n');
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });

  // ── dark:bg-[var(--sm-panel*)] is LIGHT, not dark (round 4, independent
  //    review round 3, item 3) ─────────────────────────────────────────

  it('does NOT treat dark:bg-[var(--sm-panel)] as a dark background — it paints the invariant light panel', () => {
    // Live shape: ScriptIDE.tsx's `bg-black dark:bg-[var(--sm-panel)]` — in
    // .dark this token actually SWITCHES this element to the light panel
    // colour. Before this fix, the naive token regex classified it as
    // 'dark', which would have propagated a wrong `bg: 'dark'` into any
    // text this element or its descendants carry.
    const fixture = '<div className="bg-black dark:bg-[var(--sm-panel)] p-4"><span className="text-[var(--sm-ink)]">{"fine"}</span></div>';
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });

  it('does NOT treat dark:bg-[var(--sm-panel-2)] as a dark background either', () => {
    const fixture = '<div className="bg-black dark:bg-[var(--sm-panel-2)] p-4"><span className="text-[var(--sm-ink)]">{"fine"}</span></div>';
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });

  it('does NOT extend the --sm-panel exclusion to a LOOK-ALIKE token name (round 5, independent review round 4, follow-up 1)', () => {
    // Before this round the DARK_BG_TOKEN_SRC lookahead was a bare prefix
    // match (`(?!\[var\(--sm-panel`), which would have excluded THIS token
    // from the dark-bg regexes too (same prefix) while INVARIANT_BG_VAR_RE
    // (an exact-token match) would NOT have recognized it as the known
    // invariant panel either — the two paths disagreed, and the token fell
    // through to `inherit` rather than being confidently classified either
    // way. Tightening the lookahead to require the exact closing `)]`
    // means a look-alike name is no longer excluded from the dark
    // classification at all — it is read as an ordinary (unknown)
    // arbitrary-value background and, having no internal alpha marker to
    // read, defaults to confidently dark (the same treatment
    // `dark:bg-[var(--sm-ink)]` already gets) — the opposite of being
    // treated as the safe, invariant panel.
    const fixture = '<div className="dark:bg-[var(--sm-panelXYZ)] p-4"><span className="text-[var(--sm-ink)]">{"x"}</span></div>';
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  it('a REAL dark:bg-zinc-* still IS caught even when it sits next to an unrelated dark:bg-[var(--sm-panel)] token', () => {
    // Guards against an over-broad exclusion swallowing genuine dark
    // tokens elsewhere in the same className.
    const fixture = [
      '<div className="dark:bg-[var(--sm-panel)] dark:bg-zinc-900 p-4">',
      '  <span className="text-[var(--sm-ink)]">{"caught"}</span>',
      '</div>',
    ].join('\n');
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  // ── REVERSE rule (round 3, independent review round 2, item 1) ──────────

  it('REVERSE: flags an invariant background whose descendant text carries an orphaned dark:text-* — this round\'s own regression', () => {
    // Literal reproduction of the independent review's `fix/f-reverse.tsx`
    // — the exact shape of the SnapshotManager.tsx:405 regression this
    // round's own fix caught (bg-[var(--sm-panel-2)], invariant, wrapping
    // a caption whose `dark:text-gray-400` kept firing with no themed
    // background to pair it with). Before this rule existed, this fixture
    // reported ZERO violations even though the failure message already
    // promised "or the reverse."
    const fixture = [
      '<div className="bg-[var(--sm-panel-2)] p-6">',
      '  <p className="text-xs text-gray-600 dark:text-gray-400">Current unsaved changes will be lost.</p>',
      '</div>',
    ].join('\n');
    const violations = findThemeConventionViolations(fixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
    assert.ok(violations[0].value.includes('dark:text-gray-400'));
  });

  it('REVERSE: does NOT flag a dark:text-* that IS paired with a real dark:bg-* ancestor (the correct fully-themed convention)', () => {
    const fixture = [
      '<div className="bg-white dark:bg-zinc-900 p-4">',
      '  <p className="text-gray-600 dark:text-gray-400">fine</p>',
      '</div>',
    ].join('\n');
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });

  it('REVERSE: does NOT flag a dark:text-* on an invariant background that is ALSO overridden by the same element\'s own bg (same-element fully-themed pair)', () => {
    const fixture = '<div className="bg-[var(--sm-panel-2)] p-4"><p className="bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400">fine</p></div>';
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });

  // ── Third scope limit (round 3, independent review round 2, item 2):
  //    composition across function/component boundaries, and JSX passed as
  //    an attribute value, are NOT walked. Both reproduced from the
  //    review's own fixtures (fix/b-cross-function.tsx,
  //    fix/c-component-child.tsx) — literal copies, not paraphrased —
  //    proving the walk reports 0 on shapes that ARE real bugs, exactly as
  //    the header now discloses. These are NOT "does not flag" fixtures in
  //    the same sense as the ones above (which prove a CORRECT non-flag);
  //    they document a known gap so its absence is a decision, not a
  //    silent hole. ──────────────────────────────────────────────────────

  it('SCOPE LIMIT (disclosed): does not see a bug that crosses a function/component boundary in the same file', () => {
    // fix/b-cross-function.tsx — a <Card> whose invariant-ink <span>
    // renders inside a dark:bg-zinc-800 <Panel> wrapper: a real B-11-shape
    // bug (measured shape identical to the historical one), invisible to
    // this walk because it never enters Card's own function body.
    const fixture = [
      'function Card({ s }) {',
      '  return <div className="p-4"><span className="text-[var(--sm-ink-mute)]">{s.date}</span></div>;',
      '}',
      'export function Panel({ items }) {',
      '  return (',
      '    <div className="bg-white dark:bg-zinc-800 p-4">',
      '      {items.map((s) => <Card key={s.id} s={s} />)}',
      '    </div>',
      '  );',
      '}',
    ].join('\n');
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });

  it('SCOPE LIMIT (disclosed): does not see a bug rendered by a child component (its own JSX lives in another function)', () => {
    // fix/c-component-child.tsx — <SomeText/> may render invariant-ink
    // text inside this dark:bg-zinc-800 div; this walk cannot know without
    // resolving into SomeText's own definition.
    const fixture = '<div className="bg-white dark:bg-zinc-800 p-4"><SomeText value={label} /></div>';
    assert.deepEqual(findThemeConventionViolations(fixture, 'fixture.tsx'), []);
  });

  it('SCOPE LIMIT (disclosed, live): the bare-variable limit\'s actual shape in SlatePanel.tsx today reports 0 either way, so nothing live is currently hidden by it', () => {
    // fix/a-bare-var.tsx — literal reproduction of SlatePanel.tsx's real
    // `const rowBg = ...; <tr className={rowBg}>` pattern, fed BOTH the
    // live (theme-invariant) value and, here, main's pre-fix DARK value —
    // both report 0, because this walk never resolves `rowBg` back to
    // either literal. scripts/verify-a11y.mjs step 10b
    // (light-/dark-slate-table) is the real backstop for this shape — see
    // this file's header for the counterfactual proof that it actually
    // catches it.
    const fixture = [
      '<div className="overflow-x-auto sm-btn">',
      '  <table><tbody>',
      '    {entries.map((e, i) => {',
      '      const rowBg = i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-gray-50 dark:bg-zinc-800";',
      '      return (',
      '        <tr key={i} className={rowBg}>',
      '          <td className="px-2 py-2 font-bold">{i + 1}</td>',
      '        </tr>',
      '      );',
      '    })}',
      '  </tbody></table>',
      '</div>',
    ].join('\n');
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

  it('the reserved ScriptDoctorPanel.tsx exclusion is a pinned, exact MEASURED FLOOR — re-pin by hand', () => {
    // Round 4 (independent review round 3, item 4): round 3 loosened this
    // to `assert.ok(violations.length >= 65)`, reasoning that the
    // detector's own third scope limit (composition across function/
    // component boundaries — this file's header) means the true count
    // could always be higher, so asserting a specific total would claim a
    // completeness this walk cannot back up. That reasoning is right about
    // the NUMBER but wrong about the OPERATOR: `>=` catches a fix in this
    // file dropping the count (confirmed by construction: 65 -> 0 fails),
    // but it lets a NEW violation added to this reserved file — by the
    // concurrently-running lane that owns it — pass silently, which is
    // exactly the case that matters most while that lane is actively
    // editing it. `assert.equal` keeps the same honesty (the comment says
    // plainly this is a measured floor on what THIS walk sees today, not a
    // claim about the file's true violation count) while restoring BOTH
    // directions of the signal: re-run this walk and update the number by
    // hand — never loosen back to `>=` — if a legitimate change to that
    // file moves the count either way.
    const file = join(COMPONENTS_DIR, 'scriptide', 'ScriptDoctorPanel.tsx');
    const source = readFileSync(file, 'utf8');
    const violations = findThemeConventionViolations(source, relative(REPO_ROOT, file));
    assert.equal(
      violations.length,
      65,
      `measured floor: this walk saw exactly 65 forward+reverse violations in the reserved file last time it was `
      + `hand-checked; found ${violations.length} now — re-measure by hand and re-pin, do not loosen this back to >=`,
    );
  });

  it('the reserved ScriptIDE.tsx exclusion is also a pinned, exact measured floor', () => {
    // Round 3: ScriptIDE.tsx joined RESERVED_FILES this round because the
    // new reverse rule found one real, live bug there (renderTitlePage's
    // `bg-[var(--sm-panel)] dark:text-white` — see RESERVED_FILES's own
    // comment above; still 1.15:1 in dark mode, still not fixed here,
    // another lane owns this file). Round 4: same exact-floor treatment as
    // ScriptDoctorPanel.tsx's test above, for the same reason.
    const file = join(COMPONENTS_DIR, 'ScriptIDE.tsx');
    const source = readFileSync(file, 'utf8');
    const violations = findThemeConventionViolations(source, relative(REPO_ROOT, file));
    assert.equal(
      violations.length,
      1,
      `measured floor: this walk saw exactly 1 violation in the reserved file last time it was hand-checked; `
      + `found ${violations.length} now — re-measure by hand and re-pin, do not loosen this back to >=`,
    );
  });
});
