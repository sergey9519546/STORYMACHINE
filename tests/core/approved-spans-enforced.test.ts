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
    assert.deepEqual(result, { ok: true, lost: [], skipped: [] });
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
    assert.deepEqual(result, { ok: true, lost: [], skipped: [0] });
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
    assert.deepEqual(ok, { ok: true, lost: [], skipped: [] }, 'clamped excerpt (lines 5-6) is present, so this must be checked, not skipped');

    const revisedLosingIt = `INT. APARTMENT - DAY\n\nMaya reads.\n\nSomeone else speaks instead.\n`;
    const lost = approvedSpansSurvive(ORIGINAL, revisedLosingIt, [staleEnd]);
    assert.deepEqual(lost, { ok: false, lost: [0], skipped: [] });
  });

  it('mixed batch: one surviving, one lost, one skipped — indices line up with the input array', () => {
    const surviving: ApprovedSpan = { startLine: 1, endLine: 1, reason: 'heading' };
    const lostSpan: ApprovedSpan = { startLine: 5, endLine: 6, reason: 'dialogue' };
    const outOfRange: ApprovedSpan = { startLine: 42, endLine: 43, reason: 'stale' };
    const revised = `INT. APARTMENT - DAY\n\nMaya paces.\n\nSomeone else entirely.\n`;
    const result = approvedSpansSurvive(ORIGINAL, revised, [surviving, lostSpan, outOfRange]);
    assert.deepEqual(result, { ok: false, lost: [1], skipped: [2] });
  });

  it('no spans at all → trivially ok', () => {
    const result = approvedSpansSurvive(ORIGINAL, 'literally anything', []);
    assert.deepEqual(result, { ok: true, lost: [], skipped: [] });
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
