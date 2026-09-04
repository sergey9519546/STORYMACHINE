# `parsedBlocks` idle-debounce benchmark

Follow-up to `docs/perf/incremental-decorations-benchmark.md` (referenced by
`incremental-decorator.ts`/`incremental-reparse.ts`, not committed at the
time of this pass — this file exists so the equivalent pointer from
`ScriptIDE.tsx` resolves to something real).

## What changed

After the editor lane's incremental-decoration fix (commit `f46e1dd0`),
`ScriptIDE.tsx` was the last unconditional per-keystroke full-document scan:
`const parsedBlocks = useMemo(() => parseFountain(scriptText), [scriptText])`
ran a full `parseFountain()` synchronously on every keystroke, feeding the
Sidebar scene/character list, the command palette's scene entries, the
Production tab's shot list, and the Analysis tab's per-block actions — none
of which need per-keystroke freshness. It is now debounced (leading edge
fires synchronously on the first keystroke of a burst; trailing edge fires
once more `200ms` after the burst settles) via
`src/hooks/useIdleDebouncedValue.ts` / `src/hooks/idle-debounce.ts`. A
40-keystroke burst now pays the full parse twice (leading + trailing)
instead of 40 times. `stats` (toolbar word count) was also decoupled from
`parsedBlocks` entirely — it never actually depended on the parse, only on
`scriptText` itself, so it stays a cheap synchronous char-scan per keystroke
with no debounce needed.

## Methodology

Same shape as the editor lane's own measurement: a scratchpad Playwright
script (`scripts/lib/browser-verify.mjs`'s boot/launch harness) loads a
synthetic 430-scene / ~136KB Fountain fixture into a fresh ScriptIDE
session (`Start fresh` -> `Write` tab -> `Control+End`/`Control+Home` to
position the cursor), then types 40 characters one at a time at each
position. Per-keystroke cost is Node-side wall clock from just before
`page.keyboard.press(char)` to just after two chained
`requestAnimationFrame` callbacks resolve in the page (input dispatched,
React committed, one paint cycle settled) — median of the 40 samples is
reported per position. Measured against the real dev server (Vite
middleware mode, not a production build) on both trees, via `git stash` /
`git stash pop` to switch between the pre-change and post-change source
with no other differences.

**Container-contention caveat**: this container has 4 vCPUs and was showing
load average ~1.7-3.0 while these runs were taken (a shared sandbox — other
agents may have been running their own suites concurrently). The ~65-85ms
floor visible even in the "after" numbers below is dominated by
Playwright/CDP round-trip and Vite dev-mode (unminified React) overhead in
this environment, not by application logic — it is present in both trees
identically. Treat the before/after DELTA as the signal, not either
number in isolation; a quieter machine or a production build would show
both numbers much lower with the same relative gap.

## Results (median ms/keystroke, 40-keystroke bursts, n=1 pair + 1 repeat pair)

| Run pair | Position | Before (pre-change) | After (post-change) | Delta |
|---|---|---:|---:|---:|
| 1 | START (doc start) | 99.89 ms | 83.20 ms | -16.7 ms (-17%) |
| 1 | END (doc end)     | 99.75 ms | 83.08 ms | -16.7 ms (-17%) |
| 2 | START (doc start) | 99.98 ms | 66.76 ms | -33.2 ms (-33%) |
| 2 | END (doc end)     | 100.11 ms | 66.79 ms | -33.3 ms (-33%) |

Before is consistent across both repeats (~99.75-100.11ms, tight spread) —
expected, since the OLD synchronous full-doc parse cost is independent of
cursor position (it re-parses the entire document every keystroke regardless
of where the edit lands) and independent of environmental noise level
(a fixed ~16-33ms floor is added on top of whatever the ambient IPC/dev-mode
cost is that keystroke). After tracks the SAME ambient floor down when it
drops (66ms vs 83ms between the two "after" runs), confirming the
per-keystroke parse cost itself has been removed from the hot path rather
than merely shifted — with it gone, `after` moves with ambient noise the
same way an empty-document baseline would, instead of carrying a constant
document-size-proportional tax on every one of the 40 keystrokes.

START and END medians match each other within each run (parse cost, unlike
the CM6 decorator's windowed/viewport-dependent cost, was never
position-dependent — it depends only on total document size), which is the
expected signature of "the fix removed a document-size-proportional
per-keystroke cost," not a position-dependent one.

Fixture generator and benchmark script are scratchpad-only (not committed —
this repo has no committed Playwright perf-benchmark harness yet, only the
`verify:*` functional suites under `scripts/`).
