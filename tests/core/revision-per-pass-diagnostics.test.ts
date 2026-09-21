// revision-per-pass-diagnostics.test.ts — every revision pass diagnoses the
// document it is actually handed, and an author's locked spans follow the text
// (2026-09-20, per-pass-diagnostics lane).
//
// ── THE TWO DEFECTS THIS FILE PINS ───────────────────────────────────────────
//
// 1. STALE DIAGNOSTICS (SESSION_REPORT_2026-09-19.md §4 row 3).
//    `runRevisionPipeline` was handed `records`/`structure`/`annotations`
//    computed from the draft as submitted, and passed that same triple to all
//    14 passes while `currentFountain` was rewritten underneath them. From
//    pass 2 onward every pass therefore diagnosed the PRE-REVISION document:
//    it could flag a scene a prior pass had already deleted, and could not see
//    one a prior pass had added. Measured before the fix, with pass 1 cutting
//    an 18-scene draft down to 6 scenes: pass 2 (causality) reported 10 issues
//    where the same 6-scene draft analysed from the start reports 2, and
//    passes 2..14 between them named eleven scenes (Scene 7 … Scene 18) that
//    no longer existed in the document being revised.
//
// 2. DRIFTING LOCKED SPANS (docs/audits/2026-09-19-locked-spans/README.md §3,
//    the explicitly-unfixed half). An ApprovedSpan is a 1-based line range
//    into ONE document. The same array was threaded through all 14 passes
//    while the line count changed, so from pass 2 on a "locked" range could
//    point at the wrong lines — which also makes the survival check added by
//    that lane (`approvedSpansSurvive`) verify the wrong excerpt, or skip the
//    span entirely once the range ran off the end.
//
// ── THE TWO THE REVIEW OF THAT FIX FOUND (2026-09-20, findings 1 and 5) ──────
//
// 3. THE RE-DERIVATION THREW THE LEDGER AWAY (finding 1, the blocker). The fix
//    for (1) replaced all three diagnostics with `analyzeFountainText`'s, and
//    that function's structure is `analyzeStructure(records, [])` — commits
//    hard-zeroed, because it has no ledger. `commits` is the ONLY source of
//    `totalClockPressure` (server/nvm/screenplay/structure.ts), so on the
//    route path — which computes `analyzeStructure(records, allCommits)` —
//    one changed byte in pass 1 reset passes 2..14 from the caller's
//    "act3 / 100% / approachingClimax" reading to "act1 / 0% / not
//    approaching". Six pass files branch on those fields. The ledger is not a
//    property of the draft, so it is now threaded in and reused on every
//    re-derivation; `(e)` below pins that, both in what the pipeline records
//    and in which rules actually fire.
//
// 4. A LOST SPAN WAS KEPT, NOT DROPPED (finding 5). When a span's locked text
//    stopped occurring in the draft, the pipeline warned and then carried the
//    span forward at its STALE line numbers. From the next pass on,
//    `approvedSpansSurvive` cuts the excerpt out of the NEW document at those
//    numbers and enforces whatever text now lives there: the author's real
//    locked lines become freely deletable, and an unrelated passage is locked
//    in their place, with no further warning. A lost span is now dropped from
//    enforcement for the rest of the run and reported in the result's
//    `lostApprovedSpans` — `(c)` below pins that, including the deletion that
//    is now correctly ACCEPTED because the lock is honestly gone.
//
// ── HOW THESE TESTS OBSERVE THE PIPELINE ─────────────────────────────────────
// `runRevisionPipeline` does not expose what it hands each pass, so the tests
// use the two seams that already exist:
//   * a fake rewriter registered through `registerLlmRewriter` (rewrite.ts's
//     registry — the same inversion `rewrite-llm.ts` uses) both DRIVES the
//     document change and RECORDS the `RewriteInput` each pass built, which
//     carries that pass's `fountain` and `approvedSpans`;
//   * the issues each pass reports, which are a function of the diagnostics it
//     was given — compared against a reference run of the same pipeline over
//     the changed document from the start.
// No pass reads `priorPassResults` in its diagnostic code (pipeline.ts's
// diagnose-only safety argument states and relies on this), so the reference
// run is a fair comparison for issues even though its pass 1 saw a different
// draft.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { runRevisionPipeline, type RevisionResult } from '../../server/nvm/revision/pipeline.ts';
import { registerLlmRewriter, type RewriteInput } from '../../server/nvm/revision/rewrite.ts';
import { relocateApprovedSpans, normalizeLineEndings } from '../../server/nvm/revision/approved-spans.ts';
import { approvedSpansSurvive } from '../../server/nvm/revision/rewrite-llm.ts';
import { analyzeStructure } from '../../server/nvm/screenplay/structure.ts';
import { summarizeOps, type StoryCommit } from '../../server/nvm/state/StoryCommit.ts';
import type { ApprovedSpan } from '../../server/nvm/revision/passes/types.ts';
import type { CompiledScreenplay } from '../../server/nvm/screenplay/compile-types.ts';
import { logger } from '../../server/lib/logger.ts';

// ── Fixture ──────────────────────────────────────────────────────────────────
// Uniform scenes on purpose: the passes' findings then depend on scene COUNT
// and position rather than on any one scene's prose, so "this pass saw an
// 18-scene document" and "this pass saw a 6-scene document" are cleanly
// distinguishable in the issue lists.

