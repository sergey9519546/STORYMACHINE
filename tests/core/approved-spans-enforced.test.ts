// approved-spans-enforced.test.ts — "approved spans are never changed" made
// true in code, not just in the prompt (2026-09-19, locked-spans lane;
// SESSION_REPORT_2026-09-19.md §4 rank 2 / logic audit C3).
//
// WHY THIS FILE EXISTS. `server/nvm/revision/pipeline.ts:128` documents
// `approvedSpans` as "Spans the author has locked — never changed by any
// pass". Before this lane the ONLY mechanism was a `[APPROVED — DO NOT
// CHANGE …]` sentence in the prompt
// (`server/nvm/revision/rewrite-llm.ts`'s `approvedSpanInstructions`).
// `evaluateRewrite` (./rewrite.ts) checks only finish-reason and a 0.80
// length ratio — a model that deletes the locked text and pads elsewhere
// with unrelated prose clears both checks and was ACCEPTED (session probe
// p9: locked text gone, `usedLLM: true`). This file pins the fix:
// `approvedSpansSurvive` (pure, exported from rewrite-llm.ts) verifies every
// approved span's excerpt still appears, verbatim, in the revised text, and
// `llmRewrite` rejects (falls back to the unchanged draft) when one is
// missing.
//
// STRUCTURE. Part A tests the pure function directly — no provider, no
// network. Part B drives it live through `rewritePass` with a fake provider
// swapped onto `ai.geminiProvider.generate`, the same technique
// tests/core/approved-span-sanitization.test.ts and
// tests/core/llm-seam-wiring.test.ts use.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import type { ApprovedSpan, RevisionIssue } from '../../server/nvm/revision/passes/types.ts';
import { approvedSpansSurvive } from '../../server/nvm/revision/rewrite-llm.ts';

// Side effect: registers llmRewrite() with rewrite.ts (same as the
// sanitization test file).
import '../../server/nvm/revision/rewrite-llm.ts';
import { rewritePass, type RewriteInput } from '../../server/nvm/revision/rewrite.ts';
import * as ai from '../../server/engine/ai.ts';
import { logger } from '../../server/lib/logger.ts';

// ── Part A: approvedSpansSurvive, pure ──────────────────────────────────────

