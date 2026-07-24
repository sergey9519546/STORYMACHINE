// G0-04 (Minimum Trustworthy Demo): idle/background analysis must be OFF by
// default. ScriptIDE.tsx's handleScriptChange used to call
// `setTimeout(() => triggerAnalysis(text), 2000)` on every single keystroke,
// unconditionally — no client-side gate existed. triggerAnalysis POSTs
// /api/analyze-script (server/routes/scriptide.ts), which fires
// generateContent + getImageProvider().generate + getTTSProvider().speak in
// Promise.all: three provider calls per debounced keystroke, with no user
// opt-in.
//
// This is the single gating seam ScriptIDE.tsx's handleScriptChange calls
// into. When `enabled` is false (the default a caller should pass), no timer
// is scheduled at all — `run` is never invoked, so there is zero possibility
// of the debounced analysis firing, regardless of how much or how long the
// user types. This mirrors G0-03's inlineCompletionExtension(): the decision
// lives in a plain, JSX-free module so it can be unit-tested directly (no
// React/JSDOM in this repo's test runner), and the UI component (ScriptIDE.tsx,
// which cannot itself be imported under `node --experimental-strip-types`)
// just calls it.
//
// Explicit user actions (submitActionModal, handleApplySuggestion, restoring
// a snapshot, the "Analyze" buttons) call triggerAnalysis directly and are
// NOT routed through this gate — G0-04 only concerns the idle/background
// auto-trigger, and those explicit call sites must keep working unconditionally.
export function scheduleAutoAnalysis(
  enabled: boolean,
  run: () => void,
  delayMs: number,
  setTimeoutFn: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> = setTimeout,
): ReturnType<typeof setTimeout> | null {
  if (!enabled) return null;
  return setTimeoutFn(run, delayMs);
}
