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
