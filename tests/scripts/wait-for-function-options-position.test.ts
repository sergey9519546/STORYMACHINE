// `page.waitForFunction(fn, arg, options)` takes its options THIRD.
//
// ── Why this guard exists (2026-09-12, writer-loop review round 1) ──────────
//
// Every `waitForFunction` call in this repository's browser gates passed
// `{ timeout }` in the ARG position. Playwright hands the second argument to the
// page function as its argument and applies its own 30-second default timeout —
// so a wait written as
//
//     page.waitForFunction(fn, { timeout: timing.ms(180000) })
//
// reads as a three-minute budget and is a thirty-second one. MEASURED with this
// file's own scanner: 12 of the 12 calls on `main` at f94d587e were written that
// way, across four suites — and the reviewed tip 718a0b1d still had 8 of them,
// two collapsing recorded 45 s and 40 s budgets to 30 s.
//
// It is not a cosmetic defect. In `scripts/verify-p2-p3-surfaces.mjs` the
// feature-length coverage wait fataled at 30 s under load and deleted the whole
// of `P2-featurelen`'s finding-#5 evidence plus all three `P2-deadcontrols`
// assertions — 24 assertions that never ran while the suite reported
// "218/218 passed". The round-1 reviewer reproduced that three times, once on an
// idle machine.
//
// The fix is one token per call (`undefined` in the arg position). This test is
// what stops the next call from being written the old way: it is a
// grep-style scan, deliberately textual rather than type-driven, because these
// files are plain `.mjs` with no types to check them.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '../..');
const SCRIPTS = path.join(REPO, 'scripts');

/** Every `.mjs` under scripts/ — the browser gates and their helpers. */
function scriptFiles(): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(SCRIPTS)) {
    if (entry.endsWith('.mjs')) out.push(path.join(SCRIPTS, entry));
  }
  for (const entry of readdirSync(path.join(SCRIPTS, 'lib'))) {
    if (entry.endsWith('.mjs')) out.push(path.join(SCRIPTS, 'lib', entry));
  }
  return out;
}

/**
 * Find every `waitForFunction(` and report the call whose SECOND argument is an
 * options object.
 *
 * The scan walks forward from the opening paren tracking bracket depth, so it
 * handles both shapes the repo uses — the whole call on one line, and the
 * pretty-printed form with the predicate, the arg and the options each on their
 * own line — without needing to parse JavaScript. A second argument is
 * "options-shaped" when the first thing at depth 1 after the first top-level
 * comma is `{` followed by a known option key.
 */
function misusedCalls(source: string): { line: number; text: string }[] {
  const bad: { line: number; text: string }[] = [];
  const needle = 'waitForFunction(';
  for (let at = source.indexOf(needle); at !== -1; at = source.indexOf(needle, at + 1)) {
    const open = at + needle.length - 1;
    let depth = 0;
    let commaAt = -1;
    let i = open;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') {
        depth--;
        if (depth === 0) break;
      } else if (c === ',' && depth === 1 && commaAt === -1) {
        commaAt = i;
      }
    }
    if (commaAt === -1) continue; // single-argument call — always correct
    const secondArg = source.slice(commaAt + 1, i).trimStart();
    if (/^\{\s*(timeout|polling)\b/.test(secondArg)) {
      const line = source.slice(0, at).split('\n').length;
      bad.push({ line, text: source.slice(at, Math.min(i + 1, at + 120)).replace(/\s+/g, ' ') });
    }
  }
  return bad;
}

/**
 * Find a bare verdict poll — the one that "RUNNING PASS 1 OF 14…" satisfies.
 *
 * Only `innerText` is vulnerable: it reflects CSS `text-transform`, so
 * `.sm-slug`'s uppercase turns the doctor's progress line into a string
 * containing the literal "PASS". `textContent` returns the raw lowercase
 * "Running pass 1 of 14…", which a case-sensitive verdict regex cannot match,
 * so those sites are left alone rather than churned — UNLESS the code
 * uppercases it by hand (`.toUpperCase()`), which reintroduces the same bug
 * without the CSS.
 *
 * ── WHY THIS TRACKS ASSIGNMENTS (2026-09-12, writer-loop review round 3) ────
 * The first spelling required the verdict alternation and `innerText` on the
 * SAME line, and the round-3 reviewer showed that hoisting the read one line
 * up walks straight past it:
 *
 *     await page.waitForFunction(() => {
 *       const t = document.body.innerText;          // ← line A
 *       return /RECOMMEND|CONSIDER|PASS/.test(t);   // ← line B
 *     }, undefined, { timeout: 5000 });
 *
 * That is not a contrived shape: `const t = document.body.innerText;` on its
 * own line already exists twice in `scripts/verify-p2-p3-surfaces.mjs`. So the
 * scan now carries the taint instead of the line: an identifier assigned from
 * an `innerText` read (of `document.body` or of any element) is tainted for
 * the rest of its block, propagates through further assignments, and a verdict
 * alternation tested anywhere against a tainted name is the same offender the
 * same-line rule catches. `textContent` taints too, but only becomes an
 * offender once something uppercases it.
 *
 * TWO MASKS, one set of byte positions. Structure (brace depth, identifier
 * occurrences) is read from the fully masked copy, so a `{` or an identifier
 * inside a string cannot move a scope or fake a use. CONTENT (the verdict
 * alternation, `innerText`, `toUpperCase`) is read from a copy with comments
 * blanked and strings KEPT, so `new RegExp('RECOMMEND|CONSIDER|PASS')` is
 * still visible while prose about the trap is not.
 *
 * ── AND ACROSS ONE CALL BOUNDARY (2026-09-12 review, non-blocking 1) ────────
 * The reviewer's plant D moved the regex instead of the read:
 *
 *     const check = (s) => /RECOMMEND|CONSIDER|PASS/.test(s);
 *     return check(t);                       // ← t is tainted, check() is the poll
 *
 * So a pre-pass collects the file's LOCAL verdict predicates — any `const`/
 * `let`/`var` bound to a function, or a `function` declaration, whose body
 * contains a verdict alternation — and a call to one of them with a tainted
 * argument is the same offender. One boundary, within one file: that is the
 * shape a person actually writes when a wait grows a helper. It does NOT
 * follow an imported function, a method on an object, or a predicate passed in
 * as a parameter; a hold spread across modules is the deny-by-default
 * territory `handRolledStreamHolds` covers for its own defect, and if that
 * shape ever appears here it should be closed the same way rather than by
 * widening this regex-level scan into an import graph.
 */
