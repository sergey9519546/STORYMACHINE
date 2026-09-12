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