function sceneBlock(i: number): string {
  return [
    `INT. ROOM ${i} - DAY`,
    '',
    'Ada crosses to the window and studies the street below. Nothing moves.',
    '',
    'ADA',
    'We have until Thursday, and Thursday is not far.',
    '',
    'BEN',
    'Then we had better start now.',
    '',
  ].join('\n');
}

const FULL_DRAFT = Array.from({ length: 18 }, (_, i) => sceneBlock(i + 1)).join('\n');
const TRUNCATED_DRAFT = Array.from({ length: 6 }, (_, i) => sceneBlock(i + 1)).join('\n');

function compiledFor(fountain: string): { compiled: CompiledScreenplay; analysis: ReturnType<typeof analyzeFountainText> } {
  const analysis = analyzeFountainText(fountain);
  return {
    analysis,
    compiled: {
      fountain,
      annotations: analysis.annotations,
      structureSummary: '',
      wordCount: analysis.wordCount,
      compiledAt: 0,
    },
  };
}

/** 1-based line number of the first line equal to `needle` in `doc`. */
function lineNumberOf(doc: string, needle: string): number {
  const at = doc.split('\n').indexOf(needle);
  assert.notEqual(at, -1, `fixture line not found: ${needle}`);
  return at + 1;
}

/** The text `span` covers in `doc` (1-based, inclusive). */
function excerptAt(doc: string, span: ApprovedSpan): string {
  return normalizeLineEndings(doc).split('\n').slice(span.startLine - 1, span.endLine).join('\n');
}

// ── Logger capture ───────────────────────────────────────────────────────────

interface LogCall { msg: string; data?: Record<string, unknown> }

function captureLogger(): { calls: LogCall[]; restore: () => void } {
  const calls: LogCall[] = [];
  const original = { debug: logger.debug, warn: logger.warn, error: logger.error };
  logger.debug = (msg, data) => { calls.push({ msg, data }); };
  logger.warn = (msg, data) => { calls.push({ msg, data }); };
  logger.error = (msg, data) => { calls.push({ msg, data }); };
  return {
    calls,
    restore: () => { logger.debug = original.debug; logger.warn = original.warn; logger.error = original.error; },
  };
}

// ── StoryCommit ledger ───────────────────────────────────────────────────────
// One commit carrying a single RAISE_CLOCK of 20. That is all analyzeStructure
// reads commits for: `totalClockPressure` is the sum of every non-reverted
// RAISE_CLOCK amount, and 20 clears the >= 15 threshold for `act3` on its own,
// so the ledger's reading is act3 / 100% / approachingClimax while the SAME
// records with no ledger read act1 / 0% / not approaching. That gap is the
// whole of finding 1, expressed in the smallest ledger that produces it.
function ledgerCommits(): StoryCommit[] {
  const ops = [{ op: 'RAISE_CLOCK' as const, clockId: 'deadline', amount: 20 }];
  return [{
    commitId: 'c1', parentId: null, sceneIdx: 0, ops,
    deltaSummary: summarizeOps(ops), reverted: false, createdAt: 0,
  }];
}

/** The RevisionResult fields that existed BEFORE this lane, in declaration
 *  order, hashed so "byte-identical" is one comparison rather than fourteen
 *  deepEquals. `completedAt` is a clock and `lostApprovedSpans` is this lane's
 *  new field, so neither is in the projection; the new field is asserted
 *  separately at its own call site. */
function preLaneOutputHash(result: RevisionResult): string {
  const projection = {
    passResults: result.passResults,
    finalFountain: result.finalFountain,
    originalFountain: result.originalFountain,
    totalIssuesFound: result.totalIssuesFound,
    passesWithChanges: result.passesWithChanges,
    failedPasses: result.failedPasses,
  };
  return createHash('sha256').update(JSON.stringify(projection)).digest('hex');
}

after(() => { registerLlmRewriter(null); });

// ── (a) + (b): the diagnostics a pass reads ──────────────────────────────────