describe('approvedSpansSurvive (pure)', () => {
  const ORIGINAL = [
    'INT. APARTMENT - DAY',
    '',
    'Maya reads quietly by the window, at ease.',
    '',
    'MAYA',
    'A calm morning, finally.',
  ].join('\n');
  // Lines 5-6 (1-based): the MAYA dialogue block.
  const LOCKED_SPAN: ApprovedSpan = { startLine: 5, endLine: 6, reason: 'keep her line exact' };

  it('excerpt present verbatim in the revised text → ok, nothing lost', () => {
    const revised = `INT. APARTMENT - DAY\n\nMaya reads by the window, calmer now.\n\nMAYA\nA calm morning, finally.\n`;
    const result = approvedSpansSurvive(ORIGINAL, revised, [LOCKED_SPAN]);
    assert.deepEqual(result, { ok: true, lost: [], skipped: [], checked: 1 });
  });

  it('excerpt deleted from the revised text → lost=[i]', () => {
    const revised = `INT. APARTMENT - DAY\n\nMaya paces anxiously.\n\nMAYA\nSomething else entirely.\n`;
    const result = approvedSpansSurvive(ORIGINAL, revised, [LOCKED_SPAN]);
    assert.equal(result.ok, false);
    assert.deepEqual(result.lost, [0]);
    assert.deepEqual(result.skipped, []);
  });

  it('excerpt present with CRLF in the revised text (LF in the original) → ok', () => {
    const revisedCRLF = `INT. APARTMENT - DAY\r\n\r\nMaya reads by the window, calmer now.\r\n\r\nMAYA\r\nA calm morning, finally.\r\n`;
    const result = approvedSpansSurvive(ORIGINAL, revisedCRLF, [LOCKED_SPAN]);
    assert.equal(result.ok, true, 'CRLF-normalized revised text must still match an LF-original excerpt');
    assert.deepEqual(result.lost, []);
  });

  it('excerpt present with CR-only line endings in the revised text → ok', () => {
    const revisedCR = `INT. APARTMENT - DAY\r\rMaya reads by the window, calmer now.\r\rMAYA\rA calm morning, finally.\r`;
    const result = approvedSpansSurvive(ORIGINAL, revisedCR, [LOCKED_SPAN]);
    assert.equal(result.ok, true);
  });

  it('the original span itself may use CRLF while the revised text uses LF → still matches', () => {
    const originalCRLF = ORIGINAL.replace(/\n/g, '\r\n');
    const revisedLF = `INT. APARTMENT - DAY\n\nMaya reads by the window, calmer now.\n\nMAYA\nA calm morning, finally.\n`;
    const result = approvedSpansSurvive(originalCRLF, revisedLF, [LOCKED_SPAN]);
    assert.equal(result.ok, true);
  });

  it('out-of-range span (startLine past the document) → skipped, not lost, not fatal', () => {
    const badSpan: ApprovedSpan = { startLine: 999, endLine: 1000, reason: 'stale' };
    const result = approvedSpansSurvive(ORIGINAL, 'anything at all', [badSpan]);
    assert.deepEqual(result, { ok: true, lost: [], skipped: [0], checked: 0 });
  });

  it('non-finite span lines (NaN, Infinity) → skipped, not lost', () => {
    const nanSpan = { startLine: Number.NaN, endLine: 2, reason: 'x' } as ApprovedSpan;
    const infSpan = { startLine: 1, endLine: Number.POSITIVE_INFINITY, reason: 'x' } as ApprovedSpan;
    const result = approvedSpansSurvive(ORIGINAL, 'anything at all', [nanSpan, infSpan]);
    assert.equal(result.ok, true);
    assert.deepEqual(result.lost, []);
    assert.deepEqual(result.skipped, [0, 1]);
  });

  it('startLine <= 0 → skipped', () => {
    const zeroSpan: ApprovedSpan = { startLine: 0, endLine: 2, reason: 'x' };
    const negSpan: ApprovedSpan = { startLine: -3, endLine: 2, reason: 'x' };
    const result = approvedSpansSurvive(ORIGINAL, 'anything at all', [zeroSpan, negSpan]);
    assert.deepEqual(result.skipped, [0, 1]);
  });

  it('endLine < startLine (inverted range) → skipped', () => {
    const invertedSpan: ApprovedSpan = { startLine: 5, endLine: 2, reason: 'x' };
    const result = approvedSpansSurvive(ORIGINAL, 'anything at all', [invertedSpan]);
    assert.deepEqual(result.skipped, [0]);
  });

  it('endLine past the document, startLine valid → clamped to the document, checked (not skipped)', () => {
    const staleEnd: ApprovedSpan = { startLine: 5, endLine: 500, reason: 'stale end, from before a pass shrank the doc' };
    const revisedKeepingIt = `INT. APARTMENT - DAY\n\nMaya reads.\n\nMAYA\nA calm morning, finally.\n`;
    const ok = approvedSpansSurvive(ORIGINAL, revisedKeepingIt, [staleEnd]);
    assert.deepEqual(ok, { ok: true, lost: [], skipped: [], checked: 1 }, 'clamped excerpt (lines 5-6) is present, so this must be checked, not skipped');

    const revisedLosingIt = `INT. APARTMENT - DAY\n\nMaya reads.\n\nSomeone else speaks instead.\n`;
    const lost = approvedSpansSurvive(ORIGINAL, revisedLosingIt, [staleEnd]);
    assert.deepEqual(lost, { ok: false, lost: [0], skipped: [], checked: 1 });
  });

  it('mixed batch: one surviving, one lost, one skipped — indices line up with the input array', () => {
    const surviving: ApprovedSpan = { startLine: 1, endLine: 1, reason: 'heading' };
    const lostSpan: ApprovedSpan = { startLine: 5, endLine: 6, reason: 'dialogue' };
    const outOfRange: ApprovedSpan = { startLine: 42, endLine: 43, reason: 'stale' };
    const revised = `INT. APARTMENT - DAY\n\nMaya paces.\n\nSomeone else entirely.\n`;
    const result = approvedSpansSurvive(ORIGINAL, revised, [surviving, lostSpan, outOfRange]);
    assert.deepEqual(result, { ok: false, lost: [1], skipped: [2], checked: 2 });
  });

  it('no spans at all → trivially ok', () => {
    const result = approvedSpansSurvive(ORIGINAL, 'literally anything', []);
    assert.deepEqual(result, { ok: true, lost: [], skipped: [], checked: 0 });
  });

  // ── 2026-09-19 review hardening (findings 3 & 4) ──────────────────────────

  it('finding 3: CRLF original, span ends the document, LF revision with no trailing newline → ok', () => {
    const originalCRLF = 'INT. ROOM - DAY\r\nAction one.\r\nLOCKED LINE.\r\n';
    const eofSpan: ApprovedSpan = { startLine: 3, endLine: 3, reason: 'locked, ends the document' };
    const revisionNoTrailingNewline = 'INT. ROOM - NIGHT\nAction rewritten.\nLOCKED LINE.';
    const result = approvedSpansSurvive(originalCRLF, revisionNoTrailingNewline, [eofSpan]);
    assert.deepEqual(result, { ok: true, lost: [], skipped: [], checked: 1 },
      'normalizing before splitting must not fabricate a trailing newline the CRLF original never had for this span');
  });

  it('finding 3 control: the same CRLF/EOF span still catches a genuine loss', () => {
    const originalCRLF = 'INT. ROOM - DAY\r\nAction one.\r\nLOCKED LINE.\r\n';
    const eofSpan: ApprovedSpan = { startLine: 3, endLine: 3, reason: 'locked, ends the document' };
    const revisionMissingIt = 'INT. ROOM - NIGHT\nAction rewritten.\nSomething else entirely.';
    const result = approvedSpansSurvive(originalCRLF, revisionMissingIt, [eofSpan]);
    assert.equal(result.ok, false);
    assert.deepEqual(result.lost, [0]);
  });

  it('finding 4(i): a span over two blank lines → skipped (not vacuously ok against a whole-document rewrite)', () => {
    const originalWithBlankRun = 'INT. APARTMENT - DAY\n\n\nMaya waits by the window.\n';
    const blankSpan: ApprovedSpan = { startLine: 2, endLine: 3, reason: 'blank buffer' };
    // A rewrite that replaced the ENTIRE document — the exact case a bare
    // `"\n"`-includes check let through vacuously before this fix.
    const wholeDocumentReplaced = 'EXT. SOMEWHERE ELSE - NIGHT\n\nNothing to do with the original at all.\n';
    const result = approvedSpansSurvive(originalWithBlankRun, wholeDocumentReplaced, [blankSpan]);
    assert.deepEqual(result, { ok: true, lost: [], skipped: [0], checked: 0 });
  });

  it('finding 4(iii): a duplicated single-line excerpt survives an includes() check but the revision drops one occurrence → lost', () => {
    const originalWithTwoCutTos = [
      'CUT TO:',
      '',
      'INT. HALLWAY - DAY',
      '',
      'Maya walks.',
      '',
      'CUT TO:',
      '',
      'INT. KITCHEN - DAY',
    ].join('\n');
    const cutToSpan: ApprovedSpan = { startLine: 1, endLine: 1, reason: 'scene transition' };
    // Drops the FIRST "CUT TO:" but keeps the second — a bare `includes`
    // check passes this (the text "CUT TO:" is still present somewhere), so
    // it is exactly the vacuous-pass case this hardening closes.
    const revisedDroppingOne = [
      'INT. HALLWAY - DAY',
      '',
      'Maya walks calmly, at ease.',
      '',
      'CUT TO:',
      '',
      'INT. KITCHEN - DAY',
    ].join('\n');
    const result = approvedSpansSurvive(originalWithTwoCutTos, revisedDroppingOne, [cutToSpan]);
    assert.equal(result.ok, false, 'the occurrence count dropped from 2 to 1 — a real loss, not a mere relocation');
    assert.deepEqual(result.lost, [0]);
    assert.deepEqual(result.skipped, []);
    assert.equal(result.checked, 1);
  });

  it('finding 4(iii) control: relocating (not dropping) the single occurrence still passes — this file does not enforce position', () => {
    const original = ['CUT TO:', '', 'INT. HALLWAY - DAY', '', 'Maya walks.'].join('\n');
    const cutToSpan: ApprovedSpan = { startLine: 1, endLine: 1, reason: 'scene transition' };
    const revisedRelocated = ['INT. HALLWAY - DAY', '', 'Maya walks.', '', 'CUT TO:'].join('\n');
    const result = approvedSpansSurvive(original, revisedRelocated, [cutToSpan]);
    assert.equal(result.ok, true);
  });
});

