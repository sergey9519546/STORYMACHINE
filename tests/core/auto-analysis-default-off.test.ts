// G0-04 (Minimum Trustworthy Demo): idle/background analysis must be OFF by
// default. Before this change, ScriptIDE.tsx's handleScriptChange scheduled
// `setTimeout(() => triggerAnalysis(text), 2000)` on EVERY keystroke,
// unconditionally (no client-side gate existed at all) — wired at the
// editor's onChange. triggerAnalysis POSTs /api/analyze-script
// (server/routes/scriptide.ts), which fires generateContent +
// getImageProvider().generate + getTTSProvider().speak in Promise.all: three
// provider calls per debounced keystroke, with zero user opt-in.
//
// Same JSX/JSDOM constraint as G0-03 (see tests/core/inline-complete-default-off.test.ts):
// ScriptIDE.tsx can't be imported under `node --experimental-strip-types`
// (this repo's test runner has no JSX transform and no jsdom). This test
// instead exercises the real production gating seam, scheduleAutoAnalysis
// (src/lib/auto-analysis-gate.ts), which ScriptIDE.tsx's handleScriptChange
// calls into for its idle/background timer. When it returns null (the
// enabled=false / default-config case), no timer is scheduled at all, so the
// callback can never fire — not "didn't fire within a short window", but a
// structural guarantee that no /api/analyze-script call is even possible
// from this code path.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleAutoAnalysis } from '../../src/lib/auto-analysis-gate.ts';

describe('auto-analysis gate — off-by-default (G0-04)', () => {
  it('enabled=false schedules nothing and never invokes the analysis callback', () => {
    let ran = false;
    let timeoutCalls = 0;
    const fakeSetTimeout = (_fn: () => void, _ms: number): ReturnType<typeof setTimeout> => {
      timeoutCalls += 1;
      // Intentionally never invoke _fn — a real disabled gate must not even
      // reach the point of scheduling a timer.
      return 0 as unknown as ReturnType<typeof setTimeout>;
    };
    const handle = scheduleAutoAnalysis(false, () => { ran = true; }, 2000, fakeSetTimeout);
    assert.equal(handle, null, 'expected no timer handle when disabled');
    assert.equal(timeoutCalls, 0, 'expected the underlying setTimeout to never be called when disabled');
    assert.equal(ran, false, 'expected the analysis callback to never run when disabled');
  });

  it('default config (no enabled arg passed through a default-false wrapper) never schedules a timer', () => {
    // Mirrors how ScriptIDE.tsx calls this: `autoAnalysis` state seeded from
    // localStorage("auto_analysis"), which is false/absent by default.
    const autoAnalysis = false; // the documented default
    let timeoutCalls = 0;
    const fakeSetTimeout = (): ReturnType<typeof setTimeout> => {
      timeoutCalls += 1;
      return 0 as unknown as ReturnType<typeof setTimeout>;
    };
    const handle = scheduleAutoAnalysis(autoAnalysis, () => {}, 2000, fakeSetTimeout);
    assert.equal(handle, null);
    assert.equal(timeoutCalls, 0);
  });

  it('enabled=true schedules exactly one real timer with the given delay — on/off is not a no-op', () => {
    let capturedDelay: number | null = null;
    let capturedFn: (() => void) | null = null;
    let calls = 0;
    const fakeSetTimeout = (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
      calls += 1;
      capturedDelay = ms;
      capturedFn = fn;
      return 42 as unknown as ReturnType<typeof setTimeout>;
    };
    const handle = scheduleAutoAnalysis(true, () => {}, 2000, fakeSetTimeout);
    assert.notEqual(handle, null);
    assert.equal(calls, 1);
    assert.equal(capturedDelay, 2000);
    assert.equal(typeof capturedFn, 'function');
  });
});