describe('revision pipeline: each pass diagnoses the document it is handed', () => {
  it('(a) a pass that cuts the draft makes every later pass diagnose the CUT draft', async () => {
    const full = compiledFor(FULL_DRAFT);
    const truncated = compiledFor(TRUNCATED_DRAFT);
    assert.equal(full.analysis.records.length, 18);
    assert.equal(truncated.analysis.records.length, 6);

    const capture = captureLogger();
    const seenFountain: Record<string, string> = {};
    registerLlmRewriter(async (input: RewriteInput) => {
      seenFountain[input.passName] = input.fountain;
      // Pass 1 (structure) cuts the last 12 scenes; every other pass is a no-op
      // so that exactly one document change happens, at a known index.
      if (input.passName === 'structure') return { revised: TRUNCATED_DRAFT, usedLLM: true };
      return { revised: input.fountain, usedLLM: false };
    });

    let cutRun;
    try {
      cutRun = await runRevisionPipeline(full.compiled, full.analysis.records, full.analysis.structure, []);
    } finally {
      registerLlmRewriter(null);
      capture.restore();
    }

    assert.equal(cutRun.passResults[0].changed, true, 'pass 1 must have changed the draft');
    assert.equal(cutRun.finalFountain, TRUNCATED_DRAFT);
    assert.equal(seenFountain['causality'], TRUNCATED_DRAFT, 'pass 2 must be handed the cut draft');

    // Reference: the same pipeline over the cut draft from the very start, so
    // its passes 2..14 are by construction diagnosing the right document.
    const reference = await runRevisionPipeline(
      truncated.compiled, truncated.analysis.records, truncated.analysis.structure, [],
    );

    for (let i = 1; i < cutRun.passResults.length; i++) {
      assert.deepEqual(
        cutRun.passResults[i].issues,
        reference.passResults[i].issues,
        `pass ${i + 1} (${cutRun.passResults[i].pass}) diagnosed a different document than the one it was handed`,
      );
    }

    // The same failure stated in the form a reader of the report would see it:
    // no finding may name a scene the revised document no longer contains.
    const staleSceneRefs: string[] = [];
    for (let i = 1; i < cutRun.passResults.length; i++) {
      for (const issue of cutRun.passResults[i].issues) {
        const m = /\bScene (\d+)\b/.exec(issue.location);
        if (m && Number(m[1]) > 6) staleSceneRefs.push(`${cutRun.passResults[i].pass}: ${issue.location} (${issue.rule})`);
      }
    }
    assert.deepEqual(staleSceneRefs, [], 'passes 2..14 flagged scenes that no longer exist in the draft');

    // Positive control on the re-derivation itself: exactly one, at pass 2.
    const rediagnosed = capture.calls.filter(c => c.msg === 'revision_pass_rediagnosed');
    assert.equal(rediagnosed.length, 1, 'the draft changed once, so it must be re-diagnosed once');
    assert.equal(rediagnosed[0].data?.passIndex, 1);
    assert.equal(rediagnosed[0].data?.passName, 'causality');
    assert.equal(rediagnosed[0].data?.sceneCount, 6);
    assert.deepEqual(capture.calls.filter(c => c.msg === 'revision_rediagnose_failed'), []);
  });

  // This one is a guard, not a regression test: before the fix there was no
  // re-derivation at all, so it passed vacuously. What it pins is the "skip
  // the recompute when the draft is byte-equal" half of the change — it fails
  // the moment the re-derivation is made unconditional, which is the cheap
  // way to write this feature and would put a full analyzeFountainText over
  // the whole draft in front of all 14 passes of every revise request.
  it('(b) a pass that changes nothing costs no re-derivation', async () => {
    const full = compiledFor(FULL_DRAFT);
    const capture = captureLogger();
    registerLlmRewriter(async (input: RewriteInput) => ({ revised: input.fountain, usedLLM: false }));

    let result;
    try {
      result = await runRevisionPipeline(full.compiled, full.analysis.records, full.analysis.structure, []);
    } finally {
      registerLlmRewriter(null);
      capture.restore();
    }

    assert.equal(result.passesWithChanges, 0);
    assert.equal(result.finalFountain, FULL_DRAFT);
    assert.deepEqual(
      capture.calls.filter(c => c.msg === 'revision_pass_rediagnosed'),
      [],
      'a byte-equal draft must reuse the diagnostics already computed for it',
    );
  });
});

// ── (c) relocateApprovedSpans, pure ──────────────────────────────────────────

