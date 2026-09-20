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

import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { runRevisionPipeline } from '../../server/nvm/revision/pipeline.ts';
import { registerLlmRewriter, type RewriteInput } from '../../server/nvm/revision/rewrite.ts';
import { relocateApprovedSpans, normalizeLineEndings } from '../../server/nvm/revision/approved-spans.ts';
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
    assert.deepEqual(relocateApprovedSpans(DOC, DOC, []), { spans: [], moved: [], lost: [], skipped: [] });
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

  it('a pass that edits the locked text itself warns with indices only and keeps the old range', async () => {
    const full = compiledFor(FULL_DRAFT);
    const headLine = lineNumberOf(FULL_DRAFT, 'INT. ROOM 5 - DAY');
    const locked: ApprovedSpan = { startLine: headLine, endLine: headLine + 2, reason: 'her wording is final' };

    const seen: Array<{ passName: string; spans: ApprovedSpan[] }> = [];
    const capture = captureLogger();
    registerLlmRewriter(async (input: RewriteInput) => {
      seen.push({ passName: input.passName, spans: input.approvedSpans });
      if (input.passName === 'structure') {
        // A non-LLM editor is not bound by approvedSpansSurvive; this is the
        // case that check cannot rule out.
        return {
          revised: input.fountain.replace('INT. ROOM 5 - DAY', 'INT. THE BACK ROOM - DAY'),
          usedLLM: true,
        };
      }
      return { revised: input.fountain, usedLLM: false };
    });

    try {
      await runRevisionPipeline(full.compiled, full.analysis.records, full.analysis.structure, [locked]);
    } finally {
      registerLlmRewriter(null);
      capture.restore();
    }

    const second = seen.find(s => s.passName === 'causality');
    assert.ok(second);
    assert.deepEqual(second.spans, [locked], 'a lost span keeps its previous indices');

    const warnings = capture.calls.filter(c => c.msg === 'revision_locked_span_lost_between_passes');
    assert.equal(warnings.length, 1);
    assert.deepEqual(warnings[0].data?.lostSpanIndices, [0]);
    assert.equal(warnings[0].data?.lostSpanCount, 1);
    assert.equal(warnings[0].data?.totalApprovedSpans, 1);
    assert.equal(warnings[0].data?.passName, 'causality');
    const serialized = JSON.stringify(warnings[0]);
    assert.ok(!serialized.includes('ROOM'), 'a span-loss warning must never carry screenplay text');
    assert.ok(!serialized.includes('Ada'), 'a span-loss warning must never carry screenplay text');
    assert.ok(!serialized.includes('her wording is final'), 'a span-loss warning must never carry the span reason');
  });
});