function bareVerdictPolls(source: string): { line: number; text: string }[] {
  const VERDICT_ALT = /RECOMMEND\|CONSIDER\|PASS|CONSIDER\|RECOMMEND\|PASS/;
  const INNER_TEXT = /\binnerText\b/;
  const TEXT_CONTENT = /\btextContent\b/;
  const UPPERCASE = /\btoUpperCase\s*\(/;
  // The one shared implementation, and the constants it is built from, are not
  // the trap — nor is a site that routes an already-read string through it.
  const SHARED = /waitForDoctorVerdict|DOCTOR_VERDICT_RE|textCarriesDoctorVerdict/;

  const structure = maskCommentsAndStrings(source);
  const content = maskCommentsAndStrings(source, { keepStrings: true });
  const structLines = structure.split('\n');
  const contentLines = content.split('\n');

  /** The span of the declaration starting at `from`: to the `;` that closes it
   *  at depth 0, or to the `}` that closes its body. Walked on the masked
   *  copy, so a brace or semicolon inside a string cannot end it early. */
  const declSpan = (from: number) => {
    let depth = 0;
    for (let i = from; i < structure.length; i++) {
      const c = structure[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') {
        depth--;
        if (depth <= 0 && c === '}') return content.slice(from, i + 1);
      } else if (c === ';' && depth <= 0) return content.slice(from, i);
    }
    return content.slice(from, Math.min(from + 600, content.length));
  };

  /** Locally-defined predicates whose body carries a verdict alternation. */
  const verdictPredicates = new Set<string>();
  const declarations = [
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/g,
    /function\s+([A-Za-z_$][\w$]*)\s*\(/g,
  ];
  for (const pattern of declarations) {
    for (let m = pattern.exec(structure); m; m = pattern.exec(structure)) {
      const body = declSpan(m.index);
      if (VERDICT_ALT.test(body) && !SHARED.test(body)) verdictPredicates.add(m[1]);
    }
  }

  /** The argument text of the first call to `name` on this line, masked. */
  const callArgs = (name: string, lineStart: number, lineText: string) => {
    const at = lineText.search(new RegExp(`\\b${name}\\s*\\(`));
    if (at === -1) return null;
    const open = structure.indexOf('(', lineStart + at);
    if (open === -1) return null;
    let depth = 0;
    for (let i = open; i < structure.length; i++) {
      const c = structure[i];
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) return structure.slice(open + 1, i); }
    }
    return null;
  };

  /** Block scopes, innermost last. 'transform' = the value can carry
   *  CSS-uppercased text (or was uppercased by hand); 'raw' = textContent,
   *  harmless until something uppercases it. */
  const scopes: Map<string, { kind: 'transform' | 'raw'; line: number; via: string }>[] = [new Map()];
  const lookup = (name: string) => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const hit = scopes[i].get(name);
      if (hit) return hit;
    }
    return null;
  };
  const taint = (name: string, kind: 'transform' | 'raw', line: number, via: string) => {
    scopes[scopes.length - 1].set(name, { kind, line, via });
  };

  /** The assignment's right-hand side, from `=` to the statement's `;` —
   *  across lines, since these files pretty-print long awaits. Read from the
   *  masked copy for the end position and from `content` for the text. */
  const rhsOf = (from: number) => {
    const end = structure.indexOf(';', from);
    const stop = end === -1 ? Math.min(from + 400, source.length) : Math.min(end, from + 400);
    return content.slice(from, stop);
  };

  const bad: { line: number; text: string }[] = [];
  let offset = 0;
  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];
    const structLine = structLines[i];

    // 1. Taint first, so an assign-and-test on ONE line is still caught.
    const assign = /(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*=(?!=)/g;
    for (let m = assign.exec(structLine); m; m = assign.exec(structLine)) {
      const name = m[1];
      const rhs = rhsOf(offset + m.index + m[0].length);
      if (INNER_TEXT.test(rhs)) { taint(name, 'transform', i + 1, 'an innerText read'); continue; }
      if (TEXT_CONTENT.test(rhs)) {
        const upper = UPPERCASE.test(rhs);
        taint(name, upper ? 'transform' : 'raw', i + 1, upper ? 'a textContent read uppercased by hand' : 'a textContent read');
        continue;
      }
      // Propagation: `const u = t.toUpperCase();` inherits `t`'s taint, and
      // uppercasing promotes a raw textContent read to the vulnerable kind.
      const carried = scopes
        .flatMap((scope) => [...scope.entries()])
        .find(([n]) => n !== name && new RegExp(`\\b${n}\\b`).test(rhs));
      if (carried) {
        const upper = UPPERCASE.test(rhs);
        taint(
          name,
          upper ? 'transform' : carried[1].kind,
          carried[1].line,
          upper && carried[1].kind === 'raw' ? 'a textContent read uppercased by hand' : carried[1].via,
        );
      }
    }

    // 2. Then the offender check.
    if (VERDICT_ALT.test(line) && !SHARED.test(line)) {
      if (INNER_TEXT.test(line)) {
        bad.push({ line: i + 1, text: line.trim().slice(0, 120) });
      } else if (TEXT_CONTENT.test(line) && UPPERCASE.test(line)) {
        bad.push({ line: i + 1, text: `${line.trim().slice(0, 100)} [textContent uppercased by hand]` });
      } else {
        const hoisted = scopes
          .flatMap((scope) => [...scope.entries()])
          .find(([name, meta]) => meta.kind === 'transform' && new RegExp(`\\b${name}\\b`).test(structLine));
        if (hoisted) {
          bad.push({
            line: i + 1,
            text: `${line.trim().slice(0, 90)} [\`${hoisted[0]}\` derives from ${hoisted[1].via} at line ${hoisted[1].line}]`,
          });
        }
      }
    }

    // 2b. The same defect with the REGEX moved instead of the read: a tainted
    // value handed to a locally-defined verdict predicate.
    if (!SHARED.test(line)) {
      for (const predicate of verdictPredicates) {
        const args = callArgs(predicate, offset, structLine);
        if (args === null) continue;
        const passed = scopes
          .flatMap((scope) => [...scope.entries()])
          .find(([name, meta]) => meta.kind === 'transform' && new RegExp(`\\b${name}\\b`).test(args));
        if (passed) {
          bad.push({
            line: i + 1,
            text: `${line.trim().slice(0, 80)} [\`${passed[0]}\` derives from ${passed[1].via} at line `
              + `${passed[1].line}, tested by \`${predicate}()\`]`,
          });
          break;
        }
      }
    }

    // 3. Scope bookkeeping last, from the masked copy.
    for (const c of structLine) {
      if (c === '{') scopes.push(new Map());
      else if (c === '}' && scopes.length > 1) scopes.pop();
    }
    offset += contentLines[i].length + 1;
  }
  return bad;
}