// ── Part B: live through rewritePass, with a fake provider ─────────────────

const FOUNTAIN = [
  'INT. APARTMENT - DAY',
  '',
  'Maya reads quietly by the window, at ease.',
  '',
  'MAYA',
  'A calm morning, finally.',
].join('\n');

const LOCKED_SPAN: ApprovedSpan = { startLine: 5, endLine: 6, reason: 'exact wording matters here' };

const ONE_ISSUE: RevisionIssue[] = [{
  rule: 'TEST_ONLY_ISSUE',
  severity: 'minor',
  location: 'Scene 1',
  description: 'A deliberately synthetic issue, present only to make rewritePass proceed.',
}];

function baseInput(approvedSpans: ApprovedSpan[]): RewriteInput {
  return { fountain: FOUNTAIN, issues: ONE_ISSUE, passName: 'dialogue', approvedSpans };
}

/** Swaps ai.geminiProvider.generate for a fake that returns `revisedText`
 *  with finishReason STOP. Returns a restore function. */
function fakeProviderReturning(revisedText: string): { calls(): number; restore(): void } {
  const original = ai.geminiProvider.generate;
  let callCount = 0;
  ai.geminiProvider.generate = async () => {
    callCount++;
    return {
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: revisedText }] } }],
    } as unknown as Awaited<ReturnType<typeof original>>;
  };
  return {
    calls: () => callCount,
    restore: () => { ai.geminiProvider.generate = original; },
  };
}