describe('relocateApprovedSpans (pure)', () => {
  const DOC = [
    'INT. HALL - NIGHT',       // 1
    '',                        // 2
    'Rain on the skylight.',   // 3
    '',                        // 4
    'A door closes somewhere.', // 5
    '',                        // 6
    'Footsteps, then nothing.', // 7
    '',                        // 8
    'LEA',                     // 9
    'You came back.',          // 10
    '',                        // 11
    'JONAS',                   // 12
    'I never left.',           // 13
  ].join('\n');

  it('a span whose preceding text lost 3 lines moves from 10–12 to 7–9', () => {
    const span: ApprovedSpan = { startLine: 10, endLine: 12, reason: 'her line and his cue' };
    assert.equal(excerptAt(DOC, span), 'You came back.\n\nJONAS');
    // Remove lines 5–7 (the three lines above the span).
    const lines = DOC.split('\n');
    const shorter = [...lines.slice(0, 4), ...lines.slice(7)].join('\n');

    const result = relocateApprovedSpans(DOC, shorter, [span]);
    assert.deepEqual(result.spans, [{ startLine: 7, endLine: 9, reason: 'her line and his cue' }]);
    assert.deepEqual(result.moved, [0]);
    assert.deepEqual(result.lost, []);
    assert.deepEqual(result.skipped, []);
    assert.equal(excerptAt(shorter, result.spans[0]), excerptAt(DOC, span));
  });

  it('a span whose preceding text gained 2 lines moves down by 2', () => {
    const span: ApprovedSpan = { startLine: 9, endLine: 10, reason: 'keep the reunion' };
    const longer = `FADE IN:\n\n${DOC}`;
    const result = relocateApprovedSpans(DOC, longer, [span]);
    assert.deepEqual(result.spans, [{ startLine: 11, endLine: 12, reason: 'keep the reunion' }]);
    assert.deepEqual(result.moved, [0]);
    assert.equal(excerptAt(longer, result.spans[0]), 'LEA\nYou came back.');
  });

  it('a duplicated excerpt resolves to the occurrence nearest the previous position', () => {
    const block = 'LEA\nYou came back.';
    // Three identical copies, starting at lines 1, 6 and 11.
    const doubled = `${block}\n\nfiller one\n\n${block}\n\nfiller two\n\n${block}`;
    assert.equal(lineNumberOf(doubled, 'filler one'), 4);
    const nearMiddle: ApprovedSpan = { startLine: 6, endLine: 7, reason: 'the middle one' };
    assert.equal(excerptAt(doubled, nearMiddle), block);
    const shifted = `pad\n${doubled}`; // every copy moves down one line: 2, 7, 12

    const result = relocateApprovedSpans(doubled, shifted, [nearMiddle]);
    assert.deepEqual(result.spans, [{ startLine: 7, endLine: 8, reason: 'the middle one' }]);
    assert.deepEqual(result.moved, [0]);
    assert.equal(excerptAt(shifted, result.spans[0]), block);
    // The first copy is where a naive "first occurrence wins" search would
    // have put it, and it is NOT what this returns.
    assert.notEqual(result.spans[0].startLine, 2);
  });

  // 2026-09-21 review of PR #268, finding F3. "Nearest to the old position"
  // alone loses occurrence identity across a large insertion: with identical
  // blocks at 10 and 20 and the SECOND one locked, 15 lines inserted at the
  // top move them to 25 and 35, and nearest-to-20 picks 25 — the wrong copy.
  // The span's ordinal among identical excerpts (it was the 2nd of 2) is
  // what identifies it, and it is preserved whenever the occurrence count is
  // unchanged.
  it('F3: with identical blocks at 10 and 20, the second locked, 15 lines inserted at the top relocate it to 35 (not 25)', () => {
    const block = 'LEA\nYou came back.';
    const filler = (n: number, tag: string) => Array.from({ length: n }, (_, i) => `${tag} ${i + 1}`);
    const prevLines = [...filler(9, 'before'), ...block.split('\n'), ...filler(8, 'between'), ...block.split('\n'), 'after'];
    const prev = prevLines.join('\n');
    assert.equal(lineNumberOf(prev, 'LEA'), 10);
    assert.equal(prevLines.lastIndexOf('LEA') + 1, 20);
    const second: ApprovedSpan = { startLine: 20, endLine: 21, reason: 'the second one' };
    assert.equal(excerptAt(prev, second), block);
    const next = [...filler(15, 'inserted'), ...prevLines].join('\n');   // copies now at 25 and 35

    const result = relocateApprovedSpans(prev, next, [second]);
    assert.deepEqual(result.spans, [{ startLine: 35, endLine: 36, reason: 'the second one' }],
      'the lock must follow the 2nd occurrence, not the copy that happens to be nearest the old line number');
    assert.deepEqual(result.moved, [0]);
    assert.deepEqual(result.ambiguous, [], 'same occurrence count on both sides: the ordinal is trusted, nothing is ambiguous');
    assert.equal(excerptAt(next, result.spans[0]), block);
  });

  it('F3: when the occurrence count changed, the nearest rule applies and the span is reported ambiguous', () => {
    const block = 'LEA\nYou came back.';
    // Three copies at 1, 6 and 11; the middle one is locked (2nd of 3).
    const tripled = `${block}\n\nfiller one\n\n${block}\n\nfiller two\n\n${block}`;
    const middle: ApprovedSpan = { startLine: 6, endLine: 7, reason: 'the middle one' };
    assert.equal(excerptAt(tripled, middle), block);
    // A pass deletes the FIRST copy and its filler: copies now at 1 and 6.
    const next = `${block}\n\nfiller two\n\n${block}`;

    const result = relocateApprovedSpans(tripled, next, [middle]);
    assert.deepEqual(result.spans, [{ startLine: 6, endLine: 7, reason: 'the middle one' }], 'nearest to 6 is 6');
    assert.deepEqual(result.moved, [], 'its line numbers did not change');
    assert.deepEqual(result.lost, []);
    assert.deepEqual(result.ambiguous, [0], '3 copies became 2: which one the author locked cannot be known from the text');
  });

  it('F3: a unique excerpt is never ambiguous, whatever moved around it', () => {
    const span: ApprovedSpan = { startLine: 9, endLine: 10, reason: 'keep the reunion' };
    const result = relocateApprovedSpans(DOC, `FADE IN:\n\n${DOC}`, [span]);
    assert.deepEqual(result.ambiguous, []);
    assert.deepEqual(result.moved, [0]);
  });

  it('ties between equidistant occurrences go to the earlier one', () => {
    const block = 'LEA\nYou came back.';
    const doc = `x\n\n\n\n${block}`;                  // the span sits at line 5
    const next = `pad\npad\n${block}\n\n\n${block}`;  // copies at lines 3 and 7
    const span: ApprovedSpan = { startLine: 5, endLine: 6, reason: 'either' };
    assert.equal(excerptAt(doc, span), block);
    // 5 is exactly 2 away from both 3 and 7.
    const result = relocateApprovedSpans(doc, next, [span]);
    assert.deepEqual(result.spans, [{ startLine: 3, endLine: 4, reason: 'either' }]);
    assert.equal(excerptAt(next, result.spans[0]), block);
  });

  it('an excerpt that no longer occurs keeps its indices and is reported lost', () => {
    const span: ApprovedSpan = { startLine: 9, endLine: 10, reason: 'keep the reunion' };
    const rewritten = DOC.replace('You came back.', 'You are late.');
    const result = relocateApprovedSpans(DOC, rewritten, [span]);
    assert.deepEqual(result.spans, [span]);
    assert.deepEqual(result.lost, [0]);
    assert.deepEqual(result.moved, []);
    assert.deepEqual(result.skipped, []);
  });

  it('a match that is not aligned to whole lines is not accepted as the span', () => {
    // "LEA\nYou came back." occurs inside a longer line pair only as a
    // suffix/prefix — re-pointing the lock there would move it onto lines the
    // author never approved.
    const span: ApprovedSpan = { startLine: 9, endLine: 10, reason: 'keep the reunion' };
    const mangled = DOC.replace('LEA\nYou came back.', 'ANGELEA\nYou came back. Finally.');
    const result = relocateApprovedSpans(DOC, mangled, [span]);
    assert.deepEqual(result.lost, [0]);
    assert.deepEqual(result.spans, [span]);
  });

  it('CRLF on either side is normalized before matching', () => {
    const span: ApprovedSpan = { startLine: 9, endLine: 10, reason: 'keep the reunion' };
    const crlfPrev = DOC.replace(/\n/g, '\r\n');
    const crlfNext = `FADE IN:\r\n\r\n${crlfPrev}`;
    assert.deepEqual(
      relocateApprovedSpans(crlfPrev, crlfNext, [span]).spans,
      [{ startLine: 11, endLine: 12, reason: 'keep the reunion' }],
    );
    // CR-only on one side, LF on the other.
    assert.deepEqual(
      relocateApprovedSpans(DOC.replace(/\n/g, '\r'), `FADE IN:\n\n${DOC}`, [span]).spans,
      [{ startLine: 11, endLine: 12, reason: 'keep the reunion' }],
    );
  });

  it('malformed or unfalsifiable span metadata is skipped, not lost, and never throws', () => {
    const spans: ApprovedSpan[] = [
      { startLine: 0, endLine: 3, reason: 'startLine below 1' },
      { startLine: 8, endLine: 2, reason: 'inverted range' },
      { startLine: Number.NaN, endLine: 4, reason: 'non-finite' },
      { startLine: 900, endLine: 901, reason: 'past the document' },
      { startLine: 4, endLine: 4, reason: 'a single blank line' },
      { startLine: 9, endLine: 10, reason: 'a real one, to prove indices stay aligned' },
    ];
    const longer = `FADE IN:\n\n${DOC}`;
    const result = relocateApprovedSpans(DOC, longer, spans);
    assert.deepEqual(result.skipped, [0, 1, 2, 3, 4]);
    assert.deepEqual(result.lost, []);
    assert.deepEqual(result.moved, [5]);
    assert.equal(result.spans.length, spans.length);
    for (const i of result.skipped) assert.deepEqual(result.spans[i], spans[i]);
    assert.deepEqual(result.spans[5], { startLine: 11, endLine: 12, reason: 'a real one, to prove indices stay aligned' });
  });

  it('an endLine past the document is clamped to the lines that exist', () => {
    const span: ApprovedSpan = { startLine: 12, endLine: 40, reason: 'runs off the end' };
    const longer = `FADE IN:\n\n${DOC}`;
    const result = relocateApprovedSpans(DOC, longer, [span]);
    assert.deepEqual(result.spans, [{ startLine: 14, endLine: 15, reason: 'runs off the end' }]);
    assert.equal(excerptAt(longer, result.spans[0]), 'JONAS\nI never left.');
  });

  it('is pure: the input spans are never mutated and an empty array is trivially fine', () => {
    const span: ApprovedSpan = { startLine: 9, endLine: 10, reason: 'keep the reunion' };
    const before = { ...span };
    relocateApprovedSpans(DOC, `FADE IN:\n\n${DOC}`, [span]);
    assert.deepEqual(span, before);
    assert.deepEqual(relocateApprovedSpans(DOC, DOC, []), { spans: [], moved: [], lost: [], skipped: [], ambiguous: [] });
  });
});