/**
 * Blank out comments and string bodies, preserving every byte position and
 * newline, so a textual scan can be run over CODE only.
 *
 * Round-1 review, non-blocking item 4: `handRolledStreamHolds` used to start
 * its brace-walk at any `.route(` it found, including ones inside prose — the
 * walk then swallowed the following real code and could report an offender at
 * a comment's line number. Masking first removes that whole class of
 * misattribution, and costs one pass.
 *
 * String bodies are masked too, so a URL's `//` cannot be mistaken for the
 * start of a line comment. Lengths and line breaks are preserved, so every
 * index and line number in the masked copy still addresses the original.
 *
 * `keepStrings: true` walks strings exactly the same way (a URL's `//` is
 * still not a comment) but leaves their bytes alone — the copy
 * `bareVerdictPolls` reads CONTENT from, so a verdict alternation built as
 * `new RegExp('RECOMMEND|CONSIDER|PASS')` is still visible while prose about
 * the trap is not.
 */
function maskCommentsAndStrings(source: string, { keepStrings = false } = {}): string {
  const out = source.split('');
  let mode: 'code' | 'line' | 'block' | 'single' | 'double' | 'tick' = 'code';
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];
    const inString = mode === 'single' || mode === 'double' || mode === 'tick';
    const blank = () => { if (c !== '\n' && !(keepStrings && inString)) out[i] = ' '; };
    if (mode === 'code') {
      if (c === '/' && next === '/') { mode = 'line'; blank(); }
      else if (c === '/' && next === '*') { mode = 'block'; blank(); }
      else if (c === "'") mode = 'single';
      else if (c === '"') mode = 'double';
      else if (c === '`') mode = 'tick';
      continue;
    }
    if (mode === 'line') { if (c === '\n') mode = 'code'; else blank(); continue; }
    if (mode === 'block') {
      blank();
      if (c === '*' && next === '/') { out[i + 1] = ' '; i++; mode = 'code'; }
      continue;
    }
    // inside a string: mask the body, keep the quotes, honour escapes.
    // With keepStrings the body is preserved (the scan still has to WALK the
    // string so a URL's `//` is not read as a comment) — only the walk matters.
    if (c === '\\') {
      blank();
      if (next !== undefined && next !== '\n') { if (!keepStrings) out[i + 1] = ' '; i++; }
      continue;
    }
    const closer = mode === 'single' ? "'" : mode === 'double' ? '"' : '`';
    if (c === closer) { mode = 'code'; continue; }
    blank();
  }
  return out.join('');
}

/**
 * Find a hand-rolled hold of the doctor's streaming route — a
 * `page.route(… doctor/stream …)` that does anything other than answer the
 * request with a canned response, instead of going through
 * `holdDoctorRunInFlight`.
 *
 * ── Why (2026-09-12, adversarial batch) ─────────────────────────────────────
 * "Assert on the UI while a run is in flight" needs the run to actually BE in
 * flight. `smoke-p0-live-flow.mjs` had two steps making that claim and only
 * one of them did anything about it: step 3c hand-rolled a fixed
 * `setTimeout(timing.ms(4000))` before `route.continue()`, and step 3b took
 * the claim on trust — which is the flake this scan's lane was opened for
 * (the built-in sample answers in tens of milliseconds, so the "earliest
 * instant" landed after the run on 4 of 8 runs). A fixed delay is a wider
 * race, not the absence of one; `holdDoctorRunInFlight` holds until released.
 *
 * ── WHY THE TEST IS "NOT A FULFILL" AND NOT "CONTAINS setTimeout" ───────────
 * Round-1 review, non-blocking item 3: the first spelling of this scan asked
 * whether the call text contained `setTimeout` or `route.continue(`, which a
 * handler hoisted into a named `const` outside the `.route(` call defeats
 * completely — the reviewer planted a live 4-second hand-rolled hold that way
 * and the suite stayed 8/8 green. The test is now the other way round: a
 * doctor-stream route is allowed ONLY if it answers with a canned response
 * (`route.fulfill(`) — step 3d's injected 500 and the budget-stop stub, which
 * do not pretend a run is in flight. Anything else — a delay, a `continue()`,
 * an identifier whose body lives elsewhere — is an offender. Deny-by-default
 * is the right posture here: a new spelling of "hold the stream" should have
 * to be added deliberately, not discovered later as a flake.
 */