/** Text long enough to clear REWRITE_MIN_LENGTH_RATIO (0.80 of FOUNTAIN's
 *  length) regardless of whether it contains the locked excerpt. */
const PADDING = 'X'.repeat(FOUNTAIN.length);

describe('llmRewrite rejects a rewrite that loses an approved span', () => {
  let restore: (() => void) | undefined;
  let warnCalls: Array<{ msg: string; data?: Record<string, unknown> }>;
  let originalWarn: typeof logger.warn;

  function spyOnWarn(): void {
    originalWarn = logger.warn;
    warnCalls = [];
    logger.warn = ((msg: string, data?: Record<string, unknown>) => {
      warnCalls.push({ msg, data });
    }) as typeof logger.warn;
  }

  after(() => {
    restore?.();
    if (originalWarn) logger.warn = originalWarn;
  });

  it('a rewrite WITHOUT the locked excerpt (but long enough to pass the length ratio) is rejected: original fountain returned, usedLLM:false, reason names the lost span, a log line is emitted with no span text', async () => {
    spyOnWarn();
    // No trace of "MAYA" / "A calm morning, finally." anywhere in this text.
    const revisedWithoutSpan = `INT. APARTMENT - DAY\n\nMaya paces anxiously, on edge.\n\n${PADDING}\n`;
    const fake = fakeProviderReturning(revisedWithoutSpan);
    restore = fake.restore;

    const result = await rewritePass(baseInput([LOCKED_SPAN])) as {
      revised: string; usedLLM: boolean; reason?: string; lostSpans?: number[];
    };

    assert.equal(fake.calls(), 1, 'the fake provider must have been reached');
    assert.equal(result.revised, FOUNTAIN, 'the ORIGINAL fountain must be returned unchanged');
    assert.equal(result.usedLLM, false);
    assert.equal(result.reason, 'approved_span_lost', 'reason must name the lost-span rejection distinctly');
    assert.deepEqual(result.lostSpans, [0]);

    const rejectionLog = warnCalls.find(c => c.msg === 'revision_rewrite_rejected_locked_span');
    assert.ok(rejectionLog, 'a revision_rewrite_rejected_locked_span log line must be emitted');
    assert.equal(rejectionLog!.data?.passName, 'dialogue');
    assert.deepEqual(rejectionLog!.data?.lostSpanIndices, [0]);
    assert.equal(rejectionLog!.data?.lostSpanCount, 1);
    assert.equal(rejectionLog!.data?.totalApprovedSpans, 1);

    // Never the span text.
    const serializedLog = JSON.stringify(warnCalls);
    assert.ok(!serializedLog.includes('A calm morning, finally.'), 'the locked span text must never appear in a log line');
    assert.ok(!serializedLog.includes('Maya reads quietly'), 'the original draft text must never appear in a log line');
  });
});