// ── (d) locked spans through the whole pipeline ──────────────────────────────

describe('revision pipeline: approved spans follow the text between passes', () => {
  it('(d) two lines inserted in pass 1 move the locked range for pass 2', async () => {
    const full = compiledFor(FULL_DRAFT);
    // Lock the top of scene 5. The scene heading makes the excerpt unique in a
    // draft whose scenes are otherwise identical, so the assertions below are
    // about WHERE the span went, not about which of many copies matched.
    const headLine = lineNumberOf(FULL_DRAFT, 'INT. ROOM 5 - DAY');
    const locked: ApprovedSpan = { startLine: headLine, endLine: headLine + 2, reason: 'her wording is final' };
    const lockedText = excerptAt(FULL_DRAFT, locked);
    assert.equal(
      lockedText,
      'INT. ROOM 5 - DAY\n\nAda crosses to the window and studies the street below. Nothing moves.',
    );

    const seen: Array<{ passName: string; fountain: string; spans: ApprovedSpan[] }> = [];
    const capture = captureLogger();
    registerLlmRewriter(async (input: RewriteInput) => {
      seen.push({ passName: input.passName, fountain: input.fountain, spans: input.approvedSpans });
      if (input.passName === 'structure') return { revised: `FADE IN:\n\n${input.fountain}`, usedLLM: true };
      return { revised: input.fountain, usedLLM: false };
    });

    try {
      await runRevisionPipeline(full.compiled, full.analysis.records, full.analysis.structure, [locked]);
    } finally {
      registerLlmRewriter(null);
      capture.restore();
    }

    const first = seen.find(s => s.passName === 'structure');
    const second = seen.find(s => s.passName === 'causality');
    assert.ok(first && second, 'both passes must have reached the rewriter');

    // Pass 1 saw the span exactly as the caller gave it.
    assert.deepEqual(first.spans, [locked]);
    // Pass 2 saw it re-pointed at the same text in the two-lines-longer draft.
    assert.deepEqual(second.spans, [{ startLine: headLine + 2, endLine: headLine + 4, reason: 'her wording is final' }]);
    assert.equal(excerptAt(second.fountain, second.spans[0]), lockedText);
    // Without the fix, pass 2 would still be holding the original range, which
    // in the longer draft covers two lines of the scene ABOVE the locked one.
    assert.notEqual(excerptAt(second.fountain, locked), lockedText);
    // And the caller's own array was not mutated under it.
    assert.deepEqual(locked, { startLine: headLine, endLine: headLine + 2, reason: 'her wording is final' });
    assert.deepEqual(capture.calls.filter(c => c.msg === 'revision_locked_span_lost_between_passes'), []);
  });

  it('(c) a span whose locked text a pass edited away is DROPPED, reported, and no longer enforced', async () => {
    const full = compiledFor(FULL_DRAFT);
    const headLine = lineNumberOf(FULL_DRAFT, 'INT. ROOM 5 - DAY');
    // Two spans, so the test also proves the surviving one keeps working and
    // that the DROPPED one is named by the index the CALLER gave it (1), not
    // by its position in the pipeline's working array.
    const keeper: ApprovedSpan = { startLine: 1, endLine: 3, reason: 'the opening stays' };
    const doomed: ApprovedSpan = { startLine: headLine, endLine: headLine + 2, reason: 'her wording is final' };
    const doomedText = excerptAt(FULL_DRAFT, doomed);

    const seen: Array<{ passName: string; fountain: string; spans: ApprovedSpan[] }> = [];
    const capture = captureLogger();
    // The fake rewriter mirrors rewrite-llm.ts's llmRewrite: it enforces the
    // spans the PIPELINE handed this pass, with the real, exported
    // approvedSpansSurvive, and falls back to the unchanged draft when the
    // lock is not honored. That is the seam finding 5 is about — a stale span
    // makes this check cut its excerpt out of the NEW document at the OLD
    // line numbers — so the test drives it rather than paraphrasing it.
    registerLlmRewriter(async (input: RewriteInput) => {
      seen.push({ passName: input.passName, fountain: input.fountain, spans: input.approvedSpans });
      const propose = (revised: string) => {
        const survival = approvedSpansSurvive(input.fountain, revised, input.approvedSpans);
        if (input.approvedSpans.length > 0 && survival.checked === 0) return { revised: input.fountain, usedLLM: false };
        return survival.ok ? { revised, usedLLM: true } : { revised: input.fountain, usedLLM: false };
      };
      if (input.passName === 'structure') {
        // A non-LLM editor is not bound by approvedSpansSurvive; this is the
        // case that check cannot rule out. It rewrites the locked heading, so
        // the span's text stops occurring at all.
        return { revised: input.fountain.replace('INT. ROOM 5 - DAY', 'INT. THE BACK ROOM - DAY'), usedLLM: true };
      }
      if (input.passName === 'causality') {
        // Pass 2 deletes what USED to be locked. With the span dropped this is
        // a legitimate edit and must be accepted; with the stale span carried
        // forward the old code enforced lines the author never approved.
        return propose(input.fountain.replace('INT. THE BACK ROOM - DAY', 'EXT. THE YARD - NIGHT'));
      }
      return propose(input.fountain);
    });

    let result;
    try {
      result = await runRevisionPipeline(
        full.compiled, full.analysis.records, full.analysis.structure, [keeper, doomed],
      );
    } finally {
      registerLlmRewriter(null);
      capture.restore();
    }

    const second = seen.find(s2 => s2.passName === 'causality');
    const third = seen.find(s2 => s2.passName === 'intention');
    assert.ok(second && third, 'passes 2 and 3 must have reached the rewriter');

    // Pass 2 was handed ONLY the span that still exists — the lost one is gone
    // from enforcement, not carried forward at indices that now address the
    // scene above it.
    assert.deepEqual(second.spans, [keeper], 'a lost span must be dropped from the enforced set');
    assert.equal(excerptAt(second.fountain, second.spans[0]), excerptAt(FULL_DRAFT, keeper));
    assert.ok(!second.fountain.includes(doomedText), 'the fixture must actually have removed the locked text');

    // The rewrite that deletes the formerly locked heading is ACCEPTED,
    // because nothing locks it any more. Under the old behaviour the stale
    // range was still enforced against whatever lived at those lines.
    assert.equal(result.passResults[1].changed, true, 'pass 2 must be allowed to edit text that is no longer locked');
    assert.ok(!result.finalFountain.includes('INT. THE BACK ROOM - DAY'));
    assert.ok(result.finalFountain.includes('EXT. THE YARD - NIGHT'));
    // And the surviving lock is still a lock: it is in the draft at the end.
    assert.ok(result.finalFountain.includes(excerptAt(FULL_DRAFT, keeper)));

    // Reported to the caller by the caller's own index — `doomed` is index 1.
    assert.deepEqual(result.lostApprovedSpans, [1]);

    // Warned exactly once, with that same index and no text of any kind.
    const warnings = capture.calls.filter(c => c.msg === 'revision_locked_span_lost_between_passes');
    assert.equal(warnings.length, 1, 'a span is lost once; later passes must not re-warn about it');
    assert.deepEqual(warnings[0].data?.lostSpanIndices, [1]);
    assert.equal(warnings[0].data?.lostSpanCount, 1);
    assert.equal(warnings[0].data?.totalApprovedSpans, 2);
    assert.equal(warnings[0].data?.remainingApprovedSpans, 1);
    assert.equal(warnings[0].data?.passName, 'causality');
    const serialized = JSON.stringify(warnings[0]);
    assert.ok(!serialized.includes('ROOM'), 'a span-loss warning must never carry screenplay text');
    assert.ok(!serialized.includes('Ada'), 'a span-loss warning must never carry screenplay text');
    assert.ok(!serialized.includes('her wording is final'), 'a span-loss warning must never carry the span reason');
  });

  it('a run that loses nothing reports lostApprovedSpans: []', async () => {
    const full = compiledFor(FULL_DRAFT);
    const headLine = lineNumberOf(FULL_DRAFT, 'INT. ROOM 5 - DAY');
    const locked: ApprovedSpan = { startLine: headLine, endLine: headLine + 2, reason: 'her wording is final' };
    registerLlmRewriter(async (input: RewriteInput) =>
      input.passName === 'structure'
        ? { revised: `FADE IN:\n\n${input.fountain}`, usedLLM: true }
        : { revised: input.fountain, usedLLM: false });
    let result;
    try {
      result = await runRevisionPipeline(full.compiled, full.analysis.records, full.analysis.structure, [locked]);
    } finally {
      registerLlmRewriter(null);
    }
    assert.deepEqual(result.lostApprovedSpans, []);
    assert.deepEqual(result.ambiguousApprovedSpans, []);
  });

  // 2026-09-21 review of PR #268, finding F3. A lock on one of many identical
  // lines is only identifiable by WHICH copy it is. When a pass changes how
  // many copies there are, that identity is gone: the span is still enforced
  // — its text is in the draft — but the copy it now points at is a guess,
  // and the run says so instead of presenting it as certain.
  it('(F3) a lock on one of many identical lines whose count changes is kept, re-pointed, and reported ambiguous', async () => {
    const full = compiledFor(FULL_DRAFT);
    const ACTION = 'Ada crosses to the window and studies the street below. Nothing moves.';
    const copies = FULL_DRAFT.split('\n').flatMap((line, i) => (line === ACTION ? [i + 1] : []));
    assert.equal(copies.length, 18, 'the fixture repeats one action line once per scene — 18 identical copies');
    // The FIFTH copy. Nothing but its ordinal distinguishes it.
    const locked: ApprovedSpan = { startLine: copies[4], endLine: copies[4], reason: 'the fifth beat is hers' };
    assert.equal(excerptAt(FULL_DRAFT, locked), ACTION);

    const seen: Array<{ passName: string; fountain: string; spans: ApprovedSpan[] }> = [];
    const capture = captureLogger();
    registerLlmRewriter(async (input: RewriteInput) => {
      seen.push({ passName: input.passName, fountain: input.fountain, spans: input.approvedSpans });
      // Pass 1 rewrites the FIRST copy and only that one: 18 copies become
      // 17, and because a line is replaced rather than removed every
      // surviving copy keeps its line number. So the nearest-occurrence rule
      // still lands on the right line here — what the test pins is that the
      // pipeline no longer claims to KNOW that.
      if (input.passName === 'structure') {
        return { revised: input.fountain.replace(ACTION, 'Ada waits by the door.'), usedLLM: true };
      }
      return { revised: input.fountain, usedLLM: false };
    });
    let result;
    try {
      result = await runRevisionPipeline(full.compiled, full.analysis.records, full.analysis.structure, [locked]);
    } finally {
      registerLlmRewriter(null);
      capture.restore();
    }

    const second = seen.find(s => s.passName === 'causality');
    assert.ok(second, 'pass 2 must have reached the rewriter');
    // Still locked, on the same line, holding the same text.
    assert.deepEqual(second.spans, [locked]);
    assert.equal(excerptAt(second.fountain, second.spans[0]), ACTION);
    // Not lost — the text is still in the draft. Reported as a guess instead.
    assert.deepEqual(result.lostApprovedSpans, []);
    assert.deepEqual(result.ambiguousApprovedSpans, [0]);

    const warnings = capture.calls.filter(c => c.msg === 'revision_locked_span_ambiguous_between_passes');
    assert.equal(warnings.length, 1, 'one document change, one warning');
    assert.deepEqual(warnings[0].data?.ambiguousSpanIndices, [0]);
    assert.equal(warnings[0].data?.ambiguousSpanCount, 1);
    assert.equal(warnings[0].data?.totalApprovedSpans, 1);
    assert.equal(warnings[0].data?.passName, 'causality');
    const serialized = JSON.stringify(warnings[0]);
    assert.ok(!serialized.includes('Ada'), 'an ambiguity warning must never carry screenplay text');
    assert.ok(!serialized.includes('the fifth beat'), 'an ambiguity warning must never carry the span reason');
  });
});