function handRolledStreamHolds(source: string): { line: number; text: string }[] {
  const bad: { line: number; text: string }[] = [];
  const masked = maskCommentsAndStrings(source);
  const needle = '.route(';
  for (let at = masked.indexOf(needle); at !== -1; at = masked.indexOf(needle, at + 1)) {
    const open = at + needle.length - 1;
    let depth = 0;
    let i = open;
    for (; i < masked.length; i++) {
      const c = masked[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    // The URL glob lives in a string, which the mask blanks — so the route
    // being scanned is identified from the ORIGINAL text of the same span.
    const call = source.slice(at, Math.min(i + 1, source.length));
    if (!/doctor\/stream/.test(call)) continue;
    // The ALLOW side reads the MASKED span: a handler whose only
    // `route.fulfill(` sits inside a comment or a string is a hold, not a
    // canned response, and must not be exempted by its own prose.
    const maskedCall = masked.slice(at, Math.min(i + 1, masked.length));
    if (/route\.fulfill\(|\.fulfill\(/.test(maskedCall)) continue;
    const line = source.slice(0, at).split('\n').length;
    bad.push({ line, text: call.replace(/\s+/g, ' ').slice(0, 120) });
  }
  return bad;
}

/**
 * Find a "the dialog closed" check on a locator that this file itself
 * OPENED — confirmed present with a `.waitFor(...)` that does not ask for
 * `state: 'detached'|'hidden'` — where THAT SAME locator was later read
 * for absence (any of the shapes below) without a genuine
 * `.waitFor({ state: 'detached' | 'hidden' })` (or `expectDetached(name,
 * …)`, this repo's shared helper name for the same wait) on it FIRST.
 *
 * ── Why (2026-09-13, palette-close-race lane, round 2) ───────────────────
 * `scripts/verify-e5-command-palette.mjs`'s "the palette itself closes
 * after running an action" assertion sampled `paletteDialog.count()`
 * synchronously the instant an unrelated element (the Ship panel) became
 * visible — CI failed it 3/3 on `main` while it stayed 17/17 on an idle
 * local box (docs/audits/2026-09-13-ci-green/palette-race-lane-report.md).
 * The dialog exits through AnimatePresence, so its unmount is not gated on
 * the triggering action finishing and a read taken right after can land
 * before React actually removes the node.
 *
 * Round 1 gated this on textual proximity to a `.press(`/`.click(` within
 * 10 lines. Round-1 review (docs/audits/2026-09-13-ci-green/
 * palette-race-review.md, F1) broke that with one mutation: reverting only
 * the fixed line back to the bug, with the lane's own explanatory comment
 * left in place, put the triggering `press('Enter')` 21 lines above the
 * check — outside the window, 0 offenders reported on the file it exists
 * to guard. Round 2 drops the distance heuristic entirely and tracks
 * OWNERSHIP instead: was THIS locator ever confirmed open, and was its
 * OWN close ever confirmed before this read — regardless of how many lines,
 * comments, or unrelated waits sit between the triggering action and the
 * read. That also defeats every other evasion round-1 review's F2 found
 * (an action spelled `.tap()`/`.fill()` instead of `.press()`/`.click()`;
 * the action 11 lines away instead of 10): none of them matter to a
 * name-and-order-based check that never looks at actions at all.
 *
 * Also widened per F2 to the ten spellings the round-1 review's mutation
 * matrix caught this scanner missing: `const n = await x.count(); … n ===
 * 0` (assignment split across statements), the parenthesised
 * `(await x.count()) === 0` / `== 0` and its reversed `0 === (…)` form —
 * the spelling `smoke-p0-live-flow.mjs:477` and
 * `verify-p2-p3-surfaces.mjs:2004` already use for an unrelated,
 * legitimately-out-of-scope shape (an existence GUARD on a locator that was
 * never opened in the first place — see below) —
 * `expect(x).toHaveCount(0)`, `x.isHidden()`, `!(await x.isVisible())`, and
 * a one-time `page.evaluate(() => !document.querySelector(...))` read
 * (unconditional, not name-gated: there is no Playwright locator variable
 * to own it). Ten shapes plus the original two is what "deny-by-default"
 * means for this rule now — verified against all ten in the mutation-matrix
 * fixtures below, not asserted.
 *
 * ── The false positives this design avoids (F3) ──────────────────────────
 * A `page.waitForFunction(() => !document.querySelector(...))` — the
 * CORRECT version of the same idea, used at `verify-focus-traps.mjs:175` —
 * is never flagged: it is a real wait (blocks until true or timeout), and
 * the method name is `waitForFunction`, not `evaluate`; the two do not
 * share a substring, so the one-time-`evaluate` shape above cannot match
 * it. A locator that was never opened at all — `budgetRetry` in
 * `smoke-p0-live-flow.mjs:477`, `tab` in `verify-p2-p3-surfaces.mjs:2004` —
 * is a existence GUARD ("is this optional thing here or not"), not a
 * dialog-closed assertion, and is correctly invisible here because it is
 * never added to `openedEver` (nothing in the file ever calls
 * `.waitFor(` on it to confirm it was shown).
 *
 * ── A caveat this rule cannot enforce, so it is written down instead ─────
 * The fix this scan recommends — `.waitFor({ state: 'detached' })` /
 * `expectDetached(...)` — is VACUOUS for an assertion that something never
 * appeared at all ("no error toast after this click"): waiting for an
 * already-absent locator to detach resolves immediately and the check
 * becomes unconditionally true. That shape needs a positive presence check
 * first (or a fixed settle window with a comment saying so), not this wait.
 * Nothing here can distinguish "was shown, now confirming it is gone" from
 * "never shown, still not shown" by text alone — a human applying an
 * offender fixed here must know which one they have.
 */
function unwaitedCloseChecks(source: string): { line: number; text: string }[] {
  const NAME = '[A-Za-z_$][\\w.$]*';

  // 1. Every `<name>.waitFor(` call: an OPEN confirmation (no `state`, or a
  //    state other than detached/hidden) or a CLOSE confirmation (state:
  //    'detached' | 'hidden'). `expectDetached(<name>, …)` — this repo's
  //    shared-helper name for the identical wait, should one exist in a
  //    file under scan — counts as a CLOSE confirmation too.
  type Ev = { index: number; name: string; kind: 'open' | 'close' };
  const events: Ev[] = [];
  const waitForRe = new RegExp(`(${NAME})\\s*\\.waitFor\\(`, 'g');
  for (let m = waitForRe.exec(source); m; m = waitForRe.exec(source)) {
    const name = m[1];
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let i = open;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) break; }
    }
    const args = source.slice(open + 1, i);
    const isClose = /state\s*:\s*['"](?:detached|hidden)['"]/.test(args);
    events.push({ index: m.index, name, kind: isClose ? 'close' : 'open' });
  }
  const expectDetachedRe = new RegExp(`expectDetached\\(\\s*(${NAME})\\b`, 'g');
  for (let m = expectDetachedRe.exec(source); m; m = expectDetachedRe.exec(source)) {
    events.push({ index: m.index, name: m[1], kind: 'close' });
  }

  const openedEver = new Set(events.filter((e) => e.kind === 'open').map((e) => e.name));

  // 2. Risky absence reads, one name at a time — only for a locator this
  //    file ever opened; a guard on something never confirmed present is a
  //    different, legitimate shape (see docstring).
  type Read = { index: number; name: string | null; text: string };
  const reads: Read[] = [];
  for (const name of openedEver) {
    const escaped = name.replace(/[.$]/g, '\\$&');
    const patterns = [
      new RegExp(`${escaped}\\.count\\(\\)\\s*\\.then\\(\\s*\\(?\\s*n\\s*\\)?\\s*=>\\s*n\\s*===\\s*0\\s*\\)`, 'g'),
      new RegExp(`\\(?\\s*await\\s+${escaped}\\.count\\(\\)\\s*\\)?\\s*(?:===|==)\\s*0`, 'g'),
      new RegExp(`0\\s*(?:===|==)\\s*\\(?\\s*await\\s+${escaped}\\.count\\(\\)\\s*\\)?`, 'g'),
      new RegExp(`expect\\(\\s*${escaped}\\s*\\)\\s*\\.toHaveCount\\(\\s*0\\s*\\)`, 'g'),
      new RegExp(`${escaped}\\.isHidden\\(`, 'g'),
      new RegExp(`!\\s*\\(?\\s*await\\s+${escaped}\\.isVisible\\(\\)\\s*\\)?`, 'g'),
      new RegExp(`${escaped}\\.isVisible\\(\\)\\s*\\)?\\s*===\\s*false`, 'g'),
    ];
    for (const re of patterns) {
      for (let m = re.exec(source); m; m = re.exec(source)) {
        reads.push({ index: m.index, name, text: m[0] });
      }
    }
    // The split form: `const n = await x.count();` … later `n === 0`.
    const assignRe = new RegExp(`(?:const|let)\\s+([A-Za-z_$]\\w*)\\s*=\\s*await\\s+${escaped}\\.count\\(\\)`, 'g');
    for (let m = assignRe.exec(source); m; m = assignRe.exec(source)) {
      const varName = m[1];
      const windowText = source.slice(m.index, m.index + 400);
      const cmpRe = new RegExp(`\\b${varName}\\b\\s*(?:===|==)\\s*0|0\\s*(?:===|==)\\s*\\b${varName}\\b`);
      const cmpM = cmpRe.exec(windowText);
      if (cmpM) reads.push({ index: m.index + cmpM.index, name, text: cmpM[0] });
    }
  }

  // Unconditional — no locator name owns a raw `document.querySelector`, so
  // this shape cannot be gated on `openedEver`. Method name only:
  // `evaluate` is not a substring of `waitForFunction`, so the correct
  // pattern (a real wait) never matches.
  const evalAbsenceRe = /\.evaluate\(\s*\(\)\s*=>\s*!\s*document\.querySelector\(/g;
  for (let m = evalAbsenceRe.exec(source); m; m = evalAbsenceRe.exec(source)) {
    reads.push({ index: m.index, name: null, text: m[0] });
  }

  // 3. One pass in file order: a read is an offender unless its OWN name
  //    already had a CLOSE confirmation strictly before it. Re-opening a
  //    name clears any earlier close confirmation — it needs its own.
  type TimelineEvent =
    | { index: number; name: string; kind: 'open' }
    | { index: number; name: string; kind: 'close' }
    | { index: number; name: string | null; kind: 'read'; text: string };
  const timeline: TimelineEvent[] = [
    ...events.map((e): TimelineEvent => (e.kind === 'open'
      ? { index: e.index, name: e.name, kind: 'open' }
      : { index: e.index, name: e.name, kind: 'close' })),
    ...reads.map((r): TimelineEvent => ({ index: r.index, name: r.name, kind: 'read', text: r.text })),
  ].sort((a, b) => a.index - b.index);

  const confirmedClosed = new Set<string>();
  const bad: { line: number; text: string }[] = [];
  for (const e of timeline) {
    if (e.kind === 'open') { confirmedClosed.delete(e.name); continue; }
    if (e.kind === 'close') { confirmedClosed.add(e.name); continue; }
    if (e.name !== null && confirmedClosed.has(e.name)) continue; // properly waited for
    const line = source.slice(0, e.index).split('\n').length;
    bad.push({ line, text: e.text });
  }
  return bad;
}

describe('doctor-verdict waits go through the one shared helper', () => {
  // ── Why (2026-09-12, round 3) ───────────────────────────────────────────
  // A bare `/RECOMMEND|CONSIDER|PASS/` poll of `innerText` is satisfied by the
  // doctor's OWN progress copy, because `.sm-slug` uppercases "Running pass 1
  // of 14…". The defect has been diagnosed and fixed independently THREE times,
  // each time in a single suite — verify-production-build.mjs, then
  // verify-p2-p3-surfaces.mjs's P3 phase (2026-09-05), then
  // verify-ui-polish-affordances.mjs's phase A (this round, where it made the
  // sample's jump-control assertion fail on ~1 run in 4 and read as a product
  // regression). `waitForDoctorVerdict` is the one implementation; this stops
  // the fourth hand-rolled copy.
  it('the scanner finds the defect it is meant to find', () => {
    assert.equal(
      bareVerdictPolls("await page.waitForFunction(() => /RECOMMEND|CONSIDER|PASS/.test(document.body.innerText));").length,
      1,
    );
    // textContent is not vulnerable — the raw string is lowercase "pass".
    assert.equal(
      bareVerdictPolls("await p.waitForFunction(() => /CONSIDER|RECOMMEND|PASS/.test(document.body.textContent || ''));").length,
      0,
    );
    // The helper itself, and prose about it, are not the trap.
    assert.equal(bareVerdictPolls('  // a bare /RECOMMEND|CONSIDER|PASS/ poll of innerText is the trap').length, 0);
  });

  it('the hoisted read — the escape the round-3 review planted — is caught', () => {
    // Verbatim the shape the reviewer proved walked past the same-line rule.
    const hoisted = 'await page.waitForFunction(\n'
      + '  () => {\n'
      + '    const t = document.body.innerText;\n'
      + '    return /RECOMMEND|CONSIDER|PASS/.test(t);\n'
      + '  }, undefined, { timeout: 5000 });';
    const hits = bareVerdictPolls(hoisted);
    assert.equal(hits.length, 1, 'a read hoisted one line above the regex is the same defect');
    assert.match(hits[0].text, /`t` derives from an innerText read at line 3/, 'the report names the assignment it tracked');
    // ...and names the OTHER origin accurately, so a debugger is not sent
    // looking for an innerText read that is not there.
    const upperHit = bareVerdictPolls(
      'const raw = document.body.textContent || "";\nconst up = raw.toUpperCase();\nreturn /RECOMMEND|CONSIDER|PASS/.test(up);',
    );
    assert.equal(upperHit.length, 1);
    assert.match(upperHit[0].text, /`up` derives from a textContent read uppercased by hand at line 1/);

    // Any element, not just document.body; and through a Playwright await.
    assert.equal(
      bareVerdictPolls('const panel = await page.locator("aside").innerText();\nok = /RECOMMEND|CONSIDER|PASS/.test(panel);').length,
      1,
    );
    // One more hop: the taint propagates through a derived value.
    assert.equal(
      bareVerdictPolls('const raw = document.body.innerText;\nconst trimmed = raw.trim();\nreturn /RECOMMEND|CONSIDER|PASS/.test(trimmed);').length,
      1,
    );
    // The RHS may be pretty-printed across lines.
    assert.equal(
      bareVerdictPolls('const t = await page\n  .locator("body")\n  .innerText();\nreturn /RECOMMEND|CONSIDER|PASS/.test(t);').length,
      1,
    );
    // A regex built from a string is still a verdict regex.
    assert.equal(
      bareVerdictPolls("const t = document.body.innerText;\nreturn new RegExp('RECOMMEND|CONSIDER|PASS').test(t);").length,
      1,
    );
    // The taint does not outlive its block.
    assert.equal(
      bareVerdictPolls('function a() {\n  const t = document.body.innerText;\n}\nfunction b(t) {\n  return /RECOMMEND|CONSIDER|PASS/.test(t);\n}').length,
      0,
      'a name reused in another block is not the same value',
    );
  });

  it('a tainted value handed to a local verdict predicate is caught (review non-blocking 1)', () => {
    // The reviewer's plant D, verbatim: the regex moved instead of the read.
    const arrow = 'const check = (s) => /RECOMMEND|CONSIDER|PASS/.test(s);\n'
      + 'const t = document.body.innerText;\n'
      + 'return check(t);';
    const hits = bareVerdictPolls(arrow);
    assert.equal(hits.length, 1, 'moving the regex into a local helper is the same poll');
    assert.match(hits[0].text, /`t` derives from an innerText read at line 2, tested by `check\(\)`/);

    // The declaration form, and a predicate declared AFTER its use (hoisted).
    assert.equal(
      bareVerdictPolls('const t = document.body.innerText;\nreturn check(t);\nfunction check(s) { return /RECOMMEND|CONSIDER|PASS/.test(s); }').length,
      1,
    );
    // Not every call to a verdict predicate is the trap — only a tainted one.
    assert.equal(
      bareVerdictPolls('const check = (s) => /RECOMMEND|CONSIDER|PASS/.test(s);\nconst t = await page.textContent("body");\nreturn check(t);').length,
      0,
      'textContent is not vulnerable, so passing it to the predicate is not the trap',
    );
    // A predicate that routes through the shared helper is the fix, not the trap.
    assert.equal(
      bareVerdictPolls('const check = (s) => textCarriesDoctorVerdict(s);\nconst t = document.body.innerText;\nreturn check(t);').length,
      0,
    );
    // The declared edge, asserted so it is a known boundary rather than a
    // surprise: the taint does not cross a MODULE boundary.
    assert.equal(
      bareVerdictPolls('import { check } from "./elsewhere.mjs";\nconst t = document.body.innerText;\nreturn check(t);').length,
      0,
      'an imported predicate is out of scope for a single-file textual scan — see the function comment',
    );
  });

  it('textContent uppercased by hand is the same bug without the CSS', () => {
    // `text-transform` is what made innerText dangerous; `.toUpperCase()` does
    // it by hand, so "Running pass 1 of 14…" answers the poll again.
    assert.equal(
      bareVerdictPolls('return /RECOMMEND|CONSIDER|PASS/.test((el.textContent || "").toUpperCase());').length,
      1,
    );
    assert.equal(
      bareVerdictPolls('const t = document.body.textContent || "";\nconst up = t.toUpperCase();\nreturn /RECOMMEND|CONSIDER|PASS/.test(up);').length,
      1,
    );
    // Plain textContent is still deliberately left alone (verify-a11y.mjs).
    assert.equal(
      bareVerdictPolls('const t = document.body.textContent || "";\nreturn /CONSIDER|RECOMMEND|PASS/.test(t);').length,
      0,
    );
  });

  it('routing an already-read string through the shared predicate is not the trap', () => {
    // The exact shape verify-p2-p3-surfaces.mjs:807-808 was converted to. The
    // PRE-fix shape must be an offender, or the rule never reached real code.
    const before = 'const summaryText = await summaryPanel.first().innerText();\n'
      + 'const verdictRendered = ok && /RECOMMEND|CONSIDER|PASS/.test(summaryText);';
    const after = 'const summaryText = await summaryPanel.first().innerText();\n'
      + 'const verdictRendered = ok && textCarriesDoctorVerdict(summaryText);';
    assert.equal(bareVerdictPolls(before).length, 1, 'the shape this file shipped with must be caught');
    assert.equal(bareVerdictPolls(after).length, 0, 'the shared predicate is the fix, not an exemption');
  });

  it('no script polls innerText for a bare verdict', () => {
    const offenders: string[] = [];
    for (const file of scriptFiles()) {
      const source = readFileSync(file, 'utf8');
      for (const hit of bareVerdictPolls(source)) {
        offenders.push(`${path.relative(REPO, file)}:${hit.line} — ${hit.text}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'use waitForDoctorVerdict (scripts/lib/browser-verify.mjs): a bare innerText poll is '
        + 'satisfied by "RUNNING PASS 1 OF 14…":\n  ' + offenders.join('\n  '),
    );
  });

  it('the helper strips the progress copy and requires a whole word', () => {
    const helper = readFileSync(path.join(REPO, 'scripts/lib/browser-verify.mjs'), 'utf8');
    assert.match(helper, /export const DOCTOR_PROGRESS_COPY_RE/);
    assert.match(helper, /export const DOCTOR_VERDICT_RE = \/\\b\(RECOMMEND\|CONSIDER\|PASS\)\\b\//);
    assert.match(helper, /export async function waitForDoctorVerdict/);
    assert.match(helper, /\.replace\(progress, ' '\)/);
    // The node-side twin, for text a suite has already read (2026-09-12).
    assert.match(helper, /export function textCarriesDoctorVerdict/);
    assert.match(
      helper,
      /export function textCarriesDoctorVerdict[\s\S]{0,400}new RegExp\(DOCTOR_PROGRESS_COPY_RE\.source, 'gi'\)/,
      'the node-side predicate must strip the progress copy with a FRESH regex — DOCTOR_PROGRESS_COPY_RE is /g '
        + 'and a shared global regex carries lastIndex between callers',
    );
  });
});

describe('in-flight doctor runs go through the one shared hold', () => {
  // ── Why (2026-09-12, adversarial batch) ─────────────────────────────────
  // Same family as the verdict-poll trap above: a browser gate asserting on a
  // readiness signal it does not control. `verify:p0-flow`'s step 3b claimed
  // "while the sample run is still in flight" and measured nothing of the
  // kind — red on 4 of 8 foreground runs here and on 2 of 6 on `main` for the
  // round-3 reviewer, every failure a correctly-finished run being reported
  // as a product regression. `holdDoctorRunInFlight` is the one
  // implementation; this stops the next hand-rolled copy.
  it('the scanner finds the defect it is meant to find', () => {
    const delayed = "await p.route('**/api/scriptide/doctor/stream', async (route) => {\n"
      + '  await new Promise((r) => { setTimeout(r, 4000); });\n'
      + '  await route.continue();\n'
      + '});';
    assert.equal(handRolledStreamHolds(delayed).length, 1);
    // THE ESCAPE THAT SENT THE FIRST SPELLING BACK (round-1 review,
    // non-blocking item 3): the handler hoisted out of the call, so the call
    // text contains neither `setTimeout` nor `.continue(`. A live 4-second
    // hand-rolled hold written that way left the suite 8/8 green.
    const hoisted = 'const holdIt = async (route) => {\n'
      + '  await new Promise((r) => { setTimeout(r, 4000); });\n'
      + '  await route.continue();\n'
      + '};\n'
      + "await p.route('**/api/scriptide/doctor/stream', holdIt);";
    assert.equal(handRolledStreamHolds(hoisted).length, 1);
    // A canned failure is not a pretend-in-flight hold.
    assert.equal(
      handRolledStreamHolds("await p.route('**/api/scriptide/doctor/stream', (route) => route.fulfill({ status: 500 }));").length,
      0,
    );
    // Routes on other endpoints are not this scan's business.
    assert.equal(
      handRolledStreamHolds("await p.route('**/api/health', async (route) => { await route.continue(); });").length,
      0,
    );
    // Round-1 review, non-blocking item 4: prose is not code. A `.route(` in a
    // comment used to start the brace-walk there, swallow the real code after
    // it, and report the offender at the comment's line number.
    const commented = "// await p.route('**/api/scriptide/doctor/stream', async (route) => {\n"
      + "await p.route('**/api/health', (route) => route.fulfill({ status: 200 }));";
    assert.equal(handRolledStreamHolds(commented).length, 0);
    const blockCommented = '/* p.route("' + '**/api/scriptide/doctor/stream", handler) *' + '/\n'
      + "await p.route('**/api/health', (route) => route.fulfill({ status: 200 }));";
    assert.equal(handRolledStreamHolds(blockCommented).length, 0);
    // A URL's own `//` must not be read as the start of a line comment.
    assert.equal(
      handRolledStreamHolds("await p.goto('http://127.0.0.1:1/x');\n"
        + "await p.route('**/api/scriptide/doctor/stream', (route) => route.fulfill({ status: 500 }));").length,
      0,
    );
  });

  it('a hold whose handler only MENTIONS route.fulfill( in a comment or string is still a hold', () => {
    // The round-2 review planted exactly this: the allow side used to read the
    // unmasked span, so the comment exempted the hold (suite stayed 8/8).
    const viaComment =
      "await p.route('**/api/scriptide/doctor/stream', async (route) => {\n"
      + "  // we do not route.fulfill( here\n  await gate;\n});";
    const viaString =
      "await p.route('**/api/scriptide/doctor/stream', async (route) => { const why = 'no route.fulfill( here'; await gate; });";
    assert.equal(handRolledStreamHolds(viaComment).length, 1, 'comment-only mention must not exempt');
    assert.equal(handRolledStreamHolds(viaString).length, 1, 'string-only mention must not exempt');
    assert.equal(
      handRolledStreamHolds("await p.route('**/api/scriptide/doctor/stream', (route) => route.fulfill({ status: 500 }));").length,
      0,
      'a real canned response is still allowed',
    );
  });

  it('no script hand-rolls a doctor-stream hold', () => {
    const offenders: string[] = [];
    for (const file of scriptFiles()) {
      if (path.basename(file) === 'browser-verify.mjs') continue; // the one implementation
      const source = readFileSync(file, 'utf8');
      for (const hit of handRolledStreamHolds(source)) {
        offenders.push(`${path.relative(REPO, file)}:${hit.line} — ${hit.text}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'use holdDoctorRunInFlight (scripts/lib/browser-verify.mjs): a fixed delay before '
        + 'route.continue() is a wider race, not the absence of one:\n  ' + offenders.join('\n  '),
    );
  });

  it('the helper holds until released and reports what it intercepted', () => {
    const helper = readFileSync(path.join(REPO, 'scripts/lib/browser-verify.mjs'), 'utf8');
    assert.match(helper, /export const DOCTOR_STREAM_ROUTE/);
    assert.match(helper, /export async function holdDoctorRunInFlight/);
    assert.match(helper, /get held\(\)/);
    assert.match(helper, /async release\(\)/);
    // The MOUNT window's pin (round-1 review, blocking item 2): without it,
    // step 3b's first assertion is a race again — the regression it exists to
    // catch was measured caught on only 4 of 6 runs before the chunk was held.
    assert.match(helper, /export const COVERAGE_SUMMARY_CHUNK_ROUTE/);
    assert.match(helper, /export async function holdCoverageSummaryChunk/);
  });
});

describe('waitForFunction option position', () => {
  it('the scanner finds the defect it is meant to find (a scanner that never fires proves nothing)', () => {
    const wrong = `await page.waitForFunction(() => x, { timeout: 5 });`;
    const alsoWrong = 'await page.waitForFunction(\n  () => x,\n  { timeout: timing.ms(45000) },\n);';
    const right = `await page.waitForFunction(() => x, undefined, { timeout: 5 });`;
    const alsoRight = 'await page.waitForFunction(\n  () => x,\n  undefined,\n  { timeout: 5 },\n);';
    const singleArg = `await page.waitForFunction(() => document.title.length > 0);`;
    // An options object passed as a real page ARGUMENT is not the defect.
    const genuineArg = `await page.waitForFunction((cfg) => cfg.n > 0, { n: 3 });`;
    assert.equal(misusedCalls(wrong).length, 1);
    assert.equal(misusedCalls(alsoWrong).length, 1);
    assert.equal(misusedCalls(right).length, 0);
    assert.equal(misusedCalls(alsoRight).length, 0);
    assert.equal(misusedCalls(singleArg).length, 0);
    assert.equal(misusedCalls(genuineArg).length, 0);
  });

  it('no script passes waitForFunction options in the argument position', () => {
    const offenders: string[] = [];
    let scanned = 0;
    let calls = 0;
    for (const file of scriptFiles()) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('waitForFunction')) continue;
      scanned++;
      calls += (source.match(/waitForFunction\(/g) ?? []).length;
      for (const hit of misusedCalls(source)) {
        offenders.push(`${path.relative(REPO, file)}:${hit.line} — ${hit.text}`);
      }
    }
    // The scan must actually reach the suites, or an empty result means nothing.
    assert.ok(scanned >= 4, `expected at least 4 scripts using waitForFunction, scanned ${scanned}`);
    // 12 is the count on `main` at f94d587e, before this lane added three more —
    // a floor that proves the scan reached real code without encoding one
    // commit's exact inventory (which would fail the moment a gate legitimately
    // stops waiting on something).
    assert.ok(calls >= 12, `expected at least 12 waitForFunction calls, found ${calls}`);
    assert.deepEqual(
      offenders,
      [],
      'waitForFunction takes its options THIRD — pass `undefined` as the arg:\n  ' + offenders.join('\n  '),
    );
  });
});

describe('a "closed" check waits for its OWN locator to detach — round 2 (owner/order, not distance)', () => {
  it('F1 (round-1 review, major): catches the exact reintroduction in the file as shipped, comment and all', () => {
    // The round-1 review's mutation, verbatim: revert ONLY the fixed
    // assertion in the real, on-disk scripts/verify-e5-command-palette.mjs
    // back to the pre-fix line, leaving the lane's own 20-line explanatory
    // comment (and everything else) in place. Round 1's distance-based scan
    // reported ZERO offenders here because the comment pushed the
    // triggering `press('Enter')` to line 130, 21 lines above the check at
    // line 151 — outside its 10-line window.
    const real = readFileSync(path.join(REPO, 'scripts/verify-e5-command-palette.mjs'), 'utf8');
    const fixedLine = "const paletteClosedAfterRun = await paletteDialog\n"
      + "    .waitFor({ state: 'detached', timeout: timing.ms(3000) })\n"
      + '    .then(() => true)\n'
      + '    .catch(() => false);';
    assert.ok(real.includes(fixedLine), 'the shipped fixed line must match verbatim, or this fixture is stale');
    const mutated = real.replace(
      fixedLine,
      'const paletteClosedAfterRun = await paletteDialog.count().then((n) => n === 0);',
    );
    assert.notEqual(mutated, real, 'the replace must actually have applied');

    const hits = unwaitedCloseChecks(mutated);
    assert.equal(hits.length, 1, `expected exactly the reintroduced line to be flagged, got: ${JSON.stringify(hits)}`);
    assert.match(hits[0].text, /paletteDialog\.count\(\)/);

    // And the real, unmutated shipped file is clean.
    assert.deepEqual(unwaitedCloseChecks(real), []);
  });

  it('F2 (round-1 review, moderate): the ten evasion spellings the mutation matrix caught missing', () => {
    // Every fixture opens `d` first (`d.waitFor({ timeout: … })`, no state —
    // an OPEN confirmation), so each read below is tested on a locator this
    // scan actually tracks, not exempted for the wrong reason.
    const OPEN = "await d.waitFor({ timeout: 5000 });\nawait page.keyboard.press('Enter');\n";
    const cases: Array<[string, string]> = [
      ['baseline: .then((n) => n === 0)', 'const ok = await d.count().then((n) => n === 0);'],
      ['split form: const n = …; n === 0', 'const n = await d.count();\nconst ok = n === 0;'],
      ['paren form: (await d.count()) === 0', 'const ok = (await d.count()) === 0;'],
      ['paren form, == : (await d.count()) == 0', 'const ok = (await d.count()) == 0;'],
      ['reversed: 0 === (await d.count())', 'const ok = 0 === (await d.count());'],
      ['expect().toHaveCount(0)', 'await expect(d).toHaveCount(0);'],
      ['isHidden()', 'const ok = await d.isHidden();'],
      ['negated isVisible()', 'const ok = !(await d.isVisible());'],
      ['tap() instead of click()/press()', 'const ok2 = await d.count().then((n) => n === 0);'],
      ['11 lines between the action and the read', `${'await page.screenshot({ path: "x.png" });\n'.repeat(11)}const ok = await d.count().then((n) => n === 0);`],
    ];
    for (const [label, read] of cases) {
      const source = label === 'tap() instead of click()/press()'
        ? "await d.waitFor({ timeout: 5000 });\nawait other.tap();\n" + read
        : OPEN + read;
      const hits = unwaitedCloseChecks(source);
      assert.equal(hits.length, 1, `${label}: expected 1 offender, got ${hits.length} — ${JSON.stringify(hits)}`);
    }

    // The eleventh: a one-time evaluate() reading DOM absence directly —
    // unconditional, not gated on `d` ever being opened at all.
    assert.equal(
      unwaitedCloseChecks("await page.keyboard.press('Enter');\n"
        + 'const ok = await page.evaluate(() => !document.querySelector(\'[role="dialog"]\'));').length,
      1,
      'a one-time evaluate() reading DOM absence is the same defect, with no locator to gate it on',
    );
  });

  it('the fix — waitFor({ state: "detached" }) (or expectDetached) on the SAME locator — clears every shape', () => {
    const fixed = "await d.waitFor({ timeout: 5000 });\n"
      + "await page.keyboard.press('Enter');\n"
      + "const ok = await d.waitFor({ state: 'detached', timeout: 3000 }).then(() => true).catch(() => false);";
    assert.equal(unwaitedCloseChecks(fixed).length, 0);

    const viaHelper = "await d.waitFor({ timeout: 5000 });\n"
      + "await page.keyboard.press('Enter');\n"
      + 'const ok = await expectDetached(d, timing);';
    assert.equal(unwaitedCloseChecks(viaHelper).length, 0, 'expectDetached(name, …) is recognized as the same close confirmation');
  });

  it('F3 (round-1 review, minor): the correct waitForFunction pattern is never flagged', () => {
    // verify-focus-traps.mjs:175, verbatim shape: a REAL wait (blocks until
    // true or timeout), not a one-time evaluate() read. `evaluate` is not a
    // substring of `waitForFunction`, so the unconditional evaluate-shape
    // rule cannot match it, and there is no `d.count()`-style read here for
    // the name-gated rules to see either.
    const correct = "await closeDialog();\n"
      + "await page.waitForFunction(() => !document.querySelector('[role=\"dialog\"]'), undefined, { timeout: 3000 }).catch(() => {});\n"
      + 'const restoreOk = await page.evaluate((el) => el === document.activeElement, trigger);';
    assert.equal(unwaitedCloseChecks(correct).length, 0);
  });

  it('an appearance check (count() > 0) is out of scope even on an OPENED locator — mounting is never animation-gated', () => {
    assert.equal(
      unwaitedCloseChecks("await item.waitFor({ timeout: 5000 });\nawait exportMenuBtn.click();\nconst itemVisible = await item.count() > 0;").length,
      0,
    );
  });

  it('a locator never confirmed open is an existence GUARD, not this defect (smoke-p0-live-flow.mjs:477 shape)', () => {
    // budgetRetry is never the subject of a `.waitFor(` anywhere — it is
    // read for the first and only time in the guard itself.
    assert.equal(
      unwaitedCloseChecks("await budgetPage.getByRole('button', { name: /try sample coverage/i }).first().click();\n"
        + "await budgetPage.getByText(/coverage failed/i).first().waitFor({ timeout: 5000 });\n"
        + 'if ((await budgetRetry.count()) === 0) { throw new Error("x"); }').length,
      0,
      'an existence guard on a locator that was never opened must not be flagged',
    );
  });

  it('re-opening a locator clears an earlier close confirmation — it needs its own', () => {
    const stillBad = "await d.waitFor({ timeout: 5000 });\n"
      + "await d.waitFor({ state: 'detached', timeout: 3000 });\n"
      + "await d.waitFor({ timeout: 5000 });\n" // re-opened — the earlier close no longer covers it
      + "await page.keyboard.press('Escape');\n"
      + 'const closed = await d.count().then((n) => n === 0);';
    assert.equal(unwaitedCloseChecks(stillBad).length, 1, 'a close confirmation before the most recent open must not carry over');
  });

  it('none of the browser suites re-introduces the defect this lane fixed', () => {
    const offenders: string[] = [];
    for (const file of scriptFiles()) {
      const source = readFileSync(file, 'utf8');
      for (const hit of unwaitedCloseChecks(source)) {
        offenders.push(`${path.relative(REPO, file)}:${hit.line} — ${hit.text}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'a dialog-closed check must waitFor({ state: \'detached\' | \'hidden\' }) (or expectDetached(...)) on its OWN '
        + 'locator before it is read for absence — not sample .count()/.isHidden()/.isVisible() or evaluate() '
        + 'against document — regardless of distance to the triggering action '
        + '(docs/audits/2026-09-13-ci-green/palette-race-lane-report.md):\n  ' + offenders.join('\n  '),
    );
  });
});