describe('llmRewrite rejects a rewrite when no approved span could be checked at all (finding 4(ii))', () => {
  let restore: (() => void) | undefined;
  let warnCalls: Array<{ msg: string; data?: Record<string, unknown> }>;
  let originalWarn: typeof logger.warn;

  function spyOnWarn(): void {
    originalWarn = logger.warn;
    warnCalls = [];
    logger.warn = ((msg: string, data?: Record<string, unknown>) => {
      warnCalls.push({ msg, data });
    }) as typeof logger.warn;
  }

  after(() => {
    restore?.();
    if (originalWarn) logger.warn = originalWarn;
  });

  it('a span over two blank lines is the ONLY approved span → rejected as unchecked, regardless of what the rewrite contains', async () => {
    spyOnWarn();
    const fountainWithBlankSpan = [
      'INT. APARTMENT - DAY',
      '',
      '',
      'Maya waits by the window, uncertain.',
    ].join('\n');
    const blankOnlySpan: ApprovedSpan = { startLine: 2, endLine: 3, reason: 'blank buffer, nothing to check' };
    const padding = 'X'.repeat(fountainWithBlankSpan.length);
    // A rewrite that would otherwise be perfectly ACCEPTABLE — long enough,
    // finishReason STOP — must still be rejected: nothing verified the lock.
    const revised = `${fountainWithBlankSpan}\n\n${padding}\n`;
    const fake = fakeProviderReturning(revised);
    restore = fake.restore;

    const input: RewriteInput = {
      fountain: fountainWithBlankSpan,
      issues: ONE_ISSUE,
      passName: 'dialogue',
      approvedSpans: [blankOnlySpan],
    };
    const result = await rewritePass(input) as {
      revised: string; usedLLM: boolean; reason?: string;
    };

    assert.equal(fake.calls(), 1);
    assert.equal(result.usedLLM, false);
    assert.equal(result.revised, fountainWithBlankSpan, 'the ORIGINAL fountain must be returned unchanged');
    assert.equal(result.reason, 'approved_spans_unchecked');

    const unchecked = warnCalls.find(c => c.msg === 'revision_rewrite_locked_spans_unchecked');
    assert.ok(unchecked, 'a revision_rewrite_locked_spans_unchecked log line must be emitted');
    assert.equal(unchecked!.data?.passName, 'dialogue');
    assert.equal(unchecked!.data?.totalApprovedSpans, 1);
    assert.deepEqual(unchecked!.data?.skippedSpanIndices, [0]);
  });

  it('startLine 0 (out of range) as the only approved span → rejected as unchecked', async () => {
    spyOnWarn();
    const zeroSpan: ApprovedSpan = { startLine: 0, endLine: 2, reason: 'invalid range' };
    const revisedWithoutSpan = `INT. APARTMENT - DAY\n\nMaya paces anxiously, on edge.\n\n${PADDING}\n`;
    const fake = fakeProviderReturning(revisedWithoutSpan);
    restore = fake.restore;

    const result = await rewritePass(baseInput([zeroSpan])) as {
      revised: string; usedLLM: boolean; reason?: string;
    };

    assert.equal(result.usedLLM, false);
    assert.equal(result.revised, FOUNTAIN);
    assert.equal(result.reason, 'approved_spans_unchecked');
  });
});

describe('llmRewrite accepts a rewrite that preserves the approved span', () => {
  let restore: (() => void) | undefined;
  after(() => { restore?.(); });

  it('a rewrite WITH the locked excerpt present is accepted: usedLLM:true, revised text returned', async () => {
    const revisedWithSpan = `INT. APARTMENT - DAY\n\nMaya reads calmly by the window.\n\nMAYA\nA calm morning, finally.\n\n${PADDING}\n`;
    const fake = fakeProviderReturning(revisedWithSpan);
    restore = fake.restore;

    const result = await rewritePass(baseInput([LOCKED_SPAN])) as {
      revised: string; usedLLM: boolean; reason?: string; lostSpans?: number[];
    };

    assert.equal(fake.calls(), 1);
    assert.equal(result.usedLLM, true);
    assert.equal(result.revised, revisedWithSpan.trim());
    assert.equal(result.reason, undefined, 'an accepted rewrite carries no rejection reason');
    assert.equal(result.lostSpans, undefined);
  });
});

describe('llmRewrite with no approvedSpans: unchanged behaviour', () => {
  let restore: (() => void) | undefined;
  after(() => { restore?.(); });

  it('an accepted rewrite with approvedSpans:[] returns exactly {revised, usedLLM:true} — same shape as before this lane', async () => {
    const revisedText = `${FOUNTAIN}\n\nMAYA\nAnd it was rewritten.\n`;
    const fake = fakeProviderReturning(revisedText);
    restore = fake.restore;

    const result = await rewritePass(baseInput([]));

    // Exact key set: no `reason`/`lostSpans` leaking onto the unaffected path.
    assert.deepEqual(Object.keys(result).sort(), ['revised', 'usedLLM']);
    assert.deepEqual(result, { revised: revisedText.trim(), usedLLM: true });
  });
});
