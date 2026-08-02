# P0 Browser-DOM Certification — HEAD `518251d` (2026-08-02)

`FIELDING_DECISION_BRIEF.md` recorded one caveat it could not clear:

> **Caveat I did NOT re-verify:** the *browser DOM click-through* (StartScreen →
> "Try sample coverage" → ScriptDoctorPanel renders with zero console errors).
> That was last certified on `1a7f3b4` and requires a display + a browser.

This file clears that caveat on current HEAD, and records the two defects the
run exposed — both of which were on the P0 golden path itself.

## Method

Headless Chromium (Playwright) driving a real keyless dev server
(`npm run dev`, no `GEMINI_API_KEY`, no `OPENROUTER_API_KEY` — the exact P0
demo condition, server logs `startup_keyless`). The run drives the golden path
end to end and fails on **any** console error or uncaught page error.

Steps asserted:

1. StartScreen loads (HTTP 200)
2. "Try sample coverage" CTA is visible
3. CTA click succeeds
4. Coverage report renders — verdict **and** health present in the DOM
5. Verdict extracted and matches the certified value
6. No spurious sample-refusal banner on a fresh session (G0-01 guard not misfiring)
7. Fresh coverage is **not** flagged outdated
8. Zero console errors
9. Zero uncaught page errors

## Result: PASS (9/9)

| Check | Result |
|---|---|
| StartScreen loads | PASS — HTTP 200 |
| CTA visible | PASS |
| CTA clicked | PASS |
| Report rendered (verdict + health) | PASS |
| Verdict | PASS — **CONSIDER** (matches certified) |
| No spurious refusal banner | PASS |
| Fresh coverage not flagged outdated | PASS |
| Zero console errors | PASS |
| Zero uncaught page errors | PASS |

Rendered values observed in the DOM: verdict **CONSIDER**, health **69**,
**14** scenes, **3** critical / **38** major / **159** minor. These match the
committed static stimulus.

Server routes exercised on the golden path (from the keyless server log) —
all deterministic, **zero** AI routes:

```
/api/ai-config            200
/api/scriptide/load       200
/api/scriptide/personas   200
/api/scriptide/doctor     200
```

## Two defects this run exposed (both fixed in the same change)

The first attempt **FAILED** certification. Both causes were real, and both sat
on the demo's primary path.

### 1. `/api/analyze-script` fired unasked — three provider calls on the golden path

The first run logged `POST /api/analyze-script → 503` and a browser console
error. G0-04 gated the *typing* path behind an off-by-default flag, but two
**programmatic** install callbacks still called `triggerAnalysis` unconditionally:

- `CoverageSummary`'s `onLoadSampleIntoEditor` — the "Try sample coverage" CTA
- `ScriptDoctorPanel`'s `onLoadFountain` — converted FDX/PDF, accepted fix

`/api/analyze-script` fires `generateContent` + `getImageProvider().generate` +
`getTTSProvider().speak` in one `Promise.all`. Keyless, the server refuses
honestly (503, nothing leaves the process) — but the browser logs an error,
failing the pre-session "zero console errors" bar. On a **keyed** deployment the
same click would silently spend three provider calls the user never requested.

Fixed: both sites now respect the `autoAnalysis` flag. Regression test:
`tests/core/g0-04-programmatic-install-gate.test.ts`.

### 2. Fresh coverage immediately self-flagged "COVERAGE OUTDATED"

With the 503 gone, the run still showed the report banner-flagged
**"COVERAGE OUTDATED — RE-RUN COVERAGE"** on a report generated seconds earlier
for exactly the text on screen.

Cause: installing the sample calls `setScriptText`, which re-renders
`FountainEditor`, which syncs the value into the CodeMirror doc — and that sync
**echoes back** through `onChange → handleScriptChange`, which cannot otherwise
tell the echo from a keystroke. The echo double-bumped the draft generation and
undid the install's own `setCoverageStale(false)`.

Fixed: programmatic installs record the installed text
(`programmaticInstallRef`) so `handleScriptChange` recognizes and swallows
exactly that one echo. Snapshot/import/server-restore installs deliberately keep
the old behavior — those replace the draft with content coverage never ran on,
so marking coverage stale there is correct.

After the fix the status chip reads **READY**, not OUTDATED.

## Why this mattered for the fielding decision

Both defects were invisible to the whole existing gate battery — lint, 9910
unit tests, honesty audit, and CI were all green with both bugs live. Neither
is reachable without actually driving a browser through the golden path. A P0
session run before this would have shown writers a report the product itself
labelled outdated, on a page emitting console errors, while quietly attempting
AI calls the demo's own trust story says it does not make.

## Reproducing

The harness is not committed (it needs a display-capable environment and a
running dev server, neither of which CI provides). To repeat:

1. `npm run dev` with no provider keys set — confirm the server logs `startup_keyless`.
2. Drive Chromium to `http://localhost:3000`, click "Try sample coverage",
   wait for a verdict (`RECOMMEND|CONSIDER|PASS`) plus health text in the DOM.
3. Assert zero `console` errors and zero `pageerror` events for the whole run.
4. Assert the body text does not contain `COVERAGE OUTDATED` / `RE-RUN COVERAGE`.
5. Confirm the server log shows **no** `/api/analyze-script` request.

Re-certify whenever the boot path, the Doctor, or report rendering changes.