// ── (e) the ledger survives the re-derivation (review finding 1) ─────────────

describe('revision pipeline: re-diagnosis keeps the caller’s StoryCommit ledger', () => {
  const COMMITS = ledgerCommits();

  it('the ledger and the text disagree about the act, which is what makes this observable', () => {
    // The reviewer's probe, as an assertion: same records, commits vs [].
    const analysis = analyzeFountainText(FULL_DRAFT);
    const fromLedger = analyzeStructure(analysis.records, COMMITS);
    const fromTextOnly = analyzeStructure(analysis.records, []);
    assert.deepEqual(
      { act: fromLedger.actPosition, pct: fromLedger.completionPercent, climax: fromLedger.approachingClimax },
      { act: 'act3', pct: 100, climax: true },
    );
    assert.deepEqual(
      { act: fromTextOnly.actPosition, pct: fromTextOnly.completionPercent, climax: fromTextOnly.approachingClimax },
      { act: 'act1', pct: 0, climax: false },
    );
    // And analyzeFountainText's own structure IS the commit-less one — the
    // exact value the pipeline used to adopt wholesale on re-derivation.
    assert.equal(analysis.structure.actPosition, 'act1');
    assert.equal(analysis.structure.approachingClimax, false);
  });

  it('(e) pass 1 changing one byte does not reset the act clock for passes 2..14', async () => {
    const full = compiledFor(FULL_DRAFT);
    // The caller's structure, as server/routes/nvm/revision.ts builds it.
    const callerStructure = analyzeStructure(full.analysis.records, COMMITS);

    const capture = captureLogger();
    // Two lines added at the top: the draft changes (so the re-derivation
    // runs) while all 18 scenes survive, so nothing but the ledger can
    // explain a difference in what the later passes read.
    registerLlmRewriter(async (input: RewriteInput) =>
      input.passName === 'structure'
        ? { revised: `FADE IN:\n\n${input.fountain}`, usedLLM: true }
        : { revised: input.fountain, usedLLM: false });

    let withLedger;
    try {
      withLedger = await runRevisionPipeline(
        full.compiled, full.analysis.records, callerStructure, [], undefined, undefined, false, COMMITS,
      );
    } finally {
      registerLlmRewriter(null);
      capture.restore();
    }

    // THE CLAIM, in the form a reader of the report sees it, asserted FIRST so
    // that a pre-fix run fails on the behaviour rather than on a log field
    // that did not exist yet: rules which only fire on the ledger's
    // act3/approaching-climax reading are present in passes 2..14, and absent
    // from the identical run with no ledger.
    registerLlmRewriter(async (input: RewriteInput) =>
      input.passName === 'structure'
        ? { revised: `FADE IN:\n\n${input.fountain}`, usedLLM: true }
        : { revised: input.fountain, usedLLM: false });
    let noLedger;
    try {
      noLedger = await runRevisionPipeline(full.compiled, full.analysis.records, callerStructure, []);
    } finally {
      registerLlmRewriter(null);
    }

    const rulesOf = (run: typeof withLedger, pass: string) =>
      run.passResults.find(r => r.pass === pass)!.issues.map(i => i.rule);

    assert.ok(
      rulesOf(withLedger, 'intention').includes('CLIMAX_WITHOUT_CHOICE'),
      'pass 3 must still read the ledger’s act3 after pass 1 changed the draft',
    );
    assert.ok(
      !rulesOf(noLedger, 'intention').includes('CLIMAX_WITHOUT_CHOICE'),
      'without a ledger the same run reads act1 — this is the pre-fix behaviour, pinned as the contrast',
    );
    for (const rule of ['NO_REVELATIONS', 'CLIMAX_EMOTIONALLY_FLAT']) {
      assert.ok(rulesOf(withLedger, 'character-arc').includes(rule), `pass 6 must read the ledger’s clock (${rule})`);
      assert.ok(!rulesOf(noLedger, 'character-arc').includes(rule), `pass 6 without a ledger must not (${rule})`);
    }

    // Pass 1 is unaffected either way: it reads the caller's structure
    // directly, before any re-derivation can happen.
    assert.deepEqual(rulesOf(withLedger, 'structure'), rulesOf(noLedger, 'structure'));

    // And what the pipeline itself records about the structure it built for
    // pass 2. Before the fix this said act1, with no ledger in sight.
    const rediagnosed = capture.calls.filter(c => c.msg === 'revision_pass_rediagnosed');
    assert.equal(rediagnosed.length, 1, 'the draft changed once, so it is re-diagnosed once');
    assert.equal(rediagnosed[0].data?.passIndex, 1);
    assert.equal(rediagnosed[0].data?.actPosition, 'act3');
    assert.equal(rediagnosed[0].data?.ledgerCommits, 1);
    assert.equal(rediagnosed[0].data?.sceneCount, 18, 'the RECORDS still come from the changed text');
  });

  it('(b) with `commits` omitted the pipeline output is byte-identical to the pre-lane tree', async () => {
    // Pinned against a hash produced by running this exact scenario on
    // 02d8cfb4 — the commit this lane branched from — with the lane's source
    // changes absent. It is the harness half of the output-identity receipt:
    // scripts/check-doctor-output-identity.mjs proves the doctor's 45 reports
    // are unchanged, and this proves the pipeline itself is unchanged for a
    // caller that passes no ledger, which is every deterministic caller
    // (doctor.ts, calibration/reference.ts) — they call runRevisionPipeline
    // with at most 7 arguments and so take `commits = []`.
    const PRE_LANE_OUTPUT_SHA256 =
      '0bc2c05561f0f5d03d81af5c1e7f2f3900498c7f75f7f2d28d3b80db1424efec';

    const full = compiledFor(FULL_DRAFT);
    registerLlmRewriter(async (input: RewriteInput) =>
      input.passName === 'structure'
        ? { revised: TRUNCATED_DRAFT, usedLLM: true }
        : { revised: input.fountain, usedLLM: false });

    let result;
    try {
      result = await runRevisionPipeline(full.compiled, full.analysis.records, full.analysis.structure, []);
    } finally {
      registerLlmRewriter(null);
    }

    assert.equal(
      preLaneOutputHash(result), PRE_LANE_OUTPUT_SHA256,
      'every field this lane did not add must hash exactly as it did on 02d8cfb4',
    );
    // The one field it did add, on a run with no approved spans at all.
    assert.deepEqual(result.lostApprovedSpans, []);
  });
});
