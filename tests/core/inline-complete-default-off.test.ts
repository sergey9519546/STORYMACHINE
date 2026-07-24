// G0-03 (Minimum Trustworthy Demo): inline provider completion (the CM6
// "ghost text" copilot at src/components/editor/inline-complete.ts) must be
// OFF by default. Before this change it was mounted unconditionally by
// FountainEditor.tsx (no enabled flag existed at all), so debounced typing
// fired GET /api/scriptide/complete with zero user opt-in.
//
// This test exercises the real production module directly (no React/JSDOM
// available in this test runner — FountainEditor.tsx is JSX and can't be
// imported under `node --experimental-strip-types`) via
// `inlineCompletionExtension`, the single gating seam FountainEditor.tsx
// calls into to build the CodeMirror completion-compartment content. That
// function is the actual source of truth for "is the trigger plugin mounted
// at all" — when it returns an empty extension array, CodeMirror never wires
// up createTriggerPlugin's debounced fetch, so no network call is possible
// regardless of typing.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  inlineComplete,
  inlineCompletionExtension,
} from '../../src/components/editor/inline-complete.ts';

describe('inline-complete — off-by-default gating (G0-03)', () => {
  it('default config (no args) yields an inert extension — the off-by-default contract', () => {
    // Mirrors how FountainEditor.tsx's `inlineCompletionEnabled = false` prop
    // default reaches this function: called with nothing supplied for
    // `enabled`, it must not include the trigger plugin.
    const ext = (inlineCompletionExtension as (enabled?: boolean, ctx?: unknown) => unknown)();
    assert.ok(Array.isArray(ext), 'expected an Extension array');
    assert.equal((ext as unknown[]).length, 0, 'expected zero extensions when no enabled flag is supplied (off by default)');
  });

  it('enabled=false explicitly yields the same inert extension', () => {
    const ext = inlineCompletionExtension(false, {});
    assert.ok(Array.isArray(ext));
    assert.equal((ext as unknown[]).length, 0);
  });

  it('enabled=true yields the real completion extension chain — on/off is not a no-op', () => {
    const ext = inlineCompletionExtension(true, {});
    assert.ok(Array.isArray(ext));
    assert.ok((ext as unknown[]).length > 0, 'expected a non-empty extension when explicitly enabled');
    // Same shape as calling the always-on assembler directly.
    assert.equal((ext as unknown[]).length, (inlineComplete({}) as unknown[]).length);
  });
});
